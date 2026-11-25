/* Metriqa: reloj musical puro. Una sola línea temporal de ticks y segundos,
   independiente de DOM, AudioContext y temporizadores. */
(function(root) {
'use strict';
const C = root.MetriqaMusicCore || (typeof require === 'function' ? require('./music-core.js') : null);
if (!C) throw Error('Se necesita el modelo musical v2.');
const EPS = 1e-8;
const isInt = n => Number.isSafeInteger(n);

function lowerBound(list, value, key) {
 let lo=0,hi=list.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(key(list[mid])<value)lo=mid+1;else hi=mid;}
 return lo;
}
function measuresFor(song,bpm) {
 if (!song || !Array.isArray(song.notas) || !song.notas.length) throw Error('Canción inválida.');
 if (!Number.isFinite(bpm) || bpm<30 || bpm>300) throw Error('BPM fuera de rango.');
 let base;
 if(song.musica) {
  if(song.musica.schemaVersion!==2)throw Error('Formato musical desconocido.');
  base=C.timeline(song,{readOnly:true}); // no reconciliar ni modificar datos desde el reloj
 }else {
  const meter=C.parseMeter(song.estudio?.meter || '4/4');
  const size=C.durationTicks(meter),pulse=C.pulseTicks(meter);
  base=song.notas.map((_,i)=>({id:'legacy-'+i,index:i,displayNumber:i+1,
   numerator:meter.numerator,denominator:meter.denominator,startTick:i*size,
   durationTicks:size,pulseTicks:pulse}));
 }
 let startSeconds=0;
 return base.map(m=>{
  const secondsPerTick=60/(bpm*m.pulseTicks);
  const measure={...m,startSeconds,secondsPerTick,
   durationSeconds:m.durationTicks*secondsPerTick,
   pulseCount:m.durationTicks/m.pulseTicks};
  startSeconds+=measure.durationSeconds;
  return measure;
 });
}
function createPlan(song,opts={}) {
 const bpm=Number(opts.bpm ?? song.estudio?.practiceBpm ?? song.estudio?.bpm ?? 120);
 const measures=measuresFor(song,bpm);
 const last=measures[measures.length-1];
 const totalTicks=last.startTick+last.durationTicks,totalSeconds=last.startSeconds+last.durationSeconds;
 const measureAtTick=tick=>{
  if(!Number.isFinite(tick)||tick<0||tick>totalTicks)throw Error('Tick fuera de la canción.');
  let i=lowerBound(measures,tick,m=>m.startTick+m.durationTicks);
  if (measures[i] && measures[i].startTick+measures[i].durationTicks===tick) i++;
  return measures[Math.min(i,measures.length-1)];
 };
 const secondsAtTick=tick=>{
  if(tick===totalTicks)return totalSeconds;
  const m=measureAtTick(tick);
  return m.startSeconds+(tick-m.startTick)*m.secondsPerTick;
 };
 const tickAtSeconds=seconds=>{
  if(!Number.isFinite(seconds)||seconds<0||seconds>totalSeconds+EPS)throw Error('Tiempo fuera de canción.');
  if(seconds>=totalSeconds)return totalTicks;
  let i=lowerBound(measures,seconds,m=>m.startSeconds+m.durationSeconds);
  if (measures[i] && measures[i].startSeconds+measures[i].durationSeconds===seconds) i++;
  const m=measures[Math.min(i,measures.length-1)];
  return m.startTick+(seconds-m.startSeconds)/m.secondsPerTick;
 };
 const startMeasure=Number(opts.startMeasureIndex ?? 0),endMeasure=Number(opts.endMeasureIndex ?? measures.length-1);
 if(!isInt(startMeasure)||!isInt(endMeasure)||startMeasure<0||endMeasure<startMeasure||endMeasure>=measures.length)
  throw Error('Compases de reproducción inválidos.');
 const startTick=Number(opts.startTick ?? measures[startMeasure].startTick);
 const endTick=Number(opts.endTick ?? (measures[endMeasure].startTick+measures[endMeasure].durationTicks));
 if(!isInt(startTick)||!isInt(endTick)||startTick<0||endTick>totalTicks||endTick-startTick<160)
  throw Error('Límites de reproducción inválidos.');
 const loop=Boolean(opts.loop),countInMeasures=Number(opts.countInMeasures ?? 0);
 if(!isInt(countInMeasures)||countInMeasures<0||countInMeasures>4)throw Error('Cuenta de entrada inválida.');
 const first=measureAtTick(startTick),countPulseSeconds=first.pulseTicks*first.secondsPerTick;
 const countPulseCount=first.pulseCount*countInMeasures;
 const countSeconds=countPulseCount*countPulseSeconds;
 const startSeconds=secondsAtTick(startTick),endSeconds=secondsAtTick(endTick);
 const playSeconds=endSeconds-startSeconds;
 const accents=Array.isArray(song.estudio?.accents)?song.estudio.accents:[1];
 const overrides=song.musica?.accentOverrides || {};
 const playEvents=[];
 for(const m of measures) {
  if(m.startTick>=endTick)break;
  if(m.startTick+m.durationTicks<=startTick)continue;
  for(let beat=0;beat<m.pulseCount;beat++) {
   const tick=m.startTick+beat*m.pulseTicks;
   if(tick<startTick||tick>=endTick)continue;
   const specific=overrides[m.id];
   const active=Array.isArray(specific)?specific:accents;
   playEvents.push({seconds:secondsAtTick(tick)-startSeconds,phase:'play',
    tick,measureIndex:m.index,beatIndex:beat,pulseCount:m.pulseCount,
    meter:m.numerator+'/'+m.denominator,accent:active.includes(beat+1)});
  }
 }
 function positionAt(elapsed) {
  const sec=Math.max(0,Number(elapsed)||0);
  if(sec<countSeconds) {
   const beat=Math.min(countPulseCount-1,Math.floor(sec/countPulseSeconds));
   return {phase:'count',tick:startTick,measureIndex:null,beatIndex:beat%first.pulseCount,
    pulseCount:first.pulseCount,meter:first.numerator+'/'+first.denominator,
    progress:(sec/countPulseSeconds)%1,cycle:0,preparationMeasure:Math.floor(beat/first.pulseCount)+1};
  }
  const passed=sec-countSeconds;
  if(!loop && passed>=playSeconds-EPS) {
   return {phase:'finished',tick:endTick,measureIndex:null,beatIndex:-1,
    pulseCount:0,meter:null,progress:1,cycle:0};
  }
  const cycle=loop?Math.max(0,Math.floor(passed/playSeconds)):0;
  const local=loop?passed-cycle*playSeconds:passed;
  const tick=Math.min(endTick-1e-6,tickAtSeconds(startSeconds+Math.max(0,local)));
  const m=measureAtTick(tick);
  const beat=(tick-m.startTick)/m.pulseTicks;
  return {phase:'play',tick,measureIndex:m.index,beatIndex:Math.floor(beat),
   pulseCount:m.pulseCount,meter:m.numerator+'/'+m.denominator,
   progress:beat-Math.floor(beat),cycle};
 }
 function eventsBetween(from,to) {
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return [];
  const out=[];
  if(from<countSeconds) {
   const i0=Math.max(0,Math.ceil((from-EPS)/countPulseSeconds));
   for(let i=i0;i<countPulseCount;i++){
    const seconds=i*countPulseSeconds;
    if(seconds>=to-EPS)break;
    out.push({seconds,phase:'count',beatIndex:i%first.pulseCount,
      pulseCount:first.pulseCount,measureIndex:null,accent:accents.includes(i%first.pulseCount+1)});
   }
  }
  if(to<=countSeconds)return out;
  const start=Math.max(0,from-countSeconds),finish=Math.max(0,to-countSeconds);
  const firstCycle=loop?Math.floor(start/playSeconds):0;
  const lastCycle=loop?Math.floor(Math.max(0,finish-EPS)/playSeconds):0;
  for(let cycle=firstCycle;cycle<=Math.min(lastCycle,firstCycle+64);cycle++){
   if(!loop&&cycle>0)break;
   const base=countSeconds+cycle*playSeconds;
   const localStart=Math.max(0,from-base);
   const i0=lowerBound(playEvents,localStart-EPS,e=>e.seconds);
   for(let j=i0;j<playEvents.length;j++){
    const e=playEvents[j],seconds=base+e.seconds;
    if(seconds>=to-EPS)break;
    if(seconds>=from-EPS)out.push({...e,seconds,cycle});
    if(out.length>2048)break;
   }
   if(out.length>2048)break;
  }
  return out;
 }
 return {bpm,measures,startTick,endTick,startSeconds,endSeconds,totalTicks,
  loop,countSeconds,playSeconds,playEvents,secondsAtTick,tickAtSeconds,
  positionAt,eventsBetween,totalSeconds:loop?Infinity:countSeconds+playSeconds};
}
const api={createPlan,measuresFor};
root.MetriqaMusicalClock=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
