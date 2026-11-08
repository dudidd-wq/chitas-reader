import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { accentWords, stressFromAccents, accentStressMap, stressKey, textToIPA } from '../site/js/g2p.js';
import { prepareForTTS, vowelHeadword } from '../site/js/tts-prep.js';
import { expandRashiContext, alignRashiTokens } from '../tools/rashi-context.mjs';
import { fixNiqqud } from '../site/js/niqqud.js';
const ROOT = new URL('../', import.meta.url).pathname;
const D = JSON.parse(fs.readFileSync(ROOT + 'site/voice/stress-he.json'));
const t = (raw, text = prepareForTTS(raw)) => { const trace = []; textToIPA(text, { data: D, accents: raw, trace }); return trace; };
test('1.0.78: maqaf-secondary marks do not override the lexical stress of הללו', () => {
  const v = JSON.parse(fs.readFileSync(ROOT + 'site/data/tehillim/135.json')).v;
  for (const raw of [v[0], v[2]]) {
    const ws = t(raw).filter(x => x.word === 'הַלְלוּ');
    assert.ok(ws.length); assert.ok(ws.every(x => x.ipa === 'halelˈu'), JSON.stringify(ws));
  }
  assert.equal(accentStressMap('הַ֥לְלוּ־יָ֨הּ').has(stressKey('הַלְלוּ')), false);
});
test('1.0.78: emet auxiliary marks are not primary stress, positional partners are', () => {
  assert.equal(stressFromAccents('הַֽ֝לְל֗וּ'), 0);   // revia-mugrash: revia, not geresh muqdam
  assert.equal(stressFromAccents('עָ֫שָׂ֥ה'), 0);     // ole-veyored: merkha/yored, not ole
  assert.equal(stressFromAccents('שֶׁ֣֭עֹמְדִים'), null); // prepositive dehi + auxiliary munach
  const raw = JSON.parse(fs.readFileSync(ROOT + 'site/data/tehillim/135.json')).v[1];
  assert.equal(t(raw).find(w => w.word === 'שֶׁעֹמְדִים').ipa, 'ʃeʔomdˈim');
  assert.equal(accentStressMap('עָ֫שָׂה הַ֥שֵּׁם').has(stressKey('עָשָׂה')), false); // lone poetic ole is not our tag
});
test('1.0.78: prose doubled pashta, primary disjunctive, silluq and custom tags', () => {
  assert.equal(stressFromAccents('וַיֹּ֙אמֶר֙'), 1);
  assert.equal(stressFromAccents('וְאָ֣הַבְתָּ֔'), 0);
  assert.equal(stressFromAccents('הָאָֽרֶץ׃'), 1);
  assert.equal(t('הָאָֽרֶץ׃')[0].src, 'acc');
  assert.equal(stressKey('הָאָֽרֶץ׃'), stressKey('הָאָרֶץ'));
  assert.equal(stressFromAccents('מֶֽלֶךְ'), null); // ordinary meteg is not stress or silluq
  assert.equal(accentStressMap('כַּ֫מָּה').get(stressKey('כַּמָּה')), 1);
  assert.equal(accentStressMap('קָ֣מָה קָמָ֣ה').get(stressKey('קָמָה')), null); // never force the first homograph
  assert.equal(accentWords('<big>בְּ</big>רֵאשִׁ֖ית')[0].word, 'בְּרֵאשִׁ֖ית');
});
const files = fs.readdirSync(ROOT + 'site/data/torah', { withFileTypes: true }).filter(x => x.isDirectory())
  .flatMap(d => fs.readdirSync(ROOT + 'site/data/torah/' + d.name).filter(f => /^\d+\.json$/.test(f)).map(f => `site/data/torah/${d.name}/${f}`)).sort();
test('1.0.78: every displayed Torah verse and Rashi paragraph is unchanged', () => {
  const src = files.map(f => { const d = JSON.parse(fs.readFileSync(ROOT + f)); return [f, d.v, d.r]; });
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'), '59997f8f32ab2e641f6f5eaa41572e77c2104d545860892abd3091cf87bc01a9');
});
test('1.0.78: speech-only Rashi covers the corpus, preserves source spelling, and fixes verified stress', () => {
  let n = 0;
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(ROOT + f)); assert.equal(d.rs.length, d.r.length, f);
    d.r.forEach((ps, vi) => { assert.equal(d.rs[vi].length, ps.length); ps.forEach((p, pi) => {
      const raw = d.rs[vi][pi]; assert.ok(raw); assert.doesNotMatch(raw, /<|>|https?:|\|/);
      const sk = x => x.normalize('NFD').replace(/<[^>]+>/g, '').replace(/[^א-ת]/g, '');
      assert.equal(sk(raw), sk(expandRashiContext(vowelHeadword(fixNiqqud(p), d.v[vi]).replace(/<[^>]+>/g, ''))), `${f}:${vi}:${pi}`); n++;
    }); });
  }
  assert.equal(n, 7816);
  const raw = JSON.parse(fs.readFileSync(ROOT + 'site/data/torah/Genesis/25.json')).rs[18].join(' '), tr = t(raw);
  assert.equal(tr.find(w => w.word === 'כַּמָּה').ipa, 'kˈama');
  assert.equal(tr.find(w => w.word === 'שֶׁכָּתַב').ipa, 'ʃekatˈav');
  assert.equal(tr.find(w => w.word === 'כַּמָּה').src, 'acc');
  assert.equal(tr.find(w => w.word === 'שֶׁכָּתַב').src, 'acc');
});
test('1.0.78: do not invent milel fixes for היתה/אינו', () => {
  assert.equal(textToIPA('הָיְתָה אֵינוֹ', { data: D }), 'hajtˈa ʔejnˈo');
});

test('1.0.78: Rashi context distinguishes avodah zarah, source page 77, and foreign gloss markers', () => {
  assert.match(prepareForTTS(expandRashiContext('עובד ע״ז')), /עֲבוֹדָה זָרָה/);
  assert.equal(expandRashiContext('(מנחות ע״ז)'), '(מנחות ע״ז)');
  assert.equal(expandRashiContext('בלע״ז'), 'בלע״ז');
  assert.match(expandRashiContext('עובד ע״ז'), /עֲבוֹדָ֫ה זָרָ֫ה/);
});

test('1.0.78: split prefix tokens cannot shift morphology onto a later Rashi word', () => {
  const chosen = { word: 'כתב', options: [{ acc: 'Acc0' }] };
  const a = alignRashiTokens(['ודרך', 'כתב'], [{ word: 'ו' }, { word: 'דרך' }, chosen]);
  assert.equal(a.splits, 1); assert.deepEqual(a.tokens[0].options, []); assert.equal(a.tokens[1], chosen);
  assert.equal(alignRashiTokens(['דבר'], [{ word: 'דיבר' }]), null);
});

test('1.0.78: per-occurrence primary tags survive preparation/chunk transport, not just distinct-word maps', () => {
  const marked = prepareForTTS('קָ֫מָה קָמָ֫ה', { primaryStress: true }), clean = marked.replace(/\u05AB/g, '');
  const tr = [];
  assert.equal(textToIPA(clean, { data: D, accents: { primary: marked }, trace: tr }), 'kˈama kamˈa');
  assert.ok(tr.every(t => t.src === 'primary'));
  assert.doesNotMatch(prepareForTTS('קָ֫מָה קָמָ֫ה'), /\u05AB/); // Web Speech unchanged
  const bad = [];
  textToIPA('קָמָה', { data: D, accents: { primary: marked }, trace: bad });
  assert.ok(bad.every(t => t.src !== 'primary')); // cannot apply shifted metadata
});
