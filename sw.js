// ── Service Worker — Estudio Patitucci ──────────────────────────────────────
const CACHE_NAME = 'ep-v20';

const STATIC_ASSETS = [
  './styles.css',
  './data-piezas.js',
  './hero-bg.jpg',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];

// ── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const critical = ['./index.html', './manifest.json', './icon.svg'];
      return cache.addAll(critical).then(() => {
        STATIC_ASSETS.filter(u => !critical.includes(u)).forEach(url => {
          cache.add(url).catch(() => {});
        });
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activación: limpia caches viejas y toma control inmediato ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
      .then(() => {
        // Avisar a todas las pestañas que recarguen
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// ── Fetch: Network First para navegación, Cache First para estáticos ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ ok: false, msg: 'Sin conexión. Verificá tu internet.' }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Network first para el HTML principal (siempre fresco)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
