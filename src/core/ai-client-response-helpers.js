(() => {
    function extractSuggestions(text) {
        if (!text) return [];

        const suggestions = [];
        const pushSuggestions = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((item) => {
                if (typeof item === 'string') {
                    const trimmed = item.trim();
                    if (trimmed) suggestions.push(trimmed);
                }
            });
        };

        const tryParse = (snippet) => {
            try {
                const json = JSON.parse(snippet);
                if (json && Array.isArray(json.suggestions)) {
                    pushSuggestions(json.suggestions);
                    return true;
                }
            } catch (e) {
                return false;
            }
            return false;
        };

        if (tryParse(text)) {
            return Array.from(new Set(suggestions)).slice(0, 5);
        }

        const cleaned = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        if (tryParse(cleaned)) {
            return Array.from(new Set(suggestions)).slice(0, 5);
        }

        const jsonMatches = cleaned.match(
            /{[^{}]*"suggestions"\s*:\s*\[[\s\S]*?\]}/g,
        );
        if (jsonMatches) {
            jsonMatches.forEach((snippet) => tryParse(snippet));
        }
        if (suggestions.length > 0) {
            return Array.from(new Set(suggestions)).slice(0, 5);
        }

        return [];
    }

    function sanitizeSuggestions(suggestions, userPrompt) {
        const unique = [];
        const seen = new Set();
        const chatInProgress = this.isChatAlreadyInProgress(userPrompt);

        suggestions.forEach((item) => {
            const suggestion = String(item || '').trim();
            if (!suggestion) return;

            if (
                chatInProgress &&
                this.isGenericConversationRestart(suggestion)
            ) {
                return;
            }

            const normalized = suggestion.toLowerCase();
            if (seen.has(normalized)) return;
            seen.add(normalized);
            unique.push(suggestion);
        });

        return unique.slice(0, 5);
    }

    function isChatAlreadyInProgress(userPrompt) {
        const prompt = String(userPrompt || '');
        if (!prompt) return false;

        const historyMatches =
            prompt.match(/\n\d+\.\s+(?:EU|[^\n:]+):\s+/g) || [];
        return historyMatches.length >= 3;
    }

    function isGenericConversationRestart(text) {
        const normalized = String(text || '')
            .trim()
            .toLowerCase();
        if (!normalized) return false;

        return [
            /^(oi|olá|ola|bom dia|boa tarde|boa noite)[!,. ]*/,
            /\bcomo você está\b/,
            /\bcomo vc está\b/,
            /\btudo bem\b/,
            /\bcomo está seu dia\b/,
            /\bcomo foi seu dia\b/,
        ].some((pattern) => pattern.test(normalized));
    }

    const api = {
        extractSuggestions,
        isChatAlreadyInProgress,
        isGenericConversationRestart,
        sanitizeSuggestions,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    const root =
        typeof globalThis !== 'undefined'
            ? globalThis
            : typeof window !== 'undefined'
              ? window
              : {};
    root.window = root.window || root;
    root.window.ChatSuggestions = root.window.ChatSuggestions || {};
    root.window.ChatSuggestions.AIClientResponseHelpers = api;
})();
