// 1.0.59 local voice (Piper noa): nothing is downloaded without the reader's click, the click installs it with progress,
// reading then uses it (real model, real worker – synthesis output checked, not its sound), and every failure falls back
// to the browser's voice (Web Speech).
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const fakeSynth = () => {
  window.__spoken = []; window.__ttsMinMsPerChar = 0; window.__piperLog = [];
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  let cur = null;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() { clearTimeout(cur); }, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); cur = setTimeout(() => { u.onstart?.({}); cur = setTimeout(() => u.onend?.({}), 200); }, 2); } } });
};
const voiceReqs = log => log.filter(p => p.includes('/voice/'));

test('no voice file is requested without a click – also with the engine set to the local voice', { skip }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsEngine: 'piper' }, init: fakeSynth });
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p');                         // play: the voice is not installed → browser voice
    await p.waitForFunction(() => window.__spoken.length > 0);
    await p.click('#t-set'); await p.waitForSelector('#qv-st'); await p.waitForFunction(() => !/בודק/.test(document.querySelector('#qv-st').textContent));
    assert.match(await p.textContent('#qv-st'), /אינו מותקן/);
    assert.ok(await p.isVisible('#qv-dl'), 'download button shown');
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st'); await p.waitForTimeout(500);
    assert.deepEqual(voiceReqs(log), [], 'no request under /voice/');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('unsupported browser: no local-voice option offered, reading uses Web Speech', { skip }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsEngine: 'piper' }, init: [() => { window.__piperUnsupported = true; }] });
    await p.addInitScript(fakeSynth);
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p'); await p.waitForFunction(() => window.__spoken.length > 0);
    await p.click('#t-set'); await p.waitForSelector('#qv');
    assert.equal(await p.locator('#qv-dl').count(), 0);
    assert.deepEqual(voiceReqs(log), []);
  } finally { await b.close(); srv.close(); }
});

test('a broken installed voice falls back to Web Speech', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsEngine: 'piper', ttsModel: 'int8' }, init: fakeSynth });
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#rc .seg');
    // "installed" files that are not a model: loading must fail and the browser's voice take over
    await p.evaluate(async () => {
      const { VOICE_FILES } = await import('./js/voice-files.js'), c = await caches.open('voice-v1');
      for (const f of Object.values(VOICE_FILES)) await c.put(new URL(f.url, document.baseURI).href, new Response('junk'));
    });
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 20000 });
    assert.equal(await p.evaluate(() => window.__piperLog.length), 0);
  } finally { await b.close(); srv.close(); }
});

test('failed download: message shown, engine stays the browser voice', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsModel: 'int8' }, init: fakeSynth });
    await p.route('**/voice/he_IL-noa-medium-int8.onnx*', r => r.fulfill({ status: 404, body: '' }));
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-dl:not([hidden])');
    await p.click('#qv-dl');
    await p.waitForFunction(() => /נכשלה/.test(document.querySelector('#qv-st').textContent), null, { timeout: 30000 });
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsEngine || 'web'), 'web');
  } finally { await b.close(); srv.close(); }
});

test('click installs the voice (progress, size) and the lesson is read with it – real model in a worker', { skip, timeout: 180000 }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { ttsModel: 'int8' }, init: fakeSynth });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-dl:not([hidden])');
    assert.match(await p.textContent('#qv-dl'), /\d+ MB/);
    assert.deepEqual(voiceReqs(log), []);
    await p.click('#qv-dl');
    await p.waitForFunction(() => /מוריד/.test(document.querySelector('#qv-st').textContent));
    await p.waitForFunction(() => /מותקן במכשיר/.test(document.querySelector('#qv-st').textContent), null, { timeout: 120000 });
    assert.ok(voiceReqs(log).some(x => x.endsWith('.onnx')), 'model fetched after the click');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsEngine), 'piper');
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__piperLog.length >= 2, null, { timeout: 60000 });
    const r = await p.evaluate(() => ({ log: window.__piperLog.slice(0, 2), spoken: window.__spoken.length, hl: !!document.querySelector('#rc .seg.speaking') }));
    assert.equal(r.spoken, 0, 'Web Speech not used');
    assert.ok(r.hl, 'segment highlighted');
    for (const x of r.log) { assert.ok(x.sec > 0.3, `audio ${x.sec}s for ${x.text}`); assert.match(x.ipa, /ˈ/); }
    // 1.0.60: default = male timbre (same model, signal processing in the worker): mean F0 in the male range
    for (const x of r.log) { assert.equal(x.gender, 'male'); assert.ok(x.f0 >= 85 && x.f0 <= 155, `male F0 ${x.f0} for ${x.text}`); }
    // pause / resume / skip keep working
    await p.click('#t-play'); await p.waitForTimeout(200);
    assert.equal(await p.getAttribute('#t-play', 'aria-label'), 'הפעל');
    await p.click('#t-play'); await p.click('#t-fwd');
    await p.waitForFunction(n => window.__piperLog.length > n, r.log.length, { timeout: 30000 });
    await p.click('#t-stop');
    // after a reload the voice is still installed (Cache Storage), nothing re-downloaded
    const before = voiceReqs(log).length;
    await p.goto(srv.url + '#/settings'); await p.reload(); await p.waitForFunction(() => /מותקן במכשיר/.test(document.querySelector('#qv-st')?.textContent || ''));
    assert.equal(voiceReqs(log).length, before);
    // the female voice is a setting; choosing it downloads nothing and the audio is the model's own (F0 > 155 Hz)
    assert.equal(await p.isChecked('input[name=ttsGender][value=male]'), true);
    await p.click('label:has(input[name=ttsGender][value=female])');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsGender), 'female');
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg');
    await p.evaluate(() => { window.__piperLog.length = 0; });
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__piperLog.length >= 1, null, { timeout: 60000 });
    const fl = await p.evaluate(() => window.__piperLog[0]);
    assert.equal(fl.gender, 'female'); assert.ok(fl.f0 > 155, 'female F0 ' + fl.f0);
    await p.click('#t-stop');
    assert.equal(voiceReqs(log).length, before, 'switching the voice downloads nothing');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
