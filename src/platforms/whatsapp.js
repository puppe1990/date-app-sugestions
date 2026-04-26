(() => {
    const root = (window.ChatSuggestions = window.ChatSuggestions || {});
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;
    const whatsappTextSelector =
        'span[data-testid="selectable-text"], span.selectable-text.copyable-text span';
    const whatsappRootSelector =
        'div[data-testid="msg-container"], div.message-in, div.message-out';
    const whatsappFallbackRootSelector =
        'div.copyable-text[data-pre-plain-text], div[data-pre-plain-text]';
    const whatsappAnyRootSelector = `${whatsappRootSelector}, ${whatsappFallbackRootSelector}`;

    function shouldIgnoreFallbackText(text) {
        const normalized = String(text || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!normalized) return true;
        if (/^\d{1,2}:\d{2}$/.test(normalized)) return true;
        return normalized.startsWith(
            'Você recebeu uma mensagem de visualização única.',
        );
    }

    function findAncestorRoot(node) {
        const closestRoot = node?.closest?.(whatsappAnyRootSelector) || null;
        if (closestRoot && closestRoot !== node) {
            return closestRoot;
        }
        const parent = node?.parentElement || node?.parentNode || null;
        if (!parent || typeof parent.closest !== 'function') return null;
        return parent.closest(whatsappAnyRootSelector);
    }

    registry.register('whatsapp', {
        chatContainerSelector: 'body',
        inputSelector:
            '#main footer [contenteditable="true"][data-lexical-editor="true"], #main footer [role="textbox"][contenteditable="true"], #main footer [contenteditable="true"], #main footer [contenteditable="true"][data-tab], #main footer [role="textbox"], #main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.xjbqb8w.x1wiwyrm.xquzyny.xvc5jky.x11t971q.xnpuxes.copyable-area > div > span > div > div > div [contenteditable="true"]',
        uiPlacement: 'floating',
        otherPersonNameSelector:
            '#main header span[title], header span[title], #pane-side [role="row"][aria-selected="true"] span[title], #pane-side [aria-selected="true"] span[title], #pane-side > div:nth-child(2) > div > div > div:nth-child(1) > div > div > div > div._ak8l._ap1_ > div._ak8o > div._ak8q > div > div > span',
        profileContainerSelector: '#main header',
        messageReaderConfig: {
            messageSelector: whatsappRootSelector,
            fallbackMessageSelector: whatsappFallbackRootSelector,
            textSelector: whatsappTextSelector,
            senderSelector: null,
            allowTextContentFallback: false,
            nodeFilter: (node) => {
                try {
                    if (!node) return false;
                    const parentMessage = findAncestorRoot(node);
                    if (parentMessage) {
                        return false;
                    }
                    const hasText =
                        node.querySelector(whatsappTextSelector) ||
                        node.getAttribute?.('data-pre-plain-text') ||
                        (node.textContent && node.textContent.trim());
                    if (hasText) return true;
                    return typeof node.getClientRects === 'function'
                        ? node.getClientRects().length > 0
                        : true;
                } catch (e) {
                    return true;
                }
            },
            textResolver: (node) => {
                try {
                    if (
                        node &&
                        node.matches &&
                        node.matches(whatsappTextSelector) &&
                        node.textContent
                    ) {
                        return node.textContent.trim();
                    }
                    const textEl = node.querySelector(whatsappTextSelector);
                    if (textEl && textEl.textContent) {
                        return textEl.textContent.trim();
                    }
                    if (
                        node &&
                        node.getAttribute &&
                        node.getAttribute('data-pre-plain-text') &&
                        node.textContent
                    ) {
                        const fallback = String(node.textContent || '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        if (shouldIgnoreFallbackText(fallback)) {
                            return '';
                        }
                        return fallback;
                    }
                } catch (e) {
                    // Ignora
                }
                return '';
            },
            senderResolver: (node) => {
                try {
                    const plain =
                        node?.getAttribute?.('data-pre-plain-text') ||
                        node
                            ?.querySelector?.('[data-pre-plain-text]')
                            ?.getAttribute?.('data-pre-plain-text') ||
                        '';
                    const match = plain.match(/\]\s*([^:]+):/);
                    if (match && match[1]) return match[1].trim();
                } catch (e) {
                    // Ignora
                }
                return '';
            },
            directionResolver: (node) => {
                try {
                    const cls = node && node.classList ? node.classList : null;
                    if (cls && cls.contains('message-out')) return 'out';
                    if (cls && cls.contains('message-in')) return 'in';
                    const outWrap =
                        node && node.closest
                            ? node.closest('div.message-out')
                            : null;
                    if (outWrap) return 'out';
                    const inWrap =
                        node && node.closest
                            ? node.closest('div.message-in')
                            : null;
                    if (inWrap) return 'in';
                    return '';
                } catch (e) {
                    return '';
                }
            },
        },
    });
})();
