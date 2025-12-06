(() => {
    class ContextExtractor {
        constructor({ debug = false, messageReader } = {}) {
            this.debug = debug;
            this.messageReader = messageReader || window.BadooChatSuggestions.createBadooMessageReader();
        }

        extract(chatContainer, { fullHistory = false } = {}) {
            if (!chatContainer) {
                console.error('[Badoo Chat Suggestions] Container de chat não encontrado');
                return null;
            }

            const { TOPIC_KEYWORDS } = window.BadooChatSuggestions.constants;
            const messages = this.messageReader.read(chatContainer);
            const context = {
                allMessages: [],
                lastMessages: [],
                participants: new Set(),
                topics: [],
                mentionedPlaces: [],
                mentionedJobs: [],
                mentionedHobbies: [],
                questions: [],
                lastSender: null,
                conversationLength: 0,
                hasQuestions: false,
                hasElogios: false
            };

            const allMessagesArray = Array.from(messages);
            context.conversationLength = allMessagesArray.length;

            const targetMessages = fullHistory ? allMessagesArray : allMessagesArray.slice(-10);
            targetMessages.forEach(message => {
                if (!message) return;
                const { sender, text, direction, type } = message;

                context.allMessages.push(message);
                context.lastMessages.push(message);
                context.participants.add(sender);
                context.lastSender = sender;

                if (type === 'text' && text) {
                    this.extractTopics(text, context.topics, TOPIC_KEYWORDS);
                    this.extractMentionedPlaces(text, context.mentionedPlaces);
                    this.extractMentionedJobs(text, context.mentionedJobs);
                    this.extractMentionedHobbies(text, context.mentionedHobbies);

                    if (text.includes('?') || text.match(/\b(qual|quando|onde|como|quem|por que|porque)\b/i)) {
                        context.hasQuestions = true;
                        context.questions.push(text);
                    }

                    if (text.match(/\b(gostei|legal|interessante|bonito|lindo|adoro|amo|curto|incrível|maravilhoso)\b/i)) {
                        context.hasElogios = true;
                    }
                }
            });

            this.logContext(context);
            return context;
        }

        extractTopics(text, topics, keywordsMap) {
            const lowerText = text.toLowerCase();
            for (const [topic, keywords] of Object.entries(keywordsMap)) {
                if (keywords.some(keyword => lowerText.includes(keyword))) {
                    if (!topics.includes(topic)) {
                        topics.push(topic);
                    }
                }
            }
        }

        extractMentionedPlaces(text, places) {
            const { PLACE_PATTERNS, SPECIFIC_PLACES } = window.BadooChatSuggestions.constants;
            const lowerText = text.toLowerCase();

            PLACE_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        let place = match.replace(/\b(moro|mora|em|no|na|e vc|e você)\b/gi, '').trim();
                        place = place.replace(/[.,!?;:]/g, '').trim();
                        if (place && place.length > 2 && !places.includes(place)) {
                            places.push(place);
                        }
                    });
                }
            });

            SPECIFIC_PLACES.forEach(place => {
                if (lowerText.includes(place) && !places.includes(place)) {
                    places.push(place);
                }
            });
        }

        extractMentionedJobs(text, jobs) {
            const { JOB_PATTERNS, SPECIFIC_JOBS } = window.BadooChatSuggestions.constants;
            const lowerText = text.toLowerCase();

            JOB_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        let job = match.replace(/\b(sou|trabalho|com|como|no|na|em|e vc|e você)\b/gi, '').trim();
                        job = job.replace(/[.,!?;:]/g, '').trim();
                        if (job && job.length > 2 && !jobs.includes(job)) {
                            jobs.push(job);
                        }
                    });
                }
            });

            SPECIFIC_JOBS.forEach(job => {
                if (lowerText.includes(job) && !jobs.includes(job)) {
                    jobs.push(job);
                }
            });
        }

        extractMentionedHobbies(text, hobbies) {
            const { HOBBY_KEYWORDS } = window.BadooChatSuggestions.constants;
            const lowerText = text.toLowerCase();
            HOBBY_KEYWORDS.forEach(keyword => {
                if (lowerText.includes(keyword) && !hobbies.includes(keyword)) {
                    hobbies.push(keyword);
                }
            });
        }

        logContext(context) {
            if (!this.debug) return;

            console.log('[Badoo Chat Suggestions] === MENSAGENS ANALISADAS ===');
            console.log(`[Badoo Chat Suggestions] Total de mensagens: ${context.conversationLength}`);
            console.log(`[Badoo Chat Suggestions] Últimas ${context.lastMessages.length} mensagens:`);
            context.lastMessages.forEach((msg, index) => {
                const direction = msg.direction === 'out' ? 'VOCÊ' : 'OUTRO';
                console.log(`[Badoo Chat Suggestions] ${index + 1}. [${direction}] ${msg.sender}: "${msg.text}"`);
            });
            console.log('[Badoo Chat Suggestions] Tópicos detectados:', context.topics);
            console.log('[Badoo Chat Suggestions] Lugares mencionados:', context.mentionedPlaces);
            console.log('[Badoo Chat Suggestions] Profissões mencionadas:', context.mentionedJobs);
            console.log('[Badoo Chat Suggestions] Hobbies mencionados:', context.mentionedHobbies);
            console.log('[Badoo Chat Suggestions] ============================');
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.ContextExtractor = ContextExtractor;
})();
