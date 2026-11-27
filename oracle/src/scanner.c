// code-gauge-allow-file fileNcss -- tree-sitter compiles one scanner.c covering Oracle comments, literals, numbers, slash terminators, and persistent FK column tries
#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

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
  REL_TABLE_OPEN,
  REL_COL_IDENT,
  REL_COL_QUOTED,
  REL_COL_HAS_TYPE,
  FK_COL_IDENT,
  FK_COL_QUOTED,
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

static const char *const SQL_RESERVED_WORDS[] = {
  "ACCESS",     "ADD",        "ALL",        "ALTER",      "AND",        "ANY",        "AS",         "ASC",
  "AUDIT",      "BETWEEN",    "BY",         "CHAR",       "CHECK",      "CLUSTER",    "COLUMN",     "COMMENT",
  "COMPRESS",   "CONNECT",    "CREATE",     "CURRENT",    "DATE",       "DECIMAL",    "DEFAULT",    "DELETE",
  "DESC",       "DISTINCT",   "DROP",       "ELSE",       "EXCLUSIVE",  "EXISTS",     "FILE",       "FLOAT",
  "FOR",        "FROM",       "GRANT",      "GROUP",      "HAVING",     "IDENTIFIED", "IMMEDIATE",  "IN",
  "INCREMENT",  "INDEX",      "INITIAL",    "INSERT",     "INTEGER",    "INTERSECT",  "INTO",       "IS",
  "LEVEL",      "LIKE",       "LOCK",       "LONG",       "MAXEXTENTS", "MINUS",      "MLSLABEL",   "MODE",
  "MODIFY",     "NOAUDIT",    "NOCOMPRESS", "NOT",        "NOWAIT",     "NULL",       "NUMBER",     "OF",
  "OFFLINE",    "ON",         "ONLINE",     "OPTION",     "OR",         "ORDER",      "PCTFREE",    "PRIOR",
  "PUBLIC",     "RAW",        "RENAME",     "RESOURCE",   "REVOKE",     "ROW",        "ROWID",      "ROWNUM",
  "ROWS",       "SELECT",     "SESSION",    "SET",        "SHARE",      "SIZE",       "SMALLINT",   "START",
  "SUCCESSFUL", "SYNONYM",    "SYSDATE",    "TABLE",      "THEN",       "TO",         "TRIGGER",    "UID",
  "UNION",      "UNIQUE",     "UPDATE",     "USER",       "VALIDATE",   "VALUES",     "VARCHAR",    "VARCHAR2",
  "VIEW",       "WHENEVER",   "WHERE",      "WITH",
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

static bool bytes_equal_kw(const uint8_t *buf, uint32_t len, const char *kw) {
  return word_equals((const char *)buf, len, kw);
}

static bool is_sql_reserved(const uint8_t *w, uint32_t len) {
  size_t base = 0;
  size_t count = sizeof(SQL_RESERVED_WORDS) / sizeof(SQL_RESERVED_WORDS[0]);
  while (count > 0) {
    size_t half = count >> 1;
    const char *kw = SQL_RESERVED_WORDS[base + half];
    int cmp = strncmp((const char *)w, kw, len);
    if (cmp == 0 && kw[len] == '\0') return true;
    if (cmp > 0) {
      base += half + 1;
      count -= half + 1;
    } else {
      count = half;
    }
  }
  return false;
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

static bool next_word_is(TSLexer *lexer, const char *kw) {
  if (skip_ws_and_comments_lookahead(lexer) != 0 || !is_identifier_start(lexer->lookahead)) return false;
  char buf[24];
  unsigned len = read_upper_word(lexer, buf, sizeof(buf));
  return word_equals(buf, len, kw);
}

static bool skip_quoted_lookahead(TSLexer *lexer) {
  advance(lexer);
  if (at_eof(lexer) || lexer->lookahead == '"') return false;
  while (!at_eof(lexer)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == '"') return true;
  }
  return false;
}

static bool read_nonreserved_name_lookahead(TSLexer *lexer, char *out, unsigned cap, unsigned *out_len) {
  *out_len = 0;
  if (lexer->lookahead == '"') return skip_quoted_lookahead(lexer);
  if (!is_identifier_start(lexer->lookahead)) return false;
  unsigned len = read_upper_word(lexer, out, cap);
  *out_len = len;
  return len <= cap && !is_sql_reserved((const uint8_t *)out, len);
}

static bool is_json_type_modifier_parens(TSLexer *lexer) {
  char inner[16];
  unsigned len = read_upper_word(lexer, inner, sizeof(inner));
  if (!word_equals(inner, len, "OBJECT") && !word_equals(inner, len, "ARRAY") && !word_equals(inner, len, "SCALAR")) {
    return false;
  }
  return skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == ')';
}

static bool skip_member_segment_lookahead(TSLexer *lexer) {
  if (skip_ws_and_comments_lookahead(lexer) != 0) return false;
  if (lexer->lookahead == '"') return skip_quoted_lookahead(lexer);
  if (!is_identifier_start(lexer->lookahead)) return false;
  skip_identifier_chars(lexer);
  return true;
}

static bool skip_qualified_tail_lookahead(TSLexer *lexer, bool *qualified) {
  *qualified = false;
  while (skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == '.') {
    *qualified = true;
    advance(lexer);
    if (!skip_member_segment_lookahead(lexer)) return false;
  }
  return true;
}

static bool is_table_domain_head(TSLexer *lexer) {
  if (skip_ws_and_comments_lookahead(lexer) != 0) return false;
  char seg[32];
  unsigned seg_len = 0;
  if (!read_nonreserved_name_lookahead(lexer, seg, sizeof(seg), &seg_len)) return false;
  if (word_equals(seg, seg_len, "DOMAIN")) return false;
  bool qualified = false;
  if (!skip_qualified_tail_lookahead(lexer, &qualified) || lexer->lookahead != '(') return false;
  advance(lexer);
  if (skip_ws_and_comments_lookahead(lexer) != 0) return false;
  if (lexer->lookahead == '"') return true;
  if (!is_identifier_start(lexer->lookahead)) return false;
  return qualified || !word_equals(seg, seg_len, "JSON") || !is_json_type_modifier_parens(lexer);
}

static bool is_table_constraint_head(TSLexer *lexer) {
  if (skip_ws_and_comments_lookahead(lexer) != 0) return false;
  char cname[32];
  unsigned cname_len = 0;
  if (!read_nonreserved_name_lookahead(lexer, cname, sizeof(cname), &cname_len)) return false;
  if (word_equals(cname, cname_len, "CONSTRAINT")) return false;
  if (skip_ws_and_comments_lookahead(lexer) != 0 || !is_identifier_start(lexer->lookahead)) return false;
  char kw[16];
  unsigned kw_len = read_upper_word(lexer, kw, sizeof(kw));
  if (word_equals(kw, kw_len, "FOREIGN") || word_equals(kw, kw_len, "SCOPE") || word_equals(kw, kw_len, "WITH") ||
      word_equals(kw, kw_len, "REF") || word_equals(kw, kw_len, "CHECK")) {
    return true;
  }
  if (word_equals(kw, kw_len, "PRIMARY")) {
    return next_word_is(lexer, "KEY") && skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == '(';
  }
  return word_equals(kw, kw_len, "UNIQUE") && skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == '(';
}

static bool is_table_clause_head(TSLexer *lexer, const uint8_t *w, uint32_t len) {
  if (len < 3 || len > 12) return false;
  if (bytes_equal_kw(w, len, "PERIOD") || bytes_equal_kw(w, len, "SCOPE")) return next_word_is(lexer, "FOR");
  if (bytes_equal_kw(w, len, "SUPPLEMENTAL")) return next_word_is(lexer, "LOG");
  if (bytes_equal_kw(w, len, "FOREIGN")) return next_word_is(lexer, "KEY");
  if (bytes_equal_kw(w, len, "PRIMARY")) {
    return next_word_is(lexer, "KEY") && skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == '(';
  }
  if (bytes_equal_kw(w, len, "REF")) return skip_ws_and_comments_lookahead(lexer) == 0 && lexer->lookahead == '(';
  if (bytes_equal_kw(w, len, "DOMAIN")) return is_table_domain_head(lexer);
  return bytes_equal_kw(w, len, "CONSTRAINT") && is_table_constraint_head(lexer);
}

static void record_rel_col(Scanner *s, uint32_t key_off, uint32_t key_len) {
  uint32_t cur_trie = s->root != 0 ? s->states[s->root].trie_root : 0;
  uint8_t prev = trie_get(s, cur_trie, s->keys + key_off, key_len);
  if (prev != 0) {
    s->root = push_table_state(s, cur_trie, 0, 0);
    return;
  }
  uint32_t next_trie = trie_set(s, cur_trie, s->keys + key_off, key_len, 1);
  s->root = push_table_state(s, next_trie, key_off, key_len);
  s->unresolved++;
}

static void record_fk_col(Scanner *s, uint32_t key_off, uint32_t key_len) {
  uint32_t cur_trie = s->root != 0 ? s->states[s->root].trie_root : 0;
  uint8_t prev = trie_get(s, cur_trie, s->keys + key_off, key_len);
  if (prev == 2) return;
  uint32_t next_trie = trie_set(s, cur_trie, s->keys + key_off, key_len, 2);
  s->root = push_table_state(s, next_trie, 0, 0);
  if (prev == 1 && s->unresolved > 0) s->unresolved--;
}

static void mark_active_col_typed(Scanner *s) {
  if (s->root == 0) return;
  TableState st = s->states[s->root];
  if (st.key_len == 0) return;
  if (trie_get(s, st.trie_root, s->keys + st.key_off, st.key_len) == 1) {
    uint32_t next_trie = trie_set(s, st.trie_root, s->keys + st.key_off, st.key_len, 2);
    s->root = push_table_state(s, next_trie, 0, 0);
    if (s->unresolved > 0) s->unresolved--;
  }
}

static bool scan_rel_table_zero_width(Scanner *s, TSLexer *lexer, const bool *valid_symbols, int32_t c) {
  if (valid_symbols[REL_TABLE_OPEN]) {
    s->root = 0;
    s->unresolved = 0;
    lexer->mark_end(lexer);
    lexer->result_symbol = REL_TABLE_OPEN;
    return true;
  }
  if (valid_symbols[REL_COL_HAS_TYPE] && (c == ',' || c == ')')) {
    mark_active_col_typed(s);
    lexer->mark_end(lexer);
    lexer->result_symbol = REL_COL_HAS_TYPE;
    return true;
  }
  if (s->unresolved == 0 && valid_symbols[REL_TABLE_CLOSE_RESOLVED]) {
    s->root = 0;
    lexer->mark_end(lexer);
    lexer->result_symbol = REL_TABLE_CLOSE_RESOLVED;
    return true;
  }
  if (s->unresolved > 0 && valid_symbols[REL_TABLE_CLOSE_UNRESOLVED]) {
    s->root = 0;
    s->unresolved = 0;
    lexer->mark_end(lexer);
    lexer->result_symbol = REL_TABLE_CLOSE_UNRESOLVED;
    return true;
  }
  return false;
}

static bool scan_tracked_quoted(Scanner *s, TSLexer *lexer, const bool *valid_symbols, bool is_fk) {
  uint32_t key_off = s->key_len;
  advance(lexer);
  bool has_nul = false;
  int32_t c = 0;
  if (!next_char(lexer, &c, &has_nul) || c == '"') return emit_illegal(lexer, valid_symbols);
  for (;;) {
    append_key_utf8(s, c);
    if (!next_char(lexer, &c, &has_nul)) {
      s->key_len = key_off;
      return emit_illegal(lexer, valid_symbols);
    }
    if (c == '"') break;
  }
  if (has_nul) {
    s->key_len = key_off;
    return emit_illegal(lexer, valid_symbols);
  }
  uint32_t key_len = s->key_len - key_off;
  if (is_fk) {
    record_fk_col(s, key_off, key_len);
  } else {
    record_rel_col(s, key_off, key_len);
  }
  return emit_token(lexer, valid_symbols, is_fk ? FK_COL_QUOTED : REL_COL_QUOTED, true);
}

static bool scan_ident_prefixed_string(TSLexer *lexer, const bool *valid_symbols, const uint8_t *word, uint32_t len) {
  if (bytes_equal_kw(word, len, "N")) return scan_standard_string(lexer, valid_symbols);
  if (bytes_equal_kw(word, len, "Q") || bytes_equal_kw(word, len, "NQ")) return scan_q_string(lexer, valid_symbols);
  return false;
}

static bool scan_tracked_ident(Scanner *s, TSLexer *lexer, const bool *valid_symbols, bool is_fk) {
  uint32_t key_off = s->key_len;
  while (is_identifier_char(lexer->lookahead)) {
    int32_t ch = lexer->lookahead;
    append_key_utf8(s, (ch >= 'a' && ch <= 'z') ? (ch - 'a' + 'A') : ch);
    advance(lexer);
  }
  uint32_t key_len = s->key_len - key_off;
  const uint8_t *word = s->keys + key_off;
  if (lexer->lookahead == '\'') {
    s->key_len = key_off;
    return scan_ident_prefixed_string(lexer, valid_symbols, word, key_len);
  }
  lexer->mark_end(lexer);
  if (is_sql_reserved(word, key_len) || (!is_fk && is_table_clause_head(lexer, word, key_len))) {
    s->key_len = key_off;
    return false;
  }
  if (is_fk) {
    record_fk_col(s, key_off, key_len);
  } else {
    record_rel_col(s, key_off, key_len);
  }
  lexer->result_symbol = is_fk ? FK_COL_IDENT : REL_COL_IDENT;
  return true;
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

static bool scan_rel_table_step(Scanner *s, TSLexer *lexer, const bool *valid_symbols, bool *result) {
  if (valid_symbols[ERROR_SENTINEL] || s == NULL) return false;
  int32_t c = lexer->lookahead;
  if (scan_rel_table_zero_width(s, lexer, valid_symbols, c)) {
    *result = true;
    return true;
  }
  if (c == '"' && (valid_symbols[REL_COL_QUOTED] || valid_symbols[FK_COL_QUOTED])) {
    *result = scan_tracked_quoted(s, lexer, valid_symbols, valid_symbols[FK_COL_QUOTED]);
    return true;
  }
  if (is_identifier_start(c) && (valid_symbols[REL_COL_IDENT] || valid_symbols[FK_COL_IDENT])) {
    *result = scan_tracked_ident(s, lexer, valid_symbols, valid_symbols[FK_COL_IDENT]);
    return true;
  }
  return false;
}

static bool scan_nul_or_comment(TSLexer *lexer, const bool *valid_symbols, bool line_only_hspace, bool *result) {
  int32_t c = lexer->lookahead;
  if (c == 0) {
    if (lexer->eof(lexer)) {
      *result = false;
      return true;
    }
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
    *result = scan_slash(lexer, valid_symbols, line_only_hspace);
    return true;
  }
  return false;
}

bool tree_sitter_oracle_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  bool line_only_hspace = skip_spaces(lexer);
  bool result = false;
  if (scan_nul_or_comment(lexer, valid_symbols, line_only_hspace, &result)) return result;
  if (scan_rel_table_step((Scanner *)payload, lexer, valid_symbols, &result)) return result;
  int32_t c = lexer->lookahead;
  if (c == '\'') return scan_standard_string(lexer, valid_symbols);
  if (is_prefixed_string_start(c)) return scan_prefixed_string(lexer, valid_symbols, c);
  if (c == '"') return scan_quoted_name(lexer, valid_symbols, QUOTED_IDENTIFIER);
  return scan_number_or_bind(lexer, valid_symbols, c);
}
