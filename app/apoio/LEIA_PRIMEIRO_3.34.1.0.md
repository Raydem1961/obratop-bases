# ObraTop 3.34.1.0 — total em destaque

O "Total R$ ..." da tela de Orçamentos (e totais parecidos de outras telas) passa de 12 para **18 px**, em negrito, verde escuro sobre verde claro (contraste 7,2:1 no tema claro e 8,5:1 no escuro). Etiquetas em geral passam de 12 para 13 px. O total continua fixo no topo ao rolar.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_34_1_0_Total_Destaque.zip
cd ObraTop_V3.34.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois limpe o service worker (F12 → Application → Unregister; Storage → Clear site data). Reversão: republique a 3.34.0.0.
