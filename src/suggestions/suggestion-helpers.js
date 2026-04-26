(() => {
    function findPlaceByDirection(context, direction, normalizedPlaces) {
        if (!context.lastMessages || normalizedPlaces.length === 0) return null;

        for (let i = context.lastMessages.length - 1; i >= 0; i--) {
            const message = context.lastMessages[i];
            if (message.direction !== direction || !message.text) continue;

            const lower = message.text.toLowerCase();
            const matchIndex = normalizedPlaces.findIndex((place) =>
                lower.includes(place),
            );
            if (matchIndex !== -1) {
                return context.mentionedPlaces[matchIndex];
            }
        }

        return null;
    }

    function buildPersonalizedSuggestions(context) {
        const suggestions = [];
        const normalizedPlaces = (context.mentionedPlaces || []).map((place) =>
            place.toLowerCase(),
        );
        const lastMessage =
            context.lastMessages[context.lastMessages.length - 1];
        const lastOutbound = context.lastMessages
            .filter((message) => message.direction === 'out')
            .slice(-1)[0];

        const inboundPlace = findPlaceByDirection(
            context,
            'in',
            normalizedPlaces,
        );
        const myPlace = findPlaceByDirection(context, 'out', normalizedPlaces);
        const myPlaceLower = myPlace ? myPlace.toLowerCase() : '';
        const lastOutboundHasMyPlace = Boolean(
            lastOutbound &&
            myPlaceLower &&
            lastOutbound.text.toLowerCase().includes(myPlaceLower),
        );
        const lastIsOutWithPlace = Boolean(
            lastMessage &&
            lastMessage.direction === 'out' &&
            myPlaceLower &&
            lastMessage.text.toLowerCase().includes(myPlaceLower),
        );

        if (inboundPlace && !(lastIsOutWithPlace && lastOutboundHasMyPlace)) {
            suggestions.push(`Legal, ${inboundPlace}!`);
            suggestions.push(`${inboundPlace} é uma região bem legal.`);
            suggestions.push(`Você gosta de ${inboundPlace}?`);
            if (myPlace && !lastOutboundHasMyPlace) {
                suggestions.push(`Eu sou de ${myPlace}.`);
            }
            suggestions.push('Costuma sair por aí?');
        }

        if (context.mentionedJobs.length > 0) {
            const job = context.mentionedJobs[0];
            suggestions.push(
                `Que interessante! Trabalha com ${job} há quanto tempo?`,
            );
            suggestions.push(`Adoro pessoas que trabalham com ${job}`);
        }

        if (context.mentionedHobbies.length > 0) {
            const hobbies = context.mentionedHobbies.slice(0, 2).join(' e ');
            suggestions.push(`Que legal! Também gosto de ${hobbies}`);
            suggestions.push(`Adoro ${hobbies}!`);
        }

        if (context.hasQuestions && context.questions.length > 0) {
            const lastQuestion =
                context.questions[context.questions.length - 1];
            if (
                lastQuestion.includes('onde') ||
                lastQuestion.includes('mora')
            ) {
                suggestions.push('Moro em São Paulo');
                suggestions.push(
                    'Moro no bairro de Tatuapé, São Paulo capital',
                );
                suggestions.push('Moro no bairro de Tatuapé');
                suggestions.push('Sou da capital');
            } else if (
                lastQuestion.includes('faz') ||
                lastQuestion.includes('trabalho')
            ) {
                suggestions.push('Sou desenvolvedor de software');
                suggestions.push('Sou desenvolvedor de software numa startup');
                suggestions.push('Tenho um consultoria de tecnologia');
                suggestions.push('Trabalho com tecnologia');
            }
        }

        return suggestions;
    }

    function buildDefaultSuggestions({ now = new Date() } = {}) {
        const hour = now.getHours();
        let timeGreeting = '';
        let timeBasedSuggestions = [];

        if (hour >= 5 && hour < 12) {
            timeGreeting = 'Bom dia';
            timeBasedSuggestions = [
                'Bom dia! Como você está?',
                'Bom dia! Tudo bem?',
                'Bom dia! Como foi seu despertar?',
                'Bom dia! Espero que tenha um ótimo dia',
                'Bom dia! Que tal conversarmos?',
            ];
        } else if (hour >= 12 && hour < 18) {
            timeGreeting = 'Boa tarde';
            timeBasedSuggestions = [
                'Boa tarde! Como você está?',
                'Boa tarde! Tudo bem?',
                'Boa tarde! Como está seu dia?',
                'Boa tarde! Espero que esteja tendo um bom dia',
                'Boa tarde! Que tal conversarmos?',
            ];
        } else {
            timeGreeting = 'Boa noite';
            timeBasedSuggestions = [
                'Boa noite! Como você está?',
                'Boa noite! Tudo bem?',
                'Boa noite! Como foi seu dia?',
                'Boa noite! Espero que tenha tido um bom dia',
                'Boa noite! Que tal conversarmos?',
            ];
        }

        return [
            ...timeBasedSuggestions,
            `${timeGreeting}! Prazer em te conhecer`,
            `${timeGreeting}! Como vai?`,
            `${timeGreeting}! Tudo certo?`,
        ];
    }

    function dedupeSuggestions(suggestions, limit = 5) {
        const uniqueSuggestions = [];
        const seen = new Set();

        for (const suggestion of suggestions) {
            const normalized = String(suggestion || '')
                .toLowerCase()
                .trim();
            if (!normalized || seen.has(normalized)) continue;

            seen.add(normalized);
            uniqueSuggestions.push(String(suggestion).trim());
            if (uniqueSuggestions.length >= limit) break;
        }

        return uniqueSuggestions;
    }

    const api = {
        buildDefaultSuggestions,
        buildPersonalizedSuggestions,
        dedupeSuggestions,
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
    root.window.ChatSuggestions.SuggestionHelpers = api;
})();
