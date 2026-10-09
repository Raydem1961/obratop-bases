# ObraTop 3.26.0.0 — siglas no painel, composição de custo, Diário de Obra e perfis

Hosting no plano gratuito. **Esta versão funciona com as regras atuais do Firestore**: o que depende de regras novas fica escondido ou avisa, sem quebrar o app.

## O que mudou
| Item | O que é |
| --- | --- |
| **Campo de siglas** | Agora fica **logo abaixo da linha de indicadores** (Planejado hoje, Realizado, SPI/IDP…), antes dos gráficos. É recolhível e o app lembra se você deixou aberto ou fechado. Os textos vêm do novo módulo `glossary.mjs`. |
| **Composição do orçamento** | Em Orçamentos, o botão **Composição** abre os insumos do item (material, mão de obra, equipamento, outros), com coeficiente × preço. O custo unitário é a soma e, se você marcar, vira o valor unitário do item. A tabela mostra "composição com N insumos". |
| **Diário de Obra (RDO)** | Novo módulo em Operação: clima, dia trabalhável, mão de obra, equipamentos, serviços, ocorrências, atividade principal e avanço acumulado. **"Aplicar ao cronograma"** atualiza o avanço da atividade (com auditoria). **Só aparece quando as regras do Firestore liberam a coleção `dailyLogs`.** |
| **Perfis Gestor e Financeiro** | Gestor: lê e altera todas as obras, sem excluir e sem gerir equipe. Financeiro: lê todas as obras; altera financeiro, medições, contratos, compras e orçamentos; vê salários. O administrador muda o perfil na tela Equipe e convida com o perfil escolhido. **Exigem as regras novas.** |
| **Salários** | Visíveis só ao administrador e ao Financeiro. |
| **Backup externo semanal** | `tools/backup-externo` + `.github/workflows/backup-externo.yml`: o GitHub Actions lê o Firestore com uma conta somente leitura e guarda um `.json.gz` com SHA-256 por 90 dias. Não precisa de Cloud Functions. **Não foi executado contra o Firebase real**; veja `tools/backup-externo/LEIA-ME.txt`. |

## Por que ficou de fora (e o que fica para a 3.27)
- **Modelos de obra, assistente de nova obra, relatórios PDF padronizados e edição em lote:** são telas grandes e não ficaram prontas com teste; ficam para a 3.27.
- **Dividir o `app.js` e reorganizar o CSS por completo:** exige mover código com estado compartilhado; fazer sem testes de interface completos arrisca quebrar o app. Esta versão tirou do `app.js` o glossário (`glossary.mjs`) e os cálculos (`calc.mjs`); o restante fica para etapas.
- **Regras:** nada foi publicado nas regras. Veja `regras-propostas/LEIA-ME-REGRAS.txt`.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_26_0_0_Siglas_Composicao_Diario_Perfis.zip
cd ObraTop_V3.26.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois confira `https://obratop-v3-teste.web.app/RELEASE.txt` e limpe o service worker (F12 → Application → Unregister; Storage → Clear site data).

## Testes
`npm test` roda 18 testes automáticos (cálculos, composição, conversão do backup). O simulador de navegador (`tests/simulador`) cobre as telas, o painel, o cronograma, composição, Diário de Obra, perfis e restauração. **Nada foi testado no Firebase real nem em emulador de regras.**

## Reversão
Republique o pacote 3.25.0.1. Os campos novos ficam sem uso.
