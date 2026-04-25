const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const messageReaderSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'context', 'message-reader.js'),
    'utf8',
);

function loadMessageReader() {
    const sandbox = {
        window: {
            ChatSuggestions: {},
        },
        console,
    };
    vm.runInNewContext(messageReaderSource, sandbox, {
        filename: 'message-reader.js',
    });
    return sandbox.window.ChatSuggestions.MessageReader;
}

test('MessageReader uses fallback selectors when the primary selector returns no messages', () => {
    const MessageReader = loadMessageReader();
    const fallbackNode = {
        textContent: 'vizinha de zl',
        querySelector() {
            return null;
        },
        getAttribute(name) {
            if (name === 'data-direction') return 'out';
            return '';
        },
    };

    const selectorsAsked = [];
    const container = {
        querySelectorAll(selector) {
            selectorsAsked.push(selector);
            if (selector === '[data-qa="chat-message"]') {
                return [];
            }
            if (selector === '.modern-bubble') {
                return [fallbackNode];
            }
            return [];
        },
    };

    const reader = new MessageReader({
        messageSelector: '[data-qa="chat-message"]',
        fallbackMessageSelector: '.modern-bubble',
        allowTextContentFallback: true,
        directionAttr: 'data-direction',
        directionInValue: 'in',
        directionOutValue: 'out',
    });

    const messages = reader.read(container);

    assert.equal(messages.length, 1);
    assert.equal(messages[0].text, 'vizinha de zl');
    assert.equal(messages[0].direction, 'out');
    assert.deepEqual(selectorsAsked, [
        '[data-qa="chat-message"]',
        '.modern-bubble',
    ]);
});
