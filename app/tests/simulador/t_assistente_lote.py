import sys,re,datetime; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/'
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
def S():
    s=make_seed()
    for i in range(5): s[O+f'finance/fx{i}']=base(workId='w1',date=d(-10-i),dueDate=d(5+i),description=f'Lançamento lote {i}',type='Despesa',category='Teste',value=100+i,status='Pendente')
    s[O+'finance/fy0']=base(workId='w2',date=d(-3),dueDate=d(9),description='Lançamento da Obra B',type='Despesa',category='Teste',value=50,status='Pendente')
    s[O+'contracts/ck0']=base(workId='w1',number='CT-LOTE-1',party='Fornecedor X',object='Teste de lote',start=d(-30),end=d(60),value=1000,status='Ativo')
    return s
def db(pg,path): return pg.evaluate(f"window.__fb.db.get('{path}')")
def docs(pg,col): return pg.evaluate(f"[...window.__fb.db.entries()].filter(([k])=>k.startsWith('{O}{col}/')&&k.split('/').length===4).map(([k,v])=>({{id:k.split('/')[3],...v}}))")
# ================= ASSISTENTE DE NOVA OBRA
a=App(APP,auth=OWNER,seed=S(),port=9200,viewport={'width':1500,'height':950})
with a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(500)
    chk('W1 a tela Obras mostra o botão "Assistente de nova obra"',pg.query_selector('#wizardBtn') is not None)
    pg.click('#wizardBtn');pg.wait_for_selector('#wzName')
    pg.click('#wzNext');chk('W2 nome vazio é recusado com aviso','nome da obra' in pg.inner_text('#wzErr'))
    pg.fill('#wzName','obra a');pg.fill('#wzClient','Cliente X');pg.click('#wzNext');chk('W3 nome repetido (ignora maiúsculas e acentos) é recusado','Já existe' in pg.inner_text('#wzErr'))
    pg.fill('#wzName','UBS Teste do Assistente');pg.fill('#wzStart','2026-11-02');pg.fill('#wzEnd','2026-11-06');pg.click('#wzNext');chk('W4 prazo curto demais é recusado','10 dias úteis' in pg.inner_text('#wzErr'))
    pg.fill('#wzEnd','2027-06-30');pg.fill('#wzAddress','Rua A, 100');pg.click('#wzNext');pg.wait_for_selector('input[name=wzFam]')
    fams=pg.eval_on_selector_all('input[name=wzFam]','e=>e.map(x=>x.value)')
    chk('W5 a etapa de modelo oferece os 4 modelos e "Em branco"',fams==['BUILD','PAV','REDE','CONT','BLANK'],str(fams))
    pg.fill('#wzBase','300');pg.fill('#wzBdi','24');pg.click('#wzNext');pg.wait_for_selector('.wzTask')
    n_total=pg.eval_on_selector_all('.wzTask','e=>e.length')
    pg.click('.wzPhase[data-p="1.8"]');pg.wait_for_timeout(150);cnt=pg.inner_text('#wzCount')
    chk('W6 a etapa de escopo lista as atividades e desmarcar uma fase atualiza a contagem',n_total==61 and re.search(r'^\d+ de 61',cnt) and not cnt.startswith('61'),cnt)
    pg.click('#wzNext');pg.wait_for_selector('#wzCreate');rev=pg.inner_text('.wzBody').replace('\u00a0',' ')
    chk('W7 a revisão mostra atividades, período, orçamento com BDI, valor sugerido e a tabela por fase','atividades' in rev and 'Orçamento com BDI' in rev and 'Valor contratado sugerido' in rev and '1.2 Serviços preliminares' in rev and '1.8 ' not in rev,rev[:130].replace('\n',' '))
    pg.click('#wzCreate');pg.wait_for_selector('.ganttMeta',timeout=15000);pg.wait_for_timeout(1200)
    works=[w for w in docs(pg,'works') if w.get('name')=='UBS Teste do Assistente'];w=works[0] if works else {}
    acts=[x for x in docs(pg,'activities') if x['workId']==w.get('id')];buds=[x for x in docs(pg,'budgets') if x['workId']==w.get('id')]
    chk('W8 obra criada em Planejamento, com modelo registrado e valor em milhares',len(works)==1 and w['status']=='Planejamento' and w['templateFamily']=='BUILD' and w['value']>0 and w['value']%1000==0,str((w.get('status'),w.get('value'))))
    chk('W9 um item de orçamento para cada atividade e nenhuma da fase 1.8 (desmarcada)',len(acts)==len(buds)>0 and not any(x['wbs'].startswith('1.8.') for x in acts) and n_total>len(acts),f'{len(acts)} atividades, {len(buds)} itens')
    bid={b['id']:b for b in buds}
    chk('W10 toda atividade está ligada ao seu item de orçamento (mesma obra e mesmo nome)',all(x.get('budgetId') in bid and bid[x['budgetId']]['description']==x['name'] for x in acts))
    wb=[x['wbs'] for x in acts];ids=set(wb)
    chk('W11 EAP única e predecessoras existentes',len(ids)==len(wb) and all(p in ids for x in acts for p in x['predecessors'].split(',') if p))
    tot=sum(b['qty']*b['unitValue']*(1+b['bdi']/100) for b in buds)
    chk('W12 o valor da obra cobre o orçamento com BDI (arredondado para cima ao milhar)',w['value']>=tot-1 and w['value']-tot<1000,f"orçamento {tot:,.0f} valor {w['value']:,}")
    chk('W13 linha de base R1 gravada com todas as atividades',w['baseline']['revision']==1 and len(w['baseline']['items'])==len(acts))
    meta=pg.inner_text('.ganttMeta');chk('W14 o app abre o cronograma da nova obra já ponderado pelo custo',f'pelo custo do orçamento ({len(acts)}/{len(acts)}' in meta and 'R1' in meta,meta[:120])
    chk('W15 o cronograma respeita o prazo pedido (termina até 30/06/2027)',w['end']<='2027-06-30' and w['start']>='2026-11-02',f"{w['start']} a {w['end']}")
    chk('W16 a auditoria registra a criação pelo assistente',pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='create'&&v.module==='works'&&v.changes&&v.changes.assistente===true)") or pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='create'&&JSON.stringify(v).includes('assistente'))"))
    # em branco
    pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(400);pg.click('#wizardBtn');pg.wait_for_selector('#wzName')
    pg.fill('#wzName','Obra em Branco Teste');pg.fill('#wzClient','Cli');pg.fill('#wzStart','2026-11-02');pg.fill('#wzEnd','2027-02-26');pg.click('#wzNext')
    pg.click('label.wzFamily:has(input[value=BLANK])');pg.wait_for_timeout(200);pg.click('#wzNext');pg.wait_for_selector('#wzCreate');pg.click('#wzCreate');pg.wait_for_timeout(1500)
    wb2=[x for x in docs(pg,'works') if x['name']=='Obra em Branco Teste']
    chk('W17 modelo "Em branco" cria só a obra, sem orçamento nem cronograma',len(wb2)==1 and not [x for x in docs(pg,'activities') if x['workId']==wb2[0]['id']] and not [x for x in docs(pg,'budgets') if x['workId']==wb2[0]['id']] and wb2[0]['value']==0)
    # cancelar não grava
    n0=len(docs(pg,'works'));pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(300);pg.click('#wizardBtn');pg.wait_for_selector('#wzName');pg.fill('#wzName','Não deve existir');pg.click('#wzCancel');pg.wait_for_timeout(300)
    chk('W18 cancelar o assistente não grava nada',len(docs(pg,'works'))==n0)
    chk('W19 sem erros de JavaScript (assistente)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# falha no meio da criação
a=App(APP,auth=OWNER,seed=S(),port=9201)
with a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(400);pg.click('#wizardBtn');pg.wait_for_selector('#wzName')
    pg.fill('#wzName','Falha Simulada');pg.fill('#wzClient','C');pg.fill('#wzStart','2026-11-02');pg.fill('#wzEnd','2027-05-28');pg.click('#wzNext');pg.click('#wzNext');pg.click('#wzNext')
    pg.wait_for_selector('#wzCreate');pg.evaluate("window.__fb.deny=(op,path)=>String(path||'').includes('/budgets/')?'negado':null");n=len(a.dialogs);pg.click('#wzCreate');pg.wait_for_timeout(2500)
    m=[x for _,x in a.dialogs[n:]]
    chk('W20 se a gravação falhar no meio, o app avisa a etapa e que a obra já foi criada',any('falhou na etapa' in x and 'orçamento e cronograma' in x for x in m),(m or [''])[0][:100])
# permissões do assistente
def mem(uid,role,wid):
    s=S();s[O+'members/'+uid]={'email':uid+'@t.com','name':uid,'role':role,'status':'active','workId':wid};s['users/'+uid]={'currentOrg':'org1','email':uid+'@t.com'};return s
for uid,role,wid,esperado in (('uobra','project_user','w1',False),('gest','manager','',True),('cons','viewer','w1',False)):
    with App(APP,auth={'uid':uid,'email':uid+'@t.com','emailVerified':True},seed=mem(uid,role,wid),port=9202+len(res)%7) as a2:
        a2.open();p2=a2.page;p2.click('.navbtn[data-route="works"]');p2.wait_for_timeout(400)
        chk(f'W21 perfil {role}: botão do assistente {"visível" if esperado else "oculto"}',(p2.query_selector('#wizardBtn') is not None)==esperado)
# ================= EDIÇÃO EM LOTE
a=App(APP,auth=OWNER,seed=S(),port=9210,viewport={'width':1500,'height':950})
with a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(600)
    chk('B1 o financeiro mostra caixas de seleção e a barra de lote fica oculta até selecionar',pg.query_selector('#bulkAll') is not None and pg.evaluate("document.querySelector('#bulkBar').hidden"))
    pg.locator('.bulkChk').nth(0).check();pg.locator('.bulkChk').nth(1).check();pg.locator('.bulkChk').nth(2).check();pg.wait_for_timeout(200)
    chk('B2 ao selecionar 3 linhas a barra aparece com a contagem','3' in pg.inner_text('#bulkCount') and not pg.evaluate("document.querySelector('#bulkBar').hidden"))
    ids=pg.evaluate("[...document.querySelectorAll('.bulkChk:checked')].map(c=>c.dataset.id)")
    pg.select_option('#bulkField','status');pg.select_option('#bulkValue','Pago');pg.click('#bulkApply');pg.wait_for_timeout(1200)
    st={x['id']:x['status'] for x in docs(pg,'finance')}
    chk('B3 "Aplicar" muda o status só das 3 linhas selecionadas',all(st[i]=='Pago' for i in ids) and sum(1 for v in st.values() if v=='Pago')>=3 and st.get('fy0')=='Pendente',str({i:st[i] for i in ids}))
    chk('B4 a auditoria registra uma ação em lote com campo, valor e quantidade',pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='bulk-update'&&JSON.stringify(v).includes('Pago')&&JSON.stringify(v).includes('\"quantidade\":3'))"))
    chk('B5 a seleção é limpa depois de aplicar',pg.evaluate("document.querySelector('#bulkBar').hidden"))
    pg.check('#bulkAll');pg.wait_for_timeout(200);todos=pg.evaluate("[document.querySelectorAll('.bulkChk:checked').length,document.querySelectorAll('.bulkChk:not(:disabled)').length]")
    chk('B6 "Selecionar todos" marca todas as linhas editáveis',todos[0]==todos[1] and todos[0]>=6,str(todos))
    pg.select_option('#filterWork','');pg.wait_for_timeout(500)
    chk('B7 a seleção sobrevive a um redesenho da tela',pg.evaluate("document.querySelectorAll('.bulkChk:checked').length")>=6)
    pg.click('#bulkClear')
    # exclusão em lote
    pg.locator('.bulkChk').nth(0).check();pg.locator('.bulkChk').nth(1).check();ids2=pg.evaluate("[...document.querySelectorAll('.bulkChk:checked')].map(c=>c.dataset.id)")
    pg.click('#bulkDelete');pg.wait_for_timeout(1200)
    dl={x['id']:x.get('deleted') for x in docs(pg,'finance')}
    chk('B8 "Mover para a lixeira" exclui só as selecionadas (reversível) e audita',all(dl[i] for i in ids2) and sum(1 for v in dl.values() if v)==2 and pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='bulk-delete')"))
    # conflito de datas
    pg.click('.navbtn[data-route="contracts"]');pg.wait_for_timeout(500);pg.locator('.bulkChk').nth(0).check()
    pg.select_option('#bulkField','end');pg.fill('#bulkValue','2020-01-01');n=len(a.dialogs);pg.click('#bulkApply');pg.wait_for_timeout(500)
    chk('B9 data que deixaria início depois do término é recusada sem gravar',any('início depois do término' in m for _,m in a.dialogs[n:]) and db(pg,O+'contracts/ck0')['end']!='2020-01-01')
    n=len(a.dialogs);pg.select_option('#bulkField','end');pg.click('#bulkApply');pg.wait_for_timeout(300)
    chk('B10 valor vazio é recusado',any('data válida' in m or 'valor válido' in m for _,m in a.dialogs[n:]))
    pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(500);pg.locator('.bulkChk').nth(0).check()
    chk('B11 em Obras a edição em lote existe, mas não oferece excluir',pg.query_selector('#bulkApply') is not None and pg.query_selector('#bulkDelete') is None)
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(500)
    chk('B12 Compras (tabela própria) não recebe caixas de seleção',pg.query_selector('.bulkChk') is None and pg.query_selector('#bulkBar') is None)
    chk('B13 sem erros de JavaScript (lote)',not IGN(a.errors),str(IGN(a.errors)[:2]))
with App(APP,auth=USER,seed=S(),port=9211) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(600)
    chk('B14 usuário da obra seleciona e altera a própria obra, sem botão de excluir',pg.query_selector('.bulkChk:not(:disabled)') is not None and pg.query_selector('#bulkDelete') is None and 'Lançamento da Obra B' not in pg.inner_text('#content'))
    pg.locator('.bulkChk').nth(0).check();pg.select_option('#bulkField','status');pg.select_option('#bulkValue','Previsto');pg.click('#bulkApply');pg.wait_for_timeout(900)
    chk('B15 e a alteração é gravada',sum(1 for x in docs(pg,'finance') if x['status']=='Previsto')>=1)
sv=mem('cons','viewer','w1')
with App(APP,auth={'uid':'cons','email':'cons@t.com','emailVerified':True},seed=sv,port=9212) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(600)
    chk('B16 perfil Consulta não vê caixas de seleção nem barra de lote',pg.query_selector('.bulkChk') is None and pg.query_selector('#bulkBar') is None)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
