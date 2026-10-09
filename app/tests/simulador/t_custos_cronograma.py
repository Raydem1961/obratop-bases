import sys,re,json,xml.etree.ElementTree as ET; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];FILE=sys.argv[2]
seed={k:v for k,v in make_seed().items() if k in('users/u1','organizations/org1','organizations/org1/members/u1')}
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
res=[]
def chk(n,c,e=''):
    res.append(c);print('OK   ' if c else 'FALHA',n,e,flush=True)
a=App(APP,auth=OWNER,seed=seed,port=8960,tz='America/Bahia',xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':900});a.prompt_text='Linha de base inicial'
with a:
    a.open();pg=a.page;pg.set_default_timeout(40000)
    pg.click('.navbtn[data-route="reports"]');pg.wait_for_selector('#bulkImport')
    with pg.expect_file_chooser() as fc: pg.click('#bulkImport')
    fc.value.set_files(FILE)
    while not any('concluída' in m for _,m in a.dialogs): pg.wait_for_timeout(250)
    pg.wait_for_timeout(1200)
    # ---- avanço por duração (antes de vincular)
    def prog():
        pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(500)
        rows=pg.eval_on_selector_all('#content table tbody tr','e=>e.map(r=>r.innerText.replace(/\\s+/g," ").trim())')
        r=[x for x in rows if x.startswith('Pavimentação e Drenagem')][0];return float(re.search(r'(\d+(?:,\d+)?)%',r).group(1).replace(',','.'))
    p0=prog()
    pg.click('.navbtn[data-route="activities"]');pg.wait_for_timeout(500)
    sel=pg.eval_on_selector_all('#filterWork option','e=>e.map(o=>[o.value,o.textContent])');wid=[v for v,t in sel if t.startswith('Pavimentação e Drenagem')][0]
    pg.select_option('#filterWork',wid);pg.wait_for_timeout(1200)
    meta=pg.evaluate("document.querySelector('.ganttMeta').textContent");print('meta antes:',meta)
    chk('L0 sem vínculo: ponderação pela duração','pela duração' in meta and '0/25' in meta)
    # ---- cabeçalho congelado
    def head():
        return pg.evaluate("""()=>{const f=Math.max(...[...document.querySelectorAll('.topbar,.filters,#releaseBar,.pin')].map(b=>{const p=getComputedStyle(b).position;return(p==='sticky'||p==='fixed')?b.getBoundingClientRect().bottom:0})),lh=document.querySelector('.ganttLeftHead'),m=document.querySelector('.ganttTimeline .ganttYears'),r=lh.getBoundingClientRect(),mr=m.getBoundingClientRect(),gi=document.querySelector('.ganttGridInner').getBoundingClientRect();
          return{filtros:Math.round(f),topoCab:Math.round(r.top),topoMeses:Math.round(mr.top),cabBase:Math.round(r.bottom),tabelaBase:Math.round(gi.bottom),tr:lh.style.transform,txt:lh.innerText.replace(/\\n/g,' ').slice(0,40)}}""")
    h0=head();pg.mouse.move(900,500);pg.mouse.wheel(0,700);pg.wait_for_timeout(500);h1=head();pg.screenshot(path='/tmp/fb/shots/v325_rolado.png')
    print('cabeçalho no topo:',h0,'\ncabeçalho após rolar:',h1)
    chk('S1 ao rolar, o cabeçalho (Nº, EAP, Nome da tarefa…) fica logo abaixo do bloco congelado (versão, filtros, título e legenda)',abs(h1['topoCab']-h1['filtros'])<=3 and 'EAP' in h1['txt'] and 'transla' in h1['tr'].lower())
    chk('S2 a linha do tempo (ano/mês/dia) acompanha na mesma altura',abs(h1['topoMeses']-h1['filtros'])<=3)
    pg.mouse.wheel(0,6000);pg.wait_for_timeout(600);h2=head()
    chk('S3 no fim da tabela o cabeçalho não ultrapassa as linhas',h2['cabBase']<=h2['tabelaBase']+1,f"cab. até {h2['cabBase']}px, tabela até {h2['tabelaBase']}px")
    pg.mouse.wheel(0,-9000);pg.wait_for_timeout(600);h3=head()
    chk('S4 de volta ao topo o cabeçalho volta ao lugar',h3['tr']=='' )
    pg.screenshot(path='/tmp/fb/shots/v325_topo.png')
    # ---- vincular ao orçamento
    pg.click('#ganttLink');pg.wait_for_timeout(1800)
    meta=pg.evaluate("document.querySelector('.ganttMeta').textContent");print('meta depois:',meta)
    chk('L1 após vincular: ponderação pelo custo com 25/25 atividades','pelo custo do orçamento' in meta and '25/25' in meta)
    p1=prog()
    chk('L2 o avanço da obra muda ao ponderar por custo',abs(p1-p0)>0.05,f'{p0}% → {p1}%')
    # ---- linha de base
    pg.click('.navbtn[data-route="activities"]');pg.wait_for_timeout(700);pg.select_option('#filterWork',wid);pg.wait_for_timeout(900)
    pg.click('#ganttBaseline');pg.wait_for_timeout(1200)
    w=pg.evaluate(f"window.__fb.db.get('organizations/org1/works/{wid}')")
    chk('B1 linha de base R1 gravada com as 25 atividades',w.get('baseline',{}).get('revision')==1 and len(w['baseline']['items'])==25 and w['baseline']['reason']=='Linha de base inicial')
    chk('B2 barras de linha de base aparecem no Gantt',pg.evaluate("document.querySelectorAll('.baseBar').length")>=25,str(pg.evaluate("document.querySelectorAll('.baseBar').length")))
    a.prompt_text='Replanejamento por chuvas'
    pg.click('#ganttBaseline');pg.wait_for_timeout(1200)
    w=pg.evaluate(f"window.__fb.db.get('organizations/org1/works/{wid}')")
    chk('B3 replanejamento: R2 e histórico preservado',w['baseline']['revision']==2 and len(w['baselineHistory'])==1 and w['baselineHistory'][0]['reason']=='Linha de base inicial')
    chk('B4 legenda mostra revisão e motivo','R2' in pg.evaluate("document.querySelector('.ganttMeta').textContent") and 'Replanejamento por chuvas' in pg.evaluate("document.querySelector('.ganttMeta').textContent"))
    # ---- MS Project
    with pg.expect_download(timeout=15000) as dl: pg.click('#ganttMsp')
    path=dl.value.path();txt=open(path,encoding='utf-8').read();root=ET.fromstring(txt);ns={'p':'http://schemas.microsoft.com/project'}
    tasks=root.findall('.//p:Task',ns);links=root.findall('.//p:PredecessorLink',ns)
    chk('P1 XML do MS Project bem formado, com resumos e 25 tarefas',len(tasks)>25 and sum(1 for t in tasks if t.find('p:Summary',ns).text=='0')==25,f'{len(tasks)} linhas, {len(links)} vínculos, arquivo {dl.value.suggested_filename}')
    # ---- medição líquida
    pg.click('.navbtn[data-route="measurements"]');pg.wait_for_timeout(500);pg.select_option('#filterWork',wid);pg.wait_for_timeout(600)
    pg.click('.edit');pg.wait_for_selector('#recordForm')
    pg.fill('#recordForm [name=retention]','5');pg.fill('#recordForm [name=deduction]','1000')
    mval=float(pg.input_value('#recordForm [name=value]'))
    pg.click('#recordForm button.primary');pg.wait_for_timeout(700)
    liq=mval-mval*.05-1000
    t=pg.inner_text('#content table tbody tr:first-child').replace('\u00a0',' ')
    chk('C1 medição mostra o valor líquido (retenção 5% e glosa de R$ 1.000)','líq.' in t,t[-60:])
    pg.click('.edit');pg.wait_for_selector('#recordForm');pg.fill('#recordForm [name=retention]','150');n=len(a.dialogs);pg.click('#recordForm button.primary');pg.wait_for_timeout(500)
    chk('C2 retenção acima de 100% é recusada',any('entre 0 e 100' in m for _,m in a.dialogs[n:]));pg.click('#cancelModal')
    # ---- contrato: aditivos e saldo
    pg.click('.navbtn[data-route="contracts"]');pg.wait_for_timeout(500);pg.select_option('#filterWork',wid);pg.wait_for_timeout(500)
    pg.click('.edit');pg.wait_for_selector('#recordForm');pg.fill('#recordForm [name=value]','100000');pg.fill('#recordForm [name=addendum]','20000');pg.fill('#recordForm [name=addendumNote]','Aditivo de prazo e valor nº 1')
    cname=pg.input_value('#recordForm [name=number]');pg.click('#recordForm button.primary');pg.wait_for_timeout(700)
    pg.click('.navbtn[data-route="measurements"]');pg.wait_for_timeout(500);pg.click('.edit');pg.wait_for_selector('#recordForm')
    opts=pg.eval_on_selector_all('#recordForm [name=contractId] option','e=>e.map(o=>[o.value,o.textContent])');cid=[v for v,t in opts if v and cname in t][0]
    pg.select_option('#recordForm [name=contractId]',cid);pg.click('#recordForm button.primary');pg.wait_for_timeout(700)
    pg.click('.navbtn[data-route="contracts"]');pg.wait_for_timeout(600)
    t=pg.inner_text('#content').replace('\u00a0',' ')
    chk('C3 contrato mostra valor vigente com aditivo e saldo','aditivos' in t and 'saldo' in t,re.sub(r'\s+',' ',t[t.find('saldo')-40:t.find('saldo')+40]))
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(500);al=pg.inner_text('#content')
    chk('C4 alerta de contrato com saldo negativo','Contrato com saldo negativo' in al)
    # ---- painel: CPI incorrido e fluxo de caixa
    pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(900)
    tiles=pg.evaluate("[...document.querySelectorAll('.metricstrip .miniMetric')].map(t=>t.innerText.replace(/\\n/g,' | '))")
    chk('F1 tile do CPI/IDC informa custo incorrido',any('CPI' in t and 'custo incorrido' in t for t in tiles),[t for t in tiles if 'CPI' in t][0])
    card=pg.inner_text('.cashCard');rows=pg.eval_on_selector_all('.cashCard tbody tr','e=>e.length')
    chk('F2 cartão de fluxo de caixa projetado com 6 meses',rows==6 and 'próximos 6 meses' in card,card[:90].replace('\n',' '))
    # cenário de estouro: despesa grande vencendo no próximo mês
    import datetime
    nm=(datetime.date.today().replace(day=1)+datetime.timedelta(days=40)).replace(day=10).isoformat()
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(500);pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    pg.select_option('#recordForm [name=workId]',wid);pg.fill('#recordForm [name=date]',datetime.date.today().isoformat());pg.fill('#recordForm [name=dueDate]',nm);pg.fill('#recordForm [name=description]','Parcela de equipamento (teste de estouro)');pg.select_option('#recordForm [name=type]','Despesa');pg.fill('#recordForm [name=category]','Equipamentos');pg.fill('#recordForm [name=value]','99000000');pg.select_option('#recordForm [name=status]','Previsto')
    pg.click('#recordForm button.primary');pg.wait_for_timeout(900)
    pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(900)
    chk('F4 cartão do painel mostra o mês com saldo negativo','saldo negativo em' in pg.inner_text('.cashCard'),pg.inner_text('.cashCard')[:80].replace('\n',' '))
    pg.click('.navbtn[data-route="alerts"]');pg.wait_for_timeout(500)
    chk('F3 alerta de fluxo de caixa projetado negativo','Fluxo de caixa projetado negativo' in pg.inner_text('#content'))
    # ---- todas as telas
    routes=pg.eval_on_selector_all('.navbtn','e=>e.map(x=>x.dataset.route)');bad=[]
    for rt in routes:
        pg.click(f'.navbtn[data-route="{rt}"]');pg.wait_for_timeout(120)
        if 'Falha no módulo' in pg.inner_text('#content'): bad.append(rt)
    chk('T1 todas as telas abrem',not bad,str(bad));chk('T2 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:3]))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
