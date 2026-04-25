const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const aiClientSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'ai-client.js'),
    'utf8',
);

const loadAIClient = ({ fetchImpl, chromeImpl } = {}) => {
    const context = {
        window: {
            ChatSuggestions: {},
            badooChatSuggestionsDebug: false,
        },
        chrome: chromeImpl,
        fetch:
            fetchImpl ||
            (async () => {
                throw new Error('fetch não configurado no teste');
            }),
        console,
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(aiClientSource, context);
    return context.window.ChatSuggestions.AIClient;
};

test('AIClient uses NVIDIA chat completions endpoint for nvidia provider', async () => {
    const requests = [];
    const AIClient = loadAIClient({
        fetchImpl: async (url, options) => {
            requests.push({
                url,
                options: {
                    ...options,
                    body: JSON.parse(options.body),
                },
            });
            return {
                ok: true,
                async json() {
                    return {
                        choices: [
                            {
                                message: {
                                    content:
                                        '{"suggestions":["Resposta NVIDIA"]}',
                                },
                            },
                        ],
                    };
                },
            };
        },
    });

    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const suggestions = await client.generateSuggestions({
        messages: [{ direction: 'in', sender: 'Ana', text: 'Tudo bem?' }],
    });

    assert.deepEqual(Array.from(suggestions), ['Resposta NVIDIA']);
    assert.equal(requests.length, 1);
    assert.equal(
        requests[0].url,
        'https://integrate.api.nvidia.com/v1/chat/completions',
    );
    assert.equal(
        requests[0].options.headers.Authorization,
        'Bearer nvapi-test',
    );
    assert.equal(requests[0].options.body.model, 'meta/llama-3.1-8b-instruct');
});

test('AIClient routes network calls through extension runtime when available', async () => {
    const requests = [];
    const AIClient = loadAIClient({
        fetchImpl: async () => {
            throw new Error('fetch direto não deveria ser chamado');
        },
        chromeImpl: {
            runtime: {
                sendMessage(payload, callback) {
                    requests.push(payload);
                    callback({
                        ok: true,
                        status: 200,
                        data: {
                            choices: [
                                {
                                    message: {
                                        content:
                                            '{"suggestions":["Resposta via runtime"]}',
                                    },
                                },
                            ],
                        },
                    });
                },
            },
        },
    });

    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const suggestions = await client.generateSuggestions({
        messages: [{ direction: 'in', sender: 'Ana', text: 'Tudo bem?' }],
    });

    assert.deepEqual(Array.from(suggestions), ['Resposta via runtime']);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].type, 'CHAT_SUGGESTIONS_FETCH');
    assert.equal(
        requests[0].url,
        'https://integrate.api.nvidia.com/v1/chat/completions',
    );
});
