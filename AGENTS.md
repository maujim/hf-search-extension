# AGENTS.md

Guidance for coding agents working in this repository.

## Project overview

This repo contains the **Rust Search Extension** browser extension and supporting tooling:

- `extension/`: main browser extension code (JS modules, search logic, content scripts, static index files)
- `manage/`: Rust app that renders extension management/settings HTML
- `rust/`: Rust CLI for generating search/index data files
- `macro-railroad/`: Rust + wasm module used by docs rendering features
- `manifest.jsonnet`: source for browser manifests
- `docs/`: website/docs content

## First-time setup

1. Initialize submodules (required):
   ```bash
   git submodule update --init --recursive
   ```
   The `core/` submodule provides shared make/jsonnet helpers.

2. Install required tools:
   - `jsonnet`
   - `esbuild`
   - `web-ext`
   - Rust toolchain (`cargo`, `rustc`)
   - `wasm-pack` (for `macro-railroad` builds)

## Common build commands

From repo root:

- Build extension variants:
  ```bash
  make chrome
  make firefox
  make edge
  ```

- Create distributable packages:
  ```bash
  make pack chrome
  make pack firefox
  make pack edge
  ```

- Rebuild manage pages:
  ```bash
  make manage
  ```
  or in `manage/`:
  ```bash
  cargo run -- -w
  ```

- Rebundle content script helper:
  ```bash
  make bundle
  ```

- Rebuild macro railroad wasm artifacts:
  ```bash
  make macro-railroad
  ```

## Data/index generation

The Rust CLI in `rust/` updates generated index files consumed by `extension/`.

Run from `rust/`:
```bash
cargo run -- <subcommand> [options]
```

Available subcommands include:
- `advisory`
- `crates`
- `books`
- `caniuse`
- `lints`
- `labels`
- `rfcs`
- `rustc`
- `targets`

Use `--help` for each subcommand before running generation tasks.

## Editing conventions

- Keep JS as ESM modules, semicolons, and existing formatting style.
- Keep changes focused; avoid unrelated refactors.
- If you change `manifest.jsonnet`, run:
  ```bash
  jsonnetfmt -i manifest.jsonnet
  ```
- Prefer updating source templates/configs over directly editing generated outputs, unless the repo intentionally tracks the generated file.

## Validation checklist before finishing

Run relevant checks for touched areas:

- JS/extension changes: run corresponding `make <browser>` build
- `manage/` changes: `cargo check` (or `cargo run -- -w`)
- `rust/` changes: `cargo check` in `rust/`
- `macro-railroad/` changes: `cargo check` and/or `make macro-railroad`

Then verify git diff is scoped to intended files only.

## Safety and scope

- Do not commit secrets or tokens.
- Do not alter license files.
- Preserve dual-license headers/structure where present.
- If behavior changes are non-trivial, document impact in PR description or relevant docs.
