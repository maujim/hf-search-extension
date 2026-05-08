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
