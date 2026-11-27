// A8: zero silent phoneme loss on the IPA → model-id path.
// The older g2p test titled "every symbol is in the voice's phoneme map" only checks
// id-list length and that values are integers; it does not prove membership.
// This file checks every symbol of textToIPA's closed alphabet against both voice
// maps, walks a licensed in-app corpus, and documents that ipaToIds still skips
// unmapped symbols (no invented mappings). g2p.js is intentionally untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA, ipaToIds, accentStressMap } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { VOICE_FILES } from '../site/js/voice-files.js';

const root = new URL('../', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, root), 'utf8');
const stress = JSON.parse(read('site/voice/stress-he.json'));
const noa = JSON.parse(read('site/voice/he_IL-noa-medium.onnx.json'));
const nat = JSON.parse(read('site/voice/he_IL-ilspeech-male-medium.onnx.json'));

// Closed alphabet of textToIPA (the sanitize class in g2p.js) plus the interned
// PHONEME_CHARS set (includes pre-modern x/r/g and c, which the maps also have).
const SANITIZE_ALPHA = [...' .,!?aeiouʔvɡdhzχtjklmnsfʁʃbpˈʒw'];
const PHONEME_CHARS = [...new Set([...'ieaouʔvgdhzxtjklmnsfrʃbpˈʒʁχɡwc', ...'dʒtʃ'])];
const VOICES = [
  ['noa', noa],
  ['natural', nat],
];

function missingChars(ipa, idMap) {
  const miss = new Map();
  for (const ch of ipa) {
    if (idMap[ch]) continue;
    miss.set(ch, (miss.get(ch) || 0) + 1);
  }
  return miss;
}

function fmtMiss(miss) {
  return [...miss.entries()].map(([ch, n]) =>
    `${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase()}×${n}`).join(', ');
}

function chapterFiles(relDir) {
  const dir = new URL(relDir, root);
  const out = [];
  for (const book of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!book.isDirectory()) continue;
    const bdir = new URL(book.name + '/', dir);
    for (const f of fs.readdirSync(bdir)) {
      if (/^\d+\.json$/.test(f)) out.push(new URL(f, bdir));
    }
  }
  return out;
}

function tehillimFiles() {
  const dir = new URL('site/data/tehillim/', root);
  return fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => new URL(f, dir));
}

function versesOf(url) {
  const j = JSON.parse(fs.readFileSync(url, 'utf8'));
  const vs = j.v || [];
  return vs.map((v) => String(v).replace(/<[^>]+>/g, ''));
}

test('A8: every closed-alphabet and PHONEME_CHARS symbol is in both voice maps', () => {
  for (const [name, cfg] of VOICES) {
    const map = cfg.phoneme_id_map;
    for (const ch of [...SANITIZE_ALPHA, ...PHONEME_CHARS]) {
      assert.ok(map[ch], `${name} missing ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase()}`);
    }
    assert.ok(map['^'] && map['$'] && map['_'], `${name} missing BOS/EOS/pad`);
  }
});

test('A8: noa keeps inter-phoneme pads; natural uses chitas_pad: false', () => {
  const m = { '^': [1], _: [0], $: [2], a: [5], b: [6] };
  assert.deepEqual(ipaToIds('ab', m, true), [1, 0, 5, 0, 6, 0, 2]);
  assert.deepEqual(ipaToIds('ab', m, false), [1, 5, 6, 2]);
  assert.equal(nat.chitas_pad, false);
  assert.equal(noa.chitas_pad, undefined);
  const ipa = textToIPA('אָב', { data: stress });
  const noaIds = ipaToIds(ipa, noa.phoneme_id_map, noa.chitas_pad !== false);
  const natIds = ipaToIds(ipa, nat.phoneme_id_map, nat.chitas_pad !== false);
  assert.ok(noaIds.includes(0), 'noa ids include pad id 0');
  assert.equal(natIds.includes(0), false, 'natural ids do not include pad id 0');
  assert.ok(noaIds.length > natIds.length);
});

test('A8: unmapped symbols are skipped, not invented (documented, no silent loss of mapped phonemes)', () => {
  const m = { '^': [1], _: [0], $: [2], a: [5], b: [6] };
  // Ω is in neither packaged map; the call must not invent an id.
  assert.equal(noa.phoneme_id_map['Ω'], undefined);
  assert.equal(nat.phoneme_id_map['Ω'], undefined);
  assert.deepEqual(ipaToIds('aΩb', m, false), [1, 5, 6, 2]);
  const withUnknown = ipaToIds('ʃalˈomΩ', noa.phoneme_id_map, true);
  const without = ipaToIds('ʃalˈom', noa.phoneme_id_map, true);
  assert.deepEqual(withUnknown, without);
});

test('A8: golden samples produce only mapped symbols on both voices, israeli and chabad', () => {
  const samples = [
    'בְּרֵאשִׁית בָּרָא אֱלֹהִים, וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ.',
    'שְׁמַע יִשְׂרָאֵל ה׳ אֱלֹהֵינוּ ה׳ אֶחָד.',
    'בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם.',
    'אָמַר רַבָּא אָמַר רַב נַחְמָן לֵיהּ בֵּיהּ עֲלֵיהּ לְכוּלֵּיהּ',
    'ג׳ ז׳ צ׳',
  ];
  for (const havara of ['israeli', 'chabad']) {
    for (const raw of samples) {
      const speech = prepareForTTS(raw, { stress: true, divineName: 'hashem' });
      const ipa = textToIPA(speech, { data: stress, accents: accentStressMap(raw), havara });
      for (const [name, cfg] of VOICES) {
        const miss = missingChars(ipa, cfg.phoneme_id_map);
        assert.equal(miss.size, 0, `${name}/${havara} ${fmtMiss(miss)} in ${ipa}`);
      }
    }
  }
});

test('A8: Torah, Tehillim and a Nach sample: 0 unmapped IPA symbols', () => {
  const files = [
    ...chapterFiles('site/data/torah/'),
    ...tehillimFiles(),
    // Nach with te'amim: one chapter from a few books (Psalms lives under tehillim/)
    new URL('site/data/nach/Isaiah/1.json', root),
    new URL('site/data/nach/Jeremiah/1.json', root),
    new URL('site/data/nach/Daniel/1.json', root),
    new URL('site/data/nach/Ezra/4.json', root), // Biblical Aramaic (Ezra 4:8–24); Daniel 1 is Hebrew
  ];
  let verses = 0, chars = 0;
  const totals = { noa: new Map(), natural: new Map() };
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const raw of versesOf(f)) {
      if (!raw.trim()) continue;
      verses++;
      const speech = prepareForTTS(raw, { stress: true, divineName: 'hashem' });
      const ipa = textToIPA(speech, { data: stress, accents: accentStressMap(raw) });
      chars += ipa.length;
      for (const [name, cfg] of VOICES) {
        for (const [ch, n] of missingChars(ipa, cfg.phoneme_id_map)) {
          totals[name].set(ch, (totals[name].get(ch) || 0) + n);
        }
      }
    }
  }
  assert.ok(verses > 1000, `expected a large corpus, got ${verses} verses`);
  for (const [name, miss] of Object.entries(totals)) {
    assert.equal(miss.size, 0, `${name} unmapped: ${fmtMiss(miss)} (verses=${verses}, ipaChars=${chars})`);
  }
});

test('A8: noa-int8 stays an opt-in; natural-int8 is not packaged; default remains full', () => {
  assert.ok(VOICE_FILES.int8, 'noa int8 is packaged');
  assert.ok(VOICE_FILES.full, 'noa full is packaged');
  assert.ok(VOICE_FILES.natural, 'natural full is packaged');
  assert.equal(VOICE_FILES.naturalInt8, undefined);
  assert.equal(Object.keys(VOICE_FILES).some((k) => /natural.*int8|int8.*natural/i.test(k)), false);
  assert.ok(VOICE_FILES.int8.size < VOICE_FILES.full.size);
  const store = read('site/js/store.js');
  assert.match(store, /ttsModel = 'full'/);
  const app = read('site/js/app.js');
  assert.match(app, /int8/);
  assert.doesNotMatch(app, /natural-int8|naturalInt8/);
});
