const js = require('@eslint/js');

const browserGlobals = {
    alert: 'readonly',
    chrome: 'readonly',
    clearInterval: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    localStorage: 'readonly',
    location: 'readonly',
    MutationObserver: 'readonly',
    navigator: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    URL: 'readonly',
    window: 'readonly',
};

const nodeGlobals = {
    __dirname: 'readonly',
    module: 'readonly',
    process: 'readonly',
    require: 'readonly',
};

module.exports = [
    {
        ignores: ['node_modules/**', '.husky/_/**'],
    },
    {
        files: ['**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: browserGlobals,
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    caughtErrors: 'none',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: ['tests/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: nodeGlobals,
        },
    },
];
