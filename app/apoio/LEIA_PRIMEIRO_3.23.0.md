# ObraTop 3.23.0 — Economia, Custos e Equilíbrio Econômico-Financeiro

Implementação sobre o pacote recuperado ObraTop 3.22.0. Preparada em 15/09/2026. Ainda não publicada no Firebase e não homologada com dados autenticados da organização.

## Uso

Menu Financeiro → Economia e Equilíbrio. Selecione uma obra no filtro superior. A data final define o corte, ou será usada a data atual. Data inicial e texto da pesquisa não recortam os totais econômicos. Os dados são consumidos das assinaturas Firestore já utilizadas pelo sistema.

O módulo apresenta valor contratado, orçamento com/sem BDI, despesas por competência, custo final estimado, margem, caixa por data de liquidação, pendências e necessidade mensal de aporte. Inclui composição e ABC por categoria, média, desvio padrão amostral, coeficiente de variação, cenários de ±10% sobre custos restantes, simulação de reajuste e parecer preliminar. Exporta relatório HTML, CSV do fluxo e JSON da memória; impressão permite PDF pelo navegador.

Em Financeiro, preencha o novo campo Liquidação para pagamentos/recebimentos. Registros antigos sem essa data ficam fora do caixa realizado, com aviso explícito. O custo por competência continua usando a competência dos lançamentos não previstos. Compras, pessoal, equipamentos e medições não são somados novamente.

Parâmetros ficam em `organizations/{orgId}/works/{workId}.economics`, com gravação conjunta de auditoria antes/depois. Permissões seguem a obra atribuída e o administrador geral. O backup completo existente preserva os campos do documento da obra; exportações tabulares simples não substituem o backup completo.

## Atualizar a instalação existente preservando personalizações

Não substitua toda a pasta pública da instalação atual: o pacote de referência antecede alterações recentes de ícones e logotipo. Use o atualizador, que preserva essas personalizações, valida marcadores, verifica sintaxe e cria backup dos arquivos alterados antes de escrever. Em versão incompatível, ele interrompe sem editar. Em falha de escrita, restaura os arquivos originais.

Após extrair este pacote no Cloud Shell, execute:

```bash
python3 /caminho/ObraTop_V3.23.0/ATUALIZAR_OBRATOP.py "$HOME/obratop-v3220/ObraTop_V3.22.0_Automacao_Gratuita_Bases_Oficiais_Producao/obratop-v3-homologacao"
```

Substitua `/caminho/ObraTop_V3.23.0` pela pasta em que o pacote foi extraído. O atualizador não publica. Homologue antes de publicar: seleção/troca de obra, recebimentos/pagamentos com data, edição pelo usuário autorizado e leitura nas outras obras, perda de conexão, relatórios e backup completo. Na pasta do projeto autenticado:

```bash
firebase deploy --only hosting --project obratop-v3-teste
```

O backup criado pelo atualizador é de código. Faça também o backup de dados pelo recurso existente do ObraTop antes da implantação. Para reverter código, restaure app.js, index.html e sw.js do ZIP de backup na mesma pasta e publique novamente. Os arquivos economics podem permanecer sem referência; a reversão de código não remove parâmetros já salvos em obras.

## Limites e pendências de homologação

- A cópia foi implementada localmente. Nenhum dado ou aplicativo online foi alterado nesta sessão.
- O escopo integral da aprovação anterior não estava disponível; esta entrega cobre os recursos acima e precisa ser conciliada com eventuais requisitos adicionais daquele escopo.
- Índices são informados com série/fonte/data; não há importação automática de INCC, IPCA ou INPC. Não foram inseridos índices de mercado presumidos.
- Reajuste é uma simulação `parcela × (índice atual / índice-base − 1)`. A aplicação exige conferência do contrato e do interregno. Recomposição e repactuação não são reconhecidas automaticamente nem somadas a receitas.
- Não há cálculo tributário/trabalhista automático, VPL/TIR, inferência estatística, previsão probabilística, estimativa automática do custo restante ou certificação de conformidade com NBR. Esses recursos exigem dados e regras adicionais.
- O parecer é preliminar e precisa de revisão técnica. O código não assina pareceres pelo autor do sistema.
- O financeiro é o registro de custos utilizado; sua completude determina a validade dos resultados. BDI e custo por competência precisam ter abrangência comparável.
- A necessidade de aporte é por mês e pode subestimar déficits intramensais. Previsões são apenas os lançamentos existentes. Não representa saldo bancário conciliado nem viabilidade financeira integral.
- Cadastros atuais não reconstituem versões históricas; alterações posteriores afetam análises de cortes passados.

## Referência consultada

[TCU — Reajuste em sentido estrito](https://licitacoesecontratos.tcu.gov.br/6-2-2-1-2-reajuste-em-sentido-estrito/), consultado em 15/09/2026. Reajustamento deve seguir a disciplina contratual aplicável; a simulação não substitui a análise do direito.

## Verificação local

`node tests/economics.test.mjs`: valida isolamento por obra, exclusão lógica, ausência de dupla contagem, competência/caixa, dados ausentes, divisão por zero, deflação, estatística mensal e cenários. Sintaxe JavaScript e aplicação do atualizador à cópia V3.22 também verificadas. O teste local não substitui validação autenticada de permissões e sincronização no Firebase.

Autoria do sistema: Eng. Civil Raydem Rabello Santana.

Teste visual em navegador não concluído: o download do Chromium não ficou disponível neste ambiente.
