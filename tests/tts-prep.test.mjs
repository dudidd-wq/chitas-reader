import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareForTTS as P, chunkText } from '../site/js/tts-prep.js';
const H = { stress: true, divineName: 'hashem' }, A = { stress: true, divineName: 'adonai' };

test('cantillation removed, niqqud kept, sof pasuq → period, maqaf → space', () => {
  assert.equal(P('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר׃', H), 'וַיְדַבֵּר השם אֶל מֹשֶׁה לֵּאמֹר.');
  assert.doesNotMatch(P('בְּרֵאשִׁ֖ית בָּרָ֣א', H), /[\u0591-\u05AF]/);
});
test('plain mode strips niqqud as well', () => {
  assert.equal(P('בְּרֵאשִׁ֖ית בָּרָ֣א', { stress: false }), 'בראשית ברא');
});
test('Tetragrammaton per chosen rule, with prefixes', () => {
  assert.equal(P('יְהוָה', A), 'אֲדֹנָי');
  assert.equal(P('לַיהוָה', A), 'לַאֲדֹנָי');
  assert.equal(P('לַיהוָה', H), 'לַהשם');
  assert.equal(P('אֲדֹנָ֥י יֱהֹוִ֖ה', A), 'אֲדֹנָי אֱלֹהִים');
  assert.equal(P('אֲדֹנָ֥י יֱהֹוִ֖ה', H), 'אֲדֹנָי אֱלֹקִים');
  assert.equal(P("ה' אֱלֹקֵינוּ", H), 'השם אֱלֹקֵינוּ');
});
test('Elohim → Elokim only in "השם" mode', () => {
  assert.equal(P('אֱלֹהִ֑ים', H), 'אֱלֹקִים');
  assert.equal(P('אֱלֹהִ֑ים', A), 'אֱלֹהִים');
});
test('ketiv/qere: only the qere is read; section markers dropped', () => {
  assert.equal(P('וַיֹּ֣אמֶר (ויאמר) [וַיֹּאמְר֥וּ] {פ}', H), 'וַיֹּאמֶר וַיֹּאמְרוּ');
});
test('common abbreviations expanded', () => {
  assert.equal(P('הקב"ה אמר ז"ל וכו\'', H), 'הַקָּדוֹשׁ בָּרוּךְ הוּא אמר זִכְרוֹנוֹ לִבְרָכָה וְכוּלֵּי');
});
test('HTML tags and duplicated marks cleaned', () => {
  assert.equal(P('<b>מַה</b> שֶּׁכָּתַב', H), 'מַה שֶּׁכָּתַב');
  assert.equal(P('לֹֹֹֹֹא', H), 'לֹא');
});
test('chunks are ≤180 chars and keep all words', () => {
  const t = 'א'.repeat(50) + ' ' + 'ב'.repeat(50) + '. ' + 'ג '.repeat(150);
  const ch = chunkText(t, 180);
  assert.ok(ch.every(c => c.length <= 180));
  assert.equal(ch.join(' ').split(/\s+/).filter(Boolean).length, t.split(/\s+/).filter(Boolean).length);
});

// review 2: ה׳ / ר׳ / ס״א are numerals in citations and counts, not השם / רבי / סטרא אחרא
test('numerals in citations and counts are read as numbers', () => {
  const T = { stress: false };
  assert.equal(P('שָׁמוֹר (דברים ה׳), הָלוֹךְ', T), 'שמור (דברים הֵא), הלוך'.replace(/[\u05B0-\u05C7]/g, ''));
  assert.equal(P('(מכות ה׳):', T), '(מכות הא):');
  assert.equal(P('(שמואל ב ה׳:כ״ד)', T), '(שמואל ב הא:כ"ד)');
  assert.equal(P('(סנהדרין ס״א):', T), '(סנהדרין סמך אלף):');
  assert.equal(P('בְּעָמוֹס סוֹף סִימָן ה׳. פֵּירוּשׁ', T), 'בעמוס סוף סימן הא. פירוש');
  assert.equal(P('יִתְעַנֶּה ס״א תַּעֲנִיּוֹת', T), 'יתענה ששים ואחת תעניות');
  assert.equal(P('הרי שהיה המסלול ר׳ מעלות.', T), 'הרי שהיה המסלול מאתים מעלות.');
  assert.equal(P('וכן אם תהיה מנת ר׳ תהיה', T), 'וכן אם תהיה מנת מאתים תהיה');
  assert.equal(P('והריני בן ה׳ שנים', T), 'והריני בן חמש שנים');
});
test('the same tokens keep their word reading elsewhere', () => {
  const T = { stress: false };
  assert.equal(P('כִּי חֵלֶק ה׳ עַמּוֹ', T), 'כי חלק השם עמו');
  assert.equal(P('ושער ה׳. וחכמים', T), 'ושער השם. וחכמים');
  assert.equal(P('(ואם ירצה ה׳ נלך)', T), '(ואם ירצה השם נלך)');
  assert.equal(P('יִגְדַּל נָא כֹּחַ ה׳. לעשות', T), 'יגדל נא כח השם. לעשות');
  assert.equal(P('לבוא לפני ה׳:', T), 'לבוא לפני השם:');
  assert.equal(P('אמר ר׳ יוחנן', T), 'אמר רבי יוחנן');
  assert.equal(P('לְעוּמַּת ס״א וּקְלִיפּוֹת', T), 'לעומת סטרא אחרא וקליפות');
});
test('gematria and number words', async () => {
  const { gematria, numberWords } = await import('../site/js/tts-prep.js');
  assert.equal(gematria("ה'"), 5); assert.equal(gematria('ס"א'), 61); assert.equal(gematria('ט"ו'), 15); assert.equal(gematria('קס"ה'), 165);
  assert.equal(gematria('א"ס'), 0); assert.equal(gematria('הוי"ה'), 0);
  assert.equal(numberWords(200).replace(/[\u05B0-\u05C7]/g, ''), 'מאתים');
  assert.equal(numberWords(61).replace(/[\u05B0-\u05C7]/g, ''), 'ששים ואחת');
  assert.equal(numberWords(165).replace(/[\u05B0-\u05C7]/g, ''), 'מאה ששים וחמש');
  assert.equal(numberWords(15).replace(/[\u05B0-\u05C7]/g, ''), 'חמש עשרה');
});

// round 3 SHOULD 1–2: inverted nun is not sent to the engine; any numeral after דף/פרק/סימן/עמוד… is expanded
test('inverted nun (U+05C6) is stripped; citation numerals after a unit word are read as numbers/letter names', async () => {
  const T = { stress: false };
  const fs = await import('node:fs');
  const ps107 = JSON.parse(fs.readFileSync(new URL('../site/data/tehillim/107.json', import.meta.url))).v;
  for (const v of [23, 24, 25, 26, 27, 28, 40]) { const out = P(ps107[v - 1], T); assert.ok(!out.includes('\u05C6'), `Ps 107:${v}`); assert.ok(!/^\s/.test(out)); }
  assert.ok(ps107.some(v => v.includes('\u05C6')), 'fixture still has the mark');
  assert.equal(P('(דַּף רכ"ט עַמּוּד ב\')', T), '(דף מאתים עשרים ותשע עמוד בית)');
  assert.equal(P('בְּפֶרֶק כ"ג', T), 'בפרק עשרים ושלוש');
  assert.equal(P('סִימָן קס"ה וְעוֹד', T), 'סימן מאה ששים וחמש ועוד');
  assert.equal(P('הֲלָכָה י"ב', T), 'הלכה שתים עשרה');
  assert.equal(P('פֶּרֶק א\'', T), 'פרק אלף');
  assert.equal(P('בְּעָמוֹס סוֹף סִימָן ה׳. פֵּירוּשׁ', T), 'בעמוס סוף סימן הא. פירוש');
  assert.equal(P('וְהָיָה כ"ג', T), 'והיה כ"ג', 'a numeral in running text without a unit word is left alone');
});

test('round 3: Rashi headwords are read with the verse\'s vowels when they are the verse\'s words', async () => {
  const { vowelHeadword } = await import('../site/js/tts-prep.js');
  const fs = await import('node:fs');
  const g23 = JSON.parse(fs.readFileSync(new URL('../site/data/torah/Genesis/23.json', import.meta.url)));
  // full match, cantillation removed, explanation untouched
  const nf = x => x.normalize('NFC');
  const V = (a, b) => nf(vowelHeadword(a, b));
  const r = V(g23.r[1][0], g23.v[1]);
  assert.ok(r.startsWith(nf('<b>בְּקִרְיַת אַרְבַּע.</b> עַל שֵׁם')), r);
  assert.doesNotMatch(r.match(/<b>(.*?)<\/b>/)[1], /[\u0591-\u05AF]/);
  // with the "רש״י" label span in front, and maqaf-joined verse words
  assert.equal(V('<span class="lbl">רש״י </span><b>ויבא אברהם.</b> מִבְּאֵר שֶׁבַע:', g23.v[1]), nf('<span class="lbl">רש״י </span><b>וַיָּבֹא אַבְרָהָם.</b> מִבְּאֵר שֶׁבַע:'));
  // "וגו'" stays; the Name stays as written (ה'); plene spelling in Rashi matches a defective verse word
  assert.equal(V('<b>ותפקחנה וגו\'.</b> x', 'וַתִּפָּקַ֨חְנָה֙ עֵינֵ֣י'), nf('<b>וַתִּפָּקַחְנָה וגו\'.</b> x'));
  assert.equal(V('<b>כאשר צוה ה\'.</b> x', 'כַּאֲשֶׁ֛ר צִוָּ֥ה יְהֹוָ֖ה'), nf('<b>כַּאֲשֶׁר צִוָּה ה\'.</b> x'));
  assert.equal(V('<b>ארץ המוריה.</b> x', 'אֶ֖רֶץ הַמֹּרִיָּ֑ה'), nf('<b>אֶרֶץ הַמֹּרִיָּה.</b> x'));
  // not the verse's words: unchanged
  assert.equal(V('<b>דבר אחר.</b> x', 'וַיְהִ֣י'), nf('<b>דבר אחר.</b> x'));
  // coverage across the Torah: at least 90% of headwords get vowels
  let tot = 0, ch = 0;
  for (const b of ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']) for (const f of fs.readdirSync(new URL(`../site/data/torah/${b}`, import.meta.url))) {
    const d = JSON.parse(fs.readFileSync(new URL(`../site/data/torah/${b}/${f}`, import.meta.url)));
    d.r.forEach((rs, i) => rs.forEach(x => { tot++; if (vowelHeadword(x, d.v[i]) !== x) ch++; }));
  }
  assert.ok(ch / tot > 0.9, `${ch}/${tot}`);
});
