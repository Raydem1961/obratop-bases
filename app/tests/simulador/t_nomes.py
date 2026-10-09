import sys,re; sys.path.insert(0,'/tmp/fb')
from harness import *
seed={k:v for k,v in make_seed().items() if k in('users/u1','organizations/org1','organizations/org1/members/u1')}
fs=sys.argv[2:]
res=[]
def chk(n,c,e=''):
    res.append(c);print('OK   ' if c else 'FALHA',n,e)
for vw in (1920,1366):
    with App(sys.argv[1],auth=OWNER,seed=seed,port=8940+vw%9,tz='America/Bahia',xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':vw,'height':1000}) as a:
        a.open();pg=a.page;pg.set_default_timeout(40000)
        for f in fs:
            pg.click('.navbtn[data-route="reports"]');pg.wait_for_selector('#bulkImport');n0=len([1 for _,m in a.dialogs if 'concluída' in m])
            with pg.expect_file_chooser() as fc: pg.click('#bulkImport')
            fc.value.set_files(f)
            while len([1 for _,m in a.dialogs if 'concluída' in m])==n0: pg.wait_for_timeout(250)
            pg.wait_for_timeout(1000)
        pg.click('.navbtn[data-route="dashboard"]');pg.wait_for_timeout(1200)
        info=pg.evaluate("""()=>{const cards=[...document.querySelectorAll('.dashboardCharts .chart')];
          const get=t=>cards.find(c=>c.querySelector('.sectiontitle')&&c.querySelector('.sectiontitle').innerText.startsWith(t));
          const f=c=>c?[...c.querySelectorAll('.hbarRow')].map(r=>({l:r.querySelector('.hbarLabel').innerText,v:r.querySelector('.hbarVal').innerText,trunc:r.querySelector('.hbarLabel').innerText.includes('…')})):[];
          const fs=e=>getComputedStyle(e).fontSize+'/'+getComputedStyle(e).fontFamily.split(',')[0];
          const leg=get('Custos por categoria').querySelector('.pieWrap b, .donutlegend b');
          const av=get('Avanço físico por obra'),su=get('Compras por fornecedor');
          return{av:f(av),su:f(su),fontLegenda:fs(leg),fontAv:av&&fs(av.querySelector('.hbarLabel')),fontAvVal:av&&fs(av.querySelector('.hbarVal')),fontSu:su&&fs(su.querySelector('.hbarLabel')),svgs:(av?av.querySelectorAll('svg.hbar').length:-1)+(su?su.querySelectorAll('svg.hbar').length:-1)}}""")
        works=pg.eval_on_selector_all('#filterWork option','e=>e.map(o=>o.textContent).filter(t=>t&&t!=="Todas as obras")')
        sups=pg.evaluate("[...document.querySelectorAll('x')].length")
        print(f'--- {vw}px | legenda Custos por categoria: {info["fontLegenda"]} | rótulo avanço: {info["fontAv"]} | valor: {info["fontAvVal"]} | rótulo fornecedor: {info["fontSu"]}')
        chk(f'N1 [{vw}] avanço físico lista as 6 obras com o nome completo (igual ao cadastro, sem reticências)',sorted(x['l'] for x in info['av'])==sorted(works) and not any(x['trunc'] for x in info['av']),f"{len(info['av'])} linhas")
        chk(f'N2 [{vw}] compras por fornecedor sem reticências e com nomes completos (Ltda/S.A.)',len(info['su'])>=5 and not any(x['trunc'] for x in info['su']) and all(re.search(r'(Ltda|S\.A\.)',x['l']) for x in info['su']),str([x['l'] for x in info['su']][:3]))
        chk(f'N3 [{vw}] letra dos dois gráficos igual à de Custos por categoria',info['fontAv']==info['fontLegenda']==info['fontSu'] and info['fontAvVal'].split('/')[0]==info['fontLegenda'].split('/')[0],f"{info['fontAv']} = {info['fontLegenda']}")
        chk(f'N4 [{vw}] gráficos antigos em SVG não aparecem mais nesses dois cartões',info['svgs']==0)
        if vw==1920:
            pg.screenshot(path='/tmp/fb/shots/nomes_1920.png',full_page=True)
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
