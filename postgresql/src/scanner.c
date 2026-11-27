// code-gauge-allow-file fileNcss -- tree-sitter compiles one scanner.c covering PostgreSQL comments, literals, numbers, parameters, and custom operators
#include "tree_sitter/alloc.h"
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
  PLUS,
  MINUS,
  ILLEGAL_TOKEN,
  UNREACHABLE,
};

typedef struct {
  uint32_t pure_pm_end;
} Scanner;

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

static bool scan_line_comment_body(TSLexer *lexer, bool skip) {
  bool has_nul = false;
  while (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
    if (lexer->lookahead == 0) has_nul = true;
    lexer->advance(lexer, skip && !has_nul);
  }
  return !has_nul;
}

static void step_block_comment(TSLexer *lexer, unsigned *depth, bool *has_nul, bool skip_close) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == 0) *has_nul = true;
  if (c == '/' && !at_eof(lexer) && lexer->lookahead == '*') {
    advance(lexer);
    (*depth)++;
  } else if (c == '*' && !at_eof(lexer) && lexer->lookahead == '/') {
    (*depth)--;
    lexer->advance(lexer, skip_close && *depth == 0 && !*has_nul);
  }
}

static bool scan_block_comment_body(TSLexer *lexer, bool skip_close) {
  unsigned depth = 1;
  bool has_nul = false;
  while (!at_eof(lexer) && depth > 0) step_block_comment(lexer, &depth, &has_nul, skip_close);
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
      if (lexer->lookahead != '-' || !scan_line_comment_body(lexer, false)) return false;
    } else {
      return saw_newline && c == '\'';
    }
  }
}

typedef struct {
  CharArray *out;
  bool c_escapes;
  bool done;
  bool expecting_low;
  bool invalid;
} QuotedState;

static bool step_codepoint(uint32_t cp, bool *expecting_low) {
  if (cp == 0 || cp > 0x10FFFF) return false;
  bool is_high = cp >= 0xD800 && cp <= 0xDBFF;
  bool is_low = cp >= 0xDC00 && cp <= 0xDFFF;
  bool prev_high = *expecting_low;
  *expecting_low = prev_high ? false : is_high;
  return prev_high ? is_low : !is_low;
}

static void fail_quote(QuotedState *s) {
  s->invalid = true;
  s->expecting_low = false;
}

static bool scan_unicode_c_escape(TSLexer *lexer, QuotedState *s, unsigned digits) {
  advance(lexer);
  uint32_t cp = 0;
  for (unsigned i = 0; i < digits; i++) {
    if (!is_hex_digit(lexer->lookahead)) return fail_quote(s), true;
    cp = (cp << 4) | (uint32_t)hex_value(lexer->lookahead);
    advance(lexer);
  }
  if (!step_codepoint(cp, &s->expecting_low)) fail_quote(s);
  return true;
}

static bool scan_hex_byte_escape(TSLexer *lexer) {
  advance(lexer);
  if (!is_hex_digit(lexer->lookahead)) return true;
  uint32_t byte = 0;
  for (unsigned i = 0; i < 2 && is_hex_digit(lexer->lookahead); i++) {
    byte = (byte << 4) | (uint32_t)hex_value(lexer->lookahead);
    advance(lexer);
  }
  return byte != 0;
}

static bool scan_oct_byte_escape(TSLexer *lexer) {
  uint32_t byte = 0;
  for (unsigned i = 0; i < 3 && is_oct_digit(lexer->lookahead); i++) {
    byte = (byte << 3) | (uint32_t)(lexer->lookahead - '0');
    advance(lexer);
  }
  return (byte & 0xFF) != 0;
}

static bool scan_c_escape(TSLexer *lexer, QuotedState *s) {
  if (at_eof(lexer)) return false;
  int32_t c = lexer->lookahead;
  if (c == 'u' || c == 'U') return scan_unicode_c_escape(lexer, s, c == 'u' ? 4 : 8);
  if (s->expecting_low || c == 0) fail_quote(s);
  bool ok =
      c == 'x' ? scan_hex_byte_escape(lexer) : (is_oct_digit(c) ? scan_oct_byte_escape(lexer) : (advance(lexer), true));
  if (!ok) fail_quote(s);
  return true;
}

static bool step_quoted_char(TSLexer *lexer, int32_t quote, QuotedState *s) {
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == 0) return fail_quote(s), true;
  if (c == quote) {
    if (lexer->lookahead != quote) {
      if (s->expecting_low) s->invalid = true;
      s->done = true;
      return true;
    }
    advance(lexer);
  } else if (s->c_escapes && c == '\\') {
    return scan_c_escape(lexer, s);
  }
  if (s->expecting_low) fail_quote(s);
  if (s->out != NULL) array_push(s->out, c);
  return true;
}

static bool scan_quoted_segment(TSLexer *lexer, int32_t quote, bool c_escapes, CharArray *out, unsigned *count) {
  advance(lexer);
  QuotedState s = {.out = out, .c_escapes = c_escapes};
  while (!at_eof(lexer) && !s.done) {
    if (!step_quoted_char(lexer, quote, &s)) return false;
    if (!s.done) (*count)++;
  }
  return s.done && !s.invalid;
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
  if (first == '-') return lexer->lookahead == '-' && (advance(lexer), scan_line_comment_body(lexer, false));
  return lexer->lookahead == '*' && (advance(lexer), scan_block_comment_body(lexer, false));
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

static bool parse_hex_run(const CharArray *buf, unsigned *idx, unsigned digits, uint32_t *out) {
  if (*idx + digits > buf->size) return false;
  uint32_t val = 0;
  for (unsigned i = 0; i < digits; i++) {
    int32_t c = buf->contents[*idx + i];
    if (!is_hex_digit(c)) return false;
    val = (val << 4) | (uint32_t)hex_value(c);
  }
  *idx += digits;
  *out = val;
  return true;
}

static bool step_unicode_char(const CharArray *buf, unsigned *idx, int32_t esc, bool *expecting_low) {
  int32_t c = buf->contents[(*idx)++];
  if (c != esc) return !*expecting_low;
  if (*idx >= buf->size) return false;
  if (buf->contents[*idx] == esc) return (*idx)++, !*expecting_low;
  uint32_t cp = 0;
  bool ok = buf->contents[*idx] == '+' ? ((*idx)++, parse_hex_run(buf, idx, 6, &cp)) : parse_hex_run(buf, idx, 4, &cp);
  return ok && step_codepoint(cp, expecting_low);
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
    if (!overflow) {
      val = val * 10 + (lexer->lookahead - '0');
      if (val > INT32_MAX) overflow = true;
    }
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
  if (lexer->lookahead == '_') advance(lexer);
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

static uint32_t current_byte(TSLexer *lexer) {
  TSLexerPosition pos;
  lexer->get_position(lexer, &pos);
  return pos.bytes;
}

static bool is_builtin_operator(int32_t first, int32_t second, unsigned len) {
  if (len == 1) return first == '%' || first == '^' || !is_qualifying_op_char(first);
  if (len != 2) return false;
  return (first == '<' && (second == '=' || second == '>')) || (first == '>' && second == '=') ||
         (first == '!' && second == '=') || (first == '=' && second == '>');
}

static bool emit_pm_token(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, int32_t c, uint32_t pm_end) {
  enum TokenType sym = c == '+' ? PLUS : MINUS;
  if (!valid_symbols[sym]) return false;
  scanner->pure_pm_end = pm_end;
  lexer->result_symbol = sym;
  return true;
}

static bool finish_operator_tail(
    Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, int32_t single_op, bool builtin, uint32_t pm_run_end) {
  if (single_op == '+' || single_op == '-') {
    return emit_pm_token(scanner, lexer, valid_symbols, single_op, pm_run_end);
  }
  if (builtin || !emit_result(lexer, valid_symbols, CUSTOM_OPERATOR, true)) return false;
  scanner->pure_pm_end = pm_run_end;
  return true;
}

static bool is_comment_start(int32_t c, int32_t next) {
  return (c == '-' && next == '-') || (c == '/' && next == '*');
}

static bool scan_custom_operator_tail(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, int32_t first) {
  lexer->mark_end(lexer);
  bool has_qualifying = is_qualifying_op_char(first);
  unsigned total_len = 1;
  unsigned confirmed_len = 1;
  int32_t second = 0;
  uint32_t pm_run_end = 0;

  while (is_op_char(lexer->lookahead)) {
    uint32_t before_c = current_byte(lexer);
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (is_comment_start(c, lexer->lookahead)) {
      pm_run_end = before_c;
      break;
    }
    if (++total_len == 2) second = c;
    if (is_qualifying_op_char(c)) has_qualifying = true;
    if (has_qualifying || (c != '+' && c != '-')) {
      confirmed_len = total_len;
      lexer->mark_end(lexer);
      pm_run_end = 0;
    } else {
      pm_run_end = current_byte(lexer);
    }
  }
  return finish_operator_tail(
      scanner, lexer, valid_symbols, confirmed_len == 1 ? first : 0, is_builtin_operator(first, second, confirmed_len),
      pm_run_end);
}

static bool is_error_recovery(const bool *valid_symbols) {
  return valid_symbols[UNREACHABLE] && valid_symbols[BIT_STRING_LITERAL];
}

static bool scan_operator_or_comment(
    Scanner *scanner, TSLexer *lexer, const bool *valid_symbols, uint32_t start, bool *skipped_comment) {
  int32_t first = lexer->lookahead;
  if ((first == '+' || first == '-') && start < scanner->pure_pm_end) {
    if (!emit_pm_token(scanner, lexer, valid_symbols, first, scanner->pure_pm_end)) return false;
    advance(lexer);
    lexer->mark_end(lexer);
    return true;
  }
  advance(lexer);
  if (is_comment_start(first, lexer->lookahead)) {
    bool skip = is_error_recovery(valid_symbols);
    lexer->advance(lexer, first == '-' && skip);
    bool ok = first == '-' ? scan_line_comment_body(lexer, skip) : scan_block_comment_body(lexer, skip);
    if (ok && skip) {
      *skipped_comment = true;
      return false;
    }
    lexer->mark_end(lexer);
    return emit_result(lexer, valid_symbols, COMMENT, ok);
  }
  bool any_op_valid =
      valid_symbols[CUSTOM_OPERATOR] || valid_symbols[PLUS] || valid_symbols[MINUS] || valid_symbols[ILLEGAL_TOKEN];
  return any_op_valid && scan_custom_operator_tail(scanner, lexer, valid_symbols, first);
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

void *tree_sitter_postgresql_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }
void tree_sitter_postgresql_external_scanner_destroy(void *p) { ts_free(p); }

unsigned tree_sitter_postgresql_external_scanner_serialize(void *p, char *b) {
  const Scanner *s = (const Scanner *)p;
  if (s->pure_pm_end == 0) return 0;
  memcpy(b, &s->pure_pm_end, sizeof s->pure_pm_end);
  return sizeof s->pure_pm_end;
}

void tree_sitter_postgresql_external_scanner_deserialize(void *p, const char *b, unsigned n) {
  Scanner *s = (Scanner *)p;
  s->pure_pm_end = 0;
  if (n == sizeof s->pure_pm_end) memcpy(&s->pure_pm_end, b, sizeof s->pure_pm_end);
}

static bool scan_nul_run(TSLexer *lexer, const bool *valid_symbols) {
  while (!at_eof(lexer) && lexer->lookahead == 0) advance(lexer);
  lexer->mark_end(lexer);
  return emit_result(lexer, valid_symbols, ILLEGAL_TOKEN, false);
}

static bool scan_non_op_token(TSLexer *lexer, const bool *valid_symbols, int32_t c) {
  if (c == 0) return scan_nul_run(lexer, valid_symbols);
  if (c == '\'') return emit_result(lexer, valid_symbols, STRING_LITERAL, scan_string_segments(lexer, false, NULL));
  if (c == '"') return emit_result(lexer, valid_symbols, QUOTED_IDENTIFIER, scan_double_quoted(lexer, NULL));
  if (c > 0 && c < 0x80 && strchr("eEnNbBxXuU", c) != NULL) return scan_prefixed_literal(lexer, valid_symbols, c);
  if (c == '$') return scan_dollar(lexer, valid_symbols);
  return (c == '.' || is_digit(c)) && scan_illegal_number(lexer, valid_symbols, c == '.');
}

bool tree_sitter_postgresql_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  for (;;) {
    while (is_space(lexer->lookahead)) lexer->advance(lexer, true);
    if (at_eof(lexer)) return false;
    uint32_t start = current_byte(lexer);
    int32_t c = lexer->lookahead;
    if (!is_op_char(c)) {
      scanner->pure_pm_end = 0;
      return scan_non_op_token(lexer, valid_symbols, c);
    }
    if (start >= scanner->pure_pm_end) scanner->pure_pm_end = 0;
    bool skipped_comment = false;
    bool ok = scan_operator_or_comment(scanner, lexer, valid_symbols, start, &skipped_comment);
    if (!skipped_comment) return ok;
  }
}
