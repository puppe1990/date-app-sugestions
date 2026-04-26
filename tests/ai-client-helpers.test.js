const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getDefaultEndpointForProvider,
    getResponseLengthConfig,
    getBusinessToneLabel,
} = require('../src/core/ai-client-config-helpers.js');
const {
    extractSuggestions,
    sanitizeSuggestions,
    isChatAlreadyInProgress,
    isGenericConversationRestart,
} = require('../src/core/ai-client-response-helpers.js');

test('AI client config helpers resolve endpoint, length and business tone', () => {
    assert.equal(
        getDefaultEndpointForProvider('nvidia'),
        'https://integrate.api.nvidia.com/v1/chat/completions',
    );
    assert.deepEqual(
        getResponseLengthConfig.call({ responseLength: 'medium' }),
        {
            label: 'média',
            maxChars: 160,
            maxTokens: 320,
        },
    );
    assert.equal(getBusinessToneLabel('amigavel'), 'amigável');
});

test('AI client response helpers parse JSON and filter generic restarts', () => {
    const parsed = extractSuggestions(
        '```json\n{"suggestions":["Oi","Resposta útil","Resposta útil"]}\n```',
    );
    const filtered = sanitizeSuggestions.call(
        {
            isChatAlreadyInProgress,
            isGenericConversationRestart,
        },
        ['Boa tarde! Tudo bem?', 'Resposta útil'],
        '\n1. EU: oi\n2. Ana: tudo bem\n3. EU: beleza',
    );

    assert.deepEqual(Array.from(parsed), ['Oi', 'Resposta útil']);
    assert.equal(isGenericConversationRestart('Boa tarde! Tudo bem?'), true);
    assert.equal(
        isChatAlreadyInProgress('\n1. EU: oi\n2. Ana: tudo bem\n3. EU: beleza'),
        true,
    );
    assert.deepEqual(Array.from(filtered), ['Resposta útil']);
});
