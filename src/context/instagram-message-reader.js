(() => {
    const host = (location.hostname || '').toLowerCase();
    if (!host.includes('instagram.com')) return;

    window.__bcsInstagramReaderLoaded = true;

    const state = window.BadooChatSuggestionsInstagramState || {
        threads: [],
        lastThreadId: '',
        lastMessages: [],
        lastUpdatedAt: 0
    };
    window.BadooChatSuggestionsInstagramState = state;

    const normalizeText = (value) => {
        if (!value) return '';
        return String(value).replace(/\s+/g, ' ').trim();
    };

    const normalizeMessageText = (value) => {
        const text = normalizeText(value);
        if (!text) return '';
        if (text.toLowerCase() === 'enter') return '';
        return text.replace(/(\s+Enter)+$/i, '').trim();
    };

    const getOtherPersonNameFromDom = () => {
        try {
            const headingTitle = document.querySelector('h2 span[title]') ||
                document.querySelector('main header span[title]') ||
                document.querySelector('header span[title]');
            if (headingTitle) {
                const text = headingTitle.getAttribute('title') || headingTitle.textContent || '';
                const normalized = normalizeText(text);
                if (normalized) return normalized;
            }

            const conversationHeader = document.querySelector('[aria-label*="Conversation"]') ||
                document.querySelector('[aria-label*="Conversa"]');
            if (conversationHeader) {
                const ariaLabel = conversationHeader.getAttribute('aria-label') || '';
                const normalized = normalizeText(ariaLabel.replace(/Conversation with/i, ''));
                if (normalized) return normalized;
            }

            const usernameCandidates = Array.from(document.querySelectorAll('span.x1lliihq.x193iq5w'));
            for (const el of usernameCandidates) {
                const text = normalizeText(el.textContent || '');
                if (text.includes('_') || text.match(/^[a-z0-9_.]+$/i)) {
                    return text;
                }
            }

            return '';
        } catch (e) {
            return '';
        }
    };

    const OUTGOING_CLASS_HINTS = [
        'x11jlvup',
        'xpmdkuv',
        'xrmkrer',
        'x12z03op',
        'x1ybe9c6',
        'xx487zo'
    ];

    const INCOMING_CLASS_HINTS = [
        'x1xr0vuk',
        'x1jm4cbz',
        'x114wg8e',
        'xrrpcnn',
        'x19livfd',
        'x1h2krnu'
    ];

    const isGraphqlUrl = (resource) => {
        if (!resource) return false;
        if (typeof resource === 'string') return resource.includes('graphql');
        if (resource.url) return resource.url.includes('graphql');
        return false;
    };

    const extractThreadsFromPayload = (payload) => {
        const threads = [];
        const seen = new Set();
        const walk = (node) => {
            if (!node || typeof node !== 'object') return;
            if (seen.has(node)) return;
            seen.add(node);

            if (node.ig_dm_thread_v2 && typeof node.ig_dm_thread_v2 === 'object') {
                threads.push(node.ig_dm_thread_v2);
            }
            if (Array.isArray(node.threads)) {
                node.threads.forEach(thread => threads.push(thread));
            }
            if (Array.isArray(node.items) && (node.thread_id || node.threadId)) {
                threads.push(node);
            }
            Object.values(node).forEach(value => walk(value));
        };
        walk(payload);
        return threads;
    };

    const normalizeId = (value) => (value === null || value === undefined ? '' : String(value));

    const getThreadId = (thread) => normalizeId(thread?.thread_id || thread?.threadId || '');

    const getActiveThreadIdFromUrl = () => {
        try {
            const path = String(location.pathname || '');
            const match = path.match(/\/direct\/t\/([^/]+)/);
            return match ? normalizeId(match[1]) : '';
        } catch (e) {
            return '';
        }
    };

    const findLatestTimestamp = (items = []) => {
        let latest = 0;
        items.forEach(item => {
            const ts = Number(item?.timestamp || item?.time || 0);
            if (ts > latest) latest = ts;
        });
        return latest;
    };

    const pickBestThread = (threads = []) => {
        let best = null;
        let bestScore = -Infinity;
        threads.forEach(thread => {
            const items = Array.isArray(thread?.items) ? thread.items : [];
            if (!items.length) return;
            const latest = findLatestTimestamp(items);
            const score = latest || items.length;
            if (score > bestScore) {
                bestScore = score;
                best = thread;
            }
        });
        return best;
    };

    const pickThreadForActiveChat = (threads = []) => {
        const activeThreadId = getActiveThreadIdFromUrl();
        if (!activeThreadId) return null;
        return threads.find(thread => normalizeId(getThreadId(thread)) === activeThreadId) || null;
    };

    const buildMessageFromItem = (item, thread) => {
        const text = normalizeMessageText(item?.text || item?.message || '');
        if (!text) return null;

        const isOutgoing = typeof item?.is_sent_by_viewer === 'boolean'
            ? item.is_sent_by_viewer
            : Boolean(thread?.viewer_id && (item?.user_id === thread.viewer_id || item?.sender_id === thread.viewer_id));

        const senderName = isOutgoing
            ? 'Voce'
            : (item?.user?.username ||
                item?.sender?.username ||
                item?.sender?.full_name ||
                getOtherPersonNameFromDom() ||
                'Outro');

        return {
            sender: senderName,
            text,
            direction: isOutgoing ? 'out' : 'in',
            type: 'text'
        };
    };

    const updateStateFromThread = (thread) => {
        if (!thread || !Array.isArray(thread.items)) return;

        let items = thread.items.slice();
        if (items.length > 1) {
            const firstTs = Number(items[0]?.timestamp || 0);
            const lastTs = Number(items[items.length - 1]?.timestamp || 0);
            if (firstTs && lastTs && firstTs > lastTs) {
                items.reverse();
            }
        }

        const seenIds = new Set();
        const messages = [];
        items.forEach(item => {
            const id = item?.item_id || item?.client_context || item?.timestamp || '';
            if (id && seenIds.has(id)) return;
            if (id) seenIds.add(id);
            const parsed = buildMessageFromItem(item, thread);
            if (parsed) messages.push(parsed);
        });

        if (!messages.length) return;

        state.lastThreadId = getThreadId(thread);
        state.lastMessages = messages;
        state.lastUpdatedAt = Date.now();
    };

    if (!window.__bcsInstagramFetchIntercepted && typeof window.fetch === 'function') {
        window.__bcsInstagramFetchIntercepted = true;
        const originalFetch = window.fetch;

        window.fetch = function (...args) {
            const [resource] = args;
            if (isGraphqlUrl(resource)) {
                return originalFetch.apply(this, args).then(response => {
                    const clonedResponse = response.clone();
                    clonedResponse.json().then(data => {
                        try {
                            const threads = extractThreadsFromPayload(data?.data || data);
                            const activeThread = pickThreadForActiveChat(threads);
                            const selectedThread = activeThread || pickBestThread(threads);
                            if (!selectedThread) return;

                            updateStateFromThread(selectedThread);
                            state.threads = threads.slice(-10);
                        } catch (e) {
                            // Ignora erros de parse
                        }
                    }).catch(() => {
                        // Ignora erros de parse
                    });
                    return response;
                });
            }
            return originalFetch.apply(this, args);
        };

    }

    class InstagramMessageReader {
        constructor({ domReaderConfig = {} } = {}) {
            this.domReader = new window.BadooChatSuggestions.MessageReader({
                allowTextContentFallback: true,
                ...domReaderConfig
            });
            this.config = this.domReader.config;
            this.cachedOtherPersonName = '';
        }

        read(container) {
            const captured = Array.isArray(state.lastMessages) ? state.lastMessages : [];
            if (captured.length) return captured.slice(-40);
            const domMessages = this.readFromDom(container);
            return domMessages;
        }

        readFromDom(container) {
            const root = container || document;
            const logContainer = root.querySelector
                ? (root.querySelector('main [role="log"]') || root.querySelector('[role="log"]'))
                : null;
            const containerRect = logContainer && logContainer.getBoundingClientRect
                ? logContainer.getBoundingClientRect()
                : null;
            const target = logContainer || root;
            const selectors = [
                'div[role="row"]',
                'div[role="listitem"]',
                'article div[role="presentation"]'
            ];

            const seen = new Set();
            const nodes = [];
            selectors.forEach(selector => {
                try {
                    target.querySelectorAll(selector).forEach(node => {
                        if (!node || seen.has(node)) return;
                        if (node.closest && node.closest('form')) return;
                        seen.add(node);
                        nodes.push(node);
                    });
                } catch (e) {
                    // Ignora seletor invalido
                }
            });

            if (!nodes.length) {
                return this.domReader.read(container);
            }

            const messages = nodes
                .map(node => this.parseDomNode(node, containerRect))
                .filter(Boolean);

            return messages.length ? messages.slice(-40) : this.domReader.read(container);
        }

        parseDomNode(node, containerRect) {
            const textParts = [];
            const candidates = node.querySelectorAll('span[dir="auto"], div[dir="auto"]');
            candidates.forEach(el => {
                if (!el) return;
                if (el.querySelector && el.querySelector('span[dir="auto"], div[dir="auto"]')) return;
                const text = normalizeMessageText(el.textContent || '');
                if (!text) return;
                if (this.isSystemText(text)) return;
                textParts.push(text);
            });

            const text = normalizeMessageText(textParts.join(' '));
            if (!text) return null;

            const { direction } = this.resolveDomDirection(node, containerRect);
            const otherPersonName = this.getOtherPersonName();

            return {
                sender: direction === 'out' ? 'Voce' : (otherPersonName || 'Outro'),
                text,
                direction,
                type: 'text'
            };
        }

        getOtherPersonName() {
            const name = getOtherPersonNameFromDom();
            if (name) this.cachedOtherPersonName = name;
            return this.cachedOtherPersonName;
        }

        resolveDomDirection(node, containerRect) {
            const directionFromClass = this.resolveDirectionFromClass(node);
            if (directionFromClass) {
                return { direction: directionFromClass, source: 'class' };
            }

            const bubble = node.querySelector('span[dir="auto"], div[dir="auto"]') || node;
            const bubbleStyle = bubble && window.getComputedStyle ? window.getComputedStyle(bubble) : null;
            if (bubbleStyle) {
                if (bubbleStyle.marginLeft === 'auto') return { direction: 'out', source: 'margin-left' };
                if (bubbleStyle.marginRight === 'auto') return { direction: 'in', source: 'margin-right' };
            }

            let el = node;
            for (let i = 0; i < 6 && el; i += 1) {
                if (!window.getComputedStyle) break;
                const style = window.getComputedStyle(el);
                if (style && style.display && style.display.includes('flex')) {
                    const justify = (style.justifyContent || '').toLowerCase();
                    const align = (style.alignItems || '').toLowerCase();
                    if (justify.includes('flex-end') || justify.includes('end')) {
                        return { direction: 'out', source: 'flex-justify' };
                    }
                    if (justify.includes('flex-start') || justify.includes('start')) {
                        return { direction: 'in', source: 'flex-justify' };
                    }
                    if (align.includes('flex-end') || align.includes('end')) {
                        return { direction: 'out', source: 'flex-align' };
                    }
                    if (align.includes('flex-start') || align.includes('start')) {
                        return { direction: 'in', source: 'flex-align' };
                    }
                }
                el = el.parentElement;
            }

            try {
                const rect = node.getBoundingClientRect();
                const base = containerRect || { left: 0, width: window.innerWidth };
                const mid = rect.left + rect.width / 2;
                const center = base.left + (base.width / 2);
                return { direction: mid > center ? 'out' : 'in', source: 'rect' };
            } catch (e) {
                return { direction: '', source: 'unknown' };
            }
        }

        resolveDirectionFromClass(node) {
            const hasClass = (element, className) => {
                try {
                    return element && element.classList && element.classList.contains(className);
                } catch (e) {
                    return false;
                }
            };

            const hasDescendantWithClass = (element, className) => {
                try {
                    return Boolean(element && element.querySelector && element.querySelector(`.${className}`));
                } catch (e) {
                    return false;
                }
            };

            const matchesAny = (element, classList) => {
                for (const className of classList) {
                    if (hasClass(element, className)) return true;
                    if (hasDescendantWithClass(element, className)) return true;
                }
                return false;
            };

            let current = node;
            for (let i = 0; i < 6 && current; i += 1) {
                if (matchesAny(current, OUTGOING_CLASS_HINTS)) return 'out';
                if (matchesAny(current, INCOMING_CLASS_HINTS)) return 'in';
                current = current.parentElement;
            }

            return '';
        }

        isSystemText(text) {
            const lower = text.toLowerCase();
            if (!lower) return true;
            if (lower === 'seen' || lower === 'sent' || lower === 'delivered') return true;
            if (lower.includes('message request')) return true;
            if (lower.match(/^\d{1,2}:\d{2}\s?(am|pm)?$/i)) return true;
            return false;
        }
    }

    function createInstagramMessageReader(options) {
        return new InstagramMessageReader(options);
    }

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.InstagramMessageReader = InstagramMessageReader;
    window.BadooChatSuggestions.createInstagramMessageReader = createInstagramMessageReader;
})();
