// 1.0.112: Aramaic speech rules (tools/aramaic-speech.mjs, verification/ARAMAIC-112.md) and the Chassidus abbreviation
// table / context rules / Hebrew years (site/js/tts-prep.js, verification/ABBR-112.tsv). Speech layer only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { textToIPA, NACH } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { aramWord, aramSayText, withNach } from '../tools/aramaic-speech.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(fs.readFileSync(root + 'site/voice/stress-he.json', 'utf8'));
const prep = t => prepareForTTS(t, { stress: true, primaryStress: true, divineName: 'hashem' }).replace(/\u05AB/g, '');
const ipa = w => textToIPA(w.replace(/\u05AB/g, ''), { data, accents: { primary: w } });
const strip = s => s.replace(/[\u05AB|]/g, '');

test('g2p: | marks a quiescent shva, ignored for the letters; final ־ֵיהּ is /ej/', () => {
  assert.equal(NACH, '|');
  assert.equal(ipa('אִיתְּ|מַ֫ר'), 'ʔitmˈaʁ');
  assert.equal(ipa('מִ֫ילְּ|תָא'), 'mˈilta');
  for (const [w, x] of [['עֲלֵיהּ', 'ʔalˈej'], ['מִנֵּהּ', 'minˈej'], ['קַמֵּיהּ', 'kamˈej'], ['רֵישֵׁיהּ', 'ʁeʃˈej']]) assert.equal(ipa(w), x, w);
});

test('tts-prep: only a qamatz yod-he is the divine name (לֵיהּ / בֵּיהּ are Aramaic)', () => {
  assert.equal(prep('לֵיהּ'), 'לֵיהּ');
  assert.equal(prep('בֵּיהּ'), 'בֵּיהּ');
  assert.equal(prep('יָהּ'), 'קָהּ');
  assert.equal(prep('בְּיָהּ'), 'בְּקָהּ');
});

const ALL = { shva: true, lexicon: true, zohar: true, rules: true, lav: true };
test('aramaic: lexicon, rules, quiescent shva, לָאו', () => {
  assert.equal(aramWord('הָכִי', 'gemara', ALL), 'הָ֫כִי');
  assert.equal(aramWord('לָאו'), 'לָו');
  assert.equal(withNach('אִיתְּמַר'), 'אִיתְּ|מַר');
  assert.equal(withNach('שֶׁבְּשַׁבָּת'), 'שֶׁבְּשַׁבָּת');   // Hebrew prefix ־שֶּׁ: no change
  assert.equal(strip(aramWord('מִתְּרֵי', 'gemara', ALL)), 'מִתְּרֵי');
  assert.ok(!aramWord('מִתְּרֵי', 'gemara', ALL).startsWith('מִ֫'));   // תְּרֵי is final-stressed
  assert.equal(aramWord('שֶׁמְּקַבְּלִים', 'prose', ALL), 'שֶׁמְּקַבְּלִים');   // Hebrew piel in Chassidus keeps its vocal shva
});

test('aramaic gate: only the groups reviewed above 9.5 are on, per source (tools/data/aramaic-speech.json)', () => {
  const cfg = JSON.parse(fs.readFileSync(root + 'tools/data/aramaic-speech.json', 'utf8'));
  assert.deepEqual(Object.fromEntries(Object.entries(cfg.sources).map(([k, g]) => [k, Object.keys(g).filter(x => g[x]).sort().join(' ')])),
    { bavli: 'lav rules zohar', yerushalmi: 'lav rules shva zohar', onkelos: 'lav shva', tanya: 'lav rules zohar', tolt: 'lav rules zohar' });
  assert.equal(aramWord('הָכִי'), 'הָכִי');                        // general lexicon (9.1): off – and the suffix rules never guess a lexicon word
  assert.equal(aramWord('אִיתְּמַר'), 'אִיתְּמַר');                 // Bavli shva (9.3): off
  assert.equal(aramSayText('אִיתְּמַר', 'gemara', { source: 'yerushalmi' }), 'אִיתְּ|מַר');   // Yerushalmi shva (9.8): on
  assert.ok(aramWord('סִטְרָא').includes('\u05AB'));                // Zohar lexicon (9.8): on
  assert.equal(aramWord('לָאו'), 'לָו');                            // lav (10): on
});

test('aramaic pass: idempotent, display letters and niqqud unchanged, Mishnah and Gemara quotations untouched', () => {
  const bsay = JSON.parse(fs.readFileSync(root + 'site/data/gemara/bsay/Bava_Batra/76a.json', 'utf8')).say;
  for (const s of bsay) { assert.equal(aramSayText(s), s, 'compiled data already carries the pass'); }
  const raw = 'אָמַר רַבָּה הָכִי אִיתְּמַר לָאו מִילְּתָא ״וְאָמַר הָכִי״';
  const once = aramSayText(raw);
  assert.equal(aramSayText(once), once);
  assert.equal(strip(once).replace('לָו', 'לָאו'), raw);
  assert.ok(once.endsWith('״וְאָמַר הָכִי״'));
  assert.equal(aramSayText(raw, 'gemara', { mishnah: true }), raw);
});

test('abbreviations 1.0.112: Chassidus table, prefixes, context rules (deployed entries only)', () => {
  const cases = [
    ['בע"ס', 'בְּעֶשֶׂר סְפִירוֹת'], ['רע"מ', 'רַעְיָא מְהֵימְנָא'],
    ['ס"פ כ"ג', 'סוֹף פֶּרֶק'], ['ע"ז אמרו', 'עַל זֶה'], ['בע"ח שער', 'בְּעֵץ חַיִּים'],
    ['י"ג ת"ד', 'תִּיקּוּנֵי דִּיקְנָא'], ['מי"ג ת"ד', 'מִשְּׁלוֹשָׁה עָשָׂר'], ['די"ג מדה"ר', 'מִדּוֹת הָרַחֲמִים'],
    ['תש"ר', 'תְּפִלִּין שֶׁל רֹאשׁ'], ['ותש"י', 'וּתְפִלִּין שֶׁל יָד'],
  ];
  const N = s => s.normalize('NFD');
  for (const [t, x] of cases) assert.ok(N(prep(t)).includes(N(x)), `${t} → ${prep(t)}`);
  assert.ok(!prep('ע"ז').includes('עַל זֶה'), 'ע״ז alone stays letter by letter');
  assert.ok(!prep('ס"פ').includes('סוֹף'), 'ס״פ without a chapter / parasha stays');
  // withdrawn at the gate (round 3 ≤ 9.5): exactly the 1.0.110 reading
  for (const t of ['חו"ב', 'מחו"ב', 'ק"נ', 'וק"נ', 'ב"ן', 'ג"פ', 'כ"כ', 'וכ"כ', 'בשנת תרפ"ז', 'ר"פ מ"ם', 'ר"פ צדי', '(דר"פ ע"ב)'])
    assert.ok(!/[\u05B0-\u05BB]{0}(חָכְמָה|קְלִיפַּת|פְּעָמִים|כָּל כָּךְ|כָּתַב|תַּרְ|אַרְבָּעִים|תִּשְׁעִים|פֶּרֶק)/.test(N(prep(t)).normalize('NFC')), `${t} → ${prep(t)}`);
  assert.equal(prep('אותיות דפ"ק'), 'אותיות דפ"ק');
  assert.equal(prep('אותיות בֵּ״ן'), 'אותיות בֵּ"ן');
});
