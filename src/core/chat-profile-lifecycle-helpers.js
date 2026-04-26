(() => {
    function shouldSetupProfileCapture({
        platform,
        hasObserver,
        hasClickHandler,
    }) {
        if (hasObserver || hasClickHandler) return false;
        if (platform && platform !== 'badoo') return false;
        return true;
    }

    function findProfileTrigger({ target, triggerSelectors }) {
        if (!target || !target.closest) return null;
        return triggerSelectors
            .map((selector) => target.closest(selector))
            .find(Boolean);
    }

    function buildProfileCacheState({ text, previousText, name, now }) {
        return {
            changed: text !== previousText,
            cache: {
                text,
                updatedAt: now,
                name: name || '',
            },
        };
    }

    function shouldStopProfileObserver({
        elapsed,
        timeoutMs,
        settledFor,
        cachedText,
    }) {
        const hasBio = String(cachedText || '').includes('Sobre mim:');
        return (
            elapsed > timeoutMs ||
            (cachedText && settledFor > 800 && (hasBio || elapsed > 1500))
        );
    }

    const api = {
        shouldSetupProfileCapture,
        findProfileTrigger,
        buildProfileCacheState,
        shouldStopProfileObserver,
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
    root.window.ChatSuggestions.ChatProfileLifecycleHelpers = api;
})();
