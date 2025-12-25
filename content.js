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
        if (host === 'www.instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
        return 'badoo';
    };

    const getCurrentHost = () => {
        try {
            return (location.hostname || '').toLowerCase();
        } catch (e) {
            return '';
        }
    };

    const isDebugEnabled = () => {
        try {
            const domFlag = document.documentElement?.dataset?.bcsDebug;
            return Boolean(window.badooChatSuggestionsDebug || domFlag === '1' || domFlag === 'true');
        } catch (e) {
            return Boolean(window.badooChatSuggestionsDebug);
        }
    };

    const initDebugObserver = () => {
        try {
            const root = document.documentElement;
            if (!root || root.__bcsDebugObserverAttached) return;
            root.__bcsDebugObserverAttached = true;

            const updateFlag = () => {
                const debug = isDebugEnabled();
                window.badooChatSuggestionsDebug = debug;
                root.dataset.bcsDebugActive = debug ? '1' : '0';
            };

            updateFlag();
            new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-bcs-debug') {
                        updateFlag();
                        break;
                    }
                }
            }).observe(root, { attributes: true });
        } catch (e) {
            // Ignora
        }
    };

    const isMessagesUrlForPlatform = (platform, url) => {
        try {
            const parsed = new URL(url);
            const path = parsed.pathname || '';
            if (platform === 'tinder') return path.startsWith('/app/messages');
            if (platform === 'whatsapp') return true;
            if (platform === 'instagram') return path.startsWith('/direct/');
            return path.startsWith('/messages');
        } catch (e) {
            return url.includes('/messages/') || url.includes('/direct/');
        }
    };

    const waitForTinderMessageList = ({ timeoutMs = 10000, intervalMs = 300 } = {}) => {
        const startAt = Date.now();
        return new Promise(resolve => {
            const check = () => {
                const list = document.querySelector('.messageList');
                if (list) {
                    resolve(list);
                    return;
                }
                if (Date.now() - startAt >= timeoutMs) {
                    resolve(null);
                    return;
                }
                setTimeout(check, intervalMs);
            };
            check();
        });
    };

    const initTinderRealtimeSearch = async () => {
        console.info('[Chat Suggestions] Tinder search init start', {
            href: location.href
        });
        if (document.getElementById('tinder-search-input')) return;

        const list = await waitForTinderMessageList();
        if (!list) {
            console.warn('[Chat Suggestions] Lista de mensagens nao encontrada apos aguardar.', {
                selectorTried: '.messageList'
            });
            return;
        }

        console.info('[Chat Suggestions] Lista de mensagens encontrada', {
            tag: list.tagName,
            className: list.className
        });

        const input = document.createElement('input');
        input.id = 'tinder-search-input';
        input.type = 'text';
        input.placeholder = 'Filtrar conversas pelo nome...';
        input.autocomplete = 'off';
        input.style.cssText = `
            width: 100%;
            box-sizing: border-box;
            padding: 8px 12px;
            margin: 8px 0 4px;
            border-radius: 999px;
            border: 1px solid #555;
            background: #111;
            color: #fff;
            outline: none;
            font-size: 14px;
        `;

        const parent = list.parentElement;
        if (!parent) {
            console.warn('[Chat Suggestions] Parent da lista nao encontrado.');
            return;
        }
        parent.insertBefore(input, list);
        console.info('[Chat Suggestions] Input de busca inserido');

        function filterList(value) {
            const termo = value.toLowerCase();
            const items = document.querySelectorAll('.messageListItem');
            console.info('[Chat Suggestions] Filtrando lista', {
                termo,
                items: items.length
            });

            items.forEach(item => {
                const nameEl = item.querySelector('.messageListItem__name');
                const name = (nameEl?.textContent || '').trim().toLowerCase();

                item.style.display = name.includes(termo) ? '' : 'none';
            });
        }

        input.addEventListener('input', (e) => {
            filterList(e.target.value);
        });
    };

    const getPlatformDefaults = (platform) => {
        const registry = window.ChatSuggestions?.PlatformRegistry;
        const defaults = registry?.getDefaults?.(platform);
        if (defaults) return defaults;
        return registry?.getDefaults?.('badoo') || {};
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
                'openRouterProfileCasual',
                'openRouterProfileBusiness',
                'geminiApiKey',
                'geminiModel',
                'uiPlacementOverride',
                'aiResponseLength',
                'businessModeEnabled',
                'businessModeByHost',
                'businessContext',
                'businessTone'
            ], (result) => {
                const host = getCurrentHost();
                const hostMode = host ? (result.businessModeByHost || {})[host] : undefined;
                const businessModeEnabled = typeof hostMode === 'boolean'
                    ? hostMode
                    : Boolean(result.businessModeEnabled);
                resolve({
                    llmProvider: result.llmProvider || defaultProvider,
                    openRouterModel: result.openRouterModel || defaultOpenRouterModel,
                    openRouterApiKey: result.openRouterApiKey,
                    openRouterProfile: result.openRouterProfile,
                    openRouterProfileCasual: result.openRouterProfileCasual || result.openRouterProfile || '',
                    openRouterProfileBusiness: result.openRouterProfileBusiness || '',
                    geminiApiKey: result.geminiApiKey,
                    geminiModel: result.geminiModel || defaultGeminiModel,
                    uiPlacementOverride: result.uiPlacementOverride || 'floating',
                    aiResponseLength: result.aiResponseLength || 'short',
                    businessModeEnabled,
                    businessContext: result.businessContext || '',
                    businessTone: result.businessTone || 'consultivo'
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

        initDebugObserver();
        const debug = isDebugEnabled();
        window.badooChatSuggestionsDebug = debug;

        const platform = detectChatPlatform();
        console.info('[Chat Suggestions] Platform detectada', {
            platform,
            href: location.href
        });
        const platformDefaults = getPlatformDefaults(platform);

        const stored = await loadConfig();
        const envKeys = await loadEnvKey();
        const config = {
            ...stored,
            ...platformDefaults,
            ...(window.ChatSuggestionsConfig || window.badooChatSuggestionsConfig || {})
        };
        let messageReader = null;
        if (typeof config.messageReaderFactory === 'function') {
            messageReader = config.messageReaderFactory();
        }
        if (!messageReader) {
            messageReader = config.messageReaderConfig
                ? new window.ChatSuggestions.MessageReader(config.messageReaderConfig)
                : config.messageReader;
        }
        const provider = config.llmProvider || defaultProvider;
        const apiKey = provider === 'gemini'
            ? (config.geminiApiKey || envKeys.geminiKey)
            : (config.openRouterApiKey || envKeys.openrouterKey || (typeof window !== 'undefined' && window.OPENROUTER_API_KEY));
        const model = provider === 'gemini'
            ? (config.geminiModel || defaultGeminiModel)
            : (config.openRouterModel || defaultOpenRouterModel);

        const profileByMode = config.businessModeEnabled
            ? config.openRouterProfileBusiness
            : config.openRouterProfileCasual;
        const aiClientConfig = {
            provider,
            apiKey,
            model,
            profile: profileByMode || '',
            responseLength: config.aiResponseLength || 'short',
            businessModeEnabled: Boolean(config.businessModeEnabled),
            businessContext: config.businessContext || '',
            businessTone: config.businessTone || 'consultivo'
        };

        let effectiveUiPlacement = config.uiPlacement;
        if (config.uiPlacementOverride && config.uiPlacementOverride !== 'auto') {
            effectiveUiPlacement = config.uiPlacementOverride;
        }

        console.info('[Chat Suggestions] Iniciando content script', {
            platform,
            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
            inputSelector: config.inputSelector || '#chat-composer-input-message'
        });

	        const controller = new window.ChatSuggestions.ChatSuggestionsController({
	            chatContainerSelector: config.chatContainerSelector || '.csms-chat-messages',
	            inputSelector: config.inputSelector || '#chat-composer-input-message',
	            messageSelector: config.messageReaderConfig?.messageSelector,
	            uiPlacement: effectiveUiPlacement,
	            profileContainerSelector: config.profileContainerSelector,
	            otherPersonNameSelector: config.otherPersonNameSelector,
	            platform,
	            messageReader,
	            aiClientConfig,
	            debug
	        });

        window.chatSuggestionsInstance = controller;
        window.badooChatSuggestionsInstance = controller;
        controller.init();
        if (platform === 'tinder' && isMessagesUrlForPlatform(platform, location.href)) {
            setTimeout(() => {
                console.info('[Chat Suggestions] Tentando iniciar busca Tinder apos init');
                initTinderRealtimeSearch();
            }, 1000);
        }
    };

    const attachRuntimeListeners = () => {
        if (!chrome?.runtime?.onMessage) return;
        chrome.runtime.onMessage.addListener((message) => {
            if (!message || message.type !== 'bcs:modeUpdated') return;
            const payload = message.payload || {};
            const instance = window.chatSuggestionsInstance || window.badooChatSuggestionsInstance;
            if (instance && typeof instance.updateBusinessModeConfig === 'function') {
                instance.updateBusinessModeConfig({
                    businessModeEnabled: Boolean(payload.businessModeEnabled),
                    businessContext: payload.businessContext || '',
                    businessTone: payload.businessTone || 'consultivo',
                    profileCasual: payload.profileCasual || '',
                    profileBusiness: payload.profileBusiness || ''
                });
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            attachRuntimeListeners();
            start();
        });
    } else {
        attachRuntimeListeners();
        start();
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            const platform = detectChatPlatform();
            console.info('[Chat Suggestions] URL mudou', {
                platform,
                url
            });
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
                    if (platform === 'tinder') {
                        initTinderRealtimeSearch();
                    }
                }, 1000);
            }
        }
    }).observe(document, { subtree: true, childList: true });
})();
