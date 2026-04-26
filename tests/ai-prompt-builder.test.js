const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyPersonalityToSystemPrompt,
    buildAIPrompts,
} = require('../src/core/ai-prompt-builder.js');

test('applyPersonalityToSystemPrompt appends UI addon when available', () => {
    const result = applyPersonalityToSystemPrompt({
        systemPrompt: 'BASE SYSTEM',
        personality: 'ousado',
        buildPersonalityAddon(personality) {
            return personality === 'ousado'
                ? '\n\nPersonalidade: ousado(a).'
                : '';
        },
    });

    assert.equal(result, 'BASE SYSTEM\n\nPersonalidade: ousado(a).');
});

test('buildAIPrompts forwards extracted chat context into aiClient.buildPrompts', () => {
    const calls = [];
    const result = buildAIPrompts({
        aiLoading: false,
        aiClient: {
            buildPrompts(payload) {
                calls.push(payload);
                return {
                    systemPrompt: 'SYSTEM',
                    userPrompt: 'USER',
                };
            },
        },
        aiClientConfig: {
            profile: 'Perfil do owner',
        },
        contextExtractor: {
            extract(container, options) {
                assert.equal(container.id, 'chat');
                assert.deepEqual(options, { fullHistory: true });
                return {
                    allMessages: [{ direction: 'in', text: 'Oi' }],
                };
            },
        },
        chatContainer: { id: 'chat' },
        extractProfileText() {
            return 'Ana\nArquiteta';
        },
        extractOtherPersonName() {
            return 'Ana';
        },
        getCurrentContactContextForPrompt() {
            return 'Gosta de trilha';
        },
        globalProfile: 'Perfil global ignorado',
    });

    assert.deepEqual(result, {
        systemPrompt: 'SYSTEM',
        userPrompt: 'USER',
    });
    assert.deepEqual(calls, [
        {
            messages: [{ direction: 'in', text: 'Oi' }],
            profile: 'Perfil do owner',
            otherPersonName: 'Ana',
            otherPersonProfile: 'Ana\nArquiteta',
            otherPersonContextNote: 'Gosta de trilha',
        },
    ]);
});
