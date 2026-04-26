(() => {
    function buildConversationEntries({
        messages,
        otherPersonName,
        maxMessages,
    }) {
        return messages
            .slice(-maxMessages)
            .map((message) => {
                const text = String(message?.text || '').trim();
                if (!text) return null;
                const senderName =
                    message.sender &&
                    !['Outro', 'OUTRA PESSOA'].includes(message.sender)
                        ? message.sender
                        : otherPersonName || 'OUTRA PESSOA';
                const dir = message.direction === 'out' ? 'EU' : senderName;
                return { dir, text };
            })
            .filter(Boolean);
    }

    function renderConversationEntries(entries) {
        return entries
            .map((entry, index) => `${index + 1}. ${entry.dir}: ${entry.text}`)
            .join('\n');
    }

    function buildConversationCopyText({
        messages,
        otherPersonName,
        maxMessages = 40,
        maxChars = 2400,
    }) {
        if (!messages.length) return '';

        const entries = buildConversationEntries({
            messages,
            otherPersonName,
            maxMessages,
        });
        if (!entries.length) return '';

        let startIndex = 0;
        let joined = renderConversationEntries(entries);
        while (joined.length > maxChars && startIndex < entries.length - 1) {
            startIndex += 1;
            joined = renderConversationEntries(entries.slice(startIndex));
        }

        return joined.trim();
    }

    function buildClipboardPayload({ profileText, conversationText }) {
        const parts = [];
        if (profileText) {
            parts.push(`Perfil da outra pessoa:\n${profileText}`);
        }
        if (conversationText) {
            parts.push(`Conversa:\n${conversationText}`);
        }
        return parts.join('\n\n').trim();
    }

    function getCopyProfileErrorMessage(platform) {
        return platform === 'badoo'
            ? 'Abra o perfil da pessoa e tente novamente'
            : 'Perfil não encontrado na página';
    }

    const api = {
        buildConversationCopyText,
        buildClipboardPayload,
        getCopyProfileErrorMessage,
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
    root.window.ChatSuggestions.ChatCopyHelpers = api;
})();
