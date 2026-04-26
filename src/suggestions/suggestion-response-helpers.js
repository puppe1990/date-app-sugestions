(() => {
    function normalizeForMatch(text) {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function isWellbeingQuestion(text) {
        const normalized = normalizeForMatch(text);
        return (
            normalized.includes('tudo bem') ||
            normalized.includes('tudo certo') ||
            normalized.includes('como voce esta') ||
            normalized.includes('como vc esta') ||
            normalized.includes('como voce ta') ||
            normalized.includes('como vc ta') ||
            normalized.includes('como vai') ||
            normalized.includes('como esta')
        );
    }

    function isWorkTopic({ context, text }) {
        const lowerText = String(text || '').toLowerCase();
        return (
            context.topics.includes('trabalho') ||
            lowerText.includes('trabalho') ||
            lowerText.includes('trabalha') ||
            lowerText.includes('pedágio') ||
            lowerText.includes('pedagio') ||
            lowerText.includes('loja') ||
            lowerText.includes('porcelanato') ||
            lowerText.includes('engenheiro') ||
            lowerText.includes('desenvolvedor') ||
            lowerText.includes('software') ||
            lowerText.includes('meses') ||
            lowerText.includes('anos') ||
            context.lastMessages.some(
                (message) =>
                    message.text.toLowerCase().includes('trabalho') ||
                    message.text.toLowerCase().includes('trabalha') ||
                    message.text.toLowerCase().includes('pedágio') ||
                    message.text.toLowerCase().includes('faz o que') ||
                    message.text.toLowerCase().includes('profissão'),
            )
        );
    }

    function buildWellbeingReplies({ mode }) {
        if (mode === 'continuation') {
            return [
                'Tudo ótimo por aqui! E você, como está?',
                'Estou bem, obrigado por perguntar! Como foi seu dia?',
                'Tudo certo! O que você tem feito de bom hoje?',
                'Tudo bem, e você? Como está seu dia?',
                'Estou ótimo! O que tem feito hoje?',
            ];
        }

        return [
            'Estou bem, obrigado por perguntar! Como você está?',
            'Tudo ótimo por aqui. Como está seu dia?',
            'Tudo certo! O que você tem feito de bom hoje?',
            'Estou bem, e você? Como foi seu dia até agora?',
        ];
    }

    function buildWorkReplies({ includeLocationFollowUp = false }) {
        const replies = [
            'Que interessante!',
            'Gosta do que faz?',
            'Como é trabalhar nisso?',
        ];

        if (includeLocationFollowUp) {
            replies.push('E você, mora onde?');
        }

        replies.push('O que você gosta de fazer no tempo livre?');
        return replies;
    }

    const api = {
        normalizeForMatch,
        isWellbeingQuestion,
        isWorkTopic,
        buildWellbeingReplies,
        buildWorkReplies,
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
    root.window.ChatSuggestions.SuggestionResponseHelpers = api;
})();
