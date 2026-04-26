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
                {
                    debug: this.debug,
                },
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

        setupPlatformObservers() {
            if (this.platformObserver) return;
            const helpers = window.ChatSuggestions.ChatObserverHelpers || {};

            const effectivePlatform = helpers.getEffectivePlatform({
                platform: this.platform,
                hostname: location.hostname || '',
            });

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
                const changed =
                    typeof helpers.hasPlatformConversationChange === 'function'
                        ? helpers.hasPlatformConversationChange(mutations)
                        : false;
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
            const profileHelpers =
                window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
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
            profileHelpers.resetProfileCache(this);
            this.info('Conversa alterada; sugestões atualizadas');
        }

        setupObservers() {
            const helpers = window.ChatSuggestions.ChatObserverHelpers || {};
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
                const hasNewMessage =
                    typeof helpers.hasNewMessageMutation === 'function'
                        ? helpers.hasNewMessageMutation({
                              mutations,
                              messageSelector: this.messageSelector,
                          })
                        : false;

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

        cleanup() {
            this.info('Limpando observadores e UI');
            const cleanupHelpers =
                window.ChatSuggestions.ChatCleanupHelpers || {};
            cleanupHelpers.cleanupControllerState(this, {
                document,
                chrome,
                clearInterval,
                clearTimeout,
            });
        }

        info(message, data) {
            if (data) {
                console.info(`[Chat Suggestions] ${message}`, data);
            } else {
                console.info(`[Chat Suggestions] ${message}`);
            }
        }
    }

    const helpers = window.ChatSuggestions || {};
    Object.assign(
        ChatSuggestionsController.prototype,
        helpers.ChatControllerAIConfigHelpers || {},
        helpers.ChatControllerContextHelpers || {},
        helpers.ChatControllerProfileHelpers || {},
        helpers.ChatControllerAIActions || {},
    );

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.ChatSuggestionsController =
        ChatSuggestionsController;
})();
