// @ts-check

/** @import {GrammarSymbols, RuleOrLiteral} from '@willbooster/web-tree-sitter/dsl' */

import { commaSep, commaSep1, keyword, keywordPattern, keywords } from '../common/common.mjs';

// The CLI injects the DSL before loading this grammar.
const { grammar, alias, choice, field, optional, prec, repeat, repeat1, reserved, seq, token } =
  /** @type {typeof globalThis & import('@willbooster/web-tree-sitter/dsl').DSL} */ (globalThis);

// Precedence levels follow Oracle Database 23ai SQL Language Reference Table 4-1 ("SQL Operator Precedence"):
// unary (+, -, PRIOR, CONNECT_BY_ROOT) > (*, /) > (+, -, ||) > comparisons > predicates > NOT > AND > OR.
const PREC = {
  OR: 1,
  AND: 2,
  NOT: 3,
  PREDICATE: 4,
  ESCAPE: 5,
  COMPARISON: 6,
  MULTISET: 7,
  ADDITIVE: 8,
  MULTIPLICATIVE: 9,
  EXPONENT: 10,
  UNARY: 11,
  AT_TIME_ZONE: 12,
  COLLATE: 13,
  POSTFIX: 14,
};

// Oracle SQL reserved words (Oracle Database 23ai SQL Language Reference, Appendix C).
const SQL_RESERVED = [
  'ACCESS',
  'ADD',
  'ALL',
  'ALTER',
  'AND',
  'ANY',
  'AS',
  'ASC',
  'AUDIT',
  'BETWEEN',
  'BY',
  'CHAR',
  'CHECK',
  'CLUSTER',
  'COLUMN',
  'COMMENT',
  'COMPRESS',
  'CONNECT',
  'CREATE',
  'CURRENT',
  'DATE',
  'DECIMAL',
  'DEFAULT',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'ELSE',
  'EXCLUSIVE',
  'EXISTS',
  'FILE',
  'FLOAT',
  'FOR',
  'FROM',
  'GRANT',
  'GROUP',
  'HAVING',
  'IDENTIFIED',
  'IMMEDIATE',
  'IN',
  'INCREMENT',
  'INDEX',
  'INITIAL',
  'INSERT',
  'INTEGER',
  'INTERSECT',
  'INTO',
  'IS',
  'LEVEL',
  'LIKE',
  'LOCK',
  'LONG',
  'MAXEXTENTS',
  'MINUS',
  'MLSLABEL',
  'MODE',
  'MODIFY',
  'NOAUDIT',
  'NOCOMPRESS',
  'NOT',
  'NOWAIT',
  'NULL',
  'NUMBER',
  'OF',
  'OFFLINE',
  'ON',
  'ONLINE',
  'OPTION',
  'OR',
  'ORDER',
  'PCTFREE',
  'PRIOR',
  'PUBLIC',
  'RAW',
  'RENAME',
  'RESOURCE',
  'REVOKE',
  'ROW',
  'ROWID',
  'ROWNUM',
  'ROWS',
  'SELECT',
  'SESSION',
  'SET',
  'SHARE',
  'SIZE',
  'SMALLINT',
  'START',
  'SUCCESSFUL',
  'SYNONYM',
  'SYSDATE',
  'TABLE',
  'THEN',
  'TO',
  'TRIGGER',
  'UID',
  'UNION',
  'UNIQUE',
  'UPDATE',
  'USER',
  'VALIDATE',
  'VALUES',
  'VARCHAR',
  'VARCHAR2',
  'VIEW',
  'WHENEVER',
  'WHERE',
  'WITH',
];

// Keywords that start a join or trailing table/query clause and therefore cannot stand as an unquoted table alias
// without `AS`.
const TABLE_ALIAS_EXCLUDED = [
  ...SQL_RESERVED,
  'APPLY',
  'CROSS',
  'EXCEPT',
  'FETCH',
  'FULL',
  'INNER',
  'JOIN',
  'LEFT',
  'LOG',
  'MATCH_RECOGNIZE',
  'MODEL',
  'NATURAL',
  'OFFSET',
  'OUTER',
  'PIVOT',
  'RETURN',
  'RETURNING',
  'RIGHT',
  'SAMPLE',
  'UNPIVOT',
  'USING',
  'VERSIONS',
  'WHEN',
  'WINDOW',
];

// PL/SQL permits several SQL-only DDL reserved words (such as `FILE`, `SESSION`, `SIZE`, `COMMENT`, `RAW`, `ROW`,
// `USER`, `UID`, `LEVEL`) as variable and parameter names while reserving control-flow block keywords (`IF`, `LOOP`,
// `CASE`, `END`, `BEGIN`, `DECLARE`, `EXCEPTION`, `ELSIF`, `WHILE`).
const PLSQL_RESERVED = [
  'ALL',
  'ALTER',
  'AND',
  'ANY',
  'AS',
  'ASC',
  'BEGIN',
  'BETWEEN',
  'BY',
  'CASE',
  'CHECK',
  'CLUSTER',
  'CONNECT',
  'CREATE',
  'CURRENT',
  'DATE',
  'DECIMAL',
  'DECLARE',
  'DEFAULT',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'ELSE',
  'ELSIF',
  'END',
  'EXCEPTION',
  'EXISTS',
  'FLOAT',
  'FOR',
  'FROM',
  'GRANT',
  'GROUP',
  'HAVING',
  'IF',
  'IN',
  'INDEX',
  'INSERT',
  'INTEGER',
  'INTERSECT',
  'INTO',
  'IS',
  'LIKE',
  'LOCK',
  'LOOP',
  'MINUS',
  'MODE',
  'NOT',
  'NOWAIT',
  'NULL',
  'NUMBER',
  'OF',
  'ON',
  'OPTION',
  'OR',
  'ORDER',
  'PRIOR',
  'PUBLIC',
  'REVOKE',
  'SELECT',
  'SET',
  'SHARE',
  'SMALLINT',
  'START',
  'TABLE',
  'THEN',
  'TO',
  'UNION',
  'UNIQUE',
  'UPDATE',
  'VALUES',
  'VARCHAR',
  'VARCHAR2',
  'VIEW',
  'WHEN',
  'WHERE',
  'WHILE',
  'WITH',
];

// Non-reserved keywords that initiate dedicated expression syntax (`CAST(...)`, `TIMESTAMP '...'`, etc.). Including
// them as aliased identifiers in non-call positions lets columns and variables keep those names without ambiguity.
const SPECIAL_EXPR_KEYWORDS = [
  'CAST',
  'CURSOR',
  'EXTRACT',
  'INTERVAL',
  'JSON_ARRAY',
  'JSON_ARRAYAGG',
  'JSON_EXISTS',
  'JSON_OBJECT',
  'JSON_OBJECTAGG',
  'JSON_QUERY',
  'JSON_VALUE',
  'LISTAGG',
  'MULTISET',
  'TIMESTAMP',
  'TRANSLATE',
  'TREAT',
  'TRIM',
  'XMLATTRIBUTES',
  'XMLELEMENT',
  'XMLFOREST',
];

// Oracle unquoted identifiers start with an ASCII or non-ASCII letter (excluding BOM) and may continue with letters,
// digits, `_`, `$`, and `#`.
const IDENTIFIER_START = String.raw`A-Za-z\u0080-\uFEFE\uFF00-\u{10FFFF}`;
const IDENTIFIER_PART = String.raw`A-Za-z0-9_$#\u0080-\u{10FFFF}`;

/** @param {GrammarSymbols<string>} $ */
const optionalIfNotExists = ($) => optional($.if_not_exists);

/** @param {GrammarSymbols<string>} $ */
const optionalIfExists = ($) => optional($.if_exists);

/** @type {[number, RuleOrLiteral, 'left' | 'right'][]} */
const ARITHMETIC_OPERATORS = [
  [PREC.ADDITIVE, choice('+', '-', '||'), 'left'],
  [PREC.MULTIPLICATIVE, choice('*', '/'), 'left'],
  [PREC.EXPONENT, '**', 'right'],
];

/**
 * @param {RuleOrLiteral} operand
 * @param {[number, RuleOrLiteral, 'left' | 'right'][]} operators
 */
const binaryExpression = (operand, operators) =>
  choice(
    ...operators.map(([precedence, operator, assoc]) =>
      prec[assoc](precedence, seq(field('left', operand), field('operator', operator), field('right', operand)))
    )
  );

export default grammar({
  name: 'oracle',

  extras: ($) => [/[\t\n\f\r ][\t\n\v\f\r ]*/, new RegExp(String.raw`\uFEFF`), $.comment],

  externals: ($) => [
    $._illegal_token,
    $._unreachable,
    $.comment,
    $.string_literal,
    $.quoted_identifier,
    $.numeric_literal,
    $.size_literal,
    $.bind_variable,
    $._slash_terminator,
  ],

  word: ($) => $.identifier,

  reserved: {
    global: () => SQL_RESERVED.map(keywordPattern),
    table_alias: () => TABLE_ALIAS_EXCLUDED.map(keywordPattern),
    plsql: () => PLSQL_RESERVED.map(keywordPattern),
    member: () => [],
  },

  supertypes: ($) => [$._sql_statement, $._plsql_statement],

  conflicts: ($) => [
    [$.select_item],
    [$.function_call],
    [$.listagg_expression],
    [$.json_function_expression],
    [$.insert_into_clause],
    [$.error_logging_clause],
  ],

  rules: {
    source_file: ($) =>
      seq(
        repeat($._statement_terminator),
        repeat(choice($._terminated_sql_statement, $._terminated_plsql_statement)),
        optional($._sql_statement)
      ),

    _terminated_sql_statement: ($) => seq($._sql_statement, repeat1($._statement_terminator)),

    _terminated_plsql_statement: ($) => seq($._plsql_statement, repeat($._statement_terminator)),

    _statement_terminator: ($) => choice(';', alias($._slash_terminator, '/')),

    _sql_statement: ($) =>
      choice(
        $.select_statement,
        $.insert_statement,
        $.update_statement,
        $.delete_statement,
        $.merge_statement,
        $.create_table_statement,
        $.alter_table_statement,
        $.create_index_statement,
        $.alter_index_statement,
        $.create_view_statement,
        $.alter_view_statement,
        $.create_materialized_view_statement,
        $.alter_materialized_view_statement,
        $.create_sequence_statement,
        $.alter_sequence_statement,
        $.create_synonym_statement,
        $.create_database_link_statement,
        $.create_directory_statement,
        $.create_user_statement,
        $.alter_user_statement,
        $.create_role_statement,
        $.alter_role_statement,
        $.create_profile_statement,
        $.alter_profile_statement,
        $.create_tablespace_statement,
        $.alter_tablespace_statement,
        $.create_dimension_statement,
        $.alter_dimension_statement,
        $.create_type_statement,
        $.alter_plsql_unit_statement,
        $.drop_statement,
        $.truncate_statement,
        $.rename_statement,
        $.comment_statement,
        $.grant_statement,
        $.revoke_statement,
        $.flashback_table_statement,
        $.purge_statement,
        $.lock_table_statement,
        $.commit_statement,
        $.rollback_statement,
        $.savepoint_statement,
        $.set_transaction_statement,
        $.set_constraints_statement,
        $.set_role_statement,
        $.alter_session_statement,
        $.alter_system_statement,
        $.explain_plan_statement,
        $.analyze_statement,
        $.audit_statement,
        $.noaudit_statement,
        $.call_statement
      ),

    _plsql_statement: ($) =>
      choice(
        $.anonymous_block,
        $.create_procedure_statement,
        $.create_function_statement,
        $.create_package_statement,
        $.create_package_body_statement,
        $.create_type_body_statement,
        $.create_trigger_statement
      ),

    if_not_exists: () => keywords('IF NOT EXISTS'),

    if_exists: () => keywords('IF EXISTS'),

    _or_replace: () => keywords('OR REPLACE'),

    _editionable: () => choice(keyword('EDITIONABLE'), keyword('NONEDITIONABLE')),

    // =========================================================================
    // Queries (SELECT, WITH, FROM, joins, hierarchical, analytics, set ops)
    // =========================================================================

    select_statement: ($) =>
      prec.right(
        seq(
          optional($.with_clause),
          $._query_expression,
          repeat(choice($.order_by_clause, $.row_limiting_clause, $.for_update_clause))
        )
      ),

    with_clause: ($) =>
      seq(
        keyword('WITH'),
        choice(
          seq(repeat1($._plsql_with_declaration), optional(commaSep1($.common_table_expression))),
          commaSep1($.common_table_expression)
        )
      ),

    _plsql_with_declaration: ($) => choice($.plsql_function_definition, $.plsql_procedure_definition),

    common_table_expression: ($) =>
      seq(
        field('name', $._name),
        optional($.column_list),
        keyword('AS'),
        optional(choice(keyword('MATERIALIZED'), keywords('NOT MATERIALIZED'))),
        '(',
        $.select_statement,
        ')',
        optional($.search_clause),
        optional($.cycle_clause)
      ),

    search_clause: ($) =>
      seq(
        keyword('SEARCH'),
        choice(keyword('DEPTH'), keyword('BREADTH')),
        keywords('FIRST BY'),
        commaSep1($.ordering_term),
        keyword('SET'),
        field('ordering_column', $._name)
      ),

    cycle_clause: ($) =>
      seq(
        keyword('CYCLE'),
        commaSep1($._name),
        keyword('SET'),
        field('cycle_mark', $._name),
        keyword('TO'),
        field('cycle_value', $._literal),
        keyword('DEFAULT'),
        field('no_cycle_value', $._literal)
      ),

    _query_expression: ($) =>
      choice($.select_core, $.values_clause, $.compound_query, alias($._parenthesized_query, $.subquery)),

    _parenthesized_query: ($) => seq('(', $.select_statement, optional($.subquery_restriction_clause), ')'),

    compound_query: ($) =>
      prec.left(
        1,
        seq(
          field('left', $._query_expression),
          field('operator', $.compound_operator),
          field('right', $._query_expression)
        )
      ),

    compound_operator: () =>
      seq(
        choice(keyword('UNION'), keyword('INTERSECT'), keyword('MINUS'), keyword('EXCEPT')),
        optional(choice(keyword('ALL'), keyword('DISTINCT')))
      ),

    values_clause: ($) => seq(keyword('VALUES'), commaSep1($.values_row)),

    values_row: ($) => seq('(', commaSep1(choice($._expression, keyword('DEFAULT'))), ')'),

    select_core: ($) =>
      seq(
        keyword('SELECT'),
        optional(choice(keyword('DISTINCT'), keyword('UNIQUE'), keyword('ALL'))),
        $.select_list,
        optional($.into_clause),
        optional($.from_clause),
        optional($.where_clause),
        repeat(
          choice(
            $.hierarchical_query_clause,
            $.group_by_clause,
            $.having_clause,
            $.window_clause,
            $.qualify_clause,
            $.model_clause
          )
        )
      ),

    select_list: ($) => commaSep1(choice(alias('*', $.all_columns), $.qualified_wildcard, $.select_item)),

    qualified_wildcard: ($) => seq(field('object', $._primary_expression), '.', '*'),

    select_item: ($) => seq(field('value', $._expression), optional($._column_alias)),

    _column_alias: ($) =>
      choice(
        seq(keyword('AS'), field('alias', $._name)),
        field(
          'alias',
          choice(
            $.identifier,
            $.quoted_identifier,
            alias(keyword('OFFSET'), $.identifier),
            alias(keyword('FETCH'), $.identifier),
            alias(keyword('WINDOW'), $.identifier),
            alias(keyword('MODEL'), $.identifier),
            alias(keyword('QUALIFY'), $.identifier),
            alias(keyword('OVER'), $.identifier),
            alias(keyword('FILTER'), $.identifier),
            alias(keyword('KEEP'), $.identifier),
            alias(keyword('WITHIN'), $.identifier)
          )
        )
      ),

    _dml_alias: ($) =>
      choice(
        seq(keyword('AS'), field('alias', $._name)),
        field('alias', choice(reserved('table_alias', $.identifier), $.quoted_identifier))
      ),

    into_clause: ($) => seq(optional(keywords('BULK COLLECT')), keyword('INTO'), commaSep1($._expression)),

    from_clause: ($) => seq(keyword('FROM'), $._from_item, repeat(choice(seq(',', $._from_item), $.join_clause))),

    _from_item: ($) =>
      prec.right(
        seq(
          $._table_primary,
          repeat(choice($.pivot_clause, $.unpivot_clause, $.match_recognize_clause)),
          optional(seq($._dml_alias, optional($.column_list)))
        )
      ),

    _table_primary: ($) =>
      choice(
        $.table_reference,
        $.only_table_reference,
        $.subquery_table,
        $.table_collection_expression,
        $.containers_expression,
        $.json_table_expression,
        $.xmltable_expression,
        seq('(', $._from_item, repeat1(choice(seq(',', $._from_item), $.join_clause)), ')')
      ),

    only_table_reference: ($) => seq(keyword('ONLY'), '(', choice($.table_reference, $.subquery_table), ')'),

    table_reference: ($) =>
      prec.right(
        seq(
          field('name', $.object_name),
          repeat(choice($.partition_extension_clause, $.sample_clause, $.flashback_query_clause)),
          optional($._dml_alias)
        )
      ),

    partition_extension_clause: ($) =>
      seq(
        choice(keyword('PARTITION'), keyword('SUBPARTITION')),
        choice(seq('(', field('partition', $._name), ')'), seq(keyword('FOR'), '(', commaSep1($._expression), ')'))
      ),

    sample_clause: ($) =>
      seq(
        keyword('SAMPLE'),
        optional(keyword('BLOCK')),
        '(',
        field('percent', $._expression),
        ')',
        optional(seq(keyword('SEED'), '(', field('seed', $._expression), ')'))
      ),

    flashback_query_clause: ($) =>
      choice(
        seq(
          keywords('VERSIONS BETWEEN'),
          choice(keyword('SCN'), keyword('TIMESTAMP')),
          choice($._expression, keyword('MINVALUE')),
          keyword('AND'),
          choice($._expression, keyword('MAXVALUE'))
        ),
        seq(keywords('VERSIONS PERIOD FOR'), $._name, keyword('BETWEEN'), $._expression, keyword('AND'), $._expression),
        seq(keywords('AS OF'), choice(keyword('SCN'), keyword('TIMESTAMP')), $._expression),
        seq(keywords('AS OF PERIOD FOR'), $._name, $._expression)
      ),

    subquery_table: ($) =>
      seq(optional(keyword('LATERAL')), '(', $.select_statement, optional($.subquery_restriction_clause), ')'),

    subquery_restriction_clause: ($) =>
      seq(
        keyword('WITH'),
        choice(keywords('READ ONLY'), keywords('CHECK OPTION')),
        optional(seq(keyword('CONSTRAINT'), field('name', $._name)))
      ),

    table_collection_expression: ($) =>
      seq(keyword('TABLE'), '(', $._expression, ')', optional($.outer_join_indicator)),

    containers_expression: ($) => seq(choice(keyword('CONTAINERS'), keyword('SHARDS')), '(', $.object_name, ')'),

    json_table_expression: ($) =>
      seq(
        keyword('JSON_TABLE'),
        '(',
        field('source', $._expression),
        optional(seq(optional(keyword('FORMAT')), keyword('JSON'))),
        optional(seq(',', field('path', $._expression))),
        repeat($._json_passing_or_behavior),
        $.json_table_columns_clause,
        ')'
      ),

    _json_passing_or_behavior: ($) =>
      choice(
        seq(keyword('PASSING'), commaSep1(seq($._expression, keyword('AS'), $._identifier))),
        $._json_on_error_or_empty,
        seq(keyword('ALLOW'), keywords('SCALARS')),
        seq(keyword('DISALLOW'), keywords('SCALARS'))
      ),

    json_table_columns_clause: ($) => seq(keyword('COLUMNS'), '(', commaSep1($.json_table_column), ')'),

    json_table_column: ($) =>
      choice(
        seq(
          keyword('NESTED'),
          optional(keyword('PATH')),
          optional(field('path', $._expression)),
          $.json_table_columns_clause
        ),
        seq(field('name', $._name), keywords('FOR ORDINALITY')),
        seq(
          field('name', $._name),
          optional($.type_name),
          repeat(
            choice(
              keywords('FORMAT JSON'),
              seq(optional(keyword('ALLOW')), keywords('SCALARS')),
              seq(keyword('DISALLOW'), keywords('SCALARS')),
              keyword('EXISTS'),
              keyword('TRUNCATE'),
              seq(keyword('PATH'), field('path', $._expression)),
              $._json_wrapper_clause,
              $._json_on_error_or_empty
            )
          )
        )
      ),

    xmltable_expression: ($) =>
      seq(
        keyword('XMLTABLE'),
        '(',
        optional(seq($.xmlnamespaces_clause, ',')),
        field('xpath', $._expression),
        optional(
          seq(
            keyword('PASSING'),
            optional(keywords('BY VALUE')),
            commaSep1(seq($._expression, optional(seq(keyword('AS'), $._name))))
          )
        ),
        optional(keywords('RETURNING SEQUENCE BY REF')),
        optional(seq(keyword('COLUMNS'), commaSep1($.xmltable_column))),
        ')'
      ),

    xmlnamespaces_clause: ($) =>
      seq(
        keyword('XMLNAMESPACES'),
        '(',
        commaSep1(choice(seq(keyword('DEFAULT'), $.string_literal), seq($.string_literal, keyword('AS'), $._name))),
        ')'
      ),

    xmltable_column: ($) =>
      choice(
        seq(field('name', $._name), keywords('FOR ORDINALITY')),
        seq(
          field('name', $._name),
          $.type_name,
          optional(keywords('BY REF')),
          optional(seq(keyword('PATH'), $.string_literal)),
          optional(seq(keyword('DEFAULT'), $._expression))
        )
      ),

    pivot_clause: ($) =>
      seq(
        keyword('PIVOT'),
        optional(keyword('XML')),
        '(',
        commaSep1(seq($._expression, optional($._column_alias))),
        keyword('FOR'),
        choice($._name, $.column_list),
        keyword('IN'),
        '(',
        choice($.select_statement, keyword('ANY'), commaSep1(seq($._expression, optional($._column_alias)))),
        ')',
        ')'
      ),

    unpivot_clause: ($) =>
      seq(
        keyword('UNPIVOT'),
        optional(seq(choice(keyword('INCLUDE'), keyword('EXCLUDE')), keyword('NULLS'))),
        '(',
        choice($._name, $.column_list),
        keyword('FOR'),
        choice($._name, $.column_list),
        keyword('IN'),
        '(',
        commaSep1(seq(choice($._name, $.column_list), optional(seq(keyword('AS'), $._expression)))),
        ')',
        ')'
      ),

    match_recognize_clause: ($) =>
      seq(
        keyword('MATCH_RECOGNIZE'),
        '(',
        repeat($._match_recognize_option),
        keyword('PATTERN'),
        '(',
        repeat1($._pattern_element),
        ')',
        optional(seq(keyword('SUBSET'), commaSep1(seq($._name, '=', '(', commaSep1($._name), ')')))),
        keyword('DEFINE'),
        commaSep1(seq($._name, keyword('AS'), $._expression)),
        ')'
      ),

    _match_recognize_option: ($) =>
      choice(
        $.partition_by_clause,
        $.order_by_clause,
        seq(keyword('MEASURES'), commaSep1(seq($._expression, keyword('AS'), $._name))),
        keywords('ONE ROW PER MATCH'),
        prec.right(
          seq(
            keywords('ALL ROWS PER MATCH'),
            optional(
              choice(keywords('SHOW EMPTY MATCHES'), keywords('OMIT EMPTY MATCHES'), keywords('WITH UNMATCHED ROWS'))
            )
          )
        ),
        seq(
          keywords('AFTER MATCH SKIP'),
          choice(
            keywords('PAST LAST ROW'),
            keywords('TO NEXT ROW'),
            seq(keywords('TO'), optional(choice(keyword('FIRST'), keyword('LAST'))), $._name)
          )
        )
      ),

    _pattern_element: ($) =>
      choice(
        $._name,
        '^',
        '$',
        '|',
        '*',
        '+',
        '?',
        seq('{', optional($.numeric_literal), optional(seq(',', optional($.numeric_literal))), '}'),
        seq('(', repeat1($._pattern_element), ')'),
        seq('{-', repeat1($._pattern_element), '-}'),
        seq(keyword('PERMUTE'), '(', commaSep1(repeat1($._pattern_element)), ')')
      ),

    join_clause: ($) =>
      prec.right(
        choice(
          seq(choice(keywords('CROSS JOIN'), keywords('CROSS APPLY'), keywords('OUTER APPLY')), $._from_item),
          seq(keyword('NATURAL'), optional($._join_type), keyword('JOIN'), $._from_item),
          seq(
            optional($.partition_by_clause),
            optional($._join_type),
            keyword('JOIN'),
            $._from_item,
            optional($.partition_by_clause),
            choice(seq(keyword('ON'), field('condition', $._expression)), seq(keyword('USING'), $.column_list))
          )
        )
      ),

    _join_type: () =>
      choice(
        keyword('INNER'),
        seq(choice(keyword('LEFT'), keyword('RIGHT'), keyword('FULL')), optional(keyword('OUTER')))
      ),

    where_clause: ($) =>
      seq(
        keyword('WHERE'),
        choice(field('condition', $._expression), seq(keywords('CURRENT OF'), field('cursor', $._name)))
      ),

    hierarchical_query_clause: ($) =>
      prec.right(
        choice(
          seq(
            keywords('START WITH'),
            field('start_with', $._expression),
            keywords('CONNECT BY'),
            optional(keyword('NOCYCLE')),
            field('connect_by', $._expression)
          ),
          seq(
            keywords('CONNECT BY'),
            optional(keyword('NOCYCLE')),
            field('connect_by', $._expression),
            optional(seq(keywords('START WITH'), field('start_with', $._expression)))
          )
        )
      ),

    group_by_clause: ($) => seq(keywords('GROUP BY'), choice(keyword('ALL'), commaSep1($._grouping_element))),

    _grouping_element: ($) =>
      choice($.rollup_clause, $.cube_clause, $.grouping_sets_clause, $.empty_grouping_set, $._expression),

    empty_grouping_set: () => seq('(', ')'),

    rollup_clause: ($) => seq(keyword('ROLLUP'), '(', commaSep1($._expression), ')'),

    cube_clause: ($) => seq(keyword('CUBE'), '(', commaSep1($._expression), ')'),

    grouping_sets_clause: ($) => seq(keywords('GROUPING SETS'), '(', commaSep1($._grouping_element), ')'),

    having_clause: ($) => seq(keyword('HAVING'), field('condition', $._expression)),

    qualify_clause: ($) => seq(keyword('QUALIFY'), field('condition', $._expression)),

    window_clause: ($) => seq(keyword('WINDOW'), commaSep1($.named_window)),

    named_window: ($) => seq(field('name', $._name), keyword('AS'), '(', optional($.window_specification), ')'),

    model_clause: ($) =>
      seq(
        keyword('MODEL'),
        repeat($._model_cell_option),
        optional(seq(keywords('RETURN'), choice(keywords('UPDATED ROWS'), keywords('ALL ROWS')))),
        repeat($.reference_model),
        $.main_model
      ),

    _model_cell_option: () =>
      choice(
        seq(choice(keyword('IGNORE'), keyword('KEEP')), keyword('NAV')),
        seq(keyword('UNIQUE'), choice(keyword('DIMENSION'), keywords('SINGLE REFERENCE')))
      ),

    reference_model: ($) =>
      seq(
        keyword('REFERENCE'),
        $._name,
        keyword('ON'),
        '(',
        $.select_statement,
        ')',
        $.model_column_clauses,
        repeat($._model_cell_option)
      ),

    main_model: ($) =>
      seq(
        optional(seq(keyword('MAIN'), $._name)),
        $.model_column_clauses,
        repeat($._model_cell_option),
        optional($.model_rules_clause)
      ),

    model_column_clauses: ($) =>
      seq(
        optional(seq(keywords('PARTITION BY'), '(', commaSep1(seq($._expression, optional($._column_alias))), ')')),
        keywords('DIMENSION BY'),
        '(',
        commaSep1(seq($._expression, optional($._column_alias))),
        ')',
        keyword('MEASURES'),
        '(',
        commaSep1(seq($._expression, optional($._column_alias))),
        ')'
      ),

    model_rules_clause: ($) =>
      seq(
        repeat(
          choice(
            keyword('RULES'),
            prec.right(seq(keyword('UPSERT'), optional(keyword('ALL')))),
            keyword('UPDATE'),
            keywords('AUTOMATIC ORDER'),
            keywords('SEQUENTIAL ORDER'),
            prec.right(
              seq(keyword('ITERATE'), '(', $._expression, ')', optional(seq(keyword('UNTIL'), '(', $._expression, ')')))
            )
          )
        ),
        '(',
        commaSep1($.model_rule),
        ')'
      ),

    model_rule: ($) =>
      seq(
        optional(choice(seq(keyword('UPSERT'), optional(keyword('ALL'))), keyword('UPDATE'))),
        $.model_cell_reference,
        optional($.order_by_clause),
        '=',
        $._expression
      ),

    model_cell_reference: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(
          field('measure', $._callable_expression),
          '[',
          commaSep1(
            choice(
              $._expression,
              keyword('ANY'),
              seq($._expression, keyword('FOR'), $._name, keyword('IN'), '(', commaSep1($._expression), ')')
            )
          ),
          ']'
        )
      ),

    order_by_clause: ($) =>
      seq(keyword('ORDER'), optional(keyword('SIBLINGS')), keyword('BY'), commaSep1($.ordering_term)),

    ordering_term: ($) =>
      seq(
        field('value', $._expression),
        optional(choice(keyword('ASC'), keyword('DESC'))),
        optional(choice(keywords('NULLS FIRST'), keywords('NULLS LAST')))
      ),

    row_limiting_clause: ($) => prec.right(choice(seq($.offset_clause, optional($.fetch_clause)), $.fetch_clause)),

    offset_clause: ($) =>
      seq(keyword('OFFSET'), field('offset', $._expression), choice(keyword('ROW'), keyword('ROWS'))),

    fetch_clause: ($) =>
      seq(
        keyword('FETCH'),
        choice(keyword('FIRST'), keyword('NEXT')),
        optional(seq(field('count', $._expression), optional(keyword('PERCENT')))),
        choice(keyword('ROW'), keyword('ROWS')),
        choice(keyword('ONLY'), keywords('WITH TIES'))
      ),

    for_update_clause: ($) =>
      seq(
        keywords('FOR UPDATE'),
        optional(seq(keyword('OF'), commaSep1($._primary_expression))),
        optional(choice(keyword('NOWAIT'), seq(keyword('WAIT'), $._expression), keywords('SKIP LOCKED')))
      ),

    // =========================================================================
    // DML Statements (INSERT, UPDATE, DELETE, MERGE)
    // =========================================================================

    insert_statement: ($) =>
      seq(optional($.with_clause), keyword('INSERT'), choice($._single_table_insert, $._multi_table_insert)),

    _single_table_insert: ($) =>
      seq(
        $.insert_into_clause,
        choice($.select_statement, seq(keyword('VALUES'), choice($._identifier, $.member_expression, $.bind_variable))),
        optional($.returning_into_clause),
        optional($.error_logging_clause)
      ),

    insert_into_clause: ($) =>
      seq(keyword('INTO'), field('table', $._dml_target), optional($._dml_alias), optional($.column_list)),

    _multi_table_insert: ($) =>
      seq(
        choice(
          seq(keyword('ALL'), repeat1($._multi_insert_branch), optional($._multi_insert_else)),
          seq(
            optional(choice(keyword('ALL'), keyword('FIRST'))),
            repeat1($._conditional_insert_when),
            optional($._multi_insert_else)
          )
        ),
        $.select_statement
      ),

    _multi_insert_branch: ($) =>
      prec.right(
        seq($.insert_into_clause, optional(seq(keyword('VALUES'), $.values_row)), optional($.error_logging_clause))
      ),

    _conditional_insert_when: ($) =>
      seq(keyword('WHEN'), field('condition', $._expression), keyword('THEN'), repeat1($._multi_insert_branch)),

    _multi_insert_else: ($) => seq(keyword('ELSE'), repeat1($._multi_insert_branch)),

    update_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('UPDATE'),
        field('table', $._dml_target),
        optional($._dml_alias),
        $.set_clause,
        optional($.from_clause),
        optional($.where_clause),
        optional($.returning_into_clause),
        optional($.error_logging_clause)
      ),

    set_clause: ($) => seq(keyword('SET'), commaSep1($.update_assignment)),

    update_assignment: ($) =>
      seq(
        field('left', choice($.column_list, seq(keyword('VALUE'), '(', $._name, ')'), keyword('ROW'), $.object_name)),
        '=',
        field('right', choice($._expression, keyword('DEFAULT')))
      ),

    delete_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('DELETE'),
        optional(keyword('FROM')),
        field('table', $._dml_target),
        optional($._dml_alias),
        optional($.from_clause),
        optional($.where_clause),
        optional($.returning_into_clause),
        optional($.error_logging_clause)
      ),

    merge_statement: ($) =>
      seq(
        keyword('MERGE'),
        keyword('INTO'),
        field('target', $._dml_target),
        optional($._dml_alias),
        keyword('USING'),
        field('source', $._table_primary),
        optional($._dml_alias),
        keyword('ON'),
        '(',
        field('condition', $._expression),
        ')',
        repeat1(choice($.merge_update_clause, $.merge_insert_clause)),
        optional($.error_logging_clause)
      ),

    merge_update_clause: ($) =>
      seq(
        keywords('WHEN MATCHED THEN UPDATE'),
        $.set_clause,
        optional($.where_clause),
        optional(seq(keyword('DELETE'), $.where_clause))
      ),

    merge_insert_clause: ($) =>
      seq(
        keywords('WHEN NOT MATCHED THEN INSERT'),
        optional(seq('(', commaSep1($.object_name), ')')),
        keyword('VALUES'),
        $.values_row,
        optional($.where_clause)
      ),

    _dml_target: ($) =>
      choice(
        seq(field('name', $.object_name), optional($.partition_extension_clause)),
        $.only_table_reference,
        $.subquery_table,
        $.table_collection_expression,
        $.containers_expression
      ),

    returning_into_clause: ($) =>
      seq(
        choice(keyword('RETURNING'), keyword('RETURN')),
        commaSep1($._expression),
        optional(keywords('BULK COLLECT')),
        keyword('INTO'),
        commaSep1($._expression)
      ),

    error_logging_clause: ($) =>
      seq(
        keywords('LOG ERRORS'),
        optional(seq(keyword('INTO'), $.object_name)),
        optional(seq('(', $._expression, ')')),
        optional(seq(keywords('REJECT LIMIT'), choice($.numeric_literal, keyword('UNLIMITED'))))
      ),

    // =========================================================================
    // DDL Statements (TABLE, INDEX, VIEW, SEQUENCE, TYPE, USER, etc.)
    // =========================================================================

    create_table_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(
          choice(
            seq(optional(choice(keyword('GLOBAL'), keyword('PRIVATE'))), keyword('TEMPORARY')),
            keyword('SHARDED'),
            keyword('DUPLICATED'),
            seq(keyword('IMMUTABLE'), optional(keyword('BLOCKCHAIN'))),
            keyword('BLOCKCHAIN')
          )
        ),
        keyword('TABLE'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional(
          seq(
            keyword('SHARING'),
            '=',
            choice(keyword('METADATA'), keyword('DATA'), keywords('EXTENDED DATA'), keyword('NONE'))
          )
        ),
        choice(
          seq(
            '(',
            commaSep1($._table_element),
            ')',
            repeat($._table_property),
            optional(seq(keyword('AS'), $.select_statement))
          ),
          seq(
            keyword('OF'),
            field('object_type', $.type_name),
            optional(
              seq(keywords('OBJECT IDENTIFIER IS'), choice(keywords('SYSTEM GENERATED'), keywords('PRIMARY KEY')))
            ),
            optional(seq('(', commaSep1($._object_table_element), ')')),
            repeat($._table_property),
            optional(seq(keyword('AS'), $.select_statement))
          ),
          seq(repeat($._table_property), keyword('AS'), $.select_statement)
        )
      ),

    _table_element: ($) =>
      choice($.column_definition, $.period_definition, $.table_constraint, $.supplemental_log_clause),

    _object_table_element: ($) =>
      choice($.table_constraint, seq(field('name', $._name), repeat1(choice($.default_clause, $._column_constraint)))),

    period_definition: ($) =>
      seq(keyword('PERIOD'), keyword('FOR'), $._name, optional(seq('(', $._name, ',', $._name, ')'))),

    supplemental_log_clause: ($) =>
      seq(
        keywords('SUPPLEMENTAL LOG'),
        choice(
          seq(
            keyword('DATA'),
            '(',
            commaSep1(
              seq(
                choice(keyword('ALL'), keywords('PRIMARY KEY'), keyword('UNIQUE'), keywords('FOREIGN KEY')),
                optional(keyword('COLUMNS'))
              )
            ),
            ')'
          ),
          seq(
            keyword('GROUP'),
            $._name,
            '(',
            commaSep1(seq($._name, optional(keywords('NO LOG')))),
            ')',
            optional(keyword('ALWAYS'))
          )
        )
      ),

    column_definition: ($) =>
      prec.right(seq(field('name', $._name), optional(field('type', $.type_name)), repeat($._column_attribute))),

    _column_attribute: ($) =>
      choice(
        seq(keyword('COLLATE'), $._name),
        keyword('SORT'),
        keyword('VISIBLE'),
        keyword('INVISIBLE'),
        $.default_clause,
        $.identity_clause,
        $.virtual_column_clause,
        $.encrypt_clause,
        $._column_constraint
      ),

    default_clause: ($) =>
      seq(
        keyword('DEFAULT'),
        optional(
          seq(
            keywords('ON NULL'),
            optional(seq(keywords('FOR INSERT'), optional(choice(keyword('ONLY'), keywords('AND UPDATE')))))
          )
        ),
        field('value', $._default_expression)
      ),

    // Unparenthesized conditions (`NOT`, `AND`, `OR`, `LIKE`, `IN`, `BETWEEN`, `IS NULL`) are excluded so `NOT NULL`
    // and other inline column constraints after `DEFAULT expr` resolve without a shift/reduce conflict; parenthesized
    // conditions remain valid through `parenthesized_expression`.
    _default_expression: ($) =>
      choice(
        $._primary_expression,
        $._literal,
        alias($._default_unary_expression, $.unary_expression),
        alias($._default_binary_expression, $.binary_expression),
        alias($._default_at_time_zone_expression, $.at_time_zone_expression)
      ),

    _default_unary_expression: ($) =>
      prec.right(PREC.UNARY, seq(field('operator', choice('+', '-')), field('operand', $._default_expression))),

    _default_binary_expression: ($) => binaryExpression($._default_expression, ARITHMETIC_OPERATORS),

    _default_at_time_zone_expression: ($) =>
      prec.left(
        PREC.AT_TIME_ZONE,
        seq(
          field('value', $._default_expression),
          keyword('AT'),
          choice(keyword('LOCAL'), seq(keywords('TIME ZONE'), field('zone', $._default_expression)))
        )
      ),

    identity_clause: ($) =>
      seq(
        keyword('GENERATED'),
        optional(choice(keyword('ALWAYS'), seq(keywords('BY DEFAULT'), optional(keywords('ON NULL'))))),
        keywords('AS IDENTITY'),
        optional(seq('(', repeat(seq($.sequence_option, optional(','))), ')'))
      ),

    virtual_column_clause: ($) =>
      seq(
        optional(keywords('GENERATED ALWAYS')),
        keyword('AS'),
        '(',
        field('expression', $._expression),
        ')',
        optional(keyword('VIRTUAL'))
      ),

    encrypt_clause: ($) =>
      prec.right(
        seq(
          keyword('ENCRYPT'),
          optional(seq(keyword('USING'), $.string_literal)),
          optional(seq(keywords('IDENTIFIED BY'), choice($._name, $.string_literal))),
          optional(choice(keyword('SALT'), keywords('NO SALT')))
        )
      ),

    _column_constraint: ($) =>
      prec.right(
        seq(
          optional($.constraint_name),
          choice(
            keyword('NULL'),
            keywords('NOT NULL'),
            keywords('PRIMARY KEY'),
            keyword('UNIQUE'),
            $.check_constraint,
            $.references_clause
          ),
          repeat($._constraint_state)
        )
      ),

    constraint_name: ($) => seq(keyword('CONSTRAINT'), field('name', $._name)),

    check_constraint: ($) => seq(keyword('CHECK'), '(', field('condition', $._expression), ')'),

    references_clause: ($) =>
      prec.right(
        seq(
          keyword('REFERENCES'),
          field('table', $.object_name),
          optional($.column_list),
          optional(seq(keywords('ON DELETE'), choice(keyword('CASCADE'), keywords('SET NULL'))))
        )
      ),

    table_constraint: ($) =>
      prec.right(
        seq(
          optional($.constraint_name),
          choice(
            seq(keywords('PRIMARY KEY'), $.column_list),
            seq(keyword('UNIQUE'), $.column_list),
            $.check_constraint,
            seq(keywords('FOREIGN KEY'), $.column_list, $.references_clause),
            seq(keywords('SCOPE FOR'), '(', $._name, ')', keyword('IS'), $.object_name),
            seq(keyword('WITH'), keyword('ROWID')),
            seq(keywords('REF'), '(', $._name, ')', keywords('WITH ROWID'))
          ),
          repeat($._constraint_state)
        )
      ),

    _constraint_state: ($) =>
      choice(
        seq(optional(keyword('NOT')), keyword('DEFERRABLE')),
        seq(keyword('INITIALLY'), choice(keyword('IMMEDIATE'), keyword('DEFERRED'))),
        keyword('RELY'),
        keyword('NORELY'),
        $.using_index_clause,
        keyword('ENABLE'),
        keyword('DISABLE'),
        keyword('VALIDATE'),
        keyword('NOVALIDATE'),
        seq(keywords('EXCEPTIONS INTO'), $.object_name)
      ),

    using_index_clause: ($) =>
      prec.right(
        seq(
          keywords('USING INDEX'),
          choice(seq('(', $.create_index_statement, ')'), repeat1($._index_attribute), $.object_name)
        )
      ),

    _table_property: ($) =>
      prec.right(
        choice(
          $._segment_or_storage_attr,
          seq(
            keywords('ON COMMIT'),
            choice(
              keywords('DELETE ROWS'),
              keywords('PRESERVE ROWS'),
              keywords('DROP DEFINITION'),
              keywords('PRESERVE DEFINITION')
            )
          ),
          $.organization_clause,
          $.lob_storage_clause,
          $.nested_table_storage_clause,
          $.varray_storage_clause,
          $.xmltype_storage_clause,
          $.table_partitioning_clause,
          keyword('CACHE'),
          keyword('NOCACHE'),
          $.parallel_clause,
          keyword('MONITORING'),
          keyword('NOMONITORING'),
          keyword('ROWDEPENDENCIES'),
          keyword('NOROWDEPENDENCIES'),
          seq(choice(keyword('ENABLE'), keyword('DISABLE')), keywords('ROW MOVEMENT')),
          seq(keywords('RESULT_CACHE'), '(', keyword('MODE'), choice(keyword('DEFAULT'), keyword('FORCE')), ')'),
          seq(optional(keyword('NO')), keywords('FLASHBACK ARCHIVE'), optional($._name)),
          seq(keyword('NO'), keyword('INMEMORY')),
          prec.right(
            seq(
              keyword('INMEMORY'),
              repeat(
                choice(
                  keywords('MEMCOMPRESS FOR QUERY'),
                  keywords('MEMCOMPRESS FOR CAPACITY'),
                  keywords('NO MEMCOMPRESS'),
                  seq(keyword('PRIORITY'), $._name)
                )
              )
            )
          ),
          seq(keywords('DEFAULT COLLATION'), $._name),
          keywords('READ ONLY'),
          keywords('READ WRITE')
        )
      ),

    _segment_or_storage_attr: ($) =>
      choice(
        seq(keywords('SEGMENT CREATION'), choice(keyword('IMMEDIATE'), keyword('DEFERRED'))),
        seq(keyword('PCTFREE'), $.numeric_literal),
        seq(keyword('PCTUSED'), $.numeric_literal),
        seq(keyword('INITRANS'), $.numeric_literal),
        seq(keyword('MAXTRANS'), $.numeric_literal),
        seq(keyword('TABLESPACE'), field('tablespace', $._name)),
        $.storage_clause,
        keyword('LOGGING'),
        keyword('NOLOGGING'),
        keyword('FILESYSTEM_LIKE_LOGGING'),
        $.compression_clause
      ),

    compression_clause: ($) =>
      prec.right(
        choice(
          keyword('NOCOMPRESS'),
          seq(
            optional(choice(keywords('ROW STORE'), keywords('COLUMN STORE'))),
            keyword('COMPRESS'),
            optional(
              choice(
                keyword('BASIC'),
                keyword('ADVANCED'),
                seq(
                  keyword('FOR'),
                  choice(
                    keyword('OLTP'),
                    keywords('QUERY LOW'),
                    keywords('QUERY HIGH'),
                    keywords('ARCHIVE LOW'),
                    keywords('ARCHIVE HIGH'),
                    keywords('ALL OPERATIONS'),
                    keywords('DIRECT_LOAD OPERATIONS')
                  )
                ),
                $.numeric_literal
              )
            )
          )
        )
      ),

    storage_clause: ($) => seq(keyword('STORAGE'), '(', repeat1($._storage_param), ')'),

    _storage_param: ($) =>
      choice(
        seq(keyword('INITIAL'), $.size_spec),
        seq(keyword('NEXT'), $.size_spec),
        seq(keyword('MINEXTENTS'), $.numeric_literal),
        seq(keyword('MAXEXTENTS'), choice($.numeric_literal, keyword('UNLIMITED'))),
        seq(keyword('MAXSIZE'), choice($.size_spec, keyword('UNLIMITED'))),
        seq(keyword('PCTINCREASE'), $.numeric_literal),
        seq(keyword('FREELISTS'), $.numeric_literal),
        seq(keywords('FREELIST GROUPS'), $.numeric_literal),
        seq(keyword('OPTIMAL'), optional(choice($.size_spec, keyword('NULL')))),
        seq(keyword('BUFFER_POOL'), choice(keyword('KEEP'), keyword('RECYCLE'), keyword('DEFAULT'))),
        seq(keyword('FLASH_CACHE'), choice(keyword('KEEP'), keyword('NONE'), keyword('DEFAULT'))),
        seq(keyword('CELL_FLASH_CACHE'), choice(keyword('KEEP'), keyword('NONE'), keyword('DEFAULT'))),
        keyword('ENCRYPT')
      ),

    size_spec: ($) =>
      choice(
        $.size_literal,
        seq(
          $.numeric_literal,
          optional(choice(keyword('K'), keyword('M'), keyword('G'), keyword('T'), keyword('P'), keyword('E')))
        )
      ),

    parallel_clause: ($) =>
      prec.right(choice(keyword('NOPARALLEL'), seq(keyword('PARALLEL'), optional($.numeric_literal)))),

    organization_clause: ($) =>
      prec.right(
        seq(
          keyword('ORGANIZATION'),
          choice(
            keyword('HEAP'),
            seq(
              keyword('INDEX'),
              repeat(
                choice(
                  $._segment_or_storage_attr,
                  seq(keyword('PCTTHRESHOLD'), $.numeric_literal),
                  seq(keyword('INCLUDING'), $._name),
                  seq(optional(keyword('MAPPING')), keyword('TABLE')),
                  keyword('NOMAPPING'),
                  prec.right(seq(keyword('OVERFLOW'), repeat($._segment_or_storage_attr)))
                )
              )
            ),
            seq(
              keyword('EXTERNAL'),
              '(',
              optional(seq(keyword('TYPE'), $._name)),
              optional(seq(keywords('DEFAULT DIRECTORY'), $._name)),
              optional(
                seq(
                  keywords('ACCESS PARAMETERS'),
                  choice(
                    seq(
                      '(',
                      repeat(choice($.string_literal, $.numeric_literal, $._identifier, ',', ':', '=', '.')),
                      ')'
                    ),
                    seq(keyword('USING'), keyword('CLOB'), $.select_statement)
                  )
                )
              ),
              optional(
                seq(keyword('LOCATION'), '(', commaSep1(seq(optional(seq($._name, ':')), $.string_literal)), ')')
              ),
              ')',
              optional(seq(keywords('REJECT LIMIT'), choice($.numeric_literal, keyword('UNLIMITED'))))
            )
          )
        )
      ),

    lob_storage_clause: ($) =>
      prec.right(
        seq(
          keyword('LOB'),
          $.column_list,
          keywords('STORE AS'),
          optional(choice(keyword('BASICFILE'), keyword('SECUREFILE'))),
          optional($._name),
          optional(seq('(', repeat1($._lob_parameter), ')'))
        )
      ),

    _lob_parameter: ($) =>
      prec.right(
        choice(
          $._segment_or_storage_attr,
          seq(choice(keyword('ENABLE'), keyword('DISABLE')), keywords('STORAGE IN ROW')),
          seq(keyword('CHUNK'), $.size_spec),
          seq(keyword('PCTVERSION'), $.numeric_literal),
          keyword('RETENTION'),
          keyword('FREEPOOLS'),
          keyword('CACHE'),
          seq(keyword('NOCACHE'), optional(choice(keyword('LOGGING'), keyword('NOLOGGING')))),
          seq(keyword('CACHE'), keywords('READS'), optional(choice(keyword('LOGGING'), keyword('NOLOGGING')))),
          keyword('DEDUPLICATE'),
          keyword('KEEP_DUPLICATES'),
          $.encrypt_clause,
          keyword('DECRYPT')
        )
      ),

    nested_table_storage_clause: ($) =>
      prec.right(
        seq(
          keywords('NESTED TABLE'),
          $._primary_expression,
          keywords('STORE AS'),
          field('storage_table', $._name),
          optional(seq('(', repeat1(choice($._table_element, $._table_property)), ')')),
          optional(seq(keywords('RETURN AS'), choice(keyword('LOCATOR'), keyword('VALUE'))))
        )
      ),

    varray_storage_clause: ($) =>
      prec.right(
        seq(
          keyword('VARRAY'),
          $._primary_expression,
          keywords('STORE AS'),
          optional(choice(keyword('BASICFILE'), keyword('SECUREFILE'))),
          keyword('LOB'),
          optional($._name),
          optional(seq('(', repeat1($._lob_parameter), ')'))
        )
      ),

    xmltype_storage_clause: ($) =>
      prec.right(
        seq(
          keyword('XMLTYPE'),
          optional(keyword('COLUMN')),
          $._name,
          keywords('STORE AS'),
          optional(choice(keyword('BASICFILE'), keyword('SECUREFILE'))),
          choice(keywords('BINARY XML'), keyword('CLOB'), keywords('OBJECT RELATIONAL')),
          optional($._name),
          optional(seq('(', repeat1($._lob_parameter), ')'))
        )
      ),

    table_partitioning_clause: ($) =>
      prec.right(
        seq(
          keywords('PARTITION BY'),
          choice(
            seq(
              keyword('RANGE'),
              $.column_list,
              optional(
                seq(
                  keyword('INTERVAL'),
                  '(',
                  $._expression,
                  ')',
                  optional(seq(keywords('STORE IN'), '(', commaSep1($._name), ')'))
                )
              )
            ),
            seq(
              keyword('LIST'),
              $.column_list,
              optional(seq(keyword('AUTOMATIC'), optional(seq(keywords('STORE IN'), '(', commaSep1($._name), ')'))))
            ),
            seq(keyword('HASH'), $.column_list),
            keyword('SYSTEM'),
            seq(keyword('REFERENCE'), '(', $._name, ')')
          ),
          optional($.subpartition_by_clause),
          optional(seq(keywords('SUBPARTITION TEMPLATE'), '(', commaSep1($.subpartition_definition), ')')),
          optional(
            choice(
              seq(
                keyword('PARTITIONS'),
                $.numeric_literal,
                optional(seq(keywords('STORE IN'), '(', commaSep1($._name), ')'))
              ),
              seq('(', commaSep1($.partition_definition), ')')
            )
          )
        )
      ),

    subpartition_by_clause: ($) =>
      seq(
        keywords('SUBPARTITION BY'),
        choice(
          seq(keyword('RANGE'), $.column_list),
          seq(keyword('LIST'), $.column_list),
          seq(keyword('HASH'), $.column_list, optional(seq(keyword('SUBPARTITIONS'), $.numeric_literal)))
        )
      ),

    partition_definition: ($) =>
      prec.right(
        seq(
          keyword('PARTITION'),
          optional(field('name', $._name)),
          optional($.partition_values_clause),
          repeat(
            choice($._segment_or_storage_attr, $.lob_storage_clause, keywords('READ ONLY'), keywords('READ WRITE'))
          ),
          optional(
            choice(
              seq(keyword('SUBPARTITIONS'), $.numeric_literal),
              seq('(', commaSep1($.subpartition_definition), ')')
            )
          )
        )
      ),

    subpartition_definition: ($) =>
      prec.right(
        seq(
          keyword('SUBPARTITION'),
          optional(field('name', $._name)),
          optional($.partition_values_clause),
          repeat($._segment_or_storage_attr)
        )
      ),

    partition_values_clause: ($) =>
      choice(
        seq(keywords('VALUES LESS THAN'), '(', commaSep1(choice($._expression, keyword('MAXVALUE'))), ')'),
        seq(keyword('VALUES'), '(', commaSep1(choice($._expression, keyword('DEFAULT'))), ')')
      ),

    // =========================================================================
    // Oracle Data Types
    // =========================================================================

    type_name: ($) =>
      prec.right(
        choice(
          seq(
            choice(keyword('VARCHAR2'), keyword('VARCHAR'), keyword('CHAR'), keyword('CHARACTER')),
            optional(keyword('VARYING')),
            optional(seq('(', $.numeric_literal, optional(choice(keyword('BYTE'), keyword('CHAR'))), ')'))
          ),
          seq(
            choice(keyword('NVARCHAR2'), keyword('NCHAR')),
            optional(keyword('VARYING')),
            optional(seq('(', $.numeric_literal, ')'))
          ),
          seq(
            keyword('NATIONAL'),
            choice(keyword('CHAR'), keyword('CHARACTER')),
            optional(keyword('VARYING')),
            optional(seq('(', $.numeric_literal, ')'))
          ),
          seq(
            choice(keyword('NUMBER'), keyword('NUMERIC'), keyword('DECIMAL'), keyword('DEC')),
            optional(seq('(', choice('*', $._signed_integer), optional(seq(',', $._signed_integer)), ')'))
          ),
          keyword('INTEGER'),
          keyword('INT'),
          keyword('SMALLINT'),
          seq(keyword('FLOAT'), optional(seq('(', $.numeric_literal, ')'))),
          keywords('DOUBLE PRECISION'),
          keyword('REAL'),
          keyword('BINARY_FLOAT'),
          keyword('BINARY_DOUBLE'),
          keyword('BINARY_INTEGER'),
          keyword('PLS_INTEGER'),
          keyword('SIMPLE_INTEGER'),
          keyword('DATE'),
          seq(
            keyword('TIMESTAMP'),
            optional(seq('(', $.numeric_literal, ')')),
            optional(seq(keyword('WITH'), optional(keyword('LOCAL')), keywords('TIME ZONE')))
          ),
          seq(keywords('INTERVAL YEAR'), optional(seq('(', $.numeric_literal, ')')), keywords('TO MONTH')),
          seq(
            keywords('INTERVAL DAY'),
            optional(seq('(', $.numeric_literal, ')')),
            keywords('TO SECOND'),
            optional(seq('(', $.numeric_literal, ')'))
          ),
          seq(keyword('RAW'), optional(seq('(', $.numeric_literal, ')'))),
          seq(keyword('LONG'), optional(keyword('RAW'))),
          keyword('CLOB'),
          keyword('NCLOB'),
          keyword('BLOB'),
          keyword('BFILE'),
          keyword('ROWID'),
          seq(keyword('UROWID'), optional(seq('(', $.numeric_literal, ')'))),
          keyword('MLSLABEL'),
          seq(keyword('JSON'), optional(seq('(', choice(keyword('OBJECT'), keyword('ARRAY'), keyword('SCALAR')), ')'))),
          keyword('BOOLEAN'),
          keyword('BOOL'),
          seq(
            keyword('VECTOR'),
            optional(seq('(', choice('*', $.numeric_literal), optional(seq(',', choice('*', $._identifier))), ')'))
          ),
          keyword('XMLTYPE'),
          seq(keyword('REF'), $.object_name),
          seq($.object_name, '%', choice(keyword('TYPE'), keyword('ROWTYPE'))),
          $.object_name
        )
      ),

    _signed_integer: ($) => seq(optional(choice('+', '-')), $.numeric_literal),

    // =========================================================================
    // ALTER TABLE
    // =========================================================================

    alter_table_statement: ($) =>
      seq(keywords('ALTER TABLE'), optionalIfExists($), field('table', $.object_name), repeat1($._alter_table_action)),

    _alter_table_action: ($) =>
      prec.right(
        choice(
          seq(
            keyword('ADD'),
            choice(
              seq('(', commaSep1(choice($.column_definition, $.table_constraint, $.period_definition)), ')'),
              $.table_constraint,
              $.column_definition,
              $.partition_definition
            )
          ),
          seq(
            keyword('MODIFY'),
            choice(
              seq('(', commaSep1($.column_definition), ')'),
              seq(
                choice(
                  seq(keyword('CONSTRAINT'), $._name),
                  keywords('PRIMARY KEY'),
                  seq(keyword('UNIQUE'), $.column_list)
                ),
                repeat1($._constraint_state)
              ),
              seq(
                keyword('PARTITION'),
                $._name,
                repeat1(
                  choice($._segment_or_storage_attr, keyword('UNUSABLE'), keywords('REBUILD UNUSABLE LOCAL INDEXES'))
                )
              ),
              $.column_definition
            )
          ),
          seq(
            keyword('DROP'),
            choice(
              seq(keyword('COLUMN'), optionalIfExists($), $._name),
              keywords('UNUSED COLUMNS'),
              seq('(', commaSep1($._name), ')'),
              seq(
                choice(
                  keywords('PRIMARY KEY'),
                  seq(keyword('UNIQUE'), $.column_list),
                  seq(keyword('CONSTRAINT'), optionalIfExists($), $._name)
                ),
                repeat(
                  choice(
                    keyword('CASCADE'),
                    seq(choice(keyword('KEEP'), keyword('DROP')), keyword('INDEX')),
                    keyword('ONLINE')
                  )
                )
              ),
              seq(keyword('PARTITION'), optionalIfExists($), $._name, optional($._update_index_clauses))
            ),
            repeat(
              choice(
                keywords('CASCADE CONSTRAINTS'),
                keyword('INVALIDATE'),
                seq(keyword('CHECKPOINT'), $.numeric_literal)
              )
            )
          ),
          seq(
            keyword('RENAME'),
            choice(
              seq(keyword('TO'), field('new_name', $._name)),
              seq(keyword('COLUMN'), field('old_name', $._name), keyword('TO'), field('new_name', $._name)),
              seq(keyword('CONSTRAINT'), field('old_name', $._name), keyword('TO'), field('new_name', $._name)),
              seq(keyword('PARTITION'), field('old_name', $._name), keyword('TO'), field('new_name', $._name))
            )
          ),
          seq(
            keywords('SET UNUSED'),
            choice(seq(keyword('COLUMN'), $._name), $.column_list),
            repeat(choice(keywords('CASCADE CONSTRAINTS'), keyword('INVALIDATE'), keyword('ONLINE')))
          ),
          seq(
            choice(keyword('ENABLE'), keyword('DISABLE')),
            optional(choice(keyword('VALIDATE'), keyword('NOVALIDATE'))),
            choice(
              seq(keyword('CONSTRAINT'), $._name),
              keywords('PRIMARY KEY'),
              seq(keyword('UNIQUE'), $.column_list),
              keywords('ALL TRIGGERS'),
              keywords('TABLE LOCK')
            ),
            repeat(choice(keyword('CASCADE'), $.using_index_clause, seq(keywords('EXCEPTIONS INTO'), $.object_name)))
          ),
          prec.right(
            seq(
              keyword('MOVE'),
              optional(seq(keyword('PARTITION'), $._name)),
              optional(keyword('ONLINE')),
              repeat($._table_property),
              optional($._update_index_clauses)
            )
          ),
          seq(
            keywords('TRUNCATE PARTITION'),
            $._name,
            optional(seq(choice(keyword('DROP'), keyword('REUSE')), keyword('STORAGE'))),
            optional($._update_index_clauses)
          ),
          seq(
            keywords('SPLIT PARTITION'),
            $._name,
            choice(seq(keyword('AT'), '(', commaSep1($._expression), ')'), $.partition_values_clause),
            optional(seq(keyword('INTO'), '(', commaSep1($.partition_definition), ')')),
            optional($._update_index_clauses)
          ),
          seq(
            keywords('EXCHANGE PARTITION'),
            $._name,
            keywords('WITH TABLE'),
            $.object_name,
            repeat(
              choice(
                seq(choice(keyword('INCLUDING'), keyword('EXCLUDING')), keyword('INDEXES')),
                seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('VALIDATION'))
              )
            ),
            optional($._update_index_clauses)
          ),
          seq(keywords('SHRINK SPACE'), optional(keyword('COMPACT')), optional(keyword('CASCADE'))),
          $._table_property
        )
      ),

    _update_index_clauses: () =>
      choice(
        seq(choice(keyword('UPDATE'), keyword('INVALIDATE')), keywords('GLOBAL INDEXES')),
        keywords('UPDATE INDEXES')
      ),

    // =========================================================================
    // INDEX, VIEW, MATERIALIZED VIEW, SEQUENCE, SYNONYM, DBLINK, USER, etc.
    // =========================================================================

    create_index_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice(keyword('UNIQUE'), keyword('BITMAP'), keyword('MULTIVALUE'))),
        keyword('INDEX'),
        optionalIfNotExists($),
        field('name', $.object_name),
        keyword('ON'),
        choice(
          seq(keyword('CLUSTER'), $.object_name),
          seq(field('table', $.object_name), optional($._name), '(', commaSep1($.indexed_column), ')')
        ),
        repeat($._index_attribute)
      ),

    indexed_column: ($) => seq(field('value', $._expression), optional(choice(keyword('ASC'), keyword('DESC')))),

    _index_attribute: ($) =>
      choice(
        $._segment_or_storage_attr,
        keyword('ONLINE'),
        $.parallel_clause,
        keyword('NOSORT'),
        keyword('REVERSE'),
        keyword('VISIBLE'),
        keyword('INVISIBLE'),
        keywords('COMPUTE STATISTICS'),
        prec.right(seq(keyword('LOCAL'), optional(seq('(', commaSep1($.partition_definition), ')')))),
        prec.right(seq(keyword('GLOBAL'), optional($.table_partitioning_clause))),
        seq(keywords('INDEXTYPE IS'), $.object_name, optional(seq(keyword('PARAMETERS'), '(', $.string_literal, ')')))
      ),

    alter_index_statement: ($) =>
      seq(
        keywords('ALTER INDEX'),
        optionalIfExists($),
        field('name', $.object_name),
        repeat1(
          choice(
            prec.right(
              seq(keyword('REBUILD'), optional(seq(keyword('PARTITION'), $._name)), repeat($._index_attribute))
            ),
            seq(keywords('RENAME TO'), field('new_name', $._name)),
            seq(keywords('RENAME PARTITION'), $._name, keyword('TO'), $._name),
            keyword('COALESCE'),
            keyword('UNUSABLE'),
            keyword('COMPILE'),
            seq(choice(keyword('MONITORING'), keyword('NOMONITORING')), keyword('USAGE')),
            seq(keywords('SHRINK SPACE'), optional(keyword('COMPACT'))),
            $._index_attribute
          )
        )
      ),

    create_view_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional(choice(keyword('FORCE'), keywords('NO FORCE'), keyword('NOFORCE'))),
        optional($._editionable),
        optional(keyword('EDITIONING')),
        keyword('VIEW'),
        optionalIfNotExists($),
        field('name', $.object_name),
        repeat(
          choice(
            seq('(', commaSep1(choice($.view_column, $.table_constraint)), ')'),
            prec.right(
              seq(
                keyword('OF'),
                $.type_name,
                optional(
                  choice(
                    seq(
                      keywords('WITH OBJECT'),
                      choice(keyword('IDENTIFIER'), keyword('ID'), keyword('OID')),
                      choice(keyword('DEFAULT'), seq('(', commaSep1($._expression), ')'))
                    ),
                    seq(keyword('UNDER'), $.object_name)
                  )
                )
              )
            ),
            seq(keyword('BEQUEATH'), choice(keyword('CURRENT_USER'), keyword('DEFINER'))),
            seq(keywords('DEFAULT COLLATION'), $._name)
          )
        ),
        keyword('AS'),
        $.select_statement,
        optional($.subquery_restriction_clause)
      ),

    view_column: ($) =>
      seq(field('name', $._name), repeat(choice(keyword('VISIBLE'), keyword('INVISIBLE'), $._column_constraint))),

    alter_view_statement: ($) =>
      seq(
        keywords('ALTER VIEW'),
        optionalIfExists($),
        field('name', $.object_name),
        choice(
          keyword('COMPILE'),
          keywords('READ ONLY'),
          keywords('READ WRITE'),
          $._editionable,
          seq(keyword('ADD'), $.table_constraint),
          seq(keyword('MODIFY'), keyword('CONSTRAINT'), $._name, repeat1($._constraint_state)),
          seq(
            keyword('DROP'),
            choice(seq(keyword('CONSTRAINT'), $._name), keywords('PRIMARY KEY'), seq(keyword('UNIQUE'), $.column_list))
          )
        )
      ),

    create_materialized_view_statement: ($) =>
      seq(
        keywords('CREATE MATERIALIZED VIEW'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional(seq('(', commaSep1($._name), ')')),
        repeat($._mview_property),
        keyword('AS'),
        $.select_statement
      ),

    _mview_property: ($) =>
      prec.right(
        choice(
          seq(
            keywords('ON PREBUILT TABLE'),
            optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keywords('REDUCED PRECISION')))
          ),
          $._table_property,
          seq(keyword('BUILD'), choice(keyword('IMMEDIATE'), keyword('DEFERRED'))),
          $._mview_refresh_clause,
          seq(choice(keyword('ENABLE'), keyword('DISABLE')), keywords('QUERY REWRITE')),
          seq(
            keywords('USING'),
            choice(keywords('NO INDEX'), seq(keyword('INDEX'), repeat($._segment_or_storage_attr)))
          )
        )
      ),

    _mview_refresh_clause: ($) =>
      prec.right(
        seq(
          choice(
            keywords('NEVER REFRESH'),
            seq(
              keyword('REFRESH'),
              repeat(
                choice(
                  keyword('FAST'),
                  keyword('COMPLETE'),
                  keyword('FORCE'),
                  keywords('ON DEMAND'),
                  keywords('ON COMMIT'),
                  keywords('ON STATEMENT'),
                  seq(keywords('START WITH'), $._expression),
                  seq(keyword('NEXT'), $._expression),
                  seq(keyword('WITH'), choice(keywords('PRIMARY KEY'), keyword('ROWID')))
                )
              )
            )
          )
        )
      ),

    alter_materialized_view_statement: ($) =>
      seq(
        keywords('ALTER MATERIALIZED VIEW'),
        optionalIfExists($),
        field('name', $.object_name),
        repeat1(choice(keyword('COMPILE'), $._mview_property))
      ),

    create_sequence_statement: ($) =>
      seq(
        keywords('CREATE SEQUENCE'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional(seq(keyword('SHARING'), '=', choice(keyword('METADATA'), keyword('DATA'), keyword('NONE')))),
        repeat($.sequence_option)
      ),

    alter_sequence_statement: ($) =>
      seq(keywords('ALTER SEQUENCE'), optionalIfExists($), field('name', $.object_name), repeat1($.sequence_option)),

    sequence_option: ($) =>
      prec.right(
        choice(
          seq(keywords('START WITH'), $._signed_integer),
          seq(keywords('INCREMENT BY'), $._signed_integer),
          seq(keyword('MAXVALUE'), $._signed_integer),
          keyword('NOMAXVALUE'),
          seq(keyword('MINVALUE'), $._signed_integer),
          keyword('NOMINVALUE'),
          keyword('CYCLE'),
          keyword('NOCYCLE'),
          seq(keyword('CACHE'), $.numeric_literal),
          keyword('NOCACHE'),
          keyword('ORDER'),
          keyword('NOORDER'),
          keyword('KEEP'),
          keyword('NOKEEP'),
          seq(keyword('SCALE'), optional(choice(keyword('EXTEND'), keyword('NOEXTEND')))),
          keyword('NOSCALE'),
          keyword('SESSION'),
          keyword('GLOBAL'),
          seq(keyword('RESTART'), optional(seq(keywords('START WITH'), $._signed_integer)))
        )
      ),

    create_synonym_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        optional(keyword('PUBLIC')),
        keyword('SYNONYM'),
        optionalIfNotExists($),
        field('name', $.object_name),
        keyword('FOR'),
        field('target', $.object_name)
      ),

    create_database_link_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('SHARED')),
        optional(keyword('PUBLIC')),
        keywords('DATABASE LINK'),
        optionalIfNotExists($),
        field('name', $.dblink_name),
        repeat(
          choice(
            seq(
              keywords('CONNECT TO'),
              choice(
                keyword('CURRENT_USER'),
                seq($._name, keywords('IDENTIFIED BY'), choice($._name, $.string_literal))
              )
            ),
            seq(keywords('AUTHENTICATED BY'), $._name, keywords('IDENTIFIED BY'), choice($._name, $.string_literal)),
            seq(keyword('USING'), $.string_literal)
          )
        )
      ),

    create_directory_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('DIRECTORY'),
        optionalIfNotExists($),
        field('name', $._name),
        keyword('AS'),
        field('path', $.string_literal)
      ),

    create_user_statement: ($) =>
      seq(
        keywords('CREATE USER'),
        optionalIfNotExists($),
        field('name', $._name),
        choice(
          seq(
            keywords('IDENTIFIED'),
            choice(
              seq(keyword('BY'), choice($._name, $.string_literal)),
              seq(keyword('EXTERNALLY'), optional(seq(keyword('AS'), $.string_literal))),
              seq(keyword('GLOBALLY'), optional(seq(keyword('AS'), $.string_literal)))
            )
          ),
          keywords('NO AUTHENTICATION')
        ),
        repeat($._user_option)
      ),

    alter_user_statement: ($) =>
      seq(
        keywords('ALTER USER'),
        optionalIfExists($),
        field('name', $._name),
        repeat1(
          choice(
            seq(
              keywords('IDENTIFIED BY'),
              choice($._name, $.string_literal),
              optional(seq(keyword('REPLACE'), choice($._name, $.string_literal)))
            ),
            $._user_option
          )
        )
      ),

    _user_option: ($) =>
      choice(
        seq(keywords('DEFAULT TABLESPACE'), $._name),
        seq(optional(keyword('LOCAL')), keywords('TEMPORARY TABLESPACE'), $._name),
        seq(keyword('QUOTA'), choice($.size_spec, keyword('UNLIMITED')), keyword('ON'), $._name),
        seq(keyword('PROFILE'), $._name),
        keywords('PASSWORD EXPIRE'),
        seq(keyword('ACCOUNT'), choice(keyword('LOCK'), keyword('UNLOCK'))),
        seq(keywords('DEFAULT COLLATION'), $._name),
        seq(
          keywords('DEFAULT ROLE'),
          choice(
            seq(keyword('ALL'), optional(seq(keyword('EXCEPT'), commaSep1($._name)))),
            keyword('NONE'),
            commaSep1($._name)
          )
        ),
        keywords('ENABLE EDITIONS'),
        seq(keyword('CONTAINER'), '=', choice(keyword('CURRENT'), keyword('ALL')))
      ),

    create_role_statement: ($) =>
      seq(
        keywords('CREATE ROLE'),
        optionalIfNotExists($),
        field('name', $._name),
        optional(
          choice(
            keywords('NOT IDENTIFIED'),
            seq(keywords('IDENTIFIED BY'), choice($._name, $.string_literal)),
            seq(keywords('IDENTIFIED USING'), $.object_name),
            keywords('IDENTIFIED EXTERNALLY'),
            keywords('IDENTIFIED GLOBALLY')
          )
        )
      ),

    alter_role_statement: ($) =>
      seq(
        keywords('ALTER ROLE'),
        optionalIfExists($),
        field('name', $._name),
        choice(
          keywords('NOT IDENTIFIED'),
          seq(keywords('IDENTIFIED BY'), choice($._name, $.string_literal)),
          seq(keywords('IDENTIFIED USING'), $.object_name),
          keywords('IDENTIFIED EXTERNALLY'),
          keywords('IDENTIFIED GLOBALLY')
        )
      ),

    create_profile_statement: ($) =>
      seq(
        keywords('CREATE PROFILE'),
        optionalIfNotExists($),
        field('name', $._name),
        keyword('LIMIT'),
        repeat1($._profile_limit)
      ),

    alter_profile_statement: ($) =>
      seq(
        keywords('ALTER PROFILE'),
        optionalIfExists($),
        field('name', $._name),
        keyword('LIMIT'),
        repeat1($._profile_limit)
      ),

    _profile_limit: ($) =>
      seq(
        $._identifier,
        choice($.size_spec, keyword('UNLIMITED'), keyword('DEFAULT'), $._identifier, $.string_literal)
      ),

    create_tablespace_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice(keyword('BIGFILE'), keyword('SMALLFILE'))),
        optional(choice(keyword('PERMANENT'), keyword('TEMPORARY'), keyword('UNDO'))),
        keyword('TABLESPACE'),
        optionalIfNotExists($),
        field('name', $._name),
        repeat($._tablespace_option)
      ),

    alter_tablespace_statement: ($) =>
      seq(
        keywords('ALTER TABLESPACE'),
        optionalIfExists($),
        field('name', $._name),
        repeat1(
          choice(
            seq(keyword('ADD'), choice(keyword('DATAFILE'), keyword('TEMPFILE')), commaSep1($.datafile_spec)),
            seq(keywords('RENAME TO'), $._name),
            keywords('READ ONLY'),
            keywords('READ WRITE'),
            keyword('COALESCE'),
            seq(keyword('RESIZE'), $.size_spec),
            $._tablespace_option
          )
        )
      ),

    _tablespace_option: ($) =>
      choice(
        seq(choice(keyword('DATAFILE'), keyword('TEMPFILE')), commaSep1($.datafile_spec)),
        seq(
          keywords('EXTENT MANAGEMENT'),
          choice(
            seq(
              keyword('LOCAL'),
              optional(
                choice(keyword('AUTOALLOCATE'), seq(keywords('UNIFORM'), optional(seq(keyword('SIZE'), $.size_spec))))
              )
            ),
            keyword('DICTIONARY')
          )
        ),
        seq(keywords('SEGMENT SPACE MANAGEMENT'), choice(keyword('AUTO'), keyword('MANUAL'))),
        seq(keyword('BLOCKSIZE'), $.size_spec),
        keyword('LOGGING'),
        keyword('NOLOGGING'),
        keyword('ONLINE'),
        prec.right(
          seq(keyword('OFFLINE'), optional(choice(keyword('NORMAL'), keyword('TEMPORARY'), keyword('IMMEDIATE'))))
        ),
        keywords('FORCE LOGGING'),
        prec.right(seq(keyword('DEFAULT'), repeat1($._segment_or_storage_attr))),
        $._autoextend_clause
      ),

    datafile_spec: ($) =>
      prec.right(
        choice(
          seq(
            $.string_literal,
            optional(seq(keyword('SIZE'), $.size_spec)),
            optional(keyword('REUSE')),
            optional($._autoextend_clause)
          ),
          seq(keyword('SIZE'), $.size_spec, optional(keyword('REUSE')), optional($._autoextend_clause)),
          $._autoextend_clause
        )
      ),

    _autoextend_clause: ($) =>
      choice(
        keywords('AUTOEXTEND OFF'),
        seq(
          keywords('AUTOEXTEND ON'),
          optional(seq(keyword('NEXT'), $.size_spec)),
          optional(seq(keyword('MAXSIZE'), choice($.size_spec, keyword('UNLIMITED'))))
        )
      ),

    create_dimension_statement: ($) =>
      seq(
        keywords('CREATE DIMENSION'),
        optionalIfNotExists($),
        field('name', $.object_name),
        repeat1($._dimension_clause)
      ),

    alter_dimension_statement: ($) =>
      seq(
        keywords('ALTER DIMENSION'),
        optionalIfExists($),
        field('name', $.object_name),
        repeat1(
          choice(
            keyword('COMPILE'),
            seq(keyword('ADD'), $._dimension_clause),
            seq(
              keyword('DROP'),
              choice(
                seq(keyword('ALL'), keyword('TRIGGERS')),
                seq(keyword('LEVEL'), $._name, optional(choice(keyword('RESTRICT'), keyword('CASCADE')))),
                seq(keyword('HIERARCHY'), $._name),
                seq(keyword('ATTRIBUTE'), $._name, optional(seq(keyword('LEVEL'), $._name)))
              )
            )
          )
        )
      ),

    _dimension_clause: ($) =>
      choice(
        seq(
          keyword('LEVEL'),
          $._name,
          keyword('IS'),
          choice($.object_name, seq('(', commaSep1($.object_name), ')')),
          optional(keywords('SKIP WHEN NULL'))
        ),
        seq(
          keyword('HIERARCHY'),
          $._name,
          '(',
          $._name,
          repeat1(seq(keywords('CHILD OF'), $._name)),
          repeat(
            seq(
              keywords('JOIN KEY'),
              choice($.object_name, seq('(', commaSep1($.object_name), ')')),
              keyword('REFERENCES'),
              $._name
            )
          ),
          ')'
        ),
        seq(
          optional(keyword('EXTENDED')),
          keyword('ATTRIBUTE'),
          $._name,
          optional(seq(keyword('LEVEL'), $._name)),
          keyword('DETERMINES'),
          choice($.object_name, seq('(', commaSep1($.object_name), ')'))
        )
      ),

    // =========================================================================
    // Object Types & PL/SQL Units (TYPE, PROCEDURE, FUNCTION, PACKAGE, TRIGGER)
    // =========================================================================

    create_type_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('TYPE'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional(seq(keyword('OID'), $.string_literal)),
        optional(keyword('FORCE')),
        repeat($._invoker_or_sharing_clause),
        optional(
          seq(
            choice(
              seq(choice(keyword('IS'), keyword('AS')), keyword('OBJECT'), '(', commaSep1($._type_element), ')'),
              seq(keyword('UNDER'), $.object_name, '(', commaSep1($._type_element), ')'),
              seq(
                choice(keyword('IS'), keyword('AS')),
                choice(keyword('VARRAY'), keywords('VARYING ARRAY')),
                '(',
                $.numeric_literal,
                ')',
                keyword('OF'),
                $.type_name,
                optional(keywords('NOT NULL'))
              ),
              seq(
                choice(keyword('IS'), keyword('AS')),
                keywords('TABLE OF'),
                $.type_name,
                optional(keywords('NOT NULL'))
              )
            ),
            repeat(
              seq(optional(keyword('NOT')), choice(keyword('FINAL'), keyword('INSTANTIABLE'), keyword('PERSISTABLE')))
            )
          )
        )
      ),

    _type_element: ($) =>
      choice(
        seq(
          repeat(
            choice(
              seq(optional(keyword('NOT')), choice(keyword('INSTANTIABLE'), keyword('FINAL'), keyword('OVERRIDING'))),
              keyword('MEMBER'),
              keyword('STATIC'),
              keyword('CONSTRUCTOR'),
              keyword('MAP'),
              keyword('ORDER')
            )
          ),
          choice(
            seq(
              keyword('FUNCTION'),
              field('name', $._plsql_name),
              optional($.plsql_parameter_list),
              keyword('RETURN'),
              choice(keywords('SELF AS RESULT'), $.type_name),
              repeat($._function_property)
            ),
            seq(keyword('PROCEDURE'), field('name', $._plsql_name), optional($.plsql_parameter_list))
          )
        ),
        seq(field('name', $._name), field('type', $.type_name))
      ),

    create_type_body_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keywords('TYPE BODY'),
        optionalIfNotExists($),
        field('name', $.object_name),
        choice(keyword('IS'), keyword('AS')),
        repeat1($.type_body_member),
        keyword('END'),
        optional($._plsql_name),
        ';'
      ),

    type_body_member: ($) =>
      seq(
        repeat(
          choice(
            seq(optional(keyword('NOT')), keyword('OVERRIDING')),
            keyword('MEMBER'),
            keyword('STATIC'),
            keyword('CONSTRUCTOR'),
            keyword('MAP'),
            keyword('ORDER')
          )
        ),
        choice($.plsql_function_definition, $.plsql_procedure_definition)
      ),

    create_procedure_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('PROCEDURE'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional($.plsql_parameter_list),
        repeat($._invoker_or_sharing_clause),
        choice(keyword('IS'), keyword('AS')),
        $._plsql_subprogram_body
      ),

    create_function_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('FUNCTION'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional($.plsql_parameter_list),
        keyword('RETURN'),
        field('return_type', $.type_name),
        repeat(choice($._invoker_or_sharing_clause, $._function_property)),
        choice(keyword('IS'), keyword('AS')),
        $._plsql_subprogram_body
      ),

    _invoker_or_sharing_clause: ($) =>
      choice(
        seq(keyword('AUTHID'), choice(keyword('CURRENT_USER'), keyword('DEFINER'))),
        seq(keyword('SHARING'), '=', choice(keyword('METADATA'), keyword('NONE'))),
        seq(keywords('DEFAULT COLLATION'), $._name),
        seq(
          keywords('ACCESSIBLE BY'),
          '(',
          commaSep1(
            seq(
              optional(
                choice(
                  keyword('FUNCTION'),
                  keyword('PROCEDURE'),
                  keyword('PACKAGE'),
                  keyword('TRIGGER'),
                  keyword('TYPE')
                )
              ),
              $.object_name
            )
          ),
          ')'
        )
      ),

    _function_property: ($) =>
      choice(
        keyword('DETERMINISTIC'),
        seq(keyword('PIPELINED'), optional(seq(keyword('USING'), $.object_name))),
        seq(
          keyword('PARALLEL_ENABLE'),
          optional(
            seq(
              '(',
              repeat(
                choice($._identifier, $.column_list, keyword('BY'), keyword('ANY'), keyword('HASH'), keyword('RANGE'))
              ),
              ')'
            )
          )
        ),
        seq(keyword('RESULT_CACHE'), optional(seq(keywords('RELIES_ON'), '(', commaSep($._name), ')'))),
        seq(keyword('SQL_MACRO'), optional(seq('(', choice(keyword('SCALAR'), keyword('TABLE')), ')')))
      ),

    plsql_parameter_list: ($) => seq('(', commaSep1($.plsql_parameter), ')'),

    plsql_parameter: ($) =>
      seq(
        field('name', $._plsql_name),
        optional(choice(keywords('IN OUT'), keyword('IN'), keyword('OUT'))),
        optional(keyword('NOCOPY')),
        field('type', $.type_name),
        optional(seq(choice(':=', keyword('DEFAULT')), field('default', $._expression)))
      ),

    _plsql_subprogram_body: ($) =>
      choice(
        seq(
          repeat($._plsql_declaration),
          keyword('BEGIN'),
          repeat1($._plsql_inner_statement),
          optional($.exception_section),
          keyword('END'),
          optional($._plsql_name),
          ';'
        ),
        seq(
          keyword('LANGUAGE'),
          choice(
            seq(keyword('JAVA'), keyword('NAME'), $.string_literal),
            seq(keyword('C'), repeat(choice($._identifier, $.string_literal)))
          ),
          ';'
        ),
        seq(keyword('EXTERNAL'), ';')
      ),

    plsql_procedure_definition: ($) =>
      seq(
        keyword('PROCEDURE'),
        field('name', $._plsql_name),
        optional($.plsql_parameter_list),
        repeat($._invoker_or_sharing_clause),
        choice(';', seq(choice(keyword('IS'), keyword('AS')), $._plsql_subprogram_body))
      ),

    plsql_function_definition: ($) =>
      seq(
        keyword('FUNCTION'),
        field('name', $._plsql_name),
        optional($.plsql_parameter_list),
        keyword('RETURN'),
        choice(keywords('SELF AS RESULT'), $.type_name),
        repeat(choice($._invoker_or_sharing_clause, $._function_property)),
        choice(';', seq(choice(keyword('IS'), keyword('AS')), $._plsql_subprogram_body))
      ),

    create_package_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('PACKAGE'),
        optionalIfNotExists($),
        field('name', $.object_name),
        repeat($._invoker_or_sharing_clause),
        choice(keyword('IS'), keyword('AS')),
        repeat($._plsql_declaration),
        keyword('END'),
        optional($._plsql_name),
        ';'
      ),

    create_package_body_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keywords('PACKAGE BODY'),
        optionalIfNotExists($),
        field('name', $.object_name),
        choice(keyword('IS'), keyword('AS')),
        repeat($._plsql_declaration),
        optional(seq(keyword('BEGIN'), repeat1($._plsql_inner_statement), optional($.exception_section))),
        keyword('END'),
        optional($._plsql_name),
        ';'
      ),

    create_trigger_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($._or_replace),
        optional($._editionable),
        keyword('TRIGGER'),
        optionalIfNotExists($),
        field('name', $.object_name),
        optional(choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF'), keyword('FOR'))),
        $._trigger_event_list,
        keyword('ON'),
        choice(
          seq(keywords('NESTED TABLE'), $._name, keyword('OF'), $.object_name),
          seq(optional(keyword('PLUGGABLE')), keyword('DATABASE')),
          seq(optional(seq($._name, '.')), keyword('SCHEMA')),
          $.object_name
        ),
        repeat($._trigger_option),
        choice(
          seq(
            keywords('COMPOUND TRIGGER'),
            repeat($._plsql_declaration),
            repeat1($.compound_trigger_timing_point),
            keyword('END'),
            optional($._plsql_name),
            ';'
          ),
          seq(keyword('CALL'), $._primary_expression, ';'),
          $.anonymous_block
        )
      ),

    _trigger_event_list: ($) => seq($._trigger_event, repeat(seq(keyword('OR'), $._trigger_event))),

    _trigger_event: ($) =>
      choice(
        keyword('INSERT'),
        keyword('DELETE'),
        seq(keyword('UPDATE'), optional(seq(keyword('OF'), commaSep1($._name)))),
        keyword('CREATE'),
        keyword('ALTER'),
        keyword('DROP'),
        keyword('TRUNCATE'),
        keyword('LOGON'),
        keyword('LOGOFF'),
        keyword('STARTUP'),
        keyword('SHUTDOWN'),
        keyword('SERVERERROR'),
        keyword('DDL')
      ),

    _trigger_option: ($) =>
      choice(
        seq(
          keyword('REFERENCING'),
          repeat1(
            seq(choice(keyword('OLD'), keyword('NEW'), keyword('PARENT')), optional(keyword('AS')), $._plsql_name)
          )
        ),
        keywords('FOR EACH ROW'),
        seq(choice(keyword('FOLLOWS'), keyword('PRECEDES')), commaSep1($.object_name)),
        keyword('ENABLE'),
        keyword('DISABLE'),
        seq(keyword('WHEN'), '(', $._expression, ')')
      ),

    compound_trigger_timing_point: ($) =>
      seq(
        choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF')),
        choice(keyword('STATEMENT'), keywords('EACH ROW')),
        keyword('IS'),
        repeat($._plsql_declaration),
        keyword('BEGIN'),
        repeat1($._plsql_inner_statement),
        optional($.exception_section),
        keyword('END'),
        choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF')),
        choice(keyword('STATEMENT'), keywords('EACH ROW')),
        ';'
      ),

    anonymous_block: ($) => seq(repeat($.plsql_label), $._anonymous_block_body),

    _anonymous_block_body: ($) =>
      seq(
        optional(seq(keyword('DECLARE'), repeat($._plsql_declaration))),
        keyword('BEGIN'),
        repeat1($._plsql_inner_statement),
        optional($.exception_section),
        keyword('END'),
        optional($._plsql_name),
        ';'
      ),

    plsql_label: ($) => seq('<<', field('name', $._plsql_name), '>>'),

    _plsql_declaration: ($) =>
      choice(
        $.pragma_declaration,
        $.plsql_type_declaration,
        $.plsql_subtype_declaration,
        $.cursor_declaration,
        $.exception_declaration,
        $.plsql_procedure_definition,
        $.plsql_function_definition,
        $.variable_declaration
      ),

    pragma_declaration: ($) =>
      seq(
        keyword('PRAGMA'),
        field('name', $._plsql_name),
        optional(seq('(', commaSep(choice($._expression, keyword('NEW'), keyword('NONE'))), ')')),
        ';'
      ),

    plsql_type_declaration: ($) =>
      seq(
        keyword('TYPE'),
        field('name', $._plsql_name),
        keyword('IS'),
        choice(
          seq(keyword('RECORD'), '(', commaSep1($.record_field_definition), ')'),
          seq(
            keywords('TABLE OF'),
            $.type_name,
            optional(keywords('NOT NULL')),
            optional(seq(keywords('INDEX BY'), $.type_name))
          ),
          seq(
            choice(keyword('VARRAY'), keywords('VARYING ARRAY')),
            '(',
            $.numeric_literal,
            ')',
            keyword('OF'),
            $.type_name,
            optional(keywords('NOT NULL'))
          ),
          seq(keywords('REF CURSOR'), optional(seq(keyword('RETURN'), $.type_name)))
        ),
        ';'
      ),

    record_field_definition: ($) =>
      seq(
        field('name', $._plsql_name),
        field('type', $.type_name),
        optional(keywords('NOT NULL')),
        optional(seq(choice(':=', keyword('DEFAULT')), $._expression))
      ),

    plsql_subtype_declaration: ($) =>
      seq(
        keyword('SUBTYPE'),
        field('name', $._plsql_name),
        keyword('IS'),
        $.type_name,
        optional(seq(keyword('RANGE'), $._expression, '..', $._expression)),
        optional(keywords('NOT NULL')),
        ';'
      ),

    cursor_declaration: ($) =>
      seq(
        keyword('CURSOR'),
        field('name', $._plsql_name),
        optional($.plsql_parameter_list),
        optional(seq(keyword('RETURN'), $.type_name)),
        optional(seq(keyword('IS'), $.select_statement)),
        ';'
      ),

    exception_declaration: ($) => seq(field('name', $._plsql_name), keyword('EXCEPTION'), ';'),

    variable_declaration: ($) =>
      seq(
        field('name', $._plsql_name),
        optional(keyword('CONSTANT')),
        field('type', $.type_name),
        optional(keywords('NOT NULL')),
        optional(seq(choice(':=', keyword('DEFAULT')), field('value', $._expression))),
        ';'
      ),

    exception_section: ($) => seq(keyword('EXCEPTION'), repeat1($.exception_handler)),

    exception_handler: ($) =>
      seq(
        keyword('WHEN'),
        choice(keyword('OTHERS'), seq($._primary_expression, repeat(seq(keyword('OR'), $._primary_expression)))),
        keyword('THEN'),
        repeat1($._plsql_inner_statement)
      ),

    _plsql_inner_statement: ($) =>
      seq(
        repeat($.plsql_label),
        choice(
          alias($._anonymous_block_body, $.anonymous_block),
          $.if_statement,
          $.plsql_case_statement,
          $.loop_statement,
          $.while_statement,
          $.for_statement,
          $.forall_statement,
          $.exit_statement,
          $.continue_statement,
          $.goto_statement,
          $.return_statement,
          $.raise_statement,
          $.null_statement,
          $.execute_immediate_statement,
          $.open_statement,
          $.fetch_statement,
          $.close_statement,
          $.pipe_row_statement,
          $.pragma_declaration,
          seq($.select_statement, ';'),
          seq($.insert_statement, ';'),
          seq($.update_statement, ';'),
          seq($.delete_statement, ';'),
          seq($.merge_statement, ';'),
          seq($.commit_statement, ';'),
          seq($.rollback_statement, ';'),
          seq($.savepoint_statement, ';'),
          seq($.set_transaction_statement, ';'),
          seq($.set_constraints_statement, ';'),
          seq($.lock_table_statement, ';'),
          $.assignment_statement,
          $.procedure_call_statement
        )
      ),

    assignment_statement: ($) =>
      seq(field('target', choice($._callable_expression, $.bind_variable)), ':=', field('value', $._expression), ';'),

    procedure_call_statement: ($) => seq(field('callee', $._callable_expression), ';'),

    if_statement: ($) =>
      seq(
        keyword('IF'),
        field('condition', $._expression),
        keyword('THEN'),
        repeat1($._plsql_inner_statement),
        repeat($.elsif_clause),
        optional(seq(keyword('ELSE'), repeat1($._plsql_inner_statement))),
        keywords('END IF'),
        ';'
      ),

    elsif_clause: ($) =>
      seq(keyword('ELSIF'), field('condition', $._expression), keyword('THEN'), repeat1($._plsql_inner_statement)),

    plsql_case_statement: ($) =>
      seq(
        keyword('CASE'),
        optional(field('operand', $._expression)),
        repeat1($.plsql_when_clause),
        optional(seq(keyword('ELSE'), repeat1($._plsql_inner_statement))),
        keywords('END CASE'),
        optional($._plsql_name),
        ';'
      ),

    plsql_when_clause: ($) =>
      seq(keyword('WHEN'), field('condition', $._expression), keyword('THEN'), repeat1($._plsql_inner_statement)),

    loop_statement: ($) =>
      seq(keyword('LOOP'), repeat1($._plsql_inner_statement), keywords('END LOOP'), optional($._plsql_name), ';'),

    while_statement: ($) =>
      seq(
        keyword('WHILE'),
        field('condition', $._expression),
        keyword('LOOP'),
        repeat1($._plsql_inner_statement),
        keywords('END LOOP'),
        optional($._plsql_name),
        ';'
      ),

    for_statement: ($) =>
      seq(
        keyword('FOR'),
        field('iterator', $._plsql_name),
        optional(seq(',', $._plsql_name)),
        keyword('IN'),
        optional(keyword('REVERSE')),
        choice(
          seq($._expression, '..', $._expression, optional(seq(keyword('BY'), $._expression))),
          seq('(', $.select_statement, ')'),
          seq(choice(keywords('INDICES OF'), keywords('VALUES OF'), keywords('PAIRS OF')), $._primary_expression),
          $._primary_expression
        ),
        keyword('LOOP'),
        repeat1($._plsql_inner_statement),
        keywords('END LOOP'),
        optional($._plsql_name),
        ';'
      ),

    forall_statement: ($) =>
      seq(
        keyword('FORALL'),
        field('index', $._plsql_name),
        keyword('IN'),
        choice(
          seq($._expression, '..', $._expression),
          seq(
            choice(keywords('INDICES OF'), keywords('VALUES OF')),
            $._primary_expression,
            optional(seq(keyword('BETWEEN'), $._expression, keyword('AND'), $._expression))
          )
        ),
        optional(keywords('SAVE EXCEPTIONS')),
        choice(
          seq(choice($.insert_statement, $.update_statement, $.delete_statement, $.merge_statement), ';'),
          $.execute_immediate_statement
        )
      ),

    exit_statement: ($) =>
      seq(keyword('EXIT'), optional($._plsql_name), optional(seq(keyword('WHEN'), $._expression)), ';'),

    continue_statement: ($) =>
      seq(keyword('CONTINUE'), optional($._plsql_name), optional(seq(keyword('WHEN'), $._expression)), ';'),

    goto_statement: ($) => seq(keyword('GOTO'), field('label', $._plsql_name), ';'),

    return_statement: ($) => seq(keyword('RETURN'), optional($._expression), ';'),

    raise_statement: ($) => seq(keyword('RAISE'), optional($._primary_expression), ';'),

    null_statement: () => seq(keyword('NULL'), ';'),

    execute_immediate_statement: ($) =>
      seq(
        keywords('EXECUTE IMMEDIATE'),
        field('sql', $._expression),
        optional($.into_clause),
        optional(
          seq(
            keyword('USING'),
            commaSep1(seq(optional(choice(keywords('IN OUT'), keyword('IN'), keyword('OUT'))), $._expression))
          )
        ),
        optional($.returning_into_clause),
        ';'
      ),

    open_statement: ($) =>
      seq(
        keyword('OPEN'),
        field('cursor', $._primary_expression),
        optional(
          seq(
            keyword('FOR'),
            choice($.select_statement, seq($._expression, optional(seq(keyword('USING'), commaSep1($._expression)))))
          )
        ),
        ';'
      ),

    fetch_statement: ($) =>
      seq(
        keyword('FETCH'),
        field('cursor', $._primary_expression),
        $.into_clause,
        optional(seq(keyword('LIMIT'), $._expression)),
        ';'
      ),

    close_statement: ($) => seq(keyword('CLOSE'), field('cursor', $._primary_expression), ';'),

    pipe_row_statement: ($) => seq(keywords('PIPE ROW'), '(', $._expression, ')', ';'),

    alter_plsql_unit_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('PROCEDURE'), keyword('FUNCTION'), keyword('PACKAGE'), keyword('TRIGGER'), keyword('TYPE')),
        optionalIfExists($),
        field('name', $.object_name),
        choice(
          seq(
            keyword('COMPILE'),
            repeat(
              choice(
                keyword('DEBUG'),
                keyword('PACKAGE'),
                keyword('SPECIFICATION'),
                keyword('BODY'),
                keywords('REUSE SETTINGS'),
                seq($._identifier, '=', choice($._identifier, $.string_literal, $.numeric_literal))
              )
            )
          ),
          keyword('ENABLE'),
          keyword('DISABLE'),
          seq(keywords('RENAME TO'), $._name),
          $._editionable,
          seq(
            choice(
              seq(
                choice(keyword('ADD'), keyword('MODIFY')),
                keyword('ATTRIBUTE'),
                choice(seq('(', commaSep1(seq($._name, $.type_name)), ')'), seq($._name, $.type_name))
              ),
              seq(keyword('DROP'), keyword('ATTRIBUTE'), choice(seq('(', commaSep1($._name), ')'), $._name)),
              seq(choice(keyword('ADD'), keyword('DROP')), $._type_element),
              seq(optional(keyword('NOT')), choice(keyword('FINAL'), keyword('INSTANTIABLE')))
            ),
            optional(choice(keyword('CASCADE'), keyword('INVALIDATE')))
          )
        )
      ),

    // =========================================================================
    // DROP, TRUNCATE, RENAME, COMMENT, DCL, Transactions, Session & Utility
    // =========================================================================

    drop_statement: ($) =>
      seq(
        keyword('DROP'),
        choice(
          seq(
            keyword('TABLE'),
            optionalIfExists($),
            field('name', $.object_name),
            optional(keywords('CASCADE CONSTRAINTS')),
            optional(keyword('PURGE'))
          ),
          seq(
            keyword('VIEW'),
            optionalIfExists($),
            field('name', $.object_name),
            optional(keywords('CASCADE CONSTRAINTS'))
          ),
          seq(
            keywords('MATERIALIZED VIEW'),
            optionalIfExists($),
            field('name', $.object_name),
            optional(seq(choice(keyword('PRESERVE'), keyword('PURGE')), keyword('TABLE')))
          ),
          seq(
            keyword('INDEX'),
            optionalIfExists($),
            field('name', $.object_name),
            optional(keyword('ONLINE')),
            optional(keyword('FORCE'))
          ),
          seq(keyword('SEQUENCE'), optionalIfExists($), field('name', $.object_name)),
          seq(keyword('DIMENSION'), optionalIfExists($), field('name', $.object_name)),
          seq(
            optional(keyword('PUBLIC')),
            keyword('SYNONYM'),
            optionalIfExists($),
            field('name', $.object_name),
            optional(keyword('FORCE'))
          ),
          seq(
            optional(keyword('PUBLIC')),
            keywords('DATABASE LINK'),
            optionalIfExists($),
            field('name', $.dblink_name)
          ),
          seq(keyword('DIRECTORY'), optionalIfExists($), field('name', $._name)),
          seq(keyword('USER'), optionalIfExists($), field('name', $._name), optional(keyword('CASCADE'))),
          seq(keyword('ROLE'), optionalIfExists($), field('name', $._name)),
          seq(keyword('PROFILE'), optionalIfExists($), field('name', $._name), optional(keyword('CASCADE'))),
          seq(
            keyword('TABLESPACE'),
            optionalIfExists($),
            field('name', $._name),
            optional(
              seq(
                keywords('INCLUDING CONTENTS'),
                optional(keywords('AND DATAFILES')),
                optional(keywords('CASCADE CONSTRAINTS'))
              )
            )
          ),
          seq(
            choice(
              keyword('PROCEDURE'),
              keyword('FUNCTION'),
              seq(keyword('PACKAGE'), optional(keyword('BODY'))),
              keyword('TRIGGER'),
              seq(keyword('TYPE'), optional(keyword('BODY')))
            ),
            optionalIfExists($),
            field('name', $.object_name),
            optional(choice(keyword('FORCE'), keyword('VALIDATE')))
          )
        )
      ),

    truncate_statement: ($) =>
      seq(
        keyword('TRUNCATE'),
        choice(
          seq(
            keyword('TABLE'),
            field('name', $.object_name),
            optional(seq(choice(keyword('PRESERVE'), keyword('PURGE')), keywords('MATERIALIZED VIEW LOG'))),
            optional(seq(choice(seq(keyword('DROP'), optional(keyword('ALL'))), keyword('REUSE')), keyword('STORAGE'))),
            optional(keyword('CASCADE'))
          ),
          seq(
            keyword('CLUSTER'),
            field('name', $.object_name),
            optional(seq(choice(keyword('DROP'), keyword('REUSE')), keyword('STORAGE')))
          )
        )
      ),

    rename_statement: ($) =>
      seq(keyword('RENAME'), field('old_name', $._name), keyword('TO'), field('new_name', $._name)),

    comment_statement: ($) =>
      seq(
        keywords('COMMENT ON'),
        choice(
          seq(keyword('TABLE'), field('target', $.object_name)),
          seq(keyword('COLUMN'), field('target', $.object_name)),
          seq(keywords('MATERIALIZED VIEW'), field('target', $.object_name)),
          seq(keyword('INDEXTYPE'), field('target', $.object_name)),
          seq(keyword('OPERATOR'), field('target', $.object_name)),
          seq(keyword('EDITION'), field('target', $._name))
        ),
        keyword('IS'),
        field('comment', $.string_literal)
      ),

    grant_statement: ($) =>
      seq(
        keyword('GRANT'),
        commaSep1($._privilege_or_role),
        optional($._grant_object_clause),
        keyword('TO'),
        commaSep1($._grantee),
        optional(seq(keywords('IDENTIFIED BY'), choice($._name, $.string_literal))),
        optional(
          seq(
            keyword('WITH'),
            choice(keyword('ADMIN'), keyword('GRANT'), keyword('HIERARCHY'), keyword('DELEGATE')),
            keyword('OPTION')
          )
        ),
        optional(seq(keyword('CONTAINER'), '=', choice(keyword('CURRENT'), keyword('ALL'))))
      ),

    revoke_statement: ($) =>
      seq(
        keyword('REVOKE'),
        commaSep1($._privilege_or_role),
        optional($._grant_object_clause),
        keyword('FROM'),
        commaSep1($._grantee),
        optional(choice(keywords('CASCADE CONSTRAINTS'), keyword('FORCE'))),
        optional(seq(keyword('CONTAINER'), '=', choice(keyword('CURRENT'), keyword('ALL'))))
      ),

    _privilege_or_role: ($) =>
      choice(
        seq(keyword('ALL'), optional(keyword('PRIVILEGES'))),
        keywords('ON COMMIT REFRESH'),
        seq(
          repeat1(
            choice(
              $._identifier,
              keyword('ALTER'),
              keyword('AUDIT'),
              keyword('COMMENT'),
              keyword('CONNECT'),
              keyword('CREATE'),
              keyword('DELETE'),
              keyword('DROP'),
              keyword('EXCLUSIVE'),
              keyword('FILE'),
              keyword('FLASHBACK'),
              keyword('GRANT'),
              keyword('INDEX'),
              keyword('INSERT'),
              keyword('LOCK'),
              keyword('ONLINE'),
              keyword('PUBLIC'),
              keyword('REFERENCES'),
              keyword('RENAME'),
              keyword('RESOURCE'),
              keyword('SELECT'),
              keyword('SESSION'),
              keyword('SET'),
              keyword('SYNONYM'),
              keyword('TABLE'),
              keyword('TRIGGER'),
              keyword('UPDATE'),
              keyword('USER'),
              keyword('VIEW'),
              keyword('ANY')
            )
          ),
          optional($.column_list)
        )
      ),

    _grant_object_clause: ($) =>
      seq(
        keyword('ON'),
        optional(
          choice(
            keyword('DIRECTORY'),
            keyword('EDITION'),
            keyword('USER'),
            keywords('JAVA SOURCE'),
            keywords('JAVA CLASS'),
            keywords('JAVA RESOURCE'),
            keyword('SCHEMA')
          )
        ),
        $.object_name
      ),

    _grantee: ($) => choice(keyword('PUBLIC'), $._name),

    flashback_table_statement: ($) =>
      seq(
        keywords('FLASHBACK TABLE'),
        commaSep1($.object_name),
        keyword('TO'),
        choice(
          seq(
            choice(keyword('SCN'), keyword('TIMESTAMP'), keywords('RESTORE POINT')),
            $._expression,
            optional(seq(choice(keyword('ENABLE'), keyword('DISABLE')), keyword('TRIGGERS')))
          ),
          seq(keywords('BEFORE DROP'), optional(seq(keywords('RENAME TO'), $._name)))
        )
      ),

    purge_statement: ($) =>
      seq(
        keyword('PURGE'),
        choice(
          seq(keyword('TABLE'), $.object_name),
          seq(keyword('INDEX'), $.object_name),
          keyword('RECYCLEBIN'),
          keyword('DBA_RECYCLEBIN'),
          seq(keyword('TABLESPACE'), $._name, optional(seq(keyword('USER'), $._name)))
        )
      ),

    lock_table_statement: ($) =>
      seq(
        keywords('LOCK TABLE'),
        commaSep1(seq($.object_name, optional($.partition_extension_clause))),
        keyword('IN'),
        choice(
          keywords('ROW SHARE'),
          keywords('ROW EXCLUSIVE'),
          keywords('SHARE UPDATE'),
          keywords('SHARE ROW EXCLUSIVE'),
          keyword('SHARE'),
          keyword('EXCLUSIVE')
        ),
        keyword('MODE'),
        optional(choice(keyword('NOWAIT'), seq(keyword('WAIT'), $.numeric_literal)))
      ),

    commit_statement: ($) =>
      prec.right(
        seq(
          keyword('COMMIT'),
          optional(keyword('WORK')),
          repeat(
            choice(
              seq(keyword('COMMENT'), $.string_literal),
              prec.right(
                seq(
                  keyword('WRITE'),
                  repeat(choice(keyword('WAIT'), keyword('NOWAIT'), keyword('IMMEDIATE'), keyword('BATCH')))
                )
              ),
              seq(keyword('FORCE'), $.string_literal, optional(seq(',', $.numeric_literal)))
            )
          )
        )
      ),

    rollback_statement: ($) =>
      prec.right(
        seq(
          keyword('ROLLBACK'),
          optional(keyword('WORK')),
          optional(
            choice(
              seq(keyword('TO'), optional(keyword('SAVEPOINT')), field('savepoint', $._name)),
              seq(keyword('FORCE'), $.string_literal)
            )
          )
        )
      ),

    savepoint_statement: ($) => seq(keyword('SAVEPOINT'), field('name', $._name)),

    set_transaction_statement: ($) =>
      seq(
        keywords('SET TRANSACTION'),
        choice(
          keywords('READ ONLY'),
          keywords('READ WRITE'),
          seq(keywords('ISOLATION LEVEL'), choice(keyword('SERIALIZABLE'), keywords('READ COMMITTED'))),
          seq(keywords('USE ROLLBACK SEGMENT'), $._name)
        ),
        optional(seq(keyword('NAME'), $.string_literal))
      ),

    set_constraints_statement: ($) =>
      seq(
        keyword('SET'),
        choice(keyword('CONSTRAINT'), keyword('CONSTRAINTS')),
        choice(keyword('ALL'), commaSep1($.object_name)),
        choice(keyword('IMMEDIATE'), keyword('DEFERRED'))
      ),

    set_role_statement: ($) =>
      seq(
        keywords('SET ROLE'),
        choice(
          seq(keyword('ALL'), optional(seq(keyword('EXCEPT'), commaSep1($._name)))),
          keyword('NONE'),
          commaSep1(seq($._name, optional(seq(keywords('IDENTIFIED BY'), choice($._name, $.string_literal)))))
        )
      ),

    alter_session_statement: ($) =>
      seq(
        keywords('ALTER SESSION'),
        choice(
          seq(
            keyword('SET'),
            repeat1($.session_parameter_assignment),
            optional(seq(keyword('COMMENT'), '=', $.string_literal))
          ),
          seq(
            choice(keyword('ENABLE'), keyword('DISABLE'), keyword('FORCE')),
            keyword('PARALLEL'),
            choice(keyword('DML'), keyword('DDL'), keyword('QUERY')),
            optional(seq(keyword('PARALLEL'), $.numeric_literal))
          ),
          seq(keyword('ADVISE'), choice(keyword('COMMIT'), keyword('ROLLBACK'), keyword('NOTHING'))),
          seq(keywords('CLOSE DATABASE LINK'), $.dblink_name)
        )
      ),

    alter_system_statement: ($) =>
      seq(
        keywords('ALTER SYSTEM'),
        choice(
          seq(keyword('FLUSH'), choice(keyword('SHARED_POOL'), keyword('BUFFER_CACHE'), keywords('GLOBAL CONTEXT'))),
          seq(keyword('CHECKPOINT'), optional(choice(keyword('GLOBAL'), keyword('LOCAL')))),
          keywords('SWITCH LOGFILE'),
          seq(keywords('KILL SESSION'), $.string_literal, optional(choice(keyword('IMMEDIATE'), keyword('NOREPLY')))),
          seq(
            keywords('DISCONNECT SESSION'),
            $.string_literal,
            optional(choice(keyword('POST_TRANSACTION'), keyword('IMMEDIATE')))
          ),
          seq(
            keyword('SET'),
            repeat1($.session_parameter_assignment),
            repeat(
              choice(
                seq(keyword('COMMENT'), '=', $.string_literal),
                keyword('DEFERRED'),
                seq(keyword('SCOPE'), '=', choice(keyword('MEMORY'), keyword('SPFILE'), keyword('BOTH'))),
                seq(keyword('SID'), '=', $.string_literal),
                seq(keyword('CONTAINER'), '=', choice(keyword('CURRENT'), keyword('ALL')))
              )
            )
          ),
          seq(
            keyword('RESET'),
            $._name,
            repeat(
              choice(
                seq(keyword('SCOPE'), '=', choice(keyword('MEMORY'), keyword('SPFILE'), keyword('BOTH'))),
                seq(keyword('SID'), '=', $.string_literal)
              )
            )
          )
        )
      ),

    session_parameter_assignment: ($) =>
      seq(
        field('parameter', $._name),
        '=',
        commaSep1(choice($._expression, keyword('DEFAULT'), keyword('ALL'), keyword('NONE')))
      ),

    explain_plan_statement: ($) =>
      seq(
        keywords('EXPLAIN PLAN'),
        optional(seq(keywords('SET STATEMENT_ID'), '=', $.string_literal)),
        optional(seq(keyword('INTO'), $.object_name)),
        keyword('FOR'),
        $._sql_statement
      ),

    analyze_statement: ($) =>
      seq(
        keyword('ANALYZE'),
        choice(
          seq(keyword('TABLE'), $.object_name, optional($.partition_extension_clause)),
          seq(keyword('INDEX'), $.object_name, optional($.partition_extension_clause)),
          seq(keyword('CLUSTER'), $.object_name)
        ),
        choice(
          seq(
            choice(keyword('COMPUTE'), keyword('ESTIMATE')),
            optional(keyword('SYSTEM')),
            keyword('STATISTICS'),
            repeat(
              choice(
                keywords('FOR TABLE'),
                keywords('FOR ALL COLUMNS'),
                keywords('FOR ALL INDEXED COLUMNS'),
                prec.right(
                  seq(keywords('FOR COLUMNS'), repeat1(choice($._name, seq(keyword('SIZE'), $.numeric_literal))))
                ),
                keywords('FOR ALL INDEXES'),
                keywords('FOR ALL LOCAL INDEXES'),
                seq(keyword('SIZE'), $.numeric_literal),
                seq(keyword('SAMPLE'), $.numeric_literal, choice(keyword('ROWS'), keyword('PERCENT')))
              )
            )
          ),
          seq(keyword('DELETE'), optional(keyword('SYSTEM')), keyword('STATISTICS')),
          seq(
            keyword('VALIDATE'),
            choice(
              keywords('REF UPDATE'),
              seq(keyword('STRUCTURE'), optional(keyword('CASCADE')), optional(keyword('ONLINE')))
            )
          ),
          seq(keywords('LIST CHAINED ROWS'), optional(seq(keyword('INTO'), $.object_name)))
        )
      ),

    audit_statement: ($) =>
      seq(
        keyword('AUDIT'),
        choice(
          seq(
            keyword('POLICY'),
            $._name,
            optional(seq(choice(keyword('BY'), keyword('EXCEPT')), commaSep1($._name))),
            optional(seq(keyword('WHENEVER'), optional(keyword('NOT')), keyword('SUCCESSFUL')))
          ),
          seq(
            commaSep1($._privilege_or_role),
            optional(seq(keyword('ON'), choice(keyword('DEFAULT'), keyword('SCHEMA'), $.object_name))),
            optional(seq(keyword('BY'), choice(keyword('ACCESS'), keyword('SESSION'), commaSep1($._name)))),
            optional(seq(keyword('WHENEVER'), optional(keyword('NOT')), keyword('SUCCESSFUL')))
          )
        )
      ),

    noaudit_statement: ($) =>
      seq(
        keyword('NOAUDIT'),
        choice(
          seq(
            keyword('POLICY'),
            $._name,
            optional(seq(keyword('BY'), commaSep1($._name))),
            optional(seq(keyword('WHENEVER'), optional(keyword('NOT')), keyword('SUCCESSFUL')))
          ),
          seq(
            commaSep1($._privilege_or_role),
            optional(seq(keyword('ON'), choice(keyword('DEFAULT'), $.object_name))),
            optional(seq(keyword('BY'), commaSep1($._name))),
            optional(seq(keyword('WHENEVER'), optional(keyword('NOT')), keyword('SUCCESSFUL')))
          )
        )
      ),

    call_statement: ($) =>
      seq(keyword('CALL'), field('routine', $._primary_expression), optional(seq(keyword('INTO'), $.bind_variable))),

    // =========================================================================
    // Expressions, Operators & Analytic / JSON / XML Constructs
    // =========================================================================

    _expression: ($) =>
      choice(
        $._primary_expression,
        $.expression_list,
        $._literal,
        $.unary_expression,
        $.binary_expression,
        $.quantified_comparison_expression,
        $.is_expression,
        $.like_expression,
        $.between_expression,
        $.in_expression,
        $.member_of_expression,
        $.submultiset_expression,
        $.exists_expression,
        $.multiset_operator_expression,
        $.collate_expression,
        $.at_time_zone_expression
      ),

    _primary_expression: ($) =>
      choice(
        $._expr_identifier,
        $.bind_variable,
        $.pseudocolumn,
        $.parenthesized_expression,
        $.subquery,
        $.member_expression,
        $.dblink_expression,
        $.cursor_attribute,
        $.outer_join_expression,
        $.model_cell_reference,
        $.function_call,
        $.case_expression,
        $.cast_expression,
        $.treat_expression,
        $.cursor_expression,
        $.multiset_expression,
        $.extract_expression,
        $.trim_expression,
        $.translate_expression,
        $.listagg_expression,
        $.json_function_expression,
        $.json_constructor_expression,
        $.xml_function_expression
      ),

    _literal: ($) =>
      choice(
        $.null,
        $.boolean_literal,
        $.numeric_literal,
        $.string_literal,
        $.date_literal,
        $.timestamp_literal,
        $.interval_literal,
        $._illegal
      ),

    _illegal: ($) => seq($._illegal_token, $._unreachable),

    null: () => keyword('NULL'),

    boolean_literal: () => choice(keyword('TRUE'), keyword('FALSE')),

    date_literal: ($) => seq(keyword('DATE'), $.string_literal),

    timestamp_literal: ($) => seq(keyword('TIMESTAMP'), $.string_literal),

    interval_literal: ($) =>
      prec.right(
        seq(
          keyword('INTERVAL'),
          $.string_literal,
          $._interval_unit,
          optional(seq('(', $.numeric_literal, optional(seq(',', $.numeric_literal)), ')')),
          optional(seq(keyword('TO'), $._interval_unit, optional(seq('(', $.numeric_literal, ')'))))
        )
      ),

    _interval_unit: () =>
      choice(keyword('YEAR'), keyword('MONTH'), keyword('DAY'), keyword('HOUR'), keyword('MINUTE'), keyword('SECOND')),

    pseudocolumn: () =>
      choice(
        keyword('ROWID'),
        keyword('ROWNUM'),
        keyword('LEVEL'),
        keyword('SYSDATE'),
        keyword('SYSTIMESTAMP'),
        keyword('UID'),
        keyword('USER'),
        keyword('CURRENT_DATE'),
        keyword('CURRENT_TIMESTAMP'),
        keyword('LOCALTIMESTAMP'),
        keyword('SESSIONTIMEZONE'),
        keyword('DBTIMEZONE'),
        keyword('ORA_ROWSCN'),
        keyword('COLUMN_VALUE'),
        keyword('OBJECT_ID'),
        keyword('OBJECT_VALUE')
      ),

    parenthesized_expression: ($) => seq('(', $._expression, ')'),

    expression_list: ($) => seq('(', $._expression, ',', commaSep1($._expression), ')'),

    subquery: ($) => prec(1, seq('(', $.select_statement, ')')),

    member_expression: ($) =>
      prec.left(PREC.POSTFIX, seq(field('object', $._primary_expression), '.', field('member', $._member_name))),

    dblink_expression: ($) =>
      prec.left(PREC.POSTFIX, seq(field('object', $._primary_expression), '@', field('dblink', $.dblink_name))),

    cursor_attribute: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(field('cursor', choice($._primary_expression, keyword('SQL'))), '%', field('attribute', $._member_name))
      ),

    outer_join_expression: ($) =>
      prec.left(PREC.POSTFIX, seq(field('column', $._primary_expression), $.outer_join_indicator)),

    outer_join_indicator: () => token(prec(1, /\([\t\n\v\f\r ]*\+[\t\n\v\f\r ]*\)/)),

    function_call: ($) =>
      seq(
        field('name', $._callable_expression),
        '(',
        optional(
          choice(
            alias('*', $.all_columns),
            seq(
              optional(choice(keyword('DISTINCT'), keyword('UNIQUE'), keyword('ALL'))),
              commaSep1($.function_argument),
              optional(seq(choice(keyword('RESPECT'), keyword('IGNORE')), keyword('NULLS'))),
              optional($.order_by_clause)
            )
          )
        ),
        ')',
        repeat($._analytic_modifier)
      ),

    _analytic_modifier: ($) =>
      choice(
        seq(choice(keyword('RESPECT'), keyword('IGNORE')), keyword('NULLS')),
        $.keep_clause,
        $.within_group_clause,
        $.filter_clause,
        $.over_clause
      ),

    _callable_expression: ($) => choice($._identifier, $.member_expression, $.function_call),

    function_argument: ($) =>
      choice(seq(field('parameter', $._name), '=>', field('value', $._expression)), $._expression),

    keep_clause: ($) =>
      seq(
        keyword('KEEP'),
        '(',
        keywords('DENSE_RANK'),
        choice(keyword('FIRST'), keyword('LAST')),
        $.order_by_clause,
        ')'
      ),

    within_group_clause: ($) => seq(keywords('WITHIN GROUP'), '(', $.order_by_clause, ')'),

    filter_clause: ($) => seq(keyword('FILTER'), '(', $.where_clause, ')'),

    over_clause: ($) =>
      seq(keyword('OVER'), choice(field('window', $._name), seq('(', optional($.window_specification), ')'))),

    window_specification: ($) =>
      choice(
        seq(
          field('base', $._name),
          optional($.partition_by_clause),
          optional($.order_by_clause),
          optional($.windowing_clause)
        ),
        seq($.partition_by_clause, optional($.order_by_clause), optional($.windowing_clause)),
        seq($.order_by_clause, optional($.windowing_clause)),
        $.windowing_clause
      ),

    partition_by_clause: ($) => seq(keywords('PARTITION BY'), commaSep1($._expression)),

    windowing_clause: ($) =>
      seq(
        choice(keyword('ROWS'), keyword('RANGE'), keyword('GROUPS')),
        choice($.frame_bound, seq(keyword('BETWEEN'), $.frame_bound, keyword('AND'), $.frame_bound)),
        optional(
          seq(
            keyword('EXCLUDE'),
            choice(keywords('CURRENT ROW'), keyword('GROUP'), keyword('TIES'), keywords('NO OTHERS'))
          )
        )
      ),

    frame_bound: ($) =>
      choice(
        keywords('UNBOUNDED PRECEDING'),
        keywords('UNBOUNDED FOLLOWING'),
        keywords('CURRENT ROW'),
        seq($._expression, choice(keyword('PRECEDING'), keyword('FOLLOWING')))
      ),

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

    cast_expression: ($) =>
      seq(
        keyword('CAST'),
        '(',
        field('value', $._expression),
        keyword('AS'),
        field('type', $.type_name),
        optional(seq(keyword('DEFAULT'), field('default', $._expression), keywords('ON CONVERSION ERROR'))),
        optional(seq(',', $._expression, optional(seq(',', $._expression)))),
        ')'
      ),

    treat_expression: ($) =>
      seq(keyword('TREAT'), '(', field('value', $._expression), keyword('AS'), field('type', $.type_name), ')'),

    cursor_expression: ($) => seq(keyword('CURSOR'), '(', $.select_statement, ')'),

    multiset_expression: ($) => seq(keyword('MULTISET'), '(', $.select_statement, ')'),

    extract_expression: ($) =>
      seq(
        keyword('EXTRACT'),
        '(',
        field(
          'field',
          choice(
            $._interval_unit,
            keyword('TIMEZONE_HOUR'),
            keyword('TIMEZONE_MINUTE'),
            keyword('TIMEZONE_REGION'),
            keyword('TIMEZONE_ABBR')
          )
        ),
        keyword('FROM'),
        field('source', $._expression),
        ')'
      ),

    trim_expression: ($) =>
      seq(
        keyword('TRIM'),
        '(',
        choice(
          seq(
            choice(keyword('LEADING'), keyword('TRAILING'), keyword('BOTH')),
            optional(field('trim_character', $._expression)),
            keyword('FROM'),
            field('source', $._expression)
          ),
          seq(field('trim_character', $._expression), keyword('FROM'), field('source', $._expression)),
          field('source', $._expression)
        ),
        ')'
      ),

    translate_expression: ($) =>
      seq(
        keyword('TRANSLATE'),
        '(',
        field('source', $._expression),
        choice(
          seq(keyword('USING'), choice(keyword('CHAR_CS'), keyword('NCHAR_CS'))),
          seq(',', $._expression, ',', $._expression)
        ),
        ')'
      ),

    listagg_expression: ($) =>
      seq(
        keyword('LISTAGG'),
        '(',
        optional(choice(keyword('ALL'), keyword('DISTINCT'))),
        field('value', $._expression),
        optional(seq(',', field('delimiter', $._expression))),
        optional($.listagg_overflow_clause),
        ')',
        optional($.within_group_clause),
        optional($.over_clause)
      ),

    listagg_overflow_clause: ($) =>
      seq(
        keywords('ON OVERFLOW'),
        choice(
          keyword('ERROR'),
          seq(
            keyword('TRUNCATE'),
            optional($.string_literal),
            optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('COUNT')))
          )
        )
      ),

    json_function_expression: ($) =>
      choice(
        seq(
          choice(keyword('JSON_VALUE'), keyword('JSON_QUERY'), keyword('JSON_EXISTS')),
          '(',
          $._expression,
          optional(keywords('FORMAT JSON')),
          optional(seq(',', $._expression)),
          repeat(
            choice(
              $._json_passing_or_behavior,
              $._json_returning_clause,
              $._json_wrapper_clause,
              keyword('PRETTY'),
              keyword('ascii'),
              keyword('TRUNCATE'),
              seq(choice(keyword('KEEP'), keyword('OMIT')), keyword('QUOTES'))
            )
          ),
          ')'
        ),
        seq(
          keyword('JSON_OBJECT'),
          '(',
          optional(choice('*', commaSep1($.json_object_entry))),
          repeat(choice($._json_null_clause, $._json_returning_clause, keyword('STRICT'))),
          ')'
        ),
        seq(
          keyword('JSON_ARRAY'),
          '(',
          optional(choice($.select_statement, commaSep1(seq($._expression, optional(keywords('FORMAT JSON')))))),
          repeat(choice($._json_null_clause, $._json_returning_clause, keyword('STRICT'))),
          ')'
        ),
        seq(
          keyword('JSON_OBJECTAGG'),
          '(',
          $.json_object_entry,
          repeat(choice($._json_null_clause, $._json_returning_clause, keyword('STRICT'))),
          ')',
          optional($.over_clause)
        ),
        seq(
          keyword('JSON_ARRAYAGG'),
          '(',
          $._expression,
          optional(keywords('FORMAT JSON')),
          optional($.order_by_clause),
          repeat(choice($._json_null_clause, $._json_returning_clause, keyword('STRICT'))),
          ')',
          optional($.over_clause)
        )
      ),

    json_object_entry: ($) =>
      choice(
        seq(
          optional(keyword('KEY')),
          field('key', $._expression),
          choice(keyword('VALUE'), ':'),
          field('value', $._expression),
          optional(keywords('FORMAT JSON'))
        ),
        seq(field('value', $._expression), optional(keywords('FORMAT JSON')))
      ),

    json_constructor_expression: ($) =>
      seq(
        keyword('JSON'),
        choice(
          seq('{', commaSep($.json_object_entry), '}'),
          seq('[', commaSep(seq($._expression, optional(keywords('FORMAT JSON')))), ']')
        )
      ),

    _json_null_clause: () => seq(choice(keyword('NULL'), keyword('ABSENT')), keywords('ON NULL')),

    _json_returning_clause: ($) => seq(keyword('RETURNING'), $.type_name),

    _json_wrapper_clause: () =>
      seq(
        choice(keyword('WITHOUT'), keyword('WITH')),
        optional(choice(keyword('UNCONDITIONAL'), keyword('CONDITIONAL'))),
        optional(keyword('ARRAY')),
        keyword('WRAPPER')
      ),

    _json_on_error_or_empty: ($) =>
      seq(
        choice(
          keyword('ERROR'),
          keyword('NULL'),
          keyword('TRUE'),
          keyword('FALSE'),
          seq(keyword('EMPTY'), optional(choice(keyword('ARRAY'), keyword('OBJECT')))),
          seq(keyword('DEFAULT'), $._expression)
        ),
        keyword('ON'),
        choice(keyword('ERROR'), keyword('EMPTY'), keyword('MISMATCH'))
      ),

    xml_function_expression: ($) =>
      choice(
        seq(
          keyword('XMLELEMENT'),
          '(',
          optional(choice(keyword('ENTITYESCAPING'), keyword('NOENTITYESCAPING'))),
          choice(seq(keyword('EVALNAME'), $._expression), seq(optional(keyword('NAME')), $._name)),
          repeat(
            seq(
              ',',
              $._expression,
              optional(seq(keyword('AS'), choice($._name, seq(keyword('EVALNAME'), $._expression))))
            )
          ),
          ')'
        ),
        $.xml_attributes_clause,
        seq(
          keyword('XMLFOREST'),
          '(',
          commaSep1(
            seq($._expression, optional(seq(keyword('AS'), choice($._name, seq(keyword('EVALNAME'), $._expression)))))
          ),
          ')'
        )
      ),

    xml_attributes_clause: ($) =>
      seq(
        keyword('XMLATTRIBUTES'),
        '(',
        optional(choice(keyword('ENTITYESCAPING'), keyword('NOENTITYESCAPING'))),
        optional(choice(keyword('SCHEMACHECK'), keyword('NOSCHEMACHECK'))),
        commaSep1(
          seq($._expression, optional(seq(keyword('AS'), choice($._name, seq(keyword('EVALNAME'), $._expression)))))
        ),
        ')'
      ),

    // Unary & Binary Expressions (Oracle Table 4-1 Precedence)

    unary_expression: ($) =>
      choice(
        prec.right(PREC.NOT, seq(field('operator', keyword('NOT')), field('operand', $._expression))),
        prec.right(
          PREC.UNARY,
          seq(
            field('operator', choice('+', '-', keyword('PRIOR'), keyword('CONNECT_BY_ROOT'))),
            field('operand', $._expression)
          )
        )
      ),

    binary_expression: ($) =>
      binaryExpression($._expression, [
        [PREC.OR, keyword('OR'), 'left'],
        [PREC.AND, keyword('AND'), 'left'],
        [PREC.COMPARISON, choice('=', '!=', '<>', '^=', '~=', '<', '<=', '>', '>='), 'left'],
        ...ARITHMETIC_OPERATORS,
      ]),

    multiset_operator_expression: ($) =>
      prec.left(
        PREC.MULTISET,
        seq(
          field('left', $._expression),
          keyword('MULTISET'),
          field('operator', choice(keyword('UNION'), keyword('INTERSECT'), keyword('EXCEPT'))),
          optional(choice(keyword('ALL'), keyword('DISTINCT'))),
          field('right', $._expression)
        )
      ),

    quantified_comparison_expression: ($) =>
      prec.left(
        PREC.COMPARISON,
        seq(
          field('left', $._expression),
          field('operator', choice('=', '!=', '<>', '^=', '~=', '<', '<=', '>', '>=')),
          field('quantifier', choice(keyword('ANY'), keyword('SOME'), keyword('ALL'))),
          '(',
          choice($.select_statement, commaSep1($._expression)),
          ')'
        )
      ),

    is_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(
          field('value', $._expression),
          keyword('IS'),
          optional(keyword('NOT')),
          choice(
            keyword('NULL'),
            keyword('NAN'),
            keyword('INFINITE'),
            keywords('A SET'),
            keyword('EMPTY'),
            keyword('TRUE'),
            keyword('FALSE'),
            keyword('UNKNOWN'),
            seq(
              keyword('JSON'),
              optional(keywords('FORMAT JSON')),
              repeat(
                choice(
                  keyword('STRICT'),
                  keyword('LAX'),
                  keyword('SCALAR'),
                  keyword('OBJECT'),
                  keyword('ARRAY'),
                  keyword('VALUE'),
                  seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('UNIQUE'), optional(keyword('KEYS')))
                )
              )
            ),
            seq(
              keyword('OF'),
              optional(keyword('TYPE')),
              '(',
              commaSep1(seq(optional(keyword('ONLY')), $.type_name)),
              ')'
            )
          )
        )
      ),

    like_expression: ($) =>
      choice(
        prec.left(PREC.PREDICATE, seq($._like_head, field('pattern', $._expression))),
        seq(
          $._like_head,
          prec(PREC.ESCAPE, seq(field('pattern', $._expression), keyword('ESCAPE'))),
          prec.left(PREC.PREDICATE, field('escape', $._expression))
        )
      ),

    _like_head: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          field('operator', choice(keyword('LIKE'), keyword('LIKEC'), keyword('LIKE2'), keyword('LIKE4')))
        )
      ),

    between_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
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
        PREC.PREDICATE,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('IN'),
          choice(
            seq('(', choice($.select_statement, commaSep1($._expression)), ')'),
            field('collection', $._primary_expression)
          )
        )
      ),

    member_of_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('MEMBER'),
          optional(keyword('OF')),
          field('collection', $._expression)
        )
      ),

    submultiset_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('SUBMULTISET'),
          optional(keyword('OF')),
          field('collection', $._expression)
        )
      ),

    exists_expression: ($) => seq(keyword('EXISTS'), '(', $.select_statement, ')'),

    collate_expression: ($) =>
      prec.left(PREC.COLLATE, seq(field('value', $._expression), keyword('COLLATE'), field('collation', $._name))),

    at_time_zone_expression: ($) =>
      prec.left(
        PREC.AT_TIME_ZONE,
        seq(
          field('value', $._expression),
          keyword('AT'),
          choice(keyword('LOCAL'), seq(keywords('TIME ZONE'), field('zone', $._expression)))
        )
      ),

    // =========================================================================
    // Identifiers & Qualified Object Names
    // =========================================================================

    column_list: ($) => seq('(', commaSep1($._name), ')'),

    object_name: ($) =>
      prec.right(
        seq(
          field('name', $._name),
          repeat(seq('.', field('member', $._member_name))),
          optional(seq('@', field('dblink', $.dblink_name)))
        )
      ),

    dblink_name: ($) => prec.right(seq($._name, repeat(seq('.', $._member_name)), optional(seq('@', $._member_name)))),

    _name: ($) => choice($._identifier, prec(1, $._illegal)),

    _plsql_name: ($) => choice(reserved('plsql', $.identifier), $.quoted_identifier, prec(1, $._illegal)),

    _member_name: ($) => choice(reserved('member', $.identifier), $.quoted_identifier, prec(1, $._illegal)),

    _expr_identifier: ($) =>
      choice($._identifier, ...SPECIAL_EXPR_KEYWORDS.map((word) => alias(keyword(word), $.identifier))),

    _identifier: ($) => choice($.identifier, $.quoted_identifier),

    identifier: () => new RegExp(`[${IDENTIFIER_START}][${IDENTIFIER_PART}]*`, 'u'),
  },
});
