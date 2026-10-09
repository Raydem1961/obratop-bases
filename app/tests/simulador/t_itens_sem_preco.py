import sys,re; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];FX='/tmp/fb/fx/';res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
a=App(APP,auth=OWNER,seed=make_seed(),port=9900,xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1500,'height':1100})
with a:
    a.open();pg=a.page;pg.set_default_timeout(30000);pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_selector('.subtab');pg.click('.subtab[data-tab="builder"]');pg.wait_for_selector('#bbName')
    pg.fill('#etNew','Serviços');pg.click('#etAdd');pg.set_input_files('#spFile',FX+'SINAPI-2026-08-com-zero.zip')
    for _ in range(60):
        pg.wait_for_timeout(250)
        if 'composições' in pg.inner_text('#spStatus') and 'lendo' not in pg.inner_text('#spStatus'):break
    pg.fill('#bbQuery','tapume');pg.wait_for_timeout(500)
    rows=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>[r.cells[1].innerText,r.cells[4].innerText.replace(/\\u00a0/g," ")])');info=pg.inner_text('#bbResInfo')
    chk('Z1 por padrão a busca mostra só itens com preço (98459 = R$ 98,28) e avisa quantos sem preço foram ocultados',rows==[['98459','R$ 98,28']] and '2 item(ns) sem preço ocultado(s)' in info,str(rows)+' | '+info)
    pg.check('#bbZero');pg.wait_for_timeout(400)
    rows=pg.eval_on_selector_all('#bbRes tbody tr','e=>e.map(r=>[r.cells[1].innerText,r.cells[4].innerText.replace(/\\u00a0/g," ").trim()])')
    chk('Z2 ao marcar "mostrar itens sem preço" aparecem 98457 e 105118 com a etiqueta "Sem preço" (sempre em ordem alfabética A–Z)',[r[0] for r in rows]==['98457','98459','105118'] and rows[0][1]=='Sem preço' and rows[2][1]=='Sem preço' and rows[1][1]=='R$ 98,28',str(rows))
    n=len(a.dialogs);a.recusar_confirm=True;pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(300);a.recusar_confirm=False
    chk('Z3 adicionar item sem preço pede confirmação; ao recusar, nada é adicionado',pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.length')==0)
    pg.click('#bbRes tbody tr >> nth=0 >> .bbAdd');pg.wait_for_timeout(300)
    chk('Z4 ao aceitar, entra na planilha com a etiqueta "sem preço" e total zero',pg.eval_on_selector_all('#bbTab tbody tr[data-id]','e=>e.length')==1 and 'sem preço' in pg.inner_text('#bbTab tbody tr[data-id]') and a.dialogs and any('SEM CUSTO' in m for _,m in a.dialogs[n:]))
    dg=pg.evaluate("document.querySelector('#spDiag').textContent")
    pg.fill('#bbName','Teste zero');pg.select_option('#bbWork','w1');pg.click('#bbSave');pg.wait_for_timeout(500)
    chk('Z5 ao gravar, avisa que há serviço com preço ZERO',any('preço unitário ZERO' in m for _,m in a.dialogs))
    chk('Z6 o diagnóstico informa quantos itens estão sem preço para a UF','2 sem preço/custo para BA' in dg,dg[:260].replace('\n',' | '))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
