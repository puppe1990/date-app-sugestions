const test = require('node:test');
const assert = require('node:assert/strict');

const {
    shouldSetupProfileCapture,
    findProfileTrigger,
    buildProfileCacheState,
    shouldStopProfileObserver,
} = require('../src/core/chat-profile-lifecycle-helpers.js');

test('shouldSetupProfileCapture only enables badoo or unspecified platform', () => {
    assert.equal(
        shouldSetupProfileCapture({
            platform: 'badoo',
            hasObserver: false,
            hasClickHandler: false,
        }),
        true,
    );
    assert.equal(
        shouldSetupProfileCapture({
            platform: 'whatsapp',
            hasObserver: false,
            hasClickHandler: false,
        }),
        false,
    );
});

test('findProfileTrigger returns first matching selector', () => {
    const target = {
        closest(selector) {
            return selector === '.mini-profile__user-info'
                ? { id: 'match' }
                : null;
        },
    };

    const trigger = findProfileTrigger({
        target,
        triggerSelectors: ['#x', '.mini-profile__user-info'],
    });

    assert.deepEqual(trigger, { id: 'match' });
});

test('buildProfileCacheState stores changed text and name', () => {
    const state = buildProfileCacheState({
        text: 'Perfil',
        previousText: '',
        name: 'Ana',
        now: 123,
    });

    assert.deepEqual(state, {
        changed: true,
        cache: {
            text: 'Perfil',
            updatedAt: 123,
            name: 'Ana',
        },
    });
});

test('shouldStopProfileObserver stops on timeout or settled bio', () => {
    assert.equal(
        shouldStopProfileObserver({
            elapsed: 8000,
            timeoutMs: 7000,
            settledFor: 0,
            cachedText: '',
        }),
        true,
    );
    assert.equal(
        shouldStopProfileObserver({
            elapsed: 2000,
            timeoutMs: 7000,
            settledFor: 900,
            cachedText: 'Sobre mim: oi',
        }),
        true,
    );
});
