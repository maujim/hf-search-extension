export default class HuggingFaceSearch {
    constructor({
        debounceMs = 250,
        cacheTtlMs = 5 * 60 * 1000,
        maxCacheSize = 100,
        limit = 10,
        deepLimit = 1000,
        deepPrefetchDelayMs = 900,
    } = {}) {
        this.debounceMs = debounceMs;
        this.cacheTtlMs = cacheTtlMs;
        this.maxCacheSize = maxCacheSize;

        // Minimum initial fetch size safety net.
        this.baseLimit = limit;
        this.deepLimit = deepLimit;
        this.deepPrefetchDelayMs = deepPrefetchDelayMs;

        // query -> { value: [{id}], fetchedLimit, expiresAt }
        this.cache = new Map();
        // `${query}::${limit}` -> Promise
        this.inFlight = new Map();
        // `${query}::deep` -> timerId
        this.prefetchTimers = new Map();

        this.latestQuery = "";

        // Debounce queue for "typing" searches.
        this.pendingQuery = "";
        this.pendingLimit = 0;
        this.pendingTimer = null;
        this.pendingResolvers = [];
    }

    async search(input, context = {}) {
        let query = (input || "").trim();
        if (!query) {
            return [];
        }

        this.latestQuery = query;

        let page = Math.max(1, context.page || 1);
        let pageSize = Math.max(1, context.pageSize || 8);
        let initialLimit = Math.max(this.baseLimit, pageSize * 2);
        let requiresDeep = page > 2;
        let desiredLimit = requiresDeep ? this.deepLimit : initialLimit;

        let cached = this.getFromCache(query);
        if (cached && cached.fetchedLimit >= desiredLimit) {
            this.scheduleDeepPrefetch(query, cached.fetchedLimit);
            return cached.value;
        }

        // If user paginates to page 2 while initial debounce is pending,
        // fast-track deep fetch now so pagination has room.
        let shouldFastTrackDeep = page >= 2 && this.pendingTimer && this.pendingQuery === query;
        if (shouldFastTrackDeep) {
            this.clearPendingDebounce([]);
            let deepResult = await this.fetchAndCache(query, this.deepLimit);
            return deepResult;
        }

        let result;
        if (desiredLimit <= initialLimit) {
            result = await this.debouncedFetch(query, desiredLimit);
        } else {
            result = await this.fetchAndCache(query, desiredLimit);
        }

        this.scheduleDeepPrefetch(query, desiredLimit);
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
    }

    scheduleDeepPrefetch(query, currentLimit) {
        if (currentLimit >= this.deepLimit) {
            return;
        }

        const timerKey = `${query}::deep`;
        if (this.prefetchTimers.has(timerKey)) {
            return;
        }

        let timer = setTimeout(async () => {
            this.prefetchTimers.delete(timerKey);

            if (this.latestQuery !== query) {
                return;
            }

            let latest = this.getFromCache(query);
            if (latest && latest.fetchedLimit >= this.deepLimit) {
                return;
            }

            try {
                await this.fetchAndCache(query, this.deepLimit);
            } catch (error) {
                console.error("[HuggingFaceSearch] deep prefetch failed:", error);
            }
        }, this.deepPrefetchDelayMs);

        this.prefetchTimers.set(timerKey, timer);
    }

    async debouncedFetch(query, limit) {
        return await new Promise(resolve => {
            this.clearPendingDebounce([]);

            this.pendingQuery = query;
            this.pendingLimit = limit;
            this.pendingResolvers.push(resolve);

            this.pendingTimer = setTimeout(async () => {
                let queuedResolvers = this.pendingResolvers;
                let queuedQuery = this.pendingQuery;
                let queuedLimit = this.pendingLimit;

                this.pendingResolvers = [];
                this.pendingTimer = null;
                this.pendingQuery = "";
                this.pendingLimit = 0;

                try {
                    let result = await this.fetchAndCache(queuedQuery, queuedLimit);
                    queuedResolvers.forEach(r => r(result));
                } catch (error) {
                    console.error("[HuggingFaceSearch] fetch failed:", error);
                    queuedResolvers.forEach(r => r([]));
                }
            }, this.debounceMs);
        });
    }

    async fetchAndCache(query, limit) {
        let existing = this.getFromCache(query);
        if (existing && existing.fetchedLimit >= limit) {
            return existing.value;
        }

        const key = `${query}::${limit}`;
        if (this.inFlight.has(key)) {
            return await this.inFlight.get(key);
        }

        const request = (async () => {
            const url = `https://huggingface.co/api/models?limit=${limit}&search=${encodeURIComponent(query)}`;
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

            let result = payload
                .filter(item => item && typeof item === "object" && typeof item.id === "string")
                .map(item => ({ id: item.id }));

            this.setCache(query, result, limit);
            return result;
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
