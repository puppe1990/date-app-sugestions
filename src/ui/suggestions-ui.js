(() => {
    class SuggestionsUI {
        constructor({ inputSelector, placement = 'inline', onAiGenerate, onAiCopyPrompt, responseLength = 'short', onResponseLengthChange } = {}) {
            this.inputSelector = inputSelector || '#chat-composer-input-message';
            this.placement = placement || 'inline';
            this.container = null;
            this.domObserver = null;
            this.onAiGenerate = onAiGenerate;
            this.onAiCopyPrompt = onAiCopyPrompt;
            this.aiLoading = false;
            this.aiButton = null;
            this.aiSuggestions = [];
            this.normalSuggestions = [];
            this.suggestionsCollapsed = true;
            this.selectedPersonality = 'default';
            this.selectedResponseLength = responseLength || 'short';
            this.onResponseLengthChange = onResponseLengthChange;
            this.fixedPlacementEnabled = false;
            this.boundRecalcPlacement = null;
            this.dragEnabled = false;
            this.dragging = false;
            this.dragPointerId = null;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.manualPosition = null; // { left, top, width }
            this.libraryButton = null;
            this.libraryOverlay = null;
            this.libraryDialog = null;
            this.librarySearchInput = null;
            this.boundLibraryKeydown = null;
            this.aiPromptOverlay = null;
            this.aiPromptDialog = null;
            this.aiPromptSystemTextarea = null;
            this.aiPromptUserTextarea = null;
            this.aiPromptSendButton = null;
            this.aiPromptCancelButton = null;
            this.boundAiPromptKeydown = null;
            this.aiPromptOnSend = null;
            this.aiPromptPersonalitySelect = null;
            this.aiPromptBaseSystemPrompt = '';
            this.aiPromptBaseUserPrompt = '';
            this.aiPromptDirty = false;
            this.floatingOpen = false;
            this.floatingLauncher = null;
            this.boundFloatingKeydown = null;
            this.boundFloatingDocPointerDown = null;
            this.toastRoot = null;
            this.toastTimeouts = [];
        }

        getContainer() {
            if (this.container) {
                return this.container;
            }

            const existing = document.getElementById('chat-suggestions-container') ||
                            document.getElementById('badoo-chat-suggestions-container');
            if (existing) {
                this.container = existing;
                return existing;
            }

            const container = document.createElement('div');
            container.className = 'chat-suggestions-container';
            container.id = 'chat-suggestions-container';
            container.setAttribute('data-bcs-legacy-id', 'badoo-chat-suggestions-container');
            container.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: nowrap;
                padding: 10px 12px;
                overflow-x: auto;
                scrollbar-width: thin;
                z-index: 1000;
                position: relative;
                width: 100%;
                box-sizing: border-box;
                border-radius: 14px;
                border: 1px solid rgba(127, 127, 127, 0.25);
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
                font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                font-size: 13px;
                line-height: 1;
            `;

            const styleId = 'chat-suggestions-styles';
            const legacyStyleId = 'badoo-chat-suggestions-styles';
            if (!document.getElementById(styleId) && !document.getElementById(legacyStyleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    :root {
                        --bcs-control-height: 34px;
                        --bcs-surface: rgba(255, 255, 255, 0.92);
                        --bcs-surface-border: rgba(127, 127, 127, 0.25);
                        --bcs-text: #111;
                        --bcs-muted: rgba(17, 17, 17, 0.65);
                        --bcs-chip-bg: rgba(17, 17, 17, 0.06);
                        --bcs-chip-border: rgba(17, 17, 17, 0.14);
                        --bcs-chip-hover: rgba(17, 17, 17, 0.10);
                        --bcs-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
                    }

                    .chat-suggestions-container {
                        background: var(--bcs-surface) !important;
                        border-color: var(--bcs-surface-border) !important;
                        color: var(--bcs-text) !important;
                        box-shadow: var(--bcs-shadow) !important;
                        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important;
                        font-size: 13px !important;
                        line-height: 1 !important;
                    }

                    .chat-suggestions-container.bcs-theme-dark {
                        --bcs-surface: rgba(18, 18, 18, 0.78);
                        --bcs-surface-border: rgba(255, 255, 255, 0.14);
                        --bcs-text: rgba(255, 255, 255, 0.94);
                        --bcs-muted: rgba(255, 255, 255, 0.65);
                        --bcs-chip-bg: rgba(255, 255, 255, 0.06);
                        --bcs-chip-border: rgba(255, 255, 255, 0.14);
                        --bcs-chip-hover: rgba(255, 255, 255, 0.10);
                        --bcs-shadow: 0 18px 46px rgba(0, 0, 0, 0.40);
                    }

                    .chat-suggestions-container.bcs-theme-light {
                        --bcs-surface: rgba(255, 255, 255, 0.92);
                        --bcs-surface-border: rgba(127, 127, 127, 0.25);
                        --bcs-text: #111;
                        --bcs-muted: rgba(17, 17, 17, 0.65);
                        --bcs-chip-bg: rgba(17, 17, 17, 0.06);
                        --bcs-chip-border: rgba(17, 17, 17, 0.14);
                        --bcs-chip-hover: rgba(17, 17, 17, 0.10);
                        --bcs-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
                    }

                    .chat-suggestion-button,
                    .chat-suggestions-personality-select,
                    .chat-suggestions-response-length-select {
                        height: var(--bcs-control-height);
                        line-height: var(--bcs-control-height);
                        border-radius: 999px;
                        border: 1px solid var(--bcs-chip-border);
                        background: var(--bcs-chip-bg);
                        color: var(--bcs-text);
                        font-size: 13px;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: background 0.15s ease, border-color 0.15s ease, transform 0.06s ease;
                        flex: 0 0 auto;
                    }

                    .chat-suggestion-button {
                        padding: 0 12px;
                    }

                    .chat-suggestion-button:hover,
                    .chat-suggestions-personality-select:hover,
                    .chat-suggestions-response-length-select:hover {
                        background: var(--bcs-chip-hover);
                        border-color: rgba(127, 127, 127, 0.35);
                    }

                    .chat-suggestion-button:active {
                        transform: translateY(1px);
                    }

                    .chat-suggestion-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .chat-suggestion-button--active {
                        background: rgba(255, 68, 88, 0.14);
                        border-color: rgba(255, 68, 88, 0.35);
                    }

                    .chat-suggestion-button--ai {
                        border-color: rgba(127, 127, 127, 0.35);
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.15), rgba(125, 54, 255, 0.12));
                    }

                    .chat-suggestion-button--ai:hover {
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.22), rgba(125, 54, 255, 0.18));
                    }

                    .chat-suggestion-button--ai-suggestion {
                        border-color: rgba(255, 68, 88, 0.35);
                        background: rgba(255, 68, 88, 0.12);
                    }

                    .chat-suggestion-button--ai-suggestion:hover {
                        background: rgba(255, 68, 88, 0.18);
                    }

                    .chat-suggestions-container.bcs-floating-panel {
                        position: fixed !important;
                        z-index: 2147483647 !important;
                        right: 72px !important;
                        top: 50% !important;
                        transform: translateY(-50%) !important;
                        width: 340px !important;
                        max-width: calc(100vw - 110px) !important;
                        max-height: 70vh !important;
                        overflow: auto !important;
                        flex-wrap: wrap !important;
                        overscroll-behavior: contain !important;
                        padding-right: 52px !important;
                    }

                    .chat-suggestions-container.bcs-floating-panel .bcs-floating-close {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: var(--bcs-control-height);
                        height: var(--bcs-control-height);
                        padding: 0;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        line-height: 1;
                    }

                    .bcs-floating-launcher {
                        position: fixed;
                        z-index: 2147483647;
                        right: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 48px;
                        height: 48px;
                        border-radius: 999px;
                        border: 1px solid rgba(255, 255, 255, 0.30);
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.98), rgba(125, 54, 255, 0.98));
                        box-shadow: 0 16px 46px rgba(0, 0, 0, 0.25), 0 0 0 6px rgba(255, 68, 88, 0.12);
                        color: #fff;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        user-select: none;
                        -webkit-user-select: none;
                        font-size: 18px;
                        line-height: 1;
                    }

                    .bcs-floating-launcher:hover {
                        box-shadow: 0 18px 54px rgba(0, 0, 0, 0.28), 0 0 0 7px rgba(125, 54, 255, 0.14);
                    }

                    .bcs-floating-launcher.bcs-theme-dark {
                        border-color: rgba(255, 255, 255, 0.28);
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.92), rgba(125, 54, 255, 0.92));
                        color: rgba(255, 255, 255, 0.96);
                        box-shadow: 0 20px 62px rgba(0, 0, 0, 0.55), 0 0 0 6px rgba(255, 68, 88, 0.12);
                    }

                    .bcs-floating-launcher.bcs-theme-dark:hover {
                        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.62), 0 0 0 7px rgba(125, 54, 255, 0.14);
                    }

                    .bcs-floating-launcher.bcs-floating-launcher--active {
                        border-color: rgba(255, 255, 255, 0.55);
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.30), 0 0 0 8px rgba(255, 68, 88, 0.18);
                    }

                    .bcs-toast-root {
                        position: fixed;
                        right: 14px;
                        bottom: 14px;
                        z-index: 2147483647;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        pointer-events: none;
                        align-items: flex-end;
                    }

                    .bcs-toast {
                        pointer-events: none;
                        min-width: 180px;
                        max-width: 320px;
                        padding: 10px 12px;
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.28);
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.98), rgba(125, 54, 255, 0.98));
                        box-shadow: 0 16px 46px rgba(0, 0, 0, 0.25);
                        color: #fff;
                        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                        font-size: 13px;
                        line-height: 1.25;
                        opacity: 0;
                        transform: translateY(8px);
                        animation: bcsToastIn 180ms ease forwards;
                    }

                    .bcs-toast--error {
                        background: linear-gradient(135deg, rgba(255, 68, 88, 0.98), rgba(255, 124, 44, 0.98));
                    }

                    .bcs-toast--hide {
                        animation: bcsToastOut 220ms ease forwards;
                    }

                    @keyframes bcsToastIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes bcsToastOut {
                        from { opacity: 1; transform: translateY(0); }
                        to { opacity: 0; transform: translateY(10px); }
                    }

                    .chat-suggestions-personality-select {
                        padding: 0 28px 0 12px;
                        width: 132px;
                        max-width: 148px;
                        appearance: none;
                        -webkit-appearance: none;
                        background-image:
                            linear-gradient(45deg, transparent 50%, var(--bcs-muted) 50%),
                            linear-gradient(135deg, var(--bcs-muted) 50%, transparent 50%);
                        background-position:
                            calc(100% - 14px) 16px,
                            calc(100% - 9px) 16px;
                        background-size: 5px 5px, 5px 5px;
                        background-repeat: no-repeat;
                    }

                    .chat-suggestions-response-length-select {
                        padding: 0 28px 0 12px;
                        width: 110px;
                        max-width: 120px;
                        appearance: none;
                        -webkit-appearance: none;
                        background-image:
                            linear-gradient(45deg, transparent 50%, var(--bcs-muted) 50%),
                            linear-gradient(135deg, var(--bcs-muted) 50%, transparent 50%);
                        background-position:
                            calc(100% - 14px) 16px,
                            calc(100% - 9px) 16px;
                        background-size: 5px 5px, 5px 5px;
                        background-repeat: no-repeat;
                    }

                    .chat-suggestion-button--drag {
                        border-color: rgba(127, 127, 127, 0.45);
                    }

                    .chat-suggestion-button--drag-handle {
                        width: var(--bcs-control-height);
                        min-width: var(--bcs-control-height);
                        padding: 0;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        letter-spacing: -1px;
                    }

                    .chat-suggestions-container.bcs-drag-enabled {
                        cursor: grab;
                        user-select: none;
                    }

                    .chat-suggestions-container.bcs-dragging {
                        cursor: grabbing;
                    }

                    .chat-suggestions-container::-webkit-scrollbar {
                        height: 6px;
                    }
                    .chat-suggestions-container::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .chat-suggestions-container::-webkit-scrollbar-thumb {
                        background: rgba(127, 127, 127, 0.35);
                        border-radius: 6px;
                    }

                    .bcs-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.55);
                        z-index: 2147483647;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 16px;
                        box-sizing: border-box;
                    }

                    .bcs-modal {
                        width: min(720px, 100%);
                        max-height: 80vh;
                        overflow: hidden;
                        background: #111;
                        color: #fff;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 12px;
                        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
                        display: flex;
                        flex-direction: column;
                    }

                    .bcs-modal__header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 14px 16px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                        gap: 12px;
                    }

                    .bcs-modal__title {
                        font-size: 14px;
                        font-weight: 700;
                        color: #fff;
                        margin: 0;
                    }

                    .bcs-modal__close {
                        background: transparent;
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        color: #fff;
                        border-radius: 10px;
                        padding: 8px 10px;
                        cursor: pointer;
                    }

                    .bcs-modal__body {
                        padding: 12px 16px 16px;
                        overflow: auto;
                    }

                    .bcs-modal__search {
                        width: 100%;
                        box-sizing: border-box;
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        background: rgba(255, 255, 255, 0.06);
                        color: #fff;
                        border-radius: 10px;
                        padding: 10px 12px;
                        outline: none;
                        margin-bottom: 12px;
                        font-size: 14px;
                    }

                    .bcs-modal__section-title {
                        font-size: 12px;
                        font-weight: 700;
                        color: rgba(255, 255, 255, 0.72);
                        margin: 14px 0 8px;
                        letter-spacing: 0.02em;
                        text-transform: uppercase;
                    }

                    .bcs-modal__grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 10px;
                    }

                    @media (max-width: 560px) {
                        .bcs-modal__grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    .bcs-modal__item {
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        color: #fff;
                        border-radius: 12px;
                        padding: 10px 12px;
                        text-align: left;
                        cursor: pointer;
                        font-size: 14px;
                        line-height: 1.25;
                    }

                    .bcs-modal__item:hover {
                        background: rgba(255, 255, 255, 0.10);
                    }

                    .bcs-modal__textarea {
                        width: 100%;
                        box-sizing: border-box;
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        background: rgba(255, 255, 255, 0.06);
                        color: #fff;
                        border-radius: 10px;
                        padding: 10px 12px;
                        outline: none;
                        font-size: 13px;
                        line-height: 1.25;
                        min-height: 110px;
                        resize: vertical;
                    }

                    .bcs-modal__row {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                        align-items: center;
                        justify-content: flex-end;
                        margin-top: 12px;
                    }

                    .bcs-modal__btn {
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        color: #fff;
                        border-radius: 10px;
                        padding: 10px 12px;
                        cursor: pointer;
                        font-size: 13px;
                    }

                    .bcs-modal__btn--primary {
                        background: #ff4458;
                        border-color: #ff4458;
                        color: #fff;
                    }

                    .bcs-modal__btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .bcs-modal__select {
                        width: 100%;
                        box-sizing: border-box;
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        background: rgba(255, 255, 255, 0.06);
                        color: #fff;
                        border-radius: 10px;
                        padding: 10px 12px;
                        outline: none;
                        font-size: 13px;
                        margin-bottom: 12px;
                    }
                `;
                document.head.appendChild(style);
            }

            this.container = container;
            return container;
        }

        mount() {
            const container = this.getContainer();
            const inserted = this.tryInsert(container);
            if (!this.domObserver) {
                this.attachDomObserver();
            }
            if (this.placement === 'floating') {
                this.applyFloatingPlacement();
                this.ensureFloatingLauncher();
                this.updateFloatingVisibility();
            } else {
                container.style.display = 'flex';
            }
            this.applyTheme(container);
            this.loadManualPosition();
            this.applyManualPositionIfAny();
            this.ensureGoodPlacement();
            console.info('[Chat Suggestions] UI montada', { inserted, inputSelector: this.inputSelector });
            return inserted;
        }

        tryInsert(container) {
            if (this.placement === 'overlay' || this.placement === 'floating') {
                if (container.parentElement !== document.body) {
                    if (container.parentElement) {
                        container.parentElement.removeChild(container);
                    }
                    document.body.appendChild(container);
                }
                return true;
            }

            const inputElement = document.querySelector(this.inputSelector);

            if (inputElement) {
                const inputWrapper = inputElement.closest('.csms-chat-controls-base-input-message') ||
                                    inputElement.closest('.csms-chat-composer-input-wrapper__content') ||
                                    inputElement.closest('[class*="input-wrapper"]') ||
                                    inputElement.closest('[class*="composer-input"]') ||
                                    inputElement.parentElement;

                if (inputWrapper && inputWrapper.parentElement) {
                    if (container.parentElement) {
                        container.parentElement.removeChild(container);
                    }
                    inputWrapper.parentElement.insertBefore(container, inputWrapper);
                    console.info('[Chat Suggestions] Sugestões inseridas antes do wrapper do input');
                    return true;
                }

                if (inputElement.parentElement) {
                    const parent = inputElement.parentElement;
                    if (!parent.classList.contains('csms-chat-controls-base-input-message')) {
                        if (container.parentElement) {
                            container.parentElement.removeChild(container);
                        }
                        parent.insertBefore(container, inputElement);
                        console.info('[Chat Suggestions] Sugestões inseridas antes do input (fallback no parent imediato)');
                        return true;
                    } else if (parent.parentElement) {
                        if (container.parentElement) {
                            container.parentElement.removeChild(container);
                        }
                        parent.parentElement.insertBefore(container, parent);
                        console.info('[Chat Suggestions] Sugestões inseridas antes do container do input (parent)');
                        return true;
                    }
                }
            }

            const fallbackSelectors = [
                '.csms-chat-controls-base-input-message',
                '.csms-chat-composer-input-wrapper__content',
                'textarea',
                'input[type="text"]',
                '[contenteditable="true"]'
            ];

            for (const selector of fallbackSelectors) {
                const element = document.querySelector(selector);
                if (element && element.parentElement) {
                    if (container.parentElement) {
                        container.parentElement.removeChild(container);
                    }
                    element.parentElement.insertBefore(container, element);
                    console.info('[Chat Suggestions] Sugestões inseridas via seletor alternativo', { selector });
                    return true;
                }
            }

            if (container.parentElement) {
                container.parentElement.removeChild(container);
            }
            document.body.appendChild(container);
            console.info('[Chat Suggestions] Sugestões inseridas no body (fallback final)');
            return false;
        }

        attachDomObserver() {
            if (this.domObserver) {
                return;
            }

            this.domObserver = new MutationObserver(() => {
                const container = this.getContainer();
                if (!container) return;

                if (this.placement === 'overlay' || this.placement === 'floating') {
                    if (container.parentElement !== document.body) {
                        if (container.parentElement) {
                            container.parentElement.removeChild(container);
                        }
                        document.body.appendChild(container);
                    }
                    this.applyTheme(container);

                    if (this.placement === 'floating') {
                        this.applyFloatingPlacement();
                        this.ensureFloatingLauncher();
                        this.updateFloatingVisibility();
                        return;
                    }

                    this.ensureGoodPlacement();
                    return;
                }

                const inputElement = document.querySelector(this.inputSelector);
                if (!inputElement) return;

                const currentParent = container.parentElement;
                const inputWrapper = inputElement.closest('.csms-chat-controls-base-input-message') ||
                                    inputElement.closest('.csms-chat-composer-input-wrapper__content');

                if (inputWrapper && inputWrapper.contains(container)) {
                    if (inputWrapper.parentElement) {
                        if (currentParent) {
                            currentParent.removeChild(container);
                        }
                        inputWrapper.parentElement.insertBefore(container, inputWrapper);
                    }
                } else if (inputWrapper && inputWrapper.parentElement) {
                    const expectedParent = inputWrapper.parentElement;
                    if (currentParent !== expectedParent) {
                        if (currentParent) {
                            currentParent.removeChild(container);
                        }
                        expectedParent.insertBefore(container, inputWrapper);
                    }
                }

                this.ensureGoodPlacement();
                this.applyTheme(container);
            });

            this.domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        ensureFloatingLauncher() {
            if (this.placement !== 'floating') return null;

            const existing = document.getElementById('bcs-floating-launcher');
            if (existing) {
                this.floatingLauncher = existing;
                return existing;
            }

            const button = document.createElement('button');
            button.id = 'bcs-floating-launcher';
            button.type = 'button';
            button.className = 'bcs-floating-launcher';
            button.setAttribute('aria-label', 'Abrir sugestões');
            button.title = 'Sugestões';
            button.textContent = '💬';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.floatingOpen = !this.floatingOpen;
                this.updateFloatingVisibility();
            });

            document.body.appendChild(button);
            this.floatingLauncher = button;

            this.attachFloatingGlobalHandlers();
            return button;
        }

        attachFloatingGlobalHandlers() {
            if (this.boundFloatingKeydown) return;

            this.boundFloatingKeydown = (e) => {
                if (this.placement !== 'floating') return;
                if (!this.floatingOpen) return;
                if (e.key === 'Escape') {
                    this.floatingOpen = false;
                    this.updateFloatingVisibility();
                }
            };

            this.boundFloatingDocPointerDown = (e) => {
                if (this.placement !== 'floating') return;
                if (!this.floatingOpen) return;

                const container = this.getContainer();
                const launcher = this.floatingLauncher;
                const target = e.target;

                if (launcher && (launcher === target || launcher.contains(target))) return;
                if (container && (container === target || container.contains(target))) return;

                this.floatingOpen = false;
                this.updateFloatingVisibility();
            };

            document.addEventListener('keydown', this.boundFloatingKeydown, true);
            document.addEventListener('pointerdown', this.boundFloatingDocPointerDown, true);
        }

        updateFloatingVisibility() {
            if (this.placement !== 'floating') return;

            const container = this.getContainer();
            if (container) {
                container.style.display = this.floatingOpen ? 'flex' : 'none';
            }

            if (this.floatingLauncher) {
                this.floatingLauncher.classList.toggle('bcs-floating-launcher--active', this.floatingOpen);
                this.floatingLauncher.setAttribute('aria-label', this.floatingOpen ? 'Fechar sugestões' : 'Abrir sugestões');
                this.floatingLauncher.title = this.floatingOpen ? 'Fechar sugestões' : 'Sugestões';
            }
        }

        applyFloatingPlacement() {
            if (this.placement !== 'floating') return;

            const container = this.getContainer();
            if (!container) return;

            container.classList.add('bcs-floating-panel');
            container.style.position = 'fixed';
            container.style.zIndex = '2147483647';
            container.style.left = '';
            container.style.bottom = '';
            container.style.right = '72px';
            container.style.top = '50%';
            container.style.transform = 'translateY(-50%)';
            container.style.width = '340px';
            container.style.maxWidth = 'calc(100vw - 110px)';
            container.style.maxHeight = '70vh';
            container.style.overflow = 'auto';
            container.style.flexWrap = 'wrap';
        }

        findInputElement() {
            const selectorText = String(this.inputSelector || '');
            const looksLikeWhatsAppFooter = selectorText.includes('#main') && selectorText.includes('footer');
            const allowGlobalFallback = !looksLikeWhatsAppFooter;
            const selectors = allowGlobalFallback
                ? [this.inputSelector, ...(window.BadooChatSuggestions?.constants?.INPUT_SELECTORS || [])]
                : [this.inputSelector];

            const pickCandidate = (nodes) => {
                if (!nodes || !nodes.length) return null;
                if (!looksLikeWhatsAppFooter) return nodes[0];

                const footerNodes = [];
                for (const node of nodes) {
                    if (!node) continue;
                    if (node.closest && node.closest('#main footer')) {
                        footerNodes.push(node);
                    }
                }
                const pool = footerNodes.length ? footerNodes : Array.from(nodes);
                let best = null;
                let bestScore = -Infinity;
                for (const node of pool) {
                    try {
                        const rect = node.getBoundingClientRect();
                        if (!rect || !rect.width || !rect.height) continue;
                        const score = rect.top + rect.height;
                        if (score > bestScore) {
                            bestScore = score;
                            best = node;
                        }
                    } catch (e) {
                        // Ignora
                    }
                }
                return best || pool[0] || null;
            };

            for (const selector of selectors) {
                try {
                    const nodes = document.querySelectorAll(selector);
                    const candidate = pickCandidate(nodes);
                    if (candidate) return candidate;
                } catch (e) {
                    // Ignora seletor inválido
                }
            }

            if (looksLikeWhatsAppFooter) {
                try {
                    const fallback = document.querySelector('#main footer [contenteditable="true"]') ||
                                    document.querySelector('#main footer [role="textbox"]');
                    if (fallback) return fallback;
                } catch (e) {
                    // Ignora
                }
            }

            return null;
        }

        applyTheme(container) {
            if (!container || !container.classList) return;
            try {
                const bg = window.getComputedStyle(document.body).backgroundColor || '';
                const rgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
                if (!rgb) return;
                const r = Number(rgb[1]) / 255;
                const g = Number(rgb[2]) / 255;
                const b = Number(rgb[3]) / 255;
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const isDark = luminance < 0.45;
                container.classList.toggle('bcs-theme-dark', isDark);
                container.classList.toggle('bcs-theme-light', !isDark);

                if (this.placement === 'floating' && this.floatingLauncher && this.floatingLauncher.classList) {
                    this.floatingLauncher.classList.toggle('bcs-theme-dark', isDark);
                    this.floatingLauncher.classList.toggle('bcs-theme-light', !isDark);
                }
            } catch (e) {
                // Ignora
            }
        }

        getManualPositionStorageKey() {
            const host = (location && location.host) ? location.host : 'unknown';
            return `bcs:barPosition:${host}`;
        }

        loadManualPosition() {
            try {
                const raw = localStorage.getItem(this.getManualPositionStorageKey());
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return;
                this.manualPosition = {
                    left: parsed.left,
                    top: parsed.top,
                    width: typeof parsed.width === 'number' ? parsed.width : null
                };
            } catch (e) {
                // Ignora
            }
        }

        saveManualPosition() {
            try {
                const key = this.getManualPositionStorageKey();
                if (!this.manualPosition) {
                    localStorage.removeItem(key);
                    return;
                }
                localStorage.setItem(key, JSON.stringify(this.manualPosition));
            } catch (e) {
                // Ignora
            }
        }

        applyManualPositionIfAny() {
            if (this.placement !== 'overlay') return false;
            if (!this.manualPosition) return false;

            const container = this.getContainer();
            if (!container) return false;

            container.style.position = 'fixed';
            container.style.zIndex = '2147483647';
            container.style.bottom = '';
            container.style.right = 'auto';
            container.style.left = `${Math.max(0, Math.round(this.manualPosition.left))}px`;
            container.style.top = `${Math.max(0, Math.round(this.manualPosition.top))}px`;

            const width = this.manualPosition.width;
            if (typeof width === 'number' && width > 0) {
                container.style.width = `${Math.max(240, Math.round(width))}px`;
            }
            return true;
        }

        ensureGoodPlacement() {
            if (this.placement === 'floating') {
                this.applyFloatingPlacement();
                return;
            }

            const container = this.getContainer();
            const input = this.findInputElement();
            if (!container || !input) return;

            if (this.placement !== 'overlay') {
                this.ensureNotSharingFlexRowWithComposer(container, input);
            }

            try {
                const inputRect = input.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                if (!inputRect.width || !inputRect.height) return;

                if (this.placement === 'overlay') {
                    if (this.applyManualPositionIfAny()) return;
                    this.enableFixedPlacement(inputRect);
                    return;
                }

                const overlap = containerRect.bottom >= (inputRect.top - 4);
                if (!overlap) {
                    if (this.fixedPlacementEnabled) {
                        this.disableFixedPlacement();
                    }
                    return;
                }

                this.enableFixedPlacement(inputRect);
            } catch (e) {
                // Ignora
            }
        }

        ensureNotSharingFlexRowWithComposer(container, input) {
            const form = input.closest && input.closest('form');
            const composerRow = form ? form.parentElement : null;
            if (!form || !composerRow || !composerRow.contains(container)) {
                return;
            }

            try {
                const style = window.getComputedStyle(composerRow);
                const flexDirection = style.flexDirection || 'row';
                if (style.display !== 'flex' || !flexDirection.startsWith('row')) {
                    return;
                }

                const parent = composerRow.parentElement;
                if (parent) {
                    if (container.parentElement) {
                        container.parentElement.removeChild(container);
                    }
                    parent.insertBefore(container, composerRow);
                    container.style.marginBottom = '8px';
                    console.info('[Chat Suggestions] Ajuste de layout: movendo sugestões acima do composer (flex row detectado)');
                    return;
                }

                composerRow.style.flexWrap = 'wrap';
                container.style.flexBasis = '100%';
                container.style.order = '0';
                form.style.order = '1';
                console.info('[Chat Suggestions] Ajuste de layout: forçando wrap no composer (fallback)');
            } catch (e) {
                // Ignora
            }
        }

        enableFixedPlacement(inputRect) {
            if (!this.boundRecalcPlacement) {
                this.boundRecalcPlacement = () => {
                    const input = this.findInputElement();
                    if (!input || !this.container) return;
                    try {
                        if (this.manualPosition) return;
                        const rect = this.getFixedAnchorRect(input) || input.getBoundingClientRect();
                        const bottomOffset = Math.max(8, Math.round(window.innerHeight - rect.top + 8));
                        this.container.style.bottom = `${bottomOffset}px`;
                        this.container.style.left = `${Math.max(0, Math.round(rect.left))}px`;
                        this.container.style.width = `${Math.max(240, Math.round(rect.width))}px`;
                    } catch (e) {
                        // Ignora
                    }
                };
            }

            this.fixedPlacementEnabled = true;
            const container = this.getContainer();
            container.style.position = 'fixed';
            container.style.right = 'auto';
            container.style.zIndex = '2147483647';

            const bottomOffset = Math.max(8, Math.round(window.innerHeight - inputRect.top + 8));
            container.style.bottom = `${bottomOffset}px`;
            container.style.left = `${Math.max(0, Math.round(inputRect.left))}px`;
            container.style.width = `${Math.max(240, Math.round(inputRect.width))}px`;
            container.style.top = '';

            window.addEventListener('resize', this.boundRecalcPlacement, true);
            window.addEventListener('scroll', this.boundRecalcPlacement, true);
            this.boundRecalcPlacement();
        }

        getFixedAnchorRect(input) {
            try {
                const form = input.closest && input.closest('form');
                const anchor = form || input;
                const rect = anchor.getBoundingClientRect();
                if (rect && rect.width && rect.height) return rect;
            } catch (e) {
                // Ignora
            }
            return null;
        }

        disableFixedPlacement() {
            this.fixedPlacementEnabled = false;
            if (this.boundRecalcPlacement) {
                window.removeEventListener('resize', this.boundRecalcPlacement, true);
                window.removeEventListener('scroll', this.boundRecalcPlacement, true);
            }
            if (this.container) {
                this.container.style.position = 'relative';
                this.container.style.left = '';
                this.container.style.right = '';
                this.container.style.bottom = '';
                this.container.style.width = '100%';
                this.container.style.zIndex = '1000';
            }
        }

        render(suggestions, { isAI = false } = {}) {
            const container = this.getContainer();
            if (!container) return;

            if (isAI) {
                this.aiSuggestions = Array.isArray(suggestions) ? suggestions : [];
            } else {
                this.normalSuggestions = Array.isArray(suggestions) ? suggestions : [];
            }
            this.renderSections();
        }

        createSuggestionButton(text) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button';
            button.textContent = text;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.insertSuggestion(text);
                console.info('[Chat Suggestions] Sugestão aplicada', { text });
            });

            return button;
        }

        createAISuggestionButton(text) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--ai-suggestion';
            button.textContent = text;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.insertSuggestion(text);
                console.info('[Chat Suggestions] Sugestão IA aplicada', { text });
            });

            return button;
        }

        createAiButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--ai';
            button.textContent = this.aiLoading ? 'IA (gerando...)' : '✨ IA';
            button.disabled = this.aiLoading;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof this.onAiGenerate === 'function' && !this.aiLoading) {
                    this.onAiGenerate({ personality: this.selectedPersonality });
                }
            });

            return button;
        }

        createInlinePersonalitySelect() {
            if (typeof this.onAiGenerate !== 'function') return null;

            const select = document.createElement('select');
            select.className = 'chat-suggestions-personality-select';

            this.getPersonalityOptions().forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });
            select.value = this.selectedPersonality || 'default';

            select.addEventListener('change', () => {
                this.selectedPersonality = select.value || 'default';
                if (this.aiPromptOverlay && this.aiPromptOverlay.style.display === 'flex') {
                    this.applyPersonalityToPrompts(this.selectedPersonality);
                    if (this.aiPromptPersonalitySelect) {
                        this.aiPromptPersonalitySelect.value = this.selectedPersonality;
                    }
                }
            });

            return select;
        }

        getResponseLengthOptions() {
            return [
                { value: 'short', label: 'Curta' },
                { value: 'medium', label: 'Média' },
                { value: 'long', label: 'Longa' }
            ];
        }

        createResponseLengthSelect() {
            const hasAI = typeof this.onAiGenerate === 'function' || typeof this.onAiCopyPrompt === 'function';
            if (!hasAI) return null;

            const select = document.createElement('select');
            select.className = 'chat-suggestions-response-length-select';

            this.getResponseLengthOptions().forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                select.appendChild(option);
            });

            select.value = this.selectedResponseLength || 'short';

            select.addEventListener('change', () => {
                const value = select.value || 'short';
                this.selectedResponseLength = value;
                if (typeof this.onResponseLengthChange === 'function') {
                    this.onResponseLengthChange({ responseLength: value });
                }
            });

            return select;
        }

        createCopyPromptButton() {
            if (typeof this.onAiCopyPrompt !== 'function') return null;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--copy-prompt';
            button.textContent = 'Copiar prompt';

            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiLoading) return;

                try {
                    button.disabled = true;
                    const { systemPrompt, userPrompt } = await this.onAiCopyPrompt({ personality: this.selectedPersonality });
                    const systemWithPersonality = `${String(systemPrompt || '')}${this.buildPersonalityAddon(this.selectedPersonality)}`.trim();
                    const joined = [
                        '--- SYSTEM ---',
                        systemWithPersonality,
                        '',
                        '--- USER ---',
                        String(userPrompt || '').trim()
                    ].join('\n');
                    const ok = await this.copyToClipboard(joined);
                    if (!ok) {
                        this.showToast('Não foi possível copiar o prompt', { type: 'error' });
                        alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
                    } else {
                        this.showToast('Prompt copiado!');
                        if (this.placement === 'floating') {
                            this.floatingOpen = false;
                            this.updateFloatingVisibility();
                        }
                    }
                } catch (err) {
                    console.error('[Chat Suggestions] Erro ao copiar prompt', err);
                    this.showToast('Erro ao copiar o prompt', { type: 'error' });
                    alert(`Não foi possível preparar/copiar o prompt.\n${err?.message || ''}`);
                } finally {
                    button.disabled = false;
                }
            });

            return button;
        }

        createDragToggleButton() {
            if (this.placement !== 'overlay') return null;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--drag';
            button.textContent = 'Mover';
            button.title = 'Ativar/desativar modo de mover a barra';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dragEnabled = !this.dragEnabled;

                const container = this.getContainer();
                container.classList.toggle('bcs-drag-enabled', this.dragEnabled);

                if (this.dragEnabled) {
                    this.attachDragHandlers(container);
                    container.classList.add('bcs-drag-enabled');
                } else {
                    this.detachDragHandlers(container);
                }

                button.classList.toggle('chat-suggestion-button--active', this.dragEnabled);
            });

            return button;
        }

        createDragHandleButton() {
            if (this.placement !== 'overlay') return null;
            if (!this.dragEnabled) return null;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--drag-handle';
            button.setAttribute('data-bcs-drag-handle', 'true');
            button.title = 'Arrastar barra';
            button.textContent = '⋮⋮';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            return button;
        }

        createDragResetButton() {
            if (this.placement !== 'overlay') return null;
            if (!this.manualPosition) return null;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button';
            button.textContent = 'Reset posição';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.manualPosition = null;
                this.saveManualPosition();
                this.ensureGoodPlacement();
            });

            return button;
        }

        attachDragHandlers(container) {
            if (!container || container.dataset.bcsDragAttached === 'true') return;
            container.dataset.bcsDragAttached = 'true';

            const onPointerDown = (ev) => {
                if (!this.dragEnabled) return;
                if (ev.button !== 0) return;

                const target = ev.target;
                const isHandle = Boolean(target && target.closest?.('[data-bcs-drag-handle="true"]'));
                if (!isHandle) {
                    if (target && (target.closest?.('button') || target.closest?.('select') || target.closest?.('input') || target.closest?.('textarea'))) {
                        return;
                    }
                }

                try {
                    const rect = container.getBoundingClientRect();
                    this.dragging = true;
                    this.dragPointerId = ev.pointerId;
                    this.dragOffsetX = ev.clientX - rect.left;
                    this.dragOffsetY = ev.clientY - rect.top;
                    container.classList.add('bcs-dragging');
                    container.setPointerCapture(ev.pointerId);

                    this.manualPosition = {
                        left: Math.round(rect.left),
                        top: Math.round(rect.top),
                        width: Math.round(rect.width)
                    };
                    this.applyManualPositionIfAny();
                    this.saveManualPosition();
                    ev.preventDefault();
                } catch (e) {
                    // Ignora
                }
            };

            const onPointerMove = (ev) => {
                if (!this.dragging) return;
                if (this.dragPointerId != null && ev.pointerId !== this.dragPointerId) return;

                const currentRect = container.getBoundingClientRect();
                const width = Math.round(currentRect.width || (this.manualPosition?.width || 320));
                const maxLeft = Math.max(0, window.innerWidth - width - 8);
                const left = Math.min(maxLeft, Math.max(8, Math.round(ev.clientX - this.dragOffsetX)));
                const top = Math.min(Math.max(8, Math.round(ev.clientY - this.dragOffsetY)), Math.max(8, window.innerHeight - 56));

                this.manualPosition = { left, top, width };
                this.applyManualPositionIfAny();
                ev.preventDefault();
            };

            const onPointerUp = (ev) => {
                if (!this.dragging) return;
                if (this.dragPointerId != null && ev.pointerId !== this.dragPointerId) return;
                this.dragging = false;
                this.dragPointerId = null;
                container.classList.remove('bcs-dragging');
                this.saveManualPosition();
                try {
                    container.releasePointerCapture(ev.pointerId);
                } catch (e) {
                    // Ignora
                }
                ev.preventDefault();
            };

            container._bcsPointerDown = onPointerDown;
            container._bcsPointerMove = onPointerMove;
            container._bcsPointerUp = onPointerUp;

            container.addEventListener('pointerdown', onPointerDown, { passive: false });
            container.addEventListener('pointermove', onPointerMove, { passive: false });
            container.addEventListener('pointerup', onPointerUp, { passive: false });
            container.addEventListener('pointercancel', onPointerUp, { passive: false });
        }

        detachDragHandlers(container) {
            if (!container || container.dataset.bcsDragAttached !== 'true') return;
            container.dataset.bcsDragAttached = 'false';
            try {
                container.removeEventListener('pointerdown', container._bcsPointerDown);
                container.removeEventListener('pointermove', container._bcsPointerMove);
                container.removeEventListener('pointerup', container._bcsPointerUp);
                container.removeEventListener('pointercancel', container._bcsPointerUp);
            } catch (e) {
                // Ignora
            }
            delete container._bcsPointerDown;
            delete container._bcsPointerMove;
            delete container._bcsPointerUp;
            container.classList.remove('bcs-drag-enabled');
            container.classList.remove('bcs-dragging');
        }

        setAiLoading(isLoading) {
            this.aiLoading = Boolean(isLoading);
            if (this.aiButton) {
                this.aiButton.textContent = this.aiLoading ? 'IA (gerando...)' : '✨ IA';
                this.aiButton.disabled = this.aiLoading;
                this.aiButton.style.opacity = this.aiLoading ? '0.7' : '1';
            }
        }

        renderSections() {
            const container = this.getContainer();
            if (!container) return;

            container.innerHTML = '';

            const floatingClose = this.createFloatingCloseButton();
            if (floatingClose) {
                container.appendChild(floatingClose);
            }

            const dragHandle = this.createDragHandleButton();
            if (dragHandle) {
                container.appendChild(dragHandle);
            }

            if (typeof this.onAiGenerate === 'function') {
                const aiButton = this.createAiButton();
                container.appendChild(aiButton);
                this.aiButton = aiButton;
            }

            const personalitySelect = this.createInlinePersonalitySelect();
            if (personalitySelect) {
                container.appendChild(personalitySelect);
            }

            const responseLengthSelect = this.createResponseLengthSelect();
            if (responseLengthSelect) {
                container.appendChild(responseLengthSelect);
            }

            const copyPromptButton = this.createCopyPromptButton();
            if (copyPromptButton) {
                container.appendChild(copyPromptButton);
            }

            const dragButton = this.createDragToggleButton();
            if (dragButton) {
                container.appendChild(dragButton);
            }

            const resetButton = this.createDragResetButton();
            if (resetButton) {
                container.appendChild(resetButton);
            }

            const libraryButton = this.createLibraryButton();
            container.appendChild(libraryButton);
            this.libraryButton = libraryButton;

            const toggleButton = this.createSuggestionsToggleButton();
            container.appendChild(toggleButton);

            if (this.suggestionsCollapsed) {
                if (container.style.display === 'none' && !(this.placement === 'floating' && !this.floatingOpen)) {
                    container.style.display = 'flex';
                }
                if (this.aiLoading) {
                    this.setAiLoading(true);
                }
                return;
            }

            if (this.aiSuggestions.length > 0) {
                const aiLabel = this.createLabel('Sugestões IA');
                container.appendChild(aiLabel);
                this.aiSuggestions.forEach(s => container.appendChild(this.createAISuggestionButton(s)));
            }

            if (this.normalSuggestions.length > 0) {
                const normalLabel = this.createLabel('Sugestões');
                container.appendChild(normalLabel);
                this.normalSuggestions.forEach(s => container.appendChild(this.createSuggestionButton(s)));
            }

            if (container.style.display === 'none' && !(this.placement === 'floating' && !this.floatingOpen)) {
                container.style.display = 'flex';
            }

            if (this.aiLoading) {
                this.setAiLoading(true);
            }
        }

        createFloatingCloseButton() {
            if (this.placement !== 'floating') return null;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button bcs-floating-close';
            button.textContent = '✕';
            button.title = 'Fechar';
            button.setAttribute('aria-label', 'Fechar sugestões');

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.floatingOpen = false;
                this.updateFloatingVisibility();
            });

            return button;
        }

        createSuggestionsToggleButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--toggle';
            button.textContent = this.suggestionsCollapsed ? 'Mostrar sugestões' : 'Ocultar sugestões';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.suggestionsCollapsed = !this.suggestionsCollapsed;
                this.renderSections();
                this.ensureGoodPlacement();
            });

            return button;
        }

        createLibraryButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--library';
            button.textContent = 'Biblioteca';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openLibraryModal();
            });

            return button;
        }

        getLibraryData() {
            const lib = window.BadooChatSuggestions?.constants?.SUGGESTION_LIBRARY;
            if (Array.isArray(lib) && lib.length) return lib;
            return [];
        }

        ensureLibraryModal() {
            if (this.libraryOverlay && this.libraryDialog) return;

            const overlay = document.createElement('div');
            overlay.className = 'bcs-modal-overlay';
            overlay.style.display = 'none';

            const dialog = document.createElement('div');
            dialog.className = 'bcs-modal';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');

            const header = document.createElement('div');
            header.className = 'bcs-modal__header';

            const title = document.createElement('h2');
            title.className = 'bcs-modal__title';
            title.textContent = 'Biblioteca de sugestões';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'bcs-modal__close';
            closeBtn.textContent = 'Fechar';
            closeBtn.addEventListener('click', () => this.closeLibraryModal());

            header.appendChild(title);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'bcs-modal__body';

            const search = document.createElement('input');
            search.type = 'text';
            search.className = 'bcs-modal__search';
            search.placeholder = 'Buscar sugestões...';
            search.autocomplete = 'off';
            search.addEventListener('input', () => this.renderLibraryModalList());

            body.appendChild(search);

            dialog.appendChild(header);
            dialog.appendChild(body);
            overlay.appendChild(dialog);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeLibraryModal();
                }
            });

            this.boundLibraryKeydown = (e) => {
                if (e.key === 'Escape') {
                    this.closeLibraryModal();
                }
            };

            document.body.appendChild(overlay);

            this.libraryOverlay = overlay;
            this.libraryDialog = dialog;
            this.librarySearchInput = search;
        }

        openLibraryModal() {
            this.ensureLibraryModal();
            if (!this.libraryOverlay) return;

            this.libraryOverlay.style.display = 'flex';
            document.addEventListener('keydown', this.boundLibraryKeydown, true);
            this.renderLibraryModalList();

            setTimeout(() => {
                if (this.librarySearchInput) {
                    this.librarySearchInput.value = '';
                    this.librarySearchInput.focus();
                }
            }, 0);
        }

        closeLibraryModal() {
            if (!this.libraryOverlay) return;
            this.libraryOverlay.style.display = 'none';
            document.removeEventListener('keydown', this.boundLibraryKeydown, true);
        }

        ensureAiPromptModal() {
            if (this.aiPromptOverlay && this.aiPromptDialog) return;

            const overlay = document.createElement('div');
            overlay.className = 'bcs-modal-overlay';
            overlay.style.display = 'none';

            const dialog = document.createElement('div');
            dialog.className = 'bcs-modal';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');

            const header = document.createElement('div');
            header.className = 'bcs-modal__header';

            const title = document.createElement('h2');
            title.className = 'bcs-modal__title';
            title.textContent = 'Prompt da IA (editável)';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'bcs-modal__close';
            closeBtn.textContent = 'Fechar';
            closeBtn.addEventListener('click', () => this.closeAiPromptModal());

            header.appendChild(title);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'bcs-modal__body';

            const personalityLabel = this.createLabel('Personalidade');
            personalityLabel.style.color = 'rgba(255, 255, 255, 0.72)';
            personalityLabel.style.marginRight = '0';
            body.appendChild(personalityLabel);

            const personalitySelect = document.createElement('select');
            personalitySelect.className = 'bcs-modal__select';
            this.getPersonalityOptions().forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                personalitySelect.appendChild(option);
            });
            personalitySelect.value = 'default';
            personalitySelect.addEventListener('change', () => {
                const value = personalitySelect.value;
                if (this.aiPromptDirty) {
                    const ok = confirm('Você editou o prompt. Trocar a personalidade vai redefinir o texto. Continuar?');
                    if (!ok) {
                        personalitySelect.value = this.selectedPersonality || 'default';
                        return;
                    }
                }
                this.selectedPersonality = value || 'default';
                this.applyPersonalityToPrompts(value);
            });
            body.appendChild(personalitySelect);

            const systemLabel = this.createLabel('System');
            systemLabel.style.color = 'rgba(255, 255, 255, 0.72)';
            systemLabel.style.marginRight = '0';
            body.appendChild(systemLabel);

            const systemTextarea = document.createElement('textarea');
            systemTextarea.className = 'bcs-modal__textarea';
            systemTextarea.placeholder = 'System prompt...';
            systemTextarea.addEventListener('input', () => {
                this.aiPromptDirty = true;
            });
            body.appendChild(systemTextarea);

            const userLabel = this.createLabel('User');
            userLabel.style.color = 'rgba(255, 255, 255, 0.72)';
            userLabel.style.marginRight = '0';
            userLabel.style.marginTop = '12px';
            body.appendChild(userLabel);

            const userTextarea = document.createElement('textarea');
            userTextarea.className = 'bcs-modal__textarea';
            userTextarea.placeholder = 'User prompt...';
            userTextarea.style.minHeight = '150px';
            userTextarea.addEventListener('input', () => {
                this.aiPromptDirty = true;
            });
            body.appendChild(userTextarea);

            const row = document.createElement('div');
            row.className = 'bcs-modal__row';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'bcs-modal__btn';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.addEventListener('click', () => this.closeAiPromptModal());

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'bcs-modal__btn';
            copyBtn.textContent = 'Copiar prompt';
            copyBtn.addEventListener('click', async () => {
                const systemPrompt = (systemTextarea.value || '').trim();
                const userPrompt = (userTextarea.value || '').trim();
                const joined = [
                    '--- SYSTEM ---',
                    systemPrompt,
                    '',
                    '--- USER ---',
                    userPrompt
                ].join('\n');

                const ok = await this.copyToClipboard(joined);
                if (ok) {
                    this.showToast('Prompt copiado!');
                    this.closeAiPromptModal();
                } else {
                    this.showToast('Não foi possível copiar o prompt', { type: 'error' });
                    alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
                }
            });

            const sendBtn = document.createElement('button');
            sendBtn.type = 'button';
            sendBtn.className = 'bcs-modal__btn bcs-modal__btn--primary';
            sendBtn.textContent = 'Enviar para IA';
            sendBtn.addEventListener('click', async () => {
                if (typeof this.aiPromptOnSend !== 'function') return;
                const systemPrompt = (systemTextarea.value || '').trim();
                const userPrompt = (userTextarea.value || '').trim();
                if (!systemPrompt || !userPrompt) return;
                await this.aiPromptOnSend({ systemPrompt, userPrompt });
            });

            row.appendChild(cancelBtn);
            row.appendChild(copyBtn);
            row.appendChild(sendBtn);
            body.appendChild(row);

            dialog.appendChild(header);
            dialog.appendChild(body);
            overlay.appendChild(dialog);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeAiPromptModal();
                }
            });

            this.boundAiPromptKeydown = (e) => {
                if (e.key === 'Escape') {
                    this.closeAiPromptModal();
                }
            };

            document.body.appendChild(overlay);

            this.aiPromptOverlay = overlay;
            this.aiPromptDialog = dialog;
            this.aiPromptSystemTextarea = systemTextarea;
            this.aiPromptUserTextarea = userTextarea;
            this.aiPromptSendButton = sendBtn;
            this.aiPromptCancelButton = cancelBtn;
            this.aiPromptPersonalitySelect = personalitySelect;
        }

        getPersonalityOptions() {
            return [
                { value: 'default', label: 'Padrão (atual)' },
                { value: 'ousado', label: 'Ousado' },
                { value: 'sedutor', label: 'Sedutor' },
                { value: 'romantico', label: 'Romântico' },
                { value: 'engracado', label: 'Engraçado' },
                { value: 'fofo', label: 'Fofo' },
                { value: 'direto', label: 'Direto' }
            ];
        }

        buildPersonalityAddon(personality) {
            const map = {
                ousado: [
                    'Personalidade: ousado(a).',
                    'Flert leve e confiante, com brincadeiras sutis.',
                    'Evite conteúdo sexual explícito, vulgaridade ou pressão.',
                    'Seja respeitoso(a) e mantenha consentimento implícito.'
                ],
                sedutor: [
                    'Personalidade: sedutor(a).',
                    'Flert elegante, provocação sutil e clima de química.',
                    'Evite conteúdo sexual explícito, vulgaridade ou pressão.',
                    'Use elogios específicos e convites leves (sem insistir).'
                ],
                romantico: [
                    'Personalidade: romântico(a).',
                    'Tom carinhoso, gentil e atencioso.',
                    'Use elogios leves e linguagem mais afetiva, sem exagerar.'
                ],
                engracado: [
                    'Personalidade: engraçado(a).',
                    'Use humor leve, trocadilhos simples e espontaneidade.',
                    'Evite piadas ofensivas ou que dependam de temas sensíveis.'
                ],
                fofo: [
                    'Personalidade: fofo(a).',
                    'Tom doce, simpático e acolhedor.',
                    'Use expressões leves e positivas, sem infantilizar demais.'
                ],
                direto: [
                    'Personalidade: direto(a).',
                    'Respostas objetivas, claras e sem enrolação.',
                    'Mantenha o tom educado e natural.'
                ]
            };

            const lines = map[personality] || [];
            if (!lines.length) return '';
            return `\n\nRegras de estilo (personalidade):\n- ${lines.join('\n- ')}`;
        }

        ensureToastRoot() {
            const existing = document.getElementById('bcs-toast-root');
            if (existing) {
                this.toastRoot = existing;
                return existing;
            }

            const root = document.createElement('div');
            root.id = 'bcs-toast-root';
            root.className = 'bcs-toast-root';
            document.body.appendChild(root);
            this.toastRoot = root;
            return root;
        }

        showToast(message, { type = 'success', durationMs = 2200 } = {}) {
            try {
                const text = String(message || '').trim();
                if (!text) return;

                const root = this.ensureToastRoot();
                const toast = document.createElement('div');
                toast.className = `bcs-toast${type === 'error' ? ' bcs-toast--error' : ''}`;
                toast.textContent = text;

                root.appendChild(toast);

                const hideTimeout = setTimeout(() => {
                    toast.classList.add('bcs-toast--hide');
                }, Math.max(800, Number(durationMs) || 2200));

                const removeTimeout = setTimeout(() => {
                    if (toast && toast.parentElement) {
                        toast.parentElement.removeChild(toast);
                    }
                }, Math.max(800, Number(durationMs) || 2200) + 260);

                this.toastTimeouts.push(hideTimeout, removeTimeout);
            } catch (e) {
                // Ignora
            }
        }

        applyPersonalityToPrompts(personality) {
            if (!this.aiPromptSystemTextarea || !this.aiPromptUserTextarea) return;

            const baseSystem = this.aiPromptBaseSystemPrompt || '';
            const baseUser = this.aiPromptBaseUserPrompt || '';
            const addon = this.buildPersonalityAddon(personality);

            this.aiPromptSystemTextarea.value = `${baseSystem}${addon}`.trim();
            this.aiPromptUserTextarea.value = baseUser;
            this.aiPromptDirty = false;
        }

        async copyToClipboard(text) {
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(text);
                    return true;
                }
            } catch (e) {
                // Ignora e tenta fallback
            }

            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', 'true');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(textarea);
                return Boolean(ok);
            } catch (e) {
                return false;
            }
        }

        openAiPromptModal({ systemPrompt, userPrompt, onSend }) {
            this.ensureAiPromptModal();
            this.aiPromptOnSend = onSend;

            this.aiPromptBaseSystemPrompt = systemPrompt || '';
            this.aiPromptBaseUserPrompt = userPrompt || '';
            this.aiPromptDirty = false;

            if (this.aiPromptPersonalitySelect) {
                this.aiPromptPersonalitySelect.value = this.selectedPersonality || 'default';
            }
            this.applyPersonalityToPrompts(this.selectedPersonality || 'default');

            if (this.aiPromptOverlay) {
                this.aiPromptOverlay.style.display = 'flex';
            }
            document.addEventListener('keydown', this.boundAiPromptKeydown, true);

            setTimeout(() => {
                if (this.aiPromptUserTextarea) {
                    this.aiPromptUserTextarea.focus();
                    this.aiPromptUserTextarea.selectionStart = this.aiPromptUserTextarea.value.length;
                    this.aiPromptUserTextarea.selectionEnd = this.aiPromptUserTextarea.value.length;
                }
            }, 0);
        }

        closeAiPromptModal() {
            if (this.aiPromptOverlay) {
                this.aiPromptOverlay.style.display = 'none';
            }
            document.removeEventListener('keydown', this.boundAiPromptKeydown, true);
            this.aiPromptOnSend = null;
        }

        setAiPromptSending(isSending) {
            const sending = Boolean(isSending);
            if (this.aiPromptSendButton) {
                this.aiPromptSendButton.disabled = sending;
                this.aiPromptSendButton.textContent = sending ? 'Enviando...' : 'Enviar para IA';
            }
            if (this.aiPromptCancelButton) {
                this.aiPromptCancelButton.disabled = sending;
            }
        }

        renderLibraryModalList() {
            if (!this.libraryDialog) return;
            const body = this.libraryDialog.querySelector('.bcs-modal__body');
            if (!body) return;

            const existing = body.querySelectorAll('.bcs-modal__section-title, .bcs-modal__grid');
            existing.forEach(el => el.remove());

            const query = (this.librarySearchInput?.value || '').toLowerCase().trim();
            const library = this.getLibraryData();

            const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const matchesQuery = (text) => {
                if (!normalizedQuery) return true;
                const normalizedText = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return normalizedText.includes(normalizedQuery);
            };

            let any = false;
            library.forEach(section => {
                const items = Array.isArray(section.items) ? section.items.filter(matchesQuery) : [];
                if (!items.length) return;

                any = true;
                const title = document.createElement('div');
                title.className = 'bcs-modal__section-title';
                title.textContent = section.title || 'Sugestões';

                const grid = document.createElement('div');
                grid.className = 'bcs-modal__grid';
                items.forEach(text => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'bcs-modal__item';
                    btn.textContent = text;
                    btn.addEventListener('click', () => {
                        this.insertSuggestion(text);
                        this.closeLibraryModal();
                    });
                    grid.appendChild(btn);
                });

                body.appendChild(title);
                body.appendChild(grid);
            });

            if (!any) {
                const emptyTitle = document.createElement('div');
                emptyTitle.className = 'bcs-modal__section-title';
                emptyTitle.textContent = 'Nenhum resultado';
                body.appendChild(emptyTitle);
            }
        }

        createLabel(text) {
            const label = document.createElement('span');
            label.textContent = text;
            label.style.cssText = `
                font-size: 12px;
                color: #666;
                font-weight: 600;
                padding: 4px 0;
                margin-right: 8px;
                align-self: center;
            `;
            return label;
        }

        insertSuggestion(text) {
            const selectors = [this.inputSelector, ...window.BadooChatSuggestions.constants.INPUT_SELECTORS];
            let input = null;
            for (const selector of selectors) {
                input = document.querySelector(selector);
                if (input) break;
            }

            if (!input) {
                console.warn('[Chat Suggestions] Caixa de mensagem não encontrada. Texto sugerido:', text);
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        alert(`Sugestão copiada: "${text}"`);
                    });
                } else {
                    alert(`Sugestão: "${text}"`);
                }
                return;
            }

            try {
                input.focus();

                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                    input.value = '';
                    input.value = text;

                    try {
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: text
                        });
                        input.dispatchEvent(inputEvent);
                    } catch (e) {
                        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }

                    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

                    setTimeout(() => {
                        if (input.value !== text) {
                            input.value = text;
                            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        }
                    }, 10);

                    try {
                        if (input._valueTracker) {
                            input._valueTracker.setValue('');
                        }
                        input.value = text;
                        if (input._valueTracker) {
                            input._valueTracker.setValue(text);
                        }
                    } catch (e) {
                        // Ignora
                    }

                } else if (input.contentEditable === 'true' || input.isContentEditable) {
                    input.textContent = '';
                    input.innerText = '';
                    input.textContent = text;
                    input.innerText = text;

                    try {
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: text
                        });
                        input.dispatchEvent(inputEvent);
                    } catch (e) {
                        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }

                    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

                    try {
                        const range = document.createRange();
                        const selection = window.getSelection();
                        if (selection) {
                            if (input.firstChild) {
                                range.selectNodeContents(input);
                            } else {
                                range.setStart(input, 0);
                                range.setEnd(input, 0);
                            }
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    } catch (e) {
                        // Ignora
                    }
                }

                input.focus();
            } catch (error) {
                console.error('[Chat Suggestions] Erro ao inserir texto:', error);
                try {
                    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                        input.value = text;
                        input.focus();
                    } else if (input.contentEditable === 'true' || input.isContentEditable) {
                        input.textContent = text;
                        input.focus();
                    }
                } catch (e) {
                    console.error('[Chat Suggestions] Erro no fallback:', e);
                }
            }
        }

        destroy() {
            if (this.domObserver) {
                this.domObserver.disconnect();
                this.domObserver = null;
            }

            if (this.boundRecalcPlacement) {
                window.removeEventListener('resize', this.boundRecalcPlacement, true);
                window.removeEventListener('scroll', this.boundRecalcPlacement, true);
            }

            if (this.boundLibraryKeydown) {
                document.removeEventListener('keydown', this.boundLibraryKeydown, true);
            }

            if (this.boundAiPromptKeydown) {
                document.removeEventListener('keydown', this.boundAiPromptKeydown, true);
            }

            if (this.boundFloatingKeydown) {
                document.removeEventListener('keydown', this.boundFloatingKeydown, true);
                this.boundFloatingKeydown = null;
            }

            if (this.boundFloatingDocPointerDown) {
                document.removeEventListener('pointerdown', this.boundFloatingDocPointerDown, true);
                this.boundFloatingDocPointerDown = null;
            }

            if (this.floatingLauncher && this.floatingLauncher.parentElement) {
                this.floatingLauncher.parentElement.removeChild(this.floatingLauncher);
            }
            this.floatingLauncher = null;

            if (this.toastTimeouts && this.toastTimeouts.length) {
                this.toastTimeouts.forEach(id => clearTimeout(id));
                this.toastTimeouts = [];
            }

            const toastRoot = this.toastRoot || document.getElementById('bcs-toast-root');
            if (toastRoot && toastRoot.parentElement) {
                toastRoot.parentElement.removeChild(toastRoot);
            }
            this.toastRoot = null;

            if (this.libraryOverlay && this.libraryOverlay.parentElement) {
                this.libraryOverlay.parentElement.removeChild(this.libraryOverlay);
            }

            if (this.aiPromptOverlay && this.aiPromptOverlay.parentElement) {
                this.aiPromptOverlay.parentElement.removeChild(this.aiPromptOverlay);
            }

            if (this.container && this.container.parentElement) {
                this.container.parentElement.removeChild(this.container);
            }

            this.container = null;
            this.libraryOverlay = null;
            this.aiPromptOverlay = null;
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.SuggestionsUI = SuggestionsUI;
})();
