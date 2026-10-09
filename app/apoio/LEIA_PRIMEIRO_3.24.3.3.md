# ObraTop 3.24.3.3 — legibilidade, siglas e cronograma

**3.24.3.3:** "Avanço físico por obra" e "Compras por fornecedor" agora mostram o **nome completo** da obra e do fornecedor (o texto quebra em mais de uma linha quando necessário) e usam a mesma letra de "Custos por categoria" (Segoe UI, 12 px). Deixaram de ser desenhos em SVG e passaram a ser texto da página, por isso o tamanho é fixo e não varia com a largura da tela. Os demais gráficos não mudaram.


**3.24.3.2:** as letras de "Avanço físico por obra" e "Compras por fornecedor" ficaram menores (12 unidades do desenho, cerca de 13 px em tela de 1920 px). Os demais gráficos não mudaram.


**3.24.3.1:** ajuste fino pedido após a 3.24.3.0 — as letras de "Avanço físico por obra" e "Compras por fornecedor" ficaram um pouco menores (13,5 unidades do desenho, cerca de 14 px em tela de 1920 px). Os demais gráficos não mudaram. O restante deste guia continua valendo.

Tudo continua no plano gratuito do Firebase (Hosting). Nenhuma regra, dado ou rotina de gravação foi alterada.

## O que mudou

| Pedido | O que foi feito |
| --- | --- |
| Fontes do **Avanço físico por obra** e de **Compras por fornecedor** | Os gráficos de barras horizontais eram desenhados dentro de uma caixa de altura fixa e saíam reduzidos (letras de cerca de 7 px). Agora usam a escala natural: letras de 14 a 18 px, valores com 1 casa decimal (68,2%) e rolagem lateral em telas estreitas. Vale também para os demais gráficos desse tipo (Curvas S e ABC). |
| Siglas com **nomenclatura** | Os indicadores do painel mostram o nome por extenso sob a sigla: SPI / IDP (Índice de Desempenho de Prazo), CPI / IDC (Índice de Desempenho de Custo), EAC (Estimativa no Término), ETC (Estimativa para Terminar) e VAC (Variação no Término), com explicação ao passar o mouse. Um glossário no fim do painel resume todas. Em qualquer tela, siglas como BDI, EAP/WBS, ABC, NC, KPI, p.p., DDS, MFA, SHA-256, SINAPI, ORSE, SICRO, UF, CNPJ, ART, PGR e outras ganham sublinhado pontilhado com o significado ao passar o mouse; em cabeçalhos de tabela, rótulos de formulário e títulos aparece também o nome completo. O cronograma ganhou uma linha "Siglas" (EAP, Dias, Qtd., Predecessoras, Resp.). |
| **Barra horizontal sempre visível** no cronograma | A barra de rolagem da linha do tempo ficava no fim da lista e só aparecia depois de rolar a página inteira. Agora existe uma barra fixa na base da janela, sincronizada com a linha do tempo, visível enquanto qualquer parte do cronograma estiver na tela. Some quando não há o que rolar e não aparece na impressão. |
| **Ponto de atenção** "Calibração do Diagnóstico 3.17.7.1…" | Não era um alerta: era uma nota fixa do cartão "Diagnóstico geral", com um número de versão antigo. A afirmação foi conferida e está correta: o diagnóstico dos dados ignora registros da Lixeira (duplicidades e vínculos só são verificados nos registros ativos) e os avisos de backup têm diagnóstico próprio, no cartão "Proteção e continuidade". O texto foi reescrito sem o número da versão, mostra quantos registros estão na Lixeira e informa que um registro ativo ligado a uma obra da Lixeira continua sendo apontado como vínculo órfão. |

## Como publicar (somente Hosting)

1. Faça o **Backup profissional** no ObraTop.
2. **Windows:** extraia o ZIP e dê dois cliques em `PUBLICAR_OBRATOP_3.24.3.3.cmd`.
3. **Cloud Shell:**

```
unzip -o ObraTop_V3_24_3_3_Legibilidade_Siglas_Cronograma.zip
cd ObraTop_V3.24.3.3
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```

O `grep` deve mostrar `3.24.3.0`.

## Como conferir

1. `https://obratop-v3-teste.web.app/RELEASE.txt` mostra **3.24.3.3**.
2. F12 → Application → Service Workers → Unregister; Storage → Clear site data; Ctrl+Shift+R.
3. Painel: letras maiores nos dois gráficos; siglas com nome sob o valor; glossário no fim.
4. Cronograma (escolha uma obra): barra horizontal na base da janela; arraste e a linha do tempo acompanha.
5. Integridade e manutenção: a nota do cartão "Diagnóstico geral" sem o número 3.17.7.1.

## Reversão

Republique o pacote 3.24.2.0 (ou o 3.24.1.1). Nenhum dado é afetado.

## Como foi testado

No simulador do projeto (`tests/simulador`), com seis obras importadas das planilhas de exemplo: 22 verificações do painel, das siglas, do cronograma e da manutenção; as 27 telas; 29 verificações de fluxo; 17 de segurança. **Não foi testado contra o Firebase real.** A medição do tamanho das letras foi feita no navegador de teste; em telas de 1366 px o gráfico da metade esquerda fica por volta de 14 px.
