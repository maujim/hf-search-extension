// Query-class parser. Strips pagination tokens, then extracts
// the HF query class (@keyword) and the remaining search text.
//
// Example inputs and outputs:
//   "llama @dataset -"  → { query: "llama", queryClass: "dataset", cacheKey: "llama @dataset -" }
//   "@model llama"      → { query: "llama", queryClass: "model", cacheKey: "@model llama" }
//   "llama"             → { query: "llama", queryClass: null, cacheKey: "llama" }

import { QUERY_CLASSES } from "./repo-types.js";

const CLASS_NAMES = QUERY_CLASSES.join("|");
const PREFIX_REGEX = new RegExp(`^@(${CLASS_NAMES})\\s+(.*)$`, "i");
const SUFFIX_REGEX = new RegExp(`^(.*?)\\s+@(${CLASS_NAMES})$`, "i");

/**
 * Parse a raw omnibox input string.
 *
 * Returns { query, queryClass, cacheKey }.
 * - query: search text with pagination token and @keyword stripped
 * - queryClass: one of QUERY_CLASSES, or null for default search
 * - cacheKey: the full raw input (after pagination token strip), used for caching
 */
export function parseQuery(input) {
    let raw = (input || "").trim();
    if (!raw) {
        return { query: "", queryClass: null, cacheKey: "" };
    }

    // Strip trailing pagination token before matching query classes.
    // Pagination is handled by the omnibox framework; we just need
    // to parse the remaining text.
    let args = raw.split(/\s+/i);
    if (args.length > 1) {
        let lastArg = args[args.length - 1];
        if (lastArg && lastArg.startsWith("-")) {
            args.pop();
            raw = args.join(" ").trim();
        }
    }

    // Try prefix match: "@dataset llama"
    let prefixMatch = raw.match(PREFIX_REGEX);
    if (prefixMatch) {
        let qc = prefixMatch[1].toLowerCase();
        return {
            query: (prefixMatch[2] || "").trim(),
            queryClass: QUERY_CLASSES.includes(qc) ? qc : null,
            cacheKey: raw,
        };
    }

    // Try suffix match: "llama @dataset"
    let suffixMatch = raw.match(SUFFIX_REGEX);
    if (suffixMatch) {
        let qc = suffixMatch[2].toLowerCase();
        return {
            query: (suffixMatch[1] || "").trim(),
            queryClass: QUERY_CLASSES.includes(qc) ? qc : null,
            cacheKey: raw,
        };
    }

    // No query class — default search.
    return { query: raw, queryClass: null, cacheKey: raw };
}
