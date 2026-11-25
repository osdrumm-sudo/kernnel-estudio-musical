/* Bloqueo cooperativo por cuenta y dispositivo. Nunca expira durante trabajo offline.
   No es un mecanismo de seguridad frente a un cliente manipulado. */
(function(root){
'use strict';
function conflict(message='Otro dispositivo está utilizando esta cuenta. El trabajo permanece en este equipo.'){
 const e=new Error(message);e.code='session/conflict';return e;
}
function verifyPlan(rows){
 // Rechazar antes de la primera escritura si hay modificaciones locales y remotas
 // desde la última base conocida, incluso en canciones distintas.
 const dirty=rows.some(r=>r.action==='push'||r.action==='conflict');
 if(dirty&&rows.some(r=>r.action==='pull'||r.action==='conflict'))throw conflict('Hay cambios simultáneos. No se guardará esta sesión en la nube.');
}
function deviceId(storage,makeId){
 const key='metriqa-edit-device-v1';
 let id=storage.getItem(key);
 if(!id){id=makeId();storage.setItem(key,id);}
 if(!id||storage.getItem(key)!==id)throw Error('No se pudo identificar este dispositivo.');
 return id;
}
class SessionGuard{
 constructor({sdk,db,uid,device,valid=()=>true}){Object.assign(this,{sdk,db,uid,device,valid});}
 ref(){return this.sdk.doc(this.db,'users',this.uid,'editSessions','active');}
 check(){if(!this.valid())throw Error('La sesión cambió.');}
 async acquire(){
  this.check();
  return this.sdk.runTransaction(this.db,async tx=>{
   this.check();const s=await tx.get(this.ref());this.check();
   if(s.exists()&&s.data().device!==this.device)throw conflict();
   if(!s.exists())tx.set(this.ref(),{device:this.device,createdAt:this.sdk.serverTimestamp()});
  });
 }
 async assert(tx){this.check();const s=await tx.get(this.ref());this.check();if(!s.exists()||s.data().device!==this.device)throw conflict();}
 async release(){
  this.check();return this.sdk.runTransaction(this.db,async tx=>{
   this.check();const s=await tx.get(this.ref());this.check();
   if(s.exists()&&s.data().device===this.device)tx.delete(this.ref());
  });
 }
}
const api={SessionGuard,verifyPlan,deviceId,conflict};
root.MetriqaSession=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
