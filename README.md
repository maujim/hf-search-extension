# HF Search Extension

A lightweight browser extension that lets you search Hugging Face directly from the address bar.

## Features

- Omnibox search against Hugging Face
- Query-class support:
  - `@model`, `@dataset`, `@space`, `@org`, `@user`, `@paper`, `@collection`
- Query format:
  - `@dataset llama`
  - `llama @dataset`
- Default search (no class) mixes model + dataset results

## Development

### Prerequisites

- `jsonnet`
- `web-ext`

### Setup

```bash
git submodule update --init --recursive
```

### Build

```bash
make chrome
make firefox
make edge
```

### Package

```bash
make pack chrome
make pack firefox
make pack edge
```


## HF API endpoint notes

The canonical API reference is:

- https://huggingface.co/.well-known/openapi.json

The extension currently uses `/api/search/full-text` for model, dataset, and
space queries. This endpoint works today but is undocumented and absent from
the canonical OpenAPI specification. Org, user, paper, and collection queries
use `/api/quicksearch`.

**Future feature consideration:** monitor `/api/search/full-text` and evaluate
a documented fallback or contract smoke check if Hugging Face publishes one.

## Prioritized HF regression test plan

This is an actionable backlog; these tests are not yet implemented.

- **P0:** Parse pure-dash pagination tokens separately from dash-prefixed query
  text.
- **P0:** Verify prefix and suffix parsing for all seven classes (`model`,
  `dataset`, `space`, `org`, `user`, `paper`, `collection`), including removal
  of the class token from the search text.
- **P0:** Verify pagination context is preserved and deep pagination expansion
  reaches the requested page.
- **P0:** Open the selected result URL, and use safely encoded typed/generic
  fallback URLs when no result is selected.
- **P0:** Cache full, partial, and failed expansions distinctly.
- **P1:** Verify debounce cancellation, in-flight request deduplication, TTL,
  eviction, and API response envelopes.
- **P2:** Verify per-browser permissions, startup wiring, navigation
  disposition, URL escaping, and core freshness (generated core reflects
  current `core/src`).

## Query classes reference

See:

- `HF_SEARCH_QUERY_CLASSES.md`

## License

Dual licensed under:

- MIT (`LICENSE-MIT`)
- Apache-2.0 (`LICENSE-APACHE`)

