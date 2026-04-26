(() => {
    function buildContextualSuggestions(context) {
        const suggestions = [];

        if (context.topics.includes('trabalho')) {
            suggestions.push('Gosto muito do que faço');
            suggestions.push('É uma área que sempre me interessou');
            suggestions.push('É um trabalho que me realiza');
            suggestions.push('Amo o que faço');
            suggestions.push('É desafiador e gratificante');
        }

        if (context.topics.includes('localização')) {
            suggestions.push('É uma região legal');
            suggestions.push('Já conhece por aqui?');
            suggestions.push('É um lugar bem agradável');
            suggestions.push('Gosto muito daqui');
            suggestions.push('É uma região bem completa');
        }

        if (context.topics.includes('interesse')) {
            suggestions.push('Que tal nos conhecermos melhor?');
            suggestions.push('Gostaria de conversar mais');
            suggestions.push('Seria legal nos conhecermos');
            suggestions.push('Que tal conversarmos mais?');
            suggestions.push('Adoraria te conhecer melhor');
        }

        if (context.topics.includes('saudação')) {
            suggestions.push('Oi! Como você está?');
            suggestions.push('Olá! Tudo bem?');
            suggestions.push('Oi! Espero que esteja bem');
        }

        if (context.topics.includes('hobby')) {
            suggestions.push('Gosto de ler e assistir séries');
            suggestions.push('Adoro música e cinema');
            suggestions.push('Gosto de esportes e atividades ao ar livre');
            suggestions.push('Curto tecnologia e inovação');
            suggestions.push('Gosto de viajar e conhecer lugares novos');
        }

        if (context.topics.includes('encontro')) {
            suggestions.push('Adoraria! Quando você pode?');
            suggestions.push('Seria ótimo! Vamos combinar');
            suggestions.push('Combinado! Qual dia funciona melhor?');
            suggestions.push('Que legal! Vamos marcar');
            suggestions.push('Perfeito! Quando você está livre?');
        }

        suggestions.push('Que tal conversarmos mais?');
        suggestions.push('Gostaria de te conhecer melhor');
        suggestions.push('Seria legal nos conhecermos');
        suggestions.push('Adoraria conversar mais contigo');
        suggestions.push('Que tal marcarmos algo?');
        suggestions.push('Gostaria de te conhecer pessoalmente');
        suggestions.push('Seria incrível nos encontrarmos');

        return suggestions;
    }

    function hasTopicBeenDiscussed({ context, topic, topicKeywords }) {
        const keywords = topicKeywords[topic] || [];
        if (keywords.length === 0) return false;

        let hasQuestion = false;
        let hasAnswer = false;

        context.lastMessages.forEach((message) => {
            const text = message.text.toLowerCase();
            const containsKeyword = keywords.some((keyword) =>
                text.includes(keyword),
            );

            if (!containsKeyword) return;

            if (text.includes('?')) {
                hasQuestion = true;
                return;
            }

            hasAnswer = true;
        });

        return hasQuestion || hasAnswer;
    }

    const api = {
        buildContextualSuggestions,
        hasTopicBeenDiscussed,
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
    root.window.ChatSuggestions.SuggestionTopicHelpers = api;
})();
