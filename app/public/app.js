import {mountEconomics} from './economics-ui.mjs';
import {mountManual} from './manual-ui.mjs';
import * as calc from './calc.mjs';
import {GLOSS,GL_MAP,glossTip,applyGlossary,glossaryDetailsHtml} from './glossary.mjs';
import * as brand from './branding.mjs';
import * as tpl from './templates.mjs';
import {icon as ico} from './icons.mjs';
import * as mob from './mobile.mjs';
import * as orcUi from './orcamento-ui.mjs';
import * as planUi from './planejamento-ui.mjs';
import * as orc from './orcamento.mjs';
import * as mspj from './msproject.mjs';
import {analyze as analyzeEconomics} from './economics.mjs';
import{initializeApp}from'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut,setPersistence,browserLocalPersistence,sendEmailVerification}from'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import{initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,collection,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,writeBatch,serverTimestamp,query,where,orderBy,limit,increment,documentId,Timestamp}from'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import{getStorage,ref as storageRef,uploadBytes,getDownloadURL,deleteObject}from'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';
import{firebaseConfig as manualConfig,appCheckSiteKey}from'./firebase-config.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}),money0=v=>money(v),pct=v=>`${Math.round(Number(v)||0)}%`,today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`},clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
const dateBR=v=>{if(!v)return'—';if(v?.toDate){try{return v.toDate().toLocaleDateString('pt-BR')}catch{}}const s=String(v).trim();const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return`${iso[3]}/${iso[2]}/${iso[1]}`;const br=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(br)return`${br[1].padStart(2,'0')}/${br[2].padStart(2,'0')}/${br[3]}`;const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString('pt-BR')};
const stamp=v=>v?.toDate?.()?.toLocaleString('pt-BR')||(typeof v==='string'&&!Number.isNaN(Date.parse(v))?new Date(v).toLocaleString('pt-BR'):'—'),safeUrl=v=>/^https:\/\//i.test(v||'')?v:'';
const MODULES=['works','measurements','budgets','activities','suppliers','orders','inventory','finance','quality','contracts','staff','equipment','safety','documents'];
const WORK_LINKED_MODULES=MODULES.filter(x=>!['works','suppliers'].includes(x));
const state={user:null,orgId:null,org:null,member:null,data:Object.fromEntries(MODULES.map(x=>[x,[]])),members:[],audits:[],snapshots:[],route:'dashboard',dashboardFinancialMode:'actual',filters:{workId:'',from:'',to:'',search:''},unsubs:[],ready:new Set(),lastSyncAt:null,lastSyncError:null};
const engineeringState={projects:[],takeoffs:[],selectedProjectId:'',priceBook:[],costBases:[],costBaseMeta:[],loading:false,pdfjs:null};
let engineeringArchive=[];
const RELEASE='3.39.3.0';
const RELEASE_DATE='2026-10-09';
const RELEASE_DATE_BR=RELEASE_DATE.split('-').reverse().join('/');
let ENV_LABEL='Produção';
let snapshotTimer=null;
let integrityTimer=null;
let integrityCheckRunning=false;
const RESTORE_RETENTION_LIMIT=15;
const INTEGRITY_INTERVAL_MS=15*60*1000;
const EXTERNAL_BACKUP_MAX_AGE_DAYS=7;
const ganttCollapsed=new Set();let ganttZoomMode='normal';let ganttCp=false;
let ganttShowLegacy=false;
const GANTT_PHASES={
 '1.1':'Gestão, projetos e planejamento',
 '1.2':'Serviços preliminares',
 '1.3':'Estrutura e recuperação',
 '1.4':'Cobertura e impermeabilização',
 '1.5':'Instalações elétricas',
 '1.6':'Instalações hidrossanitárias',
 '1.7':'Arquitetura e acabamentos',
 '1.8':'Climatização e utilidades',
 '1.9':'Comissionamento e entrega',
 '2.1':'Gestão, projetos e controle',
 '2.2':'Mobilização e serviços preliminares',
 '2.3':'Terraplenagem',
 '2.4':'Drenagem e obras correntes',
 '2.5':'Pavimentação',
 '2.6':'Interseções e acostamentos',
 '2.7':'Sinalização e segurança viária',
 '2.8':'Meio ambiente e recuperação',
 '2.9':'Controle tecnológico e entrega'
};
const GANTT_CANONICAL=[{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.1.1","name":"Planejamento executivo da obra","pred":""},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.1.2","name":"Levantamento cadastral e diagnóstico","pred":""},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.1.3","name":"Compatibilização dos projetos complementares","pred":"1.1.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.2.1","name":"Mobilização e implantação do canteiro","pred":""},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.2.2","name":"Proteções coletivas, tapumes e sinalização","pred":"1.2.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.2.3","name":"Demolições controladas e remoções","pred":"1.2.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.3.1","name":"Inspeção e mapeamento das patologias","pred":"1.2.3"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.3.2","name":"Recuperação de concreto e armaduras","pred":"1.3.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.3.3","name":"Reforço estrutural localizado","pred":"1.3.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.4.1","name":"Revisão da cobertura e substituição de telhas","pred":"1.2.3"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.4.2","name":"Recuperação de calhas e rufos","pred":"1.4.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.4.3","name":"Impermeabilização de áreas críticas","pred":"1.4.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.5.1","name":"Adequação de quadros elétricos","pred":"1.2.3"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.5.2","name":"Distribuição elétrica, cabos e eletrodutos","pred":"1.5.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.5.3","name":"Substituição por luminárias LED","pred":"1.5.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.5.4","name":"Aterramento, equipotencialização e SPDA","pred":"1.5.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.6.1","name":"Adequação da rede de água","pred":"1.2.3"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.6.2","name":"Adequação da rede sanitária","pred":"1.6.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.6.3","name":"Louças, metais e acessórios","pred":"1.6.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.1","name":"Recomposição de alvenarias e vedações","pred":"1.2.3"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.2","name":"Revestimentos de paredes","pred":"1.7.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.3","name":"Pisos e rodapés","pred":"1.7.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.4","name":"Forros e acabamentos de teto","pred":"1.5.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.5","name":"Esquadrias, portas e ferragens","pred":"1.7.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.7.6","name":"Pintura interna e externa","pred":"1.7.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.8.1","name":"Adequação de climatização e drenagem de condensado","pred":"1.5.2"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.9.1","name":"Testes integrados e comissionamento","pred":"1.5.4,1.6.3,1.8.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.9.2","name":"As built, manuais e documentação final","pred":"1.9.1"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.9.3","name":"Limpeza final e desmobilização","pred":"1.7.6"},{"work":"Revitalização do Complexo Administrativo - Aracaju","wbs":"1.9.4","name":"Entrega técnica e aceite","pred":"1.9.2,1.9.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.1.1","name":"Planejamento executivo e plano de ataque","pred":""},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.1.2","name":"Topografia inicial e implantação de marcos","pred":""},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.1.3","name":"Licenças, interferências e liberações","pred":""},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.2.1","name":"Mobilização do canteiro e usina de apoio","pred":""},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.2.2","name":"Sinalização provisória e desvios de tráfego","pred":"2.2.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.2.3","name":"Limpeza, desmatamento e destocamento","pred":"2.2.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.3.1","name":"Escavação, carga e transporte de material","pred":"2.2.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.3.2","name":"Execução e compactação de aterros","pred":"2.3.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.3.3","name":"Regularização e compactação do subleito","pred":"2.3.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.4.1","name":"Bueiros tubulares e celulares","pred":"2.2.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.4.2","name":"Valetas, sarjetas e descidas d'água","pred":"2.4.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.4.3","name":"Drenagem profunda e subdrenos","pred":"2.4.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.5.1","name":"Sub-base estabilizada","pred":"2.3.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.5.2","name":"Base de brita graduada simples","pred":"2.5.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.5.3","name":"Imprimação da base","pred":"2.5.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.5.4","name":"Pintura de ligação","pred":"2.5.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.5.5","name":"Revestimento CBUQ faixa C","pred":"2.5.4"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.6.1","name":"Conformação e revestimento de acostamentos","pred":"2.5.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.6.2","name":"Adequação de acessos e interseções","pred":"2.5.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.7.1","name":"Sinalização horizontal","pred":"2.5.5"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.7.2","name":"Sinalização vertical","pred":"2.5.5"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.7.3","name":"Defensas, delineadores e dispositivos de segurança","pred":"2.5.5"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.8.1","name":"Recuperação de jazidas e áreas de apoio","pred":"2.3.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.8.2","name":"Recomposição vegetal e proteção de taludes","pred":"2.3.3"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.9.1","name":"Controle tecnológico final e correções","pred":"2.5.5"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.9.2","name":"Levantamento as built e documentação","pred":"2.9.1"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.9.3","name":"Desmobilização e limpeza final","pred":"2.7.3,2.8.2"},{"work":"Pavimentação Rodoviária SE-100 - Trecho Demonstrativo","wbs":"2.9.4","name":"Recebimento e entrega do trecho","pred":"2.9.2,2.9.3"}];
function ganttCanonical(x){const wn=norm(workName(x?.workId)),nn=norm(x?.name);return GANTT_CANONICAL.find(r=>norm(r.work)===wn&&norm(r.name)===nn)||null}


const REF_LINKS={finance:{measurementId:'measurements',orderId:'orders',contractId:'contracts'},orders:{inventoryId:'inventory'},measurements:{contractId:'contracts',budgetId:'budgets'},activities:{budgetId:'budgets'},dailyLogs:{activityId:'activities'}};
const schemas={
 works:{title:'Obras',icon:'🏗️',group:'Operação',subtitle:'Cadastro, situação e progresso',roles:['owner','project_user'],fields:[['name','Nome da obra','text',1],['client','Cliente','text',1],['address','Endereço','text'],['start','Início','date',1],['end','Término previsto','date',1],['value','Valor contratado','number'],['status','Status','select',1,['Planejamento','Em andamento','Parada','Concluída']],['progress','Progresso (%)','number'],['engineer','Engº Responsável','text']]},
 measurements:{title:'Medições',icon:'📐',group:'Operação',subtitle:'Avanço físico, aprovação e faturamento',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Data','date',1],['number','Número','text',1],['description','Descrição','textarea',1],['physical','Avanço físico (%)','number'],['value','Valor medido','number'],['contractId','Contrato (opcional)','contract'],['budgetId','Item do orçamento (opcional)','budget'],['retention','Retenção contratual (%)','number'],['deduction','Glosa (R$)','number'],['memo','Memória de cálculo','textarea'],['status','Status','select',1,['Pendente','Aprovada','Faturada','Paga']]]},
 budgets:{title:'Orçamentos',icon:'💰',group:'Planejamento',subtitle:'Custos diretos, BDI e preço de venda',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['category','Categoria','text',1],['description','Serviço ou material','textarea',1],['unit','Unidade','text'],['qty','Quantidade','number'],['unitValue','Valor unitário','number'],['bdi','BDI (%)','number']]},
 activities:{title:'Cronograma',icon:'📅',group:'Planejamento',subtitle:'Cronograma Gantt avançado — anos, meses, dias, duração, quantidades e linha do tempo',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['wbs','EAP / WBS','text'],['name','Atividade','text',1],['start','Início','date',1],['end','Fim','date',1],['durationDays','Dias úteis','number'],['progressMode','Controle de avanço','select',1,['Percentual','Quantidade']],['progress','Progresso (%)','number'],['plannedQty','Quantidade planejada','number'],['actualQty','Quantidade executada','number'],['unit','Unidade','text'],['predecessors','Predecessoras','text'],['responsible','Responsável','text'],['budgetId','Item do orçamento (opcional)','budget'],['status','Status','select',1,['Não iniciada','Em andamento','Atrasada','Concluída']]]},
 dailyLogs:{title:'Diário de Obra',icon:'📓',group:'Operação',subtitle:'Registro diário (RDO): clima, equipes, serviços executados e ocorrências',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Data','date',1],['weather','Clima','select',1,['Bom','Nublado','Chuva fraca','Chuva forte']],['workable','Dia trabalhável','select',1,['Sim','Parcial','Não']],['laborCount','Mão de obra (pessoas)','number'],['equipmentCount','Equipamentos em operação','number'],['activityId','Atividade principal do dia (opcional)','activity'],['progressTo','Avanço acumulado da atividade (%)','number'],['services','Serviços executados','textarea',1],['occurrences','Ocorrências e impedimentos','textarea'],['responsible','Responsável','text'],['status','Status','select',1,['Rascunho','Assinado']]]},
 suppliers:{title:'Fornecedores',icon:'🏪',group:'Suprimentos',subtitle:'Base qualificada de fornecedores',roles:['owner'],fields:[['name','Nome ou razão social','text',1],['cnpj','CNPJ','text'],['phone','Telefone','text'],['email','E-mail','email'],['category','Categoria','text'],['status','Status','select',1,['Ativo','Bloqueado','Inativo']]]},
 orders:{title:'Compras',icon:'🛒',group:'Suprimentos',subtitle:'Pedidos, entregas e aprovações',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['supplierId','Fornecedor','supplier'],['date','Data','date',1],['dueDate','Prazo de entrega','date'],['description','Itens ou descrição','textarea',1],['inventoryId','Material do estoque (opcional)','inventory'],['qty','Quantidade do material (opcional)','number'],['value','Valor total','number'],['status','Status','select',1,['Solicitado','Em cotação','Aguardando aprovação','Aprovado','Entregue','Cancelado']]]},
 inventory:{title:'Estoque de Materiais',icon:'📦',group:'Suprimentos',subtitle:'Estoque mínimo, máximo, segurança, ponto de pedido e Curva ABC',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Data de referência','date',1],['material','Material / insumo','text',1],['category','Categoria','text'],['unit','Unidade','text',1],['currentStock','Estoque atual','number',1],['minStock','Estoque mínimo','number',1],['maxStock','Estoque máximo','number',1],['safetyStock','Estoque de segurança','number'],['avgDailyConsumption','Consumo médio diário','number'],['leadTimeDays','Prazo de reposição (dias)','number'],['reorderPoint','Ponto de pedido manual','number'],['anticipationStock','Estoque de antecipação','number'],['unitValue','Valor unitário','number']]},
 finance:{title:'Financeiro',icon:'💵',group:'Financeiro',subtitle:'Receitas, despesas e fluxo de caixa',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Competência','date',1],['dueDate','Vencimento','date'],['paymentDate','Liquidação (pagamento/recebimento)','date'],['description','Descrição','text',1],['type','Tipo','select',1,['Receita','Despesa']],['category','Categoria','text',1],['value','Valor','number'],['status','Status','select',1,['Previsto','Pendente','Pago','Recebido','Vencido']],['measurementId','Medição de origem (opcional)','measurement'],['orderId','Pedido de origem (opcional)','order'],['contractId','Contrato (opcional)','contract']]},
 quality:{title:'Qualidade',icon:'✅',group:'Conformidade',subtitle:'Não conformidades e planos de ação',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Data','date',1],['stage','Etapa ou serviço','text'],['issue','Não conformidade','textarea',1],['responsible','Responsável','text'],['deadline','Prazo','date'],['severity','Severidade','select',1,['Crítica','Maior','Menor']],['status','Status','select',1,['Aberta','Em andamento','Resolvida']]]},
 contracts:{title:'Contratos',icon:'📜',group:'Financeiro',subtitle:'Vigências, valores e vencimentos',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['number','Número','text',1],['party','Contraparte','text',1],['object','Objeto','textarea',1],['start','Início','date'],['end','Fim','date'],['value','Valor','number'],['addendum','Aditivos acumulados (R$)','number'],['addendumNote','Motivo dos aditivos','textarea'],['status','Status','select',1,['Ativo','Suspenso','Encerrado']]]},
 staff:{title:'Pessoal',icon:'👷',group:'Administração',subtitle:'Equipe, funções, custos e alocação',roles:['owner','project_user'],fields:[['name','Nome','text',1],['role','Função','text',1],['admission','Admissão','date'],['salary','Salário','number'],['workId','Obra alocada','work'],['status','Status','select',1,['Ativo','Férias','Inativo']]]},
 equipment:{title:'Equipamentos',icon:'🔧',group:'Operação',subtitle:'Patrimônio, custos, horímetro e manutenção',roles:['owner','project_user'],fields:[['name','Equipamento','text',1],['code','Patrimônio ou código','text',1],['workId','Obra alocada','work'],['startDate','Início de alocação','date'],['monthlyCost','Custo mensal','number'],['hourmeter','Horímetro','number'],['nextMaintenance','Próxima manutenção','date'],['status','Status','select',1,['Operacional','Manutenção','Parado']]]},
 safety:{title:'Segurança',icon:'⚠️',group:'Conformidade',subtitle:'DDS, inspeções, incidentes e treinamentos',roles:['owner','project_user'],fields:[['workId','Obra','work',1],['date','Data','date',1],['type','Tipo','select',1,['DDS','Inspeção','Incidente','Treinamento']],['description','Descrição','textarea',1],['responsible','Responsável','text'],['status','Status','select',1,['Aberto','Em acompanhamento','Concluído']]]},
 documents:{title:'Documentos',icon:'📁',group:'Administração',subtitle:'Arquivos, revisões, vencimentos e aprovações',roles:['owner','project_user'],fields:[['workId','Obra','work'],['name','Nome do documento','text',1],['category','Categoria','text',1],['date','Data','date'],['expiry','Vencimento','date'],['revision','Revisão','text'],['status','Status','select',1,['Rascunho','Em aprovação','Aprovado','Vencido']],['reference','Link HTTPS','url'],['file','Enviar arquivo','file'],['notes','Observações','textarea']]}
};
const nav=[['Início',[['dashboard','📊','Painel executivo'],['alerts','🔔','Alertas']]],
['1 · Configuração inicial',[['settings','⚙️','Configurações'],['members','👥','Equipe']]],
['2 · Cadastros',[['works','🏗️','Obras'],['contracts','📜','Contratos'],['suppliers','🏪','Fornecedores'],['staff','👷','Pessoal'],['documents','📁','Documentos']]],
['3 · Projeto e planejamento',[['engineering','🧠','Projetos e Quantitativos'],['budgets','💰','Orçamentos'],['activities','📅','Cronograma']]],
['4 · Suprimentos',[['orders','🛒','Compras'],['inventory','📦','Estoque']]],
['5 · Execução da obra',[['dailyLogs','📓','Diário de Obra'],['equipment','🔧','Equipamentos'],['quality','✅','Qualidade'],['safety','⚠️','Segurança']]],
['6 · Medição e financeiro',[['measurements','📐','Medições'],['finance','💵','Financeiro'],['economics','📊','Economia e Equilíbrio']]],
['7 · Controle e relatórios',[['resourcecurves','📈','Curvas S e ABC'],['reports','📄','Relatórios']]],
['Administração',[['audit','🧾','Auditoria'],['trash','🗑️','Lixeira'],['maintenance','🛡️','Integridade e manutenção'],['manual','📘','Manual e Implantação'],['legal','⚖️','Direitos Autorais']]]];

let app,auth,fs,storage;
async function config(){if(manualConfig?.projectId)return manualConfig;const r=await fetch('/__/firebase/init.json',{cache:'no-store'});if(!r.ok)throw Error('Configuração do Firebase indisponível.');return r.json()}
async function boot(){try{const c=await config();ENV_LABEL=/(teste|test|homolog|stag|dev|sandbox)/i.test(c.projectId||'')?'Homologação':'Produção';renderReleaseBar();app=initializeApp(c);{const key=appCheckSiteKey||c.appCheckSiteKey;if(key){try{const ac=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js');ac.initializeAppCheck(app,{provider:new ac.ReCaptchaV3Provider(key),isTokenAutoRefreshEnabled:true})}catch(e){console.warn('App Check não iniciado:',e)}}}auth=getAuth(app);fs=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});storage=getStorage(app);await setPersistence(auth,browserLocalPersistence);wireAuth();onAuthStateChanged(auth,handleAuth);$('#setupNotice').textContent='Serviço conectado. Entre ou crie sua conta.'}catch(e){console.error(e);$('#setupNotice').textContent='Falha de configuração: '+e.message}}
function wireAuth(){
 $('#loginBtn').onclick=()=>authAction(()=>signInWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPass').value));
 $('#registerBtn').onclick=()=>authAction(()=>createUserWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPass').value));
 $('#resetBtn').onclick=()=>authAction(async()=>{const e=$('#loginEmail').value.trim();if(!e)throw Error('Informe seu e-mail.');await sendPasswordResetEmail(auth,e);toast('E-mail de recuperação enviado.')});
 $('#logoutBtn').onclick=$('#onboardingSignOut').onclick=()=>signOut(auth);const bb=$('#blockedBack');if(bb)bb.onclick=()=>{state.blocked=false;show('loginView')};const loginLegal=$('#loginLegalBtn');if(loginLegal)loginLegal.onclick=()=>openLegalModal();$('#menuBtn').onclick=()=>toggleDrawer();$('#alertsBtn').onclick=()=>route('alerts');const tb=$('#themeBtn');if(tb){const saved=localStorage.getItem('obratop-theme')||'light';document.documentElement.dataset.theme=saved;tb.innerHTML=ico(saved==='dark'?'sun':'moon',20);tb.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('obratop-theme',next);tb.innerHTML=ico(next==='dark'?'sun':'moon',20)}};
 $$('.tab[data-onboard]').forEach(b=>b.onclick=()=>{$$('.tab[data-onboard]').forEach(x=>x.classList.toggle('active',x===b));$('#createOrgForm').classList.toggle('hidden',b.dataset.onboard!=='create');$('#joinOrgForm').classList.toggle('hidden',b.dataset.onboard!=='join')});
 $('#createOrgForm').onsubmit=createOrg;$('#joinOrgForm').onsubmit=joinOrg;$('#verifyResend').onclick=async()=>{try{await sendEmailVerification(auth.currentUser);$('#verifyMsg').textContent='E-mail reenviado. Confira também a caixa de spam.'}catch(e){$('#verifyMsg').textContent='Não foi possível reenviar agora: '+friendly(e)}};$('#verifyCheck').onclick=async()=>{try{const u=auth.currentUser;await u.reload();if(u.emailVerified){await u.getIdToken?.(true);handleAuth(u)}else $('#verifyMsg').textContent='Ainda não consta como verificado. Abra o link do e-mail e tente de novo.'}catch(e){$('#verifyMsg').textContent=friendly(e)}};
}
async function authAction(fn){try{await fn()}catch(e){alert(friendly(e))}}
function friendly(e){const c=e?.code||'',m=e?.message||String(e);if(c.includes('invalid-credential'))return'E-mail ou senha inválidos.';if(c.includes('email-already-in-use'))return'Este e-mail já possui conta.';if(c.includes('weak-password'))return'A senha deve ter pelo menos 6 caracteres.';if(c.includes('invalid-email'))return'E-mail inválido.';if(c.includes('permission-denied'))return'Você não possui permissão para esta ação.';if(c.includes('storage/unauthorized'))return'O armazenamento de anexos não está autorizado para esta conta/obra.';if(c.includes('storage/bucket-not-found')||c.includes('storage/unknown'))return'O armazenamento de anexos ainda não está disponível neste projeto. Você pode salvar o documento sem arquivo e usar um link HTTPS no campo Referência.';return m}
function inviteCodeFromUrl(){return new URLSearchParams(location.search).get('invite')?.trim()||''}
async function handleAuth(user){cleanup();state.user=user;if(!user){if(state.blocked){show('blockedView');return}show('loginView');const code=inviteCodeFromUrl();if(code)$('#setupNotice').textContent='Convite recebido. Entre ou crie sua conta para ser vinculado automaticamente à obra.';return}const p=await getDoc(doc(fs,'users',user.uid));if(p.exists()&&p.data().currentOrg)return enterOrg(p.data().currentOrg);if(!user.emailVerified)return showVerifyGate(user);$('#verifyBox')?.classList.add('hidden');$('#onboardingForms')?.classList.remove('hidden');const code=inviteCodeFromUrl();if(code){try{return await acceptInviteCode(code,true)}catch(x){alert(friendly(x))}}show('onboardingView')}
async function showVerifyGate(user){show('onboardingView');$('#verifyBox').classList.remove('hidden');$('#onboardingForms').classList.add('hidden');$('#verifyEmail').textContent=user.email||'';if(!state.verifySentFor||state.verifySentFor!==user.uid){state.verifySentFor=user.uid;try{await sendEmailVerification(user);$('#verifyMsg').textContent='Enviamos um e-mail de verificação. Abra o link e volte aqui.'}catch(e){$('#verifyMsg').textContent='Não foi possível enviar agora: '+friendly(e)}}}
function show(id){['loginView','onboardingView','appView','blockedView'].forEach(x=>{const e=$('#'+x);if(e)e.classList.toggle('hidden',x!==id)})}
async function showBlocked(reason){state.blocked=true;cleanup();state.orgId=null;state.member=null;const m=$('#blockedMsg');if(m)m.textContent=reason==='blocked'?'Seu acesso ao ObraTop foi bloqueado pelo Administrador geral.':'Seu acesso ao ObraTop foi removido pelo Administrador geral.';show('blockedView');try{await signOut(auth)}catch{}}
let accessChecking=false;
async function accessLostCheck(e){if(accessChecking||state.blocked||!state.orgId||!state.user||!String(e?.code||'').includes('permission-denied'))return;accessChecking=true;try{const m=await getDoc(doc(fs,'organizations',state.orgId,'members',state.user.uid));if(!m.exists()||m.data().status!=='active')showBlocked(m.exists()?m.data().status:'removed')}catch(x){if(String(x?.code||'').includes('permission-denied'))showBlocked('removed')}finally{accessChecking=false}}
async function createOrg(e){e.preventDefault();try{const f=new FormData(e.target),id=crypto.randomUUID(),b=writeBatch(fs),now=serverTimestamp(),name=f.get('name').trim();b.set(doc(fs,'organizations',id),{name,cnpj:f.get('cnpj').trim(),ownerUid:state.user.uid,legacyMigrated:false,createdAt:now,updatedAt:now});b.set(doc(fs,'organizations',id,'members',state.user.uid),{email:state.user.email,name:state.user.displayName||state.user.email,role:'owner',status:'active',createdAt:now});b.set(doc(fs,'users',state.user.uid),{email:state.user.email,currentOrg:id,updatedAt:now},{merge:true});await b.commit();await enterOrg(id)}catch(x){alert(friendly(x))}}
async function migrateLegacy(orgId){const legacy=await getDoc(doc(fs,'users',state.user.uid,'state','main'));if(!legacy.exists()||!legacy.data()?.data)return;const old=legacy.data().data;for(const type of MODULES){const active=Array.isArray(old[type])?old[type]:[],trash=Array.isArray(old.trash)?old.trash.filter(t=>t.type===type&&t.item).map(t=>({...t.item,deleted:true,deletedAt:t.deletedAt||today(),deleteReason:t.reason||''})):[],rows=[...active,...trash];for(let start=0;start<rows.length;start+=400){const b=writeBatch(fs);rows.slice(start,start+400).forEach(x=>{const id=x.id||crypto.randomUUID();b.set(doc(fs,'organizations',orgId,type,id),{...x,createdAt:serverTimestamp(),createdBy:state.user.uid,updatedAt:serverTimestamp(),updatedBy:state.user.uid,migratedFromV2:true})});await b.commit()}}await addDoc(collection(fs,'organizations',orgId,'audits'),{action:'migration',module:'system',recordId:state.user.uid,changes:{source:'V2',collections:MODULES},userId:state.user.uid,userEmail:state.user.email,at:serverTimestamp()})}
async function acceptInviteCode(code,automatic=false){const inv=await getDoc(doc(fs,'invites',code));if(!inv.exists())throw Error('Convite inválido ou expirado.');const d=inv.data();if(d.email.toLowerCase()!==state.user.email.toLowerCase())throw Error('Este convite pertence a outro e-mail.');if(!d.workId&&!['manager','finance'].includes(d.role))throw Error('Convite sem obra atribuída. Solicite um novo convite ao administrador.');const b=writeBatch(fs),now=serverTimestamp();b.set(doc(fs,'organizations',d.orgId,'members',state.user.uid),{email:state.user.email,name:state.user.displayName||state.user.email,role:['viewer','manager','finance'].includes(d.role)?d.role:'project_user',status:'active',workId:d.workId||'',inviteCode:code,createdAt:now,updatedAt:now});b.set(doc(fs,'users',state.user.uid),{email:state.user.email,currentOrg:d.orgId,updatedAt:now},{merge:true});b.delete(doc(fs,'invites',code));await b.commit();if(d.workId&&!['viewer','manager','finance'].includes(d.role)){try{await updateDoc(doc(fs,'organizations',d.orgId,'works',d.workId),{engineerUid:state.user.uid,engineerEmail:state.user.email,engineer:d.engineerName||state.user.displayName||state.user.email,updatedAt:serverTimestamp()})}catch(e){console.warn('Vínculo como Engº responsável não gravado:',e)}}if(automatic)history.replaceState({},'',location.pathname);await enterOrg(d.orgId)}
async function joinOrg(e){e.preventDefault();try{await acceptInviteCode(new FormData(e.target).get('code').trim())}catch(x){alert(friendly(x))}}
async function enterOrg(id){state.orgId=id;let o,m;try{[o,m]=await Promise.all([getDoc(doc(fs,'organizations',id)),getDoc(doc(fs,'organizations',id,'members',state.user.uid))])}catch(e){if(String(e?.code||'').includes('permission-denied'))return showBlocked('removed');throw e}if(o.exists()&&!m.exists())return showBlocked('removed');if(!o.exists())return show('onboardingView');if(m.data().status&&m.data().status!=='active')return showBlocked(m.data().status);state.org={id,...o.data()};state.member={id:state.user.uid,...m.data()};if(state.member.role==='owner'&&/homologa|teste/i.test(String(state.org.name||''))){try{await updateDoc(doc(fs,'organizations',id),{name:'ObraTop',updatedAt:serverTimestamp()});state.org.name='ObraTop'}catch(e){console.warn('Não foi possível atualizar o nome da organização:',e)}}show('appView');$('#orgLabel').textContent=state.org.name||'ObraTop';$('#userLabel').textContent=state.user.email;$('#roleLabel').textContent=roleName(state.member.role);applyBranding();buildNav();buildFilters();if(state.member.role==='owner'&&state.org.legacyMigrated===false){setSync('Migrando dados…','warn');try{await migrateLegacy(id);await updateDoc(doc(fs,'organizations',id),{legacyMigrated:true,updatedAt:serverTimestamp()});state.org.legacyMigrated=true}catch(e){console.error(e);setSync('Migração pendente','bad');alert('A migração da V2 não terminou. Recarregue a página para tentar novamente antes de cadastrar novos dados.');return}}subscribeAll();startIntegrityMonitor();maybeExternalBackupReminder();route('dashboard')}
function cleanup(){state.unsubs.forEach(x=>x());state.unsubs=[];state.ready.clear();state.snapshots=[];state.snapshotBoot=false;state.workFilterRestored=false;if(snapshotTimer){clearTimeout(snapshotTimer);snapshotTimer=null}if(integrityTimer){clearInterval(integrityTimer);integrityTimer=null}integrityCheckRunning=false;MODULES.forEach(x=>state.data[x]=[])}
async function probeOptionalModules(){
 if(MODULES.includes('dailyLogs')||!state.orgId||!state.member)return;
 try{const col=collection(fs,'organizations',state.orgId,'dailyLogs'),aw=assignedWorkId()||'__sem_obra__';await getDocs(seesAllWorks()?query(col,limit(1)):query(col,where('workId','==',aw),limit(1)));MODULES.push('dailyLogs');state.data.dailyLogs=state.data.dailyLogs||[];state.features={...(state.features||{}),dailyLogs:true}}catch(e){state.features={...(state.features||{}),dailyLogs:false};console.info('Diário de Obra indisponível: as regras do Firestore ainda não liberam a coleção dailyLogs.')}
}
async function subscribeAll(){await probeOptionalModules();buildNav();subscribeAllCore()}
function subscribeAllCore(){setSync('Sincronizando…','warn');const readable=MODULES.filter(canRead);for(const type of readable){const scoped=!seesAllWorks(),aw=assignedWorkId()||'__sem_obra__';let q,byWork=false;if(scoped&&type==='works')q=query(collection(fs,'organizations',state.orgId,type),where(documentId(),'==',aw));else if(scoped&&hasWorkField(type)){q=query(collection(fs,'organizations',state.orgId,type),where('workId','==',aw));byWork=true}else q=query(collection(fs,'organizations',state.orgId,type),orderBy('createdAt','desc'));state.unsubs.push(onSnapshot(q,s=>{state.data[type]=s.docs.map(d=>({id:d.id,...d.data()}));if(scoped)state.data[type].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));updateAlertIndicator();if(type==='works')buildFilters();state.ready.add(type);if(state.ready.size===readable.length){state.lastSyncAt=new Date();state.lastSyncError=null;localStorage.setItem('obratop-last-sync',state.lastSyncAt.toISOString());setSync('Sincronizado','ok');if(!state.snapshotBoot){state.snapshotBoot=true;scheduleSnapshotCapture();if(isAdmin())setTimeout(maybeAutoRestorePoint,20000)}if(state.route==='maintenance')render()}if(state.route==='economics'||state.route==='manual'||state.route==='dashboard'||state.route===type||state.route==='alerts'||state.route==='reports'||state.route==='trash')render()},e=>{console.error(type,e);state.lastSyncError={module:type,message:friendly(e),at:new Date()};setSync('Falha de sincronização','bad');accessLostCheck(e);if(state.route==='maintenance'||state.route==='economics')render()}))}state.unsubs.push(onSnapshot(seesAllWorks()?query(collection(fs,'organizations',state.orgId,'progressSnapshots'),orderBy('date','asc')):query(collection(fs,'organizations',state.orgId,'progressSnapshots'),where('workId','==',assignedWorkId()||'__sem_obra__')),s=>{state.snapshots=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(state.route==='dashboard'||state.route==='maintenance')render()},e=>console.warn('Histórico da Curva S indisponível:',e)));state.unsubs.push(onSnapshot(isAdmin()?collection(fs,'organizations',state.orgId,'members'):query(collection(fs,'organizations',state.orgId,'members'),where(documentId(),'==',state.user.uid)),s=>{state.members=s.docs.map(d=>({id:d.id,...d.data()}));const self=state.members.find(x=>x.id===state.user.uid);if(!self||self.status!=='active'){showBlocked(self?.status||'removed');return}if(self.role!==state.member.role||self.workId!==state.member.workId){state.member=self;cleanup();buildNav();subscribeAll();route('dashboard');return}if(['members','settings','maintenance'].includes(state.route))render()},e=>{console.warn('members',e);accessLostCheck(e)}));if(isAdmin())state.unsubs.push(onSnapshot(query(collection(fs,'organizations',state.orgId,'audits'),orderBy('at','desc'),limit(300)),s=>{state.audits=s.docs.slice(0,300).map(d=>({id:d.id,...d.data()}));if(state.route==='audit'||state.route==='maintenance')render()}))}
function setSync(t,k){$('#syncStatus').textContent=t;$('#syncStatus').className='badge '+k}
function roleName(r){return({owner:'Administrador geral',manager:'Gestor (todas as obras)',finance:'Financeiro (todas as obras)',project_user:'Engº responsável da obra',viewer:'Consulta (somente leitura)'})[r]||'Perfil legado'}
function isManager(){return state.member?.role==='manager'}
function isFinance(){return state.member?.role==='finance'}
function seesAllWorks(){return isAdmin()||isManager()||isFinance()}
function canSeeSalary(){return isAdmin()||isFinance()}
const FINANCE_WRITE=['finance','measurements','contracts','orders','budgets'];
function isViewer(){return state.member?.role==='viewer'}
function isAdmin(){return state.member?.role==='owner'}
function assignedWorkId(){return state.member?.workId||''}
function hasWorkField(type){return type==='works'||schemas[type]?.fields?.some(f=>f[0]==='workId')}
function canRead(type){return !!state.member}
function canCreate(type){if(isAdmin()||isManager())return true;if(isFinance())return FINANCE_WRITE.includes(type);if(isViewer()||!assignedWorkId())return false;return type!=='works'&&type!=='suppliers'&&hasWorkField(type)}
function canEdit(type,item){if(isAdmin())return true;if(isManager())return !!item;if(isFinance())return FINANCE_WRITE.includes(type)&&!!item;if(isViewer())return false;const wid=assignedWorkId();if(!wid||!item)return false;if(type==='works')return item.id===wid;if(type==='suppliers')return false;return hasWorkField(type)&&item.workId===wid}
function canDelete(type,item){return isAdmin()}
function can(type){return canCreate(type)}
function buildNav(){$('#sidebar').innerHTML=nav.map(([g,items],gi)=>{items=items.filter(([r])=>(!['audit','trash','maintenance'].includes(r)||isAdmin())&&(r!=='dailyLogs'||MODULES.includes('dailyLogs'))&&(!schemas[r]||canRead(r)));return`<div class="navgroup">${g}</div>${items.map(([r,i,t])=>`<button class="navbtn" data-g="${gi%8}" data-route="${r}"><span class="navico">${ico(r,18)||i}</span><span class="navlbl">${t}</span></button>`).join('')}`}).join('');$$('.navbtn').forEach(b=>b.onclick=()=>route(b.dataset.route));buildDrawerFoot();buildBottomNav()}
function workFilterKey(){return`obratop-filter-work-${state.orgId||'none'}-${state.user?.uid||''}`}
function buildFilters(){const works=state.data.works.filter(x=>!x.deleted);if(!state.workFilterRestored&&works.length){state.workFilterRestored=true;let saved='';try{saved=localStorage.getItem(workFilterKey())||''}catch{}if(saved&&!state.filters.workId&&works.some(w=>w.id===saved))state.filters.workId=saved}$('#globalFilters').innerHTML=`<select id="filterWork"><option value="">Todas as obras</option>${works.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select><input id="filterFrom" type="date" title="Data inicial"><input id="filterTo" type="date" title="Data final"><input id="filterSearch" type="search" placeholder="Pesquisar"><button id="clearFilters" class="btn small">Limpar</button>`;$('#filterWork').value=state.filters.workId;$('#filterFrom').value=state.filters.from;$('#filterTo').value=state.filters.to;$('#filterSearch').value=state.filters.search;const applyFilters=()=>{const oldWork=state.filters.workId;state.filters={workId:$('#filterWork').value,from:$('#filterFrom').value,to:$('#filterTo').value,search:$('#filterSearch').value};if(oldWork!==state.filters.workId)ganttCollapsed.clear();try{localStorage.setItem(workFilterKey(),state.filters.workId||'')}catch{}updateProjectLabel();render()};$('#filterWork').onchange=applyFilters;$('#filterFrom').onchange=applyFilters;$('#filterTo').onchange=applyFilters;$('#filterSearch').oninput=applyFilters;$('#clearFilters').onclick=()=>{state.filters={workId:'',from:'',to:'',search:''};try{localStorage.setItem(workFilterKey(),'')}catch{}ganttCollapsed.clear();buildFilters();updateProjectLabel();render()}}
function updateProjectLabel(){const w=state.data.works.find(x=>x.id===state.filters.workId);$('#projectLabel').textContent=w?.name||'Todas as obras';if(state.member){const own=state.data.works.find(x=>x.id===assignedWorkId());$('#roleLabel').textContent=isAdmin()?roleName(state.member.role):`${roleName(state.member.role)} • ${own?.name||'obra atribuída'}`}}
function route(r){state.route=r;$$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.route===r));toggleDrawer(false);syncBottomNav();render()}
function filtered(type){const f=state.filters,q=f.search.toLowerCase();return(state.data[type]||[]).filter(x=>!x.deleted&&(!f.workId||x.workId===f.workId||type==='works'&&x.id===f.workId)&&(!f.from||!(x.date||x.start)||((x.date||x.start)>=f.from))&&(!f.to||!(x.date||x.end)||((x.date||x.end)<=f.to))&&(!q||Object.values(x).some(v=>String(v).toLowerCase().includes(q))))}
function render(){if(!state.orgId)return;updateProjectLabel();updateAlertIndicator();const fl=$('#footerLegalBtn');if(fl)fl.onclick=()=>route('legal');const r=state.route;try{if(r==='manual')return renderManual();if(r==='economics')return renderEconomics();if(r==='dashboard')return renderDashboard();if(r==='alerts')return renderAlerts();if(r==='resourcecurves')return renderResourceCurves();if(r==='reports')return renderReports();if(r==='engineering')return renderEngineering();if(r==='members')return renderMembers();if(r==='audit')return renderAudit();if(r==='trash')return renderTrash();if(r==='maintenance')return renderMaintenance();if(r==='settings')return renderSettings();if(r==='legal')return renderLegal();if(r==='activities')return renderActivities();if(r==='budgets')return renderBudgetsHub();if(schemas[r])return renderModule(r)}catch(err){console.error('Falha de renderização',r,err);const c=$('#content');if(c)c.innerHTML=head('Erro de visualização','O módulo encontrou um problema ao montar a tela.')+`<div class="card"><div class="sectiontitle">Falha no módulo ${esc(schemas[r]?.title||r)}</div><p class="muted">${esc(err?.message||String(err))}</p><button class="btn primary" id="retryRender">Tentar novamente</button></div>`;const b=$('#retryRender');if(b)b.onclick=()=>render()}}
function head(t,s,a=''){return`<div class="hero"><div><h1>${esc(t)}</h1><div class="muted">${esc(s)}</div></div>${a}</div>`}
function status(s=''){let k=/planejad/i.test(s)?'info':/inativo|cancel|atras|venc|crít|parado|bloqueado/i.test(s)?'bad':/concl|pago|receb|aprov|resol|ativo|operacional|entregue/i.test(s)?'ok':'warn';return`<span class="badge ${k}">${esc(s||'—')}</span>`}
function renderDashboard(){
 const rawWorks=filtered('works'),includeDemo=state.filters.workId?true:localStorage.getItem('obratop-dashboard-include-demo')==='1';
 const works=includeDemo?rawWorks:rawWorks.filter(x=>!x.demoCaixa42),ids=new Set(works.map(x=>x.id)),scope=t=>filtered(t).filter(x=>ids.has(x.workId)||(!state.filters.workId&&t==='suppliers'));
 const fin=scope('finance'),bud=scope('budgets'),acts=scope('activities'),meas=scope('measurements'),orders=scope('orders'),inventory=scope('inventory'),staff=scope('staff'),equipment=scope('equipment'),contracts=scope('contracts'),quality=scope('quality'),suppliers=filtered('suppliers');
 const contracted=works.reduce((s,x)=>s+(+x.value||0),0),budgetNoBdi=bud.reduce((s,x)=>s+(+x.qty||0)*(+x.unitValue||0),0),budget=bud.reduce((s,x)=>s+(+x.qty||0)*(+x.unitValue||0)*(1+(+x.bdi||0)/100),0);
 const revenue=fin.filter(x=>x.type==='Receita').reduce((s,x)=>s+(+x.value||0),0),expense=fin.filter(x=>x.type==='Despesa').reduce((s,x)=>s+(+x.value||0),0);
 const received=fin.filter(x=>x.type==='Receita'&&x.status==='Recebido').reduce((s,x)=>s+(+x.value||0),0),paid=fin.filter(x=>x.type==='Despesa'&&x.status==='Pago').reduce((s,x)=>s+(+x.value||0),0);
 const receivable=Math.max(0,revenue-received),payable=fin.filter(x=>x.type==='Despesa'&&!['Pago'].includes(x.status)).reduce((s,x)=>s+(+x.value||0),0);
 const measured=meas.filter(x=>['Aprovada','Faturada','Paga'].includes(x.status)).reduce((s,x)=>s+(+x.value||0),0),purchases=orders.filter(x=>['Aprovado','Entregue'].includes(x.status)).reduce((s,x)=>s+(+x.value||0),0);
 const avg=works.length?works.reduce((s,x)=>s+workProgress(x),0)/works.length:0,lateActs=acts.filter(x=>x.status==='Atrasada'||x.end&&x.end<today()&&x.status!=='Concluída').length;
 const lateWorks=works.filter(x=>x.end&&x.end<today()&&x.status!=='Concluída').length,openNC=quality.filter(x=>x.status!=='Resolvida').length,monthly=monthSeries(fin);
 const incurred=calc.incurredCost(fin,today()),perf=schedulePerformance(acts,budget,incurred),margin=contracted?((contracted-paid)/contracted*100):0,forecast=forecastFinish(works,avg);
 const costCats=aggregate(fin.filter(x=>x.type==='Despesa'),'category','value').slice(0,8),measureStatus=countBy(meas,'status'),activityStatus=countBy(acts,'status');
 const attention=worksAttention(works,acts,fin,quality,contracts);
 const supplierTotals=aggregateOrdersBySupplier(orders,suppliers).slice(0,7);
 const scheduleComparison=works.map(w=>{const sp=schedulePerformance(acts.filter(a=>a.workId===w.id),0,0);return{label:w.name,planned:sp.planned,actual:sp.actual,variance:sp.variance}}).filter(x=>Number.isFinite(x.planned)||Number.isFinite(x.actual)).sort((a,b)=>Math.abs(b.variance)-Math.abs(a.variance));
 const exposure=[{label:'Recebido',value:received},{label:'A receber',value:receivable},{label:'Pago',value:paid},{label:'A pagar',value:payable},{label:'Compras',value:purchases}].filter(x=>x.value>0);
 const stockStates=inventory.map(stockInfo),stockCritical=stockStates.filter(x=>x.level==='bad').length,stockReorder=stockStates.filter(x=>x.level==='warn').length,stockExcess=stockStates.filter(x=>x.level==='over').length,stockReplenishment=stockStates.reduce((s,x)=>s+x.suggestedCost,0),stockExcessValue=stockStates.reduce((s,x)=>s+x.excessValue,0);
 updateAlertIndicator();
 $('#content').innerHTML=head('Painel executivo','Cockpit consolidado de prazo, custos, caixa, produção e riscos')+
 `<div class="decision card"><div><div class="sectiontitle">Resumo para decisão</div><b>${works.length}</b> obra(s) • <b>${lateWorks}</b> com prazo vencido • avanço médio <b>${pct(avg)}</b> • desvio físico <b class="${perf.variance<0?'dangertext':''}">${signedPct(perf.variance)}</b></div><div>Contratado <b>${money0(contracted)}</b> • recebido <b>${money0(received)}</b> • a receber <b>${money0(receivable)}</b> • a pagar <b>${money0(payable)}</b></div>${!state.filters.workId?`<div class="dashboardScope"><span class="badge ${includeDemo?'warn':'info'}">${includeDemo?'Demonstrações incluídas nos KPIs':'Demonstrações excluídas dos KPIs'}</span><button class="btn small" id="toggleDemoKpi">${includeDemo?'Excluir demonstrações':'Incluir demonstrações'}</button></div>`:''}</div>`+
 executiveFinancialSection({contracted,budgetNoBdi,paid,perf})+
 `<div class="grid kpis executive-kpis">${kpiLink('Obras',works.length,'works')}${kpiLink('Estoque crítico',stockCritical,'inventory')}${kpi('Valor contratado',money0(contracted))}${kpiLink('Orçamento',money0(budget),'budgets')}${kpiLink('Custo pago',money0(paid),'finance')}${kpiLink('Valor medido',money0(measured),'measurements')}${kpiLink('Valor recebido',money0(received),'finance')}${kpi('Saldo de caixa',money0(received-paid))}${kpiLink('Obras em atraso',lateWorks,'works')}</div>`+
 `<div class="grid metricstrip">${metric('Planejado hoje',pct(perf.planned),'','Avanço físico previsto até hoje','Avanço físico acumulado que o cronograma previa para hoje.')}${metric('Realizado',pct(perf.actual),'','Avanço físico realizado','Avanço físico acumulado efetivamente executado.')}${metric('SPI / IDP',ratio(perf.spi),'','Índice de Desempenho de Prazo',glossTip('SPI / IDP'))}${metric('CPI / IDC',ratio(perf.cpi),'','Índice de Desempenho de Custo (custo incorrido)',glossTip('CPI / IDC'))}${metric('EAC',money0(perf.eac),'','Estimativa no Término (custo final previsto)',glossTip('EAC'))}${metric('ETC',money0(perf.etc),'','Estimativa para Terminar (custo restante)',glossTip('ETC'))}${metric('VAC',money0(perf.vac),perf.vac<0?'bad':'ok','Variação no Término (orçamento − EAC)',glossTip('VAC'))}${metric('Previsão término',forecast||'—','','Data estimada de conclusão','Estimativa de término com base no ritmo de avanço atual.')}</div>`+
  glossaryDetailsHtml(['SPI / IDP','CPI / IDC','EAC','ETC','VAC','p.p.','KPIs','NC','Curva S','ABC','BDI','EAP / WBS'],localStorage.getItem('obratop-gloss-open')!=='0')+
 `<div class="grid dashboardCharts">`+
 `<div class="card chart progressChart"><div class="sectiontitle">Avanço físico por obra <span class="charttype">Barras 2D horizontal</span></div>${hbarList(works.slice().sort((a,b)=>workProgress(b)-workProgress(a)).slice(0,10).map(x=>({label:x.name,value:workProgress(x)})),100,'%',false)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Orçamento × compras × custo pago <span class="charttype">Colunas 2D</span></div>${verticalBarChart([{label:'Orçamento',value:budget},{label:'Compras',value:purchases},{label:'Pago',value:paid}],Math.max(budget,purchases,paid,1),'',true,true)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Custos por categoria <span class="charttype">Pizza 2D</span></div>${pieChart(costCats,true,true)}</div>`+
 `<div class="card chart scheduleCompareCard"><div class="sectiontitle">Prazo das obras — Planejado × Realizado <span class="charttype">Colunas 2D</span></div>${scheduleComparisonChart(scheduleComparison)}</div>`+
 `<div class="card chart dashspan2"><div class="sectiontitle">Curva S — planejado × realizado <span class="charttype">Linhas 2D</span></div>${sCurve(acts)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Fluxo de caixa mensal <span class="charttype">Linhas 2D</span></div>${lineChart(monthly,true)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Situação das medições <span class="charttype">Rosca</span></div>${donutChart(measureStatus)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Situação do cronograma <span class="charttype">Histograma</span></div>${histogramChart(activityStatus)}</div>`+
 `<div class="card chart"><div class="sectiontitle">Composição financeira <span class="charttype">Colunas 2D</span></div>${verticalBarChart(exposure,Math.max(...exposure.map(x=>x.value),1),'',true,true)}</div>`+
 `<div class="card chart dashspan2 supplierChart"><div class="sectiontitle">Compras por fornecedor <span class="charttype">Barras 2D horizontal</span></div>${hbarList(supplierTotals,0,'',true,true)}</div>`+
 `<div class="card stockSummary"><div class="sectiontitle">Semáforo e ações de estoque</div>${stockTrafficSummary(stockStates)}<div class="stockMiniTotals"><span><b>${money0(stockReplenishment)}</b><small>Reposição sugerida</small></span><span><b>${money0(stockExcessValue)}</b><small>Capital em excesso</small></span></div><button class="btn" data-goroute="inventory">Abrir estoque</button></div>`+
 `<div class="card"><div class="sectiontitle">Riscos operacionais</div>${statRow('Atividades atrasadas',lateActs,lateActs>0)}${statRow('Não conformidades abertas',openNC,openNC>0)}${statRow('Alertas ativos',allAlerts().length,allAlerts().length>0)}${statRow('Contratos em até 30 dias',contracts.filter(x=>days(x.end)>=0&&days(x.end)<=30).length)}<button class="btn" id="openAlerts">Abrir central de alertas</button></div>`+
 `</div>`+
 `<div class="card attention"><div class="sectiontitle">Obras que exigem atenção</div>${attentionTable(attention)}</div>`+cashProjectionCard(fin);
 $('#openAlerts').onclick=()=>route('alerts');const gd=$('.glossaryDetails');if(gd)gd.ontoggle=()=>localStorage.setItem('obratop-gloss-open',gd.open?'1':'0');const demoToggle=$('#toggleDemoKpi');if(demoToggle)demoToggle.onclick=()=>{localStorage.setItem('obratop-dashboard-include-demo',includeDemo?'0':'1');renderDashboard()};$$('[data-dashboard-financial-mode]').forEach(x=>x.onclick=()=>{state.dashboardFinancialMode=x.dataset.dashboardFinancialMode;renderDashboard()});$$('[data-goroute]').forEach(x=>x.onclick=()=>route(x.dataset.goroute));$$('.focusWork').forEach(x=>x.onclick=()=>{state.filters.workId=x.dataset.id;ganttCollapsed.clear();buildFilters();updateProjectLabel();renderDashboard()});
}
function executiveFinancialSection(fallback){
 const demo=state.dashboardFinancialMode==='demo',work=state.data.works.find(x=>x.id===state.filters.workId&&!x.deleted),mode=`<div class="financialMode" role="group" aria-label="Origem dos gráficos"><button type="button" data-dashboard-financial-mode="actual" class="${demo?'':'active'}" aria-pressed="${!demo}">Dados da obra</button><button type="button" data-dashboard-financial-mode="demo" class="${demo?'active':''}" aria-pressed="${demo}">Demonstração</button></div>`;
 let r=null;
 if(demo)r=executiveDemoData(work);
 else if(work){try{
  r=analyzeEconomics(work,state.data,state.filters.to||today());
  if(r.budget===null&&fallback.budgetNoBdi>0)r={...r,budget:fallback.budgetNoBdi};
  if(r.contract===null&&fallback.contracted>0)r={...r,contract:fallback.contracted};
  if(r.eac===null&&Number.isFinite(fallback.perf?.eac)&&fallback.perf.eac>0){
   const eac=fallback.perf.eac,incurred=r.incurred??fallback.paid??0,remaining=Math.max(0,eac-incurred);
   r={...r,eac,remaining,scenarios:[-10,0,10].map(change=>{const cost=incurred+remaining*(1+change/100);return{change,cost,margin:r.contract===null?null:r.contract-cost}})};
  }
 }catch(e){console.warn('Gráficos econômicos indisponíveis:',e)}}
 const heading=`<div class="financialHead"><div><h2>Leitura financeira da obra</h2><p>Custos, resultado previsto e necessidade de caixa</p></div>${mode}</div>`;
 if(!demo&&!work)return`<section class="executiveFinancial">${heading}<div class="financialSelectNotice"><b>Selecione uma obra</b><span>Os gráficos financeiros são calculados individualmente para evitar misturar contratos e custos de obras diferentes.</span></div></section>`;
 if(!r)return`<section class="executiveFinancial">${heading}${financialMissing(['Aguarde a sincronização ou confira os dados da obra selecionada.'])}</section>`;
 const missingCosts=[],missingMargin=[];if(r.contract===null){missingCosts.push('Informe o valor contratado no cadastro da obra.');missingMargin.push('Informe o valor contratado no cadastro da obra.')}if(r.budget===null)missingCosts.push('Cadastre quantidade, custo unitário e BDI em todos os itens do Orçamento.');if(r.eac===null){missingCosts.push('Informe o custo restante estimado em Economia e Equilíbrio.');missingMargin.push('Informe o custo restante estimado em Economia e Equilíbrio.')}
 const costs=missingCosts.length?financialMissing(missingCosts):financialCostChart(r),cash=r.rows?.length?financialCashChart(r.rows,r.initial):financialMissing(['Cadastre competência, vencimento, tipo, situação e valor no módulo Financeiro.']),cats=r.categories?.length?horizontalBarChart(r.categories.slice(0,8).map(x=>({label:x.name,value:x.value})),0,'',true,false):financialMissing(['Informe a categoria nas despesas do módulo Financeiro.']),margin=missingMargin.length?financialMissing(missingMargin):financialMarginChart(r.scenarios);
 return`<section class="executiveFinancial ${demo?'demo':''}">${heading}${demo?`<div class="financialDemoBanner"><b>DEMONSTRAÇÃO — VALORES SIMULADOS</b><span>Baseada em ${esc(r.workName)}. Nenhum valor será gravado no Firebase.</span></div>`:`<div class="financialDataFlag">Dados sincronizados • ${esc(r.workName)}</div>`}<div class="grid financialChartGrid"><div class="card chart"><div class="sectiontitle">Contrato e custos <span class="charttype">Colunas</span></div>${costs}</div><div class="card chart"><div class="sectiontitle">Fluxo de caixa <span class="charttype">Colunas e linha</span></div>${cash}</div><div class="card chart"><div class="sectiontitle">Composição dos custos <span class="charttype">Barras</span></div>${cats}</div><div class="card chart"><div class="sectiontitle">Cenários de margem <span class="charttype">Colunas</span></div>${margin}</div></div></section>`;
}
function executiveDemoData(work){
 let actual=null;if(work){try{actual=analyzeEconomics(work,state.data,state.filters.to||today())}catch(e){console.warn('Base da demonstração indisponível:',e)}}
 const seed=String(work?.id||'demo').split('').reduce((s,c)=>s+c.charCodeAt(0),0),factor=.96+(seed%9)/100,contract=(actual?.contract??+work?.value)||4850000,budget=(actual?.budget??contract*.6962)*factor,incurred=(actual?.incurred??budget*.39)*factor,remaining=(actual?.remaining??Math.max(0,budget-incurred))*1.05,eac=incurred+remaining,initial=actual?.initial??contract*.05;
 let balance=initial,rows=(actual?.rows||[]).map(x=>{const received=(x.received+x.forecastIn)*factor,payments=(x.paid+x.forecastOut)*(2-factor);balance+=received-payments;return{month:x.month,received,paid:payments,forecastIn:0,forecastOut:0,projectedBalance:balance}});
 if(!rows.length){const base=new Date(),weights=[.10,.12,.14,.13,.16,.18];rows=weights.map((w,i)=>{const d=new Date(base.getFullYear(),base.getMonth()+i,1),month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,received=contract*w,payments=eac*(w+.015);balance+=received-payments;return{month,received,paid:payments,forecastIn:0,forecastOut:0,projectedBalance:balance}})}
 const sourceCats=actual?.categories?.length?actual.categories:[{name:'Materiais',share:.39},{name:'Mão de obra',share:.28},{name:'Equipamentos',share:.16},{name:'Serviços',share:.12},{name:'Administração',share:.05}],categories=sourceCats.map(x=>({name:x.name,value:x.value!==undefined?x.value*factor:incurred*x.share})),scenarios=[-10,0,10].map(change=>{const cost=incurred+remaining*(1+change/100);return{change,cost,margin:contract-cost}});
 return{workName:work?.name||'Obra demonstrativa',contract,budget,incurred,remaining,eac,initial,rows,categories,scenarios}
}
function financialMissing(items){return`<div class="financialMissing"><b>Dados necessários</b>${items.map(x=>`<span>• ${esc(x)}</span>`).join('')}<small>Informação ausente não é apresentada como zero.</small></div>`}
function financialCostChart(r){return financialSignedColumns([{label:'Contrato',value:r.contract,color:'#0f6cbd'},{label:'Orçamento sem BDI',value:r.budget,color:'#16a34a'},{label:'Custo final estimado',value:r.eac,color:'#f59e0b'}],'Contrato, orçamento sem BDI e custo final estimado')}
function financialSignedColumns(items,label){const max=Math.max(...items.map(x=>Math.abs(x.value)),1),W=680,H=260,base=190,area=150,bw=118,step=190;return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line x1="40" y1="${base}" x2="650" y2="${base}" stroke="var(--line)"/>${items.map((x,i)=>{const h=Math.max(3,Math.abs(x.value)/max*area),px=70+i*step;return`<rect x="${px}" y="${base-h}" width="${bw}" height="${h}" rx="8" fill="${x.color}"><title>${esc(x.label)}: ${money(x.value)}</title></rect><text x="${px+bw/2}" y="${Math.max(20,base-h-9)}" text-anchor="middle" font-weight="700">${esc(money(x.value))}</text><text x="${px+bw/2}" y="218" text-anchor="middle">${esc(shortLabel(x.label,21))}</text>`}).join('')}</svg>`}
function compactVal(v){v=Math.abs(+v||0);if(v>=1e6)return(v/1e6).toFixed(v>=1e7?0:1).replace('.',',')+' mi';if(v>=1e3)return(v/1e3).toFixed(v>=1e4?0:1).replace('.',',').replace(',0','')+' mil';return String(Math.round(v))}
function financialCashChart(rows,initial){const data=rows.slice(-12),W=760,H=300,L=48,R=20,T=64,B=62,base=H-B,area=base-T,step=(W-L-R)/Math.max(1,data.length),bw=Math.min(26,step*.27),max=Math.max(...data.flatMap(x=>[x.received+x.forecastIn,x.paid+x.forecastOut,Math.abs(x.projectedBalance)]),1),y=v=>base-Math.max(0,v)/max*area,line=data.map((x,i)=>`${L+step*(i+.5)},${y(x.projectedBalance)}`).join(' ');return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recebimentos, pagamentos e saldo projetado por mês"><line x1="${L}" y1="${base}" x2="${W-R}" y2="${base}" stroke="var(--line)"/>${data.map((x,i)=>{const income=x.received+x.forecastIn,out=x.paid+x.forecastOut,cx=L+step*(i+.5),ih=Math.max(2,income/max*area),oh=Math.max(2,out/max*area);const vl=(px,py,v,c)=>v>0?`<text class="cfVal" transform="rotate(-90 ${px} ${py-5})" x="${px}" y="${py-5}" text-anchor="start" font-size="11" font-weight="700" fill="${c}">${compactVal(v)}</text>`:'';return`<rect x="${cx-bw-2}" y="${base-ih}" width="${bw}" height="${ih}" rx="3" fill="#16a34a"><title>${x.month} • Recebimentos: ${money(income)}</title></rect><rect x="${cx+2}" y="${base-oh}" width="${bw}" height="${oh}" rx="3" fill="#dc2626"><title>${x.month} • Pagamentos: ${money(out)}</title></rect>${vl(cx-bw/2-2+4,base-ih,income,'#15803d')}${vl(cx+2+bw/2+4,base-oh,out,'#b91c1c')}<text x="${cx}" y="${base+22}" text-anchor="middle">${x.month.slice(5)}/${x.month.slice(2,4)}</text>`}).join('')}<polyline points="${line}" fill="none" stroke="#0f6cbd" stroke-width="4"/>${data.map((x,i)=>{const cx=L+step*(i+.5),cy=y(x.projectedBalance);return`<circle cx="${cx}" cy="${cy}" r="5" fill="#0f6cbd"><title>${x.month} • ${initial===null?'Movimento acumulado':'Saldo projetado'}: ${money(x.projectedBalance)}</title></circle>`}).join('')}</svg><div class="legend"><span><i style="background:#16a34a"></i>Recebimentos</span><span><i style="background:#dc2626"></i>Pagamentos</span><span><i style="background:#0f6cbd"></i>${initial===null?'Movimento acumulado':'Saldo projetado'}</span></div><div class="chartNote muted">Valores em R$ (mil = milhares; mi = milhões). Passe o mouse para ver o valor completo.</div>`}
function financialMarginChart(scenarios){const items=scenarios.map(x=>({label:x.change<0?'Custo restante −10%':x.change>0?'Custo restante +10%':'Cenário-base',value:x.margin,color:x.margin>=0?'#16a34a':'#dc2626'})),max=Math.max(...items.map(x=>Math.abs(x.value)),1),W=680,H=270,mid=125,area=86,bw=118,step=190;return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Margem estimada com variação de dez por cento no custo restante"><line x1="40" y1="${mid}" x2="650" y2="${mid}" stroke="var(--line)" stroke-width="2"/>${items.map((x,i)=>{const h=Math.max(3,Math.abs(x.value)/max*area),positive=x.value>=0,y=positive?mid-h:mid,px=70+i*step;return`<rect x="${px}" y="${y}" width="${bw}" height="${h}" rx="8" fill="${x.color}"><title>${esc(x.label)}: ${money(x.value)}</title></rect><text x="${px+bw/2}" y="${positive?Math.max(18,y-8):Math.min(231,y+h+18)}" text-anchor="middle" font-weight="700" fill="${x.color}">${esc(money(x.value))}</text><text x="${px+bw/2}" y="247" text-anchor="middle">${esc(shortLabel(x.label,21))}</text>`}).join('')}</svg>`}
function scheduleComparisonChart(rows){
 if(!rows.length)return'<div class="empty">Cadastre atividades com início e fim para comparar prazo planejado e realizado.</div>';
 const show=rows.slice(0,6),W=620,H=255,L=48,R=18,T=24,B=72,PW=W-L-R,PH=H-T-B,base=H-B;
 const y=v=>T+(100-clamp(v,0,100))/100*PH,ticks=[0,25,50,75,100],groupW=PW/Math.max(1,show.length),barW=Math.min(38,Math.max(20,groupW*.26));
 const grid=ticks.map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#dfe7ec" stroke-width="1"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${v}%</text>`).join('');
 const bars=show.map((d,i)=>{const cx=L+groupW*(i+.5),px=cx-barW-3,ax=cx+3,py=y(d.planned),ay=y(d.actual),ph=base-py,ah=base-ay,dev=d.actual-d.planned,devTxt=(dev>0?'+':'')+dev.toFixed(1).replace('.',',')+' p.p.',devColor=dev<-0.1?'#b42318':dev>0.1?'#1d7d3b':'#657786';return`<rect x="${px}" y="${py}" width="${barW}" height="${Math.max(0,ph)}" rx="5" fill="#16a34a"><title>${esc(d.label)} • Planejado: ${pct(d.planned)}</title></rect><rect x="${ax}" y="${ay}" width="${barW}" height="${Math.max(0,ah)}" rx="5" fill="#f59e0b"><title>${esc(d.label)} • Realizado: ${pct(d.actual)}</title></rect><text x="${px+barW/2}" y="${Math.max(15,py-7)}" text-anchor="middle" font-weight="700" fill="#15803d">${Math.round(d.planned)}%</text><text x="${ax+barW/2}" y="${Math.max(15,ay-7)}" text-anchor="middle" font-weight="700" fill="#c76b00">${Math.round(d.actual)}%</text><text x="${cx}" y="${base+20}" text-anchor="middle">${esc(shortLabel(d.label,16))}</text><text x="${cx}" y="${base+39}" text-anchor="middle" font-weight="700" fill="${devColor}">${devTxt}</text>`}).join('');
 return`<div class="scheduleCompareWrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Prazo das obras planejado versus realizado">${grid}<line x1="${L}" y1="${base}" x2="${W-R}" y2="${base}" stroke="#b8c6cf"/>${bars}</svg><div class="legend scheduleCompareLegend"><span><i style="background:#16a34a"></i>Planejado</span><span><i style="background:#f59e0b"></i>Realizado</span><small>Desvio em pontos percentuais (p.p.) = Realizado − Planejado</small></div></div>`
}
function stockInfo(x){
 const current=+x.currentStock||0,min=+x.minStock||0,max=+x.maxStock||0,safety=+x.safetyStock||0,cons=+x.avgDailyConsumption||0,lead=+x.leadTimeDays||0,unitValue=+x.unitValue||0;
 const calculated=cons*lead+safety,manual=+x.reorderPoint||0,reorder=manual>0?manual:calculated;
 const categoryNorm=norm(x.category||''),plannedByEngineering=x.stockMode==='planned'||categoryNorm.includes('planejado pela engenharia inteligente');
 const noOperationalPolicy=min<=0&&safety<=0&&reorder<=0&&cons<=0&&lead<=0;
 let level='ok',label='NORMAL',message='nível dentro da faixa operacional',priority='Monitorar',action='Manter acompanhamento normal';
 if(plannedByEngineering&&current<=0&&noOperationalPolicy){level='planned';label='PLANEJADO';priority='Planejamento';action='Aguardar recebimento ou ativação do estoque';message='material previsto pela Engenharia Inteligente; saldo físico ainda não iniciado'}
 else if(max>0&&current>max){level='over';label='EXCESSO';priority='Atenção';action='Suspender novas compras e avaliar remanejamento';message=`${current.toLocaleString('pt-BR')} acima do máximo ${max.toLocaleString('pt-BR')}`}
 else if(current<=safety||(min>0&&current<min)){level='bad';label='CRÍTICO';priority='IMEDIATA';action='Emitir pedido de compra imediatamente';message=`${current.toLocaleString('pt-BR')} abaixo do mínimo/segurança`}
 else if(reorder>0&&current<=reorder){level='warn';label='COMPRAR';priority='ALTA';action='Iniciar ressuprimento';message=`ponto de pedido ${reorder.toLocaleString('pt-BR',{maximumFractionDigits:2})} atingido`}
 const incoming=(state.data.orders||[]).filter(o=>!o.deleted&&o.inventoryId&&o.inventoryId===x.id&&!['Entregue','Cancelado'].includes(o.status)).reduce((s,o)=>s+(+o.qty||0),0);
 const target=max>0?max:Math.max(reorder,min,safety),suggestedQty=['bad','warn'].includes(level)?Math.max(0,target-current-incoming):0;
 const excessQty=level==='over'&&max>0?Math.max(0,current-max):0;
 return{...x,current,min,max,safety,reorder,average:(min+max)/2,anticipation:+x.anticipationStock||0,level,label,message,priority,action,value:current*unitValue,incoming,suggestedQty,suggestedCost:suggestedQty*unitValue,excessQty,excessValue:excessQty*unitValue}
}
function stockTrafficSummary(items){if(!items.length)return'<div class="empty">Cadastre materiais para ativar o controle de estoque.</div>';const counts={bad:0,warn:0,ok:0,over:0,planned:0};items.forEach(x=>{counts[x.level]=(counts[x.level]||0)+1});return`<div class="trafficGrid"><div class="traffic bad"><i></i><b>${counts.bad}</b><span>Crítico</span></div><div class="traffic warn"><i></i><b>${counts.warn}</b><span>Comprar</span></div><div class="traffic ok"><i></i><b>${counts.ok}</b><span>Normal</span></div><div class="traffic planned"><i></i><b>${counts.planned}</b><span>Planejado</span></div><div class="traffic over"><i></i><b>${counts.over}</b><span>Excesso</span></div></div>`}
function abcData(items,labelFn,valueFn){const grouped=new Map();items.forEach(x=>{const raw=String(labelFn(x)||'').trim().replace(/\s+/g,' '),value=Math.max(0,Number(valueFn(x))||0);if(!raw||value<=0)return;const key=norm(raw);const cur=grouped.get(key)||{label:raw,value:0,count:0};cur.value+=value;cur.count++;grouped.set(key,cur)});const rows=[...grouped.values()].sort((a,b)=>b.value-a.value),total=rows.reduce((s,x)=>s+x.value,0);let cum=0;return rows.map(x=>{const before=total?cum/total*100:0;cum+=x.value;const cp=total?cum/total*100:0;return{...x,cumulative:cp,className:before<80?'A':before<95?'B':'C'}})}
function abcChart(rows){if(!rows.length)return'<div class="empty">Cadastre custos para gerar a Curva ABC.</div>';const max=Math.max(...rows.map(x=>x.value),1),show=rows.slice(0,12);return`<div class="abcList">${show.map((x,i)=>`<div class="abcRow"><span class="abcClass abc${x.className}">${x.className}</span><span class="abcName">${esc(shortLabel(x.label,30))}</span><span class="abcBar"><i style="width:${Math.max(2,x.value/max*100)}%;background:${chartColor(i)}"></i></span><b>${money(x.value)}</b><small>${x.cumulative.toFixed(1).replace('.',',')}%</small></div>`).join('')}</div>`}
function cumulativeSeries(items,dateFn,valueFn){const m={};items.forEach(x=>{const d=dateFn(x);if(!d)return;const k=String(d).slice(0,7);if(!k)return;m[k]=(m[k]||0)+(Number(valueFn(x))||0)});let cum=0;return Object.keys(m).sort().map(k=>({label:k,value:(cum+=m[k])}))}
function cumulativeLineChart(a){if(!a.length)return'<div class="empty">Cadastre datas e custos para gerar a Curva S.</div>';const max=Math.max(...a.map(x=>x.value),1),w=620,h=220,base=170;const pts=a.map((x,i)=>`${45+i*(520/Math.max(1,a.length-1))},${base-x.value/max*125}`).join(' ');return`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Curva S acumulada"><line x1="45" y1="170" x2="570" y2="170" stroke="var(--line)"/><polyline points="${pts}" fill="none" stroke="var(--chart2)" stroke-width="4"/>${a.map((x,i)=>{const xx=45+i*(520/Math.max(1,a.length-1)),yy=base-x.value/max*125;return`<circle cx="${xx}" cy="${yy}" r="4" fill="var(--chart2)"><title>${x.label}: ${money(x.value)}</title></circle><text x="${xx}" y="195" text-anchor="middle" font-size="14">${x.label.slice(5)}/${x.label.slice(2,4)}</text>`}).join('')}</svg>`}
function inventoryTable(rows){if(!rows.length)return'<div class="empty">Nenhum material cadastrado.</div>';return`<div class="tablewrap"><table><thead><tr><th>Semáforo</th><th>Material</th><th>Atual</th><th>Mínimo</th><th>Ponto de pedido</th><th>Máximo</th><th>Ação recomendada</th><th>Qtd. sugerida</th><th>Valor estimado</th><th>Valor atual</th><th>Ação</th></tr></thead><tbody>${rows.map(z=>`<tr><td><span class="stockBadge ${z.level}"><i></i>${z.label}</span><br><small class="priority ${z.level}">${esc(z.priority)}</small></td><td><b>${esc(z.material)}</b><br><small>${esc(z.category||'')}</small></td><td>${z.current.toLocaleString('pt-BR')} ${esc(z.unit||'')}</td><td>${z.min.toLocaleString('pt-BR')}</td><td>${z.reorder.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td><td>${z.max.toLocaleString('pt-BR')}</td><td><b>${esc(z.action)}</b><br><small>${esc(z.message)}</small></td><td>${z.suggestedQty>0?`${z.suggestedQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${esc(z.unit||'')}`:z.excessQty>0?`Excesso ${z.excessQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${esc(z.unit||'')}`:'—'}</td><td>${z.suggestedCost>0?money(z.suggestedCost):z.excessValue>0?money(z.excessValue):'—'}</td><td>${money(z.value)}</td><td>${['bad','warn'].includes(z.level)?`<button class="btn small primary stockOrder" data-id="${z.id}">Gerar pedido</button>`:z.level==='over'?'<span class="badge warn">Evitar compra</span>':z.level==='planned'?'<span class="badge info">Aguardar ativação</span>':'<span class="badge ok">Monitorar</span>'}</td></tr>`).join('')}</tbody></table></div>`}
function renderResourceCurves(){
 const inv=filtered('inventory'),staff=filtered('staff'),eq=filtered('equipment');
 const invAbc=abcData(inv,x=>x.material,x=>(+x.currentStock||0)*(+x.unitValue||0));
 const staffAbc=abcData(staff,x=>`${x.name} — ${x.role||''}`,x=>+x.salary||0);
 const eqAbc=abcData(eq,x=>x.name,x=>+x.monthlyCost||0);
 const invS=cumulativeSeries(inv,x=>x.date,x=>(+x.currentStock||0)*(+x.unitValue||0));
 const staffS=cumulativeSeries(staff,x=>x.admission,x=>+x.salary||0);
 const eqS=cumulativeSeries(eq,x=>x.startDate||x.nextMaintenance,x=>+x.monthlyCost||0);
 $('#content').innerHTML=head('Curvas S e ABC','Análise acumulada e classificação por relevância econômica de materiais, pessoal, máquinas e equipamentos',`<span class="versionchip">${esc(ENV_LABEL)}</span>`)+
 `<div class="card" style="margin-bottom:16px"><div class="sectiontitle">Critério ABC</div><p class="muted">Itens com a mesma identificação são consolidados antes da classificação. Classe A: itens que acumulam aproximadamente os primeiros 80% do valor; Classe B: faixa seguinte até aproximadamente 95%; Classe C: parcela restante. A Curva S abaixo representa o custo acumulado por mês a partir das datas e custos cadastrados.</p></div>`+
 `<div class="grid resourceCurves"><div class="card chart"><div class="sectiontitle">Materiais — Curva S</div>${cumulativeLineChart(invS)}</div><div class="card chart"><div class="sectiontitle">Materiais — Curva ABC</div>${abcChart(invAbc)}</div><div class="card chart"><div class="sectiontitle">Pessoal — Curva S</div>${cumulativeLineChart(staffS)}</div><div class="card chart"><div class="sectiontitle">Pessoal — Curva ABC</div>${abcChart(staffAbc)}</div><div class="card chart"><div class="sectiontitle">Máquinas e equipamentos — Curva S</div>${cumulativeLineChart(eqS)}</div><div class="card chart"><div class="sectiontitle">Máquinas e equipamentos — Curva ABC</div>${abcChart(eqAbc)}</div></div>`;
}
function legalContent(){return `<div class="legalDocument"><div class="legalSeal">⚖️</div><h2>Direitos Autorais e Licença de Uso — ObraTop</h2><p><strong>Criação e autoria declarada:</strong> Eng. Civil Raydem Rabello Santana.</p><p><strong>© 2026 Raydem Rabello Santana. Todos os direitos reservados.</strong></p><p>O ObraTop é um programa de computador. Seu código-fonte e código-objeto, documentação, textos, elementos gráficos originais e demais expressões intelectuais protegíveis são protegidos pela legislação brasileira aplicável. A proteção autoral não abrange ideias, procedimentos, métodos de operação ou conceitos matemáticos considerados isoladamente.</p><h3>Licença e uso autorizado</h3><p>O acesso ao sistema não transfere propriedade intelectual ao usuário. Salvo autorização prévia e expressa do titular ou hipótese permitida pela legislação, é vedado copiar, reproduzir, distribuir, comercializar, sublicenciar, ceder, disponibilizar a terceiros, publicar, modificar, adaptar ou explorar o ObraTop, no todo ou em parte, bem como remover ou adulterar avisos de autoria e direitos autorais.</p><p>Credenciais são pessoais. O usuário autorizado deve utilizar o sistema apenas dentro das permissões concedidas pelo administrador e não pode tentar contornar controles de acesso, obter código ou dados sem autorização ou utilizar cópias não autorizadas.</p><h3>Base legal brasileira</h3><p><strong>Lei nº 9.609/1998 (Lei de Software):</strong> disciplina a proteção da propriedade intelectual de programas de computador. O art. 2º estabelece o regime de proteção autoral aplicável ao software; o art. 12 prevê sanções penais para violações nele tipificadas, sem prejuízo das medidas civis cabíveis.</p><p><strong>Lei nº 9.610/1998 (Lei de Direitos Autorais):</strong> consolida a legislação autoral brasileira e aplica-se aos programas de computador no que couber, observada a legislação específica.</p><p>O uso indevido poderá resultar em suspensão ou cancelamento do acesso e adoção das medidas administrativas, civis e/ou penais cabíveis, conforme o caso e a legislação vigente.</p><div class="legalRefs"><a href="https://www.planalto.gov.br/ccivil_03/leis/l9609.htm" target="_blank" rel="noopener">Lei nº 9.609/1998 — Planalto</a><a href="https://www.planalto.gov.br/ccivil_03/leis/l9610.htm" target="_blank" rel="noopener">Lei nº 9.610/1998 — Planalto</a></div><p class="muted"><small>Este aviso informa as condições gerais de uso e não substitui instrumento contratual específico de licenciamento quando existente.</small></p></div>`}
function renderLegal(){$('#content').innerHTML=head('Direitos Autorais e Licença','Autoria, proteção legal e condições de uso do ObraTop',`<span class="versionchip">${esc(ENV_LABEL)}</span>`)+`<div class="card legalCard">${legalContent()}</div>`}
function openLegalModal(){$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog legalDialog">${legalContent()}<div class="actions"><button class="btn primary" id="closeLegal">Fechar</button></div></div></div>`;$('#closeLegal').onclick=closeModal}
function kpi(a,b){return`<div class="card kpi"><span class="muted">${a}</span><strong>${b}</strong></div>`}
function chartMoney(v,noDecimals=false){return noDecimals?money0(v):money(v)}
function chartColor(i){return`var(--chart${i%10})`}
function shortLabel(s,n=18){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s}
function verticalBarChart(items,max=0,suffix='',currency=false,noDecimals=false){if(!items.length)return'<div class="empty">Cadastre dados para gerar o gráfico.</div>';max=max||Math.max(...items.map(x=>x.value),1);const w=620,h=230,base=182,top=28,area=base-top,bw=Math.max(28,Math.min(92,Math.floor(500/items.length)-18));return`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfico de colunas 2D">${items.map((x,i)=>{const bh=clamp(x.value/max*area,3,area),px=55+i*(510/items.length),val=currency?chartMoney(x.value,noDecimals):`${Number(x.value).toLocaleString('pt-BR')}${suffix}`;return`<rect x="${px}" y="${base-bh}" width="${bw}" height="${bh}" rx="7" fill="${chartColor(i)}"><title>${esc(x.label)}: ${val}</title></rect><text x="${px+bw/2}" y="205" text-anchor="middle" font-size="14">${esc(shortLabel(x.label,13))}</text><text x="${px+bw/2}" y="${Math.max(18,base-bh-7)}" text-anchor="middle" font-size="14" font-weight="700">${esc(val)}</text>`}).join('')}</svg>`}
function hbarList(items,max=0,suffix='',currency=false,noDecimals=false){if(!items.length)return'<div class="empty">Cadastre dados para gerar o gráfico.</div>';max=max||Math.max(...items.map(x=>x.value),1);return`<div class="hbarList" role="img" aria-label="Gráfico de barras horizontais">${items.slice(0,10).map((x,i)=>{const w=clamp(x.value/max*100,1,100),val=currency?chartMoney(x.value,noDecimals):`${Number(x.value).toLocaleString('pt-BR',{maximumFractionDigits:suffix==='%'?1:2})}${suffix}`;return`<div class="hbarRow" title="${esc(x.label)}: ${esc(val)}"><span class="hbarLabel">${esc(x.label)}</span><span class="hbarTrack"><i style="width:${w.toFixed(1)}%;background:${chartColor(i)}"></i></span><b class="hbarVal">${esc(val)}</b></div>`}).join('')}</div>`}
function horizontalBarChart(items,max=0,suffix='',currency=false,noDecimals=false){if(!items.length)return'<div class="empty">Cadastre dados para gerar o gráfico.</div>';max=max||Math.max(...items.map(x=>x.value),1);const rows=Math.min(items.length,10),rh=46,h=rows*rh+24,w=700,bx=262,bmax=250;return`<div class="hbarWrap"><svg class="hbar" viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfico de barras 2D horizontal">${items.slice(0,10).map((x,i)=>{const y=12+i*rh,bw=clamp(x.value/max*bmax,4,bmax),val=currency?chartMoney(x.value,noDecimals):`${Number(x.value).toLocaleString('pt-BR',{maximumFractionDigits:suffix==='%'?1:2})}${suffix}`;return`<text x="8" y="${y+21}" font-size="16">${esc(shortLabel(x.label,27))}</text><rect x="${bx}" y="${y}" width="${bw}" height="28" rx="6" fill="${chartColor(i)}"><title>${esc(x.label)}: ${val}</title></rect><text x="${bx+bw+8}" y="${y+21}" font-size="16" font-weight="700">${esc(val)}</text>`}).join('')}</svg></div>`}
function monthSeries(fin){const m={};fin.forEach(x=>{const k=(x.date||'').slice(0,7);if(!k)return;m[k]??={label:k,receita:0,despesa:0};m[k][x.type==='Receita'?'receita':'despesa']+=(+x.value||0)});return Object.values(m).sort((a,b)=>a.label.localeCompare(b.label)).slice(-12)}
function lineChart(a,noDecimals=false){if(!a.length)return'<div class="empty">Cadastre lançamentos financeiros.</div>';const max=Math.max(...a.flatMap(x=>[x.receita,x.despesa]),1),X=i=>45+i*(520/Math.max(1,a.length-1)),Y=v=>170-v/max*125,pts=key=>a.map((x,i)=>`${X(i)},${Y(x[key])}`).join(' ');
 const vals=a.map((x,i)=>{const items=[];if(x.receita>0)items.push({y:Y(x.receita),t:compactVal(x.receita),c:'#15803d'});if(x.despesa>0)items.push({y:Y(x.despesa),t:compactVal(x.despesa),c:'#b91c1c'});items.sort((p,q)=>p.y-q.y);let out='',prev=null;items.forEach((it,k)=>{let ty=it.y-9;if(k>0&&Math.abs(it.y-prev.y)<16)ty=prev.ty-13;out+=`<text class="cfVal" x="${X(i)}" y="${ty}" text-anchor="middle" font-size="11" font-weight="700" fill="${it.c}">${it.t}</text>`;prev={y:it.y,ty}});return out}).join('');
 return`<svg viewBox="0 0 620 235" role="img" aria-label="Fluxo de caixa em linhas 2D"><line x1="45" y1="170" x2="570" y2="170" stroke="var(--line)"/><polyline points="${pts('receita')}" fill="none" stroke="var(--chart1)" stroke-width="4"/><polyline points="${pts('despesa')}" fill="none" stroke="var(--chart4)" stroke-width="4"/>${a.map((x,i)=>{const xx=X(i),yr=Y(x.receita),yd=Y(x.despesa);return`<circle cx="${xx}" cy="${yr}" r="4" fill="var(--chart1)"><title>${x.label} Receitas: ${chartMoney(x.receita,noDecimals)}</title></circle><circle cx="${xx}" cy="${yd}" r="4" fill="var(--chart4)"><title>${x.label} Despesas: ${chartMoney(x.despesa,noDecimals)}</title></circle><text x="${xx}" y="194" text-anchor="middle" font-size="14">${x.label.slice(5)}/${x.label.slice(2,4)}</text>`}).join('')}${vals}</svg><div class="legend"><span><i style="background:var(--chart1)"></i>Receitas</span><span><i style="background:var(--chart4)"></i>Despesas</span></div><div class="chartNote muted">Valores em R$ (mil = milhares; mi = milhões). Passe o mouse para ver o valor completo.</div>`}
function pieChart(items,currency=false,noDecimals=false){const total=items.reduce((s,x)=>s+x.value,0);if(!total)return'<div class="empty">Cadastre dados para gerar o gráfico.</div>';let a=-Math.PI/2;const cx=108,cy=102,r=78,paths=items.map((x,i)=>{const ang=x.value/total*Math.PI*2,a2=a+ang,x1=cx+r*Math.cos(a),y1=cy+r*Math.sin(a),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2),large=ang>Math.PI?1:0,d=`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,val=currency?chartMoney(x.value,noDecimals):x.value;a=a2;return`<path d="${d}" fill="${chartColor(i)}"><title>${esc(x.label)}: ${esc(val)}</title></path>`}).join('');return`<div class="pieWrap"><svg viewBox="0 0 220 205">${paths}</svg><div class="donutlegend">${items.map((x,i)=>`<span><i style="background:${chartColor(i)}"></i>${esc(shortLabel(x.label,22))}<b>${currency?chartMoney(x.value,noDecimals):x.value}</b></span>`).join('')}</div></div>`}
function histogramChart(items){if(!items.length)return'<div class="empty">Cadastre dados para gerar o histograma.</div>';return verticalBarChart(items,Math.max(...items.map(x=>x.value),1),'',false)}
function treemapChart(items,currency=false){const total=items.reduce((s,x)=>s+Math.max(0,x.value),0);if(!total)return'<div class="empty">Cadastre dados para gerar o mapa de árvore.</div>';let x=0,y=0,w=100,h=100,remaining=total;const rects=[];items.forEach((it,i)=>{const frac=Math.max(0,it.value)/remaining,vertical=w>=h,n=items.length-i;if(i===items.length-1){rects.push({it,x,y,w,h,i});return}if(vertical){const rw=Math.max(18,w*frac);rects.push({it,x,y,w:rw,h,i});x+=rw;w-=rw}else{const rh=Math.max(18,h*frac);rects.push({it,x,y,w,h:rh,i});y+=rh;h-=rh}remaining-=Math.max(0,it.value)});return`<div class="treemap">${rects.map(r=>`<div class="treecell" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;background:${chartColor(r.i)}"><span>${esc(shortLabel(r.it.label,18))}</span><b>${currency?money(r.it.value):r.it.value}</b></div>`).join('')}</div>`}
function compareChart(b,e){return verticalBarChart([{label:'Orçado',value:b},{label:'Realizado',value:e}],Math.max(b,e,1),'',true)}
function kpiLink(a,b,r){return`<button class="card kpi kpilink" data-goroute="${r}"><span class="muted">${a}</span><strong>${b}</strong><small>Abrir módulo →</small></button>`}
// ===== Glossário de siglas (nome por extenso + explicação) =====
function cashProjectionCard(fin){const cp=calc.cashProjection(fin,today(),6);const rows=cp.rows.map(r=>`<tr class="${r.balance<0?'cashNeg':''}"><td>${r.label}</td><td>${money(r.inflow)}</td><td>${money(r.outflow)}</td><td><b>${money(r.balance)}</b></td></tr>`).join('');return`<div class="card cashCard"><div class="sectiontitle noGloss">Fluxo de caixa projetado — próximos 6 meses ${cp.firstNegative?`<span class="badge bad">saldo negativo em ${cp.firstNegative.label}</span>`:'<span class="badge ok">sem estouro previsto</span>'}</div><p class="muted">Parte do saldo realizado (recebido − pago) de ${money(cp.opening)} e soma o que está previsto, pendente ou vencido, pela data de vencimento; itens vencidos entram no mês atual.</p><div class="tablewrap"><table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo acumulado</th></tr></thead><tbody>${rows}</tbody></table></div></div>`}
// ===== Barra de rolagem horizontal fixa do cronograma =====

function openComposition(id){
 const b=(state.data.budgets||[]).find(x=>x.id===id&&!x.deleted);if(!b)return alert('Item do orçamento não encontrado.');
 if(!canEdit('budgets',b))return alert('Você não tem permissão para alterar este item do orçamento.');
 let items=(b.composition||[]).map(x=>({...x}));if(!items.length)items=[{kind:'Material',description:'',unit:b.unit||'',coef:1,price:0}];
 const summary=()=>{const c=calc.compositionCost(items.map(x=>({...x,coef:+x.coef,price:+x.price})));return`${calc.COMPOSITION_KINDS.map(k=>`<span>${k}: <b>${money(c.byKind[k])}</b></span>`).join('')}<span class="compTotal">Custo unitário: <b>${money(c.total)}</b> (no orçamento: ${money(b.unitValue)})</span>`};
 const draw=()=>{
  $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog wide"><h2>Composição de custo — ${esc(shortLabel(b.description,60))}</h2><p class="muted">Insumos por <b>1 ${esc(b.unit||'unidade')}</b> do item. Custo unitário = soma de coeficiente × preço.</p><div class="tablewrap"><table class="compTable"><thead><tr><th>Tipo</th><th>Insumo</th><th>Un.</th><th>Coeficiente</th><th>Preço unitário</th><th>Subtotal</th><th></th></tr></thead><tbody>${items.map((it,i)=>`<tr data-i="${i}"><td><select data-f="kind">${calc.COMPOSITION_KINDS.map(k=>`<option ${k===it.kind?'selected':''}>${k}</option>`).join('')}</select></td><td><input data-f="description" value="${esc(it.description)}" maxlength="140"></td><td><input data-f="unit" value="${esc(it.unit||'')}" maxlength="12" size="5"></td><td><input data-f="coef" type="number" step="any" min="0" value="${esc(it.coef)}"></td><td><input data-f="price" type="number" step="any" min="0" value="${esc(it.price)}"></td><td class="compSub">${money((+it.coef||0)*(+it.price||0))}</td><td><button type="button" class="btn tiny danger compDel" data-i="${i}">✕</button></td></tr>`).join('')}</tbody></table></div><p><button type="button" class="btn small" id="compAdd">+ Insumo</button></p><div class="compSummary" id="compSummary">${summary()}</div><label class="compApply"><input type="checkbox" id="compApplyUnit" checked> Aplicar o custo unitário ao valor unitário do item</label><div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button type="button" class="btn primary" id="compSave">Salvar composição</button></div></div></div>`;
  $('#cancelModal').onclick=closeModal;
  $$('#modalRoot [data-f]').forEach(el=>el.oninput=()=>{const tr=el.closest('tr'),i=+tr.dataset.i;items[i][el.dataset.f]=el.value;tr.querySelector('.compSub').textContent=money((+items[i].coef||0)*(+items[i].price||0));$('#compSummary').innerHTML=summary()});
  $$('#modalRoot .compDel').forEach(x=>x.onclick=()=>{items.splice(+x.dataset.i,1);draw()});
  $('#compAdd').onclick=()=>{if(items.length>=60)return alert('Use no máximo 60 insumos por item.');items.push({kind:'Material',description:'',unit:'',coef:1,price:0});draw()};
  $('#compSave').onclick=async()=>{
   const clean=items.filter(x=>String(x.description||'').trim()||+x.price||0).map(x=>({kind:calc.COMPOSITION_KINDS.includes(x.kind)?x.kind:'Outros',description:String(x.description||'').trim().slice(0,140),unit:String(x.unit||'').trim().slice(0,12),coef:+x.coef||0,price:+x.price||0}));
   const err=calc.validateComposition(clean);if(err)return alert(err);
   const total=calc.compositionCost(clean).total,apply=$('#compApplyUnit').checked&&clean.length>0;
   if(!confirm(clean.length?`Salvar ${clean.length} insumo(s)?${apply?`\n\nO valor unitário do item passa de ${money(b.unitValue)} para ${money(total)}.`:''}`:'Remover a composição deste item?'))return;
   try{const bt=writeBatch(fs),now=serverTimestamp(),patch={composition:clean,compositionTotal:total,updatedAt:now,updatedBy:state.user.uid};if(apply)patch.unitValue=total;
    bt.update(doc(fs,'organizations',state.orgId,'budgets',id),patch);bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('composition','budgets',id,{insumos:clean.length,custoUnitario:total,aplicado:apply}));await bt.commit();closeModal();toast('Composição salva.')}catch(e){alert(friendly(e))}
  }
 };
 draw()
}
async function applyDailyLog(id){
 const l=(state.data.dailyLogs||[]).find(x=>x.id===id&&!x.deleted);if(!l)return;
 const a=(state.data.activities||[]).find(x=>x.id===l.activityId&&!x.deleted);if(!a)return alert('A atividade vinculada não foi encontrada.');
 if(!canEdit('activities',a))return alert('Você não tem permissão para alterar o cronograma desta obra.');
 const to=clamp(+l.progressTo||0,0,100),from=+a.progress||0;if(to<=from)return alert(`O avanço informado (${to}%) não é maior que o atual da atividade (${from}%).`);
 if(!confirm(`Aplicar ao cronograma?\n\n${a.name}\nAvanço: ${from}% → ${to}%`))return;
 const patch={progress:to,status:to>=100?'Concluída':(a.status==='Não iniciada'?'Em andamento':a.status),updatedAt:serverTimestamp(),updatedBy:state.user.uid};
 if(a.progressMode==='Quantidade'&&(+a.plannedQty||0)>0)patch.actualQty=Math.round((+a.plannedQty)*to)/100;
 try{const bt=writeBatch(fs);bt.update(doc(fs,'organizations',state.orgId,'activities',a.id),patch);bt.update(doc(fs,'organizations',state.orgId,'dailyLogs',l.id),{appliedAt:serverTimestamp(),appliedProgress:to,updatedAt:serverTimestamp(),updatedBy:state.user.uid});bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('rdo-apply','activities',a.id,{de:from,para:to,rdo:l.id}));await bt.commit();toast('Avanço aplicado ao cronograma.')}catch(e){alert(friendly(e))}
}

// ===== Assistente de nova obra (modelos) — V3.27.1 =====
let WIZ=null;
function addDaysISO2(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function openWorkWizard(){
 if(!canCreate('works'))return alert('Somente o administrador ou o gestor pode criar obras.');
 const t=today();WIZ={step:1,name:'',client:'',address:'',engineer:'',start:t,end:addDaysISO2(t,300),family:'BUILD',base:tpl.FAMILIES.BUILD.baseDefault,bdi:25,cf:1,baseline:true,keys:null};
 drawWizard()
}
function wizTasks(){const f=tpl.FAMILIES[WIZ.family];return f?f.tasks:[]}
function wizKeys(){return WIZ.keys||wizTasks().map(t=>t.k)}
function wizCollect(){
 const g=id=>document.getElementById(id);
 if(WIZ.step===1){WIZ.name=g('wzName').value;WIZ.client=g('wzClient').value;WIZ.address=g('wzAddress').value;WIZ.engineer=g('wzEngineer').value;WIZ.start=g('wzStart').value;WIZ.end=g('wzEnd').value}
 if(WIZ.step===2&&WIZ.family!=='BLANK'){WIZ.base=+g('wzBase').value;WIZ.bdi=+g('wzBdi').value;WIZ.cf=+g('wzCf').value;WIZ.baseline=g('wzBaseline').checked}
 if(WIZ.step===3){const ks=[...document.querySelectorAll('.wzTask:checked')].map(c=>c.dataset.k);WIZ.keys=ks.length===wizTasks().length?null:ks}
}
function wizValidate(){return tpl.validateWizard(WIZ,(state.data.works||[]).filter(x=>!x.deleted).map(x=>x.name))}
function wizPreview(){try{return{p:tpl.buildProject({family:WIZ.family,base:WIZ.base,start:WIZ.start,end:WIZ.end,bdi:WIZ.bdi,cf:WIZ.cf,keys:WIZ.keys}),err:''}}catch(e){return{p:null,err:e.message}}}
function drawWizard(){
 const w=WIZ,blank=w.family==='BLANK',steps=blank?['Dados','Modelo','Revisão']:['Dados','Modelo e porte','Escopo','Revisão'],pos=w.step;
 const stepper=`<ol class="wzSteps">${steps.map((n,i)=>`<li class="${i+1===pos?'on':i+1<pos?'done':''}">${i+1}. ${n}</li>`).join('')}</ol>`;
 let body='';
 if(w.step===1)body=`<div class="formgrid"><div class="field full"><label>Nome da obra *</label><input id="wzName" maxlength="180" value="${esc(w.name)}" placeholder="Ex.: UBS Porte II – Bairro Jardim"></div><div class="field"><label>Cliente *</label><input id="wzClient" maxlength="160" value="${esc(w.client)}"></div><div class="field"><label>Endereço</label><input id="wzAddress" maxlength="200" value="${esc(w.address)}"></div><div class="field"><label>Engº Responsável</label><input id="wzEngineer" maxlength="120" value="${esc(w.engineer)}" placeholder="${esc(state.org.defaultEngineer||'Nome do engenheiro')}"></div><div class="field"><label>Início *</label><input id="wzStart" type="date" value="${esc(w.start)}"></div><div class="field"><label>Término previsto *</label><input id="wzEnd" type="date" value="${esc(w.end)}"></div></div><p class="muted">A obra é criada com a situação <b>Planejamento</b>.</p>`;
 if(w.step===2)body=`<div class="wzFamilies">${[...Object.values(tpl.FAMILIES),{id:'BLANK',label:'Em branco (sem modelo)',desc:'Cria só o cadastro da obra. Orçamento e cronograma são lançados depois, manualmente ou por importação.'}].map(f=>`<label class="wzFamily ${f.id===w.family?'on':''}"><input type="radio" name="wzFam" value="${f.id}" ${f.id===w.family?'checked':''}><b>${esc(f.label)}</b><small>${esc(f.desc)}${f.tasks?` (${f.tasks.length} atividades)`:''}</small></label>`).join('')}</div>${blank?'':`<div class="formgrid"><div class="field"><label>${esc(tpl.FAMILIES[w.family].baseLabel)} *</label><input id="wzBase" type="number" min="1" step="any" value="${esc(w.base)}"></div><div class="field"><label>BDI (%)</label><input id="wzBdi" type="number" min="0" max="100" step="any" value="${esc(w.bdi)}"></div><div class="field"><label>Fator de custo</label><input id="wzCf" type="number" min="0.2" max="5" step="any" value="${esc(w.cf)}"></div></div><label class="wzCheck"><input id="wzBaseline" type="checkbox" ${w.baseline?'checked':''}> Congelar a linha de base R1 ao criar (guarda as datas planejadas para comparar depois)</label><p class="muted">⚠ Os custos do modelo são <b>valores ilustrativos de referência</b> (fator 1,00). Use o fator de custo para ajustar à sua realidade e confira cada item depois em Orçamentos.</p>`}`;
 if(w.step===3&&!blank){const f=tpl.FAMILIES[w.family],keys=new Set(wizKeys());body=`<p class="muted">Desmarque o que não faz parte desta obra. O cronograma é refeito para o prazo informado.</p><div class="wzScope">${Object.entries(f.phases).map(([p,n])=>`<details open><summary><label><input type="checkbox" class="wzPhase" data-p="${p}" ${f.tasks.filter(t=>t.p===p).every(t=>keys.has(t.k))?'checked':''}> <b>${p} ${esc(n)}</b></label></summary>${f.tasks.filter(t=>t.p===p).map(t=>`<label class="wzTaskRow"><input type="checkbox" class="wzTask" data-k="${t.k}" data-p="${p}" ${keys.has(t.k)?'checked':''}> ${esc(t.n)} <small>(${esc(t.u)})</small></label>`).join('')}</details>`).join('')}</div><p class="muted" id="wzCount"></p>`}
 if(w.step===4||(blank&&w.step===3)){
  if(blank)body=`<div class="card"><p><b>${esc(w.name)}</b><br>${esc(w.client)}${w.address?' — '+esc(w.address):''}<br>${dateBR(w.start)} a ${dateBR(w.end)}</p><p class="muted">Obra em branco: sem orçamento nem cronograma.</p></div>`;
  else{const{p,err}=wizPreview();body=err?`<div class="notice bad">${esc(err)}</div>`:`<div class="card"><p><b>${esc(w.name)}</b><br>${esc(w.client)}${w.address?' — '+esc(w.address):''}</p><div class="wzTotals"><span><b>${p.tasks.length}</b> atividades</span><span>${dateBR(p.start)} a ${dateBR(p.end)}</span><span>Orçamento com BDI <b>${money(p.budgetTotal)}</b></span><span>Valor contratado sugerido <b>${money(p.value)}</b></span></div></div><div class="tablewrap"><table><thead><tr><th>Fase</th><th>Atividades</th><th>Período</th><th>Valor com BDI</th></tr></thead><tbody>${p.phaseSummary.map(f=>`<tr><td>${f.phase} ${esc(f.name)}</td><td>${f.tasks}</td><td>${dateBR(f.start)} a ${dateBR(f.end)}</td><td>${money(f.sale)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Serão criados: 1 obra, ${p.tasks.length} itens de orçamento e ${p.tasks.length} atividades ligadas ao orçamento (avanço ponderado por custo)${w.baseline?', e a linha de base R1':''}. Valores ilustrativos: revise antes de usar.</p>`}
 }
 const last=(blank?w.step===3:w.step===4);
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog wide wizard"><h2>✨ Assistente de nova obra</h2>${stepper}<div class="wzBody">${body}</div><p class="wzErr" id="wzErr" role="alert"></p><div class="actions"><button type="button" class="btn" id="wzCancel">Cancelar</button>${w.step>1?'<button type="button" class="btn" id="wzBack">Voltar</button>':''}${last?'<button type="button" class="btn primary" id="wzCreate">Criar obra</button>':'<button type="button" class="btn primary" id="wzNext">Avançar</button>'}</div></div></div>`;
 $('#wzCancel').onclick=()=>{WIZ=null;closeModal()};
 const showErr=m=>{$('#wzErr').textContent=m||''};
 if($('#wzBack'))$('#wzBack').onclick=()=>{wizCollect();w.step=blank&&w.step===3?2:w.step-1;drawWizard()};
 if($('#wzNext'))$('#wzNext').onclick=()=>{
  wizCollect();
  if(w.step===1){const e=wizValidate();if(e)return showErr(e)}
  if(w.step===2&&!blank){const e=wizValidate();if(e)return showErr(e)}
  w.step=blank&&w.step===2?3:w.step+1;drawWizard()};
 if($('#wzCreate'))$('#wzCreate').onclick=()=>createWorkFromWizard();
 if(w.step===2)document.querySelectorAll('input[name=wzFam]').forEach(r=>r.onchange=()=>{wizCollect();w.family=r.value;w.keys=null;if(w.family!=='BLANK')w.base=tpl.FAMILIES[w.family].baseDefault;drawWizard()});
 if(w.step===3&&!blank){
  const upd=()=>{const n=document.querySelectorAll('.wzTask:checked').length;$('#wzCount').textContent=`${n} de ${wizTasks().length} atividades selecionadas.`;document.querySelectorAll('.wzPhase').forEach(ph=>{const ts=[...document.querySelectorAll(`.wzTask[data-p="${ph.dataset.p}"]`)];ph.checked=ts.every(t=>t.checked);ph.indeterminate=!ph.checked&&ts.some(t=>t.checked)})};
  document.querySelectorAll('.wzTask').forEach(c=>c.onchange=upd);
  document.querySelectorAll('.wzPhase').forEach(ph=>ph.onchange=()=>{document.querySelectorAll(`.wzTask[data-p="${ph.dataset.p}"]`).forEach(t=>t.checked=ph.checked);upd()});
  upd();
  const nx=$('#wzNext');if(nx){const old=nx.onclick;nx.onclick=()=>{if(!document.querySelectorAll('.wzTask:checked').length)return showErr('Selecione ao menos uma atividade.');old()}}
 }
}
async function createWorkFromWizard(){
 const w=WIZ;if(!w)return;const err=wizValidate();if(err){$('#wzErr').textContent=err;return}
 let p=null;if(w.family!=='BLANK'){const r=wizPreview();if(r.err){$('#wzErr').textContent=r.err;return}p=r.p}
 const btn=$('#wzCreate');if(btn){btn.disabled=true;btn.textContent='Criando…'}
 const col=n=>collection(fs,'organizations',state.orgId,n),u=state.user.uid,workRef=doc(col('works'));let etapa='cadastro da obra';
 try{
  const now=serverTimestamp(),wd={name:w.name.trim(),client:w.client.trim(),address:String(w.address||'').trim(),engineer:String(w.engineer||'').trim(),start:p?p.start:w.start,end:p?p.end:w.end,value:p?p.value:0,status:'Planejamento',progress:0,templateFamily:p?w.family:'',templateNote:p?'Gerada pelo assistente com valores ilustrativos de referência':''};
  const b1=writeBatch(fs);b1.set(workRef,{...wd,createdAt:now,createdBy:u,updatedAt:now,updatedBy:u,deleted:false});b1.set(doc(col('audits')),auditPayload('create','works',workRef.id,{...wd,assistente:true,atividades:p?p.tasks.length:0}));await b1.commit();
  if(p){
   etapa='orçamento e cronograma';const refs=p.tasks.map(()=>({b:doc(col('budgets')),a:doc(col('activities'))}));
   for(let i=0;i<p.tasks.length;i+=120){const bt=writeBatch(fs),n2=serverTimestamp();
    p.tasks.slice(i,i+120).forEach((t,j)=>{const r=refs[i+j],meta={createdAt:n2,createdBy:u,updatedAt:n2,updatedBy:u,deleted:false};
     bt.set(r.b,{workId:workRef.id,category:t.category,description:t.name,unit:t.unit,qty:t.qty,unitValue:t.unitValue,bdi:+w.bdi,templateKey:t.key,...meta});
     bt.set(r.a,{workId:workRef.id,wbs:t.wbs,name:t.name,start:t.start,end:t.end,durationDays:t.durationDays,progressMode:'Percentual',progress:0,plannedQty:t.qty,actualQty:0,unit:t.unit,predecessors:t.pred,responsible:'',budgetId:r.b.id,status:'Não iniciada',templateKey:t.key,...meta})});
    await bt.commit()}
   if(w.baseline){etapa='linha de base';const items={};p.tasks.forEach((t,i)=>{items[refs[i].a.id]={s:t.start,e:t.end,w:t.sale}});
    await updateDoc(workRef,{baseline:{revision:1,date:today(),reason:'Linha de base inicial (assistente de nova obra)',byEmail:state.user.email||'',items},baselineHistory:[],updatedAt:serverTimestamp(),updatedBy:u})}
  }
  const id=workRef.id,total=p?p.tasks.length:0;WIZ=null;closeModal();toast(p?`Obra criada com ${total} atividades e ${total} itens de orçamento.`:'Obra criada.');
  const t0=Date.now();while(Date.now()-t0<4000&&!(state.data.works||[]).some(x=>x.id===id))await new Promise(r=>setTimeout(r,120));
  const sel=$('#filterWork');if(sel){sel.value=id;sel.dispatchEvent(new Event('change'))}
  route(p?'activities':'works')
 }catch(e){alert(`A obra foi criada, mas falhou na etapa “${etapa}”: ${friendly(e)}\n\nConfira em Obras, Orçamentos e Cronograma. Se preferir, exclua a obra e repita o assistente.`);if(btn){btn.disabled=false;btn.textContent='Criar obra'}}
}
// ===== Edição em lote — V3.27.1 =====
const BULK_TYPES=['works','measurements','budgets','suppliers','inventory','finance','quality','contracts','staff','equipment','safety','documents','dailyLogs'];
function bulkState(type){if(!state.bulk||state.bulk.type!==type)state.bulk={type,ids:new Set()};return state.bulk}
function bulkFieldsOf(type){return calc.bulkFields(schemas[type]?.fields||[])}
function bulkBarHtml(type,rows=[]){
 if(!BULK_TYPES.includes(type)||!rows.some(x=>canEdit(type,x)))return'';const fs2=bulkFieldsOf(type);if(!fs2.length)return'';
 return`<div class="card bulkBar" id="bulkBar" hidden><b><span id="bulkCount">0</span> selecionado(s)</b><label>Alterar<select id="bulkField">${fs2.map(f=>`<option value="${f[0]}">${esc(f[1])}</option>`).join('')}</select></label><span id="bulkValueBox"></span><button class="btn primary" id="bulkApply">Aplicar aos selecionados</button>${isAdmin()&&type!=='works'?'<button class="btn danger" id="bulkDelete">Mover para a lixeira</button>':''}<button class="btn" id="bulkClear">Limpar seleção</button></div>`
}
function bindBulk(type){
 const bar=$('#bulkBar');if(!bar)return;const B=bulkState(type);
 const visible=new Set([...document.querySelectorAll('.bulkChk')].map(c=>c.dataset.id));[...B.ids].forEach(id=>{if(!visible.has(id))B.ids.delete(id)});
 const rows=()=>[...document.querySelectorAll('.bulkChk:not(:disabled)')];
 const refresh=()=>{bar.hidden=B.ids.size===0;$('#bulkCount').textContent=B.ids.size;const all=$('#bulkAll');if(all){const r=rows();all.checked=r.length>0&&r.every(c=>c.checked);all.indeterminate=!all.checked&&r.some(c=>c.checked)}};
 const drawValue=()=>{const f=bulkFieldsOf(type).find(x=>x[0]===$('#bulkField').value);$('#bulkValueBox').innerHTML=f&&f[2]==='date'?'<input type="date" id="bulkValue">':`<select id="bulkValue"><option value="">Selecione…</option>${((f&&f[4])||[]).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`};
 document.querySelectorAll('.bulkChk').forEach(c=>c.onchange=()=>{c.checked?B.ids.add(c.dataset.id):B.ids.delete(c.dataset.id);refresh()});
 const all=$('#bulkAll');if(all)all.onchange=()=>{rows().forEach(c=>{c.checked=all.checked;all.checked?B.ids.add(c.dataset.id):B.ids.delete(c.dataset.id)});refresh()};
 $('#bulkField').onchange=drawValue;drawValue();
 $('#bulkClear').onclick=()=>{B.ids.clear();document.querySelectorAll('.bulkChk').forEach(c=>c.checked=false);refresh()};
 $('#bulkApply').onclick=()=>applyBulk(type);const d=$('#bulkDelete');if(d)d.onclick=()=>deleteBulk(type);refresh()
}
async function applyBulk(type){
 const B=bulkState(type),fdef=bulkFieldsOf(type).find(x=>x[0]===$('#bulkField').value),value=($('#bulkValue').value||'').trim();
 const recs=(state.data[type]||[]).filter(x=>B.ids.has(x.id)&&!x.deleted&&canEdit(type,x));
 if(!recs.length)return alert('Nenhum registro selecionado que você possa alterar.');
 const v=calc.validateBulkChange(recs,fdef,value);if(!v.ok)return alert(v.error);
 if(!confirm(`Alterar “${fdef[1]}” para “${fdef[2]==='date'?dateBR(value):value}” em ${recs.length} registro(s) de ${schemas[type].title}?\n\nA ação fica registrada na auditoria.`))return;
 try{for(const part of calc.chunk(recs,200)){const bt=writeBatch(fs),now=serverTimestamp();part.forEach(r=>bt.update(doc(fs,'organizations',state.orgId,type,r.id),{[fdef[0]]:value,updatedAt:now,updatedBy:state.user.uid}));bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('bulk-update',type,'lote',{campo:fdef[0],valor:value,quantidade:part.length,ids:part.slice(0,30).map(r=>r.id)}));await bt.commit()}
  B.ids.clear();toast(`${recs.length} registro(s) atualizado(s).`);render()}catch(e){alert(friendly(e))}
}
async function deleteBulk(type){
 if(!isAdmin())return alert('Somente o administrador geral pode excluir registros.');
 const B=bulkState(type),recs=(state.data[type]||[]).filter(x=>B.ids.has(x.id)&&!x.deleted&&canDelete(type,x));
 if(!recs.length)return alert('Nenhum registro selecionado para excluir.');
 if(!confirm(`Mover ${recs.length} registro(s) de ${schemas[type].title} para a lixeira?\n\nA ação fica registrada na auditoria e pode ser desfeita pela lixeira.`))return;
 try{for(const part of calc.chunk(recs,200)){const bt=writeBatch(fs),now=serverTimestamp();part.forEach(r=>bt.update(doc(fs,'organizations',state.orgId,type,r.id),{deleted:true,deletedAt:now,deletedBy:state.user.uid}));bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('bulk-delete',type,'lote',{quantidade:part.length,ids:part.slice(0,30).map(r=>r.id)}));await bt.commit()}
  B.ids.clear();toast(`${recs.length} registro(s) movido(s) para a lixeira.`);render()}catch(e){alert(friendly(e))}
}
function ganttMetaHtml(){const wid=state.filters.workId;if(!wid)return'<div class="ganttMeta">Selecione uma obra para ver a ponderação do avanço e a linha de base.</div>';const w=(state.data.works||[]).find(x=>x.id===wid&&!x.deleted),acts=(state.data.activities||[]).filter(x=>x.workId===wid&&!x.deleted&&x.start&&x.end);if(!w||!acts.length)return'';const r=calc.activityWeights(acts,state.data.budgets||[]),mode=r.modes.get(wid),lc=r.linkedCount.get(wid)||{linked:0,total:acts.length};const base=w.baseline?`Linha de base <b>R${w.baseline.revision}</b> de ${dateBR(w.baseline.date)} — ${esc(w.baseline.reason||'')}${(w.baselineHistory||[]).length?` (${w.baselineHistory.length} revisão(ões) anterior(es))`:''}`:'Sem linha de base congelada';return`<div class="ganttMeta"><b>Ponderação do avanço:</b> ${mode==='custo'?'pelo custo do orçamento':'pela duração das atividades'} (${lc.linked}/${lc.total} atividades vinculadas ao orçamento) • ${base}</div>`}
function baseBarHtml(x,min,dayW){if(x.__summary)return'';const w=(state.data.works||[]).find(k=>k.id===x.workId),b=w?.baseline?.items?.[x.id];if(!b)return'';const st=parseLocalDate(b.s),en=parseLocalDate(b.e);return`<i class="baseBar" style="left:${Math.max(0,(st-min)/86400000*dayW)}px;width:${Math.max(dayW,((en-st)/86400000+1)*dayW)}px" title="Linha de base: ${dateBR(b.s)} → ${dateBR(b.e)}"></i>`}
async function linkActivitiesToBudget(){
 if(!isAdmin())return alert('Somente o administrador pode vincular atividades ao orçamento.');
 const wid=state.filters.workId;if(!wid)return alert('Selecione uma obra no filtro superior.');
 const acts=(state.data.activities||[]).filter(x=>x.workId===wid&&!x.deleted),links=calc.suggestBudgetLinks(acts,state.data.budgets||[]),already=acts.filter(x=>x.budgetId).length;
 if(!links.length)return alert(already?`Todas as atividades com nome idêntico ao de um item do orçamento já estão vinculadas (${already}/${acts.length}).`:'Nenhuma atividade tem nome idêntico ao de um item do orçamento desta obra. Vincule manualmente em Editar > Item do orçamento.');
 if(!confirm(`Vincular ${links.length} atividade(s) ao item do orçamento de mesmo nome?\n\nCom 100% das atividades vinculadas, o avanço e a Curva S passam a ser ponderados pelo custo do orçamento.`))return;
 try{for(let i=0;i<links.length;i+=200){const b=writeBatch(fs),now=serverTimestamp();links.slice(i,i+200).forEach(l=>b.update(doc(fs,'organizations',state.orgId,'activities',l.activityId),{budgetId:l.budgetId,updatedAt:now,updatedBy:state.user.uid}));await b.commit()}await audit('link-budget','activities',wid,{vinculadas:links.length});toast(`${links.length} atividade(s) vinculada(s) ao orçamento.`)}catch(e){alert(friendly(e))}
}
async function freezeBaseline(){
 if(!isAdmin())return alert('Somente o administrador pode congelar a linha de base.');
 const wid=state.filters.workId;if(!wid)return alert('Selecione uma obra no filtro superior.');
 const w=(state.data.works||[]).find(x=>x.id===wid&&!x.deleted),acts=(state.data.activities||[]).filter(x=>x.workId===wid&&!x.deleted&&x.start&&x.end);
 if(!w||!acts.length)return alert('A obra não tem atividades com datas para congelar.');
 const reason=prompt(w.baseline?'Motivo do replanejamento (a linha de base atual vai para o histórico):':'Motivo da linha de base:',w.baseline?'Replanejamento':'Linha de base inicial');if(reason===null)return;
 const{weights}=calc.activityWeights(acts,state.data.budgets||[]),items={};acts.forEach(a=>items[a.id]={s:a.start,e:a.end,w:Math.round((weights.get(a.id)||1)*100)/100});
 const revision=(w.baseline?.revision||0)+1,hist=[...(w.baselineHistory||[])];if(w.baseline)hist.push({revision:w.baseline.revision,date:w.baseline.date,reason:w.baseline.reason||'',by:w.baseline.byEmail||'',count:Object.keys(w.baseline.items||{}).length});
 const baseline={revision,date:today(),reason:String(reason).slice(0,200),byEmail:state.user.email||'',items};
 try{const b=writeBatch(fs),now=serverTimestamp();b.update(doc(fs,'organizations',state.orgId,'works',wid),{baseline,baselineHistory:hist.slice(-15),updatedAt:now,updatedBy:state.user.uid});b.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('baseline','works',wid,{revision,reason:baseline.reason,atividades:acts.length}));await b.commit();toast(`Linha de base R${revision} congelada com ${acts.length} atividade(s).`)}catch(e){alert(friendly(e))}
}
function eapReport(){return mspj.reviewEap((state.data.works||[]).filter(w=>!w.deleted),(state.data.activities||[]).filter(a=>!a.deleted),{phaseNames:GANTT_PHASES})}
function openEapReview(){
 if(!isAdmin())return alert('Somente o administrador pode revisar e renumerar a EAP.');
 const rep=eapReport(),need=rep.filter(r=>r.changes.length),total=need.reduce((n,r)=>n+r.changes.length,0);
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog wide"><h2>Revisão da EAP de todas as obras</h2><p class="muted">A EAP de cada obra deve começar no item <b>1</b>. A revisão lê todos os cronogramas, mostra o que está fora do padrão e, se você confirmar, renumera as atividades e as predecessoras (um ponto de restauração é criado antes).</p>
 <div class="tablewrap"><table><thead><tr><th>Obra</th><th>Atividades</th><th>Raízes da EAP</th><th>Ajuste</th><th>A renumerar</th><th>Repetidas</th><th>Predecessoras inexistentes</th><th>Sem EAP</th><th>Situação</th></tr></thead><tbody>${rep.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.total}</td><td>${esc(r.roots.join(', ')||'—')}</td><td>${Object.keys(r.map).length?Object.entries(r.map).map(([a,b])=>`${a}→${b}`).join(', '):'—'}</td><td>${r.changes.length}</td><td>${r.duplicates}</td><td>${r.brokenPred}</td><td>${r.semWbs}</td><td>${r.changes.length?'<b class="plLate">Renumerar</b>':r.nonNumeric?'Raiz não numérica':(r.duplicates||r.brokenPred||r.semWbs)?'Revisar manualmente':'<span class="plEarly">OK</span>'}</td></tr>`).join('')||'<tr><td colspan="9" class="muted">Nenhuma obra com atividades.</td></tr>'}</tbody></table></div>
 <p class="muted">Repetidas, predecessoras inexistentes e atividades sem EAP não são alteradas automaticamente: abra a obra no Cronograma para corrigi-las.</p>
 <div class="actions"><button class="btn" id="eapClose" type="button">Fechar</button><button class="btn primary" id="eapApply" type="button" ${total?'':'disabled'}>Renumerar ${total} atividade(s) em ${need.length} obra(s)</button></div></div></div>`;
 $('#eapClose').onclick=closeModal;
 $('#eapApply').onclick=async()=>{$('#eapApply').disabled=true;try{const n=await applyEapFix(need);closeModal();toast(`EAP renumerada: ${n} atividade(s).`)}catch(e){$('#eapApply').disabled=false;alert('Não foi possível renumerar: '+(e.message||e))}}
}
async function applyEapFix(need){
 if(!isAdmin())throw Error('Somente o administrador pode renumerar a EAP.');
 const ch=need.flatMap(r=>r.changes.map(c=>({...c,workId:r.workId})));if(!ch.length)return 0;
 const rp=await createRestorePoint('Automático pré-revisão da EAP',{category:'Pré-revisão EAP'});if(!rp)throw Error('Ponto de restauração não pôde ser criado. Operação cancelada.');
 for(const part of calc.chunk(ch,400)){const bt=writeBatch(fs),now=serverTimestamp();part.forEach(c=>bt.update(doc(fs,'organizations',state.orgId,'activities',c.id),{wbs:c.newWbs,predecessors:c.newPred,...(c.phaseName?{eapPhaseName:c.phaseName}:{}),updatedAt:now,updatedBy:state.user.uid}));await bt.commit()}
 await audit('eap-renumber','activities','all',{obras:need.length,atividades:ch.length});return ch.length
}
async function offerEapFix(){if(!isAdmin())return;const need=eapReport().filter(r=>r.changes.length);if(!need.length)return;const n=need.reduce((t,r)=>t+r.changes.length,0);if(!confirm(`Depois da importação, ${need.length} obra(s) ficaram com a EAP começando em número diferente de 1 (${n} atividades).\n\nRenumerar agora para começar no item 1? (um ponto de restauração é criado antes)`))return;try{const k=await applyEapFix(need);toast(`EAP renumerada: ${k} atividade(s).`)}catch(e){alert('Não foi possível renumerar: '+(e.message||e))}}
function exportMsProject(){
 const wid=state.filters.workId;if(!wid)return alert('Selecione uma obra no filtro superior.');
 const w=(state.data.works||[]).find(x=>x.id===wid&&!x.deleted),acts=(state.data.activities||[]).filter(x=>x.workId===wid&&!x.deleted);
 if(!w||!acts.some(x=>x.wbs&&x.start&&x.end))return alert('A obra não tem atividades com EAP e datas para exportar.');
 const cr=mspj.cpm(acts.filter(x=>x.wbs&&x.start&&x.end).map(x=>({id:x.id,wbs:String(x.wbs).trim(),start:x.start,end:x.end,pred:x.predecessors||''})));
 const xml=mspj.mspdiExport(w,acts,{phaseNames:GANTT_PHASES,baseline:w.baseline||null,critical:cr});
 downloadBlob(new Blob([xml],{type:'application/xml;charset=utf-8'}),`ObraTop_${String(w.name).replace(/[^\w]+/g,'_').slice(0,50)}_MSProject.xml`);audit('export-msproject','activities',wid,{atividades:acts.length});toast('Cronograma exportado em XML para o MS Project (com vínculos, recursos, marcos e linha de base).')
}
function pickMsProject(){
 if(!canCreate('activities'))return alert('Seu perfil não pode importar atividades.');
 const inp=document.createElement('input');inp.type='file';inp.accept='.xml,.mspdi,text/xml,application/xml';
 inp.onchange=async()=>{const f=inp.files[0];if(!f)return;if(/\.mpp$/i.test(f.name))return alert('O arquivo .mpp é o formato fechado do MS Project e não pode ser lido aqui. Abra-o no MS Project e use Arquivo > Salvar como > XML (*.xml), depois importe o XML.');
  try{const proj=mspj.parseMspdi(await f.text());openMspImport(proj,f.name)}catch(e){alert(e.message||'Não foi possível ler o arquivo.')}};inp.click()
}
function openMspImport(proj,fname){
 const works=(state.data.works||[]).filter(w=>!w.deleted);if(!works.length)return alert('Cadastre uma obra antes de importar o cronograma.');
 const {activities,warnings}=mspj.toActivities(proj),leaves=activities.length,sums=proj.tasks.filter(t=>t.summary).length,ms=activities.filter(a=>a.milestone).length,links=activities.reduce((n,a)=>n+mspj.parsePred(a.predecessors).length,0),withBase=activities.filter(a=>a._base).length;
 if(!leaves)return alert('Nenhuma tarefa com datas foi encontrada no arquivo.'+(warnings.length?'\n'+warnings.slice(0,4).join('\n'):''));
 if(leaves>2000)return alert('O arquivo tem mais de 2.000 tarefas. Divida o projeto em partes para importar.');
 const pick=works.find(w=>w.id===state.filters.workId)||works.find(w=>norm(w.name)===norm(proj.name))||works[0],dts=activities.map(a=>a.start).sort(),dte=activities.map(a=>a.end).sort();
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>Importar cronograma do MS Project</h2><p class="muted">Arquivo: <b>${esc(fname)}</b> • Projeto: <b>${esc(proj.name)}</b></p>
 <div class="plCards"><div><span>Tarefas finais</span><b>${leaves}</b></div><div><span>Resumos (EAP)</span><b>${sums}</b></div><div><span>Marcos</span><b>${ms}</b></div><div><span>Vínculos</span><b>${links}</b></div><div><span>Período</span><b>${dateBR(dts[0])} → ${dateBR(dte.at(-1))}</b></div></div>
 ${warnings.length?`<p class="plWarn">⚠ ${warnings.length} aviso(s): ${esc(warnings.slice(0,3).join(' • '))}</p>`:''}
 <div class="field"><label for="mpWork">Obra de destino</label><select id="mpWork">${works.map(w=>`<option value="${w.id}" ${w.id===pick.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div>
 <label class="bbChk"><input type="radio" name="mpMode" value="add" checked> Acrescentar as tarefas ao cronograma atual da obra</label>
 ${isAdmin()?'<label class="bbChk"><input type="radio" name="mpMode" value="replace"> Substituir o cronograma da obra (as atividades atuais vão para a Lixeira)</label>':''}
 <label class="bbChk"><input type="checkbox" id="mpBase" ${withBase?'checked':''} ${withBase?'':'disabled'}> Usar a linha de base do arquivo como nova revisão da linha de base ${withBase?`(${withBase} tarefas)`:'(o arquivo não tem linha de base)'}</label>
 <p class="muted">Predecessoras (com tipo e defasagem), recursos, marcos e percentual concluído são trazidos. Os resumos do MS Project viram os grupos da EAP. Nada é gravado antes de você confirmar.</p>
 <div class="actions"><button class="btn" id="mpCancel" type="button">Cancelar</button><button class="btn primary" id="mpOk" type="button">Importar ${leaves} tarefas</button></div></div></div>`;
 $('#mpCancel').onclick=()=>{$('#modalRoot').innerHTML=''};
 $('#mpOk').onclick=async()=>{const mode=document.querySelector('input[name=mpMode]:checked')?.value||'add',wid=$('#mpWork').value,useBase=$('#mpBase').checked&&!$('#mpBase').disabled;
  if(mode==='replace'&&!confirm('Substituir o cronograma desta obra? As atividades atuais irão para a Lixeira e poderão ser restauradas por lá.'))return;
  $('#mpOk').disabled=true;try{const n=await importMsProject(proj,{workId:wid,replace:mode==='replace',useBase});$('#modalRoot').innerHTML='';state.filters.workId=wid;const sel=$('#filterWork');if(sel)sel.value=wid;toast(`${n} tarefa(s) importada(s) do MS Project.`);render()}catch(e){$('#mpOk').disabled=false;alert('Não foi possível importar: '+(e.message||e))}}
}
async function importMsProject(proj,{workId,replace,useBase}){
 if(!canCreate('activities'))throw new Error('Seu perfil não pode importar atividades.');
 const w=(state.data.works||[]).find(x=>x.id===workId&&!x.deleted);if(!w)throw new Error('Obra não encontrada.');
 const {activities}=mspj.toActivities(proj,{workId});if(!activities.length)throw new Error('Nenhuma tarefa com datas.');
 const seen=new Set();for(const a of activities){let k=a.wbs,n=2;while(seen.has(k))k=`${a.wbs}.${n++}`;a.wbs=k;seen.add(k)}
 const col=n=>collection(fs,'organizations',state.orgId,n),u=state.user.uid,meta=()=>{const now=serverTimestamp();return{createdAt:now,createdBy:u,updatedAt:now,updatedBy:u,deleted:false}};
 if(replace){if(!isAdmin())throw new Error('Somente o administrador pode substituir o cronograma.');const old=(state.data.activities||[]).filter(x=>x.workId===workId&&!x.deleted);
  for(const part of calc.chunk(old,400)){const bt=writeBatch(fs),now=serverTimestamp();part.forEach(x=>bt.update(doc(fs,'organizations',state.orgId,'activities',x.id),{deleted:true,deletedAt:now,deletedBy:u,updatedAt:now,updatedBy:u}));await bt.commit()}}
 const refs=activities.map(()=>doc(col('activities'))),items={};
 for(let p=0;p<activities.length;p+=200){const bt=writeBatch(fs);activities.slice(p,p+200).forEach((a,j)=>{const{_base,...rec}=a,r=refs[p+j];if(_base)items[r.id]={s:_base.s,e:_base.e,w:Math.max(1,+a.durationDays||1)};bt.set(r,{...rec,...meta()})});
  if(p+200>=activities.length)bt.set(doc(col('audits')),auditPayload('create','activities',workId,{origem:'Importação MS Project',tarefas:activities.length,substituiu:!!replace}));await bt.commit()}
 if(useBase&&Object.keys(items).length){const revision=(w.baseline?.revision||0)+1,hist=[...(w.baselineHistory||[])];if(w.baseline)hist.push({revision:w.baseline.revision,date:w.baseline.date,reason:w.baseline.reason||'',by:w.baseline.byEmail||'',count:Object.keys(w.baseline.items||{}).length});
  await updateDoc(doc(fs,'organizations',state.orgId,'works',workId),{baseline:{revision,date:today(),reason:'Importada do MS Project',byEmail:state.user.email||'',items},baselineHistory:hist.slice(-15),updatedAt:serverTimestamp(),updatedBy:u})}
 return activities.length
}
function initGanttStickyHead(){
 if(window.__ganttStickyBound)return;window.__ganttStickyBound=true;let raf=0;
 const apply=()=>{raf=0;const left=document.querySelector('.ganttGridInner'),lh=document.querySelector('.ganttLeftHead'),tl=document.querySelector('.ganttTimeline');
  if(!left||!lh||!tl)return;
  const top=Math.max(0,...[...document.querySelectorAll('.topbar,.filters,#releaseBar,.pin')].map(b=>{const p=getComputedStyle(b).position;return(p==='sticky'||p==='fixed')?b.getBoundingClientRect().bottom:0}));
  const r=left.getBoundingClientRect(),headH=lh.offsetHeight,max=Math.max(0,r.height-headH-4);let d=Math.min(Math.max(0,top-r.top),max);
  const t=d>0?`translateY(${d}px)`:'';lh.style.transform=t;tl.querySelectorAll(':scope > .ganttYears,:scope > .ganttMonths,:scope > .ganttDays').forEach(e=>{e.style.transform=t});
  const sp=document.querySelector('.ganttProjectSplit');if(sp)sp.classList.toggle('ganttStuck',d>0)};
 const sched=()=>{if(!raf)raf=requestAnimationFrame(apply)};
 document.addEventListener('scroll',sched,{capture:true,passive:true});window.addEventListener('resize',sched);window.__ganttStickyApply=sched
}
function initGanttHScroll(){
 const content=$('#content');if(!content)return;
 content.querySelectorAll('.ganttHBars').forEach(x=>x.remove());content.querySelectorAll('.ganttHScroll').forEach(x=>x.remove());
 const vp=content.querySelector('.ganttProjectViewport'),wrap=content.querySelector('.ganttTimelineWrap'),lp=content.querySelector('.ganttGridLeft');
 if(!vp||!wrap)return;
 const card=vp.closest('.ganttProject')||vp;
 const mk=title=>{const b=document.createElement('div');b.className='ganttHScroll';b.setAttribute('role','scrollbar');b.setAttribute('aria-orientation','horizontal');b.title=title;const i=document.createElement('div');i.className='ganttHScrollInner';b.append(i);return{b,i}};
 const R=mk('Role para ver o restante da linha do tempo'),L=mk('Role para ver as demais colunas da tabela'),bar=R.b,inner=R.i,barL=L.b,innerL=L.i;
 const bars=document.createElement('div');bars.className='ganttHBars';bars.append(barL,bar);card.after(bars);   // as duas barras ficam fixas na base da tela, lado a lado
 let src=wrap;
 const layout=()=>{
  src=(vp.scrollWidth>vp.clientWidth+2)?vp:wrap;
  const can=src.scrollWidth>src.clientWidth+1,canL=!!lp&&src===wrap&&lp.scrollWidth>lp.clientWidth+1,c=card.getBoundingClientRect();
  bar.style.display=can?'block':'none';barL.style.display=canL?'block':'none';vp.classList.toggle('hasHScroll',can);vp.classList.toggle('hasHScrollL',canL);
  let ml=0;
  if(canL){const rl=lp.getBoundingClientRect();barL.style.marginLeft=Math.max(0,rl.left-c.left)+'px';barL.style.width=rl.width+'px';innerL.style.width=lp.scrollWidth+'px';ml=rl.right-c.left;if(barL.scrollLeft!==lp.scrollLeft)barL.scrollLeft=lp.scrollLeft}
  if(!can)return;
  const r=src.getBoundingClientRect();bar.style.marginLeft=Math.max(0,r.left-c.left-ml)+'px';bar.style.width=r.width+'px';inner.style.width=src.scrollWidth+'px';
  if(bar.scrollLeft!==src.scrollLeft)bar.scrollLeft=src.scrollLeft;
 };
 bar.addEventListener('scroll',()=>{if(src.scrollLeft!==bar.scrollLeft)src.scrollLeft=bar.scrollLeft});
 barL.addEventListener('scroll',()=>{if(lp&&lp.scrollLeft!==barL.scrollLeft)lp.scrollLeft=barL.scrollLeft});
 const follow=()=>{if(bar.scrollLeft!==src.scrollLeft)bar.scrollLeft=src.scrollLeft},followL=()=>{if(lp&&barL.scrollLeft!==lp.scrollLeft)barL.scrollLeft=lp.scrollLeft};
 wrap.addEventListener('scroll',follow);vp.addEventListener('scroll',follow);if(lp)lp.addEventListener('scroll',followL);
 layout();
 if(window.ResizeObserver){const ro=new ResizeObserver(layout);ro.observe(card);ro.observe(wrap);if(lp)ro.observe(lp)}else window.addEventListener('resize',layout);
 setTimeout(layout,250);
}
// ===== Aplicação automática após qualquer atualização da tela =====
const BTN_GLYPHS=[['⇩ ','import'],['⇧ ','export'],['▦ ','table'],['✨ ','sparkle'],['💾 ','save'],['⬇ ','import'],['↺ ','restore'],['🛡 ','safety'],['🛡️ ','safety'],['↻ ','restore'],['+ ','plus']];
function applyBtnIcons(root){
 if(!root)return;
 root.querySelectorAll('.btn').forEach(b=>{if(b.dataset.ico)return;const n=b.firstChild;if(!n||n.nodeType!==3)return;
  for(const[g,name]of BTN_GLYPHS){if(n.nodeValue.startsWith(g)){n.nodeValue=n.nodeValue.slice(g.length);const sp=document.createElement('span');sp.className='btnico';sp.innerHTML=ico(name,16);b.insertBefore(sp,n);b.dataset.ico=name;break}}})
}

// ===== Cabeçalho fixo (V3.33): faixa de versão, filtros, título/botões, sub-abas, total e colunas ficam sempre visíveis =====
const PIN_SEL=['#releaseBar','#globalFilters','#content > .hero','#content > .subtabs','#content > .toolbar','#content > .ganttProject > .ganttTop','#content > .ganttProject > .ganttLegend'];
function pinPref(){try{return localStorage.getItem('obratop-pin')!=='off'}catch{return true}}
function pinOn(){return pinPref()&&!document.documentElement.classList.contains('vm-mobile')&&window.innerWidth>900}
let pinRaf=0;function schedulePin(){cancelAnimationFrame(pinRaf);pinRaf=requestAnimationFrame(pinStack)}
function pinStack(){
 const root=document.documentElement,els=PIN_SEL.map(q=>$(q)).filter(Boolean),tws=$$('#content > .tablewrap');
 const clear=()=>{els.forEach(e=>{e.classList.remove('pin');e.style.top=''});$$('.pinThead').forEach(t=>{t.classList.remove('pinThead','pinWide','pinFit');t.style.maxHeight=''});root.style.removeProperty('--pin-bottom');root.classList.remove('pinned')};
 if(!pinOn()){clear();enhanceTables();return}
 root.classList.add('pinned');const tb=$('.topbar');let acc=tb?tb.getBoundingClientRect().height:56;const limit=window.innerHeight*(state.route==='activities'?0.62:0.46);
 for(const e of els){if(!e.getClientRects().length){e.classList.remove('pin');e.style.top='';continue}
  e.classList.add('pin');const h=e.getBoundingClientRect().height,essencial=e.id==='releaseBar'||e.id==='globalFilters';
  if(!essencial&&acc+h>limit){e.classList.remove('pin');e.style.top='';continue}   // telas baixas: só o essencial fica fixo
  e.style.top=acc+'px';acc+=h}
 root.style.setProperty('--pin-bottom',acc+'px');
 for(const tw of tws){const t=tw.querySelector('table');if(!t||root.classList.contains('vm-mobile'))continue;tw.classList.add('pinThead');tw.classList.remove('pinWide','pinFit');tw.style.maxHeight='';
  const wide=t.scrollWidth>tw.clientWidth+2;tw.classList.add(wide?'pinWide':'pinFit')}
 enhanceTables()
}
// ===== Barras de rolagem (V3.38): toda tabela larga ganha a barra horizontal fixa na base da tela (igual à do Cronograma) e o cabeçalho acompanha a rolagem da página =====
let tblRO=null;
function enhanceTables(){
 const root=$('#content');if(!root)return;
 if(document.documentElement.classList.contains('vm-mobile')){root.querySelectorAll('.hbarWrap').forEach(w=>w.remove());root.querySelectorAll('.tablewrap').forEach(tw=>{tw._hb=null;tw.classList.remove('hbOn')});return}
 if(!tblRO&&window.ResizeObserver)tblRO=new ResizeObserver(()=>schedulePin());
 root.querySelectorAll('.tablewrap').forEach(tw=>{
  const t=tw.querySelector(':scope > table');if(!t||document.documentElement.classList.contains('vm-mobile')||tw.closest('#modalRoot'))return;
  if(tblRO){tblRO.observe(tw);tblRO.observe(t)}   // reavalia quando a largura muda (fontes, barra de rolagem da página, dados novos)
  const wide=tw.scrollWidth>tw.clientWidth+2;let hb=tw._hb;
  if(!wide){if(hb){hb.wrap.remove();tw._hb=null}tw.classList.remove('hbOn');tw.querySelectorAll('thead th').forEach(th=>{th.style.transform='';th.style.position='';th.style.zIndex=''});return}
  if(!hb){const wrap=document.createElement('div');wrap.className='hbarWrap';const bar=document.createElement('div');bar.className='tblHScroll';   // classe própria: a limpeza do Gantt remove tudo que tem .ganttHScroll
  bar.setAttribute('role','scrollbar');bar.setAttribute('aria-orientation','horizontal');bar.title='Role para ver as demais colunas da tabela';const inner=document.createElement('div');inner.className='ganttHScrollInner';bar.append(inner);wrap.append(bar);tw.after(wrap);
   bar.addEventListener('scroll',()=>{if(tw.scrollLeft!==bar.scrollLeft)tw.scrollLeft=bar.scrollLeft});tw.addEventListener('scroll',()=>{if(bar.scrollLeft!==tw.scrollLeft)bar.scrollLeft=tw.scrollLeft});hb=tw._hb={wrap,bar,inner}}
  tw.classList.add('hbOn');hb.bar.style.width=tw.clientWidth+'px';hb.inner.style.width=tw.scrollWidth+'px';if(hb.bar.scrollLeft!==tw.scrollLeft)hb.bar.scrollLeft=tw.scrollLeft});
 root.querySelectorAll('.hbarWrap').forEach(w=>{const p=w.previousElementSibling;if(!p||!p._hb||p._hb.wrap!==w)w.remove()});
 stickHeads()
}
function stickHeads(){
 if(!document.documentElement.classList.contains('pinned'))return;
 const pb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))||0;
 document.querySelectorAll('#content .tablewrap.hbOn').forEach(tw=>{const ths=tw.querySelectorAll('thead th');if(!ths.length)return;const r=tw.getBoundingClientRect(),hh=ths[0].parentElement.getBoundingClientRect().height,d=Math.max(0,Math.min(pb-r.top,r.height-hh-6));ths.forEach(th=>{th.style.position='relative';th.style.transform=d>0?`translateY(${Math.round(d)}px)`:'';th.style.zIndex=d>0?'5':''})})
}
let headRaf=0;
function initPinStack(){
 document.addEventListener('scroll',()=>{if(!headRaf)headRaf=requestAnimationFrame(()=>{headRaf=0;stickHeads()})},{capture:true,passive:true});
 window.addEventListener('resize',schedulePin);
 const c=$('#content');if(c)new MutationObserver(schedulePin).observe(c,{childList:true});
 const r=$('#releaseBar');if(r)new MutationObserver(schedulePin).observe(r,{childList:true,subtree:true});
 const f=$('#globalFilters');if(f)new MutationObserver(schedulePin).observe(f,{childList:true});
 schedulePin()
}
// ===== Atualizar aplicativo (V3.37.1): cancela o service worker e apaga só o cache do ObraTop; bases, rascunhos e preferências ficam =====
function relNum(txt){const m=String(txt).match(/ObraTop\s+(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?/);return m?[+m[1],+m[2],+(m[3]||0),+(m[4]||0)]:null}
function cmpRel(a,b){for(let i=0;i<4;i++)if(a[i]!==b[i])return a[i]<b[i]?-1:1;return 0}
async function checkNewVersion(){try{if(!navigator.onLine)return;const r=await fetch('RELEASE.txt?c='+Date.now(),{cache:'no-store'});if(!r.ok)return;const srv=relNum(await r.text()),cur=RELEASE.split('.').map(Number),novo=srv&&cmpRel(cur,srv)<0?srv.join('.'):'';if(novo!==(state.newVersion||'')){state.newVersion=novo;renderReleaseBar()}if(novo)watchIdleUpdate()}catch{}}
// V3.38.3: atualização automática com o aplicativo parado (3 min sem uso, sem janela aberta nem campo em edição)
let idleLast=Date.now(),idleHooked=false,idleTimer=null;
function watchIdleUpdate(){if(!idleHooked){idleHooked=true;['pointerdown','keydown','wheel','touchstart','input'].forEach(e=>addEventListener(e,()=>{idleLast=Date.now()},{passive:true,capture:true}))}if(idleTimer)return;idleTimer=setInterval(()=>{try{if(!state.newVersion||!navigator.onLine)return;if(Date.now()-idleLast<180000)return;if(document.querySelector('.modalback'))return;const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&(a.value||'').length)return;if(document.hidden)return;clearInterval(idleTimer);idleTimer=null;toast('Nova versão encontrada: atualizando automaticamente…');updateApp(true)}catch{}},20000)}
async function updateApp(auto){
 if(!navigator.onLine)return alert('Sem conexão com a internet: atualizar agora apagaria a cópia salva do aplicativo e ele não abriria. Conecte-se e tente de novo.');
 if(!auto&&!confirm('Atualizar o aplicativo agora?\n\nO ObraTop busca a versão mais recente e recarrega a página. Suas bases SINAPI/ORSE importadas, rascunhos de orçamento e preferências (letra, cabeçalho fixo) são mantidos. Salve antes o que estiver sendo digitado.'))return;
 try{const sw=await (await fetch('sw.js?c='+Date.now(),{cache:'no-store'})).text();const names=[...new Set([...(sw.match(/'\.\/[^']+\.(?:css|mjs|js)'/g)||[]).map(x=>x.slice(1,-1)),'./app.js','./styles.css','./economics.css','./manual.css','./fluent.css','./mobile.css'])];await Promise.all(names.map(n=>fetch(n,{cache:'reload'}).catch(()=>0)))}catch(e){console.warn('Atualização (cache):',e)}
 try{const regs=(await navigator.serviceWorker?.getRegistrations?.())||[];for(const r of regs)await r.unregister();if(window.caches)for(const k of await caches.keys())if(/^obratop/i.test(k))await caches.delete(k)}catch(e){console.warn('Atualização:',e)}
 toast('Atualizando o aplicativo…');setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('v',Date.now());location.replace(u.toString())},450)
}
// ===== Tamanho da letra (V3.34.2): normal / grande (padrão) / extra grande =====
function fsPref(){try{const v=localStorage.getItem('obratop-fs');return['normal','grande','extra'].includes(v)?v:'grande'}catch{return'grande'}}
function fsLabel(){return{normal:'normal',grande:'grande',extra:'extra grande'}[fsPref()]}
function applyFs(){document.documentElement.dataset.fs=fsPref()}
function renderReleaseBar(){const el=$('#releaseBar');if(!el)return;el.innerHTML=`<div class="releaseIdentity" title="Versão efetivamente carregada"><strong>ObraTop V${esc(RELEASE)}</strong><span class="envTag ${ENV_LABEL==='Homologação'?'hom':'prod'}">${esc(ENV_LABEL)}</span><span>Atualizado em ${RELEASE_DATE_BR}</span></div><button class="pinBtn" id="pinBtn" type="button" aria-pressed="${pinPref()}" title="Mantém a faixa de versão, os filtros, o título da tela e as colunas sempre visíveis ao rolar">${pinPref()?'📌 Cabeçalho fixo':'📍 Cabeçalho solto'}</button><button class="pinBtn" id="fsBtn" type="button" title="Tamanho da letra: normal, grande ou extra grande" aria-label="Tamanho da letra: ${fsLabel()}">🔠 Letra: ${fsLabel()}</button><button class="pinBtn${state.newVersion?' updateAvail':''}" id="updBtn" type="button" title="${state.newVersion?`Há uma versão mais nova publicada (${state.newVersion}). Clique para atualizar.`:'Busca a versão mais recente do aplicativo. Suas bases SINAPI/ORSE, rascunhos e preferências são mantidos.'}">${state.newVersion?`🔔 Nova versão ${state.newVersion} — Atualizar`:'🔄 Atualizar aplicativo'}</button>`;const pb=$('#pinBtn');if(pb)pb.onclick=()=>{try{localStorage.setItem('obratop-pin',pinPref()?'off':'on')}catch{}renderReleaseBar();pinStack()};const ub=$('#updBtn');if(ub)ub.onclick=updateApp;const fb=$('#fsBtn');if(fb)fb.onclick=()=>{const ord=['normal','grande','extra'];try{localStorage.setItem('obratop-fs',ord[(ord.indexOf(fsPref())+1)%3])}catch{}applyFs();renderReleaseBar();schedulePin()}}
function initUiEnhancers(){
 try{const u=new URL(location.href);if(u.searchParams.has('v')){u.searchParams.delete('v');history.replaceState({},'',u)}}catch{}
 applyFs();renderReleaseBar();initPinStack();checkNewVersion();setInterval(checkNewVersion,5*60*1000);mob.initViewMode();updateViewButton();
 {const vb=$('#viewBtn');if(vb)vb.onclick=()=>{const v=mob.setPref(mob.nextPref(mob.getView()));updateViewButton();toast(v.mobile?'Visualização de smartphone':'Visualização de computador')};
  const ft=$('#filtersToggle');if(ft)ft.onclick=()=>{$('#globalFilters').classList.toggle('open');updateFiltersSummary()};
  const bk=$('#drawerBack');if(bk)bk.onclick=()=>toggleDrawer(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleDrawer(false)});
  mob.onViewChange(v=>{updateViewButton();if(!v.mobile)toggleDrawer(false);updateFiltersSummary();mob.labelTables($('#content'))})}
 showAuthBrand();window.addEventListener('beforeprint',()=>armPrintHeader());window.addEventListener('afterprint',disarmPrintHeader);
 let busy=false,timer=0;
 const run=()=>{timer=0;busy=true;try{mob.labelTables($('#content'));updateFiltersSummary();applyBtnIcons($('#content'));applyBtnIcons($('#modalRoot'));applyGlossary($('#content'));applyGlossary($('#modalRoot'));initGanttHScroll();initGanttStickyHead();window.__ganttStickyApply&&window.__ganttStickyApply()}catch(e){console.warn('Aprimoramentos de interface:',e)}finally{busy=false;obs.takeRecords()}};
 const obs=new MutationObserver(()=>{if(busy)return;clearTimeout(timer);timer=setTimeout(run,160)});
 const c=$('#content'),m=$('#modalRoot');
 if(c)obs.observe(c,{childList:true,subtree:true});
 if(m)obs.observe(m,{childList:true,subtree:true});
 run();
}
function metric(a,b,t='',sub='',tip=''){return`<div class="card miniMetric ${t}"${tip?` title="${esc(tip)}"`:''}><span>${a}</span><b>${b}</b>${sub?`<small class="miniSub">${sub}</small>`:''}</div>`}
function ratio(v){return Number.isFinite(v)&&v>0?v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}
function signedPct(v){v=Number(v)||0;return`${v>0?'+':''}${v.toFixed(1).replace('.',',')} p.p.`}
function statRow(a,b,bad=false){return`<p class="statrow"><span>${esc(a)}</span><b class="${bad?'dangertext':''}">${b}</b></p>`}
function aggregate(rows,key,valueKey){const m={};rows.forEach(x=>{const k=x[key]||'Sem categoria';m[k]=(m[k]||0)+(+x[valueKey]||0)});return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value)}
function aggregateOrdersBySupplier(rows,suppliers){const names=new Map(suppliers.map(x=>[x.id,String(x.name||'').trim()||'Fornecedor'])),m={};const looksLikeId=v=>/^[A-Za-z0-9_-]{18,40}$/.test(String(v||''));rows.forEach(x=>{const ref=String(x.supplierId||'').trim(),direct=String(x.supplierName||x.supplier||'').trim();let label=names.get(ref)||(!looksLikeId(direct)?direct:'');if(!label)label=ref?'Fornecedor não localizado':'Fornecedor não informado';m[label]=(m[label]||0)+(+x.value||0)});return Object.entries(m).map(([label,value])=>({label,value})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value)}
function countBy(rows,key){const m={};rows.forEach(x=>{const k=x[key]||'Sem status';m[k]=(m[k]||0)+1});return Object.entries(m).map(([label,value])=>({label,value}))}
function donutChart(items){const total=items.reduce((s,x)=>s+x.value,0);if(!total)return'<div class="empty">Cadastre dados para gerar o gráfico.</div>';let acc=0;const circles=items.map((x,i)=>{const p=x.value/total*100,off=25-acc;acc+=p;return`<circle cx="80" cy="80" r="54" fill="none" stroke="${chartColor(i)}" stroke-width="24" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${off}" pathLength="100"><title>${esc(x.label)}: ${x.value}</title></circle>`}).join('');return`<div class="donutwrap"><svg viewBox="0 0 160 160" role="img" aria-label="Distribuição por situação"><circle cx="80" cy="80" r="54" fill="none" stroke="#e9eff3" stroke-width="24"/>${circles}<text x="80" y="76" text-anchor="middle" font-size="26" font-weight="800">${total}</text><text x="80" y="96" text-anchor="middle" font-size="14" fill="#657786">registros</text></svg><div class="donutlegend">${items.map((x,i)=>`<span><i style="background:${chartColor(i)}"></i>${esc(x.label)} <b>${x.value}</b></span>`).join('')}</div></div>`}
function activityWeight(a){const explicit=Number(a.weight||a.costWeight||0);if(explicit>0)return explicit;const dur=Number(a.durationDays||0);if(dur>0)return dur;if(a.start&&a.end){const s=parseLocalDate(a.start),e=parseLocalDate(a.end);if(s&&e)return Math.max(1,Math.round((e-s)/86400000)+1)}return 1}
function weightedActivityProgress(acts,day=null,planned=false){return calc.weightedProgress({acts,budgets:state.data.budgets||[],works:state.data.works||[],day:day||today(),planned})}
function workProgress(w){const acts=(state.data.activities||[]).filter(x=>x.workId===w.id&&!x.deleted&&x.start&&x.end);return acts.length?weightedActivityProgress(acts,null,false):(+w.progress||0)}
function snapshotId(workId,date=today()){return`${workId}_${date}`}
function snapshotsForWorks(workIds){const ids=new Set(workIds);return(state.snapshots||[]).filter(x=>ids.has(x.workId)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))}
async function captureDailySnapshot(workId){if(!workId||!state.orgId||!state.user)return;const w=state.data.works.find(x=>x.id===workId&&!x.deleted);if(!w)return;if(!isAdmin()&&assignedWorkId()!==workId)return;const acts=(state.data.activities||[]).filter(x=>x.workId===workId&&!x.deleted),bud=(state.data.budgets||[]).filter(x=>x.workId===workId&&!x.deleted),fin=(state.data.finance||[]).filter(x=>x.workId===workId&&!x.deleted);const budget=bud.reduce((s,x)=>s+(+x.qty||0)*(+x.unitValue||0)*(1+(+x.bdi||0)/100),0),paid=fin.filter(x=>x.type==='Despesa'&&x.status==='Pago').reduce((s,x)=>s+(+x.value||0),0),measured=(state.data.measurements||[]).filter(x=>x.workId===workId&&!x.deleted&&['Aprovada','Faturada','Paga'].includes(x.status)).reduce((s,x)=>s+(+x.value||0),0),date=today(),data={workId,date,physicalPlanned:weightedActivityProgress(acts,date,true),physicalActual:weightedActivityProgress(acts,date,false),budget,paid,measured,capturedBy:state.user.uid,release:RELEASE,updatedAt:serverTimestamp()};const prev=(state.snapshots||[]).find(x=>x.id===snapshotId(workId,date));if(prev&&Math.abs((+prev.physicalPlanned||0)-data.physicalPlanned)<0.01&&Math.abs((+prev.physicalActual||0)-data.physicalActual)<0.01&&Math.abs((+prev.budget||0)-data.budget)<0.005&&Math.abs((+prev.paid||0)-data.paid)<0.005&&Math.abs((+prev.measured||0)-data.measured)<0.005)return;await setDoc(doc(fs,'organizations',state.orgId,'progressSnapshots',snapshotId(workId,date)),data,{merge:true})}
function scheduleSnapshotCapture(workId=''){if(snapshotTimer)clearTimeout(snapshotTimer);snapshotTimer=setTimeout(async()=>{snapshotTimer=null;try{const ids=workId?[workId]:(isAdmin()?state.data.works.filter(x=>!x.deleted).map(x=>x.id):[assignedWorkId()].filter(Boolean));for(const id of ids)await captureDailySnapshot(id)}catch(e){console.warn('Não foi possível registrar o snapshot diário:',e)}},900)}
function operationRef(){return doc(collection(fs,'organizations',state.orgId,'systemOperations'))}
function auditPayload(action,module,recordId,changes){return{action,module,recordId,changes,userId:state.user.uid,userEmail:state.user.email,at:serverTimestamp(),release:RELEASE}}
function expectedActivityProgress(a,d=today()){return calc.expectedProgress(a,d)}
function schedulePerformance(acts,budget,incurred){return calc.schedulePerformance({acts,budgets:state.data.budgets||[],works:state.data.works||[],budget,incurred,day:today()})}
function forecastFinish(works,avg){if(state.filters.workId){const w=works[0];if(!w?.start||avg<=0||avg>=100)return w?.end||'';const elapsed=Math.max(1,(new Date()-new Date(w.start+'T00:00:00'))/86400000),total=elapsed/(avg/100),d=new Date(new Date(w.start+'T00:00:00').getTime()+total*86400000);return d.toLocaleDateString('pt-BR')}return works.length?`${works.filter(x=>x.end&&x.end<today()&&x.status!=='Concluída').length} obra(s) atrasada(s)`:'—'}
function worksAttention(works,acts,fin,quality,contracts){return works.map(w=>{let score=0,reasons=[];const wa=acts.filter(x=>x.workId===w.id),wf=fin.filter(x=>x.workId===w.id),wq=quality.filter(x=>x.workId===w.id),wc=contracts.filter(x=>x.workId===w.id);const late=wa.filter(x=>x.end&&x.end<today()&&x.status!=='Concluída').length,overdue=wf.filter(x=>x.dueDate&&x.dueDate<today()&&!['Pago','Recebido'].includes(x.status)).length,nc=wq.filter(x=>x.status!=='Resolvida').length,ct=wc.filter(x=>x.end&&x.status!=='Encerrado'&&days(x.end)<=30).length;if(w.end&&w.end<today()&&w.status!=='Concluída'){score+=4;reasons.push('prazo da obra vencido')}if(late){score+=Math.min(4,late);reasons.push(`${late} atividade(s) atrasada(s)`)}if(overdue){score+=Math.min(3,overdue);reasons.push(`${overdue} financeiro(s) vencido(s)`)}if(nc){score+=Math.min(3,nc);reasons.push(`${nc} NC aberta(s)`)}if(ct){score+=2;reasons.push(`${ct} contrato(s) vencido(s) ou vencendo`)}return{id:w.id,name:w.name,progress:workProgress(w),score,reasons:reasons.join(' • ')||'Sem criticidade relevante'}}).sort((a,b)=>b.score-a.score).slice(0,10)}
function attentionTable(rows){if(!rows.length)return'<div class="empty">Nenhuma obra no filtro atual.</div>';return`<div class="tablewrap"><table><thead><tr><th>Obra</th><th>Avanço</th><th>Criticidade</th><th>Motivos</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${pct(x.progress)}</td><td><span class="badge ${x.score>=5?'bad':x.score>=2?'warn':'ok'}">${x.score>=5?'Alta':x.score>=2?'Média':'Baixa'}</span></td><td>${esc(x.reasons)}</td><td><button class="btn small focusWork" data-id="${x.id}">Analisar</button></td></tr>`).join('')}</tbody></table></div>`}
function sCurve(a){
 a=a.filter(x=>x.start&&x.end);if(!a.length)return'<div class="empty">Cadastre atividades para gerar a Curva S.</div>';
 const starts=a.map(x=>parseLocalDate(x.start)).filter(Boolean),ends=a.map(x=>parseLocalDate(x.end)).filter(Boolean),minD=new Date(Math.min(...starts)),maxD=new Date(Math.max(...ends));
 const ds=[];let d=new Date(minD.getFullYear(),minD.getMonth(),1),stop=new Date(maxD.getFullYear(),maxD.getMonth()+1,0);while(d<=stop){const eom=new Date(d.getFullYear(),d.getMonth()+1,0),point=eom>maxD?maxD:eom;ds.push(ganttLocalISO(point));d=new Date(d.getFullYear(),d.getMonth()+1,1)}
 if(!ds.includes(today()))ds.push(today());ds.sort();
 const workIds=[...new Set(a.map(x=>x.workId).filter(Boolean))],snaps=snapshotsForWorks(workIds),snapByDate=new Map();
 for(const sn of snaps){const key=String(sn.date||'');if(!key)continue;if(!snapByDate.has(key))snapByDate.set(key,[]);snapByDate.get(key).push(sn)}
 const currentActual=weightedActivityProgress(a,today(),false),series=ds.map(day=>{const daySnaps=snapByDate.get(day)||[];let actual=null;if(daySnaps.length)actual=daySnaps.reduce((sum,x)=>sum+(+x.physicalActual||0),0)/daySnaps.length;else if(day===today())actual=currentActual;return{d:day,planned:weightedActivityProgress(a,day,true),actual}});
 const W=900,H=280,L=58,R=28,T=24,B=54,PW=W-L-R,PH=H-T-B,x=i=>L+i*(PW/Math.max(1,series.length-1)),y=v=>T+(100-clamp(v,0,100))/100*PH,ticks=[0,25,50,75,100];
 const pointString=k=>series.map((p,i)=>p[k]===null||p[k]===undefined?'':`${x(i)},${y(p[k])}`).filter(Boolean).join(' ');
 const grid=ticks.map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#dfe7ec" stroke-width="1"/><text x="${L-10}" y="${y(v)+5}" text-anchor="end">${v}%</text>`).join('');
 const lblStep=Math.max(1,Math.ceil(series.length*72/PW)),xlabels=series.map((p,i)=>{const lastI=series.length-1;if(!(i===lastI||(i%lblStep===0&&lastI-i>=Math.ceil(lblStep*0.6))))return'';const dd=parseLocalDate(p.d),lab=dd?String(dd.getMonth()+1).padStart(2,'0')+'/'+String(dd.getFullYear()).slice(2):p.d;return`<text x="${x(i)}" y="${H-22}" text-anchor="middle">${lab}</text>`}).join('');
 const circles=series.map((p,i)=>{let h=`<circle cx="${x(i)}" cy="${y(p.planned)}" r="4.5" fill="#fff" stroke="#ff6a00" stroke-width="2.5"><title>${dateBR(p.d)} • Planejado: ${p.planned.toFixed(1).replace('.',',')}%</title></circle>`;if(p.actual!==null)h+=`<circle cx="${x(i)}" cy="${y(p.actual)}" r="4.5" fill="#fff" stroke="#0066ff" stroke-width="2.5"><title>${dateBR(p.d)} • Realizado histórico: ${p.actual.toFixed(1).replace('.',',')}%</title></circle>`;return h}).join('');
 const todayIdx=series.findIndex(p=>p.d===today()),todayX=todayIdx>=0?x(todayIdx):-1,last=series.at(-1),lastActual=[...series].reverse().find(p=>p.actual!==null),perf=schedulePerformance(a,0,0),duration=Math.max(1,Math.ceil((maxD-minD)/86400000)+1),finish=maxD.toLocaleDateString('pt-BR');
 const plannedLabel=Math.abs(last.planned-Math.round(last.planned))<0.05?Math.round(last.planned)+'%':last.planned.toFixed(1).replace('.',',')+'%';
 const actualLabel=lastActual?(Math.abs(lastActual.actual-Math.round(lastActual.actual))<0.05?Math.round(lastActual.actual)+'%':lastActual.actual.toFixed(1).replace('.',',')+'%'):'';
 const tp=todayIdx>=0?series[todayIdx]:null,fp=v=>v.toFixed(1).replace('.',',')+'%',todayTxt=tp?`Hoje ${dateBR(tp.d).slice(0,5)} • Plan. ${fp(tp.planned)}${tp.actual!==null&&tp.actual!==undefined?' • Real. '+fp(tp.actual):''}`:'Hoje';
 const todayLine=todayX>=0?`<line x1="${todayX}" y1="${T}" x2="${todayX}" y2="${H-B}" stroke="#6ea8dc" stroke-width="1.5" stroke-dasharray="5 5"/><text x="${todayX}" y="${T-7}" text-anchor="${todayX>W-230?'end':todayX<L+230?'start':'middle'}" font-weight="700">${todayTxt}</text>`:'';
 const actualLine=pointString('actual')?`<polyline points="${pointString('actual')}" fill="none" stroke="#0066ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`:'';
 const actualEnd=lastActual?`<text x="${W-34}" y="${Math.min(H-B-6,y(lastActual.actual)+18)}" text-anchor="end" fill="#0066ff" font-weight="700">${actualLabel}</text>`:'';
 return`<div class="sCurveWrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva S planejada e realizada">${grid}<line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="#b8c6cf"/>${todayLine}<polyline points="${pointString('planned')}" fill="none" stroke="#ff6a00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${actualLine}${circles}${xlabels}<g class="sCurveEndLabels"><text x="${W-34}" y="${Math.max(36,y(last.planned)-10)}" text-anchor="end" fill="#ff6a00" font-weight="700">${plannedLabel}</text>${actualEnd}</g></svg><div class="legend sLegend"><span><i style="background:#ff6a00"></i>Planejado</span><span><i style="background:#0066ff"></i>Realizado</span></div><div class="sCurveStats"><span><b>${pct(perf.planned)}</b><small>Planejado hoje</small></span><span><b>${pct(perf.actual)}</b><small>Realizado atual</small></span><span class="${perf.variance<0?'bad':''}"><b>${signedPct(perf.variance)}</b><small>Desvio atual</small></span><span><b>${duration} dias</b><small>Duração total</small></span><span><b>${finish}</b><small>Término planejado</small></span></div></div>`
}

const brand_cmpAz=(a,b)=>String(a).localeCompare(String(b),'pt-BR',{sensitivity:'base',numeric:true});
function serviceName(b){return String(b.description||'').replace(/^[A-Za-z0-9.\-\/]+\s+—\s+/,'').trim()}
function renderModule(type){const s=schemas[type],a=type==='budgets'?[...filtered(type)].sort((x,y)=>brand_cmpAz(serviceName(x),serviceName(y))||String(x.itemNo||'').localeCompare(String(y.itemNo||''),undefined,{numeric:true})):filtered(type),actions=`<div class="module-actions">${type==='works'&&canCreate('works')?'<button class="btn primary" id="wizardBtn">✨ Assistente de nova obra</button>':''}${canCreate(type)?'<button class="btn" id="importFile">⇩ Importar arquivo</button>':''}<button class="btn" id="exportFile">⇧ Exportar arquivo</button><a class="btn" href="ObraTop_Super_Planilha_Base.xlsx" download>▦ Modelo base</a>${canCreate(type)?'<button class="btn primary" id="addRecord">+ Novo registro</button>':''}</div>`;$('#content').innerHTML=head(s.title,s.subtitle,actions)+moduleSummary(type,a)+(type==='orders'?'':bulkBarHtml(type,a))+table(type,a);if($('#addRecord'))$('#addRecord').onclick=()=>openForm(type);if($('#importFile'))$('#importFile').onclick=()=>openImportFormat(type);$('#exportFile').onclick=()=>openExportFormat(type);if($('#openResourceCurves'))$('#openResourceCurves').onclick=()=>route('resourcecurves');$$('.stockOrder').forEach(b=>b.onclick=()=>openStockPurchase(b.dataset.id));$$('.genFin').forEach(b=>b.onclick=()=>openFinanceFromSource(b.dataset.kind,b.dataset.id));$$('.receiveStock').forEach(b=>b.onclick=()=>receiveOrderStock(b.dataset.id));$$('.compBtn').forEach(b=>b.onclick=()=>openComposition(b.dataset.id));$$('.applyLog').forEach(b=>b.onclick=()=>applyDailyLog(b.dataset.id));bindBulk(type);if($('#wizardBtn'))$('#wizardBtn').onclick=openWorkWizard}
function renderActivities(){
 const s=schemas.activities,a=filtered('activities'),actions=`<div class="module-actions">${canCreate('activities')?'<button class="btn" id="importFile">⇩ Importar arquivo</button>':''}<button class="btn" id="exportFile">⇧ Exportar arquivo</button><a class="btn" href="ObraTop_Super_Planilha_Base.xlsx" download>▦ Modelo base</a>${canCreate('activities')?'<button class="btn primary" id="addRecord">+ Novo registro</button>':''}</div>`;
 $('#content').innerHTML=head(s.title,s.subtitle,actions)+`<div id="cronogramaStatus" class="ganttStatusBar"><span><b>${a.length}</b> atividade(s) no filtro atual</span><span>Visualização: EAP + Gantt</span></div>`+ganttProjectPanel(a);
 if($('#addRecord'))$('#addRecord').onclick=()=>openForm('activities');
 if($('#importFile'))$('#importFile').onclick=()=>openImportFormat('activities');
 if($('#exportFile'))$('#exportFile').onclick=()=>openExportFormat('activities');
 bindGanttControls($('#ganttProjectViewport')?.dataset.zoom||'normal');
}
function moduleSummary(t,a){if(t==='inventory'){const rows=a.map(stockInfo),total=rows.reduce((s,x)=>s+x.value,0),replenishment=rows.reduce((s,x)=>s+x.suggestedCost,0),excess=rows.reduce((s,x)=>s+x.excessValue,0),urgent=rows.filter(x=>x.level==='bad').length,reorder=rows.filter(x=>x.level==='warn').length;return`<div class="card stockPanel"><div class="sectiontitle">Controle visual e plano de ação do estoque</div><p class="muted">🔴 Crítico: compra imediata. 🟡 Comprar: ressuprimento deve ser iniciado. 🟢 Normal: monitorar. 🔵 Planejado: previsto pela Engenharia Inteligente, sem saldo físico ativo e sem compra automática. 🟠 Excesso: suspender compras e avaliar remanejamento. A quantidade sugerida repõe o item até o estoque máximo cadastrado.</p>${stockTrafficSummary(rows)}<div class="grid stockActionKpis">${kpi('Pedidos imediatos',urgent)}${kpi('Ressuprimentos',reorder)}${kpi('Reposição sugerida',money(replenishment))}${kpi('Capital em excesso',money(excess))}</div><div class="toolbar"><span class="badge ok">Valor em estoque ${money(total)}</span><button class="btn small" id="openResourceCurves">Curvas S e ABC</button></div>${inventoryTable(rows)}</div><br>`}if(t==='finance'){const r=a.filter(x=>x.type==='Receita').reduce((s,x)=>s+(+x.value||0),0),d=a.filter(x=>x.type==='Despesa').reduce((s,x)=>s+(+x.value||0),0);return`<div class="grid kpis">${kpi('Receitas',money(r))}${kpi('Despesas',money(d))}${kpi('Saldo',money(r-d))}</div><br>`}if(t==='budgets'){const v=a.reduce((s,x)=>s+(+x.qty||0)*(+x.unitValue||0)*(1+(+x.bdi||0)/100),0);return`<div class="toolbar"><span class="badge ok">Total ${money(v)}</span></div>`}if(t==='activities'&&a.length)return ganttProjectPanel(a);return''}
function parseLocalDate(v){if(!v)return null;const p=String(v).slice(0,10).split('-').map(Number);return p.length===3?new Date(p[0],p[1]-1,p[2]):null}
function isoLocal(d){if(!(d instanceof Date)||Number.isNaN(d))return'';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addCalendarDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function workdaysBetween(a,b){a=parseLocalDate(a),b=parseLocalDate(b);if(!a||!b||b<a)return 0;let n=0,x=new Date(a);while(x<=b){const day=x.getDay();if(day!==0&&day!==6)n++;x.setDate(x.getDate()+1)}return n}
function addWorkdays(start,n){let d=parseLocalDate(start);n=Math.max(1,Math.round(+n||1));if(!d)return'';let count=1;while(count<n){d.setDate(d.getDate()+1);const day=d.getDay();if(day!==0&&day!==6)count++}return isoLocal(d)}
function nextWorkday(start){let d=parseLocalDate(start);if(!d)return'';do{d.setDate(d.getDate()+1)}while([0,6].includes(d.getDay()));return isoLocal(d)}
function activityProgress(x){if(x.progressMode==='Quantidade'&&(+x.plannedQty||0)>0)return clamp((+x.actualQty||0)/(+x.plannedQty||1)*100,0,100);return clamp(+x.progress||0,0,100)}
// Estado da barra: no prazo (active), atrasada (late), crítica (crit), concluída (done) ou resumo da etapa (summary)
const GANTT_STATES={active:'No prazo',late:'Atrasada',crit:'Crítica',done:'Concluída',summary:'Etapa (resumo)'};
function ganttState(x){
 if(x.__summary)return'summary';
 const pr=activityProgress(x);if(x.status==='Concluída'||pr>=100)return'done';
 if(!x.start||!x.end)return'active';
 const t=today(),gap=expectedActivityProgress(x,t)-pr;
 if(String(x.end)<t)return'crit';                       // prazo vencido e não concluída
 if(gap>=20)return'crit';                               // 20 pontos percentuais ou mais abaixo do esperado
 if(gap>3.5||x.status==='Atrasada')return'late';
 return'active'
}
function ganttLegendHtml(rows){const n={active:0,late:0,crit:0,done:0};for(const x of rows)if(!x.__summary){const k=ganttState(x);if(n[k]!==undefined)n[k]++}
 return`<div class="ganttLegend" aria-label="Legenda das barras"><span><i class="lg active"></i>No prazo <b>${n.active}</b></span><span><i class="lg late"></i>Atrasada <b>${n.late}</b></span><span><i class="lg crit"></i>Crítica <b>${n.crit}</b></span><span><i class="lg done"></i>Concluída <b>${n.done}</b></span><span><i class="lg summary"></i>Etapa (resumo)</span><span><i class="lg base"></i>Linha de base</span><small>Atrasada: avanço abaixo do esperado para a data. Crítica: prazo vencido sem concluir ou 20 pontos percentuais (ou mais) abaixo do esperado.</small></div>`}
const DOW_MS=['dom','seg','ter','qua','qui','sex','sáb'];
function fmtMsDate(iso){if(!iso)return'—';const d=parseLocalDate(iso);if(!(d instanceof Date)||Number.isNaN(d.getTime()))return String(iso);return`${DOW_MS[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`}
function fmtDur(x){const n=x.milestone?0:(+x.durationDays||workdaysBetween(x.start,x.end));return`${n} ${n===1?'dia':'dias'}`}
function ganttWbs(x){return String(x?.wbs||ganttCanonical(x)?.wbs||'').trim()}
function ganttPred(x){return String(x?.predecessors||ganttCanonical(x)?.pred||'').trim()}
function ganttRowScore(x){return(ganttWbs(x)?100:0)+(x?.predecessors?20:0)+(x?.progressMode==='Quantidade'?10:0)+(x?.plannedQty?5:0)+(x?.updatedAt?.seconds||0)/1e12}
function ganttIdentity(x){return[x.workId||'',norm(x.name||''),x.start||'',x.end||''].join('|')}
function dedupeGanttRows(a){const m=new Map();for(const x of a){if(!x?.start||!x?.end)continue;const k=ganttIdentity(x),old=m.get(k);if(!old||ganttRowScore(x)>ganttRowScore(old))m.set(k,x)}return[...m.values()]}
function ganttPhaseKey(x){if(x?.eapPhase)return String(x.eapPhase);const p=ganttWbs(x).split('.').filter(Boolean);return p.length>=2?p.slice(0,2).join('.'):''}
function ganttRootCode(x){if(x?.eapRoot)return String(x.eapRoot);const p=ganttWbs(x).split('.').filter(Boolean);return p[0]||''}
function ganttLocalISO(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function ganttSummary(children,{id,workId,wbs,name,key,level=0,countLabel=true}){const starts=children.map(y=>parseLocalDate(y.start)).filter(Boolean),ends=children.map(y=>parseLocalDate(y.end)).filter(Boolean),weighted=children.reduce((s,y)=>s+activityProgress(y)*Math.max(1,+y.durationDays||workdaysBetween(y.start,y.end)),0),weight=children.reduce((s,y)=>s+Math.max(1,+y.durationDays||workdaysBetween(y.start,y.end)),0),st=starts.length?ganttLocalISO(new Date(Math.min(...starts))):'',en=ends.length?ganttLocalISO(new Date(Math.max(...ends))):'';return{__summary:true,__level:level,id,workId,wbs,name,start:st,end:en,durationDays:st&&en?workdaysBetween(st,en):0,progress:weight?weighted/weight:0,status:children.every(y=>y.status==='Concluída')?'Concluída':children.some(y=>y.status==='Atrasada')?'Atrasada':'Em andamento',responsible:'',__key:key,__count:countLabel?children.length:0}}
function ganttSummaryKeys(raw){
 const base=dedupeGanttRows(Array.isArray(raw)?raw:[]).filter(x=>ganttWbs(x));
 const keys=[];
 for(const workId of [...new Set(base.map(x=>x.workId||''))]){
   const items=base.filter(x=>(x.workId||'')===workId);
   if(!items.length)continue;
   const shallow=items.every(x=>ganttWbs(x).split('.').filter(Boolean).length<=2)&&!items.some(x=>x.eapPhase);
   if(shallow){
     keys.push(`work|${workId||'sem-obra'}`);
   }else{
     for(const root of [...new Set(items.map(ganttRootCode).filter(Boolean))]){
       keys.push(`root|${workId}|${root}`);
     }
     for(const phase of [...new Set(items.map(ganttPhaseKey).filter(Boolean))]){
       keys.push(`phase|${workId}|${phase}`);
     }
   }
 }
 return [...new Set(keys)];
}
function ganttVisibleRows(raw){
 const src=Array.isArray(raw)?raw:[];
 const base=dedupeGanttRows(src).sort((a,b)=>(workName(a.workId)||'').localeCompare(workName(b.workId)||'','pt-BR')||ganttWbs(a).localeCompare(ganttWbs(b),undefined,{numeric:true})||(a.start||'').localeCompare(b.start||''));
 const structured=base.filter(x=>ganttWbs(x)),legacy=base.filter(x=>!ganttWbs(x)),out=[];
 const workIds=[...new Set(base.map(x=>x.workId||'__sem_obra__'))];
 for(const workKey of workIds){
   const items=structured.filter(x=>(x.workId||'__sem_obra__')===workKey),old=legacy.filter(x=>(x.workId||'__sem_obra__')===workKey),workId=workKey==='__sem_obra__'?'':workKey;
   if(items.length){
     const shallow=items.every(x=>ganttWbs(x).split('.').filter(Boolean).length<=2)&&!items.some(x=>x.eapPhase);
     if(shallow){
       const key=`work|${workId||'sem-obra'}`;
       out.push(ganttSummary(items,{id:`summary-${key}`,workId,wbs:'—',name:workName(workId)||'Obra',key,level:0,countLabel:false}));
       if(!ganttCollapsed.has(key)){
         for(const x of items.slice().sort((a,b)=>ganttWbs(a).localeCompare(ganttWbs(b),undefined,{numeric:true})))out.push({...x,__level:1});
       }
     }else{
       const roots=[...new Set(items.map(ganttRootCode).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
       for(const root of roots){
         const rootItems=items.filter(x=>ganttRootCode(x)===root),rootKey=`root|${workId}|${root}`;
         out.push(ganttSummary(rootItems,{id:`summary-${rootKey}`,workId,wbs:root,name:workName(workId)||`Obra ${root}`,key:rootKey,level:0,countLabel:false}));
         if(!ganttCollapsed.has(rootKey)){
           const phases=[...new Set(rootItems.map(ganttPhaseKey).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
           for(const phase of phases){
             const children=rootItems.filter(y=>ganttPhaseKey(y)===phase),key=`phase|${workId}|${phase}`;
             out.push(ganttSummary(children,{id:`summary-${key}`,workId,wbs:children.find(c=>c.eapPhaseCode)?.eapPhaseCode||phase,name:children.find(c=>c.eapPhaseName)?.eapPhaseName||GANTT_PHASES[phase]||`Pacote EAP ${phase}`,key,level:1}));
             if(!ganttCollapsed.has(key))for(const x of children)out.push({...x,__level:2});
           }
         }
       }
     }
   }
   if(ganttShowLegacy&&old.length){
     const key=`legacy|${workId||'sem-obra'}`;
     out.push(ganttSummary(old,{id:`summary-${key}`,workId,wbs:'LEG',name:'Atividades legadas sem EAP',key,level:0}));
     if(!ganttCollapsed.has(key))for(const x of old)out.push({...x,__legacy:true,__level:1});
   }
 }
 return out;
}
function ganttProjectPanel(a){
 const source=Array.isArray(a)?a:[];
 const rows=ganttVisibleRows(source);
 if(!source.length)return`<div class="card empty"><div class="sectiontitle">Cronograma sem atividades</div><p>Cadastre ou importe atividades para visualizar o Gantt.</p></div><br>`;
 if(!rows.length){const legacyCount=dedupeGanttRows(source).filter(x=>!ganttWbs(x)).length;return`<div class="card ganttProject"><div class="ganttTop"><div><div class="sectiontitle">Cronograma Gantt — visão estilo MS Project</div><div class="muted">Existem ${legacyCount} atividade(s) sem EAP/WBS. Use “Mostrar legadas” ou importe a Super Planilha atual.</div></div><div class="ganttTools"><button class="btn small" id="ganttLegacy">Mostrar legadas</button></div></div></div><br>`}
 const real=dedupeGanttRows(source),duplicates=Math.max(0,source.filter(x=>x.start&&x.end).length-real.length),inferred=real.filter(x=>!String(x?.wbs||'').trim()&&ganttCanonical(x)).length,noWbs=real.filter(x=>!ganttWbs(x)).length;
 const keys=ganttSummaryKeys(source),collapsedCount=keys.filter(k=>ganttCollapsed.has(k)).length,allCollapsed=keys.length>0&&collapsedCount===keys.length,allExpanded=collapsedCount===0;
 return`<div class="card ganttProject"><div class="ganttTop"><div><div class="sectiontitle">Cronograma Gantt — visão estilo MS Project</div><div class="muted">Obra → EAP → pacote → atividade, com datas, dias úteis, avanço, predecessoras e linha do tempo.</div></div><div class="ganttTools"><button class="btn small ganttZoom ${ganttZoomMode==='compact'?'active':''}" data-zoom="compact">Ano/Mês</button><button class="btn small ganttZoom ${ganttZoomMode==='normal'?'active':''}" data-zoom="normal">Ano/Mês/Dia</button><button class="btn small" id="ganttExpandAll" ${allExpanded?'disabled':''}>Expandir tudo</button><button class="btn small" id="ganttCollapseAll" ${allCollapsed?'disabled':''}>Recolher tudo</button>${noWbs?`<button class="btn small" id="ganttLegacy">${ganttShowLegacy?'Ocultar legadas':'Mostrar legadas'}</button>`:''}<button class="btn small" id="ganttToday">Hoje</button>${state.filters.workId&&isAdmin()?'<button class="btn small" id="ganttLink" title="Liga cada atividade ao item do orçamento de mesmo nome para ponderar o avanço pelo custo">Vincular ao orçamento</button><button class="btn small" id="ganttBaseline" title="Congela as datas atuais como linha de base do planejamento">Congelar linha de base</button>':''}<button class="btn small ${ganttCp?'active':''}" id="ganttCp" title="Destaca em vermelho as tarefas do caminho crítico (sem folga), calculado pelas predecessoras">Caminho crítico</button>${canCreate('activities')?'<button class="btn small" id="ganttMspImport" title="Importa o cronograma de um arquivo XML do MS Project (Arquivo > Salvar como > XML)">Importar MS Project</button>':''}${isAdmin()?'<button class="btn small" id="ganttEap" title="Lê o cronograma de todas as obras e renumera a EAP para começar no item 1">Revisar EAP</button>':''}<button class="btn small" id="ganttMsp" title="Exporta o cronograma em XML para abrir no Microsoft Project">Exportar MS Project</button></div></div>${ganttLegendHtml(rows)}<details class="ganttInfo"><summary>Notas, linha de base e siglas</summary><div class="ganttNotice">${duplicates?`✓ ${duplicates} registro(s) duplicado(s) ocultado(s). `:''}${inferred?`✓ ${inferred} EAP(s) reconstruída(s) automaticamente. `:''}${noWbs?`ℹ ${noWbs} atividade(s) legada(s) estão ${ganttShowLegacy?'visíveis':'ocultas'}.`:'✓ Todas as atividades estão classificadas na EAP.'} <b>${collapsedCount}/${keys.length}</b> grupo(s) recolhido(s).</div>${ganttMetaHtml()}<div class="ganttSiglas"><b>Siglas:</b> EAP = Estrutura Analítica do Projeto (código hierárquico; em inglês, WBS) • Dias = dias úteis • Qtd. = quantidade executada/planejada • Predecessoras = atividades que precisam terminar antes • Resp. = responsável</div></details><div id="ganttProjectViewport" class="ganttProjectViewport" data-zoom="${ganttZoomMode}">${ganttProject(rows,ganttZoomMode)}</div></div><br>`
}
function ganttProject(a,zoom='normal'){
 const rows=Array.isArray(a)?a.filter(x=>x&&x.start&&x.end):[];
 if(!rows.length)return`<div class="empty">Nenhuma atividade com início e fim no filtro atual.</div>`;
 const dates=rows.flatMap(x=>[parseLocalDate(x.start),parseLocalDate(x.end)]).filter(d=>d instanceof Date&&!Number.isNaN(d));
 if(!dates.length)return`<div class="empty">As atividades encontradas não possuem datas válidas.</div>`;
 const minD=new Date(Math.min(...dates.map(d=>d.getTime()))),maxD=new Date(Math.max(...dates.map(d=>d.getTime()))),min=addCalendarDays(minD,-2),max=addCalendarDays(maxD,2);
 const dayW=zoom==='compact'?8:24,totalDays=Math.max(1,Math.round((max-min)/86400000)+1),timelineW=Math.max(720,totalDays*dayW),days=[];
 for(let d=new Date(min);d<=max;d=addCalendarDays(d,1))days.push(new Date(d));
 const months=[],years=[];for(const d of days){const mk=`${d.getFullYear()}-${d.getMonth()}`;let m=months.at(-1);if(!m||m.key!==mk)months.push(m={key:mk,label:d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),count:0});m.count++;const yk=String(d.getFullYear());let y=years.at(-1);if(!y||y.key!==yk)years.push(y={key:yk,label:yk,count:0});y.count++}
 const todayD=parseLocalDate(today()),todayOffset=todayD?(todayD-min)/86400000*dayW:-1;
 const cpmMap=ganttCp?mspj.cpm(rows.filter(x=>!x.__summary).map(x=>({id:x.id,wbs:ganttWbs(x),start:x.start,end:x.end,pred:ganttPred(x)}))):new Map(),isCp=x=>!x.__summary&&!!cpmMap.get(x.id)?.critical&&ganttState(x)!=='done';
 const left=`<div class="ganttGridColumn"><div class="ganttGridLeft"><div class="ganttGridInner"><div class="ganttLeftHead"><span title="Número da linha">Nº</span><span title="Estrutura Analítica do Projeto (EAP; em inglês, WBS)">EAP</span><span>Nome da tarefa</span><span title="Duração em dias úteis">Duração</span><span>Início</span><span>Término</span><span title="Tarefas que precisam acontecer antes: código EAP + tipo (TI, II, TT, IT ou FS, SS, FF, SF) + defasagem. Ex.: 2.1;2.3II+2d">Predecessoras</span><span>Nomes dos recursos</span><span title="Percentual concluído">% Concl.</span><span>Ações</span></div>${rows.map((x,ri)=>{const pr=activityProgress(x),wbs=ganttWbs(x),depth=x.__level??Math.max(0,wbs.split('.').filter(Boolean).length-1),summary=!!x.__summary,collapsed=summary&&ganttCollapsed.has(x.__key);return`<div class="ganttLeftRow ${summary?'summary':''} ${x.__legacy?'legacy':''} ${isCp(x)?'cp':''}" data-wbs="${esc(wbs)}"><span class="ganttNo">${ri+1}</span><span class="ganttWbs">${summary?`<button type="button" class="ganttToggle" data-key="${esc(x.__key)}" title="${collapsed?'Expandir':'Recolher'}">${collapsed?'▶':'▼'}</button>`:''}${esc(wbs||'—')}</span><span class="ganttTaskName" style="--depth:${depth}" title="${esc(x.name)}">${x.milestone&&!summary?'◆ ':''}${esc(x.name)}${summary&&x.__count?` <small>(${x.__count})</small>`:''}</span><span>${fmtDur(x)}</span><span>${fmtMsDate(x.start)}</span><span>${fmtMsDate(x.end)}</span><span title="${esc(ganttPred(x))}">${esc(ganttPred(x))}</span><span title="${esc(x.resources||x.responsible||'')}">${esc(x.resources||x.responsible||'')}</span><span>${Math.round(pr)}%</span><span class="ganttActs">${!summary&&canEdit('activities',x)?`<button type="button" class="btn tiny ganttEdit" data-id="${x.id}" title="Editar" aria-label="Editar tarefa">✎</button>`:''}${!summary&&canDelete('activities',x)?`<button type="button" class="btn tiny danger ganttDelete" data-id="${x.id}" title="Excluir" aria-label="Excluir tarefa">✕</button>`:''}</span></div>`}).join('')}</div></div></div>`;
 const ROW_H=40,geo=rows.map(x=>{const st=parseLocalDate(x.start),en=parseLocalDate(x.end),l=Math.max(0,(st-min)/86400000*dayW);return{l,w:x.milestone&&!x.__summary?0:Math.max(dayW,((en-st)/86400000+1)*dayW)}});
 const barsHtml=rows.map((x,ri)=>{const g=geo[ri],pr=activityProgress(x),cls=ganttState(x),cp=isCp(x)?' cp':'',res=x.resources||x.responsible||'',tip=`${x.name} • ${dateBR(x.start)} → ${dateBR(x.end)} • ${Math.round(pr)}% • ${GANTT_STATES[cls]}${cp?' • caminho crítico':''}`;
  if(x.milestone&&!x.__summary)return`<div class="ganttCanvasRow">${baseBarHtml(x,min,dayW)}<div class="taskMs ${cls}${cp}" style="left:${g.l-9}px" title="${esc(tip)}"></div><em class="barLabel" style="left:${g.l+16}px">${esc(x.name)} — ${fmtMsDate(x.start)}</em></div>`;
  return`<div class="ganttCanvasRow ${x.__summary?'summary':''} ${x.__legacy?'legacy':''}">${baseBarHtml(x,min,dayW)}<div class="taskBar ${cls}${cp}" style="left:${g.l}px;width:${g.w}px" title="${esc(tip)}"><i style="width:${pr}%"></i><span>${Math.round(pr)}%</span></div>${res&&!x.__summary?`<em class="barLabel" style="left:${g.l+g.w+6}px">${esc(res)}</em>`:''}</div>`}).join('');
 const idxByWbs=new Map();rows.forEach((x,i)=>{if(!x.__summary)idxByWbs.set(ganttWbs(x),i)});
 const paths=[];rows.forEach((x,ri)=>{if(x.__summary)return;for(const lk of mspj.parsePred(ganttPred(x))){const pi=idxByWbs.get(lk.code);if(pi===undefined||pi===ri)continue;const P=geo[pi],S=geo[ri],y1=pi*ROW_H+ROW_H/2,y2=ri*ROW_H+ROW_H/2,hot=isCp(x)&&isCp(rows[pi]);let d;
   if(lk.type==='FS'){const x1=P.l+P.w,x2=S.l;d=x2>=x1+14?`M${x1} ${y1}H${x1+8}V${y2}H${x2-2}`:`M${x1} ${y1}H${x1+8}V${y1+(y2>y1?1:-1)*(ROW_H/2)}H${x2-8}V${y2}H${x2-2}`}
   else if(lk.type==='SS'){const x1=P.l,x2=S.l,xm=Math.min(x1,x2)-9;d=`M${x1} ${y1}H${xm}V${y2}H${x2-2}`}
   else if(lk.type==='FF'){const x1=P.l+P.w,x2=S.l+S.w,xm=Math.max(x1,x2)+9;d=`M${x1} ${y1}H${xm}V${y2}H${x2+2}`}
   else{const x1=P.l,x2=S.l+S.w,xm=Math.max(x1,x2)+9;d=`M${x1} ${y1}H${xm}V${y2}H${x2+2}`}
   paths.push(`<path d="${d}"${hot?' class="cp"':''} marker-end="url(#ganttArrow)"/>`)}});
 const linksSvg=`<svg class="ganttLinks" width="${timelineW}" height="${rows.length*ROW_H}" aria-hidden="true"><defs><marker id="ganttArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor"/></marker></defs>${paths.join('')}</svg>`;
 const header=`<div class="ganttTimeline" style="--timeline-w:${timelineW}px;--day-w:${dayW}px"><div class="ganttYears">${years.map(y=>`<span style="width:${y.count*dayW}px">${y.label}</span>`).join('')}</div><div class="ganttMonths">${months.map(m=>`<span style="width:${m.count*dayW}px">${m.label}</span>`).join('')}</div>${zoom==='normal'?`<div class="ganttDays">${days.map(d=>`<span class="${[0,6].includes(d.getDay())?'weekend':''}" style="width:${dayW}px"><b>${String(d.getDate()).padStart(2,'0')}</b><small>${['D','S','T','Q','Q','S','S'][d.getDay()]}</small></span>`).join('')}</div>`:''}<div class="ganttCanvas" style="width:${timelineW}px;background-size:${dayW}px 100%">${todayOffset>=0&&todayOffset<=timelineW?`<i class="todayLine" style="left:${todayOffset}px"><em>Hoje</em></i>`:''}${barsHtml}${linksSvg}</div></div>`;
 return`<div class="ganttProjectSplit">${left}<div class="ganttTimelineWrap">${header}</div></div>`
}
function bindGanttControls(zoom=ganttZoomMode){
 $$('.ganttEdit').forEach(b=>b.onclick=()=>{const x=state.data.activities.find(r=>r.id===b.dataset.id);if(x)openForm('activities',x)});
 $$('.ganttDelete').forEach(b=>b.onclick=()=>removeRecord('activities',b.dataset.id));
 $$('.ganttToggle').forEach(b=>b.onclick=()=>{const key=b.dataset.key;if(!key)return;ganttCollapsed.has(key)?ganttCollapsed.delete(key):ganttCollapsed.add(key);renderActivities()});
 $$('.ganttZoom').forEach(b=>b.onclick=()=>{ganttZoomMode=b.dataset.zoom==='compact'?'compact':'normal';renderActivities()});
 const ex=$('#ganttExpandAll');if(ex)ex.onclick=()=>{const keys=ganttSummaryKeys(filtered('activities'));if(!keys.length)return toast('Não existem grupos de EAP para expandir.');ganttCollapsed.clear();renderActivities();toast('EAP totalmente expandida.')};
 const co=$('#ganttCollapseAll');if(co)co.onclick=()=>{const keys=ganttSummaryKeys(filtered('activities'));if(!keys.length)return toast('Não existem grupos de EAP para recolher.');ganttCollapsed.clear();keys.forEach(k=>ganttCollapsed.add(k));renderActivities();toast('EAP totalmente recolhida.')};
 const lg=$('#ganttLegacy');if(lg)lg.onclick=()=>{ganttShowLegacy=!ganttShowLegacy;renderActivities()};
 const lk=$('#ganttLink');if(lk)lk.onclick=linkActivitiesToBudget;const bsl=$('#ganttBaseline');if(bsl)bsl.onclick=freezeBaseline;const msp=$('#ganttMsp');if(msp)msp.onclick=exportMsProject;const ge=$('#ganttEap');if(ge)ge.onclick=openEapReview;const cpb=$('#ganttCp');if(cpb)cpb.onclick=()=>{ganttCp=!ganttCp;renderActivities()};const mpi=$('#ganttMspImport');if(mpi)mpi.onclick=pickMsProject;
 const bt=$('#ganttToday');if(bt)bt.onclick=()=>{const line=$('.todayLine'),wrap=$('.ganttTimelineWrap');if(line&&wrap)wrap.scrollLeft=Math.max(0,line.offsetLeft-wrap.clientWidth/2);else toast('A data de hoje está fora do período exibido no Gantt.')};
}


function purchaseRecordType(o){
 const raw=norm([o.recordType,o.purchaseType,o.status,o.description].filter(Boolean).join(' '));
 if(raw.includes('cotacao'))return{key:'quote',label:'COTAÇÃO',help:'Levantamento/cotação; ainda não é pedido de compra'};
 if(raw.includes('solicitacao')||raw.includes('requisicao')||o.status==='Solicitado')return{key:'request',label:'SOLICITAÇÃO',help:'Solicitação interna aguardando cotação/aprovação'};
 return{key:'order',label:'PEDIDO',help:'Pedido de compra formal'};
}
function ordersTable(a){if(!a.length)return'<div class="card empty">Nenhum registro encontrado.</div>';return`<div class="purchaseLegend card"><b>Fluxo de compras:</b> <span class="purchaseType request">SOLICITAÇÃO</span> necessidade interna → <span class="purchaseType quote">COTAÇÃO</span> consulta de preços → <span class="purchaseType order">PEDIDO</span> compra formal/aprovada</div><div class="tablewrap"><table><thead><tr><th>Tipo</th><th>Obra</th><th>Fornecedor</th><th>Data</th><th>Prazo de entrega</th><th>Itens ou descrição</th><th>Material / qtd.</th><th>Valor total</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${a.map(x=>{const rt=purchaseRecordType(x);return`<tr><td><span class="purchaseType ${rt.key}" title="${esc(rt.help)}">${rt.label}</span></td><td>${display(['workId','Obra','work'],x.workId,x)}</td><td>${display(['supplierId','Fornecedor','supplier'],x.supplierId,x)}</td><td>${display(['date','Data','date'],x.date,x)}</td><td>${display(['dueDate','Prazo de entrega','date'],x.dueDate,x)}</td><td>${display(['description','Itens ou descrição','textarea'],x.description,x)}</td><td>${x.inventoryId?display(['inventoryId','','inventory'],x.inventoryId,x)+(x.qty?` • ${(+x.qty).toLocaleString('pt-BR',{maximumFractionDigits:3})}`:''):'—'}</td><td>${display(['value','Valor total','number'],x.value,x)}</td><td>${displayCell('orders',['status'],x)}${x.stockReceivedAt?' <small class="muted">• no estoque</small>':''}</td><td>${canEdit('orders',x)&&x.inventoryId&&+x.qty>0&&!x.stockReceivedAt&&x.status!=='Cancelado'?`<button class="btn small receiveStock" data-id="${x.id}" title="Soma a quantidade ao estoque atual e marca como Entregue">Receber no estoque</button> `:''}${['Aprovado','Entregue'].includes(x.status)&&canCreate('finance')?`<button class="btn small genFin" data-kind="order" data-id="${x.id}">Gerar despesa</button> `:''}${canEdit('orders',x)?`<button class="btn small edit" data-id="${x.id}">Editar</button>`:''}${canDelete('orders',x)?` <button class="btn small danger del" data-id="${x.id}">Excluir</button>`:''}${!canEdit('orders',x)&&!canDelete('orders',x)?'<span class="muted">Somente leitura</span>':''}</td></tr>`}).join('')}</tbody></table></div>`}
function tableFields(type){
 const f=schemas[type].fields.filter(x=>x[2]!=='file');
 if(type==='finance')return f.filter(x=>['workId','date','dueDate','description','type','category','value','status'].includes(x[0]));
 if(type==='contracts')return f.filter(x=>['workId','number','party','object','start','end','value','status'].includes(x[0]));
 if(type==='documents')return f.filter(x=>['workId','name','category','date','revision','status','reference'].includes(x[0]));
 if(type==='measurements')return f.filter(x=>['workId','date','number','description','physical','value','status'].includes(x[0]));
 if(type==='works')return f.filter(x=>['name','client','start','end','value','status','progress','engineer'].includes(x[0]));
 if(type==='dailyLogs')return f.filter(x=>['workId','date','weather','workable','laborCount','activityId','progressTo','status'].includes(x[0]));
 return f.slice(0,6);
}
function isPlannedResource(type,x){
 if(!['staff','equipment'].includes(type))return false;
 const txt=norm([x.name,x.role,x.status].filter(Boolean).join(' '));
 return !!x.demoCaixa42&&(txt.includes('planejad')||txt.includes('previst'));
}
function effectiveStatus(type,x){const t=today(),st=x.status;if(type==='finance'&&x.dueDate&&x.dueDate<t&&['Previsto','Pendente'].includes(st))return'Vencido';if(type==='activities'&&x.end&&x.end<t&&st!=='Concluída'&&st!=='Atrasada')return'Atrasada';if(type==='documents'&&x.expiry&&x.expiry<t&&['Aprovado','Em aprovação'].includes(st))return'Vencido';if(type==='contracts'&&x.end&&x.end<t&&st==='Ativo')return'Vencido';return st}
function workProgressCell(x){const has=(state.data.activities||[]).some(a=>a.workId===x.id&&!a.deleted&&a.start&&a.end);return pct(workProgress(x))+(has?' <span class="badge info" title="Calculado pelo cronograma">cronograma</span>':'')}
function displayCell(type,f,x){
 const[k]=f,v=x[k];
 if(type==='works'&&k==='progress')return workProgressCell(x);
 if(type==='budgets'&&k==='description'&&Array.isArray(x.composition)&&x.composition.length)return`${esc(v)} <small class="muted">· composição com ${x.composition.length} insumo(s)</small>`;
 if(type==='dailyLogs'&&k==='progressTo'&&x.appliedAt)return`${pct(v)} <small class="muted">· aplicado</small>`;
 if(type==='measurements'&&k==='value'&&((+x.retention||0)>0||(+x.deduction||0)>0)){const n=calc.measurementNet(x);return`${money(x.value)} <small class="muted" title="Retenção ${money(n.retention)} • Glosa ${money(n.deduction)}">líq. ${money(n.net)}</small>`}
 if(type==='contracts'&&k==='value'){const b=calc.contractBalance(x,state.data.measurements||[]);const cur=money(b.current)+(b.addendum?` <small class="muted">(+${money(b.addendum)} aditivos)</small>`:'');return b.hasMeasurements?`${cur}<br><small class="${b.balance<0?'dangertext':'muted'}">saldo ${money(b.balance)} (${b.percentLeft.toFixed(0)}%)</small>`:cur}
 if(k==='status'){const eff=effectiveStatus(type,x);if(eff&&eff!==v)return status(eff)+` <small class="muted" title="Calculada pela data; o registro guarda: ${esc(v)}">(pela data)</small>`}
 if(type==='works'&&k==='name'&&x.demoCaixa42)return`${esc(v)} <span class="badge info demoBadge">DEMONSTRAÇÃO</span>`;
 if(k==='status'&&isPlannedResource(type,x))return status('Planejado');
 if(type==='quality'&&k==='issue'&&x.demoCaixa42)return`<span class="badge info preventiveBadge">PENDÊNCIA PREVENTIVA</span><br>${esc(v||'—')}`;
 return display(f,v,x);
}
function table(type,a){
 if(type==='orders')return ordersTable(a);
 if(!a.length)return'<div class="card empty">Nenhum registro encontrado.</div>';
 const fields=tableFields(type);
 const bulkOn=BULK_TYPES.includes(type)&&bulkFieldsOf(type).length>0&&a.some(x=>canEdit(type,x)),bsel=bulkState(type);
 return`<div class="tablewrap"><table><thead><tr>${bulkOn?'<th class="bulkCol"><input type="checkbox" id="bulkAll" aria-label="Selecionar todos"></th>':''}${fields.map(x=>`<th>${esc(x[1])}</th>`).join('')}<th class="noPrint">Ações</th></tr></thead><tbody>${a.map(x=>`<tr>${bulkOn?`<td class="bulkCol"><input type="checkbox" class="bulkChk" data-id="${x.id}" ${canEdit(type,x)?'':'disabled'} ${bsel.ids.has(x.id)?'checked':''} aria-label="Selecionar"></td>`:''}${fields.map(f=>`<td>${displayCell(type,f,x)}</td>`).join('')}<td class="noPrint">${type==='measurements'&&['Aprovada','Faturada','Paga'].includes(x.status)&&canCreate('finance')?`<button class="btn small genFin" data-kind="measurement" data-id="${x.id}">Gerar receita</button> `:''}${type==='documents'&&x.fileUrl?`<a class="btn small" href="${esc(x.fileUrl)}" target="_blank" rel="noopener noreferrer">Arquivo</a> `:''}${type==='documents'&&safeUrl(x.reference)?`<a class="btn small" href="${esc(x.reference)}" target="_blank" rel="noopener noreferrer">Abrir fonte</a> `:''}${type==='budgets'&&canEdit(type,x)?`<button class="btn small compBtn" data-id="${x.id}">Composição</button> `:''}${type==='dailyLogs'&&x.activityId&&x.progressTo!==''&&x.progressTo!==undefined&&!x.appliedAt&&canEdit('activities',(state.data.activities||[]).find(a=>a.id===x.activityId)||{})?`<button class="btn small applyLog" data-id="${x.id}">Aplicar ao cronograma</button> `:''}${canEdit(type,x)?`<button class="btn small edit" data-id="${x.id}">Editar</button>`:''}${canDelete(type,x)?` <button class="btn small danger del" data-id="${x.id}">${type==='works'?'Excluir obra':'Excluir'}</button>`:''}${!canEdit(type,x)&&!canDelete(type,x)?'<span class="muted">Somente leitura</span>':''}</td></tr>`).join('')}</tbody></table></div>`;
}
function display(f,v,x){const[k,,t]=f;if(t==='date')return v?`<span class="nw">${dateBR(v)}</span>`:'—';if(t==='work')return esc(state.data.works.find(w=>w.id===v)?.name||'—');if(t==='supplier')return esc(state.data.suppliers.find(w=>w.id===v)?.name||'—');if(REF_TYPES[t]){const o=(state.data[REF_TYPES[t]]||[]).find(w=>w.id===v);return o?esc(refLabel(REF_TYPES[t],o)):'—'}if(k==='salary'&&!canSeeSalary())return'—';if(['value','unitValue','salary','monthlyCost'].includes(k))return money(v);if(['progress','physical','bdi','progressTo'].includes(k))return pct(v);if(k==='status')return status(v);if(k==='reference')return safeUrl(v)?`<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">Abrir</a>`:'—';return esc(v===0?'0':(v??'—'))}
document.addEventListener('click',e=>{const b=e.target.closest('.edit,.del');if(!b)return;const type=state.route;if(b.classList.contains('edit'))openForm(type,state.data[type].find(x=>x.id===b.dataset.id));else removeRecord(type,b.dataset.id)});
const REF_TYPES={inventory:'inventory',measurement:'measurements',order:'orders',contract:'contracts',budget:'budgets',activity:'activities'};
function refLabel(src,o){const w=workName(o.workId);if(src==='inventory')return`${o.material||'Material'} (${w})`;if(src==='measurements')return`${o.number||'Medição'} — ${shortLabel(o.description,40)} (${w})`;if(src==='orders')return`${o.date||''} — ${shortLabel(o.description,40)} (${w})`;if(src==='contracts')return`${o.number||'Contrato'} — ${shortLabel(o.party,30)} (${w})`;if(src==='budgets')return`${shortLabel(o.description,45)} — ${shortLabel(o.category,22)} (${w})`;if(src==='activities')return`${o.wbs?o.wbs+' ':''}${shortLabel(o.name,45)} (${w})`;return o.id}
function fieldHtml(f,val=''){const[k,l,t,req,opts]=f,r=req?'required':'';let c='';if(k==='salary'&&!canSeeSalary())return'';if(t==='textarea')c=`<textarea name="${k}" ${r} maxlength="2000">${esc(val)}</textarea>`;else if(t==='select')c=`<select name="${k}" ${r}><option value="">Selecione</option>${opts.map(o=>`<option ${String(o)===String(val)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;else if(t==='work'){const list=(seesAllWorks()?state.data.works:state.data.works.filter(o=>o.id===assignedWorkId())).filter(o=>!o.deleted||o.id===val);c=`<select name="${k}" ${r}>${isAdmin()?'<option value="">Geral/sem alocação</option>':''}${list.map(o=>`<option value="${o.id}" ${o.id===(val||assignedWorkId())?'selected':''}>${esc(o.name)}${o.deleted?' (excluída)':''}</option>`).join('')}</select>`;}else if(t==='supplier'){const list=state.data.suppliers.filter(o=>!o.deleted||o.id===val);c=`<select name="${k}" ${r}><option value="">Selecione</option>${list.map(o=>`<option value="${o.id}" ${o.id===val?'selected':''}>${esc(o.name)}${o.deleted?' (excluído)':''}</option>`).join('')}</select>`;}else if(['inventory','measurement','order','contract','budget','activity'].includes(t)){const src=REF_TYPES[t],wid=seesAllWorks()?'':assignedWorkId(),list=(state.data[src]||[]).filter(o=>(!o.deleted||o.id===val)&&(!wid||o.workId===wid));c=`<select name="${k}" ${r}><option value="">Nenhum</option>${list.map(o=>`<option value="${o.id}" ${o.id===val?'selected':''}>${esc(refLabel(src,o))}</option>`).join('')}</select>`}else if(t==='file')c=`<input name="${k}" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">`;else{const limits=['progress','physical','bdi','progressTo'].includes(k)?'min="0" max="100"':'';c=`<input name="${k}" type="${t}" value="${esc(val)}" ${r} ${limits} ${t==='number'?'step="any" min="0"':''}>`}return`<div class="field ${t==='textarea'?'full':''}"><label>${esc(l)}</label>${c}</div>`}
function openForm(type,item=null,prefill={}){if(item?!canEdit(type,item):!canCreate(type))return alert('Você possui permissão de alteração somente na obra que lhe foi atribuída.');const s=schemas[type];$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>${item?'Editar':'Novo'} — ${esc(s.title)}</h2><form id="recordForm"><div class="formgrid">${s.fields.map(f=>fieldHtml(f,item?.[f[0]]??prefill[f[0]]??'')).join('')}</div><div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button class="btn primary">Salvar</button></div></form></div></div>`;$('#cancelModal').onclick=closeModal;if(type==='activities')bindScheduleForm();$('#recordForm').onsubmit=e=>saveRecord(e,type,item)}
function addDaysISO(dateStr,n){const d=new Date((dateStr||today())+'T12:00:00');d.setDate(d.getDate()+(Number(n)||0));return d.toISOString().slice(0,10)}
function openFinanceFromSource(kind,id){const isM=kind==='measurement',src=(state.data[isM?'measurements':'orders']||[]).find(x=>x.id===id&&!x.deleted);if(!src)return alert('Registro de origem não encontrado.');if(!canCreate('finance'))return alert('Você não tem permissão para criar lançamentos financeiros.');const field=isM?'measurementId':'orderId',exist=(state.data.finance||[]).find(f=>!f.deleted&&f[field]===id);if(exist&&!confirm('Já existe um lançamento financeiro vinculado a este registro ('+(exist.description||exist.id)+'). Criar outro mesmo assim?'))return;const pre=isM?{workId:src.workId,date:today(),description:`Medição ${src.number} — ${src.description}`.slice(0,180),type:'Receita',category:'Medição',value:calc.measurementNet(src).net||+src.value||0,status:src.status==='Paga'?'Recebido':src.status==='Faturada'?'Pendente':'Previsto',paymentDate:src.status==='Paga'?today():'',measurementId:id,contractId:src.contractId||''}:{workId:src.workId,date:today(),dueDate:src.dueDate||'',description:`Pedido — ${src.description}`.slice(0,180),type:'Despesa',category:'Material',value:+src.value||0,status:src.status==='Entregue'?'Pendente':'Previsto',orderId:id};openForm('finance',null,pre)}
async function receiveOrderStock(id){const o=(state.data.orders||[]).find(x=>x.id===id&&!x.deleted);if(!o)return alert('Pedido não encontrado.');if(!canEdit('orders',o))return alert('Você não tem permissão para alterar este pedido.');const inv=(state.data.inventory||[]).find(x=>x.id===o.inventoryId&&!x.deleted),qty=+o.qty||0;if(!inv||qty<=0)return alert('Informe o material do estoque e a quantidade no pedido antes de dar entrada.');if(inv.workId!==o.workId)return alert('O material pertence a outra obra.');if(o.stockReceivedAt)return alert('A entrada deste pedido no estoque já foi registrada.');if(o.status==='Cancelado')return alert('Este pedido está cancelado.');if(!confirm(`Dar entrada de ${qty.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${inv.unit||''} de ${inv.material} no estoque e marcar o pedido como Entregue?`))return;try{const b=writeBatch(fs),now=serverTimestamp();b.update(doc(fs,'organizations',state.orgId,'orders',o.id),{status:'Entregue',stockReceivedAt:now,stockReceivedBy:state.user.uid,updatedAt:now,updatedBy:state.user.uid});b.update(doc(fs,'organizations',state.orgId,'inventory',inv.id),{currentStock:increment(qty),date:today(),updatedAt:now,updatedBy:state.user.uid});b.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('stock-receive','orders',o.id,{inventoryId:inv.id,material:inv.material,qty,stockBefore:+inv.currentStock||0}));await b.commit();toast('Entrada registrada no estoque.')}catch(e){alert(friendly(e))}}
function openStockPurchase(id){const raw=state.data.inventory.find(x=>x.id===id);if(!raw)return alert('Material não encontrado.');const z=stockInfo(raw);if(!['bad','warn'].includes(z.level)||z.suggestedQty<=0)return alert('Este item não exige reposição neste momento.');const desc=`Ressuprimento automático — ${z.material}: ${z.suggestedQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${z.unit||''}. Estoque atual ${z.current.toLocaleString('pt-BR')} ${z.unit||''}; ponto de pedido ${z.reorder.toLocaleString('pt-BR',{maximumFractionDigits:2})}; máximo ${z.max.toLocaleString('pt-BR')}. Prioridade ${z.priority}.`;openForm('orders',null,{workId:z.workId,date:today(),dueDate:addDaysISO(today(),z.leadTimeDays),description:desc,value:z.suggestedCost,status:'Solicitado',inventoryId:z.id,qty:z.suggestedQty})}
function closeModal(){$('#modalRoot').innerHTML=''}
function openModal(html){
 const root=$('#modalRoot');
 if(!root)throw Error('Área de diálogo não encontrada.');
 root.innerHTML=`<div class="modalback"><div class="dialog restorePointDialog">${html}</div></div>`;
 const back=root.querySelector('.modalback');
 if(back)back.addEventListener('click',e=>{if(e.target===back)closeModal()});
}

function bindScheduleForm(){const f=$('#recordForm');if(!f)return;const start=f.elements.start,end=f.elements.end,dur=f.elements.durationDays,mode=f.elements.progressMode,progress=f.elements.progress,planned=f.elements.plannedQty,actual=f.elements.actualQty;const syncDates=src=>{if(!start||!end||!dur)return;if(src==='duration'&&start.value&&+dur.value>0)end.value=addWorkdays(start.value,+dur.value);else if(start.value&&end.value)dur.value=workdaysBetween(start.value,end.value)};start?.addEventListener('change',()=>syncDates('dates'));end?.addEventListener('change',()=>syncDates('dates'));dur?.addEventListener('change',()=>syncDates('duration'));const syncProgress=()=>{if(mode?.value==='Quantidade'&&+planned?.value>0&&progress)progress.value=Math.round(clamp((+actual.value||0)/(+planned.value||1)*100,0,100)*100)/100};mode?.addEventListener('change',syncProgress);planned?.addEventListener('input',syncProgress);actual?.addEventListener('input',syncProgress);syncDates('dates');syncProgress()}
function auditDiff(old,data){const before={},after={};for(const k of Object.keys(data)){const a=old?.[k]??'',b=data[k]??'';if(String(a)!==String(b)){before[k]=a;after[k]=b}}return{before,after}}
async function saveRecord(e,type,item){e.preventDefault();let uploadedPath='';try{if(item?!canEdit(type,item):!canCreate(type))throw Error('Ação não permitida para esta obra.');const fd=new FormData(e.target),data={};for(const f of schemas[type].fields){const[k,,t]=f;if(t==='file')continue;if(k==='salary'&&!canSeeSalary())continue;let v=fd.get(k)?.toString().trim()||'';if(t==='number')v=Number(v)||0;if(['progress','physical','bdi','progressTo'].includes(k))v=clamp(v,0,100);data[k]=v}if(!seesAllWorks()&&type!=='works'&&hasWorkField(type))data.workId=assignedWorkId();if(type==='activities'){if(data.start&&data.durationDays&&!data.end)data.end=addWorkdays(data.start,data.durationDays);if(data.start&&data.end)data.durationDays=workdaysBetween(data.start,data.end);if(data.progressMode==='Quantidade'&&data.plannedQty>0)data.progress=clamp((data.actualQty/data.plannedQty)*100,0,100)}if(data.start&&data.end&&data.end<data.start)throw Error('A data final não pode ser anterior à data inicial.');if(data.reference&&!safeUrl(data.reference))throw Error('Use um endereço HTTPS válido.');if(type==='measurements'){const ret=+data.retention||0;if(ret<0||ret>100)throw Error('A retenção contratual deve ficar entre 0 e 100%.');if((+data.deduction||0)>(+data.value||0))throw Error('A glosa não pode ser maior que o valor medido.')}
 for(const[fk,src]of Object.entries(REF_LINKS[type]||{})){const rid=data[fk];if(!rid)continue;const rec=(state.data[src]||[]).find(y=>y.id===rid);if(!rec||rec.deleted)throw Error('O registro vinculado não existe mais.');if(data.workId&&rec.workId&&rec.workId!==data.workId)throw Error('O registro vinculado pertence a outra obra.')}const dup=duplicate(type,data,item?.id);if(dup&&!confirm('Existe um registro possivelmente duplicado. Deseja salvar mesmo assim?'))return;const file=fd.get('file');if(file?.size){if(file.size>10*1024*1024)throw Error('O arquivo deve ter no máximo 10 MB.');const folder=data.workId||item?.workId||'general',path=`organizations/${state.orgId}/documents/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.()-]/g,'_')}`;const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type});uploadedPath=path;data.fileUrl=await getDownloadURL(snap.ref);data.fileName=file.name;data.storagePath=path}const now=serverTimestamp(),batch=writeBatch(fs),auditRef=doc(collection(fs,'organizations',state.orgId,'audits'));let recordId=item?.id||doc(collection(fs,'organizations',state.orgId,type)).id,recordRef=doc(fs,'organizations',state.orgId,type,recordId);if(item)batch.update(recordRef,{...data,updatedAt:now,updatedBy:state.user.uid});else batch.set(recordRef,{...data,createdAt:now,createdBy:state.user.uid,updatedAt:now,updatedBy:state.user.uid,deleted:false});batch.set(auditRef,auditPayload(item?'update':'create',type,recordId,item?auditDiff(item,data):data));await batch.commit();uploadedPath='';closeModal();toast('Registro salvo.');const wid=type==='works'?recordId:(data.workId||item?.workId);if(['works','activities','finance','budgets','measurements'].includes(type)&&wid)scheduleSnapshotCapture(wid)}catch(x){if(uploadedPath){try{await deleteObject(storageRef(storage,uploadedPath))}catch{}}alert(friendly(x))}}

function duplicate(t,d,id){const keys={works:['name'],measurements:['workId','number'],suppliers:['cnpj'],contracts:['number'],equipment:['code']}[t];return keys&&state.data[t].some(x=>x.id!==id&&keys.every(k=>d[k]&&String(x[k]).toLowerCase()===String(d[k]).toLowerCase()))}
async function removeRecord(type,id){const item=state.data[type].find(x=>x.id===id);if(!canDelete(type,item))return alert('Somente o Administrador geral pode autorizar a exclusão de dados.');if(type==='works')return confirmWorkCascadeDelete(id);if(!confirm('Excluir este registro? A ação ficará registrada na auditoria e poderá ser restaurada pela administração.'))return;const b=writeBatch(fs),now=serverTimestamp();b.update(doc(fs,'organizations',state.orgId,type,id),{deleted:true,deletedAt:now,deletedBy:state.user.uid});b.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('delete',type,id,{}));await b.commit();toast('Registro movido para a lixeira.')}
async function loadEngineeringArchive(){
 const projectsSnap=await getDocs(query(collection(fs,'organizations',state.orgId,'engineeringProjects'),orderBy('createdAt','desc')));
 const rows=[];
 for(const d of projectsSnap.docs){
   const takeoffsSnap=await getDocs(collection(fs,'organizations',state.orgId,'engineeringProjects',d.id,'takeoffs'));
   rows.push({id:d.id,data:{id:d.id,...d.data()},takeoffs:takeoffsSnap.docs.map(t=>({id:t.id,data:{id:t.id,...t.data()}}))});
 }
 engineeringArchive=rows;
 return rows;
}
function engineeringFlatRows(archive=engineeringArchive){
 const rows=[];
 for(const p of archive||[]){
   rows.push({id:`project:${p.id}`,kind:'project',projectId:p.id,path:['organizations',state.orgId,'engineeringProjects',p.id],data:p.data||{}});
   for(const t of p.takeoffs||[])rows.push({id:`takeoff:${p.id}:${t.id}`,kind:'takeoff',projectId:p.id,takeoffId:t.id,path:['organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',t.id],data:t.data||{}});
 }
 return rows;
}
function engineeringArchiveSerializable(archive=engineeringArchive){
 return (archive||[]).map(p=>({id:p.id,data:backupSerializable(p.data||{}),takeoffs:(p.takeoffs||[]).map(t=>({id:t.id,data:backupSerializable(t.data||{})}))}));
}

async function getWorkLinkedRecords(workId){
 const rows=[];
 for(const type of WORK_LINKED_MODULES){
   const snap=await getDocs(query(collection(fs,'organizations',state.orgId,type),where('workId','==',workId)));
   snap.docs.forEach(d=>rows.push({...d.data(),type,id:d.id}));
 }
 const hist=await getDocs(query(collection(fs,'organizations',state.orgId,'progressSnapshots'),where('workId','==',workId)));
 hist.docs.forEach(d=>rows.push({...d.data(),type:'progressSnapshots',id:d.id}));
 const work=state.data.works.find(w=>w.id===workId);
 if(work?.demoCaixa42){
   const suppliersSnap=await getDocs(collection(fs,'organizations',state.orgId,'suppliers'));
   suppliersSnap.docs.filter(d=>{const z=d.data();return !z.deleted&&z.demoCaixa42&&(z.sourceDemoWorkId===workId||norm(z.name)===norm('Fornecedor demonstrativo — Materiais CAIXA 42 m²'))}).forEach(d=>rows.push({...d.data(),type:'suppliers',id:d.id}));
 }
 const eng=await getDocs(query(collection(fs,'organizations',state.orgId,'engineeringProjects'),where('workId','==',workId)));
 for(const p of eng.docs){
   const ts=await getDocs(collection(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs'));
   ts.docs.forEach(t=>rows.push({...t.data(),type:'engineeringTakeoffs',id:t.id,projectId:p.id,__path:['organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',t.id]}));
   rows.push({...p.data(),type:'engineeringProjects',id:p.id,__path:['organizations',state.orgId,'engineeringProjects',p.id]});
 }
 return rows
}
async function confirmWorkCascadeDelete(workId){if(!isAdmin())return alert('Somente Proprietário ou Administrador pode excluir uma obra e todos os seus vínculos.');const work=state.data.works.find(x=>x.id===workId);if(!work)return alert('Obra não encontrada.');setSync('Verificando vínculos…','warn');try{const linked=await getWorkLinkedRecords(workId),counts=linked.reduce((m,x)=>(m[x.type]=(m[x.type]||0)+1,m),{}),summary=Object.entries(counts).map(([t,n])=>`${t==='progressSnapshots'?'Histórico Curva S':t==='engineeringProjects'?'Projetos de Engenharia Inteligente':t==='engineeringTakeoffs'?'Quantitativos de Engenharia Inteligente':(schemas[t]?.title||t)}: ${n}`).join('\n')||'Nenhum registro vinculado';const typed=prompt(`ATENÇÃO: exclusão definitiva da obra \"${work.name}\".\n\nSerão excluídos automaticamente ${linked.length} registro(s) vinculados, sem necessidade de excluí-los um a um.\n\n${summary}\n\nEsta ação NÃO poderá ser desfeita. Digite EXCLUIR OBRA para confirmar:`);if(typed!=='EXCLUIR OBRA'){setSync('Sincronizado','ok');return}const rp=await createRestorePoint(`Automático pré-exclusão da obra: ${work.name}`,{category:'Pré-exclusão',protected:true});if(!rp)throw Error('Ponto de restauração pré-exclusão não pôde ser criado. Exclusão cancelada.');await purgeWorkCascade(work,linked);state.filters.workId='';buildFilters();updateProjectLabel();toast('Obra e registros vinculados excluídos definitivamente.')}catch(e){console.error(e);alert(friendly(e));setSync('Falha na exclusão','bad')}}
async function purgeWorkCascade(work,linked){
 setSync('Preparando exclusão segura…','warn');
 const storagePaths=[...new Set(linked.filter(x=>x.type==='documents'&&x.storagePath).map(x=>x.storagePath))];
 const op=operationRef(),opId=op.id,total=linked.length+1;
 await setDoc(op,{kind:'work-purge',status:'running',workId:work.id,workName:work.name,total,completed:0,createdBy:state.user.uid,createdAt:serverTimestamp(),release:RELEASE});
 let completed=0,failedRecord='';
 try{
  // Each delete is checked on its own. A large Firestore batch can exhaust the
  // security rules' document-access budget and mask the failing record.
  for(const item of linked){
   failedRecord=`${item.type}/${item.id}`;
   const ref=item.__path?doc(fs,...item.__path):doc(fs,'organizations',state.orgId,item.type,item.id);
   await deleteDoc(ref);
   completed++;
   await updateDoc(op,{completed,updatedAt:serverTimestamp()});
   setSync(`Excluindo obra… ${completed}/${total}`,'warn');
  }
  failedRecord=`works/${work.id}`;
  const b=writeBatch(fs);
  b.delete(doc(fs,'organizations',state.orgId,'works',work.id));
  b.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('work-purge-cascade','works',work.id,{workName:work.name,linkedDeleted:linked.length,byModule:linked.reduce((m,x)=>(m[x.type]=(m[x.type]||0)+1,m),{}),operationId:opId}));
  b.update(op,{status:'completed',completed:total,completedAt:serverTimestamp()});
  await b.commit();
 }catch(e){
  try{await updateDoc(op,{status:'failed',completed,error:String(e?.message||e),failedRecord,updatedAt:serverTimestamp()})}catch{}
  setSync('Exclusão interrompida','bad');
  throw Error(`A exclusão foi interrompida com ${completed}/${total} etapas concluídas no registro ${failedRecord}. A obra principal foi preservada; há registros vinculados já excluídos. Não repita a operação antes de avaliar este erro. ${friendly(e)}`);
 }
 const storageErrors=[];
 for(const path of storagePaths){try{await deleteObject(storageRef(storage,path))}catch(e){if(!String(e?.code||'').includes('object-not-found'))storageErrors.push(path)}}
 if(storageErrors.length){try{await updateDoc(op,{storageErrors,updatedAt:serverTimestamp()})}catch(e){console.warn('Anexos pendentes de saneamento:',e)}}
 setSync(storageErrors.length?'Exclusão concluída; revisar anexos':'Sincronizado',storageErrors.length?'warn':'ok');
}

async function audit(action,module,recordId,changes){try{await addDoc(collection(fs,'organizations',state.orgId,'audits'),auditPayload(action,module,recordId,changes));return true}catch(e){console.error('Falha ao registrar auditoria:',e);return false}}
function allAlerts(){const d=today(),a=[],includeDemo=!!state.filters.workId||localStorage.getItem('obratop-dashboard-include-demo')==='1',demoIds=new Set(state.data.works.filter(w=>w.demoCaixa42).map(w=>w.id)),scope=t=>filtered(t).filter(x=>includeDemo||!demoIds.has(x.workId));scope('activities').forEach(x=>{if(x.end&&x.end<d&&x.status!=='Concluída')a.push({level:'bad',title:'Atividade atrasada',text:x.name,date:x.end,route:'activities'})});scope('finance').forEach(x=>{if(x.dueDate&&x.dueDate<d&&!['Pago','Recebido'].includes(x.status))a.push({level:'bad',title:'Financeiro vencido',text:x.description,date:x.dueDate,route:'finance'})});scope('contracts').forEach(x=>{if(!x.end||x.status==='Encerrado')return;const n=days(x.end);if(n<0)a.push({level:'bad',title:'Contrato vencido',text:x.number,date:x.end,route:'contracts'});else if(n<=30)a.push({level:'warn',title:'Contrato próximo do fim',text:x.number,date:x.end,route:'contracts'})});scope('documents').forEach(x=>{if(!x.expiry)return;const n=days(x.expiry);if(n<0)a.push({level:'bad',title:'Documento vencido',text:x.name,date:x.expiry,route:'documents'});else if(n<=30)a.push({level:'warn',title:'Documento próximo do vencimento',text:x.name,date:x.expiry,route:'documents'})});scope('equipment').forEach(x=>{if(!x.nextMaintenance||x.status==='Manutenção')return;const n=days(x.nextMaintenance);if(n<0)a.push({level:'bad',title:'Manutenção atrasada',text:x.name,date:x.nextMaintenance,route:'equipment'});else if(n<=15)a.push({level:'warn',title:'Manutenção próxima',text:x.name,date:x.nextMaintenance,route:'equipment'})});scope('inventory').forEach(x=>{const z=stockInfo(x);if(['bad','warn'].includes(z.level)&&z.incoming>0&&z.suggestedQty<=0){a.push({level:'warn',title:'Reposição já pedida — acompanhar entrega',text:`${x.material}: ${z.incoming.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${x.unit||''} em pedidos abertos.`,date:x.date||d,route:'orders'});return}if(z.level==='bad')a.push({level:'bad',title:'Estoque crítico — ação imediata',text:`${x.material}: comprar ${z.suggestedQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${x.unit||''} (${money(z.suggestedCost)}). ${z.message}`,date:x.date||d,route:'inventory'});else if(z.level==='warn')a.push({level:'warn',title:'Ressuprimento necessário',text:`${x.material}: sugerido ${z.suggestedQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${x.unit||''} (${money(z.suggestedCost)}). ${z.message}`,date:x.date||d,route:'inventory'});else if(z.level==='over')a.push({level:'warn',title:'Estoque em excesso',text:`${x.material}: excesso ${z.excessQty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${x.unit||''} = ${money(z.excessValue)}. Suspender compra e avaliar remanejamento.`,date:x.date||d,route:'inventory'})});scope('quality').forEach(x=>{if(x.deadline&&x.deadline<d&&x.status!=='Resolvida')a.push({level:'bad',title:'Não conformidade vencida',text:x.issue,date:x.deadline,route:'quality'})});scope('contracts').forEach(x=>{if(x.status==='Encerrado')return;const b=calc.contractBalance(x,state.data.measurements||[]);if(!b.hasMeasurements)return;if(b.balance<0)a.push({level:'bad',title:'Contrato com saldo negativo',text:`${x.number}: medido ${money(b.measured)} acima do valor vigente ${money(b.current)} (já com aditivos).`,date:d,route:'contracts'});else if(b.percentLeft<10)a.push({level:'warn',title:'Saldo contratual baixo',text:`${x.number}: restam ${money(b.balance)} (${b.percentLeft.toFixed(0)}% do valor vigente).`,date:d,route:'contracts'})});if(isAdmin()){const t=state.org?.lastRestoreTest;if(!t)a.push({level:'warn',title:'Restauração nunca testada',text:'Teste a restauração de um ponto de restauração em Integridade e manutenção.',date:d,route:'maintenance'});else if(!t.ok)a.push({level:'bad',title:'Último teste de restauração falhou',text:t.error||'Verifique os pontos de restauração.',date:d,route:'maintenance'});else if(daysSince(t.at)>RESTORE_TEST_DAYS)a.push({level:'warn',title:'Restauração sem teste há mais de 30 dias',text:`Último teste em ${new Date(t.at).toLocaleDateString('pt-BR')}.`,date:d,route:'maintenance'})}{const cp=calc.cashProjection(scope('finance'),d,6);if(cp.firstNegative)a.push({level:'bad',title:'Fluxo de caixa projetado negativo',text:`Saldo projetado de ${money(cp.firstNegative.balance)} em ${cp.firstNegative.label} (saldo realizado hoje: ${money(cp.opening)}).`,date:d,route:'finance'})}return a.sort((x,y)=>(x.date||'').localeCompare(y.date||''))}
function days(x){if(!x)return 9999;return Math.ceil((new Date(x)-new Date(today()))/86400000)}
function updateAlertIndicator(){const indicator=$('#alertCount');if(!indicator)return;const count=allAlerts().length;indicator.textContent=count?String(count):'';{const bnb=$('#bnAlertCount');if(bnb)bnb.textContent=count?String(count):''}indicator.classList.toggle('has-alerts',count>0);indicator.classList.toggle('no-alerts',count===0);$('#alertsBtn').setAttribute('aria-label',count?`${count} alertas`:'Nenhum alerta')}
function renderAlerts(){const a=allAlerts();updateAlertIndicator();$('#content').innerHTML=head('Central de alertas','Prazos, vencimentos e situações críticas')+(a.length?`<div class="card">${a.map((x,i)=>`<div class="alert"><span class="badge ${x.level}">${esc(x.title)}</span><b class="alertText">${esc(x.text)}</b><span class="alertDate nw">${esc(dateBR(x.date))}</span><button class="btn small goAlert" data-i="${i}">Abrir módulo</button></div>`).join('')}</div>`:'<div class="card empty">Nenhuma pendência crítica.</div>');$$('.goAlert').forEach(b=>b.onclick=()=>route(a[+b.dataset.i].route))}
function renderReports(){const cards=[['Executivo da obra','Painel físico-financeiro consolidado','executive'],['Financeiro','Receitas, despesas, saldo e situação','finance'],['Medições','Medições e situação de faturamento','measurements'],['Orçamento','Itens, BDI e preço de venda','budgets'],['Cronograma','Atividades, responsáveis e atrasos','activities'],['Compras e estoque','Pedidos, materiais, níveis e ressuprimento','inventory'],['Curvas S e ABC','Materiais, pessoal, máquinas e equipamentos','resourcecurves'],['Qualidade e segurança','Pendências e planos de ação','quality'],['Contratos e documentos','Vigências, revisões e vencimentos','contracts'],['Pessoal e equipamentos','Alocação, custos e manutenção','staff']];const top=`<div class="module-actions"><a class="btn primary" href="ObraTop_Super_Planilha_Base.xlsx" download>▦ Baixar Super Planilha Base</a>${isAdmin()?'<button class="btn" id="bulkImport">⇩ Importar planilha completa</button><button class="btn backupBtn" id="backupExcel">💾 Backup profissional</button><button class="btn restoreBtn" id="restoreBackup">↺ Restaurar backup</button>':'<button class="btn backupBtn" id="backupExcel">💾 Backup profissional</button>'}</div>`;$('#content').innerHTML=head('Relatórios','Importe, exporte, proteja e restaure os dados do ObraTop',top)+`<div class="card backupHero" style="margin-bottom:16px"><div><div class="sectiontitle">Backup e Restauração Profissional</div><p class="muted">Backup com data/hora, IDs originais, dados da lixeira, checksum SHA-256 e resumo por módulo. A restauração valida o arquivo antes de gravar qualquer dado e, por padrão, nunca sobrescreve registros existentes.</p></div><div class="backupShield">🛡️ Integridade + proteção contra sobrescrita</div></div><div class="grid reportgrid">${cards.map(x=>`<div class="card reportcard"><div class="sectiontitle">${x[0]}</div><span class="muted">${x[1]}</span><div><button class="btn small exportAny" data-type="${x[2]}">Exportar Excel/Word/PDF/CSV</button></div></div>`).join('')}</div>`;if($('#bulkImport'))$('#bulkImport').onclick=()=>pickImportFile('all','excel');$('#backupExcel').onclick=()=>exportProfessionalBackup();if($('#restoreBackup'))$('#restoreBackup').onclick=pickProfessionalRestore;$$('.exportAny').forEach(b=>b.onclick=()=>openExportFormat(b.dataset.type))}
function reportTypes(t){return(({executive:MODULES,quality:['quality','safety'],contracts:['contracts','documents'],staff:['staff','equipment'],resourcecurves:['inventory','staff','equipment']})[t]||[t]).filter(canRead)}
function csvCell(v){let s=String(v??'');if(/^[\s\t\r\n]*[=+\-@]/.test(s))s="'"+s;return`"${s.replaceAll('"','""')}"`}
function exportReport(type){const rows=[];for(const t of reportTypes(type)){for(const x of filtered(t))rows.push({modulo:schemas[t]?.title||t,...Object.fromEntries(schemas[t].fields.filter(f=>f[2]!=='file').map(f=>[f[1],x[f[0]]]))})}if(!rows.length)return alert('Não há dados para exportar.');const keys=[...new Set(rows.flatMap(Object.keys))],csv=[keys.join(';'),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(';'))].join('\r\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`ObraTop_${type}_${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function printReport(type){const old=state.route;document.title=`ObraTop - ${type}`;armPrintHeader('Relatório '+reportTitle(type).replace(/^Relatório\s+/i,''));if(type==='executive')renderDashboard();else $('#content').innerHTML=head('Relatório '+type,'Gerado em '+new Date().toLocaleString('pt-BR'))+reportTypes(type).map(t=>`<section class="card" style="margin-bottom:16px"><div class="sectiontitle">${esc(schemas[t].title)}</div>${table(t,filtered(t))}</section>`).join('');setTimeout(()=>{window.print();document.title='ObraTop — Gestão de Obras e Contratos';state.route=old;render()},200)}
function renderMembers(){
 const admin=isAdmin(),works=state.data.works.filter(w=>!w.deleted),wn=id=>works.find(w=>w.id===id)?.name||'Não atribuída',stBadge=x=>x.status==='blocked'?'<span class="badge bad">Bloqueado</span>':x.status==='active'||!x.status?'<span class="badge ok">Ativo</span>':status(x.status);
 $('#content').innerHTML=head('Usuários e acessos','Cada Engº responsável lê, cria e edita a sua obra e o seu orçamento',`<div class="module-actions">${admin?'<button id="importMembers" class="btn">⇩ Importar usuários</button>':''}<button id="exportMembers" class="btn">⇧ Exportar usuários</button>${admin?'<button id="inviteBtn" class="btn primary">+ Novo usuário</button>':''}</div>`)+`<div class="card" style="margin-bottom:16px"><div class="sectiontitle">Política de acesso</div><p class="muted">Administrador geral: acesso total; cadastra, altera, bloqueia e exclui usuários. Engº responsável da obra: lê, cria e edita a obra e o orçamento que lhe foram atribuídos (cronograma, medições, compras etc. dessa obra), sem excluir. Gestor: lê e altera todas as obras, sem excluir, sem gerir equipe e sem backup. Financeiro: lê todas as obras e lança financeiro, medições, contratos, compras e orçamentos; vê salários. Consulta: lê só a obra atribuída. <b>Bloquear</b> suspende o acesso (pode ser reativado); <b>Excluir</b> retira o acesso por completo.</p></div><div class="tablewrap"><table><thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Obra / Engº responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.members.map(x=>`<tr data-id="${x.id}"><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${roleName(x.role)}</td><td>${['owner','manager','finance'].includes(x.role)?'<b>Todas as obras</b>':esc(wn(x.workId))+(works.find(w=>w.id===x.workId)?.engineerUid===x.id?' <span class="bbTag">Engº responsável</span>':'')}</td><td>${stBadge(x)}</td><td class="nw">${admin&&x.role!=='owner'&&x.id!==state.user.uid?`<button class="btn small editMember" data-id="${x.id}">Alterar</button> <button class="btn small blockMember" data-id="${x.id}" data-block="${x.status==='blocked'?'0':'1'}">${x.status==='blocked'?'Reativar':'Bloquear'}</button> <button class="btn small danger removeMember" data-id="${x.id}">Excluir usuário</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
 if($('#inviteBtn'))$('#inviteBtn').onclick=openInvite;if($('#importMembers'))$('#importMembers').onclick=()=>openImportFormat('members');if($('#exportMembers'))$('#exportMembers').onclick=()=>openExportFormat('members');
 $$('.editMember').forEach(b=>b.onclick=()=>openEditMember(b.dataset.id));$$('.blockMember').forEach(b=>b.onclick=()=>setMemberBlocked(b.dataset.id,b.dataset.block==='1'));$$('.removeMember').forEach(b=>b.onclick=()=>deleteMember(b.dataset.id))
}
function openInvite(){
 const works=state.data.works.filter(w=>!w.deleted),orgName=state.org?.name||'',t0=today(),t1=new Date(Date.now()+180*864e5).toISOString().slice(0,10);
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>Incluir novo usuário</h2><p class="muted">O usuário entra pelo link do convite e já fica vinculado à sua obra como <b>Engº responsável pela obra e pelo orçamento</b>: ele lê, cria e edita os dados da sua obra (orçamento, cronograma, medições…). A exclusão continua exclusiva do Administrador geral.</p>
 <form id="inviteForm"><div class="formgrid"><div class="field"><label>Nome do Engº responsável</label><input name="engName" required maxlength="120" placeholder="ex.: Eng. Civil João da Silva"></div><div class="field"><label>E-mail</label><input name="email" type="email" required></div>
 <div class="field"><label>Perfil</label><select name="role"><option value="project_user">Engº responsável da obra (lê, cria e edita a sua obra)</option><option value="viewer">Consulta (somente leitura) — exige as regras novas</option><option value="manager">Gestor (todas as obras) — exige as regras novas</option><option value="finance">Financeiro (todas as obras) — exige as regras novas</option></select></div></div>
 <div id="invWorkBox"><div class="field"><label class="bbChk"><input type="radio" name="workMode" value="new" ${works.length?'':'checked'} ${works.length?'':'disabled'}> Criar agora a obra deste usuário</label><label class="bbChk"><input type="radio" name="workMode" value="new" checked> Criar agora a obra deste usuário</label></div></div>
 <div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button class="btn primary">Gerar convite automático</button></div></form></div></div>`;
 // monta o bloco da obra (nova ou existente)
 const box=$('#invWorkBox');box.innerHTML=`<div class="field"><label class="bbChk"><input type="radio" name="workMode" value="new" checked> Criar agora a obra deste usuário</label>${works.length?'<label class="bbChk"><input type="radio" name="workMode" value="existing"> Vincular a uma obra já cadastrada</label>':''}</div>
 <div id="invNew" class="formgrid"><div class="field full"><label>Nome da obra</label><input name="wName" maxlength="180" placeholder="ex.: Reforma da UBS Jardim das Acácias"></div><div class="field"><label>Cliente</label><input name="wClient" maxlength="120" value="${esc(orgName)}"></div><div class="field"><label>Início</label><input name="wStart" type="date" value="${t0}"></div><div class="field"><label>Término previsto</label><input name="wEnd" type="date" value="${t1}"></div></div>
 <div id="invExisting" class="field hidden"><label>Obra existente</label><select name="workId"><option value="">Selecione</option>${works.map(w=>`<option value="${w.id}">${esc(w.name)}${w.engineerUid?' (já tem Engº responsável)':''}</option>`).join('')}</select></div>`;
 const f=()=>$('#inviteForm'),sync=()=>{const all=['manager','finance'].includes(f().role.value),mode=f().workMode.value||[...f().querySelectorAll('[name=workMode]')].find(x=>x.checked)?.value;box.classList.toggle('hidden',all);$('#invNew').classList.toggle('hidden',mode!=='new');$('#invExisting').classList.toggle('hidden',mode!=='existing')};
 $('#cancelModal').onclick=closeModal;f().role.onchange=sync;f().querySelectorAll('[name=workMode]').forEach(x=>x.onchange=sync);sync();
 f().onsubmit=async e=>{e.preventDefault();try{const fd=new FormData(e.target),role=['viewer','manager','finance'].includes(fd.get('role'))?fd.get('role'):'project_user',all=['manager','finance'].includes(role),mode=fd.get('workMode'),email=fd.get('email').toLowerCase().trim(),engName=fd.get('engName').trim();let workId='';
  if(!all){if(mode==='existing'){workId=fd.get('workId')||'';if(!workId)return alert('Escolha a obra do usuário.')}else{const wn=(fd.get('wName')||'').trim();if(!wn)return alert('Informe o nome da obra deste usuário.');if(fd.get('wEnd')<fd.get('wStart'))return alert('O término previsto deve ser depois do início.');
    const ref=doc(collection(fs,'organizations',state.orgId,'works')),now=serverTimestamp();await setDoc(ref,{name:wn,client:(fd.get('wClient')||'').trim()||orgName,address:'',start:fd.get('wStart'),end:fd.get('wEnd'),value:0,status:'Planejamento',progress:0,engineer:engName,engineerEmail:email,engineerUid:'',createdAt:now,createdBy:state.user.uid,updatedAt:now,updatedBy:state.user.uid,deleted:false});workId=ref.id;await addDoc(collection(fs,'organizations',state.orgId,'audits'),auditPayload('create','works',workId,{origem:'Novo usuário',engenheiro:engName}))}}
  const code=crypto.randomUUID();await setDoc(doc(fs,'invites',code),{orgId:state.orgId,email,role,workId,engineerName:engName,createdBy:state.user.uid,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)});
  const link=`${location.origin}${location.pathname}?invite=${encodeURIComponent(code)}`;closeModal();await navigator.clipboard?.writeText(link).catch(()=>{});prompt(`Convite criado${all?'':' e vinculado à obra'}. O link foi copiado quando permitido. Envie ao novo usuário (válido por 7 dias):`,link)}catch(x){alert(friendly(x))}}
}
function openEditMember(id){
 const m=state.members.find(x=>x.id===id);if(!m||!isAdmin()||m.role==='owner')return;const works=state.data.works.filter(w=>!w.deleted),linked=works.find(w=>w.engineerUid===m.id);
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>Alterar usuário</h2><p class="muted">${esc(m.email)}</p><form id="editMemberForm"><div class="formgrid"><div class="field"><label>Nome</label><input name="name" required maxlength="120" value="${esc(m.name||'')}"></div>
 <div class="field"><label>Perfil</label><select name="role">${['project_user','viewer','manager','finance'].map(r=>`<option value="${r}" ${r===m.role?'selected':''}>${roleName(r)}${r==='project_user'?'':' — exige as regras novas'}</option>`).join('')}</select></div>
 <div class="field"><label>Obra atribuída</label><select name="workId"><option value="">Selecione</option>${works.map(w=>`<option value="${w.id}" ${w.id===m.workId?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div></div>
 <label class="bbChk"><input type="checkbox" name="eng" ${linked||m.role==='project_user'?'checked':''}> Vincular como <b>Engº responsável</b> da obra atribuída (nome e e-mail aparecem no orçamento e nos relatórios)</label>
 <div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button class="btn primary">Salvar alterações</button></div></form></div></div>`;
 $('#cancelModal').onclick=closeModal;
 $('#editMemberForm').onsubmit=async e=>{e.preventDefault();try{const fd=new FormData(e.target),role=fd.get('role'),all=['manager','finance'].includes(role),workId=all?'':(fd.get('workId')||''),name=fd.get('name').trim();if(!all&&!workId)return alert('Atribua uma obra a este usuário.');
  const bt=writeBatch(fs),now=serverTimestamp(),u=state.user.uid;bt.update(doc(fs,'organizations',state.orgId,'members',m.id),{name,role,workId,updatedAt:now,updatedBy:u});
  for(const w of works)if(w.engineerUid===m.id&&(w.id!==workId||!fd.get('eng')))bt.update(doc(fs,'organizations',state.orgId,'works',w.id),{engineerUid:'',engineerEmail:'',updatedAt:now,updatedBy:u});
  if(fd.get('eng')&&workId)bt.update(doc(fs,'organizations',state.orgId,'works',workId),{engineer:name,engineerUid:m.id,engineerEmail:m.email,updatedAt:now,updatedBy:u});
  bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('member-edit','members',m.id,{nome:name,perfil:role,obra:workId,engenheiro:!!fd.get('eng')}));await bt.commit();closeModal();toast('Usuário atualizado.')}catch(x){alert(friendly(x)+(String(x?.code||'').includes('permission')?'\nSe você mudou o perfil para Gestor, Financeiro ou Consulta, publique antes as regras novas do Firestore (pasta regras-propostas).':''))}}
}
async function setMemberBlocked(id,block){
 const m=state.members.find(x=>x.id===id);if(!m||!isAdmin()||m.role==='owner'||m.id===state.user.uid)return;
 if(!confirm(block?`Bloquear o acesso de ${m.name||m.email}? Ele não conseguirá entrar nem ver nenhum dado até você reativar.`:`Reativar o acesso de ${m.name||m.email}?`))return;
 try{const bt=writeBatch(fs),now=serverTimestamp();bt.update(doc(fs,'organizations',state.orgId,'members',id),{status:block?'blocked':'active',updatedAt:now,updatedBy:state.user.uid});bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload(block?'member-block':'member-unblock','members',id,{email:m.email}));await bt.commit();toast(block?'Acesso bloqueado.':'Acesso reativado.')}catch(e){alert(friendly(e)+(block?'\nSe o bloqueio não for aceito para este perfil, use “Excluir usuário”, que retira o acesso por completo.':''))}
}
async function deleteMember(id){
 const m=state.members.find(x=>x.id===id);if(!m||!isAdmin()||m.role==='owner'||m.id===state.user.uid)return;
 if(!confirm(`EXCLUIR ${m.name||m.email}?\n\nO usuário perde todo o acesso ao ObraTop (não consegue mais entrar nem ver dados da empresa). Os registros que ele lançou continuam na obra. Esta ação não pode ser desfeita (para dar acesso de novo será preciso um novo convite).`))return;
 try{const bt=writeBatch(fs),now=serverTimestamp(),u=state.user.uid;bt.delete(doc(fs,'organizations',state.orgId,'members',id));
  for(const w of state.data.works.filter(x=>x.engineerUid===id))bt.update(doc(fs,'organizations',state.orgId,'works',w.id),{engineerUid:'',engineerEmail:'',updatedAt:now,updatedBy:u});
  bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('member-remove','members',id,{email:m.email,perfil:m.role,obra:m.workId||''}));await bt.commit();
  if(m.inviteCode){try{await deleteDoc(doc(fs,'invites',m.inviteCode))}catch{}}toast('Usuário excluído: acesso totalmente removido.')}catch(e){alert(friendly(e))}
}

const SHEET_TYPES={OBRAS:'works',MEDICOES:'measurements','MEDIÇÕES':'measurements',ORCAMENTO:'budgets','ORÇAMENTO':'budgets',CRONOGRAMA:'activities',FORNECEDORES:'suppliers',COMPRAS:'orders',ESTOQUE:'inventory',MATERIAIS:'inventory',FINANCEIRO:'finance',QUALIDADE:'quality',CONTRATOS:'contracts',PESSOAL:'staff',EQUIPAMENTOS:'equipment',SEGURANCA:'safety','SEGURANÇA':'safety',DOCUMENTOS:'documents',EQUIPE_USUARIOS:'members','EQUIPE USUARIOS':'members','EQUIPE/USUARIOS':'members'};
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ')}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function fileSafe(s){return String(s||'dados').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'dados'}
function workName(id){return state.data.works.find(w=>w.id===id)?.name||id||''}
function supplierName(id){return state.data.suppliers.find(w=>w.id===id)?.name||id||''}
const REPORT_TITLES={executive:'Relatório executivo',resourcecurves:'Curvas S e ABC',members:'Usuários e acessos',audit:'Auditoria'};
function reportTitle(type){return schemas[type]?.title||REPORT_TITLES[type]||type}
function engineerOf(w){return String((w&&w.engineer)||(state.org&&state.org.defaultEngineer)||'').trim()}
function exportRows(type){if(type==='members')return state.members.map(x=>({'Nome':x.name||'','E-mail':x.email||'','Perfil':roleName(x.role),'Obra atribuída':x.role==='owner'?'Todas as obras':workName(x.workId),'Status':x.status||''}));if(type==='audit')return state.audits.map(x=>({'Data/Hora':stamp(x.at),'Usuário':x.userEmail||'','Ação':x.action||'','Módulo':schemas[x.module]?.title||x.module||'','Registro':x.recordId||''}));const types=reportTypes(type);const rows=[];for(const t of types){for(const x of filtered(t)){const r={};if(types.length>1)r['Módulo']=schemas[t]?.title||t;for(const f of schemas[t].fields){if(f[2]==='file')continue;let v=x[f[0]]??'';if(f[2]==='work')v=workName(v);if(f[2]==='supplier')v=supplierName(v);if(REF_TYPES[f[2]]){const o=(state.data[REF_TYPES[f[2]]]||[]).find(w=>w.id===v);v=o?refLabel(REF_TYPES[f[2]],o):''}if(f[0]==='salary'&&!canSeeSalary())v='';if(['value','unitValue','salary','monthlyCost'].includes(f[0])&&!(f[0]==='salary'&&!canSeeSalary()))v=money(v);r[f[1]]=v}if(type==='executive'){const w=t==='works'?x:(state.data.works||[]).find(o=>o.id===x.workId);delete r['Obra'];r['Engº Responsável']=engineerOf(w)}rows.push(r)}}return rows}
function openExportFormat(type){$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>Exportar arquivo</h2><p class="muted">Escolha o formato desejado para ${esc(type==='members'?'Usuários e acessos':schemas[type]?.title||'relatório')}.</p><div class="formatgrid"><button class="btn primary fmt" data-fmt="excel">Excel (.xlsx)</button><button class="btn fmt" data-fmt="word">Word (.doc)</button><button class="btn fmt" data-fmt="pdf">PDF (.pdf)</button><button class="btn fmt" data-fmt="csv">CSV (.csv)</button></div><div class="actions"><button class="btn" id="cancelModal">Cancelar</button></div></div></div>`;$('#cancelModal').onclick=closeModal;$$('.fmt').forEach(b=>b.onclick=()=>{closeModal();exportFormat(type,b.dataset.fmt)})}
function exportFormat(type,fmt){if(fmt==='excel')return exportExcel(type);if(fmt==='csv')return exportCsv(type);if(fmt==='word')return exportWord(type);if(fmt==='pdf')return exportPdf(type)}
function exportCsv(type){const rows=exportRows(type);if(!rows.length)return alert('Não há dados para exportar.');const keys=[...new Set(rows.flatMap(Object.keys))],csv=[keys.map(csvCell).join(';'),...rows.map(r=>keys.map(k=>csvCell(r[k])).join(';'))].join('\r\n');downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`ObraTop_${fileSafe(type)}_${today()}.csv`)}
function exportExcel(type){if(!window.XLSX)return alert('Biblioteca Excel não carregada. Verifique a conexão com a internet.');const rows=exportRows(type);if(!rows.length)return alert('Não há dados para exportar.');const wb=window.XLSX.utils.book_new(),ws=window.XLSX.utils.json_to_sheet(rows);window.XLSX.utils.book_append_sheet(wb,ws,reportTitle(type).slice(0,31));window.XLSX.writeFile(wb,`ObraTop_${fileSafe(type)}_${today()}.xlsx`)}
function backupSerializable(v){
 if(v===null||v===undefined)return v??null;
 if(v instanceof Timestamp)return{__obratopType:'timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds};
 if(v instanceof Date)return{__obratopType:'date',iso:v.toISOString()};
 if(Array.isArray(v))return v.map(backupSerializable);
 if(typeof v==='object'){const o={};for(const[k,x]of Object.entries(v)){if(k==='id')continue;o[k]=backupSerializable(x)}return o}
 return v
}
function backupRevive(v){
 if(!v||typeof v!=='object')return v;
 if(v.__obratopType==='timestamp')return new Timestamp(Number(v.seconds)||0,Number(v.nanoseconds)||0);
 if(v.__obratopType==='date')return new Date(v.iso);
 if(Array.isArray(v))return v.map(backupRevive);
 const o={};for(const[k,x]of Object.entries(v))o[k]=backupRevive(x);return o
}
function backupDateTimeFile(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`}
function backupChunks(id,obj){const txt=JSON.stringify(backupSerializable(obj)),size=28000,total=Math.max(1,Math.ceil(txt.length/size)),rows=[];for(let i=0;i<total;i++)rows.push({ID:id,PARTE:i+1,TOTAL_PARTES:total,DADOS:txt.slice(i*size,(i+1)*size)});return rows}
function backupUnchunk(rows){const groups=new Map();for(const r of rows){const id=String(r.ID??'').trim();if(!id)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push({part:Number(r.PARTE)||1,total:Number(r.TOTAL_PARTES)||1,data:String(r.DADOS??'')})}const out=[];for(const[id,parts]of groups){parts.sort((a,b)=>a.part-b.part);const total=parts[0]?.total||parts.length;if(parts.length!==total||parts.some((x,i)=>x.part!==i+1))throw Error(`Backup corrompido: partes incompletas do registro ${id}.`);out.push({id,data:backupRevive(JSON.parse(parts.map(x=>x.data).join('')))})}return out}
async function sha256Text(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function canonicalBackupPayload(payload){const modules={};for(const t of Object.keys(payload.modules).sort())modules[t]=payload.modules[t].slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>({id:x.id,data:backupSerializable(x.data)}));const core={format:payload.format,schemaVersion:payload.schemaVersion,orgId:payload.orgId,modules,members:payload.members.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>({id:x.id,data:backupSerializable(x.data)})),audits:payload.audits.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>({id:x.id,data:backupSerializable(x.data)}))};if(Number(payload.schemaVersion)>=2)core.snapshots=(payload.snapshots||[]).slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>({id:x.id,data:backupSerializable(x.data)}));if(Number(payload.schemaVersion)>=3)core.engineering=(payload.engineering||[]).slice().sort((a,b)=>a.id.localeCompare(b.id)).map(p=>({id:p.id,data:backupSerializable(p.data),takeoffs:(p.takeoffs||[]).slice().sort((a,b)=>a.id.localeCompare(b.id)).map(t=>({id:t.id,data:backupSerializable(t.data)}))}));return JSON.stringify(core)}
async function buildProfessionalBackup(){
 const modules={};for(const t of MODULES)modules[t]=(state.data[t]||[]).map(x=>({id:x.id,data:x}));
 let audits=state.audits.map(x=>({id:x.id,data:x}));
 try{const snap=await getDocs(collection(fs,'organizations',state.orgId,'audits'));audits=snap.docs.map(d=>({id:d.id,data:{id:d.id,...d.data()}}))}catch(e){console.warn('Backup: auditoria completa indisponível; usando cache atual.',e)}
 let engineering=[];try{engineering=engineeringArchiveSerializable(await loadEngineeringArchive())}catch(e){console.warn('Backup: Engenharia Inteligente indisponível.',e);throw Error('Não foi possível incluir a Engenharia Inteligente no backup. Operação cancelada para evitar backup incompleto.')}
 return{format:'OBRATOP_PRO_BACKUP',schemaVersion:3,release:RELEASE,createdAt:new Date().toISOString(),orgId:state.orgId,orgName:state.org?.name||'ObraTop',createdBy:state.user?.email||'',modules,snapshots:(state.snapshots||[]).map(x=>({id:x.id,data:x})),members:state.members.map(x=>({id:x.id,data:x})),audits,engineering}
}
async function exportProfessionalBackup(){
 if(!isAdmin())return alert('Somente o Proprietário/Administrador pode gerar o backup profissional.');
 if(!window.XLSX)return alert('Biblioteca Excel não carregada.');
 try{
  setSync('Gerando backup…','warn');
  const payload=await buildProfessionalBackup(),checksum=await sha256Text(canonicalBackupPayload(payload)),wb=window.XLSX.utils.book_new();
  const counts=Object.entries(payload.modules).map(([t,a])=>({Módulo:schemas[t]?.title||t,Chave:t,Registros:a.length}));
  counts.push({Módulo:'Histórico Curva S',Chave:'progressSnapshots',Registros:payload.snapshots.length},{Módulo:'Engenharia Inteligente — Projetos',Chave:'engineeringProjects',Registros:(payload.engineering||[]).length},{Módulo:'Engenharia Inteligente — Quantitativos',Chave:'engineeringTakeoffs',Registros:(payload.engineering||[]).reduce((n,p)=>n+(p.takeoffs||[]).length,0)},{Módulo:'Equipe/Usuários (arquivo)',Chave:'members',Registros:payload.members.length},{Módulo:'Auditoria (arquivo)',Chave:'audits',Registros:payload.audits.length});
  const total=counts.reduce((s,x)=>s+x.Registros,0);
  const info=[
   {Campo:'Formato',Valor:payload.format},{Campo:'Versão do backup',Valor:payload.schemaVersion},{Campo:'Release ObraTop',Valor:payload.release},
   {Campo:'Data/Hora ISO',Valor:payload.createdAt},{Campo:'Organização',Valor:payload.orgName},{Campo:'ID da organização',Valor:payload.orgId},
   {Campo:'Gerado por',Valor:payload.createdBy},{Campo:'Total de registros',Valor:total},{Campo:'SHA-256',Valor:checksum},
   {Campo:'Restauração padrão',Valor:'SEGURA — adiciona somente registros ausentes; não sobrescreve dados existentes.'},
   {Campo:'Observação',Valor:'Usuários e auditoria são preservados para consulta; restauração operacional não altera contas nem trilha de auditoria. Os metadados e caminhos dos anexos são preservados; arquivos binários do Storage não são incorporados ao Excel.'}
  ];
  window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(info),'BACKUP_INFO');
  window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(counts),'BACKUP_RESUMO');
  for(const t of MODULES){const readable=exportRows(t);if(readable.length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(readable),(schemas[t]?.title||t).slice(0,31));const raw=payload.modules[t].flatMap(x=>backupChunks(x.id,x.data));window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(raw),`SYS_${t}`.slice(0,31))}
  if(payload.snapshots.length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(payload.snapshots.flatMap(x=>backupChunks(x.id,x.data))),'SYS_progressSnapshots');
  if(state.members.length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(exportRows('members')),'Equipe_Usuarios');
  if(payload.audits.length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(payload.audits.flatMap(x=>backupChunks(x.id,x.data))),'SYS_audits');
  if(payload.members.length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(payload.members.flatMap(x=>backupChunks(x.id,x.data))),'SYS_members');if((payload.engineering||[]).length)window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(payload.engineering.flatMap(x=>backupChunks(x.id,x))),'SYS_engineering');
  window.XLSX.writeFile(wb,`ObraTop_Backup_Profissional_${backupDateTimeFile()}.xlsx`);
  await audit('professional-backup','backup','export',{checksum,total,createdAt:payload.createdAt});
  localStorage.setItem('obratop-last-backup',JSON.stringify({at:payload.createdAt,total,checksum,release:RELEASE}));
  setSync('Sincronizado','ok');toast('Backup profissional gerado com data/hora e validação SHA-256.');if(state.route==='maintenance')render();return true
 }catch(e){console.error(e);setSync('Falha no backup','bad');alert('Não foi possível gerar o backup: '+friendly(e));return false}
}
function exportAllExcel(){return exportProfessionalBackup()}
function pickProfessionalRestore(){if(!isAdmin())return alert('Somente o Proprietário/Administrador pode restaurar backups.');const input=document.createElement('input');input.type='file';input.accept='.xlsx';input.onchange=()=>input.files?.[0]&&validateProfessionalRestore(input.files[0]);input.click()}
async function validateProfessionalRestore(file){
 if(!window.XLSX)return alert('Biblioteca Excel não carregada.');
 try{
  setSync('Validando backup…','warn');const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  if(!wb.Sheets.BACKUP_INFO)throw Error('Este arquivo não contém a identificação BACKUP_INFO do backup profissional.');
  const infoRows=window.XLSX.utils.sheet_to_json(wb.Sheets.BACKUP_INFO,{defval:''}),info=Object.fromEntries(infoRows.map(r=>[String(r.Campo),String(r.Valor)]));
  if(info['Formato']!=='OBRATOP_PRO_BACKUP')throw Error('Formato de backup inválido.');
  const backupVersion=Number(info['Versão do backup']);if(![1,2,3].includes(backupVersion))throw Error('Versão de backup não suportada.');
  if(info['ID da organização']!==state.orgId)throw Error(`Este backup pertence à organização ${info['ID da organização']||'desconhecida'}, não à organização atual.`);
  const modules={};for(const t of MODULES){const sh=wb.Sheets[`SYS_${t}`];modules[t]=sh?backupUnchunk(window.XLSX.utils.sheet_to_json(sh,{defval:''})):[]}
  const snapshots=wb.Sheets.SYS_progressSnapshots?backupUnchunk(window.XLSX.utils.sheet_to_json(wb.Sheets.SYS_progressSnapshots,{defval:''})):[];
  const members=wb.Sheets.SYS_members?backupUnchunk(window.XLSX.utils.sheet_to_json(wb.Sheets.SYS_members,{defval:''})):[];
  const audits=wb.Sheets.SYS_audits?backupUnchunk(window.XLSX.utils.sheet_to_json(wb.Sheets.SYS_audits,{defval:''})):[];
  const engineering=backupVersion>=3&&wb.Sheets.SYS_engineering?backupUnchunk(window.XLSX.utils.sheet_to_json(wb.Sheets.SYS_engineering,{defval:''})).map(x=>x.data):[];
  const payload={format:'OBRATOP_PRO_BACKUP',schemaVersion:backupVersion,orgId:state.orgId,modules,snapshots,members,audits,engineering},computed=await sha256Text(canonicalBackupPayload(payload)),expected=String(info['SHA-256']||'').toLowerCase();
  if(!expected||computed!==expected)throw Error('Falha de integridade: o SHA-256 do arquivo não confere. O backup pode ter sido alterado ou corrompido.');
  const comparison=[];let missing=0,conflicts=0,same=0;
  for(const t of MODULES){const current=new Map((state.data[t]||[]).map(x=>[x.id,JSON.stringify(backupSerializable(x))]));let m=0,c=0,s=0;for(const x of modules[t]){const cur=current.get(x.id);if(cur===undefined){m++;missing++}else if(cur===JSON.stringify(backupSerializable(x.data))){s++;same++}else{c++;conflicts++}}comparison.push({type:t,backup:modules[t].length,missing:m,same:s,conflicts:c})}if(snapshots.length){const current=new Map((state.snapshots||[]).map(x=>[x.id,JSON.stringify(backupSerializable(x))]));let m=0,c=0,s=0;for(const x of snapshots){const cur=current.get(x.id);if(cur===undefined){m++;missing++}else if(cur===JSON.stringify(backupSerializable(x.data))){s++;same++}else{c++;conflicts++}}comparison.push({type:'progressSnapshots',backup:snapshots.length,missing:m,same:s,conflicts:c})}if(backupVersion>=3){const currentArchive=engineeringArchiveSerializable(await loadEngineeringArchive()),cur=new Map(engineeringFlatRows(currentArchive).map(x=>[x.id,JSON.stringify(backupSerializable(x.data))])),bak=new Map(engineeringFlatRows(engineering).map(x=>[x.id,JSON.stringify(backupSerializable(x.data))]));let m=0,c=0,sm=0;for(const[id,data]of bak){const cv=cur.get(id);if(cv===undefined){m++;missing++}else if(cv===data){sm++;same++}else{c++;conflicts++}}comparison.push({type:'engineeringProjects',backup:bak.size,missing:m,same:sm,conflicts:c})}
  setSync('Backup validado','ok');openRestorePreview({file,info,payload,computed,comparison,missing,conflicts,same})
 }catch(e){console.error(e);setSync('Falha na validação','bad');alert('Backup rejeitado:\n\n'+friendly(e))}
}
function openRestorePreview(ctx){
 const rows=ctx.comparison.filter(x=>x.backup).map(x=>`<tr><td>${esc(x.type==='progressSnapshots'?'Histórico Curva S':x.type==='engineeringProjects'?'Engenharia Inteligente':(schemas[x.type]?.title||x.type))}</td><td>${x.backup}</td><td class="oktext">${x.missing}</td><td>${x.same}</td><td class="dangertext">${x.conflicts}</td></tr>`).join('');
 const fullyCompatible=ctx.missing===0&&ctx.conflicts===0;
 const safeBlock=fullyCompatible
  ?`<div class="backupNoAction"><div class="backupNoActionTitle">✓ Backup 100% compatível — nenhuma restauração necessária</div><p>Todos os registros comparáveis deste backup já existem no ObraTop e estão idênticos. Nenhum dado será gravado ou alterado.</p></div>`
  :`<div class="restoreSafe"><b>Modo seguro recomendado</b><p>Adiciona somente IDs que não existem atualmente. Nenhum registro existente será alterado.</p><label><input type="checkbox" id="restoreAck"> Entendo que a restauração será registrada na auditoria.</label><div class="field"><label>Para liberar a restauração, digite <b>RESTAURAR BACKUP</b></label><input id="restorePhrase" autocomplete="off" placeholder="RESTAURAR BACKUP"></div></div>`;
 const dangerBlock=!fullyCompatible&&ctx.conflicts?`<details class="dangerZone"><summary>Opção avançada: sobrescrever ${ctx.conflicts} conflito(s)</summary><p>Use somente para recuperação de desastre. Antes da sobrescrita, o ObraTop baixa automaticamente um backup do estado atual.</p><label><input type="checkbox" id="overwriteMode"> Permitir sobrescrita de registros existentes</label><div class="field"><label>Digite <b>SOBRESCREVER DADOS</b></label><input id="overwritePhrase" autocomplete="off"></div></details>`:'';
 const actionButton=fullyCompatible?`<button class="btn ok" id="restoreNow" disabled>Nenhuma restauração necessária</button>`:`<button class="btn primary" id="restoreNow" disabled>Restaurar com segurança</button>`;
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog backupDialog"><h2>Validar e restaurar backup</h2><div class="backupValid">✓ Integridade SHA-256 validada</div><p><b>Backup:</b> ${esc(ctx.file.name)}<br><b>Data/Hora:</b> ${esc(ctx.info['Data/Hora ISO']||'—')}<br><b>Organização:</b> ${esc(ctx.info['Organização']||'ObraTop')}<br><b>Checksum:</b> <code>${esc(ctx.computed.slice(0,16))}…</code></p><div class="backupStats"><span>Ausentes <b>${ctx.missing}</b></span><span>Idênticos <b>${ctx.same}</b></span><span>Conflitos <b>${ctx.conflicts}</b></span></div><div class="tablewrap backupPreview"><table><thead><tr><th>Módulo</th><th>Backup</th><th>Ausentes</th><th>Idênticos</th><th>Conflitos</th></tr></thead><tbody>${rows}</tbody></table></div>${safeBlock}${dangerBlock}<div class="actions"><button class="btn" id="cancelModal">${fullyCompatible?'Fechar':'Cancelar'}</button>${actionButton}</div></div></div>`;
 $('#cancelModal').onclick=closeModal;
 if(fullyCompatible)return;
 const ack=$('#restoreAck'),phrase=$('#restorePhrase'),over=$('#overwriteMode'),overPhrase=$('#overwritePhrase'),btn=$('#restoreNow');
 const check=()=>{const safe=ack.checked&&phrase.value.trim()==='RESTAURAR BACKUP',danger=over?.checked===true;if(danger){btn.disabled=!(safe&&overPhrase?.value.trim()==='SOBRESCREVER DADOS');btn.textContent='Backup atual + sobrescrever conflitos'}else{btn.disabled=!safe;btn.textContent='Restaurar com segurança'}};[ack,phrase,over,overPhrase].filter(Boolean).forEach(x=>x.addEventListener('input',check));
 btn.onclick=()=>performProfessionalRestore(ctx,over?.checked===true)
}
async function performProfessionalRestore(ctx,overwrite=false){
 if(!isAdmin())return alert('Permissão insuficiente.');
 if(overwrite){const final=confirm('CONFIRMAÇÃO FINAL: registros conflitantes serão sobrescritos. O ObraTop baixará um backup do estado atual antes de continuar. Prosseguir?');if(!final)return;await exportProfessionalBackup();await new Promise(r=>setTimeout(r,600))}
 closeModal();setSync('Preparando restauração…','warn');const opRef=operationRef();let completed=0;
 try{
  let created=0,updated=0,skipped=0;const ops=[];
  for(const t of MODULES){const existing=new Map((state.data[t]||[]).map(x=>[x.id,x]));for(const item of ctx.payload.modules[t]){if(existing.has(item.id)&&!overwrite){skipped++;continue}ops.push({type:t,id:item.id,data:item.data,exists:existing.has(item.id)})}}
  if((ctx.payload.snapshots||[]).length){const existing=new Map((state.snapshots||[]).map(x=>[x.id,x]));for(const item of ctx.payload.snapshots){if(existing.has(item.id)&&!overwrite){skipped++;continue}ops.push({type:'progressSnapshots',id:item.id,data:item.data,exists:existing.has(item.id)})}}if((ctx.payload.engineering||[]).length){const cur=engineeringFlatRows(await loadEngineeringArchive()),existing=new Map(cur.map(x=>[x.id,x]));for(const item of engineeringFlatRows(ctx.payload.engineering)){const old=existing.get(item.id);if(old&&!overwrite){skipped++;continue}ops.push({type:'engineeringProjects',id:item.id,data:item.data,exists:!!old,path:item.path})}}
  await setDoc(opRef,{kind:'professional-restore',status:'running',source:ctx.file.name,checksum:ctx.computed,mode:overwrite?'overwrite':'safe',total:ops.length,completed:0,createdBy:state.user.uid,createdAt:serverTimestamp(),release:RELEASE});
  for(let i=0;i<ops.length;i+=350){const batch=writeBatch(fs),chunk=ops.slice(i,i+350);for(const op of chunk)batch.set(op.path?doc(fs,...op.path):doc(fs,'organizations',state.orgId,op.type,op.id),backupRevive(backupSerializable(op.data)),{merge:false});batch.update(opRef,{completed:completed+chunk.length,updatedAt:serverTimestamp()});await batch.commit();for(const op of chunk){if(op.exists)updated++;else created++}completed+=chunk.length;setSync(`Restaurando… ${completed}/${ops.length}`,'warn')}
  const b=writeBatch(fs);b.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('professional-restore','backup','restore',{source:ctx.file.name,checksum:ctx.computed,mode:overwrite?'overwrite':'safe',created,updated,skipped,operationId:opRef.id}));b.update(opRef,{status:'completed',completed:ops.length,completedAt:serverTimestamp()});await b.commit();
  setSync('Sincronizado','ok');scheduleSnapshotCapture();alert(`Restauração concluída.\n\nCriados: ${created}\nSobrescritos: ${updated}\nPreservados/ignorados: ${skipped}\nFalhas: 0`)
 }catch(e){console.error(e);try{await updateDoc(opRef,{status:'failed',completed,error:String(e?.message||e),updatedAt:serverTimestamp()})}catch{}setSync('Restauração interrompida','bad');alert(`A restauração foi interrompida após ${completed} registro(s). A operação ficou registrada e pode ser repetida com segurança: registros já aplicados serão reconhecidos na nova validação.\n\n${friendly(e)}`)}
}

function payload64(obj){const b=new TextEncoder().encode(JSON.stringify(obj));let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)}
function payloadFrom64(s){const bin=atob(s),b=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(b))}
function exportWord(type){const rows=exportRows(type);if(!rows.length)return alert('Não há dados para exportar.');const keys=[...new Set(rows.flatMap(Object.keys))],payload=payload64({obratop:true,version:RELEASE,type,rows}),table=`<table border="1" cellspacing="0" cellpadding="5"><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`,html=`<!doctype html><html><head><meta charset="utf-8"><title>ObraTop</title></head><body>${wordHeaderHtml()}<h1>ObraTop - ${esc(reportTitle(type))}</h1><p>Exportado em ${new Date().toLocaleString('pt-BR')}</p>${table}<!--OBRATOP_DATA_BASE64:${payload}--></body></html>`;downloadBlob(new Blob(['\ufeff'+html],{type:'application/msword'}),`ObraTop_${fileSafe(type)}_${today()}.doc`)}
function exportPdf(type){const rows=exportRows(type);if(!rows.length)return alert('Não há dados para exportar.');if(!window.jspdf?.jsPDF)return alert('Biblioteca PDF não carregada. Verifique a conexão com a internet.');const {jsPDF}=window.jspdf,docPdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),lg=orgLogo(),wn=state.filters.workId?workName(state.filters.workId):'Todas as obras';brand.buildTablePdf(docPdf,{title:reportTitle(type),subtitle:`${wn} • ${rows.length} registro(s)`,orgName:companyInfo().name,cnpj:companyInfo().cnpj,address:companyInfo().address,phone:companyInfo().phone,email:companyInfo().email,generatedAt:'Gerado em '+new Date().toLocaleString('pt-BR'),release:RELEASE,logo:lg?{dataUrl:lg.logo,w:lg.w,h:lg.h}:null,rows,pinLast:type==='executive'?'Engº Responsável':null});const core=new Uint8Array(docPdf.output('arraybuffer')),marker=new TextEncoder().encode(`\n%OBRATOP_DATA_BASE64:${payload64({obratop:true,version:RELEASE,type,rows})}\n`),out=new Uint8Array(core.length+marker.length);out.set(core);out.set(marker,core.length);downloadBlob(new Blob([out],{type:'application/pdf'}),`ObraTop_${fileSafe(type)}_${today()}.pdf`)}
function openImportFormat(type){if(type!=='members'&&!canCreate(type))return alert('Você não possui permissão para importar registros neste módulo.');$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>Importar arquivo</h2><p class="muted">Escolha o formato. Excel e CSV aceitam planilhas estruturadas. Word/PDF são reimportados automaticamente quando foram exportados pelo ObraTop.</p><div class="formatgrid"><button class="btn primary ifmt" data-fmt="excel">Excel (.xlsx)</button><button class="btn ifmt" data-fmt="word">Word (.doc)</button><button class="btn ifmt" data-fmt="pdf">PDF (.pdf)</button><button class="btn ifmt" data-fmt="csv">CSV (.csv)</button></div><div class="actions"><button class="btn" id="cancelModal">Cancelar</button></div></div></div>`;$('#cancelModal').onclick=closeModal;$$('.ifmt').forEach(b=>b.onclick=()=>{closeModal();pickImportFile(type,b.dataset.fmt)})}
function pickImportFile(type,fmt){const input=document.createElement('input');input.type='file';input.accept=fmt==='excel'?'.xlsx,.xls':fmt==='csv'?'.csv':fmt==='word'?'.doc,.html,.htm':'.pdf';input.onchange=()=>input.files?.[0]&&importFile(type,fmt,input.files[0]);input.click()}
async function importFile(type,fmt,file){try{setSync('Importando…','warn');if(type==='all'&&isAdmin()){const rp=await createRestorePoint(`Automático pré-importação: ${file.name}`,{category:'Pré-importação'});if(!rp)throw Error('Ponto de restauração pré-importação não pôde ser criado. Importação cancelada.')}let packs=[];if(fmt==='excel')packs=await readExcel(file,type);else if(fmt==='csv')packs=[{type,rows:parseCsv(await file.text())}];else if(fmt==='word')packs=[readEmbeddedText(await file.text(),type)];else if(fmt==='pdf')packs=[readEmbeddedBinary(await file.arrayBuffer(),type)];packs=packs.filter(Boolean);if(!packs.length)throw Error('Nenhum conjunto de dados compatível foi encontrado.');const result=await importPacks(packs);setSync('Sincronizado','ok');if(isAdmin()&&packs.some(p=>p.type==='activities'))setTimeout(offerEapFix,3500);alert(`Importação concluída.\nIncluídos: ${result.added}\nIgnorados/duplicados: ${result.skipped}\nErros: ${result.errors.length}${result.errors.length?'\n\n'+result.errors.slice(0,8).join('\n'):''}`)}catch(e){console.error(e);setSync('Falha na importação','bad');alert(friendly(e))}}
async function readExcel(file,type){if(!window.XLSX)throw Error('Biblioteca Excel não carregada.');const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});if(type!=='all'){const target=type==='members'?'members':type;let name=wb.SheetNames.find(n=>SHEET_TYPES[norm(n).toUpperCase().replaceAll(' ','_')]===target)||wb.SheetNames.find(n=>SHEET_TYPES[n.toUpperCase()]===target)||wb.SheetNames[0];return[{type:target,rows:window.XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:''})}]}const order=['works','suppliers','budgets','activities','measurements','inventory','equipment','orders','finance','contracts','staff','quality','safety','documents','members'],packs=[];for(const t of order){const name=wb.SheetNames.find(n=>{const k=n.toUpperCase().replace(/[ÁÀÂÃ]/g,'A').replace(/[ÉÊ]/g,'E').replace(/[Í]/g,'I').replace(/[ÓÔÕ]/g,'O').replace(/[Ú]/g,'U').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');return SHEET_TYPES[k]===t});if(name)packs.push({type:t,rows:window.XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:''})})}return packs}
function parseCsv(txt){const lines=txt.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];const sep=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';const parse=line=>{const out=[];let s='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){s+='"';i++}else q=!q}else if(c===sep&&!q){out.push(s);s=''}else s+=c}out.push(s);return out};const h=parse(lines.shift());return lines.map(l=>Object.fromEntries(parse(l).map((v,i)=>[h[i]||`Coluna ${i+1}`,v])))}
function readEmbeddedText(txt,type){const m=txt.match(/OBRATOP_DATA_BASE64:([A-Za-z0-9+/=]+)/);if(m){const p=payloadFrom64(m[1]);return{type:p.type||type,rows:p.rows||[]}}const docx=new DOMParser().parseFromString(txt,'text/html'),table=docx.querySelector('table');if(!table)throw Error('Word sem bloco de dados ObraTop ou tabela reconhecível. Exporte pelo ObraTop ou utilize Excel/CSV.');const trs=[...table.querySelectorAll('tr')],headers=[...trs.shift().querySelectorAll('th,td')].map(x=>x.textContent.trim()),rows=trs.map(tr=>Object.fromEntries([...tr.querySelectorAll('td')].map((x,i)=>[headers[i],x.textContent.trim()])));return{type,rows}}
function readEmbeddedBinary(buf,type){const txt=new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(buf)),m=txt.match(/OBRATOP_DATA_BASE64:([A-Za-z0-9+/=]+)/);if(!m)throw Error('Este PDF não contém dados estruturados do ObraTop. Para preenchimento automático, use um PDF exportado pelo ObraTop ou utilize Excel/CSV.');const p=payloadFrom64(m[1]);return{type:p.type||type,rows:p.rows||[]}}
function dateImport(v){if(!v)return'';if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='number'&&v>20000&&window.XLSX){const d=window.XLSX.SSF.parse_date_code(v);if(d)return`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}const s=String(v).trim();const br=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(br)return`${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;const d=new Date(s);return isNaN(d)?s:d.toISOString().slice(0,10)}
function rowVal(row,keys){const m=Object.fromEntries(Object.entries(row).map(([k,v])=>[norm(k),v]));for(const k of keys){if(Object.prototype.hasOwnProperty.call(m,norm(k)))return m[norm(k)]}return''}
let IMPORT_CACHE={};
function resolveImportRef(kind,text,workId){const src=REF_TYPES[kind],list=[...(state.data[src]||[]),...(IMPORT_CACHE[src]||[])].filter(o=>!o.deleted);const byId=list.find(o=>o.id===text);if(byId)return byId.id;const t=norm(text);const same=list.filter(o=>!workId||o.workId===workId);const byLabel=same.find(o=>norm(refLabel(src,o))===t);if(byLabel)return byLabel.id;const key={inventory:'material',measurements:'number',orders:'description',contracts:'number',budgets:'description'}[src];const hit=same.filter(o=>norm(o[key])===t);return hit.length===1?hit[0].id:''}
async function importPacks(packs){IMPORT_CACHE={};let added=0,skipped=0,errors=[];const workMap=new Map(state.data.works.filter(x=>!x.deleted).map(x=>[norm(x.name),x.id])),supplierMap=new Map(state.data.suppliers.filter(x=>!x.deleted).map(x=>[norm(x.name),x.id]));for(const pack of packs){const t=pack.type;if(t==='audit'){skipped+=pack.rows.length;continue}if(t==='members'){if(!isAdmin()){skipped+=pack.rows.length;continue}for(const r of pack.rows){try{const email=String(rowVal(r,['E-mail','Email'])).trim().toLowerCase(),work=rowVal(r,['Obra atribuída','Obra']);if(!email||!work||norm(work)==='todas as obras'){skipped++;continue}const workId=workMap.get(norm(work));if(!workId)throw Error(`Obra não encontrada para ${email}: ${work}`);const code=crypto.randomUUID();await setDoc(doc(fs,'invites',code),{orgId:state.orgId,email,role:'project_user',workId,createdBy:state.user.uid,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+7*86400000),source:'import-3.17.1'});added++;await audit('invite-import','members',code,{email,workId})}catch(e){errors.push(`Usuário: ${e.message}`)}}continue}if(!schemas[t]){skipped+=pack.rows.length;continue}if(t==='works'&&!isAdmin()){skipped+=pack.rows.length;continue}if(t==='suppliers'&&!isAdmin()){skipped+=pack.rows.length;continue}if(!canCreate(t)&&!isAdmin()){skipped+=pack.rows.length;continue}for(const r of pack.rows){try{const data={};for(const f of schemas[t].fields){const[k,label,kind]=f;if(kind==='file')continue;let v=rowVal(r,[label,k]);if(kind==='date')v=dateImport(v);else if(kind==='number'){if(typeof v==='number')v=Number(v)||0;else{let raw=String(v??'').replace(/R\$|\s/g,'');if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');else if(raw.includes(','))raw=raw.replace(',','.');v=Number(raw)||0}}else v=String(v??'').trim();if(kind==='work'){if(!seesAllWorks())v=assignedWorkId();else{const wid=workMap.get(norm(v));if(!wid)throw Error(`Obra não encontrada: ${v}`);v=wid}}if(kind==='supplier'&&v){const sid=supplierMap.get(norm(v));if(!sid)throw Error(`Fornecedor não encontrado: ${v}`);v=sid}if(REF_TYPES[kind]&&v)v=resolveImportRef(kind,v,data.workId);data[k]=v}if(t==='works'){if(!data.name){skipped++;continue}if(workMap.has(norm(data.name))){skipped++;continue}}if(t==='suppliers'&&data.name&&supplierMap.has(norm(data.name))){skipped++;continue}if(duplicate(t,data)){skipped++;continue}const rr=await addDoc(collection(fs,'organizations',state.orgId,t),{...data,createdAt:serverTimestamp(),createdBy:state.user.uid,updatedAt:serverTimestamp(),updatedBy:state.user.uid,deleted:false,imported:true,importSource:RELEASE});if(t==='works')workMap.set(norm(data.name),rr.id);if(t==='suppliers')supplierMap.set(norm(data.name),rr.id);(IMPORT_CACHE[t]??=[]).push({id:rr.id,...data,deleted:false});added++;await audit('import-create',t,rr.id,{source:RELEASE})}catch(e){errors.push(`${schemas[t]?.title||t}: ${e.message}`)}}}return{added,skipped,errors}}

function renderAudit(){const a=state.audits;$('#content').innerHTML=head('Trilha de auditoria','Histórico das alterações críticas')+(a.length?`<div class="tablewrap"><table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Registro</th></tr></thead><tbody>${a.map(x=>`<tr><td>${stamp(x.at)}</td><td>${esc(x.userEmail)}</td><td>${esc(x.action)}</td><td>${esc(schemas[x.module]?.title||x.module)}</td><td>${esc(x.recordId)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="card empty">Nenhum evento registrado.</div>')}
function renderTrash(){if(!isAdmin()){state.route='dashboard';return renderDashboard()}const rows=MODULES.flatMap(type=>state.data[type].filter(x=>x.deleted).map(x=>({type,...x}))).sort((a,b)=>String(b.deletedAt?.seconds||0).localeCompare(String(a.deletedAt?.seconds||0)));$('#content').innerHTML=head('Lixeira','Restaure registros ou faça a remoção definitiva')+(rows.length?`<div class="tablewrap"><table><thead><tr><th>Módulo</th><th>Registro</th><th>Exclusão</th><th>Ações</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(schemas[x.type].title)}</td><td>${esc(x.name||x.description||x.number||x.id)}</td><td>${stamp(x.deletedAt)}</td><td><button class="btn small ok restore" data-type="${x.type}" data-id="${x.id}">Restaurar</button> <button class="btn small danger purge" data-type="${x.type}" data-id="${x.id}">Excluir definitivamente</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="card empty">A lixeira está vazia.</div>');$$('.restore').forEach(b=>b.onclick=async()=>{const bt=writeBatch(fs),now=serverTimestamp();bt.update(doc(fs,'organizations',state.orgId,b.dataset.type,b.dataset.id),{deleted:false,restoredAt:now,restoredBy:state.user.uid});bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('restore',b.dataset.type,b.dataset.id,{}));await bt.commit()});$$('.purge').forEach(b=>b.onclick=async()=>{const type=b.dataset.type,id=b.dataset.id;if(type==='works')return confirmWorkCascadeDelete(id);if(!confirm('Excluir definitivamente? Esta ação não pode ser desfeita.'))return;const item=state.data[type].find(x=>x.id===id),bt=writeBatch(fs);bt.delete(doc(fs,'organizations',state.orgId,type,id));bt.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('purge',type,id,{}));await bt.commit();if(type==='documents'&&item?.storagePath){try{await deleteObject(storageRef(storage,item.storagePath))}catch(e){if(!String(e?.code||'').includes('object-not-found'))console.error(e)}}})}

function maintenanceLastBackup(){
 let local=null;try{local=JSON.parse(localStorage.getItem('obratop-last-backup')||'null')}catch{}
 const evt=(state.audits||[]).find(x=>x.action==='professional-backup');
 const auditAt=evt?.at?.toDate?.()||null;
 if(auditAt&&(!local?.at||auditAt>new Date(local.at)))return{at:auditAt.toISOString(),source:'Auditoria'};
 return local?{...local,source:'Este dispositivo'}:null
}
function normDiag(v){return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function diagValue(v,kind){
 if(kind==='number')return Number(v||0).toFixed(6);
 if(kind==='date')return String(v||'').trim();
 return normDiag(v)
}
function businessFieldKeys(type){
 const map={
  works:['name','client','address','start','end','value','status','progress'],
  measurements:['workId','date','number','description','physical','value','status'],
  budgets:['workId','category','description','unit','qty','unitValue','bdi'],
  activities:['workId','wbs','name','start','end','durationDays','progressMode','plannedQty','actualQty','unit','predecessors','responsible','progress','status'],
  suppliers:['name','cnpj','phone','email','category','status'],
  orders:['workId','supplierId','date','dueDate','description','value','status'],
  inventory:['workId','date','material','category','unit','currentStock','minStock','maxStock','safetyStock','avgDailyConsumption','leadTimeDays','reorderPoint','anticipationStock','unitValue'],
  finance:['workId','date','dueDate','description','type','category','value','status'],
  quality:['workId','date','stage','issue','responsible','deadline','severity','status'],
  contracts:['workId','number','party','object','start','end','value','status'],
  staff:['name','role','admission','salary','workId','status'],
  equipment:['name','code','workId','hourmeter','nextMaintenance','status','startDate','monthlyCost'],
  safety:['workId','date','type','description','responsible','status'],
  documents:['workId','name','category','date','expiry','revision','status','reference','fileName','fileUrl','storagePath','notes']
 };
 return map[type]||((schemas[type]?.fields||[]).filter(f=>f[2]!=='file').map(f=>f[0]))
}
function businessFingerprint(type,x){
 const kinds=new Map((schemas[type]?.fields||[]).map(([k,,kind])=>[k,kind]));
 return businessFieldKeys(type).map(k=>`${k}:${diagValue(x[k],kinds.get(k)||'text')}`).join('|')
}
function strongDuplicateKey(type,x){
 const n=v=>normDiag(v);
 if(type==='works')return n(x.name)?`name:${n(x.name)}`:'';
 if(type==='suppliers')return n(x.cnpj)?`cnpj:${n(x.cnpj)}`:'';
 if(type==='measurements')return x.workId&&n(x.number)?`${x.workId}|num:${n(x.number)}`:'';
 if(type==='activities')return x.workId&&n(x.wbs)?`${x.workId}|wbs:${n(x.wbs)}`:'';
 if(type==='contracts')return x.workId&&n(x.number)?`${x.workId}|num:${n(x.number)}`:'';
 if(type==='equipment')return x.workId&&n(x.code)?`${x.workId}|code:${n(x.code)}`:'';
 if(type==='documents')return x.workId&&n(x.name)&&n(x.revision)?`${x.workId}|${n(x.name)}|rev:${n(x.revision)}`:'';
 return''
}
function similarBusinessKey(type,x){
 const n=v=>normDiag(v);
 if(type==='works')return n(x.name);
 if(type==='suppliers')return n(x.name);
 if(type==='measurements')return [x.workId,n(x.description),x.date||''].join('|');
 if(type==='budgets')return [x.workId,n(x.category),n(x.description),n(x.unit)].join('|');
 if(type==='activities')return [x.workId,n(x.name),x.start||'',x.end||''].join('|');
 if(type==='orders')return [x.workId,x.supplierId||'',n(x.description)].join('|');
 if(type==='inventory')return [x.workId,n(x.material),n(x.unit)].join('|');
 if(type==='finance')return [x.workId,x.date||'',n(x.type),n(x.category),n(x.description)].join('|');
 if(type==='quality')return [x.workId,x.date||'',n(x.stage),n(x.issue)].join('|');
 if(type==='contracts')return [x.workId,n(x.object),x.start||''].join('|');
 if(type==='staff')return [x.workId,n(x.name),n(x.role)].join('|');
 if(type==='equipment')return [x.workId,n(x.name)].join('|');
 if(type==='safety')return [x.workId,x.date||'',n(x.type),n(x.description)].join('|');
 if(type==='documents')return [x.workId,n(x.name),n(x.category)].join('|');
 return''
}
function diffBusinessFields(type,a,b){
 const kinds=new Map((schemas[type]?.fields||[]).map(([k,,kind])=>[k,kind]));
 return businessFieldKeys(type).filter(k=>diagValue(a?.[k],kinds.get(k)||'text')!==diagValue(b?.[k],kinds.get(k)||'text'))
}
function makeDuplicateGroup(type,arr,classification,key){
 const sorted=[...arr].sort((a,b)=>String(a.createdAt?.seconds||0).localeCompare(String(b.createdAt?.seconds||0))||String(a.id).localeCompare(String(b.id)));
 const primary=sorted[0],peer=sorted[1]||sorted[0];
 return{type,classification,key,primaryId:primary.id,peerId:peer.id,ids:sorted.map(x=>x.id),count:sorted.length,diffFields:diffBusinessFields(type,primary,peer)}
}
function maintenanceDuplicateAnalysis(type,active){
 const confirmed=[],possible=[],similar=[];
 const exact=new Map();
 for(const x of active){const k=businessFingerprint(type,x);if(!k)continue;if(!exact.has(k))exact.set(k,[]);exact.get(k).push(x)}
 const confirmedIds=new Set();
 for(const [k,arr] of exact)if(arr.length>1){confirmed.push(makeDuplicateGroup(type,arr,'Duplicidade confirmada',k));arr.forEach(x=>confirmedIds.add(x.id))}
 const strong=new Map();
 for(const x of active){const k=strongDuplicateKey(type,x);if(!k)continue;if(!strong.has(k))strong.set(k,[]);strong.get(k).push(x)}
 const possibleIds=new Set();
 for(const [k,arr] of strong)if(arr.length>1){
  const candidates=arr.filter(x=>!confirmedIds.has(x.id));
  if(candidates.length>1){const fps=new Set(candidates.map(x=>businessFingerprint(type,x)));if(fps.size>1){possible.push(makeDuplicateGroup(type,candidates,'Possível duplicidade',k));candidates.forEach(x=>possibleIds.add(x.id))}}
 }
 const sem=new Map();
 for(const x of active){const k=similarBusinessKey(type,x);if(!k||!k.replace(/\|/g,''))continue;if(!sem.has(k))sem.set(k,[]);sem.get(k).push(x)}
 for(const [k,arr] of sem)if(arr.length>1){
  const candidates=arr.filter(x=>!confirmedIds.has(x.id)&&!possibleIds.has(x.id));
  if(candidates.length>1){const fps=new Set(candidates.map(x=>businessFingerprint(type,x)));if(fps.size>1)similar.push(makeDuplicateGroup(type,candidates,'Registro semelhante',k))}
 }
 return{confirmed,possible,similar}
}
function maintenanceRecord(type,id){return(state.data[type]||[]).find(x=>x.id===id)}
function maintenanceWorkLabel(row){if(!row)return'—';if(row.workId)return workName(row.workId)||row.workId;return'Global / sem obra'}
function maintenanceFieldLabel(type,key){return(schemas[type]?.fields||[]).find(f=>f[0]===key)?.[1]||key}
function maintenanceDisplayValue(type,key,v){
 if(v===undefined||v===null||v==='')return'—';
 if(key==='workId')return workName(v)||String(v);
 if(key==='supplierId')return(state.data.suppliers||[]).find(x=>x.id===v)?.name||String(v);
 if(typeof v==='number')return Number.isInteger(v)?String(v):String(v).replace('.',',');
 return String(v)
}
function maintenanceCreatedMs(x){
 const v=x?.createdAt;if(!v)return Number.MAX_SAFE_INTEGER;if(typeof v.toMillis==='function')return v.toMillis();if(Number.isFinite(v?.seconds))return v.seconds*1000;const d=new Date(v);return Number.isFinite(d.getTime())?d.getTime():Number.MAX_SAFE_INTEGER
}
function maintenanceUpdatedMs(x){
 const v=x?.updatedAt;if(!v)return 0;if(typeof v.toMillis==='function')return v.toMillis();if(Number.isFinite(v?.seconds))return v.seconds*1000;const d=new Date(v);return Number.isFinite(d.getTime())?d.getTime():0
}
function recommendedKeeper(rows){return[...rows].sort((a,b)=>maintenanceCreatedMs(a)-maintenanceCreatedMs(b)||maintenanceUpdatedMs(a)-maintenanceUpdatedMs(b)||String(a.id).localeCompare(String(b.id)))[0]}
function duplicateReferenceRows(type,id){
 const refs=[];
 if(type==='works')for(const t of MODULES)if(t!=='works'&&t!=='suppliers'&&hasWorkField(t))for(const x of(state.data[t]||[]).filter(x=>!x.deleted&&x.workId===id))refs.push({type:t,id:x.id,field:'workId'});
 if(type==='suppliers')for(const x of(state.data.orders||[]).filter(x=>!x.deleted&&x.supplierId===id))refs.push({type:'orders',id:x.id,field:'supplierId'});
 return refs
}
function maintenanceStamp(v){const ms=maintenanceCreatedMs({createdAt:v});return ms===Number.MAX_SAFE_INTEGER?'Não identificada':new Date(ms).toLocaleString('pt-BR')}
async function moveDuplicateToTrash(type,duplicateId,keeperId,{bulk=false}={}){
 if(!isAdmin())throw Error('Somente o Proprietário/Administrador pode sanear duplicidades.');
 const dup=maintenanceRecord(type,duplicateId),keep=maintenanceRecord(type,keeperId);if(!dup||!keep)throw Error('Registro não localizado. Execute uma nova verificação.');
 if(dup.deleted)throw Error('A duplicata já está na lixeira.');
 if(businessFingerprint(type,dup)!==businessFingerprint(type,keep))throw Error('A equivalência deixou de ser válida. Execute uma nova verificação antes de sanear.');
 const refs=duplicateReferenceRows(type,duplicateId),now=serverTimestamp(),ops=[];
 for(const r of refs)ops.push({kind:'update',ref:doc(fs,'organizations',state.orgId,r.type,r.id),data:{[r.field]:keeperId,updatedAt:now,updatedBy:state.user.uid,mergedFromDuplicate:duplicateId}});
 ops.push({kind:'update',ref:doc(fs,'organizations',state.orgId,type,duplicateId),data:{deleted:true,deletedAt:now,deletedBy:state.user.uid,deleteReason:'Duplicidade confirmada — saneamento seguro',duplicateOf:keeperId,sanitizedAt:now,sanitizedBy:state.user.uid}});
 for(let i=0;i<ops.length;i+=450){const b=writeBatch(fs);for(const o of ops.slice(i,i+450))b.update(o.ref,o.data);await b.commit()}
 await audit('duplicate-safe-merge',type,duplicateId,{keeperId,reassignedLinks:refs.length,group:'confirmed-duplicate',mode:bulk?'batch':'individual'});
 return{refs:refs.length}
}
async function ensureSanitationBackup(){
 const ok=await exportProfessionalBackup();if(!ok)throw Error('O backup obrigatório não foi concluído. O saneamento foi cancelado.');
 return true
}
async function sanitizeDuplicatePair(type,keeperId,duplicateId){
 const keep=maintenanceRecord(type,keeperId),dup=maintenanceRecord(type,duplicateId);if(!keep||!dup)return alert('Registros não localizados. Execute uma nova verificação.');
 const refs=duplicateReferenceRows(type,duplicateId);
 if(!confirm(`Saneamento seguro\n\nManter: ${keeperId}\nEnviar à lixeira: ${duplicateId}\nVínculos a redirecionar: ${refs.length}\n\nAntes da alteração será gerado um backup profissional obrigatório. Continuar?`))return;
 try{setSync('Gerando backup de segurança…','warn');await ensureSanitationBackup();setSync('Saneando duplicidade…','warn');await moveDuplicateToTrash(type,duplicateId,keeperId);await refreshMaintenanceData();toast('Duplicidade saneada com segurança. Registro preservado e duplicata enviada à lixeira.')}catch(e){console.error(e);setSync('Falha no saneamento','bad');alert('Saneamento cancelado: '+friendly(e))}
}
function openDuplicateCompare(type,idA,idB,classification='Comparação'){
 const a=maintenanceRecord(type,idA),b=maintenanceRecord(type,idB);if(!a||!b)return alert('Um dos registros não está mais disponível. Execute uma nova verificação.');
 const keys=businessFieldKeys(type),diff=new Set(diffBusinessFields(type,a,b)),keeper=recommendedKeeper([a,b]),other=keeper.id===a.id?b:a,refsA=duplicateReferenceRows(type,a.id).length,refsB=duplicateReferenceRows(type,b.id).length;
 const rows=keys.map(k=>`<tr class="${diff.has(k)?'compareDiff':''}"><td><b>${esc(maintenanceFieldLabel(type,k))}</b></td><td>${esc(maintenanceDisplayValue(type,k,a[k]))}</td><td>${esc(maintenanceDisplayValue(type,k,b[k]))}</td><td>${diff.has(k)?'<span class="badge warn">Diferente</span>':'<span class="badge ok">Igual</span>'}</td></tr>`).join('');
 const safe=classification==='Duplicidade confirmada'&&!diff.size;
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog compareDialog"><h2>${esc(classification)} — ${esc(schemas[type]?.title||type)}</h2><p class="muted">Comparação e saneamento controlado. Nenhum registro é excluído definitivamente: a duplicata é enviada à Lixeira e a ação fica registrada na Auditoria.</p><div class="compareSummary"><div class="${keeper.id===a.id?'keeperRecommended':''}"><b>Registro A ${keeper.id===a.id?'<span class="badge ok">Recomendado manter</span>':''}</b><br><code>${esc(a.id)}</code><br><span class="muted">${esc(maintenanceWorkLabel(a))}</span><br><small>Criado: ${esc(maintenanceStamp(a.createdAt))} • Vínculos: ${refsA}</small></div><div class="${keeper.id===b.id?'keeperRecommended':''}"><b>Registro B ${keeper.id===b.id?'<span class="badge ok">Recomendado manter</span>':''}</b><br><code>${esc(b.id)}</code><br><span class="muted">${esc(maintenanceWorkLabel(b))}</span><br><small>Criado: ${esc(maintenanceStamp(b.createdAt))} • Vínculos: ${refsB}</small></div></div><div class="tablewrap"><table><thead><tr><th>Campo</th><th>Registro A</th><th>Registro B</th><th>Resultado</th></tr></thead><tbody>${rows}</tbody></table></div>${safe?`<div class="sanitationBox"><b>✓ Equivalência confirmada</b><p>O ObraTop recomenda preservar o registro ${esc(keeper.id)} por ser o original/mais antigo identificável. O outro registro poderá ser enviado à Lixeira após backup obrigatório.</p><label>Registro que será preservado</label><select id="keeperChoice"><option value="${esc(keeper.id)}">Recomendado — ${esc(keeper.id)}</option><option value="${esc(other.id)}">Alternativo — ${esc(other.id)}</option></select></div>`:'<div class="notice warn">Existem diferenças entre os registros. O saneamento automático permanece bloqueado.</div>'}<div class="actions"><button class="btn" id="closeCompare">Fechar comparação</button>${safe?'<button class="btn primary" id="safeMergeDup">Mesclar e enviar duplicata à lixeira</button>':''}</div></div></div>`;
 $('#closeCompare').onclick=closeModal;
 if($('#safeMergeDup'))$('#safeMergeDup').onclick=()=>{const keepId=$('#keeperChoice').value,dupId=keepId===a.id?b.id:a.id;closeModal();sanitizeDuplicatePair(type,keepId,dupId)}
}
function collectConfirmedDuplicateGroups(){
 const groups=[];
 for(const type of MODULES){
  const active=(state.data[type]||[]).filter(x=>!x.deleted);
  for(const g of maintenanceDuplicateAnalysis(type,active).confirmed)groups.push({...g,type});
 }
 return groups
}
async function executeBatchSanitation(groups){
 if(!isAdmin())return alert('Somente o Proprietário/Administrador pode executar o saneamento em lote.');
 if(!groups?.length)return alert('Nenhuma duplicidade confirmada disponível para saneamento.');
 try{
  const rp=await createRestorePoint('Automático pré-saneamento de duplicidades',{category:'Pré-saneamento'});if(!rp)throw Error('Ponto de restauração pré-saneamento não pôde ser criado. Saneamento cancelado.');
  setSync('Gerando backup obrigatório…','warn');
  await ensureSanitationBackup();
  let moved=0,links=0,processedGroups=0;
  for(const original of groups){
   /* Revalida cada grupo imediatamente antes da alteração. */
   const rows=original.ids.map(id=>maintenanceRecord(original.type,id)).filter(x=>x&&!x.deleted);
   if(rows.length<2)continue;
   const fingerprint=businessFingerprint(original.type,rows[0]);
   const valid=rows.filter(x=>businessFingerprint(original.type,x)===fingerprint);
   if(valid.length<2)continue;
   const keeper=recommendedKeeper(valid);let groupMoved=0;
   for(const dup of valid.filter(x=>x.id!==keeper.id)){
    const r=await moveDuplicateToTrash(original.type,dup.id,keeper.id,{bulk:true});
    moved++;groupMoved++;links+=r.refs;
   }
   if(groupMoved)processedGroups++;
  }
  await audit('duplicate-safe-batch','system','sanitation',{groups:processedGroups,moved,links,release:RELEASE});
  await refreshMaintenanceData();
  alert(`Saneamento seguro em lote concluído.\n\n${processedGroups} grupo(s) tratado(s).\n${moved} duplicata(s) enviada(s) à Lixeira.\n${links} vínculo(s) redirecionado(s).\n\nNenhum registro foi excluído definitivamente.`)
 }catch(e){console.error(e);setSync('Falha no saneamento','bad');alert('Saneamento em lote interrompido: '+friendly(e))}
}
async function sanitizeAllConfirmedDuplicates(){
 if(!isAdmin())return alert('Somente o Proprietário/Administrador pode executar o saneamento em lote.');
 try{
  setSync('Preparando saneamento em lote…','warn');
  const readable=MODULES.filter(canRead);
  const results=await Promise.all(readable.map(async type=>{
   const snap=await getDocs(query(collection(fs,'organizations',state.orgId,type),orderBy('createdAt','desc')));
   return[type,snap.docs.map(d=>({id:d.id,...d.data()}))]
  }));
  for(const[type,rows]of results)state.data[type]=rows;
  state.lastSyncAt=new Date();localStorage.setItem('obratop-last-sync',state.lastSyncAt.toISOString());setSync('Sincronizado','ok');
 }catch(e){console.error(e);setSync('Falha na verificação','bad');return alert('Não foi possível atualizar os dados antes do saneamento: '+friendly(e))}
 const groups=collectConfirmedDuplicateGroups();
 if(!groups.length)return alert('Nenhuma duplicidade confirmada disponível para saneamento.');
 const duplicates=groups.reduce((sum,g)=>sum+Math.max(0,g.ids.length-1),0),byType={};
 for(const g of groups){const x=byType[g.type]||(byType[g.type]={groups:0,duplicates:0});x.groups++;x.duplicates+=Math.max(0,g.ids.length-1)}
 const entries=Object.entries(byType);
 const rows=entries.map(([type,x],i)=>`<tr><td><label class="batchModulePick"><input type="radio" name="batchModule" value="${esc(type)}" ${i===0?'checked':''}> ${esc(schemas[type]?.title||type)}</label></td><td>${x.groups}</td><td>${x.duplicates}</td></tr>`).join('');
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog compareDialog batchSanitationDialog"><h2>Saneamento em Lote Controlado</h2><p class="muted">Prévia obrigatória. Escolha executar somente um módulo ou todos os módulos. Somente duplicidades confirmadas por equivalência integral dos campos de negócio serão tratadas.</p><div class="maintenanceHero"><div><b>${groups.length} grupo(s) confirmado(s)</b><br><span class="muted">${duplicates} duplicata(s) candidata(s)</span></div><span class="badge ok">Backup obrigatório</span></div><div class="tablewrap"><table><thead><tr><th>Módulo / seleção</th><th>Grupos</th><th>Duplicatas a sanear</th></tr></thead><tbody>${rows}</tbody></table></div><div class="sanitationBox"><b>Proteções automáticas mantidas</b><p>✓ Atualização prévia dos dados diretamente do Firestore<br>✓ Backup profissional antes da primeira alteração<br>✓ Preservação do registro original/mais antigo por grupo<br>✓ Revalidação da equivalência antes de cada alteração<br>✓ Redirecionamento de vínculos conhecidos<br>✓ Duplicatas enviadas à Lixeira, sem exclusão definitiva<br>✓ Registro completo na Auditoria<br>✓ Novo diagnóstico ao concluir</p><label class="batchConfirm"><input type="checkbox" id="batchSanitationConfirm"> Confirmo o saneamento apenas das duplicidades confirmadas acima.</label></div><div class="actions"><button class="btn" id="cancelBatchSanitation">Cancelar</button><button class="btn" id="executeModuleSanitation" disabled>Executar por módulo</button><button class="btn primary" id="executeAllSanitation" disabled>Executar todos</button></div></div></div>`;
 const check=$('#batchSanitationConfirm'),one=$('#executeModuleSanitation'),all=$('#executeAllSanitation');
 $('#cancelBatchSanitation').onclick=closeModal;
 check.onchange=()=>{one.disabled=all.disabled=!check.checked};
 const run=(selected,mode)=>{
  if(!check.checked)return;
  const n=selected.reduce((sum,g)=>sum+Math.max(0,g.ids.length-1),0);
  if(!selected.length)return alert('Nenhum grupo selecionado.');
  if(!confirm(`${mode==='module'?'Saneamento por módulo':'Saneamento de todos os módulos'}\n\n${selected.length} grupo(s)\n${n} duplicata(s) candidata(s)\n\nUm backup obrigatório será gerado antes da primeira alteração. Continuar?`))return;
  one.disabled=all.disabled=true;closeModal();executeBatchSanitation(selected)
 };
 one.onclick=()=>{const type=document.querySelector('input[name="batchModule"]:checked')?.value;run(groups.filter(g=>g.type===type),'module')};
 all.onclick=()=>run(groups,'all');
}
function maintenanceScan(){
 const issues=[],byModule={},workAll=new Map((state.data.works||[]).map(x=>[x.id,x])),workActive=new Set((state.data.works||[]).filter(x=>!x.deleted).map(x=>x.id)),supplierActive=new Set((state.data.suppliers||[]).filter(x=>!x.deleted).map(x=>x.id));
 const base=()=>({active:0,trash:0,confirmed:0,possible:0,similar:0,orphans:0,inconsistencies:0});
 const add=(severity,type,id,kind,detail,meta={})=>{issues.push({severity,type,id,kind,detail,...meta});const m=byModule[type]||(byModule[type]=base());if(kind==='Duplicidade confirmada')m.confirmed++;else if(kind==='Possível duplicidade')m.possible++;else if(kind==='Registro semelhante')m.similar++;else if(kind==='Vínculo órfão')m.orphans++;else m.inconsistencies++};
 for(const type of MODULES){
  const rows=state.data[type]||[],m=byModule[type]||(byModule[type]=base());m.active=rows.filter(x=>!x.deleted).length;m.trash=rows.filter(x=>x.deleted).length;
  const active=rows.filter(x=>!x.deleted),dup=maintenanceDuplicateAnalysis(type,active);
  for(const g of dup.confirmed)add('warn',type,g.primaryId,'Duplicidade confirmada',`Grupo com ${g.count} registros na mesma obra/contexto e todos os campos de negócio iguais. Compare o par antes de qualquer decisão.`,{peerId:g.peerId,groupIds:g.ids,groupCount:g.count,diffFields:g.diffFields});
  for(const g of dup.possible)add('warn',type,g.primaryId,'Possível duplicidade',`Mesmo identificador forte no mesmo contexto, porém com campos diferentes (${g.diffFields.map(k=>maintenanceFieldLabel(type,k)).join(', ')||'diferenças detectadas'}).`,{peerId:g.peerId,groupIds:g.ids,groupCount:g.count,diffFields:g.diffFields});
  for(const g of dup.similar)add('info',type,g.primaryId,'Registro semelhante',`Grupo com ${g.count} registros de natureza semelhante, porém com conteúdo diferente. Não reduz a saúde do sistema.`,{peerId:g.peerId,groupIds:g.ids,groupCount:g.count,diffFields:g.diffFields});
  for(const x of active){
   if(type!=='works'&&type!=='suppliers'&&hasWorkField(type)){
    if(!x.workId)add('critical',type,x.id,'Vínculo órfão','Registro ativo sem obra vinculada.');
    else if(!workAll.has(x.workId))add('critical',type,x.id,'Vínculo órfão','A obra vinculada não existe.');
    else if(!workActive.has(x.workId))add('critical',type,x.id,'Vínculo órfão','Registro ativo vinculado a uma obra que está na lixeira.');
   }
   if(type==='orders'&&x.supplierId&&!supplierActive.has(x.supplierId))add('critical',type,x.id,'Vínculo órfão','Pedido vinculado a fornecedor inexistente ou excluído.');
   if(type==='works'&&x.start&&x.end&&x.start>x.end)add('warn',type,x.id,'Inconsistência','Data final da obra é anterior à data inicial.');
   if(type==='activities'&&x.start&&x.end&&x.start>x.end)add('warn',type,x.id,'Inconsistência','Atividade com data final anterior à inicial.');
   if(type==='contracts'&&x.start&&x.end&&x.start>x.end)add('warn',type,x.id,'Inconsistência','Contrato com data final anterior à inicial.');
   if(type==='inventory'){
    if((+x.minStock||0)>(+x.maxStock||0)&&(+x.maxStock||0)>0)add('warn',type,x.id,'Inconsistência','Estoque mínimo maior que estoque máximo.');
    if((+x.currentStock||0)<0)add('warn',type,x.id,'Inconsistência','Estoque atual negativo.');
   }
   if(type==='activities'&&String(x.predecessors||'').trim()){
    const refs=mspj.parsePred(x.predecessors).map(l=>l.code),wbs=new Set(active.filter(a=>a.workId===x.workId).map(a=>String(a.wbs||'').trim()).filter(Boolean));
    for(const ref of refs)if(!wbs.has(ref))add('warn',type,x.id,'Inconsistência',`Predecessora EAP ${ref} não localizada na mesma obra.`)
   }
  }
 }
 for(const p of engineeringArchive||[]){
  const d=p.data||{},wid=d.workId;
  if(!wid)add('critical','engineeringProjects',p.id,'Vínculo órfão','Projeto da Engenharia Inteligente sem obra vinculada.');
  else if(!workAll.has(wid))add('critical','engineeringProjects',p.id,'Vínculo órfão','Projeto da Engenharia Inteligente vinculado a obra inexistente.');
  else if(!workActive.has(wid))add('critical','engineeringProjects',p.id,'Vínculo órfão','Projeto da Engenharia Inteligente vinculado a obra na lixeira.');
  for(const t of p.takeoffs||[]){const td=t.data||{};if(td.workId&&wid&&td.workId!==wid)add('warn','engineeringProjects',t.id,'Inconsistência','Quantitativo com workId diferente do projeto pai.')}
 }
 const engModule=byModule.engineeringProjects||(byModule.engineeringProjects=base());engModule.active=(engineeringArchive||[]).reduce((n,p)=>n+(!p.data?.deleted?1:0)+(p.takeoffs||[]).filter(t=>!t.data?.deleted).length,0);engModule.trash=(engineeringArchive||[]).reduce((n,p)=>n+(p.data?.deleted?1:0)+(p.takeoffs||[]).filter(t=>t.data?.deleted).length,0);
 for(const m of state.members||[]){if(m.status==='active'&&m.role==='project_user'&&(!m.workId||!workActive.has(m.workId)))issues.push({severity:'critical',type:'members',id:m.id,kind:'Vínculo órfão',detail:'Usuário ativo sem obra válida atribuída.'})}
 const lastBackup=maintenanceLastBackup(),backupAge=lastBackup?.at?Math.floor((Date.now()-new Date(lastBackup.at).getTime())/86400000):null;
 if(lastBackup&&backupAge>7)issues.push({severity:'warn',type:'backup',id:'backup',kind:'Manutenção',detail:`Último backup profissional tem ${backupAge} dias.`});
 if(!lastBackup)issues.push({severity:'warn',type:'backup',id:'backup',kind:'Manutenção',detail:'Nenhum backup profissional identificado neste dispositivo/auditoria recente.'});
 if(isAdmin()){const ext=latestExternalBackup(),extAge=daysSince(ext?.at);if(!ext)issues.push({severity:'warn',type:'backup',id:'external-backup',kind:'Continuidade',detail:'Nenhum backup externo independente identificado neste dispositivo.'});else if(extAge!==null&&extAge>EXTERNAL_BACKUP_MAX_AGE_DAYS)issues.push({severity:'warn',type:'backup',id:'external-backup',kind:'Continuidade',detail:`Backup externo independente tem ${extAge} dias; recomenda-se atualizar.`})}
 if(state.lastSyncError)issues.push({severity:'critical',type:state.lastSyncError.module||'system',id:'sync',kind:'Sincronização',detail:`Última sincronização apresentou falha: ${state.lastSyncError.message}`});
 // V3.17.7.1: integridade dos dados e proteção/continuidade são diagnósticos independentes.
 // Lixeira e avisos de backup não rebaixam a saúde estrutural dos dados.
 const protectionIssues=issues.filter(x=>x.type==='backup');
 const dataIssues=issues.filter(x=>x.type!=='backup');
 const critical=dataIssues.filter(x=>x.severity==='critical').length,warn=dataIssues.filter(x=>x.severity==='warn').length,info=dataIssues.filter(x=>x.severity==='info').length,diagnosis=critical?'Crítico':warn?'Atenção':'Sistema íntegro';
 const protectionCritical=protectionIssues.filter(x=>x.severity==='critical').length,protectionWarn=protectionIssues.filter(x=>x.severity==='warn').length,protectionDiagnosis=protectionCritical?'Crítico':protectionWarn?'Atenção':'Protegido';
 const totalActive=MODULES.reduce((s,t)=>s+(state.data[t]||[]).filter(x=>!x.deleted).length,0)+(byModule.engineeringProjects?.active||0),totalTrash=MODULES.reduce((s,t)=>s+(state.data[t]||[]).filter(x=>x.deleted).length,0)+(byModule.engineeringProjects?.trash||0);
 return{issues:dataIssues,allIssues:issues,protectionIssues,byModule,critical,warn,info,diagnosis,protectionCritical,protectionWarn,protectionDiagnosis,totalActive,totalTrash,lastBackup,backupAge}
}

const AUTO_RESTORE_DAYS=7,RESTORE_TEST_DAYS=30;
async function testRestorePoint(rp,silent=false){
 if(!isAdmin())return null;
 try{const payload=await readRestorePoint(rp);const records=Object.values(payload.modules||{}).reduce((n,r)=>n+(r||[]).length,0);
  const info={at:new Date().toISOString(),pointId:rp.id,pointName:rp.name||rp.id,ok:true,records,checksum:rp.checksum,by:state.user.email||''};
  await updateDoc(doc(fs,'organizations',state.orgId),{lastRestoreTest:info,updatedAt:serverTimestamp()});if(state.org)state.org.lastRestoreTest=info;
  await audit('restore-test','restorePoints',rp.id,{ok:true,records});if(!silent)toast(`Restauração testada: ${records} registro(s) legíveis e checksum conferido.`);return info
 }catch(e){const info={at:new Date().toISOString(),pointId:rp?.id||'',ok:false,error:String(e.message||e).slice(0,200),by:state.user.email||''};
  try{await updateDoc(doc(fs,'organizations',state.orgId),{lastRestoreTest:info,updatedAt:serverTimestamp()});if(state.org)state.org.lastRestoreTest=info}catch{}
  if(!silent)alert('O teste de restauração FALHOU: '+info.error);return info}
}
async function maybeAutoRestorePoint(){
 if(!isAdmin()||state.autoRpChecked)return;state.autoRpChecked=true;
 try{const pts=await loadRestorePoints(),last=pts.find(p=>p.category==='Automático semanal'),age=last?daysSince(last.createdAt):9999;
  if(age<AUTO_RESTORE_DAYS)return;
  const id=await createRestorePoint('Rotina semanal automática',{category:'Automático semanal',name:`Automático ${new Date().toLocaleDateString('pt-BR')}`,skipRefresh:true});
  if(id){const fresh=(await loadRestorePoints()).find(p=>p.id===id);if(fresh)await testRestorePoint(fresh,true)}
 }catch(e){console.warn('Ponto semanal automático não criado:',e)}
}
function restoreTestCard(){
 const t=state.org?.lastRestoreTest,age=t?daysSince(t.at):null;
 const st=!t?'<span class="badge warn">Nunca testada</span>':t.ok?(age>RESTORE_TEST_DAYS?`<span class="badge warn">Teste com ${age} dias — repetir</span>`:'<span class="badge ok">✓ Restauração testada</span>'):'<span class="badge bad">⛔ Último teste falhou</span>';
 return`<div class="card"><div class="sectiontitle">Restauração testada e retenção</div><p><b>Status:</b> ${st}</p><p class="muted">${t?`Último teste em ${new Date(t.at).toLocaleString('pt-BR')} no ponto “${esc(t.pointName||t.pointId||'—')}”${t.ok?` — ${t.records} registro(s) lidos e checksum SHA-256 conferido`:` — ${esc(t.error||'falha')}`}.`:'Ainda não há teste registrado.'}</p><p class="muted"><b>Rotina:</b> um ponto de restauração automático por semana (criado quando o administrador abre o app e o último tem 7 dias ou mais) e teste de leitura do ponto criado. <b>Retenção:</b> os ${RESTORE_RETENTION_LIMIT} pontos mais recentes, mais os protegidos.</p>${isAdmin()?'<button class="btn" id="restoreTestBtn">Testar restauração agora</button>':''}</div>`
}
function diagBadge(d){return d==='Sistema íntegro'?'<span class="badge ok">✓ Sistema íntegro</span>':d==='Atenção'?'<span class="badge warn">⚠ Atenção</span>':'<span class="badge bad">⛔ Crítico</span>'}
async function refreshMaintenanceData(){
 const btn=$('#maintenanceRefresh');
 try{
  if(btn){btn.disabled=true;btn.textContent='↻ Verificando…'}
  setSync('Verificando integridade…','warn');
  const readable=MODULES.filter(canRead);
  const results=await Promise.all(readable.map(async type=>{
   const s=await getDocs(query(collection(fs,'organizations',state.orgId,type),orderBy('createdAt','desc')));
   return[type,s.docs.map(d=>({id:d.id,...d.data()}))]
  }));
  for(const[type,rows]of results)state.data[type]=rows;
  const [mem,snaps]=await Promise.all([
   getDocs(collection(fs,'organizations',state.orgId,'members')),
   getDocs(query(collection(fs,'organizations',state.orgId,'progressSnapshots'),orderBy('date','asc')))
  ]);
  state.members=mem.docs.map(d=>({id:d.id,...d.data()}));
  state.snapshots=snaps.docs.map(d=>({id:d.id,...d.data()}));
  await loadEngineeringArchive();
  state.lastSyncAt=new Date();state.lastSyncError=null;
  localStorage.setItem('obratop-last-sync',state.lastSyncAt.toISOString());
  setSync('Sincronizado','ok');
  toast('Verificação concluída com dados atualizados do Firestore.');
  renderMaintenance();
 }catch(e){
  console.error(e);state.lastSyncError={module:'maintenance',message:friendly(e),at:new Date()};
  setSync('Falha na verificação','bad');
  alert('Não foi possível atualizar o diagnóstico: '+friendly(e));
  if(btn){btn.disabled=false;btn.textContent='↻ Verificar novamente'}
 }
}



// ===== V3.17.7 — PROTEÇÃO OPERACIONAL E CONTINUIDADE =====
function integrityLocalKey(){return`obratop-integrity-monitor-${state.orgId||'none'}`}
function latestExternalBackup(){const l=getLocalJson(externalBackupLocalKey()),o=state.org?.lastExternalBackup;if(l?.at&&o?.at)return String(l.at)>=String(o.at)?l:o;return l?.at?l:(o?.at?o:null)}
function externalBackupLocalKey(){return`obratop-external-backup-${state.orgId||'none'}`}
function getLocalJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function daysSince(iso){if(!iso)return null;const ms=Date.now()-new Date(iso).getTime();return Number.isFinite(ms)?Math.floor(ms/86400000):null}
function startIntegrityMonitor(){if(integrityTimer)clearInterval(integrityTimer);setTimeout(()=>runPeriodicIntegrityCheck(true),45000);integrityTimer=setInterval(()=>runPeriodicIntegrityCheck(true),INTEGRITY_INTERVAL_MS)}
async function runPeriodicIntegrityCheck(silent=false){
 if(integrityCheckRunning||!state.orgId||!state.member)return null;
 integrityCheckRunning=true;
 try{
  await refreshMaintenanceDataSilent();const d=maintenanceScan(),result={at:new Date().toISOString(),diagnosis:d.diagnosis,critical:d.critical,warn:d.warn,info:d.info,totalActive:d.totalActive,totalTrash:d.totalTrash};
  localStorage.setItem(integrityLocalKey(),JSON.stringify(result));
  if(!silent&&state.route==='maintenance'){renderMaintenance();toast(`Integridade verificada: ${d.diagnosis}.`)}
  return result
 }catch(e){console.error('Monitoramento periódico de integridade:',e);const result={at:new Date().toISOString(),diagnosis:'Crítico',critical:1,warn:0,info:0,error:friendly(e)};localStorage.setItem(integrityLocalKey(),JSON.stringify(result));return result
 }finally{integrityCheckRunning=false}
}
async function deleteRestorePointForRetention(rp){
 if(!isAdmin()||rp?.protected)return false;
 const chunks=await getDocs(collection(fs,'organizations',state.orgId,'restorePoints',rp.id,'chunks'));
 for(let i=0;i<chunks.docs.length;i+=350){const b=writeBatch(fs);chunks.docs.slice(i,i+350).forEach(x=>b.delete(x.ref));await b.commit()}
 await deleteDoc(doc(fs,'organizations',state.orgId,'restorePoints',rp.id));return true
}
async function enforceRestorePointRetention(){
 if(!isAdmin())return{removed:0};
 const points=await loadRestorePoints(),unprotected=points.filter(x=>!x.protected).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 const excess=unprotected.slice(RESTORE_RETENTION_LIMIT);let removed=0;
 for(const rp of excess){if(await deleteRestorePointForRetention(rp))removed++}
 if(removed)await audit('restore-point-retention','restorePoints','automatic',{limit:RESTORE_RETENTION_LIMIT,removed,protectedPreserved:points.filter(x=>x.protected).length});
 return{removed}
}
async function loadRestoreHistory(){
 try{const s=await getDocs(query(collection(fs,'organizations',state.orgId,'restoreHistory'),orderBy('at','desc')));return s.docs.slice(0,20).map(d=>({id:d.id,...d.data()}))}catch(e){console.warn('Histórico de restaurações indisponível:',e);return[]}
}
async function recordRestoreHistory(rp,details){
 const id=`rh_${restorePointNowFile()}_${Math.random().toString(36).slice(2,7)}`;
 await setDoc(doc(fs,'organizations',state.orgId,'restoreHistory',id),{at:new Date().toISOString(),pointId:rp.id,pointRelease:rp.release||'',userId:state.user.uid,userEmail:state.user.email,mode:details.mode,modules:details.modules,restored:details.restored,altered:details.altered,trashed:details.trashed,risk:details.risk,diagnosisBefore:details.diagnosisBefore,diagnosisAfter:details.diagnosisAfter,safetyPoint:details.safetyPoint,result:'success',release:RELEASE});
}
async function buildExternalBackupEnvelope(){
 const payload=await buildProfessionalBackup(),points=await loadRestorePoints(),history=await loadRestoreHistory();
 const core={format:'OBRATOP_EXTERNAL_BACKUP',schemaVersion:1,release:RELEASE,createdAt:new Date().toISOString(),orgId:state.orgId,orgName:state.org?.name||'ObraTop',createdBy:state.user?.email||'',payload,restorePoints:points.map(x=>({id:x.id,name:x.name||'',reason:x.reason||'',category:x.category||'',protected:!!x.protected,release:x.release||'',createdAt:x.createdAt,totalRecords:x.totalRecords||0,checksum:x.checksum||'',status:x.status||''})),restoreHistory:history};
 const canonical=JSON.stringify(core),checksum=await sha256Text(canonical);return{...core,checksum}
}
async function exportExternalBackup(){
 if(!isAdmin())return alert('Somente o Administrador Geral pode gerar backup externo independente.');
 try{setSync('Gerando backup externo…','warn');await refreshMaintenanceDataSilent();const envelope=await buildExternalBackupEnvelope(),text=JSON.stringify(envelope,null,2),name=`ObraTop_Backup_Externo_${backupDateTimeFile()}.obratop.json`;downloadBlob(new Blob([text],{type:'application/json;charset=utf-8'}),name);localStorage.setItem(externalBackupLocalKey(),JSON.stringify({at:envelope.createdAt,checksum:envelope.checksum,file:name,release:RELEASE}));try{const info={at:envelope.createdAt,checksum:envelope.checksum,by:state.user.email||'',release:RELEASE};await updateDoc(doc(fs,'organizations',state.orgId),{lastExternalBackup:info,updatedAt:serverTimestamp()});if(state.org)state.org.lastExternalBackup=info}catch(e){console.warn('Não foi possível registrar o backup na organização:',e)}await audit('external-backup','backup','external',{checksum:envelope.checksum,file:name,createdAt:envelope.createdAt,total:MODULES.reduce((n,t)=>n+(state.data[t]||[]).length,0)});setSync('Sincronizado','ok');toast('Backup externo independente baixado e protegido por SHA-256.');if(state.route==='maintenance')renderMaintenance();return true}catch(e){console.error(e);setSync('Falha no backup externo','bad');alert('Não foi possível gerar o backup externo: '+friendly(e));return false}
}
function maybeExternalBackupReminder(){if(!isAdmin()||!state.orgId)return;const last=latestExternalBackup(),age=daysSince(last?.at);if(age===null||age>=EXTERNAL_BACKUP_MAX_AGE_DAYS){const shownKey=`obratop-external-reminder-${state.orgId}-${today()}`;if(!localStorage.getItem(shownKey)){localStorage.setItem(shownKey,'1');setTimeout(()=>toast(age===null?'Recomendação: gere o primeiro backup externo independente.':`Backup externo tem ${age} dias. Recomenda-se atualizar.`),1500)}}}

// ===== V3.17.6.3 — RESTAURAÇÃO ASSISTIDA E AUDITÁVEL =====
function restorePointNowFile(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`}
function restoreModuleLabel(t){return t==='progressSnapshots'?'Histórico Curva S':t==='engineeringProjects'?'Engenharia Inteligente':(schemas[t]?.title||t)}
const RESTORE_MODULES=[...MODULES,'engineeringProjects'];
function restoreModulesForPayload(payload){return Number(payload?.schemaVersion||0)>=3?RESTORE_MODULES:[...MODULES]}
const RESTORE_IGNORE_FIELDS=new Set(['createdAt','createdBy','updatedAt','updatedBy','deletedAt','deletedBy','restoredAt','restoredBy','deletedReason','imported','importSource','migratedFromV2']);
function restoreComparable(v){
 if(v===null||v===undefined)return v;
 if(Array.isArray(v))return v.map(restoreComparable);
 if(typeof v==='object'){
  if(v?.toDate){try{return v.toDate().toISOString()}catch{}}
  if(typeof v.seconds==='number'&&typeof v.nanoseconds==='number')return new Date(v.seconds*1000+Math.floor(v.nanoseconds/1e6)).toISOString();
  const o={};for(const k of Object.keys(v).sort())if(!RESTORE_IGNORE_FIELDS.has(k))o[k]=restoreComparable(v[k]);return o
 }
 return v
}
function restoreRecordEqual(a,b){return JSON.stringify(restoreComparable(a))===JSON.stringify(restoreComparable(b))}
function restorePointSerializablePayload(){
 const modules={};for(const t of MODULES)modules[t]=(state.data[t]||[]).map(x=>({id:x.id,data:backupSerializable(x)}));
 return{format:'OBRATOP_RESTORE_POINT',schemaVersion:3,release:RELEASE,orgId:state.orgId,createdAt:new Date().toISOString(),modules,snapshots:(state.snapshots||[]).map(x=>({id:x.id,data:backupSerializable(x)})),engineering:engineeringArchiveSerializable(engineeringArchive)}
}
async function loadRestorePoints(){
 try{const qy=query(collection(fs,'organizations',state.orgId,'restorePoints'),orderBy('createdAt','desc')),s=await getDocs(qy);return s.docs.map(d=>({id:d.id,...d.data()}))}catch(e){console.error(e);return[]}
}
async function createRestorePoint(reason='Manual',opts={}){
 if(!isAdmin())return alert('Somente o Proprietário/Administrador pode criar pontos de restauração.');
 try{
  setSync('Criando ponto de restauração…','warn');
  if(!opts.skipRefresh)await refreshMaintenanceDataSilent();
  const payload=restorePointSerializablePayload(),raw=canonicalRestorePoint(payload),checksum=await sha256Text(raw),id=`rp_${restorePointNowFile()}`,chunkSize=180000,chunks=[];
  for(let i=0;i<raw.length;i+=chunkSize)chunks.push(raw.slice(i,i+chunkSize));
  const category=String(opts.category||'Manual'),protectedPoint=opts.protected===true||category==='Marco estável';
  await setDoc(doc(fs,'organizations',state.orgId,'restorePoints',id),{name:opts.name||`Ponto ${new Date().toLocaleString('pt-BR')}`,reason:String(reason||'Manual').slice(0,180),category,protected:protectedPoint,release:RELEASE,createdAt:payload.createdAt,createdBy:state.user.uid,checksum,totalChunks:chunks.length,totalRecords:MODULES.reduce((n,t)=>n+(state.data[t]||[]).length,0)+engineeringFlatRows(engineeringArchive).length,snapshotRecords:(state.snapshots||[]).length,engineeringRecords:engineeringFlatRows(engineeringArchive).length,status:'intact'});
  for(let i=0;i<chunks.length;i++)await setDoc(doc(fs,'organizations',state.orgId,'restorePoints',id,'chunks',String(i).padStart(4,'0')),{index:i,data:chunks[i]});
  await audit('restore-point-created','restorePoints',id,{reason,category,protected:protectedPoint,checksum,totalChunks:chunks.length});
  await enforceRestorePointRetention();
  setSync('Sincronizado','ok');toast('Ponto de restauração criado com sucesso.');return id
 }catch(e){console.error(e);setSync('Falha no ponto de restauração','bad');alert('Não foi possível criar o ponto de restauração: '+friendly(e));return null}
}
function canonicalRestorePoint(payload){const core={format:payload.format,schemaVersion:payload.schemaVersion,release:payload.release,orgId:payload.orgId,createdAt:payload.createdAt,modules:payload.modules,snapshots:payload.snapshots||[]};if(Number(payload.schemaVersion)>=3)core.engineering=payload.engineering||[];return JSON.stringify(core)}
async function refreshMaintenanceDataSilent(){
 const readable=MODULES.filter(canRead),results=await Promise.all(readable.map(async type=>{const s=await getDocs(query(collection(fs,'organizations',state.orgId,type),orderBy('createdAt','desc')));return[type,s.docs.map(d=>({id:d.id,...d.data()}))]}));
 for(const[type,rows]of results)state.data[type]=rows;
 const snaps=await getDocs(query(collection(fs,'organizations',state.orgId,'progressSnapshots'),orderBy('date','asc')));state.snapshots=snaps.docs.map(d=>({id:d.id,...d.data()}));await loadEngineeringArchive();state.lastSyncAt=new Date();localStorage.setItem('obratop-last-sync',state.lastSyncAt.toISOString())
}
async function readRestorePoint(rp){
 const s=await getDocs(query(collection(fs,'organizations',state.orgId,'restorePoints',rp.id,'chunks'),orderBy('index','asc'))),raw=s.docs.map(d=>d.data().data||'').join('');
 if(!raw||s.size!==Number(rp.totalChunks||0))throw Error('Ponto de restauração incompleto.');
 const checksum=await sha256Text(raw);if(checksum!==String(rp.checksum||'').toLowerCase())throw Error('Falha de integridade: checksum SHA-256 não confere.');
 const payload=JSON.parse(raw);if(payload.format!=='OBRATOP_RESTORE_POINT'||payload.orgId!==state.orgId)throw Error('Ponto de restauração inválido para esta organização.');return payload
}
function pointRowsFor(payload,t){if(t==='progressSnapshots')return payload.snapshots||[];if(t==='engineeringProjects')return engineeringFlatRows(payload.engineering||[]).map(x=>({id:x.id,data:x.data,path:x.path}));return(payload.modules?.[t])||[]}
function currentRowsFor(t){if(t==='progressSnapshots')return state.snapshots||[];if(t==='engineeringProjects')return engineeringFlatRows(engineeringArchive).map(x=>({id:x.id,data:x.data,path:x.path}));return state.data[t]||[]}
function restoreRowData(t,row){return t==='engineeringProjects'?(row?.data||{}):row}
function compareRestorePointImpact(payload,modules=restoreModulesForPayload(payload)){
 const byModule={},total={current:0,point:0,unchanged:0,restore:0,alter:0,trash:0};
 for(const t of modules){
  const pointRows=pointRowsFor(payload,t),curRows=currentRowsFor(t),snap=new Map(pointRows.map(x=>[x.id,x.data])),cur=new Map(curRows.map(x=>[x.id,x]));
  let unchanged=0,restore=0,alter=0,trash=0;
  for(const[id,data]of snap){const row=cur.get(id);if(!row)restore++;else if(restoreRecordEqual(data,backupSerializable(restoreRowData(t,row))))unchanged++;else alter++}
  for(const[id,row]of cur)if(!snap.has(id)&&!(t==='engineeringProjects'?restoreRowData(t,row).deleted:row.deleted))trash++;
  const m={current:curRows.length,point:pointRows.length,unchanged,restore,alter,trash,changes:restore+alter+trash};byModule[t]=m;
  for(const k of Object.keys(total))total[k]+=m[k]||0
 }
 const risk=total.trash>25||total.alter>50?'ALTO':(total.trash>0||total.alter>10||total.restore>20?'MÉDIO':'BAIXO');
 return{byModule,total,risk}
}
function impactBadge(risk){return risk==='BAIXO'?'<span class="badge ok">Risco BAIXO</span>':risk==='MÉDIO'?'<span class="badge warn">Risco MÉDIO</span>':'<span class="badge bad">Risco ALTO</span>'}
async function setRestorePointProtected(rp,flag){
 try{await updateDoc(doc(fs,'organizations',state.orgId,'restorePoints',rp.id),{protected:!!flag,category:flag?'Marco estável':(rp.category==='Marco estável'?'Manual':(rp.category||'Manual')),updatedAt:serverTimestamp(),updatedBy:state.user.uid});await audit(flag?'restore-point-protected':'restore-point-unprotected','restorePoints',rp.id,{release:rp.release});closeModal();openRestorePoints()}catch(e){alert('Não foi possível atualizar a proteção do ponto: '+friendly(e))}
}
function restoreHistoryRows(rows=[]){
 if(!rows.length&&isAdmin())rows=(state.audits||[]).filter(x=>x.action==='restore-point-restored').slice(0,8).map(x=>({at:x.at,pointId:x.recordId,modules:x.changes?.modules||[],restored:x.changes?.restored||0,altered:x.changes?.altered||0,trashed:x.changes?.trashed||0,diagnosisAfter:x.changes?.diagnosis||'—',userEmail:x.userEmail||''}));
 return rows.length?rows.map(x=>`<tr><td>${stamp(x.at)}</td><td><code>${esc(String(x.pointId||'').slice(0,22))}</code></td><td>${esc((x.modules||[]).map(restoreModuleLabel).join(', ')||'Completa')}</td><td>${x.restored||0}</td><td>${x.altered||0}</td><td>${x.trashed||0}</td><td>${esc(x.diagnosisAfter||'—')}</td><td>${esc(x.userEmail||'—')}</td></tr>`).join(''):'<tr><td colspan="8" class="muted">Nenhuma restauração executada ainda.</td></tr>'
}
async function openRestorePoints(){
 try{
  setSync('Carregando pontos…','warn');const [points,history]=await Promise.all([loadRestorePoints(),loadRestoreHistory()]);setSync('Sincronizado','ok');const admin=isAdmin();
  const undo=admin?points.find(x=>x.category==='Pré-restauração'||String(x.reason||'').startsWith('Automático antes de restaurar')):null;
  const rows=points.length?points.map((x,i)=>`<tr><td><b>${esc(new Date(x.createdAt).toLocaleString('pt-BR'))}</b><br><small>${esc(x.id)}</small></td><td>${esc(x.release||'—')}</td><td>${esc(x.category||'Manual')}<br><small>${esc(x.reason||'Manual')}</small></td><td>${x.totalRecords||0}</td><td>${x.protected?'<span class="badge ok">🛡 Marco estável</span>':'<span class="badge info">Recuperável</span>'}</td><td>${admin?`<button class="btn small rpView" data-i="${i}">Ver conteúdo</button> <button class="btn small restoreBtn rpRestore" data-i="${i}">↺ Restaurar</button> <button class="btn small rpProtect" data-i="${i}">${x.protected?'Desfixar':'🛡 Fixar'}</button>`:'<span class="muted">Somente consulta</span>'}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">Nenhum ponto de restauração criado ainda.</td></tr>';
  openModal(`<div class="sectiontitle">🛡️ Pontos de Restauração</div><p class="muted">${admin?'Administrador Geral: criação, proteção e restauração habilitadas.':'Consulta somente leitura. A criação, proteção, restauração e desfazer são exclusivas do Administrador Geral.'}</p><div style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap">${admin?'<button class="btn primary" id="rpCreateNow">＋ Criar ponto agora</button>':''}${undo?'<button class="btn restoreBtn" id="rpUndoLast">↶ Desfazer última restauração</button>':''}<span class="badge info">Retenção: ${RESTORE_RETENTION_LIMIT} recuperáveis + marcos protegidos</span></div><div class="tablewrap"><table><thead><tr><th>Data</th><th>Versão</th><th>Classificação / motivo</th><th>Registros</th><th>Proteção</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div><div class="sectiontitle" style="margin-top:16px">Histórico de restaurações</div><div class="tablewrap"><table><thead><tr><th>Data</th><th>Ponto</th><th>Módulos</th><th>Recriados</th><th>Alterados</th><th>Lixeira</th><th>Diagnóstico</th><th>Usuário</th></tr></thead><tbody>${restoreHistoryRows(history)}</tbody></table></div><div class="modal-actions"><button class="btn" id="rpClose">Fechar</button></div>`);
  $('#rpClose').onclick=closeModal;
  if(admin){$('#rpCreateNow').onclick=async()=>{const r=prompt('Identifique o motivo deste ponto de restauração:','Ponto manual antes de alterações');if(r===null)return;const id=await createRestorePoint(r,{category:'Manual'});if(id){closeModal();openRestorePoints()}};if($('#rpUndoLast'))$('#rpUndoLast').onclick=()=>previewRestorePoint(undo,true,true);$$('.rpView').forEach(b=>b.onclick=()=>previewRestorePoint(points[+b.dataset.i],false));$$('.rpRestore').forEach(b=>b.onclick=()=>previewRestorePoint(points[+b.dataset.i],true));$$('.rpProtect').forEach(b=>{const rp=points[+b.dataset.i];b.onclick=()=>setRestorePointProtected(rp,!rp.protected)})}
 }catch(e){console.error(e);setSync('Falha ao abrir pontos','bad');alert('Não foi possível abrir Pontos de Restauração: '+friendly(e))}
}
async function previewRestorePoint(rp,allowRestore,isUndo=false){
 try{
  setSync('Validando e comparando ponto…','warn');await refreshMaintenanceDataSilent();const p=await readRestorePoint(rp),restoreModules=restoreModulesForPayload(p),counts=restoreModules.map(t=>({t,n:pointRowsFor(p,t).length})).filter(x=>x.n),impact=compareRestorePointImpact(p,restoreModules);setSync('Sincronizado','ok');
  const countRows=counts.map(x=>`<tr><td>${esc(restoreModuleLabel(x.t))}</td><td>${x.n}</td></tr>`).join('');
  if(!allowRestore){openModal(`<div class="sectiontitle">🔎 Conteúdo do ponto</div><div class="restorePointSummary"><p><b>Data:</b> ${esc(new Date(rp.createdAt).toLocaleString('pt-BR'))}</p><p><b>Versão:</b> ${esc(rp.release||'—')}</p><p><b>Classificação:</b> ${esc(rp.category||'Manual')} ${rp.protected?'• 🛡 Marco estável':''}</p><p><b>Motivo:</b> ${esc(rp.reason||'Manual')}</p><p><b>SHA-256:</b> <code>${esc(rp.checksum||'')}</code></p></div><div class="tablewrap"><table><thead><tr><th>Módulo</th><th>Registros no ponto</th></tr></thead><tbody>${countRows}</tbody></table></div><div class="modal-actions"><button class="btn" id="rpBack">Voltar</button><button class="btn primary" id="rpCompare">Comparar com estado atual</button></div>`);$('#rpBack').onclick=()=>{closeModal();openRestorePoints()};$('#rpCompare').onclick=()=>previewRestorePoint(rp,true);return}
  const rows=restoreModules.map(t=>{const m=impact.byModule[t];return`<tr><td><label><input class="rpModule" type="checkbox" value="${esc(t)}" ${m.changes?'':'disabled'}> ${esc(restoreModuleLabel(t))}</label></td><td>${m.current}</td><td>${m.point}</td><td>${m.unchanged}</td><td>${m.restore}</td><td>${m.alter}</td><td>${m.trash}</td></tr>`}).join('');
  const t=impact.total;
  openModal(`<div class="sectiontitle">${isUndo?'↶ Desfazer última restauração':'↺ Restauração Assistida e Auditável'}</div><div class="restorePointSummary"><p><b>Ponto:</b> ${esc(new Date(rp.createdAt).toLocaleString('pt-BR'))} • versão ${esc(rp.release||'—')}</p><p><b>Motivo:</b> ${esc(rp.reason||'Manual')}</p><p><b>SHA-256:</b> <code>${esc(rp.checksum||'')}</code></p></div><div class="card" style="margin:10px 0"><div class="sectiontitle">Impacto previsto da restauração</div><div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center"><span>Estado atual: <b>${t.current}</b></span><span>Ponto: <b>${t.point}</b></span><span>Serão restaurados: <b>${t.restore}</b></span><span>Serão alterados: <b>${t.alter}</b></span><span>Irão para Lixeira: <b>${t.trash}</b></span>${impactBadge(impact.risk)}</div></div><div class="tablewrap"><table><thead><tr><th>Selecionar módulo</th><th>Atual</th><th>Ponto</th><th>Sem alteração</th><th>Restaurar</th><th>Alterar</th><th>Lixeira</th></tr></thead><tbody>${rows}</tbody></table></div><div style="margin:10px 0;display:flex;gap:8px"><button class="btn small" id="rpSelectAll">Selecionar afetados</button><button class="btn small" id="rpClearAll">Limpar seleção</button><button class="btn small" id="rpRecompare">↻ Recalcular comparação</button></div><div class="restoreSafe"><b>Proteções obrigatórias</b><p>✓ validação SHA-256<br>✓ comparação prévia do impacto<br>✓ ponto automático do estado atual antes da restauração<br>✓ restauração seletiva por módulo ou completa<br>✓ registros posteriores enviados à Lixeira, nunca apagados definitivamente<br>✓ Auditoria preservada e detalhada<br>✓ diagnóstico automático pós-restauração</p><label><input type="checkbox" id="rpAck"> Confirmo que revisei o impacto desta restauração.</label><div class="field"><label>Digite <b>RESTAURAR PONTO</b></label><input id="rpPhrase" autocomplete="off"></div></div><div class="modal-actions"><button class="btn" id="rpBack">Voltar</button><button class="btn" id="rpDoSelected">Restaurar módulos selecionados</button><button class="btn primary" id="rpDoRestore">Restaurar tudo</button></div>`);
  $('#rpBack').onclick=()=>{closeModal();openRestorePoints()};$('#rpSelectAll').onclick=()=>$$('.rpModule:not(:disabled)').forEach(x=>x.checked=true);$('#rpClearAll').onclick=()=>$$('.rpModule').forEach(x=>x.checked=false);$('#rpRecompare').onclick=()=>previewRestorePoint(rp,true,isUndo);
  $('#rpDoSelected').onclick=()=>{const mods=$$('.rpModule:checked').map(x=>x.value);if(!mods.length)return alert('Selecione pelo menos um módulo com alterações.');executeRestorePoint(rp,p,mods,'selective')};$('#rpDoRestore').onclick=()=>executeRestorePoint(rp,p,restoreModules,'full')
 }catch(e){console.error(e);setSync('Falha na validação','bad');alert('Não foi possível validar este ponto: '+friendly(e))}
}
async function executeRestorePoint(rp,payload,selectedModules=RESTORE_MODULES,mode='full'){
 if(!$('#rpAck')?.checked||String($('#rpPhrase')?.value||'').trim().toUpperCase()!=='RESTAURAR PONTO')return alert('Marque a confirmação e digite RESTAURAR PONTO.');
 const impact=compareRestorePointImpact(payload,selectedModules),t=impact.total,labels=selectedModules.map(restoreModuleLabel).join(', '),beforeScan=maintenanceScan(),diagnosisBefore=beforeScan.diagnosis;
 if(!confirm(`Restauração ${mode==='full'?'completa':'seletiva'}\n\nMódulos: ${labels}\nRestaurar: ${t.restore}\nAlterar: ${t.alter}\nEnviar à Lixeira: ${t.trash}\nRisco: ${impact.risk}\n\nAntes da primeira alteração será criado automaticamente um ponto de segurança do estado atual. Continuar?`))return;
 try{
  const safety=await createRestorePoint(`Automático antes de restaurar ${rp.id}`,{category:'Pré-restauração',protected:false});if(!safety)throw Error('O ponto de segurança obrigatório não pôde ser criado. Restauração cancelada.');
  setSync('Restaurando ponto…','warn');await refreshMaintenanceDataSilent();let restored=0,altered=0,trashed=0;
  for(const tpe of selectedModules){
   const pointRows=pointRowsFor(payload,tpe),curRows=currentRowsFor(tpe),snap=new Map(pointRows.map(x=>[x.id,x])),cur=new Map(curRows.map(x=>[x.id,x])),col=tpe==='progressSnapshots'?'progressSnapshots':tpe;
   for(const[id,item]of snap){const row=cur.get(id),data=item.data??item,ref=tpe==='engineeringProjects'?doc(fs,...item.path):doc(fs,'organizations',state.orgId,col,id);if(!row){await setDoc(ref,backupRevive(data),{merge:false});restored++}else if(!restoreRecordEqual(data,backupSerializable(restoreRowData(tpe,row)))){await setDoc(ref,backupRevive(data),{merge:false});altered++}}
   for(const[id,row]of cur)if(!snap.has(id)&&!(tpe==='engineeringProjects'?restoreRowData(tpe,row).deleted:row.deleted)){const ref=tpe==='engineeringProjects'?doc(fs,...row.path):doc(fs,'organizations',state.orgId,col,id);await updateDoc(ref,{deleted:true,deletedAt:serverTimestamp(),deletedReason:`Restauração ${mode} para ${rp.id}`,updatedAt:serverTimestamp(),updatedBy:state.user.uid});trashed++}
  }
  await refreshMaintenanceDataSilent();const d=maintenanceScan();const diagnosis=d.diagnosis||'—';
  const details={safetyPoint:safety,mode,modules:selectedModules,restored,altered,trashed,risk:impact.risk,diagnosisBefore,diagnosisAfter:diagnosis,criticalBefore:beforeScan.critical,warnBefore:beforeScan.warn,criticalAfter:d.critical,warnAfter:d.warn,pointChecksum:rp.checksum||'',pointRelease:rp.release||'',result:'success'};await audit('restore-point-restored','restorePoints',rp.id,{...details,diagnosis});await recordRestoreHistory(rp,details);
  closeModal();renderMaintenance();setSync('Sincronizado','ok');alert(`Restauração concluída e auditada.\n\n${restored} registro(s) recriado(s).\n${altered} registro(s) atualizado(s).\n${trashed} registro(s) posterior(es) enviado(s) à Lixeira.\nPonto de segurança anterior: ${safety}\nDiagnóstico pós-restauração: ${diagnosis}.\n\nNenhum registro foi excluído definitivamente.`)
 }catch(e){console.error(e);setSync('Falha na restauração','bad');alert('Restauração interrompida: '+friendly(e))}
}

function renderMaintenance(){
 const admin=isAdmin(),d=maintenanceScan(),lastSync=state.lastSyncAt||(()=>{const x=localStorage.getItem('obratop-last-sync');return x?new Date(x):null})(),lastBackup=d.lastBackup?.at?new Date(d.lastBackup.at):null;
 const modRows=[...MODULES,'engineeringProjects'].map(t=>{const m=d.byModule[t]||{active:0,trash:0,confirmed:0,possible:0,similar:0,orphans:0,inconsistencies:0};return`<tr><td>${esc(t==='engineeringProjects'?'Engenharia Inteligente':(schemas[t]?.title||t))}</td><td>${m.active}</td><td>${m.trash}</td><td class="${m.orphans?'dangertext':''}">${m.orphans}</td><td>${m.confirmed}</td><td>${m.possible}</td><td>${m.similar}</td><td>${m.inconsistencies}</td></tr>`}).join('');
 const issueRows=d.issues.length?d.issues.slice(0,200).map((x,i)=>`<tr><td>${x.severity==='critical'?'<span class="badge bad">Crítico</span>':x.severity==='warn'?'<span class="badge warn">Atenção</span>':'<span class="badge info">Informativo</span>'}</td><td>${esc(schemas[x.type]?.title||({members:'Equipe/Usuários',backup:'Backup',system:'Sistema',engineeringProjects:'Engenharia Inteligente'}[x.type]||x.type))}</td><td>${esc(x.kind)}</td><td>${esc(x.detail)}</td><td><code>${esc(String(x.id||'').slice(0,12))}</code>${x.peerId?` ↔ <code>${esc(String(x.peerId).slice(0,12))}</code>`:''}</td><td>${x.peerId?`<button class="btn small compareDup" data-i="${i}">Comparar A × B</button>`:'—'}</td></tr>`).join(''):'<tr><td colspan="6" class="oktext"><b>✓ Nenhuma inconsistência detectada nas verificações disponíveis.</b></td></tr>';
 const confirmed=d.issues.filter(x=>x.kind==='Duplicidade confirmada').length,possible=d.issues.filter(x=>x.kind==='Possível duplicidade').length,similar=d.issues.filter(x=>x.kind==='Registro semelhante').length,orphans=d.issues.filter(x=>x.kind==='Vínculo órfão').length,other=d.issues.filter(x=>!['Vínculo órfão','Duplicidade confirmada','Possível duplicidade','Registro semelhante'].includes(x.kind)&&x.severity!=='info').length;
 const sanitationAvailable=confirmed>0;
 const periodic=getLocalJson(integrityLocalKey()),external=latestExternalBackup(),externalAge=daysSince(external?.at);
 $('#content').innerHTML=head('Centro de Integridade e Manutenção','Diagnóstico inteligente da saúde técnica e da consistência dos dados do ObraTop',`<div class="module-actions"><button class="btn" id="maintenanceRefresh">↻ Verificar novamente</button>${admin?'<button class="btn backupBtn" id="maintenanceBackup">💾 Backup agora</button><button class="btn" id="externalBackupBtn">⬇ Backup externo</button>':''}<button class="btn" id="restorePointsBtn">🛡️ Pontos de restauração</button>${admin?`<button class="btn ${sanitationAvailable?'primary':'sanitationSafe'}" id="sanitizeDuplicates" ${sanitationAvailable?'':'disabled aria-disabled="true" title="O diagnóstico atual não possui duplicidades confirmadas."'}>${sanitationAvailable?'🧹 Saneamento em lote controlado':'✓ Nenhuma duplicidade a sanear'}</button>`:''}</div>`)+
 `<div class="card maintenanceHero"><div><div class="sectiontitle">Diagnóstico geral</div><div class="maintenanceDiagnosis">${diagBadge(d.diagnosis)}</div><p class="muted">Este diagnóstico avalia somente a integridade estrutural dos dados (vínculos, duplicidades, datas e estoque). Proteção e continuidade (backups) são avaliadas à parte, no cartão “Proteção e continuidade”. Os ${d.totalTrash} registro(s) preservados na Lixeira não são tratados como inconsistência; já um registro ativo que aponte para uma obra da Lixeira continua sendo apontado como vínculo órfão.</p></div><div class="maintenanceMeta"><b>Release ${esc(RELEASE)}</b><span>${esc(ENV_LABEL)}</span></div></div>`+
 `<div class="kpis maintenanceKpis"><div class="card kpi"><span>Versão instalada</span><strong>${esc(RELEASE)}</strong><small>${esc(ENV_LABEL)}</small></div><div class="card kpi"><span>Última sincronização</span><strong>${lastSync?lastSync.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</strong><small>${lastSync?lastSync.toLocaleDateString('pt-BR'):'Não identificada'}</small></div><div class="card kpi"><span>Último backup</span><strong>${lastBackup?lastBackup.toLocaleDateString('pt-BR'):'—'}</strong><small>${lastBackup?lastBackup.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Não identificado'}</small></div><div class="card kpi"><span>Registros ativos</span><strong>${d.totalActive}</strong><small>${d.totalTrash} na lixeira</small></div><div class="card kpi"><span>Ocorrências de integridade</span><strong>${d.critical+d.warn}</strong><small>${d.critical} críticas • ${d.warn} atenção • ${d.info} informativas</small></div></div>`+
 `<div class="grid charts maintenanceGrid"><div class="card"><div class="sectiontitle">Controles verificados</div><div class="maintenanceChecks"><p>✓ Integridade dos vínculos obra → módulos</p><p>✓ Compras → fornecedores</p><p>✓ Usuários → obra atribuída</p><p>✓ Duplicidade por pares e contexto da obra</p><p>✓ Identificadores únicos por módulo</p><p>✓ Comparação A × B antes de qualquer ação</p><p>✓ Datas, estoque e predecessoras</p><p>✓ Situação de sincronização</p><p>✓ Backup acompanhado separadamente em Proteção e continuidade</p></div></div><div class="card"><div class="sectiontitle">Resumo técnico inteligente</div><p><b>Órfãos:</b> ${orphans}</p><p><b>Duplicidades confirmadas:</b> ${confirmed}</p><p><b>Possíveis duplicidades:</b> ${possible}</p><p><b>Registros semelhantes:</b> ${similar} <span class="muted">(informativo)</span></p><p><b>Outras inconsistências:</b> ${other}</p><p><b>Snapshots Curva S:</b> ${(state.snapshots||[]).length}</p><p><b>Usuários ativos:</b> ${(state.members||[]).filter(x=>x.status==='active').length}</p><p><b>Eventos de auditoria carregados:</b> ${(state.audits||[]).length}</p></div></div></div>`+
 `<div class="grid charts maintenanceGrid"><div class="card"><div class="sectiontitle">Monitoramento periódico de integridade</div><p><b>Intervalo:</b> 15 minutos enquanto o ObraTop estiver aberto</p><p><b>Última verificação automática:</b> ${periodic?.at?new Date(periodic.at).toLocaleString('pt-BR'):'Ainda não executada'}</p><p><b>Integridade dos dados:</b> ${periodic?.diagnosis||'—'}</p><p class="muted">Somente diagnóstico. Nenhum dado de obra é corrigido ou excluído automaticamente.</p></div>${restoreTestCard()}<div class="card"><div class="sectiontitle">Proteção e continuidade</div><p><b>Status:</b> ${d.protectionDiagnosis==='Protegido'?'<span class="badge ok">✓ Protegido</span>':d.protectionDiagnosis==='Atenção'?'<span class="badge warn">⚠ Atenção</span>':'<span class="badge bad">⛔ Crítico</span>'}</p><p><b>Backup externo:</b> ${external?.at?new Date(external.at).toLocaleString('pt-BR'):'Não identificado'}</p><p><b>Idade:</b> ${externalAge===null?'—':externalAge+' dia(s)'}</p><p><b>SHA-256:</b> <code>${esc(String(external?.checksum||'—').slice(0,20))}${external?.checksum?'…':''}</code></p><p class="muted">Avisos de backup são exibidos aqui e não rebaixam a integridade estrutural dos dados.</p></div></div>`+
 `<div class="card"><div class="sectiontitle">Integridade por módulo</div><div class="tablewrap"><table><thead><tr><th>Módulo</th><th>Ativos</th><th>Lixeira</th><th>Órfãos</th><th>Duplic. confirmadas</th><th>Possíveis</th><th>Semelhantes</th><th>Outras</th></tr></thead><tbody>${modRows}</tbody></table></div><p class="muted" style="margin-top:10px">Semelhantes indicam registros de natureza parecida, mas com diferenças de conteúdo. Não são considerados erro nem duplicidade.</p></div>`+
 `<div class="card"><div class="sectiontitle">Ocorrências encontradas</div><div class="tablewrap"><table><thead><tr><th>Nível</th><th>Módulo</th><th>Tipo</th><th>Descrição</th><th>Registros</th><th>Análise</th></tr></thead><tbody>${issueRows}</tbody></table></div><p class="muted" style="margin-top:12px">O Centro de Integridade é somente diagnóstico: não corrige nem exclui registros automaticamente. Antes de excluir qualquer registro, compare os dados e faça um backup profissional.</p></div>`;
 $('#maintenanceRefresh').onclick=async()=>{await refreshMaintenanceData();await runPeriodicIntegrityCheck(true)};if($('#maintenanceBackup'))$('#maintenanceBackup').onclick=exportProfessionalBackup;if($('#externalBackupBtn'))$('#externalBackupBtn').onclick=exportExternalBackup;$('#restorePointsBtn').onclick=openRestorePoints;{const rt=$('#restoreTestBtn');if(rt)rt.onclick=async()=>{rt.disabled=true;rt.textContent='Testando…';const pts=await loadRestorePoints();if(!pts.length){rt.disabled=false;rt.textContent='Testar restauração agora';return alert('Ainda não há ponto de restauração. Crie um em “Pontos de restauração”.')}await testRestorePoint(pts[0]);renderMaintenance()}}if($('#sanitizeDuplicates')&&sanitationAvailable&&admin)$('#sanitizeDuplicates').onclick=sanitizeAllConfirmedDuplicates;$$('.compareDup').forEach(b=>b.onclick=()=>{const x=d.issues[+b.dataset.i];if(x?.peerId)openDuplicateCompare(x.type,x.id,x.peerId,x.kind)})
}

// ===== Logo e identidade da empresa (V3.27) =====
function orgLogo(){const b=state.org?.branding;return b&&brand.isValidLogo(b.logo)?b:null}
function applyBranding(){
 const b=orgLogo(),img=$('#orgLogo');
 if(img){if(b){img.src=b.logo;img.alt='Logo de '+(state.org?.name||'');img.hidden=false}else{img.hidden=true;img.removeAttribute('src')}}
 try{if(b)localStorage.setItem('obratop-brand-cache',JSON.stringify({logo:b.logo,name:state.org?.name||''}));else localStorage.removeItem('obratop-brand-cache')}catch{}
 fillPrintBrand()
}
function companyInfo(){const o=state.org||{};return{name:o.name||'ObraTop',cnpj:o.cnpj||'',address:o.companyAddress||'',phone:o.companyPhone||'',email:o.companyEmail||''}}
function cssStr(t){return String(t).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]+/g,' ')}
function armPrintHeader(title=''){
 fillPrintBrand(title);const root=document.documentElement;root.classList.remove('printMB','printFx');root.classList.add('printHdr');
 document.getElementById('printPageStyle')?.remove();if(state.route==='manual')return;   // o Manual tem diagramação própria
 const b=orgLogo(),c=companyInfo(),t=title||document.querySelector('#content h1')?.textContent||'',left=[c.name,...brand.companyLines(c)],right=[t,new Date().toLocaleString('pt-BR'),`ObraTop V${RELEASE} • ${ENV_LABEL}`],txt=a=>'"'+a.map(cssStr).join('\\A ')+'"';
 const F='font:11px/1.4 "Segoe UI Variable Text","Segoe UI",Arial,sans-serif;color:#1a1a1a;vertical-align:middle;white-space:pre-wrap';
 let css;
 if(window.CSSMarginRule){   // Chrome/Edge 131+: cabeçalho nas margens da página, repetido em TODAS as páginas
  root.classList.add('printMB');
  css=`@page{size:A4;margin:36mm 10mm 14mm;${b?`@top-left{content:"";width:64mm;background:url("${b.logo}") no-repeat left center;background-size:60mm 22mm}`:''}@top-center{content:${txt(left)};text-align:left;${F}}@top-right{content:${txt(right)};text-align:right;width:52mm;${F}}}`
 }else{root.classList.add('printFx');css='@page{size:A4;margin:38mm 10mm 14mm}'}   // reserva: cabeçalho fixo
 const st=document.createElement('style');st.id='printPageStyle';st.textContent=css;document.head.appendChild(st)
}
function disarmPrintHeader(){document.documentElement.classList.remove('printHdr');document.getElementById('printPageStyle')?.remove()}
function fillPrintBrand(title=''){
 const el=$('#printBrand');if(!el)return;const b=orgLogo(),t=title||document.querySelector('#content h1')?.textContent||'',c=companyInfo();
 el.innerHTML=`<div class="printBrandIn">${b?`<img src="${b.logo}" alt="">`:''}<div class="printOrg"><b>${esc(c.name)}</b>${brand.companyLines(c).map(l=>`<br><small>${esc(l)}</small>`).join('')}</div><div class="printMeta"><b>${esc(t)}</b><br><small>${new Date().toLocaleString('pt-BR')}</small><br><small>ObraTop V${esc(RELEASE)} • ${esc(ENV_LABEL)}</small></div></div>`
}
function showAuthBrand(){try{const c=JSON.parse(localStorage.getItem('obratop-brand-cache')||'null'),el=$('#authLogo');if(el&&c&&brand.isValidLogo(c.logo)){el.src=c.logo;el.alt='Logo de '+(c.name||'');el.hidden=false}}catch{}}
function logoCardHtml(admin){
 const b=orgLogo();
 return`<div class="card logoCard"><div class="sectiontitle">Logo da empresa</div><div class="logoPreview">${b?'':'<span class="muted" id="logoEmpty">Nenhum logo cadastrado.</span>'}<img id="logoPreviewImg" ${b?`src="${b.logo}"`:'hidden'} alt="Logo atual"></div><p class="muted">Aparece no cabeçalho de todas as telas, na tela de entrada, na impressão e nos PDFs. Use PNG (melhor para fundo transparente) ou JPG, até 5 MB. O app reduz a imagem para no máximo 480×160 px.</p>${admin?`<div class="logoActions"><input type="file" id="logoFile" accept="image/png,image/jpeg"><button class="btn primary" id="logoSave" disabled>Salvar logo</button>${b?'<button class="btn danger" id="logoRemove">Remover logo</button>':''}</div><p class="muted" id="logoInfo"></p>`:'<p class="muted">Somente o administrador altera o logo.</p>'}</div>`
}
let LOGO_PENDING=null;
function bindLogoCard(){
 const f=$('#logoFile');if(!f)return;
 const showPending=()=>{const p=LOGO_PENDING;if(!p)return;const im=$('#logoPreviewImg');im.src=p.dataUrl;im.hidden=false;const em=$('#logoEmpty');if(em)em.hidden=true;$('#logoInfo').textContent=`Pré-visualização: ${p.w}×${p.h} px, ${p.kb} KB. Clique em Salvar para aplicar.`;$('#logoSave').disabled=false};
 if(LOGO_PENDING&&Date.now()-LOGO_PENDING.at>600000)LOGO_PENDING=null;   // descarta seleção esquecida há mais de 10 min
 showPending();                                                          // a tela é redesenhada quando chegam dados: a imagem já processada é mantida
 f.onchange=async()=>{LOGO_PENDING=null;$('#logoSave').disabled=true;$('#logoInfo').textContent='';const file=f.files[0];if(!file)return;
  try{const p=await brand.processLogoFile(file);LOGO_PENDING={...p,at:Date.now()};showPending()}
  catch(e){f.value='';LOGO_PENDING=null;alert(e.message||'Não foi possível usar esta imagem.')}};
 $('#logoSave').onclick=async()=>{const pending=LOGO_PENDING;if(!pending||!isAdmin())return;
  try{const branding={logo:pending.dataUrl,w:pending.w,h:pending.h,name:pending.name,updatedAtISO:new Date().toISOString(),byEmail:state.user.email||''};await updateDoc(doc(fs,'organizations',state.orgId),{branding,updatedAt:serverTimestamp()});LOGO_PENDING=null;state.org.branding=branding;await audit('branding-logo','organizations',state.orgId,{acao:'definir',arquivo:pending.name,kb:pending.kb});applyBranding();toast('Logo salvo.');renderSettings()}catch(e){alert(friendly(e))}};
 const rm=$('#logoRemove');if(rm)rm.onclick=async()=>{if(!confirm('Remover o logo da empresa?'))return;try{await updateDoc(doc(fs,'organizations',state.orgId),{branding:null,updatedAt:serverTimestamp()});LOGO_PENDING=null;state.org.branding=null;await audit('branding-logo','organizations',state.orgId,{acao:'remover'});applyBranding();toast('Logo removido.');renderSettings()}catch(e){alert(friendly(e))}}
}

// ===== Visualização para smartphone (V3.29) =====
const BN_ITEMS=[['dashboard','Painel'],['works','Obras'],['activities','Cronograma'],['alerts','Alertas']];
function updateViewButton(){
 const v=mob.getView(),b=$('#viewBtn');if(!b)return;
 b.innerHTML=ico(v.mobile?'monitor':'phone',20);
 const t=v.mobile?'Mudar para a visualização de computador':'Mudar para a visualização de smartphone';b.title=t;b.setAttribute('aria-label',t);
 const d=$('#drvView');if(d)d.innerHTML=`${ico(v.mobile?'monitor':'phone',18)} ${v.mobile?'Visualização de computador':'Visualização de smartphone'}`
}
function toggleDrawer(force){
 const sb=$('#sidebar'),bk=$('#drawerBack');if(!sb)return;
 const open=force!==undefined?force:!sb.classList.contains('open');sb.classList.toggle('open',open);if(bk)bk.classList.toggle('show',open&&mob.getView().mobile)
}
function buildDrawerFoot(){
 const sb=$('#sidebar');if(!sb)return;
 sb.insertAdjacentHTML('beforeend',`<div class="drawerFoot"><div class="drvUser"><b>${esc(state.user?.email||'')}</b><small>${esc(roleName(state.member?.role))}</small></div><button class="btn" id="drvTheme" type="button">${ico('moon',18)} Tema claro/escuro</button><button class="btn" id="drvView" type="button"></button><button class="btn danger" id="drvLogout" type="button">${ico('logout',18)} Sair</button></div>`);
 $('#drvTheme').onclick=()=>$('#themeBtn').click();$('#drvView').onclick=()=>$('#viewBtn').click();$('#drvLogout').onclick=()=>$('#logoutBtn').click();updateViewButton()
}
function buildBottomNav(){
 const bn=$('#bottomNav');if(!bn)return;const ok=new Set([...$$('.navbtn')].map(b=>b.dataset.route));
 bn.innerHTML=BN_ITEMS.filter(([r])=>ok.has(r)).map(([r,t])=>`<button class="bnItem" type="button" data-route="${r}" aria-label="${t}">${ico(r,22)}<span>${t}</span>${r==='alerts'?'<i class="bnBadge" id="bnAlertCount"></i>':''}</button>`).join('')+`<button class="bnItem" type="button" data-more="1" aria-label="Mais opções">${ico('menu',22)}<span>Mais</span></button>`;
 bn.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>route(b.dataset.route));bn.querySelector('[data-more]').onclick=()=>toggleDrawer();
 syncBottomNav();updateAlertIndicator()
}
function syncBottomNav(){
 const r=state.route,main=BN_ITEMS.map(x=>x[0]);
 document.querySelectorAll('.bnItem[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
 const more=document.querySelector('.bnItem[data-more]');if(more)more.classList.toggle('active',!main.includes(r))
}
function updateFiltersSummary(){
 const t=$('#filtersToggle'),g=$('#globalFilters');if(!t||!g)return;
 const sel=$('#filterWork'),name=sel&&sel.selectedIndex>=0?sel.options[sel.selectedIndex].text:'Todas as obras',f=state.filters||{},n=[f.from,f.to,f.search].filter(Boolean).length,open=g.classList.contains('open');
 t.innerHTML=`${ico('filter',16)}<span class="ftLabel">${esc(name)}${n?` · ${n} filtro(s)`:''}</span><span class="ftCaret">${open?'▴':'▾'}</span>`;t.setAttribute('aria-expanded',open?'true':'false')
}
function viewCardHtml(){
 const v=mob.getView(),p=mob.getPref();
 return`<div class="card viewCard"><div class="sectiontitle">Visualização (computador ou smartphone)</div><p class="muted">Escolha como o ObraTop aparece neste aparelho. Dá para alternar a qualquer momento pelo botão ${ico('phone',16)} da barra superior.</p><div class="viewOptions">${[['auto','Automático','Escolhe sozinho pelo tamanho da tela'],['desktop','Computador','Layout completo, com menu lateral'],['mobile','Smartphone','Menu inferior, cartões e botões maiores']].map(([k,t,d])=>`<label class="viewOpt ${p===k?'on':''}"><input type="radio" name="viewPref" value="${k}" ${p===k?'checked':''}><b>${t}</b><small>${d}</small></label>`).join('')}</div><p class="muted">Agora: <b>${v.mobile?'smartphone':'computador'}${v.landscape?' (horizontal)':''}</b> — janela de ${window.innerWidth}×${window.innerHeight} px.</p></div>`
}

// ===== Orçamentos: sub-abas e "Criar novo orçamento" (V3.31) =====
function budgetTabsHtml(tab){return`<div class="subtabs" role="tablist" aria-label="Orçamentos"><button class="subtab ${tab==='list'?'active':''}" role="tab" aria-selected="${tab==='list'}" data-tab="list" type="button">Orçamentos</button><button class="subtab ${tab==='builder'?'active':''}" role="tab" aria-selected="${tab==='builder'}" data-tab="builder" type="button">Criar novo orçamento</button><button class="subtab ${tab==='plan'?'active':''}" role="tab" aria-selected="${tab==='plan'}" data-tab="plan" type="button">Planejamento e quantitativos</button></div>`}
function bindBudgetTabs(){$$('.subtab').forEach(b=>b.onclick=()=>{if(state.budgetTab===b.dataset.tab)return;state.budgetTab=b.dataset.tab;render()})}
const fileSafeX=n=>fileSafe(String(n).slice(0,80));
function budgetCtx(){return{
 orgId:()=>state.orgId,works:()=>(state.data.works||[]).filter(w=>!w.deleted),canCreate:()=>canCreate('budgets'),toast,alert:m=>alert(m),confirm:m=>confirm(m),
 pdfLines:async(file,cb)=>(await engineeringPdfText(file,cb)).lines.map(l=>l.text),
 saveBudget:saveBudgetItems,goList:()=>{state.budgetTab='list';render()},goPlan:wid=>{planUi.setWork(wid);state.budgetTab='plan';render()},
 exportAoa:exportAoa,
 exportSheetPdf:({title,subtitle,sheet,valorExtenso,showEtapaTotal,note,fileName})=>pdfDoc('p',d=>brand.buildSheetPdf(d,{...pdfBase(title,subtitle),sheet,valorExtenso,showEtapaTotal,note}),fileName),
 exportCpuPdf:({title,subtitle,blocks,fileName})=>pdfDoc('p',d=>brand.buildCpuPdf(d,{...pdfBase(title,subtitle),blocks}),fileName)}}
function pdfBase(title,subtitle){const lg=orgLogo(),c=companyInfo();return{title,subtitle,orgName:c.name,cnpj:c.cnpj,address:c.address,phone:c.phone,email:c.email,generatedAt:'Gerado em '+new Date().toLocaleString('pt-BR'),release:RELEASE,logo:lg?{dataUrl:lg.logo,w:lg.w,h:lg.h}:null}}
function pdfDoc(orient,fn,fileName){if(!window.jspdf?.jsPDF)return alert('Biblioteca PDF não carregada. Verifique a conexão com a internet.');const d=new window.jspdf.jsPDF({orientation:orient,unit:'mm',format:'a4'});fn(d);downloadBlob(new Blob([d.output('arraybuffer')],{type:'application/pdf'}),`${fileSafeX(fileName)}_${today()}.pdf`)}
function exportAoa(aoa,{sheet,name,cols,merges}){if(!window.XLSX)return alert('Biblioteca Excel não carregada. Verifique a conexão com a internet.');const ws=window.XLSX.utils.aoa_to_sheet(aoa),wb=window.XLSX.utils.book_new();if(cols)ws['!cols']=cols.map(w=>({wch:w}));if(merges)ws['!merges']=merges;window.XLSX.utils.book_append_sheet(wb,ws,String(sheet).slice(0,31));window.XLSX.writeFile(wb,`${fileSafeX(name)}_${today()}.xlsx`)}
function exportBook(sheets,name){if(!window.XLSX)return alert('Biblioteca Excel não carregada. Verifique a conexão com a internet.');const wb=window.XLSX.utils.book_new();for(const sh of sheets){const ws=window.XLSX.utils.aoa_to_sheet(sh.aoa);if(sh.cols)ws['!cols']=sh.cols.map(w=>({wch:w}));window.XLSX.utils.book_append_sheet(wb,ws,String(sh.name).slice(0,31))}window.XLSX.writeFile(wb,`${fileSafeX(name)}_${today()}.xlsx`)}
function planCtx(){return{baseline:wid=>{const w=(state.data.works||[]).find(x=>x.id===wid&&!x.deleted);return w?.baseline?{revision:w.baseline.revision,date:w.baseline.date,reason:w.baseline.reason||'',items:w.baseline.items||{},history:(w.baselineHistory||[]).length}:null},isAdmin:()=>isAdmin(),freezeBaseline:async wid=>{state.filters.workId=wid;const sel=$('#filterWork');if(sel)sel.value=wid;await freezeBaseline();render()},works:()=>(state.data.works||[]).filter(w=>!w.deleted),budgets:wid=>(state.data.budgets||[]).filter(b=>b.workId===wid),activities:wid=>(state.data.activities||[]).filter(a=>a.workId===wid),
 defaultWork:()=>$('#filterWork')?.value||'',canEdit:()=>canCreate('budgets'),toast,alert:m=>alert(m),confirm:m=>confirm(m),saveReal:saveRealQty,exportBook,
 goGantt:wid=>{const sel=$('#filterWork');if(sel){sel.value=wid;sel.dispatchEvent(new Event('change'))}route('activities')}}}
async function saveRealQty(upds){
 if(!canCreate('budgets'))throw new Error('Seu perfil não pode gravar o realizado.');
 const ids=new Set((state.data.budgets||[]).filter(b=>!b.deleted).map(b=>b.id));
 for(const part of calc.chunk(upds,400)){const bt=writeBatch(fs),now=serverTimestamp();for(const u of part){if(!ids.has(u.id)||!/^\d{4}-\d{2}$/.test(u.month)||!(u.qty>=0))throw new Error('Dado inválido no lançamento.');bt.set(doc(fs,'organizations',state.orgId,'budgets',u.id),{real:{[u.month]:u.qty},updatedAt:now,updatedBy:state.user.uid},{merge:true})}await bt.commit()}
 await addDoc(collection(fs,'organizations',state.orgId,'audits'),auditPayload('update','budgets','realizado',{mes:upds[0]?.month,itens:upds.length}))
}
function renderBudgetsHub(){
 const tab=state.budgetTab||'list';
 if(tab==='builder'){const root=$('#bbRoot');if(root&&root.dataset.mounted){orcUi.refreshWorks(budgetCtx());return}
  $('#content').innerHTML=head('Orçamentos','Monte orçamentos com as bases SINAPI e ORSE ou com itens próprios')+budgetTabsHtml('builder')+'<div id="bbRoot"></div>';bindBudgetTabs();orcUi.mount($('#bbRoot'),budgetCtx());return}
 if(tab==='plan'){const root=$('#plRoot');if(root&&root.dataset.mounted){planUi.refresh(planCtx());return}
  $('#content').innerHTML=head('Orçamentos','Planejamento a partir do orçamento: EAP, curva S, curvas ABC e quantitativos previsto x realizado')+budgetTabsHtml('plan')+'<div id="plRoot"></div>';bindBudgetTabs();planUi.mount($('#plRoot'),planCtx());return}
 renderModule('budgets');const h=document.querySelector('#content .hero');if(h)h.insertAdjacentHTML('afterend',budgetTabsHtml('list'));bindBudgetTabs()
}
async function saveBudgetItems({workId,name,bdi,mode,etapas,items,numbers,plan}){
 if(!canCreate('budgets'))throw new Error('Seu perfil não pode criar orçamentos.');
 const work=(state.data.works||[]).find(w=>w.id===workId&&!w.deleted);if(!work)throw new Error('Obra não encontrada.');
 if(!items.length||items.length>2000)throw new Error('O orçamento deve ter entre 1 e 2.000 serviços.');
 const etNo={},etName={};etapas.forEach((e,i)=>{etNo[e.id]=`${i+1}.0`;etName[e.id]=String(e.name||'').slice(0,80)});
 for(const i of items)if(!etNo[i.etapaId])throw new Error('Há serviço sem etapa.');
 const col=n=>collection(fs,'organizations',state.orgId,n),u=state.user.uid,refs=items.map(()=>({b:doc(col('budgets')),a:doc(col('activities'))}));
 let sch=null;const byId={};items.forEach((i,k)=>byId[i.id]=k);
 if(plan){sch=orc.scheduleBudget(etapas,items.map(i=>({id:i.id,etapaId:i.etapaId,qty:i.qty,price:i.price,composition:i.composition})),{start:plan.start,end:plan.end,overlap:plan.overlap,lag:plan.lag});
  if(!sch.fits)throw new Error(`O prazo informado é curto demais para ${items.length} serviços (mínimo de ${sch.workdays} dias úteis nesta sequência). Aumente o prazo ou reduza a sobreposição.`)}
 const pred={};if(sch){let prevEt=null;const byEt={},st=Object.fromEntries(sch.tasks.map(t=>[t.id,t.start])),link=(a,b)=>mspj.fmtPred([{code:numbers[a.id],type:'SS',lag:Math.max(0,orc.workdayDelta(st[a.id],st[b.id]))}]);   // início-início com defasagem: reproduz a sobreposição do cronograma gerado
  for(const e of etapas)byEt[e.id]=items.filter(i=>i.etapaId===e.id);
  for(const e of etapas){const its=byEt[e.id];its.forEach((i,j)=>{if(j>0)pred[i.id]=link(its[j-1],i);else if(prevEt&&byEt[prevEt.id].length)pred[i.id]=link(byEt[prevEt.id][0],i)});if(its.length)prevEt=e}}
 const meta=()=>{const now=serverTimestamp();return{createdAt:now,createdBy:u,updatedAt:now,updatedBy:u,deleted:false}};
 let fim='',baseItems={};
 for(let p=0;p<items.length;p+=120){const bt=writeBatch(fs);
  items.slice(p,p+120).forEach((i,j)=>{const k=p+j,r=refs[k],cp=i.cpu?{cpu:i.cpu.lines.slice(0,80).map(l=>({t:l.tipo==='INSUMO'?'I':'C',c:String(l.code),d:String(l.desc).slice(0,120),u:String(l.unit||''),k:l.coef,p:l.price})),cpuTotal:Math.round(i.cpu.total*1e4)/1e4}:{};
   bt.set(r.b,{workId,category:etName[i.etapaId],description:`${i.code?i.code+' — ':''}${i.desc}`.slice(0,500),unit:String(i.unit||'').slice(0,20),qty:+i.qty,unitValue:+i.price,bdi:+bdi,budgetName:String(name).slice(0,120),itemNo:numbers[i.id],etapaNo:etNo[i.etapaId],etapa:etName[i.etapaId],sub:String(i.sub||'').slice(0,100),bdiMode:mode,source:i.src,sourceCode:String(i.code||''),sourceRef:String(i.ref||''),...(i.composition?.length?{composition:i.composition.slice(0,60)}:{}),...cp,real:{},...meta()});
   if(sch){const t=sch.tasks.find(x=>x.id===i.id),ph=etapas.findIndex(e=>e.id===i.etapaId)+1,sale=Math.round(i.qty*i.price*(1+bdi/100)*100)/100;fim=t.end>fim?t.end:fim;baseItems[r.a.id]={s:t.start,e:t.end,w:sale};
    bt.set(r.a,{workId,wbs:numbers[i.id],name:`${i.sub?i.sub+' — ':''}${i.desc}`.slice(0,150),start:t.start,end:t.end,durationDays:t.days,progressMode:'Percentual',progress:0,plannedQty:+i.qty,actualQty:0,unit:String(i.unit||'').slice(0,20),predecessors:pred[i.id]||'',responsible:'',budgetId:r.b.id,status:'Não iniciada',eapRoot:'1',eapPhase:`1.${ph}`,eapPhaseCode:etNo[i.etapaId],eapPhaseName:etName[i.etapaId],crew:t.crew,laborHours:t.hours,...meta()})}});
  if(p+120>=items.length)bt.set(doc(col('audits')),auditPayload('create','budgets',workId,{orcamento:name,itens:items.length,etapas:etapas.length,bdi,origem:'Criar novo orçamento',planejamento:!!plan}));
  await bt.commit()}
 if(plan&&plan.baseline)await updateDoc(doc(fs,'organizations',state.orgId,'works',workId),{baseline:{revision:1,date:today(),reason:'Linha de base inicial (orçamento por etapas)',byEmail:state.user.email||'',items:baseItems},baselineHistory:[],updatedAt:serverTimestamp(),updatedBy:u});
 return{atividades:sch?items.length:0,fim}
}
function wordHeaderHtml(){const b=orgLogo(),c=companyInfo();return`<table width="100%" style="border:none;border-bottom:2px solid #0b3654"><tr>${b?`<td width="1%"><img src="${b.logo}" height="48" alt=""></td>`:''}<td><b>${esc(c.name)}</b>${brand.companyLines(c).map(l=>`<br>${esc(l)}`).join('')}</td></tr></table>`}
async function saveCompanyData(){
 const v=id=>($(id).value||'').trim(),email=v('#coEmail');
 if(!brand.validEmail(email))return alert('Informe um e-mail válido (exemplo: contato@empresa.com.br).');
 const data={cnpj:brand.formatCnpj(v('#coCnpj')),companyAddress:v('#coAddress').slice(0,200),companyPhone:v('#coPhone').slice(0,40),companyEmail:email.slice(0,120),defaultEngineer:v('#defEngineer').slice(0,120)};
 try{await updateDoc(doc(fs,'organizations',state.orgId),{...data,updatedAt:serverTimestamp()});Object.assign(state.org,data);await audit('config-empresa','organizations',state.orgId,data);applyBranding();toast('Dados da empresa salvos.');renderSettings()}catch(e){alert(friendly(e))}
}
function renderSettings(){const admin=isAdmin();$('#content').innerHTML=head('Configurações','Empresa, aparência e proteção de dados')+`<div class="grid charts"><div class="card"><div class="sectiontitle">Empresa</div><p><b>${esc(state.org.name)}</b></p><p>CNPJ: ${esc(state.org.cnpj||'Não informado')}</p><p>Ambiente: ${esc(state.orgId)}</p>${admin?`<div class="companyForm"><p class="muted">Estes dados aparecem no cabeçalho de todos os relatórios e páginas impressas.</p><div class="field"><label for="coCnpj">CNPJ</label><input id="coCnpj" maxlength="24" value="${esc(state.org.cnpj||'')}" placeholder="00.000.000/0000-00"></div><div class="field"><label for="coAddress">Endereço</label><input id="coAddress" maxlength="200" value="${esc(state.org.companyAddress||'')}" placeholder="Rua, número, bairro, cidade/UF"></div><div class="field"><label for="coPhone">Telefone de contato</label><input id="coPhone" maxlength="40" value="${esc(state.org.companyPhone||'')}" placeholder="(00) 00000-0000"></div><div class="field"><label for="coEmail">E-mail</label><input id="coEmail" type="email" maxlength="120" value="${esc(state.org.companyEmail||'')}" placeholder="contato@empresa.com.br"></div><div class="field"><label for="defEngineer">Engº responsável padrão (usado quando a obra não tem engenheiro)</label><input id="defEngineer" maxlength="120" value="${esc(state.org.defaultEngineer||'')}" placeholder="Ex.: Engº Nome Sobrenome"></div><button class="btn primary" id="saveCompany" type="button">Salvar dados da empresa</button></div>`:`${brand.companyLines(companyInfo()).map(l=>`<p>${esc(l)}</p>`).join('')}<p>Engº responsável padrão: ${esc(state.org.defaultEngineer||'Não informado')}</p>`}</div><div class="card"><div class="sectiontitle">Segurança</div><p>✓ Acesso isolado por empresa</p><p>✓ Acesso de escrita limitado à obra atribuída</p><p>✓ Demais obras em modo somente leitura</p><p>✓ Auditoria de alterações</p><p>✓ HTTPS e cache offline</p><p class="muted">Ative App Check e MFA no Firebase após validar todos os dispositivos.</p></div><div class="card"><div class="sectiontitle">Backup e restauração</div><p class="muted">Backup profissional com data/hora, checksum SHA-256 e IDs originais. Restauração segura valida o arquivo e preserva dados existentes por padrão.</p><button class="btn backupBtn" id="allCsv">💾 Gerar backup</button> ${admin?'<button class="btn" id="settingsExternalBackup">⬇ Backup externo</button><button class="btn restoreBtn" id="settingsRestore">↺ Restaurar</button>':'<button class="btn" id="settingsRestorePoints">🛡 Consultar pontos</button>'}</div>${viewCardHtml()}${logoCardHtml(admin)}${admin?`<div class="card"><div class="sectiontitle">Código da organização</div><p>Use convites pela tela Equipe. Não compartilhe este identificador publicamente.</p><code>${esc(state.orgId)}</code></div>`:''}</div>`;$('#allCsv').onclick=exportProfessionalBackup;bindLogoCard();if($('#saveCompany'))$('#saveCompany').onclick=saveCompanyData;document.querySelectorAll('input[name=viewPref]').forEach(r=>r.onchange=()=>{mob.setPref(r.value);renderSettings()});if($('#settingsExternalBackup'))$('#settingsExternalBackup').onclick=exportExternalBackup;if($('#settingsRestore'))$('#settingsRestore').onclick=pickProfessionalRestore;if($('#settingsRestorePoints'))$('#settingsRestorePoints').onclick=openRestorePoints}
function toast(t){$('#toastRoot').innerHTML=`<div class="toast">${esc(t)}</div>`;setTimeout(()=>$('#toastRoot').innerHTML='',2500)}

/* =============================================================
   ObraTop 3.18.0 — Engenharia Inteligente de Projetos
   PDF -> quantitativos -> composições -> orçamento/EAP/recursos
   ============================================================= */
const ENGINEERING_PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs';
const ENGINEERING_PDFWORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
const ENGINEERING_MAX_FILES=20;
const ENGINEERING_MAX_TAKEOFFS=1200;
const ENGINEERING_INTERNAL_BDI=20;

const ENGINEERING_DISCIPLINES=[
 {key:'arquitetura',label:'Arquitetônico',rx:/arquitet|planta baixa|fachada|corte|layout|alvenaria|esquadria|piso|revestimento|forro|pintura/i},
 {key:'estrutural',label:'Estrutural',rx:/estrutur|fund[aã]ç|sapata|estaca|bloco|viga|pilar|laje|armadura|concreto|forma/i},
 {key:'eletrica',label:'Elétrico',rx:/el[eé]tric|tomada|lumin[aá]ria|eletroduto|quadro|disjuntor|circuito|cabo|condutor/i},
 {key:'hidrossanitario',label:'Hidrossanitário',rx:/hidro|sanit[aá]r|[aá]gua fria|esgoto|tubula[cç][aã]o|tubo|registro|lou[cç]a|ralo/i},
 {key:'incendio',label:'Incêndio',rx:/inc[eê]ndio|hidrante|sprinkler|extintor|detector|alarme|bomba de inc[eê]ndio|sa[ií]da de emerg/i},
 {key:'dados',label:'Lógica / Telefonia',rx:/l[oó]gica|dados|telefon|telecom|rack|rj-?45|cabeamento estruturado|fibra [oó]ptica/i},
 {key:'climatizacao',label:'Climatização',rx:/climatiza|ar condicionado|hvac|split|duto|insuflamento|exaust[aã]o/i},
 {key:'spda',label:'SPDA / Aterramento',rx:/spda|para-?raios|aterramento|equipotencial|haste de terra/i},
 {key:'pavimentacao',label:'Pavimentação / Infraestrutura',rx:/pavimenta|terraplen|sub-?base|brita graduada|cbuq|drenagem|sarjeta|meio-fio|asfalto/i},
 {key:'geral',label:'Geral / Não classificado',rx:/.^/}
];

const ENGINEERING_RULES=[
 {key:'fundacoes',eap:'02',title:'Fundações',rx:/sapata|estaca|radier|bloco de funda|tubul[aã]o|funda[cç][aã]o/i,unitValue:{'m3':820,'m³':820,'m2':160,'m²':160,'kg':14,'m':220,'un':950}},
 {key:'estrutura',eap:'03',title:'Superestrutura',rx:/concreto|viga|pilar|laje|armadura|a[cç]o|forma|escoramento/i,unitValue:{'m3':780,'m³':780,'m2':135,'m²':135,'kg':13.5,'m':180,'un':650}},
 {key:'alvenaria',eap:'04',title:'Alvenarias e Vedações',rx:/alvenaria|bloco cer[aâ]mico|bloco de concreto|parede|divis[oó]ria|drywall/i,unitValue:{'m2':125,'m²':125,'m3':480,'m³':480,'un':8}},
 {key:'cobertura',eap:'05',title:'Cobertura',rx:/telha|cobertura|estrutura met[aá]lica de cobertura|calha|rufo|cumeeira/i,unitValue:{'m2':115,'m²':115,'m':85,'un':75}},
 {key:'impermeabilizacao',eap:'06',title:'Impermeabilização',rx:/impermeabil|manta asf[aá]ltica|manta l[ií]quida|membrana|primer imperme/i,unitValue:{'m2':82,'m²':82,'kg':28,'l':32}},
 {key:'revestimentos',eap:'07',title:'Revestimentos de Paredes e Tetos',rx:/reboco|embo[cç]o|chapisco|revestimento|argamassa|forro|gesso|massa corrida/i,unitValue:{'m2':68,'m²':68,'kg':5.5}},
 {key:'pisos',eap:'08',title:'Pisos e Rodapés',rx:/piso|porcelanato|cer[aâ]mica|granito|rodap[eé]|contrapiso|paviflex|vin[ií]lico/i,unitValue:{'m2':155,'m²':155,'m':48,'un':25}},
 {key:'esquadrias',eap:'09',title:'Esquadrias, Portas e Ferragens',rx:/porta|janela|esquadria|vidro|blindex|ferragem|guarda-corpo|corrim[aã]o/i,unitValue:{'m2':780,'m²':780,'un':1450,'m':350}},
 {key:'pintura',eap:'10',title:'Pintura',rx:/pintura|tinta|selador|fundo preparador|textura|verniz|esmalte/i,unitValue:{'m2':42,'m²':42,'l':34,'kg':18}},
 {key:'eletrica',eap:'11',title:'Instalações Elétricas',rx:/cabo|fio|eletroduto|tomada|interruptor|lumin[aá]ria|disjuntor|quadro el[eé]trico|eletrocalha|perfilado/i,unitValue:{'m':18,'un':145,'kg':32,'m2':45,'m²':45}},
 {key:'hidrossanitario',eap:'12',title:'Instalações Hidrossanitárias',rx:/tubo|tubula[cç][aã]o|pvc|cpvc|pex|registro|v[aá]lvula|lou[cç]a|metais|ralo|caixa sifonada|esgoto|[aá]gua fria/i,unitValue:{'m':38,'un':185,'m2':55,'m²':55}},
 {key:'incendio',eap:'13',title:'Combate a Incêndio',rx:/hidrante|sprinkler|extintor|detector|alarme de inc[eê]ndio|bomba de inc[eê]ndio|sinaliza[cç][aã]o de emerg/i,unitValue:{'m':65,'un':480}},
 {key:'dados',eap:'14',title:'Lógica, Dados e Telefonia',rx:/rj-?45|rack|switch|patch panel|dados|telefon|cabeamento|fibra|utp|cat\.?\s*[56]/i,unitValue:{'m':12,'un':190}},
 {key:'climatizacao',eap:'15',title:'Climatização e Exaustão',rx:/ar condicionado|split|cassete|duto|grelha|difusor|exaustor|hvac/i,unitValue:{'m':160,'m2':210,'m²':210,'un':3200}},
 {key:'spda',eap:'16',title:'SPDA e Aterramento',rx:/spda|para-?raios|haste de terra|cordoalha|aterramento|equipotencial/i,unitValue:{'m':28,'un':190}},
 {key:'terraplenagem',eap:'17',title:'Terraplenagem e Infraestrutura',rx:/escava[cç][aã]o|aterro|terraplen|compacta[cç][aã]o|subleito|bota-fora/i,unitValue:{'m3':48,'m³':48,'m2':15,'m²':15}},
 {key:'drenagem',eap:'18',title:'Drenagem',rx:/drenagem|bueiro|sarjeta|canaleta|meio-fio|galeria|po[cç]o de visita/i,unitValue:{'m':145,'m3':260,'m³':260,'un':650}},
 {key:'pavimentacao',eap:'19',title:'Pavimentação',rx:/cbuq|asfalto|brita graduada|sub-?base|base estabilizada|pavimenta[cç][aã]o|imprima[cç][aã]o|pintura de liga[cç][aã]o/i,unitValue:{'m2':98,'m²':98,'m3':320,'m³':320,'t':620}},
 {key:'preliminares',eap:'01',title:'Serviços Preliminares',rx:/canteiro|mobiliza[cç][aã]o|tapume|loca[cç][aã]o|limpeza inicial|demoli[cç][aã]o/i,unitValue:{'m2':55,'m²':55,'m':42,'un':850}},
 {key:'outros',eap:'99',title:'Outros Serviços',rx:/.*/,unitValue:{'m2':60,'m²':60,'m3':250,'m³':250,'m':35,'kg':12,'un':100,'vb':1000,'l':25,'t':500}}
];

const ENGINEERING_COMPOSITIONS={
 fundacoes:{materials:[['Concreto usinado',1.05,'m³'],['Aço CA-50/60',85,'kg'],['Madeira/forma',4,'m²']],labor:[['Pedreiro',1.5],['Armador',1.3],['Carpinteiro',1.1],['Servente',3]],equipment:[['Betoneira / bomba de concreto',0.12]],tools:['Vibrador de imersão','Serra circular','Ferramentas manuais']},
 estrutura:{materials:[['Concreto usinado',1.03,'m³'],['Aço CA-50/60',95,'kg'],['Sistema de formas',5,'m²']],labor:[['Armador',1.5],['Carpinteiro',1.4],['Pedreiro',0.8],['Servente',2.8]],equipment:[['Vibrador de imersão',0.15],['Guindaste/munck',0.03]],tools:['Serra circular','Torquímetro','Ferramentas manuais']},
 alvenaria:{materials:[['Blocos',13,'un'],['Argamassa de assentamento',0.018,'m³']],labor:[['Pedreiro',0.8],['Servente',0.8]],equipment:[['Betoneira',0.03]],tools:['Linha','Prumo','Nível','Colher de pedreiro']},
 cobertura:{materials:[['Telhas e acessórios',1.08,'m²'],['Fixadores',4,'un']],labor:[['Telhadista',0.55],['Ajudante',0.55]],equipment:[['Plataforma/andaime',0.08]],tools:['Parafusadeira','Linha de vida','Ferramentas manuais']},
 impermeabilizacao:{materials:[['Sistema impermeabilizante',1.15,'kg'],['Primer',0.25,'l']],labor:[['Impermeabilizador',0.35],['Ajudante',0.25]],equipment:[['Misturador elétrico',0.03]],tools:['Rolo','Trincha','Espátula']},
 revestimentos:{materials:[['Argamassa/revestimento',18,'kg']],labor:[['Pedreiro/revestidor',0.55],['Servente',0.45]],equipment:[['Misturador/argamassadeira',0.02]],tools:['Desempenadeira','Régua','Nível']},
 pisos:{materials:[['Revestimento de piso',1.1,'m²'],['Argamassa colante',5,'kg'],['Rejunte',0.5,'kg']],labor:[['Azulejista',0.6],['Servente',0.35]],equipment:[['Cortadora de piso',0.04]],tools:['Desempenadeira dentada','Nível laser','Espaçadores']},
 esquadrias:{materials:[['Esquadria/porta/janela',1,'un'],['Selante/fixadores',1,'cj']],labor:[['Montador',1.2],['Ajudante',0.8]],equipment:[['Furadeira/parafusadeira',0.15]],tools:['Nível','Trena','Ferramentas manuais']},
 pintura:{materials:[['Tinta/acabamento',0.35,'l'],['Selador/fundo',0.15,'l']],labor:[['Pintor',0.35],['Ajudante',0.15]],equipment:[['Lixadeira',0.03]],tools:['Rolo','Trincha','Bandeja','Lixa']},
 eletrica:{materials:[['Cabos/eletrodutos e acessórios',1.05,'m']],labor:[['Eletricista',0.22],['Ajudante de eletricista',0.18]],equipment:[['Ferramentas elétricas',0.02]],tools:['Multímetro','Alicate amperímetro','Guia passa-fio']},
 hidrossanitario:{materials:[['Tubos/conexões e acessórios',1.08,'m']],labor:[['Encanador',0.28],['Ajudante',0.22]],equipment:[['Rosqueadeira/termofusora',0.03]],tools:['Chave de tubo','Cortador','Nível']},
 incendio:{materials:[['Rede e componentes de incêndio',1.05,'m']],labor:[['Instalador de incêndio',0.3],['Ajudante',0.2]],equipment:[['Rosqueadeira',0.04]],tools:['Chaves','Manômetro de teste']},
 dados:{materials:[['Cabo de dados/telefonia',1.1,'m']],labor:[['Técnico de telecom',0.18],['Ajudante',0.12]],equipment:[['Certificador de rede',0.01]],tools:['Alicate de crimpagem','Testador de rede']},
 climatizacao:{materials:[['Dutos/tubos/acessórios HVAC',1.05,'m']],labor:[['Mecânico de refrigeração',0.4],['Ajudante',0.3]],equipment:[['Bomba de vácuo',0.04]],tools:['Manifold','Vacuômetro','Flangeador']},
 spda:{materials:[['Condutor/cabo de cobre',1.08,'m']],labor:[['Eletricista SPDA',0.22],['Ajudante',0.16]],equipment:[['Terrômetro',0.01]],tools:['Alicate de compressão','Ferramentas manuais']},
 terraplenagem:{materials:[],labor:[['Operador',0.08],['Servente',0.05]],equipment:[['Escavadeira/retroescavadeira',0.04],['Caminhão basculante',0.08],['Rolo compactador',0.03]],tools:['Nível/topografia']},
 drenagem:{materials:[['Tubos/peças de drenagem',1.05,'m']],labor:[['Pedreiro',0.45],['Servente',0.7]],equipment:[['Retroescavadeira',0.05]],tools:['Nível','Ferramentas manuais']},
 pavimentacao:{materials:[['Mistura/insumo de pavimentação',1.05,'t']],labor:[['Encarregado',0.03],['Servente',0.12]],equipment:[['Vibroacabadora',0.02],['Rolo compactador',0.03],['Caminhão',0.04]],tools:['Régua','Termômetro','Ferramentas de controle']},
 preliminares:{materials:[['Materiais provisórios',1,'vb']],labor:[['Encarregado',0.08],['Servente',0.3]],equipment:[['Ferramentas gerais',0.03]],tools:['Ferramentas manuais','EPCs']},
 outros:{materials:[['Insumos do serviço',1,'un']],labor:[['Oficial',0.35],['Ajudante',0.25]],equipment:[['Equipamento de apoio',0.03]],tools:['Ferramentas manuais']}
};

function engNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function engNum(v){if(typeof v==='number')return v;let s=String(v||'').trim().replace(/\s/g,'');if(!s)return 0;if(/^\d{1,3}(\.\d{3})+,\d+$/.test(s))s=s.replaceAll('.','').replace(',','.');else if(/^\d+,\d+$/.test(s))s=s.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replaceAll('.','');return Number(s)||0}
function engUnit(u){const s=String(u||'').toLowerCase().replace('²','2').replace('³','3');if(['und','unid','unidade','unidades','pç','pc'].includes(s))return'un';if(['m2'].includes(s))return'm²';if(['m3'].includes(s))return'm³';if(['litro','litros'].includes(s))return'l';return s}
function engineeringDiscipline(text){const hits=ENGINEERING_DISCIPLINES.slice(0,-1).map(d=>({d,n:(String(text).match(new RegExp(d.rx.source,d.rx.flags.includes('g')?d.rx.flags:d.rx.flags+'g'))||[]).length})).sort((a,b)=>b.n-a.n);return hits[0]?.n?hits[0].d:ENGINEERING_DISCIPLINES.at(-1)}
function engineeringRule(desc){return ENGINEERING_RULES.find(r=>r.rx.test(desc))||ENGINEERING_RULES.at(-1)}
function engineeringPrice(rule,unit){const map=rule.unitValue||{};return Number(map[unit]??map[engUnit(unit)]??0)}
function engineeringTextQuality(v){const s=String(v||'').trim();if(!s)return{ok:false,score:0,reason:'texto vazio'};const letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length,digits=(s.match(/[0-9]/g)||[]).length,repl=(s.match(/[�□]/g)||[]).length,symbols=(s.match(/[^A-Za-zÀ-ÿ0-9\s.,;:/()ºª°%+_\-–—²³]/g)||[]).length,words=(s.match(/[A-Za-zÀ-ÿ]{3,}/g)||[]).length,total=Math.max(1,s.length),letterRatio=letters/total,badRatio=(repl+symbols)/total;let score=100;if(repl)score-=Math.min(80,repl*10);if(badRatio>.08)score-=45;if(letterRatio<.25&&digits<4)score-=35;if(words<1)score-=30;score=clamp(score,0,100);return{ok:score>=55&&repl===0&&badRatio<.12,score,reason:repl?'caracteres inválidos na camada de texto':badRatio>=.12?'camada de texto corrompida':words<1?'descrição sem palavras reconhecíveis':'texto de baixa qualidade'}}
function engineeringConfidence(desc,unit,sourceLine){const q=engineeringTextQuality(desc+' '+sourceLine);if(!q.ok)return Math.min(35,q.score);let c=unit?88:60;if(desc.length<5)c-=20;if(unit==='m')c-=8;if(/escala|cota|nivel|eixo/i.test(sourceLine))c-=25;c-=Math.max(0,(75-q.score)*.5);return clamp(c,25,98)}
function engineeringResources(item){const comp=ENGINEERING_COMPOSITIONS[item.trade]||ENGINEERING_COMPOSITIONS.outros,q=Number(item.qty)||0;return{
 materials:(comp.materials||[]).map(([name,coef,unit])=>({name,qty:q*coef,unit})),
 labor:(comp.labor||[]).map(([name,hpu])=>({name,hours:q*hpu,unit:'h'})),
 equipment:(comp.equipment||[]).map(([name,hpu])=>({name,hours:q*hpu,unit:'h'})),
 tools:(comp.tools||[]).map(name=>({name,qty:1,unit:'cj'}))
}}
function engineeringScale(text){const m=String(text).match(/(?:escala|esc\.?)[\s:]*1\s*[:/]\s*(20|25|50|75|100|125|200|250|500|1000)/i)||String(text).match(/\b1\s*[:/]\s*(20|25|50|75|100|125|200|250|500|1000)\b/);return m?`1:${m[1]}`:'Não identificada'}
function engineeringRevision(text){const m=String(text).match(/(?:revis[aã]o|rev\.?)[\s:#-]*([A-Z0-9]{1,6})/i);return m?m[1]:'—'}
async function engineeringHash(buffer){const h=await crypto.subtle.digest('SHA-256',buffer);return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function engineeringPdfJs(){if(engineeringState.pdfjs)return engineeringState.pdfjs;const pdfjs=await import(ENGINEERING_PDFJS_URL);pdfjs.GlobalWorkerOptions.workerSrc=ENGINEERING_PDFWORKER_URL;engineeringState.pdfjs=pdfjs;return pdfjs}
async function engineeringPdfText(file,onProgress){const pdfjs=await engineeringPdfJs(),buf=await file.arrayBuffer(),hash=await engineeringHash(buf),pdf=await pdfjs.getDocument({data:new Uint8Array(buf)}).promise,lines=[];for(let p=1;p<=pdf.numPages;p++){onProgress?.(p,pdf.numPages);const page=await pdf.getPage(p),tc=await page.getTextContent(),rows=[];for(const it of tc.items||[]){if(!it.str?.trim())continue;const x=Number(it.transform?.[4]||0),y=Number(it.transform?.[5]||0);let row=rows.find(r=>Math.abs(r.y-y)<=2.5);if(!row){row={y,parts:[]};rows.push(row)}row.parts.push({x,s:it.str.trim()})}rows.sort((a,b)=>b.y-a.y);for(const r of rows){const line=r.parts.sort((a,b)=>a.x-b.x).map(z=>z.s).join(' ').replace(/\s+/g,' ').trim();if(line)lines.push({page:p,text:line})}}const all=lines.map(x=>x.text).join('\n');return{hash,pages:pdf.numPages,lines,text:all,discipline:engineeringDiscipline(all),scale:engineeringScale(all),revision:engineeringRevision(all)}}
function engineeringExtractTakeoffs(parsed,fileName){const out=[],unitRx=/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(m²|m2|m³|m3|kg|t|un|und|unid|pç|pc|cj|vb|l|litro|litros|m)\b/ig;for(let i=0;i<parsed.lines.length;i++){const row=parsed.lines[i],line=row.text;if(line.length>260)continue;unitRx.lastIndex=0;let m;while((m=unitRx.exec(line))){const qty=engNum(m[1]),unit=engUnit(m[2]);if(!(qty>0)||qty>1e8)continue;let desc=(line.slice(0,m.index)+' '+line.slice(unitRx.lastIndex)).replace(/[|:;–—-]+$/,'').replace(/^\s*[\d.]+\s*/,'').replace(/\s+/g,' ').trim();if(desc.length<4){const prev=parsed.lines[i-1]?.text||'',next=parsed.lines[i+1]?.text||'';desc=(prev.length>desc.length?prev:next).slice(0,180)}if(!desc||/escala|folha|prancha|data|revis[aã]o|cota|nivel|eixo/i.test(desc)&&unit==='m')continue;const textQuality=engineeringTextQuality(desc+' '+line);if(!textQuality.ok)continue;const rule=engineeringRule(desc),confidence=engineeringConfidence(desc,unit,line);out.push({textQuality:textQuality.score,discipline:parsed.discipline.key,disciplineLabel:parsed.discipline.label,eap:rule.eap,eapTitle:rule.title,trade:rule.key,description:desc.slice(0,220),unit,qty,unitValue:engineeringPrice(rule,unit),priceSource:'Referência interna preliminar',confidence,page:row.page,fileName,sourceLine:line.slice(0,260),selected:true})}}
 // consolidate exact duplicates from same discipline/description/unit/page-neighbor while keeping traceability
 const map=new Map();for(const x of out){const k=[engNorm(x.description),x.unit,x.trade].join('|');const old=map.get(k);if(old){old.qty+=x.qty;old.pages=(old.pages||[old.page]);if(!old.pages.includes(x.page))old.pages.push(x.page);old.confidence=Math.min(old.confidence,x.confidence)}else map.set(k,{...x,pages:[x.page]})}return[...map.values()].slice(0,ENGINEERING_MAX_TAKEOFFS)}
const ENGINEERING_COST_DB='obratop-cost-bases-v1',ENGINEERING_COST_STORE='items',ENGINEERING_COST_META='meta';
function engineeringCostDb(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(ENGINEERING_COST_DB,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(ENGINEERING_COST_STORE)){const st=db.createObjectStore(ENGINEERING_COST_STORE,{keyPath:'id'});st.createIndex('baseId','baseId',{unique:false});st.createIndex('source','source',{unique:false})}if(!db.objectStoreNames.contains(ENGINEERING_COST_META))db.createObjectStore(ENGINEERING_COST_META,{keyPath:'id'})};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
 })}
async function engineeringCostDbAll(store){const db=await engineeringCostDb();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}
async function engineeringCostDbPutMany(store,rows){const db=await engineeringCostDb();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite'),st=tx.objectStore(store);rows.forEach(x=>st.put(x));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function engineeringCostDbDeleteBase(baseId){const db=await engineeringCostDb();return new Promise((resolve,reject)=>{const tx=db.transaction([ENGINEERING_COST_STORE,ENGINEERING_COST_META],'readwrite'),st=tx.objectStore(ENGINEERING_COST_STORE),idx=st.index('baseId'),req=idx.openCursor(IDBKeyRange.only(baseId));req.onsuccess=()=>{const c=req.result;if(c){c.delete();c.continue()}};tx.objectStore(ENGINEERING_COST_META).delete(baseId);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function engineeringPriceBookLoad(){
 try{
  engineeringState.priceBook=await engineeringCostDbAll(ENGINEERING_COST_STORE);
  engineeringState.costBases=engineeringState.priceBook;
  engineeringState.costBaseMeta=(await engineeringCostDbAll(ENGINEERING_COST_META)).sort((a,b)=>String(b.reference||'').localeCompare(String(a.reference||'')));
 }catch(e){
  console.warn('IndexedDB indisponível, usando banco legado.',e);
  try{engineeringState.priceBook=JSON.parse(localStorage.getItem('obratop-engineering-pricebook')||'[]')}catch{engineeringState.priceBook=[]}
  engineeringState.costBases=engineeringState.priceBook;engineeringState.costBaseMeta=[]
 }}
function engineeringTokenScore(a,b){
 const stop=new Set(['de','da','do','das','dos','com','para','por','em','e','a','o','un','m2','m3']);
 const toks=x=>engNorm(x).split(' ').filter(t=>t.length>2&&!stop.has(t));
 const A=new Set(toks(a)),B=new Set(toks(b));if(!A.size||!B.size)return 0;
 let inter=0;A.forEach(x=>{if(B.has(x))inter++});
 const j=inter/(A.size+B.size-inter),contain=inter/Math.min(A.size,B.size);
 return Math.min(1,j*.65+contain*.35)
}
function engineeringNormUnit(u){const n=engNorm(u).replace(/\s/g,'');const map={'m2':'m2','m²':'m2','m3':'m3','m³':'m3','unid':'un','unidade':'un','und':'un','un':'un','cj':'cj','conjunto':'cj','kg':'kg','h':'h','hora':'h','m':'m','l':'l','litro':'l'};return map[n]||n}
function engineeringBasePriority(source,discipline='',workName=''){
 const road=/rodov|paviment|terraplen|drenagem|sinaliza|estrada/i.test(`${discipline} ${workName}`);
 if(road)return source==='SICRO3'?30:source==='SINAPI'?20:source==='ORSE-SE'?10:0;
 return source==='SINAPI'?30:source==='ORSE-SE'?25:source==='SICRO3'?10:0
}
function engineeringBestPrice(desc,unit,opts={}){
 let best=null;const nu=engineeringNormUnit(unit),workName=opts.workName||'',discipline=opts.discipline||'',sourceFilter=opts.source||'',ufFilter=opts.uf||'',referenceFilter=opts.reference||'';
 for(const r of engineeringState.priceBook){
  if(sourceFilter&&r.source!==sourceFilter)continue;
  if(ufFilter&&String(r.uf||'').toUpperCase()!==String(ufFilter).toUpperCase())continue;
  if(referenceFilter&&r.reference!==referenceFilter)continue;
  if(nu&&r.unit&&nu!==engineeringNormUnit(r.unit))continue;
  const text=engineeringTokenScore(desc,r.description),bonus=engineeringBasePriority(r.source,discipline,workName)/100,score=Math.min(1,text+bonus*.12);
  if(text<0.38)continue;
  if(!best||score>best.score)best={...r,score,textScore:text}
 }
 return best
}
function engineeringCostSourceLabel(x){return`${x.source||'BASE'}${x.uf?' / '+x.uf:''}${x.reference?' / '+x.reference:''}${x.code?' • '+x.code:''}`}
function engineeringPriceRowsFromSheet(rows,meta){
 const normalized=[];for(const r of rows){const entries=Object.entries(r||{}),find=rx=>entries.find(([k])=>rx.test(engNorm(k)))?.[1]??'';
  const description=String(find(/descr|servi|compos|item|insumo/)).trim(),unit=String(find(/^unidade$|^unid$|^und$|unit/)).trim(),price=engNum(find(/preco|preco unit|valor unit|custo unit|custo total/)),code=String(find(/^codigo$|^cod$|codigo da composicao|codigo do servico|item/)).trim();
  if(description&&unit&&price>0)normalized.push({id:`${meta.id}:${code||normalized.length+1}`,baseId:meta.id,source:meta.source,uf:meta.uf,reference:meta.reference,type:meta.type,description,unit,price,code})
 }return normalized
}
async function engineeringReadCostWorkbook(file,meta){
 if(!window.XLSX)throw Error('Biblioteca Excel não carregada.');
 const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),all=[];
 for(const sn of wb.SheetNames){const ws=wb.Sheets[sn],rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});const parsed=engineeringPriceRowsFromSheet(rows,meta);if(parsed.length)all.push(...parsed)}
 return all
}
async function engineeringImportOfficialBase(file,meta){
 if(!file)throw Error('Selecione o arquivo oficial.');
 const id=`${meta.source}-${meta.uf||'BR'}-${meta.reference}-${Date.now()}`;meta={...meta,id,fileName:file.name,importedAt:new Date().toISOString(),release:RELEASE};
 let items=[];
 if(/\.csv$/i.test(file.name)){
  if(!window.XLSX)throw Error('Biblioteca Excel não carregada.');const text=await file.text(),wb=window.XLSX.read(text,{type:'string'}),ws=wb.Sheets[wb.SheetNames[0]],rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});items=engineeringPriceRowsFromSheet(rows,meta)
 }else items=await engineeringReadCostWorkbook(file,meta);
 if(!items.length)throw Error('Nenhum registro com descrição, unidade e preço foi reconhecido. Se o arquivo oficial possuir layout especial, ele precisará de um adaptador específico.');
 meta.count=items.length;await engineeringCostDbPutMany(ENGINEERING_COST_STORE,items);await engineeringCostDbPutMany(ENGINEERING_COST_META,[meta]);await engineeringPriceBookLoad();
 await audit('cost-base-import','engineeringCostBases',meta.id,{source:meta.source,uf:meta.uf,reference:meta.reference,count:items.length,fileName:file.name});
 return meta
}
async function engineeringDeleteCostBase(id){await engineeringCostDbDeleteBase(id);await engineeringPriceBookLoad();renderEngineering()}


const ENGINEERING_FREE_BASES={
 catalogUrl:(window.OBRATOP_COST_BASES_CATALOG_URL||'').trim(),
 repoUrl:(window.OBRATOP_COST_BASES_REPO_URL||'').trim()
};
async function engineeringFetchJson(url){
 const r=await fetch(url,{cache:'no-store'});
 if(!r.ok)throw Error(`Falha HTTP ${r.status} ao consultar a automação gratuita.`);
 return r.json()
}
async function engineeringFetchGzipJson(url){
 const r=await fetch(url,{cache:'no-store'});
 if(!r.ok)throw Error(`Falha HTTP ${r.status} ao baixar a base oficial tratada.`);
 const buf=await r.arrayBuffer();
 try{
  if(typeof DecompressionStream==='function'){
   const ds=new DecompressionStream('gzip');
   const stream=new Blob([buf]).stream().pipeThrough(ds);
   return JSON.parse(await new Response(stream).text())
  }
 }catch(e){console.warn('gzip nativo indisponível',e)}
 throw Error('Este navegador não conseguiu descompactar a base automática. Atualize o Chrome/Edge e tente novamente.')
}
async function engineeringFreeCatalog(){
 if(!ENGINEERING_FREE_BASES.catalogUrl||ENGINEERING_FREE_BASES.catalogUrl.includes('__GITHUB_USER__'))
   throw Error('A automação gratuita ainda não foi vinculada ao repositório GitHub. Execute o instalador gratuito uma única vez.');
 const c=await engineeringFetchJson(`${ENGINEERING_FREE_BASES.catalogUrl}${ENGINEERING_FREE_BASES.catalogUrl.includes('?')?'&':'?'}t=${Date.now()}`);
 if(!c||!Array.isArray(c.bases))throw Error('Catálogo gratuito inválido.');
 return c
}
function engineeringFreeBaseMatch(b,source,uf,year,month,regime,type){
 return b.source===source
   &&String(b.uf||'BR')===String(uf||'BR')
   &&String(b.year)===String(year)
   &&String(b.month).padStart(2,'0')===String(month).padStart(2,'0')
   &&(!regime||!b.regime||engineeringNorm(b.regime)===engineeringNorm(regime))
   &&(!type||type==='mixed'||!b.type||b.type===type||b.type==='mixed')
   &&b.status==='ready'
}
async function engineeringInstallFreeBase(entry){
 if(!entry?.url)throw Error('A base automática não possui arquivo publicado.');
 const payload=await engineeringFetchGzipJson(entry.url);
 const rows=Array.isArray(payload?.rows)?payload.rows:[];
 if(!rows.length)throw Error('A base automática foi baixada, porém não contém registros válidos.');
 const positive=rows.filter(x=>engNum(x.price)>0);
 if(!positive.length)throw Error('A base possui preços zerados. A atualização foi bloqueada.');
 const meta={
   id:`FREE-${entry.source}-${entry.uf||'BR'}-${entry.reference}-${entry.regime||'padrao'}`,
   source:entry.source,uf:entry.uf||'BR',reference:entry.reference,type:entry.type||'mixed',
   regime:entry.regime||'',officialUrl:entry.officialUrl||'',fileName:entry.file||'base.json.gz',
   importedAt:new Date().toISOString(),release:RELEASE,count:positive.length,
   automation:'github-free',sourceSha256:entry.sha256||'',publishedAt:entry.publishedAt||''
 };
 const items=positive.map((x,i)=>({
   id:`${meta.id}:${x.code||i+1}`,baseId:meta.id,source:meta.source,uf:meta.uf,reference:meta.reference,
   type:meta.type,description:String(x.description||'').trim(),unit:String(x.unit||'').trim(),
   price:engNum(x.price),code:String(x.code||'').trim()
 })).filter(x=>x.description&&x.unit&&x.price>0);
 if(!items.length)throw Error('Nenhum registro válido restou após a validação.');
 await engineeringCostDbPutMany(ENGINEERING_COST_STORE,items);
 await engineeringCostDbPutMany(ENGINEERING_COST_META,[{...meta,count:items.length}]);
 await engineeringPriceBookLoad();
 await audit('free-cost-base-import','engineeringCostBases',meta.id,{source:meta.source,uf:meta.uf,reference:meta.reference,count:items.length,sha256:meta.sourceSha256});
 return{...meta,count:items.length}
}
const ENGINEERING_OFFICIAL_CATALOG={
 SINAPI:{label:'SINAPI / CAIXA',ufMode:'all',regimes:['Não desonerado','Desonerado'],years:{2026:['01','02','03','04','05','06','07','08'],2025:['01','02','03','04','05','06','07','08','09','10','11','12']},official:'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx',download:'https://www.caixa.gov.br/site/Paginas/eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJkbm40Rz.aspx',warning:'A CAIXA informou que, a partir da referência 10/2025, relatórios podem ter preços/custos zerados enquanto não houver dados mensais do IBGE. O ObraTop bloqueia atualização quando a base não contém preços positivos.'},
 SICRO3:{label:'SICRO 3 / DNIT',ufMode:'required',regimes:[],years:{2026:['01','04']},official:'https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro',warning:'O DNIT publica por UF e competência. A UF é obrigatória e nunca é substituída silenciosamente.'},
 'ORSE-SE':{label:'ORSE / CEHOP-SE',ufMode:'fixed-se',regimes:[],years:{2026:['06']},official:'https://orse.cehop.se.gov.br/downloads.asp',download:'https://orse.cehop.se.gov.br/default.asp',warning:'ORSE é a base de Sergipe. A UF permanece fixa em SE.'}
};
function engineeringOfficialMonths(source,year){return ENGINEERING_OFFICIAL_CATALOG[source]?.years?.[year]||[]}
function engineeringMonthName(m){return['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m)]||m}
function engineeringOfficialUrl(source,uf,year,month){
 const cat=ENGINEERING_OFFICIAL_CATALOG[source]||{};
 if(source==='SICRO3'){
  const names={BA:'bahia',SE:'sergipe',AL:'alagoas',PE:'pernambuco'};
  const months={1:'janeiro',2:'fevereiro',3:'marco',4:'abril',5:'maio',6:'junho',7:'julho',8:'agosto',9:'setembro',10:'outubro',11:'novembro',12:'dezembro'};
  if(names[uf]&&months[Number(month)])return `https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro/nordeste/${names[uf]}/${year}/${months[Number(month)]}`
 }
 return cat.download||cat.official||''
}
function engineeringRefreshOfficialSelectors(){
 const src=$('#costSource')?.value||'SINAPI',cat=ENGINEERING_OFFICIAL_CATALOG[src],year=$('#costYear'),month=$('#costMonth'),uf=$('#costUf'),reg=$('#costRegime'),notice=$('#costOfficialNotice'),link=$('#costOfficialDownload');
 if(!cat||!year||!month)return;
 const years=Object.keys(cat.years).sort().reverse(),current=year.value;year.innerHTML=years.map(y=>`<option value="${y}" ${y===current?'selected':''}>${y}</option>`).join('');
 const months=engineeringOfficialMonths(src,year.value),cm=month.value;month.innerHTML=months.map(m=>`<option value="${m}" ${m===cm?'selected':''}>${engineeringMonthName(m)} / ${year.value}</option>`).join('');
 if(uf){uf.disabled=cat.ufMode==='fixed-se';if(cat.ufMode==='fixed-se')uf.value='SE'}
 if(reg){reg.innerHTML=(cat.regimes.length?cat.regimes:['Não se aplica']).map(x=>`<option>${x}</option>`).join('');reg.disabled=!cat.regimes.length}
 if(notice)notice.innerHTML=`<b>${cat.label}</b><br>${cat.warning}`;
 if(link){const url=engineeringOfficialUrl(src,uf?.value||'',year.value,month.value);link.href=url;link.textContent='Abrir página oficial para download';link.target='_blank';link.rel='noopener'}
}
function engineeringBudgetPricePreview(baseId,workId,threshold=.85){
 const base=engineeringState.costBaseMeta.find(x=>x.id===baseId);if(!base)return[];
 const items=engineeringState.priceBook.filter(x=>x.baseId===baseId),budgets=state.data.budgets.filter(x=>x.workId===workId&&!x.deletedAt&&!x.deleted);
 return budgets.map(b=>{
  let best=null;const storedCode=String(b.priceBaseCode||b.code||'').trim();
  if(storedCode){
    const exact=items.find(r=>String(r.code||'').trim()===storedCode&&(!b.unit||engineeringNormUnit(b.unit)===engineeringNormUnit(r.unit)));
    if(exact)best={...exact,score:1,matchType:'Código oficial'}
  }
  if(!best)for(const r of items){
    if(engineeringNormUnit(b.unit)!==engineeringNormUnit(r.unit))continue;
    const sc=engineeringTokenScore(b.description,r.description);
    if(sc>=threshold&&(!best||sc>best.score))best={...r,score:sc,matchType:'Descrição + unidade'}
  }
  const old=engNum(b.unitValue),next=best?engNum(best.price):0,variation=old>0&&next>0?(next/old-1)*100:null;
  return{budget:b,best,old,next,variation,selected:!!best}
 })
}
function openEngineeringBudgetUpdater(){
 const works=state.data.works.filter(w=>!w.deletedAt&&!w.deleted),bases=engineeringState.costBaseMeta||[];
 if(!works.length)return alert('Cadastre uma obra antes de atualizar preços.');
 if(!bases.length)return alert('Importe primeiro uma base oficial automática.');
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog"><h2>Atualizar orçamento da obra</h2>
 <p class="muted">A atualização usa código oficial quando disponível e, em seguida, descrição + unidade. O padrão automático é 85%; itens duvidosos não são alterados.</p>
 <div class="formgrid"><div class="field"><label>Obra</label><select id="budgetUpdWork">${works.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></div>
 <div class="field"><label>Base oficial instalada</label><select id="budgetUpdBase">${bases.map(b=>`<option value="${b.id}">${esc(b.source)} • ${esc(b.uf||'BR')} • ${esc(b.reference||'—')}${b.regime?' • '+esc(b.regime):''}</option>`).join('')}</select></div>
 <div class="field"><label>Confiança mínima</label><select id="budgetUpdThreshold"><option value="0.85" selected>85% — recomendado</option><option value="0.90">90%</option><option value="0.95">95%</option><option value="1">100%</option></select></div></div>
 <div class="actions"><button class="btn" id="cancelModal">Cancelar</button><button class="btn primary" id="budgetUpdPreview">Gerar prévia segura</button></div><div id="budgetUpdResults"></div></div></div>`;
 $('#cancelModal').onclick=closeModal;
 $('#budgetUpdPreview').onclick=()=>{
  const threshold=Number($('#budgetUpdThreshold').value||.85),rows=engineeringBudgetPricePreview($('#budgetUpdBase').value,$('#budgetUpdWork').value,threshold),box=$('#budgetUpdResults');
  if(!rows.length){box.innerHTML='<div class="engineeringNotice">A obra não possui itens no orçamento.</div>';return}
  const matched=rows.filter(x=>x.best),currentTotal=rows.reduce((s,x)=>s+engNum(x.budget.qty)*x.old*(1+engNum(x.budget.bdi)/100),0),
        proposedTotal=rows.reduce((s,x)=>s+engNum(x.budget.qty)*(x.best?x.next:x.old)*(1+engNum(x.budget.bdi)/100),0),
        delta=currentTotal?((proposedTotal/currentTotal)-1)*100:0;
  box.innerHTML=`<div class="engineeringNotice"><b>${matched.length}/${rows.length}</b> item(ns) elegíveis. Total atual <b>${money(currentTotal)}</b> → proposto <b>${money(proposedTotal)}</b> (${delta>=0?'+':''}${delta.toFixed(2)}%). Itens sem correspondência segura permanecem inalterados.</div>
  <div class="tablewrap"><table><thead><tr><th>Usar</th><th>Serviço</th><th>Código</th><th>Atual</th><th>Novo</th><th>Variação</th><th>Match</th><th>Critério</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td><input type="checkbox" class="budgetUpdChk" data-i="${i}" ${x.best?'checked':'disabled'}></td><td>${esc(x.budget.description)}</td><td>${esc(x.best?.code||'—')}</td><td>${money(x.old)}</td><td>${x.best?money(x.next):'—'}</td><td>${x.variation==null?'—':`${x.variation>=0?'+':''}${x.variation.toFixed(2)}%`}</td><td>${x.best?Math.round(x.best.score*100)+'%':'—'}</td><td>${esc(x.best?.matchType||'—')}</td></tr>`).join('')}</tbody></table></div>
  <div class="actions"><button class="btn primary" id="budgetUpdApply">Aplicar preços selecionados</button></div>`;
  $('#budgetUpdApply').onclick=async()=>{
   const selected=[...$$('.budgetUpdChk:checked')].map(c=>rows[+c.dataset.i]).filter(x=>x?.best);
   if(!selected.length)return alert('Nenhum item selecionado.');
   if(!confirm(`Aplicar novos preços em ${selected.length} item(ns)? Os preços anteriores serão preservados nos campos de histórico e na auditoria.`))return;
   const base=engineeringState.costBaseMeta.find(x=>x.id===$('#budgetUpdBase').value),batch=writeBatch(fs);
   for(const x of selected)batch.update(doc(fs,'organizations',state.orgId,'budgets',x.budget.id),{
     previousUnitValue:x.old,unitValue:x.next,priceBaseSource:base.source,priceBaseUf:base.uf,priceBaseReference:base.reference,
     priceBaseRegime:base.regime||'',priceBaseCode:x.best.code||'',priceMatch:Math.round(x.best.score*100),
     priceMatchType:x.best.matchType||'',priceBaseSha256:base.sourceSha256||'',priceUpdatedAt:serverTimestamp(),priceUpdatedBy:state.user.uid
   });
   await batch.commit();
   await audit('budget-price-update','budgets','batch',{workId:$('#budgetUpdWork').value,baseId:base.id,source:base.source,uf:base.uf,reference:base.reference,regime:base.regime||'',threshold:Math.round(threshold*100),updated:selected.length});
   toast(`${selected.length} preço(s) atualizado(s) com rastreabilidade.`);closeModal();await loadAll();render()
  }
 }
}
function engineeringCostBaseOfficialLinks(){
 return`<div class="engineeringNotice"><b>Fontes oficiais:</b><br>
 • SINAPI — CAIXA: relatórios mensais de insumos e composições por UF.<br>
 • SICRO 3 — DNIT: relatórios de custos referenciais por estado e mês.<br>
 • ORSE-SE — CEHOP/SE: composições e preços do Sistema de Orçamento de Obras de Sergipe.<br>
 <small>O ObraTop não mistura meses ou UFs silenciosamente: cada base importada guarda fonte, UF e competência.</small></div>`
}
async function openEngineeringPriceBook(){
 let catalog=null,catalogError='';try{catalog=await engineeringFreeCatalog()}catch(e){catalogError=friendly(e)}
 const metas=engineeringState.costBaseMeta||[],rows=metas.length?metas.map(m=>`<tr><td><b>${esc(m.source)}</b></td><td>${esc(m.uf||'—')}</td><td>${esc(m.reference||'—')}</td><td>${esc(m.regime||'—')}</td><td>${m.count||0}</td><td>${esc(m.automation==='github-free'?'Automática gratuita':m.fileName||'—')}</td><td><button type="button" class="btn small engBaseDel" data-id="${m.id}">Excluir</button></td></tr>`).join(''):`<tr><td colspan="7">Nenhuma base oficial instalada neste dispositivo.</td></tr>`;
 const bases=catalog?.bases||[],years=[...new Set(bases.map(b=>String(b.year)))].sort().reverse();
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog"><h2>Gerenciador Gratuito de Bases Oficiais</h2>
 <p class="muted">Sem Blaze e sem Cloud Functions. O robô gratuito consulta as fontes oficiais, prepara as bases e o ObraTop baixa somente a base selecionada.</p>
 <div class="formgrid">
 <div class="field"><label>Banco</label><select id="costSource"><option value="SINAPI">SINAPI / CAIXA</option><option value="SICRO3">SICRO 3 / DNIT</option><option value="ORSE-SE">ORSE / CEHOP-SE</option></select></div>
 <div class="field"><label>UF</label><select id="costUf"><option>SE</option><option>BA</option><option>AL</option><option>PE</option><option>AC</option><option>AP</option><option>AM</option><option>CE</option><option>DF</option><option>ES</option><option>GO</option><option>MA</option><option>MT</option><option>MS</option><option>MG</option><option>PA</option><option>PB</option><option>PR</option><option>PI</option><option>RJ</option><option>RN</option><option>RS</option><option>RO</option><option>RR</option><option>SC</option><option>SP</option><option>TO</option></select></div>
 <div class="field"><label>Ano-base</label><select id="costYear"></select></div>
 <div class="field"><label>Competência publicada</label><select id="costMonth"></select></div>
 <div class="field"><label>Regime</label><select id="costRegime"><option>Não desonerado</option><option>Desonerado</option></select></div>
 <div class="field"><label>Conteúdo</label><select id="costType"><option value="mixed">Composições + insumos</option><option value="compositions">Composições / serviços</option><option value="inputs">Insumos</option></select></div>
 <div class="field full"><div id="costAutoStatus" class="engineeringNotice">${catalogError?`⚠️ <b>Automação ainda não conectada.</b><br>${esc(catalogError)}`:`✅ <b>Automação gratuita conectada.</b> Catálogo atualizado em ${esc(catalog?.generatedAt||'—')}. ${bases.filter(b=>b.status==='ready').length} base(s) pronta(s).`}</div></div>
 </div>
 <div class="actions"><button class="btn" id="cancelModal">Fechar</button><button class="btn" id="costRefreshCatalog">↻ Atualizar catálogo</button><button class="btn primary" id="engLoadPrice" ${catalogError?'disabled':''}>⬇ Importar base oficial</button><button class="btn primary" id="engBudgetUpdater">Atualizar orçamento da obra</button></div>
 <div class="sectiontitle" style="margin-top:18px">Bases instaladas neste dispositivo</div><div class="tablewrap"><table><thead><tr><th>Fonte</th><th>UF</th><th>Competência</th><th>Regime</th><th>Registros</th><th>Origem</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
 $('#cancelModal').onclick=closeModal;
 const src=$('#costSource'),uf=$('#costUf'),yr=$('#costYear'),mo=$('#costMonth'),reg=$('#costRegime'),type=$('#costType'),status=$('#costAutoStatus');
 function refresh(){
  const source=src.value;
  if(source==='ORSE-SE'){uf.value='SE';uf.disabled=true;reg.disabled=true}else{uf.disabled=false;reg.disabled=source!=='SINAPI'}
  const filtered=bases.filter(b=>b.source===source&&(source==='SINAPI'||source==='SICRO3'?String(b.uf||'')===uf.value:true)&&b.status==='ready');
  const ys=[...new Set(filtered.map(b=>String(b.year)))].sort().reverse();const oldY=yr.value;
  yr.innerHTML=ys.map(y=>`<option value="${y}" ${y===oldY?'selected':''}>${y}</option>`).join('')||'<option value="">Nenhum ano disponível</option>';
  const ms=[...new Set(filtered.filter(b=>String(b.year)===yr.value).map(b=>String(b.month).padStart(2,'0')))].sort().reverse();const oldM=mo.value;
  mo.innerHTML=ms.map(m=>`<option value="${m}" ${m===oldM?'selected':''}>${engineeringMonthName(m)} / ${yr.value}</option>`).join('')||'<option value="">Nenhuma competência pronta</option>';
 }
 src.onchange=refresh;uf.onchange=refresh;yr.onchange=refresh;reg.onchange=refresh;type.onchange=refresh;refresh();
 $('#costRefreshCatalog').onclick=()=>openEngineeringPriceBook();
 $('#engBudgetUpdater').onclick=()=>openEngineeringBudgetUpdater();
 $('#engLoadPrice').onclick=async()=>{
  const b=$('#engLoadPrice');try{
   const source=src.value,actualUf=source==='ORSE-SE'?'SE':uf.value,year=yr.value,month=mo.value,regime=source==='SINAPI'?reg.value:'';
   if(!year||!month)return alert('Nenhuma base pronta para esta seleção.');
   const candidates=bases.filter(x=>engineeringFreeBaseMatch(x,source,actualUf,year,month,regime,type.value));
   const entry=candidates[0]||bases.find(x=>x.source===source&&String(x.uf||'')===actualUf&&String(x.year)===String(year)&&String(x.month).padStart(2,'0')===String(month).padStart(2,'0')&&x.status==='ready');
   if(!entry)return alert('A competência selecionada ainda não está pronta no catálogo automático.');
   b.disabled=true;b.textContent='Baixando e validando…';status.innerHTML='⏳ Baixando somente a base tratada e validando preços positivos…';
   const meta=await engineeringInstallFreeBase(entry);
   status.innerHTML=`✅ <b>${esc(meta.source)} ${esc(meta.uf)} ${esc(meta.reference)}</b> importada automaticamente com ${meta.count} registro(s).`;
   toast(`${meta.source} ${meta.uf} ${meta.reference}: ${meta.count} registro(s) importados sem download manual.`);
   setTimeout(()=>openEngineeringPriceBook(),700)
  }catch(e){status.innerHTML=`⚠️ ${esc(friendly(e))}`;b.disabled=false;b.textContent='⬇ Importar base oficial'}
 };
 $$('.engBaseDel').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir somente esta base de custos deste dispositivo?'))return;await engineeringDeleteCostBase(b.dataset.id);openEngineeringPriceBook()})
}
async function engineeringLoadProjects(){
 const snap=await getDocs(query(collection(fs,'organizations',state.orgId,'engineeringProjects'),orderBy('createdAt','desc')));
 engineeringState.projects=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>!p.deleted);
 const visible=engineeringState.projects.filter(p=>!state.filters.workId||p.workId===state.filters.workId);
 if(engineeringState.selectedProjectId&&!visible.some(p=>p.id===engineeringState.selectedProjectId))engineeringState.selectedProjectId='';
 if(!engineeringState.selectedProjectId)engineeringState.selectedProjectId=visible[0]?.id||'';
 if(engineeringState.selectedProjectId){
   const ts=await getDocs(collection(fs,'organizations',state.orgId,'engineeringProjects',engineeringState.selectedProjectId,'takeoffs'));
   engineeringState.takeoffs=ts.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted).sort(engineeringCompareEap);
 }else engineeringState.takeoffs=[]
}
function engineeringWorkOptions(){const list=isAdmin()?state.data.works.filter(w=>!w.deleted):state.data.works.filter(w=>w.id===assignedWorkId()&&!w.deleted);return list.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}
function engineeringProjectStatus(p){if(p.integratedAt)return'<span class="badge ok">Integrado</span>';if(p.status==='partial')return'<span class="badge warn">Integração parcial</span>';if(p.status==='review')return'<span class="badge warn">Em revisão</span>';return'<span class="badge ok">Analisado</span>'}
function engineeringConfidenceBadge(c,reviewApproved=false){if(reviewApproved)return`<span class="badge ok">Revisado ✓</span><br><small>${Math.round(c)}% origem</small>`;const k=c>=85?'ok':c>=65?'warn':'bad',t=c>=85?'Alta':c>=65?'Revisar':'Baixa';return`<span class="badge ${k}">${t} ${Math.round(c)}%</span>`}
function engineeringResourcesSummary(items){const agg={materials:new Map(),labor:new Map(),equipment:new Map(),tools:new Map()};for(const item of items){const r=engineeringResources(item);for(const [kind,arr] of Object.entries(r))for(const x of arr){const k=x.name+'|'+x.unit,old=agg[kind].get(k)||{name:x.name,qty:0,unit:x.unit};old.qty+=Number(x.qty??x.hours??0);agg[kind].set(k,old)}}return Object.fromEntries(Object.entries(agg).map(([k,m])=>[k,[...m.values()].sort((a,b)=>b.qty-a.qty)]))}
function engineeringItemQuality(x){return engineeringTextQuality((x?.description||'')+' '+(x?.sourceLine||''))}
function engineeringProjectHealth(items){const all=Array.isArray(items)?items:[],blocked=all.filter(x=>!engineeringItemQuality(x).ok),selectedBlocked=blocked.filter(x=>x.selected!==false);return{blocked,selectedBlocked,ok:blocked.length===0}}
function engineeringMetrics(items){const selected=items.filter(x=>x.selected!==false),health=engineeringProjectHealth(items),cost=selected.filter(x=>engineeringItemQuality(x).ok).reduce((s,x)=>s+(+x.qty||0)*(+x.unitValue||0),0),high=selected.filter(x=>engineeringItemQuality(x).ok&&+x.confidence>=85).length,review=selected.filter(x=>engineeringItemQuality(x).ok&&+x.confidence<85).length,blocked=health.blocked.length;return{selected,cost,high,review,blocked,health}}
async function renderEngineering(){
 $('#content').innerHTML=head('Projetos e Quantitativos Inteligentes','PDF / XLS / XLSX / CSV / Google Planilhas → levantamento → orçamento → EAP → recursos → ObraTop',`<div class="module-actions"><a class="btn" href="Projeto_Demo_ObraTop_3.18.0.pdf" download>⬇ PDF demonstrativo</a><button class="btn" id="engCaixa42">🏠 Criar demonstração CAIXA 42 m²</button><button class="btn" id="engPriceBook">▦ SINAPI • SICRO • ORSE</button><button class="btn primary" id="engImport">+ Importar PDF ou Planilha</button></div>`)+`<div class="card"><div class="sectiontitle">Engenharia Inteligente 3.22.0</div><p>Importe projetos PDF e planilhas de quantitativos em XLS, XLSX ou CSV. Para Google Planilhas, use o link público/compartilhado da planilha ou exporte-a em XLSX/CSV. O ObraTop normaliza as colunas, classifica a EAP e apresenta uma prévia antes de alimentar os módulos.</p><div class="engineeringNotice">🛡️ <b>Fluxo seguro:</b> o projeto é analisado primeiro. Nada é gravado em Orçamento, Cronograma, Estoque, Compras, Pessoal ou Equipamentos sem aprovação do Administrador. PDFs sem camada de texto são sinalizados para revisão; DWG/DXF/IFC continuam recomendados para medições geométricas de alta precisão.</div></div><div id="engineeringBody"><div class="card empty">Carregando projetos...</div></div>`;
 $('#engImport').onclick=openEngineeringImport;$('#engPriceBook').onclick=openEngineeringPriceBook;const cb=$('#engCaixa42');if(cb)cb.onclick=openCaixa42Demo;
 try{engineeringState.loading=true;await engineeringPriceBookLoad();await engineeringLoadProjects();engineeringState.loading=false;renderEngineeringBody()}catch(e){engineeringState.loading=false;console.error(e);$('#engineeringBody').innerHTML=`<div class="card"><b>Não foi possível carregar a Engenharia Inteligente.</b><p class="muted">${esc(friendly(e))}</p></div>`}
}
function renderEngineeringBody(){
 const body=$('#engineeringBody');if(!body)return;
 const projects=engineeringState.projects.filter(x=>!state.filters.workId||x.workId===state.filters.workId),
       p=projects.find(x=>x.id===engineeringState.selectedProjectId),
       items=engineeringState.takeoffs,m=engineeringMetrics(items);
 const list=projects.length?`<div class="card"><div class="sectiontitle">Projetos analisados</div><div class="engineeringProjectTabs">${projects.map(x=>`<button class="engProjectTab ${x.id===engineeringState.selectedProjectId?'active':''}" data-id="${x.id}"><b>${esc(x.name)}</b><small>${esc(state.data.works.find(w=>w.id===x.workId)?.name||'Obra')} • ${x.takeoffCount||0} itens</small>${engineeringProjectStatus(x)}</button>`).join('')}</div></div>`:`<div class="card empty">Nenhum projeto analisado. Clique em <b>Importar projeto PDF</b> para iniciar.</div>`;
 let detail='';
 if(p){
   const health=engineeringProjectHealth(items),projectBlocked=!health.ok,
         res=engineeringResourcesSummary(m.selected.filter(x=>engineeringItemQuality(x).ok)),
         disc=(p.files||[]).map(f=>f.disciplineLabel).filter((x,i,a)=>a.indexOf(x)===i).join(', ');
   const integrated=!!p.integratedAt||p.status==='integrated'||p.status==='partial'||(Array.isArray(p.integratedTakeoffIds)&&p.integratedTakeoffIds.length>0);
   const safety=projectBlocked?`<div class="engineeringNotice bad engineeringBlocked"><b>⛔ LEVANTAMENTO BLOQUEADO</b><br>${health.blocked.length} item(ns) possuem texto corrompido ou ilegível. A confiança armazenada anteriormente foi desconsiderada. Este levantamento <b>não pode alimentar nenhum módulo do ObraTop</b>. Exclua somente este levantamento e faça uma nova importação.</div>`:'';
   const technicalNote=!projectBlocked&&items.some(x=>x.technicalValidation==='pending')?`<div class="engineeringNotice"><b>ℹ Importação estruturada concluída</b><br>Os dados da planilha foram lidos corretamente. <b>Importação 100%</b> significa fidelidade de leitura das células, não aprovação técnica do quantitativo. A validação técnica permanece pendente até sua conferência.</div>`:'';
   detail=`<div class="engineeringKpis"><div class="card"><span>Quantitativos</span><strong>${items.length}</strong><small>${m.selected.length} selecionados</small></div><div class="card"><span>Importação válida</span><strong>${m.high}</strong><small>texto estruturado; validação técnica separada</small></div><div class="card"><span>Revisar</span><strong>${m.review}</strong><small>exigem conferência</small></div><div class="card engineeringKpiBlocked"><span>Bloqueados</span><strong>${m.blocked}</strong><small>texto inválido/corrompido</small></div><div class="card"><span>Orçamento preliminar</span><strong>${money0(m.cost)}</strong><small>exclui itens bloqueados</small></div></div>${safety}${technicalNote}<div class="card"><div class="sectiontitle">${esc(p.name)}</div><div class="engineeringMeta"><span><b>Obra:</b> ${esc(state.data.works.find(w=>w.id===p.workId)?.name||'—')}</span><span><b>Disciplinas:</b> ${esc(disc||'Não identificada')}</span><span><b>Arquivos:</b> ${(p.files||[]).length}</span><span><b>Status:</b> ${engineeringProjectStatus(p)}</span></div><div class="module-actions"><button class="btn" id="engAddManual">+ Item manual</button><button class="btn" id="engApplyPrices" ${projectBlocked?'disabled title="Bloqueado: existem itens com texto corrompido"':''}>💲 Associar preços oficiais</button><button class="btn" id="engExport">⇧ Exportar levantamento</button>${isAdmin()?`<button class="btn danger" id="engDeleteProject" ${integrated?'disabled title="Levantamentos já integrados não podem ser excluídos por esta ação"':''}>🗑 Excluir levantamento</button><button class="btn primary" id="engIntegrate" ${(p.integratedAt||projectBlocked)?'disabled':''}>${projectBlocked?'⛔ Integração bloqueada':p.integratedAt?'✓ Estrutura já alimentada':'✓ Aprovar e alimentar ObraTop'}</button>`:''}</div></div>${engineeringTakeoffTable(items)}${engineeringResourceCards(res)}`;
 }
 body.innerHTML=list+detail;
 $$('.engProjectTab').forEach(b=>b.onclick=async()=>{engineeringState.selectedProjectId=b.dataset.id;const ts=await getDocs(collection(fs,'organizations',state.orgId,'engineeringProjects',b.dataset.id,'takeoffs'));engineeringState.takeoffs=ts.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted).sort(engineeringCompareEap);renderEngineeringBody()});
 if($('#engAddManual'))$('#engAddManual').onclick=()=>openEngineeringManualItem(p);
 if($('#engApplyPrices'))$('#engApplyPrices').onclick=()=>openEngineeringBaseAssociation(p);
 if($('#engExport'))$('#engExport').onclick=()=>engineeringExport(p);
 if($('#engDeleteProject'))$('#engDeleteProject').onclick=()=>engineeringDeleteProject(p);
 if($('#engIntegrate'))$('#engIntegrate').onclick=()=>openEngineeringIntegration(p);
 $$('.engEdit').forEach(b=>b.onclick=()=>openEngineeringEditItem(p,items.find(x=>x.id===b.dataset.id)));
 $$('.engToggle').forEach(b=>b.onchange=()=>engineeringToggleItem(p,b.dataset.id,b.checked));
}
function engineeringTakeoffTable(items){
 if(!items.length)return`<div class="card empty">Nenhum quantitativo textual confiável foi identificado. Use <b>Item manual</b> ou importe um PDF vetorial/textual com tabelas, legendas e quantitativos.</div>`;
 const ordered=[...items].sort(engineeringCompareEap);return`<div class="card"><div class="sectiontitle">Prévia do levantamento</div><div class="tablewrap engineeringTable"><table><thead><tr><th>Usar</th><th>EAP</th><th>Disciplina</th><th>Serviço / material</th><th>Qtd.</th><th>Un.</th><th>Preço ref.</th><th>Total</th><th>Confiança</th><th>Origem</th><th>Ação</th></tr></thead><tbody>${ordered.map(x=>{const q=engineeringItemQuality(x),blocked=!q.ok;return`<tr class="${blocked?'engineeringBlockedRow':''}"><td><input class="engToggle" data-id="${x.id}" type="checkbox" ${!blocked&&x.selected!==false?'checked':''} ${blocked?'disabled title="Item bloqueado por texto corrompido"':''}></td><td>${blocked?'<span class="badge bad">BLOQUEADO</span><br>':''}${esc(x.eap)}<br><small>${esc(x.eapTitle)}</small></td><td>${esc(x.disciplineLabel||x.discipline)}</td><td><b>${esc(x.description)}</b><br><small>${blocked?'⛔ Texto de origem inválido — não integrável':esc(x.priceSource||'Sem preço')}</small></td><td>${(+x.qty||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}</td><td>${esc(x.unit)}</td><td>${blocked?'—':money(x.unitValue)}</td><td>${blocked?'—':money0((+x.qty||0)*(+x.unitValue||0))}</td><td>${blocked?'<span class="badge bad">BLOQUEADO</span>':(x.technicalValidation==='pending'?'<span class="badge ok">Importação 100%</span><br><small>Validação técnica pendente</small>':engineeringConfidenceBadge(+x.confidence||0,!!x.reviewApproved))}</td><td>${esc(x.fileName||'Manual')}<br><small>${x.page?'p. '+x.page:''}</small></td><td><button class="btn small engEdit" data-id="${x.id}">Editar</button></td></tr>`}).join('')}</tbody></table></div></div>`;
}
function engineeringResourceCards(res){const block=(title,arr,qtyLabel='Qtd.')=>`<div class="card engineeringResource"><div class="sectiontitle">${title}</div>${arr.length?`<div class="tablewrap"><table><thead><tr><th>Recurso</th><th>${qtyLabel}</th><th>Un.</th></tr></thead><tbody>${arr.slice(0,40).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td><td>${esc(x.unit)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nenhum recurso calculado.</p>'}</div>`;return`<div class="engineeringResources">${block('Materiais estimados',res.materials)}${block('Mão de obra necessária',res.labor,'Horas')}${block('Equipamentos / máquinas',res.equipment,'Horas')}${block('Ferramental necessário',res.tools)}</div>`}
function engineeringProgressView(el,pct,title,detail='',kind='run'){if(!el)return;const n=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));el.classList.remove('hidden','ok','bad');if(kind==='ok')el.classList.add('ok');if(kind==='bad')el.classList.add('bad');el.innerHTML=`<div class="engProgressHead"><b>${esc(title||'Processando projeto')}</b><strong>${n}%</strong></div><div class="engProgressTrack"><span style="width:${n}%"></span></div><div class="engProgressDetail">${esc(detail||'Aguarde…')}</div>`}

const CAIXA42_SOURCE='https://www.caixa.gov.br/Downloads/banco-projetos-projetos-HIS/casa_42m2.pdf';
function openCaixa42Demo(){
 if(!isAdmin())return alert('A demonstração oficial somente pode ser criada pelo Administrador geral.');
 const existing=state.data.works.find(w=>!w.deleted&&norm(w.name)===norm('Residência Unifamiliar CAIXA 42 m² — Demonstração'));
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog"><h2>Residência CAIXA 42 m² — demonstração operacional</h2><p>Esta rotina cria uma <b>nova obra demonstrativa</b> e preenche os módulos do ObraTop com estrutura inicial baseada no caderno oficial <b>Projeto padrão – casas populares | 42 m²</b>, GIDUR/VT, Vitória–ES.</p><div class="engineeringNotice">📘 <b>Fonte oficial:</b> <a href="${CAIXA42_SOURCE}" target="_blank" rel="noopener noreferrer">casa_42m2.pdf — CAIXA</a><br>Os campos que dependem de medição geométrica, implantação local, preços atuais ou responsabilidade técnica são criados como <b>preliminares / a revisar</b>. Nenhum custo é inventado como valor oficial da CAIXA.</div>${existing?'<div class="engineeringNotice bad">⚠ Já existe uma obra com esse nome. A rotina não criará duplicidade.</div>':''}<div class="actions"><button class="btn" id="cancelModal">Cancelar</button><button class="btn primary" id="createCaixa42" ${existing?'disabled':''}>Criar obra e preencher módulos</button></div></div></div>`;
 $('#cancelModal').onclick=closeModal;
 const b=$('#createCaixa42');if(b)b.onclick=createCaixa42Demo;
}
async function createCaixa42Demo(){
 if(!isAdmin())return;
 const btn=$('#createCaixa42');if(btn){btn.disabled=true;btn.textContent='Criando…'}
 try{
  if(state.data.works.some(w=>!w.deleted&&norm(w.name)===norm('Residência Unifamiliar CAIXA 42 m² — Demonstração')))throw Error('A obra demonstrativa CAIXA 42 m² já existe.');
  const batch=writeBatch(fs),now=serverTimestamp(),uid=state.user.uid;
  const workRef=doc(collection(fs,'organizations',state.orgId,'works')),workId=workRef.id;
  const start=today(),end=addWorkdays(start,120);
  const base={createdAt:now,createdBy:uid,updatedAt:now,updatedBy:uid,deleted:false,demoCaixa42:true,sourceReference:CAIXA42_SOURCE,sourceRelease:RELEASE};
  batch.set(workRef,{...base,name:'Residência Unifamiliar CAIXA 42 m² — Demonstração',client:'Demonstração técnica baseada em publicação oficial CAIXA',address:'Vitória - ES — referência do caderno; ajustar à implantação real',start,end,value:0,status:'Planejamento',progress:0});

  const add=(type,row)=>{const ref=doc(collection(fs,'organizations',state.orgId,type));batch.set(ref,{...base,...row});return ref.id};

  // Fornecedor demonstrativo
  const supplierRef=doc(collection(fs,'organizations',state.orgId,'suppliers'));
  batch.set(supplierRef,{...base,sourceDemoWorkId:workId,name:'Fornecedor demonstrativo — Materiais CAIXA 42 m²',cnpj:'',phone:'',email:'',category:'Materiais de construção — demonstração',status:'Ativo'});

  // Medição inicial
  add('measurements',{workId,date:start,number:'MED-000',description:'Marco zero da obra demonstrativa CAIXA 42 m²',physical:0,value:0,status:'Pendente'});

  // Orçamento preliminar sem preços inventados.
  const budgetRows=[
   ['1.0','Serviços preliminares','Implantação, locação e preparações iniciais','vb',1],
   ['2.0','Fundações','Fundações conforme projeto e condições locais','vb',1],
   ['3.0','Estrutura','Elementos estruturais e cintas/vergas conforme projeto','vb',1],
   ['4.0','Alvenaria','Alvenaria em blocos de concreto e complementos','vb',1],
   ['5.0','Cobertura','Estrutura de madeira e telha cerâmica tipo plan','vb',1],
   ['6.0','Esquadrias','Portas de madeira e janelas conforme projeto','vb',1],
   ['7.0','Revestimentos','Chapisco, reboco e revestimentos de áreas molhadas','vb',1],
   ['8.0','Forro','Forro de PVC no padrão básico previsto no caderno','vb',1],
   ['9.0','Pisos','Lastro, contrapiso, acabamento e calçada de proteção','vb',1],
   ['10.0','Instalações hidrossanitárias','Água, esgoto, louças, metais e acessórios','vb',1],
   ['11.0','Instalações elétricas','Instalações elétricas — revisar conforme projeto complementar','vb',1],
   ['12.0','Pintura e acabamento','Pintura e acabamentos conforme padrão selecionado','vb',1]
  ];
  budgetRows.forEach(([category,group,description,unit,qty])=>add('budgets',{workId,category:`${category} - ${group}`,description,unit,qty,unitValue:0,bdi:0}));

  // EAP / cronograma inicial
  let cursor=start,prev='';
  budgetRows.forEach(([category,group,description,unit,qty],i)=>{
    const dur=[3,8,8,10,7,5,10,4,7,8,6,7][i],wbs=category,endAct=addWorkdays(cursor,dur);
    add('activities',{workId,wbs,name:group,start:cursor,end:endAct,durationDays:dur,progressMode:'Percentual',progress:0,plannedQty:1,actualQty:0,unit:'etapa',predecessors:prev,responsible:'A definir',status:'Não iniciada'});
    prev=wbs;cursor=nextWorkday(endAct);
  });

  const inv=[
   ['Blocos de concreto','Alvenaria','un'],['Cimento Portland','Argamassas','sc'],['Areia','Agregados','m³'],
   ['Telha cerâmica tipo plan','Cobertura','un'],['Madeira para cobertura','Cobertura','m³'],['Forro PVC branco','Forro','m²'],
   ['Azulejo 20 x 20 cm','Revestimentos','m²'],['Piso cerâmico','Pisos','m²'],['Portas de madeira','Esquadrias','un'],
   ['Janelas','Esquadrias','un'],['Tubulações e conexões','Hidrossanitário','vb'],['Materiais elétricos','Elétrica','vb']
  ];
  inv.forEach(([material,category,unit])=>add('inventory',{workId,date:start,material,category:'Planejado pela Engenharia Inteligente',stockMode:'planned',unit,currentStock:0,minStock:0,maxStock:0,safetyStock:0,avgDailyConsumption:0,leadTimeDays:0,reorderPoint:0,anticipationStock:0,unitValue:0}));

  add('orders',{workId,supplierId:supplierRef.id,date:start,dueDate:'',description:'Cotação preliminar — materiais da obra demonstrativa CAIXA 42 m². Quantidades e preços devem ser revisados antes da compra.',value:0,status:'Em cotação'});
  add('finance',{workId,date:start,dueDate:'',description:'Previsão inicial de custo — aguardando orçamento atualizado',type:'Despesa',category:'Planejamento',value:0,status:'Previsto'});
  add('contracts',{workId,number:'CAIXA42-DEMO',party:'Demonstração técnica',object:'Execução de residência unifamiliar demonstrativa baseada no Projeto padrão CAIXA 42 m²; ajustar à implantação e responsabilidades técnicas reais.',start,end,value:0,status:'Ativo'});
  add('staff',{name:'Equipe planejada — Pedreiro',role:'Pedreiro — dimensionar após orçamento executivo',admission:start,salary:0,workId,status:'Inativo'});
  add('staff',{name:'Equipe planejada — Ajudante',role:'Ajudante — dimensionar após orçamento executivo',admission:start,salary:0,workId,status:'Inativo'});
  add('equipment',{name:'Betoneira — prevista',code:'CAIXA42-EQP-001',workId,startDate:start,monthlyCost:0,hourmeter:0,nextMaintenance:'',status:'Parado'});
  add('equipment',{name:'Ferramental de obra — previsto',code:'CAIXA42-EQP-002',workId,startDate:start,monthlyCost:0,hourmeter:0,nextMaintenance:'',status:'Parado'});
  add('quality',{workId,date:start,stage:'Planejamento / projetos',issue:'Conferir adaptação do projeto padrão à implantação, solo, clima, normas locais e projetos complementares antes da execução.',responsible:'Responsável Técnico',deadline:start,severity:'Maior',status:'Aberta'});
  add('safety',{workId,date:start,type:'Inspeção',description:'Elaborar PGR, análise de riscos, instalações provisórias e plano de segurança antes do início da execução.',responsible:'Responsável Técnico / Segurança',status:'Aberto'});
  add('documents',{workId,name:'Projeto padrão CAIXA — casas populares 42 m²',category:'Projeto / Referência oficial',date:'2007-01-01',expiry:'',revision:'Referência pública',status:'Em aprovação',reference:CAIXA42_SOURCE,notes:'Fonte: Cadernos CAIXA, Projeto padrão – casas populares | 42 m², GIDUR/VT, Vitória–ES, janeiro/2007. O projeto deve ser revisado e ajustado por profissional habilitado antes de uso em obra real.'});

  // Projeto de Engenharia Inteligente com itens preliminares, sem preços oficiais inventados.
  const engRef=doc(collection(fs,'organizations',state.orgId,'engineeringProjects')),engId=engRef.id;
  const takeoffs=[
   ['2.0','Fundações','Fundações conforme projeto e condições geotécnicas locais','vb',1,'Estrutural'],
   ['4.0','Alvenaria','Alvenaria em blocos de concreto 9 x 19 x 39 cm','vb',1,'Arquitetônico'],
   ['4.0','Alvenaria','Vergas e contravergas em blocos canaleta / concreto estrutural','vb',1,'Estrutural'],
   ['5.0','Cobertura','Cobertura com telha cerâmica tipo plan','vb',1,'Arquitetônico'],
   ['5.0','Cobertura','Madeiramento de cobertura conforme projeto','vb',1,'Arquitetônico'],
   ['6.0','Esquadrias','Portas de madeira conforme ambientes','vb',1,'Arquitetônico'],
   ['6.0','Esquadrias','Janelas conforme projeto arquitetônico','vb',1,'Arquitetônico'],
   ['7.0','Revestimentos','Chapisco e reboco em paredes internas/externas','vb',1,'Arquitetônico'],
   ['7.0','Revestimentos','Revestimento cerâmico nas áreas molhadas','vb',1,'Arquitetônico'],
   ['8.0','Forro','Forro de PVC branco — padrão básico','vb',1,'Arquitetônico'],
   ['9.0','Pisos','Lastro, piso e calçada de proteção','vb',1,'Arquitetônico'],
   ['10.0','Hidrossanitário','Instalações hidráulicas, esgoto e aparelhos sanitários','vb',1,'Hidrossanitário']
  ];
  batch.set(engRef,{...base,name:'Importação de referência — CAIXA 42 m²',workId,bdi:0,baseDate:start,status:'review',takeoffCount:takeoffs.length,highConfidenceCount:0,sourceOfficial:true,sourceUrl:CAIXA42_SOURCE,files:[{name:'casa_42m2.pdf',discipline:'architectural',disciplineLabel:'Projeto padrão CAIXA 42 m²',scale:'Consultar PDF oficial',revision:'janeiro/2007',textLayer:true,sourceUrl:CAIXA42_SOURCE}],release:RELEASE});
  takeoffs.forEach(([eap,eapTitle,description,unit,qty,disciplineLabel])=>{
    const ref=doc(collection(fs,'organizations',state.orgId,'engineeringProjects',engId,'takeoffs'));
    batch.set(ref,{...base,projectId:engId,workId,eap,eapTitle,description,unit,qty,unitValue:0,bdi:0,confidence:65,reviewApproved:false,trade:'other',discipline:'reference',disciplineLabel,priceSource:'Sem preço oficial importado — revisar SINAPI/local',fileName:'casa_42m2.pdf',page:0,selected:true});
  });

  await batch.commit();
  await audit('caixa42-demo-create','works',workId,{source:CAIXA42_SOURCE,engineeringProjectId:engId,release:RELEASE,mode:'official-reference-demo'});
  closeModal();toast('Obra demonstrativa CAIXA 42 m² criada e módulos preenchidos.');
  engineeringState.selectedProjectId=engId;
  route('dashboard');
 }catch(e){
  console.error(e);alert('Não foi possível criar a demonstração CAIXA 42 m²: '+friendly(e));
  if(btn){btn.disabled=false;btn.textContent='Criar obra e preencher módulos'}
 }
}


function engineeringEapParts(v){
 const raw=String(v||'').trim();
 if(!raw)return [999999];
 return raw.split(/[.\-\/]/).map(x=>{
   const m=String(x).match(/\d+/);
   return m?Number(m[0]):999999
 })
}
function engineeringCompareEap(a,b){
 const aa=engineeringEapParts(a?.eap),bb=engineeringEapParts(b?.eap),n=Math.max(aa.length,bb.length);
 for(let i=0;i<n;i++){const av=aa[i]??-1,bv=bb[i]??-1;if(av!==bv)return av-bv}
 return String(a?.description||'').localeCompare(String(b?.description||''),'pt-BR',{sensitivity:'base'})
}
function engineeringDisciplineFromCategory(category,description=''){
 const c=engNorm(String(category||''));
 if(/servicos preliminares|preliminar|canteiro|locacao de obra|limpeza do terreno/.test(c))return{key:'civil',label:'Civil / Serviços Preliminares'};
 if(/fundac|estrutura|concreto|alvenaria estrutural/.test(c))return{key:'structural',label:'Estrutural'};
 if(/instalacoes eletricas|eletrica|spda/.test(c))return{key:'electrical',label:'Elétrica'};
 if(/instalacoes hidraulicas|hidraulica|hidrossanit/.test(c))return{key:'plumbing',label:'Hidrossanitário'};
 if(/instalacoes sanitarias|sanitaria|esgoto/.test(c))return{key:'sanitary',label:'Sanitário'};
 if(/instalacoes especiais|aquecimento solar|gas|climatiz/.test(c))return{key:'special',label:'Instalações Especiais'};
 if(/cobertura|esquadria|revestimento|piso|pintura|vidro|paredes e paineis|arquitet/.test(c))return{key:'architectural',label:'Arquitetônico'};
 return engineeringDiscipline(`${category||''} ${description||''}`)
}
function engineeringHeaderKey(v){return engNorm(String(v||'')).replace(/[^a-z0-9]+/g,' ').trim()}
function engineeringSpreadsheetColumns(rows){
 const keys=[...new Set((rows||[]).flatMap(r=>Object.keys(r||{})))],pick=(patterns)=>keys.find(k=>patterns.some(rx=>rx.test(engineeringHeaderKey(k))))||'';
 return{
  eap:pick([/^eap$/, /^item$/, /^codigo$/, /^cod$/]),
  category:pick([/^categoria$/, /^etapa$/, /^grupo$/, /^grupo eap$/, /^disciplina$/]),
  description:pick([/^descricao$/, /^servico material$/, /^servico$/, /^material$/, /^insumo$/, /^item descricao$/]),
  unit:pick([/^unidade$/, /^unid$/, /^und$/, /^unit$/]),
  qty:pick([/^quantidade$/, /^qtd$/, /^quant$/, /^qtd padrao basico$/, /^quantidade padrao basico$/]),
  qtyMin:pick([/^qtd padrao minimo$/, /^quantidade padrao minimo$/]),
  price:pick([/^valor unitario$/, /^preco unitario$/, /^preco ref$/, /^preco$/, /^custo unitario$/]),
  bdi:pick([/^bdi$/, /^bdi %$/]),
  source:pick([/^fonte$/, /^origem$/])
 }}
function engineeringSpreadsheetTakeoffs(rows,fileName,mode='basic'){
 const c=engineeringSpreadsheetColumns(rows);
 if(!c.description||!c.unit||(!c.qty&&!c.qtyMin))throw Error(`A planilha ${fileName} precisa conter, no mínimo, Descrição, Unidade e Quantidade. O ObraTop também reconhece EAP/Item, Categoria/Etapa, Valor Unitário, BDI e Fonte.`);
 const out=[];
 for(let i=0;i<rows.length;i++){const r=rows[i]||{},description=String(r[c.description]||'').trim();if(!description)continue;
  const qv=mode==='minimum'&&c.qtyMin?r[c.qtyMin]:(c.qty?r[c.qty]:r[c.qtyMin]),qty=engNum(qv),unit=engUnit(r[c.unit]);
  if(!(qty>0)||!unit)continue;
  const quality=engineeringTextQuality(description);if(!quality.ok)continue;
  const rule=engineeringRule(description),cat=String(c.category?r[c.category]||'':'').trim(),eap=String(c.eap?r[c.eap]||'':'').trim();
  const discipline=engineeringDisciplineFromCategory(cat,description);
  out.push({description,qty,unit,unitValue:c.price?engNum(r[c.price]):0,confidence:100,reviewApproved:false,eap:eap||rule.eap,eapTitle:cat||rule.title,trade:rule.key,discipline:discipline.key,disciplineLabel:discipline.label,priceSource:c.price&&engNum(r[c.price])>0?'Planilha importada':'Sem preço',fileName,page:0,sourceLine:`Linha ${i+2}`,source:String(c.source?r[c.source]||'':'').trim(),selected:true,spreadsheetRow:i+2,bdiImported:c.bdi?engNum(r[c.bdi]):0,importConfidence:100,technicalValidation:'pending'});
 }
 if(!out.length)throw Error(`Nenhum quantitativo válido foi encontrado em ${fileName}. Confira as colunas e se as quantidades são maiores que zero.`);
 return out
}
async function engineeringSpreadsheetFile(file,mode='basic'){
 if(!window.XLSX)throw Error('Biblioteca Excel não carregada.');
 const buf=await file.arrayBuffer(),hash=await engineeringHash(buf),wb=window.XLSX.read(buf,{type:'array',cellDates:true});
 const preferred=['IMPORTAR_OBRATOP','QUANTITATIVOS','ORCAMENTO','ORÇAMENTO','LEVANTAMENTO'];
 const sheetName=wb.SheetNames.find(n=>preferred.includes(engNorm(n).toUpperCase().replaceAll(' ','_')))||wb.SheetNames[0];
 const ws=wb.Sheets[sheetName],rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
 const takeoffs=engineeringSpreadsheetTakeoffs(rows,file.name,mode);
 return{hash,sheetName,rows:rows.length,takeoffs}
}
async function engineeringGoogleSheet(url,mode='basic'){
 const raw=String(url||'').trim();if(!raw)throw Error('Informe o link do Google Planilhas.');
 const m=raw.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);if(!m)throw Error('Link do Google Planilhas inválido.');
 const gid=(raw.match(/[?&#]gid=(\d+)/)||[])[1]||'0';
 const csv=`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
 let res;try{res=await fetch(csv,{cache:'no-store'})}catch{throw Error('Não foi possível acessar a planilha. Compartilhe-a como "Qualquer pessoa com o link — Leitor" ou exporte em XLSX/CSV.')}
 if(!res.ok)throw Error('Google Planilhas não acessível. Compartilhe-a como "Qualquer pessoa com o link — Leitor" ou exporte em XLSX/CSV.');
 const text=await res.text();if(/<!doctype html|<html/i.test(text))throw Error('O Google retornou uma página de login em vez da planilha. Ajuste o compartilhamento ou exporte em XLSX/CSV.');
 const wb=window.XLSX.read(text,{type:'string'}),ws=wb.Sheets[wb.SheetNames[0]],rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});
 const takeoffs=engineeringSpreadsheetTakeoffs(rows,'Google Planilhas',mode),hash=await engineeringHash(new TextEncoder().encode(text).buffer);
 return{hash,sheetName:wb.SheetNames[0],rows:rows.length,takeoffs,url:raw}
}
function openEngineeringImport(){const works=engineeringWorkOptions();if(!works)return alert('Cadastre uma obra antes de importar.');$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog"><h2>Importar PDF ou planilha</h2><p class="muted">Aceita PDF, XLS, XLSX e CSV. Google Planilhas pode ser importado por link compartilhado. Nada alimenta os módulos operacionais sem revisão e aprovação.</p><form id="engImportForm"><div class="formgrid"><div class="field"><label>Obra de destino</label><select name="workId" required>${works}</select></div><div class="field"><label>Nome do levantamento</label><input name="name" required value="Levantamento inteligente ${dateBR(today())}"></div><div class="field"><label>BDI padrão (%)</label><input name="bdi" type="number" min="0" max="100" step="0.01" value="${ENGINEERING_INTERNAL_BDI}"></div><div class="field"><label>Data-base</label><input name="baseDate" type="date" value="${today()}"></div><div class="field"><label>Padrão quantitativo</label><select name="qtyMode"><option value="basic">Padrão básico / Quantidade</option><option value="minimum">Padrão mínimo (quando existir)</option></select></div><div class="field full"><label>Arquivos</label><input name="files" type="file" accept=".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" multiple><small>Até ${ENGINEERING_MAX_FILES} arquivos. Para planilhas, o ObraTop reconhece Descrição, Unidade, Quantidade, EAP/Item, Categoria/Etapa, Valor Unitário, BDI e Fonte.</small></div><div class="field full"><label>Google Planilhas (opcional)</label><input name="googleSheetUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/..."><small>A planilha deve estar compartilhada para leitura por link. Se a política da conta impedir acesso, exporte-a em XLSX ou CSV.</small></div></div><div id="engProgress" class="engineeringProgress hidden"></div><div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button type="submit" class="btn primary" id="engAnalyzeBtn">Importar e analisar</button></div></form></div></div>`;$('#cancelModal').onclick=closeModal;const form=$('#engImportForm');form.onsubmit=engineeringAnalyzeFiles}
async function engineeringAnalyzeFiles(e){e.preventDefault();if(!state.member)return;const form=e.target,fd=new FormData(form),files=[...form.elements.files.files].slice(0,ENGINEERING_MAX_FILES),googleUrl=String(fd.get('googleSheetUrl')||'').trim(),mode=String(fd.get('qtyMode')||'basic'),progress=$('#engProgress'),submit=form.querySelector('#engAnalyzeBtn');if(!files.length&&!googleUrl){engineeringProgressView(progress,0,'Nenhum arquivo selecionado','Selecione PDF/XLS/XLSX/CSV ou informe um link do Google Planilhas.','bad');return}const workId=String(fd.get('workId')),name=String(fd.get('name')||'Levantamento'),bdi=clamp(fd.get('bdi'),0,100),baseDate=String(fd.get('baseDate')||today());if(submit){submit.disabled=true;submit.textContent='Importando…'}try{const parsedFiles=[],takeoffs=[],total=files.length+(googleUrl?1:0);let done=0;engineeringProgressView(progress,3,'Iniciando importação',`${total} fonte(s) para analisar…`);
 for(const f of files){const ext=(f.name.split('.').pop()||'').toLowerCase();engineeringProgressView(progress,8+70*done/total,'Lendo arquivo',f.name);
  if(ext==='pdf'){const parsed=await engineeringPdfText(f);const q=engineeringTextQuality(parsed.text);if(!q.ok)throw Error(`O PDF ${f.name} possui camada de texto corrompida. Use a planilha XLS/XLSX/CSV correspondente.`);const ex=engineeringExtractTakeoffs(parsed,f.name);if(!ex.length)throw Error(`Nenhum quantitativo confiável foi identificado em ${f.name}.`);takeoffs.push(...ex);parsedFiles.push({name:f.name,size:f.size,hash:parsed.hash,pages:parsed.pages,type:'pdf',discipline:parsed.discipline.key,disciplineLabel:parsed.discipline.label,textQuality:q.score,textCorrupted:false})}
  else if(['xls','xlsx','csv'].includes(ext)){const parsed=await engineeringSpreadsheetFile(f,mode);takeoffs.push(...parsed.takeoffs);parsedFiles.push({name:f.name,size:f.size,hash:parsed.hash,type:ext,sheet:parsed.sheetName,rows:parsed.rows,discipline:'spreadsheet',disciplineLabel:'Planilha'})}
  else throw Error(`Formato não suportado: ${f.name}. Use PDF, XLS, XLSX ou CSV.`);
  done++;
 }
 if(googleUrl){engineeringProgressView(progress,8+70*done/total,'Lendo Google Planilhas','Acessando planilha compartilhada…');const parsed=await engineeringGoogleSheet(googleUrl,mode);takeoffs.push(...parsed.takeoffs);parsedFiles.push({name:'Google Planilhas',hash:parsed.hash,type:'google-sheets',sheet:parsed.sheetName,rows:parsed.rows,url:googleUrl,discipline:'spreadsheet',disciplineLabel:'Google Planilhas'});done++}
 if(!takeoffs.length)throw Error('Nenhum quantitativo válido foi encontrado.');
 for(const x of takeoffs){if(!(x.unitValue>0)){const best=engineeringBestPrice(x.description,x.unit);if(best){x.unitValue=best.price;x.priceSource=`Banco importado${best.code?' • '+best.code:''}`;x.priceMatch=Math.round(best.score*100)}}}
 engineeringProgressView(progress,82,'Consolidando',`${takeoffs.length} quantitativo(s) válido(s).`);
 const projectRef=doc(collection(fs,'organizations',state.orgId,'engineeringProjects')),now=serverTimestamp();await setDoc(projectRef,{name,workId,bdi,baseDate,files:parsedFiles,status:'review',takeoffCount:takeoffs.length,highConfidenceCount:takeoffs.filter(x=>x.confidence>=85).length,importType:parsedFiles.map(x=>x.type).join(','),qtyMode:mode,createdAt:now,createdBy:state.user.uid,updatedAt:now,release:RELEASE});
 for(let i=0;i<takeoffs.length;i+=350){const batch=writeBatch(fs);for(const x of takeoffs.slice(i,i+350)){const ref=doc(collection(fs,'organizations',state.orgId,'engineeringProjects',projectRef.id,'takeoffs'));batch.set(ref,{...x,projectId:projectRef.id,workId,bdi,createdAt:serverTimestamp(),createdBy:state.user.uid})}await batch.commit()}
 await audit('engineering-import','engineeringProjects',projectRef.id,{workId,sources:parsedFiles.map(f=>({name:f.name,type:f.type,hash:String(f.hash||'').slice(0,16)})),takeoffs:takeoffs.length,qtyMode:mode});engineeringProgressView(progress,100,'Importação concluída',`${takeoffs.length} quantitativo(s) preparados para revisão.`,'ok');engineeringState.selectedProjectId=projectRef.id;toast(`Importação concluída: ${takeoffs.length} quantitativo(s).`);await new Promise(r=>setTimeout(r,350));closeModal();await renderEngineering()
 }catch(err){console.error(err);engineeringProgressView(progress,100,'Falha na importação',friendly(err),'bad');if(submit){submit.disabled=false;submit.textContent='Tentar novamente'}alert('Falha ao importar: '+friendly(err))}}
function openEngineeringManualItem(p){if(!p)return;openEngineeringEditItem(p,null)}
function openEngineeringEditItem(p,item){const works=p?.workId||'',r=item?engineeringRule(item.description):ENGINEERING_RULES.at(-1);$('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog"><h2>${item?'Editar':'Novo'} quantitativo</h2><form id="engItemForm"><div class="formgrid"><div class="field full"><label>Descrição</label><input name="description" required value="${esc(item?.description||'')}"></div><div class="field"><label>Quantidade</label><input name="qty" type="number" min="0" step="0.001" required value="${item?.qty??''}"></div><div class="field"><label>Unidade</label><input name="unit" required value="${esc(item?.unit||'m²')}"></div><div class="field"><label>Preço unitário</label><input name="unitValue" type="number" min="0" step="0.01" value="${item?.unitValue??0}"></div><div class="field"><label>Confiança (%)</label><input name="confidence" type="number" min="0" max="100" value="${item?.confidence??100}"></div><div class="field full engineeringReviewApproval"><label><input name="reviewApproved" type="checkbox" ${item?.reviewApproved?'checked':''}> Revisado pelo Administrador — liberar este item para integração mesmo com confiança inferior a 85%</label><small>Use somente depois de conferir quantidade, unidade, preço, EAP e origem no projeto.</small></div><div class="field"><label>EAP</label><input name="eap" value="${esc(item?.eap||r.eap)}"></div><div class="field"><label>Grupo EAP</label><input name="eapTitle" value="${esc(item?.eapTitle||r.title)}"></div></div><div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button class="btn primary">Salvar</button></div></form></div></div>`;$('#cancelModal').onclick=closeModal;$('#engItemForm').onsubmit=async e=>{e.preventDefault();try{const fd=new FormData(e.target),desc=String(fd.get('description')),rule=engineeringRule(desc),data={description:desc,qty:engNum(fd.get('qty')),unit:engUnit(fd.get('unit')),unitValue:engNum(fd.get('unitValue')),confidence:clamp(fd.get('confidence'),0,100),reviewApproved:fd.get('reviewApproved')==='on',reviewedAt:fd.get('reviewApproved')==='on'?serverTimestamp():null,reviewedBy:fd.get('reviewApproved')==='on'?state.user.uid:'',eap:String(fd.get('eap')||rule.eap),eapTitle:String(fd.get('eapTitle')||rule.title),trade:rule.key,discipline:item?.discipline||'manual',disciplineLabel:item?.disciplineLabel||'Manual',priceSource:item?.priceSource||'Informado manualmente',fileName:item?.fileName||'Manual',page:item?.page||0,selected:true,projectId:p.id,workId:works,bdi:p.bdi||ENGINEERING_INTERNAL_BDI,updatedAt:serverTimestamp(),updatedBy:state.user.uid};const ref=item?doc(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',item.id):doc(collection(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs'));if(item)await updateDoc(ref,data);else await setDoc(ref,{...data,createdAt:serverTimestamp(),createdBy:state.user.uid});await updateDoc(doc(fs,'organizations',state.orgId,'engineeringProjects',p.id),{takeoffCount:(p.takeoffCount||0)+(item?0:1),updatedAt:serverTimestamp()});closeModal();await engineeringLoadProjects();renderEngineeringBody()}catch(err){alert(friendly(err))}}}
async function engineeringToggleItem(p,id,checked){try{await updateDoc(doc(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',id),{selected:checked,updatedAt:serverTimestamp(),updatedBy:state.user.uid});const x=engineeringState.takeoffs.find(x=>x.id===id);if(x)x.selected=checked;renderEngineeringBody()}catch(e){alert(friendly(e))}}
async function engineeringDeleteProject(p){
 if(!isAdmin())return alert('Somente o Administrador Geral pode excluir um levantamento.');
 if(!p)return;
 const integrated=!!p.integratedAt||p.status==='integrated'||p.status==='partial'||(Array.isArray(p.integratedTakeoffIds)&&p.integratedTakeoffIds.length>0);
 if(integrated)return alert('Este levantamento já possui integração com a obra e não pode ser excluído por esta ação. Use os mecanismos de restauração/auditoria para preservar a rastreabilidade.');
 const count=engineeringState.takeoffs.length;
 if(!confirm(`Excluir SOMENTE o levantamento "${p.name}" e seus ${count} quantitativo(s)?\n\nA obra "${state.data.works.find(w=>w.id===p.workId)?.name||'—'}" e os demais módulos NÃO serão excluídos.\n\nEsta ação é definitiva para este levantamento.`))return;
 const phrase=prompt('Para confirmar, digite exatamente: EXCLUIR LEVANTAMENTO');
 if(phrase!=='EXCLUIR LEVANTAMENTO')return alert('Exclusão cancelada.');
 try{
   setSync('Excluindo levantamento…','warn');
   await audit('engineering-delete-project','engineeringProjects',p.id,{workId:p.workId,name:p.name,takeoffs:count,reason:'Exclusão manual de levantamento em revisão'});
   const refs=engineeringState.takeoffs.map(x=>doc(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',x.id));
   for(let i=0;i<refs.length;i+=350){
     const b=writeBatch(fs);
     refs.slice(i,i+350).forEach(ref=>b.delete(ref));
     await b.commit();
   }
   await deleteDoc(doc(fs,'organizations',state.orgId,'engineeringProjects',p.id));
   engineeringState.selectedProjectId='';
   engineeringState.takeoffs=[];
   toast('Levantamento excluído. A obra e os demais módulos foram preservados.');
   setSync('Sincronizado','ok');
   await engineeringLoadProjects();
   renderEngineeringBody();
 }catch(e){
   console.error(e);
   setSync('Falha na exclusão','bad');
   alert('Não foi possível excluir o levantamento: '+friendly(e));
 }
}

function engineeringAvailableBaseOptions(source=''){
 const metas=(engineeringState.costBaseMeta||[]).filter(x=>!source||x.source===source);
 const ufs=[...new Set(metas.map(x=>String(x.uf||'').toUpperCase()).filter(Boolean))].sort();
 const refs=[...new Set(metas.map(x=>x.reference).filter(Boolean))].sort().reverse();
 return{metas,ufs,refs}
}
function engineeringAssociationBaseSummary(){
 const groups={};
 for(const m of (engineeringState.costBaseMeta||[])){const k=m.source||'BASE';if(!groups[k])groups[k]=[];groups[k].push(m)}
 return Object.entries(groups).map(([src,arr])=>`<div><b>${esc(src)}</b>: ${arr.map(x=>`${esc(x.uf||'—')} • ${esc(x.reference||'—')}`).join(' | ')}</div>`).join('')||'<div>Nenhuma base oficial instalada.</div>'
}
function openEngineeringBaseAssociation(p){
 if(!engineeringState.priceBook.length)return openEngineeringPriceBook();
 const sicro=engineeringAvailableBaseOptions('SICRO3'),sinapi=engineeringAvailableBaseOptions('SINAPI'),orse=engineeringAvailableBaseOptions('ORSE-SE');
 const allRefs=[...new Set((engineeringState.costBaseMeta||[]).map(x=>x.reference).filter(Boolean))].sort().reverse();
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog"><h2>Associar preços oficiais</h2>
 <p class="muted">Escolha a fonte e, no caso do SICRO 3, <b>selecione explicitamente a UF</b> que deverá ser usada na associação. O ObraTop não utilizará outra UF silenciosamente.</p>
 <div class="engineeringNotice">${engineeringAssociationBaseSummary()}</div>
 <div class="formgrid">
  <div class="field"><label>Fonte prioritária</label><select id="assocSource">
   <option value="AUTO">Automática por tipo de obra</option>
   <option value="SINAPI">SINAPI</option>
   <option value="SICRO3">SICRO 3</option>
   <option value="ORSE-SE">ORSE-SE</option>
  </select></div>
  <div class="field"><label>UF do SICRO 3</label><select id="assocSicroUf">
   <option value="">Selecione a UF</option>
   ${sicro.ufs.map(uf=>`<option value="${esc(uf)}">${esc(uf)}</option>`).join('')}
  </select><small>Obrigatória quando a fonte selecionada for SICRO 3.</small></div>
  <div class="field"><label>Competência</label><select id="assocReference">
   <option value="">Mais recente disponível / sem filtro</option>
   ${allRefs.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('')}
  </select></div>
  <div class="field"><label>Correspondência mínima automática</label><select id="assocThreshold">
   <option value="55">55%</option><option value="60">60%</option><option value="65" selected>65%</option><option value="70">70%</option><option value="75">75%</option><option value="80">80%</option>
  </select></div>
 </div>
 <div id="assocUfWarning" class="engineeringNotice bad hidden"><b>UF obrigatória:</b> selecione a UF do SICRO 3 antes de continuar.</div>
 <div class="actions"><button type="button" class="btn" id="cancelModal">Cancelar</button><button type="button" class="btn primary" id="assocRun">Associar preços</button></div>
 </div></div>`;
 $('#cancelModal').onclick=closeModal;
 const source=$('#assocSource'),uf=$('#assocSicroUf'),warn=$('#assocUfWarning'),run=$('#assocRun');
 function syncUf(){const need=source.value==='SICRO3';uf.disabled=!need;warn.classList.toggle('hidden',!(need&&!uf.value))}
 source.onchange=syncUf;uf.onchange=syncUf;syncUf();
 run.onclick=async()=>{
  const src=source.value,selectedUf=uf.value,reference=$('#assocReference').value,threshold=Number($('#assocThreshold').value||65);
  if(src==='SICRO3'&&!selectedUf){warn.classList.remove('hidden');uf.focus();return}
  run.disabled=true;run.textContent='Associando…';
  try{await engineeringApplyPriceBook(p,{source:src==='AUTO'?'':src,uf:src==='SICRO3'?selectedUf:'',reference,threshold});closeModal()}
  catch(e){alert(friendly(e));run.disabled=false;run.textContent='Associar preços'}
 }
}
async function engineeringApplyPriceBook(p,options={}){
 const health=engineeringProjectHealth(engineeringState.takeoffs);if(!health.ok)return alert(`Bases de custos bloqueadas: ${health.blocked.length} item(ns) possuem texto corrompido.`);
 if(!engineeringState.priceBook.length)return openEngineeringPriceBook();
 const source=options.source||'',uf=options.uf||'',reference=options.reference||'',threshold=Number(options.threshold||65);
 if(source==='SICRO3'&&!uf)throw Error('Selecione a UF do SICRO 3 antes de associar os preços.');
 const workName=state.data.works.find(w=>w.id===p.workId)?.name||'';let changed=0,weak=0,unmatched=0,bySource={},byUf={};
 for(let i=0;i<engineeringState.takeoffs.length;i+=250){const b=writeBatch(fs);let chunk=0;
  for(const x of engineeringState.takeoffs.slice(i,i+250)){
   const best=engineeringBestPrice(x.description,x.unit,{discipline:x.disciplineLabel,workName,source,uf,reference});if(!best){unmatched++;continue}
   const match=Math.round(best.textScore*100);if(match<threshold){weak++;continue}
   b.update(doc(fs,'organizations',state.orgId,'engineeringProjects',p.id,'takeoffs',x.id),{
    unitValue:best.price,priceSource:engineeringCostSourceLabel(best),priceMatch:match,priceBaseSource:best.source,priceBaseUf:best.uf,priceBaseReference:best.reference,priceBaseCode:best.code||'',priceBaseId:best.baseId,priceAssociationMode:source||'AUTO',priceAssociationRequestedUf:uf||'',updatedAt:serverTimestamp(),updatedBy:state.user.uid
   });changed++;chunk++;bySource[best.source]=(bySource[best.source]||0)+1;byUf[best.uf||'—']=(byUf[best.uf||'—']||0)+1
  }if(chunk)await b.commit()
 }
 await audit('cost-base-association','engineeringProjects',p.id,{changed,weak,unmatched,bySource,byUf,requestedSource:source||'AUTO',requestedUf:uf||'',reference,threshold,bases:(engineeringState.costBaseMeta||[]).map(x=>({source:x.source,uf:x.uf,reference:x.reference,id:x.id}))});
 toast(`${changed} item(ns) associados. ${source==='SICRO3'?`SICRO 3 / ${uf}. `:''}${weak?weak+' abaixo do limite. ':''}${unmatched?unmatched+' sem correspondência.':''}`);await engineeringLoadProjects();renderEngineeringBody()
}
function engineeringExport(p){if(!p||!engineeringState.takeoffs.length)return alert('Sem itens para exportar.');const rows=engineeringState.takeoffs.map(x=>({Usar:x.selected!==false?'SIM':'NÃO',EAP:x.eap,Grupo:x.eapTitle,Disciplina:x.disciplineLabel,Descrição:x.description,Quantidade:x.qty,Unidade:x.unit,'Preço unitário':money(x.unitValue),Total:money((+x.qty||0)*(+x.unitValue||0)),'Fonte preço':x.priceSource,Confiança:x.confidence,Arquivo:x.fileName,Página:x.page}));if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'LEVANTAMENTO');XLSX.writeFile(wb,`ObraTop_Levantamento_${p.name.replace(/[^\w-]+/g,'_')}_${today()}.xlsx`)}else exportReport('budgets')}
function engineeringIntegrationEligibility(x){
 const confidence=+x.confidence||0,price=+x.unitValue||0,textQuality=engineeringTextQuality((x.description||'')+' '+(x.sourceLine||''));
 const confidenceOk=(confidence>=85||x.reviewApproved===true)&&textQuality.ok;
 const priceOk=price>0;
 return{ok:confidenceOk&&priceOk,confidenceOk,priceOk,textQualityOk:textQuality.ok,reason:[!textQuality.ok?'texto de origem corrompido — integração bloqueada':(!confidenceOk?'confiança < 85% sem revisão aprovada':''),!priceOk?'sem preço de referência':''].filter(Boolean).join(' • ')};
}
function engineeringIntegrationPlan(p,mods){
 const integratedIds=new Set(Array.isArray(p.integratedTakeoffIds)?p.integratedTakeoffIds:[]);
 const selected=engineeringState.takeoffs.filter(x=>x.selected!==false),alreadyIntegrated=selected.filter(x=>integratedIds.has(x.id));
 const candidates=selected.filter(x=>!integratedIds.has(x.id)),items=candidates.filter(x=>engineeringIntegrationEligibility(x).ok),pending=candidates.filter(x=>!engineeringIntegrationEligibility(x).ok),res=engineeringResourcesSummary(items),counts={};
 if(mods.includes('budgets'))counts.budgets=items.length;
 if(mods.includes('activities'))counts.activities=items.length;
 if(mods.includes('inventory'))counts.inventory=res.materials.filter(x=>x.qty>0).length;
 if(mods.includes('orders'))counts.orders=new Set(items.map(x=>x.eapTitle)).size;
 if(mods.includes('staff'))counts.staff=res.labor.filter(x=>x.qty>0).length;
 if(mods.includes('equipment'))counts.equipment=res.equipment.filter(x=>x.qty>0).length;
 if(mods.includes('documents'))counts.documents=items.length?((p.files||[]).length):0;
 if(mods.includes('finance'))counts.finance=new Set(items.map(x=>x.eapTitle)).size;
 const lowConfidence=pending.filter(x=>(+x.confidence||0)<85&&!x.reviewApproved).length,zeroPrice=pending.filter(x=>(+x.unitValue||0)<=0).length,total=items.reduce((a,x)=>a+(+x.qty||0)*(+x.unitValue||0),0),bdi=+p.bdi||0;
 return{selected,candidates,items,pending,alreadyIntegrated,res,counts,lowConfidence,zeroPrice,total,totalBDI:total*(1+bdi/100),bdi};
}
function engineeringIntegrationPreviewHtml(p,mods){
 const plan=engineeringIntegrationPlan(p,mods),labels={budgets:'Orçamento',activities:'EAP + Cronograma',inventory:'Estoque planejado',orders:'Solicitações de cotação',staff:'Mão de obra prevista',equipment:'Equipamentos / máquinas',documents:'Documentos',finance:'Financeiro previsto'};
 const rows=mods.map(k=>`<tr><td>${esc(labels[k]||k)}</td><td>${plan.counts[k]||0}</td><td>${k==='budgets'?money0(plan.total):k==='finance'?money0(plan.totalBDI):'—'}</td></tr>`).join('');
 const pendingRows=plan.pending.slice(0,12).map(x=>{const e=engineeringIntegrationEligibility(x);return`<tr><td>${esc(x.eap)} • ${esc(x.eapTitle)}</td><td>${esc(x.description)}</td><td>${engineeringConfidenceBadge(+x.confidence||0,!!x.reviewApproved)}</td><td>${esc(e.reason||'Revisar')}</td><td><button class="btn small engPendingEdit" data-id="${x.id}">Revisar</button></td></tr>`}).join('');
 const pendingBox=plan.pending.length?`<div class="engineeringPendingBox"><div class="sectiontitle">Pendentes de revisão — não serão integrados</div><p class="muted">Estes itens permanecem no levantamento e só entrarão na obra depois de revisão manual. Nenhum deles será gravado nesta integração.</p><div class="tablewrap"><table><thead><tr><th>EAP</th><th>Item</th><th>Confiança</th><th>Motivo</th><th>Ação</th></tr></thead><tbody>${pendingRows}</tbody></table></div>${plan.pending.length>12?`<small>+ ${plan.pending.length-12} item(ns) pendente(s) não exibido(s) nesta prévia.</small>`:''}</div>`:`<div class="engineeringNotice">✓ Nenhum item pendente de revisão para esta integração.</div>`;
 return`<div class="engineeringImpact"><div class="sectiontitle">Conferência antes da gravação</div><div class="engineeringImpactKpis"><div><span>Integráveis agora</span><strong>${plan.items.length}</strong></div><div><span>Pendentes</span><strong>${plan.pending.length}</strong></div><div><span>Já integrados</span><strong>${plan.alreadyIntegrated.length}</strong></div><div><span>Custo integrável</span><strong>${money0(plan.total)}</strong></div><div><span>Com BDI ${plan.bdi.toLocaleString('pt-BR')}%</span><strong>${money0(plan.totalBDI)}</strong></div></div><div class="tablewrap"><table><thead><tr><th>Módulo</th><th>Registros previstos</th><th>Valor previsto</th></tr></thead><tbody>${rows}</tbody></table></div>${pendingBox}</div>`;
}
function openEngineeringIntegration(p){
 if(!isAdmin())return alert('Somente o Administrador Geral pode alimentar a estrutura da obra.');
 const health=engineeringProjectHealth(engineeringState.takeoffs);if(!health.ok)return alert(`INTEGRAÇÃO BLOQUEADA: ${health.blocked.length} item(ns) possuem texto corrompido ou ilegível. Exclua este levantamento e faça uma nova importação antes de alimentar a obra.`);
 const m=engineeringMetrics(engineeringState.takeoffs);if(!m.selected.length)return alert('Selecione pelo menos um quantitativo.');
 const options=[['budgets','Orçamento'],['activities','EAP + Cronograma'],['inventory','Materiais / Estoque planejado'],['orders','Solicitações para cotação'],['staff','Mão de obra prevista'],['equipment','Equipamentos / máquinas previstos'],['documents','Registro dos projetos analisados'],['finance','Financeiro previsto (opcional)']];
 $('#modalRoot').innerHTML=`<div class="modalback"><div class="dialog engineeringDialog engineeringIntegrationDialog"><h2>Aprovar e alimentar o ObraTop</h2><p><b>${esc(p.name)}</b> • ${m.selected.length} item(ns) selecionado(s) • orçamento preliminar ${money0(m.cost)}</p><div class="engineeringNotice">🛡️ <b>Integração segura por confiança:</b> somente itens com confiança ≥ 85% ou explicitamente revisados pelo Administrador, e com preço informado, serão gravados. Pendentes permanecem no levantamento. Antes da primeira gravação será criado um <b>ponto de restauração automático</b>.</div><div class="engineeringIntegrateOptions">${options.map(([v,t])=>`<label><input type="checkbox" name="mod" value="${v}" ${v==='finance'?'':'checked'}> ${t}</label>`).join('')}</div><div id="engIntegrationPreview"></div><label class="engineeringConfirm"><input type="checkbox" id="engApproveCheck"> Confirmo que revisei os itens integráveis e o impacto previsto. Os pendentes permanecerão fora da obra.</label><div id="engIntegrationProgress" class="engProgress hidden"></div><div class="actions"><button class="btn" id="cancelModal">Cancelar</button><button class="btn primary" id="engDoIntegrate">Integrar somente aprovados</button></div></div></div>`;
 const selectedMods=()=>[...$$('input[name="mod"]:checked')].map(x=>x.value),refresh=()=>{const box=$('#engIntegrationPreview');if(box)box.innerHTML=engineeringIntegrationPreviewHtml(p,selectedMods());$$('.engPendingEdit').forEach(b=>b.onclick=()=>openEngineeringEditItem(p,engineeringState.takeoffs.find(x=>x.id===b.dataset.id)))};
 $$('input[name="mod"]').forEach(x=>x.onchange=refresh);refresh();
 $('#cancelModal').onclick=closeModal;
 $('#engDoIntegrate').onclick=()=>engineeringIntegrate(p,selectedMods(),$('#engApproveCheck').checked,$('#engIntegrationProgress'),$('#engDoIntegrate'));
}
async function engineeringIntegrate(p,mods,confirmed,progressEl=null,buttonEl=null){
 const health=engineeringProjectHealth(engineeringState.takeoffs);if(!health.ok)return alert(`Integração cancelada: ${health.blocked.length} item(ns) com texto corrompido permanecem neste levantamento.`);
 if(!confirmed)return alert('Confirme que revisou o levantamento.');
 if(!mods.length)return alert('Selecione pelo menos um módulo.');
 const plan=engineeringIntegrationPlan(p,mods),items=plan.items,work=state.data.works.find(w=>w.id===p.workId);
 if(!items.length){if(plan.pending.length)return alert('Nenhum item está liberado para integração. Revise os itens pendentes antes de continuar.');return alert('Não há novos itens aprovados para integrar.')}
 if(!work)return alert('Obra de destino não encontrada.');
 if(!confirm(`A estrutura será alimentada em ${mods.length} módulo(s), a partir de ${items.length} item(ns) aprovado(s).\n${plan.pending.length} item(ns) pendente(s) permanecerão fora da integração.\n\nUm ponto de restauração será criado antes da operação. Continuar?`))return;
 if(buttonEl){buttonEl.disabled=true;buttonEl.textContent='Integrando…'}
 engineeringProgressView(progressEl,3,'Preparando integração','Validando obra, módulos e itens selecionados…');
 setSync('Preparando Engenharia Inteligente…','warn');
 const batchId=`eng_${Date.now()}_${crypto.randomUUID().slice(0,8)}`;
 try{
  engineeringProgressView(progressEl,8,'Criando proteção','Gerando ponto de restauração pré-integração…');
  const safetyPoint=await createRestorePoint(`Pré-integração Engenharia Inteligente — ${p.name}`,{category:'Pré-importação',protected:false});
  if(!safetyPoint)throw Error('A integração foi cancelada porque o ponto de restauração de segurança não pôde ser criado.');
  const res=engineeringResourcesSummary(items),created={};
  const add=async(type,rows)=>{created[type]=0;for(let i=0;i<rows.length;i+=350){const b=writeBatch(fs);for(const row of rows.slice(i,i+350)){const ref=doc(collection(fs,'organizations',state.orgId,type));b.set(ref,{...row,sourceEngineeringProjectId:p.id,engineeringBatchId:batchId,createdAt:serverTimestamp(),createdBy:state.user.uid,updatedAt:serverTimestamp(),updatedBy:state.user.uid,deleted:false});created[type]++}await b.commit()}};
  if(mods.includes('budgets')){engineeringProgressView(progressEl,18,'Alimentando Orçamento','Criando itens orçamentários vinculados ao levantamento…');await add('budgets',items.map(x=>({workId:p.workId,category:`${x.eap} - ${x.eapTitle}`,description:x.description,unit:x.unit,qty:+x.qty||0,unitValue:+x.unitValue||0,bdi:+p.bdi||ENGINEERING_INTERNAL_BDI,confidence:+x.confidence||0,priceSource:x.priceSource||'',sourcePage:x.page||0,sourceFile:x.fileName||'',sourceEngineeringTakeoffId:x.id})))}
  if(mods.includes('activities')){engineeringProgressView(progressEl,30,'Gerando EAP e Cronograma','Montando atividades, durações e predecessoras…');let cursor=work.start||p.baseDate||today(),prev='',seq={},rows=[];for(const x of [...items].sort((a,b)=>String(a.eap).localeCompare(String(b.eap)))){seq[x.eap]=(seq[x.eap]||0)+1;const rr=engineeringResources(x),laborHours=rr.labor.reduce((sum,z)=>sum+(+z.hours||+z.qty||0),0),dur=Math.max(1,Math.ceil(laborHours/(8*3))||1),wbs=`${x.eap}.${String(seq[x.eap]).padStart(2,'0')}`,end=addWorkdays(cursor,dur);rows.push({workId:p.workId,wbs,name:x.description,start:cursor,end,durationDays:dur,progressMode:'Quantidade',progress:0,plannedQty:+x.qty||0,actualQty:0,unit:x.unit,predecessors:prev,responsible:'A definir',status:'Não iniciada'});prev=wbs;cursor=nextWorkday(end)}await add('activities',rows)}
  if(mods.includes('inventory')){engineeringProgressView(progressEl,44,'Planejando Estoque','Consolidando materiais e estoques previstos…');await add('inventory',res.materials.filter(x=>x.qty>0).map(x=>({workId:p.workId,date:p.baseDate||today(),material:x.name,category:'Planejado pela Engenharia Inteligente',stockMode:'planned',unit:x.unit,currentStock:0,minStock:0,maxStock:x.qty,safetyStock:0,avgDailyConsumption:0,leadTimeDays:0,reorderPoint:0,anticipationStock:x.qty,unitValue:0})))}
  if(mods.includes('orders')){engineeringProgressView(progressEl,55,'Preparando Cotações','Criando solicitações de compra por grupo da EAP…');const by=new Map();for(const x of items){const r=engineeringResources(x);for(const z of r.materials){const k=x.eapTitle,old=by.get(k)||{items:[],value:0};old.items.push(`${z.name}: ${z.qty.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${z.unit}`);old.value+=(+x.qty||0)*(+x.unitValue||0)*0.55;by.set(k,old)}}await add('orders',[...by.entries()].map(([cat,v])=>({workId:p.workId,supplierId:'',date:p.baseDate||today(),dueDate:'',description:`Cotação gerada pela Engenharia Inteligente — ${cat}\n${v.items.slice(0,80).join('\n')}`,value:Math.round(v.value*100)/100,status:'Em cotação'})))}
  if(mods.includes('staff')){engineeringProgressView(progressEl,66,'Planejando Mão de obra','Criando quadro de recursos humanos previstos…');await add('staff',res.labor.filter(x=>x.qty>0).map(x=>({name:`Planejado • ${x.name}`,role:`${x.name} — ${Math.ceil(x.qty)} h previstas`,admission:work.start||p.baseDate||today(),salary:0,workId:p.workId,status:'Inativo'})))}
  if(mods.includes('equipment')){engineeringProgressView(progressEl,75,'Planejando Equipamentos','Criando equipamentos e máquinas previstos…');await add('equipment',res.equipment.filter(x=>x.qty>0).map((x,i)=>({name:`Planejado • ${x.name}`,code:`ENG-${p.id.slice(0,6)}-${String(i+1).padStart(3,'0')}`,workId:p.workId,startDate:work.start||p.baseDate||today(),monthlyCost:0,hourmeter:0,nextMaintenance:'',status:'Parado'})))}
  if(mods.includes('documents')){engineeringProgressView(progressEl,82,'Registrando Projetos','Salvando rastreabilidade, revisão e SHA-256 dos PDFs…');await add('documents',(p.files||[]).map(f=>({workId:p.workId,name:f.name,category:`Projeto ${f.disciplineLabel}`,date:p.baseDate||today(),expiry:'',revision:f.revision==='—'?'':f.revision,status:'Em aprovação',reference:'',fileName:f.name,notes:`Analisado pela Engenharia Inteligente ${RELEASE}. Páginas: ${f.pages}. Escala: ${f.scale}. SHA-256: ${f.hash}. O PDF original foi processado localmente no navegador e não foi gravado no Firestore.`})))}
  if(mods.includes('finance')){engineeringProgressView(progressEl,88,'Gerando Financeiro previsto','Consolidando previsão de custos com BDI…');const by=new Map();for(const x of items){const k=x.eapTitle,old=by.get(k)||0;by.set(k,old+(+x.qty||0)*(+x.unitValue||0)*(1+(+p.bdi||0)/100))}await add('finance',[...by.entries()].map(([cat,value])=>({workId:p.workId,date:p.baseDate||today(),dueDate:'',description:`Previsão de custo — ${cat}`,type:'Despesa',category:`Engenharia Inteligente • ${cat}`,value:Math.round(value*100)/100,status:'Previsto'})))}
  engineeringProgressView(progressEl,94,'Finalizando integração','Registrando lote, auditoria e módulos alimentados…');
  const priorIds=Array.isArray(p.integratedTakeoffIds)?p.integratedTakeoffIds:[],integratedTakeoffIds=[...new Set([...priorIds,...items.map(x=>x.id)])],remaining=engineeringState.takeoffs.filter(x=>x.selected!==false&&!integratedTakeoffIds.includes(x.id)),remainingPending=remaining.filter(x=>!engineeringIntegrationEligibility(x).ok);await updateDoc(doc(fs,'organizations',state.orgId,'engineeringProjects',p.id),{status:remaining.length?'partial':'integrated',integratedAt:remaining.length?null:serverTimestamp(),lastIntegratedAt:serverTimestamp(),integratedBy:state.user.uid,integratedModules:mods,engineeringBatchId:batchId,integratedTakeoffIds,createdRecords:created,pendingReviewCount:remainingPending.length,updatedAt:serverTimestamp()});
  await audit('engineering-integrate','engineeringProjects',p.id,{workId:p.workId,batchId,modules:mods,created,selectedTakeoffs:items.length,pendingTakeoffs:plan.pending.length,alreadyIntegratedTakeoffs:plan.alreadyIntegrated.length,preliminaryCost:engineeringMetrics(items).cost,safetyRestorePointId:safetyPoint.id||safetyPoint});
  engineeringProgressView(progressEl,100,'Integração concluída',plan.pending.length?`Estrutura alimentada com ${items.length} item(ns) aprovado(s). ${plan.pending.length} pendente(s) ficaram preservado(s) para revisão.`:'Estrutura da obra alimentada e protegida por ponto de restauração.','ok');setSync('Sincronizado','ok');toast('Estrutura da obra alimentada com sucesso.');
  setTimeout(()=>{closeModal();renderEngineering()},700);
 }catch(e){console.error(e);engineeringProgressView(progressEl,100,'Falha na integração',friendly(e),'bad');if(buttonEl){buttonEl.disabled=false;buttonEl.textContent='Tentar novamente'}setSync('Falha na integração','bad');alert('A integração foi interrompida: '+friendly(e)+'\n\nUse o ponto de restauração criado antes da operação se necessário.')}
}

if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
    .then(reg=>reg.update())
    .catch(console.error);
  let swRefreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(swRefreshing)return;
    swRefreshing=true;
    location.reload();
  });
}
boot();

function renderEconomics(){
 const work=state.data.works.find(x=>x.id===state.filters.workId&&!x.deleted);
 // Preserve an in-progress edit when another collection emits a snapshot.
 const form=document.querySelector('#ecoForm');
 if(form&&form.dataset.dirty==='1'&&document.querySelector('#ecoParameters')?.open&&form.dataset.work===work?.id&&form.dataset.org===state.orgId&&form.dataset.cutoff===(state.filters.to||today()))return;
 mountEconomics({container:$('#content'),work,data:state.data,cutoff:state.filters.to||today(),ready:['works','budgets','finance','measurements'].every(x=>state.ready.has(x)),syncError:state.lastSyncError,editable:!!work&&canEdit('works',work),download:downloadBlob,orgId:state.orgId,onSave:async economics=>{
  if(!work||!canEdit('works',work))throw Error('Sem permissão para editar esta obra.');
  const batch=writeBatch(fs);
  batch.update(doc(fs,'organizations',state.orgId,'works',work.id),{economics,updatedAt:serverTimestamp(),updatedBy:state.user.uid});
  batch.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('economics-parameters','works',work.id,{before:work.economics||{},after:economics}));
  await batch.commit();work.economics=economics;document.querySelector('#ecoParameters')?.removeAttribute('open');renderEconomics();
 }});
 const next=document.querySelector('#ecoForm');if(next){next.dataset.work=work.id;next.dataset.org=state.orgId;next.dataset.cutoff=state.filters.to||today();next.dataset.dirty='0';next.addEventListener('input',()=>next.dataset.dirty='1')}
}

function renderManual(){
 const work=state.data.works.find(x=>x.id===state.filters.workId&&!x.deleted);
 // Não redesenha enquanto o usuário digita na busca do manual; preserva a posição de rolagem nos demais casos.
 if(document.activeElement&&document.activeElement.id==='manSearch'&&document.querySelector('#manStage'))return;
 const scrollers=[document.scrollingElement,$('main'),$('#content')].filter(Boolean),tops=scrollers.map(e=>e.scrollTop);
 mountManual({container:$('#content'),work,data:state.data,members:state.members,snapshots:state.snapshots,engineeringProjects:engineeringState.projects,editable:!!work&&canEdit('works',work),orgId:state.orgId,user:state.user,download:downloadBlob,onOpenRoute:r=>route(r),onSave:async implantation=>{
  if(!work||!canEdit('works',work))throw Error('Sem permissão para editar esta obra.');
  const batch=writeBatch(fs);
  batch.update(doc(fs,'organizations',state.orgId,'works',work.id),{implantation,updatedAt:serverTimestamp(),updatedBy:state.user.uid});
  batch.set(doc(collection(fs,'organizations',state.orgId,'audits')),auditPayload('implantation-checklist','works',work.id,{before:work.implantation||{},after:implantation}));
  await batch.commit();work.implantation=implantation;renderManual();
 }});
 scrollers.forEach((e,i)=>{e.scrollTop=tops[i]});
}
initUiEnhancers();
