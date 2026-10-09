# ObraTop 3.34.2.0 — correção da gravação do orçamento e letra maior

## 1) Correção: "Não foi possível gravar: ... Nested arrays are not supported"
**Causa:** ao gravar o orçamento com composição analítica, o campo `cpu` era enviado ao Firestore como lista de listas, formato que o Firestore não aceita. Nada foi gravado (a operação é atômica por lote), portanto não ficou orçamento pela metade.
**Correção:** o campo `cpu` agora é uma lista de objetos (`t` tipo, `c` código, `d` descrição, `u` unidade, `k` coeficiente, `p` preço).
**Por que os testes não pegaram:** o Firestore simulado dos testes não validava o formato. Ele agora recusa listas aninhadas e valores indefinidos, igual ao Firestore real, e todos os testes foram refeitos com essa validação.
**O que fazer:** abra o orçamento de novo (o rascunho foi guardado) e clique em "Salvar e gerar planejamento".

## 2) Letra maior
Novo padrão **grande** (+12%: texto 15,7 px; tabelas, menu, botões, filtros e totais acompanham). Botão **"🔠 Letra: grande"** na faixa de versão alterna **normal** (como antes) → **grande** → **extra grande** (+26%); a escolha fica guardada no aparelho. O cabeçalho fixo e a tabela continuam funcionando nos três tamanhos.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_34_2_0_Correcao_Gravacao_Letra.zip
cd ObraTop_V3.34.2.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois limpe o service worker (F12 → Application → Unregister; Storage → Clear site data). Reversão: republique a 3.34.1.0 (que tem o defeito de gravação).
