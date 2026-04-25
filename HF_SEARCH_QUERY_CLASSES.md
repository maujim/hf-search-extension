# Hugging Face Search Query Classes

This file documents the Hugging Face query-class syntax added to the extension.

## Syntax

- Default (no class):
  - `query`
  - Searches across **models + datasets**.

- Query class:
  - `@keyword query`
  - Supported `keyword` values:
    - `model`
    - `dataset`
    - `space`
    - `org`
    - `user`
    - `paper`
    - `collection`
    - `bucket`

## Endpoint mapping

- Default (no `@keyword`):
  - `GET /api/models`
  - `GET /api/datasets`
  - Results are merged round-robin.

- Explicit class:
  - `@model ...` → `GET /api/models`
  - `@dataset ...` → `GET /api/datasets`
  - `@space ...` → `GET /api/quicksearch?type=space`
  - `@org ...` → `GET /api/quicksearch?type=org`
  - `@user ...` → `GET /api/quicksearch?type=user`
  - `@paper ...` → `GET /api/quicksearch?type=paper`
  - `@collection ...` → `GET /api/quicksearch?type=collection`
  - `@bucket ...` → `GET /api/quicksearch?type=bucket`

## Navigation mapping

Result rows are typed and open canonical Hugging Face pages:

- `model` → `https://huggingface.co/<id>`
- `dataset` → `https://huggingface.co/datasets/<id>`
- `space` → `https://huggingface.co/spaces/<id>`
- `org` → `https://huggingface.co/<id>`
- `user` → `https://huggingface.co/<id>`
- `paper` → `https://huggingface.co/papers/<id>`
- `collection` → `https://huggingface.co/collections/<id>`
- `bucket` → `https://huggingface.co/bucket/<id>`

## Examples

- `llama`
- `@model llama`
- `@dataset llama`
- `@org huggingface`
- `@paper attention`
