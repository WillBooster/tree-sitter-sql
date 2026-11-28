import fs from 'node:fs';
import path from 'node:path';

import treeSitterConfig from '../../tree-sitter.json';

const root = path.resolve(import.meta.dirname, '../..');
const corpusDir = path.join(root, 'test/corpus');

// The CLI exits zero and leaves a case out of its summary when it cannot read the case's header (e.g. one with a blank
// line before its attributes), and runs a case without `:language(...)` only on the first grammar in tree-sitter.json,
// while `tree-sitter profile` feeds untagged cases to every grammar. Every case under test/corpus/<dialect>/ must
// therefore carry `:language(<dialect>)`, and the CLI summary must match the total number of `:language` runs.
export function corpusCaseCount(): number {
  const expectedDialects = treeSitterConfig.grammars.map(({ name }) => name).toSorted();
  const actualEntries = fs
    .readdirSync(corpusDir)
    .filter((entry) => !entry.startsWith('.'))
    .toSorted();
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedDialects)) {
    throw new Error(
      `Expected test/corpus subdirectories ${expectedDialects.join(', ')}, found ${actualEntries.join(', ')}`
    );
  }

  let totalRuns = 0;
  for (const dialect of expectedDialects) {
    const dialectDir = path.join(corpusDir, dialect);
    const files = fs
      .readdirSync(dialectDir)
      .filter((entry) => !entry.startsWith('.'))
      .toSorted();
    if (files.length === 0) {
      throw new Error(`test/corpus/${dialect} contains no corpus files`);
    }
    for (const file of files) {
      totalRuns += countFileRuns(path.join(dialectDir, file), dialect);
    }
  }
  return totalRuns;
}

function countFileRuns(filePath: string, expectedDialect: string): number {
  const lines = fs.readFileSync(filePath, 'latin1').split(/\r?\n/);
  const relativePath = path.relative(root, filePath);
  let firstSuffix: string | undefined;
  for (const line of lines) {
    const match = /^={3,}(.*)$/.exec(line);
    if (match) {
      firstSuffix = match[1];
      break;
    }
  }
  if (firstSuffix === undefined) {
    throw new Error(`${relativePath}: contains no corpus case headers`);
  }

  let runs = 0;
  let index = 0;
  while (index < lines.length) {
    const openMatch = /^={3,}(.*)$/.exec(lines[index] ?? '');
    if (!openMatch || openMatch[1] !== firstSuffix) {
      index++;
      continue;
    }
    let closeIndex = index + 1;
    while (closeIndex < lines.length) {
      const closeMatch = /^={3,}(.*)$/.exec(lines[closeIndex] ?? '');
      if (closeMatch && closeMatch[1] === firstSuffix) break;
      closeIndex++;
    }
    if (closeIndex >= lines.length) {
      throw new Error(`${relativePath}:${index + 1}: unclosed corpus header`);
    }
    const headerLines = lines.slice(index + 1, closeIndex);
    const caseName = headerLines[0]?.trim() || '<unnamed>';
    const languages = headerLines
      .map((line) => /^:language\(([^)]+)\)$/.exec(line.trim())?.[1])
      .filter((lang): lang is string => Boolean(lang));
    if (languages.length !== 1 || languages[0] !== expectedDialect) {
      throw new Error(
        `${relativePath}:${index + 1} (${caseName}): expected :language(${expectedDialect}), found ${languages.join(', ') || 'none'}`
      );
    }
    runs += languages.length;
    index = closeIndex + 1;
  }
  return runs;
}
