// Round 4 MUST-FIX: the petucha/setuma markers (פ/ס) were sent to the speech engine as separate utterances.
// Also: one tap on 🔊 starts reading, Rashi abbreviations / citations, divine names in the real lesson queue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const synth = () => {
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 3); }, 1); },
  } });
};
const queue = async (p, url, n = 400) => {
  await p.goto(url); await p.waitForSelector('#rc .seg');
  await p.click('#b-tts');                       // one tap
  await p.waitForSelector('#ttsctl:not([hidden])');
  await p.waitForFunction(k => window.__spoken.length >= k || document.querySelector('#rb:not(.speaking)'), n, { timeout: 20000 }).catch(() => {});
  return p.evaluate(() => window.__spoken.slice());
};

test('Yitro 6th (Israel, Ex 19:20–20:14): no "ס"/"פ" utterances, ת״ל expanded, citations skipped, one tap starts', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: synth, prefs: { ttsContinuous: false } });
    const q = await queue(p, srv.url + '#/r/chumash/2026-02-06');
    assert.ok(q.length > 20, `queue length ${q.length}`);
    assert.equal(await p.$$eval('#rc .pe', x => x.length) > 0, true, 'the page does show section markers');
    const bad = q.filter(t => /^[\s.]*[ספ][\s.]*$/.test(t) || /(^|\s)[ספ](\s|$)/.test(t.replace(/[\u0591-\u05C7]/g, '')));
    assert.deepEqual(bad, [], 'section markers spoken');
    const all = q.join(' ');
    assert.doesNotMatch(all, /ת"ל|תַּ"לֹ/);
    assert.match(all, /תַּלְמוּד לוֹמַר/);
    assert.doesNotMatch(all, /\((שמות|מכילתא)[^)]*\)/, 'citations are skipped by default');
    assert.doesNotMatch(all, /[\u05B0-\u05BC]השם/, 'the substitute is never glued unvocalised to a prefix');
    assert.equal(await p.$('#sheet:not([hidden])'), null, 'one tap does not open the settings sheet');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('citations are read when the setting is off', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: synth, prefs: { ttsContinuous: false, ttsSkipCites: false } });
    const q = await queue(p, srv.url + '#/r/chumash/2026-02-06');
    assert.match(q.join(' '), /\(מכילתא\)/);
  } finally { await b.close(); srv.close(); }
});

test('Tehillim 90 (2026-02-06): אֲדֹנָי as a name is substituted in "השם" mode', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: synth, prefs: { ttsContinuous: false } });
    const q = (await queue(p, srv.url + '#/r/tehillim/2026-02-06', 2000)).join(' ');
    assert.match(q, /אֲדוֹשֵׁם מָעוֹן/);
    assert.doesNotMatch(q, /אֲדֹנָי מָעוֹן/);
  } finally { await b.close(); srv.close(); }
});
