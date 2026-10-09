// ObraTop — sub-aba "Criar novo orçamento": bases SINAPI e ORSE (importadas) + itens próprios, com totalização.
import * as B from './bases.mjs';
import * as O from './orcamento.mjs';
const S={mounted:false,fonte:{SINAPI:true,ORSE:false},bases:[],cur:{SINAPI:'',ORSE:''},data:{SINAPI:null,ORSE:null},regime:{SINAPI:'SD',ORSE:'SD'},ix:{SINAPI:null,ORSE:null},kind:'comp',showZero:false,items:[],etapas:[],etapaAtiva:'',sub:'',bdiMode:'linha',showEtTotal:false,bdi:25,name:'',workId:'',category:'',query:'',pending:null};
let ctx=null,uid=0,eid=0;
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),num=v=>(Number(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:4});
const draftKey=()=>`obratop-orc-rascunho-${ctx.orgId()}`;
function saveDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({name:S.name,workId:S.workId,bdi:S.bdi,bdiMode:S.bdiMode,etapas:S.etapas,etapaAtiva:S.etapaAtiva,items:S.items,fonte:S.fonte}))}catch{}}
function loadDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d){S.name=d.name||'';S.workId=d.workId||'';S.bdi=Number.isFinite(+d.bdi)?+d.bdi:25;S.bdiMode=d.bdiMode==='final'?'final':'linha';S.etapas=Array.isArray(d.etapas)?d.etapas:[];S.etapaAtiva=d.etapaAtiva||'';S.items=Array.isArray(d.items)?d.items:[];S.fonte={...S.fonte,...(d.fonte||{})};
  if(!S.etapas.length&&S.items.length){S.etapas=[{id:'e1',name:'Serviços'}];S.items.forEach(i=>i.etapaId='e1')}   // rascunho de versão anterior (sem etapas)
  uid=S.items.reduce((m,i)=>Math.max(m,+String(i.id).replace(/\D/g,'')||0),0);eid=S.etapas.reduce((m,e)=>Math.max(m,+String(e.id).replace(/\D/g,'')||0),0)}}catch{}}
const regOpts=(sel,avail)=>Object.entries(B.REGIMES).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''} ${avail&&!avail.includes(k)?'disabled':''}>${v}${avail&&!avail.includes(k)?' (sem dados)':''}</option>`).join('');
const refLabel=r=>r&&/^\d{4}-\d{2}$/.test(r)?`${r.slice(5)}/${r.slice(0,4)}`:(r||'sem referência');

export function mount(root,c){
  ctx=c;root.dataset.mounted='1';S.mounted=true;loadDraft();
  const cand=B.sinapiCandidateRefs(new Date(),3);
  root.innerHTML=`<div class="bb noGloss">
  <div class="card"><div class="sectiontitle">Dados do orçamento</div><div class="formgrid">
   <div class="field"><label for="bbName">Nome do orçamento *</label><input id="bbName" maxlength="120" placeholder="Ex.: Reforma da UBS — arquitetura" value="${esc(S.name)}"></div>
   <div class="field"><label for="bbWork">Obra *</label><select id="bbWork"></select></div>
   <div class="field"><label for="bbBdi">BDI (%)</label><input id="bbBdi" inputmode="decimal" value="${esc(String(S.bdi).replace('.',','))}"></div>
   <div class="field"><label for="bbMode">Como mostrar o BDI</label><select id="bbMode"><option value="linha" ${S.bdiMode==='linha'?'selected':''}>Preço unitário já com BDI (como na planilha impressa)</option><option value="final" ${S.bdiMode==='final'?'selected':''}>BDI somado no final do orçamento</option></select></div></div></div>
  <div class="card"><div class="sectiontitle">Base de preços</div>
   <p class="muted">Marque a base que quer usar. Você pode marcar as duas e misturar itens no mesmo orçamento; também pode lançar itens próprios.</p>
   <div class="bbSources"><label class="bbSrc"><input type="checkbox" id="bbFSinapi" ${S.fonte.SINAPI?'checked':''}><span><b>SINAPI</b><small>CAIXA / IBGE — composições e insumos, base Bahia</small></span></label>
   <label class="bbSrc"><input type="checkbox" id="bbFOrse" ${S.fonte.ORSE?'checked':''}><span><b>ORSE</b><small>CEHOP — Orçamento de Obras de Sergipe</small></span></label></div>
   <div id="bbPanSinapi" class="bbPanel" ${S.fonte.SINAPI?'':'hidden'}>
    <div class="bbPanelHead"><b>SINAPI</b><span id="spStatus" class="muted"></span></div>
    <ol class="bbSteps"><li>Abra o site oficial da CAIXA e baixe o relatório mensal em <b>XLSX</b> (um arquivo ZIP com todas as UF).</li><li>Clique em <b>Importar arquivo</b> e escolha o ZIP baixado. O ObraTop extrai só a UF escolhida (Bahia) e guarda neste aparelho.</li><li>Pesquise o serviço, informe a quantidade e adicione ao orçamento.</li></ol>
    <div class="bbRow"><a class="btn primary" id="spSite" href="${B.SINAPI_PAGE}" target="_blank" rel="noopener noreferrer">Abrir o site da CAIXA (SINAPI)</a>
     <button class="btn" id="spImport" type="button">Importar arquivo (XLSX, ZIP, CSV ou PDF)</button><input type="file" id="spFile" accept=".xlsx,.xls,.csv,.txt,.zip,.pdf" hidden>
     <button class="btn" id="spServer" type="button">Carregar base do servidor</button></div>
    <details class="bbDet"><summary>Links diretos dos relatórios mensais (formato XLSX)</summary><p class="muted">O mais recente costuma ser o de 2 meses atrás. Se o link der erro 404, use o mês anterior. O download é feito no site da CAIXA.</p><div class="bbRow">${cand.map(x=>`<a class="btn small" href="${x.xlsx}" target="_blank" rel="noopener noreferrer">XLSX ${x.label}</a><a class="btn small" href="${x.pdf}" target="_blank" rel="noopener noreferrer">PDF ${x.label}</a>`).join('')}</div></details>
    <div class="bbRow bbSel"><label>UF <select id="spUf">${B.UFS.map(u=>`<option ${u==='BA'?'selected':''}>${u}</option>`).join('')}</select></label><label>Base salva <select id="spBase"></select></label><label>Encargos <select id="spRegime"></select></label><button class="btn small danger" id="spDel" type="button">Excluir base</button></div>
    <div id="spServerList" class="bbRow"></div><details class="bbDet"><summary>Diagnóstico da última importação</summary><p class="muted">Mostra quais arquivos e abas foram usados e de qual coluna veio o preço. Se algo estiver estranho, copie e envie.</p><pre id="spDiag" class="bbCode">Nenhuma importação feita ainda.</pre><button class="btn small" id="spDiagCopy" type="button">Copiar diagnóstico</button></details></div>
   <div id="bbPanOrse" class="bbPanel" ${S.fonte.ORSE?'':'hidden'}>
    <div class="bbPanelHead"><b>ORSE</b><span id="opStatus" class="muted"></span></div>
    <ol class="bbSteps"><li>Abra a página de downloads do ORSE (CEHOP-SE). Lá estão o sistema ORSE 2 e as atualizações da base de dados por ano.</li><li>No ORSE 2, gere o relatório de composições ou insumos e exporte para <b>Excel, CSV ou PDF</b>.</li><li>Clique em <b>Importar arquivo</b> e escolha o arquivo exportado. Depois pesquise e adicione os itens.</li></ol>
    <div class="bbRow"><a class="btn primary" id="opSite" href="${B.ORSE_DOWNLOADS}" target="_blank" rel="noopener noreferrer">Ir para o download do ORSE</a><a class="btn" id="opQuery" href="${B.ORSE_CONSULTA}" target="_blank" rel="noopener noreferrer">Consulta online do ORSE</a>
     <button class="btn" id="opImport" type="button">Importar arquivo (XLSX, CSV ou PDF)</button><input type="file" id="opFile" accept=".xlsx,.xls,.csv,.txt,.pdf" hidden>
     <button class="btn" id="opServer" type="button">Carregar base do servidor</button></div>
    <div class="bbRow bbSel"><label>Base salva <select id="opBase"></select></label><label>Variante <select id="opRegime"></select></label><button class="btn small danger" id="opDel" type="button">Excluir base</button></div>
    <div id="opServerList" class="bbRow"></div><details class="bbDet"><summary>Diagnóstico da última importação</summary><pre id="opDiag" class="bbCode">Nenhuma importação feita ainda.</pre><button class="btn small" id="opDiagCopy" type="button">Copiar diagnóstico</button></details></div>
   <details class="bbDet"><summary>Atualização mensal automática (Cloud Shell)</summary><p class="muted">O navegador não pode baixar direto do site da CAIXA (bloqueio de segurança do site e do app). Para deixar a base Bahia atualizada para todos os aparelhos, rode uma vez por mês no Cloud Shell:</p><pre class="bbCode">cd ~/ObraTop_V3.31.0.0
node tools/sinapi/atualizar-sinapi.mjs --uf BA
firebase deploy --only hosting --project obratop-v3-teste</pre><p class="muted">Depois use <b>Carregar base do servidor</b>. Detalhes em <code>tools/sinapi/LEIA-ME.txt</code>.</p></details></div>
  <div class="card"><div class="sectiontitle">Etapas do orçamento</div>
   <p class="muted">Defina as <b>etapas</b> (1.0, 2.0…) que aparecem na planilha impressa. Os <b>serviços</b> buscados nas bases entram na etapa ativa (1.1, 1.2…) e, se quiser, numa <b>sub-etapa</b> (ex.: 3.2 Sapatas, com serviços 3.2.1, 3.2.2…).</p>
   <div class="bbRow"><input id="etNew" class="bbQuery" maxlength="80" placeholder="Nome da etapa (ex.: Fundação)"><button class="btn primary" id="etAdd" type="button">Adicionar etapa</button><button class="btn" id="etModel" type="button">Usar etapas padrão de edificação</button></div>
   <div id="etList" class="etList"></div>
   <div class="bbRow bbSel"><label>Etapa ativa (onde os próximos serviços entram) <select id="etActive"></select></label><label>Sub-etapa (opcional) <input id="etSub" list="etSubList" maxlength="100" placeholder="ex.: Sapatas, tronco de pilares e cintamento" value="${esc(S.sub)}"><datalist id="etSubList"></datalist></label></div></div>
  <div class="card"><div class="sectiontitle">Buscar itens nas bases</div><div class="bbRow bbSel"><label>Tipo <select id="bbKind"><option value="comp" ${S.kind==='comp'?'selected':''}>Composições (serviços)</option><option value="ins" ${S.kind==='ins'?'selected':''}>Insumos</option></select></label>
   <input id="bbQuery" class="bbQuery" placeholder="Código ou palavras da discriminação (ex.: alvenaria bloco ceramico)" value="${esc(S.query)}"></div>
   <label class="bbChk"><input type="checkbox" id="bbZero" ${S.showZero?'checked':''}> Mostrar também itens <b>sem preço</b> (SINAPI “SEM CUSTO”: falta preço de algum insumo para a UF)</label><div id="bbResInfo" class="muted"></div><div class="tablewrap"><table id="bbRes"><thead><tr><th>Fonte</th><th>Código</th><th>Discriminação</th><th>Unid.</th><th>Preço unit.</th><th>Quantidade</th><th></th></tr></thead><tbody></tbody></table></div></div>
  <div class="card"><div class="sectiontitle">Planilha do orçamento</div>
   <details class="bbDet" id="bbManualBox"><summary>Adicionar item próprio (composição ou serviço seu)</summary><div class="formgrid bbManual"><div class="field"><label for="mCode">Código</label><input id="mCode" maxlength="30" placeholder="opcional"></div><div class="field full"><label for="mDesc">Discriminação *</label><input id="mDesc" maxlength="300"></div><div class="field"><label for="mUnit">Unid.</label><input id="mUnit" maxlength="10"></div><div class="field"><label for="mQty">Quantidade *</label><input id="mQty" inputmode="decimal" value="1"></div><div class="field"><label for="mPrice">Preço unitário (R$) *</label><input id="mPrice" inputmode="decimal"></div></div><button class="btn" id="mAdd" type="button">Adicionar item próprio (na etapa ativa)</button></details>
   <div class="tablewrap"><table id="bbTab"><thead><tr><th>Item</th><th>Fonte</th><th>Código</th><th>Discriminação</th><th>Etapa / sub-etapa</th><th>Unid.</th><th>Quantidade</th><th>Preço unitário</th><th>Preço unit. c/ BDI</th><th>Preço total</th><th></th></tr></thead><tbody></tbody></table></div>
   <div id="bbTotals" class="bbTotals"></div><p id="bbExt" class="bbExt muted"></p>
   <label class="bbChk"><input type="checkbox" id="bbEtTotal" ${S.showEtTotal?'checked':''}> Mostrar o total de cada etapa na planilha impressa</label>
   <div class="bbRow"><button class="btn primary" id="bbSave" type="button">Salvar orçamento na obra</button><button class="btn primary" id="bbPlan" type="button">Salvar e gerar planejamento</button></div>
   <div class="bbRow"><button class="btn" id="bbSheetPdf" type="button">Planilha orçamentária (PDF)</button><button class="btn" id="bbSheetXlsx" type="button">Planilha (Excel)</button><button class="btn" id="bbCpuPdf" type="button">Composições analíticas (PDF)</button><button class="btn" id="bbCpuXlsx" type="button">Composições analíticas (Excel)</button><button class="btn" id="bbSortAz" type="button" title="Dentro de cada etapa (e sub-etapa), coloca a discriminação dos serviços de A a Z e renumera">Ordenar serviços de A a Z</button><button class="btn danger" id="bbClear" type="button">Limpar orçamento</button></div><p class="muted" id="bbMsg"></p></div></div>`;
  fillWorks();bind();drawEtapas();refreshBases().then(()=>{drawBases();drawBudget();runSearch()});drawBudget()
}
export function refreshWorks(c){ctx=c;fillWorks()}
function fillWorks(){const el=$('#bbWork');if(!el)return;const w=ctx.works();el.innerHTML=`<option value="">Selecione a obra…</option>`+w.map(x=>`<option value="${esc(x.id)}" ${x.id===S.workId?'selected':''}>${esc(x.name)}</option>`).join('')}
async function refreshBases(){try{S.bases=await B.listBases()}catch(e){S.bases=[];console.warn('IndexedDB indisponível',e)}
  for(const f of['SINAPI','ORSE']){const l=S.bases.filter(b=>b.fonte===f);if(!l.find(b=>b.id===S.cur[f]))S.cur[f]=l[0]?.id||'';await activate(f)}}
async function activate(f){
  S.data[f]=null;S.ix[f]=null;if(!S.cur[f])return;
  try{const b=await B.loadBase(S.cur[f]);S.data[f]=b;if(b){const av=Object.keys(b.regimes).filter(k=>b.regimes[k].comp.length||b.regimes[k].ins.length);if(!av.includes(S.regime[f]))S.regime[f]=av[0]||'SD';buildIx(f)}}catch(e){console.warn(e)}
}
function buildIx(f){const b=S.data[f];if(!b)return;const r=b.regimes[S.regime[f]]||{comp:[],ins:[]};S.ix[f]={comp:B.makeIndex(r.comp),ins:B.makeIndex(r.ins)}}
const P=f=>f==='SINAPI'?'sp':'op';
function drawBases(){
  for(const f of['SINAPI','ORSE']){const p=P(f),list=S.bases.filter(b=>b.fonte===f),sel=$('#'+p+'Base'),rg=$('#'+p+'Regime'),st=$('#'+p+'Status');if(!sel)continue;
    sel.innerHTML=list.length?list.map(b=>`<option value="${esc(b.id)}" ${b.id===S.cur[f]?'selected':''}>${esc(f)} ${esc(b.uf)} · ${refLabel(b.ref)}</option>`).join(''):'<option value="">Nenhuma base carregada</option>';
    const d=S.data[f],av=d?Object.keys(d.regimes).filter(k=>d.regimes[k].comp.length||d.regimes[k].ins.length):[];rg.innerHTML=regOpts(S.regime[f],av.length?av:null);
    const cnt=d?.regimes[S.regime[f]];const na=d?Object.keys(d.analitico||{}).length:0;st.textContent=d&&cnt?` — ativa: ${f} ${d.uf} · ref. ${refLabel(d.ref)} · ${B.REGIMES[S.regime[f]]} · ${cnt.comp.length.toLocaleString('pt-BR')} composições e ${cnt.ins.length.toLocaleString('pt-BR')} insumos`+(f==='SINAPI'?(na?` · ${na.toLocaleString('pt-BR')} composições analíticas`:' · sem composições analíticas (importe o ZIP XLSX completo)'):''):` — nenhuma base ${f} carregada neste aparelho. Importe um arquivo para começar.`}
}
function bind(){
  const on=(id,ev,fn)=>{const e=$(id);if(e)e.addEventListener(ev,fn)};
  on('#bbName','input',e=>{S.name=e.target.value;saveDraft()});on('#bbWork','change',e=>{S.workId=e.target.value;saveDraft()});on('#bbMode','change',e=>{S.bdiMode=e.target.value;saveDraft();drawBudget()});on('#bbEtTotal','change',e=>{S.showEtTotal=e.target.checked});
  on('#bbBdi','input',e=>{const v=B.parseNum(e.target.value,true);S.bdi=Number.isNaN(v)?0:v;saveDraft();refreshNumbers()});
  on('#bbFSinapi','change',e=>{S.fonte.SINAPI=e.target.checked;$('#bbPanSinapi').hidden=!e.target.checked;saveDraft();runSearch()});
  on('#bbFOrse','change',e=>{S.fonte.ORSE=e.target.checked;$('#bbPanOrse').hidden=!e.target.checked;saveDraft();runSearch()});
  for(const f of['SINAPI','ORSE']){const p=P(f);
    on('#'+p+'Import','click',()=>$('#'+p+'File').click());on('#'+p+'File','change',async e=>{const file=e.target.files[0];e.target.value='';if(file)await importFile(f,file)});
    on('#'+p+'Base','change',async e=>{S.cur[f]=e.target.value;await activate(f);drawBases();runSearch()});
    on('#'+p+'Regime','change',e=>{S.regime[f]=e.target.value;buildIx(f);drawBases();runSearch()});
    on('#'+p+'Del','click',async()=>{if(!S.cur[f])return;if(!ctx.confirm(`Excluir a base salva "${S.cur[f]}" deste aparelho?`))return;await B.deleteBase(S.cur[f]);S.cur[f]='';await refreshBases();drawBases();runSearch();ctx.toast('Base excluída.')});
    on('#'+p+'Server','click',()=>serverList(f));on('#'+p+'DiagCopy','click',async()=>{const t=$('#'+p+'Diag').textContent;try{await navigator.clipboard.writeText(t);ctx.toast('Diagnóstico copiado.')}catch{ctx.alert(t)}})}
  on('#bbKind','change',e=>{S.kind=e.target.value;runSearch()});on('#bbZero','change',e=>{S.showZero=e.target.checked;runSearch()});let t=0;on('#bbQuery','input',e=>{S.query=e.target.value;clearTimeout(t);t=setTimeout(runSearch,160)});
  on('#mAdd','click',addManual);on('#bbClear','click',()=>{if(!S.items.length||ctx.confirm('Remover todos os serviços da planilha? (as etapas são mantidas)')){S.items=[];saveDraft();drawEtapas();drawBudget()}});
  on('#bbSortAz','click',sortAz);on('#bbSave','click',()=>saveBudget(false));on('#bbPlan','click',()=>saveBudget(true));on('#bbSheetPdf','click',exportSheetPdf);on('#bbSheetXlsx','click',exportSheetXlsx);on('#bbCpuPdf','click',exportCpuPdf);on('#bbCpuXlsx','click',exportCpuXlsx);
  on('#etAdd','click',()=>{const v=$('#etNew').value.trim();if(!v)return ctx.alert('Digite o nome da etapa.');addEtapa(v);$('#etNew').value=''});on('#etNew','keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#etAdd').click()}});
  on('#etModel','click',()=>{if(S.etapas.length&&!ctx.confirm('Acrescentar as etapas padrão às que já existem?'))return;for(const n of ETAPAS_PADRAO)if(!S.etapas.some(e=>B.norm(e.name)===B.norm(n)))addEtapa(n,true);saveDraft();drawEtapas();drawBudget()});
  on('#etActive','change',e=>{S.etapaAtiva=e.target.value;saveDraft()});on('#etSub','input',e=>{S.sub=e.target.value});
  const el=$('#etList');el.addEventListener('input',e=>{if(!e.target.classList.contains('etName'))return;const x=S.etapas.find(z=>z.id===e.target.closest('.etRow').dataset.id);if(x){x.name=e.target.value;saveDraft()}});
  el.addEventListener('change',e=>{if(e.target.classList.contains('etName')){drawBudget();fillActive()}});
  el.addEventListener('click',e=>{const row=e.target.closest('.etRow');if(!row)return;const id=row.dataset.id,i=S.etapas.findIndex(z=>z.id===id);
    if(e.target.closest('.etUp')&&i>0){[S.etapas[i-1],S.etapas[i]]=[S.etapas[i],S.etapas[i-1]]}
    else if(e.target.closest('.etDown')&&i<S.etapas.length-1){[S.etapas[i+1],S.etapas[i]]=[S.etapas[i],S.etapas[i+1]]}
    else if(e.target.closest('.etDel')){if(S.items.some(x=>x.etapaId===id))return ctx.alert('Esta etapa tem serviços. Mova ou remova os serviços antes de excluí-la.');S.etapas.splice(i,1);if(S.etapaAtiva===id)S.etapaAtiva=S.etapas[0]?.id||''}
    else return;saveDraft();drawEtapas();drawBudget()});
  const res=$('#bbRes tbody');res.addEventListener('click',e=>{const b=e.target.closest('.bbAdd');if(!b)return;const tr=b.closest('tr'),q=B.parseNum(tr.querySelector('.bbQtyAdd').value,true);addFromResult(tr.dataset.f,tr.dataset.code,Number.isNaN(q)||q<=0?1:q)});
  const tb=$('#bbTab tbody');
  tb.addEventListener('input',e=>{const tr=e.target.closest('tr');if(!tr||!tr.dataset.id)return;const it=S.items.find(i=>i.id===tr.dataset.id);if(!it)return;const v=B.parseNum(e.target.value,true);
    if(e.target.classList.contains('bbQ'))it.qty=Number.isNaN(v)?0:v;if(e.target.classList.contains('bbP'))it.price=Number.isNaN(v)?0:v;if(e.target.classList.contains('bbQ')||e.target.classList.contains('bbP')){saveDraft();refreshNumbers()}});
  tb.addEventListener('change',e=>{const tr=e.target.closest('tr');if(!tr||!tr.dataset.id)return;const it=S.items.find(i=>i.id===tr.dataset.id);if(!it)return;
    if(e.target.classList.contains('bbEt')){it.etapaId=e.target.value;saveDraft();drawBudget()}if(e.target.classList.contains('bbSub')){it.sub=e.target.value.trim();saveDraft();drawBudget()}});
  tb.addEventListener('click',e=>{const tr=e.target.closest('tr');if(!tr||!tr.dataset.id)return;const id=tr.dataset.id,it=S.items.find(i=>i.id===id);if(!it)return;
    if(e.target.closest('.bbDel')){S.items=S.items.filter(i=>i.id!==id);saveDraft();return drawBudget()}
    if(e.target.closest('.bbCpu'))return openCpu(id);
    const k=e.target.closest('.bbUp')?-1:e.target.closest('.bbDown')?1:0;if(k){const same=S.items.filter(x=>x.etapaId===it.etapaId),j=same.indexOf(it),o=same[j+k];if(!o)return;const a=S.items.indexOf(it),b=S.items.indexOf(o);[S.items[a],S.items[b]]=[S.items[b],S.items[a]];saveDraft();drawBudget()}});
}
// ---------- importação
function setMsg(f,t){const el=$('#'+P(f)+'Status');if(el)el.textContent=' — '+t}
async function readAny(f,file,uf,regime){
  const ext=file.name.split('.').pop().toLowerCase(),out={regimes:{},ref:'',sheets:[],avisos:[],diag:[`Arquivo escolhido: ${file.name} (${(file.size/1048576).toFixed(1)} MB), UF ${uf}`]},XLSX=window.XLSX;
  const needX=()=>{if(!XLSX)throw new Error('A biblioteca de Excel não carregou. Verifique a conexão com a internet e tente de novo.')};
  const generic=(sheetsRows,fname,dec)=>{const g={regimes:{},ref:B.detectRef(fname),sheets:[],avisos:[],diag:[]};
    for(const[n,rows]of Object.entries(sheetsRows)){const r=B.extractItems(rows,{uf,decimalComma:dec});if(!r.items.length){g.diag.push(`Aba "${n}": nada importado (${r.reason||'sem itens'}).`,B.sampleRows(rows));continue}g.diag.push(`Aba "${n}": ${r.items.length} itens; preço="${r.labels?.price}"; exemplos: ${r.items.slice(0,3).map(i=>`${i[0]}=${i[3]}`).join(', ')}`);const cl=B.classifySheet(n,rows,fname),kind=cl?.kind==='ins'?'ins':'comp',rg=f==='ORSE'?regime:(cl?.regime||regime);(g.regimes[rg]??={comp:[],ins:[]})[kind].push(...r.items);g.sheets.push({name:n,kind,regime:rg,count:r.items.length});if(!g.ref)g.ref=B.detectRef(n,rows.slice(0,15).flat().join(' '))}return g};
  const xlsx=async(buf,fname)=>{needX();const rows=B.sheetRowsFromBuffer(XLSX,buf);
    let r=f==='SINAPI'?B.parseSinapiSheets(rows,{uf,fileName:fname}):{regimes:{},sheets:[],avisos:[],diag:[],ref:''};if(!r.sheets.length){const g=generic(rows,fname,false);g.diag=[...(r.diag||[]),...(g.diag||[])];r=g}
    if(!r.sheets.length)S.pending={type:'xlsx',rows,fname,f};return r};
  const csv=async(text,fname)=>{const rows=B.parseCsv(text),dec=B.csvUsesDecimalComma(rows),g=generic({[fname]:rows},fname,dec);if(!g.sheets.length)S.pending={type:'csv',rows:{[fname]:rows},fname,f,dec};return g};
  if(ext==='zip'){const buf=await file.arrayBuffer(),en=B.listZip(buf).filter(e=>!e.dir&&!/__MACOSX|(^|\/)\./.test(e.name));
    const xs=en.filter(e=>/\.(xlsx|xls)$/i.test(e.name)),cs=en.filter(e=>/\.(csv|txt)$/i.test(e.name));
    if(!xs.length&&!cs.length)throw new Error('O ZIP não contém planilhas (XLSX/CSV). Se baixou o ZIP de PDF, extraia e importe o PDF.');
    const usar=xs.filter(e=>B.isPriceFileName(e.name));for(const e of xs)if(!usar.includes(e))out.diag.push(`Arquivo ${e.name.split('/').pop()}: ignorado (não contém preços de insumos/composições).`);
    if(!usar.length&&!cs.length)throw new Error('O ZIP não contém a planilha de referência do SINAPI em XLSX.');
    for(const e of usar){setMsg(f,`lendo ${e.name.split('/').pop()}…`);await new Promise(r=>setTimeout(r,20));out.diag.push(`Arquivo ${e.name.split('/').pop()}: lido.`);const d=await B.readZipEntry(buf,e);B.mergeParsed(out,await xlsx(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength),e.name))}
    for(const e of cs)B.mergeParsed(out,await csv(new TextDecoder().decode(await B.readZipEntry(buf,e)),e.name));
    if(!out.ref)out.ref=B.detectRef(file.name);return B.finalizeParsed(out)}
  if(ext==='xlsx'||ext==='xls'){const r=await xlsx(await file.arrayBuffer(),file.name);if(!r.ref)r.ref=B.detectRef(file.name);return B.finalizeParsed(r)}
  if(ext==='csv'||ext==='txt'){const r=await csv(await file.text(),file.name);if(!r.ref)r.ref=B.detectRef(file.name);return r}
  if(ext==='pdf'){setMsg(f,'lendo o PDF (pode levar alguns minutos)…');let lines;try{lines=await ctx.pdfLines(file,(p,n)=>setMsg(f,`lendo o PDF… página ${p} de ${n}`))}catch(e){console.warn(e);throw new Error('Não foi possível abrir o PDF. Verifique a conexão com a internet (o leitor de PDF é carregado online) e se o arquivo não está protegido. Se preferir, importe a versão em XLSX ou CSV.')}const r=B.parsePdfLines(lines);
    const rg=regime;if(r.items.length)(out.regimes[rg]??={comp:[],ins:[]}).comp.push(...r.items);out.sheets.push({name:'PDF',kind:'comp',regime:rg,count:r.items.length});out.ref=B.detectRef(file.name,lines.slice(0,40).join(' '));return out}
  throw new Error('Formato não suportado. Use XLSX, ZIP, CSV ou PDF.')
}
async function importFile(f,file){
  const p=P(f),uf=f==='SINAPI'?$('#spUf').value:'SE',regime=$('#'+p+'Regime').value||'SD';S.pending=null;
  try{setMsg(f,`lendo ${file.name}…`);const r=await readAny(f,file,uf,regime),total=Object.values(r.regimes).reduce((s,v)=>s+v.comp.length+v.ins.length,0);
    if(!total){if(S.pending){drawBases();return openMapping(f,uf,regime)}drawBases();return ctx.alert('Não encontrei itens de preço neste arquivo. Confira se é uma planilha/relatório de composições ou insumos'+(file.name.toLowerCase().endsWith('.pdf')?' (PDFs digitalizados como imagem não podem ser lidos)':'')+'.')}
    await commit(f,uf,r)}
  catch(e){console.error(e);drawBases();ctx.alert(e.message||'Falha ao ler o arquivo.')}
}
function suspicious(r){const ps=Object.values(r.regimes).flatMap(v=>v.comp.concat(v.ins)).map(i=>i[3]).sort((a,b)=>a-b);if(ps.length<20)return false;return ps[ps.length>>1]<2}
async function commit(f,uf,r){
  S.diag=(r.diag||[]).join('\n');const dg=$('#'+P(f)+'Diag');if(dg)dg.textContent=S.diag;
  const id=B.baseId(f,uf,r.ref),replace=(r.sheets||[]).length>=2,old=replace?null:await B.loadBase(id),regimes=old?old.regimes:{};
  for(const[rg,v]of Object.entries(r.regimes)){const t=(regimes[rg]??={comp:[],ins:[]});if(v.comp.length)t.comp=v.comp;if(v.ins.length)t.ins=v.ins}
  const analitico={...(old?.analitico||{}),...(r.analitico||{})};
  await B.saveBase({id,fonte:f,uf,ref:r.ref,importedAt:new Date().toISOString(),regimes,analitico});
  S.cur[f]=id;await refreshBases();S.cur[f]=id;await activate(f);drawBases();runSearch();
  const c=B.countOf(r.regimes),tot=Object.values(c).reduce((s,v)=>({comp:s.comp+v.comp,ins:s.ins+v.ins}),{comp:0,ins:0});
  if(suspicious(r))ctx.alert('Atenção: os preços importados parecem muito baixos (mediana abaixo de R$ 2). Provavelmente a coluna lida não é a de preço. Abra "Diagnóstico da última importação", copie o texto e envie para conferirmos, ou use "Conferir colunas" (importe o arquivo de insumos/composições isolado).');
  ctx.toast(`${f} ${uf} · ${refLabel(r.ref)}: ${tot.comp.toLocaleString('pt-BR')} composições e ${tot.ins.toLocaleString('pt-BR')} insumos importados.`);
  if(r.avisos.length)ctx.alert('Avisos da importação:\n'+r.avisos.slice(0,6).join('\n'))
}
function openMapping(f,uf,regime){
  const pd=S.pending,names=Object.keys(pd.rows),root=$('#modalRoot');let sheet=names[0],hr=Math.max(0,B.findHeaderRow(pd.rows[sheet])),m={};
  const draw=()=>{const rows=pd.rows[sheet],head=rows[hr]||[],opts=(sel,none)=>`${none?'<option value="-1">(nenhuma)</option>':''}${head.map((h,j)=>`<option value="${j}" ${j===sel?'selected':''}>${j+1}: ${esc(String(h).slice(0,40)||'(vazio)')}</option>`).join('')}`;
    const guess=B.extractItems(rows.slice(0),{uf}).cols||{};const mp={code:m.code??Math.max(0,guess.code??0),desc:m.desc??Math.max(0,guess.desc??1),unit:m.unit??(guess.unit??-1),price:m.price??Math.max(0,guess.price??Math.max(0,head.length-1)),group:-1};
    const prev=B.extractWithMapping(rows,{headerRow:hr,...mp,decimalComma:pd.dec??B.csvUsesDecimalComma(rows)}).items.slice(0,6);
    root.innerHTML=`<div class="modalback"><div class="dialog wide"><h2>Conferir colunas da planilha</h2><p class="muted">Não consegui identificar as colunas automaticamente. Indique onde estão o código, a discriminação, a unidade e o preço.</p>
    <div class="formgrid">${names.length>1?`<div class="field"><label>Aba</label><select id="mpSheet">${names.map(n=>`<option ${n===sheet?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`:''}<div class="field"><label>Linha do cabeçalho</label><input id="mpHr" type="number" min="1" value="${hr+1}"></div>
    <div class="field"><label>Código</label><select id="mpCode">${opts(mp.code)}</select></div><div class="field"><label>Discriminação</label><select id="mpDesc">${opts(mp.desc)}</select></div><div class="field"><label>Unidade</label><select id="mpUnit">${opts(mp.unit,true)}</select></div><div class="field"><label>Preço unitário</label><select id="mpPrice">${opts(mp.price)}</select></div>
    <div class="field"><label>Tipo dos itens</label><select id="mpKind"><option value="comp">Composições (serviços)</option><option value="ins">Insumos</option></select></div></div>
    <div class="tablewrap"><table><thead><tr><th>Código</th><th>Discriminação</th><th>Unid.</th><th>Preço</th></tr></thead><tbody>${prev.map(i=>`<tr><td>${esc(i[0])}</td><td>${esc(i[1])}</td><td>${esc(i[2])}</td><td>${money(i[3])}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum item reconhecido com estas colunas.</td></tr>'}</tbody></table></div>
    <div class="actions"><button class="btn" id="mpCancel" type="button">Cancelar</button><button class="btn primary" id="mpOk" type="button" ${prev.length?'':'disabled'}>Importar</button></div></div></div>`;
    const rd=()=>({code:+$('#mpCode').value,desc:+$('#mpDesc').value,unit:+$('#mpUnit').value,price:+$('#mpPrice').value});
    $('#mpCancel').onclick=()=>{root.innerHTML='';S.pending=null};
    for(const id of['#mpCode','#mpDesc','#mpUnit','#mpPrice'])$(id).onchange=()=>{m=rd();draw()};
    if($('#mpSheet'))$('#mpSheet').onchange=e=>{sheet=e.target.value;hr=Math.max(0,B.findHeaderRow(pd.rows[sheet]));m={};draw()};
    $('#mpHr').onchange=e=>{hr=Math.max(0,(+e.target.value||1)-1);m={};draw()};
    $('#mpOk').onclick=async()=>{const sel=rd(),r=B.extractWithMapping(pd.rows[sheet],{headerRow:hr,...sel,group:-1,decimalComma:pd.dec??B.csvUsesDecimalComma(pd.rows[sheet])}),kind=$('#mpKind').value;
      root.innerHTML='';S.pending=null;const out={regimes:{[regime]:{comp:[],ins:[]}},ref:B.detectRef(pd.fname),sheets:[],avisos:[]};out.regimes[regime][kind].push(...r.items);await commit(f,uf,out)}};
  draw()
}
async function serverList(f){
  const box=$('#'+P(f)+'ServerList');box.innerHTML='<span class="muted">Procurando bases publicadas no servidor…</span>';
  try{const r=await fetch('bases/index.json',{cache:'no-store'});if(!r.ok)throw 0;const idx=(await r.json()).filter(x=>x.fonte===f);
    if(!idx.length){box.innerHTML=`<span class="muted">Nenhuma base ${f} publicada no servidor ainda. Veja “Atualização mensal automática”.</span>`;return}
    box.innerHTML=idx.map(x=>`<button class="btn small" data-file="${esc(x.file)}" type="button">${esc(f)} ${esc(x.uf)} · ${refLabel(x.ref)} (${(x.counts?.SD?.comp??0).toLocaleString('pt-BR')} composições)</button>`).join('');
    box.onclick=async e=>{const b=e.target.closest('button[data-file]');if(!b)return;const file=b.dataset.file;if(!/^bases\/[\w.\-]+\.json$/.test(file))return;try{b.disabled=true;const d=await (await fetch(file,{cache:'no-store'})).json();await commit(f,d.uf,{regimes:d.regimes,analitico:d.analitico,ref:d.ref,sheets:[],avisos:[]});box.innerHTML=''}catch(err){b.disabled=false;ctx.alert('Não foi possível carregar a base do servidor.')}}
  }catch{box.innerHTML=`<span class="muted">Não há bases publicadas no servidor (ou sem conexão). Importe o arquivo baixado do site oficial.</span>`}
}
// ---------- busca
function runSearch(){
  const tb=$('#bbRes tbody'),info=$('#bbResInfo');if(!tb)return;let rows=[],total=0,more=false,any=false,ocultos=0;
  for(const f of['SINAPI','ORSE']){if(!S.fonte[f])continue;const ix=S.ix[f]?.[S.kind];if(!S.ix[f])continue;any=true;const r=B.searchIndex(ix,S.query,S.showZero?60:240,{az:true});
    let its=r.items;if(!S.showZero){const ok=its.filter(i=>i[3]>0);ocultos+=its.length-ok.length;its=ok.slice(0,60)}else its=[...its].sort((a,b)=>(b[3]>0)-(a[3]>0)||B.cmpAz(a[1],b[1]));
    rows.push(...its.map(it=>[f,it]));total+=its.length;more=more||r.more}
  {const q=B.norm(S.query);rows.sort((a,b)=>(B.norm(b[1][0])===q)-(B.norm(a[1][0])===q)||B.cmpAz(a[1][1],b[1][1])||(a[0]<b[0]?-1:1))}   // A–Z pela discriminação; código digitado por inteiro vem primeiro
  rows=rows.slice(0,100);
  info.textContent=!any?'Marque SINAPI ou ORSE e carregue uma base para pesquisar.':`${total.toLocaleString('pt-BR')} resultado(s)${more||total>rows.length?` — mostrando ${rows.length}; refine a pesquisa para ver outros`:''}${ocultos?` • ${ocultos} item(ns) sem preço ocultado(s) (marque a opção acima para vê-los)`:''}.`;
  tb.innerHTML=rows.map(([f,it])=>`<tr data-f="${f}" data-code="${esc(it[0])}"><td>${f}</td><td>${esc(it[0])}</td><td>${esc(it[1])}</td><td>${esc(it[2])}</td><td>${it[3]>0?money(it[3]):'<span class="bbTag warn" title="O SINAPI não divulgou custo/preço para esta UF e regime">Sem preço</span>'}</td><td><input class="bbQtyAdd" inputmode="decimal" value="1" aria-label="Quantidade"></td><td><button class="btn small primary bbAdd" type="button">Adicionar</button></td></tr>`).join('')||`<tr><td colspan="7" class="muted">${any?'Nenhum item encontrado.':'Sem base carregada.'}</td></tr>`
}
// ---------- etapas
const ETAPAS_PADRAO=['Serviços Preliminares','Movimento de Terra','Fundação','Superestrutura','Paredes e Painéis','Revestimento de Paredes','Forro','Pisos','Pintura','Esquadrias','Instalação Elétrica','Instalação Hidrossanitária','Cobertura e Impermeabilização','Diversos','Limpeza Final'];
const num6=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6});
function addEtapa(name,silent){const e={id:'e'+(++eid),name:String(name).trim().slice(0,80)};S.etapas.push(e);if(!S.etapaAtiva)S.etapaAtiva=e.id;if(!silent){saveDraft();drawEtapas();drawBudget()}return e}
function fillActive(){const sel=$('#etActive');if(!sel)return;if(!S.etapas.some(e=>e.id===S.etapaAtiva))S.etapaAtiva=S.etapas[0]?.id||'';
  sel.innerHTML=S.etapas.length?S.etapas.map((e,i)=>`<option value="${e.id}" ${e.id===S.etapaAtiva?'selected':''}>${i+1}.0 — ${esc(e.name)}</option>`).join(''):'<option value="">(crie uma etapa)</option>';
  const subs=[...new Set(S.items.filter(i=>i.etapaId===S.etapaAtiva&&i.sub).map(i=>i.sub))];const dl=$('#etSubList');if(dl)dl.innerHTML=subs.map(s=>`<option value="${esc(s)}">`).join('')}
function drawEtapas(){const el=$('#etList');if(!el)return;const sh=O.buildSheet(S.etapas,S.items,{bdi:S.bdi,mode:S.bdiMode});
  el.innerHTML=S.etapas.map((e,i)=>`<div class="etRow" data-id="${e.id}"><b class="etNo">${i+1}.0</b><input class="etName" maxlength="80" value="${esc(e.name)}" aria-label="Nome da etapa ${i+1}"><span class="muted etInfo">${S.items.filter(x=>x.etapaId===e.id).length} serviço(s) · ${money(sh.etapaTotals[e.id]||0)}</span><button class="btn small etUp" type="button" aria-label="Subir etapa">↑</button><button class="btn small etDown" type="button" aria-label="Descer etapa">↓</button><button class="btn small danger etDel" type="button">Remover</button></div>`).join('')||'<p class="muted">Nenhuma etapa ainda. Adicione acima ou use as etapas padrão.</p>';fillActive()}
function targetEtapa(){if(!S.etapas.length){ctx.alert('Crie ao menos uma etapa (ex.: Serviços Preliminares) antes de adicionar serviços.');return null}if(!S.etapas.some(e=>e.id===S.etapaAtiva))S.etapaAtiva=S.etapas[0].id;return S.etapaAtiva}
// ---------- itens
function cpuFor(f,code,kind){
  const base=S.data[f];if(f!=='SINAPI'||!base||kind!=='comp')return{};
  const c=B.buildCpu(base,S.regime[f],code);if(!c||!c.hasAnalitic)return{};
  return{cpu:{lines:c.lines.map(l=>({tipo:l.tipo,code:l.code,desc:l.desc,unit:l.unit,coef:l.coef,price:l.price,cost:l.cost,cls:l.cls})),total:c.total,unitCost:c.unitCost},composition:B.toComposition(c.flat)}
}
function addFromResult(f,code,qty){
  const et=targetEtapa();if(!et)return;const it=(S.data[f]?.regimes[S.regime[f]]?.[S.kind]||[]).find(x=>x[0]===code);if(!it)return;
  if(!(it[3]>0)&&!ctx.confirm(`${f} ${code} não tem preço divulgado para esta UF/regime (SEM CUSTO). Adicionar assim mesmo, com preço zero, para informar o preço depois?`))return;const sub=(S.sub||'').trim(),ref=S.data[f].ref;
  const ex=S.items.find(i=>i.src===f&&i.code===code&&i.ref===ref&&i.etapaId===et&&(i.sub||'')===sub);
  if(ex)ex.qty=B.r2(ex.qty+qty);
  else{const cp=cpuFor(f,code,S.kind),comp=S.kind==='ins'?[{kind:B.KIND_NAME[B.classifyResource(code,it[1],it[2],it[5])]||'Outros',description:String(it[1]).slice(0,140),unit:it[2],coef:1,price:it[3],code}]:null;
    S.items.push({id:'i'+(++uid),src:f,code,desc:it[1],unit:it[2],qty,price:it[3],ref,uf:S.data[f].uf,etapaId:et,sub,...cp,...(comp?{composition:comp}:{})})}
  saveDraft();drawEtapas();drawBudget();ctx.toast(`${f} ${code} → etapa ${S.etapas.findIndex(e=>e.id===et)+1}.0`)
}
function addManual(){
  const et=targetEtapa();if(!et)return;const q=B.parseNum($('#mQty').value,true),p=B.parseNum($('#mPrice').value,true),it={id:'i'+(++uid),src:'Próprio',code:$('#mCode').value.trim(),desc:$('#mDesc').value.trim(),unit:$('#mUnit').value.trim(),qty:q,price:p,ref:'',etapaId:et,sub:(S.sub||'').trim()};
  const e=B.validateBudgetItem(it);if(e||Number.isNaN(q)||Number.isNaN(p))return ctx.alert(e||'Informe quantidade e preço unitário válidos.');
  S.items.push(it);['#mCode','#mDesc','#mUnit','#mPrice'].forEach(i=>$(i).value='');$('#mQty').value='1';saveDraft();drawEtapas();drawBudget();ctx.toast('Item próprio adicionado.')
}
// ---------- planilha na tela
function sheet(){return O.buildSheet(S.etapas,S.items,{bdi:S.bdi,mode:S.bdiMode})}
function drawBudget(){
  const tb=$('#bbTab tbody');if(!tb)return;const sh=sheet(),et=S.etapas;
  const opt=cur=>et.map((e,i)=>`<option value="${e.id}" ${e.id===cur?'selected':''}>${i+1}.0 ${esc(e.name.slice(0,28))}</option>`).join('');
  tb.innerHTML=sh.rows.filter(r=>r.kind!=='gap').map(r=>{
    if(r.kind==='etapa')return`<tr class="bbHead bbEtapa" data-etapa="${r.etapaId}"><td><b>${r.no}</b></td><td></td><td></td><td><b>${esc(r.desc)}</b>${r.empty?' <small class="muted">(sem serviços)</small>':''}</td><td></td><td></td><td></td><td></td><td></td><td class="nw bbET"><b>${money(sh.etapaTotals[r.etapaId]||0)}</b></td><td></td></tr>`;
    if(r.kind==='sub')return`<tr class="bbHead bbSubRow"><td><b>${r.no}</b></td><td></td><td></td><td><b><i>${esc(r.desc)}</i></b></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    const i=r.item;return`<tr data-id="${i.id}"><td>${r.no}</td><td>${esc(i.src)}${i.ref?` <small class="muted">${refLabel(i.ref)}</small>`:''}</td><td>${esc(i.code||'—')}</td><td>${esc(i.desc)}${i.cpu?' <span class="bbTag" title="Tem composição analítica">CPU</span>':''}${i.price>0?'':' <span class="bbTag warn" title="Preço unitário zerado: informe o preço">sem preço</span>'}</td><td><select class="bbEt" aria-label="Etapa">${opt(i.etapaId)}</select><input class="bbSub" maxlength="100" placeholder="sub-etapa" value="${esc(i.sub||'')}" aria-label="Sub-etapa"></td><td>${esc(i.unit)}</td><td><input class="bbQ" inputmode="decimal" value="${esc(String(i.qty).replace('.',','))}" aria-label="Quantidade"></td><td><input class="bbP" inputmode="decimal" value="${esc(String(i.price).replace('.',','))}" aria-label="Preço unitário"></td><td class="bbPU nw">${S.bdiMode==='linha'?money(r.unitPrice):'—'}</td><td class="bbT nw">${money(r.total)}</td><td class="nw"><button class="btn small bbUp" type="button" aria-label="Subir serviço">↑</button><button class="btn small bbDown" type="button" aria-label="Descer serviço">↓</button><button class="btn small bbCpu" type="button">Composição</button><button class="btn small danger bbDel" type="button" aria-label="Remover serviço">✕</button></td></tr>`
  }).join('')||'<tr><td colspan="11" class="muted">Nenhum serviço. Crie as etapas, pesquise nas bases e use “Adicionar”, ou lance um item próprio.</td></tr>';
  drawTotals(sh);drawEtapasInfo(sh);const sv=$('#bbSave');if(sv){const ok=ctx.canCreate();sv.hidden=!ok;$('#bbPlan').hidden=!ok;$('#bbMsg').textContent=ok?'':'Seu perfil não pode gravar orçamentos na obra, mas você pode montar e exportar.'}
}
function drawEtapasInfo(sh){for(const e of S.etapas){const el=$(`#etList .etRow[data-id="${e.id}"] .etInfo`);if(el)el.textContent=`${S.items.filter(x=>x.etapaId===e.id).length} serviço(s) · ${money(sh.etapaTotals[e.id]||0)}`}}
function refreshNumbers(){
  const sh=sheet();for(const r of sh.rows){if(r.kind!=='item')continue;const tr=$(`#bbTab tbody tr[data-id="${r.item.id}"]`);if(!tr)continue;tr.querySelector('.bbPU').textContent=S.bdiMode==='linha'?money(r.unitPrice):'—';tr.querySelector('.bbT').textContent=money(r.total)}
  for(const e of S.etapas){const c=$(`#bbTab tbody tr[data-etapa="${e.id}"] .bbET`);if(c)c.innerHTML=`<b>${money(sh.etapaTotals[e.id]||0)}</b>`}drawTotals(sh);drawEtapasInfo(sh)
}
function drawTotals(sh=sheet()){const el=$('#bbTotals');if(!el)return;
  el.innerHTML=`<div><span>Serviços</span><b>${S.items.length}</b></div><div><span>Custo direto</span><b>${money(sh.direct)}</b></div><div><span>BDI (${num(S.bdi)}%)</span><b>${money(sh.bdiValue)}</b></div><div class="bbGrand"><span>Valor da obra</span><b>${money(sh.total)}</b></div>`;
  const x=$('#bbExt');if(x)x.textContent=sh.total>0?`Valor por extenso: ${O.valorPorExtenso(sh.total)}`:''}
function openCpu(id){
  const it=S.items.find(i=>i.id===id);if(!it)return;const root=$('#modalRoot');
  const body=it.cpu?`<div class="tablewrap"><table><thead><tr><th>Código</th><th>Tipo</th><th>Descrição</th><th>Unid.</th><th>Coeficiente</th><th>Preço unit.</th><th>Custo</th></tr></thead><tbody>${it.cpu.lines.map(l=>`<tr><td>${esc(l.code)}</td><td>${l.tipo==='INSUMO'?'Insumo':'Composição'}</td><td>${esc(l.desc)}</td><td>${esc(l.unit)}</td><td class="nw">${num6(l.coef)}</td><td class="nw">${money(l.price)}</td><td class="nw">${money(l.cost)}</td></tr>`).join('')}</tbody></table></div>
    <p><b>Custo unitário calculado pelos coeficientes:</b> ${money(it.cpu.total)} &nbsp; • &nbsp; <b>Preço publicado da composição:</b> ${money(it.cpu.unitCost??it.price)}</p>
    ${it.composition?`<p class="muted">Insumos explodidos para as curvas ABC e quantitativos: ${it.composition.filter(c=>c.kind==='Material').length} material(is), ${it.composition.filter(c=>c.kind==='Mão de obra').length} de mão de obra, ${it.composition.filter(c=>c.kind==='Equipamento').length} equipamento(s).</p>`:''}`
    :`<p class="muted">Este serviço não tem composição analítica. Isso acontece quando é item do ORSE ou próprio, ou quando a base SINAPI foi importada <b>sem a aba “Analítico”</b>. O orçamento usa o preço unitário informado (${money(it.price)}).${it.src==='SINAPI'?' Reimporte o ZIP do SINAPI (XLSX) para obter as composições analíticas.':''}</p>`;
  root.innerHTML=`<div class="modalback"><div class="dialog wide"><h2>Composição analítica — ${esc(it.code||'item próprio')}</h2><p>${esc(it.desc)}<br><span class="muted">Por 1 ${esc(it.unit||'un')} • quantidade no orçamento: ${num(it.qty)}</span></p>${body}<div class="actions"><button class="btn primary" id="cpuClose" type="button">Fechar</button></div></div></div>`;$('#cpuClose').onclick=()=>{root.innerHTML=''}
}
// ---------- validação, gravação e planejamento
function check(){
  if(!S.name.trim())return'Informe o nome do orçamento.';if(!S.etapas.length)return'Crie ao menos uma etapa.';if(!S.items.length)return'Adicione ao menos um serviço ao orçamento.';
  for(const e of S.etapas)if(!e.name.trim())return'Há etapa sem nome.';
  for(const i of S.items){const er=B.validateBudgetItem(i);if(er)return`Serviço ${i.code||i.desc.slice(0,30)}: ${er}`;if(!S.etapas.some(e=>e.id===i.etapaId))return`Serviço ${i.code||i.desc.slice(0,30)} está sem etapa.`}return''
}
function nextMonday(){const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));return O.fmtISO(d)}
function planDialog(){
  return new Promise(res=>{const root=$('#modalRoot'),st=nextMonday(),en=O.fmtISO(new Date(O.parseISO(st).getTime()+180*864e5));
    root.innerHTML=`<div class="modalback"><div class="dialog"><h2>Gerar planejamento a partir do orçamento</h2><p class="muted">Cria no ObraTop a <b>EAP e o cronograma (Gantt)</b> da obra, com cada serviço ligado ao item do orçamento. A duração de cada serviço é proporcional às <b>horas de mão de obra</b> da composição (ou ao custo, quando não há composição) e é ajustada ao prazo informado. As <b>curvas S e ABC</b> e os <b>quantitativos previsto x realizado</b> passam a ser calculados desses dados.</p>
    <div class="formgrid"><div class="field"><label for="pgStart">Início da obra</label><input type="date" id="pgStart" value="${st}"></div><div class="field"><label for="pgEnd">Término previsto</label><input type="date" id="pgEnd" value="${en}"></div>
    <div class="field"><label for="pgOv">Sobreposição entre etapas (%)</label><input id="pgOv" inputmode="numeric" value="40"><small class="muted">0 = uma etapa só começa quando a anterior termina; 90 = quase em paralelo.</small></div>
    <div class="field"><label for="pgLag">Sobreposição entre serviços da etapa (%)</label><input id="pgLag" inputmode="numeric" value="40"></div></div>
    <label class="bbChk"><input type="checkbox" id="pgBase" checked> Criar a linha de base R1 do cronograma</label>
    <div class="actions"><button class="btn" id="pgCancel" type="button">Cancelar</button><button class="btn primary" id="pgOk" type="button">Salvar e gerar</button></div></div></div>`;
    $('#pgCancel').onclick=()=>{root.innerHTML='';res(null)};
    $('#pgOk').onclick=()=>{const start=$('#pgStart').value,end=$('#pgEnd').value,ov=B.parseNum($('#pgOv').value,true),lag=B.parseNum($('#pgLag').value,true);
      if(!start||!end||end<=start)return ctx.alert('Informe início e término (o término deve ser depois do início).');if(O.workdaysBetween(start,end)<5)return ctx.alert('O prazo precisa ter pelo menos 5 dias úteis.');
      if(Number.isNaN(ov)||ov<0||ov>95||Number.isNaN(lag)||lag<0||lag>95)return ctx.alert('Sobreposição deve estar entre 0 e 95%.');
      root.innerHTML='';res({start,end,overlap:1-ov/100,lag:1-lag/100,baseline:$('#pgBase')?.checked!==false})}})
}
async function saveBudget(withPlan){
  const e=check();if(e)return ctx.alert(e);if(!S.workId)return ctx.alert('Escolha a obra em que o orçamento será gravado.');
  let plan=null;if(withPlan){plan=await planDialog();if(!plan)return}
  const zer=S.items.filter(i=>!(i.price>0)).length;if(zer&&!ctx.confirm(`Atenção: ${zer} serviço(s) estão com preço unitário ZERO e não vão compor o valor da obra. Gravar assim mesmo?`))return;
  const sh=sheet();if(!ctx.confirm(`Gravar ${S.items.length} serviço(s) em ${S.etapas.length} etapa(s) no Orçamento da obra${plan?' e gerar a EAP e o cronograma':''}?\nCusto direto ${money(sh.direct)} + BDI ${num(S.bdi)}% = ${money(sh.total)}.`))return;
  try{$('#bbSave').disabled=$('#bbPlan').disabled=true;const nos={};for(const r of sh.rows)if(r.kind==='item')nos[r.item.id]=r.no;
    const res=await ctx.saveBudget({workId:S.workId,name:S.name.trim(),bdi:S.bdi,mode:S.bdiMode,etapas:S.etapas.map(x=>({...x})),items:S.items.map(x=>({...x})),numbers:nos,plan});
    const wid=S.workId;S.items=[];S.etapas=[];S.etapaAtiva='';S.name='';saveDraft();ctx.toast(plan?`Orçamento gravado e planejamento gerado: ${res?.atividades||0} atividades, término em ${res?.fim?res.fim.split('-').reverse().join('/'):'—'}.`:'Orçamento gravado na obra.');
    plan?ctx.goPlan(wid):ctx.goList()}
  catch(err){ctx.alert('Não foi possível gravar: '+(err.message||err))}finally{const b=$('#bbSave');if(b)b.disabled=false;const c=$('#bbPlan');if(c)c.disabled=false}
}
// ---------- exportações (planilha no modelo do cliente e composições analíticas)
function refsNote(){const r=[...new Set(S.items.filter(i=>i.src!=='Próprio').map(i=>`${i.src}${i.uf?' '+i.uf:''} ${refLabel(i.ref)}`))];return r.length?`Referências de preços: ${r.join('; ')}. ${S.bdiMode==='linha'?`Preços unitários com BDI de ${num(S.bdi)}%.`:`BDI de ${num(S.bdi)}% somado ao custo direto.`}`:`BDI de ${num(S.bdi)}%.`}
function exportSheetPdf(){const e=check();if(e)return ctx.alert(e);const sh=sheet(),w=ctx.works().find(x=>x.id===S.workId);
  ctx.exportSheetPdf({title:`Planilha orçamentária — ${S.name.trim()}`,subtitle:[w?.name,`${S.items.length} serviço(s)`].filter(Boolean).join(' • '),sheet:sh,valorExtenso:O.valorPorExtenso(sh.total),showEtapaTotal:$('#bbEtTotal')?.checked,note:refsNote(),fileName:`Planilha_${S.name.trim()}`})}
function exportSheetXlsx(){const e=check();if(e)return ctx.alert(e);const sh=sheet(),N=(v,z='#,##0.00')=>({t:'n',v,z}),aoa=[['ITENS','CÓD. SINAPI/ORSE','DESCRIÇÃO DOS SERVIÇOS','UNID','QUANT','PR. UNIT ','PR. TOTAL'],[]];
  const first=aoa.length+1;let last=first;
  for(const r of sh.rows){if(r.kind==='gap'){aoa.push([]);continue}if(r.kind==='etapa'||r.kind==='sub'){if(r.empty)continue;aoa.push([r.no,'',r.desc]);continue}
    const n=aoa.length+1;aoa.push([r.no,r.code,r.desc,r.unit,N(r.qty),N(r.unitPrice),{t:'n',f:`E${n}*F${n}`,v:r.total,z:'#,##0.00'}]);last=n}
  const n=aoa.length+2;aoa.push([],['','','TOTAL','','','',{t:'n',f:`SUM(G${first}:G${last})`,v:sh.total,z:'"R$" #,##0.00'}],['Valor da obra:'],[O.valorPorExtenso(sh.total)],[],[refsNote()]);
  ctx.exportAoa(aoa,{sheet:'planilha',name:`Planilha_${S.name.trim()}`,cols:[8,16,70,7,11,11,13],merges:[{s:{r:n+1,c:0},e:{r:n+1,c:6}}]})}
function cpuBlocks(){const sh=sheet();return sh.rows.filter(r=>r.kind==='item').map(r=>({no:r.no,code:r.item.code,desc:r.item.desc,unit:r.item.unit,qty:r.item.qty,baseUnit:r.item.price,bdi:S.bdiMode==='linha'?S.bdi:0,unitPrice:r.unitPrice,cpu:r.item.cpu?{lines:r.item.cpu.lines,total:r.item.cpu.total}:null}))}
function exportCpuPdf(){const e=check();if(e)return ctx.alert(e);const w=ctx.works().find(x=>x.id===S.workId);ctx.exportCpuPdf({title:`Composições analíticas de preços unitários — ${S.name.trim()}`,subtitle:[w?.name,refsNote()].filter(Boolean).join(' • '),blocks:cpuBlocks(),fileName:`Composicoes_${S.name.trim()}`})}
function exportCpuXlsx(){const e=check();if(e)return ctx.alert(e);const N=(v,z='#,##0.00')=>({t:'n',v,z}),aoa=[['ITEM','CÓDIGO','TIPO','DESCRIÇÃO','UNID','COEFICIENTE','PREÇO UNIT.','CUSTO']];
  for(const b of cpuBlocks()){aoa.push([]);aoa.push([b.no,b.code,'SERVIÇO',b.desc,b.unit,N(b.qty),N(b.baseUnit),N(b.unitPrice)]);
    if(b.cpu?.lines?.length){for(const l of b.cpu.lines)aoa.push(['',l.code,l.tipo==='INSUMO'?'Insumo':'Composição',l.desc,l.unit,N(l.coef,'0.000000'),N(l.price),N(l.cost)]);aoa.push(['','','','Custo unitário (soma dos coeficientes)','','','',N(b.cpu.total)])}
    else aoa.push(['','','','(sem composição analítica nesta base: usa o preço unitário publicado)'])}
  ctx.exportAoa(aoa,{sheet:'composicoes',name:`Composicoes_${S.name.trim()}`,cols:[8,12,13,70,7,13,12,13]})}

function sortAz(){
  if(!S.items.length)return ctx.alert('Não há serviços para ordenar.');const out=[];
  for(const e of S.etapas){const its=S.items.filter(i=>i.etapaId===e.id),soltos=its.filter(i=>!i.sub).sort((a,b)=>B.cmpAz(a.desc,b.desc)),subs=[...new Set(its.filter(i=>i.sub).map(i=>i.sub))].sort(B.cmpAz);
    out.push(...soltos);for(const s of subs)out.push(...its.filter(i=>i.sub===s).sort((a,b)=>B.cmpAz(a.desc,b.desc)))}
  S.items=out;saveDraft();drawBudget();ctx.toast('Serviços ordenados de A a Z dentro de cada etapa e sub-etapa.')
}
