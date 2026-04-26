(() => {
    function buildAIConfig({ aiClientConfig, globalConfig, providerConfig }) {
        const provider = aiClientConfig.provider || 'gemini';
        const model =
            aiClientConfig.model ||
            (provider === 'nvidia'
                ? globalConfig.nvidiaModel
                : globalConfig.openRouterModel) ||
            (typeof providerConfig.getDefaultModelForProvider === 'function'
                ? providerConfig.getDefaultModelForProvider(provider)
                : 'openai/gpt-oss-120b:free');

        return {
            apiKey: aiClientConfig.apiKey || null,
            model,
            profile: aiClientConfig.profile || globalConfig.openRouterProfile,
            provider,
            responseLength:
                aiClientConfig.responseLength ||
                globalConfig.aiResponseLength ||
                'short',
            businessModeEnabled:
                aiClientConfig.businessModeEnabled ??
                globalConfig.businessModeEnabled,
            businessContext:
                aiClientConfig.businessContext || globalConfig.businessContext,
            businessTone:
                aiClientConfig.businessTone ||
                globalConfig.businessTone ||
                'consultivo',
        };
    }

    function normalizeAISuggestions(aiSuggestions, fallbackSuggestions) {
        const safe =
            aiSuggestions && aiSuggestions.length
                ? aiSuggestions
                : fallbackSuggestions;

        return {
            safe,
            trimmed: safe
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .slice(0, 3),
        };
    }

    const api = {
        buildAIConfig,
        normalizeAISuggestions,
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
    root.window.ChatSuggestions.ChatAIHelpers = api;
})();
