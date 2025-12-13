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
        if (host === 'web.whatsapp.com') return 'whatsapp';
        return 'badoo';
    };

    const isMessagesUrlForPlatform = (platform, url) => {
        try {
            const parsed = new URL(url);
            const path = parsed.pathname || '';
            if (platform === 'tinder') return path.startsWith('/app/messages');
            if (platform === 'whatsapp') return true;
            return path.startsWith('/messages');
        } catch (e) {
            return url.includes('/messages/');
        }
    };

	    const PLATFORM_DEFAULTS = {
	        whatsapp: {
	            chatContainerSelector: '#main',
	            inputSelector: '#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.xjbqb8w.x1wiwyrm.xquzyny.xvc5jky.x11t971q.xnpuxes.copyable-area > div > span > div > div > div [contenteditable=\"true\"], #main footer [contenteditable=\"true\"][data-lexical-editor=\"true\"], #main footer [role=\"textbox\"][contenteditable=\"true\"], #main footer [contenteditable=\"true\"], #main footer [contenteditable=\"true\"][data-tab], #main footer [role=\"textbox\"]',
	            uiPlacement: 'overlay',
	            otherPersonNameSelector: '#pane-side [role="row"][aria-selected="true"] span[title], #pane-side [aria-selected="true"] span[title], #main header span[title], header span[title], #pane-side > div:nth-child(2) > div > div > div:nth-child(1) > div > div > div > div._ak8l._ap1_ > div._ak8o > div._ak8q > div > div > span',
	            profileContainerSelector: '#main header',
	            messageReaderConfig: {
	                messageSelector: 'div.message-in, div.message-out',
	                textSelector: 'span.selectable-text.copyable-text span',
	                senderSelector: null,
	                allowTextContentFallback: true,
	                nodeFilter: (node) => {
	                    try {
	                        return node && typeof node.getClientRects === 'function' && node.getClientRects().length > 0;
	                    } catch (e) {
	                        return true;
	                    }
	                },
	                textResolver: (node) => {
	                    try {
	                        const textEl = node.querySelector('span.selectable-text.copyable-text span');
	                        if (textEl && textEl.textContent) return textEl.textContent;
	                    } catch (e) {
	                        // Ignora
	                    }
	                    return '';
	                },
	                directionResolver: (node) => {
	                    try {
	                        const cls = (node && node.classList) ? node.classList : null;
	                        if (cls && cls.contains('message-out')) return 'out';
	                        if (cls && cls.contains('message-in')) return 'in';
	                        return '';
	                    } catch (e) {
	                        return '';
	                    }
	                }
	            }
	        },
	        tinder: {
	            chatContainerSelector: '[id^="SC.chat_"], [role="log"], main [role="log"], [data-testid="chatMessageList"]',
	            inputSelector: 'textarea, [role="textbox"], [contenteditable="true"], [data-testid="chatInput"]',
	            uiPlacement: 'overlay',
	            profileContainerSelector: '#main-content > div.H\\(100\\%\\) > div > div > div > div > div.BdStart.Bdc\\(\\$c-ds-divider-primary\\).Fxg\\(0\\).Fxs\\(0\\).Fxb\\(1\\/3\\).Miw\\(325px\\).Maw\\(640px\\).D\\(n\\)--m > div > div > div',
	            otherPersonNameSelector: '#main-content > div.H\\(100\\%\\) > div > div > div > div > div.BdStart.Bdc\\(\\$c-ds-divider-primary\\).Fxg\\(0\\).Fxs\\(0\\).Fxb\\(1\\/3\\).Miw\\(325px\\).Maw\\(640px\\).D\\(n\\)--m > div > div > div > div.D\\(f\\).Ai\\(c\\).M\\(16px\\) > div > div.Ov\\(h\\).Ws\\(nw\\).Ell > h1 > span.Pend\\(8px\\)',
	            messageReaderConfig: {
	                messageSelector: '[role="article"]',
	                textSelector: 'span.text',
	                senderSelector: null,
	                allowTextContentFallback: true,
	                textResolver: (node) => {
	                    try {
	                        const textEl = node.querySelector('span.text');
	                        if (textEl && textEl.textContent) {
	                            return textEl.textContent;
	                        }
	                    } catch (e) {
	                        // Ignora
	                    }
	                    return '';
	                },
	                directionResolver: (node) => {
	                    try {
	                        const cls = (node && node.className) ? String(node.className) : '';
	                        if (cls.includes('Ta(e)')) return 'out';
	                        if (cls.includes('Ta(start)')) return 'in';
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
	            profileContainerSelector: config.profileContainerSelector,
	            otherPersonNameSelector: config.otherPersonNameSelector,
	            platform,
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
