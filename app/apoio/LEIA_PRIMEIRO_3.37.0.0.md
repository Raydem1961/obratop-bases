# ObraTop 3.37.0.0 — Cronograma congelado, revisão da EAP, Engº responsável e acesso de usuários, manual V3.37

Hosting no plano gratuito. **Não exige mudança nas regras do Firestore** para o que está abaixo (perfil Engº responsável, alterar nome/obra, bloquear e excluir). Trocar o perfil para Gestor, Financeiro ou Consulta continua exigindo as regras novas (pasta `regras-propostas`).

## 1) Cronograma
- **Bloco congelado ao rolar na vertical:** faixa de versão, filtros, título com os botões, topo do Gantt (título e botões), legenda de cores e cabeçalho das colunas/escala de datas. Notas, linha de base e siglas ficam em um bloco recolhível. Em telas baixas o sistema limita o que fica fixo (≈ 62% da altura no Cronograma).
- **Rolagem horizontal sem sobreposição:** as colunas Nº, EAP e Nome da tarefa ficam fixas, com fundo opaco; as demais passam por baixo.

## 2) Por que algumas obras começavam no item 2 e revisão de todos os cronogramas
**Causa:** a planilha-modelo (“Modelo base”) numera cada obra em sequência: a primeira usa a EAP 1.x e a segunda 2.x. Ao importar, a segunda obra ficava com a EAP começando em 2.
**Correção:** novo botão **Revisar EAP** (administrador) no Cronograma: lê todas as obras, mostra a raiz atual, o ajuste (ex.: 2→1), repetidas, predecessoras inexistentes e atividades sem EAP; ao confirmar, cria um ponto de restauração e renumera as atividades e as predecessoras, preservando o nome dos pacotes. Depois de importar atividades, o sistema oferece a renumeração automaticamente. As atividades geradas do orçamento já começam em 1 e não são alteradas.

## 3) Usuários
- **Novo usuário:** informe o nome do Engº responsável, o e-mail e o perfil; crie a obra dele no mesmo cadastro (ou vincule a uma obra existente). Ao aceitar o convite ele entra como **Engº responsável da obra** (lê, cria e edita a sua obra e o orçamento; não exclui; só enxerga a sua obra). Nome e e-mail dele ficam gravados na obra e saem nos relatórios.
- **Alterar:** nome, perfil, obra atribuída e vínculo como Engº responsável.
- **Bloquear / Reativar:** suspende o acesso (tela “Acesso bloqueado”, inclusive com o sistema aberto).
- **Excluir usuário:** retira o acesso por completo (apaga a ficha de acesso e o convite). O usuário não consegue mais entrar nem criar uma nova empresa pelo mesmo acesso.
- O Administrador geral não pode bloquear nem excluir a si mesmo nem outro Administrador geral. Tudo fica na auditoria.
- **Limite:** a conta de login do usuário excluído continua existindo no serviço de autenticação do Firebase (sem acesso a nenhum dado). Para apagá-la de vez, use o Console do Firebase (Authentication).

## 4) Manual técnico
Revisado para a V3.37: 14 páginas, 12 capítulos novos (20 a 31) e histórico de versões; capa com faixa da revisão atual.

## Como publicar (somente Hosting)
```
unzip -o ObraTop_V3_37_0_0_Congelado_EAP_Usuarios_Manual.zip
cd ObraTop_V3.37.0.0
grep -n "const RELEASE" public/app.js
curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
firebase deploy --only hosting --project obratop-v3-teste
```
Depois limpe o service worker (F12 → Application → Unregister; Storage → Clear site data). Reversão: republique a 3.36.0.0.

## Depois de publicar (ordem sugerida)
1. Faça “Backup agora” em Integridade e manutenção.
2. Cronograma > **Revisar EAP** e confira a lista antes de aplicar.
3. Equipe: confira os usuários, o vínculo de Engº responsável de cada obra e teste um bloqueio com um usuário de teste.
