const CACHE_NAME = 'ielts-mastery-v2';
const DAY_FILES = Array.from({ length: 100 }, (_, index) =>
  `./data/day-${String(index + 1).padStart(3, '0')}.json`
);
const APP_FILES = [
  './', './index.html', './css/styles.css', './js/content.js',
  './js/generated-content.js', './js/pronunciation.js', './js/app.js', './js/responsive.js',
  './js/section-controls.js', './js/pwa.js',
  './manifest.webmanifest', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png',
  './data/index.json', './data/topics.json', './data/schema.json', ...DAY_FILES
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
