const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeForMatch,
    isWellbeingQuestion,
    isWorkTopic,
    buildWellbeingReplies,
    buildWorkReplies,
} = require('../src/suggestions/suggestion-response-helpers.js');

test('normalizeForMatch removes accents and lowercases', () => {
    assert.equal(normalizeForMatch('Como VOCÊ está?'), 'como voce esta?');
});

test('isWellbeingQuestion recognizes common variants', () => {
    assert.equal(isWellbeingQuestion('como vc ta?'), true);
    assert.equal(isWellbeingQuestion('qual seu hobby?'), false);
});

test('isWorkTopic checks text, topics and message history', () => {
    const context = {
        topics: [],
        lastMessages: [{ text: 'qual sua profissão?' }],
    };

    assert.equal(isWorkTopic({ context, text: 'legal' }), true);
    assert.equal(
        isWorkTopic({ context: { topics: [], lastMessages: [] }, text: 'oi' }),
        false,
    );
});

test('buildWellbeingReplies returns continuation variants', () => {
    const replies = buildWellbeingReplies({ mode: 'continuation' });

    assert.deepEqual(replies.slice(0, 2), [
        'Tudo ótimo por aqui! E você, como está?',
        'Estou bem, obrigado por perguntar! Como foi seu dia?',
    ]);
});

test('buildWorkReplies returns work follow-ups', () => {
    const replies = buildWorkReplies({ includeLocationFollowUp: true });

    assert.equal(replies.includes('Que interessante!'), true);
    assert.equal(replies.includes('E você, mora onde?'), true);
});
