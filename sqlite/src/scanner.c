#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
  MODULE_ARGUMENT_TOKEN,
  ILLEGAL_TOKEN,
  UNREACHABLE,
  COMMENT,
  BLOB_LITERAL,
  OVER_BEFORE_WINDOW,
};

// The character classes of SQLite's tokenizer (`aiClass` and `IdChar` in src/tokenize.c), for code points rather than
// bytes: every non-ASCII code point is an identifier character.
static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_hex_digit(int32_t c) { return is_digit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

static bool is_identifier_char(int32_t c) {
  return c >= 0x80 || is_digit(c) || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c == '$';
}

// A run of white space may contain a vertical tab, but may not start with one (`CC_SPACE` and `sqlite3Isspace` in
// src/tokenize.c). A byte order mark is white space of its own.
static bool starts_space(int32_t c) { return c == ' ' || c == '\t' || c == '\n' || c == '\f' || c == '\r'; }

static bool is_space(int32_t c) { return starts_space(c) || c == '\v'; }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static void skip_spaces(TSLexer *lexer) {
  for (;;) {
    if (lexer->lookahead == 0xFEFF) {
      lexer->advance(lexer, true);
    } else if (starts_space(lexer->lookahead)) {
      while (is_space(lexer->lookahead)) lexer->advance(lexer, true);
    } else {
      return;
    }
  }
}

// SQLite's tokenizer (`sqlite3GetToken`) rejects identifier characters right after a number (e.g. `1abc`), and
// `sqlite3DequoteNumber` in src/util.c, which an expression applies to a number it reads, also rejects a digit
// separator (`_`) that does not stand between two digits. `check_separators` tells whether a number is checked for
// the latter.

// Consumes a run of digits that may contain separators, after `after_digit` tells whether a digit was just consumed.
static bool scan_digits(TSLexer *lexer, bool (*is_valid_digit)(int32_t), bool after_digit, bool check_separators) {
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
  return !check_separators || (valid && after_digit);
}

static void skip_identifier_chars(TSLexer *lexer) {
  while (is_identifier_char(lexer->lookahead)) advance(lexer);
}

// Consumes identifier characters right after a number, if any, and returns whether the number, valid as far as
// `valid` tells, is accepted.
static bool end_number(TSLexer *lexer, bool valid) {
  if (!is_identifier_char(lexer->lookahead)) return valid;
  skip_identifier_chars(lexer);
  return false;
}

// Consumes the digits of a hexadecimal number after its `0x`. `0x` without a hexadecimal digit is the number 0
// followed by identifier characters.
static bool scan_hex_number(TSLexer *lexer, bool check_separators) {
  if (!is_hex_digit(lexer->lookahead)) return end_number(lexer, false);
  return end_number(lexer, scan_digits(lexer, is_hex_digit, false, check_separators));
}

// Consumes the fraction digits and the exponent of a decimal number, if any. Without a digit, an `e` is no exponent
// but an identifier character right after the number.
static bool scan_fraction_and_exponent(TSLexer *lexer, bool check_separators) {
  bool valid = true;
  if (is_digit(lexer->lookahead) || lexer->lookahead == '_') {
    valid = scan_digits(lexer, is_digit, false, check_separators);
  }
  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    advance(lexer);
    if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
    if (!is_digit(lexer->lookahead)) return end_number(lexer, false);
    valid = scan_digits(lexer, is_digit, false, check_separators) && valid;
  }
  return end_number(lexer, valid);
}

// Consumes a decimal number after its first digit has been consumed when `after_digit` is set.
static bool scan_decimal_number(TSLexer *lexer, bool after_digit, bool check_separators) {
  bool valid = scan_digits(lexer, is_digit, after_digit, check_separators);
  if (lexer->lookahead == '.') advance(lexer);
  return scan_fraction_and_exponent(lexer, check_separators) && valid;
}

// Consumes a number the way `sqlite3GetToken` does, from its first digit or from the digit after its leading `.`
// (`after_dot`), and returns whether SQLite accepts it.
static bool scan_number(TSLexer *lexer, bool after_dot, bool check_separators) {
  if (after_dot) return scan_fraction_and_exponent(lexer, check_separators);
  if (lexer->lookahead != '0') return scan_decimal_number(lexer, false, check_separators);
  advance(lexer);
  if (lexer->lookahead != 'x' && lexer->lookahead != 'X') return scan_decimal_number(lexer, true, check_separators);
  advance(lexer);
  return scan_hex_number(lexer, check_separators);
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

// Recognizes a number or a blob literal that SQLite's tokenizer rejects (`TK_ILLEGAL`), and a blob literal where none
// may appear: SQLite's tokenizer reads `x'...'` as a blob wherever it appears, where the lexer would read an
// identifier and a string literal.
static bool scan_illegal_token(TSLexer *lexer, bool blob_is_valid) {
  skip_spaces(lexer);
  bool valid;
  if (lexer->lookahead == '.') {
    advance(lexer);
    if (!is_digit(lexer->lookahead)) return false;
    valid = scan_number(lexer, true, true);
  } else if (is_digit(lexer->lookahead)) {
    valid = scan_number(lexer, false, true);
  } else if (lexer->lookahead == 'x' || lexer->lookahead == 'X') {
    advance(lexer);
    if (lexer->lookahead != '\'') return false;
    valid = scan_blob(lexer) && blob_is_valid;
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

// Consumes a Tcl suffix of a variable, which runs from `(` to the first `)` without white space.
static bool scan_tcl_suffix(TSLexer *lexer) {
  do {
    advance(lexer);
  } while (!lexer->eof(lexer) && lexer->lookahead != 0 && !is_space(lexer->lookahead) && lexer->lookahead != ')');
  if (lexer->lookahead != ')') return false;
  advance(lexer);
  lexer->mark_end(lexer);
  return true;
}

// Consumes a variable after its `$`, `@`, `#`, or `:`: identifier characters, `::` pairs, and a Tcl suffix. A variable
// without an identifier character is illegal. A single `:` ends the variable before it, so the end is marked as the
// variable grows.
static bool scan_named_variable(TSLexer *lexer) {
  unsigned name_chars = 0;
  for (;;) {
    lexer->mark_end(lexer);
    int32_t c = lexer->lookahead;
    if (c == '(' && name_chars > 0) return scan_tcl_suffix(lexer);
    if (is_identifier_char(c)) {
      name_chars++;
      advance(lexer);
      continue;
    }
    if (c != ':') return name_chars > 0;
    advance(lexer);
    if (lexer->lookahead != ':') return name_chars > 0;
    advance(lexer);
  }
}

static bool is_single_char_operator(int32_t c) {
  return c == '+' || c == '*' || c == '%' || c == '&' || c == '~' || c == ';';
}

// Consumes an operator or a punctuation character other than a parenthesis, a comma, `-`, or `/`, which the caller
// reads; any other character is illegal.
static bool scan_punctuation(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (is_single_char_operator(c)) return true;
  int32_t next = lexer->lookahead;
  switch (c) {
    case '.':
      return !is_digit(next) || scan_number(lexer, true, false);
    case '!':
      if (next != '=') return false;
      break;
    case '<':
      if (next != '=' && next != '>' && next != '<') return true;
      break;
    case '>':
      if (next != '=' && next != '>') return true;
      break;
    case '=':
    case '|':
      if (next != c) return true;
      break;
    default:
      return false;
  }
  advance(lexer);
  return true;
}

static bool scan_unmarked_argument_token(TSLexer *lexer);

// Consumes one token of a module argument the way `sqlite3GetToken` does, marks its end, and returns whether SQLite's
// tokenizer accepts it.
static bool scan_argument_token(TSLexer *lexer) {
  if (lexer->lookahead == '$' || lexer->lookahead == '@' || lexer->lookahead == '#' || lexer->lookahead == ':') {
    advance(lexer);
    return scan_named_variable(lexer);
  }
  bool valid = scan_unmarked_argument_token(lexer);
  lexer->mark_end(lexer);
  return valid;
}

static bool scan_unmarked_argument_token(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  if (c == '\'' || c == '"' || c == '`') return scan_quoted(lexer, c, true);
  if (c == '[') return scan_quoted(lexer, ']', false);
  if (is_digit(c)) return scan_number(lexer, false, false);
  if (c == '?') {
    advance(lexer);
    while (is_digit(lexer->lookahead)) advance(lexer);
    return true;
  }
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

// Consumes a comment or an operator that starts with `-` or `/`, sets its symbol, and returns whether it is accepted.
static bool scan_minus_or_slash(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  bool comment = (c == '-' && lexer->lookahead == '-') || (c == '/' && lexer->lookahead == '*' && !lexer->eof(lexer));
  if (comment) {
    if (!scan_comment(lexer, c)) return false;
    lexer->result_symbol = COMMENT;
  } else {
    // `->` and `->>`.
    if (c == '-' && lexer->lookahead == '>') advance(lexer);
    if (c == '-' && lexer->lookahead == '>') advance(lexer);
    lexer->result_symbol = MODULE_ARGUMENT_TOKEN;
  }
  lexer->mark_end(lexer);
  return true;
}

// Recognizes one token of a virtual table's module argument other than a parenthesis or a comma, which the grammar
// reads itself, or a comment. SQLite passes the text of each argument to the module unparsed, but its tokenizer still
// rejects illegal tokens in it. The internal lexer cannot read these tokens, so the scanner skips the white space before
// them and reads the comments between them as well.
static bool scan_module_argument_token(TSLexer *lexer) {
  skip_spaces(lexer);
  int32_t c = lexer->lookahead;
  if (lexer->eof(lexer) || c == '(' || c == ')' || c == ',') return false;
  if (c == '-' || c == '/') return scan_minus_or_slash(lexer);
  if (!scan_argument_token(lexer)) return false;
  lexer->result_symbol = MODULE_ARGUMENT_TOKEN;
  return true;
}

// Consumes `word`, given in lower case, ignoring case, and returns whether no identifier character follows it.
static bool scan_word(TSLexer *lexer, const char *word) {
  for (; *word; word++) {
    if (lexer->lookahead != *word && lexer->lookahead != *word - 'a' + 'A') return false;
    advance(lexer);
  }
  return !is_identifier_char(lexer->lookahead);
}

// Consumes white space and comments, and returns whether something other than a lone `-` or `/` follows them.
static bool skip_spaces_and_comments(TSLexer *lexer) {
  for (;;) {
    while (is_space(lexer->lookahead) || lexer->lookahead == 0xFEFF) advance(lexer);
    int32_t c = lexer->lookahead;
    if (c != '-' && c != '/') return true;
    advance(lexer);
    bool comment = (c == '-' && lexer->lookahead == '-') || (c == '/' && lexer->lookahead == '*');
    if (!comment || !scan_comment(lexer, c)) return false;
  }
}

// Recognizes OVER followed by WINDOW, with white space and comments between them.
static bool scan_over_before_window(TSLexer *lexer) {
  if (!scan_word(lexer, "over")) return false;
  lexer->mark_end(lexer);
  if (!skip_spaces_and_comments(lexer) || !scan_word(lexer, "window")) return false;
  lexer->result_symbol = OVER_BEFORE_WINDOW;
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
  skip_spaces(lexer);
  if (valid_symbols[OVER_BEFORE_WINDOW] && !valid_symbols[MODULE_ARGUMENT_TOKEN] &&
      (lexer->lookahead == 'o' || lexer->lookahead == 'O')) {
    return scan_over_before_window(lexer);
  }
  if (valid_symbols[ILLEGAL_TOKEN]) return scan_illegal_token(lexer, valid_symbols[BLOB_LITERAL]);
  return false;
}
