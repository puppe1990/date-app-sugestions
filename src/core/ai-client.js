(() => {
    class AIClient {
        constructor({ apiKey, model = 'openai/gpt-4o', endpoint = 'https://openrouter.ai/api/v1/chat/completions' } = {}) {
            this.apiKey = apiKey;
            this.model = model;
            this.endpoint = endpoint;
        }

        async generateSuggestions({ messages }) {
            if (!this.apiKey) {
                throw new Error('OpenRouter API key não configurada');
            }

            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um assistente que gera respostas curtas e naturais para conversa casual de paquera em português do Brasil. Responda em frases curtas (max 80 caracteres cada), em primeira pessoa, mantendo o tom leve. Gere até 5 sugestões.'
                    },
                    {
                        role: 'user',
                        content: this.buildUserPrompt(messages)
                    }
                ],
                max_tokens: 256,
                temperature: 0.7,
                top_p: 0.9
            };

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

        buildUserPrompt(messages = []) {
            const lastMessages = messages.slice(-8);
            const mapped = lastMessages.map(msg => {
                const dir = msg.direction === 'out' ? 'EU' : 'ELA/ELE';
                return `${dir}: ${msg.text}`;
            }).join('\n');
            return `Baseie-se nesta conversa e sugira 3-5 respostas curtas e naturais em português do Brasil, sem repetir perguntas já feitas:\n${mapped}`;
        }

        extractSuggestions(text) {
            if (!text) return [];
            const lines = text
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
