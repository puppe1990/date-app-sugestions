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

            const suggestions = this.buildSuggestions(context);
            const uniqueSuggestions = helpers.dedupeSuggestions(suggestions);

            this.logSuggestions(uniqueSuggestions);
            return uniqueSuggestions;
        }

        buildSuggestions(context) {
            const suggestions = [];
            const lastMessage =
                context.lastMessages[context.lastMessages.length - 1];

            if (lastMessage.direction === 'out') {
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

            return suggestions;
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
            const continuationHelpers =
                window.ChatSuggestions.SuggestionContinuationHelpers || {};
            const responseHelpers =
                window.ChatSuggestions.SuggestionResponseHelpers || {};
            return continuationHelpers.buildContinuationSuggestions({
                context,
                responseHelpers,
                hasTopicBeenDiscussed: (topic) =>
                    this.hasTopicBeenDiscussed(context, topic),
            });
        }

        getResponseSuggestions(context, lastMessage) {
            const engineResponseHelpers =
                window.ChatSuggestions.SuggestionEngineResponseHelpers || {};
            const responseHelpers =
                window.ChatSuggestions.SuggestionResponseHelpers || {};
            const hobbyKeywords =
                window.ChatSuggestions.constants.HOBBY_KEYWORDS || [];

            return engineResponseHelpers.buildResponseSuggestions({
                context,
                lastMessage,
                responseHelpers,
                hobbyKeywords,
                hasTopicBeenDiscussed: (topic) =>
                    this.hasTopicBeenDiscussed(context, topic),
            });
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
