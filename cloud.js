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
function gate(message){state.allowed=false;document.body.classList.add('auth-locked');byId('access-gate').hidden=false;window.KernnelBridge.pause();if(message)info(message);byId('access-admin-open').hidden=true;byId('access-admin').close();}
async function grant(user,offline=false){
 const epoch=state.epoch;
 if(state.account!==user.uid){await window.KernnelBridge.selectAccount(user.uid);if(epoch!==state.epoch)return;state.account=user.uid;}
 state.allowed=true;
 byId('access-gate').hidden=true;document.body.classList.remove('auth-locked');
 byId('cloud-signed').hidden=false;byId('cloud-user').textContent=`Cuenta: ${user.email}`;
 byId('access-admin-open').hidden=offline||user.email!==ADMIN;
 info(offline?'Sin conexión. Trabajas con la biblioteca de esta cuenta guardada en el dispositivo.':'Acceso autorizado. Las copias de Google se guardan y recuperan manualmente.');
 if(!offline){try{localStorage.setItem(RECEIPT,JSON.stringify({uid:user.uid,email:user.email}))}catch{}refreshRemote().catch(report);}
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
 if(request.exists()){byId('access-request').hidden=true;info('Tu solicitud ya fue recibida. El administrador debe autorizar tu acceso.');}
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
async function logout(){if(state.busy)return;lock(true);try{localStorage.setItem('kernnel-signout-pending','1');if(state.auth){await state.sdk.signOut(state.auth);localStorage.removeItem('kernnel-signout-pending');}forget();state.epoch++;state.user=null;state.account=null;gate('Sesión cerrada. Inicia sesión con Google para continuar.');byId('access-google').hidden=false;byId('access-logout').hidden=true;byId('access-request').hidden=true;}catch(e){report(e)}finally{lock(false)}}
function latestDoc(){return state.sdk.doc(state.db,'users',state.user.uid,'kernnelSaves','latest')}
function partDoc(snapshotId,i){return state.sdk.doc(state.db,'users',state.user.uid,'kernnelSnapshots',snapshotId,'parts',String(i).padStart(4,'0'))}
function chunksFrom(str){
 const result=[];
 for(let start=0;start<str.length;){
  let end=Math.min(str.length,start+140000);
  // Evita cortar en medio de un par UTF-16 (emojis y otros caracteres).
  if(end<str.length && end>start){
   const a=str.charCodeAt(end-1),b=str.charCodeAt(end);
   if(a>=0xD800&&a<=0xDBFF&&b>=0xDC00&&b<=0xDFFF)end--;
  }
  result.push(str.slice(start,end)); start=end;
 }
 return result;
}
function freshId(){return 's'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
async function refreshRemote(){
 if(!state.user)return;
 const snap=await state.sdk.getDocFromServer(latestDoc());
 if(!snap.exists()){
   byId('cloud-remote').textContent='No hay copias en Google todavía.';
   return null;
 }
 const record=snap.data(),when=record.createdAt?.toDate?.();
 byId('cloud-remote').textContent=`Último respaldo: ${when?when.toLocaleString('es-CL'):'fecha no disponible'} · ${record.songCount||0} canción(es) · ${record.parts||0} fragmento(s).`;
 return record;
}
async function upload(){
 if(state.busy||!state.user||!state.allowed)return;
 if(!window.KernnelBridge?.ready())return info('Espera a que termine de cargar la biblioteca local.');
 lock(true);
 try{
  if(!navigator.onLine)throw Error('Se requiere Internet para guardar en Google.');
  const raw=window.KernnelBridge.snapshot();
  const txt=JSON.stringify(raw);
  // Se pueden almacenar imágenes incrustadas, sin activar Cloud Storage de pago.
  const size=new Blob([txt]).size;
  if(size>25*1024*1024)throw Error('La biblioteca supera 25 MB. Exporta primero un JSON local y reduce las imágenes antes de subirla.');
  const prev=await refreshRemote();
  if(prev && !confirm('Ya existe una copia en Google. Si continúas será reemplazada como copia principal. ¿Quieres subir todo lo que tienes en ESTE dispositivo?'))return;
  if(!prev && !confirm('Se guardará una copia completa de este dispositivo en tu cuenta Google. ¿Continuar?'))return;
  const parts=chunksFrom(txt);
  const id=freshId();
  info(`Guardando ${parts.length} fragmento(s) en Google…`);
  // Primero se suben TODOS los fragmentos; sólo entonces se modifica 'latest'.
  for(let i=0;i<parts.length;i++){
    await state.sdk.setDoc(partDoc(id,i),{index:i,payload:parts[i]});
  }
  await state.sdk.setDoc(latestDoc(),{
   snapshotId:id,parts:parts.length,songCount:raw.temas?.length||0,
   repertoireCount:raw.repertorios?.length||0,createdAt:state.sdk.serverTimestamp(),
   bytes:size,format:'kernnel-full-snapshot-v1'
  });
  info('✓ Copia completa guardada en Google.');
  await refreshRemote();
 }catch(e){report(e)}finally{lock(false)}
}
async function download(){
 if(state.busy||!state.user||!state.allowed)return;
 lock(true);
 try{
  if(!navigator.onLine)throw Error('Se requiere Internet para recuperar desde Google.');
  const meta=await refreshRemote();
  if(!meta)throw Error('No existe ninguna copia en Google.');
  if(meta.format!=='kernnel-full-snapshot-v1' || !Number.isInteger(meta.parts)||meta.parts<1||meta.parts>300)
    throw Error('La copia remota no tiene un formato reconocido.');
  if(!confirm('ADVERTENCIA: recuperar la copia de Google REEMPLAZARÁ las canciones, repertorios y ajustes de ESTE dispositivo. Descarga primero un respaldo JSON local para no perder cambios. ¿Continuar?'))return;
  info(`Recuperando ${meta.parts} fragmento(s)…`);
  const parts=[];
  for(let i=0;i<meta.parts;i++){
   const snap=await state.sdk.getDocFromServer(partDoc(meta.snapshotId,i));
   if(!snap.exists()||typeof snap.data().payload!=='string'||snap.data().index!==i)throw Error('La copia remota está incompleta. No se modificaron tus datos locales.');
   parts.push(snap.data().payload);
  }
  const raw=parts.join('');
  if(new Blob([raw]).size!==meta.bytes)throw Error('La copia remota no pasó la comprobación de tamaño. No se modificaron los datos locales.');
  const result=JSON.parse(raw);
  window.KernnelBridge.importCloudSnapshot(result);
  info('✓ Datos recuperados y guardados localmente.');
 }catch(e){report(e)}finally{lock(false)}
}
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
 for(const [id,list] of [['admin-requests',requests],['admin-users',users]]){
 const box=byId(id);box.replaceChildren();
 if(list.empty){box.textContent='Sin registros.';continue;}
 list.forEach(snap=>{const data=snap.data(),row=document.createElement('div');row.className='access-row';const text=document.createElement('p');
 if(id==='admin-requests'){
 text.textContent=`${data.name} · ${data.email} · ${data.reason||'Sin motivo'} · ${data.status}`;
 row.append(text,adminButton('Aprobar',async()=>{await authorize(data.email,true);await sdk.updateDoc(snap.ref,{status:'approved'})}),adminButton('Rechazar solicitud',()=>sdk.updateDoc(snap.ref,{status:'rejected'})));
 }else{ text.textContent=`${snap.id} · ${data.active?'Autorizado':'Revocado'}`;row.append(text,adminButton(data.active?'Revocar':'Autorizar',async()=>{if(data.active&&!confirm(`¿Revocar el acceso de ${snap.id}? Se aplicará al conectarse.`))return;await authorize(snap.id,!data.active)}));}
 box.append(row);});
 }
}
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
