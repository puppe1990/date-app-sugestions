const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildConversationCopyText,
    buildClipboardPayload,
    getCopyProfileErrorMessage,
} = require('../src/core/chat-copy-helpers.js');
const {
    getCurrentHost,
    shouldRefreshBusinessMode,
    buildBusinessModeConfig,
} = require('../src/core/chat-config-helpers.js');

test('buildConversationCopyText trims long transcripts from the start', () => {
    const text = buildConversationCopyText({
        messages: [
            { direction: 'in', sender: 'Ana', text: 'Oi' },
            { direction: 'out', sender: 'Eu', text: 'Tudo bem?' },
            {
                direction: 'in',
                sender: 'Ana',
                text: 'Mensagem bem grande aqui',
            },
        ],
        otherPersonName: 'Ana',
        maxMessages: 10,
        maxChars: 35,
    });

    assert.equal(text.length <= 35, true);
    assert.equal(text.startsWith('1. Ana: Mensagem bem grande aqui'), true);
    assert.equal(text.includes('Oi'), false);
});

test('buildClipboardPayload merges profile and conversation blocks', () => {
    const payload = buildClipboardPayload({
        profileText: 'Perfil limpo',
        conversationText: '1. EU: Oi',
    });

    assert.equal(
        payload,
        'Perfil da outra pessoa:\nPerfil limpo\n\nConversa:\n1. EU: Oi',
    );
    assert.equal(
        getCopyProfileErrorMessage('badoo'),
        'Abra o perfil da pessoa e tente novamente',
    );
});

test('config helpers detect relevant business mode changes and host override', () => {
    const shouldRefresh = shouldRefreshBusinessMode({
        businessTone: { oldValue: 'a', newValue: 'b' },
    });
    const config = buildBusinessModeConfig({
        result: {
            businessModeEnabled: false,
            businessModeByHost: { 'web.whatsapp.com': true },
            businessContext: 'ctx',
            businessTone: 'consultivo',
            openRouterProfileCasual: 'casual',
            openRouterProfileBusiness: 'business',
        },
        host: 'web.whatsapp.com',
    });

    assert.equal(shouldRefresh, true);
    assert.deepEqual(config, {
        businessModeEnabled: true,
        businessContext: 'ctx',
        businessTone: 'consultivo',
        profileCasual: 'casual',
        profileBusiness: 'business',
    });
    assert.equal(
        getCurrentHost('https://web.whatsapp.com/'),
        'web.whatsapp.com',
    );
});
