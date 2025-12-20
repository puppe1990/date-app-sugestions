(() => {
    const root = window.ChatSuggestions = window.ChatSuggestions || {};
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('tinder', {
        chatContainerSelector: '[id^="SC.chat_"], [role="log"], main [role="log"], [data-testid="chatMessageList"]',
        inputSelector: 'textarea, [role="textbox"], [contenteditable="true"], [data-testid="chatInput"]',
        uiPlacement: 'overlay',
        profileContainerSelector: '#main-content > div.H\\(100\\%\\) > div > div > div > div > div.BdStart.Bdc\\(\\$c-ds-divider-primary\\).Fxg\\(0\\).Fxs\\(0\\).Fxb\\(1\\/3\\).Miw\\(325px\\).Maw\\(640px\\).D\\(n\\)--m > div > div > div',
        otherPersonNameSelector: '#main-content > div.H\\(100\\%\\) > div > div > div > div > div.BdStart.Bdc\\(\\$c-ds-divider-primary\\).Fxg\\(0\\).Fxs\\(0\\).Fxb\\(1\\/3\\).Miw\\(325px\\).Maw\\(640px\\).D\\(n\\)--m > div > div > div > div.D\\(f\\).Ai\\(c\\).M\\(16px\\) > div > div.Ov\\(h\\).Ws\\(nw\\).Ell > h1 > span.Pend\\(8px\\)',
        messageReaderConfig: {
            messageSelector: '[role="article"]',
            textSelector: 'span.text',
            senderSelector: null,
            allowTextContentFallback: true,
            textResolver: (node) => {
                try {
                    const textEl = node.querySelector('span.text');
                    if (textEl && textEl.textContent) {
                        return textEl.textContent;
                    }
                } catch (e) {
                    // Ignora
                }
                return '';
            },
            directionResolver: (node) => {
                try {
                    const cls = (node && node.className) ? String(node.className) : '';
                    if (cls.includes('Ta(e)')) return 'out';
                    if (cls.includes('Ta(start)')) return 'in';
                    const rect = node.getBoundingClientRect();
                    const mid = rect.left + rect.width / 2;
                    return mid > (window.innerWidth / 2) ? 'out' : 'in';
                } catch (e) {
                    return '';
                }
            }
        }
    });
})();
