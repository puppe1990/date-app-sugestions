/**
 * Content Script para extensão Chrome
 * Ponto de entrada que orquestra as sugestões a partir dos módulos separados
 */
(() => {
    'use strict';

    window.chatSuggestionsInitialized = window.chatSuggestionsInitialized || window.badooChatSuggestionsInitialized;
    if (window.chatSuggestionsInitialized) {
        return;
    }
    window.chatSuggestionsInitialized = true;
    window.badooChatSuggestionsInitialized = true;

    const defaultProvider = 'gemini';
    const defaultGeminiModel = 'gemini-2.0-flash-exp';
    const defaultOpenRouterModel = 'google/gemini-2.0-flash-exp:free';

    const detectChatPlatform = () => {
        const host = (location.hostname || '').toLowerCase();
        if (host === 'tinder.com' || host.endsWith('.tinder.com')) return 'tinder';
        return 'badoo';
    };

    const isMessagesUrlForPlatform = (platform, url) => {
        try {
            const parsed = new URL(url);
            const path = parsed.pathname || '';
            if (platform === 'tinder') return path.startsWith('/app/messages');
            return path.startsWith('/messages');
        } catch (e) {
            return url.includes('/messages/');
        }
    };

	    const PLATFORM_DEFAULTS = {
	        tinder: {
	            chatContainerSelector: '[id^="SC.chat_"], [role="log"], main [role="log"], [data-testid="chatMessageList"]',
	            inputSelector: 'textarea, [role="textbox"], [contenteditable="true"], [data-testid="chatInput"]',
	            uiPlacement: 'overlay',
	            messageReaderConfig: {
	                messageSelector: '[data-testid="message"], [role="listitem"]',
	                textSelector: '[data-testid="messageText"], span',
	                senderSelector: null,
                allowTextContentFallback: true,
                directionResolver: (node) => {
                    try {
                        const rect = node.getBoundingClientRect();
                        const mid = rect.left + rect.width / 2;
                        return mid > (window.innerWidth / 2) ? 'out' : 'in';
                    } catch (e) {
                        return '';
                    }
                }
            }
        },
	        badoo: {
	            chatContainerSelector: '.csms-chat-messages',
	            inputSelector: '#chat-composer-input-message',
	            uiPlacement: 'inline',
	            messageReaderConfig: null
	        }
	    };

    const getPlatformDefaults = (platform) => {
        return PLATFORM_DEFAULTS[platform] || PLATFORM_DEFAULTS.badoo;
    };

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
        window.chatSuggestionsInstance = window.chatSuggestionsInstance || window.badooChatSuggestionsInstance;
        if (window.chatSuggestionsInstance) {
            return;
        }

        const platform = detectChatPlatform();
        const platformDefaults = getPlatformDefaults(platform);

        const stored = await loadConfig();
        const envKeys = await loadEnvKey();
        const config = {
            ...stored,
            ...platformDefaults,
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

        console.info('[Chat Suggestions] Iniciando content script', {
            platform,
            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
            inputSelector: config.inputSelector || '#chat-composer-input-message'
        });

	        const controller = new window.BadooChatSuggestions.ChatSuggestionsController({
	            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
	            inputSelector: config.inputSelector || '#chat-composer-input-message',
	            messageSelector: config.messageReaderConfig?.messageSelector,
	            uiPlacement: config.uiPlacement,
	            messageReader,
	            aiClientConfig,
	            debug: window.badooChatSuggestionsDebug
	        });

        window.chatSuggestionsInstance = controller;
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
            const platform = detectChatPlatform();
            if (isMessagesUrlForPlatform(platform, url)) {
                setTimeout(() => {
                    window.chatSuggestionsInstance = window.chatSuggestionsInstance || window.badooChatSuggestionsInstance;
                    if (window.chatSuggestionsInstance) {
                        if (typeof window.chatSuggestionsInstance.cleanup === 'function') {
                            window.chatSuggestionsInstance.cleanup();
                        }
                        window.chatSuggestionsInstance = null;
                        window.badooChatSuggestionsInstance = null;
                    }
                    window.chatSuggestionsInitialized = false;
                    window.badooChatSuggestionsInitialized = false;
                    console.info('[Chat Suggestions] URL de mensagens detectada, reinicializando...');
                    start();
                }, 1000);
            }
        }
    }).observe(document, { subtree: true, childList: true });
})();
