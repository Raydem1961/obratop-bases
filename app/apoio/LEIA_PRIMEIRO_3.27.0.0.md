# ObraTop 3.27.0.0 — logo da empresa e PDF padronizado

Hosting no plano gratuito. **Não exige mudança nas regras do Firestore**: o logo fica no documento da empresa, que o administrador já pode alterar.

## Logo da empresa
- **Onde cadastrar:** Configurações → cartão **Logo da empresa** (somente o administrador). Escolha um PNG ou JPG de até 5 MB; o app confere o arquivo, reduz para no máximo 480×160 px, mostra a pré-visualização e só grava quando você clica em **Salvar logo**. **Remover logo** apaga.
- **Onde aparece:**
  - cabeçalho de **todas as telas** do app, ao lado da marca ObraTop;
  - **tela de entrada** (usa o logo da última empresa que entrou neste navegador, guardado só neste aparelho);
  - **impressão** de qualquer tela e dos relatórios (cabeçalho com logo, empresa, CNPJ, título e data);
  - **PDF** exportado de qualquer módulo, em todas as páginas;
  - **Word (.doc)** exportado (o logo vai incorporado; **o Word pode não exibir imagens incorporadas em arquivos .doc**).
  - **Não aparece** em Excel e CSV (formatos sem imagem).
- **Segurança:** só PNG e JPG; SVG, GIF e WebP são recusados; o tipo é conferido pelo conteúdo, imagens acima de 6000×6000 px são recusadas antes de abrir, e o app só exibe logos que ele mesmo gerou (qualquer valor estranho gravado no banco é ignorado).
- **Cadastro da empresa:** o CNPJ e o nome que aparecem nos relatórios vêm do cadastro da empresa.

## PDF padronizado
Todo PDF exportado agora tem cabeçalho (logo, empresa, CNPJ, data), título, filtro de obra e quantidade de registros, tabela com colunas proporcionais ao conteúdo, títulos repetidos a cada página, colunas totalmente vazias omitidas, e rodapé "Empresa — ObraTop versão" com **Página x de y**. O marcador de dados para reimportação no ObraTop foi mantido.

## O que ainda falta da 3.27 (próximas entregas)
Modelos de obra, assistente de nova obra e edição em lote. Esta entrega cobre o logo e a padronização dos PDFs.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_27_0_0_Logo_PDF_Padronizado.zip
cd ObraTop_V3.27.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test` roda 26 testes automáticos (inclui logo, tamanhos, PDF com várias páginas). O simulador (`tests/simulador`, `t_logo.py`) cobre o envio, as recusas, o cabeçalho em 8 telas, a impressão, o PDF (logo em cada página, acentos, rodapé), o Word e a tela de entrada. **Nada foi testado no Firebase real, em impressora real ou no Word.**

## Reversão
Republique o pacote 3.26.0.0. O logo gravado fica sem uso e não atrapalha.
