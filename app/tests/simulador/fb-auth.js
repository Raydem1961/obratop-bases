const A=(window.__fbAuth ||= {user:null,cbs:[],log:[]});
if(!A.init){A.init=true;const s=window.__AUTH__;if(s)A.user=mk(s)}
function mk(s){const u={uid:s.uid,email:s.email,displayName:s.displayName||'',emailVerified:!!s.emailVerified};u.reload=async()=>{if(window.__AUTH_VERIFY_ON_RELOAD__)u.emailVerified=true};return u}
const emit=()=>setTimeout(()=>A.cbs.forEach(cb=>cb(A.user)),0);
const authObj={get currentUser(){return A.user}};
export const getAuth=()=>authObj;
export const setPersistence=async()=>{};
export const browserLocalPersistence={};
export const onAuthStateChanged=(a,cb)=>{A.cbs.push(cb);setTimeout(()=>cb(A.user),0);return()=>{}};
export const signInWithEmailAndPassword=async(a,email,pass)=>{A.log.push(['signin',email]);A.user=mk({uid:'u-'+email,email,emailVerified:true});emit();return{user:A.user}};
export const createUserWithEmailAndPassword=async(a,email,pass)=>{A.log.push(['register',email]);A.user=mk({uid:'u-'+email,email,emailVerified:false});emit();return{user:A.user}};
export const sendPasswordResetEmail=async(a,e)=>{A.log.push(['reset',e])};
export const sendEmailVerification=async(u)=>{A.log.push(['verify',u.email])};
export const signOut=async()=>{A.user=null;emit()};
