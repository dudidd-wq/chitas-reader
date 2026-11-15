// 1.0.120 introduced a slim always-visible bar. 1.0.121 replaces it with a FAB + overlay
// (Dudi: "זה לא נראה הכי טוב / אולי צריך כפתור קטן צף שבלחיצה עליו עונה פס הניווט").
// Keep a short regression that the 5-tab app nav stays out of the reader and that
// prev/next/home exist (revealed by the FAB). Detailed coverage lives in reader-121.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, openChrome } from './helpers.mjs';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const phone = (prefs = {}) => pageWith(browser, srv.url, { prefs, viewport: { width: 412, height: 915 } });

test('1.0.120/121: no app nav or old lnav in the reader; FAB reveals home, prev, next and play; text area grew', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const closed = await p.evaluate(() => {
    const vp = document.getElementById('vp').getBoundingClientRect();
    const padT = parseFloat(getComputedStyle(document.getElementById('rc')).paddingTop);
    const padB = parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom);
    const fab = document.getElementById('b-fab')?.getBoundingClientRect();
    return { bnav: !!document.getElementById('bnav'), lnav: !!document.getElementById('lnav'),
      on: document.getElementById('reader').classList.contains('chrome-on'),
      textH: +(vp.height - padT - padB).toFixed(1), fabH: fab?.height || 0 };
  });
  assert.equal(closed.bnav, false);
  assert.equal(closed.lnav, false);
  assert.equal(closed.on, false);
  assert.ok(closed.fabH >= 44, 'FAB ' + closed.fabH);
  assert.ok(closed.textH > 639, `text area did not grow (before 639, after ${closed.textH})`);
  assert.ok(closed.textH >= 850, `text area still tight: ${closed.textH}`);
  await openChrome(p);
  const labels = await p.evaluate(() => [...document.querySelectorAll('#rb .rb-lbl')].map(e => e.textContent.trim()));
  assert.ok(labels.includes('בית'), JSON.stringify(labels));
  assert.ok(labels.includes('הקודם') || labels.includes('יום קודם'), JSON.stringify(labels));
  assert.ok(labels.includes('הבא') || labels.includes('יום הבא'), JSON.stringify(labels));
  const hrefs = await p.evaluate(() => ({ prev: document.getElementById('b-lprev')?.hidden, next: document.getElementById('b-lnext')?.hidden, home: document.getElementById('b-home')?.getAttribute('href'), play: document.getElementById('b-play2')?.hidden }));
  assert.equal(hrefs.prev, false);
  assert.equal(hrefs.next, false);
  assert.ok(hrefs.home);
  assert.equal(hrefs.play, false);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
