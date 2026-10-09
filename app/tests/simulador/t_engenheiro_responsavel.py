import sys,re,subprocess,csv,io; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/'
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
def seed():
    s=make_seed()
    s[O+'works/w1']={**s[O+'works/w1'],'engineer':'Engº João Silva'}
    s['organizations/org1']={**s['organizations/org1'],'defaultEngineer':'Engº Padrão da Empresa'}
    return s
def export(pg,card,fmt):
    pg.click('.navbtn[data-route="reports"]');pg.wait_for_selector(f'.exportAny[data-type="{card}"]')
    pg.click(f'.exportAny[data-type="{card}"]');pg.wait_for_selector('.fmt')
    with pg.expect_download(timeout=25000) as dl: pg.click(f'.fmt[data-fmt="{fmt}"]')
    import os;os.makedirs('/tmp/fb/dl',exist_ok=True);ext={'excel':'xlsx','word':'doc','pdf':'pdf','csv':'csv'}[fmt];dest=f'/tmp/fb/dl/{card}.{ext}';dl.value.save_as(dest);return dest
a=App(APP,auth=OWNER,seed=seed(),port=9500,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1500,'height':950})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(800)
    # ---- CSV do relatório executivo
    p=export(pg,'executive','csv');txt=open(p,encoding='utf-8-sig').read()
    rows=list(csv.reader(io.StringIO(txt),delimiter=';'));hdr=rows[0];body=[dict(zip(hdr,r)) for r in rows[1:]]
    chk('E1 relatório executivo: a coluna "Obra" some e entra "Engº Responsável"','Engº Responsável' in hdr and 'Obra' not in hdr,str(hdr[:12]))
    chk('E2 "Engº Responsável" é a 10ª e última coluna visível (a que antes era "Obra")',hdr.index('Engº Responsável')==9,f'posição {hdr.index("Engº Responsável")+1}')
    mw1=[r for r in body if r['Módulo']!='Obras' and r['Engº Responsável']=='Engº João Silva'];mw2=[r for r in body if r['Módulo']!='Obras' and r['Engº Responsável']=='Engº Padrão da Empresa']
    chk('E3 linhas dos módulos mostram o engenheiro da obra (Obra A) ou o padrão da empresa (Obra B, sem engenheiro)',len(mw1)>=1 and len(mw2)>=1,f'{len(mw1)} com João, {len(mw2)} com o padrão')
    wr={r['Nome da obra']:r['Engº Responsável'] for r in body if r['Módulo']=='Obras'}
    chk('E4 nas linhas de Obras: engenheiro próprio ou, se vazio, o padrão',wr.get('Obra A')=='Engº João Silva' and wr.get('Obra B')=='Engº Padrão da Empresa',str(wr))
    # ---- PDF
    p=export(pg,'executive','pdf');t=subprocess.run(['pdftotext','-layout',p,'-'],capture_output=True,text=True).stdout
    head=[l for l in t.split('\n') if 'Módulo' in l and 'Progresso' in l]
    chk('E5 PDF: o cabeçalho da tabela termina em "Engº Responsável" (sem coluna "Obra")',head and head[0].strip().endswith('Engº Responsável') and not re.search(r'\bObra\s*$',head[0]),(head or ['(sem cabeçalho)'])[0][-70:])
    chk('E6 PDF: título "Relatório executivo" e o nome do engenheiro nas linhas','Relatório executivo' in t and 'Engº João Silva' in t and 'Engº Padrão da Empresa' in t)
    # ---- Excel
    p=export(pg,'executive','excel')
    import openpyxl
    ws=openpyxl.load_workbook(p).active;xh=[c.value for c in ws[1]]
    chk('E7 Excel: tem "Engº Responsável" e não tem "Obra"','Engº Responsável' in xh and 'Obra' not in xh,str(xh[:12]))
    # ---- Word
    p=export(pg,'executive','word');w=open(p,encoding='utf-8-sig',errors='ignore').read()
    chk('E8 Word: cabeçalho com "Engº Responsável" e sem coluna "Obra"','<th>Engº Responsável</th>' in w and '<th>Obra</th>' not in w)
    # ---- outro relatório não muda
    p=export(pg,'finance','csv');h2=list(csv.reader(io.StringIO(open(p,encoding='utf-8-sig').read()),delimiter=';'))[0]
    chk('E9 os demais relatórios (ex.: Financeiro) continuam com a coluna "Obra"','Obra' in h2 and 'Engº Responsável' not in h2,str(h2[:5]))
    # ---- cadastro de obras
    pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(500)
    chk('E10 a tela Obras ganhou a coluna "Engº Responsável"','Engº Responsável' in pg.inner_text('#content table thead'))
    pg.click('#addRecord');pg.wait_for_selector('#recordForm')
    chk('E11 o formulário de obra tem o campo "Engº Responsável"','Engº Responsável' in pg.inner_text('#recordForm'))
    pg.click('#cancelModal')
    # ---- Configurações
    pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(500)
    chk('E12 Configurações mostra o engenheiro padrão já gravado',pg.input_value('#defEngineer')=='Engº Padrão da Empresa')
    pg.fill('#defEngineer','Engº Maria Souza');pg.click('#saveCompany');pg.wait_for_timeout(800)
    org=pg.evaluate("window.__fb.db.get('organizations/org1')")
    chk('E13 salvar grava o engenheiro padrão na empresa e registra na auditoria',org.get('defaultEngineer')=='Engº Maria Souza' and pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='config-empresa')"))
    p=export(pg,'executive','csv');rows=list(csv.reader(io.StringIO(open(p,encoding='utf-8-sig').read()),delimiter=';'));h=rows[0]
    chk('E14 o novo padrão passa a valer nos relatórios',any(r[h.index('Engº Responsável')]=='Engº Maria Souza' for r in rows[1:]))
    chk('E15 sem erros de JavaScript',not IGN(a.errors),str(IGN(a.errors)[:2]))
# assistente de nova obra grava o engenheiro
with App(APP,auth=OWNER,seed=seed(),port=9502,viewport={'width':1500,'height':950}) as c:
    c.open();pg=c.page;pg.click('.navbtn[data-route="works"]');pg.wait_for_timeout(500);pg.click('#wizardBtn');pg.wait_for_selector('#wzName')
    pg.fill('#wzName','Obra do Assistente');pg.fill('#wzClient','Cli');pg.fill('#wzEngineer','Engº Carlos Lima');pg.fill('#wzStart','2026-11-02');pg.fill('#wzEnd','2027-05-28')
    pg.click('#wzNext');pg.click('label.wzFamily:has(input[value=BLANK])');pg.wait_for_timeout(200);pg.click('#wzNext');pg.wait_for_selector('#wzCreate');pg.click('#wzCreate');pg.wait_for_timeout(1500)
    wk=pg.evaluate("[...window.__fb.db.entries()].filter(([k])=>k.startsWith('organizations/org1/works/')).map(([k,v])=>v).find(v=>v.name==='Obra do Assistente')")
    chk('E17 o assistente de nova obra pede e grava o Engº Responsável',wk and wk.get('engineer')=='Engº Carlos Lima',str(wk and wk.get('engineer')))
with App(APP,auth=USER,seed=seed(),port=9501) as b:
    b.open();pg=b.page;pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(500)
    chk('E16 usuário comum vê o engenheiro padrão, mas não consegue alterar',pg.query_selector('#defEngineer') is None and 'Engº Padrão da Empresa' in pg.inner_text('#content'))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
