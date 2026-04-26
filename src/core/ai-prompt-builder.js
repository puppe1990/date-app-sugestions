(() => {
    function applyPersonalityToSystemPrompt({
        systemPrompt,
        personality,
        buildPersonalityAddon,
    }) {
        const base = String(systemPrompt || '').trim();
        if (!base) return '';
        const addon =
            typeof buildPersonalityAddon === 'function'
                ? buildPersonalityAddon(personality)
                : '';
        return `${base}${addon}`.trim();
    }

    function resolveConfiguredProfile({ aiClientConfig, globalProfile }) {
        return (
            (aiClientConfig && aiClientConfig.profile) || globalProfile || ''
        );
    }

    function buildAIPrompts({
        aiLoading,
        aiClient,
        aiClientConfig,
        globalProfile,
        contextExtractor,
        chatContainer,
        extractProfileText,
        extractOtherPersonName,
        getCurrentContactContextForPrompt,
    }) {
        if (aiLoading || !aiClient) {
            return { systemPrompt: '', userPrompt: '' };
        }

        const context = contextExtractor.extract(chatContainer, {
            fullHistory: true,
        });
        const messages = context?.allMessages || context?.lastMessages || [];
        const profile = resolveConfiguredProfile({
            aiClientConfig,
            globalProfile,
        });

        return aiClient.buildPrompts({
            messages,
            profile: [profile].filter(Boolean).join('\n\n'),
            otherPersonName: extractOtherPersonName(),
            otherPersonProfile: extractProfileText(),
            otherPersonContextNote: getCurrentContactContextForPrompt(),
        });
    }

    const api = {
        applyPersonalityToSystemPrompt,
        buildAIPrompts,
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
    root.window.ChatSuggestions.AIPromptBuilder = api;
})();
