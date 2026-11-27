// @ts-check

/** @import {GrammarSymbols, RuleOrLiteral} from '@willbooster/web-tree-sitter/dsl' */

// MySQL 8.4 SQL grammar in its default SQL mode, written from the MySQL 8.4 Reference Manual.

import { commaSep, commaSep1, keyword, keywordPattern, keywords } from '../common/common.mjs';

// The CLI injects the DSL before loading this grammar.
const { grammar, alias, choice, field, optional, prec, repeat, repeat1, reserved, seq, token } =
  /** @type {typeof globalThis & import('@willbooster/web-tree-sitter/dsl').DSL} */ (globalThis);

const PREC = {
  ASSIGN: 1,
  OR: 2,
  XOR: 3,
  AND: 4,
  NOT: 5,
  IS_BOOL: 6,
  COMPARE: 7,
  PREDICATE: 8,
  BIT_OR: 9,
  BIT_AND: 10,
  BIT_SHIFT: 11,
  ADD: 12,
  MUL: 13,
  BIT_XOR: 14,
  UNARY: 15,
  BANG: 16,
  BINARY: 17,
  COLLATE: 18,
  JSON: 19,
  INTERVAL: 20,
};

// Reserved words in MySQL 8.4 (Section "Keywords and Reserved Words in MySQL 8.4").
const RESERVED = [
  'ACCESSIBLE',
  'ADD',
  'ALL',
  'ALTER',
  'ANALYZE',
  'AND',
  'AS',
  'ASC',
  'ASENSITIVE',
  'BEFORE',
  'BETWEEN',
  'BIGINT',
  'BINARY',
  'BLOB',
  'BOTH',
  'BY',
  'CALL',
  'CASCADE',
  'CASE',
  'CHANGE',
  'CHAR',
  'CHARACTER',
  'CHECK',
  'COLLATE',
  'COLUMN',
  'CONDITION',
  'CONSTRAINT',
  'CONTINUE',
  'CONVERT',
  'CREATE',
  'CROSS',
  'CUBE',
  'CUME_DIST',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'CURRENT_USER',
  'CURSOR',
  'DATABASE',
  'DATABASES',
  'DAY_HOUR',
  'DAY_MICROSECOND',
  'DAY_MINUTE',
  'DAY_SECOND',
  'DEC',
  'DECIMAL',
  'DECLARE',
  'DEFAULT',
  'DELAYED',
  'DELETE',
  'DENSE_RANK',
  'DESC',
  'DESCRIBE',
  'DETERMINISTIC',
  'DISTINCT',
  'DISTINCTROW',
  'DIV',
  'DOUBLE',
  'DROP',
  'DUAL',
  'EACH',
  'ELSE',
  'ELSEIF',
  'EMPTY',
  'ENCLOSED',
  'ESCAPED',
  'EXCEPT',
  'EXISTS',
  'EXIT',
  'EXPLAIN',
  'FALSE',
  'FETCH',
  'FIRST_VALUE',
  'FLOAT',
  'FLOAT4',
  'FLOAT8',
  'FOR',
  'FORCE',
  'FOREIGN',
  'FROM',
  'FULLTEXT',
  'FUNCTION',
  'GENERATED',
  'GET',
  'GRANT',
  'GROUP',
  'GROUPING',
  'GROUPS',
  'HAVING',
  'HIGH_PRIORITY',
  'HOUR_MICROSECOND',
  'HOUR_MINUTE',
  'HOUR_SECOND',
  'IF',
  'IGNORE',
  'IN',
  'INDEX',
  'INFILE',
  'INNER',
  'INOUT',
  'INSENSITIVE',
  'INSERT',
  'INT',
  'INT1',
  'INT2',
  'INT3',
  'INT4',
  'INT8',
  'INTEGER',
  'INTERSECT',
  'INTERVAL',
  'INTO',
  'IO_AFTER_GTIDS',
  'IO_BEFORE_GTIDS',
  'IS',
  'ITERATE',
  'JOIN',
  'JSON_TABLE',
  'KEY',
  'KEYS',
  'KILL',
  'LAG',
  'LAST_VALUE',
  'LATERAL',
  'LEAD',
  'LEADING',
  'LEAVE',
  'LEFT',
  'LIKE',
  'LIMIT',
  'LINEAR',
  'LINES',
  'LOAD',
  'LOCALTIME',
  'LOCALTIMESTAMP',
  'LOCK',
  'LONG',
  'LONGBLOB',
  'LONGTEXT',
  'LOOP',
  'LOW_PRIORITY',
  'MATCH',
  'MAXVALUE',
  'MEDIUMBLOB',
  'MEDIUMINT',
  'MEDIUMTEXT',
  'MIDDLEINT',
  'MINUTE_MICROSECOND',
  'MINUTE_SECOND',
  'MOD',
  'MODIFIES',
  'NATURAL',
  'NOT',
  'NO_WRITE_TO_BINLOG',
  'NTH_VALUE',
  'NTILE',
  'NULL',
  'NUMERIC',
  'OF',
  'ON',
  'OPTIMIZE',
  'OPTIMIZER_COSTS',
  'OPTION',
  'OPTIONALLY',
  'OR',
  'ORDER',
  'OUT',
  'OUTER',
  'OUTFILE',
  'OVER',
  'PARTITION',
  'PERCENT_RANK',
  'PRECISION',
  'PRIMARY',
  'PROCEDURE',
  'PURGE',
  'QUALIFY',
  'RANGE',
  'RANK',
  'READ',
  'READS',
  'READ_WRITE',
  'REAL',
  'RECURSIVE',
  'REFERENCES',
  'REGEXP',
  'RELEASE',
  'RENAME',
  'REPEAT',
  'REPLACE',
  'REQUIRE',
  'RESIGNAL',
  'RESTRICT',
  'RETURN',
  'REVOKE',
  'RIGHT',
  'RLIKE',
  'ROW',
  'ROWS',
  'ROW_NUMBER',
  'SCHEMA',
  'SCHEMAS',
  'SECOND_MICROSECOND',
  'SELECT',
  'SENSITIVE',
  'SEPARATOR',
  'SET',
  'SHOW',
  'SIGNAL',
  'SMALLINT',
  'SPATIAL',
  'SPECIFIC',
  'SQL',
  'SQLEXCEPTION',
  'SQLSTATE',
  'SQLWARNING',
  'SQL_BIG_RESULT',
  'SQL_CALC_FOUND_ROWS',
  'SQL_SMALL_RESULT',
  'SSL',
  'STARTING',
  'STORED',
  'STRAIGHT_JOIN',
  'SYSTEM',
  'TABLE',
  'TABLESAMPLE',
  'TERMINATED',
  'THEN',
  'TINYBLOB',
  'TINYINT',
  'TINYTEXT',
  'TO',
  'TRAILING',
  'TRIGGER',
  'TRUE',
  'UNDO',
  'UNION',
  'UNIQUE',
  'UNLOCK',
  'UNSIGNED',
  'UPDATE',
  'USAGE',
  'USE',
  'USING',
  'UTC_DATE',
  'UTC_TIME',
  'UTC_TIMESTAMP',
  'VALUES',
  'VARBINARY',
  'VARCHAR',
  'VARCHARACTER',
  'VARYING',
  'VIRTUAL',
  'WHEN',
  'WHERE',
  'WHILE',
  'WINDOW',
  'WITH',
  'WRITE',
  'XOR',
  'YEAR_MONTH',
  'ZEROFILL',
];

const RESERVED_FUNCTION_NAMES = [
  'CUME_DIST',
  'DATABASE',
  'DEFAULT',
  'DENSE_RANK',
  'FIRST_VALUE',
  'GROUPING',
  'IF',
  'INSERT',
  'LAG',
  'LAST_VALUE',
  'LEAD',
  'LEFT',
  'MOD',
  'NTH_VALUE',
  'NTILE',
  'PERCENT_RANK',
  'RANK',
  'REPEAT',
  'REPLACE',
  'RIGHT',
  'ROW_NUMBER',
  'SCHEMA',
  'VALUES',
];

const DISTINCT_AGGREGATE_NAMES = ['AVG', 'MAX', 'MIN', 'ST_COLLECT', 'SUM'];

const ALL_ONLY_AGGREGATE_NAMES = [
  'BIT_AND',
  'BIT_OR',
  'BIT_XOR',
  'JSON_ARRAYAGG',
  'STD',
  'STDDEV',
  'STDDEV_POP',
  'STDDEV_SAMP',
  'VARIANCE',
  'VAR_POP',
  'VAR_SAMP',
];

const SPECIAL_FUNCTION_NAMES = [
  ...DISTINCT_AGGREGATE_NAMES,
  ...ALL_ONLY_AGGREGATE_NAMES,
  'COUNT',
  'EXTRACT',
  'GROUP_CONCAT',
  'JSON_OBJECTAGG',
  'JSON_VALUE',
  'MID',
  'POSITION',
  'SUBSTR',
  'SUBSTRING',
  'TRIM',
  'WEIGHT_STRING',
];

const SIGNAL_CONDITION_ITEMS = [
  'CLASS_ORIGIN',
  'SUBCLASS_ORIGIN',
  'CONSTRAINT_CATALOG',
  'CONSTRAINT_SCHEMA',
  'CONSTRAINT_NAME',
  'CATALOG_NAME',
  'SCHEMA_NAME',
  'TABLE_NAME',
  'COLUMN_NAME',
  'CURSOR_NAME',
  'MESSAGE_TEXT',
  'MYSQL_ERRNO',
];

const NON_RESERVED_INTERVAL_UNITS = [
  'MICROSECOND',
  'SECOND',
  'MINUTE',
  'HOUR',
  'DAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
];

const RESERVED_INTERVAL_UNITS = [
  'SECOND_MICROSECOND',
  'MINUTE_MICROSECOND',
  'MINUTE_SECOND',
  'HOUR_MICROSECOND',
  'HOUR_SECOND',
  'HOUR_MINUTE',
  'DAY_MICROSECOND',
  'DAY_SECOND',
  'DAY_MINUTE',
  'DAY_HOUR',
  'YEAR_MONTH',
];

const TEMPORAL_LITERAL_KEYWORDS = ['DATE', 'TIME', 'TIMESTAMP'];

const AMBIGUOUS_ROLES_AND_LABELS = ['EXECUTE', 'RESTART', 'SHUTDOWN'];

const RESTRICTED_ROLE_KEYWORDS = [
  ...AMBIGUOUS_ROLES_AND_LABELS,
  'EVENT',
  'FILE',
  'NONE',
  'PROCESS',
  'PROXY',
  'RELOAD',
  'REPLICATION',
  'RESOURCE',
  'SUPER',
];

const RESTRICTED_LABEL_KEYWORDS = [
  ...AMBIGUOUS_ROLES_AND_LABELS,
  'ascii',
  'BEGIN',
  'BYTE',
  'CACHE',
  'CHARSET',
  'CHECKSUM',
  'CLONE',
  'COMMENT',
  'COMMIT',
  'CONTAINS',
  'DEALLOCATE',
  'DO',
  'END',
  'FLUSH',
  'FOLLOWS',
  'HANDLER',
  'HELP',
  'IMPORT',
  'INSTALL',
  'LANGUAGE',
  'NO',
  'PRECEDES',
  'PREPARE',
  'REPAIR',
  'RESET',
  'ROLLBACK',
  'SAVEPOINT',
  'SIGNED',
  'SLAVE',
  'START',
  'STOP',
  'TRUNCATE',
  'UNICODE',
  'UNINSTALL',
  'XA',
];

const RESTRICTED_LVALUE_KEYWORDS = ['GLOBAL', 'LOCAL', 'PERSIST', 'PERSIST_ONLY', 'SESSION'];

const UNUSED_RESERVED_WORDS = [
  'ACCESSIBLE',
  'ASENSITIVE',
  'CUBE',
  'INSENSITIVE',
  'IO_AFTER_GTIDS',
  'IO_BEFORE_GTIDS',
  'QUALIFY',
  'READ_WRITE',
  'SENSITIVE',
  'SPECIFIC',
  'SYSTEM',
  'TABLESAMPLE',
];

// Unquoted identifiers in MySQL may begin with digits unless they consist solely of digits.
const IDENTIFIER_NON_DIGIT = String.raw`A-Za-z_$\u0080-\uFEFE\uFF00-\u{10FFFF}`;
const IDENTIFIER_CHAR = String.raw`0-9A-Za-z_$\u0080-\u{10FFFF}`;

/** @param {RuleOrLiteral} value */
const optionalEq = (value) => seq(optional('='), value);

/**
 * @param {number} precedence
 * @param {RuleOrLiteral} operand
 * @param {RuleOrLiteral} operator
 */
const leftBinaryOp = (precedence, operand, operator) =>
  prec.left(precedence, seq(field('left', operand), field('operator', operator), field('right', operand)));

/** @param {GrammarSymbols<string>} $ */
const commonStatements = ($) => [
  $.select_statement,
  $.insert_statement,
  $.replace_statement,
  $.update_statement,
  $.delete_statement,
  $.load_statement,
  $.import_table_statement,
  $.create_database_statement,
  $.alter_database_statement,
  $.drop_database_statement,
  $.use_statement,
  $.create_table_statement,
  $.alter_table_statement,
  $.drop_table_statement,
  $.rename_table_statement,
  $.truncate_statement,
  $.create_index_statement,
  $.drop_index_statement,
  $.create_view_statement,
  $.alter_view_statement,
  $.drop_view_statement,
  $.create_trigger_statement,
  $.drop_trigger_statement,
  $.create_procedure_statement,
  $.create_function_statement,
  $.alter_routine_statement,
  $.drop_routine_statement,
  $.create_event_statement,
  $.alter_event_statement,
  $.drop_event_statement,
  $.create_tablespace_statement,
  $.alter_tablespace_statement,
  $.drop_tablespace_statement,
  $.create_logfile_group_statement,
  $.alter_logfile_group_statement,
  $.drop_logfile_group_statement,
  $.create_server_statement,
  $.alter_server_statement,
  $.drop_server_statement,
  $.create_srs_statement,
  $.drop_srs_statement,
  $.create_resource_group_statement,
  $.alter_resource_group_statement,
  $.drop_resource_group_statement,
  $.set_resource_group_statement,
  $.alter_instance_statement,
  $.set_statement,
  $.start_transaction_statement,
  $.begin_statement,
  $.commit_statement,
  $.rollback_statement,
  $.savepoint_statement,
  $.release_savepoint_statement,
  $.xa_statement,
  $.lock_tables_statement,
  $.unlock_tables_statement,
  $.lock_instance_statement,
  $.unlock_instance_statement,
  $.change_replication_source_statement,
  $.change_replication_filter_statement,
  $.start_replica_statement,
  $.stop_replica_statement,
  $.group_replication_statement,
  $.install_statement,
  $.uninstall_statement,
  $.clone_statement,
  $.cache_index_statement,
  $.load_index_statement,
  $.show_statement,
  $.describe_statement,
  $.explain_statement,
  $.grant_statement,
  $.revoke_statement,
  $.create_user_statement,
  $.alter_user_statement,
  $.drop_user_statement,
  $.rename_user_statement,
  $.create_role_statement,
  $.drop_role_statement,
  $.set_role_statement,
  $.set_default_role_statement,
  $.set_password_statement,
  $.table_maintenance_statement,
  $.flush_statement,
  $.reset_statement,
  $.purge_statement,
  $.kill_statement,
  $.shutdown_statement,
  $.restart_statement,
  $.binlog_statement,
  $.help_statement,
  $.prepare_statement,
  $.execute_statement,
  $.deallocate_statement,
  $.call_statement,
  $.do_statement,
  $.handler_statement,
];

/** @returns {Record<string, ($: GrammarSymbols<string>) => RuleOrLiteral>} */
function buildTlsOptionRules() {
  const attrs = ['CIPHER', 'ISSUER', 'SUBJECT'];
  /** @type {Record<string, ($: GrammarSymbols<string>) => RuleOrLiteral>} */
  const out = {};
  for (let mask = 1; mask < 1 << attrs.length; mask++) {
    out[`_tls_opts_${mask}`] = ($) => {
      /** @type {RuleOrLiteral[]} */
      const alts = [];
      for (let i = 0; i < attrs.length; i++) {
        if (!(mask & (1 << i))) continue;
        const head = seq(keyword(attrs[i]), alias($._string_segment, $.string_literal));
        const rem = mask & ~(1 << i);
        alts.push(rem ? choice(head, seq(head, optional(keyword('AND')), $[`_tls_opts_${rem}`])) : head);
      }
      return alts.length === 1 ? alts[0] : choice(...alts);
    };
  }
  return out;
}

export default grammar({
  name: 'mysql',

  extras: ($) => [/[\t\n\v\f\r ]+/, /\uFEFF/, $.comment, $._version_comment_start, $._version_comment_end, $._illegal],

  externals: ($) => [
    $.comment,
    $._recovery_comment,
    $._version_comment_start,
    $._version_comment_end,
    $._string_segment,
    $._national_string_segment,
    $.charset_introducer,
    $._quoted_hex_literal,
    $._quoted_bit_literal,
    $.user_variable,
    $.system_variable,
    $.quoted_identifier,
    $._digit_identifier,
    $._host_name,
    $._statement_terminator,
    $._end_of_input,
    $._sqlstate_literal,
    $._signal_first_item_name,
    $._signal_next_item_name,
    $._illegal_token,
    $._dot_context,
    $._unreachable,
  ],

  word: ($) => $.identifier,

  reserved: {
    global: () => RESERVED.map(keywordPattern),
    function_name: () => [...RESERVED, ...SPECIAL_FUNCTION_NAMES, ...TEMPORAL_LITERAL_KEYWORDS].map(keywordPattern),
    role: () => [...RESERVED, ...RESTRICTED_ROLE_KEYWORDS].map(keywordPattern),
    label: () => [...RESERVED, ...RESTRICTED_LABEL_KEYWORDS].map(keywordPattern),
    lvalue: () => [...RESERVED, ...RESTRICTED_LVALUE_KEYWORDS].map(keywordPattern),
    // After `.` in a qualified name (`tbl.select`), MySQL permits reserved words without backticks.
    none: () => [],
  },

  supertypes: ($) => [$._statement],

  conflicts: ($) => [
    [$._revoke_all_privilege, $.privilege_item],
    [$._identifier, $._role_identifier],
    [$.alter_table_action],
    [$.references_clause],
    [$.partition_by_clause_ddl],
    [$.group_by_clause],
    [$.check_constraint_body],
    [$.function_call],
    [$._select_no_into, $.parenthesized_query],
  ],

  rules: {
    source_file: ($) =>
      seq(
        optional(choice($._statement, $._reserved_only)),
        repeat(seq(alias($._statement_terminator, ';'), optional(choice($._statement, $._reserved_only)))),
        $._end_of_input
      ),

    // Defined before `identifier` so these reserved words take lexical priority over `word` (`identifier`).
    _reserved_only: ($) =>
      seq(choice(...UNUSED_RESERVED_WORDS.map(keyword)), $._unreachable, optional($._recovery_comment)),

    _illegal: ($) => seq($._illegal_token, $._unreachable),

    _statement: ($) =>
      choice(...commonStatements($), $.get_diagnostics_statement, $.signal_statement, $.resignal_statement),

    // =========================================================================
    // Queries & SELECT
    // =========================================================================

    select_statement: ($) => choice($._select_no_into, $._select_with_into),

    _select_no_into: ($) =>
      seq(
        optional($.with_clause),
        $._query_body_no_into,
        optional($.order_by_clause),
        optional($.limit_clause),
        repeat($.locking_clause)
      ),

    _select_with_into: ($) =>
      choice(
        seq(
          optional($.with_clause),
          $._query_body_with_into,
          optional($.order_by_clause),
          optional($.limit_clause),
          repeat($.locking_clause)
        ),
        seq(
          optional($.with_clause),
          $._query_body_no_into,
          optional($.order_by_clause),
          optional($.limit_clause),
          choice(seq($.into_clause, repeat($.locking_clause)), seq(repeat1($.locking_clause), $.into_clause))
        )
      ),

    _subquery_select: ($) => $._select_no_into,

    with_clause: ($) => seq(keyword('WITH'), optional(keyword('RECURSIVE')), commaSep1($.common_table_expression)),

    common_table_expression: ($) =>
      seq(
        field('name', $._identifier),
        optional($.column_list),
        keyword('AS'),
        '(',
        alias($._subquery_select, $.select_statement),
        ')'
      ),

    _query_body_no_into: ($) => choice($._query_term_no_into, $.compound_query),

    _query_body_with_into: ($) => choice($._query_term_with_into, alias($._compound_query_with_into, $.compound_query)),

    compound_query: ($) =>
      prec.left(
        seq(
          field('left', $._query_body_no_into),
          field('operator', alias($._union_or_except_operator, $.compound_operator)),
          field('right', $._query_term_no_into)
        )
      ),

    _compound_query_with_into: ($) =>
      prec.left(
        seq(
          field('left', $._query_body_no_into),
          field('operator', alias($._union_or_except_operator, $.compound_operator)),
          field('right', $._query_term_with_into)
        )
      ),

    _query_term_no_into: ($) => choice($._query_primary_no_into, alias($._intersect_query_no_into, $.compound_query)),

    _query_term_with_into: ($) =>
      choice($._query_primary_with_into, alias($._intersect_query_with_into, $.compound_query)),

    _intersect_query_no_into: ($) =>
      prec.left(
        seq(
          field('left', $._query_term_no_into),
          field('operator', alias($._intersect_operator, $.compound_operator)),
          field('right', $._query_primary_no_into)
        )
      ),

    _intersect_query_with_into: ($) =>
      prec.left(
        seq(
          field('left', $._query_term_no_into),
          field('operator', alias($._intersect_operator, $.compound_operator)),
          field('right', $._query_primary_with_into)
        )
      ),

    _union_or_except_operator: () =>
      seq(choice(keyword('UNION'), keyword('EXCEPT')), optional(choice(keyword('ALL'), keyword('DISTINCT')))),

    _intersect_operator: () => seq(keyword('INTERSECT'), optional(choice(keyword('ALL'), keyword('DISTINCT')))),

    _query_primary_no_into: ($) =>
      choice($.select_core, $.values_statement, $.table_value_statement, $.parenthesized_query),

    _query_primary_with_into: ($) =>
      choice(
        alias($._select_core_with_into, $.select_core),
        alias($._parenthesized_query_with_into, $.parenthesized_query)
      ),

    _parenthesized_query_with_into: ($) =>
      choice(
        seq(
          '(',
          optional($.with_clause),
          $._query_body_with_into,
          optional($.order_by_clause),
          optional($.limit_clause),
          repeat($.locking_clause),
          ')'
        ),
        seq(
          '(',
          optional($.with_clause),
          $._query_body_no_into,
          optional($.order_by_clause),
          optional($.limit_clause),
          choice(seq($.into_clause, repeat($.locking_clause)), seq(repeat1($.locking_clause), $.into_clause)),
          ')'
        )
      ),

    parenthesized_query: ($) =>
      seq(
        '(',
        optional($.with_clause),
        $._query_body_no_into,
        optional($.order_by_clause),
        optional($.limit_clause),
        repeat($.locking_clause),
        ')'
      ),

    values_statement: ($) => $._values_clause,

    _values_clause: ($) => seq(keyword('VALUES'), commaSep1(alias($._values_row_constructor, $.row_constructor))),

    _values_row_constructor: ($) => seq(keyword('ROW'), '(', commaSep(choice($._expression, keyword('DEFAULT'))), ')'),

    row_constructor: ($) => seq(keyword('ROW'), '(', commaSep($._expression), ')'),

    table_value_statement: ($) => seq(keyword('TABLE'), field('table', $.qualified_name)),

    select_core: ($) =>
      prec.right(
        seq(
          keyword('SELECT'),
          repeat($._select_modifier),
          commaSep1(choice($.result_column, alias('*', $.all_columns), $.table_columns)),
          optional($.from_clause),
          optional($.where_clause),
          optional($.group_by_clause),
          optional($.having_clause),
          optional($.window_clause)
        )
      ),

    _select_core_with_into: ($) =>
      prec.right(
        1,
        seq(
          keyword('SELECT'),
          repeat($._select_modifier),
          commaSep1(choice($.result_column, alias('*', $.all_columns), $.table_columns)),
          $.into_clause,
          optional($.from_clause),
          optional($.where_clause),
          optional($.group_by_clause),
          optional($.having_clause),
          optional($.window_clause)
        )
      ),

    _select_modifier: () =>
      choice(
        keyword('ALL'),
        keyword('DISTINCT'),
        keyword('DISTINCTROW'),
        keyword('HIGH_PRIORITY'),
        keyword('STRAIGHT_JOIN'),
        keyword('SQL_SMALL_RESULT'),
        keyword('SQL_BIG_RESULT'),
        keyword('SQL_BUFFER_RESULT'),
        keyword('SQL_NO_CACHE'),
        keyword('SQL_CALC_FOUND_ROWS')
      ),

    result_column: ($) => seq(field('value', $._expression), optional($._column_alias)),

    table_columns: ($) =>
      seq(
        choice(
          field('table', $._identifier),
          seq(field('schema', $._identifier), '.', field('table', $._dot_identifier))
        ),
        '.',
        '*'
      ),

    _column_alias: ($) => choice(seq(keyword('AS'), field('alias', $._alias_name)), field('alias', $._alias_name)),

    _alias_name: ($) => choice($._identifier, alias($._string_segment, $.string_literal)),

    _table_alias: ($) => seq(optional(keyword('AS')), field('alias', $._identifier)),

    into_clause: ($) =>
      seq(
        keyword('INTO'),
        choice(
          seq(
            keyword('OUTFILE'),
            field('file', $.string_literal),
            optional($._charset_clause),
            optional($._load_field_or_line_options)
          ),
          seq(keyword('DUMPFILE'), field('file', $.string_literal)),
          commaSep1(choice($.user_variable, $._identifier))
        )
      ),

    from_clause: ($) => seq(keyword('FROM'), choice(keyword('DUAL'), $._table_references)),

    _table_references: ($) => commaSep1($._table_reference),

    _table_reference: ($) => choice($._table_factor, $._joined_table, seq('{', keyword('OJ'), $._table_reference, '}')),

    _table_factor: ($) => choice($.table, $.subquery_table, $.json_table, $.join_table),

    table: ($) =>
      seq(
        field('name', $.qualified_name),
        optional($.partition_names_clause),
        optional($._table_alias),
        repeat($.index_hint)
      ),

    partition_names_clause: ($) => seq(keyword('PARTITION'), '(', commaSep1($._identifier), ')'),

    index_hint: ($) =>
      seq(
        choice(keyword('USE'), keyword('IGNORE'), keyword('FORCE')),
        choice(keyword('INDEX'), keyword('KEY')),
        optional(seq(keyword('FOR'), choice(keyword('JOIN'), keywords('ORDER BY'), keywords('GROUP BY')))),
        '(',
        commaSep(choice($._identifier, keyword('PRIMARY'))),
        ')'
      ),

    subquery_table: ($) =>
      seq(
        optional(keyword('LATERAL')),
        '(',
        alias($._subquery_select, $.select_statement),
        ')',
        $._table_alias,
        optional($.column_list)
      ),

    join_table: ($) => seq('(', $._table_references, ')'),

    json_table: ($) =>
      seq(
        keyword('JSON_TABLE'),
        '(',
        field('source', $._expression),
        ',',
        field('path', $.string_literal),
        keyword('COLUMNS'),
        '(',
        commaSep1($.json_table_column),
        ')',
        ')',
        $._table_alias
      ),

    json_table_column: ($) =>
      choice(
        seq(field('name', $._identifier), keywords('FOR ORDINALITY')),
        seq(
          field('name', $._identifier),
          $.data_type,
          optional(keyword('EXISTS')),
          keyword('PATH'),
          field('path', $.string_literal),
          optional($._json_table_on_empty_or_error)
        ),
        seq(
          keyword('NESTED'),
          optional(keyword('PATH')),
          field('path', $.string_literal),
          keyword('COLUMNS'),
          '(',
          commaSep1($.json_table_column),
          ')'
        )
      ),

    _json_table_on_empty_or_error: ($) =>
      choice(
        seq($._json_table_on_empty, optional($._json_table_on_error)),
        seq($._json_table_on_error, optional($._json_table_on_empty))
      ),

    _json_table_on_empty: ($) => seq($._json_table_on_response, keywords('ON EMPTY')),

    _json_table_on_error: ($) => seq($._json_table_on_response, keywords('ON ERROR')),

    _json_table_on_response: ($) =>
      choice(keyword('NULL'), keyword('ERROR'), seq(keyword('DEFAULT'), $.string_literal)),

    _json_on_empty: ($) => seq($._json_on_response, keywords('ON EMPTY')),

    _json_on_error: ($) => seq($._json_on_response, keywords('ON ERROR')),

    _json_on_response: ($) => choice(keyword('NULL'), keyword('ERROR'), seq(keyword('DEFAULT'), $._expression)),

    _joined_table: ($) =>
      choice(
        prec.right(
          1,
          seq(
            $._table_reference,
            optional(choice(keyword('INNER'), keyword('CROSS'))),
            keyword('JOIN'),
            $._table_reference,
            optional($.join_constraint)
          )
        ),
        prec.right(
          1,
          seq(
            $._table_reference,
            keyword('STRAIGHT_JOIN'),
            $._table_reference,
            optional(seq(keyword('ON'), field('condition', $._expression)))
          )
        ),
        prec.left(
          2,
          seq(
            $._table_reference,
            choice(keyword('LEFT'), keyword('RIGHT')),
            optional(keyword('OUTER')),
            keyword('JOIN'),
            $._table_reference,
            $.join_constraint
          )
        ),
        prec.left(
          2,
          seq(
            $._table_reference,
            keyword('NATURAL'),
            optional(
              choice(keyword('INNER'), seq(choice(keyword('LEFT'), keyword('RIGHT')), optional(keyword('OUTER'))))
            ),
            keyword('JOIN'),
            $._table_factor
          )
        )
      ),

    join_constraint: ($) =>
      choice(seq(keyword('ON'), field('condition', $._expression)), seq(keyword('USING'), $.column_list)),

    where_clause: ($) => seq(keyword('WHERE'), field('condition', $._expression)),

    group_by_clause: ($) => seq(keywords('GROUP BY'), commaSep1($._expression), optional(keywords('WITH ROLLUP'))),

    having_clause: ($) => seq(keyword('HAVING'), field('condition', $._expression)),

    window_clause: ($) => seq(keyword('WINDOW'), commaSep1($.named_window)),

    named_window: ($) => seq(field('name', $._identifier), keyword('AS'), '(', optional($.window_definition), ')'),

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
        choice(keyword('ROWS'), keyword('RANGE'), keyword('GROUPS')),
        choice($.frame_bound, seq(keyword('BETWEEN'), $.frame_bound, keyword('AND'), $.frame_bound))
      ),

    frame_bound: ($) =>
      choice(
        keywords('CURRENT ROW'),
        seq(choice(keyword('UNBOUNDED'), $._expression), choice(keyword('PRECEDING'), keyword('FOLLOWING')))
      ),

    order_by_clause: ($) => seq(keywords('ORDER BY'), commaSep1($.ordering_term)),

    ordering_term: ($) => seq(field('value', $._expression), optional(choice(keyword('ASC'), keyword('DESC')))),

    limit_clause: ($) =>
      seq(
        keyword('LIMIT'),
        choice(
          seq(field('limit', $._limit_value), optional(seq(keyword('OFFSET'), field('offset', $._limit_value)))),
          seq(field('offset', $._limit_value), ',', field('limit', $._limit_value))
        )
      ),

    _simple_limit_clause: ($) => seq(keyword('LIMIT'), field('limit', $._limit_value)),

    // Stored routines may also use local variables or parameters in LIMIT, while prepared statements use `?`.
    _limit_value: ($) =>
      choice(
        alias($._uint64_literal, $.numeric_literal),
        $.placeholder,
        $._identifier,
        seq(choice($._overflow_int_literal, $._decimal_literal, $._float_literal), $._unreachable)
      ),

    locking_clause: ($) =>
      choice(
        seq(
          keyword('FOR'),
          choice(keyword('UPDATE'), keyword('SHARE')),
          optional(seq(keyword('OF'), commaSep1($.qualified_name))),
          optional(choice(keyword('NOWAIT'), keywords('SKIP LOCKED')))
        ),
        keywords('LOCK IN SHARE MODE')
      ),

    // =========================================================================
    // Data Manipulation (INSERT, REPLACE, UPDATE, DELETE, LOAD)
    // =========================================================================

    insert_statement: ($) =>
      seq(
        keyword('INSERT'),
        optional(choice(keyword('LOW_PRIORITY'), keyword('DELAYED'), keyword('HIGH_PRIORITY'))),
        optional(keyword('IGNORE')),
        optional(keyword('INTO')),
        field('table', $.qualified_name),
        optional($.partition_names_clause),
        choice(
          seq(
            optional($._insert_column_list),
            choice(
              seq(
                choice(
                  seq(choice(keyword('VALUES'), keyword('VALUE')), commaSep1($.insert_values_row)),
                  $._values_clause
                ),
                optional($._insert_row_alias)
              ),
              alias($._insert_query, $.select_statement)
            )
          ),
          seq($.set_clause, optional($._insert_row_alias))
        ),
        optional($.on_duplicate_key_update_clause)
      ),

    replace_statement: ($) =>
      seq(
        keyword('REPLACE'),
        optional(choice(keyword('LOW_PRIORITY'), keyword('DELAYED'))),
        optional(keyword('INTO')),
        field('table', $.qualified_name),
        optional($.partition_names_clause),
        choice(
          seq(
            optional($._insert_column_list),
            choice(
              seq(choice(keyword('VALUES'), keyword('VALUE')), commaSep1($.insert_values_row)),
              $._values_clause,
              alias($._insert_query, $.select_statement)
            )
          ),
          $.set_clause
        )
      ),

    _insert_query: ($) =>
      choice(
        seq(
          $.with_clause,
          $._query_body_no_into,
          optional($.order_by_clause),
          optional($.limit_clause),
          repeat($.locking_clause)
        ),
        seq(
          choice(
            $.select_core,
            $.table_value_statement,
            $.parenthesized_query,
            $.compound_query,
            alias($._intersect_query_no_into, $.compound_query)
          ),
          optional($.order_by_clause),
          optional($.limit_clause),
          repeat($.locking_clause)
        ),
        seq(
          $.values_statement,
          choice(
            seq($.order_by_clause, optional($.limit_clause), repeat($.locking_clause)),
            seq($.limit_clause, repeat($.locking_clause)),
            repeat1($.locking_clause)
          )
        )
      ),

    _insert_column_list: ($) => seq('(', commaSep($.column_reference), ')'),

    insert_values_row: ($) => seq('(', commaSep(choice($._expression, keyword('DEFAULT'))), ')'),

    _insert_row_alias: ($) => seq(keyword('AS'), field('alias', $._identifier), optional($.column_list)),

    on_duplicate_key_update_clause: ($) => seq(keywords('ON DUPLICATE KEY UPDATE'), commaSep1($.assignment)),

    update_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('UPDATE'),
        optional(keyword('LOW_PRIORITY')),
        optional(keyword('IGNORE')),
        choice(
          seq(
            $.table,
            $.set_clause,
            optional($.where_clause),
            optional($.order_by_clause),
            optional(alias($._simple_limit_clause, $.limit_clause))
          ),
          seq($._multi_table_references, $.set_clause, optional($.where_clause))
        )
      ),

    _multi_table_references: ($) =>
      choice(
        seq($._table_reference, ',', commaSep1($._table_reference)),
        $._joined_table,
        seq('{', keyword('OJ'), $._table_reference, '}'),
        $.subquery_table,
        $.json_table,
        $.join_table
      ),

    set_clause: ($) => seq(keyword('SET'), commaSep1($.assignment)),

    assignment: ($) =>
      seq(field('left', $.column_reference), '=', field('right', choice($._expression, keyword('DEFAULT')))),

    delete_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('DELETE'),
        repeat(choice(keyword('LOW_PRIORITY'), keyword('QUICK'), keyword('IGNORE'))),
        choice(
          // Single-table DELETE or multi-table `DELETE FROM t1, t2 USING ...`
          seq(
            keyword('FROM'),
            choice(
              seq(
                field('table', $.qualified_name),
                optional($._table_alias),
                optional($.partition_names_clause),
                optional($.where_clause),
                optional($.order_by_clause),
                optional(alias($._simple_limit_clause, $.limit_clause))
              ),
              seq(commaSep1($.delete_target), keyword('USING'), $._table_references, optional($.where_clause))
            )
          ),
          // Multi-table `DELETE t1, t2 FROM ...`
          seq(commaSep1($.delete_target), keyword('FROM'), $._table_references, optional($.where_clause))
        )
      ),

    delete_target: ($) =>
      choice(
        seq(field('table', $._identifier), optional(seq('.', '*'))),
        seq(field('schema', $._identifier), '.', field('table', $._dot_identifier), optional(seq('.', '*')))
      ),

    load_statement: ($) =>
      seq(
        keyword('LOAD'),
        choice(
          seq(
            keyword('DATA'),
            optional(choice(keyword('LOW_PRIORITY'), keyword('CONCURRENT'))),
            optional(keyword('LOCAL')),
            keyword('INFILE'),
            field('file', $.string_literal),
            optional(choice(keyword('REPLACE'), keyword('IGNORE'))),
            keywords('INTO TABLE'),
            field('table', $.qualified_name),
            optional($.partition_names_clause),
            optional($._charset_clause),
            optional($._load_field_or_line_options),
            optional(seq(keyword('IGNORE'), $.numeric_literal, choice(keyword('LINES'), keyword('ROWS')))),
            optional(seq('(', commaSep1(choice($.column_reference, $.user_variable)), ')')),
            optional($.set_clause)
          ),
          seq(
            keyword('XML'),
            optional(choice(keyword('LOW_PRIORITY'), keyword('CONCURRENT'))),
            optional(keyword('LOCAL')),
            keyword('INFILE'),
            field('file', $.string_literal),
            optional(choice(keyword('REPLACE'), keyword('IGNORE'))),
            keywords('INTO TABLE'),
            field('table', $.qualified_name),
            optional($.partition_names_clause),
            optional($._charset_clause),
            optional(seq(keywords('ROWS IDENTIFIED BY'), $.string_literal)),
            optional(seq(keyword('IGNORE'), $.numeric_literal, choice(keyword('LINES'), keyword('ROWS')))),
            optional(seq('(', commaSep1(choice($.column_reference, $.user_variable)), ')')),
            optional($.set_clause)
          )
        )
      ),

    _load_field_or_line_options: ($) => choice(seq($._fields_clause, optional($._lines_clause)), $._lines_clause),

    _fields_clause: ($) =>
      seq(
        choice(keyword('FIELDS'), keyword('COLUMNS')),
        repeat1(
          choice(
            seq(keywords('TERMINATED BY'), $.string_literal),
            seq(optional(keyword('OPTIONALLY')), keywords('ENCLOSED BY'), $.string_literal),
            seq(keywords('ESCAPED BY'), $.string_literal)
          )
        )
      ),

    _lines_clause: ($) =>
      seq(
        keyword('LINES'),
        repeat1(
          choice(seq(keywords('STARTING BY'), $.string_literal), seq(keywords('TERMINATED BY'), $.string_literal))
        )
      ),

    import_table_statement: ($) => seq(keywords('IMPORT TABLE FROM'), commaSep1($.string_literal)),

    // =========================================================================
    // DDL: Databases, Tables, Indexes, Views
    // =========================================================================

    create_database_statement: ($) =>
      seq(
        keyword('CREATE'),
        choice(keyword('DATABASE'), keyword('SCHEMA')),
        optional($.if_not_exists),
        field('name', $._identifier),
        repeat($.database_option)
      ),

    alter_database_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('DATABASE'), keyword('SCHEMA')),
        optional(field('name', $._identifier)),
        repeat1($.database_option)
      ),

    drop_database_statement: ($) =>
      seq(
        keyword('DROP'),
        choice(keyword('DATABASE'), keyword('SCHEMA')),
        optional($.if_exists),
        field('name', $._identifier)
      ),

    database_option: ($) =>
      choice(
        seq(optional(keyword('DEFAULT')), $._charset_clause),
        seq(optional(keyword('DEFAULT')), keyword('COLLATE'), optionalEq($._identifier_or_string)),
        seq(optional(keyword('DEFAULT')), keyword('ENCRYPTION'), optionalEq($.string_literal)),
        seq(keywords('READ ONLY'), optionalEq(choice(keyword('DEFAULT'), $.numeric_literal)))
      ),

    use_statement: ($) => seq(keyword('USE'), field('database', $._identifier)),

    if_not_exists: () => keywords('IF NOT EXISTS'),

    if_exists: () => keywords('IF EXISTS'),

    create_table_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('TEMPORARY')),
        keyword('TABLE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        choice(
          seq(keyword('LIKE'), field('like', $.qualified_name)),
          seq('(', keyword('LIKE'), field('like', $.qualified_name), ')'),
          seq(
            '(',
            commaSep1($._create_definition),
            ')',
            optional($._table_options),
            optional($.partition_by_clause_ddl),
            optional($._create_table_query_tail)
          ),
          seq(optional($._table_options), optional($.partition_by_clause_ddl), $._create_table_query_tail)
        )
      ),

    _create_table_query_tail: ($) =>
      seq(
        optional(choice(keyword('IGNORE'), keyword('REPLACE'))),
        optional(keyword('AS')),
        alias($._subquery_select, $.select_statement)
      ),

    _create_definition: ($) => choice($.column_definition, $.table_constraint),

    column_definition: ($) => seq(field('name', $._identifier), $.data_type, repeat($._column_attribute)),

    _column_attribute: ($) =>
      choice(
        seq(optional(keyword('NOT')), keyword('NULL')),
        $.default_clause,
        keyword('VISIBLE'),
        keyword('INVISIBLE'),
        keyword('AUTO_INCREMENT'),
        prec.right(seq(keyword('UNIQUE'), optional(keyword('KEY')))),
        seq(optional(keyword('PRIMARY')), keyword('KEY')),
        seq(keyword('COMMENT'), $.string_literal),
        seq(keyword('COLLATE'), $._identifier_or_string),
        seq(keyword('COLUMN_FORMAT'), choice(keyword('FIXED'), keyword('DYNAMIC'), keyword('DEFAULT'))),
        seq(keyword('ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keyword('SECONDARY_ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keyword('STORAGE'), choice(keyword('DISK'), keyword('MEMORY'))),
        seq(keyword('SRID'), $.numeric_literal),
        seq(keywords('ON UPDATE'), $._current_timestamp_value),
        $.generated_column_clause,
        $.references_clause,
        seq(optional($.constraint_name), $.check_constraint_body)
      ),

    default_clause: ($) =>
      seq(
        keyword('DEFAULT'),
        field(
          'value',
          choice(
            $._literal,
            $._current_timestamp_value,
            seq(choice('+', '-'), $.numeric_literal),
            seq('(', $._expression, ')')
          )
        )
      ),

    _current_timestamp_value: ($) =>
      seq(
        choice(keyword('CURRENT_TIMESTAMP'), keyword('LOCALTIME'), keyword('LOCALTIMESTAMP'), keyword('NOW')),
        optional(seq('(', optional($.numeric_literal), ')'))
      ),

    generated_column_clause: ($) =>
      seq(
        optional(keywords('GENERATED ALWAYS')),
        keyword('AS'),
        '(',
        $._expression,
        ')',
        optional(choice(keyword('VIRTUAL'), keyword('STORED')))
      ),

    constraint_name: ($) => seq(keyword('CONSTRAINT'), optional(field('name', $._identifier))),

    table_constraint: ($) =>
      choice(
        seq(
          optional($.constraint_name),
          keywords('PRIMARY KEY'),
          optional($.index_type),
          '(',
          commaSep1($.key_part),
          ')',
          repeat($.index_option)
        ),
        seq(
          optional($.constraint_name),
          keyword('UNIQUE'),
          optional(choice(keyword('INDEX'), keyword('KEY'))),
          optional(field('name', $._identifier)),
          optional($.index_type),
          '(',
          commaSep1($.key_part),
          ')',
          repeat($.index_option)
        ),
        seq(
          choice(keyword('INDEX'), keyword('KEY')),
          optional(field('name', $._identifier)),
          optional($.index_type),
          '(',
          commaSep1($.key_part),
          ')',
          repeat($.index_option)
        ),
        seq(
          choice(keyword('FULLTEXT'), keyword('SPATIAL')),
          optional(choice(keyword('INDEX'), keyword('KEY'))),
          optional(field('name', $._identifier)),
          '(',
          commaSep1($.key_part),
          ')',
          repeat($.index_option)
        ),
        seq(
          optional($.constraint_name),
          keywords('FOREIGN KEY'),
          optional(field('index', $._identifier)),
          $.column_list,
          $.references_clause
        ),
        seq(optional($.constraint_name), $.check_constraint_body)
      ),

    check_constraint_body: ($) =>
      seq(keyword('CHECK'), '(', $._expression, ')', optional(seq(optional(keyword('NOT')), keyword('ENFORCED')))),

    references_clause: ($) =>
      seq(
        keyword('REFERENCES'),
        field('table', $.qualified_name),
        optional($.column_list),
        repeat(choice($._fk_match, $._fk_on_action))
      ),

    _fk_match: () => seq(keyword('MATCH'), choice(keyword('FULL'), keyword('PARTIAL'), keyword('SIMPLE'))),

    _fk_on_action: () =>
      seq(
        keyword('ON'),
        choice(keyword('DELETE'), keyword('UPDATE')),
        choice(
          keyword('RESTRICT'),
          keyword('CASCADE'),
          keywords('SET NULL'),
          keywords('NO ACTION'),
          keywords('SET DEFAULT')
        )
      ),

    key_part: ($) =>
      seq(
        choice(
          seq(field('column', $._identifier), optional(seq('(', $.numeric_literal, ')'))),
          seq('(', $._expression, ')')
        ),
        optional(choice(keyword('ASC'), keyword('DESC')))
      ),

    index_type: () => seq(keyword('USING'), choice(keyword('BTREE'), keyword('HASH'))),

    index_option: ($) =>
      choice(
        seq(keyword('KEY_BLOCK_SIZE'), optionalEq($.numeric_literal)),
        $.index_type,
        seq(keywords('WITH PARSER'), $._identifier),
        seq(keyword('COMMENT'), $.string_literal),
        keyword('VISIBLE'),
        keyword('INVISIBLE'),
        seq(keyword('ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keyword('SECONDARY_ENGINE_ATTRIBUTE'), optionalEq($.string_literal))
      ),

    _table_options: ($) => seq($.table_option, repeat(seq(optional(','), $.table_option))),

    table_option: ($) =>
      choice(
        seq(keyword('ENGINE'), optionalEq($._identifier_or_string)),
        seq(keyword('SECONDARY_ENGINE'), optionalEq(choice(keyword('NULL'), $._identifier_or_string))),
        seq(keyword('AUTO_INCREMENT'), optionalEq($.numeric_literal)),
        seq(keyword('AUTOEXTEND_SIZE'), optionalEq($._identifier_or_number)),
        seq(keyword('AVG_ROW_LENGTH'), optionalEq($.numeric_literal)),
        seq(optional(keyword('DEFAULT')), $._charset_clause),
        seq(keyword('CHECKSUM'), optionalEq($.numeric_literal)),
        seq(optional(keyword('DEFAULT')), keyword('COLLATE'), optionalEq($._identifier_or_string)),
        seq(keyword('COMMENT'), optionalEq($.string_literal)),
        seq(keyword('COMPRESSION'), optionalEq($.string_literal)),
        seq(keyword('CONNECTION'), optionalEq($.string_literal)),
        seq(choice(keyword('DATA'), keyword('INDEX')), keyword('DIRECTORY'), optionalEq($.string_literal)),
        seq(keyword('DELAY_KEY_WRITE'), optionalEq($.numeric_literal)),
        seq(keyword('ENCRYPTION'), optionalEq($.string_literal)),
        seq(keyword('ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keyword('SECONDARY_ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keyword('INSERT_METHOD'), optionalEq(choice(keyword('NO'), keyword('FIRST'), keyword('LAST')))),
        seq(keyword('KEY_BLOCK_SIZE'), optionalEq($.numeric_literal)),
        seq(keyword('MAX_ROWS'), optionalEq($.numeric_literal)),
        seq(keyword('MIN_ROWS'), optionalEq($.numeric_literal)),
        seq(keyword('PACK_KEYS'), optionalEq(choice($.numeric_literal, keyword('DEFAULT')))),
        seq(keyword('PASSWORD'), optionalEq($.string_literal)),
        seq(
          keyword('ROW_FORMAT'),
          optionalEq(
            choice(
              keyword('DEFAULT'),
              keyword('DYNAMIC'),
              keyword('FIXED'),
              keyword('COMPRESSED'),
              keyword('REDUNDANT'),
              keyword('COMPACT')
            )
          )
        ),
        seq(keyword('STATS_AUTO_RECALC'), optionalEq(choice(keyword('DEFAULT'), $.numeric_literal))),
        seq(keyword('STATS_PERSISTENT'), optionalEq(choice(keyword('DEFAULT'), $.numeric_literal))),
        seq(keyword('STATS_SAMPLE_PAGES'), optionalEq(choice(keyword('DEFAULT'), $.numeric_literal))),
        seq(
          keyword('TABLESPACE'),
          optionalEq($._identifier),
          optional(seq(keyword('STORAGE'), choice(keyword('DISK'), keyword('MEMORY'))))
        ),
        seq(keyword('UNION'), optionalEq(seq('(', commaSep1($.qualified_name), ')'))),
        keywords('START TRANSACTION')
      ),

    _charset_clause: ($) =>
      seq(
        choice(keywords('CHARACTER SET'), keyword('CHARSET')),
        optionalEq(choice($._identifier_or_string, keyword('BINARY'), keyword('DEFAULT')))
      ),

    _identifier_or_string: ($) => choice($._identifier, $.string_literal),

    _identifier_or_number: ($) => choice($._identifier, $.numeric_literal),

    partition_by_clause_ddl: ($) =>
      seq(
        keywords('PARTITION BY'),
        choice(
          seq(optional(keyword('LINEAR')), keyword('HASH'), '(', $._expression, ')'),
          seq(
            optional(keyword('LINEAR')),
            keyword('KEY'),
            optional(seq(keyword('ALGORITHM'), '=', $.numeric_literal)),
            '(',
            commaSep($._identifier),
            ')'
          ),
          seq(
            choice(keyword('RANGE'), keyword('LIST')),
            choice(seq('(', $._expression, ')'), seq(keyword('COLUMNS'), '(', commaSep1($._identifier), ')'))
          )
        ),
        optional(seq(keyword('PARTITIONS'), $.numeric_literal)),
        optional(
          seq(
            keywords('SUBPARTITION BY'),
            choice(
              seq(optional(keyword('LINEAR')), keyword('HASH'), '(', $._expression, ')'),
              seq(
                optional(keyword('LINEAR')),
                keyword('KEY'),
                optional(seq(keyword('ALGORITHM'), '=', $.numeric_literal)),
                '(',
                commaSep($._identifier),
                ')'
              )
            ),
            optional(seq(keyword('SUBPARTITIONS'), $.numeric_literal))
          )
        ),
        optional(seq('(', commaSep1($.partition_definition), ')'))
      ),

    partition_definition: ($) =>
      seq(
        keyword('PARTITION'),
        field('name', $._identifier),
        optional(
          seq(
            keyword('VALUES'),
            choice(
              seq(
                keywords('LESS THAN'),
                choice(keyword('MAXVALUE'), seq('(', commaSep1(choice($._expression, keyword('MAXVALUE'))), ')'))
              ),
              seq(keyword('IN'), '(', commaSep1($._expression), ')')
            )
          )
        ),
        repeat($.table_option),
        optional(seq('(', commaSep1($.subpartition_definition), ')'))
      ),

    subpartition_definition: ($) => seq(keyword('SUBPARTITION'), field('name', $._identifier), repeat($.table_option)),

    // =========================================================================
    // Data Types
    // =========================================================================

    data_type: ($) =>
      prec.right(
        choice(
          // Numeric types
          seq(
            choice(
              keyword('BIT'),
              keyword('TINYINT'),
              keyword('SMALLINT'),
              keyword('MEDIUMINT'),
              keyword('MIDDLEINT'),
              keyword('INT'),
              keyword('INTEGER'),
              keyword('INT1'),
              keyword('INT2'),
              keyword('INT3'),
              keyword('INT4'),
              keyword('INT8'),
              keyword('BIGINT')
            ),
            optional($._field_length),
            optional(choice(keyword('SIGNED'), keyword('UNSIGNED'))),
            optional(keyword('ZEROFILL'))
          ),
          keyword('BOOL'),
          keyword('BOOLEAN'),
          keyword('SERIAL'),
          seq(
            choice(
              keyword('DECIMAL'),
              keyword('DEC'),
              keyword('NUMERIC'),
              keyword('FIXED'),
              keyword('FLOAT'),
              keyword('FLOAT4'),
              keyword('FLOAT8'),
              seq(keyword('DOUBLE'), optional(keyword('PRECISION'))),
              keyword('REAL')
            ),
            optional($._float_options),
            optional(choice(keyword('SIGNED'), keyword('UNSIGNED'))),
            optional(keyword('ZEROFILL'))
          ),
          // Temporal types
          keyword('DATE'),
          seq(
            choice(keyword('TIME'), keyword('DATETIME'), keyword('TIMESTAMP')),
            optional(seq('(', $._uint_length_literal, ')'))
          ),
          seq(keyword('YEAR'), optional($._field_length)),
          // String & binary types
          seq(
            choice(
              seq(optional(keyword('NATIONAL')), choice(keyword('CHAR'), keyword('CHARACTER')), keyword('VARYING')),
              seq(optional(keyword('NATIONAL')), choice(keyword('VARCHAR'), keyword('VARCHARACTER'))),
              seq(keyword('NCHAR'), choice(keyword('VARYING'), keyword('VARCHAR'), keyword('VARCHARACTER'))),
              keyword('NVARCHAR')
            ),
            $._field_length,
            repeat($._string_type_modifier)
          ),
          seq(
            choice(
              seq(optional(keyword('NATIONAL')), choice(keyword('CHAR'), keyword('CHARACTER'))),
              keyword('NCHAR'),
              keyword('TEXT')
            ),
            optional($._field_length),
            repeat($._string_type_modifier)
          ),
          seq(
            choice(
              keyword('TINYTEXT'),
              keyword('MEDIUMTEXT'),
              keyword('LONGTEXT'),
              seq(
                keyword('LONG'),
                optional(
                  choice(
                    keyword('VARCHAR'),
                    keyword('VARCHARACTER'),
                    seq(choice(keyword('CHAR'), keyword('CHARACTER')), keyword('VARYING'))
                  )
                )
              )
            ),
            repeat($._string_type_modifier)
          ),
          seq(keyword('VARBINARY'), $._field_length),
          seq(choice(keyword('BINARY'), keyword('BLOB')), optional($._field_length)),
          keyword('TINYBLOB'),
          keyword('MEDIUMBLOB'),
          keyword('LONGBLOB'),
          keywords('LONG VARBINARY'),
          seq(
            choice(keyword('ENUM'), keyword('SET')),
            '(',
            commaSep1($.string_literal),
            ')',
            repeat($._string_type_modifier)
          ),
          // JSON & spatial types
          keyword('JSON'),
          keyword('GEOMETRY'),
          keyword('POINT'),
          keyword('LINESTRING'),
          keyword('POLYGON'),
          keyword('MULTIPOINT'),
          keyword('MULTILINESTRING'),
          keyword('MULTIPOLYGON'),
          keyword('GEOMETRYCOLLECTION'),
          keyword('GEOMCOLLECTION')
        )
      ),

    _field_length: ($) =>
      seq(
        '(',
        choice(
          alias(choice($._uint64_literal, $._overflow_int_literal, $._decimal_literal), $.numeric_literal),
          seq($._float_literal, $._unreachable)
        ),
        ')'
      ),

    _uint_length_literal: ($) =>
      choice(
        alias($._uint64_literal, $.numeric_literal),
        seq(choice($._overflow_int_literal, $._decimal_literal, $._float_literal), $._unreachable)
      ),

    _float_options: ($) => choice($._field_length, seq('(', $._uint_length_literal, ',', $._uint_length_literal, ')')),

    _string_type_modifier: ($) =>
      choice(
        keyword('BINARY'),
        keyword('ascii'),
        keyword('UNICODE'),
        keyword('BYTE'),
        $._charset_clause,
        seq(keyword('COLLATE'), $._identifier_or_string)
      ),

    // =========================================================================
    // ALTER TABLE, DROP, RENAME, TRUNCATE, INDEX, VIEW
    // =========================================================================

    alter_table_statement: ($) =>
      seq(
        keywords('ALTER TABLE'),
        field('table', $.qualified_name),
        optional(commaSep1($.alter_table_action)),
        optional(choice($.partition_by_clause_ddl, keywords('REMOVE PARTITIONING')))
      ),

    alter_table_action: ($) =>
      choice(
        repeat1($.table_option),
        seq(
          keyword('ADD'),
          choice(
            seq(optional(keyword('COLUMN')), $.column_definition, optional($._column_position)),
            seq(optional(keyword('COLUMN')), '(', commaSep1($._create_definition), ')'),
            $.table_constraint,
            seq(keyword('PARTITION'), '(', commaSep1($.partition_definition), ')')
          )
        ),
        seq(keyword('MODIFY'), optional(keyword('COLUMN')), $.column_definition, optional($._column_position)),
        seq(
          keyword('CHANGE'),
          optional(keyword('COLUMN')),
          field('old_name', $._identifier),
          $.column_definition,
          optional($._column_position)
        ),
        seq(
          keyword('RENAME'),
          choice(
            seq(keyword('COLUMN'), field('old_name', $._identifier), keyword('TO'), field('new_name', $._identifier)),
            seq(
              choice(keyword('INDEX'), keyword('KEY')),
              field('old_name', $._identifier),
              keyword('TO'),
              field('new_name', $._identifier)
            ),
            seq(optional(choice(keyword('TO'), keyword('AS'))), field('new_table', $.qualified_name))
          )
        ),
        seq(
          keyword('ALTER'),
          choice(
            seq(
              optional(keyword('COLUMN')),
              field('column', $._identifier),
              choice(
                seq(keyword('SET'), $.default_clause),
                keywords('DROP DEFAULT'),
                seq(keyword('SET'), choice(keyword('VISIBLE'), keyword('INVISIBLE')))
              )
            ),
            seq(
              choice(keyword('INDEX'), keyword('KEY')),
              field('index', $._identifier),
              choice(keyword('VISIBLE'), keyword('INVISIBLE'))
            ),
            seq(
              choice(keyword('CHECK'), keyword('CONSTRAINT')),
              field('constraint', $._identifier),
              optional(keyword('NOT')),
              keyword('ENFORCED')
            )
          )
        ),
        seq(
          keyword('DROP'),
          choice(
            keywords('PRIMARY KEY'),
            seq(choice(keyword('INDEX'), keyword('KEY')), field('index', $._identifier)),
            seq(keywords('FOREIGN KEY'), field('constraint', $._identifier)),
            seq(choice(keyword('CHECK'), keyword('CONSTRAINT')), field('constraint', $._identifier)),
            seq(keyword('PARTITION'), commaSep1($._identifier)),
            seq(optional(keyword('COLUMN')), field('column', $._identifier))
          )
        ),
        seq(keywords('CONVERT TO'), $._charset_clause, optional(seq(keyword('COLLATE'), $._identifier_or_string))),
        $._algorithm_or_lock_option,
        keyword('FORCE'),
        seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('VALIDATION')),
        seq(choice(keyword('DISABLE'), keyword('ENABLE')), keyword('KEYS')),
        seq(choice(keyword('DISCARD'), keyword('IMPORT')), keyword('TABLESPACE')),
        seq(keywords('ORDER BY'), commaSep1($.ordering_term)),
        seq(
          choice(
            keyword('TRUNCATE'),
            keyword('ANALYZE'),
            keyword('CHECK'),
            keyword('OPTIMIZE'),
            keyword('REBUILD'),
            keyword('REPAIR')
          ),
          keyword('PARTITION'),
          choice(keyword('ALL'), commaSep1($._identifier))
        ),
        seq(keywords('COALESCE PARTITION'), $.numeric_literal),
        seq(
          keywords('REORGANIZE PARTITION'),
          commaSep1($._identifier),
          keyword('INTO'),
          '(',
          commaSep1($.partition_definition),
          ')'
        ),
        seq(
          keywords('EXCHANGE PARTITION'),
          $._identifier,
          keywords('WITH TABLE'),
          $.qualified_name,
          optional(seq(choice(keyword('WITH'), keyword('WITHOUT')), keyword('VALIDATION')))
        ),
        seq(choice(keyword('SECONDARY_LOAD'), keyword('SECONDARY_UNLOAD')), optional($.partition_names_clause))
      ),

    _column_position: ($) => choice(keyword('FIRST'), seq(keyword('AFTER'), field('after', $._identifier))),

    _algorithm_or_lock_option: () =>
      choice(
        seq(
          keyword('ALGORITHM'),
          optionalEq(choice(keyword('DEFAULT'), keyword('INSTANT'), keyword('INPLACE'), keyword('COPY')))
        ),
        seq(
          keyword('LOCK'),
          optionalEq(choice(keyword('DEFAULT'), keyword('NONE'), keyword('SHARED'), keyword('EXCLUSIVE')))
        )
      ),

    drop_table_statement: ($) =>
      seq(
        keyword('DROP'),
        optional(keyword('TEMPORARY')),
        keyword('TABLE'),
        optional($.if_exists),
        commaSep1($.qualified_name),
        optional(choice(keyword('RESTRICT'), keyword('CASCADE')))
      ),

    rename_table_statement: ($) =>
      seq(
        keywords('RENAME TABLE'),
        commaSep1(seq(field('from', $.qualified_name), keyword('TO'), field('to', $.qualified_name)))
      ),

    truncate_statement: ($) => seq(keyword('TRUNCATE'), optional(keyword('TABLE')), field('table', $.qualified_name)),

    create_index_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(choice(keyword('UNIQUE'), keyword('FULLTEXT'), keyword('SPATIAL'))),
        keyword('INDEX'),
        field('name', $._identifier),
        optional($.index_type),
        keyword('ON'),
        field('table', $.qualified_name),
        '(',
        commaSep1($.key_part),
        ')',
        repeat(choice($.index_option, $._algorithm_or_lock_option))
      ),

    drop_index_statement: ($) =>
      seq(
        keywords('DROP INDEX'),
        field('name', $._identifier),
        keyword('ON'),
        field('table', $.qualified_name),
        repeat($._algorithm_or_lock_option)
      ),

    create_view_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keywords('OR REPLACE')),
        optional($._view_algorithm),
        optional($.definer_clause),
        optional($._sql_security_clause),
        keyword('VIEW'),
        field('name', $.qualified_name),
        optional($.column_list),
        keyword('AS'),
        alias($._subquery_select, $.select_statement),
        optional($._view_check_option)
      ),

    alter_view_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional($._view_algorithm),
        optional($.definer_clause),
        optional($._sql_security_clause),
        keyword('VIEW'),
        field('name', $.qualified_name),
        optional($.column_list),
        keyword('AS'),
        alias($._subquery_select, $.select_statement),
        optional($._view_check_option)
      ),

    _view_algorithm: () =>
      seq(keyword('ALGORITHM'), '=', choice(keyword('UNDEFINED'), keyword('MERGE'), keyword('TEMPTABLE'))),

    definer_clause: ($) => seq(keyword('DEFINER'), '=', $.account_name),

    _sql_security_clause: () => seq(keywords('SQL SECURITY'), choice(keyword('DEFINER'), keyword('INVOKER'))),

    _view_check_option: () =>
      seq(keyword('WITH'), optional(choice(keyword('CASCADED'), keyword('LOCAL'))), keywords('CHECK OPTION')),

    drop_view_statement: ($) =>
      seq(
        keywords('DROP VIEW'),
        optional($.if_exists),
        commaSep1($.qualified_name),
        optional(choice(keyword('RESTRICT'), keyword('CASCADE')))
      ),

    column_list: ($) => seq('(', commaSep1($._identifier), ')'),

    // =========================================================================
    // Stored Programs & Compound Statements
    // =========================================================================

    create_trigger_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($.definer_clause),
        keyword('TRIGGER'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        choice(keyword('BEFORE'), keyword('AFTER')),
        choice(keyword('INSERT'), keyword('UPDATE'), keyword('DELETE')),
        keyword('ON'),
        field('table', $.qualified_name),
        keywords('FOR EACH ROW'),
        optional(seq(choice(keyword('FOLLOWS'), keyword('PRECEDES')), $.qualified_name)),
        $._routine_statement
      ),

    drop_trigger_statement: ($) =>
      seq(keywords('DROP TRIGGER'), optional($.if_exists), field('name', $.qualified_name)),

    create_procedure_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($.definer_clause),
        keyword('PROCEDURE'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        '(',
        commaSep($.procedure_parameter),
        ')',
        repeat($.routine_characteristic),
        $._routine_statement
      ),

    procedure_parameter: ($) =>
      seq(optional(choice(keyword('IN'), keyword('OUT'), keyword('INOUT'))), field('name', $._identifier), $.data_type),

    create_function_statement: ($) =>
      seq(
        keyword('CREATE'),
        choice(
          seq(
            optional($.definer_clause),
            keyword('FUNCTION'),
            optional($.if_not_exists),
            field('name', $.qualified_name),
            '(',
            commaSep($.function_parameter),
            ')',
            keyword('RETURNS'),
            $.data_type,
            repeat($.routine_characteristic),
            $._routine_statement
          ),
          seq(
            optional(keyword('AGGREGATE')),
            keyword('FUNCTION'),
            optional($.if_not_exists),
            field('name', $._identifier),
            keyword('RETURNS'),
            choice(keyword('STRING'), keyword('INTEGER'), keyword('REAL'), keyword('DECIMAL')),
            keyword('SONAME'),
            field('soname', $.string_literal)
          )
        )
      ),

    function_parameter: ($) => seq(field('name', $._identifier), $.data_type),

    routine_characteristic: ($) =>
      choice(
        seq(keyword('COMMENT'), $.string_literal),
        keywords('LANGUAGE SQL'),
        seq(optional(keyword('NOT')), keyword('DETERMINISTIC')),
        keywords('CONTAINS SQL'),
        keywords('NO SQL'),
        keywords('READS SQL DATA'),
        keywords('MODIFIES SQL DATA'),
        $._sql_security_clause
      ),

    alter_routine_statement: ($) =>
      seq(
        keyword('ALTER'),
        choice(keyword('PROCEDURE'), keyword('FUNCTION')),
        field('name', $.qualified_name),
        repeat($.routine_characteristic)
      ),

    drop_routine_statement: ($) =>
      seq(
        keyword('DROP'),
        choice(keyword('PROCEDURE'), keyword('FUNCTION')),
        optional($.if_exists),
        field('name', $.qualified_name)
      ),

    create_event_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional($.definer_clause),
        keyword('EVENT'),
        optional($.if_not_exists),
        field('name', $.qualified_name),
        $.event_schedule,
        optional(seq(keywords('ON COMPLETION'), optional(keyword('NOT')), keyword('PRESERVE'))),
        optional($._event_status),
        optional(seq(keyword('COMMENT'), $.string_literal)),
        keyword('DO'),
        $._routine_statement
      ),

    alter_event_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional($.definer_clause),
        keyword('EVENT'),
        field('name', $.qualified_name),
        optional($.event_schedule),
        optional(seq(keywords('ON COMPLETION'), optional(keyword('NOT')), keyword('PRESERVE'))),
        optional(seq(keywords('RENAME TO'), $.qualified_name)),
        optional($._event_status),
        optional(seq(keyword('COMMENT'), $.string_literal)),
        optional(seq(keyword('DO'), $._routine_statement))
      ),

    event_schedule: ($) =>
      seq(
        keywords('ON SCHEDULE'),
        choice(
          seq(keyword('AT'), $._expression),
          seq(
            keyword('EVERY'),
            $._expression,
            $.interval_unit,
            optional(seq(keyword('STARTS'), $._expression)),
            optional(seq(keyword('ENDS'), $._expression))
          )
        )
      ),

    _event_status: () =>
      choice(
        keyword('ENABLE'),
        seq(keyword('DISABLE'), optional(seq(keyword('ON'), choice(keyword('REPLICA'), keyword('SLAVE')))))
      ),

    drop_event_statement: ($) => seq(keywords('DROP EVENT'), optional($.if_exists), field('name', $.qualified_name)),

    create_tablespace_statement: ($) =>
      seq(
        keyword('CREATE'),
        optional(keyword('UNDO')),
        keyword('TABLESPACE'),
        field('name', $._identifier),
        repeat($._tablespace_option)
      ),

    alter_tablespace_statement: ($) =>
      seq(
        keyword('ALTER'),
        optional(keyword('UNDO')),
        keyword('TABLESPACE'),
        field('name', $._identifier),
        repeat1($._tablespace_option)
      ),

    _tablespace_option: ($) =>
      choice(
        seq(choice(keyword('ADD'), keyword('DROP')), keyword('DATAFILE'), $.string_literal),
        seq(keywords('USE LOGFILE GROUP'), $._identifier),
        seq(
          choice(
            keyword('EXTENT_SIZE'),
            keyword('INITIAL_SIZE'),
            keyword('AUTOEXTEND_SIZE'),
            keyword('MAX_SIZE'),
            keyword('FILE_BLOCK_SIZE'),
            keyword('NODEGROUP')
          ),
          optionalEq($._identifier_or_number)
        ),
        keyword('WAIT'),
        seq(keyword('COMMENT'), optionalEq($.string_literal)),
        seq(keyword('ENCRYPTION'), optionalEq($.string_literal)),
        seq(keyword('ENGINE'), optionalEq($._identifier_or_string)),
        seq(keyword('ENGINE_ATTRIBUTE'), optionalEq($.string_literal)),
        seq(keywords('RENAME TO'), $._identifier),
        seq(keyword('SET'), choice(keyword('ACTIVE'), keyword('INACTIVE')))
      ),

    drop_tablespace_statement: ($) =>
      seq(
        keyword('DROP'),
        optional(keyword('UNDO')),
        keyword('TABLESPACE'),
        field('name', $._identifier),
        optional(seq(keyword('ENGINE'), optionalEq($._identifier_or_string)))
      ),

    create_logfile_group_statement: ($) =>
      seq(
        keywords('CREATE LOGFILE GROUP'),
        field('name', $._identifier),
        keywords('ADD UNDOFILE'),
        $.string_literal,
        repeat($._logfile_group_option)
      ),

    alter_logfile_group_statement: ($) =>
      seq(
        keywords('ALTER LOGFILE GROUP'),
        field('name', $._identifier),
        keywords('ADD UNDOFILE'),
        $.string_literal,
        repeat($._logfile_group_option)
      ),

    _logfile_group_option: ($) =>
      choice(
        seq(
          choice(
            keyword('INITIAL_SIZE'),
            keyword('UNDO_BUFFER_SIZE'),
            keyword('REDO_BUFFER_SIZE'),
            keyword('NODEGROUP')
          ),
          optionalEq($._identifier_or_number)
        ),
        keyword('WAIT'),
        seq(keyword('COMMENT'), optionalEq($.string_literal)),
        seq(keyword('ENGINE'), optionalEq($._identifier_or_string))
      ),

    drop_logfile_group_statement: ($) =>
      seq(
        keywords('DROP LOGFILE GROUP'),
        field('name', $._identifier),
        optional(seq(keyword('ENGINE'), optionalEq($._identifier_or_string)))
      ),

    create_server_statement: ($) =>
      seq(
        keywords('CREATE SERVER'),
        field('name', $._identifier_or_string),
        keywords('FOREIGN DATA WRAPPER'),
        field('wrapper', $._identifier_or_string),
        keyword('OPTIONS'),
        '(',
        commaSep1($._server_option),
        ')'
      ),

    alter_server_statement: ($) =>
      seq(
        keywords('ALTER SERVER'),
        field('name', $._identifier_or_string),
        keyword('OPTIONS'),
        '(',
        commaSep1($._server_option),
        ')'
      ),

    _server_option: ($) =>
      choice(
        seq(
          choice(
            keyword('HOST'),
            keyword('DATABASE'),
            keyword('USER'),
            keyword('PASSWORD'),
            keyword('SOCKET'),
            keyword('OWNER')
          ),
          $.string_literal
        ),
        seq(keyword('PORT'), $.numeric_literal)
      ),

    drop_server_statement: ($) =>
      seq(keywords('DROP SERVER'), optional($.if_exists), field('name', $._identifier_or_string)),

    create_srs_statement: ($) =>
      seq(
        keyword('CREATE'),
        choice(
          seq(keywords('OR REPLACE'), keywords('SPATIAL REFERENCE SYSTEM')),
          seq(keywords('SPATIAL REFERENCE SYSTEM'), optional($.if_not_exists))
        ),
        field('srid', $.numeric_literal),
        repeat1($._srs_attribute)
      ),

    _srs_attribute: ($) =>
      choice(
        seq(keyword('NAME'), $.string_literal),
        seq(keyword('DEFINITION'), $.string_literal),
        seq(keyword('ORGANIZATION'), $.string_literal, keywords('IDENTIFIED BY'), $.numeric_literal),
        seq(keyword('DESCRIPTION'), $.string_literal)
      ),

    drop_srs_statement: ($) =>
      seq(keywords('DROP SPATIAL REFERENCE SYSTEM'), optional($.if_exists), field('srid', $.numeric_literal)),

    create_resource_group_statement: ($) =>
      seq(
        keywords('CREATE RESOURCE GROUP'),
        field('name', $._identifier),
        keyword('TYPE'),
        '=',
        choice(keyword('SYSTEM'), keyword('USER')),
        repeat($._resource_group_option)
      ),

    alter_resource_group_statement: ($) =>
      seq(
        keywords('ALTER RESOURCE GROUP'),
        field('name', $._identifier),
        repeat($._resource_group_option),
        optional(keyword('FORCE'))
      ),

    _resource_group_option: ($) =>
      choice(
        seq(keyword('VCPU'), optionalEq(commaSep1(seq($.numeric_literal, optional(seq('-', $.numeric_literal)))))),
        seq(keyword('THREAD_PRIORITY'), optionalEq(seq(optional(choice('+', '-')), $.numeric_literal))),
        keyword('ENABLE'),
        keyword('DISABLE')
      ),

    drop_resource_group_statement: ($) =>
      seq(keywords('DROP RESOURCE GROUP'), field('name', $._identifier), optional(keyword('FORCE'))),

    set_resource_group_statement: ($) =>
      seq(
        keywords('SET RESOURCE GROUP'),
        field('name', $._identifier),
        optional(seq(keyword('FOR'), commaSep1($.numeric_literal)))
      ),

    alter_instance_statement: ($) =>
      seq(
        keywords('ALTER INSTANCE'),
        choice(
          seq(choice(keyword('ENABLE'), keyword('DISABLE')), keywords('INNODB REDO_LOG')),
          seq(keyword('ROTATE'), choice(keyword('INNODB'), keyword('BINLOG')), keywords('MASTER KEY')),
          seq(
            keywords('RELOAD TLS'),
            optional(seq(keywords('FOR CHANNEL'), $._identifier)),
            optional(keywords('NO ROLLBACK ON ERROR'))
          ),
          keywords('RELOAD KEYRING')
        )
      ),

    _routine_statement: ($) =>
      choice(
        $.compound_statement,
        $.if_statement,
        $.case_statement,
        $.while_statement,
        $.repeat_statement,
        $.loop_statement,
        $.leave_statement,
        $.iterate_statement,
        $.return_statement,
        $.open_statement,
        $.fetch_statement,
        $.close_statement,
        alias($._sp_get_diagnostics_statement, $.get_diagnostics_statement),
        alias($._sp_signal_statement, $.signal_statement),
        alias($._sp_resignal_statement, $.resignal_statement),
        ...commonStatements($)
      ),

    compound_statement: ($) =>
      seq(
        optional(seq(field('label', $._label_identifier), ':')),
        keyword('BEGIN'),
        repeat(seq($.declare_statement, ';')),
        repeat(seq($._routine_statement, ';')),
        keyword('END'),
        optional(field('end_label', $._label_identifier))
      ),

    declare_statement: ($) =>
      seq(
        keyword('DECLARE'),
        choice(
          seq(
            field('condition', $._identifier),
            keywords('CONDITION FOR'),
            choice($._sqlstate_clause, $.numeric_literal)
          ),
          seq(field('cursor', $._identifier), keywords('CURSOR FOR'), alias($._subquery_select, $.select_statement)),
          seq(
            choice(keyword('CONTINUE'), keyword('EXIT'), keyword('UNDO')),
            keywords('HANDLER FOR'),
            commaSep1($._handler_condition_value),
            $._routine_statement
          ),
          seq(commaSep1($._identifier), $.data_type, optional(seq(keyword('DEFAULT'), field('value', $._expression))))
        )
      ),

    _handler_condition_value: ($) =>
      choice(
        $._sqlstate_clause,
        keyword('SQLEXCEPTION'),
        keyword('SQLWARNING'),
        keywords('NOT FOUND'),
        $.numeric_literal,
        $._identifier
      ),

    _routine_statement_list: ($) => repeat1(seq($._routine_statement, ';')),

    if_statement: ($) =>
      seq(
        keyword('IF'),
        field('condition', $._expression),
        keyword('THEN'),
        $._routine_statement_list,
        repeat(seq(keyword('ELSEIF'), $._expression, keyword('THEN'), $._routine_statement_list)),
        optional(seq(keyword('ELSE'), $._routine_statement_list)),
        keywords('END IF')
      ),

    case_statement: ($) =>
      seq(
        keyword('CASE'),
        optional(field('operand', $._expression)),
        repeat1(seq(keyword('WHEN'), $._expression, keyword('THEN'), $._routine_statement_list)),
        optional(seq(keyword('ELSE'), $._routine_statement_list)),
        keywords('END CASE')
      ),

    while_statement: ($) =>
      seq(
        optional(seq(field('label', $._label_identifier), ':')),
        keyword('WHILE'),
        field('condition', $._expression),
        keyword('DO'),
        $._routine_statement_list,
        keywords('END WHILE'),
        optional(field('end_label', $._label_identifier))
      ),

    repeat_statement: ($) =>
      seq(
        optional(seq(field('label', $._label_identifier), ':')),
        keyword('REPEAT'),
        $._routine_statement_list,
        keyword('UNTIL'),
        field('condition', $._expression),
        keywords('END REPEAT'),
        optional(field('end_label', $._label_identifier))
      ),

    loop_statement: ($) =>
      seq(
        optional(seq(field('label', $._label_identifier), ':')),
        keyword('LOOP'),
        $._routine_statement_list,
        keywords('END LOOP'),
        optional(field('end_label', $._label_identifier))
      ),

    leave_statement: ($) => seq(keyword('LEAVE'), field('label', $._label_identifier)),

    iterate_statement: ($) => seq(keyword('ITERATE'), field('label', $._label_identifier)),

    return_statement: ($) => seq(keyword('RETURN'), field('value', $._expression)),

    open_statement: ($) => seq(keyword('OPEN'), field('cursor', $._identifier)),

    fetch_statement: ($) =>
      seq(
        keyword('FETCH'),
        optional(seq(optional(keyword('NEXT')), keyword('FROM'))),
        field('cursor', $._identifier),
        keyword('INTO'),
        commaSep1($._identifier)
      ),

    close_statement: ($) => seq(keyword('CLOSE'), field('cursor', $._identifier)),

    signal_statement: ($) => seq(keyword('SIGNAL'), $._sqlstate_clause, optional($._signal_set_clause)),

    resignal_statement: ($) => seq(keyword('RESIGNAL'), optional($._sqlstate_clause), optional($._signal_set_clause)),

    _sp_signal_statement: ($) =>
      seq(keyword('SIGNAL'), choice($._sqlstate_clause, $._identifier), optional($._signal_set_clause)),

    _sp_resignal_statement: ($) =>
      seq(keyword('RESIGNAL'), optional(choice($._sqlstate_clause, $._identifier)), optional($._signal_set_clause)),

    _sqlstate_clause: ($) =>
      seq(keyword('SQLSTATE'), optional(keyword('VALUE')), alias($._sqlstate_literal, $.string_literal)),

    _signal_set_clause: ($) =>
      seq(
        keyword('SET'),
        alias($._first_signal_information_item, $.signal_information_item),
        repeat(seq(',', $.signal_information_item))
      ),

    _first_signal_information_item: ($) =>
      seq(field('name', alias($._signal_first_item_name, $.identifier)), '=', field('value', $._signal_allowed_expr)),

    signal_information_item: ($) =>
      seq(field('name', alias($._signal_next_item_name, $.identifier)), '=', field('value', $._signal_allowed_expr)),

    _signal_allowed_expr: ($) => choice($._literal, $.user_variable, $.system_variable, $.column_reference),

    _diagnostics_condition_item_name: ($) =>
      choice(
        ...SIGNAL_CONDITION_ITEMS.map((word) => alias(keyword(word), $.identifier)),
        alias(keyword('RETURNED_SQLSTATE'), $.identifier)
      ),

    get_diagnostics_statement: ($) =>
      seq(
        keyword('GET'),
        optional(choice(keyword('CURRENT'), keyword('STACKED'))),
        keyword('DIAGNOSTICS'),
        choice(
          commaSep1(seq($.user_variable, '=', choice(keyword('NUMBER'), keyword('ROW_COUNT')))),
          seq(
            keyword('CONDITION'),
            $._signal_allowed_expr,
            commaSep1(seq($.user_variable, '=', $._diagnostics_condition_item_name))
          )
        )
      ),

    _sp_get_diagnostics_statement: ($) =>
      seq(
        keyword('GET'),
        optional(choice(keyword('CURRENT'), keyword('STACKED'))),
        keyword('DIAGNOSTICS'),
        choice(
          commaSep1(seq(choice($._identifier, $.user_variable), '=', choice(keyword('NUMBER'), keyword('ROW_COUNT')))),
          seq(
            keyword('CONDITION'),
            $._signal_allowed_expr,
            commaSep1(seq(choice($._identifier, $.user_variable), '=', $._diagnostics_condition_item_name))
          )
        )
      ),

    // =========================================================================
    // Session, Transactions, Locks, Admin & Utility Statements
    // =========================================================================

    set_statement: ($) =>
      seq(
        keyword('SET'),
        choice(
          seq(
            optional(choice(keyword('GLOBAL'), keyword('SESSION'))),
            keyword('TRANSACTION'),
            commaSep1($._transaction_characteristic)
          ),
          commaSep1($._set_item)
        )
      ),

    _set_item: ($) =>
      choice(
        $._charset_clause,
        seq(
          keyword('NAMES'),
          choice(
            keyword('DEFAULT'),
            seq(
              $._identifier_or_string,
              optional(seq(keyword('COLLATE'), choice($._identifier_or_string, keyword('DEFAULT'))))
            )
          )
        ),
        $.variable_assignment
      ),

    variable_assignment: ($) =>
      choice(
        seq(field('variable', $.user_variable), choice('=', ':='), field('value', $._expression)),
        seq(
          optional(
            choice(keyword('GLOBAL'), keyword('SESSION'), keyword('LOCAL'), keyword('PERSIST'), keyword('PERSIST_ONLY'))
          ),
          field('variable', choice($.system_variable, alias($._lvalue_column_reference, $.column_reference))),
          choice('=', ':='),
          field('value', $._set_value)
        )
      ),

    _set_value: ($) =>
      choice(
        $._expression,
        keyword('DEFAULT'),
        keyword('ON'),
        keyword('ALL'),
        keyword('BINARY'),
        keyword('ROW'),
        keyword('SYSTEM')
      ),

    _transaction_characteristic: () =>
      choice(
        seq(
          keywords('ISOLATION LEVEL'),
          choice(
            keywords('REPEATABLE READ'),
            keywords('READ COMMITTED'),
            keywords('READ UNCOMMITTED'),
            keyword('SERIALIZABLE')
          )
        ),
        keywords('READ WRITE'),
        keywords('READ ONLY')
      ),

    start_transaction_statement: () =>
      seq(
        keywords('START TRANSACTION'),
        optional(commaSep1(choice(keywords('WITH CONSISTENT SNAPSHOT'), keywords('READ WRITE'), keywords('READ ONLY'))))
      ),

    begin_statement: () => seq(keyword('BEGIN'), optional(keyword('WORK'))),

    commit_statement: ($) =>
      seq(keyword('COMMIT'), optional(keyword('WORK')), optional($._chain_clause), optional($._release_clause)),

    rollback_statement: ($) =>
      seq(
        keyword('ROLLBACK'),
        optional(keyword('WORK')),
        choice(
          seq(keyword('TO'), optional(keyword('SAVEPOINT')), field('savepoint', $._identifier)),
          seq(optional($._chain_clause), optional($._release_clause))
        )
      ),

    _chain_clause: () => seq(keyword('AND'), optional(keyword('NO')), keyword('CHAIN')),

    _release_clause: () => seq(optional(keyword('NO')), keyword('RELEASE')),

    savepoint_statement: ($) => seq(keyword('SAVEPOINT'), field('name', $._identifier)),

    release_savepoint_statement: ($) => seq(keywords('RELEASE SAVEPOINT'), field('name', $._identifier)),

    lock_tables_statement: ($) =>
      seq(
        keyword('LOCK'),
        choice(keyword('TABLES'), keyword('TABLE')),
        commaSep1(
          seq(
            $.qualified_name,
            optional($._table_alias),
            choice(
              seq(keyword('READ'), optional(keyword('LOCAL'))),
              seq(optional(keyword('LOW_PRIORITY')), keyword('WRITE'))
            )
          )
        )
      ),

    unlock_tables_statement: () => seq(keyword('UNLOCK'), choice(keyword('TABLES'), keyword('TABLE'))),

    lock_instance_statement: () => keywords('LOCK INSTANCE FOR BACKUP'),

    unlock_instance_statement: () => keywords('UNLOCK INSTANCE'),

    xa_statement: ($) =>
      seq(
        keyword('XA'),
        choice(
          seq(choice(keyword('START'), keyword('BEGIN')), $._xid, optional(choice(keyword('JOIN'), keyword('RESUME')))),
          seq(keyword('END'), $._xid, optional(seq(keyword('SUSPEND'), optional(keywords('FOR MIGRATE'))))),
          seq(keyword('PREPARE'), $._xid),
          seq(keyword('COMMIT'), $._xid, optional(keywords('ONE PHASE'))),
          seq(keyword('ROLLBACK'), $._xid),
          seq(keyword('RECOVER'), optional(keywords('CONVERT XID')))
        )
      ),

    _xid: ($) => seq($._xid_string, optional(seq(',', $._xid_string, optional(seq(',', $.numeric_literal))))),

    _xid_string: ($) => choice($.string_literal, $.hex_literal, $.bit_literal),

    change_replication_source_statement: ($) =>
      seq(
        keywords('CHANGE REPLICATION SOURCE TO'),
        commaSep1($._replication_source_option),
        optional(seq(keywords('FOR CHANNEL'), $.string_literal))
      ),

    _replication_source_option: ($) =>
      choice(
        seq(keyword('PRIVILEGE_CHECKS_USER'), '=', choice($.null, $.account_name)),
        seq(keyword('IGNORE_SERVER_IDS'), '=', '(', commaSep($.numeric_literal), ')'),
        seq($._identifier, '=', choice($.string_literal, $.numeric_literal, $.null, keyword('ON'), $._identifier))
      ),

    change_replication_filter_statement: ($) =>
      seq(
        keywords('CHANGE REPLICATION FILTER'),
        commaSep1($._replication_filter),
        optional(seq(keywords('FOR CHANNEL'), $.string_literal))
      ),

    _replication_filter: ($) =>
      choice(
        seq(choice(keyword('REPLICATE_DO_DB'), keyword('REPLICATE_IGNORE_DB')), '=', '(', commaSep($._identifier), ')'),
        seq(
          choice(keyword('REPLICATE_DO_TABLE'), keyword('REPLICATE_IGNORE_TABLE')),
          '=',
          '(',
          commaSep($.qualified_name),
          ')'
        ),
        seq(
          choice(keyword('REPLICATE_WILD_DO_TABLE'), keyword('REPLICATE_WILD_IGNORE_TABLE')),
          '=',
          '(',
          commaSep($.string_literal),
          ')'
        ),
        seq(keyword('REPLICATE_REWRITE_DB'), '=', '(', commaSep(seq('(', $._identifier, ',', $._identifier, ')')), ')')
      ),

    start_replica_statement: ($) =>
      seq(
        keywords('START REPLICA'),
        optional(commaSep1(choice(keyword('IO_THREAD'), keyword('SQL_THREAD')))),
        optional($._replica_until_clause),
        repeat($._replica_connection_option),
        optional(seq(keywords('FOR CHANNEL'), $.string_literal))
      ),

    _replica_until_clause: ($) =>
      seq(
        keyword('UNTIL'),
        choice(
          seq(choice(keyword('SQL_BEFORE_GTIDS'), keyword('SQL_AFTER_GTIDS')), '=', $.string_literal),
          seq(
            keyword('SOURCE_LOG_FILE'),
            '=',
            $.string_literal,
            ',',
            keyword('SOURCE_LOG_POS'),
            '=',
            $.numeric_literal
          ),
          seq(keyword('RELAY_LOG_FILE'), '=', $.string_literal, ',', keyword('RELAY_LOG_POS'), '=', $.numeric_literal),
          keyword('SQL_AFTER_MTS_GAPS')
        )
      ),

    _replica_connection_option: ($) =>
      seq(
        choice(keyword('USER'), keyword('PASSWORD'), keyword('DEFAULT_AUTH'), keyword('PLUGIN_DIR')),
        '=',
        $.string_literal
      ),

    stop_replica_statement: ($) =>
      seq(
        keywords('STOP REPLICA'),
        optional(commaSep1(choice(keyword('IO_THREAD'), keyword('SQL_THREAD')))),
        optional(seq(keywords('FOR CHANNEL'), $.string_literal))
      ),

    group_replication_statement: ($) =>
      choice(
        seq(keywords('START GROUP_REPLICATION'), optional(commaSep1($._replica_connection_option))),
        keywords('STOP GROUP_REPLICATION')
      ),

    install_statement: ($) =>
      seq(
        keyword('INSTALL'),
        choice(
          seq(keyword('PLUGIN'), field('name', $._identifier), keyword('SONAME'), field('soname', $.string_literal)),
          seq(
            keyword('COMPONENT'),
            commaSep1($.string_literal),
            optional(seq(keyword('SET'), commaSep1($.variable_assignment)))
          )
        )
      ),

    uninstall_statement: ($) =>
      seq(
        keyword('UNINSTALL'),
        choice(
          seq(keyword('PLUGIN'), field('name', $._identifier)),
          seq(keyword('COMPONENT'), commaSep1($.string_literal))
        )
      ),

    clone_statement: ($) =>
      seq(
        keyword('CLONE'),
        choice(
          seq(keywords('LOCAL DATA DIRECTORY'), optionalEq($.string_literal)),
          seq(
            keywords('INSTANCE FROM'),
            $.account_name,
            ':',
            $.numeric_literal,
            keywords('IDENTIFIED BY'),
            $.string_literal,
            optional(seq(keywords('DATA DIRECTORY'), optionalEq($.string_literal))),
            optional(seq(keyword('REQUIRE'), optional(keyword('NO')), keyword('SSL')))
          )
        )
      ),

    cache_index_statement: ($) =>
      seq(
        keywords('CACHE INDEX'),
        choice(
          commaSep1(
            seq(
              $.qualified_name,
              optional(
                seq(
                  optional(choice(keyword('INDEX'), keyword('KEY'))),
                  '(',
                  commaSep1(choice($._identifier, keyword('PRIMARY'))),
                  ')'
                )
              )
            )
          ),
          seq($.qualified_name, keyword('PARTITION'), '(', choice(keyword('ALL'), commaSep1($._identifier)), ')')
        ),
        keyword('IN'),
        choice($._identifier, keyword('DEFAULT'))
      ),

    load_index_statement: ($) =>
      seq(
        keywords('LOAD INDEX INTO CACHE'),
        commaSep1(
          seq(
            $.qualified_name,
            optional(seq(keyword('PARTITION'), '(', choice(keyword('ALL'), commaSep1($._identifier)), ')')),
            optional(
              seq(
                choice(keyword('INDEX'), keyword('KEY')),
                '(',
                commaSep1(choice($._identifier, keyword('PRIMARY'))),
                ')'
              )
            ),
            optional(keywords('IGNORE LEAVES'))
          )
        )
      ),

    show_statement: ($) =>
      seq(
        keyword('SHOW'),
        choice(
          seq(
            optional(keyword('EXTENDED')),
            optional(keyword('FULL')),
            choice(keyword('COLUMNS'), keyword('FIELDS')),
            choice(keyword('FROM'), keyword('IN')),
            $.qualified_name,
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          seq(
            optional(keyword('EXTENDED')),
            optional(keyword('FULL')),
            keyword('TABLES'),
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          seq(choice(keyword('DATABASES'), keyword('SCHEMAS')), optional($._like_or_where)),
          seq(
            optional(choice(keyword('GLOBAL'), keyword('SESSION'))),
            choice(keyword('VARIABLES'), keyword('STATUS')),
            optional($._like_or_where)
          ),
          seq(
            optional(keyword('EXTENDED')),
            choice(keyword('INDEX'), keyword('INDEXES'), keyword('KEYS')),
            choice(keyword('FROM'), keyword('IN')),
            $.qualified_name,
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($.where_clause)
          ),
          seq(
            keyword('CREATE'),
            choice(
              seq(keyword('USER'), optional($.if_not_exists), $.account_name),
              seq(
                choice(
                  keyword('DATABASE'),
                  keyword('SCHEMA'),
                  keyword('TABLE'),
                  keyword('VIEW'),
                  keyword('PROCEDURE'),
                  keyword('FUNCTION'),
                  keyword('TRIGGER'),
                  keyword('EVENT')
                ),
                optional($.if_not_exists),
                $.qualified_name
              )
            )
          ),
          seq(
            keyword('GRANTS'),
            optional(
              seq(
                keyword('FOR'),
                $.account_name,
                optional(seq(keyword('USING'), commaSep1(alias($._role_name, $.account_name))))
              )
            )
          ),
          seq(optional(keyword('FULL')), keyword('PROCESSLIST')),
          seq(choice(keyword('WARNINGS'), keyword('ERRORS')), optional($.limit_clause)),
          seq(keyword('COUNT'), '(', '*', ')', choice(keyword('WARNINGS'), keyword('ERRORS'))),
          seq(
            keywords('TABLE STATUS'),
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          seq(choice(keyword('PROCEDURE'), keyword('FUNCTION')), keyword('STATUS'), optional($._like_or_where)),
          seq(choice(keyword('PROCEDURE'), keyword('FUNCTION')), keyword('CODE'), $.qualified_name),
          seq(
            choice(keyword('TRIGGERS'), keyword('EVENTS')),
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          seq(choice(keywords('CHARACTER SET'), keyword('CHARSET'), keyword('COLLATION')), optional($._like_or_where)),
          seq(optional(keyword('STORAGE')), keyword('ENGINES')),
          seq(
            keyword('ENGINE'),
            choice($._identifier, keyword('ALL')),
            choice(keyword('STATUS'), keyword('MUTEX'), keyword('LOGS'))
          ),
          keyword('PRIVILEGES'),
          keyword('PLUGINS'),
          keyword('PROFILES'),
          seq(
            keyword('PROFILE'),
            optional(
              commaSep1(
                choice(
                  keyword('ALL'),
                  keywords('BLOCK IO'),
                  keywords('CONTEXT SWITCHES'),
                  keyword('CPU'),
                  keyword('IPC'),
                  keyword('MEMORY'),
                  keywords('PAGE FAULTS'),
                  keyword('SOURCE'),
                  keyword('SWAPS')
                )
              )
            ),
            optional(seq(keywords('FOR QUERY'), $.numeric_literal)),
            optional($.limit_clause)
          ),
          seq(
            keywords('OPEN TABLES'),
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          keywords('BINARY LOGS'),
          keywords('BINARY LOG STATUS'),
          seq(
            choice(keyword('BINLOG'), keyword('RELAYLOG')),
            keyword('EVENTS'),
            optional(seq(keyword('IN'), $.string_literal)),
            optional(seq(keyword('FROM'), $.numeric_literal)),
            optional($.limit_clause),
            optional(seq(keywords('FOR CHANNEL'), $.string_literal))
          ),
          seq(keyword('REPLICA'), keyword('STATUS'), optional(seq(keywords('FOR CHANNEL'), $.string_literal))),
          keyword('REPLICAS')
        )
      ),

    _like_or_where: ($) => choice(seq(keyword('LIKE'), $.string_literal), $.where_clause),

    describe_statement: ($) =>
      seq(
        choice(keyword('EXPLAIN'), keyword('DESCRIBE'), keyword('DESC')),
        field('table', $.qualified_name),
        optional(choice($._identifier, $.string_literal))
      ),

    explain_statement: ($) =>
      seq(
        choice(keyword('EXPLAIN'), keyword('DESCRIBE'), keyword('DESC')),
        optional(
          choice(
            seq(keyword('ANALYZE'), optional($._explain_format)),
            keyword('EXTENDED'),
            keyword('PARTITIONS'),
            $._explain_format
          )
        ),
        choice(
          $.select_statement,
          $.insert_statement,
          $.replace_statement,
          $.update_statement,
          $.delete_statement,
          seq(keywords('FOR CONNECTION'), $.numeric_literal)
        )
      ),

    _explain_format: () =>
      seq(keyword('FORMAT'), '=', choice(keyword('TRADITIONAL'), keyword('JSON'), keyword('TREE'))),

    // =========================================================================
    // Users, Roles, Privileges
    // =========================================================================

    account_name: ($) =>
      choice(
        seq(keyword('CURRENT_USER'), optional(seq('(', ')'))),
        seq(field('user', $._identifier_or_string), optional($._account_host))
      ),

    _role_name: ($) => seq(field('user', choice($._role_identifier, $.string_literal)), optional($._account_host)),

    _account_host: ($) =>
      seq('@', field('host', choice($.string_literal, $.quoted_identifier, alias($._host_name, $.identifier)))),

    create_user_statement: ($) =>
      seq(
        keywords('CREATE USER'),
        optional($.if_not_exists),
        commaSep1($.user_specification),
        optional(seq(keywords('DEFAULT ROLE'), commaSep1(alias($._role_name, $.account_name)))),
        optional($._require_clause),
        optional($._resource_options),
        repeat($._password_or_lock_option)
      ),

    alter_user_statement: ($) =>
      seq(
        keywords('ALTER USER'),
        optional($.if_exists),
        choice(
          seq(keyword('USER'), '(', ')', $._alter_user_self_action),
          seq(
            commaSep1($.user_specification),
            optional(
              seq(
                keywords('DEFAULT ROLE'),
                choice(keyword('NONE'), keyword('ALL'), commaSep1(alias($._role_name, $.account_name)))
              )
            ),
            optional($._require_clause),
            optional($._resource_options),
            repeat($._password_or_lock_option)
          )
        )
      ),

    _alter_user_self_action: ($) =>
      choice(
        $.user_auth_option,
        keywords('DISCARD OLD PASSWORD'),
        repeat1(
          choice(
            seq(choice(keyword('ADD'), keyword('MODIFY')), $.numeric_literal, keyword('FACTOR'), $.user_auth_option),
            seq(keyword('DROP'), $.numeric_literal, keyword('FACTOR'))
          )
        )
      ),

    user_specification: ($) =>
      seq(
        $.account_name,
        optional(
          choice(
            seq(
              optional(keywords('INITIAL AUTHENTICATION')),
              $.user_auth_option,
              repeat(seq(keyword('AND'), $.user_auth_option))
            ),
            keywords('DISCARD OLD PASSWORD'),
            repeat1(
              choice(
                seq(
                  choice(keyword('ADD'), keyword('MODIFY')),
                  $.numeric_literal,
                  keyword('FACTOR'),
                  $.user_auth_option
                ),
                seq(keyword('DROP'), $.numeric_literal, keyword('FACTOR'))
              )
            )
          )
        )
      ),

    user_auth_option: ($) =>
      seq(
        keyword('IDENTIFIED'),
        choice(
          seq(
            keyword('BY'),
            choice(keywords('RANDOM PASSWORD'), $.string_literal),
            optional(seq(keyword('REPLACE'), $.string_literal)),
            optional(keywords('RETAIN CURRENT PASSWORD'))
          ),
          seq(
            keyword('WITH'),
            $._identifier_or_string,
            optional(
              choice(
                seq(keyword('BY'), choice(keywords('RANDOM PASSWORD'), $.string_literal)),
                seq(keyword('AS'), choice($.string_literal, alias($._bare_hex_literal, $.hex_literal)))
              )
            ),
            optional(seq(keyword('REPLACE'), $.string_literal)),
            optional(keywords('RETAIN CURRENT PASSWORD'))
          )
        )
      ),

    _require_clause: ($) =>
      seq(keyword('REQUIRE'), choice(keyword('NONE'), keyword('SSL'), keyword('X509'), $._tls_opts_7)),

    ...buildTlsOptionRules(),

    _resource_options: ($) =>
      seq(
        keyword('WITH'),
        repeat1(
          seq(
            choice(
              keyword('MAX_QUERIES_PER_HOUR'),
              keyword('MAX_UPDATES_PER_HOUR'),
              keyword('MAX_CONNECTIONS_PER_HOUR'),
              keyword('MAX_USER_CONNECTIONS')
            ),
            $.numeric_literal
          )
        )
      ),

    _password_or_lock_option: ($) =>
      choice(
        seq(
          keywords('PASSWORD EXPIRE'),
          optional(
            choice(keyword('DEFAULT'), keyword('NEVER'), seq(keyword('INTERVAL'), $.numeric_literal, keyword('DAY')))
          )
        ),
        seq(keywords('PASSWORD HISTORY'), choice(keyword('DEFAULT'), $.numeric_literal)),
        seq(keywords('PASSWORD REUSE INTERVAL'), choice(keyword('DEFAULT'), seq($.numeric_literal, keyword('DAY')))),
        seq(keywords('PASSWORD REQUIRE CURRENT'), optional(choice(keyword('DEFAULT'), keyword('OPTIONAL')))),
        seq(keyword('FAILED_LOGIN_ATTEMPTS'), $.numeric_literal),
        seq(keyword('PASSWORD_LOCK_TIME'), choice($.numeric_literal, keyword('UNBOUNDED'))),
        seq(keyword('ACCOUNT'), choice(keyword('LOCK'), keyword('UNLOCK'))),
        seq(keyword('COMMENT'), $.string_literal),
        seq(keyword('ATTRIBUTE'), $.string_literal)
      ),

    drop_user_statement: ($) => seq(keywords('DROP USER'), optional($.if_exists), commaSep1($.account_name)),

    rename_user_statement: ($) =>
      seq(keywords('RENAME USER'), commaSep1(seq($.account_name, keyword('TO'), $.account_name))),

    create_role_statement: ($) =>
      seq(keywords('CREATE ROLE'), optional($.if_not_exists), commaSep1(alias($._role_name, $.account_name))),

    drop_role_statement: ($) =>
      seq(keywords('DROP ROLE'), optional($.if_exists), commaSep1(alias($._role_name, $.account_name))),

    set_role_statement: ($) =>
      seq(
        keywords('SET ROLE'),
        choice(
          keyword('DEFAULT'),
          keyword('NONE'),
          seq(keyword('ALL'), optional(seq(keyword('EXCEPT'), commaSep1(alias($._role_name, $.account_name))))),
          commaSep1(alias($._role_name, $.account_name))
        )
      ),

    set_default_role_statement: ($) =>
      seq(
        keywords('SET DEFAULT ROLE'),
        choice(keyword('NONE'), keyword('ALL'), commaSep1(alias($._role_name, $.account_name))),
        keyword('TO'),
        commaSep1($.account_name)
      ),

    set_password_statement: ($) =>
      seq(
        keywords('SET PASSWORD'),
        optional(seq(keyword('FOR'), $.account_name)),
        choice(seq('=', $.string_literal), keywords('TO RANDOM')),
        optional(seq(keyword('REPLACE'), $.string_literal)),
        optional(keywords('RETAIN CURRENT PASSWORD'))
      ),

    grant_statement: ($) =>
      seq(
        keyword('GRANT'),
        choice(
          seq(
            keyword('PROXY'),
            keyword('ON'),
            $.account_name,
            keyword('TO'),
            commaSep1($.account_name),
            optional(keywords('WITH GRANT OPTION'))
          ),
          seq(
            commaSep1($.privilege_item),
            keyword('ON'),
            optional(choice(keyword('TABLE'), keyword('FUNCTION'), keyword('PROCEDURE'))),
            $.privilege_level,
            keyword('TO'),
            commaSep1($.account_name),
            optional(keywords('WITH GRANT OPTION')),
            optional(
              seq(
                keyword('AS'),
                $.account_name,
                optional(
                  seq(
                    keywords('WITH ROLE'),
                    choice(
                      keyword('DEFAULT'),
                      keyword('NONE'),
                      seq(
                        keyword('ALL'),
                        optional(seq(keyword('EXCEPT'), commaSep1(alias($._role_name, $.account_name))))
                      ),
                      commaSep1(alias($._role_name, $.account_name))
                    )
                  )
                )
              )
            )
          ),
          seq(
            commaSep1(alias($._role_name, $.account_name)),
            keyword('TO'),
            commaSep1($.account_name),
            optional(keywords('WITH ADMIN OPTION'))
          )
        )
      ),

    revoke_statement: ($) =>
      seq(
        keyword('REVOKE'),
        optional($.if_exists),
        choice(
          seq(
            keyword('PROXY'),
            keyword('ON'),
            $.account_name,
            keyword('FROM'),
            commaSep1($.account_name),
            optional($._revoke_tail)
          ),
          seq(
            commaSep1($.privilege_item),
            keyword('ON'),
            optional(choice(keyword('TABLE'), keyword('FUNCTION'), keyword('PROCEDURE'))),
            $.privilege_level,
            keyword('FROM'),
            commaSep1($.account_name),
            optional($._revoke_tail)
          ),
          seq(
            alias($._revoke_all_privilege, $.privilege_item),
            ',',
            alias($._revoke_grant_option, $.privilege_item),
            keyword('FROM'),
            commaSep1($.account_name),
            optional($._revoke_tail)
          ),
          seq(
            optional(keywords('ADMIN OPTION FOR')),
            commaSep1(alias($._role_name, $.account_name)),
            keyword('FROM'),
            commaSep1($.account_name),
            optional($._revoke_tail)
          )
        )
      ),

    _revoke_all_privilege: () => seq(keyword('ALL'), optional(keyword('PRIVILEGES'))),

    _revoke_grant_option: () => keywords('GRANT OPTION'),

    _revoke_tail: () => repeat1(choice(keywords('IGNORE UNKNOWN USER'), keywords('IGNORE UNKNOWN PRIVILEGE_LEVEL'))),

    privilege_item: ($) =>
      seq(
        choice(
          seq(keyword('ALL'), optional(keyword('PRIVILEGES'))),
          keywords('ALTER ROUTINE'),
          keyword('ALTER'),
          keywords('CREATE ROLE'),
          keywords('CREATE ROUTINE'),
          keywords('CREATE TABLESPACE'),
          keywords('CREATE TEMPORARY TABLES'),
          keywords('CREATE USER'),
          keywords('CREATE VIEW'),
          keyword('CREATE'),
          keyword('DELETE'),
          keywords('DROP ROLE'),
          keyword('DROP'),
          keyword('EVENT'),
          keyword('EXECUTE'),
          keyword('FILE'),
          keywords('GRANT OPTION'),
          keyword('INDEX'),
          keyword('INSERT'),
          keywords('LOCK TABLES'),
          keyword('PROCESS'),
          keyword('REFERENCES'),
          keyword('RELOAD'),
          keywords('REPLICATION CLIENT'),
          keywords('REPLICATION SLAVE'),
          keyword('SELECT'),
          keywords('SHOW DATABASES'),
          keywords('SHOW VIEW'),
          keyword('SHUTDOWN'),
          keyword('SUPER'),
          keyword('TRIGGER'),
          keyword('UPDATE'),
          keyword('USAGE'),
          $._identifier
        ),
        optional($.column_list)
      ),

    privilege_level: ($) => choice(seq('*', optional(seq('.', '*'))), seq($._identifier, '.', '*'), $.qualified_name),

    // =========================================================================
    // Maintenance, Prepared Statements, CALL, DO, HANDLER
    // =========================================================================

    table_maintenance_statement: ($) =>
      choice(
        seq(
          keyword('ANALYZE'),
          optional(choice(keyword('NO_WRITE_TO_BINLOG'), keyword('LOCAL'))),
          keyword('TABLE'),
          commaSep1($.qualified_name),
          optional(
            choice(
              seq(
                keywords('UPDATE HISTOGRAM ON'),
                commaSep1($._identifier),
                optional(seq(keyword('WITH'), $.numeric_literal, keyword('BUCKETS')))
              ),
              seq(keywords('DROP HISTOGRAM ON'), commaSep1($._identifier))
            )
          )
        ),
        seq(
          keyword('CHECK'),
          keyword('TABLE'),
          commaSep1($.qualified_name),
          repeat(
            choice(
              keywords('FOR UPGRADE'),
              keyword('QUICK'),
              keyword('FAST'),
              keyword('MEDIUM'),
              keyword('EXTENDED'),
              keyword('CHANGED')
            )
          )
        ),
        seq(
          keyword('CHECKSUM'),
          keyword('TABLE'),
          commaSep1($.qualified_name),
          optional(choice(keyword('QUICK'), keyword('EXTENDED')))
        ),
        seq(
          keyword('OPTIMIZE'),
          optional(choice(keyword('NO_WRITE_TO_BINLOG'), keyword('LOCAL'))),
          keyword('TABLE'),
          commaSep1($.qualified_name)
        ),
        seq(
          keyword('REPAIR'),
          optional(choice(keyword('NO_WRITE_TO_BINLOG'), keyword('LOCAL'))),
          keyword('TABLE'),
          commaSep1($.qualified_name),
          repeat(choice(keyword('QUICK'), keyword('EXTENDED'), keyword('USE_FRM')))
        )
      ),

    flush_statement: ($) =>
      seq(
        keyword('FLUSH'),
        optional(choice(keyword('NO_WRITE_TO_BINLOG'), keyword('LOCAL'))),
        choice(
          seq(
            keyword('TABLES'),
            optional(commaSep1($.qualified_name)),
            optional(choice(keywords('WITH READ LOCK'), keywords('FOR EXPORT')))
          ),
          commaSep1(
            choice(
              seq(
                optional(
                  choice(
                    keyword('BINARY'),
                    keyword('ENGINE'),
                    keyword('ERROR'),
                    keyword('GENERAL'),
                    keyword('RELAY'),
                    keyword('SLOW')
                  )
                ),
                keyword('LOGS'),
                optional(seq(keywords('FOR CHANNEL'), $.string_literal))
              ),
              keyword('HOSTS'),
              keyword('OPTIMIZER_COSTS'),
              keyword('PRIVILEGES'),
              keyword('STATUS'),
              keyword('USER_RESOURCES')
            )
          )
        )
      ),

    reset_statement: ($) =>
      seq(
        keyword('RESET'),
        choice(
          seq(keywords('BINARY LOGS AND GTIDS'), optional(seq(keyword('TO'), $.numeric_literal))),
          seq(keyword('REPLICA'), optional(keyword('ALL')), optional(seq(keywords('FOR CHANNEL'), $.string_literal))),
          seq(keyword('PERSIST'), optional(seq(optional($.if_exists), $._identifier)))
        )
      ),

    purge_statement: ($) =>
      seq(
        keywords('PURGE BINARY LOGS'),
        choice(seq(keyword('TO'), $.string_literal), seq(keyword('BEFORE'), $._expression))
      ),

    kill_statement: ($) =>
      seq(keyword('KILL'), optional(choice(keyword('CONNECTION'), keyword('QUERY'))), $._expression),

    shutdown_statement: () => keyword('SHUTDOWN'),

    restart_statement: () => keyword('RESTART'),

    binlog_statement: ($) => seq(keyword('BINLOG'), $.string_literal),

    help_statement: ($) => seq(keyword('HELP'), $.string_literal),

    prepare_statement: ($) =>
      seq(keyword('PREPARE'), field('name', $._identifier), keyword('FROM'), choice($.string_literal, $.user_variable)),

    execute_statement: ($) =>
      seq(
        keyword('EXECUTE'),
        field('name', $._identifier),
        optional(seq(keyword('USING'), commaSep1($.user_variable)))
      ),

    deallocate_statement: ($) =>
      seq(choice(keyword('DEALLOCATE'), keyword('DROP')), keyword('PREPARE'), field('name', $._identifier)),

    call_statement: ($) =>
      seq(keyword('CALL'), field('procedure', $.qualified_name), optional(seq('(', commaSep($._expression), ')'))),

    do_statement: ($) => seq(keyword('DO'), commaSep1($._expression)),

    handler_statement: ($) =>
      seq(
        keyword('HANDLER'),
        field('table', $.qualified_name),
        choice(
          seq(keyword('OPEN'), optional($._table_alias)),
          keyword('CLOSE'),
          seq(
            keyword('READ'),
            choice(
              keyword('FIRST'),
              keyword('NEXT'),
              seq(
                field('index', $._identifier),
                choice(
                  keyword('FIRST'),
                  keyword('NEXT'),
                  keyword('PREV'),
                  keyword('LAST'),
                  seq(choice('=', '<=', '>=', '<', '>'), '(', commaSep1($._expression), ')')
                )
              )
            ),
            optional($.where_clause),
            optional($.limit_clause)
          )
        )
      ),

    // =========================================================================
    // Expressions & Operators
    // =========================================================================

    _expression: ($) =>
      choice($._bool_pri, $.is_expression, alias($._not_expression, $.unary_expression), $.binary_expression),

    _not_expression: ($) =>
      prec.right(PREC.NOT, seq(field('operator', keyword('NOT')), field('operand', $._expression))),

    binary_expression: ($) =>
      choice(
        leftBinaryOp(PREC.OR, $._expression, choice(keyword('OR'), '||')),
        leftBinaryOp(PREC.XOR, $._expression, keyword('XOR')),
        leftBinaryOp(PREC.AND, $._expression, choice(keyword('AND'), '&&'))
      ),

    is_expression: ($) =>
      prec.left(
        PREC.IS_BOOL,
        seq(
          field('left', $._bool_pri),
          keyword('IS'),
          optional(keyword('NOT')),
          field('right', choice($.boolean_literal, keyword('UNKNOWN')))
        )
      ),

    _bool_pri: ($) =>
      choice(
        $._predicate,
        alias($._is_null_expression, $.is_expression),
        alias($._compare_binary_expression, $.binary_expression),
        $.quantified_comparison_expression
      ),

    _is_null_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(field('left', $._bool_pri), keyword('IS'), optional(keyword('NOT')), field('right', $.null))
      ),

    _compare_binary_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(
          field('left', $._bool_pri),
          field('operator', choice('=', '<=>', '>=', '>', '<=', '<', '<>', '!=')),
          field('right', $._predicate)
        )
      ),

    quantified_comparison_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(
          field('left', $._bool_pri),
          field('operator', choice('=', '>=', '>', '<=', '<', '<>', '!=')),
          field('quantifier', choice(keyword('ANY'), keyword('SOME'), keyword('ALL'))),
          '(',
          alias($._subquery_select, $.select_statement),
          ')'
        )
      ),

    _predicate: ($) =>
      choice(
        $._bit_expr,
        $.in_expression,
        $.member_of_expression,
        $.between_expression,
        $.like_expression,
        alias($._predicate_binary_expression, $.binary_expression)
      ),

    _predicate_binary_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        choice(
          seq(
            field('left', $._bit_expr),
            field('operator', seq(optional(keyword('NOT')), choice(keyword('REGEXP'), keyword('RLIKE')))),
            field('right', $._bit_expr)
          ),
          seq(field('left', $._bit_expr), field('operator', keywords('SOUNDS LIKE')), field('right', $._bit_expr))
        )
      ),

    like_expression: ($) =>
      prec.right(
        PREC.PREDICATE,
        seq(
          field('left', $._bit_expr),
          optional(keyword('NOT')),
          keyword('LIKE'),
          field('right', $._simple_expr),
          optional(seq(keyword('ESCAPE'), field('escape', $._simple_expr)))
        )
      ),

    between_expression: ($) =>
      prec.right(
        PREC.PREDICATE,
        seq(
          field('value', $._bit_expr),
          optional(keyword('NOT')),
          keyword('BETWEEN'),
          field('low', $._bit_expr),
          keyword('AND'),
          field('high', $._predicate)
        )
      ),

    in_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(
          field('value', $._bit_expr),
          optional(keyword('NOT')),
          keyword('IN'),
          '(',
          choice(alias($._subquery_select, $.select_statement), commaSep1($._expression)),
          ')'
        )
      ),

    member_of_expression: ($) =>
      prec.left(
        PREC.PREDICATE,
        seq(field('value', $._bit_expr), keywords('MEMBER OF'), '(', field('array', $._simple_expr), ')')
      ),

    _bit_expr: ($) => choice($._simple_expr, alias($._bit_binary_expression, $.binary_expression)),

    _bit_binary_expression: ($) =>
      choice(
        leftBinaryOp(PREC.BIT_OR, $._bit_expr, '|'),
        leftBinaryOp(PREC.BIT_AND, $._bit_expr, '&'),
        leftBinaryOp(PREC.BIT_SHIFT, $._bit_expr, choice('<<', '>>')),
        leftBinaryOp(PREC.ADD, $._bit_expr, choice('+', '-')),
        leftBinaryOp(PREC.MUL, $._bit_expr, choice('*', '/', keyword('DIV'), '%', keyword('MOD'))),
        leftBinaryOp(PREC.BIT_XOR, $._bit_expr, '^')
      ),

    _simple_expr: ($) =>
      choice(
        $._literal,
        $.column_reference,
        $.user_variable,
        $.system_variable,
        $.placeholder,
        $.current_time_expression,
        $.parenthesized_expression,
        $.row_value,
        $.row_constructor,
        $.subquery,
        $.exists_expression,
        $.interval_expression,
        $.function_call,
        $.cast_expression,
        $.convert_expression,
        $.match_expression,
        $.case_expression,
        $.odbc_escape_expression,
        $.assignment_expression,
        $.unary_expression,
        $.collate_expression,
        alias($._json_binary_expression, $.binary_expression)
      ),

    assignment_expression: ($) =>
      prec.right(PREC.ASSIGN, seq(field('left', $.user_variable), ':=', field('right', $._expression))),

    unary_expression: ($) =>
      choice(
        prec.right(PREC.UNARY, seq(field('operator', choice('-', '+', '~')), field('operand', $._simple_expr))),
        prec.right(PREC.BANG, seq(field('operator', '!'), field('operand', $._simple_expr))),
        prec.right(PREC.BINARY, seq(field('operator', keyword('BINARY')), field('operand', $._simple_expr)))
      ),

    collate_expression: ($) =>
      prec.left(
        PREC.COLLATE,
        seq(field('value', $._simple_expr), keyword('COLLATE'), field('collation', $._identifier_or_string))
      ),

    _json_binary_expression: ($) =>
      prec.left(
        PREC.JSON,
        seq(
          field('left', $.column_reference),
          field('operator', choice('->', '->>')),
          field('right', alias($._string_segment, $.string_literal))
        )
      ),

    interval_expression: ($) =>
      seq(keyword('INTERVAL'), field('value', prec(PREC.INTERVAL, $._expression)), field('unit', $.interval_unit)),

    interval_unit: ($) => choice(...NON_RESERVED_INTERVAL_UNITS.map(keyword), $._reserved_interval_unit),

    _reserved_interval_unit: () => choice(...RESERVED_INTERVAL_UNITS.map(keyword)),

    parenthesized_expression: ($) => seq('(', $._expression, ')'),

    row_value: ($) => prec(-1, seq('(', $._expression, ',', commaSep1($._expression), ')')),

    subquery: ($) => seq('(', alias($._subquery_select, $.select_statement), ')'),

    exists_expression: ($) => seq(keyword('EXISTS'), '(', alias($._subquery_select, $.select_statement), ')'),

    current_time_expression: ($) =>
      choice(
        seq(choice(keyword('CURRENT_DATE'), keyword('UTC_DATE'), keyword('CURRENT_USER')), optional(seq('(', ')'))),
        seq(
          choice(
            keyword('CURRENT_TIME'),
            keyword('CURRENT_TIMESTAMP'),
            keyword('LOCALTIME'),
            keyword('LOCALTIMESTAMP'),
            keyword('UTC_TIME'),
            keyword('UTC_TIMESTAMP')
          ),
          optional(seq('(', optional($._uint_length_literal), ')'))
        )
      ),

    function_call: ($) =>
      seq(
        choice(
          seq(field('name', $._function_name), '(', commaSep($._expression), ')'),
          seq(
            field('name', alias(keyword('INTERVAL'), $.identifier)),
            '(',
            $._expression,
            ',',
            commaSep1($._expression),
            ')'
          ),
          seq(
            field('name', alias(keyword('CHAR'), $.identifier)),
            '(',
            commaSep1($._expression),
            optional(seq(keyword('USING'), choice($._identifier_or_string, keyword('BINARY')))),
            ')'
          ),
          seq(
            field('name', alias(keyword('COUNT'), $.identifier)),
            '(',
            choice(
              seq(optional(keyword('ALL')), alias('*', $.all_columns)),
              seq(optional(keyword('ALL')), $._expression),
              seq(keyword('DISTINCT'), commaSep1($._expression))
            ),
            ')'
          ),
          seq(
            field('name', choice(...DISTINCT_AGGREGATE_NAMES.map((word) => alias(keyword(word), $.identifier)))),
            '(',
            optional(choice(keyword('DISTINCT'), keyword('ALL'))),
            $._expression,
            ')'
          ),
          seq(
            field('name', choice(...ALL_ONLY_AGGREGATE_NAMES.map((word) => alias(keyword(word), $.identifier)))),
            '(',
            optional(keyword('ALL')),
            $._expression,
            ')'
          ),
          seq(
            field('name', alias(keyword('JSON_OBJECTAGG'), $.identifier)),
            '(',
            optional(keyword('ALL')),
            $._expression,
            ',',
            optional(keyword('ALL')),
            $._expression,
            ')'
          ),
          seq(
            field('name', alias(keyword('GROUP_CONCAT'), $.identifier)),
            '(',
            optional(keyword('DISTINCT')),
            commaSep1($._expression),
            optional($.order_by_clause),
            optional(seq(keyword('SEPARATOR'), $.string_literal)),
            ')'
          ),
          seq(
            field('name', alias(keyword('JSON_VALUE'), $.identifier)),
            '(',
            $._expression,
            ',',
            $.string_literal,
            optional(seq(keyword('RETURNING'), $.cast_type)),
            optional($._json_on_empty),
            optional($._json_on_error),
            ')'
          ),
          seq(
            field('name', alias(keyword('TRIM'), $.identifier)),
            '(',
            choice(
              seq(
                choice(keyword('BOTH'), keyword('LEADING'), keyword('TRAILING')),
                optional($._expression),
                keyword('FROM'),
                $._expression
              ),
              seq($._expression, optional(seq(keyword('FROM'), $._expression)))
            ),
            ')'
          ),
          seq(
            field(
              'name',
              choice(
                alias(keyword('SUBSTRING'), $.identifier),
                alias(keyword('SUBSTR'), $.identifier),
                alias(keyword('MID'), $.identifier)
              )
            ),
            '(',
            $._expression,
            choice(
              seq(',', $._expression, optional(seq(',', $._expression))),
              seq(keyword('FROM'), $._expression, optional(seq(keyword('FOR'), $._expression)))
            ),
            ')'
          ),
          seq(
            field('name', alias(keyword('EXTRACT'), $.identifier)),
            '(',
            $.interval_unit,
            keyword('FROM'),
            $._expression,
            ')'
          ),
          seq(
            field('name', alias(keyword('POSITION'), $.identifier)),
            '(',
            $._bit_expr,
            keyword('IN'),
            $._expression,
            ')'
          ),
          seq(
            field('name', alias(keyword('WEIGHT_STRING'), $.identifier)),
            '(',
            $._expression,
            optional(
              choice(
                seq(keyword('AS'), choice(keyword('CHAR'), keyword('BINARY')), '(', $._uint_length_literal, ')'),
                seq(',', $.numeric_literal, ',', $.numeric_literal, ',', $.numeric_literal)
              )
            ),
            ')'
          )
        ),
        optional(
          seq(
            optional(seq(keyword('FROM'), choice(keyword('FIRST'), keyword('LAST')))),
            optional($._null_treatment),
            $.over_clause
          )
        )
      ),

    _null_treatment: () => seq(choice(keyword('RESPECT'), keyword('IGNORE')), keyword('NULLS')),

    _function_name: ($) =>
      choice(
        reserved('function_name', $.identifier),
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        seq(field('schema', $._identifier), '.', field('function', $._dot_identifier)),
        ...[...RESERVED_FUNCTION_NAMES, ...TEMPORAL_LITERAL_KEYWORDS].map((word) => alias(keyword(word), $.identifier))
      ),

    over_clause: ($) =>
      seq(keyword('OVER'), choice(seq('(', optional($.window_definition), ')'), field('window', $._identifier))),

    cast_expression: ($) =>
      seq(
        keyword('CAST'),
        '(',
        field('value', $._expression),
        choice(
          seq(keyword('AS'), field('type', $.cast_type), optional(keyword('ARRAY'))),
          seq(
            keywords('AT TIME ZONE'),
            optional(keyword('INTERVAL')),
            field('timezone', $.string_literal),
            keyword('AS'),
            field('type', alias($._datetime_cast_type, $.cast_type))
          )
        ),
        ')'
      ),

    _datetime_cast_type: ($) => seq(keyword('DATETIME'), optional(seq('(', $._uint_length_literal, ')'))),

    convert_expression: ($) =>
      seq(
        keyword('CONVERT'),
        '(',
        field('value', $._expression),
        choice(seq(',', field('type', $.cast_type)), seq(keyword('USING'), field('charset', $._identifier))),
        ')'
      ),

    cast_type: ($) =>
      choice(
        seq(keyword('BINARY'), optional($._field_length)),
        seq(
          choice(keyword('CHAR'), keywords('NATIONAL CHAR')),
          optional($._field_length),
          repeat($._string_type_modifier)
        ),
        seq(keyword('NCHAR'), optional($._field_length)),
        keyword('DATE'),
        $._datetime_cast_type,
        seq(keyword('TIME'), optional(seq('(', $._uint_length_literal, ')'))),
        seq(choice(keyword('DECIMAL'), keyword('DEC')), optional($._float_options)),
        seq(keyword('DOUBLE'), optional(keyword('PRECISION'))),
        seq(keyword('FLOAT'), optional($._field_length)),
        keyword('JSON'),
        keyword('REAL'),
        seq(choice(keyword('SIGNED'), keyword('UNSIGNED')), optional(choice(keyword('INT'), keyword('INTEGER')))),
        keyword('YEAR'),
        keyword('POINT'),
        keyword('LINESTRING'),
        keyword('POLYGON'),
        keyword('MULTIPOINT'),
        keyword('MULTILINESTRING'),
        keyword('MULTIPOLYGON'),
        keyword('GEOMETRYCOLLECTION'),
        keyword('GEOMCOLLECTION')
      ),

    match_expression: ($) =>
      seq(
        keyword('MATCH'),
        choice(seq('(', commaSep1($.column_reference), ')'), commaSep1($.column_reference)),
        keyword('AGAINST'),
        '(',
        field('pattern', $._bit_expr),
        optional(
          choice(
            seq(keywords('IN NATURAL LANGUAGE MODE'), optional(keywords('WITH QUERY EXPANSION'))),
            keywords('IN BOOLEAN MODE'),
            keywords('WITH QUERY EXPANSION')
          )
        ),
        ')'
      ),

    odbc_escape_expression: ($) => seq('{', field('type', $._identifier), field('value', $._expression), '}'),

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

    // =========================================================================
    // Identifiers & Literals
    // =========================================================================

    qualified_name: ($) =>
      choice(field('name', $._identifier), seq(field('schema', $._identifier), '.', field('name', $._dot_identifier))),

    column_reference: ($) =>
      choice(
        field('name', $._identifier),
        seq(field('table', $._identifier), '.', field('name', $._dot_identifier)),
        seq(
          field('schema', $._identifier),
          '.',
          field('table', $._dot_identifier),
          '.',
          field('name', $._dot_identifier)
        )
      ),

    _lvalue_column_reference: ($) =>
      choice(
        field('name', $._lvalue_identifier),
        seq(field('table', $._lvalue_identifier), '.', field('name', $._dot_identifier)),
        seq(
          field('schema', $._lvalue_identifier),
          '.',
          field('table', $._dot_identifier),
          '.',
          field('name', $._dot_identifier)
        )
      ),

    _identifier: ($) =>
      choice(
        $.identifier,
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        ...[...SPECIAL_FUNCTION_NAMES, 'CAST'].map((word) => alias(keyword(word), $.identifier)),
        ...TEMPORAL_LITERAL_KEYWORDS.map((word) => prec(-1, alias(keyword(word), $.identifier)))
      ),

    _role_identifier: ($) =>
      choice(
        reserved('role', $.identifier),
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        ...[...SPECIAL_FUNCTION_NAMES, 'CAST'].map((word) => alias(keyword(word), $.identifier)),
        ...TEMPORAL_LITERAL_KEYWORDS.map((word) => prec(-1, alias(keyword(word), $.identifier)))
      ),

    _label_identifier: ($) =>
      choice(
        reserved('label', $.identifier),
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        ...[...SPECIAL_FUNCTION_NAMES, 'CAST'].map((word) => alias(keyword(word), $.identifier)),
        ...TEMPORAL_LITERAL_KEYWORDS.map((word) => prec(-1, alias(keyword(word), $.identifier)))
      ),

    _lvalue_identifier: ($) =>
      choice(
        reserved('lvalue', $.identifier),
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        ...[...SPECIAL_FUNCTION_NAMES, 'CAST'].map((word) => alias(keyword(word), $.identifier)),
        ...TEMPORAL_LITERAL_KEYWORDS.map((word) => prec(-1, alias(keyword(word), $.identifier)))
      ),

    _dot_identifier: ($) =>
      choice(
        reserved('none', $.identifier),
        alias($._digit_identifier, $.identifier),
        $.quoted_identifier,
        seq($._dot_context, $._unreachable)
      ),

    _literal: ($) =>
      choice(
        $.null,
        $.boolean_literal,
        $.numeric_literal,
        $.string_literal,
        $.temporal_literal,
        $.hex_literal,
        $.bit_literal
      ),

    null: () => keyword('NULL'),

    boolean_literal: () => choice(keyword('TRUE'), keyword('FALSE')),

    numeric_literal: ($) => choice($._uint64_literal, $._overflow_int_literal, $._decimal_literal, $._float_literal),

    _uint64_literal: () =>
      token(
        prec(
          1,
          /0*(?:[0-9]{1,19}|1(?:[0-7][0-9]{18}|8(?:[0-3][0-9]{17}|4(?:[0-3][0-9]{16}|4(?:[0-5][0-9]{15}|6(?:[0-6][0-9]{14}|7(?:[0-3][0-9]{13}|4(?:[0-3][0-9]{12}|40(?:[0-6][0-9]{10}|7(?:[0-2][0-9]{9}|3(?:[0-6][0-9]{8}|70(?:[0-8][0-9]{6}|9(?:[0-4][0-9]{5}|5(?:[0-4][0-9]{4}|5(?:0[0-9]{3}|1(?:[0-5][0-9]{2}|6(?:0[0-9]|1[0-5])))))))))))))))))/
        )
      ),

    _overflow_int_literal: () =>
      token(
        prec(
          1,
          /0*(?:[1-9][0-9]{20}[0-9]*|[2-9][0-9]{19}|1(?:9[0-9]{18}|8(?:[5-9][0-9]{17}|4(?:[5-9][0-9]{16}|4(?:[7-9][0-9]{15}|6(?:[89][0-9]{14}|7(?:[5-9][0-9]{13}|4(?:[5-9][0-9]{12}|4(?:[1-9][0-9]{11}|0(?:[89][0-9]{10}|7(?:[4-9][0-9]{9}|3(?:[89][0-9]{8}|7(?:[1-9][0-9]{7}|09(?:[6-9][0-9]{5}|5(?:[6-9][0-9]{4}|5(?:[2-9][0-9]{3}|1(?:[7-9][0-9]{2}|6(?:[2-9][0-9]|1[6-9]))))))))))))))))))/
        )
      ),

    _decimal_literal: () => token(prec(1, /[0-9]+\.[0-9]*|\.[0-9]+/)),

    _float_literal: () => token(prec(1, /([0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)[eE][+-]?[0-9]+/)),

    string_literal: ($) =>
      prec.right(choice(seq($.charset_introducer, repeat1($._string_segment)), $._plain_string_literal)),

    _plain_string_literal: ($) =>
      prec.right(choice(repeat1($._string_segment), seq($._national_string_segment, repeat($._string_segment)))),

    temporal_literal: ($) =>
      prec(
        1,
        seq(
          choice(...TEMPORAL_LITERAL_KEYWORDS.map(keyword)),
          field('value', alias($._string_segment, $.string_literal))
        )
      ),

    hex_literal: ($) => seq(optional($.charset_introducer), $._bare_hex_literal),

    _bare_hex_literal: ($) => choice($._quoted_hex_literal, token(prec(1, /0x[0-9a-fA-F]+/))),

    bit_literal: ($) => seq(optional($.charset_introducer), choice($._quoted_bit_literal, token(prec(1, /0b[01]+/)))),

    placeholder: () => '?',

    // Placed last so every keyword token defined above takes lexical priority over `word`.
    identifier: () => new RegExp(`[${IDENTIFIER_NON_DIGIT}][${IDENTIFIER_CHAR}]*`, 'u'),
  },
});
