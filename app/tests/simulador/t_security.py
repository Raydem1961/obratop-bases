import sys,json; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];res=[]
def chk(n,c,e=''):
    res.append(c);print('OK ' if c else 'FALHA',n,e)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e]
# --- usuário de obra: salário não aparece e não é sobrescrito
with App(APP,auth=USER,port=8821) as a:
    a.open();pg=a.page
    pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(250)
    rows=pg.eval_on_selector_all('#content table tbody tr','e=>e.map(r=>r.innerText.replace(/\\s+/g," "))')
    chk('S1 usuário de obra não vê o salário na tabela',rows and 'R$ 3.000' not in rows[0] and '—' in rows[0],rows[0] if rows else '')
    pg.click('.edit');pg.wait_for_selector('#recordForm')
    chk('S1 formulário de pessoal sem campo de salário para usuário de obra',pg.query_selector('#recordForm [name=salary]') is None)
    pg.fill('#recordForm [name=role]','Mestre de obras');pg.click('#recordForm button.primary');pg.wait_for_timeout(400)
    up=[w for w in pg.evaluate('window.__fb.writes') if w['path']=='organizations/org1/staff/st1' and w['op']=='update'][-1]
    chk('S1 edição por usuário de obra não zera o salário',('salary' not in up['data']) and pg.evaluate("window.__fb.db.get('organizations/org1/staff/st1').salary")==3000,str(list(up['data'].keys())))
    pg.click('.navbtn[data-route="orders"]');pg.wait_for_timeout(200)
    pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    opts=pg.eval_on_selector_all('#recordForm [name=inventoryId] option','e=>e.map(o=>o.textContent)')
    chk('vínculos oferecem só materiais da obra do usuário',all('Obra A' in o or o=='Nenhum' for o in opts),str(opts))
    pg.click('#cancelModal')
    chk('usuário de obra: sem erros JS',not IGN(a.errors),str(IGN(a.errors)[:2]))
# --- administrador: salário visível
with App(APP,auth=OWNER,port=8822) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="staff"]');pg.wait_for_timeout(250)
    chk('administrador continua vendo o salário',any('R$ 3.000' in r.replace('\u00a0',' ') for r in pg.eval_on_selector_all('#content table tbody tr','e=>e.map(r=>r.innerText)')))
# --- verificação de e-mail
newuser={'uid':'u9','email':'novo@teste.com','emailVerified':False}
with App(APP,auth=newuser,port=8823) as a:
    a.open('/index.html',wait=False);pg=a.page;pg.wait_for_selector('#onboardingView:not(.hidden)');pg.wait_for_timeout(300)
    chk('S2 e-mail não verificado vê o aviso de verificação',not pg.is_hidden('#verifyBox') and pg.is_hidden('#onboardingForms'))
    chk('S2 e-mail de verificação enviado automaticamente',['verify','novo@teste.com'] in pg.evaluate('window.__fbAuth.log'))
    pg.click('#verifyCheck');pg.wait_for_timeout(300)
    chk('S2 "Já verifiquei" sem verificar mantém o bloqueio','Ainda não consta' in pg.inner_text('#verifyMsg') and pg.is_hidden('#onboardingForms'),pg.inner_text('#verifyMsg'))
    pg.click('#verifyResend');pg.wait_for_timeout(200)
    chk('S2 reenvio funciona',pg.evaluate('window.__fbAuth.log').count(['verify','novo@teste.com'])==2)
    pg.evaluate('window.__AUTH_VERIFY_ON_RELOAD__=true');pg.click('#verifyCheck');pg.wait_for_timeout(400)
    chk('S2 após verificar, libera criar empresa/convite',pg.is_hidden('#verifyBox') and not pg.is_hidden('#onboardingForms'))
# --- usuário já membro com e-mail não verificado continua entrando
with App(APP,auth={'uid':'u1','email':'owner@test.com','emailVerified':False},port=8824) as a:
    a.open();chk('S2 membro existente não é bloqueado (mesmo sem e-mail verificado)',True)
# --- backup externo registrado na organização
with App(APP,auth=OWNER,port=8825) as a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="maintenance"]');pg.wait_for_timeout(500)
    with pg.expect_download(timeout=20000) as dl: pg.click('#externalBackupBtn')
    pg.wait_for_timeout(800)
    org=pg.evaluate("window.__fb.db.get('organizations/org1')")
    chk('U6 backup externo grava data/checksum na organização',bool(org.get('lastExternalBackup',{}).get('checksum')),str(list(org.get('lastExternalBackup',{}).keys())))
    chk('U6 arquivo de backup baixado',dl.value.suggested_filename.startswith('ObraTop_Backup_Externo_'),dl.value.suggested_filename)
    chk('U6 sem erros JS no backup',not IGN(a.errors),str(IGN(a.errors)[:2]))
import datetime
seed=make_seed();seed['organizations/org1']['lastExternalBackup']={'at':datetime.datetime.utcnow().isoformat()+'Z','checksum':'abc','by':'outro@x.com'}
with App(APP,auth=OWNER,seed=seed,port=8826) as a:
    a.open();pg=a.page;pg.wait_for_timeout(2600)
    chk('U6 lembrete respeita o backup feito em outro computador (sem aviso)','Backup externo' not in pg.inner_text('#toastRoot') and 'primeiro backup' not in pg.inner_text('#toastRoot'),pg.inner_text('#toastRoot'))
with App(APP,auth=OWNER,port=8827) as a:
    a.open();pg=a.page;pg.wait_for_timeout(2600)
    chk('U6 sem nenhum backup, o lembrete aparece','primeiro backup' in pg.inner_text('#toastRoot'),pg.inner_text('#toastRoot'))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
