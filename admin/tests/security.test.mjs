import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {testable} from '../worker/src/index.js';

const env = () => ({
  ALLOWED_ORIGIN:'https://kernnel.app',
  FIREBASE_PROJECT_ID:'kernnel-studio',
  FIREBASE_API_KEY:'PUBLIC_TEST_ONLY',
  ADMIN_UIDS:'uid-admin-1'
});
const token = (overrides={})=>{
  const b=JSON.stringify({
    sub:'uid-admin-1',aud:'kernnel-studio',iss:'https://securetoken.google.com/kernnel-studio',
    exp:Math.floor(Date.now()/1000)+1800,...overrides
  });
  return 'fakeheader.'+Buffer.from(b).toString('base64url')+'.signature';
};
const req = (path,options={})=>new Request('https://worker.example'+path,{
  method:options.method||'GET',
  headers:{
    Origin:options.origin===undefined?'https://kernnel.app':options.origin,
    ...(options.token?{Authorization:'Bearer '+options.token}:{})
  }
});
const originalFetch=globalThis.fetch;
const lookupUser=(uid='uid-admin-1')=>async (input)=>{
  if(String(input).includes('accounts:lookup'))return Response.json({users:[{localId:uid,email:'demo@example.com'}]});
  throw Error('Petición externa no prevista');
};
test.afterEach(()=>{globalThis.fetch=originalFetch});

test('sin token la API no expone información',async ()=>{
  globalThis.fetch=async()=>{throw Error('No debe consultar proveedores')};
  const r=await worker.fetch(req('/api/users'),env());
  assert.equal(r.status,403);
  assert.equal(r.headers.get('Cache-Control'),'no-store, private');
});

test('origen externo denegado, incluso con token',async ()=>{
  globalThis.fetch=async()=>{throw Error('No debe consultar')};
  const r=await worker.fetch(req('/api/status',{origin:'https://urgnet.example',token:token()}),env());
  assert.equal(r.status,403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
});

test('token de otro proyecto no es aceptado',async ()=>{
  globalThis.fetch=async()=>{throw Error('No debe consultar')};
  const r=await worker.fetch(req('/api/status',{token:token({aud:'otro-proyecto'})}),env());
  assert.equal(r.status,403);
});

test('una cuenta Firebase normal no obtiene permisos admin',async ()=>{
  globalThis.fetch=lookupUser('uid-otro');
  const r=await worker.fetch(req('/api/status',{token:token()}),env());
  assert.equal(r.status,403);
});

test('si ADMIN_UIDS no está definido, acceso cerrado incluso con cuenta válida',async ()=>{
  globalThis.fetch=async()=>{throw Error('No debe consultar')};
  const e=env();delete e.ADMIN_UIDS;
  assert.equal((await worker.fetch(req('/api/status',{token:token()}),e)).status,403);
});

test('cuenta autorizada puede consultar status, con CORS restringido',async ()=>{
  globalThis.fetch=lookupUser();
  const r=await worker.fetch(req('/api/status',{token:token()}),env());
  assert.equal(r.status,200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://kernnel.app');
  assert.deepEqual(await r.json(),{ok:true,uid:'uid-admin-1'});
});

test('preflight solo admite el origen de la app',async ()=>{
  const r=await worker.fetch(req('/api/status',{method:'OPTIONS'}),env());
  assert.equal(r.status,204);
  assert.match(r.headers.get('Access-Control-Allow-Headers'),/Authorization/);
});

test('sin credenciales de estadísticas no inventa valores',async ()=>{
  globalThis.fetch=lookupUser();
  const r=await worker.fetch(req('/api/overview?days=7',{token:token()}),env());
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.analytics.available,false);
  assert.equal(body.registered.available,false);
  assert.ok(!('count' in body.registered));
});

test('no se admite un intervalo no permitido',async ()=>{
  globalThis.fetch=lookupUser();
  const r=await worker.fetch(req('/api/overview?days=365',{token:token()}),env());
  assert.equal(r.status,400);
});

test('Cloudflare Web Analytics devuelve visitas por día sin datos identificables',async ()=>{
  globalThis.fetch=async url=>{
    assert.equal(String(url),'https://api.cloudflare.com/client/v4/graphql');
    return Response.json({data:{viewer:{accounts:[{byDay:[
      {count:10,sum:{visits:7},dimensions:{date:'2026-11-08'}},
      {count:13,sum:{visits:9},dimensions:{date:'2026-11-09'}}
    ]}]}}});
  };
  const x=await testable.analytics({...env(),CF_ACCOUNT_ID:'account-test',CF_ANALYTICS_TOKEN:'cf-token-test'},7);
  assert.equal(x.available,true);
  assert.equal(x.views,23);
  assert.equal(x.visits,16);
  assert.equal(x.daily.length,2);
  assert.equal(JSON.stringify(x).includes('email'),false);
});

test('API no permite métodos de modificación',async ()=>{
  const r=await worker.fetch(req('/api/status',{method:'POST'}),env());
  assert.equal(r.status,405);
});
