#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  COMMENT,
  STRING_LITERAL,
  BIT_STRING_LITERAL,
  QUOTED_IDENTIFIER,
  POSITIONAL_PARAMETER,
  CUSTOM_OPERATOR,
  ILLEGAL_TOKEN,
  UNREACHABLE,
};

typedef Array(int32_t) CharArray;

static bool at_eof(TSLexer *lexer) { return lexer->lookahead == 0 && lexer->eof(lexer); }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool is_space(int32_t c) { return c > 0 && c <= ' ' && strchr(" \t\n\r\f\v", c) != NULL; }

static bool is_horiz_space(int32_t c) { return c > 0 && c <= ' ' && strchr(" \t\f\v", c) != NULL; }

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_hex_digit(int32_t c) { return is_digit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }

static bool is_oct_digit(int32_t c) { return c >= '0' && c <= '7'; }

static bool is_bin_digit(int32_t c) { return c == '0' || c == '1'; }

static int32_t hex_value(int32_t c) {
  return is_digit(c) ? (c - '0') : ((c >= 'a' && c <= 'f') ? (c - 'a' + 10) : (c - 'A' + 10));
}

static bool is_ident_start(int32_t c) { return c >= 0x80 || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_'; }

static bool is_ident_cont(int32_t c) { return is_ident_start(c) || is_digit(c) || c == '$'; }

static bool is_qualifying_op_char(int32_t c) { return c > 0 && c < 0x80 && strchr("~!@#%^&|`?", c) != NULL; }

static bool is_op_char(int32_t c) { return c > 0 && c < 0x80 && strchr("+-*/<>=~!@#%^&|`?", c) != NULL; }

static bool emit_result(TSLexer *lexer, const bool *valid_symbols, enum TokenType symbol, bool valid) {
  enum TokenType chosen = (valid && valid_symbols[symbol]) ? symbol : ILLEGAL_TOKEN;
  if (chosen == ILLEGAL_TOKEN && !valid_symbols[ILLEGAL_TOKEN]) return false;
  lexer->result_symbol = chosen;
  return true;
}

static bool scan_line_comment_body(TSLexer *lexer) {
  bool has_nul = false;
  while (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
    if (lexer->lookahead == 0) has_nul = true;
    advance(lexer);
  }
  return !has_nul;
}

static void step_block_comment(TSLexer *lexer, unsigned *depth, bool *has_nul) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == 0) *has_nul = true;
  if (c == '/' && !at_eof(lexer) && lexer->lookahead == '*') {
    advance(lexer);
    (*depth)++;
  } else if (c == '*' && !at_eof(lexer) && lexer->lookahead == '/') {
    advance(lexer);
    (*depth)--;
  }
}

static bool scan_block_comment_body(TSLexer *lexer) {
  unsigned depth = 1;
  bool has_nul = false;
  while (!at_eof(lexer) && depth > 0) step_block_comment(lexer, &depth, &has_nul);
  return depth == 0 && !has_nul;
}

// PostgreSQL continues single-quoted literals only across whitespace and `--` line comments that include a newline.
static bool scan_quote_continuation(TSLexer *lexer) {
  bool saw_newline = false;
  for (;;) {
    int32_t c = lexer->lookahead;
    if (is_horiz_space(c)) {
      advance(lexer);
    } else if (c == '\n' || c == '\r') {
      saw_newline = true;
      advance(lexer);
    } else if (c == '-') {
      advance(lexer);
      if (lexer->lookahead != '-' || !scan_line_comment_body(lexer)) return false;
    } else {
      return saw_newline && c == '\'';
    }
  }
}

static bool step_quoted_char(TSLexer *lexer, int32_t quote, bool c_escapes, CharArray *out, bool *done, bool *has_nul) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == 0) {
    *has_nul = true;
    return true;
  }
  if (c == quote) {
    if (lexer->lookahead != quote) {
      *done = true;
      return true;
    }
    advance(lexer);
  } else if (c_escapes && c == '\\') {
    if (at_eof(lexer)) return false;
    if (lexer->lookahead == 0) *has_nul = true;
    advance(lexer);
    return true;
  }
  if (out != NULL) array_push(out, c);
  return true;
}

static bool scan_quoted_segment(TSLexer *lexer, int32_t quote, bool c_escapes, CharArray *out, unsigned *count) {
  advance(lexer);
  bool has_nul = false;
  bool done = false;
  while (!at_eof(lexer) && !done) {
    if (!step_quoted_char(lexer, quote, c_escapes, out, &done, &has_nul)) return false;
    if (!done) (*count)++;
  }
  return done && !has_nul;
}

static bool scan_string_segments(TSLexer *lexer, bool c_escapes, CharArray *out) {
  unsigned count = 0;
  for (;;) {
    if (!scan_quoted_segment(lexer, '\'', c_escapes, out, &count)) {
      lexer->mark_end(lexer);
      return false;
    }
    lexer->mark_end(lexer);
    if (!scan_quote_continuation(lexer)) return true;
  }
}

static bool scan_double_quoted(TSLexer *lexer, CharArray *out) {
  unsigned count = 0;
  bool ok = scan_quoted_segment(lexer, '"', false, out, &count) && count > 0;
  lexer->mark_end(lexer);
  return ok;
}

static bool skip_one_comment(TSLexer *lexer, int32_t first) {
  advance(lexer);
  if (first == '-') return lexer->lookahead == '-' && (advance(lexer), scan_line_comment_body(lexer));
  return lexer->lookahead == '*' && (advance(lexer), scan_block_comment_body(lexer));
}

static bool skip_spaces_and_comments(TSLexer *lexer) {
  for (;;) {
    while (is_space(lexer->lookahead)) advance(lexer);
    int32_t c = lexer->lookahead;
    if (c != '-' && c != '/') return true;
    if (!skip_one_comment(lexer, c)) return false;
  }
}

static bool match_ascii_word(TSLexer *lexer, const char *word) {
  for (; *word != '\0'; word++) {
    int32_t c = lexer->lookahead;
    if (c != *word && c != (*word - 'a' + 'A')) return false;
    advance(lexer);
  }
  return !is_ident_cont(lexer->lookahead);
}

static bool is_valid_uescape_char(int32_t c) {
  return c > 0 && c <= 0x7F && !is_hex_digit(c) && strchr("+'\"", c) == NULL && !is_space(c);
}

static bool parse_hex_run(const CharArray *buf, unsigned *idx, unsigned digits, int32_t *out) {
  if (*idx + digits > buf->size) return false;
  int32_t val = 0;
  for (unsigned i = 0; i < digits; i++) {
    int32_t c = buf->contents[*idx + i];
    if (!is_hex_digit(c)) return false;
    val = (val << 4) | hex_value(c);
  }
  *idx += digits;
  *out = val;
  return val > 0 && val <= 0x10FFFF;
}

static bool step_surrogate_state(int32_t cp, bool *expecting_low) {
  bool is_high = cp >= 0xD800 && cp <= 0xDBFF;
  bool is_low = cp >= 0xDC00 && cp <= 0xDFFF;
  if (*expecting_low) {
    *expecting_low = false;
    return is_low;
  }
  *expecting_low = is_high;
  return !is_low;
}

static bool step_unicode_char(const CharArray *buf, unsigned *idx, int32_t esc, bool *expecting_low) {
  int32_t c = buf->contents[(*idx)++];
  if (c != esc) return !*expecting_low;
  if (*idx >= buf->size) return false;
  if (buf->contents[*idx] == esc) {
    (*idx)++;
    return !*expecting_low;
  }
  int32_t cp = 0;
  bool ok = buf->contents[*idx] == '+' ? ((*idx)++, parse_hex_run(buf, idx, 6, &cp)) : parse_hex_run(buf, idx, 4, &cp);
  return ok && step_surrogate_state(cp, expecting_low);
}

static bool validate_unicode_escapes(const CharArray *buf, int32_t esc) {
  bool expecting_low = false;
  for (unsigned i = 0; i < buf->size;) {
    if (!step_unicode_char(buf, &i, esc, &expecting_low)) return false;
  }
  return !expecting_low;
}

static bool scan_uescape_clause(TSLexer *lexer, int32_t *esc_out) {
  if (!skip_spaces_and_comments(lexer) || lexer->lookahead != '\'') {
    lexer->mark_end(lexer);
    return false;
  }
  CharArray esc_buf = array_new();
  bool ok =
      scan_string_segments(lexer, false, &esc_buf) && esc_buf.size == 1 && is_valid_uescape_char(esc_buf.contents[0]);
  if (ok) *esc_out = esc_buf.contents[0];
  array_delete(&esc_buf);
  return ok;
}

static bool scan_unicode_literal(TSLexer *lexer, const bool *valid_symbols, bool is_ident) {
  CharArray body = array_new();
  bool closed = is_ident ? scan_double_quoted(lexer, &body) : scan_string_segments(lexer, false, &body);
  if (!closed) {
    array_delete(&body);
    return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
  }
  int32_t esc = '\\';
  if (skip_spaces_and_comments(lexer) && (lexer->lookahead == 'u' || lexer->lookahead == 'U') &&
      match_ascii_word(lexer, "uescape") && !scan_uescape_clause(lexer, &esc)) {
    array_delete(&body);
    return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
  }
  bool valid = validate_unicode_escapes(&body, esc);
  array_delete(&body);
  return emit_result(lexer, valid_symbols, is_ident ? QUOTED_IDENTIFIER : STRING_LITERAL, valid);
}

static bool scan_dollar_body(TSLexer *lexer, const CharArray *tag) {
  bool has_nul = false;
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == 0) has_nul = true;
    if (c != '$') continue;
    unsigned matched = 0;
    while (matched < tag->size && lexer->lookahead == tag->contents[matched]) {
      advance(lexer);
      matched++;
    }
    if (matched == tag->size && lexer->lookahead == '$') {
      advance(lexer);
      lexer->mark_end(lexer);
      return !has_nul;
    }
  }
  lexer->mark_end(lexer);
  return false;
}

static bool scan_positional_param(TSLexer *lexer, const bool *valid_symbols) {
  int64_t val = 0;
  bool overflow = false;
  while (is_digit(lexer->lookahead)) {
    val = val * 10 + (lexer->lookahead - '0');
    if (val > INT32_MAX) overflow = true;
    advance(lexer);
  }
  bool trailing = is_ident_cont(lexer->lookahead);
  while (is_ident_cont(lexer->lookahead)) advance(lexer);
  lexer->mark_end(lexer);
  return emit_result(lexer, valid_symbols, POSITIONAL_PARAMETER, !overflow && !trailing);
}

static bool scan_dollar(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  if (is_digit(lexer->lookahead)) return scan_positional_param(lexer, valid_symbols);
  if (lexer->lookahead != '$' && !is_ident_start(lexer->lookahead)) {
    lexer->mark_end(lexer);
    return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
  }
  CharArray tag = array_new();
  while (lexer->lookahead != '$' && is_ident_cont(lexer->lookahead)) {
    array_push(&tag, lexer->lookahead);
    advance(lexer);
  }
  if (lexer->lookahead != '$') {
    array_delete(&tag);
    lexer->mark_end(lexer);
    return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
  }
  advance(lexer);
  bool ok = scan_dollar_body(lexer, &tag);
  array_delete(&tag);
  return emit_result(lexer, valid_symbols, STRING_LITERAL, ok);
}

static bool scan_digits(TSLexer *lexer, bool (*valid_digit)(int32_t), bool after_digit) {
  bool valid = true;
  while (valid_digit(lexer->lookahead) || lexer->lookahead == '_') {
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

static bool finish_number(TSLexer *lexer, bool valid) {
  if (!is_ident_cont(lexer->lookahead)) return valid;
  while (is_ident_cont(lexer->lookahead)) advance(lexer);
  return false;
}

static bool scan_fraction_and_exponent(TSLexer *lexer) {
  bool valid = true;
  if (is_digit(lexer->lookahead) || lexer->lookahead == '_') valid = scan_digits(lexer, is_digit, false);
  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    advance(lexer);
    if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
    if (!is_digit(lexer->lookahead)) return finish_number(lexer, false);
    valid = scan_digits(lexer, is_digit, false) && valid;
  }
  return finish_number(lexer, valid);
}

static bool scan_decimal_number(TSLexer *lexer, bool after_digit) {
  bool valid = scan_digits(lexer, is_digit, after_digit);
  if (lexer->lookahead == '.') {
    advance(lexer);
    if (lexer->lookahead == '.') return valid;
  }
  return scan_fraction_and_exponent(lexer) && valid;
}

static bool scan_radix_number(TSLexer *lexer, bool (*valid_digit)(int32_t)) {
  advance(lexer);
  if (!valid_digit(lexer->lookahead)) return finish_number(lexer, false);
  return finish_number(lexer, scan_digits(lexer, valid_digit, false));
}

static bool scan_number(TSLexer *lexer) {
  if (lexer->lookahead != '0') return scan_decimal_number(lexer, false);
  advance(lexer);
  int32_t c = lexer->lookahead;
  if (c == 'x' || c == 'X') return scan_radix_number(lexer, is_hex_digit);
  if (c == 'o' || c == 'O') return scan_radix_number(lexer, is_oct_digit);
  if (c == 'b' || c == 'B') return scan_radix_number(lexer, is_bin_digit);
  return scan_decimal_number(lexer, true);
}

static bool is_builtin_operator(int32_t first, int32_t second, unsigned len) {
  if (len == 1) return first == '%' || first == '^' || !is_qualifying_op_char(first);
  if (len != 2) return false;
  return (first == '<' && (second == '=' || second == '>')) || (first == '>' && second == '=') ||
         (first == '!' && second == '=') || (first == '=' && second == '>');
}

static bool scan_custom_operator_tail(TSLexer *lexer, const bool *valid_symbols, int32_t first) {
  lexer->mark_end(lexer);
  bool has_qualifying = is_qualifying_op_char(first);
  unsigned total_len = 1;
  unsigned confirmed_len = 1;
  int32_t second = 0;

  while (is_op_char(lexer->lookahead)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if ((c == '-' && lexer->lookahead == '-') || (c == '/' && lexer->lookahead == '*')) break;
    if (++total_len == 2) second = c;
    if (is_qualifying_op_char(c)) has_qualifying = true;
    if (has_qualifying || (c != '+' && c != '-')) {
      confirmed_len = total_len;
      lexer->mark_end(lexer);
    }
  }
  return !is_builtin_operator(first, second, confirmed_len) && emit_result(lexer, valid_symbols, CUSTOM_OPERATOR, true);
}

static bool scan_operator_or_comment(TSLexer *lexer, const bool *valid_symbols) {
  int32_t first = lexer->lookahead;
  advance(lexer);
  if ((first == '-' && lexer->lookahead == '-') || (first == '/' && lexer->lookahead == '*')) {
    advance(lexer);
    bool ok = first == '-' ? scan_line_comment_body(lexer) : scan_block_comment_body(lexer);
    lexer->mark_end(lexer);
    return emit_result(lexer, valid_symbols, COMMENT, ok);
  }
  return scan_custom_operator_tail(lexer, valid_symbols, first);
}

static bool scan_prefixed_literal(TSLexer *lexer, const bool *valid_symbols, int32_t prefix) {
  advance(lexer);
  if (prefix == 'u' || prefix == 'U') {
    if (lexer->lookahead != '&') return false;
    advance(lexer);
    return (lexer->lookahead == '\'' || lexer->lookahead == '"') &&
           scan_unicode_literal(lexer, valid_symbols, lexer->lookahead == '"');
  }
  if (lexer->lookahead != '\'') return false;
  bool is_bit = prefix == 'b' || prefix == 'B' || prefix == 'x' || prefix == 'X';
  return emit_result(lexer, valid_symbols, is_bit ? BIT_STRING_LITERAL : STRING_LITERAL,
                     scan_string_segments(lexer, prefix == 'e' || prefix == 'E', NULL));
}

static bool scan_illegal_number(TSLexer *lexer, const bool *valid_symbols, bool leading_dot) {
  bool valid = leading_dot ? (advance(lexer), !is_digit(lexer->lookahead) || scan_fraction_and_exponent(lexer))
                           : scan_number(lexer);
  if (valid) return false;
  lexer->mark_end(lexer);
  return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
}

void *tree_sitter_postgresql_external_scanner_create(void) { return NULL; }
void tree_sitter_postgresql_external_scanner_destroy(void *p) { (void)p; }
unsigned tree_sitter_postgresql_external_scanner_serialize(void *p, char *b) { return (void)p, (void)b, 0; }
void tree_sitter_postgresql_external_scanner_deserialize(void *p, const char *b, unsigned n) { (void)p, (void)b, (void)n; }

bool tree_sitter_postgresql_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  while (is_space(lexer->lookahead)) lexer->advance(lexer, true);
  if (at_eof(lexer)) return false;
  int32_t c = lexer->lookahead;
  if (c == 0) {
    while (!at_eof(lexer) && lexer->lookahead == 0) advance(lexer);
    lexer->mark_end(lexer);
    return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
  }
  if (c == '\'') return emit_result(lexer, valid_symbols, STRING_LITERAL, scan_string_segments(lexer, false, NULL));
  if (c == '"') return emit_result(lexer, valid_symbols, QUOTED_IDENTIFIER, scan_double_quoted(lexer, NULL));
  if (c > 0 && c < 0x80 && strchr("eEnNbBxXuU", c) != NULL) return scan_prefixed_literal(lexer, valid_symbols, c);
  if (c == '$') return scan_dollar(lexer, valid_symbols);
  if (c == '.' || is_digit(c)) return scan_illegal_number(lexer, valid_symbols, c == '.');
  return is_op_char(c) && scan_operator_or_comment(lexer, valid_symbols);
}
