import sys; sys.path.insert(0,'/tmp/fb')
exec(open('/tmp/fb/t_v370.py').read().split("a=App(APP")[0])
res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
def open_gantt(pg):
    pg.evaluate("const s=document.querySelector('#filterWork');s.value='w1';s.dispatchEvent(new Event('change'))");nav(pg,'activities');pg.wait_for_timeout(500)
INFO="""(()=>{const q=s=>document.querySelector(s),r=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height),disp:c.display,ov:c.overflowX,sc:c.scrollbarColor,bg:c.backgroundColor,bt:c.borderTopWidth}};
 const bars=[...document.querySelectorAll('.ganttHBars .ganttHScroll')];return{wrapper:r(q('.ganttHBars')),L:r(bars[0]),R:r(bars[1]),left:r(q('.ganttGridLeft')),wrap:r(q('.ganttTimelineWrap')),card:r(q('.ganttProject')),vh:innerHeight,leftBarH:q('.ganttGridLeft').offsetHeight-q('.ganttGridLeft').clientHeight,vpOverflow:q('.ganttProjectViewport').scrollWidth-q('.ganttProjectViewport').clientWidth,cls:q('.ganttProjectViewport').className}})()"""
a=App('/tmp/fb/app57',auth=OWNER,seed=S(),port=9911,viewport={'width':1920,'height':1080})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(900);open_gantt(pg)
    i=pg.evaluate(INFO)
    chk('H1 as duas barras horizontais ficam fixas na base da tela (sem precisar rolar até o fim da lista), lado a lado',abs(i['wrapper']['b']-i['vh'])<=2 and i['L']['disp']=='block' and i['R']['disp']=='block',str((i['wrapper'],i['vh'])))
    chk('H2 a barra da tabela fica sob a tabela (mesma largura e posição) e a da linha do tempo sob a linha do tempo',abs(i['L']['l']-i['left']['l'])<=2 and abs(i['L']['w']-i['left']['w'])<=3 and abs(i['R']['l']-i['wrap']['l'])<=3 and abs(i['R']['w']-i['wrap']['w'])<=3,str((i['L'],i['left'])))
    chk('H3 mesmo visual: mesma altura, mesma rolagem sempre visível, mesma cor de trilho e polegar, mesmo fundo e na mesma linha',i['L']['h']==i['R']['h'] and i['L']['ov']==i['R']['ov']=='scroll' and i['L']['sc']==i['R']['sc'] and i['L']['bg']==i['R']['bg'] and abs(i['L']['t']-i['R']['t'])<=1,str((i['L'],i['R'])))
    chk('H4 a barra nativa cinza que ficava no fim da tabela foi substituída (sem barra duplicada)',i['leftBarH']==0 and 'hasHScrollL' in i['cls'],str((i['leftBarH'],i['cls'])))
    pg.evaluate("(()=>{const b=document.querySelectorAll('.ganttHBars .ganttHScroll')[0];b.scrollLeft=300;b.dispatchEvent(new Event('scroll'))})()");pg.wait_for_timeout(200)
    sl=pg.evaluate("Math.round(document.querySelector('.ganttGridLeft').scrollLeft)")
    pg.evaluate("document.querySelector('.ganttGridLeft').scrollLeft=120");pg.wait_for_timeout(200)
    bl=pg.evaluate("Math.round(document.querySelectorAll('.ganttHBars .ganttHScroll')[0].scrollLeft)")
    chk('H5 arrastar a barra da tabela rola a tabela, e rolar a tabela move a barra (sincronizadas nos dois sentidos)',sl==300 and bl==120,f'tabela={sl} barra={bl}')
    ok=pg.evaluate("[...document.querySelectorAll('.ganttLeftRow')].slice(0,8).every(r=>[0,1,2].every(k=>{const c=r.children[k],b=c.getBoundingClientRect(),el=document.elementFromPoint(b.left+8,b.top+b.height/2);return !el||el===c||c.contains(el)}))")
    chk('H6 com a tabela rolada, Nº, EAP e Nome continuam fixos e à frente',ok)
    pg.evaluate("(()=>{const b=document.querySelectorAll('.ganttHBars .ganttHScroll')[1];b.scrollLeft=500;b.dispatchEvent(new Event('scroll'))})()");pg.wait_for_timeout(200)
    chk('H7 a barra da linha do tempo continua funcionando (rola o gráfico)',pg.evaluate("Math.round(document.querySelector('.ganttTimelineWrap').scrollLeft)")==500)
    pg.screenshot(path='/tmp/fb/shots/v372_topo.png')
    pg.evaluate("window.scrollTo(0,document.body.scrollHeight)");pg.wait_for_timeout(500);j=pg.evaluate(INFO)
    chk('H8 no fim da página as barras ficam logo abaixo do cartão do Gantt, sem cobrir o rodapé',j['wrapper']['t']>=j['card']['b']-3 and j['wrapper']['b']<=j['vh']+1,str((j['wrapper'],j['card']['b'])))
    pg.screenshot(path='/tmp/fb/shots/v372_fim.png')
    chk('H9 sem erros de JavaScript',not [e for e in a.errors if "reading 'update'" not in e and '404' not in e and 'Failed to load resource' not in e],str(a.errors[:2]))
b=App('/tmp/fb/app57',auth=OWNER,seed=S(),port=9912,viewport={'width':1366,'height':768})
with b:
    b.open();pg=b.page;pg.wait_for_timeout(900);open_gantt(pg);i=pg.evaluate(INFO)
    chk('H10 notebook 1366×768: a tela não ganha rolagem lateral, a tabela ocupa cerca de metade e a linha do tempo tem espaço útil; as duas barras aparecem',i['vpOverflow']<=2 and 440<=i['left']['w']<=760 and i['wrap']['w']>=400 and i['L']['disp']=='block' and i['R']['disp']=='block' and abs(i['wrapper']['b']-i['vh'])<=2,str((i['left']['w'],i['wrap']['w'],i['vpOverflow'])))
    pg.screenshot(path='/tmp/fb/shots/v372_notebook.png')
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
