# @willbooster/tree-sitter-sql

[![npm version](https://img.shields.io/npm/v/@willbooster/tree-sitter-sql.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-sql)
[![license](https://img.shields.io/npm/l/@willbooster/tree-sitter-sql.svg)](https://www.npmjs.com/package/@willbooster/tree-sitter-sql)
[![Test](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test.yml)
[![Test rust](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test-rust.yml/badge.svg)](https://github.com/WillBooster/tree-sitter-sql/actions/workflows/test-rust.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![crates.io](https://img.shields.io/crates/v/willbooster-tree-sitter-sql.svg)](https://crates.io/crates/willbooster-tree-sitter-sql)

SQL grammars for [tree-sitter](https://github.com/tree-sitter/tree-sitter), generated with the
[WillBooster/tree-sitter](https://github.com/WillBooster/tree-sitter) generator. The parsers carry that fork's own ABI
number and load with that fork's runtime, version 17.0.1 or later in the 17.x series.

The `sqlite` grammar parses the SQL dialect of [SQLite](https://sqlite.org/lang.html) 3.54 in its default build. Its
rules follow SQLite's own grammar (`src/parse.y`) and tokenizer (`src/tokenize.c`), which are in the public domain.
Beyond them, it also rejects what SQLite rejects while parsing, such as an unknown join type, an ORDER BY clause before
UNION, or a qualified table name in a trigger outside the temp schema. Its results differ from SQLite's only:

- where SQLite decides by looking up the schema: it accepts a qualified table name in a trigger on a table that turns
  out not to be in the temp schema;
- on a NUL character, which ends the input for SQLite but is an error here;
- on input that is not valid UTF-8 or UTF-16, which SQLite reads byte by byte.

`common/common.mjs` holds the lexical rules that SQL dialects share, for the grammars of other dialects to build on.

## Support Scope

This repository maintains only full parsing: valid input yields a correct tree, and invalid input yields `ERROR` or
`MISSING` nodes without crashing, hanging, or taking more than linear time. No queries (highlights, locals, injections,
tags) are shipped. Node types, field names, and the trees that error recovery produces may change; such changes are
released as new major versions.

## Usage

The npm package ships `tree-sitter-sqlite.wasm` for
[@willbooster/web-tree-sitter](https://www.npmjs.com/package/@willbooster/web-tree-sitter) version 17.0.1 or later in
the 17.x series, which runs in Node.js, Bun, browsers, and Cloudflare Workers. In Node.js and Bun, load the grammar from
its path:

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

The package also ships the grammar definitions (`common/common.mjs` and `sqlite/grammar.js`, with the `package.json`
file that marks the latter as an ES module) and the node types in `sqlite/src/node-types.json`.

In Rust, depend on the [crate](https://crates.io/crates/willbooster-tree-sitter-sql) and on
[willbooster-tree-sitter](https://crates.io/crates/willbooster-tree-sitter), the runtime this package is tested and
fuzzed with:

```sh
cargo add willbooster-tree-sitter@17.0.1 --rename tree-sitter
cargo add willbooster-tree-sitter-sql --rename tree-sitter-sql
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_sql::LANGUAGE_SQLITE.into())?;
```

The crate also exports `SQLITE_NODE_TYPES`.

## Development

```sh
mise install
bun install --frozen-lockfile
bun run test/ci-setup # installs Chromium for the browser test
bun run build/ci
bun run test
script/parse-examples
cargo test
```

The scripts and tests generate, build, test, and parse with `script/tree-sitter`, the tree-sitter CLI of the
WillBooster/tree-sitter runtime version locked in `Cargo.lock`, since the generator and the runtime of upstream's CLI are
not the ones this package ships with. Its first run downloads that CLI from the runtime's GitHub Release, or builds it
with `cargo` (whose build runs the CMake that `mise.toml` pins) when the download fails or the release has no binary
that runs here. Run other CLI commands through it as well (e.g. `script/tree-sitter parse --grammar-path sqlite
file.sql`).

`bun run generate` records a fresh generation profile from the `test/corpus` cases, then generates compact parser
tables. It would also profile files tracked in `examples/`, but this repository tracks none. The parser also embeds
metadata from `tree-sitter.json`. After changing a grammar, the scanner, `tree-sitter.json`, or a corpus case,
regenerate and commit `sqlite/src/`. Profiles in `.tmp/generation-profiles/` are temporary and must not be committed.
`bun run build-wasm`, `bun run build/ci`, and the release build regenerate the parser before compiling it.

`bun run test` runs:

- the corpus in `test/corpus`, with the native build and with the Wasm build (the first run downloads the WASI SDK);
- a check that the real-world files in `examples/` fail to parse exactly as listed in `script/known-failures.txt`. The
  first run clones the repositories. The example repositories are pinned to commits in `script/parse-examples`. After a
  grammar change or a moved pin alters that list, `script/parse-examples` rewrites it; review its diff before
  committing. Each listed file is also rejected by SQLite;
- a performance check (`test/unit/performance.test.ts`) that recovering from an error on each line takes linear time,
  since consumers parse files while they are being edited, and that the scanner reads the input a bounded number of
  times. It loads the Wasm build through @willbooster/web-tree-sitter, which `bun run build/ci` rebuilds after
  regenerating the parser;
- a check (`test/unit/runtimeVersion.test.ts`) that `@willbooster/web-tree-sitter` in `package.json` and
  `willbooster-tree-sitter` in `Cargo.lock` are the same version, since the Wasm tests run on the former and the Rust
  tests, the fuzzer, and the CLI on the latter;
- tests that load the Wasm build with @willbooster/web-tree-sitter in Chromium (`test/e2e/browser.test.ts`) and in
  Cloudflare Workers with and without Node.js compatibility (`test/e2e/workers.test.ts`).

The tests compile the parser into `.tmp/tree-sitter-lib` rather than the CLI's cache shared by every checkout;
`script/parse-examples` builds a parser of its own in `.tmp/` for each run and deletes it afterwards.

CI also runs these tests on Linux arm64 and macOS, where the CLI compiles the parser and the scanner natively, and
fuzzes the parser with libFuzzer and sanitizers (`.github/workflows/robustness.yml`).

When changing the grammar, compare what it accepts with SQLite itself: a valid statement must parse without errors, and
a statement that SQLite rejects with a syntax error must yield `ERROR` or `MISSING` nodes. SQL from SQLite's test suite
(`test/*.test`), and that SQL with tokens deleted, inserted, replaced, or swapped, make good inputs for the comparison.

### References

- [SQL As Understood By SQLite](https://sqlite.org/lang.html)
- [SQLite's grammar (`src/parse.y`)](https://sqlite.org/src/file/src/parse.y) and
  [tokenizer (`src/tokenize.c`)](https://sqlite.org/src/file/src/tokenize.c)
