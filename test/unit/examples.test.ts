import { testCommand } from './run.js';

// Clones real-world SQL files into examples/ on the first run, which takes a few minutes.
testCommand(
  'fails to parse real-world SQL files only as listed in script/known-failures/',
  ['script/parse-examples', '--check'],
  1_800_000
);
