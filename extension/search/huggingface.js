export default class HuggingFaceSearch {
    constructor({
        debounceMs = 250,
        cacheTtlMs = 5 * 60 * 1000,
        maxCacheSize = 100,
        limit = 10,
    } = {}) {
        this.debounceMs = debounceMs;
        this.cacheTtlMs = cacheTtlMs;
        this.maxCacheSize = maxCacheSize;
        this.limit = limit;

        this.cache = new Map();
        this.inFlight = new Map();

        this.pendingQuery = "";
        this.pendingTimer = null;
        this.pendingResolvers = [];
    }

    async search(input) {
        let query = (input || "").trim();
        if (!query) {
            return [];
        }

        let cached = this.getFromCache(query);
        if (cached) {
            return cached;
        }

        if (this.inFlight.has(query)) {
            return await this.inFlight.get(query);
        }

        return await this.debouncedFetch(query);
    }

    async debouncedFetch(query) {
        return await new Promise(resolve => {
            // Resolve previous queued debounced searches so callers don't hang.
            if (this.pendingResolvers.length > 0) {
                this.pendingResolvers.forEach(r => r([]));
                this.pendingResolvers = [];
            }

            if (this.pendingTimer) {
                clearTimeout(this.pendingTimer);
                this.pendingTimer = null;
            }

            this.pendingQuery = query;
            this.pendingResolvers.push(resolve);

            this.pendingTimer = setTimeout(async () => {
                let queuedResolvers = this.pendingResolvers;
                let queuedQuery = this.pendingQuery;

                this.pendingResolvers = [];
                this.pendingTimer = null;
                this.pendingQuery = "";

                try {
                    let result = await this.fetchAndCache(queuedQuery);
                    queuedResolvers.forEach(r => r(result));
                } catch (error) {
                    console.error("[HuggingFaceSearch] fetch failed:", error);
                    queuedResolvers.forEach(r => r([]));
                }
            }, this.debounceMs);
        });
    }

    async fetchAndCache(query) {
        const request = (async () => {
            const url = `https://huggingface.co/api/models?limit=${this.limit}&search=${encodeURIComponent(query)}`;
            let response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            let payload = await response.json();
            if (!Array.isArray(payload)) {
                return [];
            }

            // Basic validation: keep object-shaped items with string ids.
            let result = payload
                .filter(item => item && typeof item === "object" && typeof item.id === "string")
                .map(item => ({ id: item.id }));

            this.setCache(query, result);
            return result;
        })();

        this.inFlight.set(query, request);

        try {
            return await request;
        } finally {
            this.inFlight.delete(query);
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

        return hit.value;
    }

    setCache(query, value) {
        this.cache.set(query, {
            value,
            expiresAt: Date.now() + this.cacheTtlMs,
        });

        // Keep a simple FIFO cap to avoid unbounded memory growth.
        while (this.cache.size > this.maxCacheSize) {
            let oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
}
