import sys,re,json,copy,time; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/'
res=[]
def chk(n,c,e=''):
    res.append(c);print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
def seed_two_works():
    s=make_seed()
    s[O+'finance/f_w2']=base(workId='w2',date=d(-3),dueDate=d(10),description='Despesa SOMENTE da Obra B',type='Despesa',category='X',value=777,status='Pendente')
    s[O+'staff/st_w2']=base(name='Pessoa da Obra B',role='Mestre',workId='w2',salary=9999,status='Ativo')
    s[O+'orders/o_w2']=base(workId='w2',date=d(-2),description='Pedido SOMENTE da Obra B',value=500,status='Aprovado',supplierId='s1')
    s[O+'progressSnapshots/w2_x']=base(workId='w2',date=d(-1),physicalPlanned=10,physicalActual=9,budget=1,paid=1)
    return s
# ===== usuário de obra: só a sua obra
with App(APP,auth=USER,seed=seed_two_works(),port=8970) as a:
    a.open();pg=a.page
    works=pg.eval_on_selector_all('#filterWork option','e=>e.map(o=>o.textContent)')
    chk('B1 usuário de obra vê no filtro só a própria obra',works==['Todas as obras','Obra A'],str(works))
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(400)
    chk('B2 financeiro não traz lançamentos de outra obra','SOMENTE da Obra B' not in pg.inner_text('#content') and 'NF cimento' in pg.inner_text('#content'))
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(300)
    chk('B3 compras não trazem pedido de outra obra','SOMENTE da Obra B' not in pg.inner_text('#content'))
    pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(300)
    chk('B4 pessoal de outra obra (e o salário 9999) não é baixado','Pessoa da Obra B' not in pg.inner_text('#content') and '9.999' not in pg.inner_text('#content'))
    chk('B5 sem erros de JS (usuário de obra)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ===== administrador continua vendo tudo
with App(APP,auth=OWNER,seed=seed_two_works(),port=8971) as a:
    a.open();pg=a.page
    works=pg.eval_on_selector_all('#filterWork option','e=>e.map(o=>o.textContent)')
    chk('B6 administrador vê as duas obras',works==['Todas as obras','Obra A','Obra B'],str(works))
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(400)
    chk('B7 administrador vê lançamentos de todas as obras','SOMENTE da Obra B' in pg.inner_text('#content'))
# ===== perfil Consulta (somente leitura)
sv=seed_two_works();sv[O+'members/u3']={'email':'consulta@test.com','role':'viewer','status':'active','workId':'w1'};sv['users/u3']={'currentOrg':'org1','email':'consulta@test.com'}
with App(APP,auth={'uid':'u3','email':'consulta@test.com','emailVerified':True},seed=sv,port=8972) as a:
    a.open();pg=a.page
    chk('V1 perfil exibido como Consulta','Consulta' in pg.inner_text('.user') or 'Consulta' in pg.inner_text('header'),pg.inner_text('.user')[:60].replace('\n',' ') if pg.query_selector('.user') else '')
    for route in ('finance','measurements','orders','staff','contracts'):
        pg.click(f'.navbtn[data-route="{route}"]');pg.wait_for_timeout(250)
        no=(pg.query_selector('#addRecord') is None) and (pg.query_selector('.edit') is None) and (pg.query_selector('.genFin') is None) and (pg.query_selector('.receiveStock') is None)
        if not no: chk(f'V2 [{route}] sem botões de criar/editar',False);break
    else: chk('V2 consulta não vê botões de criar, editar, gerar lançamento ou receber estoque',True)
    pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(250)
    chk('V3 consulta não vê salário','R$ 3.000' not in pg.inner_text('#content').replace('\u00a0',' '))
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(250)
    chk('V4 consulta lê os dados da própria obra e não os da outra','NF cimento' in pg.inner_text('#content') and 'SOMENTE da Obra B' not in pg.inner_text('#content'))
    chk('V5 sem erros de JS (consulta)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ===== convite com perfil Consulta
with App(APP,auth=OWNER,seed=make_seed(),port=8973) as a:
    a.prompt_text='LINK';a.open();pg=a.page
    pg.click('.navbtn[data-route="members"]');pg.wait_for_timeout(400);pg.click('#inviteBtn')
    pg.wait_for_selector('#inviteForm');opts=pg.eval_on_selector_all('#inviteForm [name=role] option','e=>e.map(o=>o.value)')
    pg.fill('#inviteForm [name=email]','cliente@fiscal.com');pg.select_option('#inviteForm [name=role]','viewer');pg.select_option('#inviteForm [name=workId]','w1');pg.click('#inviteForm button.primary');pg.wait_for_timeout(700)
    inv=pg.evaluate("[...window.__fb.db.entries()].filter(([k])=>k.startsWith('invites/')).map(([k,v])=>v)")
    chk('I1 convite gerado com perfil Consulta',opts==['project_user','viewer','manager','finance'] and len(inv)==1 and inv[0]['role']=='viewer',str(inv[0]['role'] if inv else None))
# ===== aceitar convite Consulta
sj=make_seed();sj['invites/CODE-VIEW']={'orgId':'org1','email':'cliente@fiscal.com','role':'viewer','workId':'w1','createdBy':'u1','expiresAt':{'$ts':4102444800}}
with App(APP,auth={'uid':'u7','email':'cliente@fiscal.com','emailVerified':True},seed=sj,port=8974) as a:
    a.open('/index.html?invite=CODE-VIEW',wait=False);pg=a.page;pg.wait_for_timeout(2500)
    m=pg.evaluate("window.__fb.db.get('organizations/org1/members/u7')")
    chk('I2 ao aceitar o convite o usuário entra como Consulta, vinculado à obra',bool(m) and m['role']=='viewer' and m['workId']=='w1',str(m))
# ===== App Check opcional
import shutil,os
shutil.rmtree('/tmp/fb/app12k',ignore_errors=True);shutil.copytree(APP,'/tmp/fb/app12k')
cf=open('/tmp/fb/app12k/firebase-config.js').read().replace("appCheckSiteKey = ''","appCheckSiteKey = 'CHAVE-TESTE'");open('/tmp/fb/app12k/firebase-config.js','w').write(cf)
with App('/tmp/fb/app12k',auth=OWNER,seed=make_seed(),port=8975) as a:
    a.open();pg=a.page
    chk('A1 com chave configurada, o App Check é iniciado (reCAPTCHA v3, renovação automática)',pg.evaluate("window.__appcheck&&window.__appcheck.key==='CHAVE-TESTE'&&window.__appcheck.auto===true"))
with App(APP,auth=OWNER,seed=make_seed(),port=8976) as a:
    a.open();pg=a.page
    chk('A2 sem chave, o App Check não é iniciado e o app funciona normalmente',pg.evaluate("window.__appcheck===undefined"))
# ===== restauração: ponto semanal automático + teste
with App(APP,auth=OWNER,seed=make_seed(),port=8977) as a:
    a.open();pg=a.page
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(500)
    chk('R0 alerta "Restauração nunca testada" antes da primeira rotina','Restauração nunca testada' in pg.inner_text('#content'))
    t0=time.time()
    while time.time()-t0<40:
        pg.wait_for_timeout(1000)
        rps=pg.evaluate("[...window.__fb.db.entries()].filter(([k,v])=>/organizations\\/org1\\/restorePoints\\/[^/]+$/.test(k)).map(([k,v])=>[v.category,v.name])")
        if rps: break
    chk('R1 ponto de restauração automático semanal criado após a sincronização',len(rps)==1 and rps[0][0]=='Automático semanal',str(rps))
    pg.wait_for_timeout(2500)
    org=pg.evaluate("window.__fb.db.get('organizations/org1')")
    t=org.get('lastRestoreTest',{})
    chk('R2 o ponto criado é testado automaticamente (leitura e checksum)',t.get('ok') is True and t.get('records',0)>10,str({k:t.get(k) for k in('ok','records')}))
    pg.click('.navbtn[data-route="maintenance"]');pg.wait_for_timeout(700)
    mt=pg.inner_text('#content')
    chk('R3 Integridade e manutenção mostra "Restauração testada" e a retenção','Restauração testada' in mt and 'Retenção' in mt and 'um ponto de restauração automático por semana' in mt)
    at0=pg.evaluate("window.__fb.db.get('organizations/org1').lastRestoreTest.at");pg.wait_for_timeout(1200);pg.click('#restoreTestBtn');pg.wait_for_timeout(3000)
    t2=pg.evaluate("window.__fb.db.get('organizations/org1').lastRestoreTest")
    chk('R4 botão "Testar restauração agora" funciona e registra novo teste',bool(t2['ok']) and t2['at']>at0 and not any('FALHOU' in m for _,m in a.dialogs))
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(500)
    chk('R5 depois do teste o alerta de restauração some','Restauração nunca testada' not in pg.inner_text('#content'))
    chk('R6 sem erros de JS (restauração)',not IGN(a.errors),str(IGN(a.errors)[:2]))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
