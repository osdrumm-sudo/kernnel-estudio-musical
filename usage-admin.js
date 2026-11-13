/* Telemetría mínima: sin títulos, IDs de canciones, repertorios ni contenido musical.
   Tiempo aproximado con página visible e interacción en los últimos 60 segundos. */
(function(){
'use strict';
const $=id=>document.getElementById(id);let timer=null,lastInput=Date.now(),session=null;
for(const event of ['pointerdown','keydown','touchstart'])window.addEventListener(event,()=>{lastInput=Date.now()},{passive:true});
function stop(){clearInterval(timer);timer=null;session=null;}
async function tick(){const s=session;if(!s||s.busy)return;const now=Date.now();const elapsed=Math.max(0,Math.min(10,Math.floor((now-s.tick)/1000)));s.tick=now;if(navigator.onLine&&document.visibilityState==='visible'&&now-lastInput<60000)s.seconds+=elapsed;
 if(!navigator.onLine||now-s.sent<60000)return;s.busy=true;
 try{const seconds=s.created?Math.min(s.seconds,s.ack+120):0;await s.sdk.setDoc(s.ref,{email:s.email,seconds,lastSeen:s.sdk.serverTimestamp()});s.created=true;s.ack=seconds;s.sent=now;}catch(e){console.warn('Estadísticas de uso no disponibles',e.code);}finally{s.busy=false;}
}
function start(sdk,db,user){stop();const ref=sdk.doc(db,'usageSessions',crypto.randomUUID());session={sdk,ref,email:user.email,seconds:0,tick:Date.now(),sent:0,busy:false,created:false,ack:0};const s=session;s.busy=true;
 sdk.setDoc(ref,{uid:user.uid,email:user.email,seconds:0,lastSeen:sdk.serverTimestamp()}).then(()=>{s.sent=Date.now();s.created=true;}).catch(()=>{}).finally(()=>{s.busy=false;});
 // Las actualizaciones conservan uid mediante merge.
 s.sdk={...sdk,setDoc:(r,data)=>sdk.setDoc(r,{...data,uid:user.uid})};timer=setInterval(tick,5000);
}
function filter(){const q=$('admin-search').value.trim().toLowerCase(),state=$('admin-filter').value;document.querySelectorAll('#admin-requests .access-row,#admin-users .access-row').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(q)||(state!=='all'&&row.dataset.status!==state);});}
async function admin(sdk,db,requests,users){
 $('admin-metrics').textContent=`Autorizados: ${users.docs.filter(x=>x.data().active).length} · Solicitudes pendientes: ${requests.docs.filter(x=>x.data().status==='pending').length}`;
 $('admin-activity').textContent='Cargando actividad…';
 try{const rows=await sdk.getDocsFromServer(sdk.collection(db,'usageSessions'));const grouped=new Map();for(const row of rows.docs){const d=row.data(),at=d.lastSeen?.toMillis?.()||0;const g=grouped.get(d.uid)||{email:d.email,seconds:0,last:0};g.seconds+=d.seconds||0;g.last=Math.max(g.last,at);grouped.set(d.uid,g);}
 const active=[...grouped.values()].filter(x=>Date.now()-x.last<30*86400000).length;$('admin-metrics').textContent+=` · Usuarios activos (30 días): ${active}`;
 const box=$('admin-activity');box.replaceChildren();for(const g of [...grouped.values()].sort((a,b)=>b.last-a.last)){const p=document.createElement('p');p.textContent=`${g.email} · Última actividad: ${new Date(g.last).toLocaleString('es-CL')} · Tiempo activo aproximado: ${Math.floor(g.seconds/60)} min`;box.append(p);}if(!grouped.size)box.textContent='Todavía no hay actividad registrada.';
 }catch(e){$('admin-activity').textContent='Estadísticas no disponibles. Revisa las reglas de Firebase.';}
 filter();
}
window.KernnelUsage={start,stop,admin};
window.addEventListener('DOMContentLoaded',()=>{
 $('admin-search').oninput=filter;$('admin-filter').onchange=filter;
 $('admin-refresh').onclick=()=>window.KernnelAdminRefresh().catch(()=>{$('admin-status').textContent='No se pudo actualizar.';});
 $('admin-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('admin-invitation').value);$('admin-status').textContent='Invitación copiada. Envíala al correo autorizado.';}catch{$('admin-invitation').focus();$('admin-invitation').select();$('admin-status').textContent='Selecciona y copia el mensaje.';}};
});
})();
