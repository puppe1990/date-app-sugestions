(() => {
    class SuggestionEngine {
        constructor({ debug = false } = {}) {
            this.debug = debug;
        }

        generate(context) {
            const helpers = window.ChatSuggestions.SuggestionHelpers || {};
            if (!context || context.lastMessages.length === 0) {
                return this.getDefaultSuggestions();
            }

            const suggestions = [];
            const lastMessage =
                context.lastMessages[context.lastMessages.length - 1];
            const isLastFromMe = lastMessage.direction === 'out';

            if (isLastFromMe) {
                suggestions.push(...this.getContinuationSuggestions(context));
            } else {
                suggestions.push(
                    ...this.getResponseSuggestions(context, lastMessage),
                );
            }

            suggestions.push(...this.getPersonalizedSuggestions(context));

            if (suggestions.length < 3) {
                suggestions.push(...this.getContextualSuggestions(context));
            }

            if (suggestions.length < 3) {
                suggestions.push(...this.getDefaultSuggestions());
            }

            const uniqueSuggestions = helpers.dedupeSuggestions(suggestions);

            this.logSuggestions(uniqueSuggestions);
            return uniqueSuggestions;
        }

        getPersonalizedSuggestions(context) {
            const helpers = window.ChatSuggestions.SuggestionHelpers || {};
            return helpers.buildPersonalizedSuggestions(context);
        }

        getDefaultSuggestions() {
            const helpers = window.ChatSuggestions.SuggestionHelpers || {};
            return helpers.buildDefaultSuggestions();
        }

        getContinuationSuggestions(context) {
            const responseHelpers =
                window.ChatSuggestions.SuggestionResponseHelpers || {};
            const suggestions = [];

            const myLastMessage = context.lastMessages
                .filter((m) => m.direction === 'out')
                .slice(-1)[0];
            const myLastText = myLastMessage
                ? myLastMessage.text.toLowerCase()
                : '';
            const normalizedLastText =
                responseHelpers.normalizeForMatch(myLastText);
            const isTalkingAboutWork = responseHelpers.isWorkTopic({
                context,
                text: myLastText,
            });

            if (myLastText.includes('?')) {
                const isWellbeingQuestion =
                    responseHelpers.isWellbeingQuestion(normalizedLastText);

                if (isWellbeingQuestion) {
                    suggestions.push(
                        ...responseHelpers.buildWellbeingReplies({
                            mode: 'continuation',
                        }),
                    );
                    return suggestions;
                } else if (
                    isTalkingAboutWork ||
                    myLastText.includes('faz') ||
                    myLastText.includes('trabalho') ||
                    myLastText.includes('trabalha') ||
                    myLastText.includes('profissão') ||
                    myLastText.includes('tempo')
                ) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    suggestions.push('É desafiador?');
                    suggestions.push('É uma área que sempre te interessou?');
                } else if (
                    myLastText.includes('onde') ||
                    myLastText.includes('mora') ||
                    myLastText.includes('bairro') ||
                    myLastText.includes('zona')
                ) {
                    suggestions.push('Que legal!');
                    suggestions.push('É perto daqui?');
                    suggestions.push('Já conhece a região?');
                    if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                        suggestions.push('E você, trabalha com o quê?');
                    }
                    suggestions.push('O que você gosta de fazer por lá?');
                } else {
                    suggestions.push('Que legal!');
                    suggestions.push('E você, o que gosta de fazer?');
                    suggestions.push('Tem algum hobby?');
                    suggestions.push('O que você faz da vida?');
                }
            } else {
                if (isTalkingAboutWork) {
                    if (
                        myLastText.includes('sou') ||
                        myLastText.includes('eu sou') ||
                        myLastText.includes('eu trabalho') ||
                        myLastText.includes('engenheiro') ||
                        myLastText.includes('desenvolvedor') ||
                        myLastText.includes('software') ||
                        myLastText.includes('tecnologia') ||
                        myLastText.includes('trabalho com') ||
                        myLastText.includes('trabalho na')
                    ) {
                        if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                            suggestions.push('E você, trabalha com o quê?');
                            suggestions.push('Que área você trabalha?');
                            suggestions.push('Qual sua profissão?');
                            suggestions.push('Trabalha com o quê?');
                        } else {
                            if (
                                !this.hasTopicBeenDiscussed(
                                    context,
                                    'localização',
                                )
                            ) {
                                suggestions.push('E você, mora onde?');
                                suggestions.push('Que bairro você mora?');
                            }
                            suggestions.push(
                                'O que você gosta de fazer no tempo livre?',
                            );
                            suggestions.push('Tem algum hobby?');
                            suggestions.push('Quais seus interesses?');
                        }
                    } else {
                        suggestions.push('Que interessante!');
                        suggestions.push('Há quanto tempo trabalha nisso?');
                        suggestions.push('Gosta do que faz?');
                        suggestions.push('Como é trabalhar nisso?');
                        suggestions.push('É desafiador?');
                    }
                } else if (
                    context.topics.includes('trabalho') &&
                    !this.hasTopicBeenDiscussed(context, 'trabalho')
                ) {
                    suggestions.push('E você, trabalha com o quê?');
                    suggestions.push('Que área você trabalha?');
                    suggestions.push('E você, o que faz da vida?');
                    suggestions.push('Qual sua profissão?');
                    suggestions.push('Trabalha com o quê?');
                }

                const locationMentioned =
                    context.topics.includes('localização');
                if (
                    locationMentioned &&
                    !this.hasTopicBeenDiscussed(context, 'localização')
                ) {
                    suggestions.push('E você, mora onde?');
                    suggestions.push('Que bairro você mora?');
                    suggestions.push('É perto daqui?');
                    suggestions.push('Já conhece a região?');
                }

                suggestions.push('E você, o que gosta de fazer?');
                suggestions.push('Tem algum hobby?');
                suggestions.push('O que você gosta de fazer no tempo livre?');
                suggestions.push('Quais seus interesses?');
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('O que você faz da vida?');
                }
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('Mora onde?');
                }
            }

            return suggestions;
        }

        getResponseSuggestions(context, lastMessage) {
            const responseHelpers =
                window.ChatSuggestions.SuggestionResponseHelpers || {};
            const suggestions = [];
            const text = lastMessage.text.toLowerCase();
            const normalizedText = responseHelpers.normalizeForMatch(text);
            const isTalkingAboutWork = responseHelpers.isWorkTopic({
                context,
                text,
            });
            const isWellbeingQuestion =
                responseHelpers.isWellbeingQuestion(normalizedText);

            if (isWellbeingQuestion) {
                suggestions.push(
                    ...responseHelpers.buildWellbeingReplies({
                        mode: 'response',
                    }),
                );
                return suggestions;
            }

            const myLastQuestion = context.lastMessages
                .filter((m) => m.direction === 'out' && m.text.includes('?'))
                .slice(-1)[0];
            const myLastQuestionText = myLastQuestion
                ? myLastQuestion.text.toLowerCase()
                : '';

            const isQuestion = text.includes('?');
            const isReaction = text.match(
                /\b(oloko|rs|kkk|haha|nossa|caramba|entendi|ah sim|ok|tá)\b/i,
            );
            const mentionsTime = text.match(/\b(\d+)\s*(meses?|anos?|anos)\b/i);
            const mentionsWork = text.match(
                /\b(pedágio|pedagio|loja|porcelanato|trabalho|trabalha|faz o que|profissão)\b/i,
            );
            const asksLocation =
                text.includes('onde') ||
                text.includes('mora') ||
                text.includes('bairro') ||
                text.includes('zona') ||
                text.includes('cidade');
            const isReverseQuestion =
                text.includes('e vc') || text.includes('e você');
            const hobbyKeywords =
                window.ChatSuggestions.constants.HOBBY_KEYWORDS || [];
            const mentionsHobby = hobbyKeywords.some((keyword) =>
                normalizedText.includes(
                    keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                ),
            );
            const myHobbies = (context.mentionedHobbies || []).filter(Boolean);
            const myHobbiesJoined = myHobbies.slice(0, 3).join(', ');

            if (isQuestion) {
                const lastQuestionWasWork =
                    myLastQuestionText.includes('faz') ||
                    myLastQuestionText.includes('trabalho') ||
                    myLastQuestionText.includes('profissão') ||
                    myLastQuestionText.includes('emprego') ||
                    myLastQuestionText.includes('trabalha');
                const lastQuestionWasLocation =
                    myLastQuestionText.includes('onde') ||
                    myLastQuestionText.includes('mora') ||
                    myLastQuestionText.includes('bairro') ||
                    myLastQuestionText.includes('zona') ||
                    myLastQuestionText.includes('cidade');

                if (
                    mentionsHobby ||
                    (isReverseQuestion && myHobbies.length > 0)
                ) {
                    if (myHobbiesJoined) {
                        suggestions.push(`Eu curto ${myHobbiesJoined}.`);
                    } else {
                        suggestions.push('Gosto de treinar e ler.');
                    }
                    suggestions.push('E você, tem mais algum hobby?');
                    suggestions.push('Legal! Você treina há muito tempo?');
                    suggestions.push('Curte fazer isso com frequência?');
                    return suggestions;
                }

                if (
                    asksLocation ||
                    (isReverseQuestion &&
                        (lastQuestionWasLocation ||
                            context.topics.includes('localização')))
                ) {
                    suggestions.push(
                        'Moro no bairro de Tatuapé, São Paulo capital',
                    );
                    suggestions.push('Moro no bairro de Tatuapé');
                    suggestions.push('Moro em São Paulo');
                    suggestions.push('Sou da capital');
                    return suggestions;
                }

                if (
                    text.includes('faz o que') ||
                    text.includes('trabalho') ||
                    text.includes('profissão') ||
                    text.includes('emprego') ||
                    text.includes('trabalha') ||
                    (isReverseQuestion && lastQuestionWasWork)
                ) {
                    suggestions.push('Sou desenvolvedor de software');
                    suggestions.push(
                        'Sou desenvolvedor de software numa startup',
                    );
                    suggestions.push('Tenho um consultoria de tecnologia');
                    suggestions.push('Trabalho com tecnologia');
                    suggestions.push('Sou engenheiro de software, e você?');
                    return suggestions;
                } else {
                    suggestions.push('Sim!');
                    suggestions.push('Claro!');
                    suggestions.push('Exatamente!');
                    suggestions.push('Com certeza!');
                    return suggestions;
                }
            }

            if (isTalkingAboutWork) {
                if (mentionsTime) {
                    suggestions.push(
                        ...responseHelpers.buildWorkReplies({
                            includeLocationFollowUp:
                                !this.hasTopicBeenDiscussed(
                                    context,
                                    'localização',
                                ),
                        }),
                    );
                    return suggestions;
                } else if (mentionsWork && !isQuestion) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Há quanto tempo trabalha nisso?');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    return suggestions;
                } else if (
                    myLastQuestionText.includes('faz') ||
                    myLastQuestionText.includes('trabalho') ||
                    myLastQuestionText.includes('profissão') ||
                    myLastQuestionText.includes('tempo')
                ) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                        suggestions.push('E você, mora onde?');
                    }
                    suggestions.push(
                        'O que você gosta de fazer no tempo livre?',
                    );
                    return suggestions;
                }
            }

            if (
                myLastQuestionText.includes('onde') ||
                myLastQuestionText.includes('mora') ||
                myLastQuestionText.includes('bairro') ||
                myLastQuestionText.includes('zona')
            ) {
                suggestions.push('Que legal!');
                suggestions.push('É perto daqui?');
                suggestions.push('Já conhece a região?');
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                }
                suggestions.push('O que você gosta de fazer por lá?');
                return suggestions;
            }

            if (isReaction) {
                suggestions.push('Rsrs');
                suggestions.push('Kkk');
                suggestions.push('Que bom!');
                if (isTalkingAboutWork) {
                    suggestions.push('É uma área que sempre me interessou');
                    suggestions.push('Gosto muito do que faço');
                } else {
                    if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                        suggestions.push('E você, trabalha com o quê?');
                    }
                    if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                        suggestions.push('E você, mora onde?');
                    }
                }
                return suggestions;
            }

            if (
                text.includes('gostei') ||
                text.includes('legal') ||
                text.includes('interessante') ||
                text.includes('bonito') ||
                text.includes('lindo')
            ) {
                suggestions.push('Obrigado! 😊');
                suggestions.push('Que bom que gostou!');
                suggestions.push('Fico feliz!');
                return suggestions;
            }

            if (!text.includes('?') && myLastQuestionText) {
                suggestions.push('Que legal!');
                suggestions.push('Interessante!');
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                }
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('E você, mora onde?');
                }
                suggestions.push('O que você gosta de fazer no tempo livre?');
                return suggestions;
            }

            if (suggestions.length === 0) {
                suggestions.push('Que legal!');
                suggestions.push('Interessante!');
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                }
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('E você, mora onde?');
                }
                suggestions.push('O que você gosta de fazer no tempo livre?');
            }

            return suggestions;
        }

        getContextualSuggestions(context) {
            const topicHelpers =
                window.ChatSuggestions.SuggestionTopicHelpers || {};
            return topicHelpers.buildContextualSuggestions(context);
        }

        hasTopicBeenDiscussed(context, topic) {
            const topicHelpers =
                window.ChatSuggestions.SuggestionTopicHelpers || {};
            return topicHelpers.hasTopicBeenDiscussed({
                context,
                topic,
                topicKeywords:
                    window.ChatSuggestions.constants.TOPIC_KEYWORDS || {},
            });
        }

        logSuggestions(uniqueSuggestions) {
            if (!this.debug) return;

            console.log('[Badoo Chat Suggestions] === SUGESTÕES GERADAS ===');
            console.log(
                `[Badoo Chat Suggestions] Total de sugestões geradas: ${uniqueSuggestions.length}`,
            );
            uniqueSuggestions.forEach((suggestion, index) => {
                console.log(
                    `[Badoo Chat Suggestions] ${index + 1}. "${suggestion}"`,
                );
            });
            console.log('[Badoo Chat Suggestions] ==========================');
        }
    }

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.SuggestionEngine = SuggestionEngine;
})();
