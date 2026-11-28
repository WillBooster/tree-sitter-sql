import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { describe, expect, test } from 'vitest';

import { generationInputMtime } from '../helpers/generationInputs.js';

const Root = path.join(import.meta.dirname, '../..');

type ReadVolumeCase = [name: string, buildSource: (lines: number) => string, forbiddenNodeType?: string];
type CpuTimeCase = [name: string, buildSource: (count: number) => string, smallCount: number, largeCount: number];

interface DialectChecks {
  errorLine: string;
  readVolumeCases: ReadVolumeCase[];
  cpuTimeCases?: CpuTimeCase[];
}

const DialectSuites: Record<string, DialectChecks> = {
  mysql: {
    errorLine: 'SELECT a FROM WHERE b;\n',
    readVolumeCases: [
      [
        'unclosed backslash-escaped string',
        (lines) => `SELECT 'a\n${"SELECT \\'b;\n".repeat(lines)}`,
        'string_literal',
      ],
      ['unclosed versioned comment', (lines) => 'SELECT /*!50700 (a\n'.repeat(lines), 'comment'],
    ],
    cpuTimeCases: [
      [
        'unfinished CREATE TABLE with block comments',
        (count) => `CREATE TABLE t (${'a /*x*/\n'.repeat(count)}`,
        500,
        5000,
      ],
    ],
  },
  oracle: {
    errorLine: 'SELECT a FROM WHERE b;\n',
    readVolumeCases: [
      ['unclosed alternative-quoted literal', (lines) => "SELECT q'[hello\n".repeat(lines), 'string_literal'],
      ['unclosed block comment', (lines) => 'SELECT /* hello\n'.repeat(lines), 'comment'],
    ],
    cpuTimeCases: [
      ['unfinished CREATE TABLE with line comments', (count) => `CREATE TABLE t (${'a--x\n'.repeat(count)}`, 500, 5000],
    ],
  },
  postgresql: {
    errorLine: 'SELECT a FROM WHERE b;\n',
    readVolumeCases: [
      ['unclosed nested block comment', (lines) => 'SELECT /* /* a\n'.repeat(lines), 'comment'],
      ['plus-minus operator run', (lines) => `SELECT ${'+-'.repeat(lines)}`, 'custom_operator'],
      [
        'unclosed dollar-quoted string',
        (lines) => Array.from({ length: lines }, (_, index) => `SELECT $tag${index}$ a\n`).join(''),
        'string_literal',
      ],
    ],
    cpuTimeCases: [
      [
        'unfinished CASE with custom operators',
        (count) => `SELECT CASE ${"'x' ! FETCH REFERENCES ! ".repeat(count)}`,
        200,
        2000,
      ],
      ['repeated prefix NOT before reserved keyword', (count) => `SELECT ${'NOT LATERAL '.repeat(count)}`, 500, 5000],
      ['unfinished CREATE VIEW with line comments', (count) => `CREATE VIEW v (${'a--x\n'.repeat(count)}`, 500, 5000],
    ],
  },
  sqlite: {
    errorLine: 'SELECT a FROM WHERE b;\n',
    // The scanner reads the tokens of a module argument; an unbalanced parenthesis or quote in one statement must not
    // make it read the rest of the input again for each later statement.
    readVolumeCases: [
      ['parenthesis in module argument', (lines) => 'CREATE VIRTUAL TABLE t USING m((a\n'.repeat(lines)],
      [
        'quote in module argument',
        (lines) => `CREATE VIRTUAL TABLE t USING m(a, 'b\n${'CREATE VIRTUAL TABLE u USING m(a, [b\n'.repeat(lines)}`,
        'string_literal',
      ],
    ],
  },
};

await Parser.init();

for (const [grammar, { errorLine, readVolumeCases, cpuTimeCases = [] }] of Object.entries(DialectSuites)) {
  // The Wasm build is the one the package ships.
  const wasmPath = path.join(Root, `tree-sitter-${grammar}.wasm`);
  const parser = new Parser();
  parser.setLanguage(await Language.load(wasmPath));

  describe(grammar, () => {
    // The tests load the existing Wasm build, so a stale one would hide an edit that makes error recovery slower than
    // linear. `tree-sitter build --wasm` compiles src/ without regenerating it, so each step is checked on its own.
    test('uses a Wasm build built from the current parser', () => {
      const mtime = (file: string): number => fs.statSync(path.join(Root, file)).mtimeMs;
      const headerGenerator = path.join(Root, grammar, 'generate-headers');
      expect(
        Math.max(
          generationInputMtime(Root, grammar),
          mtime('common/common.mjs'),
          mtime(`${grammar}/grammar.js`),
          fs.existsSync(headerGenerator) ? fs.statSync(headerGenerator).mtimeMs : 0
        ) > mtime(`${grammar}/src/parser.c`),
        `generation inputs changed after ${grammar}/src/parser.c was generated; run \`bun run build/ci\``
      ).toBe(false);
      const cSources = fs
        .readdirSync(path.join(Root, grammar, 'src'), { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.c') || file.endsWith('.h'))
        .map((file) => mtime(`${grammar}/src/${file}`));
      expect(
        Math.max(...cSources) > fs.statSync(wasmPath).mtimeMs,
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
      expectLinearCpuTime(parser, errorLine.repeat(2000), errorLine.repeat(20_000));
    });

    if (cpuTimeCases.length > 0) {
      test.each(cpuTimeCases)(
        'recovers from %s in linear time',
        { timeout: 60_000 },
        (_, buildSource, smallCount, largeCount) => {
          expectLinearCpuTime(parser, buildSource(smallCount), buildSource(largeCount));
        }
      );
    }

    test.each(readVolumeCases)('reads repeated %s in linear input volume', (_, buildSource, forbiddenNodeType) => {
      const small = countReads(parser, buildSource(200), forbiddenNodeType);
      const large = countReads(parser, buildSource(2000), forbiddenNodeType);
      expect(small).toBeGreaterThan(0);
      expect(large / small).toBeLessThan(18);
    });
  });
}

function expectLinearCpuTime(parser: Parser, small: string, large: string): void {
  parseCpuTime(parser, large);
  parseCpuTime(parser, large);
  let smallFastest = Infinity;
  let largeFastest = Infinity;
  for (let run = 0; run < 5; run++) {
    smallFastest = Math.min(smallFastest, parseCpuTime(parser, small));
    largeFastest = Math.min(largeFastest, parseCpuTime(parser, large));
  }
  expect(largeFastest / smallFastest).toBeLessThan(18);
}

function countReads(parser: Parser, source: string, forbiddenNodeType?: string): number {
  let reads = 0;
  const tree = parser.parse((index) => {
    reads++;
    return source.slice(index, index + 64);
  });
  if (!tree) throw new Error('The parser returned no tree');
  try {
    expect(tree.rootNode.hasError).toBe(true);
    if (forbiddenNodeType) {
      expect(tree.rootNode.descendantsOfType(forbiddenNodeType)).toHaveLength(0);
    }
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
