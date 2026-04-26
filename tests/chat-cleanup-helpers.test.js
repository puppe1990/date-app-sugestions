const test = require('node:test');
const assert = require('node:assert/strict');

const {
    cleanupControllerState,
} = require('../src/core/chat-cleanup-helpers.js');

test('cleanupControllerState disconnects observers, clears timers and nulls refs', () => {
    const calls = [];
    const controller = {
        chatObserver: {
            disconnect() {
                calls.push('chatObserver');
            },
        },
        platformObserver: {
            disconnect() {
                calls.push('platformObserver');
            },
        },
        profilePortalObserver: {
            disconnect() {
                calls.push('profilePortalObserver');
            },
        },
        profileClickHandler() {},
        messageCheckInterval: 1,
        periodicUpdateInterval: 2,
        updateTimeout: 3,
        initRetryTimeout: 4,
        ui: {
            destroy() {
                calls.push('ui.destroy');
            },
        },
        boundStorageChange() {},
        chatContainer: {},
        contextExtractor: {},
        suggestionEngine: {},
        lastMessageCount: 9,
    };
    const env = {
        document: {
            removeEventListener(eventName) {
                calls.push(`remove:${eventName}`);
            },
        },
        chrome: {
            storage: {
                onChanged: {
                    removeListener() {
                        calls.push('removeStorageListener');
                    },
                },
            },
        },
        clearInterval(id) {
            calls.push(`clearInterval:${id}`);
        },
        clearTimeout(id) {
            calls.push(`clearTimeout:${id}`);
        },
    };

    cleanupControllerState(controller, env);

    assert.deepEqual(calls, [
        'chatObserver',
        'platformObserver',
        'profilePortalObserver',
        'remove:click',
        'clearInterval:1',
        'clearInterval:2',
        'clearTimeout:3',
        'clearTimeout:4',
        'ui.destroy',
        'removeStorageListener',
    ]);
    assert.equal(controller.chatObserver, null);
    assert.equal(controller.ui, null);
    assert.equal(controller.lastMessageCount, 0);
});
