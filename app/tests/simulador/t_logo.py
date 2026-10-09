import sys,re,subprocess,os,datetime; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/';IMG='/tmp/fb/img/'
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
IGN=lambda errs:[e for e in errs if "reading 'update'" not in e and 'xlsx.full.min.js' not in e and '404' not in e]
def seed():
    s=make_seed();s[O.rstrip('/')]={**s.get(O.rstrip('/'),{}),'cnpj':'12.345.678/0001-90'};return s
def pick(pg,name):
    n0=len(a.dialogs) if 'a' in globals() else 0
    pg.set_input_files('#logoFile',IMG+name)
    for _ in range(40):
        pg.wait_for_timeout(250)
        if pg.is_enabled('#logoSave') or len(a.dialogs)>n0: break
    pg.wait_for_timeout(150)
# ===== administrador: enviar, salvar, exibir
a=App(APP,auth=OWNER,seed=seed(),port=9100,viewport={'width':1500,'height':900})
with a:
    a.open();pg=a.page;pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(500)
    chk('L1 Configurações mostra o cartão "Logo da empresa" com envio de arquivo e botão salvar desativado',pg.query_selector('#logoFile') is not None and pg.is_disabled('#logoSave') and 'Logo da empresa' in pg.inner_text('#content'))
    pg.wait_for_timeout(1500)
    pick(pg,'logo_wide.png');info=pg.inner_text('#logoInfo')
    pg.select_option('#filterWork','');pg.wait_for_timeout(600)   # força um redesenho da tela depois de escolher o arquivo
    chk('L2b a imagem escolhida sobrevive ao redesenho da tela (pré-visualização e botão Salvar continuam)',pg.is_enabled('#logoSave') and pg.evaluate("document.querySelector('#logoPreviewImg').naturalWidth")==480)
    try: pg.wait_for_function("document.querySelector('#logoPreviewImg').naturalWidth>0",timeout=8000)
    except Exception: pass
    chk('L2 PNG 1200×400 é reduzido para 480×160 e pré-visualizado',('480×160' in info) and pg.is_enabled('#logoSave') and pg.evaluate("document.querySelector('#logoPreviewImg').naturalWidth")==480,info)
    pg.click('#logoSave');pg.wait_for_timeout(900)
    org=pg.evaluate("window.__fb.db.get('organizations/org1')");br=org.get('branding') or {}
    chk('L3 logo gravado na empresa como PNG em base64 dentro do limite',br.get('logo','').startswith('data:image/png;base64,') and len(br['logo'])<=260000 and br['w']==480 and br['h']==160,f"{len(br.get('logo',''))} caracteres")
    chk('L4 a auditoria registra a definição do logo',pg.evaluate("[...window.__fb.db.values()].some(v=>v&&v.action==='branding-logo')"))
    def hdr():
        return pg.evaluate("(()=>{const i=document.querySelector('#orgLogo'),r=i.getBoundingClientRect();return{visivel:!i.hidden&&r.width>0,natural:i.naturalWidth,altura:Math.round(r.height)}})()")
    bad=[]
    for rt in ('dashboard','works','activities','finance','alerts','manual','maintenance','settings'):
        pg.click(f'.navbtn[data-route="{rt}"]');pg.wait_for_timeout(250);h=hdr()
        if not(h['visivel'] and h['natural']==480 and h['altura']<=32): bad.append((rt,h))
    chk('L5 o logo aparece no cabeçalho de todas as telas (8 conferidas), com no máximo 32 px de altura',not bad,str(bad))
    pg.screenshot(path='/tmp/fb/shots/v327_header.png',clip={'x':0,'y':0,'width':1500,'height':120})
    # recusas
    pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(300);antes=pg.evaluate("window.__fb.db.get('organizations/org1').branding.logo.length")
    casos=[('logo.svg','SVG','Use um arquivo PNG ou JPG'),('anim.gif','GIF','Use um arquivo PNG ou JPG'),('gigante.png','PNG 9000×9000','muito grande'),('corrompido.png','texto com extensão .png','ler a imagem'),('jpeg_com_nome_png.png','JPG com nome .png','não confere')]
    for fn,nome,trecho in casos:
        n=len(a.dialogs);pick(pg,fn)
        msgs=[m for _,m in a.dialogs[n:]]
        chk(f'R {nome}: recusado com aviso claro',any(trecho in m for m in msgs) and pg.is_disabled('#logoSave'),(msgs or ['(sem aviso)'])[0][:90])
    chk('R6 nenhuma recusa alterou o logo gravado',pg.evaluate("window.__fb.db.get('organizations/org1').branding.logo.length")==antes)
    # JPG válido
    pick(pg,'logo.jpg');pg.click('#logoSave');pg.wait_for_timeout(900)
    br=pg.evaluate("window.__fb.db.get('organizations/org1').branding");chk('L7 JPG 800×300 aceito e reduzido para 427×160',br['w']==427 and br['h']==160 and br['logo'].startswith('data:image/'),f"{br['w']}×{br['h']}")
    pick(pg,'logo_wide.png');pg.click('#logoSave');pg.wait_for_timeout(900)
    # impressão
    pg.click('.navbtn[data-route="finance"]');pg.wait_for_timeout(300)
    pg.emulate_media(media='print');pg.evaluate("window.dispatchEvent(new Event('beforeprint'))");pg.wait_for_timeout(300)
    p=pg.evaluate("(()=>{const st=document.getElementById('printPageStyle');return{css:st?st.textContent:'',topbar:getComputedStyle(document.querySelector('.topbar')).display,txt:document.querySelector('#printBrand').innerText}})()")
    chk('L8 na impressão o cabeçalho da página traz logo, nome da empresa, CNPJ e título da página',('data:image/png' in p['css']) and 'CNPJ: 12.345.678/0001-90' in p['css'] and 'Financeiro' in p['css'] and p['topbar']=='none' and 'CNPJ: 12.345.678/0001-90' in p['txt'],p['css'][:100])
    pg.emulate_media(media='screen')
    # PDF
    pg.click('#exportFile');pg.wait_for_selector('.fmt')
    with pg.expect_download(timeout=20000) as dl: pg.click('.fmt[data-fmt="pdf"]')
    path=dl.value.path();raw=open(path,'rb').read()
    imgs=subprocess.run(['pdfimages','-list',path],capture_output=True,text=True).stdout.strip().split('\n')[2:]
    txt=subprocess.run(['pdftotext','-layout',path,'-'],capture_output=True,text=True).stdout
    pgs=int(re.search(r'Pages:\s+(\d+)',subprocess.run(['pdfinfo',path],capture_output=True,text=True).stdout).group(1))
    chk('P1 o PDF traz o logo em todas as páginas',len(imgs)>=pgs and pgs>=1,f'{len(imgs)} imagem(ns) em {pgs} página(s)')
    chk('P2 o PDF traz empresa, CNPJ, título, filtro de obra e "Página x de y"',all(t in txt for t in ('ObraTop','CNPJ: 12.345.678/0001-90','Financeiro','Todas as obras',f'Página 1 de {pgs}')) ,re.sub(r'\s+',' ',txt)[:130])
    chk('P3 o PDF mantém o marcador de dados para reimportação no ObraTop',b'%OBRATOP_DATA_BASE64:' in raw)
    chk('P4 o PDF preserva os acentos do português (ex.: Competência, Vencimento)','Competência' in txt and 'Vencimento' in txt)
    # Word
    pg.click('#exportFile');pg.wait_for_selector('.fmt')
    with pg.expect_download(timeout=20000) as dl2: pg.click('.fmt[data-fmt="word"]')
    doc=open(dl2.value.path(),encoding='utf-8-sig').read()
    chk('W1 o Word (.doc) traz o cabeçalho da empresa com o logo e mantém o marcador de dados','ObraTop' in doc and 'CNPJ: 12.345.678/0001-90' in doc and 'data:image/png;base64,' in doc and 'OBRATOP_DATA_BASE64' in doc)
    chk('X1 sem erros de JavaScript (administrador)',not IGN(a.errors),str(IGN(a.errors)[:2]))
    # remover
    pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(300);pg.click('#logoRemove');pg.wait_for_timeout(900)
    chk('L9 remover apaga o logo da empresa e some do cabeçalho',pg.evaluate("window.__fb.db.get('organizations/org1').branding")is None and pg.evaluate("document.querySelector('#orgLogo').hidden"))
# ===== usuário da obra vê o logo mas não altera
s2=seed();s2[O.rstrip('/')]['branding']={'logo':'data:image/png;base64,'+__import__('base64').b64encode(open(IMG+'logo_wide.png','rb').read()).decode(),'w':480,'h':160,'name':'x.png'}
with App(APP,auth=USER,seed=s2,port=9101) as a:
    a.open();pg=a.page;pg.wait_for_timeout(500)
    chk('U1 o usuário da obra vê o logo no cabeçalho',pg.evaluate("!document.querySelector('#orgLogo').hidden&&document.querySelector('#orgLogo').naturalWidth>0"))
    pg.click('.navbtn[data-route="settings"]');pg.wait_for_timeout(300)
    chk('U2 mas não vê controles para alterar o logo',pg.query_selector('#logoFile') is None and 'Somente o administrador' in pg.inner_text('#content'))
# ===== valor adulterado no banco não é exibido
s3=seed();s3[O.rstrip('/')]['branding']={'logo':'javascript:alert(1)','w':1,'h':1}
with App(APP,auth=OWNER,seed=s3,port=9102) as a:
    a.open();pg=a.page;pg.wait_for_timeout(500)
    chk('S1 logo inválido gravado no banco (javascript:) é ignorado e o app segue normal',pg.evaluate("document.querySelector('#orgLogo').hidden")and not IGN(a.errors))
# ===== tela de entrada usa o logo guardado neste navegador
import base64
tiny='data:image/png;base64,'+base64.b64encode(open(IMG+'logo_wide.png','rb').read()).decode()
with App(APP,auth=None,seed=make_seed(),port=9103,extra_init=f"localStorage.setItem('obratop-brand-cache',JSON.stringify({{logo:'{tiny}',name:'Empresa Teste'}}));") as a:
    a.open(wait=False);pg=a.page;pg.wait_for_timeout(1500)
    chk('E1 a tela de entrada mostra o logo da última empresa deste navegador',pg.evaluate("!document.querySelector('#authLogo').hidden&&document.querySelector('#authLogo').naturalWidth>0"))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
