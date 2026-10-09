import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
prefix=sys.argv[2];dark=len(sys.argv)>3 and sys.argv[3]=='dark'
seed={k:v for k,v in make_seed().items() if k in('users/u1','organizations/org1','organizations/org1/members/u1')}
f='/home/claude/work/planilhas/saida/ObraTop_Base_02_Rodovias_Pavimentacao_Urbana.xlsx'
with App(sys.argv[1],auth=OWNER,seed=seed,port=9320,tz='America/Bahia',xlsx='/tmp/vendor/xlsx.full.min.js',viewport={'width':1366,'height':768}) as a:
    a.open();pg=a.page;pg.set_default_timeout(40000)
    pg.click('.navbtn[data-route="reports"]');pg.wait_for_selector('#bulkImport')
    with pg.expect_file_chooser() as fc: pg.click('#bulkImport')
    fc.value.set_files(f)
    while not any('concluída' in m for _,m in a.dialogs): pg.wait_for_timeout(250)
    pg.wait_for_timeout(1200)
    if dark: pg.click('#themeBtn');pg.wait_for_timeout(300)
    for name,route in (('painel','dashboard'),('alertas','alerts'),('manual','manual'),('economia','economics'),('integridade','maintenance'),('estoque','inventory')):
        pg.click(f'.navbtn[data-route="{route}"]');pg.wait_for_timeout(1000);pg.screenshot(path=f'/tmp/fb/shots/{prefix}_{name}.png')
