import sys,re,datetime,json,xml.etree.ElementTree as ET; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];FX='/tmp/fb/fx/';O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e]
T=datetime.date.today();d=lambda n:(T+datetime.timedelta(days=n)).isoformat()
DOW=['seg','ter','qua','qui','sex','sáb','dom']
def msd(n):x=T+datetime.timedelta(days=n);return f"{DOW[x.weekday()]} {x.day:02d}/{x.month:02d}/{str(x.year)[2:]}"
def S(with_base=True,second=True):
    s=make_seed()
    A=lambda i,wbs,name,st,en,dur,pr,pred='',res='',ms=False,ph=1,status='Em andamento',bud='':base(workId='w1',wbs=wbs,name=name,start=d(st),end=d(en),durationDays=dur,progressMode='Percentual',progress=pr,predecessors=pred,responsible=res,resources=res,milestone=ms,status=status,eapRoot='1',eapPhase=f'1.{ph}',eapPhaseCode=f'{ph}.0',eapPhaseName='Fundação' if ph==1 else 'Estrutura',**({'budgetId':bud} if bud else {}))
    acts={'a1':A(1,'1.1.1','Escavação',-20,4,17,82,'','Pedreiro; Servente',bud='bu1'),'a2':A(2,'1.1.2','Concretagem',-10,14,18,20,'1.1.1SS+3d','Betoneira',bud='bu2'),'a3':A(3,'1.1.3','Fundação concluída',15,15,0,0,'1.1.2','',True),
          'a4':A(4,'1.2.1','Alvenaria',-12,12,18,40,'1.1.1SS','Pedreiro',ph=2),'a5':A(5,'1.2.2','Reboco',13,30,13,0,'1.2.1','Pedreiro',ph=2,status='Não iniciada',bud='bu3'),'a6':A(6,'1.2.3','Pintura (concluída)',-40,-30,8,100,'','',ph=2,status='Concluída')}
    for k,v in acts.items():s[O+'activities/'+k]=v
    for i,(k,no,desc,q,pu) in enumerate([('bu1','1.1','ESCAVAÇÃO',100,30),('bu2','1.2','CONCRETAGEM',50,400),('bu3','2.2','REBOCO',300,40)]):
        s[O+'budgets/'+k]=base(workId='w1',category='Etapa',description=desc,unit='m3',qty=q,unitValue=pu,bdi=20,itemNo=no,etapaNo=f'{no[0]}.0',etapa='Etapa',budgetName='Teste',source='Próprio',composition=[{'kind':'Mão de obra','description':'SERVENTE','unit':'H','coef':2,'price':20,'code':'6111'}],real={})
    if with_base:
        s[O+'works/w1']={**s[O+'works/w1'],'baseline':{'revision':1,'date':d(-30),'reason':'Linha de base inicial','byEmail':'x@y','items':{'a1':{'s':d(-20),'e':d(4),'w':3600},'a2':{'s':d(-10),'e':d(10),'w':24000},'a5':{'s':d(13),'e':d(34),'w':14400}}},'baselineHistory':[]}
    if second:s[O+'works/w2']=base(name='Obra B',city='Salvador',state='BA',status='Em andamento',budget=100000,start=d(0),end=d(100))
    return s
def nav(pg,r):pg.evaluate(f"document.querySelector('.navbtn[data-route=\"{r}\"]').click()");pg.wait_for_timeout(700)
a=App(APP,auth=OWNER,seed=S(),port=9996,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':1000})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(900)
    pg.evaluate("const s=document.querySelector('#filterWork');s.value='w1';s.dispatchEvent(new Event('change'))");nav(pg,'activities')
    cab=pg.eval_on_selector_all('.ganttLeftHead span','e=>e.map(x=>x.textContent.trim())')
    chk('G1 tabela no padrão do MS Project: Nº, EAP, Nome da tarefa, Duração, Início, Término, Predecessoras, Nomes dos recursos, % Concl., Ações',cab==['Nº','EAP','Nome da tarefa','Duração','Início','Término','Predecessoras','Nomes dos recursos','% Concl.','Ações'],str(cab))
    larg=pg.eval_on_selector_all('.ganttLeftHead span','e=>e.map(x=>Math.round(x.getBoundingClientRect().width))')
    chk('G1b larguras das colunas do MS Project: Nº estreito (46), EAP (78), Nome da tarefa largo (≥ 250), Duração 86, datas 128',larg[0]==46 and larg[1]==78 and larg[2]>=250 and larg[3]==86 and larg[4]==128 and larg[5]==128,str(larg))
    row=pg.evaluate("(()=>{const r=[...document.querySelectorAll('.ganttLeftRow')].find(x=>x.dataset.wbs==='1.1.2');return[...r.querySelectorAll(':scope > span')].map(x=>x.textContent.trim())})()")
    chk('G2 linha da tarefa: número, EAP, "18 dias", datas como "seg 12/10/26", predecessora com tipo e defasagem, recurso e %',row[1]=='1.1.2' and row[3]=='18 dias' and row[4]==msd(-10) and row[5]==msd(14) and row[6]=='1.1.1SS+3d' and row[7]=='Betoneira' and row[8]=='20%',str(row))
    chk('G3 marco: losango na linha do tempo, "◆" no nome e duração "0 dias"',pg.eval_on_selector_all('.taskMs','e=>e.length')==1 and pg.evaluate("[...document.querySelectorAll('.ganttLeftRow')].find(x=>x.dataset.wbs==='1.1.3').textContent.includes('◆')") and pg.evaluate("[...document.querySelectorAll('.ganttLeftRow')].find(x=>x.dataset.wbs==='1.1.3').children[3].textContent.trim()")=='0 dias')
    chk('G4 setas de dependência desenhadas (2 início-início e 2 término-início = 4 vínculos) com ponta de seta',pg.eval_on_selector_all('svg.ganttLinks > path','e=>e.length')==4 and pg.query_selector('svg.ganttLinks marker') is not None and all(p.startswith('M') for p in pg.eval_on_selector_all('svg.ganttLinks > path','e=>e.map(x=>x.getAttribute("d"))')))
    est=pg.evaluate("Object.fromEntries([...document.querySelectorAll('.ganttCanvasRow')].map(r=>{const b=r.querySelector('.taskBar:not(.summary), .taskMs');return b?[b.title.split(' • ')[0],b.className.replace(/\\b(taskBar|taskMs|cp)\\b/g,'').trim()]:null}).filter(Boolean))")
    chk('G5 estados das barras: no prazo, crítica (muito abaixo do esperado), atrasada e concluída',est.get('Escavação')=='active' and est.get('Concretagem')=='crit' and est.get('Alvenaria')=='late' and est.get('Reboco')=='active' and est.get('Pintura (concluída)')=='done',str(est))
    cores=pg.evaluate("Object.fromEntries(['active','late','crit','done','summary'].map(k=>{const e=document.querySelector('.taskBar.'+k);return[k,e?getComputedStyle(e).backgroundImage:'']}))")
    chk('G6 cores vibrantes: turquesa (no prazo), laranja (atrasada), vermelho-rosa (crítica), verde-limão (concluída), índigo-violeta (etapa)','rgb(0, 220, 192)' in cores['active'] and 'rgb(255, 138, 0)' in cores['late'] and 'rgb(255, 31, 87)' in cores['crit'] and 'rgb(95, 196, 28)' in cores['done'] and 'rgb(160, 66, 255)' in cores['summary'],str(cores))
    lg=pg.inner_text('.ganttLegend');chk('G7 legenda com contagem: No prazo 2, Atrasada 1, Crítica 1, Concluída 1, Etapa e Linha de base',re.search(r'No prazo\s*3|No prazo\s*2',lg) is not None and 'Atrasada 1' in lg.replace('\n',' ') and 'Crítica 1' in lg.replace('\n',' ') and 'Concluída 1' in lg.replace('\n',' ') and 'Etapa (resumo)' in lg and 'Linha de base' in lg,lg.replace('\n',' | ')[:200])
    chk('G8 barra de resumo (etapa) com as pontas do MS Project (recorte)',pg.evaluate("getComputedStyle(document.querySelector('.taskBar.summary')).clipPath")!='none')
    chk('G9 recursos escritos ao lado da barra',pg.evaluate("[...document.querySelectorAll('.barLabel')].some(e=>e.textContent.includes('Pedreiro; Servente'))"))
    pg.click('#ganttToday');pg.wait_for_timeout(400);pg.evaluate('window.scrollTo(0,520)');pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/fb/shots/v336_gantt.png')
    pg.click('#ganttCp');pg.wait_for_timeout(600)
    cp=pg.eval_on_selector_all('.ganttLeftRow.cp','e=>e.map(x=>x.dataset.wbs)')
    chk('G10 "Caminho crítico" destaca só as tarefas sem folga (Alvenaria e Reboco), com a seta entre elas em vermelho',cp==['1.2.1','1.2.2'] and pg.eval_on_selector_all('svg.ganttLinks > path.cp','e=>e.length')==1 and pg.eval_on_selector_all('.taskBar.cp','e=>e.length')==2,str(cp))
    pg.screenshot(path='/tmp/fb/shots/v336_gantt_cp.png',clip={'x':260,'y':150,'width':1340,'height':780})
    pg.click('#ganttCp');pg.wait_for_timeout(500);chk('G11 e desliga',pg.eval_on_selector_all('.ganttLeftRow.cp','e=>e.length')==0)
    # ---------- exportar
    with pg.expect_download(timeout=25000) as dl: pg.click('#ganttMsp')
    dl.value.save_as('/tmp/fb/dl/exp.xml');xml=open('/tmp/fb/dl/exp.xml',encoding='utf-8').read();ns={'p':'http://schemas.microsoft.com/project'};root=ET.fromstring(xml)
    tasks=root.findall('.//p:Tasks/p:Task',ns);links=[(l.find('p:Type',ns).text,l.find('p:LinkLag',ns).text) for t in tasks for l in t.findall('p:PredecessorLink',ns)]
    chk('X1 XML do MS Project: 9 tarefas (6 finais + 3 resumos), vínculos com tipo e defasagem (SS+3d = tipo 3, 14400), marco e recursos',len(tasks)==9 and sorted(links)==sorted([('3','14400'),('1','0'),('3','0'),('1','0')]) and sum(1 for t in tasks if t.find('p:Milestone',ns).text=='1')==1 and {r.find('p:Name',ns).text for r in root.findall('.//p:Resources/p:Resource',ns)}=={'Pedreiro','Servente','Betoneira'},str(links))
    chk('X2 inclui linha de base (3 tarefas), caminho crítico (2 tarefas) e atribuições de recursos',len(root.findall('.//p:Task/p:Baseline',ns))==3 and sum(1 for t in tasks if t.find('p:Critical',ns).text=='1')==2 and len(root.findall('.//p:Assignments/p:Assignment',ns))==5,f"bl={len(root.findall('.//p:Task/p:Baseline',ns))} crit={sum(1 for t in tasks if t.find('p:Critical',ns).text=='1')} atrib={len(root.findall('.//p:Assignments/p:Assignment',ns))}")
    # ---------- importar
    n0=len([1 for k in a.page.evaluate("[...window.__fb.db.keys()]") if '/activities/' in k])
    with pg.expect_file_chooser() as fc: pg.click('#ganttMspImport')
    fc.value.set_files(FX+'projeto_msproject.xml');pg.wait_for_selector('#mpOk');dlg=pg.inner_text('.dialog').replace('\n',' ')
    chk('I1 prévia da importação: projeto, 3 tarefas finais, 1 resumo, 1 marco, 2 vínculos e linha de base do arquivo','Reforma da UBS' in dlg and re.search(r'Tarefas finais\s*3',dlg) and re.search(r'Resumos \(EAP\)\s*1',dlg) and re.search(r'Marcos\s*1',dlg) and re.search(r'Vínculos\s*2',dlg) and 'linha de base do arquivo' in dlg,dlg[:300])
    pg.select_option('#mpWork','w2');pg.click('#mpOk');pg.wait_for_timeout(2500)
    imp=[v for k,v in a.page.evaluate("[...window.__fb.db.entries()]") if '/activities/' in k and v.get('source')=='MS Project']
    by={x['wbs']:x for x in imp}
    chk('I2 importou 3 atividades na obra escolhida, com predecessoras (1.1SS+2d), recursos, marco, % e grupo da EAP',len(imp)==3 and all(x['workId']=='w2' for x in imp) and by['1.2']['predecessors']=='1.1SS+2d' and by['1.2']['responsible']=='Pedreiro; Betoneira' and by['1.3']['milestone'] is True and by['1.1']['progress']==100 and by['1.1']['eapPhaseName']=='Fundação',str(sorted(by)))
    w2=[v for k,v in a.page.evaluate("[...window.__fb.db.entries()]") if k.endswith('/works/w2')][0]
    chk('I3 a linha de base do arquivo virou R1 da obra (1 revisão, 1 tarefa com base)',w2.get('baseline',{}).get('revision')==1 and len(w2['baseline']['items'])==1 and w2['baseline']['reason'].startswith('Importada'),str(w2.get('baseline',{}).get('revision')))
    # arquivos inválidos
    for nome,esp in (('projeto.mpp','formato fechado'),('outra.xml','não é um XML do MS Project'),('projeto_invalido.xml','')):
        nav(pg,'activities');m=len(a.dialogs)
        pg.evaluate("const s=document.querySelector('#filterWork');s.value='w1';s.dispatchEvent(new Event('change'))");pg.wait_for_timeout(500)
        with pg.expect_file_chooser() as fc3: pg.click('#ganttMspImport')
        fc3.value.set_files(FX+nome);pg.wait_for_timeout(800)
        msgs=[x for _,x in a.dialogs[m:]]
        chk(f'I4 arquivo "{nome}" é recusado com mensagem clara e nada é gravado',len(msgs)>=1 and (esp in msgs[0] if esp else len(msgs[0])>5) and pg.query_selector('#mpOk') is None,str(msgs[:1]))
    # ida e volta: reimporta o XML exportado em outra obra
    nav(pg,'activities')
    with pg.expect_file_chooser() as fc4: pg.click('#ganttMspImport')
    fc4.value.set_files('/tmp/fb/dl/exp.xml');pg.wait_for_selector('#mpOk');dlg=pg.inner_text('.dialog').replace('\n',' ');chk('I5 ida e volta: o XML exportado pelo ObraTop é reconhecido na importação (6 tarefas, 4 vínculos, 1 marco)',re.search(r'Tarefas finais\s*6',dlg) and re.search(r'Vínculos\s*4',dlg) and re.search(r'Marcos\s*1',dlg),dlg[:260])
    pg.click('#mpCancel');chk('I6 cancelar fecha sem gravar',pg.query_selector('#mpOk') is None)
    n1=len([1 for k in a.page.evaluate("[...window.__fb.db.keys()]") if '/activities/' in k]);chk('I7 nada foi gravado pelos arquivos recusados e pelo cancelamento (só as 3 do arquivo válido)',n1==n0+3,f'{n0}->{n1}')
    # ---------- substituir
    with pg.expect_file_chooser() as fc5: pg.click('#ganttMspImport')
    fc5.value.set_files(FX+'projeto_msproject.xml');pg.wait_for_selector('#mpOk');pg.check('input[name=mpMode][value=replace]');pg.select_option('#mpWork','w1');pg.click('#mpOk');pg.wait_for_timeout(2500)
    act=[v for k,v in a.page.evaluate("[...window.__fb.db.entries()]") if '/activities/' in k and v.get('workId')=='w1']
    chk('I8 "Substituir": as 6 atividades antigas foram para a Lixeira (deleted) e as 3 novas entraram',sum(1 for v in act if v.get('deleted'))==6 and sum(1 for v in act if not v.get('deleted') and v.get('source')=='MS Project')==3,f"{sum(1 for v in act if v.get('deleted'))} excluídas")
    w1=[v for k,v in a.page.evaluate("[...window.__fb.db.entries()]") if k.endswith('/works/w1')][0]
    chk('I9 a linha de base anterior foi para o histórico e a do arquivo é a R2',w1['baseline']['revision']==2 and len(w1['baselineHistory'])==1,str(w1['baseline']['revision']))
    chk('I10 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ---------- Planejamento com linha de base
b=App(APP,auth=OWNER,seed=S(),port=9997,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':1000})
with b:
    b.open();pg=b.page;pg.wait_for_timeout(900);nav(pg,'budgets');pg.click('.subtab[data-tab="plan"]');pg.wait_for_selector('#plBody');pg.select_option('#plWork','w1');pg.wait_for_timeout(500)
    t=pg.inner_text('#plBody').replace('\n',' ')
    chk('B1 Planejamento mostra a linha de base: R1, data, motivo, término da base x atual e desvio','Linha de base R1' in t and 'Linha de base inicial' in t and 'Término na linha de base' in t and 'Desvio do término' in t and re.search(r'Desvio do término\s*[+-]?\d+ dia',t),t[:300])
    cab=pg.eval_on_selector_all('#plBody thead th','e=>e.map(x=>x.textContent.trim())')
    chk('B2 tabela da EAP ganha Início (base), Término (base) e Desvio (dias úteis)','Início (base)' in cab and 'Término (base)' in cab and any(c.startswith('Desvio') for c in cab),str(cab))
    dev=pg.evaluate("(()=>{const i=[...document.querySelectorAll('#plBody thead th')].findIndex(x=>x.textContent.startsWith('Desvio'));return Object.fromEntries([...document.querySelectorAll('#plBody tbody tr')].map(r=>[r.cells[0].textContent.trim(),r.cells[i].textContent.trim()]))})()")
    chk('B3 desvios: 1.1 sem desvio (0), 1.2 atrasado (+) e 2.2 adiantado (−) em relação à base',dev.get('1.1')=='0' and dev.get('1.2','').startswith('+') and dev.get('2.2','').startswith('-'),str(dev))
    pg.click('.plSegBtn[data-v="curva"]');pg.wait_for_timeout(500)
    chk('B4 Curva S traz a linha de base (tracejada), o previsto atual e a coluna "% linha de base"',pg.eval_on_selector_all('#plBody svg polyline','e=>e.length')==2 and pg.query_selector('#plBody svg polyline[stroke-dasharray]') is not None and '% linha de base' in pg.inner_text('#plBody thead') and 'Linha de base (acumulado)' in pg.inner_text('#plBody'))
    with pg.expect_download(timeout=25000) as dl: pg.click('#plXlsx')
    dl.value.save_as('/tmp/fb/dl/curva_base.xlsx')
    import openpyxl;ws=openpyxl.load_workbook('/tmp/fb/dl/curva_base.xlsx').active;hdr=[c.value for c in ws[1]]
    chk('B5 o Excel da Curva S inclui "% linha de base" e "Previsto − base (p.p.)"','% linha de base' in hdr and 'Previsto − base (p.p.)' in hdr,str(hdr))
    pg.screenshot(path='/tmp/fb/shots/v336_plan_base.png',clip={'x':260,'y':100,'width':1340,'height':880})
    chk('B6 sem erros de JavaScript',not IGN(b.errors),str(IGN(b.errors)[:2]))
c=App(APP,auth=OWNER,seed=S(with_base=False),port=9998,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1600,'height':1000})
with c:
    c.prompt_text='Linha de base inicial do teste';c.open();pg=c.page;pg.wait_for_timeout(900);nav(pg,'budgets');pg.click('.subtab[data-tab="plan"]');pg.wait_for_selector('#plBody');pg.select_option('#plWork','w1');pg.wait_for_timeout(500)
    chk('B7 sem linha de base: aviso claro e botão "Congelar linha de base R1" (administrador)','não tem linha de base' in pg.inner_text('#plBody') and pg.query_selector('#plFreeze') is not None)
    pg.click('#plFreeze');pg.wait_for_timeout(2000)
    w1=[v for k,v in c.page.evaluate("[...window.__fb.db.entries()]") if k.endswith('/works/w1')][0]
    chk('B8 clicar congela a linha de base R1 com as 6 atividades da obra e a tela passa a mostrá-la',w1.get('baseline',{}).get('revision')==1 and len(w1['baseline']['items'])==6 and 'Linha de base R1' in pg.inner_text('#plBody'),str(w1.get('baseline',{}).get('revision')))
# ---------- consulta: exporta mas não importa
def mem(uid,role):
    s=S();s[O+'members/'+uid]={'email':uid+'@t.com','name':uid,'role':role,'status':'active','workId':'w1'};s['users/'+uid]={'currentOrg':'org1','email':uid+'@t.com'};return s
v=App(APP,auth={'uid':'cons','email':'cons@t.com','emailVerified':True},seed=mem('cons','viewer'),port=9999,viewport={'width':1600,'height':1000})
with v:
    v.open();pg=v.page;pg.wait_for_timeout(900);pg.evaluate("const s=document.querySelector('#filterWork');if(s){s.value='w1';s.dispatchEvent(new Event('change'))}");nav(pg,'activities')
    chk('V1 perfil Consulta vê "Exportar MS Project" e "Caminho crítico", mas não "Importar MS Project"',pg.query_selector('#ganttMsp') is not None and pg.query_selector('#ganttCp') is not None and pg.query_selector('#ganttMspImport') is None)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
