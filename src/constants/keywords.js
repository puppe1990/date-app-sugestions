(() => {
    const TOPIC_KEYWORDS = {
        trabalho: [
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
        localização: [
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
        saudação: [
            'bom dia', 'boa tarde', 'boa noite',
            'tudo bem', 'td bem', 'tudo bom', 'td bom',
            'como vai', 'como está', 'como esta', 'como ta',
            'olá', 'ola', 'oi', 'e aí', 'e ai', 'eai',
            'opa', 'eae', 'fala'
        ],
        interesse: [
            'gostei', 'gostou', 'gosta',
            'fotos', 'foto', 'fotografia',
            'legal', 'bacana', 'daora', 'massa',
            'interessante', 'interessou',
            'bonito', 'bonita', 'lindo', 'linda',
            'adoro', 'adorei', 'amo', 'amei',
            'curto', 'curti', 'curtir'
        ],
        pergunta: [
            '?', 'vc', 'você', 'voce',
            'faz o que', 'faz da vida', 'o que faz',
            'qual', 'quais', 'quando', 'onde', 'como',
            'quem', 'por que', 'porque', 'por quê',
            'e vc', 'e você', 'e voce', 'e tu'
        ],
        hobby: [
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
        encontro: [
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
        reação: [
            'oloko', 'oloco', 'nossa', 'caramba',
            'rs', 'rsrs', 'kkk', 'kkkk', 'haha', 'hahaha',
            'que legal', 'que massa', 'que daora',
            'entendi', 'entendeu', 'compreendi',
            'ah sim', 'ah não', 'ah nao',
            'tá', 'ta', 'ok', 'okay'
        ]
    };

    const PLACE_PATTERNS = [
        /\b(são paulo|sao paulo|sp|capital|tatuapé|tatuape|santo andré|santo andre|abc|paulista|zona sul|zona norte|zona leste|zona oeste|zn|zs|zl|zo|berrini|vila|bairro|região|regiao|regiões|regioes|metropolitana|mauá|maua|sbc|são bernardo|sao bernardo|guarulhos|osasco|campinas)\b/gi,
        /\bmoro (em|no|na) ([^,.!?]+)/gi,
        /\b(em|no|na) ([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g,
        /\b(moro|mora) (no|na|em) ([^,.!?]+)/gi
    ];

    const SPECIFIC_PLACES = [
        'tatuapé', 'tatuape', 'são paulo', 'sao paulo', 'sp', 'capital', 'santo andré',
        'santo andre', 'abc', 'mauá', 'maua', 'zn', 'zona norte', 'zona sul', 'zona leste',
        'zona oeste'
    ];

    const JOB_PATTERNS = [
        /\b(engenheiro|engenheira|desenvolvedor|desenvolvedora|programador|programadora|médico|medica|professor|professora|advogado|advogada|designer|arquiteto|arquiteta|psicólogo|psicologa|enfermeiro|enfermeira|dentista|veterinário|veterinaria|fotógrafo|fotografa|jornalista|publicitário|publicitaria|contador|contadora|administrador|administradora)\b/gi,
        /\bsou ([^,.!?]+)\b/gi,
        /\btrabalho (com|como|no|na|em) ([^,.!?]+)\b/gi,
        /\b(no|na|em) (pedágio|pedagio|loja|porcelanato|cerâmica|ceramica|startup|empresa|escritório|escritorio|consultoria)\b/gi
    ];

    const SPECIFIC_JOBS = [
        'pedágio', 'pedagio', 'loja', 'porcelanato', 'cerâmica', 'ceramica',
        'desenvolvedor', 'desenvolvedora', 'engenheiro', 'engenheira', 'software'
    ];

    const HOBBY_KEYWORDS = [
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
        'jiu', 'jiu-jitsu', 'jiujitsu', 'muay thai', 'boxe', 'luta', 'artes marciais',
        'hobby', 'hobbies', 'passatempo', 'passatempos',
        'tempo livre', 'horas vagas', 'lazer', 'diversão', 'diversao'
    ];

    const INPUT_SELECTORS = [
        '#chat-composer-input-message',
        'input[type=\"text\"]',
        'textarea',
        '[contenteditable=\"true\"]',
        '[data-qa=\"message-input\"]',
        '.message-input',
        'input[placeholder*=\"mensagem\" i]',
        'input[placeholder*=\"message\" i]'
    ];

    const SUGGESTION_LIBRARY = [
        {
            title: 'Abertura',
            items: [
                'Oi! Tudo bem? 🙂',
                'Oi! Como está seu dia?',
                'E aí! Como foi seu dia até agora?',
                'Qual foi a melhor parte do seu dia?',
                'Bora conversar um pouco?'
            ]
        },
        {
            title: 'Conhecer Melhor',
            items: [
                'O que você gosta de fazer no tempo livre?',
                'Você é mais de praia ou de montanha?',
                'Qual música você tem ouvido ultimamente?',
                'Você curte mais filme ou série?',
                'Tem algum hobby que você ama?'
            ]
        },
        {
            title: 'Elogios',
            items: [
                'Adorei seu sorriso 🙂',
                'Você tem uma vibe muito boa!',
                'Seu estilo é bem legal',
                'Você parece ser bem interessante',
                'Gostei muito das suas fotos'
            ]
        },
        {
            title: 'Flert',
            items: [
                'Você sempre foi assim charmosa(o) ou é só hoje?',
                'Confesso que eu queria te conhecer melhor 😉',
                'Você é perigosa(o): faz a gente sorrir fácil',
                'Se a conversa continuar assim, vou me apegar 😅',
                'Me diz uma coisa: você prefere rolê tranquilo ou algo mais animado?'
            ]
        },
        {
            title: 'Encontro',
            items: [
                'Que tal um café qualquer dia desses?',
                'Bora marcar algo no fim de semana?',
                'Você curte barzinho ou restaurante?',
                'Qual dia da semana costuma ser mais tranquilo pra você?',
                'Se a gente fosse sair, o que você escolheria fazer?'
            ]
        },
        {
            title: 'Respostas Curtas',
            items: [
                'Hahaha, adorei 😄',
                'Faz sentido!',
                'Entendi! E você?',
                'Boa! 😄',
                'Amei!'
            ]
        }
    ];

    window.BadooChatSuggestions = window.BadooChatSuggestions || {};
    window.BadooChatSuggestions.constants = {
        TOPIC_KEYWORDS,
        PLACE_PATTERNS,
        SPECIFIC_PLACES,
        JOB_PATTERNS,
        SPECIFIC_JOBS,
        HOBBY_KEYWORDS,
        INPUT_SELECTORS,
        SUGGESTION_LIBRARY
    };
})();
