# ObraTop 3.29.1.0 — Engº Responsável no relatório executivo

Hosting no plano gratuito, sem mudança nas regras do Firestore. Só o relatório executivo e o cadastro de obras foram alterados.

## O que mudou
- **Relatório executivo** (Relatórios → "Executivo da obra" → Excel, Word, PDF ou CSV): a coluna **"Obra"** foi substituída por **"Engº Responsável"**, com o nome do engenheiro da obra de cada linha. No **PDF**, ela é sempre a **última coluna**. O título do PDF, do Word e a aba do Excel passam a se chamar **"Relatório executivo"**.
- **Cadastro de obras:** novo campo **"Engº Responsável"** (formulário, tabela de Obras e importação por planilha, com o cabeçalho "Engº Responsável").
- **Assistente de nova obra:** pergunta o Engº Responsável já no primeiro passo.
- **Configurações → Empresa:** campo **"Engº responsável padrão"** (só o administrador altera). É usado nos relatórios para as obras que **não** têm engenheiro cadastrado e para linhas sem obra (ex.: fornecedores).
- Os demais relatórios (Financeiro, Medições, Orçamento etc.) **não mudaram** e continuam com a coluna "Obra".

## Como preencher
1. Em **Configurações → Empresa**, informe o engenheiro padrão e clique em Salvar.
2. Para obras com outro engenheiro: **Obras → Editar** e preencha "Engº Responsável".

## Observação
No relatório executivo, as linhas dos demais módulos (medições, financeiro etc.) deixam de mostrar o nome da obra, como pedido; o nome continua nas linhas do módulo Obras. Se quiser as duas colunas, basta pedir.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_29_1_0_Engenheiro_Responsavel.zip
cd ObraTop_V3.29.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test` (45 testes) e o simulador: **17 verificações novas** (CSV, PDF, Excel e Word do relatório executivo; engenheiro da obra e padrão; demais relatórios inalterados; Configurações; assistente) e todos os testes anteriores passando. **Não testado** no Firebase real: se as regras do Firestore recusarem o novo campo "engineer" em obras, o app mostrará "permissão negada" ao salvar.

## Reversão
Republique o pacote 3.29.0.0.
