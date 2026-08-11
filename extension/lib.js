import { Compat, Omnibox } from "./core/index.js";
import { parseQuery } from "./search/query-parser.js";
import { buildBrowseSearchUrl, buildFullTextSearchUrl, buildRepoUrl, repoTypeLabel } from "./search/repo-types.js";

const URL_PROTOCOLS = /^(https?|file|chrome-extension|moz-extension):\/\//i;

export class HfSearchOmnibox {
    static async run({ omnibox, huggingFaceSearcher }) {
        omnibox.bootstrap({
            onSearch: async (query) => {
                return await huggingFaceSearcher.search(query);
            },
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
                let browseUrl = queryClass ? buildBrowseSearchUrl(keyword, queryClass) : null;
                let searchUrl = queryClass
                    ? (browseUrl || buildFullTextSearchUrl(keyword, queryClass))
                    : buildFullTextSearchUrl(keyword);
                let directUrl = queryClass ? buildRepoUrl(keyword, queryClass) : null;
                let url = searchUrl || directUrl;
                if (!url) {
                    return [];
                }

                let escapedKeyword = Compat.escape(keyword);
                let description = searchUrl
                    ? (queryClass
                        ? `Search Hugging Face ${repoTypeLabel(queryClass).toLowerCase()}s for <match>${escapedKeyword}</match>`
                        : `Search Hugging Face full text for <match>${escapedKeyword}</match>`)
                    : `Open Hugging Face ${repoTypeLabel(queryClass).toLowerCase()} <match>${escapedKeyword}</match>`;
                let suggestions = [{
                    content: url,
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
                return queryClass
                    ? buildBrowseSearchUrl(keyword, queryClass) || buildFullTextSearchUrl(keyword, queryClass) || buildRepoUrl(keyword, queryClass) || content
                    : buildFullTextSearchUrl(keyword) || content;
            },
            onEmptyNavigate: async (content, disposition) => {
                if (URL_PROTOCOLS.test(content)) {
                    Omnibox.navigateToUrl(content, disposition);
                    return;
                }

                let { queryClass, query: keyword } = parseQuery(content);
                let url = queryClass
                    ? buildBrowseSearchUrl(keyword, queryClass) || buildFullTextSearchUrl(keyword, queryClass) || buildRepoUrl(keyword, queryClass)
                    : buildFullTextSearchUrl(keyword);
                if (!url) {
                    return;
                }
                Omnibox.navigateToUrl(url, disposition);
            },
        });
    }
}
