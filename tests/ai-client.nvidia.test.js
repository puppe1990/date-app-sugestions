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

test('AIClient prompt tells the model to continue the current topic when the last inbound is a short confirmation', () => {
    const AIClient = loadAIClient();
    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const prompt = client.buildUserPrompt(
        [
            { direction: 'out', sender: 'Eu', text: 'mora onde?' },
            {
                direction: 'in',
                sender: 'Tammy',
                text: 'ZL vila Formosa e vc ?',
            },
            { direction: 'out', sender: 'Eu', text: 'belenzinho' },
            { direction: 'in', sender: 'Tammy', text: 'Perto' },
            { direction: 'out', sender: 'Eu', text: 'vizinha de zl' },
            { direction: 'in', sender: 'Tammy', text: 'Super' },
        ],
        '',
        'Tammy',
        'short',
        '',
        '',
    );

    assert.match(
        prompt,
        /Se a mensagem pendente for curta e confirmatória \(ex\.: "sim", "siiim", "super", "perto", "kkk"\), continue o assunto em andamento em vez de reiniciar a conversa\./,
    );
    assert.match(
        prompt,
        /Nunca abra com saudações genéricas como "oi", "olá", "boa tarde" ou "como você está\?" se o chat já está em andamento\./,
    );
});

test('AIClient does not duplicate the other person profile in both system and user prompts', () => {
    const AIClient = loadAIClient();
    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const { systemPrompt, userPrompt } = client.buildPrompts({
        messages: [
            { direction: 'out', sender: 'Eu', text: 'mora onde?' },
            { direction: 'in', sender: 'Mell', text: 'VL. Alpina' },
        ],
        otherPersonName: 'Mell',
        otherPersonProfile: 'Mell\n49\nSão Paulo\nConectados hoje',
    });

    assert.match(systemPrompt, /Contexto sobre a outra pessoa \(perfil\):/);
    assert.doesNotMatch(userPrompt, /Perfil da outra pessoa:/);
});

test('AIClient prompt prioritizes the pending question over generic profile topics', () => {
    const AIClient = loadAIClient();
    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const prompt = client.buildUserPrompt(
        [
            {
                direction: 'out',
                sender: 'Eu',
                text: 'Uma conversa mais longa sobre nossos interesses em comum.',
            },
            { direction: 'in', sender: 'Mell', text: 'Gostei' },
            {
                direction: 'in',
                sender: 'Mell',
                text: 'O q gostaria de saber !!??',
            },
        ],
        'Tenho 36 anos, moro em SP e curto leitura, academia e tecnologia.',
        'Mell',
        'long',
        'Perfil: Mell, São Paulo. Interesses: leitura; YouTube; viagens.',
        '',
    );

    assert.match(
        prompt,
        /PRIORIDADE MÁXIMA: responda diretamente à mensagem pendente antes de puxar assuntos amplos do perfil ou temas genéricos\./,
    );
    assert.match(
        prompt,
        /Se a outra pessoa perguntou o que eu quero saber, responda com exemplos concretos do que eu gostaria de saber sobre ela, sem desviar para uma lista genérica de interesses\./,
    );
});

test('AIClient filters generic restart suggestions when the chat is already in progress', async () => {
    const AIClient = loadAIClient({
        fetchImpl: async () => ({
            ok: true,
            async json() {
                return {
                    choices: [
                        {
                            message: {
                                content: JSON.stringify({
                                    suggestions: [
                                        'Boa tarde! Como você está?',
                                        'Boa tarde! Tudo bem?',
                                        'Você ficou de ressaca feia então 😂 melhorou hoje?',
                                    ],
                                }),
                            },
                        },
                    ],
                };
            },
        }),
    });

    const client = new AIClient({
        apiKey: 'nvapi-test',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    const suggestions = await client.generateSuggestionsWithPrompts({
        systemPrompt: 'BASE SYSTEM',
        userPrompt: client.buildUserPrompt(
            [
                {
                    direction: 'out',
                    sender: 'Eu',
                    text: 'gostou das minhas fotos?',
                },
                { direction: 'in', sender: 'Mell', text: 'Gostei do q vi' },
                { direction: 'in', sender: 'Mell', text: 'Vc achou' },
                {
                    direction: 'in',
                    sender: 'Mell',
                    text: 'Pq resolveu voltar após tanto tempo !!???',
                },
                { direction: 'out', sender: 'Eu', text: 'eu voltei a dormir' },
                { direction: 'out', sender: 'Eu', text: 'tava de ressaca' },
                {
                    direction: 'out',
                    sender: 'Eu',
                    text: 'bebi cerveja demais ontem',
                },
                { direction: 'in', sender: 'Mell', text: 'Hummm' },
            ],
            '',
            'Mell',
            'short',
            '',
            '',
        ),
    });

    assert.deepEqual(Array.from(suggestions), [
        'Você ficou de ressaca feia então 😂 melhorou hoje?',
    ]);
});
