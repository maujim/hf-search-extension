import { Compat, Omnibox } from "./core/index.js";
import { parseQuery } from "./search/query-parser.js";
import { buildFullTextSearchUrl, buildRepoUrl, repoTypeLabel } from "./search/repo-types.js";

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
                let url = queryClass
                    ? buildRepoUrl(keyword, queryClass)
                    : buildFullTextSearchUrl(keyword);
                if (!url) {
                    return [];
                }
                let description = queryClass
                    ? `Open Hugging Face ${repoTypeLabel(queryClass).toLowerCase()} <match>${Compat.escape(keyword)}</match>`
                    : `Search Hugging Face full text for <match>${Compat.escape(keyword)}</match>`;
                return [{
                    content: url,
                    description,
                }];
            },
            beforeNavigate: async (_, content) => {
                if (URL_PROTOCOLS.test(content)) {
                    return content;
                }

                let { queryClass, query: keyword } = parseQuery(content);
                return queryClass
                    ? buildRepoUrl(keyword, queryClass) || content
                    : buildFullTextSearchUrl(keyword) || content;
            },
            onEmptyNavigate: async (content, disposition) => {
                if (URL_PROTOCOLS.test(content)) {
                    Omnibox.navigateToUrl(content, disposition);
                    return;
                }

                let { queryClass, query: keyword } = parseQuery(content);
                let url = queryClass
                    ? buildRepoUrl(keyword, queryClass)
                    : buildFullTextSearchUrl(keyword);
                if (!url) {
                    return;
                }
                Omnibox.navigateToUrl(url, disposition);
            },
        });
    }
}
