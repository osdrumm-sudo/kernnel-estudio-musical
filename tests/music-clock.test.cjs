'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../music-core.js');
const K=require('../music-clock.js');
const song=(meter='4/4',count=3)=>({id:'s',nombre:'Test',notas:Array(count).fill(''),
 estudio:{meter,practiceBpm:120,bpm:100,accents:[1,3]},secciones:[{id:'bridge',nombre:'Puente',desde:2,hasta:count,color:'#ff0000'}]});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' no coincide con '+b);

test('el reloj de canciones heredadas no provoca migración de datos',()=>{
 const s=song('4/4',4),before=JSON.stringify(s),p=K.createPlan(s,{bpm:120});
 assert.equal(JSON.stringify(s),before);
 assert.equal(p.measures.length,4);
 close(p.secondsAtTick(3840),2);
 close(p.tickAtSeconds(2),3840);
 assert.equal(p.totalSeconds,8);
});
test('en 6/8 cada corchea es pulso; el compás dura seis clics',()=>{
 const s=song('6/8',2),p=K.createPlan(s,{bpm:120,loop:false});
 assert.equal(p.measures[0].durationTicks,2880);
 assert.equal(p.measures[0].pulseTicks,480);
 assert.equal(p.measures[0].pulseCount,6);
 close(p.secondsAtTick(2880),3);
 assert.deepEqual(p.eventsBetween(0,3).map(e=>e.seconds),[0,.5,1,1.5,2,2.5]);
});
test('transición de métrica: 4/4 a 6/8 sin perder continuidad temporal',()=>{
 const s=song('4/4',3),music=C.ensure(s);
 music.meterEvents.push({measureId:music.measures[1].id,numerator:6,denominator:8});
 const p=K.createPlan(s,{bpm:120});
 assert.deepEqual(p.measures.map(m=>m.startTick),[0,3840,6720]);
 assert.deepEqual(p.measures.map(m=>m.startSeconds),[0,2,5]);
 const around=p.eventsBetween(1.99,3.1);
 assert.deepEqual(around.map(e=>[e.measureIndex,e.beatIndex,e.seconds]),[[1,0,2],[1,1,2.5],[1,2,3]]);
 close(p.positionAt(2.75).tick,4560);
 assert.equal(p.positionAt(2.75).meter,'6/8');
});
test('el loop exacto conserva límites de tick sin duplicar el evento final',()=>{
 const s=song('4/4',1);
 const p=K.createPlan(s,{bpm:120,loop:true,startTick:480,endTick:2880});
 close(p.playSeconds,1.25);
 const clicks=p.eventsBetween(0,3).map(e=>Number(e.seconds.toFixed(2)));
 assert.deepEqual(clicks,[.25,.75,1.5,2,2.75]);
 close(p.positionAt(1.25).tick,480);
 assert.equal(p.positionAt(1.25).cycle,1);
});
test('cuenta inicial solo una vez, no se repite entre loops ni al reanudar',()=>{
 const s=song('4/4',1);
 const p=K.createPlan(s,{bpm:120,countInMeasures:1,loop:true});
 assert.equal(p.countSeconds,2);
 assert.deepEqual(p.eventsBetween(0,2).map(e=>e.phase),['count','count','count','count']);
 assert.deepEqual(p.eventsBetween(2,4).map(e=>e.phase),['play','play','play','play']);
 assert.deepEqual(p.eventsBetween(4,6).map(e=>e.phase),['play','play','play','play']);
 assert.equal(p.positionAt(4.1).cycle,1);
});
test('reproducción corta termina sin eventos posteriores',()=>{
 const s=song('4/4',1);
 const p=K.createPlan(s,{bpm:120,loop:false,startTick:960,endTick:1920});
 assert.deepEqual(p.eventsBetween(0,10).map(e=>e.seconds),[0]);
 assert.equal(p.positionAt(.5).phase,'finished');
});
test('más de mil vueltas no acumulan desplazamiento del pulso',()=>{
 const p=K.createPlan(song('4/4',1),{bpm:143,loop:true});
 const at=1000*p.playSeconds;
 assert.equal(p.positionAt(at).cycle,1000);
 close(p.positionAt(at).tick,0);
 const ev=p.eventsBetween(at,at+.5);
 close(ev[0].seconds,at);
});
test('acentos explícitos, acentos generales y silencio se respetan',()=>{
 const s=song('4/4',2),m=C.ensure(s);
 m.accentOverrides[m.measures[0].id]=[];
 const p=K.createPlan(s,{bpm:120});
 const perBar=p.eventsBetween(0,4);
 assert.deepEqual(perBar.slice(0,4).map(x=>x.accent),[false,false,false,false]);
 assert.deepEqual(perBar.slice(4,8).map(x=>x.accent),[true,false,true,false]);
});
test('se rechazan rangos fuera de la canción',()=>{
 const s=song();
 assert.throws(()=>K.createPlan(s,{startTick:960,endTick:960}),/Límites/);
 assert.throws(()=>K.createPlan(s,{startTick:-1}),/Límites/);
 assert.throws(()=>K.createPlan(s,{bpm:0}),/BPM/);
});

test('un cambio de BPM conserva la posición musical del cursor',()=>{
 const s=song('4/4',2);
 const old=K.createPlan(s,{bpm:120,loop:true,countInMeasures:1});
 const next=K.createPlan(s,{bpm:175,loop:true,countInMeasures:1});
 const elapsed=old.countSeconds+1.75*old.playSeconds+old.secondsAtTick(1440)-old.startSeconds;
 const pos=old.positionAt(elapsed);
 assert.equal(pos.phase,'play');
 const newElapsed=next.countSeconds+pos.cycle*next.playSeconds+
   next.secondsAtTick(pos.tick)-next.startSeconds;
 const updated=next.positionAt(newElapsed);
 close(updated.tick,pos.tick);
 assert.equal(updated.cycle,pos.cycle);
});
