import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { aramWord, aramSayText, CONFIG } from '../tools/aramaic-speech.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const ipa = (w, opt = {}) => textToIPA(w.replace(/\u05AB/g, ''), { data, accents: { primary: w }, ...opt });
const P = t => prepareForTTS(t, { stress: true, divineName: 'hashem' });
const candidate = { ...CONFIG.sources.bavli, shva: true }; // general lexicon remains OFF

test('B: exact tsere and hiriq-male verbs gain vocal shva, including accents and NFD', () => {
  // Before: vajelχu, jelχu, jetsʔu, ʔelχa, jiʁʔu (with the same stress).
  for (const [w, expected] of [
    ['וַיֵּלְכוּ', 'vajeleχˈu'], ['יֵלְכוּ', 'jeleχˈu'], ['יֵצְאוּ', 'jetseʔˈu'],
    ['אֵלְכָה', 'ʔˈeleχa'], ['יִירְאוּ', 'jiʁeʔˈu'],
  ]) {
    assert.equal(ipa(w), expected, w);
    assert.equal(ipa(w.normalize('NFD')), expected, w + ' NFD');
  }
  assert.equal(textToIPA('וַיֵּלְכ֖וּ', { data, accents: 'וַיֵּלְכ֖וּ' }), 'vajeleχˈu');
  assert.equal(ipa('יִירְאוּ', { havara: 'chabad' }), 'jˈiʁeu');
  // An explicit speech-only nach mark still wins over the new verb list.
  assert.equal(ipa('יִירְ|אוּ'), 'jiʁʔˈu');
});

test('B: nouns, final closed syllables, possessives and qamatz retain their before IPA', () => {
  for (const [w, expected] of [
    ['קֵדְמָה', 'kˈedma'], ['חֵטְא', 'χˈet'], ['עִירְךָ', 'ʔiʁχˈa'],
    ['יְמִינְךָ', 'jeminχˈa'], ['שָׁמְרָה', 'ʃamʁˈa'], ['חָכְמָה', 'χoχmˈa'],
  ]) assert.equal(ipa(w), expected, w);
});

test('B: initial Chabad vowels held; no new glide evidence warrants overriding havara-191', () => {
  // Before == after. Prefix shuruk remains the proven 1.0.123 exception.
  for (const [w, chabad, israeli] of [
    ['אַתָּה', 'ˈato', 'ʔatˈa'], ['אֱמֶת', 'emˈes', 'ʔemˈet'],
    ['אִם', 'ˈim', 'ʔˈim'], ['עָם', 'ˈom', 'ʔˈam'], ['וּמָה', 'ʔumˈo', 'ʔumˈa'],
  ]) {
    assert.equal(ipa(w, { havara: 'chabad' }), chabad);
    assert.equal(ipa(w), israeli);
  }
});

test('B: omit duplicated short alternatives, not every short square bracket', () => {
  // Before: the pronoun/adverb was read twice (IK 15).
  assert.equal(P('אַף שֶׁהוּא [הוּא] מַהוּתוֹ'), 'אַף שֶׁהוּא מַהוּתוֹ');
  assert.equal(P('דְּאַף שֶׁהִיא [היא] מִדַּת'), 'דְּאַף שֶׁהִיא מִדַּת');
  assert.equal(P('דַקָּה מְאֹד [מְאֹד]'), 'דַקָּה מְאֹד');
  assert.equal(P('דָּבָר אֶחָד [דָּבָר אֶחָד]'), 'דָּבָר אֶחָד');
  // Real lesson supplements: IK 15 and LA 8. Before == after.
  assert.equal(P('הַטּוֹחֵן [חִטִּים] בָּרֵחַיִים'), 'הַטּוֹחֵן חִטִּים בָּרֵחַיִים');
  assert.equal(P('כַּף הַקֶּלַע [לְבַדּוֹ] מוֹעִיל'), 'כַּף הַקֶּלַע לְבַדּוֹ מוֹעִיל');
  assert.equal(P('אָמַר [הוּא] דָּבָר'), 'אָמַר הוּא דָּבָר');
});

test('B: duplicate brackets retain conflicting vocalization in every matching path', () => {
  for (const input of [
    'שָׁם [שֵׁם]', 'אָמַר [אֱמֹר]', 'הַסֵּפֶר [הַסַּפָּר]',
    'שָׁם אֶחָד [שֵׁם אֶחָד]', 'דָּבָר שָׁם [דָּבָר שֵׁם]',
    'שֶׁהוּא [הוֹא]', 'שֶׁהִיא [הֵיא]',
    'שָׁם [שָׂם]', 'בַּת [בַת]', 'בַת [בַּת]',
    'שם [שֵׁם]', 'שָׁם [שֵם]',
  ]) {
    // Speech removes bracket punctuation, but must keep both readings.
    assert.equal(P(input), P(input.replace(/[\[\]]/g, '')), input);
  }
});

test('B: duplicate compatibility keeps unpointed attestations and ignores accent/mark order', () => {
  for (const [previous, bracket] of [
    ['שהוא', 'הוא'], ['שהיא', 'היא'], ['מאד', 'מאד'],
    ['שֶׁהוּא', 'הוא'], ['שֶׁהִיא', 'היא'], ['מְאֹד', 'מאד'],
    ['שָׁם', 'שָׁ֖ם'], ['שָׁם אֶחָד', 'שָׁ֖ם אֶחָד'],
    ['שֶׁהוּא', 'הוּ֖א'],
  ]) {
    assert.equal(P(`${previous} [${bracket}]`), P(previous));
    assert.equal(P(`${previous} [${bracket}]`.normalize('NFD')), P(previous.normalize('NFD')));
  }
});

test('B: closed chapter citations omitted, bracketed explanatory sentences retained', () => {
  // Before: these LA 1 / LA 50 source citations were spoken.
  for (const cite of ['אָבוֹת פֶּרֶק ב׳', 'אבות פרק ב׳', 'בָּבָא בַּתְרָא פֶּרֶק א׳',
    'בְּסוֹף פֶּרֶק ג׳ דְּנִדָּה', 'בְּפֶרֶק ו׳ דִּשְׁבוּעוֹת', 'פֶּרֶק בּ׳ דַּחֲגִיגָה'])
    assert.equal(P(`תְּנַן [${cite}] אָמַר`), 'תְּנַן אָמַר', cite);
  assert.equal(P('אָמַר [זֶה פֶּרֶק חָשׁוּב]'), 'אָמַר זֶה פֶּרֶק חָשׁוּב');
  assert.equal(P('אָמַר [אבות פרק זה]'), 'אָמַר אבות פרק זה');
});

test('B: audit-124 editorial notes and both ketiv/qere orders retain exact output', () => {
  for (const note of ['אולי צריך להיות: דְּחִילוּ וּרְחִימוּ', 'נוסח אחר: קֵץ', 'בכתב יד ליתא'])
    assert.equal(P(`הַדָּבָר [${note}] הַזֶּה.`), 'הַדָּבָר הַזֶּה.');
  assert.equal(P('(יאשר) [וְאֻשַּׁר]'), 'וְאֻשַּׁר');
  assert.equal(P('[יָרוּמוּ] (ירימו)'), 'יָרוּמוּ');
  assert.equal(P('[אַךְ] (עַל עֲבוֹדָתוֹ)'), 'אַךְ (עַל עֲבוֹדָתוֹ)');
});

test('B: experimental shva repairs the named stress failures without enabling general lexicon', () => {
  // Before (inherited tags): ʔˈikela and veʔadeʁabˈa. Candidate: ik-LA, ad-RA-ba.
  for (const mode of ['gemara', 'prose']) for (const [w, expected] of [
    ['אִ֫יקְּלַע', 'ʔiklˈa'], ['וְאִ֫יקְּלַע', 'veʔiklˈa'],
    ['אַדְּרַבָּ֫ה', 'ʔadʁˈaba'], ['וְאַדְּרַבָּ֫ה', 'veʔadʁˈaba'],
  ]) {
    const after = aramWord(w, mode, candidate);
    assert.equal(ipa(after), expected);
    assert.equal(aramWord(after, mode, candidate), after);
    assert.equal(after.replace(/[\u05AB|]/g, '').normalize('NFD'), w.replace(/\u05AB/g, '').normalize('NFD'));
  }
  // Before with experimental group: mijsod. Hebrew prose must retain /mijesod/.
  assert.equal(ipa(aramWord('מִֽיְּסוֹד', 'prose', candidate)), 'mijesˈod');
  assert.equal(aramWord('שֶׁמְּקַבְּלִים', 'prose', candidate), 'שֶׁמְּקַבְּלִים');
  assert.equal(ipa(aramWord('מִשְּׁמֵיהּ', 'prose', candidate)), 'miʃmˈej');
  assert.equal(ipa(aramWord('אִיתְּמַ֫ר', 'onkelos', CONFIG.sources.onkelos)), 'ʔitmˈaʁ');
  assert.equal(aramWord('הָכִי', 'gemara', candidate), 'הָכִי');
  for (const source of ['bavli', 'tanya', 'tolt']) assert.equal(CONFIG.sources[source].shva, false);
  for (const g of Object.values(CONFIG.sources)) assert.equal(g.lexicon, false);
});

test('B: experimental post-pass routing, quotation protection and idempotence', () => {
  const raw = 'אִ֫יקְּלַע וְאַדְּרַבָּ֫ה מִֽיְּסוֹד';
  const once = aramSayText(raw, 'prose', { groups: candidate });
  assert.equal(ipa(once), 'ʔiklˈa veʔadʁˈaba mijesˈod');
  assert.equal(aramSayText(once, 'prose', { groups: candidate }), once);
  assert.equal(aramSayText('״אִ֫יקְּלַע״', 'gemara', { groups: candidate }), '״אִ֫יקְּלַע״');
  assert.equal(aramSayText(raw, 'gemara', { groups: candidate, mishnah: true }), raw);
  assert.equal(ipa(aramSayText('אִיתְּמַ֫ר', 'gemara', { source: 'yerushalmi' })), 'ʔitmˈaʁ');
});
