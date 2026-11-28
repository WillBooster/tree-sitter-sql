// code-gauge-allow-file fileNcss -- tree-sitter compiles one scanner.c covering MySQL comments, versioned comments, strings, charsets, variables, hostnames, and digit identifiers
#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  COMMENT,
  RECOVERY_COMMENT,
  VERSION_COMMENT_START,
  VERSION_COMMENT_END,
  STRING_SEGMENT,
  NATIONAL_STRING_SEGMENT,
  CHARSET_INTRODUCER,
  BINARY_CHARSET_INTRODUCER,
  QUOTED_HEX_LITERAL,
  NONZERO_QUOTED_HEX_LITERAL,
  QUOTED_BIT_LITERAL,
  USER_VARIABLE,
  SYSTEM_VARIABLE,
  QUOTED_IDENTIFIER,
  CONST_QUOTED_IDENTIFIER,
  DIGIT_IDENTIFIER,
  HOST_NAME,
  STATEMENT_TERMINATOR,
  END_OF_INPUT,
  SQLSTATE_LITERAL,
  SIGNAL_FIRST_ITEM_NAME,
  SIGNAL_NEXT_ITEM_NAME,
  SP_ROUTINE_RESET,
  SP_SCOPE_PUSH,
  SP_SCOPE_POP,
  SP_CAPTURE_FIRST_IDENT,
  SP_CAPTURE_NEXT_IDENT,
  SP_COMMIT_VARS,
  SP_LOCAL_IDENT,
  SP_LOCAL_QUOTED_IDENT,
  ILLEGAL_TOKEN,
  DOT_CONTEXT,
  UNREACHABLE,
};

typedef struct {
  uint32_t lo;
  uint32_t eq;
  uint32_t hi;
  uint8_t ch;
  uint8_t present;
} SpTrieNode;

typedef struct {
  uint32_t parent;
  uint32_t saved_decl_root;
} SpScopeNode;

typedef struct {
  SpTrieNode *nodes;
  uint32_t node_len;
  uint32_t node_cap;
  SpScopeNode *scopes;
  uint32_t scope_len;
  uint32_t scope_cap;
  uint32_t sp_decl_root;
  uint32_t sp_pending_root;
  uint32_t sp_scope_top;
  uint16_t signal_item_mask;
  bool in_version_comment;
} Scanner;

static const char *const MYSQL_SIGNAL_ITEMS[] = {
  "class_origin",       "subclass_origin", "constraint_catalog", "constraint_schema",
  "constraint_name",    "catalog_name",    "schema_name",        "table_name",
  "column_name",        "cursor_name",     "message_text",       "mysql_errno",
};

static const char *const MYSQL_NONCONST_FUNCS[] = {
  "benchmark", "rand", "random_bytes", "sleep", "uuid", "uuid_short",
};

static const char *const MYSQL_RESERVED_WORDS[] = {
  "ACCESSIBLE",          "ADD",                 "ALL",                 "ALTER",               "ANALYZE",
  "AND",                 "AS",                  "ASC",                 "ASENSITIVE",          "BEFORE",
  "BETWEEN",             "BIGINT",              "BINARY",              "BLOB",                "BOTH",
  "BY",                  "CALL",                "CASCADE",             "CASE",                "CHANGE",
  "CHAR",                "CHARACTER",           "CHECK",               "COLLATE",             "COLUMN",
  "CONDITION",           "CONSTRAINT",          "CONTINUE",            "CONVERT",             "CREATE",
  "CROSS",               "CUBE",                "CUME_DIST",           "CURRENT_DATE",        "CURRENT_TIME",
  "CURRENT_TIMESTAMP",   "CURRENT_USER",        "CURSOR",              "DATABASE",            "DATABASES",
  "DAY_HOUR",            "DAY_MICROSECOND",     "DAY_MINUTE",          "DAY_SECOND",          "DEC",
  "DECIMAL",             "DECLARE",             "DEFAULT",             "DELAYED",             "DELETE",
  "DENSE_RANK",          "DESC",                "DESCRIBE",            "DETERMINISTIC",       "DISTINCT",
  "DISTINCTROW",         "DIV",                 "DOUBLE",              "DROP",                "DUAL",
  "EACH",                "ELSE",                "ELSEIF",              "EMPTY",               "ENCLOSED",
  "ESCAPED",             "EXCEPT",              "EXISTS",              "EXIT",                "EXPLAIN",
  "FALSE",               "FETCH",               "FIRST_VALUE",         "FLOAT",               "FLOAT4",
  "FLOAT8",              "FOR",                 "FORCE",               "FOREIGN",             "FROM",
  "FULLTEXT",            "FUNCTION",            "GENERATED",           "GET",                 "GRANT",
  "GROUP",               "GROUPING",            "GROUPS",              "HAVING",              "HIGH_PRIORITY",
  "HOUR_MICROSECOND",    "HOUR_MINUTE",         "HOUR_SECOND",         "IF",                  "IGNORE",
  "IN",                  "INDEX",               "INFILE",              "INNER",               "INOUT",
  "INSENSITIVE",         "INSERT",              "INT",                 "INT1",                "INT2",
  "INT3",                "INT4",                "INT8",                "INTEGER",             "INTERSECT",
  "INTERVAL",            "INTO",                "IO_AFTER_GTIDS",      "IO_BEFORE_GTIDS",     "IS",
  "ITERATE",             "JOIN",                "JSON_TABLE",          "KEY",                 "KEYS",
  "KILL",                "LAG",                 "LAST_VALUE",          "LATERAL",             "LEAD",
  "LEADING",             "LEAVE",               "LEFT",                "LIKE",                "LIMIT",
  "LINEAR",              "LINES",               "LOAD",                "LOCALTIME",           "LOCALTIMESTAMP",
  "LOCK",                "LONG",                "LONGBLOB",            "LONGTEXT",            "LOOP",
  "LOW_PRIORITY",        "MATCH",               "MAXVALUE",            "MEDIUMBLOB",          "MEDIUMINT",
  "MEDIUMTEXT",          "MIDDLEINT",           "MINUTE_MICROSECOND",  "MINUTE_SECOND",       "MOD",
  "MODIFIES",            "NATURAL",             "NOT",                 "NO_WRITE_TO_BINLOG",  "NTH_VALUE",
  "NTILE",               "NULL",                "NUMERIC",             "OF",                  "ON",
  "OPTIMIZE",            "OPTIMIZER_COSTS",     "OPTION",              "OPTIONALLY",          "OR",
  "ORDER",               "OUT",                 "OUTER",               "OUTFILE",             "OVER",
  "PARTITION",           "PERCENT_RANK",        "PRECISION",           "PRIMARY",             "PROCEDURE",
  "PURGE",               "QUALIFY",             "RANGE",               "RANK",                "READ",
  "READS",               "READ_WRITE",          "REAL",                "RECURSIVE",           "REFERENCES",
  "REGEXP",              "RELEASE",             "RENAME",              "REPEAT",              "REPLACE",
  "REQUIRE",             "RESIGNAL",            "RESTRICT",            "RETURN",              "REVOKE",
  "RIGHT",               "RLIKE",               "ROW",                 "ROWS",                "ROW_NUMBER",
  "SCHEMA",              "SCHEMAS",             "SECOND_MICROSECOND",  "SELECT",              "SENSITIVE",
  "SEPARATOR",           "SET",                 "SHOW",                "SIGNAL",              "SMALLINT",
  "SPATIAL",             "SPECIFIC",            "SQL",                 "SQLEXCEPTION",        "SQLSTATE",
  "SQLWARNING",          "SQL_BIG_RESULT",      "SQL_CALC_FOUND_ROWS", "SQL_SMALL_RESULT",    "SSL",
  "STARTING",            "STORED",              "STRAIGHT_JOIN",       "SYSTEM",              "TABLE",
  "TABLESAMPLE",         "TERMINATED",          "THEN",                "TINYBLOB",            "TINYINT",
  "TINYTEXT",            "TO",                  "TRAILING",            "TRIGGER",             "TRUE",
  "UNDO",                "UNION",               "UNIQUE",              "UNLOCK",              "UNSIGNED",
  "UPDATE",              "USAGE",               "USE",                 "USING",               "UTC_DATE",
  "UTC_TIME",            "UTC_TIMESTAMP",       "VALUES",              "VARBINARY",           "VARCHAR",
  "VARCHARACTER",        "VARYING",             "VIRTUAL",             "WHEN",                "WHERE",
  "WHILE",               "WINDOW",              "WITH",                "WRITE",               "XOR",
  "YEAR_MONTH",          "ZEROFILL",
};

typedef struct {
  uint32_t start;
  uint32_t end;
  int32_t delta;
  uint8_t stride;
} UpperRange;

// Unicode Simple_Uppercase_Mapping ranges for case-insensitive MySQL routine variable matching.
static const UpperRange MYSQL_UPPER_RANGES[] = {
  {0x00B5, 0x00B5, 743, 1},   {0x00E0, 0x00F6, -32, 1},   {0x00F8, 0x00FE, -32, 1},   {0x00FF, 0x00FF, 121, 1},
  {0x0101, 0x012F, -1, 2},    {0x0131, 0x0131, -232, 1},  {0x0133, 0x0137, -1, 2},    {0x013A, 0x0148, -1, 2},
  {0x014B, 0x0177, -1, 2},    {0x017A, 0x017E, -1, 2},    {0x017F, 0x017F, -300, 1},  {0x0180, 0x0180, 195, 1},
  {0x0183, 0x0185, -1, 2},    {0x0188, 0x0188, -1, 1},    {0x018C, 0x018C, -1, 1},    {0x0192, 0x0192, -1, 1},
  {0x0195, 0x0195, 97, 1},    {0x0199, 0x0199, -1, 1},    {0x019A, 0x019A, 163, 1},   {0x019E, 0x019E, 130, 1},
  {0x01A1, 0x01A5, -1, 2},    {0x01A8, 0x01A8, -1, 1},    {0x01AD, 0x01AD, -1, 1},    {0x01B0, 0x01B0, -1, 1},
  {0x01B4, 0x01B6, -1, 2},    {0x01B9, 0x01B9, -1, 1},    {0x01BD, 0x01BD, -1, 1},    {0x01BF, 0x01BF, 56, 1},
  {0x01C5, 0x01C5, -1, 1},    {0x01C6, 0x01C6, -2, 1},    {0x01C8, 0x01C8, -1, 1},    {0x01C9, 0x01C9, -2, 1},
  {0x01CB, 0x01CB, -1, 1},    {0x01CC, 0x01CC, -2, 1},    {0x01CE, 0x01DC, -1, 2},    {0x01DD, 0x01DD, -79, 1},
  {0x01DF, 0x01EF, -1, 2},    {0x01F2, 0x01F2, -1, 1},    {0x01F3, 0x01F3, -2, 1},    {0x01F5, 0x01F5, -1, 1},
  {0x01F9, 0x021F, -1, 2},    {0x0223, 0x0233, -1, 2},    {0x023C, 0x023C, -1, 1},    {0x023F, 0x0240, 10815, 1},
  {0x0242, 0x0242, -1, 1},    {0x0247, 0x024F, -1, 2},    {0x0250, 0x0250, 10783, 1}, {0x0251, 0x0251, 10780, 1},
  {0x0252, 0x0252, 10782, 1}, {0x0253, 0x0253, -210, 1},  {0x0254, 0x0254, -206, 1},  {0x0256, 0x0257, -205, 1},
  {0x0259, 0x0259, -202, 1},  {0x025B, 0x025B, -203, 1},  {0x025C, 0x025C, 42319, 1}, {0x0260, 0x0260, -205, 1},
  {0x0261, 0x0261, 42315, 1}, {0x0263, 0x0263, -207, 1},  {0x0265, 0x0265, 42280, 1}, {0x0266, 0x0266, 42308, 1},
  {0x0268, 0x0268, -209, 1},  {0x0269, 0x0269, -211, 1},  {0x026A, 0x026A, 42308, 1}, {0x026B, 0x026B, 10743, 1},
  {0x026C, 0x026C, 42305, 1}, {0x026F, 0x026F, -211, 1},  {0x0271, 0x0271, 10749, 1}, {0x0272, 0x0272, -213, 1},
  {0x0275, 0x0275, -214, 1},  {0x027D, 0x027D, 10727, 1}, {0x0280, 0x0280, -218, 1},  {0x0282, 0x0282, 42307, 1},
  {0x0283, 0x0283, -218, 1},  {0x0287, 0x0287, 42282, 1}, {0x0288, 0x0288, -218, 1},  {0x0289, 0x0289, -69, 1},
  {0x028A, 0x028B, -217, 1},  {0x028C, 0x028C, -71, 1},   {0x0292, 0x0292, -219, 1},  {0x029D, 0x029D, 42261, 1},
  {0x029E, 0x029E, 42258, 1}, {0x0345, 0x0345, 84, 1},    {0x0371, 0x0373, -1, 2},    {0x0377, 0x0377, -1, 1},
  {0x037B, 0x037D, 130, 1},   {0x03AC, 0x03AC, -38, 1},   {0x03AD, 0x03AF, -37, 1},   {0x03B1, 0x03C1, -32, 1},
  {0x03C2, 0x03C2, -31, 1},   {0x03C3, 0x03CB, -32, 1},   {0x03CC, 0x03CC, -64, 1},   {0x03CD, 0x03CE, -63, 1},
  {0x03D0, 0x03D0, -62, 1},   {0x03D1, 0x03D1, -57, 1},   {0x03D5, 0x03D5, -47, 1},   {0x03D6, 0x03D6, -54, 1},
  {0x03D7, 0x03D7, -8, 1},    {0x03D9, 0x03EF, -1, 2},    {0x03F0, 0x03F0, -86, 1},   {0x03F1, 0x03F1, -80, 1},
  {0x03F2, 0x03F2, 7, 1},     {0x03F3, 0x03F3, -116, 1},  {0x03F5, 0x03F5, -96, 1},   {0x03F8, 0x03F8, -1, 1},
  {0x03FB, 0x03FB, -1, 1},    {0x0430, 0x044F, -32, 1},   {0x0450, 0x045F, -80, 1},   {0x0461, 0x0481, -1, 2},
  {0x048B, 0x04BF, -1, 2},    {0x04C2, 0x04CE, -1, 2},    {0x04CF, 0x04CF, -15, 1},   {0x04D1, 0x052F, -1, 2},
  {0x0561, 0x0586, -48, 1},   {0x10D0, 0x10FA, 3008, 1},  {0x10FD, 0x10FF, 3008, 1},  {0x13F8, 0x13FD, -8, 1},
  {0x1C80, 0x1C80, -6254, 1}, {0x1C81, 0x1C81, -6253, 1}, {0x1C82, 0x1C82, -6244, 1}, {0x1C83, 0x1C84, -6242, 1},
  {0x1C85, 0x1C85, -6243, 1}, {0x1C86, 0x1C86, -6236, 1}, {0x1C87, 0x1C87, -6181, 1}, {0x1C88, 0x1C88, 35266, 1},
  {0x1D79, 0x1D79, 35332, 1}, {0x1D7D, 0x1D7D, 3814, 1},  {0x1D8E, 0x1D8E, 35384, 1}, {0x1E01, 0x1E95, -1, 2},
  {0x1E9B, 0x1E9B, -59, 1},   {0x1EA1, 0x1EFF, -1, 2},    {0x1F00, 0x1F07, 8, 1},     {0x1F10, 0x1F15, 8, 1},
  {0x1F20, 0x1F27, 8, 1},     {0x1F30, 0x1F37, 8, 1},     {0x1F40, 0x1F45, 8, 1},     {0x1F51, 0x1F57, 8, 2},
  {0x1F60, 0x1F67, 8, 1},     {0x1F70, 0x1F71, 74, 1},    {0x1F72, 0x1F75, 86, 1},    {0x1F76, 0x1F77, 100, 1},
  {0x1F78, 0x1F79, 128, 1},   {0x1F7A, 0x1F7B, 112, 1},   {0x1F7C, 0x1F7D, 126, 1},   {0x1F80, 0x1F87, 8, 1},
  {0x1F90, 0x1F97, 8, 1},     {0x1FA0, 0x1FA7, 8, 1},     {0x1FB0, 0x1FB1, 8, 1},     {0x1FB3, 0x1FB3, 9, 1},
  {0x1FBE, 0x1FBE, -7205, 1}, {0x1FC3, 0x1FC3, 9, 1},     {0x1FD0, 0x1FD1, 8, 1},     {0x1FE0, 0x1FE1, 8, 1},
  {0x1FE5, 0x1FE5, 7, 1},     {0x1FF3, 0x1FF3, 9, 1},     {0x214E, 0x214E, -28, 1},   {0x2170, 0x217F, -16, 1},
  {0x2184, 0x2184, -1, 1},    {0x24D0, 0x24E9, -26, 1},   {0x2C30, 0x2C5F, -48, 1},   {0x2C61, 0x2C61, -1, 1},
  {0x2C65, 0x2C65, -10795, 1},{0x2C66, 0x2C66, -10792, 1},{0x2C68, 0x2C6C, -1, 2},    {0x2C73, 0x2C73, -1, 1},
  {0x2C76, 0x2C76, -1, 1},    {0x2C81, 0x2CE3, -1, 2},    {0x2CEC, 0x2CEE, -1, 2},    {0x2CF3, 0x2CF3, -1, 1},
  {0x2D00, 0x2D25, -7264, 1}, {0x2D27, 0x2D27, -7264, 1}, {0x2D2D, 0x2D2D, -7264, 1}, {0xA641, 0xA66D, -1, 2},
  {0xA681, 0xA69B, -1, 2},    {0xA723, 0xA72F, -1, 2},    {0xA733, 0xA76F, -1, 2},    {0xA77A, 0xA77C, -1, 2},
  {0xA77F, 0xA787, -1, 2},    {0xA78C, 0xA78C, -1, 1},    {0xA791, 0xA793, -1, 2},    {0xA794, 0xA794, 48, 1},
  {0xA797, 0xA7A9, -1, 2},    {0xA7B5, 0xA7C3, -1, 2},    {0xA7C8, 0xA7CA, -1, 2},    {0xA7D1, 0xA7D1, -1, 1},
  {0xA7D7, 0xA7D9, -1, 2},    {0xA7F6, 0xA7F6, -1, 1},    {0xAB53, 0xAB53, -928, 1},  {0xAB70, 0xABBF, -38864, 1},
  {0xFF41, 0xFF5A, -32, 1},   {0x10428, 0x1044F, -40, 1}, {0x104D8, 0x104FB, -40, 1}, {0x10597, 0x105A1, -39, 1},
  {0x105A3, 0x105B1, -39, 1}, {0x105B3, 0x105B9, -39, 1}, {0x105BB, 0x105BC, -39, 1}, {0x10CC0, 0x10CF2, -64, 1},
  {0x118C0, 0x118DF, -32, 1}, {0x16E60, 0x16E7F, -32, 1}, {0x1E922, 0x1E943, -34, 1},
};

// MySQL 8.4 character sets recognized as `_charset` introducers even when separated by whitespace from the literal.
static const char *const MYSQL_CHARSETS[] = {
  "armscii8", "ascii",   "big5",    "binary",  "cp1250",  "cp1251",  "cp1256",   "cp1257",  "cp850",
  "cp852",    "cp866",   "cp932",   "dec8",    "eucjpms", "euckr",   "gb18030",  "gb2312",  "gbk",
  "geostd8",  "greek",   "hebrew",  "hp8",     "keybcs2", "koi8r",   "koi8u",    "latin1",  "latin2",
  "latin5",   "latin7",  "macce",   "macroman","sjis",    "swe7",    "tis620",   "ucs2",    "ujis",
  "utf16",    "utf16le", "utf32",   "utf8",    "utf8mb3", "utf8mb4",
};

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_hex_digit(int32_t c) { return is_digit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

static bool is_ascii_alpha(int32_t c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }

static bool is_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\v' || c == '\f' || c == '\r' || c == 0xFEFF;
}

static bool is_identifier_char(int32_t c) {
  return (c >= 0x80 && c != 0xFEFF) || is_digit(c) || is_ascii_alpha(c) || c == '_' || c == '$';
}

static bool is_user_var_char(int32_t c) { return is_identifier_char(c) || c == '.'; }

// MySQL `--` comments require the second `-` to be followed by whitespace, a control character, or EOF.
static bool is_dash_comment_follower(int32_t c) { return (c >= 0x01 && c <= 0x20) || c == 0x7F; }

static bool at_eof(TSLexer *lexer) { return lexer->lookahead == 0 && lexer->eof(lexer); }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool emit(TSLexer *lexer, enum TokenType symbol) {
  lexer->mark_end(lexer);
  lexer->result_symbol = symbol;
  return true;
}

static void skip_spaces(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) lexer->advance(lexer, true);
}

static bool is_mysql_charset(const char *word) {
  for (unsigned i = 0; i < sizeof MYSQL_CHARSETS / sizeof *MYSQL_CHARSETS; i++) {
    if (strcmp(word, MYSQL_CHARSETS[i]) == 0) return true;
  }
  return false;
}

static bool scan_line_comment(TSLexer *lexer, enum TokenType ok_symbol) {
  bool has_nul = false;
  while (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
    if (lexer->lookahead == 0) has_nul = true;
    advance(lexer);
  }
  return emit(lexer, has_nul ? ILLEGAL_TOKEN : ok_symbol);
}

static bool scan_dash_comment(TSLexer *lexer, enum TokenType ok_symbol) {
  advance(lexer);
  if (lexer->lookahead != '-') return false;
  advance(lexer);
  if ((lexer->lookahead == 0 && !lexer->eof(lexer)) || at_eof(lexer) || is_dash_comment_follower(lexer->lookahead)) {
    return scan_line_comment(lexer, ok_symbol);
  }
  return false;
}

typedef enum {
  GUARD_EMPTY_CHECK,
  GUARD_ACTIVE_BODY,
  GUARD_INACTIVE,
} VersionGuard;

static bool try_open_nested_comment(TSLexer *lexer, bool allow_nested, unsigned *depth) {
  if (!allow_nested || *depth != 1 || lexer->lookahead != '*') return false;
  advance(lexer);
  *depth = 2;
  return true;
}

static bool step_comment_char(TSLexer *lexer, bool allow_nested, bool *star, unsigned *depth) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (*star && c == '/') {
    *star = false;
    return --(*depth) == 0;
  }
  *star = (c != '/' || !try_open_nested_comment(lexer, allow_nested, depth)) && (c == '*');
  return false;
}

static bool scan_comment_tail(Scanner *scanner, TSLexer *lexer, bool allow_nested, enum TokenType ok_symbol) {
  bool has_nul = false;
  bool star = false;
  unsigned depth = 1;
  while (!at_eof(lexer)) {
    if (lexer->lookahead == 0) has_nul = true;
    if (step_comment_char(lexer, allow_nested, &star, &depth)) {
      return emit(lexer, has_nul ? ILLEGAL_TOKEN : ok_symbol);
    }
  }
  scanner->in_version_comment = false;
  return emit(lexer, ILLEGAL_TOKEN);
}

static VersionGuard check_sixth_version_digit(TSLexer *lexer, uint32_t *ver) {
  if (!is_digit(lexer->lookahead)) return *ver > 80499 ? GUARD_INACTIVE : GUARD_EMPTY_CHECK;
  uint32_t d6 = (uint32_t)(lexer->lookahead - '0');
  advance(lexer);
  if (is_space(lexer->lookahead)) {
    *ver = *ver * 10 + d6;
    lexer->mark_end(lexer);
    return *ver > 80499 ? GUARD_INACTIVE : GUARD_EMPTY_CHECK;
  }
  return *ver > 80499 ? GUARD_INACTIVE : GUARD_ACTIVE_BODY;
}

static VersionGuard parse_version_guard(TSLexer *lexer) {
  unsigned digits = 0;
  uint32_t ver = 0;
  while (digits < 5 && is_digit(lexer->lookahead)) {
    ver = ver * 10 + (uint32_t)(lexer->lookahead - '0');
    advance(lexer);
    digits++;
  }
  if (digits == 0) return GUARD_EMPTY_CHECK;
  if (digits < 5) return GUARD_ACTIVE_BODY;
  lexer->mark_end(lexer);
  return check_sixth_version_digit(lexer, &ver);
}

static bool scan_version_comment_open(Scanner *scanner, TSLexer *lexer, enum TokenType ok_symbol) {
  lexer->mark_end(lexer);
  VersionGuard guard = parse_version_guard(lexer);
  if (guard == GUARD_INACTIVE) return scan_comment_tail(scanner, lexer, true, ok_symbol);
  if (guard == GUARD_EMPTY_CHECK) {
    while (is_space(lexer->lookahead)) advance(lexer);
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        return emit(lexer, ok_symbol);
      }
    }
  }
  scanner->in_version_comment = true;
  lexer->result_symbol = VERSION_COMMENT_START;
  return true;
}

static bool scan_slash_comment(Scanner *scanner, TSLexer *lexer, enum TokenType ok_symbol) {
  advance(lexer);
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  if (!scanner->in_version_comment && lexer->lookahead == '!') {
    advance(lexer);
    return scan_version_comment_open(scanner, lexer, ok_symbol);
  }
  return scan_comment_tail(scanner, lexer, false, ok_symbol);
}

static bool scan_string_escape(TSLexer *lexer, bool *has_nul) {
  advance(lexer);
  if (at_eof(lexer)) return false;
  if (lexer->lookahead == 0) *has_nul = true;
  advance(lexer);
  return true;
}

static bool scan_delimited_step(TSLexer *lexer, int32_t quote, bool backslash_escapes, bool *has_nul, bool *closed) {
  int32_t c = lexer->lookahead;
  if (c == 0) *has_nul = true;
  if (backslash_escapes && c == '\\') return scan_string_escape(lexer, has_nul);
  advance(lexer);
  if (c != quote) return true;
  if (lexer->lookahead == quote) {
    advance(lexer);
    return true;
  }
  *closed = true;
  return true;
}

static bool scan_delimited(
  TSLexer *lexer, int32_t quote, bool backslash_escapes, bool allow_empty, enum TokenType target_symbol
) {
  advance(lexer);
  bool has_nul = false;
  bool closed = false;
  unsigned steps = 0;
  while (!at_eof(lexer)) {
    if (!scan_delimited_step(lexer, quote, backslash_escapes, &has_nul, &closed)) return emit(lexer, ILLEGAL_TOKEN);
    if (closed) {
      bool invalid = (!backslash_escapes && has_nul) || (!allow_empty && steps == 0);
      return emit(lexer, invalid ? ILLEGAL_TOKEN : target_symbol);
    }
    steps++;
  }
  return emit(lexer, ILLEGAL_TOKEN);
}

static bool scan_string_token(TSLexer *lexer, int32_t quote, enum TokenType target_symbol) {
  return scan_delimited(lexer, quote, true, true, target_symbol);
}

static bool is_nonconst_func_name(const char *word) {
  for (unsigned i = 0; i < sizeof MYSQL_NONCONST_FUNCS / sizeof *MYSQL_NONCONST_FUNCS; i++) {
    if (strcmp(word, MYSQL_NONCONST_FUNCS[i]) == 0) return true;
  }
  return false;
}

static bool is_mysql_reserved_word(const char *upper) {
  for (unsigned lo = 0, hi = sizeof MYSQL_RESERVED_WORDS / sizeof *MYSQL_RESERVED_WORDS; lo < hi;) {
    unsigned mid = lo + (hi - lo) / 2;
    int cmp = strcmp(upper, MYSQL_RESERVED_WORDS[mid]);
    if (cmp == 0) return true;
    if (cmp < 0) hi = mid;
    else lo = mid + 1;
  }
  return false;
}

static bool is_temporal_keyword(const char *upper) {
  return strcmp(upper, "DATE") == 0 || strcmp(upper, "TIME") == 0 || strcmp(upper, "TIMESTAMP") == 0;
}

static bool is_sp_first_branch_keyword(const char *upper) {
  return strcmp(upper, "IN") == 0 || strcmp(upper, "OUT") == 0 || strcmp(upper, "INOUT") == 0 ||
         strcmp(upper, "CONTINUE") == 0 || strcmp(upper, "EXIT") == 0;
}

static int32_t apply_upper_range(const UpperRange *r, int32_t cp) {
  return (r->stride == 1 || (((uint32_t)cp - r->start) & 1u) == 0) ? cp + r->delta : cp;
}

static int32_t mysql_simple_upper(int32_t cp) {
  if (cp < 0x80) return (cp >= 'a' && cp <= 'z') ? cp - 'a' + 'A' : cp;
  unsigned count = sizeof MYSQL_UPPER_RANGES / sizeof *MYSQL_UPPER_RANGES;
  for (unsigned base = 0; count > 0; count /= 2) {
    const UpperRange *r = &MYSQL_UPPER_RANGES[base + count / 2];
    if ((uint32_t)cp >= r->start && (uint32_t)cp <= r->end) return apply_upper_range(r, cp);
    if ((uint32_t)cp > r->end) { base += count / 2 + 1; count--; }
  }
  return cp;
}

typedef struct {
  uint8_t bytes[512];
  char ascii_upper[32];
  uint32_t byte_len;
  uint32_t char_len;
  bool all_ascii;
} FoldedIdent;

static void folded_init(FoldedIdent *id) {
  id->byte_len = 0;
  id->char_len = 0;
  id->all_ascii = true;
  id->ascii_upper[0] = 0;
}

static void folded_push_byte(FoldedIdent *id, uint8_t b) {
  if (id->byte_len < sizeof id->bytes) id->bytes[id->byte_len++] = b;
}

static void folded_push_cp(FoldedIdent *id, int32_t raw_cp) {
  int32_t cp = mysql_simple_upper(raw_cp);
  if (raw_cp >= 0x80) id->all_ascii = false;
  if (id->char_len + 1 < sizeof id->ascii_upper) {
    id->ascii_upper[id->char_len] = cp < 0x80 ? (char)cp : '?';
    id->ascii_upper[id->char_len + 1] = 0;
  }
  id->char_len++;
  if (cp < 0x80) {
    folded_push_byte(id, (uint8_t)cp);
  } else if (cp < 0x800) {
    folded_push_byte(id, (uint8_t)(0xC0 | (cp >> 6)));
    folded_push_byte(id, (uint8_t)(0x80 | (cp & 0x3F)));
  } else if (cp < 0x10000) {
    folded_push_byte(id, (uint8_t)(0xE0 | (cp >> 12)));
    folded_push_byte(id, (uint8_t)(0x80 | ((cp >> 6) & 0x3F)));
    folded_push_byte(id, (uint8_t)(0x80 | (cp & 0x3F)));
  } else {
    folded_push_byte(id, (uint8_t)(0xF0 | (cp >> 18)));
    folded_push_byte(id, (uint8_t)(0x80 | ((cp >> 12) & 0x3F)));
    folded_push_byte(id, (uint8_t)(0x80 | ((cp >> 6) & 0x3F)));
    folded_push_byte(id, (uint8_t)(0x80 | (cp & 0x3F)));
  }
}

static uint32_t push_sp_trie_node(Scanner *s, SpTrieNode node) {
  if (s->node_len == 0) {
    s->node_cap = 64;
    s->nodes = (SpTrieNode *)ts_calloc(s->node_cap, sizeof(SpTrieNode));
    s->node_len = 1;
  } else if (s->node_len >= s->node_cap) {
    s->node_cap *= 2;
    s->nodes = (SpTrieNode *)ts_realloc(s->nodes, s->node_cap * sizeof(SpTrieNode));
  }
  uint32_t idx = s->node_len++;
  s->nodes[idx] = node;
  return idx;
}

static bool sp_trie_contains(const Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  for (uint32_t cur = root, i = 0; cur != 0 && i < len;) {
    const SpTrieNode *n = &s->nodes[cur];
    if (key[i] != n->ch) cur = key[i] < n->ch ? n->lo : n->hi;
    else if (++i == len) return n->present != 0;
    else cur = n->eq;
  }
  return false;
}

static uint32_t sp_trie_insert_rec(Scanner *s, uint32_t cur, const uint8_t *key, uint32_t len) {
  SpTrieNode copy = cur != 0 ? s->nodes[cur] : (SpTrieNode){0, 0, 0, key[0], 0};
  if (key[0] < copy.ch) copy.lo = sp_trie_insert_rec(s, copy.lo, key, len);
  else if (key[0] > copy.ch) copy.hi = sp_trie_insert_rec(s, copy.hi, key, len);
  else if (len == 1) copy.present = 1;
  else copy.eq = sp_trie_insert_rec(s, copy.eq, key + 1, len - 1);
  return push_sp_trie_node(s, copy);
}

static uint32_t sp_trie_insert(Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  if (len == 0 || sp_trie_contains(s, root, key, len)) return root;
  return sp_trie_insert_rec(s, root, key, len);
}

static uint32_t push_sp_scope(Scanner *s, uint32_t parent, uint32_t saved_decl_root) {
  if (s->scope_len == 0) {
    s->scope_cap = 16;
    s->scopes = (SpScopeNode *)ts_calloc(s->scope_cap, sizeof(SpScopeNode));
    s->scope_len = 1;
  } else if (s->scope_len >= s->scope_cap) {
    s->scope_cap *= 2;
    s->scopes = (SpScopeNode *)ts_realloc(s->scopes, s->scope_cap * sizeof(SpScopeNode));
  }
  uint32_t idx = s->scope_len++;
  s->scopes[idx] = (SpScopeNode){parent, saved_decl_root};
  return idx;
}

static void pop_sp_scope(Scanner *s) {
  if (s->sp_scope_top == 0) {
    s->sp_decl_root = 0;
    s->sp_pending_root = 0;
    return;
  }
  SpScopeNode node = s->scopes[s->sp_scope_top];
  s->sp_decl_root = node.saved_decl_root;
  s->sp_pending_root = node.saved_decl_root;
  s->sp_scope_top = node.parent;
}

static void reset_sp_state(Scanner *s) {
  s->sp_decl_root = 0;
  s->sp_pending_root = 0;
  s->sp_scope_top = 0;
}

static void skip_peek_line_comment(TSLexer *lexer) {
  while (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') advance(lexer);
}

static void skip_peek_block_comment(TSLexer *lexer) {
  bool star = false;
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (star && c == '/') return;
    star = (c == '*');
  }
}

static bool try_skip_peek_dash_comment(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '-') return false;
  advance(lexer);
  bool follower =
      at_eof(lexer) || (lexer->lookahead == 0 && !lexer->eof(lexer)) || is_dash_comment_follower(lexer->lookahead);
  if (follower) skip_peek_line_comment(lexer);
  return follower;
}

static bool try_skip_peek_slash_comment(const Scanner *scanner, TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  if (!scanner->in_version_comment && lexer->lookahead == '!') {
    advance(lexer);
    if (parse_version_guard(lexer) == GUARD_INACTIVE) skip_peek_block_comment(lexer);
    return true;
  }
  skip_peek_block_comment(lexer);
  return true;
}

static bool step_peek_comment(const Scanner *scanner, TSLexer *lexer, int32_t *out) {
  int32_t c = lexer->lookahead;
  if (c == '#') return skip_peek_line_comment(lexer), true;
  if (c == '-') return try_skip_peek_dash_comment(lexer) || ((*out = '-'), false);
  if (c == '/') return try_skip_peek_slash_comment(scanner, lexer) || ((*out = '/'), false);
  if (scanner->in_version_comment && c == '*') {
    advance(lexer);
    if (lexer->lookahead != '/') return (*out = '*'), false;
    return advance(lexer), true;
  }
  *out = c;
  return false;
}

static int32_t peek_next_non_comment_char(const Scanner *scanner, TSLexer *lexer) {
  int32_t out = 0;
  for (;;) {
    while (is_space(lexer->lookahead)) advance(lexer);
    if (!step_peek_comment(scanner, lexer, &out)) return out;
  }
}

static char ascii_lower(int32_t c) { return (c >= 'A' && c <= 'Z') ? (char)(c - 'A' + 'a') : (char)c; }

static bool read_backtick_chars(TSLexer *lexer, char *lower, unsigned cap, FoldedIdent *folded, bool *has_nul) {
  folded_init(folded);
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == 0) *has_nul = true;
    advance(lexer);
    if (c == '`' && lexer->lookahead != '`') {
      lower[folded->char_len < cap ? folded->char_len : cap - 1] = 0;
      return true;
    }
    if (c == '`') advance(lexer);
    if (folded->char_len + 1 < cap) lower[folded->char_len] = ascii_lower(c);
    folded_push_cp(folded, c);
  }
  return false;
}

static enum TokenType resolve_identifier_backtick(
  const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, const char *lower, const FoldedIdent *folded
) {
  bool const_valid = valid_symbols[CONST_QUOTED_IDENTIFIER];
  bool sp_valid = valid_symbols[SP_LOCAL_QUOTED_IDENT];
  if (!const_valid && !sp_valid) return valid_symbols[QUOTED_IDENTIFIER] ? QUOTED_IDENTIFIER : ILLEGAL_TOKEN;
  int32_t next = peek_next_non_comment_char(scanner, lexer);
  if (const_valid && next == '(') {
    return (folded->all_ascii && folded->char_len < 24 && is_nonconst_func_name(lower)) ? ILLEGAL_TOKEN
                                                                                        : CONST_QUOTED_IDENTIFIER;
  }
  if (sp_valid && next != '(' && next != '.' &&
      sp_trie_contains(scanner, scanner->sp_decl_root, folded->bytes, folded->byte_len)) {
    return SP_LOCAL_QUOTED_IDENT;
  }
  return valid_symbols[QUOTED_IDENTIFIER] ? QUOTED_IDENTIFIER : ILLEGAL_TOKEN;
}

static bool scan_backtick_body(
  const Scanner *scanner, TSLexer *lexer, bool allow_empty, bool is_user_var, const bool *valid_symbols
) {
  advance(lexer);
  bool has_nul = false;
  char lower[24];
  FoldedIdent folded;
  if (!read_backtick_chars(lexer, lower, sizeof lower, &folded, &has_nul)) return emit(lexer, ILLEGAL_TOKEN);
  lexer->mark_end(lexer);
  if (has_nul || (!allow_empty && folded.char_len == 0)) {
    lexer->result_symbol = ILLEGAL_TOKEN;
    return true;
  }
  lexer->result_symbol =
      is_user_var ? USER_VARIABLE : resolve_identifier_backtick(scanner, lexer, valid_symbols, lower, &folded);
  return true;
}

static enum TokenType quoted_hex_or_bit_symbol(bool is_hex, const bool *valid_symbols, bool *require_nonzero) {
  *require_nonzero = false;
  if (!is_hex) return QUOTED_BIT_LITERAL;
  if (valid_symbols[NONZERO_QUOTED_HEX_LITERAL] && !valid_symbols[QUOTED_HEX_LITERAL]) {
    *require_nonzero = true;
    return NONZERO_QUOTED_HEX_LITERAL;
  }
  return QUOTED_HEX_LITERAL;
}

static bool scan_quoted_hex_or_bit(TSLexer *lexer, bool is_hex, const bool *valid_symbols) {
  advance(lexer);
  unsigned digits = 0;
  bool valid_chars = true;
  bool has_nonzero = false;
  while (!at_eof(lexer) && lexer->lookahead != '\'') {
    int32_t c = lexer->lookahead;
    if (is_hex ? !is_hex_digit(c) : (c != '0' && c != '1')) valid_chars = false;
    if (c != '0') has_nonzero = true;
    advance(lexer);
    digits++;
  }
  if (lexer->lookahead != '\'') return emit(lexer, ILLEGAL_TOKEN);
  advance(lexer);
  bool require_nonzero = false;
  enum TokenType sym = quoted_hex_or_bit_symbol(is_hex, valid_symbols, &require_nonzero);
  bool valid = valid_chars && (!is_hex || digits % 2 == 0) && (!require_nonzero || has_nonzero) && valid_symbols[sym];
  return emit(lexer, valid ? sym : ILLEGAL_TOKEN);
}

static bool emit_sp_local_if_declared(const Scanner *scanner, TSLexer *lexer, const FoldedIdent *folded) {
  if (!sp_trie_contains(scanner, scanner->sp_decl_root, folded->bytes, folded->byte_len)) return false;
  lexer->mark_end(lexer);
  int32_t next = peek_next_non_comment_char(scanner, lexer);
  if (next == '(' || next == '.') return false;
  if (folded->all_ascii && folded->char_len < sizeof folded->ascii_upper &&
      is_temporal_keyword(folded->ascii_upper) && next == '\'') {
    return false;
  }
  lexer->result_symbol = SP_LOCAL_IDENT;
  return true;
}

static void record_charset_char(int32_t c, char *charset, unsigned cap, unsigned *len, bool *charset_ok) {
  if (!*charset_ok) return;
  if (!is_ascii_alpha(c) && !is_digit(c)) {
    *charset_ok = false;
    return;
  }
  if (*len + 1 < cap) charset[*len] = ascii_lower(c);
  (*len)++;
}

static bool scan_charset_or_underscore_ident(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  FoldedIdent folded;
  folded_init(&folded);
  folded_push_cp(&folded, '_');
  advance(lexer);
  char charset[32];
  unsigned length = 0;
  bool charset_ok = true;
  while (is_identifier_char(lexer->lookahead)) {
    record_charset_char(lexer->lookahead, charset, sizeof charset, &length, &charset_ok);
    folded_push_cp(&folded, lexer->lookahead);
    advance(lexer);
  }
  charset[length < sizeof charset ? length : sizeof charset - 1] = 0;
  if (charset_ok && length > 0 && length < sizeof charset && is_mysql_charset(charset)) {
    enum TokenType sym = strcmp(charset, "binary") == 0 ? BINARY_CHARSET_INTRODUCER : CHARSET_INTRODUCER;
    return emit(lexer, valid_symbols[sym] ? sym : ILLEGAL_TOKEN);
  }
  return valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 &&
         emit_sp_local_if_declared(scanner, lexer, &folded);
}

static bool scan_backtick_sysvar_segment(TSLexer *lexer) {
  advance(lexer);
  unsigned length = 0;
  while (!at_eof(lexer) && lexer->lookahead != 0) {
    if (lexer->lookahead == '`') {
      advance(lexer);
      if (lexer->lookahead != '`') return length > 0;
    }
    advance(lexer);
    length++;
  }
  return false;
}

static bool scan_sysvar_segment(TSLexer *lexer) {
  if (lexer->lookahead == '`') return scan_backtick_sysvar_segment(lexer);
  bool has_non_digit = false;
  unsigned length = 0;
  while (is_identifier_char(lexer->lookahead)) {
    if (!is_digit(lexer->lookahead)) has_non_digit = true;
    advance(lexer);
    length++;
  }
  return length > 0 && has_non_digit;
}

static bool reject_sysvar_tail(TSLexer *lexer) {
  while (!at_eof(lexer) && (lexer->lookahead == '`' || is_identifier_char(lexer->lookahead))) advance(lexer);
  return emit(lexer, ILLEGAL_TOKEN);
}

static bool scan_system_variable(TSLexer *lexer, bool sysvar_valid) {
  advance(lexer);
  if (!scan_sysvar_segment(lexer)) return reject_sysvar_tail(lexer);
  for (unsigned dots = 0; dots < 2 && lexer->lookahead == '.'; dots++) {
    advance(lexer);
    if (!scan_sysvar_segment(lexer)) return reject_sysvar_tail(lexer);
  }
  return emit(lexer, sysvar_valid ? SYSTEM_VARIABLE : ILLEGAL_TOKEN);
}

static bool scan_at_variable(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead == '@') return scan_system_variable(lexer, valid_symbols[SYSTEM_VARIABLE]);
  if (!valid_symbols[USER_VARIABLE]) return false;

  if (lexer->lookahead == '\'' || lexer->lookahead == '"') {
    return scan_string_token(lexer, lexer->lookahead, USER_VARIABLE);
  }
  if (lexer->lookahead == '`') return scan_backtick_body(scanner, lexer, true, true, valid_symbols);
  if (is_user_var_char(lexer->lookahead)) {
    while (is_user_var_char(lexer->lookahead)) advance(lexer);
    return emit(lexer, USER_VARIABLE);
  }
  return !valid_symbols[UNREACHABLE] && emit(lexer, ILLEGAL_TOKEN);
}

static void advance_folded(TSLexer *lexer, FoldedIdent *folded) {
  folded_push_cp(folded, lexer->lookahead);
  advance(lexer);
}

static bool finish_illegal_digit_tail(TSLexer *lexer) {
  while (is_identifier_char(lexer->lookahead)) advance(lexer);
  return emit(lexer, ILLEGAL_TOKEN);
}

static bool finish_digit_ident_tail(
  const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, FoldedIdent *folded
) {
  while (is_identifier_char(lexer->lookahead)) advance_folded(lexer, folded);
  lexer->mark_end(lexer);
  if (valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 &&
      sp_trie_contains(scanner, scanner->sp_decl_root, folded->bytes, folded->byte_len)) {
    int32_t next = peek_next_non_comment_char(scanner, lexer);
    if (next != '(' && next != '.') {
      lexer->result_symbol = SP_LOCAL_IDENT;
      return true;
    }
  }
  lexer->result_symbol = valid_symbols[DIGIT_IDENTIFIER] ? DIGIT_IDENTIFIER : ILLEGAL_TOKEN;
  return true;
}

static bool scan_malformed_exponent(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
  if (!is_digit(lexer->lookahead)) return finish_illegal_digit_tail(lexer);
  while (is_digit(lexer->lookahead)) advance(lexer);
  return is_identifier_char(lexer->lookahead) && finish_illegal_digit_tail(lexer);
}

static bool scan_radix_literal(
  const Scanner *scanner, TSLexer *lexer, bool is_hex, const bool *valid_symbols, FoldedIdent *folded
) {
  advance_folded(lexer, folded);
  unsigned digits = 0;
  while (is_hex ? is_hex_digit(lexer->lookahead) : (lexer->lookahead == '0' || lexer->lookahead == '1')) {
    advance_folded(lexer, folded);
    digits++;
  }
  if (digits > 0 && !is_identifier_char(lexer->lookahead)) return false;
  return finish_digit_ident_tail(scanner, lexer, valid_symbols, folded);
}

static bool scan_integer_exponent(
  const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, FoldedIdent *folded
) {
  advance_folded(lexer, folded);
  if (lexer->lookahead == '+' || lexer->lookahead == '-') {
    advance(lexer);
    if (!is_digit(lexer->lookahead)) return finish_illegal_digit_tail(lexer);
    while (is_digit(lexer->lookahead)) advance(lexer);
    return is_identifier_char(lexer->lookahead) && finish_illegal_digit_tail(lexer);
  }
  if (is_digit(lexer->lookahead)) {
    while (is_digit(lexer->lookahead)) advance_folded(lexer, folded);
    if (!is_identifier_char(lexer->lookahead)) return false;
  }
  return finish_digit_ident_tail(scanner, lexer, valid_symbols, folded);
}

static bool scan_fraction_and_exponent(TSLexer *lexer, bool require_digit) {
  advance(lexer);
  if (require_digit && !is_digit(lexer->lookahead)) return false;
  while (is_digit(lexer->lookahead)) advance(lexer);
  return (lexer->lookahead == 'e' || lexer->lookahead == 'E') && scan_malformed_exponent(lexer);
}

// Distinguishes valid numbers (`123`, `1e10`, `0x1F`, `0b01`), digit-leading identifiers (`123abc`, `1e_col`,
// `0xZZ`, `0X1F`, `0b2`), and malformed floating-point literals (`1e+a`, `1.2e`, `.5e+a`).
static bool scan_digit_or_float(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  if (lexer->lookahead == '.') return valid_symbols[USER_VARIABLE] && scan_fraction_and_exponent(lexer, true);

  FoldedIdent folded;
  folded_init(&folded);
  int32_t first = lexer->lookahead;
  advance_folded(lexer, &folded);
  if (first == '0' && (lexer->lookahead == 'x' || lexer->lookahead == 'b')) {
    return scan_radix_literal(scanner, lexer, lexer->lookahead == 'x', valid_symbols, &folded);
  }
  while (is_digit(lexer->lookahead)) advance_folded(lexer, &folded);
  if (lexer->lookahead == '.') return scan_fraction_and_exponent(lexer, false);
  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    return scan_integer_exponent(scanner, lexer, valid_symbols, &folded);
  }
  return is_identifier_char(lexer->lookahead) && finish_digit_ident_tail(scanner, lexer, valid_symbols, &folded);
}

static bool scan_unquoted_word_or_sp_local(Scanner *scanner, TSLexer *lexer, int32_t first, const bool *valid_symbols) {
  FoldedIdent folded;
  folded_init(&folded);
  folded_push_cp(&folded, first);
  while (is_identifier_char(lexer->lookahead)) advance_folded(lexer, &folded);
  if (folded.all_ascii && folded.char_len < sizeof folded.ascii_upper && is_mysql_reserved_word(folded.ascii_upper)) {
    return false;
  }
  return valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 &&
         emit_sp_local_if_declared(scanner, lexer, &folded);
}

static bool scan_prefixed_literal_or_ident(Scanner *scanner, TSLexer *lexer, int32_t c, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead != '\'') {
    return !valid_symbols[UNREACHABLE] && valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 &&
           scan_unquoted_word_or_sp_local(scanner, lexer, c, valid_symbols);
  }
  if (c == 'n' || c == 'N') {
    return scan_string_token(
      lexer, '\'', valid_symbols[NATIONAL_STRING_SEGMENT] ? NATIONAL_STRING_SEGMENT : ILLEGAL_TOKEN
    );
  }
  bool is_hex = (c == 'x' || c == 'X');
  return scan_quoted_hex_or_bit(lexer, is_hex, valid_symbols);
}

static bool scan_host_name(TSLexer *lexer) {
  if (!is_user_var_char(lexer->lookahead)) return false;
  while (is_user_var_char(lexer->lookahead)) advance(lexer);
  return emit(lexer, HOST_NAME);
}

static int32_t decode_mysql_escape_char(int32_t e, bool *valid_sqlstate) {
  switch (e) {
    case '0':
      return 0;
    case 'b':
      return '\b';
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    case 'Z':
      return 0x1A;
    case '%':
    case '_':
      *valid_sqlstate = false;
      return e;
    default:
      return e;
  }
}

static bool is_sqlstate_char(int32_t c) { return is_digit(c) || (c >= 'A' && c <= 'Z'); }

static bool step_sqlstate_char(TSLexer *lexer, int32_t quote, int32_t *out, bool *closed, bool *valid) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == '\\') {
    if (at_eof(lexer)) return false;
    int32_t e = lexer->lookahead;
    advance(lexer);
    *out = decode_mysql_escape_char(e, valid);
    return true;
  }
  if (c != quote) return (*out = c), true;
  if (lexer->lookahead != quote) return (*closed = true), true;
  advance(lexer);
  *out = quote;
  return true;
}

static bool scan_sqlstate_literal(TSLexer *lexer, int32_t quote) {
  advance(lexer);
  char buf[6] = {0};
  unsigned len = 0;
  bool valid = true;
  while (!at_eof(lexer)) {
    int32_t d = 0;
    bool closed = false;
    if (!step_sqlstate_char(lexer, quote, &d, &closed, &valid)) return emit(lexer, ILLEGAL_TOKEN);
    if (closed) {
      bool ok = valid && len == 5 && !(buf[0] == '0' && buf[1] == '0');
      return emit(lexer, ok ? SQLSTATE_LITERAL : ILLEGAL_TOKEN);
    }
    if (!is_sqlstate_char(d)) valid = false;
    if (len < 5) buf[len] = (char)d;
    len++;
  }
  return emit(lexer, ILLEGAL_TOKEN);
}

static int find_signal_item_index(const char *word) {
  for (unsigned i = 0; i < sizeof MYSQL_SIGNAL_ITEMS / sizeof *MYSQL_SIGNAL_ITEMS; i++) {
    if (strcmp(word, MYSQL_SIGNAL_ITEMS[i]) == 0) return (int)i;
  }
  return -1;
}

static bool scan_signal_item_name(Scanner *scanner, TSLexer *lexer, bool is_first) {
  char word[24];
  unsigned len = 0;
  while (is_ascii_alpha(lexer->lookahead) || lexer->lookahead == '_') {
    int32_t c = lexer->lookahead;
    if (len + 1 < sizeof word) word[len] = (c >= 'A' && c <= 'Z') ? (char)(c - 'A' + 'a') : (char)c;
    len++;
    advance(lexer);
  }
  word[len < sizeof word ? len : sizeof word - 1] = 0;
  if (len == 0 || len >= sizeof word || is_identifier_char(lexer->lookahead)) return false;
  int idx = find_signal_item_index(word);
  if (idx < 0) return false;
  uint16_t bit = (uint16_t)(1u << idx);
  if (is_first) {
    scanner->signal_item_mask = bit;
    return emit(lexer, SIGNAL_FIRST_ITEM_NAME);
  }
  if ((scanner->signal_item_mask & bit) != 0) return emit(lexer, ILLEGAL_TOKEN);
  scanner->signal_item_mask |= bit;
  return emit(lexer, SIGNAL_NEXT_ITEM_NAME);
}

static bool is_prefixed_literal_letter(int32_t c) {
  return c == 'n' || c == 'N' || c == 'x' || c == 'X' || c == 'b' || c == 'B';
}

static bool read_capture_unquoted_ident(TSLexer *lexer, bool is_first, FoldedIdent *folded) {
  folded_init(folded);
  int32_t first = lexer->lookahead;
  bool has_non_digit = !is_digit(first);
  char charset[32];
  unsigned cs_len = 0;
  bool cs_ok = (first == '_');
  advance_folded(lexer, folded);
  if (lexer->lookahead == '\'' && is_prefixed_literal_letter(first)) return false;
  while (is_identifier_char(lexer->lookahead)) {
    has_non_digit = has_non_digit || !is_digit(lexer->lookahead);
    record_charset_char(lexer->lookahead, charset, sizeof charset, &cs_len, &cs_ok);
    advance_folded(lexer, folded);
  }
  charset[cs_len < sizeof charset ? cs_len : sizeof charset - 1] = 0;
  if (!has_non_digit || (cs_ok && cs_len > 0 && cs_len < sizeof charset && is_mysql_charset(charset))) return false;
  return !(is_first && folded->all_ascii && folded->char_len < sizeof folded->ascii_upper &&
           is_sp_first_branch_keyword(folded->ascii_upper));
}

static bool scan_sp_capture_ident(Scanner *scanner, TSLexer *lexer, bool is_first) {
  lexer->mark_end(lexer);
  FoldedIdent folded;
  if (lexer->lookahead == '`') {
    advance(lexer);
    bool has_nul = false;
    char lower[24];
    if (!read_backtick_chars(lexer, lower, sizeof lower, &folded, &has_nul) || has_nul || folded.char_len == 0) {
      return false;
    }
  } else if (is_identifier_char(lexer->lookahead)) {
    if (!read_capture_unquoted_ident(lexer, is_first, &folded)) return false;
  } else {
    return false;
  }
  uint32_t base = is_first ? scanner->sp_decl_root : scanner->sp_pending_root;
  scanner->sp_pending_root = sp_trie_insert(scanner, base, folded.bytes, folded.byte_len);
  lexer->result_symbol = is_first ? SP_CAPTURE_FIRST_IDENT : SP_CAPTURE_NEXT_IDENT;
  return true;
}

static bool scan_sp_zero_width_step(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[UNREACHABLE]) return false;
  if (valid_symbols[SP_ROUTINE_RESET]) {
    reset_sp_state(scanner);
    return emit(lexer, SP_ROUTINE_RESET);
  }
  if (valid_symbols[SP_SCOPE_PUSH]) {
    scanner->sp_scope_top = push_sp_scope(scanner, scanner->sp_scope_top, scanner->sp_decl_root);
    return emit(lexer, SP_SCOPE_PUSH);
  }
  if (valid_symbols[SP_SCOPE_POP]) {
    pop_sp_scope(scanner);
    return emit(lexer, SP_SCOPE_POP);
  }
  if (valid_symbols[SP_COMMIT_VARS]) {
    scanner->sp_decl_root = scanner->sp_pending_root;
    return emit(lexer, SP_COMMIT_VARS);
  }
  return false;
}

void *tree_sitter_mysql_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }

void tree_sitter_mysql_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  if (!scanner) return;
  ts_free(scanner->nodes);
  ts_free(scanner->scopes);
  ts_free(scanner);
}

unsigned tree_sitter_mysql_external_scanner_serialize(void *payload, char *buffer) {
  const Scanner *scanner = (const Scanner *)payload;
  if (!scanner->in_version_comment && scanner->signal_item_mask == 0 && scanner->sp_decl_root == 0 &&
      scanner->sp_pending_root == 0 && scanner->sp_scope_top == 0) {
    return 0;
  }
  buffer[0] = scanner->in_version_comment ? 1 : 0;
  buffer[1] = (char)(scanner->signal_item_mask & 0xFF);
  buffer[2] = (char)((scanner->signal_item_mask >> 8) & 0xFF);
  memcpy(buffer + 3, &scanner->sp_decl_root, sizeof(uint32_t));
  memcpy(buffer + 7, &scanner->sp_pending_root, sizeof(uint32_t));
  memcpy(buffer + 11, &scanner->sp_scope_top, sizeof(uint32_t));
  return 15;
}

void tree_sitter_mysql_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  scanner->in_version_comment = (length > 0 && buffer[0] != 0);
  scanner->signal_item_mask =
      length >= 3 ? (uint16_t)((uint8_t)buffer[1] | ((uint16_t)(uint8_t)buffer[2] << 8)) : 0;
  if (length >= 15) {
    memcpy(&scanner->sp_decl_root, buffer + 3, sizeof(uint32_t));
    memcpy(&scanner->sp_pending_root, buffer + 7, sizeof(uint32_t));
    memcpy(&scanner->sp_scope_top, buffer + 11, sizeof(uint32_t));
  } else {
    reset_sp_state(scanner);
  }
}

static bool scan_version_comment_end(Scanner *scanner, TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '/') return false;
  advance(lexer);
  scanner->in_version_comment = false;
  return emit(lexer, VERSION_COMMENT_END);
}

static bool scan_top_level_semicolon(Scanner *scanner, TSLexer *lexer) {
  advance(lexer);
  scanner->signal_item_mask = 0;
  reset_sp_state(scanner);
  if (scanner->in_version_comment) {
    scanner->in_version_comment = false;
    return emit(lexer, ILLEGAL_TOKEN);
  }
  return emit(lexer, STATEMENT_TERMINATOR);
}

static bool scan_quote_or_sqlstate(TSLexer *lexer, int32_t quote, const bool *valid_symbols) {
  if (valid_symbols[SQLSTATE_LITERAL] && !valid_symbols[UNREACHABLE]) return scan_sqlstate_literal(lexer, quote);
  return scan_string_token(lexer, quote, valid_symbols[STRING_SEGMENT] ? STRING_SEGMENT : ILLEGAL_TOKEN);
}

static bool scan_default_token(Scanner *scanner, TSLexer *lexer, int32_t c, const bool *valid_symbols) {
  if (valid_symbols[UNREACHABLE]) return false;
  if (is_ascii_alpha(c) && (valid_symbols[SIGNAL_FIRST_ITEM_NAME] || valid_symbols[SIGNAL_NEXT_ITEM_NAME])) {
    return scan_signal_item_name(scanner, lexer, valid_symbols[SIGNAL_FIRST_ITEM_NAME]);
  }
  if (is_digit(c) || c == '.') return scan_digit_or_float(scanner, lexer, valid_symbols);
  if (valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 && is_identifier_char(c)) {
    advance(lexer);
    return scan_unquoted_word_or_sp_local(scanner, lexer, c, valid_symbols);
  }
  return false;
}

static bool scan_token_by_start(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  int32_t c = lexer->lookahead;
  switch (c) {
    case '\'':
    case '"':
      return scan_quote_or_sqlstate(lexer, c, valid_symbols);
    case '`':
      return scan_backtick_body(scanner, lexer, false, false, valid_symbols);
    case 'n':
    case 'N':
    case 'x':
    case 'X':
    case 'b':
    case 'B':
      return scan_prefixed_literal_or_ident(scanner, lexer, c, valid_symbols);
    case '@':
      return scan_at_variable(scanner, lexer, valid_symbols);
    case '_':
      return !valid_symbols[DOT_CONTEXT] && !valid_symbols[UNREACHABLE] &&
             scan_charset_or_underscore_ident(scanner, lexer, valid_symbols);
    default:
      return scan_default_token(scanner, lexer, c, valid_symbols);
  }
}

static bool scan_comment_if_present(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, bool *out) {
  enum TokenType comment_symbol = valid_symbols[RECOVERY_COMMENT] ? RECOVERY_COMMENT : COMMENT;
  if (lexer->lookahead == '#') return (*out = scan_line_comment(lexer, comment_symbol)), true;
  if (lexer->lookahead == '-') return (*out = scan_dash_comment(lexer, comment_symbol)), true;
  if (lexer->lookahead == '/') return (*out = scan_slash_comment(scanner, lexer, comment_symbol)), true;
  return false;
}

static bool scan_eof_token(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  scanner->signal_item_mask = 0;
  reset_sp_state(scanner);
  if (scanner->in_version_comment && !valid_symbols[UNREACHABLE]) {
    scanner->in_version_comment = false;
    return emit(lexer, ILLEGAL_TOKEN);
  }
  return !scanner->in_version_comment && valid_symbols[END_OF_INPUT] && emit(lexer, END_OF_INPUT);
}

static bool scan_nul_run(TSLexer *lexer) {
  while (lexer->lookahead == 0 && !lexer->eof(lexer)) advance(lexer);
  return emit(lexer, ILLEGAL_TOKEN);
}

bool tree_sitter_mysql_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  if (scan_sp_zero_width_step(scanner, lexer, valid_symbols)) return true;
  skip_spaces(lexer);
  if (at_eof(lexer)) return scan_eof_token(scanner, lexer, valid_symbols);
  if (lexer->lookahead == 0) return scan_nul_run(lexer);
  if (scanner->in_version_comment && lexer->lookahead == '*') return scan_version_comment_end(scanner, lexer);
  bool non_recovery = !valid_symbols[UNREACHABLE];
  if (non_recovery && lexer->lookahead == ';' && valid_symbols[STATEMENT_TERMINATOR]) {
    return scan_top_level_semicolon(scanner, lexer);
  }
  bool comment_result = false;
  if (scan_comment_if_present(scanner, lexer, valid_symbols, &comment_result)) return comment_result;
  if (non_recovery && (valid_symbols[SP_CAPTURE_FIRST_IDENT] || valid_symbols[SP_CAPTURE_NEXT_IDENT])) {
    return scan_sp_capture_ident(scanner, lexer, valid_symbols[SP_CAPTURE_FIRST_IDENT]);
  }
  if (non_recovery && valid_symbols[HOST_NAME] && scan_host_name(lexer)) return true;
  return scan_token_by_start(scanner, lexer, valid_symbols);
}
