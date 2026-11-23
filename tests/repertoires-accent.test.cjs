'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'ui-v2.js'),'utf8');

function harness(){
  const messages=[],events=[];
  const D={temas:[],repertorios:[],papelera:[],sel:null};
  const state={view:'home',homeOpenReps:[],createExpanded:false,pendingReps:[],createReps:[],homeFocusSong:null,rep:'all'};
  let count=0;
  const elements=new Map();
  const context={
    D,ui:state,loadedStorage:true,editCheckpoint:null,window:{scrollTo(){}},
    document:{body:{classList:{toggle(){}}},querySelectorAll(){return []}},
    requestAnimationFrame:f=>f(),
    $:id=>{
      if(!elements.has(id))elements.set(id,{id,textContent:'',hidden:false,open:false,
        classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},
        replaceChildren(){},append(){},addEventListener(){},showModal(){events.push('show '+id)},
        close(){events.push('close '+id)}});
      return elements.get(id);
    },
    current(){return context.D.temas.find(t=>t.id===context.D.sel)||null},
    save(_notify,cb){events.push('save');if(typeof cb==='function')cb(true)},
    renderAll(){events.push('render')},
    initSelection(){events.push('initSelection')},
    stopMetro(){events.push('stop')},
    toast(msg){messages.push(msg)},
    uniqueId(prefix){return prefix+'-test-'+(++count)},
    clone:x=>JSON.parse(JSON.stringify(x)),
    confirm:()=>true,
    saveSongEdits(cb){cb(true)}
  };
  vm.runInNewContext(ui.replace(/initV2\(\);\s*$/,''),context,{filename:'ui-v2.js'});
  return {context,messages,events,elements};
}

test('creación independiente de repertorio y rechazo de duplicados',()=>{
  const {context}=harness();
  assert.equal(context.createRepertoireV2('  Ensayo  '),true);
  assert.equal(context.D.repertorios[0].nombre,'Ensayo');
  assert.equal(context.createRepertoireV2('ensayo'),false);
  assert.equal(context.D.repertorios.length,1);
  assert.equal(context.ui.homeOpenReps[0],context.D.repertorios[0].id);
});

test('eliminar canción afecta todos los repertorios, conserva copia y referencias para recuperar',()=>{
  const {context}=harness();
  context.D.temas=[{id:'t1',nombre:'Prueba',notas:['A'],estudio:{meter:'4/4',bpm:90}}];
  context.D.sel='t1';
  context.D.repertorios=[{id:'r1',nombre:'Grupo A',songs:['t1']},{id:'r2',nombre:'Grupo B',songs:['t1']}];
  context.deleteSongByIdV2('t1');
  assert.equal(context.D.temas.length,0);
  assert.ok(context.D.repertorios.every(r=>r.songs.length===0));
  assert.equal(context.D.papelera[0].value.nombre,'Prueba');
  assert.deepEqual(Array.from(context.D.papelera[0].repertoireIds),['r1','r2']);
});

test('antes de salir de Edición se ofrecen guardar o cancelar',()=>{
  const {context,events}=harness();
  context.ui.view='edit';
  context.D.temas=[{id:'a',nombre:'Original',notas:['C'] }];context.D.sel='a';
  context.editCheckpoint={song:{id:'a',nombre:'Original',notas:['C']},deletedMeasures:new Set(),saving:false};
  let advanced=false;
  context.confirmLeaveEditV2(()=>{advanced=true});
  assert.equal(advanced,false);
  assert.ok(events.includes('show leave-edit-dialog'));
  context.saveAndLeaveEditV2();
  assert.equal(advanced,true);
  assert.ok(events.includes('close leave-edit-dialog'));
});

test('salir sin guardar restaura el último punto de retorno',()=>{
  const {context}=harness();
  context.ui.view='edit';
  context.D.temas=[{id:'a',nombre:'Modificada',notas:['C'] }];context.D.sel='a';
  context.editCheckpoint={song:{id:'a',nombre:'Original',notas:['A']},deletedMeasures:new Set(),saving:false};
  let advanced=false;
  context.confirmLeaveEditV2(()=>{advanced=true});
  context.discardAndLeaveEditV2();
  assert.equal(advanced,true);
  assert.equal(context.D.temas[0].nombre,'Original');
});

test('configuración de acentos mantiene compatibilidad con canciones previas',()=>{
  const script=html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
  assert.ok(script);
  const {setting}=new Function('window','document','localStorage','indexedDB',script[1]+'\nreturn {setting};')({}, {}, {}, {});
  const original={notas:[''],estudio:{meter:'4/4',bpm:120}};
  assert.deepEqual(Array.from(setting(original).accents),[1]);
  const custom={notas:[''],estudio:{meter:'6/8',bpm:120,accents:[1,4,4,7,-2]}};
  assert.deepEqual(Array.from(setting(custom).accents),[1,4]);
  const silent={notas:[''],estudio:{meter:'4/4',bpm:120,accents:[]}};
  assert.deepEqual(Array.from(setting(silent).accents),[]);
  assert.match(script[1],/clickAudio\(at,x\.accents\.includes\(beat\+1\),x\)/);
});

test('vistas y diálogo de repertorios tienen sus identificadores en el documento',()=>{
  for(const id of ['home-create-repertoire','home-repertoire-name','nav-repertoires','repertoire-picker','repertoire-picker-list','leave-edit-dialog','leave-edit-save','leave-edit-discard','leave-edit-cancel']){
    assert.ok(html.includes('id="'+id+'"'),id+' no aparece');
  }
});

test('restaurar una canción de papelera recupera sus repertorios originales',()=>{
  const script=html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/);
  assert.ok(script);
  const runtime=new Function('window','document','localStorage','indexedDB',script[1]+[
    'save=()=>{}; initSelection=()=>{}; renderAll=()=>{}; toast=()=>{};',
    'return {restoreTrash,setData:data=>D=data};'
  ].join('\n'))({}, {}, {}, {});
  const item={id:'trash-demo',type:'song',value:{id:'s1',nombre:'Mi tema',notas:['Intro'],estudio:{meter:'4/4',bpm:100}},repertoireIds:['r1','r2']};
  const data={temas:[],sel:null,papelera:[item],repertorios:[
    {id:'r1',nombre:'Ensayo',songs:[]},{id:'r2',nombre:'Show',songs:[]}
  ]};
  runtime.setData(data);
  runtime.restoreTrash(item);
  assert.equal(data.temas.length,1);
  assert.equal(data.papelera.length,0);
  assert.deepEqual(data.repertorios.map(r=>r.songs),[['s1'],['s1']]);
});
