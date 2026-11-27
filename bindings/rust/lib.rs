//! This crate provides SQL language support for the [tree-sitter] parsing library.
//!
//! Typically, you will use a `LANGUAGE_*` constant such as [`LANGUAGE_SQLITE`] to add a dialect to a tree-sitter
//! [`Parser`], and then use the parser to parse some code:
//!
//! ```
//! # #[cfg(feature = "sqlite")]
//! # {
//! let code = "SELECT a FROM t WHERE b = 1;\n";
//! let mut parser = tree_sitter::Parser::new();
//! let language = tree_sitter_sql::LANGUAGE_SQLITE;
//! parser
//!     .set_language(&language.into())
//!     .expect("Error loading SQLite parser");
//! let tree = parser.parse(code).unwrap();
//! assert!(!tree.root_node().has_error());
//! # }
//! ```
//!
//! The supported [willbooster-tree-sitter] runtime is version 23.0.0 or later within 23.x. The
//! generated `TSLanguage` carries the WillBooster ABI (`0x5742000d`), which upstream `tree-sitter`
//! runtimes and WillBooster runtimes prior to 22.0.0 reject.
//!
//! [`Parser`]: https://docs.rs/willbooster-tree-sitter/23/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/
//! [willbooster-tree-sitter]: https://crates.io/crates/willbooster-tree-sitter

#[cfg(feature = "sqlite")]
use tree_sitter_language::LanguageFn;

#[cfg(feature = "sqlite")]
unsafe extern "C" {
    fn tree_sitter_sqlite() -> *const ();
}

/// The tree-sitter [`LanguageFn`] for the SQL dialect of SQLite.
#[cfg(feature = "sqlite")]
pub const LANGUAGE_SQLITE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sqlite) };

/// The content of the [`node-types.json`] file for the SQL dialect of SQLite.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
#[cfg(feature = "sqlite")]
pub const SQLITE_NODE_TYPES: &str = include_str!("../../sqlite/src/node-types.json");

#[cfg(test)]
mod tests {
    #[cfg(feature = "sqlite")]
    #[test]
    fn test_can_load_sqlite_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SQLITE.into())
            .expect("Error loading SQLite parser");
    }
}
