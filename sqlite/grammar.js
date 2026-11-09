// @ts-check
/* oxlint-disable no-control-regex -- Tokens exclude NUL characters, which end the input of SQLite. */

/** @import {GrammarSymbols, RuleOrLiteral} from '@willbooster/web-tree-sitter/dsl' */

// The SQL dialect that SQLite's parser accepts in its default build. The rules follow SQLite's own grammar, src/parse.y,
// and its tokenizer, src/tokenize.c, and also reject what SQLite rejects while parsing, beyond those two files (e.g. an
// unknown join type, or ORDER BY on a SELECT before UNION).

import {
  blockComment,
  commaSep,
  commaSep1,
  keyword,
  keywordPattern,
  keywords,
  lineComment,
  quoted,
} from '../common/common.mjs';

// The CLI injects the DSL before loading this grammar.
const { grammar, alias, choice, field, optional, prec, repeat, repeat1, reserved, seq, token } =
  /** @type {typeof globalThis & import('@willbooster/web-tree-sitter/dsl').DSL} */ (globalThis);

const PREC = {
  OR: 1,
  AND: 2,
  NOT: 3,
  EQUALITY: 4,
  RELATIONAL: 5,
  ESCAPE: 6,
  BITWISE: 7,
  ADDITIVE: 8,
  MULTIPLICATIVE: 9,
  CONCAT: 10,
  COLLATE: 11,
  UNARY: 12,
};

// The keywords that are never identifiers: those that parse.y does not let fall back to an identifier.
const RESERVED = [
  'ADD',
  'ALL',
  'ALTER',
  'AND',
  'AS',
  'AUTOINCREMENT',
  'BETWEEN',
  'CASE',
  'CHECK',
  'COLLATE',
  'COMMIT',
  'CONSTRAINT',
  'CREATE',
  'DEFAULT',
  'DEFERRABLE',
  'DELETE',
  'DISTINCT',
  'DROP',
  'ELSE',
  'ESCAPE',
  'EXCEPT',
  'EXISTS',
  'FOREIGN',
  'FROM',
  'GROUP',
  'HAVING',
  'IN',
  'INDEX',
  'INSERT',
  'INTERSECT',
  'INTO',
  'IS',
  'ISNULL',
  'JOIN',
  'LIMIT',
  'NOT',
  'NOTHING',
  'NOTNULL',
  'NULL',
  'ON',
  'OR',
  'ORDER',
  'PRIMARY',
  'REFERENCES',
  'RETURNING',
  'SELECT',
  'SET',
  'TABLE',
  'THEN',
  'TO',
  'TRANSACTION',
  'UNION',
  'UNIQUE',
  'UPDATE',
  'USING',
  'VALUES',
  'WHEN',
  'WHERE',
];
// Names (`nm` in parse.y) may also be these, but an identifier in a narrower position (`id` and `ids`) may not.
const JOIN_KEYWORDS = ['CROSS', 'FULL', 'INNER', 'LEFT', 'NATURAL', 'OUTER', 'RIGHT'];

// SQLite accepts any sequence of one to three join keywords whose combination is not contradictory
// (`sqlite3JoinType` in src/select.c): `INNER` or `CROSS` with an outer join, or `OUTER` without a side, is an error.
/** @type {string[][]} */
const JOIN_TYPES = [];
/** @param {string[]} words */
const isJoinType = (words) => {
  const inner = words.some((word) => word === 'INNER' || word === 'CROSS');
  const side = words.some((word) => word === 'LEFT' || word === 'RIGHT' || word === 'FULL');
  return !(inner && (side || words.includes('OUTER'))) && !(words.includes('OUTER') && !side);
};
/** @param {string[]} words */
const addJoinTypes = (words) => {
  if (words.length > 0 && isJoinType(words)) JOIN_TYPES.push(words);
  if (words.length < 3) for (const word of JOIN_KEYWORDS) addJoinTypes([...words, word]);
};
addJoinTypes([]);

// SQLite's identifier characters: ASCII letters, digits, `_`, `$`, and every non-ASCII character. A byte order mark
// before an identifier is white space instead.
const IDENTIFIER_START = String.raw`A-Za-z_\u0080-\uFEFE\uFF00-\u{10FFFF}`;
const IDENTIFIER_PART = String.raw`A-Za-z0-9_$\u0080-\u{10FFFF}`;

// Digit separators (`_`) may appear only between two digits.
const DIGITS = '[0-9](_?[0-9])*';
const HEX_DIGITS = '[0-9a-fA-F](_?[0-9a-fA-F])*';

/**
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} target
 */
const insertHead = ($, target) =>
  seq(
    choice(seq(keyword('INSERT'), optional($._or_conflict)), keyword('REPLACE')),
    keyword('INTO'),
    field('table', target),
    optional($.column_list)
  );

/**
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} target
 */
const triggerUpdate = ($, target) =>
  seq(
    keyword('UPDATE'),
    optional($._or_conflict),
    field('table', target),
    $.set_clause,
    optional($.from_clause),
    optional($.where_clause)
  );

/**
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} head
 */
const triggerInsert = ($, head) =>
  seq(head, $.select_statement, repeat($.upsert_clause), optional(alias($._final_upsert_clause, $.upsert_clause)));

/**
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} target
 */
const triggerDelete = ($, target) => seq(keywords('DELETE FROM'), field('table', target), optional($.where_clause));

export default grammar({
  name: 'sqlite',

  // A byte order mark is white space anywhere.
  extras: ($) => [/[\t\n\f\r ][\t\n\v\f\r ]*/, new RegExp(String.raw`\uFEFF`), $.comment],

  externals: ($) => [$._module_argument_token, $._illegal_token, $._unreachable, $.comment, $.blob_literal],

  word: ($) => $.identifier,

  reserved: {
    global: () => RESERVED.map(keywordPattern),
    // `ids` in parse.y: the alias that follows an expression or a table without `AS`, a type name, or a collation.
    ids: () => [...RESERVED, ...JOIN_KEYWORDS, 'INDEXED'].map(keywordPattern),
    window_name: () => [...RESERVED, 'FILTER'].map(keywordPattern),
    // `id` in parse.y: an identifier as a default value.
    id: () => [...RESERVED, ...JOIN_KEYWORDS].map(keywordPattern),
  },

  supertypes: ($) => [$._statement],

  conflicts: ($) => [
    // `OVER`, `FILTER`, and `WINDOW` are keywords only when the tokens after them make them one (`analyzeOverKeyword`
    // and its siblings in src/tokenize.c); otherwise they are an alias.
    [$.function_call],
    [$.result_column],
    [$.table],
    [$.table_function],
    [$.subquery_table],
    [$.join_table],
  ],

  rules: {
    source_file: ($) => seq(optional($._statement), repeat(seq(';', optional($._statement)))),

    _statement: ($) => choice($.explain_statement, $._explainable_statement),

    _explainable_statement: ($) =>
      choice(
        $.select_statement,
        $.insert_statement,
        $.update_statement,
        $.delete_statement,
        $.create_table_statement,
        $.create_virtual_table_statement,
        $.create_view_statement,
        $.create_index_statement,
        $.create_trigger_statement,
        $.drop_statement,
        $.alter_table_statement,
        $.begin_statement,
        $.commit_statement,
        $.rollback_statement,
        $.savepoint_statement,
        $.release_statement,
        $.pragma_statement,
        $.vacuum_statement,
        $.attach_statement,
        $.detach_statement,
        $.reindex_statement,
        $.analyze_statement
      ),

    explain_statement: ($) => seq(keyword('EXPLAIN'), optional(keywords('QUERY PLAN')), $._explainable_statement),

    // Transactions

    begin_statement: ($) =>
      seq(
        keyword('BEGIN'),
        optional(choice(keyword('DEFERRED'), keyword('IMMEDIATE'), keyword('EXCLUSIVE'))),
        optional($._transaction)
      ),

    commit_statement: ($) => seq(choice(keyword('COMMIT'), keyword('END')), optional($._transaction)),

    rollback_statement: ($) =>
      seq(
        keyword('ROLLBACK'),
        optional($._transaction),
        optional(seq(keyword('TO'), optional(keyword('SAVEPOINT')), field('savepoint', $._name)))
      ),

    _transaction: ($) => seq(keyword('TRANSACTION'), optional(field('name', $._name))),

    savepoint_statement: ($) => seq(keyword('SAVEPOINT'), field('name', $._name)),

    release_statement: ($) => seq(keyword('RELEASE'), optional(keyword('SAVEPOINT')), field('name', $._name)),

    // Schema statements

    create_table_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($.temporary),
        keyword('TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        choice(
          seq(
            '(',
            commaSep1($.column_definition),
            optional(seq(',', $._table_constraint, repeat(seq(optional(','), $._table_constraint)))),
            ')',
            commaSep($.table_option)
          ),
          seq(keyword('AS'), $.select_statement)
        )
      ),

    temporary: () => choice(keyword('TEMP'), keyword('TEMPORARY')),

    if_not_exists: () => keywords('IF NOT EXISTS'),

    if_exists: () => keywords('IF EXISTS'),

    table_option: () => choice(keywords('WITHOUT ROWID'), keyword('STRICT')),

    // GENERATED after a column name or a type name without a size is a word of the type name, since SQLite's parser
    // lets the keyword fall back to an identifier where it has no action of its own (`%fallback ID` in src/parse.y);
    // a GENERATED ALWAYS constraint may follow a sized type or another constraint only.
    column_definition: ($) =>
      seq(
        field('name', $._name),
        choice(
          seq(
            optional(alias($._type_words, $.type_name)),
            optional(seq($._leading_column_constraint, repeat($._column_constraint)))
          ),
          seq(alias($._sized_type_name, $.type_name), repeat($._column_constraint))
        )
      ),

    type_name: ($) => choice($._type_words, $._sized_type_name),

    _type_words: ($) => repeat1(choice($._narrow_name, alias(keyword('GENERATED'), $.identifier))),

    _sized_type_name: ($) => seq($._type_words, '(', $._signed_number, optional(seq(',', $._signed_number)), ')'),

    _leading_column_constraint: ($) =>
      choice(
        $.constraint_name,
        $.default_constraint,
        $.null_constraint,
        $.not_null_constraint,
        $.primary_key_constraint,
        $.unique_constraint,
        $.check_constraint,
        $.foreign_key_clause,
        $.deferrable_clause,
        $.collate_clause,
        alias($._generated_column_expression, $.generated_column_constraint)
      ),

    _column_constraint: ($) =>
      choice(
        $.constraint_name,
        $.default_constraint,
        $.null_constraint,
        $.not_null_constraint,
        $.primary_key_constraint,
        $.unique_constraint,
        $.check_constraint,
        $.foreign_key_clause,
        $.deferrable_clause,
        $.collate_clause,
        $.generated_column_constraint
      ),

    constraint_name: ($) => seq(keyword('CONSTRAINT'), field('name', $._name)),

    default_constraint: ($) =>
      seq(
        keyword('DEFAULT'),
        field(
          'value',
          choice(
            $._term,
            seq('(', $._expression, ')'),
            alias($._signed_term, $.unary_expression),
            reserved('id', $.identifier),
            $.quoted_identifier
          )
        )
      ),

    _signed_term: ($) => seq(field('operator', choice('+', '-')), field('operand', $._term)),

    null_constraint: ($) => seq(keyword('NULL'), optional($.conflict_clause)),

    not_null_constraint: ($) => seq(keywords('NOT NULL'), optional($.conflict_clause)),

    // A descending primary key is no alias of the rowid, so it may not autoincrement (`sqlite3AddPrimaryKey` in
    // src/build.c).
    primary_key_constraint: ($) =>
      seq(
        keywords('PRIMARY KEY'),
        choice(
          seq(optional(keyword('ASC')), optional($.conflict_clause), optional(keyword('AUTOINCREMENT'))),
          seq(keyword('DESC'), optional($.conflict_clause))
        )
      ),

    unique_constraint: ($) => seq(keyword('UNIQUE'), optional($.conflict_clause)),

    check_constraint: ($) => seq(keyword('CHECK'), '(', $._expression, ')'),

    collate_clause: ($) => seq(keyword('COLLATE'), field('collation', $._narrow_name)),

    generated_column_constraint: ($) =>
      choice(seq(keywords('GENERATED ALWAYS'), $._generated_column_expression), $._generated_column_expression),

    _generated_column_expression: ($) =>
      seq(keyword('AS'), '(', $._expression, ')', optional(choice(keyword('STORED'), keyword('VIRTUAL')))),

    conflict_clause: ($) => seq(keywords('ON CONFLICT'), $._conflict_resolution),

    _conflict_resolution: () =>
      choice(keyword('ROLLBACK'), keyword('ABORT'), keyword('FAIL'), keyword('IGNORE'), keyword('REPLACE')),

    foreign_key_clause: ($) =>
      seq(
        keyword('REFERENCES'),
        field('table', $._name),
        optional($.column_list),
        repeat(choice($.foreign_key_action, $.foreign_key_match))
      ),

    foreign_key_action: () =>
      seq(
        keyword('ON'),
        choice(keyword('DELETE'), keyword('UPDATE'), keyword('INSERT')),
        choice(
          keywords('SET NULL'),
          keywords('SET DEFAULT'),
          keyword('CASCADE'),
          keyword('RESTRICT'),
          keywords('NO ACTION')
        )
      ),

    foreign_key_match: ($) => seq(keyword('MATCH'), field('name', $._name)),

    deferrable_clause: () =>
      seq(
        optional(keyword('NOT')),
        keyword('DEFERRABLE'),
        optional(seq(keyword('INITIALLY'), choice(keyword('DEFERRED'), keyword('IMMEDIATE'))))
      ),

    _table_constraint: ($) =>
      choice(
        $.constraint_name,
        alias($._table_primary_key_constraint, $.primary_key_constraint),
        alias($._table_unique_constraint, $.unique_constraint),
        alias($._table_check_constraint, $.check_constraint),
        $.foreign_key_constraint
      ),

    _table_primary_key_constraint: ($) =>
      seq(
        keywords('PRIMARY KEY'),
        '(',
        commaSep1(alias($._key_column, $.indexed_column)),
        optional(keyword('AUTOINCREMENT')),
        ')',
        optional($.conflict_clause)
      ),

    _table_unique_constraint: ($) =>
      seq(keyword('UNIQUE'), '(', commaSep1(alias($._key_column, $.indexed_column)), ')', optional($.conflict_clause)),

    // A PRIMARY KEY or UNIQUE constraint lists columns, not expressions (`sqlite3CreateIndex` in src/build.c).
    _key_column: ($) => seq(field('value', $._key_value), optional(choice(keyword('ASC'), keyword('DESC')))),

    _key_value: ($) =>
      choice(
        alias($._name_only, $.column_reference),
        alias($._parenthesized_key_value, $.parenthesized_expression),
        alias($._collated_key_value, $.collate_expression)
      ),

    _parenthesized_key_value: ($) => seq('(', $._key_value, ')'),

    _collated_key_value: ($) =>
      prec.left(
        PREC.COLLATE,
        seq(field('value', $._key_value), keyword('COLLATE'), field('collation', $._narrow_name))
      ),

    _table_check_constraint: ($) => seq(keyword('CHECK'), '(', $._expression, ')', optional($.conflict_clause)),

    foreign_key_constraint: ($) =>
      seq(keywords('FOREIGN KEY'), $.column_list, $.foreign_key_clause, optional($.deferrable_clause)),

    column_list: ($) => seq('(', commaSep1($._name), ')'),

    create_virtual_table_statement: ($) =>
      seq(
        keywords('CREATE VIRTUAL TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        keyword('USING'),
        field('module', $._name),
        optional(seq('(', optional($.module_argument), repeat(seq(',', optional($.module_argument))), ')'))
      ),

    // A module receives the text of each argument and parses it itself.
    module_argument: ($) => repeat1(choice($._module_argument_token, $._module_argument_group)),

    _module_argument_group: ($) =>
      seq('(', repeat(choice($._module_argument_token, ',', $._module_argument_group)), ')'),

    create_view_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($.temporary),
        keyword('VIEW'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        optional($.column_list),
        keyword('AS'),
        $.select_statement
      ),

    create_index_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('UNIQUE')),
        keyword('INDEX'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        keyword('ON'),
        field('table', $._name),
        '(',
        commaSep1($.indexed_column),
        ')',
        optional($.where_clause)
      ),

    // A statement in a trigger may name its target table with a schema only if the trigger belongs to the temp schema
    // (`sqlite3TriggerStepSrc` in src/trigger.c): a temporary trigger, which may not have a qualified name itself
    // (`sqlite3BeginTrigger`), or one whose name or table is in the temp schema. A table without a schema may be in it.
    create_trigger_statement: ($) =>
      seq(
        keyword('CREATE'),
        choice(
          seq(
            $.temporary,
            keyword('TRIGGER'),
            optional($.if_not_exists),
            field('name', $._unqualified_name),
            $._trigger_event,
            field('table', $.qualified_name),
            $._trigger_body
          ),
          seq(
            keyword('TRIGGER'),
            optional($.if_not_exists),
            choice(
              seq(
                field('name', $._possibly_temporary_qualified_name),
                $._trigger_event,
                field('table', $.qualified_name),
                $._trigger_body
              ),
              seq(
                field('name', $._other_qualified_name),
                $._trigger_event,
                field('table', $.qualified_name),
                $._restricted_trigger_body
              ),
              seq(
                field('name', $._unqualified_trigger_name),
                $._trigger_event,
                choice(
                  seq(
                    field('table', choice($._unqualified_trigger_name, $._possibly_temporary_qualified_name)),
                    $._trigger_body
                  ),
                  seq(field('table', $._other_qualified_name), $._restricted_trigger_body)
                )
              )
            )
          )
        )
      ),

    _unqualified_name: ($) => alias($._name_only, $.qualified_name),

    // Where `temp.` may start a qualified name, `temp` is a keyword, which may still be a name on its own.
    _unqualified_trigger_name: ($) => choice($._unqualified_name, alias($._temp_name_only, $.qualified_name)),

    _name_only: ($) => field('name', $._name),

    _temp_name_only: ($) => field('name', alias(keyword('TEMP'), $.identifier)),

    // A name in the temp schema, or in a schema whose quoted name may be `temp`.
    _possibly_temporary_qualified_name: ($) => alias($._possibly_temporary_qualified_name_parts, $.qualified_name),

    _possibly_temporary_qualified_name_parts: ($) =>
      seq(
        field('schema', choice(alias(keyword('TEMP'), $.identifier), $.quoted_identifier, $.string_literal)),
        '.',
        field('name', $._name)
      ),

    _other_qualified_name: ($) => alias($._other_qualified_name_parts, $.qualified_name),

    _other_qualified_name_parts: ($) => seq(field('schema', $.identifier), '.', field('name', $._name)),

    _trigger_event: ($) =>
      seq(
        optional(choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF'))),
        choice(
          keyword('DELETE'),
          keyword('INSERT'),
          seq(keyword('UPDATE'), optional(seq(keyword('OF'), commaSep1($._name))))
        ),
        keyword('ON')
      ),

    _trigger_body: ($) => seq($._trigger_condition, repeat1(seq($._trigger_statement, ';')), keyword('END')),

    _restricted_trigger_body: ($) =>
      seq($._trigger_condition, repeat1(seq($._restricted_trigger_statement, ';')), keyword('END')),

    _trigger_condition: ($) =>
      seq(
        optional(keywords('FOR EACH ROW')),
        optional(seq(keyword('WHEN'), field('condition', $._expression))),
        keyword('BEGIN')
      ),

    // Statements in a trigger take no WITH clause, INDEXED BY clause, or RETURNING clause.
    _trigger_statement: ($) =>
      choice(
        alias($._trigger_update_statement, $.update_statement),
        alias($._trigger_insert_statement, $.insert_statement),
        alias($._trigger_delete_statement, $.delete_statement),
        $.select_statement
      ),

    _restricted_trigger_statement: ($) =>
      choice(
        alias($._restricted_trigger_update_statement, $.update_statement),
        alias($._restricted_trigger_insert_statement, $.insert_statement),
        alias($._restricted_trigger_delete_statement, $.delete_statement),
        $.select_statement
      ),

    _trigger_update_statement: ($) => triggerUpdate($, $.table_target),

    _restricted_trigger_update_statement: ($) => triggerUpdate($, $._unqualified_table_target),

    _trigger_insert_statement: ($) => triggerInsert($, $._insert_head),

    _restricted_trigger_insert_statement: ($) => triggerInsert($, $._restricted_insert_head),

    _trigger_delete_statement: ($) => triggerDelete($, $.table_target),

    _restricted_trigger_delete_statement: ($) => triggerDelete($, $._unqualified_table_target),

    _unqualified_table_target: ($) => alias($._unqualified_table_target_parts, $.table_target),

    _unqualified_table_target_parts: ($) =>
      seq(field('name', $._unqualified_name), optional(seq(keyword('AS'), field('alias', $._name)))),

    _restricted_insert_head: ($) => insertHead($, $._unqualified_table_target),

    drop_statement: ($) =>
      seq(
        keyword('DROP'),
        choice(keyword('TABLE'), keyword('VIEW'), keyword('INDEX'), keyword('TRIGGER')),
        optional($.if_exists),
        field('name', $.qualified_name)
      ),

    alter_table_statement: ($) =>
      seq(
        keywords('ALTER TABLE'),
        field('table', $.qualified_name),
        choice(
          seq(keywords('RENAME TO'), field('new_name', $._name)),
          seq(
            keyword('RENAME'),
            optional(keyword('COLUMN')),
            field('column', $._name),
            keyword('TO'),
            field('new_name', $._name)
          ),
          seq(keyword('ADD'), optional(keyword('COLUMN')), $.column_definition),
          seq(keyword('DROP'), optional(keyword('COLUMN')), field('column', $._name)),
          seq(keywords('DROP CONSTRAINT'), field('constraint', $._name)),
          seq(
            keyword('ALTER'),
            optional(keyword('COLUMN')),
            field('column', $._name),
            choice(keywords('DROP NOT NULL'), seq(keywords('SET NOT NULL'), optional($.conflict_clause)))
          ),
          seq(keyword('ADD'), optional($.constraint_name), alias($._table_check_constraint, $.check_constraint))
        )
      ),

    // Other statements

    pragma_statement: ($) =>
      seq(
        keyword('PRAGMA'),
        field('name', $.qualified_name),
        optional(choice(seq('=', field('value', $._pragma_value)), seq('(', field('value', $._pragma_value), ')')))
      ),

    _pragma_value: ($) => choice($._signed_number, $._name, keyword('ON'), keyword('DELETE'), keyword('DEFAULT')),

    vacuum_statement: ($) =>
      seq(
        keyword('VACUUM'),
        optional(field('schema', $._name)),
        optional(seq(keyword('INTO'), field('file', $._expression)))
      ),

    attach_statement: ($) =>
      seq(
        keyword('ATTACH'),
        optional(keyword('DATABASE')),
        field('file', $._expression),
        keyword('AS'),
        field('schema', $._expression),
        optional(seq(keyword('KEY'), field('key', $._expression)))
      ),

    detach_statement: ($) => seq(keyword('DETACH'), optional(keyword('DATABASE')), field('schema', $._expression)),

    reindex_statement: ($) => seq(keyword('REINDEX'), optional(field('name', $.qualified_name))),

    analyze_statement: ($) => seq(keyword('ANALYZE'), optional(field('name', $.qualified_name))),

    // Data manipulation

    insert_statement: ($) =>
      seq(
        optional($.with_clause),
        $._insert_head,
        choice(
          seq(
            $.select_statement,
            repeat($.upsert_clause),
            optional(alias($._final_upsert_clause, $.upsert_clause)),
            optional($.returning_clause)
          ),
          seq(keywords('DEFAULT VALUES'), optional($.returning_clause))
        )
      ),

    _insert_head: ($) => insertHead($, $.table_target),

    _or_conflict: ($) => seq(keyword('OR'), $._conflict_resolution),

    table_target: ($) => seq(field('name', $.qualified_name), optional(seq(keyword('AS'), field('alias', $._name)))),

    // Only the last upsert clause may leave out the conflict target.
    upsert_clause: ($) => seq(keywords('ON CONFLICT'), $.conflict_target, keyword('DO'), $._upsert_action),

    _final_upsert_clause: ($) => seq(keywords('ON CONFLICT'), keyword('DO'), $._upsert_action),

    conflict_target: ($) => seq('(', commaSep1($.indexed_column), ')', optional($.where_clause)),

    _upsert_action: ($) => choice(keyword('NOTHING'), seq(keyword('UPDATE'), $.set_clause, optional($.where_clause))),

    update_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('UPDATE'),
        optional($._or_conflict),
        field('table', $.table_target),
        optional($.indexed_clause),
        $.set_clause,
        optional($.from_clause),
        optional($.where_clause),
        optional($.returning_clause)
      ),

    set_clause: ($) => seq(keyword('SET'), commaSep1($.assignment)),

    assignment: ($) => seq(field('left', choice($._name, $.column_list)), '=', field('right', $._expression)),

    delete_statement: ($) =>
      seq(
        optional($.with_clause),
        keywords('DELETE FROM'),
        field('table', $.table_target),
        optional($.indexed_clause),
        optional($.where_clause),
        optional($.returning_clause)
      ),

    // `TABLE.*` is an error in a RETURNING clause (`isAsteriskTerm` in src/trigger.c).
    returning_clause: ($) => seq(keyword('RETURNING'), commaSep1(choice($.result_column, alias('*', $.all_columns)))),

    // Queries

    select_statement: ($) =>
      seq(
        optional($.with_clause),
        repeat(seq(choice($.select_core, $.values_clause), $.compound_operator)),
        // An ORDER BY or LIMIT clause applies to the whole compound query, and follows a SELECT, not VALUES.
        choice($.values_clause, seq($.select_core, optional($.order_by_clause), optional($.limit_clause)))
      ),

    with_clause: ($) => seq(keyword('WITH'), optional(keyword('RECURSIVE')), commaSep1($.common_table_expression)),

    common_table_expression: ($) =>
      seq(
        field('name', $._name),
        optional($.column_list),
        keyword('AS'),
        optional(choice(keyword('MATERIALIZED'), keywords('NOT MATERIALIZED'))),
        '(',
        $.select_statement,
        ')'
      ),

    compound_operator: () => choice(keyword('UNION'), keywords('UNION ALL'), keyword('INTERSECT'), keyword('EXCEPT')),

    values_clause: ($) => seq(keyword('VALUES'), commaSep1($.row)),

    row: ($) => seq('(', commaSep1($._expression), ')'),

    select_core: ($) =>
      seq(
        keyword('SELECT'),
        optional(choice(keyword('DISTINCT'), keyword('ALL'))),
        commaSep1(choice($.result_column, alias('*', $.all_columns), $.table_columns)),
        optional($.from_clause),
        optional($.where_clause),
        optional($.group_by_clause),
        optional($.having_clause),
        optional($.window_clause)
      ),

    result_column: ($) => seq(field('value', $._expression), optional($._alias)),

    table_columns: ($) => seq(field('table', $._name), '.', '*'),

    _alias: ($) =>
      choice(
        seq(keyword('AS'), field('alias', $._name)),
        field(
          'alias',
          choice(
            $._narrow_name,
            alias(keyword('OVER'), $.identifier),
            alias(keyword('FILTER'), $.identifier),
            alias(keyword('WINDOW'), $.identifier)
          )
        )
      ),

    from_clause: ($) => seq(keyword('FROM'), $._join_list),

    // SQLite reads ON after a table as a join constraint even where that is an error, so ON never starts an upsert
    // clause after a FROM clause.
    _join_list: ($) => prec.right(seq($._table_or_subquery, optional($._misplaced_join_constraint), repeat($._join))),

    _join: ($) =>
      prec.right(
        choice(
          seq($.join_operator, $._table_or_subquery, optional($.join_constraint)),
          seq(
            alias($._natural_join_operator, $.join_operator),
            $._table_or_subquery,
            optional($._misplaced_join_constraint)
          )
        )
      ),

    // ON is an error after the first table or after a natural join (`sqlite3SrcListAppendFromTerm` in src/build.c).
    _misplaced_join_constraint: ($) => seq(keyword('ON'), $._unreachable),

    _table_or_subquery: ($) => choice($.table, $.table_function, $.subquery_table, $.join_table),

    table: ($) => seq(field('name', $.qualified_name), optional($._alias), optional($.indexed_clause)),

    table_function: ($) => seq(field('name', $.qualified_name), '(', commaSep($._expression), ')', optional($._alias)),

    subquery_table: ($) => seq('(', $.select_statement, ')', optional($._alias)),

    join_table: ($) => seq('(', $._join_list, ')', optional($._alias)),

    indexed_clause: ($) => choice(seq(keywords('INDEXED BY'), field('index', $._name)), keywords('NOT INDEXED')),

    join_operator: () =>
      choice(
        ',',
        ...JOIN_TYPES.filter((words) => !words.includes('NATURAL')).map((words) =>
          seq(...words.map(keyword), keyword('JOIN'))
        ),
        keyword('JOIN')
      ),

    // A natural join may not have an ON or USING clause.
    _natural_join_operator: () =>
      choice(
        ...JOIN_TYPES.filter((words) => words.includes('NATURAL')).map((words) =>
          seq(...words.map(keyword), keyword('JOIN'))
        )
      ),

    join_constraint: ($) =>
      choice(seq(keyword('ON'), field('condition', $._expression)), seq(keyword('USING'), $.column_list)),

    where_clause: ($) => seq(keyword('WHERE'), field('condition', $._expression)),

    group_by_clause: ($) => seq(keywords('GROUP BY'), commaSep1($._expression)),

    having_clause: ($) => seq(keyword('HAVING'), field('condition', $._expression)),

    window_clause: ($) =>
      seq(keyword('WINDOW'), alias($._first_named_window, $.named_window), repeat(seq(',', $.named_window))),

    // SQLite's tokenizer reads WINDOW and OVER as keywords only before a name that is not FILTER (`getToken` in
    // src/tokenize.c), and FILTER elsewhere is a name.
    _first_named_window: ($) =>
      seq(field('name', $._window_name), keyword('AS'), '(', optional($.window_definition), ')'),

    _window_name: ($) =>
      choice(reserved('window_name', $.identifier), $.quoted_identifier, $.string_literal, $._illegal),

    named_window: ($) => seq(field('name', $._name), keyword('AS'), '(', optional($.window_definition), ')'),

    window_definition: ($) =>
      choice(seq(field('base', $._name), optional($._window_specification)), $._window_specification),

    _window_specification: ($) =>
      choice(
        seq($.partition_by_clause, optional($.order_by_clause), optional($.frame_clause)),
        seq($.order_by_clause, optional($.frame_clause)),
        $.frame_clause
      ),

    partition_by_clause: ($) => seq(keywords('PARTITION BY'), commaSep1($._expression)),

    frame_clause: ($) =>
      seq(
        choice(keyword('RANGE'), keyword('ROWS'), keyword('GROUPS')),
        // A frame may not start after it ends (`sqlite3WindowAlloc` in src/window.c); a frame with a single bound ends at
        // the current row.
        choice(
          $._frame_start_before_current_row,
          alias($._current_row, $.frame_bound),
          seq(
            keyword('BETWEEN'),
            choice(
              seq($._frame_start_before_current_row, keyword('AND'), $._frame_end),
              seq(
                alias($._current_row, $.frame_bound),
                keyword('AND'),
                choice(alias($._current_row, $.frame_bound), $._frame_end_after_current_row)
              ),
              seq(alias($._following, $.frame_bound), keyword('AND'), $._frame_end_after_current_row)
            )
          )
        ),
        optional($.frame_exclusion)
      ),

    _frame_start_before_current_row: ($) =>
      choice(alias($._unbounded_preceding, $.frame_bound), alias($._preceding, $.frame_bound)),

    _frame_end: ($) =>
      choice(alias($._preceding, $.frame_bound), alias($._current_row, $.frame_bound), $._frame_end_after_current_row),

    _frame_end_after_current_row: ($) =>
      choice(alias($._following, $.frame_bound), alias($._unbounded_following, $.frame_bound)),

    _unbounded_preceding: () => keywords('UNBOUNDED PRECEDING'),

    _unbounded_following: () => keywords('UNBOUNDED FOLLOWING'),

    _preceding: ($) => seq($._expression, keyword('PRECEDING')),

    _following: ($) => seq($._expression, keyword('FOLLOWING')),

    _current_row: () => keywords('CURRENT ROW'),

    frame_exclusion: () =>
      seq(
        keyword('EXCLUDE'),
        choice(keywords('NO OTHERS'), keywords('CURRENT ROW'), keyword('GROUP'), keyword('TIES'))
      ),

    order_by_clause: ($) => seq(keywords('ORDER BY'), commaSep1($.ordering_term)),

    // NULLS FIRST and NULLS LAST order query results only (`sqlite3HasExplicitNulls` in src/build.c).
    indexed_column: ($) => seq(field('value', $._expression), optional(choice(keyword('ASC'), keyword('DESC')))),

    ordering_term: ($) =>
      seq(
        field('value', $._expression),
        optional(choice(keyword('ASC'), keyword('DESC'))),
        optional(choice(keywords('NULLS FIRST'), keywords('NULLS LAST')))
      ),

    limit_clause: ($) =>
      seq(
        keyword('LIMIT'),
        field('limit', $._expression),
        optional(
          choice(seq(keyword('OFFSET'), field('offset', $._expression)), seq(',', field('limit', $._expression)))
        )
      ),

    // Expressions

    _expression: ($) =>
      choice(
        $._term,
        $.column_reference,
        $.bind_parameter,
        $.parenthesized_expression,
        $.row_value,
        $.subquery,
        $.exists_expression,
        $.function_call,
        $.cast_expression,
        $.case_expression,
        $.raise_expression,
        $.unary_expression,
        $.binary_expression,
        $.collate_expression,
        $.like_expression,
        $.between_expression,
        $.in_expression,
        $.null_test_expression
      ),

    _term: ($) => choice($.null, $.numeric_literal, $.string_literal, $.blob_literal, $.current_time, $._illegal),

    // A token that SQLite's tokenizer rejects, which the scanner reports where a literal or a name may appear. It never
    // completes a rule, so it always leaves an error.
    _illegal: ($) => seq($._illegal_token, $._unreachable),

    null: () => keyword('NULL'),

    current_time: () => choice(keyword('CURRENT_DATE'), keyword('CURRENT_TIME'), keyword('CURRENT_TIMESTAMP')),

    column_reference: ($) =>
      choice(
        field('name', $._identifier),
        seq(field('table', $._name), '.', field('name', $._name)),
        seq(field('schema', $._name), '.', field('table', $._name), '.', field('name', $._name))
      ),

    parenthesized_expression: ($) => seq('(', $._expression, ')'),

    row_value: ($) => seq('(', $._expression, ',', commaSep1($._expression), ')'),

    subquery: ($) => seq('(', $.select_statement, ')'),

    exists_expression: ($) => seq(keyword('EXISTS'), '(', $.select_statement, ')'),

    function_call: ($) =>
      seq(
        field('name', $._identifier),
        '(',
        optional(
          choice(
            alias('*', $.all_columns),
            seq(
              optional(choice(keyword('DISTINCT'), keyword('ALL'))),
              commaSep($._expression),
              optional($.order_by_clause)
            )
          )
        ),
        ')',
        optional($.filter_clause),
        optional($.over_clause)
      ),

    filter_clause: ($) => seq(keyword('FILTER'), '(', $.where_clause, ')'),

    over_clause: ($) =>
      seq(keyword('OVER'), choice(seq('(', optional($.window_definition), ')'), field('window', $._window_name))),

    cast_expression: ($) =>
      seq(keyword('CAST'), '(', field('value', $._expression), keyword('AS'), optional($.type_name), ')'),

    case_expression: ($) =>
      seq(
        keyword('CASE'),
        optional(field('operand', $._expression)),
        repeat1($.when_clause),
        optional(seq(keyword('ELSE'), field('else', $._expression))),
        keyword('END')
      ),

    when_clause: ($) =>
      seq(keyword('WHEN'), field('condition', $._expression), keyword('THEN'), field('result', $._expression)),

    raise_expression: ($) =>
      seq(
        keyword('RAISE'),
        '(',
        choice(
          keyword('IGNORE'),
          seq(choice(keyword('ROLLBACK'), keyword('ABORT'), keyword('FAIL')), ',', field('message', $._expression))
        ),
        ')'
      ),

    unary_expression: ($) =>
      choice(
        prec.right(PREC.NOT, seq(field('operator', keyword('NOT')), field('operand', $._expression))),
        prec.right(PREC.UNARY, seq(field('operator', choice('~', '+', '-')), field('operand', $._expression)))
      ),

    binary_expression: ($) => {
      /** @type {[number, RuleOrLiteral][]} */
      const operators = [
        [PREC.OR, keyword('OR')],
        [PREC.AND, keyword('AND')],
        [
          PREC.EQUALITY,
          choice(
            '=',
            '==',
            '!=',
            '<>',
            keyword('IS'),
            keywords('IS NOT'),
            keywords('IS DISTINCT FROM'),
            keywords('IS NOT DISTINCT FROM')
          ),
        ],
        [PREC.RELATIONAL, choice('<', '<=', '>', '>=')],
        [PREC.BITWISE, choice('&', '|', '<<', '>>')],
        [PREC.ADDITIVE, choice('+', '-')],
        [PREC.MULTIPLICATIVE, choice('*', '/', '%')],
        [PREC.CONCAT, choice('||', '->', '->>')],
      ];
      return choice(
        ...operators.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(field('left', $._expression), field('operator', operator), field('right', $._expression))
          )
        )
      );
    },

    collate_expression: ($) =>
      prec.left(
        PREC.COLLATE,
        seq(field('value', $._expression), keyword('COLLATE'), field('collation', $._narrow_name))
      ),

    like_expression: ($) =>
      prec.left(
        PREC.EQUALITY,
        seq(
          field('left', $._expression),
          optional(keyword('NOT')),
          field('operator', choice(keyword('LIKE'), keyword('GLOB'), keyword('REGEXP'), keyword('MATCH'))),
          field('right', $._expression),
          optional(prec(PREC.ESCAPE, seq(keyword('ESCAPE'), field('escape', $._expression))))
        )
      ),

    between_expression: ($) =>
      prec.left(
        PREC.EQUALITY,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('BETWEEN'),
          field('low', $._expression),
          keyword('AND'),
          field('high', $._expression)
        )
      ),

    in_expression: ($) =>
      prec.left(
        PREC.EQUALITY,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('IN'),
          choice(
            seq('(', choice($.select_statement, commaSep($._expression)), ')'),
            seq(field('table', $.qualified_name), optional(seq('(', commaSep($._expression), ')')))
          )
        )
      ),

    null_test_expression: ($) =>
      choice(
        prec.left(PREC.EQUALITY, seq(field('value', $._expression), choice(keyword('ISNULL'), keyword('NOTNULL')))),
        prec.left(PREC.NOT, seq(field('value', $._expression), keywords('NOT NULL')))
      ),

    // Names

    qualified_name: ($) => seq(optional(seq(field('schema', $._name), '.')), field('name', $._name)),

    // `nm` in parse.y: a name, which may also be a string literal.
    _name: ($) => choice($._identifier, $.string_literal, $._illegal),

    // `ids` in parse.y.
    _narrow_name: ($) => choice(reserved('ids', $.identifier), $.quoted_identifier, $.string_literal, $._illegal),

    _identifier: ($) => choice($.identifier, $.quoted_identifier),

    identifier: () => new RegExp(`[${IDENTIFIER_START}][${IDENTIFIER_PART}]*`, 'u'),

    quoted_identifier: () => token(choice(quoted('"'), quoted('`'), /\[[^\]\u0000]*\]/)),

    // Literals

    string_literal: () => quoted("'"),

    numeric_literal: () =>
      token(
        choice(
          new RegExp(`0[xX]${HEX_DIGITS}`),
          new RegExp(`(${DIGITS}(\\.(${DIGITS})?)?|\\.${DIGITS})([eE][+-]?${DIGITS})?`)
        )
      ),

    // A number without digit separators (`number` in parse.y).
    _signed_number: ($) => choice($._unseparated_number, alias($._signed_unseparated_number, $.unary_expression)),

    _signed_unseparated_number: ($) =>
      seq(field('operator', choice('+', '-')), field('operand', $._unseparated_number)),

    _unseparated_number: ($) =>
      alias(token(choice(/0[xX][0-9a-fA-F]+/, /([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?/)), $.numeric_literal),

    blob_literal: () => /[xX]'([0-9a-fA-F][0-9a-fA-F])*'/,

    // A `#` followed by a digit names a register, which only SQLite's own nested statements may use, and a numbered
    // parameter counts from 1 (`sqlite3ExprAssignVarNumber` in src/expr.c).
    bind_parameter: () =>
      new RegExp(
        `\\?([0-9]*[1-9][0-9]*)?|([:@$](::)*[${IDENTIFIER_PART}]|#((::)+[${IDENTIFIER_PART}]|[${IDENTIFIER_START}$]))([${IDENTIFIER_PART}]|::)*(\\([^\\t\\n\\v\\f\\r )\\x00]*\\))?`,
        'u'
      ),

    // SQLite reads an unterminated block comment as a comment to the end of the input, except for `/*` alone at the end.
    comment: () => token(choice(lineComment, blockComment, /\/\*(([^*\u0000]|\*+[^*/\u0000])+\**|\*+)/)),
  },
});
