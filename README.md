# Chat Suggestions

Chrome extension that suggests short replies based on the conversation context across chat platforms. The project injects a UI above or beside the message box, reads recent message history, and uses a configurable AI provider to generate suggestions in Portuguese.

The extension currently supports:

- Badoo
- Tinder
- WhatsApp Web
- Instagram Direct

## What the project does

- Detects the active platform automatically.
- Reads recent messages and extracts conversation context.
- Generates suggestions with `Gemini`, `OpenRouter`, or `NVIDIA`.
- Lets you adjust model, response length, and conversation mode through the extension popup.
- Supports casual mode and business mode, with per-host configuration.
- Keeps a modular architecture in `src/` for the Chrome extension code.

## Structure

```text
.
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── src/
│   ├── constants/
│   ├── context/
│   ├── core/
│   ├── platforms/
│   ├── storage/
│   ├── suggestions/
│   └── ui/
├── tests/
├── suggestions-library.json
└── suggestions-library-example.json
```

## Installation

### 1. Install development dependencies

```bash
npm install
```

Dependencies are used for linting, formatting, hooks, and local tests. The extension itself is loaded directly into Chrome, with no build step.

### 2. Configure AI keys

The project expects keys in a `.env` file at the repository root. The code recognizes these names:

```env
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
NVIDIA_API_KEY=...
```

You can configure one or more keys and then choose the provider in the extension popup.

### 3. Load the extension in Chrome

1. Open `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the root of this repository.

## Platforms and permissions

Content scripts are loaded on these hosts:

- `https://badoo.com/messages/*`
- `https://tinder.com/app/messages/*`
- `https://web.whatsapp.com/*`
- `https://www.instagram.com/direct/*`

There are also host permissions for provider API calls:

- `https://openrouter.ai/*`
- `https://generativelanguage.googleapis.com/*`
- `https://integrate.api.nvidia.com/*`

## Usage

1. Open a conversation on one of the supported platforms.
2. Open the extension popup.
3. Choose the provider and model.
4. Adjust response length and conversation mode if needed.
5. Return to the chat and use the suggestions rendered by the extension.

Suggestions are inserted into the message field when clicked. On some platforms, the UI may also respect the placement override saved in the popup.

## Popup and configuration

The popup stores preferences in `chrome.storage.local`, including:

- AI provider
- selected model
- casual profile
- business profile
- response length
- UI placement override
- business mode per host
- business context and tone

The current default provider is `nvidia`.

## Development

### Scripts

```bash
npm test
npm run lint
npm run format
npm run format:check
npm run ci
```

`npm run ci` runs tests, linting, and format checks.

## Quality

- There are tests in `tests/` for `provider-config`, NVIDIA client integration, and repository tooling.
- A pre-commit hook is configured with `lint-staged`.
- The workflow [`./.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs `test`, `lint`, and `format:check` in GitHub Actions.

## Debug

To enable debug logs in the browser:

```js
window.badooChatSuggestionsDebug = true;
```

The code also watches the `data-bcs-debug` flag on `documentElement` to enable logs at runtime.

## Architecture

- `src/core/`
  AI client, provider configuration, and main controller.
- `src/context/`
  Message reading and context extraction per platform.
- `src/platforms/`
  Selectors and defaults specific to Badoo, Tinder, WhatsApp, and Instagram.
- `src/ui/`
  Suggestion rendering and message box interactions.
- `src/storage/`
  Local persistence for context and auxiliary preferences.
- `src/suggestions/`
  Suggestion engine and generation rules.
- `src/constants/`
  Keywords and helper lists.

## Notes

- There is no build step.
- Do not commit real API keys.
- If you change distributed extension behavior, review whether `manifest.json` version should be updated.
