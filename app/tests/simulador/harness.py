import sys, json, datetime, threading, http.server, functools, os, time
from playwright.sync_api import sync_playwright
STUB={'firebase-app.js':'fb-app.js','firebase-auth.js':'fb-auth.js','firebase-firestore.js':'fb-firestore.js','firebase-storage.js':'fb-storage.js','firebase-app-check.js':'fb-appcheck.js'}
TODAY=datetime.date.today()
def d(n): return (TODAY+datetime.timedelta(days=n)).isoformat()
def ts(i=0): return {'$ts':1700000000+i}
def base(**k): 
    o={'createdAt':ts(),'updatedAt':ts(),'deleted':False}; o.update(k); return o
def make_seed():
    O='organizations/org1/'
    s={
     'users/u1':{'currentOrg':'org1','email':'owner@test.com'},
     'users/u2':{'currentOrg':'org1','email':'user@test.com'},
     'organizations/org1':{'name':'ObraTop','ownerUid':'u1','legacyMigrated':True,'createdAt':ts()},
     O+'members/u1':{'email':'owner@test.com','role':'owner','status':'active'},
     O+'members/u2':{'email':'user@test.com','role':'project_user','status':'active','workId':'w1'},
     O+'works/w1':base(name='Obra A',client='Cliente A',start=d(-200),end=d(60),value=1000000,status='Em andamento',progress=10),
     O+'works/w2':base(name='Obra B',client='Cliente B',start=d(-100),end=d(200),value=500000,status='Em andamento',progress=50),
     O+'activities/a1':base(workId='w1',name='Fundações',start=d(-200),end=d(-100),progress=100,status='Concluída',durationDays=70,progressMode='Percentual'),
     O+'activities/a2':base(workId='w1',name='Estrutura',start=d(-90),end=d(-10),progress=40,status='Em andamento',durationDays=60,progressMode='Percentual'),
     O+'contracts/c1':base(workId='w1',number='CT-1',party='Empreiteira',object='Obra',start=d(-300),end=d(-5),value=100000,status='Ativo'),
     O+'contracts/c2':base(workId='w1',number='CT-2',party='Fornec',object='Mat',start=d(-30),end=d(10),value=50000,status='Ativo'),
     O+'documents/d1':base(workId='w1',name='ART',category='Legal',expiry=d(-3),status='Aprovado'),
     O+'equipment/e1':base(name='Betoneira',code='EQ-1',workId='w1',nextMaintenance=d(-2),monthlyCost=1000,status='Operacional'),
     O+'finance/f1':base(workId='w1',date=d(-40),dueDate=d(-10),description='NF cimento',type='Despesa',category='Material',value=5000,status='Pendente'),
     O+'finance/f2':base(workId='w1',date=d(-20),dueDate=d(5),description='Medição 1',type='Receita',category='Medição',value=50000,status='Previsto'),
     O+'measurements/m1':base(workId='w1',date=d(-15),number='MED-01',description='Fundações',physical=20,value=50000,status='Aprovada'),
     O+'orders/o1':base(workId='w1',date=d(-5),description='Cimento CP-II',value=1500,status='Aprovado',supplierId='s1'),
     O+'inventory/i1':base(workId='w1',date=d(0),material='Cimento CP-II',unit='sc',currentStock=10,minStock=20,maxStock=100,safetyStock=5,unitValue=30,avgDailyConsumption=2,leadTimeDays=5),
     O+'suppliers/s1':base(name='Forn Alfa',cnpj='00.000.000/0001-00',status='Ativo'),
     O+'staff/st1':base(name='João',role='Pedreiro',workId='w1',salary=3000,status='Ativo'),
     O+'budgets/b1':base(workId='w1',category='Estrutura',description='Concreto',unit='m3',qty=100,unitValue=500,bdi=20),
    }
    return s
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
def serve(directory,port):
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',port),functools.partial(Q,directory=directory))
    threading.Thread(target=httpd.serve_forever,daemon=True).start();return httpd
class App:
    def __init__(self,app_dir,auth=None,seed=None,port=8801,extra_init='',viewport=None,vendor=None,tz=None,xlsx=None,mobile=False):
        self.dir=app_dir;self.port=port;self.auth=auth;self.seed=seed or make_seed();self.extra=extra_init;self.vp=viewport or {'width':1366,'height':900};self.errors=[];self.dialogs=[]
        self.vendor=vendor or {};self.tz=tz;self.xlsx=xlsx;self.mobile=mobile
    def __enter__(self):
        self.httpd=serve(self.dir,self.port);self.pw=sync_playwright().start();self.browser=self.pw.chromium.launch()
        self.ctx=self.browser.new_context(viewport=self.vp,accept_downloads=True,service_workers=('allow' if getattr(self,'sw',False) else 'block'),**({'timezone_id':self.tz} if self.tz else {}),**({'is_mobile':True,'has_touch':True,'device_scale_factor':2,'user_agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'} if self.mobile else {}))
        def stub(route):
            f=route.request.url.split('/')[-1].split('?')[0]
            body=open('/tmp/fb/'+STUB[f],encoding='utf-8').read() if f in STUB else 'export {}'
            route.fulfill(status=200,content_type='application/javascript',headers={'access-control-allow-origin':'*'},body=body)
        self.ctx.route('https://www.gstatic.com/firebasejs/**',stub)
        self.ctx.route('https://cdn.sheetjs.com/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=open(self.xlsx,encoding='utf-8').read() if self.xlsx else 'window.XLSX=window.XLSX||{utils:{},SSF:{}};'))
        self.ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body='window.jspdf=window.jspdf||{jsPDF:function(){}};'))
        self.ctx.route(f'http://127.0.0.1:{self.port}/__/firebase/init.json',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'apiKey':'k','projectId':getattr(self,'project_id','t'),'authDomain':'t.firebaseapp.com','storageBucket':'t.appspot.com'})))
        self.page=self.ctx.new_page()
        self.page.on('pageerror',lambda e:self.errors.append('PAGEERROR '+str(e)))
        self.page.on('console',lambda m:self.errors.append('CONSOLE '+m.text) if m.type=='error' else None)
        def dlg(dialog):
            self.dialogs.append((dialog.type,dialog.message[:120]))
            if dialog.type=='confirm' and getattr(self,'recusar_confirm',False):dialog.dismiss()
            elif dialog.type=='prompt':dialog.accept(getattr(self,'prompt_text','EXCLUIR OBRA'))
            else:dialog.accept()
        self.page.on('dialog',dlg)
        init='window.__SEED__=%s;'%json.dumps(self.seed)
        if self.auth: init+='window.__AUTH__=%s;'%json.dumps(self.auth)
        init+=self.extra
        self.page.add_init_script(init)
        return self
    def open(self,path='/index.html',wait=True):
        self.page.goto(f'http://127.0.0.1:{self.port}{path}')
        if wait: self.page.wait_for_selector('#appView:not(.hidden)',timeout=15000);self.page.wait_for_function("document.querySelector('#syncStatus').textContent.includes('Sincronizado')",timeout=15000)
    def __exit__(self,*a):
        self.browser.close();self.pw.stop();self.httpd.shutdown()
OWNER={'uid':'u1','email':'owner@test.com','emailVerified':True}
USER={'uid':'u2','email':'user@test.com','emailVerified':True}
