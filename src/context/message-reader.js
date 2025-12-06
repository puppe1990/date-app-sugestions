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
                ...config
            };
        }

        read(container) {
            if (!container) return [];
            const nodes = Array.from(container.querySelectorAll(this.config.messageSelector));
            return nodes
                .map(node => this.parseMessage(node))
                .filter(Boolean);
        }

        parseMessage(node) {
            const rawDirection = this.resolveDirection(node);
            const direction = this.normalizeDirection(rawDirection);
            const contentText = node.querySelector(this.config.textSelector);
            const audioButton = node.querySelector(this.config.audioSelector);

            const sender = this.getSender(node, direction);

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

    function createBadooMessageReader() {
        return new MessageReader();
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.MessageReader = MessageReader;
    window.BadooChatSuggestions.createBadooMessageReader = createBadooMessageReader;
})();
