// Two separate TTS settings for the divine name: scripture/prayer vs Oral Torah.
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { resolveDivineName, divinePartKinds, divineNamesForParts, applyDivineStandins, prepareSpeechForTTS } from '../site/js/divine-tts.js';
import { normalizePrefs, DEFAULT_PREFS } from '../site/js/store.js';

const H = { stress: true, divineName: 'hashem' };
const A = { stress: true, divineName: 'adonai' };

test('defaults: both groups are hashem, matching previous single default', () => {
  assert.equal(DEFAULT_PREFS.ttsDivineScripture, 'hashem');
  assert.equal(DEFAULT_PREFS.ttsDivineOral, 'hashem');
  assert.equal('ttsDivine' in DEFAULT_PREFS, false);
  const p = normalizePrefs({});
  assert.equal(p.ttsDivineScripture, 'hashem');
  assert.equal(p.ttsDivineOral, 'hashem');
});

test('legacy ttsDivine migrates to both new keys; explicit new keys win', () => {
  const legacy = normalizePrefs({ ttsDivine: 'adonai' });
  assert.equal(legacy.ttsDivineScripture, 'adonai');
  assert.equal(legacy.ttsDivineOral, 'adonai');
  const mixed = normalizePrefs({ ttsDivine: 'adonai', ttsDivineScripture: 'hashem', ttsDivineOral: 'adonai' });
  assert.equal(mixed.ttsDivineScripture, 'hashem');
  assert.equal(mixed.ttsDivineOral, 'adonai');
  const bad = normalizePrefs({ ttsDivine: 'nope', ttsDivineScripture: 'also-nope' });
  assert.equal(bad.ttsDivineScripture, 'hashem');
  assert.equal(bad.ttsDivineOral, 'hashem');
});

test('resolveDivineName uses the matching setting and falls back safely', () => {
  const prefs = { ttsDivineScripture: 'adonai', ttsDivineOral: 'hashem' };
  assert.equal(resolveDivineName(prefs, 'scripture'), 'adonai');
  assert.equal(resolveDivineName(prefs, 'oral'), 'hashem');
  assert.equal(resolveDivineName({ ttsDivine: 'adonai' }, 'scripture'), 'adonai');
  assert.equal(resolveDivineName({}, 'oral'), 'hashem');
});

test('verse, targum and siddur/tehillim are scripture; commentaries and Oral Torah are oral', () => {
  assert.deepEqual(divinePartKinds('chumash', { rashiCount: 2, shortBiur: true }), ['scripture', 'oral', 'oral', 'oral']);
  assert.deepEqual(divinePartKinds('shnayim', { repeat: 2, biurSay: ['תרגום הפסוק'], biurLabel: 'תרגום' }), ['scripture', 'scripture', 'scripture']);
  assert.deepEqual(divinePartKinds('nachyomi', { biurSay: ['מצודת דוד'], biurLabel: 'מצודת דוד' }), ['scripture', 'oral']);
  assert.deepEqual(divinePartKinds('tehillim', {}), ['scripture']);
  assert.deepEqual(divinePartKinds('siddur', {}), ['scripture']);
  assert.deepEqual(divinePartKinds('tanya', { shortBiur: true }), ['oral', 'oral']);
  assert.deepEqual(divinePartKinds('rambam3', {}), ['oral']);
  assert.deepEqual(divinePartKinds('dafyomi', {}), ['oral']);
  assert.deepEqual(divinePartKinds('hayomyom', {}), ['oral']);
  assert.deepEqual(divinePartKinds('tolt', {}), ['oral']);
  assert.deepEqual(divinePartKinds('mishnayomit', {}), ['oral']);
});

test('divineNamesForParts applies the two settings to a mixed Chumash+Rashi segment', () => {
  const prefs = { ttsDivineScripture: 'adonai', ttsDivineOral: 'hashem' };
  assert.deepEqual(
    divineNamesForParts('chumash', { rashiCount: 1 }, prefs),
    ['adonai', 'hashem'],
  );
  assert.deepEqual(
    divineNamesForParts('shnayim', { repeat: 2, biurSay: ['x'], biurLabel: 'תרגום' }, prefs),
    ['adonai', 'adonai', 'adonai'],
  );
  assert.deepEqual(
    divineNamesForParts('tanya', {}, prefs),
    ['hashem'],
  );
});

test('ידוד and יקוק follow the same rule as the Tetragrammaton, including prefixes', () => {
  assert.equal(applyDivineStandins('ידוד'), 'יהוה');
  assert.equal(prepareSpeechForTTS('ידוד', H), 'הַשֵּׁם');
  assert.equal(prepareSpeechForTTS('ידוד', A), 'אֲדֹנָי');
  assert.equal(prepareSpeechForTTS('וַיְדֹוָד', H), 'וַהַשֵּׁם');
  assert.equal(prepareSpeechForTTS('יקוק', H), 'הַשֵּׁם');
  assert.equal(prepareSpeechForTTS('לְיקוק', A), 'לְאֲדֹנָי');
  assert.equal(prepareForTTS('יְהוָה', H), 'הַשֵּׁם'); // existing form unchanged, still via tts-prep
  assert.equal(prepareSpeechForTTS('יְהוָה', H), 'הַשֵּׁם');
});

test('Speaker.load applies a different mode to each part when divineNames is set', async () => {
  const { Speaker } = await import('../site/js/tts.js');
  const sp = new Speaker({});
  sp.load(
    [{ el: {}, parts: ['יְהוָה', 'יְהוָה', 'אֱלֹהִים'], divineNames: ['adonai', 'hashem', 'hashem'], cites: [false, false, false] }],
    { stress: true, divineName: 'hashem' },
  );
  const texts = sp.queue.map(q => q.text);
  assert.ok(texts.includes('אֲדֹנָי'), texts);
  assert.ok(texts.includes('הַשֵּׁם'), texts);
  assert.ok(texts.includes('אֱלֹקִים'), texts);
  assert.equal(texts.filter(t => t === 'אֲדֹנָי').length, 1);
  assert.equal(texts.filter(t => t === 'הַשֵּׁם').length, 1);
});
