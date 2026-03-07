/**
 * sw.js — Future Pinball Web Service Worker
 * Strategy: network-first for HTML/navigation, cache-first for assets
 */
const CACHE = 'fpw-v1';

// Pre-cache shell on install
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html', '/editor.html']))
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  const req = evt.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);
  const isNav = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isNav) {
    // Network-first: always try fresh HTML, fall back to cache
    evt.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
  } else {
    // Cache-first: serve assets instantly from cache, populate on miss
    evt.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(r => {
          // Only cache successful same-origin responses
          if (r.ok && r.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(req, r.clone()));
          }
          return r;
        });
      })
    );
  }
});
