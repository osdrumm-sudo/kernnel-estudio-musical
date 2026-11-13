/* Motor incremental. El adaptador garantiza compare-and-swap y versiones inmutables. */
(function(root){
'use strict';
const C=root.KernnelSyncCore;
class SyncEngine{
 constructor({bridge,store,status,online=()=>navigator.onLine,valid=()=>true}){Object.assign(this,{bridge,store,status,online,valid});this.pending=true;this.closed=false;this.running=null;this.timer=null;this.retry=0;this.localTimes={...(bridge.snapshot()._sync?.times||{})};this.lastValues=C.entries(bridge.snapshot());}
 alive(){return !this.closed&&this.valid();}
 stop(){this.closed=true;clearTimeout(this.timer);}
 changed(){if(!this.alive())return;const current=C.entries(this.bridge.snapshot());for(const k of Object.keys({...this.lastValues,...current}))if(C.canonical(current[k]?.value)!==C.canonical(this.lastValues[k]?.value))this.localTimes[k]=Date.now();this.lastValues=current;this.bridge.syncTimes?.(this.localTimes);this.pending=true;this.status('pending');this.schedule(1500);}
 schedule(delay=1500){clearTimeout(this.timer);if(this.alive())this.timer=setTimeout(()=>this.flush(),delay);}
 flush(){if(!this.alive())return Promise.resolve(false);if(this.running)return this.running;if(!this.online()){return C.plan(this.bridge.snapshot(),this.bridge.snapshot()._sync?.base||{}).then(rows=>{this.pending=rows.some(r=>r.action==='push'||r.action==='conflict');this.status(this.pending?'offline':'offline-clean');return !this.pending;});}clearTimeout(this.timer);this.running=this.run().catch(e=>{if(this.alive()){this.pending=true;this.status('error',e);this.schedule(Math.min(60000,3000*2**Math.min(this.retry++,4)));}return false;}).finally(()=>{this.running=null;});return this.running;}
 async run(){
  this.status('saving');
  let heads=await this.store.list();if(!this.alive())return false;
  // Migración de la copia manual sólo cuando aún no hay biblioteca incremental.
  if(!Object.keys(heads).length&&!this.bridge.snapshot()._sync?.legacyChecked){
   const legacy=await this.store.legacy();if(!this.alive())return false;
   const data=this.bridge.snapshot();
   if(legacy){const existing=C.entries(data);for(const [k,e] of Object.entries(C.entries(legacy))){if(!existing[k])C.put(data,e.kind,e.id,e.value);else if(C.canonical(existing[k].value)!==C.canonical(e.value)){const id='migration-'+this.store.id();C.put(data,e.kind,id,C.duplicate(e.value,id,legacy.updatedAt||Date.now(),data.updatedAt||Date.now(),e.id));}}}
   data._sync={...(data._sync||{}),legacyChecked:true};this.bridge.applySync(data);
  }
  const captured=this.bridge.snapshot(),plan=await C.plan(captured,heads),changes=[],base={};
  const remember=(k,h)=>{if(h)base[k]={version:h.version,hash:h.hash,kind:h.kind,id:h.id,modifiedAt:h.modifiedAt};};
  let conflicts=0;
  for(const row of plan){
   if(!this.alive())return false;
   const {key:k,local,remote}=row,kind=local?.kind||remote?.kind||row.base.kind,id=local?.id||remote?.id||row.base.id;
   if(row.action==='equal'){remember(k,remote);continue;}
   if(row.action==='push'){
    const h=await this.store.write({key:k,kind,id,value:local?.value||null,hash:local?.hash||null,expected:remote?.version||null,modifiedAt:this.localTimes[k]||captured.updatedAt||Date.now()});
    remember(k,h);
   }else{
    if(row.action==='conflict'){
     if(local){
      // ID estable: reintentos tras cierre de pestaña no multiplican el duplicado.
      const dupId='conflict-'+(await C.hash({k,hash:local.hash,remote:remote?.version||null})).slice(0,32),dk=C.key(kind,dupId);
      const value=C.duplicate(local.value,dupId,this.localTimes[k]||captured.updatedAt||Date.now(),remote?.modifiedAt||0,id);
      const dh=await this.store.ensure({key:dk,kind,id:dupId,value,hash:await C.hash(value),modifiedAt:value.syncConflict.localModifiedAt});remember(dk,dh);
      // La copia conserva también cambios que llegaron mientras se transmitía.
      const duplicateValue=await this.store.read(dh);if(!this.alive())return false;const fresh=this.bridge.snapshot();if(!C.entries(fresh)[dk]){C.put(fresh,kind,dupId,duplicateValue);this.bridge.applySync(fresh);}
     }
     conflicts++;
    }
    const value=remote?.hash?await this.store.read(remote):null;
    if(!this.alive())return false;changes.push({key:k,kind,id,value});remember(k,remote);
   }
  }
  if(!this.alive())return false;
  const next=C.apply(this.bridge.snapshot(),captured,changes,base);this.bridge.applySync(next);this.lastValues=C.entries(next);
  // Si hubo edición durante el envío, conserva esa edición como pendiente.
  const remaining=await C.plan(this.bridge.snapshot(),{...heads,...Object.fromEntries(Object.entries(base).map(([k,v])=>[k,v]))});
  this.pending=remaining.some(r=>r.action==='push'||r.action==='conflict');this.retry=0;
  this.status(this.pending?'pending':'saved',conflicts?{conflicts}:null);
  if(this.pending)this.schedule();return !this.pending;
 }
}
root.KernnelSyncEngine=SyncEngine;if(typeof module!=='undefined')module.exports=SyncEngine;
})(globalThis);
