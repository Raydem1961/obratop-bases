# ObraTop 3.34.0.0 — leitura, menu e ordem alfabética

Hosting no plano gratuito, sem mudança nas regras do Firestore. Só aparência e ordenação.

## O que mudou
1. **Fontes um pouco maiores e cinzas mais escuros** (testado em tela de notebook 1366×768): subtítulos como "Custos, resultado previsto e necessidade de caixa" (13,5 → 15 px), textos de apoio (12,5 → 14 px), cabeçalhos de colunas e indicadores (12,5 → 13,5 px), títulos de seção (15 → 16,5 px). Os cinzas ficaram mais escuros nos temas claro e escuro (contraste do texto de apoio de ≈ 6,2:1 para ≈ 9:1).
2. **Rodapé "ObraTop • Criado por … Direitos Autorais e Licença"** (e o mesmo texto da tela de entrada): 12 → 13,5 px, em cinza mais escuro.
3. **Item selecionado do menu lateral** em **amarelo-creme** (o mesmo dos avisos do app), com texto marrom escuro em negrito, ícone e marcador lateral **laranja**. No tema escuro: âmbar translúcido com texto claro.
4. **Discriminação dos serviços de A a Z:**
   - **Orçamentos (lista):** ordenada pelo nome do serviço, sem considerar o código na frente nem os acentos;
   - **Criar novo orçamento > busca nas bases:** resultados de A a Z (se você digitar o código inteiro, ele aparece primeiro);
   - **Planilha do orçamento:** novo botão **"Ordenar serviços de A a Z"** (dentro de cada etapa e sub-etapa; renumera os itens). A planilha mantém a ordem de numeração por padrão, para a impressão sair no formato da obra.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_34_0_0_Leitura_Menu_AZ.zip
cd ObraTop_V3.34.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test` (90) e simulador: 17 verificações novas (cores e tamanhos medidos no navegador em 1366×768, contraste, menu nos dois temas, rodapé, ordem A–Z) e todos os testes anteriores. Reversão: republique a 3.33.0.0.
