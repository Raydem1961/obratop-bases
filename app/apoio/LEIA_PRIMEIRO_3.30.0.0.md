# ObraTop 3.30.0.0 — faixa de versão, gráficos e cabeçalho da empresa

Hosting no plano gratuito, sem mudança nas regras do Firestore.

## 1) Faixa de versão em todas as telas
No topo de **todas as abas** (28 telas, no computador e no celular) aparece: **ObraTop V3.30.0.0 · Homologação (ou Produção) · Atualizado em 08/10/2026**. Antes só existia no Painel executivo. O selo "Homologação" é amarelo e "Produção" é verde.

## 2) Gráficos de fluxo de caixa com valores
- **Fluxo de caixa mensal** (linhas): o valor de receitas (verde) e de despesas (vermelho) aparece em cada mês, abreviado em R$ ("50 mil", "1,2 mi"). O valor completo continua ao passar o mouse.
- **Fluxo de caixa da leitura financeira da obra** (colunas): cada coluna de recebimentos e de pagamentos mostra o valor, na vertical.
- Há uma nota sob cada gráfico explicando as abreviações.

## 3) Curva S
As duas linhas (planejado e realizado) passam a ter **4 px**, a mesma espessura do fluxo de caixa mensal, nas cores **laranja vivo (planejado)** e **azul vivo (realizado)**, com marcadores maiores, legenda e rótulos finais nas mesmas cores.

## 4) Cabeçalho da empresa em relatórios e impressões
- **Configurações → Empresa:** novos campos **CNPJ** (formata sozinho), **Endereço**, **Telefone de contato**, **E-mail** (validado) e o Engº responsável padrão. Botão "Salvar dados da empresa" (só o administrador).
- **Onde o cabeçalho aparece:** logomarca, nome, CNPJ, endereço, telefone e e-mail em:
  - **qualquer página impressa** (Ctrl+P ou botão Imprimir): cabeçalho **repetido em todas as páginas**, com título, data/hora e versão/ambiente;
  - **PDF exportado** de qualquer módulo e do relatório executivo (em todas as páginas);
  - **Word (.doc)** exportado.
- A impressão também ficou mais limpa: sem colunas de seleção e de ações, fundo branco e tabela na largura da folha.
- **Excel e CSV** não têm cabeçalho (formatos sem imagem e usados para reimportar dados).
- **Navegadores:** a repetição em todas as páginas usa as margens da página (Chrome e Edge 131 ou mais novos). Em navegadores antigos, o cabeçalho aparece em quase todas as páginas, exceto a última.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_30_0_0_Cabecalho_Graficos.zip
cd ObraTop_V3.30.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt`, limpe o service worker (F12 → Application → Unregister; Storage → Clear site data) e recarregue com Ctrl+Shift+R.

## Testes
`npm test` (47 testes) e o simulador: **27 verificações novas** (faixa nas 28 telas nos dois ambientes e no celular, valores dos gráficos, Curva S, dados da empresa, impressão real em PDF com 15 páginas e cabeçalho em todas, PDF e Word) e todos os testes anteriores passando. **Não testado** no Firebase real nem numa impressora; se as regras do Firestore recusarem os novos campos da empresa (companyAddress, companyPhone, companyEmail), o app mostrará "permissão negada" ao salvar.

## Reversão
Republique o pacote 3.29.1.0.
