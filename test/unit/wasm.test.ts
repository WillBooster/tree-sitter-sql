import { expect } from 'vitest';

import { corpusCaseCount } from '../helpers/corpusCaseCount.js';
import { testCommand } from './run.js';

// The package ships a Wasm build, which another compiler builds than the native one. The first run downloads the WASI
// SDK. The CLI exits zero when it reads no corpus case, so its summary must count every case.
testCommand(
  'parses the corpus in test/corpus as expected with the Wasm build',
  ['script/tree-sitter', 'test', '--wasm'],
  900_000,
  { check: (output) => expect(output).toContain(`Total parses: ${corpusCaseCount()};`) }
);
