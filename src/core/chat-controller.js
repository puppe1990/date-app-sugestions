(() => {
class ChatSuggestionsController {
        constructor({
            chatContainerSelector = '.csms-chat-messages',
            inputSelector = '#chat-composer-input-message',
            messageSelector = null,
            uiPlacement = 'inline',
            profileContainerSelector = null,
            otherPersonNameSelector = null,
            platform = null,
            messageReader = null,
            aiClient = null,
            aiClientConfig = {},
            debug = false
        } = {}) {
            this.chatContainerSelector = chatContainerSelector;
            this.inputSelector = inputSelector;
            this.debug = debug;
            this.uiPlacement = uiPlacement;
            this.profileContainerSelector = profileContainerSelector;
            this.otherPersonNameSelector = otherPersonNameSelector;
            this.platform = platform;
            this.messageReader = messageReader ||
                window.BadooChatSuggestions.createDefaultMessageReader?.() ||
                window.BadooChatSuggestions.createBadooMessageReader();
            this.messageSelector = messageSelector ||
                (this.messageReader && this.messageReader.config && this.messageReader.config.messageSelector) ||
                '[data-qa="chat-message"]';
            this.aiClient = aiClient;
            this.aiClientConfig = aiClientConfig || {};

            this.chatContainer = null;
            this.contextExtractor = null;
            this.suggestionEngine = null;
            this.ui = null;

            this.lastMessageCount = 0;
            this.updateTimeout = null;
            this.messageCheckInterval = null;
            this.periodicUpdateInterval = null;
            this.chatObserver = null;
            this.platformObserver = null;
            this.initRetryTimeout = null;
            this.aiLoading = false;
            this.profilePortalObserver = null;
            this.profileClickHandler = null;
            this.cachedOtherPersonProfileText = '';
            this.cachedOtherPersonProfileUpdatedAt = 0;
            this.cachedOtherPersonProfileName = '';
            this.contextStore = null;
            this.currentContactKey = '';
            this.currentContactName = '';
            this.currentContactContextText = '';
        }

        init() {
            this.chatContainer = document.querySelector(this.chatContainerSelector);

            if (!this.chatContainer) {
                if (this.debug) {
                    console.warn('[Chat Suggestions] Container de chat não encontrado, tentando novamente...');
                }

                if (!this.initRetryTimeout) {
                    this.initRetryTimeout = setTimeout(() => {
                        this.initRetryTimeout = null;
                        this.init();
                    }, 1000);
                }
                return;
            }

            this.info('Container de chat encontrado', { selector: this.chatContainerSelector });

            if (this.debug) {
                console.log('[Chat Suggestions] Inicializando...');
            }

            this.contextExtractor = new window.BadooChatSuggestions.ContextExtractor({
                debug: this.debug,
                messageReader: this.messageReader
            });
            this.contextStore = new window.BadooChatSuggestions.ContextStore({ debug: this.debug });
            this.aiClient = this.aiClient || this.createAIClient();
            this.suggestionEngine = new window.BadooChatSuggestions.SuggestionEngine({ debug: this.debug });
            this.ui = new window.BadooChatSuggestions.SuggestionsUI({
                inputSelector: this.inputSelector,
                placement: this.uiPlacement,
                responseLength: this.aiClientConfig?.responseLength || 'short',
                onAiGenerate: (opts) => this.openAIPromptModal(opts),
                onAiCopyPrompt: (opts) => this.buildAIPrompts(opts),
                onResponseLengthChange: ({ responseLength }) => this.setAIResponseLength(responseLength),
                getContactContextMeta: () => this.getContactContextMeta(),
                onContactContextSave: ({ contextText }) => this.saveContactContext(contextText),
                onContactContextClear: () => this.clearContactContext()
            });

            const mounted = this.ui.mount();
            this.info('Container de sugestões montado', { mounted, inputSelector: this.inputSelector });

            this.refreshContactContext({ force: true });
            this.lastMessageCount = 0;
            this.updateSuggestions();

            this.setupObservers();
            this.setupPlatformObservers();
            this.setupProfileCapture();

            if (this.debug) {
                console.log('[Chat Suggestions] Inicializado com sucesso!');
            }
        }

        setupProfileCapture() {
            if (this.profilePortalObserver || this.profileClickHandler) return;
            if (this.platform && this.platform !== 'badoo') return;

            const triggerSelectors = [
                '#page-container .mini-profile__user-info',
                '.mini-profile__user-info',
                '[data-qa="mini-profile-user-info"]',
                '[data-qa="mini-profile"] .mini-profile__user-info'
            ];

            this.profileClickHandler = (event) => {
                try {
                    const target = event && event.target;
                    if (!target || !target.closest) return;
                    const trigger = triggerSelectors.map(sel => target.closest(sel)).find(Boolean);
                    if (!trigger) return;
                    if (this.debug) {
                        console.info('[Chat Suggestions][Badoo] Clique detectado para abrir perfil; iniciando monitoramento do portal');
                    }
                    this.waitForBadooProfilePortalAndCache({ timeoutMs: 7000 });
                } catch (e) {
                    // Ignora
                }
            };

            document.addEventListener('click', this.profileClickHandler, true);
            if (this.debug) {
                console.info('[Chat Suggestions][Badoo] Listener de clique para capturar perfil registrado');
            }
        }

        waitForBadooProfilePortalAndCache({ timeoutMs = 7000 } = {}) {
            const tryCapture = () => {
                const text = this.extractBadooProfileTextFromPortal();
                if (text) {
                    const changed = text !== this.cachedOtherPersonProfileText;
                    this.cachedOtherPersonProfileText = text;
                    this.cachedOtherPersonProfileUpdatedAt = Date.now();
                    const name = this.extractOtherPersonName();
                    if (name) this.cachedOtherPersonProfileName = name;
                    if (changed) {
                        this.info('Perfil atualizado (Badoo)', { chars: text.length });
                    }
                    return true;
                }
                return false;
            };

            if (tryCapture()) return;

            if (this.profilePortalObserver) {
                if (this.debug) {
                    console.info('[Chat Suggestions][Badoo] Observer do portal já ativo; aguardando atualização do perfil');
                }
                return;
            }

            const startedAt = Date.now();
            let lastChangeAt = startedAt;
            if (this.debug) {
                console.info('[Chat Suggestions][Badoo] Iniciando observer do portal do perfil', { timeoutMs });
            }
            this.profilePortalObserver = new MutationObserver(() => {
                const before = this.cachedOtherPersonProfileText;
                const ok = tryCapture();
                if (ok && this.cachedOtherPersonProfileText && this.cachedOtherPersonProfileText !== before) {
                    lastChangeAt = Date.now();
                }

                const elapsed = Date.now() - startedAt;
                const settledFor = Date.now() - lastChangeAt;
                const hasBio = (this.cachedOtherPersonProfileText || '').includes('Sobre mim:');

                if (elapsed > timeoutMs || (this.cachedOtherPersonProfileText && settledFor > 800 && (hasBio || elapsed > 1500))) {
                    if (this.debug) {
                        console.info('[Chat Suggestions][Badoo] Encerrando observer do portal do perfil', {
                            elapsedMs: elapsed,
                            settledForMs: settledFor,
                            hasBio,
                            cachedChars: this.cachedOtherPersonProfileText ? this.cachedOtherPersonProfileText.length : 0
                        });
                    }
                    this.profilePortalObserver.disconnect();
                    this.profilePortalObserver = null;
                }
            });

            const root = document.body || document.documentElement;
            if (!root) return;
            this.profilePortalObserver.observe(root, { childList: true, subtree: true });
        }

        extractBadooProfileTextFromPortal() {
            const portal = document.querySelector('[data-qa="profile-portal-content-container_wrapper"], .profile-portal-container');
            if (this.debug) {
                console.info('[Chat Suggestions][Badoo] Portal do perfil', { found: Boolean(portal) });
            }
            if (!portal) return '';

            const extractBlockByTitle = (titleText) => {
                try {
                    const normalized = String(titleText || '').toLowerCase();
                    const headers = Array.from(portal.querySelectorAll('.csms-view-profile-block__header-title, .csms-view-profile-block__header-title *'));
                    const header = headers.find(el => {
                        const txt = (el && (el.textContent || el.innerText)) ? (el.textContent || el.innerText).trim().toLowerCase() : '';
                        return txt && txt.includes(normalized);
                    });
                    if (!header) return null;
                    return header.closest('.csms-view-profile-block');
                } catch (e) {
                    return null;
                }
            };

            const pickText = (selector) => {
                try {
                    const el = portal.querySelector(selector);
                    const txt = (el && (el.textContent || el.innerText)) ? (el.textContent || el.innerText).trim() : '';
                    return txt.replace(/\s+/g, ' ').trim();
                } catch (e) {
                    return '';
                }
            };

            const name = pickText('[data-qa="profile-info__name"]');
            const age = pickText('[data-qa="profile-info__age"]');
            const aboutMe = (() => {
                try {
                    const section = portal.querySelector('.user-section[data-qa="about-me"]') || extractBlockByTitle('Sobre mim');
                    if (!section) return '';
                    const content = section.querySelector('.csms-view-profile-block__content');
                    const txt = (content && (content.textContent || content.innerText)) ? (content.textContent || content.innerText).trim() : '';
                    return txt.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
                } catch (e) {
                    return '';
                }
            })();

            const location = (() => {
                try {
                    const section = portal.querySelector('.user-section[data-qa="location"]') || extractBlockByTitle('Localização');
                    if (!section) return '';
                    const el = section.querySelector('.csms-view-profile-block__header-text');
                    const txt = (el && (el.textContent || el.innerText)) ? (el.textContent || el.innerText).trim() : '';
                    return txt.replace(/\s+/g, ' ').trim();
                } catch (e) {
                    return '';
                }
            })();

            const infoBadges = (() => {
                try {
                    const section = portal.querySelector('.user-section[data-qa="about-me-badges"]') || extractBlockByTitle('Informações');
                    if (!section) return [];
                    const badges = Array.from(section.querySelectorAll('.profile-badges__item .csms-badge__text'));
                    return badges.map(b => (b.textContent || b.innerText || '').trim()).filter(Boolean);
                } catch (e) {
                    return [];
                }
            })();

            const interests = (() => {
                try {
                    const section = portal.querySelector('.user-section[data-qa="interests"]') || extractBlockByTitle('Interesses');
                    if (!section) return [];
                    const badges = Array.from(section.querySelectorAll('.profile-badges__item [data-qa=\"badge\"] .csms-badge__text'));
                    return badges.map(b => (b.textContent || b.innerText || '').trim()).filter(Boolean);
                } catch (e) {
                    return [];
                }
            })();

            const questions = (() => {
                try {
                    const sections = Array.from(portal.querySelectorAll('.user-section[data-qa^="profile-question-"]'));
                    return sections.map(section => {
                        const q = (() => {
                            const qBtn = section.querySelector('[data-qa="overlay-action"]');
                            const raw = (qBtn && (qBtn.textContent || qBtn.innerText)) ? (qBtn.textContent || qBtn.innerText).trim() : '';
                            return raw.replace(/\s+/g, ' ').trim();
                        })();
                        const a = (() => {
                            const aEl = section.querySelector('.csms-view-profile-block__header-text');
                            const raw = (aEl && (aEl.textContent || aEl.innerText)) ? (aEl.textContent || aEl.innerText).trim() : '';
                            return raw.replace(/\s+/g, ' ').trim();
                        })();
                        if (!q && !a) return null;
                        return { q, a };
                    }).filter(Boolean);
                } catch (e) {
                    return [];
                }
            })();

            const lines = [];
            const title = [name, age ? `${age} anos` : ''].filter(Boolean).join(', ');
            if (title) lines.push(`Perfil: ${title}`);
            if (aboutMe) lines.push(`Sobre mim: ${aboutMe}`);
            if (location) lines.push(`Localização: ${location}`);
            if (infoBadges.length) lines.push(`Informações: ${infoBadges.slice(0, 20).join('; ')}`);
            if (interests.length) lines.push(`Interesses: ${interests.slice(0, 20).join('; ')}`);
            if (questions.length) {
                const qa = questions.slice(0, 10)
                    .map(item => item.a ? `${item.q}: ${item.a}` : item.q)
                    .filter(Boolean)
                    .join(' | ');
                if (qa) lines.push(`Perguntas: ${qa}`);
            }

            const text = lines.join('\n').trim();
            if (!text) return '';
            const MAX = 900;
            return text.length > MAX ? `${text.slice(0, MAX)}…` : text;
        }

        setupPlatformObservers() {
            if (this.platformObserver) return;

            const effectivePlatform = this.platform ||
                ((location.hostname || '').includes('whatsapp.com') ? 'whatsapp' : null);

            if (effectivePlatform !== 'whatsapp') return;

            const pane = document.querySelector('#pane-side');
            if (!pane) return;

            const onConversationChanged = () => {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => {
                    this.handleConversationChanged();
                }, 300);
            };

            this.platformObserver = new MutationObserver((mutations) => {
                let changed = false;
                mutations.forEach(m => {
                    if (m.type === 'attributes' && m.attributeName === 'aria-selected') {
                        const target = m.target;
                        if (target && target.getAttribute && target.getAttribute('aria-selected') === 'true') {
                            changed = true;
                        }
                    }
                    if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
                        changed = true;
                    }
                });
                if (changed) onConversationChanged();
            });

            const list = pane.querySelector('[role="grid"]') || pane;
            this.platformObserver.observe(list, {
                attributes: true,
                attributeFilter: ['aria-selected'],
                childList: true,
                subtree: true
            });
        }

        handleConversationChanged() {
            const current = this.chatContainer;
            const next = document.querySelector(this.chatContainerSelector);
            if (next && next !== current) {
                this.chatContainer = next;
                if (this.chatObserver) {
                    this.chatObserver.disconnect();
                    this.chatObserver = null;
                }
                this.setupObservers();
            }

            this.lastMessageCount = 0;
            this.refreshContactContext({ force: true });
            this.updateSuggestions();
            this.cachedOtherPersonProfileText = '';
            this.cachedOtherPersonProfileUpdatedAt = 0;
            this.cachedOtherPersonProfileName = '';
            this.info('Conversa alterada; sugestões atualizadas');
        }

        setupObservers() {
            const checkForNewMessages = () => {
                if (!this.chatContainer) return;

                const currentMessages = this.chatContainer.querySelectorAll(this.messageSelector);
                const currentCount = currentMessages.length;

                if (currentCount !== this.lastMessageCount) {
                    this.lastMessageCount = currentCount;
                    this.updateSuggestions();
                    if (this.debug) {
                        console.log(`[Chat Suggestions] Nova mensagem detectada! Total: ${currentCount}`);
                    }
                }
            };

            this.chatObserver = new MutationObserver((mutations) => {
                let hasNewMessage = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                if (node.matches && node.matches(this.messageSelector)) {
                                    hasNewMessage = true;
                                } else if (node.querySelector && node.querySelector(this.messageSelector)) {
                                    hasNewMessage = true;
                                }
                            }
                        });
                    }
                });

                if (hasNewMessage) {
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => {
                        this.updateSuggestions();
                        this.lastMessageCount = this.chatContainer.querySelectorAll(this.messageSelector).length;
                        if (this.debug) {
                            console.log('[Chat Suggestions] Sugestões atualizadas devido a nova mensagem');
                        }
                    }, 300);
                } else {
                    checkForNewMessages();
                }
            });

            this.chatObserver.observe(this.chatContainer, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });

            this.messageCheckInterval = setInterval(() => {
                checkForNewMessages();
            }, 1000);

            this.periodicUpdateInterval = setInterval(() => {
                this.updateSuggestions();
            }, 3000);
        }

        updateSuggestions() {
            if (!this.chatContainer || !this.contextExtractor || !this.suggestionEngine || !this.ui) {
                return;
            }

            this.refreshContactContext();
            const context = this.contextExtractor.extract(this.chatContainer);
            const suggestions = this.suggestionEngine.generate(context);
            const safeSuggestions = suggestions.length > 0 ? suggestions : this.suggestionEngine.getDefaultSuggestions();
            if (this.debug && Array.isArray(context?.lastMessages)) {
                const conversationLog = context.lastMessages.map((msg, index) => ({
                    index: index + 1,
                    direction: msg.direction,
                    sender: msg.sender,
                    text: msg.text
                }));
                console.table(conversationLog);
            }
            this.ui.render(safeSuggestions);
            if (this.debug) {
                console.info('[Chat Suggestions] Sugestões atualizadas', {
                    total: safeSuggestions.length,
                    topics: context?.topics || []
                });
            }
            this.lastMessageCount = this.chatContainer.querySelectorAll(this.messageSelector).length;
        }

        normalizeContactKey(value) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            const safe = raw.replace(/[^a-zA-Z0-9:_-]/g, '_');
            return safe.length > 160 ? safe.slice(0, 160) : safe;
        }

        extractContactKeyFromUrl() {
            try {
                const url = new URL(location.href);
                const path = String(url.pathname || '');
                const platform = String(this.platform || '').trim() || 'chat';

                const patterns = [
                    /\/messages\/([^/?#]+)/i,
                    /\/app\/messages\/([^/?#]+)/i
                ];

                for (const pattern of patterns) {
                    const match = path.match(pattern);
                    if (match && match[1]) {
                        return this.normalizeContactKey(`${platform}:${match[1]}`);
                    }
                }

                const hash = String(url.hash || '').replace(/^#/, '').trim();
                if (hash) {
                    return this.normalizeContactKey(`${platform}:hash:${hash}`);
                }

                return this.normalizeContactKey(`${platform}:${path}`);
            } catch (e) {
                return '';
            }
        }

        refreshContactContext({ force = false } = {}) {
            if (!this.contextStore) return;

            const key = this.extractContactKeyFromUrl();
            if (!key) return;
            if (!force && key === this.currentContactKey) return;

            this.currentContactKey = key;
            this.currentContactName = this.extractOtherPersonName();

            const stored = this.contextStore.get(key);
            this.currentContactContextText = stored && stored.context ? stored.context : '';

            if (this.ui && typeof this.ui.setContactContextState === 'function') {
                this.ui.setContactContextState({ hasContext: Boolean(this.currentContactContextText && this.currentContactContextText.trim()) });
            }
        }

        getContactContextMeta() {
            this.refreshContactContext();
            return {
                contactKey: this.currentContactKey,
                contactName: this.currentContactName || this.extractOtherPersonName(),
                contextText: this.currentContactContextText || ''
            };
        }

        trimContactContext(text) {
            const raw = String(text || '').trim();
            const MAX = 2000;
            return raw.length > MAX ? raw.slice(0, MAX) : raw;
        }

        saveContactContext(contextText) {
            this.refreshContactContext({ force: true });
            if (!this.contextStore || !this.currentContactKey) return false;

            const trimmed = this.trimContactContext(contextText);
            const ok = this.contextStore.set(this.currentContactKey, {
                name: this.currentContactName || this.extractOtherPersonName(),
                context: trimmed
            });
            if (ok) {
                this.currentContactContextText = trimmed;
                if (this.ui && typeof this.ui.setContactContextState === 'function') {
                    this.ui.setContactContextState({ hasContext: Boolean(trimmed) });
                }
            }
            return ok;
        }

        clearContactContext() {
            this.refreshContactContext({ force: true });
            if (!this.contextStore || !this.currentContactKey) return false;
            const ok = this.contextStore.clear(this.currentContactKey);
            if (ok) {
                this.currentContactContextText = '';
                if (this.ui && typeof this.ui.setContactContextState === 'function') {
                    this.ui.setContactContextState({ hasContext: false });
                }
            }
            return ok;
        }

        getCurrentContactContextForPrompt() {
            this.refreshContactContext();
            const text = this.trimContactContext(this.currentContactContextText || '');
            const MAX = 1200;
            return text.length > MAX ? `${text.slice(0, MAX)}…` : text;
        }

        createAIClient() {
            const apiKey = this.aiClientConfig.apiKey ||
                (typeof window !== 'undefined' && window.OPENROUTER_API_KEY) ||
                (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.openRouterApiKey);

            const model = this.aiClientConfig.model ||
                (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.openRouterModel) ||
                'openai/gpt-oss-120b:free';
            const profile = this.aiClientConfig.profile ||
                (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.openRouterProfile);
            const provider = this.aiClientConfig.provider || 'gemini';
            const responseLength = this.aiClientConfig.responseLength ||
                (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.aiResponseLength) ||
                'short';

            if (!apiKey) {
                this.info('OpenRouter não configurado; botão de IA ficará inativo');
                return null;
            }

            if (!window.BadooChatSuggestions.AIClient) {
                this.info('AIClient não disponível');
                return null;
            }

            return new window.BadooChatSuggestions.AIClient({ apiKey, model, profile, provider, responseLength });
        }

        setAIResponseLength(responseLength) {
            const value = String(responseLength || '').toLowerCase();
            const allowed = new Set(['short', 'medium', 'long']);
            const next = allowed.has(value) ? value : 'short';

            this.aiClientConfig = this.aiClientConfig || {};
            this.aiClientConfig.responseLength = next;

            if (this.aiClient) {
                this.aiClient.responseLength = next;
            }

            try {
                window.badooChatSuggestionsConfig = window.badooChatSuggestionsConfig || {};
                window.badooChatSuggestionsConfig.aiResponseLength = next;
            } catch (e) {
                // Ignora
            }

            try {
                if (chrome?.storage?.local) {
                    chrome.storage.local.set({ aiResponseLength: next });
                } else {
                    localStorage.setItem('bcs:aiResponseLength', next);
                }
            } catch (e) {
                // Ignora
            }

            try {
                if (this.ui && typeof this.ui.showToast === 'function') {
                    const label = next === 'short' ? 'Curta' : (next === 'medium' ? 'Média' : 'Longa');
                    this.ui.showToast(`Respostas: ${label}`);
                }
            } catch (e) {
                // Ignora
            }
        }

        extractProfileText() {
            const badooText = this.extractBadooProfileTextFromPortal();
            if (badooText) {
                this.cachedOtherPersonProfileText = badooText;
                this.cachedOtherPersonProfileUpdatedAt = Date.now();
                const name = this.extractOtherPersonName();
                if (name) this.cachedOtherPersonProfileName = name;
                return badooText;
            }

            if (this.cachedOtherPersonProfileText) {
                const currentName = this.extractOtherPersonName();
                if (currentName && this.cachedOtherPersonProfileName && currentName !== this.cachedOtherPersonProfileName) {
                    this.cachedOtherPersonProfileText = '';
                    this.cachedOtherPersonProfileUpdatedAt = 0;
                    this.cachedOtherPersonProfileName = '';
                    return '';
                }
                return this.cachedOtherPersonProfileText;
            }

            const selectors = [];
            if (this.profileContainerSelector) selectors.push(this.profileContainerSelector);
            selectors.push('#main-content [data-testid="profileCard"]');
            selectors.push('#main-content [data-testid="profile"]');

            let el = null;
            for (const sel of selectors) {
                try {
                    el = document.querySelector(sel);
                } catch (e) {
                    // ignora seletor inválido
                }
                if (el) break;
            }

            if (!el) return '';

            const raw = (el.innerText || el.textContent || '').trim();
            if (!raw) return '';

            const cleaned = raw
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .join('\n')
                .replace(/\s+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            const MAX = 900;
            return cleaned.length > MAX ? `${cleaned.slice(0, MAX)}…` : cleaned;
        }

        extractOtherPersonName() {
            const selectors = [
                this.otherPersonNameSelector,
                '.navigation-profile .csms-profile-info__name-inner',
                '.navigation-profile .csms-a11y-visually-hidden',
                '[data-qa="profile-info__name"] .csms-profile-info__name-inner',
                '.csms-profile-info__name-inner',
                '[data-qa="profile-info__name"]',
                '[data-qa="mini-profile-user-info__heading"] [data-qa="profile-info__name"]'
            ].filter(Boolean);

            for (const selector of selectors) {
                try {
                    const el = document.querySelector(selector);
                    let name = (el && (el.textContent || el.innerText)) ? (el.textContent || el.innerText).trim() : '';
                    if (!name) continue;
                    name = name.replace(/\s+/g, ' ').trim();
                    // Ex.: "Mayara, Abrir perfil"
                    if (name.includes(',')) {
                        name = name.split(',')[0].trim();
                    }
                    if (name) return name;
                } catch (e) {
                    // Ignora
                }
            }
            return '';
        }

        async generateAISuggestions() {
            if (this.aiLoading) return;
            if (!this.aiClient) {
                this.info('OpenRouter não configurado; defina openRouterApiKey em window.badooChatSuggestionsConfig');
                alert('IA não configurada. Defina openRouterApiKey em window.badooChatSuggestionsConfig ou window.OPENROUTER_API_KEY.');
                return;
            }

            try {
                this.aiLoading = true;
                this.ui.setAiLoading(true);
                const context = this.contextExtractor.extract(this.chatContainer, { fullHistory: true });
                const messages = context?.allMessages || context?.lastMessages || [];
                const configuredProfile = (this.aiClientConfig && this.aiClientConfig.profile) ||
                    (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.openRouterProfile);
                const profile = [configuredProfile].filter(Boolean).join('\n\n');
                const otherPersonProfile = this.extractProfileText();
                const otherPersonName = this.extractOtherPersonName();
                const otherPersonContextNote = this.getCurrentContactContextForPrompt();

                if (this.debug && otherPersonProfile) {
                    console.info('[Chat Suggestions][AI] Perfil da outra pessoa extraído da página', { chars: otherPersonProfile.length });
                }

                const aiSuggestions = await this.aiClient.generateSuggestions({ messages, profile, otherPersonName, otherPersonProfile, otherPersonContextNote });
                const safe = aiSuggestions && aiSuggestions.length ? aiSuggestions : this.suggestionEngine.getDefaultSuggestions();
                this.ui.render(safe, { isAI: true });
                this.info('Sugestões de IA geradas', { total: safe.length });
            } catch (error) {
                console.error('[Chat Suggestions] Erro ao gerar via IA', error);
                alert(`Não foi possível gerar sugestões via IA.\n${error.message || ''}`);
            } finally {
                this.aiLoading = false;
                this.ui.setAiLoading(false);
            }
        }

        buildAIPrompts({ personality } = {}) {
            if (this.aiLoading) return;
            if (!this.aiClient) {
                this.info('IA não configurada; defina openRouterApiKey/geminiApiKey');
                alert('IA não configurada. Configure a chave da API na extensão.');
                return { systemPrompt: '', userPrompt: '' };
            }

            const context = this.contextExtractor.extract(this.chatContainer, { fullHistory: true });
            const messages = context?.allMessages || context?.lastMessages || [];
            const configuredProfile = (this.aiClientConfig && this.aiClientConfig.profile) ||
                (window.badooChatSuggestionsConfig && window.badooChatSuggestionsConfig.openRouterProfile);
            const profile = [configuredProfile].filter(Boolean).join('\n\n');
            const otherPersonProfile = this.extractProfileText();
            const otherPersonName = this.extractOtherPersonName();
            const otherPersonContextNote = this.getCurrentContactContextForPrompt();

            if (this.debug) {
                console.info('[Chat Suggestions][AI] Contexto do perfil (outra pessoa)', {
                    hasProfile: Boolean(otherPersonProfile),
                    chars: otherPersonProfile ? otherPersonProfile.length : 0
                });
            }

            const { systemPrompt, userPrompt } = this.aiClient.buildPrompts({ messages, profile, otherPersonName, otherPersonProfile, otherPersonContextNote });
            return { systemPrompt, userPrompt, personality };
        }

        openAIPromptModal({ personality } = {}) {
            const prompts = this.buildAIPrompts({ personality });
            if (!prompts || !prompts.systemPrompt) return;
            const { systemPrompt, userPrompt } = prompts;

            if (!this.ui || typeof this.ui.openAiPromptModal !== 'function') {
                this.generateAISuggestions();
                return;
            }

            this.ui.openAiPromptModal({
                systemPrompt,
                userPrompt,
                onSend: async ({ systemPrompt: editedSystem, userPrompt: editedUser }) => {
                    if (this.aiLoading) return;
                    try {
                        this.aiLoading = true;
                        this.ui.setAiLoading(true);
                        this.ui.setAiPromptSending(true);
                        const aiSuggestions = await this.aiClient.generateSuggestionsWithPrompts({
                            systemPrompt: editedSystem,
                            userPrompt: editedUser
                        });
                        const safe = aiSuggestions && aiSuggestions.length ? aiSuggestions : this.suggestionEngine.getDefaultSuggestions();
                        this.ui.render(safe, { isAI: true });
                        this.info('Sugestões de IA geradas', { total: safe.length });
                        this.ui.closeAiPromptModal();
                    } catch (error) {
                        console.error('[Chat Suggestions] Erro ao gerar via IA', error);
                        alert(`Não foi possível gerar sugestões via IA.\n${error.message || ''}`);
                    } finally {
                        this.aiLoading = false;
                        this.ui.setAiLoading(false);
                        this.ui.setAiPromptSending(false);
                    }
                }
            });
        }

        cleanup() {
            this.info('Limpando observadores e UI');
            if (this.chatObserver) {
                this.chatObserver.disconnect();
                this.chatObserver = null;
            }

            if (this.platformObserver) {
                this.platformObserver.disconnect();
                this.platformObserver = null;
            }

            if (this.profilePortalObserver) {
                this.profilePortalObserver.disconnect();
                this.profilePortalObserver = null;
            }

            if (this.profileClickHandler) {
                document.removeEventListener('click', this.profileClickHandler, true);
                this.profileClickHandler = null;
            }

            if (this.messageCheckInterval) {
                clearInterval(this.messageCheckInterval);
                this.messageCheckInterval = null;
            }

            if (this.periodicUpdateInterval) {
                clearInterval(this.periodicUpdateInterval);
                this.periodicUpdateInterval = null;
            }

            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = null;
            }

            if (this.initRetryTimeout) {
                clearTimeout(this.initRetryTimeout);
                this.initRetryTimeout = null;
            }

            if (this.ui) {
                this.ui.destroy();
                this.ui = null;
            }

            this.chatContainer = null;
            this.contextExtractor = null;
            this.suggestionEngine = null;
            this.lastMessageCount = 0;
        }

        info(message, data) {
            if (data) {
                console.info(`[Chat Suggestions] ${message}`, data);
            } else {
                console.info(`[Chat Suggestions] ${message}`);
            }
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.ChatSuggestionsController = ChatSuggestionsController;
})();
