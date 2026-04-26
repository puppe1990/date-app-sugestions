(() => {
    function setupProfileCapture() {
        const helpers =
            window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
        if (
            !helpers.shouldSetupProfileCapture({
                platform: this.platform,
                hasObserver: Boolean(this.profilePortalObserver),
                hasClickHandler: Boolean(this.profileClickHandler),
            })
        ) {
            return;
        }

        const triggerSelectors = helpers.getProfileTriggerSelectors();

        this.profileClickHandler = (event) => {
            try {
                const target = event && event.target;
                const trigger = helpers.findProfileTrigger({
                    target,
                    triggerSelectors,
                });
                if (!trigger) return;
                if (this.debug) {
                    console.info(
                        '[Chat Suggestions][Badoo] Clique detectado para abrir perfil; iniciando monitoramento do portal',
                    );
                }
                this.waitForBadooProfilePortalAndCache({ timeoutMs: 7000 });
            } catch (e) {
                // Ignora
            }
        };

        document.addEventListener('click', this.profileClickHandler, true);
        if (this.debug) {
            console.info(
                '[Chat Suggestions][Badoo] Listener de clique para capturar perfil registrado',
            );
        }
    }

    function waitForBadooProfilePortalAndCache({ timeoutMs = 7000 } = {}) {
        const helpers =
            window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
        const tryCapture = () => {
            const text = this.extractBadooProfileTextFromPortal();
            if (text) {
                const nextState = helpers.buildProfileCacheState({
                    text,
                    previousText: this.cachedOtherPersonProfileText,
                    name: this.extractOtherPersonName(),
                    now: Date.now(),
                });
                const changed = nextState.changed;
                this.cachedOtherPersonProfileText = nextState.cache.text;
                this.cachedOtherPersonProfileUpdatedAt =
                    nextState.cache.updatedAt;
                this.cachedOtherPersonProfileName = nextState.cache.name;
                if (changed) {
                    this.info('Perfil atualizado (Badoo)', {
                        chars: text.length,
                    });
                }
                return true;
            }
            return false;
        };

        if (tryCapture()) return;

        if (this.profilePortalObserver) {
            if (this.debug) {
                console.info(
                    '[Chat Suggestions][Badoo] Observer do portal já ativo; aguardando atualização do perfil',
                );
            }
            return;
        }

        const startedAt = Date.now();
        let lastChangeAt = startedAt;
        if (this.debug) {
            console.info(
                '[Chat Suggestions][Badoo] Iniciando observer do portal do perfil',
                { timeoutMs },
            );
        }
        this.profilePortalObserver = new MutationObserver(() => {
            const before = this.cachedOtherPersonProfileText;
            const ok = tryCapture();
            if (
                ok &&
                this.cachedOtherPersonProfileText &&
                this.cachedOtherPersonProfileText !== before
            ) {
                lastChangeAt = Date.now();
            }

            const elapsed = Date.now() - startedAt;
            const settledFor = Date.now() - lastChangeAt;

            if (
                helpers.shouldStopProfileObserver({
                    elapsed,
                    timeoutMs,
                    settledFor,
                    cachedText: this.cachedOtherPersonProfileText,
                })
            ) {
                if (this.debug) {
                    console.info(
                        '[Chat Suggestions][Badoo] Encerrando observer do portal do perfil',
                        {
                            elapsedMs: elapsed,
                            settledForMs: settledFor,
                            hasBio: (
                                this.cachedOtherPersonProfileText || ''
                            ).includes('Sobre mim:'),
                            cachedChars: this.cachedOtherPersonProfileText
                                ? this.cachedOtherPersonProfileText.length
                                : 0,
                        },
                    );
                }
                this.profilePortalObserver.disconnect();
                this.profilePortalObserver = null;
            }
        });

        const root = document.body || document.documentElement;
        if (!root) return;
        this.profilePortalObserver.observe(root, {
            childList: true,
            subtree: true,
        });
    }

    function extractBadooProfileTextFromPortal() {
        const parser = window.ChatSuggestions.ProfileParser || {};
        if (typeof parser.extractBadooProfileTextFromPortal !== 'function') {
            return '';
        }
        return parser.extractBadooProfileTextFromPortal({ document });
    }

    function buildConversationCopyText({
        maxMessages = 40,
        maxChars = 2400,
    } = {}) {
        const copyHelpers = window.ChatSuggestions.ChatCopyHelpers || {};
        if (!this.contextExtractor || !this.chatContainer) return '';
        const context = this.contextExtractor.extract(this.chatContainer, {
            fullHistory: true,
        });
        const messages = context?.allMessages?.length
            ? context.allMessages
            : context?.lastMessages || [];
        return copyHelpers.buildConversationCopyText({
            messages,
            otherPersonName: this.extractOtherPersonName(),
            maxMessages,
            maxChars,
        });
    }

    async function copyOtherPersonProfileToClipboard() {
        try {
            const profileText = this.extractProfileText();
            const conversationText = this.buildConversationCopyText();
            if (!profileText && !conversationText) {
                if (this.platform === 'badoo') {
                    this.waitForBadooProfilePortalAndCache({
                        timeoutMs: 2500,
                    });
                }
                const copyHelpers =
                    window.ChatSuggestions.ChatCopyHelpers || {};
                return {
                    ok: false,
                    message: copyHelpers.getCopyProfileErrorMessage(
                        this.platform,
                    ),
                };
            }

            const copyHelpers = window.ChatSuggestions.ChatCopyHelpers || {};
            const payload = copyHelpers.buildClipboardPayload({
                profileText,
                conversationText,
            });

            const ok =
                this.ui && typeof this.ui.copyToClipboard === 'function'
                    ? await this.ui.copyToClipboard(payload)
                    : false;

            if (!ok) {
                return { ok: false, message: 'Não foi possível copiar' };
            }

            return {
                ok: true,
                message: conversationText
                    ? 'Perfil e conversa copiados!'
                    : 'Perfil copiado!',
            };
        } catch (e) {
            return { ok: false, message: 'Não foi possível copiar' };
        }
    }

    function extractProfileText() {
        const badooText = this.extractBadooProfileTextFromPortal();
        if (badooText) {
            const sanitized = this.sanitizeProfileText(badooText);
            this.cachedOtherPersonProfileText = sanitized;
            this.cachedOtherPersonProfileUpdatedAt = Date.now();
            const name = this.extractOtherPersonName();
            if (name) this.cachedOtherPersonProfileName = name;
            return sanitized;
        }

        if (this.cachedOtherPersonProfileText) {
            const currentName = this.extractOtherPersonName();
            if (
                currentName &&
                this.cachedOtherPersonProfileName &&
                currentName !== this.cachedOtherPersonProfileName
            ) {
                const helpers =
                    window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
                helpers.resetProfileCache(this);
                return '';
            }
            return this.cachedOtherPersonProfileText;
        }

        const helpers =
            window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
        const selectors = helpers.getProfileTextSelectors(
            this.profileContainerSelector,
        );

        let el = null;
        for (const sel of selectors) {
            try {
                el = document.querySelector(sel);
            } catch (e) {
                // ignora seletor inválido
            }
            if (el) break;
        }

        if (!el) return '';

        const raw = (el.innerText || el.textContent || '').trim();
        if (!raw) return '';

        return this.sanitizeProfileText(raw);
    }

    function sanitizeProfileText(raw) {
        const parser = window.ChatSuggestions.ProfileParser || {};
        if (typeof parser.sanitizeProfileText !== 'function') {
            return String(raw || '').trim();
        }
        return parser.sanitizeProfileText({
            raw,
            otherPersonName: this.extractOtherPersonName(),
        });
    }

    function extractOtherPersonName() {
        const helpers =
            window.ChatSuggestions.ChatProfileLifecycleHelpers || {};
        const selectors = helpers.getOtherPersonNameSelectors(
            this.otherPersonNameSelector,
        );
        const parser = window.ChatSuggestions.ProfileParser || {};
        if (typeof parser.extractOtherPersonName !== 'function') {
            for (const selector of selectors) {
                try {
                    const el = document.querySelector(selector);
                    let name =
                        el && (el.textContent || el.innerText)
                            ? (el.textContent || el.innerText).trim()
                            : '';
                    if (!name) continue;
                    name = name.replace(/\s+/g, ' ').trim();
                    if (name.includes(',')) {
                        name = name.split(',')[0].trim();
                    }
                    if (name) return name;
                } catch (e) {
                    // Ignora
                }
            }
            return '';
        }
        return parser.extractOtherPersonName({ document, selectors });
    }

    const api = {
        buildConversationCopyText,
        copyOtherPersonProfileToClipboard,
        extractBadooProfileTextFromPortal,
        extractOtherPersonName,
        extractProfileText,
        sanitizeProfileText,
        setupProfileCapture,
        waitForBadooProfilePortalAndCache,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    const root =
        typeof globalThis !== 'undefined'
            ? globalThis
            : typeof window !== 'undefined'
              ? window
              : {};
    root.window = root.window || root;
    root.window.ChatSuggestions = root.window.ChatSuggestions || {};
    root.window.ChatSuggestions.ChatControllerProfileHelpers = api;
})();
