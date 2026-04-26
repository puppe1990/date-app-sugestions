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

    function getProfileTriggerSelectors() {
        return [
            '#page-container .mini-profile__user-info',
            '.mini-profile__user-info',
            '[data-qa="mini-profile-user-info"]',
            '[data-qa="mini-profile"] .mini-profile__user-info',
        ];
    }

    function getProfileTextSelectors(profileContainerSelector) {
        return [
            profileContainerSelector,
            '.mini-profile__user-info',
            '[data-qa="mini-profile-user-info"]',
            '#main-content [data-testid="profileCard"]',
            '#main-content [data-testid="profile"]',
        ].filter(Boolean);
    }

    function getOtherPersonNameSelectors(otherPersonNameSelector) {
        return [
            otherPersonNameSelector,
            '.navigation-profile .csms-profile-info__name-inner',
            '.navigation-profile .csms-a11y-visually-hidden',
            '[data-qa="profile-info__name"] .csms-profile-info__name-inner',
            '.csms-profile-info__name-inner',
            '[data-qa="profile-info__name"]',
            '[data-qa="mini-profile-user-info__heading"] [data-qa="profile-info__name"]',
        ]
            .filter(Boolean)
            .flatMap((selector) =>
                String(selector)
                    .split(',')
                    .map((item) => item.trim()),
            )
            .filter(Boolean);
    }

    function resetProfileCache(controller) {
        controller.cachedOtherPersonProfileText = '';
        controller.cachedOtherPersonProfileUpdatedAt = 0;
        controller.cachedOtherPersonProfileName = '';
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
        getProfileTriggerSelectors,
        getProfileTextSelectors,
        getOtherPersonNameSelectors,
        resetProfileCache,
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
