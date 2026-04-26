const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controllerSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-controller.js'),
    'utf8',
);
const promptBuilderSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'ai-prompt-builder.js'),
    'utf8',
);
const contactContextManagerSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'contact-context-manager.js'),
    'utf8',
);
const profileParserSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'profile-parser.js'),
    'utf8',
);
const chatObserverHelpersSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'chat-observer-helpers.js'),
    'utf8',
);
const aiClientSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'ai-client.js'),
    'utf8',
);

function loadChatController() {
    const sandbox = {
        window: {
            ChatSuggestions: {},
        },
        document: {
            querySelector() {
                return null;
            },
            addEventListener() {},
            removeEventListener() {},
        },
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

    vm.runInNewContext(promptBuilderSource, sandbox, {
        filename: 'ai-prompt-builder.js',
    });
    vm.runInNewContext(contactContextManagerSource, sandbox, {
        filename: 'contact-context-manager.js',
    });
    vm.runInNewContext(profileParserSource, sandbox, {
        filename: 'profile-parser.js',
    });
    vm.runInNewContext(chatObserverHelpersSource, sandbox, {
        filename: 'chat-observer-helpers.js',
    });
    vm.runInNewContext(controllerSource, sandbox, {
        filename: 'chat-controller.js',
    });
    return sandbox.window.ChatSuggestions.ChatSuggestionsController;
}

function loadAIClient() {
    const sandbox = {
        window: {
            ChatSuggestions: {},
            badooChatSuggestionsDebug: false,
        },
        fetch: async () => {
            throw new Error('fetch não configurado no teste');
        },
        console,
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(aiClientSource, sandbox, {
        filename: 'ai-client.js',
    });
    return sandbox.window.ChatSuggestions.AIClient;
}

test('one-click AI reply forwards personality into the generated prompt', async () => {
    const ChatSuggestionsController = loadChatController();
    const promptCalls = [];
    const controller = new ChatSuggestionsController({
        messageReader: {
            config: {
                messageSelector: '[data-qa="chat-message"]',
            },
        },
        aiClient: {
            buildPrompts() {
                return {
                    systemPrompt: 'BASE SYSTEM',
                    userPrompt: 'BASE USER',
                };
            },
            async generateSuggestionsWithPrompts(payload) {
                promptCalls.push(payload);
                return ['Resposta ousada'];
            },
        },
    });

    controller.chatContainer = {};
    controller.contextExtractor = {
        extract() {
            return {
                allMessages: [{ direction: 'in', sender: 'Ana', text: 'Oi' }],
            };
        },
    };
    controller.suggestionEngine = {
        getDefaultSuggestions() {
            return ['Fallback'];
        },
    };
    controller.ui = {
        setAiLoading() {},
        render() {},
        buildPersonalityAddon(personality) {
            if (personality === 'ousado') {
                return '\n\nRegras de estilo (personalidade):\n- Personalidade: ousado(a).';
            }
            return '';
        },
    };
    controller.extractProfileText = () => '';
    controller.extractOtherPersonName = () => 'Ana';
    controller.getCurrentContactContextForPrompt = () => '';

    const result = await controller.generateAIReplySuggestions({
        personality: 'ousado',
    });

    assert.deepEqual(Array.from(result), ['Resposta ousada']);
    assert.equal(promptCalls.length, 1);
    assert.match(promptCalls[0].systemPrompt, /Personalidade: ousado\(a\)\./);
    assert.equal(promptCalls[0].userPrompt, 'BASE USER');
});

test('one-click AI reply sends current conversation context into the AI call', async () => {
    const ChatSuggestionsController = loadChatController();
    const AIClient = loadAIClient();
    const promptCalls = [];
    const aiClient = new AIClient({
        apiKey: 'test-key',
        provider: 'nvidia',
        model: 'meta/llama-3.1-8b-instruct',
    });

    aiClient.generateSuggestionsWithPrompts = async (payload) => {
        promptCalls.push(payload);
        return ['Resposta com contexto'];
    };

    const controller = new ChatSuggestionsController({
        messageReader: {
            config: {
                messageSelector: '[data-qa="chat-message"]',
            },
        },
        aiClient,
    });

    controller.chatContainer = {};
    controller.contextExtractor = {
        extract() {
            return {
                allMessages: [
                    { direction: 'out', sender: 'Matheus', text: 'bom dia' },
                    { direction: 'out', sender: 'Matheus', text: 'tudo bem?' },
                    { direction: 'in', sender: 'Tammy', text: 'Sim e vc?' },
                    { direction: 'in', sender: 'Tammy', text: 'Bom dia' },
                    { direction: 'out', sender: 'Matheus', text: 'tudo otimo' },
                    { direction: 'out', sender: 'Matheus', text: 'mora onde?' },
                    {
                        direction: 'in',
                        sender: 'Tammy',
                        text: 'ZL vila Formosa e vc ?',
                    },
                    { direction: 'out', sender: 'Matheus', text: 'belenzinho' },
                    { direction: 'in', sender: 'Tammy', text: 'Perto' },
                    {
                        direction: 'out',
                        sender: 'Matheus',
                        text: 'vizinha de zl',
                    },
                    { direction: 'in', sender: 'Tammy', text: 'Siiim' },
                    { direction: 'in', sender: 'Tammy', text: 'Super' },
                ],
            };
        },
    };
    controller.suggestionEngine = {
        getDefaultSuggestions() {
            return ['Fallback'];
        },
    };
    controller.ui = {
        setAiLoading() {},
        render() {},
        buildPersonalityAddon() {
            return '';
        },
    };
    controller.extractProfileText = () =>
        'Tammy\nContador(a)\nUninove\nConectados hoje';
    controller.extractOtherPersonName = () => 'Tammy';
    controller.getCurrentContactContextForPrompt = () => '';

    const result = await controller.generateAIReplySuggestions();

    assert.deepEqual(Array.from(result), ['Resposta com contexto']);
    assert.equal(promptCalls.length, 1);
    assert.match(promptCalls[0].userPrompt, /Tammy/);
    assert.match(
        promptCalls[0].userPrompt,
        /Mensagem pendente da outra pessoa: "Super"/,
    );
    assert.match(
        promptCalls[0].userPrompt,
        /Minha última mensagem: "vizinha de zl"/,
    );
    assert.match(promptCalls[0].userPrompt, /ZL vila Formosa e vc \?/);
    assert.match(promptCalls[0].userPrompt, /belenzinho/);
    assert.match(promptCalls[0].systemPrompt, /Contador\(a\)/);
    assert.match(promptCalls[0].systemPrompt, /Uninove/);
});

test('one-click AI reply returns up to three AI suggestions as-is', async () => {
    const ChatSuggestionsController = loadChatController();
    const controller = new ChatSuggestionsController({
        messageReader: {
            config: {
                messageSelector: '[data-qa="chat-message"]',
            },
        },
        aiClient: {
            buildPrompts() {
                return {
                    systemPrompt: 'BASE SYSTEM',
                    userPrompt: 'BASE USER',
                };
            },
            async generateSuggestionsWithPrompts() {
                return [
                    'ZL raiz demais 😂 você costuma sair mais por aí mesmo?',
                    'A gente é praticamente vizinho, passa muito pela região do Belém?',
                    'Você é mais caseira na ZL ou gosta de rodar São Paulo inteira?',
                    'extra',
                ];
            },
        },
    });

    const context = {
        allMessages: [
            { direction: 'out', sender: 'Matheus', text: 'mora onde?' },
            {
                direction: 'in',
                sender: 'Tammy',
                text: 'ZL vila Formosa e vc ?',
            },
            { direction: 'out', sender: 'Matheus', text: 'belenzinho' },
            { direction: 'in', sender: 'Tammy', text: 'Perto' },
            { direction: 'out', sender: 'Matheus', text: 'vizinha de zl' },
            { direction: 'in', sender: 'Tammy', text: 'Super' },
        ],
        lastMessages: [
            { direction: 'out', sender: 'Matheus', text: 'mora onde?' },
            {
                direction: 'in',
                sender: 'Tammy',
                text: 'ZL vila Formosa e vc ?',
            },
            { direction: 'out', sender: 'Matheus', text: 'belenzinho' },
            { direction: 'in', sender: 'Tammy', text: 'Perto' },
            { direction: 'out', sender: 'Matheus', text: 'vizinha de zl' },
            { direction: 'in', sender: 'Tammy', text: 'Super' },
        ],
    };

    controller.chatContainer = {};
    controller.contextExtractor = {
        extract() {
            return context;
        },
    };
    controller.suggestionEngine = {
        generate() {
            return ['vizinha então 😏', 'pertinho demais'];
        },
        getDefaultSuggestions() {
            return ['Boa tarde! Como você está?'];
        },
    };
    controller.ui = {
        setAiLoading() {},
        render() {},
        buildPersonalityAddon() {
            return '';
        },
    };
    controller.extractProfileText = () => '';
    controller.extractOtherPersonName = () => 'Tammy';
    controller.getCurrentContactContextForPrompt = () => '';

    const result = await controller.generateAIReplySuggestions();

    assert.deepEqual(Array.from(result), [
        'ZL raiz demais 😂 você costuma sair mais por aí mesmo?',
        'A gente é praticamente vizinho, passa muito pela região do Belém?',
        'Você é mais caseira na ZL ou gosta de rodar São Paulo inteira?',
    ]);
});

test('one-click AI reply falls back only when AI returns nothing', async () => {
    const ChatSuggestionsController = loadChatController();
    const controller = new ChatSuggestionsController({
        messageReader: {
            config: {
                messageSelector: '[data-qa="chat-message"]',
            },
        },
        aiClient: {
            buildPrompts() {
                return {
                    systemPrompt: 'BASE SYSTEM',
                    userPrompt: 'BASE USER',
                };
            },
            async generateSuggestionsWithPrompts() {
                return [];
            },
        },
    });

    const context = {
        allMessages: [
            { direction: 'out', sender: 'Matheus', text: 'mora onde?' },
            {
                direction: 'in',
                sender: 'Tammy',
                text: 'ZL vila Formosa e vc ?',
            },
            { direction: 'out', sender: 'Matheus', text: 'belenzinho' },
            { direction: 'in', sender: 'Tammy', text: 'Perto' },
            { direction: 'out', sender: 'Matheus', text: 'vizinha de zl' },
            { direction: 'in', sender: 'Tammy', text: 'Super' },
        ],
        lastMessages: [
            { direction: 'out', sender: 'Matheus', text: 'mora onde?' },
            {
                direction: 'in',
                sender: 'Tammy',
                text: 'ZL vila Formosa e vc ?',
            },
            { direction: 'out', sender: 'Matheus', text: 'belenzinho' },
            { direction: 'in', sender: 'Tammy', text: 'Perto' },
            { direction: 'out', sender: 'Matheus', text: 'vizinha de zl' },
            { direction: 'in', sender: 'Tammy', text: 'Super' },
        ],
    };

    controller.chatContainer = {};
    controller.contextExtractor = {
        extract() {
            return context;
        },
    };
    controller.suggestionEngine = {
        generate() {
            return [
                'Que interessante!',
                'É perto daqui?',
                'O que você curte fazer por lá?',
            ];
        },
        getDefaultSuggestions() {
            return ['Fallback 1', 'Fallback 2', 'Fallback 3'];
        },
    };
    controller.ui = {
        setAiLoading() {},
        render() {},
        buildPersonalityAddon() {
            return '';
        },
    };
    controller.extractProfileText = () => '';
    controller.extractOtherPersonName = () => 'Tammy';
    controller.getCurrentContactContextForPrompt = () => '';

    const result = await controller.generateAIReplySuggestions();

    assert.deepEqual(Array.from(result), [
        'Fallback 1',
        'Fallback 2',
        'Fallback 3',
    ]);
});

test('extractProfileText sanitizes noisy Badoo mini-profile text', () => {
    const ChatSuggestionsController = loadChatController();
    const controller = new ChatSuggestionsController({
        messageReader: {
            config: {
                messageSelector: '[data-qa="chat-message"]',
            },
        },
    });

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

    const cleaned = controller.sanitizeProfileText(raw);

    assert.equal(cleaned.includes('Abrir perfil'), false);
    assert.equal(cleaned.includes('Educação'), false);
    assert.equal(cleaned.includes('Profissão: São Paulo'), false);
    assert.equal(cleaned.includes('Conectados hoje\nConectados hoje'), false);
    assert.match(cleaned, /Mell, 49 anos/);
    assert.match(cleaned, /São Paulo/);
});
