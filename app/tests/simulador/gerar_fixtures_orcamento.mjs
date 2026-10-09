// Gera arquivos de teste que imitam os layouts do SINAPI (arquivo único com todas as UF e arquivo antigo por UF), ORSE (CSV/XLSX/PDF) e um layout irreconhecível.
// Uso: node gerar_fixtures_orcamento.mjs SAIDA_DIR [caminho/xlsx.full.min.js] [caminho/jspdf.umd.min.js]
import fs from 'node:fs';import zlib from 'node:zlib';import path from 'node:path';import {createRequire} from 'node:module';
const out=process.argv[2]||'/tmp/fb/fx',require=createRequire(import.meta.url);fs.mkdirSync(out,{recursive:true});
const XLSX=require(path.resolve(process.argv[3]||'/tmp/vendor/xlsx.full.min.js'));
function makeZip(files){const parts=[],cd=[];let off=0;for(const[name,data]of files){const nb=Buffer.from(name),raw=Buffer.from(data),comp=zlib.deflateRawSync(raw);
  const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x800,6);lh.writeUInt16LE(8,8);lh.writeUInt32LE(comp.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(nb.length,26);parts.push(lh,nb,comp);
  const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x800,8);ch.writeUInt16LE(8,10);ch.writeUInt32LE(comp.length,20);ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(nb.length,28);ch.writeUInt32LE(off,42);cd.push(ch,nb);off+=30+nb.length+comp.length}
  const cds=Buffer.concat(cd),eo=Buffer.alloc(22);eo.writeUInt32LE(0x06054b50,0);eo.writeUInt16LE(files.length,8);eo.writeUInt16LE(files.length,10);eo.writeUInt32LE(cds.length,12);eo.writeUInt32LE(off,16);return Buffer.concat([...parts,cds,eo])}
const UFS=['AC','AL','AM','BA','SP'],ix=u=>UFS.indexOf(u);
const INS=[['MATERIAIS','00000001','CIMENTO PORTLAND CP II-32, EM SACO DE 50 KG','SC',30],['MATERIAIS','00000002','AREIA MEDIA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)','M3',100],['MATERIAIS','00000003','TIJOLO CERAMICO FURADO 9X19X19CM','MIL',950],['MAO DE OBRA','00001234','PEDREIRO (HORISTA)','H',22.5],['MATERIAIS','00004567','BLOCO CERAMICO DE VEDACAO 9X19X19 CM','UN',1.35]];
const COMP=[['ALVENARIA','87521','ALVENARIA DE VEDACAO DE BLOCOS CERAMICOS FURADOS NA HORIZONTAL DE 9X19X19CM (ESPESSURA 9 CM)','M2',75.3],['REVESTIMENTO','87879','CHAPISCO APLICADO EM ALVENARIAS E ESTRUTURAS DE CONCRETO INTERNAS, COM COLHER DE PEDREIRO','M2',3.1],['REVESTIMENTO','87529','MASSA UNICA, EM ARGAMASSA TRACO 1:2:8, PREPARO MANUAL, APLICADA MANUALMENTE EM FACES INTERNAS DE PAREDES','M2',34.9],['PINTURA','88489','APLICACAO MANUAL DE PINTURA COM TINTA LATEX ACRILICA EM PAREDES, DUAS DEMAOS','M2',14.2],['PISO','87248','REVESTIMENTO CERAMICO PARA PISO COM PLACAS TIPO ESMALTADA EXTRA DE DIMENSOES 35X35 CM','M2',58.8]];
function wideSheet(titulo,cab,linhas,subs){ // arquivo único: cada UF tem duas colunas
  const ufRow=['','','',''];for(const u of UFS)ufRow.push(u,'');const head=[...cab];for(const u of UFS)head.push(...subs);
  return XLSX.utils.aoa_to_sheet([['SINAPI - Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil'],[titulo],[],ufRow,head,...linhas.map(l=>[l[0],l[1],l[2],l[3],...UFS.flatMap(u=>subs[0].startsWith('Origem')?['C',+(l[4]+ix(u)*0.5).toFixed(2)]:[+(l[4]+ix(u)*0.5).toFixed(2),0.5])])])}
function novo(){
  const wb=XLSX.utils.book_new(),add=(n,ws)=>XLSX.utils.book_append_sheet(wb,ws,n);
  add('Capa',XLSX.utils.aoa_to_sheet([['SINAPI Referência 08/2026']]));
  const ins=t=>wideSheet(t,['Classificação','Código do Insumo','Descrição do Insumo','Unidade'],INS,['Origem de Preço','Preço Mediano R$']);
  const comp=t=>wideSheet(t,['Grupo','Código da Composição','Descrição','Unidade'],COMP,['Custo (R$)','%AS']);
  add('ISD',ins('Preços de Insumos - Referência 08/2026 - Sem desoneração'));add('ICD',ins('Preços de Insumos - Referência 08/2026 - Com desoneração'));add('ISE',ins('Preços de Insumos - Referência 08/2026 - Sem encargos'));
  add('CSD',comp('Custos de Composições - Referência 08/2026 - Sem desoneração'));add('CCD',comp('Custos de Composições - Referência 08/2026 - Com desoneração'));add('CSE',comp('Custos de Composições - Referência 08/2026 - Sem encargos'));
  for(const sn of ['CSD','CCD','CSE']){const ws=wb.Sheets[sn];for(const k of Object.keys(ws)){if(k[0]==='B'&&ws[k].v==='87879'){ws[k]={t:'n',v:0,f:'HYPERLINK("#Analítico!A1","87879")'}}}}   // código como fórmula não calculada
  add('Analítico',XLSX.utils.aoa_to_sheet([['Grupo','Código da Composição','Tipo Item','Código do Item','Descrição','Unidade','Coeficiente'],['ALVENARIA','87521','INSUMO','00000001','CIMENTO','SC',0.01]]));
  return XLSX.write(wb,{type:'buffer',bookType:'xlsx'})}
function percentualMO(){ // outro arquivo do pacote: percentual de mão de obra por UF (valores entre 0 e 1), com abas de mesmo nome
  const wb=XLSX.utils.book_new(),rows=[['Grupo','Código da Composição','Descrição','Unidade','','AL','','BA','','SP',''],['','','','','','% MO','% AS','% MO','% AS','% MO','% AS']];
  for(let i=0;i<40;i++)rows.push(['GRUPO',String(90000+i),'COMPOSICAO NUMERO '+i,'M2',0,0.2+i/200,0.1,0.15+i/300,0.1,0.3,0.1]);
  rows[1]=['','','','','','% MO','% AS','% MO','% AS','% MO','% AS'];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'CSD');return XLSX.write(wb,{type:'buffer',bookType:'xlsx'})}
function familias(){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Código da Família','Descrição da Família','Unidade','Coeficiente'],['0','FAMILIA X','UN',1],['10','FAMILIA Y','UN',0.5]]),'Famílias');return XLSX.write(wb,{type:'buffer',bookType:'xlsx'})}
fs.writeFileSync(path.join(out,'SINAPI-2026-08-formato-xlsx.zip'),makeZip([['SINAPI_Familias_e_Coeficientes_2026_08.xlsx',familias()],['SINAPI_Referência_2026_08.xlsx',novo()],['SINAPI_Percentual_de_Mao_de_Obra_2026_08.xlsx',percentualMO()],['Leia-me.txt','Relatórios SINAPI 08/2026']]));
fs.writeFileSync(path.join(out,'SINAPI_percentual_MO_isolado.xlsx'),percentualMO());
fs.writeFileSync(path.join(out,'SINAPI_Referencia_2026_08.xlsx'),novo());
const antigo=(cab,linhas,nome,sheet)=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SINAPI'],['Referência: 08/2026 - Bahia'],[],cab,...linhas]),sheet);fs.writeFileSync(path.join(out,nome),XLSX.write(wb,{type:'buffer',bookType:'xlsx'}))};
antigo(['Classificação','Código do Insumo','Descrição do Insumo','Unidade','Origem de Preço','Preço Mediano R$'],INS.map(l=>[l[0],l[1],l[2],l[3],'C',String(l[4]).replace('.',',')]),'SINAPI_Preco_Ref_Insumos_BA_202608_NaoDesonerado.xlsx','Insumos');
antigo(['Grupo','Código da Composição','Descrição','Unidade','Custo Total R$','% AS'],COMP.map(l=>[l[0],l[1],l[2],l[3],l[4],0.5]),'SINAPI_Custo_Ref_Composicoes_Sintetico_BA_202608_NaoDesonerado.xlsx','Composições');
const orse=[['1001','Fornecimento e assentamento de joelho de redução de PVC soldável','un',19.93],['1002','Demolição de telhamento com telha de cimento amianto','m2',9.65],['10002','Retelhamento com telha de fibrocimento ondulada esp. 6mm','m2',12.23],['2050','Alvenaria de tijolo cerâmico furado, e=9cm, assentado com argamassa','m2',48.7],['3300','Piso cerâmico PEI-4, assentado com argamassa colante','m2',61.4]];
fs.writeFileSync(path.join(out,'ORSE_composicoes.csv'),'\ufeffCódigo;Descrição;Unidade;Preço Unitário (R$)\r\n'+orse.map(o=>`${o[0]};"${o[1]}";${o[2]};"${o[3].toFixed(2).replace('.',',')}"`).join('\r\n')+'\r\n');
{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['ORSE - Tabela de composições - 07/2026'],['Código','Serviço','Unid.','Custo Unitário'],...orse]),'Composicoes');fs.writeFileSync(path.join(out,'ORSE_composicoes.xlsx'),XLSX.write(wb,{type:'buffer',bookType:'xlsx'}))}
{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Relatório qualquer'],['Ref','Texto livre','Medida','Valor'],['A1','Item alfa qualquer','m2',10],['A2','Item beta qualquer','un',20.5]]),'Planilha1');fs.writeFileSync(path.join(out,'irreconhecivel.xlsx'),XLSX.write(wb,{type:'buffer',bookType:'xlsx'}))}

// ZIP com a aba "Analítico" e composições auxiliares (hora de servente/pedreiro com encargos, betoneira CHP), para testar a CPU
{const COMP2=[...COMP,['AUXILIAR','88316','SERVENTE COM ENCARGOS COMPLEMENTARES','H',22.5],['AUXILIAR','88309','PEDREIRO COM ENCARGOS COMPLEMENTARES','H',27.5],['EQUIPAMENTOS','88830','BETONEIRA CAPACIDADE NOMINAL DE 400 L, CHP DIURNO','CHP',5.5],['ARGAMASSA','87292','ARGAMASSA TRACO 1:2:8 (CIMENTO, CAL E AREIA), PREPARO MANUAL','M3',410]];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,wideSheet('Preços de Insumos - 08/2026 - Sem desoneração',['Classificação','Código do Insumo','Descrição do Insumo','Unidade'],INS,['Origem de Preço','Preço Mediano R$']),'ISD');
  XLSX.utils.book_append_sheet(wb,wideSheet('Custos de Composições - 08/2026 - Sem desoneração',['Grupo','Código da Composição','Descrição','Unidade'],COMP2,['Custo (R$)','%AS']),'CSD');
  const an=[['Grupo','Código da Composição','Tipo Item','Código do Item','Descrição','Unidade','Coeficiente','Situação'],
   ['ALVENARIA','87521','COMPOSICAO','','ALVENARIA...','M2','',''],['ALVENARIA','87521','INSUMO','00004567','BLOCO CERAMICO','UN','13,0000000','Com preço'],['ALVENARIA','87521','COMPOSICAO','87292','ARGAMASSA','M3','0,0200000','Com custo'],['ALVENARIA','87521','COMPOSICAO','88309','PEDREIRO COM ENCARGOS COMPLEMENTARES','H','0,8000000','Com custo'],['ALVENARIA','87521','COMPOSICAO','88316','SERVENTE COM ENCARGOS COMPLEMENTARES','H','0,4000000','Com custo'],['ALVENARIA','87521','COMPOSICAO','88830','BETONEIRA CHP','CHP','0,0100000','Com custo'],
   ['ARGAMASSA','87292','INSUMO','00000001','CIMENTO','SC','8,0000000','Com preço'],['ARGAMASSA','87292','INSUMO','00000002','AREIA','M3','1,1000000','Com preço'],['ARGAMASSA','87292','COMPOSICAO','88316','SERVENTE COM ENCARGOS COMPLEMENTARES','H','2,0000000','Com custo'],
   ['REVESTIMENTO','87879','INSUMO','00000001','CIMENTO','SC','0,0500000',''],['REVESTIMENTO','87879','COMPOSICAO','88316','SERVENTE COM ENCARGOS COMPLEMENTARES','H','0,0800000','']];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(an),'Analítico');
  fs.writeFileSync(path.join(out,'SINAPI-2026-08-com-analitico.zip'),makeZip([['SINAPI_Referência_2026_08.xlsx',XLSX.write(wb,{type:'buffer',bookType:'xlsx'})]]))}

// ZIP com composições "SEM CUSTO" (preço 0 na Bahia), como 98457 e 105118 no arquivo real
{const wb=XLSX.utils.book_new(),uf=['','','','','AC','','AL','','BA',''],sub=['','','','','Custo (R$)','%AS','Custo (R$)','%AS','Custo (R$)','%AS'];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SINAPI'],['Custos - 08/2026'],[],uf,['Grupo','Código da Composição','Descrição','Unidade',...sub.slice(4)],
   ['TAPUME',98459,'TAPUME COM TELHA METÁLICA. AF_03/2024','M2',90,0.4,95,0.4,98.28,0.42],['TAPUME',98457,'TAPUME COM CHAPA METÁLICA. AF_03/2024','M2',0,0,0,0,0,0],['TAPUME',105118,'TAPUME EM CHAPA DE MADEIRA OSB. AF_03/2024','M2',0,0,0,0,0,0]]),'CSD');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SINAPI'],[],[],uf,['Classificação','Código do Insumo','Descrição do Insumo','Unidade','Origem','Preço','Origem','Preço','Origem','Preço'],['MATERIAIS',1,'PREGO','KG','C',10,'C',11,'C',12]]),'ISD');
  fs.writeFileSync(path.join(out,'SINAPI-2026-08-com-zero.zip'),makeZip([['SINAPI_Referência_2026_08.xlsx',XLSX.write(wb,{type:'buffer',bookType:'xlsx'})]]))}
// PDF com linhas de texto (como os relatórios do SINAPI/ORSE)
try{const {jsPDF}=require(path.resolve(process.argv[4]||'/home/claude/work/out/ObraTop_V3.31.0.0/public/vendor/jspdf.umd.min.js')).jspdf||require(path.resolve(process.argv[4])),d=new jsPDF({unit:'mm',format:'a4'});d.setFontSize(9);let y=14;d.text('Relatório de Preços de Insumos - SINAPI - BA - 08/2026',10,y);y+=8;d.text('Classificação Código Descrição Unidade Origem Preço',10,y);y+=6;
  for(const l of INS){d.text(`${l[0]} ${l[1]} ${l[2].slice(0,48)} ${l[3]} C ${l[4].toFixed(2).replace('.',',')}`,10,y);y+=6}fs.writeFileSync(path.join(out,'SINAPI_insumos.pdf'),Buffer.from(d.output('arraybuffer')))}catch(e){console.log('PDF não gerado:',e.message)}
console.log('fixtures em',out,fs.readdirSync(out).join(', '))
