// MySQL 8.4 external scanner.
#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  COMMENT, RECOVERY_COMMENT, VERSION_COMMENT_START, VERSION_COMMENT_END, STRING_SEGMENT, NATIONAL_STRING_SEGMENT,
  CHARSET_INTRODUCER, BINARY_CHARSET_INTRODUCER, QUOTED_HEX_LITERAL, NONZERO_QUOTED_HEX_LITERAL, QUOTED_BIT_LITERAL,
  USER_VARIABLE, SYS_VAR_READ_SCOPE, SYS_VAR_PERSIST_SCOPE, SYS_VAR_RVALUE_HEAD, SYS_VAR_LVALUE_HEAD,
  SYS_VAR_PREFIX_SEGMENT, SYS_VAR_RVALUE_SEGMENT, SYS_VAR_LVALUE_SEGMENT, EXPLAIN_FORMAT_JSON, EXPLAIN_FORMAT_OTHER,
  QUOTED_IDENTIFIER, CONST_QUOTED_IDENTIFIER, DIGIT_IDENTIFIER, HOST_NAME, STATEMENT_TERMINATOR, END_OF_INPUT,
  SQLSTATE_LITERAL, SIGNAL_FIRST_ITEM_NAME, SIGNAL_NEXT_ITEM_NAME, SP_ROUTINE_RESET, SP_SCOPE_PUSH, SP_SCOPE_POP,
  SP_CAPTURE_FIRST_IDENT, SP_CAPTURE_NEXT_IDENT, SP_COMMIT_VARS, SP_CAPTURE_LABEL, SP_ACTIVATE_BLOCK_LABEL,
  SP_ACTIVATE_LOOP_LABEL, SP_MATCH_END_LABEL, SP_LABEL_POP, SP_LABEL_POP_NO_END, SP_HANDLER_BARRIER_PUSH,
  SP_HANDLER_BARRIER_POP, SP_CHECK_LEAVE_LABEL, SP_CHECK_ITERATE_LABEL, SP_LOCAL_IDENT, SP_LOCAL_QUOTED_IDENT,
  ILLEGAL_TOKEN, DOT_CONTEXT, UNREACHABLE,
};

typedef struct { uint32_t lo, eq, hi; uint8_t ch, present; } SpTrieNode;
typedef struct { uint32_t parent, saved_decl_root; } SpScopeNode;
typedef struct { uint32_t parent, visible_label_root, key_offset; uint16_t key_len; uint8_t is_pending; } SpLabelFrame;

typedef struct {
  SpTrieNode *nodes;
  SpScopeNode *scopes;
  SpLabelFrame *label_frames;
  uint8_t *label_bytes;
  uint32_t node_len, node_cap, scope_len, scope_cap, label_frame_len, label_frame_cap, label_byte_len, label_byte_cap;
  uint32_t sp_decl_root, sp_pending_root, sp_scope_top, sp_label_frame_top;
  uint16_t signal_item_mask;
  bool in_version_comment;
} Scanner;

static const char *const MYSQL_SIGNAL_ITEMS[] = {
  "class_origin", "subclass_origin", "constraint_catalog", "constraint_schema", "constraint_name", "catalog_name",
  "schema_name", "table_name", "column_name", "cursor_name", "message_text", "mysql_errno",
};

static const char *const MYSQL_NONCONST_FUNCS[] = {
  "benchmark", "rand", "random_bytes", "sleep", "uuid", "uuid_short",
};

static const char *const MYSQL_RESERVED_WORDS[] = {
  "ACCESSIBLE", "ADD", "ALL", "ALTER", "ANALYZE", "AND", "AS", "ASC", "ASENSITIVE", "BEFORE", "BETWEEN", "BIGINT",
  "BINARY", "BLOB", "BOTH", "BY", "CALL", "CASCADE", "CASE", "CHANGE", "CHAR", "CHARACTER", "CHECK", "COLLATE",
  "COLUMN", "CONDITION", "CONSTRAINT", "CONTINUE", "CONVERT", "CREATE", "CROSS", "CUBE", "CUME_DIST", "CURRENT_DATE",
  "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "CURSOR", "DATABASE", "DATABASES", "DAY_HOUR",
  "DAY_MICROSECOND", "DAY_MINUTE", "DAY_SECOND", "DEC", "DECIMAL", "DECLARE", "DEFAULT", "DELAYED", "DELETE",
  "DENSE_RANK", "DESC", "DESCRIBE", "DETERMINISTIC", "DISTINCT", "DISTINCTROW", "DIV", "DOUBLE", "DROP", "DUAL",
  "EACH", "ELSE", "ELSEIF", "EMPTY", "ENCLOSED", "ESCAPED", "EXCEPT", "EXISTS", "EXIT", "EXPLAIN", "FALSE", "FETCH",
  "FIRST_VALUE", "FLOAT", "FLOAT4", "FLOAT8", "FOR", "FORCE", "FOREIGN", "FROM", "FULLTEXT", "FUNCTION", "GENERATED",
  "GET", "GRANT", "GROUP", "GROUPING", "GROUPS", "HAVING", "HIGH_PRIORITY", "HOUR_MICROSECOND", "HOUR_MINUTE",
  "HOUR_SECOND", "IF", "IGNORE", "IN", "INDEX", "INFILE", "INNER", "INOUT", "INSENSITIVE", "INSERT", "INT", "INT1",
  "INT2", "INT3", "INT4", "INT8", "INTEGER", "INTERSECT", "INTERVAL", "INTO", "IO_AFTER_GTIDS", "IO_BEFORE_GTIDS",
  "IS", "ITERATE", "JOIN", "JSON_TABLE", "KEY", "KEYS", "KILL", "LAG", "LAST_VALUE", "LATERAL", "LEAD", "LEADING",
  "LEAVE", "LEFT", "LIKE", "LIMIT", "LINEAR", "LINES", "LOAD", "LOCALTIME", "LOCALTIMESTAMP", "LOCK", "LONG",
  "LONGBLOB", "LONGTEXT", "LOOP", "LOW_PRIORITY", "MATCH", "MAXVALUE", "MEDIUMBLOB", "MEDIUMINT", "MEDIUMTEXT",
  "MIDDLEINT", "MINUTE_MICROSECOND", "MINUTE_SECOND", "MOD", "MODIFIES", "NATURAL", "NOT", "NO_WRITE_TO_BINLOG",
  "NTH_VALUE", "NTILE", "NULL", "NUMERIC", "OF", "ON", "OPTIMIZE", "OPTIMIZER_COSTS", "OPTION", "OPTIONALLY", "OR",
  "ORDER", "OUT", "OUTER", "OUTFILE", "OVER", "PARTITION", "PERCENT_RANK", "PRECISION", "PRIMARY", "PROCEDURE",
  "PURGE", "QUALIFY", "RANGE", "RANK", "READ", "READS", "READ_WRITE", "REAL", "RECURSIVE", "REFERENCES", "REGEXP",
  "RELEASE", "RENAME", "REPEAT", "REPLACE", "REQUIRE", "RESIGNAL", "RESTRICT", "RETURN", "REVOKE", "RIGHT", "RLIKE",
  "ROW", "ROWS", "ROW_NUMBER", "SCHEMA", "SCHEMAS", "SECOND_MICROSECOND", "SELECT", "SENSITIVE", "SEPARATOR", "SET",
  "SHOW", "SIGNAL", "SMALLINT", "SPATIAL", "SPECIFIC", "SQL", "SQLEXCEPTION", "SQLSTATE", "SQLWARNING",
  "SQL_BIG_RESULT", "SQL_CALC_FOUND_ROWS", "SQL_SMALL_RESULT", "SSL", "STARTING", "STORED", "STRAIGHT_JOIN", "SYSTEM",
  "TABLE", "TABLESAMPLE", "TERMINATED", "THEN", "TINYBLOB", "TINYINT", "TINYTEXT", "TO", "TRAILING", "TRIGGER",
  "TRUE", "UNDO", "UNION", "UNIQUE", "UNLOCK", "UNSIGNED", "UPDATE", "USAGE", "USE", "USING", "UTC_DATE", "UTC_TIME",
  "UTC_TIMESTAMP", "VALUES", "VARBINARY", "VARCHAR", "VARCHARACTER", "VARYING", "VIRTUAL", "WHEN", "WHERE", "WHILE",
  "WINDOW", "WITH", "WRITE", "XOR", "YEAR_MONTH", "ZEROFILL",
};

typedef struct { uint16_t start, end; int16_t arg; uint8_t mode; } CollationRange;

// MySQL 8.4 `utf8mb3_general_ci` sort-weight equivalence ranges (`mode 0`: constant weight, `1`: delta, `2`: even-offset delta).
static const CollationRange MYSQL_GENERAL_CI_RANGES[] = {
  {0x0061, 0x007A, -32, 1}, {0x00B5, 0x00B5, 0x039C, 0}, {0x00C0, 0x00C5, 0x0041, 0}, {0x00C7, 0x00C7, 0x0043, 0}, {0x00C8, 0x00CB, 0x0045, 0}, {0x00CC, 0x00CF, 0x0049, 0},
  {0x00D1, 0x00D2, -131, 1}, {0x00D3, 0x00D6, 0x004F, 0}, {0x00D9, 0x00DC, 0x0055, 0}, {0x00DD, 0x00DD, 0x0059, 0}, {0x00DF, 0x00DF, 0x0053, 0}, {0x00E0, 0x00E5, 0x0041, 0},
  {0x00E6, 0x00E6, 0x00C6, 0}, {0x00E7, 0x00E7, 0x0043, 0}, {0x00E8, 0x00EB, 0x0045, 0}, {0x00EC, 0x00EF, 0x0049, 0}, {0x00F0, 0x00F0, 0x00D0, 0}, {0x00F1, 0x00F2, -163, 1},
  {0x00F3, 0x00F6, 0x004F, 0}, {0x00F8, 0x00F8, 0x00D8, 0}, {0x00F9, 0x00FC, 0x0055, 0}, {0x00FD, 0x00FD, 0x0059, 0}, {0x00FE, 0x00FE, 0x00DE, 0}, {0x00FF, 0x00FF, 0x0059, 0},
  {0x0100, 0x0105, 0x0041, 0}, {0x0106, 0x010D, 0x0043, 0}, {0x010E, 0x010F, 0x0044, 0}, {0x0111, 0x0111, 0x0110, 0}, {0x0112, 0x011B, 0x0045, 0}, {0x011C, 0x0123, 0x0047, 0},
  {0x0124, 0x0125, 0x0048, 0}, {0x0127, 0x0127, 0x0126, 0}, {0x0128, 0x0131, 0x0049, 0}, {0x0133, 0x0133, 0x0132, 0}, {0x0134, 0x0135, 0x004A, 0}, {0x0136, 0x0137, 0x004B, 0},
  {0x0139, 0x013E, 0x004C, 0}, {0x0140, 0x0142, -1, 2}, {0x0143, 0x0148, 0x004E, 0}, {0x014B, 0x014B, 0x014A, 0}, {0x014C, 0x0151, 0x004F, 0}, {0x0153, 0x0153, 0x0152, 0},
  {0x0154, 0x0159, 0x0052, 0}, {0x015A, 0x0161, 0x0053, 0}, {0x0162, 0x0165, 0x0054, 0}, {0x0167, 0x0167, 0x0166, 0}, {0x0168, 0x0173, 0x0055, 0}, {0x0174, 0x0175, 0x0057, 0},
  {0x0176, 0x0178, 0x0059, 0}, {0x0179, 0x017E, 0x005A, 0}, {0x017F, 0x017F, 0x0053, 0}, {0x0183, 0x0185, -1, 2}, {0x0188, 0x0188, 0x0187, 0}, {0x018C, 0x018C, 0x018B, 0},
  {0x0192, 0x0192, 0x0191, 0}, {0x0195, 0x0195, 0x01F6, 0}, {0x0199, 0x0199, 0x0198, 0}, {0x01A0, 0x01A1, 0x004F, 0}, {0x01A3, 0x01A5, -1, 2}, {0x01A8, 0x01A8, 0x01A7, 0},
  {0x01AD, 0x01AD, 0x01AC, 0}, {0x01AF, 0x01B0, 0x0055, 0}, {0x01B4, 0x01B6, -1, 2}, {0x01B9, 0x01B9, 0x01B8, 0}, {0x01BD, 0x01BD, 0x01BC, 0}, {0x01BF, 0x01BF, 0x01F7, 0},
  {0x01C5, 0x01C6, 0x01C4, 0}, {0x01C8, 0x01C9, 0x01C7, 0}, {0x01CB, 0x01CC, 0x01CA, 0}, {0x01CD, 0x01CE, 0x0041, 0}, {0x01CF, 0x01D0, 0x0049, 0}, {0x01D1, 0x01D2, 0x004F, 0},
  {0x01D3, 0x01DC, 0x0055, 0}, {0x01DD, 0x01DD, 0x018E, 0}, {0x01DE, 0x01E1, 0x0041, 0}, {0x01E2, 0x01E3, 0x00C6, 0}, {0x01E5, 0x01E5, 0x01E4, 0}, {0x01E6, 0x01E7, 0x0047, 0},
  {0x01E8, 0x01E9, 0x004B, 0}, {0x01EA, 0x01ED, 0x004F, 0}, {0x01EE, 0x01EF, 0x01B7, 0}, {0x01F0, 0x01F0, 0x004A, 0}, {0x01F2, 0x01F3, 0x01F1, 0}, {0x01F4, 0x01F5, 0x0047, 0},
  {0x01F8, 0x01F9, 0x004E, 0}, {0x01FA, 0x01FB, 0x0041, 0}, {0x01FC, 0x01FD, 0x00C6, 0}, {0x01FE, 0x01FF, 0x00D8, 0}, {0x0200, 0x0203, 0x0041, 0}, {0x0204, 0x0207, 0x0045, 0},
  {0x0208, 0x020B, 0x0049, 0}, {0x020C, 0x020F, 0x004F, 0}, {0x0210, 0x0213, 0x0052, 0}, {0x0214, 0x0217, 0x0055, 0}, {0x0218, 0x0219, 0x0053, 0}, {0x021A, 0x021B, 0x0054, 0},
  {0x021D, 0x021D, 0x021C, 0}, {0x021E, 0x021F, 0x0048, 0}, {0x0223, 0x0225, -1, 2}, {0x0226, 0x0227, 0x0041, 0}, {0x0228, 0x0229, 0x0045, 0}, {0x022A, 0x0231, 0x004F, 0},
  {0x0232, 0x0233, 0x0059, 0}, {0x0253, 0x0253, 0x0181, 0}, {0x0254, 0x0254, 0x0186, 0}, {0x0256, 0x0257, -205, 1}, {0x0259, 0x0259, 0x018F, 0}, {0x025B, 0x025B, 0x0190, 0},
  {0x0260, 0x0260, 0x0193, 0}, {0x0263, 0x0263, 0x0194, 0}, {0x0268, 0x0268, 0x0197, 0}, {0x0269, 0x0269, 0x0196, 0}, {0x026F, 0x026F, 0x019C, 0}, {0x0272, 0x0272, 0x019D, 0},
  {0x0275, 0x0275, 0x019F, 0}, {0x0280, 0x0280, 0x01A6, 0}, {0x0283, 0x0283, 0x01A9, 0}, {0x0288, 0x0288, 0x01AE, 0}, {0x028A, 0x028B, -217, 1}, {0x0292, 0x0292, 0x01B7, 0},
  {0x0345, 0x0345, 0x0399, 0}, {0x0386, 0x0386, 0x0391, 0}, {0x0388, 0x0388, 0x0395, 0}, {0x0389, 0x0389, 0x0397, 0}, {0x038A, 0x038A, 0x0399, 0}, {0x038C, 0x038C, 0x039F, 0},
  {0x038E, 0x038E, 0x03A5, 0}, {0x038F, 0x038F, 0x03A9, 0}, {0x0390, 0x0390, 0x0399, 0}, {0x03AA, 0x03AA, 0x0399, 0}, {0x03AB, 0x03AB, 0x03A5, 0}, {0x03AC, 0x03AC, 0x0391, 0},
  {0x03AD, 0x03AD, 0x0395, 0}, {0x03AE, 0x03AE, 0x0397, 0}, {0x03AF, 0x03AF, 0x0399, 0}, {0x03B0, 0x03B0, 0x03A5, 0}, {0x03B1, 0x03C1, -32, 1}, {0x03C2, 0x03C3, 0x03A3, 0},
  {0x03C4, 0x03C9, -32, 1}, {0x03CA, 0x03CA, 0x0399, 0}, {0x03CB, 0x03CB, 0x03A5, 0}, {0x03CC, 0x03CC, 0x039F, 0}, {0x03CD, 0x03CD, 0x03A5, 0}, {0x03CE, 0x03CE, 0x03A9, 0},
  {0x03D0, 0x03D0, 0x0392, 0}, {0x03D1, 0x03D1, 0x0398, 0}, {0x03D3, 0x03D4, 0x03D2, 0}, {0x03D5, 0x03D5, 0x03A6, 0}, {0x03D6, 0x03D6, 0x03A0, 0}, {0x03DB, 0x03EF, -1, 2},
  {0x03F0, 0x03F0, 0x039A, 0}, {0x03F1, 0x03F1, 0x03A1, 0}, {0x03F2, 0x03F2, 0x03A3, 0}, {0x0400, 0x0401, 0x0415, 0}, {0x0403, 0x0403, 0x0413, 0}, {0x0407, 0x0407, 0x0406, 0},
  {0x040C, 0x040C, 0x041A, 0}, {0x040D, 0x040D, 0x0418, 0}, {0x040E, 0x040E, 0x0423, 0}, {0x0430, 0x044F, -32, 1}, {0x0450, 0x0451, 0x0415, 0}, {0x0452, 0x0452, 0x0402, 0},
  {0x0453, 0x0453, 0x0413, 0}, {0x0454, 0x0456, -80, 1}, {0x0457, 0x0457, 0x0406, 0}, {0x0458, 0x045B, -80, 1}, {0x045C, 0x045C, 0x041A, 0}, {0x045D, 0x045D, 0x0418, 0},
  {0x045E, 0x045E, 0x0423, 0}, {0x045F, 0x045F, 0x040F, 0}, {0x0461, 0x0475, -1, 2}, {0x0476, 0x0477, 0x0474, 0}, {0x0479, 0x0481, -1, 2}, {0x048D, 0x04BF, -1, 2},
  {0x04C1, 0x04C2, 0x0416, 0}, {0x04C4, 0x04C4, 0x04C3, 0}, {0x04C8, 0x04C8, 0x04C7, 0}, {0x04CC, 0x04CC, 0x04CB, 0}, {0x04D0, 0x04D3, 0x0410, 0}, {0x04D5, 0x04D5, 0x04D4, 0},
  {0x04D6, 0x04D7, 0x0415, 0}, {0x04D9, 0x04DB, 0x04D8, 0}, {0x04DC, 0x04DD, 0x0416, 0}, {0x04DE, 0x04DF, 0x0417, 0}, {0x04E1, 0x04E1, 0x04E0, 0}, {0x04E2, 0x04E5, 0x0418, 0},
  {0x04E6, 0x04E7, 0x041E, 0}, {0x04E9, 0x04EB, 0x04E8, 0}, {0x04EC, 0x04ED, 0x042D, 0}, {0x04EE, 0x04F3, 0x0423, 0}, {0x04F4, 0x04F5, 0x0427, 0}, {0x04F8, 0x04F9, 0x042B, 0},
  {0x0561, 0x0586, -48, 1}, {0x1E00, 0x1E01, 0x0041, 0}, {0x1E02, 0x1E07, 0x0042, 0}, {0x1E08, 0x1E09, 0x0043, 0}, {0x1E0A, 0x1E13, 0x0044, 0}, {0x1E14, 0x1E1D, 0x0045, 0},
  {0x1E1E, 0x1E1F, 0x0046, 0}, {0x1E20, 0x1E21, 0x0047, 0}, {0x1E22, 0x1E2B, 0x0048, 0}, {0x1E2C, 0x1E2F, 0x0049, 0}, {0x1E30, 0x1E35, 0x004B, 0}, {0x1E36, 0x1E3D, 0x004C, 0},
  {0x1E3E, 0x1E43, 0x004D, 0}, {0x1E44, 0x1E4B, 0x004E, 0}, {0x1E4C, 0x1E53, 0x004F, 0}, {0x1E54, 0x1E57, 0x0050, 0}, {0x1E58, 0x1E5F, 0x0052, 0}, {0x1E60, 0x1E69, 0x0053, 0},
  {0x1E6A, 0x1E71, 0x0054, 0}, {0x1E72, 0x1E7B, 0x0055, 0}, {0x1E7C, 0x1E7F, 0x0056, 0}, {0x1E80, 0x1E89, 0x0057, 0}, {0x1E8A, 0x1E8D, 0x0058, 0}, {0x1E8E, 0x1E8F, 0x0059, 0},
  {0x1E90, 0x1E95, 0x005A, 0}, {0x1E96, 0x1E96, 0x0048, 0}, {0x1E97, 0x1E97, 0x0054, 0}, {0x1E98, 0x1E98, 0x0057, 0}, {0x1E99, 0x1E99, 0x0059, 0}, {0x1E9B, 0x1E9B, 0x0053, 0},
  {0x1EA0, 0x1EB7, 0x0041, 0}, {0x1EB8, 0x1EC7, 0x0045, 0}, {0x1EC8, 0x1ECB, 0x0049, 0}, {0x1ECC, 0x1EE3, 0x004F, 0}, {0x1EE4, 0x1EF1, 0x0055, 0}, {0x1EF2, 0x1EF9, 0x0059, 0},
  {0x1F00, 0x1F0F, 0x0391, 0}, {0x1F10, 0x1F15, 0x0395, 0}, {0x1F18, 0x1F1D, 0x0395, 0}, {0x1F20, 0x1F2F, 0x0397, 0}, {0x1F30, 0x1F3F, 0x0399, 0}, {0x1F40, 0x1F45, 0x039F, 0},
  {0x1F48, 0x1F4D, 0x039F, 0}, {0x1F50, 0x1F57, 0x03A5, 0}, {0x1F59, 0x1F59, 0x03A5, 0}, {0x1F5B, 0x1F5B, 0x03A5, 0}, {0x1F5D, 0x1F5D, 0x03A5, 0}, {0x1F5F, 0x1F5F, 0x03A5, 0},
  {0x1F60, 0x1F6F, 0x03A9, 0}, {0x1F70, 0x1F70, 0x0391, 0}, {0x1F71, 0x1F71, 0x1FBB, 0}, {0x1F72, 0x1F72, 0x0395, 0}, {0x1F73, 0x1F73, 0x1FC9, 0}, {0x1F74, 0x1F74, 0x0397, 0},
  {0x1F75, 0x1F75, 0x1FCB, 0}, {0x1F76, 0x1F76, 0x0399, 0}, {0x1F77, 0x1F77, 0x1FDB, 0}, {0x1F78, 0x1F78, 0x039F, 0}, {0x1F79, 0x1F79, 0x1FF9, 0}, {0x1F7A, 0x1F7A, 0x03A5, 0},
  {0x1F7B, 0x1F7B, 0x1FEB, 0}, {0x1F7C, 0x1F7C, 0x03A9, 0}, {0x1F7D, 0x1F7D, 0x1FFB, 0}, {0x1F80, 0x1F8F, 0x0391, 0}, {0x1F90, 0x1F9F, 0x0397, 0}, {0x1FA0, 0x1FAF, 0x03A9, 0},
  {0x1FB0, 0x1FB4, 0x0391, 0}, {0x1FB6, 0x1FBA, 0x0391, 0}, {0x1FBC, 0x1FBC, 0x0391, 0}, {0x1FBE, 0x1FBE, 0x0399, 0}, {0x1FC2, 0x1FC4, 0x0397, 0}, {0x1FC6, 0x1FC7, 0x0397, 0},
  {0x1FC8, 0x1FCA, -7219, 2}, {0x1FCC, 0x1FCC, 0x0397, 0}, {0x1FD0, 0x1FD2, 0x0399, 0}, {0x1FD6, 0x1FDA, 0x0399, 0}, {0x1FE0, 0x1FE2, 0x03A5, 0}, {0x1FE4, 0x1FE5, 0x03A1, 0},
  {0x1FE6, 0x1FEA, 0x03A5, 0}, {0x1FEC, 0x1FEC, 0x03A1, 0}, {0x1FF2, 0x1FF4, 0x03A9, 0}, {0x1FF6, 0x1FF7, 0x03A9, 0}, {0x1FF8, 0x1FF8, 0x039F, 0}, {0x1FFA, 0x1FFA, 0x03A9, 0},
  {0x1FFC, 0x1FFC, 0x03A9, 0}, {0x2170, 0x217F, -16, 1}, {0x24D0, 0x24E9, -26, 1}, {0xFF41, 0xFF5A, -32, 1},
};

// MySQL 8.4 `my_unicase_default` (`my_strcasecmp_utf8mb3`) lowercase folding used for routine labels.
static const CollationRange MYSQL_UTF8MB3_TOLOWER_RANGES[] = {
  {0x0041, 0x005A, 32, 1}, {0x00C0, 0x00D6, 32, 1}, {0x00D8, 0x00DE, 32, 1}, {0x0100, 0x012E, 1, 2}, {0x0130, 0x0130, 0x0069, 0}, {0x0132, 0x0136, 1, 2},
  {0x0139, 0x0147, 1, 2}, {0x014A, 0x0176, 1, 2}, {0x0178, 0x0178, 0x00FF, 0}, {0x0179, 0x017D, 1, 2}, {0x0181, 0x0181, 0x0253, 0}, {0x0182, 0x0184, 1, 2},
  {0x0186, 0x0186, 0x0254, 0}, {0x0187, 0x0187, 0x0188, 0}, {0x0189, 0x018A, 205, 1}, {0x018B, 0x018B, 0x018C, 0}, {0x018E, 0x018E, 0x01DD, 0}, {0x018F, 0x018F, 0x0259, 0},
  {0x0190, 0x0190, 0x025B, 0}, {0x0191, 0x0191, 0x0192, 0}, {0x0193, 0x0193, 0x0260, 0}, {0x0194, 0x0194, 0x0263, 0}, {0x0196, 0x0196, 0x0269, 0}, {0x0197, 0x0197, 0x0268, 0},
  {0x0198, 0x0198, 0x0199, 0}, {0x019C, 0x019C, 0x026F, 0}, {0x019D, 0x019D, 0x0272, 0}, {0x019F, 0x019F, 0x0275, 0}, {0x01A0, 0x01A4, 1, 2}, {0x01A6, 0x01A6, 0x0280, 0},
  {0x01A7, 0x01A7, 0x01A8, 0}, {0x01A9, 0x01A9, 0x0283, 0}, {0x01AC, 0x01AC, 0x01AD, 0}, {0x01AE, 0x01AE, 0x0288, 0}, {0x01AF, 0x01AF, 0x01B0, 0}, {0x01B1, 0x01B2, 217, 1},
  {0x01B3, 0x01B5, 1, 2}, {0x01B7, 0x01B7, 0x0292, 0}, {0x01B8, 0x01B8, 0x01B9, 0}, {0x01BC, 0x01BC, 0x01BD, 0}, {0x01C4, 0x01C4, 0x01C6, 0}, {0x01C5, 0x01C5, 0x01C6, 0},
  {0x01C7, 0x01C7, 0x01C9, 0}, {0x01C8, 0x01C8, 0x01C9, 0}, {0x01CA, 0x01CA, 0x01CC, 0}, {0x01CB, 0x01DB, 1, 2}, {0x01DE, 0x01EE, 1, 2}, {0x01F1, 0x01F1, 0x01F3, 0},
  {0x01F2, 0x01F4, 1, 2}, {0x01F6, 0x01F6, 0x0195, 0}, {0x01F7, 0x01F7, 0x01BF, 0}, {0x01F8, 0x021E, 1, 2}, {0x0222, 0x0232, 1, 2}, {0x0386, 0x0386, 0x03AC, 0},
  {0x0388, 0x038A, 37, 1}, {0x038C, 0x038C, 0x03CC, 0}, {0x038E, 0x038F, 63, 1}, {0x0391, 0x03A1, 32, 1}, {0x03A3, 0x03AB, 32, 1}, {0x03DA, 0x03EE, 1, 2},
  {0x0400, 0x040F, 80, 1}, {0x0410, 0x042F, 32, 1}, {0x0460, 0x0480, 1, 2}, {0x048C, 0x04BE, 1, 2}, {0x04C1, 0x04C3, 1, 2}, {0x04C7, 0x04C7, 0x04C8, 0},
  {0x04CB, 0x04CB, 0x04CC, 0}, {0x04D0, 0x04F4, 1, 2}, {0x04F8, 0x04F8, 0x04F9, 0}, {0x0531, 0x0556, 48, 1}, {0x1E00, 0x1E94, 1, 2}, {0x1EA0, 0x1EF8, 1, 2},
  {0x1F08, 0x1F0F, -8, 1}, {0x1F18, 0x1F1D, -8, 1}, {0x1F28, 0x1F2F, -8, 1}, {0x1F38, 0x1F3F, -8, 1}, {0x1F48, 0x1F4D, -8, 1}, {0x1F59, 0x1F5F, -8, 2},
  {0x1F68, 0x1F6F, -8, 1}, {0x1F88, 0x1F8F, -8, 1}, {0x1F98, 0x1F9F, -8, 1}, {0x1FA8, 0x1FAF, -8, 1}, {0x1FB8, 0x1FB9, -8, 1}, {0x1FBA, 0x1FBB, -74, 1},
  {0x1FBC, 0x1FBC, 0x1FB3, 0}, {0x1FC8, 0x1FCB, -86, 1}, {0x1FCC, 0x1FCC, 0x1FC3, 0}, {0x1FD8, 0x1FD9, -8, 1}, {0x1FDA, 0x1FDB, -100, 1}, {0x1FE8, 0x1FE9, -8, 1},
  {0x1FEA, 0x1FEB, -112, 1}, {0x1FEC, 0x1FEC, 0x1FE5, 0}, {0x1FF8, 0x1FF9, -128, 1}, {0x1FFA, 0x1FFB, -126, 1}, {0x1FFC, 0x1FFC, 0x1FF3, 0}, {0x2126, 0x2126, 0x03C9, 0},
  {0x212A, 0x212A, 0x006B, 0}, {0x212B, 0x212B, 0x00E5, 0}, {0x2160, 0x216F, 16, 1}, {0x24B6, 0x24CF, 26, 1}, {0xFF21, 0xFF3A, 32, 1},
};

static const char *const MYSQL_RESTRICTED_LABEL_WORDS[] = {
  "ASCII", "BEGIN", "BYTE", "CACHE", "CHARSET", "CHECKSUM", "CLONE", "COMMENT", "COMMIT", "CONTAINS", "DEALLOCATE",
  "DO", "END", "EXECUTE", "FLUSH", "FOLLOWS", "HANDLER", "HELP", "IMPORT", "INSTALL", "LANGUAGE", "NO", "PRECEDES",
  "PREPARE", "REPAIR", "RESET", "RESTART", "ROLLBACK", "SAVEPOINT", "SHUTDOWN", "SIGNED", "SLAVE", "START", "STOP",
  "TRUNCATE", "UNICODE", "UNINSTALL", "XA",
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
  while (!at_eof(lexer) && lexer->lookahead != '\n') {
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

static VersionGuard check_sixth_version_digit(TSLexer *lexer, uint32_t *ver, bool mark_header) {
  if (!is_digit(lexer->lookahead)) return *ver > 80499 ? GUARD_INACTIVE : GUARD_EMPTY_CHECK;
  uint32_t d6 = (uint32_t)(lexer->lookahead - '0');
  advance(lexer);
  if (is_space(lexer->lookahead)) {
    *ver = *ver * 10 + d6;
    if (mark_header) lexer->mark_end(lexer);
    return *ver > 80499 ? GUARD_INACTIVE : GUARD_EMPTY_CHECK;
  }
  return *ver > 80499 ? GUARD_INACTIVE : GUARD_ACTIVE_BODY;
}

static VersionGuard parse_version_guard(TSLexer *lexer, bool mark_header) {
  unsigned digits = 0;
  uint32_t ver = 0;
  while (digits < 5 && is_digit(lexer->lookahead)) {
    ver = ver * 10 + (uint32_t)(lexer->lookahead - '0');
    advance(lexer);
    digits++;
  }
  if (digits == 0) return GUARD_EMPTY_CHECK;
  if (digits < 5) return GUARD_ACTIVE_BODY;
  if (mark_header) lexer->mark_end(lexer);
  return check_sixth_version_digit(lexer, &ver, mark_header);
}

static bool scan_version_comment_open(Scanner *scanner, TSLexer *lexer, enum TokenType ok_symbol) {
  lexer->mark_end(lexer);
  VersionGuard guard = parse_version_guard(lexer, true);
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

static uint16_t apply_collation_range(const CollationRange *r, uint16_t cp) {
  if (r->mode == 0) return (uint16_t)r->arg;
  if (r->mode == 1) return (uint16_t)((int32_t)cp + r->arg);
  return (((cp - r->start) & 1u) == 0) ? (uint16_t)((int32_t)cp + r->arg) : cp;
}

static uint16_t lookup_collation_cp(const CollationRange *ranges, unsigned count, int32_t raw_cp) {
  if ((uint32_t)raw_cp > 0xFFFF) return 0xFFFD;
  uint16_t cp = (uint16_t)raw_cp;
  for (unsigned base = 0; count > 0; count /= 2) {
    const CollationRange *r = &ranges[base + count / 2];
    if (cp >= r->start && cp <= r->end) return apply_collation_range(r, cp);
    if (cp > r->end) {
      base += count / 2 + 1;
      count--;
    }
  }
  return cp;
}

static uint16_t mysql_general_ci_weight(int32_t raw_cp) {
  return lookup_collation_cp(MYSQL_GENERAL_CI_RANGES, sizeof MYSQL_GENERAL_CI_RANGES / sizeof *MYSQL_GENERAL_CI_RANGES, raw_cp);
}

static uint16_t mysql_utf8mb3_tolower(int32_t raw_cp) {
  return lookup_collation_cp(
    MYSQL_UTF8MB3_TOLOWER_RANGES, sizeof MYSQL_UTF8MB3_TOLOWER_RANGES / sizeof *MYSQL_UTF8MB3_TOLOWER_RANGES, raw_cp
  );
}

static bool is_restricted_label_word(const char *upper) {
  for (unsigned lo = 0, hi = sizeof MYSQL_RESTRICTED_LABEL_WORDS / sizeof *MYSQL_RESTRICTED_LABEL_WORDS; lo < hi;) {
    unsigned mid = lo + (hi - lo) / 2;
    int cmp = strcmp(upper, MYSQL_RESTRICTED_LABEL_WORDS[mid]);
    if (cmp == 0) return true;
    if (cmp < 0) hi = mid;
    else lo = mid + 1;
  }
  return false;
}

static bool is_restricted_lvalue_word(const char *upper) {
  return strcmp(upper, "GLOBAL") == 0 || strcmp(upper, "LOCAL") == 0 || strcmp(upper, "PERSIST") == 0 ||
         strcmp(upper, "PERSIST_ONLY") == 0 || strcmp(upper, "SESSION") == 0;
}

typedef struct {
  uint8_t bytes[512];
  char ascii_upper[32];
  uint32_t byte_len;
  uint32_t char_len;
  bool all_ascii;
  bool has_supplementary;
} FoldedIdent;

static void folded_init(FoldedIdent *id) {
  id->byte_len = 0;
  id->char_len = 0;
  id->all_ascii = true;
  id->has_supplementary = false;
  id->ascii_upper[0] = 0;
}

static void folded_push_byte(FoldedIdent *id, uint8_t b) {
  if (id->byte_len < sizeof id->bytes) id->bytes[id->byte_len++] = b;
}

static void folded_push_mapped_cp(FoldedIdent *id, int32_t raw_cp, uint16_t cp) {
  if (raw_cp >= 0x80) id->all_ascii = false;
  if (raw_cp > 0xFFFF) id->has_supplementary = true;
  if (id->char_len + 1 < sizeof id->ascii_upper) {
    char up = (raw_cp >= 'a' && raw_cp <= 'z') ? (char)(raw_cp - 'a' + 'A') : (raw_cp < 0x80 ? (char)raw_cp : '?');
    id->ascii_upper[id->char_len] = up;
    id->ascii_upper[id->char_len + 1] = 0;
  }
  id->char_len++;
  if (cp < 0x80) {
    folded_push_byte(id, (uint8_t)cp);
  } else if (cp < 0x800) {
    folded_push_byte(id, (uint8_t)(0xC0 | (cp >> 6)));
    folded_push_byte(id, (uint8_t)(0x80 | (cp & 0x3F)));
  } else {
    folded_push_byte(id, (uint8_t)(0xE0 | (cp >> 12)));
    folded_push_byte(id, (uint8_t)(0x80 | ((cp >> 6) & 0x3F)));
    folded_push_byte(id, (uint8_t)(0x80 | (cp & 0x3F)));
  }
}

static void folded_push_cp(FoldedIdent *id, int32_t raw_cp) {
  folded_push_mapped_cp(id, raw_cp, mysql_general_ci_weight(raw_cp));
}

static void folded_push_label_cp(FoldedIdent *id, int32_t raw_cp) {
  folded_push_mapped_cp(id, raw_cp, mysql_utf8mb3_tolower(raw_cp));
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

static uint8_t sp_trie_lookup(const Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  for (uint32_t cur = root, i = 0; cur != 0 && i < len;) {
    const SpTrieNode *n = &s->nodes[cur];
    if (key[i] != n->ch) cur = key[i] < n->ch ? n->lo : n->hi;
    else if (++i == len) return n->present;
    else cur = n->eq;
  }
  return 0;
}

static bool sp_trie_contains(const Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  return sp_trie_lookup(s, root, key, len) != 0;
}

static uint32_t sp_trie_insert_rec(Scanner *s, uint32_t cur, const uint8_t *key, uint32_t len, uint8_t val) {
  SpTrieNode copy = cur != 0 ? s->nodes[cur] : (SpTrieNode){0, 0, 0, key[0], 0};
  if (key[0] < copy.ch) copy.lo = sp_trie_insert_rec(s, copy.lo, key, len, val);
  else if (key[0] > copy.ch) copy.hi = sp_trie_insert_rec(s, copy.hi, key, len, val);
  else if (len == 1) copy.present = val;
  else copy.eq = sp_trie_insert_rec(s, copy.eq, key + 1, len - 1, val);
  return push_sp_trie_node(s, copy);
}

static uint32_t sp_trie_insert_val(Scanner *s, uint32_t root, const uint8_t *key, uint32_t len, uint8_t val) {
  if (len == 0 || sp_trie_lookup(s, root, key, len) == val) return root;
  return sp_trie_insert_rec(s, root, key, len, val);
}

static uint32_t sp_trie_insert(Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  return sp_trie_insert_val(s, root, key, len, 1);
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

static uint32_t append_label_key_bytes(Scanner *s, const uint8_t *bytes, uint16_t len) {
  if (s->label_byte_cap == 0) {
    s->label_byte_cap = 256;
    s->label_bytes = (uint8_t *)ts_calloc(s->label_byte_cap, 1);
  }
  while (s->label_byte_len + len > s->label_byte_cap) {
    s->label_byte_cap *= 2;
    s->label_bytes = (uint8_t *)ts_realloc(s->label_bytes, s->label_byte_cap);
  }
  uint32_t off = s->label_byte_len;
  if (len > 0) memcpy(s->label_bytes + off, bytes, len);
  s->label_byte_len += len;
  return off;
}

static uint32_t push_sp_label_frame(Scanner *s, SpLabelFrame frame) {
  if (s->label_frame_len == 0) {
    s->label_frame_cap = 16;
    s->label_frames = (SpLabelFrame *)ts_calloc(s->label_frame_cap, sizeof(SpLabelFrame));
    s->label_frame_len = 1;
  } else if (s->label_frame_len >= s->label_frame_cap) {
    s->label_frame_cap *= 2;
    s->label_frames = (SpLabelFrame *)ts_realloc(s->label_frames, s->label_frame_cap * sizeof(SpLabelFrame));
  }
  uint32_t idx = s->label_frame_len++;
  s->label_frames[idx] = frame;
  return idx;
}

static uint32_t current_visible_label_root(const Scanner *s) {
  return s->sp_label_frame_top == 0 ? 0 : s->label_frames[s->sp_label_frame_top].visible_label_root;
}

static void activate_sp_label_frame(Scanner *s, uint8_t kind) {
  uint32_t vis = current_visible_label_root(s);
  if (s->sp_label_frame_top != 0 && s->label_frames[s->sp_label_frame_top].is_pending) {
    SpLabelFrame cur = s->label_frames[s->sp_label_frame_top];
    vis = sp_trie_insert_val(s, cur.visible_label_root, s->label_bytes + cur.key_offset, cur.key_len, kind);
    s->sp_label_frame_top = push_sp_label_frame(s, (SpLabelFrame){cur.parent, vis, cur.key_offset, cur.key_len, 0});
    return;
  }
  s->sp_label_frame_top = push_sp_label_frame(s, (SpLabelFrame){s->sp_label_frame_top, vis, 0, 0, 0});
}

static void pop_sp_label_frame(Scanner *s) {
  if (s->sp_label_frame_top != 0) s->sp_label_frame_top = s->label_frames[s->sp_label_frame_top].parent;
}

static void reset_sp_state(Scanner *s) {
  s->sp_decl_root = 0;
  s->sp_pending_root = 0;
  s->sp_scope_top = 0;
  s->sp_label_frame_top = 0;
}

static void skip_peek_line_comment(TSLexer *lexer) {
  while (!at_eof(lexer) && lexer->lookahead != '\n') advance(lexer);
}

static void skip_peek_block_comment(TSLexer *lexer, bool allow_nested) {
  bool star = false;
  unsigned depth = 1;
  while (!at_eof(lexer)) {
    if (step_comment_char(lexer, allow_nested, &star, &depth)) return;
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

static bool skip_peek_version_guard(TSLexer *lexer, bool *in_ver, int32_t *out) {
  VersionGuard guard = parse_version_guard(lexer, false);
  if (guard == GUARD_INACTIVE) return skip_peek_block_comment(lexer, true), true;
  if (guard == GUARD_EMPTY_CHECK) {
    while (is_space(lexer->lookahead)) advance(lexer);
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead != '/') return (*out = '*'), false;
      return advance(lexer), true;
    }
  }
  *in_ver = true;
  return true;
}

static bool try_skip_peek_slash_comment(TSLexer *lexer, bool *in_ver, int32_t *out) {
  advance(lexer);
  if (lexer->lookahead != '*') return (*out = '/'), false;
  advance(lexer);
  if (!*in_ver && lexer->lookahead == '!') {
    advance(lexer);
    return skip_peek_version_guard(lexer, in_ver, out);
  }
  skip_peek_block_comment(lexer, false);
  return true;
}

static bool step_peek_comment(TSLexer *lexer, bool *in_ver, int32_t *out) {
  int32_t c = lexer->lookahead;
  if (c == '#') return skip_peek_line_comment(lexer), true;
  if (c == '-') return try_skip_peek_dash_comment(lexer) || ((*out = '-'), false);
  if (c == '/') return try_skip_peek_slash_comment(lexer, in_ver, out);
  if (*in_ver && c == '*') {
    advance(lexer);
    if (lexer->lookahead != '/') return (*out = '*'), false;
    *in_ver = false;
    return advance(lexer), true;
  }
  *out = c;
  return false;
}

static int32_t peek_next_non_comment_char(const Scanner *scanner, TSLexer *lexer) {
  bool in_ver = scanner->in_version_comment;
  int32_t out = 0;
  for (;;) {
    while (is_space(lexer->lookahead)) advance(lexer);
    if (!step_peek_comment(lexer, &in_ver, &out)) return out;
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
  if (has_nul || (!allow_empty && folded.char_len == 0) || (!is_user_var && folded.has_supplementary)) {
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

static bool scan_bare_ident_for_supplementary(TSLexer *lexer, int32_t first) {
  bool has_sup = first > 0xFFFF;
  while (is_identifier_char(lexer->lookahead)) {
    if (lexer->lookahead > 0xFFFF) has_sup = true;
    advance(lexer);
  }
  return has_sup && emit(lexer, ILLEGAL_TOKEN);
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
  if (folded.has_supplementary) return emit(lexer, ILLEGAL_TOKEN);
  charset[length < sizeof charset ? length : sizeof charset - 1] = 0;
  if (charset_ok && length > 0 && length < sizeof charset && is_mysql_charset(charset)) {
    enum TokenType sym = strcmp(charset, "binary") == 0 ? BINARY_CHARSET_INTRODUCER : CHARSET_INTRODUCER;
    return emit(lexer, valid_symbols[sym] ? sym : ILLEGAL_TOKEN);
  }
  return valid_symbols[SP_LOCAL_IDENT] && scanner->sp_decl_root != 0 &&
         emit_sp_local_if_declared(scanner, lexer, &folded);
}

typedef struct {
  char ascii_upper[32];
  unsigned char_len;
  bool valid, quoted, string_lit, all_ascii;
} SysVarSeg;

static bool is_prefixed_literal_letter(int32_t c) {
  return c == 'n' || c == 'N' || c == 'x' || c == 'X' || c == 'b' || c == 'B';
}

static int32_t decode_mysql_escape_char(int32_t e, bool *valid_sqlstate) {
  if (e == '0') return 0;
  if (e == 'b') return '\b';
  if (e == 'n') return '\n';
  if (e == 'r') return '\r';
  if (e == 't') return '\t';
  if (e == 'Z') return 0x1A;
  if (e == '%' || e == '_') *valid_sqlstate = false;
  return e;
}

static void sysvar_push_char(SysVarSeg *seg, int32_t c) {
  if (c >= 0x80) seg->all_ascii = false;
  if (seg->char_len + 1 < sizeof seg->ascii_upper) {
    seg->ascii_upper[seg->char_len] = (c >= 'a' && c <= 'z') ? (char)(c - 'a' + 'A') : (c < 0x80 ? (char)c : '?');
  }
  seg->char_len++;
}

static bool finalize_sysvar_seg(SysVarSeg *seg, bool ok) {
  seg->ascii_upper[seg->char_len < sizeof seg->ascii_upper ? seg->char_len : sizeof seg->ascii_upper - 1] = 0;
  seg->valid = ok && seg->char_len > 0;
  return seg->valid;
}

static bool read_sysvar_backtick(TSLexer *lexer, SysVarSeg *seg) {
  advance(lexer);
  seg->quoted = true;
  bool has_sup = false;
  while (!at_eof(lexer) && lexer->lookahead != 0) {
    int32_t c = lexer->lookahead;
    has_sup = has_sup || c > 0xFFFF;
    advance(lexer);
    if (c == '`' && lexer->lookahead != '`') return finalize_sysvar_seg(seg, !has_sup);
    if (c == '`') advance(lexer);
    sysvar_push_char(seg, c);
  }
  return false;
}

static bool read_sysvar_string(TSLexer *lexer, int32_t quote, SysVarSeg *seg) {
  advance(lexer);
  seg->string_lit = true;
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == '\\') {
      if (at_eof(lexer)) return false;
      bool dummy = true;
      c = decode_mysql_escape_char(lexer->lookahead, &dummy);
      advance(lexer);
    } else if (c == quote) {
      if (lexer->lookahead != quote) return finalize_sysvar_seg(seg, true);
      advance(lexer);
    }
    sysvar_push_char(seg, c);
  }
  return false;
}

static bool read_sysvar_unquoted(TSLexer *lexer, bool reject_prefix_quote, SysVarSeg *seg) {
  if (!is_identifier_char(lexer->lookahead)) return false;
  int32_t first = lexer->lookahead;
  bool has_non_digit = !is_digit(first);
  bool has_sup = first > 0xFFFF;
  advance(lexer);
  if (reject_prefix_quote && lexer->lookahead == '\'' && is_prefixed_literal_letter(first)) return false;
  sysvar_push_char(seg, first);
  while (is_identifier_char(lexer->lookahead)) {
    int32_t c = lexer->lookahead;
    has_non_digit = has_non_digit || !is_digit(c);
    has_sup = has_sup || c > 0xFFFF;
    advance(lexer);
    sysvar_push_char(seg, c);
  }
  return finalize_sysvar_seg(seg, has_non_digit && !has_sup);
}

static bool read_sysvar_segment(TSLexer *lexer, bool allow_string, bool reject_prefix_quote, SysVarSeg *seg) {
  *seg = (SysVarSeg){{0}, 0, false, false, false, true};
  if (lexer->lookahead == '`') return read_sysvar_backtick(lexer, seg);
  if (allow_string && (lexer->lookahead == '\'' || lexer->lookahead == '"')) {
    return read_sysvar_string(lexer, lexer->lookahead, seg);
  }
  return read_sysvar_unquoted(lexer, reject_prefix_quote, seg);
}

static bool reject_sysvar_tail(TSLexer *lexer) {
  while (!at_eof(lexer) && (lexer->lookahead == '`' || is_identifier_char(lexer->lookahead))) advance(lexer);
  return emit(lexer, ILLEGAL_TOKEN);
}

static bool sysvar_seg_is_reserved(const SysVarSeg *seg) {
  return seg->all_ascii && seg->char_len < sizeof seg->ascii_upper && is_mysql_reserved_word(seg->ascii_upper);
}

static bool sysvar_seg_is_scope_reserved(const SysVarSeg *seg) {
  return seg->all_ascii && seg->char_len < sizeof seg->ascii_upper &&
         (strcmp(seg->ascii_upper, "GLOBAL") == 0 || strcmp(seg->ascii_upper, "LOCAL") == 0 ||
          strcmp(seg->ascii_upper, "SESSION") == 0);
}

static bool sysvar_seg_is_lvalue_restricted(const SysVarSeg *seg) {
  return seg->all_ascii && seg->char_len < sizeof seg->ascii_upper && is_restricted_lvalue_word(seg->ascii_upper);
}

static bool sysvar_seg_is_bare_word(const SysVarSeg *seg, const char *word) {
  return !seg->quoted && !seg->string_lit && seg->all_ascii && strcmp(seg->ascii_upper, word) == 0;
}

static enum TokenType match_sysvar_scope_head(const bool *valid_symbols, const SysVarSeg *seg) {
  if (sysvar_seg_is_bare_word(seg, "GLOBAL") || sysvar_seg_is_bare_word(seg, "SESSION") ||
      sysvar_seg_is_bare_word(seg, "LOCAL")) {
    return valid_symbols[SYS_VAR_READ_SCOPE] ? SYS_VAR_READ_SCOPE : ILLEGAL_TOKEN;
  }
  if (sysvar_seg_is_bare_word(seg, "PERSIST") || sysvar_seg_is_bare_word(seg, "PERSIST_ONLY")) {
    return valid_symbols[SYS_VAR_PERSIST_SCOPE] ? SYS_VAR_PERSIST_SCOPE : ILLEGAL_TOKEN;
  }
  return UNREACHABLE;
}

static enum TokenType classify_sysvar_head(
  const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, const SysVarSeg *seg
) {
  bool has_dot = peek_next_non_comment_char(scanner, lexer) == '.';
  if (has_dot) {
    enum TokenType scope_sym = match_sysvar_scope_head(valid_symbols, seg);
    if (scope_sym != UNREACHABLE) return scope_sym;
    if (sysvar_seg_is_scope_reserved(seg)) return ILLEGAL_TOKEN;
  }
  bool allow_def = has_dot && valid_symbols[SYS_VAR_LVALUE_HEAD] && sysvar_seg_is_bare_word(seg, "DEFAULT");
  if (!allow_def && !seg->quoted && !seg->string_lit && sysvar_seg_is_reserved(seg)) return ILLEGAL_TOKEN;
  if (!valid_symbols[SYS_VAR_LVALUE_HEAD]) return valid_symbols[SYS_VAR_RVALUE_HEAD] ? SYS_VAR_RVALUE_HEAD : ILLEGAL_TOKEN;
  bool lval_ok = !seg->string_lit && (seg->quoted || !sysvar_seg_is_lvalue_restricted(seg));
  return lval_ok ? SYS_VAR_LVALUE_HEAD : ILLEGAL_TOKEN;
}

static bool scan_system_variable_head(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  bool any_valid = valid_symbols[SYS_VAR_READ_SCOPE] || valid_symbols[SYS_VAR_PERSIST_SCOPE] ||
                   valid_symbols[SYS_VAR_RVALUE_HEAD] || valid_symbols[SYS_VAR_LVALUE_HEAD];
  SysVarSeg seg;
  if (!read_sysvar_segment(lexer, valid_symbols[SYS_VAR_RVALUE_HEAD], false, &seg)) return reject_sysvar_tail(lexer);
  lexer->mark_end(lexer);
  lexer->result_symbol = any_valid ? classify_sysvar_head(scanner, lexer, valid_symbols, &seg) : ILLEGAL_TOKEN;
  return true;
}

static enum TokenType classify_sysvar_prefix_seg(const bool *valid_symbols, const SysVarSeg *seg) {
  bool is_lval = valid_symbols[SYS_VAR_LVALUE_SEGMENT];
  if (is_lval && sysvar_seg_is_bare_word(seg, "DEFAULT")) return SYS_VAR_PREFIX_SEGMENT;
  bool unquoted_res = !seg->quoted && !seg->string_lit && sysvar_seg_is_reserved(seg);
  bool ok = !sysvar_seg_is_scope_reserved(seg) && !unquoted_res &&
            (!is_lval || (!seg->string_lit && (seg->quoted || !sysvar_seg_is_lvalue_restricted(seg))));
  return ok ? SYS_VAR_PREFIX_SEGMENT : ILLEGAL_TOKEN;
}

static bool scan_sysvar_dot_segment(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  bool is_lval = valid_symbols[SYS_VAR_LVALUE_SEGMENT];
  SysVarSeg seg;
  if (!read_sysvar_segment(lexer, valid_symbols[SYS_VAR_RVALUE_SEGMENT] && !is_lval, false, &seg)) {
    return reject_sysvar_tail(lexer);
  }
  lexer->mark_end(lexer);
  if (valid_symbols[SYS_VAR_PREFIX_SEGMENT] && peek_next_non_comment_char(scanner, lexer) == '.') {
    lexer->result_symbol = classify_sysvar_prefix_seg(valid_symbols, &seg);
    return true;
  }
  if (is_lval) {
    bool ok = !seg.string_lit && (seg.quoted || (!sysvar_seg_is_reserved(&seg) && !sysvar_seg_is_lvalue_restricted(&seg)));
    lexer->result_symbol = ok ? SYS_VAR_LVALUE_SEGMENT : ILLEGAL_TOKEN;
    return true;
  }
  bool ok = (seg.quoted || seg.string_lit || !sysvar_seg_is_reserved(&seg)) && valid_symbols[SYS_VAR_RVALUE_SEGMENT];
  lexer->result_symbol = ok ? SYS_VAR_RVALUE_SEGMENT : ILLEGAL_TOKEN;
  return true;
}

static bool scan_at_variable(const Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead == '@') return scan_system_variable_head(scanner, lexer, valid_symbols);
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
  if (folded->has_supplementary) return emit(lexer, ILLEGAL_TOKEN);
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
  if (!valid_symbols[SP_LOCAL_IDENT] || scanner->sp_decl_root == 0) {
    return scan_bare_ident_for_supplementary(lexer, first);
  }
  FoldedIdent folded;
  folded_init(&folded);
  folded_push_cp(&folded, first);
  while (is_identifier_char(lexer->lookahead)) advance_folded(lexer, &folded);
  if (folded.has_supplementary) return emit(lexer, ILLEGAL_TOKEN);
  if (folded.all_ascii && folded.char_len < sizeof folded.ascii_upper && is_mysql_reserved_word(folded.ascii_upper)) {
    return false;
  }
  return emit_sp_local_if_declared(scanner, lexer, &folded);
}

static bool scan_prefixed_literal_or_ident(Scanner *scanner, TSLexer *lexer, int32_t c, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead != '\'') {
    return !valid_symbols[UNREACHABLE] && scan_unquoted_word_or_sp_local(scanner, lexer, c, valid_symbols);
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
  if (is_identifier_char(lexer->lookahead)) return scan_bare_ident_for_supplementary(lexer, 0);
  if (len == 0 || len >= sizeof word) return false;
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

static void advance_folded_mode(TSLexer *lexer, bool label_fold, FoldedIdent *folded) {
  if (label_fold) folded_push_label_cp(folded, lexer->lookahead);
  else folded_push_cp(folded, lexer->lookahead);
  advance(lexer);
}

static bool read_unquoted_ident_core(TSLexer *lexer, bool label_fold, FoldedIdent *folded) {
  folded_init(folded);
  int32_t first = lexer->lookahead;
  bool has_non_digit = !is_digit(first);
  char charset[32];
  unsigned cs_len = 0;
  bool cs_ok = (first == '_');
  advance_folded_mode(lexer, label_fold, folded);
  if (lexer->lookahead == '\'' && is_prefixed_literal_letter(first)) return false;
  while (is_identifier_char(lexer->lookahead)) {
    has_non_digit = has_non_digit || !is_digit(lexer->lookahead);
    record_charset_char(lexer->lookahead, charset, sizeof charset, &cs_len, &cs_ok);
    advance_folded_mode(lexer, label_fold, folded);
  }
  charset[cs_len < sizeof charset ? cs_len : sizeof charset - 1] = 0;
  return !folded->has_supplementary && has_non_digit &&
         !(cs_ok && cs_len > 0 && cs_len < sizeof charset && is_mysql_charset(charset));
}

static bool read_capture_unquoted_ident(TSLexer *lexer, bool is_first, FoldedIdent *folded) {
  if (!read_unquoted_ident_core(lexer, false, folded)) return false;
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
    if (!read_backtick_chars(lexer, lower, sizeof lower, &folded, &has_nul) || has_nul || folded.char_len == 0 ||
        folded.has_supplementary) {
      return false;
    }
  } else if (!is_identifier_char(lexer->lookahead) || !read_capture_unquoted_ident(lexer, is_first, &folded)) {
    return false;
  }
  uint32_t base = is_first ? scanner->sp_decl_root : scanner->sp_pending_root;
  scanner->sp_pending_root = sp_trie_insert(scanner, base, folded.bytes, folded.byte_len);
  lexer->result_symbol = is_first ? SP_CAPTURE_FIRST_IDENT : SP_CAPTURE_NEXT_IDENT;
  return true;
}

static bool read_label_backtick(TSLexer *lexer, FoldedIdent *folded, bool *bad_char) {
  folded_init(folded);
  advance(lexer);
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    *bad_char = *bad_char || c == 0;
    advance(lexer);
    if (c == '`' && lexer->lookahead != '`') {
      *bad_char = *bad_char || folded->has_supplementary;
      return !*bad_char && folded->char_len > 0;
    }
    if (c == '`') advance(lexer);
    folded_push_label_cp(folded, c);
  }
  *bad_char = true;
  return false;
}

static bool read_label_ident(TSLexer *lexer, FoldedIdent *folded, bool *bad_char) {
  *bad_char = false;
  if (lexer->lookahead == '`') return read_label_backtick(lexer, folded, bad_char);
  if (!is_identifier_char(lexer->lookahead)) return false;
  bool ok = read_unquoted_ident_core(lexer, true, folded);
  *bad_char = folded->has_supplementary;
  if (!ok) return false;
  return !(folded->all_ascii && folded->char_len < sizeof folded->ascii_upper &&
           (is_mysql_reserved_word(folded->ascii_upper) || is_restricted_label_word(folded->ascii_upper)));
}

static bool scan_sp_capture_label(Scanner *scanner, TSLexer *lexer) {
  lexer->mark_end(lexer);
  FoldedIdent folded;
  bool bad_char = false;
  bool ok = read_label_ident(lexer, &folded, &bad_char);
  if (bad_char) return emit(lexer, ILLEGAL_TOKEN);
  if (!ok || peek_next_non_comment_char(scanner, lexer) != ':') return false;
  uint32_t vis = current_visible_label_root(scanner);
  if (sp_trie_lookup(scanner, vis, folded.bytes, folded.byte_len) != 0) return false;
  uint32_t off = append_label_key_bytes(scanner, folded.bytes, (uint16_t)folded.byte_len);
  scanner->sp_label_frame_top =
      push_sp_label_frame(scanner, (SpLabelFrame){scanner->sp_label_frame_top, vis, off, (uint16_t)folded.byte_len, 1});
  lexer->result_symbol = SP_CAPTURE_LABEL;
  return true;
}

static bool scan_sp_match_end_label(const Scanner *scanner, TSLexer *lexer) {
  if (scanner->sp_label_frame_top == 0 || scanner->label_frames[scanner->sp_label_frame_top].key_len == 0) return false;
  lexer->mark_end(lexer);
  FoldedIdent folded;
  bool bad_char = false;
  bool ok = read_label_ident(lexer, &folded, &bad_char);
  if (bad_char) return emit(lexer, ILLEGAL_TOKEN);
  if (!ok) return false;
  SpLabelFrame cur = scanner->label_frames[scanner->sp_label_frame_top];
  if (folded.byte_len != cur.key_len || memcmp(folded.bytes, scanner->label_bytes + cur.key_offset, cur.key_len) != 0) {
    return false;
  }
  lexer->result_symbol = SP_MATCH_END_LABEL;
  return true;
}

static bool scan_sp_check_jump_label(const Scanner *scanner, TSLexer *lexer, bool is_iterate) {
  lexer->mark_end(lexer);
  FoldedIdent folded;
  bool bad_char = false;
  bool ok = read_label_ident(lexer, &folded, &bad_char);
  if (bad_char) return emit(lexer, ILLEGAL_TOKEN);
  if (!ok) return false;
  uint8_t kind = sp_trie_lookup(scanner, current_visible_label_root(scanner), folded.bytes, folded.byte_len);
  if (is_iterate ? (kind != 2) : (kind == 0)) return false;
  lexer->result_symbol = is_iterate ? SP_CHECK_ITERATE_LABEL : SP_CHECK_LEAVE_LABEL;
  return true;
}

static bool scan_explain_format_value(TSLexer *lexer, const bool *valid_symbols) {
  SysVarSeg seg;
  if (!read_sysvar_segment(lexer, true, true, &seg) || !seg.all_ascii || seg.char_len >= sizeof seg.ascii_upper) {
    return emit(lexer, ILLEGAL_TOKEN);
  }
  if (strcmp(seg.ascii_upper, "JSON") == 0) {
    return emit(lexer, valid_symbols[EXPLAIN_FORMAT_JSON] ? EXPLAIN_FORMAT_JSON : ILLEGAL_TOKEN);
  }
  bool other = strcmp(seg.ascii_upper, "TRADITIONAL") == 0 || strcmp(seg.ascii_upper, "TREE") == 0;
  return emit(lexer, (other && valid_symbols[EXPLAIN_FORMAT_OTHER]) ? EXPLAIN_FORMAT_OTHER : ILLEGAL_TOKEN);
}

static bool scan_sp_zero_width_step(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[UNREACHABLE]) return false;
  if (valid_symbols[SP_ROUTINE_RESET]) return reset_sp_state(scanner), emit(lexer, SP_ROUTINE_RESET);
  if (valid_symbols[SP_SCOPE_PUSH]) {
    scanner->sp_scope_top = push_sp_scope(scanner, scanner->sp_scope_top, scanner->sp_decl_root);
    return emit(lexer, SP_SCOPE_PUSH);
  }
  if (valid_symbols[SP_SCOPE_POP]) return pop_sp_scope(scanner), emit(lexer, SP_SCOPE_POP);
  if (valid_symbols[SP_COMMIT_VARS]) {
    scanner->sp_decl_root = scanner->sp_pending_root;
    return emit(lexer, SP_COMMIT_VARS);
  }
  if (valid_symbols[SP_ACTIVATE_BLOCK_LABEL]) {
    return activate_sp_label_frame(scanner, 1), emit(lexer, SP_ACTIVATE_BLOCK_LABEL);
  }
  if (valid_symbols[SP_ACTIVATE_LOOP_LABEL]) {
    return activate_sp_label_frame(scanner, 2), emit(lexer, SP_ACTIVATE_LOOP_LABEL);
  }
  if (valid_symbols[SP_LABEL_POP]) return pop_sp_label_frame(scanner), emit(lexer, SP_LABEL_POP);
  if (valid_symbols[SP_HANDLER_BARRIER_PUSH]) {
    lexer->mark_end(lexer);
    if (peek_next_non_comment_char(scanner, lexer) == ',') return false;
    scanner->sp_label_frame_top =
        push_sp_label_frame(scanner, (SpLabelFrame){scanner->sp_label_frame_top, 0, 0, 0, 0});
    lexer->result_symbol = SP_HANDLER_BARRIER_PUSH;
    return true;
  }
  if (valid_symbols[SP_HANDLER_BARRIER_POP]) {
    return pop_sp_label_frame(scanner), emit(lexer, SP_HANDLER_BARRIER_POP);
  }
  return false;
}

void *tree_sitter_mysql_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }

void tree_sitter_mysql_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  if (!scanner) return;
  ts_free(scanner->nodes);
  ts_free(scanner->scopes);
  ts_free(scanner->label_frames);
  ts_free(scanner->label_bytes);
  ts_free(scanner);
}

unsigned tree_sitter_mysql_external_scanner_serialize(void *payload, char *buffer) {
  const Scanner *scanner = (const Scanner *)payload;
  if (!scanner->in_version_comment && scanner->signal_item_mask == 0 && scanner->sp_decl_root == 0 &&
      scanner->sp_pending_root == 0 && scanner->sp_scope_top == 0 && scanner->sp_label_frame_top == 0) {
    return 0;
  }
  buffer[0] = scanner->in_version_comment ? 1 : 0;
  buffer[1] = (char)(scanner->signal_item_mask & 0xFF);
  buffer[2] = (char)((scanner->signal_item_mask >> 8) & 0xFF);
  memcpy(buffer + 3, &scanner->sp_decl_root, sizeof(uint32_t));
  memcpy(buffer + 7, &scanner->sp_pending_root, sizeof(uint32_t));
  memcpy(buffer + 11, &scanner->sp_scope_top, sizeof(uint32_t));
  memcpy(buffer + 15, &scanner->sp_label_frame_top, sizeof(uint32_t));
  return 19;
}

void tree_sitter_mysql_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  scanner->in_version_comment = (length > 0 && buffer[0] != 0);
  scanner->signal_item_mask =
      length >= 3 ? (uint16_t)((uint8_t)buffer[1] | ((uint16_t)(uint8_t)buffer[2] << 8)) : 0;
  if (length >= 19) {
    memcpy(&scanner->sp_decl_root, buffer + 3, sizeof(uint32_t));
    memcpy(&scanner->sp_pending_root, buffer + 7, sizeof(uint32_t));
    memcpy(&scanner->sp_scope_top, buffer + 11, sizeof(uint32_t));
    memcpy(&scanner->sp_label_frame_top, buffer + 15, sizeof(uint32_t));
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
  if (is_identifier_char(c)) {
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
      if (valid_symbols[UNREACHABLE]) return false;
      if (valid_symbols[DOT_CONTEXT]) {
        advance(lexer);
        return scan_bare_ident_for_supplementary(lexer, '_');
      }
      return scan_charset_or_underscore_ident(scanner, lexer, valid_symbols);
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
  if (!valid_symbols[UNREACHABLE] && valid_symbols[SP_LABEL_POP_NO_END] && !scanner->in_version_comment) {
    pop_sp_label_frame(scanner);
    return emit(lexer, SP_LABEL_POP_NO_END);
  }
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

static bool scan_sp_contextual_guard(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, bool *handled) {
  if (valid_symbols[UNREACHABLE]) return (*handled = false), false;
  *handled = true;
  if (valid_symbols[SP_CAPTURE_FIRST_IDENT] || valid_symbols[SP_CAPTURE_NEXT_IDENT]) {
    return scan_sp_capture_ident(scanner, lexer, valid_symbols[SP_CAPTURE_FIRST_IDENT]);
  }
  if (valid_symbols[SP_LABEL_POP_NO_END] && lexer->lookahead == ';') {
    pop_sp_label_frame(scanner);
    return emit(lexer, SP_LABEL_POP_NO_END);
  }
  if (valid_symbols[SP_MATCH_END_LABEL]) return scan_sp_match_end_label(scanner, lexer);
  if (valid_symbols[SP_CHECK_LEAVE_LABEL] || valid_symbols[SP_CHECK_ITERATE_LABEL]) {
    return scan_sp_check_jump_label(scanner, lexer, valid_symbols[SP_CHECK_ITERATE_LABEL]);
  }
  if (valid_symbols[SP_CAPTURE_LABEL]) return scan_sp_capture_label(scanner, lexer);
  if (valid_symbols[SYS_VAR_PREFIX_SEGMENT] || valid_symbols[SYS_VAR_RVALUE_SEGMENT] ||
      valid_symbols[SYS_VAR_LVALUE_SEGMENT]) {
    return scan_sysvar_dot_segment(scanner, lexer, valid_symbols);
  }
  if (valid_symbols[EXPLAIN_FORMAT_JSON] || valid_symbols[EXPLAIN_FORMAT_OTHER]) {
    return scan_explain_format_value(lexer, valid_symbols);
  }
  *handled = false;
  return false;
}

bool tree_sitter_mysql_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  if (scan_sp_zero_width_step(scanner, lexer, valid_symbols)) return true;
  skip_spaces(lexer);
  if (at_eof(lexer)) return scan_eof_token(scanner, lexer, valid_symbols);
  if (lexer->lookahead == 0) return scan_nul_run(lexer);
  if (scanner->in_version_comment && lexer->lookahead == '*') return scan_version_comment_end(scanner, lexer);
  bool non_recovery = !valid_symbols[UNREACHABLE];
  if (non_recovery && lexer->lookahead == ';' && valid_symbols[STATEMENT_TERMINATOR] &&
      !valid_symbols[SP_LABEL_POP_NO_END]) {
    return scan_top_level_semicolon(scanner, lexer);
  }
  bool comment_result = false;
  if (scan_comment_if_present(scanner, lexer, valid_symbols, &comment_result)) return comment_result;
  bool guard_handled = false;
  bool guard_res = scan_sp_contextual_guard(scanner, lexer, valid_symbols, &guard_handled);
  if (guard_handled) return guard_res;
  if (non_recovery && valid_symbols[HOST_NAME] && scan_host_name(lexer)) return true;
  return scan_token_by_start(scanner, lexer, valid_symbols);
}
