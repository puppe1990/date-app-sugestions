(() => {
    class SuggestionEngine {
        constructor({ debug = false } = {}) {
            this.debug = debug;
        }

        generate(context) {
            if (!context || context.lastMessages.length === 0) {
                return this.getDefaultSuggestions();
            }

            const suggestions = [];
            const lastMessage = context.lastMessages[context.lastMessages.length - 1];
            const isLastFromMe = lastMessage.direction === 'out';

            if (isLastFromMe) {
                suggestions.push(...this.getContinuationSuggestions(context));
            } else {
                suggestions.push(...this.getResponseSuggestions(context, lastMessage));
            }

            suggestions.push(...this.getPersonalizedSuggestions(context));

            if (suggestions.length < 3) {
                suggestions.push(...this.getContextualSuggestions(context));
            }

            if (suggestions.length < 3) {
                suggestions.push(...this.getDefaultSuggestions());
            }

            const uniqueSuggestions = [];
            const seen = new Set();
            for (const suggestion of suggestions) {
                const normalized = suggestion.toLowerCase().trim();
                if (!seen.has(normalized) && suggestion.trim().length > 0) {
                    seen.add(normalized);
                    uniqueSuggestions.push(suggestion);
                    if (uniqueSuggestions.length >= 5) break;
                }
            }

            this.logSuggestions(uniqueSuggestions);
            return uniqueSuggestions;
        }

        getPersonalizedSuggestions(context) {
            const suggestions = [];

            if (context.mentionedPlaces.length > 0) {
                const place = context.mentionedPlaces[0];
                suggestions.push(`Que legal! Já conhece ${place}?`);
                suggestions.push('É uma região bem legal');
                suggestions.push(`Já visitou ${place}?`);
            }

            if (context.mentionedJobs.length > 0) {
                const job = context.mentionedJobs[0];
                suggestions.push(`Que interessante! Trabalha com ${job} há quanto tempo?`);
                suggestions.push(`Adoro pessoas que trabalham com ${job}`);
            }

            if (context.mentionedHobbies.length > 0) {
                const hobbies = context.mentionedHobbies.slice(0, 2).join(' e ');
                suggestions.push(`Que legal! Também gosto de ${hobbies}`);
                suggestions.push(`Adoro ${hobbies}!`);
            }

            if (context.hasQuestions && context.questions.length > 0) {
                const lastQuestion = context.questions[context.questions.length - 1];
                if (lastQuestion.includes('onde') || lastQuestion.includes('mora')) {
                    suggestions.push('Moro em São Paulo');
                    suggestions.push('Moro no bairro de Tatuapé, São Paulo capital');
                    suggestions.push('Moro no bairro de Tatuapé');
                    suggestions.push('Sou da capital');
                } else if (lastQuestion.includes('faz') || lastQuestion.includes('trabalho')) {
                    suggestions.push('Sou desenvolvedor de software');
                    suggestions.push('Sou desenvolvedor de software numa startup');
                    suggestions.push('Tenho um consultoria de tecnologia');
                    suggestions.push('Trabalho com tecnologia');
                }
            }

            return suggestions;
        }

        getDefaultSuggestions() {
            const hour = new Date().getHours();
            let timeGreeting = '';
            let timeBasedSuggestions = [];

            if (hour >= 5 && hour < 12) {
                timeGreeting = 'Bom dia';
                timeBasedSuggestions = [
                    'Bom dia! Como você está?',
                    'Bom dia! Tudo bem?',
                    'Bom dia! Como foi seu despertar?',
                    'Bom dia! Espero que tenha um ótimo dia',
                    'Bom dia! Que tal conversarmos?'
                ];
            } else if (hour >= 12 && hour < 18) {
                timeGreeting = 'Boa tarde';
                timeBasedSuggestions = [
                    'Boa tarde! Como você está?',
                    'Boa tarde! Tudo bem?',
                    'Boa tarde! Como está seu dia?',
                    'Boa tarde! Espero que esteja tendo um bom dia',
                    'Boa tarde! Que tal conversarmos?'
                ];
            } else {
                timeGreeting = 'Boa noite';
                timeBasedSuggestions = [
                    'Boa noite! Como você está?',
                    'Boa noite! Tudo bem?',
                    'Boa noite! Como foi seu dia?',
                    'Boa noite! Espero que tenha tido um bom dia',
                    'Boa noite! Que tal conversarmos?'
                ];
            }

            return [
                ...timeBasedSuggestions,
                `${timeGreeting}! Prazer em te conhecer`,
                `${timeGreeting}! Como vai?`,
                `${timeGreeting}! Tudo certo?`
            ];
        }

        getContinuationSuggestions(context) {
            const suggestions = [];

            const myLastMessage = context.lastMessages.filter(m => m.direction === 'out').slice(-1)[0];
            const myLastText = myLastMessage ? myLastMessage.text.toLowerCase() : '';

            const isTalkingAboutWork = context.topics.includes('trabalho') ||
                                      myLastText.includes('trabalho') ||
                                      myLastText.includes('trabalha') ||
                                      myLastText.includes('pedágio') ||
                                      myLastText.includes('loja') ||
                                      myLastText.includes('porcelanato') ||
                                      myLastText.includes('engenheiro') ||
                                      myLastText.includes('desenvolvedor') ||
                                      myLastText.includes('software') ||
                                      context.lastMessages.some(m =>
                                          m.text.toLowerCase().includes('trabalho') ||
                                          m.text.toLowerCase().includes('trabalha') ||
                                          m.text.toLowerCase().includes('pedágio') ||
                                          m.text.toLowerCase().includes('faz o que') ||
                                          m.text.toLowerCase().includes('profissão')
                                      );

            if (myLastText.includes('?')) {
                if (isTalkingAboutWork || myLastText.includes('faz') || myLastText.includes('trabalho') || myLastText.includes('trabalha') || myLastText.includes('profissão') || myLastText.includes('tempo')) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    suggestions.push('É desafiador?');
                    suggestions.push('É uma área que sempre te interessou?');
                } else if (myLastText.includes('onde') || myLastText.includes('mora') || myLastText.includes('bairro') || myLastText.includes('zona')) {
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
                    if (myLastText.includes('sou') || myLastText.includes('eu sou') || myLastText.includes('eu trabalho') ||
                        myLastText.includes('engenheiro') || myLastText.includes('desenvolvedor') ||
                        myLastText.includes('software') || myLastText.includes('tecnologia') ||
                        myLastText.includes('trabalho com') || myLastText.includes('trabalho na')) {
                        if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                            suggestions.push('E você, trabalha com o quê?');
                            suggestions.push('Que área você trabalha?');
                            suggestions.push('Qual sua profissão?');
                            suggestions.push('Trabalha com o quê?');
                        } else {
                            if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                                suggestions.push('E você, mora onde?');
                                suggestions.push('Que bairro você mora?');
                            }
                            suggestions.push('O que você gosta de fazer no tempo livre?');
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
                } else if (context.topics.includes('trabalho') && !this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                    suggestions.push('Que área você trabalha?');
                    suggestions.push('E você, o que faz da vida?');
                    suggestions.push('Qual sua profissão?');
                    suggestions.push('Trabalha com o quê?');
                }

                const locationMentioned = context.topics.includes('localização');
                if (locationMentioned && !this.hasTopicBeenDiscussed(context, 'localização')) {
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
            const suggestions = [];
            const text = lastMessage.text.toLowerCase();

            const isTalkingAboutWork = context.topics.includes('trabalho') ||
                                       text.includes('trabalho') ||
                                       text.includes('trabalha') ||
                                       text.includes('pedágio') ||
                                       text.includes('pedagio') ||
                                       text.includes('loja') ||
                                       text.includes('porcelanato') ||
                                       text.includes('meses') ||
                                       text.includes('anos') ||
                                       context.lastMessages.some(m =>
                                           m.text.toLowerCase().includes('trabalho') ||
                                           m.text.toLowerCase().includes('trabalha') ||
                                           m.text.toLowerCase().includes('faz o que') ||
                                           m.text.toLowerCase().includes('profissão')
                                       );

            const myLastQuestion = context.lastMessages
                .filter(m => m.direction === 'out' && m.text.includes('?'))
                .slice(-1)[0];
            const myLastQuestionText = myLastQuestion ? myLastQuestion.text.toLowerCase() : '';

            const isQuestion = text.includes('?');
            const isReaction = text.match(/\b(oloko|rs|kkk|haha|nossa|caramba|entendi|ah sim|ok|tá)\b/i);
            const mentionsTime = text.match(/\b(\d+)\s*(meses?|anos?|anos)\b/i);
            const mentionsWork = text.match(/\b(pedágio|pedagio|loja|porcelanato|trabalho|trabalha|faz o que|profissão)\b/i);

            if (isQuestion) {
                if (text.includes('faz o que') || text.includes('trabalho') || text.includes('profissão') || text.includes('emprego') || text.includes('trabalha') || text.includes('e vc')) {
                    suggestions.push('Sou desenvolvedor de software');
                    suggestions.push('Sou desenvolvedor de software numa startup');
                    suggestions.push('Tenho um consultoria de tecnologia');
                    suggestions.push('Trabalho com tecnologia');
                    suggestions.push('Sou engenheiro de software, e você?');
                    return suggestions;
                } else if (text.includes('onde') || text.includes('mora') || text.includes('bairro') || text.includes('zona')) {
                    suggestions.push('Moro no bairro de Tatuapé, São Paulo capital');
                    suggestions.push('Moro no bairro de Tatuapé');
                    suggestions.push('Moro em São Paulo');
                    suggestions.push('Sou da capital');
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
                    suggestions.push('Que legal!');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                        suggestions.push('E você, mora onde?');
                    }
                    suggestions.push('O que você gosta de fazer no tempo livre?');
                    return suggestions;
                } else if (mentionsWork && !isQuestion) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Há quanto tempo trabalha nisso?');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    return suggestions;
                } else if (myLastQuestionText.includes('faz') || myLastQuestionText.includes('trabalho') || myLastQuestionText.includes('profissão') || myLastQuestionText.includes('tempo')) {
                    suggestions.push('Que interessante!');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                        suggestions.push('E você, mora onde?');
                    }
                    suggestions.push('O que você gosta de fazer no tempo livre?');
                    return suggestions;
                }
            }

            if (myLastQuestionText.includes('onde') || myLastQuestionText.includes('mora') || myLastQuestionText.includes('bairro') || myLastQuestionText.includes('zona')) {
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

            if (text.includes('gostei') || text.includes('legal') || text.includes('interessante') || text.includes('bonito') || text.includes('lindo')) {
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

        hasTopicBeenDiscussed(context, topic) {
            const keywords = window.BadooChatSuggestions.constants.TOPIC_KEYWORDS[topic] || [];
            if (keywords.length === 0) return false;

            let hasQuestion = false;
            let hasAnswer = false;

            context.lastMessages.forEach(message => {
                const text = message.text.toLowerCase();
                const containsKeyword = keywords.some(keyword => text.includes(keyword));

                if (containsKeyword) {
                    if (text.includes('?')) {
                        hasQuestion = true;
                    } else {
                        hasAnswer = true;
                    }
                }
            });

            return hasQuestion || hasAnswer;
        }

        logSuggestions(uniqueSuggestions) {
            if (!this.debug) return;

            console.log('[Badoo Chat Suggestions] === SUGESTÕES GERADAS ===');
            console.log(`[Badoo Chat Suggestions] Total de sugestões geradas: ${uniqueSuggestions.length}`);
            uniqueSuggestions.forEach((suggestion, index) => {
                console.log(`[Badoo Chat Suggestions] ${index + 1}. "${suggestion}"`);
            });
            console.log('[Badoo Chat Suggestions] ==========================');
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.SuggestionEngine = SuggestionEngine;
})();
