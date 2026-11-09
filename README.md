# @willbooster/tree-sitter-sql

SQL grammars for [tree-sitter](https://github.com/tree-sitter/tree-sitter), generated with the
[WillBooster/tree-sitter](https://github.com/WillBooster/tree-sitter) generator. The first grammar parses SQLite's SQL
dialect.

## Support Scope

This repository maintains only full parsing: valid input yields a correct tree, and invalid input yields `ERROR` or
`MISSING` nodes without crashing, hanging, or taking more than linear time. No queries (highlights, locals, injections,
tags) are shipped. Node types, field names, and the trees that error recovery produces may change; such changes are
released as new major versions.
