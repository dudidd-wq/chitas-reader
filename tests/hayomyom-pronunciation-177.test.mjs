import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { textToIPA, accentStressMap, stressKey } from '../site/js/g2p.js';
const D = JSON.parse(fs.readFileSync(new URL('../site/data/hayomyom/days.json', import.meta.url)));
const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const say = key => D[key].p.map(p => p[2]).join(' ');
const bare = t => t.replace(/[\u0591-\u05C7]/g, '').normalize('NFC');
test('1.0.77: all 383 display entries, source IDs and italics are byte-for-byte unchanged', () => {
  assert.equal(Object.keys(D).length, 383);
  const text = JSON.stringify(Object.entries(D).map(([k, e]) => [k, e.ref, e.rev, e.p.map(p => p.slice(0, 2))]));
  assert.equal(crypto.createHash('sha256').update(text).digest('hex'), '2e6a3355e97c3f6f833df312e9fad55eaf0ffa8d8a5b0e0f1be8c5972ad8fc65');
});
test('1.0.77: explicit primary stress survives the production raw-accents → IPA path', () => {
  const raw = say('cheshvan-28'), trace = [];
  textToIPA(prepareForTTS(raw), { data, accents: raw, trace });
  for (const [word, expected] of [['יחס', 'jˈaχas'], ['כמה', 'kˈama'], ['אלא', 'ʔˈela']]) {
    assert.equal(trace.find(t => bare(t.word) === word)?.ipa, expected, word);
  }
  assert.ok(accentStressMap(raw).size > 15);
  assert.doesNotMatch(prepareForTTS(raw), /\u05AB/); // browser fallback never receives custom stress tags
});
test('1.0.77: contextual vowels are corrected, not arbitrary meanings of bare words', () => {
  const t = say('cheshvan-28');
  assert.match(bare(t), /מין המדבר/);
  const trace = []; textToIPA(prepareForTTS(t), { data, accents: t, trace });
  assert.equal(trace.find(x => bare(x.word) === 'המדבר')?.ipa, 'hamdabˈeʁ');
  assert.equal(trace.find(x => bare(x.word) === 'הפרטיות')?.ipa, 'hapeʁatijˈot');
  assert.equal(trace.find(x => bare(x.word) === 'ואיחוד')?.ipa, 'veʔiχˈud');
});
test('1.0.77: known verb stress and exact Psalms quotation are used', () => {
  const raw = say('kislev-19'), trace = [];
  textToIPA(prepareForTTS(raw), { data, accents: raw, trace });
  assert.equal(trace.find(x => bare(x.word) === 'שהתחלתי')?.ipa, 'ʃehitχˈalti');
  assert.match(raw, /"פָּדָה בְשָׁלוֹ֫ם נַפְשִׁי"/);
});
test('1.0.77: no SSML, network URL, or internal Dicta pipe appears in reading data', () => {
  for (const [k, e] of Object.entries(D)) for (const p of e.p) {
    assert.ok(p[2], k); assert.doesNotMatch(p[2], /<phoneme|<speak|https?:|\|/);
  }
});
