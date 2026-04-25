import { Compat, Omnibox } from "./core/index.js";

export class HfSearchOmnibox {
    static async run({ omnibox, huggingFaceSearcher }) {
        function parseHfQueryClass(query) {
            let raw = (query || "").trim();
            if (!raw) {
                return {
                    queryClass: null,
                    keyword: "",
                };
            }

            let args = raw.split(/\s+/i);
            if (args.length > 1) {
                let lastArg = args[args.length - 1];
                if (lastArg?.startsWith("-")) {
                    args.pop();
                    raw = args.join(" ").trim();
                }
            }

            let prefixMatch = raw.match(/^@(model|dataset|space|org|user|paper|collection|bucket)\s+(.*)$/i);
            if (prefixMatch) {
                return {
                    queryClass: prefixMatch[1].toLowerCase(),
                    keyword: (prefixMatch[2] || "").trim(),
                };
            }

            let suffixMatch = raw.match(/^(.*?)\s+@(model|dataset|space|org|user|paper|collection|bucket)$/i);
            if (suffixMatch) {
                return {
                    queryClass: suffixMatch[2].toLowerCase(),
                    keyword: (suffixMatch[1] || "").trim(),
                };
            }

            return {
                queryClass: null,
                keyword: raw,
            };
        }

        function huggingFaceRepoUrl(value, repoType = "model") {
            let raw = (value || "").trim();
            if (!raw) {
                return null;
            }

            if (/^https?:\/\//i.test(raw)) {
                return raw;
            }

            let repo = raw.replace(/^\/+|\/+$/g, "");
            if (!repo) {
                return null;
            }
            let encodedRepo = repo
                .split("/")
                .filter(Boolean)
                .map(part => encodeURIComponent(part))
                .join("/");

            switch (repoType) {
                case "dataset":
                    return `https://huggingface.co/datasets/${encodedRepo}`;
                case "space":
                    return `https://huggingface.co/spaces/${encodedRepo}`;
                case "paper":
                    return `https://huggingface.co/papers/${encodedRepo}`;
                case "collection":
                    return `https://huggingface.co/collections/${encodedRepo}`;
                case "bucket":
                    return `https://huggingface.co/bucket/${encodedRepo}`;
                default:
                    return `https://huggingface.co/${encodedRepo}`;
            }
        }

        function repoTypeLabel(repoType) {
            switch (repoType) {
                case "dataset":
                    return "Dataset";
                case "space":
                    return "Space";
                case "org":
                    return "Org";
                case "user":
                    return "User";
                case "paper":
                    return "Paper";
                case "collection":
                    return "Collection";
                case "bucket":
                    return "Bucket";
                default:
                    return "Model";
            }
        }

        omnibox.bootstrap({
            onSearch: async (query) => {
                return await huggingFaceSearcher.search(query);
            },
            onFormat: (_, repo) => {
                let repoType = repo.type || "model";
                let url = huggingFaceRepoUrl(repo.id, repoType) || repo.id;
                return {
                    content: url,
                    description: `[${repoTypeLabel(repoType)}] <match>${Compat.escape(repo.id)}</match>`,
                };
            },
            onAppend: async (query) => {
                let { queryClass, keyword } = parseHfQueryClass(query);
                let url = huggingFaceRepoUrl(keyword, queryClass || "model");
                if (!url) {
                    return [];
                }
                return [{
                    content: url,
                    description: `Open Hugging Face ${repoTypeLabel(queryClass || "model").toLowerCase()} <match>${Compat.escape(keyword)}</match>`,
                }];
            },
            beforeNavigate: async (_, content) => {
                let { queryClass, keyword } = parseHfQueryClass(content);
                return huggingFaceRepoUrl(keyword, queryClass || "model") || content;
            },
            onEmptyNavigate: async (content, disposition) => {
                let { queryClass, keyword } = parseHfQueryClass(content);
                let url = huggingFaceRepoUrl(keyword, queryClass || "model");
                if (!url) {
                    return;
                }
                Omnibox.navigateToUrl(url, disposition);
            },
        });
    }
}
