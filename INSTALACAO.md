# Instalação da Extensão Chrome - Badoo Chat Suggestions

## Passo a Passo

### 1. Preparação

Certifique-se de ter os seguintes arquivos na pasta do projeto:

- `manifest.json`
- `content.js`
- `chat-suggestions.js` (opcional, para uso standalone)

### 2. Instalação no Chrome

1. **Abra o Chrome** e digite na barra de endereços:

    ```
    chrome://extensions/
    ```

    Ou acesse: Menu (☰) → Mais ferramentas → Extensões

2. **Ative o Modo do Desenvolvedor**
    - No canto superior direito, ative o toggle "Modo do desenvolvedor"
    - Isso permitirá carregar extensões não publicadas na Chrome Web Store

3. **Carregue a Extensão**
    - Clique no botão "Carregar sem compactação" (ou "Load unpacked")
    - Navegue até a pasta do projeto e selecione-a
    - Clique em "Selecionar pasta" (ou "Select Folder")

4. **Verificação**
    - A extensão deve aparecer na lista de extensões instaladas
    - Certifique-se de que está ativada (toggle no canto inferior direito do card da extensão)

### 3. Uso

1. **Acesse o Badoo**
    - Vá para: `https://badoo.com/messages/*`
    - Ou qualquer página de mensagens do Badoo

2. **As sugestões aparecerão automaticamente**
    - Acima da caixa de mensagens, você verá botões com sugestões de texto
    - As sugestões são geradas automaticamente baseadas no contexto da conversa

3. **Clique em uma sugestão**
    - Ao clicar, o texto será inserido automaticamente na caixa de mensagem
    - Você pode editar o texto antes de enviar

### 4. Debug (Opcional)

Se quiser ver logs detalhados no console:

1. Abra o Console do Desenvolvedor (F12 ou Ctrl+Shift+I)
2. Vá para a aba "Console"
3. Digite:
    ```javascript
    window.badooChatSuggestionsDebug = true;
    ```
4. Recarregue a página

Agora você verá logs detalhados sobre:

- Mensagens analisadas
- Tópicos detectados
- Sugestões geradas

## Solução de Problemas

### A extensão não aparece na lista

- Verifique se o `manifest.json` está na raiz da pasta
- Certifique-se de que o arquivo está em formato JSON válido
- Verifique o console do Chrome para erros (F12 → Console)

### As sugestões não aparecem

- Verifique se está na página correta: `https://badoo.com/messages/*`
- Abra o Console do Desenvolvedor (F12) e verifique se há erros
- Certifique-se de que a extensão está ativada
- Tente recarregar a página (Ctrl+R ou F5)

### As sugestões aparecem mas não funcionam ao clicar

- Verifique o console para erros
- Certifique-se de que o campo de mensagem está visível na página
- Tente recarregar a página

### A extensão não detecta novas mensagens

- As sugestões são atualizadas automaticamente a cada 3 segundos
- Se uma nova mensagem for enviada, as sugestões devem atualizar em até 1 segundo
- Se não atualizar, recarregue a página

## Desinstalação

1. Vá para `chrome://extensions/`
2. Encontre "Badoo Chat Suggestions" na lista
3. Clique em "Remover" (ou "Remove")
4. Confirme a remoção

## Atualização

Para atualizar a extensão após fazer alterações:

1. Vá para `chrome://extensions/`
2. Encontre "Badoo Chat Suggestions"
3. Clique no ícone de atualizar (🔄) no card da extensão
4. Ou recarregue a página do Badoo

## Notas

- A extensão só funciona em páginas de mensagens do Badoo (`https://badoo.com/messages/*`)
- Não é necessário fazer login novamente após instalar a extensão
- A extensão não coleta ou envia dados para servidores externos
- Todas as análises são feitas localmente no navegador
