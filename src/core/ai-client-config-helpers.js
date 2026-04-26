(() => {
    function getDefaultEndpointForProvider(provider) {
        if (provider === 'nvidia') {
            return 'https://integrate.api.nvidia.com/v1/chat/completions';
        }
        return 'https://openrouter.ai/api/v1/chat/completions';
    }

    function getResponseLengthConfig(responseLength) {
        const value = String(responseLength || this.responseLength || 'short');
        const map = {
            short: {
                label: 'curta',
                maxChars: 80,
                maxTokens: 180,
            },
            medium: {
                label: 'média',
                maxChars: 160,
                maxTokens: 320,
            },
            long: {
                label: 'longa',
                maxChars: 280,
                maxTokens: 520,
            },
        };
        return map[value] || map.short;
    }

    function getBusinessToneLabel(tone) {
        const value = String(tone || '').toLowerCase();
        const map = {
            consultivo: 'consultivo',
            direto: 'direto',
            persuasivo: 'persuasivo',
            amigavel: 'amigável',
            premium: 'premium',
        };
        return map[value] || map.consultivo;
    }

    const api = {
        getDefaultEndpointForProvider,
        getResponseLengthConfig,
        getBusinessToneLabel,
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
    root.window.ChatSuggestions.AIClientConfigHelpers = api;
})();
