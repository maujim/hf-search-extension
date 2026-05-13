import { parseQuery } from "./query-parser.js";
import { quicksearchKey, extractQuicksearchId, supportsFullTextSearch } from "./repo-types.js";

export default class HuggingFaceSearch {
    constructor({
        debounceMs = 250,
        cacheTtlMs = 5 * 60 * 1000,
        maxCacheSize = 100,
        limit = 10,
        deepLimit = 64,
        deepPrefetchDelayMs = 900,
        repoTypes = ["model", "dataset"],
    } = {}) {
        this.debounceMs = debounceMs;
        this.cacheTtlMs = cacheTtlMs;
        this.maxCacheSize = maxCacheSize;

        // Minimum initial fetch size safety net.
        this.baseLimit = limit;
        this.deepLimit = deepLimit;
        this.deepPrefetchDelayMs = deepPrefetchDelayMs;

        this.repoTypes = this.normalizeRepoTypes(repoTypes);

        // cacheKey -> { value: [{id, type}], fetchedLimit, expiresAt }
        this.cache = new Map();
        // `${cacheKey}::${limit}` -> Promise
        this.inFlight = new Map();
        // `${cacheKey}::deep` -> timerId
        this.prefetchTimers = new Map();

        this.latestQuery = "";

        // Debounce queue for "typing" searches.
        this.pendingQuery = "";
        this.pendingLimit = 0;
        this.pendingParsed = null;
        this.pendingTimer = null;
        this.pendingResolvers = [];
    }

    normalizeRepoTypes(repoTypes) {
        let rawTypes = Array.isArray(repoTypes) ? repoTypes : ["model", "dataset"];

        let normalizedTypes = [...new Set(rawTypes
            .map(type => String(type || "").trim().toLowerCase()))]
            .filter(type => supportsFullTextSearch(type) || quicksearchKey(type));

        if (normalizedTypes.length === 0) {
            return ["model"];
        }

        return normalizedTypes;
    }

    parseQuery(input) {
        return parseQuery(input);
    }

    async search(input, context = {}) {
        let parsed = this.parseQuery(input);
        if (!parsed.query) {
            return [];
        }

        this.latestQuery = parsed.cacheKey;

        let page = Math.max(1, context.page || 1);
        let pageSize = Math.max(1, context.pageSize || 8);
        let initialLimit = Math.max(this.baseLimit, pageSize * 2);
        let requiresDeep = page > 2;
        let desiredLimit = requiresDeep ? this.deepLimit : initialLimit;

        let cached = this.getFromCache(parsed.cacheKey);
        if (cached && cached.fetchedLimit >= desiredLimit) {
            this.scheduleDeepPrefetch(parsed.cacheKey, cached.fetchedLimit, parsed);
            return cached.value;
        }

        // If user paginates to page 2 while initial debounce is pending,
        // fast-track deep fetch now so pagination has room.
        let shouldFastTrackDeep = page >= 2 && this.pendingTimer && this.pendingQuery === parsed.cacheKey;
        if (shouldFastTrackDeep) {
            this.clearPendingDebounce([]);
            let deepResult = await this.fetchAndCache(parsed.cacheKey, this.deepLimit, parsed);
            return deepResult;
        }

        let result;
        if (desiredLimit <= initialLimit) {
            result = await this.debouncedFetch(parsed.cacheKey, desiredLimit, parsed);
        } else {
            result = await this.fetchAndCache(parsed.cacheKey, desiredLimit, parsed);
        }

        this.scheduleDeepPrefetch(parsed.cacheKey, desiredLimit, parsed);
        return result;
    }

    clearPendingDebounce(resolvedValue = []) {
        if (this.pendingTimer) {
            clearTimeout(this.pendingTimer);
            this.pendingTimer = null;
        }
        if (this.pendingResolvers.length > 0) {
            this.pendingResolvers.forEach(r => r(resolvedValue));
            this.pendingResolvers = [];
        }
        this.pendingQuery = "";
        this.pendingLimit = 0;
        this.pendingParsed = null;
    }

    scheduleDeepPrefetch(cacheKey, currentLimit, parsed) {
        if (currentLimit >= this.deepLimit) {
            return;
        }

        const timerKey = `${cacheKey}::deep`;
        if (this.prefetchTimers.has(timerKey)) {
            return;
        }

        let timer = setTimeout(async () => {
            this.prefetchTimers.delete(timerKey);

            if (this.latestQuery !== cacheKey) {
                return;
            }

            let latest = this.getFromCache(cacheKey);
            if (latest && latest.fetchedLimit >= this.deepLimit) {
                return;
            }

            try {
                await this.fetchAndCache(cacheKey, this.deepLimit, parsed);
            } catch (error) {
                console.error("[HuggingFaceSearch] deep prefetch failed:", error);
            }
        }, this.deepPrefetchDelayMs);

        this.prefetchTimers.set(timerKey, timer);
    }

    async debouncedFetch(cacheKey, limit, parsed) {
        return await new Promise(resolve => {
            this.clearPendingDebounce([]);

            this.pendingQuery = cacheKey;
            this.pendingLimit = limit;
            this.pendingParsed = parsed;
            this.pendingResolvers.push(resolve);

            this.pendingTimer = setTimeout(async () => {
                let queuedResolvers = this.pendingResolvers;
                let queuedQuery = this.pendingQuery;
                let queuedLimit = this.pendingLimit;
                let queuedParsed = this.pendingParsed;

                this.pendingResolvers = [];
                this.pendingTimer = null;
                this.pendingQuery = "";
                this.pendingLimit = 0;
                this.pendingParsed = null;

                try {
                    let result = await this.fetchAndCache(queuedQuery, queuedLimit, queuedParsed);
                    queuedResolvers.forEach(r => r(result));
                } catch (error) {
                    console.error("[HuggingFaceSearch] fetch failed:", error);
                    queuedResolvers.forEach(r => r([]));
                }
            }, this.debounceMs);
        });
    }

    async fetchFullTextSearchType(query, limit, repoType) {
        if (!supportsFullTextSearch(repoType)) {
            return [];
        }

        const url = `https://huggingface.co/api/search/full-text?limit=${limit}&q=${encodeURIComponent(query)}&type=${encodeURIComponent(repoType)}`;
        let response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`[${repoType}] HTTP ${response.status}`);
        }

        let payload = await response.json();
        let hits = Array.isArray(payload?.hits) ? payload.hits : [];

        let seen = new Set();
        return hits
            .filter(item => item && typeof item === "object")
            .map(item => {
                let id = item.name || (item.repoOwner && item.repoName ? `${item.repoOwner}/${item.repoName}` : null);
                if (!id || seen.has(id)) {
                    return null;
                }

                seen.add(id);
                return {
                    id: String(id),
                    type: repoType,
                };
            })
            .filter(Boolean);
    }

    extractQuicksearchId(item, queryClass) {
        return extractQuicksearchId(item, queryClass);
    }

    async fetchQuicksearchType(query, limit, queryClass) {
        let collectionKey = quicksearchKey(queryClass);
        if (!collectionKey) {
            return [];
        }

        const url = `https://huggingface.co/api/quicksearch?limit=${limit}&q=${encodeURIComponent(query)}&type=${encodeURIComponent(queryClass)}`;
        let response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`[${queryClass}] HTTP ${response.status}`);
        }

        let payload = await response.json();
        let items = Array.isArray(payload?.[collectionKey]) ? payload[collectionKey] : [];

        return items
            .filter(item => item && typeof item === "object")
            .map(item => {
                let id = this.extractQuicksearchId(item, queryClass);
                if (!id) {
                    return null;
                }

                return {
                    id: String(id),
                    type: queryClass,
                };
            })
            .filter(Boolean);
    }

    mergeRoundRobin(groups) {
        let merged = [];
        let cursor = 0;

        while (true) {
            let appended = false;
            for (let group of groups) {
                if (cursor < group.length) {
                    merged.push(group[cursor]);
                    appended = true;
                }
            }
            if (!appended) {
                break;
            }
            cursor++;
        }

        return merged;
    }

    async fetchAndCache(cacheKey, limit, parsed) {
        let existing = this.getFromCache(cacheKey);
        if (existing && existing.fetchedLimit >= limit) {
            return existing.value;
        }

        const key = `${cacheKey}::${limit}`;
        if (this.inFlight.has(key)) {
            return await this.inFlight.get(key);
        }

        const request = (async () => {
            let activeTypes = parsed?.queryClass ? [parsed.queryClass] : this.repoTypes;
            let responses = await Promise.allSettled(
                activeTypes.map(repoType => {
                    if (supportsFullTextSearch(repoType)) {
                        return this.fetchFullTextSearchType(parsed.query, limit, repoType);
                    }
                    return this.fetchQuicksearchType(parsed.query, limit, repoType);
                })
            );

            let groupedResults = responses.map((result, index) => {
                if (result.status === "fulfilled") {
                    return result.value;
                }

                let repoType = activeTypes[index] || "unknown";
                console.error(`[HuggingFaceSearch] ${repoType} fetch failed:`, result.reason);
                return [];
            });

            let mergedResult = this.mergeRoundRobin(groupedResults);
            this.setCache(cacheKey, mergedResult, limit);
            return mergedResult;
        })();

        this.inFlight.set(key, request);

        try {
            return await request;
        } finally {
            this.inFlight.delete(key);
        }
    }

    getFromCache(query) {
        let hit = this.cache.get(query);
        if (!hit) {
            return null;
        }

        if (Date.now() > hit.expiresAt) {
            this.cache.delete(query);
            return null;
        }

        return hit;
    }

    setCache(query, value, fetchedLimit) {
        let previous = this.cache.get(query);
        if (previous && previous.fetchedLimit > fetchedLimit) {
            return;
        }

        this.cache.set(query, {
            value,
            fetchedLimit,
            expiresAt: Date.now() + this.cacheTtlMs,
        });

        while (this.cache.size > this.maxCacheSize) {
            let oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            for (let [timerKey, timer] of this.prefetchTimers.entries()) {
                if (timerKey.startsWith(`${oldestKey}::`)) {
                    clearTimeout(timer);
                    this.prefetchTimers.delete(timerKey);
                }
            }
        }
    }
}
