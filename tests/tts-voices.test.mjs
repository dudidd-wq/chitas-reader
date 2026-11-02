// Round 4: network voices (localService === false) send the text to the vendor. They must be labelled,
// disclosed, never recommended, and never picked by default when a local Hebrew voice exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

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

test('network voices: local voice is the default, network voices are labelled and disclosed', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: synth });
    await p.goto(srv.url + '#/r/tanya/2026-02-06'); await p.waitForSelector('#rc .seg');
    const order = await p.evaluate(async () => (await import('./js/tts.js')).hebrewVoices().map(v => v.name));
    assert.deepEqual(order, ['Device Hebrew', 'Cloud Hebrew'], 'local voice first (= default)');
    await p.click('#b-tts', { button: 'right' });
    await p.waitForSelector('#sheet:not([hidden]) #voice-sel');
    const opts = await p.$$eval('#voice-sel option', o => o.map(x => x.textContent));
    assert.ok(opts.some(t => /Cloud Hebrew.*מקוון.*נשלח/.test(t)), opts.join('|'));
    assert.ok(opts.some(t => t === 'Device Hebrew'), opts.join('|'));
    assert.equal(await p.$eval('#voice-net', e => e.hidden), false, 'disclosure shown');
    assert.match(await p.$eval('#voice-net', e => e.textContent), /שולח את הטקסט/);
    await p.goto(srv.url + '#/about'); await p.waitForSelector('main h2');
    const about = await p.$eval('main', e => e.textContent);
    assert.match(about, /קולות מקוונים|קולות <b>מקוונים|מקוונים/);
    assert.match(about, /שולח את הטקסט המוקרא לשרת/);
    assert.doesNotMatch(about, /אין שליחת נתונים/, 'no absolute "nothing is sent" claim');
    // round 4: About documents the reading rules that are implemented (one tap, what is skipped, divine names)
    assert.match(about, /לחיצה אחת על כפתור ההקראה מתחילה/); assert.match(about, /פ\/ס/); assert.match(about, /\(מכילתא\)/);
    assert.match(about, /אֲדוֹשֵׁם/); assert.match(about, /לַהַשֵּׁם/);
    assert.deepEqual(p.errors, []);
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
    await p.click('#b-tts', { button: 'right' });
    await p.waitForSelector('#sheet:not([hidden]) #voice-sel');
    assert.equal(await p.$eval('#voice-net', e => e.hidden), true);
  } finally { await b.close(); srv.close(); }
});
