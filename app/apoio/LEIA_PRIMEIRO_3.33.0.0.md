# ObraTop 3.33.0.0 — menu por fluxo de trabalho e cabeçalho fixo

Hosting no plano gratuito, sem mudança nas regras do Firestore. Mudança só de navegação e aparência.

## 1) Menu lateral na ordem de preenchimento e fluxo
- **Início:** Painel executivo, Alertas
- **1 · Configuração inicial:** Configurações (dados da empresa, logo), Equipe (usuários e acessos)
- **2 · Cadastros:** Obras, Contratos, Fornecedores, Pessoal, Documentos
- **3 · Projeto e planejamento:** Projetos e Quantitativos, Orçamentos, Cronograma
- **4 · Suprimentos:** Compras, Estoque
- **5 · Execução da obra:** Diário de Obra, Equipamentos, Qualidade, Segurança
- **6 · Medição e financeiro:** Medições, Financeiro, Economia e Equilíbrio
- **7 · Controle e relatórios:** Curvas S e ABC, Relatórios
- **Administração:** Auditoria, Lixeira, Integridade e manutenção, Manual e Implantação, Direitos Autorais
As 28 telas continuam as mesmas; só a ordem e os títulos dos grupos mudaram. No celular, a gaveta "Mais" segue a mesma ordem.

## 2) Cabeçalho fixo em todas as abas
Ao rolar a página, ficam sempre à vista, um abaixo do outro: **faixa de versão/ambiente/atualização → filtros → título e botões de ação → sub-abas → total → cabeçalho das colunas da tabela** (como no bloco que você marcou na tela de Orçamentos).
- Botão **"📌 Cabeçalho fixo"** (canto superior direito da faixa de versão) liga/desliga; a escolha fica guardada no aparelho.
- **Telas baixas** (notebook): o cabeçalho fixo nunca passa de ~46% da altura; o que não cabe (sub-abas, total, título) deixa de fixar e fica só o essencial (versão e filtros). Em telas altas aparece tudo.
- Tabelas muito largas passam a rolar dentro de uma área própria, para manter o cabeçalho das colunas visível.
- **Celular e janelas estreitas (< 900 px):** não se aplica (layout próprio do smartphone).

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_33_0_0_Menu_Fluxo_Cabecalho_Fixo.zip
cd ObraTop_V3.33.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test` (90) e simulador: 14 verificações novas (ordem do menu, rolagem real nas 28 telas, Orçamentos, Financeiro, botão de fixar, tela baixa e celular) e todos os testes anteriores passando. Reversão: republique a 3.32.2.0.
