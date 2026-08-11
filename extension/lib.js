import { Compat, Omnibox } from "./core/index.js";
import { parseQuery } from "./search/query-parser.js";
import { buildBrowseSearchUrl, buildFullTextSearchUrl, buildRepoUrl, repoTypeLabel } from "./search/repo-types.js";

const URL_PROTOCOLS = /^(https?|file|chrome-extension|moz-extension):\/\//i;

export class HfSearchOmnibox {
    static run({ omnibox, huggingFaceSearcher }) {
        const selectSearchUrl = (keyword, queryClass) => {
            let browseUrl = queryClass ? buildBrowseSearchUrl(keyword, queryClass) : null;
            return browseUrl
                || (queryClass ? buildFullTextSearchUrl(keyword, queryClass) : null)
                || buildFullTextSearchUrl(keyword);
        };

        omnibox.bootstrap({
            onSearch: (query, context) => huggingFaceSearcher.search(query, context),
            onFormat: (_, repo) => {
                let repoType = repo.type || "model";
                let url = buildRepoUrl(repo.id, repoType) || repo.id;
                return {
                    content: url,
                    description: `[${repoTypeLabel(repoType)}] <match>${Compat.escape(repo.id)}</match>`,
                };
            },
            onAppend: async (query) => {
                let { queryClass, query: keyword } = parseQuery(query);
                let searchUrl = selectSearchUrl(keyword, queryClass);
                if (!searchUrl) {
                    return [];
                }

                let escapedKeyword = Compat.escape(keyword);
                let isTypedSearch = queryClass && (
                    buildBrowseSearchUrl(keyword, queryClass)
                    || buildFullTextSearchUrl(keyword, queryClass)
                );
                let description = isTypedSearch
                    ? `Search Hugging Face ${repoTypeLabel(queryClass).toLowerCase()}s for <match>${escapedKeyword}</match>`
                    : `Search Hugging Face full text for <match>${escapedKeyword}</match>`;
                let suggestions = [{
                    content: searchUrl,
                    description,
                }];
                if (!queryClass) {
                    for (let repoType of ["model", "dataset", "space"]) {
                        suggestions.push({
                            content: buildBrowseSearchUrl(keyword, repoType),
                            description: `Search Hugging Face ${repoTypeLabel(repoType).toLowerCase()}s for <match>${escapedKeyword}</match>`,
                        });
                    }
                }
                return suggestions;
            },
            beforeNavigate: async (_, content) => {
                if (URL_PROTOCOLS.test(content)) {
                    return content;
                }

                let { queryClass, query: keyword } = parseQuery(content);
                return selectSearchUrl(keyword, queryClass) || content;
            },
            onEmptyNavigate: async (content, disposition) => {
                if (URL_PROTOCOLS.test(content)) {
                    Omnibox.navigateToUrl(content, disposition);
                    return;
                }

                let { queryClass, query: keyword } = parseQuery(content);
                let url = selectSearchUrl(keyword, queryClass);
                if (!url) {
                    return;
                }
                Omnibox.navigateToUrl(url, disposition);
            },
        });
    }
}
