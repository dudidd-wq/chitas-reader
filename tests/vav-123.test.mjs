// 1.0.123: word-initial shuruk is sent to Piper as ʔu (like אוּלַי), not a bare u,
// which the voice realized with a v/w onset. Internal shuruk is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wordToIPA, textToIPA, ipaToIds } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const noa = JSON.parse(fs.readFileSync(new URL('../site/voice/he_IL-noa-medium.onnx.json', import.meta.url)));
const nat = JSON.parse(fs.readFileSync(new URL('../site/voice/he_IL-ilspeech-male-medium.onnx.json', import.meta.url)));
const il = w => wordToIPA(w, null, data, { havara: 'israeli' });
const ash = w => wordToIPA(w, null, data, { havara: 'chabad' });

const names = (ipa, map, pad) => {
  const inv = {};
  for (const [k, v] of Object.entries(map)) inv[v[0]] = k;
  return ipaToIds(ipa, map, pad).map(i => inv[i] ?? '?');
};
const afterBos = ids => {
  const i = ids.indexOf('^');
  return ids.slice(i + 1).filter(s => s !== '_' && s !== '$');
};

const PREFIX = {
  'וּלְזַרְעֶךָ': 'ʔulezaʁʔeχˈa',
  'וּלְזַרְעֲךָ': 'ʔulezaʁʔaχˈa',
  'וּבְלִי': 'ʔuvelˈi',
  'וּמִן': 'ʔumˈin',
  'וּשְׁמַרְתִּיךָ': 'ʔuʃemaʁtiχˈa',
  'וּבְכָל': 'ʔuveχˈol',
};

const INTERNAL = {
  'הוּא': 'hˈu',
  'בָּרוּךְ': 'baʁˈuχ',
  'שׁוּב': 'ʃˈuv',
  'מַהוּתָן': 'mahutˈan',
  'צִוָּה': 'tsivˈa',
};

test('1.0.123: prefix shuruk IPA starts with ʔu, not a bare u or v', () => {
  const bad = Object.entries(PREFIX).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
  assert.equal(ash('וּמִן'), 'ʔumˈin');
  assert.equal(ash('וּבְלִי'), 'ʔuvelˈi');
  assert.equal(ash('וּבְכָל'), 'ʔuveχˈol');
});

test('1.0.123: Piper ids for prefix shuruk are ʔ u … on noa (padded) and the natural male voice', () => {
  for (const [w, ipa] of Object.entries(PREFIX)) {
    const noaPh = afterBos(names(ipa, noa.phoneme_id_map, true));
    const natPh = afterBos(names(ipa, nat.phoneme_id_map, nat.chitas_pad !== false));
    assert.equal(noaPh[0], 'ʔ', w + ' noa ' + noaPh.join(' '));
    assert.equal(noaPh[1], 'u', w + ' noa ' + noaPh.join(' '));
    assert.equal(natPh[0], 'ʔ', w + ' nat ' + natPh.join(' '));
    assert.equal(natPh[1], 'u', w + ' nat ' + natPh.join(' '));
    assert.notEqual(noaPh[0], 'v');
    assert.notEqual(noaPh[0], 'w');
  }
});

test('1.0.123: internal shuruk is unchanged (no leading ʔ)', () => {
  const bad = Object.entries(INTERNAL).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
  const hu = afterBos(names(il('הוּא'), noa.phoneme_id_map, true));
  assert.deepEqual(hu, ['h', 'ˈ', 'u']);
  const br = afterBos(names(il('בָּרוּךְ'), noa.phoneme_id_map, true));
  assert.equal(br[0], 'b');
  assert.ok(br.includes('u') && !br.includes('ʔ'), br.join(' '));
});

test('1.0.123: lesson sentences through prepareForTTS + textToIPA keep ʔu on each prefix', () => {
  const run = t => textToIPA(prepareForTTS(t, { stress: true, divineName: 'hashem' }), { data, havara: 'israeli' });
  const a = run('לְךָ אֶתְּנֶנָּה וּלְזַרְעֶךָ. וּמִן הָאֲדָמָה וּבְלִי הַשָּׂגָה.');
  assert.match(a, /ʔulezaʁ/);
  assert.match(a, /ʔumˈin|ʔumin/);
  assert.match(a, /ʔuvelˈi/);
  assert.doesNotMatch(a, /(?<![ʔaeiou])ulezaʁ/);
});
