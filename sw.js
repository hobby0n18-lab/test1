const CACHE_NAME = 'monster-adventure-v42';
const ASSETS = [
  './',
  'index.html',
  'monster_adventure.html',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`Failed to cache asset during install: ${asset}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First for HTML/Navigations, Cache-First for static assets)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    const isHTML = event.request.mode === 'navigate' || 
                   url.pathname.endsWith('.html') || 
                   url.pathname === '/' || 
                   url.pathname.endsWith('/');

    if (isHTML) {
      // 1. Network-First Strategy for HTML / Navigation
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseCopy);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache when offline
            return caches.match(event.request);
          })
      );
    } else {
      // 2. Cache-First Strategy for static assets (images, CSS, JS)
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const responseCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseCopy);
              });
            }
            return response;
          }).catch((err) => {
            // Let the request fail naturally
            throw err;
          });
        })
      );
    }
  } catch (e) {
    // Fail-safe
  }
});
