import fs from 'node:fs';
import path from 'node:path';

const corpus = path.resolve(import.meta.dirname, '../corpus');

// The CLI exits zero and leaves a case out of its summary when it cannot read the case's header (e.g. one with a blank
// line before its attributes), so the tests compare the summary with the cases test/corpus holds. Each case header
// opens and closes with a line of `=`.
export function corpusCaseCount(): number {
  let delimiters = 0;
  for (const file of fs.readdirSync(corpus)) {
    delimiters += fs.readFileSync(path.join(corpus, file), 'latin1').match(/^={3,}/gm)?.length ?? 0;
  }
  return delimiters / 2;
}
