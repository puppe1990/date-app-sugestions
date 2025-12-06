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

    const start = () => {
        if (window.badooChatSuggestionsInstance) {
            return;
        }

        const config = window.badooChatSuggestionsConfig || {};
        const messageReader = config.messageReaderConfig
            ? new window.BadooChatSuggestions.MessageReader(config.messageReaderConfig)
            : config.messageReader;

        const controller = new window.BadooChatSuggestions.ChatSuggestionsController({
            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
            inputSelector: config.inputSelector || '#chat-composer-input-message',
            messageReader,
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
                    start();
                }, 1000);
            }
        }
    }).observe(document, { subtree: true, childList: true });
})();
