import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import * as b from '../../public/bases.mjs';
const UFROW=(cols,start)=>{const r=Array(start).fill('');for(const u of cols){r.push(u,'')}return r};
// --- layouts de teste (linhas de planilha) ---
function sinapiWideIns(){ // arquivo único com todas as UF: cada UF tem "Origem" e "Preço"
  const ufs=['AC','AL','BA','SP'];const top=[['SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil'],['Preços de insumos - Referência 08/2026 - Sem desoneração'],[]];
  const uf=UFROW(ufs,4);const head=['Classificação','Código do Insumo','Descrição do Insumo','Unidade'];for(const _ of ufs)head.push('Origem de Preço','Preço Mediano R$');
  const mk=(cl,c,d,u,p)=>[cl,c,d,u,...ufs.flatMap((x,i)=>['C',p+i])];
  return[...top,uf,head,mk('MATERIAIS','00000001','CIMENTO PORTLAND CP II-32, SACO 50 KG','SC',30),mk('MATERIAIS','00000002','AREIA MEDIA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)','M3',100),mk('MAO DE OBRA','00001234','PEDREIRO (HORISTA)','H',20.5)]
}
function sinapiWideComp(){ // composições sintéticas: cada UF tem "Custo" e "%AS"
  const ufs=['AC','AL','BA','SP'];const uf=UFROW(ufs,4);const head=['Grupo','Código da Composição','Descrição','Unidade'];for(const _ of ufs)head.push('Custo (R$)','%AS');
  const mk=(g,c,d,u,p)=>[g,c,d,u,...ufs.flatMap((x,i)=>[p+i,0.5])];
  return[['SINAPI'],['Custo de composições - 08/2026'],[],uf,head,mk('ALVENARIA','87521','ALVENARIA DE VEDACAO DE BLOCOS CERAMICOS FURADOS 9X19X19CM','M2',75.3),mk('REVESTIMENTO','87879','CHAPISCO APLICADO EM ALVENARIAS E ESTRUTURAS DE CONCRETO INTERNAS','M2',3.1)]
}
function sinapiOldNarrowIns(){return[['SINAPI'],[],['Classificação','Código do Insumo','Descrição do Insumo','Unidade','Origem de Preço','Preço Mediano R$'],['MATERIAIS','00000001','CIMENTO PORTLAND CP II-32','SC','C','31,50'],['MATERIAIS','00000003','TIJOLO CERAMICO','MIL','CR','1.234,56']]}
function sinapiOldNarrowComp(){return[['SINAPI'],[],['Grupo','Código da Composição','Descrição','Unidade','Custo Total R$','% AS'],['ALVENARIA','87521','ALVENARIA DE VEDACAO','M2','75,30','0,5']]}

test('parseNum entende formatos brasileiro e internacional',()=>{
  const c=[['1.234,56',1234.56],['1234,5',1234.5],['R$ 12,30',12.3],['1234.56',1234.56],['1.234.567',1234567],[12.5,12.5],['  ',NaN],['abc',NaN],['',NaN]];
  for(const[i,o]of c){const v=b.parseNum(i);assert.ok(Object.is(v,o)||Math.abs(v-o)<1e-9,String(i))}
  assert.equal(b.parseNum('1.234',true),1234);assert.equal(b.parseNum('1.234',false),1.234);
});
test('SINAPI arquivo único (todas as UF): pega a coluna de preço da Bahia, não a de origem',()=>{
  const r=b.extractItems(sinapiWideIns(),{uf:'BA'});assert.equal(r.items.length,3);assert.equal(r.wide,true);
  const cim=r.items.find(i=>i[0]==='00000001');assert.deepEqual(cim.slice(0,4),['00000001','CIMENTO PORTLAND CP II-32, SACO 50 KG','SC',32]);   // 30 + índice da UF BA (2)
  assert.equal(cim[4],'C');assert.equal(r.items[2][3],22.5);
  const sp=b.extractItems(sinapiWideIns(),{uf:'SP'});assert.equal(sp.items[0][3],33);
  assert.equal(b.extractItems(sinapiWideIns(),{uf:'PA'}).reason,'uf');
});
test('SINAPI composições sintéticas com %AS: preço vem da coluna de custo',()=>{
  const r=b.extractItems(sinapiWideComp(),{uf:'BA'});assert.equal(r.items.length,2);assert.equal(r.items[0][0],'87521');assert.equal(r.items[0][3],77.3);assert.equal(r.items[0][5],'ALVENARIA');
});
test('SINAPI arquivo antigo por UF (uma coluna de preço), com milhar e vírgula decimais em texto',()=>{
  const i=b.extractItems(sinapiOldNarrowIns());assert.equal(i.items.length,2);assert.equal(i.items[0][3],31.5);assert.equal(i.items[1][3],1234.56);assert.equal(i.items[1][4],'CR');
  const c=b.extractItems(sinapiOldNarrowComp());assert.equal(c.items[0][3],75.3);
});
test('classificação de abas por nome e por conteúdo, com regime',()=>{
  assert.deepEqual(b.classifySheet('ISD',[]),{kind:'ins',regime:'SD',by:'nome'});assert.deepEqual(b.classifySheet('CCD',[]),{kind:'comp',regime:'CD',by:'nome'});assert.equal(b.classifySheet('CSE',[]).regime,'SE');
  assert.equal(b.classifySheet('Analítico',[]).kind,'analitico');
  const c=b.classifySheet('Planilha1',sinapiOldNarrowComp(),'SINAPI_Custo_Ref_Composicoes_Sintetico_BA_202608_Desonerado.xlsx');assert.deepEqual([c.kind,c.regime],['comp','CD']);
  assert.equal(b.classifySheet('Planilha1',sinapiOldNarrowIns(),'SINAPI_Preco_Ref_Insumos_BA_202608_NaoDesonerado.xlsx').regime,'SD');
  assert.equal(b.classifySheet('Capa',[['só texto']]),null);
});
test('parseSinapiSheets junta as abas por regime, detecta a referência e ignora o que não é preço',()=>{
  const r=b.parseSinapiSheets({ISD:sinapiWideIns(),CSD:sinapiWideComp(),CCD:sinapiWideComp(),Analítico:[['x']],Capa:[['Leia-me']]},{uf:'BA',fileName:'SINAPI_Referência_2026_08.xlsx'});
  assert.equal(r.ref,'2026-08');assert.equal(r.regimes.SD.ins.length,3);assert.equal(r.regimes.SD.comp.length,2);assert.equal(r.regimes.CD.comp.length,2);assert.equal(r.regimes.CD.ins.length,0);
  assert.deepEqual(b.countOf(r.regimes).SD,{comp:2,ins:3});assert.equal(r.sheets.length,3);
  assert.ok(b.parseSinapiSheets({ISD:sinapiWideIns()},{uf:'PA'}).avisos[0].includes('PA'));
});
test('detectRef lê a referência em nomes de arquivo e textos',()=>{
  assert.equal(b.detectRef('SINAPI_ref_Insumos_Composicoes_BA_202608_NaoDesonerado.zip'),'2026-08');assert.equal(b.detectRef('SINAPI-2026-07-formato-xlsx.zip'),'2026-07');
  assert.equal(b.detectRef('Referência 08/2026'),'2026-08');assert.equal(b.detectRef('Data de referência: set/25'),'2025-09');assert.equal(b.detectRef('nada aqui'),'');
});
test('CSV: delimitador ;, aspas, vírgula decimal e cabeçalho com acento',()=>{
  const csv='\ufeffCódigo;Descrição;Unidade;Preço Unitário\r\nORSE-100;"Alvenaria; tijolo ""furado"" 9x19x19";m2;"1.234,50"\r\nORSE-101;Chapisco;m2;3,10\r\n';
  const rows=b.parseCsv(csv);assert.equal(rows.length,3);assert.equal(rows[1][1],'Alvenaria; tijolo "furado" 9x19x19');
  const r=b.extractItems(rows,{decimalComma:b.csvUsesDecimalComma(rows)});assert.equal(r.items.length,2);assert.equal(r.items[0][0],'ORSE-100');assert.equal(r.items[0][3],1234.5);assert.equal(r.items[1][3],3.1);
  const tab=b.parseCsv('codigo\tdescricao\tunid\tpreco\n10\tReboco\tm2\t12,5\n');assert.equal(tab[1][3],'12,5');
});
test('ORSE: prefere "preço unitário" a "custo total" e aceita cabeçalho "Serviço"',()=>{
  const rows=[['Código','Serviço','Unid.','Custo Total','Preço Unitário (R$)'],['1001','Fornecimento e assentamento de joelho','un',99,19.93]];
  const r=b.extractItems(rows);assert.equal(r.items[0][3],19.93);assert.equal(r.items[0][1],'Fornecimento e assentamento de joelho');
});
test('mapeamento manual de colunas',()=>{
  const rows=[['x','y','z','w'],['5','Item A','m','10,5'],['6','Item B','kg','2']];
  const r=b.extractWithMapping(rows,{headerRow:0,code:0,desc:1,unit:2,price:3,group:-1,decimalComma:true});assert.equal(r.items.length,2);assert.equal(r.items[0][3],10.5);
});
test('PDF: linhas de relatório de insumos e de composições do SINAPI/ORSE',()=>{
  const l=['MATERIAIS 00000001 CIMENTO PORTLAND CP II-32, SACO 50 KG SC C 32,50','00000002 AREIA MEDIA M3 CR 1.100,00','87521 ALVENARIA DE VEDACAO DE BLOCOS CERAMICOS M2 75,30','ORSE 1001 Joelho un 19,93','página 1 de 3','Código Descrição Unidade Preço','00000009 TIJOLO CERAMICO FURADO','9x19x19 CM MIL 850,00'];
  const r=b.parsePdfLines(l);assert.equal(r.items.length,4);assert.deepEqual(r.items[0].slice(0,5),['00000001','CIMENTO PORTLAND CP II-32, SACO 50 KG','SC',32.5,'C']);assert.equal(r.items[1][3],1100);assert.equal(r.items[2][2],'M2');
  assert.equal(b.parsePdfLine('só texto sem preço'),null);assert.equal(b.parsePdfLine('1 2 3'),null);
});
// --- ZIP ---
function makeZip(files){
  const parts=[],cd=[];let off=0;
  for(const[name,data]of files){const nb=Buffer.from(name),raw=Buffer.from(data),comp=name.endsWith('.txt')?raw:zlib.deflateRawSync(raw),method=name.endsWith('.txt')?0:8;
    const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x800,6);lh.writeUInt16LE(method,8);lh.writeUInt32LE(comp.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(nb.length,26);
    parts.push(lh,nb,comp);
    const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x800,8);ch.writeUInt16LE(method,10);ch.writeUInt32LE(comp.length,20);ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(nb.length,28);ch.writeUInt32LE(off,42);
    cd.push(ch,nb);off+=30+nb.length+comp.length}
  const cds=Buffer.concat(cd),eo=Buffer.alloc(22);eo.writeUInt32LE(0x06054b50,0);eo.writeUInt16LE(files.length,8);eo.writeUInt16LE(files.length,10);eo.writeUInt32LE(cds.length,12);eo.writeUInt32LE(off,16);
  return Buffer.concat([...parts,cds,eo])
}
test('ZIP: lista entradas e descompacta (deflate e sem compressão), com nomes acentuados',async()=>{
  const conteudo='linha 1\nligação de água\n'.repeat(50),z=makeZip([['SINAPI_Referência_2026_08.csv',conteudo],['leia-me.txt','oi'],['pasta/']].filter(x=>x[1]!==undefined));
  const ab=z.buffer.slice(z.byteOffset,z.byteOffset+z.byteLength),l=b.listZip(ab);assert.deepEqual(l.map(e=>e.name),['SINAPI_Referência_2026_08.csv','leia-me.txt']);
  assert.equal(new TextDecoder().decode(await b.readZipEntry(ab,l[0])),conteudo);assert.equal(new TextDecoder().decode(await b.readZipEntry(ab,l[1])),'oi');
  assert.throws(()=>b.listZip(new ArrayBuffer(10)),/ZIP/);
});
// --- busca e orçamento ---
const BASE=[['87521','ALVENARIA DE VEDACAO DE BLOCOS CERAMICOS FURADOS 9X19X19CM','M2',75.3,'','ALVENARIA'],['87879','CHAPISCO APLICADO EM ALVENARIAS','M2',3.1,'',''],['00000001','CIMENTO PORTLAND CP II-32','SC',32.5,'C',''],['103','Alvenaria de pedra argamassada','M3',410,'','']];
test('busca: acentos, várias palavras, código exato primeiro, limite e contagem',()=>{
  const ix=b.makeIndex(BASE);
  assert.deepEqual(b.searchIndex(ix,'alvenaria').items.map(i=>i[0]).sort(),['103','87521','87879']);
  assert.deepEqual(b.searchIndex(ix,'ALVENARIA vedação').items.map(i=>i[0]),['87521']);
  assert.equal(b.searchIndex(ix,'87879').items[0][0],'87879');assert.equal(b.searchIndex(ix,'zzz').items.length,0);
  const lim=b.searchIndex(ix,'a',2);assert.equal(lim.items.length,2);assert.equal(lim.more,true);assert.ok(lim.total>=3);
  assert.equal(b.searchIndex(ix,'').items.length,4);
});
test('totalização: preço total por item, subtotal, BDI e total geral (arredondando em centavos)',()=>{
  const it=[{qty:10,price:75.3},{qty:2.5,price:3.1},{qty:0,price:100}];
  assert.equal(b.itemTotal(it[0]),753);assert.equal(b.itemTotal(it[1]),7.75);
  const t=b.budgetTotals(it,25);assert.deepEqual(t,{subtotal:760.75,bdiValue:190.19,total:950.94,count:3});
  assert.deepEqual(b.budgetTotals([],25),{subtotal:0,bdiValue:0,total:0,count:0});assert.equal(b.priceWithBdi(100,22.5),122.5);
  assert.equal(b.budgetTotals([{qty:'3',price:'1,5'}],0).subtotal,0);   // texto com vírgula não é número: a interface converte antes
});
test('validação do item do orçamento',()=>{
  assert.equal(b.validateBudgetItem({desc:'x',qty:1,price:2}),'');assert.match(b.validateBudgetItem({desc:' ',qty:1,price:2}),/discrimina/);assert.match(b.validateBudgetItem({desc:'x',qty:-1,price:2}),/Quantidade/);assert.match(b.validateBudgetItem({desc:'x',qty:1,price:NaN}),/Pre/);
});
test('links oficiais: ZIP do mês e meses candidatos',()=>{
  assert.equal(b.sinapiZipUrl('2026-08'),'https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-08-formato-xlsx.zip');assert.ok(b.sinapiZipUrl('2026-08','pdf').endsWith('formato-pdf.zip'));
  const c=b.sinapiCandidateRefs(new Date(2026,9,8),3);assert.deepEqual(c.map(x=>x.ym),['2026-09','2026-08','2026-07']);assert.equal(c[1].label,'08/2026');
  assert.equal(b.sinapiCandidateRefs(new Date(2026,0,15),2)[1].ym,'2025-11');assert.equal(b.ORSE_DOWNLOADS,'https://orse.cehop.se.gov.br/downloads.asp');
});

test('looksLikePercent separa colunas de percentual (0 a 1) de preços reais',()=>{
  const pct=Array.from({length:30},(_,i)=>['c'+i,'d','m',0.1+i/100,'','']),preco=Array.from({length:30},(_,i)=>['c'+i,'d','m',1.5+i*7,'','']);
  assert.equal(b.looksLikePercent(pct),true);assert.equal(b.looksLikePercent(preco),false);assert.equal(b.looksLikePercent(pct.slice(0,5)),false);
  const miste=[...preco,...pct.slice(0,3)];assert.equal(b.looksLikePercent(miste),false);
});
test('arquivos que não são de preço são reconhecidos pelo nome',()=>{
  for(const n of ['SINAPI_Familias_e_Coeficientes_2026_08.xlsx','SINAPI_Manutencoes_2026_08.xlsx','SINAPI_Percentual_de_Mao_de_Obra_2026_08.xlsx','pasta/Leia-me.xlsx'])assert.equal(b.isPriceFileName(n),false,n);
  for(const n of ['SINAPI_Referência_2026_08.xlsx','SINAPI_Referencia_2026_08.xlsx','x/SINAPI_Preco_Ref_Insumos_BA_202608_NaoDesonerado.xlsx'])assert.equal(b.isPriceFileName(n),true,n);
});
test('sem rótulo de preço numa planilha com UF, só aceita a coluna da UF se a aba tem nome oficial',()=>{
  const rows=[['Código da Composição','Descrição','Unidade','AC','AL','BA'],['100','A','M2',10,11,12],['101','B','M2',20,21,22]];
  assert.equal(b.extractItems(rows,{uf:'BA'}).reason,'preco');assert.equal(b.extractItems(rows,{uf:'BA',bare:true}).items[0][3],12);
});

// ---------- composições analíticas (CPU) ----------
const BASE_CPU=()=>({regimes:{SD:{
  ins:[['6111','SERVENTE (HORISTA)','H',20,'C','MAO DE OBRA'],['1379','CIMENTO PORTLAND CP II-32','KG',0.8,'C','MATERIAL'],['370','AREIA MEDIA','M3',100,'C','MATERIAL'],['7258','BLOCO CERAMICO 9X19X19','UN',1.35,'C','MATERIAL'],['4750','PEDREIRO (HORISTA)','H',24,'C','MAO DE OBRA']],
  comp:[['88316','SERVENTE COM ENCARGOS COMPLEMENTARES','H',22.5,'',''],['88309','PEDREIRO COM ENCARGOS COMPLEMENTARES','H',27,'',''],['87292','ARGAMASSA TRACO 1:2:8, PREPARO MANUAL','M3',380,'',''],['88830','BETONEIRA 400 L - CHP DIURNO','CHP',5.5,'',''],['87521','ALVENARIA DE VEDACAO DE BLOCOS CERAMICOS 9X19X19','M2',75.3,'','ALVENARIA'],['99999','SEM ANALITICO','UN',10,'','']]}},
  analitico:{'87521':[[0,'7258',13],[1,'87292',0.02],[1,'88309',0.8],[1,'88316',0.4],[1,'88830',0.01]],'87292':[[0,'1379',280],[0,'370',1.1],[1,'88316',2]]}});
test('parseAnalitico: lê código da composição, tipo, item e coeficiente (com vírgula decimal)',()=>{
  const rows=[['SINAPI'],[],['Grupo','Código da Composição','Tipo Item','Código do Item','Descrição','Unidade','Coeficiente','Situação'],['ALV','87521','COMPOSICAO','','ALVENARIA','M2','',''],['ALV','87521','INSUMO','7258','BLOCO','UN','13,0000000','Com preço'],['ALV','87521','COMPOSICAO','87292','ARGAMASSA','M3','0,0200000','Com custo'],['ALV','87521','INSUMO','0','LIXO','UN','1','x'],['ALV','87292','INSUMO','1379','CIMENTO','KG',280,'']];
  const r=b.parseAnalitico(rows);assert.deepEqual(r.map['87521'],[[0,'7258',13],[1,'87292',0.02]]);assert.deepEqual(r.map['87292'],[[0,'1379',280]]);assert.equal(r.count,3);
  assert.equal(b.parseAnalitico([['a','b']]).reason,'cabecalho');
});
test('classifyResource: material, mão de obra e equipamento',()=>{
  const c=(d,u,g='')=>b.classifyResource('1',d,u,g);
  assert.equal(c('SERVENTE (HORISTA)','H','MAO DE OBRA'),'MO');assert.equal(c('PEDREIRO COM ENCARGOS COMPLEMENTARES','H'),'MO');assert.equal(c('CARPINTEIRO DE FORMAS (MENSALISTA)','MES'),'MO');
  assert.equal(c('BETONEIRA 400 L - CHP DIURNO','CHP'),'EQ');assert.equal(c('RETROESCAVADEIRA - CHI DIURNO','CHI'),'EQ');assert.equal(c('ALUGUEL DE ANDAIME','MES','ALUGUEL DE EQUIPAMENTOS'),'EQ');
  assert.equal(c('CIMENTO PORTLAND CP II-32','KG','MATERIAL'),'MAT');assert.equal(c('AREIA MEDIA','M3'),'MAT');assert.equal(c('SERVICO TERCEIRIZADO','UN','SERVICOS'),'OUT');
});
test('buildCpu: linhas como publicadas, total pelos coeficientes e explosão (argamassa vira cimento/areia; CHP e hora de MO ficam como recursos)',()=>{
  const cpu=b.buildCpu(BASE_CPU(),'SD','87521');assert.equal(cpu.hasAnalitic,true);assert.equal(cpu.lines.length,5);
  assert.deepEqual(cpu.lines.map(l=>l.tipo),['INSUMO','COMPOSIÇÃO','COMPOSIÇÃO','COMPOSIÇÃO','COMPOSIÇÃO']);
  const tot=13*1.35+0.02*380+0.8*27+0.4*22.5+0.01*5.5;assert.ok(Math.abs(cpu.total-tot)<1e-9,String(cpu.total));
  const f=Object.fromEntries(cpu.flat.map(x=>[x.code+'|'+x.cls,x]));
  assert.ok(Math.abs(f['1379|MAT'].coef-0.02*280)<1e-9);assert.ok(Math.abs(f['370|MAT'].coef-0.02*1.1)<1e-9);
  assert.ok(Math.abs(f['88316|MO'].coef-(0.4+0.02*2))<1e-9,'servente: direto 0,4 + via argamassa 0,04');assert.ok(f['88309|MO']&&f['88830|EQ']);assert.equal(f['7258|MAT'].coef,13);
  assert.ok(!cpu.flat.some(x=>x.code==='87292'),'a argamassa não pode ficar como item: foi explodida');
  const k=b.toComposition(cpu.flat);assert.ok(k.every(x=>['Material','Mão de obra','Equipamento','Outros'].includes(x.kind)));assert.equal(k.find(x=>x.code==='88830').kind,'Equipamento');assert.equal(k.find(x=>x.code==='88309').kind,'Mão de obra');
  const sem=b.buildCpu(BASE_CPU(),'SD','99999');assert.equal(sem.hasAnalitic,false);assert.equal(sem.flat.length,0);assert.equal(b.buildCpu(BASE_CPU(),'SD','00000'),null);assert.equal(b.buildCpu(BASE_CPU(),'CD','87521'),null);
});
test('toComposition limita a 60 linhas, agrupando as de menor custo em "Outros" sem perder o valor',()=>{
  const flat=Array.from({length:80},(_,i)=>({code:'c'+i,desc:'item '+i,unit:'UN',cls:'MAT',coef:1,price:i+1})),k=b.toComposition(flat);
  assert.equal(k.length,60);const soma=a=>a.reduce((s,x)=>s+x.coef*x.price,0);assert.ok(Math.abs(soma(k)-soma(flat.map(f=>({coef:f.coef,price:f.price}))))<0.01);assert.match(k.at(-1).description,/Demais insumos \(21/);
});

test('Analítico no layout real da CAIXA 08/2026: títulos de composição, itens com código numérico e código da composição vazio nas linhas de itens',()=>{
  const rows=[['SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil'],['RELATÓRIO ANALÍTICO DE COMPOSIÇÕES'],['Mês de Referência:','08/2026'],['Data de emissão:','11/09/2026','','COM PREÇO','Insumos com preço coletado...'],['','','','SEM PREÇO','...'],[],[],[],[],
   ['Grupo','Código da Composição','Tipo Item','Código do Item','Descrição','Unidade','Coeficiente','Situação'],
   ['Acessibilidade',104658,'','','PISO PODOTATIL DE ALERTA...','M2','','COM CUSTO'],
   ['Acessibilidade',104658,'COMPOSICAO',88316,'SERVENTE COM ENCARGOS COMPLEMENTARES','H',1.279,'COM CUSTO'],
   ['','','COMPOSICAO',88309,'PEDREIRO COM ENCARGOS COMPLEMENTARES','H',0.639,'COM CUSTO'],
   ['','','INSUMO',36178,'PISO TATIL','UN',6.4375,'COM PREÇO'],
   ['Acessibilidade',105002,'','','RAMPA DE ACESSIBILIDADE...','UN','','COM CUSTO'],
   ['Acessibilidade',105002,'COMPOSICAO',104658,'PISO PODOTATIL','M2',0.48,'COM CUSTO'],
   ['Acessibilidade',105002,'INSUMO',5068,'PREGO DE ACO POLIDO','KG','0,0366960','COM PREÇO']];
  const r=b.parseAnalitico(rows);assert.deepEqual(r.map['104658'],[[1,'88316',1.279],[1,'88309',0.639],[0,'36178',6.4375]]);assert.deepEqual(r.map['105002'],[[1,'104658',0.48],[0,'5068',0.036696]]);assert.equal(r.count,5);assert.equal(r.headerRow,9);
});

test('REGRESSÃO (relato real): composições com código em fórmula (0) são recuperadas pelo nome na aba Analítico; ambíguas e sem correspondência são descartadas',()=>{
  const csd=[['Grupo','Código da Composição','Descrição','Unidade','AC','','AL','','BA',''],['','','','','Custo (R$)','%AS','Custo (R$)','%AS','Custo (R$)','%AS'],
    ['TAPUME',0,'TAPUME COM TELHA METÁLICA. AF_03/2024','M2',80,0.4,90,0.4,98.28,0.42],['TAPUME',0,'TAPUME COM COMPENSADO DE MADEIRA. AF_03/2024','M2',90,0.4,99,0.4,105.08,0.42],['TAPUME',98458,'COM CODIGO REAL','M2',8,0.4,9,0.4,10.5,0.42],
    ['TAPUME',0,'TAPUME SEM CORRESPONDENCIA','M2',1,0.4,2,0.4,34.33,1],['TAPUME',0,'REPETIDO DUAS VEZES','M2',1,0,2,0,5,1]];
  const ana=[['Grupo','Código da Composição','Tipo Item','Código do Item','Descrição','Unidade','Coeficiente','Situação'],
    ['T',98459,'','','TAPUME COM TELHA METÁLICA. AF_03/2024','M2','','COM CUSTO'],['T',98459,'INSUMO',1,'X','UN',1,''],['T',98457,'','','TAPUME COM COMPENSADO DE MADEIRA. AF_03/2024','M2','',''],['T',98457,'INSUMO',2,'Y','UN',2,''],
    ['T',111,'','','REPETIDO DUAS VEZES','M2','',''],['T',111,'INSUMO',3,'Z','UN',1,''],['T',222,'','','REPETIDO DUAS VEZES','M2','',''],['T',222,'INSUMO',3,'Z','UN',1,'']];
  const r=b.finalizeParsed(b.parseSinapiSheets({CSD:csd,'Analítico':ana},{uf:'BA',fileName:'SINAPI_Referência_2026_08.xlsx'})),c=r.regimes.SD.comp;
  assert.deepEqual(c.map(x=>[x[0],x[3]]).sort(),[['98457',105.08],['98458',10.5],['98459',98.28]],JSON.stringify(c.map(x=>x.slice(0,4))));
  assert.ok(r.diag.some(l=>/2 recuperados.*2 descartados/.test(l)),r.diag.join('|'));assert.ok(c.every(x=>x[0]&&x[3]>=1));
});
test('extractItems sem keepNoCode continua descartando códigos vazios ou "0"',()=>{
  const rows=[['Código da Composição','Descrição','Unidade','Custo'],[0,'A','M2',10],['','B','M2',10],[5,'C','M2',10]];assert.deepEqual(b.extractItems(rows).items.map(i=>i[0]),['5']);assert.equal(b.extractItems(rows,{keepNoCode:true}).items.length,3);
});
