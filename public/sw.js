const CACHE_NAME = 'onclick-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/disaster.html',
  '/emergency.html',
  '/dashboard.html',
  '/confirm.html',
  '/responder.html',
  '/resource.html',
  '/style.css',
  '/disaster.css',
  '/emergency.css',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install Event: Cache Critical Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Pre-caching offline assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Sweeping old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-while-revalidate / Offline fallback
self.addEventListener('fetch', event => {
  // Only apply to GET requests
  if (event.request.method !== 'GET') return;

  // Don't intercept API or Socket.io connections in the cache
  if (event.request.url.includes('/socket.io/') || event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If we have it in cache, return it immediately, but fetch network in background (Stale-while-revalidate)
      if (cachedResponse) {
        // Fetch to update cache silently
        event.waitUntil(
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => { /* Ignore background fetch failures when offline */ })
        );
        return cachedResponse;
      }

      // If not in cache, fallback to network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // If network fails and it's navigation, return offline fallback page (index.html serves as offline UI)
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
