(() => {
    class SuggestionsUI {
        constructor({ inputSelector, placement = 'inline', onAiGenerate } = {}) {
            this.inputSelector = inputSelector || '#chat-composer-input-message';
            this.placement = placement || 'inline';
            this.container = null;
            this.domObserver = null;
            this.onAiGenerate = onAiGenerate;
            this.aiLoading = false;
            this.aiButton = null;
            this.aiSuggestions = [];
            this.normalSuggestions = [];
            this.fixedPlacementEnabled = false;
            this.boundRecalcPlacement = null;
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
                gap: 8px;
                padding: 8px 16px;
                overflow-x: auto;
                background-color: #f5f5f5;
                border-top: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
                scrollbar-width: thin;
                z-index: 1000;
                position: relative;
                width: 100%;
                box-sizing: border-box;
            `;

            const styleId = 'chat-suggestions-styles';
            const legacyStyleId = 'badoo-chat-suggestions-styles';
            if (!document.getElementById(styleId) && !document.getElementById(legacyStyleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    .chat-suggestions-container::-webkit-scrollbar {
                        height: 4px;
                    }
                    .chat-suggestions-container::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .chat-suggestions-container::-webkit-scrollbar-thumb {
                        background: #ccc;
                        border-radius: 2px;
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
            container.style.display = 'flex';
            this.ensureGoodPlacement();
            console.info('[Chat Suggestions] UI montada', { inserted, inputSelector: this.inputSelector });
            return inserted;
        }

        tryInsert(container) {
            if (this.placement === 'overlay') {
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
                const inputElement = document.querySelector(this.inputSelector);
                if (!inputElement || !container) return;

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
            });

            this.domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        findInputElement() {
            const selectors = [this.inputSelector, ...(window.BadooChatSuggestions?.constants?.INPUT_SELECTORS || [])];
            for (const selector of selectors) {
                const input = document.querySelector(selector);
                if (input) return input;
            }
            return null;
        }

        ensureGoodPlacement() {
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

                const overlap = containerRect.bottom >= (inputRect.top - 4);
                if (this.placement === 'overlay') {
                    this.enableFixedPlacement(inputRect);
                    return;
                }

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
            container.style.borderTop = '1px solid #e0e0e0';
            container.style.borderBottom = '1px solid #e0e0e0';

            const bottomOffset = Math.max(8, Math.round(window.innerHeight - inputRect.top + 8));
            container.style.bottom = `${bottomOffset}px`;
            container.style.left = `${Math.max(0, Math.round(inputRect.left))}px`;
            container.style.width = `${Math.max(240, Math.round(inputRect.width))}px`;

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
            button.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #d0d0d0;
                border-radius: 20px;
                background-color: white;
                color: #333;
                font-size: 14px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                flex-shrink: 0;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#f0f0f0';
                button.style.borderColor = '#b0b0b0';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = 'white';
                button.style.borderColor = '#d0d0d0';
            });

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
            button.style.cssText = `
                padding: 8px 16px;
                border: 1px solid #333;
                border-radius: 18px;
                background-color: #111;
                color: #fff;
                font-size: 14px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                flex-shrink: 0;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#000';
                button.style.borderColor = '#222';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#111';
                button.style.borderColor = '#333';
            });

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
            button.style.cssText = `
                padding: 8px 14px;
                border: 1px solid #a0a0a0;
                border-radius: 16px;
                background-color: #333;
                color: #fff;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                flex-shrink: 0;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#111';
                button.style.borderColor = '#888';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#333';
                button.style.borderColor = '#a0a0a0';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof this.onAiGenerate === 'function' && !this.aiLoading) {
                    this.onAiGenerate();
                }
            });

            return button;
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

            if (typeof this.onAiGenerate === 'function') {
                const aiButton = this.createAiButton();
                container.appendChild(aiButton);
                this.aiButton = aiButton;
            }

            const libraryButton = this.createLibraryButton();
            container.appendChild(libraryButton);
            this.libraryButton = libraryButton;

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

            if (container.style.display === 'none') {
                container.style.display = 'flex';
            }

            if (this.aiLoading) {
                this.setAiLoading(true);
            }
        }

        createLibraryButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-suggestion-button chat-suggestion-button--library';
            button.textContent = 'Biblioteca';
            button.style.cssText = `
                padding: 8px 12px;
                border: 1px solid #d0d0d0;
                border-radius: 16px;
                background-color: #fff;
                color: #333;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                flex-shrink: 0;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#f0f0f0';
                button.style.borderColor = '#b0b0b0';
            });

            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#fff';
                button.style.borderColor = '#d0d0d0';
            });

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

            const systemLabel = this.createLabel('System');
            systemLabel.style.color = 'rgba(255, 255, 255, 0.72)';
            systemLabel.style.marginRight = '0';
            body.appendChild(systemLabel);

            const systemTextarea = document.createElement('textarea');
            systemTextarea.className = 'bcs-modal__textarea';
            systemTextarea.placeholder = 'System prompt...';
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
            body.appendChild(userTextarea);

            const row = document.createElement('div');
            row.className = 'bcs-modal__row';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'bcs-modal__btn';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.addEventListener('click', () => this.closeAiPromptModal());

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
        }

        openAiPromptModal({ systemPrompt, userPrompt, onSend }) {
            this.ensureAiPromptModal();
            this.aiPromptOnSend = onSend;

            if (this.aiPromptSystemTextarea) this.aiPromptSystemTextarea.value = systemPrompt || '';
            if (this.aiPromptUserTextarea) this.aiPromptUserTextarea.value = userPrompt || '';

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
