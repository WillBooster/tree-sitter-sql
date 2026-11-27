//! This crate provides SQL language support for the [tree-sitter] parsing library: the SQL dialects of SQLite,
//! PostgreSQL, MySQL, and Oracle Database.
//!
//! Typically, you will use one of the `LANGUAGE_*` constants (such as [`LANGUAGE_SQLITE`], [`LANGUAGE_POSTGRESQL`],
//! [`LANGUAGE_MYSQL`], or [`LANGUAGE_ORACLE`]) to add a dialect to a tree-sitter [`Parser`], and then use the parser to
//! parse some code:
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
//! All four dialect features (`sqlite`, `postgresql`, `mysql`, `oracle`) are enabled by default. Disable default
//! features to compile only the dialects you need.
//!
//! The supported [willbooster-tree-sitter] runtime is version 23.0.0 or later within 23.x. The
//! generated `TSLanguage` carries the WillBooster ABI (`0x5742000d`), which upstream `tree-sitter`
//! runtimes and WillBooster runtimes prior to 22.0.0 reject.
//!
//! [`Parser`]: https://docs.rs/willbooster-tree-sitter/23/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/
//! [willbooster-tree-sitter]: https://crates.io/crates/willbooster-tree-sitter

#[cfg(any(
    feature = "mysql",
    feature = "oracle",
    feature = "postgresql",
    feature = "sqlite"
))]
use tree_sitter_language::LanguageFn;

#[cfg(feature = "mysql")]
unsafe extern "C" {
    fn tree_sitter_mysql() -> *const ();
}

#[cfg(feature = "oracle")]
unsafe extern "C" {
    fn tree_sitter_oracle() -> *const ();
}

#[cfg(feature = "postgresql")]
unsafe extern "C" {
    fn tree_sitter_postgresql() -> *const ();
}

#[cfg(feature = "sqlite")]
unsafe extern "C" {
    fn tree_sitter_sqlite() -> *const ();
}

/// The tree-sitter [`LanguageFn`] for the SQL dialect of MySQL.
#[cfg(feature = "mysql")]
pub const LANGUAGE_MYSQL: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_mysql) };

/// The content of the [`node-types.json`] file for the SQL dialect of MySQL.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
#[cfg(feature = "mysql")]
pub const MYSQL_NODE_TYPES: &str = include_str!("../../mysql/src/node-types.json");

/// The tree-sitter [`LanguageFn`] for the SQL dialect of Oracle Database.
#[cfg(feature = "oracle")]
pub const LANGUAGE_ORACLE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_oracle) };

/// The content of the [`node-types.json`] file for the SQL dialect of Oracle Database.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
#[cfg(feature = "oracle")]
pub const ORACLE_NODE_TYPES: &str = include_str!("../../oracle/src/node-types.json");

/// The tree-sitter [`LanguageFn`] for the SQL dialect of PostgreSQL.
#[cfg(feature = "postgresql")]
pub const LANGUAGE_POSTGRESQL: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_postgresql) };

/// The content of the [`node-types.json`] file for the SQL dialect of PostgreSQL.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types
#[cfg(feature = "postgresql")]
pub const POSTGRESQL_NODE_TYPES: &str = include_str!("../../postgresql/src/node-types.json");

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
    #[cfg(feature = "mysql")]
    #[test]
    fn test_can_load_mysql_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_MYSQL.into())
            .expect("Error loading MySQL parser");
    }

    #[cfg(feature = "oracle")]
    #[test]
    fn test_can_load_oracle_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_ORACLE.into())
            .expect("Error loading Oracle parser");
    }

    #[cfg(feature = "postgresql")]
    #[test]
    fn test_can_load_postgresql_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_POSTGRESQL.into())
            .expect("Error loading PostgreSQL parser");
    }

    #[cfg(feature = "sqlite")]
    #[test]
    fn test_can_load_sqlite_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&super::LANGUAGE_SQLITE.into())
            .expect("Error loading SQLite parser");
    }
}
