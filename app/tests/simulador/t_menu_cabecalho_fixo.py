import sys,re; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e]
def S(n=70):
    s=make_seed()
    for i in range(n):
        s[O+f'budgets/p{i}']=base(workId='w1',category=f'Etapa {i%4}',description=f'Serviço de teste de rolagem número {i}',unit='m2',qty=10+i,unitValue=50+i,bdi=20,source='Próprio')
        s[O+f'finance/p{i}']=base(workId='w1',date='2026-10-%02d'%(1+i%27),dueDate='2026-10-%02d'%(1+i%27),description=f'Lançamento de rolagem {i}',type='Despesa' if i%2 else 'Receita',category='Materiais',value=1000+i,status='Pago')
    return s
EXPECT=['dashboard','alerts','settings','members','works','contracts','suppliers','staff','documents','engineering','budgets','activities','orders','inventory','dailyLogs','equipment','quality','safety','measurements','finance','economics','resourcecurves','reports','audit','trash','maintenance','manual','legal']
def box(pg,sel): return pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{t:Math.round(r.top),b:Math.round(r.bottom),h:Math.round(r.height),pos:getComputedStyle(e).position}}",sel)
a=App(APP,auth=OWNER,seed=S(),port=9950,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':1000})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(900)
    grp=pg.eval_on_selector_all('#sidebar .navgroup','e=>e.map(x=>x.textContent.trim())')
    rotas=pg.eval_on_selector_all('#sidebar .navbtn','e=>e.map(x=>x.dataset.route)')
    chk('N1 menu lateral por fluxo de trabalho: Início, 1 Configuração, 2 Cadastros, 3 Projeto e planejamento, 4 Suprimentos, 5 Execução, 6 Medição e financeiro, 7 Controle, Administração',grp==['Início','1 · Configuração inicial','2 · Cadastros','3 · Projeto e planejamento','4 · Suprimentos','5 · Execução da obra','6 · Medição e financeiro','7 · Controle e relatórios','Administração'],str(grp))
    chk('N2 as 28 telas continuam no menu, na ordem de preenchimento (configurar → cadastrar → planejar → comprar → executar → medir/pagar → controlar)',rotas==EXPECT,str(rotas))
    chk('N3 dentro do fluxo: Orçamentos vem depois de Projetos e Quantitativos e antes do Cronograma; Compras antes de Estoque; Medições antes de Financeiro',rotas.index('engineering')<rotas.index('budgets')<rotas.index('activities') and rotas.index('orders')<rotas.index('inventory') and rotas.index('measurements')<rotas.index('finance'))
    # ---------- cabeçalho fixo em todas as telas
    def nav(r):pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{r}\"]').click()");pg.wait_for_timeout(450)
    tb=box(pg,'.topbar')['b'];falhas=[]
    for r in EXPECT:
        nav(r);pg.evaluate("window.scrollTo(0,document.body.scrollHeight)");pg.wait_for_timeout(250)
        rb,fl,hero=box(pg,'#releaseBar'),box(pg,'#globalFilters'),box(pg,'#content > .hero')
        ok=rb and fl and rb['pos']=='sticky' and fl['pos']=='sticky' and abs(rb['t']-tb)<=2 and abs(fl['t']-rb['b'])<=2
        if hero and pg.evaluate("document.documentElement.scrollHeight>innerHeight+200"):ok=ok and hero['pos']=='sticky' and hero['t']>=fl['b']-3 and hero['t']<=fl['b']+3
        if not ok:falhas.append((r,rb,fl,hero))
        pg.evaluate("window.scrollTo(0,0)")
    chk('F1 em TODAS as 28 abas a faixa de versão, os filtros e o título (quando existe) ficam fixos no topo, um abaixo do outro, mesmo no fim da página',not falhas,str(falhas[:2]))
    # ---------- tela de Orçamentos (a da captura)
    nav('budgets');pg.evaluate("window.scrollTo(0,1500)");pg.wait_for_timeout(300)
    rb,fl,hero,tabs,tool=[box(pg,x) for x in ('#releaseBar','#globalFilters','#content > .hero','#content > .subtabs','#content > .toolbar')]
    th=pg.evaluate("(()=>{const e=document.querySelector('#content > .tablewrap thead th');const r=e.getBoundingClientRect();return{t:Math.round(r.top),pos:getComputedStyle(e).position}})()");pb=pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))")
    seq=[tb,rb['t'],fl['t'],hero['t'],tabs['t'],tool['t']]
    chk('F2 Orçamentos (rolado ao meio da lista): versão → filtros → título e botões → sub-abas → total ficam empilhados sem sobreposição',all(seq[i]<=seq[i+1] for i in range(len(seq)-1)) and all(abs(x['b']-y['t'])<=3 for x,y in ((rb,fl),(fl,hero),(hero,tabs),(tabs,tool))),str(seq))
    chk('F3 e o cabeçalho das colunas (Obra, Categoria, Serviço, Unidade, Quantidade, Valor unitário, Ações) fica logo abaixo, sempre visível',th['pos']=='sticky' and abs(th['t']-pb)<=3 and pb>tool['b']-3,f"th={th} pin-bottom={pb} total-b={tool['b']}")
    vis=pg.evaluate("(()=>{const pb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'));return [...document.querySelectorAll('#content > .tablewrap tbody tr')].filter(r=>r.getBoundingClientRect().top>=pb&&r.getBoundingClientRect().bottom<=innerHeight).length})()")
    chk('F4 com tudo fixo ainda sobram linhas visíveis para trabalhar (tela 1600×1000)',vis>=8,str(vis))
    pg.screenshot(path='/tmp/fb/shots/v333_orcamentos.png')
    # ---------- finanças (tabela) e botão de fixar
    nav('finance');pg.evaluate("window.scrollTo(0,1200)");pg.wait_for_timeout(300)
    th=pg.evaluate("(()=>{const e=document.querySelector('#content .tablewrap thead th');const r=e.getBoundingClientRect();return{t:Math.round(r.top),pos:getComputedStyle(e).position}})()");pb=pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))")
    chk('F5 em outra tela com tabela (Financeiro) o cabeçalho das colunas também fica fixo',th['pos']=='sticky' and abs(th['t']-pb)<=3,str((th,pb)))
    pg.click('#pinBtn');pg.wait_for_timeout(400);pg.evaluate("window.scrollTo(0,1200)");pg.wait_for_timeout(300)
    rb=box(pg,'#releaseBar');chk('F6 o botão "Cabeçalho fixo" solta tudo (a faixa de versão sai da tela ao rolar) e a preferência fica guardada','solto' in pg.inner_text('#pinBtn') and rb['pos']!='sticky' and rb['b']<0 and pg.evaluate("localStorage.getItem('obratop-pin')")=='off',str(rb))
    pg.reload();pg.wait_for_timeout(1500);nav('finance');pg.evaluate("window.scrollTo(0,1200)");pg.wait_for_timeout(300)
    chk('F7 depois de recarregar a preferência "solto" continua',box(pg,'#releaseBar')['pos']!='sticky')
    pg.click('#pinBtn');pg.wait_for_timeout(400);chk('F8 e religar fixa de novo','fixo' in pg.inner_text('#pinBtn') and box(pg,'#releaseBar')['pos']=='sticky')
    chk('F9 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ---------- tela baixa: só o essencial fica fixo
b=App(APP,auth=OWNER,seed=S(),port=9951,viewport={'width':1366,'height':680})
with b:
    b.open();pg=b.page;pg.wait_for_timeout(900);pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_timeout(500);pg.evaluate("window.scrollTo(0,1500)");pg.wait_for_timeout(300)
    pb=pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))");vis=pg.evaluate("(()=>{const pb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'));return [...document.querySelectorAll('#content > .tablewrap tbody tr')].filter(r=>r.getBoundingClientRect().top>=pb&&r.getBoundingClientRect().bottom<=innerHeight).length})()")
    chk('F10 em tela baixa (1366×680) o cabeçalho fixo não passa de ~46% da altura: sempre sobram linhas para trabalhar',pb<=680*0.46+60 and vis>=4,f'fixo até {pb:.0f}px; linhas visíveis {vis}')
# ---------- celular não é afetado
m=App(APP,auth=OWNER,seed=S(10),port=9952,viewport={'width':390,'height':844},mobile=True)
with m:
    m.open();pg=m.page;pg.wait_for_timeout(900)
    chk('F11 no celular o cabeçalho fixo não é aplicado (layout próprio do smartphone)',pg.evaluate("!document.documentElement.classList.contains('pinned')"))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
