const test = require('node:test');
const assert = require('node:assert/strict');

const providerConfig = require('../src/core/provider-config.js');

test('provider config exposes NVIDIA free models and picks a stable default', () => {
    assert.equal(providerConfig.DEFAULT_PROVIDER, 'nvidia');
    assert.ok(Array.isArray(providerConfig.NVIDIA_MODELS));
    assert.ok(providerConfig.NVIDIA_MODELS.length > 0);
    assert.equal(
        providerConfig.getDefaultModelForProvider('nvidia'),
        providerConfig.DEFAULT_NVIDIA_MODEL,
    );
});

test('provider config reads NVIDIA key from env text', () => {
    const parsed = providerConfig.parseEnvKeys(
        [
            'OPENROUTER_API_KEY=or-test',
            'GEMINI_API_KEY=gem-test',
            'NVIDIA_API_KEY=nv-test',
        ].join('\n'),
    );

    assert.deepEqual(parsed, {
        openrouterKey: 'or-test',
        geminiKey: 'gem-test',
        nvidiaKey: 'nv-test',
    });
});

test('provider config resolves provider api key from env only', () => {
    const envKeys = {
        openrouterKey: 'or-env',
        geminiKey: 'gem-env',
        nvidiaKey: 'nv-env',
    };

    assert.equal(
        providerConfig.getApiKeyForProvider('openrouter', envKeys),
        'or-env',
    );
    assert.equal(
        providerConfig.getApiKeyForProvider('gemini', envKeys),
        'gem-env',
    );
    assert.equal(
        providerConfig.getApiKeyForProvider('nvidia', envKeys),
        'nv-env',
    );
});
