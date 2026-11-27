/* Portal de evaluación Metriqa · Auth/Firestore son la autoridad. */
'use strict';
const Catalog=window.KernnelEvalCatalog, Core=window.KernnelEvalCore;
const ADMIN='ols.bds@gmail.com';
const $=id=>document.getElementById(id);
const state={sdk:null,auth:null,db:null,user:null,admin:false,role:null,versions:[],
  version:null,report:null,remote:null,baselineRevision:0,conflicted:false,dirty:false,
  epoch:0,openEpoch:0,roleUnsubscribe:null,adminUsers:[],adminRoles:new Map()};
function node(tag,cls,text){
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
}
function message(id,text){$(id).textContent=text;}
function showGate(text){$('gate').hidden=false;$('portal').hidden=true;$('review').hidden=true;$('admin').hidden=true;message('gate-status',text);}
function cloudReady(){if(!navigator.onLine)throw Error('Se necesita conexión para guardar la evaluación. El borrador local se conserva.');}
function safeLocalGet(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function safeLocalRemove(key){try{localStorage.removeItem(key)}catch{}}
function formatDate(value){
 const millis=value?.toMillis?.()||Date.parse(value)||0;
 return millis?new Date(millis).toLocaleString('es-CL'):'Sin fecha';
}
function classify(err){
 if(err?.code==='permission-denied')return 'Firebase denegó el permiso. Comprueba reglas, autorización y rol de evaluador.';
 if(err?.code==='auth/popup-closed-by-user')return 'Se cerró el ingreso con Google.';
 if(err?.code==='auth/unauthorized-domain')return 'El dominio no está autorizado en Firebase Authentication.';
 return err?.message||'No se pudo completar la operación.';
}
async function boot(){
 if(!window.KERNNEL_FIREBASE_CONFIG){showGate('Falta configuración Firebase pública.');return;}
 try{
  const version='12.11.0';
  const [app,auth,db]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/'+version+'/firebase-firestore.js')
  ]);
  const instance=app.getApps().length?app.getApp():app.initializeApp(window.KERNNEL_FIREBASE_CONFIG);
  state.sdk={...auth,...db};state.auth=auth.getAuth(instance);state.db=db.getFirestore(instance);
  await auth.setPersistence(state.auth,auth.browserLocalPersistence);
  auth.onAuthStateChanged(state.auth,user=>{const epoch=++state.epoch;state.roleUnsubscribe?.();state.roleUnsubscribe=null;
   state.user=user;state.version=null;state.report=null;state.admin=false;state.versions=[];
   $('logout').hidden=!user;
   if(!user){message('user-name','');showGate('Ingresa con Google para solicitar o utilizar el acceso de evaluación.');return;}
   authenticate(user,epoch).catch(error=>{if(epoch===state.epoch)showGate(classify(error));});
  });
 }catch(err){showGate('No se pudo iniciar Firebase: '+classify(err));}
}
async function login(){
 if(!state.auth)return;
 try{cloudReady();const provider=new state.sdk.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  await state.sdk.signInWithPopup(state.auth,provider);
 }catch(e){message('gate-status',classify(e));}
}
async function authenticate(user,epoch){
 showGate('Verificando Google y permisos de evaluación…');
 cloudReady();
 const sdk=state.sdk,db=state.db,token=await sdk.getIdTokenResult(user,true);
 if(epoch!==state.epoch)return;
 if(token.signInProvider!=='google.com'||token.claims.email_verified!==true)throw Error('Debes ingresar con una cuenta Google verificada.');
 const isAdmin=user.email===ADMIN;
 if(!isAdmin){
  const approved=await sdk.getDocFromServer(sdk.doc(db,'authorizedEmails',user.email));
  if(!approved.exists()||approved.data().active!==true)throw Error('Tu correo no está autorizado para Metriqa. Solicita una invitación al administrador.');
 }
 // Registra sólo identidad pública de perfil, nunca contenido musical ni tokens.
 try{
  await sdk.setDoc(sdk.doc(db,'evaluationProfiles',user.uid),{
   uid:user.uid,email:user.email,displayName:String(user.displayName||'').slice(0,80),
   lastSeen:sdk.serverTimestamp()
  });
 }catch(e){console.warn('[Evaluación] Registro de perfil no disponible',e.code||e.message);}
 let role=null;
 try{const snap=await sdk.getDocFromServer(sdk.doc(db,'evaluationRoles',user.uid));role=snap.exists()?snap.data():null;}
 catch(e){if(!isAdmin)throw e;console.warn('[Evaluación] Roles aún no configurados',e.code||e.message);}
 if(epoch!==state.epoch)return;
 state.admin=isAdmin;state.role=role;state.versions=Core.versionsFor(role,isAdmin);
 state.user=user;message('user-name',user.displayName||user.email);
 if(!state.versions.length){showGate('Tu sesión es válida, pero todavía no tienes el rol Evaluador. Pide al administrador que te designe desde este portal.');return;}
 $('gate').hidden=true;$('portal').hidden=false;
 message('role-badge',isAdmin?'Administración general':'Evaluador designado');
 for(const v of Core.VERSIONS){
  $('choose-'+v).disabled=!state.versions.includes(v);
  $('choose-'+v).setAttribute('aria-pressed','false');
 }
 if(isAdmin){$('admin').hidden=false;loadAdmin().catch(e=>message('admin-status',classify(e)));}
 else $('admin').hidden=true;
 // La revocación en vivo se aplica al menú y la regla del servidor bloquea las escrituras.
 if(!isAdmin){
  state.roleUnsubscribe=sdk.onSnapshot(sdk.doc(db,'evaluationRoles',user.uid),snapshot=>{
   if(epoch!==state.epoch||snapshot.metadata.fromCache)return;
   const fresh=snapshot.exists()?snapshot.data():null;
   state.role=fresh;state.versions=Core.versionsFor(fresh,false);
   if(!state.versions.length){showGate('El administrador retiró tu acceso como evaluador.');return;}
   for(const v of Core.VERSIONS)$('choose-'+v).disabled=!state.versions.includes(v);
   if(state.version&&!state.versions.includes(state.version)){
    $('review').hidden=true;state.version=null;
    message('gate-status','El acceso a esta versión fue revocado.');
   }
  },e=>{if(epoch===state.epoch)console.warn('[Evaluación] Permiso de rol:',e.code);});
 }
}
function draftKey(){return Core.draftKey(state.user.uid,state.version);}
function storeDraft(){
 if(!state.user||!state.report||!state.version)return;
 state.dirty=true;
 try{localStorage.setItem(draftKey(),JSON.stringify({baseRevision:state.baselineRevision,
   report:state.report,createdAt:Date.now()}));}
 catch(e){message('save-status','Aviso: el navegador no permite guardar borradores. Exporta tu evaluación.');return;}
 message('save-status','Cambios sin sincronizar · borrador conservado en este dispositivo');
}
async function openVersion(version){
 if(!Core.canEvaluate(state.role,state.admin,version)||!state.user)return;
 const opening=++state.openEpoch;
 state.version=version;
 $('review').hidden=false;
 for(const v of Core.VERSIONS)$('choose-'+v).setAttribute('aria-pressed',String(v===version));
 message('review-title',Catalog.versionNames[version]);
 message('version-context',version==='initial'
  ?'Versión Inicial / Free: todavía no existe despliegue independiente. Los puntos de implementación pueden marcarse como bloqueados.'
  :'Versión Full: evalúa funciones disponibles y pendientes de integración usando tu cuenta de prueba.');
 $('app-link').hidden=version!=='full';
 $('save-report').disabled=true;
 message('save-status','Consultando versión guardada en Firebase…');
 try{
  cloudReady();
  const r=state.sdk.doc(state.db,'evaluationReports',state.user.uid+'_'+version);
  const snap=await state.sdk.getDocFromServer(r);
  if(opening!==state.openEpoch)return;
  const remote=Core.normalise(snap.exists()?snap.data():null,state.user.uid,version,Catalog);
  state.remote=remote;state.baselineRevision=remote.revision;
  const local=safeLocalGet(draftKey());
  const resolution=Core.resolveDraft(remote,local);
  state.conflicted=resolution.conflict;
  state.report=resolution.mode==='remote'?remote:Core.normalise(local.report,state.user.uid,version,Catalog);
  state.dirty=resolution.mode!=='remote';
  $('draft-warning').hidden=!state.conflicted;
  $('save-report').disabled=state.conflicted;
  renderChecklist();
  message('save-status',state.conflicted?'Conflicto de borradores: elige versión antes de guardar.':
   state.dirty?'Borrador de este dispositivo pendiente de guardar.':'Evaluación lista; versión de nube '+remote.revision+'.');
 }catch(e){
  if(opening!==state.openEpoch)return;
  const local=safeLocalGet(draftKey());
  state.report=Core.normalise(local?.report,state.user.uid,version,Catalog);
  state.remote=null;state.conflicted=true;state.dirty=!!local;
  $('draft-warning').hidden=true;
  $('save-report').disabled=true;
  renderChecklist();
  message('save-status','Sin lectura de nube. No se permite sobrescribir: '+classify(e));
 }
}
function renderChecklist(){
 const report=state.report;if(!report)return;
 const root=$('checklist');root.replaceChildren();
 const items=Catalog.forVersion(report.version);
 const groups=new Map();
 items.forEach(t=>{if(!groups.has(t.group))groups.set(t.group,[]);groups.get(t.group).push(t);});
 let index=0;
 for(const [name,rows] of groups){
  const section=node('details','group');section.open=index++<2;
  const summary=node('summary','',name+' · '+rows.length+' puntos');
  const body=node('div','items');
  section.append(summary,body);
  for(const item of rows){
   const value=report.answers[item.id]||{result:'pending',note:''};
   const article=node('article','task');
   article.dataset.id=item.id;article.dataset.priority=item.priority;
   article.dataset.search=(item.id+' '+item.title+' '+item.criteria+' '+item.group).toLocaleLowerCase('es');
   const head=node('div','task-top');
   const cb=node('input');cb.type='checkbox';cb.id='qa-'+item.id;cb.checked=value.result==='passed';
   cb.setAttribute('aria-label','Aprobado: '+item.title);
   const label=node('label','task-title');label.htmlFor=cb.id;
   const prefix=node('span','',item.id+' · '+item.priority+' · ');
   const title=node('strong','',item.title);label.append(prefix,title);
   head.append(cb,label);article.append(head,node('p','criteria',item.criteria));
   const controls=node('div','task-controls'),statusLabel=node('label','','Resultado');
   const select=node('select');select.setAttribute('aria-label','Resultado para '+item.title);
   for(const [id,desc] of [['pending','Sin evaluar'],['passed','Aprobado'],['issue','Con incidencia'],['blocked','Bloqueado / aún no disponible'],['na','No aplica']]){
    const option=node('option','',desc);option.value=id;select.append(option);
   }
   select.value=value.result||'pending';statusLabel.append(select);
   const noteLabel=node('label','','Observación / evidencia');
   const note=node('textarea');note.rows=2;note.maxLength=1000;note.placeholder='Hallazgo, fecha, navegador o enlace de evidencia';note.value=value.note||'';
   note.setAttribute('aria-label','Observación para '+item.title);noteLabel.append(note);controls.append(statusLabel,noteLabel);
   article.append(controls);
   const source=node('a','task-source','Referencia de requisito');source.href=item.source;source.target='_blank';source.rel='noopener noreferrer';article.append(source);
   cb.addEventListener('change',()=>{select.value=cb.checked?'passed':'pending';updateAnswer(item.id,select.value,note.value);});
   select.addEventListener('change',()=>{cb.checked=select.value==='passed';updateAnswer(item.id,select.value,note.value);});
   note.addEventListener('input',()=>updateAnswer(item.id,select.value,note.value));
   body.append(article);
  }
  root.append(section);
 }
 $('general-notes').value=report.generalNotes||'';
 $('general-notes').oninput=()=>{state.report.generalNotes=$('general-notes').value.slice(0,3000);storeDraft();};
 updateProgress();
 filterTasks();
}
function updateAnswer(id,result,note){
 Core.setAnswer(state.report,id,result,note,Catalog);
 storeDraft();updateProgress();filterTasks();
}
function updateProgress(){
 if(!state.report)return;
 const p=Core.progress(state.report,Catalog);
 const percentage=Math.round(p.reviewed*100/p.total)||0;
 $('progress-bar').max=p.total;$('progress-bar').value=p.reviewed;
 message('progress-text',p.reviewed+' de '+p.total+' puntos revisados ('+percentage+' %)');message('progress-breakdown',
  'Aprobados: '+p.passed+' · Incidencias: '+p.issue+' · Bloqueados: '+p.blocked+' · No aplica: '+p.na+' · Sin evaluar: '+p.pending);
}
function filterTasks(){
 if(!state.report)return;
 const query=$('filter-text').value.trim().toLocaleLowerCase('es');
 const priority=$('filter-priority').value,result=$('filter-result').value;
 for(const group of $('checklist').children){
  let visible=0;
  for(const task of group.querySelectorAll('.task')){
   const a=state.report.answers[task.dataset.id];
   const ok=task.dataset.search.includes(query)
    &&(priority==='all'||task.dataset.priority===priority)
    &&(result==='all'||(a?.result||'pending')===result);
   task.hidden=!ok;if(ok)visible++;
  }
  group.hidden=visible===0;
 }
}
async function saveReport(){
 if(!state.report||state.conflicted||!Core.canEvaluate(state.role,state.admin,state.version))return;
 try{
  cloudReady();
  $('save-report').disabled=true;
  message('save-status','Comprobando revisión y guardando en Firebase…');
  const version=state.version,uid=state.user.uid,report=Core.normalise(state.report,uid,version,Catalog);
  const ref=state.sdk.doc(state.db,'evaluationReports',uid+'_'+version);
  const base=state.baselineRevision;
  await state.sdk.runTransaction(state.db,async tx=>{
   const remote=await tx.get(ref),actual=remote.exists()?Number(remote.data().revision)||0:0;
   if(actual!==base)throw Object.assign(Error('La evaluación cambió en otro dispositivo. Exporta el borrador y recarga antes de continuar.'),{code:'evaluation/stale'});
   tx.set(ref,{ownerUid:uid,version,answers:report.answers,generalNotes:report.generalNotes,
    revision:actual+1,updatedAt:state.sdk.serverTimestamp()});
  });
  if(state.version!==version||state.user?.uid!==uid)return;
  state.baselineRevision=base+1;state.report.revision=base+1;state.dirty=false;
  safeLocalRemove(Core.draftKey(uid,version));
  message('save-status','✓ Guardado en Firebase. Revisión '+state.baselineRevision+'.');
 }catch(e){
  state.conflicted=e?.code==='evaluation/stale';
  if(state.conflicted){$('draft-warning').hidden=false;message('save-status','Conflicto: '+classify(e));}
  else message('save-status','No guardado · '+classify(e)+' Se conserva el borrador local.');
 }finally{
  $('save-report').disabled=state.conflicted||!Core.canEvaluate(state.role,state.admin,state.version);
 }
}
function downloadReport(){
 if(!state.report)return;
 const data={format:'metriqa-evaluacion-v1',exportedAt:new Date().toISOString(),report:state.report,
  versionLabel:Catalog.versionNames[state.version]};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='metriqa-evaluacion-'+state.version+'-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function resolveLocal(){
 if(!state.conflicted||!state.remote)return;
 if(!confirm('El borrador local puede reemplazar respuestas nuevas en la nube. Exporta ambas versiones si necesitas conservarlas. ¿Quieres revisarlo para guardarlo explícitamente?'))return;
 state.baselineRevision=state.remote.revision;state.conflicted=false;
 state.report.revision=state.remote.revision;storeDraft();$('draft-warning').hidden=true;
 $('save-report').disabled=false;message('save-status','Borrador local seleccionado. Revisa las diferencias antes de guardar.');
}
function useCloud(){
 if(!state.remote||!confirm('¿Descartar el borrador local y cargar las respuestas guardadas en Firebase?'))return;
 safeLocalRemove(draftKey());state.report=Core.normalise(state.remote,state.user.uid,state.version,Catalog);
 state.conflicted=false;state.dirty=false;$('draft-warning').hidden=true;$('save-report').disabled=false;
 renderChecklist();message('save-status','Respuestas recuperadas desde Firebase.');
}
async function loadAdmin(){
 if(!state.admin||!state.user)return;
 cloudReady();message('admin-status','Consultando usuarios, permisos y evaluaciones…');
 const sdk=state.sdk,db=state.db;
 const [p,s,r,reports]=await Promise.allSettled([
  sdk.getDocsFromServer(sdk.collection(db,'evaluationProfiles')),
  sdk.getDocsFromServer(sdk.collection(db,'usageSessions')),
  sdk.getDocsFromServer(sdk.collection(db,'evaluationRoles')),
  sdk.getDocsFromServer(sdk.collection(db,'evaluationReports'))
 ]);
 if(p.status!=='fulfilled'||r.status!=='fulfilled')throw Error('No se pudo leer el registro de evaluadores. Verifica despliegue de reglas Firebase.');
 const map=new Map();
 function ingest(uid,email,name,last){
  if(!uid||!email)return;
  const old=map.get(uid)||{uid,email,name:'',last:0};
  old.email=email;old.name=name||old.name;old.last=Math.max(old.last,last||0);map.set(uid,old);
 }
 for(const doc of p.value.docs){const x=doc.data();ingest(doc.id,x.email,x.displayName,x.lastSeen?.toMillis?.());}
 if(s.status==='fulfilled')for(const doc of s.value.docs){const x=doc.data();ingest(x.uid,x.email,'',x.lastSeen?.toMillis?.());}
 const roles=new Map();
 for(const doc of r.value.docs){roles.set(doc.id,doc.data());const x=doc.data();if(!map.has(doc.id))ingest(doc.id,x.email,'',0);}
 state.adminUsers=[...map.values()].sort((a,b)=>b.last-a.last);
 state.adminRoles=roles;
 renderUsers();
 if(reports.status==='fulfilled')renderSummaries(reports.value.docs);
 else message('reports-summary','No se pudieron consultar los informes guardados.');
 message('admin-status','Usuarios identificados: '+state.adminUsers.length+' · permisos administrables: '+roles.size+'.');
}
function renderUsers(){
 const root=$('users-list');root.replaceChildren();
 const q=$('admin-search').value.trim().toLocaleLowerCase('es');
 const visible=state.adminUsers.filter(u=>(u.email+' '+u.name).toLocaleLowerCase('es').includes(q));
 if(!visible.length){root.append(node('p','hint','No hay usuarios con esa búsqueda.'));return;}
 for(const u of visible.slice(0,300)){
  const role=state.adminRoles.get(u.uid),allowed=Core.versionsFor(role,false);
  const row=node('div','user-row');
  const identity=node('div');identity.append(node('strong','',u.name||u.email));
  identity.append(node('small','',u.email+(u.last?' · Última sesión '+new Date(u.last).toLocaleString('es-CL'):' · Sin fecha de sesión')));
  const permissions=node('div','permissions');
  const check=(v,text)=>{
   const lab=node('label'),cb=node('input');cb.type='checkbox';cb.checked=role?allowed.includes(v):true;
   cb.setAttribute('aria-label',text+' para '+u.email);lab.append(cb,node('span','',text));permissions.append(lab);return cb;
  };
  const full=check('full','Full'),initial=check('initial','Inicial');
  const save=node('button','', 'Aplicar acceso');
  save.addEventListener('click',async()=>{
   if(!state.admin)return;
   const versions=[];if(full.checked)versions.push('full');if(initial.checked)versions.push('initial');
   const verb=versions.length?'habilitar '+versions.join(' e '):'revocar todo acceso';
   if(!confirm('¿Confirmas '+verb+' para '+u.email+'?'))return;
   save.disabled=true;
   try{
    cloudReady();
    await state.sdk.setDoc(state.sdk.doc(state.db,'evaluationRoles',u.uid),{
     email:u.email,active:versions.length>0,versions,updatedAt:state.sdk.serverTimestamp()
    });
    message('admin-status','Permisos actualizados para '+u.email+'.');
    await loadAdmin();
   }catch(e){message('admin-status','No se actualizaron permisos: '+classify(e));}
   finally{save.disabled=false;}
  });
  permissions.append(save);row.append(identity,permissions);root.append(row);
 }
}
function renderSummaries(docs){
 const root=$('reports-summary');root.replaceChildren();
 if(!docs.length){root.append(node('p','hint','Aún no hay evaluaciones guardadas.'));return;}
 for(const doc of docs.slice().sort((a,b)=>(b.data().updatedAt?.toMillis?.()||0)-(a.data().updatedAt?.toMillis?.()||0))){
  const d=doc.data();if(!Core.VERSIONS.includes(d.version))continue;
  const who=state.adminUsers.find(u=>u.uid===d.ownerUid),report=Core.normalise(d,d.ownerUid,d.version,Catalog);
  const progress=Core.progress(report,Catalog);
  const box=node('details','summary-row');
  const title=node('summary','',(who?.email||'Evaluador')+' · '+Catalog.versionNames[d.version]+
    ' · '+progress.reviewed+'/'+progress.total+' · Incidencias '+progress.issue);
  const details=node('div');details.append(node('small','',
   'Última revisión: '+formatDate(d.updatedAt)+' · Aprobadas '+progress.passed+' · Bloqueadas '+progress.blocked+' · No aplica '+progress.na));
  for(const item of Catalog.forVersion(d.version)){
   const a=report.answers[item.id];if(!a||a.result==='pending')continue;
   details.append(node('p','',item.id+' · '+item.title+' · '+a.result+(a.note?' · '+a.note:'')));
  }
  if(report.generalNotes)details.append(node('p','','Observación general: '+report.generalNotes));
  box.append(title,details);root.append(box);
 }
}
$('login').addEventListener('click',login);
$('retry').addEventListener('click',()=>state.user?authenticate(state.user,++state.epoch).catch(e=>showGate(classify(e))):login());
$('logout').addEventListener('click',async()=>{if(state.auth)await state.sdk.signOut(state.auth);});
$('choose-full').addEventListener('click',()=>openVersion('full'));
$('choose-initial').addEventListener('click',()=>openVersion('initial'));
$('save-report').addEventListener('click',saveReport);
$('download-report').addEventListener('click',downloadReport);
$('reload-report').addEventListener('click',()=>{
 if(!state.version)return;
 if(!confirm('¿Cargar última revisión de Firebase? El borrador local se conserva hasta elegirlo o descartarlo.'))return;
 openVersion(state.version);
});
$('keep-local').addEventListener('click',resolveLocal);
$('use-cloud').addEventListener('click',useCloud);
for(const id of ['filter-text','filter-priority','filter-result'])$(id).addEventListener('input',filterTasks);
$('admin-search').addEventListener('input',renderUsers);
$('refresh-admin').addEventListener('click',()=>loadAdmin().catch(e=>message('admin-status',classify(e))));
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
boot();
