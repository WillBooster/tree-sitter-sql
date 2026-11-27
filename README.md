# @willbooster/tree-sitter-sql

[![npm version](https://img.shields.io/npm/v/@willbooster/tree-sitter-sql.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-sql)
[![license](https://img.shields.io/npm/l/@willbooster/tree-sitter-sql.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-sql)
[![Test](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test.yml)
[![Test rust](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test-rust.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test-rust.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![wbfy](https://img.shields.io/badge/wbfy-21.15.0-1e90ff.svg)](https://github.com/WillBooster/shared/tree/main/packages/wbfy)
[![crates.io](https://img.shields.io/crates/v/willbooster-tree-sitter-sql.svg)](https://crates.io/crates/willbooster-tree-sitter-sql)

SQL grammars for [tree-sitter](https://github.com/tree-sitter/tree-sitter), generated with the
[WillBooster/tree-sitter](https://github.com/WillBooster/tree-sitter) generator. Each generated `TSLanguage` carries
the WillBooster ABI (`0x5742000d`), which upstream `tree-sitter` runtimes and WillBooster runtimes prior to 22.0.0
reject. The supported WillBooster runtime is version 23.0.0 or later in the 23.x series.

## Dialects

Each dialect has its own grammar and external scanner in `<dialect>/`, built independently on top of the small DSL
helpers in `common/common.mjs`:

| Dialect                                                                                      | Directory     | Wasm file                     | Rust constants                                 | Cargo feature |
| -------------------------------------------------------------------------------------------- | ------------- | ----------------------------- | ---------------------------------------------- | ------------- |
| [SQLite](https://sqlite.org/lang.html) 3.54                                                  | `sqlite/`     | `tree-sitter-sqlite.wasm`     | `LANGUAGE_SQLITE`, `SQLITE_NODE_TYPES`         | `sqlite`      |
| [PostgreSQL](https://www.postgresql.org/docs/18/sql-syntax.html) 18                          | `postgresql/` | `tree-sitter-postgresql.wasm` | `LANGUAGE_POSTGRESQL`, `POSTGRESQL_NODE_TYPES` | `postgresql`  |
| [MySQL](https://dev.mysql.com/doc/refman/8.4/en/sql-statements.html) 8.4                     | `mysql/`      | `tree-sitter-mysql.wasm`      | `LANGUAGE_MYSQL`, `MYSQL_NODE_TYPES`           | `mysql`       |
| [Oracle Database](https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/) 23ai | `oracle/`     | `tree-sitter-oracle.wasm`     | `LANGUAGE_ORACLE`, `ORACLE_NODE_TYPES`         | `oracle`      |

- `sqlite` follows SQLite's own grammar (`src/parse.y`) and tokenizer (`src/tokenize.c`) in its default build. Input
  that SQLite rejects as a syntax error, an unrecognized token, or incomplete input yields `ERROR` or `MISSING` nodes,
  except for `OVER` as an alias without `AS` before `WINDOW` after a non-call closing parenthesis (such as
  `SELECT (1) OVER WINDOW w AS ()`), a NUL character (which ends input for SQLite's C parser but is an error here), and
  invalid UTF-8/UTF-16. Semantic or parser-action checks beyond `parse.y` are enforced only where they shape a single
  clause.
- `postgresql` covers PostgreSQL 18 SQL statements, expressions, operator precedence, keyword categories, nested block
  comments, dollar-quoted strings (`$$...$$` and `$tag$...$tag$`), C-escape and Unicode-escape strings and identifiers,
  numeric radix and underscore-separated literals, and user-defined operators. Client `psql` meta-commands (`\c`, `\i`)
  are rejected as syntax errors.
- `mysql` covers MySQL 8.4 SQL in its default SQL mode, including DDL, DML, queries, stored programs (`CREATE PROCEDURE`,
  `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE EVENT`), backslash-escaped and charset-prefixed strings, whitespace-bound
  `-- ` and `#` comments, executable versioned comments (`/*! ... */` and `/*!50700 ... */`), `@` user and `@@` system
  variables, and MySQL's 17-level operator precedence (`||` as logical `OR`, `&&` as logical `AND`, `^` as bitwise XOR).
  Client `mysql` directives (`DELIMITER`, `SOURCE`) are rejected as syntax errors.
- `oracle` covers Oracle Database 23ai SQL and embedded PL/SQL units (`CREATE TRIGGER`, `CREATE FUNCTION`,
  `CREATE PROCEDURE`, `CREATE PACKAGE`, `CREATE TYPE`, anonymous `DECLARE`/`BEGIN` blocks, and inline `WITH` functions
  and procedures), hierarchical queries (`START WITH` / `CONNECT BY`), `(+)` outer joins, `PIVOT` / `UNPIVOT`,
  `MATCH_RECOGNIZE`, `MODEL`, multi-table `INSERT ALL`/`FIRST`, `MERGE`, and alternative-quoted literals (`q'[...]'`,
  `nq'<...>'`). Client SQL*Plus directives (`REM`, `SET`, `CONNECT`, `PROMPT`, `SPOOL`, `@`, standalone `/`) are rejected
  as syntax errors.

## Support Scope

This repository maintains only full parsing: valid input yields a correct tree, and invalid input yields `ERROR` or
`MISSING` nodes without crashing, hanging, or taking more than linear time. Incremental parsing is not supported, and no
queries (highlights, locals, injections, tags) are shipped. Node types, field names, and the trees that error recovery
produces may change; such changes are released as new major versions.

## Usage

The npm package ships one `.wasm` file per dialect for
[@willbooster/web-tree-sitter](https://www.npmjs.com/package/@willbooster/web-tree-sitter) version 23.0.0 or later in
the 23.x series, which runs in Node.js, Bun, browsers, and Cloudflare Workers. Replace `tree-sitter-sqlite.wasm` in the
examples below with `tree-sitter-postgresql.wasm`, `tree-sitter-mysql.wasm`, or `tree-sitter-oracle.wasm` for another
dialect.

In Node.js and Bun, load the grammar from its path:

```js
import { fileURLToPath } from 'node:url';

import { Language, Parser } from '@willbooster/web-tree-sitter';

await Parser.init();
const parser = new Parser();
const wasmPath = fileURLToPath(import.meta.resolve('@willbooster/tree-sitter-sql/tree-sitter-sqlite.wasm'));
parser.setLanguage(await Language.load(wasmPath));
const tree = parser.parse('SELECT a FROM t WHERE b = 1;\n');
```

In browsers, serve both `.wasm` files and load them by URL (the example uses Vite's `?url` imports):

```js
import sqliteUrl from '@willbooster/tree-sitter-sql/tree-sitter-sqlite.wasm?url';
import { Language, Parser } from '@willbooster/web-tree-sitter';
import runtimeUrl from '@willbooster/web-tree-sitter/web-tree-sitter.wasm?url';

await Parser.init({ locateFile: () => runtimeUrl });
const parser = new Parser();
parser.setLanguage(await Language.load(sqliteUrl));
```

Cloudflare Workers do not allow compiling Wasm at run time, so import both `.wasm` files as modules, with or without
Node.js compatibility:

```js
import sqlite from '@willbooster/tree-sitter-sql/tree-sitter-sqlite.wasm';
import { Language, Parser } from '@willbooster/web-tree-sitter';
import runtime from '@willbooster/web-tree-sitter/web-tree-sitter.wasm';

await Parser.init({ wasmModule: runtime });
const parser = new Parser();
parser.setLanguage(await Language.load(sqlite));
```

The package also ships each dialect's `grammar.js`, `package.json`, and `src/node-types.json`, together with
`common/common.mjs` and `tree-sitter.json`.

In Rust, depend on [willbooster-tree-sitter-sql](https://crates.io/crates/willbooster-tree-sitter-sql) and on
[willbooster-tree-sitter](https://crates.io/crates/willbooster-tree-sitter) version 23.0.0 or later in the 23.x series:

```sh
cargo add willbooster-tree-sitter@23 --rename tree-sitter
cargo add willbooster-tree-sitter-sql --rename tree-sitter-sql
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_sql::LANGUAGE_POSTGRESQL.into())?;
```

All four dialect features (`sqlite`, `postgresql`, `mysql`, `oracle`) are enabled by default. Disable default features
to compile only selected dialects:

```sh
cargo add willbooster-tree-sitter-sql --no-default-features --features postgresql --rename tree-sitter-sql
```

## Development

```sh
mise install
bun install --frozen-lockfile
bun run test/ci-setup # installs Chromium for the browser test
bun run build/ci
bun run verify
bun run test
cargo test
```

- Run tree-sitter CLI subcommands through `script/tree-sitter` (for example,
  `script/tree-sitter parse --grammar-path postgresql file.sql`), not upstream's `tree-sitter` CLI, whose generator and
  runtime ABI differ from `Cargo.lock`.
- `script/generate [--build-wasm] [dialect...]` regenerates all dialects by default, or only the named dialect
  directories. After changing `<dialect>/grammar.js`, `<dialect>/src/scanner.c`, `common/common.mjs`,
  `tree-sitter.json`, or `test/corpus/<dialect>/`, run `bun run build/ci` and commit `<dialect>/src/`. Do not commit
  `.tmp/`.
- Every corpus case in `test/corpus/<dialect>/*.txt` must include `:language(<dialect>)` in its header, and each dialect
  must keep raw NUL byte cases in `test/corpus/<dialect>/null-characters.txt` for the fuzzer seed check in
  `.github/workflows/robustness.yml`.
- `script/parse-examples [--check] [dialect...]` clones pinned real-world SQL repositories into `examples/` and compares
  the files that fail to parse against `script/known-failures/<dialect>.txt`. Run it without `--check` after a grammar
  change or a moved commit pin alters a list, and confirm every listed file is also rejected by that dialect's SQL
  parser.
- When changing a dialect's grammar, check accepted and rejected statements against the target database parser (such as
  `sqlite3` or `postgres`) so valid SQL parses without errors and syntax errors yield `ERROR` or `MISSING` nodes.
