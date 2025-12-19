# Repository Guidelines

## Project Structure & Module Organization
- Root files are the Chrome extension entry points and assets: `manifest.json`, `content.js`, `popup.html`, `popup.js`, `chat-suggestions.js`.
- Core source modules live in `src/`, grouped by concern: `src/core/` (AI client and controller), `src/context/` (message parsing), `src/ui/` (suggestions UI), `src/storage/` (context storage), `src/constants/` (keywords), `src/suggestions/` (engine).
- Suggestion data lives in `suggestions-library.json` and the example file `suggestions-library-example.json`.
- Documentation and installation notes are in `README.md` and `INSTALACAO.md`.

## Build, Test, and Development Commands
- There is no build step or package manager in this repo. Development is manual.
- Load the extension via Chrome: open `chrome://extensions/`, enable Developer Mode, and “Load unpacked” with the project root.
- To enable debugging, set `window.badooChatSuggestionsDebug = true` in the browser console and reload.

## Coding Style & Naming Conventions
- JavaScript uses 4-space indentation and semicolons, with IIFEs for module isolation (see `content.js`).
- Prefer descriptive, sentence-case names for classes (e.g., `ChatSuggestionsController`) and camelCase for variables/functions.
- Keep selectors and platform defaults in `content.js` consistent with existing patterns.
- Avoid introducing non-ASCII characters in source unless already present in the file.

## Testing Guidelines
- No automated tests are configured.
- Validate changes by loading the extension and checking suggestions on supported sites (Badoo, WhatsApp Web, Tinder).

## Commit & Pull Request Guidelines
- Commit messages in history are sentence-case, descriptive, and start with a verb (e.g., “Add…”, “Update…”). Use the same style.
- PRs should include: a clear description of behavior changes, manual test steps, and screenshots or short clips for UI changes.

## Configuration & Secrets
- API keys are loaded from `chrome.storage`, a `.env` file in the extension package, or `window.OPENROUTER_API_KEY`.
- Do not commit real API keys; keep `.env` local and out of version control.
