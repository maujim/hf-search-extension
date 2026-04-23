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
        this.cacheTtlMs = cacheTtlMs;

        this.initialLimit = limit;
        this.warmLimit = 100;
        this.deepLimit = 1000;

        // query -> { value: [{id}], fetchedLimit, expiresAt }
        this.cache = new Map();
        // `${query}::${limit}` -> Promise
        this.inFlight = new Map();
        // `${query}::${targetLimit}` -> timerId
        this.prefetchTimers = new Map();

        this.latestQuery = "";

        // Debounce queue for "typing" searches.
        this.pendingQuery = "";
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
        let requiredItems = page * pageSize;

        let desiredLimit = this.initialLimit;
        if (requiredItems > this.warmLimit) {
            desiredLimit = this.deepLimit;
        } else if (requiredItems > this.initialLimit) {
            desiredLimit = this.warmLimit;
        }

        let cached = this.getFromCache(query);
        if (cached && cached.fetchedLimit >= desiredLimit) {
                this.schedulePrefetches(query, cached.fetchedLimit);
            return cached.value;
        }

        // Keep typing smooth: debounce only initial tier requests.
        let result;
        if (desiredLimit <= this.initialLimit) {
            result = await this.debouncedFetch(query, desiredLimit);
        } else {
            result = await this.fetchAndCache(query, desiredLimit);
        }

        this.schedulePrefetches(query, desiredLimit);
        return result;
    }

    schedulePrefetches(query, currentLimit) {
        if (currentLimit < this.warmLimit) {
            this.schedulePrefetch(query, this.warmLimit, 250);
        }
        if (currentLimit >= this.warmLimit && currentLimit < this.deepLimit) {
            // Deeper pages should be ready if user keeps exploring.
            this.schedulePrefetch(query, this.deepLimit, 1200);
        }
    }

    schedulePrefetch(query, targetLimit, delayMs) {
        const timerKey = `${query}::${targetLimit}`;
        if (this.prefetchTimers.has(timerKey)) {
            return;
        }

        let timer = setTimeout(async () => {
            this.prefetchTimers.delete(timerKey);

            // Only prefetch for the currently active query.
            if (this.latestQuery !== query) {
                return;
            }

            let latest = this.getFromCache(query);
            if (latest && latest.fetchedLimit >= targetLimit) {
                return;
            }

            try {
                await this.fetchAndCache(query, targetLimit);
            } catch (error) {
                console.error(`[HuggingFaceSearch] prefetch ${targetLimit} failed:`, error);
            }
        }, delayMs);

        this.prefetchTimers.set(timerKey, timer);
    }

    async debouncedFetch(query, limit) {
        return await new Promise(resolve => {
            // Resolve previously queued debounced requests so callers don't hang.
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
                    let result = await this.fetchAndCache(queuedQuery, limit);
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

            // Basic validation: keep object-shaped items with string ids.
            let result = payload
                .filter(item => item && typeof item === "object" && typeof item.id === "string")
                .map(item => ({ id: item.id }));

            this.setCache(query, result, limit);
            if (limit === this.warmLimit) {
                this.schedulePrefetch(query, this.deepLimit, 1000);
            }
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
            // Never downgrade to a smaller limit response.
            return;
        }

        this.cache.set(query, {
            value,
            fetchedLimit,
            expiresAt: Date.now() + this.cacheTtlMs,
        });

        // Keep a simple FIFO cap to avoid unbounded memory growth.
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
