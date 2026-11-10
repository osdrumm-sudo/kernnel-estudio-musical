/* Cargar Cloudflare Web Analytics solo cuando el propietario habilite el site token. */
(() => {
  const token=String(window.KERNNEL_WEB_ANALYTICS_SITE_TOKEN||'').trim();
  // El dominio del panel de administración y la instalación anterior NO se miden.
  if(location.hostname!=='kernnel.app'||! /^[0-9a-f]{32}$/i.test(token))return;
  if(document.querySelector('script[src^="https://static.cloudflareinsights.com/beacon.min.js"]'))return;
  const script=document.createElement('script');
  script.type='module';
  script.src='https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon=JSON.stringify({token});
  document.head.append(script);
})();
