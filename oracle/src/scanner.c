#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
  ILLEGAL_TOKEN,
  UNREACHABLE,
  ERROR_SENTINEL,
  DIVISION_GUARD,
  COMMENT,
  STRING_LITERAL,
  QUOTED_IDENTIFIER,
  NUMERIC_LITERAL,
  SIZE_LITERAL,
  BIND_VARIABLE,
  SLASH_TERMINATOR,
};

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_identifier_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= 0x80 && c != 0xFEFF);
}

static bool is_identifier_char(int32_t c) {
  return is_identifier_start(c) || is_digit(c) || c == '_' || c == '$' || c == '#';
}

static bool is_size_unit(int32_t c) {
  return c == 'k' || c == 'K' || c == 'm' || c == 'M' || c == 'g' || c == 'G' || c == 't' || c == 'T' || c == 'p' ||
         c == 'P' || c == 'e' || c == 'E';
}

static bool at_eof(TSLexer *lexer) { return lexer->lookahead == 0 && lexer->eof(lexer); }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static enum TokenType error_token(const bool *valid_symbols) {
  return valid_symbols[ERROR_SENTINEL] ? ERROR_SENTINEL : ILLEGAL_TOKEN;
}

static bool emit_token(TSLexer *lexer, const bool *valid_symbols, enum TokenType symbol, bool valid) {
  lexer->mark_end(lexer);
  lexer->result_symbol = (valid && valid_symbols[symbol]) ? symbol : error_token(valid_symbols);
  return true;
}

static bool emit_illegal(TSLexer *lexer, const bool *valid_symbols) {
  lexer->mark_end(lexer);
  lexer->result_symbol = error_token(valid_symbols);
  return true;
}

static void skip_identifier_chars(TSLexer *lexer) {
  while (is_identifier_char(lexer->lookahead)) advance(lexer);
}

// Advances one character when not at EOF and records whether a raw NUL byte was encountered, while continuing to the
// closing delimiter so a NUL inside a literal or comment does not leave its closing delimiter unconsumed.
static bool next_char(TSLexer *lexer, int32_t *out, bool *has_nul) {
  if (at_eof(lexer)) return false;
  int32_t c = lexer->lookahead;
  advance(lexer);
  if (c == 0) *has_nul = true;
  *out = c;
  return true;
}

static bool skip_spaces(TSLexer *lexer) {
  TSLexerPosition pos;
  lexer->get_position(lexer, &pos);
  bool line_only_hspace = pos.column == 0;
  for (;;) {
    int32_t c = lexer->lookahead;
    if (c == '\n' || c == '\r') {
      line_only_hspace = true;
    } else if (c == '\f' || c == '\v') {
      line_only_hspace = false;
    } else if (c == 0xFEFF) {
      if (pos.bytes != 0) line_only_hspace = false;
    } else if (c != ' ' && c != '\t') {
      return line_only_hspace;
    }
    lexer->advance(lexer, true);
  }
}

// During error recovery (`ERROR_SENTINEL` is valid only in `ERROR_STATE`), emitting `COMMENT` triggers `SHIFT_EXTRA`
// recovery back to the enclosing construct on every commented line (`O(n^2)` reallocations); emitting `ERROR_SENTINEL`
// (which no normal parse state accepts) keeps recovery inside `ERROR_STATE` in `O(1)` per comment.
static enum TokenType comment_symbol(const bool *valid_symbols) {
  return valid_symbols[ERROR_SENTINEL] ? ERROR_SENTINEL : COMMENT;
}

static bool scan_line_comment(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  bool has_nul = false;
  while (!at_eof(lexer) && lexer->lookahead != '\n') {
    if (lexer->lookahead == 0) has_nul = true;
    advance(lexer);
  }
  return emit_token(lexer, valid_symbols, comment_symbol(valid_symbols), !has_nul);
}

static bool scan_block_comment(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  bool star = false;
  bool has_nul = false;
  int32_t c = 0;
  while (next_char(lexer, &c, &has_nul)) {
    if (star && c == '/') return emit_token(lexer, valid_symbols, comment_symbol(valid_symbols), !has_nul);
    star = c == '*';
  }
  return emit_illegal(lexer, valid_symbols);
}

static bool word_equals(const char *buf, unsigned len, const char *kw) {
  unsigned i = 0;
  while (kw[i] != '\0') {
    if (i >= len || buf[i] != kw[i]) return false;
    i++;
  }
  return i == len;
}

static unsigned read_upper_word(TSLexer *lexer, char *buf, unsigned cap) {
  unsigned len = 0;
  while (is_identifier_char(lexer->lookahead)) {
    int32_t c = lexer->lookahead;
    if (len < cap) buf[len] = (char)((c >= 'a' && c <= 'z') ? (c - 'a' + 'A') : c);
    len++;
    advance(lexer);
  }
  return len;
}

static bool is_lookahead_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v' || c == 0xFEFF;
}

static void skip_ascii_spaces(TSLexer *lexer) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    advance(lexer);
  }
}

static void skip_block_comment_lookahead(TSLexer *lexer) {
  advance(lexer);
  bool star = false;
  while (!at_eof(lexer)) {
    int32_t ch = lexer->lookahead;
    advance(lexer);
    if (star && ch == '/') return;
    star = ch == '*';
  }
}

static int skip_one_comment_lookahead(TSLexer *lexer) {
  if (lexer->lookahead == '-') {
    advance(lexer);
    if (lexer->lookahead != '-') return -1;
    while (!at_eof(lexer) && lexer->lookahead != '\n') advance(lexer);
    return 1;
  }
  if (lexer->lookahead == '/') {
    advance(lexer);
    if (lexer->lookahead != '*') return 2;
    skip_block_comment_lookahead(lexer);
    return 1;
  }
  return 0;
}

static int skip_ws_and_comments_lookahead(TSLexer *lexer) {
  for (;;) {
    while (is_lookahead_space(lexer->lookahead)) advance(lexer);
    int res = skip_one_comment_lookahead(lexer);
    if (res != 1) return res;
  }
}

static bool is_reserved_stmt_starter(const char *w, unsigned len) {
  return word_equals(w, len, "SELECT") || word_equals(w, len, "WITH") || word_equals(w, len, "INSERT") ||
         word_equals(w, len, "UPDATE") || word_equals(w, len, "DELETE") || word_equals(w, len, "CREATE") ||
         word_equals(w, len, "ALTER") || word_equals(w, len, "DROP") || word_equals(w, len, "RENAME") ||
         word_equals(w, len, "COMMENT") || word_equals(w, len, "GRANT") || word_equals(w, len, "REVOKE") ||
         word_equals(w, len, "LOCK") || word_equals(w, len, "SET") || word_equals(w, len, "AUDIT") ||
         word_equals(w, len, "NOAUDIT");
}

static bool is_nonreserved_stmt_starter(const char *w, unsigned len) {
  return word_equals(w, len, "DECLARE") || word_equals(w, len, "BEGIN") || word_equals(w, len, "MERGE") ||
         word_equals(w, len, "TRUNCATE") || word_equals(w, len, "COMMIT") || word_equals(w, len, "ROLLBACK") ||
         word_equals(w, len, "SAVEPOINT") || word_equals(w, len, "CALL") || word_equals(w, len, "PURGE") ||
         word_equals(w, len, "FLASHBACK") || word_equals(w, len, "EXPLAIN") || word_equals(w, len, "ANALYZE") ||
         word_equals(w, len, "ADMINISTER") || word_equals(w, len, "ASSOCIATE") || word_equals(w, len, "DISASSOCIATE");
}

static bool is_query_clause_follower(const char *w, unsigned len) {
  return word_equals(w, len, "FROM") || word_equals(w, len, "WHERE") || word_equals(w, len, "GROUP") ||
         word_equals(w, len, "HAVING") || word_equals(w, len, "ORDER") || word_equals(w, len, "FETCH") ||
         word_equals(w, len, "OFFSET") || word_equals(w, len, "UNION") || word_equals(w, len, "INTERSECT") ||
         word_equals(w, len, "MINUS") || word_equals(w, len, "EXCEPT") || word_equals(w, len, "AS");
}

static bool is_expr_continuation_punct(int32_t c) {
  return c == '(' || c == '.' || c == '@' || c == ',' || c == '+' || c == '-' || c == '*';
}

static bool nonreserved_starts_stmt(TSLexer *lexer) {
  skip_ascii_spaces(lexer);
  int32_t next = lexer->lookahead;
  if (is_expr_continuation_punct(next)) return false;
  if (!is_identifier_start(next)) return true;
  char w2[16];
  unsigned len2 = read_upper_word(lexer, w2, sizeof(w2));
  return !is_query_clause_follower(w2, len2);
}

static bool slash_precedes_new_unit(TSLexer *lexer) {
  int skipped = skip_ws_and_comments_lookahead(lexer);
  if (skipped != 0) return skipped > 0;
  if (at_eof(lexer) || lexer->lookahead == ';') return true;
  if (lexer->lookahead == '<') {
    advance(lexer);
    return lexer->lookahead == '<';
  }
  if (!is_identifier_start(lexer->lookahead)) return false;
  char w[16];
  unsigned len = read_upper_word(lexer, w, sizeof(w));
  if (is_reserved_stmt_starter(w, len)) return true;
  return is_nonreserved_stmt_starter(w, len) && nonreserved_starts_stmt(lexer);
}

static bool scan_slash(TSLexer *lexer, const bool *valid_symbols, bool line_only_hspace) {
  advance(lexer);
  if (lexer->lookahead == '*') return scan_block_comment(lexer, valid_symbols);
  if (!line_only_hspace || !valid_symbols[SLASH_TERMINATOR]) return false;
  lexer->mark_end(lexer);
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') advance(lexer);
  if (!at_eof(lexer) && lexer->lookahead != '\n' && lexer->lookahead != '\r') return false;
  if (valid_symbols[DIVISION_GUARD] && !slash_precedes_new_unit(lexer)) return false;
  lexer->result_symbol = SLASH_TERMINATOR;
  return true;
}

static bool scan_standard_string(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  bool has_nul = false;
  int32_t c = 0;
  while (next_char(lexer, &c, &has_nul)) {
    if (c != '\'') continue;
    if (lexer->lookahead != '\'') return emit_token(lexer, valid_symbols, STRING_LITERAL, !has_nul);
    advance(lexer);
  }
  return emit_illegal(lexer, valid_symbols);
}

static int32_t closing_quote_delimiter(int32_t open) {
  if (open == '[') return ']';
  if (open == '{') return '}';
  if (open == '<') return '>';
  if (open == '(') return ')';
  return open;
}

// Oracle alternative-quoted text literals (`q'<d>...<close_d>'` and `nq'...'`). Consuming unclosed literals to EOF as
// ILLEGAL_TOKEN ensures strictly linear O(n) character reads on malformed inputs.
static bool scan_q_string(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  bool has_nul = false;
  int32_t open = 0;
  if (!next_char(lexer, &open, &has_nul) || open == 0 || open == ' ' || open == '\t' || open == '\r' || open == '\n') {
    return emit_illegal(lexer, valid_symbols);
  }
  int32_t close = closing_quote_delimiter(open);
  int32_t c = 0;
  while (next_char(lexer, &c, &has_nul)) {
    if (c == close && lexer->lookahead == '\'') {
      advance(lexer);
      return emit_token(lexer, valid_symbols, STRING_LITERAL, !has_nul);
    }
  }
  return emit_illegal(lexer, valid_symbols);
}

static bool scan_prefixed_string(TSLexer *lexer, const bool *valid_symbols, int32_t first) {
  advance(lexer);
  if (first == 'n' || first == 'N') {
    if (lexer->lookahead == '\'') return scan_standard_string(lexer, valid_symbols);
    if (lexer->lookahead != 'q' && lexer->lookahead != 'Q') return false;
    advance(lexer);
  }
  return lexer->lookahead == '\'' ? scan_q_string(lexer, valid_symbols) : false;
}

// Oracle double-quoted identifiers prohibit empty `""`, NUL bytes, and doubled `""` escapes.
static bool scan_quoted_name(TSLexer *lexer, const bool *valid_symbols, enum TokenType symbol) {
  advance(lexer);
  bool has_nul = false;
  int32_t c = 0;
  if (!next_char(lexer, &c, &has_nul) || c == '"') return emit_illegal(lexer, valid_symbols);
  while (next_char(lexer, &c, &has_nul)) {
    if (c == '"') return emit_token(lexer, valid_symbols, symbol, !has_nul);
  }
  return emit_illegal(lexer, valid_symbols);
}

static bool scan_exponent_digits(TSLexer *lexer) {
  if (lexer->lookahead == '+' || lexer->lookahead == '-') advance(lexer);
  if (!is_digit(lexer->lookahead)) {
    skip_identifier_chars(lexer);
    return false;
  }
  while (is_digit(lexer->lookahead)) advance(lexer);
  return true;
}

static bool is_float_suffix(int32_t c) { return c == 'f' || c == 'F' || c == 'd' || c == 'D'; }

static bool is_exponent_start(int32_t unit, int32_t next) {
  return (unit == 'e' || unit == 'E') && (next == '+' || next == '-' || is_digit(next));
}

static bool finish_number_tail(TSLexer *lexer, const bool *valid_symbols, bool allow_size_unit) {
  if (allow_size_unit && is_size_unit(lexer->lookahead)) {
    int32_t unit = lexer->lookahead;
    advance(lexer);
    if (!is_exponent_start(unit, lexer->lookahead)) {
      bool clean_end = !is_identifier_char(lexer->lookahead);
      if (!clean_end) skip_identifier_chars(lexer);
      return emit_token(lexer, valid_symbols, SIZE_LITERAL, clean_end);
    }
    if (!scan_exponent_digits(lexer)) return emit_illegal(lexer, valid_symbols);
  } else if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    advance(lexer);
    if (!scan_exponent_digits(lexer)) return emit_illegal(lexer, valid_symbols);
  }
  if (is_float_suffix(lexer->lookahead)) advance(lexer);
  bool clean_end = !is_identifier_char(lexer->lookahead);
  if (!clean_end) skip_identifier_chars(lexer);
  return emit_token(lexer, valid_symbols, NUMERIC_LITERAL, clean_end);
}

static bool scan_number(TSLexer *lexer, const bool *valid_symbols, bool after_dot) {
  bool allow_size_unit = !after_dot && valid_symbols[SIZE_LITERAL] && !valid_symbols[ERROR_SENTINEL];
  while (is_digit(lexer->lookahead)) advance(lexer);
  if (after_dot) return finish_number_tail(lexer, valid_symbols, false);
  lexer->mark_end(lexer);
  if (lexer->lookahead != '.') return finish_number_tail(lexer, valid_symbols, allow_size_unit);
  advance(lexer);
  // Leave `..` intact for PL/SQL range bounds such as `FOR i IN 1..10 LOOP`.
  if (lexer->lookahead == '.') {
    lexer->result_symbol = valid_symbols[NUMERIC_LITERAL] ? NUMERIC_LITERAL : error_token(valid_symbols);
    return true;
  }
  while (is_digit(lexer->lookahead)) advance(lexer);
  return finish_number_tail(lexer, valid_symbols, false);
}

static bool scan_bind_variable(TSLexer *lexer, const bool *valid_symbols) {
  advance(lexer);
  int32_t c = lexer->lookahead;
  if (c == '=') return false;
  if (is_identifier_start(c)) {
    skip_identifier_chars(lexer);
    return emit_token(lexer, valid_symbols, BIND_VARIABLE, true);
  }
  if (is_digit(c)) {
    while (is_digit(lexer->lookahead)) advance(lexer);
    bool clean_end = !is_identifier_char(lexer->lookahead);
    if (!clean_end) skip_identifier_chars(lexer);
    return emit_token(lexer, valid_symbols, BIND_VARIABLE, clean_end);
  }
  return c == '"' ? scan_quoted_name(lexer, valid_symbols, BIND_VARIABLE) : false;
}

static bool is_prefixed_string_start(int32_t c) { return c == 'q' || c == 'Q' || c == 'n' || c == 'N'; }

static bool scan_punctuation_or_number(TSLexer *lexer, const bool *valid_symbols, bool line_only_hspace, int32_t c) {
  if (c == '-') {
    advance(lexer);
    return lexer->lookahead == '-' ? scan_line_comment(lexer, valid_symbols) : false;
  }
  if (c == '/') return scan_slash(lexer, valid_symbols, line_only_hspace);
  if (c == '.') {
    advance(lexer);
    return is_digit(lexer->lookahead) ? scan_number(lexer, valid_symbols, true) : false;
  }
  if (is_digit(c)) return scan_number(lexer, valid_symbols, false);
  return c == ':' && valid_symbols[BIND_VARIABLE] ? scan_bind_variable(lexer, valid_symbols) : false;
}

void *tree_sitter_oracle_external_scanner_create(void) { return NULL; }

void tree_sitter_oracle_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_oracle_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_oracle_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_oracle_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  bool line_only_hspace = skip_spaces(lexer);
  int32_t c = lexer->lookahead;
  if (c == 0) {
    if (lexer->eof(lexer)) return false;
    while (!at_eof(lexer) && lexer->lookahead == 0) advance(lexer);
    return emit_illegal(lexer, valid_symbols);
  }
  if (c == '\'') return scan_standard_string(lexer, valid_symbols);
  if (is_prefixed_string_start(c)) return scan_prefixed_string(lexer, valid_symbols, c);
  if (c == '"') return scan_quoted_name(lexer, valid_symbols, QUOTED_IDENTIFIER);
  return scan_punctuation_or_number(lexer, valid_symbols, line_only_hspace, c);
}
