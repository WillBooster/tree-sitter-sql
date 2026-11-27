// code-gauge-allow-file fileNcss -- tree-sitter compiles one scanner.c covering Oracle comments, literals, numbers, and persistent FK column tries
#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  ILLEGAL_TOKEN,
  UNREACHABLE,
  ERROR_SENTINEL,
  COMMENT,
  STRING_LITERAL,
  QUOTED_IDENTIFIER,
  NUMERIC_LITERAL,
  WHOLE_NUMBER_LITERAL,
  SIZE_LITERAL,
  BIND_VARIABLE,
  REL_TABLE_OPEN,
  CAPTURE_NAME,
  COMMIT_TYPELESS_COL,
  COMMIT_FK_COL,
  REL_TABLE_CLOSE_RESOLVED,
  REL_TABLE_CLOSE_UNRESOLVED,
};

typedef struct {
  uint32_t lo;
  uint32_t eq;
  uint32_t hi;
  uint8_t ch;
  uint8_t state;
} TrieNode;

typedef struct {
  uint32_t trie_root;
  uint32_t key_off;
  uint32_t key_len;
} TableState;

typedef struct {
  TrieNode *nodes;
  uint32_t node_len;
  uint32_t node_cap;
  TableState *states;
  uint32_t state_len;
  uint32_t state_cap;
  uint8_t *keys;
  uint32_t key_len;
  uint32_t key_cap;
  uint32_t root;
  uint32_t unresolved;
} Scanner;

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

static bool is_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f' || c == '\v' || c == 0xFEFF;
}

static void skip_spaces(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) lexer->advance(lexer, true);
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

static void append_key_byte(Scanner *s, uint8_t b) {
  if (s->key_len >= s->key_cap) {
    uint32_t next_cap = s->key_cap ? s->key_cap * 2 : 256;
    s->keys = (uint8_t *)ts_realloc(s->keys, next_cap * sizeof(uint8_t));
    s->key_cap = next_cap;
  }
  s->keys[s->key_len++] = b;
}

static void append_key_utf8(Scanner *s, int32_t cp) {
  if (cp < 0x80) {
    append_key_byte(s, (uint8_t)cp);
  } else if (cp < 0x800) {
    append_key_byte(s, (uint8_t)(0xC0 | (cp >> 6)));
    append_key_byte(s, (uint8_t)(0x80 | (cp & 0x3F)));
  } else if (cp < 0x10000) {
    append_key_byte(s, (uint8_t)(0xE0 | (cp >> 12)));
    append_key_byte(s, (uint8_t)(0x80 | ((cp >> 6) & 0x3F)));
    append_key_byte(s, (uint8_t)(0x80 | (cp & 0x3F)));
  } else {
    append_key_byte(s, (uint8_t)(0xF0 | (cp >> 18)));
    append_key_byte(s, (uint8_t)(0x80 | ((cp >> 12) & 0x3F)));
    append_key_byte(s, (uint8_t)(0x80 | ((cp >> 6) & 0x3F)));
    append_key_byte(s, (uint8_t)(0x80 | (cp & 0x3F)));
  }
}

static uint32_t push_trie_node(Scanner *s, TrieNode node) {
  if (s->node_len == 0) {
    s->node_cap = 64;
    s->nodes = (TrieNode *)ts_calloc(s->node_cap, sizeof(TrieNode));
    s->node_len = 1;
  } else if (s->node_len >= s->node_cap) {
    uint32_t next_cap = s->node_cap * 2;
    s->nodes = (TrieNode *)ts_realloc(s->nodes, next_cap * sizeof(TrieNode));
    s->node_cap = next_cap;
  }
  uint32_t idx = s->node_len++;
  s->nodes[idx] = node;
  return idx;
}

static uint32_t push_table_state(Scanner *s, uint32_t trie_root, uint32_t key_off, uint32_t key_len) {
  if (s->state_len == 0) {
    s->state_cap = 32;
    s->states = (TableState *)ts_calloc(s->state_cap, sizeof(TableState));
    s->state_len = 1;
  } else if (s->state_len >= s->state_cap) {
    uint32_t next_cap = s->state_cap * 2;
    s->states = (TableState *)ts_realloc(s->states, next_cap * sizeof(TableState));
    s->state_cap = next_cap;
  }
  uint32_t idx = s->state_len++;
  s->states[idx] = (TableState){trie_root, key_off, key_len};
  return idx;
}

static uint8_t trie_get(const Scanner *s, uint32_t root, const uint8_t *key, uint32_t len) {
  uint32_t cur = root;
  uint32_t i = 0;
  while (cur != 0 && i < len) {
    const TrieNode *n = &s->nodes[cur];
    uint8_t b = key[i];
    if (b < n->ch) {
      cur = n->lo;
    } else if (b > n->ch) {
      cur = n->hi;
    } else {
      i++;
      if (i == len) return n->state;
      cur = n->eq;
    }
  }
  return 0;
}

static void link_trie_child(Scanner *s, uint32_t parent, uint8_t dir, uint32_t child, uint32_t *new_root) {
  if (dir == 0) {
    *new_root = child;
  } else if (dir == 1) {
    s->nodes[parent].lo = child;
  } else if (dir == 2) {
    s->nodes[parent].eq = child;
  } else {
    s->nodes[parent].hi = child;
  }
}

static uint32_t trie_set(Scanner *s, uint32_t root, const uint8_t *key, uint32_t len, uint8_t val) {
  uint32_t new_root = 0;
  uint32_t parent = 0;
  uint32_t cur = root;
  uint8_t dir = 0;
  uint32_t i = 0;
  while (i < len) {
    uint8_t b = key[i];
    TrieNode copy = cur != 0 ? s->nodes[cur] : (TrieNode){0, 0, 0, b, 0};
    uint32_t idx = push_trie_node(s, copy);
    link_trie_child(s, parent, dir, idx, &new_root);
    parent = idx;
    if (b < copy.ch) {
      cur = copy.lo;
      dir = 1;
    } else if (b > copy.ch) {
      cur = copy.hi;
      dir = 3;
    } else {
      i++;
      if (i == len) {
        s->nodes[idx].state = val;
        break;
      }
      cur = copy.eq;
      dir = 2;
    }
  }
  return new_root;
}

static void capture_pending_name(Scanner *s, TSLexer *lexer) {
  uint32_t key_off = s->key_len;
  int32_t c = lexer->lookahead;
  if (c == '"') {
    advance(lexer);
    while (!at_eof(lexer) && lexer->lookahead != '"') {
      append_key_utf8(s, lexer->lookahead);
      advance(lexer);
    }
  } else if (is_identifier_start(c)) {
    while (is_identifier_char(lexer->lookahead)) {
      int32_t ch = lexer->lookahead;
      append_key_utf8(s, (ch >= 'a' && ch <= 'z') ? (ch - 'a' + 'A') : ch);
      advance(lexer);
    }
    if (lexer->lookahead == '\'') s->key_len = key_off;
  }
  uint32_t key_len = s->key_len - key_off;
  uint32_t cur_trie = s->root != 0 ? s->states[s->root].trie_root : 0;
  s->root = push_table_state(s, cur_trie, key_off, key_len);
}

static void commit_typeless_col(Scanner *s) {
  if (s->root == 0) return;
  TableState st = s->states[s->root];
  if (st.key_len == 0) return;
  uint8_t prev = trie_get(s, st.trie_root, s->keys + st.key_off, st.key_len);
  if (prev != 0) {
    s->root = push_table_state(s, st.trie_root, 0, 0);
    return;
  }
  uint32_t next_trie = trie_set(s, st.trie_root, s->keys + st.key_off, st.key_len, 1);
  s->root = push_table_state(s, next_trie, 0, 0);
  s->unresolved++;
}

static void commit_fk_col(Scanner *s) {
  if (s->root == 0) return;
  TableState st = s->states[s->root];
  if (st.key_len == 0) return;
  uint8_t prev = trie_get(s, st.trie_root, s->keys + st.key_off, st.key_len);
  if (prev == 2) {
    s->root = push_table_state(s, st.trie_root, 0, 0);
    return;
  }
  uint32_t next_trie = trie_set(s, st.trie_root, s->keys + st.key_off, st.key_len, 2);
  s->root = push_table_state(s, next_trie, 0, 0);
  if (prev == 1 && s->unresolved > 0) s->unresolved--;
}

static bool emit_zero_width(TSLexer *lexer, enum TokenType symbol) {
  lexer->mark_end(lexer);
  lexer->result_symbol = symbol;
  return true;
}

static bool scan_rel_table_step(Scanner *s, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[ERROR_SENTINEL] || s == NULL) return false;
  int32_t c = lexer->lookahead;
  if (valid_symbols[REL_TABLE_OPEN]) {
    s->root = 0;
    s->unresolved = 0;
    return emit_zero_width(lexer, REL_TABLE_OPEN);
  }
  if (valid_symbols[COMMIT_TYPELESS_COL] && (c == ',' || c == ')')) {
    commit_typeless_col(s);
    return emit_zero_width(lexer, COMMIT_TYPELESS_COL);
  }
  if (valid_symbols[COMMIT_FK_COL] && (c == ',' || c == ')')) {
    commit_fk_col(s);
    return emit_zero_width(lexer, COMMIT_FK_COL);
  }
  if (valid_symbols[CAPTURE_NAME]) {
    lexer->mark_end(lexer);
    capture_pending_name(s, lexer);
    lexer->result_symbol = CAPTURE_NAME;
    return true;
  }
  if (s->unresolved == 0 && valid_symbols[REL_TABLE_CLOSE_RESOLVED]) {
    s->root = 0;
    return emit_zero_width(lexer, REL_TABLE_CLOSE_RESOLVED);
  }
  if (s->unresolved > 0 && valid_symbols[REL_TABLE_CLOSE_UNRESOLVED]) {
    s->root = 0;
    s->unresolved = 0;
    return emit_zero_width(lexer, REL_TABLE_CLOSE_UNRESOLVED);
  }
  return false;
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

static enum TokenType numeric_token_type(const bool *valid_symbols, bool is_integer) {
  return is_integer && valid_symbols[WHOLE_NUMBER_LITERAL] && !valid_symbols[NUMERIC_LITERAL]
           ? WHOLE_NUMBER_LITERAL
           : NUMERIC_LITERAL;
}

static bool finish_size_or_exponent(TSLexer *lexer, const bool *valid_symbols, bool *out_done, bool *out_result) {
  int32_t unit = lexer->lookahead;
  advance(lexer);
  if (!is_exponent_start(unit, lexer->lookahead)) {
    bool clean_end = !is_identifier_char(lexer->lookahead);
    if (!clean_end) skip_identifier_chars(lexer);
    *out_done = true;
    *out_result = emit_token(lexer, valid_symbols, SIZE_LITERAL, clean_end);
    return true;
  }
  *out_done = false;
  return scan_exponent_digits(lexer);
}

static bool finish_number_tail(TSLexer *lexer, const bool *valid_symbols, bool allow_size_unit, bool is_integer) {
  if (allow_size_unit && is_size_unit(lexer->lookahead)) {
    bool done = false;
    bool result = false;
    if (!finish_size_or_exponent(lexer, valid_symbols, &done, &result)) return emit_illegal(lexer, valid_symbols);
    if (done) return result;
    is_integer = false;
  } else if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    is_integer = false;
    advance(lexer);
    if (!scan_exponent_digits(lexer)) return emit_illegal(lexer, valid_symbols);
  }
  if (is_float_suffix(lexer->lookahead)) {
    is_integer = false;
    advance(lexer);
  }
  bool clean_end = !is_identifier_char(lexer->lookahead);
  if (!clean_end) skip_identifier_chars(lexer);
  return emit_token(lexer, valid_symbols, numeric_token_type(valid_symbols, is_integer), clean_end);
}

static bool scan_number(TSLexer *lexer, const bool *valid_symbols, bool after_dot) {
  bool allow_size_unit = !after_dot && valid_symbols[SIZE_LITERAL] && !valid_symbols[ERROR_SENTINEL];
  while (is_digit(lexer->lookahead)) advance(lexer);
  if (after_dot) return finish_number_tail(lexer, valid_symbols, false, false);
  lexer->mark_end(lexer);
  if (lexer->lookahead != '.') return finish_number_tail(lexer, valid_symbols, allow_size_unit, true);
  advance(lexer);
  // Leave `..` intact for PL/SQL range bounds such as `FOR i IN 1..10 LOOP`.
  if (lexer->lookahead == '.') {
    enum TokenType sym = numeric_token_type(valid_symbols, true);
    lexer->result_symbol = valid_symbols[sym] ? sym : error_token(valid_symbols);
    return true;
  }
  while (is_digit(lexer->lookahead)) advance(lexer);
  return finish_number_tail(lexer, valid_symbols, false, false);
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

static bool scan_number_or_bind(TSLexer *lexer, const bool *valid_symbols, int32_t c) {
  if (c == '.') {
    advance(lexer);
    return is_digit(lexer->lookahead) ? scan_number(lexer, valid_symbols, true) : false;
  }
  if (is_digit(c)) return scan_number(lexer, valid_symbols, false);
  return c == ':' && valid_symbols[BIND_VARIABLE] ? scan_bind_variable(lexer, valid_symbols) : false;
}

void *tree_sitter_oracle_external_scanner_create(void) { return ts_calloc(1, sizeof(Scanner)); }

void tree_sitter_oracle_external_scanner_destroy(void *payload) {
  Scanner *s = (Scanner *)payload;
  if (!s) return;
  ts_free(s->nodes);
  ts_free(s->states);
  ts_free(s->keys);
  ts_free(s);
}

unsigned tree_sitter_oracle_external_scanner_serialize(void *payload, char *buffer) {
  const Scanner *s = (const Scanner *)payload;
  if (!s || (s->root == 0 && s->unresolved == 0)) return 0;
  memcpy(buffer, &s->root, sizeof(uint32_t));
  memcpy(buffer + sizeof(uint32_t), &s->unresolved, sizeof(uint32_t));
  return 2 * sizeof(uint32_t);
}

void tree_sitter_oracle_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *s = (Scanner *)payload;
  if (!s) return;
  if (length == 2 * sizeof(uint32_t)) {
    memcpy(&s->root, buffer, sizeof(uint32_t));
    memcpy(&s->unresolved, buffer + sizeof(uint32_t), sizeof(uint32_t));
  } else {
    s->root = 0;
    s->unresolved = 0;
  }
}

static bool scan_nul_or_comment(TSLexer *lexer, const bool *valid_symbols, bool *result) {
  int32_t c = lexer->lookahead;
  if (c == 0) {
    if (lexer->eof(lexer)) return false;
    while (!at_eof(lexer) && lexer->lookahead == 0) advance(lexer);
    *result = emit_illegal(lexer, valid_symbols);
    return true;
  }
  if (c == '-') {
    advance(lexer);
    *result = lexer->lookahead == '-' && scan_line_comment(lexer, valid_symbols);
    return true;
  }
  if (c == '/') {
    advance(lexer);
    *result = lexer->lookahead == '*' && scan_block_comment(lexer, valid_symbols);
    return true;
  }
  return false;
}

bool tree_sitter_oracle_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  skip_spaces(lexer);
  bool result = false;
  if (scan_nul_or_comment(lexer, valid_symbols, &result)) return result;
  if (scan_rel_table_step((Scanner *)payload, lexer, valid_symbols)) return true;
  int32_t c = lexer->lookahead;
  if (c == '\'') return scan_standard_string(lexer, valid_symbols);
  if (is_prefixed_string_start(c)) return scan_prefixed_string(lexer, valid_symbols, c);
  if (c == '"') return scan_quoted_name(lexer, valid_symbols, QUOTED_IDENTIFIER);
  return scan_number_or_bind(lexer, valid_symbols, c);
}
