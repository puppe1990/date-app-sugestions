(() => {
    const root = window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('badoo', {
        chatContainerSelector: '.csms-chat-messages',
        inputSelector: '#chat-composer-input-message',
        uiPlacement: 'inline',
        messageReaderConfig: null
    });
})();
