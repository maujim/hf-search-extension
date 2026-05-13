# Hugging Face Search Query Classes

This file documents the Hugging Face query-class syntax added to the extension.

## Syntax

- Default (no class):
  - `query`
  - Searches across **models + datasets**.

- Query class (prefix or suffix):
  - `@keyword query`
  - `query @keyword`
  - Supported `keyword` values:
    - `model`
    - `dataset`
    - `space`
    - `org`
    - `user`
    - `paper`
    - `collection`
    - `bucket`

- Pagination token precedence:
  - The trailing pagination token (`-`, `--`, etc.) is parsed first by omnibox pagination.
  - Query-class parsing then runs on the remaining text.
  - Example: `llama @dataset -` paginates within **dataset** search.

## Endpoint mapping

- Default (no `@keyword`):
  - `GET /api/search/full-text?type=model`
  - `GET /api/search/full-text?type=dataset`
  - Results are merged round-robin.

- Explicit class:
  - `@model ...` or `... @model` → `GET /api/search/full-text?type=model`
  - `@dataset ...` or `... @dataset` → `GET /api/search/full-text?type=dataset`
  - `@space ...` or `... @space` → `GET /api/search/full-text?type=space`
  - `@org ...` or `... @org` → `GET /api/quicksearch?type=org`
  - `@user ...` or `... @user` → `GET /api/quicksearch?type=user`
  - `@paper ...` or `... @paper` → `GET /api/quicksearch?type=paper`
  - `@collection ...` or `... @collection` → `GET /api/quicksearch?type=collection`
  - `@bucket ...` or `... @bucket` → `GET /api/quicksearch?type=bucket`

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
- `llama @model`
- `@dataset llama`
- `llama @dataset`
- `llama @dataset -`
- `@org huggingface`
- `@paper attention`
