// Written Pnei Moshe punctuation rules (stage 6) and letter/niqqud identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  punctuateComment, transferPunct, stripPunct, hebrewLetters, lettersFromDisplay, RULES_REV,
} from '../tools/lib-punct-pnei.mjs';

test('punct-pnei rules rev is set', () => {
  assert.equal(RULES_REV, 'pnei-punct-s6-r1f3');
});

test('R1–R4: בתמיה + כלומר get period/comma without changing letters', () => {
  const src = 'מותר בתמיה כלומר דלא דמיא להא:';
  const { text, insertions } = punctuateComment(src);
  assert.equal(text, 'מותר. בתמיה. כלומר, דלא דמיא להא:');
  assert.equal(stripPunct(text), stripPunct(src));
  const rules = insertions.map(i => i.rule).sort().join(',');
  assert.equal(rules, 'R1,R2,R4'); // R3 shares the R2 index and is deduped
});

test('R3: period before כלומר after וכו׳', () => {
  const src = "שלש שנים קציר וכו' כלומר שלש שנים יקצור:";
  const { text } = punctuateComment(src);
  assert.equal(text, "שלש שנים קציר וכו'. כלומר, שלש שנים יקצור:");
  assert.equal(stripPunct(text), stripPunct(src));
});

test('do not double punctuation that is already present', () => {
  const src = 'מותר. בתמיה. כלומר, דלא דמיא:';
  const { text, insertions } = punctuateComment(src);
  assert.equal(text, src);
  assert.equal(insertions.length, 0);
});

test('do not touch 1.0.107-style already punctuated gloss', () => {
  const src = '<b>מיושן</b>. צריך ליתן משל שלש שנים, משנה דקודם אשתקד:';
  const { text, insertions } = punctuateComment(src);
  assert.equal(text, src);
  assert.equal(insertions.length, 0);
});

test('skip alreadyShipped comments entirely', () => {
  const src = 'מותר בתמיה כלומר דלא:';
  const { text, insertions } = punctuateComment(src, { alreadyShipped: true });
  assert.equal(text, src);
  assert.equal(insertions.length, 0);
});

test('do not match כלומר inside a longer word or HTML tag', () => {
  const src = 'אין כאן כלום רבתי ובתוך <b>כלומר</b> זה לא:';
  const { text, insertions } = punctuateComment(src);
  assert.equal(insertions.length, 0);
  assert.equal(text, src);
});

test('וכלומר gets the same gloss punctuation', () => {
  const src = 'קרט לשון משקל הוא וכלומר שהוא מכוון:';
  const { text } = punctuateComment(src);
  assert.equal(text, 'קרט לשון משקל הוא. וכלומר, שהוא מכוון:');
});

test('letters and niqqud stay identical when transferring to pointed say', () => {
  const display = 'מותר בתמיה כלומר דלא דמיא:';
  const { text } = punctuateComment(display);
  const say = 'מוּתָּר בתמיה כלומר דלא דמיא:';
  const tr = transferPunct(text, say);
  assert.equal(tr.ok, true);
  assert.equal(tr.say, 'מוּתָּר. בתמיה. כלומר, דלא דמיא:');
  assert.equal(hebrewLetters(tr.say), hebrewLetters(say));
  assert.equal(lettersFromDisplay(text), hebrewLetters(tr.say));
});

test('transfer leaves say unchanged when letters differ', () => {
  const display = 'מותר בתמיה כלומר דלא:';
  const { text } = punctuateComment(display);
  const say = 'מוּתָּר בתמיה כלומר דלא היא:';
  const tr = transferPunct(text, say);
  assert.equal(tr.ok, false);
  assert.equal(tr.say, say);
});

test('transfer keeps existing ole / niqqud and only inserts missing marks', () => {
  const display = "וכו' כלומר שלש:";
  const { text } = punctuateComment(display);
  assert.equal(text, "וכו'. כלומר, שלש:");
  const say = "וכוּ' כְּלוֹמַ֫ר שלש:"; // ole already on כלומר
  const tr = transferPunct(text, say);
  assert.equal(tr.ok, true);
  assert.match(tr.say, /כְּלוֹמַ֫ר,/);
  assert.match(tr.say, /וכוּ'\./);
  assert.equal(hebrewLetters(tr.say), hebrewLetters(say));
  assert.ok(tr.say.includes('\u05AB'));
});

test('HTML lemmas: punctuation is not inserted inside tags', () => {
  const src = '<b>שנים ישראל ואחד כהן.</b> שהיו מהלכין כלומר לכבדו:';
  const { text } = punctuateComment(src);
  assert.equal(text, '<b>שנים ישראל ואחד כהן.</b> שהיו מהלכין. כלומר, לכבדו:');
  assert.ok(text.startsWith('<b>שנים ישראל ואחד כהן.</b>'));
  assert.equal(stripPunct(text), stripPunct(src));
});

test('R1/R3 see the period already inside a <b> lemma and do not punctuate גמ׳/מתני׳', () => {
  const src = "גמ' <b>הכא את אמר הגיעו וכו'.</b> כלומר דפריך הא ברישא:";
  const { text, insertions } = punctuateComment(src);
  assert.equal(text, "גמ' <b>הכא את אמר הגיעו וכו'.</b> כלומר, דפריך הא ברישא:");
  assert.ok(!text.startsWith("גמ'."));
  assert.deepEqual(insertions.map(i => i.rule), ['R4']);
});

test('R3 does not put a period after אלא before כלומר', () => {
  const src = 'וכל העדות לאו דוקא אלא כלומר רוב העדות וכדאמרן:';
  const { text } = punctuateComment(src);
  assert.equal(text, 'וכל העדות לאו דוקא אלא כלומר, רוב העדות וכדאמרן:');
  assert.ok(!text.includes('אלא.'));
});

test('R1/R2 do not split בלשון בתמיה מיתפרשא', () => {
  const src = 'שאין ודאה דוחה את לילי י"ט בלשון בתמיה מיתפרשא וכי ודאה דוחה:';
  const { text, insertions } = punctuateComment(src);
  assert.equal(text, src);
  assert.equal(insertions.length, 0);
});

test('R2 does not split בתמיה קאמר or בתמיה הוא', () => {
  const a = punctuateComment("<b>לקטן לשלחן ביד אחר וכו'.</b> בתמיה קאמר וסיומא דמילתיה:");
  assert.equal(a.text, "<b>לקטן לשלחן ביד אחר וכו'.</b> בתמיה קאמר וסיומא דמילתיה:");
  const b = punctuateComment('<b>אמר ר\' יונה לא אמר אלא קדשים קלים.</b> בתמיה הוא וכלומר כדלהלן:');
  assert.equal(b.text, '<b>אמר ר\' יונה לא אמר אלא קדשים קלים.</b> בתמיה הוא. וכלומר, כדלהלן:');
  assert.ok(!b.text.includes('בתמיה. הוא'));
});

test('R2 does not split לשון בתמיה כפולה היא', () => {
  const src = '<b>אלא יוליך את הכסף מבני ידעיה אצל בני יהויריב.</b> לשון בתמיה כפולה היא וכלומר דעוד יש לך לומר:';
  const { text } = punctuateComment(src);
  assert.equal(text, '<b>אלא יוליך את הכסף מבני ידעיה אצל בני יהויריב.</b> לשון בתמיה כפולה היא. וכלומר, דעוד יש לך לומר:');
  assert.ok(!text.includes('בתמיה.'));
});

test('R1 does not put a period after וכלו׳ (abbrev of וכלומר) before בתמיה', () => {
  const src = 'וכך היא הגי\' בפ"ק דר"ה סוף הלכה ב\' וכלו\' בתמיה ואם כחומרי ר"ג ור"א נהוג בו:';
  const { text } = punctuateComment(src);
  assert.equal(text, 'וכך היא הגי\' בפ"ק דר"ה סוף הלכה ב\' וכלו\' בתמיה. ואם כחומרי ר"ג ור"א נהוג בו:');
  assert.ok(!text.includes("וכלו'."));
  // וכו' (etc.) may still take a period before בתמיה
  const b = punctuateComment("אם אמר הן חסר וכו' בתמיה וכי סבורים:");
  assert.equal(b.text, "אם אמר הן חסר וכו'. בתמיה. וכי סבורים:");
});
