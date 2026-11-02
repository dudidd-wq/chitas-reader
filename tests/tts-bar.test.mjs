// Round-2 MUST-FIX 1: the read-aloud player is one compact row, the text is re-paginated for it, and the line being
// read is always inside the visible text area (not under the bar). Also: one speed scale for menu + slider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { TTS_RATES, snapRate } from '../site/js/store.js';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const slowSynth = () => {
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  let cur = null;
  const synth = {
    getVoices: () => voices, cancel() { if (cur) { clearTimeout(cur.t); cur = null; } }, pause() {}, resume() {}, speaking: false, pending: false,
    addEventListener() {}, removeEventListener() {},
    speak(u) {
      window.__spoken.push(u.text);
      const t = setTimeout(() => { u.onstart?.({}); if (cur) cur.t = setTimeout(() => { cur = null; u.onend?.({}); }, window.__chunkMs || 150); }, 2);
      cur = { t };
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};
// Is the highlighted (being read) text inside the area between the bars? Uses the line boxes of the speaking segment
// that are on the current page.
const visibleCheck = p => p.evaluate(() => {
  const el = document.querySelector('#rc .speaking'); if (!el) return { ok: false, why: 'no highlight' };
  const top = document.querySelector('#rt').getBoundingClientRect().bottom, bot = document.querySelector('#rb').getBoundingClientRect().top;
  const rects = [...el.getClientRects()].filter(r => r.width > 2 && r.right > 0 && r.left < innerWidth);
  if (!rects.length) return { ok: false, why: 'highlight off screen' };
  const bad = rects.filter(r => r.top < top - 1 || r.bottom > bot + 1);
  return { ok: !bad.length, why: `${bad.length}/${rects.length} line boxes under a bar (top ${top}, bar ${bot}, e.g. ${bad[0]?.top}-${bad[0]?.bottom})` };
});

for (const [w, h] of [[320, 568], [360, 740], [390, 844], [844, 390], [568, 320], [1280, 800]]) {
  test(`${w}x${h}: player bar is a single row, text re-paginated for it, the line being read is visible`, { skip }, async () => {
    const srv = await serve(), b = await launch();
    try {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: h }, init: slowSynth });
      await p.goto(srv.url + `#/r/rambam3/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(300);
      const padBefore = await p.evaluate(() => parseFloat(document.querySelector('#rc').style.paddingBottom));
      await p.keyboard.press('p');
      await p.waitForSelector('#ttsctl:not([hidden])'); await p.waitForTimeout(500);
      const m = await p.evaluate(() => {
        const rb = document.querySelector('#rb'), btns = [...rb.querySelectorAll('#ttsctl .btn, #ttsctl select')];
        const tops = new Set(btns.map(x => Math.round(x.getBoundingClientRect().top / 8)));
        return { h: rb.offsetHeight, rows: tops.size, pad: parseFloat(document.querySelector('#rc').style.paddingBottom),
          small: btns.filter(x => { const r = x.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map(x => x.id + ':' + Math.round(x.getBoundingClientRect().width) + 'x' + x.getBoundingClientRect().height),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(m.h <= 64, `bar height ${m.h}px`);
      assert.equal(m.rows, 1, 'all player controls on one row');
      assert.deepEqual(m.small, [], 'player controls ≥44px');
      assert.ok(m.pad >= m.h, `text padding (${m.pad}) accounts for the bar (${m.h}); before ${padBefore}`);
      assert.equal(m.overflow, false);
      // follow the reading through several pages
      // no page-turn animation, so a check never lands mid-slide
      await p.emulateMedia({ reducedMotion: 'reduce' });
      await p.evaluate(() => { window.__chunkMs = 25; });
      for (let i = 0; i < 12; i++) {
        await p.waitForTimeout(250);
        const v = await visibleCheck(p); if (v.why === 'no highlight') break;
        assert.ok(v.ok, `check ${i}: ${v.why}`);
      }
      assert.deepEqual(p.errors, []);
    } finally { await b.close(); srv.close(); }
  });
}

test('speed: the footer menu and the settings slider use one scale; old values snap to it', { skip }, async () => {
  assert.deepEqual(TTS_RATES, [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6]);
  assert.equal(snapRate(1.33), 1.3); assert.equal(snapRate(0.64), 0.6); assert.equal(snapRate(2), 1.6);
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsRate: 1.33 }, init: slowSynth });
    await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg');
    const opts = await p.$$eval('#t-rate option', o => o.map(x => Number(x.value)));
    assert.deepEqual(opts, TTS_RATES);
    assert.equal(await p.$eval('#t-rate', s => s.value), '1.3');
    await p.click('#b-tts'); await p.waitForSelector('#sheet input[name="ttsRate"]');
    const r = await p.$eval('#sheet input[name="ttsRate"]', i => [i.min, i.max, i.step, i.value]);
    assert.deepEqual(r, ['0.6', '1.6', '0.1', '1.3']);
    await p.$eval('#sheet input[name="ttsRate"]', i => { i.value = '1.6'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(100);
    assert.equal(await p.$eval('#t-rate', s => s.value), '1.6');
  } finally { await b.close(); srv.close(); }
});
