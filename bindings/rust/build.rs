fn main() {
    let src_dir = std::path::Path::new("sqlite").join("src");
    let mut c_config = cc::Build::new();
    c_config.std("c11").include(&src_dir);

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

    for name in ["parser.c", "scanner.c"] {
        let path = src_dir.join(name);
        c_config.file(&path);
        println!("cargo:rerun-if-changed={}", path.to_str().unwrap());
    }

    // The scanner includes the reserved words that script/generate writes beside it.
    println!(
        "cargo:rerun-if-changed={}",
        src_dir.join("reserved_words.h").to_str().unwrap()
    );

    c_config.compile("tree-sitter-sql");
}
