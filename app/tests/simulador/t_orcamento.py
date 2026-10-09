import sys,re,json,subprocess,os; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];FX='/tmp/fb/fx/';O='organizations/org1/'
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e and 'Failed to load resource' not in e and 'abrir o PDF' not in e]
def S():
    s=make_seed();s['organizations/org1']={**s['organizations/org1'],'cnpj':'12.345.678/0001-90','companyAddress':'Rua Nova, 10 - Salvador/BA','companyPhone':'(75) 3281-0000','companyEmail':'a@b.com'};return s
def docs(pg,col): return pg.evaluate(f"[...window.__fb.db.entries()].filter(([k])=>k.startsWith('{O}{col}/')&&k.split('/').length===4).map(([k,v])=>({{id:k.split('/')[3],...v}}))")
def go_builder(pg):
    pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_selector('.subtab');pg.click('.subtab[data-tab="builder"]');pg.wait_for_selector('#bbName')
def imp(pg,sel,fn,wait='#spStatus',txt='composições'):
    pg.set_input_files(sel,FX+fn)
    for _ in range(80):
        pg.wait_for_timeout(250)
        if txt in pg.inner_text(wait) and 'lendo' not in pg.inner_text(wait): break
a=App(APP,auth=OWNER,seed=S(),port=9700,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1500,'height':1000})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_selector('.subtab')
    tabs=pg.eval_on_selector_all('.subtab','e=>e.map(x=>[x.textContent.trim(),x.classList.contains("active")])')
    chk('O1 Orçamentos tem as sub-abas "Orçamentos" (ativa) e "Criar novo orçamento"',tabs==[['Orçamentos',True],['Criar novo orçamento',False],['Planejamento e quantitativos',False]],str(tabs))
    chk('O2 a aba Orçamentos continua mostrando a lista de orçamentos e seus botões',pg.query_selector('#addRecord') is not None and pg.query_selector('#importFile') is not None and pg.query_selector('#exportFile') is not None and 'Orçamentos' in pg.inner_text('#content h1'))
    go_builder(pg);pg.fill('#etNew','Etapa A');pg.click('#etAdd');pg.select_option('#bbMode','final')
    chk('O3 "Criar novo orçamento" mostra caixas de seleção SINAPI e ORSE',pg.query_selector('#bbFSinapi') is not None and pg.query_selector('#bbFOrse') is not None and 'SINAPI' in pg.inner_text('.bbSrc >> nth=0') and 'ORSE' in pg.inner_text('.bbSrc >> nth=1'))
    chk('O4 SINAPI vem marcado e o painel do ORSE fica escondido até marcar',pg.is_checked('#bbFSinapi') and not pg.is_checked('#bbFOrse') and pg.is_hidden('#bbPanOrse') and pg.is_visible('#bbPanSinapi'))
    pg.check('#bbFOrse');pg.wait_for_timeout(150)
    hrefs=pg.evaluate("[...document.querySelectorAll('#bbPanSinapi a, #bbPanOrse a')].map(a=>[a.id||a.textContent.trim().slice(0,22),a.href,a.target,a.rel])")
    d={h[0]:h for h in hrefs}
    chk('O5 ORSE: o botão leva à página de download do ORSE (CEHOP-SE), em nova aba',d['opSite'][1]=='https://orse.cehop.se.gov.br/downloads.asp' and d['opSite'][2]=='_blank' and 'noopener' in d['opSite'][3] and d['opQuery'][1]=='https://orse.cehop.se.gov.br/servicos.asp')
    chk('O6 SINAPI: botão do site oficial da CAIXA e links diretos dos relatórios XLSX/PDF dos últimos meses',d['spSite'][1]=='https://www.caixa.gov.br/sinapi' and sum(1 for h in hrefs if re.search(r'sinapi-relatorios-mensais/SINAPI-\d{4}-\d{2}-formato-xlsx\.zip$',h[1]))==3 and sum(1 for h in hrefs if h[1].endswith('formato-pdf.zip'))==3,str([h[1][-34:] for h in hrefs if 'Downloads' in h[1]][:2]))
    pg.uncheck('#bbFOrse');chk('O7 desmarcar ORSE esconde o painel',pg.is_hidden('#bbPanOrse'))
    # ---- importar SINAPI (ZIP com todas as UF)
    imp(pg,'#spFile','SINAPI-2026-08-formato-xlsx.zip')
    st=pg.inner_text('#spStatus')
    chk('O8 importar o ZIP do SINAPI: extrai a Bahia, identifica a referência 08/2026 e conta composições e insumos',re.search(r'SINAPI BA · ref\. 08/2026 · Não desonerado · 5 composições e 5 insumos',st) is not None,st)
    chk('O9 a base fica salva e escolhível, com os três regimes (desonerado, não desonerado e sem encargos)','SINAPI BA · 08/2026' in pg.inner_text('#spBase') and all(x in pg.inner_text('#spRegime') for x in ('Não desonerado','Desonerado','Sem encargos sociais')) and 'sem dados' not in pg.inner_text('#spRegime'))
    dg=pg.evaluate("document.querySelector('#spDiag').textContent")
    chk('O9b o diagnóstico da importação mostra os arquivos ignorados (percentual e famílias) e de qual coluna veio o preço','ignorado' in dg and 'ercentual' in dg and 'Familias' in dg and 'Custo' in dg,dg[:300].replace('\n',' | '))
    pg.fill('#bbQuery','');pg.wait_for_timeout(500);pr=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>r.cells[4].innerText.replace(/\\u00a0/g," "))')
    pg.fill('#bbQuery','composicao numero');pg.wait_for_timeout(400)
    chk('O9c REGRESSÃO: nenhum preço fica em centavos (percentual) e itens do arquivo de percentual não entram',len(pr)>0 and all(float(x.replace('R$ ','').replace('.','').replace(',','.'))>=1 for x in pr) and 'Nenhum item' in pg.inner_text('#bbRes tbody'),str(pr[:5]))
    pg.fill('#bbQuery','87879');pg.wait_for_timeout(300)
    chk('O9d REGRESSÃO: a composição cujo código era fórmula (valor 0) aparece com o código certo',pg.inner_text('#bbRes tbody').find('87879')>=0 and 'R$ 4,60' in pg.inner_text('#bbRes tbody').replace('\xa0',' '),pg.inner_text('#bbRes tbody')[:120])
    # ---- buscar e montar
    pg.fill('#bbQuery','alvenaria bloco');pg.wait_for_timeout(500)
    rows=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>[...r.cells].slice(0,5).map(c=>c.innerText.trim()))')
    chk('O10 busca por palavras mostra código, discriminação, unidade e preço unitário',len(rows)==1 and rows[0][1]=='87521' and 'ALVENARIA DE VEDACAO' in rows[0][2] and rows[0][3]=='M2' and rows[0][4].replace('\xa0',' ')=='R$ 76,80',str(rows))
    pg.fill('#bbQuery','87879');pg.wait_for_timeout(400);chk('O11 busca por código',pg.inner_text('#bbRes tbody tr >> nth=0').find('87879')>=0)
    pg.fill('#bbQuery','87521');pg.wait_for_timeout(400);pg.fill('#bbRes tbody tr >> nth=0 >> .bbQtyAdd','10');pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    pg.fill('#bbQuery','87879');pg.wait_for_timeout(400);pg.fill('#bbRes tbody tr >> nth=0 >> .bbQtyAdd','25,5');pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    t=pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.map(r=>[r.cells[2].innerText,r.querySelector(".bbQ").value,r.querySelector(".bbP").value,r.querySelector(".bbT").innerText.replace(/\\u00a0/g," ")])')
    chk('O12 itens adicionados: preço total = quantidade × preço unitário',t==[['87521','10','76,8','R$ 768,00'],['87879','25,5','4,6','R$ 117,30']],str(t))
    tot=pg.inner_text('#bbTotals').replace('\xa0',' ').replace('\n',' | ')
    chk('O13 totalização: subtotal, BDI de 25% e total do orçamento',all(x in tot for x in ('R$ 885,30','R$ 221,33','R$ 1.106,63')),tot)
    pg.fill('#bbBdi','10');pg.wait_for_timeout(200);tot=pg.inner_text('#bbTotals').replace('\xa0',' ')
    chk('O14 trocar o BDI recalcula na hora (10% → R$ 973,83)','R$ 88,53' in tot and 'R$ 973,83' in tot,tot.replace('\n',' | '))
    pg.fill('#bbTab tbody tr[data-id] >> nth=0 >> .bbQ','20');pg.wait_for_timeout(150)
    chk('O15 editar a quantidade na planilha atualiza o total do item e o total geral sem recarregar a tabela',pg.inner_text('#bbTab tbody tr[data-id] >> nth=0 >> .bbT').replace('\xa0',' ')=='R$ 1.536,00' and 'R$ 1.653,30' in pg.inner_text('#bbTotals').replace('\xa0',' '),pg.inner_text('#bbTotals').replace('\xa0',' ').replace('\n',' | '))
    pg.fill('#bbTab tbody tr[data-id] >> nth=0 >> .bbQ','10');pg.fill('#bbBdi','25')
    # mesmo item duas vezes soma a quantidade
    pg.fill('#bbQuery','87879');pg.wait_for_timeout(300);pg.fill('#bbRes tbody tr >> nth=0 >> .bbQtyAdd','4,5');pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    chk('O16 adicionar o mesmo item de novo soma a quantidade (sem duplicar a linha)',pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.length')==2 and pg.input_value('#bbTab tbody tr[data-id] >> nth=1 >> .bbQ')=='30')
    # ---- regime e insumos
    pg.select_option('#spRegime','CD');pg.fill('#bbQuery','');pg.select_option('#bbKind','ins');pg.fill('#bbQuery','cimento');pg.wait_for_timeout(500)
    chk('O17 trocar para insumos e para o regime "Desonerado" busca na lista correspondente','00000001' in pg.inner_text('#bbRes tbody') and 'CIMENTO' in pg.inner_text('#bbRes tbody'))
    pg.select_option('#bbKind','comp');pg.select_option('#spRegime','SD')
    # ---- item próprio
    pg.click('#bbManualBox summary');n=len(a.dialogs);pg.click('#mAdd');pg.wait_for_timeout(200)
    chk('O18 item próprio sem discriminação é recusado',any('discrimina' in m for _,m in a.dialogs[n:]))
    pg.fill('#mCode','COMP-01');pg.fill('#mDesc','Composição própria: limpeza final de obra');pg.fill('#mUnit','m2');pg.fill('#mQty','100');pg.fill('#mPrice','2,5');pg.click('#mAdd');pg.wait_for_timeout(200)
    chk('O19 item próprio entra na planilha com fonte "Próprio" e total correto',pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.length')==3 and 'Próprio' in pg.inner_text('#bbTab tbody tr[data-id] >> nth=2') and pg.inner_text('#bbTab tbody tr[data-id] >> nth=2 >> .bbT').replace('\xa0',' ')=='R$ 250,00')
    # ---- rascunho
    pg.fill('#bbName','Reforma UBS — acabamentos');pg.wait_for_timeout(200)
    pg.reload();pg.wait_for_timeout(1500);go_builder(pg);pg.wait_for_timeout(500)
    chk('O20 o rascunho (nome, itens e BDI) sobrevive ao recarregar a página',pg.input_value('#bbName')=='Reforma UBS — acabamentos' and pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.length')==3)
    chk('O21 a base importada continua disponível depois de recarregar (guardada no aparelho)','SINAPI BA' in pg.inner_text('#spStatus'),pg.inner_text('#spStatus'))
    # ---- gravar na obra
    n=len(a.dialogs);pg.click('#bbSave');pg.wait_for_timeout(300)
    chk('O22 gravar sem escolher a obra é recusado com aviso',any('Escolha a obra' in m for _,m in a.dialogs[n:]))
    pg.select_option('#bbWork','w1');pg.click('#bbSave');pg.wait_for_timeout(1500)
    bd=[x for x in docs(pg,'budgets') if x.get('budgetName')=='Reforma UBS — acabamentos']
    chk('O23 gravar cria um item de Orçamentos por linha, na obra escolhida, com código, fonte, BDI e valores',len(bd)==3 and all(x['workId']=='w1' and x['category']=='Etapa A' and x['bdi']==25 for x in bd) and any(x['description'].startswith('87521 — ALVENARIA') and x['qty']==10 and x['unitValue']==76.8 and x['source']=='SINAPI' and x['sourceRef']=='2026-08' for x in bd) and any(x['source']=='Próprio' and x['unitValue']==2.5 for x in bd),str([(x['description'][:12],x['qty'],x['unitValue'],x['source']) for x in bd]))
    chk('O24 a gravação é registrada na auditoria',pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='create'&&v.module==='budgets'&&JSON.stringify(v).includes('Criar novo orçamento'))"))
    chk('O25 depois de gravar, volta para a lista de orçamentos já com os itens novos',pg.eval_on_selector('.subtab.active','e=>e.dataset.tab')=='list' and '87521' in pg.inner_text('#content'))
    chk('O26 e o rascunho é limpo',pg.evaluate("JSON.parse(localStorage.getItem('obratop-orc-rascunho-org1')).items.length")==0)
    chk('O27 sem erros de JavaScript (SINAPI e montagem)',not IGN(a.errors),str(IGN(a.errors)[:2]))
    # ---- exportar
    go_builder(pg);pg.fill('#bbName','Exportação teste');pg.fill('#etNew','Etapa A');pg.click('#etAdd');pg.fill('#bbQuery','87521');pg.wait_for_timeout(300);pg.fill('#bbRes tbody tr >> nth=0 >> .bbQtyAdd','3');pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    os.makedirs('/tmp/fb/dl',exist_ok=True)
    with pg.expect_download(timeout=20000) as dl: pg.click('#bbSheetXlsx')
    dl.value.save_as('/tmp/fb/dl/orc.xlsx')
    import openpyxl
    ws=openpyxl.load_workbook('/tmp/fb/dl/orc.xlsx').active;vals=[[c.value for c in r] for r in ws.iter_rows()]
    chk('O28 Excel da planilha: itens com código, descrição, unidade, quantidade e preço, e linha TOTAL',vals[0][:7]==['ITENS','CÓD. SINAPI/ORSE','DESCRIÇÃO DOS SERVIÇOS','UNID','QUANT','PR. UNIT ','PR. TOTAL'] and any(r and r[1]=='87521' and r[4]==3 for r in vals) and any(r and r[2]=='TOTAL' for r in vals),str(vals[2:4]))
    with pg.expect_download(timeout=20000) as dl2: pg.click('#bbSheetPdf')
    dl2.value.save_as('/tmp/fb/dl/orc.pdf');tx=subprocess.run(['pdftotext','-layout','/tmp/fb/dl/orc.pdf','-'],capture_output=True,text=True).stdout
    chk('O29 PDF da planilha: cabeçalho da empresa, título, itens e total do orçamento',all(x in tx for x in ('12.345.678/0001-90','Planilha orçamentária - Exportação teste','87521','TOTAL','Valor da obra')),re.sub(r'\s+',' ',tx)[:160])
    # ---- ORSE
    pg.check('#bbFOrse');pg.wait_for_timeout(200);imp(pg,'#opFile','ORSE_composicoes.csv','#opStatus','composições')
    chk('O30 importar CSV do ORSE: 5 composições, referência detectada ou não, preços com vírgula',re.search(r'ORSE SE · ref\. .+ · Não desonerado · 5 composições',pg.inner_text('#opStatus')) is not None,pg.inner_text('#opStatus'))
    pg.fill('#bbQuery','joelho');pg.wait_for_timeout(400);r=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>[r.dataset.f,r.cells[1].innerText,r.cells[4].innerText.replace(/\\u00a0/g," ")])')
    chk('O31 pesquisa em ORSE mostra a fonte e o preço do ORSE',r==[['ORSE','1001','R$ 19,93']],str(r))
    pg.fill('#bbQuery','alvenaria');pg.wait_for_timeout(400);fontes=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>r.dataset.f)')
    chk('O32 com SINAPI e ORSE marcados, a busca mistura resultados das duas bases',set(fontes)=={'SINAPI','ORSE'},str(fontes))
    pg.fill('#bbQuery','joelho');pg.wait_for_timeout(300);pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(200)
    chk('O33 item do ORSE entra na mesma planilha, com fonte ORSE','ORSE' in pg.inner_text('#bbTab tbody tr[data-id] >> nth=1'))
    pg.uncheck('#bbFSinapi');pg.fill('#bbQuery','alvenaria');pg.wait_for_timeout(400)
    chk('O34 desmarcar SINAPI tira o SINAPI da busca',set(pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>r.dataset.f)'))=={'ORSE'});pg.check('#bbFSinapi')
    imp(pg,'#opFile','ORSE_composicoes.xlsx','#opStatus','5 composições')
    chk('O35 importar XLSX do ORSE (cabeçalho "Serviço" e "Custo Unitário") também funciona','ORSE SE' in pg.inner_text('#opStatus') and '5 composições' in pg.inner_text('#opStatus'),pg.inner_text('#opStatus'))
    # ---- arquivo irreconhecível → conferir colunas
    pg.set_input_files('#opFile',FX+'irreconhecivel.xlsx');pg.wait_for_selector('#mpOk',timeout=15000)
    chk('O36 arquivo com layout desconhecido abre "Conferir colunas" já com as colunas sugeridas e prévia',pg.is_enabled('#mpOk') and 'Item alfa qualquer' in pg.inner_text('.dialog'),pg.inner_text('.dialog')[:120].replace('\n',' | '))
    pg.select_option('#mpCode','0');pg.select_option('#mpDesc','1');pg.select_option('#mpUnit','2');pg.select_option('#mpPrice','3');pg.click('#mpOk');pg.wait_for_timeout(1500)
    chk('O37 depois de confirmar as colunas a base é importada','2 composições' in pg.inner_text('#opStatus'),pg.inner_text('#opStatus'))
    # ---- PDF sem internet para o leitor: aviso amigável
    n=len(a.dialogs);pg.set_input_files('#opFile',FX+'SINAPI_insumos.pdf');pg.wait_for_timeout(6000)
    chk('O38 PDF: se o leitor online não carregar, o app avisa de forma clara e sugere XLSX/CSV',any('Não foi possível abrir o PDF' in m for _,m in a.dialogs[n:]) or any('PDF' in m for _,m in a.dialogs[n:]),str([m[:70] for _,m in a.dialogs[n:]]))
    # ---- excluir base
    n0=pg.eval_on_selector_all('#opBase option','e=>e.length');pg.click('#opDel');pg.wait_for_timeout(800)
    chk('O39 excluir a base salva a remove do aparelho',pg.eval_on_selector_all('#opBase option','e=>e.length')<=n0 and 'nenhuma base ORSE' in pg.inner_text('#opStatus').lower() or pg.eval_on_selector_all('#opBase option','e=>e.length')<n0,pg.inner_text('#opStatus'))
    chk('O40 sem erros de JavaScript (ORSE, exportação e mapeamento)',not IGN(a.errors),str(IGN(a.errors)[:2]))
# ---- base do servidor
srv={'uf':'BA','ref':'2026-09','regimes':{'SD':{'comp':[['87521','ALVENARIA DE VEDACAO','M2',80.1,'','ALV']],'ins':[['00000001','CIMENTO','SC',33,'C','MAT']]}}}
idx=[{'id':'SINAPI-BA-2026-09','fonte':'SINAPI','uf':'BA','ref':'2026-09','file':'bases/sinapi-BA-2026-09.json','counts':{'SD':{'comp':1,'ins':1}}}]
b=App(APP,auth=OWNER,seed=S(),port=9701,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1500,'height':1000})
with b:
    b.ctx.route('**/bases/index.json',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(idx)))
    b.ctx.route('**/bases/sinapi-BA-2026-09.json',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(srv)))
    b.open();pg=b.page;go_builder(pg);pg.click('#spServer');pg.wait_for_selector('#spServerList button')
    chk('S1 "Carregar base do servidor" lista as bases publicadas pelo script mensal','2026' in pg.inner_text('#spServerList') or '09/2026' in pg.inner_text('#spServerList'),pg.inner_text('#spServerList'))
    pg.click('#spServerList button');pg.wait_for_timeout(1200)
    chk('S2 carregar do servidor grava a base neste aparelho e a ativa','ref. 09/2026' in pg.inner_text('#spStatus') and '1 composições' in pg.inner_text('#spStatus'),pg.inner_text('#spStatus'))
# sem bases no servidor
c=App(APP,auth=OWNER,seed=S(),port=9702,viewport={'width':1500,'height':1000})
with c:
    c.open();pg=c.page;go_builder(pg);pg.click('#spServer');pg.wait_for_timeout(1000)
    chk('S3 sem base publicada, o app explica o que fazer (sem erro)','Nenhuma base' in pg.inner_text('#spServerList') or 'Não há bases' in pg.inner_text('#spServerList'),pg.inner_text('#spServerList'))
    chk('S4 sem base carregada, a busca avisa para importar','Importe um arquivo' in pg.inner_text('#spStatus') and 'Marque SINAPI' in pg.inner_text('#bbResInfo') or 'carregue uma base' in pg.inner_text('#bbResInfo'),pg.inner_text('#bbResInfo'))
# ---- perfil sem permissão de gravar
def mem(uid,role,wid):
    s=S();s[O+'members/'+uid]={'email':uid+'@t.com','name':uid,'role':role,'status':'active','workId':wid};s['users/'+uid]={'currentOrg':'org1','email':uid+'@t.com'};return s
with App(APP,auth={'uid':'cons','email':'cons@t.com','emailVerified':True},seed=mem('cons','viewer','w1'),port=9703,viewport={'width':1500,'height':1000}) as d_:
    d_.open();pg=d_.page;go_builder(pg);pg.wait_for_timeout(400)
    chk('P1 perfil Consulta monta e exporta, mas não vê o botão de gravar na obra',pg.is_hidden('#bbSave') and pg.is_visible('#bbSheetXlsx') and 'não pode gravar' in pg.inner_text('#bbMsg'))
# ---- celular
m=App(APP,auth=OWNER,seed=S(),port=9704,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':390,'height':844},mobile=True)
with m:
    m.open();pg=m.page;pg.wait_for_timeout(600);pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_selector('.subtab');pg.tap('.subtab[data-tab="builder"]');pg.wait_for_selector('#bbName');pg.fill('#etNew','Etapa A');pg.tap('#etAdd')
    pg.set_input_files('#spFile',FX+'SINAPI-2026-08-formato-xlsx.zip')
    for _ in range(60):
        pg.wait_for_timeout(250)
        if 'composições' in pg.inner_text('#spStatus') and 'lendo' not in pg.inner_text('#spStatus'): break
    pg.fill('#bbQuery','alvenaria');pg.wait_for_timeout(500);pg.tap('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(300)
    ov=pg.evaluate("Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-Math.min(document.documentElement.clientWidth,screen.width)")
    cards=pg.evaluate("[document.querySelector('#bbRes').classList.contains('mcards'),document.querySelector('#bbTab').classList.contains('mcards'),document.querySelector('#bbTab tbody td[data-label=\"Preço total\"]')!==null]")
    chk('M1 no celular a tela de criar orçamento não estoura a largura e as tabelas viram cartões',ov<=1 and cards==[True,True,True],f'{ov} {cards}')
    pg.screenshot(path='/tmp/fb/shots/v331_mobile.png',full_page=False)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
