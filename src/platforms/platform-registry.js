(() => {
    const root = window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    const registry = {};

    const register = (platform, defaults) => {
        if (!platform || !defaults) return;
        registry[platform] = defaults;
    };

    const getDefaults = (platform) => {
        return registry[platform] || null;
    };

    root.PlatformRegistry = {
        register,
        getDefaults
    };
})();
