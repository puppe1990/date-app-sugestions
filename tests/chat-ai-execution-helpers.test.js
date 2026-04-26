const test = require('node:test');
const assert = require('node:assert/strict');

const {
    runAIGeneration,
    runControllerAIGeneration,
    setAIRequestState,
} = require('../src/core/chat-ai-execution-helpers.js');

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

test('setAIRequestState syncs controller and ui loading flags', () => {
    const calls = [];
    const controller = {
        aiLoading: false,
        ui: {
            setAiLoading(value) {
                calls.push(['loading', value]);
            },
            setAiPromptSending(value) {
                calls.push(['sending', value]);
            },
        },
    };

    setAIRequestState({ controller, loading: true, sendingPrompt: true });

    assert.equal(controller.aiLoading, true);
    assert.deepEqual(calls, [
        ['loading', true],
        ['sending', true],
    ]);
});

test('runControllerAIGeneration renders normalized suggestions', async () => {
    global.window = {
        ChatSuggestions: {
            ChatAIHelpers: {
                normalizeAISuggestions(aiSuggestions, fallbackSuggestions) {
                    assert.deepEqual(aiSuggestions, ['raw']);
                    assert.deepEqual(fallbackSuggestions, ['fallback']);
                    return { safe: ['safe'], trimmed: ['safe'] };
                },
            },
        },
    };

    const renderCalls = [];
    const controller = {
        aiClient: { id: 2 },
        suggestionEngine: {
            getDefaultSuggestions() {
                return ['fallback'];
            },
        },
        ui: {
            render(items, meta) {
                renderCalls.push({ items, meta });
            },
            closeAiPromptModal() {
                renderCalls.push({ modalClosed: true });
            },
        },
        info(message, payload) {
            renderCalls.push({ message, payload });
        },
    };

    const result = await runControllerAIGeneration({
        controller,
        async request(client) {
            assert.equal(client.id, 2);
            return ['raw'];
        },
        closePromptModal: true,
    });

    assert.deepEqual(result, { safe: ['safe'], trimmed: ['safe'] });
    assert.deepEqual(renderCalls, [
        { items: ['safe'], meta: { isAI: true } },
        { message: 'Sugestões de IA geradas', payload: { total: 1 } },
        { modalClosed: true },
    ]);
    delete global.window;
});
