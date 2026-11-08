// Torah Or / Likkutei Torah: the niqqud of Chassidut Behirah (tools/cb-niqqud, verification/CHASSIDUT-BEHIRAH.md).
// The vocalised text must be letter-for-letter the Kehot/Sefaria text: niqqud is taken only on words whose letters match,
// a paragraph is flagged nq only when it passed, and every other paragraph is the Kehot text as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { impossible, fixWord } from '../site/js/niqqud.js';
import { divineName } from '../site/js/divine.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';
const R = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const NIQ = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const strip = s => s.replace(NIQ, '');
const dir = 'site/data/tolt/w/';
const weeks = fs.readdirSync(new URL('../' + dir, import.meta.url)).map(f => [f, JSON.parse(R(dir + f))]);
const ATTR = 'נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד';
const PERM = 'לפי דיווח בעל האתר, אושר ע״י חסידות בהירה וקה״ת, לשימוש לא מסחרי בלבד';

test('every vocalised paragraph is the verified Kehot text with niqqud added (hash of the letters), others carry no niqqud', () => {
  let nq = 0, all = 0;
  for (const [f, w] of weeks) for (const day of w.days) for (const p of day || []) {
    all++;
    if (!p.nq) { assert.doesNotMatch(p.t, NIQ, f); assert.equal(p.h, undefined); continue; }
    nq++;
    assert.equal(crypto.createHash('sha1').update(strip(p.t)).digest('hex').slice(0, 12), p.h, `${f}: letters differ from the Kehot text`);
  }
  assert.ok(nq / all > 0.95, `${nq}/${all}`);
});

test('no impossible or repairable word, no mark on a final letter other than ך, no niqqud inside an abbreviation', () => {
  for (const [f, w] of weeks) for (const day of w.days) for (const p of day || []) {
    if (!p.nq) continue;
    const t = p.t.replace(/<[^>]+>/g, ' ');
    for (const wd of t.match(/[\u05D0-\u05EA][\u05D0-\u05EA\u05B0-\u05C7]*/g) || []) {
      if (!/[\u05B0-\u05C7]/.test(wd)) continue;
      assert.ok(!impossible(wd), `${f}: ${wd}`);
      assert.deepEqual(fixWord(wd)[1], [], `${f}: ${wd}`);
      assert.doesNotMatch(wd, /[םןףץ][\u05B0-\u05C7]/, `${f}: ${wd}`);
      assert.doesNotMatch(wd, /[\u05C1\u05C2](?<![ש][\u05BC\u05B0-\u05BB\u05C7]*[\u05C1\u05C2])/, `${f}: ${wd}`);
    }
    // Kehot abbreviations (ר״ת with ׳ ״ ' ") are left exactly as in the edition
    for (const ab of t.match(/[\u05D0-\u05EA\u05B0-\u05C7]+["'״׳][\u05D0-\u05EA\u05B0-\u05C7]*/g) || []) assert.doesNotMatch(ab, NIQ, `${f}: ${ab}`);
  }
});

test('divine names in the vocalised text follow the existing settings (display and read-aloud)', () => {
  const t = 'וְהִנֵּה ה\' אֱלֹהֶיךָ הוּא הָאֱלֹקִים, הוי\' אֱלֹקִים';
  assert.equal(divineName(t, 'full'), t); assert.equal(divineName(t, 'abbr'), t); // Kehot writes ה׳ / הוי׳ / אלקים: unchanged
  assert.match(prepareForTTS(t, { stress: true, divineName: 'hashem' }), /הַשֵּׁם אֱלֹקֶיךָ/);
  assert.match(prepareForTTS(t, { stress: true, divineName: 'adonai' }), /אֲדֹנָי אֱלֹהֶיךָ/);
  // the same words unvocalised are read the same way
  assert.match(prepareForTTS('ה\' אלהיך', { stress: true, divineName: 'hashem' }), /הַשֵּׁם אלקיך/);
});

test('attribution and permission wording: Sources data, README, LICENSE-DATA, THIRD-PARTY-NOTICES, verification; no claim of a written licence', () => {
  const src = JSON.parse(R('site/data/sources.json')).tolt;
  assert.equal(src.license, 'CC-BY-NC');
  assert.equal(src.niqqud.versionTitleInHebrew, 'נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה');
  assert.equal(src.niqqud.permission, PERM); assert.equal(src.niqqud.versionSource, 'https://chassidutbehirah.com/');
  for (const f of ['README.md', 'site/data/LICENSE-DATA.md', 'site/THIRD-PARTY-NOTICES.txt', 'verification/CHASSIDUT-BEHIRAH.md', 'site/js/texts.js', 'site/js/app.js']) {
    const s = R(f);
    assert.ok(s.includes(ATTR), `${f}: attribution`); assert.ok(s.includes('chassidutbehirah.com'), `${f}: link`);
    if (f !== 'site/js/texts.js') assert.ok(s.includes(PERM), `${f}: permission wording`);
    assert.doesNotMatch(s, /רישיון בכתב שהתקבל|written licen[cs]e (was )?(granted|received)/i, f);
  }
  for (const f of fs.readdirSync(new URL('../site/', import.meta.url), { recursive: true })) if (String(f) !== 'fonts/SBL_Font_End_User_License_Agreement.pdf') assert.doesNotMatch(String(f), /\.pdf$/i);
});

test('reader: a Torah Or lesson is shown vocalised with the attribution and link', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { lessonTolt: true } });
    await p.goto(srv.url + '#/r/tolt/2026-11-02'); await p.waitForSelector('.seg');
    const body = await p.textContent('body');
    assert.ok(body.includes(ATTR), 'attribution');
    assert.ok(await p.$('a[href="https://chassidutbehirah.com/"]'), 'link');
    assert.ok((body.match(/[\u05B0-\u05BC]/g) || []).length > 1000, 'vocalised');
    assert.match(await p.textContent('.doc-credit'), /ניקוד: נוסח מנוקד: חסידות בהירה/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
