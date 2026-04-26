(() => {
    function getEffectivePlatform({ platform, hostname }) {
        if (platform) return platform;
        return String(hostname || '').includes('whatsapp.com')
            ? 'whatsapp'
            : null;
    }

    function hasPlatformConversationChange(mutations) {
        return mutations.some((mutation) => {
            if (
                mutation.type === 'attributes' &&
                mutation.attributeName === 'aria-selected'
            ) {
                const target = mutation.target;
                return (
                    target &&
                    target.getAttribute &&
                    target.getAttribute('aria-selected') === 'true'
                );
            }

            return (
                mutation.type === 'childList' &&
                (mutation.addedNodes.length || mutation.removedNodes.length)
            );
        });
    }

    function isMessageNode(node, messageSelector) {
        if (!node || node.nodeType !== 1) return false;
        if (node.matches && node.matches(messageSelector)) return true;
        return Boolean(
            node.querySelector && node.querySelector(messageSelector),
        );
    }

    function hasNewMessageMutation({ mutations, messageSelector }) {
        return mutations.some((mutation) => {
            if (mutation.type !== 'childList') return false;
            return Array.from(mutation.addedNodes || []).some((node) =>
                isMessageNode(node, messageSelector),
            );
        });
    }

    const api = {
        getEffectivePlatform,
        hasPlatformConversationChange,
        hasNewMessageMutation,
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
    root.window.ChatSuggestions.ChatObserverHelpers = api;
})();
