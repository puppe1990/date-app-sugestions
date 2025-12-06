# Chat Suggestions - Sugestões de Texto para Chat

Script JavaScript que analisa conversas de chat e fornece sugestões de texto contextuais acima da caixa de mensagens.

## Funcionalidades

- ✅ Analisa o contexto da conversa automaticamente
- ✅ Gera sugestões baseadas nas últimas mensagens
- ✅ Detecta tópicos da conversa (trabalho, localização, interesses, etc.)
- ✅ Atualiza sugestões em tempo real conforme a conversa evolui
- ✅ Interface visual com botões clicáveis
- ✅ Insere sugestões diretamente na caixa de mensagem ao clicar
- ✅ **Extensão Chrome para Badoo** - Funciona automaticamente na página de mensagens

## Como Usar

### 🚀 Opção 1: Extensão Chrome (Recomendado para Badoo)

A extensão Chrome detecta automaticamente a página `https://badoo.com/messages/*` e adiciona as sugestões automaticamente.

#### Instalação:

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" (toggle no canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta deste projeto
5. A extensão estará instalada e ativa!

#### Uso:

- Acesse qualquer página de mensagens no Badoo: `https://badoo.com/messages/*`
- As sugestões aparecerão automaticamente acima da caixa de mensagens
- Clique em qualquer sugestão para inserir o texto na caixa de mensagem

### Opção 2: Incluir diretamente no HTML

```html
<script src="chat-suggestions.js"></script>
```

### Opção 3: Como módulo ES6

```javascript
import ChatSuggestions from './chat-suggestions.js';

const chatSuggestions = new ChatSuggestions('.csms-chat-messages');
chatSuggestions.init();
```

### Opção 4: Via console do navegador

```javascript
// Cole o conteúdo do arquivo chat-suggestions.js no console
// Ou carregue via:
const script = document.createElement('script');
script.src = 'chat-suggestions.js';
document.head.appendChild(script);
```

## Personalização

O script procura automaticamente pelo container de chat com a classe `.csms-chat-messages`. Se sua aplicação usar uma classe diferente, você pode especificar:

```javascript
const chatSuggestions = new ChatSuggestions('.sua-classe-customizada');
chatSuggestions.init();
```

## Como Funciona

1. **Análise de Contexto**: O script analisa as últimas 5 mensagens da conversa
2. **Extração de Tópicos**: Identifica tópicos como trabalho, localização, saudações, etc.
3. **Geração de Sugestões**: Cria sugestões relevantes baseadas no contexto
4. **Atualização Automática**: Observa mudanças no DOM e atualiza sugestões a cada 2 segundos

## Estrutura do HTML Esperada

O script espera encontrar mensagens com a estrutura:
- Container: `.csms-chat-messages`
- Mensagens: `[data-qa="chat-message"]`
- Direção: `[data-qa-message-direction="in"|"out"]`
- Texto: `.csms-chat-message-content-text__message`

## Exemplo de Uso

Após incluir o script, as sugestões aparecerão automaticamente acima da caixa de mensagens. Ao clicar em uma sugestão, o texto será inserido na caixa de mensagem.

## Estrutura da Extensão Chrome

A extensão consiste em:

- `manifest.json` - Configuração da extensão (Manifest V3)
- `content.js` - Script injetado na página do Badoo
- `chat-suggestions.js` - Versão standalone do script (para uso direto)

## Compatibilidade

- **Extensão Chrome**: Funciona automaticamente no Badoo
- **Script standalone**: Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Suporta inputs de texto, textareas e elementos contentEditable
- Fallback para clipboard se a caixa de mensagem não for encontrada

## Debug

Para ativar logs de debug no console, execute no console do navegador:

```javascript
window.badooChatSuggestionsDebug = true;
window.OPENROUTER_API_KEY = 'sua-chave-aqui'; // se quiser testar IA rapidamente
```

Isso mostrará logs detalhados sobre a análise de mensagens e geração de sugestões.
