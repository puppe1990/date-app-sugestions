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
            debug = false,
        } = {}) {
            this.chatContainerSelector = chatContainerSelector;
            this.inputSelector = inputSelector;
            this.debug = debug;
            this.uiPlacement = uiPlacement;
            this.profileContainerSelector = profileContainerSelector;
            this.otherPersonNameSelector = otherPersonNameSelector;
            this.platform = platform;
            this.messageReader =
                messageReader ||
                window.ChatSuggestions.createDefaultMessageReader?.() ||
                window.ChatSuggestions.createBadooMessageReader();
            this.messageSelector =
                messageSelector ||
                (this.messageReader &&
                    this.messageReader.config &&
                    this.messageReader.config.messageSelector) ||
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
            this.boundStorageChange = null;
        }

        init() {
            this.chatContainer = document.querySelector(
                this.chatContainerSelector,
            );

            if (!this.chatContainer) {
                if (this.debug) {
                    console.warn(
                        '[Chat Suggestions] Container de chat não encontrado, tentando novamente...',
                    );
                }

                if (!this.initRetryTimeout) {
                    this.initRetryTimeout = setTimeout(() => {
                        this.initRetryTimeout = null;
                        this.init();
                    }, 1000);
                }
                return;
            }

            this.info('Container de chat encontrado', {
                selector: this.chatContainerSelector,
            });

            if (this.debug) {
                console.log('[Chat Suggestions] Inicializando...');
            }

            this.contextExtractor = new window.ChatSuggestions.ContextExtractor(
                {
                    debug: this.debug,
                    messageReader: this.messageReader,
                },
            );
            this.contextStore = new window.ChatSuggestions.ContextStore({
                debug: this.debug,
            });
            this.aiClient = this.aiClient || this.createAIClient();
            this.suggestionEngine = new window.ChatSuggestions.SuggestionEngine(
                { debug: this.debug },
            );
            this.ui = new window.ChatSuggestions.SuggestionsUI({
                inputSelector: this.inputSelector,
                placement: this.uiPlacement,
                responseLength: this.aiClientConfig?.responseLength || 'short',
                conversationMode: this.aiClientConfig?.businessModeEnabled
                    ? 'business'
                    : 'casual',
                onAiGenerate: (opts) => this.openAIPromptModal(opts),
                onAiReply: (opts) => this.generateAIReplySuggestions(opts),
                onAiCopyPrompt: (opts) => this.buildAIPrompts(opts),
                onResponseLengthChange: ({ responseLength }) =>
                    this.setAIResponseLength(responseLength),
                getContactContextMeta: () => this.getContactContextMeta(),
                onContactContextSave: ({ contextText }) =>
                    this.saveContactContext(contextText),
                onContactContextClear: () => this.clearContactContext(),
                onCopyOtherPersonProfile:
                    this.platform === 'badoo' || this.platform === 'tinder'
                        ? () => this.copyOtherPersonProfileToClipboard()
                        : null,
            });

            const mounted = this.ui.mount();
            this.info('Container de sugestões montado', {
                mounted,
                inputSelector: this.inputSelector,
            });

            this.refreshContactContext({ force: true });
            this.lastMessageCount = 0;
            this.updateSuggestions();

            this.setupObservers();
            this.setupPlatformObservers();
            this.setupProfileCapture();
            this.attachConfigListener();

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
                '[data-qa="mini-profile"] .mini-profile__user-info',
            ];

            this.profileClickHandler = (event) => {
                try {
                    const target = event && event.target;
                    if (!target || !target.closest) return;
                    const trigger = triggerSelectors
                        .map((sel) => target.closest(sel))
                        .find(Boolean);
                    if (!trigger) return;
                    if (this.debug) {
                        console.info(
                            '[Chat Suggestions][Badoo] Clique detectado para abrir perfil; iniciando monitoramento do portal',
                        );
                    }
                    this.waitForBadooProfilePortalAndCache({ timeoutMs: 7000 });
                } catch (e) {
                    // Ignora
                }
            };

            document.addEventListener('click', this.profileClickHandler, true);
            if (this.debug) {
                console.info(
                    '[Chat Suggestions][Badoo] Listener de clique para capturar perfil registrado',
                );
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
                        this.info('Perfil atualizado (Badoo)', {
                            chars: text.length,
                        });
                    }
                    return true;
                }
                return false;
            };

            if (tryCapture()) return;

            if (this.profilePortalObserver) {
                if (this.debug) {
                    console.info(
                        '[Chat Suggestions][Badoo] Observer do portal já ativo; aguardando atualização do perfil',
                    );
                }
                return;
            }

            const startedAt = Date.now();
            let lastChangeAt = startedAt;
            if (this.debug) {
                console.info(
                    '[Chat Suggestions][Badoo] Iniciando observer do portal do perfil',
                    { timeoutMs },
                );
            }
            this.profilePortalObserver = new MutationObserver(() => {
                const before = this.cachedOtherPersonProfileText;
                const ok = tryCapture();
                if (
                    ok &&
                    this.cachedOtherPersonProfileText &&
                    this.cachedOtherPersonProfileText !== before
                ) {
                    lastChangeAt = Date.now();
                }

                const elapsed = Date.now() - startedAt;
                const settledFor = Date.now() - lastChangeAt;
                const hasBio = (
                    this.cachedOtherPersonProfileText || ''
                ).includes('Sobre mim:');

                if (
                    elapsed > timeoutMs ||
                    (this.cachedOtherPersonProfileText &&
                        settledFor > 800 &&
                        (hasBio || elapsed > 1500))
                ) {
                    if (this.debug) {
                        console.info(
                            '[Chat Suggestions][Badoo] Encerrando observer do portal do perfil',
                            {
                                elapsedMs: elapsed,
                                settledForMs: settledFor,
                                hasBio,
                                cachedChars: this.cachedOtherPersonProfileText
                                    ? this.cachedOtherPersonProfileText.length
                                    : 0,
                            },
                        );
                    }
                    this.profilePortalObserver.disconnect();
                    this.profilePortalObserver = null;
                }
            });

            const root = document.body || document.documentElement;
            if (!root) return;
            this.profilePortalObserver.observe(root, {
                childList: true,
                subtree: true,
            });
        }

        extractBadooProfileTextFromPortal() {
            const parser = window.ChatSuggestions.ProfileParser || {};
            if (
                typeof parser.extractBadooProfileTextFromPortal !== 'function'
            ) {
                return '';
            }
            return parser.extractBadooProfileTextFromPortal({ document });
        }

        setupPlatformObservers() {
            if (this.platformObserver) return;

            const effectivePlatform =
                this.platform ||
                ((location.hostname || '').includes('whatsapp.com')
                    ? 'whatsapp'
                    : null);

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
                mutations.forEach((m) => {
                    if (
                        m.type === 'attributes' &&
                        m.attributeName === 'aria-selected'
                    ) {
                        const target = m.target;
                        if (
                            target &&
                            target.getAttribute &&
                            target.getAttribute('aria-selected') === 'true'
                        ) {
                            changed = true;
                        }
                    }
                    if (
                        m.type === 'childList' &&
                        (m.addedNodes.length || m.removedNodes.length)
                    ) {
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
                subtree: true,
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

                const currentMessages = this.chatContainer.querySelectorAll(
                    this.messageSelector,
                );
                const currentCount = currentMessages.length;

                if (currentCount !== this.lastMessageCount) {
                    this.lastMessageCount = currentCount;
                    this.updateSuggestions();
                    if (this.debug) {
                        console.log(
                            `[Chat Suggestions] Nova mensagem detectada! Total: ${currentCount}`,
                        );
                    }
                }
            };

            this.chatObserver = new MutationObserver((mutations) => {
                let hasNewMessage = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) {
                                if (
                                    node.matches &&
                                    node.matches(this.messageSelector)
                                ) {
                                    hasNewMessage = true;
                                } else if (
                                    node.querySelector &&
                                    node.querySelector(this.messageSelector)
                                ) {
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
                        this.lastMessageCount =
                            this.chatContainer.querySelectorAll(
                                this.messageSelector,
                            ).length;
                        if (this.debug) {
                            console.log(
                                '[Chat Suggestions] Sugestões atualizadas devido a nova mensagem',
                            );
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
                characterData: false,
            });

            this.messageCheckInterval = setInterval(() => {
                checkForNewMessages();
            }, 1000);

            this.periodicUpdateInterval = setInterval(() => {
                this.updateSuggestions();
            }, 3000);
        }

        updateSuggestions() {
            if (
                !this.chatContainer ||
                !this.contextExtractor ||
                !this.suggestionEngine ||
                !this.ui
            ) {
                return;
            }

            this.refreshContactContext();
            const context = this.contextExtractor.extract(this.chatContainer);
            const suggestions = this.suggestionEngine.generate(context);
            const safeSuggestions =
                suggestions.length > 0
                    ? suggestions
                    : this.suggestionEngine.getDefaultSuggestions();
            if (this.debug && Array.isArray(context?.lastMessages)) {
                const conversationLog = context.lastMessages.map(
                    (msg, index) => ({
                        index: index + 1,
                        direction: msg.direction,
                        sender: msg.sender,
                        text: msg.text,
                    }),
                );
                console.table(conversationLog);
            }
            this.ui.render(safeSuggestions);
            if (this.debug) {
                console.info('[Chat Suggestions] Sugestões atualizadas', {
                    total: safeSuggestions.length,
                    topics: context?.topics || [],
                });
            }
            this.lastMessageCount = this.chatContainer.querySelectorAll(
                this.messageSelector,
            ).length;
        }

        normalizeContactKey(value) {
            const manager = window.ChatSuggestions.ContactContextManager || {};
            return manager.normalizeContactKey(value);
        }

        extractContactKeyFromUrl() {
            const manager = window.ChatSuggestions.ContactContextManager || {};
            return manager.buildContactKeyFromUrl({
                href: location.href,
                platform: this.platform,
            });
        }

        extractWhatsAppContactKey() {
            const manager = window.ChatSuggestions.ContactContextManager || {};
            return manager.buildWhatsAppContactKey({ document });
        }

        extractContactKey() {
            const platform = String(this.platform || '').trim();
            if (platform === 'whatsapp') {
                return (
                    this.extractWhatsAppContactKey() ||
                    this.extractContactKeyFromUrl()
                );
            }
            return this.extractContactKeyFromUrl();
        }

        refreshContactContext({ force = false } = {}) {
            if (!this.contextStore) return;

            const key = this.extractContactKey();
            if (!key) return;
            if (!force && key === this.currentContactKey) return;

            this.currentContactKey = key;
            this.currentContactName = this.extractOtherPersonName();

            const stored = this.contextStore.get(key);
            this.currentContactContextText =
                stored && stored.context ? stored.context : '';

            if (
                this.ui &&
                typeof this.ui.setContactContextState === 'function'
            ) {
                this.ui.setContactContextState({
                    hasContext: Boolean(
                        this.currentContactContextText &&
                        this.currentContactContextText.trim(),
                    ),
                });
            }

            if (this.debug) {
                console.info('[Chat Suggestions][Context] Conversa atual', {
                    contactKey: this.currentContactKey,
                    contactName: this.currentContactName,
                    hasContext: Boolean(
                        this.currentContactContextText &&
                        this.currentContactContextText.trim(),
                    ),
                });
            }
        }

        getContactContextMeta() {
            this.refreshContactContext();
            return {
                contactKey: this.currentContactKey,
                contactName:
                    this.currentContactName || this.extractOtherPersonName(),
                contextText: this.currentContactContextText || '',
            };
        }

        trimContactContext(text) {
            const manager = window.ChatSuggestions.ContactContextManager || {};
            return manager.trimContactContext(text);
        }

        saveContactContext(contextText) {
            this.refreshContactContext({ force: true });
            if (!this.contextStore || !this.currentContactKey) return false;

            const trimmed = this.trimContactContext(contextText);
            const ok = this.contextStore.set(this.currentContactKey, {
                name: this.currentContactName || this.extractOtherPersonName(),
                context: trimmed,
            });
            if (ok) {
                this.currentContactContextText = trimmed;
                if (
                    this.ui &&
                    typeof this.ui.setContactContextState === 'function'
                ) {
                    this.ui.setContactContextState({
                        hasContext: Boolean(trimmed),
                    });
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
                if (
                    this.ui &&
                    typeof this.ui.setContactContextState === 'function'
                ) {
                    this.ui.setContactContextState({ hasContext: false });
                }
            }
            return ok;
        }

        getCurrentContactContextForPrompt() {
            this.refreshContactContext();
            const manager = window.ChatSuggestions.ContactContextManager || {};
            return manager.getCurrentContactContextForPrompt({
                currentContactContextText: this.currentContactContextText || '',
            });
        }

        buildConversationCopyText({ maxMessages = 40, maxChars = 2400 } = {}) {
            if (!this.contextExtractor || !this.chatContainer) return '';
            const context = this.contextExtractor.extract(this.chatContainer, {
                fullHistory: true,
            });
            const messages = context?.allMessages?.length
                ? context.allMessages
                : context?.lastMessages || [];
            if (!messages.length) return '';

            const otherPersonName = this.extractOtherPersonName();
            const entries = messages
                .slice(-maxMessages)
                .map((msg) => {
                    const text = String(msg?.text || '').trim();
                    if (!text) return null;
                    const senderName =
                        msg.sender &&
                        !['Outro', 'OUTRA PESSOA'].includes(msg.sender)
                            ? msg.sender
                            : otherPersonName || 'OUTRA PESSOA';
                    const dir = msg.direction === 'out' ? 'EU' : senderName;
                    return { dir, text };
                })
                .filter(Boolean);

            if (!entries.length) return '';

            const render = (items) =>
                items
                    .map(
                        (entry, index) =>
                            `${index + 1}. ${entry.dir}: ${entry.text}`,
                    )
                    .join('\n');

            let startIndex = 0;
            let joined = render(entries);
            while (
                joined.length > maxChars &&
                startIndex < entries.length - 1
            ) {
                startIndex += 1;
                joined = render(entries.slice(startIndex));
            }

            return joined.trim();
        }

        async copyOtherPersonProfileToClipboard() {
            try {
                const profileText = this.extractProfileText();
                const conversationText = this.buildConversationCopyText();
                if (!profileText && !conversationText) {
                    if (this.platform === 'badoo') {
                        this.waitForBadooProfilePortalAndCache({
                            timeoutMs: 2500,
                        });
                    }
                    return {
                        ok: false,
                        message:
                            this.platform === 'badoo'
                                ? 'Abra o perfil da pessoa e tente novamente'
                                : 'Perfil não encontrado na página',
                    };
                }

                const parts = [];
                if (profileText) {
                    parts.push(`Perfil da outra pessoa:\n${profileText}`);
                }
                if (conversationText) {
                    parts.push(`Conversa:\n${conversationText}`);
                }
                const payload = parts.join('\n\n').trim();

                const ok =
                    this.ui && typeof this.ui.copyToClipboard === 'function'
                        ? await this.ui.copyToClipboard(payload)
                        : false;

                if (!ok) {
                    return { ok: false, message: 'Não foi possível copiar' };
                }

                return {
                    ok: true,
                    message: conversationText
                        ? 'Perfil e conversa copiados!'
                        : 'Perfil copiado!',
                };
            } catch (e) {
                return { ok: false, message: 'Não foi possível copiar' };
            }
        }

        createAIClient() {
            const providerConfig = window.ChatSuggestions?.ProviderConfig || {};
            const provider = this.aiClientConfig.provider || 'gemini';
            const globalConfig = window.badooChatSuggestionsConfig || {};
            const apiKey = this.aiClientConfig.apiKey || null;

            const model =
                this.aiClientConfig.model ||
                (provider === 'nvidia'
                    ? globalConfig.nvidiaModel
                    : globalConfig.openRouterModel) ||
                (typeof providerConfig.getDefaultModelForProvider === 'function'
                    ? providerConfig.getDefaultModelForProvider(provider)
                    : 'openai/gpt-oss-120b:free');
            const profile =
                this.aiClientConfig.profile || globalConfig.openRouterProfile;
            const responseLength =
                this.aiClientConfig.responseLength ||
                globalConfig.aiResponseLength ||
                'short';
            const businessModeEnabled =
                this.aiClientConfig.businessModeEnabled ??
                globalConfig.businessModeEnabled;
            const businessContext =
                this.aiClientConfig.businessContext ||
                globalConfig.businessContext;
            const businessTone =
                this.aiClientConfig.businessTone || globalConfig.businessTone;

            if (!apiKey) {
                this.info(
                    `Provider ${provider} não configurado; botão de IA ficará inativo`,
                );
                return null;
            }

            if (!window.ChatSuggestions.AIClient) {
                this.info('AIClient não disponível');
                return null;
            }

            return new window.ChatSuggestions.AIClient({
                apiKey,
                model,
                profile,
                provider,
                responseLength,
                businessModeEnabled: Boolean(businessModeEnabled),
                businessContext: businessContext || '',
                businessTone: businessTone || 'consultivo',
            });
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
                window.badooChatSuggestionsConfig =
                    window.badooChatSuggestionsConfig || {};
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
                    const label =
                        next === 'short'
                            ? 'Curta'
                            : next === 'medium'
                              ? 'Média'
                              : 'Longa';
                    this.ui.showToast(`Respostas: ${label}`);
                }
            } catch (e) {
                // Ignora
            }
        }

        extractProfileText() {
            const badooText = this.extractBadooProfileTextFromPortal();
            if (badooText) {
                const sanitized = this.sanitizeProfileText(badooText);
                this.cachedOtherPersonProfileText = sanitized;
                this.cachedOtherPersonProfileUpdatedAt = Date.now();
                const name = this.extractOtherPersonName();
                if (name) this.cachedOtherPersonProfileName = name;
                return sanitized;
            }

            if (this.cachedOtherPersonProfileText) {
                const currentName = this.extractOtherPersonName();
                if (
                    currentName &&
                    this.cachedOtherPersonProfileName &&
                    currentName !== this.cachedOtherPersonProfileName
                ) {
                    this.cachedOtherPersonProfileText = '';
                    this.cachedOtherPersonProfileUpdatedAt = 0;
                    this.cachedOtherPersonProfileName = '';
                    return '';
                }
                return this.cachedOtherPersonProfileText;
            }

            const selectors = [];
            if (this.profileContainerSelector)
                selectors.push(this.profileContainerSelector);
            selectors.push('.mini-profile__user-info');
            selectors.push('[data-qa="mini-profile-user-info"]');
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

            return this.sanitizeProfileText(raw);
        }

        sanitizeProfileText(raw) {
            const parser = window.ChatSuggestions.ProfileParser || {};
            if (typeof parser.sanitizeProfileText !== 'function') {
                return String(raw || '').trim();
            }
            return parser.sanitizeProfileText({
                raw,
                otherPersonName: this.extractOtherPersonName(),
            });
        }

        extractOtherPersonName() {
            const selectors = [
                this.otherPersonNameSelector,
                '.navigation-profile .csms-profile-info__name-inner',
                '.navigation-profile .csms-a11y-visually-hidden',
                '[data-qa="profile-info__name"] .csms-profile-info__name-inner',
                '.csms-profile-info__name-inner',
                '[data-qa="profile-info__name"]',
                '[data-qa="mini-profile-user-info__heading"] [data-qa="profile-info__name"]',
            ]
                .filter(Boolean)
                .flatMap((selector) =>
                    String(selector || '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                );
            const parser = window.ChatSuggestions.ProfileParser || {};
            if (typeof parser.extractOtherPersonName !== 'function') {
                for (const selector of selectors) {
                    try {
                        const el = document.querySelector(selector);
                        let name =
                            el && (el.textContent || el.innerText)
                                ? (el.textContent || el.innerText).trim()
                                : '';
                        if (!name) continue;
                        name = name.replace(/\s+/g, ' ').trim();
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
            return parser.extractOtherPersonName({ document, selectors });
        }

        async generateAISuggestions() {
            if (this.aiLoading) return;
            if (!this.aiClient) {
                const provider = this.aiClientConfig?.provider || 'gemini';
                this.info(`IA (${provider}) não configurada`);
                alert(
                    'IA não configurada. Defina a chave do provider selecionado no arquivo .env e recarregue a extensão.',
                );
                return;
            }

            try {
                this.aiLoading = true;
                this.ui.setAiLoading(true);
                const context = this.contextExtractor.extract(
                    this.chatContainer,
                    { fullHistory: true },
                );
                const messages =
                    context?.allMessages || context?.lastMessages || [];
                const configuredProfile =
                    (this.aiClientConfig && this.aiClientConfig.profile) ||
                    (window.badooChatSuggestionsConfig &&
                        window.badooChatSuggestionsConfig.openRouterProfile);
                const profile = [configuredProfile]
                    .filter(Boolean)
                    .join('\n\n');
                const otherPersonProfile = this.extractProfileText();
                const otherPersonName = this.extractOtherPersonName();
                const otherPersonContextNote =
                    this.getCurrentContactContextForPrompt();

                if (this.debug && otherPersonProfile) {
                    console.info(
                        '[Chat Suggestions][AI] Perfil da outra pessoa extraído da página',
                        { chars: otherPersonProfile.length },
                    );
                }

                const aiSuggestions = await this.aiClient.generateSuggestions({
                    messages,
                    profile,
                    otherPersonName,
                    otherPersonProfile,
                    otherPersonContextNote,
                });
                const safe =
                    aiSuggestions && aiSuggestions.length
                        ? aiSuggestions
                        : this.suggestionEngine.getDefaultSuggestions();
                this.ui.render(safe, { isAI: true });
                this.info('Sugestões de IA geradas', { total: safe.length });
            } catch (error) {
                console.error('[Chat Suggestions] Erro ao gerar via IA', error);
                alert(
                    `Não foi possível gerar sugestões via IA.\n${error.message || ''}`,
                );
            } finally {
                this.aiLoading = false;
                this.ui.setAiLoading(false);
            }
        }

        async generateAIReplySuggestions({ personality } = {}) {
            if (this.aiLoading) return '';
            if (!this.aiClient) {
                const provider = this.aiClientConfig?.provider || 'gemini';
                this.info(`IA (${provider}) não configurada`);
                alert(
                    'IA não configurada. Defina a chave do provider selecionado no arquivo .env e recarregue a extensão.',
                );
                return '';
            }

            try {
                const prompts = this.buildAIPrompts({ personality });
                if (!prompts || !prompts.systemPrompt || !prompts.userPrompt) {
                    return '';
                }
                this.aiLoading = true;
                this.ui.setAiLoading(true);
                const aiSuggestions =
                    await this.aiClient.generateSuggestionsWithPrompts({
                        systemPrompt: this.applyPersonalityToSystemPrompt(
                            prompts.systemPrompt,
                            personality,
                        ),
                        userPrompt: prompts.userPrompt,
                    });
                const safe =
                    aiSuggestions && aiSuggestions.length
                        ? aiSuggestions
                        : this.suggestionEngine.getDefaultSuggestions();
                this.ui.render(safe, { isAI: true });
                return safe
                    .map((item) => String(item || '').trim())
                    .filter(Boolean)
                    .slice(0, 3);
            } catch (error) {
                console.error(
                    '[Chat Suggestions] Erro ao responder com IA',
                    error,
                );
                alert(
                    `Não foi possível gerar a resposta com IA.\n${error.message || ''}`,
                );
                return '';
            } finally {
                this.aiLoading = false;
                this.ui.setAiLoading(false);
            }
        }

        applyPersonalityToSystemPrompt(systemPrompt, personality) {
            const promptBuilder = window.ChatSuggestions.AIPromptBuilder || {};
            return promptBuilder.applyPersonalityToSystemPrompt({
                systemPrompt,
                personality,
                buildPersonalityAddon: this.ui?.buildPersonalityAddon,
            });
        }

        buildAIPrompts({ personality } = {}) {
            if (this.aiLoading) return;
            if (!this.aiClient) {
                this.info(
                    'IA não configurada; defina a chave do provider no .env',
                );
                alert(
                    'IA não configurada. Defina a chave do provider no arquivo .env e recarregue a extensão.',
                );
                return { systemPrompt: '', userPrompt: '' };
            }

            const promptBuilder = window.ChatSuggestions.AIPromptBuilder || {};
            const otherPersonProfile = this.extractProfileText();

            if (this.debug) {
                console.info(
                    '[Chat Suggestions][AI] Contexto do perfil (outra pessoa)',
                    {
                        hasProfile: Boolean(otherPersonProfile),
                        chars: otherPersonProfile
                            ? otherPersonProfile.length
                            : 0,
                    },
                );
            }

            const { systemPrompt, userPrompt } = promptBuilder.buildAIPrompts({
                aiLoading: this.aiLoading,
                aiClient: this.aiClient,
                aiClientConfig: this.aiClientConfig,
                globalProfile:
                    window.badooChatSuggestionsConfig?.openRouterProfile || '',
                contextExtractor: this.contextExtractor,
                chatContainer: this.chatContainer,
                extractProfileText: () => otherPersonProfile,
                extractOtherPersonName: () => this.extractOtherPersonName(),
                getCurrentContactContextForPrompt: () =>
                    this.getCurrentContactContextForPrompt(),
            });
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
                onSend: async ({
                    systemPrompt: editedSystem,
                    userPrompt: editedUser,
                }) => {
                    if (this.aiLoading) return;
                    try {
                        this.aiLoading = true;
                        this.ui.setAiLoading(true);
                        this.ui.setAiPromptSending(true);
                        const aiSuggestions =
                            await this.aiClient.generateSuggestionsWithPrompts({
                                systemPrompt: editedSystem,
                                userPrompt: editedUser,
                            });
                        const safe =
                            aiSuggestions && aiSuggestions.length
                                ? aiSuggestions
                                : this.suggestionEngine.getDefaultSuggestions();
                        this.ui.render(safe, { isAI: true });
                        this.info('Sugestões de IA geradas', {
                            total: safe.length,
                        });
                        this.ui.closeAiPromptModal();
                    } catch (error) {
                        console.error(
                            '[Chat Suggestions] Erro ao gerar via IA',
                            error,
                        );
                        alert(
                            `Não foi possível gerar sugestões via IA.\n${error.message || ''}`,
                        );
                    } finally {
                        this.aiLoading = false;
                        this.ui.setAiLoading(false);
                        this.ui.setAiPromptSending(false);
                    }
                },
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
                document.removeEventListener(
                    'click',
                    this.profileClickHandler,
                    true,
                );
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

            if (this.boundStorageChange && chrome?.storage?.onChanged) {
                chrome.storage.onChanged.removeListener(
                    this.boundStorageChange,
                );
                this.boundStorageChange = null;
            }

            this.chatContainer = null;
            this.contextExtractor = null;
            this.suggestionEngine = null;
            this.lastMessageCount = 0;
        }

        getCurrentHost() {
            try {
                return (location.hostname || '').toLowerCase();
            } catch (e) {
                return '';
            }
        }

        attachConfigListener() {
            if (!chrome?.storage?.onChanged || this.boundStorageChange) return;
            this.boundStorageChange = (changes, areaName) => {
                if (areaName !== 'local') return;
                const watched = new Set([
                    'businessModeEnabled',
                    'businessModeByHost',
                    'businessContext',
                    'businessTone',
                    'openRouterProfileCasual',
                    'openRouterProfileBusiness',
                ]);
                const shouldRefresh = Object.keys(changes || {}).some((key) =>
                    watched.has(key),
                );
                if (!shouldRefresh) return;
                this.refreshBusinessModeFromStorage();
            };
            chrome.storage.onChanged.addListener(this.boundStorageChange);
        }

        refreshBusinessModeFromStorage() {
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
                    const host = this.getCurrentHost();
                    const hostMode = host
                        ? (result.businessModeByHost || {})[host]
                        : undefined;
                    const businessModeEnabled =
                        typeof hostMode === 'boolean'
                            ? hostMode
                            : Boolean(result.businessModeEnabled);
                    const businessContext = result.businessContext || '';
                    const businessTone = result.businessTone || 'consultivo';
                    const profileCasual = result.openRouterProfileCasual || '';
                    const profileBusiness =
                        result.openRouterProfileBusiness || '';
                    this.updateBusinessModeConfig({
                        businessModeEnabled,
                        businessContext,
                        businessTone,
                        profileCasual,
                        profileBusiness,
                    });
                },
            );
        }

        updateBusinessModeConfig({
            businessModeEnabled,
            businessContext,
            businessTone,
            profileCasual,
            profileBusiness,
        }) {
            const mode = businessModeEnabled ? 'business' : 'casual';
            const profile =
                mode === 'business' ? profileBusiness : profileCasual;
            this.aiClientConfig = this.aiClientConfig || {};
            this.aiClientConfig.businessModeEnabled =
                Boolean(businessModeEnabled);
            this.aiClientConfig.businessContext = businessContext || '';
            this.aiClientConfig.businessTone = businessTone || 'consultivo';
            this.aiClientConfig.profile = profile || '';

            if (this.aiClient) {
                this.aiClient.businessModeEnabled =
                    Boolean(businessModeEnabled);
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

        info(message, data) {
            if (data) {
                console.info(`[Chat Suggestions] ${message}`, data);
            } else {
                console.info(`[Chat Suggestions] ${message}`);
            }
        }
    }

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.ChatSuggestionsController =
        ChatSuggestionsController;
})();
