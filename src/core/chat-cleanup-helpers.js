(() => {
    function disconnectAndNull(controller, key) {
        if (!controller[key]) return;
        controller[key].disconnect();
        controller[key] = null;
    }

    function clearTimer(controller, key, clearFn) {
        if (!controller[key]) return;
        clearFn(controller[key]);
        controller[key] = null;
    }

    function cleanupControllerState(controller, env) {
        disconnectAndNull(controller, 'chatObserver');
        disconnectAndNull(controller, 'platformObserver');
        disconnectAndNull(controller, 'profilePortalObserver');

        if (controller.profileClickHandler) {
            env.document.removeEventListener(
                'click',
                controller.profileClickHandler,
                true,
            );
            controller.profileClickHandler = null;
        }

        clearTimer(controller, 'messageCheckInterval', env.clearInterval);
        clearTimer(controller, 'periodicUpdateInterval', env.clearInterval);
        clearTimer(controller, 'updateTimeout', env.clearTimeout);
        clearTimer(controller, 'initRetryTimeout', env.clearTimeout);

        if (controller.ui) {
            controller.ui.destroy();
            controller.ui = null;
        }

        if (controller.boundStorageChange && env.chrome?.storage?.onChanged) {
            env.chrome.storage.onChanged.removeListener(
                controller.boundStorageChange,
            );
            controller.boundStorageChange = null;
        }

        controller.chatContainer = null;
        controller.contextExtractor = null;
        controller.suggestionEngine = null;
        controller.lastMessageCount = 0;
    }

    const api = {
        cleanupControllerState,
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
    root.window.ChatSuggestions.ChatCleanupHelpers = api;
})();
