#!/usr/bin/env python3
"""Aplica o módulo à pasta atual do ObraTop, preservando ícones e customizações."""
import argparse, datetime, pathlib, re, shutil, subprocess, tempfile, zipfile
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('projeto',help='Pasta contendo firebase.json e public/app.js')
args=parser.parse_args(); target=pathlib.Path(args.projeto).expanduser().resolve(); bundled=pathlib.Path(__file__).resolve().parent
if not (target/'firebase.json').is_file():raise SystemExit('Pasta inválida: firebase.json não encontrado.')
if not shutil.which('node'):raise SystemExit('Node.js necessário para validar o JavaScript antes de alterar.')
public=target/'public'; app=(public/'app.js').read_text()
if 'function renderEconomics()' in app:raise SystemExit('O módulo já existe. Nenhum arquivo foi alterado.')
def once(old,new):
 global app
 if app.count(old)!=1:raise SystemExit('Versão diferente da esperada. Nenhuma alteração: marcador incompatível '+old[:70])
 app=app.replace(old,new,1)
once("['Financeiro',[['finance'","['Financeiro',[['economics','📊','Economia e Equilíbrio'],['finance'")
once("if(r==='dashboard')return renderDashboard();","if(r==='economics')return renderEconomics();if(r==='dashboard')return renderDashboard();")
once("if(state.route==='dashboard'||state.route===type","if(state.route==='economics'||state.route==='dashboard'||state.route===type")
once("['dueDate','Vencimento','date'],['description'","['dueDate','Vencimento','date'],['paymentDate','Liquidação (pagamento/recebimento)','date'],['description'")
app=re.sub(r"const RELEASE='[^']+'", "const RELEASE='3.23.0'",app,count=1)
app=app.replace("if(state.route==='maintenance')render()}))","if(state.route==='maintenance'||state.route==='economics')render()}))",1)
app="import {mountEconomics} from './economics-ui.mjs';\n"+app
app+='\nfunction renderEconomics()'+(bundled/'public/app.js').read_text().split('\nfunction renderEconomics()',1)[1]
index=(public/'index.html').read_text()
if '</head>' not in index:raise SystemExit('index.html incompatível. Nenhuma alteração.')
index=index.replace('</head>','<link rel="stylesheet" href="./economics.css">\n</head>',1)
sw=(public/'sw.js').read_text()
if 'const CORE=[' not in sw:raise SystemExit('Service Worker incompatível. Nenhuma alteração.')
sw=re.sub(r"const CACHE='[^']+'", "const CACHE='obratop-production-3.23.0'",sw,count=1).replace('const CORE=[',"const CORE=['./economics.mjs','./economics-ui.mjs','./economics.css',",1)
changes={'app.js':app,'index.html':index,'sw.js':sw}
for name in ['economics.mjs','economics-ui.mjs','economics.css']:changes[name]=(bundled/'public'/name).read_text()
with tempfile.TemporaryDirectory() as tmp:
 for name,body in changes.items():
  if name.endswith(('.js','.mjs')):
   check=pathlib.Path(tmp)/(name+'.mjs');check.write_text(body);subprocess.run(['node','--check',str(check)],check=True)
backup=target/('backup_antes_economia_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')+'.zip')
original={name:(public/name).read_bytes() if (public/name).exists() else None for name in changes}
with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
 for name,body in original.items():
  if body is not None:z.writestr('public/'+name,body)
try:
 for name,body in changes.items():(public/name).write_text(body)
except Exception:
 for name,body in original.items():
  if body is None:(public/name).unlink(missing_ok=True)
  else:(public/name).write_bytes(body)
 raise
print('Módulo aplicado e JavaScript validado. Backup de código:',backup)
print('Não foram alterados dados, regras do Firebase, ícones ou logotipo.')
print('Após homologação, publicar na pasta do projeto: firebase deploy --only hosting --project obratop-v3-teste')
