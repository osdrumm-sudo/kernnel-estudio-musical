'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const Engine=require('../sync-engine.js');
const {SessionGuard,verifyPlan,deviceId}=require('../session-guard.js');
function fake(){
 const docs=new Map();
 let chain=Promise.resolve();
 const sdk={doc:(_db,...path)=>path.join('/'),serverTimestamp:()=>1,
 runTransaction:(_db,fn)=>{
  const next=chain.then(async()=>{
   const ops=[];
   const result=await fn({get:async key=>({exists:()=>docs.has(key),data:()=>docs.get(key)}),set:(key,value)=>ops.push(()=>docs.set(key,value)),delete:key=>ops.push(()=>docs.delete(key))});
   for(const op of ops)op();return result;
  });
  chain=next.catch(()=>{});return next;
 }};
 return {docs,guard:(uid,device,valid=()=>true)=>new SessionGuard({sdk,db:{},uid,device,valid})};
}
test('same account cannot acquire concurrently from two devices',async()=>{
 const f=fake(),a=f.guard('uid','device-a'),b=f.guard('uid','device-b');
 const result=await Promise.allSettled([a.acquire(),b.acquire()]);
 assert.equal(result[0].status,'fulfilled');
 assert.equal(result[1].reason.code,'session/conflict');
 await a.acquire();await b.release();
 await assert.rejects(()=>b.acquire(),{code:'session/conflict'});
 await a.release();await b.acquire();
});
test('different accounts do not share reservation',async()=>{
 const f=fake();await Promise.all([f.guard('a','device-a').acquire(),f.guard('b','device-b').acquire()]);
 assert.equal(f.docs.size,2);
});
test('transaction must verify current reservation and active account',async()=>{
 const f=fake(),a=f.guard('uid','a');await a.acquire();
 await a.sdk.runTransaction({},tx=>a.assert(tx));
 await a.release();await assert.rejects(()=>a.sdk.runTransaction({},tx=>a.assert(tx)),{code:'session/conflict'});
 let active=false;const b=f.guard('uid','b',()=>active);await assert.rejects(()=>b.acquire());active=true;await b.acquire();
});
test('persistent device identity and fail closed on unavailable storage',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(deviceId(storage,()=> 'a'),'a');assert.equal(deviceId(storage,()=> 'b'),'a');
 assert.throws(()=>deviceId({getItem:()=>null,setItem:()=>{}},()=> 'c'));
});
test('preflight blocks same song conflict and independent additions',()=>{
 assert.throws(()=>verifyPlan([{action:'conflict'}]),{code:'session/conflict'});
 assert.throws(()=>verifyPlan([{action:'push'},{action:'pull'}]),{code:'session/conflict'});
 assert.doesNotThrow(()=>verifyPlan([{action:'equal'},{action:'pull'}]));
 assert.doesNotThrow(()=>verifyPlan([{action:'equal'},{action:'push'}]));
});
test('offline engine retains local work and performs zero remote calls',async()=>{
 const data={temas:[{id:'a',nombre:'Local'}],repertorios:[]};let calls=0;
 const engine=new Engine({bridge:{snapshot:()=>C.copy(data)},store:{guard:{acquire:async()=>calls++},list:async()=>{calls++;return {}}},status:()=>{},online:()=>false});
 assert.equal(await engine.flush(),false);assert.equal(calls,0);assert.equal(data.temas[0].nombre,'Local');
});
test('reconnection with divergent library performs no remote writes and retains local draft',async()=>{
 const remote={version:'b',kind:'temas',id:'remote',hash:await C.hash({id:'remote',nombre:'Otro'}),modifiedAt:2};
 const data={temas:[{id:'local',nombre:'Mi borrador'}],repertorios:[],_sync:{base:{},legacyChecked:true}};
 let writes=0,applies=0;const statuses=[];
 const engine=new Engine({bridge:{snapshot:()=>C.copy(data),applySync:()=>applies++},store:{guard:{acquire:async()=>{}},list:async()=>({'temas~remote':remote}),write:async()=>writes++},status:(...s)=>statuses.push(s),online:()=>true});
 assert.equal(await engine.flush(),false);assert.equal(writes,0);assert.equal(applies,0);assert.equal(data.temas[0].nombre,'Mi borrador');assert.equal(statuses.at(-1)[1].code,'session/conflict');assert.equal(engine.timer,null);
});
