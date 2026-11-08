/* Controles de apariencia: preferencias de la app o del manual, sin migrar canciones. */
'use strict';
(function(){
 const app=document.body.classList.contains('app'), key='kernnel-guide-appearance-v1';
 const select=document.getElementById('design-theme'),contrast=document.getElementById('design-contrast');
 let manual={theme:'system',highContrast:false};
 if(!app){try{const p=JSON.parse(localStorage.getItem(key)||'{}');if(['light','dark','system'].includes(p.theme))manual.theme=p.theme;manual.highContrast=p.highContrast===true}catch{}}
 function prefs(){return app?D.prefs:manual}
 function sync(){const p=prefs();document.documentElement.dataset.theme=p.theme==='system'?'':p.theme;document.documentElement.dataset.contrast=String(!!p.highContrast);select.value=p.theme;contrast.setAttribute('aria-pressed',String(!!p.highContrast));select.disabled=app&&!loadedStorage;contrast.disabled=app&&!loadedStorage;const dark=p.theme==='dark'||p.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#171d23':'#e9ecef')}
 window.syncDesignTheme=sync;
 function change(){if(app){if(!loadedStorage)return;save();applyPrefs();renderAppearance()}else{try{localStorage.setItem(key,JSON.stringify(manual))}catch{}sync()}}
 select.addEventListener('change',()=>{if(app&&!loadedStorage)return;prefs().theme=select.value;change()});
 contrast.addEventListener('click',()=>{if(app&&!loadedStorage)return;prefs().highContrast=!prefs().highContrast;change()});
 document.querySelector('.rail-settings')?.addEventListener('click',()=>{select.scrollIntoView({block:'center'});select.focus()});
 matchMedia('(prefers-color-scheme:dark)').addEventListener('change',sync);
 sync();
})();
