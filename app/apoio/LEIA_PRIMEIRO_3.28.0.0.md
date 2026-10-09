# ObraTop 3.28.0.0 — novo visual no estilo Windows 11

Só a **aparência** mudou: nenhuma função, regra, dado ou fluxo foi alterado. Hosting no plano gratuito, sem mudança nas regras do Firestore.

## O que mudou no visual
- **Design único (Fluent / Windows 11):** novo arquivo `fluent.css`, carregado por último, que substitui as camadas de estilo acumuladas nas versões anteriores. Fonte **Segoe UI Variable** (Windows 11; no Windows 10 usa Segoe UI), cantos de 8 px, bordas finas, sombras leves e cor de destaque azul do Windows.
- **Ícones vetoriais próprios** no menu, na barra superior e nos botões (importar, exportar, modelo, assistente, salvar, restaurar, novo), no lugar dos emojis.
- **Menu lateral** no padrão NavigationView: itens de 38 px, ícone + texto, item ativo com marcador azul, grupos em texto discreto.
- **Barra superior** translúcida (efeito acrílico) mais enxuta, com nome da empresa, logo, indicador de sincronização e usuário.
- **Páginas:** título maior e mais leve, ações à direita, cartões brancos com borda fina; indicadores (KPIs) sem a faixa colorida, com números maiores e legíveis; faixa de indicadores que se reorganiza conforme a largura.
- **Tabelas** como grade de dados: cabeçalho discreto, linhas com realce ao passar o mouse e ao selecionar, selos de situação, botões compactos, **datas no formato dd/mm/aaaa** sem quebra de linha.
- **Formulários e janelas:** campos de 32 px com linha de destaque azul ao focar, janelas com sombra suave, rodapé de botões alinhado à direita.
- **Alertas** em linhas alinhadas (selo, texto, data e botão).
- **Tela de entrada** moderna, com cartão centralizado.
- **Tema escuro** revisado com as cores do Windows 11 (botão de lua/sol na barra superior).
- **Rolagem fina**, anel de foco visível por teclado e respeito à preferência do sistema por menos animação.

## Barra de título integrada (aplicativo instalado no Windows)
Quando o ObraTop está **instalado como aplicativo** (Edge ou Chrome → menu ⋯ → Aplicativos → Instalar), a barra superior passa a ocupar também a barra de título da janela, como nos aplicativos nativos do Windows 11. **Para ativar, desinstale e instale o aplicativo de novo depois de publicar.** No navegador comum nada muda. Não foi possível testar esse modo no ambiente de desenvolvimento.

## O que não mudou
Funções, dados, permissões, cálculos, importação e exportação, e a estrutura do cronograma (Gantt).

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_28_0_0_Visual_Windows.zip
cd ObraTop_V3.28.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt`, limpe o service worker (F12 → Application → Unregister; Storage → Clear site data) e recarregue com Ctrl+Shift+R.

## Testes
`npm test` (36 testes) e o simulador de navegador: telas, fluxos, segurança, perfis, custos, cronograma, logo, assistente e edição em lote, **todos passando** com o visual novo. Capturas de tela conferidas em 1600×960 e 1366×768, nos temas claro e escuro. **Não testado** no Firebase real, em impressora, nem na barra de título integrada.

## Reversão
Republique o pacote 3.27.1.0. Nenhum dado é afetado.
