/* Kernnel 2.0 — navegación y repertorios. Sin modificaciones del formato de datos. */
'use strict';
const NO_REPERTOIRE_V2='__sin_repertorio__';

function songRepertoiresV2(songId){
  return D.repertorios.filter(r=>r.songs.includes(songId));
}
function originForSongV2(songId){
  const chosen=D.repertorios.find(r=>r.id===ui.originRep&&r.songs.includes(songId));
  return chosen?.id||songRepertoiresV2(songId)[0]?.id||NO_REPERTOIRE_V2;
}
function setViewV2(view){
  if(view!=='home'&&!current()){toast('Selecciona una canción para continuar.');return}
  stopMetro();
  ui.view=view;
  ui.study=view==='study';
  ui.studyMenu=false;
  ui.mobileMenu=false;
  $('sidebar').classList.remove('show-mobile');
  $('mobile-menu').setAttribute('aria-expanded','false');
  applyPrefs();
  renderAll();
  if(view==='study')manageWake();
  window.scrollTo({top:0,behavior:'auto'});
}
function chooseSongV2(id,view,repId){
  if(!D.temas.some(t=>t.id===id))return;
  stopMetro();
  D.sel=id;
  ui.originRep=repId??originForSongV2(id);
  ui.homeFocusSong=id;
  if(!Array.isArray(ui.homeOpenReps))ui.homeOpenReps=[];
  if(!ui.homeOpenReps.includes(ui.originRep))ui.homeOpenReps.push(ui.originRep);
  initSelection();
  save();
  setViewV2(view);
}
function returnToRepertoireV2(){
  if($('home-create').open){$('home-create').open=false;ui.createExpanded=false}
  const id=current()?.id;
  if(id){
    const origin=originForSongV2(id);
    ui.originRep=origin;
    ui.homeFocusSong=id;
    if(!ui.homeOpenReps.includes(origin))ui.homeOpenReps.push(origin);
  }
  setViewV2('home');
}
function updateNavigationV2(){
  document.body.classList.toggle('home',ui.view==='home');
  document.body.classList.toggle('edit',ui.view==='edit');
  document.body.classList.toggle('study',ui.view==='study');
  const enabled=!!current();
  [['home','nav-home'],['edit','nav-edit'],['study','nav-study']].forEach(([view,id])=>{
    const el=$(id);
    if(!el)return;
    el.classList.toggle('is-current',ui.view===view);
    if(ui.view===view)el.setAttribute('aria-current','page');
    else el.removeAttribute('aria-current');
    if(view!=='home')el.disabled=!enabled;
  });
}
function renderHomeV2(){
  const container=$('home-repertories');
  if(!container)return;
  container.replaceChildren();
  const unassigned=D.temas.filter(t=>!D.repertorios.some(r=>r.songs.includes(t.id)));
  const groups=[...D.repertorios.map(r=>({id:r.id,nombre:r.nombre,songs:r.songs.map(id=>D.temas.find(t=>t.id===id)).filter(Boolean)})),{id:NO_REPERTOIRE_V2,nombre:'Canciones sin repertorio',songs:unassigned}];
  groups.forEach(g=>{
    const open=ui.homeOpenReps.includes(g.id);
    const card=mk('section',{class:'home-rep-card'+(ui.createExpanded?' compact':'')+(open&&!ui.createExpanded?' is-open':'')});
    const heading=mk('button',{type:'button',class:'home-rep-heading','aria-expanded':String(open&&!ui.createExpanded),'aria-label':'Repertorio '+g.nombre+', '+g.songs.length+' canciones'});
    heading.append(mk('span',{class:'home-rep-label'},[mk('strong',{text:g.nombre}),mk('small',{text:g.songs.length+' canción(es)'})]),mk('span',{class:'home-rep-arrow',text:open&&!ui.createExpanded?'⌃':'⌄'}));
    heading.addEventListener('click',()=>{
      const wasCreating=ui.createExpanded;
      if(wasCreating){$('home-create').open=false;ui.createExpanded=false}
      ui.homeOpenReps=wasCreating||!open?[...new Set([...ui.homeOpenReps,g.id])]:ui.homeOpenReps.filter(x=>x!==g.id);
      renderHomeV2();
    });
    card.append(heading);
    if(open&&!ui.createExpanded){
      const songs=mk('div',{class:'home-rep-songs'});
      if(!g.songs.length)songs.append(info('Este repertorio no tiene canciones.'));
      g.songs.forEach(t=>{
        const row=mk('div',{class:'home-song'+(ui.homeFocusSong===t.id?' last-song':'')});
        const entry=button(t.nombre,()=>chooseSongV2(t.id,'study',g.id),'home-song-open',{title:'Estudiar '+t.nombre});
        const edit=button('Editar',()=>chooseSongV2(t.id,'edit',g.id),'home-song-edit',{title:'Editar '+t.nombre,'aria-label':'Editar '+t.nombre});
        row.append(entry,edit);
        songs.append(row);
      });
      card.append(songs);
    }
    container.append(card);
  });
}
function renderCreateChoicesV2(){
  const box=$('new-song-repertoires');
  if(!box)return;
  box.replaceChildren();
  const options=[...D.repertorios,...ui.pendingReps];
  if(!options.length)box.append(info('Aún no hay repertorios. Puedes crear uno aquí mismo.'));
  for(const r of options){
    const pending=ui.pendingReps.some(x=>x.id===r.id);
    const cb=mk('input',{type:'checkbox',value:r.id,checked:ui.createReps.includes(r.id)});
    cb.addEventListener('change',()=>{
      ui.createReps=cb.checked?[...new Set([...ui.createReps,r.id])]:ui.createReps.filter(id=>id!==r.id);
      $('create-reps-count').textContent=String(ui.createReps.length);
    });
    box.append(mk('label',{class:'new-song-rep-option'},[cb,mk('span',{text:r.nombre+(pending?' · nuevo':'')})]));
  }
  $('create-reps-count').textContent=String(ui.createReps.length);
}
function addPendingRepertoireV2(){
  const input=$('new-repertoire-title'),nombre=input.value.trim();
  if(!nombre){toast('Escribe el nombre del nuevo repertorio.');input.focus();return}
  if(nombre.length>120){toast('El nombre supera los 120 caracteres.');return}
  const norm=s=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  if([...D.repertorios,...ui.pendingReps].some(r=>norm(r.nombre)===norm(nombre))){
    toast('Ya existe un repertorio con ese nombre.');input.focus();return;
  }
  const rep={id:uniqueId('r'),nombre,songs:[]};
  ui.pendingReps.push(rep);
  ui.createReps.push(rep.id);
  input.value='';
  $('new-repertoire-inline').hidden=true;
  $('new-repertoire-toggle').setAttribute('aria-expanded','false');
  renderCreateChoicesV2();
  toast('Repertorio agregado al formulario. Se guardará al crear la canción.');
}
function onCreateSongV2(e){
  e.preventDefault();
  if(!loadedStorage){toast('Espera a que termine la carga de tus canciones.');return}
  const input=$('song-new-title'),name=input.value.trim(),count=Number($('song-new-count').value),meter=$('song-new-meter').value;
  if(!name){toast('Escribe un título para la canción.');input.focus();return}
  if(!Number.isInteger(count)||count<1||count>256){toast('Elige entre 1 y 256 compases.');return}
  if(!METERS.includes(meter)){toast('La métrica indicada no está disponible.');return}
  const ids=new Set(ui.createReps);
  // Una única transacción lógica: repertorios pendientes y canción se incorporan juntos.
  ui.pendingReps.filter(r=>ids.has(r.id)).forEach(r=>D.repertorios.push({id:r.id,nombre:r.nombre,songs:[]}));
  const t=newSong(name,count,meter);
  stopMetro();
  D.temas.push(t);
  D.repertorios.forEach(r=>{if(ids.has(r.id)&&!r.songs.includes(t.id))r.songs.push(t.id)});
  D.sel=t.id;
  ui.originRep=D.repertorios.find(r=>ids.has(r.id))?.id||NO_REPERTOIRE_V2;
  ui.homeFocusSong=t.id;
  if(!ui.homeOpenReps.includes(ui.originRep))ui.homeOpenReps.push(ui.originRep);
  ui.query='';
  $('song-search').value='';
  ui.rep='all';
  ui.pendingReps=[];
  ui.createReps=[];
  $('home-create').open=false;
  ui.createExpanded=false;
  input.value='';
  $('new-repertoire-title').value='';
  $('new-repertoire-inline').hidden=true;
  $('new-repertoire-toggle').setAttribute('aria-expanded','false');
  initSelection();
  save();
  setViewV2('edit');
  toast('Canción creada y asociada a '+(ids.size?ids.size+' repertorio(s).':'«Canciones sin repertorio».'));
}
function renderV2(){
  updateNavigationV2();
  renderHomeV2();
  renderCreateChoicesV2();
}
function initV2(){
  // La biblioteca inicia en Inicio, y el formulario de repertorios no guarda nada hasta crear canción.
  ui.view='home';
  ui.study=false;
  ui.homeOpenReps=[];
  ui.createReps=[];
  ui.pendingReps=[];
  ui.createExpanded=false;
  ui.homeFocusSong=null;
  const create=$('home-create');
  create.addEventListener('toggle',()=>{
    ui.createExpanded=create.open;
    renderHomeV2();
  });
  $('new-repertoire-toggle').addEventListener('click',()=>{
    const row=$('new-repertoire-inline');
    row.hidden=!row.hidden;
    $('new-repertoire-toggle').setAttribute('aria-expanded',String(!row.hidden));
    if(!row.hidden)$('new-repertoire-title').focus();
  });
  $('new-repertoire-add').addEventListener('click',addPendingRepertoireV2);
  $('new-repertoire-title').addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();addPendingRepertoireV2()}
  });
  $('nav-home').addEventListener('click',()=>{
    if(ui.view==='study')returnToRepertoireV2();
    else setViewV2('home');
  });
  $('nav-edit').addEventListener('click',()=>setViewV2('edit'));
  $('nav-study').addEventListener('click',()=>{
    if(current())ui.originRep=originForSongV2(current().id);
    setViewV2('study');
  });
  $('study-to-edit').addEventListener('click',()=>setViewV2('edit'));
  $('study-to-repertoire').addEventListener('click',returnToRepertoireV2);
  document.querySelectorAll('.sidebar .accordion').forEach(el=>{
    el.addEventListener('toggle',()=>{
      if(el.open)document.querySelectorAll('.sidebar .accordion').forEach(other=>{
        if(other!==el)other.open=false;
      });
    });
  });
  updateNavigationV2();
  renderHomeV2();
  renderCreateChoicesV2();
}
initV2();
