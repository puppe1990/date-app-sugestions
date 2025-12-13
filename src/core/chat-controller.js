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
            this.aiClient = this.aiClient || this.createAIClient();
            this.suggestionEngine = new window.BadooChatSuggestions.SuggestionEngine({ debug: this.debug });
            this.ui = new window.BadooChatSuggestions.SuggestionsUI({
                inputSelector: this.inputSelector,
                placement: this.uiPlacement,
                onAiGenerate: (opts) => this.openAIPromptModal(opts),
                onAiCopyPrompt: (opts) => this.buildAIPrompts(opts)
            });

            const mounted = this.ui.mount();
            this.info('Container de sugestões montado', { mounted, inputSelector: this.inputSelector });

            this.lastMessageCount = 0;
            this.updateSuggestions();

            this.setupObservers();
            this.setupPlatformObservers();

            if (this.debug) {
                console.log('[Chat Suggestions] Inicializado com sucesso!');
            }
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
            this.updateSuggestions();
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
            this.info('Sugestões atualizadas', {
                total: safeSuggestions.length,
                topics: context?.topics || []
            });
            this.lastMessageCount = this.chatContainer.querySelectorAll(this.messageSelector).length;
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

            if (!apiKey) {
                this.info('OpenRouter não configurado; botão de IA ficará inativo');
                return null;
            }

            if (!window.BadooChatSuggestions.AIClient) {
                this.info('AIClient não disponível');
                return null;
            }

            return new window.BadooChatSuggestions.AIClient({ apiKey, model, profile, provider });
        }

        extractProfileText() {
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
                const pageProfile = this.extractProfileText();
                const profile = [configuredProfile, pageProfile].filter(Boolean).join('\n\n');
                const otherPersonName = this.extractOtherPersonName();

                if (this.debug && pageProfile) {
                    console.info('[Chat Suggestions][AI] Contexto extraído da página', { chars: pageProfile.length });
                }

                const aiSuggestions = await this.aiClient.generateSuggestions({ messages, profile, otherPersonName });
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
            const pageProfile = this.extractProfileText();
            const profile = [configuredProfile, pageProfile].filter(Boolean).join('\n\n');
            const otherPersonName = this.extractOtherPersonName();

            const { systemPrompt, userPrompt } = this.aiClient.buildPrompts({ messages, profile, otherPersonName });
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
