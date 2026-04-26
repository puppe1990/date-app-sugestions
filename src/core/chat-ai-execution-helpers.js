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

    function setAIRequestState({ controller, loading, sendingPrompt = false }) {
        controller.aiLoading = loading;
        controller.ui?.setAiLoading?.(loading);
        controller.ui?.setAiPromptSending?.(sendingPrompt && loading);
    }

    async function runControllerAIGeneration({
        controller,
        request,
        closePromptModal = false,
    }) {
        const aiHelpers = window.ChatSuggestions.ChatAIHelpers || {};
        const result = await runAIGeneration({
            aiClient: controller.aiClient,
            fallbackSuggestions:
                controller.suggestionEngine.getDefaultSuggestions(),
            request,
            normalizeAISuggestions: aiHelpers.normalizeAISuggestions,
        });

        controller.ui.render(result.safe, { isAI: true });
        controller.info('Sugestões de IA geradas', {
            total: result.safe.length,
        });

        if (closePromptModal) {
            controller.ui.closeAiPromptModal();
        }

        return result;
    }

    const api = {
        runAIGeneration,
        runControllerAIGeneration,
        setAIRequestState,
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
