import test from 'node:test';
import assert from 'node:assert/strict';
import * as b from '../../public/branding.mjs';
function png(w,h){const u=new Uint8Array(33);u.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]);const dv=new DataView(u.buffer);dv.setUint32(16,w);dv.setUint32(20,h);return u}
function jpeg(w,h){return Uint8Array.from([0xff,0xd8,0xff,0xe0,0,16,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0, 0xff,0xc0,0,17,8,h>>8,h&255,w>>8,w&255,3,1,0x22,0,2,0x11,1,3,0x11,1])}
test('peekDimensions lê PNG e JPEG sem decodificar',()=>{
  assert.deepEqual(b.peekDimensions(png(1200,400)),{type:'png',w:1200,h:400});
  assert.deepEqual(b.peekDimensions(jpeg(800,300)),{type:'jpeg',w:800,h:300});
  assert.equal(b.peekDimensions(new Uint8Array(40)),null);assert.equal(b.peekDimensions(null),null);
  const text=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>      ');assert.equal(b.peekDimensions(text),null);
});
test('peekDimensions: PNG gigante é identificado antes de decodificar',()=>{const d=b.peekDimensions(png(9000,9000));assert.ok(d.w*d.h>b.LOGO_MAX_PIXELS)});
test('fitSize reduz mantendo a proporção e nunca amplia',()=>{
  assert.deepEqual(b.fitSize(1200,400),{w:480,h:160});assert.deepEqual(b.fitSize(400,400),{w:160,h:160});assert.deepEqual(b.fitSize(100,50),{w:100,h:50});assert.deepEqual(b.fitSize(10,5000),{w:1,h:160});
});
test('isValidLogo aceita só PNG/JPEG em base64 e limita o tamanho',()=>{
  const ok='data:image/png;base64,'+'A'.repeat(100);
  assert.equal(b.isValidLogo(ok),true);assert.equal(b.logoFormat(ok),'png');assert.equal(b.logoFormat('data:image/jpeg;base64,AAAA'),'jpeg');
  for(const bad of ['data:image/svg+xml;base64,AAAA','data:image/gif;base64,AAAA','javascript:alert(1)','data:image/png;base64,AA"onerror="x','http://x/a.png','',null,undefined,'data:image/png;base64,'+'A'.repeat(b.LOGO_MAX_CHARS)])assert.equal(b.isValidLogo(bad),false,String(bad).slice(0,40));
});
test('pdfText troca símbolos fora do Latin-1 e mantém acentos do português',()=>{
  assert.equal(b.pdfText('Ação — “teste” • 5×2 ≥ 3 … ✓'),'Ação - "teste" - 5×2 >= 3 ... ok');assert.equal(b.pdfText('漢'),'?');assert.equal(b.pdfText(null),'');
});
test('columnWidths soma exatamente a largura útil e respeita proporções',()=>{
  const rows=[{Obra:'Pavimentação e Drenagem – Av. Principal e Ruas Adjacentes',Valor:'1',Status:'Ativo'}];
  const w=b.columnWidths(['Obra','Valor','Status'],rows,273);assert.ok(Math.abs(w.reduce((a,c)=>a+c,0)-273)<1e-9);assert.ok(w[0]>w[1]&&w[0]>w[2]);
});
test('PDF padronizado: cabeçalho, tabela com várias páginas e rodapé Página x de y (jsPDF simulado)',()=>{
  const calls=[];let pages=1,cur=1;
  const doc={internal:{pageSize:{getWidth:()=>297,getHeight:()=>210}},setFont(){},setFontSize(){},setTextColor(){},setDrawColor(){},setLineWidth(){},setFillColor(){},line(){},rect(){},
    text(t,x,y,o){calls.push({page:cur,t:Array.isArray(t)?t.join('|'):t})},addImage(...a){calls.push({page:cur,img:a[1]})},addPage(){pages++;cur=pages},setPage(n){cur=n},getNumberOfPages:()=>pages,
    splitTextToSize:(t,w)=>[String(t)]};
  const rows=Array.from({length:120},(_,i)=>({Obra:'Obra '+i,Valor:'R$ '+i,Status:'Ativo'}));
  const r=b.buildTablePdf(doc,{title:'Financeiro',subtitle:'Todas as obras',orgName:'Construtora Exemplo Ltda',cnpj:'12.345.678/0001-90',generatedAt:'08/10/2026 09:00',release:'3.27.0.0',logo:{dataUrl:'data:image/png;base64,AAAA',w:300,h:100},rows});
  assert.ok(r.pages>=3);assert.equal(calls.filter(c=>c.img).length,r.pages);                      // logo em todas as páginas
  assert.equal(calls.filter(c=>c.t==='Construtora Exemplo Ltda').length,r.pages);               // nome da empresa em todas as páginas
  assert.ok(calls.some(c=>c.t===`Página ${r.pages} de ${r.pages}`)&&calls.some(c=>c.t===`Página 1 de ${r.pages}`));
  assert.equal(calls.filter(c=>c.t==='Financeiro').length,r.pages);
  const semLogo=[];const d2={...doc,addImage(){semLogo.push(1)}};b.buildTablePdf(d2,{title:'x',orgName:'E',rows:[{a:1}],release:'1'});assert.equal(semLogo.length,0);
});

test('PDF padronizado: colunas totalmente vazias são omitidas sem acusar "colunas não exibidas"',()=>{
  const calls=[];const doc={internal:{pageSize:{getWidth:()=>297,getHeight:()=>210}},setFont(){},setFontSize(){},setTextColor(){},setDrawColor(){},setLineWidth(){},setFillColor(){},line(){},rect(){},text(t){calls.push(Array.isArray(t)?t.join('|'):t)},addImage(){},addPage(){},setPage(){},getNumberOfPages:()=>1,splitTextToSize:t=>[String(t)]};
  const r=b.buildTablePdf(doc,{title:'T',orgName:'E',release:'1',rows:[{Obra:'A',Vazia:'',Valor:'1'},{Obra:'B',Vazia:'  ',Valor:'2'}]});
  assert.deepEqual(r.columns,['Obra','Valor']);assert.equal(r.omitted,0);assert.ok(!calls.some(c=>String(c).includes('coluna(s) adicional')));
});

test('PDF padronizado: pinLast mantém a coluna escolhida sempre por último, mesmo com mais de 10 colunas',()=>{
  const doc={internal:{pageSize:{getWidth:()=>297,getHeight:()=>210}},setFont(){},setFontSize(){},setTextColor(){},setDrawColor(){},setLineWidth(){},setFillColor(){},line(){},rect(){},text(){},addImage(){},addPage(){},setPage(){},getNumberOfPages:()=>1,splitTextToSize:t=>[String(t)]};
  const row={};for(let i=1;i<=14;i++)row['C'+i]='x';row['Engº Responsável']='Engº Fulano';
  const r=b.buildTablePdf(doc,{title:'T',orgName:'E',release:'1',rows:[row],pinLast:'Engº Responsável'});
  assert.equal(r.columns.length,10);assert.equal(r.columns.at(-1),'Engº Responsável');assert.deepEqual(r.columns.slice(0,9),['C1','C2','C3','C4','C5','C6','C7','C8','C9']);
  const sem=b.buildTablePdf(doc,{title:'T',orgName:'E',release:'1',rows:[row]});assert.ok(!sem.columns.includes('Engº Responsável'));
  const ausente=b.buildTablePdf(doc,{title:'T',orgName:'E',release:'1',rows:[{A:'1'}],pinLast:'Engº Responsável'});assert.deepEqual(ausente.columns,['A']);
});

test('formatCnpj, validEmail e companyLines montam as linhas do cabeçalho da empresa',()=>{
  assert.equal(b.formatCnpj('12345678000190'),'12.345.678/0001-90');assert.equal(b.formatCnpj('12.345.678/0001-90'),'12.345.678/0001-90');assert.equal(b.formatCnpj(' 123 '),'123');assert.equal(b.formatCnpj(null),'');
  assert.equal(b.validEmail(''),true);assert.equal(b.validEmail('a@b.com.br'),true);for(const x of ['a@b','a b@c.com','@c.com','abc'])assert.equal(b.validEmail(x),false,x);
  assert.deepEqual(b.companyLines({cnpj:'1',address:'Rua A',phone:'75',email:'x@y.com'}),['CNPJ: 1','Rua A','Tel.: 75  •  E-mail: x@y.com']);
  assert.deepEqual(b.companyLines({cnpj:'1'}),['CNPJ: 1']);assert.deepEqual(b.companyLines({}),[]);assert.deepEqual(b.companyLines({email:'x@y.com'}),['E-mail: x@y.com']);
});
test('cabeçalho do PDF traz CNPJ, endereço, telefone e e-mail e empurra o título para baixo',()=>{
  const calls=[];const doc={internal:{pageSize:{getWidth:()=>297,getHeight:()=>210}},setFont(){},setFontSize(){},setTextColor(){},setDrawColor(){},setLineWidth(){},setFillColor(){},line(){},rect(){},text(t,x,y){calls.push({t:Array.isArray(t)?t.join('|'):t,y})},addImage(){},addPage(){},setPage(){},getNumberOfPages:()=>1,splitTextToSize:t=>[String(t)]};
  const y1=b.drawPdfHeader(doc,{orgName:'Empresa X',title:'Relatório',generatedAt:'hoje'});
  const y2=b.drawPdfHeader(doc,{orgName:'Empresa X',cnpj:'12.345.678/0001-90',address:'Rua A, 1 - Cidade/UF',phone:'(75) 9999-0000',email:'a@b.com',title:'Relatório',generatedAt:'hoje'});
  const all=calls.map(c=>c.t).join(' ');
  for(const x of ['CNPJ: 12.345.678/0001-90','Rua A, 1 - Cidade/UF','Tel.: (75) 9999-0000','E-mail: a@b.com'])assert.ok(all.includes(x.replace(' • ','')) || all.includes(x),x);
  assert.ok(y2>y1,'o cabeçalho com mais linhas deve ocupar mais espaço');
});
