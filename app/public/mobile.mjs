// ObraTop — visualização para smartphone: decisão do modo, alternância computador/smartphone e rótulos das tabelas.
// computeView/nextPref são funções puras (tests/unit/mobile.test.mjs); o restante usa o DOM.
export const VIEW_KEY='obratop-view';
export const VIEWPORT_MOBILE='width=device-width,initial-scale=1,viewport-fit=cover';
export const VIEWPORT_DESKTOP='width=1280,viewport-fit=cover';
export const PREFS=['auto','desktop','mobile'];
export function normPref(p){return PREFS.includes(p)?p:'auto'}
/** Decide como mostrar o app. pref: 'auto' | 'desktop' | 'mobile'. w/h: tamanho da janela em px CSS. coarse: tela de toque. */
export function computeView({pref='auto',w=1280,h=800,coarse=false,sw,sh}={}){
  pref=normPref(pref);const mn=Math.min(w,h);
  const phoneScreen=Math.min(sw??w,sh??h)<=600;           // tela física pequena (não muda quando a página é ampliada para 1280 px)
  const autoMobile=w<=900||(coarse&&mn<=600);
  const mobile=pref==='mobile'||(pref==='auto'&&autoMobile);
  return{
    pref,mobile,
    frame:mobile&&pref==='mobile'&&!phoneScreen&&w>600&&h>600,   // smartphone escolhido num monitor/tablet: moldura de celular
    landscape:mobile&&mn<=600&&w>h,                              // janela baixa e larga: menu vira barra lateral
    desktopOnPhone:!mobile&&pref==='desktop'&&phoneScreen        // pediu "computador" num celular: página de 1280 px reduzida
  }
}
/** O botão alterna entre as duas visualizações, partindo do que está sendo exibido agora. */
export function nextPref(view){return view.mobile?'desktop':'mobile'}

// ---------- DOM
let current=computeView(),timer=0,listeners=new Set();
export function getView(){return current}
export function getPref(){try{return normPref(localStorage.getItem(VIEW_KEY))}catch{return'auto'}}
export function setPref(p){try{localStorage.setItem(VIEW_KEY,normPref(p))}catch{}return applyView()}
export function applyView(){
  const w=window.innerWidth,h=window.innerHeight,coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
  current=computeView({pref:getPref(),w,h,coarse,sw:window.screen?.width,sh:window.screen?.height});
  const r=document.documentElement;
  r.classList.toggle('vm-mobile',current.mobile);r.classList.toggle('vm-frame',current.frame);r.classList.toggle('vm-landscape',current.landscape);r.classList.toggle('vm-desktop',!current.mobile);
  r.dataset.view=current.pref;
  const meta=document.querySelector('meta[name=viewport]');
  if(meta){const want=current.desktopOnPhone?VIEWPORT_DESKTOP:VIEWPORT_MOBILE;if(meta.getAttribute('content')!==want)meta.setAttribute('content',want)}
  listeners.forEach(fn=>{try{fn(current)}catch(e){console.warn(e)}});
  return current
}
export function onViewChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function initViewMode(){
  applyView();
  const later=()=>{clearTimeout(timer);timer=setTimeout(applyView,120)};
  window.addEventListener('resize',later);window.addEventListener('orientationchange',later);
  if(window.matchMedia){try{window.matchMedia('(pointer:coarse)').addEventListener('change',later)}catch{}}
  return current
}
/** Põe o nome da coluna em cada célula (data-label) para a tabela virar um cartão no celular. Tabelas com células mescladas ficam rolando na horizontal. */
export function labelTables(root){
  if(!root)return;
  root.querySelectorAll('.tablewrap table').forEach(table=>{
    const ths=[...table.querySelectorAll('thead th')];
    if(!ths.length||table.querySelector('[colspan],[rowspan]')){table.classList.remove('mcards');return}
    const labels=ths.map(t=>{const c=t.cloneNode(true);c.querySelectorAll('.glFull,.btnico,input').forEach(x=>x.remove());return(c.textContent||'').replace(/\s+/g,' ').trim()});
    const rows=[...table.tBodies].flatMap(b=>[...b.rows]);
    if(!rows.length||!rows.every(r=>r.cells.length===labels.length)){table.classList.remove('mcards');return}
    const wrap=document.documentElement.classList.contains('vm-mobile');
    for(const r of rows)[...r.cells].forEach((c,i)=>{
      if(labels[i]&&c.dataset.label!==labels[i])c.dataset.label=labels[i];
      // no celular a célula vira "rótulo + valor": o conteúdo vai para um único bloco para não se espalhar
      if(wrap&&labels[i]&&!c.classList.contains('bulkCol')&&!(c.firstElementChild&&c.firstElementChild.classList.contains('mval'))&&c.childNodes.length){const w=document.createElement('span');w.className='mval';while(c.firstChild)w.appendChild(c.firstChild);c.appendChild(w)}
    });
    table.classList.add('mcards')
  })
}
