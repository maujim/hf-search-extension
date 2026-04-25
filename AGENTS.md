# AGENTS.md

Guidance for coding agents working in this repository.

## Project status (important)

This repository is now **HF-only** (Hugging Face Search Extension).

- Prioritize Hugging Face omnibox search behavior and API integration.
- Treat legacy Rust-search concepts as removed unless explicitly reintroduced.
- Preserve the lightweight extension architecture (omnibox core + HF search module).

## Active project layout

- `extension/`: browser extension runtime
  - `extension/search/huggingface.js`: HF API search implementation
  - `extension/main.js`: runtime wiring
  - `extension/lib.js`: omnibox behavior/pattern layer
  - `extension/service-worker.js`: extension bootstrap
  - `extension/core/*`: shared omnibox framework
- `manifest.jsonnet`: manifest source
- `Makefile`: extension build/pack entry points
- `HF_SEARCH_QUERY_CLASSES.md`: query-class behavior reference
- `core/` (submodule): shared manifest/build helpers

Removed from active scope:
- Rust index generation pipeline
- manage UI generator
- macro-railroad features
- Rust docs/content-script integrations

## First-time setup

1. Initialize submodules:
   ```bash
   git submodule update --init --recursive
   ```
2. Install required tools:
   - `jsonnet`
   - `esbuild`
   - `web-ext`

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

## External API docs reference

- Hugging Face API OpenAPI spec: `https://huggingface.co/.well-known/openapi.json`
- Use this as the canonical API entrypoint before implementing or changing endpoints.

## Hugging Face query classes (extension)

Supported query-class syntax in omnibox:
- `@model`, `@dataset`, `@space`, `@org`, `@user`, `@paper`, `@collection`, `@bucket`

Query format:
- `@keyword search terms` or `search terms @keyword`
- Examples: `@dataset llama`, `llama @dataset`

Behavior:
- No `@keyword` => default mixed HF search (`model` + `dataset`)

Endpoint mapping strategy:
- `@model` → `GET /api/models`
- `@dataset` → `GET /api/datasets`
- others (`@space/@org/@user/@paper/@collection/@bucket`) → `GET /api/quicksearch` with `type=<keyword>`

## Editing conventions

- Keep JS as ESM modules, semicolons, and existing formatting style.
- Keep changes focused; avoid unrelated refactors.
- If you change `manifest.jsonnet`, run:
  ```bash
  jsonnetfmt -i manifest.jsonnet
  ```
- Prefer updating source files/config over generated outputs.

## Validation checklist before finishing

Run relevant checks for touched areas:

- Extension/runtime changes: run at least one build (`make chrome`), ideally browser targets you touched.
- Manifest/build changes: run `make chrome` and confirm `extension/manifest.json` updates correctly.
- Verify git diff is scoped to intended files only.

## Safety and scope

- Do not commit secrets or tokens.
- Do not alter license files.
- Preserve dual-license headers/structure where present.
- If behavior changes are non-trivial, summarize impact in PR description/docs.
