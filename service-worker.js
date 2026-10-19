const CACHE_NAME = 'fodrasz-foglalo-v23';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './service-worker.js', './drive-config.js', './drive-sync.js', './drive-ui.js', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // 2026-10-19: {cache:'reload'} -- a bongeszo HTTP-gyorsitotarat megkerulve, MINDIG a szerverrol
  // tolti le az uj valtozat fajljait. Korabban a GitHub 10 perces gyorsitotara miatt az uj
  // service worker a REGI index.html-t is elmenthette (a tablet a v22 helyett v21-et mutatott).
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
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
      fetch(event.request).then((valasz) => {
        // 2026-10-19: a sikeresen letoltott oldallal frissitjuk az offline peldanyt is
        // (korabban csak telepiteskor mentodott el, es utana soha nem frissult).
        if (valasz && valasz.ok && valasz.type === 'basic') {
          const masolat = valasz.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put('./index.html', masolat)));
        }
        return valasz;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
