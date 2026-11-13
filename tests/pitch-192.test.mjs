// 1.0.92: manual narrator pitch ("גובה קול") – semitones −6…+6 (step 0.5) relative to the chosen voice; 0 = unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TIMBRES, timbreFor, clampPitch, webPitch, f0Stats, PITCH_MIN, PITCH_MAX, PITCH_STEP } from '../site/js/voice-pitch.js';
import { nodeVoice } from '../tools/voice-synth.mjs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const root = new URL('../', import.meta.url).pathname, read = f => fs.readFileSync(root + f, 'utf8');
const skip = !CHROME && 'no Chrome';

test('1.0.92: offset 0 is exactly the old timbre of every voice; offsets add semitones, keep the formant', () => {
  assert.equal(timbreFor('male', 0), TIMBRES.male); assert.equal(timbreFor('deep', 0), TIMBRES.deep); assert.equal(timbreFor(undefined), TIMBRES.male);
  assert.equal(timbreFor('natural', 0), null); assert.equal(timbreFor('female'), null);
  assert.deepEqual(timbreFor('male', 3), { semitones: -3, formant: 0.88 });
  assert.deepEqual(timbreFor('deep', -2.5), { semitones: -10.5, formant: 0.82 });
  assert.deepEqual(timbreFor('natural', -2), { semitones: -2, formant: 1 });
  assert.deepEqual(timbreFor('female', 4), { semitones: 4, formant: 1 });
  assert.deepEqual([PITCH_MIN, PITCH_MAX, PITCH_STEP], [-6, 6, 0.5]);
  assert.equal(clampPitch(10), 6); assert.equal(clampPitch(-7), -6); assert.equal(clampPitch(1.3), 1.5); assert.equal(clampPitch('x'), 0); assert.equal(clampPitch(undefined), 0);
  assert.equal(Object.is(clampPitch(-0.1), -0), false);
  assert.equal(webPitch(0), 1); assert.ok(Math.abs(webPitch(6) - 2 ** 0.5) < 1e-9); assert.ok(Math.abs(webPitch(-6) - 2 ** -0.5) < 1e-9);
});
test('1.0.92: stored, validated, default 0; version bumped; previews still files; device voice only gets pitch when moved', () => {
  const store = read('site/js/store.js'); assert.match(store, /ttsPitch: 0/); assert.match(store, /prefs\.ttsPitch = clampPitch\(prefs\.ttsPitch\)/);
  assert.match(read('site/sw.js'), /VERSION = '1\.0\.(9[2-9]|1\d\d)'/);
  assert.match(read('site/js/tts.js'), /if \(clampPitch\(this\.opts\.pitch\)\) u\.pitch = webPitch/);
});
test('1.0.92: in Node the four voices move by the offset and keep their duration (no added latency)', { timeout: 180000 }, async () => {
  const T = 'שָׁלוֹם, זֶה הַקּוֹל שֶׁיַּקְרִיא אֶת הַשִּׁעוּר, וְהוּא צִוָּה עַל יִשְׂרָאֵל.';
  const noa = await nodeVoice(), nat = await nodeVoice({ natural: true });
  for (const [g, v] of [['male', noa], ['deep', noa], ['natural', nat], ['female', noa]]) {
    const r = {};
    for (const p of [-4, 0, 4]) { const t = performance.now(), a = (await v.synth(T, { timbre: timbreFor(g, p) })).audio; r[p] = { f0: f0Stats(a, v.sampleRate).mean, sec: a.length / v.sampleRate, ms: performance.now() - t }; }
    assert.ok(r[-4].f0 < r[0].f0 * 0.93 && r[4].f0 > r[0].f0 * 1.07, `${g} F0 ${r[-4].f0}/${r[0].f0}/${r[4].f0}`);
    for (const p of [-4, 4]) assert.ok(Math.abs(r[p].sec / r[0].sec - 1) < 0.2, `${g} ${p} duration ${r[p].sec} vs ${r[0].sec}`);
    assert.ok(r[4].ms < r[0].ms * 2 + 400, `${g} time ${r[4].ms} vs ${r[0].ms}`);
  }
});

const fake = () => {
  window.__spoken = []; window.__pitches = []; window.__ttsMinMsPerChar = 0; window.__piperLog = [];
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false,
    addEventListener() {}, removeEventListener() {}, speak(u) { window.__spoken.push(u.text); window.__pitches.push(u.pitch); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 150); }, 2); } } });
};
const slide = (p, sel, v) => p.$eval(sel, (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);

test('1.0.92 browser: slider in settings and the read-aloud sheet, readout + reset; device voice pitch only when moved', { skip, timeout: 120000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: fake });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-pitch-in');
    assert.equal(await p.$eval('#qv-pitch-in', e => [e.min, e.max, e.step, e.value].join()), '-6,6,0.5,0');
    assert.match(await p.textContent('#qv-pitch'), /עמוק יותר[\s\S]*גבוה יותר/);
    assert.equal(await p.isDisabled('#qv-pitch-reset'), true);
    // placed between the voice choice and the pronunciation
    assert.ok(await p.evaluate(() => { const a = document.querySelector('#qv-prev-row'), m = document.querySelector('#qv-pitch'), h = document.querySelector('#qv-havara-label'); return !!(a.compareDocumentPosition(m) & 4) && !!(m.compareDocumentPosition(h) & 4); }));
    await slide(p, '#qv-pitch-in', 2.5);
    assert.equal(await p.textContent('#o-pitch'), '+2.5 חצאי טון');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsPitch), 2.5);
    await p.click('#qv-pitch-reset');
    assert.equal(await p.textContent('#o-pitch'), '0 (ללא שינוי)'); assert.equal(await p.$eval('#qv-pitch-in', e => e.value), '0');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsPitch), 0);
    // device voice: pitch 0 → the utterance keeps its default; −3 → ×2^(−3/12)
    await p.goto(srv.url + '#/r/hayomyom/2026-11-09'); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p'); await p.waitForFunction(() => window.__pitches.length >= 1);
    assert.equal(await p.evaluate(() => window.__pitches[0]), 1);
    await p.click('#t-set'); await p.waitForSelector('#sheet #qv-pitch-in');
    await slide(p, '#sheet #qv-pitch-in', -3);
    await p.waitForFunction(() => window.__pitches.some(x => Math.abs(x - 2 ** (-3 / 12)) < 1e-3), null, { timeout: 10000 });
    assert.equal(await p.textContent('#sheet #o-pitch'), '−3 חצאי טון');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
test('1.0.92 browser: the local voice reads with the offset, and the preview plays shifted', { skip, timeout: 240000 }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: fake, prefs: { ttsPitch: 2 } });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st');
    assert.equal(await p.$eval('#qv-pitch-in', e => e.value), '2');
    await p.click('.qv-prev[data-v=male]'); await p.waitForTimeout(1500);
    assert.ok(log.some(x => x.includes('/voice-samples/male.mp3')), 'preview fetched');
    await p.click('#qv-dl');
    await p.waitForFunction(() => /מותקן במכשיר/.test(document.querySelector('#qv-st').textContent), null, { timeout: 150000 });
    await p.goto(srv.url + '#/r/hayomyom/2026-11-09'); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__piperLog.length >= 1, null, { timeout: 90000 });
    const x = await p.evaluate(() => window.__piperLog[0]);
    assert.equal(x.pitch, 2); assert.ok(x.sec > 0.3); assert.ok(x.f0 > 125 && x.f0 < 200, 'male +2 F0 ' + x.f0);
    assert.equal(await p.evaluate(() => window.__spoken.length), 0);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
