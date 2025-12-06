# Repository Guidelines

## Project Structure & Module Organization
- Chrome MV3 extension focused on `https://badoo.com/messages/*`. Entry point is `content.js`, which wires configuration and bootstraps the controller after DOM load and on URL changes.
- Core logic lives in `src/`: `core/chat-controller.js` orchestrates message reading, context extraction, suggestion generation, and UI updates; `context/` holds `message-reader.js` and `context-extractor.js`; `suggestions/` contains `suggestion-engine.js`; `ui/suggestions-ui.js` manages DOM rendering; `constants/keywords.js` lists Portuguese keywords and topics.
- `chat-suggestions.js` is the standalone bundle for non-extension usage. `manifest.json` defines permissions and script injection order.
- No build system or bundler is used; files load directly in the browser environment, so keep modules self-contained and namespace-safe via `window.BadooChatSuggestions`.

## Build, Test, and Development Commands
- There is no build step or package manager setup; edits are picked up directly by the browser.
- To run the extension: open `chrome://extensions`, enable Developer Mode, click “Load unpacked”, and select this repository root. After changes, press “Reload” on the extension card.
- To test the standalone script, serve the repo and include `chat-suggestions.js` in an HTML page (e.g., `python3 -m http.server 8080` then open the page that references the script).

## Coding Style & Naming Conventions
- JavaScript ES6 classes wrapped in IIFEs; indent with 4 spaces and keep semicolons. Favor template strings for logging and string assembly.
- Preserve the `window.BadooChatSuggestions` namespace; export new modules by attaching classes or helpers to it.
- DOM selectors default to `.csms-chat-messages` and `#chat-composer-input-message`; keep overrides configurable through the controller constructor.
- Keep console messages concise (Portuguese logging is already present); add comments sparingly for non-obvious logic.

## Testing Guidelines
- No automated test suite exists. Rely on manual verification in a Badoo message thread.
- Steps: load the extension, open a conversation at `https://badoo.com/messages/*`, and set `window.badooChatSuggestionsDebug = true;` in DevTools for verbose logs. Confirm suggestions render above the composer, update on new messages, and clean up on navigation.
- When changing selectors or parsing rules, test both inbound and outbound messages and ensure suggestions remain capped and deduplicated.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit summaries similar to history (e.g., “Enhance logging for suggestion updates”). Include scoped detail in the body if needed.
- Pull requests should list the intent, notable code paths touched, and manual test notes (pages visited, expected/actual behavior). Add screenshots or short clips when UI changes the suggestion bar.
- If host permissions or selectors change, call that out explicitly to ease review and QA.

## Security & Configuration Tips
- Keep permissions limited to `https://badoo.com/*` unless there is a documented need. Avoid introducing persistent storage of chat content.
- Treat message parsing as client-side only; do not add network calls or third-party services without review.
