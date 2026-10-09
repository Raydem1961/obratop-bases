# ObraTop 3.32.1.0 — correção da importação do SINAPI (preços e códigos)

**Relato:** na busca, o mesmo serviço aparecia duas vezes: uma linha com código real e preço de centavos (ex.: 98459, R$ 0,42) e outra com código "0" e preço plausível (R$ 98,28).
**Causa:** as linhas com código e valores 0,xx eram **percentuais** do arquivo de mão de obra do ZIP (importação antiga); as de código "0" eram composições do CSD cujo código é **fórmula do Excel** (valor guardado 0).
**Agora:** o arquivo de percentual é ignorado (3.31.1) e as composições com código "0" **recuperam o código pelo nome e unidade na aba Analítico**; as que não têm correspondência única são descartadas (o diagnóstico informa quantas).

**O que fazer (obrigatório):** em Orçamentos > Criar novo orçamento > SINAPI, clique em **Excluir base** e **importe o ZIP XLSX de novo**. A base antiga continua guardada no navegador com os erros até ser excluída. Depois confira o "Diagnóstico da última importação": deve haver a linha "Códigos que vinham como fórmula (0): N recuperados...".

---

# ObraTop 3.32.1.0 — orçamento por etapas, composições analíticas e planejamento

Hosting no plano gratuito, sem mudança nas regras do Firestore.

## Passo a passo
1. **Orçamentos > Criar novo orçamento.** Informe nome, obra e BDI. Importe o ZIP **XLSX** do SINAPI (precisa conter a aba **Analítico** para ter composições analíticas).
2. **Etapas** (antes da busca): crie as etapas (1.0, 2.0…) ou use "etapas padrão de edificação". Escolha a **etapa ativa** e, se quiser, uma **sub-etapa** (ex.: 3.2 Sapatas, com serviços 3.2.1, 3.2.2).
3. **Buscar e adicionar** serviços. Cada um entra na etapa ativa, numerado (1.1, 2.1.1…). O botão **Composição** mostra a CPU (insumos e composições auxiliares com coeficiente, preço e custo).
4. **Saídas:** Planilha orçamentária (PDF e Excel, no modelo ITENS / CÓD. / DESCRIÇÃO / UNID / QUANT / PR. UNIT / PR. TOTAL, com TOTAL e "Valor da obra" por extenso) e Composições analíticas (PDF e Excel).
5. **Salvar e gerar planejamento:** grava o orçamento, cria a **EAP e o Cronograma (Gantt)** (uma atividade por serviço, agrupadas por etapa, com predecessoras) e a linha de base R1.
6. **Orçamentos > Planejamento e quantitativos:** EAP e cronograma, **Curva S** (previsto x realizado), **Curvas ABC** de materiais, mão de obra e equipamentos, **quantitativos** de materiais, mão de obra (horas e efetivo médio) e equipamentos (consolidados ou por serviço, com "mês a mês" previsto x realizado) e **Lançar realizado** (quantidade executada de cada serviço no mês). Tudo exporta em Excel.

## Como é calculado
- **Insumos:** cada composição é desdobrada em insumos. Hora de servente/pedreiro com encargos = mão de obra; hora de equipamento (CHP/CHI) = equipamento; demais = material. Composições auxiliares (ex.: argamassa) são abertas até os insumos.
- **Duração dos serviços:** proporcional às **horas de mão de obra** da composição (ou ao custo, sem composição), ajustada ao prazo. É estimativa de planejamento: revise no Cronograma.
- **Previsto mês a mês:** a quantidade de cada serviço é distribuída pelos dias úteis da atividade. **Realizado:** quantidade executada que você lança por mês; os quantitativos e a curva S realizados saem dos coeficientes.
- **BDI:** na planilha impressa o preço unitário já inclui o BDI e é arredondado em centavos (como no modelo); os totais internos do app não arredondam o preço unitário, então pode haver diferença de poucos reais.

## Limites
- **ORSE e itens próprios** não têm composição analítica nesta versão (entram como "sem CPU"; nas curvas ABC aparecem em "Outros").
- O leitor do **Analítico** foi conferido com capturas do arquivo real 08/2026 (cabeçalho na linha 10; título da composição com item em branco; itens com coeficiente). Se algo não reconhecer, use "Diagnóstico da última importação".
- O Planejamento considera os itens criados por "Criar novo orçamento" ou ligados a atividades; itens avulsos antigos ficam de fora (o app avisa).
- Se as regras do Firestore recusarem os campos novos dos orçamentos e atividades, o app mostrará "permissão negada" ao salvar.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_32_1_0_Correcao_Codigos_SINAPI.zip
cd ObraTop_V3.32.1.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data). **Reimporte o ZIP do SINAPI** (Excluir base + Importar) para carregar a aba Analítico.

## Testes
`npm test` e simulador: 45 verificações novas do fluxo completo e todas as anteriores. Reversão: republique o pacote 3.31.1.0.
