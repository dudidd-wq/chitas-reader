// Browser regression tests (headless Chrome via playwright-core). Skipped if no Chrome is installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, CHROME, pageWith, progressOf } from './helpers.mjs';

const D = '2026-11-02';
const skip = !CHROME && 'no Chrome/Chromium installed';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

test('home → open lesson: the home page is not visible behind the reader (round-1 MUST-FIX)', { skip }, async () => {
  for (const viewport of [{ width: 390, height: 800 }, { width: 1280, height: 800 }, { width: 844, height: 390 }]) {
    const p = await pageWith(browser, srv.url, { viewport });
    await p.goto(srv.url + '#/d/' + D);
    await p.waitForSelector('[data-go="chumash"]');
    await p.click('[data-go="chumash"]');
    await p.waitForSelector('#rc .seg');
    const r = await p.evaluate(() => {
      const app = document.querySelector('#app'), rd = document.querySelector('#reader');
      const bg = getComputedStyle(rd).backgroundColor;
      const pts = [[0.5, 0.5], [0.1, 0.3], [0.9, 0.7], [0.5, 0.95], [0.5, 0.05]].map(([x, y]) => document.elementFromPoint(innerWidth * x, innerHeight * y));
      return { appVisible: !!app.getClientRects().length, bg, allInReader: pts.every(e => e && rd.contains(e)), heroVisible: !!document.querySelector('.hero')?.getClientRects().length };
    });
    assert.equal(r.appVisible, false, `#app must be hidden (${viewport.width}x${viewport.height})`);
    assert.equal(r.heroVisible, false);
    assert.ok(!/rgba\(.*,\s*0\)|transparent/.test(r.bg), 'reader background must be opaque, got ' + r.bg);
    assert.ok(r.allInReader, 'every probed point must hit the reader');
    // back to home restores it
    await p.click('.r-top a[href^="#/d/"]');
    await p.waitForSelector('.hero');
    assert.equal(await p.evaluate(() => !!document.querySelector('#app').getClientRects().length), true);
    assert.deepEqual(p.errors, []);
    await p.context().close();
  }
});

// Fake speech engines --------------------------------------------------------------------------------------------
const fakeSynth = mode => {
  const voices = mode === 'novoice' ? [] : [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  window.__spoken = [];
  if (mode === 'ok') window.__ttsMinMsPerChar = 0;
  const synth = {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false,
    addEventListener() {}, removeEventListener() {},
    speak(u) {
      window.__spoken.push(u.text);
      setTimeout(() => {
        if (mode === 'error') return u.onerror?.({ error: 'synthesis-failed' });
        u.onstart?.({});
        if (mode === 'silent') return u.onend?.({});        // "ends" instantly – nothing audible
        setTimeout(() => u.onend?.({}), 2);
      }, 2);
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};
async function startTts(mode, prefs = {}) {
  const p = await pageWith(browser, srv.url, { init: [fakeSynth, mode], prefs: { ttsContinuous: true, ...prefs } });
  await p.goto(srv.url + `#/r/chumash/${D}`);
  await p.waitForSelector('#rc .seg');
  await p.keyboard.press('p');
  return p;
}

test('TTS with no Hebrew voice does not start and never marks the lesson read (round-1 MUST-FIX)', { skip }, async () => {
  const p = await startTts('novoice');
  await p.waitForTimeout(2500);
  assert.equal(await p.evaluate(() => window.__spoken.length), 0, 'nothing may be sent to the engine');
  assert.match(await p.textContent('#toast'), /לא נמצא במכשיר קול עברי/);
  assert.ok(await p.isVisible('#sheet'), 'the voice-installation help opens');
  assert.equal(new URL(p.url()).hash, `#/r/chumash/${D}`, 'must not advance to the next lesson');
  const pr = await progressOf(p);
  assert.ok(!Object.values(pr).some(x => x.done), 'no lesson may be marked done: ' + JSON.stringify(pr));
  await p.context().close();
});

test('TTS engine error stops playback, no advance, nothing marked read', { skip }, async () => {
  const p = await startTts('error');
  await p.waitForTimeout(2000);
  assert.equal(await p.evaluate(() => window.__spoken.length), 1, 'stops after the first failed utterance');
  assert.equal(new URL(p.url()).hash, `#/r/chumash/${D}`);
  assert.match(await p.textContent('#toast'), /נעצרה/);
  assert.ok(!Object.values(await progressOf(p)).some(x => x.done));
  await p.context().close();
});

test('TTS engine that "ends" instantly without speaking is detected as silent', { skip }, async () => {
  const p = await startTts('silent');
  await p.waitForTimeout(2000);
  const n = await p.evaluate(() => window.__spoken.length); assert.ok(n >= 1 && n <= 2, 'spoken ' + n);
  assert.equal(new URL(p.url()).hash, `#/r/chumash/${D}`);
  assert.ok(!Object.values(await progressOf(p)).some(x => x.done));
  await p.context().close();
});

test('TTS that really speaks every chunk marks the lesson read and continues to the next one', { skip }, async () => {
  const p = await startTts('ok');
  await p.waitForFunction(() => location.hash.startsWith('#/r/tehillim/'), null, { timeout: 60000 });
  const pr = await progressOf(p);
  assert.equal(pr[`${D}|chumash`]?.done, true);
  assert.ok(await p.evaluate(() => window.__spoken.length) > 20);
  await p.context().close();
});
