// ObraTop — glossário de siglas: nomes por extenso, dicas ao passar o mouse e cartão do painel.
// Módulo sem dependência do estado do app (usa só o DOM). Extraído do app.js na versão 3.26.
const escH=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const GLOSS=[
 ['SPI / IDP','Índice de Desempenho de Prazo (Schedule Performance Index)','Avanço físico realizado ÷ avanço físico planejado até hoje. Acima de 1,00 a obra está adiantada; abaixo de 1,00, atrasada.'],
 ['CPI / IDC','Índice de Desempenho de Custo (Cost Performance Index)','Valor agregado (orçamento × avanço realizado) ÷ custo incorrido (despesas com competência até hoje, pagas ou não, sem as previstas). Acima de 1,00 há economia; abaixo de 1,00, o custo está acima do previsto.'],
 ['EAP / WBS','Estrutura Analítica do Projeto (Work Breakdown Structure)','Decomposição hierárquica da obra em fases e atividades, com códigos 1.1, 1.1.1 etc.'],
 ['SPI','Índice de Desempenho de Prazo (Schedule Performance Index)','Avanço realizado ÷ avanço planejado.'],
 ['IDP','Índice de Desempenho de Prazo (equivale ao SPI)','Avanço realizado ÷ avanço planejado.'],
 ['CPI','Índice de Desempenho de Custo (Cost Performance Index)','Valor agregado ÷ custo pago.'],
 ['IDC','Índice de Desempenho de Custo (equivale ao CPI)','Valor agregado ÷ custo pago.'],
 ['EAC','Estimativa no Término (Estimate at Completion)','Custo total previsto ao fim da obra, calculado como orçamento ÷ CPI/IDC.'],
 ['ETC','Estimativa para Terminar (Estimate to Complete)','Quanto ainda deve ser gasto até concluir a obra: EAC − custo já incorrido.'],
 ['VAC','Variação no Término (Variance at Completion)','Orçamento − EAC. Valor negativo indica estouro previsto do orçamento.'],
 ['BDI','Benefícios e Despesas Indiretas','Percentual somado ao custo direto para cobrir despesas indiretas, tributos e lucro e formar o preço de venda.'],
 ['EAP','Estrutura Analítica do Projeto','Decomposição hierárquica da obra em fases e atividades.'],
 ['WBS','Work Breakdown Structure (Estrutura Analítica do Projeto)','Código hierárquico da atividade, ex.: 1.3.2.'],
 ['ABC','Curva ABC','Classificação por importância de valor: A = poucos itens com a maior parte do custo; B = intermediários; C = muitos itens de baixo valor.'],
 ['KPIs','Indicadores-chave de desempenho (Key Performance Indicators)','Números que resumem a situação da obra.'],
 ['KPI','Indicador-chave de desempenho (Key Performance Indicator)','Número que resume a situação da obra.'],
 ['p.p.','pontos percentuais','Diferença absoluta entre dois percentuais. Ex.: 53% − 62% = −9 p.p.'],
 ['NC','Não conformidade','Desvio em relação ao projeto, à norma ou ao contrato que exige correção.'],
 ['DDS','Diálogo Diário de Segurança','Conversa curta e diária da equipe sobre os riscos do dia.'],
 ['MFA','Autenticação em múltiplos fatores','Verificação em duas etapas, além da senha.'],
 ['SHA-256','Algoritmo de assinatura digital (hash)','Gera um código único do arquivo; se qualquer dado mudar, o código muda. Comprova a integridade do backup.'],
 ['SINAPI','Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil','Base oficial de custos e índices da construção civil (Caixa/IBGE).'],
 ['ORSE','Orçamento de Obras de Sergipe','Base de custos referencial do Estado de Sergipe.'],
 ['SICRO','Sistema de Custos Referenciais de Obras','Base de custos de obras de infraestrutura de transportes (DNIT).'],
 ['CEHOP','Companhia Estadual de Habitação e Obras Públicas (Sergipe)','Órgão que mantém a base ORSE.'],
 ['DNIT','Departamento Nacional de Infraestrutura de Transportes','Órgão federal que publica o SICRO.'],
 ['IBGE','Instituto Brasileiro de Geografia e Estatística','Parceiro da Caixa na pesquisa do SINAPI.'],
 ['UF','Unidade da Federação','Estado brasileiro.'],
 ['CNPJ','Cadastro Nacional da Pessoa Jurídica','Número de registro da empresa.'],
 ['SPDA','Sistema de Proteção contra Descargas Atmosféricas','Para-raios e aterramento da edificação.'],
 ['ART','Anotação de Responsabilidade Técnica','Documento do conselho profissional que registra o responsável técnico pela obra.'],
 ['RRT','Registro de Responsabilidade Técnica','Equivalente da ART para arquitetos e urbanistas.'],
 ['PGR','Programa de Gerenciamento de Riscos','Programa de segurança do trabalho que identifica e controla os riscos da obra.'],
 ['PCMSO','Programa de Controle Médico de Saúde Ocupacional','Exames e acompanhamento de saúde dos trabalhadores.'],
 ['ASO','Atestado de Saúde Ocupacional','Documento médico que confirma a aptidão do trabalhador.'],
 ['SST','Saúde e Segurança do Trabalho','Área responsável pela prevenção de acidentes e doenças.'],
 ['NR','Norma Regulamentadora','Normas de segurança e saúde do trabalho (ex.: NR-18, NR-35).'],
 ['ABNT','Associação Brasileira de Normas Técnicas','Entidade que publica as normas NBR.'],
 ['NBR','Norma Brasileira (ABNT)','Norma técnica brasileira.'],
 ['CBUQ','Concreto Betuminoso Usinado a Quente','Massa asfáltica usada no revestimento de pavimentos.'],
 ['SPT','Standard Penetration Test (sondagem de simples reconhecimento)','Ensaio de solo usado para projetar fundações.'],
 ['MTR','Manifesto de Transporte de Resíduos','Documento que comprova a destinação de resíduos da obra.'],
 ['NF','Nota Fiscal','Documento fiscal da compra ou do serviço.'],
 ['PV','Poço de visita','Caixa de inspeção de redes de esgoto ou drenagem.'],
 ['DHP','Dreno Horizontal Profundo','Dreno inclinado que alivia a pressão da água em encostas.'],
 ['Qtd.','Quantidade','Quantidade executada / planejada.'],
 ['Resp.','Responsável','Pessoa responsável pela atividade.'],
 ['Curva S','Curva S','Gráfico do avanço acumulado ao longo do tempo; tem formato de S.']
];
export const GL_MAP=new Map(GLOSS.map(x=>[x[0],x]));
const GL_RX_G=new RegExp('(?<![\\p{L}\\p{N}_.-])('+[...GLOSS].map(x=>x[0]).sort((a,b)=>b.length-a.length).map(t=>t.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}_])','gu');
const GL_QUICK=/[A-Z]{2}|p\.p\.|Curva S|Qtd\.|Resp\./;
const GL_NOEXPAND=new Set(['Qtd.','Resp.']);
const GL_SKIP='abbr,script,style,textarea,select,option,input,svg,title,code,pre,.noGloss,.glFull,.glossaryItem b';
const GL_EXPAND='th,label,h1,h2,h3,.sectiontitle';
export function glossTip(t){const g=GL_MAP.get(t);return g?`${g[1]} — ${g[2]}`:''}
export function applyGlossary(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||!n.nodeValue||n.nodeValue.length<2)return NodeFilter.FILTER_REJECT;if(!GL_QUICK.test(n.nodeValue)||p.closest(GL_SKIP))return NodeFilter.FILTER_REJECT;GL_RX_G.lastIndex=0;return GL_RX_G.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const text=node.nodeValue,frag=document.createDocumentFragment();let last=0,found=[];
  GL_RX_G.lastIndex=0;let m;
  while((m=GL_RX_G.exec(text))){
   if(m.index>last)frag.append(text.slice(last,m.index));
   const ab=document.createElement('abbr');ab.className='gl';ab.title=glossTip(m[1]);ab.textContent=m[1];frag.append(ab);found.push(m[1]);last=m.index+m[1].length;
  }
  if(last<text.length)frag.append(text.slice(last));
  const parent=node.parentElement;node.replaceWith(frag);
  const host=parent&&parent.closest(GL_EXPAND);
  if(host&&!host.querySelector(':scope > .glFull')){
   const names=[...new Set(found.filter(t=>!GL_NOEXPAND.has(t)).map(t=>{const g=GL_MAP.get(t);return g?g[1].replace(/\s*\(.*\)$/,''):''}).filter(Boolean))];
   if(names.length){const sm=document.createElement('small');sm.className='glFull';sm.textContent=names.join(' · ');host.append(sm)}
  }
 }
}

/** Cartão recolhível "Siglas e indicadores" (usa <details>; o app grava aberto/fechado). */
export function glossaryDetailsHtml(keys,open=true,title='Siglas e indicadores deste painel'){
 const items=keys.map(k=>{const g=GL_MAP.get(k);return g?`<div class="glossaryItem"><b>${escH(k)}</b><span>${escH(g[1])}</span><small>${escH(g[2])}</small></div>`:''}).join('');
 return`<details class="card glossaryCard glossaryDetails noGloss"${open?' open':''}><summary>${escH(title)}</summary><div class="glossaryGrid">${items}</div></details>`
}
