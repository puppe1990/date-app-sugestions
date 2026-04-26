const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildResponseSuggestions,
} = require('../src/suggestions/suggestion-engine-response-helpers.js');
const responseHelpers = require('../src/suggestions/suggestion-response-helpers.js');

test('buildResponseSuggestions answers hobby questions with known hobbies', () => {
    const suggestions = buildResponseSuggestions({
        context: {
            topics: [],
            mentionedHobbies: ['ler', 'treinar'],
            lastMessages: [{ direction: 'out', text: 'E você, curte o quê?' }],
        },
        lastMessage: { text: 'Eu gosto de ler, e você?' },
        responseHelpers,
        hobbyKeywords: ['ler'],
        hasTopicBeenDiscussed() {
            return false;
        },
    });

    assert.equal(suggestions[0], 'Eu curto ler, treinar.');
});

test('buildResponseSuggestions adds work follow-up after work duration reply', () => {
    const suggestions = buildResponseSuggestions({
        context: {
            topics: ['trabalho'],
            mentionedHobbies: [],
            lastMessages: [
                { direction: 'out', text: 'Há quanto tempo trabalha nisso?' },
            ],
        },
        lastMessage: { text: 'Trabalho com isso há 3 anos' },
        responseHelpers,
        hobbyKeywords: [],
        hasTopicBeenDiscussed(topic) {
            return topic === 'trabalho';
        },
    });

    assert.equal(suggestions.includes('Que interessante!'), true);
    assert.equal(suggestions.includes('E você, mora onde?'), true);
});
