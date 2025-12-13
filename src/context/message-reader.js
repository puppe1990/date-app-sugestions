(() => {
    class MessageReader {
        constructor(config = {}) {
            this.config = {
                messageSelector: '[data-qa="chat-message"]',
                textSelector: '.csms-chat-message-content-text__message',
                audioSelector: '[data-qa-message-content-type="audio"]',
                senderSelector: '.csms-a11y-visually-hidden',
                directionAttr: 'data-qa-message-direction',
                directionInValue: 'in',
                directionOutValue: 'out',
                fallbackSenderOut: 'Você',
                fallbackSenderIn: 'Outro',
                allowTextContentFallback: false,
                ...config
            };
        }

        read(container) {
            if (!container) return [];
            let nodes = Array.from(container.querySelectorAll(this.config.messageSelector));
            if (typeof this.config.nodeFilter === 'function') {
                nodes = nodes.filter(node => {
                    try {
                        return Boolean(this.config.nodeFilter(node));
                    } catch (e) {
                        return true;
                    }
                });
            }
            return nodes
                .map(node => this.parseMessage(node))
                .filter(Boolean);
        }

        parseMessage(node) {
            const rawDirection = this.resolveDirection(node);
            const direction = this.normalizeDirection(rawDirection);
            const contentText = this.config.textSelector ? node.querySelector(this.config.textSelector) : null;
            const audioButton = node.querySelector(this.config.audioSelector);

            const sender = this.getSender(node, direction);

            const textFromResolver = this.resolveText(node);
            if (textFromResolver) {
                return {
                    sender,
                    text: textFromResolver,
                    direction,
                    type: 'text'
                };
            }

            if (contentText) {
                const text = contentText.textContent.trim();
                return {
                    sender,
                    text,
                    direction,
                    type: 'text'
                };
            }

            if (audioButton) {
                return {
                    sender,
                    text: 'Mensagem de voz',
                    direction,
                    type: 'audio'
                };
            }

            return null;
        }

        resolveText(node) {
            if (typeof this.config.textResolver === 'function') {
                const text = this.config.textResolver(node);
                if (typeof text === 'string' && text.trim()) {
                    return text.trim();
                }
            }

            if (this.config.allowTextContentFallback) {
                const text = (node && node.textContent) ? node.textContent.trim() : '';
                if (text) {
                    return text.replace(/\s+/g, ' ').trim();
                }
            }

            return '';
        }

        resolveDirection(node) {
            if (typeof this.config.directionResolver === 'function') {
                return this.config.directionResolver(node);
            }
            return node.getAttribute(this.config.directionAttr) || '';
        }

        normalizeDirection(rawDirection) {
            if (!rawDirection) return '';
            if (rawDirection === this.config.directionOutValue) return 'out';
            if (rawDirection === this.config.directionInValue) return 'in';
            return rawDirection;
        }

        getSender(node, direction) {
            const senderElement = this.config.senderSelector ? node.querySelector(this.config.senderSelector) : null;
            if (senderElement && senderElement.textContent) {
                return senderElement.textContent;
            }
            return direction === this.config.directionOutValue ? this.config.fallbackSenderOut : this.config.fallbackSenderIn;
        }
    }

    function createDefaultMessageReader() {
        return new MessageReader();
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.MessageReader = MessageReader;
    window.BadooChatSuggestions.createDefaultMessageReader = createDefaultMessageReader;
    window.BadooChatSuggestions.createBadooMessageReader = createDefaultMessageReader;
})();
