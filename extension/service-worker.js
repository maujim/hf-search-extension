import { Omnibox, Compat } from "./core/index.js";
import { start } from "./main.js";

let isInited = false;

function init() {
    if (isInited) {
        return;
    }

    const defaultSuggestion = "Search <match>Hugging Face</match> from your address bar.";
    const omnibox = Omnibox.extension({
        defaultSuggestion,
        maxSuggestionSize: Compat.omniboxPageSize(),
    });
    start(omnibox);
    isInited = true;
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

if (!isInited) {
    init();
}
