const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeClassList {
    add() {}
    remove() {}
    toggle() {}
}

class FakeElement {
    constructor(tagName, ownerDocument) {
        this.tagName = String(tagName || '').toUpperCase();
        this.ownerDocument = ownerDocument;
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.style = {};
        this.dataset = {};
        this.className = '';
        this.classList = new FakeClassList();
        this.disabled = false;
        this.value = '';
        this.textContent = '';
        this.innerText = '';
        this.innerHTML = '';
        this.parentElement = null;
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
        if (name === 'id') {
            this.id = value;
            this.ownerDocument.elementsById.set(value, this);
        }
    }

    addEventListener(type, listener) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(listener);
    }

    dispatchEvent(event) {
        const listeners = this.listeners[event.type] || [];
        listeners.forEach((listener) => listener(event));
        return true;
    }

    focus() {}

    click() {
        this.dispatchEvent({
            type: 'click',
            preventDefault() {},
            stopPropagation() {},
        });
    }
}

class FakeDocument {
    constructor() {
        this.elementsById = new Map();
        this.selectorMap = new Map();
        this.body = new FakeElement('body', this);
        this.head = new FakeElement('head', this);
        this.documentElement = new FakeElement('html', this);
        this.documentElement.classList = new FakeClassList();
    }

    createElement(tagName) {
        return new FakeElement(tagName, this);
    }

    getElementById(id) {
        return this.elementsById.get(id) || null;
    }

    querySelector(selector) {
        return this.selectorMap.get(selector) || null;
    }

    addEventListener() {}

    removeEventListener() {}
}

function loadSuggestionsUI({ document }) {
    const filePath = path.join(
        __dirname,
        '..',
        'src',
        'ui',
        'suggestions-ui.js',
    );
    const source = fs.readFileSync(filePath, 'utf8');
    const sandbox = {
        window: {
            ChatSuggestions: {
                ProviderConfig: {},
                constants: {
                    INPUT_SELECTORS: [],
                    SUGGESTION_LIBRARY: [],
                },
            },
            getSelection() {
                return {
                    removeAllRanges() {},
                    addRange() {},
                };
            },
            addEventListener() {},
            removeEventListener() {},
        },
        document,
        navigator: {},
        location: { hostname: 'badoo.com' },
        console,
        alert() {},
        setTimeout(fn) {
            fn();
            return 1;
        },
        clearTimeout() {},
        MutationObserver: class {
            disconnect() {}
            observe() {}
        },
        Event: class {
            constructor(type, init = {}) {
                this.type = type;
                Object.assign(this, init);
            }
        },
        InputEvent: class {
            constructor(type, init = {}) {
                this.type = type;
                Object.assign(this, init);
            }
        },
    };

    vm.runInNewContext(source, sandbox, { filename: 'suggestions-ui.js' });
    return sandbox.window.ChatSuggestions.SuggestionsUI;
}

test('Responder com IA usa o texto retornado pela IA para preencher o composer', async () => {
    const document = new FakeDocument();
    const input = document.createElement('textarea');
    document.selectorMap.set('#composer', input);

    const SuggestionsUI = loadSuggestionsUI({ document });
    const ui = new SuggestionsUI({
        inputSelector: '#composer',
        onAiReply: async () => 'Resposta gerada pela IA',
    });

    const button = ui.createAiReplyButton();

    assert.equal(button.textContent, 'Responder com IA');

    button.click();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(input.value, 'Resposta gerada pela IA');
});
