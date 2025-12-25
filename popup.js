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
  const uiPlacementSelect = document.getElementById('uiPlacementSelect');
  const responseLengthSelect = document.getElementById('responseLengthSelect');
  const conversationModeSelect = document.getElementById('conversationModeSelect');
  const businessModeFields = document.getElementById('businessModeFields');
  const businessContextInput = document.getElementById('businessContextInput');
  const businessToneSelect = document.getElementById('businessToneSelect');
  const activeTabHost = await getActiveTabHost();
  let currentConversationMode = 'casual';
  const profileByMode = { casual: '', business: '' };

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

  chrome.storage.local.get([
    'openRouterModel',
    'openRouterApiKey',
    'openRouterProfile',
    'openRouterProfileCasual',
    'openRouterProfileBusiness',
    'llmProvider',
    'geminiApiKey',
    'geminiModel',
    'uiPlacementOverride',
    'aiResponseLength',
    'businessModeEnabled',
    'businessModeByHost',
    'businessContext',
    'businessTone'
  ], (result) => {
    const storedModel = result.openRouterModel;
    const storedKey = result.openRouterApiKey;
    const storedProfileLegacy = result.openRouterProfile;
    const storedProfileCasual = result.openRouterProfileCasual || storedProfileLegacy || '';
    const storedProfileBusiness = result.openRouterProfileBusiness || '';
    const storedProvider = result.llmProvider || DEFAULT_PROVIDER;
    const storedGeminiKey = result.geminiApiKey;
    const storedGeminiModel = result.geminiModel;
    const storedUiPlacementOverride = result.uiPlacementOverride || 'floating';
    const storedAiResponseLength = result.aiResponseLength || 'short';
    const storedBusinessModeEnabled = Boolean(result.businessModeEnabled);
    const storedBusinessModeByHost = result.businessModeByHost || {};
    const hostMode = activeTabHost ? storedBusinessModeByHost[activeTabHost] : undefined;
    const storedBusinessContext = result.businessContext;
    const storedBusinessTone = result.businessTone || 'consultivo';
    profileByMode.casual = storedProfileCasual;
    profileByMode.business = storedProfileBusiness;
    if (typeof hostMode === 'boolean') {
      currentConversationMode = hostMode ? 'business' : 'casual';
    } else {
      currentConversationMode = storedBusinessModeEnabled ? 'business' : 'casual';
    }

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
    profileInput.value = profileByMode[currentConversationMode] || '';

    if (uiPlacementSelect) {
      uiPlacementSelect.value = storedUiPlacementOverride;
    }

    if (responseLengthSelect) {
      responseLengthSelect.value = storedAiResponseLength;
    }

    if (conversationModeSelect) {
      conversationModeSelect.value = currentConversationMode;
    }

    if (businessContextInput && storedBusinessContext) {
      businessContextInput.value = storedBusinessContext;
    }

    if (businessToneSelect) {
      businessToneSelect.value = storedBusinessTone;
    }

    toggleSections(storedProvider);
    toggleBusinessFields(currentConversationMode);
    applyPopupModeTheme(currentConversationMode);
  });

  saveBtn.addEventListener('click', () => {
    const provider = providerSelect.value || DEFAULT_PROVIDER;
    const chosen = select.value || DEFAULT_OPENROUTER_MODEL;
    const apiKey = apiKeyInput.value.trim();
    const geminiApiKey = geminiKeyInput.value.trim();
    const geminiModel = geminiModelSelect.value || DEFAULT_GEMINI_MODEL;
    profileByMode[currentConversationMode] = profileInput.value.trim();
    const profileCasual = profileByMode.casual || '';
    const profileBusiness = profileByMode.business || '';
    const uiPlacementOverride = uiPlacementSelect ? (uiPlacementSelect.value || 'floating') : 'floating';
    const aiResponseLength = responseLengthSelect ? (responseLengthSelect.value || 'short') : 'short';
    const conversationMode = conversationModeSelect ? (conversationModeSelect.value || 'casual') : 'casual';
    const businessModeEnabled = conversationMode === 'business';
    const businessContext = businessContextInput ? businessContextInput.value.trim() : '';
    const businessTone = businessToneSelect ? (businessToneSelect.value || 'consultivo') : 'consultivo';
    const payload = {
      llmProvider: provider,
      openRouterModel: chosen,
      openRouterApiKey: apiKey,
      openRouterProfile: profileCasual,
      openRouterProfileCasual: profileCasual,
      openRouterProfileBusiness: profileBusiness,
      geminiApiKey,
      geminiModel,
      uiPlacementOverride,
      aiResponseLength,
      businessModeEnabled,
      businessContext,
      businessTone
    };
    if (activeTabHost) {
      chrome.storage.local.get(['businessModeByHost'], (result) => {
        const byHost = { ...(result.businessModeByHost || {}) };
        byHost[activeTabHost] = businessModeEnabled;
        chrome.storage.local.set({
          ...payload,
          businessModeByHost: byHost
        }, () => {
          saveBtn.textContent = 'Salvo!';
          setTimeout(() => (saveBtn.textContent = 'Salvar'), 1200);
          notifyActiveTabModeChange({
            businessModeEnabled,
            businessContext,
            businessTone,
            profileCasual,
            profileBusiness
          });
        });
      });
    } else {
      chrome.storage.local.set(payload, () => {
        saveBtn.textContent = 'Salvo!';
        setTimeout(() => (saveBtn.textContent = 'Salvar'), 1200);
        notifyActiveTabModeChange({
          businessModeEnabled,
          businessContext,
          businessTone,
          profileCasual,
          profileBusiness
        });
      });
    }
  });

  providerSelect.addEventListener('change', (e) => {
    toggleSections(e.target.value);
  });

  if (conversationModeSelect) {
    conversationModeSelect.addEventListener('change', (e) => {
      profileByMode[currentConversationMode] = profileInput.value.trim();
      currentConversationMode = e.target.value || 'casual';
      profileInput.value = profileByMode[currentConversationMode] || '';
      toggleBusinessFields(currentConversationMode);
      applyPopupModeTheme(currentConversationMode);
    });
  }

  if (profileInput) {
    profileInput.addEventListener('input', (e) => {
      profileByMode[currentConversationMode] = e.target.value;
    });
  }

  function toggleSections(provider) {
    if (provider === 'gemini') {
      geminiSection.classList.remove('hidden');
      openrouterSection.classList.add('hidden');
    } else {
      geminiSection.classList.add('hidden');
      openrouterSection.classList.remove('hidden');
    }
  }

  function toggleBusinessFields(mode) {
    if (!businessModeFields) return;
    businessModeFields.classList.toggle('hidden', mode !== 'business');
  }

  function applyPopupModeTheme(mode) {
    const root = document.documentElement;
    if (!root) return;
    const isBusiness = mode === 'business';
    root.classList.toggle('bcs-mode-business', isBusiness);
    root.classList.toggle('bcs-mode-casual', !isBusiness);
  }

  function notifyActiveTabModeChange(payload) {
    if (!chrome?.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs && tabs[0] ? tabs[0].id : null;
      if (!tabId) return;
      try {
        chrome.tabs.sendMessage(tabId, { type: 'bcs:modeUpdated', payload }, () => {
          if (chrome.runtime?.lastError) {
            // Nenhum content script ativo na aba.
          }
        });
      } catch (e) {
        // Ignora falhas de envio
      }
    });
  }

  function getActiveTabHost() {
    if (!chrome?.tabs?.query) return Promise.resolve('');
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs && tabs[0] ? tabs[0].url : '';
        if (!url) {
          resolve('');
          return;
        }
        try {
          const host = new URL(url).hostname.toLowerCase();
          resolve(host);
        } catch (e) {
          resolve('');
        }
      });
    });
  }
});
