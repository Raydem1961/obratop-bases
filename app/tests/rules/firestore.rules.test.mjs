// Testes das regras do Firestore no emulador (NÃO executados no ambiente de desenvolvimento: exigem Java e o emulador do Firebase).
// Uso:  npm i --no-save @firebase/rules-unit-testing firebase
//       npx firebase-tools emulators:exec --only firestore "node --test tests/rules/firestore.rules.test.mjs" --project obratop-regras
// Por padrão testa regras-propostas/firestore.rules.proposta; use RULES=firestore.rules para testar as regras atuais.
import test,{before,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,getDocs,collection,query,where,serverTimestamp} from 'firebase/firestore';
const O='organizations/org1';let env;
before(async()=>{
  env=await initializeTestEnvironment({projectId:'obratop-regras',firestore:{rules:readFileSync(process.env.RULES||'regras-propostas/firestore.rules.proposta','utf8')}});
  await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();
    await setDoc(doc(db,O),{name:'Org',ownerUid:'dono'});
    await setDoc(doc(db,`${O}/members/dono`),{email:'dono@x.com',role:'owner',status:'active'});
    await setDoc(doc(db,`${O}/members/obra1`),{email:'u1@x.com',role:'project_user',status:'active',workId:'w1'});
    await setDoc(doc(db,`${O}/members/consulta`),{email:'c@x.com',role:'viewer',status:'active',workId:'w1'});
    await setDoc(doc(db,`${O}/works/w1`),{name:'Obra A',progress:0,value:1});await setDoc(doc(db,`${O}/works/w2`),{name:'Obra B',progress:0,value:1});
    await setDoc(doc(db,`${O}/finance/f1`),{workId:'w1',type:'Despesa',value:10,description:'a'});await setDoc(doc(db,`${O}/finance/f2`),{workId:'w2',type:'Despesa',value:20,description:'b'});
  });
});
after(async()=>{await env?.cleanup()});
const as=(uid,email,verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
test('usuário de obra lê só a própria obra (consulta filtrada)',async()=>{
  const db=as('obra1','u1@x.com');
  await assertSucceeds(getDocs(query(collection(db,`${O}/finance`),where('workId','==','w1'))));
  await assertFails(getDocs(query(collection(db,`${O}/finance`),where('workId','==','w2'))));
  await assertFails(getDoc(doc(db,`${O}/works/w2`)));await assertSucceeds(getDoc(doc(db,`${O}/works/w1`)));
});
test('administrador lê tudo',async()=>{const db=as('dono','dono@x.com');await assertSucceeds(getDoc(doc(db,`${O}/finance/f2`)));await assertSucceeds(getDocs(collection(db,`${O}/members`)));});
test('perfil Consulta lê a própria obra e não escreve',async()=>{
  const db=as('consulta','c@x.com');
  await assertSucceeds(getDoc(doc(db,`${O}/finance/f1`)));
  await assertFails(setDoc(doc(db,`${O}/finance/novo`),{workId:'w1',type:'Despesa',value:1,description:'x'}));
  await assertFails(updateDoc(doc(db,`${O}/finance/f1`),{value:11}));
});
test('usuário de obra escreve na própria obra e não na outra',async()=>{
  const db=as('obra1','u1@x.com');
  await assertSucceeds(setDoc(doc(db,`${O}/finance/n1`),{workId:'w1',type:'Receita',value:5,description:'ok'}));
  await assertFails(setDoc(doc(db,`${O}/finance/n2`),{workId:'w2',type:'Receita',value:5,description:'x'}));
  await assertFails(setDoc(doc(db,`${O}/finance/n3`),{workId:'w1',type:'Outro',value:5,description:'x'}));
});
test('auditoria: só com e-mail do usuário e hora do servidor',async()=>{
  const db=as('obra1','u1@x.com');
  await assertSucceeds(setDoc(doc(db,`${O}/audits/a1`),{userId:'obra1',userEmail:'u1@x.com',at:serverTimestamp(),action:'x'}));
  await assertFails(setDoc(doc(db,`${O}/audits/a2`),{userId:'obra1',userEmail:'outro@x.com',at:serverTimestamp(),action:'x'}));
});
test('criar empresa exige e-mail verificado',async()=>{
  await assertFails(setDoc(doc(as('novo','n@x.com',false),'organizations/org9'),{name:'Nova',ownerUid:'novo'}));
  await assertSucceeds(setDoc(doc(as('novo','n@x.com',true),'organizations/org9'),{name:'Nova',ownerUid:'novo'}));
});
test('usuário de obra não lê pontos de restauração',async()=>{
  await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),`${O}/restorePoints/rp1`),{name:'p'}));
  await assertFails(getDoc(doc(as('obra1','u1@x.com'),`${O}/restorePoints/rp1`)));await assertSucceeds(getDoc(doc(as('dono','dono@x.com'),`${O}/restorePoints/rp1`)));
});
