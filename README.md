# Chat Suggestions

Extensão Chrome para sugerir respostas curtas com base no contexto da conversa em plataformas de chat. O projeto injeta uma UI acima ou ao lado da caixa de mensagem, lê o histórico recente da conversa e usa um provedor de IA configurável para gerar sugestões em português.

Hoje a extensão está preparada para:

- Badoo
- Tinder
- WhatsApp Web
- Instagram Direct

## O que o projeto faz

- Detecta automaticamente a plataforma aberta.
- Lê as mensagens recentes e extrai contexto da conversa.
- Gera sugestões com `Gemini`, `OpenRouter` ou `NVIDIA`.
- Permite ajustar modelo, tamanho de resposta e modo da conversa pelo popup da extensão.
- Suporta modo casual e modo comercial, com configuração por host.
- Mantém uma arquitetura modular em `src/` e uma versão standalone em `chat-suggestions.js`.

## Estrutura

```text
.
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── chat-suggestions.js
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

## Instalação

### 1. Instale dependências de desenvolvimento

```bash
npm install
```

As dependências são usadas para lint, formatação, hooks e testes locais. A extensão em si é carregada direto no Chrome, sem etapa de build.

### 2. Configure as chaves de IA

O projeto espera chaves em um arquivo `.env` na raiz. Os nomes reconhecidos pelo código são:

```env
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
NVIDIA_API_KEY=...
```

Você pode configurar uma ou mais chaves e depois escolher o provedor no popup da extensão.

### 3. Carregue a extensão no Chrome

1. Abra `chrome://extensions/`.
2. Ative `Developer mode`.
3. Clique em `Load unpacked`.
4. Selecione a raiz deste repositório.

## Plataformas e permissões

Os content scripts são carregados nestes hosts:

- `https://badoo.com/messages/*`
- `https://tinder.com/app/messages/*`
- `https://web.whatsapp.com/*`
- `https://www.instagram.com/direct/*`

Também existem permissões de host para chamadas aos provedores:

- `https://openrouter.ai/*`
- `https://generativelanguage.googleapis.com/*`
- `https://integrate.api.nvidia.com/*`

## Como usar

1. Abra uma conversa em uma das plataformas suportadas.
2. Abra o popup da extensão.
3. Escolha o provedor e o modelo.
4. Ajuste o tamanho da resposta e o modo da conversa, se necessário.
5. Volte para o chat e use as sugestões renderizadas pela extensão.

As sugestões são inseridas no campo de mensagem ao clicar. Em algumas plataformas, a UI também pode respeitar o ajuste de posicionamento salvo no popup.

## Popup e configuração

O popup salva preferências em `chrome.storage.local`, incluindo:

- provedor de IA
- modelo selecionado
- perfil casual
- perfil comercial
- comprimento da resposta
- override de posicionamento da UI
- modo comercial por host
- contexto e tom comercial

O provedor padrão atual é `nvidia`.

## Desenvolvimento

### Scripts

```bash
npm test
npm run lint
npm run format
npm run format:check
npm run ci
```

`npm run ci` executa testes, lint e verificação de formatação.

## Qualidade

- Há testes em `tests/` para `provider-config`, integração do cliente NVIDIA e tooling do repositório.
- Existe hook de pre-commit com `lint-staged`.
- O workflow [`./.github/workflows/ci.yml`](./.github/workflows/ci.yml) roda `test`, `lint` e `format:check` no GitHub Actions.

## Debug

Para ativar logs de debug no navegador:

```js
window.badooChatSuggestionsDebug = true;
```

O código também observa a flag `data-bcs-debug` no `documentElement` para habilitar logs em runtime.

## Arquitetura

- `src/core/`
  Cliente de IA, configuração de provedores e controlador principal.
- `src/context/`
  Leitura de mensagens e extração de contexto por plataforma.
- `src/platforms/`
  Seletores e defaults específicos de Badoo, Tinder, WhatsApp e Instagram.
- `src/ui/`
  Renderização das sugestões e interações com a caixa de mensagem.
- `src/storage/`
  Persistência local de contexto e preferências auxiliares.
- `src/suggestions/`
  Motor de geração e regras de sugestão.
- `src/constants/`
  Palavras-chave e listas auxiliares.

## Standalone

Além da extensão, o repositório ainda mantém `chat-suggestions.js` para uso direto em páginas ou testes manuais. A base principal, porém, está organizada nos módulos dentro de `src/`.

## Observações

- Não há etapa de build.
- Não faça commit de chaves reais.
- Se alterar comportamento da extensão distribuída, revise se faz sentido atualizar a versão em `manifest.json`.
