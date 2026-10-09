// Testes com a biblioteca SheetJS real (pulados se ela não estiver disponível). Lê arquivos gerados por tests/simulador/gerar_fixtures_orcamento.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import * as B from '../../public/bases.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),require=createRequire(import.meta.url);
let XLSX=null;for(const p of [process.env.XLSX_PATH,path.join(root,'public/vendor/xlsx.full.min.js'),'/tmp/vendor/xlsx.full.min.js'].filter(Boolean)){try{XLSX=require(p);break}catch{}}
const skip=XLSX?false:'biblioteca xlsx não encontrada (rode o curl do LEIA-ME para baixar)';
const fx=fs.mkdtempSync(path.join(os.tmpdir(),'obratop-fx-'));
if(XLSX)execFileSync('node',[path.join(root,'tests/simulador/gerar_fixtures_orcamento.mjs'),fx,require.resolve(XLSX===null?'':(process.env.XLSX_PATH||(fs.existsSync(path.join(root,'public/vendor/xlsx.full.min.js'))?path.join(root,'public/vendor/xlsx.full.min.js'):'/tmp/vendor/xlsx.full.min.js')))],{stdio:'ignore'});
const ab=f=>{const b=fs.readFileSync(path.join(fx,f));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
test('ZIP do SINAPI (arquivo único, todas as UF): extrai a Bahia nos três regimes',{skip},async()=>{
  const r=await B.parseSinapiPackage(XLSX,ab('SINAPI-2026-08-formato-xlsx.zip'),'SINAPI-2026-08-formato-xlsx.zip',{uf:'BA'});
  assert.equal(r.ref,'2026-08');assert.deepEqual(Object.keys(r.regimes).sort(),['CD','SD','SE']);
  for(const rg of ['SD','CD','SE']){assert.equal(r.regimes[rg].comp.length,5,rg);assert.equal(r.regimes[rg].ins.length,5,rg)}
  const alv=r.regimes.SD.comp.find(i=>i[0]==='87521');assert.equal(alv[3],76.8);assert.equal(alv[2],'M2');assert.equal(alv[5],'ALVENARIA');   // 75,30 + 3 × 0,5 (BA é a 4ª UF)
  const cim=r.regimes.SD.ins.find(i=>i[0]==='00000001');assert.equal(cim[3],31.5);assert.equal(cim[4],'C');
  const sp=await B.parseSinapiPackage(XLSX,ab('SINAPI-2026-08-formato-xlsx.zip'),'x.zip',{uf:'SP'});assert.equal(sp.regimes.SD.comp.find(i=>i[0]==='87521')[3],77.3);
  assert.ok(r.sheets.every(s=>!/analit/i.test(s.name)));
});
test('XLSX solto do SINAPI e arquivos antigos por UF (insumos e composições em arquivos separados)',{skip},async()=>{
  const x=await B.parseSinapiPackage(XLSX,ab('SINAPI_Referencia_2026_08.xlsx'),'SINAPI_Referencia_2026_08.xlsx',{uf:'BA'});assert.equal(x.regimes.SD.comp.length,5);
  const i=await B.parseSinapiPackage(XLSX,ab('SINAPI_Preco_Ref_Insumos_BA_202608_NaoDesonerado.xlsx'),'SINAPI_Preco_Ref_Insumos_BA_202608_NaoDesonerado.xlsx',{uf:'BA'});
  assert.equal(i.ref,'2026-08');assert.equal(i.regimes.SD.ins.length,5);assert.equal(i.regimes.SD.ins[0][3],30);
  const c=await B.parseSinapiPackage(XLSX,ab('SINAPI_Custo_Ref_Composicoes_Sintetico_BA_202608_NaoDesonerado.xlsx'),'SINAPI_Custo_Ref_Composicoes_Sintetico_BA_202608_NaoDesonerado.xlsx',{uf:'BA'});assert.equal(c.regimes.SD.comp.length,5);assert.equal(c.regimes.SD.comp[0][3],75.3);
});
test('ORSE em XLSX e CSV, e planilha irreconhecível devolve vazio (a interface abre o mapeamento manual)',{skip},async()=>{
  const rows=B.sheetRowsFromBuffer(XLSX,ab('ORSE_composicoes.xlsx')),r=B.extractItems(Object.values(rows)[0]);assert.equal(r.items.length,5);assert.equal(r.items[0][0],'1001');assert.equal(r.items[0][3],19.93);assert.equal(r.items[3][1].startsWith('Alvenaria'),true);
  const txt=fs.readFileSync(path.join(fx,'ORSE_composicoes.csv'),'utf8'),cr=B.parseCsv(txt),c=B.extractItems(cr,{decimalComma:B.csvUsesDecimalComma(cr)});assert.equal(c.items.length,5);assert.equal(c.items[2][3],12.23);
  const bad=B.extractItems(Object.values(B.sheetRowsFromBuffer(XLSX,ab('irreconhecivel.xlsx')))[0]);assert.equal(bad.items.length,0);
});
test('script mensal: gera public/bases/*.json e index.json a partir de um ZIP local',{skip},()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'obratop-proj-'));fs.mkdirSync(path.join(tmp,'public/vendor'),{recursive:true});fs.mkdirSync(path.join(tmp,'tools/sinapi'),{recursive:true});
  fs.copyFileSync(path.join(root,'public/bases.mjs'),path.join(tmp,'public/bases.mjs'));fs.copyFileSync(path.join(root,'tools/sinapi/atualizar-sinapi.mjs'),path.join(tmp,'tools/sinapi/atualizar-sinapi.mjs'));
  const xl=process.env.XLSX_PATH||(fs.existsSync(path.join(root,'public/vendor/xlsx.full.min.js'))?path.join(root,'public/vendor/xlsx.full.min.js'):'/tmp/vendor/xlsx.full.min.js');fs.copyFileSync(xl,path.join(tmp,'public/vendor/xlsx.full.min.js'));
  const out=execFileSync('node',[path.join(tmp,'tools/sinapi/atualizar-sinapi.mjs'),'--uf','BA','--arquivo',path.join(fx,'SINAPI-2026-08-formato-xlsx.zip')],{encoding:'utf8'});
  assert.match(out,/Pronto: bases\/sinapi-BA-2026-08\.json/);const idx=JSON.parse(fs.readFileSync(path.join(tmp,'public/bases/index.json'),'utf8'));
  assert.equal(idx.length,1);assert.equal(idx[0].ref,'2026-08');assert.equal(idx[0].counts.SD.comp,5);const d=JSON.parse(fs.readFileSync(path.join(tmp,'public',idx[0].file),'utf8'));assert.equal(d.uf,'BA');assert.equal(d.regimes.SD.comp.length,5);
  // segunda execução com outro mês mantém o índice ordenado e sem duplicar
  execFileSync('node',[path.join(tmp,'tools/sinapi/atualizar-sinapi.mjs'),'--uf','BA','--mes','2026-09','--arquivo',path.join(fx,'SINAPI_Referencia_2026_08.xlsx')],{encoding:'utf8'});
  const idx2=JSON.parse(fs.readFileSync(path.join(tmp,'public/bases/index.json'),'utf8'));assert.equal(idx2.length,2);assert.ok(idx2[0].ref>=idx2[1].ref);
  assert.throws(()=>execFileSync('node',[path.join(tmp,'tools/sinapi/atualizar-sinapi.mjs'),'--uf','XX','--arquivo','a'],{stdio:'pipe'}));
});

test('REGRESSÃO (relato real): o ZIP traz outros arquivos (percentual de mão de obra com abas de mesmo nome, famílias): só a Referência vale',{skip},async()=>{
  const r=await B.parseSinapiPackage(XLSX,ab('SINAPI-2026-08-formato-xlsx.zip'),'SINAPI-2026-08-formato-xlsx.zip',{uf:'BA'});
  const todos=Object.values(r.regimes).flatMap(v=>v.comp.concat(v.ins));
  assert.ok(todos.every(i=>i[3]>=1),'nenhum preço pode ser um percentual (0,xx): '+todos.filter(i=>i[3]<1).slice(0,3).join('|'));
  assert.ok(!todos.some(i=>/^COMPOSICAO NUMERO/.test(i[1])),'itens do arquivo de percentual não podem entrar');
  assert.equal(r.regimes.SD.comp.length,5);assert.equal(r.regimes.SD.ins.length,5);
  assert.ok(r.diag.some(l=>/Percentual.*ignorado/i.test(l))&&r.diag.some(l=>/Familias.*ignorado/i.test(l)),r.diag.join('\n'));
  assert.ok(r.diag.some(l=>/preço="[^"]*Custo/i.test(l)),'o diagnóstico informa de qual coluna veio o preço');
});
test('REGRESSÃO: código que é fórmula não calculada (valor 0) é recuperado da fórmula; código "0" nunca entra',{skip},async()=>{
  const r=await B.parseSinapiPackage(XLSX,ab('SINAPI_Referencia_2026_08.xlsx'),'SINAPI_Referencia_2026_08.xlsx',{uf:'BA'});
  const cod=r.regimes.SD.comp.map(i=>i[0]);assert.ok(cod.includes('87879'),'código recuperado da fórmula: '+cod.join(','));assert.ok(!cod.includes('0'));
  const lixo=B.extractItems([['Código da Composição','Descrição','Unidade','Custo'],[0,'SEM CODIGO','M2',10],['00','OUTRO','M2',10],['123','COM CODIGO','M2',10]]);assert.deepEqual(lixo.items.map(i=>i[0]),['123']);
});
test('REGRESSÃO: aba de percentual com nome oficial (CSD) é recusada em vez de virar preço',{skip},async()=>{
  const r=await B.parseSinapiPackage(XLSX,ab('SINAPI_percentual_MO_isolado.xlsx'),'SINAPI_percentual_MO_isolado.xlsx',{uf:'BA'});
  assert.equal(Object.values(r.regimes).reduce((s,v)=>s+v.comp.length+v.ins.length,0),0);assert.ok(r.avisos.some(a=>/percentual/.test(a)),r.avisos.join('|'));
});

test('ZIP com a aba Analítico: composição analítica completa, explosão em insumos e classificação (material, mão de obra, equipamento)',{skip},async()=>{
  const r=await B.parseSinapiPackage(XLSX,ab('SINAPI-2026-08-com-analitico.zip'),'SINAPI-2026-08-com-analitico.zip',{uf:'BA'});
  assert.equal(Object.keys(r.analitico).length,3);assert.equal(r.analitico['87521'].length,5);assert.deepEqual(r.analitico['87521'][0],[0,'00004567',13]);assert.ok(r.diag.some(l=>/composições analíticas/.test(l)),r.diag.join('|'));
  const base={regimes:r.regimes,analitico:r.analitico},cpu=B.buildCpu(base,'SD','87521');assert.ok(cpu.hasAnalitic);assert.equal(cpu.lines.length,5);
  const por=Object.fromEntries(cpu.flat.map(x=>[x.code+'|'+x.cls,x]));
  assert.ok(Math.abs(por['00000001|MAT'].coef-0.02*8)<1e-9,'cimento da argamassa explodida');assert.ok(Math.abs(por['88316|MO'].coef-(0.4+0.02*2))<1e-9);assert.ok(por['88309|MO']);assert.ok(por['88830|EQ']);assert.equal(por['00004567|MAT'].coef,13);
  const comp=B.toComposition(cpu.flat),kinds=new Set(comp.map(c=>c.kind));assert.deepEqual([...kinds].sort(),['Equipamento','Material','Mão de obra']);
  const sem=B.buildCpu(base,'SD','87529');assert.equal(sem.hasAnalitic,false);   // composição existente sem linhas analíticas
});
