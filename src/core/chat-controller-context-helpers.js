(() => {
    function normalizeContactKey(value) {
        const manager = window.ChatSuggestions.ContactContextManager || {};
        return manager.normalizeContactKey(value);
    }

    function extractContactKeyFromUrl() {
        const manager = window.ChatSuggestions.ContactContextManager || {};
        return manager.buildContactKeyFromUrl({
            href: location.href,
            platform: this.platform,
        });
    }

    function extractWhatsAppContactKey() {
        const manager = window.ChatSuggestions.ContactContextManager || {};
        return manager.buildWhatsAppContactKey({ document });
    }

    function extractContactKey() {
        const platform = String(this.platform || '').trim();
        if (platform === 'whatsapp') {
            return (
                this.extractWhatsAppContactKey() ||
                this.extractContactKeyFromUrl()
            );
        }
        return this.extractContactKeyFromUrl();
    }

    function refreshContactContext({ force = false } = {}) {
        if (!this.contextStore) return;

        const key = this.extractContactKey();
        if (!key) return;
        if (!force && key === this.currentContactKey) return;

        this.currentContactKey = key;
        this.currentContactName = this.extractOtherPersonName();

        const stored = this.contextStore.get(key);
        this.currentContactContextText =
            stored && stored.context ? stored.context : '';

        if (this.ui && typeof this.ui.setContactContextState === 'function') {
            this.ui.setContactContextState({
                hasContext: Boolean(
                    this.currentContactContextText &&
                    this.currentContactContextText.trim(),
                ),
            });
        }

        if (this.debug) {
            console.info('[Chat Suggestions][Context] Conversa atual', {
                contactKey: this.currentContactKey,
                contactName: this.currentContactName,
                hasContext: Boolean(
                    this.currentContactContextText &&
                    this.currentContactContextText.trim(),
                ),
            });
        }
    }

    function getContactContextMeta() {
        this.refreshContactContext();
        return {
            contactKey: this.currentContactKey,
            contactName:
                this.currentContactName || this.extractOtherPersonName(),
            contextText: this.currentContactContextText || '',
        };
    }

    function trimContactContext(text) {
        const manager = window.ChatSuggestions.ContactContextManager || {};
        return manager.trimContactContext(text);
    }

    function saveContactContext(contextText) {
        this.refreshContactContext({ force: true });
        if (!this.contextStore || !this.currentContactKey) return false;

        const trimmed = this.trimContactContext(contextText);
        const ok = this.contextStore.set(this.currentContactKey, {
            name: this.currentContactName || this.extractOtherPersonName(),
            context: trimmed,
        });
        if (ok) {
            this.currentContactContextText = trimmed;
            if (
                this.ui &&
                typeof this.ui.setContactContextState === 'function'
            ) {
                this.ui.setContactContextState({
                    hasContext: Boolean(trimmed),
                });
            }
        }
        return ok;
    }

    function clearContactContext() {
        this.refreshContactContext({ force: true });
        if (!this.contextStore || !this.currentContactKey) return false;
        const ok = this.contextStore.clear(this.currentContactKey);
        if (ok) {
            this.currentContactContextText = '';
            if (
                this.ui &&
                typeof this.ui.setContactContextState === 'function'
            ) {
                this.ui.setContactContextState({ hasContext: false });
            }
        }
        return ok;
    }

    function getCurrentContactContextForPrompt() {
        this.refreshContactContext();
        const manager = window.ChatSuggestions.ContactContextManager || {};
        return manager.getCurrentContactContextForPrompt({
            currentContactContextText: this.currentContactContextText || '',
        });
    }

    const api = {
        clearContactContext,
        extractContactKey,
        extractContactKeyFromUrl,
        extractWhatsAppContactKey,
        getContactContextMeta,
        getCurrentContactContextForPrompt,
        normalizeContactKey,
        refreshContactContext,
        saveContactContext,
        trimContactContext,
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
    root.window.ChatSuggestions.ChatControllerContextHelpers = api;
})();
