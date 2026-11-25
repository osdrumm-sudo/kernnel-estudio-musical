/* Pure Free policy. Account persistence and trusted plan enforcement belong to the integration layer. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MetriqaFreePolicy=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const FREE=Object.freeze({repertories:2,songsPerRepertoire:4,annotation:50});
  const BONUS=Object.freeze({repertories:3,songsPerRepertoire:5,annotation:55});
  const kinds=Object.keys(FREE);
  const counted=/[\p{L}\p{N}]/u;
  function count(text){
    return Array.from(String(text??'').normalize('NFC')).filter(c=>counted.test(c)).length;
  }
  function truncate(text,limit){
    if(!Number.isSafeInteger(limit)||limit<0)throw new RangeError('Invalid limit');
    let n=0,out='';
    for(const c of String(text??'').normalize('NFC')){
      if(counted.test(c)&&++n>limit)break;
      out+=c;
    }
    return out;
  }
  function limits(activated){return activated===true?BONUS:FREE;}
  // A historical annotation is never silently truncated. Explicit shortening is allowed.
  function annotationEdit(previous,next,activated){
    const limit=limits(activated).annotation, old=String(previous??''), draft=String(next??'');
    if(draft===old||count(draft)<=limit)return {allowed:true,text:draft};
    if(count(old)>limit){
      if(count(draft)<count(old))return {allowed:true,text:draft};
      return {allowed:false,text:old};
    }
    return {allowed:false,text:truncate(draft,limit)};
  }
  // Existing over-quota collections remain readable; only additional capacity is restricted.
  function canAdd(kind,current,activated){
    if(!['repertories','songsPerRepertoire'].includes(kind)||!Number.isSafeInteger(current)||current<0)return false;
    return current<limits(activated)[kind];
  }
  // Occurrence IDs must identify separate attempts, not repeated keypresses. Caller scopes state by UID.
  function state(raw){
    const events=Array.isArray(raw?.events)?[...new Set(raw.events.filter(x=>typeof x==='string'&&x.length>0&&x.length<=200))].slice(0,3):[];
    return {events,activated:raw?.activated===true};
  }
  function encounter(raw,kind,occurrenceId){
    const s=state(raw);
    if(s.activated||s.events.length>=3||!kinds.includes(kind)||typeof occurrenceId!=='string'||!occurrenceId.trim()||occurrenceId.length>190)return s;
    const id=kind+':'+occurrenceId;
    if(!s.events.includes(id))s.events.push(id);
    return s;
  }
  function offer(raw){const s=state(raw);return !s.activated&&s.events.length>=3;}
  function activate(raw){
    const s=state(raw);
    return offer(s)?{...s,activated:true}:s;
  }
  return Object.freeze({FREE,BONUS,count,truncate,limits,annotationEdit,canAdd,state,encounter,offer,activate});
});
