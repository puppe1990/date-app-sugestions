(() => {
    const OPENROUTER_MODELS = [
        'google/gemini-2.0-flash-exp:free',
        'openai/gpt-oss-120b:free',
        'qwen/qwen3-235b-a22b:free',
        'tngtech/deepseek-r1t2-chimera:free',
        'kwaipilot/kat-coder-pro:free',
        'nousresearch/hermes-3-llama-3.1-405b:free',
        'z-ai/glm-4.5-air:free',
        'qwen/qwen3-coder:free',
        'moonshotai/kimi-k2:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'amazon/nova-2-lite-v1:free',
        'allenai/olmo-3-32b-think:free',
        'tngtech/deepseek-r1t-chimera:free',
        'tngtech/tng-r1t-chimera:free',
        'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'google/gemma-3-27b-it:free',
        'google/gemma-3-12b-it:free',
        'zgoogle/gemma-3-4b-it:free',
        'google/gemma-3n-e4b-it:free',
        'google/gemma-3n-e2b-it:free',
        'qwen/qwen3-4b:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'meituan/longcat-flash-chat:free',
        'arcee-ai/trinity-mini:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'nvidia/nemotron-nano-9b-v2:free',
    ];

    const GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
    ];

    const NVIDIA_MODELS = [
        'minimaxai/minimax-m2.7',
        'meta/llama-4-maverick-17b-128e-instruct',
        'google/gemma-3n-e4b-it',
        'google/gemma-3n-e2b-it',
        'z-ai/glm-4.7',
    ];

    const DEFAULT_PROVIDER = 'nvidia';
    const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0];
    const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS[0];
    const DEFAULT_NVIDIA_MODEL = NVIDIA_MODELS[0];

    const getDefaultModelForProvider = (provider) => {
        if (provider === 'nvidia') return DEFAULT_NVIDIA_MODEL;
        if (provider === 'openrouter') return DEFAULT_OPENROUTER_MODEL;
        return DEFAULT_GEMINI_MODEL;
    };

    const getModelListForProvider = (provider) => {
        if (provider === 'nvidia') return NVIDIA_MODELS.slice();
        if (provider === 'openrouter') return OPENROUTER_MODELS.slice();
        return GEMINI_MODELS.slice();
    };

    const parseEnvKeys = (text) => {
        const raw = String(text || '');
        const read = (name) => {
            const match = raw.match(new RegExp(`${name}\\s*=\\s*(.+)`, 'i'));
            return match ? match[1].trim() : null;
        };
        return {
            openrouterKey: read('OPENROUTER_API_KEY'),
            geminiKey: read('GEMINI_API_KEY'),
            nvidiaKey: read('NVIDIA_API_KEY'),
        };
    };

    const getApiKeyForProvider = (provider, envKeys = {}) => {
        if (provider === 'nvidia') return envKeys.nvidiaKey || null;
        if (provider === 'openrouter') return envKeys.openrouterKey || null;
        return envKeys.geminiKey || null;
    };

    const providerConfig = {
        OPENROUTER_MODELS,
        GEMINI_MODELS,
        NVIDIA_MODELS,
        DEFAULT_PROVIDER,
        DEFAULT_GEMINI_MODEL,
        DEFAULT_OPENROUTER_MODEL,
        DEFAULT_NVIDIA_MODEL,
        getDefaultModelForProvider,
        getModelListForProvider,
        parseEnvKeys,
        getApiKeyForProvider,
    };

    if (typeof window !== 'undefined') {
        window.ChatSuggestions = window.ChatSuggestions || {};
        window.ChatSuggestions.ProviderConfig = providerConfig;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = providerConfig;
    }
})();
