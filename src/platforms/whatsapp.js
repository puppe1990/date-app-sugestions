(() => {
    const root = window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('whatsapp', {
        chatContainerSelector: '#main',
        inputSelector: '#main footer [contenteditable="true"][data-lexical-editor="true"], #main footer [role="textbox"][contenteditable="true"], #main footer [contenteditable="true"], #main footer [contenteditable="true"][data-tab], #main footer [role="textbox"], #main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.xjbqb8w.x1wiwyrm.xquzyny.xvc5jky.x11t971q.xnpuxes.copyable-area > div > span > div > div > div [contenteditable="true"]',
        uiPlacement: 'floating',
        otherPersonNameSelector: '#pane-side [role="row"][aria-selected="true"] span[title], #pane-side [aria-selected="true"] span[title], #main header span[title], header span[title], #pane-side > div:nth-child(2) > div > div > div:nth-child(1) > div > div > div > div._ak8l._ap1_ > div._ak8o > div._ak8q > div > div > span',
        profileContainerSelector: '#main header',
        messageReaderConfig: {
            messageSelector: 'div.message-in, div.message-out',
            textSelector: 'span.selectable-text.copyable-text span',
            senderSelector: null,
            allowTextContentFallback: true,
            nodeFilter: (node) => {
                try {
                    return node && typeof node.getClientRects === 'function' && node.getClientRects().length > 0;
                } catch (e) {
                    return true;
                }
            },
            textResolver: (node) => {
                try {
                    const textEl = node.querySelector('span.selectable-text.copyable-text span');
                    if (textEl && textEl.textContent) return textEl.textContent;
                } catch (e) {
                    // Ignora
                }
                return '';
            },
            directionResolver: (node) => {
                try {
                    const cls = (node && node.classList) ? node.classList : null;
                    if (cls && cls.contains('message-out')) return 'out';
                    if (cls && cls.contains('message-in')) return 'in';
                    return '';
                } catch (e) {
                    return '';
                }
            }
        }
    });
})();
