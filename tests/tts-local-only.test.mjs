// A1 (engine 5): the reader never speaks with a network voice (localService === false) – such voices send the text
// to the browser vendor. Node-level test of site/js/tts.js with a fake speechSynthesis (no browser needed).
import test from 'node:test';
import assert from 'node:assert/strict';

const V = (name, localService, lang = 'he-IL') => ({ name, lang, localService, default: false, voiceURI: name });
let voices = [], spoken = [];
globalThis.window = globalThis;
globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
globalThis.speechSynthesis = {
  getVoices: () => voices, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
  speak(u) { spoken.push({ text: u.text, voice: u.voice?.name ?? null }); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 2); }, 1); },
};
globalThis.__ttsMinMsPerChar = 0; globalThis.__ttsPauseScale = 0;
const T = await import('../site/js/tts.js');
const set = vs => { voices = vs; spoken = []; };
const segs = [{ el: null, parts: ['שָׁלוֹם עֲלֵיכֶם'] }];
const run = (opts) => new Promise(res => {
  const ev = { errors: [], ended: 0 };
  const sp = new T.Speaker({ onSegment() {}, onState() {}, onEnd: () => { ev.ended++; res(ev); }, onError: c => { ev.errors.push(c); res(ev); } });
  sp.load(segs, { rate: 1, stress: true, divineName: 'hashem', ...opts }); sp.startAt(0);
});

test('hebrewVoices() lists on-device Hebrew voices only; allHebrewVoices() also lists network voices (display only)', () => {
  set([V('Cloud', false), V('English', true, 'en-US'), V('Device', true), V('NoFlag', undefined), V('Cloud2', false, 'iw-IL')]);
  assert.deepEqual(T.hebrewVoices().map(v => v.name), ['Device', 'NoFlag']);
  assert.deepEqual(T.allHebrewVoices().map(v => v.name), ['Device', 'NoFlag', 'Cloud', 'Cloud2'], 'local first');
  assert.equal(T.isNetworkVoice(V('x', false)), true); assert.equal(T.isNetworkVoice(V('x', true)), false); assert.equal(T.isNetworkVoice(V('x')), false);
});

test('pickVoice: a saved network voice is ignored; default is the first local voice; none → null', () => {
  set([V('Cloud', false), V('Device', true)]);
  assert.equal(T.pickVoice('Cloud').name, 'Device');
  assert.equal(T.pickVoice('').name, 'Device');
  assert.equal(T.pickVoice('Device').name, 'Device');
  set([V('Cloud', false)]);
  assert.equal(T.pickVoice('Cloud'), null); assert.equal(T.pickVoice(''), null);
});

test('only network Hebrew voices installed → the Speaker stops with no-voice and speaks nothing', async () => {
  set([V('Cloud', false)]);
  const ev = await run({ voice: 'Cloud' });
  assert.deepEqual(ev.errors, ['no-voice']); assert.deepEqual(spoken, []);
});

test('a saved network voice with a local one available → speaks with the local voice', async () => {
  set([V('Cloud', false), V('Device', true)]);
  const ev = await run({ voice: 'Cloud' });
  assert.equal(ev.errors.length, 0); assert.ok(spoken.length > 0);
  assert.ok(spoken.every(s => s.voice === 'Device'), JSON.stringify(spoken));
});

test('a voice list that loses its local voice mid-reading stops instead of switching to the engine default', async () => {
  set([V('Device', true)]);
  const ev = await new Promise(res => {
    const e = { errors: [] };
    const sp = new T.Speaker({ onSegment() {}, onState() {}, onEnd: () => res(e), onError: c => { e.errors.push(c); res(e); } });
    sp.load([{ el: null, parts: ['שָׁלוֹם'] }, { el: null, parts: ['עֲלֵיכֶם'] }], { rate: 1 }); sp.startAt(0);
    setTimeout(() => { voices = [V('Cloud', false)]; }, 0);
  });
  assert.deepEqual(ev.errors, ['no-voice']);
});

test('waitForVoices resolves with local voices only', async () => {
  set([V('Cloud', false), V('Device', true)]);
  assert.deepEqual((await T.waitForVoices(50)).map(v => v.name), ['Device']);
  set([V('Cloud', false)]);
  assert.deepEqual(await T.waitForVoices(50), []);
});
