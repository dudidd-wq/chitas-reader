// Contextual מספר noun/verb (and closely similar ספר) fixes in Hayom Yom say/display-niqqud.
// Overrides live in tools/data/hayomyom-pronunciation.json (phrase layer); display/source letters stay untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hayomKey } from '../site/js/texts.js';
import { hayomVocalizedHtml } from '../site/js/hayomyom-display.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { textToIPA } from '../site/js/g2p.js';

const D = JSON.parse(fs.readFileSync(new URL('../site/data/hayomyom/days.json', import.meta.url)));
const O = JSON.parse(fs.readFileSync(new URL('../tools/data/hayomyom-pronunciation.json', import.meta.url)));
const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const say = key => D[key].p.map(p => p[2]).join(' ');
const bare = t => t.replace(/[\u0591-\u05C7]/g, '');
const ipaWord = (raw, letters) => {
  const trace = [];
  textToIPA(prepareForTTS(raw), { data, accents: raw, trace });
  return trace.find(t => bare(t.word) === letters)?.ipa;
};

test('today 22 Nov 2026 is 12 Kislev and uses the verb הַמְסַפֵּר, not the noun הַמִּסְפָּר', () => {
  const { key } = hayomKey('2026-11-22');
  assert.equal(key, 'kislev-12');
  assert.equal(D[key].ref, 'י"ב כסלו');
  const t = say(key);
  assert.match(bare(t), /ואם אינו אמת הלא המספר נמצא במצב לא טוב/);
  assert.match(t, /הֲלֹ֫א הַמְסַפֵּ֫ר נִמְצָ֫א/);
  assert.doesNotMatch(t, /הַמִּסְפָּ/);
  // same sentence already had the verb "שמספרים" pointed correctly
  assert.match(t, /שֶׁמְּסַפְּרִ֫ים עַל פְּלוֹנִי/);
  assert.equal(ipaWord(t, 'המספר'), 'hamsapˈeʁ');
  const para = D[key].p.find(p => /המספר/.test(p[0]));
  assert.match(hayomVocalizedHtml(para[0], para[2]), /הַמְסַפֵּר/);
  assert.doesNotMatch(hayomVocalizedHtml(para[0], para[2]), /הַמִּסְפָּר/);
});

test('clear-cut corpus fixes: מספרים “they tell” (not scissors), מספר של בינונים “from the book”, and בספרו “when he told”', () => {
  const chesh = say('cheshvan-10');
  assert.match(bare(chesh), /מספרים, שבכתב/);
  assert.match(chesh, /מְסַפְּרִ֫ים, שֶׁבִּכְתָ֫ב/);
  assert.doesNotMatch(chesh, /מִסְפָּרַ֫יִם/);
  assert.equal(ipaWord(chesh, 'מספרים'), 'mesapeʁˈim');

  const kis9 = say('kislev-9');
  assert.match(bare(kis9), /פרק נ"ג מספר של בינונים/);
  assert.match(kis9, /מִסֵּ֫פֶר שֶׁל בֵּינוֹנִ֫ים/);
  assert.doesNotMatch(kis9, /מִסְפָּ֫ר שֶׁל בֵּינוֹנִ֫ים/);
  assert.equal(ipaWord(kis9, 'מספר'), 'misˈefeʁ');

  const siv = say('sivan-28');
  assert.match(bare(siv), /הצמח צדק בספרו לבנו/);
  assert.equal([...siv.matchAll(/בְּסַפְּרוֹ֫/g)].length, 2);
  assert.doesNotMatch(siv, /בְּסִפְרוֹ/);
  assert.equal(ipaWord(siv, 'בספרו'), 'besapeʁˈo');
});

test('correct number/book readings are left unchanged', () => {
  assert.match(say('cheshvan-22'), /עַד אֵין מִסְפָּ֫ר/);
  assert.equal(ipaWord(say('cheshvan-22'), 'מספר'), 'mispˈaʁ');
  assert.match(say('nisan-18'), /דְּיֵשׁ מִסְפָּ֫ר קָבוּ֫עַ/);
  assert.match(say('shvat-23'), /לְמִסְפַּ֫ר נָשִׁ֫ים/);
  assert.match(say('iyyar-10'), /וּבְמַ֫ה מְסַפְּרִ֫ים אֶת הַ'לכם'/);
  assert.match(say('adar2-6'), /אֶת סִפְרוֹ֫ הַתַּנְיָא/);
});

test('phrase-layer overrides are contextual, and display letters stay unvocalized', () => {
  const froms = O.phrases.map(p => p.from);
  for (const s of ['הלא המספר', 'מספרים, שבכתב', 'מספר של בינונים', 'הצמח צדק בספרו לבנו']) assert.ok(froms.includes(s), s);
  assert.equal(O.words['הַמִּסְפָּר'], undefined);
  assert.equal(O.words['מִסְפָּר'], undefined);
  for (const key of ['kislev-12', 'cheshvan-10', 'kislev-9', 'sivan-28']) {
    for (const p of D[key].p) {
      if (/מספר|בספרו/.test(p[0])) assert.doesNotMatch(p[0], /[\u05B0-\u05BC\u05C7]/);
    }
  }
});
