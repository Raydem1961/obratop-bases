@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto fail
where node >nul 2>nul
if errorlevel 1 (echo Instale Node.js LTS no site oficial e execute novamente. & goto fail)
where npm >nul 2>nul
if errorlevel 1 goto fail
findstr /c:"const RELEASE='3.39.3.0'" public\app.js >nul
if errorlevel 1 (echo Pacote incorreto: versao 3.39.3.0 nao encontrada em public\app.js. & goto fail)
findstr /c:"obratop-production-3.39.3.0" public\sw.js >nul
if errorlevel 1 (echo Inconsistencia: a versao do cache em public\sw.js nao confere. & goto fail)
node --check public\app.js
if errorlevel 1 goto fail
for %%F in (calc.mjs glossary.mjs branding.mjs templates.mjs icons.mjs fluent.css mobile.mjs mobile.css bases.mjs orcamento.mjs orcamento-ui.mjs planejamento-ui.mjs msproject.mjs manual-ui.mjs manual.css manual-capa.jpg vendor-loader.js vendor\jspdf.umd.min.js) do if not exist public\%%F (echo Arquivo ausente: public\%%F & goto fail)
if not exist public\vendor\xlsx.full.min.js (
  echo Baixando a biblioteca SheetJS 0.20.3 do site oficial para hospedar no proprio app...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try{Invoke-WebRequest -UseBasicParsing -Uri 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js' -OutFile 'public\vendor\xlsx.full.min.js'; exit 0}catch{exit 1}"
  if errorlevel 1 echo Aviso: nao foi possivel baixar agora. O app usara o endereco oficial como reserva.
)
if exist public\vendor\xlsx.full.min.js for %%A in (public\vendor\xlsx.full.min.js) do if %%~zA LSS 500000 (del "public\vendor\xlsx.full.min.js" & echo Aviso: arquivo baixado invalido foi removido. O app usara o endereco oficial como reserva.)
echo Publicando somente Hosting no projeto obratop-v3-teste. Regras e dados nao sao alterados.
echo Caso solicitado, entre na sua conta Google pela janela oficial do Firebase.
call npx --yes firebase-tools login
if errorlevel 1 goto fail
call npx --yes firebase-tools deploy --only hosting --project obratop-v3-teste
if errorlevel 1 goto fail
echo Publicacao concluida. Abra https://obratop-v3-teste.web.app/RELEASE.txt para conferir a versao 3.39.3.0.
pause
exit /b 0
:fail
echo Publicacao interrompida. Nada foi publicado.
pause
exit /b 1
