/* Metriqa Full - minieditor táctil, primera entrega funcional.
   Mantiene intacta la notación antigua; sólo crea datos v2 por acción explícita. */
(function (root) {
  'use strict';
  const C = root.MetriqaMusicCore || (typeof require === 'function' ? require('./music-core.js') : null);
  if (!C) throw Error('No se cargó el modelo musical de Metriqa.');
  const instruments = [['kick','Bombo'],['snare','Caja'],['hihat','Hi-hat'],['ride','Ride'],['crash','Crash'],['rack-tom','Tom'],['floor-tom','Tom de piso']];
  const durations = [['960','Negra'],['480','Corchea'],['240','Semicorchea'],['320','Tresillo de corchea'],['160','Tresillo de semicorchea']];
  const grids = [['240','Semicorcheas'],['320','Tresillos de corchea'],['160','Tresillos de semicorchea'],['480','Corcheas']];
  const modeLabels = {rhythm:'Ritmo',melody:'Melodía',percussion:'Batería'};
  const pitchNames = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
  const state = {fragmentId:null,mode:'percussion',name:'',measure:0,endMeasure:0,activeMeasureId:null,duration:480,step:240,
    voice:1,pitch:60,instrumentId:'kick',kind:'note',undo:[],lastSong:null};
  // Helpers P1: no modifican el contrato del núcleo ni el reloj de P0.
  function fragmentMeasures(t, f) {
    const measures = C.timeline(t,{readOnly:true});
    const lo = C.absolute(t,f.start), hi = C.absolute(t,f.end);
    if (hi <= lo) throw Error('Límites de fragmento inválidos.');
    return measures.filter(m=>m.startTick < hi && m.startTick+m.durationTicks > lo);
  }
  function wholeMeasureRange(t, firstIndex, lastIndex) {
    const measures = C.timeline(t,{readOnly:true});
    if (!Number.isSafeInteger(firstIndex) || !Number.isSafeInteger(lastIndex) ||
        firstIndex < 0 || lastIndex < firstIndex || lastIndex >= measures.length)
      throw Error('Selecciona un rango de compases válido.');
    const first = measures[firstIndex], last = measures[lastIndex];
    return {start:{measureId:first.id,tick:0},end:{measureId:last.id,tick:last.durationTicks}};
  }
  function createRangeFragment(t, opts) {
    const range = wholeMeasureRange(t,opts.measureIndex,opts.endMeasureIndex);
    const f = C.createFragment(t,opts);
    f.start = range.start; f.end = range.end;
    return f;
  }
  function resizeRange(t, f, firstIndex, lastIndex) {
    const range = wholeMeasureRange(t,firstIndex,lastIndex);
    const lo=C.absolute(t,range.start),hi=C.absolute(t,range.end);
    for (const event of f.events) {
      const at=C.absolute(t,event);
      if (at<lo || at+event.durationTicks>hi)
        throw Error('El rango excluiría figuras existentes. Elimínalas explícitamente antes de reducirlo.');
    }
    f.start=range.start;f.end=range.end;
    return f;
  }
  function writablePositions(m,f,t,step,duration) {
    if (!Number.isSafeInteger(step)||step<=0||!Number.isSafeInteger(duration)||duration<=0)
      throw Error('Resolución o figura inválida.');
    const lo=C.absolute(t,f.start),hi=C.absolute(t,f.end);
    const positions=[];
    for(let tick=0;tick<m.durationTicks;tick+=step) {
      const at=m.startTick+tick;
      positions.push({tick,allowed:at>=lo && at+duration<=hi && tick+duration<=m.durationTicks});
    }
    return positions;
  }
  let host = null, message = '';
  const h = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  function button(label, handler, cls) {
    const e = h('button', cls || ''); e.type = 'button'; e.textContent = label;
    e.addEventListener('click', handler); return e;
  }
  function select(options, value, handler, labelText) {
    const wrap = h('label','mqm-field');
    wrap.append(h('span','',labelText));
    const s = h('select');
    options.forEach(pair => { const o = h('option','',pair[1]); o.value = String(pair[0]); s.append(o); });
    s.value = String(value);
    s.addEventListener('change', () => handler(s.value));
    wrap.append(s); return wrap;
  }
  function song() {
    try { return current(); } catch (_) { return null; }
  }
  function saveChange() {
    saveSoon();
    if (!message) message = 'Cambios aplicados; guardado local programado.';
    render();
  }
  function capture() {
    const t = song();
    if (!t || !t.musica) return;
    state.undo.push({songId:t.id, music:C.clone(t.musica)});
    if (state.undo.length > 30) state.undo.shift();
  }
  function undo() {
    const t = song(), previous = state.undo.pop();
    if (!t || !previous) return;
    if (previous.songId !== t.id) { state.undo=[]; render(); return; }
    t.musica = previous.music;
    state.fragmentId = t.musica.fragments.find(f => f.id === state.fragmentId) ? state.fragmentId : t.musica.fragments[0]?.id || null;
    message='Acción deshecha; guardado programado.';
    saveChange();
  }
  function fragment(t) {
    return t && t.musica && t.musica.fragments.find(f => f.id === state.fragmentId) || null;
  }
  function activeMeasure(t, f) {
    if (!f) return null;
    const available = fragmentMeasures(t,f);
    return available.find(m=>m.id===state.activeMeasureId) || available[0] || null;
  }
  function activate() {
    const t = song(); if (!t) return;
    capture();
    try { C.ensure(t); message = 'Minieditor habilitado para esta canción.'; saveChange(); }
    catch (e) { message = e.message; render(); }
  }
  function createFragment() {
    const t = song(); if (!t) return;
    capture();
    try {
      const f = createRangeFragment(t, {name:state.name.trim() || 'Fragmento musical', mode:state.mode,measureIndex:state.measure,endMeasureIndex:state.endMeasure});
      state.fragmentId = f.id; state.activeMeasureId=f.start.measureId;
      message = 'Fragmento creado. Selecciona una figura y pulsa una posición en el pentagrama o la cuadrícula.';
      saveChange();
    } catch (e) { state.undo.pop(); message=e.message; render(); }
  }
  function deleteFragment() {
    const t = song(), f = fragment(t);
    if (!f || !confirm('¿Eliminar el fragmento musical «' + f.name + '»? Podrás deshacer esta acción durante la sesión.')) return;
    capture();
    t.musica.fragments = t.musica.fragments.filter(x => x.id !== f.id);
    state.fragmentId = t.musica.fragments[0]?.id || null;
    message = 'Fragmento eliminado.';
    saveChange();
  }
  function insert(measureId, tick) {
    const t = song(), f = fragment(t); if (!f) return;
    capture();
    try {
      C.addEvent(t, f.id, {
        measureId, tick, kind:state.kind, durationTicks:state.duration, voice:state.voice,
        pitch:state.pitch, instrumentId:state.instrumentId
      });
      message = 'Figura incorporada.';
      saveChange();
    } catch (e) { state.undo.pop(); message=e.message; render(); }
  }
  function remove(id) {
    const t = song(), f = fragment(t); if (!f) return;
    capture();
    C.removeEvent(t, f.id, id);
    message='Figura eliminada; guardado programado.';
    saveChange();
  }
  function labelEvent(event, mode) {
    const name = mode === 'melody' ? pitchNames[event.pitch % 12] + String(Math.floor(event.pitch / 12) - 1)
      : mode === 'percussion' ? instruments.find(x => x[0] === event.instrumentId)?.[1] || 'Golpe'
      : 'Figura';
    return event.kind === 'rest' ? 'Silencio' : name;
  }
  function addMeasureGrid(t, f, parent) {
    const m = activeMeasure(t,f); if (!m) return;
    const fig = h('div','mqm-grid-wrap');
    const subtitle = h('p','mqm-helper','Compás ' + m.displayNumber + ' · ' + m.numerator + '/' + m.denominator +
      ' · Pulsa para escribir; pulsa una nota existente para eliminarla.');
    fig.append(subtitle);
    const staff = h('div','mqm-staff'); staff.setAttribute('role','group');
    staff.setAttribute('aria-label','Vista simplificada del pentagrama del fragmento');
    const line = h('div','mqm-staff-lines');staff.append(line);
    const selected = f.events.filter(x => x.measureId === m.id);
    const positions = writablePositions(m,f,t,state.step,state.duration);
    const scroll = h('div','mqm-staff-scroll');
    staff.style.minWidth=Math.max(280,positions.length*32/0.88)+'px';
    positions.forEach(({tick,allowed})=>{
      const slot=button('·',()=>insert(m.id,tick),'mqm-staff-slot');
      slot.style.left=(5+88*tick/m.durationTicks)+'%';
      slot.style.width=(88*state.step/m.durationTicks)+'%';
      slot.disabled=!allowed;
      slot.title='Escribir figura en '+tick+' ticks';
      slot.setAttribute('aria-label','Pentagrama: escribir en '+tick+' ticks');
      staff.append(slot);
    });
    selected.forEach(e => {
      const symbol=e.kind==='rest'?'𝄽':({960:'♩',480:'♪',240:'♬',320:'♪',160:'♬'}[e.durationTicks]||'●');
      const el = button(symbol,()=>remove(e.id),'mqm-note');
      el.dataset.mqmEventId=e.id;
      let row = e.voice === 1 ? 2 : 4;
      if (f.mode === 'melody') row = 4.5 - (e.pitch - 60) / 4;
      if (f.mode === 'percussion') {
        const maps = {kick:5,snare:3,hihat:1,ride:1.5,crash:0.5,'rack-tom':3.5,'floor-tom':4.5};
        row = maps[e.instrumentId] ?? 3;
      }
      el.style.left = (5 + 88 * (e.tick / m.durationTicks)) + '%';
      el.style.top = Math.max(3,Math.min(90,7 + 16 * row)) + '%';
      el.title = labelEvent(e,f.mode) + ', voz ' + e.voice + ', tick ' + e.tick + '. Eliminar';
      el.setAttribute('aria-label',el.title);
      staff.append(el);
    });
    const playhead=h('span','mqm-playhead');playhead.hidden=true;playhead.setAttribute('aria-hidden','true');staff.append(playhead);
    scroll.append(staff);fig.append(scroll);
    const grid = h('div','mqm-grid');
    grid.style.setProperty('--mqm-cols', String(positions.length));
    for (const {tick:pos,allowed} of positions) {
      const event = selected.find(x => x.tick === pos);
      const el = button(event ? '●' : '·', ()=>insert(m.id,pos),'mqm-cell' + (event ? ' mqm-occupied' : ''));
      el.disabled=!allowed;
      el.title = 'Posición ' + pos + ' ticks' + (event ? ', contiene ' + labelEvent(event,f.mode) : '');
      el.setAttribute('aria-label','Escribir en ' + pos + ' ticks');
      grid.append(el);
    }
    fig.append(grid);
    const listing = h('div','mqm-events');
    selected.sort((a,b)=>a.tick-b.tick || a.voice-b.voice).forEach(e => {
      const item=button(labelEvent(e,f.mode)+' · '+e.tick+'t · voz '+e.voice+' ×',
        ()=>remove(e.id),'mqm-event');
      item.dataset.mqmEventId=e.id;listing.append(item);
    });
    fig.append(listing);
    parent.append(fig);
  }
  function formFor(t, parent) {
    const bar = h('div','mqm-toolbar');
    if (!t.musica) {
      bar.append(button('＋ Habilitar Minieditor Musical',activate,'mqm-primary'));
      parent.append(bar);
      parent.append(h('p','mqm-helper','La canción y sus anotaciones actuales permanecerán intactas. Se agregará notación estructurada únicamente cuando lo habilites.'));
      return;
    }
    const music=t.musica;
    if (!music.fragments.length) state.fragmentId=null;
    if (!fragment(t) && music.fragments.length) state.fragmentId=music.fragments[0].id;
    const list=[['','Selecciona un fragmento'],...music.fragments.map(f=>[f.id,f.name+' · '+modeLabels[f.mode]])];
    const fragmentSelect=select(list,state.fragmentId||'',v=>{state.fragmentId=v||null;state.activeMeasureId=null;render()},'Fragmento musical');
    fragmentSelect.querySelector('select').classList.add('mqm-study-nav');bar.append(fragmentSelect);
    bar.append(button('↶ Deshacer',undo));
    bar.append(button('Eliminar fragmento',deleteFragment));
    bar.append(button('Practicar fragmento',()=>{
      const selected=fragment(song());
      if(!selected)return;
      if(root.KernnelPrepareFragment?.(selected))message='Loop preparado. En Estudio, pulsa Reproducir.';
      render();
    },'mqm-practice'));
    bar.append(button('＋ Nuevo fragmento',()=>{
      const f = document.getElementById('mqm-new-form');
      f.hidden = !f.hidden;
    },'mqm-primary'));
    parent.append(bar);
    const create = h('div','mqm-new-form');create.id='mqm-new-form';create.hidden=Boolean(music.fragments.length);
    const name = h('label','mqm-field');name.append(h('span','','Nombre del fragmento'));
    const field=h('input');field.type='text';field.maxLength=100;field.placeholder='Ej. Groove principal';
    field.value=state.name;field.addEventListener('input',()=>{state.name=field.value;});name.append(field);
    create.append(name);
    create.append(select([['rhythm','Rítmica'],['melody','Melódica'],['percussion','Batería / percusión']],
      state.mode,v=>{state.mode=v;},'Tipo'));
    const all=C.timeline(t,{readOnly:true});
    const choices=all.map(m=>[String(m.index),'Compás '+m.displayNumber]);
    state.measure=Math.min(Math.max(0,state.measure),all.length-1);
    state.endMeasure=Math.min(Math.max(state.measure,state.endMeasure),all.length-1);
    const firstSelect=select(choices,String(state.measure),v=>{
      state.measure=Number(v);
      if(state.endMeasure<state.measure){state.endMeasure=state.measure;lastSelect.querySelector('select').value=String(state.endMeasure);}
    },'Comenzar en');
    const lastSelect=select(choices,String(state.endMeasure),v=>{state.endMeasure=Number(v);},'Terminar en');
    create.append(firstSelect,lastSelect);
    create.append(button('Crear fragmento',createFragment,'mqm-primary'));
    parent.append(create);
    const f=fragment(t);
    if (!f) return;
    const covered=fragmentMeasures(t,f), active=activeMeasure(t,f);
    const nav=h('div','mqm-toolbar mqm-measure-nav');
    const choose=select(covered.map(m=>[m.id,'Compás '+m.displayNumber+' · '+m.numerator+'/'+m.denominator]),
      active.id,v=>{state.activeMeasureId=v;render()},'Compás visible');
    choose.querySelector('select').classList.add('mqm-study-nav');
    const i=covered.findIndex(m=>m.id===active.id);
    const prev=button('← Anterior',()=>{state.activeMeasureId=covered[i-1].id;render()},'mqm-study-nav');
    const next=button('Siguiente →',()=>{state.activeMeasureId=covered[i+1].id;render()},'mqm-study-nav');
    prev.disabled=i===0;next.disabled=i===covered.length-1;
    nav.append(prev,choose,next);parent.append(nav);
    const range=h('div','mqm-toolbar mqm-range');
    let from=covered[0].index,to=covered[covered.length-1].index;
    range.append(select(choices,String(from),v=>{from=Number(v)},'Nuevo inicio'),
      select(choices,String(to),v=>{to=Number(v)},'Nuevo fin'));
    range.append(button('Aplicar rango de compases completos',()=>{
      capture();
      try{resizeRange(t,f,from,to);state.activeMeasureId=null;message='Rango actualizado sin perder figuras.';saveChange();}
      catch(e){state.undo.pop();message=e.message;render();}
    }));
    parent.append(range);
    const controls=h('div','mqm-toolbar mqm-controls');
    controls.append(select(durations,String(state.duration),v=>{state.duration=Number(v);render()},'Figura'));
    controls.append(select(grids,String(state.step),v=>{state.step=Number(v);render()},'Cuadrícula'));
    controls.append(select([['1','Voz 1'],['2','Voz 2']],String(state.voice),v=>{state.voice=Number(v);},'Voz'));
    controls.append(select([['note','Nota'],['rest','Silencio']],state.kind,v=>{state.kind=v;render()},'Escribir'));
    if (f.mode === 'melody') {
      controls.append(select(Array.from({length:37},(_,i)=>[String(48+i),
        pitchNames[(48+i)%12]+String(Math.floor((48+i)/12)-1)]),
      String(state.pitch),v=>{state.pitch=Number(v);},'Altura'));
    }
    if (f.mode === 'percussion') {
      controls.append(select(instruments,state.instrumentId,v=>{state.instrumentId=v;},'Instrumento'));
    }
    parent.append(controls);
    addMeasureGrid(t,f,parent);
  }
  function render() {
    if (!host) return;
    const t = song();
    const view = typeof ui === 'object' ? ui.view : 'home';
    host.hidden = !t || (view !== 'edit' && view !== 'study');
    if (host.hidden) return;
    if (state.lastSong !== t.id) {
      state.lastSong = t.id; state.fragmentId = t.musica?.fragments?.[0]?.id || null;
      state.undo=[];state.activeMeasureId=null;state.measure=0;state.endMeasure=0;message='';
    }
    host.replaceChildren();
    const head = h('div','mqm-head');
    const title = h('div');title.append(h('h3','','Minieditor Musical'));
    title.append(h('p','mqm-helper','Fase 1 · escritura de fragmentos y guardado estructurado'));
    head.append(title);
    const badge=h('span','mqm-pill',t.musica ? 'Notación v2' : 'Sin activar');
    head.append(badge);host.append(head);
    try { formFor(t,host); }
    catch (e) { host.append(h('p','mqm-error','No se pudo leer el fragmento: '+e.message)); }
    const status=h('p','mqm-status',message);
    status.setAttribute('role','status');host.append(status);
    if (view === 'study') {
      host.querySelectorAll('button,input,select').forEach(el=>{if(!el.matches('.mqm-practice,.mqm-study-nav'))el.disabled=true;});
      host.append(h('p','mqm-helper','Modo Estudio: lectura y navegación. Durante la práctica se sigue el compás del fragmento seleccionado.'));
    }
  }
  function updatePlayback(t,position) {
    if(!host||host.hidden||!t||!t.musica)return;
    const f=fragment(t);
    if(!f)return;
    let m=activeMeasure(t,f);
    if(position?.phase==='play' && typeof ui==='object' && ui.view==='study'){
      const target=fragmentMeasures(t,f).find(x=>x.index===position.measureIndex);
      if(target && target.id!==m?.id){state.activeMeasureId=target.id;render();m=target;}
    }
    const marker=host.querySelector('.mqm-playhead');if(!marker)return;
    const visible=Boolean(m && position?.phase==='play' && position.measureIndex===m.index);
    marker.hidden=!visible;
    if(visible)marker.style.left=(5+88*Math.max(0,Math.min(1,(position.tick-m.startTick)/m.durationTicks)))+'%';
    const active=new Set();
    if(visible)for(const e of f.events){
      if(e.measureId!==m.id)continue;
      const tick=m.startTick+e.tick;
      if(position.tick>=tick && position.tick<tick+e.durationTicks)active.add(e.id);
    }
    host.querySelectorAll('[data-mqm-event-id]').forEach(el=>{
      el.classList.toggle('mqm-sounding',active.has(el.dataset.mqmEventId));
    });
  }
  function init() {
    if (host) return;
    const scorebox = document.querySelector('.scorebox');
    if (!scorebox) return;
    host = h('section','mqm-panel');host.id='metriqa-mini-editor';
    host.setAttribute('aria-label','Minieditor Musical de Metriqa');
    scorebox.parentElement.insertBefore(host,scorebox);
    render();
  }
  root.MetriqaMusic = {init,render,updatePlayback,hasScore:t=>Boolean(t?.musica?.fragments?.length),
    hasEventsOnLastMeasure:t=>Boolean(t?.musica?.fragments?.some(f=>{
      const id=t.musica.measures[t.musica.measures.length-1]?.id;
      return f.start?.measureId===id || f.end?.measureId===id || f.events?.some(e=>e.measureId===id);
    }))};
  if(typeof module!=='undefined'&&module.exports)module.exports={fragmentMeasures,wholeMeasureRange,createRangeFragment,resizeRange,writablePositions};
})(typeof window!=='undefined'?window:globalThis);
