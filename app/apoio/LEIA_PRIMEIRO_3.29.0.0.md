# ObraTop 3.29.0.0 — visualização para smartphone

Só a **apresentação** mudou: nenhuma função, dado, regra ou cálculo foi alterado. Hosting no plano gratuito, sem mudança nas regras do Firestore.

## Botão computador ⇄ smartphone
- Fica na **barra superior**, ao lado do sino. Mostra o ícone do modo para o qual você vai trocar (celular quando está no computador; monitor quando está no smartphone).
- A escolha **fica guardada neste aparelho**. Também dá para escolher em **Configurações → Visualização**: *Automático*, *Computador* ou *Smartphone*.
- **Automático** (padrão): usa o layout de smartphone em telas estreitas (até 900 px) e em celulares com toque; monitores e notebooks ficam no layout completo.
- **Smartphone num monitor:** o app aparece dentro de uma **moldura de celular** centralizada (430 px), útil para conferir como fica.
- **Computador num celular:** mostra a página completa em 1280 px reduzida (como "site para computador"); dá para ampliar com os dedos.

## Como fica no celular
- **Menu inferior fixo:** Painel, Obras, Cronograma, Alertas (com contador) e **Mais**, que abre a **gaveta** com todos os módulos, tema claro/escuro, botão de visualização e Sair.
- **Barra superior compacta** (menu, marca, visualização, alertas e uma bolinha de sincronização).
- **Filtros recolhidos** num resumo ("Todas as obras ▾") que abre ao tocar.
- **Tabelas viram cartões** (nome da coluna + valor), com botões Editar/Excluir por cartão; tabelas muito largas continuam rolando na horizontal.
- **Botão flutuante "Novo registro"**, acima do menu inferior.
- **Formulários e janelas em tela cheia**, com campos de 44 px (16 px de letra, sem zoom automático no iPhone) e botões fixos na base.
- **Toque confortável:** alvos de 44–48 px; respeita a área do entalhe (notch) e da barra de gestos.
- **Indicadores em 2 colunas**; gráficos em coluna única.
- **Cronograma (Gantt):** textos de apoio recolhidos para o gráfico subir; dica para virar o aparelho quando está em pé.

## Vertical e horizontal
- **Em pé:** menu na base. **Deitado:** o menu vira uma **barra lateral esquerda**, a barra superior encolhe, indicadores em 4 colunas e formulários em 2 colunas. A troca é automática ao girar o aparelho.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_29_0_0_Smartphone.zip
cd ObraTop_V3.29.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt`, limpe o service worker (F12 → Application → Unregister; Storage → Clear site data) e recarregue com Ctrl+Shift+R. No celular: feche e abra o aplicativo (ou limpe os dados do site) para pegar a versão nova.

## Testes
`npm test` (44 testes, 8 novos da decisão computador/smartphone) e o simulador de navegador: **46 verificações novas de smartphone** (celular em pé 390×844 e deitado 844×390, toque, gaveta, filtros, cartões, formulário, giro, alternância, moldura no computador, Configurações, sem estouro de largura) e **todos os testes anteriores** continuam passando. Simulação feita no Chromium com emulação de celular. **Não testado em aparelho real** (iPhone/Android), nem em tablets; o comportamento do entalhe/barra de gestos depende do aparelho.

## Reversão
Republique o pacote 3.28.0.0. Nenhum dado é afetado.
