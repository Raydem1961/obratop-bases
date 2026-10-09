// Backup externo do ObraTop SEM Cloud Functions: lê o Firestore com o Admin SDK e grava um arquivo .json.gz + SHA-256.
// Uso local:  GOOGLE_APPLICATION_CREDENTIALS=chave.json PROJECT_ID=obratop-v3-teste node tools/backup-externo/backup.mjs
// Variáveis:  PROJECT_ID (obrigatória) | ORG_ID (opcional; se vazia, todas as empresas) | EXCLUDE (padrão: restorePoints) | OUT_DIR (padrão: backup-out)
// NÃO foi executado contra o Firebase real neste ambiente (só a conversão de dados é testada).
import admin from 'firebase-admin';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {mkdirSync,writeFileSync} from 'node:fs';
import {serialize,summarize} from './serialize.mjs';
const projectId=process.env.PROJECT_ID;if(!projectId){console.error('Defina PROJECT_ID.');process.exit(2)}
const exclude=new Set((process.env.EXCLUDE||'restorePoints').split(',').map(s=>s.trim()).filter(Boolean));
const outDir=process.env.OUT_DIR||'backup-out';
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId});
const db=admin.firestore();
const orgIds=process.env.ORG_ID?[process.env.ORG_ID]:(await db.collection('organizations').listDocuments()).map(r=>r.id);
if(!orgIds.length){console.error('Nenhuma empresa encontrada.');process.exit(3)}
mkdirSync(outDir,{recursive:true});
const stamp=new Date().toISOString().slice(0,10);
for(const orgId of orgIds){
  const orgRef=db.collection('organizations').doc(orgId),snap=await orgRef.get();
  if(!snap.exists){console.error(`Empresa ${orgId} não existe.`);process.exit(4)}
  const payload={format:'obratop-external-backup',version:1,projectId,orgId,createdAt:new Date().toISOString(),organization:serialize(snap.data()),collections:{}};
  const counts={};
  for(const col of await orgRef.listCollections()){
    if(exclude.has(col.id))continue;
    const docs=await col.get();counts[col.id]=docs.size;
    payload.collections[col.id]=docs.docs.map(d=>({id:d.id,data:serialize(d.data())}));
  }
  const raw=Buffer.from(JSON.stringify(payload)),gz=gzipSync(raw,{level:9}),sha=createHash('sha256').update(raw).digest('hex');
  const base=`${outDir}/obratop-${projectId}-${orgId}-${stamp}`;
  writeFileSync(`${base}.json.gz`,gz);writeFileSync(`${base}.sha256`,`${sha}  obratop-${projectId}-${orgId}-${stamp}.json (conteúdo descompactado)\n`);
  console.log(`Empresa ${orgId}: ${Object.values(counts).reduce((a,b)=>a+b,0)} documentos (${summarize(counts)}); ${(gz.length/1024).toFixed(0)} KB compactados; SHA-256 ${sha.slice(0,16)}…`);
}
