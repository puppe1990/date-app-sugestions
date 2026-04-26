(() => {
    function createAIClient() {
        const providerConfig = window.ChatSuggestions?.ProviderConfig || {};
        const globalConfig = window.badooChatSuggestionsConfig || {};
        const aiHelpers = window.ChatSuggestions.ChatAIHelpers || {};
        const config = aiHelpers.buildAIConfig({
            aiClientConfig: this.aiClientConfig,
            globalConfig,
            providerConfig,
        });
        const apiKey = config.apiKey;
        const provider = config.provider;

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
            model: config.model,
            profile: config.profile,
            provider,
            responseLength: config.responseLength,
            businessModeEnabled: Boolean(config.businessModeEnabled),
            businessContext: config.businessContext || '',
            businessTone: config.businessTone || 'consultivo',
        });
    }

    function setAIResponseLength(responseLength) {
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

    async function generateAISuggestions() {
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
            const context = this.contextExtractor.extract(this.chatContainer, {
                fullHistory: true,
            });
            const messages =
                context?.allMessages || context?.lastMessages || [];
            const configuredProfile =
                (this.aiClientConfig && this.aiClientConfig.profile) ||
                (window.badooChatSuggestionsConfig &&
                    window.badooChatSuggestionsConfig.openRouterProfile);
            const profile = [configuredProfile].filter(Boolean).join('\n\n');
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

            const aiHelpers = window.ChatSuggestions.ChatAIHelpers || {};
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            const { safe } = await executionHelpers.runAIGeneration({
                aiClient: this.aiClient,
                fallbackSuggestions:
                    this.suggestionEngine.getDefaultSuggestions(),
                request: (aiClient) =>
                    aiClient.generateSuggestions({
                        messages,
                        profile,
                        otherPersonName,
                        otherPersonProfile,
                        otherPersonContextNote,
                    }),
                normalizeAISuggestions: aiHelpers.normalizeAISuggestions,
            });
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

    async function generateAIReplySuggestions({ personality } = {}) {
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
            const aiHelpers = window.ChatSuggestions.ChatAIHelpers || {};
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            const { safe, trimmed } = await executionHelpers.runAIGeneration({
                aiClient: this.aiClient,
                fallbackSuggestions:
                    this.suggestionEngine.getDefaultSuggestions(),
                request: (aiClient) =>
                    aiClient.generateSuggestionsWithPrompts({
                        systemPrompt: this.applyPersonalityToSystemPrompt(
                            prompts.systemPrompt,
                            personality,
                        ),
                        userPrompt: prompts.userPrompt,
                    }),
                normalizeAISuggestions: aiHelpers.normalizeAISuggestions,
            });
            this.ui.render(safe, { isAI: true });
            return trimmed;
        } catch (error) {
            console.error('[Chat Suggestions] Erro ao responder com IA', error);
            alert(
                `Não foi possível gerar a resposta com IA.\n${error.message || ''}`,
            );
            return '';
        } finally {
            this.aiLoading = false;
            this.ui.setAiLoading(false);
        }
    }

    function applyPersonalityToSystemPrompt(systemPrompt, personality) {
        const promptBuilder = window.ChatSuggestions.AIPromptBuilder || {};
        return promptBuilder.applyPersonalityToSystemPrompt({
            systemPrompt,
            personality,
            buildPersonalityAddon: this.ui?.buildPersonalityAddon,
        });
    }

    function buildAIPrompts({ personality } = {}) {
        if (this.aiLoading) return;
        if (!this.aiClient) {
            this.info('IA não configurada; defina a chave do provider no .env');
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
                    chars: otherPersonProfile ? otherPersonProfile.length : 0,
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

    function openAIPromptModal({ personality } = {}) {
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
                    const aiHelpers =
                        window.ChatSuggestions.ChatAIHelpers || {};
                    const executionHelpers =
                        window.ChatSuggestions.ChatAIExecutionHelpers || {};
                    const { safe } = await executionHelpers.runAIGeneration({
                        aiClient: this.aiClient,
                        fallbackSuggestions:
                            this.suggestionEngine.getDefaultSuggestions(),
                        request: (aiClient) =>
                            aiClient.generateSuggestionsWithPrompts({
                                systemPrompt: editedSystem,
                                userPrompt: editedUser,
                            }),
                        normalizeAISuggestions:
                            aiHelpers.normalizeAISuggestions,
                    });
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

    function getCurrentHost() {
        const configHelpers = window.ChatSuggestions.ChatConfigHelpers || {};
        return configHelpers.getCurrentHost(location.href);
    }

    function attachConfigListener() {
        if (!chrome?.storage?.onChanged || this.boundStorageChange) return;
        this.boundStorageChange = (changes, areaName) => {
            if (areaName !== 'local') return;
            const configHelpers =
                window.ChatSuggestions.ChatConfigHelpers || {};
            const shouldRefresh =
                configHelpers.shouldRefreshBusinessMode(changes);
            if (!shouldRefresh) return;
            this.refreshBusinessModeFromStorage();
        };
        chrome.storage.onChanged.addListener(this.boundStorageChange);
    }

    function refreshBusinessModeFromStorage() {
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
                const configHelpers =
                    window.ChatSuggestions.ChatConfigHelpers || {};
                this.updateBusinessModeConfig(
                    configHelpers.buildBusinessModeConfig({
                        result,
                        host: this.getCurrentHost(),
                    }),
                );
            },
        );
    }

    function updateBusinessModeConfig({
        businessModeEnabled,
        businessContext,
        businessTone,
        profileCasual,
        profileBusiness,
    }) {
        const mode = businessModeEnabled ? 'business' : 'casual';
        const profile = mode === 'business' ? profileBusiness : profileCasual;
        this.aiClientConfig = this.aiClientConfig || {};
        this.aiClientConfig.businessModeEnabled = Boolean(businessModeEnabled);
        this.aiClientConfig.businessContext = businessContext || '';
        this.aiClientConfig.businessTone = businessTone || 'consultivo';
        this.aiClientConfig.profile = profile || '';

        if (this.aiClient) {
            this.aiClient.businessModeEnabled = Boolean(businessModeEnabled);
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

    const api = {
        applyPersonalityToSystemPrompt,
        attachConfigListener,
        buildAIPrompts,
        createAIClient,
        generateAIReplySuggestions,
        generateAISuggestions,
        getCurrentHost,
        openAIPromptModal,
        refreshBusinessModeFromStorage,
        setAIResponseLength,
        updateBusinessModeConfig,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    const root =
        typeof globalThis !== 'undefined'
            ? globalThis
            : typeof window !== 'undefined'
              ? window
              : {};
    root.window = root.window || root;
    root.window.ChatSuggestions = root.window.ChatSuggestions || {};
    root.window.ChatSuggestions.ChatControllerAIActions = api;
})();
