(() => {
    const root = window.ChatSuggestions = window.ChatSuggestions || {};
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('instagram', {
        chatContainerSelector: 'main [role="log"], main',
        inputSelector: 'main form textarea, main form [contenteditable="true"], main [role="textbox"][contenteditable="true"], main [contenteditable="true"][role="textbox"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]',
        uiPlacement: 'overlay',
        profileContainerSelector: 'main header, header',
        otherPersonNameSelector: 'h2 span[title], main header span[title], header span[title], header h1, header h2, header [dir="auto"]',
        messageReaderFactory: () => window.ChatSuggestions?.createInstagramMessageReader?.({
            domReaderConfig: {
                messageSelector: 'div[role="listitem"]',
                textSelector: 'span[dir="auto"], div[dir="auto"]',
                senderSelector: null,
                allowTextContentFallback: true,
                textResolver: (node) => {
                    try {
                        const textEl = node.querySelector('span[dir="auto"], div[dir="auto"]');
                        if (textEl && textEl.textContent) return textEl.textContent;
                    } catch (e) {
                        // Ignora
                    }
                    return '';
                },
                directionResolver: (node) => {
                    try {
                        const rect = node.getBoundingClientRect();
                        const mid = rect.left + rect.width / 2;
                        return mid > (window.innerWidth / 2) ? 'out' : 'in';
                    } catch (e) {
                        return '';
                    }
                }
            }
        })
    });
})();
