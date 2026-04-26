const test = require('node:test');
const assert = require('node:assert/strict');

const {
    sanitizeProfileText,
    extractOtherPersonName,
    extractBadooProfileTextFromPortal,
} = require('../src/core/profile-parser.js');

test('sanitizeProfileText removes noisy duplicated profile lines', () => {
    const raw = [
        'Mell',
        ', 49',
        'Mell, 49 anos, Online agora, Rolou uma conexão, Curtiu você',
        'São Paulo',
        'Profissão: São Paulo',
        'Educação',
        'Conectados hoje',
        'Conectados hoje',
        'Abrir perfil',
    ].join('\n');

    const cleaned = sanitizeProfileText({
        raw,
        otherPersonName: 'Mell',
    });

    assert.equal(cleaned.includes('Abrir perfil'), false);
    assert.equal(cleaned.includes('Educação'), false);
    assert.equal(cleaned.includes('Profissão: São Paulo'), false);
    assert.equal(cleaned.includes('Conectados hoje\nConectados hoje'), false);
    assert.match(cleaned, /Mell, 49 anos/);
});

test('extractOtherPersonName picks first clean selector value', () => {
    const documentLike = {
        querySelector(selector) {
            if (selector === '.csms-profile-info__name-inner') {
                return { textContent: 'Mayara, Abrir perfil' };
            }
            return null;
        },
    };

    const name = extractOtherPersonName({
        document: documentLike,
        selectors: ['.csms-profile-info__name-inner'],
    });

    assert.equal(name, 'Mayara');
});

test('extractBadooProfileTextFromPortal builds compact structured text', () => {
    const blocks = {
        about: {
            querySelector(selector) {
                if (selector === '.csms-view-profile-block__content') {
                    return { textContent: 'Ama viajar e cozinhar' };
                }
                return null;
            },
        },
        location: {
            querySelector(selector) {
                if (selector === '.csms-view-profile-block__header-text') {
                    return { textContent: 'São Paulo' };
                }
                return null;
            },
        },
        info: {
            querySelectorAll(selector) {
                if (selector === '.profile-badges__item .csms-badge__text') {
                    return [
                        { textContent: 'Arquiteta' },
                        { textContent: 'Pets' },
                    ];
                }
                return [];
            },
        },
        interests: {
            querySelectorAll(selector) {
                if (
                    selector ===
                    '.profile-badges__item [data-qa="badge"] .csms-badge__text'
                ) {
                    return [
                        { textContent: 'Trilhas' },
                        { textContent: 'Café' },
                    ];
                }
                return [];
            },
        },
    };

    const portal = {
        querySelector(selector) {
            if (selector === '[data-qa="profile-info__name"]') {
                return { textContent: 'Ana' };
            }
            if (selector === '[data-qa="profile-info__age"]') {
                return { textContent: '32' };
            }
            if (selector === '.user-section[data-qa="about-me"]') {
                return blocks.about;
            }
            if (selector === '.user-section[data-qa="location"]') {
                return blocks.location;
            }
            if (selector === '.user-section[data-qa="about-me-badges"]') {
                return blocks.info;
            }
            if (selector === '.user-section[data-qa="interests"]') {
                return blocks.interests;
            }
            return null;
        },
        querySelectorAll(selector) {
            if (selector === '.user-section[data-qa^="profile-question-"]') {
                return [
                    {
                        querySelector(inner) {
                            if (inner === '[data-qa="overlay-action"]') {
                                return { textContent: 'Domingo perfeito?' };
                            }
                            if (
                                inner ===
                                '.csms-view-profile-block__header-text'
                            ) {
                                return { textContent: 'Brunch e parque' };
                            }
                            return null;
                        },
                    },
                ];
            }
            return [];
        },
    };
    const documentLike = {
        querySelector(selector) {
            if (
                selector ===
                '[data-qa="profile-portal-content-container_wrapper"], .profile-portal-container'
            ) {
                return portal;
            }
            return null;
        },
    };

    const text = extractBadooProfileTextFromPortal({
        document: documentLike,
        debug: false,
        info() {},
    });

    assert.match(text, /Perfil: Ana, 32 anos/);
    assert.match(text, /Sobre mim: Ama viajar e cozinhar/);
    assert.match(text, /Localização: São Paulo/);
    assert.match(text, /Informações: Arquiteta; Pets/);
    assert.match(text, /Interesses: Trilhas; Café/);
    assert.match(text, /Perguntas: Domingo perfeito\?: Brunch e parque/);
});
