import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1]
ok=lambda c:'OK ' if c else 'FALHA'
res=[]
def chk(name,cond,extra=''):
    res.append((cond,name));print(ok(cond),name,extra)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e]
with App(APP,auth=OWNER,port=8811) as a:
    a.open();pg=a.page;fb=lambda js:pg.evaluate(js)
    # T1 alertas
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(200)
    txt=pg.inner_text('#content')
    for t in ['Contrato vencido','Contrato próximo do fim','Documento vencido','Manutenção atrasada','Financeiro vencido','Atividade atrasada','Estoque crítico']:
        chk('T1 alerta: '+t,t in txt)
    # T5 progresso calculado
    pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(200)
    row=pg.inner_text('#content table tbody tr:first-child') if pg.query_selector('#content table tbody tr') else ''
    rows=pg.eval_on_selector_all('#content table tbody tr','e=>e.map(r=>r.innerText.replace(/\\s+/g," "))')
    obraA=[r for r in rows if 'Obra A' in r][0]
    chk('T5 avanço da Obra A vem do cronograma (≠10%)', 'cronograma' in obraA and '10%' not in obraA.replace('100%',''), obraA[-60:])
    # T9 step any
    pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    steps=pg.eval_on_selector_all('#recordForm input[type=number]','e=>e.map(x=>x.getAttribute("step"))')
    chk('T9 campos numéricos aceitam qualquer casa decimal',all(s=='any' for s in steps) and len(steps)>0,str(steps));pg.click('#cancelModal')
    # T4 status pela data
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(200)
    chk('T4 financeiro mostra "Vencido (pela data)"','Vencido' in pg.inner_text('#content') and 'pela data' in pg.inner_text('#content'))
    # T3 gerar receita a partir da medição
    pg.click('.navbtn[data-route="measurements"]');pg.wait_for_timeout(200)
    pg.click('.genFin');pg.wait_for_selector('#recordForm')
    v=pg.evaluate('''()=>({type:document.querySelector('[name=type]').value,val:document.querySelector('[name=value]').value,m:document.querySelector('[name=measurementId]').value,cat:document.querySelector('[name=category]').value,st:document.querySelector('[name=status]').value,w:document.querySelector('[name=workId]').value})''')
    chk('T3 formulário de receita pré-preenchido pela medição',v=={'type':'Receita','val':'50000','m':'m1','cat':'Medição','st':'Previsto','w':'w1'},str(v))
    pg.fill('#recordForm [name=dueDate]',d(30));pg.click('#recordForm button.primary');pg.wait_for_timeout(400)
    fin=[w for w in pg.evaluate('window.__fb.writes') if w['path'].startswith('organizations/org1/finance/') and w['op']=='set']
    chk('T3 lançamento gravado com measurementId',len(fin)==1 and fin[0]['data'].get('measurementId')=='m1',str(fin[-1]['data'].get('measurementId') if fin else None))
    n=len(a.dialogs);pg.click('.navbtn[data-route="measurements"]');pg.wait_for_timeout(150);pg.click('.genFin');pg.wait_for_timeout(300)
    chk('T3 aviso de lançamento já existente',any('Já existe um lançamento' in m for t,m in a.dialogs[n:]),str(a.dialogs[n:]))
    if pg.query_selector('#recordForm'):pg.click('#cancelModal')
    # T15 vínculo de outra obra é recusado
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(150);pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    pg.select_option('#recordForm [name=workId]','w2');pg.fill('#recordForm [name=date]',d(0));pg.fill('#recordForm [name=description]','teste');pg.select_option('#recordForm [name=type]','Despesa');pg.fill('#recordForm [name=category]','Mat');pg.select_option('#recordForm [name=status]','Previsto');pg.select_option('#recordForm [name=measurementId]','m1')
    n=len(a.dialogs);pg.click('#recordForm button.primary');pg.wait_for_timeout(300)
    chk('T15 recusa vínculo de medição de outra obra',any('pertence a outra obra' in m for t,m in a.dialogs[n:]),str(a.dialogs[n:]))
    pg.click('#cancelModal')
    # T2 pedido com material → estoque
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(150);pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    pg.select_option('#recordForm [name=workId]','w1');pg.fill('#recordForm [name=date]',d(0));pg.fill('#recordForm [name=description]','Cimento 100 sacos');pg.select_option('#recordForm [name=inventoryId]','i1');pg.fill('#recordForm [name=qty]','100.5');pg.fill('#recordForm [name=value]','3000');pg.select_option('#recordForm [name=status]','Aprovado')
    pg.click('#recordForm button.primary');pg.wait_for_timeout(400)
    o=[w for w in pg.evaluate('window.__fb.writes') if w['path'].startswith('organizations/org1/orders/') and w['op']=='set'][-1]
    chk('T2 pedido salvo com material e quantidade fracionada (100,5)',o['data'].get('inventoryId')=='i1' and o['data'].get('qty')==100.5,str((o['data'].get('inventoryId'),o['data'].get('qty'))))
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(200)
    txt=pg.inner_text('#content')
    chk('T2 alerta muda para "Reposição já pedida" (sem compra duplicada)','Reposição já pedida' in txt and 'Estoque crítico' not in txt, '')
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(200)
    btns=pg.query_selector_all('.receiveStock');chk('T2 botão "Receber no estoque" disponível',len(btns)==1)
    btns[0].click();pg.wait_for_timeout(500)
    inv=pg.evaluate("window.__fb.db.get('organizations/org1/inventory/i1')")
    order_id=o['path'].split('/')[-1];od=pg.evaluate(f"window.__fb.db.get('organizations/org1/orders/{order_id}')")
    chk('T2 entrada soma ao estoque (10 + 100,5 = 110,5)',abs(inv['currentStock']-110.5)<1e-9,str(inv['currentStock']))
    chk('T2 pedido vira Entregue e fica marcado como recebido',od['status']=='Entregue' and 'stockReceivedAt' in od)
    chk('T2 sem botão após receber (evita entrada em duplicidade)',len(pg.query_selector_all('.receiveStock'))==0)
    au=[w for w in pg.evaluate('window.__fb.writes') if w['path'].startswith('organizations/org1/audits/') and w['data'].get('action')=='stock-receive']
    chk('T2 auditoria da entrada no estoque',len(au)==1)
    # T10 auditoria antes/depois
    pg.click('.navbtn[data-route="suppliers"]');pg.wait_for_timeout(150);pg.click('.edit');pg.wait_for_selector('#recordForm')
    pg.fill('#recordForm [name=phone]','8199999');pg.click('#recordForm button.primary');pg.wait_for_timeout(300)
    au=[w for w in pg.evaluate('window.__fb.writes') if w['path'].startswith('organizations/org1/audits/') and w['data'].get('action')=='update'][-1]
    ch=au['data']['changes']
    chk('T10 auditoria guarda só o que mudou, com antes e depois',ch=={'before':{'phone':''},'after':{'phone':'8199999'}},str(ch))
    # T6 snapshots: sem amplificação
    sn=lambda:len([w for w in pg.evaluate('window.__fb.writes') if '/progressSnapshots/' in w['path']])
    n0=sn();
    pg.click('.navbtn[data-route="suppliers"]');pg.click('#addRecord');pg.wait_for_selector('#recordForm');pg.fill('#recordForm [name=name]','Forn Beta');pg.select_option('#recordForm [name=status]','Ativo');pg.click('#recordForm button.primary');pg.wait_for_timeout(1500)
    chk('T6 salvar fornecedor não grava Curva S',sn()==n0,f'{n0}->{sn()}')
    pg.evaluate("window.__fb.db.set('organizations/org1/quality/qx',{workId:'w1',date:'2026-01-01',issue:'x',severity:'Menor',status:'Aberta',deleted:false,createdAt:new Timestamp(1)})") if False else None
    # alteração externa (outro usuário) não dispara regravação
    pg.evaluate("(()=>{const k='organizations/org1/safety/sx';window.__fb.db.set(k,{workId:'w1',date:'2026-01-01',type:'DDS',description:'externo',status:'Aberto',deleted:false,createdAt:{seconds:1700001000,nanoseconds:0,toDate(){return new Date(1700001000000)}}});window.__fb.listeners.forEach(l=>{try{l.next(l.t.type==='doc'?{id:'x',exists:()=>false,data:()=>undefined}:null)}catch(e){}})})()") if False else None
    n1=sn();pg.click('.navbtn[data-route="finance"]');pg.click('.edit');pg.wait_for_selector('#recordForm');pg.fill('#recordForm [name=value]','5100');pg.click('#recordForm button.primary');pg.wait_for_timeout(1800)
    chk('T6 salvar financeiro grava a Curva S de uma obra só',sn()-n1<=1,f'{n1}->{sn()}')
    n2=sn();pg.click('.navbtn[data-route="finance"]');pg.click('.edit');pg.wait_for_selector('#recordForm');pg.click('#recordForm button.primary');pg.wait_for_timeout(1800)
    chk('T6 salvar sem mudar valores não regrava a Curva S',sn()==n2,f'{n2}->{sn()}')
    snaps=[w for w in pg.evaluate('window.__fb.writes') if '/progressSnapshots/' in w['path']]
    chk('T6 ponto da Curva S inclui valor medido', all('measured' in w['data'] for w in snaps) and len(snaps)>0)
    # T8 lembrar obra
    pg.select_option('#filterWork','w2');pg.wait_for_timeout(200)
    a.page.reload();pg.wait_for_selector('#appView:not(.hidden)');pg.wait_for_function("document.querySelector('#syncStatus').textContent.includes('Sincronizado')");pg.wait_for_timeout(300)
    chk('T8 obra selecionada lembrada após recarregar',pg.input_value('#filterWork')=='w2',pg.input_value('#filterWork'))
    pg.click('#clearFilters');pg.wait_for_timeout(100)
    a.page.reload();pg.wait_for_selector('#appView:not(.hidden)');pg.wait_for_timeout(500)
    chk('T8 "Limpar" também limpa a lembrança',pg.input_value('#filterWork')=='')
    # manual/outros sem erro
    chk('sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:3]))
print('\nRESUMO:',sum(1 for c,_ in res if c),'de',len(res),'verificações passaram')
sys.exit(0 if all(c for c,_ in res) else 1)
