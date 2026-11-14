const CACHE_NAME = 'ielts-mastery-v11';
// Clips are named by a hash of their text, so this cache survives app updates.
const AUDIO_CACHE_NAME = 'ielts-audio-v1';
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
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME && name !== AUDIO_CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Leave cross-origin requests (online pronunciation audio) to the browser.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  if (new URL(event.request.url).pathname.includes('/audio/')) {
    event.respondWith(audioResponse(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});

// Media elements ask for byte ranges, and partial responses cannot be cached. Fetch
// and cache the whole clip, then answer the requested range from it.
async function audioResponse(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  if (request.url.endsWith('index.json')) {
    // The clip list changes when lessons change: prefer the network, keep a copy for offline.
    try {
      const fresh = await fetch(request.url, { cache: 'no-cache' });
      if (fresh.status === 200) cache.put(request.url, fresh.clone());
      return fresh;
    } catch (_) {
      return (await cache.match(request.url)) || Response.error();
    }
  }
  let full = await cache.match(request.url);
  if (!full) {
    try {
      full = await fetch(request.url);
    } catch (_) {
      return Response.error();
    }
    if (full.status !== 200) return full;
    cache.put(request.url, full.clone());
  }
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!range) return full;
  const data = await full.arrayBuffer();
  const start = Number(range[1]);
  const end = Math.min(range[2] ? Number(range[2]) : data.byteLength - 1, data.byteLength - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${data.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}
