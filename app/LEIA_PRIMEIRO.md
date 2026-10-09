# ObraTop 3.39.3.0 — barras de rolagem padronizadas

Hosting no plano gratuito, sem mudança nas regras do Firestore.

## O que mudou
1. **Cronograma:** a barra de rolagem horizontal da **tabela** (esquerda) agora tem o mesmo visual e o mesmo comportamento da barra da **linha do tempo** (direita): as duas ficam **fixas na base da tela**, lado a lado, sincronizadas com a rolagem de cada lado. A barra cinza que ficava no fim da tabela foi substituída. Nº, EAP e Nome da tarefa continuam fixos. Em notebook a tabela passa a ocupar cerca de metade da largura (não há mais rolagem lateral da página inteira).
2. **Todas as outras telas com tabelas** (Financeiro, Compras, Estoque, Obras, Medições, Contratos, Equipe, Orçamentos, relatórios…): quando a tabela é mais larga que a tela, aparece a mesma barra horizontal **fixa na base da janela**, com o mesmo visual. Quando a tabela cabe, nada aparece.
3. **Vertical:** as tabelas não têm mais barra vertical própria; quem rola é a página, e o **cabeçalho das colunas acompanha a rolagem** logo abaixo do bloco congelado (versão, filtros, título, totais).
4. No celular (tabelas em cartões) nada muda.
5. Manual técnico: bullet novo no capítulo de interface.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_39_3_0_Barras_Rolagem.zip
cd ObraTop_V3.39.3.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois use o botão **Atualizar aplicativo** (faixa de versão). Reversão: republique a 3.37.1.0.

## Observação
A 3.37.2 (apenas a barra do Gantt) não foi publicada separadamente: está incluída nesta versão.
