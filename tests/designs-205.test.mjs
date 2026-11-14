// 1.0.116: Dudi – "בר ניווט במסך הכללי". In the three designs the general screens (home, library, search, siddur, settings)
// get a fixed bottom navigation bar with the real destinations; the current tab is marked, it clears the phone's gesture area,
// never covers the page's content or the reader (and its pager), and the original design has no bar at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, PREFS } from './helpers.mjs';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
async function phone(prefs, width = 384, insets = { top: 32, bottom: 40, left: 0, right: 0 }) {
  const ctx = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript(p => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: p })), { ...PREFS, ...prefs });
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e)));
  const s = await ctx.newCDPSession(p); await s.send('Emulation.setSafeAreaInsetsOverride', { insets });
  return p;
}
const nav = p => p.evaluate(() => {
  const n = document.getElementById('bnav'); if (!n) return null;
  const r = n.getBoundingClientRect(), cs = getComputedStyle(n), hit = document.elementFromPoint(innerWidth / 2, r.top + 10);
  return { top: r.top, bottom: r.bottom, ih: innerHeight, pos: cs.position, pb: cs.paddingBottom, hidden: n.hidden || cs.display === 'none', onTop: n.contains(hit),
    links: [...n.querySelectorAll('a')].map(a => [a.getAttribute('href'), a.textContent.trim(), a.getAttribute('aria-current'), a.getBoundingClientRect().height, a.getBoundingClientRect().width]),
    overflow: document.documentElement.scrollWidth > innerWidth };
});
const SCREENS = [['d/' + D, 'היום'], ['', 'היום'], ['lib', 'ספרייה'], ['search', 'חיפוש'], ['siddur', 'סידור'], ['settings', 'הגדרות']];

for (const d of ['sefer', 'modern', 'nocturne']) test(`1.0.116: "${d}" – bottom nav on every general screen, current tab marked, clears the safe area`, async () => {
  const p = await phone({ design: d });
  for (const [h, cur] of SCREENS) {
    await p.goto(srv.url + '#/' + h); await p.waitForTimeout(500);
    const m = await nav(p);
    assert.ok(m && !m.hidden, `${h}: no nav`); assert.equal(m.pos, 'fixed');
    assert.ok(Math.abs(m.bottom - m.ih) < 1, `${h}: not at the bottom ${JSON.stringify(m)}`);
    assert.equal(m.pb, '40px', 'clears the gesture area'); assert.ok(m.onTop, `${h}: covered`); assert.ok(!m.overflow, `${h}: sideways scroll`);
    assert.deepEqual(m.links.map(l => l[1]), ['היום', 'ספרייה', 'חיפוש', 'סידור', 'הגדרות']);
    assert.deepEqual(m.links.map(l => l[0]), ['#/', '#/lib', '#/search', '#/siddur', '#/settings']);
    assert.deepEqual(m.links.filter(l => l[2] === 'page').map(l => l[1]), [cur], `${h}: current tab`);
    for (const l of m.links) assert.ok(l[3] >= 44 && l[4] >= 44, `${h}: small target ${l}`);
  }
  // tapping a tab really navigates and moves the mark
  await p.goto(srv.url + '#/d/' + D); await p.waitForTimeout(400);
  await p.click('#bnav a[href="#/lib"]'); await p.waitForTimeout(400);
  assert.match(await p.evaluate(() => location.hash), /^#\/lib/);
  assert.equal(await p.getAttribute('#bnav a[aria-current="page"]', 'href'), '#/lib');
  assert.deepEqual(p.errors, []);
});

for (const d of ['sefer', 'modern', 'nocturne']) test(`1.0.116: "${d}" – the nav never covers content (bottom of home, settings) and keeps away from the reader`, async () => {
  const p = await phone({ design: d });
  for (const h of ['d/' + D, 'settings', 'siddur']) {
    await p.goto(srv.url + '#/' + h); await p.waitForTimeout(600);
    await p.evaluate(() => scrollTo(0, 1e7)); await p.waitForTimeout(200);
    const r = await p.evaluate(() => {
      const top = document.getElementById('bnav').getBoundingClientRect().top;
      const last = [...document.querySelectorAll('#app *')].filter(e => e.getClientRects().length && getComputedStyle(e).position !== 'fixed').reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
      return { top, last };
    });
    assert.ok(r.last <= r.top + 0.5, `${h}: content ends under the nav ${JSON.stringify(r)}`);
  }
  // open a reading → no nav at all; its own bar and pager are on top; back home → the nav returns
  await p.goto(srv.url + '#/d/' + D); await p.waitForTimeout(400);
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(300);
  assert.equal(await nav(p), null, 'nav over the reader');
  assert.equal(await p.evaluate(() => document.documentElement.hasAttribute('data-bnav')), false);
  const rbTop = await p.evaluate(() => { const r = document.getElementById('rb').getBoundingClientRect(); return document.getElementById('rb').contains(document.elementFromPoint(innerWidth / 2, r.top + 8)); });
  assert.ok(rbTop, 'the reader bar is covered');
  await p.goto(srv.url + '#/d/' + D); await p.waitForTimeout(400);
  const m = await nav(p); assert.ok(m && !m.hidden, 'nav back after closing the reader');
  assert.deepEqual(p.errors, []);
});

test('1.0.116: no nav in the original design; switching designs adds / removes it; narrow phones fit', async () => {
  const p = await phone({});
  for (const h of ['d/' + D, 'lib', 'settings']) { await p.goto(srv.url + '#/' + h); await p.waitForTimeout(400); assert.equal(await nav(p), null, h); }
  assert.equal(await p.evaluate(() => document.documentElement.hasAttribute('data-bnav')), false);
  await p.goto(srv.url + '#/settings'); await p.waitForTimeout(400);
  await p.check('input[name="design"][value="modern"]', { force: true }); await p.waitForTimeout(300);
  assert.ok(await nav(p), 'picking a design adds the nav');
  await p.check('input[name="design"][value="classic"]', { force: true }); await p.waitForTimeout(300);
  assert.equal(await nav(p), null, 'back to the original – no nav');
  for (const d of ['sefer', 'modern', 'nocturne']) {
    const q = await phone({ design: d }, 320); await q.goto(srv.url + '#/d/' + D); await q.waitForTimeout(500);
    const m = await nav(q); assert.ok(!m.overflow, d);
    const fit = await q.evaluate(() => [...document.querySelectorAll('#bnav a span')].every(s => s.scrollWidth <= s.parentElement.clientWidth + 1));
    assert.ok(fit, `${d}: labels cut at 320px`);
  }
});
