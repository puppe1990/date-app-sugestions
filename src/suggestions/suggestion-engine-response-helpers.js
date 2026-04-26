(() => {
    function buildResponseSuggestions({
        context,
        lastMessage,
        responseHelpers,
        hobbyKeywords,
        hasTopicBeenDiscussed,
    }) {
        const suggestions = [];
        const text = lastMessage.text.toLowerCase();
        const normalizedText = responseHelpers.normalizeForMatch(text);
        const isTalkingAboutWork = responseHelpers.isWorkTopic({
            context,
            text,
        });

        if (responseHelpers.isWellbeingQuestion(normalizedText)) {
            suggestions.push(
                ...responseHelpers.buildWellbeingReplies({
                    mode: 'response',
                }),
            );
            return suggestions;
        }

        const signals = buildResponseSignals({
            context,
            text,
            normalizedText,
            hobbyKeywords,
        });

        if (signals.isQuestion) {
            return buildQuestionResponseSuggestions({
                context,
                text,
                signals,
                hasTopicBeenDiscussed,
                suggestions,
            });
        }

        if (isTalkingAboutWork) {
            const workSuggestions = buildWorkResponseSuggestions({
                context,
                signals,
                responseHelpers,
                hasTopicBeenDiscussed,
            });
            if (workSuggestions.length) return workSuggestions;
        }

        if (askedMyLocation(signals.myLastQuestionText)) {
            return getLocationFollowUpSuggestions(hasTopicBeenDiscussed);
        }

        if (signals.isReaction) {
            return getReactionSuggestions({
                isTalkingAboutWork,
                hasTopicBeenDiscussed,
            });
        }

        if (containsPositiveReaction(text)) {
            return ['Obrigado! 😊', 'Que bom que gostou!', 'Fico feliz!'];
        }

        if (!text.includes('?') && signals.myLastQuestionText) {
            return getFallbackReplySuggestions(hasTopicBeenDiscussed);
        }

        return suggestions.length
            ? suggestions
            : getFallbackReplySuggestions(hasTopicBeenDiscussed);
    }

    function buildResponseSignals({
        context,
        text,
        normalizedText,
        hobbyKeywords,
    }) {
        const myLastQuestionText = getMyLastQuestionText(context);
        const myHobbies = (context.mentionedHobbies || []).filter(Boolean);

        return {
            myLastQuestionText,
            isQuestion: text.includes('?'),
            isReaction: text.match(
                /\b(oloko|rs|kkk|haha|nossa|caramba|entendi|ah sim|ok|tá)\b/i,
            ),
            mentionsTime: text.match(/\b(\d+)\s*(meses?|anos?|anos)\b/i),
            mentionsWork: text.match(
                /\b(pedágio|pedagio|loja|porcelanato|trabalho|trabalha|faz o que|profissão)\b/i,
            ),
            asksLocation:
                text.includes('onde') ||
                text.includes('mora') ||
                text.includes('bairro') ||
                text.includes('zona') ||
                text.includes('cidade'),
            isReverseQuestion: text.includes('e vc') || text.includes('e você'),
            mentionsHobby: hobbyKeywords.some((keyword) =>
                normalizedText.includes(
                    keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                ),
            ),
            myHobbies,
            myHobbiesJoined: myHobbies.slice(0, 3).join(', '),
        };
    }

    function getMyLastQuestionText(context) {
        const myLastQuestion = context.lastMessages
            .filter((message) => message.direction === 'out')
            .filter((message) => message.text.includes('?'))
            .slice(-1)[0];
        return myLastQuestion ? myLastQuestion.text.toLowerCase() : '';
    }

    function buildQuestionResponseSuggestions({
        context,
        text,
        signals,
        suggestions,
    }) {
        if (signals.mentionsHobby || shouldReplyWithHobbies(signals)) {
            return getHobbyAnswerSuggestions(signals);
        }

        if (signals.asksLocation || shouldReplyWithLocation(context, signals)) {
            return [
                'Moro no bairro de Tatuapé, São Paulo capital',
                'Moro no bairro de Tatuapé',
                'Moro em São Paulo',
                'Sou da capital',
            ];
        }

        if (asksMyWork(text, signals)) {
            return [
                'Sou desenvolvedor de software',
                'Sou desenvolvedor de software numa startup',
                'Tenho um consultoria de tecnologia',
                'Trabalho com tecnologia',
                'Sou engenheiro de software, e você?',
            ];
        }

        suggestions.push('Sim!');
        suggestions.push('Claro!');
        suggestions.push('Exatamente!');
        suggestions.push('Com certeza!');
        return suggestions;
    }

    function shouldReplyWithHobbies(signals) {
        return signals.isReverseQuestion && signals.myHobbies.length > 0;
    }

    function getHobbyAnswerSuggestions(signals) {
        const firstLine = signals.myHobbiesJoined
            ? `Eu curto ${signals.myHobbiesJoined}.`
            : 'Gosto de treinar e ler.';
        return [
            firstLine,
            'E você, tem mais algum hobby?',
            'Legal! Você treina há muito tempo?',
            'Curte fazer isso com frequência?',
        ];
    }

    function shouldReplyWithLocation(context, signals) {
        return (
            signals.isReverseQuestion &&
            (askedMyLocation(signals.myLastQuestionText) ||
                context.topics.includes('localização'))
        );
    }

    function askedMyLocation(text) {
        return (
            text.includes('onde') ||
            text.includes('mora') ||
            text.includes('bairro') ||
            text.includes('zona') ||
            text.includes('cidade')
        );
    }

    function asksMyWork(text, signals) {
        return (
            text.includes('faz o que') ||
            text.includes('trabalho') ||
            text.includes('profissão') ||
            text.includes('emprego') ||
            text.includes('trabalha') ||
            (signals.isReverseQuestion &&
                askedMyWork(signals.myLastQuestionText))
        );
    }

    function askedMyWork(text) {
        return (
            text.includes('faz') ||
            text.includes('trabalho') ||
            text.includes('profissão') ||
            text.includes('emprego') ||
            text.includes('trabalha')
        );
    }

    function buildWorkResponseSuggestions({
        signals,
        responseHelpers,
        hasTopicBeenDiscussed,
    }) {
        if (signals.mentionsTime) {
            return responseHelpers.buildWorkReplies({
                includeLocationFollowUp: !hasTopicBeenDiscussed('localização'),
            });
        }

        if (signals.mentionsWork && !signals.isQuestion) {
            return [
                'Que interessante!',
                'Há quanto tempo trabalha nisso?',
                'Gosta do que faz?',
                'Como é trabalhar nisso?',
            ];
        }

        if (askedAboutWorkRecently(signals.myLastQuestionText)) {
            const suggestions = [
                'Que interessante!',
                'Gosta do que faz?',
                'Como é trabalhar nisso?',
            ];
            if (!hasTopicBeenDiscussed('localização')) {
                suggestions.push('E você, mora onde?');
            }
            suggestions.push('O que você gosta de fazer no tempo livre?');
            return suggestions;
        }

        return [];
    }

    function askedAboutWorkRecently(text) {
        return (
            text.includes('faz') ||
            text.includes('trabalho') ||
            text.includes('profissão') ||
            text.includes('tempo')
        );
    }

    function getLocationFollowUpSuggestions(hasTopicBeenDiscussed) {
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

    function getReactionSuggestions({
        isTalkingAboutWork,
        hasTopicBeenDiscussed,
    }) {
        const suggestions = ['Rsrs', 'Kkk', 'Que bom!'];
        if (isTalkingAboutWork) {
            suggestions.push('É uma área que sempre me interessou');
            suggestions.push('Gosto muito do que faço');
            return suggestions;
        }

        if (!hasTopicBeenDiscussed('trabalho')) {
            suggestions.push('E você, trabalha com o quê?');
        }
        if (!hasTopicBeenDiscussed('localização')) {
            suggestions.push('E você, mora onde?');
        }
        return suggestions;
    }

    function containsPositiveReaction(text) {
        return (
            text.includes('gostei') ||
            text.includes('legal') ||
            text.includes('interessante') ||
            text.includes('bonito') ||
            text.includes('lindo')
        );
    }

    function getFallbackReplySuggestions(hasTopicBeenDiscussed) {
        const suggestions = [
            'Que legal!',
            'Interessante!',
            'O que você gosta de fazer no tempo livre?',
        ];
        if (!hasTopicBeenDiscussed('trabalho')) {
            suggestions.push('E você, trabalha com o quê?');
        }
        if (!hasTopicBeenDiscussed('localização')) {
            suggestions.push('E você, mora onde?');
        }
        return suggestions;
    }

    const api = {
        buildResponseSuggestions,
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
    root.window.ChatSuggestions.SuggestionEngineResponseHelpers = api;
})();
