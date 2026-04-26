(() => {
    class AIClient {
        constructor({
            apiKey,
            model = 'google/gemini-2.0-flash-exp:free',
            endpoint = null,
            provider = 'gemini',
            profile = null,
            responseLength = 'short',
            businessModeEnabled = false,
            businessContext = '',
            businessTone = 'consultivo',
        } = {}) {
            this.apiKey = apiKey;
            this.model = model;
            this.provider = provider || 'gemini';
            this.endpoint =
                endpoint || this.getDefaultEndpointForProvider(this.provider);
            this.profile = profile;
            this.otherPersonProfile = null;
            this.responseLength = responseLength || 'short';
            this.businessModeEnabled = Boolean(businessModeEnabled);
            this.businessContext = businessContext || '';
            this.businessTone = businessTone || 'consultivo';
        }
    }

    const helpers = window.ChatSuggestions || {};
    Object.assign(
        AIClient.prototype,
        helpers.AIClientConfigHelpers || {},
        helpers.AIClientPromptHelpers || {},
        helpers.AIClientRequestHelpers || {},
        helpers.AIClientResponseHelpers || {},
    );

    window.ChatSuggestions = window.ChatSuggestions || {};
    window.ChatSuggestions.AIClient = AIClient;
})();
