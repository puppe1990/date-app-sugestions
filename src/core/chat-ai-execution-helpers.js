(() => {
    async function runAIGeneration({
        aiClient,
        fallbackSuggestions,
        request,
        normalizeAISuggestions,
    }) {
        const aiSuggestions = await request(aiClient);
        return normalizeAISuggestions(aiSuggestions, fallbackSuggestions);
    }

    const api = {
        runAIGeneration,
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
    root.window.ChatSuggestions.ChatAIExecutionHelpers = api;
})();
