const CACHE_NAME = 'habit-pet-v19';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/pacifier.svg',
  './icons/miffy-head.svg',
  './icons/miffy-orange.svg',
  './icons/miffy-blue.svg',
  './icons/miffy-yellow.svg',
  './icons/miffy-pink.svg',
  './icons/miffy-green.svg',
  './icons/miffy-purple.svg',
  './icons/miffy-rainbow.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
