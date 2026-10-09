// ObraTop — Orçamentos > Planejamento: EAP, curva S, curvas ABC e quantitativos previsto x realizado (mês a mês),
// calculados a partir do orçamento fechado (itens com composição) e do cronograma (atividades ligadas aos itens).
import * as O from './orcamento.mjs';
const P={workId:'',view:'resumo',mode:'consolidado',monthly:false,month:''};
let ctx=null;
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),n2=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),n4=v=>(Number(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:4}),pc=v=>`${(Number(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const VIEWS=[['resumo','EAP e cronograma'],['curva','Curva S'],['abc','Curvas ABC'],['Material','Materiais'],['Mão de obra','Mão de obra'],['Equipamento','Equipamentos'],['real','Lançar realizado']];
const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
function dataset(){
  const bs=ctx.budgets(P.workId).filter(b=>!b.deleted),as=ctx.activities(P.workId).filter(a=>!a.deleted),acts={};for(const a of as)if(a.budgetId&&a.start&&a.end)acts[a.budgetId]=a;
  const part=bs.filter(b=>b.itemNo||acts[b.id]),ignorados=bs.length-part.length;
  const items=part.map(b=>({id:b.id,no:b.itemNo||'',etapaNo:b.etapaNo||'',etapa:b.etapa||b.category||'',sub:b.sub||'',desc:String(b.description||'').replace(/^[^—]{1,14}— /,''),code:b.sourceCode||'',unit:b.unit||'',qty:+b.qty||0,price:+b.unitValue||0,bdi:+b.bdi||0,composition:Array.isArray(b.composition)?b.composition:[],real:b.real||{},src:b.source||''}))
    .sort((a,b)=>natural(a.no||'~'+a.desc,b.no||'~'+b.desc));
  const plan=O.planning({items,acts,bdi:0}),base=ctx.baseline?ctx.baseline(P.workId):null;return{items,acts,as,plan,ignorados,base}
}
export function mount(root,c){ctx=c;root.dataset.mounted='1';const ws=ctx.works();if(!P.workId||!ws.some(w=>w.id===P.workId))P.workId=ctx.defaultWork()||ws[0]?.id||'';draw(root)}
export function refresh(c){ctx=c;const root=$('#plRoot');if(!root)return;const a=document.activeElement;if(a&&root.contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return;draw(root)}
function draw(root){
  const ws=ctx.works();
  if(!ws.length){root.innerHTML='<div class="card empty">Cadastre uma obra para usar o planejamento.</div>';return}
  const d=dataset(),has=d.items.some(i=>i.no);
  root.innerHTML=`<div class="pl"><div class="card"><div class="plTop"><div class="field"><label for="plWork">Obra</label><select id="plWork">${ws.map(w=>`<option value="${esc(w.id)}" ${w.id===P.workId?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div>
    <div class="plSeg" role="tablist">${VIEWS.map(([k,t])=>`<button class="plSegBtn ${P.view===k?'active':''}" data-v="${esc(k)}" type="button" role="tab">${t}</button>`).join('')}</div></div></div>
    <div id="plBody">${body(d,has)}</div></div>`;
  $('#plWork').onchange=e=>{P.workId=e.target.value;P.month='';draw(root)};
  root.querySelectorAll('.plSegBtn').forEach(b=>b.onclick=()=>{P.view=b.dataset.v;draw(root)});bindBody(root,d)
}
function empty(){return`<div class="card empty"><div class="sectiontitle">Esta obra ainda não tem orçamento por etapas</div><p>Monte o orçamento em <b>Criar novo orçamento</b> (etapas, serviços e composições) e use <b>Salvar e gerar planejamento</b>. Aqui aparecerão a EAP, a curva S, as curvas ABC e os quantitativos de materiais, mão de obra e equipamentos, com previsto x realizado mês a mês.</p></div>`}
function body(d,has){
  if(!d.items.length)return empty();
  switch(P.view){case'resumo':return resumo(d);case'curva':return curva(d);case'abc':return abc(d);case'real':return real(d);default:return quant(d,P.view)}
}
// ---------- EAP e cronograma
function baseBox(d){
  const b=d.base,adm=ctx.isAdmin&&ctx.isAdmin();
  if(!b)return`<div class="plWarn plBase">⚠ Esta obra ainda <b>não tem linha de base</b>. Congele as datas planejadas para acompanhar desvios do cronograma.${adm?' <button class="btn small primary" id="plFreeze" type="button">Congelar linha de base R1</button>':' (peça ao administrador)'}</div>`;
  const fins=Object.values(b.items).map(x=>x.e).sort(),atual=Object.values(d.acts).map(a=>a.end).sort(),bf=fins.at(-1),af=atual.at(-1),dev=bf&&af?O.workdayDelta(bf,af):0;
  return`<div class="card plBase"><div class="plHead"><div><div class="sectiontitle">Linha de base R${b.revision}</div><div class="muted">Congelada em ${br(b.date)} — ${esc(b.reason||'sem motivo informado')} • ${Object.keys(b.items).length} atividade(s)${b.history?` • ${b.history} revisão(ões) anterior(es)`:''}</div></div>${adm?'<button class="btn small" id="plFreeze" type="button">Replanejar (nova revisão)</button>':''}</div>
   <div class="plCards"><div><span>Término na linha de base</span><b>${bf?br(bf):'—'}</b></div><div><span>Término atual</span><b>${af?br(af):'—'}</b></div><div><span>Desvio do término</span><b class="${dev>0?'plLate':dev<0?'plEarly':''}">${dev>0?'+':''}${dev} dia(s) útil(eis)</b></div></div></div>`
}
const br=x=>x?String(x).split('-').reverse().join('/'):'—';
function devCell(dev){if(dev===null||dev===undefined)return'<td class="nw">—</td>';return`<td class="nw ${dev>0?'plLate':dev<0?'plEarly':''}">${dev>0?'+':''}${dev}</td>`}
function resumo(d){
  const {items,acts,plan,base}=d,tot=items.reduce((s,i)=>s+i.qty*i.price*(1+i.bdi/100),0),dir=items.reduce((s,i)=>s+i.qty*i.price,0),comComp=items.filter(i=>i.composition.length).length,as=Object.values(acts);
  const ini=as.map(a=>a.start).sort()[0]||'—',fim=as.map(a=>a.end).sort().at(-1)||'—',etapas=[...new Set(items.map(i=>i.etapaNo||i.etapa))],bi=base?.items||{};
  const bOf=i=>{const a=acts[i.id];return a&&bi[a.id]?bi[a.id]:null};
  const rows=etapas.map(e=>{const its=items.filter(i=>(i.etapaNo||i.etapa)===e),s=its.map(i=>acts[i.id]?.start).filter(Boolean).sort()[0]||'',f=its.map(i=>acts[i.id]?.end).filter(Boolean).sort().at(-1)||'',v=its.reduce((x,i)=>x+i.qty*i.price*(1+i.bdi/100),0),bs=its.map(i=>bOf(i)?.s).filter(Boolean).sort()[0]||'',bf=its.map(i=>bOf(i)?.e).filter(Boolean).sort().at(-1)||'';
    return`<tr class="plEt"><td><b>${esc(its[0].etapaNo||'')}</b></td><td><b>${esc(its[0].etapa)}</b></td><td></td><td></td><td>${s?br(s):'—'}</td><td>${f?br(f):'—'}</td>${base?`<td>${bs?br(bs):'—'}</td><td>${bf?br(bf):'—'}</td>${devCell(bf&&f?O.workdayDelta(bf,f):null)}`:''}<td></td><td class="nw"><b>${money(v)}</b></td><td class="nw"><b>${pc(tot?v/tot*100:0)}</b></td></tr>`+
      its.map(i=>{const a=acts[i.id],v2=i.qty*i.price*(1+i.bdi/100),b=bOf(i);return`<tr><td>${esc(i.no)}</td><td>${esc((i.sub?i.sub+' — ':'')+i.desc)}${i.composition.length?'':' <span class="bbTag warn" title="Sem composição analítica">sem CPU</span>'}</td><td>${esc(i.unit)}</td><td class="nw">${n2(i.qty)}</td><td>${a?br(a.start):'—'}</td><td>${a?br(a.end):'—'}</td>${base?`<td>${b?br(b.s):'—'}</td><td>${b?br(b.e):'—'}</td>${devCell(b&&a?O.workdayDelta(b.e,a.end):null)}`:''}<td class="nw">${a?(a.durationDays||O.workdaysBetween(a.start,a.end)):'—'}</td><td class="nw">${money(v2)}</td><td class="nw">${pc(tot?v2/tot*100:0)}</td></tr>`}).join('')}).join('');
  return`${baseBox(d)}<div class="plCards"><div><span>Valor da obra (c/ BDI)</span><b>${money(tot)}</b></div><div><span>Custo direto</span><b>${money(dir)}</b></div><div><span>Serviços / etapas</span><b>${items.length} / ${etapas.length}</b></div><div><span>Início → término</span><b>${br(ini)} → ${br(fim)}</b></div><div><span>Com composição analítica</span><b>${items.length?pc(comComp/items.length*100):'—'}</b></div></div>
   ${d.ignorados?`<p class="muted">ℹ ${d.ignorados} item(ns) do Orçamento desta obra não fazem parte da estrutura por etapas nem têm atividade no Cronograma e não entram nestas análises.</p>`:''}
   ${plan.semCronograma.length?`<p class="plWarn">⚠ ${plan.semCronograma.length} serviço(s) não têm atividade no Cronograma e ficam de fora do previsto mês a mês. Use “Salvar e gerar planejamento” no orçamento.</p>`:''}
   <div class="card"><div class="plHead"><div class="sectiontitle">EAP — estrutura analítica do orçamento e cronograma</div><div class="bbRow"><button class="btn" id="plGantt" type="button">Abrir cronograma (Gantt)</button><button class="btn" id="plXlsx" type="button">Exportar Excel</button></div></div>
   <div class="tablewrap"><table class="plTab"><thead><tr><th>EAP</th><th>Etapa / serviço</th><th>Unid.</th><th>Quantidade</th><th>Início</th><th>Término</th>${base?'<th>Início (base)</th><th>Término (base)</th><th title="Dias úteis de diferença entre o término atual e o da linha de base (positivo = atrasado)">Desvio (dias úteis)</th>':''}<th>Dias úteis</th><th>Valor c/ BDI</th><th>Peso</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
}
// ---------- Curva S
function curveSvg(c,hasBase){
  if(!c.length)return'<div class="empty">Sem dados mensais: gere o planejamento do orçamento.</div>';
  const W=640,H=250,L=44,R=14,T=14,B=44,pw=W-L-R,ph=H-T-B,x=i=>L+(c.length===1?pw/2:i*pw/(c.length-1)),y=v=>T+ph-Math.min(100,v)/100*ph;
  const line=(k,col,dash)=>`<polyline fill="none" stroke="${col}" stroke-width="4"${dash?' stroke-dasharray="9 6"':''} points="${c.map((r,i)=>`${x(i)},${y(r[k])}`).join(' ')}"/>`+c.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[k])}" r="4.5" fill="#fff" stroke="${col}" stroke-width="2.5"><title>${O.monthLabel(r.m)} — ${pc(r[k])}</title></circle>`).join('');
  const hasReal=c.some(r=>r.realCum>0);
  return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva S previsto x realizado${hasBase?' e linha de base':''}">${[0,25,50,75,100].map(g=>`<line x1="${L}" x2="${W-R}" y1="${y(g)}" y2="${y(g)}" stroke="var(--line,#d5dbe1)"/><text x="${L-6}" y="${y(g)+4}" text-anchor="end" font-size="11">${g}%</text>`).join('')}
   ${(()=>{const st=Math.max(1,Math.ceil(c.length*40/pw));return c.map((r,i)=>(i%st===0||i===c.length-1)&&(i===c.length-1||c.length-1-i>=Math.ceil(st*0.6))?`<text x="${x(i)}" y="${H-24}" text-anchor="middle" font-size="11">${O.monthLabel(r.m).slice(0,2)}/${O.monthLabel(r.m).slice(5)}</text>`:'').join('')})()}${hasBase?line('basePct','#8a6bff',true):''}${line('plannedPct','#ff6a00')}${hasReal?line('realPct','#0066ff'):''}</svg>
   <div class="legend">${hasBase?'<span><i style="background:#8a6bff"></i>Linha de base (acumulado)</span>':''}<span><i style="background:#ff6a00"></i>Previsto atual (acumulado)</span><span><i style="background:#0066ff"></i>Realizado (acumulado)</span></div>`
}
function curvaRows(d){
  const bc=d.base?O.baselineCurve(d.base.items):[],pc0=d.plan.curve;
  const ms=[...new Set([...pc0.map(r=>r.m),...bc.map(r=>r.m)])].sort();if(!ms.length)return[];
  const full=O.monthRange(ms[0],ms.at(-1)),pm=new Map(pc0.map(r=>[r.m,r])),bm=new Map(bc.map(r=>[r.m,r]));let lp=null,lb=null;
  return full.map(m=>{const p=pm.get(m),b=bm.get(m);if(p)lp=p;if(b)lb=b;return{m,planned:p?.planned||0,real:p?.real||0,plannedCum:lp?.plannedCum||0,realCum:lp?.realCum||0,plannedPct:lp?.plannedPct||0,realPct:lp?.realPct||0,basePct:lb?.pct||0}})
}
function curva(d){
  const c=curvaRows(d),hb=!!d.base;
  return`${baseBox(d)}<div class="card"><div class="plHead"><div class="sectiontitle">Curva S físico-financeira — previsto x realizado${hb?' x linha de base':''}</div><button class="btn" id="plXlsx" type="button">Exportar Excel</button></div>${curveSvg(c,hb)}
   <p class="muted">Valores com BDI. O <b>previsto</b> distribui cada serviço pelos dias úteis da atividade no Cronograma; o <b>realizado</b> vem da quantidade executada que você lança em “Lançar realizado”.${hb?' A <b>linha de base</b> é a curva das datas congeladas.':''}</p>
   <div class="tablewrap"><table class="plTab"><thead><tr><th>Mês</th>${hb?'<th>% linha de base</th>':''}<th>Previsto no mês</th><th>Realizado no mês</th><th>Previsto acumulado</th><th>Realizado acumulado</th><th>% previsto</th><th>% realizado</th><th>Real − previsto (p.p.)</th>${hb?'<th title="Previsto atual menos linha de base (negativo = atrasado em relação à linha de base)">Previsto − base (p.p.)</th>':''}</tr></thead><tbody>${c.map(r=>`<tr><td>${O.monthLabel(r.m)}</td>${hb?`<td class="nw">${pc(r.basePct)}</td>`:''}<td class="nw">${money(r.planned)}</td><td class="nw">${money(r.real)}</td><td class="nw">${money(r.plannedCum)}</td><td class="nw">${money(r.realCum)}</td><td class="nw">${pc(r.plannedPct)}</td><td class="nw">${pc(r.realPct)}</td><td class="nw">${r.realCum>0||r.real>0?(r.realPct-r.plannedPct).toLocaleString('pt-BR',{maximumFractionDigits:1,signDisplay:'always'}):'—'}</td>${hb?`<td class="nw ${r.plannedPct-r.basePct<-0.05?'plLate':r.plannedPct-r.basePct>0.05?'plEarly':''}">${(r.plannedPct-r.basePct).toLocaleString('pt-BR',{maximumFractionDigits:1,signDisplay:'always'})}</td>`:''}</tr>`).join('')}</tbody></table></div></div>`
}
// ---------- ABC
function abcCard(titulo,rows){
  const a=rows.filter(r=>r.cls==='A').length,b=rows.filter(r=>r.cls==='B').length,c=rows.filter(r=>r.cls==='C').length,max=Math.max(...rows.map(r=>r.cost),1),tot=rows.reduce((s,r)=>s+r.cost,0);
  return`<div class="card"><div class="sectiontitle">${titulo}</div><p class="muted">${rows.length} insumo(s) • total ${money(tot)} (custo direto) • Classe A: ${a} • B: ${b} • C: ${c}</p>${rows.length?`<div class="tablewrap"><table class="plTab"><thead><tr><th>#</th><th>Cl.</th><th>Insumo</th><th>Unid.</th><th>Quantidade</th><th>Custo</th><th>%</th><th>% acum.</th></tr></thead><tbody>${rows.slice(0,25).map(r=>`<tr><td>${r.rank}</td><td><span class="abcClass abc${r.cls}">${r.cls}</span></td><td>${esc(r.desc)}${r.noComp?' <span class="bbTag warn">sem CPU</span>':''}</td><td>${esc(r.unit)}</td><td class="nw">${n2(r.qty)}</td><td class="nw">${money(r.cost)}<span class="plBar"><i style="width:${Math.max(2,r.cost/max*100)}%"></i></span></td><td class="nw">${pc(r.pct)}</td><td class="nw">${pc(r.cumPct)}</td></tr>`).join('')}</tbody></table></div>${rows.length>25?`<p class="muted">Mostrando os 25 maiores; o Excel traz todos.</p>`:''}`:'<div class="empty">Sem insumos deste tipo. Itens sem composição analítica aparecem em “Outros”.</div>'}</div>`
}
function abc(d){
  const g=O.abcByKind(d.items);
  return`<div class="plHead"><p class="muted">Curva ABC por insumo, calculada sobre o custo direto (sem BDI). Classe A ≈ 80% do valor; B até ≈ 95%; C o restante.</p><button class="btn" id="plXlsx" type="button">Exportar Excel (todas as curvas)</button></div>`+abcCard('Curva ABC — Materiais',g['Material'])+abcCard('Curva ABC — Mão de obra',g['Mão de obra'])+abcCard('Curva ABC — Equipamentos',g['Equipamento'])+(g['Outros'].length?abcCard('Curva ABC — Outros e serviços sem composição',g['Outros']):'')
}
// ---------- quantitativos (material, mão de obra, equipamento)
function quant(d,kind){
  const rs=d.plan.resources[kind]||[],months=d.plan.months,mon=P.monthly&&months.length,por=P.mode==='servico',unitTxt=kind==='Mão de obra'?'horas':'';
  const head=`<div class="card"><div class="plHead"><div class="sectiontitle">Quantitativo de ${kind==='Mão de obra'?'mão de obra':kind==='Material'?'materiais':'equipamentos'} — previsto x realizado</div><div class="bbRow"><label class="bbChk"><input type="radio" name="plMode" value="consolidado" ${!por?'checked':''}> Consolidado por insumo</label><label class="bbChk"><input type="radio" name="plMode" value="servico" ${por?'checked':''}> Por serviço</label><label class="bbChk"><input type="checkbox" id="plMonthly" ${P.monthly?'checked':''}> Mês a mês</label><button class="btn" id="plXlsx" type="button">Exportar Excel</button></div></div>`;
  if(por){const q=O.quantitativoPorServico(d.items,kind);
    return head+(q.length?`<div class="tablewrap"><table class="plTab"><thead><tr><th>Serviço</th><th>Insumo</th><th>Unid.</th><th>Coeficiente</th><th>Quantidade</th><th>Preço unit.</th><th>Custo</th></tr></thead><tbody>${q.map(s=>`<tr class="plEt"><td colspan="2"><b>${esc(s.no)} ${esc(s.desc.slice(0,90))}</b></td><td>${esc(s.unit)}</td><td></td><td class="nw"><b>${n2(s.qty)}</b></td><td></td><td class="nw"><b>${money(s.cost)}</b></td></tr>`+s.lines.map(l=>`<tr><td></td><td>${esc(l.desc)}</td><td>${esc(l.unit)}</td><td class="nw">${n4(l.coef)}</td><td class="nw">${n2(l.qty)}</td><td class="nw">${money(l.price)}</td><td class="nw">${money(l.cost)}</td></tr>`).join('')).join('')}</tbody></table></div></div>`:'<div class="empty">Nenhum serviço desta obra tem composição com este tipo de insumo.</div></div>')}
  if(!rs.length)return head+'<div class="empty">Sem insumos deste tipo com previsto ou realizado. Confira se os serviços têm composição analítica e atividade no Cronograma.</div></div>';
  const tp=rs.reduce((s,r)=>s+r.plannedCost,0),tr=rs.reduce((s,r)=>s+r.realCost,0);
  return head+`<div class="plCards"><div><span>Custo previsto (sem BDI)</span><b>${money(tp)}</b></div><div><span>Custo realizado</span><b>${money(tr)}</b></div><div><span>Realizado / previsto</span><b>${tp?pc(tr/tp*100):'—'}</b></div><div><span>Insumos</span><b>${rs.length}</b></div></div>
   <div class="tablewrap"><table class="plTab plWide"><thead><tr><th>Código</th><th>Insumo</th><th>Unid.</th><th>Qtd prevista${unitTxt?'':''}</th><th>Qtd realizada</th><th>% exec.</th><th>Preço médio</th><th>Custo previsto</th><th>Custo realizado</th>${mon?months.map(m=>`<th class="plM">${O.monthLabel(m)}<br><small>previsto</small></th><th class="plM">${O.monthLabel(m)}<br><small>realizado</small></th>`).join(''):''}</tr></thead>
   <tbody>${rs.map(r=>`<tr><td>${esc(r.code||'—')}</td><td>${esc(r.desc)}</td><td>${esc(r.unit)}</td><td class="nw">${n2(r.plannedQty)}</td><td class="nw">${n2(r.realQty)}</td><td class="nw">${r.plannedQty?pc(r.realQty/r.plannedQty*100):'—'}</td><td class="nw">${money(r.plannedQty?r.plannedCost/r.plannedQty:0)}</td><td class="nw">${money(r.plannedCost)}</td><td class="nw">${money(r.realCost)}</td>${mon?months.map(m=>`<td class="nw plM">${r.planned[m]?n2(r.planned[m]):''}</td><td class="nw plM plR">${r.real[m]?n2(r.real[m]):''}</td>`).join(''):''}</tr>`).join('')}
   ${kind==='Mão de obra'&&mon?`<tr class="plEt"><td colspan="9"><b>Efetivo médio no mês (profissionais = horas ÷ dias úteis × 8 h)</b></td>${months.map(m=>{const dias=Math.max(1,O.workdayList(O.parseISO(m+'-01'),new Date(+m.slice(0,4),+m.slice(5),0)).length),hp=rs.reduce((s,r)=>s+(r.planned[m]||0),0),hr=rs.reduce((s,r)=>s+(r.real[m]||0),0);return`<td class="nw plM"><b>${hp?n2(hp/dias/8):''}</b></td><td class="nw plM plR"><b>${hr?n2(hr/dias/8):''}</b></td>`}).join('')}</tr>`:''}</tbody></table></div></div>`
}
// ---------- lançar realizado
function real(d){
  const months=d.plan.months;if(!months.length)return`<div class="card empty">Sem cronograma gerado: não há meses para lançar. Use “Salvar e gerar planejamento” no orçamento.</div>`;
  const hoje=new Date().toISOString().slice(0,7);if(!P.month||!months.includes(P.month))P.month=months.includes(hoje)?hoje:months[0];const m=P.month;
  const rows=d.plan.services.map(s=>{const it=s.item,prev=s.planned[m]||0,acumAnt=Object.entries(s.real).filter(([k])=>k<m).reduce((x,[,v])=>x+(+v||0),0),atual=+s.real[m]||0;return{it,prev,acumAnt,atual,s}}).filter(r=>r.prev>0||r.acumAnt>0||r.atual>0);
  return`<div class="card"><div class="plHead"><div class="sectiontitle">Lançar o realizado do mês</div><div class="bbRow"><label>Mês <select id="plMonth">${months.map(x=>`<option value="${x}" ${x===m?'selected':''}>${O.monthLabel(x)}</option>`).join('')}</select></label><button class="btn" id="plFill" type="button">Preencher com o previsto</button><button class="btn primary" id="plSaveReal" type="button" ${ctx.canEdit()?'':'hidden'}>Salvar realizado de ${O.monthLabel(m)}</button></div></div>
   <p class="muted">Informe a <b>quantidade de cada serviço executada neste mês</b> (na unidade do serviço). Os quantitativos realizados de material, mão de obra e equipamento e a curva S realizada são calculados com os coeficientes das composições.</p>
   <div class="tablewrap"><table class="plTab"><thead><tr><th>Item</th><th>Serviço</th><th>Unid.</th><th>Quantidade total</th><th>Previsto no mês</th><th>Executado até o mês anterior</th><th>Executado no mês</th><th>Acumulado (%)</th></tr></thead><tbody>${rows.map(r=>`<tr data-id="${esc(r.it.id)}" data-prev="${r.prev}" data-ant="${r.acumAnt}" data-qty="${r.it.qty}"><td>${esc(r.it.no)}</td><td>${esc(r.it.desc.slice(0,110))}</td><td>${esc(r.it.unit)}</td><td class="nw">${n2(r.it.qty)}</td><td class="nw">${n2(r.prev)}</td><td class="nw">${n2(r.acumAnt)}</td><td><input class="plRealIn" inputmode="decimal" value="${r.atual?String(r.atual).replace('.',','):''}" aria-label="Executado no mês" placeholder="0"></td><td class="nw plAc">${r.it.qty?pc((r.acumAnt+r.atual)/r.it.qty*100):'—'}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">Nenhum serviço previsto neste mês.</td></tr>'}</tbody></table></div></div>`
}
function bindBody(root,d){
  const g=s=>root.querySelector(s);
  if(g('#plGantt'))g('#plGantt').onclick=()=>ctx.goGantt(P.workId);
  if(g('#plFreeze'))g('#plFreeze').onclick=async()=>{await ctx.freezeBaseline(P.workId)};
  if(g('#plXlsx'))g('#plXlsx').onclick=()=>exportar(d);
  root.querySelectorAll('input[name=plMode]').forEach(r=>r.onchange=()=>{P.mode=r.value;draw(root)});
  if(g('#plMonthly'))g('#plMonthly').onchange=e=>{P.monthly=e.target.checked;draw(root)};
  if(g('#plMonth'))g('#plMonth').onchange=e=>{P.month=e.target.value;draw(root)};
  if(g('#plFill'))g('#plFill').onclick=()=>root.querySelectorAll('.plRealIn').forEach(i=>{const tr=i.closest('tr');i.value=String(Math.round((+tr.dataset.prev||0)*1e4)/1e4).replace('.',',');upd(tr)});
  root.querySelectorAll('.plRealIn').forEach(i=>i.addEventListener('input',()=>upd(i.closest('tr'))));
  function upd(tr){const v=parse(tr.querySelector('.plRealIn').value),q=+tr.dataset.qty;tr.querySelector('.plAc').textContent=q?pc(((+tr.dataset.ant||0)+(Number.isNaN(v)?0:v))/q*100):'—'}
  if(g('#plSaveReal'))g('#plSaveReal').onclick=async()=>{const upds=[];for(const tr of root.querySelectorAll('.plRealIn')){const tr0=tr.closest('tr'),v=tr.value.trim()===''?0:parse(tr.value);if(Number.isNaN(v)||v<0)return ctx.alert('Há quantidade inválida. Use números positivos.');
      const q=+tr0.dataset.qty,ant=+tr0.dataset.ant||0;if(q>0&&ant+v>q*1.1&&!ctx.confirm(`O serviço ${tr0.cells[0].textContent} passa de 110% da quantidade orçada (${n2(ant+v)} de ${n2(q)}). Gravar mesmo assim?`))return;upds.push({id:tr0.dataset.id,month:P.month,qty:v})}
    try{await ctx.saveReal(upds);ctx.toast(`Realizado de ${O.monthLabel(P.month)} gravado.`)}catch(e){ctx.alert('Não foi possível gravar: '+(e.message||e))}}
}
const parse=v=>{const s=String(v).trim().replace(/\./g,'').replace(',','.');return s===''?0:(/^-?\d+(\.\d+)?$/.test(s)?Number(s):NaN)};
// ---------- exportação em Excel
function exportar(d){
  const N=(v,z='#,##0.00')=>({t:'n',v:Number(v)||0,z}),P4='#,##0.0000',v=P.view,ms=d.plan.months,w=ctx.works().find(x=>x.id===P.workId)?.name||'obra',out=[];
  const sheet=(name,aoa,cols)=>out.push({name,aoa,cols});
  if(v==='resumo'){const hb=!!d.base,a=[['EAP','Etapa / serviço','Unid.','Quantidade','Início','Término',...(hb?['Início (base)','Término (base)','Desvio (dias úteis)']:[]),'Dias úteis','Valor c/ BDI']];for(const i of d.items){const x=d.acts[i.id],b=hb&&x?d.base.items[x.id]:null;a.push([i.no,(i.sub?i.sub+' — ':'')+i.desc,i.unit,N(i.qty),x?.start||'',x?.end||'',...(hb?[b?.s||'',b?.e||'',b&&x?N(O.workdayDelta(b.e,x.end),'0'):'']:[]),x?N(x.durationDays||O.workdaysBetween(x.start,x.end),'0'):'',N(i.qty*i.price*(1+i.bdi/100))])}sheet('EAP e cronograma',a,[8,70,7,12,11,11,...(hb?[12,12,12]:[]),9,15])}
  else if(v==='curva'){const hb=!!d.base,a=[['Mês',...(hb?['% linha de base']:[]),'Previsto no mês','Realizado no mês','Previsto acumulado','Realizado acumulado','% previsto','% realizado',...(hb?['Previsto − base (p.p.)']:[])]];for(const r of curvaRows(d))a.push([O.monthLabel(r.m),...(hb?[N(r.basePct,'0.0')]:[]),N(r.planned),N(r.real),N(r.plannedCum),N(r.realCum),N(r.plannedPct,'0.0'),N(r.realPct,'0.0'),...(hb?[N(r.plannedPct-r.basePct,'0.0')]:[])]);sheet('Curva S',a,[10,...(hb?[13]:[]),16,16,16,16,11,11,...(hb?[16]:[])])}
  else if(v==='abc'){const g=O.abcByKind(d.items);for(const k of ['Material','Mão de obra','Equipamento','Outros']){const a=[['#','Classe','Insumo','Unid.','Quantidade','Custo (sem BDI)','%','% acumulado']];for(const r of g[k])a.push([r.rank,r.cls,r.desc,r.unit,N(r.qty),N(r.cost),N(r.pct,'0.0'),N(r.cumPct,'0.0')]);sheet('ABC '+k,a,[5,7,70,8,13,15,8,10])}}
  else if(v==='real'){return ctx.alert('Escolha Curva S, Curvas ABC, EAP ou um quantitativo para exportar.')}
  else{const kind=v,rs=d.plan.resources[kind]||[],a=[['Código','Insumo','Unid.','Qtd prevista','Qtd realizada','% exec.','Custo previsto','Custo realizado',...ms.flatMap(m=>[`${O.monthLabel(m)} previsto`,`${O.monthLabel(m)} realizado`])]];
    for(const r of rs)a.push([r.code,r.desc,r.unit,N(r.plannedQty),N(r.realQty),N(r.plannedQty?r.realQty/r.plannedQty*100:0,'0.0'),N(r.plannedCost),N(r.realCost),...ms.flatMap(m=>[N(r.planned[m]||0),N(r.real[m]||0)])]);sheet('Consolidado',a,[11,60,8,13,13,8,15,15,...ms.flatMap(()=>[13,13])]);
    const q=O.quantitativoPorServico(d.items,kind),b=[['Serviço','Insumo','Unid.','Coeficiente','Quantidade','Preço unit.','Custo']];for(const s of q){b.push([`${s.no} ${s.desc}`,'',s.unit,'',N(s.qty),'',N(s.cost)]);for(const l of s.lines)b.push(['',l.desc,l.unit,N(l.coef,P4),N(l.qty),N(l.price),N(l.cost)])}sheet('Por serviço',b,[60,60,8,12,13,12,14])}
  ctx.exportBook(out,`Planejamento_${w}_${v}`)
}
export function setWork(id){P.workId=id;P.month=''}
