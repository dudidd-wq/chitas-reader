// 1.0.121: Dudi – "זה לא נראה הכי טוב / אולי צריך כפתור קטן צף שבלחיצה עליו עונה פס הניווט".
// Full-screen text, a 44px floating button, and a polished overlay (title, בית, prev/next, play)
// that closes on a second tap, a text tap, or ~5s idle. Prev/next work in the siddur and library;
// home is two taps away (FAB then בית).
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, openChrome } from './helpers.mjs';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const phone = (prefs = {}) => pageWith(browser, srv.url, { prefs, viewport: { width: 412, height: 915 } });
const metrics = p => p.evaluate(() => {
  const box = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { h: +r.height.toFixed(1), w: +r.width.toFixed(1), top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1),
      x: +r.left.toFixed(1), op: cs.opacity, pe: cs.pointerEvents, hidden: e.hidden, display: cs.display, bg: cs.backgroundColor }; };
  const vp = document.getElementById('vp').getBoundingClientRect();
  const padT = parseFloat(getComputedStyle(document.getElementById('rc')).paddingTop);
  const padB = parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom);
  const el = document.getElementById('reader');
  return {
    on: el.classList.contains('chrome-on'),
    compact: el.classList.contains('compact'),
    fab: box('b-fab'), chrome: box('rchrome'), rt: box('rt'), rb: box('rb'),
    home: box('b-home'), prev: box('b-lprev'), next: box('b-lnext'), play: box('b-play2'),
    bnav: !!document.getElementById('bnav'), lnav: !!document.getElementById('lnav'),
    padT, padB, vpH: +vp.height.toFixed(1), textH: +(vp.height - padT - padB).toFixed(1),
    title: document.querySelector('#r-t')?.textContent || '',
    labels: [...document.querySelectorAll('#rb .rb-lbl')].map(e => e.textContent.trim()),
    fabExpanded: document.getElementById('b-fab')?.getAttribute('aria-expanded'),
    chromeHidden: document.getElementById('rchrome')?.getAttribute('aria-hidden')
  };
});
const midTap = async p => {
  const xy = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(350);
};

test('1.0.121: at 412×915 the text is full-screen; a 44px FAB sits in the bottom corner; no fixed bars', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const m = await metrics(p);
  assert.equal(m.on, false);
  assert.equal(m.bnav, false);
  assert.equal(m.lnav, false);
  assert.ok(m.fab && m.fab.h >= 44 && m.fab.w >= 44 && m.fab.h <= 48, 'FAB size ' + JSON.stringify(m.fab));
  assert.ok(m.fab.op !== '0' && m.fab.pe !== 'none' && !m.fab.hidden, 'FAB hidden ' + JSON.stringify(m.fab));
  assert.ok(m.fab.bot <= 915 - 8 && m.fab.bot >= 915 - 80, 'FAB not in the bottom corner ' + JSON.stringify(m.fab));
  assert.equal(m.fabExpanded, 'false');
  assert.equal(m.chromeHidden, 'true');
  assert.ok(m.chrome.op === '0' || m.chrome.pe === 'none', 'overlay visible while closed ' + JSON.stringify(m.chrome));
  assert.ok(m.textH >= 850, `text area still tight: ${m.textH}`);
  assert.ok(m.padT <= 16 && m.padB <= 36, `pads ${m.padT}/${m.padB}`);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.121: tapping the FAB opens a polished overlay with title, בית, יום קודם/יום הבא and play; tapping it again closes', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const closedPad = await p.evaluate(() => ({ t: parseFloat(getComputedStyle(document.getElementById('rc')).paddingTop), b: parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom) }));
  await p.click('#b-fab'); await p.waitForTimeout(350);
  const m = await metrics(p);
  assert.equal(m.on, true);
  assert.equal(m.fabExpanded, 'true');
  assert.equal(m.chromeHidden, 'false');
  assert.ok(m.chrome.op !== '0' && m.chrome.pe !== 'none', 'overlay did not appear ' + JSON.stringify(m.chrome));
  assert.ok(m.title.trim().length > 0, 'empty title');
  assert.ok(m.home.h >= 44 && !m.home.hidden, 'home ' + JSON.stringify(m.home));
  assert.ok(m.prev.h >= 44 && !m.prev.hidden, 'prev ' + JSON.stringify(m.prev));
  assert.ok(m.next.h >= 44 && !m.next.hidden, 'next ' + JSON.stringify(m.next));
  assert.ok(m.play.h >= 44 && !m.play.hidden, 'play ' + JSON.stringify(m.play));
  assert.ok(m.labels.includes('בית') && m.labels.includes('יום קודם') && m.labels.includes('יום הבא'), JSON.stringify(m.labels));
  const openPad = await p.evaluate(() => ({ t: parseFloat(getComputedStyle(document.getElementById('rc')).paddingTop), b: parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom) }));
  assert.deepEqual(openPad, closedPad, 'opening the overlay must not change text padding');
  await p.click('#b-fab'); await p.waitForTimeout(350);
  const closed = await metrics(p);
  assert.equal(closed.on, false, 'second FAB tap should close the overlay');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.121: a tap on the text closes the overlay; a later text tap does not open it', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  await openChrome(p);
  assert.equal((await metrics(p)).on, true);
  await midTap(p);
  assert.equal((await metrics(p)).on, false, 'text tap should close');
  await midTap(p);
  assert.equal((await metrics(p)).on, false, 'text tap must not reopen the overlay');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.121: the overlay closes after about 5 seconds idle', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__chromeIdleMs = 5000; });
  await openChrome(p);
  assert.equal((await metrics(p)).on, true);
  await p.waitForFunction(() => !document.getElementById('reader').classList.contains('chrome-on'), null, { timeout: 7000 });
  assert.equal((await metrics(p)).on, false);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

for (const [kind, hash, hrefPrev, hrefNext, labPrev, labNext] of [
  ['chumash mid-lesson', `r/chumash/${D}`, `#/r/chumash/2026-11-13`, `#/r/chumash/2026-11-15`, 'יום קודם', 'יום הבא'],
  ['siddur', 's/shacharit/3', null, null, 'הקודם', 'הבא'],
  ['library', 'lib/torah/Genesis/2', '#/lib/torah/Genesis/1', '#/lib/torah/Genesis/3', 'הקודם', 'הבא'],
]) test(`1.0.121: "${kind}" – prev/next work on every page; home is two taps away`, async () => {
  const p = await phone();
  await p.goto(srv.url + '#/' + hash);
  await p.waitForSelector('#rc .seg, #rc .doc-head'); await p.waitForTimeout(500);
  const check = async where => {
    const closed = await metrics(p);
    assert.ok(closed.fab.h >= 44 && closed.fab.op !== '0', `${kind} ${where}: FAB ${JSON.stringify(closed.fab)}`);
    await openChrome(p);
    const m = await metrics(p);
    assert.equal(m.on, true, `${kind} ${where}: overlay closed`);
    assert.ok(!m.home.hidden && m.home.h >= 44, `${kind} ${where}: home missing`);
    assert.ok(!m.prev.hidden && !m.next.hidden, `${kind} ${where}: prev/next hidden ${JSON.stringify({ prev: m.prev, next: m.next })}`);
    assert.ok(m.labels.includes('בית'));
    if (labPrev) assert.ok(m.labels.includes(labPrev) || m.labels.includes('התוכן'), `${kind} ${where}: labels ${JSON.stringify(m.labels)}`);
    if (labNext) assert.ok(m.labels.includes(labNext) || m.labels.includes('התוכן'), `${kind} ${where}: labels ${JSON.stringify(m.labels)}`);
    assert.equal(m.bnav, false);
    const hrefs = await p.evaluate(() => ({ prev: document.getElementById('b-lprev')?.getAttribute('href'), next: document.getElementById('b-lnext')?.getAttribute('href'), home: document.getElementById('b-home')?.getAttribute('href') }));
    if (hrefPrev) assert.equal(hrefs.prev, hrefPrev, `${kind} ${where}: prev ${hrefs.prev}`);
    if (hrefNext) assert.equal(hrefs.next, hrefNext, `${kind} ${where}: next ${hrefs.next}`);
    assert.ok(hrefs.home, `${kind} ${where}: no home href`);
  };
  await check('first');
  const n = await p.evaluate(() => window.R?.pages || 0);
  if (n > 2) { await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(300); await check('middle'); }
  if (n > 1) {
    for (let i = 0; i < Math.min(n, 25); i++) {
      const before = await p.evaluate(() => window.R?.page);
      await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(180);
      const now = await p.evaluate(() => window.R?.page); if (now === before) break;
    }
    await check('last');
  }
  // home is two taps away: FAB (if closed) then בית
  if (!(await p.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')))) await openChrome(p);
  await p.click('#b-home'); await p.waitForTimeout(500);
  const hashNow = await p.evaluate(() => location.hash);
  assert.ok(!hashNow.startsWith('#/r/') && !hashNow.startsWith('#/s/') && !/^#\/lib\/torah\/Genesis\/\d+$/.test(hashNow), 'home did not leave the lesson: ' + hashNow);
  assert.ok(await p.locator('#bnav').isVisible(), 'app nav should return on the general screens');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.121: the FAB and open overlay follow the sefer design colors', async () => {
  const p = await phone({ design: 'sefer' });
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const closed = await metrics(p);
  assert.equal(closed.on, false);
  assert.ok(closed.fab.h >= 44 && closed.fab.op !== '0');
  await p.click('#b-fab'); await p.waitForTimeout(350);
  const open = await metrics(p);
  assert.equal(open.on, true);
  assert.ok(open.title.trim().length > 0);
  assert.ok(open.home.h >= 44 && open.play.h >= 44);
  const colors = await p.evaluate(() => {
    const ch = getComputedStyle(document.getElementById('rchrome'));
    const fab = getComputedStyle(document.getElementById('b-fab'));
    const filled = cs => (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') || (cs.backgroundImage && cs.backgroundImage !== 'none');
    return { design: document.documentElement.getAttribute('data-design'), chromeOk: filled(ch), fabOk: filled(fab), ink: ch.color };
  });
  assert.equal(colors.design, 'sefer');
  assert.ok(colors.chromeOk, 'overlay has no sefer fill');
  assert.ok(colors.fabOk, 'FAB has no sefer fill');
  assert.notEqual(colors.ink, 'rgba(0, 0, 0, 0)');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
