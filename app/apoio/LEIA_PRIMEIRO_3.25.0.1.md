# ObraTop 3.25.0.1 — custos de verdade, cronograma e proteção

**3.25.0.1 (correção):** o selo ao lado da versão passa a mostrar **Homologação** quando o projeto do Firebase tem "teste", "test", "homolog", "stag", "dev" ou "sandbox" no nome (ex.: obratop-v3-teste) e **Produção** nos demais. A data "Atualizado em" deixou de ser um texto fixo de setembro e agora vem da constante `RELEASE_DATE` do `app.js` (07/10/2026 nesta versão). **A cada nova versão, atualize `RELEASE`, `RELEASE_DATE` e o `CACHE` do `sw.js`.**


Hosting continua no plano gratuito. Esta versão **não exige nenhuma mudança nas regras do Firestore** para funcionar. As regras novas (perfil Consulta, leitura por obra) estão em `regras-propostas/` e são opcionais.

## Cronograma (pedido seu)
- **Cabeçalho congelado:** ao rolar a página, a linha EAP / Atividade / Início / Fim / Dias / Avanço / Qtd. / Predecessoras / Resp. e a linha de ano, mês e dia ficam logo abaixo dos filtros, sempre visíveis. Não passam do fim da tabela.
- **Vincular ao orçamento:** liga cada atividade ao item do orçamento de mesmo nome (botão visível ao administrador, com uma obra selecionada). Com 100% das atividades vinculadas, o avanço e a Curva S passam a ser ponderados pelo **custo do orçamento**; a legenda do cronograma diz qual ponderação está valendo.
- **Congelar linha de base:** guarda as datas atuais como linha de base (R1, R2…). Replanejar guarda a anterior no histórico, com motivo, data e usuário. O Gantt mostra uma barra fina cinza da linha de base sob cada barra, e o "planejado" do SPI/IDP e da Curva S passa a vir da linha de base.
- **Exportar MS Project:** gera um XML (formato MSPDI) com hierarquia da EAP, durações, avanço e predecessoras.

## O que foi implantado da lista (A a E)

| Item | Situação |
| --- | --- |
| A1 Medição → item do orçamento e contrato; pedido → material | **Feito** (campos opcionais; o importador resolve o vínculo pelo nome e nunca grava texto como código) |
| A2 Avanço e Curva S por custo, linha de base congelada, replanejamento com histórico | **Feito** |
| A3 CPI/IDC com custo incorrido (competência) | **Feito** (despesas com competência até hoje, pagas ou não, sem as "Previstas") |
| A4 Orçamento com composições, BDI por item, base SINAPI/ORSE | **Parcial**: BDI por item e as bases SINAPI/ORSE (Engenharia Inteligente) já existiam; **composições (insumos por item) não foram feitas** |
| A5 Medição com memória de cálculo, retenção e glosa; aditivos e saldo contratual | **Feito** (valor líquido na tabela, "Gerar receita" usa o líquido; contrato mostra valor vigente com aditivos e saldo; alertas de saldo baixo/negativo) |
| A6 Fluxo de caixa projetado com alerta de estouro | **Feito** (cartão de 6 meses no painel e alerta) |
| B Perfis, leitura por obra, salários, validações, App Check | **Parcial**: perfil **Consulta** (somente leitura) e dados baixados só da obra do usuário já funcionam no app; **as regras que impõem isso no servidor estão propostas, não publicadas e não testadas em emulador**; App Check pronto, falta a sua chave reCAPTCHA; perfis "gestor" e "financeiro" **não foram feitos** |
| C Engenharia de software | **Parcial**: cálculos isolados em `calc.mjs` com 12 testes automáticos; integração contínua (GitHub Actions) e teste de regras no emulador escritos, **não executados aqui**; `app.js` **não foi dividido** e o CSS **não foi reorganizado** |
| D Produto | **Parcial**: exportação MS Project **feita**; "Receber no estoque" e "Gerar despesa" já cobrem parte do fluxo de compras; **Diário de Obra (RDO), modelos de obra, assistente, relatórios PDF padronizados e edição em lote não foram feitos** |
| E Proteção | **Parcial**: ponto de restauração **automático semanal**, **teste de restauração** (leitura + checksum) e alerta se ficar 30 dias sem teste, com retenção definida; **backup externo agendado não é possível no plano gratuito** (precisa de Cloud Functions), segue o lembrete |

## Como publicar (somente Hosting)
1. Backup profissional no ObraTop.
2. **Windows:** `PUBLICAR_OBRATOP_3.25.0.1.cmd`. **Cloud Shell:** envie o ZIP e rode
```
unzip -o ObraTop_V3_25_0_1_Custos_Cronograma_Protecao.zip
cd ObraTop_V3.25.0.1
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
3. Confira `https://obratop-v3-teste.web.app/RELEASE.txt`, limpe o service worker (F12 → Application) e recarregue.

## Como usar o que é novo
- **Cronograma → Vincular ao orçamento → Congelar linha de base.** Faça nessa ordem.
- **Medição:** campos "Retenção contratual (%)", "Glosa (R$)", "Memória de cálculo" e "Item do orçamento". **Contrato:** "Aditivos acumulados" e motivo; para o saldo funcionar, ligue as medições ao contrato.
- **Painel:** cartão "Fluxo de caixa projetado" e, no CPI/IDC, custo incorrido.
- **Perfil Consulta:** Equipe → Incluir usuário → Perfil. **Só funciona depois de publicar as regras novas** (as regras atuais só aceitam "Usuário da obra").
- **App Check:** registre o app no console do Firebase (reCAPTCHA v3), cole a chave em `public/firebase-config.js` (`appCheckSiteKey`), publique e só então ative o "Impor" no console.

## O que não foi verificado
Nada foi testado no Firebase real nem com o MS Project. O simulador do projeto cobre o app (tests/simulador); `npm test` roda os testes de cálculo. As regras novas **não passaram por emulador**: use o Simulador de Regras e o arquivo `tests/rules/firestore.rules.test.mjs` antes de publicar.

## Reversão
Republique o pacote 3.24.3.3. Os campos novos ficam sem uso e não atrapalham.
