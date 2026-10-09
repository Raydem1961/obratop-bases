import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {serialize,summarize} from '../../tools/backup-externo/serialize.mjs';
class Ts{constructor(s){this.seconds=s}toDate(){return new Date(this.seconds*1000)}}
test('serialize: tipos primitivos, listas e mapas aninhados',()=>{
  assert.deepEqual(serialize({a:1,b:'x',c:true,d:null,e:[1,{f:2}],g:{h:{i:3}}}),{a:1,b:'x',c:true,d:null,e:[1,{f:2}],g:{h:{i:3}}});
  assert.equal(serialize(undefined),null);
});
test('serialize: Timestamp, GeoPoint, referência e bytes',()=>{
  assert.deepEqual(serialize({t:new Ts(1700000000)}),{t:{__ts:'2023-11-14T22:13:20.000Z'}});
  assert.deepEqual(serialize({g:{latitude:-9.4,longitude:-38.2}}),{g:{__geo:[-9.4,-38.2]}});
  assert.deepEqual(serialize({r:{path:'organizations/o/works/w',id:'w',firestore:{}}}),{r:{__ref:'organizations/o/works/w'}});
  assert.deepEqual(serialize({b:new Uint8Array([1,2,3])}),{b:{__bytes:'AQID'}});
});
test('gzip + SHA-256 do conteúdo descompactado conferem (ida e volta)',()=>{
  const raw=Buffer.from(JSON.stringify({orgId:'o',collections:{works:[{id:'w',data:serialize({name:'Obra ç ã',t:new Ts(1)})}]}}));
  const sha=createHash('sha256').update(raw).digest('hex'),back=gunzipSync(gzipSync(raw,{level:9}));
  assert.equal(createHash('sha256').update(back).digest('hex'),sha);assert.equal(JSON.parse(back).collections.works[0].data.name,'Obra ç ã');
});
test('summarize ordena e formata as contagens',()=>{assert.equal(summarize({works:2,activities:10,audits:1}),'activities: 10, audits: 1, works: 2')});
