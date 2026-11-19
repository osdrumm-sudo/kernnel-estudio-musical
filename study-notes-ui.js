/* Notas personales de canciones en Inicio y Estudio. */
(function(root){
'use strict';

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ['image/png','image/jpeg','image/webp','image/gif','image/avif','image/bmp'];
const PDF_TYPE = 'application/pdf';
const FILE_TYPES = [...IMAGE_TYPES, PDF_TYPE];
const EXTENSION_TYPES = new Map([
  ['png','image/png'], ['jpg','image/jpeg'], ['jpeg','image/jpeg'], ['webp','image/webp'],
  ['gif','image/gif'], ['avif','image/avif'], ['bmp','image/bmp'], ['pdf',PDF_TYPE],
]);

const list = document.getElementById('study-notes-repertoires');
const syncStatus = mk('small',{class:'study-note-sync-status',role:'status',hidden:true});
list?.before(syncStatus);
const dialog = mk('dialog',{id:'study-note-dialog','aria-labelledby':'study-note-title'});
const heading = mk('h2',{id:'study-note-title',text:'Nota de la canción'});
const songName = mk('p',{class:'study-note-song-name'});
const textarea = mk('textarea',{id:'study-note-text',rows:5,maxlength:12000,autofocus:true});
const fileInput = mk('input',{id:'study-note-file',type:'file',accept:FILE_TYPES.join(',')});
const fileLabel = mk('label',{class:'field'},[
  mk('span',{text:'Adjunto opcional'}),
  fileInput,
  mk('small',{text:'Imagen (PNG, JPEG, WebP, GIF, AVIF o BMP) o PDF. Máximo 3 MB.'}),
]);
const preview = mk('img',{class:'study-note-preview',alt:'Vista previa del adjunto',hidden:true});
const download = mk('a',{class:'study-note-download'});
const remove = button('Quitar adjunto',removeAttachment);
const attachmentBox = mk('div',{class:'study-note-attachment',hidden:true},[
  preview,
  mk('div',{class:'study-note-file-actions'}, [download, remove]),
]);
const status = mk('p',{class:'study-note-status',role:'status'});
const cancel = button('Cancelar', () => dialog.close());
const saveButton = mk('button',{class:'primary',type:'submit',text:'Guardar nota'});
const form = mk('form',{},[
  heading, songName,
  mk('label',{class:'field'},[mk('span',{text:'Nota'}),textarea]),
  fileLabel, attachmentBox, status,
  mk('div',{class:'dialog-actions'},[cancel,saveButton]),
]);
dialog.append(form);
document.body.append(dialog);

const viewDialog = mk('dialog',{id:'study-note-view','aria-labelledby':'study-note-view-title'});
const viewSongName = mk('p',{class:'study-note-song-name'});
const viewText = mk('p',{class:'study-note-view-text'});
const viewImage = mk('img',{class:'study-note-preview',alt:'Imagen adjunta a la nota',hidden:true});
const viewDownload = mk('a',{class:'study-note-download',hidden:true});
const viewError = mk('p',{class:'study-note-status',text:'No se pudo abrir el adjunto.',hidden:true});
const viewAttachment = mk('div',{class:'study-note-attachment',hidden:true},[viewImage,viewDownload,viewError]);
viewDialog.append(
  mk('h2',{id:'study-note-view-title',text:'Nota de la canción'}),
  viewSongName,
  viewText,
  viewAttachment,
  mk('div',{class:'dialog-actions'},[button('Cerrar',() => viewDialog.close(),'primary',{autofocus:true})]),
);
document.body.append(viewDialog);

let draft = null;
let attachmentUrl = '';
let viewUrl = '';
let renderedGroups = '';
const rows = new Map();

function data(){return root.KernnelStudyData}

function render(){
  if(!list)return;
  renderSyncStatus();
  const groups = homeSongGroupsV2();
  const structure = JSON.stringify(groups.map(group => [
    group.id, group.nombre, group.songs.map(song => [song.id,song.nombre]),
  ]));
  if(structure !== renderedGroups){
    const opened = new Set([...list.querySelectorAll('details[open]')].map(detail => detail.dataset.repertoireId));
    renderedGroups = structure;
    rows.clear();
    if(!groups.some(group => group.songs.length)){
      list.replaceChildren(mk('p',{class:'muted',text:'Crea una canción para agregarle una nota.'}));
      return;
    }
    list.replaceChildren(...groups.map(group => renderGroup(group,opened)));
  }
  const visited = new Set();
  for(const group of groups){
    for(const song of group.songs){
      if(visited.has(song.id))continue;
      visited.add(song.id);
      refreshSong(song);
    }
  }
}

function refreshSong(song){
  const entries = rows.get(song.id);
  if(!entries)return;
  const note = data()?.getNote(song.id);
  const label = note?.text?.trim() || note?.attachment ? 'Editar nota' : 'Agregar nota';
  const stats = studyStatsTextV2(song);
  for(const row of entries){
    if(row.action.textContent !== label){
      row.action.textContent = label;
      row.action.setAttribute('aria-label',label + ' de ' + song.nombre);
    }
    if(row.stats.textContent !== stats)row.stats.textContent = stats;
  }
}

function renderSyncStatus(){
  const message = {
    offline:'Sin conexión. Las notas y el avance se guardan en este dispositivo.',
    pending:'Sincronización de notas y avance pendiente.',
    error:'Las notas y el avance no se pudieron sincronizar.',
  }[data()?.getStatus?.()] || '';
  if(syncStatus.textContent !== message)syncStatus.textContent = message;
  syncStatus.hidden = !message;
}

function renderGroup(group,opened){
  const details = mk('details',{class:'study-notes-group'});
  details.dataset.repertoireId = group.id;
  details.open = opened.has(group.id);
  const summary = mk('summary',{},[
    mk('strong',{text:group.nombre}),
    mk('small',{text:group.songs.length === 1 ? '1 canción' : group.songs.length + ' canciones'}),
  ]);
  const songs = mk('ul',{class:'study-notes-songs'});
  for(const song of group.songs){
    const name = button(song.nombre,() => show(song.id),'study-note-name',{
      'aria-label':'Ver nota de ' + song.nombre,'aria-haspopup':'dialog','aria-controls':'study-note-view',
    });
    const stats = mk('small',{class:'study-note-stats'});
    const action = button('',() => openNote(song.id),'study-note-action');
    songs.append(mk('li',{},[mk('div',{class:'study-note-song'},[name,stats]),action]));
    if(!rows.has(song.id))rows.set(song.id,[]);
    rows.get(song.id).push({action,stats});
  }
  details.append(summary, group.songs.length ? songs
    : mk('p',{class:'study-notes-empty muted',text:'Este repertorio no tiene canciones.'}));
  return details;
}

function show(songId){
  const song = D.temas.find(item => item.id === songId);
  if(!song || !data() || viewDialog.open || dialog.open)return;
  clearView();
  const {text,attachment} = data().getNote(song.id);
  viewSongName.textContent = song.nombre;
  viewText.textContent = text?.trim() ? text : 'Esta canción todavía no tiene una nota.';
  viewText.hidden = !text?.trim() && Boolean(attachment);
  viewAttachment.hidden = !attachment;
  if(attachment){
    try{
      viewUrl = showAttachment(attachment,viewImage,viewDownload);
    }catch{
      viewError.hidden = false;
    }
  }
  viewDialog.showModal();
}

function clearView(){
  if(viewUrl)URL.revokeObjectURL(viewUrl);
  viewUrl = '';
  viewSongName.textContent = viewText.textContent = '';
  viewImage.removeAttribute('src');
  viewDownload.removeAttribute('href');
  viewDownload.removeAttribute('download');
  viewDownload.textContent = '';
  viewImage.hidden = viewDownload.hidden = viewError.hidden = viewAttachment.hidden = true;
}

function openNote(songId){
  const song = D.temas.find(item => item.id === songId);
  if(!song || !data() || dialog.open || viewDialog.open)return;
  const {text,attachment} = data().getNote(song.id);
  draft = {songId,attachment,selection:0,reading:false,saving:false};
  songName.textContent = song.nombre;
  textarea.value = text;
  fileInput.value = '';
  status.textContent = '';
  updateAttachment();
  updateControls();
  dialog.showModal();
}

function clearAttachmentPreview(){
  if(attachmentUrl)URL.revokeObjectURL(attachmentUrl);
  attachmentUrl = '';
  preview.hidden = true;
  preview.removeAttribute('src');
  download.removeAttribute('href');
  download.removeAttribute('download');
  attachmentBox.hidden = true;
}

function showAttachment(file,image,link){
  const prefix = 'data:' + file.type + ';base64,';
  const maxDataUrlLength = prefix.length + 4 * Math.ceil(MAX_ATTACHMENT_BYTES / 3);
  if(!FILE_TYPES.includes(file.type) || typeof file.dataUrl !== 'string' ||
    file.dataUrl.length > maxDataUrlLength || !file.dataUrl.startsWith(prefix)){
    throw new Error('Adjunto no válido');
  }
  const raw = atob(file.dataUrl.slice(prefix.length));
  if(!raw.length || raw.length > MAX_ATTACHMENT_BYTES)throw new Error('Adjunto no válido');
  const bytes = Uint8Array.from(raw,character => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes],{type:file.type}));
  link.hidden = false;
  link.href = url;
  link.download = file.name;
  link.textContent = 'Descargar ' + file.name;
  if(file.type !== PDF_TYPE){
    image.src = url;
    image.hidden = false;
  }
  return url;
}

function updateAttachment(){
  clearAttachmentPreview();
  const file = draft?.attachment;
  if(!file)return;
  attachmentBox.hidden = false;
  try{
    attachmentUrl = showAttachment(file,preview,download);
  }catch{
    status.textContent = 'No se pudo abrir el adjunto. Puedes quitarlo o reemplazarlo.';
    download.hidden = true;
  }
}

function updateControls(){
  saveButton.disabled = Boolean(draft?.reading || draft?.saving);
  fileInput.disabled = textarea.disabled = cancel.disabled = remove.disabled = Boolean(draft?.saving);
}

function removeAttachment(){
  if(!draft)return;
  draft.selection++;
  draft.reading = false;
  draft.attachment = null;
  fileInput.value = '';
  status.textContent = '';
  updateAttachment();
  updateControls();
  fileInput.focus();
}

function readAttachment(file,type){
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.addEventListener('load',() => resolve(reader.result),{once:true});
    reader.addEventListener('error',() => reject(reader.error),{once:true});
    reader.addEventListener('abort',reject,{once:true});
    reader.readAsDataURL(new Blob([file],{type}));
  });
}

fileInput.addEventListener('change',async () => {
  const editor = draft;
  const file = fileInput.files[0];
  if(!editor || !file)return;
  const selection = ++editor.selection;
  editor.reading = false;
  fileInput.value = '';
  status.textContent = '';
  const declared = file.type.toLowerCase();
  const suffix = (file.name.split('.').pop() || '').toLowerCase();
  const type = !declared || declared === 'application/octet-stream'
    ? EXTENSION_TYPES.get(suffix)
    : declared;
  if(!FILE_TYPES.includes(type))status.textContent = 'Selecciona una imagen compatible o un PDF.';
  else if(!file.size || file.size > MAX_ATTACHMENT_BYTES)status.textContent = 'El adjunto debe pesar entre 1 byte y 3 MB.';
  if(status.textContent){
    updateControls();
    return;
  }

  editor.reading = true;
  status.textContent = 'Leyendo adjunto…';
  updateControls();
  try{
    const dataUrl = await readAttachment(file,type);
    if(draft !== editor || editor.selection !== selection)return;
    editor.attachment = {name:file.name.slice(0,200),type,dataUrl};
    status.textContent = '';
    updateAttachment();
  }catch{
    if(draft === editor && editor.selection === selection)status.textContent = 'No se pudo leer el adjunto.';
  }finally{
    if(draft === editor && editor.selection === selection){
      editor.reading = false;
      updateControls();
    }
  }
});

form.addEventListener('submit',async event => {
  event.preventDefault();
  const editor = draft;
  if(!editor || editor.reading || editor.saving)return;
  if(!D.temas.some(song => song.id === editor.songId)){
    status.textContent = 'Esta canción ya no está en tu biblioteca.';
    return;
  }
  editor.saving = true;
  status.textContent = 'Guardando nota…';
  const note = {text:textarea.value,attachment:editor.attachment};
  updateControls();
  try{
    const saved = await data().saveNote(editor.songId,note);
    if(draft !== editor)return;
    if(saved === false)throw new Error('No se pudo guardar la nota.');
    dialog.close();
    toast('Nota guardada.');
  }catch(error){
    if(draft === editor)status.textContent = error.message || 'No se pudo guardar la nota.';
  }finally{
    if(draft === editor){
      editor.saving = false;
      updateControls();
    }
  }
});

dialog.addEventListener('cancel', event => {
  if(draft?.saving)event.preventDefault();
});
dialog.addEventListener('close', () => {
  draft = null;
  textarea.value = fileInput.value = status.textContent = songName.textContent = '';
  clearAttachmentPreview();
});

viewDialog.addEventListener('close', () => {
  if(!viewDialog.open)clearView();
});

root.addEventListener('kernnel-study-data-updated',event => {
  if(event.detail?.accountChanged){
    if(dialog.open){
      draft = null;
      dialog.close();
    }
    if(viewDialog.open){
      viewDialog.close();
      clearView();
    }
  }
  const songId = event.detail?.songId;
  if(songId){
    const song = D.temas.find(item => item.id === songId);
    if(song)refreshSong(song);
  }else render();
});
root.addEventListener('kernnel-study-sync-status',renderSyncStatus);
root.KernnelStudyNotes = {render,show};
})(window);