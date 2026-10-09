import sys,re; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];O='organizations/org1/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
def fs(pg,sel): return pg.evaluate("(s)=>{const e=document.querySelector(s);return e?Math.round(parseFloat(getComputedStyle(e).fontSize)*10)/10:null}",sel)
def S():
    s=make_seed()
    for i in range(40):s[O+f'budgets/p{i}']=base(workId='w1',category=f'Etapa {i%4}',description=f'Serviço de teste {i} com descrição razoavelmente longa para ocupar espaço',unit='m2',qty=10+i,unitValue=50+i,bdi=20,source='Próprio')
    return s
a=App(APP,auth=OWNER,seed=S(),port=9991,viewport={'width':1366,'height':768})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(900);pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_timeout(700)
    v={k:fs(pg,s) for k,s in {'body':'body','nav':'.navbtn','td':'#content td','th':'#content th','btn':'#content .btn','input':'#filterSearch','hero':'#content .hero h1','hero muted':'#content .hero .muted','total':'#content .toolbar > .badge','foot':'.appCopyright'}.items()}
    chk('L1 padrão "grande" no notebook: texto 15,7 px (antes 14), células de tabela 15,7 (antes 13,5), cabeçalhos 15,1 (antes 13,5), menu 15,7',v['body']==15.7 and v['td']==15.7 and v['th']==15.1 and v['nav']==15.7 and v['btn']==15.7 and v['input']==15.7,str(v))
    chk('L2 título da tela 26,9 px, subtítulo 16,2 px, total 20,2 px, rodapé 15,1 px',v['hero']==26.9 and v['hero muted']==16.2 and v['total']==20.2 and v['foot']==15.1,str(v))
    txt=pg.inner_text('#fsBtn');chk('L3 botão "🔠 Letra: grande" na faixa de versão','Letra: grande' in txt,txt)
    trunc=pg.evaluate("[...document.querySelectorAll('.navlbl')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)")
    chk('L4 nenhum item do menu lateral fica cortado no tamanho grande',not trunc,str(trunc))
    ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth");chk('L5 a página não ganha rolagem horizontal (tabelas largas rolam dentro da própria área)',ov<=1,str(ov))
    pg.evaluate("window.scrollTo(0,900)");pg.wait_for_timeout(300)
    pb=pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'))");vis=pg.evaluate("(()=>{const pb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pin-bottom'));return [...document.querySelectorAll('#content > .tablewrap tbody tr')].filter(r=>r.getBoundingClientRect().top>=pb&&r.getBoundingClientRect().bottom<=innerHeight).length})()")
    chk('L6 cabeçalho fixo continua dentro do limite (≤ 46% da altura) e sobram linhas para trabalhar no notebook',pb<=768*0.46+4 and vis>=4,f'fixo até {pb:.0f}px, {vis} linhas')
    pg.screenshot(path='/tmp/fb/shots/v3342_grande.png')
    pg.click('#fsBtn');pg.wait_for_timeout(500);e=fs(pg,'body');chk('L7 clicar em "Letra" passa para "extra grande" (17,6 px)',e==17.6 and 'extra grande' in pg.inner_text('#fsBtn'),f'{e} {pg.inner_text("#fsBtn")}')
    pg.screenshot(path='/tmp/fb/shots/v3342_extra.png')
    pg.click('#fsBtn');pg.wait_for_timeout(500);n=fs(pg,'body');chk('L8 e depois para "normal" (14 px, como antes)',n==14 and fs(pg,'#content td')==14,f'{n}')
    pg.reload();pg.wait_for_timeout(1500);chk('L9 a escolha fica guardada ao recarregar',pg.evaluate("document.documentElement.dataset.fs")=='normal')
    pg.evaluate("document.querySelector('#fsBtn').click()");pg.wait_for_timeout(400);chk('L10 do "normal" o próximo clique volta ao padrão "grande"',pg.evaluate("document.documentElement.dataset.fs")=='grande')
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
