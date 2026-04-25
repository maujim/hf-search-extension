import { Omnibox, Compat } from "./core/index.js";
import { start } from "./main.js";

let isInited = false;

async function init() {
    if (isInited) {
        return;
    }
    isInited = true;

    const defaultSuggestion = "Search <match>Hugging Face</match> from your address bar.";
    const omnibox = Omnibox.extension({
        defaultSuggestion,
        maxSuggestionSize: Compat.omniboxPageSize(),
    });
    await start(omnibox);
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

if (!isInited) {
    init();
}
