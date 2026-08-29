const CACHE_NAME = 'fodrasz-foglalo-v17';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './service-worker.js', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Oldal-navigacio (pl. az ikonrol inditaskor, vagy ujratoltes): mindig
  // probaljuk elobb a halozatot (friss tartalom), de ha nincs net, biztosan
  // adjuk vissza a gyorsitotarazott foldalt -- ne a pontos URL-egyezesre
  // hagyatkozzunk, mert atiranyitas/parameter miatt eltero URL is lehet.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
