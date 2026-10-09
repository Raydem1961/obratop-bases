const G=(window.__fb ||= {db:new Map(),listeners:new Set(),writes:[],seq:0,deny:null});
export class Timestamp{constructor(s,n=0){this.seconds=s;this.nanoseconds=n}toDate(){return new Date(this.seconds*1000)}toMillis(){return this.seconds*1000}static now(){return new Timestamp(Math.floor(Date.now()/1000))}static fromMillis(ms){return new Timestamp(Math.floor(ms/1000))}static fromDate(d){return Timestamp.fromMillis(d.getTime())}}
const STS={__sts:true};
export const serverTimestamp=()=>STS;
const DEL={__del:true};
export const deleteField=()=>DEL;
export const increment=n=>({__inc:n});
const clone=v=>{if(v instanceof Timestamp)return new Timestamp(v.seconds,v.nanoseconds);if(Array.isArray(v))return v.map(clone);if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=clone(v[k]);return o}return v};
const resolve=v=>{if(v===STS)return Timestamp.now();if(v instanceof Timestamp||v instanceof Date)return v;if(Array.isArray(v))return v.map(resolve);if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=resolve(v[k]);return o}return v};
const revive=v=>{if(v&&typeof v==='object'){if('$ts' in v)return new Timestamp(v.$ts);if(Array.isArray(v))return v.map(revive);const o={};for(const k in v)o[k]=revive(v[k]);return o}return v};
if(!G.seeded){G.seeded=true;const seed=window.__SEED__||{};for(const p in seed)G.db.set(p,revive(seed[p]))}
const rid=()=>'auto'+(++G.seq).toString(36)+Math.random().toString(36).slice(2,6);
const segs=a=>a.flatMap(x=>String(x).split('/')).filter(Boolean);
export const initializeFirestore=()=>({__fs:true});
export const persistentLocalCache=()=>({});
export const persistentMultipleTabManager=()=>({});
export const collection=(base,...p)=>({type:'col',path:(base&&base.path&&base.type?base.path+'/':'')+segs(p).join('/')});
export const doc=(base,...p)=>{if(base&&base.type==='col'&&!p.length)return{type:'doc',path:base.path+'/'+rid(),id:undefined,__auto:true,get id(){return this.path.split('/').pop()}};const pre=base&&base.type?base.path+'/':'';const path=pre+segs(p).join('/');return{type:'doc',path,get id(){return this.path.split('/').pop()}}};
export const documentId=()=>({__id:true});
export const orderBy=(f,d='asc')=>({t:'order',f,d});
export const where=(f,op,v)=>({t:'where',f,op,v});
export const limit=n=>({t:'limit',n});
export const query=(col,...c)=>({type:'query',path:col.path,c});
const parent=p=>p.split('/').slice(0,-1).join('/');
const cmp=(a,b)=>{const va=a&&a.seconds!==undefined?a.seconds:a,vb=b&&b.seconds!==undefined?b.seconds:b;return va<vb?-1:va>vb?1:0};
function run(t){const path=t.path;let rows=[...G.db.entries()].filter(([k])=>parent(k)===path).map(([k,v])=>({id:k.split('/').pop(),path:k,data:v}));
 for(const c of (t.c||[])){if(c.t==='where'){rows=rows.filter(r=>{const x=(c.f&&c.f.__id)?r.id:r.data[c.f];return c.op==='=='?x===c.v:c.op==='in'?c.v.includes(x):true})}}
 for(const c of [...(t.c||[])].filter(c=>c.t==='order').reverse()){rows.sort((a,b)=>(c.d==='desc'?-1:1)*cmp(a.data[c.f],b.data[c.f]))}
 const lim=(t.c||[]).find(c=>c.t==='limit');if(lim)rows=rows.slice(0,lim.n);
 const docs=rows.map(r=>({id:r.id,ref:{type:'doc',path:r.path,id:r.id},exists:()=>true,data:()=>clone(r.data)}));
 return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)}}
function snapDoc(path){const v=G.db.get(path);return{id:path.split('/').pop(),ref:{type:'doc',path},exists:()=>v!==undefined,data:()=>v===undefined?undefined:clone(v)}}
const read=t=>t.type==='doc'?snapDoc(t.path):run(t);
let pend=false;const notify=()=>{if(pend)return;pend=true;setTimeout(()=>{pend=false;G.listeners.forEach(l=>{try{l.next(read(l.t))}catch(e){l.err&&l.err(e)}})},30)};
export const onSnapshot=(t,next,err)=>{const l={t,next,err};if(denyRead(t.path)||(window.__denyDocs||[]).some(x=>String(t.path).includes(x))){setTimeout(()=>err&&err(permErr()),0);return()=>{}}G.listeners.add(l);setTimeout(()=>{try{next(read(t))}catch(e){err&&err(e)}},0);return()=>G.listeners.delete(l)};
export const getDoc=async r=>{if((window.__denyDocs||[]).some(x=>String(r.path).includes(x)))throw permErr();return snapDoc(r.path)};
const denyRead=p=>(window.__denyReadCollections||[]).some(c=>String(p).endsWith('/'+c));
const permErr=()=>{const e=new Error('Missing or insufficient permissions.');e.code='permission-denied';return e};
export const getDocs=async t=>{if(denyRead(t.path))throw permErr();return run(t.type==='col'?{path:t.path,c:[]}:t)};
function check(op,path,data){if(G.deny){const m=G.deny(op,path,data);if(m){const e=new Error('Missing or insufficient permissions.');e.code='permission-denied';throw e}}}
function applySet(path,data,opts){check('set',path,data);const d=resolve(data);const old=G.db.get(path);G.db.set(path,opts&&opts.merge&&old?{...old,...d}:d);G.writes.push({op:'set',path,data:d})}
function applyUpdate(path,data){check('update',path,data);const old=G.db.get(path);if(old===undefined){const e=new Error('No document to update');e.code='not-found';throw e}const d=resolve(data),n={...old};for(const k in d){if(d[k]&&d[k].__del)delete n[k];else if(d[k]&&d[k].__inc!==undefined)n[k]=(+n[k]||0)+d[k].__inc;else n[k]=d[k]}G.db.set(path,n);G.writes.push({op:'update',path,data:d})}
function applyDelete(path){check('delete',path);G.db.delete(path);G.writes.push({op:'delete',path})}
const chkData=(d,path,fn)=>{const walk=(v,inArr)=>{if(v===undefined)throw new Error(`Function ${fn}() called with invalid data. Unsupported field value: undefined (found in document ${path})`);if(Array.isArray(v)){if(inArr)throw new Error(`Function ${fn}() called with invalid data. Nested arrays are not supported (found in document ${path})`);v.forEach(x=>walk(x,true))}else if(v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype){Object.values(v).forEach(x=>walk(x,false))}};walk(d,false)};
export const setDoc=async(r,d,o)=>{chkData(d,r.path,'setDoc');applySet(r.path,d,o);notify()};
export const addDoc=async(c,d)=>{const path=c.path+'/'+rid();chkData(d,path,'addDoc');applySet(path,d);notify();return{type:'doc',path,id:path.split('/').pop()}};
export const updateDoc=async(r,d)=>{chkData(d,r.path,'updateDoc');applyUpdate(r.path,d);notify()};
export const deleteDoc=async r=>{applyDelete(r.path);notify()};
export const writeBatch=()=>{const ops=[];const b={set:(r,d,o)=>(chkData(d,r.path,'WriteBatch.set'),ops.push(()=>applySet(r.path,d,o)),b),update:(r,d)=>(chkData(d,r.path,'WriteBatch.update'),ops.push(()=>applyUpdate(r.path,d)),b),delete:r=>(ops.push(()=>applyDelete(r.path)),b),commit:async()=>{const snap=new Map(G.db),w=G.writes.length;try{ops.forEach(f=>f())}catch(e){G.db=snap;G.writes.length=w;throw e}notify()}};return b};

G.notify=()=>notify();
