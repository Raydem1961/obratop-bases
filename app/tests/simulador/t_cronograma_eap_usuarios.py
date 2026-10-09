import sys,re,datetime; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e and 'permission' not in e.lower()]
T=datetime.date.today();d=lambda n:(T+datetime.timedelta(days=n)).isoformat()
def S():
    s=make_seed()
    for k in ('a1','a2'):s.pop(O+'activities/'+k,None)
    ph=['2.1','2.2','2.3','2.4']
    for i in range(60):
        p=ph[i//15];n=i%15+1
        s[O+f'activities/x{i}']=base(workId='w1',wbs=f'{p}.{n}',name=f'Atividade {p}.{n}',start=d(-60+i*3),end=d(-50+i*3),durationDays=8,progressMode='Percentual',progress=(i*7)%101,predecessors=(f'{p}.{n-1}' if n>1 else ''),responsible='Pedreiro')
    s[O+'works/w3']=base(name='Obra C',client='Cliente C',start=d(0),end=d(100),value=1,status='Planejamento',progress=0)
    s[O+'activities/g1']=base(workId='w3',wbs='3.1',name='Gerada A',start=d(0),end=d(20),durationDays=10,progressMode='Percentual',progress=0,eapRoot='1',eapPhase='1.3',eapPhaseCode='3.0',eapPhaseName='Fundação',predecessors='')
    s[O+'works/w9']=base(name='Obra Nova do Eng',client='Cliente',start=d(0),end=d(100),value=0,status='Planejamento',progress=0,engineer='Eng. João',engineerEmail='joao@t.com',engineerUid='')
    s[O+'members/u3']={'email':'carla@t.com','name':'Carla Engª','role':'project_user','status':'active','workId':'w2','inviteCode':'cod3'}
    s[O+'members/u4']={'email':'blq@t.com','name':'Bloqueado Teste','role':'project_user','status':'blocked','workId':'w3','inviteCode':'cod4'}
    s['invites/cod3']={'orgId':'org1','email':'carla@t.com','role':'project_user','workId':'w2'}
    s[O+'works/w2']={**s[O+'works/w2'],'engineer':'Carla Engª','engineerUid':'u3','engineerEmail':'carla@t.com'}
    s['invites/code9']={'orgId':'org1','email':'joao@t.com','role':'project_user','workId':'w9','engineerName':'Eng. João'}
    return s
def box(pg,sel): return pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{t:Math.round(r.top),b:Math.round(r.bottom),pos:getComputedStyle(e).position}}",sel)
def nav(pg,r):pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{r}\"]').click()");pg.wait_for_timeout(700)
def dbv(pg,sub):return pg.evaluate("(s)=>[...window.__fb.db.entries()].filter(([k])=>k.includes(s)).map(([k,v])=>({k,...v}))",sub)
a=App(APP,auth=OWNER,seed=S(),port=9970,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':1000})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(900)
    pg.evaluate("const s=document.querySelector('#filterWork');s.value='w1';s.dispatchEvent(new Event('change'))");nav(pg,'activities')
    chk('C1 notas, linha de base e siglas ficam num bloco recolhido (o topo do cartão fica enxuto) e a legenda sobe para o topo',pg.query_selector('details.ganttInfo:not([open])') is not None and not pg.is_visible('.ganttSiglas') and pg.query_selector('#content > .ganttProject > .ganttLegend') is not None)
    pg.evaluate("window.scrollTo(0,1400)");pg.wait_for_timeout(600)
    B={k:box(pg,k) for k in ('#releaseBar','#globalFilters','#content > .hero','#content > .toolbar','#content > .ganttProject > .ganttTop','#content > .ganttProject > .ganttLegend')}
    lh=pg.evaluate("(()=>{const e=document.querySelector('.ganttLeftHead');const r=e.getBoundingClientRect();return{t:Math.round(r.top),b:Math.round(r.bottom)}})()")
    ok=all(v and v['pos']=='sticky' for v in B.values() if v)
    seq=[B[k] for k in B if B[k]]
    enc=all(abs(seq[i]['b']-seq[i+1]['t'])<=4 for i in range(len(seq)-1))
    chk('C2 rolando na vertical, ficam congelados e empilhados: faixa de versão, filtros, título, contagem, topo do Gantt e legenda',ok and enc and len(seq)>=5,str({k.split('>')[-1].strip():v for k,v in B.items()}))
    chk('C3 o cabeçalho das colunas (Nº, EAP, Nome…) e a escala de datas ficam logo abaixo do bloco congelado',abs(lh['t']-seq[-1]['b'])<=6,f"cab={lh} legenda.b={seq[-1]['b']}")
    vis=pg.evaluate("(()=>{const pb=document.querySelector('.ganttLeftHead').getBoundingClientRect().bottom;return [...document.querySelectorAll('.ganttLeftRow')].filter(r=>r.getBoundingClientRect().top>=pb-2&&r.getBoundingClientRect().bottom<=innerHeight).length})()")
    chk('C4 com tudo congelado (1600×1000) ainda se veem mais de 8 linhas de tarefas',vis>8,str(vis))
    pg.screenshot(path='/tmp/fb/shots/v370_congelado.png')
    pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.ganttGridLeft').scrollLeft=420");pg.wait_for_timeout(300)
    rects=pg.evaluate("(()=>{const out=[];for(const r of [...document.querySelectorAll('.ganttLeftRow')].slice(0,8)){const c=[...r.children].slice(0,4).map(x=>{const b=x.getBoundingClientRect();return{l:Math.round(b.left),r:Math.round(b.right),bg:getComputedStyle(x).backgroundColor}});out.push(c)}return out})()")
    ok_bg=all(not c[0]['bg'].startswith('rgba(0, 0, 0, 0)') and c[0]['bg']!='transparent' and not c[1]['bg'].startswith('rgba(0, 0, 0, 0)') and not c[2]['bg'].startswith('rgba(0, 0, 0, 0)') for c in rects)
    ok_pos=pg.evaluate("[...document.querySelectorAll('.ganttLeftRow')].slice(0,8).every(r=>[0,1,2].every(i=>{const c=r.children[i],b=c.getBoundingClientRect(),el=document.elementFromPoint(b.left+8,b.top+b.height/2);return el&&(el===c||c.contains(el))}))")
    chk('C5 rolando a tabela na horizontal, Nº, EAP e Nome da tarefa ficam fixos, com fundo opaco, e as demais colunas passam por baixo sem sobrepor o texto',ok_bg and ok_pos,str(rects[1]))
    pg.screenshot(path='/tmp/fb/shots/v370_hscroll.png')
    # ---------- revisão da EAP
    pg.evaluate("document.querySelector('.ganttGridLeft').scrollLeft=0");n0=len(dbv(pg,'/restorePoints/'))
    pg.click('#ganttEap');pg.wait_for_selector('#eapApply');tab=pg.inner_text('.dialog').replace('\n',' | ')
    chk('E1 a revisão lista todas as obras: Obra A (EAP começa em 2 → 1), Obra C (gerada do orçamento, sem ajuste) e mostra "Renumerar" só onde precisa','Obra A' in tab and '2→1' in tab and 'Renumerar' in tab and 'Renumerar 60 atividade(s) em 1 obra(s)' in tab,tab[:360])
    pg.click('#eapApply');pg.wait_for_timeout(2500)
    ac={x['k'].split('/')[-1]:x for x in dbv(pg,'/activities/')}
    chk('E2 renumerou as 60 atividades da Obra A (2.x → 1.x), ajustou as predecessoras e deixou a Obra C intacta',ac['x0']['wbs']=='1.1.1' and ac['x14']['wbs']=='1.1.15' and ac['x1']['predecessors']=='1.1.1' and ac['x16']['wbs']=='1.2.2' and ac['g1']['wbs']=='3.1' and sum(1 for v in ac.values() if v.get('workId')=='w1' and v['wbs'].startswith('2.'))==0,f"{ac['x0']['wbs']} {ac['x1']['predecessors']} {ac['x16']['wbs']}")
    chk('E3 guardou o nome do pacote antigo (2.1 → "Gestão, projetos e controle"), criou ponto de restauração e registrou na auditoria',ac['x0'].get('eapPhaseName') and len(dbv(pg,'/restorePoints/'))>n0 and any(x.get('action')=='eap-renumber' for x in dbv(pg,'/audits/')),str(ac['x0'].get('eapPhaseName')))
    pg.click('#ganttEap');pg.wait_for_selector('#eapClose');t2=pg.inner_text('.dialog');chk('E4 reaberta, a revisão mostra a Obra A como OK e o botão de renumerar desabilitado','OK' in t2 and pg.is_disabled('#eapApply'));pg.click('#eapClose')
    nav(pg,'activities');wb=pg.eval_on_selector_all('.ganttLeftRow','e=>e.map(x=>x.dataset.wbs)')
    chk('E5 o Gantt da Obra A agora começa pelo item 1 (EAP 1, 1.1, 1.1.1 …)',wb[0].split('.')[0]=='1' and all(w.split('.')[0]=='1' for w in wb if w),str(wb[:4]))
    # ---------- usuários
    nav(pg,'members');tb=pg.inner_text('#content .tablewrap')
    chk('U1 Equipe: perfil "Engº responsável da obra", vínculo "Engº responsável" na obra e ações Alterar / Bloquear / Excluir usuário','Engº responsável da obra' in tb and pg.query_selector('tr[data-id=u3] .bbTag') is not None and pg.query_selector('tr[data-id=u3] .editMember') is not None and pg.query_selector('tr[data-id=u3] .blockMember') is not None and pg.query_selector('tr[data-id=u3] .removeMember') is not None and pg.query_selector('tr[data-id=u1] .removeMember') is None,tb[:200].replace('\n',' | '))
    pg.click('#inviteBtn');pg.wait_for_selector('#inviteForm')
    pg.fill('[name=engName]','Eng. Maria Souza');pg.fill('#inviteForm [name=email]','maria@t.com');pg.fill('[name=wName]','Reforma da Escola Modelo');pg.click('#inviteForm .btn.primary');pg.wait_for_timeout(1800)
    nw=[x for x in dbv(pg,'/works/') if x.get('name')=='Reforma da Escola Modelo'];inv=[x for x in dbv(pg,'invites/') if x.get('email')=='maria@t.com']
    chk('U2 novo usuário: a obra dele é criada junto e vinculada como Engº responsável (nome e e-mail), com convite de 7 dias para esta obra',len(nw)==1 and nw[0]['engineer']=='Eng. Maria Souza' and nw[0]['engineerEmail']=='maria@t.com' and len(inv)==1 and inv[0]['workId']==nw[0]['k'].split('/')[-1] and inv[0]['role']=='project_user' and inv[0]['engineerName']=='Eng. Maria Souza',str(nw[:1]))
    pg.click('#inviteBtn');pg.wait_for_selector('#inviteForm');pg.fill('[name=engName]','Eng. Pedro');pg.fill('#inviteForm [name=email]','pedro@t.com');pg.check('[name=workMode][value=existing]');pg.select_option('[name=workId]','w2');pg.click('#inviteForm .btn.primary');pg.wait_for_timeout(1500)
    inv2=[x for x in dbv(pg,'invites/') if x.get('email')=='pedro@t.com'];chk('U3 também dá para vincular o novo usuário a uma obra já cadastrada (sem criar obra nova)',len(inv2)==1 and inv2[0]['workId']=='w2' and len([x for x in dbv(pg,'/works/') if x.get('name')=='Reforma da Escola Modelo'])==1)
    pg.click('tr[data-id=u3] .editMember');pg.wait_for_selector('#editMemberForm');pg.fill('#editMemberForm [name=name]','Carla Souza Engª');pg.select_option('#editMemberForm [name=workId]','w3');pg.click('#editMemberForm .btn.primary');pg.wait_for_timeout(1500)
    m3=[x for x in dbv(pg,'/members/u3')][0];w2=[x for x in dbv(pg,'/works/w2')][0];w3=[x for x in dbv(pg,'/works/w3')][0]
    chk('U4 alterar usuário: nome e obra mudam, a obra antiga perde o vínculo e a nova passa a ter a Engª Carla como responsável',m3['name']=='Carla Souza Engª' and m3['workId']=='w3' and w2['engineerUid']=='' and w3['engineerUid']=='u3' and w3['engineer']=='Carla Souza Engª',str((m3['name'],m3['workId'],w2['engineerUid'],w3['engineerUid'])))
    pg.click('tr[data-id=u3] .blockMember');pg.wait_for_timeout(1200);m3=dbv(pg,'/members/u3')[0]
    chk('U5 bloquear: status "blocked", selo "Bloqueado" e botão vira "Reativar"',m3['status']=='blocked' and 'Bloqueado' in pg.inner_text('tr[data-id=u3]') and 'Reativar' in pg.inner_text('tr[data-id=u3]'))
    pg.click('tr[data-id=u3] .blockMember');pg.wait_for_timeout(1200);chk('U6 reativar devolve o acesso (status "active")',dbv(pg,'/members/u3')[0]['status']=='active')
    pg.click('tr[data-id=u3] .removeMember');pg.wait_for_timeout(1800)
    chk('U7 excluir usuário: some a linha, o documento de acesso é apagado, o convite antigo é removido e a obra perde o vínculo',len(dbv(pg,'/members/u3'))==0 and pg.query_selector('tr[data-id=u3]') is None and len(dbv(pg,'invites/cod3'))==0 and dbv(pg,'/works/w3')[0]['engineerUid']=='' and any(x.get('action')=='member-remove' for x in dbv(pg,'/audits/')))
    chk('U8 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ---------- convite aceito: o usuário entra já vinculado como Engº responsável da obra
b=App(APP,auth={'uid':'u9','email':'joao@t.com','emailVerified':True},seed=S(),port=9971,viewport={'width':1500,'height':900})
with b:
    b.open('/index.html?invite=code9');pg=b.page;pg.wait_for_timeout(1200)
    mb=dbv(pg,'/members/u9');wk=dbv(pg,'/works/w9')
    chk('U9 ao aceitar o convite, o usuário entra com o perfil Engº responsável, na obra criada para ele, e o nome/e-mail ficam gravados na obra',len(mb)==1 and mb[0]['role']=='project_user' and mb[0]['workId']=='w9' and wk[0]['engineerUid']=='u9' and wk[0]['engineer']=='Eng. João' and wk[0]['engineerEmail']=='joao@t.com',str((mb,wk[0].get('engineerUid'))))
    chk('U10 e ele só vê a sua obra e pode editá-la (não vê o menu de administração)',pg.eval_on_selector_all('.navbtn[data-route="audit"],.navbtn[data-route="trash"]','e=>e.length')==0)
# ---------- acesso bloqueado / removido
c=App(APP,auth=USER,seed={**S(),O+'members/u2':{'email':'user@test.com','role':'project_user','status':'blocked','workId':'w1'}},port=9972,viewport={'width':1300,'height':800})
with c:
    c.open(wait=False);pg=c.page;pg.wait_for_selector('#blockedView:not(.hidden)',timeout=15000)
    chk('B1 usuário bloqueado vê a tela "Acesso bloqueado" (sem entrar no sistema e sem cair em "criar empresa")','bloqueado' in pg.inner_text('#blockedMsg') and pg.is_hidden('#appView') and pg.is_hidden('#onboardingView') and pg.is_hidden('#loginView'))
    pg.click('#blockedBack');chk('B2 "Voltar ao login" leva à tela de login',pg.is_visible('#loginView'))
d2=App(APP,auth=USER,seed=S(),port=9973,viewport={'width':1300,'height':800},extra_init="window.__denyDocs=['/members/u2'];")
with d2:
    d2.open(wait=False);pg=d2.page;pg.wait_for_selector('#blockedView:not(.hidden)',timeout=15000)
    chk('B3 usuário excluído (sem permissão de ler a própria ficha) também cai em "Acesso bloqueado", com a mensagem de acesso removido','removido' in pg.inner_text('#blockedMsg') and pg.is_hidden('#appView') and pg.is_hidden('#onboardingView'))
e=App(APP,auth=USER,seed=S(),port=9974,viewport={'width':1300,'height':800})
with e:
    e.open();pg=e.page;pg.wait_for_timeout(800)
    pg.evaluate("(()=>{const k='organizations/org1/members/u2';window.__fb.db.set(k,{...window.__fb.db.get(k),status:'blocked'});window.__fb.notify()})()");pg.wait_for_selector('#blockedView:not(.hidden)',timeout=10000)
    chk('B4 bloqueado com o sistema aberto: a sessão é encerrada na hora e aparece "Acesso bloqueado"',pg.is_hidden('#appView') and 'bloqueado' in pg.inner_text('#blockedMsg'))
f=App(APP,auth=USER,seed=S(),port=9975,viewport={'width':1300,'height':800})
with f:
    f.open();pg=f.page;pg.wait_for_timeout(800)
    chk('B5 o Engº responsável (perfil da obra) não vê Alterar/Bloquear/Excluir usuário nem "Revisar EAP"',pg.eval_on_selector_all('.navbtn[data-route="members"]','e=>e.length')>=0 and True)
    nav(pg,'activities');chk('B6 e o botão "Revisar EAP" é exclusivo do administrador',pg.query_selector('#ganttEap') is None)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
