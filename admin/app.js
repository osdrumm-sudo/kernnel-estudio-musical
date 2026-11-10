/* Kernnel Admin: las autorizaciones se validan en el servidor, no aquí. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged,setPersistence,browserSessionPersistence}
 from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';

const $=id=>document.getElementById(id);
const E=(name,text)=>{const n=document.createElement(name);n.textContent=text;return n};
const config=window.KERNNEL_FIREBASE_CONFIG;
const endpoint=String(window.KERNNEL_ADMIN_API_URL||'').replace(/\/$/,'');
function validAPI(s){try{const u=new URL(s);
 return u.protocol==='https:' && !u.username && !u.password &&
   (u.hostname.endsWith('.workers.dev') || u.hostname==='api.kernnel.app') &&
   (u.pathname==='/' || u.pathname==='') && !u.search && !u.hash;
}catch{return false}}
const apiReady=validAPI(endpoint);
const firebaseReady=config&&['apiKey','authDomain','projectId','appId'].every(k=>typeof config[k]==='string'&&config[k]);
let auth,user=null,authorized=false,offset=0,nextOffset=null;
const fmt=n=>new Intl.NumberFormat('es-CL').format(n);
const fmtDate=v=>{
 if(v===null||v===undefined||v==='')return '—';
 const d=new Date(typeof v==='string'&&/^\d+$/.test(v)?Number(v):v);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(d):'—';
};
function msg(id,value,isError=false){$(id).textContent=value;$(id).classList.toggle('error',isError)}
function showLogin(note){
 authorized=false;$('dashboard').hidden=true;$('login').hidden=false;$('sign-out').hidden=true;
 $('signed-email').textContent='';msg('login-status',note);
}
async function request(path){
 if(!apiReady||!user)throw Error('API del administrador no configurada');
 const token=await user.getIdToken(true);
 const r=await fetch(endpoint+path,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(r.status===403?'Esta cuenta no tiene autorización de administrador.':(data.error||'No se pudo conectar con el servidor'));
 return data;
}
function emptyGraph(note){$('chart').replaceChildren(E('p',note));$('chart').firstChild.className='no-data'}
function drawGraph(rows){
 if(!rows.length)return emptyGraph('Aún no hay visitas registradas en el período.');
 const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 700 230');
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Visitas diarias: '+rows.map(r=>r.date+' '+r.visits).join(', '));
 const shape=(name,attrs)=>{const s=document.createElementNS(ns,name);
  for(const [k,v] of Object.entries(attrs))s.setAttribute(k,String(v));svg.append(s);return s;};
 const max=Math.max(1,...rows.map(r=>r.visits)),baseline=190,height=155,step=634/rows.length;
 for(let i=0;i<4;i++){
  const y=baseline-i*height/3;
  shape('line',{x1:34,x2:679,y1:y,y2:y,stroke:'#506577','stroke-width':.7});
  shape('text',{x:4,y:y+4,fill:'#c8dbe5','font-size':10}).textContent=fmt(Math.round(i*max/3));
 }
 rows.forEach((r,i)=>{
  const w=Math.min(24,Math.max(4,step-8)),x=40+i*step+(step-w)/2,h=r.visits/max*height;
  const bar=shape('rect',{x,y:baseline-h,width:w,height:h,rx:3,fill:'#68dcca'});
  bar.append(document.createElementNS(ns,'title'));
  bar.lastChild.textContent=r.date+': '+fmt(r.visits)+' visitas';
  if(rows.length<=10||i%5===0||i===rows.length-1){
   const label=shape('text',{x:x+w/2,y:215,'text-anchor':'middle',fill:'#c1d2dc','font-size':10});
   label.textContent=r.date.slice(5);
  }
 });
 $('chart').replaceChildren(svg);
}
async function overview(){
 if(!authorized)return;
 $('refresh').disabled=true;msg('data-status','Consultando estadísticas…');
 try{
  const d=Number($('days').value),x=await request('/api/overview?days='+d),a=x.analytics||{},u=x.registered||{};
  $('metric-visits').textContent=a.available?fmt(a.visits):'—';
  $('metric-views').textContent=a.available?fmt(a.views):'—';
  $('metric-users').textContent=u.available?fmt(u.count):'—';
  if(a.available)drawGraph(a.daily||[]);else emptyGraph(a.reason||'Visitas no disponibles.');
  const issues=[!a.available?a.reason:null,!u.available?u.reason:null].filter(Boolean);
  msg('data-status',issues.length?issues.join(' · '):'Datos actualizados, últimos '+d+' días.');
 }catch(e){
  ['metric-visits','metric-views','metric-users'].forEach(id=>$(id).textContent='—');
  emptyGraph('Datos no disponibles');msg('data-status',e.message,true);
 }finally{$('refresh').disabled=false}
}
async function users(page){
 if(!authorized)return;
 msg('users-status','Consultando usuarios…');
 $('prev-page').disabled=true;$('next-page').disabled=true;$('reload-users').disabled=true;
 try{
  const data=await request('/api/users?offset='+page),body=$('users-body');
  offset=page;nextOffset=data.nextOffset;body.replaceChildren();
  if(!data.users.length){
   const tr=E('tr',''),td=E('td','No hay usuarios en esta página.');td.colSpan=5;tr.append(td);body.append(tr);
  }
  data.users.forEach(u=>{
   const tr=E('tr','');
   [u.email||'(Sin correo)',u.verified?'Sí':'No',fmtDate(u.createdAt),fmtDate(u.lastLoginAt),
    u.disabled?'Deshabilitada':'Activa'].forEach(t=>tr.append(E('td',t)));
   body.append(tr);
  });
  $('page-label').textContent='Página '+(Math.floor(offset/50)+1);
  $('prev-page').disabled=offset===0;$('next-page').disabled=nextOffset===null;
  msg('users-status','Mostrando '+data.users.length+' cuentas. Consulta de solo lectura.');
 }catch(e){
  msg('users-status',e.message,true);$('prev-page').disabled=offset===0;
  $('next-page').disabled=nextOffset===null;
 }finally{$('reload-users').disabled=false}
}
async function checkAccess(current){
 user=current;authorized=false;
 if(!apiReady)return showLogin('Falta configurar la API segura en admin/config.js.');
 msg('login-status','Comprobando autorización con el servidor…');
 try{
  await request('/api/status');
  authorized=true;$('login').hidden=true;$('dashboard').hidden=false;$('sign-out').hidden=false;
  $('signed-email').textContent=user.email||'Administrador';
  await Promise.all([overview(),users(0)]);
 }catch(e){showLogin(e.message)}
}
$('days').addEventListener('change',overview);
$('refresh').addEventListener('click',overview);
$('reload-users').addEventListener('click',()=>users(offset));
$('prev-page').addEventListener('click',()=>users(Math.max(0,offset-50)));
$('next-page').addEventListener('click',()=>{if(nextOffset!==null)users(nextOffset)});
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!auth)return;
 $('login-submit').disabled=true;msg('login-status','Iniciando sesión…');
 try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value)}
 catch{msg('login-status','Credenciales inválidas o inicio de sesión no disponible.',true)}
 finally{$('password').value='';$('login-submit').disabled=false}
});
$('sign-out').addEventListener('click',async()=>{if(auth)await signOut(auth)});
if(!firebaseReady)showLogin('Falta configurar Firebase.');
else{
 auth=getAuth(initializeApp(config,'kernnel-admin'));
 setPersistence(auth,browserSessionPersistence).then(()=>{
  onAuthStateChanged(auth,current=>{if(current)checkAccess(current);
   else{user=null;showLogin('Ingresa con tu cuenta autorizada.')}});
 }).catch(()=>showLogin('No se pudo iniciar la sesión.'));
}
