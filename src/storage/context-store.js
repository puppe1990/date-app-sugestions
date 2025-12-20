(() => {
    class ContextStore {
        constructor({ prefix = 'bcs_contact_context_v1', debug = false } = {}) {
            this.prefix = prefix || 'bcs_contact_context_v1';
            this.debug = Boolean(debug);
        }

        buildKey(contactKey) {
            const key = String(contactKey || '').trim();
            if (!key) return '';
            return `${this.prefix}::${key}`;
        }

        safeParse(json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        }

        get(contactKey) {
            const storageKey = this.buildKey(contactKey);
            if (!storageKey) return null;
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return null;
                const data = this.safeParse(raw);
                if (!data || typeof data !== 'object') return null;
                return {
                    name: typeof data.name === 'string' ? data.name : '',
                    context: typeof data.context === 'string' ? data.context : '',
                    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0
                };
            } catch (e) {
                return null;
            }
        }

        set(contactKey, { name = '', context = '' } = {}) {
            const storageKey = this.buildKey(contactKey);
            if (!storageKey) return false;
            const payload = {
                name: String(name || '').trim(),
                context: String(context || ''),
                updatedAt: Date.now()
            };
            try {
                localStorage.setItem(storageKey, JSON.stringify(payload));
                if (this.debug) {
                    console.info('[Chat Suggestions][ContextStore] Contexto salvo', {
                        contactKey,
                        chars: payload.context.length
                    });
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        clear(contactKey) {
            const storageKey = this.buildKey(contactKey);
            if (!storageKey) return false;
            try {
                localStorage.removeItem(storageKey);
                if (this.debug) {
                    console.info('[Chat Suggestions][ContextStore] Contexto removido', { contactKey });
                }
                return true;
            } catch (e) {
                return false;
            }
        }
    }

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.ContextStore = ContextStore;
})();
