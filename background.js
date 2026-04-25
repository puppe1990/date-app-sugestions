chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'CHAT_SUGGESTIONS_FETCH') {
        return false;
    }

    const url = String(message.url || '');
    const options = message.options || {};

    (async () => {
        try {
            const response = await fetch(url, options);
            const raw = await response.text();
            let data = null;

            try {
                data = raw ? JSON.parse(raw) : null;
            } catch (e) {
                data = null;
            }

            if (!response.ok) {
                const errorText =
                    data?.error?.message || raw || response.statusText;
                sendResponse({
                    ok: false,
                    status: response.status,
                    errorText,
                });
                return;
            }

            sendResponse({
                ok: true,
                status: response.status,
                data,
            });
        } catch (error) {
            sendResponse({
                ok: false,
                status: 0,
                errorText: error?.message || 'Failed to fetch',
            });
        }
    })();

    return true;
});
