// 1.0.124: read-aloud audit after the shuruk fixes – editorial notes, [qere] (ketiv),
// unvocalised Rashi mid-comment verse words, and a closed unvocalised-name lexicon.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareForTTS, fillUnvocalFromVerse } from '../site/js/tts-prep.js';
import { wordToIPA } from '../site/js/g2p.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const il = w => wordToIPA(w, null, data, { havara: 'israeli' });
const ash = w => wordToIPA(w, null, data, { havara: 'chabad' });
const P = (t, o = {}) => prepareForTTS(t, { stress: true, divineName: 'hashem', ...o });

test('1.0.124: Tanya editorial [צריך להיות] / [נוסח אחר] / manuscript notes are not read', () => {
  const t = P('הִנֵּה רְחִימוּ [אולי צריך להיות: דְּחִילוּ וּרְחִימוּ] שִׂכְלִיִּים שֶׁלָּהֶם.');
  assert.match(t, /הִנֵּה רְחִימוּ/);
  assert.match(t, /שִׂכְלִיִּים שֶׁלָּהֶם/);
  assert.doesNotMatch(t, /אולי/);
  assert.doesNotMatch(t, /צריך להיות/);
  assert.doesNotMatch(t, /דְּחִילוּ/);
  assert.equal(P('הַדָּבָר [נוסח אחר: קֵץ] הַזֶּה.'), 'הַדָּבָר הַזֶּה.');
  assert.doesNotMatch(P('א [בכתב יד ליתא] ב'), /ליתא|כתב יד/);
});

test('1.0.124: [qere] (ketiv) in Tehillim is read as the qere only', () => {
  const t = P('אַל־[יָר֖וּמוּ] (ירימו) לָ֣מוֹ סֶֽלָה׃');
  assert.match(t, /יָרוּמוּ/);
  assert.doesNotMatch(t, /ירימו/);
  // existing (ketiv) [qere] order is unchanged
  assert.equal(P('(יאשר) [וְאֻשַּׁר]'), 'וְאֻשַּׁר');
  // a bracketed word followed by a parenthetical gloss is not a ketiv/qere pair
  const gloss = P('[אַךְ] (עַל עֲבוֹדָתוֹ)');
  assert.match(gloss, /עֲבוֹדָתוֹ/);
});

test('1.0.124: unvocalised mid-comment Rashi words take the verse\'s vowels when unique', () => {
  const g30 = JSON.parse(fs.readFileSync(new URL('../site/data/torah/Genesis/30.json', import.meta.url)));
  const g29 = JSON.parse(fs.readFileSync(new URL('../site/data/torah/Genesis/29.json', import.meta.url)));
  const bayom = fillUnvocalFromVerse('וַיָּ֫סַר. לָבָ֫ן ביום ההוא:', g30.v[34]);
  assert.match(bayom, /בַּיּוֹם הַהוּא/);
  assert.doesNotMatch(bayom, /(?<![א-ת])ביום(?![א-ת])/);
  const banav = fillUnvocalFromVerse('וַיִּתֵּ֫ן. לָבָ֫ן ביד בניו:', g30.v[34]);
  assert.match(banav, /בְּיַד בָּנָיו/);
  const reuven = fillUnvocalFromVerse('וַתִּקְרָא שְׁמוֹ ראובן', g29.v[31]);
  assert.match(reuven, /רְאוּבֵן/);
  // already vocalised text, loaz, and words not in the verse stay as printed
  assert.equal(fillUnvocalFromVerse('לָבָן פיונטור"א', g30.v[34]), 'לָבָן פיונטור"א');
  assert.equal(fillUnvocalFromVerse('לָבָן', g30.v[34]), 'לָבָן');
});

test('1.0.124: closed unvocalised book and name lexicon (speech only)', () => {
  assert.match(il('יהושע'), /jehoʃuˈa|jehoʃuˈa/);
  assert.equal(il('יהושע'), 'jehoʃuˈa');
  assert.equal(il('חולין'), 'χulˈin');
  assert.equal(il('רות'), 'ʁˈut');
  assert.equal(il('שמואל'), 'ʃemuʔˈel');
  assert.equal(il('ירמיהו'), 'jiʁmejahˈu');
  assert.equal(il('ישעיהו'), 'jeʃaʔjahˈu');
  assert.equal(il('ברכות'), 'beʁaχˈot');
  assert.equal(il('איוב'), 'ʔijˈov');
  assert.equal(il('ראובן'), 'ʁeʔuvˈen');
  assert.equal(il('ותנחומא'), 'vetanχumˈa');
  // already vocalised words and short numerals are unchanged
  assert.equal(il('הוּא'), 'hˈu');
  assert.equal(il('טו'), 'tˈv');
  // ambiguous unvocalised שמות is not forced to the book name
  assert.equal(il('שמות'), 'ʃˈmt');
  // Ashkenazi also receives the lexicon (holam is realized as ey in this havara)
  assert.notEqual(ash('יהושע'), 'jˈhʃ');
  assert.match(ash('יהושע'), /ʃuˈa/);
});

test('1.0.122/123 shuruk fixes still hold after the 1.0.124 lexicon', () => {
  assert.equal(il('וּלְזַרְעֶךָ'), 'ʔulezaʁʔeχˈa');
  assert.equal(il('הוּא'), 'hˈu');
  assert.equal(il('יוֹרְדִים'), 'joʁedˈim');
  assert.equal(il('הוֹוֶה'), 'hovˈe');
});
