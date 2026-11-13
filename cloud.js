/* Google + autorización Firestore. Las reglas del servidor son la autoridad. */
const byId=id=>document.getElementById(id);
const ADMIN='ols.bds@gmail.com', RECEIPT='kernnel-authorized-session-v1';
const state={auth:null,db:null,sdk:null,user:null,busy:false,allowed:false,bootPromise:null,account:null,epoch:0,unsubscribe:null};
const info=message=>{byId('cloud-status').textContent=message;byId('access-status').textContent=message;};
const errors={'auth/popup-blocked':'Permite la ventana de Google e inténtalo de nuevo.','auth/popup-closed-by-user':'Se cerró el ingreso. Puedes intentarlo nuevamente.','auth/unauthorized-domain':'Este dominio aún no está autorizado en Firebase.','auth/operation-not-allowed':'Habilita Google en Firebase Authentication.','permission-denied':'La cuenta no tiene permiso para esta operación.','unavailable':'No se pudo conectar. Revisa tu conexión y vuelve a intentar.'};
function report(e){console.warn('[Kernnel]',e.code||e.message);info(errors[e.code]||'No se pudo completar la operación. Inténtalo nuevamente.');}
function lock(busy){state.busy=busy;['access-google','cloud-upload','cloud-download','cloud-logout'].forEach(id=>byId(id).disabled=busy);}
function receipt(){try{return JSON.parse(localStorage.getItem(RECEIPT)||'null')}catch{return null}}
function forget(){try{localStorage.removeItem(RECEIPT)}catch{}}
function gate(message){window.KernnelUsage?.stop();stopSync();state.allowed=false;document.body.classList.add('auth-locked');byId('access-gate').hidden=false;window.KernnelBridge.pause();if(message)info(message);byId('access-admin-open').hidden=true;byId('access-admin').close();}
async function grant(user,offline=false){
 const epoch=state.epoch;
 if(state.account!==user.uid){await window.KernnelBridge.selectAccount(user.uid);if(epoch!==state.epoch)return;state.account=user.uid;}
 state.allowed=true;
 byId('access-gate').hidden=true;document.body.classList.remove('auth-locked');
 byId('cloud-signed').hidden=false;byId('cloud-user').textContent=`Cuenta: ${user.email}`;
 byId('access-admin-open').hidden=offline||user.email!==ADMIN;
 info(offline?'Sin conexión. Los cambios se guardan localmente y se enviarán al reconectar.':'Acceso autorizado. Cargando canciones y repertorios…');
 if(!offline){try{localStorage.setItem(RECEIPT,JSON.stringify({uid:user.uid,email:user.email}))}catch{}}
 startSync();
 if(!offline)window.KernnelUsage?.start(state.sdk,state.db,user);
}
async function checkAccess(){
 const user=state.user;if(!user)return;
 const epoch=++state.epoch;
 gate('Verificando autorización…');
 byId('access-google').hidden=true;byId('access-logout').hidden=false;
 if(!navigator.onLine){const saved=receipt();if(saved?.uid===user.uid)return grant(user,true);return info('Este dispositivo necesita validar el acceso con conexión.');}
 try{
 const token=await user.getIdTokenResult(true);
 if(epoch!==state.epoch)return;
 if(token.signInProvider!=='google.com'||!token.claims.email_verified){forget();byId('access-google').hidden=false;return info('Ingresa con Google para continuar.');}
 const doc=await state.sdk.getDocFromServer(state.sdk.doc(state.db,'authorizedEmails',user.email));
 if(epoch!==state.epoch)return;
 if(user.email===ADMIN||(doc.exists()&&doc.data().active===true)){byId('access-request').hidden=true;await grant(user);return;}
 forget();byId('access-request').hidden=false;byId('access-email').textContent=user.email;byId('access-name').value=user.displayName||'';
 info('Tu cuenta aún no está autorizada. Puedes solicitar acceso.');
 const request=await state.sdk.getDocFromServer(state.sdk.doc(state.db,'accessRequests',user.uid));
 if(epoch!==state.epoch)return;
 if(request.exists()){byId('access-request').hidden=true;info(request.data().status==='rejected'?'Tu solicitud fue rechazada. Contacta al administrador.':'Tu solicitud ya fue recibida. Comprueba el acceso después de su aprobación.');}
 }catch(e){if(epoch===state.epoch){gate();report(e);}}
}
async function boot(){
 if(state.bootPromise)return state.bootPromise;
 state.bootPromise=(async()=>{
 const config=window.KERNNEL_FIREBASE_CONFIG;
 const v='12.11.0';
 const [app,auth,firestore]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)]);
 const fb=app.getApps().length?app.getApp():app.initializeApp(config);state.auth=auth.getAuth(fb);state.db=firestore.getFirestore(fb);state.sdk={...auth,...firestore};
 await auth.setPersistence(state.auth,auth.browserLocalPersistence);
 if(localStorage.getItem('kernnel-signout-pending')){await auth.signOut(state.auth);localStorage.removeItem('kernnel-signout-pending');}
 auth.onAuthStateChanged(state.auth,user=>{
 state.epoch++;state.user=user;state.unsubscribe?.();state.unsubscribe=null;
 if(!user){forget();state.account=null;gate('Inicia sesión con Google para continuar.');byId('access-google').hidden=false;byId('access-logout').hidden=true;byId('access-request').hidden=true;return;}
 checkAccess().catch(report);
 // Detecta revocaciones mientras la app permanece abierta y conectada.
 state.unsubscribe=firestore.onSnapshot(firestore.doc(state.db,'authorizedEmails',user.email),snap=>{
 if(state.allowed&&!snap.metadata.fromCache&&user.email!==ADMIN&&(!snap.exists()||snap.data().active!==true)){state.epoch++;forget();gate('Tu cuenta no tiene acceso autorizado.');}
 },()=>{});
 });
 })().catch(e=>{state.bootPromise=null;throw e});return state.bootPromise;
}
async function entry(){if(state.busy)return;lock(true);try{if(!navigator.onLine)throw Error('offline');await boot();const provider=new state.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await state.sdk.signInWithPopup(state.auth,provider);}catch(e){report(e)}finally{lock(false)}}
async function logout(){if(state.busy)return;window.KernnelBridge.flushLocal?.();if(syncEngine?.pending){await syncEngine.flush();if(syncEngine.pending&&!confirm('Quedan cambios sin guardar en la nube. Se conservarán en este equipo para esta cuenta. ¿Cerrar sesión de todas formas?'))return;}lock(true);try{localStorage.setItem('kernnel-signout-pending','1');if(state.auth){await state.sdk.signOut(state.auth);localStorage.removeItem('kernnel-signout-pending');}forget();state.epoch++;state.user=null;state.account=null;gate('Sesión cerrada. Inicia sesión con Google para continuar.');byId('access-google').hidden=false;byId('access-logout').hidden=true;byId('access-request').hidden=true;}catch(e){report(e)}finally{lock(false)}}
async function readLegacy(uid,sdk,db){
 const snap=await sdk.getDocFromServer(sdk.doc(db,'users',uid,'kernnelSaves','latest'));if(!snap.exists())return null;const meta=snap.data();
 if(meta.format!=='kernnel-full-snapshot-v1'||!Number.isInteger(meta.parts)||meta.parts<1||meta.parts>300)throw Error('Respaldo anterior inválido.');
 const parts=[];for(let i=0;i<meta.parts;i++){const p=await sdk.getDocFromServer(sdk.doc(db,'users',uid,'kernnelSnapshots',meta.snapshotId,'parts',String(i).padStart(4,'0')));if(!p.exists()||p.data().index!==i||typeof p.data().payload!=='string')throw Error('Respaldo anterior incompleto.');parts.push(p.data().payload);}
 const raw=parts.join('');if(new Blob([raw]).size!==meta.bytes)throw Error('Respaldo anterior con tamaño incorrecto.');return JSON.parse(raw);
}
async function upload(){return syncEngine?.flush();}
async function download(){return syncEngine?.flush();}
async function requestAccess(event){
 event.preventDefault();if(!state.user||!navigator.onLine)return info('Conéctate e inicia sesión para enviar la solicitud.');
 const submit=event.target.querySelector('button');submit.disabled=true;
 try{await state.sdk.setDoc(state.sdk.doc(state.db,'accessRequests',state.user.uid),{email:state.user.email,name:byId('access-name').value.trim(),reason:byId('access-reason').value.trim(),status:'pending',createdAt:state.sdk.serverTimestamp()});byId('access-request').hidden=true;info('Solicitud enviada. Vuelve a comprobar el acceso después de la aprobación.');}catch(e){report(e)}finally{submit.disabled=false}
}
function adminButton(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=async()=>{b.disabled=true;try{await fn();await loadAdmin()}catch(e){byId('admin-status').textContent=errors[e.code]||'No se pudo completar el cambio.'}finally{b.disabled=false}};return b}
async function authorize(email,active){await state.sdk.setDoc(state.sdk.doc(state.db,'authorizedEmails',email),{active});}
async function loadAdmin(){
 if(!state.allowed||state.user?.email!==ADMIN||!navigator.onLine)throw Error('Sin acceso administrativo');
 const sdk=state.sdk;
 const [requests,users]=await Promise.all([sdk.getDocsFromServer(sdk.collection(state.db,'accessRequests')),sdk.getDocsFromServer(sdk.collection(state.db,'authorizedEmails'))]);
 byId('admin-status').textContent='Solo tú puedes autorizar o revocar accesos.';
 window.KernnelUsage?.admin(state.sdk,state.db,requests,users);
 for(const [id,list] of [['admin-requests',requests],['admin-users',users]]){
 const box=byId(id);box.replaceChildren();
 if(list.empty){box.textContent='Sin registros.';continue;}
 list.forEach(snap=>{const data=snap.data(),row=document.createElement('div');row.className='access-row';const text=document.createElement('p');
 if(id==='admin-requests'){
 text.textContent=`${data.name} · ${data.email} · ${data.reason||'Sin motivo'} · ${data.status}`;
 row.append(text);if(data.status==='pending')row.append(adminButton('Aprobar',async()=>{await authorize(data.email,true);await sdk.updateDoc(snap.ref,{status:'approved'})}),adminButton('Rechazar solicitud',()=>sdk.updateDoc(snap.ref,{status:'rejected'})));
 }else{ text.textContent=`${snap.id} · ${data.active?'Autorizado':'Revocado'}`;row.append(text,adminButton(data.active?'Revocar':'Autorizar',async()=>{if(data.active&&!confirm(`¿Revocar el acceso de ${snap.id}? Se aplicará al conectarse.`))return;await authorize(snap.id,!data.active)}));}
 row.dataset.status=id==='admin-requests'?data.status:(data.active?'active':'revoked');box.append(row);});
 }
}
window.KernnelAdminRefresh=()=>loadAdmin();
let syncEngine=null,syncWatch=null;
function stopSync(){syncEngine?.stop();syncEngine=null;syncWatch?.();syncWatch=null;}
function syncStatus(status,error){
 const messages={pending:'Cambios pendientes de guardar en la nube',saving:'Guardando y comprobando cambios…',saved:'✓ Guardado en la nube','offline-clean':'Sin conexión · sin cambios pendientes',offline:'Sin conexión · cambios pendientes en este equipo',error:'No se pudo sincronizar. Los cambios siguen en este equipo.'};
 const message=error?.code==='permission-denied'?'Falta habilitar las reglas de sincronización en Firebase. Tus cambios siguen en este equipo.':messages[status];
 byId('sync-indicator').textContent=message;byId('cloud-remote').textContent=message;
 if(error?.conflicts){byId('sync-conflicts').hidden=false;byId('sync-conflicts').textContent='Se detectaron cambios simultáneos. Se conservaron las versiones con contenido; busca «Duplicada por conflicto» y revisa sus fechas.';}
 if(status==='error')console.warn('[Sincronización]',error);
}
function startSync(){
 stopSync();if(!window.KernnelSyncEngine)return;
 const uid=state.user.uid,epoch=state.epoch,valid=()=>state.allowed&&state.user?.uid===uid&&state.epoch===epoch;
 const store=new window.KernnelSyncStore(state.sdk,state.db,uid,()=>readLegacy(uid,state.sdk,state.db),valid);
 syncEngine=new window.KernnelSyncEngine({bridge:window.KernnelBridge,store,status:syncStatus,valid});
 syncEngine.flush();
 if(state.sdk)syncWatch=state.sdk.onSnapshot(store.collection(),snap=>{if(!snap.metadata.fromCache&&valid())syncEngine?.schedule(1500);},e=>syncStatus('error',e));
}
window.addEventListener('kernnel-change',()=>{if(syncEngine)syncEngine.changed();else if(state.allowed)syncStatus('offline');});
window.addEventListener('beforeunload',event=>{window.KernnelBridge.flushLocal?.();if(syncEngine?.pending){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>window.KernnelBridge.flushLocal?.());
document.addEventListener?.('visibilitychange',()=>{window.KernnelBridge.flushLocal?.();if(state.allowed&&navigator.onLine)syncEngine?.flush();});
byId('sync-history-close').onclick=()=>byId('sync-history').close();
byId('sync-history-open').onclick=async()=>{
 const engine=syncEngine;if(!engine||!navigator.onLine)return info('El historial necesita conexión.');
 byId('sync-history').showModal();const box=byId('sync-history-list');box.textContent='Cargando historial…';
 try{const heads=await engine.store.list();if(!engine.alive())return;box.replaceChildren();
 for(const head of Object.values(heads))for(const v of head.history||[]){
  const row=document.createElement('p'),label=document.createElement('span');label.textContent=`${v.kind==='temas'?'Canción':'Repertorio'}: ${v.name} · ${new Date(v.modifiedAt).toLocaleString('es-CL')}${v.deleted?' · Eliminado':''} `;row.append(label);
  if(!v.deleted){const button=document.createElement('button');button.textContent='Recuperar como copia';button.onclick=async()=>{button.disabled=true;try{const value=await engine.store.read(v);if(!engine.alive())return;const data=window.KernnelBridge.snapshot();value.id='restored-'+engine.store.id();value.nombre+=' (Recuperada '+new Date(v.modifiedAt).toLocaleDateString('es-CL')+')';data[v.kind].push(value);window.KernnelBridge.applySync(data);engine.changed();byId('sync-history').close();}catch(e){info('No se pudo recuperar la versión.');}finally{button.disabled=false}};row.append(button);}box.append(row);
 }if(!Object.keys(heads).length)box.textContent='Todavía no hay versiones guardadas.';
 }catch(e){box.textContent='No se pudo cargar el historial. Revisa conexión y permisos.';}
};
byId('access-google').onclick=entry;
byId('access-retry').onclick=()=>{if(state.user&&state.sdk)checkAccess().catch(report);else if(navigator.onLine)boot().catch(report);else info('Conéctate para comprobar el acceso.');};
byId('access-logout').onclick=logout;byId('cloud-logout').onclick=logout;
byId('cloud-upload').onclick=upload;byId('cloud-download').onclick=download;
byId('access-request').onsubmit=requestAccess;
byId('admin-close').onclick=()=>byId('access-admin').close();
byId('access-admin-open').onclick=async()=>{byId('access-admin').showModal();try{await loadAdmin()}catch(e){byId('admin-status').textContent='No se pudo cargar. Revisa tu conexión.'}};
byId('admin-invite').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await authorize(byId('admin-email').value.trim().toLowerCase(),true);byId('admin-email').value='';await loadAdmin()}catch(error){byId('admin-status').textContent='No se pudo autorizar el correo.'}finally{button.disabled=false}};
window.addEventListener('online',()=>{gate('Revalidando acceso al recuperar conexión…');if(state.sdk&&state.user)checkAccess().catch(report);else boot().catch(report)});
window.addEventListener('offline',()=>{if(state.allowed)info('Sin conexión. Tus cambios se guardan en este equipo.');});
if(navigator.onLine)boot().catch(report);
else{const saved=receipt();if(saved?.uid&&saved?.email){state.user=saved;byId('access-logout').hidden=false;grant(saved,true).catch(report)}else gate('Conéctate a Internet para iniciar sesión por primera vez.');}
