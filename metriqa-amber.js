/* Metriqa Full · Propuesta 4. Capa visual funcional sobre los datos existentes. */
'use strict';
(function(){
  const $a=id=>document.getElementById(id);
  const key='metriqa-palette-4-2026';
  const state={enabled:true,songId:null,measure:1,tab:'comments',showScore:false};
  try{state.enabled=localStorage.getItem(key)!=='classic'}catch(_){}
  function applyPalette(){
    document.documentElement.dataset.metriqaPalette=state.enabled?'amber':'classic';
    document.body.classList.toggle('mq-amber',state.enabled);
    const toggle=$a('mq-style-toggle');
    if(toggle){
      toggle.setAttribute('aria-pressed',String(state.enabled));
      toggle.textContent=state.enabled?'◐ Vista clásica':'◐ Propuesta 4 · Ámbar';
      toggle.title=state.enabled?'Volver temporalmente al diseño anterior':'Activar diseño grafito y ámbar';
    }
    const score=$a('scorebox-amber-anchor')||document.querySelector('.scorebox');
    score?.classList.toggle('mq-score-open',state.enabled&&state.showScore);
  }
  function currentMeasure(){
    const t=current();
    if(!t)return 1;
    if(state.songId!==t.id){state.songId=t.id;state.measure=1;state.showScore=false;state.tab='comments'}
    const n=Number(clock.visualMeasure)||state.measure;
    return Math.max(1,Math.min(t.notas.length,n));
  }
  function setText(id,text){const el=$a(id);if(el)el.textContent=String(text)}
  function sectionList(t){
    const sorted=(t.secciones||[]).filter(s=>Number.isInteger(s.desde)&&Number.isInteger(s.hasta)).slice().sort((a,b)=>a.desde-b.desde);
    return sorted.length?sorted:[{id:'all',nombre:'Tema completo',desde:1,hasta:t.notas.length}];
  }
  function getSection(t,n){
    return sectionList(t).find(s=>n>=s.desde&&n<=s.hasta)||{id:'free',nombre:'Sin sección',desde:n,hasta:n};
  }
  function selectMeasure(n){
    const t=current();if(!t)return;
    state.measure=Math.max(1,Math.min(t.notas.length,Number(n)||1));
    goToMeasure(state.measure);
    renderStudioAmber();
  }
  function addButton(text,onClick,className,attributes={}){
    const b=document.createElement('button');
    b.type='button';b.textContent=text;b.className=className;
    for(const [name,value] of Object.entries(attributes))b.setAttribute(name,String(value));
    b.addEventListener('click',onClick);return b;
  }
  function renderSections(t,n){
    const parent=$a('mq-section-buttons');if(!parent)return;
    parent.replaceChildren();
    for(const s of sectionList(t)){
      const isActive=n>=s.desde&&n<=s.hasta;
      const b=addButton(s.nombre,()=>selectMeasure(s.desde),'mq-section-button'+(isActive?' is-active':''),{'aria-current':isActive?'true':'false',title:'Ir a '+s.nombre+', compás '+s.desde});
      const sub=document.createElement('small');sub.textContent=s.desde+'–'+s.hasta;b.append(sub);
      parent.append(b);
    }
  }
  function renderMeasureStrip(t,n,x){
    const parent=$a('mq-measure-strip');if(!parent)return;
    parent.replaceChildren();
    const length=Math.min(8,t.notas.length);
    const start=Math.min(Math.max(1,n-Math.floor(length/2)),Math.max(1,t.notas.length-length+1));
    for(let m=start;m<start+length;m++){
      const btn=addButton(String(m),()=>selectMeasure(m),'mq-measure-card'+(m===n?' is-now':''),{'aria-label':'Ir al compás '+m,'aria-current':m===n?'true':'false'});
      const dots=document.createElement('span');dots.className='mq-measure-dots';dots.setAttribute('aria-hidden','true');
      for(let i=0;i<Math.min(6,beatsPerMeasure(x));i++){const dot=document.createElement('i');dots.append(dot)}
      btn.append(dots);
      parent.append(btn);
    }
  }
  function availableImages(t,n){
    const data=Array.isArray(t.tiempos?.[n-1])?t.tiempos[n-1]:[];
    return data.map((beat,i)=>({src:beat?.img,beat:i+1,comment:beat?.txt||''}))
       .filter(item=>typeof item.src==='string'&&/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(item.src));
  }
  function renderImages(t,n){
    const parent=$a('mq-attachments');parent.replaceChildren();
    const images=availableImages(t,n);
    if(!images.length){
      const msg=document.createElement('div');msg.className='mq-no-images';msg.textContent='Este compás no tiene extractos adjuntos. Puedes agregarlos desde Edición.';parent.append(msg);return;
    }
    images.forEach(img=>{
      const b=addButton('',()=>openImage(img.src,img.beat),'mq-excerpt',{'aria-label':'Ampliar imagen del pulso '+img.beat});
      const image=document.createElement('img');image.src=img.src;image.loading='lazy';image.alt='Extracto de partitura o recurso del pulso '+img.beat;b.append(image);parent.append(b);
    });
  }
  function openImage(src,beat){
    $a('mq-image-title').textContent='Extracto del pulso '+beat;
    $a('mq-image-full').src=src;
    $a('mq-image-dialog').showModal();
  }
  function renderNotes(t,n){
    const list=$a('mq-note-list');list.replaceChildren();
    const labels=[];
    const note=(t.notas?.[n-1]||'').trim();
    const beatData=Array.isArray(t.tiempos?.[n-1])?t.tiempos[n-1]:[];
    if(state.tab==='notes'){
      if(note)labels.push({title:'Nota del compás '+n,body:note});
      for(const [i,b]of beatData.entries()){
        if(typeof b?.txt==='string'&&b.txt.trim())labels.push({title:'Nota del pulso '+(i+1),body:b.txt.trim()});
      }
    }else{
      for(const [i,b]of beatData.entries()){
        if(typeof b?.txt==='string'&&b.txt.trim())labels.push({title:'Pulso '+(i+1),body:b.txt.trim()});
      }
      if(note)labels.push({title:'Compás '+n,body:note});
    }
    if(!labels.length){
      const empty=document.createElement('p');empty.className='mq-note-empty';empty.textContent=state.tab==='notes'?'Sin notas escritas en este compás.':'Sin comentarios para este compás.';list.append(empty);
    }else{
      for(const item of labels.slice(0,8)){
        const card=document.createElement('div');card.className='mq-note-card';
        const title=document.createElement('strong');title.textContent=item.title;
        const body=document.createElement('p');body.textContent=item.body;
        card.append(title,body);list.append(card);
      }
    }
    document.querySelectorAll('.mq-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===state.tab)));
  }
  function renderStudioAmber(){
    if(!state.enabled||ui.view!=='study')return;
    const t=current();if(!t)return;
    const x=setting(t),n=currentMeasure(),s=getSection(t,n);
    const activeMeter=t.musica?window.MetriqaMusicalClock.measuresFor(t,x.practiceBpm)[n-1]:null;
    const meterLabel=activeMeter?(activeMeter.numerator+'/'+activeMeter.denominator):x.meter;
    state.measure=n;
    const songSelect=$a('mq-song-select');
    if(songSelect){
      songSelect.replaceChildren();
      for(const song of D.temas){
        const option=document.createElement('option');
        option.value=song.id;option.textContent=song.nombre;songSelect.append(option);
      }
      songSelect.value=t.id;
    }
    setText('mq-song-name',t.nombre);
    setText('mq-song-details',meterLabel+' · '+x.practiceBpm+' BPM de práctica · '+t.notas.length+' compases');
    setText('mq-section-name',s.nombre);
    setText('mq-section-range','Compases '+s.desde+'–'+s.hasta);
    setText('mq-meter',meterLabel);
    renderSections(t,n);
    renderMeasureStrip(t,n,x);
    renderImages(t,n);
    renderNotes(t,n);
    updateStudioAmber();
  }
  function updateStudioAmber(){
    if(!state.enabled||ui.view!=='study')return;
    const t=current();if(!t)return;
    const n=currentMeasure();
    if(n!==state.measure){
      state.measure=n;renderStudioAmber();return;
    }
    const x=setting(t),active=t.musica?window.MetriqaMusicalClock.measuresFor(t,x.practiceBpm)[n-1]:null;
    const count=clock.position?.pulseCount||active?.pulseCount||beatsPerMeasure(x),beat=Number(clock.visualBeat);
    const accents=t.musica&&active&&Array.isArray(t.musica.accentOverrides?.[active.id])?t.musica.accentOverrides[active.id]:x.accents;
    setText('mq-measure-num',String(n));
    setText('mq-measure-total','/ '+t.notas.length);
    setText('mq-beat-number',beat>=0&&beat<count?(beat+1)+' / '+count:'— / '+count);
    setText('mq-position-label','Compás '+n+' de '+t.notas.length);
    const range=$a('mq-seek');if(range){range.min='1';range.max=String(t.notas.length);range.value=String(n);range.style.setProperty('--position',(100*(n-1)/Math.max(1,t.notas.length-1)).toFixed(2)+'%')}
    const dots=$a('mq-pulse-dots');if(dots&&dots.children.length!==count){
      dots.replaceChildren();
      for(let i=0;i<count;i++){
        const dot=document.createElement('span');dot.className='mq-pulse';dot.setAttribute('aria-label','Pulso '+(i+1));
        dots.append(dot);
      }
    }
    [...(dots?.children||[])].forEach((dot,i)=>{
      dot.classList.toggle('is-now',i===beat);
      dot.classList.toggle('is-accent',accents.includes(i+1));
    });
    document.querySelectorAll('.mq-measure-card').forEach(btn=>btn.classList.toggle('is-now',Number(btn.firstChild?.textContent)===n));
  }
  function editCurrentMeasure(){
    const measure=state.measure;
    $a('nav-edit')?.click();
    requestAnimationFrame(()=>{
      document.querySelector('.measure[data-measure="'+measure+'"]')?.scrollIntoView({block:'center',behavior:'smooth'});
      const field=document.querySelector('.measure[data-measure="'+measure+'"] .measure-note');
      if(field)field.focus({preventScroll:true});
    });
  }
  function setEnabled(on){
    state.enabled=on;
    try{localStorage.setItem(key,on?'amber':'classic')}catch(_){}
    applyPalette();
    renderStudioAmber();
  }
  function toggleScore(){
    state.showScore=!state.showScore;applyPalette();
    const button=$a('mq-show-score');
    button.textContent=state.showScore?'Ocultar partitura completa':'Ver partitura completa';
    if(state.showScore)requestAnimationFrame(()=>document.querySelector('.scorebox')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  function openPracticeSettings(){
    if(ui.view!=='study')return;
    if(!ui.studyMenu)$a('study-settings-button')?.click();
    ui.mobileMenu=true;
    $a('sidebar')?.classList.add('show-mobile');
    $a('mobile-menu')?.setAttribute('aria-expanded','true');
    const metro=$a('menu-metronome');
    if(metro)metro.open=true;
    requestAnimationFrame(()=>metro?.scrollIntoView({block:'nearest',behavior:'smooth'}));
  }
  $a('mq-style-toggle')?.addEventListener('click',()=>setEnabled(!state.enabled));
  $a('mq-open-settings')?.addEventListener('click',openPracticeSettings);
  $a('mq-seek')?.addEventListener('change',event=>selectMeasure(event.target.value));
  $a('mq-song-select')?.addEventListener('change',event=>chooseSongV2(event.target.value,'study'));
  $a('mq-show-score')?.addEventListener('click',toggleScore);
  $a('mq-add-note')?.addEventListener('click',editCurrentMeasure);
  document.querySelectorAll('.mq-tab').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderStudioAmber()}));
  $a('mq-image-close')?.addEventListener('click',()=>$a('mq-image-dialog').close());
  $a('mq-image-dialog')?.addEventListener('close',()=>{$a('mq-image-full').removeAttribute('src')});
  document.querySelector('[data-rail-edit]')?.addEventListener('click',()=>document.getElementById('nav-edit')?.click());
  document.querySelector('[data-rail-study]')?.addEventListener('click',()=>document.getElementById('nav-study')?.click());
  document.querySelector('[data-rail-settings]')?.addEventListener('click',()=>{
    if(ui.view==='study'){openPracticeSettings();return}
    const open=()=>{
      if(ui.view!=='home')setViewV2('home');
      ui.homeSidebarOpen=true;
      ui.mobileMenu=true;
      $a('sidebar')?.classList.add('show-mobile');
      $a('mobile-menu')?.setAttribute('aria-expanded','true');
      applyPrefs();
      const panel=$a('menu-practice');
      if(panel)panel.open=true;
      requestAnimationFrame(()=>panel?.scrollIntoView({block:'nearest',behavior:'smooth'}));
    };
    if(ui.view==='edit')confirmLeaveEditV2(open);
    else open();
  });
  window.renderStudioAmber=renderStudioAmber;
  window.updateStudioAmber=updateStudioAmber;
  window.MetriqaPalette=Object.freeze({enabled:()=>state.enabled,setEnabled,render:renderStudioAmber});
  applyPalette();
  renderStudioAmber();
})();
