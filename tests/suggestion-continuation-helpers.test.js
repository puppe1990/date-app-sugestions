const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildContinuationSuggestions,
} = require('../src/suggestions/suggestion-continuation-helpers.js');
const responseHelpers = require('../src/suggestions/suggestion-response-helpers.js');

test('buildContinuationSuggestions returns wellbeing continuation replies', () => {
    const suggestions = buildContinuationSuggestions({
        context: {
            topics: [],
            lastMessages: [{ direction: 'out', text: 'Como você está?' }],
        },
        responseHelpers,
        hasTopicBeenDiscussed() {
            return false;
        },
    });

    assert.equal(
        suggestions.includes('Tudo ótimo por aqui! E você, como está?'),
        true,
    );
});

test('buildContinuationSuggestions asks back about work when topic is new', () => {
    const suggestions = buildContinuationSuggestions({
        context: {
            topics: ['trabalho'],
            lastMessages: [{ direction: 'out', text: 'Sou desenvolvedor' }],
        },
        responseHelpers,
        hasTopicBeenDiscussed(topic) {
            return topic !== 'trabalho';
        },
    });

    assert.equal(suggestions.includes('E você, trabalha com o quê?'), true);
});
