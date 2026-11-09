// 1.0.87: shin/sin dots and shuruq / vav for the local voice (speech only – the displayed text is not changed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { wordToIPA, textToIPA, fixShinVav, shinVavKey } from '../site/js/g2p.js';
import { SHIN_VAV_LEX } from '../site/js/shin-vav-lex.js';
import { audit, auditAfter } from '../tools/shin-vav-audit.mjs';
import { dataHash } from '../tools/data-version.mjs';

const root = new URL('../', import.meta.url).pathname;
const data = JSON.parse(fs.readFileSync(root + 'site/voice/stress-he.json'));
const letters = w => w.replace(/[^\u05D0-\u05EA]/g, '');

const CASES = {
  // sin / shin
  'שָׂרָה': 'saʁˈa', 'יִשְׂרָאֵל': 'jisʁaʔˈel', 'עֹשֶׂה': 'ʔosˈe', 'שָׁלוֹם': 'ʃalˈom', 'וּמִשְׂנְאָיו': 'umisneʔˈav', 'עָשׂוּ': 'ʔasˈu',
  // Siddur: the sin dot encoded as a holam on ש
  'יִשְֹרָאֵל': 'jisʁaʔˈel', 'לְשָֹשֹוֹן': 'lesasˈon',
  // missing shin/sin dot or vav mark, restored from the same word elsewhere in the app's texts (or a reviewed entry)
  'אֲשֶר': 'ʔaʃˈeʁ', 'בָּרוךְ': 'baʁˈuχ', 'לְעולָם': 'leʔolˈam', 'אולָּם': 'ʔulˈam', 'הַיְּהודִּים': 'hajehudˈim', 'וְשחְתָּ': 'vesaχtˈa',
  // shuruq vs consonant vav vs holam male
  'צִוָּה': 'tsivˈa', 'מִצְוָה': 'mitsvˈa', 'הוּא': 'hˈu', 'וְהָיָה': 'vehajˈa', 'וּבְכָל': 'uvχˈol', 'חַוָּה': 'χavˈa', 'שׁוּב': 'ʃˈuv',
  'מִצְוֺת': 'mitsvˈot', 'עָוֹן': 'ʔavˈon', 'עֲוֹנוֹת': 'ʔavonˈot', 'צִוִּיתִי': 'tsivitˈi', 'קַוִּין': 'kavˈin', 'מְצַוְּךָ': 'metsaveχˈa',
  'כַּוָּנָה': 'kavanˈa', 'וְהַנּורָא': 'vehanoʁˈa', 'חַטֹּאותָי': 'χatoʔtˈaj',
};
test('1.0.87: shin/sin, shuruq and vav – real words read right', () => {
  const bad = Object.entries(CASES).map(([w, e]) => [w, wordToIPA(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
});
test('1.0.87: whole sentences through textToIPA (stress data, accents)', () => {
  const t = textToIPA('וְשָׂרָה עָשְׂתָה שָׁלוֹם בְּיִשְׂרָאֵל, הוּא צִוָּה עַל הַמִּצְוָה, וְעָוֹן לֹא הָיָה', { data });
  for (const p of ['vesaʁˈa', 'ʃalˈom', 'bejisʁaʔˈel', 'hˈu', 'tsivˈa', 'hamitsvˈa', 'veʔavˈon']) assert.ok(t.includes(p), p + ' in ' + t);
  const s = textToIPA('פָּרִ֫ים הַנִּשְֹרָפִים שְׁחִיטָתָ֫ן בַּצָּפוֹ֫ן, לְשָֹשֹוֹן', { data });
  assert.ok(s.includes('hanisʁafˈim') && s.includes('lesasˈon') && !/ʃo/.test(s), s);
});
test('1.0.87: fixShinVav changes only marks, keeps letters and cantillation, leaves unvocalised words alone', () => {
  for (const w of ['וּשְֹעִירִים', 'מִצְוֺ֣ת', 'בָּרוךְ', 'אֲשֶ֫ר', 'שָׁלוֹם']) {
    const f = fixShinVav(w);
    assert.equal(letters(f), letters(w));
    assert.equal(f.replace(/[^\u0591-\u05AF]/g, ''), w.replace(/[^\u0591-\u05AF]/g, ''));
  }
  for (const w of ['ישראל', 'משה', 'עשו', 'אולם']) assert.equal(fixShinVav(w), w);
  assert.ok(!fixShinVav('יִשְֹרָאֵל').includes('\u05B9') && fixShinVav('יִשְֹרָאֵל').includes('\u05C2'));
});
test('1.0.87: lexicon entries keep the letters and are reached by their key', () => {
  assert.ok(Object.keys(SHIN_VAV_LEX).length >= 90);
  for (const [k, v] of Object.entries(SHIN_VAV_LEX)) { assert.equal(letters(v), letters(k), k); assert.equal(shinVavKey(k), k); }
});
test('1.0.87: lexicon is what tools/build-shin-vav-lex.mjs builds from the current texts', () => {
  const out = execFileSync('node', [root + 'tools/build-shin-vav-lex.mjs', '--check'], { encoding: 'utf8' });
  assert.match(out, /"inSync":true/);
});
test('1.0.87: display untouched – data hash unchanged, no display module uses the voice fix', () => {
  assert.equal(dataHash(), fs.readFileSync(root + 'site/sw.js', 'utf8').match(/DATA_VERSION = '(\w+)'/)[1]);
  for (const f of ['app.js', 'texts.js', 'niqqud.js', 'hayomyom-display.js', 'tefila.js', 'layout.js'])
    assert.doesNotMatch(fs.readFileSync(root + 'site/js/' + f, 'utf8'), /fixShinVav|shin-vav-lex/, f);
  const sw = fs.readFileSync(root + 'site/sw.js', 'utf8');
  assert.match(sw, /VERSION = '1\.0\.87'/); assert.match(sw, /'js\/shin-vav-lex\.js'/);
});
test('1.0.87: corpus audit – undotted ש in vocalised words before/after', async () => {
  const b = audit(), a = await auditAfter();
  assert.ok(b.total['shin-undotted'] >= 1000, 'before ' + b.total['shin-undotted']);
  assert.ok((a.total['shin-undotted'] || 0) <= 20, 'after ' + a.total['shin-undotted']);
  // every vav pattern that used to be misread is now voiced as a consonant v (sample of the most frequent words)
  for (const k of ['vav-holam-haser', 'vav-consonant-holam', 'vav-dagesh-hiriq-qubuts', 'vav-dagesh-shva'])
    for (const [w] of a.examples[k].slice(0, 10)) assert.match(wordToIPA(w.replace(/[\u0591-\u05AF]/g, '')), /v/, k + ' ' + w);
});
