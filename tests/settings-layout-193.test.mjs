// 1.0.93: settings page in titled cards with a jump index; every setting keeps its name (storage key) and default;
// no horizontal overflow on narrow phones; the reader pager and the home links are labelled, even and ≥ 44 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, PREFS } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const mobile = async (width, height = 760) => {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await ctx.addInitScript(p => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: p })), PREFS);
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e))); return p;
};
const CARDS = ['set-daily', 'set-display', 'set-tts', 'set-siddur', 'set-tehillim', 'set-backup', 'set-about'];
const GROUP = {
  'set-daily': ['il', 'rambamTrack', 'lessonMitzvot', 'lessonTolt', 'lessonRavYomi', 'lessonDaf', 'lessonAmud', 'lessonYer', 'lessonMishna'],
  'set-display': ['theme', 'font', 'readingBold', 'size', 'lineHeight', 'layout', 'spread', 'taamim', 'rashi', 'hayomNiqqud', 'biurNiqqud', 'divine', 'gloss', 'studyNotes', 'wakeLock'],
  'set-tts': ['ttsEngine', 'ttsGender', 'ttsPitch', 'ttsHavara', 'ttsModel', 'ttsVoice', 'ttsRate', 'ttsStress', 'ttsDivine', 'ttsRashi', 'ttsSkipCites', 'ttsContinuous', 'ttsLockscreen'],
  'set-siddur': ['siddurKaddish', 'hideSiddurInstructions', 'siddurLang', 'tachanunMode', 'shabbatMode'],
};

test('1.0.93: settings cards in order, each setting once in its group, defaults shown, jump index scrolls, version shown', async () => {
  const p = await mobile(390); await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st');
  assert.deepEqual(await p.locator('#sf > section.set-card').evaluateAll(a => a.map(e => e.id)), CARDS);
  assert.deepEqual(await p.locator('.set-jump [data-jump]').evaluateAll(a => a.map(e => e.dataset.jump)), CARDS);
  for (const [card, names] of Object.entries(GROUP)) {
    const got = await p.locator(`#${card} [name]`).evaluateAll(a => [...new Set(a.map(e => e.name))]);
    assert.deepEqual(got.filter(n => !names.includes(n)), [], card + ' has settings of another group');
    for (const n of names) assert.ok(got.includes(n), `${card} lacks ${n}`);
  }
  // every control is rendered exactly once on the page (no duplicates after the split) and shows its default
  const counts = await p.evaluate(() => { const c = {}; document.querySelectorAll('#sf [name]').forEach(e => { if (e.type !== 'radio') c[e.name] = (c[e.name] || 0) + 1; }); return c; });
  for (const [n, k] of Object.entries(counts)) assert.equal(k, 1, n);
  for (const n of ['readingBold', 'hideSiddurInstructions', 'taamim', 'ttsStress']) assert.equal(await p.locator(`#sf input[name=${n}]`).isChecked(), DEFAULT_PREFS[n], n);
  for (const n of ['theme', 'siddurKaddish', 'ttsHavara', 'tachanunMode']) assert.equal(await p.locator(`#sf input[name=${n}]:checked`).inputValue(), String(DEFAULT_PREFS[n]), n);
  assert.equal(await p.locator('#sf input[name=ttsPitch]').inputValue(), String(DEFAULT_PREFS.ttsPitch));
  // the jump index scrolls to the card and keeps the route
  await p.click('[data-jump=set-siddur]');
  await p.waitForFunction(() => Math.abs(document.querySelector('#set-siddur h2').getBoundingClientRect().top) < 40);
  assert.equal(new URL(p.url()).hash, '#/settings');
  assert.match(await p.locator('#set-ver-n').textContent(), /^1\.\d+\.\d+$/);
  // a change in a card is stored under the same key
  await p.locator('#set-siddur input[name=siddurKaddish][value=skip]').check({ force: true });
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.siddurKaddish), 'skip');
  assert.deepEqual(p.errors, []); await p.context().close();
});

test('1.0.93: no horizontal overflow at 320/360/390 px; checkboxes keep their size; rows put the checkbox at the left end', async () => {
  for (const w of [320, 360, 390]) {
    const p = await mobile(w); await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => ({ iw: innerWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      boxes: [...document.querySelectorAll('#sf .check input')].map(e => [e.name, Math.round(e.getBoundingClientRect().width)]),
      side: [...document.querySelectorAll('#sf .set-card .check')].filter(l => l.offsetParent).map(l => { const i = l.querySelector('input').getBoundingClientRect(), r = l.getBoundingClientRect(); return [l.querySelector('input').name, Math.round(i.left - r.left)]; }) }));
    assert.equal(m.iw, w, `${w}: layout viewport widened to ${m.iw}`); assert.ok(m.sw <= m.cw, `${w}: scrollWidth ${m.sw} > ${m.cw}`);
    for (const [n, bw] of m.boxes) assert.equal(bw, 22, `${w}: checkbox ${n} is ${bw}px`);
    for (const [n, dx] of m.side) assert.ok(dx <= 6, `${w}: checkbox ${n} not at the left end (${dx})`);
    await p.context().close();
  }
});

test('1.0.93: reader pager – labelled prev/next of equal width, page number centred, one line at 360 px, above the safe area', async () => {
  for (const w of [360, 390]) {
    const p = await mobile(w); await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const rb = r('rb'), a = r('b-prev'), b = r('b-next'), i = r('pinfo');
      return { rb: [rb.top, rb.bottom, rb.height], a: [a.left, a.right, a.width, a.height, a.top], b: [b.left, b.right, b.width, b.height, b.top], i: [i.left, i.right, i.top], ih: innerHeight, w: innerWidth,
        lbl: [...document.querySelectorAll('#rb .pg-lbl')].map(e => [e.textContent, e.getClientRects().length, getComputedStyle(e).display !== 'none']),
        names: ['b-prev', 'b-next'].map(id => document.getElementById(id).getAttribute('aria-label')) }; });
    assert.deepEqual(m.lbl, [['עמוד קודם', 1, true], ['עמוד הבא', 1, true]]);
    assert.deepEqual(m.names, ['עמוד קודם', 'עמוד הבא']);
    assert.ok(m.a[3] >= 44 && m.b[3] >= 44 && m.a[2] >= 44 && m.b[2] >= 44);
    assert.ok(Math.abs(m.a[2] - m.b[2]) <= 2, `prev ${m.a[2]} vs next ${m.b[2]}`);
    assert.ok(m.a[0] > m.i[1] && m.i[0] > m.b[1], 'RTL order prev | info | next');
    assert.ok(Math.abs((m.i[0] + m.i[1]) / 2 - m.w / 2) < 4, 'page number centred');
    assert.ok(Math.abs(m.a[4] - m.b[4]) < 1 && m.rb[2] < 70, `one row (bar ${m.rb[2]}px)`);
    assert.ok(Math.abs(m.rb[1] - m.ih) < 1 && m.a[0] >= 0 && m.b[1] <= m.w);
    // content of the page ends above the bar
    const pad = await p.evaluate(() => { const rc = document.getElementById('rc'); return parseFloat(getComputedStyle(rc).paddingBottom); });
    assert.ok(pad >= m.rb[2] - 1, `content bottom padding ${pad} < bar ${m.rb[2]}`);
    await p.context().close();
  }
});

test('1.0.93: home links – equal tiles, three per row, ≥ 44 px, nothing cut at 360 px', async () => {
  const p = await mobile(360); await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.home-foot .links a');
  const t = await p.locator('.home-foot .links a').evaluateAll(a => a.map(e => { const r = e.getBoundingClientRect(), s = e.querySelector('span'); return [e.textContent, Math.round(r.width), Math.round(r.height), Math.round(r.top), s.scrollWidth <= s.clientWidth + 1, !!e.querySelector('svg')]; }));
  assert.equal(t.length, 9);
  assert.equal(new Set(t.map(x => x[1])).size, 1, 'equal widths'); assert.equal(new Set(t.map(x => x[2])).size, 1, 'equal heights');
  assert.equal(new Set(t.map(x => x[3])).size, 3, 'three rows');
  for (const [txt, w, h, , fits, icon] of t) { assert.ok(w >= 44 && h >= 44, txt); assert.ok(fits, txt + ' cut'); assert.ok(icon, txt + ' icon'); }
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await p.context().close();
});
