# ObraTop 3.24.2.0 — medidas da auditoria (plano gratuito)

Tudo nesta versão roda no plano gratuito do Firebase: Hosting, Firestore e Authentication. Nada usa Cloud Functions nem recurso que exija o plano pago.

## O que mudou (os códigos são os do relatório de auditoria)

| Código | Medida |
| --- | --- |
| F1 | Alertas passam a avisar contrato, documento e manutenção **já vencidos** (antes só avisavam antes do prazo). Contrato "Encerrado" e equipamento em manutenção não alertam. |
| F2 | **Avanço único da obra**: painel, gráfico "Avanço físico por obra" e tabela de obras usam o avanço calculado pelo cronograma. Obra sem cronograma continua usando o percentual digitado. |
| F3 | **Vínculos opcionais entre registros**: pedido → material do estoque e quantidade; medição → contrato; financeiro → medição, pedido e contrato. Botões **Gerar receita** (medição aprovada, faturada ou paga) e **Gerar despesa** (pedido aprovado ou entregue) abrem o lançamento já preenchido. O app avisa se já existe lançamento vinculado e recusa vínculo com registro de outra obra. |
| F4 | Pedido com material e quantidade: botão **Receber no estoque** soma ao saldo, marca o pedido como Entregue e registra auditoria (só uma vez). O ressuprimento **desconta pedidos em aberto**; o alerta vira "Reposição já pedida — acompanhar entrega". |
| F5 | Situação calculada pela data nas tabelas (financeiro, contratos, documentos): mostra "Vencido (pela data)" sem alterar o registro. Tabelas de medições, financeiro, contratos e obras ganharam a coluna de situação. |
| F6 | Curva S: ponto do dia inclui o **valor medido**. |
| F7 | Campos numéricos aceitam qualquer casa decimal (ex.: 12,345 m³). |
| F8 | Auditoria de edição guarda **só o que mudou, com o valor anterior e o novo**. |
| P1 | A Curva S **deixa de ser regravada a cada alteração** de qualquer usuário: grava na abertura e quando o próprio usuário salva, e só se os valores mudaram. |
| P2 | Auditoria lida com limite de 300 registros (antes baixava a coleção inteira). |
| S1 (parcial) | Salário oculto para o usuário de obra (tela, formulário e exportações). **Não é a correção definitiva**: a leitura continua liberada pelas regras e a Curva ABC de pessoal ainda usa os salários. Ver "Pendências". |
| S2 | **E-mail verificado** antes de criar empresa ou aceitar convite: o app envia o e-mail de verificação e mostra o aviso. Quem já é membro não é afetado. |
| S5 | jsPDF hospedado no próprio app; SheetJS 0.20.3 hospedado (baixado pelo script de publicação) com reserva no endereço oficial fixado; política de segurança restringe os scripts de terceiros a endereços exatos. |
| U2 | O app lembra a obra selecionada no filtro. |
| U6 | O backup externo registra data e checksum na organização; o lembrete passa a valer para todos os computadores. |
| C2, C3 | Pacote enxuto (sem cópias duplicadas de `app.js`), script que confere a versão antes de publicar. |
| — | A aba **Manual e Implantação** atualiza a contagem do checklist a cada sincronização. |

## Como publicar (somente Hosting)

1. No ObraTop, faça o **Backup profissional** (Relatórios).
2. **Windows:** extraia o ZIP e dê dois cliques em `PUBLICAR_OBRATOP_3.24.2.0.cmd`. O script confere a versão, baixa o SheetJS oficial para `public\vendor` e publica.
3. **Cloud Shell:** envie o ZIP e rode:

```
unzip -o ObraTop_V3_24_2_0_Auditoria_Plano_Gratuito.zip
cd ObraTop_V3.24.2.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
ls -l public/vendor
firebase deploy --only hosting --project obratop-v3-teste
```

O `grep` deve mostrar `3.24.2.0` e o `ls` deve listar `xlsx.full.min.js` com cerca de 900 KB. Se o `curl` falhar, pode publicar mesmo assim: o app usa o endereço oficial como reserva.

## Como conferir depois de publicar

1. `https://obratop-v3-teste.web.app/RELEASE.txt` mostra **3.24.2.0**.
2. Na aba do ObraTop: F12 → Application → Service Workers → Unregister; Storage → Clear site data; Ctrl+Shift+R. O chip do painel mostra **V3.24.2.0**.
3. Painel: o "avanço médio" agora vem do cronograma.
4. Alertas: contratos, documentos e manutenções vencidos aparecem em vermelho.
5. Compras: crie um pedido com material e quantidade e use **Receber no estoque**; confira o saldo em Estoque.
6. Medições: em uma medição aprovada, **Gerar receita** abre o lançamento preenchido.
7. Selecione uma obra no filtro, recarregue a página e confirme que ela continua selecionada.
8. Exportar Excel/PDF/CSV continua funcionando.

## Regras do Firestore (opcional, depois)

Estão em `regras-propostas/`, **não publicadas** e **não testadas em emulador**. Leia `regras-propostas/LEIA-ME-REGRAS.txt` e teste no Simulador de Regras antes de publicar. Publique só depois de esta versão estar no ar.

## Pendências que dependem de você ou do plano pago

- **S1 (leitura entre obras):** o usuário de obra ainda lê os dados de todas as obras pelas regras. Decida se isso é intencional; se não for, a correção exige mudar regras e consultas.
- **Alertas por e-mail e backup agendado:** exigem Cloud Functions (plano pago). Não incluídos.
- **Paginação, curva S ponderada por custo, divisão do `app.js` em módulos:** trabalho maior, fora desta versão.

## Reversão

Republique o pacote anterior (3.24.1.1). Os campos novos (`inventoryId`, `qty`, `measurementId`, `orderId`, `contractId`, `lastExternalBackup`) ficam sem uso e não atrapalham.

## Como foi testado

O app inteiro rodou num navegador com um Firebase simulado em memória (`tests/simulador`): 27 telas sem erro, 29 verificações de fluxo, 17 de segurança e a política de segurança ativa sem violações; teste de cálculos da economia (25 verificações). **Não foi testado contra o Firebase real nem contra as regras publicadas.**
