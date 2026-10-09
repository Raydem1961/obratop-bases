import sys,re; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];FX='/tmp/fb/fx/';O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e]
LUM="""(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2])}"""
def contraste(pg,sel,fundo='body'):
    return pg.evaluate("""([s,f])=>{const L=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const g=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*g(m[0])+0.7152*g(m[1])+0.0722*g(m[2])};
      const e=document.querySelector(s),b=document.querySelector(f);if(!e)return null;const a=L(getComputedStyle(e).color),k=L(getComputedStyle(b).backgroundColor),hi=Math.max(a,k),lo=Math.min(a,k);return Math.round((hi+0.05)/(lo+0.05)*10)/10}""",[sel,fundo])
def fs(pg,sel): return pg.evaluate("(s)=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null}",sel)
def S():
    s=make_seed()
    for i,d in enumerate(['98459 — TAPUME COM TELHA METÁLICA','87521 — ALVENARIA DE VEDAÇÃO','00123 — CONCRETO ESTRUTURAL','Zebra — serviço próprio','11 — ÁGUA FRIA, INSTALAÇÃO','500 — armação de aço','7 — Brita']):
        s[O+f'budgets/z{i}']=base(workId='w1',category='Etapa X',description=d,unit='m2',qty=1+i,unitValue=10+i,bdi=20,source='Próprio')
    return s
a=App(APP,auth=OWNER,seed=S(),port=9960,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1366,'height':768})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(900)
    def nav(r):pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{r}\"]').click()");pg.wait_for_timeout(500)
    # ---------- menu: item ativo
    nav('budgets')
    st=pg.evaluate("(()=>{const e=document.querySelector('.navbtn.active'),b=getComputedStyle(e),m=getComputedStyle(e,'::before');return{bg:b.backgroundColor,fw:b.fontWeight,cor:b.color,marc:m.backgroundColor,ico:getComputedStyle(e.querySelector('.navico')).color}})()")
    chk('M1 item selecionado do menu em amarelo-creme (o mesmo dos avisos do app) e texto marrom escuro em negrito',st['bg']=='rgb(255, 244, 206)' and st['fw']=='700' and st['cor']=='rgb(74, 47, 0)',str(st))
    chk('M2 marcador lateral e ícone do item selecionado em laranja',st['marc']=='rgb(240, 138, 0)' and st['ico']=='rgb(196, 106, 0)',str(st))
    cr=contraste(pg,'.navbtn.active','.navbtn.active');chk('M3 texto do item selecionado legível sobre o amarelo-creme (contraste ≥ 7:1)',cr and cr>=7,str(cr))
    nav('works');chk('M4 ao trocar de tela só o novo item fica em destaque',pg.eval_on_selector_all('.navbtn.active','e=>e.length')==1 and pg.eval_on_selector('.navbtn.active','e=>e.dataset.route')=='works')
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')");pg.wait_for_timeout(200)
    sd=pg.evaluate("(()=>{const e=document.querySelector('.navbtn.active'),b=getComputedStyle(e),m=getComputedStyle(e,'::before');return{bg:b.backgroundColor,cor:b.color,marc:m.backgroundColor}})()")
    chk('M5 no tema escuro o item selecionado fica âmbar translúcido com texto claro e marcador amarelo',sd['bg'].startswith('rgba(255, 185, 0') and sd['cor']=='rgb(255, 226, 163)' and sd['marc']=='rgb(255, 177, 0)',str(sd))
    pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
    # ---------- fontes e cinzas (notebook 1366×768)
    nav('economics')
    pg.evaluate("document.querySelector('#content').insertAdjacentHTML('beforeend','<div class=\"executiveFinancial\" id=\"tmpFin\"><div class=\"financialHead\"><div><h2>Leitura financeira da obra</h2><p>Custos, resultado previsto e necessidade de caixa</p></div></div></div>')")
    ht=fs(pg,'#tmpFin .financialHead p');cr=contraste(pg,'#tmpFin .financialHead p')
    chk('T1 "Custos, resultado previsto e necessidade de caixa" (leitura financeira): fonte de ~13,5 px para 15 px',ht==15,str(ht))
    chk('T2 e o cinza ficou mais escuro: contraste com o fundo ≥ 8:1 (antes ≈ 6,2:1)',cr and cr>=8,str(cr))
    pg.evaluate("document.querySelector('#tmpFin').remove()")
    mu=fs(pg,'#content .muted');th=fs(pg,'#content th');ng=fs(pg,'.sidebar .navgroup')
    chk('T3 textos de apoio em 14 px, cabeçalhos de coluna em 13,5 px e títulos de grupo do menu com 12 px ou mais',(mu is None or mu==14) and (th is None or th==13.5) and ng>=12,f'muted={mu} th={th} navgroup={ng}')
    pg.screenshot(path='/tmp/fb/shots/v334_economia_notebook.png')
    ft=fs(pg,'.appCopyright');crf=contraste(pg,'.appCopyright')
    chk('T4 rodapé "ObraTop • Criado por … Direitos Autorais e Licença": 12 px → 13,5 px, em cinza mais escuro (contraste ≥ 6:1)',ft==13.5 and crf and crf>=6,f'{ft}px contraste {crf}')
    chk('T5 o mesmo aumento na tela de entrada (texto de direitos autorais do login)',fs(pg,'.loginCopyright')==13.5,str(fs(pg,'.loginCopyright')))
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')");pg.wait_for_timeout(200)
    cd=contraste(pg,'.sidebar .navgroup');chk('T6 tema escuro: rodapé e títulos de grupo do menu com bom contraste (≥ 6:1)',cd and cd>=6 and contraste(pg,'.appCopyright')>=6,f"{cd} / {contraste(pg,'.appCopyright')}")
    pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
    # ---------- A–Z na lista de Orçamentos
    nav('budgets');pg.wait_for_timeout(400)
    nomes=pg.evaluate("[...document.querySelectorAll('#content .tablewrap tbody tr')].map(r=>r.cells[2].innerText.trim().replace(/^[A-Za-z0-9.\\-\\/]+\\s+—\\s+/,''))")
    ordenado=sorted(nomes,key=lambda x:__import__('unicodedata').normalize('NFD',x).encode('ascii','ignore').decode().lower())
    chk('A1 Orçamentos: a discriminação dos serviços aparece de A a Z (ignorando o código na frente e acentos)',len(nomes)>=7 and nomes==ordenado,str(nomes))
    # ---------- A–Z na busca e na planilha
    pg.click('.subtab[data-tab="builder"]');pg.wait_for_selector('#bbName');pg.fill('#etNew','Etapa A');pg.click('#etAdd')
    pg.set_input_files('#spFile',FX+'SINAPI-2026-08-formato-xlsx.zip')
    for _ in range(60):
        pg.wait_for_timeout(250)
        if 'composições' in pg.inner_text('#spStatus') and 'lendo' not in pg.inner_text('#spStatus'):break
    pg.fill('#bbQuery','');pg.wait_for_timeout(500)
    ds=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>r.cells[2].innerText)')
    chk('A2 busca "Criar novo orçamento": resultados em ordem alfabética de A a Z pela discriminação',len(ds)==5 and ds==sorted(ds,key=lambda x:x.lower()),str([d[:22] for d in ds]))
    pg.fill('#bbQuery','87529');pg.wait_for_timeout(400);pg.fill('#bbQuery','a');pg.wait_for_timeout(500)
    ds=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>r.cells[2].innerText)');chk('A3 também com palavra digitada ("a"): A–Z',ds==sorted(ds,key=lambda x:x.lower()) and len(ds)>=4,str([d[:18] for d in ds]))
    pg.fill('#bbQuery','87879');pg.wait_for_timeout(400);chk('A4 código digitado por inteiro continua em primeiro lugar','87879' in pg.inner_text('#bbRes tbody tr >> nth=0'))
    # planilha: botão "Ordenar serviços de A a Z"
    for cod in ('87879','87529','87521'):
        pg.fill('#bbQuery',cod);pg.wait_for_timeout(350);pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    ant=pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.map(r=>r.cells[0].innerText.trim()+" "+r.cells[2].innerText.trim())')
    pg.click('#bbSortAz');pg.wait_for_timeout(400)
    dep=pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.map(r=>[r.cells[0].innerText.trim(),r.cells[2].innerText.trim()])')
    chk('A5 "Ordenar serviços de A a Z" reordena a planilha por discriminação e renumera (1.1, 1.2, 1.3)',[d[0] for d in dep]==['1.1','1.2','1.3'] and [d[1] for d in dep]==['87521','87879','87529'] and ant!=[f'{d[0]} {d[1]}' for d in dep],str(ant)+' → '+str(dep))
    chk('A6 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
