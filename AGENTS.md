# Repository Guidelines

## Project Structure & Module Organization

- `manifest.json`, `content.js`, `popup.html`, and `popup.js` define the Chrome extension entry points.
- `chat-suggestions.js` is the standalone bundle for direct script usage.
- `src/` holds the modular source:
  - `src/core/` controller and AI client wiring.
  - `src/context/` message readers and context extraction.
  - `src/platforms/` per-platform selectors (Badoo, Tinder, Instagram, WhatsApp).
  - `src/ui/` suggestion rendering and interactions.
  - `src/storage/` in-browser context persistence.
  - `src/constants/` keyword lists.
  - `src/suggestions/` generation logic.
- `suggestions-library.json` and `suggestions-library-example.json` provide seed data.

## Build, Test, and Development Commands

- No build step is required; files are loaded directly by the browser.
- Load the extension locally:
  - Open `chrome://extensions/`, enable Developer Mode, then "Load unpacked" with the repo root.
- For script-only usage, include `chat-suggestions.js` in a page or inject it via the console.
- Debug logging:
  - Set `window.badooChatSuggestionsDebug = true` in the browser console.

## Coding Style & Naming Conventions

- JavaScript, 4-space indentation, semicolons, and single quotes are the prevailing style.
- File names in `src/` use kebab-case (e.g., `chat-controller.js`); keep that pattern.
- Classes use PascalCase; exported namespaces live under `window.ChatSuggestions`.
- Prefer small, focused modules inside `src/` instead of expanding `chat-suggestions.js` directly.

## Testing Guidelines

- There are no automated tests in this repository.
- Manual verification checklist:
  - Load the extension and open `https://badoo.com/messages/*`.
  - Confirm suggestions render and buttons insert text into the message box.
  - Verify platform selectors when changing `src/platforms/*.js`.

## Commit & Pull Request Guidelines

- Recent commits use an imperative verb and sentence case (e.g., "Refactor ...", "Update ...").
- Keep the first line concise and add details in the body if needed.
- If you touch the extension behavior, update `manifest.json` version when appropriate.
- PRs should include:
  - A brief description of the change and test steps.
  - Screenshots or a short clip for UI/UX changes.

## Configuration & Security Notes

- AI calls expect a runtime API key; do not commit keys.
- Use `window.OPENROUTER_API_KEY = '...'` (console) for local testing only.
