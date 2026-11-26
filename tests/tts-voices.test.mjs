// Network voices (localService === false) send the text to the vendor. Since 1.0.224 (A1) they are never used for reading:
// listed only as disabled "unavailable" entries, never chosen by default or from a saved preference; with no local
// Hebrew voice the reader stops with a clear message and nothing is spoken. (Node-level policy: tts-local-only.test.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME, openChrome } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const synth = () => {
  const voices = [
    { name: 'Cloud Hebrew', lang: 'he-IL', default: false, localService: false, voiceURI: 'cloud' },
    { name: 'English', lang: 'en-US', default: true, localService: true, voiceURI: 'en' },
    { name: 'Device Hebrew', lang: 'he-IL', default: false, localService: true, voiceURI: 'dev' }];
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 3); }, 1); },
  } });
};

test('network voices: unusable – local voice is the only one used, network voices are listed as unavailable', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: synth, prefs: { ttsVoice: 'Cloud Hebrew' } });   // a saved network voice
    await p.goto(srv.url + '#/r/tanya/2026-02-06'); await p.waitForSelector('#rc .seg');
    const order = await p.evaluate(async () => (await import('./js/tts.js')).hebrewVoices().map(v => v.name));
    assert.deepEqual(order, ['Device Hebrew'], 'usable voices are local only');
    await openChrome(p);
    await p.click('#b-tts', { button: 'right' });
    await p.waitForSelector('#sheet:not([hidden]) #voice-sel');
    const opts = await p.$$eval('#voice-sel option', o => o.map(x => ({ t: x.textContent, d: x.disabled, v: x.value })));
    const cloud = opts.find(o => /Cloud Hebrew/.test(o.t));
    assert.ok(cloud && cloud.d && cloud.v === '' && /מקוון.*לא זמין/.test(cloud.t), JSON.stringify(opts));
    assert.ok(opts.some(o => o.t === 'Device Hebrew' && !o.d));
    assert.equal(await p.$eval('#voice-sel', e => e.value), '', 'the saved network voice is not selected');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsVoice || ''), '', 'saved network choice dropped');
    assert.equal(await p.$eval('#voice-net', e => e.hidden), false, 'disclosure shown');
    assert.match(await p.$eval('#voice-net', e => e.textContent), /לא זמין/);
    // reading still works with the local voice (voice objects here are plain fakes, so the chosen voice is covered by tts-local-only.test.mjs)
    await p.keyboard.press('Escape');
    await p.evaluate(() => { window.__spoken.length = 0; });
    await p.click('#b-tts'); await p.waitForFunction(() => window.__spoken.length > 0);
    await p.goto(srv.url + '#/about'); await p.waitForSelector('main h2');
    const about = await p.$eval('main', e => e.textContent);
    assert.match(about, /מקוונים/);
    assert.match(about, /אינו משתמש בהם כלל/);
    assert.doesNotMatch(about, /אין שליחת נתונים/, 'no absolute "nothing is sent" claim');
    assert.match(about, /לחיצה אחת על כפתור ההקראה מתחילה/); assert.match(about, /פ\/ס/); assert.match(about, /\(מכילתא\)/);
    assert.match(about, /אֲדוֹשֵׁם/); assert.match(about, /לַהַשֵּׁם/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('only a network Hebrew voice → the reader stops with a clear message and speaks nothing', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: () => {
      window.__spoken = []; window.__ttsMinMsPerChar = 0;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ name: 'Cloud Hebrew', lang: 'he-IL', localService: false, voiceURI: 'cloud' }], cancel() {}, pause() {}, resume() {},
        speak(u) { window.__spoken.push(u.text); }, addEventListener() {}, removeEventListener() {} } });
    } });
    await p.goto(srv.url + '#/r/tanya/2026-02-06'); await p.waitForSelector('#rc .seg');
    await openChrome(p);
    await p.click('#b-tts');
    await p.waitForSelector('#sheet:not([hidden]) #sh-note');
    assert.match(await p.textContent('#sh-note'), /לא נמצא במכשיר קול עברי מקומי/);
    assert.deepEqual(await p.evaluate(() => window.__spoken), [], 'nothing was sent to the speech engine');
  } finally { await b.close(); srv.close(); }
});

test('no network voice → no disclosure clutter', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: () => {
      window.__ttsMinMsPerChar = 0;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ name: 'Device Hebrew', lang: 'he-IL', localService: true, voiceURI: 'dev' }], cancel() {}, pause() {}, resume() {},
        speak() {}, addEventListener() {}, removeEventListener() {} } });
    } });
    await p.goto(srv.url + '#/r/tanya/2026-02-06'); await p.waitForSelector('#rc .seg');
    await openChrome(p);
    await p.click('#b-tts', { button: 'right' });
    await p.waitForSelector('#sheet:not([hidden]) #voice-sel');
    assert.equal(await p.$eval('#voice-net', e => e.hidden), true);
  } finally { await b.close(); srv.close(); }
});
