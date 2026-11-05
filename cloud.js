/* Kernnel Estudio musical | Sincronización manual Firebase Firestore | OSS/26
 * El SDK se carga solo tras una acción del usuario con red; en modo avión
 * el resto de Kernnel funciona normalmente con almacenamiento local.
 */
const byId = id => document.getElementById(id);
const state = { auth:null, db:null, sdk:null, user:null, busy:false, booted:false };
const config = window.KERNNEL_FIREBASE_CONFIG;
const configured = config && ['apiKey','authDomain','projectId','appId']
  .every(k => typeof config[k] === 'string' && config[k].trim() && !config[k].includes('REEMPLAZAR'));
const info = (message) => { byId('cloud-status').textContent=message; };
const errors = {
  'auth/invalid-email':'Revisa el correo electrónico.',
  'auth/email-already-in-use':'Este correo ya tiene cuenta. Utiliza Entrar.',
  'auth/weak-password':'La contraseña es demasiado débil.',
  'auth/invalid-credential':'Correo o contraseña incorrectos.',
  'auth/operation-not-allowed':'Activa Email/Password en Firebase Authentication.',
  'auth/unauthorized-domain':'Agrega el dominio de GitHub Pages en Authentication > Settings > Authorized domains.',
  'permission-denied':'Revisa las reglas de Firestore y la cuenta utilizada.',
  'unavailable':'Sin conexión con Google. Inténtalo cuando tengas Internet.'
};
function report(error){
 console.warn('[Kernnel cloud]', error);
 info(errors[error.code] || `No fue posible completar la operación: ${error.message || String(error)}`);
}
function lock(busy){
 state.busy=busy;
 ['cloud-enter','cloud-register','cloud-upload','cloud-download','cloud-logout'].forEach(id=>byId(id).disabled=busy);
}
function signedState(){
 const connected=!!state.user;
 byId('cloud-login').hidden=connected;
 byId('cloud-signed').hidden=!connected;
 byId('cloud-user').textContent=state.user ? `Cuenta: ${state.user.email||state.user.uid}` : '';
 info(connected ? 'Cuenta conectada. Puedes subir o recuperar una copia.' : 'Inicia sesión para utilizar Google Firestore.');
}
async function boot(){
 if(state.booted)return;
 if(!configured)throw new Error('Configura firebase-config.js con los datos públicos de tu proyecto Firebase.');
 if(!navigator.onLine)throw new Error('Conéctate a Internet para activar la nube.');
 info('Conectando con Firebase…');
 const v='12.11.0';
 const [app,auth,firestore]=await Promise.all([
   import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
   import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
   import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`)
 ]);
 const fbapp=app.initializeApp(config);
 state.auth=auth.getAuth(fbapp);
 state.db=firestore.getFirestore(fbapp);
 state.sdk={...auth,...firestore};
 auth.onAuthStateChanged(state.auth, user=>{
   state.user=user;
   signedState();
   if(user)refreshRemote().catch(report);
 });
 state.booted=true;
}
async function entry(register){
 if(state.busy)return;
 lock(true);
 try{
  await boot();
  const email=byId('cloud-email').value.trim();
  const password=byId('cloud-password').value;
  if(!email || password.length<6)throw Error('Escribe tu correo y una contraseña de al menos 6 caracteres.');
  if(register)await state.sdk.createUserWithEmailAndPassword(state.auth,email,password);
  else await state.sdk.signInWithEmailAndPassword(state.auth,email,password);
  byId('cloud-password').value='';
 }catch(e){report(e)}finally{lock(false)}
}
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
 if(state.busy||!state.user)return;
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
 if(state.busy||!state.user)return;
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
async function logout(){
 if(state.busy||!state.auth)return;
 lock(true);
 try{await state.sdk.signOut(state.auth);byId('cloud-password').value='';info('Sesión cerrada. Los datos locales siguen disponibles.')}catch(e){report(e)}finally{lock(false)}
}
byId('cloud-enter').addEventListener('click',()=>entry(false));
byId('cloud-register').addEventListener('click',()=>entry(true));
byId('cloud-upload').addEventListener('click',upload);
byId('cloud-download').addEventListener('click',download);
byId('cloud-logout').addEventListener('click',logout);
if(!configured)info('Para activar Google: completa firebase-config.js con la configuración web de Firebase. El guardado local sigue disponible.');
else info('Google configurado. Pulsa Entrar o Crear cuenta para conectar cuando tengas Internet.');
