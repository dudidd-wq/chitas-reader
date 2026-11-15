// 1.0.122: shuruk vs consonant vav – shva na after prefix וּ and after holam male; הוֹוֶה not swallowed.
// Words are from the Chumash and Tanya lessons of 15–16 Nov 2026 (today / tomorrow when the bug was reported).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wordToIPA, textToIPA } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const il = w => wordToIPA(w, null, data, { havara: 'israeli' });
const ash = w => wordToIPA(w, null, data, { havara: 'chabad' });

// Prefix shuruk + shva (today's Chumash / Tanya, tomorrow's Chumash): the shva is na, so "u" is its own syllable.
const PREFIX = {
  'וּלְזַרְעֶךָ': 'ulezaʁʔeχˈa',   // Gen 28:13
  'וּבְזַרְעֶךָ': 'uvezaʁʔeχˈa',   // Gen 28:14
  'וּשְׁמַרְתִּיךָ': 'uʃemaʁtiχˈa', // Gen 28:15
  'וּבְכָל': 'uveχˈol',
  'וּלְךָ': 'uleχˈa',
  'וּלְהַשִּׂיג': 'ulehasˈiɡ',     // Tanya KA 4:19
  'וּדְבֵיקוּת': 'udevekˈut',      // Tanya KA 4:21
  'וּבְלִי': 'uvelˈi',             // Tanya KA 4:21
  'וּרְחִימוּ': 'uʁeχimˈu',        // Tanya KA 4:19
  'וּבְשָׂרִי': 'uvesaʁˈi',        // Gen 29:14
  'וּלְלָבָן': 'ulelavˈan',        // Gen 29:16 (identical letters already made the shva na)
};

// Holam male + shva (Rashi on today's / tomorrow's Chumash)
const HOLAM = {
  'יוֹרְדִים': 'joʁedˈim',         // Rashi Gen 28:12
  'יוֹצְאִים': 'jotseʔˈim',        // Rashi Gen 28:12
  'אוֹמְרִים': 'ʔomeʁˈim',         // Rashi Gen 29:17
  'רוֹבְצִים': 'ʁovetsˈim',        // Rashi Gen 29:7
};

// Double vav: holam male + consonant vav with its own vowel (Rashi Gen 29:3)
const HOVE = { 'הוֹוֶה': 'hovˈe', 'הַהוֹוֶה': 'hahovˈe' };

// Regressions: 1.0.87 shuruk / consonant vav / word-internal shuruk left as nach
const KEEP = {
  'הוּא': 'hˈu', 'צִוָּה': 'tsivˈa', 'מִצְוָה': 'mitsvˈa', 'מִצְוֹת': 'mitsvˈot', 'מִצְוֺת': 'mitsvˈot',
  'מִצְווֹת': 'mitsvot', 'עָוֹן': 'ʔavˈon', 'לְלַוּוֹתוֹ': 'lelavotˈo', 'בָּרוּךְ': 'baʁˈuχ',
  'וְהָיָה': 'vehajˈa', 'נוּקְבָא': 'nukvˈa', 'קוּרְבָה': 'kuʁvˈa', 'סוּכְלְתָנוּ': 'suχletanˈu',
};

test('1.0.122: prefix shuruk + shva is na (today/tomorrow Chumash and Tanya)', () => {
  const bad = Object.entries(PREFIX).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
});

test('1.0.122: holam male + shva is na (Rashi on those lessons)', () => {
  const bad = Object.entries(HOLAM).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
});

test('1.0.122: הוֹוֶה is ho-ve, not a swallowed vo', () => {
  const bad = Object.entries(HOVE).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
});

test('1.0.122: earlier shuruk/vav readings and internal shuruk+shva stay put', () => {
  const bad = Object.entries(KEEP).map(([w, e]) => [w, il(w), e]).filter(([, a, e]) => a !== e);
  assert.deepEqual(bad, []);
});

test('1.0.122: Ashkenazi/Chabad keeps the new syllables, only the havara vowels change', () => {
  assert.equal(ash('וּבְזַרְעֶךָ'), 'uvezaʁeχˈo');
  assert.equal(ash('הוֹוֶה'), 'hejvˈe');
  assert.equal(ash('יוֹרְדִים'), 'jejʁedˈim');
  assert.equal(ash('וּבְכָל'), 'uveχˈol');
  assert.equal(ash('הוּא'), 'hˈu');
});

test('1.0.122: lesson sentences through prepareForTTS + textToIPA (Israeli)', () => {
  const run = t => textToIPA(prepareForTTS(t, { stress: true, divineName: 'hashem' }), { data, havara: 'israeli' });
  const a = run('לְךָ אֶתְּנֶנָּה וּלְזַרְעֶךָ.');
  assert.ok(/ulezaʁʔˈ?eχˈ?a/.test(a), a);
  const b = run('וְנִבְרְכוּ בְךָ כָּל מִשְׁפְּחֹת הָאֲדָמָה וּבְזַרְעֶךָ.');
  assert.ok(/uvezaʁʔˈ?eχˈ?a/.test(b), b);
  const c = run('וּשְׁמַרְתִּיךָ בְּכֹל אֲשֶׁר תֵּלֵךְ.');
  assert.ok(/uʃemaʁtˈ?iχˈ?a/.test(c), c);
  const d = run('עוֹלִים תְּחִלָּה וְאַחַר כָּךְ יוֹרְדִים. אֵין יוֹצְאִים חוּצָה.');
  assert.ok(d.includes('joʁedˈim') && d.includes('jotseʔˈim'), d);
  const e = run('כָּל לְשׁוֹן הוֹוֶה מִשְׁתַּנֶּה.');
  assert.ok(e.includes('hovˈe') && !e.includes('hvo'), e);
  const f = run('אַךְ עַצְמִי וּבְשָׂרִי אָתָּה.');
  assert.ok(f.includes('uvesaʁˈi'), f);
  const g = run('וּלְהַשִּׂיג מַהוּתָן וְעַצְמוּתָן, וּדְבֵיקוּת, וּבְלִי הַשָּׂגָה.');
  assert.ok(g.includes('ulehasˈiɡ') && g.includes('udevekˈut') && g.includes('uvelˈi'), g);
});
