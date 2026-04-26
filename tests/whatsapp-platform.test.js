const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const registrySource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'platforms', 'platform-registry.js'),
    'utf8',
);
const whatsappSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'platforms', 'whatsapp.js'),
    'utf8',
);
const messageReaderSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'context', 'message-reader.js'),
    'utf8',
);
const controllerSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-controller.js'),
    'utf8',
);
const chatObserverHelpersSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-observer-helpers.js'),
    'utf8',
);
const profileParserSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'profile-parser.js'),
    'utf8',
);
const chatCopyHelpersSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-copy-helpers.js'),
    'utf8',
);
const chatConfigHelpersSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-config-helpers.js'),
    'utf8',
);
const chatAIHelpersSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-ai-helpers.js'),
    'utf8',
);
const chatProfileLifecycleHelpersSource = fs.readFileSync(
    path.join(
        __dirname,
        '..',
        'src',
        'core',
        'chat-profile-lifecycle-helpers.js',
    ),
    'utf8',
);

function loadWhatsAppDefaults() {
    const sandbox = {
        window: {
            ChatSuggestions: {},
        },
        console,
    };

    vm.runInNewContext(registrySource, sandbox, {
        filename: 'platform-registry.js',
    });
    vm.runInNewContext(whatsappSource, sandbox, {
        filename: 'whatsapp.js',
    });

    return sandbox.window.ChatSuggestions.PlatformRegistry.getDefaults(
        'whatsapp',
    );
}

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

function loadChatController({ document }) {
    const sandbox = {
        window: {
            ChatSuggestions: {
                createBadooMessageReader() {
                    return {
                        config: {},
                        read() {
                            return [];
                        },
                    };
                },
            },
        },
        document,
        MutationObserver: class {
            disconnect() {}
            observe() {}
        },
        console,
        alert() {},
        setTimeout() {
            return 1;
        },
        clearTimeout() {},
    };

    vm.runInNewContext(chatObserverHelpersSource, sandbox, {
        filename: 'chat-observer-helpers.js',
    });
    vm.runInNewContext(profileParserSource, sandbox, {
        filename: 'profile-parser.js',
    });
    vm.runInNewContext(chatCopyHelpersSource, sandbox, {
        filename: 'chat-copy-helpers.js',
    });
    vm.runInNewContext(chatConfigHelpersSource, sandbox, {
        filename: 'chat-config-helpers.js',
    });
    vm.runInNewContext(chatAIHelpersSource, sandbox, {
        filename: 'chat-ai-helpers.js',
    });
    vm.runInNewContext(chatProfileLifecycleHelpersSource, sandbox, {
        filename: 'chat-profile-lifecycle-helpers.js',
    });
    vm.runInNewContext(controllerSource, sandbox, {
        filename: 'chat-controller.js',
    });
    return sandbox.window.ChatSuggestions.ChatSuggestionsController;
}

test('WhatsApp reader ignores nested duplicate nodes from the same message', () => {
    const defaults = loadWhatsAppDefaults();
    const MessageReader = loadMessageReader();
    const reader = new MessageReader(defaults.messageReaderConfig);

    const nestedTextNode = {
        matches(selector) {
            return selector.includes('span[data-testid="selectable-text"]');
        },
        textContent: 'Pedagogia e Letras Língua Portuguesa',
    };

    const nestedCopyableNode = {
        getAttribute(name) {
            if (name === 'data-pre-plain-text') {
                return '[13:20, 25/04/2026] Kassia Alves: ';
            }
            return '';
        },
    };

    const rootNode = {
        querySelector(selector) {
            if (selector.includes('span[data-testid="selectable-text"]')) {
                return nestedTextNode;
            }
            if (selector.includes('[data-pre-plain-text]')) {
                return nestedCopyableNode;
            }
            return null;
        },
        querySelectorAll() {
            return [];
        },
        getAttribute() {
            return '';
        },
        textContent: 'Pedagogia e Letras Língua Portuguesa 13:20',
        classList: {
            contains(value) {
                return value === 'message-in';
            },
        },
        closest(selector) {
            if (selector === 'div.message-in') return this;
            if (selector === 'div.message-out') return null;
            return null;
        },
    };

    const duplicateNestedNode = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        },
        getAttribute(name) {
            if (name === 'data-pre-plain-text') {
                return '[13:20, 25/04/2026] Kassia Alves: ';
            }
            return '';
        },
        textContent: 'Pedagogia e Letras Língua Portuguesa',
        classList: {
            contains() {
                return false;
            },
        },
        closest(selector) {
            if (selector.includes('div[data-testid="msg-container"]')) {
                return rootNode;
            }
            if (selector.includes('div.message-in')) return rootNode;
            return null;
        },
    };

    const container = {
        querySelectorAll(selector) {
            assert.equal(
                selector,
                defaults.messageReaderConfig.messageSelector,
            );
            return [rootNode, duplicateNestedNode];
        },
    };

    const messages = reader.read(container);

    const normalized = Array.from(messages).map((message) => ({
        sender: message.sender,
        text: message.text,
        direction: message.direction,
        type: message.type,
    }));

    assert.deepEqual(normalized, [
        {
            sender: 'Kassia Alves',
            text: 'Pedagogia e Letras Língua Portuguesa',
            direction: 'in',
            type: 'text',
        },
    ]);
});

test('WhatsApp reader does not treat bare timestamps as message text', () => {
    const defaults = loadWhatsAppDefaults();
    const MessageReader = loadMessageReader();
    const reader = new MessageReader(defaults.messageReaderConfig);

    const noisyNode = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        },
        getAttribute(name) {
            if (name === 'data-pre-plain-text') {
                return '[13:25, 25/04/2026] Kassia Alves: ';
            }
            return '';
        },
        textContent: '13:25',
        classList: {
            contains(value) {
                return value === 'message-in';
            },
        },
        closest(selector) {
            if (selector === 'div.message-in') return this;
            return null;
        },
    };

    const container = {
        querySelectorAll() {
            return [noisyNode];
        },
    };

    const messages = reader.read(container);

    assert.deepEqual(Array.from(messages), []);
});

test('Chat controller prefers the open WhatsApp header name over sidebar matches', () => {
    const document = {
        querySelector(selector) {
            if (selector === '#main header span[title]') {
                return {
                    textContent: 'Kassia Alves',
                    innerText: 'Kassia Alves',
                };
            }
            if (
                selector ===
                '#pane-side [role="row"][aria-selected="true"] span[title]'
            ) {
                return {
                    textContent: 'Henrique Braga',
                    innerText: 'Henrique Braga',
                };
            }
            return null;
        },
        addEventListener() {},
        removeEventListener() {},
    };

    const ChatSuggestionsController = loadChatController({ document });
    const controller = new ChatSuggestionsController({
        otherPersonNameSelector:
            '#main header span[title], #pane-side [role="row"][aria-selected="true"] span[title]',
    });

    assert.equal(controller.extractOtherPersonName(), 'Kassia Alves');
});
