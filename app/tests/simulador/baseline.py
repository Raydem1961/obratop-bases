import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
app_dir=sys.argv[1]
with App(app_dir,auth=OWNER) as a:
    a.open()
    pg=a.page
    routes=pg.eval_on_selector_all('.navbtn','e=>e.map(x=>x.dataset.route)')
    print('rotas:',len(routes),routes)
    bad=[]
    for r in routes:
        n=len(a.errors);pg.click(f'.navbtn[data-route="{r}"]');pg.wait_for_timeout(120)
        h=pg.inner_text('#content')[:60].replace('\n',' ')
        if len(a.errors)>n: bad.append((r,a.errors[n:]))
        if 'Falha no módulo' in pg.inner_text('#content'): bad.append((r,'FALHA DE RENDER'))
    print('rotas com erro:',bad)
    print('erros gerais:',a.errors[:5])
    print('RELEASE na tela:',pg.inner_text('.versionchip') if pg.query_selector('.versionchip') else '-')
