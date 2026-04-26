(() => {
    class AIClient {
        constructor({
            apiKey,
            model = 'google/gemini-2.0-flash-exp:free',
            endpoint = null,
            provider = 'gemini',
            profile = null,
            responseLength = 'short',
            businessModeEnabled = false,
            businessContext = '',
            businessTone = 'consultivo',
        } = {}) {
            this.apiKey = apiKey;
            this.model = model;
            this.provider = provider || 'gemini';
            this.endpoint =
                endpoint || this.getDefaultEndpointForProvider(this.provider);
            this.profile = profile;
            this.otherPersonProfile = null;
            this.responseLength = responseLength || 'short';
            this.businessModeEnabled = Boolean(businessModeEnabled);
            this.businessContext = businessContext || '';
            this.businessTone = businessTone || 'consultivo';
        }

        getDefaultEndpointForProvider(provider) {
            if (provider === 'nvidia') {
                return 'https://integrate.api.nvidia.com/v1/chat/completions';
            }
            return 'https://openrouter.ai/api/v1/chat/completions';
        }

        getResponseLengthConfig(responseLength) {
            const value = String(
                responseLength || this.responseLength || 'short',
            );
            const map = {
                short: {
                    label: 'curta',
                    maxChars: 80,
                    maxTokens: 180,
                },
                medium: {
                    label: 'média',
                    maxChars: 160,
                    maxTokens: 320,
                },
                long: {
                    label: 'longa',
                    maxChars: 280,
                    maxTokens: 520,
                },
            };
            return map[value] || map.short;
        }

        buildSystemPrompt(profile, responseLength) {
            this.profile = this.profile || profile;
            const profileLine = this.profile
                ? `\nContexto sobre o usuário:\n${this.profile}`
                : '';
            const otherPersonProfileLine = this.otherPersonProfile
                ? `\nContexto sobre a outra pessoa (perfil):\n${this.otherPersonProfile}`
                : '';
            const cfg = this.getResponseLengthConfig(responseLength);
            const businessContextLine =
                this.businessModeEnabled && this.businessContext
                    ? `\nContexto do que estou vendendo:\n${this.businessContext}`
                    : '';
            const businessToneLabel = this.getBusinessToneLabel(
                this.businessTone,
            );
            const baseLines = this.businessModeEnabled
                ? [
                      'Você é um assistente que gera respostas curtas e naturais para conversa comercial e vendas no WhatsApp, em português do Brasil.',
                      `Gere sugestões em primeira pessoa, tom ${businessToneLabel}, tamanho ${cfg.label} (máx ${cfg.maxChars} caracteres por sugestão).`,
                      'Seja consultivo(a), educado(a) e avance a conversa com perguntas úteis. Evite pressão.',
                      'Quando fizer sentido, sugira próximo passo (ex.: tirar dúvidas, enviar catálogo, agendar).',
                      'Não use cumprimentos (oi, olá, bom dia, boa tarde, boa noite) a menos que a última mensagem peça isso explicitamente.',
                      'Sempre devolva APENAS JSON válido no formato {"suggestions":["...","..."]} sem texto extra, sem markdown, sem explicações, sem raciocínio exposto, sem texto fora do JSON. Assim que fechar o JSON, pare a geração.',
                  ]
                : [
                      'Você é um assistente que gera respostas curtas e naturais para conversa casual em português do Brasil.',
                      `Gere sugestões em primeira pessoa, tom leve, tamanho ${cfg.label} (máx ${cfg.maxChars} caracteres por sugestão).`,
                      'Não use cumprimentos (oi, olá, bom dia, boa tarde, boa noite) a menos que a última mensagem peça isso explicitamente.',
                      'Sempre devolva APENAS JSON válido no formato {"suggestions":["...","..."]} sem texto extra, sem markdown, sem explicações, sem raciocínio exposto, sem texto fora do JSON. Assim que fechar o JSON, pare a geração.',
                  ];
            return [
                ...baseLines,
                profileLine,
                businessContextLine,
                otherPersonProfileLine,
            ]
                .filter(Boolean)
                .join('\n');
        }

        buildSystemPromptWithOtherPersonContext(
            profile,
            responseLength,
            otherPersonContextNote,
        ) {
            const base = this.buildSystemPrompt(profile, responseLength);
            const note = String(otherPersonContextNote || '').trim();
            if (!note) return base;
            return [
                base,
                `\nContexto adicional sobre a outra pessoa (anotações do usuário):\n${note}`,
            ]
                .filter(Boolean)
                .join('\n');
        }

        buildPrompts({
            messages,
            profile,
            otherPersonName,
            responseLength,
            otherPersonProfile,
            otherPersonContextNote,
        } = {}) {
            this.otherPersonProfile =
                otherPersonProfile || this.otherPersonProfile || null;
            const userPrompt = this.buildUserPrompt(
                messages,
                profile,
                otherPersonName,
                responseLength,
                otherPersonProfile,
                otherPersonContextNote,
            );
            const systemPrompt = this.buildSystemPromptWithOtherPersonContext(
                profile,
                responseLength,
                otherPersonContextNote,
            );
            return { systemPrompt, userPrompt };
        }

        async generateSuggestions({
            messages,
            profile,
            otherPersonName,
            responseLength,
            otherPersonProfile,
            otherPersonContextNote,
        } = {}) {
            if (!this.apiKey) {
                throw new Error('API key não configurada');
            }

            const { systemPrompt, userPrompt } = this.buildPrompts({
                messages,
                profile,
                otherPersonName,
                responseLength,
                otherPersonProfile,
                otherPersonContextNote,
            });
            return this.generateSuggestionsWithPrompts({
                systemPrompt,
                userPrompt,
            });
        }

        async generateSuggestionsWithPrompts({ systemPrompt, userPrompt }) {
            if (!this.apiKey) {
                throw new Error('API key não configurada');
            }

            const cfg = this.getResponseLengthConfig(this.responseLength);

            if (this.provider === 'gemini') {
                if (
                    typeof window !== 'undefined' &&
                    window.badooChatSuggestionsDebug
                ) {
                    console.info(
                        '[Chat Suggestions][AI] Prompt enviado para IA (Gemini):',
                        {
                            model: this.model,
                            prompt: `${systemPrompt}\n\n${userPrompt}`,
                        },
                    );
                }
                return this.callGemini({
                    prompt: `${systemPrompt}\n\n${userPrompt}`,
                    maxOutputTokens: cfg.maxTokens,
                }).then((suggestions) =>
                    this.sanitizeSuggestions(suggestions, userPrompt),
                );
            }

            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
                max_tokens: cfg.maxTokens,
                temperature: 0.6,
                top_p: 0.9,
                stream: false,
                response_format: { type: 'json_object' },
            };

            if (
                typeof window !== 'undefined' &&
                window.badooChatSuggestionsDebug
            ) {
                console.info(
                    `[Chat Suggestions][AI] Prompt enviado para IA (${this.provider === 'nvidia' ? 'NVIDIA' : 'OpenRouter'}):`,
                    { model: this.model, payload },
                );
            }

            const response = await this.requestJson(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            const choice = response?.choices?.[0];
            const content =
                choice?.message?.content || choice?.message?.reasoning || '';
            return this.sanitizeSuggestions(
                this.extractSuggestions(content),
                userPrompt,
            );
        }

        async callGemini({ prompt, maxOutputTokens }) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            const body = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens:
                        typeof maxOutputTokens === 'number'
                            ? maxOutputTokens
                            : 160,
                    topP: 0.9,
                },
            };

            const data = await this.requestJson(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const text =
                data?.candidates?.[0]?.content?.parts
                    ?.map((p) => p.text)
                    .filter(Boolean)
                    .join('\n') || '';
            return this.extractSuggestions(text);
        }

        hasExtensionRuntime() {
            try {
                return Boolean(
                    typeof chrome !== 'undefined' &&
                    chrome?.runtime?.sendMessage,
                );
            } catch (e) {
                return false;
            }
        }

        async requestJson(url, options) {
            if (this.hasExtensionRuntime()) {
                return this.requestJsonViaRuntime(url, options);
            }
            return this.requestJsonViaFetch(url, options);
        }

        async requestJsonViaRuntime(url, options) {
            return new Promise((resolve, reject) => {
                try {
                    chrome.runtime.sendMessage(
                        {
                            type: 'CHAT_SUGGESTIONS_FETCH',
                            url,
                            options,
                        },
                        (response) => {
                            const runtimeError = chrome?.runtime?.lastError;
                            if (runtimeError) {
                                reject(new Error(runtimeError.message));
                                return;
                            }
                            if (!response?.ok) {
                                reject(
                                    new Error(
                                        this.buildRequestErrorMessage(
                                            response,
                                            url,
                                        ),
                                    ),
                                );
                                return;
                            }
                            resolve(response.data);
                        },
                    );
                } catch (error) {
                    reject(error);
                }
            });
        }

        async requestJsonViaFetch(url, options) {
            const response = await fetch(url, options);
            if (!response.ok) {
                let errorText = response.statusText;
                try {
                    const raw = await response.text();
                    errorText = raw || response.statusText;
                    const json = JSON.parse(raw);
                    if (json?.error?.message) {
                        errorText = json.error.message;
                    }
                } catch (e) {
                    // ignore parse error
                }
                throw new Error(
                    this.buildRequestErrorMessage(
                        {
                            status: response.status,
                            errorText,
                        },
                        url,
                    ),
                );
            }
            return response.json();
        }

        buildRequestErrorMessage(response, url) {
            const status = Number(response?.status || 0);
            const errorText = String(
                response?.errorText || response?.error || 'Falha na requisição',
            );
            if (url.includes('generativelanguage.googleapis.com')) {
                return `Erro Gemini (${status || 'sem status'}): ${errorText}`;
            }
            const label = this.provider === 'nvidia' ? 'NVIDIA' : 'OpenRouter';
            return `Erro ${label} (${status || 'sem status'}): ${errorText}`;
        }

        buildUserPrompt(
            messages = [],
            profile,
            otherPersonName,
            responseLength,
            otherPersonProfile,
            otherPersonContextNote,
        ) {
            const cfg = this.getResponseLengthConfig(responseLength);
            const lastMessages = messages.slice(-25);
            const mapped = lastMessages
                .map((msg, idx) => {
                    const senderName =
                        msg.sender &&
                        !['Outro', 'OUTRA PESSOA'].includes(msg.sender)
                            ? msg.sender
                            : otherPersonName || 'OUTRA PESSOA';
                    const dir = msg.direction === 'out' ? 'EU' : senderName;
                    return `${idx + 1}. ${dir}: ${msg.text}`;
                })
                .join('\n');

            const lastInboundIndex =
                [...lastMessages]
                    .map((m, i) => ({ m, i }))
                    .reverse()
                    .find((item) => item.m.direction !== 'out')?.i ?? -1;
            const lastOutboundIndex =
                [...lastMessages]
                    .map((m, i) => ({ m, i }))
                    .reverse()
                    .find((item) => item.m.direction === 'out')?.i ?? -1;
            const hasPendingInbound =
                lastInboundIndex > lastOutboundIndex && lastInboundIndex >= 0;
            const pendingMessage = hasPendingInbound
                ? lastMessages[lastInboundIndex]
                : null;
            const lastMyMessage = [...lastMessages]
                .reverse()
                .find((m) => m.direction === 'out');

            const profileLine = profile
                ? `\nContexto sobre mim:\n${profile}`
                : '';
            const otherPersonContextLine = otherPersonContextNote
                ? `\nContexto adicional (anotações):\n${otherPersonContextNote}`
                : '';
            const otherPersonLine = otherPersonName
                ? `\nNome da outra pessoa: ${otherPersonName}`
                : '';
            const businessContextLine =
                this.businessModeEnabled && this.businessContext
                    ? `\nContexto da oferta:\n${this.businessContext}`
                    : '';
            const businessToneLine = this.businessModeEnabled
                ? `\nTom desejado: ${this.getBusinessToneLabel(this.businessTone)}.`
                : '';
            const focusLine = pendingMessage
                ? `\nMensagem pendente da outra pessoa: "${pendingMessage.text}". Responda a isso diretamente, sem cumprimentar.`
                : 'Nenhuma mensagem pendente; continue a conversa com um follow-up natural (sem cumprimentar nem repetir perguntas).';
            const myLastLine = lastMyMessage
                ? `\nMinha última mensagem: "${lastMyMessage.text}".`
                : '';
            const pendingText = String(pendingMessage?.text || '').trim();
            const pendingPriorityLines = pendingMessage
                ? [
                      'PRIORIDADE MÁXIMA: responda diretamente à mensagem pendente antes de puxar assuntos amplos do perfil ou temas genéricos.',
                      'Se a mensagem pendente fizer uma pergunta objetiva, suas sugestões devem responder essa pergunta de forma direta e concreta.',
                  ]
                : [];
            const pendingQuestionSpecificLines =
                pendingMessage &&
                /o q gostaria de saber|oq gostaria de saber|o que gostaria de saber/i.test(
                    pendingText,
                )
                    ? [
                          'Se a outra pessoa perguntou o que eu quero saber, responda com exemplos concretos do que eu gostaria de saber sobre ela, sem desviar para uma lista genérica de interesses.',
                      ]
                    : [];

            return [
                'Use o histórico abaixo (ordem cronológica).',
                `Gere 3 a 5 respostas em primeira pessoa, naturais e coerentes com o histórico (máx ${cfg.maxChars} caracteres por sugestão).`,
                'Não cumprimente de novo se já houve cumprimento. Não repita perguntas já feitas. Evite respostas genéricas.',
                'Nunca abra com saudações genéricas como "oi", "olá", "boa tarde" ou "como você está?" se o chat já está em andamento.',
                'Se a mensagem pendente for curta e confirmatória (ex.: "sim", "siiim", "super", "perto", "kkk"), continue o assunto em andamento em vez de reiniciar a conversa.',
                'Quando a conversa já está em um tema concreto, responda em cima desse tema concreto e, se fizer sentido, avance um passo a partir dele.',
                'Cada sugestão deve se apoiar em pelo menos um detalhe concreto do histórico recente (tema, lugar, pergunta, reação ou fato citado).',
                ...pendingPriorityLines,
                ...pendingQuestionSpecificLines,
                'Exemplo ruim para conversa em andamento: "Boa tarde! Tudo bem?", "Como você está?", "Boa tarde! Como está seu dia?".',
                'Exemplo bom: pegar o último assunto e avançar em cima dele, sem reiniciar o papo.',
                'Responda APENAS com JSON válido: {"suggestions":["resposta1","resposta2",...]} sem texto extra, sem markdown, sem texto antes/depois. Não inclua saudações a menos que a última mensagem peça. Assim que fechar o JSON, pare.',
                profileLine,
                businessContextLine,
                businessToneLine,
                otherPersonContextLine,
                otherPersonLine,
                focusLine,
                myLastLine,
                '\nHistórico:',
                mapped,
            ]
                .filter(Boolean)
                .join('\n');
        }

        getBusinessToneLabel(tone) {
            const value = String(tone || '').toLowerCase();
            const map = {
                consultivo: 'consultivo',
                direto: 'direto',
                persuasivo: 'persuasivo',
                amigavel: 'amigável',
                premium: 'premium',
            };
            return map[value] || map.consultivo;
        }

        extractSuggestions(text) {
            if (!text) return [];

            const suggestions = [];
            const pushSuggestions = (arr) => {
                if (!Array.isArray(arr)) return;
                arr.forEach((item) => {
                    if (typeof item === 'string') {
                        const trimmed = item.trim();
                        if (trimmed) suggestions.push(trimmed);
                    }
                });
            };

            const tryParse = (snippet) => {
                try {
                    const json = JSON.parse(snippet);
                    if (json && Array.isArray(json.suggestions)) {
                        pushSuggestions(json.suggestions);
                        return true;
                    }
                } catch (e) {
                    return false;
                }
                return false;
            };

            // 1) tentativa direta
            if (tryParse(text)) {
                return Array.from(new Set(suggestions)).slice(0, 5);
            }

            // 2) limpar markdown e tentar novamente
            const cleaned = text
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();
            if (tryParse(cleaned)) {
                return Array.from(new Set(suggestions)).slice(0, 5);
            }

            // 3) extrair múltiplos JSONs no texto
            const jsonMatches = cleaned.match(
                /{[^{}]*"suggestions"\s*:\s*\[[\s\S]*?\]}/g,
            );
            if (jsonMatches) {
                jsonMatches.forEach((snippet) => tryParse(snippet));
            }
            if (suggestions.length > 0) {
                return Array.from(new Set(suggestions)).slice(0, 5);
            }

            // se não conseguiu extrair JSON, devolve vazio para cair no fallback padrão
            return [];
        }

        sanitizeSuggestions(suggestions, userPrompt) {
            const unique = [];
            const seen = new Set();
            const chatInProgress = this.isChatAlreadyInProgress(userPrompt);

            suggestions.forEach((item) => {
                const suggestion = String(item || '').trim();
                if (!suggestion) return;

                if (
                    chatInProgress &&
                    this.isGenericConversationRestart(suggestion)
                ) {
                    return;
                }

                const normalized = suggestion.toLowerCase();
                if (seen.has(normalized)) return;
                seen.add(normalized);
                unique.push(suggestion);
            });

            return unique.slice(0, 5);
        }

        isChatAlreadyInProgress(userPrompt) {
            const prompt = String(userPrompt || '');
            if (!prompt) return false;

            const historyMatches =
                prompt.match(/\n\d+\.\s+(?:EU|[^\n:]+):\s+/g) || [];
            return historyMatches.length >= 3;
        }

        isGenericConversationRestart(text) {
            const normalized = String(text || '')
                .trim()
                .toLowerCase();
            if (!normalized) return false;

            return [
                /^(oi|olá|ola|bom dia|boa tarde|boa noite)[!,. ]*/,
                /\bcomo você está\b/,
                /\bcomo vc está\b/,
                /\btudo bem\b/,
                /\bcomo está seu dia\b/,
                /\bcomo foi seu dia\b/,
            ].some((pattern) => pattern.test(normalized));
        }
    }

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.AIClient = AIClient;
})();
