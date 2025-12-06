/**
 * Script para adicionar sugestões de texto acima da caixa de mensagens
 * baseado no contexto da conversa
 */

class ChatSuggestions {
    constructor(chatContainerSelector = '.csms-chat-messages', inputSelector = null) {
        this.chatContainer = document.querySelector(chatContainerSelector);
        this.inputSelector = inputSelector || '#chat-composer-input-message';
        this.suggestionsContainer = null;
        this.suggestions = [];
    }

    /**
     * Extrai o contexto da conversa do HTML
     */
    extractConversationContext() {
        if (!this.chatContainer) {
            console.error('Container de chat não encontrado');
            return null;
        }

        const messages = this.chatContainer.querySelectorAll('[data-qa="chat-message"]');
        const context = {
            lastMessages: [],
            participants: new Set(),
            topics: [],
            lastSender: null
        };

        // Analisa as últimas mensagens (últimas 5)
        const recentMessages = Array.from(messages).slice(-5);
        
        recentMessages.forEach(message => {
            const direction = message.getAttribute('data-qa-message-direction');
            const contentText = message.querySelector('.csms-chat-message-content-text__message');
            const audioButton = message.querySelector('[data-qa-message-content-type="audio"]');
            
            if (contentText) {
                const text = contentText.textContent.trim();
                const sender = message.querySelector('.csms-a11y-visually-hidden')?.textContent || 
                              (direction === 'out' ? 'Você' : 'Outro');
                
                context.lastMessages.push({
                    sender: sender,
                    text: text,
                    direction: direction,
                    type: 'text'
                });
                
                context.participants.add(sender);
                context.lastSender = sender;
                
                // Extrai tópicos da conversa
                this.extractTopics(text, context.topics);
            } else if (audioButton) {
                const sender = message.querySelector('.csms-a11y-visually-hidden')?.textContent || 
                              (direction === 'out' ? 'Você' : 'Outro');
                context.lastMessages.push({
                    sender: sender,
                    text: 'Mensagem de voz',
                    direction: direction,
                    type: 'audio'
                });
                context.lastSender = sender;
            }
        });

        return context;
    }

    /**
     * Extrai tópicos relevantes do texto
     */
    extractTopics(text, topics) {
        const lowerText = text.toLowerCase();
        
        // Tópicos comuns em conversas de relacionamento
        const topicKeywords = {
            'trabalho': ['trabalho', 'emprego', 'profissão', 'engenheiro', 'desenvolve', 'programas'],
            'localização': ['moro', 'onde', 'cidade', 'capital', 'santo andré', 'tatuapé', 'perto'],
            'saudação': ['bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'como vai'],
            'interesse': ['gostei', 'fotos', 'legal', 'interessante'],
            'pergunta': ['?', 'vc', 'você', 'faz o que']
        };

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                if (!topics.includes(topic)) {
                    topics.push(topic);
                }
            }
        }
    }

    /**
     * Gera sugestões baseadas no contexto
     */
    generateSuggestions(context) {
        if (!context || context.lastMessages.length === 0) {
            return this.getDefaultSuggestions();
        }

        const suggestions = [];
        const lastMessage = context.lastMessages[context.lastMessages.length - 1];
        const isLastFromMe = lastMessage.direction === 'out';
        
        // Se a última mensagem foi minha, sugere respostas de continuidade
        if (isLastFromMe) {
            suggestions.push(...this.getContinuationSuggestions(context));
        } else {
            // Se a última mensagem foi do outro, sugere respostas
            suggestions.push(...this.getResponseSuggestions(context, lastMessage));
        }

        // Adiciona sugestões contextuais baseadas nos tópicos
        suggestions.push(...this.getContextualSuggestions(context));

        // Remove duplicatas e limita a 3 sugestões
        return [...new Set(suggestions)].slice(0, 3);
    }

    /**
     * Sugestões padrão quando não há contexto suficiente
     */
    getDefaultSuggestions() {
        return [
            'Oi! Como você está?',
            'Tudo bem?',
            'Que tal conversarmos?'
        ];
    }

    /**
     * Sugestões de continuidade quando você enviou a última mensagem
     */
    getContinuationSuggestions(context) {
        const suggestions = [];
        
        // Verifica se mencionou trabalho
        const workMentioned = context.topics.includes('trabalho');
        if (workMentioned) {
            suggestions.push('E você, trabalha com o quê?');
            suggestions.push('Que área você trabalha?');
        }

        // Verifica se mencionou localização
        const locationMentioned = context.topics.includes('localização');
        if (locationMentioned) {
            suggestions.push('Que legal! Moramos perto mesmo');
            suggestions.push('Já conhece a região?');
        }

        // Sugestões genéricas de continuidade
        suggestions.push('E você, o que gosta de fazer?');
        suggestions.push('Tem algum hobby?');

        return suggestions;
    }

    /**
     * Sugestões de resposta quando o outro enviou a última mensagem
     */
    getResponseSuggestions(context, lastMessage) {
        const suggestions = [];
        const text = lastMessage.text.toLowerCase();

        // Respostas para perguntas sobre trabalho
        if (text.includes('faz o que') || text.includes('trabalho') || text.includes('profissão')) {
            suggestions.push('Sou desenvolvedor de software');
            suggestions.push('Trabalho com tecnologia');
            suggestions.push('Sou engenheiro de software, e você?');
        }

        // Respostas para perguntas sobre localização
        if (text.includes('onde') || text.includes('mora') || text.includes('cidade')) {
            suggestions.push('Moro em São Paulo');
            suggestions.push('Sou da capital');
            suggestions.push('Moro aqui na região metropolitana');
        }

        // Respostas para elogios
        if (text.includes('gostei') || text.includes('legal') || text.includes('interessante')) {
            suggestions.push('Obrigado! 😊');
            suggestions.push('Que bom que gostou!');
            suggestions.push('Fico feliz!');
        }

        // Respostas para perguntas sobre fotos
        if (text.includes('foto')) {
            suggestions.push('Obrigado! As suas também são lindas');
            suggestions.push('Que bom que gostou!');
        }

        // Respostas genéricas
        if (text.includes('?')) {
            suggestions.push('Sim!');
            suggestions.push('Claro!');
            suggestions.push('Exatamente!');
        }

        // Respostas para saudações
        if (text.includes('bom dia') || text.includes('boa tarde') || text.includes('boa noite')) {
            suggestions.push('Oi! Tudo bem sim, e você?');
            suggestions.push('Tudo ótimo, obrigado!');
        }

        // Respostas para "tudo bem?"
        if (text.includes('tudo bem') || text.includes('como vai')) {
            suggestions.push('Tudo ótimo, e você?');
            suggestions.push('Estou bem, obrigado!');
        }

        return suggestions;
    }

    /**
     * Sugestões contextuais baseadas nos tópicos da conversa
     */
    getContextualSuggestions(context) {
        const suggestions = [];

        if (context.topics.includes('trabalho')) {
            suggestions.push('Gosto muito do que faço');
            suggestions.push('É uma área que sempre me interessou');
        }

        if (context.topics.includes('localização')) {
            suggestions.push('É uma região legal');
            suggestions.push('Já conhece por aqui?');
        }

        if (context.topics.includes('interesse')) {
            suggestions.push('Que tal nos conhecermos melhor?');
            suggestions.push('Gostaria de conversar mais');
        }

        return suggestions;
    }

    /**
     * Cria o container de sugestões
     */
    createSuggestionsContainer() {
        const container = document.createElement('div');
        container.className = 'chat-suggestions-container';
        container.id = 'chat-suggestions-container';
        container.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 8px 16px;
            overflow-x: auto;
            background-color: #f5f5f5;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
            scrollbar-width: thin;
            z-index: 1000;
            position: relative;
            width: 100%;
            box-sizing: border-box;
        `;

        // Estilos para scrollbar no Chrome
        const style = document.createElement('style');
        style.textContent = `
            .chat-suggestions-container::-webkit-scrollbar {
                height: 4px;
            }
            .chat-suggestions-container::-webkit-scrollbar-track {
                background: transparent;
            }
            .chat-suggestions-container::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 2px;
            }
        `;
        document.head.appendChild(style);

        return container;
    }

    /**
     * Cria um botão de sugestão
     */
    createSuggestionButton(text) {
        const button = document.createElement('button');
        button.type = 'button'; // Previne submit de formulário
        button.className = 'chat-suggestion-button';
        button.textContent = text;
        button.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #d0d0d0;
            border-radius: 20px;
            background-color: white;
            color: #333;
            font-size: 14px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            flex-shrink: 0;
        `;

        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#f0f0f0';
            button.style.borderColor = '#b0b0b0';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'white';
            button.style.borderColor = '#d0d0d0';
        });

        // Click handler - insere o texto na caixa de mensagem
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Previne comportamento padrão
            e.stopPropagation(); // Previne propagação do evento
            this.insertSuggestion(text);
        });

        return button;
    }

    /**
     * Insere a sugestão na caixa de mensagem
     */
    insertSuggestion(text) {
        // Tenta encontrar a caixa de mensagem por vários seletores comuns
        // Prioriza o seletor específico configurado
        const inputSelectors = [
            this.inputSelector, // Seletor específico configurado
            '#chat-composer-input-message', // Seletor específico do app
            'input[type="text"]',
            'textarea',
            '[contenteditable="true"]',
            '[data-qa="message-input"]',
            '.message-input',
            'input[placeholder*="mensagem" i]',
            'input[placeholder*="message" i]'
        ];

        let input = null;
        for (const selector of inputSelectors) {
            input = document.querySelector(selector);
            if (input) break;
        }

        if (input) {
            try {
                // Foca no input primeiro
                input.focus();
                
                // Para inputs e textareas normais
                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                    // Limpa o valor atual
                    input.value = '';
                    
                    // Define o novo valor
                    input.value = text;
                    
                    // Tenta múltiplas abordagens para garantir que o app detecte
                    
                    // 1. Dispara evento input com InputEvent
                    try {
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: text
                        });
                        input.dispatchEvent(inputEvent);
                    } catch (e) {
                        // Fallback para navegadores que não suportam InputEvent
                        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }
                    
                    // 2. Dispara evento change
                    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    
                    // 3. Dispara eventos de teclado
                    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'a' }));
                    input.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'a' }));
                    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'a' }));
                    
                    // 4. Tenta definir o valor novamente após os eventos
                    setTimeout(() => {
                        if (input.value !== text) {
                            input.value = text;
                            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        }
                    }, 10);
                    
                    // 5. Tenta acessar propriedades internas (se disponível)
                    try {
                        if (input._valueTracker) {
                            input._valueTracker.setValue('');
                        }
                        input.value = text;
                        if (input._valueTracker) {
                            input._valueTracker.setValue(text);
                        }
                    } catch (e) {
                        // Ignora se não disponível
                    }
                    
                } 
                // Para elementos contentEditable (divs editáveis)
                else if (input.contentEditable === 'true' || input.isContentEditable) {
                    // Limpa o conteúdo existente
                    input.textContent = '';
                    input.innerText = '';
                    
                    // Insere o novo texto
                    input.textContent = text;
                    input.innerText = text;
                    
                    // Dispara eventos para contentEditable
                    try {
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: text
                        });
                        input.dispatchEvent(inputEvent);
                    } catch (e) {
                        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }
                    
                    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    
                    // Move o cursor para o final
                    try {
                        const range = document.createRange();
                        const selection = window.getSelection();
                        if (selection) {
                            if (input.firstChild) {
                                range.selectNodeContents(input);
                            } else {
                                range.setStart(input, 0);
                                range.setEnd(input, 0);
                            }
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    } catch (e) {
                        console.warn('Não foi possível mover o cursor:', e);
                    }
                }
                
                // Força o foco novamente
                input.focus();
                
                console.log('Texto inserido:', text, 'Valor atual do input:', input.value || input.textContent);
            } catch (error) {
                console.error('Erro ao inserir texto:', error);
                // Fallback: tenta apenas definir o valor
                try {
                    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                        input.value = text;
                        input.focus();
                    } else if (input.contentEditable === 'true' || input.isContentEditable) {
                        input.textContent = text;
                        input.focus();
                    }
                } catch (e) {
                    console.error('Erro no fallback:', e);
                }
            }
        } else {
            console.warn('Caixa de mensagem não encontrada. Texto sugerido:', text);
            // Fallback: copia para clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    alert(`Sugestão copiada: "${text}"`);
                });
            } else {
                alert(`Sugestão: "${text}"`);
            }
        }
    }

    /**
     * Atualiza as sugestões
     */
    updateSuggestions() {
        const context = this.extractConversationContext();
        this.suggestions = this.generateSuggestions(context);

        if (!this.suggestionsContainer) {
            console.warn('Container de sugestões não encontrado');
            return;
        }

        // Limpa sugestões anteriores
        this.suggestionsContainer.innerHTML = '';

        // Se não houver sugestões, mostra sugestões padrão
        if (this.suggestions.length === 0) {
            this.suggestions = this.getDefaultSuggestions();
        }

        // Adiciona novas sugestões
        this.suggestions.forEach(suggestion => {
            const button = this.createSuggestionButton(suggestion);
            this.suggestionsContainer.appendChild(button);
        });

        // Garante que o container está visível
        if (this.suggestionsContainer.style.display === 'none') {
            this.suggestionsContainer.style.display = 'flex';
        }
    }

    /**
     * Inicializa o sistema de sugestões
     */
    init() {
        if (!this.chatContainer) {
            console.error('Container de chat não encontrado');
            return;
        }

        console.log('Inicializando ChatSuggestions...');

        // Cria o container de sugestões
        this.suggestionsContainer = this.createSuggestionsContainer();

        // Função auxiliar para tentar inserir as sugestões
        const tryInsertSuggestions = () => {
            // Prioriza encontrar o input específico
            const inputElement = document.querySelector(this.inputSelector);
            
            if (inputElement) {
                // Encontra o container do input que contém o textarea
                // Procura pelo container específico do Badoo
                const inputWrapper = inputElement.closest('.csms-chat-controls-base-input-message') ||
                                    inputElement.closest('.csms-chat-composer-input-wrapper__content') ||
                                    inputElement.closest('[class*="input-wrapper"]') ||
                                    inputElement.closest('[class*="composer-input"]') ||
                                    inputElement.parentElement;
                
                if (inputWrapper && inputWrapper.parentElement) {
                    // Remove o container se já estiver em outro lugar
                    if (this.suggestionsContainer.parentElement) {
                        this.suggestionsContainer.parentElement.removeChild(this.suggestionsContainer);
                    }
                    // Insere antes do container do input, não dentro dele
                    inputWrapper.parentElement.insertBefore(this.suggestionsContainer, inputWrapper);
                    console.log('Sugestões inseridas antes do container do input');
                    return true;
                }
                
                // Fallback: se não encontrou o wrapper, tenta inserir antes do input diretamente
                if (inputElement.parentElement) {
                    // Verifica se o parent não é o container que queremos evitar
                    const parent = inputElement.parentElement;
                    if (!parent.classList.contains('csms-chat-controls-base-input-message')) {
                        if (this.suggestionsContainer.parentElement) {
                            this.suggestionsContainer.parentElement.removeChild(this.suggestionsContainer);
                        }
                        parent.insertBefore(this.suggestionsContainer, inputElement);
                        console.log('Sugestões inseridas antes do input (fallback)');
                        return true;
                    } else {
                        // Se o parent é o container do input, insere antes dele
                        if (parent.parentElement) {
                            if (this.suggestionsContainer.parentElement) {
                                this.suggestionsContainer.parentElement.removeChild(this.suggestionsContainer);
                            }
                            parent.parentElement.insertBefore(this.suggestionsContainer, parent);
                            console.log('Sugestões inseridas antes do container do input (parent)');
                            return true;
                        }
                    }
                }
            }
            
            // Fallback: tenta encontrar o input por outros seletores
            const fallbackSelectors = [
                '.csms-chat-controls-base-input-message',
                '.csms-chat-composer-input-wrapper__content',
                'textarea',
                'input[type="text"]',
                '[contenteditable="true"]'
            ];
            
            for (const selector of fallbackSelectors) {
                const element = document.querySelector(selector);
                if (element && element.parentElement) {
                    if (this.suggestionsContainer.parentElement) {
                        this.suggestionsContainer.parentElement.removeChild(this.suggestionsContainer);
                    }
                    element.parentElement.insertBefore(this.suggestionsContainer, element);
                    console.log(`Sugestões inseridas antes do elemento: ${selector}`);
                    return true;
                }
            }
            
            // Último recurso: insere no final do body
            if (this.suggestionsContainer.parentElement) {
                this.suggestionsContainer.parentElement.removeChild(this.suggestionsContainer);
            }
            document.body.appendChild(this.suggestionsContainer);
            console.log('Sugestões inseridas no final do body (fallback)');
            return false;
        };

        // Tenta inserir imediatamente
        let inserted = tryInsertSuggestions();

        // Se não encontrou o input, tenta novamente com intervalos
        if (!inserted || !document.querySelector(this.inputSelector)) {
            const retryInterval = setInterval(() => {
                const inputFound = document.querySelector(this.inputSelector);
                if (inputFound) {
                    tryInsertSuggestions();
                    clearInterval(retryInterval);
                }
            }, 300);
            
            // Para de tentar após 5 segundos
            setTimeout(() => {
                clearInterval(retryInterval);
            }, 5000);
        }
        
        // Observa mudanças no DOM para reposicionar se necessário
        const domObserver = new MutationObserver(() => {
            const inputElement = document.querySelector(this.inputSelector);
            if (inputElement && this.suggestionsContainer) {
                const currentParent = this.suggestionsContainer.parentElement;
                
                // Verifica se as sugestões estão dentro do container do input (não deveriam estar)
                const inputWrapper = inputElement.closest('.csms-chat-controls-base-input-message') ||
                                    inputElement.closest('.csms-chat-composer-input-wrapper__content');
                
                // Se as sugestões estão dentro do wrapper do input, move para fora
                if (inputWrapper && inputWrapper.contains(this.suggestionsContainer)) {
                    if (inputWrapper.parentElement) {
                        if (currentParent) {
                            currentParent.removeChild(this.suggestionsContainer);
                        }
                        inputWrapper.parentElement.insertBefore(this.suggestionsContainer, inputWrapper);
                        console.log('Sugestões reposicionadas para fora do container do input');
                    }
                }
                // Se o input mudou de posição, reposiciona as sugestões
                else if (inputWrapper && inputWrapper.parentElement) {
                    const expectedParent = inputWrapper.parentElement;
                    if (currentParent !== expectedParent) {
                        if (currentParent) {
                            currentParent.removeChild(this.suggestionsContainer);
                        }
                        expectedParent.insertBefore(this.suggestionsContainer, inputWrapper);
                        console.log('Sugestões reposicionadas para acompanhar o input');
                    }
                }
            }
        });
        
        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Garante que o container está visível
        this.suggestionsContainer.style.display = 'flex';

        // Atualiza sugestões inicialmente
        this.updateSuggestions();

        // Observa mudanças no chat para atualizar sugestões
        const observer = new MutationObserver(() => {
            this.updateSuggestions();
        });

        observer.observe(this.chatContainer, {
            childList: true,
            subtree: true
        });

        // Atualiza sugestões periodicamente (a cada 2 segundos)
        setInterval(() => {
            this.updateSuggestions();
        }, 2000);

        console.log('ChatSuggestions inicializado com sucesso');
    }
}

// Inicialização automática quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const chatSuggestions = new ChatSuggestions();
            chatSuggestions.init();
        });
    } else {
        const chatSuggestions = new ChatSuggestions();
        chatSuggestions.init();
    }
}

// Exporta para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatSuggestions;
}

