// Review 3 SHOULD 4/5: "save for 30 days" asks for persistent storage and reports the browser's real answer;
// a status message does not survive navigation (it contradicted the offline error page).
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, CHROME, pageWith } from './helpers.mjs';

const D = '2026-11-02';
const skip = !CHROME && 'no Chrome/Chromium installed';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

const stub = answer => [a => {
  window.__persistCalls = 0;
  const s = navigator.storage || {};
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { ...s, estimate: s.estimate?.bind(s), persisted: async () => false, persist: async () => { window.__persistCalls++; return a; } } });
}, answer];

for (const [answer, re] of [[true, /אישר אחסון קבוע/], [false, /לא אישר אחסון קבוע/]]) {
  test(`save for offline requests persistent storage and shows the answer (${answer})`, { skip }, async () => {
    const p = await pageWith(browser, srv.url, { init: stub(answer) });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#dl30');
    await p.click('#dl30');
    await p.waitForFunction(() => document.querySelector('#dl-st').textContent.length > 0, null, { timeout: 60000 });
    const st = await p.textContent('#dl-st');
    assert.match(st, /נשמרו במכשיר/); assert.match(st, re);
    assert.equal(await p.evaluate(() => window.__persistCalls), 1);
    assert.equal(await p.getAttribute('#dl-st', 'role'), 'status');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('a status toast is cleared when navigating', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#loc');
  await p.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'הטקסטים ל-30 הימים הקרובים נשמרו במכשיר'; t.classList.add('show'); });
  await p.goto(srv.url + '#/r/chumash/2027-03-01'); await p.waitForSelector('#rc');
  const t = await p.evaluate(() => { const t = document.querySelector('#toast'); return { show: t.classList.contains('show'), text: t.textContent }; });
  assert.equal(t.show, false); assert.equal(t.text, '');
  await p.context().close();
});

test('dl30 does NOT report saved when Cache Storage write fails (honest partial-save reporting)', { skip }, async () => {
  const p = await pageWith(browser, srv.url, {
    init: () => {
      const origOpen = caches.open.bind(caches);
      let n = 0;
      caches.open = async name => {
        const c = await origOpen(name);
        const origPut = c.put.bind(c);
        c.put = async (req, res) => {
          n++;
          if (n === 3) throw new Error('QuotaExceededError');
          return origPut(req, res);
        };
        return c;
      };
    },
  });
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#dl30');
  await p.click('#dl30');
  await p.waitForFunction(() => /שמירה חלקית|שגיאה/.test(document.querySelector('#dl-st').textContent), null, { timeout: 60000 });
  const st = await p.textContent('#dl-st');
  assert.match(st, /שמירה חלקית/);
  assert.doesNotMatch(await p.textContent('#dl30'), /✓ נשמר/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('full offline screen (#/offline): shows honest size, downloads selected corpus with cache verification, and works offline', { skip }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('chitas-reader.v1')) localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: { il: true, locationChosen: true }, progress: {} })); });
  await p.goto(srv.url + '#/offline');
  await p.waitForSelector('#off-start:not([disabled])');
  // Bavli and Yerushalmi must NOT be pre-checked by default
  assert.equal(await p.isChecked('input[name="off-c"][value="bavli"]'), false);
  assert.equal(await p.isChecked('input[name="off-c"][value="yerushalmi"]'), false);
  // Select only Tehillim (small, fast) and download
  await p.click('#off-none');
  assert.equal(await p.isDisabled('#off-start'), true);
  await p.check('input[name="off-c"][value="tehillim"]');
  assert.match(await p.textContent('#off-summary'), /151 קבצי טקסט/);
  await p.click('#off-start');
  await p.waitForFunction(() => /נשמר במכשיר ואומת במטמון/.test(document.querySelector('#off-st').textContent), null, { timeout: 60000 });
  // Ensure SW is ready, go offline, and verify Tehillim + nach/index.json + sbiur/index.json work offline
  await p.evaluate(() => navigator.serviceWorker.ready);
  await ctx.setOffline(true);
  await p.goto(srv.url + '#/lib/tehillim/23');
  await p.waitForSelector('#rc .seg');
  const cachedIndexes = await p.evaluate(async () => ({
    nach: !!(await caches.match(new URL('data/nach/index.json', document.baseURI).href)),
    sbiur: !!(await caches.match(new URL('data/sbiur/index.json', document.baseURI).href)),
  }));
  assert.deepEqual(cachedIndexes, { nach: true, sbiur: true });
  assert.deepEqual(p.errors, []);
  await ctx.close();
});

test('SW navigation timeout falls back to cached index.html on a half-dead network', { skip }, async () => {
  const http = await import('node:http');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../site/', import.meta.url));
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
  let stallNav = false;
  const s = http.createServer((req, rsp) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/' || p === '/index.html') {
      if (stallNav) { setTimeout(() => { try { rsp.writeHead(504); rsp.end(); } catch {} }, 12000); return; }
      p = '/index.html';
    }
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
    rsp.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rsp);
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${s.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'he-IL' });
  try {
    const p = await ctx.newPage();
    await p.addInitScript(() => { if (!localStorage.getItem('chitas-reader.v1')) localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: { il: true, locationChosen: true }, progress: {} })); });
    await p.goto(url + `#/d/${D}`);
    await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
    stallNav = true;
    const t0 = Date.now();
    await p.reload({ timeout: 10000 });
    await p.waitForSelector('.card', { timeout: 8000 });
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 8500, `expected SW timeout fallback < 8500ms, got ${elapsed}ms`);
  } finally {
    await ctx.close();
    s.close();
  }
});
