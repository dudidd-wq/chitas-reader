// 1.0.120: Dudi – "פסי הניווט הללו תופסים הרבה מקום יקר במסך".
// One slim bottom bar (home + הקודם + הבא + play), compact title-only top,
// auto-collapse on scroll-down / page turn; a middle tap or scroll-up shows the top again.
// The slim bar always stays, so back-to-home and prev/next are one tap away on every page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith } from './helpers.mjs';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const phone = (prefs = {}) => pageWith(browser, srv.url, { prefs, viewport: { width: 412, height: 915 } });
const metrics = p => p.evaluate(() => {
  const box = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { h: +r.height.toFixed(1), top: +r.top.toFixed(1), bot: +r.bottom.toFixed(1), op: cs.opacity, pe: cs.pointerEvents, hidden: e.hidden, display: cs.display }; };
  const vp = document.getElementById('vp').getBoundingClientRect();
  const padT = parseFloat(getComputedStyle(document.getElementById('rc')).paddingTop);
  const padB = parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom);
  return {
    compact: document.getElementById('reader').classList.contains('compact'),
    immersive: document.getElementById('reader').classList.contains('immersive'),
    rt: box('rt'), rb: box('rb'), home: box('b-home'), prev: box('b-lprev'), next: box('b-lnext'), play: box('b-play2'),
    bnav: !!document.getElementById('bnav'), lnav: !!document.getElementById('lnav'),
    padT, padB, vpH: +vp.height.toFixed(1), textH: +(vp.height - padT - padB).toFixed(1),
    title: document.querySelector('#r-t')?.textContent || '',
    dateVis: !!(document.querySelector('#r-s') && getComputedStyle(document.querySelector('#r-s')).position !== 'absolute' && document.querySelector('#r-s').getClientRects().length)
  };
});
const midTap = async p => {
  const xy = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(350);
};

test('1.0.120: at 412×915 the slim bar is ~44px and holds home, prev, next and play; the top is title-only; no app nav or old lnav', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const m = await metrics(p);
  assert.equal(m.bnav, false, 'app nav still in the reader');
  assert.equal(m.lnav, false, 'old lnav still present');
  assert.ok(m.rb.h >= 44 && m.rb.h <= 52, 'slim bar height ' + m.rb.h);
  assert.ok(Math.abs(m.rb.bot - 915) <= 2, 'bar not at the bottom ' + m.rb.bot);
  assert.ok(m.home.h >= 44 && !m.home.hidden, 'home ' + JSON.stringify(m.home));
  assert.ok(m.prev.h >= 44 && !m.prev.hidden, 'prev ' + JSON.stringify(m.prev));
  assert.ok(m.next.h >= 44 && !m.next.hidden, 'next ' + JSON.stringify(m.next));
  assert.ok(m.play.h >= 44 && !m.play.hidden, 'play ' + JSON.stringify(m.play));
  assert.ok(m.rt.h >= 44 && m.rt.h <= 56 && m.rt.op !== '0', 'top bar ' + JSON.stringify(m.rt));
  assert.ok(m.title.trim().length > 0, 'empty title');
  assert.equal(m.dateVis, false, 'date should be title-only (visually hidden)');
  const labels = await p.evaluate(() => [...document.querySelectorAll('#rb .rb-lbl')].map(e => e.textContent.trim()));
  assert.ok(labels.includes('בית') && labels.includes('הקודם') && labels.includes('הבא'), JSON.stringify(labels));
  assert.ok(m.textH > 639, `text area did not grow (before 639, after ${m.textH})`);
  assert.ok(m.textH >= 780, `text area still tight: ${m.textH}`);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.120: a page turn collapses the top bar; a middle tap shows it again; the slim bar and home never hide', async () => {
  const p = await phone();
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  const n = await p.evaluate(() => { const t = document.getElementById('pinfo')?.textContent || ''; const m = t.match(/מתוך\s+(\d+)/); return m ? +m[1] : 0; });
  assert.ok(n > 1, 'need more than one page, got ' + n);
  await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(400);
  const collapsed = await metrics(p);
  assert.equal(collapsed.compact, true);
  assert.ok(collapsed.rt.op === '0' || collapsed.rt.pe === 'none', 'top still visible after a page turn ' + JSON.stringify(collapsed.rt));
  assert.ok(collapsed.rb.h >= 44 && collapsed.rb.op !== '0' && collapsed.rb.pe !== 'none', 'slim bar hid ' + JSON.stringify(collapsed.rb));
  assert.ok(!collapsed.home.hidden && collapsed.home.h >= 44, 'home hid');
  assert.ok(!collapsed.prev.hidden && !collapsed.next.hidden, 'prev/next hid');
  assert.ok(collapsed.textH > 639, 'collapsed textH ' + collapsed.textH);
  await midTap(p);
  const shown = await metrics(p);
  assert.equal(shown.compact, false);
  assert.ok(shown.rt.op !== '0' && shown.rt.pe !== 'none', 'top did not return ' + JSON.stringify(shown.rt));
  assert.ok(shown.rb.h >= 44 && shown.rb.op !== '0', 'slim bar hid after expand');
  // another tap on the already-expanded reader must not hide the bars (no way back)
  await midTap(p);
  const again = await metrics(p);
  assert.equal(again.compact, false);
  assert.ok(again.rt.op !== '0' && again.rb.op !== '0', 'second tap hid the bars');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('1.0.120: scrolling down collapses the top; scrolling up shows it again', async () => {
  const p = await phone({ layout: 'scroll' });
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
  assert.ok(await p.evaluate(() => document.getElementById('vp').classList.contains('scroll')), 'not in scroll layout');
  await p.evaluate(() => { const vp = document.getElementById('vp'); vp.scrollTop = 400; vp.dispatchEvent(new Event('scroll')); });
  await p.waitForFunction(() => document.getElementById('reader').classList.contains('compact'));
  const down = await metrics(p);
  assert.equal(down.compact, true, 'scroll down did not collapse');
  assert.ok(down.rb.h >= 44 && down.rb.op !== '0', 'slim bar hid on scroll down');
  await p.waitForTimeout(400);
  await p.evaluate(() => { const vp = document.getElementById('vp'); vp.scrollTop = 0; vp.dispatchEvent(new Event('scroll')); });
  await p.waitForFunction(() => {
    const el = document.getElementById('reader'), cs = getComputedStyle(document.getElementById('rt'));
    return !el.classList.contains('compact') && cs.opacity === '1' && cs.pointerEvents !== 'none';
  });
  const up = await metrics(p);
  assert.equal(up.compact, false, 'scroll up did not expand');
  assert.ok(up.rt.op !== '0' && up.rt.pe !== 'none', 'top did not return on scroll up');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

for (const [kind, hash, hrefPrev, hrefNext] of [
  ['chumash mid-lesson', `r/chumash/${D}`, `#/r/chumash/2026-11-13`, `#/r/chumash/2026-11-15`],
  ['siddur', 's/shacharit/3', null, null],
  ['library', 'lib/torah/Genesis/2', '#/lib/torah/Genesis/1', '#/lib/torah/Genesis/3'],
]) test(`1.0.120: "${kind}" – prev/next and home stay on every page`, async () => {
  const p = await phone();
  await p.goto(srv.url + '#/' + hash);
  await p.waitForSelector('#rc .seg, #rc .doc-head'); await p.waitForTimeout(500);
  const check = async where => {
    const m = await metrics(p);
    assert.ok(m.rb.h >= 44 && Math.abs(m.rb.bot - 915) <= 2, `${kind} ${where}: bar ${JSON.stringify(m.rb)}`);
    assert.ok(!m.home.hidden && m.home.h >= 44, `${kind} ${where}: home missing`);
    assert.ok(!m.prev.hidden && !m.next.hidden, `${kind} ${where}: prev/next hidden ${JSON.stringify({ prev: m.prev, next: m.next })}`);
    assert.equal(m.bnav, false);
    const hrefs = await p.evaluate(() => ({ prev: document.getElementById('b-lprev')?.getAttribute('href'), next: document.getElementById('b-lnext')?.getAttribute('href'), home: document.getElementById('b-home')?.getAttribute('href') }));
    if (hrefPrev) assert.equal(hrefs.prev, hrefPrev, `${kind} ${where}: prev ${hrefs.prev}`);
    if (hrefNext) assert.equal(hrefs.next, hrefNext, `${kind} ${where}: next ${hrefs.next}`);
    assert.ok(hrefs.home, `${kind} ${where}: no home href`);
  };
  await check('first');
  const n = await p.evaluate(() => { const t = document.getElementById('pinfo')?.textContent || ''; const m = t.match(/מתוך\s+(\d+)/); return m ? +m[1] : (window.R?.pages || 0); });
  if (n > 2) { await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(300); await check('middle'); }
  if (n > 1) {
    for (let i = 0; i < Math.min(n, 25); i++) {
      const before = await p.locator('#pinfo').textContent();
      await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(180);
      const now = await p.locator('#pinfo').textContent(); if (now === before) break;
    }
    await check('last');
  }
  // home is reachable in one tap even after a collapse
  await p.evaluate(() => document.getElementById('b-next').click()); await p.waitForTimeout(200);
  assert.equal((await metrics(p)).compact || n <= 1, true);
  await p.click('#b-home'); await p.waitForTimeout(500);
  const hashNow = await p.evaluate(() => location.hash);
  assert.ok(!hashNow.startsWith('#/r/') && !hashNow.startsWith('#/s/') && !/^#\/lib\/torah\/Genesis\/\d+$/.test(hashNow), 'home did not leave the lesson: ' + hashNow);
  assert.ok(await p.locator('#bnav').isVisible(), 'app nav should return on the general screens');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
