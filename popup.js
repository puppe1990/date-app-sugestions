const MODELS = [
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-235b-a22b:free',
  'tngtech/deepseek-r1t2-chimera:free',
  'kwaipilot/kat-coder-pro:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-coder:free',
  'moonshotai/kimi-k2:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
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

const DEFAULT_MODEL = MODELS[0];

document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('modelSelect');
  const saveBtn = document.getElementById('saveBtn');

  MODELS.forEach((model, index) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = `${index + 1}. ${model}`;
    if (index === 0) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  chrome.storage.local.get(['openRouterModel'], (result) => {
    const storedModel = result.openRouterModel;
    if (storedModel && MODELS.includes(storedModel)) {
      select.value = storedModel;
    } else {
      select.value = DEFAULT_MODEL;
    }
  });

  saveBtn.addEventListener('click', () => {
    const chosen = select.value || DEFAULT_MODEL;
    chrome.storage.local.set({ openRouterModel: chosen }, () => {
      saveBtn.textContent = 'Salvo!';
      setTimeout(() => (saveBtn.textContent = 'Salvar'), 1200);
    });
  });
});
