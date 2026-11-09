## Maintenance Scope

This repository maintains only full parsing:

- A full parse of valid input yields a correct tree.
- Invalid input yields `ERROR` or `MISSING` nodes, and parsing never crashes or hangs and takes time linear in the input size.

The shape of the tree (node types, field names, and the trees that error recovery produces) may change whenever that serves the properties above; adapting to such changes is the responsibility of each user of this package, so do not weigh effects on any user, but mark a commit that changes the shape as breaking (`!`) so it is released as a new major version. This repository ships no queries (highlights, locals, injections, tags); do not add them. Do not implement, fix, or test incremental parsing (edits, reuse of an old tree, or agreement between incremental and fresh parses), and delete an existing test of it instead of fixing it. Do not list incremental parsing, queries, or tree-shape stability as requirements in issues or PRs.
