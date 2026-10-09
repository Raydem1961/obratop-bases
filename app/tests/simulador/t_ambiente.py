import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
for pid,esperado,proibido in (('obratop-v3-teste','Homologação','Produção'),('obratop-clinica','Produção','Homologação')):
    a=App(sys.argv[1],auth=OWNER,seed=make_seed(),port=8990+len(res));a.project_id=pid
    with a:
        a.open();pg=a.page
        pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(600)
        ident=pg.inner_text('.releaseIdentity').replace('\n',' ')
        chk(f'E1 [{pid}] painel mostra "{esperado}"',esperado in ident and proibido not in ident,ident)
        import re as _re
        _d=_re.search(r"RELEASE_DATE='(\d{4})-(\d\d)-(\d\d)'",open(sys.argv[1]+'/app.js',encoding='utf-8').read());_br=f'{_d.group(3)}/{_d.group(2)}/{_d.group(1)}'
        chk(f'E2 [{pid}] data de atualização acompanha a versão ({_br})',_br in ident and '14/09/2026' not in ident)
        pg.click('.navbtn[data-route="resourcecurves"]');pg.wait_for_timeout(500);chk(f'E3 [{pid}] Curvas S e ABC usa o mesmo selo',esperado in pg.inner_text('.versionchip'))
        pg.click('.navbtn[data-route="legal"]');pg.wait_for_timeout(500);chk(f'E4 [{pid}] Direitos Autorais usa o mesmo selo',esperado in pg.inner_text('.versionchip'))
        pg.click('.navbtn[data-route="maintenance"]');pg.wait_for_timeout(600);m=pg.inner_text('#content')
        chk(f'E5 [{pid}] Manutenção mostra o ambiente nos dois lugares',m.count(esperado)>=2 and proibido not in m)
print('RESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
