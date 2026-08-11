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

`/api/search/full-text` is currently working but undocumented and absent from
the canonical OpenAPI document. Monitor it and consider a documented fallback
or contract smoke check if Hugging Face publishes one.

For `@model`, `@dataset`, and `@space`, `Enter`/fallback navigation uses safe
encoded browse search pages:

- model → `https://huggingface.co/models?search=<encodeURIComponent(trimmed query)>`
- dataset → `https://huggingface.co/datasets?search=<encodeURIComponent(trimmed query)>`
- space → `https://huggingface.co/spaces?search=<encodeURIComponent(trimmed query)>`

Other query classes (`@org`, `@user`, `@paper`, and `@collection`) fall back to
generic Hugging Face full-text navigation, not fabricated direct resource paths.

## Fallback rows

For unclassified queries (no `@keyword`), fallback rows are shown in this order:

- Full-text: `https://huggingface.co/search/full-text?q=<encodeURIComponent(trimmed query)>`
- model browse: `https://huggingface.co/models?search=<encodeURIComponent(trimmed query)>`
- dataset browse: `https://huggingface.co/datasets?search=<encodeURIComponent(trimmed query)>`
- space browse: `https://huggingface.co/spaces?search=<encodeURIComponent(trimmed query)>`

## Navigation mapping

Browse-class fallback URLs are safely encoded search pages for `model`,
`dataset`, and `space` (as listed above). Non-browse classes do not construct
direct URLs from query text: they fall back to generic
`https://huggingface.co/search/full-text?q=<encodeURIComponent(trimmed query)>`
navigation. Result rows, when they contain a canonical result identifier, may
open the corresponding Hugging Face page; that is distinct from fabricating a
path from the query.

## Examples

- `llama`
- `@model llama`
- `llama @model`
- `@dataset llama`
- `llama @dataset`
- `llama @dataset -`
- `@org huggingface`
- `@paper attention`
