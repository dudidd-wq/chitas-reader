// Service worker: app shell precache + cache-first for static text data.
const VERSION = '1.0.1';
const SHELL = `shell-${VERSION}`;
const DATA = 'data-v1';
const ASSETS = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/calendar.js', 'js/texts.js', 'js/store.js', 'js/tts.js', 'js/tts-prep.js', 'js/gloss.js', 'js/hnorm.js', 'js/vendor/hebcal.js',
  'fonts/NotoSerifHebrew.woff2', 'fonts/FrankRuhlLibre.woff2', 'fonts/EzraSIL.woff2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'data/sources.json', 'data/tanya/index.json', 'data/rambam/index.json', 'data/glossary.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isData = url.pathname.includes('/data/') && !/index\.json$|sources\.json$|glossary\.json$/.test(url.pathname);
  if (isData) {
    e.respondWith(caches.open(DATA).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  // shell: network-first for navigation (fresh after deploy), cache-first for the rest
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(SHELL).then(c => c.put('index.html', cl)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(m => m || fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cl)); } return r; })));
});
