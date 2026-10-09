import sys,re,subprocess,base64,os; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/'
REL=re.search(r"const RELEASE='([^']+)'",open(APP+'/app.js',encoding='utf-8').read()).group(1)
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
LOGO='data:image/png;base64,'+base64.b64encode(open('/tmp/fb/img/logo_wide.png','rb').read()).decode()
CO={'cnpj':'12.345.678/0001-90','companyAddress':'Av. Apolônio Sales, 500 - Paulo Afonso/BA','companyPhone':'(75) 99999-1234','companyEmail':'contato@exemplo.com.br','defaultEngineer':'Engº Padrão','branding':{'logo':LOGO,'w':480,'h':160,'name':'logo.png'}}
def seed(n_fin=6,many=False):
    s=make_seed();s['organizations/org1']={**s['organizations/org1'],**CO}
    meses=['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10']
    for i in range(n_fin):
        m=meses[i%6]
        s[O+f'finance/r{i}']=base(workId='w1',date=m+'-10',dueDate=m+'-20',description=f'Receita {i}',type='Receita',category='Medição',value=50000+i*12500,status='Recebido')
        s[O+f'finance/d{i}']=base(workId='w1',date=m+'-12',dueDate=m+'-22',description=f'Despesa {i}',type='Despesa',category='Materiais',value=18000+i*7000,status='Pago')
    if many:
        for i in range(90): s[O+f'finance/x{i}']=base(workId='w1',date=meses[i%6]+'-15',dueDate=meses[i%6]+'-25',description=f'Lançamento {i:02d} para teste de impressão em várias páginas',type='Despesa',category='Materiais',value=1000+i,status='Pago')
    return s
def vis(pg,sel): return pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),t:e.innerText.replace(/\\n/g,' ')}}",sel)
# ================= FAIXA DE VERSÃO EM TODAS AS TELAS (computador)
for pid,esperado,proibido in (('obratop-v3-teste','Homologação','Produção'),('obratop-clinica','Produção','Homologação')):
    a=App(APP,auth=OWNER,seed=seed(),port=9600+len(res),viewport={'width':1500,'height':950});a.project_id=pid
    with a:
        a.open();pg=a.page;pg.wait_for_timeout(700);bad=[]
        rotas=('dashboard','alerts','resourcecurves','reports','manual','engineering','budgets','activities','works','dailyLogs','measurements','equipment','inventory','orders','suppliers','economics','finance','contracts','quality','safety','staff','documents','members','audit','trash','maintenance','settings','legal')
        for rt in rotas:
            pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{rt}\"]').click()");pg.wait_for_timeout(260)
            b=vis(pg,'#releaseBar .releaseIdentity')
            if not(b and b['w']>0 and ('ObraTop V'+REL) in b['t'] and esperado in b['t'] and proibido not in b['t'] and 'Atualizado em 08/10/2026' in b['t']): bad.append((rt,b))
        chk(f'F1 [{pid}] as 28 telas mostram no topo "ObraTop V{REL} · {esperado} · Atualizado em 08/10/2026"',not bad,str(bad[:2]))
        pg.evaluate("document.querySelector('.navbtn[data-route=\"dashboard\"]').click()");pg.wait_for_timeout(500)
        chk(f'F2 [{pid}] a faixa aparece uma única vez no painel (sem duplicar)',pg.eval_on_selector_all('.releaseIdentity','e=>e.length')==1)
        chk(f'F3 [{pid}] sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ================= FAIXA NO CELULAR
m=App(APP,auth=OWNER,seed=seed(),port=9610,viewport={'width':390,'height':844},mobile=True)
with m:
    m.open();pg=m.page;pg.wait_for_timeout(800)
    b=vis(pg,'#releaseBar .releaseIdentity')
    chk('F4 no celular em pé a faixa também aparece, sem estourar a largura',b and b['w']>0 and ('V'+REL) in b['t'] and pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"),str(b))
    pg.set_viewport_size({'width':844,'height':390});pg.wait_for_timeout(500)
    b=vis(pg,'#releaseBar .releaseIdentity');chk('F5 e deitado',b and b['w']>0 and ('V'+REL) in b['t'])
# ================= GRÁFICOS DE FLUXO DE CAIXA E CURVA S
a=App(APP,auth=OWNER,seed=seed(),port=9620,viewport={'width':1500,'height':950})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('.navbtn[data-route=\"dashboard\"]').click()");pg.wait_for_timeout(900)
    r=pg.evaluate("""(()=>{const cards=[...document.querySelectorAll('.card.chart')];const c=cards.find(x=>x.innerText.includes('Fluxo de caixa mensal'));if(!c)return null;const t=[...c.querySelectorAll('svg text.cfVal')].map(x=>[x.textContent,x.getAttribute('fill')]);const pol=[...c.querySelectorAll('polyline')].map(p=>p.getAttribute('stroke-width'));return{t,pol,nota:c.innerText.includes('mil = milhares')}})()""")
    rec=[x for x in r['t'] if x[1]=='#15803d'];des=[x for x in r['t'] if x[1]=='#b91c1c']
    chk('G1 "Fluxo de caixa mensal" mostra o valor de receitas e de despesas em cada mês (6 meses)',len(rec)==6 and len(des)==6,f'{len(rec)} receitas, {len(des)} despesas: {r["t"][:4]}')
    chk('G2 os valores aparecem abreviados em R$ (ex.: "50 mil") com nota explicativa',any('mil' in x[0] for x in rec) and r['nota'])
    chk('G3 as linhas de receitas e despesas continuam com 4 px',r['pol']==['4','4'],str(r['pol']))
    # Curva S
    sc=pg.evaluate("""(()=>{const w=document.querySelector('.sCurveWrap');if(!w)return null;const pl=[...w.querySelectorAll('polyline')].filter(p=>p.getAttribute('stroke')!=='none').map(p=>[p.getAttribute('stroke'),p.getAttribute('stroke-width')]);const ci=[...w.querySelectorAll('circle')].map(c=>c.getAttribute('r'));const lg=[...w.querySelectorAll('.sLegend i')].map(i=>i.style.background);return{pl,r:[...new Set(ci)],lg}})()""")
    chk('S1 Curva S: linha do planejado em laranja vivo, com 4 px (mesma espessura do fluxo de caixa)',sc and ['#ff6a00','4'] in sc['pl'],str(sc))
    chk('S2 Curva S: linha do realizado em azul vivo, com 4 px (se houver realizado no período)',sc and (['#0066ff','4'] in sc['pl'] or len(sc['pl'])==1),str(sc['pl']) if sc else '')
    chk('S3 Curva S: marcadores maiores e legenda com as novas cores',sc and sc['r']==['4.5'] and any('255, 106, 0' in x or '#ff6a00' in x for x in sc['lg']),str(sc))
    pg.locator('.sCurveWrap').first.screenshot(path='/tmp/fb/shots/v330_scurve.png');pg.locator('.card.chart:has-text("Fluxo de caixa mensal")').first.screenshot(path='/tmp/fb/shots/v330_fluxo.png')
    chk('G4 sem erros de JavaScript (gráficos)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ================= DADOS DA EMPRESA + CABEÇALHO NAS IMPRESSÕES E RELATÓRIOS
a=App(APP,auth=OWNER,seed=seed(many=True),port=9630,viewport={'width':1500,'height':950})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('.navbtn[data-route=\"settings\"]').click()");pg.wait_for_timeout(500)
    chk('H1 Configurações traz os campos CNPJ, endereço, telefone, e-mail e engenheiro padrão, já preenchidos',all(pg.input_value(i)==v for i,v in (('#coCnpj',CO['cnpj']),('#coAddress',CO['companyAddress']),('#coPhone',CO['companyPhone']),('#coEmail',CO['companyEmail']),('#defEngineer',CO['defaultEngineer']))))
    n=len(a.dialogs);pg.fill('#coEmail','email-invalido');pg.click('#saveCompany');pg.wait_for_timeout(400)
    chk('H2 e-mail inválido é recusado com aviso e nada é gravado',any('e-mail válido' in x for _,x in a.dialogs[n:]) and pg.evaluate("window.__fb.db.get('organizations/org1').companyEmail")==CO['companyEmail'])
    pg.fill('#coCnpj','98765432000110');pg.fill('#coPhone','(75) 3281-0000');pg.fill('#coEmail','nova@empresa.com.br');pg.fill('#coAddress','Rua Nova, 10 - Salvador/BA');pg.click('#saveCompany');pg.wait_for_timeout(900)
    org=pg.evaluate("window.__fb.db.get('organizations/org1')")
    chk('H3 salvar grava os dados (CNPJ formatado automaticamente) e registra na auditoria',org['cnpj']=='98.765.432/0001-10' and org['companyPhone']=='(75) 3281-0000' and org['companyEmail']=='nova@empresa.com.br' and org['companyAddress']=='Rua Nova, 10 - Salvador/BA' and pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='config-empresa')"))
    # impressão (primeira página e todas as páginas)
    pg.evaluate("document.querySelector('.navbtn[data-route=\"finance\"]').click()");pg.wait_for_timeout(800)
    pg.emulate_media(media='print');pg.evaluate("window.dispatchEvent(new Event('beforeprint'))");pg.wait_for_timeout(300)
    pb=pg.evaluate("(()=>{const st=document.getElementById('printPageStyle');return{css:st?st.textContent:'',cls:[...document.documentElement.classList].filter(c=>c.startsWith('print')),brand:getComputedStyle(document.querySelector('#printBrand')).display,mb:typeof CSSMarginRule!=='undefined'}})()")
    css=pb['css']
    chk('P1 impressão: o cabeçalho da página traz logo, nome, CNPJ, endereço, telefone, e-mail, título, data e versão',pb['mb'] and all(x in css for x in ('data:image/png;base64','98.765.432/0001-10','Rua Nova, 10 - Salvador/BA','Tel.: (75) 3281-0000','E-mail: nova@empresa.com.br','Financeiro','ObraTop V'+REL)),css[:160])
    chk('P2 o cabeçalho usa as margens da página (repete em todas as páginas) e o app prepara a página',pb['cls']==['printHdr','printMB'] and pb['brand']=='none' and '@page' in css and '@top-center' in css,str(pb['cls']))
    pg.pdf(path='/tmp/fb/dl/impressao.pdf',prefer_css_page_size=True,print_background=True)
    info=subprocess.run(['pdfinfo','/tmp/fb/dl/impressao.pdf'],capture_output=True,text=True).stdout;pages=int(re.search(r'Pages:\s+(\d+)',info).group(1))
    com=[p for p in range(1,pages+1) if '98.765.432/0001-10' in subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-layout','/tmp/fb/dl/impressao.pdf','-'],capture_output=True,text=True).stdout]
    imgs=subprocess.run(['pdfimages','-list','/tmp/fb/dl/impressao.pdf'],capture_output=True,text=True).stdout.strip().split('\n')[2:]
    chk('P3 PDF de impressão real (Chromium): o cabeçalho completo (texto e logo) aparece em TODAS as páginas, inclusive a última',pages>=2 and len(com)==pages and len(imgs)>=pages,f'{len(com)} de {pages} páginas com texto; {len(imgs)} imagens')
    subprocess.run(['pdftoppm','-r','55','-f','2','-l','2','-png','/tmp/fb/dl/impressao.pdf','/tmp/fb/shots/v330_print'])
    pg.evaluate("window.dispatchEvent(new Event('afterprint'))");pg.emulate_media(media='screen')
    chk('P4 depois de imprimir, o app volta ao normal (sem classe nem margem de página)',pg.evaluate("!document.documentElement.classList.contains('printHdr')&&!document.getElementById('printPageStyle')"))
    pg.evaluate("window.CSSMarginRule=undefined;window.dispatchEvent(new Event('beforeprint'))");pg.emulate_media(media='print');pg.wait_for_timeout(200)
    fx=pg.evaluate("(()=>({cls:[...document.documentElement.classList].filter(c=>c.startsWith('print')),pos:getComputedStyle(document.querySelector('#printBrand')).position,txt:document.querySelector('#printBrand').innerText}))()")
    chk('P5 reserva para navegador antigo: cabeçalho fixo com todos os dados',fx['cls']==['printHdr','printFx'] and fx['pos']=='fixed' and '98.765.432/0001-10' in fx['txt'] and 'nova@empresa.com.br' in fx['txt'],str(fx['cls']))
    pg.evaluate("window.dispatchEvent(new Event('afterprint'))");pg.emulate_media(media='screen')
    # PDF exportado e Word
    pg.evaluate("document.querySelector('.navbtn[data-route=\"finance\"]').click()");pg.wait_for_timeout(500)
    pg.click('#exportFile');pg.wait_for_selector('.fmt')
    with pg.expect_download(timeout=25000) as dl: pg.click('.fmt[data-fmt="pdf"]')
    dl.value.save_as('/tmp/fb/dl/fin.pdf');tx=subprocess.run(['pdftotext','-layout','/tmp/fb/dl/fin.pdf','-'],capture_output=True,text=True).stdout
    chk('R1 PDF exportado: cabeçalho com CNPJ, endereço, telefone e e-mail',all(x in tx for x in ('98.765.432/0001-10','Rua Nova, 10 - Salvador/BA','(75) 3281-0000','nova@empresa.com.br')),re.sub(r'\s+',' ',tx)[:200])
    subprocess.run(['pdftoppm','-r','60','-f','1','-l','1','-png','/tmp/fb/dl/fin.pdf','/tmp/fb/shots/v330_pdf'])
    pg.click('#exportFile');pg.wait_for_selector('.fmt')
    with pg.expect_download(timeout=25000) as dl2: pg.click('.fmt[data-fmt="word"]')
    w=open(dl2.value.path(),encoding='utf-8-sig',errors='ignore').read()
    chk('R2 Word exportado: cabeçalho com CNPJ, endereço, telefone e e-mail',all(x in w for x in ('98.765.432/0001-10','Rua Nova, 10 - Salvador/BA','(75) 3281-0000','nova@empresa.com.br')))
    # impressão do relatório executivo
    pg.evaluate("document.querySelector('.navbtn[data-route=\"reports\"]').click()");pg.wait_for_timeout(500)
    pg.evaluate("window.print=()=>{window.__printed=true;window.dispatchEvent(new Event('beforeprint'))}");pg.evaluate("printReport&&0") if False else None
    chk('R3 sem erros de JavaScript (empresa e impressão)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# usuário comum vê os dados, sem editar
with App(APP,auth=USER,seed=seed(),port=9640) as b:
    b.open();pg=b.page;pg.evaluate("document.querySelector('.navbtn[data-route=\"settings\"]').click()");pg.wait_for_timeout(500)
    chk('H4 usuário comum vê CNPJ, endereço, telefone e e-mail, mas não edita',pg.query_selector('#coCnpj') is None and all(x in pg.inner_text('#content') for x in ('12.345.678/0001-90','(75) 99999-1234','contato@exemplo.com.br')))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
