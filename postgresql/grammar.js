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
  COLLATE: 13,
  UNARY: 14,
  POSTFIX: 15,
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
const UNRESERVED_STARTER_KEYWORDS = ['CURRENT', 'DOUBLE', 'EXCLUDE', 'IF', 'OPERATOR', 'ROWS'];

const DIGITS = '[0-9](_?[0-9])*';
const HEX_DIGITS = '[0-9a-fA-F](_?[0-9a-fA-F])*';
const OCT_DIGITS = '[0-7](_?[0-7])*';
const BIN_DIGITS = '[01](_?[01])*';

/** @param {RuleOrLiteral} rule */
const parens = (rule) => seq('(', rule, ')');

/**
 * @param {RuleOrLiteral} operand
 * @param {number} precedence
 * @param {RuleOrLiteral} operator
 */
const leftBinary = (operand, precedence, operator) =>
  prec.left(precedence, seq(field('left', operand), field('operator', operator), field('right', operand)));

/**
 * @param {RuleOrLiteral} left
 * @param {RuleOrLiteral} right
 * @param {number} precedence
 * @param {RuleOrLiteral} operator
 */
const leftBinaryAsym = (left, right, precedence, operator) =>
  prec.left(precedence, seq(field('left', left), field('operator', operator), field('right', right)));

/** @param {GrammarSymbols<string>} $ */
const tightLhs = ($) => choice($._tight_expr, $._closed_pattern, $._closed_cmp, $._closed_is);

/** @param {GrammarSymbols<string>} $ */
const tightRhs = ($) => choice($._tight_expr, $.unary_expression);

/** @param {GrammarSymbols<string>} $ */
const patternLhs = ($) => choice($._pattern_expr, $._closed_cmp, $._closed_is);

/** @param {GrammarSymbols<string>} $ */
const patternRhs = ($) => choice($._pattern_expr, $.unary_expression);

/** @param {GrammarSymbols<string>} $ */
const cmpLhs = ($) => choice($._cmp_expr, $._closed_is);

/** @param {GrammarSymbols<string>} $ */
const cmpRhs = ($) => choice($._cmp_expr, $.unary_expression);

/** @param {GrammarSymbols<string>} $ */
const bArithLhs = ($) => choice($._b_arith_expr, $._b_closed_expr);

/** @param {GrammarSymbols<string>} $ */
const bCmpLhs = ($) => choice($._b_cmp_expr, $._b_closed_expr);

/** @param {GrammarSymbols<string>} $ */
const selectClauses = ($) => [
  optional($.from_clause),
  optional($.where_clause),
  optional($.group_by_clause),
  optional($.having_clause),
  optional($.window_clause),
];

/** @param {GrammarSymbols<string>} $ */
const copyOptions = ($) => [
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
];

/**
 * @param {'valid' | 'inherit'} slot3
 * @returns {Record<string, ($: GrammarSymbols<string>) => RuleOrLiteral>}
 */
function buildFkConstraintAttrRules(slot3) {
  const prefix = `_cas_${slot3}`;
  const fourth = slot3 === 'valid' ? keywords('NOT VALID') : keywords('NO INHERIT');
  /** @type {[string, ($: GrammarSymbols<string>) => RuleOrLiteral][]} */
  const entries = [];
  for (let used = 0; used < 15; used++) {
    for (const mode of [0, 1, 2]) {
      entries.push([
        `${prefix}_${used}_${mode}`,
        ($) => {
          const alts = fkConstraintTransitions(used, mode, fourth, $).map(([tok, nextUsed, nextMode]) =>
            nextUsed === 15 ? tok : seq(tok, optional($[`${prefix}_${nextUsed}_${nextMode}`]))
          );
          return alts.length === 1 ? alts[0] : choice(...alts);
        },
      ]);
    }
  }
  return Object.fromEntries(entries);
}

/**
 * @param {number} used
 * @param {number} mode
 * @param {RuleOrLiteral} fourth
 * @param {GrammarSymbols<string>} $
 * @returns {[RuleOrLiteral, number, number][]}
 */
function fkConstraintTransitions(used, mode, fourth, $) {
  /** @type {[RuleOrLiteral, number, number][]} */
  const steps = [];
  if (!(used & 1)) {
    steps.push([keyword('DEFERRABLE'), used | 1, mode]);
    if (mode !== 2) steps.push([keywords('NOT DEFERRABLE'), used | 1, 1]);
  }
  if (!(used & 2)) {
    if (mode !== 1) steps.push([keywords('INITIALLY DEFERRED'), used | 2, 2]);
    steps.push([keywords('INITIALLY IMMEDIATE'), used | 2, mode]);
  }
  if (!(used & 4)) steps.push([$._enforced_attr, used | 4, mode]);
  if (!(used & 8)) steps.push([fourth, used | 8, mode]);
  return steps;
}

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
    $._iconst,
    $._quoted_role_option,
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
    [$._percent_type, $._func_name],
    [$._percent_type, $._func_name, $._any_operator],
    [$._column_identifier, $._func_identifier],
    [$._non_interval_simple_type],
    [$.table_function],
    [$.rows_from_table],
    [$._transaction_mode_list],
    [$._column_constraint],
    [$._cas_valid_8_0],
    [$._cas_valid_8_1],
    [$._cas_valid_8_2],
    [$._cas_valid_9_0],
    [$._cas_valid_9_1],
    [$._cas_valid_9_2],
    [$._cas_valid_10_0],
    [$._cas_valid_10_1],
    [$._cas_valid_10_2],
    [$._cas_valid_12_0],
    [$._cas_valid_12_1],
    [$._cas_valid_12_2],
    [$._cas_valid_14_1],
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
        $.create_language_statement,
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
        $.alter_language_statement,
        $.alter_large_object_statement,
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
      choice(
        alias($._top_select_statement, $.select_statement),
        $.insert_statement,
        $.update_statement,
        $.delete_statement,
        $.merge_statement
      ),

    _subquery_preparable_statement: ($) =>
      choice($.select_statement, $.insert_statement, $.update_statement, $.delete_statement, $.merge_statement),

    _explainable_statement: ($) =>
      choice(
        $._preparable_statement,
        alias($._create_table_as_statement, $.create_table_statement),
        alias($._create_materialized_view_statement, $.create_view_statement),
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
        optional(
          choice(
            $._expression,
            ...[...TYPE_FUNC_NAME_KEYWORDS].map((word) => prec(-1, alias(keyword(word), $.identifier))),
            keyword('ON'),
            keyword('OFF'),
            keyword('ALL'),
            '*'
          )
        )
      ),

    // =========================================================================
    // Queries (`SELECT`, `VALUES`, `TABLE`, `WITH`, Set Operations)
    // =========================================================================

    _top_select_statement: ($) => $._top_select_body,

    _top_select_body: ($) =>
      prec.right(
        seq(optional($.with_clause), $._top_select_set_expr, optional($.order_by_clause), optional($._select_tail))
      ),

    _top_select_set_expr: ($) => choice($._top_select_intersect_expr, alias($._top_compound_query, $.compound_query)),

    _top_compound_query: ($) =>
      prec.left(
        seq(
          field('left', $._top_select_set_expr),
          field('operator', alias($._union_except_operator, $.compound_operator)),
          field('right', $._select_intersect_expr)
        )
      ),

    _top_select_intersect_expr: ($) =>
      choice($._top_select_primary, alias($._top_intersect_compound_query, $.compound_query)),

    _top_intersect_compound_query: ($) =>
      prec.left(
        seq(
          field('left', $._top_select_intersect_expr),
          field('operator', alias($._intersect_operator, $.compound_operator)),
          field('right', $._select_primary)
        )
      ),

    _top_select_primary: ($) =>
      choice(alias($._top_select_core, $.select_core), $.values_clause, $.table_query, $._top_parenthesized_select),

    _top_parenthesized_select: ($) => parens($._top_select_body),

    select_statement: ($) => $._select_body,

    _select_body: ($) =>
      prec.right(
        seq(optional($.with_clause), $._select_set_expr, optional($.order_by_clause), optional($._select_tail))
      ),

    _select_limit: ($) =>
      choice(
        seq(choice($.limit_clause, $.fetch_clause), optional($.offset_clause)),
        seq($.offset_clause, optional(choice($.limit_clause, $.fetch_clause)))
      ),

    _select_tail: ($) =>
      choice(
        seq($._select_limit, optional(repeat1($.locking_clause))),
        seq(repeat1($.locking_clause), optional($._select_limit))
      ),

    _select_set_expr: ($) => choice($._select_intersect_expr, $.compound_query),

    compound_query: ($) =>
      prec.left(
        seq(
          field('left', $._select_set_expr),
          field('operator', alias($._union_except_operator, $.compound_operator)),
          field('right', $._select_intersect_expr)
        )
      ),

    _select_intersect_expr: ($) => choice($._select_primary, alias($._intersect_compound_query, $.compound_query)),

    _intersect_compound_query: ($) =>
      prec.left(
        seq(
          field('left', $._select_intersect_expr),
          field('operator', alias($._intersect_operator, $.compound_operator)),
          field('right', $._select_primary)
        )
      ),

    _union_except_operator: () =>
      seq(choice(keyword('UNION'), keyword('EXCEPT')), optional(choice(keyword('ALL'), keyword('DISTINCT')))),

    _intersect_operator: () => seq(keyword('INTERSECT'), optional(choice(keyword('ALL'), keyword('DISTINCT')))),

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
        parens($._subquery_preparable_statement),
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

    _select_head: ($) =>
      seq(
        keyword('SELECT'),
        choice(
          seq(optional(alias(keyword('ALL'), $.distinct_clause)), optional($._target_list)),
          seq($.distinct_clause, $._target_list)
        )
      ),

    _top_select_core: ($) => seq($._select_head, optional($.into_clause), ...selectClauses($)),

    select_core: ($) => seq($._select_head, ...selectClauses($)),

    distinct_clause: ($) => seq(keyword('DISTINCT'), optional(seq(keyword('ON'), parens(commaSep1($._expression))))),

    _target_list: ($) => commaSep1(choice($.result_column, alias('*', $.all_columns), prec(1, $.table_columns))),

    result_column: ($) =>
      choice(
        seq(
          field('value', $._expression),
          optional(choice(seq(keyword('AS'), field('alias', $._col_label)), field('alias', $._bare_col_label)))
        ),
        seq(field('value', tightLhs($)), field('alias', $._tight_bare_col_label)),
        seq(field('value', cmpLhs($)), field('alias', alias(keyword('IS'), $.identifier)))
      ),

    _tight_bare_col_label: ($) =>
      choice(
        ...['AT', 'BETWEEN', 'COLLATE', 'ILIKE', 'IN', 'LIKE', 'NOT', 'OPERATOR', 'SIMILAR'].map((word) =>
          alias(keyword(word), $.identifier)
        )
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

    from_clause: ($) => seq(keyword('FROM'), $._from_list),

    _from_list: ($) => commaSep1($._table_ref),

    _table_ref: ($) => choice($._non_join_table_ref, $._joined_table),

    _joined_table: ($) =>
      choice(
        prec.left(1, seq($._table_ref, choice(keywords('CROSS JOIN'), $.natural_join_operator), $._table_ref)),
        prec.left(1, seq($._table_ref, $.join_operator, $._table_ref, $.join_constraint))
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

    _non_join_table_ref: ($) =>
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

    _table_func_invocation: ($) => choice($._func_expr_windowless, $.unnest_expression),

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

    subquery_table: ($) => seq(optional(keyword('LATERAL')), parens($.select_statement), optional($._table_alias)),

    join_table: ($) => seq($._parenthesized_joined_table, optional($._table_alias)),

    _parenthesized_joined_table: ($) => parens(choice($._joined_table, $._parenthesized_joined_table)),

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

    where_clause: ($) => seq(keyword('WHERE'), field('condition', $._expression)),

    _where_or_current_clause: ($) =>
      seq(
        keyword('WHERE'),
        choice(field('condition', $._expression), seq(keywords('CURRENT OF'), field('cursor', $._identifier)))
      ),

    group_by_clause: ($) =>
      seq(keywords('GROUP BY'), optional(choice(keyword('ALL'), keyword('DISTINCT'))), commaSep1($._grouping_element)),

    _empty_grouping_set: () => seq('(', ')'),

    _grouping_element: ($) =>
      choice(
        alias($._empty_grouping_set, $.row_expression),
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
        optional(field('count', $._fetch_first_value)),
        choice(keyword('ROW'), keyword('ROWS')),
        choice(keyword('ONLY'), keywords('WITH TIES'))
      ),

    _fetch_first_value: ($) => choice($._c_expr, alias($._signed_numeric_literal, $.unary_expression)),

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
        optional(alias($._insert_column_list, $.column_list)),
        optional($.overriding_clause),
        choice($.select_statement, keywords('DEFAULT VALUES')),
        optional($.on_conflict_clause),
        optional($.returning_clause)
      ),

    _insert_column_list: ($) => parens(commaSep1($._assignment_target)),

    overriding_clause: () => seq(keyword('OVERRIDING'), choice(keyword('SYSTEM'), keyword('USER')), keyword('VALUE')),

    on_conflict_clause: ($) =>
      seq(
        keywords('ON CONFLICT'),
        choice(
          seq(optional($.conflict_target), keywords('DO NOTHING')),
          seq($.conflict_target, keywords('DO UPDATE'), $.set_clause, optional($.where_clause))
        )
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
        optional(alias($._where_or_current_clause, $.where_clause)),
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
        repeat(
          choice(
            seq('.', $._col_label),
            seq('[', choice($._expression, seq(optional($._expression), ':', optional($._expression))), ']')
          )
        )
      ),

    delete_statement: ($) =>
      seq(
        optional($.with_clause),
        keywords('DELETE FROM'),
        $._relation_expr,
        optional(seq(optional(keyword('AS')), field('alias', $._identifier))),
        optional(seq(keyword('USING'), $._from_list)),
        optional(alias($._where_or_current_clause, $.where_clause)),
        optional($.returning_clause)
      ),

    merge_statement: ($) =>
      seq(
        optional($.with_clause),
        keywords('MERGE INTO'),
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
                optional(alias($._insert_column_list, $.column_list)),
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

    _create_table_head: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice($.temporary, keyword('UNLOGGED'))),
        keyword('TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name)
      ),

    _create_table_as_statement: ($) =>
      seq(
        $._create_table_head,
        optional($.column_list),
        repeat($._table_tail_option),
        keyword('AS'),
        choice($.select_statement, $.execute_statement),
        optional($._with_data_clause)
      ),

    create_table_statement: ($) =>
      choice(
        seq(
          $._create_table_head,
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
            )
          )
        ),
        $._create_table_as_statement
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

    _def_elem: ($) => seq($._col_label, optional(seq('=', $._def_arg))),

    _reloption_elem: ($) => seq($._col_label, optional(seq('.', $._col_label)), optional(seq('=', $._def_arg))),

    _def_arg: ($) =>
      choice(
        $._term,
        alias($._signed_numeric_literal, $.unary_expression),
        $._func_type,
        $._any_operator,
        ...RESERVED_KEYWORDS.filter(
          (word) =>
            ![
              'TRUE',
              'FALSE',
              'NULL',
              'CURRENT_CATALOG',
              'CURRENT_DATE',
              'CURRENT_ROLE',
              'CURRENT_TIME',
              'CURRENT_TIMESTAMP',
              'CURRENT_USER',
              'LOCALTIME',
              'LOCALTIMESTAMP',
              'SESSION_USER',
              'SYSTEM_USER',
              'USER',
            ].includes(word)
        ).map((word) => keyword(word)),
        ...COL_NAME_KEYWORDS.filter(
          (word) =>
            ![
              'BIGINT',
              'BIT',
              'BOOLEAN',
              'CHAR',
              'CHARACTER',
              'DEC',
              'DECIMAL',
              'FLOAT',
              'INT',
              'INTEGER',
              'INTERVAL',
              'JSON',
              'NATIONAL',
              'NCHAR',
              'NONE',
              'NUMERIC',
              'REAL',
              'SETOF',
              'SMALLINT',
              'TIME',
              'TIMESTAMP',
              'VARCHAR',
            ].includes(word)
        ).map((word) => prec(-1, alias(keyword(word), $.identifier))),
        keyword('NONE'),
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
              parens(seq(keyword('MODULUS'), $._iconst_literal, ',', keyword('REMAINDER'), $._iconst_literal))
            )
          )
        )
      ),

    _partition_range_datum: ($) => choice(keyword('MINVALUE'), keyword('MAXVALUE'), $._expression),

    _table_element: ($) => choice($.column_definition, $._table_constraint, $.table_like_clause),

    _typed_table_element: ($) =>
      choice(
        seq(field('name', $._identifier), optional(keywords('WITH OPTIONS')), repeat($._column_constraint)),
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
        optional(seq(keyword('STORAGE'), choice($._identifier, keyword('DEFAULT')))),
        optional(seq(keyword('COMPRESSION'), choice($._identifier, keyword('DEFAULT')))),
        optional($._create_generic_options),
        choice(
          repeat($._column_constraint),
          seq(repeat($._column_constraint), $.collate_clause, repeat($._column_constraint))
        )
      ),

    collate_clause: ($) => seq(keyword('COLLATE'), field('collation', $.qualified_name)),

    _column_constraint: ($) =>
      seq(
        optional($.constraint_name),
        choice(
          $.null_constraint,
          seq($.not_null_constraint, optional(keywords('NO INHERIT'))),
          $.default_constraint,
          $.generated_identity_constraint,
          $.generated_column_constraint,
          seq($.check_constraint, optional(keywords('NO INHERIT')), optional($._enforced_attr)),
          seq(choice($.unique_constraint, $.primary_key_constraint), optional($._cas_valid_12_0)),
          seq($.foreign_key_clause, optional($._cas_valid_8_0))
        )
      ),

    constraint_name: ($) => seq(keyword('CONSTRAINT'), field('name', $._identifier)),

    _enforced_attr: () => seq(optional(keyword('NOT')), keyword('ENFORCED')),

    ...buildFkConstraintAttrRules('valid'),
    ...buildFkConstraintAttrRules('inherit'),

    null_constraint: () => keyword('NULL'),

    not_null_constraint: () => keywords('NOT NULL'),

    default_constraint: ($) => seq(keyword('DEFAULT'), field('value', $._b_expr)),

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
        optional($.foreign_key_match),
        optional(
          choice(
            seq(alias($._fk_on_delete, $.foreign_key_action), optional(alias($._fk_on_update, $.foreign_key_action))),
            seq(alias($._fk_on_update, $.foreign_key_action), optional(alias($._fk_on_delete, $.foreign_key_action)))
          )
        )
      ),

    _fk_column: ($) => seq(optional(keyword('PERIOD')), $._identifier),

    foreign_key_match: () => seq(keyword('MATCH'), choice(keyword('FULL'), keyword('PARTIAL'), keyword('SIMPLE'))),

    _fk_common_action: () =>
      choice(
        keywords('NO ACTION'),
        keyword('RESTRICT'),
        keyword('CASCADE'),
        seq(keyword('SET'), choice(keyword('NULL'), keyword('DEFAULT')))
      ),

    _fk_delete_action: ($) =>
      choice($._fk_common_action, seq(keyword('SET'), choice(keyword('NULL'), keyword('DEFAULT')), $.column_list)),

    _fk_on_delete: ($) => seq(keywords('ON DELETE'), $._fk_delete_action),

    _fk_on_update: ($) => seq(keywords('ON UPDATE'), $._fk_common_action),

    foreign_key_action: ($) => choice($._fk_on_delete, $._fk_on_update),

    _table_constraint: ($) =>
      seq(
        optional($.constraint_name),
        choice(
          seq($.check_constraint, optional($._table_check_attrs)),
          seq(
            choice(
              alias($._table_unique_constraint, $.unique_constraint),
              alias($._table_primary_key_constraint, $.primary_key_constraint),
              $.exclude_constraint
            ),
            optional($._cas_valid_12_0)
          ),
          seq($.foreign_key_constraint, optional($._cas_valid_0_0)),
          seq(alias($._table_not_null_constraint, $.not_null_constraint), optional($._table_not_null_attrs))
        )
      ),

    _table_not_null_attrs: () =>
      choice(
        seq(keywords('NO INHERIT'), optional(keywords('NOT VALID'))),
        seq(keywords('NOT VALID'), optional(keywords('NO INHERIT')))
      ),

    _table_check_attrs: ($) =>
      choice(
        seq($._enforced_attr, optional($._table_not_null_attrs)),
        seq(
          keywords('NO INHERIT'),
          optional(
            choice(
              seq($._enforced_attr, optional(keywords('NOT VALID'))),
              seq(keywords('NOT VALID'), optional($._enforced_attr))
            )
          )
        ),
        seq(
          keywords('NOT VALID'),
          optional(
            choice(
              seq($._enforced_attr, optional(keywords('NO INHERIT'))),
              seq(keywords('NO INHERIT'), optional($._enforced_attr))
            )
          )
        )
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

    _all_in_tablespace_action: ($) =>
      seq(
        keywords('ALL IN TABLESPACE'),
        $._identifier,
        optional(seq(keywords('OWNED BY'), commaSep1($._role_spec))),
        keywords('SET TABLESPACE'),
        $._identifier,
        optional(keyword('NOWAIT'))
      ),

    alter_table_statement: ($) =>
      choice(
        seq(keywords('ALTER TABLE'), $._all_in_tablespace_action),
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
            seq(keywords('ATTACH PARTITION'), $.qualified_name, $.partition_bound_spec),
            seq(
              keywords('DETACH PARTITION'),
              $.qualified_name,
              optional(choice(keyword('CONCURRENTLY'), keyword('FINALIZE')))
            ),
            commaSep1($._alter_table_cmd)
          )
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
          choice($._identifier, $._iconst_literal),
          keywords('SET STATISTICS'),
          choice($._signed_iconst, keyword('DEFAULT'))
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
            seq(keyword('SET'), parens(commaSep1($._reloption_elem))),
            seq(keyword('RESET'), parens(commaSep1($._col_label))),
            seq(keywords('SET STORAGE'), choice($._identifier, keyword('DEFAULT'))),
            seq(keywords('SET COMPRESSION'), choice($._identifier, keyword('DEFAULT'))),
            $._alter_generic_options
          )
        ),
        seq(keyword('ADD'), $._table_constraint),
        seq(keywords('ALTER CONSTRAINT'), $._identifier, choice(keyword('INHERIT'), $._cas_inherit_0_0)),
        seq(keywords('VALIDATE CONSTRAINT'), $._identifier),
        seq(keywords('DROP CONSTRAINT'), optional($.if_exists), $._identifier, optional($._drop_behavior)),
        seq(
          choice(keyword('DISABLE'), keyword('ENABLE')),
          optional(choice(keyword('REPLICA'), keyword('ALWAYS'))),
          choice(
            seq(keyword('TRIGGER'), choice($._identifier, keyword('ALL'), keyword('USER'))),
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
        seq(optional(keyword('NO')), keywords('DEPENDS ON EXTENSION'), $._identifier),
        $._alter_generic_options
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
        choice(seq($.if_not_exists, field('name', $._identifier)), optional(field('name', $._identifier))),
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
        choice(field('column', $._identifier), $._func_expr_windowless, parens($._expression)),
        optional($.collate_clause),
        optional(seq($.qualified_name, optional(parens(commaSep1($._def_elem))))),
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
              seq(keywords('ATTACH PARTITION'), $.qualified_name),
              commaSep1($._alter_table_cmd)
            )
          ),
          $._all_in_tablespace_action
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

    _create_materialized_view_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('UNLOGGED')),
        keywords('MATERIALIZED VIEW'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        optional($.column_list),
        optional(seq(keyword('USING'), $._identifier)),
        optional($.storage_parameters),
        optional(seq(keyword('TABLESPACE'), $._identifier)),
        keyword('AS'),
        $.select_statement,
        optional($._with_data_clause)
      ),

    create_view_statement: ($) =>
      choice(
        seq(
          keyword('CREATE'),
          optional(keywords('OR REPLACE')),
          optional($.temporary),
          optional(keyword('RECURSIVE')),
          keyword('VIEW'),
          field('name', $.qualified_name),
          optional($.column_list),
          optional($.storage_parameters),
          keyword('AS'),
          $.select_statement,
          optional(
            seq(keyword('WITH'), optional(choice(keyword('CASCADED'), keyword('LOCAL'))), keywords('CHECK OPTION'))
          )
        ),
        $._create_materialized_view_statement
      ),

    refresh_materialized_view_statement: ($) =>
      seq(
        keywords('REFRESH MATERIALIZED VIEW'),
        optional(keyword('CONCURRENTLY')),
        $.qualified_name,
        optional($._with_data_clause)
      ),

    alter_view_statement: ($) =>
      choice(
        seq(keywords('ALTER MATERIALIZED VIEW'), $._all_in_tablespace_action),
        seq(
          keyword('ALTER'),
          optional(keyword('MATERIALIZED')),
          keyword('VIEW'),
          optional($.if_exists),
          $.qualified_name,
          choice(
            seq(keyword('RENAME'), optional(keyword('COLUMN')), $._identifier, keyword('TO'), $._identifier),
            seq(keywords('RENAME TO'), $._identifier),
            seq(keywords('SET SCHEMA'), $._identifier),
            commaSep1($._alter_table_cmd)
          )
        )
      ),

    // SCHEMA

    _schema_target: ($) =>
      choice(
        seq(field('name', $._identifier), optional(seq(keyword('AUTHORIZATION'), $._role_spec))),
        seq(keyword('AUTHORIZATION'), $._role_spec)
      ),

    create_schema_statement: ($) =>
      prec.right(
        seq(
          keywords('CREATE SCHEMA'),
          choice(
            seq($.if_not_exists, $._schema_target),
            seq(
              $._schema_target,
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
                seq(keyword('RANGE'), parens(commaSep1($._def_elem)))
              )
            ),
            parens(commaSep1($._def_elem))
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
        choice(
          repeat($._domain_constraint),
          seq(repeat($._domain_constraint), $.collate_clause, repeat($._domain_constraint))
        )
      ),

    _domain_constraint: ($) =>
      choice(
        $.default_constraint,
        seq(optional($.constraint_name), choice($.null_constraint, $.not_null_constraint, $.check_constraint))
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
            choice($.not_null_constraint, seq($.check_constraint, optional(keywords('NOT VALID'))))
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
        seq(keyword('AGGREGATE'), alias($._func_qualified_name, $.qualified_name), $._aggregate_signature),
        seq(keyword('CAST'), parens(seq($.type_name, keyword('AS'), $.type_name))),
        seq(keyword('COLLATION'), $.qualified_name),
        seq(keyword('CONVERSION'), $.qualified_name),
        seq(keyword('DOMAIN'), $.qualified_name),
        seq(keywords('EVENT TRIGGER'), $._identifier),
        seq(keywords('FOREIGN DATA WRAPPER'), $._identifier),
        seq(keywords('FOREIGN TABLE'), $.qualified_name),
        seq(
          choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
          alias($._func_qualified_name, $.qualified_name),
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

    // LANGUAGE & LARGE OBJECT

    create_language_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        optional(keyword('TRUSTED')),
        optional(keyword('PROCEDURAL')),
        keyword('LANGUAGE'),
        field('name', $._identifier),
        optional(
          seq(
            keyword('HANDLER'),
            $.qualified_name,
            optional(seq(keyword('INLINE'), $.qualified_name)),
            optional(choice(seq(keyword('VALIDATOR'), $.qualified_name), keywords('NO VALIDATOR')))
          )
        )
      ),

    alter_language_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional(keyword('PROCEDURAL')),
        keyword('LANGUAGE'),
        field('name', $._identifier),
        choice(seq(keywords('RENAME TO'), $._identifier), seq(keywords('OWNER TO'), $._role_spec))
      ),

    alter_large_object_statement: ($) =>
      seq(keywords('ALTER LARGE OBJECT'), $.numeric_literal, keywords('OWNER TO'), $._role_spec),

    // FUNCTION / PROCEDURE / ROUTINE

    create_function_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        choice(
          seq(
            keyword('FUNCTION'),
            field('name', alias($._func_qualified_name, $.qualified_name)),
            parens(commaSep($.function_parameter)),
            optional(
              seq(
                keyword('RETURNS'),
                choice(seq(keyword('TABLE'), parens(commaSep1($.table_func_column))), $._func_type)
              )
            )
          ),
          seq(
            keyword('PROCEDURE'),
            field('name', alias($._func_qualified_name, $.qualified_name)),
            parens(commaSep($.function_parameter))
          )
        ),
        repeat($._routine_option),
        optional($.sql_function_body)
      ),

    _arg_class: () => choice(keyword('IN'), keyword('OUT'), keyword('INOUT'), keyword('VARIADIC')),

    function_parameter: ($) =>
      seq(
        choice(
          seq($._arg_class, optional(field('name', $._func_identifier)), field('type', $._func_type)),
          seq(field('name', $._func_identifier), optional($._arg_class), field('type', $._func_type)),
          field('type', $._func_type)
        ),
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
        seq(keyword('RESET'), $._reset_target),
        seq(keyword('AS'), $.string_literal, optional(seq(',', $.string_literal)))
      ),

    sql_function_body: ($) =>
      choice(
        seq(keyword('RETURN'), $._expression),
        seq(
          keywords('BEGIN ATOMIC'),
          repeat(seq(choice($._subquery_preparable_statement, seq(keyword('RETURN'), $._expression)), ';')),
          keyword('END')
        )
      ),

    _routine_arg_types: ($) => parens(commaSep($.function_parameter)),

    alter_routine_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE'), keyword('ROUTINE')),
        alias($._func_qualified_name, $.qualified_name),
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
        choice(
          seq(
            optional(keywords('OR REPLACE')),
            keyword('TRIGGER'),
            field('name', $._identifier),
            choice(keyword('BEFORE'), keyword('AFTER'), keywords('INSTEAD OF')),
            $._trigger_events,
            keyword('ON'),
            field('table', $.qualified_name),
            optional(
              seq(
                keyword('REFERENCING'),
                repeat1(
                  seq(choice(keyword('OLD'), keyword('NEW')), keyword('TABLE'), optional(keyword('AS')), $._identifier)
                )
              )
            ),
            optional(seq(keyword('FOR'), optional(keyword('EACH')), choice(keyword('ROW'), keyword('STATEMENT'))))
          ),
          seq(
            keywords('CONSTRAINT TRIGGER'),
            field('name', $._identifier),
            keyword('AFTER'),
            $._trigger_events,
            keyword('ON'),
            field('table', $.qualified_name),
            optional(seq(keyword('FROM'), $.qualified_name)),
            optional($._cas_valid_12_0),
            keywords('FOR EACH ROW')
          )
        ),
        optional(seq(keyword('WHEN'), parens($._expression))),
        keyword('EXECUTE'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE')),
        alias($._func_qualified_name, $.qualified_name),
        parens(commaSep($._trigger_func_arg))
      ),

    _trigger_func_arg: ($) => choice($.numeric_literal, $.string_literal, $._col_label),

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

    _event_trigger_filter: ($) => seq($._identifier, keyword('IN'), parens(commaSep1($.string_literal))),

    create_event_trigger_statement: ($) =>
      seq(
        keywords('CREATE EVENT TRIGGER'),
        field('name', $._identifier),
        keyword('ON'),
        $._identifier,
        optional(seq(keyword('WHEN'), $._event_trigger_filter, repeat(seq(keyword('AND'), $._event_trigger_filter)))),
        keyword('EXECUTE'),
        choice(keyword('FUNCTION'), keyword('PROCEDURE')),
        alias($._func_qualified_name, $.qualified_name),
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
        optional(choice(keywords('FOR ALL TABLES'), seq(keyword('FOR'), $._publication_obj_list))),
        optional($.storage_parameters)
      ),

    _publication_obj_list: ($) =>
      seq($._publication_obj_spec, repeat(seq(',', choice($._publication_obj_spec, $._publication_obj_cont)))),

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

    _publication_obj_cont: ($) =>
      choice(
        seq($._relation_expr, optional($.column_list), optional(seq(keyword('WHERE'), parens($._expression)))),
        keyword('CURRENT_SCHEMA')
      ),

    alter_publication_statement: ($) =>
      seq(
        keywords('ALTER PUBLICATION'),
        $._identifier,
        choice(
          seq(choice(keyword('ADD'), keyword('SET'), keyword('DROP')), $._publication_obj_list),
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
        repeat($._create_role_option)
      ),

    _alter_role_option: ($) =>
      choice(
        keyword('SUPERUSER'),
        keyword('NOSUPERUSER'),
        keyword('CREATEDB'),
        keyword('NOCREATEDB'),
        keyword('CREATEROLE'),
        keyword('NOCREATEROLE'),
        keyword('INHERIT'),
        keyword('NOINHERIT'),
        keyword('LOGIN'),
        keyword('NOLOGIN'),
        keyword('REPLICATION'),
        keyword('NOREPLICATION'),
        keyword('BYPASSRLS'),
        keyword('NOBYPASSRLS'),
        alias($._quoted_role_option, $.quoted_identifier),
        seq(keyword('ENCRYPTED'), keyword('PASSWORD'), $.string_literal),
        seq(keyword('PASSWORD'), choice($.string_literal, keyword('NULL'))),
        seq(keywords('VALID UNTIL'), $.string_literal),
        seq(keywords('CONNECTION LIMIT'), $._signed_iconst),
        seq(keyword('USER'), commaSep1($._role_spec))
      ),

    _create_role_option: ($) =>
      choice(
        $._alter_role_option,
        seq(keyword('SYSID'), $._iconst_literal),
        seq(choice(keyword('ADMIN'), keyword('ROLE')), commaSep1($._role_spec)),
        seq(keyword('IN'), choice(keyword('ROLE'), keyword('GROUP')), commaSep1($._role_spec))
      ),

    _role_set_or_reset: ($) => choice($.set_statement, seq(keyword('RESET'), $._reset_target)),

    alter_role_statement: ($) =>
      choice(
        seq(
          keyword('ALTER'),
          choice(keyword('ROLE'), keyword('USER')),
          choice(
            seq(
              $._role_spec,
              choice(
                seq(keywords('RENAME TO'), $._identifier),
                seq(optional(keyword('WITH')), repeat($._alter_role_option)),
                seq(optional(seq(keywords('IN DATABASE'), $._identifier)), $._role_set_or_reset)
              )
            ),
            seq(keyword('ALL'), optional(seq(keywords('IN DATABASE'), $._identifier)), $._role_set_or_reset)
          )
        ),
        seq(
          keywords('ALTER GROUP'),
          $._role_spec,
          choice(
            seq(keywords('RENAME TO'), $._identifier),
            seq(choice(keyword('ADD'), keyword('DROP')), keyword('USER'), commaSep1($._role_spec))
          )
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
          seq(keyword('RESET'), $._reset_target),
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

    _alter_system_set: ($) => seq(keyword('SET'), $._generic_set),

    alter_system_statement: ($) =>
      seq(
        keywords('ALTER SYSTEM'),
        choice(
          alias($._alter_system_set, $.set_statement),
          seq(keyword('RESET'), choice($.qualified_name, keyword('ALL')))
        )
      ),

    // FOREIGN DATA WRAPPER / SERVER / FOREIGN TABLE / USER MAPPING / IMPORT FOREIGN SCHEMA

    _create_generic_options: ($) => seq(keyword('OPTIONS'), parens(commaSep1(seq($._col_label, $.string_literal)))),

    _alter_generic_option_name: ($) =>
      choice(
        $._col_label,
        alias(keyword('ADD'), $.identifier),
        alias(keyword('SET'), $.identifier),
        alias(keyword('DROP'), $.identifier)
      ),

    _alter_generic_options: ($) =>
      seq(
        keyword('OPTIONS'),
        parens(
          commaSep1(
            choice(
              seq($._alter_generic_option_name, $.string_literal),
              seq(choice(keyword('ADD'), keyword('SET')), $._col_label, $.string_literal),
              seq(keyword('DROP'), $._col_label)
            )
          )
        )
      ),

    _fdw_handler_option: ($) => choice(seq(keyword('HANDLER'), $.qualified_name), keywords('NO HANDLER')),

    _fdw_validator_option: ($) => choice(seq(keyword('VALIDATOR'), $.qualified_name), keywords('NO VALIDATOR')),

    _fdw_options: ($) =>
      choice(
        seq($._fdw_handler_option, optional($._fdw_validator_option)),
        seq($._fdw_validator_option, optional($._fdw_handler_option))
      ),

    create_foreign_data_wrapper_statement: ($) =>
      seq(
        keywords('CREATE FOREIGN DATA WRAPPER'),
        field('name', $._identifier),
        optional($._fdw_options),
        optional($._create_generic_options)
      ),

    alter_foreign_data_wrapper_statement: ($) =>
      seq(
        keywords('ALTER FOREIGN DATA WRAPPER'),
        $._identifier,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq($._fdw_options, optional($._alter_generic_options)),
          $._alter_generic_options
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
        optional($._create_generic_options)
      ),

    alter_server_statement: ($) =>
      seq(
        keywords('ALTER SERVER'),
        $._identifier,
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('RENAME TO'), $._identifier),
          seq(keyword('VERSION'), $.string_literal, optional($._alter_generic_options)),
          $._alter_generic_options
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
        optional($._create_generic_options)
      ),

    create_user_mapping_statement: ($) =>
      seq(
        keywords('CREATE USER MAPPING'),
        optional($.if_not_exists),
        keyword('FOR'),
        choice($._role_spec, keyword('USER')),
        keyword('SERVER'),
        $._identifier,
        optional($._create_generic_options)
      ),

    alter_user_mapping_statement: ($) =>
      seq(
        keywords('ALTER USER MAPPING FOR'),
        choice($._role_spec, keyword('USER')),
        keyword('SERVER'),
        $._identifier,
        $._alter_generic_options
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
        optional($._create_generic_options)
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

    _aggr_arg_class: () => choice(keyword('IN'), keyword('VARIADIC')),

    _aggregate_arg: ($) =>
      choice(
        seq($._aggr_arg_class, optional(field('name', $._func_identifier)), field('type', $._func_type)),
        seq(field('name', $._func_identifier), optional($._aggr_arg_class), field('type', $._func_type)),
        field('type', $._func_type)
      ),

    create_aggregate_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        keyword('AGGREGATE'),
        field('name', alias($._func_qualified_name, $.qualified_name)),
        choice(
          seq($._aggregate_signature, parens(commaSep1($._def_elem))),
          parens(seq($._col_label, '=', $._def_arg, repeat(seq(',', $._def_elem))))
        )
      ),

    alter_aggregate_statement: ($) =>
      seq(
        keywords('ALTER AGGREGATE'),
        alias($._func_qualified_name, $.qualified_name),
        $._aggregate_signature,
        choice(
          seq(keywords('RENAME TO'), $._identifier),
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier)
        )
      ),

    create_operator_statement: ($) => seq(keywords('CREATE OPERATOR'), $._any_operator, parens(commaSep1($._def_elem))),

    alter_operator_statement: ($) =>
      seq(
        keywords('ALTER OPERATOR'),
        $._any_operator,
        parens(seq(choice($.type_name, keyword('NONE')), ',', choice($.type_name, keyword('NONE')))),
        choice(
          seq(keywords('OWNER TO'), $._role_spec),
          seq(keywords('SET SCHEMA'), $._identifier),
          seq(keyword('SET'), parens(commaSep1($._def_elem)))
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
          $._iconst_literal,
          $._any_operator,
          optional(parens(commaSep1($.type_name))),
          optional(choice(keywords('FOR SEARCH'), seq(keywords('FOR ORDER BY'), $.qualified_name)))
        ),
        seq(
          keyword('FUNCTION'),
          $._iconst_literal,
          optional(parens(commaSep1($.type_name))),
          alias($._func_qualified_name, $.qualified_name),
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
        seq(choice(keyword('OPERATOR'), keyword('FUNCTION')), $._iconst_literal, parens(commaSep1($.type_name)))
      ),

    create_cast_statement: ($) =>
      seq(
        keywords('CREATE CAST'),
        parens(seq($.type_name, keyword('AS'), $.type_name)),
        choice(
          seq(
            keywords('WITH FUNCTION'),
            alias($._func_qualified_name, $.qualified_name),
            optional($._routine_arg_types)
          ),
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
        choice(seq(keyword('FROM'), $.qualified_name), parens(commaSep1($._def_elem)))
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
              seq(
                keywords('FROM SQL WITH FUNCTION'),
                alias($._func_qualified_name, $.qualified_name),
                optional($._routine_arg_types)
              ),
              seq(
                keywords('TO SQL WITH FUNCTION'),
                alias($._func_qualified_name, $.qualified_name),
                optional($._routine_arg_types)
              )
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
        parens(commaSep1($._def_elem))
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
              parens(commaSep1($._def_elem)),
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
        commaSep1(choice($._identifier, $._func_expr_windowless, parens($._expression))),
        keyword('FROM'),
        $.qualified_name
      ),

    alter_statistics_statement: ($) =>
      seq(
        keywords('ALTER STATISTICS'),
        choice(
          seq(
            $.qualified_name,
            choice(
              seq(keywords('OWNER TO'), $._role_spec),
              seq(keywords('RENAME TO'), $._identifier),
              seq(keywords('SET SCHEMA'), $._identifier)
            )
          ),
          seq(
            optional($.if_exists),
            $.qualified_name,
            keywords('SET STATISTICS'),
            choice($._signed_iconst, keyword('DEFAULT'))
          )
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
            commaSep1(seq(alias($._func_qualified_name, $.qualified_name), optional($._routine_arg_types))),
            optional($._drop_behavior)
          ),
          seq(
            keyword('AGGREGATE'),
            optional($.if_exists),
            commaSep1(seq(alias($._func_qualified_name, $.qualified_name), $._aggregate_signature)),
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
          alias($._func_qualified_name, $.qualified_name),
          optional($._routine_arg_types)
        ),
        seq(keyword('AGGREGATE'), alias($._func_qualified_name, $.qualified_name), $._aggregate_signature),
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

    _grantee: ($) => choice($._role_spec, seq(keyword('GROUP'), $._role_spec)),

    _default_priv_target: () =>
      choice(
        keyword('TABLES'),
        keyword('SEQUENCES'),
        keyword('FUNCTIONS'),
        keyword('ROUTINES'),
        keyword('TYPES'),
        keyword('SCHEMAS'),
        keywords('LARGE OBJECTS')
      ),

    grant_statement: ($) =>
      seq(
        keyword('GRANT'),
        choice(
          seq(
            $._privileges,
            keyword('ON'),
            $._privilege_target,
            keyword('TO'),
            commaSep1($._grantee),
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
            commaSep1($._grantee),
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
            $._default_priv_target,
            keyword('TO'),
            commaSep1($._grantee),
            optional(keywords('WITH GRANT OPTION'))
          ),
          seq(
            keyword('REVOKE'),
            optional(keywords('GRANT OPTION FOR')),
            $._privileges,
            keywords('ON'),
            $._default_priv_target,
            keyword('FROM'),
            commaSep1($._grantee),
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
          commaSep1(seq(alias($._func_qualified_name, $.qualified_name), optional($._routine_arg_types)))
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

    _var_value: ($) =>
      choice(
        $.boolean_literal,
        keyword('ON'),
        $.string_literal,
        $.numeric_literal,
        alias($._signed_numeric_literal, $.unary_expression),
        $._non_reserved_word
      ),

    _generic_set: ($) =>
      choice(
        seq($.qualified_name, choice('=', keyword('TO')), choice(keyword('DEFAULT'), commaSep1($._var_value))),
        seq($.qualified_name, keywords('FROM CURRENT'))
      ),

    set_statement: ($) =>
      seq(
        keyword('SET'),
        optional(choice(keyword('SESSION'), keyword('LOCAL'))),
        choice(
          seq(keywords('TIME ZONE'), choice($._expression, keyword('LOCAL'), keyword('DEFAULT'))),
          seq(keywords('TRANSACTION SNAPSHOT'), $.string_literal),
          seq(
            choice(keyword('TRANSACTION'), keywords('SESSION CHARACTERISTICS AS TRANSACTION')),
            $._transaction_mode_list
          ),
          seq(
            keywords('CONSTRAINTS'),
            choice(keyword('ALL'), commaSep1($.qualified_name)),
            choice(keyword('DEFERRED'), keyword('IMMEDIATE'))
          ),
          seq(keywords('SESSION AUTHORIZATION'), choice($._role_spec, $.string_literal, keyword('DEFAULT'))),
          seq(keyword('ROLE'), choice($._role_spec, $.string_literal, keyword('NONE'))),
          seq(keyword('NAMES'), optional(choice($.string_literal, keyword('DEFAULT')))),
          seq(keyword('SCHEMA'), $.string_literal),
          seq(keywords('XML OPTION'), choice(keyword('DOCUMENT'), keyword('CONTENT'))),
          $._generic_set
        )
      ),

    _reset_target: ($) =>
      choice(
        keywords('TIME ZONE'),
        keywords('TRANSACTION ISOLATION LEVEL'),
        keywords('SESSION AUTHORIZATION'),
        keyword('ROLE'),
        keyword('ALL'),
        $.qualified_name
      ),

    reset_statement: ($) => seq(keyword('RESET'), $._reset_target),

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

    _transaction_mode_list: ($) => seq($._transaction_mode, repeat(seq(optional(','), $._transaction_mode))),

    begin_statement: ($) =>
      seq(
        choice(
          seq(keyword('BEGIN'), optional(choice(keyword('WORK'), keyword('TRANSACTION')))),
          keywords('START TRANSACTION')
        ),
        optional($._transaction_mode_list)
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
        choice(
          seq(
            parens(commaSep1($._utility_option)),
            optional(seq($.qualified_name, optional(seq(keyword('USING'), $._identifier))))
          ),
          seq(
            optional(keyword('VERBOSE')),
            optional(
              choice(
                seq($.qualified_name, optional(seq(keyword('USING'), $._identifier))),
                seq($._identifier, keyword('ON'), $.qualified_name)
              )
            )
          )
        )
      ),

    reindex_statement: ($) =>
      seq(
        keyword('REINDEX'),
        optional(parens(commaSep1($._utility_option))),
        choice(
          seq(choice(keyword('INDEX'), keyword('TABLE')), optional(keyword('CONCURRENTLY')), $.qualified_name),
          seq(keyword('SCHEMA'), optional(keyword('CONCURRENTLY')), $._identifier),
          seq(
            choice(keyword('DATABASE'), keyword('SYSTEM')),
            optional(keyword('CONCURRENTLY')),
            optional($._identifier)
          )
        )
      ),

    _copy_target: ($) =>
      choice(seq(optional(keyword('PROGRAM')), $.string_literal), keyword('STDIN'), keyword('STDOUT')),

    copy_statement: ($) =>
      seq(
        keyword('COPY'),
        choice(
          seq(
            optional(keyword('BINARY')),
            $.qualified_name,
            optional($.column_list),
            choice(
              seq(
                keyword('FROM'),
                $._copy_target,
                optional(seq(optional(keyword('USING')), keyword('DELIMITERS'), $.string_literal)),
                ...copyOptions($),
                optional($.where_clause)
              ),
              seq(
                keyword('TO'),
                $._copy_target,
                optional(seq(optional(keyword('USING')), keyword('DELIMITERS'), $.string_literal)),
                ...copyOptions($)
              )
            )
          ),
          seq(parens($._subquery_preparable_statement), keyword('TO'), $._copy_target, ...copyOptions($))
        )
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
        seq(choice(keyword('ABSOLUTE'), keyword('RELATIVE')), $._signed_iconst),
        $._signed_iconst,
        keyword('ALL'),
        prec.right(
          seq(choice(keyword('FORWARD'), keyword('BACKWARD')), optional(choice($._signed_iconst, keyword('ALL'))))
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

    _func_type: ($) =>
      choice(
        seq(optional(keyword('SETOF')), $.type_name),
        seq(optional(keyword('SETOF')), alias($._percent_type, $.type_name))
      ),

    _percent_type: ($) =>
      seq(choice($._column_identifier, $._func_identifier), repeat1(seq('.', $._col_label)), '%', keyword('TYPE')),

    type_name: ($) =>
      prec.right(
        PREC.POSTFIX + 1,
        seq(
          $._simple_type,
          optional(
            choice(
              repeat1(seq('[', optional($._iconst_literal), ']')),
              seq(keyword('ARRAY'), optional(seq('[', $._iconst_literal, ']')))
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
        seq(keyword('FLOAT'), optional(parens($._iconst_literal))),
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
          optional(parens($._iconst_literal))
        ),
        seq(choice(keywords('BIT VARYING'), keyword('BIT')), optional(parens($.numeric_literal))),
        seq(
          choice(keyword('TIMESTAMP'), keyword('TIME')),
          optional(parens($._iconst_literal)),
          optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keywords('TIME ZONE')))
        ),
        keyword('JSON'),
        $._qualified_type_name
      ),

    _qualified_type_name: ($) => seq($._func_name, optional($._type_modifiers)),

    _type_modifiers: ($) => parens(commaSep1($._expression)),

    _interval_qualifier: ($) =>
      choice(seq($._interval_fields, optional(parens($._iconst_literal))), parens($._iconst_literal)),

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

    _expression: ($) => choice($._not_expr, $.binary_expression),

    _not_expr: ($) => choice($._is_expr, $.unary_expression),

    _is_expr: ($) => choice($._cmp_expr, alias($._open_is_expression, $.is_expression), $._closed_is),

    _cmp_expr: ($) => choice($._pattern_expr, alias($._cmp_binary_expression, $.binary_expression), $._closed_cmp),

    _pattern_expr: ($) => choice($._tight_expr, $.between_expression, $.like_expression, $._closed_pattern),

    _tight_expr: ($) =>
      choice(
        $._primary_expr,
        alias($._typecast_expression, $.cast_expression),
        $.at_time_zone_expression,
        $.collate_expression,
        alias($._tight_unary_expression, $.unary_expression),
        alias($._tight_binary_expression, $.binary_expression),
        alias($._tight_quantified_expression, $.quantified_comparison_expression)
      ),

    _closed_pattern: ($) =>
      choice($.in_expression, alias($._quantified_like_expression, $.like_expression), $.overlaps_expression),

    _closed_cmp: ($) => $.quantified_comparison_expression,

    _closed_is: ($) => alias($._postfix_is_expression, $.is_expression),

    _b_expr: ($) => choice($._b_cmp_expr, alias($._b_open_is_expression, $.is_expression), $._b_closed_expr),

    _b_cmp_expr: ($) => choice($._b_arith_expr, alias($._b_cmp_binary_expression, $.binary_expression)),

    _b_arith_expr: ($) =>
      choice(
        $._primary_expr,
        alias($._b_typecast_expression, $.cast_expression),
        alias($._b_unary_expression, $.unary_expression),
        alias($._b_arith_binary_expression, $.binary_expression)
      ),

    _b_closed_expr: ($) => alias($._b_postfix_is_expression, $.is_expression),

    _primary_expr: ($) => choice($._c_expr, prec(-1, $.table_columns)),

    _c_expr: ($) =>
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
        $.collation_for_expression,
        $.json_expression,
        $.xml_expression,
        $.field_selection,
        $.subscript_expression
      ),

    _func_expr_windowless: ($) =>
      choice(
        alias($._windowless_function_call, $.function_call),
        $.current_value,
        $.cast_expression,
        $.extract_expression,
        $.substring_expression,
        $.trim_expression,
        $.position_expression,
        $.overlay_expression,
        $.normalize_expression,
        $.collation_for_expression,
        alias($._windowless_json_expression, $.json_expression),
        $.xml_expression
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
          optional(parens($._iconst_literal))
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

    _selectable_atom: ($) =>
      choice(
        $.positional_parameter,
        $.parenthesized_expression,
        $.subquery,
        $.subscript_expression,
        alias($._three_part_column_reference, $.column_reference),
        alias($._attr_selection, $.field_selection)
      ),

    _indirection_atom: ($) =>
      choice(
        $.column_reference,
        $.positional_parameter,
        $.parenthesized_expression,
        $.subquery,
        $.subscript_expression,
        alias($._attr_selection, $.field_selection)
      ),

    _attr_selection: ($) =>
      prec.left(PREC.POSTFIX, seq(field('value', $._selectable_atom), '.', field('field', $._col_label))),

    field_selection: ($) =>
      choice(
        $._attr_selection,
        prec.left(PREC.POSTFIX, seq(field('value', $._selectable_atom), '.', field('field', alias('*', $.all_columns))))
      ),

    subscript_expression: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(
          field('value', $._indirection_atom),
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
        seq('(', $._expression, ',', commaSep1($._expression), ')'),
        seq(keyword('ROW'), parens(commaSep($._expression)))
      ),

    array_expression: ($) => seq(keyword('ARRAY'), choice($._array_elements, parens($.select_statement))),

    _array_elements: ($) => seq('[', optional(choice(commaSep1($._expression), commaSep1($._array_elements))), ']'),

    subquery: ($) => parens($.select_statement),

    exists_expression: ($) => seq(keyword('EXISTS'), parens($.select_statement)),

    // Function calls & special SQL functions

    _function_call_head: ($) =>
      seq(
        field('name', $._func_name),
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
        optional($.filter_clause)
      ),

    _special_function_call: ($) =>
      choice(
        seq(
          field('name', alias($._col_name_function_keyword, $.identifier)),
          parens(commaSep1(alias($._expression, $.function_argument)))
        ),
        seq(
          field('name', alias(keyword('NULLIF'), $.identifier)),
          parens(seq(alias($._expression, $.function_argument), ',', alias($._expression, $.function_argument)))
        ),
        seq(field('name', alias(keyword('MERGE_ACTION'), $.identifier)), seq('(', ')'))
      ),

    _windowless_function_call: ($) => choice($._function_call_head, $._special_function_call),

    function_call: ($) => choice(seq($._function_call_head, optional($.over_clause)), $._special_function_call),

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
      seq(
        choice(keyword('CAST'), keyword('TREAT')),
        parens(seq(field('value', $._expression), keyword('AS'), field('type', $.type_name)))
      ),

    _typecast_expression: ($) =>
      prec.left(PREC.POSTFIX, seq(field('value', tightLhs($)), '::', field('type', $.type_name))),

    _b_typecast_expression: ($) =>
      prec.left(PREC.POSTFIX, seq(field('value', bArithLhs($)), '::', field('type', $.type_name))),

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
                seq(
                  keyword('FOR'),
                  field('for', $._expression),
                  optional(seq(keyword('FROM'), field('from', $._expression)))
                )
              )
            ),
            prec(
              PREC.PATTERN,
              seq(
                field('source', tightLhs($)),
                keyword('SIMILAR'),
                field('pattern', $._expression),
                keyword('ESCAPE'),
                field('escape', $._expression)
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
      seq(keyword('POSITION'), parens(seq(field('substring', $._b_expr), keyword('IN'), field('source', $._b_expr)))),

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

    collation_for_expression: ($) => seq(keywords('COLLATION FOR'), parens($._expression)),

    // SQL/JSON & XML

    _json_objectagg_head: ($) =>
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
        optional($.filter_clause)
      ),

    _json_arrayagg_head: ($) =>
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
        optional($.filter_clause)
      ),

    _json_scalar_or_query_expression: ($) =>
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

    _windowless_json_expression: ($) =>
      choice($._json_scalar_or_query_expression, $._json_objectagg_head, $._json_arrayagg_head),

    json_expression: ($) =>
      choice(
        $._json_scalar_or_query_expression,
        seq($._json_objectagg_head, optional($.over_clause)),
        seq($._json_arrayagg_head, optional($.over_clause))
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

    _xml_passing_mech: () => choice(keywords('BY REF'), keywords('BY VALUE')),

    _xml_passing: ($) =>
      seq(keyword('PASSING'), optional($._xml_passing_mech), $._expression, optional($._xml_passing_mech)),

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
              seq(keyword('PATH'), $._b_expr),
              seq(keyword('DEFAULT'), $._b_expr),
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
          field('value', tightLhs($)),
          choice(seq(keywords('AT TIME ZONE'), field('zone', tightRhs($))), keywords('AT LOCAL'))
        )
      ),

    collate_expression: ($) =>
      prec.left(
        PREC.COLLATE,
        seq(field('value', tightLhs($)), keyword('COLLATE'), field('collation', $.qualified_name))
      ),

    unary_expression: ($) =>
      prec.right(PREC.NOT, seq(repeat1(field('operator', keyword('NOT'))), field('operand', $._is_expr))),

    _tight_unary_expression: ($) =>
      choice(
        prec.right(PREC.UNARY, seq(field('operator', choice('+', '-')), field('operand', tightRhs($)))),
        prec.left(
          PREC.OP,
          seq(field('operator', choice($.custom_operator, $.operator_invocation)), field('operand', tightRhs($)))
        )
      ),

    _b_unary_expression: ($) =>
      choice(
        prec.right(PREC.UNARY, seq(field('operator', choice('+', '-')), field('operand', $._b_arith_expr))),
        prec.left(
          PREC.OP,
          seq(field('operator', choice($.custom_operator, $.operator_invocation)), field('operand', $._b_arith_expr))
        )
      ),

    operator_invocation: ($) =>
      seq(keyword('OPERATOR'), parens(seq(repeat(seq($._column_identifier, '.')), $._all_op))),

    _any_operator: ($) => choice(seq(repeat(seq($._column_identifier, '.')), $._all_op), $.operator_invocation),

    _all_op: ($) => choice('+', '-', '*', '/', '%', '^', '<', '>', '=', '<=', '>=', '<>', '!=', $.custom_operator),

    _cmp_operator: () => choice('=', '<>', '!=', '<', '<=', '>', '>='),

    binary_expression: ($) =>
      choice(leftBinary($._expression, PREC.OR, keyword('OR')), leftBinary($._expression, PREC.AND, keyword('AND'))),

    _cmp_binary_expression: ($) => leftBinaryAsym(patternLhs($), patternRhs($), PREC.COMPARISON, $._cmp_operator),

    _tight_binary_expression: ($) =>
      choice(
        leftBinaryAsym(tightLhs($), tightRhs($), PREC.OP, choice($.custom_operator, $.operator_invocation)),
        leftBinaryAsym(tightLhs($), tightRhs($), PREC.ADDITIVE, choice('+', '-')),
        leftBinaryAsym(tightLhs($), tightRhs($), PREC.MULTIPLICATIVE, choice('*', '/', '%')),
        leftBinaryAsym(tightLhs($), tightRhs($), PREC.EXPONENT, '^')
      ),

    _b_arith_binary_expression: ($) =>
      choice(
        leftBinaryAsym(bArithLhs($), $._b_arith_expr, PREC.OP, choice($.custom_operator, $.operator_invocation)),
        leftBinaryAsym(bArithLhs($), $._b_arith_expr, PREC.ADDITIVE, choice('+', '-')),
        leftBinaryAsym(bArithLhs($), $._b_arith_expr, PREC.MULTIPLICATIVE, choice('*', '/', '%')),
        leftBinaryAsym(bArithLhs($), $._b_arith_expr, PREC.EXPONENT, '^')
      ),

    _b_cmp_binary_expression: ($) => leftBinaryAsym(bArithLhs($), $._b_arith_expr, PREC.COMPARISON, $._cmp_operator),

    _quantifier_tail: ($) =>
      seq(
        field('quantifier', choice(keyword('ANY'), keyword('SOME'), keyword('ALL'))),
        parens(choice($.select_statement, $._expression))
      ),

    quantified_comparison_expression: ($) =>
      prec.left(
        PREC.COMPARISON,
        seq(field('left', patternLhs($)), field('operator', $._cmp_operator), $._quantifier_tail)
      ),

    _tight_quantified_expression: ($) => {
      /** @type {[number, RuleOrLiteral][]} */
      const operators = [
        [PREC.OP, choice($.custom_operator, $.operator_invocation)],
        [PREC.ADDITIVE, choice('+', '-')],
        [PREC.MULTIPLICATIVE, choice('*', '/', '%')],
        [PREC.EXPONENT, '^'],
      ];
      return choice(
        ...operators.map(([precedence, operator]) =>
          prec.left(precedence, seq(field('left', tightLhs($)), field('operator', operator), $._quantifier_tail))
        )
      );
    },

    between_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('value', tightLhs($)),
          optional(keyword('NOT')),
          keyword('BETWEEN'),
          optional(choice(keyword('SYMMETRIC'), keyword('ASYMMETRIC'))),
          field('low', $._b_expr),
          keyword('AND'),
          field('high', tightRhs($))
        )
      ),

    in_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('value', tightLhs($)),
          optional(keyword('NOT')),
          keyword('IN'),
          parens(choice($.select_statement, commaSep1($._expression)))
        )
      ),

    like_expression: ($) =>
      prec.right(
        PREC.PATTERN,
        seq(
          field('left', tightLhs($)),
          optional(keyword('NOT')),
          field('operator', choice(keyword('LIKE'), keyword('ILIKE'), keywords('SIMILAR TO'))),
          field('right', tightRhs($)),
          optional(seq(keyword('ESCAPE'), field('escape', tightRhs($))))
        )
      ),

    _quantified_like_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(
          field('left', tightLhs($)),
          optional(keyword('NOT')),
          field('operator', choice(keyword('LIKE'), keyword('ILIKE'))),
          $._quantifier_tail
        )
      ),

    overlaps_expression: ($) =>
      prec.left(
        PREC.PATTERN,
        seq(field('left', $.row_expression), keyword('OVERLAPS'), field('right', $.row_expression))
      ),

    _postfix_is_expression: ($) =>
      prec.left(
        PREC.IS,
        choice(
          seq(field('value', cmpLhs($)), choice(keyword('ISNULL'), keyword('NOTNULL'))),
          seq(
            field('value', cmpLhs($)),
            keyword('IS'),
            optional(keyword('NOT')),
            choice(
              $.null,
              $.boolean_literal,
              keyword('UNKNOWN'),
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

    _open_is_expression: ($) =>
      prec.left(
        PREC.IS,
        seq(
          field('value', cmpLhs($)),
          keyword('IS'),
          optional(keyword('NOT')),
          keywords('DISTINCT FROM'),
          field('right', cmpRhs($))
        )
      ),

    _b_postfix_is_expression: ($) =>
      prec.left(PREC.IS, seq(field('value', bCmpLhs($)), keyword('IS'), optional(keyword('NOT')), keyword('DOCUMENT'))),

    _b_open_is_expression: ($) =>
      prec.left(
        PREC.IS,
        seq(
          field('value', bCmpLhs($)),
          keyword('IS'),
          optional(keyword('NOT')),
          keywords('DISTINCT FROM'),
          field('right', $._b_cmp_expr)
        )
      ),

    // =========================================================================
    // Identifiers & Literals
    // =========================================================================

    _func_qualified_name: ($) =>
      choice(
        field('name', choice($._func_identifier, $._illegal)),
        seq(field('schema', $._column_identifier), '.', field('name', $._col_label)),
        seq(
          field('catalog', $._column_identifier),
          '.',
          field('schema', $._col_label),
          '.',
          field('name', $._col_label)
        )
      ),

    _non_reserved_word: ($) =>
      choice(
        $.identifier,
        $.quoted_identifier,
        ...[...COL_NAME_KEYWORDS, ...TYPE_FUNC_NAME_KEYWORDS, ...UNRESERVED_STARTER_KEYWORDS].map((word) =>
          prec(-1, alias(keyword(word), $.identifier))
        ),
        $._illegal
      ),

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
        ...[...FUNC_RESERVED_KEYWORDS, ...UNRESERVED_STARTER_KEYWORDS].map((word) =>
          prec(-1, alias(keyword(word), $.identifier))
        )
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

    _iconst_literal: ($) => alias($._iconst, $.numeric_literal),

    _signed_iconst: ($) =>
      choice($._iconst_literal, alias($._signed_iconst_literal, $.unary_expression), prec(1, $._illegal)),

    _signed_iconst_literal: ($) =>
      seq(field('operator', choice('+', '-')), field('operand', choice($._iconst_literal, $._illegal))),

    _signed_integer: ($) =>
      choice($.numeric_literal, alias($._signed_numeric_literal, $.unary_expression), prec(1, $._illegal)),

    _signed_numeric_literal: ($) =>
      seq(field('operator', choice('+', '-')), field('operand', choice($.numeric_literal, $._illegal))),
  },
});
