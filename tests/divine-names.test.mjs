// Round-1 review: divine-name substitution must not touch names that do not refer to God,
// and must follow one consistent rule for יָהּ / אֵל / אֱלוֹהַּ; ע"ה only after a name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { CHOL } from '../site/js/chol.js';
const H = { stress: true, divineName: 'hashem' }, A = { stress: true, divineName: 'adonai' };
const N = x => x.normalize('NFC');
const re = r => new RegExp(N(r.source));
const has = (t, r, m) => assert.match(N(t), re(r), m);
const hasnt = (t, r) => assert.doesNotMatch(N(t), re(r));
const verse = (book, c, v) => {
  const f = book === 'Psalms' ? `site/data/tehillim/${c}.json` : `site/data/torah/${book}/${c}.json`;
  const ref = `${book} ${c}:${v}`;
  return prepareForTTS(JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url))).v[v - 1], { ...H, chol: CHOL[ref] });
};

test('אֱלֹהִים אֲחֵרִים (Ex 20:3, Deut 5:7) and other idol collocations are not substituted', () => {
  for (const [b, c, v] of [['Exodus', 20, 3], ['Deuteronomy', 5, 7]]) {
    const t = verse(b, c, v);
    has(t, /אֱלֹהִים אֲחֵרִים/); hasnt(t, /אֱלֹקִים/);
  }
  has(verse('Exodus', 20, 20), /אֱלֹהֵי כֶסֶף וֵאלֹהֵי זָהָב/);
  has(verse('Genesis', 35, 2), /אֱלֹהֵי הַנֵּכָר/);
  has(verse('Exodus', 12, 12), /אֱלֹהֵי מִצְרַיִם/);
});
test('verse-specific chol list: idols, judges (Ex 32:4, Ex 22:8, Ps 82:1 second, Deut 7:16 mixed)', () => {
  has(verse('Exodus', 32, 4), /אֵלֶּה אֱלֹהֶיךָ יִשְׂרָאֵל/);
  hasnt(verse('Exodus', 22, 8), /אֱלֹקִים|הָאֱלֹקִים/);
  const ps = verse('Psalms', 82, 1); has(ps, /^.*אֱלֹקִים נִצָּב.*בְּקֶרֶב אֱלֹהִים/);
  const d = verse('Deuteronomy', 7, 16); has(d, /אֱלֹקֶיךָ/); has(d, /אֱלֹהֵיהֶם/);
  has(verse('Psalms', 115, 2), /אֱלֹקֵיהֶם/, 'Ps 115:2 "where is their God" refers to God');
});
test('ordinary holy occurrences still substituted', () => {
  has(verse('Genesis', 1, 1), /אֱלֹקִים/);
  assert.equal(prepareForTTS('אֱלֹהִים אֲחֵרִים', A), 'אֱלֹהִים אֲחֵרִים');
});
test('consistent rule for אֱלוֹהַּ, יָהּ and the noun אֵל', () => {
  has(verse('Deuteronomy', 32, 15), /אֱלוֹקַּ/);
  has(verse('Exodus', 15, 2), /קָהּ/);
  has(verse('Psalms', 68, 5), /בְּקָהּ/);
  has(verse('Genesis', 14, 18), /לְקֵל עֶלְיוֹן/);
  has(verse('Genesis', 49, 25), /מֵקֵל/);
  has(verse('Deuteronomy', 7, 9), /הָקֵל הַנֶּאֱמָן/);
  // not substituted: preposition אֶל, demonstrative הָאֵל, place name בֵּית־אֵל, "power", foreign gods
  has(verse('Genesis', 12, 1), /אֶל/);
  has(verse('Genesis', 19, 25), /הֶעָרִים הָאֵל/);
  has(verse('Genesis', 19, 8), /הָאֵל/);
  has(verse('Genesis', 28, 19), /בֵּית אֵל/);
  has(verse('Genesis', 31, 29), /לְאֵל יָדִי/);
  has(verse('Exodus', 34, 14), /לְאֵל אַחֵר/);
  has(verse('Psalms', 81, 10), /אֵל זָר/);
  // אֲדֹנָי mode reads everything as written
  assert.equal(prepareForTTS('הַלְלוּ־יָהּ', A), 'הַלְלוּ יָהּ');
  assert.equal(prepareForTTS('הַלְלוּ־יָהּ', H), 'הַלְלוּ קָהּ');
});
test('ע"ה expanded only after a name/title, not as a number or folio', () => {
  assert.equal(prepareForTTS('משה רבינו ע"ה אמר', H), 'משה רבינו עָלָיו הַשָּׁלוֹם אמר');
  assert.equal(prepareForTTS('בֶּן ע"ה שָׁנָה', H), 'בֶּן שִׁבְעִים וְחָמֵשׁ שָׁנָה'); // 1.0.64: an age is read as a number
  assert.equal(prepareForTTS('(יומא ע"ה)', H), '(יומא עַיִן הֵא)'); // 1.0.64: a folio is read by its letters
});
