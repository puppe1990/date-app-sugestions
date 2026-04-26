(() => {
    function buildContinuationSuggestions({
        context,
        responseHelpers,
        hasTopicBeenDiscussed,
    }) {
        const suggestions = [];
        const myLastText = getLastOutgoingText(context);
        const normalizedLastText =
            responseHelpers.normalizeForMatch(myLastText);
        const isTalkingAboutWork = responseHelpers.isWorkTopic({
            context,
            text: myLastText,
        });

        if (myLastText.includes('?')) {
            return buildQuestionContinuationSuggestions({
                context,
                myLastText,
                normalizedLastText,
                isTalkingAboutWork,
                responseHelpers,
                hasTopicBeenDiscussed,
                suggestions,
            });
        }

        return buildStatementContinuationSuggestions({
            context,
            myLastText,
            isTalkingAboutWork,
            hasTopicBeenDiscussed,
            suggestions,
        });
    }

    function getLastOutgoingText(context) {
        const myLastMessage = context.lastMessages
            .filter((message) => message.direction === 'out')
            .slice(-1)[0];
        return myLastMessage ? myLastMessage.text.toLowerCase() : '';
    }

    function buildQuestionContinuationSuggestions({
        context,
        myLastText,
        normalizedLastText,
        isTalkingAboutWork,
        responseHelpers,
        hasTopicBeenDiscussed,
        suggestions,
    }) {
        if (responseHelpers.isWellbeingQuestion(normalizedLastText)) {
            suggestions.push(
                ...responseHelpers.buildWellbeingReplies({
                    mode: 'continuation',
                }),
            );
            return suggestions;
        }

        if (isWorkQuestion(myLastText, isTalkingAboutWork)) {
            suggestions.push(...getWorkContinuationPrompts());
            return suggestions;
        }

        if (isLocationQuestion(myLastText)) {
            suggestions.push(
                ...getLocationContinuationPrompts(
                    context,
                    hasTopicBeenDiscussed,
                ),
            );
            return suggestions;
        }

        suggestions.push(...getGenericContinuationPrompts());
        return suggestions;
    }

    function buildStatementContinuationSuggestions({
        context,
        myLastText,
        isTalkingAboutWork,
        hasTopicBeenDiscussed,
        suggestions,
    }) {
        if (isTalkingAboutWork) {
            suggestions.push(
                ...getWorkStatementPrompts({
                    context,
                    myLastText,
                    hasTopicBeenDiscussed,
                }),
            );
        } else if (
            context.topics.includes('trabalho') &&
            !hasTopicBeenDiscussed('trabalho')
        ) {
            suggestions.push(...getUndiscussedWorkPrompts());
        }

        if (
            context.topics.includes('localização') &&
            !hasTopicBeenDiscussed('localização')
        ) {
            suggestions.push(...getUndiscussedLocationPrompts());
        }

        suggestions.push(...getGenericInterestPrompts(hasTopicBeenDiscussed));
        return suggestions;
    }

    function isWorkQuestion(text, isTalkingAboutWork) {
        return (
            isTalkingAboutWork ||
            text.includes('faz') ||
            text.includes('trabalho') ||
            text.includes('trabalha') ||
            text.includes('profissão') ||
            text.includes('tempo')
        );
    }

    function isLocationQuestion(text) {
        return (
            text.includes('onde') ||
            text.includes('mora') ||
            text.includes('bairro') ||
            text.includes('zona')
        );
    }

    function getWorkContinuationPrompts() {
        return [
            'Que interessante!',
            'Gosta do que faz?',
            'Como é trabalhar nisso?',
            'É desafiador?',
            'É uma área que sempre te interessou?',
        ];
    }

    function getLocationContinuationPrompts(context, hasTopicBeenDiscussed) {
        const suggestions = [
            'Que legal!',
            'É perto daqui?',
            'Já conhece a região?',
        ];
        if (!hasTopicBeenDiscussed('trabalho')) {
            suggestions.push('E você, trabalha com o quê?');
        }
        suggestions.push('O que você gosta de fazer por lá?');
        return suggestions;
    }

    function getGenericContinuationPrompts() {
        return [
            'Que legal!',
            'E você, o que gosta de fazer?',
            'Tem algum hobby?',
            'O que você faz da vida?',
        ];
    }

    function getWorkStatementPrompts({ myLastText, hasTopicBeenDiscussed }) {
        if (mentionsMyWork(myLastText)) {
            if (!hasTopicBeenDiscussed('trabalho')) {
                return getUndiscussedWorkPrompts();
            }

            return getPostWorkDiscussionPrompts(hasTopicBeenDiscussed);
        }

        return [
            'Que interessante!',
            'Há quanto tempo trabalha nisso?',
            'Gosta do que faz?',
            'Como é trabalhar nisso?',
            'É desafiador?',
        ];
    }

    function mentionsMyWork(text) {
        return (
            text.includes('sou') ||
            text.includes('eu sou') ||
            text.includes('eu trabalho') ||
            text.includes('engenheiro') ||
            text.includes('desenvolvedor') ||
            text.includes('software') ||
            text.includes('tecnologia') ||
            text.includes('trabalho com') ||
            text.includes('trabalho na')
        );
    }

    function getUndiscussedWorkPrompts() {
        return [
            'E você, trabalha com o quê?',
            'Que área você trabalha?',
            'Qual sua profissão?',
            'Trabalha com o quê?',
        ];
    }

    function getPostWorkDiscussionPrompts(hasTopicBeenDiscussed) {
        const suggestions = [];
        if (!hasTopicBeenDiscussed('localização')) {
            suggestions.push('E você, mora onde?');
            suggestions.push('Que bairro você mora?');
        }
        suggestions.push('O que você gosta de fazer no tempo livre?');
        suggestions.push('Tem algum hobby?');
        suggestions.push('Quais seus interesses?');
        return suggestions;
    }

    function getUndiscussedLocationPrompts() {
        return [
            'E você, mora onde?',
            'Que bairro você mora?',
            'É perto daqui?',
            'Já conhece a região?',
        ];
    }

    function getGenericInterestPrompts(hasTopicBeenDiscussed) {
        const suggestions = [
            'E você, o que gosta de fazer?',
            'Tem algum hobby?',
            'O que você gosta de fazer no tempo livre?',
            'Quais seus interesses?',
        ];
        if (!hasTopicBeenDiscussed('trabalho')) {
            suggestions.push('O que você faz da vida?');
        }
        if (!hasTopicBeenDiscussed('localização')) {
            suggestions.push('Mora onde?');
        }
        return suggestions;
    }

    const api = {
        buildContinuationSuggestions,
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
    root.window.ChatSuggestions.SuggestionContinuationHelpers = api;
})();
