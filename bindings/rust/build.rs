fn main() {
    let mut dialects = Vec::new();
    for (feature, dir) in [
        ("CARGO_FEATURE_MYSQL", "mysql"),
        ("CARGO_FEATURE_ORACLE", "oracle"),
        ("CARGO_FEATURE_POSTGRESQL", "postgresql"),
        ("CARGO_FEATURE_SQLITE", "sqlite"),
    ] {
        if std::env::var_os(feature).is_some() {
            dialects.push(dir);
        }
    }
    if dialects.is_empty() {
        return;
    }

    let mut c_config = cc::Build::new();
    c_config
        .std("c11")
        .include(std::path::Path::new(dialects[0]).join("src"));

    #[cfg(target_env = "msvc")]
    c_config.flag("-utf-8");

    if std::env::var("TARGET").unwrap() == "wasm32-unknown-unknown" {
        let Ok(wasm_headers) = std::env::var("DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS") else {
            panic!(
                "Environment variable DEP_TREE_SITTER_LANGUAGE_WASM_HEADERS must be set by the language crate"
            );
        };

        c_config.include(&wasm_headers);
    }

    for dialect in dialects {
        let src_dir = std::path::Path::new(dialect).join("src");
        for entry in std::fs::read_dir(&src_dir).unwrap() {
            let path = entry.unwrap().path();
            match path.extension().and_then(|ext| ext.to_str()) {
                Some("c") => {
                    c_config.file(&path);
                    println!("cargo:rerun-if-changed={}", path.to_str().unwrap());
                }
                Some("h") => {
                    println!("cargo:rerun-if-changed={}", path.to_str().unwrap());
                }
                _ => {}
            }
        }
    }

    c_config.compile("tree-sitter-sql");
}
