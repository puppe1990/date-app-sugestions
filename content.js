/**
 * Content Script para extensão Chrome
 * Ponto de entrada que orquestra as sugestões a partir dos módulos separados
 */
(() => {
    'use strict';

    if (window.badooChatSuggestionsInitialized) {
        return;
    }
    window.badooChatSuggestionsInitialized = true;

    const defaultProvider = 'gemini';
    const defaultGeminiModel = 'gemini-2.0-flash-exp';
    const defaultOpenRouterModel = 'google/gemini-2.0-flash-exp:free';

    const loadConfig = () => {
        return new Promise(resolve => {
            if (!chrome?.storage?.local) {
                resolve({});
                return;
            }
            chrome.storage.local.get([
                'llmProvider',
                'openRouterModel',
                'openRouterApiKey',
                'openRouterProfile',
                'geminiApiKey',
                'geminiModel'
            ], (result) => {
                resolve({
                    llmProvider: result.llmProvider || defaultProvider,
                    openRouterModel: result.openRouterModel || defaultOpenRouterModel,
                    openRouterApiKey: result.openRouterApiKey,
                    openRouterProfile: result.openRouterProfile,
                    geminiApiKey: result.geminiApiKey,
                    geminiModel: result.geminiModel || defaultGeminiModel
                });
            });
        });
    };

    const loadEnvKey = async () => {
        try {
            const envUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL('.env') : null;
            if (!envUrl) return { openrouterKey: null, geminiKey: null };
            const res = await fetch(envUrl);
            if (!res.ok) return { openrouterKey: null, geminiKey: null };
            const text = await res.text();
            const orMatch = text.match(/OPENROUTER_API_KEY\s*=\s*(.+)/i);
            const gemMatch = text.match(/GEMINI_API_KEY\s*=\s*(.+)/i);
            return {
                openrouterKey: orMatch ? orMatch[1].trim() : null,
                geminiKey: gemMatch ? gemMatch[1].trim() : null
            };
        } catch (e) {
            return { openrouterKey: null, geminiKey: null };
        }
    };

    const start = async () => {
        if (window.badooChatSuggestionsInstance) {
            return;
        }

        const stored = await loadConfig();
        const envKeys = await loadEnvKey();
        const config = {
            ...stored,
            ...(window.badooChatSuggestionsConfig || {})
        };
        const messageReader = config.messageReaderConfig
            ? new window.BadooChatSuggestions.MessageReader(config.messageReaderConfig)
            : config.messageReader;
        const provider = config.llmProvider || defaultProvider;
        const apiKey = provider === 'gemini'
            ? (config.geminiApiKey || envKeys.geminiKey)
            : (config.openRouterApiKey || envKeys.openrouterKey || (typeof window !== 'undefined' && window.OPENROUTER_API_KEY));
        const model = provider === 'gemini'
            ? (config.geminiModel || defaultGeminiModel)
            : (config.openRouterModel || defaultOpenRouterModel);

        const aiClientConfig = {
            provider,
            apiKey,
            model,
            profile: config.openRouterProfile
        };

        console.info('[Badoo Chat Suggestions] Iniciando content script', {
            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
            inputSelector: config.inputSelector || '#chat-composer-input-message'
        });

        const controller = new window.BadooChatSuggestions.ChatSuggestionsController({
            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
            inputSelector: config.inputSelector || '#chat-composer-input-message',
            messageReader,
            aiClientConfig,
            debug: window.badooChatSuggestionsDebug
        });

        window.badooChatSuggestionsInstance = controller;
        controller.init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            if (url.includes('/messages/')) {
                setTimeout(() => {
                    if (window.badooChatSuggestionsInstance) {
                        if (typeof window.badooChatSuggestionsInstance.cleanup === 'function') {
                            window.badooChatSuggestionsInstance.cleanup();
                        }
                        window.badooChatSuggestionsInstance = null;
                    }
                    window.badooChatSuggestionsInitialized = false;
                    console.info('[Badoo Chat Suggestions] URL de mensagens detectada, reinicializando...');
                    start();
                }, 1000);
            }
        }
    }).observe(document, { subtree: true, childList: true });
})();
