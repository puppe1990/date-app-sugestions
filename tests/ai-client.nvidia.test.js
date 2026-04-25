const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const aiClientSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'ai-client.js'),
    'utf8',
);

const loadAIClient = ({ fetchImpl } = {}) => {
    const context = {
        window: {
            ChatSuggestions: {},
            badooChatSuggestionsDebug: false,
        },
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
