import test from 'node:test';
import assert from 'node:assert/strict';
import * as t from '../../public/templates.mjs';
const isWd=s=>{const d=new Date(s+'T12:00:00').getDay();return d!==0&&d!==6};
const params=(family,over={})=>({family,base:t.FAMILIES[family].baseDefault,start:'2026-11-02',end:'2027-08-27',bdi:25,cf:1,...over});

test('os quatro modelos geram cronograma e orçamento coerentes',()=>{
  for(const fam of Object.keys(t.FAMILIES)){
    const p=t.buildProject(params(fam)),wbs=p.tasks.map(x=>x.wbs),set=new Set(wbs);
    assert.equal(set.size,wbs.length,fam+': EAP duplicada');
    for(const x of p.tasks){
      for(const pr of x.pred.split(',').filter(Boolean))assert.ok(set.has(pr),`${fam} ${x.wbs}: predecessora inexistente ${pr}`);
      assert.ok(x.start<=x.end,fam+' datas invertidas');assert.ok(isWd(x.start)&&isWd(x.end),fam+' data em fim de semana');
      assert.ok(x.start>=p.start&&x.end<=p.end);assert.ok(x.qty>0&&x.unitValue>0&&x.sale>0);assert.ok(x.durationDays>=1);
    }
    assert.ok(p.end<='2027-08-27',fam+': passou da data final');
    assert.ok(Math.abs(p.budgetTotal-p.tasks.reduce((s,x)=>s+x.sale,0))<0.01);assert.ok(p.value>=p.budgetTotal&&p.value%1000===0);
    assert.equal(p.phaseSummary.reduce((s,f)=>s+f.tasks,0),p.tasks.length);
    assert.ok(p.tasks.filter(x=>x.span).every(x=>x.start===p.start&&x.end===p.end),fam+': atividades de gestão devem cobrir a obra toda');
  }
});
test('o cronograma aproveita o prazo: termina perto da data final pedida',()=>{
  const p=t.buildProject(params('BUILD'));const gap=t.workdaysBetweenISO(p.end,'2027-08-27');assert.ok(gap<=8,'sobrou prazo demais: '+gap+' dias úteis');
});
test('resultado é determinístico e respeita a seleção de atividades',()=>{
  const a=t.buildProject(params('PAV')),b=t.buildProject(params('PAV'));assert.deepEqual(a,b);
  const keys=t.FAMILIES.PAV.tasks.slice(0,12).map(x=>x.k),s=t.buildProject(params('PAV',{keys}));
  assert.equal(s.tasks.length,12);assert.ok(s.budgetTotal<a.budgetTotal);
  assert.throws(()=>t.buildProject(params('PAV',{keys:[]})),/ao menos uma/);
});
test('porte, fator de custo e BDI mudam o valor na proporção esperada',()=>{
  const base=t.buildProject(params('REDE')),dobroCusto=t.buildProject(params('REDE',{cf:2})),semBdi=t.buildProject(params('REDE',{bdi:0})),maior=t.buildProject(params('REDE',{base:t.FAMILIES.REDE.baseDefault*2}));
  assert.ok(Math.abs(dobroCusto.budgetTotal/base.budgetTotal-2)<0.02);assert.ok(Math.abs(base.budgetTotal/semBdi.budgetTotal-1.25)<0.01);assert.ok(maior.budgetTotal>base.budgetTotal*1.8);
});
test('datas em fim de semana começam na segunda e prazos curtos são recusados',()=>{
  const p=t.buildProject(params('CONT',{start:'2026-11-07'}));assert.equal(p.start,'2026-11-09');
  assert.throws(()=>t.buildProject(params('CONT',{start:'2026-11-02',end:'2026-11-04'})),/5 dias úteis/);
  assert.throws(()=>t.buildProject({...params('CONT'),family:'XYZ'}),/desconhecido/);assert.throws(()=>t.buildProject(params('CONT',{base:0})),/porte/);
});
test('workdaysBetweenISO conta dias úteis incluindo o primeiro dia',()=>{
  assert.equal(t.workdaysBetweenISO('2026-11-02','2026-11-06'),5);assert.equal(t.workdaysBetweenISO('2026-11-02','2026-11-08'),5);assert.equal(t.workdaysBetweenISO('2026-11-02','2026-11-09'),6);
});
test('validateWizard: nome, cliente, datas, porte, BDI, fator e duplicidade',()=>{
  const ok={name:'Obra Nova',client:'Cliente',start:'2026-11-02',end:'2027-03-01',family:'BUILD',base:500,bdi:25,cf:1};
  assert.equal(t.validateWizard(ok,[]),'');
  assert.match(t.validateWizard({...ok,name:' '},[]),/nome/);assert.match(t.validateWizard(ok,['  obra  NOVA ']),/Já existe/);
  assert.match(t.validateWizard({...ok,client:''},[]),/cliente/);assert.match(t.validateWizard({...ok,end:'2026-11-05'},[]),/10 dias úteis/);
  assert.match(t.validateWizard({...ok,base:0},[]),/porte/);assert.match(t.validateWizard({...ok,bdi:120},[]),/BDI/);assert.match(t.validateWizard({...ok,cf:0.05},[]),/fator/);
  assert.equal(t.validateWizard({...ok,family:'BLANK',base:0,bdi:999},[]),'');
});
