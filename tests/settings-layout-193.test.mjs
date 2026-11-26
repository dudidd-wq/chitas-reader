// 1.0.93: settings page in titled cards with a jump index; every setting keeps its name (storage key) and default;
// no horizontal overflow on narrow phones; the reader pager and the home links are labelled, even and ≥ 44 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, PREFS, openChrome } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const mobile = async (width, height = 760) => {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await ctx.addInitScript(p => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: p })), PREFS);
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e))); return p;
};
const CARDS = ['set-daily', 'set-display', 'set-fonts', 'set-text', 'set-tts', 'set-siddur', 'set-tehillim', 'set-backup', 'set-about'];
const GROUP = {
  'set-daily': ['il', 'rambamTrack', 'lessonMitzvot', 'lessonTolt', 'lessonRavYomi', 'lessonDaf', 'lessonAmud', 'lessonYer', 'lessonMishna', 'lessonNach', 'lessonShnayim', 'shnayimSplit'],
  'set-display': ['design', 'designFont', 'theme', 'size', 'lineHeight', 'layout', 'spread', 'wakeLock'],
  'set-fonts': ['font', 'readingBold'],
  'set-text': ['taamim', 'rashi', 'rashiFont', 'hayomNiqqud', 'mitzvotNiqqud', 'biurNiqqud', 'divine', 'gloss', 'studyNotes', 'shortBiur'],
  'set-tts': ['ttsEngine', 'ttsGender', 'ttsPitch', 'ttsHavara', 'ttsModel', 'ttsVoice', 'ttsRate', 'ttsStress', 'ttsDivineScripture', 'ttsDivineOral', 'ttsRashi', 'ttsBiur', 'ttsVocalizedGemara', 'ttsGemaraBiurOnly', 'ttsSkipCites', 'ttsContinuous', 'ttsLockscreen'],
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

test('1.0.121: overlay nav – home, prev, play, next in one row of about 44 px', async () => {
  for (const w of [360, 390]) {
    const p = await mobile(w); await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(300);
    const fab = await p.evaluate(() => { const e = document.getElementById('b-fab'), r = e.getBoundingClientRect(); return { h: r.height, w: r.width, on: document.getElementById('reader').classList.contains('chrome-on') }; });
    assert.equal(fab.on, false); assert.ok(fab.h >= 44 && fab.w >= 44, JSON.stringify(fab));
    await p.evaluate(() => window.R.setChrome(true));
    const m = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const rb = r('rb'), a = r('b-lprev'), b = r('b-lnext'), h = r('b-home'), pl = r('b-play2');
      return { rb: [rb.top, rb.bottom, rb.height], a: [a.left, a.right, a.width, a.height, a.top], b: [b.left, b.right, b.width, b.height, b.top], h: [h.width, h.height], pl: [pl.width, pl.height], ih: innerHeight, w: innerWidth,
        lbl: [...document.querySelectorAll('#rb .rb-lbl')].map(e => e.textContent.trim()),
        names: ['b-home', 'b-lprev', 'b-lnext'].map(id => document.getElementById(id).getAttribute('aria-label')),
        bnav: !!document.getElementById('bnav') }; });
    assert.ok(m.lbl.includes('בית') && (m.lbl.includes('הקודם') || m.lbl.includes('יום קודם')) && (m.lbl.includes('הבא') || m.lbl.includes('יום הבא')), JSON.stringify(m.lbl));
    assert.ok(m.names[0].includes('חזרה') || m.names[0].includes('בית'));
    assert.ok(m.a[3] >= 44 && m.b[3] >= 44 && m.a[2] >= 44 && m.b[2] >= 44);
    assert.ok(m.h[0] >= 44 && m.h[1] >= 44 && m.pl[0] >= 44 && m.pl[1] >= 44);
    assert.ok(Math.abs(m.a[2] - m.b[2]) <= 8, `prev ${m.a[2]} vs next ${m.b[2]}`);
    assert.ok(m.a[0] > m.b[1], 'RTL order: prev (right) then next (left)');
    assert.ok(Math.abs(m.a[4] - m.b[4]) < 1, `one row (bar ${m.rb[2]}px)`);
    assert.ok(m.a[0] >= 0 && m.b[1] <= m.w);
    assert.equal(m.bnav, false);
    const pad = await p.evaluate(() => { const rc = document.getElementById('rc'); return parseFloat(getComputedStyle(rc).paddingBottom); });
    assert.ok(pad <= 36, `content bottom padding should stay small (${pad})`);
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

test('1.0.130: jump chips stay visible buttons in every design; helper text is compact; no leftover display settings', async () => {
  for (const design of ['classic', 'modern', 'nocturne']) {
    const p = await mobile(390);
    await p.addInitScript(d => { const k = 'chitas-reader.v1'; const s = JSON.parse(localStorage.getItem(k) || '{"prefs":{}}'); s.prefs = { ...s.prefs, design: d }; localStorage.setItem(k, JSON.stringify(s)); }, design);
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st');
    const m = await p.evaluate(() => {
      const chips = [...document.querySelectorAll('.set-jump .chip')].map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { t: e.textContent, h: Math.round(r.height), w: Math.round(r.width), bg: cs.backgroundColor, bd: cs.borderTopWidth, fs: cs.fontSize }; });
      const smalls = [...document.querySelectorAll('#sf small, #sf .set-more > summary')].map(e => parseFloat(getComputedStyle(e).fontSize));
      const headings = [...document.querySelectorAll('#sf > section.set-card > h2, #tts-voice-h, #qv-havara-label, #tts-opts-h')].map(e => e.textContent.trim());
      return { chips, maxSmall: Math.max(...smalls), minSmall: Math.min(...smalls), headings,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        fontInDisplay: !!document.querySelector('#set-display [name=font]'),
        fontInFonts: !!document.querySelector('#set-fonts [name=font]'),
        designInFonts: !!document.querySelector('#set-fonts [name=design]') };
    });
    assert.equal(m.chips.length, 9, design + ' chip count');
    for (const c of m.chips) {
      assert.ok(c.h >= 44, `${design}: chip ${c.t} height ${c.h}`);
      assert.ok(c.w >= 40, `${design}: chip ${c.t} width ${c.w}`);
    }
    // jump chips must look like buttons, not a run-on sentence (modern used to strip their chrome)
    const withBox = m.chips.filter(c => c.bd !== '0px' || (c.bg && c.bg !== 'rgba(0, 0, 0, 0)' && c.bg !== 'transparent'));
    assert.equal(withBox.length, m.chips.length, `${design}: chips without visible box ${JSON.stringify(m.chips)}`);
    assert.ok(m.maxSmall <= 13.5, `${design}: helper ${m.maxSmall}px too large`);
    assert.equal(m.fontInDisplay, false);
    assert.equal(m.fontInFonts, true);
    assert.equal(m.designInFonts, false);
    assert.equal(m.overflow, false);
    assert.ok(m.headings.includes('תצוגה ועיצוב') && m.headings.includes('גופנים') && m.headings.includes('טקסט וניקוד'));
    assert.ok(m.headings.includes('קול') && m.headings.includes('הגייה') && m.headings.includes('מהירות ואפשרויות הקראה'));
    await p.context().close();
  }
});
