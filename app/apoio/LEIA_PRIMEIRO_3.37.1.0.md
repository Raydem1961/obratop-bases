# ObraTop 3.37.1.0 — botão "Atualizar aplicativo"

Hosting no plano gratuito, sem mudança nas regras do Firestore.

## O que é
Na **faixa de versão** (topo de todas as telas) há o botão **🔄 Atualizar aplicativo**. Ele dispensa o F12 para pegar a versão nova:
1. cancela o service worker do ObraTop;
2. apaga **somente** os caches do aplicativo (`obratop-…`), sem tocar nos de outros sites;
3. recarrega a página já com os arquivos novos.

**Mantidos:** bases SINAPI/ORSE importadas (IndexedDB), rascunhos de orçamento e preferências (letra, cabeçalho fixo) — ficam no navegador e não são apagados.
**Aviso de versão nova:** o aplicativo compara a versão em uso com a publicada (ao abrir e a cada 30 minutos). Se houver uma mais nova, o botão fica **destacado em laranja** como “🔔 Nova versão X — Atualizar”.
**Sem internet:** o botão recusa e explica (apagar o cache sem conexão deixaria o aplicativo sem abrir).

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_37_1_0_Botao_Atualizar.zip
cd ObraTop_V3.37.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
**Observação:** a 3.37.0.0 e anteriores ainda não têm o botão; para pegar **esta** versão faça uma última vez o procedimento manual (F12 → Application → Service Workers → Unregister; Cache storage → excluir; Ctrl+Shift+R). A partir da 3.37.1.0, use o botão.
Reversão: republique a 3.37.0.0.
