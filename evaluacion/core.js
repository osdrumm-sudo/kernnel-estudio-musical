/* Núcleo evaluaciones: datos y permisos del lado de interfaz. La autoridad es Firestore. */
(function(root){
'use strict';
const VERSIONS=Object.freeze(['full','initial']);
const RESULTS=Object.freeze(['pending','passed','issue','blocked','na']);
function versionsFor(role,admin){
 if(admin)return VERSIONS.slice();
 if(!role||role.active!==true||!Array.isArray(role.versions))return [];
 return VERSIONS.filter(v=>role.versions.includes(v));
}
function canEvaluate(role,admin,version){return VERSIONS.includes(version)&&versionsFor(role,admin).includes(version);}
function blank(ownerUid,version){if(!VERSIONS.includes(version)||!ownerUid)throw Error('Contexto inválido');
 return {ownerUid,version,revision:0,answers:{},generalNotes:''};
}
function normalise(raw,uid,version,catalog){
 const x=blank(uid,version);
 if(!raw||typeof raw!=='object'||raw.ownerUid!==uid||raw.version!==version)return x;
 x.revision=Number.isInteger(raw.revision)&&raw.revision>=0?raw.revision:0;
 x.generalNotes=String(raw.generalNotes||'').slice(0,3000);
 const allowed=new Set(catalog.forVersion(version).map(row=>row.id));
 for(const [id,v] of Object.entries(raw.answers||{})){
  if(!allowed.has(id)||!v||typeof v!=='object')continue;
  const result=RESULTS.includes(v.result)?v.result:'pending';
  x.answers[id]={done:result==='passed',result,note:String(v.note||'').slice(0,1000)};
 }
 return x;
}
function setAnswer(report,id,result,note,catalog){
 if(!catalog.forVersion(report.version).some(item=>item.id===id))throw Error('Item no pertenece a versión');
 if(!RESULTS.includes(result))throw Error('Resultado inválido');
 report.answers[id]={done:result==='passed',result,note:String(note||'').slice(0,1000)};
 return report;
}
function progress(report,catalog){
 const items=catalog.forVersion(report.version);
 const values={pending:0,passed:0,issue:0,blocked:0,na:0};
 for(const item of items){const result=report.answers[item.id]?.result||'pending';values[RESULTS.includes(result)?result:'pending']++;}
 return {...values,total:items.length,reviewed:items.length-values.pending};
}
function draftKey(uid,version){return 'metriqa-evaluacion-borrador-v1:'+uid+':'+version;}
function resolveDraft(remote,draft){
 if(!draft||!draft.report)return {mode:'remote',conflict:false};
 if(!remote)return {mode:'draft',conflict:false};
 if(draft.baseRevision===remote.revision)return {mode:'draft',conflict:false};
 return {mode:'conflict',conflict:true};
}
root.KernnelEvalCore={VERSIONS,RESULTS,versionsFor,canEvaluate,blank,normalise,setAnswer,progress,draftKey,resolveDraft};
if(typeof module!=='undefined'&&module.exports)module.exports=root.KernnelEvalCore;
})(typeof globalThis==='undefined'?window:globalThis);
