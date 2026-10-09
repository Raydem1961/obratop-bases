# ObraTop 3.36.0.0 — Cronograma no layout do MS Project, importação/exportação e linha de base no Planejamento

Hosting no plano gratuito, sem mudança nas regras do Firestore.

## 1) Cronograma no layout do MS Project
- **Tabela:** Nº, EAP, Nome da tarefa, Duração ("18 dias"), Início e Término ("seg 12/10/26"), Predecessoras (tipo e defasagem, ex.: `1.1.1SS+3d`; TI/II/TT/IT ou FS/SS/FF/SF), Nomes dos recursos, % Concl. e Ações.
- **Gráfico:** barras de resumo com as pontas do MS Project, marcos em losango (◆), recursos ao lado da barra, linha de base tracejada, linha "Hoje" e **setas de dependência** (término-início, início-início, término-término, início-término).
- **Botão "Caminho crítico":** destaca em vermelho as tarefas sem folga (CPM sobre as predecessoras) e as setas entre elas.
- **Cores vibrantes e legenda com contagem:** turquesa = no prazo; laranja = atrasada (avanço abaixo do esperado); vermelho-rosa = crítica (prazo vencido sem concluir, ou 20 pontos percentuais ou mais abaixo do esperado); verde-limão = concluída; índigo-violeta = etapa (resumo).

## 2) Importar e exportar para o MS Project (XML)
- **Exportar MS Project:** XML com EAP em tarefas resumo, vínculos com tipo e defasagem, marcos, recursos e atribuições, linha de base e tarefas críticas.
- **Importar MS Project:** no MS Project use *Arquivo > Salvar como > XML*; no ObraTop clique em *Importar MS Project*. Há prévia (tarefas, resumos, marcos, vínculos, período) e escolha da obra de destino; modos **acrescentar** ou **substituir** (as atividades antigas vão para a Lixeira; só administrador); opção de usar a linha de base do arquivo como nova revisão.
- **Não lê .mpp** (formato fechado). Perfil Consulta só exporta.

## 3) Linha de base no Planejamento
Cartão com revisão, data, motivo, término da base x atual e desvio; colunas Início (base), Término (base) e Desvio (dias úteis) na EAP; curva S com a linha de base tracejada e coluna "% linha de base"; Excel com essas colunas; botão para congelar a linha de base R1 (ou replanejar) quando for administrador.

## 4) Plano gerado do orçamento
As predecessoras geradas passam a ser início-início com defasagem (`SS+Nd`), coerentes com a sobreposição planejada e com o caminho crítico.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_36_0_0_Cronograma_MSProject.zip
cd ObraTop_V3.36.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois limpe o service worker (F12 → Application → Unregister; Storage → Clear site data). Reversão: republique a 3.34.2.0.

## Limites
Não testado com o MS Project real (formato MSPDI conferido por leitura e escrita de volta). Sem divisor arrastável tabela/gráfico e sem escala por semana. Tabela com 760 px e rolagem horizontal para as demais colunas.
