/* Entrada al portal QA: solo se exhibe a cuentas con rol o administración. */
(function(root){
'use strict';
const ADMIN='ols.bds@gmail.com',id='evaluation-entry';
let unwatch=null,uid=null;
function stop(){
 if(unwatch){unwatch();unwatch=null;}uid=null;
 const link=document.getElementById(id);if(link)link.hidden=true;
}
function start(user,sdk,db,offline){
 stop();
 if(!user||offline||!sdk||!db)return;
 const link=document.getElementById(id);if(!link)return;
 uid=user.uid;
 if(user.email===ADMIN){link.hidden=false;return;}
 const myUid=uid;
 unwatch=sdk.onSnapshot(sdk.doc(db,'evaluationRoles',myUid),snap=>{
  if(myUid!==uid||snap.metadata.fromCache)return;
  const role=snap.exists()?snap.data():null;
  link.hidden=!(role?.active===true&&Array.isArray(role.versions)&&role.versions.some(v=>v==='full'||v==='initial'));
 },error=>{link.hidden=true;console.warn('[QA] No se pudo consultar rol',error.code);});
}
root.KernnelEvalEntry={start,stop};
})(typeof globalThis==='undefined'?window:globalThis);
