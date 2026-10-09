import sys; sys.path.insert(0,'/tmp/fb')
from harness import *
APP=sys.argv[1];res=[]
def chk(n,c,e=''):
    res.append(bool(c));print('OK   ' if c else 'FALHA',n,e,flush=True)
a=App(APP,auth=OWNER,seed=make_seed(),port=9985,viewport={'width':1500,'height':1000})
with a:
    a.open();pg=a.page;pg.wait_for_timeout(800);pg.evaluate("document.querySelector('.navbtn[data-route=\"manual\"]').click()");pg.wait_for_selector('#manGo');pg.wait_for_timeout(500)
    opts=pg.eval_on_selector_all('#manGo option','e=>e.map(o=>o.textContent)')
    chk('MN1 o manual passou a ter 14 páginas (8 originais + 5 novas + encerramento)',len(opts)==14,str(len(opts)))
    chk('MN2 versão do manual: V3.37 e a capa traz a faixa de revisão','V3.37' in pg.inner_text('.hero') and 'Revisão V3.37' in pg.evaluate("document.querySelector('.man-cover-rev').textContent"))
    todo=pg.evaluate("[...document.querySelectorAll('.man-sec h2')].map(h=>h.textContent)")
    for t in ('Novidades desta revisão','Usuários, Engº responsável e bloqueio de acesso','Criar novo orçamento','Bases SINAPI e ORSE','Composições analíticas','Planejamento a partir do orçamento','Previsto x realizado e linha de base','Cronograma no layout do MS Project','Importar e exportar para o MS Project','Revisão da EAP','Interface: menu por fluxo','Relatórios, impressão e histórico','Encerramento'):
        if not any(t in h for h in todo):chk('MN3 seção "%s" existe'%t,False,str(todo[-6:]));break
    else:chk('MN3 as 12 seções novas e o encerramento existem, numeradas em sequência (20 a 31 e 32)',True)
    nums=[h.split('.')[0] for h in todo if h.split('.')[0].isdigit()];chk('MN4 numeração das seções sem repetição e em ordem de leitura','Encerramento' in todo[-1] and len(nums)==len(set(nums)),str(nums[-14:]))
    pg.select_option('#manGo','9');pg.wait_for_timeout(300);t9=pg.inner_text('.man-frame:not(.man-off)')
    chk('MN5 página 9: usuários e bloqueio (Alterar, Bloquear, Excluir, Engº responsável) e novidades',all(x in t9 for x in ('Bloquear','Excluir usuário','Engº responsável','Novidades desta revisão')))
    pg.select_option('#manGo','12');pg.wait_for_timeout(300);t12=pg.inner_text('.man-frame:not(.man-off)');chk('MN6 página 12: layout MS Project, importação/exportação e revisão da EAP',all(x in t12 for x in ('Caminho crítico','Salvar como > XML','Revisar EAP')))
    pg.fill('#manSearch','linha de base');pg.wait_for_timeout(500);chk('MN7 a busca do manual encontra o conteúdo novo ("linha de base")',pg.evaluate("document.body.innerText.toLowerCase().includes('linha de base')"))
    chk('MN8 sem erros de JavaScript',not [e for e in a.errors if "reading 'update'" not in e and '404' not in e and 'Failed to load resource' not in e],str(a.errors[:2]))
print('\nRESUMO:',sum(res),'de',len(res));sys.exit(0 if all(res) else 1)
