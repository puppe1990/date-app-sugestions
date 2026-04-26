(() => {
    function normalizeContactKey(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const safe = raw.replace(/[^a-zA-Z0-9:_-]/g, '_');
        return safe.length > 160 ? safe.slice(0, 160) : safe;
    }

    function buildContactKeyFromUrl({ href, platform }) {
        try {
            const url = new URL(href);
            const path = String(url.pathname || '');
            const safePlatform = String(platform || '').trim() || 'chat';

            const patterns = [
                /\/messages\/([^/?#]+)/i,
                /\/app\/messages\/([^/?#]+)/i,
            ];

            for (const pattern of patterns) {
                const match = path.match(pattern);
                if (match && match[1]) {
                    return normalizeContactKey(`${safePlatform}:${match[1]}`);
                }
            }

            const hash = String(url.hash || '')
                .replace(/^#/, '')
                .trim();
            if (hash) {
                return normalizeContactKey(`${safePlatform}:hash:${hash}`);
            }

            return normalizeContactKey(`${safePlatform}:${path}`);
        } catch (error) {
            return '';
        }
    }

    function buildWhatsAppContactKey({ document }) {
        try {
            const selected = document.querySelector(
                '#pane-side [role="row"][aria-selected="true"], #pane-side [aria-selected="true"][role="listitem"], #pane-side [aria-selected="true"]',
            );
            if (!selected) return '';

            const dataId = String(
                selected.getAttribute('data-id') ||
                    (selected.dataset ? selected.dataset.id : '') ||
                    '',
            ).trim();
            if (dataId) return normalizeContactKey(`whatsapp:chat:${dataId}`);

            const nestedWithId =
                selected.querySelector && selected.querySelector('[data-id]');
            const nestedId = nestedWithId
                ? String(nestedWithId.getAttribute('data-id') || '').trim()
                : '';
            if (nestedId)
                return normalizeContactKey(`whatsapp:chat:${nestedId}`);

            const nameEl = selected.querySelector('span[title]');
            const name =
                nameEl && nameEl.getAttribute
                    ? String(nameEl.getAttribute('title') || '').trim()
                    : '';
            if (name) return normalizeContactKey(`whatsapp:name:${name}`);

            return '';
        } catch (error) {
            return '';
        }
    }

    function trimContactContext(text) {
        const raw = String(text || '').trim();
        const maxChars = 4000;
        return raw.length > maxChars ? raw.slice(0, maxChars) : raw;
    }

    function getCurrentContactContextForPrompt({ currentContactContextText }) {
        return trimContactContext(currentContactContextText || '');
    }

    const api = {
        normalizeContactKey,
        buildContactKeyFromUrl,
        buildWhatsAppContactKey,
        trimContactContext,
        getCurrentContactContextForPrompt,
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
    root.window.ChatSuggestions.ContactContextManager = api;
})();
