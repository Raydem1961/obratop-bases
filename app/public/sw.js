const CACHE='obratop-production-3.39.3.0';
const CORE=['./calc.mjs','./glossary.mjs','./branding.mjs','./templates.mjs','./icons.mjs','./fluent.css','./mobile.mjs','./mobile.css','./bases.mjs','./orcamento.mjs','./orcamento-ui.mjs','./planejamento-ui.mjs','./msproject.mjs','./economics.mjs','./economics-ui.mjs','./economics.css','./manual-ui.mjs','./manual.css','./','./index.html','./styles.css','./app.js','./cost-bases.config.js','./firebase-config.js','./manifest.webmanifest'];
const STATIC=['./manual-capa.jpg','./vendor/jspdf.umd.min.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./ObraTop_Super_Planilha_Base.xlsx','./Projeto_Demo_ObraTop_3.18.0.pdf'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll([...CORE,...STATIC])).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function networkFirst(request,fallbackKey){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response && (response.ok||response.type==='opaque')){
      const cache=await caches.open(CACHE);
      cache.put(fallbackKey||request,response.clone());
    }
    return response;
  }catch(err){
    const cached=await caches.match(fallbackKey||request);
    if(cached)return cached;
    throw err;
  }
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(e.request.mode==='navigate'){
    e.respondWith(networkFirst(e.request,'./index.html'));
    return;
  }

  const coreNames=['/index.html','/app.js','/calc.mjs','/glossary.mjs','/branding.mjs','/templates.mjs','/icons.mjs','/fluent.css','/mobile.mjs','/mobile.css','/bases.mjs','/orcamento.mjs','/orcamento-ui.mjs','/planejamento-ui.mjs','/msproject.mjs','/styles.css','/economics.mjs','/economics-ui.mjs','/economics.css','/firebase-config.js','/manifest.webmanifest','/manual-ui.mjs','/manual.css','/vendor-loader.js'];
  if(url.origin===self.location.origin && coreNames.some(x=>url.pathname.endsWith(x))){
    e.respondWith(networkFirst(e.request,e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(response=>{
      if(response && (response.ok||response.type==='opaque')){
        caches.open(CACHE).then(c=>c.put(e.request,response.clone()));
      }
      return response;
    }))
  );
});
