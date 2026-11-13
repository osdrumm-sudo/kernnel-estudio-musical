/* Firestore adapter: immutable chunks first, transactional revision pointer second. */
(function(root){
'use strict';
const C=root.KernnelSyncCore;
class SyncStore {
 constructor(sdk,db,uid,legacy,valid){Object.assign(this,{sdk,db,uid,legacy,valid});}
 id(){return crypto.randomUUID();}
 check(){if(!this.valid())throw Error('La sesión cambió.');}
 collection(){return this.sdk.collection(this.db,'users',this.uid,'syncItems');}
 ref(key){return this.sdk.doc(this.collection(),key);}
 part(version,i){return this.sdk.doc(this.db,'users',this.uid,'syncVersions',version,'parts',String(i).padStart(4,'0'));}
 async list(){this.check();const result=await this.sdk.getDocsFromServer(this.collection());this.check();return Object.fromEntries(result.docs.map(d=>[d.id,d.data()]));}
 async read(head){
  this.check();if(!head.hash)return null;
  if(!Number.isInteger(head.parts)||head.parts<1||head.parts>300||!Number.isInteger(head.bytes)||head.bytes>25*1024*1024)throw Error('Versión remota inválida.');
  const parts=[];for(let i=0;i<head.parts;i++){const s=await this.sdk.getDocFromServer(this.part(head.version,i));this.check();if(!s.exists()||s.data().index!==i||typeof s.data().payload!=='string')throw Error('Versión incompleta.');parts.push(s.data().payload);}
  const raw=parts.join('');if(new Blob([raw]).size!==head.bytes)throw Error('El tamaño de la versión no coincide.');
  const value=JSON.parse(raw);if(await C.hash(value)!==head.hash||value.id!==head.id)throw Error('La versión no pasó la comprobación de integridad.');return value;
 }
 async ensure(item){const s=await this.sdk.getDocFromServer(this.ref(item.key));this.check();if(s.exists())return s.data();return this.write({...item,expected:null});}
 async write({key,kind,id,value,hash,expected,modifiedAt}){
  this.check();const raw=C.canonical(value),bytes=new Blob([raw]).size;if(bytes>25*1024*1024)throw Error('El elemento supera 25 MiB. Reduce las imágenes y vuelve a intentar.');
  const version=this.id(),parts=[];
  if(value)for(let start=0;start<raw.length;){let end=Math.min(start+140000,raw.length);if(end<raw.length&&/[\uD800-\uDBFF]/.test(raw[end-1]))end--;parts.push(raw.slice(start,end));start=end;}
  for(let i=0;i<parts.length;i++){this.check();await this.sdk.setDoc(this.part(version,i),{index:i,payload:parts[i]});}
  const record={version,kind,id,hash,modifiedAt,name:value?.nombre||'Elemento eliminado',parts:parts.length,bytes,deleted:!value};
  const result=await this.sdk.runTransaction(this.db,async tx=>{
   this.check();const snap=await tx.get(this.ref(key)),old=snap.exists()?snap.data():null;
   if((old?.version||null)!==expected){const e=Error('Otro dispositivo guardó cambios. Se volverán a comparar las versiones.');e.code='sync/conflict';throw e;}
   const history=[record,...(old?.history||[])].slice(0,20),head={...record,history,committedAt:this.sdk.serverTimestamp()};
   tx.set(this.ref(key),head);return {head,evicted:(old?.history||[]).slice(19)};
  });
  // Retención física de versiones descartadas, después de confirmar el puntero.
  // Fallos de limpieza no revierten un guardado válido; requieren revisión de cuota.
  for(const old of result.evicted){if(!this.valid())break;for(let i=0;i<old.parts;i++)try{await this.sdk.deleteDoc(this.part(old.version,i));}catch(e){console.warn('No se pudo limpiar una versión antigua',e.code);break;}}
  this.check();return result.head;
 }
}
root.KernnelSyncStore=SyncStore;if(typeof module!=='undefined')module.exports=SyncStore;
})(globalThis);
