(() => {
    class ChatSuggestionsController {
        constructor({
            chatContainerSelector = '.csms-chat-messages',
            inputSelector = '#chat-composer-input-message',
            messageReader = null,
            debug = false
        } = {}) {
            this.chatContainerSelector = chatContainerSelector;
            this.inputSelector = inputSelector;
            this.debug = debug;
            this.messageReader = messageReader || window.BadooChatSuggestions.createBadooMessageReader();

            this.chatContainer = null;
            this.contextExtractor = null;
            this.suggestionEngine = null;
            this.ui = null;

            this.lastMessageCount = 0;
            this.updateTimeout = null;
            this.messageCheckInterval = null;
            this.periodicUpdateInterval = null;
            this.chatObserver = null;
            this.initRetryTimeout = null;
        }

        init() {
            this.chatContainer = document.querySelector(this.chatContainerSelector);

            if (!this.chatContainer) {
                if (this.debug) {
                    console.warn('[Badoo Chat Suggestions] Container de chat não encontrado, tentando novamente...');
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
                console.log('[Badoo Chat Suggestions] Inicializando...');
            }

            this.contextExtractor = new window.BadooChatSuggestions.ContextExtractor({
                debug: this.debug,
                messageReader: this.messageReader
            });
            this.suggestionEngine = new window.BadooChatSuggestions.SuggestionEngine({ debug: this.debug });
            this.ui = new window.BadooChatSuggestions.SuggestionsUI({ inputSelector: this.inputSelector });

            const mounted = this.ui.mount();
            this.info('Container de sugestões montado', { mounted, inputSelector: this.inputSelector });

            this.lastMessageCount = 0;
            this.updateSuggestions();

            this.setupObservers();

            if (this.debug) {
                console.log('[Badoo Chat Suggestions] Inicializado com sucesso!');
            }
        }

        setupObservers() {
            const checkForNewMessages = () => {
                if (!this.chatContainer) return;

                const currentMessages = this.chatContainer.querySelectorAll('[data-qa="chat-message"]');
                const currentCount = currentMessages.length;

                if (currentCount !== this.lastMessageCount) {
                    this.lastMessageCount = currentCount;
                    this.updateSuggestions();
                    if (this.debug) {
                        console.log(`[Badoo Chat Suggestions] Nova mensagem detectada! Total: ${currentCount}`);
                    }
                }
            };

            this.chatObserver = new MutationObserver((mutations) => {
                let hasNewMessage = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                if (node.matches && node.matches('[data-qa="chat-message"]')) {
                                    hasNewMessage = true;
                                } else if (node.querySelector && node.querySelector('[data-qa="chat-message"]')) {
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
                        this.lastMessageCount = this.chatContainer.querySelectorAll('[data-qa="chat-message"]').length;
                        if (this.debug) {
                            console.log('[Badoo Chat Suggestions] Sugestões atualizadas devido a nova mensagem');
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

            const context = this.contextExtractor.extract(this.chatContainer);
            const suggestions = this.suggestionEngine.generate(context);
            const safeSuggestions = suggestions.length > 0 ? suggestions : this.suggestionEngine.getDefaultSuggestions();
            this.ui.render(safeSuggestions);
            this.info('Sugestões atualizadas', {
                total: safeSuggestions.length,
                topics: context?.topics || []
            });
        }

        cleanup() {
            this.info('Limpando observadores e UI');
            if (this.chatObserver) {
                this.chatObserver.disconnect();
                this.chatObserver = null;
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
                console.info(`[Badoo Chat Suggestions] ${message}`, data);
            } else {
                console.info(`[Badoo Chat Suggestions] ${message}`);
            }
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.ChatSuggestionsController = ChatSuggestionsController;
})();
