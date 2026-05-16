// ── Service Worker — Estudio Patitucci ──────────────────────────────────────
const CACHE_NAME = 'ep-v3';

// Recursos a cachear para uso offline
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
];

// ── Instalación: cachea todos los recursos estáticos ────────────────────────
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

// ── Activación: limpia caches viejas ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network First para API, Cache First para estáticos ───────────────
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

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
