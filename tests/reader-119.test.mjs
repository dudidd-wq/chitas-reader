// 1.0.119: Dudi – "בחומש רשי מופיע באותיות רשי / תוסיף הגדרה שיופיע בפונט /
// כשבוחרים שיעור פס הניווט של חזרה למסך ראשי נעלם וגם הפס ניווט למטה /
// ולא תמיד פסי הניווט לשיעור הבא או הקודם מופיעים".
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const phone = (prefs = {}) => pageWith(browser, srv.url, { prefs, viewport: { width: 412, height: 915 } });
const ff = (p, sel) => p.locator(sel).first().evaluate(e => getComputedStyle(e).fontFamily);
const vis = (p, sel) => p.locator(sel).evaluate(e => {
  const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return { top: r.top, bottom: r.bottom, h: r.height, w: r.width, display: cs.display, vis: cs.visibility, pe: cs.pointerEvents, op: cs.opacity, hidden: e.hidden };
});

test('1.0.119: default is Rashi script; the setting switches every .rashi to the reading font, in every design', async () => {
  assert.equal(DEFAULT_PREFS.rashiFont, 'rashi');
  for (const d of ['classic', 'sefer', 'modern', 'nocturne']) {
    const p = await phone({ design: d, rashi: true, font: 'david', designFont: 'mine' });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .rashi');
    assert.match(await ff(p, '#rc .rashi'), /Noto Rashi Hebrew/, d + ' default');
    await p.click('#b-aa'); await p.waitForSelector('#sheet input[name=rashiFont]');
    await p.check('#sheet input[name=rashiFont][value=text]', { force: true }); await p.waitForTimeout(200);
    assert.equal(await p.locator('html').getAttribute('data-rashi-font'), 'text');
    assert.match(await ff(p, '#rc .rashi'), /David Libre/, d + ' reading font');
    assert.doesNotMatch(await ff(p, '#rc .rashi'), /Noto Rashi Hebrew/, d);
    await p.check('#sheet input[name=rashiFont][value=rashi]', { force: true }); await p.waitForTimeout(200);
    assert.match(await ff(p, '#rc .rashi'), /Noto Rashi Hebrew/, d + ' back');
    assert.deepEqual(p.errors, []); await p.context().close();
  }
});

test('1.0.119: in the reader (412×915) the back-to-home bar, the page bar and the bottom nav stay after a center tap', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const before = await p.evaluate(() => ({ imm: document.querySelector('#reader').classList.contains('immersive'), back: !!document.querySelector('#rt a[href^="#/d/"]'), bnav: !!document.getElementById('bnav') && !document.getElementById('bnav').hidden }));
  assert.equal(before.imm, false); assert.ok(before.back); assert.ok(before.bnav);
  const vp = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.click(vp[0], vp[1]); await p.waitForTimeout(400);
  const rt = await vis(p, '#rt'), rb = await vis(p, '#rb'), bn = await vis(p, '#bnav');
  assert.ok(rt.h > 40 && rt.op !== '0' && rt.pe !== 'none', 'back bar hidden after tap ' + JSON.stringify(rt));
  assert.ok(rb.h > 40 && rb.op !== '0' && rb.display !== 'none', 'page bar hidden after tap ' + JSON.stringify(rb));
  assert.ok(bn.h > 40 && bn.display !== 'none', 'bottom nav hidden after tap ' + JSON.stringify(bn));
  assert.ok(rb.bottom <= bn.top + 1, `page bar under the nav ${rb.bottom} ${bn.top}`);
  const href = await p.locator('#rt a').first().getAttribute('href');
  assert.match(href, /^#\/d\//);
  assert.equal(await p.evaluate(() => document.querySelector('#reader').classList.contains('immersive')), false);
  assert.deepEqual(p.errors, []);
});

for (const [kind, hash, expect] of [
  ['chumash', `r/chumash/${D}`, { prev: /יום קודם/, next: /יום הבא/, hrefPrev: `#/r/chumash/2026-11-13`, hrefNext: `#/r/chumash/2026-11-15` }],
  ['tanya', `r/tanya/${D}`, { prev: /יום קודם/, next: /יום הבא/, hrefPrev: `#/r/tanya/2026-11-13`, hrefNext: `#/r/tanya/2026-11-15` }],
  ['rambam3', `r/rambam3/${D}`, { prev: /יום קודם/, next: /יום הבא/ }],
  ['siddur', 's/shacharit/3', { prev: /הקודם|התוכן/, next: /הבא|התוכן/ }],
]) test(`1.0.119: "${kind}" – the lesson prev/next bar stays on the first, a middle and the last page`, async () => {
  const p = await phone({ lessonDaf: true });
  await p.goto(srv.url + '#/' + hash);
  await p.waitForSelector('#rc .seg, #rc .doc-head'); await p.waitForTimeout(500);
  const links = async () => p.evaluate(() => [...document.querySelectorAll('#lnav a')].map(a => [a.getAttribute('href'), a.textContent.replace(/\s+/g, ' ').trim(), a.getBoundingClientRect().height]));
  const check = async where => {
    const lnav = await vis(p, '#lnav');
    assert.ok(!lnav.hidden && lnav.display !== 'none' && lnav.h >= 44 && lnav.bottom <= 915 + 1, `${kind} ${where}: lnav ${JSON.stringify(lnav)}`);
    const L = await links();
    assert.ok(L.length >= 1, `${kind} ${where}: no links`);
    if (expect.prev) assert.ok(L.some(l => expect.prev.test(l[1])), `${kind} ${where}: prev ${JSON.stringify(L)}`);
    if (expect.next) assert.ok(L.some(l => expect.next.test(l[1])), `${kind} ${where}: next ${JSON.stringify(L)}`);
    if (expect.hrefPrev) assert.ok(L.some(l => l[0] === expect.hrefPrev), `${kind} ${where}: hrefPrev ${JSON.stringify(L)}`);
    if (expect.hrefNext) assert.ok(L.some(l => l[0] === expect.hrefNext), `${kind} ${where}: hrefNext ${JSON.stringify(L)}`);
    for (const l of L) assert.ok(l[2] >= 44, `${kind} ${where}: small target ${JSON.stringify(l)}`);
    const stack = await p.evaluate(() => {
      const ln = document.getElementById('lnav').getBoundingClientRect(), b = document.getElementById('bnav').getBoundingClientRect();
      const last = [...document.querySelectorAll('#rc *')].filter(e => e.getClientRects().length && !e.closest('.lnav, .r-top, .r-bottom, .bnav')).reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0);
      return { lnTop: ln.top, bTop: b.top, last };
    });
    assert.ok(stack.lnTop <= stack.bTop + 1, `${kind} ${where}: lnav under bnav`);
  };
  await check('first');
  const pages = await p.evaluate(() => ({ layout: document.getElementById('vp').classList.contains('pages'), n: window.R?.pages || 0 }));
  // middle and last: turn pages if paged; otherwise scroll to the end and back a little
  if (await p.locator('#b-next').isVisible()) {
    const n = await p.evaluate(() => {
      const t = document.getElementById('pinfo')?.textContent || '';
      const m = t.match(/מתוך\s+(\d+)/); return m ? +m[1] : 0;
    });
    if (n > 2) { await p.click('#b-next'); await p.waitForTimeout(300); await check('middle'); }
    if (n > 1) {
      for (let i = 0; i < Math.min(n, 30); i++) { const dis = await p.locator('#b-next').isDisabled(); if (dis) break; const pinfo = await p.locator('#pinfo').textContent(); await p.click('#b-next'); await p.waitForTimeout(200); const now = await p.locator('#pinfo').textContent(); if (now === pinfo) break; }
      await check('last');
    }
  } else {
    await p.evaluate(() => document.getElementById('vp').scrollTo(0, 1e7)); await p.waitForTimeout(300); await check('end-scroll');
  }
  assert.deepEqual(p.errors, []);
});

test('1.0.119: tapping יום הבא really opens the next day; the back control returns to the day page', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#lnav a');
  await p.click('#lnav a[data-day=next]'); await p.waitForTimeout(600);
  assert.match(await p.evaluate(() => location.hash), /#\/r\/chumash\/2026-11-15/);
  assert.ok(await p.locator('#lnav a[data-day=prev]').getAttribute('href') === '#/r/chumash/2026-11-14');
  await p.click('#rt a'); await p.waitForTimeout(400);
  assert.match(await p.evaluate(() => location.hash), /#\/d\//);
  assert.ok(await p.locator('#bnav').isVisible());
  assert.deepEqual(p.errors, []);
});
