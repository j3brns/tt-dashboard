const CACHE_NAME = 'tt-mission-control-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.json',
  './images/jjmb.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache new data requests dynamically
        if (event.request.url.includes('data.json')) {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
            });
        }
        return fetchResponse;
      });
    }).catch(() => {
        // Offline fallback if needed
    })
  );
});
