const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeContactKey,
    buildContactKeyFromUrl,
    buildWhatsAppContactKey,
    trimContactContext,
    getCurrentContactContextForPrompt,
} = require('../src/core/contact-context-manager.js');

test('normalizeContactKey replaces unsafe chars and caps size', () => {
    const key = normalizeContactKey('  whatsapp:name:Ana / Silva?  ');

    assert.equal(key, 'whatsapp:name:Ana___Silva_');
    assert.equal(normalizeContactKey('x'.repeat(200)).length, 160);
});

test('buildContactKeyFromUrl prefers message ids from url paths', () => {
    const key = buildContactKeyFromUrl({
        href: 'https://badoo.com/messages/abc-123?x=1',
        platform: 'badoo',
    });

    assert.equal(key, 'badoo:abc-123');
});

test('buildWhatsAppContactKey prefers selected chat data-id over title', () => {
    const selected = {
        getAttribute(name) {
            return name === 'data-id' ? '999@c.us' : '';
        },
        dataset: {},
        querySelector() {
            return null;
        },
    };
    const documentLike = {
        querySelector(selector) {
            assert.match(selector, /#pane-side/);
            return selected;
        },
    };

    const key = buildWhatsAppContactKey({ document: documentLike });

    assert.equal(key, 'whatsapp:chat:999_c_us');
});

test('trimContactContext and prompt helper cap stored text to 4000 chars', () => {
    const longText = 'a'.repeat(5000);

    assert.equal(trimContactContext(longText).length, 4000);
    assert.equal(
        getCurrentContactContextForPrompt({
            currentContactContextText: longText,
        }).length,
        4000,
    );
});
