import { expect } from 'vitest';

import { corpusCaseCount } from '../helpers/corpusCaseCount.js';
import { testCommand } from './run.js';

// The CLI exits zero when it reads no corpus case, so its summary must count every case.
testCommand('parses the corpus in test/corpus as expected', ['script/tree-sitter', 'test'], 300_000, {
  check: (output) => expect(output).toContain(`Total parses: ${corpusCaseCount()};`),
});
