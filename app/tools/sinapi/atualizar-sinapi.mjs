#!/usr/bin/env node
// ObraTop — atualização mensal da base SINAPI (rodar no Cloud Shell ou no computador, uma vez por mês).
//   node tools/sinapi/atualizar-sinapi.mjs --uf BA                 baixa o relatório mais recente do site da CAIXA
//   node tools/sinapi/atualizar-sinapi.mjs --uf BA --mes 2026-08   baixa um mês específico
//   node tools/sinapi/atualizar-sinapi.mjs --uf BA --arquivo ~/SINAPI-2026-08-formato-xlsx.zip   usa um arquivo já baixado
// Gera public/bases/sinapi-<UF>-<AAAA-MM>.json e atualiza public/bases/index.json. Depois publique o Hosting.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),pub=path.join(root,'public');
const B=await import(pathToFileURL(path.join(pub,'bases.mjs')).href),require=createRequire(import.meta.url);
const arg=(n,d='')=>{const i=process.argv.indexOf('--'+n);return i>=0?process.argv[i+1]:d},uf=(arg('uf','BA')).toUpperCase(),mes=arg('mes'),arquivo=arg('arquivo'),xlsxPath=arg('xlsx');
function loadXlsx(){for(const p of [xlsxPath,path.join(pub,'vendor','xlsx.full.min.js'),'xlsx'].filter(Boolean)){try{return require(p)}catch{}}
  console.error('Biblioteca de Excel não encontrada. Rode antes:\n  curl -fL -o public/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');process.exit(2)}
if(!B.UFS.includes(uf)){console.error(`UF inválida: ${uf}`);process.exit(2)}
const XLSX=loadXlsx();let buf,nome,ref=mes||'';
if(arquivo){buf=fs.readFileSync(arquivo);nome=path.basename(arquivo)}
else{
  const cand=mes?[{ym:mes}]:B.sinapiCandidateRefs(new Date(),4);
  for(const c of cand){const url=B.sinapiZipUrl(c.ym,'xlsx');process.stdout.write(`Tentando ${url} ... `);
    try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (ObraTop atualizador SINAPI)'},redirect:'follow'});
      if(!r.ok){console.log(`HTTP ${r.status}`);continue}const ab=Buffer.from(await r.arrayBuffer());
      if(!(ab[0]===0x50&&ab[1]===0x4b)){console.log('resposta não é um ZIP (o site pode ter bloqueado o acesso automático)');continue}
      buf=ab;nome=`SINAPI-${c.ym}-formato-xlsx.zip`;ref=c.ym;console.log(`ok (${(ab.length/1048576).toFixed(1)} MB)`);break}
    catch(e){console.log('falhou: '+e.message)}}
  if(!buf){console.error('\nNão consegui baixar automaticamente. Baixe o ZIP XLSX em https://www.caixa.gov.br/sinapi (Relatórios Mensais) e rode:\n  node tools/sinapi/atualizar-sinapi.mjs --uf '+uf+' --arquivo CAMINHO/DO/ARQUIVO.zip');process.exit(3)}
}
console.log(`Lendo ${nome} (UF ${uf}) ...`);
const r=await B.parseSinapiPackage(XLSX,buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),nome,{uf,onProgress:n=>console.log('  planilha:',n)});
if(mes)r.ref=mes;else if(!r.ref)r.ref=ref;   // --mes informado manda sobre o que foi detectado no arquivo
const counts=B.countOf(r.regimes),total=Object.values(counts).reduce((s,v)=>s+v.comp+v.ins,0);
if(!total){console.error('Nenhum preço encontrado para a UF '+uf+'.\n'+r.avisos.join('\n'));process.exit(4)}
if(!r.ref){console.error('Não consegui identificar o mês de referência. Informe com --mes AAAA-MM.');process.exit(5)}
const dir=path.join(pub,'bases');fs.mkdirSync(dir,{recursive:true});
const id=B.baseId('SINAPI',uf,r.ref),file=`bases/sinapi-${uf}-${r.ref}.json`;
fs.writeFileSync(path.join(pub,file),JSON.stringify({id,fonte:'SINAPI',uf,ref:r.ref,geradoEm:new Date().toISOString(),regimes:r.regimes,analitico:r.analitico||{}}));
const ip=path.join(dir,'index.json');let idx=[];try{idx=JSON.parse(fs.readFileSync(ip,'utf8'))}catch{}
idx=idx.filter(x=>x.id!==id);idx.push({id,fonte:'SINAPI',uf,ref:r.ref,file,counts,geradoEm:new Date().toISOString()});
idx.sort((a,b)=>String(b.ref).localeCompare(String(a.ref)));const keep=[];const seen={};for(const x of idx){const k=x.fonte+x.uf;seen[k]=(seen[k]||0)+1;if(seen[k]<=3)keep.push(x);else try{fs.unlinkSync(path.join(pub,x.file))}catch{}}
fs.writeFileSync(ip,JSON.stringify(keep,null,1));
console.log(`\nPronto: ${file}`);for(const[k,v]of Object.entries(counts))console.log(`  ${B.REGIMES[k]}: ${v.comp} composições, ${v.ins} insumos`);
if(r.avisos.length)console.log('Avisos:\n  '+r.avisos.join('\n  '));
if(r.diag?.length)console.log('\nDiagnóstico (quais arquivos/abas foram usados e de qual coluna veio o preço):\n  '+r.diag.join('\n  '));
console.log('\nPróximo passo: firebase deploy --only hosting --project obratop-v3-teste');
