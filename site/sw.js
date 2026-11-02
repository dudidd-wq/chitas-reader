// Service worker: app shell precache + cache-first for static text data.
// VERSION: bump on every deploy of the app shell. DATA_VERSION: content hash of site/data (tools/data-version.mjs);
// when texts are rebuilt the data cache name changes, the old cache is deleted on activate, and texts are re-fetched.
const VERSION = '1.0.17';
const DATA_VERSION = 'd02e9101f9a2';
const SHELL = `shell-${VERSION}`;
const DATA = `data-${DATA_VERSION}`;
const ASSETS = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/calendar.js', 'js/texts.js', 'js/store.js', 'js/tts.js', 'js/tts-prep.js', 'js/chol.js', 'js/gloss.js', 'js/hnorm.js', 'js/layout.js', 'js/vendor/hebcal.js',
  'fonts/NotoSerifHebrew.woff2', 'fonts/FrankRuhlLibre.woff2', 'fonts/EzraSIL.woff2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'data/sources.json', 'data/tanya/index.json', 'data/rambam/index.json', 'data/glossary.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('shell-') && k !== SHELL) || (k.startsWith('data-') && k !== DATA)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'version') e.source?.postMessage({ version: VERSION, data: DATA_VERSION }); });
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
