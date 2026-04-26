const test = require('node:test');
const assert = require('node:assert/strict');

const { runAIGeneration } = require('../src/core/chat-ai-execution-helpers.js');

test('runAIGeneration delegates to request and normalizer', async () => {
    const result = await runAIGeneration({
        aiClient: { id: 1 },
        fallbackSuggestions: ['fallback'],
        async request(client) {
            assert.equal(client.id, 1);
            return ['raw'];
        },
        normalizeAISuggestions(aiSuggestions, fallbackSuggestions) {
            assert.deepEqual(aiSuggestions, ['raw']);
            assert.deepEqual(fallbackSuggestions, ['fallback']);
            return { safe: ['ok'], trimmed: ['ok'] };
        },
    });

    assert.deepEqual(result, { safe: ['ok'], trimmed: ['ok'] });
});
