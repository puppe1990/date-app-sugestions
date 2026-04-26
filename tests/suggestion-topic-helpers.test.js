const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildContextualSuggestions,
    hasTopicBeenDiscussed,
} = require('../src/suggestions/suggestion-topic-helpers.js');

test('buildContextualSuggestions adds topic-specific and generic suggestions', () => {
    const suggestions = buildContextualSuggestions({
        topics: ['trabalho', 'encontro'],
    });

    assert.equal(suggestions.includes('Gosto muito do que faço'), true);
    assert.equal(
        suggestions.includes('Perfeito! Quando você está livre?'),
        true,
    );
    assert.equal(suggestions.includes('Que tal conversarmos mais?'), true);
});

test('hasTopicBeenDiscussed detects keyword mention in question or answer', () => {
    const discussed = hasTopicBeenDiscussed({
        context: {
            lastMessages: [
                { text: 'você mora onde?' },
                { text: 'moro na zona leste' },
            ],
        },
        topic: 'localização',
        topicKeywords: {
            localização: ['mora', 'zona leste'],
        },
    });

    assert.equal(discussed, true);
});

test('hasTopicBeenDiscussed returns false for unknown topic', () => {
    const discussed = hasTopicBeenDiscussed({
        context: { lastMessages: [{ text: 'oi' }] },
        topic: 'nao-existe',
        topicKeywords: {},
    });

    assert.equal(discussed, false);
});
