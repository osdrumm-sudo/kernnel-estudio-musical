/* Kernnel: API de consulta privada. Cloudflare Worker independiente de Urgnet. */
const IDENTITY='https://identitytoolkit.googleapis.com/v1';
const OAUTH='https://oauth2.googleapis.com/token';
let cache=null;
const respond=(value,status=200,origin='')=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',
  ...(origin?{'Access-Control-Allow-Origin':origin}:{})}
});
const fail=(error,status,origin)=>respond({error},status,origin);
const b64url=bytes=>{
 const array=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
 let chars='';for(const b of array)chars+=String.fromCharCode(b);
 return btoa(chars).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const payload=token=>{
 try{const item=token.split('.')[1];if(!item||item.length>8192)return null;
 const b=atob(item.replace(/-/g,'+').replace(/_/g,'/'));
 return JSON.parse(new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))));
 }catch{return null}
};
const admins=env=>new Set(String(env.ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));

async function authorize(request,env){
 if(!env.FIREBASE_API_KEY||!env.FIREBASE_PROJECT_ID||!admins(env).size)return null;
 const header=request.headers.get('Authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>7000)return null;
 const token=header.slice(7).trim(), claims=payload(token), project=env.FIREBASE_PROJECT_ID;
 if(!claims||claims.aud!==project||claims.iss!=='https://securetoken.google.com/'+project||
    typeof claims.sub!=='string'||!claims.sub||claims.exp<=Date.now()/1000)return null;
 // Google valida el ID token, su firma y su estado; JWT decodificado no otorga permisos.
 const response=await fetch(IDENTITY+'/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_API_KEY),{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})
 });
 if(!response.ok)return null;
 const user=(await response.json()).users?.[0];
 if(!user||user.disabled||user.localId!==claims.sub||!admins(env).has(user.localId))return null;
 return {uid:user.localId};
}
const pkcs8=pem=>Uint8Array.from(atob(String(pem||'').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'')),c=>c.charCodeAt(0));
async function googleToken(env){
 if(cache?.expires>Date.now()+60000)return cache.value;
 if(!env.GOOGLE_SERVICE_ACCOUNT_JSON)throw Error('Credencial ausente');
 const sa=JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
 if(sa.project_id!==env.FIREBASE_PROJECT_ID||!sa.client_email||!sa.private_key)throw Error('Credencial incorrecta');
 const now=Math.floor(Date.now()/1000);
 const head=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
 const data=b64url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/identitytoolkit',
   aud:OAUTH,iat:now,exp:now+3500}));
 const input=head+'.'+data;
 const key=await crypto.subtle.importKey('pkcs8',pkcs8(sa.private_key),
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(input));
 const assertion=input+'.'+b64url(new Uint8Array(signed));
 const response=await fetch(OAUTH,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw Error('OAuth denegado');
 const body=await response.json();
 if(!body.access_token)throw Error('Token Google ausente');
 cache={value:body.access_token,expires:Date.now()+Math.min(Number(body.expires_in)||3300,3500)*1000};
 return cache.value;
}
async function usersQuery(env,requestBody){
 const token=await googleToken(env);
 const url=IDENTITY+'/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/accounts:query';
 const r=await fetch(url,{method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(requestBody)});
 if(!r.ok)throw Error('Sin permiso para leer usuarios de Firebase');
 return r.json();
}
async function registered(env){
 const r=await usersQuery(env,{returnUserInfo:false});
 const n=Number(r.recordsCount);
 if(!Number.isSafeInteger(n)||n<0)throw Error('Conteo inválido');
 return {available:true,count:n};
}
async function userPage(env,offset){
 const r=await usersQuery(env,{returnUserInfo:true,limit:'50',offset:String(offset)});
 const users=(r.userInfo||[]).map(x=>({
  uid:String(x.localId||''),email:String(x.email||''),createdAt:x.createdAt||null,
  lastLoginAt:x.lastLoginAt||null,verified:!!x.emailVerified,disabled:!!x.disabled
 }));
 return {offset,users,nextOffset:users.length===50?offset+50:null};
}
const RUM_QUERY=[
 'query($account:String!, $start:Date!, $end:Date!) {',
 ' viewer { accounts(filter:{accountTag:$account}) {',
 '  byDay: rumPageloadEventsAdaptiveGroups(',
 '   limit:45,orderBy:[date_ASC],',
 '   filter:{date_geq:$start,date_leq:$end,requestHost:"kernnel.app"}',
 '  ) { count sum { visits } dimensions { date } }',
 ' } } }'
].join(' ');
async function analytics(env,days){
 if(!env.CF_ACCOUNT_ID||!env.CF_ANALYTICS_TOKEN)return {available:false,reason:'Configurar Cloudflare Web Analytics'};
 const end=new Date(),start=new Date(end);start.setUTCDate(end.getUTCDate()-days+1);
 const r=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',
  headers:{Authorization:'Bearer '+env.CF_ANALYTICS_TOKEN,'Content-Type':'application/json'},
  body:JSON.stringify({query:RUM_QUERY,variables:{account:env.CF_ACCOUNT_ID,
   start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)}})});
 if(!r.ok)throw Error('Cloudflare no responde');
 const body=await r.json();
 if(body.errors?.length)throw Error('Consulta analítica no disponible');
 const list=body.data?.viewer?.accounts?.[0]?.byDay;
 if(!Array.isArray(list))throw Error('Sin datos analíticos');
 const daily=list.map(x=>({date:String(x.dimensions?.date||''),views:Number(x.count||0),
   visits:Number(x.sum?.visits||0)})).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date));
 return {available:true,views:daily.reduce((a,b)=>a+b.views,0),
  visits:daily.reduce((a,b)=>a+b.visits,0),daily};
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'',allowed=String(env.ALLOWED_ORIGIN||'https://kernnel.app').replace(/\/$/,'');
 if(origin&&origin!==allowed)return fail('Origen no permitido',403);
 const cors=origin===allowed?origin:'',url=new URL(request.url);
 if(request.method==='OPTIONS'){
  if(!cors)return fail('Origen no permitido',403);
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':cors,
   'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Max-Age':'300','Vary':'Origin'}});
 }
 if(request.method!=='GET')return fail('Método no permitido',405,cors);
 if(!['/api/status','/api/overview','/api/users'].includes(url.pathname))return fail('No encontrado',404,cors);
 let user;
 try{user=await authorize(request,env)}catch{return fail('Autenticación temporalmente no disponible',503,cors)}
 if(!user)return fail('No autorizado',403,cors);
 if(url.pathname==='/api/status')return respond({ok:true,uid:user.uid},200,cors);
 if(url.pathname==='/api/users'){
  const raw=url.searchParams.get('offset')||'0';
  if(!/^\d{1,7}$/.test(raw)||Number(raw)>1000000)return fail('Página inválida',400,cors);
  try{return respond(await userPage(env,Number(raw)),200,cors)}
  catch{return fail('No se pudo consultar usuarios',503,cors)}
 }
 const days=Number(url.searchParams.get('days')||7);
 if(![7,30].includes(days))return fail('Período inválido',400,cors);
 const [a,b]=await Promise.allSettled([analytics(env,days),registered(env)]);
 return respond({days,createdAt:new Date().toISOString(),
  analytics:a.status==='fulfilled'?a.value:{available:false,reason:'No se pueden leer las visitas de Cloudflare'},
  registered:b.status==='fulfilled'?b.value:{available:false,reason:'No se pueden leer las cuentas de Firebase'}
 },200,cors);
}};
export const testable={authorize,analytics,registered,userPage};
