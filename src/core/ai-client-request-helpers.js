(() => {
    async function generateSuggestions({
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

    async function generateSuggestionsWithPrompts({
        systemPrompt,
        userPrompt,
    }) {
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

        if (typeof window !== 'undefined' && window.badooChatSuggestionsDebug) {
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

    async function callGemini({ prompt, maxOutputTokens }) {
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
                    typeof maxOutputTokens === 'number' ? maxOutputTokens : 160,
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

    function hasExtensionRuntime() {
        try {
            return Boolean(
                typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage,
            );
        } catch (e) {
            return false;
        }
    }

    async function requestJson(url, options) {
        if (this.hasExtensionRuntime()) {
            return this.requestJsonViaRuntime(url, options);
        }
        return this.requestJsonViaFetch(url, options);
    }

    async function requestJsonViaRuntime(url, options) {
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

    async function requestJsonViaFetch(url, options) {
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

    function buildRequestErrorMessage(response, url) {
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

    const api = {
        buildRequestErrorMessage,
        callGemini,
        generateSuggestions,
        generateSuggestionsWithPrompts,
        hasExtensionRuntime,
        requestJson,
        requestJsonViaFetch,
        requestJsonViaRuntime,
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
    root.window.ChatSuggestions.AIClientRequestHelpers = api;
})();
