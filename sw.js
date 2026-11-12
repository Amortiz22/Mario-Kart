// Service worker: permite jugar sin conexión (modo un jugador) y abrir rápido.
const CACHE = 'kartazo-v2';
const FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/main.js', './js/game.js', './js/track.js', './js/circuit.js', './js/models.js', './js/data.js', './js/input.js', './js/audio.js', './js/net.js',
  './vendor/three.module.min.js', './vendor/peerjs.min.js', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // red primero, caché como respaldo (así las actualizaciones llegan solas)
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
