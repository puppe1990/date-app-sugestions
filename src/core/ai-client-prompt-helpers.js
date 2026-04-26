(() => {
    function buildSystemPrompt(profile, responseLength) {
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
        const businessToneLabel = this.getBusinessToneLabel(this.businessTone);
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

    function buildSystemPromptWithOtherPersonContext(
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

    function buildPrompts({
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

    function buildUserPrompt(
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

        const profileLine = profile ? `\nContexto sobre mim:\n${profile}` : '';
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

    const api = {
        buildPrompts,
        buildSystemPrompt,
        buildSystemPromptWithOtherPersonContext,
        buildUserPrompt,
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
    root.window.ChatSuggestions.AIClientPromptHelpers = api;
})();
