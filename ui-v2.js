/* Kernnel 2.0 — navegación y repertorios. Sin modificaciones del formato de datos. */
'use strict';
const NO_REPERTOIRE_V2='__sin_repertorio__';
let pendingEditNavigationV2=null;

function conflictLabelV2(item){const c=item.syncConflict;return c?'Duplicada por conflicto · Última modificación: '+new Date(c.localModifiedAt).toLocaleString('es-CL')+' · Otra versión: '+new Date(c.remoteModifiedAt).toLocaleString('es-CL'):'';}
function modificationLabelV2(item,kind){const at=D._sync?.times?.[kind+'~'+encodeURIComponent(item.id)]||D._sync?.base?.[kind+'~'+encodeURIComponent(item.id)]?.modifiedAt;return at?'Última modificación: '+new Date(at).toLocaleString('es-CL'):'';}
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
  ui.sidebarCollapsed=true;
  ui.homeSidebarOpen=view==='home';
  ui.mobileMenu=view==='home';
  $('sidebar').classList.toggle('show-mobile',view==='home');
  $('mobile-menu').setAttribute('aria-expanded',String(view==='home'));
  applyPrefs();
  renderAll();
  if(view==='study')manageWake();
  window.scrollTo({top:0,behavior:'auto'});
}
function chooseSongV2(id,view,repId){
  if(!D.temas.some(t=>t.id===id))return;
  if(ui.view==='edit'&&current()?.id!==id&&!chooseSongV2.approved){
    confirmLeaveEditV2(()=>{chooseSongV2.approved=true;try{chooseSongV2(id,view,repId)}finally{chooseSongV2.approved=false}});
    return;
  }
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
function confirmLeaveEditV2(action){
  if(ui.view!=='edit'||!current()){action();return}
  if(!loadedStorage||editCheckpoint?.saving){toast('Espera a que termine el guardado.');return}
  pendingEditNavigationV2=action;
  $('leave-edit-status').textContent='';
  $('leave-edit-dialog').showModal();
}
function completeEditNavigationV2(){
  const action=pendingEditNavigationV2;
  pendingEditNavigationV2=null;
  $('leave-edit-dialog').close();
  action?.();
}
function discardAndLeaveEditV2(){
  const t=current(),checkpoint=editCheckpoint;
  if(!t||!checkpoint||t.id!==checkpoint.song.id){completeEditNavigationV2();return}
  stopMetro();
  D.temas[D.temas.indexOf(t)]=clone(checkpoint.song);
  D.papelera=D.papelera.filter(item=>!checkpoint.deletedMeasures.has(item.id));
  checkpoint.deletedMeasures.clear();
  initSelection();
  save(true,saved=>{
    if(saved)completeEditNavigationV2();
    else $('leave-edit-status').textContent='No fue posible restaurar y guardar en este equipo. No se abandonó Edición.';
  });
}
function saveAndLeaveEditV2(){
  if(!editCheckpoint){completeEditNavigationV2();return}
  $('leave-edit-status').textContent='Guardando cambios…';
  saveSongEdits(saved=>{
    if(saved)completeEditNavigationV2();
    else $('leave-edit-status').textContent='No se pudieron guardar los cambios. Prueba nuevamente o cancela.';
  });
}
function openRepertoirePickerV2(){
  const list=$('repertoire-picker-list');
  list.replaceChildren();
  if(!D.repertorios.length)list.append(info('Todavía no tienes repertorios. Puedes crear uno desde Inicio.'));
  for(const rep of D.repertorios){
    list.append(button(rep.nombre+' · '+rep.songs.length+' canción(es)',()=>{
      $('repertoire-picker').close();
      confirmLeaveEditV2(()=>goToRepertoireV2(rep.id));
    },'repertoire-picker-option'));
  }
  const orphans=D.temas.filter(t=>!D.repertorios.some(r=>r.songs.includes(t.id)));
  if(orphans.length)list.append(button('Canciones sin repertorio · '+orphans.length,()=>{
    $('repertoire-picker').close();
    confirmLeaveEditV2(()=>goToRepertoireV2(NO_REPERTOIRE_V2));
  },'repertoire-picker-option'));
  $('repertoire-picker').showModal();
}
function goToRepertoireV2(repId){
  ui.homeOpenReps=[repId];
  ui.homeFocusSong=null;
  ui.originRep=repId;
  setViewV2('home');
  requestAnimationFrame(()=>{
    const el=[...document.querySelectorAll('.home-rep-card')].find(node=>node.dataset.repertoireId===repId);
    el?.scrollIntoView({behavior:'smooth',block:'center'});
  });
}
function createRepertoireV2(name){
  if(!loadedStorage){toast('Espera a que termine la carga de tus datos.');return false}
  const nombre=String(name||'').trim();
  if(!nombre||nombre.length>120){toast('Escribe un nombre de repertorio válido (máximo 120 caracteres).');return false}
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL');
  if(D.repertorios.some(r=>norm(r.nombre)===norm(nombre))){toast('Ya existe un repertorio con ese nombre.');return false}
  const r={id:uniqueId('r'),nombre,songs:[]};
  D.repertorios.push(r);
  ui.homeOpenReps=[r.id];
  ui.originRep=r.id;
  ui.homeFocusSong=null;
  ui.rep='all';
  save();
  renderAll();
  toast('Repertorio creado: '+nombre);
  return true;
}
function deleteSongByIdV2(id){
  const t=D.temas.find(song=>song.id===id);
  if(!t)return;
  if(!confirm('¿Eliminar «'+t.nombre+'» de toda la biblioteca y de todos sus repertorios? Podrás restaurarla desde la papelera.'))return;
  stopMetro();
  const repertoireIds=D.repertorios.filter(r=>r.songs.includes(id)).map(r=>r.id);
  D.papelera.push({id:uniqueId('trash'),type:'song',value:clone(t),repertoireIds,at:Date.now()});
  D.temas=D.temas.filter(song=>song.id!==id);
  D.repertorios.forEach(r=>{r.songs=r.songs.filter(songId=>songId!==id)});
  if(D.sel===id){D.sel=D.temas[0]?.id||null;initSelection()}
  ui.homeFocusSong=null;
  editCheckpoint=null;
  save();
  renderAll();
  toast('Canción movida a la papelera.');
}
function updateNavigationV2(){
  document.body.classList.toggle('home',ui.view==='home');
  document.body.classList.toggle('edit',ui.view==='edit');
  document.body.classList.toggle('study',ui.view==='study');
  $('nav-repertoires').hidden=ui.view==='home';
  const enabled=D.temas.length>0;
  [['home','nav-home'],['edit','nav-edit'],['study','nav-study']].forEach(([view,id])=>{
    const el=$(id);
    if(!el)return;
    el.classList.toggle('is-current',ui.view===view);
    if(ui.view===view)el.setAttribute('aria-current','page');
    else el.removeAttribute('aria-current');
    if(view!=='home')el.disabled=ui.view==='home'?!enabled:!current();
  });
}
function renderHomeV2(){
  const container=$('home-repertories');
  if(!container)return;
  container.replaceChildren();
  const unassigned=D.temas.filter(t=>!D.repertorios.some(r=>r.songs.includes(t.id)));
  const groups=[...D.repertorios.map(r=>({id:r.id,nombre:r.nombre,syncConflict:r.syncConflict,songs:r.songs.map(id=>D.temas.find(t=>t.id===id)).filter(Boolean)})),{id:NO_REPERTOIRE_V2,nombre:'Canciones sin repertorio',songs:unassigned}];
  groups.forEach(g=>{
    const open=ui.homeOpenReps.includes(g.id);
    const card=mk('section',{class:'home-rep-card'+(ui.createExpanded?' compact':'')+(open&&!ui.createExpanded?' is-open':''),'data-repertoire-id':g.id});
    const heading=mk('button',{type:'button',class:'home-rep-heading','aria-expanded':String(open&&!ui.createExpanded),'aria-label':'Repertorio '+g.nombre+', '+g.songs.length+' canciones'});
    heading.append(mk('span',{class:'home-rep-label'},[mk('strong',{text:g.nombre}),mk('small',{text:g.songs.length+' canción(es)'})]),mk('span',{class:'home-rep-arrow',text:open&&!ui.createExpanded?'⌃':'⌄'}));
    heading.addEventListener('click',()=>{
      const wasCreating=ui.createExpanded;
      if(wasCreating){$('home-create').open=false;ui.createExpanded=false}
      ui.homeOpenReps=wasCreating||!open?[...new Set([...ui.homeOpenReps,g.id])]:ui.homeOpenReps.filter(x=>x!==g.id);
      renderHomeV2();
    });
    card.append(heading);if(g.syncConflict)card.append(mk('small',{class:'conflict-notice',text:conflictLabelV2(g)}));else if(modificationLabelV2(g,'repertorios'))card.append(mk('small',{class:'modification-date',text:modificationLabelV2(g,'repertorios')}));
    if(open&&!ui.createExpanded){
      const songs=mk('div',{class:'home-rep-songs'});
      if(!g.songs.length)songs.append(info('Este repertorio no tiene canciones.'));
      g.songs.forEach(t=>{
        const row=mk('div',{class:'home-song'+(ui.homeFocusSong===t.id?' last-song':'')});
        const study=button('Estudiar',()=>chooseSongV2(t.id,'study',g.id),'home-song-edit',{'aria-label':'Estudiar '+t.nombre});
        const edit=button('Editar',()=>chooseSongV2(t.id,'edit',g.id),'home-song-edit',{title:'Editar '+t.nombre,'aria-label':'Editar '+t.nombre});
        const remove=button('Eliminar',()=>deleteSongByIdV2(t.id),'home-song-delete',{'aria-label':'Eliminar '+t.nombre,title:'Mover a la papelera (se elimina de todos los repertorios)'});
        row.append(mk('strong',{class:'home-song-name',text:t.nombre}),study,edit,remove);if(t.syncConflict)row.append(mk('small',{class:'conflict-notice',text:conflictLabelV2(t)}));else if(modificationLabelV2(t,'temas'))row.append(mk('small',{class:'modification-date',text:modificationLabelV2(t,'temas')}));
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
  ui.pendingReps.filter(r=>ids.has(r.id)).forEach(r=>D.repertorios.push({id:r.id,nombre:r.nombre,syncConflict:r.syncConflict,songs:[]}));
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
function openModeV2(view){
  if(ui.view!=='home'){
    setViewV2(view);
    return;
  }
  const picker=$('song-picker');
  $('song-picker-title').textContent=view==='study'?'Selecciona un tema para estudiar':'Selecciona un tema para editar';
  const list=$('song-picker-list');
  list.replaceChildren();
  for(const song of D.temas){
    list.append(button(song.nombre,()=>{
      picker.close();
      chooseSongV2(song.id,view);
    },'song-picker-option'));
  }
  picker.showModal();
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
  ui.homeSidebarOpen=true;
  ui.sidebarCollapsed=true;
  ui.mobileMenu=true;
  $('sidebar').classList.add('show-mobile');
  $('mobile-menu').setAttribute('aria-expanded','true');
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
  $('home-create-repertoire').addEventListener('submit',e=>{
    e.preventDefault();
    const input=$('home-repertoire-name');
    if(createRepertoireV2(input.value))input.value='';
  });
  $('repertoire-picker-close').addEventListener('click',()=>$('repertoire-picker').close());
  $('nav-repertoires').addEventListener('click',openRepertoirePickerV2);
  $('leave-edit-cancel').addEventListener('click',()=>{
    pendingEditNavigationV2=null;
    $('leave-edit-dialog').close();
  });
  $('leave-edit-dialog').addEventListener('close',()=>{pendingEditNavigationV2=null});
  $('leave-edit-save').addEventListener('click',saveAndLeaveEditV2);
  $('leave-edit-discard').addEventListener('click',discardAndLeaveEditV2);
  $('nav-home').addEventListener('click',()=>{
    confirmLeaveEditV2(()=>ui.view==='study'?returnToRepertoireV2():setViewV2('home'));
  });
  $('nav-edit').addEventListener('click',()=>openModeV2('edit'));
  $('nav-study').addEventListener('click',()=>confirmLeaveEditV2(()=>openModeV2('study')));
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
