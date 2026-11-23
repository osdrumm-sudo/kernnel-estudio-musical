'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=file('index.html'),css=file('metriqa-amber.css'),js=file('metriqa-amber.js');

class FakeElement{
  constructor(tag='div'){
    this.tagName=tag;this.children=[];this._text='';this.firstChild=null;
    this.listeners={};this.attributes={};this.dataset={};this.value='';
    this.className='';this.hidden=false;this.open=false;this.src='';
    this.style={setProperty:(k,v)=>{this[k]=v}};
    const classes=new Set();
    this.classList={
      contains:name=>classes.has(name),
      add:name=>classes.add(name),
      remove:name=>classes.delete(name),
      toggle:(name,force)=>{const active=force===undefined?!classes.has(name):!!force;active?classes.add(name):classes.delete(name);return active}
    };
  }
  get textContent(){return this._text}
  set textContent(value){this._text=String(value);this.children=[];this.firstChild={textContent:this._text}}
  setAttribute(key,value){this.attributes[key]=String(value)}
  removeAttribute(key){delete this.attributes[key]}
  append(...children){for(const child of children){this.children.push(child);if(!this.firstChild)this.firstChild=child}}
  replaceChildren(...children){this.children=[];this.firstChild=null;this._text='';this.append(...children)}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback)}
  click(){for(const f of this.listeners.click||[])f({target:this})}
  fire(type,value){for(const f of this.listeners[type]||[])f({target:{value}})}
  showModal(){this.open=true}
  close(){this.open=false;for(const f of this.listeners.close||[])f()}
  scrollIntoView(){}
}
function harness(){
  const ids=['mq-style-toggle','mq-song-name','mq-song-details','mq-song-select','mq-section-name','mq-section-range','mq-meter','mq-section-buttons','mq-measure-strip','mq-attachments','mq-note-list','mq-measure-num','mq-measure-total','mq-beat-number','mq-position-label','mq-seek','mq-pulse-dots','mq-show-score','mq-image-dialog','mq-image-full','mq-image-title','mq-image-close','mq-add-note','mq-open-settings','nav-edit','sidebar','mobile-menu','menu-metronome','study-settings-button','accessibility-dialog'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new FakeElement()]));
  const tabs=['comments','notes'].map(tab=>{const el=new FakeElement('button');el.dataset.tab=tab;return el});
  const rails=['[data-rail-edit]','[data-rail-study]','[data-rail-settings]'].map(key=>[key,new FakeElement('button')]);
  const score=new FakeElement('section');
  const document={
    documentElement:{dataset:{}},
    body:new FakeElement('body'),
    getElementById:id=>nodes[id]??null,
    createElement:tag=>new FakeElement(tag),
    querySelector:selector=>selector==='.scorebox'?score:Object.fromEntries(rails)[selector]??null,
    querySelectorAll:selector=>selector==='.mq-tab'?tabs:selector==='.mq-measure-card'?nodes['mq-measure-strip'].children:[]
  };
  const state={ui:{view:'study',studyMenu:false,mobileMenu:false},clock:{visualMeasure:null,visualBeat:0,playStart:1}};
  const song={id:'one',nombre:'Tema de prueba',notas:['Entrada','', 'Crescendo','Final'],
   secciones:[{id:'intro',nombre:'Intro',desde:1,hasta:2},{id:'coro',nombre:'Coro',desde:3,hasta:4}],
   tiempos:[[{txt:'Atacar suave',img:'data:image/png;base64,QUJD'}],[],[{txt:'Acentuar el 3'}],[]],
   estudio:{meter:'4/4',practiceBpm:112,accents:[1,3]}};
  const data={temas:[song],sel:'one'};
  const window={};
  const local=new Map(),chosen=[];
  const context={document,window,localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)},requestAnimationFrame:fn=>fn(),
    D:data,ui:state.ui,clock:state.clock,current:()=>data.temas.find(t=>t.id===data.sel),
    setting:t=>t.estudio,beatsPerMeasure:x=>Number(x.meter.split('/')[0]),
    goToMeasure:n=>{state.clock.visualMeasure=n;window.updateStudioAmber?.()},chooseSongV2:(id,view)=>chosen.push({id,view})};
  vm.runInNewContext(js,context,{filename:'metriqa-amber.js'});
  return {nodes,tabs,context,window,state,document,song,local,chosen};
}

test('vista alternativa conserva acceso a diseño clásico y CSS válido',()=>{
  assert.match(html,/id="mq-style-toggle"/);
  assert.match(html,/id="mq-studio"/);
  assert.match(html,/metriqa-amber\.css/);
  assert.match(html,/metriqa-amber\.js/);
  assert.match(css,/:root\[data-metriqa-palette="amber"\]/);
  assert.match(css,/data-contrast="true"/);
  assert.match(file('sw.js'),/metriqa-amber\.(css|js)/);
});
test('renderiza estructura, canción, compases y posición reales',()=>{
  const h=harness();
  assert.equal(h.nodes['mq-song-name'].textContent,'Tema de prueba');
  assert.equal(h.nodes['mq-song-select'].children.length,1);
  assert.equal(h.nodes['mq-section-buttons'].children.length,2);
  assert.equal(h.nodes['mq-measure-strip'].children.length,4);
  assert.equal(h.nodes['mq-seek'].max,'4');
  assert.equal(h.nodes['mq-measure-num'].textContent,'1');
  assert.equal(h.nodes['mq-attachments'].children.length,1);
});
test('navegar a una sección cambia compás, sección y contenido',()=>{
  const h=harness();
  h.nodes['mq-section-buttons'].children[1].click();
  assert.equal(h.nodes['mq-measure-num'].textContent,'3');
  assert.equal(h.nodes['mq-section-name'].textContent,'Coro');
  assert.equal(h.nodes['mq-note-list'].children.length,2);
  assert.equal(h.nodes['mq-note-list'].children[0].children[1].textContent,'Acentuar el 3');
  assert.equal(h.nodes['mq-note-list'].children[1].children[1].textContent,'Crescendo');
});
test('seguimiento visual identifica pulsos y acentos configurados',()=>{
  const h=harness();
  assert.equal(h.nodes['mq-pulse-dots'].children.length,4);
  assert.equal(h.nodes['mq-pulse-dots'].children[0].classList.contains('is-accent'),true);
  assert.equal(h.nodes['mq-pulse-dots'].children[2].classList.contains('is-accent'),true);
  h.state.clock.visualBeat=2;h.window.updateStudioAmber();
  assert.equal(h.nodes['mq-pulse-dots'].children[2].classList.contains('is-now'),true);
});
test('permite ampliar los recursos de partitura reales',()=>{
  const h=harness();h.nodes['mq-attachments'].children[0].click();
  assert.equal(h.nodes['mq-image-dialog'].open,true);
  assert.equal(h.nodes['mq-image-full'].src,'data:image/png;base64,QUJD');
});
test('cambia entre paletas sin mutar canciones',()=>{
  const h=harness();const songName=h.song.nombre;
  assert.equal(h.window.MetriqaPalette.enabled(),true);
  h.nodes['mq-style-toggle'].click();
  assert.equal(h.window.MetriqaPalette.enabled(),false);
  assert.equal(h.document.documentElement.dataset.metriqaPalette,'classic');
  h.nodes['mq-style-toggle'].click();
  assert.equal(h.window.MetriqaPalette.enabled(),true);
  assert.equal(h.song.nombre,songName);
});
test('ajustes del metrónomo son alcanzables desde la nueva vista',()=>{
  const h=harness();
  let opened=0;
  h.nodes['study-settings-button'].click=()=>{h.state.ui.studyMenu=true;opened++};
  h.nodes['mq-open-settings'].click();
  assert.equal(opened,1);
  assert.equal(h.nodes['menu-metronome'].open,true);
  assert.equal(h.state.ui.mobileMenu,true);
});

test('el selector permite escoger una canción para estudiar',()=>{
  const h=harness();
  h.nodes['mq-song-select'].fire('change','one');
  assert.deepEqual(h.chosen,[{id:'one',view:'study'}]);
});
