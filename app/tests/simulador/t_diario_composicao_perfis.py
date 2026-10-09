import sys,re,json; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/'
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'permission' not in e.lower() and 'Missing or insufficient' not in e]
def S():
    s=make_seed()
    s[O+'budgets/b_comp']=base(workId='w1',category='Alvenaria',description='Alvenaria de vedação (teste de composição)',unit='m²',qty=100,unitValue=50,bdi=20)
    s[O+'activities/a_rdo']=base(workId='w1',wbs='1.2.1',name='Alvenaria do bloco A',start=d(-10),end=d(20),durationDays=22,progressMode='Percentual',progress=20,status='Em andamento')
    return s
# ===== 1) campo de siglas logo abaixo da linha de indicadores
with App(APP,auth=OWNER,seed=S(),port=9010,viewport={'width':1600,'height':900}) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(800)
    pos=pg.evaluate("""()=>{const m=document.querySelector('.metricstrip'),g=document.querySelector('.glossaryDetails'),c=document.querySelector('.dashboardCharts');return{existe:!!g,logoApos:m&&m.nextElementSibling===g,antesDosGraficos:!!(g&&c&&(g.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING)),aberto:g&&g.open,itens:g?g.querySelectorAll('.glossaryItem').length:0,noFim:document.querySelectorAll('.glossaryCard').length}}""")
    chk('G1 o campo de siglas fica logo abaixo da linha de indicadores e antes dos gráficos',pos['existe'] and pos['logoApos'] and pos['antesDosGraficos'],str(pos))
    chk('G2 abre aberto e traz as 12 siglas',pos['aberto'] and pos['itens']==12 and pos['noFim']==1)
    pg.click('.glossaryDetails > summary');pg.wait_for_timeout(300)
    chk('G3 pode ser recolhido e a escolha é lembrada',pg.evaluate("!document.querySelector('.glossaryDetails').open && localStorage.getItem('obratop-gloss-open')==='0'"))
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(300);pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(500)
    chk('G4 volta recolhido ao reabrir o painel',pg.evaluate("!document.querySelector('.glossaryDetails').open"))
    chk('G5 siglas do campo não são sublinhadas duas vezes (sem abbr dentro dele)',pg.evaluate("document.querySelectorAll('.glossaryDetails abbr').length")==0)
# ===== 2) composição de custo
with App(APP,auth=OWNER,seed=S(),port=9011) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="budgets"]');pg.wait_for_timeout(500)
    pg.click('.compBtn[data-id="b_comp"]');pg.wait_for_selector('.compTable')
    rows=lambda:pg.eval_on_selector_all('.compTable tbody tr','e=>e.length')
    pg.fill('.compTable tr[data-i="0"] [data-f=description]','Bloco cerâmico 9x19x19');pg.fill('.compTable tr[data-i="0"] [data-f=coef]','12.5');pg.fill('.compTable tr[data-i="0"] [data-f=price]','2.4')
    pg.click('#compAdd');pg.select_option('.compTable tr[data-i="1"] [data-f=kind]','Mão de obra');pg.fill('.compTable tr[data-i="1"] [data-f=description]','Pedreiro');pg.fill('.compTable tr[data-i="1"] [data-f=coef]','0.8');pg.fill('.compTable tr[data-i="1"] [data-f=price]','25')
    pg.wait_for_timeout(200)
    summ=pg.inner_text('#compSummary').replace('\u00a0',' ')
    chk('C1 o resumo soma por tipo e mostra o custo unitário (12,5×2,40 + 0,8×25 = R$ 50,00)','R$ 50,00' in summ and 'Material' in summ and 'Mão de obra' in summ,summ[:140])
    n0=len(a.dialogs);pg.click('#compSave');pg.wait_for_timeout(800)
    b=pg.evaluate(f"window.__fb.db.get('{O}budgets/b_comp')")
    chk('C2 salvou 2 insumos e aplicou o custo unitário ao item (50 → 50,00 via composição)',len(b.get('composition',[]))==2 and abs(b['unitValue']-50)<0.001 and abs(b['compositionTotal']-50)<0.001,str({k:b.get(k) for k in('unitValue','compositionTotal')}))
    pg.click('.compBtn[data-id="b_comp"]');pg.wait_for_selector('.compTable');pg.fill('.compTable tr[data-i="0"] [data-f=price]','3');pg.wait_for_timeout(150)
    pg.click('#compSave');pg.wait_for_timeout(700)
    b=pg.evaluate(f"window.__fb.db.get('{O}budgets/b_comp')")
    chk('C3 ao editar, o valor unitário acompanha (12,5×3 + 20 = R$ 57,50)',abs(b['unitValue']-57.5)<0.001,str(b['unitValue']))
    chk('C4 a tabela indica a composição e a auditoria registra','composição com 2 insumo(s)' in pg.inner_text('#content') and pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='composition')"))
    pg.click('.compBtn[data-id="b_comp"]');pg.wait_for_selector('.compTable');pg.fill('.compTable tr[data-i="0"] [data-f=coef]','-2');n=len(a.dialogs);pg.click('#compSave');pg.wait_for_timeout(500)
    chk('C5 coeficiente negativo é recusado',any('negativos' in m for _,m in a.dialogs[n:]));pg.click('#cancelModal')
    chk('C6 sem erros de JS (composição)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ===== 3) Diário de Obra: some se as regras negarem; funciona e aplica ao cronograma se liberarem
with App(APP,auth=OWNER,seed=S(),port=9012,extra_init="window.__denyReadCollections=['dailyLogs'];") as a:
    a.open();pg=a.page;pg.wait_for_timeout(800)
    nav=pg.eval_on_selector_all('.navbtn','e=>e.map(x=>x.dataset.route)')
    chk('D1 com as regras antigas (coleção negada) o menu não mostra o Diário de Obra e o app segue sincronizado','dailyLogs' not in nav and 'Sincronizado' in pg.inner_text('#syncStatus'),pg.inner_text('#syncStatus'))
with App(APP,auth=OWNER,seed=S(),port=9013) as a:
    a.open();pg=a.page;pg.wait_for_timeout(800)
    nav=pg.eval_on_selector_all('.navbtn','e=>e.map(x=>x.dataset.route)')
    chk('D2 com a coleção liberada o menu mostra o Diário de Obra','dailyLogs' in nav)
    pg.click('.navbtn[data-route="dailyLogs"]');pg.wait_for_timeout(500);pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    pg.select_option('#recordForm [name=workId]','w1');pg.fill('#recordForm [name=date]',today_iso() if False else __import__('datetime').date.today().isoformat())
    pg.select_option('#recordForm [name=weather]','Bom');pg.select_option('#recordForm [name=workable]','Sim');pg.fill('#recordForm [name=laborCount]','14');pg.fill('#recordForm [name=equipmentCount]','2')
    pg.select_option('#recordForm [name=activityId]','a_rdo');pg.fill('#recordForm [name=progressTo]','65');pg.fill('#recordForm [name=services]','Elevação de alvenaria do bloco A até a 5ª fiada.');pg.fill('#recordForm [name=responsible]','Mestre de obras');pg.select_option('#recordForm [name=status]','Assinado')
    pg.click('#recordForm button.primary');pg.wait_for_timeout(800)
    logs=pg.evaluate("[...window.__fb.db.entries()].filter(([k])=>k.includes('/dailyLogs/')).map(([k,v])=>v)")
    chk('D3 RDO salvo com atividade e avanço acumulado',len(logs)==1 and logs[0]['activityId']=='a_rdo' and logs[0]['progressTo']==65)
    pg.click('.applyLog');pg.wait_for_timeout(900)
    act=pg.evaluate(f"window.__fb.db.get('{O}activities/a_rdo')");lg=pg.evaluate("[...window.__fb.db.entries()].filter(([k])=>k.includes('/dailyLogs/')).map(([k,v])=>v)[0]")
    chk('D4 "Aplicar ao cronograma" leva a atividade de 20% para 65% e marca o RDO como aplicado',act['progress']==65 and act['status']=='Em andamento' and bool(lg.get('appliedAt')),str((act['progress'],act['status'])))
    chk('D5 não oferece aplicar de novo','applyLog' not in pg.content() and 'aplicado' in pg.inner_text('#content'))
    chk('D6 sem erros de JS (RDO)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ===== 4) perfis
def member(uid,role,wid):
    s=S();s[O+'members/'+uid]={'email':uid+'@t.com','name':uid,'role':role,'status':'active','workId':wid};s['users/'+uid]={'currentOrg':'org1','email':uid+'@t.com'}
    s[O+'staff/st_w1']=base(name='Mestre Salário',role='Mestre',workId='w1',salary=7777,status='Ativo');return s
def sess(uid,role,wid,port):
    return App(APP,auth={'uid':uid,'email':uid+'@t.com','emailVerified':True},seed=member(uid,role,wid),port=port)
with sess('gest','manager','',9020) as a:
    a.open();pg=a.page;pg.wait_for_timeout(600)
    works=pg.eval_on_selector_all('#filterWork option','e=>e.map(o=>o.textContent)')
    chk('P1 Gestor vê todas as obras',works==['Todas as obras','Obra A','Obra B'],str(works))
    pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(300)
    chk('P2 Gestor cria e edita obras, mas não exclui',pg.query_selector('#addRecord') is not None and pg.query_selector('.edit') is not None and pg.query_selector('.del') is None)
    pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(300)
    chk('P3 Gestor não vê salário','7.777' not in pg.inner_text('#content'))
    nav=pg.eval_on_selector_all('.navbtn','e=>e.map(x=>x.dataset.route)')
    chk('P4 Gestor não vê auditoria, lixeira nem manutenção',not({'audit','trash','maintenance'}&set(nav)),str(nav))
    chk('P5 sem erros de JS (gestor)',not IGN(a.errors),str(IGN(a.errors)[:2]))
with sess('fin','finance','',9021) as a:
    a.open();pg=a.page;pg.wait_for_timeout(600)
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(300)
    chk('P6 Financeiro cria e edita lançamentos',pg.query_selector('#addRecord') is not None and pg.query_selector('.edit') is not None and pg.query_selector('.del') is None)
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(300);chk('P7 Financeiro edita compras',pg.query_selector('.edit') is not None or pg.query_selector('#addRecord') is not None)
    pg.click('.navbtn[data-route="quality"]');pg.wait_for_timeout(300)
    chk('P8 Financeiro não altera qualidade (somente leitura)',pg.query_selector('#addRecord') is None and pg.query_selector('.edit') is None)
    pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(300)
    chk('P9 Financeiro vê salário e não altera pessoal','7.777' in pg.inner_text('#content').replace('\u00a0',' ') and pg.query_selector('.edit') is None)
    pg.click('.navbtn[data-route="activities"]');pg.wait_for_timeout(500)
    chk('P10 Financeiro lê o cronograma de todas as obras sem editar',pg.query_selector('.ganttEdit') is None and pg.query_selector('#addRecord') is None)
with sess('uobra','project_user','w1',9022) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(300)
    chk('P11 Usuário da obra continua sem ver salário','7.777' not in pg.inner_text('#content').replace('\u00a0',' '))
# ===== 5) membros: trocar perfil e convidar gestor
sm=S();sm[O+'members/uu']={'email':'uu@t.com','name':'Usuário U','role':'project_user','status':'active','workId':'w1'}
with App(APP,auth=OWNER,seed=sm,port=9023) as a:
    a.prompt_text='LINK';a.open();pg=a.page;pg.click('.navbtn[data-route="members"]');pg.wait_for_timeout(500)
    pg.select_option('.memberRole[data-id="uu"]','manager');pg.wait_for_timeout(900)
    m=pg.evaluate(f"window.__fb.db.get('{O}members/uu')")
    chk('M1 o administrador troca o perfil para Gestor (todas as obras, sem obra fixa) com auditoria',m['role']=='manager' and m['workId']=='' and pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='role-change')"))
    pg.click('#inviteBtn');pg.wait_for_selector('#inviteForm');pg.fill('#inviteForm [name=email]','fin@t.com');pg.select_option('#inviteForm [name=role]','finance')
    chk('M2 ao escolher Financeiro o campo Obra é desativado',pg.evaluate("document.querySelector('#inviteForm [name=workId]').disabled"))
    pg.click('#inviteForm button.primary');pg.wait_for_timeout(800)
    inv=pg.evaluate("[...window.__fb.db.entries()].filter(([k])=>k.startsWith('invites/')).map(([k,v])=>v)")
    chk('M3 convite do Financeiro sem obra',len(inv)==1 and inv[0]['role']=='finance' and inv[0]['workId']=='')
sj=S();sj['invites/COD-FIN']={'orgId':'org1','email':'fin2@t.com','role':'finance','workId':'','createdBy':'u1','expiresAt':{'$ts':4102444800}}
with App(APP,auth={'uid':'u9','email':'fin2@t.com','emailVerified':True},seed=sj,port=9024) as a:
    a.open('/index.html?invite=COD-FIN',wait=False);pg=a.page;pg.wait_for_timeout(2500)
    mm=pg.evaluate(f"window.__fb.db.get('{O}members/u9')")
    chk('M4 o convidado entra como Financeiro, sem obra fixa',bool(mm) and mm['role']=='finance' and mm['workId']=='',str(mm))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
