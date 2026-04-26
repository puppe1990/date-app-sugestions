const test = require('node:test');
const assert = require('node:assert/strict');

const {
    attachConfigListener,
    getCurrentHost,
    refreshBusinessModeFromStorage,
    setAIResponseLength,
    updateBusinessModeConfig,
} = require('../src/core/chat-controller-ai-config-helpers.js');

test('setAIResponseLength normalizes value and persists it', () => {
    const toastCalls = [];
    global.window = { badooChatSuggestionsConfig: {}, ChatSuggestions: {} };
    global.chrome = {
        storage: {
            local: {
                set(payload) {
                    toastCalls.push(['storage', payload]);
                },
            },
        },
    };

    const controller = {
        aiClientConfig: {},
        aiClient: {},
        ui: {
            showToast(message) {
                toastCalls.push(['toast', message]);
            },
        },
    };

    setAIResponseLength.call(controller, 'LONG');

    assert.equal(controller.aiClientConfig.responseLength, 'long');
    assert.equal(controller.aiClient.responseLength, 'long');
    assert.equal(window.badooChatSuggestionsConfig.aiResponseLength, 'long');
    assert.deepEqual(toastCalls, [
        ['storage', { aiResponseLength: 'long' }],
        ['toast', 'Respostas: Longa'],
    ]);
    delete global.chrome;
    delete global.window;
});

test('config helpers bind storage changes and refresh business mode from storage', () => {
    let listener = null;
    global.location = { href: 'https://web.whatsapp.com/' };
    global.window = {
        ChatSuggestions: {
            ChatConfigHelpers: {
                getCurrentHost() {
                    return 'web.whatsapp.com';
                },
                shouldRefreshBusinessMode(changes) {
                    return Boolean(changes.businessTone);
                },
                buildBusinessModeConfig({ result, host }) {
                    assert.equal(host, 'web.whatsapp.com');
                    assert.equal(result.businessTone, 'consultivo');
                    return {
                        businessModeEnabled: true,
                        businessContext: 'ctx',
                        businessTone: 'consultivo',
                        profileCasual: 'casual',
                        profileBusiness: 'business',
                    };
                },
            },
        },
    };
    global.chrome = {
        storage: {
            onChanged: {
                addListener(fn) {
                    listener = fn;
                },
            },
            local: {
                get(keys, callback) {
                    assert.equal(keys.includes('businessTone'), true);
                    callback({
                        businessTone: 'consultivo',
                    });
                },
            },
        },
    };

    const controller = {
        boundStorageChange: null,
        refreshBusinessModeFromStorage,
        getCurrentHost,
        updateCalls: [],
        updateBusinessModeConfig(config) {
            this.updateCalls.push(config);
        },
    };

    attachConfigListener.call(controller);
    listener({ businessTone: { oldValue: 'a', newValue: 'b' } }, 'local');

    assert.equal(typeof controller.boundStorageChange, 'function');
    assert.deepEqual(controller.updateCalls, [
        {
            businessModeEnabled: true,
            businessContext: 'ctx',
            businessTone: 'consultivo',
            profileCasual: 'casual',
            profileBusiness: 'business',
        },
    ]);
    delete global.chrome;
    delete global.location;
    delete global.window;
});

test('updateBusinessModeConfig syncs controller state and ui theme', () => {
    const themeCalls = [];
    const controller = {
        aiClientConfig: {},
        aiClient: {},
        ui: {
            applyConversationModeTheme(mode) {
                themeCalls.push(mode);
            },
        },
    };

    updateBusinessModeConfig.call(controller, {
        businessModeEnabled: true,
        businessContext: 'ctx',
        businessTone: 'consultivo',
        profileCasual: 'casual',
        profileBusiness: 'business',
    });

    assert.deepEqual(controller.aiClientConfig, {
        businessModeEnabled: true,
        businessContext: 'ctx',
        businessTone: 'consultivo',
        profile: 'business',
    });
    assert.equal(controller.aiClient.profile, 'business');
    assert.deepEqual(themeCalls, ['business']);
});
