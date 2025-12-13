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
  'nvidia/nemotron-nano-9b-v2:free'
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash'
];

const DEFAULT_PROVIDER = 'gemini';
const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0];
const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS[0];

document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('modelSelect');
  const saveBtn = document.getElementById('saveBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const profileInput = document.getElementById('profileInput');
  const providerSelect = document.getElementById('providerSelect');
  const geminiSection = document.getElementById('geminiSection');
  const openrouterSection = document.getElementById('openrouterSection');
  const geminiModelSelect = document.getElementById('geminiModelSelect');
  const geminiKeyInput = document.getElementById('geminiKeyInput');

  OPENROUTER_MODELS.forEach((model, index) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = `${index + 1}. ${model}`;
    select.appendChild(option);
  });

  GEMINI_MODELS.forEach((model, index) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = `${index + 1}. ${model}`;
    geminiModelSelect.appendChild(option);
  });

  chrome.storage.local.get(['openRouterModel', 'openRouterApiKey', 'openRouterProfile', 'llmProvider', 'geminiApiKey', 'geminiModel'], (result) => {
    const storedModel = result.openRouterModel;
    const storedKey = result.openRouterApiKey;
    const storedProfile = result.openRouterProfile;
    const storedProvider = result.llmProvider || DEFAULT_PROVIDER;
    const storedGeminiKey = result.geminiApiKey;
    const storedGeminiModel = result.geminiModel;

    providerSelect.value = storedProvider;

    if (storedModel && OPENROUTER_MODELS.includes(storedModel)) {
      select.value = storedModel;
    } else {
      select.value = DEFAULT_OPENROUTER_MODEL;
    }
    if (storedKey) {
      apiKeyInput.value = storedKey;
    }
    if (storedGeminiKey) {
      geminiKeyInput.value = storedGeminiKey;
    }
    if (storedGeminiModel && GEMINI_MODELS.includes(storedGeminiModel)) {
      geminiModelSelect.value = storedGeminiModel;
    } else {
      geminiModelSelect.value = DEFAULT_GEMINI_MODEL;
    }
    if (storedProfile) {
      profileInput.value = storedProfile;
    }

    toggleSections(storedProvider);
  });

  saveBtn.addEventListener('click', () => {
    const provider = providerSelect.value || DEFAULT_PROVIDER;
    const chosen = select.value || DEFAULT_OPENROUTER_MODEL;
    const apiKey = apiKeyInput.value.trim();
    const geminiApiKey = geminiKeyInput.value.trim();
    const geminiModel = geminiModelSelect.value || DEFAULT_GEMINI_MODEL;
    const profile = profileInput.value.trim();
    chrome.storage.local.set({
      llmProvider: provider,
      openRouterModel: chosen,
      openRouterApiKey: apiKey,
      openRouterProfile: profile,
      geminiApiKey,
      geminiModel
    }, () => {
      saveBtn.textContent = 'Salvo!';
      setTimeout(() => (saveBtn.textContent = 'Salvar'), 1200);
    });
  });

  providerSelect.addEventListener('change', (e) => {
    toggleSections(e.target.value);
  });

  function toggleSections(provider) {
    if (provider === 'gemini') {
      geminiSection.classList.remove('hidden');
      openrouterSection.classList.add('hidden');
    } else {
      geminiSection.classList.add('hidden');
      openrouterSection.classList.remove('hidden');
    }
  }
});
