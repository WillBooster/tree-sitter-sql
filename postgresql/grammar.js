// @ts-check

/** @import {GrammarSymbols, RuleOrLiteral} from '@willbooster/web-tree-sitter/dsl' */

// PostgreSQL 18 SQL grammar. Keyword categories (`RESERVED_KEYWORDS`, `TYPE_FUNC_NAME_KEYWORDS`,
// `COL_NAME_KEYWORDS`, and `NON_BARE_LABEL_KEYWORDS`) and operator precedences match PostgreSQL 18.

import { commaSep, commaSep1, keyword, keywordPattern, keywords } from '../common/common.mjs';

// The CLI injects the DSL before loading this grammar.
const { grammar, alias, choice, field, optional, prec, repeat, repeat1, reserved, seq, token } =
  /** @type {typeof globalThis & import('@willbooster/web-tree-sitter/dsl').DSL} */ (globalThis);

const PREC = {
  OR: 1,
  AND: 2,
  NOT: 3,
  IS: 4,
  COMPARISON: 5,
  PATTERN: 6,
  ESCAPE: 7,
  OP: 8,
  ADDITIVE: 9,
  MULTIPLICATIVE: 10,
  EXPONENT: 11,
  AT: 12,
  UNARY: 13,
  POSTFIX: 14,
};

// PostgreSQL 18 `RESERVED_KEYWORD` (`catcode = 'R'`): never valid as unquoted `ColId` or `type_function_name`.
const RESERVED_KEYWORDS = [
  'ALL',
  'ANALYSE',
  'ANALYZE',
  'AND',
  'ANY',
  'ARRAY',
  'AS',
  'ASC',
  'ASYMMETRIC',
  'BOTH',
  'CASE',
  'CAST',
  'CHECK',
  'COLLATE',
  'COLUMN',
  'CONSTRAINT',
  'CREATE',
  'CURRENT_CATALOG',
  'CURRENT_DATE',
  'CURRENT_ROLE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'CURRENT_USER',
  'DEFAULT',
  'DEFERRABLE',
  'DESC',
  'DISTINCT',
  'DO',
  'ELSE',
  'END',
  'EXCEPT',
  'FALSE',
  'FETCH',
  'FOR',
  'FOREIGN',
  'FROM',
  'GRANT',
  'GROUP',
  'HAVING',
  'IN',
  'INITIALLY',
  'INTERSECT',
  'INTO',
  'LATERAL',
  'LEADING',
  'LIMIT',
  'LOCALTIME',
  'LOCALTIMESTAMP',
  'NOT',
  'NULL',
  'OFFSET',
  'ON',
  'ONLY',
  'OR',
  'ORDER',
  'PLACING',
  'PRIMARY',
  'REFERENCES',
  'RETURNING',
  'SELECT',
  'SESSION_USER',
  'SOME',
  'SYMMETRIC',
  'SYSTEM_USER',
  'TABLE',
  'THEN',
  'TO',
  'TRAILING',
  'TRUE',
  'UNION',
  'UNIQUE',
  'USER',
  'USING',
  'VARIADIC',
  'WHEN',
  'WHERE',
  'WINDOW',
  'WITH',
];

// PostgreSQL 18 `TYPE_FUNC_NAME_KEYWORD` (`catcode = 'T'`): valid in `type_function_name`, rejected in `ColId`.
const TYPE_FUNC_NAME_KEYWORDS = [
  'AUTHORIZATION',
  'BINARY',
  'COLLATION',
  'CONCURRENTLY',
  'CROSS',
  'CURRENT_SCHEMA',
  'FREEZE',
  'FULL',
  'ILIKE',
  'INNER',
  'IS',
  'ISNULL',
  'JOIN',
  'LEFT',
  'LIKE',
  'NATURAL',
  'NOTNULL',
  'OUTER',
  'OVERLAPS',
  'RIGHT',
  'SIMILAR',
  'TABLESAMPLE',
  'VERBOSE',
];

// PostgreSQL 18 `COL_NAME_KEYWORD` (`catcode = 'C'`): valid in `ColId`, handled by dedicated type/function rules.
const COL_NAME_KEYWORDS = [
  'BETWEEN',
  'BIGINT',
  'BIT',
  'BOOLEAN',
  'CHAR',
  'CHARACTER',
  'COALESCE',
  'DEC',
  'DECIMAL',
  'EXISTS',
  'EXTRACT',
  'FLOAT',
  'GREATEST',
  'GROUPING',
  'INOUT',
  'INT',
  'INTEGER',
  'INTERVAL',
  'JSON',
  'JSON_ARRAY',
  'JSON_ARRAYAGG',
  'JSON_EXISTS',
  'JSON_OBJECT',
  'JSON_OBJECTAGG',
  'JSON_QUERY',
  'JSON_SCALAR',
  'JSON_SERIALIZE',
  'JSON_TABLE',
  'JSON_VALUE',
  'LEAST',
  'MERGE_ACTION',
  'NATIONAL',
  'NCHAR',
  'NONE',
  'NORMALIZE',
  'NULLIF',
  'NUMERIC',
  'OUT',
  'OVERLAY',
  'POSITION',
  'PRECISION',
  'REAL',
  'ROW',
  'SETOF',
  'SMALLINT',
  'SUBSTRING',
  'TIME',
  'TIMESTAMP',
  'TREAT',
  'TRIM',
  'VALUES',
  'VARCHAR',
  'XMLATTRIBUTES',
  'XMLCONCAT',
  'XMLELEMENT',
  'XMLEXISTS',
  'XMLFOREST',
  'XMLNAMESPACES',
  'XMLPARSE',
  'XMLPI',
  'XMLROOT',
  'XMLSERIALIZE',
  'XMLTABLE',
];

// PostgreSQL 18 keywords with `barelabel = false` (`BareColLabel` excludes only these 39 keywords).
const NON_BARE_LABEL_KEYWORDS = [
  'ARRAY',
  'AS',
  'CHAR',
  'CHARACTER',
  'CREATE',
  'DAY',
  'EXCEPT',
  'FETCH',
  'FILTER',
  'FOR',
  'FROM',
  'GRANT',
  'GROUP',
  'HAVING',
  'HOUR',
  'INTERSECT',
  'INTO',
  'ISNULL',
  'LIMIT',
  'MINUTE',
  'MONTH',
  'NOTNULL',
  'OFFSET',
  'ON',
  'ORDER',
  'OVER',
  'OVERLAPS',
  'PRECISION',
  'RETURNING',
  'SECOND',
  'TO',
  'UNION',
  'VARYING',
  'WHERE',
  'WINDOW',
  'WITH',
  'WITHIN',
  'WITHOUT',
  'YEAR',
];

const NON_BARE_LABEL_SET = new Set(NON_BARE_LABEL_KEYWORDS);
const GLOBAL_RESERVED_KEYWORDS = [...RESERVED_KEYWORDS, ...TYPE_FUNC_NAME_KEYWORDS];
const FUNC_RESERVED_KEYWORDS = [...GLOBAL_RESERVED_KEYWORDS, ...COL_NAME_KEYWORDS];
const BARE_LABEL_RESERVED_KEYWORDS = [...new Set([...GLOBAL_RESERVED_KEYWORDS, ...NON_BARE_LABEL_KEYWORDS])];
const BARE_LABEL_EXTRA_KEYWORDS = GLOBAL_RESERVED_KEYWORDS.filter((word) => !NON_BARE_LABEL_SET.has(word));
const UNRESERVED_STARTER_KEYWORDS = ['CURRENT', 'DOUBLE', 'EXCLUDE', 'OPERATOR'];

const DIGITS = '[0-9](_?[0-9])*';
const HEX_DIGITS = '[0-9a-fA-F](_?[0-9a-fA-F])*';
const OCT_DIGITS = '[0-7](_?[0-7])*';
const BIN_DIGITS = '[01](_?[01])*';

/** @param {RuleOrLiteral} rule */
const parens = (rule) => seq('(', rule, ')');

/**
 * @param {GrammarSymbols<string>} $
 * @param {number} precedence
 * @param {RuleOrLiteral} operator
 */
const binaryOp = ($, precedence, operator) =>
  prec.left(precedence, seq(field('left', $._expression), field('operator', operator), field('right', $._expression)));

export default grammar({
  name: 'postgresql',

  extras: ($) => [/[ \t\n\r\f\v]+/, $.comment],

  externals: ($) => [
    $.comment,
    $.string_literal,
    $.bit_string_literal,
    $.quoted_identifier,
    $.positional_parameter,
    $.custom_operator,
    '+',
    '-',
    $._illegal_token,
    $._unreachable,
  ],

  word: ($) => $.identifier,

  reserved: {
    global: () => GLOBAL_RESERVED_KEYWORDS.map(keywordPattern),
    func_id: () => FUNC_RESERVED_KEYWORDS.map(keywordPattern),
    bare_label: () => BARE_LABEL_RESERVED_KEYWORDS.map(keywordPattern),
  },

  supertypes: ($) => [$._statement],

  conflicts: ($) => [
    [$.select_statement, $._parenthesized_select],
    [$._type_modifiers, $.function_argument],
    [$._func_name, $._any_operator],
    [$._column_identifier, $._func_identifier],
    [$.row_expression, $.in_expression],
    [$._non_interval_simple_type],
    [$.distinct_clause],
    [$.table_function],
    [$.rows_from_table],
  ],

  rules: {
    source_file: ($) => seq(optional($._statement), repeat(seq(';', optional($._statement)))),

    _statement: ($) =>
      choice(
        $.explain_statement,
        $._preparable_statement,
        $.create_table_statement,
        $.create_index_statement,
        $.create_sequence_statement,
        $.create_view_statement,
        $.refresh_materialized_view_statement,
        $.create_schema_statement,
        $.create_type_statement,
        $.create_domain_statement,
        $.create_extension_statement,
        $.create_function_statement,
        $.create_trigger_statement,
        $.create_event_trigger_statement,
        $.create_rule_statement,
        $.create_policy_statement,
        $.create_publication_statement,
        $.create_subscription_statement,
        $.create_role_statement,
        $.create_database_statement,
        $.create_tablespace_statement,
        $.create_foreign_data_wrapper_statement,
        $.create_server_statement,
        $.create_foreign_table_statement,
        $.create_user_mapping_statement,
        $.import_foreign_schema_statement,
        $.create_aggregate_statement,
        $.create_operator_statement,
        $.create_operator_class_statement,
        $.create_operator_family_statement,
        $.create_cast_statement,
        $.create_collation_statement,
        $.create_conversion_statement,
        $.create_transform_statement,
        $.create_access_method_statement,
        $.create_text_search_statement,
        $.create_statistics_statement,
        $.alter_table_statement,
        $.alter_index_statement,
        $.alter_sequence_statement,
        $.alter_view_statement,
        $.alter_schema_statement,
        $.alter_type_statement,
        $.alter_domain_statement,
        $.alter_extension_statement,
        $.alter_routine_statement,
        $.alter_trigger_statement,
        $.alter_event_trigger_statement,
        $.alter_rule_statement,
        $.alter_policy_statement,
        $.alter_publication_statement,
        $.alter_subscription_statement,
        $.alter_role_statement,
        $.alter_database_statement,
        $.alter_tablespace_statement,
        $.alter_foreign_data_wrapper_statement,
        $.alter_server_statement,
        $.alter_user_mapping_statement,
        $.alter_aggregate_statement,
        $.alter_operator_statement,
        $.alter_operator_class_statement,
        $.alter_operator_family_statement,
        $.alter_collation_statement,
        $.alter_conversion_statement,
        $.alter_text_search_statement,
        $.alter_statistics_statement,
        $.alter_default_privileges_statement,
        $.alter_system_statement,
        $.drop_statement,
        $.drop_owned_statement,
        $.reassign_owned_statement,
        $.comment_statement,
        $.security_label_statement,
        $.grant_statement,
        $.revoke_statement,
        $.set_statement,
        $.reset_statement,
        $.show_statement,
        $.begin_statement,
        $.commit_statement,
        $.rollback_statement,
        $.savepoint_statement,
        $.release_statement,
        $.prepare_transaction_statement,
        $.commit_prepared_statement,
        $.rollback_prepared_statement,
        $.lock_statement,
        $.truncate_statement,
        $.vacuum_statement,
        $.analyze_statement,
        $.cluster_statement,
        $.reindex_statement,
        $.copy_statement,
        $.do_statement,
        $.call_statement,
        $.prepare_statement,
        $.execute_statement,
        $.deallocate_statement,
        $.listen_statement,
        $.notify_statement,
        $.unlisten_statement,
        $.declare_statement,
        $.fetch_statement,
        $.move_statement,
        $.close_statement,
        $.discard_statement,
        $.checkpoint_statement,
        $.load_statement
      ),

    _preparable_statement: ($) =>
      choice($.select_statement, $.insert_statement, $.update_statement, $.delete_statement, $.merge_statement),

    _explainable_statement: ($) =>
      choice(
        $._preparable_statement,
        $.create_table_statement,
        $.create_view_statement,
        $.refresh_materialized_view_statement,
        $.execute_statement,
        $.declare_statement
      ),

    explain_statement: ($) =>
      seq(
        keyword('EXPLAIN'),
        optional(
          choice(
            parens(commaSep1($._utility_option)),
            repeat1(choice(keyword('ANALYZE'), keyword('ANALYSE'), keyword('VERBOSE')))
          )
        ),
        $._explainable_statement
      ),

    _utility_option: ($) =>
      seq(
        choice($._col_label, keyword('ANALYZE'), keyword('ANALYSE'), keyword('VERBOSE'), keyword('FREEZE')),
        optional(choice($._expression, keyword('ON'), keyword('OFF'), keyword('ALL')))
      ),

    // =========================================================================
    // Queries (`SELECT`, `VALUES`, `TABLE`, `WITH`, Set Operations)
    // =========================================================================

    select_statement: ($) => $._select_body,

    _select_body: ($) =>
      prec.right(
        seq(
          optional($.with_clause),
          $._select_set_expr,
          optional($.order_by_clause),
          repeat(choice($.limit_clause, $.offset_clause, $.fetch_clause, $.locking_clause))
        )
      ),

    _select_set_expr: ($) =>
      prec.left(choice($._select_primary, seq($._select_set_expr, $.compound_operator, $._select_set_expr))),

    compound_operator: () =>
      prec.left(
        choice(
          seq(choice(keyword('UNION'), keyword('EXCEPT')), optional(choice(keyword('ALL'), keyword('DISTINCT')))),
          prec(2, seq(keyword('INTERSECT'), optional(choice(keyword('ALL'), keyword('DISTINCT')))))
        )
      ),

    _select_primary: ($) => choice($.select_core, $.values_clause, $.table_query, $._parenthesized_select),

    _parenthesized_select: ($) => parens($._select_body),

    _relation_expr: ($) =>
      choice(
        seq(field('name', $.qualified_name), optional('*')),
        seq(keyword('ONLY'), choice(field('name', $.qualified_name), parens(field('name', $.qualified_name))))
      ),

    table_query: ($) => seq(keyword('TABLE'), $._relation_expr),

    values_clause: ($) => seq(keyword('VALUES'), commaSep1($.row)),

    row: ($) => parens(commaSep1(choice($._expression, keyword('DEFAULT')))),

    with_clause: ($) => seq(keyword('WITH'), optional(keyword('RECURSIVE')), commaSep1($.common_table_expression)),

    common_table_expression: ($) =>
      seq(
        field('name', $._identifier),
        optional($.column_list),
        keyword('AS'),
        optional(choice(keyword('MATERIALIZED'), keywords('NOT MATERIALIZED'))),
        parens($._preparable_statement),
        optional($.cte_search_clause),
        optional($.cte_cycle_clause)
      ),

    cte_search_clause: ($) =>
      seq(
        keyword('SEARCH'),
        choice(keywords('BREADTH FIRST'), keywords('DEPTH FIRST')),
        keyword('BY'),
        commaSep1($._identifier),
        keyword('SET'),
        $._identifier
      ),

    cte_cycle_clause: ($) =>
      seq(
        keyword('CYCLE'),
        commaSep1($._identifier),
        keyword('SET'),
        $._identifier,
        optional(seq(keyword('TO'), $._expression, keyword('DEFAULT'), $._expression)),
        keyword('USING'),
        $._identifier
      ),

    select_core: ($) =>
      seq(
        keyword('SELECT'),
        optional($.distinct_clause),
        optional($._target_list),
        optional($.into_clause),
        optional($.from_clause),
        optional($.where_clause),
        optional($.group_by_clause),
        optional($.having_clause),
        optional($.window_clause)
      ),

    distinct_clause: ($) =>
      choice(keyword('ALL'), seq(keyword('DISTINCT'), optional(seq(keyword('ON'), parens(commaSep1($._expression)))))),

    _target_list: ($) => commaSep1(choice($.result_column, alias('*', $.all_columns), $.table_columns)),

    result_column: ($) =>
      seq(
        field('value', $._expression),
        optional(choice(seq(keyword('AS'), field('alias', $._col_label)), field('alias', $._bare_col_label)))
      ),

    table_columns: ($) =>
      choice(
        seq(field('table', $._column_identifier), '.', '*'),
        seq(field('schema', $._column_identifier), '.', field('table', $._col_label), '.', '*')
      ),

    into_clause: ($) =>
      seq(
        keyword('INTO'),
        optional(choice($.temporary, keyword('UNLOGGED'))),
        optional(keyword('TABLE')),
        field('table', $.qualified_name)
      ),

    from_clause: ($) => seq(keyword('FROM'), $._join_list),

    _join_list: ($) => prec.left(seq($._table_ref, repeat(choice(seq(',', $._table_ref), $._join)))),

    _join: ($) =>
      prec.left(
        choice(
          seq(choice(keywords('CROSS JOIN'), $.natural_join_operator), $._table_ref),
          seq($.join_operator, $._table_ref, $.join_constraint)
        )
      ),

    join_operator: () =>
      choice(
        seq(optional(keyword('INNER')), keyword('JOIN')),
        seq(choice(keyword('LEFT'), keyword('RIGHT'), keyword('FULL')), optional(keyword('OUTER')), keyword('JOIN'))
      ),

    natural_join_operator: () =>
      seq(
        keyword('NATURAL'),
        optional(
          choice(
            keyword('INNER'),
            seq(choice(keyword('LEFT'), keyword('RIGHT'), keyword('FULL')), optional(keyword('OUTER')))
          )
        ),
        keyword('JOIN')
      ),

    join_constraint: ($) =>
      choice(
        seq(keyword('ON'), field('condition', $._expression)),
        seq(keyword('USING'), $.column_list, optional(seq(keyword('AS'), field('alias', $._identifier))))
      ),

    _table_ref: ($) =>
      choice(
        $.table,
        $.table_function,
        $.rows_from_table,
        $.subquery_table,
        $.xmltable_expression,
        $.json_table_expression,
        $.join_table
      ),

    table: ($) => seq($._relation_expr, optional($._table_alias), optional($.tablesample_clause)),

    tablesample_clause: ($) =>
      seq(
        keyword('TABLESAMPLE'),
        field('method', $._func_name),
        parens(commaSep($._expression)),
        optional(seq(keyword('REPEATABLE'), parens($._expression)))
      ),

    table_function: ($) =>
      seq(
        optional(keyword('LATERAL')),
        $._table_func_invocation,
        optional(keywords('WITH ORDINALITY')),
        optional($._func_table_alias)
      ),

    _table_func_invocation: ($) => choice($.function_call, $.unnest_expression),

    unnest_expression: ($) => seq(keyword('UNNEST'), parens(commaSep1($._expression))),

    rows_from_table: ($) =>
      seq(
        optional(keyword('LATERAL')),
        keywords('ROWS FROM'),
        parens(
          commaSep1(seq($._table_func_invocation, optional(seq(keyword('AS'), parens(commaSep1($.table_func_column))))))
        ),
        optional(keywords('WITH ORDINALITY')),
        optional($._table_alias)
      ),

    table_func_column: ($) => seq(field('name', $._identifier), field('type', $.type_name), optional($.collate_clause)),

    subquery_table: ($) => seq(optional(keyword('LATERAL')), parens($._preparable_statement), optional($._table_alias)),

    join_table: ($) => seq(parens($._join_list), optional($._table_alias)),

    _table_alias: ($) => seq(optional(keyword('AS')), field('alias', $._identifier), optional($.column_list)),

    _func_table_alias: ($) =>
      choice(
        seq(keyword('AS'), parens(commaSep1($.table_func_column))),
        seq(
          optional(keyword('AS')),
          field('alias', $._identifier),
          optional(parens(commaSep1(seq($._identifier, optional(seq($.type_name, optional($.collate_clause)))))))
        )
      ),

    where_clause: ($) =>
      seq(
        keyword('WHERE'),
        choice(field('condition', $._expression), seq(keywords('CURRENT OF'), field('cursor', $._identifier)))
      ),

    group_by_clause: ($) =>
      seq(keywords('GROUP BY'), optional(choice(keyword('ALL'), keyword('DISTINCT'))), commaSep1($._grouping_element)),

    _grouping_element: ($) =>
      choice(
        $._expression,
        seq(choice(keyword('ROLLUP'), keyword('CUBE')), parens(commaSep1($._expression))),
        seq(keywords('GROUPING SETS'), parens(commaSep1($._grouping_element)))
      ),

    having_clause: ($) => seq(keyword('HAVING'), field('condition', $._expression)),

    window_clause: ($) => seq(keyword('WINDOW'), commaSep1($.named_window)),

    named_window: ($) => seq(field('name', $._identifier), keyword('AS'), parens(optional($.window_definition))),

    window_definition: ($) =>
      choice(seq(field('base', $._identifier), optional($._window_specification)), $._window_specification),

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
        choice($.frame_bound, seq(keyword('BETWEEN'), $.frame_bound, keyword('AND'), $.frame_bound)),
        optional($.frame_exclusion)
      ),

    frame_bound: ($) =>
      choice(
        keywords('UNBOUNDED PRECEDING'),
        keywords('UNBOUNDED FOLLOWING'),
        keywords('CURRENT ROW'),
        seq($._expression, choice(keyword('PRECEDING'), keyword('FOLLOWING')))
      ),

    frame_exclusion: () =>
      seq(
        keyword('EXCLUDE'),
        choice(keywords('CURRENT ROW'), keyword('GROUP'), keyword('TIES'), keywords('NO OTHERS'))
      ),

    order_by_clause: ($) => seq(keywords('ORDER BY'), commaSep1($.ordering_term)),

    ordering_term: ($) =>
      seq(
        field('value', $._expression),
        optional(choice(keyword('ASC'), keyword('DESC'), seq(keyword('USING'), $._any_operator))),
        optional(choice(keywords('NULLS FIRST'), keywords('NULLS LAST')))
      ),

    limit_clause: ($) => seq(keyword('LIMIT'), field('limit', choice($._expression, keyword('ALL')))),

    offset_clause: ($) =>
      seq(keyword('OFFSET'), field('offset', $._expression), optional(choice(keyword('ROW'), keyword('ROWS')))),

    fetch_clause: ($) =>
      seq(
        keyword('FETCH'),
        choice(keyword('FIRST'), keyword('NEXT')),
        optional(field('count', $._expression)),
        choice(keyword('ROW'), keyword('ROWS')),
        choice(keyword('ONLY'), keywords('WITH TIES'))
      ),

    locking_clause: ($) =>
      seq(
        keyword('FOR'),
        choice(keyword('UPDATE'), keywords('NO KEY UPDATE'), keyword('SHARE'), keywords('KEY SHARE')),
        optional(seq(keyword('OF'), commaSep1($.qualified_name))),
        optional(choice(keyword('NOWAIT'), keywords('SKIP LOCKED')))
      ),

    // =========================================================================
    // DML (`INSERT`, `UPDATE`, `DELETE`, `MERGE`)
    // =========================================================================

    insert_statement: ($) =>
      seq(
        optional($.with_clause),
        keywords('INSERT INTO'),
        field('table', $.qualified_name),
        optional(seq(keyword('AS'), field('alias', $._identifier))),
        optional($.column_list),
        optional($.overriding_clause),
        choice($.select_statement, keywords('DEFAULT VALUES')),
        optional($.on_conflict_clause),
        optional($.returning_clause)
      ),

    overriding_clause: () => seq(keyword('OVERRIDING'), choice(keyword('SYSTEM'), keyword('USER')), keyword('VALUE')),

    on_conflict_clause: ($) =>
      seq(
        keywords('ON CONFLICT'),
        optional($.conflict_target),
        keyword('DO'),
        choice(keyword('NOTHING'), seq(keyword('UPDATE'), $.set_clause, optional($.where_clause)))
      ),

    conflict_target: ($) =>
      choice(
        seq(parens(commaSep1($.index_element)), optional($.where_clause)),
        seq(keywords('ON CONSTRAINT'), field('constraint', $._identifier))
      ),

    update_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('UPDATE'),
        $._relation_expr,
        optional(seq(optional(keyword('AS')), field('alias', $._identifier))),
        $.set_clause,
        optional($.from_clause),
        optional($.where_clause),
        optional($.returning_clause)
      ),

    set_clause: ($) => seq(keyword('SET'), commaSep1($.assignment)),

    assignment: ($) =>
      choice(
        seq(field('left', $._assignment_target), '=', field('right', choice($._expression, keyword('DEFAULT')))),
        seq(
          field('left', parens(commaSep1($._assignment_target))),
          '=',
          field(
            'right',
            choice(
              seq(optional(keyword('ROW')), parens(commaSep1(choice($._expression, keyword('DEFAULT'))))),
              $.subquery
            )
          )
        )
      ),

    _assignment_target: ($) =>
      seq(
        $._identifier,
        repeat(choice(seq('.', $._identifier), seq('[', $._expression, optional(seq(':', $._expression)), ']')))
      ),

    delete_statement: ($) =>
      seq(
        optional($.with_clause),
        keywords('DELETE FROM'),
        $._relation_expr,
        optional(seq(optional(keyword('AS')), field('alias', $._identifier))),
        optional(seq(keyword('USING'), $._join_list)),
        optional($.where_clause),
        optional($.returning_clause)
      ),

    merge_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('MERGE'),
        optional(keyword('INTO')),
        $._relation_expr,
        optional(seq(optional(keyword('AS')), field('alias', $._identifier))),
        keyword('USING'),
        field('source', $._table_ref),
        keyword('ON'),
        field('condition', $._expression),
        repeat1($.merge_when_clause),
        optional($.returning_clause)
      ),

    merge_when_clause: ($) =>
      seq(
        keyword('WHEN'),
        choice(
          seq(
            choice(keyword('MATCHED'), keywords('NOT MATCHED BY SOURCE')),
            optional(seq(keyword('AND'), $._expression)),
            keyword('THEN'),
            choice(seq(keyword('UPDATE'), $.set_clause), keyword('DELETE'), keywords('DO NOTHING'))
          ),
          seq(
            keywords('NOT MATCHED'),
            optional(keywords('BY TARGET')),
            optional(seq(keyword('AND'), $._expression)),
            keyword('THEN'),
            choice(
              seq(
                keyword('INSERT'),
                optional($.column_list),
                optional($.overriding_clause),
                choice(seq(keyword('VALUES'), $.row), keywords('DEFAULT VALUES'))
              ),
              keywords('DO NOTHING')
            )
          )
        )
      ),

    returning_clause: ($) =>
      seq(
        keyword('RETURNING'),
        optional(
          seq(
            keyword('WITH'),
            parens(commaSep1(seq(choice(keyword('OLD'), keyword('NEW')), keyword('AS'), $._identifier)))
          )
        ),
        $._target_list
      ),

    column_list: ($) => parens(commaSep1($._identifier)),

    // =========================================================================
    // DDL: Tables, Constraints, Indexes, Sequences, Views, Schemas, Types
    // =========================================================================

    temporary: () =>
      seq(optional(choice(keyword('GLOBAL'), keyword('LOCAL'))), choice(keyword('TEMP'), keyword('TEMPORARY'))),

    if_not_exists: () => keywords('IF NOT EXISTS'),

    if_exists: () => keywords('IF EXISTS'),

    create_table_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice($.temporary, keyword('UNLOGGED'))),
        keyword('TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        choice(
          seq(
            parens(commaSep($._table_element)),
            optional(seq(keyword('INHERITS'), parens(commaSep1($.qualified_name)))),
            optional($.partition_by_spec),
            repeat($._table_tail_option)
          ),
          seq(
            keyword('OF'),
            $.qualified_name,
            optional(parens(commaSep($._typed_table_element))),
            optional($.partition_by_spec),
            repeat($._table_tail_option)
          ),
          seq(
            keywords('PARTITION OF'),
            field('parent', $.qualified_name),
            optional(parens(commaSep($._typed_table_element))),
            $.partition_bound_spec,
            optional($.partition_by_spec),
            repeat($._table_tail_option)
          ),
          seq(
            optional($.column_list),
            repeat($._table_tail_option),
            keyword('AS'),
            choice($.select_statement, $.execute_statement),
            optional($._with_data_clause)
          )
        )
      ),

    _table_tail_option: ($) =>
      choice(
        seq(keyword('USING'), $._identifier),
        $.storage_parameters,
        keywords('WITHOUT OIDS'),
        seq(keywords('ON COMMIT'), choice(keywords('PRESERVE ROWS'), keywords('DELETE ROWS'), keyword('DROP'))),
        seq(keyword('TABLESPACE'), $._identifier)
      ),

    storage_parameters: ($) => seq(keyword('WITH'), parens(commaSep1($._reloption_elem))),

    _reloption_elem: ($) => seq($._col_label, optional(seq('.', $._col_label)), optional(seq('=', $._def_arg))),

    _def_arg: ($) =>
      choice(
        $._term,
        alias($._signed_numeric_literal, $.unary_expression),
        $.type_name,
        $._any_operator,
        keyword('NONE'),
        keyword('ALL'),
        keyword('DEFAULT'),
        keyword('ON'),
        keyword('OFF')
      ),

    _with_data_clause: () => seq(keyword('WITH'), optional(keyword('NO')), keyword('DATA')),

    partition_by_spec: ($) =>
      seq(
        keywords('PARTITION BY'),
        choice(keyword('RANGE'), keyword('LIST'), keyword('HASH')),
        parens(commaSep1($.index_element))
      ),

    partition_bound_spec: ($) =>
      choice(
        keyword('DEFAULT'),
        seq(
          keywords('FOR VALUES'),
          choice(
            seq(keyword('IN'), parens(commaSep1($._expression))),
            seq(
              keyword('FROM'),
              parens(commaSep1($._partition_range_datum)),
              keyword('TO'),
              parens(commaSep1($._partition_range_datum))
            ),
            seq(
              keyword('WITH'),
              parens(seq(keyword('MODULUS'), $.numeric_literal, ',', keyword('REMAINDER'), $.numeric_literal))
            )
          )
        )
      ),

    _partition_range_datum: ($) => choice(keyword('MINVALUE'), keyword('MAXVALUE'), $._expression),

    _table_element: ($) => choice($.column_definition, $._table_constraint, $.table_like_clause),

    _typed_table_element: ($) =>
      choice(
        seq(
          field('name', $._identifier),
          optional(keywords('WITH OPTIONS')),
          repeat(choice($._column_constraint, $._constraint_attribute))
        ),
        $._table_constraint
      ),

    table_like_clause: ($) =>
      seq(
        keyword('LIKE'),
        $.qualified_name,
        repeat(
          seq(
            choice(keyword('INCLUDING'), keyword('EXCLUDING')),
            choice(
              keyword('COMMENTS'),
              keyword('COMPRESSION'),
              keyword('CONSTRAINTS'),
              keyword('DEFAULTS'),
              keyword('GENERATED'),
              keyword('IDENTITY'),
              keyword('INDEXES'),
              keyword('STATISTICS'),
              keyword('STORAGE'),
              keyword('ALL')
            )
          )
        )
      ),

    column_definition: ($) =>
      seq(
        field('name', $._identifier),
        field('type', $.type_name),
        repeat(
          choice(
            seq(keyword('COMPRESSION'), choice($._identifier, keyword('DEFAULT'))),
            seq(keyword('STORAGE'), choice($._identifier, keyword('DEFAULT'))),
            $.collate_clause,
            $._foreign_options_clause,
            $._column_constraint,
            $._constraint_attribute
          )
        )
      ),

    collate_clause: ($) => seq(keyword('COLLATE'), field('collation', $.qualified_name)),

    _column_constraint: ($) =>
      seq(
        optional($.constraint_name),
        choice(
          $.null_constraint,
          $.not_null_constraint,
          $.default_constraint,
          $.generated_identity_constraint,
          $.generated_column_constraint,
          $.check_constraint,
          $.unique_constraint,
          $.primary_key_constraint,
          $.foreign_key_clause
        )
      ),

    constraint_name: ($) => seq(keyword('CONSTRAINT'), field('name', $._identifier)),

    _constraint_attribute: () =>
      choice(
        seq(optional(keyword('NOT')), keyword('DEFERRABLE')),
        seq(keyword('INITIALLY'), choice(keyword('DEFERRED'), keyword('IMMEDIATE'))),
        seq(optional(keyword('NOT')), keyword('ENFORCED')),
        seq(optional(keyword('NOT')), keyword('VALID')),
        keywords('NO INHERIT')
      ),

    null_constraint: () => keyword('NULL'),

    not_null_constraint: () => keywords('NOT NULL'),

    default_constraint: ($) => prec.left(PREC.ESCAPE, seq(keyword('DEFAULT'), field('value', $._expression))),

    generated_identity_constraint: ($) =>
      seq(
        keyword('GENERATED'),
        choice(keyword('ALWAYS'), keywords('BY DEFAULT')),
        keywords('AS IDENTITY'),
        optional(parens(repeat1($._sequence_option)))
      ),

    generated_column_constraint: ($) =>
      seq(
        keywords('GENERATED ALWAYS AS'),
        parens($._expression),
        optional(choice(keyword('STORED'), keyword('VIRTUAL')))
      ),

    check_constraint: ($) => seq(keyword('CHECK'), parens($._expression)),

    unique_constraint: ($) =>
      seq(
        keyword('UNIQUE'),
        optional(seq(keyword('NULLS'), optional(keyword('NOT')), keyword('DISTINCT'))),
        optional($._index_parameters)
      ),

    primary_key_constraint: ($) => seq(keywords('PRIMARY KEY'), optional($._index_parameters)),

    _index_parameters: ($) =>
      repeat1(
        choice(
          seq(keyword('INCLUDE'), $.column_list),
          $.storage_parameters,
          seq(keywords('USING INDEX TABLESPACE'), $._identifier)
        )
      ),

    foreign_key_clause: ($) =>
      seq(
        keyword('REFERENCES'),
        field('table', $.qualified_name),
        optional(parens(commaSep1($._fk_column))),
        repeat(choice($.foreign_key_match, $.foreign_key_action))
      ),

    _fk_column: ($) => seq(optional(keyword('PERIOD')), $._identifier),

    foreign_key_match: () => seq(keyword('MATCH'), choice(keyword('FULL'), keyword('PARTIAL'), keyword('SIMPLE'))),

    foreign_key_action: ($) =>
      seq(
        keyword('ON'),
        choice(keyword('DELETE'), keyword('UPDATE')),
        choice(
          keywords('NO ACTION'),
          keyword('RESTRICT'),
          keyword('CASCADE'),
          seq(keyword('SET'), choice(keyword('NULL'), keyword('DEFAULT')), optional($.column_list))
        )
      ),

    _table_constraint: ($) =>
      seq(
        optional($.constraint_name),
        choice(
          $.check_constraint,
          alias($._table_unique_constraint, $.unique_constraint),
          alias($._table_primary_key_constraint, $.primary_key_constraint),
          $.exclude_constraint,
          $.foreign_key_constraint,
          alias($._table_not_null_constraint, $.not_null_constraint)
        ),
        repeat($._constraint_attribute)
      ),

    _table_not_null_constraint: ($) => seq(keywords('NOT NULL'), $._identifier),

    _table_unique_constraint: ($) =>
      choice(
        seq(
          keyword('UNIQUE'),
          optional(seq(keyword('NULLS'), optional(keyword('NOT')), keyword('DISTINCT'))),
          parens(commaSep1($._key_column_elem)),
          optional($._index_parameters)
        ),
        seq(keyword('UNIQUE'), keywords('USING INDEX'), $._identifier)
      ),

    _table_primary_key_constraint: ($) =>
      choice(
        seq(keywords('PRIMARY KEY'), parens(commaSep1($._key_column_elem)), optional($._index_parameters)),
        seq(keywords('PRIMARY KEY'), keywords('USING INDEX'), $._identifier)
      ),

    _key_column_elem: ($) => seq($._identifier, optional(keywords('WITHOUT OVERLAPS'))),

    exclude_constraint: ($) =>
      seq(
        keyword('EXCLUDE'),
        optional(seq(keyword('USING'), $._identifier)),
        parens(commaSep1(seq($.index_element, keyword('WITH'), $._any_operator))),
        optional($._index_parameters),
        optional(seq(keyword('WHERE'), parens($._expression)))
      ),

    foreign_key_constraint: ($) => seq(keywords('FOREIGN KEY'), parens(commaSep1($._fk_column)), $.foreign_key_clause),

    // ALTER TABLE / ALTER FOREIGN TABLE

    alter_table_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional(keyword('FOREIGN')),
        keyword('TABLE'),
        optional($.if_exists),
        $._relation_expr,
        choice(
          seq(keyword('RENAME'), optional(keyword('COLUMN')), $._identifier, keyword('TO'), $._identifier),
          seq(keywords('RENAME CONSTRAINT'), $._identifier, keyword('TO'), $._identifier),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(
            keywords('ALL IN TABLESPACE'),
            $._identifier,
            optional(seq(keywords('OWNED BY'), commaSep1($._role_spec))),
            keywords('SET TABLESPACE'),
            $._identifier,
            optional(keyword('NOWAIT'))
          ),
          seq(keywords('ATTACH PARTITION'), $.qualified_name, $.partition_bound_spec),
          seq(
            keywords('DETACH PARTITION'),
            $.qualified_name,
            optional(choice(keyword('CONCURRENTLY'), keyword('FINALIZE')))
          ),
          commaSep1($._alter_table_cmd)
        )
      ),

    _alter_table_cmd: ($) =>
      choice(
        seq(keyword('ADD'), optional(keyword('COLUMN')), optional($.if_not_exists), $.column_definition),
        seq(
          keyword('DROP'),
          optional(keyword('COLUMN')),
          optional($.if_exists),
          $._identifier,
          optional($._drop_behavior)
        ),
        seq(
          keyword('ALTER'),
          optional(keyword('COLUMN')),
          $._identifier,
          choice(
            seq(
              optional(keywords('SET DATA')),
              keyword('TYPE'),
              $.type_name,
              optional($.collate_clause),
              optional(seq(keyword('USING'), $._expression))
            ),
            seq(keywords('SET DEFAULT'), $._expression),
            keywords('DROP DEFAULT'),
            seq(choice(keyword('SET'), keyword('DROP')), keywords('NOT NULL')),
            seq(keywords('DROP EXPRESSION'), optional($.if_exists)),
            seq(keywords('SET EXPRESSION AS'), parens($._expression)),
            seq(keyword('ADD'), $.generated_identity_constraint),
            seq(
              repeat1(
                choice(
                  seq(keywords('SET GENERATED'), choice(keyword('ALWAYS'), keywords('BY DEFAULT'))),
                  seq(keyword('SET'), $._sequence_option),
                  seq(keyword('RESTART'), optional(seq(optional(keyword('WITH')), $.numeric_literal)))
                )
              )
            ),
            seq(keywords('DROP IDENTITY'), optional($.if_exists)),
            seq(keywords('SET STATISTICS'), $._signed_integer),
            seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
            seq(keyword('RESET'), parens(commaSep1($._col_label))),
            seq(keywords('SET STORAGE'), choice($._identifier, keyword('DEFAULT'))),
            seq(keywords('SET COMPRESSION'), choice($._identifier, keyword('DEFAULT'))),
            $._foreign_options_clause
          )
        ),
        seq(keyword('ADD'), $._table_constraint),
        seq(keywords('ALTER CONSTRAINT'), $._identifier, repeat1($._constraint_attribute)),
        seq(keywords('VALIDATE CONSTRAINT'), $._identifier),
        seq(keywords('DROP CONSTRAINT'), optional($.if_exists), $._identifier, optional($._drop_behavior)),
        seq(
          choice(keyword('DISABLE'), keyword('ENABLE')),
          optional(choice(keyword('REPLICA'), keyword('ALWAYS'))),
          choice(
            seq(keyword('TRIGGER'), optional(choice($._identifier, keyword('ALL'), keyword('USER')))),
            seq(keyword('RULE'), $._identifier)
          )
        ),
        seq(
          choice(keyword('DISABLE'), keyword('ENABLE'), keyword('FORCE'), keywords('NO FORCE')),
          keywords('ROW LEVEL SECURITY')
        ),
        seq(keywords('CLUSTER ON'), $._identifier),
        keywords('SET WITHOUT CLUSTER'),
        keywords('SET WITHOUT OIDS'),
        seq(keywords('SET ACCESS METHOD'), choice($._identifier, keyword('DEFAULT'))),
        seq(keywords('SET TABLESPACE'), $._identifier, optional(keyword('NOWAIT'))),
        seq(keyword('SET'), choice(keyword('LOGGED'), keyword('UNLOGGED'))),
        seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
        $.storage_parameters,
        seq(keyword('RESET'), parens(commaSep1($._col_label))),
        seq(optional(keyword('NO')), keyword('INHERIT'), $.qualified_name),
        seq(keyword('OF'), $.qualified_name),
        keywords('NOT OF'),
        seq(keywords('OWNER TO'), $._role_spec),
        seq(
          keywords('REPLICA IDENTITY'),
          choice(keyword('DEFAULT'), seq(keywords('USING INDEX'), $._identifier), keyword('FULL'), keyword('NOTHING'))
        ),
        $._foreign_options_clause
      ),

    _drop_behavior: () => choice(keyword('CASCADE'), keyword('RESTRICT')),

    _role_spec: ($) =>
      choice(
        $._identifier,
        keyword('CURRENT_ROLE'),
        keyword('CURRENT_USER'),
        keyword('SESSION_USER'),
        keyword('PUBLIC')
      ),

    // INDEX

    create_index_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('UNIQUE')),
        keyword('INDEX'),
        optional(keyword('CONCURRENTLY')),
        optional($.if_not_exists),
        optional(field('name', $._identifier)),
        keyword('ON'),
        optional(keyword('ONLY')),
        field('table', $.qualified_name),
        optional(seq(keyword('USING'), $._identifier)),
        parens(commaSep1($.index_element)),
        optional(seq(keyword('INCLUDE'), $.column_list)),
        optional(seq(keyword('NULLS'), optional(keyword('NOT')), keyword('DISTINCT'))),
        optional($.storage_parameters),
        optional(seq(keyword('TABLESPACE'), $._identifier)),
        optional($.where_clause)
      ),

    index_element: ($) =>
      seq(
        choice(
          field('column', $._identifier),
          $.function_call,
          $.extract_expression,
          $.substring_expression,
          $.trim_expression,
          $.position_expression,
          $.overlay_expression,
          $.normalize_expression,
          parens($._expression)
        ),
        optional($.collate_clause),
        optional(seq($.qualified_name, optional(parens(commaSep1(seq($._col_label, '=', $._def_arg)))))),
        optional(choice(keyword('ASC'), keyword('DESC'))),
        optional(choice(keywords('NULLS FIRST'), keywords('NULLS LAST')))
      ),

    alter_index_statement: ($) =>
      seq(
        keywords('ALTER INDEX'),
        choice(
          seq(
            optional($.if_exists),
            $.qualified_name,
            choice(
              seq(keywords('RENAME TO'), $._identifier),
              seq(keywords('SET TABLESPACE'), $._identifier),
              seq(keywords('ATTACH PARTITION'), $.qualified_name),
              seq(optional(keyword('NO')), keywords('DEPENDS ON EXTENSION'), $._identifier),
              seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
              $.storage_parameters,
              seq(keyword('RESET'), parens(commaSep1($._col_label))),
              seq(
                keyword('ALTER'),
                optional(keyword('COLUMN')),
                $.numeric_literal,
                keywords('SET STATISTICS'),
                $._signed_integer
              )
            )
          ),
          seq(
            keywords('ALL IN TABLESPACE'),
            $._identifier,
            optional(seq(keywords('OWNED BY'), commaSep1($._role_spec))),
            keywords('SET TABLESPACE'),
            $._identifier,
            optional(keyword('NOWAIT'))
          )
        )
      ),

    // SEQUENCE

    create_sequence_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice($.temporary, keyword('UNLOGGED'))),
        keyword('SEQUENCE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        repeat($._sequence_option)
      ),

    _sequence_option: ($) =>
      choice(
        seq(keyword('AS'), $.type_name),
        seq(keyword('INCREMENT'), optional(keyword('BY')), $._signed_integer),
        seq(keyword('MINVALUE'), $._signed_integer),
        keywords('NO MINVALUE'),
        seq(keyword('MAXVALUE'), $._signed_integer),
        keywords('NO MAXVALUE'),
        seq(keyword('START'), optional(keyword('WITH')), $._signed_integer),
        seq(keyword('CACHE'), $._signed_integer),
        seq(optional(keyword('NO')), keyword('CYCLE')),
        seq(keywords('OWNED BY'), $.column_reference),
        seq(keywords('SEQUENCE NAME'), $.qualified_name),
        keyword('LOGGED'),
        keyword('UNLOGGED')
      ),

    alter_sequence_statement: ($) =>
      seq(
        keywords('ALTER SEQUENCE'),
        optional($.if_exists),
        $.qualified_name,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(keyword('SET'), choice(keyword('LOGGED'), keyword('UNLOGGED'))),
          repeat1(
            choice(
              $._sequence_option,
              seq(keyword('RESTART'), optional(seq(optional(keyword('WITH')), $._signed_integer)))
            )
          )
        )
      ),

    // VIEW & MATERIALIZED VIEW

    create_view_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        optional(choice($.temporary, keyword('RECURSIVE'), keyword('MATERIALIZED'))),
        keyword('VIEW'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        optional($.column_list),
        optional(seq(keyword('USING'), $._identifier)),
        optional($.storage_parameters),
        optional(seq(keyword('TABLESPACE'), $._identifier)),
        keyword('AS'),
        $.select_statement,
        optional(
          choice(
            seq(keyword('WITH'), optional(choice(keyword('CASCADED'), keyword('LOCAL'))), keywords('CHECK OPTION')),
            $._with_data_clause
          )
        )
      ),

    refresh_materialized_view_statement: ($) =>
      seq(
        keywords('REFRESH MATERIALIZED VIEW'),
        optional(keyword('CONCURRENTLY')),
        $.qualified_name,
        optional($._with_data_clause)
      ),

    alter_view_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional(keyword('MATERIALIZED')),
        keyword('VIEW'),
        choice(
          seq(
            optional($.if_exists),
            $.qualified_name,
            choice(
              seq(
                keyword('ALTER'),
                optional(keyword('COLUMN')),
                $._identifier,
                choice(seq(keywords('SET DEFAULT'), $._expression), keywords('DROP DEFAULT'))
              ),
              seq(keywords('OWNER TO'), $._role_spec),
              seq(keyword('RENAME'), optional(keyword('COLUMN')), $._identifier, keyword('TO'), $._identifier),
              seq(keywords('RENAME TO'), $._identifier),
              seq(keywords('SET SCHEMA'), $._identifier),
              seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
              $.storage_parameters,
              seq(keyword('RESET'), parens(commaSep1($._col_label))),
              seq(keywords('CLUSTER ON'), $._identifier),
              keywords('SET WITHOUT CLUSTER'),
              seq(keywords('SET ACCESS METHOD'), choice($._identifier, keyword('DEFAULT'))),
              seq(keywords('SET TABLESPACE'), $._identifier, optional(keyword('NOWAIT'))),
              seq(optional(keyword('NO')), keywords('DEPENDS ON EXTENSION'), $._identifier)
            )
          ),
          seq(
            keywords('ALL IN TABLESPACE'),
            $._identifier,
            optional(seq(keywords('OWNED BY'), commaSep1($._role_spec))),
            keywords('SET TABLESPACE'),
            $._identifier,
            optional(keyword('NOWAIT'))
          )
        )
      ),

    // SCHEMA

    create_schema_statement: ($) =>
      prec.right(
        seq(
          keywords('CREATE SCHEMA'),
          optional($.if_not_exists),
          choice(
            seq(field('name', $._identifier), optional(seq(keyword('AUTHORIZATION'), $._role_spec))),
            seq(keyword('AUTHORIZATION'), $._role_spec)
          ),
          repeat(
            choice(
              $.create_table_statement,
              $.create_view_statement,
              $.create_index_statement,
              $.create_sequence_statement,
              $.create_trigger_statement,
              $.grant_statement
            )
          )
        )
      ),

    alter_schema_statement: ($) =>
      seq(
        keywords('ALTER SCHEMA'),
        $._identifier,
        choice(seq(keywords('RENAME TO'), $._identifier), seq(keywords('OWNER TO'), $._role_spec))
      ),

    // TYPE & DOMAIN

    create_type_statement: ($) =>
      seq(
        keywords('CREATE TYPE'),
        field('name', $.qualified_name),
        optional(
          choice(
            seq(
              keyword('AS'),
              choice(
                parens(commaSep($.table_func_column)),
                seq(keyword('ENUM'), parens(commaSep($.string_literal))),
                seq(keyword('RANGE'), parens(commaSep1($._reloption_elem)))
              )
            ),
            parens(commaSep1($._reloption_elem))
          )
        )
      ),

    alter_type_statement: ($) =>
      seq(
        keywords('ALTER TYPE'),
        $.qualified_name,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(keywords('RENAME ATTRIBUTE'), $._identifier, keyword('TO'), $._identifier, optional($._drop_behavior)),
          seq(
            keywords('ADD VALUE'),
            optional($.if_not_exists),
            $.string_literal,
            optional(seq(choice(keyword('BEFORE'), keyword('AFTER')), $.string_literal))
          ),
          seq(keywords('RENAME VALUE'), $.string_literal, keyword('TO'), $.string_literal),
          seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
          commaSep1(
            choice(
              seq(keywords('ADD ATTRIBUTE'), $.table_func_column, optional($._drop_behavior)),
              seq(keywords('DROP ATTRIBUTE'), optional($.if_exists), $._identifier, optional($._drop_behavior)),
              seq(
                keywords('ALTER ATTRIBUTE'),
                $._identifier,
                optional(keywords('SET DATA')),
                keyword('TYPE'),
                $.type_name,
                optional($.collate_clause),
                optional($._drop_behavior)
              )
            )
          )
        )
      ),

    create_domain_statement: ($) =>
      seq(
        keywords('CREATE DOMAIN'),
        field('name', $.qualified_name),
        optional(keyword('AS')),
        field('type', $.type_name),
        repeat(
          choice(
            $.collate_clause,
            $.default_constraint,
            seq(optional($.constraint_name), choice($.null_constraint, $.not_null_constraint, $.check_constraint)),
            $._constraint_attribute
          )
        )
      ),

    alter_domain_statement: ($) =>
      seq(
        keywords('ALTER DOMAIN'),
        $.qualified_name,
        choice(
          seq(keywords('SET DEFAULT'), $._expression),
          keywords('DROP DEFAULT'),
          seq(choice(keyword('SET'), keyword('DROP')), keywords('NOT NULL')),
          seq(
            keyword('ADD'),
            optional($.constraint_name),
            choice($.not_null_constraint, $.check_constraint),
            repeat($._constraint_attribute)
          ),
          seq(keywords('DROP CONSTRAINT'), optional($.if_exists), $._identifier, optional($._drop_behavior)),
          seq(keywords('RENAME CONSTRAINT'), $._identifier, keyword('TO'), $._identifier),
          seq(keywords('VALIDATE CONSTRAINT'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    // EXTENSION

    create_extension_statement: ($) =>
      seq(
        keywords('CREATE EXTENSION'),
        optional($.if_not_exists),
        field('name', $._identifier),
        optional(keyword('WITH')),
        repeat(
          choice(
            seq(keyword('SCHEMA'), $._identifier),
            seq(keyword('VERSION'), choice($._identifier, $.string_literal)),
            keyword('CASCADE')
          )
        )
      ),

    alter_extension_statement: ($) =>
      seq(
        keywords('ALTER EXTENSION'),
        $._identifier,
        choice(
          seq(keyword('UPDATE'), optional(seq(keyword('TO'), choice($._identifier, $.string_literal)))),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(choice(keyword('ADD'), keyword('DROP')), $._extension_member_object)
        )
      ),

    _extension_member_object: ($) =>
      choice(
        seq(keywords('ACCESS METHOD'), $._identifier),
        seq(keyword('AGGREGATE'), $.qualified_name, $._aggregate_signature),
        seq(keyword('CAST'), parens(seq($.type_name, keyword('AS'), $.type_name))),
        seq(keyword('COLLATION'), $.qualified_name),
        seq(keyword('CONVERSION'), $.qualified_name),
        seq(keyword('DOMAIN'), $.qualified_name),
        seq(keywords('EVENT TRIGGER'), $._identifier),
        seq(keywords('FOREIGN DATA WRAPPER'), $._identifier),
        seq(keywords('FOREIGN TABLE'), $.qualified_name),
        seq(
          choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
          $.qualified_name,
          optional($._routine_arg_types)
        ),
        seq(optional(keyword('MATERIALIZED')), keyword('VIEW'), $.qualified_name),
        seq(
          keyword('OPERATOR'),
          $._any_operator,
          parens(seq(choice($.type_name, keyword('NONE')), ',', choice($.type_name, keyword('NONE'))))
        ),
        seq(keywords('OPERATOR CLASS'), $.qualified_name, keyword('USING'), $._identifier),
        seq(keywords('OPERATOR FAMILY'), $.qualified_name, keyword('USING'), $._identifier),
        seq(optional(keyword('PROCEDURAL')), keyword('LANGUAGE'), $._identifier),
        seq(keyword('SCHEMA'), $._identifier),
        seq(keyword('SEQUENCE'), $.qualified_name),
        seq(keyword('SERVER'), $._identifier),
        seq(keyword('TABLE'), $.qualified_name),
        seq(
          keywords('TEXT SEARCH'),
          choice(keyword('CONFIGURATION'), keyword('DICTIONARY'), keyword('PARSER'), keyword('TEMPLATE')),
          $.qualified_name
        ),
        seq(keywords('TRANSFORM FOR'), $.type_name, keyword('LANGUAGE'), $._identifier),
        seq(keyword('TYPE'), $.qualified_name)
      ),

    // FUNCTION / PROCEDURE / ROUTINE

    create_function_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        choice(keyword('FUNCTION'), keyword('PROCEDURE')),
        field('name', $.qualified_name),
        parens(commaSep($.function_parameter)),
        optional(
          seq(
            keyword('RETURNS'),
            choice(
              seq(keyword('TABLE'), parens(commaSep1($.table_func_column))),
              seq(optional(keyword('SETOF')), $.type_name)
            )
          )
        ),
        repeat($._routine_option),
        optional($.sql_function_body)
      ),

    function_parameter: ($) =>
      seq(
        optional(choice(keyword('IN'), keyword('OUT'), keyword('INOUT'), keyword('VARIADIC'))),
        choice(seq(field('name', $._identifier), field('type', $.type_name)), field('type', $.type_name)),
        optional(seq(choice(keyword('DEFAULT'), '='), $._expression))
      ),

    _routine_option: ($) =>
      choice(
        seq(keyword('LANGUAGE'), choice($._identifier, $.string_literal)),
        seq(keywords('TRANSFORM'), commaSep1(seq(keywords('FOR TYPE'), $.type_name))),
        keyword('WINDOW'),
        keyword('IMMUTABLE'),
        keyword('STABLE'),
        keyword('VOLATILE'),
        seq(optional(keyword('NOT')), keyword('LEAKPROOF')),
        keywords('CALLED ON NULL INPUT'),
        keywords('RETURNS NULL ON NULL INPUT'),
        keyword('STRICT'),
        seq(optional(keyword('EXTERNAL')), keyword('SECURITY'), choice(keyword('INVOKER'), keyword('DEFINER'))),
        seq(keyword('PARALLEL'), choice(keyword('UNSAFE'), keyword('RESTRICTED'), keyword('SAFE'))),
        seq(keyword('COST'), $.numeric_literal),
        seq(keyword('ROWS'), $.numeric_literal),
        seq(keyword('SUPPORT'), $.qualified_name),
        $.set_statement,
        seq(keyword('RESET'), choice($.qualified_name, keyword('ALL'))),
        seq(keyword('AS'), $.string_literal, optional(seq(',', $.string_literal)))
      ),

    sql_function_body: ($) =>
      choice(
        seq(keyword('RETURN'), $._expression),
        seq(
          keywords('BEGIN ATOMIC'),
          repeat(seq(choice($._preparable_statement, seq(keyword('RETURN'), $._expression)), ';')),
          keyword('END')
        )
      ),

    _routine_arg_types: ($) => parens(commaSep($.function_parameter)),

    alter_routine_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
        $.qualified_name,
        optional($._routine_arg_types),
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(optional(keyword('NO')), keywords('DEPENDS ON EXTENSION'), $._identifier),
          seq(repeat1($._routine_option), optional(keyword('RESTRICT')))
        )
      ),

    // TRIGGER & EVENT TRIGGER & RULE & POLICY

    create_trigger_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        optional(keyword('CONSTRAINT')),
        keyword('TRIGGER'),
        field('name', $._identifier),
        choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF')),
        $._trigger_events,
        keyword('ON'),
        field('table', $.qualified_name),
        optional(seq(keyword('FROM'), $.qualified_name)),
        repeat($._constraint_attribute),
        optional(
          seq(
            keyword('REFERENCING'),
            repeat1(
              seq(choice(keyword('OLD'), keyword('NEW')), keyword('TABLE'), optional(keyword('AS')), $._identifier)
            )
          )
        ),
        optional(seq(keyword('FOR'), optional(keyword('EACH')), choice(keyword('ROW'), keyword('STATEMENT')))),
        optional(seq(keyword('WHEN'), parens($._expression))),
        keyword('EXECUTE'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE')),
        $.qualified_name,
        parens(commaSep($._expression))
      ),

    _trigger_events: ($) => seq($._trigger_one_event, repeat(seq(keyword('OR'), $._trigger_one_event))),

    _trigger_one_event: ($) =>
      choice(
        keyword('INSERT'),
        keyword('DELETE'),
        keyword('TRUNCATE'),
        seq(keyword('UPDATE'), optional(seq(keyword('OF'), commaSep1($._identifier))))
      ),

    alter_trigger_statement: ($) =>
      seq(
        keywords('ALTER TRIGGER'),
        $._identifier,
        keyword('ON'),
        $.qualified_name,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(optional(keyword('NO')), keywords('DEPENDS ON EXTENSION'), $._identifier)
        )
      ),

    create_event_trigger_statement: ($) =>
      seq(
        keywords('CREATE EVENT TRIGGER'),
        field('name', $._identifier),
        keyword('ON'),
        $._identifier,
        optional(
          seq(keyword('WHEN'), commaSep1(seq($._identifier, keyword('IN'), parens(commaSep1($.string_literal)))))
        ),
        keyword('EXECUTE'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE')),
        $.qualified_name,
        seq('(', ')')
      ),

    alter_event_trigger_statement: ($) =>
      seq(
        keywords('ALTER EVENT TRIGGER'),
        $._identifier,
        choice(
          keyword('DISABLE'),
          seq(keyword('ENABLE'), optional(choice(keyword('REPLICA'), keyword('ALWAYS')))),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier)
        )
      ),

    create_rule_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        keyword('RULE'),
        field('name', $._identifier),
        keywords('AS ON'),
        choice(keyword('SELECT'), keyword('INSERT'), keyword('UPDATE'), keyword('DELETE')),
        keyword('TO'),
        $.qualified_name,
        optional($.where_clause),
        keyword('DO'),
        optional(choice(keyword('INSTEAD'), keyword('ALSO'))),
        choice(
          keyword('NOTHING'),
          $._rule_action,
          parens(seq(optional($._rule_action), repeat(seq(';', optional($._rule_action)))))
        )
      ),

    _rule_action: ($) =>
      choice($.select_statement, $.insert_statement, $.update_statement, $.delete_statement, $.notify_statement),

    alter_rule_statement: ($) =>
      seq(keywords('ALTER RULE'), $._identifier, keyword('ON'), $.qualified_name, keywords('RENAME TO'), $._identifier),

    create_policy_statement: ($) =>
      seq(
        keywords('CREATE POLICY'),
        field('name', $._identifier),
        keyword('ON'),
        $.qualified_name,
        optional(seq(keyword('AS'), choice(keyword('PERMISSIVE'), keyword('RESTRICTIVE')))),
        optional(
          seq(
            keyword('FOR'),
            choice(keyword('ALL'), keyword('SELECT'), keyword('INSERT'), keyword('UPDATE'), keyword('DELETE'))
          )
        ),
        optional(seq(keyword('TO'), commaSep1($._role_spec))),
        optional(seq(keyword('USING'), parens($._expression))),
        optional(seq(keywords('WITH CHECK'), parens($._expression)))
      ),

    alter_policy_statement: ($) =>
      seq(
        keywords('ALTER POLICY'),
        $._identifier,
        keyword('ON'),
        $.qualified_name,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          repeat1(
            choice(
              seq(keyword('TO'), commaSep1($._role_spec)),
              seq(keyword('USING'), parens($._expression)),
              seq(keywords('WITH CHECK'), parens($._expression))
            )
          )
        )
      ),

    // PUBLICATION & SUBSCRIPTION

    create_publication_statement: ($) =>
      seq(
        keywords('CREATE PUBLICATION'),
        field('name', $._identifier),
        optional(choice(keywords('FOR ALL TABLES'), seq(keyword('FOR'), commaSep1($._publication_obj_spec)))),
        optional($.storage_parameters)
      ),

    _publication_obj_spec: ($) =>
      choice(
        seq(
          keyword('TABLE'),
          $._relation_expr,
          optional($.column_list),
          optional(seq(keyword('WHERE'), parens($._expression)))
        ),
        seq(keywords('TABLES IN SCHEMA'), choice($._identifier, keyword('CURRENT_SCHEMA')))
      ),

    alter_publication_statement: ($) =>
      seq(
        keywords('ALTER PUBLICATION'),
        $._identifier,
        choice(
          seq(choice(keyword('ADD'), keyword('SET'), keyword('DROP')), commaSep1($._publication_obj_spec)),
          seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier)
        )
      ),

    create_subscription_statement: ($) =>
      seq(
        keywords('CREATE SUBSCRIPTION'),
        field('name', $._identifier),
        keyword('CONNECTION'),
        $.string_literal,
        keyword('PUBLICATION'),
        commaSep1($._identifier),
        optional($.storage_parameters)
      ),

    alter_subscription_statement: ($) =>
      seq(
        keywords('ALTER SUBSCRIPTION'),
        $._identifier,
        choice(
          seq(keyword('CONNECTION'), $.string_literal),
          seq(
            choice(keywords('SET PUBLICATION'), seq(choice(keyword('ADD'), keyword('DROP')), keyword('PUBLICATION'))),
            commaSep1($._identifier),
            optional($.storage_parameters)
          ),
          seq(keywords('REFRESH PUBLICATION'), optional($.storage_parameters)),
          keyword('ENABLE'),
          keyword('DISABLE'),
          seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
          seq(keyword('SKIP'), parens(commaSep1($._reloption_elem))),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier)
        )
      ),

    // ROLE / USER / GROUP / DATABASE / TABLESPACE / SYSTEM

    create_role_statement: ($) =>
      seq(
        keyword('CREATE'),
        choice(keyword('ROLE'), keyword('USER'), keyword('GROUP')),
        field('name', $._identifier),
        optional(keyword('WITH')),
        repeat($._role_option)
      ),

    _role_option: ($) =>
      choice(
        $._identifier,
        seq(keyword('ENCRYPTED'), keyword('PASSWORD'), $.string_literal),
        seq(keyword('PASSWORD'), choice($.string_literal, keyword('NULL'))),
        seq(keywords('VALID UNTIL'), $.string_literal),
        seq(keywords('CONNECTION LIMIT'), $._signed_integer),
        seq(keyword('SYSID'), $.numeric_literal),
        seq(keyword('IN'), choice(keyword('ROLE'), keyword('GROUP')), commaSep1($._role_spec)),
        seq(choice(keyword('ROLE'), keyword('GROUP'), keyword('ADMIN'), keyword('USER')), commaSep1($._role_spec))
      ),

    alter_role_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('ROLE'), keyword('USER'), keyword('GROUP')),
        choice($._role_spec, keyword('ALL')),
        optional(seq(keywords('IN DATABASE'), $._identifier)),
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(choice(keyword('ADD'), keyword('DROP')), keyword('USER'), commaSep1($._role_spec)),
          $.set_statement,
          seq(keyword('RESET'), choice($.qualified_name, keyword('ALL'))),
          seq(optional(keyword('WITH')), repeat1($._role_option))
        )
      ),

    create_database_statement: ($) =>
      seq(
        keywords('CREATE DATABASE'),
        field('name', $._identifier),
        optional(keyword('WITH')),
        repeat(
          choice(
            seq(keywords('CONNECTION LIMIT'), optional('='), $._signed_integer),
            seq(
              $._identifier,
              optional('='),
              choice(
                $._role_spec,
                $.string_literal,
                $._signed_integer,
                keyword('TRUE'),
                keyword('FALSE'),
                keyword('DEFAULT')
              )
            )
          )
        )
      ),

    alter_database_statement: ($) =>
      seq(
        keywords('ALTER DATABASE'),
        $._identifier,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET TABLESPACE'), $._identifier),
          keywords('REFRESH COLLATION VERSION'),
          $.set_statement,
          seq(keyword('RESET'), choice($.qualified_name, keyword('ALL'))),
          seq(
            optional(keyword('WITH')),
            repeat1(
              choice(
                seq(keywords('CONNECTION LIMIT'), optional('='), $._signed_integer),
                seq($._identifier, optional(choice(keyword('TRUE'), keyword('FALSE'), $.numeric_literal)))
              )
            )
          )
        )
      ),

    create_tablespace_statement: ($) =>
      seq(
        keywords('CREATE TABLESPACE'),
        field('name', $._identifier),
        optional(seq(keyword('OWNER'), $._role_spec)),
        keyword('LOCATION'),
        $.string_literal,
        optional($.storage_parameters)
      ),

    alter_tablespace_statement: ($) =>
      seq(
        keywords('ALTER TABLESPACE'),
        $._identifier,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
          seq(keyword('RESET'), parens(commaSep1($._col_label)))
        )
      ),

    alter_system_statement: ($) =>
      seq(
        keywords('ALTER SYSTEM'),
        choice($.set_statement, seq(keyword('RESET'), choice($.qualified_name, keyword('ALL'))))
      ),

    // FOREIGN DATA WRAPPER / SERVER / FOREIGN TABLE / USER MAPPING / IMPORT FOREIGN SCHEMA

    _foreign_options_clause: ($) =>
      seq(
        keyword('OPTIONS'),
        parens(
          commaSep1(
            seq(
              optional(choice(keyword('ADD'), keyword('SET'), keyword('DROP'))),
              $._col_label,
              optional($.string_literal)
            )
          )
        )
      ),

    create_foreign_data_wrapper_statement: ($) =>
      seq(
        keywords('CREATE FOREIGN DATA WRAPPER'),
        field('name', $._identifier),
        repeat(
          choice(
            seq(keyword('HANDLER'), $.qualified_name),
            keywords('NO HANDLER'),
            seq(keyword('VALIDATOR'), $.qualified_name),
            keywords('NO VALIDATOR'),
            $._foreign_options_clause
          )
        )
      ),

    alter_foreign_data_wrapper_statement: ($) =>
      seq(
        keywords('ALTER FOREIGN DATA WRAPPER'),
        $._identifier,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          repeat1(
            choice(
              seq(keyword('HANDLER'), $.qualified_name),
              keywords('NO HANDLER'),
              seq(keyword('VALIDATOR'), $.qualified_name),
              keywords('NO VALIDATOR'),
              $._foreign_options_clause
            )
          )
        )
      ),

    create_server_statement: ($) =>
      seq(
        keywords('CREATE SERVER'),
        optional($.if_not_exists),
        field('name', $._identifier),
        optional(seq(keyword('TYPE'), $.string_literal)),
        optional(seq(keyword('VERSION'), $.string_literal)),
        keywords('FOREIGN DATA WRAPPER'),
        $._identifier,
        optional($._foreign_options_clause)
      ),

    alter_server_statement: ($) =>
      seq(
        keywords('ALTER SERVER'),
        $._identifier,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq(optional(seq(keyword('VERSION'), $.string_literal)), optional($._foreign_options_clause))
        )
      ),

    create_foreign_table_statement: ($) =>
      seq(
        keywords('CREATE FOREIGN TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        choice(
          seq(
            parens(commaSep($._table_element)),
            optional(seq(keyword('INHERITS'), parens(commaSep1($.qualified_name))))
          ),
          seq(
            keywords('PARTITION OF'),
            $.qualified_name,
            optional(parens(commaSep($._typed_table_element))),
            $.partition_bound_spec
          )
        ),
        keyword('SERVER'),
        $._identifier,
        optional($._foreign_options_clause)
      ),

    create_user_mapping_statement: ($) =>
      seq(
        keywords('CREATE USER MAPPING'),
        optional($.if_not_exists),
        keyword('FOR'),
        choice($._role_spec, keyword('USER')),
        keyword('SERVER'),
        $._identifier,
        optional($._foreign_options_clause)
      ),

    alter_user_mapping_statement: ($) =>
      seq(
        keywords('ALTER USER MAPPING FOR'),
        choice($._role_spec, keyword('USER')),
        keyword('SERVER'),
        $._identifier,
        $._foreign_options_clause
      ),

    import_foreign_schema_statement: ($) =>
      seq(
        keywords('IMPORT FOREIGN SCHEMA'),
        $._identifier,
        optional(seq(choice(keywords('LIMIT TO'), keyword('EXCEPT')), parens(commaSep1($._identifier)))),
        keywords('FROM SERVER'),
        $._identifier,
        keyword('INTO'),
        $._identifier,
        optional($._foreign_options_clause)
      ),

    // AGGREGATE / OPERATOR / CAST / COLLATION / CONVERSION / TRANSFORM / ACCESS METHOD / TEXT SEARCH / STATISTICS

    _aggregate_signature: ($) =>
      parens(
        choice(
          '*',
          seq(commaSep1($._aggregate_arg), optional(seq(keywords('ORDER BY'), commaSep1($._aggregate_arg)))),
          seq(keywords('ORDER BY'), commaSep1($._aggregate_arg))
        )
      ),

    _aggregate_arg: ($) =>
      seq(
        optional(choice(keyword('IN'), keyword('VARIADIC'))),
        choice(seq(field('name', $._identifier), field('type', $.type_name)), field('type', $.type_name))
      ),

    create_aggregate_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        keyword('AGGREGATE'),
        field('name', $.qualified_name),
        optional($._aggregate_signature),
        parens(commaSep1(seq($._col_label, '=', $._def_arg)))
      ),

    alter_aggregate_statement: ($) =>
      seq(
        keywords('ALTER AGGREGATE'),
        $.qualified_name,
        $._aggregate_signature,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    create_operator_statement: ($) =>
      seq(keywords('CREATE OPERATOR'), $._any_operator, parens(commaSep1($._operator_def_elem))),

    _operator_def_elem: ($) => seq($._col_label, '=', choice($._any_operator, $.type_name, keyword('NONE'))),

    alter_operator_statement: ($) =>
      seq(
        keywords('ALTER OPERATOR'),
        $._any_operator,
        parens(seq(choice($.type_name, keyword('NONE')), ',', choice($.type_name, keyword('NONE')))),
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(keyword('SET'), parens(commaSep1($._operator_def_elem)))
        )
      ),

    create_operator_class_statement: ($) =>
      seq(
        keywords('CREATE OPERATOR CLASS'),
        $.qualified_name,
        optional(keyword('DEFAULT')),
        keywords('FOR TYPE'),
        $.type_name,
        keyword('USING'),
        $._identifier,
        optional(seq(keyword('FAMILY'), $.qualified_name)),
        keyword('AS'),
        commaSep1($._opclass_item)
      ),

    _opclass_item: ($) =>
      choice(
        seq(
          keyword('OPERATOR'),
          $.numeric_literal,
          $._any_operator,
          optional(parens(commaSep1($.type_name))),
          optional(choice(keywords('FOR SEARCH'), seq(keywords('FOR ORDER BY'), $.qualified_name)))
        ),
        seq(
          keyword('FUNCTION'),
          $.numeric_literal,
          optional(parens(commaSep1($.type_name))),
          $.qualified_name,
          optional($._routine_arg_types)
        ),
        seq(keyword('STORAGE'), $.type_name)
      ),

    alter_operator_class_statement: ($) =>
      seq(
        keywords('ALTER OPERATOR CLASS'),
        $.qualified_name,
        keyword('USING'),
        $._identifier,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    create_operator_family_statement: ($) =>
      seq(keywords('CREATE OPERATOR FAMILY'), $.qualified_name, keyword('USING'), $._identifier),

    alter_operator_family_statement: ($) =>
      seq(
        keywords('ALTER OPERATOR FAMILY'),
        $.qualified_name,
        keyword('USING'),
        $._identifier,
        choice(
          seq(choice(keyword('ADD'), keyword('DROP')), commaSep1($._opfamily_drop_or_add)),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    _opfamily_drop_or_add: ($) =>
      choice(
        $._opclass_item,
        seq(choice(keyword('OPERATOR'), keyword('FUNCTION')), $.numeric_literal, parens(commaSep1($.type_name)))
      ),

    create_cast_statement: ($) =>
      seq(
        keywords('CREATE CAST'),
        parens(seq($.type_name, keyword('AS'), $.type_name)),
        choice(
          seq(keywords('WITH FUNCTION'), $.qualified_name, optional($._routine_arg_types)),
          keywords('WITHOUT FUNCTION'),
          keywords('WITH INOUT')
        ),
        optional(choice(keywords('AS ASSIGNMENT'), keywords('AS IMPLICIT')))
      ),

    create_collation_statement: ($) =>
      seq(
        keywords('CREATE COLLATION'),
        optional($.if_not_exists),
        $.qualified_name,
        choice(seq(keyword('FROM'), $.qualified_name), parens(commaSep1($._reloption_elem)))
      ),

    alter_collation_statement: ($) =>
      seq(
        keywords('ALTER COLLATION'),
        $.qualified_name,
        choice(
          keywords('REFRESH VERSION'),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    create_conversion_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('DEFAULT')),
        keyword('CONVERSION'),
        $.qualified_name,
        keyword('FOR'),
        $.string_literal,
        keyword('TO'),
        $.string_literal,
        keyword('FROM'),
        $.qualified_name
      ),

    alter_conversion_statement: ($) =>
      seq(
        keywords('ALTER CONVERSION'),
        $.qualified_name,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    create_transform_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        keywords('TRANSFORM FOR'),
        $.type_name,
        keyword('LANGUAGE'),
        $._identifier,
        parens(
          commaSep1(
            choice(
              seq(keywords('FROM SQL WITH FUNCTION'), $.qualified_name, optional($._routine_arg_types)),
              seq(keywords('TO SQL WITH FUNCTION'), $.qualified_name, optional($._routine_arg_types))
            )
          )
        )
      ),

    create_access_method_statement: ($) =>
      seq(
        keywords('CREATE ACCESS METHOD'),
        $._identifier,
        keyword('TYPE'),
        choice(keyword('TABLE'), keyword('INDEX')),
        keyword('HANDLER'),
        $.qualified_name
      ),

    create_text_search_statement: ($) =>
      seq(
        keywords('CREATE TEXT SEARCH'),
        choice(keyword('CONFIGURATION'), keyword('DICTIONARY'), keyword('PARSER'), keyword('TEMPLATE')),
        $.qualified_name,
        parens(commaSep1($._reloption_elem))
      ),

    alter_text_search_statement: ($) =>
      seq(
        keywords('ALTER TEXT SEARCH'),
        choice(
          seq(
            keyword('CONFIGURATION'),
            $.qualified_name,
            choice(
              seq(
                choice(keywords('ADD MAPPING FOR'), keywords('ALTER MAPPING FOR')),
                commaSep1($._identifier),
                optional(seq(keyword('REPLACE'), $.qualified_name)),
                keyword('WITH'),
                commaSep1($.qualified_name)
              ),
              seq(keywords('ALTER MAPPING REPLACE'), $.qualified_name, keyword('WITH'), $.qualified_name),
              seq(keywords('DROP MAPPING'), optional($.if_exists), keyword('FOR'), commaSep1($._identifier)),
              seq(keywords('RENAME TO'), $._identifier),
              seq(keywords('OWNER TO'), $._role_spec),
              seq(keywords('SET SCHEMA'), $._identifier)
            )
          ),
          seq(
            keyword('DICTIONARY'),
            $.qualified_name,
            choice(
              parens(commaSep1($._reloption_elem)),
              seq(keywords('RENAME TO'), $._identifier),
              seq(keywords('OWNER TO'), $._role_spec),
              seq(keywords('SET SCHEMA'), $._identifier)
            )
          ),
          seq(
            choice(keyword('PARSER'), keyword('TEMPLATE')),
            $.qualified_name,
            choice(seq(keywords('RENAME TO'), $._identifier), seq(keywords('SET SCHEMA'), $._identifier))
          )
        )
      ),

    create_statistics_statement: ($) =>
      seq(
        keywords('CREATE STATISTICS'),
        optional($.if_not_exists),
        optional($.qualified_name),
        optional(parens(commaSep1($._identifier))),
        keyword('ON'),
        commaSep1(choice($._identifier, parens($._expression))),
        keyword('FROM'),
        $.qualified_name
      ),

    alter_statistics_statement: ($) =>
      seq(
        keywords('ALTER STATISTICS'),
        $.qualified_name,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(keywords('SET STATISTICS'), choice($._signed_integer, keyword('DEFAULT')))
        )
      ),

    // DROP

    drop_statement: ($) =>
      seq(
        keyword('DROP'),
        choice(
          seq(
            choice(
              keyword('TABLE'),
              keyword('SEQUENCE'),
              keyword('VIEW'),
              keywords('MATERIALIZED VIEW'),
              keywords('FOREIGN TABLE'),
              keyword('TYPE'),
              keyword('DOMAIN'),
              keyword('COLLATION'),
              keyword('CONVERSION'),
              keyword('STATISTICS'),
              seq(
                keywords('TEXT SEARCH'),
                choice(keyword('CONFIGURATION'), keyword('DICTIONARY'), keyword('PARSER'), keyword('TEMPLATE'))
              )
            ),
            optional($.if_exists),
            commaSep1($.qualified_name),
            optional($._drop_behavior)
          ),
          seq(
            keyword('INDEX'),
            optional(keyword('CONCURRENTLY')),
            optional($.if_exists),
            commaSep1($.qualified_name),
            optional($._drop_behavior)
          ),
          seq(
            choice(
              keyword('SCHEMA'),
              keyword('EXTENSION'),
              keyword('PUBLICATION'),
              keyword('SUBSCRIPTION'),
              keywords('FOREIGN DATA WRAPPER'),
              keyword('SERVER'),
              keywords('EVENT TRIGGER'),
              keywords('ACCESS METHOD'),
              seq(optional(keyword('PROCEDURAL')), keyword('LANGUAGE'))
            ),
            optional($.if_exists),
            commaSep1($._identifier),
            optional($._drop_behavior)
          ),
          seq(
            choice(keyword('ROLE'), keyword('USER'), keyword('GROUP'), keyword('TABLESPACE')),
            optional($.if_exists),
            commaSep1($._identifier)
          ),
          seq(
            keyword('DATABASE'),
            optional($.if_exists),
            $._identifier,
            optional(seq(optional(keyword('WITH')), parens(commaSep1(keyword('FORCE')))))
          ),
          seq(
            choice(keyword('TRIGGER'), keyword('RULE'), keyword('POLICY')),
            optional($.if_exists),
            $._identifier,
            keyword('ON'),
            $.qualified_name,
            optional($._drop_behavior)
          ),
          seq(
            choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
            optional($.if_exists),
            commaSep1(seq($.qualified_name, optional($._routine_arg_types))),
            optional($._drop_behavior)
          ),
          seq(
            keyword('AGGREGATE'),
            optional($.if_exists),
            commaSep1(seq($.qualified_name, $._aggregate_signature)),
            optional($._drop_behavior)
          ),
          seq(
            keyword('OPERATOR'),
            choice(
              seq(
                optional($.if_exists),
                commaSep1(
                  seq(
                    $._any_operator,
                    parens(seq(choice($.type_name, keyword('NONE')), ',', choice($.type_name, keyword('NONE'))))
                  )
                )
              ),
              seq(
                choice(keyword('CLASS'), keyword('FAMILY')),
                optional($.if_exists),
                $.qualified_name,
                keyword('USING'),
                $._identifier
              )
            ),
            optional($._drop_behavior)
          ),
          seq(
            keyword('CAST'),
            optional($.if_exists),
            parens(seq($.type_name, keyword('AS'), $.type_name)),
            optional($._drop_behavior)
          ),
          seq(
            keywords('TRANSFORM'),
            optional($.if_exists),
            keyword('FOR'),
            $.type_name,
            keyword('LANGUAGE'),
            $._identifier,
            optional($._drop_behavior)
          ),
          seq(
            keywords('USER MAPPING'),
            optional($.if_exists),
            keyword('FOR'),
            choice($._role_spec, keyword('USER')),
            keyword('SERVER'),
            $._identifier
          )
        )
      ),

    drop_owned_statement: ($) => seq(keywords('DROP OWNED BY'), commaSep1($._role_spec), optional($._drop_behavior)),

    reassign_owned_statement: ($) =>
      seq(keywords('REASSIGN OWNED BY'), commaSep1($._role_spec), keyword('TO'), $._role_spec),

    // COMMENT & SECURITY LABEL

    comment_statement: ($) =>
      seq(keywords('COMMENT ON'), $._object_target, keyword('IS'), choice($.string_literal, keyword('NULL'))),

    security_label_statement: ($) =>
      seq(
        keywords('SECURITY LABEL'),
        optional(seq(keyword('FOR'), choice($._identifier, $.string_literal))),
        keyword('ON'),
        $._object_target,
        keyword('IS'),
        choice($.string_literal, keyword('NULL'))
      ),

    _object_target: ($) =>
      choice(
        seq(keyword('COLUMN'), $.column_reference),
        seq(
          choice(
            keyword('TABLE'),
            keyword('SEQUENCE'),
            keyword('INDEX'),
            keyword('VIEW'),
            keywords('MATERIALIZED VIEW'),
            keywords('FOREIGN TABLE'),
            keyword('COLLATION'),
            keyword('CONVERSION'),
            keyword('DOMAIN'),
            keyword('STATISTICS'),
            keyword('TYPE'),
            seq(
              keywords('TEXT SEARCH'),
              choice(keyword('CONFIGURATION'), keyword('DICTIONARY'), keyword('PARSER'), keyword('TEMPLATE'))
            )
          ),
          $.qualified_name
        ),
        seq(
          choice(
            keyword('DATABASE'),
            keyword('EXTENSION'),
            keywords('EVENT TRIGGER'),
            keywords('FOREIGN DATA WRAPPER'),
            keyword('PUBLICATION'),
            keyword('ROLE'),
            keyword('SCHEMA'),
            keyword('SERVER'),
            keyword('SUBSCRIPTION'),
            keyword('TABLESPACE'),
            keywords('ACCESS METHOD'),
            seq(optional(keyword('PROCEDURAL')), keyword('LANGUAGE'))
          ),
          $._identifier
        ),
        seq(keywords('LARGE OBJECT'), $.numeric_literal),
        seq(
          choice(keyword('TRIGGER'), keyword('RULE'), keyword('POLICY')),
          $._identifier,
          keyword('ON'),
          $.qualified_name
        ),
        seq(keyword('CONSTRAINT'), $._identifier, keyword('ON'), optional(keyword('DOMAIN')), $.qualified_name),
        seq(
          choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
          $.qualified_name,
          optional($._routine_arg_types)
        ),
        seq(keyword('AGGREGATE'), $.qualified_name, $._aggregate_signature),
        seq(
          keyword('OPERATOR'),
          choice(
            seq(
              $._any_operator,
              parens(seq(choice($.type_name, keyword('NONE')), ',', choice($.type_name, keyword('NONE'))))
            ),
            seq(choice(keyword('CLASS'), keyword('FAMILY')), $.qualified_name, keyword('USING'), $._identifier)
          )
        ),
        seq(keyword('CAST'), parens(seq($.type_name, keyword('AS'), $.type_name))),
        seq(keywords('TRANSFORM FOR'), $.type_name, keyword('LANGUAGE'), $._identifier)
      ),

    // GRANT / REVOKE / ALTER DEFAULT PRIVILEGES

    grant_statement: ($) =>
      seq(
        keyword('GRANT'),
        choice(
          seq(
            $._privileges,
            keyword('ON'),
            $._privilege_target,
            keyword('TO'),
            commaSep1($._role_spec),
            optional(keywords('WITH GRANT OPTION')),
            optional(seq(keywords('GRANTED BY'), $._role_spec))
          ),
          seq(
            commaSep1($._identifier),
            keyword('TO'),
            commaSep1($._role_spec),
            optional(
              seq(
                keyword('WITH'),
                commaSep1(
                  seq(
                    choice(keyword('ADMIN'), keyword('INHERIT'), keyword('SET')),
                    choice(keyword('OPTION'), keyword('TRUE'), keyword('FALSE'))
                  )
                )
              )
            ),
            optional(seq(keywords('GRANTED BY'), $._role_spec))
          )
        )
      ),

    revoke_statement: ($) =>
      seq(
        keyword('REVOKE'),
        optional(
          choice(
            keywords('GRANT OPTION FOR'),
            seq(choice(keyword('ADMIN'), keyword('INHERIT'), keyword('SET')), keywords('OPTION FOR'))
          )
        ),
        choice(
          seq(
            $._privileges,
            keyword('ON'),
            $._privilege_target,
            keyword('FROM'),
            commaSep1($._role_spec),
            optional(seq(keywords('GRANTED BY'), $._role_spec)),
            optional($._drop_behavior)
          ),
          seq(
            commaSep1($._identifier),
            keyword('FROM'),
            commaSep1($._role_spec),
            optional(seq(keywords('GRANTED BY'), $._role_spec)),
            optional($._drop_behavior)
          )
        )
      ),

    alter_default_privileges_statement: ($) =>
      seq(
        keywords('ALTER DEFAULT PRIVILEGES'),
        repeat(
          choice(
            seq(keyword('FOR'), choice(keyword('ROLE'), keyword('USER')), commaSep1($._role_spec)),
            seq(keywords('IN SCHEMA'), commaSep1($._identifier))
          )
        ),
        choice(
          seq(
            keyword('GRANT'),
            $._privileges,
            keywords('ON'),
            choice(
              keyword('TABLES'),
              keyword('SEQUENCES'),
              keyword('FUNCTIONS'),
              keyword('ROUTINES'),
              keyword('TYPES'),
              keyword('SCHEMAS')
            ),
            keyword('TO'),
            commaSep1($._role_spec),
            optional(keywords('WITH GRANT OPTION'))
          ),
          seq(
            keyword('REVOKE'),
            optional(keywords('GRANT OPTION FOR')),
            $._privileges,
            keywords('ON'),
            choice(
              keyword('TABLES'),
              keyword('SEQUENCES'),
              keyword('FUNCTIONS'),
              keyword('ROUTINES'),
              keyword('TYPES'),
              keyword('SCHEMAS')
            ),
            keyword('FROM'),
            commaSep1($._role_spec),
            optional($._drop_behavior)
          )
        )
      ),

    _privileges: ($) =>
      choice(
        seq(keywords('ALL'), optional(keyword('PRIVILEGES')), optional($.column_list)),
        commaSep1(
          seq(
            choice(
              keyword('SELECT'),
              keyword('INSERT'),
              keyword('UPDATE'),
              keyword('DELETE'),
              keyword('TRUNCATE'),
              keyword('REFERENCES'),
              keyword('TRIGGER'),
              keyword('CREATE'),
              keyword('CONNECT'),
              keyword('TEMPORARY'),
              keyword('TEMP'),
              keyword('EXECUTE'),
              keyword('USAGE'),
              keyword('SET'),
              keywords('ALTER SYSTEM'),
              keyword('MAINTAIN')
            ),
            optional($.column_list)
          )
        )
      ),

    _privilege_target: ($) =>
      choice(
        seq(optional(keyword('TABLE')), commaSep1($.qualified_name)),
        seq(keyword('SEQUENCE'), commaSep1($.qualified_name)),
        seq(
          choice(
            keyword('DATABASE'),
            keywords('FOREIGN DATA WRAPPER'),
            keywords('FOREIGN SERVER'),
            keyword('LANGUAGE'),
            keyword('SCHEMA'),
            keyword('TABLESPACE'),
            keyword('PARAMETER')
          ),
          commaSep1($.qualified_name)
        ),
        seq(choice(keyword('DOMAIN'), keyword('TYPE')), commaSep1($.qualified_name)),
        seq(
          choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
          commaSep1(seq($.qualified_name, optional($._routine_arg_types)))
        ),
        seq(keywords('LARGE OBJECT'), commaSep1($.numeric_literal)),
        seq(
          keywords('ALL'),
          choice(
            keyword('TABLES'),
            keyword('SEQUENCES'),
            keyword('FUNCTIONS'),
            keyword('PROCEDURES'),
            keyword('ROUTINES')
          ),
          keywords('IN SCHEMA'),
          commaSep1($._identifier)
        )
      ),

    // =========================================================================
    // Session, Transactions, Maintenance & Utility Statements
    // =========================================================================

    set_statement: ($) =>
      seq(
        keyword('SET'),
        optional(choice(keyword('SESSION'), keyword('LOCAL'))),
        choice(
          seq(keywords('TIME ZONE'), choice($._expression, keyword('LOCAL'), keyword('DEFAULT'))),
          seq(keywords('TRANSACTION SNAPSHOT'), $.string_literal),
          seq(
            choice(keyword('TRANSACTION'), keywords('SESSION CHARACTERISTICS AS TRANSACTION')),
            commaSep1($._transaction_mode)
          ),
          seq(
            keywords('CONSTRAINTS'),
            choice(keyword('ALL'), commaSep1($.qualified_name)),
            choice(keyword('DEFERRED'), keyword('IMMEDIATE'))
          ),
          seq(keywords('SESSION AUTHORIZATION'), choice($._role_spec, $.string_literal, keyword('DEFAULT'))),
          seq(keyword('ROLE'), choice($._role_spec, $.string_literal)),
          seq(
            $.qualified_name,
            choice('=', keyword('TO')),
            choice(keyword('DEFAULT'), commaSep1(choice($._expression, keyword('ON'), keyword('OFF'))))
          ),
          seq($.qualified_name, keywords('FROM CURRENT'))
        )
      ),

    reset_statement: ($) =>
      seq(
        keyword('RESET'),
        choice(
          keywords('TIME ZONE'),
          keywords('TRANSACTION ISOLATION LEVEL'),
          keywords('SESSION AUTHORIZATION'),
          keyword('ROLE'),
          keyword('ALL'),
          $.qualified_name
        )
      ),

    show_statement: ($) =>
      seq(
        keyword('SHOW'),
        choice(
          keywords('TIME ZONE'),
          keywords('TRANSACTION ISOLATION LEVEL'),
          keywords('SESSION AUTHORIZATION'),
          keyword('ALL'),
          $.qualified_name
        )
      ),

    begin_statement: ($) =>
      seq(
        choice(
          seq(keyword('BEGIN'), optional(choice(keyword('WORK'), keyword('TRANSACTION')))),
          keywords('START TRANSACTION')
        ),
        commaSep($._transaction_mode)
      ),

    _transaction_mode: () =>
      choice(
        seq(
          keywords('ISOLATION LEVEL'),
          choice(
            keywords('SERIALIZABLE'),
            keywords('REPEATABLE READ'),
            keywords('READ COMMITTED'),
            keywords('READ UNCOMMITTED')
          )
        ),
        keywords('READ WRITE'),
        keywords('READ ONLY'),
        seq(optional(keyword('NOT')), keyword('DEFERRABLE'))
      ),

    commit_statement: () =>
      seq(
        choice(keyword('COMMIT'), keyword('END')),
        optional(choice(keyword('WORK'), keyword('TRANSACTION'))),
        optional(seq(keyword('AND'), optional(keyword('NO')), keyword('CHAIN')))
      ),

    rollback_statement: ($) =>
      seq(
        choice(keyword('ROLLBACK'), keyword('ABORT')),
        optional(choice(keyword('WORK'), keyword('TRANSACTION'))),
        optional(
          choice(
            seq(keyword('AND'), optional(keyword('NO')), keyword('CHAIN')),
            seq(keyword('TO'), optional(keyword('SAVEPOINT')), field('savepoint', $._identifier))
          )
        )
      ),

    savepoint_statement: ($) => seq(keyword('SAVEPOINT'), field('name', $._identifier)),

    release_statement: ($) => seq(keyword('RELEASE'), optional(keyword('SAVEPOINT')), field('name', $._identifier)),

    prepare_transaction_statement: ($) => seq(keywords('PREPARE TRANSACTION'), $.string_literal),

    commit_prepared_statement: ($) => seq(keywords('COMMIT PREPARED'), $.string_literal),

    rollback_prepared_statement: ($) => seq(keywords('ROLLBACK PREPARED'), $.string_literal),

    lock_statement: ($) =>
      seq(
        keyword('LOCK'),
        optional(keyword('TABLE')),
        commaSep1($._relation_expr),
        optional(
          seq(
            keywords('IN'),
            choice(
              keywords('ACCESS SHARE'),
              keywords('ROW SHARE'),
              keywords('ROW EXCLUSIVE'),
              keywords('SHARE UPDATE EXCLUSIVE'),
              keyword('SHARE'),
              keywords('SHARE ROW EXCLUSIVE'),
              keyword('EXCLUSIVE'),
              keywords('ACCESS EXCLUSIVE')
            ),
            keyword('MODE')
          )
        ),
        optional(keyword('NOWAIT'))
      ),

    truncate_statement: ($) =>
      seq(
        keyword('TRUNCATE'),
        optional(keyword('TABLE')),
        commaSep1($._relation_expr),
        optional(seq(choice(keyword('RESTART'), keyword('CONTINUE')), keyword('IDENTITY'))),
        optional($._drop_behavior)
      ),

    vacuum_statement: ($) =>
      seq(
        keyword('VACUUM'),
        optional(
          choice(
            parens(commaSep1($._utility_option)),
            repeat1(
              choice(keyword('FULL'), keyword('FREEZE'), keyword('VERBOSE'), keyword('ANALYZE'), keyword('ANALYSE'))
            )
          )
        ),
        commaSep($._vacuum_relation)
      ),

    _vacuum_relation: ($) => seq($._relation_expr, optional($.column_list)),

    analyze_statement: ($) =>
      seq(
        choice(keyword('ANALYZE'), keyword('ANALYSE')),
        optional(choice(parens(commaSep1($._utility_option)), keyword('VERBOSE'))),
        commaSep($._vacuum_relation)
      ),

    cluster_statement: ($) =>
      seq(
        keyword('CLUSTER'),
        optional(choice(parens(commaSep1($._utility_option)), keyword('VERBOSE'))),
        optional(seq($.qualified_name, optional(seq(keyword('USING'), $._identifier))))
      ),

    reindex_statement: ($) =>
      seq(
        keyword('REINDEX'),
        optional(parens(commaSep1($._utility_option))),
        choice(
          seq(
            choice(keyword('INDEX'), keyword('TABLE'), keyword('SCHEMA'), keyword('DATABASE'), keyword('SYSTEM')),
            optional(keyword('CONCURRENTLY')),
            optional($.qualified_name)
          )
        )
      ),

    copy_statement: ($) =>
      seq(
        keyword('COPY'),
        choice(
          seq(optional(keyword('BINARY')), $.qualified_name, optional($.column_list)),
          parens($._preparable_statement)
        ),
        choice(keyword('FROM'), keyword('TO')),
        choice(seq(optional(keyword('PROGRAM')), $.string_literal), keyword('STDIN'), keyword('STDOUT')),
        optional(keyword('WITH')),
        optional(
          choice(
            parens(commaSep1($._utility_option)),
            repeat1(
              choice(
                keyword('BINARY'),
                seq(keyword('DELIMITER'), optional(keyword('AS')), $.string_literal),
                seq(keyword('NULL'), optional(keyword('AS')), $.string_literal),
                keyword('CSV'),
                keyword('HEADER'),
                seq(keyword('QUOTE'), optional(keyword('AS')), $.string_literal),
                seq(keyword('ESCAPE'), optional(keyword('AS')), $.string_literal),
                seq(keywords('FORCE QUOTE'), choice('*', $.column_list)),
                seq(keywords('FORCE NOT NULL'), $.column_list),
                seq(keywords('FORCE NULL'), $.column_list),
                seq(keyword('ENCODING'), $.string_literal)
              )
            )
          )
        ),
        optional($.where_clause)
      ),

    do_statement: ($) =>
      seq(
        keyword('DO'),
        repeat1(choice($.string_literal, seq(keyword('LANGUAGE'), choice($._identifier, $.string_literal))))
      ),

    call_statement: ($) => seq(keyword('CALL'), $.function_call),

    prepare_statement: ($) =>
      seq(
        keyword('PREPARE'),
        field('name', $._identifier),
        optional(parens(commaSep1($.type_name))),
        keyword('AS'),
        $._preparable_statement
      ),

    execute_statement: ($) =>
      seq(keyword('EXECUTE'), field('name', $._identifier), optional(parens(commaSep1($._expression)))),

    deallocate_statement: ($) =>
      seq(keyword('DEALLOCATE'), optional(keyword('PREPARE')), choice($._identifier, keyword('ALL'))),

    listen_statement: ($) => seq(keyword('LISTEN'), $._identifier),

    notify_statement: ($) => seq(keyword('NOTIFY'), $._identifier, optional(seq(',', $.string_literal))),

    unlisten_statement: ($) => seq(keyword('UNLISTEN'), choice($._identifier, '*')),

    declare_statement: ($) =>
      seq(
        keyword('DECLARE'),
        field('name', $._identifier),
        repeat(
          choice(
            keyword('BINARY'),
            keyword('ASENSITIVE'),
            keyword('INSENSITIVE'),
            seq(optional(keyword('NO')), keyword('SCROLL'))
          )
        ),
        keyword('CURSOR'),
        optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('HOLD'))),
        keyword('FOR'),
        $.select_statement
      ),

    fetch_statement: ($) =>
      seq(
        keyword('FETCH'),
        optional($._fetch_direction),
        optional(choice(keyword('FROM'), keyword('IN'))),
        $._identifier
      ),

    move_statement: ($) =>
      seq(
        keyword('MOVE'),
        optional($._fetch_direction),
        optional(choice(keyword('FROM'), keyword('IN'))),
        $._identifier
      ),

    _fetch_direction: ($) =>
      choice(
        keyword('NEXT'),
        keyword('PRIOR'),
        keyword('FIRST'),
        keyword('LAST'),
        seq(choice(keyword('ABSOLUTE'), keyword('RELATIVE')), $._signed_integer),
        $._signed_integer,
        keyword('ALL'),
        prec.right(
          seq(choice(keyword('FORWARD'), keyword('BACKWARD')), optional(choice($._signed_integer, keyword('ALL'))))
        )
      ),

    close_statement: ($) => seq(keyword('CLOSE'), choice($._identifier, keyword('ALL'))),

    discard_statement: () =>
      seq(
        keyword('DISCARD'),
        choice(keyword('ALL'), keyword('PLANS'), keyword('SEQUENCES'), keyword('TEMP'), keyword('TEMPORARY'))
      ),

    checkpoint_statement: () => keyword('CHECKPOINT'),

    load_statement: ($) => seq(keyword('LOAD'), $.string_literal),

    // =========================================================================
    // Types (`type_name`)
    // =========================================================================

    type_name: ($) =>
      prec.right(
        PREC.POSTFIX + 1,
        seq(
          $._simple_type,
          optional(
            choice(
              repeat1(seq('[', optional($.numeric_literal), ']')),
              seq(keyword('ARRAY'), optional(seq('[', $.numeric_literal, ']')))
            )
          )
        )
      ),

    _simple_type: ($) => choice($._non_interval_simple_type, seq(keyword('INTERVAL'), optional($._interval_qualifier))),

    _non_interval_simple_type: ($) =>
      choice(
        keyword('SMALLINT'),
        keyword('INTEGER'),
        keyword('INT'),
        keyword('BIGINT'),
        keyword('REAL'),
        keywords('DOUBLE PRECISION'),
        seq(keyword('FLOAT'), optional(parens($.numeric_literal))),
        seq(choice(keyword('NUMERIC'), keyword('DECIMAL'), keyword('DEC')), optional($._type_modifiers)),
        keyword('BOOLEAN'),
        seq(
          choice(
            keywords('CHARACTER VARYING'),
            keywords('CHAR VARYING'),
            keyword('VARCHAR'),
            keywords('NATIONAL CHARACTER VARYING'),
            keywords('NATIONAL CHAR VARYING'),
            keywords('NCHAR VARYING'),
            keywords('NATIONAL CHARACTER'),
            keywords('NATIONAL CHAR'),
            keyword('CHARACTER'),
            keyword('CHAR'),
            keyword('NCHAR')
          ),
          optional(parens($.numeric_literal))
        ),
        seq(choice(keywords('BIT VARYING'), keyword('BIT')), optional(parens($.numeric_literal))),
        seq(
          choice(keyword('TIMESTAMP'), keyword('TIME')),
          optional(parens($.numeric_literal)),
          optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keywords('TIME ZONE')))
        ),
        keyword('JSON'),
        $._qualified_type_name
      ),

    _qualified_type_name: ($) => seq($._func_name, optional($._type_modifiers)),

    _type_modifiers: ($) => parens(commaSep1($._expression)),

    _interval_qualifier: ($) =>
      choice(seq($._interval_fields, optional(parens($.numeric_literal))), parens($.numeric_literal)),

    _interval_fields: () =>
      choice(
        keyword('YEAR'),
        keyword('MONTH'),
        keyword('DAY'),
        keyword('HOUR'),
        keyword('MINUTE'),
        keyword('SECOND'),
        keywords('YEAR TO MONTH'),
        keywords('DAY TO HOUR'),
        keywords('DAY TO MINUTE'),
        keywords('DAY TO SECOND'),
        keywords('HOUR TO MINUTE'),
        keywords('HOUR TO SECOND'),
        keywords('MINUTE TO SECOND')
      ),

    // =========================================================================
    // Expressions
    // =========================================================================

    _expression: ($) =>
      choice(
        $._term,
        $.typed_literal,
        $.column_reference,
        $.positional_parameter,
        $.parenthesized_expression,
        $.row_expression,
        $.array_expression,
        $.subquery,
        $.exists_expression,
        $.function_call,
        $.cast_expression,
        $.case_expression,
        $.extract_expression,
        $.substring_expression,
        $.trim_expression,
        $.position_expression,
        $.overlay_expression,
        $.normalize_expression,
        $.json_expression,
        $.xml_expression,
        $.field_selection,
        $.subscript_expression,
        $.at_time_zone_expression,
        $.collate_expression,
        $.unary_expression,
        $.binary_expression,
        $.quantified_comparison_expression,
        $.between_expression,
        $.in_expression,
        $.like_expression,
        $.overlaps_expression,
        $.is_expression
      ),

    _term: ($) =>
      choice(
        $.null,
        $.boolean_literal,
        $.numeric_literal,
        $.string_literal,
        $.bit_string_literal,
        $.current_value,
        prec(2, $._illegal)
      ),

    _illegal: ($) => seq($._illegal_token, $._unreachable),

    null: () => keyword('NULL'),

    boolean_literal: () => choice(keyword('TRUE'), keyword('FALSE')),

    current_value: ($) =>
      choice(
        keyword('CURRENT_CATALOG'),
        keyword('CURRENT_DATE'),
        keyword('CURRENT_ROLE'),
        keyword('CURRENT_SCHEMA'),
        keyword('CURRENT_USER'),
        keyword('SESSION_USER'),
        keyword('SYSTEM_USER'),
        keyword('USER'),
        seq(
          choice(
            keyword('CURRENT_TIME'),
            keyword('CURRENT_TIMESTAMP'),
            keyword('LOCALTIME'),
            keyword('LOCALTIMESTAMP')
          ),
          optional(parens($.numeric_literal))
        )
      ),

    typed_literal: ($) =>
      choice(
        seq(field('type', alias($._non_interval_simple_type, $.type_name)), field('value', $.string_literal)),
        seq(
          field('type', alias(seq(keyword('INTERVAL'), $._interval_qualifier), $.type_name)),
          field('value', $.string_literal)
        ),
        prec.right(
          seq(
            field('type', alias(keyword('INTERVAL'), $.type_name)),
            field('value', $.string_literal),
            optional($._interval_qualifier)
          )
        )
      ),

    column_reference: ($) =>
      choice(
        field('name', $._column_identifier),
        seq(field('table', $._column_identifier), '.', field('name', $._col_label)),
        $._three_part_column_reference
      ),

    _three_part_column_reference: ($) =>
      seq(field('schema', $._column_identifier), '.', field('table', $._col_label), '.', field('name', $._col_label)),

    field_selection: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(
          field(
            'value',
            choice(
              $.parenthesized_expression,
              $.function_call,
              $.subscript_expression,
              $.cast_expression,
              $.row_expression,
              $.field_selection,
              alias($._three_part_column_reference, $.column_reference)
            )
          ),
          '.',
          field('field', choice($._col_label, alias('*', $.all_columns)))
        )
      ),

    subscript_expression: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(
          field('value', $._expression),
          '[',
          choice(
            field('index', $._expression),
            seq(optional(field('lower', $._expression)), ':', optional(field('upper', $._expression)))
          ),
          ']'
        )
      ),

    parenthesized_expression: ($) => parens($._expression),

    row_expression: ($) =>
      choice(
        seq('(', ')'),
        seq('(', $._expression, ',', commaSep1($._expression), ')'),
        seq(keyword('ROW'), parens(commaSep($._expression)))
      ),

    array_expression: ($) => seq(keyword('ARRAY'), choice($._array_elements, parens($.select_statement))),

    _array_elements: ($) => seq('[', optional(choice(commaSep1($._expression), commaSep1($._array_elements))), ']'),

    subquery: ($) => parens($.select_statement),

    exists_expression: ($) => seq(keyword('EXISTS'), parens($.select_statement)),

    // Function calls & special SQL functions

    function_call: ($) =>
      choice(
        seq(
          field('name', choice($._func_name, alias($._col_name_function_keyword, $.identifier))),
          parens(
            optional(
              choice(
                alias('*', $.all_columns),
                seq(
                  optional(choice(keyword('DISTINCT'), keyword('ALL'))),
                  commaSep1($.function_argument),
                  optional($.order_by_clause)
                )
              )
            )
          ),
          optional($.within_group_clause),
          optional($.filter_clause),
          optional($.over_clause)
        ),
        seq(
          field('name', alias(keyword('NULLIF'), $.identifier)),
          parens(seq($.function_argument, ',', $.function_argument))
        ),
        seq(field('name', alias(keyword('MERGE_ACTION'), $.identifier)), seq('(', ')'))
      ),

    _func_name: ($) =>
      prec.right(
        choice(
          $._func_identifier,
          seq($._column_identifier, '.', $._col_label),
          seq($._column_identifier, '.', $._col_label, '.', $._col_label)
        )
      ),

    _col_name_function_keyword: () =>
      choice(keyword('COALESCE'), keyword('GREATEST'), keyword('LEAST'), keyword('GROUPING')),

    function_argument: ($) =>
      seq(
        optional(keyword('VARIADIC')),
        optional(seq(field('name', $._col_label), choice(':=', '=>'))),
        field('value', $._expression)
      ),

    within_group_clause: ($) => seq(keywords('WITHIN GROUP'), parens($.order_by_clause)),

    filter_clause: ($) => seq(keyword('FILTER'), parens($.where_clause)),

    over_clause: ($) =>
      seq(keyword('OVER'), choice(parens(optional($.window_definition)), field('window', $._identifier))),

    cast_expression: ($) =>
      choice(
        seq(
          choice(keyword('CAST'), keyword('TREAT')),
          parens(seq(field('value', $._expression), keyword('AS'), field('type', $.type_name)))
        ),
        prec.left(PREC.POSTFIX, seq(field('value', $._expression), '::', field('type', $.type_name)))
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

    extract_expression: ($) =>
      seq(
        keyword('EXTRACT'),
        parens(
          seq(field('field', choice($._col_label, $.string_literal)), keyword('FROM'), field('source', $._expression))
        )
      ),

    substring_expression: ($) =>
      seq(
        keyword('SUBSTRING'),
        parens(
          choice(
            seq(
              field('source', $._expression),
              choice(
                seq(
                  keyword('FROM'),
                  field('from', $._expression),
                  optional(seq(keyword('FOR'), field('for', $._expression)))
                ),
                seq(keyword('FOR'), field('for', $._expression))
              )
            ),
            commaSep1($.function_argument)
          )
        )
      ),

    trim_expression: ($) =>
      seq(
        keyword('TRIM'),
        parens(
          seq(
            optional(choice(keyword('BOTH'), keyword('LEADING'), keyword('TRAILING'))),
            choice(seq(optional($._expression), keyword('FROM'), commaSep1($._expression)), commaSep1($._expression))
          )
        )
      ),

    position_expression: ($) =>
      seq(
        keyword('POSITION'),
        parens(
          seq(prec(PREC.ESCAPE, seq(field('substring', $._expression), keyword('IN'))), field('source', $._expression))
        )
      ),

    overlay_expression: ($) =>
      seq(
        keyword('OVERLAY'),
        parens(
          choice(
            seq(
              field('source', $._expression),
              keyword('PLACING'),
              field('replacement', $._expression),
              keyword('FROM'),
              field('from', $._expression),
              optional(seq(keyword('FOR'), field('for', $._expression)))
            ),
            commaSep1($.function_argument)
          )
        )
      ),

    normalize_expression: ($) =>
      seq(
        keyword('NORMALIZE'),
        parens(
          seq(
            $._expression,
            optional(seq(',', choice(keyword('NFC'), keyword('NFD'), keyword('NFKC'), keyword('NFKD'))))
          )
        )
      ),

    // SQL/JSON & XML

    json_expression: ($) =>
      choice(
        seq(
          keyword('JSON_OBJECT'),
          parens(
            choice(
              seq(
                commaSep(
                  seq(
                    field('key', $._expression),
                    choice(
                      seq(':', field('value', $._expression)),
                      seq(keyword('VALUE'), field('value', $._expression))
                    ),
                    optional($._json_format)
                  )
                ),
                optional($._json_null_clause),
                optional($._json_unique_keys),
                optional($._json_returning)
              ),
              commaSep1($.function_argument)
            )
          )
        ),
        seq(
          keyword('JSON_ARRAY'),
          parens(
            choice(
              seq($.select_statement, optional($._json_format), optional($._json_returning)),
              seq(
                commaSep(seq($._expression, optional($._json_format))),
                optional($._json_null_clause),
                optional($._json_returning)
              )
            )
          )
        ),
        seq(
          keyword('JSON_OBJECTAGG'),
          parens(
            seq(
              $._expression,
              choice(':', keyword('VALUE')),
              $._expression,
              optional($._json_format),
              optional($._json_null_clause),
              optional($._json_unique_keys),
              optional($._json_returning)
            )
          ),
          optional($.filter_clause),
          optional($.over_clause)
        ),
        seq(
          keyword('JSON_ARRAYAGG'),
          parens(
            seq(
              $._expression,
              optional($._json_format),
              optional($.order_by_clause),
              optional($._json_null_clause),
              optional($._json_returning)
            )
          ),
          optional($.filter_clause),
          optional($.over_clause)
        ),
        seq(
          choice(keyword('JSON'), keyword('JSON_SCALAR'), keyword('JSON_SERIALIZE')),
          parens(
            seq($._expression, optional($._json_format), optional($._json_unique_keys), optional($._json_returning))
          )
        ),
        seq(
          choice(keyword('JSON_VALUE'), keyword('JSON_QUERY'), keyword('JSON_EXISTS')),
          parens(
            seq(
              $._expression,
              optional($._json_format),
              ',',
              $._expression,
              optional($._json_passing),
              repeat($._json_query_behavior)
            )
          )
        )
      ),

    _json_format: ($) => seq(keywords('FORMAT JSON'), optional(seq(keyword('ENCODING'), $._identifier))),

    _json_null_clause: () => seq(choice(keyword('NULL'), keyword('ABSENT')), keywords('ON NULL')),

    _json_unique_keys: () =>
      seq(choice(keyword('WITH'), keyword('WITHOUT')), keywords('UNIQUE'), optional(keyword('KEYS'))),

    _json_returning: ($) => seq(keyword('RETURNING'), $.type_name, optional($._json_format)),

    _json_passing: ($) => seq(keyword('PASSING'), commaSep1(seq($._expression, keyword('AS'), $._identifier))),

    _json_query_behavior: ($) =>
      choice(
        $._json_returning,
        seq(
          choice(keyword('WITHOUT'), keyword('WITH')),
          optional(choice(keyword('CONDITIONAL'), keyword('UNCONDITIONAL'))),
          optional(keyword('ARRAY')),
          keyword('WRAPPER')
        ),
        seq(choice(keyword('KEEP'), keyword('OMIT')), keyword('QUOTES'), optional(keywords('ON SCALAR STRING'))),
        seq(
          choice(
            keyword('ERROR'),
            keyword('NULL'),
            keyword('TRUE'),
            keyword('FALSE'),
            keyword('UNKNOWN'),
            seq(keyword('EMPTY'), optional(choice(keyword('ARRAY'), keyword('OBJECT')))),
            seq(keyword('DEFAULT'), $._expression)
          ),
          keywords('ON'),
          choice(keyword('EMPTY'), keyword('ERROR'))
        )
      ),

    json_table_expression: ($) =>
      seq(
        optional(keyword('LATERAL')),
        keyword('JSON_TABLE'),
        parens(
          seq(
            $._expression,
            optional($._json_format),
            ',',
            $._expression,
            optional(seq(keyword('AS'), $._identifier)),
            optional($._json_passing),
            keyword('COLUMNS'),
            parens(commaSep1($._json_table_column)),
            repeat($._json_query_behavior)
          )
        ),
        optional($._table_alias)
      ),

    _json_table_column: ($) =>
      choice(
        seq($._identifier, keywords('FOR ORDINALITY')),
        seq(
          $._identifier,
          $.type_name,
          optional($._json_format),
          optional(seq(keyword('EXISTS'))),
          optional(prec.left(PREC.ESCAPE, seq(keyword('PATH'), $._expression))),
          repeat($._json_query_behavior)
        ),
        seq(
          keyword('NESTED'),
          optional(keyword('PATH')),
          $._expression,
          optional(seq(keyword('AS'), $._identifier)),
          keyword('COLUMNS'),
          parens(commaSep1($._json_table_column))
        )
      ),

    xml_expression: ($) =>
      choice(
        seq(
          keyword('XMLELEMENT'),
          parens(
            seq(keyword('NAME'), $._col_label, optional(seq(',', $.xml_attributes)), repeat(seq(',', $._expression)))
          )
        ),
        seq(keyword('XMLFOREST'), parens(commaSep1(seq($._expression, optional(seq(keyword('AS'), $._col_label)))))),
        seq(keyword('XMLPI'), parens(seq(keyword('NAME'), $._col_label, optional(seq(',', $._expression))))),
        seq(
          keyword('XMLROOT'),
          parens(
            seq(
              $._expression,
              ',',
              keyword('VERSION'),
              choice($._expression, keywords('NO VALUE')),
              optional(seq(',', keyword('STANDALONE'), choice(keyword('YES'), keyword('NO'), keywords('NO VALUE'))))
            )
          )
        ),
        seq(
          keyword('XMLPARSE'),
          parens(
            seq(
              choice(keyword('DOCUMENT'), keyword('CONTENT')),
              $._expression,
              optional(seq(choice(keyword('PRESERVE'), keyword('STRIP')), keyword('WHITESPACE')))
            )
          )
        ),
        seq(
          keyword('XMLSERIALIZE'),
          parens(
            seq(
              choice(keyword('DOCUMENT'), keyword('CONTENT')),
              $._expression,
              keyword('AS'),
              $.type_name,
              optional(seq(optional(keyword('NO')), keyword('INDENT')))
            )
          )
        ),
        seq(keyword('XMLEXISTS'), parens(seq($._expression, $._xml_passing))),
        seq(keyword('XMLCONCAT'), parens(commaSep1($._expression)))
      ),

    xml_attributes: ($) =>
      seq(keyword('XMLATTRIBUTES'), parens(commaSep1(seq($._expression, optional(seq(keyword('AS'), $._col_label)))))),

    _xml_passing: ($) =>
      seq(keyword('PASSING'), optional(keywords('BY VALUE')), $._expression, optional(keywords('BY VALUE'))),

    xmltable_expression: ($) =>
      seq(
        optional(keyword('LATERAL')),
        keyword('XMLTABLE'),
        parens(
          seq(
            optional(
              seq(
                keyword('XMLNAMESPACES'),
                parens(
                  commaSep1(
                    choice(seq(keyword('DEFAULT'), $._expression), seq($._expression, keyword('AS'), $._identifier))
                  )
                ),
                ','
              )
            ),
            $._expression,
            $._xml_passing,
            keyword('COLUMNS'),
            commaSep1($._xmltable_column)
          )
        ),
        optional($._table_alias)
      ),

    _xmltable_column: ($) =>
      choice(
        seq($._identifier, keywords('FOR ORDINALITY')),
        seq(
          $._identifier,
          $.type_name,
          repeat(
            choice(
              prec.left(PREC.ESCAPE, seq(keyword('PATH'), $._expression)),
              prec.left(PREC.ESCAPE, seq(keyword('DEFAULT'), $._expression)),
              keyword('NULL'),
              keywords('NOT NULL')
            )
          )
        )
      ),

    // Operators & predicates

    at_time_zone_expression: ($) =>
      prec.left(
        PREC.AT,
        seq(
          field('value', $._expression),
          choice(seq(keywords('AT TIME ZONE'), field('zone', $._expression)), keywords('AT LOCAL'))
        )
      ),

    collate_expression: ($) =>
      prec.left(PREC.AT, seq(field('value', $._expression), keyword('COLLATE'), field('collation', $.qualified_name))),

    unary_expression: ($) =>
      choice(
        prec.right(PREC.NOT, seq(field('operator', keyword('NOT')), field('operand', $._expression))),
        prec.right(PREC.UNARY, seq(field('operator', choice('+', '-')), field('operand', $._expression))),
        prec.right(
          PREC.OP,
          seq(field('operator', choice($.custom_operator, $.operator_invocation)), field('operand', $._expression))
        )
      ),

    operator_invocation: ($) =>
      seq(keyword('OPERATOR'), parens(seq(repeat(seq($._column_identifier, '.')), $._all_op))),

    _any_operator: ($) => choice(seq(repeat(seq($._column_identifier, '.')), $._all_op), $.operator_invocation),

    _all_op: ($) => choice('+', '-', '*', '/', '%', '^', '<', '>', '=', '<=', '>=', '<>', '!=', $.custom_operator),

    binary_expression: ($) =>
      choice(
        binaryOp($, PREC.OR, keyword('OR')),
        binaryOp($, PREC.AND, keyword('AND')),
        binaryOp($, PREC.COMPARISON, choice('=', '<>', '!=', '<', '<=', '>', '>=')),
        binaryOp($, PREC.OP, choice($.custom_operator, $.operator_invocation)),
        binaryOp($, PREC.ADDITIVE, choice('+', '-')),
        binaryOp($, PREC.MULTIPLICATIVE, choice('*', '/', '%')),
        binaryOp($, PREC.EXPONENT, '^')
      ),

    quantified_comparison_expression: ($) => {
      /** @type {[number, RuleOrLiteral][]} */
      const operators = [
        [PREC.COMPARISON, choice('=', '<>', '!=', '<', '<=', '>', '>=')],
        [PREC.OP, choice($.custom_operator, $.operator_invocation)],
      ];
      return choice(
        ...operators.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(
              field('left', $._expression),
              field('operator', operator),
              field('quantifier', choice(keyword('ANY'), keyword('SOME'), keyword('ALL'))),
              parens(choice($.select_statement, $._expression))
            )
          )
        )
      );
    },

    between_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('BETWEEN'),
          optional(choice(keyword('SYMMETRIC'), keyword('ASYMMETRIC'))),
          field('low', $._expression),
          keyword('AND'),
          field('high', $._expression)
        )
      ),

    in_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('IN'),
          parens(choice($.select_statement, commaSep1($._expression)))
        )
      ),

    like_expression: ($) =>
      choice(
        prec.left(PREC.PATTERN, seq($._like_head, field('right', $._like_rhs))),
        seq(
          $._like_head,
          prec(PREC.ESCAPE, seq(field('right', $._like_rhs), keyword('ESCAPE'))),
          prec.left(PREC.PATTERN, field('escape', $._expression))
        )
      ),

    _like_head: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('left', $._expression),
          optional(keyword('NOT')),
          field('operator', choice(keyword('LIKE'), keyword('ILIKE'), keywords('SIMILAR TO')))
        )
      ),

    _like_rhs: ($) =>
      choice(
        $._expression,
        seq(choice(keyword('ANY'), keyword('SOME'), keyword('ALL')), parens(choice($.select_statement, $._expression)))
      ),

    overlaps_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(field('left', $.row_expression), keyword('OVERLAPS'), field('right', $.row_expression))
      ),

    is_expression: ($) =>
      prec.left(
        PREC.IS,
        choice(
          seq(field('value', $._expression), choice(keyword('ISNULL'), keyword('NOTNULL'))),
          seq(
            field('value', $._expression),
            keyword('IS'),
            optional(keyword('NOT')),
            choice(
              $.null,
              $.boolean_literal,
              keyword('UNKNOWN'),
              seq(keywords('DISTINCT FROM'), field('right', $._expression)),
              keyword('DOCUMENT'),
              seq(
                optional(choice(keyword('NFC'), keyword('NFD'), keyword('NFKC'), keyword('NFKD'))),
                keyword('NORMALIZED')
              ),
              seq(
                keyword('JSON'),
                optional(choice(keyword('VALUE'), keyword('ARRAY'), keyword('OBJECT'), keyword('SCALAR'))),
                optional($._json_unique_keys)
              )
            )
          )
        )
      ),

    // =========================================================================
    // Identifiers & Literals
    // =========================================================================

    qualified_name: ($) =>
      choice(
        field('name', $._identifier),
        seq(field('schema', $._column_identifier), '.', field('name', $._col_label)),
        seq(
          field('catalog', $._column_identifier),
          '.',
          field('schema', $._col_label),
          '.',
          field('name', $._col_label)
        )
      ),

    _identifier: ($) => choice($._column_identifier, $._illegal),

    _column_identifier: ($) =>
      choice(
        $.identifier,
        $.quoted_identifier,
        ...[...COL_NAME_KEYWORDS, ...UNRESERVED_STARTER_KEYWORDS].map((word) =>
          prec(-1, alias(keyword(word), $.identifier))
        )
      ),

    _func_identifier: ($) =>
      choice(
        reserved('func_id', $.identifier),
        $.quoted_identifier,
        ...[...TYPE_FUNC_NAME_KEYWORDS, ...UNRESERVED_STARTER_KEYWORDS].map((word) =>
          prec(-1, alias(keyword(word), $.identifier))
        )
      ),

    _col_label: ($) =>
      choice(
        $.identifier,
        $.quoted_identifier,
        ...FUNC_RESERVED_KEYWORDS.map((word) => prec(-1, alias(keyword(word), $.identifier)))
      ),

    _bare_col_label: ($) =>
      choice(
        reserved('bare_label', $.identifier),
        $.quoted_identifier,
        ...[...BARE_LABEL_EXTRA_KEYWORDS, 'AT', 'BETWEEN', 'OPERATOR'].map((word) =>
          prec(-1, alias(keyword(word), $.identifier))
        )
      ),

    identifier: () => /[A-Za-z_\u0080-\u{10FFFF}][A-Za-z0-9_$\u0080-\u{10FFFF}]*/u,

    numeric_literal: () =>
      token(
        choice(
          new RegExp(`0[xX]_?${HEX_DIGITS}`),
          new RegExp(`0[oO]_?${OCT_DIGITS}`),
          new RegExp(`0[bB]_?${BIN_DIGITS}`),
          new RegExp(`(${DIGITS}(\\.(${DIGITS})?)?|\\.${DIGITS})([eE][+-]?${DIGITS})?`)
        )
      ),

    _signed_integer: ($) =>
      choice($.numeric_literal, alias($._signed_numeric_literal, $.unary_expression), prec(1, $._illegal)),

    _signed_numeric_literal: ($) =>
      seq(field('operator', choice('+', '-')), field('operand', choice($.numeric_literal, $._illegal))),
  },
});
