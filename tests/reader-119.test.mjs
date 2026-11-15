// 1.0.119: Dudi – "בחומש רשי מופיע באותיות רשי / תוסיף הגדרה שיופיע בפונט /
// כשבוחרים שיעור פס הניווט של חזרה למסך ראשי נעלם וגם הפס ניווט למטה /
// ולא תמיד פסי הניווט לשיעור הבא או הקודם מופיעים".
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, openChrome } from './helpers.mjs';
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
    await openChrome(p);
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

test('1.0.121: full-screen text; the FAB opens the nav overlay with title, home and prev/next', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const before = await p.evaluate(() => {
    const el = document.getElementById('reader'), fab = document.getElementById('b-fab'), ch = document.getElementById('rchrome');
    const f = fab.getBoundingClientRect(), cs = getComputedStyle(fab);
    return { on: el.classList.contains('chrome-on'), imm: el.classList.contains('immersive'), bnav: !!document.getElementById('bnav'),
      fab: { h: f.height, w: f.width, op: cs.opacity, pe: cs.pointerEvents, hidden: fab.hidden },
      chromeHidden: ch.getAttribute('aria-hidden') === 'true', home: !!document.getElementById('b-home') };
  });
  assert.equal(before.on, false, 'overlay should start closed');
  assert.equal(before.imm, true);
  assert.equal(before.bnav, false);
  assert.ok(before.fab.h >= 44 && before.fab.w >= 44 && before.fab.op !== '0' && before.fab.pe !== 'none' && !before.fab.hidden, JSON.stringify(before.fab));
  assert.equal(before.chromeHidden, true);
  assert.ok(before.home);
  await openChrome(p);
  const rt = await vis(p, '#rt'), rb = await vis(p, '#rb'), home = await vis(p, '#b-home');
  assert.ok(rt.h > 40 && rt.op !== '0' && rt.pe !== 'none', 'title missing in open overlay ' + JSON.stringify(rt));
  assert.ok(rb.h >= 44 && rb.op !== '0', 'nav missing in open overlay ' + JSON.stringify(rb));
  assert.ok(home.h >= 44 && !home.hidden, 'home missing ' + JSON.stringify(home));
  const href = await p.locator('#rt a').first().getAttribute('href');
  assert.match(href, /^#\/d\//);
  assert.equal(await p.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')), true);
  const vp = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.click(vp[0], vp[1]); await p.waitForTimeout(400);
  assert.equal(await p.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')), false, 'text tap should close the overlay');
  assert.deepEqual(p.errors, []);
});

for (const [kind, hash, expect] of [
  ['chumash', `r/chumash/${D}`, { prev: /הקודם|יום קודם/, next: /הבא|יום הבא/, hrefPrev: `#/r/chumash/2026-11-13`, hrefNext: `#/r/chumash/2026-11-15` }],
  ['tanya', `r/tanya/${D}`, { prev: /הקודם|יום קודם/, next: /הבא|יום הבא/, hrefPrev: `#/r/tanya/2026-11-13`, hrefNext: `#/r/tanya/2026-11-15` }],
  ['rambam3', `r/rambam3/${D}`, { prev: /הקודם|יום קודם/, next: /הבא|יום הבא/ }],
  ['siddur', 's/shacharit/3', { prev: /הקודם|התוכן/, next: /הבא|התוכן/ }],
]) test(`1.0.119: "${kind}" – the lesson prev/next bar stays on the first, a middle and the last page`, async () => {
  const p = await phone({ lessonDaf: true });
  await p.goto(srv.url + '#/' + hash);
  await p.waitForSelector('#rc .seg, #rc .doc-head'); await p.waitForTimeout(500);
  const links = async () => p.evaluate(() => ['#b-lprev', '#b-lnext'].map(s => document.querySelector(s)).filter(a => a && !a.hidden).map(a => [a.getAttribute('href'), a.textContent.replace(/\s+/g, ' ').trim(), a.getBoundingClientRect().height]));
  const check = async where => {
    await openChrome(p);
    const rb = await vis(p, '#rb');
    assert.ok(!rb.hidden && rb.display !== 'none' && rb.h >= 44 && rb.op !== '0', `${kind} ${where}: bar ${JSON.stringify(rb)}`);
    const L = await links();
    assert.ok(L.length >= 1, `${kind} ${where}: no links`);
    if (expect.prev) assert.ok(L.some(l => expect.prev.test(l[1])), `${kind} ${where}: prev ${JSON.stringify(L)}`);
    if (expect.next) assert.ok(L.some(l => expect.next.test(l[1])), `${kind} ${where}: next ${JSON.stringify(L)}`);
    if (expect.hrefPrev) assert.ok(L.some(l => l[0] === expect.hrefPrev), `${kind} ${where}: hrefPrev ${JSON.stringify(L)}`);
    if (expect.hrefNext) assert.ok(L.some(l => l[0] === expect.hrefNext), `${kind} ${where}: hrefNext ${JSON.stringify(L)}`);
    for (const l of L) assert.ok(l[2] >= 44, `${kind} ${where}: small target ${JSON.stringify(l)}`);
    const stack = await p.evaluate(() => {
      const rb = document.getElementById('rb').getBoundingClientRect();
      return { rbBot: rb.bottom, bnav: !!document.getElementById('bnav'), lnav: !!document.getElementById('lnav'), ih: innerHeight };
    });
    assert.equal(stack.bnav, false, `${kind} ${where}: app nav still in the reader`);
    assert.equal(stack.lnav, false, `${kind} ${where}: old lnav still present`);
    assert.equal(await p.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')), true, `${kind} ${where}: overlay closed`);
  };
  await check('first');
  const pages = await p.evaluate(() => ({ layout: document.getElementById('vp').classList.contains('pages'), n: window.R?.pages || 0, info: document.getElementById('pinfo')?.textContent || '' }));
  const n = pages.n || (() => { const m = pages.info.match(/מתוך\s+(\d+)/); return m ? +m[1] : 0; })();
  if (pages.layout && n > 1) {
    if (n > 2) { await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(300); await check('middle'); }
    for (let i = 0; i < Math.min(n, 30); i++) {
      const pinfo = await p.locator('#pinfo').textContent();
      await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(200);
      const now = await p.locator('#pinfo').textContent(); if (now === pinfo) break;
    }
    await check('last');
  } else {
    await p.evaluate(() => document.getElementById('vp').scrollTo(0, 1e7)); await p.waitForTimeout(300); await check('end-scroll');
  }
  assert.deepEqual(p.errors, []);
});

test('1.0.119: tapping יום הבא really opens the next day; the back control returns to the day page', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#b-lnext:not([hidden])');
  await openChrome(p);
  await p.click('#b-lnext'); await p.waitForTimeout(600);
  assert.match(await p.evaluate(() => location.hash), /#\/r\/chumash\/2026-11-15/);
  assert.ok(await p.locator('#b-lprev').getAttribute('href') === '#/r/chumash/2026-11-14');
  await openChrome(p);
  await p.click('#rt a'); await p.waitForTimeout(400);
  assert.match(await p.evaluate(() => location.hash), /#\/d\//);
  assert.ok(await p.locator('#bnav').isVisible());
  assert.deepEqual(p.errors, []);
});
