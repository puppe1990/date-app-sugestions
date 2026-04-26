const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getEffectivePlatform,
    hasPlatformConversationChange,
    hasNewMessageMutation,
} = require('../src/core/chat-observer-helpers.js');

test('getEffectivePlatform falls back to whatsapp from hostname', () => {
    const platform = getEffectivePlatform({
        platform: '',
        hostname: 'web.whatsapp.com',
    });

    assert.equal(platform, 'whatsapp');
});

test('hasPlatformConversationChange detects selected chat change', () => {
    const changed = hasPlatformConversationChange([
        {
            type: 'attributes',
            attributeName: 'aria-selected',
            target: {
                getAttribute(name) {
                    return name === 'aria-selected' ? 'true' : '';
                },
            },
        },
    ]);

    assert.equal(changed, true);
});

test('hasNewMessageMutation detects a direct matching added node', () => {
    const changed = hasNewMessageMutation({
        mutations: [
            {
                type: 'childList',
                addedNodes: [
                    {
                        nodeType: 1,
                        matches(selector) {
                            return selector === '[data-message]';
                        },
                    },
                ],
            },
        ],
        messageSelector: '[data-message]',
    });

    assert.equal(changed, true);
});
