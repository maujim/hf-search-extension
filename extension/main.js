import { HfSearchOmnibox } from "./lib.js";
import HuggingFaceSearch from "./search/huggingface.js";

function start(omnibox) {
    const huggingFaceSearcher = new HuggingFaceSearch({
        debounceMs: 250,
        cacheTtlMs: 60 * 1000,
        maxCacheSize: 100,
        limit: 10,
    });

    return HfSearchOmnibox.run({
        omnibox,
        huggingFaceSearcher,
    });
}

export { start };
