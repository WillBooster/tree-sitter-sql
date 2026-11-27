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
  BETWEEN: 6,
  COMPARE: 7,
  ESCAPE: 8,
  BIT_OR: 9,
  BIT_AND: 10,
  BIT_SHIFT: 11,
  ADD: 12,
  MUL: 13,
  BIT_XOR: 14,
  UNARY: 15,
  BANG: 16,
  BINARY: 17,
  JSON: 18,
  INTERVAL: 19,
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
  'MASTER_BIND',
  'MASTER_SSL_VERIFY_SERVER_CERT',
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
  'CHAR',
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

const UNUSED_RESERVED_WORDS = [
  'ACCESSIBLE',
  'ASENSITIVE',
  'CUBE',
  'INSENSITIVE',
  'IO_AFTER_GTIDS',
  'IO_BEFORE_GTIDS',
  'MASTER_BIND',
  'MASTER_SSL_VERIFY_SERVER_CERT',
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
 * @param {GrammarSymbols<string>} $
 * @param {number} precedence
 * @param {RuleOrLiteral} operator
 */
const binaryOp = ($, precedence, operator) =>
  prec.left(precedence, seq(field('left', $._expression), field('operator', operator), field('right', $._expression)));

export default grammar({
  name: 'mysql',

  extras: ($) => [/[\t\n\v\f\r ]+/, /\uFEFF/, $.comment, $._version_comment_start, $._version_comment_end, $._illegal],

  externals: ($) => [
    $.comment,
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
    $._statement_terminator,
    $._end_of_input,
    $._illegal_token,
    $._unreachable,
  ],

  word: ($) => $.identifier,

  reserved: {
    global: () => RESERVED.map(keywordPattern),
    // `FULL` is non-reserved in MySQL, except that `FROM a FULL [OUTER] JOIN b` is a syntax error rather than an alias.
    table_alias: () => [...RESERVED, 'FULL'].map(keywordPattern),
    // After `.` in a qualified name (`tbl.select`), MySQL permits reserved words without backticks.
    none: () => [],
  },

  supertypes: ($) => [$._statement],

  conflicts: ($) => [
    [$.privilege_item, $._identifier_or_string],
    [$.alter_table_action],
    [$.references_clause],
    [$.partition_by_clause_ddl],
    [$.order_by_clause],
    [$.group_by_clause],
    [$.check_constraint_body],
    [$.function_call],
  ],

  rules: {
    source_file: ($) =>
      seq(
        optional(choice($._statement, $._reserved_only)),
        repeat(seq(alias($._statement_terminator, ';'), optional(choice($._statement, $._reserved_only)))),
        $._end_of_input
      ),

    // Defined before `identifier` so these reserved words take lexical priority over `word` (`identifier`).
    _reserved_only: ($) => seq(choice(...UNUSED_RESERVED_WORDS.map(keyword)), $._unreachable),

    _illegal: ($) => seq($._illegal_token, $._unreachable),

    _statement: ($) =>
      choice(
        $.select_statement,
        $.insert_statement,
        $.replace_statement,
        $.update_statement,
        $.delete_statement,
        $.load_statement,
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
        $.set_statement,
        $.start_transaction_statement,
        $.begin_statement,
        $.commit_statement,
        $.rollback_statement,
        $.savepoint_statement,
        $.release_savepoint_statement,
        $.lock_tables_statement,
        $.unlock_tables_statement,
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
        $.prepare_statement,
        $.execute_statement,
        $.deallocate_statement,
        $.call_statement,
        $.do_statement,
        $.handler_statement
      ),

    // =========================================================================
    // Queries & SELECT
    // =========================================================================

    select_statement: ($) =>
      seq(
        optional($.with_clause),
        $._query_expression_body,
        optional($.order_by_clause),
        optional($.limit_clause),
        optional($.into_clause),
        repeat($.locking_clause)
      ),

    with_clause: ($) => seq(keyword('WITH'), optional(keyword('RECURSIVE')), commaSep1($.common_table_expression)),

    common_table_expression: ($) =>
      seq(field('name', $._identifier), optional($.column_list), keyword('AS'), '(', $.select_statement, ')'),

    _query_expression_body: ($) => prec.left(seq($._query_primary, repeat(seq($.compound_operator, $._query_primary)))),

    compound_operator: () =>
      seq(
        choice(keyword('UNION'), keyword('INTERSECT'), keyword('EXCEPT')),
        optional(choice(keyword('ALL'), keyword('DISTINCT')))
      ),

    _query_primary: ($) => choice($.select_core, $.values_statement, $.table_value_statement, $.parenthesized_query),

    parenthesized_query: ($) =>
      prec.right(
        1,
        seq(
          '(',
          optional($.with_clause),
          $._query_expression_body,
          optional($.order_by_clause),
          optional($.limit_clause),
          repeat($.locking_clause),
          ')'
        )
      ),

    values_statement: ($) => seq(keyword('VALUES'), commaSep1($.row_constructor)),

    row_constructor: ($) => seq(keyword('ROW'), '(', commaSep($._expression), ')'),

    table_value_statement: ($) => seq(keyword('TABLE'), field('table', $.qualified_name)),

    select_core: ($) =>
      prec.right(
        seq(
          keyword('SELECT'),
          repeat($._select_modifier),
          commaSep1(choice($.result_column, alias('*', $.all_columns), $.table_columns)),
          optional($.into_clause),
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

    _table_alias: ($) =>
      choice(
        seq(keyword('AS'), field('alias', $._identifier)),
        field(
          'alias',
          choice(reserved('table_alias', $.identifier), alias($._digit_identifier, $.identifier), $.quoted_identifier)
        )
      ),

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

    _table_reference: ($) => prec.left(seq($._table_factor, repeat($._join_clause))),

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
        commaSep($._identifier),
        ')'
      ),

    subquery_table: ($) =>
      seq(
        optional(keyword('LATERAL')),
        '(',
        $.select_statement,
        ')',
        optional($._table_alias),
        optional($.column_list)
      ),

    join_table: ($) => seq('(', $._table_references, ')'),

    json_table: ($) =>
      seq(
        keyword('JSON_TABLE'),
        '(',
        field('source', $._expression),
        ',',
        field('path', $._expression),
        keyword('COLUMNS'),
        '(',
        commaSep1($.json_table_column),
        ')',
        ')',
        optional($._table_alias)
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
          optional($._json_on_empty_or_error),
          optional($._json_on_empty_or_error)
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

    _json_on_empty_or_error: ($) =>
      seq(
        choice(keyword('NULL'), keyword('ERROR'), seq(keyword('DEFAULT'), $._expression)),
        keyword('ON'),
        choice(keyword('EMPTY'), keyword('ERROR'))
      ),

    _join_clause: ($) =>
      prec.right(
        choice(
          seq(
            optional(choice(keyword('INNER'), keyword('CROSS'))),
            keyword('JOIN'),
            $._table_factor,
            optional($.join_constraint)
          ),
          seq(
            keyword('STRAIGHT_JOIN'),
            $._table_factor,
            optional(seq(keyword('ON'), field('condition', $._expression)))
          ),
          seq(
            choice(keyword('LEFT'), keyword('RIGHT')),
            optional(keyword('OUTER')),
            keyword('JOIN'),
            $._table_reference,
            $.join_constraint
          ),
          seq(
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

    order_by_clause: ($) => seq(keywords('ORDER BY'), commaSep1($.ordering_term), optional(keywords('WITH ROLLUP'))),

    ordering_term: ($) => seq(field('value', $._expression), optional(choice(keyword('ASC'), keyword('DESC')))),

    limit_clause: ($) =>
      seq(
        keyword('LIMIT'),
        choice(
          seq(field('limit', $._limit_value), optional(seq(keyword('OFFSET'), field('offset', $._limit_value)))),
          seq(field('offset', $._limit_value), ',', field('limit', $._limit_value))
        )
      ),

    // Stored routines may also use local variables or parameters in LIMIT, while prepared statements use `?`.
    _limit_value: ($) => choice($.numeric_literal, $.placeholder, $._identifier),

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
                choice(keyword('VALUES'), keyword('VALUE')),
                commaSep1($.insert_values_row),
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
              alias($._insert_query, $.select_statement)
            )
          ),
          $.set_clause
        )
      ),

    _insert_query: ($) =>
      seq(
        optional($.with_clause),
        choice($.select_core, $.table_value_statement, $.parenthesized_query),
        repeat(seq($.compound_operator, $._query_primary)),
        optional($.order_by_clause),
        optional($.limit_clause),
        repeat($.locking_clause)
      ),

    _insert_column_list: ($) => seq('(', commaSep($.column_reference), ')'),

    insert_values_row: ($) =>
      seq(optional(keyword('ROW')), '(', commaSep(choice($._expression, keyword('DEFAULT'))), ')'),

    _insert_row_alias: ($) => seq(keyword('AS'), field('alias', $._identifier), optional($.column_list)),

    on_duplicate_key_update_clause: ($) => seq(keywords('ON DUPLICATE KEY UPDATE'), commaSep1($.assignment)),

    update_statement: ($) =>
      seq(
        optional($.with_clause),
        keyword('UPDATE'),
        optional(keyword('LOW_PRIORITY')),
        optional(keyword('IGNORE')),
        $._table_references,
        $.set_clause,
        optional($.where_clause),
        optional($.order_by_clause),
        optional($.limit_clause)
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
                optional($.partition_names_clause),
                optional($._table_alias),
                optional($.where_clause),
                optional($.order_by_clause),
                optional($.limit_clause)
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
      seq(optional(choice(keyword('IGNORE'), keyword('REPLACE'))), optional(keyword('AS')), $.select_statement),

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
          $._identifier,
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
            optional(seq('(', $.numeric_literal, ')')),
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
            optional(seq('(', $.numeric_literal, optional(seq(',', $.numeric_literal)), ')')),
            optional(choice(keyword('SIGNED'), keyword('UNSIGNED'))),
            optional(keyword('ZEROFILL'))
          ),
          // Temporal types
          keyword('DATE'),
          seq(
            choice(keyword('TIME'), keyword('DATETIME'), keyword('TIMESTAMP')),
            optional(seq('(', $.numeric_literal, ')'))
          ),
          seq(keyword('YEAR'), optional(seq('(', $.numeric_literal, ')'))),
          // String & binary types
          seq(
            choice(
              seq(
                optional(keyword('NATIONAL')),
                choice(keyword('CHAR'), keyword('CHARACTER')),
                optional(keyword('VARYING'))
              ),
              seq(optional(keyword('NATIONAL')), choice(keyword('VARCHAR'), keyword('VARCHARACTER'))),
              keyword('NCHAR'),
              keyword('NVARCHAR'),
              keyword('TINYTEXT'),
              keyword('TEXT'),
              keyword('MEDIUMTEXT'),
              keyword('LONGTEXT'),
              seq(keyword('LONG'), optional(choice(keyword('VARCHAR'), keywords('CHAR VARYING'))))
            ),
            optional(seq('(', $.numeric_literal, ')')),
            repeat($._string_type_modifier)
          ),
          seq(
            choice(
              keyword('BINARY'),
              keyword('VARBINARY'),
              keyword('TINYBLOB'),
              keyword('BLOB'),
              keyword('MEDIUMBLOB'),
              keyword('LONGBLOB'),
              keywords('LONG VARBINARY')
            ),
            optional(seq('(', $.numeric_literal, ')'))
          ),
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

    _string_type_modifier: ($) =>
      choice(
        keyword('BINARY'),
        keyword('ascii'),
        keyword('UNICODE'),
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
        choice(
          seq(commaSep1($.alter_table_action), optional($.partition_by_clause_ddl)),
          $.partition_by_clause_ddl,
          keywords('REMOVE PARTITIONING')
        )
      ),

    alter_table_action: ($) =>
      choice(
        $.table_option,
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
        )
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
        $.select_statement,
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
        $.select_statement,
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
        $.signal_statement,
        $.resignal_statement,
        $.get_diagnostics_statement,
        $._statement
      ),

    compound_statement: ($) =>
      seq(
        optional(seq(field('label', $._identifier), ':')),
        keyword('BEGIN'),
        optional(keyword('WORK')),
        repeat(seq($.declare_statement, ';')),
        repeat(seq($._routine_statement, ';')),
        keyword('END'),
        optional(field('end_label', $._identifier))
      ),

    declare_statement: ($) =>
      seq(
        keyword('DECLARE'),
        choice(
          seq(
            field('condition', $._identifier),
            keywords('CONDITION FOR'),
            choice(seq(keyword('SQLSTATE'), optional(keyword('VALUE')), $.string_literal), $.numeric_literal)
          ),
          seq(field('cursor', $._identifier), keywords('CURSOR FOR'), $.select_statement),
          seq(
            choice(keyword('CONTINUE'), keyword('EXIT'), keyword('UNDO')),
            keywords('HANDLER FOR'),
            commaSep1($._handler_condition_value),
            $._routine_statement
          ),
          seq(commaSep1($._identifier), $.data_type, optional($.default_clause))
        )
      ),

    _handler_condition_value: ($) =>
      choice(
        seq(keyword('SQLSTATE'), optional(keyword('VALUE')), $.string_literal),
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
        optional(seq(field('label', $._identifier), ':')),
        keyword('WHILE'),
        field('condition', $._expression),
        keyword('DO'),
        $._routine_statement_list,
        keywords('END WHILE'),
        optional(field('end_label', $._identifier))
      ),

    repeat_statement: ($) =>
      seq(
        optional(seq(field('label', $._identifier), ':')),
        keyword('REPEAT'),
        $._routine_statement_list,
        keyword('UNTIL'),
        field('condition', $._expression),
        keywords('END REPEAT'),
        optional(field('end_label', $._identifier))
      ),

    loop_statement: ($) =>
      seq(
        optional(seq(field('label', $._identifier), ':')),
        keyword('LOOP'),
        $._routine_statement_list,
        keywords('END LOOP'),
        optional(field('end_label', $._identifier))
      ),

    leave_statement: ($) => seq(keyword('LEAVE'), field('label', $._identifier)),

    iterate_statement: ($) => seq(keyword('ITERATE'), field('label', $._identifier)),

    return_statement: ($) => seq(keyword('RETURN'), field('value', $._expression)),

    open_statement: ($) => seq(keyword('OPEN'), field('cursor', $._identifier)),

    fetch_statement: ($) =>
      seq(
        keyword('FETCH'),
        optional(seq(optional(keyword('NEXT')), keyword('FROM'))),
        field('cursor', $._identifier),
        keyword('INTO'),
        commaSep1(choice($._identifier, $.user_variable))
      ),

    close_statement: ($) => seq(keyword('CLOSE'), field('cursor', $._identifier)),

    signal_statement: ($) =>
      seq(keyword('SIGNAL'), $._signal_condition, optional(seq(keyword('SET'), commaSep1($.signal_information_item)))),

    resignal_statement: ($) =>
      seq(
        keyword('RESIGNAL'),
        optional($._signal_condition),
        optional(seq(keyword('SET'), commaSep1($.signal_information_item)))
      ),

    _signal_condition: ($) =>
      choice(seq(keyword('SQLSTATE'), optional(keyword('VALUE')), $.string_literal), $._identifier),

    signal_information_item: ($) => seq(field('name', $._identifier), '=', field('value', $._expression)),

    get_diagnostics_statement: ($) =>
      seq(
        keyword('GET'),
        optional(choice(keyword('CURRENT'), keyword('STACKED'))),
        keyword('DIAGNOSTICS'),
        choice(
          commaSep1(seq(choice($._identifier, $.user_variable), '=', choice(keyword('NUMBER'), keyword('ROW_COUNT')))),
          seq(
            keyword('CONDITION'),
            $._expression,
            commaSep1(seq(choice($._identifier, $.user_variable), '=', $._identifier))
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
          seq(
            optional(choice(keyword('GLOBAL'), keyword('SESSION'))),
            keyword('TRANSACTION'),
            commaSep1($._transaction_characteristic)
          ),
          commaSep1($.variable_assignment)
        )
      ),

    variable_assignment: ($) =>
      choice(
        seq(field('variable', $.user_variable), choice('=', ':='), field('value', $._expression)),
        seq(
          optional(
            choice(keyword('GLOBAL'), keyword('SESSION'), keyword('LOCAL'), keyword('PERSIST'), keyword('PERSIST_ONLY'))
          ),
          field('variable', choice($.system_variable, $.column_reference)),
          '=',
          field('value', choice($._expression, keyword('DEFAULT')))
        )
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
            optional(seq(keyword('FOR'), $.account_name, optional(seq(keyword('USING'), commaSep1($.account_name)))))
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
          seq(keyword('ENGINE'), $._identifier, choice(keyword('STATUS'), keyword('MUTEX'), keyword('LOGS'))),
          keyword('PRIVILEGES'),
          keyword('PLUGINS'),
          seq(
            keywords('OPEN TABLES'),
            optional(seq(choice(keyword('FROM'), keyword('IN')), $._identifier)),
            optional($._like_or_where)
          ),
          seq(choice(keyword('BINARY'), keyword('MASTER')), keyword('LOGS')),
          keywords('MASTER STATUS'),
          keywords('BINARY LOG STATUS'),
          seq(
            choice(keyword('REPLICA'), keyword('SLAVE')),
            keyword('STATUS'),
            optional(seq(keywords('FOR CHANNEL'), $.string_literal))
          ),
          keyword('REPLICAS')
        )
      ),

    _like_or_where: ($) => choice(seq(keyword('LIKE'), $.string_literal), $.where_clause),

    describe_statement: ($) =>
      seq(
        choice(keyword('DESCRIBE'), keyword('DESC')),
        field('table', $.qualified_name),
        optional(choice($._identifier, $.string_literal))
      ),

    explain_statement: ($) =>
      seq(
        choice(keyword('EXPLAIN'), keyword('DESCRIBE'), keyword('DESC')),
        optional(
          choice(
            keyword('ANALYZE'),
            keyword('EXTENDED'),
            keyword('PARTITIONS'),
            seq(keyword('FORMAT'), '=', choice(keyword('TRADITIONAL'), keyword('JSON'), keyword('TREE')))
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

    // =========================================================================
    // Users, Roles, Privileges
    // =========================================================================

    account_name: ($) =>
      choice(
        seq(keyword('CURRENT_USER'), optional(seq('(', ')'))),
        seq(field('user', $._identifier_or_string), optional(seq('@', field('host', $._identifier_or_string))))
      ),

    create_user_statement: ($) =>
      seq(
        keywords('CREATE USER'),
        optional($.if_not_exists),
        commaSep1($.user_specification),
        optional(seq(keywords('DEFAULT ROLE'), commaSep1($.account_name))),
        optional($._require_clause),
        optional($._resource_options),
        repeat($._password_or_lock_option)
      ),

    alter_user_statement: ($) =>
      seq(
        keywords('ALTER USER'),
        optional($.if_exists),
        choice(
          seq(keyword('USER'), '(', ')', $.user_auth_option),
          seq(
            commaSep1($.user_specification),
            optional(seq(keywords('DEFAULT ROLE'), choice(keyword('NONE'), keyword('ALL'), commaSep1($.account_name)))),
            optional($._require_clause),
            optional($._resource_options),
            repeat($._password_or_lock_option)
          )
        )
      ),

    user_specification: ($) => seq($.account_name, optional($.user_auth_option)),

    user_auth_option: ($) =>
      seq(
        keyword('IDENTIFIED'),
        choice(
          seq(keyword('BY'), optional(keywords('RANDOM PASSWORD')), optional($.string_literal)),
          seq(
            keyword('WITH'),
            $._identifier_or_string,
            optional(choice(seq(keyword('BY'), $.string_literal), seq(keyword('AS'), $.string_literal)))
          )
        )
      ),

    _require_clause: ($) =>
      seq(
        keyword('REQUIRE'),
        choice(
          keyword('NONE'),
          repeat1(
            choice(
              keyword('SSL'),
              keyword('X509'),
              seq(choice(keyword('CIPHER'), keyword('ISSUER'), keyword('SUBJECT')), $.string_literal),
              keyword('AND')
            )
          )
        )
      ),

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
        seq(keywords('ACCOUNT'), choice(keyword('LOCK'), keyword('UNLOCK')))
      ),

    drop_user_statement: ($) => seq(keywords('DROP USER'), optional($.if_exists), commaSep1($.account_name)),

    rename_user_statement: ($) =>
      seq(keywords('RENAME USER'), commaSep1(seq($.account_name, keyword('TO'), $.account_name))),

    create_role_statement: ($) => seq(keywords('CREATE ROLE'), optional($.if_not_exists), commaSep1($.account_name)),

    drop_role_statement: ($) => seq(keywords('DROP ROLE'), optional($.if_exists), commaSep1($.account_name)),

    set_role_statement: ($) =>
      seq(
        keywords('SET ROLE'),
        choice(
          keyword('DEFAULT'),
          keyword('NONE'),
          seq(keyword('ALL'), optional(seq(keyword('EXCEPT'), commaSep1($.account_name)))),
          commaSep1($.account_name)
        )
      ),

    set_default_role_statement: ($) =>
      seq(
        keywords('SET DEFAULT ROLE'),
        choice(keyword('NONE'), keyword('ALL'), commaSep1($.account_name)),
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
                      seq(keyword('ALL'), optional(seq(keyword('EXCEPT'), commaSep1($.account_name)))),
                      commaSep1($.account_name)
                    )
                  )
                )
              )
            )
          ),
          seq(
            commaSep1($.account_name),
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
            commaSep1($.privilege_item),
            optional(
              seq(
                keyword('ON'),
                optional(choice(keyword('TABLE'), keyword('FUNCTION'), keyword('PROCEDURE'))),
                $.privilege_level
              )
            ),
            keyword('FROM'),
            commaSep1($.account_name)
          ),
          seq(
            optional(keywords('ADMIN OPTION FOR')),
            commaSep1($.account_name),
            keyword('FROM'),
            commaSep1($.account_name)
          )
        )
      ),

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
          seq(keyword('MASTER'), optional(seq(keyword('TO'), $.numeric_literal))),
          keywords('BINARY LOGS AND GTIDS'),
          seq(choice(keyword('REPLICA'), keyword('SLAVE')), optional(keyword('ALL'))),
          seq(keyword('PERSIST'), optional(seq(optional($.if_exists), $._identifier)))
        )
      ),

    purge_statement: ($) =>
      seq(
        keyword('PURGE'),
        choice(keyword('BINARY'), keyword('MASTER')),
        keyword('LOGS'),
        choice(seq(keyword('TO'), $.string_literal), seq(keyword('BEFORE'), $._expression))
      ),

    kill_statement: ($) =>
      seq(keyword('KILL'), optional(choice(keyword('CONNECTION'), keyword('QUERY'))), $._expression),

    shutdown_statement: () => keyword('SHUTDOWN'),

    restart_statement: () => keyword('RESTART'),

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
        $.assignment_expression,
        $.unary_expression,
        $.binary_expression,
        $.collate_expression,
        $.is_expression,
        $.like_expression,
        $.between_expression,
        $.in_expression,
        $.member_of_expression,
        $.quantified_comparison_expression
      ),

    assignment_expression: ($) =>
      prec.right(PREC.ASSIGN, seq(field('left', $.user_variable), ':=', field('right', $._expression))),

    unary_expression: ($) =>
      choice(
        prec.right(PREC.NOT, seq(field('operator', keyword('NOT')), field('operand', $._expression))),
        prec.right(PREC.UNARY, seq(field('operator', choice('-', '+', '~')), field('operand', $._expression))),
        prec.right(PREC.BANG, seq(field('operator', '!'), field('operand', $._expression))),
        prec.right(PREC.BINARY, seq(field('operator', keyword('BINARY')), field('operand', $._expression)))
      ),

    collate_expression: ($) =>
      prec.left(
        PREC.BINARY,
        seq(field('value', $._expression), keyword('COLLATE'), field('collation', $._identifier_or_string))
      ),

    binary_expression: ($) =>
      choice(
        binaryOp($, PREC.OR, choice(keyword('OR'), '||')),
        binaryOp($, PREC.XOR, keyword('XOR')),
        binaryOp($, PREC.AND, choice(keyword('AND'), '&&')),
        binaryOp(
          $,
          PREC.COMPARE,
          choice(
            '=',
            '<=>',
            '>=',
            '>',
            '<=',
            '<',
            '<>',
            '!=',
            seq(optional(keyword('NOT')), choice(keyword('REGEXP'), keyword('RLIKE'))),
            keywords('SOUNDS LIKE')
          )
        ),
        binaryOp($, PREC.BIT_OR, '|'),
        binaryOp($, PREC.BIT_AND, '&'),
        binaryOp($, PREC.BIT_SHIFT, choice('<<', '>>')),
        binaryOp($, PREC.ADD, choice('+', '-')),
        binaryOp($, PREC.MUL, choice('*', '/', keyword('DIV'), '%', keyword('MOD'))),
        binaryOp($, PREC.BIT_XOR, '^'),
        binaryOp($, PREC.JSON, choice('->', '->>'))
      ),

    is_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(
          field('left', $._expression),
          keyword('IS'),
          optional(keyword('NOT')),
          field('right', choice($.null, $.boolean_literal, keyword('UNKNOWN')))
        )
      ),

    like_expression: ($) =>
      choice(
        prec.left(PREC.COMPARE, seq($._like_head, field('right', $._expression))),
        seq(
          $._like_head,
          prec(PREC.ESCAPE, seq(field('right', $._expression), keyword('ESCAPE'))),
          prec.left(PREC.COMPARE, field('escape', $._expression))
        )
      ),

    _like_head: ($) =>
      prec.left(PREC.COMPARE, seq(field('left', $._expression), optional(keyword('NOT')), keyword('LIKE'))),

    between_expression: ($) =>
      prec.left(
        PREC.BETWEEN,
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
        PREC.COMPARE,
        seq(
          field('value', $._expression),
          optional(keyword('NOT')),
          keyword('IN'),
          '(',
          choice($.select_statement, commaSep1($._expression)),
          ')'
        )
      ),

    member_of_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(field('value', $._expression), keywords('MEMBER OF'), '(', field('array', $._expression), ')')
      ),

    quantified_comparison_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq(
          field('left', $._expression),
          field('operator', choice('=', '>=', '>', '<=', '<', '<>', '!=')),
          field('quantifier', choice(keyword('ANY'), keyword('SOME'), keyword('ALL'))),
          '(',
          $.select_statement,
          ')'
        )
      ),

    interval_expression: ($) =>
      seq(keyword('INTERVAL'), field('value', prec(PREC.INTERVAL, $._expression)), field('unit', $.interval_unit)),

    interval_unit: ($) => choice(...NON_RESERVED_INTERVAL_UNITS.map(keyword), $._reserved_interval_unit),

    _reserved_interval_unit: () => choice(...RESERVED_INTERVAL_UNITS.map(keyword)),

    parenthesized_expression: ($) => seq('(', $._expression, ')'),

    row_value: ($) => prec(-1, seq('(', $._expression, ',', commaSep1($._expression), ')')),

    subquery: ($) => seq('(', $.select_statement, ')'),

    exists_expression: ($) => seq(keyword('EXISTS'), '(', $.select_statement, ')'),

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
          optional(seq('(', optional($.numeric_literal), ')'))
        )
      ),

    function_call: ($) =>
      seq(
        choice(
          seq(field('name', $._function_name), '(', optional($._function_arguments), ')'),
          seq(
            field('name', alias(keyword('INTERVAL'), $.identifier)),
            '(',
            $._expression,
            ',',
            commaSep1($._expression),
            ')'
          )
        ),
        optional(seq(optional($._null_treatment), $.over_clause))
      ),

    _null_treatment: () => seq(choice(keyword('RESPECT'), keyword('IGNORE')), keyword('NULLS')),

    _function_arguments: ($) =>
      choice(
        alias('*', $.all_columns),
        seq(
          choice(keyword('BOTH'), keyword('LEADING'), keyword('TRAILING')),
          optional($._expression),
          keyword('FROM'),
          $._expression
        ),
        seq(
          choice($._expression, alias($._reserved_interval_unit, $.interval_unit)),
          keyword('FROM'),
          $._expression,
          optional(seq(keyword('FOR'), $._expression))
        ),
        prec(-1, seq($._expression, keyword('IN'), $._expression)),
        seq(
          optional(choice(keyword('DISTINCT'), keyword('ALL'))),
          commaSep1($._expression),
          optional($.order_by_clause),
          optional(seq(keyword('SEPARATOR'), $.string_literal)),
          optional(seq(keyword('USING'), $._identifier)),
          optional(seq(keyword('FROM'), choice(keyword('FIRST'), keyword('LAST')))),
          optional($._null_treatment),
          optional(seq(keyword('RETURNING'), $.cast_type)),
          optional($._json_on_empty_or_error),
          optional($._json_on_empty_or_error)
        )
      ),

    _function_name: ($) =>
      choice(
        $._identifier,
        seq(field('schema', $._identifier), '.', field('function', $._dot_identifier)),
        ...RESERVED_FUNCTION_NAMES.map((word) => alias(keyword(word), $.identifier))
      ),

    over_clause: ($) =>
      seq(keyword('OVER'), choice(seq('(', optional($.window_definition), ')'), field('window', $._identifier))),

    cast_expression: ($) =>
      seq(
        keyword('CAST'),
        '(',
        field('value', $._expression),
        keyword('AS'),
        field('type', $.cast_type),
        optional(keyword('ARRAY')),
        ')'
      ),

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
        seq(keyword('BINARY'), optional(seq('(', $.numeric_literal, ')'))),
        seq(
          keyword('CHAR'),
          optional(seq('(', $.numeric_literal, ')')),
          optional($._charset_clause),
          optional(seq(keyword('COLLATE'), $._identifier))
        ),
        keyword('NCHAR'),
        seq(keyword('NCHAR'), '(', $.numeric_literal, ')'),
        keyword('DATE'),
        seq(choice(keyword('DATETIME'), keyword('TIME')), optional(seq('(', $.numeric_literal, ')'))),
        seq(
          choice(keyword('DECIMAL'), keyword('DEC')),
          optional(seq('(', $.numeric_literal, optional(seq(',', $.numeric_literal)), ')'))
        ),
        keyword('DOUBLE'),
        seq(keyword('FLOAT'), optional(seq('(', $.numeric_literal, ')'))),
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
        keyword('GEOMETRYCOLLECTION')
      ),

    match_expression: ($) =>
      seq(
        keyword('MATCH'),
        '(',
        commaSep1($.column_reference),
        ')',
        keyword('AGAINST'),
        '(',
        field('pattern', $._expression),
        optional(
          choice(
            seq(keywords('IN NATURAL LANGUAGE MODE'), optional(keywords('WITH QUERY EXPANSION'))),
            keywords('IN BOOLEAN MODE'),
            keywords('WITH QUERY EXPANSION')
          )
        ),
        ')'
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

    _identifier: ($) => choice($.identifier, alias($._digit_identifier, $.identifier), $.quoted_identifier),

    _dot_identifier: ($) =>
      choice(reserved('none', $.identifier), alias($._digit_identifier, $.identifier), $.quoted_identifier),

    _literal: ($) =>
      choice($.null, $.boolean_literal, $.numeric_literal, $.string_literal, $.hex_literal, $.bit_literal),

    null: () => keyword('NULL'),

    boolean_literal: () => choice(keyword('TRUE'), keyword('FALSE')),

    numeric_literal: () => token(prec(1, /([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?/)),

    string_literal: ($) =>
      prec.right(
        choice(
          seq(optional($.charset_introducer), repeat1($._string_segment)),
          seq($._national_string_segment, repeat($._string_segment))
        )
      ),

    hex_literal: ($) =>
      seq(optional($.charset_introducer), choice($._quoted_hex_literal, token(prec(1, /0x[0-9a-fA-F]+/)))),

    bit_literal: ($) => seq(optional($.charset_introducer), choice($._quoted_bit_literal, token(prec(1, /0b[01]+/)))),

    placeholder: () => '?',

    // Placed last so every keyword token defined above takes lexical priority over `word`.
    identifier: () => new RegExp(`[${IDENTIFIER_NON_DIGIT}][${IDENTIFIER_CHAR}]*`, 'u'),
  },
});
