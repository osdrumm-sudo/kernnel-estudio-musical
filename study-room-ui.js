/* Salas privadas de estudio. La sala y la biblioteca personal son independientes. */
(function(root){
'use strict';

const MAX_INVITEES = 30;
const ROOM_PATTERN = /^[a-zA-Z0-9_-]{4,96}$/;
const EMAIL_PATTERN = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;
const INLINE_IMAGE = /^data:image\/(?:png|jpeg|webp|gif|avif|bmp);base64,[a-z0-9+/]+=*$/i;
const COLOR = /^#[0-9a-f]{6}$/i;

let adapter = null;
let visit = null;
let queuedRoom = null;
let action = null;
let audioEnabled = false;
let activeMeasure = null;
let activeBeat = null;
const measures = new Map();

const dialog = mk('dialog',{id:'study-room-dialog','aria-labelledby':'study-room-title'});
const heading = mk('h2',{id:'study-room-title',text:'Sala de estudio'});
const closeButton = button('Cerrar',leave);
const status = mk('p',{class:'room-status',role:'status',hidden:true});
const roomName = mk('input',{name:'sala-nombre',required:true,maxlength:120,placeholder:'Ensayo de la banda'});
const newRoomSong = mk('select',{name:'sala-tema',required:true});
const invitees = mk('textarea',{name:'sala-invitados',rows:3,maxlength:8000,required:true,placeholder:'alumna@ejemplo.com'});
const createButton = mk('button',{type:'submit',class:'primary',text:'Crear sala'});
const createForm = mk('form',{class:'room-panel room-form'},[
  mk('h3',{text:'Crear una sala'}),
  label('Nombre de la sala',roomName),
  label('Tema para compartir',newRoomSong),
  label('Correos de los invitados',invitees),
  mk('small',{text:'Separa los correos con comas o por línea. Cada invitado debe usar su cuenta de Google autorizada en Metriqa.'}),
  createButton,
]);

const joinCode = mk('input',{name:'sala-enlace',required:true,maxlength:500,placeholder:'Pega el enlace que te enviaron'});
const joinButton = mk('button',{type:'submit',class:'primary',text:'Entrar a la sala'});
const joinForm = mk('form',{class:'room-panel room-form'},[
  mk('h3',{text:'Entrar por invitación'}),
  label('Enlace de la sala',joinCode),
  joinButton,
]);

const account = mk('p',{class:'muted room-account'});
const lobbyForms = mk('div',{class:'room-lobby-forms'},[createForm,joinForm]);
const lobby = mk('section',{class:'room-lobby'},[account,lobbyForms]);

const role = mk('p',{class:'room-role'});
const songTitle = mk('h3',{class:'room-song-title'});
const transportState = mk('p',{class:'room-position'});
const audioButton = button('Activar metrónomo',enableAudio);
const clockButton = button('Reintentar sincronización',calibrate,'',{hidden:true});
const inviteLink = mk('input',{type:'url',readonly:true,'aria-label':'Enlace de invitación'});
const copyButton = button('Copiar enlace',copyLink);
const shareSelect = mk('select',{name:'sala-compartir'});
const shareButton = button('Compartir tema',shareTheme);
const sectionSelect = mk('select',{name:'sala-seccion'});
const from = mk('input',{type:'number',min:1,step:1,required:true});
const to = mk('input',{type:'number',min:1,step:1,required:true});
const bpm = mk('input',{type:'number',min:30,max:300,step:1,required:true});
const loop = mk('input',{type:'checkbox'});
const applyButton = mk('button',{type:'submit',text:'Aplicar tramo'});
const playButton = button('Reproducir',play,'primary');
const pauseButton = button('Pausar',pause);
const stopButton = button('Detener',stop);
const finishButton = button('Cerrar sala para todos',finish,'danger');
const settingsForm = mk('form',{class:'room-practice-form'},[
  label('Sección del tema',sectionSelect),
  label('Desde compás',from),
  label('Hasta compás',to),
  label('BPM',bpm),
  mk('label',{class:'room-loop'},[loop,mk('span',{text:'Repetir tramo'})]),
  applyButton,
]);
const director = mk('div',{class:'room-director room-panel'},[
  mk('div',{class:'room-invite'},[inviteLink,copyButton]),
  mk('div',{class:'room-theme'},[label('Tema de tu biblioteca',shareSelect),shareButton]),
  settingsForm,
  mk('div',{class:'room-actions'},[playButton,pauseButton,stopButton,finishButton]),
]);
const roomActions = mk('div',{class:'room-actions'},[audioButton,clockButton]);
const roomHeader = mk('div',{class:'room-header'},[mk('div',{},[role,songTitle,transportState]),roomActions]);
const score = mk('div',{class:'room-score',tabindex:0,role:'region','aria-label':'Partitura compartida'});
const session = mk('section',{class:'room-session',hidden:true},[roomHeader,director,score]);
dialog.append(mk('div',{class:'room-dialog-header'},[heading,closeButton]),status,lobby,session);
document.body.append(dialog);

const ticker = root.KernnelRoomClock.create({tick:showPosition,onError:audioError});

function setStatus(text,error=false){
  status.textContent = text;
  status.hidden = !text;
  status.classList.toggle('room-error',error);
}

function currentSong(id){
  return D.temas.find(song => song.id === id);
}

function replaceOptions(element,options,value){
  element.replaceChildren(...options.map(([id,text])=>mk('option',{value:id,text})));
  element.value = options.some(([id])=>id === value) ? value : (options[0]?.[0] ?? '');
}

function refreshSongs(element){
  const selected = element.value || D.sel;
  replaceOptions(element,D.temas.length
    ? D.temas.map(song=>[song.id,song.nombre]) : [['','Tu biblioteca aún no tiene temas']],selected);
}

function readyTransport(song, settings={}){
  return {
    mode:'ready',
    bpm:Math.round(Number(song.estudio?.practiceBpm || song.estudio?.bpm || 120)),
    from:1,to:song.notas.length,loop:false,startBeat:0,startsAt:0,...settings,
  };
}

function sharedSong(song){
  return {
    id:song.id,nombre:song.nombre,notas:song.notas.slice(),nombres:(song.nombres || []).slice(),
    tiempos:(song.tiempos || []).map(measure=>Array.isArray(measure)
      ? measure.map(beat=>beat ? {
        txt:typeof beat.txt === 'string' ? beat.txt : '',
        color:typeof beat.color === 'string' && COLOR.test(beat.color) ? beat.color : '',
        img:typeof beat.img === 'string' && INLINE_IMAGE.test(beat.img) ? beat.img : '',
      } : null)
      : null),
    secciones:(song.secciones || []).map(({nombre,desde,hasta,color})=>({nombre,desde,hasta,color})),
    estudio:{
      meter:song.estudio?.meter || '4/4',bpm:song.estudio?.bpm || 120,
      practiceBpm:song.estudio?.practiceBpm || song.estudio?.bpm || 120,
    },
  };
}

function roomId(value){
  const input = String(value || '').trim();
  if(!input)return null;
  if(ROOM_PATTERN.test(input))return input;
  try {
    const id = new URL(input,location.href).searchParams.get('sala');
    return id && ROOM_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

function setURL(id){
  const url = new URL(location.href);
  if(id)url.searchParams.set('sala',id);
  else url.searchParams.delete('sala');
  history.replaceState(history.state,'',url);
}

function invitationFor(id){
  if(adapter?.inviteLink)return adapter.inviteLink(id);
  const url = new URL(location.pathname,location.origin);
  url.searchParams.set('sala',id);
  return url.href;
}

function networkReady(){
  return Boolean(adapter && (adapter.demo || navigator.onLine));
}

function ownedRoom(){
  return Boolean(visit?.room && !visit.room.closed && adapter?.uid === visit.room.ownerUid);
}

function updateControls(){
  const busy = Boolean(action);
  const online = networkReady();
  const own = ownedRoom();
  const room = visit?.room;
  createButton.disabled = busy || !online || !newRoomSong.value;
  joinButton.disabled = busy || !online;
  director.hidden = !own;
  audioButton.disabled = audioEnabled || !visit?.room || visit.room.closed;
  clockButton.hidden = !visit?.clockFailed || !online;
  clockButton.disabled = busy;
  for(const control of [shareSelect,sectionSelect,from,to,bpm,loop,applyButton,playButton,pauseButton,stopButton,shareButton,finishButton]){
    control.disabled = busy || !online || !own || room.loadingScore;
  }
  const playing = room?.transport?.mode === 'playing' && !visit.positionEnded;
  playButton.disabled ||= !Number.isFinite(visit?.offset) || playing;
  pauseButton.disabled ||= !Number.isFinite(visit?.offset) || !playing;
  stopButton.disabled ||= room?.transport?.mode === 'ready';
  sectionSelect.disabled ||= !room?.song?.secciones?.length;
  shareButton.disabled ||= !shareSelect.value;
  audioButton.textContent = audioEnabled ? 'Metrónomo activado' : 'Activar metrónomo';
}

function showLobby(){
  closeButton.textContent = 'Cerrar';
  heading.textContent = 'Sala de estudio';
  lobby.hidden = false;
  session.hidden = true;
  refreshSongs(newRoomSong);
  lobbyForms.hidden = !networkReady();
  account.textContent = adapter?.demo ? 'Demostración local con cuentas de prueba.'
    : networkReady() && adapter.email ? 'Tu cuenta: ' + adapter.email : 'Conéctate a Internet e inicia sesión para entrar a una sala.';
  if(adapter?.suggestedInvite && !invitees.value)invitees.value = adapter.suggestedInvite;
  updateControls();
}

function releaseVisit(){
  const old = visit;
  visit = null;
  action = null;
  old?.unsubscribe?.();
  ticker.stop();
  measures.clear();
  activeMeasure = activeBeat = null;
  score.replaceChildren();
}

function open(id){
  if(!dialog.open){
    if(typeof stopMetro === 'function')stopMetro();
    dialog.showModal();
  }
  if(id && !adapter){
    queuedRoom = id;
    showLobby();
    return;
  }
  if(id){
    const normalized = roomId(id);
    if(normalized){enter(normalized);return;}
    setStatus('El enlace de invitación no es válido.',true);
  }else if(!visit){
    setStatus('');
  }
  if(!visit)showLobby();
}

function leave(){
  queuedRoom = null;
  releaseVisit();
  setURL(null);
  setStatus('');
  dialog.close();
}

function connect(next){
  if(adapter?.uid !== next?.uid)releaseVisit();
  adapter = next;
  if(queuedRoom && adapter){
    const requested = queuedRoom;
    queuedRoom = null;
    open(requested);
  }else if(dialog.open && !visit)showLobby();
}

function disconnect(){
  adapter = null;
  queuedRoom = null;
  audioEnabled = false;
  releaseVisit();
  if(dialog.open)dialog.close();
}

function errorText(error,fallback){
  if(['permission-denied','firestore/permission-denied','not-found'].includes(error?.code)){
    return 'No puedes entrar a esta sala. Comprueba el enlace y la cuenta que recibió la invitación.';
  }
  return error?.message || fallback;
}

async function execute(job,fallback){
  if(action || !adapter || !networkReady())return;
  const token = {};
  action = token;
  updateControls();
  try {
    return await job(()=>action === token);
  } catch(error) {
    if(action === token)setStatus(errorText(error,fallback),true);
  } finally {
    if(action === token){
      action = null;
      updateControls();
    }
  }
}

function watchError(target,error){
  if(visit !== target)return;
  releaseVisit();
  joinCode.value = invitationFor(target.id);
  showLobby();
  setStatus(errorText(error,'No se pudo conectar con la sala de estudio.'),true);
}

function enter(id){
  if(!adapter || visit?.id === id)return;
  releaseVisit();
  const target = {id,room:null,offset:null,clockFailed:false,clockJob:null,scoreVersion:null,scoreSong:null,settings:null};
  visit = target;
  lobby.hidden = true;
  session.hidden = true;
  closeButton.textContent = 'Salir de la sala';
  setStatus('Conectando con la sala…');
  try {
    const unsubscribe = adapter.watchRoom(id,room=>receiveRoom(target,room),error=>watchError(target,error));
    if(visit === target)target.unsubscribe = unsubscribe;
    else unsubscribe?.();
  } catch(error) {
    watchError(target,error);
  }
}

function receiveRoom(target, room){
  if(visit !== target)return;
  const previous = target.room;
  target.room = room;
  setURL(room.closed ? null : room.id);
  heading.textContent = room.name || 'Sala de estudio';
  closeButton.textContent = 'Salir de la sala';
  lobby.hidden = true;
  session.hidden = false;
  role.textContent = room.ownerUid === adapter.uid ? 'Director' : 'Participante';
  roomActions.hidden = score.hidden = Boolean(room.closed);
  if(room.closed){
    ticker.stop();
    setStatus('La sala está cerrada.');
    transportState.textContent = '';
    songTitle.textContent = '';
    score.replaceChildren();
    measures.clear();
    updateControls();
    return;
  }
  if(!previous)setStatus('');
  if(room.loadingScore){
    ticker.stop();
    transportState.textContent = 'Cargando partitura…';
    updateControls();
    return;
  }
  if(room.ownerUid === adapter.uid){
    inviteLink.value = invitationFor(room.id);
    if(!previous)refreshSongs(shareSelect);
  }
  if(!room.song || !room.transport){
    updateControls();
    setStatus('Esperando que el director comparta un tema.');
    return;
  }
  const scoreChanged = room.scoreVersion
    ? target.scoreVersion !== room.scoreVersion
    : target.scoreSong !== room.song && (!target.scoreSong || JSON.stringify(target.scoreSong) !== JSON.stringify(room.song));
  if(!previous || scoreChanged){
    target.scoreVersion = room.scoreVersion;
    target.scoreSong = room.song;
    songTitle.textContent = room.song.nombre;
    if(room.ownerUid === adapter.uid){
      refreshSongs(shareSelect);
      if(currentSong(room.song.id))shareSelect.value = room.song.id;
      replaceOptions(sectionSelect,[['','Elegir sección'],...(room.song.secciones || []).map((s,i)=>[
        String(i),s.nombre + ' · ' + s.desde + '–' + s.hasta,
      ])],'');
      sectionSelect.disabled = !room.song.secciones?.length;
      from.max = to.max = room.song.notas.length;
    }
    renderScore(room.song);
  }
  const settings = [room.transport.bpm,room.transport.from,room.transport.to,room.transport.loop].join('|');
  if(scoreChanged || target.settings !== settings){
    target.settings = settings;
    const controls = room.transport;
    from.value = controls.from;
    to.value = controls.to;
    bpm.value = controls.bpm;
    loop.checked = controls.loop;
    const sectionIndex = (room.song.secciones || []).findIndex(s=>s.desde === controls.from && s.hasta === controls.to);
    sectionSelect.value = sectionIndex < 0 ? '' : String(sectionIndex);
    highlightRange(controls);
  }
  updateControls();
  renderTransport(target);
}

function renderTransport(target){
  if(!target.room?.song || target.room.closed || target.room.loadingScore)return;
  if(!networkReady()){
    ticker.stop();
    transportState.textContent = 'Sin conexión con la sala';
    return;
  }
  if(!Number.isFinite(target.offset)){
    transportState.textContent = target.clockFailed ? 'Sincronización pendiente' : 'Sincronizando el metrónomo…';
    if(!target.clockFailed)calibrate();
    return;
  }
  const {song,transport} = target.room;
  target.positionEnded = null;
  ticker.set(transport,song.estudio.meter,target.offset);
  showPosition(root.KernnelRoomClock.position(transport,song.estudio.meter,Date.now()+target.offset));
}

async function calibrate(){
  const target = visit;
  if(!target || target.clockJob || !target.room?.song || target.room.closed || !networkReady())return;
  const matchingAdapter = adapter;
  target.clockFailed = false;
  target.offset = null;
  ticker.stop();
  transportState.textContent = 'Sincronizando el metrónomo…';
  updateControls();
  const job = Promise.resolve().then(()=>matchingAdapter.clockOffset(target.id));
  target.clockJob = job;
  try {
    const offset = await job;
    if(visit !== target || target.clockJob !== job)return;
    if(!Number.isFinite(offset))throw new Error('No se pudo obtener la hora de la sala.');
    target.offset = offset;
    if(status.classList.contains('room-error'))setStatus('');
    renderTransport(target);
  } catch(error) {
    if(visit === target && target.clockJob === job){
      target.clockFailed = true;
      transportState.textContent = 'Sincronización pendiente';
      setStatus(errorText(error,'No se pudo sincronizar el metrónomo.'),true);
    }
  } finally {
    if(visit === target && target.clockJob === job){
      target.clockJob = null;
      updateControls();
    }
  }
}

function highlightRange(transport){
  for(const [number,entry] of measures){
    entry.card.classList.toggle('room-in-range',number >= transport.from && number <= transport.to);
  }
}

function renderScore(song){
  const fragment = document.createDocumentFragment();
  const count = Number(song.estudio.meter.split('/')[0]) || 4;
  const glyph = song.estudio.meter.endsWith('/8') ? NOTE8 : NOTE4;
  measures.clear();
  activeMeasure = activeBeat = null;
  song.notas.forEach((comment,index)=>{
    const number = index + 1;
    const name = song.nombres?.[index];
    const card = mk('article',{class:'room-measure','aria-label':'Compás '+number});
    card.append(mk('h4',{text:'Compás '+number+(name ? ' · '+name : '')}));
    for(const section of song.secciones || []){
      if(number < section.desde || number > section.hasta)continue;
      const tag = mk('small',{class:'room-section-tag',text:section.nombre});
      if(COLOR.test(section.color))tag.style.setProperty('--room-section-color',section.color);
      card.append(tag);
    }
    const beats = [];
    const details = mk('details',{class:'room-annotations'},[mk('summary',{text:'Anotaciones'})]);
    if(comment)details.append(mk('p',{text:comment}));
    const beatStrip = mk('div',{class:'room-beats','aria-label':'Pulsos del compás'});
    for(let step=0;step<count;step++){
      const segment = song.tiempos?.[index]?.[step];
      const beat = mk('span',{class:'room-beat','aria-label':'Pulso '+(step+1),html:glyph});
      if(COLOR.test(segment?.color))beat.style.setProperty('--room-pulse-color',segment.color);
      beats.push(beat);
      beatStrip.append(beat);
      const hasImage = typeof segment?.img === 'string' && INLINE_IMAGE.test(segment.img);
      if(segment?.txt || hasImage){
        details.append(mk('p',{text:'Pulso '+(step+1)+(segment.txt ? ' · '+segment.txt : '')}));
        if(hasImage)details.append(mk('img',{src:segment.img,alt:'Imagen del pulso '+(step+1),loading:'lazy'}));
      }
    }
    card.append(beatStrip);
    if(details.childElementCount > 1)card.append(details);
    fragment.append(card);
    measures.set(number,{card,beats});
  });
  score.replaceChildren(fragment);
}

function showPosition(position){
  const transport = visit?.room?.transport;
  if(!position || !transport || visit.room.closed || visit.room.loadingScore || !networkReady())return;
  const label = position.waiting ? 'A punto de comenzar'
    : position.ended ? 'Tramo terminado'
    : transport.mode === 'paused' ? 'En pausa'
    : transport.mode === 'ready' ? 'Listo para practicar'
    : 'En reproducción';
  const stateText = label + ' · Compás ' + position.measure + ', pulso ' + (position.beat+1) + ' · ' + transport.bpm + ' BPM';
  if(transportState.textContent !== stateText)transportState.textContent = stateText;
  const endedChanged = visit.positionEnded !== position.ended;
  visit.positionEnded = position.ended;
  if(ownedRoom()){
    if(endedChanged)updateControls();
    playButton.textContent = transport.mode === 'paused' ? 'Reanudar' : 'Reproducir';
  }

  const entry = measures.get(position.measure);
  const nextMeasure = entry?.card;
  const nextBeat = entry?.beats[position.beat];
  if(activeMeasure !== nextMeasure){
    activeMeasure?.classList.remove('room-active-measure');
    activeMeasure = nextMeasure;
    activeMeasure?.classList.add('room-active-measure');
    if(nextMeasure && transport.mode === 'playing'){
      const panel = score.getBoundingClientRect();
      const card = nextMeasure.getBoundingClientRect();
      if(card.top < panel.top || card.bottom > panel.bottom)score.scrollTop += card.top-panel.top;
    }
  }
  if(activeBeat !== nextBeat){
    activeBeat?.classList.remove('room-active-beat');
    activeBeat = nextBeat;
    activeBeat?.classList.add('room-active-beat');
  }
}

async function enableAudio(){
  if(audioEnabled)return;
  const current = visit;
  if(!current?.room){
    setStatus('Entra a una sala para activar el metrónomo.');
    return;
  }
  try {
    const enabled = await ticker.enableAudio();
    if(!enabled || visit !== current)return;
    audioEnabled = true;
    updateControls();
  } catch(error) {
    audioError(error);
  }
}

function audioError(error){
  audioEnabled = false;
  updateControls();
  setStatus(errorText(error,'No se pudo activar el metrónomo en este dispositivo.'),true);
}

function readSettings(){
  const total = visit.room.song.notas.length;
  const a = from.valueAsNumber, b = to.valueAsNumber, tempo = bpm.valueAsNumber;
  if(!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a || b > total ||
     !Number.isInteger(tempo) || tempo < 30 || tempo > 300){
    setStatus('Elige un tramo válido y un tempo entre 30 y 300 BPM.',true);
    return null;
  }
  return {from:a,to:b,bpm:tempo,loop:loop.checked};
}

function send(transport){
  if(!ownedRoom())return;
  const {id} = visit;
  return execute(async valid=>{
    setStatus('');
    await adapter.updateTransport(id,transport);
    if(valid())setStatus('');
  },'No se pudo actualizar la reproducción.');
}

function play(){
  if(!ownedRoom() || !Number.isFinite(visit.offset))return;
  const options = readSettings();
  if(!options)return;
  const {song,transport} = visit.room;
  const sameRange = options.from === transport.from && options.to === transport.to && options.loop === transport.loop;
  const resumeAt = sameRange && transport.mode === 'paused' ? transport.startBeat : 0;
  if(!audioEnabled)enableAudio();
  return send(readyTransport(song,{
    ...options,mode:'playing',startBeat:resumeAt,startsAt:Math.round(Date.now()+visit.offset+1600),
  }));
}

function pause(){
  if(!ownedRoom() || visit.room.transport.mode !== 'playing' || !Number.isFinite(visit.offset))return;
  const {song,transport} = visit.room;
  const position = root.KernnelRoomClock.position(transport,song.estudio.meter,Date.now()+visit.offset);
  return send({...transport,mode:'paused',startBeat:position.index,startsAt:0});
}

function stop(){
  if(!ownedRoom())return;
  return send({...visit.room.transport,mode:'ready',startBeat:0,startsAt:0});
}

function shareTheme(){
  if(!ownedRoom())return;
  const song = currentSong(shareSelect.value);
  if(!song)return;
  const {id} = visit;
  return execute(async valid=>{
    setStatus('Compartiendo el tema…');
    await adapter.shareSong(id,sharedSong(song),readyTransport(song));
    if(valid())setStatus('');
  },'No se pudo compartir ese tema.');
}

function finish(){
  if(!ownedRoom() || !confirm('¿Cerrar esta sala para todos los participantes?'))return;
  const {id} = visit;
  return execute(async valid=>{
    await adapter.closeRoom(id);
    if(valid())setURL(null);
  },'No se pudo cerrar la sala.');
}

async function copyLink(){
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    if(ownedRoom())setStatus('Enlace copiado. Compártelo con las personas invitadas.');
  } catch {
    inviteLink.focus();
    inviteLink.select();
    setStatus('Selecciona y copia el enlace para compartirlo.');
  }
}

createForm.addEventListener('submit',event=>{
  event.preventDefault();
  const name = roomName.value.trim(), song = currentSong(newRoomSong.value);
  const emails = [...new Set(invitees.value.toLowerCase().split(/[\n,;]+/).map(address=>address.trim()).filter(Boolean))];
  if(!name || !song || emails.length < 1 || emails.length > MAX_INVITEES || emails.some(email=>!EMAIL_PATTERN.test(email))){
    setStatus('Escribe un nombre, elige un tema e ingresa de 1 a '+MAX_INVITEES+' correos válidos.',true);
    return;
  }
  execute(async valid=>{
    setStatus('Creando la sala…');
    const id = await adapter.createRoom({name,invitees:emails,song:sharedSong(song),transport:readyTransport(song)});
    if(valid())enter(id);
  },'No se pudo crear la sala.');
});

joinForm.addEventListener('submit',event=>{
  event.preventDefault();
  const id = roomId(joinCode.value);
  if(!id){setStatus('El enlace de invitación no es válido.',true);return;}
  if(adapter && networkReady())enter(id);
});

sectionSelect.addEventListener('change',()=>{
  if(!sectionSelect.value)return;
  const section = visit?.room?.song?.secciones?.[Number(sectionSelect.value)];
  if(section){
    from.value = section.desde;
    to.value = section.hasta;
  }
});
for(const input of [from,to])input.addEventListener('input',()=>{sectionSelect.value = '';});
settingsForm.addEventListener('submit',event=>{
  event.preventDefault();
  if(!ownedRoom())return;
  const options = readSettings();
  if(options)send(readyTransport(visit.room.song,options));
});

for(const combo of [newRoomSong,shareSelect]){
  combo.addEventListener('focus',()=>refreshSongs(combo));
  combo.addEventListener('change',updateControls);
}
dialog.addEventListener('cancel',event=>{event.preventDefault();leave();});
root.addEventListener('kernnel-change',()=>{
  if(!dialog.open)return;
  refreshSongs(visit?.room ? shareSelect : newRoomSong);
  updateControls();
});
root.addEventListener('online',()=>{
  if(visit?.room && !visit.room.closed){
    visit.clockJob = null;
    calibrate();
  }else if(dialog.open && !visit)showLobby();
});
root.addEventListener('offline',()=>{
  if(adapter?.demo)return;
  if(visit){
    visit.offset = null;
    visit.clockJob = null;
    ticker.stop();
    transportState.textContent = 'Sin conexión con la sala';
  }else if(dialog.open)showLobby();
  updateControls();
});

root.KernnelRooms = Object.freeze({connect,disconnect,open});
})(window);
