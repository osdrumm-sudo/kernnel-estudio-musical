/* Metriqa Full - minieditor táctil, primera entrega funcional.
   Mantiene intacta la notación antigua; sólo crea datos v2 por acción explícita. */
(function (root) {
  'use strict';
  const C = root.MetriqaMusicCore;
  if (!C) throw Error('No se cargó el modelo musical de Metriqa.');
  const instruments = [['kick','Bombo'],['snare','Caja'],['hihat','Hi-hat'],['ride','Ride'],['crash','Crash'],['rack-tom','Tom'],['floor-tom','Tom de piso']];
  const durations = [['960','Negra'],['480','Corchea'],['240','Semicorchea'],['320','Tresillo de corchea'],['160','Tresillo de semicorchea']];
  const grids = [['240','Semicorcheas'],['320','Tresillos de corchea'],['160','Tresillos de semicorchea'],['480','Corcheas']];
  const modeLabels = {rhythm:'Ritmo',melody:'Melodía',percussion:'Batería'};
  const pitchNames = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
  const state = {fragmentId:null,mode:'percussion',name:'',measure:0,duration:480,step:240,
    voice:1,pitch:60,instrumentId:'kick',kind:'note',undo:[],lastSong:null};
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
    message = 'Cambios guardados en este equipo; sincronización según el estado de la cuenta.';
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
    saveChange();
  }
  function fragment(t) {
    return t && t.musica && t.musica.fragments.find(f => f.id === state.fragmentId) || null;
  }
  function activeMeasure(t, f) {
    if (!f) return null;
    const timeline = C.timeline(t);
    return timeline.find(m => m.id === f.start.measureId) || null;
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
      const f = C.createFragment(t, {name:state.name.trim() || 'Fragmento musical', mode:state.mode,measureIndex:state.measure});
      state.fragmentId = f.id;
      message = 'Fragmento creado. Selecciona una figura y pulsa una posición en la cuadrícula.';
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
    selected.forEach(e => {
      const el = button(e.kind === 'rest' ? '𝄽' : '●',()=>remove(e.id),'mqm-note');
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
    fig.append(staff);
    const grid = h('div','mqm-grid');
    grid.style.setProperty('--mqm-cols', String(Math.min(32,Math.ceil(m.durationTicks / state.step))));
    for (let pos = 0; pos < m.durationTicks; pos += state.step) {
      const event = selected.find(x => x.tick === pos);
      const el = button(event ? '●' : '·', ()=>insert(m.id,pos),'mqm-cell' + (event ? ' mqm-occupied' : ''));
      el.title = 'Posición ' + pos + ' ticks' + (event ? ', contiene ' + labelEvent(event,f.mode) : '');
      el.setAttribute('aria-label','Escribir en ' + pos + ' ticks');
      grid.append(el);
    }
    fig.append(grid);
    const listing = h('div','mqm-events');
    selected.sort((a,b)=>a.tick-b.tick || a.voice-b.voice).forEach(e => {
      listing.append(button(labelEvent(e,f.mode)+' · '+e.tick+'t · voz '+e.voice+' ×',
        ()=>remove(e.id),'mqm-event'));
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
    bar.append(select(list,state.fragmentId||'',v=>{state.fragmentId=v||null;render()},'Fragmento musical'));
    bar.append(button('↶ Deshacer',undo));
    bar.append(button('Eliminar fragmento',deleteFragment));
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
    create.append(select(C.timeline(t).map(m=>[String(m.index),'Compás '+m.displayNumber]),
      String(state.measure),v=>{state.measure=Number(v);},'Comenzar en'));
    create.append(button('Crear fragmento',createFragment,'mqm-primary'));
    parent.append(create);
    const f=fragment(t);
    if (!f) return;
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
      state.undo=[];message='';
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
      host.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
      host.append(h('p','mqm-helper','Modo Estudio: vista de lectura. La sincronización continua y los loops precisos se integrarán en la siguiente entrega de la Fase 1.'));
    }
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
  root.MetriqaMusic = {init,render,hasScore:t=>Boolean(t?.musica?.fragments?.length),
    hasEventsOnLastMeasure:t=>Boolean(t?.musica?.fragments?.some(f=>{
      const id=t.musica.measures[t.musica.measures.length-1]?.id;
      return f.start?.measureId===id || f.end?.measureId===id || f.events?.some(e=>e.measureId===id);
    }))};
})(window);
