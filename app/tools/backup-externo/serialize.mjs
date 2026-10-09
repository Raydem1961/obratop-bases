// Converte valores do Firestore (Admin SDK) em JSON puro. Função pura, testada em tests/unit/backup.test.mjs.
export function serialize(v){
  if(v===null||v===undefined)return v??null;
  const t=typeof v;
  if(t==='string'||t==='number'||t==='boolean')return v;
  if(t==='bigint')return Number(v);
  if(Array.isArray(v))return v.map(serialize);
  if(typeof v.toDate==='function'&&('seconds' in v||'_seconds' in v))return{__ts:v.toDate().toISOString()};      // Timestamp
  if('latitude' in v&&'longitude' in v&&Object.keys(v).length<=4)return{__geo:[v.latitude,v.longitude]};         // GeoPoint
  if(typeof v.path==='string'&&typeof v.id==='string'&&'firestore' in v)return{__ref:v.path};                    // DocumentReference
  if(v instanceof Uint8Array)return{__bytes:Buffer.from(v).toString('base64')};
  const o={};for(const k of Object.keys(v))o[k]=serialize(v[k]);return o
}
export function summarize(counts){return Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)).map(([k,n])=>`${k}: ${n}`).join(', ')}
