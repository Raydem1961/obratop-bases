import sys,shutil,os; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
NOVO='/tmp/fb/app_novo'
shutil.rmtree(NOVO,ignore_errors=True);shutil.copytree(APP,NOVO);open(NOVO+'/RELEASE.txt','w',encoding='utf-8').write('ObraTop 3.99 — versão futura de teste\n')
a=App(APP,auth=OWNER,seed=make_seed(),port=9941,viewport={'width':1500,'height':900})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(1200)
    chk('A1 botão "🔄 Atualizar aplicativo" na faixa de versão, sem destaque quando a versão está em dia','Atualizar aplicativo' in pg.inner_text('#updBtn') and 'updateAvail' not in pg.get_attribute('#updBtn','class'),pg.inner_text('#updBtn'))
    pg.evaluate("(async()=>{await caches.open('obratop-production-teste');await caches.open('outro-cache');localStorage.setItem('obratop-marca','1');await new Promise(r=>{const q=indexedDB.open('obratop-base-teste',1);q.onsuccess=()=>{q.result.close();r()}})})()");pg.wait_for_timeout(300)
    m=len(a.dialogs);a.recusar_confirm=True;pg.click('#updBtn');pg.wait_for_timeout(700);a.recusar_confirm=False
    k=pg.evaluate("caches.keys()")
    chk('A2 ao cancelar a confirmação nada é apagado e a página não recarrega','obratop-production-teste' in k and 'outro-cache' in k and 'confirm' in [t for t,_ in a.dialogs[m:]] and 'v=' not in pg.url,str(k))
    with pg.expect_navigation(timeout=20000): pg.click('#updBtn')
    pg.wait_for_selector('#appView:not(.hidden)',timeout=15000);pg.wait_for_timeout(1500)
    k=pg.evaluate("caches.keys()");dbs=pg.evaluate("indexedDB.databases().then(d=>d.map(x=>x.name))");ls=pg.evaluate("localStorage.getItem('obratop-marca')")
    chk('A3 ao confirmar: o cache do ObraTop é apagado e a página recarrega, sem apagar caches de outros sites',('obratop-production-teste' not in k) and 'outro-cache' in k,str(k))
    chk('A4 e preserva as bases importadas (IndexedDB), rascunhos e preferências (localStorage)','obratop-base-teste' in dbs and ls=='1',str(dbs)+' '+str(ls))
    chk('A5 o parâmetro temporário "?v=" é removido do endereço depois de recarregar','v=' not in pg.url,pg.url)
    pg.evaluate("Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true})");pg.evaluate("caches.open('obratop-production-teste2')");m=len(a.dialogs);pg.click('#updBtn');pg.wait_for_timeout(600)
    msgs=[x for _,x in a.dialogs[m:]];k=pg.evaluate("caches.keys()")
    chk('A6 sem internet o aplicativo recusa atualizar (apagar o cache o deixaria sem abrir) e explica','obratop-production-teste2' in k and any('Sem conexão' in x for x in msgs),str(msgs[:1]))
    chk('A7 sem erros de JavaScript',not [e for e in a.errors if "reading 'update'" not in e and '404' not in e and 'Failed to load resource' not in e],str(a.errors[:2]))
b=App(NOVO,auth=OWNER,seed=make_seed(),port=9942,viewport={'width':1500,'height':900})
with b:
    b.open();pg=b.page;pg.wait_for_timeout(1500)
    chk('A8 quando há versão mais nova publicada, o botão é destacado e mostra o número dela','updateAvail' in pg.get_attribute('#updBtn','class') and 'Nova versão 3.99.0.0' in pg.inner_text('#updBtn'),pg.inner_text('#updBtn'))
    pg.screenshot(path='/tmp/fb/shots/v371_atualizar.png',clip={'x':260,'y':50,'width':1240,'height':110})
m=App(APP,auth=OWNER,seed=make_seed(),port=9943,viewport={'width':390,'height':844},mobile=True)
with m:
    m.open();pg=m.page;pg.wait_for_timeout(1200)
    chk('A9 no celular a faixa de versão continua cabendo na tela (sem rolagem lateral)',pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
