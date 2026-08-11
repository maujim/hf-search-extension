// Repo-type registry. One source of truth for everything that varies
// by Hugging Face repo type: API endpoint, quicksearch key, URL template,
// human-readable label, and which fields hold the ID in API responses.

const REPO_TYPES = Object.freeze({
    model: {
        apiEndpoint: "models",
        quicksearchKey: null,
        label: "Model",
        idFields: ["id"],
        urlPath: "",
    },
    dataset: {
        apiEndpoint: "datasets",
        quicksearchKey: null,
        label: "Dataset",
        idFields: ["id"],
        urlPath: "datasets",
    },
    space: {
        apiEndpoint: null,
        quicksearchKey: "spaces",
        label: "Space",
        idFields: ["id", "name", "slug"],
        urlPath: "spaces",
    },
    org: {
        apiEndpoint: null,
        quicksearchKey: "orgs",
        label: "Org",
        idFields: ["name", "id"],
        urlPath: "",
    },
    user: {
        apiEndpoint: null,
        quicksearchKey: "users",
        label: "User",
        idFields: ["user", "name", "id"],
        urlPath: "",
    },
    paper: {
        apiEndpoint: null,
        quicksearchKey: "papers",
        label: "Paper",
        idFields: ["_id", "id"],
        urlPath: "papers",
    },
    collection: {
        apiEndpoint: null,
        quicksearchKey: "collections",
        label: "Collection",
        idFields: ["_id", "id", "slug"],
        urlPath: "collections",
    },
    bucket: {
        apiEndpoint: null,
        quicksearchKey: "buckets",
        label: "Bucket",
        idFields: ["id", "name", "slug", "_id"],
        urlPath: "bucket",
    },
});

// The canonical list of query-class names.
export const QUERY_CLASSES = Object.freeze(Object.keys(REPO_TYPES));

// Look up a repo type's metadata. Returns null for unknown types.
export function getRepoType(name) {
    if (!name) return null;
    return REPO_TYPES[name.toLowerCase()] || null;
}

// Full-text search currently supports these type filters in Hugging Face's API.
const FULL_TEXT_SEARCH_TYPES = Object.freeze(new Set(["model", "dataset", "space"]));

// Build a Hugging Face full-text search URL for a raw query.
// Returns null when the query is empty.
export function buildFullTextSearchUrl(query, repoType = null) {
    let raw = (query || "").trim();
    if (!raw) return null;

    let normalizedType = (repoType || "").toLowerCase();
    if (normalizedType && !supportsFullTextSearch(normalizedType)) {
        return null;
    }

    let url = `https://huggingface.co/search/full-text?q=${encodeURIComponent(raw)}`;
    if (normalizedType) {
        url += `&type=${encodeURIComponent(normalizedType)}`;
    }
    return url;
}
// Build a Hugging Face browse-style search URL for models/datasets/spaces.
// Returns null when the query is empty or repo type unsupported.
export function buildBrowseSearchUrl(query, repoType) {
    let raw = (query || "").trim();
    if (!raw) return null;

    let normalizedType = (repoType || "").toLowerCase();
    if (!FULL_TEXT_SEARCH_TYPES.has(normalizedType)) {
        return null;
    }

    let info = getRepoType(normalizedType);
    if (!info) return null;

    let path = info.apiEndpoint || info.urlPath;
    if (!path) return null;

    return `https://huggingface.co/${path}?search=${encodeURIComponent(raw)}`;
}

// Whether Hugging Face full-text search supports a type filter for this repo type.
export function supportsFullTextSearch(repoType) {
    return FULL_TEXT_SEARCH_TYPES.has((repoType || "").toLowerCase());
}

// Build a Hugging Face URL for a repo ID and type.
// Returns null when the ID is empty or invalid.
export function buildRepoUrl(repoId, repoType) {
    let raw = (repoId || "").trim();
    if (!raw) return null;

    let info = getRepoType(repoType);
    if (!info) return null;

    let encoded = raw
        .split("/")
        .filter(Boolean)
        .map(part => encodeURIComponent(part))
        .join("/");

    if (!encoded) return null;

    let base = "https://huggingface.co";
    return info.urlPath ? `${base}/${info.urlPath}/${encoded}` : `${base}/${encoded}`;
}

// Get the human-readable label for a repo type (e.g. "model" → "Model").
export function repoTypeLabel(repoType) {
    let info = getRepoType(repoType);
    return info ? info.label : "Model";
}

// Extract the best ID from a quicksearch response item.
// Tries each idFields candidate in order; returns the first non-empty string.
export function extractQuicksearchId(item, repoType) {
    let info = getRepoType(repoType);
    if (!info) return null;

    for (let field of info.idFields) {
        let val = item[field];
        if (val && typeof val === "string" && val.trim()) {
            return val.trim();
        }
    }
    return null;
}

// Which API endpoint to use for a fetch-by-type request.
// Returns null for types that should use quicksearch instead.
export function apiEndpoint(repoType) {
    let info = getRepoType(repoType);
    return info ? info.apiEndpoint : null;
}

// Which quicksearch response key to read for a given repo type.
// Returns null for types that use the direct endpoint instead.
export function quicksearchKey(repoType) {
    let info = getRepoType(repoType);
    return info ? info.quicksearchKey : null;
}
