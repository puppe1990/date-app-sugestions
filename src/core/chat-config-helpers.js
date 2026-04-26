(() => {
    function getCurrentHost(href) {
        try {
            return new URL(href || '').hostname.toLowerCase();
        } catch (error) {
            return '';
        }
    }

    function shouldRefreshBusinessMode(changes) {
        const watched = new Set([
            'businessModeEnabled',
            'businessModeByHost',
            'businessContext',
            'businessTone',
            'openRouterProfileCasual',
            'openRouterProfileBusiness',
        ]);
        return Object.keys(changes || {}).some((key) => watched.has(key));
    }

    function buildBusinessModeConfig({ result, host }) {
        const hostMode = host
            ? (result.businessModeByHost || {})[host]
            : undefined;
        const businessModeEnabled =
            typeof hostMode === 'boolean'
                ? hostMode
                : Boolean(result.businessModeEnabled);

        return {
            businessModeEnabled,
            businessContext: result.businessContext || '',
            businessTone: result.businessTone || 'consultivo',
            profileCasual: result.openRouterProfileCasual || '',
            profileBusiness: result.openRouterProfileBusiness || '',
        };
    }

    const api = {
        getCurrentHost,
        shouldRefreshBusinessMode,
        buildBusinessModeConfig,
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
    root.window.ChatSuggestions.ChatConfigHelpers = api;
})();
