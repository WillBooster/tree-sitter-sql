// A source and the tree it parses to with each grammar.
export const ExpectedTrees = {
  mysql: {
    source: 'SELECT a FROM t WHERE b = 1;\n',
    tree: '(source_file (select_statement (select_core (result_column value: (column_reference name: (identifier))) (from_clause (table name: (qualified_name name: (identifier)))) (where_clause condition: (binary_expression left: (column_reference name: (identifier)) right: (numeric_literal))))))',
  },
  oracle: {
    source: 'SELECT a FROM t WHERE b = 1;\n',
    tree: '(source_file (select_statement (select_core (select_list (select_item value: (identifier))) (from_clause (table_reference name: (object_name name: (identifier)))) (where_clause condition: (binary_expression left: (identifier) right: (numeric_literal))))))',
  },
  postgresql: {
    source: 'SELECT a FROM t WHERE b = 1;\n',
    tree: '(source_file (select_statement (select_core (result_column value: (column_reference name: (identifier))) (from_clause (table name: (qualified_name name: (identifier)))) (where_clause condition: (binary_expression left: (column_reference name: (identifier)) right: (numeric_literal))))))',
  },
  sqlite: {
    source: 'SELECT a FROM t WHERE b = 1;\n',
    tree: '(source_file (select_statement (select_core (result_column value: (column_reference name: (identifier))) (from_clause (table name: (qualified_name name: (identifier)))) (where_clause condition: (binary_expression left: (column_reference name: (identifier)) right: (numeric_literal))))))',
  },
};
