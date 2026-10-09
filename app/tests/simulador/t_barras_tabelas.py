import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e]
def S(n=70):
    s=make_seed()
    for i in range(n):
        s[O+f'budgets/p{i}']=base(workId='w1',category=f'Etapa {i%4}',description=f'Serviço de teste de rolagem número {i} com descrição um pouco longa',unit='m2',qty=10+i,unitValue=50+i,bdi=20,source='Próprio')
        s[O+f'finance/p{i}']=base(workId='w1',date='2026-10-%02d'%(1+i%27),dueDate='2026-10-%02d'%(1+i%27),description=f'Lançamento de rolagem {i} com histórico',type='Despesa' if i%2 else 'Receita',category='Materiais',value=1000+i,status='Pago')
    return s
def nav(pg,r):pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{r}\"]').click()");pg.wait_for_timeout(700)
INFO="""(()=>{const tw=document.querySelector('#content .tablewrap'),hb=document.querySelector('#content .hbarWrap .tblHScroll'),th=tw&&tw.querySelector('thead th');const r=e=>{if(!e)return null;const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),w:Math.round(b.width),h:Math.round(b.height),ov:c.overflowX,sc:c.scrollbarColor}};
 return{tw:tw&&{...r(tw),cls:tw.className,sh:tw.scrollHeight-tw.clientHeight,nat:tw.offsetHeight-tw.clientHeight,sw:tw.scrollWidth,cw:tw.clientWidth},bar:r(hb),th:r(th),thTr:th&&th.style.transform,vh:innerHeight,pb:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))}})()"""
a=App(APP,auth=OWNER,seed=S(),port=9930,viewport={'width':1000,'height':800})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(900);nav(pg,'finance');pg.wait_for_timeout(500);i=pg.evaluate(INFO)
    chk('R1 tabela larga (janela de 1000 px): a barra horizontal fica fixa na base da tela, sem precisar rolar a página até o fim da lista',i['tw'] and 'hbOn' in i['tw']['cls'] and i['bar'] and abs(i['bar']['b']-i['vh'])<=2,str((i['bar'],i['vh'])))
    chk('R2 mesmo visual da barra do Cronograma: 18 px, rolagem sempre visível, mesma cor do trilho e do polegar, na largura da tabela',i['bar']['h']==18 and i['bar']['ov']=='scroll' and i['bar']['sc']=='rgb(107, 127, 146) rgb(230, 237, 242)' and abs(i['bar']['w']-i['tw']['w'])<=3 and abs(i['bar']['l']-i['tw']['l'])<=2,str((i['bar'],i['tw'])))
    chk('R3 a barra nativa feia no fim da tabela foi substituída (sem barra duplicada)',i['tw']['nat']<=2,str(i['tw']['nat']))   # 2 px = bordas da tabela
    pg.evaluate("(()=>{const b=document.querySelector('#content .hbarWrap .tblHScroll');b.scrollLeft=150;b.dispatchEvent(new Event('scroll'))})()");pg.wait_for_timeout(200)
    a1=pg.evaluate("Math.round(document.querySelector('#content .tablewrap').scrollLeft)")
    pg.evaluate("document.querySelector('#content .tablewrap').scrollLeft=60");pg.wait_for_timeout(200);b1=pg.evaluate("Math.round(document.querySelector('#content .hbarWrap .tblHScroll').scrollLeft)")
    chk('R4 arrastar a barra rola a tabela e rolar a tabela move a barra (sincronizadas nos dois sentidos)',a1==150 and b1==60,f'{a1}/{b1}')
    chk('R5 sem barra vertical "por dentro" da tabela: a página rola e a tabela não tem rolagem vertical própria',i['tw']['sh']<=1)
    pg.evaluate("window.scrollTo(0,1000)");pg.wait_for_timeout(500);j=pg.evaluate(INFO)
    cob=pg.evaluate("(()=>{const th=[...document.querySelectorAll('#content .tablewrap thead th')].find(x=>x.getBoundingClientRect().left>330),b=th.getBoundingClientRect(),e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !e||e===th||th.contains(e)||th.parentElement.contains(e)})()")
    chk('R6 rolando a página, o cabeçalho das colunas continua visível logo abaixo do bloco congelado (sem ficar escondido) mesmo com a tabela larga',abs(j['th']['t']-j['pb'])<=8 and 'translateY' in (j['thTr'] or '') and cob,str((j['th'],j['pb'],j['thTr'])))
    chk('R7 a barra horizontal continua fixa na base da tela depois de rolar a página',abs(j['bar']['b']-j['vh'])<=2,str(j['bar']))
    pg.screenshot(path='/tmp/fb/shots/v373_rolado.png')
    pg.set_viewport_size({'width':1920,'height':1000});pg.wait_for_timeout(900);k=pg.evaluate("({bars:document.querySelectorAll('#content .hbarWrap').length,cls:document.querySelector('#content .tablewrap').className})")
    chk('R8 numa janela larga (a tabela cabe), a barra extra some sozinha e a tabela volta ao cabeçalho fixo comum',k['bars']==0 and 'hbOn' not in k['cls'] and 'pinFit' in k['cls'],str(k))
    pg.set_viewport_size({'width':1000,'height':800});pg.wait_for_timeout(900);chk('R9 e volta quando a janela estreita de novo',pg.evaluate("document.querySelectorAll('#content .hbarWrap').length")==1)
    falhas=[]
    for r in ('finance','orders','inventory','works','measurements','contracts','members'):
        nav(pg,r);ok=pg.evaluate("(()=>{const ws=[...document.querySelectorAll('#content .tablewrap')].filter(w=>w.querySelector(':scope > table'));return ws.every(w=>{const wide=w.scrollWidth>w.clientWidth+2;const has=w.nextElementSibling&&w.nextElementSibling.classList.contains('hbarWrap');return wide?has:!has})})()")
        if not ok:falhas.append(r)
    chk('R10 em outras telas com tabelas (Financeiro, Compras, Estoque, Obras, Medições, Contratos, Equipe): a barra aparece só onde a tabela é larga',not falhas,str(falhas))
    chk('R11 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
m=App(APP,auth=OWNER,seed=S(),port=9931,viewport={'width':390,'height':844},mobile=True)
with m:
    m.open();pg=m.page;pg.wait_for_timeout(900);nav(pg,'budgets');pg.wait_for_timeout(500)
    chk('R12 no celular (tabelas em cartões) não aparece barra horizontal',pg.evaluate("document.querySelectorAll('#content .hbarWrap').length")==0)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
