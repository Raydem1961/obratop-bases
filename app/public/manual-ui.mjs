// ObraTop — Manual Técnico V3.37 em páginas (leitor com capa, navegação, busca e impressão)
// Checklist por obra gravado em organizations/{orgId}/works/{workId}.implantation
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const live=a=>(Array.isArray(a)?a:[]).filter(x=>x&&!x.deleted);
const ofWork=(a,id)=>live(a).filter(x=>x.workId===id);
const fold=s=>[...String(s)].map(c=>(c.normalize('NFD').replace(/[\u0300-\u036f]/g,'')[0]||c)).join('').toLowerCase();
export const MANUAL_VERSION='V3.37';
const COVER='manual-capa.jpg';
const FOOT='ObraTop • Criado por Eng. Civil Raydem Rabello Santana • © 2026 Raydem Rabello Santana • Todos os direitos reservados. • Direitos Autorais e Licença';

// Seção 2 — sequência recomendada de implantação
export const SEQUENCE=[
 ['01','Organização, usuários e permissões','Cadastrar o Engº responsável de cada obra (com a obra dele), definir perfis e bloquear ou excluir acessos.','members'],
 ['02','Obra','Criar o cadastro-mestre da obra.','works'],
 ['03','Fornecedores','Cadastrar fornecedores e prestadores antes de compras e contratos.','suppliers'],
 ['04','Orçamento','Montar o orçamento por etapas (SINAPI, ORSE ou itens próprios), com composições analíticas, BDI e planilha impressa.','budgets'],
 ['05','Cronograma','Gerar a EAP e o Gantt do orçamento (ou importar do MS Project), congelar a linha de base e acompanhar o avanço.','activities'],
 ['06','Pessoal e equipamentos','Cadastrar recursos produtivos e custos associados.','staff'],
 ['07','Estoque','Cadastrar materiais, unidades, mínimos e saldos iniciais.','inventory'],
 ['08','Compras','Gerar pedidos vinculados à obra, fornecedor e materiais.','orders'],
 ['09','Contratos e documentos','Registrar instrumentos, vigências e documentos críticos.','contracts'],
 ['10','Segurança e qualidade','Implantar controles preventivos e não conformidades.','safety'],
 ['11','Medições','Registrar produção executada e situação de faturamento.','measurements'],
 ['12','Financeiro','Lançar receitas, despesas, vencimentos e pagamentos.','finance'],
 ['13','Curva S / progresso','Consolidar avanço físico e financeiro por data.','resourcecurves'],
 ['14','Engenharia inteligente','Projetos e quantitativos vinculados à obra.','engineering'],
 ['15','Relatórios, backup e auditoria','Conferir integridade e emitir saídas gerenciais.','reports']
];

// Seção 17 — checklist de implantação de uma nova obra
export const CHECKLIST=[
 ['01','Organização e usuário conferidos','members'],
 ['02','Obra cadastrada e revisada','works'],
 ['03','Fornecedores/prestadores essenciais cadastrados','suppliers'],
 ['04','Orçamento-base implantado e validado','budgets'],
 ['05','Cronograma implantado e compatível com contrato','activities'],
 ['06','Pessoal e equipamentos cadastrados','staff'],
 ['07','Materiais/estoque inicial cadastrados','inventory'],
 ['08','Fluxo de compras liberado','orders'],
 ['09','Contratos e documentos críticos cadastrados','contracts'],
 ['10','Segurança e qualidade configuradas','safety'],
 ['11','Critério de medição definido','measurements'],
 ['12','Financeiro preparado para lançamentos','finance'],
 ['13','Data-base da Curva S definida','resourcecurves'],
 ['14','Projetos/quantitativos vinculados quando aplicável','engineering'],
 ['15','Backup inicial realizado e relatórios conferidos','reports']
];

// Contagem de registros já existentes na obra, para apoiar a conferência (não substitui a verificação humana)
function autoCounts(ctx){
 const {workId,data={},members=[],snapshots=[],engineeringProjects=[],work}=ctx;
 const w=t=>ofWork(data[t],workId).length;
 return {
  '01':members.filter(m=>m.status==='active').length,
  '02':work?1:0,
  '03':live(data.suppliers).length,
  '04':w('budgets'),
  '05':w('activities'),
  '06':w('staff')+w('equipment'),
  '07':w('inventory'),
  '08':w('orders'),
  '09':w('contracts')+w('documents'),
  '10':w('safety')+w('quality'),
  '11':w('measurements'),
  '12':w('finance'),
  '13':(Array.isArray(snapshots)?snapshots:[]).filter(x=>x&&x.workId===workId).length,
  '14':live(engineeringProjects).filter(x=>x.workId===workId).length,
  '15':null
 };
}

// Conteúdo do Manual Técnico V3.22 (seções 1 a 20)
const S={
 s1:{n:'1',t:'Objetivo do manual',p:['Este manual estabelece uma sequência operacional segura para implantação e utilização do ObraTop. A ordem proposta reduz cadastros incompletos, vínculos incorretos entre módulos, divergências físico-financeiras e retrabalho na geração de relatórios.'],cl:'Princípio central',c:'Cadastre primeiro as estruturas que servem de referência para os demais módulos. Depois implante planejamento, recursos, execução, medições e financeiro. Evite iniciar lançamentos operacionais antes de a obra e seus cadastros-base estarem validados.'},
 s2:{n:'2',t:'Sequência recomendada de implantação',special:'sequence'},
 s3:{n:'3',t:'Organização, usuários e permissões',b:['Confirme a organização ativa antes de qualquer implantação.','Cadastre usuários e atribua somente o nível de acesso necessário à função.','A exclusão definitiva de obra e operações administrativas críticas deve permanecer restrita ao proprietário/administrador.','Antes de iniciar uma nova obra, confirme que o usuário consegue visualizar os módulos necessários e que não está operando na organização errada.'],c:'Não compartilhe credenciais. O controle de acesso deve ser individual e rastreável.'},
 s4:{n:'4',t:'Cadastro da obra — ponto de partida obrigatório',b:['Cadastre nome da obra, identificação contratual, cliente, local, datas, valor e demais campos disponíveis.','Revise o cadastro antes de criar registros vinculados. O identificador da obra é a referência utilizada pelos módulos operacionais.','Selecione a obra correta nos filtros antes de lançar orçamento, cronograma, compras, medições ou financeiro.','Obras de demonstração devem ser claramente identificadas e não devem ser misturadas com indicadores executivos de produção.'],c:'Nunca crie registros operacionais para uma obra provisória que será substituída depois.'},
 s5:{n:'5',t:'Fornecedores e prestadores',b:['Cadastre razão/nome, CNPJ quando aplicável, contatos e demais dados exigidos.','Evite duplicidades: pesquise antes de cadastrar.','Somente depois associe fornecedores a pedidos, contratos ou documentos.','Em exclusões, verifique previamente se o fornecedor é exclusivo de uma obra ou compartilhado.'],c:'Fornecedores são cadastro-base. A consistência desse módulo melhora compras, contratos e rastreabilidade.'},
 s6:{n:'6',t:'Orçamento',b:['Implante serviços e insumos com unidade, quantidade, preço unitário e composição de custos conforme o padrão adotado.','Revise BDI, preço de venda e totais antes de liberar o orçamento como base de controle.','Use sempre o padrão monetário brasileiro: R$ com exatamente duas casas decimais.','Evite alterar a estrutura orçamentária após medições sem registrar formalmente a revisão.'],c:'O orçamento validado deve ser a referência para custo, medição, desempenho e projeções.'},
 s7:{n:'7',t:'Cronograma e planejamento',b:['Cadastre atividades somente após a estrutura da obra e do orçamento estar consistente.','Defina início, término, responsável, situação e percentuais planejados.','Mantenha datas coerentes com o prazo contratual.','Atualize o avanço real de forma periódica e com critério único para toda a equipe.'],c:'Planejamento desatualizado compromete Curva S, alertas, previsões e indicadores gerenciais.'},
 s8:{n:'8',t:'Pessoal, equipamentos e estoque',b:['Cadastre pessoal e equipamentos com identificação, alocação e custos pertinentes.','No estoque, padronize nomes de materiais e unidades de medida.','Defina estoque mínimo e saldo inicial antes de iniciar movimentações.','Evite criar o mesmo material com grafias diferentes.'],c:'Cadastros padronizados são essenciais para Curvas ABC, produtividade, custos e ressuprimento.'},
 s9:{n:'9',t:'Compras',b:['Crie pedidos somente depois de fornecedor, obra e materiais estarem cadastrados.','Confira quantidade, unidade, valor, data e situação do pedido.','Mantenha o pedido vinculado à obra correta.','Atualize a situação conforme o fluxo real: solicitado, aprovado, comprado, recebido ou equivalente disponível.'],c:'Um pedido sem vínculo correto prejudica estoque, financeiro e relatórios.'},
 s10:{n:'10',t:'Contratos, documentos, segurança e qualidade',b:['Registre contratos com número, vigência, valor e responsável.','Cadastre documentos com vencimentos para aproveitar os alertas automáticos.','Registre ocorrências de segurança e qualidade vinculadas à obra.','Trate não conformidades com responsável, prazo e situação atualizada.'],c:'Use os alertas como ferramenta preventiva, não apenas como registro histórico.'},
 s11:{n:'11',t:'Medições',b:['Cadastre medições após existir base orçamentária e avanço físico verificável.','Confira período, valor, situação e vínculo com a obra.','Evite duplicidade de medição; quando houver erro, utilize o procedimento de exclusão/correção autorizado.','Mantenha coerência entre medição, produção executada e faturamento.'],c:'Medições são um dos principais pontos de ligação entre produção e financeiro.'},
 s12:{n:'12',t:'Financeiro',b:['Registre receitas e despesas com descrição, valor, vencimento, situação e obra correta.','Não use o campo “tipo” como substituto do vínculo da obra; ele representa a natureza do lançamento.','Atualize pagamentos e recebimentos para que saldo e indicadores reflitam a realidade.','Faça conciliações periódicas entre medições, contratos, compras e financeiro.'],c:'Valores monetários devem permanecer no padrão R$ 1.234.567,89 em telas, relatórios e exportações.'},
 s13:{n:'13',t:'Curva S e progresso',b:['Atualize os snapshots de progresso em datas de corte consistentes.','Compare físico planejado × realizado e financeiro previsto × realizado.','Evite lançar percentuais sem evidência de medição ou acompanhamento de campo.','Use a evolução histórica para análise de tendência, não apenas o percentual atual.'],c:'A qualidade da Curva S depende diretamente da qualidade do orçamento, cronograma, medições e financeiro.'},
 s14:{n:'14',t:'Engenharia inteligente e quantitativos',b:['Crie projetos de engenharia sempre vinculados à obra correspondente.','Registre quantitativos dentro do projeto correto.','Revise unidades, descrições e critérios de levantamento.','Quando um projeto for substituído, preserve rastreabilidade da revisão conforme o procedimento interno.'],c:'Quantitativos devem ser tecnicamente verificáveis e coerentes com orçamento e execução.'},
 s15:{n:'15',t:'Relatórios, backup e restauração',b:['Antes de grandes alterações, gere backup profissional ou ponto de restauração quando disponível.','Use relatórios executivos para conferência cruzada dos módulos.','Verifique totais e filtros antes de exportar documentos para cliente ou diretoria.','Em restauração, valide o arquivo antes de gravar dados e evite sobrescrever registros sem necessidade.'],c:'Backup não substitui conferência. Após restauração, valide obras, vínculos, totais e permissões.'},
 s16:{n:'16',t:'Exclusão segura de obra',b:['A exclusão definitiva deve ser utilizada apenas por proprietário/administrador.','O ObraTop verifica registros vinculados e cria ponto de restauração antes da exclusão.','A confirmação textual “EXCLUIR OBRA” deve ser tratada como ação crítica.','Após exclusão, valide se a obra desapareceu e se não restaram registros órfãos vinculados ao antigo workId.'],c:'Na homologação da V3.22, a rotina foi validada com exclusão integral dos vínculos e auditoria final sem registros órfãos.'},
 s17:{n:'17',t:'Checklist de implantação de uma nova obra',special:'checklist',p:['Utilize esta sequência antes de considerar a obra liberada para operação.'],cl:'Regra de liberação',c:'A obra somente deve entrar em operação plena depois que os cadastros-base e vínculos essenciais estiverem conferidos. Isso reduz erros de associação e melhora a confiabilidade dos painéis.'},
 s18:{n:'18',t:'Rotina operacional recomendada',special:'routine',b:['Diariamente: registrar produção, ocorrências, compras/recebimentos relevantes e movimentações financeiras efetivas.','Semanalmente: atualizar cronograma, avanço físico, estoque, pendências de qualidade/segurança e documentos próximos do vencimento.','Mensalmente: fechar medição, conciliar financeiro, atualizar Curva S, revisar indicadores e gerar relatório executivo.','Antes de alterações críticas: criar backup/ponto de restauração e confirmar a obra selecionada.']},
 s19:{n:'19',t:'Boas práticas de integridade dos dados',b:['Evite registros duplicados e nomes diferentes para o mesmo item.','Não altere IDs, vínculos ou estruturas internas diretamente no Firestore durante a operação normal.','Use filtros de obra antes de incluir, editar ou exportar registros.','Registre correções com motivo claro e preserve auditoria quando o sistema oferecer esse recurso.','Teste mudanças estruturais primeiro em homologação; somente depois promova para produção.','Mantenha o padrão brasileiro de moeda em todos os módulos e relatórios.'],cl:'Ambiente de homologação',c:'Mudanças em regras, rotinas de exclusão, restauração, importação e integrações devem ser validadas em ambiente de teste antes de serem aplicadas à produção.'},
 s20:{n:'32',t:'Encerramento',p:['O ObraTop deve ser utilizado como sistema integrado: orçamento, planejamento, recursos, execução, medições e financeiro precisam permanecer vinculados à mesma obra e atualizados segundo um processo único. A sequência deste manual foi estruturada para reduzir inconsistências e facilitar auditoria, relatórios e tomada de decisão.'],end:'Documento técnico de referência - ObraTop V3.37.'} ,
 s21:{n:'20',t:'Novidades desta revisão (V3.23 a V3.37)',p:['Esta revisão do manual incorpora todas as mudanças feitas no aplicativo desde a V3.22. Os capítulos 21 a 31 detalham cada uma; a lista abaixo resume o que mudou.'],b:['Usuários: o Administrador geral cadastra o Engº responsável junto com a obra dele, altera perfil, obra e nome, bloqueia (reversível) ou exclui o acesso por completo.','Orçamento: nova aba “Criar novo orçamento” com etapas, bases SINAPI e ORSE, itens próprios, composições analíticas (CPU), BDI e planilha impressa no modelo da obra, com valor por extenso.','Planejamento: a partir do orçamento fechado o ObraTop gera EAP, cronograma (Gantt), linha de base, curva S, curvas ABC e quantitativos de materiais, mão de obra e equipamentos, com previsto x realizado mês a mês.','Cronograma no layout do MS Project: tabela Nº/EAP/Nome/Duração/Início/Término/Predecessoras/Recursos/% Concl., setas de dependência, marcos, caminho crítico, cores vibrantes e legenda.','MS Project: importação e exportação em XML, com vínculos (tipo e defasagem), recursos, marcos e linha de base.','Revisão da EAP: todas as obras passam a ter a EAP começando no item 1; ferramenta de revisão para o administrador.','Interface: menu lateral na ordem do fluxo de trabalho, cabeçalho fixo (versão, filtros, título, sub-abas, total e colunas), tamanho da letra (normal, grande e extra grande), cores do menu e totais em destaque, ordem alfabética nas listas de serviços e visualização para smartphone.','Relatórios e impressão: cabeçalho da empresa (CNPJ, endereço, telefone e e-mail) em todas as páginas, Engº responsável no relatório executivo, gráficos do fluxo de caixa e da curva S mais legíveis, faixa de versão em todas as telas.'],cl:'Como usar este manual',c:'Siga a sequência do capítulo 2 para implantar uma obra nova. Para obras em andamento, comece pelo capítulo 21 (usuários) e pelo capítulo 27 (cronograma).'},
 s22:{n:'21',t:'Usuários, Engº responsável e bloqueio de acesso',b:['Cadastro: em Equipe > “+ Novo usuário”, informe o nome do Engº responsável, o e-mail e o perfil. Escolha “Criar agora a obra deste usuário” (nome, cliente e datas) ou vincule a uma obra já cadastrada. O sistema gera um convite com validade de 7 dias.','O que o Engº responsável pode: ler, criar e editar a obra atribuída a ele e os dados dela (orçamento, cronograma, medições, compras, financeiro etc.). Ele não exclui registros e só enxerga a obra atribuída a ele. O nome e o e-mail dele aparecem como Engº responsável no cadastro da obra, no orçamento e nos relatórios.','Aceite do convite: ao entrar pelo link, o usuário é incluído na empresa já vinculado à obra e gravado como Engº responsável dela.','Alterar usuário: o Administrador pode mudar nome, perfil e obra atribuída e escolher se o usuário fica como Engº responsável daquela obra. Ao mudar de obra, o vínculo da obra anterior é desfeito.','Bloquear: suspende o acesso de imediato (o usuário vê a tela “Acesso bloqueado” e não vê nenhum dado). Pode ser reativado.','Excluir usuário: remove o acesso por completo e o convite antigo; o usuário não entra mais na empresa nem consegue criar uma nova empresa pelo mesmo acesso. Os registros que ele lançou permanecem nas obras. Para dar acesso de novo é preciso um novo convite.','O Administrador geral não pode bloquear nem excluir a si mesmo nem outro Administrador geral. Toda alteração é registrada na auditoria.'],cl:'Regras do Firestore',c:'Perfis Gestor, Financeiro e Consulta, e a troca de perfil entre eles, exigem as regras novas do Firestore (pasta regras-propostas). Com as regras atuais, o perfil Engº responsável, o bloqueio e a exclusão funcionam normalmente. A conta de login do usuário excluído continua existindo no serviço de autenticação, mas sem acesso a qualquer dado da empresa.'},
 s23:{n:'22',t:'Criar novo orçamento: etapas e itens',b:['Local: Orçamentos > “Criar novo orçamento”. Informe nome do orçamento, obra e BDI e escolha como o BDI aparece: preço unitário já com BDI (modelo da planilha impressa) ou BDI somado no final.','Etapas: crie as etapas (1.0, 2.0…) ou use as etapas padrão de edificação; renomeie e reordene. Serviços entram na etapa ativa (1.1, 1.2…) e, se desejado, numa sub-etapa (ex.: 3.2 com serviços 3.2.1, 3.2.2…).','Busca: pesquise por código ou palavras nas composições e nos insumos do SINAPI e do ORSE. Os resultados vêm de A a Z pela discriminação; o código digitado por inteiro aparece primeiro.','Itens sem preço: composições “SEM CUSTO” ficam ocultas por padrão; marque “Mostrar também itens sem preço” para vê-las. Adicionar um item sem preço pede confirmação e a gravação avisa quantos serviços estão com preço zero.','Item próprio: lance código, discriminação, unidade, quantidade e preço unitário na etapa ativa.','Ordem: botões ↑ e ↓ movem o serviço dentro da etapa; “Ordenar serviços de A a Z” ordena cada etapa e sub-etapa e renumera.','Gravação: “Salvar orçamento na obra” cria um item no Orçamento da obra por serviço; “Salvar e gerar planejamento” grava e também gera EAP e cronograma (capítulo 25).'],c:'O rascunho do orçamento é guardado automaticamente no aparelho e sobrevive ao recarregamento da página. Perfis de consulta montam e exportam, mas não gravam na obra.'},
 s24:{n:'23',t:'Bases SINAPI e ORSE: importação e diagnóstico',b:['SINAPI: baixe do site da CAIXA o ZIP mensal em formato XLSX e use “Importar arquivo”. O ObraTop lê somente a planilha de Referência e as abas oficiais (ISD, ICD, ISE, CSD, CCD, CSE e Analítico) e ignora os demais arquivos do ZIP (percentual de mão de obra, famílias e coeficientes, manutenções).','Escolha a UF (padrão BA), o regime (com desoneração, sem desoneração ou sem encargos) e a base salva. A base importada fica guardada no navegador de cada aparelho. Para disponibilizar a base a todos, o administrador pode gerar os arquivos com a ferramenta tools/sinapi e publicá-los (botão “Carregar base do servidor”).','Cuidados na leitura: colunas de percentual (valores entre 0 e 1) são recusadas como preço; códigos que vêm como fórmula do Excel (valor 0) são recuperados pelo nome da composição na aba Analítico; itens repetidos são unificados.','ORSE: importe o arquivo exportado do sistema ORSE (XLSX, CSV ou PDF); se as colunas não forem reconhecidas, use a tela “Conferir colunas”.','Diagnóstico da última importação: lista os arquivos usados e ignorados, as abas lidas, de qual coluna veio o preço, quantos itens vieram sem preço e quantos códigos foram recuperados. Use “Copiar diagnóstico” ao pedir suporte.','Para trocar uma base importada com erro, use “Excluir base” e importe de novo; a nova importação substitui a base daquela UF e mês.'],cl:'Confira sempre',c:'Compare alguns preços importados com a planilha oficial da CAIXA antes de orçar uma obra. O ORSE não traz composição analítica nesta versão.'},
 s25:{n:'24',t:'Composições analíticas (CPU) e planilha orçamentária impressa',b:['Composição analítica: com a aba Analítico importada, cada serviço do SINAPI traz seus insumos e composições auxiliares com coeficiente, preço e custo. O botão “Composição” mostra a CPU; “Composições analíticas” exporta todas em PDF e Excel.','Explosão em insumos: a CPU é desdobrada em material, mão de obra (hora de servente, pedreiro etc. com encargos) e equipamento (horas produtivas e improdutivas). Esses insumos alimentam as curvas ABC e os quantitativos.','Planilha impressa (PDF e Excel): colunas ITENS, CÓD. SINAPI/ORSE, DESCRIÇÃO DOS SERVIÇOS, UNID, QUANT, PR. UNIT e PR. TOTAL; etapas em negrito, sub-etapas, total da obra e o valor da obra por extenso, com o cabeçalho da empresa. O Excel traz fórmulas (total do serviço = quantidade × preço; total geral = soma).','BDI: no modelo “preço unitário com BDI”, cada preço impresso já inclui o BDI e é arredondado em centavos; por isso o total pode diferir em poucos reais do total interno do ObraTop, que não arredonda o preço unitário.','Itens do ORSE e itens próprios não têm CPU: aparecem como “sem CPU” e vão para “Outros” nas curvas ABC. O detalhamento de insumos pode ser feito depois pelo botão Composição do módulo Orçamentos.'],c:'Revise a CPU de serviços críticos: a classificação em material, mão de obra e equipamento segue regras automáticas por unidade e descrição.'},
 s26:{n:'25',t:'Planejamento a partir do orçamento',b:['“Salvar e gerar planejamento” pede o início e o término da obra e a sobreposição entre etapas e entre serviços. O ObraTop grava o orçamento e cria uma atividade por serviço, ligada ao item do orçamento, com a EAP igual à numeração da planilha.','Duração: proporcional às horas de mão de obra da composição (ou ao custo, quando não há composição) e ajustada ao prazo. É uma estimativa de planejamento: revise no Cronograma antes de assumir como compromisso. Se o prazo for curto demais, o sistema avisa o mínimo necessário.','Predecessoras: geradas como início-início com defasagem (ex.: 2.1SS+3d), refletindo a sobreposição planejada. Uma linha de base R1 é criada junto, se marcada.','Aba “Planejamento e quantitativos”: EAP e cronograma, Curva S, Curvas ABC (materiais, mão de obra e equipamentos), quantitativos consolidados ou por serviço, “mês a mês”, e lançamento do realizado. Tudo exporta em Excel.','Curvas ABC: calculadas sobre o custo direto (sem BDI); classe A até cerca de 80% do valor, B até 95% e C o restante.','Mão de obra: o quantitativo é em horas, com o efetivo médio do mês (horas ÷ dias úteis ÷ 8 h).'],c:'Só entram nas análises os itens criados em “Criar novo orçamento” ou ligados a uma atividade do Cronograma. Itens avulsos antigos do Orçamento ficam de fora e o aplicativo avisa.'},
 s27:{n:'26',t:'Previsto x realizado e linha de base',b:['Previsto mês a mês: cada serviço é distribuído pelos dias úteis da sua atividade no Cronograma; se você mudar as datas no Gantt, o previsto acompanha.','Realizado: em “Lançar realizado”, informe a quantidade de cada serviço executada no mês. O realizado de materiais, mão de obra e equipamentos e a curva S realizada são calculados com os coeficientes das composições. O sistema pede confirmação se o acumulado passar de 110% da quantidade orçada.','Linha de base: congela as datas e os pesos planejados. Na aba Planejamento aparecem a revisão, a data e o motivo, o término da base x atual e o desvio em dias úteis (positivo = atrasado), as colunas Início (base), Término (base) e Desvio na EAP e a linha de base tracejada na Curva S.','Congelar ou replanejar a linha de base: exclusivo do administrador; a revisão anterior vai para o histórico. A linha de base também pode ser trazida de um arquivo do MS Project na importação.'],c:'Replaneje a linha de base somente com motivo registrado: ela é a referência para medir desvios do prazo.'},
 s28:{n:'27',t:'Cronograma no layout do MS Project',b:['Tabela: Nº, EAP, Nome da tarefa, Duração (“18 dias”), Início e Término (“seg 12/10/26”), Predecessoras (código EAP com tipo e defasagem, ex.: 2.1;2.3II+2d), Nomes dos recursos, % Concl. e Ações. As três primeiras colunas ficam fixas e opacas ao rolar na horizontal.','Gráfico: barras por tarefa com o percentual, barras de resumo das etapas, marcos em losango (◆), recursos escritos ao lado da barra, linha de base tracejada, linha “Hoje” e setas de dependência (término-início, início-início, término-término e início-término).','Cores: turquesa = no prazo; laranja = atrasada (avanço abaixo do esperado); vermelho-rosa = crítica (prazo vencido sem concluir ou 20 pontos percentuais ou mais abaixo do esperado); verde-limão = concluída; índigo-violeta = etapa. A legenda mostra a contagem de cada estado.','Caminho crítico: o botão “Caminho crítico” destaca em vermelho as tarefas sem folga, calculadas pelas predecessoras (método do caminho crítico, em dias úteis), e as setas entre elas.','Congelamento: ao rolar na vertical ficam fixos a faixa de versão, os filtros, o título com os botões, o cabeçalho do Gantt, a legenda e o cabeçalho das colunas. Notas, linha de base e siglas ficam em um bloco recolhível. Em telas baixas, o sistema limita o que fica fixo (cerca de 62% da altura no Cronograma).'],c:'Predecessoras aceitam FS/SS/FF/SF ou TI/II/TT/IT e defasagem em dias úteis. A lista antiga separada por vírgula continua valendo.'},
 s29:{n:'28',t:'Importar e exportar para o MS Project (XML)',b:['Exportar MS Project: gera um arquivo XML (MSPDI) com a EAP como tarefas resumo, vínculos com tipo e defasagem, marcos, recursos e atribuições, linha de base e tarefas do caminho crítico. No MS Project use Arquivo > Abrir e escolha o XML.','Importar MS Project: no MS Project use Arquivo > Salvar como > XML (*.xml); no ObraTop clique em “Importar MS Project”. Uma prévia mostra tarefas finais, resumos, marcos, vínculos e período, e você escolhe a obra de destino.','Modos: “acrescentar” às atividades atuais ou “substituir” o cronograma da obra (as atividades antigas vão para a Lixeira; somente o administrador). Pode-se adotar a linha de base do arquivo como nova revisão.','O que vem: nomes, datas, durações, percentual concluído, predecessoras, recursos e marcos. Os resumos do MS Project viram os grupos da EAP.','Não há leitura do formato .mpp (fechado); arquivos que não sejam XML do MS Project são recusados com mensagem clara. Perfis de consulta apenas exportam.'],cl:'Limite conhecido',c:'O formato foi conferido por leitura e escrita de volta, mas ainda não foi validado com todas as versões do MS Project. Se algum arquivo não for reconhecido, envie-o ao suporte para ajuste do leitor.'},
 s30:{n:'29',t:'Revisão da EAP de todas as obras',b:['Padrão: a EAP de cada obra começa no item 1. Obras importadas de planilhas que numeram vários projetos em sequência (a segunda começando em 2, por exemplo) são renumeradas.','Como usar: no Cronograma, o administrador clica em “Revisar EAP”. A janela lista todas as obras com as raízes da EAP, o ajuste proposto (ex.: 2→1), quantas atividades serão renumeradas, repetidas, predecessoras inexistentes e atividades sem EAP.','Aplicar: um ponto de restauração é criado antes; as atividades e as predecessoras são renumeradas e o nome do pacote é preservado. Atividades geradas do orçamento (com grupos explícitos) não são alteradas.','Depois de importar atividades, o sistema oferece a renumeração automaticamente.','Repetidas, predecessoras inexistentes e atividades sem EAP não são corrigidas automaticamente: abra a obra no Cronograma para tratá-las.'],c:'Se algo sair diferente do esperado, restaure o ponto “Automático pré-revisão da EAP” em Integridade e manutenção.'},
 s31:{n:'30',t:'Interface: menu por fluxo, cabeçalho fixo e tamanho da letra',b:['Menu lateral na ordem do trabalho: Início; 1 Configuração inicial; 2 Cadastros; 3 Projeto e planejamento; 4 Suprimentos; 5 Execução da obra; 6 Medição e financeiro; 7 Controle e relatórios; Administração. O item selecionado aparece em amarelo-creme com marcador laranja.','Cabeçalho fixo: faixa de versão, filtros, título e botões, sub-abas, total e cabeçalho das colunas ficam visíveis ao rolar. O botão “Cabeçalho fixo” liga e desliga e a escolha fica guardada no aparelho.','Tamanho da letra: o botão “Letra” alterna entre normal, grande (padrão) e extra grande. Fontes e cinzas foram reforçados para leitura em notebook.','Totais em destaque (ex.: “Total R$ …” em Orçamentos), listas de serviços em ordem alfabética e legenda de cores no Gantt.','Visualização para smartphone: botão computador ⇄ smartphone na barra superior, menu inferior, gaveta de módulos, filtros resumidos e tabelas em cartões.','Faixa de versão e ambiente (Homologação ou Produção) em todas as telas; rodapé com os direitos autorais e a licença de uso.','Barras de rolagem: em toda tabela mais larga que a tela, a barra horizontal fica fixa na base da janela (sem precisar rolar até o fim da lista), com o mesmo visual da do Cronograma, onde há uma barra para a tabela e outra para a linha do tempo, sincronizadas. O cabeçalho das colunas acompanha a rolagem da página e as tabelas não têm barra vertical própria: quem rola é a página. No celular as tabelas viram cartões e não usam essas barras.','Atualizar aplicativo: o botão “🔄 Atualizar aplicativo” da faixa de versão busca a versão mais recente (cancela o service worker e apaga só o cache do ObraTop, mantendo bases SINAPI/ORSE, rascunhos e preferências) e recarrega a página. Quando há versão nova publicada, o botão fica destacado com o número dela. Exige conexão com a internet.'],c:'Em janelas estreitas (menos de 900 px) e no celular o cabeçalho fixo não é aplicado.'},
 s32:{n:'31',t:'Relatórios, impressão e histórico de versões',b:['Cabeçalho da empresa: em Configurações > Empresa informe CNPJ, endereço, telefone, e-mail e Engº responsável padrão. Esses dados saem no cabeçalho de todas as páginas impressas (Ctrl+P), nos PDF e nos Word.','Relatório executivo: traz a coluna Engº Responsável (da obra ou o padrão da empresa) no Excel, Word, PDF e CSV.','Gráficos: o fluxo de caixa mostra os valores de cada mês (“mil” = milhares e “mi” = milhões) e as linhas da Curva S têm traço mais grosso.','Obra e orçamento: assistente de nova obra com modelos, importação em lote, logo da empresa, composição de custo por item, Diário de Obra, perfis Gestor, Financeiro e Consulta e siglas explicadas nas telas.','Histórico resumido: 3.29 visualização smartphone; 3.29.1 Engº Responsável nos relatórios; 3.30 faixa de versão, gráficos e cabeçalho da empresa; 3.31 Criar novo orçamento (SINAPI/ORSE); 3.31.1 a 3.32.2 correção das importações, etapas, CPU, planejamento e itens sem preço; 3.33 menu por fluxo e cabeçalho fixo; 3.34 leitura, menu em amarelo-creme e A a Z; 3.34.1 total em destaque; 3.34.2 correção da gravação do orçamento e tamanho da letra; 3.36 Cronograma no layout do MS Project, importação e exportação, linha de base no Planejamento; 3.37 revisão da EAP, bloco congelado no Cronograma, usuários (Engº responsável, bloqueio e exclusão) e este manual.','Antes de qualquer mudança em massa (importação, revisão da EAP, saneamento), o sistema cria um ponto de restauração. Mantenha também o backup externo em dia.'],c:'Publicação: cada versão é publicada somente no Hosting do Firebase. Confirme o número da versão na faixa superior (ex.: V3.37.0.0) e limpe o service worker do navegador ao atualizar.'}
};

// Páginas do manual (a página 1 é a capa; as demais seguem a diagramação do PDF V3.22)
const PAGES=[
 {n:1,cover:true,label:'Capa'},
 {n:2,ids:['s1','s2']},
 {n:3,ids:['s3','s4','s5','s6']},
 {n:4,ids:['s7','s8','s9','s10']},
 {n:5,ids:['s11','s12','s13','s14']},
 {n:6,ids:['s15','s16']},
 {n:7,ids:['s17']},
 {n:8,ids:['s18','s19']},
 {n:9,ids:['s21','s22']},
 {n:10,ids:['s23','s24','s25']},
 {n:11,ids:['s26','s27']},
 {n:12,ids:['s28','s29','s30']},
 {n:13,ids:['s31','s32']},
 {n:14,ids:['s20']}
];
const pageLabel=p=>p.cover?p.label:(p.ids.length>1?`Seções ${S[p.ids[0]].n} a ${S[p.ids.at(-1)].n}`:`Seção ${S[p.ids[0]].n}`)+' — '+S[p.ids[0]].t+(p.ids.length>1?' …':'');

const fmtDate=iso=>{try{return new Date(iso).toLocaleString('pt-BR')}catch{return ''}};

function sequenceTable(counts,hasWork){
 return `<div class="man-scroll"><table class="man-table"><thead><tr><th>Etapa</th><th>Módulo</th><th>Finalidade</th>${hasWork?'<th class="man-screen">Registros</th>':''}<th class="man-screen"></th></tr></thead><tbody>${SEQUENCE.map(([n,mod,goal,route])=>{
  const c=counts[n];
  return `<tr><td>${esc(parseInt(n,10))}</td><td>${esc(mod)}</td><td>${esc(goal)}</td>${hasWork?`<td class="man-screen">${c===null||c===undefined?'—':esc(c)}</td>`:''}<td class="man-screen"><button type="button" class="btn small" data-man-route="${esc(route)}">Abrir →</button></td></tr>`;
 }).join('')}</tbody></table></div>`;
}

function checklistBlock({work,items,counts,editable}){
 if(!work)return `<div class="man-note man-screen">Selecione uma obra no filtro superior para registrar o checklist de implantação deste manual.</div>`+
  `<div class="man-scroll"><table class="man-table"><thead><tr><th>#</th><th>Verificação</th><th>Status</th></tr></thead><tbody>${CHECKLIST.map(([n,label])=>`<tr><td>${esc(n)}</td><td>${esc(label)}</td><td>☐ Conferido</td></tr>`).join('')}</tbody></table></div>`;
 const done=CHECKLIST.filter(([n])=>items[n]?.done).length,total=CHECKLIST.length,pct=Math.round(done/total*100);
 const released=done===total;
 const rows=CHECKLIST.map(([n,label,route])=>{
  const it=items[n]||{},c=counts[n];
  let hint='';
  if(it.done&&c===0&&n!=='14'&&n!=='15')hint='<span class="badge warn" title="Marcado como conferido, mas o ObraTop não encontrou registros deste item na obra.">⚠ Sem registros no sistema</span>';
  else if(!it.done&&typeof c==='number'&&c>0)hint=`<span class="badge info" title="Há registros cadastrados. Falta a sua conferência.">${esc(c)} registro(s) encontrado(s)</span>`;
  else if(it.done&&typeof c==='number'&&c>0)hint=`<span class="badge ok">${esc(c)} registro(s)</span>`;
  const who=it.done?`<small class="man-who">${esc(it.byEmail||'')}${it.at?' • '+esc(fmtDate(it.at)):''}</small>`:'';
  return `<tr class="${it.done?'man-done':''}"><td>${esc(n)}</td><td>${esc(label)}${hint?`<div class="man-screen man-hint-row">${hint}</div>`:''}</td><td><label class="man-check"><input type="checkbox" data-man-item="${esc(n)}" ${it.done?'checked':''} ${editable?'':'disabled'}><span>Conferido</span></label>${who}</td><td class="man-screen"><button type="button" class="btn small" data-man-route="${esc(route)}">Abrir →</button></td></tr>`;
 }).join('');
 return `<div class="man-progress-head"><div><b>${esc(work.name)}</b> <span class="man-muted">• ${done} de ${total} verificações conferidas</span></div><span class="badge ${released?'ok':'warn'}">${released?'✓ Liberada para operação plena':'Implantação em andamento'}</span></div>
 <div class="man-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i><span>${pct}%</span></div>
 ${editable?'':'<div class="man-note man-screen">Você pode consultar este checklist, mas somente o administrador ou o usuário atribuído à obra pode alterá-lo.</div>'}
 <div class="man-scroll"><table class="man-table"><thead><tr><th>#</th><th>Verificação</th><th>Status</th><th class="man-screen"></th></tr></thead><tbody>${rows}</tbody></table></div>
 <div id="manStatus" class="man-status man-screen" role="status" aria-live="polite"></div>`;
}

function sectionHtml(id,ctx){
 const s=S[id];let inner='';
 if(s.p)inner+=s.p.map(x=>`<p>${esc(x)}</p>`).join('');
 if(s.special==='sequence')inner+=sequenceTable(ctx.counts,!!ctx.work);
 if(s.special==='checklist')inner+=checklistBlock(ctx);
 if(s.special==='routine')inner+=s.b.map(x=>{const i=x.indexOf(':');return `<p><b>${esc(x.slice(0,i+1))}</b>${esc(x.slice(i+1))}</p>`}).join('');
 else if(s.b)inner+=`<ul>${s.b.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 if(s.c)inner+=`<div class="man-call"><b>${esc(s.cl||'Controle recomendado')}</b><p>${esc(s.c)}</p></div>`;
 if(s.end)inner+=`<p class="man-end">${esc(s.end)}</p>`;
 return `<div class="man-sec" id="man-${id}"><h2>${esc(s.n)}. ${esc(s.t)}</h2>${inner}</div>`;
}

function frameHtml(p,ctx,on){
 const off=on?'':' man-off';
 if(p.cover)return `<div class="man-frame${off}" data-page="1"><section class="man-sheet man-cover" aria-label="Capa do manual"><img src="${COVER}" alt="Capa do Manual Técnico ObraTop — Guia completo de implantação e utilização do ObraTop"><div class="man-cover-rev">Revisão ${esc(MANUAL_VERSION)} — atualizada em 09/10/2026 (inclui todas as mudanças do aplicativo até esta versão)</div></section></div>`;
 return `<div class="man-frame${off}" data-page="${p.n}"><section class="man-sheet" aria-label="Página ${p.n}">
  <header class="man-ph">ObraTop | Manual Técnico de Utilização</header>
  <div class="man-pb">${p.ids.map(id=>sectionHtml(id,ctx)).join('')}</div>
  <div class="man-pf"><span>${esc(MANUAL_VERSION)} - Homologação validada | Gestão integrada de obras e contratos</span><span>Página ${p.n}</span></div>
  <div class="man-pband"><span>${esc(FOOT)}</span><b>${p.n}</b></div>
 </section></div>`;
}

// Estado mantido entre redesenhos (a tela é remontada quando os dados sincronizam)
let curPage=1,curSearch='',keyHandler=null;

export function mountManual({container,work,data,members,snapshots,engineeringProjects,editable,orgId,user,onSave,onOpenRoute,download}){
 let items=(work?.implantation&&work.implantation.items)||{};
 const counts=work?autoCounts({workId:work.id,work,data,members,snapshots,engineeringProjects}):{};
 const ctx={work,items,counts,editable};
 const total=PAGES.length;
 if(curPage<1||curPage>total)curPage=1;
 container.innerHTML=`<div class="man">
  <div class="hero man-screen"><div><h1>Manual Técnico e Implantação</h1><div class="muted">Guia de implantação e utilização do ObraTop — Manual ${esc(MANUAL_VERSION)} (homologação validada)</div></div></div>
  <div class="man-toolbar man-screen" role="toolbar" aria-label="Navegação do manual">
   <div class="man-nav"><button type="button" class="btn small" id="manPrev" aria-label="Página anterior">◀ Anterior</button>
    <select id="manGo" aria-label="Ir para a página">${PAGES.map(p=>`<option value="${p.n}">Pág. ${p.n} — ${esc(pageLabel(p))}</option>`).join('')}</select>
    <button type="button" class="btn small" id="manNext" aria-label="Próxima página">Próxima ▶</button>
    <span id="manInfo" class="man-info" aria-live="polite"></span></div>
   <div class="man-find"><input id="manSearch" type="search" placeholder="Buscar no manual…" aria-label="Buscar no manual"></div>
   <div class="man-actions"><button type="button" class="btn small" id="manCsv" ${work?'':'disabled'}>⬇ Checklist (CSV)</button><button type="button" class="btn small" id="manPrintOne">Imprimir esta página</button><button type="button" class="btn primary small" id="manPrint">🖨 Imprimir / PDF</button></div>
  </div>
  <div id="manHits" class="man-hits man-screen" aria-live="polite"></div>
  <div class="man-stage" id="manStage">${PAGES.map(p=>frameHtml(p,ctx,p.n===curPage)).join('')}</div>
  <p class="man-tip man-screen">Dica: use as setas ← → do teclado para virar a página. A impressão sai em A4, com a capa e as 7 páginas do manual.</p></div>`;

 const root=container.querySelector('.man');
 const q=s=>container.querySelector(s),qa=s=>[...container.querySelectorAll(s)];
 const frames=qa('.man-frame');

 function clearMarks(){qa('mark.man-mark').forEach(m=>{m.replaceWith(document.createTextNode(m.textContent))});frames.forEach(f=>f.normalize())}
 function highlight(frame,term){
  const t=fold(term);if(!t)return;
  const walker=document.createTreeWalker(frame,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest('script,style,select,option,button,textarea'))return NodeFilter.FILTER_REJECT;return fold(n.nodeValue).includes(t)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
   const txt=node.nodeValue,f=fold(txt),frag=document.createDocumentFragment();let i=0,at;
   while((at=f.indexOf(t,i))>=0){
    if(at>i)frag.append(txt.slice(i,at));
    const m=document.createElement('mark');m.className='man-mark';m.textContent=txt.slice(at,at+t.length);frag.append(m);i=at+t.length;
   }
   if(i<txt.length)frag.append(txt.slice(i));
   node.replaceWith(frag);
  });
 }
 function countHits(term){
  const t=fold(term);if(!t)return[];
  return PAGES.filter(p=>!p.cover).map(p=>{const f=frames[p.n-1];const text=fold([...f.querySelectorAll('.man-sec')].map(e=>e.textContent).join(' '));let c=0,i=0,at;while((at=text.indexOf(t,i))>=0){c++;i=at+t.length}return {n:p.n,c}}).filter(x=>x.c>0);
 }
 function show(n,scroll){
  curPage=Math.min(total,Math.max(1,n));
  frames.forEach((f,i)=>f.classList.toggle('man-off',i+1!==curPage));
  q('#manGo').value=String(curPage);
  q('#manInfo').textContent=`Página ${curPage} de ${total}`;
  q('#manPrev').disabled=curPage<=1;q('#manNext').disabled=curPage>=total;
  clearMarks();if(curSearch)highlight(frames[curPage-1],curSearch);
  if(scroll)q('.man-toolbar').scrollIntoView({block:'start',behavior:'auto'});
 }
 function applySearch(term){
  curSearch=term.trim();
  const hits=countHits(curSearch),box=q('#manHits');
  if(!curSearch)box.innerHTML='';
  else if(!hits.length)box.innerHTML=`<span class="muted">Nenhum resultado para “${esc(curSearch)}”.</span>`;
  else box.innerHTML=`<span class="muted">${hits.reduce((a,x)=>a+x.c,0)} ocorrência(s) em:</span> `+hits.map(h=>`<button type="button" class="man-chip" data-man-goto="${h.n}">Pág. ${h.n} <small>(${h.c})</small></button>`).join('');
  qa('[data-man-goto]').forEach(b=>b.onclick=()=>show(Number(b.dataset.manGoto),true));
  clearMarks();if(curSearch)highlight(frames[curPage-1],curSearch);
 }

 q('#manPrev').onclick=()=>show(curPage-1,true);
 q('#manNext').onclick=()=>show(curPage+1,true);
 q('#manGo').onchange=e=>show(Number(e.target.value),true);
 const search=q('#manSearch');search.value=curSearch;
 search.oninput=e=>applySearch(e.target.value);
 qa('[data-man-route]').forEach(b=>b.onclick=()=>onOpenRoute(b.dataset.manRoute));

 // Impressão: A4 com margem zero apenas durante a impressão do manual
 function doPrint(onlyCurrent){
  const st=document.createElement('style');st.id='manPrintStyle';
  st.textContent='@page{size:A4;margin:0}.appCopyright{display:none!important}';
  document.head.appendChild(st);
  root.classList.toggle('man-print-one',!!onlyCurrent);
  const clean=()=>{st.remove();root.classList.remove('man-print-one');window.removeEventListener('afterprint',clean)};
  window.addEventListener('afterprint',clean);
  setTimeout(()=>window.print(),80);
 }
 q('#manPrint').onclick=()=>doPrint(false);
 q('#manPrintOne').onclick=()=>doPrint(true);

 const csv=q('#manCsv');
 if(csv&&work)csv.onclick=()=>{
  const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['Obra','Item','Verificação','Situação','Responsável','Data','Registros no sistema'],...CHECKLIST.map(([n,label])=>{const it=items[n]||{};const c=counts[n];return [work.name,n,label,it.done?'Conferido':'Pendente',it.byEmail||'',it.at?fmtDate(it.at):'',c===null||c===undefined?'':c]})];
  const safe=String(work.id).replace(/[^a-z0-9_-]/gi,'_');
  download(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`ObraTop_Checklist_Implantacao_${safe}.csv`);
 };

 qa('input[data-man-item]').forEach(box=>box.onchange=async()=>{
  if(!editable||!work){box.checked=!box.checked;return}
  const n=box.dataset.manItem,status=q('#manStatus');
  const next={...items};
  if(box.checked)next[n]={done:true,by:user?.uid||'',byEmail:user?.email||'',at:new Date().toISOString()};
  else delete next[n];
  const payload={manualVersion:MANUAL_VERSION,items:next};
  qa('input[data-man-item]').forEach(b=>b.disabled=true);
  if(status)status.textContent='Salvando…';
  try{await onSave(payload);items=next;qa('input[data-man-item]').forEach(b=>b.disabled=!editable);if(status)status.textContent=''}
  catch(err){
   box.checked=!box.checked;qa('input[data-man-item]').forEach(b=>b.disabled=!editable);
   if(status)status.textContent='Não foi possível salvar: '+(err?.message||err);
  }
 });

 // Teclado: ← → Home End (somente quando o foco não está em campo de texto)
 if(keyHandler)document.removeEventListener('keydown',keyHandler);
 keyHandler=e=>{
  if(!root.isConnected){document.removeEventListener('keydown',keyHandler);keyHandler=null;return}
  if(e.target.closest&&e.target.closest('input,select,textarea,[contenteditable]'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='ArrowLeft'){show(curPage-1,true);e.preventDefault()}
  else if(e.key==='ArrowRight'){show(curPage+1,true);e.preventDefault()}
  else if(e.key==='Home'){show(1,true);e.preventDefault()}
  else if(e.key==='End'){show(total,true);e.preventDefault()}
 };
 document.addEventListener('keydown',keyHandler);

 show(curPage,false);
 if(curSearch)applySearch(curSearch);
}
