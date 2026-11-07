// Service worker: app shell precache + cache-first for static text data. The voice cache ('voice-v1') is the page's.
// VERSION: bump on every deploy of the app shell. DATA_VERSION: content hash of site/data (tools/data-version.mjs).
// When texts are rebuilt the data cache name changes. On activate the texts the user had saved are carried over
// (round 4): files whose hash in data/manifest.json is unchanged are copied from the old cache, changed ones are
// re-fetched and checked against the manifest hash. Only when that succeeded is the old cache deleted; until then it
// remains an offline fallback, so an update while the network is poor never loses the 30-day save.
const VERSION = '1.0.70';
const DATA_VERSION = 'f0e113105381';
const SHELL = `shell-${VERSION}`;
const DATA = `data-${DATA_VERSION}`;
const MANIFEST = new URL('data/manifest.json', self.registration.scope).href;
const ASSETS = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/calendar.js', 'js/texts.js', 'js/store.js', 'js/tts.js', 'js/tts-prep.js', 'js/chol.js', 'js/gloss.js', 'js/hnorm.js', 'js/niqqud.js', 'js/layout.js', 'js/zmanim.js', 'js/kivun.js', 'js/kivun-ui.js', 'js/wmm.js', 'js/divine.js', 'js/personal.js', 'js/tefila.js', 'js/siddur-lang.js', 'js/library.js', 'js/library-ui.js', 'js/search.js', 'js/vendor/hebcal.js',
  'js/piper.js', 'js/piper-worker.js', 'js/piper-core.js', 'js/g2p.js', 'js/voice-files.js', 'js/voice-pitch.js',
  'fonts/NotoSerifHebrew.woff2', 'fonts/FrankRuhlLibre.woff2', 'fonts/EzraSIL.woff2', 'fonts/taamey-ashkenaz-medium.woff2', 'fonts/taamey-ashkenaz-bold.woff2', 'fonts/TaameyAshkenaz-LICENSE.txt', 'fonts/GPL-2.0.txt', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'data/sources.json', 'data/tanya/index.json', 'data/rambam/index.json', 'data/glossary.json', 'data/rambam-errata.json', 'data/torah/index.json', 'data/mitzvot/index.json', 'data/siddur/index.json'];
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(SHELL).then(c => c.addAll(ASSETS)),
    // the manifest that describes this data version is kept inside its cache (it is what the next update compares to)
    fetch(MANIFEST, { cache: 'no-store' }).then(async r => {
      if (!r.ok) return; const m = await r.clone().json();
      if (m.version === DATA_VERSION) await (await caches.open(DATA)).put(MANIFEST, r);
    }).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});
const readManifest = async c => { try { return await (await c.match(MANIFEST))?.json() || null; } catch { return null; } };
const relOf = url => { const i = url.indexOf('/data/'); return i < 0 ? null : decodeURIComponent(url.slice(i + 6).split('?')[0]); };
async function sha16(buf) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16); }
async function migrateData() {
  const olds = (await caches.keys()).filter(k => k.startsWith('data-') && k !== DATA);
  if (!olds.length) return;
  const cur = await caches.open(DATA), man = await readManifest(cur);
  if (!man) return;  // cannot tell what changed: keep the old caches as an offline fallback
  for (const k of olds) {
    const old = await caches.open(k), oldMan = await readManifest(old);
    const reqs = (await old.keys()).filter(r => r.url !== MANIFEST);
    let ok = true;
    for (let i = 0; i < reqs.length; i += 6) await Promise.all(reqs.slice(i, i + 6).map(async req => {
      const rel = relOf(req.url);
      if (!rel || !man.files[rel] || await cur.match(req)) return;   // dropped from the data, or already there
      if (oldMan?.files?.[rel] === man.files[rel]) { const r = await old.match(req); if (r) await cur.put(req, r); return; }
      try {
        const r = await fetch(req.url, { cache: 'no-store' }), body = r.ok && await r.clone().arrayBuffer();
        if (body && await sha16(body) === man.files[rel]) await cur.put(req, r); else ok = false;
      } catch { ok = false; }
    }));
    if (ok) await caches.delete(k);
  }
}
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => migrateData().catch(() => {}))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'version') e.source?.postMessage({ version: VERSION, data: DATA_VERSION }); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.href.split('?')[0] === MANIFEST) return;
  const isData = url.pathname.includes('/data/') && !/index\.json$|sources\.json$|glossary\.json$|rambam-errata\.json$/.test(url.pathname);
  if (isData) {
    // cache-first; offline, a text that only an older (not yet migrated) data cache holds is still served
    e.respondWith(caches.open(DATA).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
      .catch(async err => (await caches.match(e.request)) || Promise.reject(err))));
    return;
  }
  // the local voice (site/voice/, ~38–92 MB): never precached and never put in the shell cache. The page stores it in
  // 'voice-v1' only after the reader presses "קול איכותי" (js/piper.js installVoice); here it is served from there.
  if (url.pathname.includes('/voice/')) {
    e.respondWith(caches.open('voice-v1').then(c => c.match(e.request)).then(m => m || fetch(e.request)));
    return;
  }
  // shell: network-first for navigation (fresh after deploy), cache-first for the rest
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const cl = r.clone(); caches.open(SHELL).then(c => c.put('index.html', cl)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(m => m || fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cl)); } return r; })));
});
