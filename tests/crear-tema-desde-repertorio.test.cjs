'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ui-v2.js'),'utf8').replace(/initV2\(\);\s*$/,'');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-v2.css'),'utf8');

function harness({saved=true,loaded=true}={}){
  const elements=new Map(),messages=[],events=[];
  const state={view:'home',study:false,homeOpenReps:['r1'],createExpanded:false,
    createReps:[],pendingReps:[],createFromRep:null,creatingSong:false,
    homeFocusSong:null,originRep:null,rep:'all',query:''};
  const D={repertorios:[{id:'r1',nombre:'Ensayo',songs:[]},{id:'r2',nombre:'Concierto',songs:[]}],
    temas:[],papelera:[],sel:null};
  let counter=0;
  function node(tag='div',props={},children=[]){
    const listeners={};
    const e={tag,children:[],listeners,attributes:{},dataset:{},classList:{add(){},remove(){},toggle(){}},
      textContent:props.text||'',value:props.value??'',checked:!!props.checked,
      disabled:!!props.disabled,hidden:!!props.hidden,open:false,
      className:props.class||'',
      setAttribute(k,v){this.attributes[k]=String(v)},
      removeAttribute(k){delete this.attributes[k]},
      append(...items){this.children.push(...items)},
      appendChild(item){this.children.push(item);return item},
      replaceChildren(...items){this.children=[...items]},
      addEventListener(k,fn){listeners[k]=fn},
      focus(){events.push('focus '+(this.id||tag))},
      scrollIntoView(){events.push('scroll '+(this.id||tag))},
      click(){listeners.click?.({preventDefault(){}})},
      showModal(){events.push('modal')},
      close(){events.push('close')},
    };
    if(props['data-repertoire-id'])e.dataset.repertoireId=props['data-repertoire-id'];
    if(props['aria-label'])e.attributes['aria-label']=props['aria-label'];
    if(props.id)e.id=props.id;
    e.append(...children);
    return e;
  }
  const $=id=>{
    if(!elements.has(id)){const x=node('div');x.id=id;elements.set(id,x)}
    return elements.get(id);
  };
  const context={D,ui:state,loadedStorage:loaded,clock:{tickRange:null},
    window:{scrollTo(){}},METERS:['4/4','3/4','6/8'],requestAnimationFrame:fn=>fn(),
    document:{body:{classList:{toggle(){}}},querySelectorAll(selector){
      if(selector==='.home-rep-card')return $('home-repertories').children;
      return [];
    }},
    $,mk:node,
    button:(label,handler,cls,props={})=>{
      const b=node('button',{...props,class:cls,text:label});
      b.addEventListener('click',handler);
      return b;
    },
    info:text=>node('p',{text}),toast:msg=>messages.push(msg),
    current(){return D.temas.find(x=>x.id===D.sel)||null},
    save(_notify,cb){events.push('save');cb?.(saved)},
    renderAll(){context.renderHomeV2();context.renderCreateChoicesV2()},
    applyPrefs(){},stopMetro(){},initSelection(){},manageWake(){},
    newSong(name,count,meter){return {id:'song-'+(++counter),nombre:name,notas:Array(count).fill(''),estudio:{meter}}},
    uniqueId(prefix){return prefix+(++counter)},
    confirm(){return true}
  };
  $('song-new-count').value='8';$('song-new-meter').value='4/4';
  vm.runInNewContext(source,context,{filename:'ui-v2.js'});
  return {D,ui:state,$,context,events,messages};
}
function all(node){return [node,...node.children.flatMap(x=>all(x))]}
function createButton(container){return all(container).find(x=>x.className?.includes('home-rep-create-song'))}
function submit(context){context.onCreateSongV2({preventDefault(){}})}

test('el Inicio muestra Crear tema solo dentro de un repertorio real desplegado',()=>{
  const h=harness();
  h.context.renderHomeV2();
  const [r1,r2,unassigned]=h.$('home-repertories').children;
  assert.equal(r1.dataset.repertoireId,'r1');
  assert.equal(createButton(r1).textContent,'＋ Crear tema');
  assert.match(createButton(r1).attributes['aria-label'],/Ensayo/);
  assert.equal(createButton(r2),undefined);
  assert.equal(createButton(unassigned),undefined);
  h.ui.homeOpenReps=['r2','__sin_repertorio__'];
  h.context.renderHomeV2();
  const [closed,open,orphans]=h.$('home-repertories').children;
  assert.equal(createButton(closed),undefined);
  assert.ok(createButton(open));
  assert.equal(createButton(orphans),undefined,'sin repertorio no es un destino real');
});

test('Crear tema abre el formulario EXISTENTE, preselecciona el repertorio y no guarda todavía',()=>{
  const h=harness();
  h.context.renderHomeV2();
  createButton(h.$('home-repertories').children[0]).click();
  assert.equal(h.$('home-create').open,true);
  assert.equal(h.ui.createExpanded,true);
  assert.equal(h.ui.createFromRep,'r1');
  assert.equal(h.ui.createReps.join(','),'r1');
  assert.equal(h.$('new-song-submit').textContent,'＋ Crear tema y volver al repertorio');
  const choices=all(h.$('new-song-repertoires'));
  const destination=choices.find(x=>x.tag==='input'&&x.value==='r1');
  const other=choices.find(x=>x.tag==='input'&&x.value==='r2');
  assert.equal(destination.checked,true);
  assert.equal(destination.disabled,true);
  assert.equal(other.disabled,false);
  assert.equal(h.D.temas.length,0);
  assert.equal(h.events.filter(e=>e==='save').length,0);
});

test('Guardar desde tarjeta vuelve a Inicio, conserva la tarjeta abierta y muestra el tema',()=>{
  const h=harness();
  h.context.openCreateSongFromRepertoireV2('r1');
  h.$('song-new-title').value='Mi tema nuevo';
  h.ui.createReps=[]; // ni siquiera un cambio accidental del estado puede quitar el destino
  submit(h.context);
  assert.equal(h.D.temas.length,1);
  assert.equal(h.D.temas[0].nombre,'Mi tema nuevo');
  assert.equal(h.D.repertorios[0].songs[0],h.D.temas[0].id);
  assert.equal(h.ui.view,'home');
  assert.equal(h.ui.homeOpenReps.join(','),'r1');
  assert.equal(h.ui.homeFocusSong,h.D.temas[0].id);
  assert.equal(h.$('home-create').open,false);
  assert.ok(h.events.includes('save'));
  const card=h.$('home-repertories').children[0];
  const labels=all(card).map(n=>n.textContent);
  assert.ok(labels.includes('Mi tema nuevo'),'nuevo tema visible en el repertorio');
});

test('Desde la tarjeta es posible añadir también otro repertorio sin perder el de origen',()=>{
  const h=harness();
  h.context.openCreateSongFromRepertoireV2('r1');
  h.$('song-new-title').value='Tema compartido';
  h.ui.createReps.push('r2');
  submit(h.context);
  const id=h.D.temas[0].id;
  assert.ok(h.D.repertorios[0].songs.includes(id));
  assert.ok(h.D.repertorios[1].songs.includes(id));
  assert.equal(h.ui.originRep,'r1');
});

test('Crear canción desde el formulario general conserva el flujo previo hacia Edición',()=>{
  const h=harness();
  h.ui.createReps=['r2'];
  h.$('song-new-title').value='Tema normal';
  submit(h.context);
  assert.equal(h.ui.view,'edit');
  assert.ok(h.D.repertorios[1].songs.includes(h.D.temas[0].id));
  assert.equal(h.$('new-song-submit').textContent,'＋ Crear canción y abrir edición');
});

test('Si falla el guardado local desde una tarjeta, el formulario sigue abierto y no duplica canciones',()=>{
  const h=harness({saved:false});
  h.context.openCreateSongFromRepertoireV2('r1');
  h.$('song-new-title').value='Temporal';
  submit(h.context);
  assert.equal(h.ui.view,'home');
  assert.equal(h.$('home-create').open,true);
  assert.equal(h.ui.createFromRep,'r1');
  assert.equal(h.ui.creatingSong,false);
  assert.equal(h.$('new-song-submit').disabled,false);
  assert.equal(h.D.temas.length,0);
  assert.equal(h.D.repertorios[0].songs.length,0);
  assert.ok(h.messages.some(x=>x.includes('No se pudo guardar')));
});

test('El destino inexistente no abre el formulario ni permite crear la canción',()=>{
  const h=harness();
  h.context.openCreateSongFromRepertoireV2('eliminado');
  assert.equal(h.$('home-create').open,false);
  h.ui.createFromRep='eliminado';
  h.$('song-new-title').value='No crear';
  submit(h.context);
  assert.equal(h.D.temas.length,0);
  assert.equal(h.events.filter(e=>e==='save').length,0);
});

test('El formulario de Inicio es único y el estilo del botón admite dispositivos táctiles',()=>{
  assert.equal((html.match(/id="create-song"/g)||[]).length,1);
  assert.equal((html.match(/id="new-song-submit"/g)||[]).length,1);
  assert.match(css,/\.home-rep-create-song\{[^}]*min-height:44px/);
});
