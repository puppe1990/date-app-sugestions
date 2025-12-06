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
        this.lastMessageCount = 0;
        this.updateTimeout = null;
        this.messageCheckInterval = null;
        this.periodicUpdateInterval = null;
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
            allMessages: [],
            lastMessages: [],
            participants: new Set(),
            topics: [],
            mentionedPlaces: [],
            mentionedJobs: [],
            mentionedHobbies: [],
            questions: [],
            lastSender: null,
            conversationLength: 0,
            hasQuestions: false,
            hasElogios: false
        };

        // Analisa TODAS as mensagens para ter contexto completo
        const allMessagesArray = Array.from(messages);
        context.conversationLength = allMessagesArray.length;
        
        // Analisa as últimas 10 mensagens para contexto recente
        const recentMessages = allMessagesArray.slice(-10);
        
        recentMessages.forEach(message => {
            const direction = message.getAttribute('data-qa-message-direction');
            const contentText = message.querySelector('.csms-chat-message-content-text__message');
            const audioButton = message.querySelector('[data-qa-message-content-type="audio"]');
            
            if (contentText) {
                const text = contentText.textContent.trim();
                const sender = message.querySelector('.csms-a11y-visually-hidden')?.textContent || 
                              (direction === 'out' ? 'Você' : 'Outro');
                
                const messageObj = {
                    sender: sender,
                    text: text,
                    direction: direction,
                    type: 'text'
                };
                
                context.allMessages.push(messageObj);
                context.lastMessages.push(messageObj);
                context.participants.add(sender);
                context.lastSender = sender;
                
                // Extrai informações detalhadas da mensagem
                this.extractTopics(text, context.topics);
                this.extractMentionedPlaces(text, context.mentionedPlaces);
                this.extractMentionedJobs(text, context.mentionedJobs);
                this.extractMentionedHobbies(text, context.mentionedHobbies);
                
                // Detecta perguntas
                if (text.includes('?') || text.match(/\b(qual|quando|onde|como|quem|por que|porque)\b/i)) {
                    context.hasQuestions = true;
                    context.questions.push(text);
                }
                
                // Detecta elogios
                if (text.match(/\b(gostei|legal|interessante|bonito|lindo|adoro|amo|curto|incrível|maravilhoso)\b/i)) {
                    context.hasElogios = true;
                }
                
            } else if (audioButton) {
                const sender = message.querySelector('.csms-a11y-visually-hidden')?.textContent || 
                              (direction === 'out' ? 'Você' : 'Outro');
                const messageObj = {
                    sender: sender,
                    text: 'Mensagem de voz',
                    direction: direction,
                    type: 'audio'
                };
                context.allMessages.push(messageObj);
                context.lastMessages.push(messageObj);
                context.lastSender = sender;
            }
        });

        // Log das mensagens no console
        console.log('=== MENSAGENS ANALISADAS ===');
        console.log(`Total de mensagens: ${context.conversationLength}`);
        console.log(`Últimas ${context.lastMessages.length} mensagens:`);
        context.lastMessages.forEach((msg, index) => {
            const direction = msg.direction === 'out' ? 'VOCÊ' : 'OUTRO';
            console.log(`${index + 1}. [${direction}] ${msg.sender}: "${msg.text}"`);
        });
        console.log(`Tópicos detectados:`, context.topics);
        console.log(`Lugares mencionados:`, context.mentionedPlaces);
        console.log(`Profissões mencionadas:`, context.mentionedJobs);
        console.log(`Hobbies mencionados:`, context.mentionedHobbies);
        console.log('============================');

        return context;
    }

    /**
     * Extrai tópicos relevantes do texto
     */
    extractTopics(text, topics) {
        const lowerText = text.toLowerCase();
        
        // Tópicos comuns em conversas de relacionamento
        const topicKeywords = {
            'trabalho': [
                'trabalho', 'trabalha', 'trabalho com', 'trabalho na', 'trabalho no', 'trabalho em',
                'emprego', 'empregada', 'empregado',
                'profissão', 'profissional',
                'faz o que', 'faz da vida', 'o que faz', 'trabalha com o quê',
                'engenheiro', 'engenheira', 'engenharia',
                'desenvolvedor', 'desenvolvedora', 'desenvolve', 'desenvolvimento',
                'programador', 'programadora', 'programa', 'programação',
                'software', 'tecnologia', 'tech', 'ti', 'sistemas',
                'pedágio', 'pedagio',
                'loja', 'lojista', 'vendedor', 'vendedora',
                'porcelanato', 'cerâmica',
                'startup', 'empresa', 'escritório', 'escritorio',
                'consultoria', 'consultor', 'consultora',
                'carreira', 'cliente', 'chefe', 'patrão',
                'mês', 'mes', 'meses', 'ano', 'anos', 'tempo de trabalho',
                'área', 'area', 'setor', 'ramo'
            ],
            'localização': [
                'moro', 'mora', 'moramos', 'morar',
                'onde', 'onde mora', 'onde você mora', 'onde vc mora',
                'cidade', 'bairro', 'bairros',
                'capital', 'interior',
                'são paulo', 'sao paulo', 'sp',
                'tatuapé', 'tatuape',
                'santo andré', 'santo andre', 'abc',
                'paulista', 'paulistas',
                'perto', 'próximo', 'proximo', 'próxima', 'proxima',
                'zona', 'zona norte', 'zona sul', 'zona leste', 'zona oeste',
                'zn', 'zs', 'zl', 'zo',
                'região', 'regiao', 'regiões', 'regioes',
                'endereço', 'endereco', 'local', 'lugar',
                'mauá', 'maua', 'sbc', 'são bernardo', 'sao bernardo',
                'guarulhos', 'osasco', 'campinas'
            ],
            'saudação': [
                'bom dia', 'boa tarde', 'boa noite',
                'tudo bem', 'td bem', 'tudo bom', 'td bom',
                'como vai', 'como está', 'como esta', 'como ta',
                'olá', 'ola', 'oi', 'e aí', 'e ai', 'eai',
                'opa', 'eae', 'fala'
            ],
            'interesse': [
                'gostei', 'gostou', 'gosta',
                'fotos', 'foto', 'fotografia',
                'legal', 'bacana', 'daora', 'massa',
                'interessante', 'interessou',
                'bonito', 'bonita', 'lindo', 'linda',
                'adoro', 'adorei', 'amo', 'amei',
                'curto', 'curti', 'curtir'
            ],
            'pergunta': [
                '?', 'vc', 'você', 'voce',
                'faz o que', 'faz da vida', 'o que faz',
                'qual', 'quais', 'quando', 'onde', 'como',
                'quem', 'por que', 'porque', 'por quê',
                'e vc', 'e você', 'e voce', 'e tu'
            ],
            'hobby': [
                'hobby', 'hobbies',
                'gosto', 'gosta de', 'gostar',
                'curto', 'curte', 'curtir',
                'interesse', 'interesses',
                'fazer', 'fazer no tempo livre',
                'tempo livre', 'horas vagas',
                'lazer', 'diversão', 'diversao',
                'academia', 'treino', 'treinar',
                'caminhar', 'caminhada', 'correr', 'corrida',
                'ler', 'leitura', 'livro', 'livros',
                'youtube', 'netflix', 'filme', 'filmes', 'série', 'series',
                'restaurante', 'cafeteria', 'café', 'cafe',
                'música', 'musica', 'cinema', 'teatro',
                'esporte', 'esportes', 'futebol', 'natação', 'natacao',
                'viagem', 'viajar', 'fotografia', 'cozinhar', 'dança', 'danca'
            ],
            'encontro': [
                'encontrar', 'encontro', 'encontros',
                'ver', 'ver você', 'ver vc',
                'conhecer', 'conhecer pessoalmente',
                'sair', 'sair junto', 'sairmos',
                'marcar', 'marcar algo', 'marcarmos',
                'combinar', 'combinado',
                'quando', 'quando você pode', 'quando vc pode',
                'semana', 'fim de semana', 'fds',
                'hoje', 'amanhã', 'amanha', 'depois'
            ],
            'reação': [
                'oloko', 'oloco', 'nossa', 'caramba',
                'rs', 'rsrs', 'kkk', 'kkkk', 'haha', 'hahaha',
                'que legal', 'que massa', 'que daora',
                'entendi', 'entendeu', 'compreendi',
                'ah sim', 'ah não', 'ah nao',
                'tá', 'ta', 'ok', 'okay'
            ]
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
     * Extrai lugares mencionados na conversa
     */
    extractMentionedPlaces(text, places) {
        const lowerText = text.toLowerCase();
        const placePatterns = [
            /\b(são paulo|sao paulo|sp|capital|tatuapé|tatuape|santo andré|santo andre|abc|paulista|zona sul|zona norte|zona leste|zona oeste|zn|zs|zl|zo|berrini|vila|bairro|região|regiao|regiões|regioes|metropolitana|mauá|maua|sbc|são bernardo|sao bernardo|guarulhos|osasco|campinas)\b/gi,
            /\bmoro (em|no|na) ([^,.!?]+)/gi,
            /\b(em|no|na) ([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g,
            /\b(moro|mora) (no|na|em) ([^,.!?]+)/gi
        ];
        
        placePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    let place = match.replace(/\b(moro|mora|em|no|na|e vc|e você)\b/gi, '').trim();
                    // Remove pontuação e espaços extras
                    place = place.replace(/[.,!?;:]/g, '').trim();
                    if (place && place.length > 2 && !places.includes(place)) {
                        places.push(place);
                    }
                });
            }
        });
        
        // Detecta lugares específicos mencionados diretamente
        const specificPlaces = ['tatuapé', 'tatuape', 'são paulo', 'sao paulo', 'sp', 'capital', 'santo andré', 'santo andre', 'abc', 'mauá', 'maua', 'zn', 'zona norte', 'zona sul', 'zona leste', 'zona oeste'];
        specificPlaces.forEach(place => {
            if (lowerText.includes(place) && !places.includes(place)) {
                places.push(place);
            }
        });
    }

    /**
     * Extrai profissões mencionadas na conversa
     */
    extractMentionedJobs(text, jobs) {
        const lowerText = text.toLowerCase();
        const jobPatterns = [
            /\b(engenheiro|engenheira|desenvolvedor|desenvolvedora|programador|programadora|médico|medica|professor|professora|advogado|advogada|designer|arquiteto|arquiteta|psicólogo|psicologa|enfermeiro|enfermeira|dentista|veterinário|veterinaria|fotógrafo|fotografa|jornalista|publicitário|publicitaria|contador|contadora|administrador|administradora)\b/gi,
            /\bsou ([^,.!?]+)\b/gi,
            /\btrabalho (com|como|no|na|em) ([^,.!?]+)\b/gi,
            /\b(no|na|em) (pedágio|pedagio|loja|porcelanato|cerâmica|ceramica|startup|empresa|escritório|escritorio|consultoria)\b/gi
        ];
        
        jobPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    let job = match.replace(/\b(sou|trabalho|com|como|no|na|em|e vc|e você)\b/gi, '').trim();
                    // Remove pontuação e espaços extras
                    job = job.replace(/[.,!?;:]/g, '').trim();
                    if (job && job.length > 2 && !jobs.includes(job)) {
                        jobs.push(job);
                    }
                });
            }
        });
        
        // Detecta profissões específicas mencionadas diretamente
        const specificJobs = ['pedágio', 'pedagio', 'loja', 'porcelanato', 'cerâmica', 'ceramica', 'desenvolvedor', 'desenvolvedora', 'engenheiro', 'engenheira', 'software'];
        specificJobs.forEach(job => {
            if (lowerText.includes(job) && !jobs.includes(job)) {
                jobs.push(job);
            }
        });
    }

    /**
     * Extrai hobbies mencionados na conversa
     */
    extractMentionedHobbies(text, hobbies) {
        const lowerText = text.toLowerCase();
        const hobbyKeywords = [
            'academia', 'treino', 'treinar', 'malhar', 'malhação',
            'caminhar', 'caminhada', 'correr', 'corrida',
            'ler', 'leitura', 'livro', 'livros',
            'youtube', 'netflix', 'filme', 'filmes', 'série', 'series', 'seriado',
            'restaurante', 'cafeteria', 'café', 'cafe',
            'cinema', 'teatro', 'show', 'shows',
            'música', 'musica', 'ouvir música', 'ouvir musica',
            'esporte', 'esportes', 'futebol', 'natação', 'natacao', 'basquete', 'vôlei', 'volei',
            'viagem', 'viajar', 'turismo',
            'fotografia', 'foto', 'fotos',
            'cozinhar', 'culinária', 'culinaria',
            'dança', 'danca', 'dançar', 'dancar',
            'hobby', 'hobbies', 'passatempo', 'passatempos',
            'tempo livre', 'horas vagas', 'lazer', 'diversão', 'diversao'
        ];
        
        hobbyKeywords.forEach(keyword => {
            if (lowerText.includes(keyword) && !hobbies.includes(keyword)) {
                hobbies.push(keyword);
            }
        });
    }

    /**
     * Verifica se um tópico já foi comentado/perguntado na conversa
     */
    hasTopicBeenDiscussed(context, topic) {
        const topicKeywords = {
            'trabalho': [
                'trabalho', 'trabalha', 'trabalho com', 'trabalho na', 'trabalho no', 'trabalho em',
                'emprego', 'empregada', 'empregado',
                'profissão', 'profissional',
                'faz o que', 'faz da vida', 'o que faz', 'trabalha com o quê',
                'engenheiro', 'engenheira', 'engenharia',
                'desenvolvedor', 'desenvolvedora', 'desenvolve', 'desenvolvimento',
                'programador', 'programadora', 'programa', 'programação',
                'software', 'tecnologia', 'tech', 'ti', 'sistemas',
                'pedágio', 'pedagio',
                'loja', 'lojista', 'vendedor', 'vendedora',
                'porcelanato', 'cerâmica',
                'startup', 'empresa', 'escritório', 'escritorio',
                'consultoria', 'consultor', 'consultora',
                'carreira', 'cliente', 'chefe', 'patrão',
                'mês', 'mes', 'meses', 'ano', 'anos', 'tempo de trabalho',
                'área', 'area', 'setor', 'ramo'
            ],
            'localização': [
                'moro', 'mora', 'moramos', 'morar',
                'onde', 'onde mora', 'onde você mora', 'onde vc mora',
                'cidade', 'bairro', 'bairros',
                'capital', 'interior',
                'são paulo', 'sao paulo', 'sp',
                'tatuapé', 'tatuape',
                'santo andré', 'santo andre', 'abc',
                'paulista', 'paulistas',
                'perto', 'próximo', 'proximo', 'próxima', 'proxima',
                'zona', 'zona norte', 'zona sul', 'zona leste', 'zona oeste',
                'zn', 'zs', 'zl', 'zo',
                'região', 'regiao', 'regiões', 'regioes',
                'endereço', 'endereco', 'local', 'lugar',
                'mauá', 'maua', 'sbc', 'são bernardo', 'sao bernardo',
                'guarulhos', 'osasco', 'campinas'
            ]
        };
        
        const keywords = topicKeywords[topic] || [];
        if (keywords.length === 0) return false;
        
        // Verifica se alguma mensagem contém palavras-chave do tópico
        // Considera que foi comentado se:
        // 1. Há uma pergunta sobre o tópico (contém ? e palavras-chave)
        // 2. Há uma resposta/afirmação sobre o tópico (contém palavras-chave sem ser apenas uma pergunta genérica)
        let hasQuestion = false;
        let hasAnswer = false;
        
        context.lastMessages.forEach(message => {
            const text = message.text.toLowerCase();
            const containsKeyword = keywords.some(keyword => text.includes(keyword));
            
            if (containsKeyword) {
                // Se contém ? e palavras-chave, é uma pergunta sobre o tópico
                if (text.includes('?')) {
                    hasQuestion = true;
                }
                // Se não contém ?, é uma resposta/afirmação sobre o tópico
                else {
                    hasAnswer = true;
                }
            }
        });
        
        // Retorna true se houve pergunta OU resposta sobre o tópico
        return hasQuestion || hasAnswer;
    }

    /**
     * Gera sugestões baseadas no contexto REAL da conversa
     */
    generateSuggestions(context) {
        // Sempre analisa o contexto, mesmo que não haja mensagens
        if (!context) {
            return this.getDefaultSuggestions();
        }

        const suggestions = [];
        
        // Se não há mensagens, retorna sugestões padrão
        if (context.lastMessages.length === 0) {
            return this.getDefaultSuggestions();
        }

        const lastMessage = context.lastMessages[context.lastMessages.length - 1];
        const isLastFromMe = lastMessage.direction === 'out';
        
        // PRIORIDADE 1: Sugestões baseadas na última mensagem (mais relevante)
        if (isLastFromMe) {
            // Você enviou a última mensagem - sugere continuidade
            const continuation = this.getContinuationSuggestions(context);
            suggestions.push(...continuation);
        } else {
            // O outro enviou a última mensagem - sugere respostas específicas
            const responses = this.getResponseSuggestions(context, lastMessage);
            suggestions.push(...responses);
        }

        // PRIORIDADE 2: Sugestões personalizadas baseadas em informações específicas
        const personalized = this.getPersonalizedSuggestions(context);
        suggestions.push(...personalized);

        // PRIORIDADE 3: Se ainda não tem sugestões suficientes, adiciona genéricas
        if (suggestions.length < 3) {
            const contextual = this.getContextualSuggestions(context);
            suggestions.push(...contextual);
        }

        // PRIORIDADE 4: Último recurso - sugestões padrão
        if (suggestions.length < 3) {
            const defaults = this.getDefaultSuggestions();
            suggestions.push(...defaults);
        }

        // Remove duplicatas, mantém ordem de prioridade e limita a 5 sugestões
        const uniqueSuggestions = [];
        const seen = new Set();
        for (const suggestion of suggestions) {
            const normalized = suggestion.toLowerCase().trim();
            if (!seen.has(normalized) && suggestion.trim().length > 0) {
                seen.add(normalized);
                uniqueSuggestions.push(suggestion);
                if (uniqueSuggestions.length >= 5) break;
            }
        }
        
        // Log das sugestões no console
        console.log('=== SUGESTÕES GERADAS ===');
        console.log(`Total de sugestões geradas: ${uniqueSuggestions.length}`);
        uniqueSuggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. "${suggestion}"`);
        });
        console.log('==========================');
        
        return uniqueSuggestions;
    }

    /**
     * Gera sugestões personalizadas baseadas em informações específicas mencionadas
     */
    getPersonalizedSuggestions(context) {
        const suggestions = [];
        
        // Se mencionaram lugares específicos
        if (context.mentionedPlaces.length > 0) {
            const place = context.mentionedPlaces[0];
            suggestions.push(`Que legal! Já conhece ${place}?`);
            suggestions.push(`É uma região bem legal`);
            suggestions.push(`Já visitou ${place}?`);
        }
        
        // Se mencionaram profissões
        if (context.mentionedJobs.length > 0) {
            const job = context.mentionedJobs[0];
            suggestions.push(`Que interessante! Trabalha com ${job} há quanto tempo?`);
            suggestions.push(`Adoro pessoas que trabalham com ${job}`);
        }
        
        // Se mencionaram hobbies
        if (context.mentionedHobbies.length > 0) {
            const hobbies = context.mentionedHobbies.slice(0, 2).join(' e ');
            suggestions.push(`Que legal! Também gosto de ${hobbies}`);
            suggestions.push(`Adoro ${hobbies}!`);
        }
        
        // Se há perguntas não respondidas
        if (context.hasQuestions && context.questions.length > 0) {
            const lastQuestion = context.questions[context.questions.length - 1];
            if (lastQuestion.includes('onde') || lastQuestion.includes('mora')) {
                suggestions.push('Moro em São Paulo');
                suggestions.push('Moro no bairro de Tatuapé, São Paulo capital');
                suggestions.push('Moro no bairro de Tatuapé');
                suggestions.push('Sou da capital');
            } else if (lastQuestion.includes('faz') || lastQuestion.includes('trabalho')) {
                suggestions.push('Sou desenvolvedor de software');
                suggestions.push('Sou desenvolvedor de software numa startup');
                suggestions.push('Tenho um consultoria de tecnologia');
                suggestions.push('Trabalho com tecnologia');
            }
        }
        
        return suggestions;
    }

    /**
     * Sugestões padrão quando não há contexto suficiente
     * Baseadas no horário atual
     */
    getDefaultSuggestions() {
        const hour = new Date().getHours();
        let timeGreeting = '';
        let timeBasedSuggestions = [];
        
        // Determina a saudação baseada no horário
        if (hour >= 5 && hour < 12) {
            // Manhã: 5h às 11h59
            timeGreeting = 'Bom dia';
            timeBasedSuggestions = [
                'Bom dia! Como você está?',
                'Bom dia! Tudo bem?',
                'Bom dia! Como foi seu despertar?',
                'Bom dia! Espero que tenha um ótimo dia',
                'Bom dia! Que tal conversarmos?'
            ];
        } else if (hour >= 12 && hour < 18) {
            // Tarde: 12h às 17h59
            timeGreeting = 'Boa tarde';
            timeBasedSuggestions = [
                'Boa tarde! Como você está?',
                'Boa tarde! Tudo bem?',
                'Boa tarde! Como está seu dia?',
                'Boa tarde! Espero que esteja tendo um bom dia',
                'Boa tarde! Que tal conversarmos?'
            ];
        } else {
            // Noite: 18h às 4h59
            timeGreeting = 'Boa noite';
            timeBasedSuggestions = [
                'Boa noite! Como você está?',
                'Boa noite! Tudo bem?',
                'Boa noite! Como foi seu dia?',
                'Boa noite! Espero que tenha tido um bom dia',
                'Boa noite! Que tal conversarmos?'
            ];
        }
        
        // Combina sugestões baseadas no horário com sugestões genéricas
        return [
            ...timeBasedSuggestions,
            `${timeGreeting}! Prazer em te conhecer`,
            `${timeGreeting}! Como vai?`,
            `${timeGreeting}! Tudo certo?`
        ];
    }

    /**
     * Sugestões de continuidade quando você enviou a última mensagem
     */
    getContinuationSuggestions(context) {
        const suggestions = [];
        
        // Pega a última mensagem que você enviou
        const myLastMessage = context.lastMessages.filter(m => m.direction === 'out').slice(-1)[0];
        const myLastText = myLastMessage ? myLastMessage.text.toLowerCase() : '';
        
        // Verifica se estão falando de trabalho no contexto
        const isTalkingAboutWork = context.topics.includes('trabalho') || 
                                  myLastText.includes('trabalho') || 
                                  myLastText.includes('trabalha') ||
                                  myLastText.includes('pedágio') ||
                                  myLastText.includes('loja') ||
                                  myLastText.includes('porcelanato') ||
                                  myLastText.includes('engenheiro') ||
                                  myLastText.includes('desenvolvedor') ||
                                  myLastText.includes('software') ||
                                  context.lastMessages.some(m => 
                                      m.text.toLowerCase().includes('trabalho') || 
                                      m.text.toLowerCase().includes('trabalha') ||
                                      m.text.toLowerCase().includes('pedágio') ||
                                      m.text.toLowerCase().includes('faz o que') ||
                                      m.text.toLowerCase().includes('profissão')
                                  );
        
        // Se você fez uma pergunta, sugere outras perguntas relacionadas ou comentários
        if (myLastText.includes('?')) {
            // Se perguntou sobre trabalho (incluindo "trabalha", "tempo", etc)
            if (isTalkingAboutWork || myLastText.includes('faz') || myLastText.includes('trabalho') || myLastText.includes('trabalha') || myLastText.includes('profissão') || myLastText.includes('tempo')) {
                // Se você perguntou sobre o trabalho dela, sugere comentários ou novas perguntas sobre trabalho
                suggestions.push('Que interessante!');
                suggestions.push('Gosta do que faz?');
                suggestions.push('Como é trabalhar nisso?');
                suggestions.push('É desafiador?');
                suggestions.push('É uma área que sempre te interessou?');
            }
            // Se perguntou sobre localização
            else if (myLastText.includes('onde') || myLastText.includes('mora') || myLastText.includes('bairro') || myLastText.includes('zona')) {
                suggestions.push('Que legal!');
                suggestions.push('É perto daqui?');
                suggestions.push('Já conhece a região?');
                // Só sugere perguntar sobre trabalho se ainda não foi perguntado
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                }
                suggestions.push('O que você gosta de fazer por lá?');
            }
            // Outras perguntas genéricas
            else {
                suggestions.push('Que legal!');
                suggestions.push('E você, o que gosta de fazer?');
                suggestions.push('Tem algum hobby?');
                suggestions.push('O que você faz da vida?');
            }
        }
        // Se você fez uma afirmação ou comentário
        else {
            // Se estão falando de trabalho
            if (isTalkingAboutWork) {
                // Se você mencionou seu trabalho (afirmação sobre você mesmo)
                if (myLastText.includes('sou') || myLastText.includes('eu sou') || myLastText.includes('eu trabalho') || 
                    myLastText.includes('engenheiro') || myLastText.includes('desenvolvedor') || 
                    myLastText.includes('software') || myLastText.includes('tecnologia') ||
                    myLastText.includes('trabalho com') || myLastText.includes('trabalho na')) {
                    // Só sugere perguntas sobre trabalho se ainda não foi perguntado
                    if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                        suggestions.push('E você, trabalha com o quê?');
                        suggestions.push('Que área você trabalha?');
                        suggestions.push('Qual sua profissão?');
                        suggestions.push('Trabalha com o quê?');
                    }
                    // Se já foi perguntado, sugere outros tópicos
                    else {
                        if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                            suggestions.push('E você, mora onde?');
                            suggestions.push('Que bairro você mora?');
                        }
                        suggestions.push('O que você gosta de fazer no tempo livre?');
                        suggestions.push('Tem algum hobby?');
                        suggestions.push('Quais seus interesses?');
                    }
                }
                // Se você comentou sobre o trabalho dela ou fez uma afirmação genérica
                else {
                    suggestions.push('Que interessante!');
                    suggestions.push('Há quanto tempo trabalha nisso?');
                    suggestions.push('Gosta do que faz?');
                    suggestions.push('Como é trabalhar nisso?');
                    suggestions.push('É desafiador?');
                }
            }
            // Se mencionou trabalho (fallback) - só sugere se ainda não foi perguntado
            else if (context.topics.includes('trabalho') && !this.hasTopicBeenDiscussed(context, 'trabalho')) {
                suggestions.push('E você, trabalha com o quê?');
                suggestions.push('Que área você trabalha?');
                suggestions.push('E você, o que faz da vida?');
                suggestions.push('Qual sua profissão?');
                suggestions.push('Trabalha com o quê?');
            }

            // Se mencionou localização - só sugere se ainda não foi perguntado
            const locationMentioned = context.topics.includes('localização');
            if (locationMentioned && !this.hasTopicBeenDiscussed(context, 'localização')) {
                suggestions.push('E você, mora onde?');
                suggestions.push('Que bairro você mora?');
                suggestions.push('É perto daqui?');
                suggestions.push('Já conhece a região?');
            }

            // Sugestões genéricas de continuidade
            suggestions.push('E você, o que gosta de fazer?');
            suggestions.push('Tem algum hobby?');
            suggestions.push('O que você gosta de fazer no tempo livre?');
            suggestions.push('Quais seus interesses?');
            // Só sugere perguntas sobre trabalho/localização se ainda não foram comentadas
            if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                suggestions.push('O que você faz da vida?');
            }
            if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                suggestions.push('Mora onde?');
            }
        }

        return suggestions;
    }

    /**
     * Sugestões de resposta quando o outro enviou a última mensagem
     */
    getResponseSuggestions(context, lastMessage) {
        const suggestions = [];
        const text = lastMessage.text.toLowerCase();
        
        // Verifica se o tópico de trabalho está ativo na conversa
        const isTalkingAboutWork = context.topics.includes('trabalho') || 
                                   text.includes('trabalho') || 
                                   text.includes('trabalha') ||
                                   text.includes('pedágio') ||
                                   text.includes('pedagio') ||
                                   text.includes('loja') ||
                                   text.includes('porcelanato') ||
                                   text.includes('meses') ||
                                   text.includes('anos') ||
                                   context.lastMessages.some(m => 
                                       m.text.toLowerCase().includes('trabalho') || 
                                       m.text.toLowerCase().includes('trabalha') ||
                                       m.text.toLowerCase().includes('faz o que') ||
                                       m.text.toLowerCase().includes('profissão')
                                   );
        
        // Verifica qual foi a última pergunta que VOCÊ fez
        const myLastQuestion = context.lastMessages
            .filter(m => m.direction === 'out' && m.text.includes('?'))
            .slice(-1)[0];
        const myLastQuestionText = myLastQuestion ? myLastQuestion.text.toLowerCase() : '';
        
        // Analisa a última mensagem da outra pessoa para entender o contexto
        const isQuestion = text.includes('?');
        const isReaction = text.match(/\b(oloko|rs|kkk|haha|nossa|caramba|entendi|ah sim|ok|tá)\b/i);
        const mentionsTime = text.match(/\b(\d+)\s*(meses?|anos?|anos)\b/i);
        const mentionsWork = text.match(/\b(pedágio|pedagio|loja|porcelanato|trabalho|trabalha|faz o que|profissão)\b/i);
        const mentionsLocation = text.match(/\b(onde|mora|moro|bairro|zona|são paulo|sp|tatuapé)\b/i);

        // PRIORIDADE 1: Se a outra pessoa fez uma pergunta
        if (isQuestion) {
            // Pergunta sobre trabalho
            if (text.includes('faz o que') || text.includes('trabalho') || text.includes('profissão') || text.includes('emprego') || text.includes('trabalha') || text.includes('e vc')) {
                suggestions.push('Sou desenvolvedor de software');
                suggestions.push('Sou desenvolvedor de software numa startup');
                suggestions.push('Tenho um consultoria de tecnologia');
                suggestions.push('Trabalho com tecnologia');
                suggestions.push('Sou engenheiro de software, e você?');
                return suggestions; // Retorna imediatamente para priorizar
            }
            // Pergunta sobre localização
            else if (text.includes('onde') || text.includes('mora') || text.includes('bairro') || text.includes('zona')) {
                suggestions.push('Moro no bairro de Tatuapé, São Paulo capital');
                suggestions.push('Moro no bairro de Tatuapé');
                suggestions.push('Moro em São Paulo');
                suggestions.push('Sou da capital');
                return suggestions; // Retorna imediatamente para priorizar
            }
            // Outras perguntas
            else {
                suggestions.push('Sim!');
                suggestions.push('Claro!');
                suggestions.push('Exatamente!');
                suggestions.push('Com certeza!');
                return suggestions;
            }
        }
        
        // PRIORIDADE 2: Se estão falando de trabalho
        if (isTalkingAboutWork) {
            // Se a outra pessoa respondeu sobre tempo de trabalho (ex: "10 meses", "10 anos")
            if (mentionsTime) {
                suggestions.push('Que legal!');
                suggestions.push('Gosta do que faz?');
                suggestions.push('Como é trabalhar nisso?');
                // Se ainda não perguntou sobre localização, sugere
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('E você, mora onde?');
                }
                suggestions.push('O que você gosta de fazer no tempo livre?');
                return suggestions;
            }
            // Se a outra pessoa mencionou trabalho dela (ex: "No pedágio")
            else if (mentionsWork && !isQuestion) {
                suggestions.push('Que interessante!');
                suggestions.push('Há quanto tempo trabalha nisso?');
                suggestions.push('Gosta do que faz?');
                suggestions.push('Como é trabalhar nisso?');
                return suggestions;
            }
            // Se você perguntou sobre trabalho e ela respondeu
            else if (myLastQuestionText.includes('faz') || myLastQuestionText.includes('trabalho') || myLastQuestionText.includes('profissão') || myLastQuestionText.includes('tempo')) {
                suggestions.push('Que interessante!');
                suggestions.push('Gosta do que faz?');
                suggestions.push('Como é trabalhar nisso?');
                // Se ainda não perguntou sobre localização, sugere
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('E você, mora onde?');
                }
                suggestions.push('O que você gosta de fazer no tempo livre?');
                return suggestions;
            }
        }
        
        // PRIORIDADE 3: Se a outra pessoa está respondendo uma pergunta sua sobre localização
        if (myLastQuestionText.includes('onde') || myLastQuestionText.includes('mora') || myLastQuestionText.includes('bairro') || myLastQuestionText.includes('zona')) {
            suggestions.push('Que legal!');
            suggestions.push('É perto daqui?');
            suggestions.push('Já conhece a região?');
            // Só sugere perguntar sobre trabalho se ainda não foi perguntado
            if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                suggestions.push('E você, trabalha com o quê?');
            }
            suggestions.push('O que você gosta de fazer por lá?');
            return suggestions;
        }
        
        // PRIORIDADE 4: Reações (oloko, rs, kkk, etc)
        if (isReaction) {
            suggestions.push('Rsrs');
            suggestions.push('Kkk');
            suggestions.push('Que bom!');
            // Se estão falando de trabalho, continua o assunto
            if (isTalkingAboutWork) {
                suggestions.push('É uma área que sempre me interessou');
                suggestions.push('Gosto muito do que faço');
            }
            // Se não, sugere novos tópicos
            else {
                if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                    suggestions.push('E você, trabalha com o quê?');
                }
                if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                    suggestions.push('E você, mora onde?');
                }
            }
            return suggestions;
        }
        
        // PRIORIDADE 5: Elogios
        if (text.includes('gostei') || text.includes('legal') || text.includes('interessante') || text.includes('bonito') || text.includes('lindo')) {
            suggestions.push('Obrigado! 😊');
            suggestions.push('Que bom que gostou!');
            suggestions.push('Fico feliz!');
            return suggestions;
        }
        
        // PRIORIDADE 6: Respostas genéricas para informações
        if (!text.includes('?') && myLastQuestionText) {
            suggestions.push('Que legal!');
            suggestions.push('Interessante!');
            // Sugere novos tópicos se ainda não foram discutidos
            if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                suggestions.push('E você, trabalha com o quê?');
            }
            if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                suggestions.push('E você, mora onde?');
            }
            suggestions.push('O que você gosta de fazer no tempo livre?');
            return suggestions;
        }
        
        // Se chegou até aqui, retorna sugestões genéricas
        if (suggestions.length === 0) {
            suggestions.push('Que legal!');
            suggestions.push('Interessante!');
            if (!this.hasTopicBeenDiscussed(context, 'trabalho')) {
                suggestions.push('E você, trabalha com o quê?');
            }
            if (!this.hasTopicBeenDiscussed(context, 'localização')) {
                suggestions.push('E você, mora onde?');
            }
            suggestions.push('O que você gosta de fazer no tempo livre?');
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
            suggestions.push('É um trabalho que me realiza');
            suggestions.push('Amo o que faço');
            suggestions.push('É desafiador e gratificante');
        }

        if (context.topics.includes('localização')) {
            suggestions.push('É uma região legal');
            suggestions.push('Já conhece por aqui?');
            suggestions.push('É um lugar bem agradável');
            suggestions.push('Gosto muito daqui');
            suggestions.push('É uma região bem completa');
        }

        if (context.topics.includes('interesse')) {
            suggestions.push('Que tal nos conhecermos melhor?');
            suggestions.push('Gostaria de conversar mais');
            suggestions.push('Seria legal nos conhecermos');
            suggestions.push('Que tal conversarmos mais?');
            suggestions.push('Adoraria te conhecer melhor');
        }

        if (context.topics.includes('saudação')) {
            suggestions.push('Oi! Como você está?');
            suggestions.push('Olá! Tudo bem?');
            suggestions.push('Oi! Espero que esteja bem');
        }

        if (context.topics.includes('hobby')) {
            suggestions.push('Gosto de ler e assistir séries');
            suggestions.push('Adoro música e cinema');
            suggestions.push('Gosto de esportes e atividades ao ar livre');
            suggestions.push('Curto tecnologia e inovação');
            suggestions.push('Gosto de viajar e conhecer lugares novos');
        }

        if (context.topics.includes('encontro')) {
            suggestions.push('Adoraria! Quando você pode?');
            suggestions.push('Seria ótimo! Vamos combinar');
            suggestions.push('Combinado! Qual dia funciona melhor?');
            suggestions.push('Que legal! Vamos marcar');
            suggestions.push('Perfeito! Quando você está livre?');
        }

        // Sugestões gerais de engajamento
        suggestions.push('Que tal conversarmos mais?');
        suggestions.push('Gostaria de te conhecer melhor');
        suggestions.push('Seria legal nos conhecermos');
        suggestions.push('Adoraria conversar mais contigo');
        suggestions.push('Que tal marcarmos algo?');
        suggestions.push('Gostaria de te conhecer pessoalmente');
        suggestions.push('Seria incrível nos encontrarmos');

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

        // Armazena o número de mensagens para detectar mudanças
        this.lastMessageCount = 0;
        
        // Atualiza sugestões inicialmente
        this.updateSuggestions();

        // Função para verificar se há novas mensagens
        const checkForNewMessages = () => {
            const currentMessages = this.chatContainer.querySelectorAll('[data-qa="chat-message"]');
            const currentCount = currentMessages.length;
            
            // Se o número de mensagens mudou, atualiza as sugestões
            if (currentCount !== this.lastMessageCount) {
                this.lastMessageCount = currentCount;
                this.updateSuggestions();
                console.log(`Nova mensagem detectada! Total: ${currentCount}`);
            }
        };

        // Observa mudanças no chat para atualizar sugestões em tempo real
        const chatObserver = new MutationObserver((mutations) => {
            // Verifica se alguma mutação adicionou uma nova mensagem
            let hasNewMessage = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // Verifica se algum nó adicionado é uma mensagem
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Verifica se é uma mensagem ou contém mensagens
                            if (node.matches && node.matches('[data-qa="chat-message"]')) {
                                hasNewMessage = true;
                            } else if (node.querySelector && node.querySelector('[data-qa="chat-message"]')) {
                                hasNewMessage = true;
                            }
                        }
                    });
                }
            });
            
            // Se detectou nova mensagem, atualiza imediatamente
            if (hasNewMessage) {
                // Usa debounce para evitar múltiplas atualizações muito rápidas
                clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => {
                    this.updateSuggestions();
                    this.lastMessageCount = this.chatContainer.querySelectorAll('[data-qa="chat-message"]').length;
                    console.log('Sugestões atualizadas devido a nova mensagem');
                }, 300);
            } else {
                // Verifica periodicamente mesmo sem mutações óbvias
                checkForNewMessages();
            }
        });

        // Observa o container de mensagens com configuração otimizada
        chatObserver.observe(this.chatContainer, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        // Verifica periodicamente se há novas mensagens (backup)
        // Isso garante que mesmo se o observer falhar, ainda detecta mudanças
        this.messageCheckInterval = setInterval(() => {
            checkForNewMessages();
        }, 1000); // Verifica a cada 1 segundo

        // Atualiza sugestões periodicamente também (a cada 3 segundos como backup)
        this.periodicUpdateInterval = setInterval(() => {
            this.updateSuggestions();
        }, 3000);

        console.log('ChatSuggestions inicializado com sucesso - Escutando novas mensagens');
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

