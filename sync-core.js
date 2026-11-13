/* Reconciliación de tres vías. Sin DOM ni Firebase; también ejecutable en Node. */
(function(root){
'use strict';
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
async function hash(v){if(v==null)return null;const bytes=new TextEncoder().encode(canonical(v));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
const key=(kind,id)=>kind+'~'+encodeURIComponent(id);
function entries(data){const out={};for(const kind of ['temas','repertorios'])for(const v of data[kind]||[])out[key(kind,v.id)]={kind,id:v.id,value:copy(v)};return out;}
async function describe(data){const out=entries(data);await Promise.all(Object.values(out).map(async e=>{e.hash=await hash(e.value)}));return out;}
function action(local,base,remote){
 const lh=local?.hash||null,bh=base?.hash||null,rh=remote?.hash||null;
 if(lh===rh)return 'equal';
 if(lh===bh)return 'pull';
 if((remote?.version||null)===(base?.version||null))return 'push';
 return 'conflict';
}
// No elimina por ausencia en un dispositivo que nunca vio ese elemento.
async function plan(data,heads){const local=await describe(data),base=data._sync?.base||{};return Object.keys({...base,...local,...heads}).sort().map(k=>({key:k,local:local[k],base:base[k],remote:heads[k],action:action(local[k],base[k],heads[k])}));}
function put(data,kind,id,value){const list=data[kind]||[];data[kind]=value?list.some(x=>x.id===id)?list.map(x=>x.id===id?copy(value):x):[...list,copy(value)]:list.filter(x=>x.id!==id);}
function duplicate(value,id,localAt,remoteAt,source){return {...copy(value),id,nombre:value.nombre+' (Duplicada por conflicto)',syncConflict:{source,localModifiedAt:localAt,remoteModifiedAt:remoteAt}};}
// Aplica sólo si el usuario no editó ese elemento durante una petición de red.
function apply(current,captured,changes,base){const out=copy(current),now=entries(current),before=entries(captured);
 for(const c of changes)if(canonical(now[c.key]?.value)===canonical(before[c.key]?.value))put(out,c.kind,c.id,c.value);
 out._sync={...(out._sync||{}),schema:1,base:{...(out._sync?.base||{}),...base}};return out;
}
const api={canonical,copy,hash,key,entries,describe,action,plan,put,duplicate,apply};root.KernnelSyncCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
