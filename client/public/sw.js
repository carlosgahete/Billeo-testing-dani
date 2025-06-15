const CACHE_NAME = 'billeo-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Archivos esenciales para cachear
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.png',
  OFFLINE_URL
];

// Archivos que siempre deben ser frescos (no cachear)
const neverCache = [
  '/api/',
  '/auth/',
  '/sw.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Billeo SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Billeo SW: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forzar la activación inmediata
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Billeo SW: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Billeo SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control inmediatamente
      return self.clients.claim();
    })
  );
});

// Intercepción de peticiones de red
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear ciertas rutas
  if (neverCache.some(path => url.pathname.startsWith(path))) {
    return;
  }

  // Estrategia Network First para la app
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Si la respuesta es exitosa, cacheala
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intenta desde cache
          return caches.match(request)
            .then(response => {
              return response || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Para otros recursos, usar Cache First
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            // Solo cachear respuestas exitosas
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Si es una navegación y falla, mostrar página offline
            if (request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Billeo Service Worker loaded!'); 