const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildAIConfig,
    normalizeAISuggestions,
} = require('../src/core/chat-ai-helpers.js');

test('buildAIConfig resolves provider-specific defaults', () => {
    const config = buildAIConfig({
        aiClientConfig: {
            provider: 'nvidia',
            apiKey: 'key',
        },
        globalConfig: {
            nvidiaModel: 'model-a',
            aiResponseLength: 'medium',
            businessModeEnabled: true,
            businessContext: 'ctx',
            businessTone: 'direto',
        },
        providerConfig: {},
    });

    assert.deepEqual(config, {
        apiKey: 'key',
        model: 'model-a',
        profile: undefined,
        provider: 'nvidia',
        responseLength: 'medium',
        businessModeEnabled: true,
        businessContext: 'ctx',
        businessTone: 'direto',
    });
});

test('normalizeAISuggestions falls back and trims to three', () => {
    const result = normalizeAISuggestions([], [' a ', 'b', 'c', 'd']);

    assert.deepEqual(result.safe, [' a ', 'b', 'c', 'd']);
    assert.deepEqual(result.trimmed, ['a', 'b', 'c']);
});
