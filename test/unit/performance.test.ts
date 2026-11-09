import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { describe, expect, test } from 'vitest';

import { generationInputMtime } from '../helpers/generationInputs.js';

const Root = path.join(import.meta.dirname, '../..');
const ErrorSources = {
  sqlite: (lines: number): string => 'SELECT a FROM WHERE b;\n'.repeat(lines),
};
await Parser.init();

for (const [grammar, errorSource] of Object.entries(ErrorSources)) {
  // The Wasm build is the one the package ships.
  const wasmPath = path.join(Root, `tree-sitter-${grammar}.wasm`);
  const parser = new Parser();
  parser.setLanguage(await Language.load(wasmPath));

  describe(grammar, () => {
    // The tests load the existing Wasm build, so a stale one would hide an edit that makes error recovery slower than
    // linear. `tree-sitter build --wasm` compiles src/ without regenerating it, so each step is checked on its own.
    test('uses a Wasm build built from the current parser', () => {
      const mtime = (file: string): number => fs.statSync(path.join(Root, file)).mtimeMs;
      expect(
        Math.max(generationInputMtime(Root), mtime('common/common.mjs'), mtime(`${grammar}/grammar.js`)) >
          mtime(`${grammar}/src/parser.c`),
        `generation inputs changed after ${grammar}/src/parser.c was generated; run \`bun run build/ci\``
      ).toBe(false);
      expect(
        Math.max(
          ...['parser.c', 'scanner.c', 'reserved_words.h', 'tree_sitter/parser.h'].map((file) =>
            mtime(`${grammar}/src/${file}`)
          )
        ) > fs.statSync(wasmPath).mtimeMs,
        `${grammar}/src/ changed after the Wasm build was built; run \`bun run build/ci\``
      ).toBe(false);
    });

    // Consumers parse files being edited, so recovering from many errors must stay linear: ten times the lines take
    // about ten times as long, against a hundred times for quadratic recovery. The ratio catches a cost that grows
    // faster than the input even on a slow CI runner. The parses are timed in the CPU time of the thread that runs them:
    // wall-clock time is inflated unevenly by the test files running alongside, and the process's CPU time also counts
    // the engine's background threads, which compile the Wasm build and collect garbage during the parses. 2,000 and
    // 20,000 lines are measured after warm-up parses and in alternation, each keeping its fastest run; their ratio is
    // about 10 locally, and 18 leaves a margin over that while failing for growth faster than about n^1.25.
    test('recovers from an error on each line in linear time', { timeout: 60_000 }, () => {
      const small = errorSource(2000);
      const large = errorSource(20_000);
      parseCpuTime(parser, large);
      parseCpuTime(parser, large);
      let smallFastest = Infinity;
      let largeFastest = Infinity;
      for (let run = 0; run < 5; run++) {
        smallFastest = Math.min(smallFastest, parseCpuTime(parser, small));
        largeFastest = Math.min(largeFastest, parseCpuTime(parser, large));
      }
      expect(largeFastest / smallFastest).toBeLessThan(18);
    });

    // The scanner reads the tokens of a module argument; an unbalanced parenthesis or quote in one statement must not
    // make it read the rest of the input again for each later statement.
    test.each([
      ['parenthesis', 'CREATE VIRTUAL TABLE t USING m((a\n'],
      ['quote', "CREATE VIRTUAL TABLE t USING m(a, 'b\n"],
    ])('reads repeated module arguments with an unbalanced %s in linear input volume', (_, line) => {
      const small = countReads(parser, line.repeat(200));
      const large = countReads(parser, line.repeat(2000));
      expect(small).toBeGreaterThan(0);
      expect(large / small).toBeLessThan(18);
    });
  });
}

function countReads(parser: Parser, source: string): number {
  let reads = 0;
  const tree = parser.parse((index) => {
    reads++;
    return source.slice(index, index + 64);
  });
  if (!tree) throw new Error('The parser returned no tree');
  try {
    expect(tree.rootNode.hasError).toBe(true);
  } finally {
    tree.delete();
  }
  return reads;
}

function parseCpuTime(parser: Parser, source: string): number {
  const start = process.threadCpuUsage();
  const tree = parser.parse(source);
  const { system, user } = process.threadCpuUsage(start);
  if (!tree) throw new Error('The parser returned no tree');
  const { hasError } = tree.rootNode;
  tree.delete();
  expect(hasError).toBe(true);
  return system + user;
}
