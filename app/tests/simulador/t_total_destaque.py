import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
CR="""(s)=>{const P=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);return{r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};const L=(p)=>{const g=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*g(p.r)+0.7152*g(p.g)+0.0722*g(p.b)};
const e=document.querySelector(s),cs=getComputedStyle(e),fg=P(cs.color),bg=P(cs.backgroundColor),pg=P(getComputedStyle(document.body).backgroundColor),mix=bg.a<1?{r:bg.r*bg.a+pg.r*(1-bg.a),g:bg.g*bg.a+pg.g*(1-bg.a),b:bg.b*bg.a+pg.b*(1-bg.a)}:bg;
const a=L(fg),b=L(mix),hi=Math.max(a,b),lo=Math.min(a,b);return{fs:parseFloat(cs.fontSize),fw:cs.fontWeight,cr:Math.round((hi+0.05)/(lo+0.05)*10)/10,txt:e.textContent.trim()}}"""
a=App(APP,auth=OWNER,seed=make_seed(),port=9980,viewport={'width':1366,'height':768})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(900);pg.evaluate("document.querySelector('.navbtn[data-route=\"budgets\"]').click()");pg.wait_for_timeout(600)
    r=pg.evaluate(CR,'#content .toolbar > .badge')
    chk('T1 "Total R$ …" de Orçamentos: fonte de ~12 px para 18 px, em negrito',r['fs']==18 and r['fw']=='800' and r['txt'].startswith('Total R$'),str(r))
    chk('T2 e com contraste forte (verde escuro sobre verde claro, ≥ 7:1)',r['cr']>=7,str(r['cr']))
    pg.screenshot(path='/tmp/fb/shots/v3341_total.png',clip={'x':264,'y':150,'width':900,'height':200})
    pg.evaluate("window.scrollTo(0,900)");pg.wait_for_timeout(300)
    t=pg.evaluate("(()=>{const e=document.querySelector('#content .toolbar');const r=e.getBoundingClientRect();return{pos:getComputedStyle(e).position,t:Math.round(r.top),b:Math.round(r.bottom)}})()")
    chk('T3 o total continua fixo no topo ao rolar (cabeçalho fixo preservado)',t['pos']=='sticky' and t['t']>0,str(t))
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')");pg.wait_for_timeout(250);rd=pg.evaluate(CR,'#content .toolbar > .badge')
    chk('T4 tema escuro: total legível (≥ 7:1)',rd['cr']>=7 and rd['fs']==18,str(rd))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
