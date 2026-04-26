(() => {
    function setAIResponseLength(responseLength) {
        const next = normalizeAIResponseLength(responseLength);

        this.aiClientConfig = this.aiClientConfig || {};
        this.aiClientConfig.responseLength = next;

        if (this.aiClient) {
            this.aiClient.responseLength = next;
        }

        persistAIResponseLength(next);
        showAIResponseLengthToast(this.ui, next);
    }

    function normalizeAIResponseLength(responseLength) {
        const value = String(responseLength || '').toLowerCase();
        return value === 'medium' || value === 'long' ? value : 'short';
    }

    function persistAIResponseLength(responseLength) {
        try {
            window.badooChatSuggestionsConfig =
                window.badooChatSuggestionsConfig || {};
            window.badooChatSuggestionsConfig.aiResponseLength = responseLength;
        } catch (error) {
            // Ignora
        }

        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.set({ aiResponseLength: responseLength });
            } else {
                localStorage.setItem('bcs:aiResponseLength', responseLength);
            }
        } catch (error) {
            // Ignora
        }
    }

    function showAIResponseLengthToast(ui, responseLength) {
        if (!ui || typeof ui.showToast !== 'function') return;

        try {
            const labels = {
                short: 'Curta',
                medium: 'Média',
                long: 'Longa',
            };
            ui.showToast(`Respostas: ${labels[responseLength] || 'Curta'}`);
        } catch (error) {
            // Ignora
        }
    }

    function getCurrentHost() {
        const configHelpers = window.ChatSuggestions.ChatConfigHelpers || {};
        return configHelpers.getCurrentHost(location.href);
    }

    function attachConfigListener() {
        if (!chrome?.storage?.onChanged || this.boundStorageChange) return;

        this.boundStorageChange = (changes, areaName) => {
            if (areaName !== 'local') return;
            const configHelpers =
                window.ChatSuggestions.ChatConfigHelpers || {};
            if (!configHelpers.shouldRefreshBusinessMode(changes)) return;
            this.refreshBusinessModeFromStorage();
        };

        chrome.storage.onChanged.addListener(this.boundStorageChange);
    }

    function refreshBusinessModeFromStorage() {
        if (!chrome?.storage?.local) return;

        chrome.storage.local.get(
            [
                'businessModeEnabled',
                'businessModeByHost',
                'businessContext',
                'businessTone',
                'openRouterProfileCasual',
                'openRouterProfileBusiness',
            ],
            (result) => {
                const configHelpers =
                    window.ChatSuggestions.ChatConfigHelpers || {};
                this.updateBusinessModeConfig(
                    configHelpers.buildBusinessModeConfig({
                        result,
                        host: this.getCurrentHost(),
                    }),
                );
            },
        );
    }

    function updateBusinessModeConfig({
        businessModeEnabled,
        businessContext,
        businessTone,
        profileCasual,
        profileBusiness,
    }) {
        const mode = businessModeEnabled ? 'business' : 'casual';
        const profile = mode === 'business' ? profileBusiness : profileCasual;
        this.aiClientConfig = this.aiClientConfig || {};
        this.aiClientConfig.businessModeEnabled = Boolean(businessModeEnabled);
        this.aiClientConfig.businessContext = businessContext || '';
        this.aiClientConfig.businessTone = businessTone || 'consultivo';
        this.aiClientConfig.profile = profile || '';

        if (this.aiClient) {
            this.aiClient.businessModeEnabled = Boolean(businessModeEnabled);
            this.aiClient.businessContext = businessContext || '';
            this.aiClient.businessTone = businessTone || 'consultivo';
            this.aiClient.profile = profile || '';
        }

        if (
            this.ui &&
            typeof this.ui.applyConversationModeTheme === 'function'
        ) {
            this.ui.applyConversationModeTheme(mode);
        }
    }

    const api = {
        attachConfigListener,
        getCurrentHost,
        refreshBusinessModeFromStorage,
        setAIResponseLength,
        updateBusinessModeConfig,
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
    root.window.ChatSuggestions.ChatControllerAIConfigHelpers = api;
})();
