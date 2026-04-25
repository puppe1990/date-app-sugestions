const providerConfig = window.ChatSuggestions?.ProviderConfig || {};
const OPENROUTER_MODELS = providerConfig.OPENROUTER_MODELS || [];
const GEMINI_MODELS = providerConfig.GEMINI_MODELS || [];
const NVIDIA_MODELS = providerConfig.NVIDIA_MODELS || [];
const DEFAULT_PROVIDER = providerConfig.DEFAULT_PROVIDER || 'gemini';
const DEFAULT_GEMINI_MODEL =
    providerConfig.DEFAULT_GEMINI_MODEL || GEMINI_MODELS[0];
const DEFAULT_OPENROUTER_MODEL =
    providerConfig.DEFAULT_OPENROUTER_MODEL || OPENROUTER_MODELS[0];
const DEFAULT_NVIDIA_MODEL =
    providerConfig.DEFAULT_NVIDIA_MODEL || NVIDIA_MODELS[0];

document.addEventListener('DOMContentLoaded', async () => {
    const select = document.getElementById('modelSelect');
    const saveBtn = document.getElementById('saveBtn');
    const profileInput = document.getElementById('profileInput');
    const providerSelect = document.getElementById('providerSelect');
    const geminiSection = document.getElementById('geminiSection');
    const openrouterSection = document.getElementById('openrouterSection');
    const nvidiaSection = document.getElementById('nvidiaSection');
    const geminiModelSelect = document.getElementById('geminiModelSelect');
    const nvidiaModelSelect = document.getElementById('nvidiaModelSelect');
    const uiPlacementSelect = document.getElementById('uiPlacementSelect');
    const responseLengthSelect = document.getElementById(
        'responseLengthSelect',
    );
    const conversationModeSelect = document.getElementById(
        'conversationModeSelect',
    );
    const businessModeFields = document.getElementById('businessModeFields');
    const businessContextInput = document.getElementById(
        'businessContextInput',
    );
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

    NVIDIA_MODELS.forEach((model, index) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = `${index + 1}. ${model}`;
        nvidiaModelSelect.appendChild(option);
    });

    chrome.storage.local.get(
        [
            'openRouterModel',
            'openRouterProfile',
            'openRouterProfileCasual',
            'openRouterProfileBusiness',
            'llmProvider',
            'geminiModel',
            'nvidiaModel',
            'uiPlacementOverride',
            'aiResponseLength',
            'businessModeEnabled',
            'businessModeByHost',
            'businessContext',
            'businessTone',
        ],
        (result) => {
            const storedModel = result.openRouterModel;
            const storedProfileLegacy = result.openRouterProfile;
            const storedProfileCasual =
                result.openRouterProfileCasual || storedProfileLegacy || '';
            const storedProfileBusiness =
                result.openRouterProfileBusiness || '';
            const storedProvider = result.llmProvider || DEFAULT_PROVIDER;
            const storedGeminiModel = result.geminiModel;
            const storedNvidiaModel = result.nvidiaModel;
            const storedUiPlacementOverride =
                result.uiPlacementOverride || 'floating';
            const storedAiResponseLength = result.aiResponseLength || 'short';
            const storedBusinessModeEnabled = Boolean(
                result.businessModeEnabled,
            );
            const storedBusinessModeByHost = result.businessModeByHost || {};
            const hostMode = activeTabHost
                ? storedBusinessModeByHost[activeTabHost]
                : undefined;
            const storedBusinessContext = result.businessContext;
            const storedBusinessTone = result.businessTone || 'consultivo';
            profileByMode.casual = storedProfileCasual;
            profileByMode.business = storedProfileBusiness;
            if (typeof hostMode === 'boolean') {
                currentConversationMode = hostMode ? 'business' : 'casual';
            } else {
                currentConversationMode = storedBusinessModeEnabled
                    ? 'business'
                    : 'casual';
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
            if (
                storedGeminiModel &&
                GEMINI_MODELS.includes(storedGeminiModel)
            ) {
                geminiModelSelect.value = storedGeminiModel;
            } else {
                geminiModelSelect.value = DEFAULT_GEMINI_MODEL;
            }
            if (
                storedNvidiaModel &&
                NVIDIA_MODELS.includes(storedNvidiaModel)
            ) {
                nvidiaModelSelect.value = storedNvidiaModel;
            } else {
                nvidiaModelSelect.value = DEFAULT_NVIDIA_MODEL;
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
        },
    );

    saveBtn.addEventListener('click', () => {
        const provider = providerSelect.value || DEFAULT_PROVIDER;
        const chosen = select.value || DEFAULT_OPENROUTER_MODEL;
        const geminiModel = geminiModelSelect.value || DEFAULT_GEMINI_MODEL;
        const nvidiaModel = nvidiaModelSelect.value || DEFAULT_NVIDIA_MODEL;
        profileByMode[currentConversationMode] = profileInput.value.trim();
        const profileCasual = profileByMode.casual || '';
        const profileBusiness = profileByMode.business || '';
        const uiPlacementOverride = uiPlacementSelect
            ? uiPlacementSelect.value || 'floating'
            : 'floating';
        const aiResponseLength = responseLengthSelect
            ? responseLengthSelect.value || 'short'
            : 'short';
        const conversationMode = conversationModeSelect
            ? conversationModeSelect.value || 'casual'
            : 'casual';
        const businessModeEnabled = conversationMode === 'business';
        const businessContext = businessContextInput
            ? businessContextInput.value.trim()
            : '';
        const businessTone = businessToneSelect
            ? businessToneSelect.value || 'consultivo'
            : 'consultivo';
        const payload = {
            llmProvider: provider,
            openRouterModel: chosen,
            openRouterProfile: profileCasual,
            openRouterProfileCasual: profileCasual,
            openRouterProfileBusiness: profileBusiness,
            geminiModel,
            nvidiaModel,
            uiPlacementOverride,
            aiResponseLength,
            businessModeEnabled,
            businessContext,
            businessTone,
        };
        if (activeTabHost) {
            chrome.storage.local.get(['businessModeByHost'], (result) => {
                const byHost = { ...(result.businessModeByHost || {}) };
                byHost[activeTabHost] = businessModeEnabled;
                chrome.storage.local.set(
                    {
                        ...payload,
                        businessModeByHost: byHost,
                    },
                    () => {
                        saveBtn.textContent = 'Salvo!';
                        setTimeout(
                            () => (saveBtn.textContent = 'Salvar'),
                            1200,
                        );
                        notifyActiveTabModeChange({
                            businessModeEnabled,
                            businessContext,
                            businessTone,
                            profileCasual,
                            profileBusiness,
                        });
                    },
                );
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
                    profileBusiness,
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
        geminiSection.classList.toggle('hidden', provider !== 'gemini');
        openrouterSection.classList.toggle('hidden', provider !== 'openrouter');
        nvidiaSection.classList.toggle('hidden', provider !== 'nvidia');
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
                chrome.tabs.sendMessage(
                    tabId,
                    { type: 'bcs:modeUpdated', payload },
                    () => {
                        if (chrome.runtime?.lastError) {
                            // Nenhum content script ativo na aba.
                        }
                    },
                );
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
