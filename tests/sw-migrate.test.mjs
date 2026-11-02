// Round 4: the 30-day offline save survives a data rebuild + app update – unchanged files are carried over from the
// old cache, changed ones are re-fetched (and checked against the manifest hash), the old cache is then deleted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { serve, launch, CHROME } from './helpers.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
const FILES = ['torah/Genesis/1.json', 'torah/Genesis/2.json', 'tehillim/1.json', 'tanya/LA/1.json'];

async function scenario({ dropOldManifest }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chitas-sw-')) + '/';
  fs.cpSync(SITE, tmp, { recursive: true });
  const log = [], srv = await serve(tmp, log), b = await launch();
  try {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    // The worker is exercised on its own, from a data file in its scope (data/sources.json), not from the app: the
    // app's background 30-day prefetch and its reload-on-update (controllerchange) only made the timing flaky in CI.
    // Paths below are therefore relative to data/.
    await p.goto(srv.url + 'data/sources.json');
    await p.evaluate(async () => { await navigator.serviceWorker.register(new URL('../sw.js', location.href).href); await navigator.serviceWorker.ready; });
    await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    const v1 = await p.evaluate(async files => { for (const f of files) await fetch(f).then(r => r.text()); return (await caches.keys()).filter(k => k.startsWith('data-')); }, FILES);
    assert.equal(v1.length, 1);
    if (dropOldManifest) await p.evaluate(async k => (await caches.open(k)).delete(new URL('manifest.json', location.href).href), v1[0]);
    // "rebuild": one file changes, new manifest + DATA_VERSION + VERSION
    const changed = 'torah/Genesis/2.json', f2 = tmp + 'data/' + changed;
    const j = JSON.parse(fs.readFileSync(f2, 'utf8')); j.__rebuilt = 1; fs.writeFileSync(f2, JSON.stringify(j));
    const man = JSON.parse(fs.readFileSync(tmp + 'data/manifest.json', 'utf8'));
    man.files[changed] = crypto.createHash('sha256').update(fs.readFileSync(f2)).digest('hex').slice(0, 16); man.version = 'test2rebuilt';
    fs.writeFileSync(tmp + 'data/manifest.json', JSON.stringify(man));
    fs.writeFileSync(tmp + 'sw.js', fs.readFileSync(tmp + 'sw.js', 'utf8').replace(/const DATA_VERSION = '[^']*'/, "const DATA_VERSION = 'test2rebuilt'").replace(/const VERSION = '[^']*'/, "const VERSION = '9.9.9'"));
    log.length = 0;
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    const until = async (fn, what) => { const t0 = Date.now(); for (;;) { if (await p.evaluate(fn).catch(() => false) === true) return;
      if (Date.now() - t0 > 60000) throw new Error('timeout: ' + what + ' ' + await p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length; const reg = await navigator.serviceWorker.getRegistration(); return JSON.stringify([o, !!navigator.serviceWorker.controller, reg?.active?.state, reg?.waiting?.state, reg?.installing?.state, location.href]); }).catch(e => String(e))); await new Promise(r => setTimeout(r, 300)); } };
    await until(async () => { const k = await caches.keys(); return k.includes('data-test2rebuilt') && !k.some(x => x.startsWith('data-') && x !== 'data-test2rebuilt'); }, 'old data cache migrated and deleted');
    await until(() => new Promise(res => { const c = navigator.serviceWorker.controller; if (!c) return res(false);
      navigator.serviceWorker.addEventListener('message', e => res(e.data?.version === '9.9.9'), { once: true }); c.postMessage('version'); setTimeout(() => res(false), 500); }), 'new worker controls the page');
    const fetched = log.filter(x => x.includes('/data/')).map(x => x.split('/data/')[1].split('?')[0]).filter(x => FILES.includes(x));  // (the app's own prefetch of today's texts may also run)
    // offline: every saved text is still there, the changed one in its new form
    await ctx.setOffline(true);
    const got = await p.evaluate(async files => Promise.all(files.map(f => fetch(f).then(r => r.json()).then(j => !!j).catch(() => false))), FILES);
    const rebuilt = await p.evaluate(async () => (await fetch('torah/Genesis/2.json').then(r => r.json())).__rebuilt);
    await ctx.close();
    return { fetched, got, rebuilt, log: log.filter(x => x.includes('/data/')) };
  } finally { await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('data rebuild: saved texts survive; only the changed file is re-fetched', { skip: !CHROME && 'no Chrome' }, async () => {
  const r = await scenario({ dropOldManifest: false });
  assert.deepEqual(r.fetched, ['torah/Genesis/2.json'], JSON.stringify(r.log));
  assert.deepEqual(r.got, FILES.map(() => true));
  assert.equal(r.rebuilt, 1);
});

test('update from a version without a manifest: everything saved is re-fetched, nothing is lost', { skip: !CHROME && 'no Chrome' }, async () => {
  const r = await scenario({ dropOldManifest: true });
  assert.deepEqual(r.fetched.sort(), [...FILES].sort(), JSON.stringify(r.log));
  assert.deepEqual(r.got, FILES.map(() => true));
  assert.equal(r.rebuilt, 1);
});
