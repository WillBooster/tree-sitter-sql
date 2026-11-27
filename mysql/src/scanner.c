#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  COMMENT,
  VERSION_COMMENT_START,
  VERSION_COMMENT_END,
  STRING_SEGMENT,
  NATIONAL_STRING_SEGMENT,
  CHARSET_INTRODUCER,
  QUOTED_HEX_LITERAL,
  QUOTED_BIT_LITERAL,
  USER_VARIABLE,
  SYSTEM_VARIABLE,
  QUOTED_IDENTIFIER,
  DIGIT_IDENTIFIER,
  END_OF_INPUT,
  ILLEGAL_TOKEN,
  UNREACHABLE,
};

typedef struct {
  bool in_version_comment;
} Scanner;

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

static bool scan_line_comment(TSLexer *lexer) {
  bool has_nul = false;
  while (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
    if (lexer->lookahead == 0) has_nul = true;
    advance(lexer);
  }
  return emit(lexer, has_nul ? ILLEGAL_TOKEN : COMMENT);
}

static bool scan_dash_comment(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '-') return false;
  advance(lexer);
  if ((lexer->lookahead == 0 && !lexer->eof(lexer)) || at_eof(lexer) || is_dash_comment_follower(lexer->lookahead)) {
    return scan_line_comment(lexer);
  }
  return false;
}

static bool scan_block_comment_tail(Scanner *scanner, TSLexer *lexer) {
  bool has_nul = false;
  bool star = false;
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == 0) has_nul = true;
    advance(lexer);
    if (star && c == '/') return emit(lexer, has_nul ? ILLEGAL_TOKEN : COMMENT);
    star = (c == '*');
  }
  scanner->in_version_comment = false;
  return emit(lexer, ILLEGAL_TOKEN);
}

static unsigned parse_version_guard(TSLexer *lexer, uint32_t *ver_out) {
  unsigned digits = 0;
  uint32_t ver = 0;
  while (digits < 5 && is_digit(lexer->lookahead)) {
    ver = ver * 10 + (uint32_t)(lexer->lookahead - '0');
    advance(lexer);
    digits++;
  }
  if (digits == 5) {
    lexer->mark_end(lexer);
    if (is_digit(lexer->lookahead)) {
      uint32_t d6 = (uint32_t)(lexer->lookahead - '0');
      advance(lexer);
      if (is_space(lexer->lookahead) || lexer->lookahead == '*') {
        ver = ver * 10 + d6;
        lexer->mark_end(lexer);
      }
    }
  }
  *ver_out = ver;
  return digits;
}

static bool scan_version_comment_open(Scanner *scanner, TSLexer *lexer) {
  lexer->mark_end(lexer);
  uint32_t ver = 0;
  unsigned digits = parse_version_guard(lexer, &ver);
  if (digits > 0 && digits < 5) {
    scanner->in_version_comment = true;
    lexer->result_symbol = VERSION_COMMENT_START;
    return true;
  }
  if (digits == 5 && ver > 80499) return scan_block_comment_tail(scanner, lexer);
  while (is_space(lexer->lookahead)) advance(lexer);
  if (lexer->lookahead == '*') {
    advance(lexer);
    if (lexer->lookahead == '/') {
      advance(lexer);
      return emit(lexer, COMMENT);
    }
  }
  scanner->in_version_comment = true;
  lexer->result_symbol = VERSION_COMMENT_START;
  return true;
}

static bool scan_slash_comment(Scanner *scanner, TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  if (!scanner->in_version_comment && lexer->lookahead == '!') {
    advance(lexer);
    return scan_version_comment_open(scanner, lexer);
  }
  return scan_block_comment_tail(scanner, lexer);
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
      bool invalid = has_nul || (!allow_empty && steps == 0);
      return emit(lexer, invalid ? ILLEGAL_TOKEN : target_symbol);
    }
    steps++;
  }
  return emit(lexer, ILLEGAL_TOKEN);
}

static bool scan_string_token(TSLexer *lexer, int32_t quote, enum TokenType target_symbol) {
  return scan_delimited(lexer, quote, true, true, target_symbol);
}

static bool scan_backtick_body(TSLexer *lexer, bool allow_empty, enum TokenType target_symbol) {
  return scan_delimited(lexer, '`', false, allow_empty, target_symbol);
}

static bool scan_quoted_hex_or_bit(TSLexer *lexer, bool is_hex, bool symbol_is_valid) {
  advance(lexer);
  unsigned digits = 0;
  bool valid_chars = true;
  while (!at_eof(lexer) && lexer->lookahead != '\'') {
    int32_t c = lexer->lookahead;
    if (is_hex ? !is_hex_digit(c) : (c != '0' && c != '1')) valid_chars = false;
    advance(lexer);
    digits++;
  }
  if (lexer->lookahead != '\'') return emit(lexer, ILLEGAL_TOKEN);
  advance(lexer);
  bool valid = valid_chars && (!is_hex || digits % 2 == 0) && symbol_is_valid;
  return emit(lexer, valid ? (is_hex ? QUOTED_HEX_LITERAL : QUOTED_BIT_LITERAL) : ILLEGAL_TOKEN);
}

static bool follows_introducer_literal(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) advance(lexer);
  int32_t c = lexer->lookahead;
  if (c == '\'' || c == '"') return true;
  if (c == 'x' || c == 'X' || c == 'b' || c == 'B') {
    advance(lexer);
    return lexer->lookahead == '\'';
  }
  if (c != '0') return false;
  advance(lexer);
  if (lexer->lookahead == 'x') {
    advance(lexer);
    return is_hex_digit(lexer->lookahead);
  }
  if (lexer->lookahead == 'b') {
    advance(lexer);
    return lexer->lookahead == '0' || lexer->lookahead == '1';
  }
  return false;
}

static bool scan_charset_introducer(TSLexer *lexer) {
  advance(lexer);
  char charset[32];
  unsigned length = 0;
  while (is_ascii_alpha(lexer->lookahead) || is_digit(lexer->lookahead)) {
    int32_t c = lexer->lookahead;
    if (length + 1 < sizeof charset) {
      charset[length] = (c >= 'A' && c <= 'Z') ? (char)(c - 'A' + 'a') : (char)c;
    }
    length++;
    advance(lexer);
  }
  if (length == 0 || length >= sizeof charset || is_identifier_char(lexer->lookahead)) return false;
  charset[length] = 0;
  lexer->mark_end(lexer);

  if (lexer->lookahead == '\'' || lexer->lookahead == '"') {
    lexer->result_symbol = CHARSET_INTRODUCER;
    return true;
  }
  if (!is_space(lexer->lookahead) || !is_mysql_charset(charset) || !follows_introducer_literal(lexer)) return false;
  lexer->result_symbol = CHARSET_INTRODUCER;
  return true;
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

static bool scan_at_variable(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead == '@') return scan_system_variable(lexer, valid_symbols[SYSTEM_VARIABLE]);
  if (!valid_symbols[USER_VARIABLE]) return false;

  if (lexer->lookahead == '\'' || lexer->lookahead == '"') {
    return scan_string_token(lexer, lexer->lookahead, USER_VARIABLE);
  }
  if (lexer->lookahead == '`') return scan_backtick_body(lexer, true, USER_VARIABLE);
  if (is_user_var_char(lexer->lookahead)) {
    while (is_user_var_char(lexer->lookahead)) advance(lexer);
    return emit(lexer, USER_VARIABLE);
  }
  return !valid_symbols[UNREACHABLE] && emit(lexer, ILLEGAL_TOKEN);
}

static bool finish_digit_tail(TSLexer *lexer, enum TokenType symbol) {
  while (is_identifier_char(lexer->lookahead)) advance(lexer);
  return emit(lexer, symbol);
}

static bool scan_malformed_exponent(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
  if (!is_digit(lexer->lookahead)) return finish_digit_tail(lexer, ILLEGAL_TOKEN);
  while (is_digit(lexer->lookahead)) advance(lexer);
  return is_identifier_char(lexer->lookahead) && finish_digit_tail(lexer, ILLEGAL_TOKEN);
}

static bool scan_radix_literal(TSLexer *lexer, bool is_hex, enum TokenType ident_symbol) {
  advance(lexer);
  unsigned digits = 0;
  while (is_hex ? is_hex_digit(lexer->lookahead) : (lexer->lookahead == '0' || lexer->lookahead == '1')) {
    advance(lexer);
    digits++;
  }
  if (digits > 0 && !is_identifier_char(lexer->lookahead)) return false;
  return finish_digit_tail(lexer, ident_symbol);
}

static bool scan_integer_exponent(TSLexer *lexer, enum TokenType ident_symbol) {
  advance(lexer);
  if (lexer->lookahead == '+' || lexer->lookahead == '-') {
    advance(lexer);
    if (!is_digit(lexer->lookahead)) return finish_digit_tail(lexer, ILLEGAL_TOKEN);
    while (is_digit(lexer->lookahead)) advance(lexer);
    return is_identifier_char(lexer->lookahead) && finish_digit_tail(lexer, ILLEGAL_TOKEN);
  }
  if (is_digit(lexer->lookahead)) {
    while (is_digit(lexer->lookahead)) advance(lexer);
    if (!is_identifier_char(lexer->lookahead)) return false;
  }
  return finish_digit_tail(lexer, ident_symbol);
}

static bool scan_fraction_and_exponent(TSLexer *lexer, bool require_digit) {
  advance(lexer);
  if (require_digit && !is_digit(lexer->lookahead)) return false;
  while (is_digit(lexer->lookahead)) advance(lexer);
  return (lexer->lookahead == 'e' || lexer->lookahead == 'E') && scan_malformed_exponent(lexer);
}

// Distinguishes valid numbers (`123`, `1e10`, `0x1F`, `0b01`), digit-leading identifiers (`123abc`, `1e_col`,
// `0xZZ`, `0X1F`, `0b2`), and malformed floating-point literals (`1e+a`, `1.2e`, `.5e+a`).
static bool scan_digit_or_float(TSLexer *lexer, bool allow_leading_dot, bool digit_ident_valid) {
  if (lexer->lookahead == '.') return allow_leading_dot && scan_fraction_and_exponent(lexer, true);

  enum TokenType ident_symbol = digit_ident_valid ? DIGIT_IDENTIFIER : ILLEGAL_TOKEN;
  int32_t first = lexer->lookahead;
  advance(lexer);
  if (first == '0' && (lexer->lookahead == 'x' || lexer->lookahead == 'b')) {
    return scan_radix_literal(lexer, lexer->lookahead == 'x', ident_symbol);
  }
  while (is_digit(lexer->lookahead)) advance(lexer);
  if (lexer->lookahead == '.') return scan_fraction_and_exponent(lexer, false);
  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') return scan_integer_exponent(lexer, ident_symbol);
  return is_identifier_char(lexer->lookahead) && finish_digit_tail(lexer, ident_symbol);
}

static bool scan_prefixed_literal(TSLexer *lexer, int32_t c, const bool *valid_symbols) {
  advance(lexer);
  if (lexer->lookahead != '\'') return false;
  if (c == 'n' || c == 'N') {
    return scan_string_token(
      lexer, '\'', valid_symbols[NATIONAL_STRING_SEGMENT] ? NATIONAL_STRING_SEGMENT : ILLEGAL_TOKEN
    );
  }
  bool is_hex = (c == 'x' || c == 'X');
  return scan_quoted_hex_or_bit(lexer, is_hex, valid_symbols[is_hex ? QUOTED_HEX_LITERAL : QUOTED_BIT_LITERAL]);
}

void *tree_sitter_mysql_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }

void tree_sitter_mysql_external_scanner_destroy(void *payload) { ts_free(payload); }

unsigned tree_sitter_mysql_external_scanner_serialize(void *payload, char *buffer) {
  const Scanner *scanner = (const Scanner *)payload;
  if (!scanner->in_version_comment) return 0;
  buffer[0] = 1;
  return 1;
}

void tree_sitter_mysql_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  scanner->in_version_comment = (length > 0 && buffer[0] != 0);
}

static bool scan_version_comment_delimiter(Scanner *scanner, TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == ';') {
    scanner->in_version_comment = false;
    return emit(lexer, ILLEGAL_TOKEN);
  }
  if (lexer->lookahead != '/') return false;
  advance(lexer);
  scanner->in_version_comment = false;
  return emit(lexer, VERSION_COMMENT_END);
}

static bool scan_token_by_start(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
  int32_t c = lexer->lookahead;
  switch (c) {
    case '#':
      return scan_line_comment(lexer);
    case '-':
      return scan_dash_comment(lexer);
    case '/':
      return scan_slash_comment(scanner, lexer);
    case '\'':
    case '"':
      return scan_string_token(lexer, c, valid_symbols[STRING_SEGMENT] ? STRING_SEGMENT : ILLEGAL_TOKEN);
    case '`':
      return scan_backtick_body(lexer, false, valid_symbols[QUOTED_IDENTIFIER] ? QUOTED_IDENTIFIER : ILLEGAL_TOKEN);
    case 'n':
    case 'N':
    case 'x':
    case 'X':
    case 'b':
    case 'B':
      return scan_prefixed_literal(lexer, c, valid_symbols);
    case '@':
      return scan_at_variable(lexer, valid_symbols);
    case '_':
      return valid_symbols[CHARSET_INTRODUCER] && !valid_symbols[UNREACHABLE] && scan_charset_introducer(lexer);
    default:
      return (is_digit(c) || c == '.') && !valid_symbols[UNREACHABLE] &&
             scan_digit_or_float(lexer, valid_symbols[USER_VARIABLE], valid_symbols[DIGIT_IDENTIFIER]);
  }
}

bool tree_sitter_mysql_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  skip_spaces(lexer);

  if (at_eof(lexer)) {
    if (scanner->in_version_comment && !valid_symbols[UNREACHABLE]) {
      scanner->in_version_comment = false;
      return emit(lexer, ILLEGAL_TOKEN);
    }
    return !scanner->in_version_comment && valid_symbols[END_OF_INPUT] && emit(lexer, END_OF_INPUT);
  }

  if (lexer->lookahead == 0) {
    while (lexer->lookahead == 0 && !lexer->eof(lexer)) advance(lexer);
    return emit(lexer, ILLEGAL_TOKEN);
  }

  if (scanner->in_version_comment && (lexer->lookahead == ';' || lexer->lookahead == '*')) {
    return scan_version_comment_delimiter(scanner, lexer);
  }

  return scan_token_by_start(scanner, lexer, valid_symbols);
}
