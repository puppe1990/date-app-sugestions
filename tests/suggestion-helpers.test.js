const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDefaultSuggestions,
    buildPersonalizedSuggestions,
    dedupeSuggestions,
} = require('../src/suggestions/suggestion-helpers.js');

test('buildDefaultSuggestions uses morning greeting before noon', () => {
    const suggestions = buildDefaultSuggestions({
        now: new Date('2026-04-26T08:00:00Z'),
    });

    assert.equal(suggestions[0], 'Bom dia! Como você está?');
    assert.equal(suggestions.includes('Bom dia! Prazer em te conhecer'), true);
});

test('buildPersonalizedSuggestions adds my place only when not already repeated', () => {
    const suggestions = buildPersonalizedSuggestions({
        mentionedPlaces: ['Vila Formosa', 'Tatuapé'],
        mentionedJobs: [],
        mentionedHobbies: [],
        hasQuestions: false,
        questions: [],
        lastMessages: [
            { direction: 'out', text: 'Sou do Tatuapé' },
            { direction: 'in', text: 'Moro na Vila Formosa' },
        ],
    });

    assert.equal(suggestions.includes('Eu sou de Tatuapé.'), false);
    assert.equal(suggestions.includes('Legal, Vila Formosa!'), true);
});

test('dedupeSuggestions normalizes spaces and casing and limits results', () => {
    const suggestions = dedupeSuggestions([
        'Oi',
        ' oi ',
        'Tudo bem?',
        'Tudo bem?',
        'Bora sair?',
        'Como foi seu dia?',
        'Curte viajar?',
        'Extra',
    ]);

    assert.deepEqual(suggestions, [
        'Oi',
        'Tudo bem?',
        'Bora sair?',
        'Como foi seu dia?',
        'Curte viajar?',
    ]);
});
