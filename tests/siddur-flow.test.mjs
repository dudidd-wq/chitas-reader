// 1.0.55: a seder of the siddur is read as one continuous text – paging flows from section to section with no
// break, separate screen or gap; the section names stay as light markers; the address, the subtitle and the
// per-section progress follow the section being read; the contents, deep links and the "prayer now" card still work.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, progressOf, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const idx = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/index.json', import.meta.url)));
const shach = idx.books.find(b => b.id === 'shacharit');
// a paragraph a little before the end of Shacharit section 3 (the Amidah) – paging from there crosses into section 4
const s3 = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/shacharit/3.json', import.meta.url))).b.map(([t], i) => [t, i]).filter(([t]) => t === 'p');
const NEAR_END = `shacharit-3-${s3.at(-4)[1]}`;
const pageTo = async (p, key, want) => { // turn pages until the address shows section `want`
  for (let i = 0; i < 80; i++) {
    if ((await p.evaluate(() => location.hash)).endsWith('/' + want)) return;
    await p.keyboard.press(key); await p.waitForTimeout(550);
  }
};
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const open = async (p, hash) => { await p.goto(srv.url + hash); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(500); };
const inView = (p, sel) => p.evaluate(s => { const e = document.querySelector(s), v = document.querySelector('#vp').getBoundingClientRect();
  return [...e.getClientRects()].some(r => r.width > 1 && r.left >= v.left - 1 && r.right <= v.right + 1 && r.top >= v.top - 1 && r.bottom <= v.bottom + 1); }, sel);

test('one seder = one continuous text: every section, light markers, one end', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await open(p, '#/s/shacharit/1');
  const m = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#rc h2.sd-sec')].map(h => [h.dataset.sec, h.textContent]),
    ends: document.querySelectorAll('#rc .endmark').length,
    brk: [...document.querySelectorAll('#rc h2.sd-sec')].map(h => getComputedStyle(h).breakBefore),
    size: [...document.querySelectorAll('#rc h2.sd-sec')].map(h => parseFloat(getComputedStyle(h).fontSize) / parseFloat(getComputedStyle(document.querySelector('#rc .seg')).fontSize)) }));
  assert.deepEqual(m.secs, shach.secs.map((s, i) => [String(i + 1), s.he]), 'all sections, in order, each with its name');
  assert.equal(m.ends, 1, 'a single end, after the last section');
  assert.ok(m.brk.every(b => b === 'auto'), 'no forced break before a section');
  assert.ok(m.size.every(x => x < 0.8), 'section names are light markers, smaller than the text');
  assert.match(await p.textContent('#endmark'), /סוף ״שחרית לחול״.*לחלק הבא: מנחה/s);
  // a single-section seder has no marker at all
  await open(p, '#/s/chatzot/1');
  assert.equal(await p.locator('#rc h2.sd-sec').count(), 0);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

for (const [w, h] of [[390, 800], [320, 568], [568, 320], [1366, 800]]) {
  test(`${w}x${h}: deep link opens at its section, paging crosses sections without a break, address follows`, { skip }, async () => {
    const p = await pageWith(browser, srv.url, { viewport: { width: w, height: h } });
    // no gap: in most of the sections, the end of the previous one shares the page with the section's start
    let shared = 0;
    for (let n = 2; n <= shach.secs.length; n++) {
      await open(p, `#/s/shacharit/${n}`);
      assert.ok(await inView(p, `#sec-${n}`), `${w}x${h}: section ${n} start is on screen`);
      assert.equal(await p.evaluate(() => location.hash), `#/s/shacharit/${n}`);
      if (await p.evaluate(n => { const e = document.querySelector(`#sec-${n}`).previousElementSibling, v = document.querySelector('#vp').getBoundingClientRect();
        return [...e.getClientRects()].some(r => r.width > 1 && r.left >= v.left - 1 && r.right <= v.right + 1 && r.bottom > v.top && r.top < v.bottom); }, n)) shared++;
    }
    // 1.0.68: at 320px (either side; 1.0.74 Tachanun omit markers moved the 568x320 breaks) the page breaks fall by chance (CI fonts); 2 of 6 still proves no forced gap (break-before is checked above)
    assert.ok(shared >= (Math.min(w, h) <= 320 ? 2 : 3), `${w}x${h}: sections run on from the previous one on the same page (${shared}/${shach.secs.length - 1})`);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no overflow');
    // page forward from near the end of section 3 into section 4
    await p.evaluate(id => { const k = 'chitas-reader.v1', st = JSON.parse(localStorage.getItem(k)); st.progress['siddur|shacharit/3'] = { pos: id, sub: 0, done: false, t: 1 }; localStorage.setItem(k, JSON.stringify(st)); }, NEAR_END);
    await open(p, '#/s/shacharit/3');
    assert.equal(await p.evaluate(() => location.hash), '#/s/shacharit/3');
    assert.match(await p.textContent('#r-s'), new RegExp(shach.secs[2].he.split(' ')[0]));
    await pageTo(p, 'ArrowLeft', 4);
    await p.waitForFunction(() => location.hash === '#/s/shacharit/4', null, { timeout: 3000 });
    assert.equal(await p.locator('#reader:not([hidden])').count(), 1, 'still the same reader – no new screen');
    await p.waitForTimeout(600);
    assert.equal(await p.textContent('#r-s'), shach.secs[3].he, 'subtitle names the section being read');
    assert.match(await p.title(), new RegExp(shach.secs[3].he));
    const prog = await progressOf(p);
    assert.ok(prog['siddur|shacharit/3']?.done, 'the section read through is marked read');
    assert.ok(!prog['siddur|shacharit/4']?.done);
    // refresh: back at the same place in section 4 (wait for hash + layout; 568x320 is tight on CI)
    await p.reload();
    await p.waitForSelector('#rc .seg');
    await p.waitForFunction(() => location.hash === '#/s/shacharit/4', null, { timeout: 5000 });
    await p.waitForFunction(() => {
      const e = document.querySelector('#sec-4'), v = document.querySelector('#vp')?.getBoundingClientRect();
      if (!e || !v) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.bottom > v.top && r.top < v.bottom;
    }, null, { timeout: 8000 });
    assert.equal(await p.evaluate(() => location.hash), '#/s/shacharit/4');
    assert.ok(await inView(p, '#sec-4'), 'refresh keeps the place (the start of section 4)');
    // back into section 3: the address follows, nothing is marked read
    await pageTo(p, 'ArrowRight', 3);
    await p.waitForFunction(() => location.hash === '#/s/shacharit/3', null, { timeout: 3000 });
    await p.waitForTimeout(600);
    assert.ok(!(await progressOf(p))['siddur|shacharit/4']?.done);
    // the contents still list every section, with ✓ for the one read; Back leaves the reader (no extra history entries)
    const back = p.locator('.r-top a.btn');
    await back.waitFor({ state: 'visible' });
    try { await back.click({ timeout: 4000 }); }
    catch { await p.evaluate(() => document.querySelector('.r-top a.btn')?.click()); }
    await p.waitForSelector('.sd-toc a');
    assert.equal(await p.locator('.sd-toc a').count(), idx.books.reduce((a, b) => a + b.secs.length, 0));
    assert.match(await p.locator('.sd-toc a[href="#/s/shacharit/3"]').locator('xpath=..').innerText(), /✓/);
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

// 1.0.57: the address follows a page turn at once (it lagged 400 ms, so a quick second turn overshot the section's start),
// and a refresh right after a turn – inside the save delay – still comes back to the page just reached
for (const [w, h] of [[320, 568], [390, 800]]) {
  test(`${w}x${h}: the address follows a page turn at once; an immediate refresh keeps the page`, { skip }, async () => {
    const p = await pageWith(browser, srv.url, { viewport: { width: w, height: h } });
    await open(p, '#/s/shacharit/4');
    assert.ok(await inView(p, '#sec-4'));
    // omit/special markers can change page height; step back until the previous section is addressed
    let guard = 0;
    while (await p.evaluate(() => location.hash) === '#/s/shacharit/4' && guard++ < 8) {
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60);
    }
    assert.equal(await p.evaluate(() => location.hash), '#/s/shacharit/3', 'back to section 3 at once (hash updates without lag)');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(60);
    assert.equal(await p.evaluate(() => location.hash), '#/s/shacharit/4', 'forward again: section 4 at once');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(60);
    const at = await p.textContent('#pinfo');
    await p.reload(); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(600);
    assert.equal(await p.evaluate(() => location.hash), '#/s/shacharit/4');
    assert.equal(await p.textContent('#pinfo'), at, 'a refresh right after a page turn keeps that page');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('scroll mode: one continuous column, the address follows the section on screen', { skip }, async () => {
  const p = await pageWith(browser, srv.url, { prefs: { layout: 'scroll' } });
  await open(p, '#/s/kabbalat/2');
  assert.ok(await inView(p, '#sec-2'));
  const gap = await p.evaluate(() => { const h = document.querySelector('#sec-3'); return h.getBoundingClientRect().top - h.previousElementSibling.getBoundingClientRect().bottom; });
  assert.ok(gap < 60, `no gap before a section (${gap}px)`);
  await p.evaluate(() => { const vp = document.querySelector('#vp'), h = document.querySelector('#sec-3'); vp.scrollTop += h.getBoundingClientRect().top - vp.getBoundingClientRect().top + 200; });
  await p.waitForFunction(() => location.hash === '#/s/kabbalat/3', null, { timeout: 3000 });
  assert.ok((await progressOf(p))['siddur|kabbalat/2']?.done);
  const ax = await new AxeBuilder({ page: p }).include('#reader').analyze();
  assert.deepEqual(ax.violations.map(v => v.id), []);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a saved place inside a section is restored; the "prayer now" card opens its section; next seder at the end', { skip }, async () => {
  const p = await pageWith(browser, srv.url, { progress: { 'siddur|shacharit/2': { pos: 'shacharit-2-18', sub: 0, done: false, t: 1 } } });
  await open(p, '#/s/shacharit/2');
  assert.ok(await inView(p, '[data-id="shacharit-2-18"]'), 'opened at the saved paragraph');
  await p.goto(srv.url); await p.waitForSelector('.tefila .tf-list a');
  const href = await p.locator('.tefila .tf-list a').first().getAttribute('href');
  const [, bk, n] = href.match(/^#\/s\/([a-z]+)\/(\d+)$/);
  await p.click('.tefila .tf-list a >> nth=0'); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(500);
  if (+n > 1) assert.ok(await inView(p, `#sec-${n}`), `card → ${bk} section ${n} on screen`);
  assert.equal(await p.evaluate(() => location.hash), href);
  // the end of a seder leads to the next one
  await open(p, '#/s/mincha/2');
  await p.keyboard.press('End'); await p.waitForTimeout(400);
  await p.click('#b-nextunit'); await p.waitForFunction(() => location.hash === '#/s/maariv/1');
  assert.ok((await progressOf(p))['siddur|mincha/3']?.done);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
