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

    const defaultModel = 'openai/gpt-oss-120b:free';

    const loadConfig = () => {
        return new Promise(resolve => {
            if (!chrome?.storage?.local) {
                resolve({});
                return;
            }
            chrome.storage.local.get(['openRouterModel'], (result) => {
                resolve({
                    openRouterModel: result.openRouterModel || defaultModel
                });
            });
        });
    };

    const start = async () => {
        if (window.badooChatSuggestionsInstance) {
            return;
        }

        const stored = await loadConfig();
        const config = {
            ...stored,
            ...(window.badooChatSuggestionsConfig || {})
        };
        const messageReader = config.messageReaderConfig
            ? new window.BadooChatSuggestions.MessageReader(config.messageReaderConfig)
            : config.messageReader;
        const aiClientConfig = config.aiClientConfig || {
            apiKey: config.openRouterApiKey || (typeof window !== 'undefined' && window.OPENROUTER_API_KEY),
            model: config.openRouterModel || 'openai/gpt-4o'
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
