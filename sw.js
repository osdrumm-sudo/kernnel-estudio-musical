/* Kernnel Estudio musical · recursos para uso sin conexión · OSS/26 */
const CACHE_NAME = 'kernnel-shell-2026-11-10-modules-v4';
const SHELL = ['./', './index.html', './ui-v2.css', './ui-v2.js', './design-theme.css', './design-layout.css', './design-theme.js', './manifest.webmanifest', './cloud.js', './firebase-config.js', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kernnel-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (request.mode === 'navigate') {
    // Online: fresh page. Offline: the version safely stored in the device.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)));
      }
      return response;
    }).catch(async () => await caches.match('./index.html') || Response.error()));
    return;
  }
  if (url.pathname.endsWith('/firebase-config.js') || url.pathname.endsWith('/cloud.js')) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

