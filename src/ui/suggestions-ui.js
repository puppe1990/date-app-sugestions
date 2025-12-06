(() => {
    class SuggestionsUI {
        constructor({ inputSelector, onAiGenerate } = {}) {
            this.inputSelector = inputSelector || '#chat-composer-input-message';
            this.container = null;
            this.domObserver = null;
            this.onAiGenerate = onAiGenerate;
            this.aiLoading = false;
            this.aiButton = null;
            this.aiSuggestions = [];
            this.normalSuggestions = [];
        }

        getContainer() {
            if (this.container) {
                return this.container;
            }

            const container = document.createElement('div');
            container.className = 'chat-suggestions-container';
            container.id = 'badoo-chat-suggestions-container';
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

            const styleId = 'badoo-chat-suggestions-styles';
            if (!document.getElementById(styleId)) {
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
            console.info('[Badoo Chat Suggestions] UI montada', { inserted, inputSelector: this.inputSelector });
            return inserted;
        }

        tryInsert(container) {
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
                    console.info('[Badoo Chat Suggestions] Sugestões inseridas antes do wrapper do input');
                    return true;
                }

                if (inputElement.parentElement) {
                    const parent = inputElement.parentElement;
                    if (!parent.classList.contains('csms-chat-controls-base-input-message')) {
                        if (container.parentElement) {
                            container.parentElement.removeChild(container);
                        }
                        parent.insertBefore(container, inputElement);
                        console.info('[Badoo Chat Suggestions] Sugestões inseridas antes do input (fallback no parent imediato)');
                        return true;
                    } else if (parent.parentElement) {
                        if (container.parentElement) {
                            container.parentElement.removeChild(container);
                        }
                        parent.parentElement.insertBefore(container, parent);
                        console.info('[Badoo Chat Suggestions] Sugestões inseridas antes do container do input (parent)');
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
                    console.info('[Badoo Chat Suggestions] Sugestões inseridas via seletor alternativo', { selector });
                    return true;
                }
            }

            if (container.parentElement) {
                container.parentElement.removeChild(container);
            }
            document.body.appendChild(container);
            console.info('[Badoo Chat Suggestions] Sugestões inseridas no body (fallback final)');
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
            });

            this.domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
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
                console.info('[Badoo Chat Suggestions] Sugestão aplicada', { text });
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
                console.info('[Badoo Chat Suggestions] Sugestão IA aplicada', { text });
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
                console.warn('[Badoo Chat Suggestions] Caixa de mensagem não encontrada. Texto sugerido:', text);
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
                console.error('[Badoo Chat Suggestions] Erro ao inserir texto:', error);
                try {
                    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                        input.value = text;
                        input.focus();
                    } else if (input.contentEditable === 'true' || input.isContentEditable) {
                        input.textContent = text;
                        input.focus();
                    }
                } catch (e) {
                    console.error('[Badoo Chat Suggestions] Erro no fallback:', e);
                }
            }
        }

        destroy() {
            if (this.domObserver) {
                this.domObserver.disconnect();
                this.domObserver = null;
            }

            if (this.container && this.container.parentElement) {
                this.container.parentElement.removeChild(this.container);
            }

            this.container = null;
        }
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.SuggestionsUI = SuggestionsUI;
})();
