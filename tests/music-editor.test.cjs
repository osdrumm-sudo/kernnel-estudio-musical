'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../music-core.js');
const E=require('../music-editor.js');
const K=require('../music-clock.js');
function song(){
 const t={id:'demo',notas:['Intro','Verso','Coro','Final'],estudio:{meter:'4/4',bpm:120},secciones:[{id:'coro',desde:3,hasta:4}]};
 C.ensure(t);C.setMeterAtSection(t,'coro','6/8');return t;
}
test('P1: crea fragmento multicompás con identificadores estables y métrica mixta',()=>{
 const t=song(),before=t.notas.slice(),f=E.createRangeFragment(t,{mode:'percussion',measureIndex:1,endMeasureIndex:3});
 const ms=E.fragmentMeasures(t,f);
 assert.deepEqual(ms.map(m=>m.displayNumber),[2,3,4]);
 assert.deepEqual(ms.map(m=>m.durationTicks),[3840,2880,2880]);
 assert.deepEqual(t.notas,before);
 assert.equal(C.absolute(t,f.end)-C.absolute(t,f.start),9600);
});
test('P1: rango inválido no crea fragmento ni altera la canción',()=>{
 const t=song(),before=JSON.stringify(t);
 assert.throws(()=>E.createRangeFragment(t,{measureIndex:3,endMeasureIndex:1}),/rango/);
 assert.throws(()=>E.createRangeFragment(t,{measureIndex:0,endMeasureIndex:4}),/rango/);
 assert.equal(JSON.stringify(t),before);
});
test('P1: ampliar rango conserva notas e IDs; reducir excluyendo figuras se rechaza',()=>{
 const t=song(),f=E.createRangeFragment(t,{mode:'melody',measureIndex:1,endMeasureIndex:2});
 const event=C.addEvent(t,f.id,{measureId:f.end.measureId,tick:0,durationTicks:480,voice:1,pitch:64});
 E.resizeRange(t,f,0,3);
 assert.equal(f.events[0].id,event.id);
 const before=JSON.stringify(t);
 assert.throws(()=>E.resizeRange(t,f,0,1),/excluiría/);
 assert.equal(JSON.stringify(t),before);
 E.resizeRange(t,f,2,2);
 assert.equal(f.events[0].id,event.id);
 assert.deepEqual(C.validate(t),[]);
});
test('P1: fragmentos superpuestos permanecen independientes',()=>{
 const t=song(),a=E.createRangeFragment(t,{mode:'rhythm',measureIndex:0,endMeasureIndex:2}),b=E.createRangeFragment(t,{mode:'rhythm',measureIndex:1,endMeasureIndex:3});
 const id=t.musica.measures[1].id;
 C.addEvent(t,a.id,{measureId:id,tick:0,durationTicks:480,voice:1});
 C.addEvent(t,b.id,{measureId:id,tick:0,durationTicks:480,voice:1});
 assert.notEqual(a.events[0].id,b.events[0].id);
 assert.deepEqual(C.validate(t),[]);
});
test('P1: ambas superficies comparten posiciones válidas y respetan límites parciales',()=>{
 const t=song(),f=E.createRangeFragment(t,{mode:'rhythm',measureIndex:2,endMeasureIndex:2}),m=E.fragmentMeasures(t,f)[0];
 f.start.tick=480;f.end.tick=1920;
 const allowed=E.writablePositions(m,f,t,240,480).filter(x=>x.allowed).map(x=>x.tick);
 assert.deepEqual(allowed,[480,720,960,1200,1440]);
 assert.throws(()=>E.writablePositions(m,f,t,0,480),/inválida/);
});
test('P1: límite final en tick cero no agrega compás vacío',()=>{
 const t=song(),f=E.createRangeFragment(t,{mode:'rhythm',measureIndex:0,endMeasureIndex:1});
 f.end={measureId:t.musica.measures[2].id,tick:0};
 assert.deepEqual(E.fragmentMeasures(t,f).map(m=>m.displayNumber),[1,2]);
});
test('P1: ida y vuelta JSON conserva rango, notas y loop exacto del reloj existente',()=>{
 const t=song(),f=E.createRangeFragment(t,{mode:'percussion',measureIndex:1,endMeasureIndex:2});
 C.addEvent(t,f.id,{measureId:f.end.measureId,tick:0,durationTicks:320,voice:1,instrumentId:'kick'});
 const restored=JSON.parse(JSON.stringify(t)),r=restored.musica.fragments[0];
 assert.deepEqual(C.validate(restored),[]);
 assert.deepEqual(r,f);
 const plan=K.createPlan(restored,{bpm:120,loop:true,startTick:C.absolute(restored,r.start),endTick:C.absolute(restored,r.end)});
 assert.equal(plan.startTick,3840);
 assert.equal(plan.endTick,10560);
 assert.equal(plan.playSeconds,5);
 assert.equal(plan.positionAt(plan.playSeconds).cycle,1);
});
