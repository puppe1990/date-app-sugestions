(() => {
    const root = (window.ChatSuggestions = window.ChatSuggestions || {});
    const registry = root.PlatformRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('badoo', {
        chatContainerSelector: '.csms-chat-messages',
        inputSelector: '#chat-composer-input-message',
        uiPlacement: 'inline',
        messageReaderConfig: {
            messageSelector: '[data-qa="chat-message"]',
            fallbackMessageSelector:
                '[data-qa-message-direction], [data-message-id], [data-message], [role="article"], [class*="message"], [class*="bubble"]',
            textSelector: '.csms-chat-message-content-text__message',
            senderSelector: '.csms-a11y-visually-hidden',
            allowTextContentFallback: true,
            nodeFilter: (node) => {
                try {
                    if (!node) return false;
                    const text = node.textContent
                        ? node.textContent.trim()
                        : '';
                    const hasAudio = Boolean(
                        node.querySelector?.(
                            '[data-qa-message-content-type="audio"]',
                        ),
                    );
                    if (!text && !hasAudio) return false;
                    if (
                        node.querySelector?.('[data-qa="chat-message"]') &&
                        !node.matches?.('[data-qa="chat-message"]')
                    ) {
                        return false;
                    }
                    return true;
                } catch (e) {
                    return true;
                }
            },
            textResolver: (node) => {
                try {
                    const preferred = node.querySelector(
                        '.csms-chat-message-content-text__message, [data-qa-message-content-type="text"], [class*="text"], [dir="auto"]',
                    );
                    if (preferred && preferred.textContent) {
                        return preferred.textContent;
                    }
                } catch (e) {
                    // Ignora
                }
                return '';
            },
            directionResolver: (node) => {
                try {
                    const direct =
                        node.getAttribute?.('data-qa-message-direction') ||
                        node.getAttribute?.('data-message-direction') ||
                        node.dataset?.qaMessageDirection ||
                        node.dataset?.messageDirection ||
                        '';
                    if (direct) return direct;

                    const cls = String(node.className || '');
                    if (
                        /\bout\b/i.test(cls) ||
                        /\bsent\b/i.test(cls) ||
                        /\bself\b/i.test(cls)
                    ) {
                        return 'out';
                    }
                    if (/\bin\b/i.test(cls) || /\breceived\b/i.test(cls)) {
                        return 'in';
                    }

                    if (typeof node.getBoundingClientRect === 'function') {
                        const rect = node.getBoundingClientRect();
                        const mid = rect.left + rect.width / 2;
                        return mid > window.innerWidth / 2 ? 'out' : 'in';
                    }
                } catch (e) {
                    return '';
                }
                return '';
            },
        },
    });
})();
