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
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            executionHelpers.setAIRequestState({
                controller: this,
                loading: true,
            });
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

            const { safe } = await executionHelpers.runControllerAIGeneration({
                controller: this,
                request: (aiClient) =>
                    aiClient.generateSuggestions({
                        messages,
                        profile,
                        otherPersonName,
                        otherPersonProfile,
                        otherPersonContextNote,
                    }),
            });
            return safe;
        } catch (error) {
            console.error('[Chat Suggestions] Erro ao gerar via IA', error);
            alert(
                `Não foi possível gerar sugestões via IA.\n${error.message || ''}`,
            );
        } finally {
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            executionHelpers.setAIRequestState({
                controller: this,
                loading: false,
            });
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
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            executionHelpers.setAIRequestState({
                controller: this,
                loading: true,
            });
            const { trimmed } =
                await executionHelpers.runControllerAIGeneration({
                    controller: this,
                    request: (aiClient) =>
                        aiClient.generateSuggestionsWithPrompts({
                            systemPrompt: this.applyPersonalityToSystemPrompt(
                                prompts.systemPrompt,
                                personality,
                            ),
                            userPrompt: prompts.userPrompt,
                        }),
                });
            return trimmed;
        } catch (error) {
            console.error('[Chat Suggestions] Erro ao responder com IA', error);
            alert(
                `Não foi possível gerar a resposta com IA.\n${error.message || ''}`,
            );
            return '';
        } finally {
            const executionHelpers =
                window.ChatSuggestions.ChatAIExecutionHelpers || {};
            executionHelpers.setAIRequestState({
                controller: this,
                loading: false,
            });
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
                    const executionHelpers =
                        window.ChatSuggestions.ChatAIExecutionHelpers || {};
                    executionHelpers.setAIRequestState({
                        controller: this,
                        loading: true,
                        sendingPrompt: true,
                    });
                    await executionHelpers.runControllerAIGeneration({
                        controller: this,
                        request: (aiClient) =>
                            aiClient.generateSuggestionsWithPrompts({
                                systemPrompt: editedSystem,
                                userPrompt: editedUser,
                            }),
                        closePromptModal: true,
                    });
                } catch (error) {
                    console.error(
                        '[Chat Suggestions] Erro ao gerar via IA',
                        error,
                    );
                    alert(
                        `Não foi possível gerar sugestões via IA.\n${error.message || ''}`,
                    );
                } finally {
                    const executionHelpers =
                        window.ChatSuggestions.ChatAIExecutionHelpers || {};
                    executionHelpers.setAIRequestState({
                        controller: this,
                        loading: false,
                    });
                }
            },
        });
    }

    const api = {
        applyPersonalityToSystemPrompt,
        buildAIPrompts,
        createAIClient,
        generateAIReplySuggestions,
        generateAISuggestions,
        openAIPromptModal,
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
