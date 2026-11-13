//! This crate provides SQL language support for the [tree-sitter] parsing library: the SQL dialect of SQLite.
//!
//! Typically, you will use the [`LANGUAGE_SQLITE`] constant to add the language to a tree-sitter [`Parser`], and then
//! use the parser to parse some code:
//!
//! ```
//! let code = "SELECT a FROM t WHERE b = 1;\n";
//! let mut parser = tree_sitter::Parser::new();
//! let language = tree_sitter_sql::LANGUAGE_SQLITE;
//! parser
//!     .set_language(&language.into())
//!     .expect("Error loading SQLite parser");
//! let tree = parser.parse(code).unwrap();
//! assert!(!tree.root_node().has_error());
//! ```
//!
//! The supported [willbooster-tree-sitter] runtime is version 20.0.0 or later within 20.x. The
//! generated `TSLanguage` carries the WillBooster ABI (`0x5742000c`), which upstream `tree-sitter`
//! runtimes reject, and omits `alias_map` and `primary_state_bitmap` tables that WillBooster
//! runtimes before 19.0.0 dereference despite sharing ABI `0x5742000c`.
//!
//! [`Parser`]: https://docs.rs/willbooster-tree-sitter/20.0.0/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/
//! [willbooster-tree-sitter]: https://crates.io/crates/willbooster-tree-sitter

use tree_sitter_language::LanguageFn;

unsafe extern "C" {
    fn tree_sitter_sqlite() -> *const ();
}

/// The tree-sitter [`LanguageFn`] for the SQL dialect of SQLite.
pub const LANGUAGE_SQLITE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sqlite) };

/// The content of the [`node-types.json`] file for the SQL dialect of SQLite.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
pub const SQLITE_NODE_TYPES: &str = include_str!("../../sqlite/src/node-types.json");

#[cfg(test)]
mod tests {
    #[test]
    fn test_can_load_sqlite_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SQLITE.into())
            .expect("Error loading SQLite parser");
    }
}
