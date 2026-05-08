import { Compat, Omnibox } from "./core/index.js";
import { parseQuery } from "./search/query-parser.js";
import { buildRepoUrl, repoTypeLabel } from "./search/repo-types.js";

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
                let url = buildRepoUrl(keyword, queryClass || "model");
                if (!url) {
                    return [];
                }
                return [{
                    content: url,
                    description: `Open Hugging Face ${repoTypeLabel(queryClass || "model").toLowerCase()} <match>${Compat.escape(keyword)}</match>`,
                }];
            },
            beforeNavigate: async (_, content) => {
                let { queryClass, query: keyword } = parseQuery(content);
                return buildRepoUrl(keyword, queryClass || "model") || content;
            },
            onEmptyNavigate: async (content, disposition) => {
                let { queryClass, query: keyword } = parseQuery(content);
                let url = buildRepoUrl(keyword, queryClass || "model");
                if (!url) {
                    return;
                }
                Omnibox.navigateToUrl(url, disposition);
            },
        });
    }
}
