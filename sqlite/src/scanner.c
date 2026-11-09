#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
  MODULE_ARGUMENT_TOKEN,
  ILLEGAL_TOKEN,
  UNREACHABLE,
  COMMENT,
};

// The character classes of SQLite's tokenizer (`aiClass` and `IdChar` in src/tokenize.c), for code points rather than
// bytes: every non-ASCII code point is an identifier character.
static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_hex_digit(int32_t c) { return is_digit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

static bool is_identifier_char(int32_t c) {
  return c >= 0x80 || is_digit(c) || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$';
}

static bool is_space(int32_t c) { return c == ' ' || c == '\t' || c == '\n' || c == '\v' || c == '\f' || c == '\r'; }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

// Consumes a run of digits that may contain separators (`_`), after `after_digit` tells whether a digit was just
// consumed, and returns whether each separator stands between two digits, as `sqlite3DequoteNumber` in src/util.c
// requires.
static bool scan_digits(TSLexer *lexer, bool (*is_valid_digit)(int32_t), bool after_digit) {
  bool valid = true;
  while (is_valid_digit(lexer->lookahead) || lexer->lookahead == '_') {
    if (lexer->lookahead == '_') {
      if (!after_digit) valid = false;
      after_digit = false;
    } else {
      after_digit = true;
    }
    advance(lexer);
  }
  return valid && after_digit;
}

static void skip_identifier_chars(TSLexer *lexer) {
  while (is_identifier_char(lexer->lookahead)) advance(lexer);
}

// Consumes identifier characters right after a number, if any, and returns whether the number, valid as far as
// `valid` tells, is accepted: SQLite rejects identifier characters right after a number (e.g. `1abc`).
static bool end_number(TSLexer *lexer, bool valid) {
  if (!is_identifier_char(lexer->lookahead)) return valid;
  skip_identifier_chars(lexer);
  return false;
}

// Consumes the digits of a hexadecimal number after its `0x`. `0x` without a hexadecimal digit is the number 0
// followed by identifier characters.
static bool scan_hex_number(TSLexer *lexer) {
  if (!is_hex_digit(lexer->lookahead)) return end_number(lexer, false);
  return end_number(lexer, scan_digits(lexer, is_hex_digit, false));
}

// Consumes the fraction digits and the exponent of a decimal number, if any. Without a digit, an `e` is no exponent
// but an identifier character right after the number.
static bool scan_fraction_and_exponent(TSLexer *lexer) {
  bool valid = true;
  if (is_digit(lexer->lookahead) || lexer->lookahead == '_') valid = scan_digits(lexer, is_digit, false);
  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    advance(lexer);
    if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
    if (!is_digit(lexer->lookahead)) return end_number(lexer, false);
    valid = scan_digits(lexer, is_digit, false) && valid;
  }
  return end_number(lexer, valid);
}

// Consumes a decimal number after its first digit has been consumed when `after_digit` is set.
static bool scan_decimal_number(TSLexer *lexer, bool after_digit) {
  bool valid = scan_digits(lexer, is_digit, after_digit);
  if (lexer->lookahead == '.') {
    advance(lexer);
    if (lexer->lookahead == '_') valid = false;
  }
  return scan_fraction_and_exponent(lexer) && valid;
}

// Consumes a number the way `sqlite3GetToken` does, from its first digit or from the digit after its leading `.`
// (`after_dot`), and returns whether SQLite accepts it: it also rejects a digit separator (`_`) that does not stand
// between two digits.
static bool scan_number(TSLexer *lexer, bool after_dot) {
  if (after_dot) return scan_fraction_and_exponent(lexer);
  if (lexer->lookahead != '0') return scan_decimal_number(lexer, false);
  advance(lexer);
  if (lexer->lookahead != 'x' && lexer->lookahead != 'X') return scan_decimal_number(lexer, true);
  advance(lexer);
  return scan_hex_number(lexer);
}

// Consumes a blob literal after its `x` and returns whether it holds an even number of hexadecimal digits.
static bool scan_blob(TSLexer *lexer) {
  advance(lexer);
  unsigned digits = 0;
  while (is_hex_digit(lexer->lookahead)) {
    advance(lexer);
    digits++;
  }
  bool valid = lexer->lookahead == '\'' && digits % 2 == 0;
  while (!lexer->eof(lexer) && lexer->lookahead != '\'' && lexer->lookahead != 0) advance(lexer);
  if (lexer->lookahead == '\'') advance(lexer);
  return valid;
}

// Recognizes a number or a blob literal that SQLite's tokenizer rejects (`TK_ILLEGAL`).
static bool scan_illegal_token(TSLexer *lexer) {
  while (is_space(lexer->lookahead) || lexer->lookahead == 0xFEFF) lexer->advance(lexer, true);
  bool valid;
  if (lexer->lookahead == '.') {
    advance(lexer);
    if (!is_digit(lexer->lookahead)) return false;
    valid = scan_number(lexer, true);
  } else if (is_digit(lexer->lookahead)) {
    valid = scan_number(lexer, false);
  } else if (lexer->lookahead == 'x' || lexer->lookahead == 'X') {
    advance(lexer);
    if (lexer->lookahead != '\'') return false;
    valid = scan_blob(lexer);
  } else {
    return false;
  }
  if (valid) return false;
  lexer->mark_end(lexer);
  lexer->result_symbol = ILLEGAL_TOKEN;
  return true;
}

// Consumes a quoted token whose closing quote is `quote` and in which two quotes stand for one, unless `doubles` is
// false, and returns whether it is terminated.
static bool scan_quoted(TSLexer *lexer, int32_t quote, bool doubles) {
  advance(lexer);
  for (;;) {
    if (lexer->eof(lexer) || lexer->lookahead == 0) return false;
    if (lexer->lookahead == quote) {
      advance(lexer);
      if (!doubles || lexer->lookahead != quote) return true;
    }
    advance(lexer);
  }
}

// Consumes a variable. A variable needs a name; the forms of Tcl variable names are accepted loosely.
static bool scan_variable(TSLexer *lexer) {
  bool numbered = lexer->lookahead == '?';
  advance(lexer);
  if (numbered) {
    while (is_digit(lexer->lookahead)) advance(lexer);
    return true;
  }
  if (!is_identifier_char(lexer->lookahead) && lexer->lookahead != ':') return false;
  while (is_identifier_char(lexer->lookahead) || lexer->lookahead == ':') advance(lexer);
  return true;
}

// Consumes an operator or a punctuation character; any other character is illegal.
static bool scan_punctuation(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  switch (c) {
    case '.':
      return !is_digit(lexer->lookahead) || scan_number(lexer, true);
    case '!':
      if (lexer->lookahead != '=') return false;
      advance(lexer);
      return true;
    case '-': case '+': case '*': case '/': case '%': case '=': case '<': case '>': case '|': case '&': case '~':
    case ';':
      return true;
    default:
      return false;
  }
}

// Consumes one token of a module argument the way `sqlite3GetToken` does and returns whether SQLite accepts it.
static bool scan_argument_token(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  if (c == '\'' || c == '"' || c == '`') return scan_quoted(lexer, c, true);
  if (c == '[') return scan_quoted(lexer, ']', false);
  if (is_digit(c)) return scan_number(lexer, false);
  if (c == '?' || c == '$' || c == '@' || c == '#' || c == ':') return scan_variable(lexer);
  if (c == 'x' || c == 'X') {
    advance(lexer);
    if (lexer->lookahead == '\'') return scan_blob(lexer);
  }
  if (!is_identifier_char(c)) return scan_punctuation(lexer);
  skip_identifier_chars(lexer);
  return true;
}

// Consumes the rest of a comment whose first character, `-` or `/`, has been consumed, and returns whether it holds no
// NUL character. An unterminated block comment ends at the end of the input.
static bool scan_comment(TSLexer *lexer, int32_t first) {
  if (first == '-') {
    while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
      if (lexer->lookahead == 0) return false;
      advance(lexer);
    }
    return true;
  }
  advance(lexer);
  bool star = false;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == 0) return false;
    advance(lexer);
    if (star && c == '/') return true;
    star = c == '*';
  }
  return true;
}

// Recognizes one token of a virtual table's module argument other than a parenthesis or a comma, which the grammar
// reads itself, or a comment. SQLite passes the text of each argument to the module unparsed, but its tokenizer still
// rejects illegal tokens in it. The internal lexer cannot read these tokens, so the scanner skips the white space before
// them and reads the comments between them as well.
static bool scan_module_argument_token(TSLexer *lexer) {
  while (is_space(lexer->lookahead) || lexer->lookahead == 0xFEFF) lexer->advance(lexer, true);
  int32_t c = lexer->lookahead;
  if (lexer->eof(lexer) || c == '(' || c == ')' || c == ',') return false;
  if (c == '-' || c == '/') {
    advance(lexer);
    if ((c == '-' && lexer->lookahead == '-') || (c == '/' && lexer->lookahead == '*' && !lexer->eof(lexer))) {
      if (!scan_comment(lexer, c)) return false;
      lexer->mark_end(lexer);
      lexer->result_symbol = COMMENT;
      return true;
    }
  } else if (!scan_argument_token(lexer)) {
    return false;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = MODULE_ARGUMENT_TOKEN;
  return true;
}

void *tree_sitter_sqlite_external_scanner_create(void) { return NULL; }

void tree_sitter_sqlite_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_sqlite_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_sqlite_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_sqlite_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  // During error recovery every token is valid; a module argument token is then never one, since it would swallow the
  // text that recovery has to resynchronize on.
  if (valid_symbols[MODULE_ARGUMENT_TOKEN] && !valid_symbols[ILLEGAL_TOKEN]) return scan_module_argument_token(lexer);
  if (valid_symbols[ILLEGAL_TOKEN]) return scan_illegal_token(lexer);
  return false;
}
