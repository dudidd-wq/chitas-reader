// 1.0.110: Kol HaLashon pronunciation-lexicon entries that scored >9.5 are applied to the speech
// layer only (stress-exceptions.tsv + stress-he.json). Displayed letters and niqqud do not change.
// Locked exceptions win over stale compiled ole tags, but not over cantillation, and not over
// occurrence-specific ole of other words (קָ֫מָה / קָמָ֫ה).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA, predictStress, stressKey } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';

const root = new URL('../', import.meta.url).pathname;
const data = JSON.parse(fs.readFileSync(root + 'site/voice/stress-he.json', 'utf8'));
const tsv = fs.readFileSync(root + 'tools/data/stress-exceptions.tsv', 'utf8');
const ipa = (w, opt = {}) => textToIPA(w, { data, ...opt });
const trace = (w, opt = {}) => {
  const tr = [];
  const out = textToIPA(w, { data, trace: tr, ...opt });
  return { out, tr };
};

const ACCEPTED = [
  ['אַבָּא', 'ʔˈaba'],
  ['אַבָּא', 'ʔˈaba'],
  ['אַלְפַּיִים', 'ʔalpˈajim'],
  ['אַלְפַּיִים', 'ʔalpˈajim'],
  ['בֵּינְתַיִים', 'bentˈajim'],
  ['בֵּינְתַיִים', 'bentˈajim'],
];

test('1.0.110: accepted Kol HaLashon entries are milel exceptions for the Israeli default', () => {
  for (const [w, want] of ACCEPTED) {
    const key = stressKey(w);
    assert.equal(data.exc[key], 1, w);
    assert.equal(data.excForce[key], 1, w);
    assert.equal(predictStress(w, data)[0], 1, w);
    assert.equal(ipa(w), want, w);
    assert.equal(ipa(w, { havara: 'israeli' }), want, w);
  }
});

test('1.0.110: locked exceptions correct stale compiled ole, and typography variants share a key', () => {
  assert.equal(stressKey('אַבָּא'), stressKey('אַבָּא'));
  assert.equal(stressKey('אַלְפַּיִים'), stressKey('אַלְפַּיִים'));
  assert.equal(stressKey('בֵּינְתַיִים'), stressKey('בֵּינְתַיִים'));
  const stale = [
    ['אַבָּ֫א', 'ʔˈaba'],
    ['אַלְפַּיִ֫ים', 'ʔalpˈajim'],
    ['בֵּינְתַיִ֫ים', 'bentˈajim'],
  ];
  for (const [marked, want] of stale) {
    const clean = marked.replace(/\u05AB/g, '');
    const { out, tr } = trace(clean, { accents: { primary: marked } });
    assert.equal(out, want, marked);
    assert.equal(tr[0].src, 'excForce', marked);
    assert.equal(tr[0].k, 1, marked);
  }
});

test('1.0.110: occurrence-specific ole of a non-forced word is kept (קָ֫מָה / קָמָ֫ה)', () => {
  const marked = prepareForTTS('קָ֫מָה קָמָ֫ה', { primaryStress: true });
  const clean = marked.replace(/\u05AB/g, '');
  assert.equal(ipa(clean, { accents: { primary: marked } }), 'kˈama kamˈa');
});

test('1.0.110: rejected lexicon items and homographs are not exceptions; existing readings stand', () => {
  const rejected = [
    'אַחֶרֶת', 'מַשְׁמָע', 'מַשְׁמַע', 'חָסֵר', 'שֶׁאֵצֶל', 'פְּלוֹנִי',
    'לָרַב', 'לְרַב', 'שׁוֹמֵעַ', 'לַמִּזְבֵּחַ', 'בַּמִּזְבֵּחַ', 'רָשִׁי', 'לְרָשִׁי',
  ];
  for (const w of rejected) {
    assert.equal(data.exc[stressKey(w)], undefined, w);
    assert.equal(data.excForce?.[stressKey(w)], undefined, w);
  }
  // Pre-existing / independent readings that a blanket unpointed lexicon would have broken
  assert.equal(ipa('רָשָׁע'), 'ʁaʃˈa');
  assert.equal(ipa('שׁוֹמֵעַ'), 'ʃomˈea');
  assert.equal(ipa('חָסֵר'), 'χasˈeʁ');
  assert.equal(ipa('לָרַב'), 'laʁˈav');
  assert.equal(ipa('זֵכֶר'), 'zˈeχeʁ');
  assert.equal(ipa('זָכָר'), 'zaχˈaʁ');
  assert.equal(ipa('יְרוּשָׁלַיִם'), 'jeʁuʃalˈajim'); // already an exception, not newly forced
  assert.equal(data.excForce[stressKey('יְרוּשָׁלַיִם')], undefined);
});

test('1.0.110: cantillation still decides stress; force does not apply when a verse accent map is present', () => {
  const v = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';
  assert.equal(
    textToIPA(prepareForTTS(v, { stress: true, divineName: 'hashem' }), { data, accents: v }),
    'beʁeʃˈit baʁˈa ʔelokˈim, ʔˈet haʃamˈajim veʔˈet haʔˈaʁets.',
  );
});

test('1.0.110: Chabad pronunciation of Abba stays milel; displayed Hayom Yom letters are untouched', () => {
  assert.equal(ipa('אַבָּא', { havara: 'chabad' }), 'ˈabo');
  const hy = JSON.parse(fs.readFileSync(root + 'site/data/hayomyom/days.json', 'utf8'));
  const day = hy['iyyar-1'];
  const p = day.p.find(row => /אבא/.test(row[0]) && /אַבָּ/.test(row[2]));
  assert.ok(p, 'expected a Hayom Yom paragraph that displays אבא and speaks אַבָּא');
  assert.match(p[0], /אבא/);
  assert.doesNotMatch(p[0], /\u05AB/); // display has no ole
  assert.match(p[2], /אַבָּ֫א/);       // compiled say still has the stale milra tag
  const prepared = prepareForTTS(p[2], { stress: true, primaryStress: true });
  const chunk = prepared.match(/אַבָּ[\u05AB]?א/)[0];
  const { out, tr } = trace(chunk.replace(/\u05AB/g, ''), { accents: { primary: chunk } });
  assert.equal(out, 'ʔˈaba');
  assert.equal(tr[0].k, 1);
  // the source JSON for the displayed line is unchanged by this work
  assert.ok(/אמרו פעם בפני אבא/.test(p[0]));
});

test('1.0.110: TSV marks only the accepted forms as force, and the builder copied them', () => {
  const forced = tsv.split('\n').filter(l => l.split('#')[0].includes('\tforce') || /\sforce\s*$/.test(l.split('#')[0]));
  assert.equal(forced.length, 6); // typography pairs of the three accepted pointed forms
  assert.equal(Object.keys(data.excForce).length, 3);
});
