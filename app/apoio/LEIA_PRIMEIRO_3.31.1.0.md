# ObraTop 3.31.1.0 — correção da importação do SINAPI (preços em centavos)

## O que foi corrigido
Relato: depois de importar o ZIP real da CAIXA, os preços apareciam como centavos (ex.: piso industrial a R$ 0,18/m²) e alguns itens vinham com código "0".
**Causa:** o ZIP mensal do SINAPI traz **vários arquivos** (Referência, Famílias e Coeficientes, Manutenções, Percentual de Mão de Obra). O leitor também lia o arquivo de **percentual de mão de obra** (valores entre 0 e 1) e tratava o percentual como preço. Alguns códigos de composição também são fórmulas do Excel, que o navegador não calcula (ficavam "0").
**Agora:**
- só a planilha de **Referência** é lida (arquivos de famílias, manutenções, percentual de mão de obra, catálogo e "leia-me" são ignorados);
- só as abas oficiais **ISD, ICD, ISE, CSD, CCD e CSE** são usadas;
- uma coluna cujos valores estão quase todos entre 0 e 1 é **recusada** como "parece percentual" (e, sem rótulo de preço, a coluna da UF só é aceita em abas oficiais);
- códigos vazios ou "0" são descartados e **códigos que são fórmula são recuperados** da própria fórmula;
- itens repetidos (mesmo código e descrição) são unificados;
- importar um arquivo com várias abas **substitui** a base daquela UF/mês (não mistura com a importação antiga);
- se a mediana dos preços importados ficar abaixo de R$ 2, o app **avisa**;
- novo botão **Diagnóstico da última importação**: lista os arquivos usados/ignorados, as abas, de qual coluna veio o preço e exemplos, com **Copiar diagnóstico**.

**O que fazer:** em Orçamentos > Criar novo orçamento > SINAPI, clique em **Excluir base** (apaga a importação errada) e **importe o ZIP de novo**. Se ainda ficar estranho, abra "Diagnóstico da última importação", copie e envie.

---

# (versão anterior 3.31.0.0) Orçamentos: "Criar novo orçamento" (SINAPI, ORSE e itens próprios)

Hosting no plano gratuito, sem mudança nas regras do Firestore. Em **Orçamentos** agora há duas sub-abas: **Orçamentos** (a lista de sempre) e **Criar novo orçamento**.

## Como usar
1. **Dados:** nome do orçamento, obra, etapa/categoria e BDI (%).
2. **Base de preços:** duas caixas de seleção, **SINAPI** e **ORSE** (pode marcar as duas e misturar itens).
   - **SINAPI:** botão **Abrir o site da CAIXA** + links diretos dos ZIPs mensais (XLSX e PDF dos 3 últimos meses). Baixe o ZIP **XLSX**, clique em **Importar arquivo** (aceita **XLSX, ZIP, CSV e PDF**). O ObraTop extrai só a **UF escolhida (Bahia por padrão)**, nos três regimes (**não desonerado, desonerado e sem encargos**), e guarda no aparelho.
   - **ORSE:** botão **Ir para o download do ORSE** (página oficial da CEHOP-SE), mais a consulta online. Exporte do ORSE 2 em Excel/CSV/PDF e use **Importar arquivo**.
3. **Buscar:** por código ou palavras da discriminação, em **Composições** ou **Insumos**. Informe a quantidade e clique em **Adicionar** (o mesmo item adicionado de novo soma a quantidade).
4. **Planilha do orçamento:** cada linha mostra **código, discriminação, unidade, quantidade, preço unitário e preço total** (quantidade e preço são editáveis). Abaixo: **subtotal, BDI e total do orçamento**, recalculados na hora.
5. **Itens próprios:** "Adicionar item próprio" para suas composições.
6. **Salvar orçamento na obra** (grava um item em Orçamentos para cada linha, com código, fonte e referência), **Exportar Excel** ou **Exportar PDF** (PDF com o cabeçalho da empresa). O rascunho é guardado automaticamente.

## Atualização automática da base Bahia
O navegador **não pode** baixar direto do site da CAIXA (o site bloqueia acesso automático e a segurança do ObraTop só permite conexão com o próprio sistema e o Firebase). Duas formas, que podem ser combinadas:
- **Por aparelho:** importar o ZIP baixado do site (acima).
- **Para todos os aparelhos, uma vez por mês, no Cloud Shell:**
```
cd ~/ObraTop_V3.31.1.0
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
node tools/sinapi/atualizar-sinapi.mjs --uf BA
firebase deploy --only hosting --project obratop-v3-teste
```
Depois, em qualquer aparelho, **Carregar base do servidor**. Se o download automático for bloqueado, baixe o ZIP no site e use `--arquivo CAMINHO.zip`. Detalhes em `tools/sinapi/LEIA-ME.txt`.

## O que pesquisei (e como Orçafascio e Sienge fazem)
- **Orçafascio:** mantém o SINAPI (e ~20 bases oficiais, entre elas o ORSE) **hospedado na nuvem deles, atualizado todo mês**; o usuário seleciona base, UF, mês e desoneração; permite **banco próprio**, **importar/exportar bases e orçamentos em Excel**, copiar itens entre orçamentos, curva ABC e comparador de orçamentos.
- **Sienge:** integra a tabela SINAPI atualizada e orienta a manter um **banco de composições próprio** atualizado todo mês; também trabalha com planilhas Excel.
- Ou seja, o "automático" deles vem de um servidor próprio que baixa e converte os arquivos oficiais todo mês. No plano gratuito do Firebase não há servidor para isso; por isso a conversão roda por script (Cloud Shell) e o resultado é publicado no seu Hosting.
- **SINAPI (CAIXA):** desde 2025 os relatórios saem em 2 ZIPs mensais (XLSX e PDF) com todas as UF; o XLSX tem as abas ISD/ICD/ISE (insumos) e CSD/CCD/CSE (composições); o ZIP segue o padrão `.../sinapi-relatorios-mensais/SINAPI-AAAA-MM-formato-xlsx.zip`.
- **ORSE (CEHOP-SE):** `https://orse.cehop.se.gov.br/downloads.asp` oferece o sistema ORSE 2 e as atualizações da base por ano; a consulta online fica em `servicos.asp`. Não há planilha pronta no site: exporta-se pelo ORSE 2.

## Limites (leia)
- **O layout real do arquivo da CAIXA não pôde ser conferido** (o site bloqueia leitura automática). O leitor foi construído pela documentação publicada e testado com arquivos que imitam os layouts conhecidos. Se não reconhecer as colunas, abre a tela **Conferir colunas da planilha** para você indicar código, discriminação, unidade e preço.
- **PDF** depende do leitor de PDF carregado pela internet e pode errar em relatórios com colunas muito compactas; prefira XLSX ou CSV.
- **Composições analíticas** (insumos e coeficientes de cada composição) **ainda não** são importadas: o orçamento usa o **custo total** de cada composição.
- As bases ficam **neste aparelho** (IndexedDB); outros aparelhos precisam importar ou usar "Carregar base do servidor".
- Confira sempre a **referência (mês)** e o **regime de desoneração** antes de usar preços em licitação.
- Se as regras do Firestore recusarem os campos novos dos itens de orçamento (budgetName, source, sourceCode, sourceRef), o app mostrará "permissão negada" ao salvar.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_31_1_0_Correcao_Importacao_SINAPI.zip
cd ObraTop_V3.31.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test`: 67 testes automáticos (inclui leitura real de ZIP/XLSX do SINAPI, ORSE em XLSX/CSV, o script mensal, busca, totalização). Simulador: **46 verificações novas** da sub-aba (caixas SINAPI/ORSE, links oficiais, importação, busca, totalização, gravação, Excel, PDF, base do servidor, perfil Consulta, celular) e todos os testes anteriores passando. **Não testado** com o arquivo real da CAIXA nem contra o site da CAIXA/ORSE.

## Reversão
Republique o pacote 3.30.0.0.
