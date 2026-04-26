(() => {
    function normalizeSingleLineText(value) {
        return String(value || '')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function pickText(root, selector) {
        try {
            const el = root.querySelector(selector);
            const text =
                el && (el.textContent || el.innerText)
                    ? el.textContent || el.innerText
                    : '';
            return normalizeSingleLineText(text);
        } catch (error) {
            return '';
        }
    }

    function extractOtherPersonName({ document, selectors }) {
        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                let name =
                    el && (el.textContent || el.innerText)
                        ? (el.textContent || el.innerText).trim()
                        : '';
                if (!name) continue;
                name = name.replace(/\s+/g, ' ').trim();
                if (name.includes(',')) {
                    name = name.split(',')[0].trim();
                }
                if (name) return name;
            } catch (error) {
                // Ignore invalid selector
            }
        }
        return '';
    }

    function sanitizeProfileText({ raw, otherPersonName }) {
        const text = String(raw || '').trim();
        if (!text) return '';

        const normalized = text
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter(
                (line) =>
                    line &&
                    !/^abrir perfil$/i.test(line) &&
                    !/^educa[cç][aã]o$/i.test(line) &&
                    !/^conectados hoje$/i.test(line),
            );

        const unique = [];
        const seen = new Set();
        for (const line of normalized) {
            const key = line.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(line);
        }

        const ageMatch = text.match(/\b(\d{2})\b/);
        const merged = [];
        let insertedSummary = false;
        let hasLocation = false;

        for (const line of unique) {
            if (
                otherPersonName &&
                ageMatch &&
                !insertedSummary &&
                (line === otherPersonName || line === `, ${ageMatch[1]}`)
            ) {
                merged.push(`${otherPersonName}, ${ageMatch[1]} anos`);
                insertedSummary = true;
                continue;
            }
            if (
                /^profiss[aã]o:\s*s[aã]o paulo$/i.test(line) ||
                /^educa[cç][aã]o:\s*$/i.test(line)
            ) {
                continue;
            }
            if (/^s[aã]o paulo$/i.test(line)) {
                hasLocation = true;
            }
            if (
                otherPersonName &&
                /online agora|rolou uma conex[aã]o|curtiu voc[eê]/i.test(line)
            ) {
                if (!insertedSummary && ageMatch) {
                    merged.push(`${otherPersonName}, ${ageMatch[1]} anos`);
                    insertedSummary = true;
                }
                continue;
            }
            merged.push(line);
        }

        if (!hasLocation && /s[aã]o paulo/i.test(text)) {
            merged.push('São Paulo');
        }

        const cleaned = merged
            .filter(Boolean)
            .join('\n')
            .replace(/\s+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        const maxChars = 900;
        return cleaned.length > maxChars
            ? `${cleaned.slice(0, maxChars)}…`
            : cleaned;
    }

    function extractBlockByTitle(portal, titleText) {
        try {
            const normalized = String(titleText || '').toLowerCase();
            const headers = Array.from(
                portal.querySelectorAll(
                    '.csms-view-profile-block__header-title, .csms-view-profile-block__header-title *',
                ),
            );
            const header = headers.find((el) => {
                const text =
                    el && (el.textContent || el.innerText)
                        ? (el.textContent || el.innerText).trim().toLowerCase()
                        : '';
                return text && text.includes(normalized);
            });
            if (!header || !header.closest) return null;
            return header.closest('.csms-view-profile-block');
        } catch (error) {
            return null;
        }
    }

    function extractTextBlock(section, selector) {
        try {
            const el = section.querySelector(selector);
            const text =
                el && (el.textContent || el.innerText)
                    ? (el.textContent || el.innerText).trim()
                    : '';
            return text
                .replace(/\s+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        } catch (error) {
            return '';
        }
    }

    function extractBadgeTexts(section, selector) {
        try {
            return Array.from(section.querySelectorAll(selector))
                .map((badge) =>
                    (badge.textContent || badge.innerText || '').trim(),
                )
                .filter(Boolean);
        } catch (error) {
            return [];
        }
    }

    function extractBadooProfileTextFromPortal({ document }) {
        const portal = document.querySelector(
            '[data-qa="profile-portal-content-container_wrapper"], .profile-portal-container',
        );
        if (!portal) return '';

        const name = pickText(portal, '[data-qa="profile-info__name"]');
        const age = pickText(portal, '[data-qa="profile-info__age"]');
        const aboutSection =
            portal.querySelector('.user-section[data-qa="about-me"]') ||
            extractBlockByTitle(portal, 'Sobre mim');
        const locationSection =
            portal.querySelector('.user-section[data-qa="location"]') ||
            extractBlockByTitle(portal, 'Localização');
        const infoSection =
            portal.querySelector('.user-section[data-qa="about-me-badges"]') ||
            extractBlockByTitle(portal, 'Informações');
        const interestsSection =
            portal.querySelector('.user-section[data-qa="interests"]') ||
            extractBlockByTitle(portal, 'Interesses');

        const aboutMe = aboutSection
            ? extractTextBlock(
                  aboutSection,
                  '.csms-view-profile-block__content',
              )
            : '';
        const location = locationSection
            ? pickText(locationSection, '.csms-view-profile-block__header-text')
            : '';
        const infoBadges = infoSection
            ? extractBadgeTexts(
                  infoSection,
                  '.profile-badges__item .csms-badge__text',
              )
            : [];
        const interests = interestsSection
            ? extractBadgeTexts(
                  interestsSection,
                  '.profile-badges__item [data-qa="badge"] .csms-badge__text',
              )
            : [];
        const questions = Array.from(
            portal.querySelectorAll(
                '.user-section[data-qa^="profile-question-"]',
            ),
        )
            .map((section) => {
                const question = pickText(
                    section,
                    '[data-qa="overlay-action"]',
                );
                const answer = pickText(
                    section,
                    '.csms-view-profile-block__header-text',
                );
                if (!question && !answer) return null;
                return { question, answer };
            })
            .filter(Boolean);

        const lines = [];
        const title = [name, age ? `${age} anos` : '']
            .filter(Boolean)
            .join(', ');
        if (title) lines.push(`Perfil: ${title}`);
        if (aboutMe) lines.push(`Sobre mim: ${aboutMe}`);
        if (location) lines.push(`Localização: ${location}`);
        if (infoBadges.length) {
            lines.push(`Informações: ${infoBadges.slice(0, 20).join('; ')}`);
        }
        if (interests.length) {
            lines.push(`Interesses: ${interests.slice(0, 20).join('; ')}`);
        }
        if (questions.length) {
            const qa = questions
                .slice(0, 10)
                .map((item) =>
                    item.answer
                        ? `${item.question}: ${item.answer}`
                        : item.question,
                )
                .filter(Boolean)
                .join(' | ');
            if (qa) lines.push(`Perguntas: ${qa}`);
        }

        const text = lines.join('\n').trim();
        if (!text) return '';
        const maxChars = 900;
        return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
    }

    const api = {
        sanitizeProfileText,
        extractOtherPersonName,
        extractBadooProfileTextFromPortal,
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
    root.window.ChatSuggestions.ProfileParser = api;
})();
