// 1.0.227 (A4): ambiguous abbreviations ז״א / ת״ת – context or unit, otherwise letter names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareForTTS as P, ABBREVIATIONS } from '../site/js/tts-prep.js';

const H = { divineName: 'hashem' };

test('A4: ז״א and ת״ת are not a single global expansion in ABBREVIATIONS', () => {
  assert.equal(ABBREVIATIONS['ז"א'], undefined);
  assert.equal(ABBREVIATIONS['ת"ת'], undefined);
  // leftover duplicates of unambiguous keys were removed
  const keys = Object.keys(ABBREVIATIONS);
  assert.equal(keys.filter(k => k === 'ב"ה').length, 1);
  assert.equal(keys.filter(k => k === 'יחו"ע').length, 1);
});

test('A4: in Torah Or / Tanya, ז״א is Zeir Anpin (with prefixes); a “כלומר זאת אומרת” hedge is not guessed', () => {
  assert.match(P('המידות דז״א', { ...H, unit: 'tolt' }), /דְּזְעֵיר אַנְפִּין/);
  assert.match(P('יסוד ז״א דאצילות', { ...H, unit: 'tolt' }), /זְעֵיר אַנְפִּין/);
  assert.match(P('כתר לז״א', { ...H, unit: 'tanya' }), /לִזְעֵיר אַנְפִּין/);
  // no unit, but a ד prefix is the same cue toltContext used
  assert.match(P('דז״א'), /דְּזְעֵיר אַנְפִּין/);
  const hedge = P('ז״א כלומר זאת אומרת', { ...H, unit: 'tolt' });
  assert.doesNotMatch(hedge, /זְעֵיר אַנְפִּין/);
  assert.doesNotMatch(hedge, /זֹאת אוֹמֶרֶת/);
  const paren = P('ז״א (כלומר זאת אומרת)', { ...H, unit: 'tolt' });
  assert.doesNotMatch(paren, /זְעֵיר אַנְפִּין/);
  assert.doesNotMatch(paren, /זֹאת אוֹמֶרֶת/);
});

test('A4: Nach / Rashi-style לז״א is “this means”; short-biur kabbalah stays Zeir Anpin', () => {
  assert.match(P('ולז״א הלא כתבתי לך', { ...H, unit: 'nachyomi' }), /לְזֹאת אוֹמֶרֶת/);
  assert.match(P('גם ז״א אינו משתנה בגודלו והמוחין דיניקה', { ...H, unit: 'tolt' }), /זְעֵיר אַנְפִּין/);
});

test('A4: Kabbalah cues do not fire across word boundaries or on ordinary words in ZOT units', () => {
  for (const [text, unit] of [
    ['אינו קונה ז״א', 'rambam1'],
    ['בא בארץ ז״א', 'chumash'],
    ['מלכות דוד לז״א', 'nachyomi'],
    ['מדות טובות ז״א', 'rambam3'],
    ['ז״א', 'mitzvot'],
    ['ז״א', 'ravyomi'],
  ]) {
    const s = P(text, { ...H, unit });
    assert.doesNotMatch(s, /זְעֵיר אַנְפִּין/, `${unit}: ${text}`);
    assert.match(s, /זֹאת אוֹמֶרֶת/, `${unit}: ${text}`);
  }
});

test('A4: ת״ת is Talmud Torah or Tiferet only with a positive cue; otherwise letter names', () => {
  assert.match(P('ות״ת כנגד כולם', { ...H, unit: 'dafyomi' }), /תַּ?לְמוּד תּוֹרָה/);
  assert.match(P('ואח״כ מצות ת״ת והכל חובת הגוף', { ...H, unit: 'tolt' }), /תַּ?לְמוּד תּוֹרָה/);
  assert.match(P('הארץ קדמה לשמים שהוא ת״ת בשרשה', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  assert.match(P('ת״ת דאימא נעשה כתר', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  const bare = P('ת״ת', H);
  assert.doesNotMatch(bare, /תַּ?לְמוּד תּוֹרָה/);
  assert.doesNotMatch(bare, /תִּ?פְאֶרֶת/);
});

test('A4: ת״ת ד… is Tiferet only in Kabbalah; dafyomi stays letter names; הוא ת״ת ד wins over מצות', () => {
  const daf = P('ת״ת דאורייתא', { ...H, unit: 'dafyomi' });
  assert.doesNotMatch(daf, /תִּ?פְאֶרֶת/);
  assert.doesNotMatch(daf, /תַּ?לְמוּד תּוֹרָה/);
  assert.match(P('מצות הוא ת״ת דקרבנות', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  assert.match(P('השמים שהוא בחינת ת״ת', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  // production tolt unit (the no-unit ARAM4 fixture may keep letter names here)
  assert.match(P('ות״ת דקרבנות', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  assert.match(P('ות״ת שבחסד', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
});

test('A4: with no unit and no cue, ז״א is read as letter names, not “זאת אומרת”', () => {
  const s = P('ז״א', H);
  assert.doesNotMatch(s, /זֹאת אוֹמֶרֶת/);
  assert.doesNotMatch(s, /זְעֵיר אַנְפִּין/);
});

test('A4: display letters are not in play – prepareForTTS only changes the speech string', () => {
  // a control: an unambiguous abbreviation still expands in speech only
  assert.match(P('הקב"ה', H), /הַקָּדוֹשׁ בָּרוּךְ הוּא/);
});

test('A4: unresolved ז״א / ת״ת / לז״א are letter names, never a number (800 / 8 / 38)', () => {
  for (const [text, unit] of [['ת״ת ספירות', 'tolt'], ['ת״ת מדות', 'tolt'], ['ת״ת', undefined]]) {
    const s = P(text, unit ? { ...H, unit } : H);
    assert.match(s, /תָּו תָּו/, text);
    assert.doesNotMatch(s, /שְׁמוֹנֶה מֵאוֹת|שְׁמוֹנַת/, text);
  }
  const za = P('ז״א מדות', H);
  assert.match(za, /זַיִן אָלֶף/);
  assert.doesNotMatch(za, /שְׁמוֹנֶ[הה]|שְׁמוֹנָה|שְׁמוֹנֶה/);
  const lz = P('לז״א', H);
  assert.match(lz, /לְזַיִן אָלֶף/);
  assert.doesNotMatch(lz, /לָמֶד/);
  assert.doesNotMatch(lz, /שְׁלוֹשִׁים/);
  const hedge = P('לז״א כלומר זאת אומרת', { ...H, unit: 'tolt' });
  assert.match(hedge, /לְזַיִן אָלֶף/);
  assert.doesNotMatch(hedge, /זְעֵיר אַנְפִּין/);
  assert.doesNotMatch(hedge, /זֹאת אוֹמֶרֶת/);
});

test('A4: a nearby מצות does not override ת״ת ד… or שבחסד in Torah Or', () => {
  assert.match(P('בכל המצות ות״ת דקרבנות', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  assert.match(P('המצות ות״ת שבחסד', { ...H, unit: 'tolt' }), /תִּ?פְאֶרֶת/);
  // juxtaposition and the classic phrase still read Talmud Torah
  assert.match(P('ואח״כ מצות ת״ת והכל חובת הגוף', { ...H, unit: 'tolt' }), /תַּ?לְמוּד תּוֹרָה/);
  assert.match(P('ות״ת כנגד כולם', { ...H, unit: 'dafyomi' }), /תַּ?לְמוּד תּוֹרָה/);
});
