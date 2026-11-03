// 1.0.55: day navigation inside a lesson – "יום קודם" / "היום" / "יום הבא" under the title and at the end of the lesson.
// The address keeps the day (a refresh stays on it), the dates shown follow it, every calendar (Israel / Diaspora,
// Tishrei, the Rav Yomi luach year) gives the same lesson as opening that day directly, and read-aloud stops.
import test from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { dayPlan, fmtDmy } from '../site/js/calendar.js';

const skip = !CHROME && 'no Chrome';
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

const open = async (p, unit, iso) => { await p.goto(srv.url + `#/r/${unit}/${iso}`); await p.waitForSelector('#rc .seg, #rc .doc-credit'); await p.waitForTimeout(250); };
const state = p => p.evaluate(() => ({ hash: location.hash, sub: document.querySelector('#r-s').textContent, h1: document.querySelector('#rc h1').textContent,
  head: document.querySelector('#rc .doc-head').textContent, text: document.querySelector('#rc').textContent.slice(0, 4000) }));
// click a day control and wait for the reader to show the new day
const go = async (p, which, iso, where = 'top') => {
  await p.click(`.daynav-${where} [data-day="${which}"]`);
  await p.waitForFunction(i => location.hash.endsWith('/' + i) && !!document.querySelector('#rc .seg, #rc .doc-credit') && document.querySelector('#r-s').textContent.includes(i.split('-').reverse().join('/')), iso);
  await p.waitForTimeout(250);
};

test('day navigation: next / previous / today, dates and address follow, refresh stays on the day', { skip }, async () => {
  const p = await pageWith(browser, srv.url, { viewport: { width: 390, height: 844 } });
  const today = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  for (const unit of ['chumash', 'tehillim', 'tanya', 'rambam3', 'rambam1', 'mitzvot']) {
    await open(p, unit, '2026-11-02');
    assert.equal(await p.locator('.daynav').count(), 2, `${unit}: top and end`);
    await go(p, 'next', '2026-11-03');
    const s = await state(p);
    assert.match(s.sub, /03\/11\/2026/); assert.match(s.sub, new RegExp(dayPlan(new Date('2026-11-03T12:00:00')).hebDate));
    assert.match(s.head, /03\/11\/2026|3 בנובמבר 2026/);
    // the same lesson as opening that day directly
    const q = await pageWith(browser, srv.url, { viewport: { width: 390, height: 844 } });
    await open(q, unit, '2026-11-03'); const d = await state(q); await q.context().close();
    assert.equal(s.text, d.text, `${unit}: navigated day = deep link`);
    await go(p, 'prev', '2026-11-02', 'end');
    assert.match((await state(p)).sub, /02\/11\/2026/);
    await p.reload(); await p.waitForSelector('#rc .seg');
    assert.equal((await state(p)).hash, `#/r/${unit}/2026-11-02`, 'refresh stays on the day');
  }
  // "היום" only when another day is shown, and it leads to today
  await open(p, 'tanya', '2026-12-20');
  assert.equal(await p.getAttribute('.daynav-top [data-day="today"]', 'href'), `#/r/tanya/${today}`);
  await go(p, 'today', today);
  assert.equal(await p.locator('.daynav [data-day="today"]').count(), 0, 'no "today" button on today');
  // browser Back returns to the previous day
  await p.goBack(); await p.waitForFunction(() => location.hash.endsWith('2026-12-20'));
  await p.waitForSelector('#rc .seg');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('day navigation keeps the calendar right: Israel / Diaspora, Tishrei, Rav Yomi outside its year', { skip }, async () => {
  // Shavuot 5787 ends on Shabbat in the Diaspora: from Sunday 13/06/2027 Israel is a parasha ahead
  const dIL = dayPlan(new Date('2027-06-13T12:00:00'), { il: true }).chumash, dDi = dayPlan(new Date('2027-06-13T12:00:00'), { il: false }).chumash;
  assert.notEqual(String(dIL.parsha), String(dDi.parsha));
  const res = {};
  for (const il of [true, false]) {
    const p = await pageWith(browser, srv.url, { prefs: { il } });
    await open(p, 'chumash', '2027-06-12'); await go(p, 'next', '2027-06-13');
    const s = await state(p); res[il] = s.text;
    const q = await pageWith(browser, srv.url, { prefs: { il } }); await open(q, 'chumash', '2027-06-13');
    assert.equal(s.text, (await state(q)).text, `il=${il}`); await q.context().close();
    // Tishrei: Simchat Torah (22 Tishrei in Israel, 23 in the Diaspora) → Bereshit
    for (const [from, to] of [['2026-10-03', '2026-10-04'], ['2026-10-04', '2026-10-05'], ['2026-09-12', '2026-09-13']]) {
      await open(p, 'chumash', from); await go(p, 'next', to);
      const a = await state(p);
      const r = await pageWith(browser, srv.url, { prefs: { il } }); await open(r, 'chumash', to);
      assert.equal(a.text, (await state(r)).text, `il=${il} ${to}`); await r.context().close();
    }
    assert.deepEqual(p.errors, []); await p.context().close();
  }
  assert.notEqual(res.true, res.false, 'Israel and Diaspora differ on 13/06/2027');
  // Rav Yomi: the luach covers 13/01/2026–02/01/2027; one day past it the honest note, one day back the lesson again
  const p = await pageWith(browser, srv.url, { prefs: { lessonRavYomi: true } });
  await p.goto(srv.url + '#/r/ravyomi/2027-01-02'); await p.waitForSelector('#rc .doc-credit');
  assert.doesNotMatch(await p.textContent('#rc'), /רק לשנה/);
  await p.click('.daynav-top [data-day="next"]'); await p.waitForFunction(() => location.hash.endsWith('2027-01-03'));
  await p.waitForFunction(() => /רק לשנה/.test(document.querySelector('#rc').textContent));
  await p.click('.daynav-top [data-day="prev"]'); await p.waitForFunction(() => location.hash.endsWith('2027-01-02'));
  await p.waitForFunction(() => !/רק לשנה/.test(document.querySelector('#rc').textContent) && /03\/01\/2027|02\/01\/2027/.test(document.querySelector('#r-s').textContent));
  assert.match(await p.textContent('#r-s'), /02\/01\/2027/);
  assert.deepEqual(p.errors, []); await p.context().close();
});

test('day navigation: accessible (labels with the date, keyboard, focus, announcement, no ISO), stops read-aloud', { skip }, async () => {
  const synth = () => {
    window.__spoken = []; let cur = null;
    const s = { getVoices: () => [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }],
      cancel() { if (cur) { clearTimeout(cur); cur = null; } window.__cancel = (window.__cancel || 0) + 1; }, pause() {}, resume() {}, speaking: false, pending: false,
      addEventListener() {}, removeEventListener() {},
      speak(u) { window.__spoken.push(location.hash.slice(-5) + ' ' + u.text); cur = setTimeout(() => { u.onstart?.({}); cur = setTimeout(() => { cur = null; u.onend?.({}); }, 400); }, 2); } };
    Object.defineProperty(window, 'speechSynthesis', { value: s, configurable: true });
  };
  const p = await pageWith(browser, srv.url, { viewport: { width: 390, height: 844 }, init: synth });
  await open(p, 'tehillim', '2026-11-02');
  const labels = await p.$$eval('.daynav', n => n.map(x => x.getAttribute('aria-label')));
  assert.equal(new Set(labels).size, 2, 'the two navs have distinct names');
  const al = await p.$$eval('.daynav a', a => a.map(x => [x.textContent.trim(), x.getAttribute('aria-label'), x.getAttribute('href')]));
  for (const [vis, label] of al) { assert.ok(label.startsWith(vis), `label starts with the visible text: ${label}`); assert.doesNotMatch(label, ISO); }
  assert.ok(al.some(([, l]) => l.includes('03/11/2026') && l.includes(dayPlan(new Date('2026-11-03T12:00:00')).hebDate)));
  assert.doesNotMatch(await p.innerText('#reader'), ISO);
  // 44×44 targets
  const small = await p.$$eval('.daynav-top a', a => a.filter(x => { const r = x.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length);
  assert.equal(small, 0);
  // keyboard: Tab to "יום הבא", Enter → next day, focus stays on "יום הבא" of the new day, the day is announced
  await p.focus('.daynav-top [data-day="next"]'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash.endsWith('2026-11-03') && /03\/11\/2026/.test(document.querySelector('#r-s').textContent) && document.activeElement?.dataset.day === 'next' && !!document.querySelector('#toast').textContent);
  assert.match(await p.textContent('#toast'), /תהילים.*03\/11\/2026/);
  assert.equal(await p.getAttribute('#toast', 'aria-live'), 'polite');
  // Shift+← / Shift+→ (RTL: left is forward)
  await p.locator('#vp').click({ position: { x: 5, y: 300 } }).catch(() => {});
  await p.keyboard.press('Shift+ArrowLeft'); await p.waitForFunction(() => location.hash.endsWith('2026-11-04') && /04\/11\/2026/.test(document.querySelector('#r-s').textContent) && !!document.querySelector('#rc .seg')); await p.waitForTimeout(250);
  await p.keyboard.press('Shift+ArrowRight'); await p.waitForFunction(() => location.hash.endsWith('2026-11-03') && /03\/11\/2026/.test(document.querySelector('#r-s').textContent));
  await p.waitForSelector('#rc .seg'); await p.waitForTimeout(250);
  await p.keyboard.press('Home'); await p.waitForTimeout(300);
  // read-aloud stops when the day changes
  await p.keyboard.press('p'); await p.waitForSelector('#ttsctl:not([hidden])'); await p.waitForTimeout(300);
  assert.ok(await p.evaluate(() => window.__spoken.length) > 0);
  const c0 = await p.evaluate(() => window.__cancel || 0);
  await p.click('.daynav-top [data-day="next"]'); await p.waitForFunction(() => location.hash.endsWith('2026-11-04') && /04\/11\/2026/.test(document.querySelector('#r-s').textContent) && !!document.querySelector('#rc .seg'));
  await p.waitForTimeout(1500);
  assert.ok(await p.evaluate(c => window.__cancel > c, c0), 'speech cancelled');
  assert.equal(await p.evaluate(() => document.querySelectorAll('#rc .speaking').length), 0);
  assert.equal(await p.isVisible('#ttsctl'), false, 'player closed');
  assert.deepEqual(await p.evaluate(() => window.__spoken.filter(t => t.startsWith('11-04'))), [], 'nothing of the new day is read by itself');
  const ax = await new AxeBuilder({ page: p }).include('#reader').analyze();
  assert.deepEqual(ax.violations.map(v => v.id), []);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('day navigation on every screen size, in pages and in scroll mode', { skip }, async () => {
  for (const [w, h] of [[320, 568], [390, 844], [568, 320], [844, 390], [1366, 800]]) for (const layout of ['pages', 'scroll']) {
    const p = await pageWith(browser, srv.url, { viewport: { width: w, height: h }, prefs: { layout } });
    await open(p, 'chumash', '2026-11-02');
    const short = (w > h && h <= 500) || (h > w && h <= 640);
    assert.equal(await p.isVisible('.daynav-top'), !short, `${w}x${h}: top controls ${short ? 'hidden (page 1 is for the text)' : 'shown'}`);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${w}x${h} no overflow`);
    // the end of the lesson always has them
    await p.keyboard.press('End'); await p.waitForTimeout(500);
    const end = p.locator('.daynav-end [data-day="next"]');
    assert.ok(await end.isVisible(), `${w}x${h} ${layout}: end controls visible at the end`);
    const box = await end.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= w + 1, `${w}x${h} ${layout} ${JSON.stringify(box)}`);
    await end.click(); await p.waitForFunction(() => location.hash.endsWith('2026-11-03') && /03\/11\/2026/.test(document.querySelector('#r-s').textContent) && !!document.querySelector('#rc .seg'));
    assert.match(await p.textContent('#r-s'), new RegExp(fmtDmy('2026-11-03')));
    if (layout === 'pages') assert.match(await p.textContent('#pinfo'), /^עמוד(ים)? 1[ –]/, 'the new day opens at its start');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  }
});

test('day navigation keeps per-day progress and is not offered in the siddur', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await open(p, 'tanya', '2026-11-02');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(700);
  const pg = await p.textContent('#pinfo');
  await p.keyboard.press('Shift+ArrowLeft'); await p.waitForFunction(() => /03\/11\/2026/.test(document.querySelector('#r-s').textContent)); await p.waitForTimeout(300);
  assert.match(await p.textContent('#pinfo'), /^עמוד(ים)? 1[ –]/);
  await go(p, 'prev', '2026-11-02'); await p.waitForTimeout(400);
  assert.equal(await p.textContent('#pinfo'), pg, 'back to the page left on that day');
  await p.goto(srv.url + '#/s/shacharit/1'); await p.waitForSelector('#rc .seg');
  assert.equal(await p.locator('.daynav').count(), 0);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
