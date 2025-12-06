(() => {
    class AIClient {
        constructor({ apiKey, model = 'openai/gpt-4o', endpoint = 'https://openrouter.ai/api/v1/chat/completions' } = {}) {
            this.apiKey = apiKey;
            this.model = model;
            this.endpoint = endpoint;
        }

        async generateSuggestions({ messages, profile }) {
            if (!this.apiKey) {
                throw new Error('OpenRouter API key não configurada');
            }

            const userPrompt = this.buildUserPrompt(messages, profile);
            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um assistente que gera respostas curtas e naturais para conversa casual em português do Brasil. Responda em frases curtas (máx 80 caracteres), em primeira pessoa, tom leve. Sempre devolva APENAS JSON válido no formato {"suggestions":["...","..."]} sem texto extra, sem markdown, sem aspas fora do JSON.'
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: 256,
                temperature: 0.7,
                top_p: 0.9
            };

            if (typeof window !== 'undefined' && window.badooChatSuggestionsDebug) {
                console.info('[Badoo Chat Suggestions][AI] Prompt enviado para IA:', { model: this.model, payload });
            }

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

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
                throw new Error(`Erro OpenRouter (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return this.extractSuggestions(content);
        }

        buildUserPrompt(messages = [], profile) {
            const lastMessages = messages.slice(-25);
            const mapped = lastMessages.map((msg, idx) => {
                const dir = msg.direction === 'out' ? 'EU' : 'OUTRA PESSOA';
                return `${idx + 1}. ${dir}: ${msg.text}`;
            }).join('\n');

            const lastPartnerMessage = [...lastMessages].reverse().find(m => m.direction !== 'out');
            const lastMyMessage = [...lastMessages].reverse().find(m => m.direction === 'out');

            const profileLine = profile ? `\nContexto sobre mim:\n${profile}` : '';
            const focusLine = lastPartnerMessage
                ? `\nÚltima mensagem da outra pessoa: "${lastPartnerMessage.text}". Responda a isso diretamente.`
                : '';
            const myLastLine = lastMyMessage ? `\nMinha última mensagem: "${lastMyMessage.text}".` : '';

            return [
                'Use o histórico abaixo (ordem cronológica) para responder a última mensagem da outra pessoa.',
                'Gere 3 a 5 respostas curtas (até 80 caracteres), em primeira pessoa, naturais e coerentes com o histórico.',
                'Não cumprimente de novo se já houve cumprimento. Não repita perguntas já feitas. Evite respostas genéricas.',
                'Responda APENAS com JSON válido: {"suggestions":["resposta1","resposta2",...]} sem texto extra.',
                profileLine,
                focusLine,
                myLastLine,
                '\nHistórico:',
                mapped
            ].filter(Boolean).join('\n');
        }

        extractSuggestions(text) {
            if (!text) return [];

            const suggestions = [];
            const pushSuggestions = (arr) => {
                if (!Array.isArray(arr)) return;
                arr.forEach(item => {
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
            const jsonMatches = cleaned.match(/{[^{}]*"suggestions"\s*:\s*\[[\s\S]*?\]}/g);
            if (jsonMatches) {
                jsonMatches.forEach(snippet => tryParse(snippet));
            }
            if (suggestions.length > 0) {
                return Array.from(new Set(suggestions)).slice(0, 5);
            }

            // 4) fallback para linhas
            const lines = cleaned
                .split(/\r?\n/)
                .map(line => line.replace(/^[\s*-]*\d*[\s)*.-]*/, '').trim())
                .filter(Boolean);
            if (lines.length > 0) {
                return Array.from(new Set(lines)).slice(0, 5);
            }

            return [text.trim()].filter(Boolean).slice(0, 5);
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.AIClient = AIClient;
})();
