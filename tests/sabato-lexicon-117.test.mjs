// 1.0.117: Rav Sabato Rambam lexicon (Vidi). Only אֵשֶׁת scored >9.5 (9.6); it is a forced milel exception in the speech
// layer (overrides stale compiled milra ole tags, never cantillation). טֶפַח / חֹמֶץ were already milel and stay as they are;
// חָמֵץ (leaven) stays milra; the אפילו dagesh spellings (9.1) were not added. Displayed letters and niqqud do not change.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA, predictStress, stressKey } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';

const root = new URL('../', import.meta.url).pathname;
const data = JSON.parse(fs.readFileSync(root + 'site/voice/stress-he.json', 'utf8'));
const ipa = (w, opt = {}) => textToIPA(w, { data, ...opt });
const withOle = (marked, opt = {}) => { const tr = []; const out = ipa(marked.replace(/\u05AB/g, ''), { accents: { primary: marked }, trace: tr, ...opt }); return { out, tr }; };

const ESHET = [
  ['אֵשֶׁת', 'ʔˈeʃet'], ['וְאֵשֶׁת', 'veʔˈeʃet'], ['בְּאֵשֶׁת', 'beʔˈeʃet'], ['לְאֵשֶׁת', 'leʔˈeʃet'], ['כְּאֵשֶׁת', 'keʔˈeʃet'],
  ['מֵאֵשֶׁת', 'meʔˈeʃet'], ['שֶׁאֵשֶׁת', 'ʃeʔˈeʃet'], ['דְּאֵשֶׁת', 'deʔˈeʃet'], ['וּבְאֵשֶׁת', 'uvʔˈeʃet'],
  ['שֶׁבְּאֵשֶׁת', 'ʃebeʔˈeʃet'], ['שֶׁמֵּאֵשֶׁת', 'ʃemeʔˈeʃet'],
];

test('1.0.117: אֵשֶׁת and its prefixed forms are forced milel, also over a stale milra ole tag', () => {
  for (const [w, want] of ESHET) {
    assert.equal(data.excForce[stressKey(w)], 1, w);
    assert.equal(ipa(w), want, w);
    const stale = w.replace(/ת$/, '\u05ABת'); // ole on the last syllable = the old wrong milra tag
    const { out, tr } = withOle(stale);
    assert.equal(out, want, stale);
    assert.equal(tr[0].src, 'excForce', stale);
  }
  assert.equal(ipa('אֵשֶׁת', { havara: 'chabad' }), 'ˈejʃes');
});

test('1.0.117: cantillation still decides; other proposals did not change the speech', () => {
  const v = 'וְאֵ֣שֶׁת אִ֔ישׁ';
  assert.equal(textToIPA(prepareForTTS(v, { stress: true }), { data, accents: v }), 'veʔˈeʃet ʔˈiʃ');
  assert.equal(ipa('טֶפַח'), 'tˈefaχ');
  assert.notEqual(stressKey('טָפַח'), stressKey('טֶפַח')); // the verb טָפַח is a different pointed form
  assert.equal(ipa('חֹמֶץ'), 'χˈomets');
  assert.equal(ipa('חָמֵץ'), 'χamˈets');
  for (const w of ['טֶפַח', 'חֹמֶץ', 'חָמֵץ', 'טָפַח', 'אֲפִילּוּ', 'וַאֲפִילּוּ', 'אֲפִלּוּ']) assert.equal(data.excForce[stressKey(w)], undefined, w);
  for (const w of ['אֲפִילּוּ', 'וַאֲפִילּוּ', 'דַּאֲפִילּוּ', 'שֶׁאֲפִילּוּ']) assert.equal(data.exc[stressKey(w)], undefined, w);
  assert.equal(predictStress('חָמֵץ', data)[0], 0);
});

test('1.0.117: a Rambam paragraph with לְאֵשֶׁת reads it milel; display text is unchanged', () => {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
  let hit = null;
  for (const f of walk(root + 'site/data/rambam').filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const say = JSON.stringify(d.say || []);
    if (/לְאֵשֶׁ֫ת|לְאֵשֶׁת֫/.test(say)) { hit = (d.say || []).flat(3).find(p => typeof p === 'string' && /לְאֵשֶׁ[\u05AB]?ת/.test(p)); break; }
  }
  assert.ok(hit, 'expected a compiled Rambam paragraph with לְאֵשֶׁת');
  const marked = prepareForTTS(hit, { primaryStress: true });
  const { tr } = withOle(marked);
  const hits = tr.filter(t => t.word && t.word.normalize('NFD') === 'לְאֵשֶׁת'.normalize('NFD'));
  assert.ok(hits.length);
  assert.ok(hits.every(t => t.ipa === 'leʔˈeʃet' && t.src === 'excForce'), JSON.stringify(hits));
});
