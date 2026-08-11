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
- `esbuild`
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

## API reference

Canonical API docs:
- https://huggingface.co/.well-known/openapi.json

## Query classes reference

See:
- `HF_SEARCH_QUERY_CLASSES.md`

## License

Dual licensed under:
- MIT (`LICENSE-MIT`)
- Apache-2.0 (`LICENSE-APACHE`)
