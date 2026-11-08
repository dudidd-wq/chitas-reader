// Phase 2 lessons (opt-in): the Rebbe's daily Sefer HaMitzvot (schedule checked against Chabad.org) and the daily
// Torah Or / Likkutei Torah lesson by the "מורה שיעור" luach (Kinus HaShluchim; = torahor.app's fixed table), by parasha week.
// Off by default, so the chitas + Rambam home stays as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { dayPlan } from '../site/js/calendar.js';
import { toltLabel } from '../site/js/texts.js';
import { DEFAULT_PREFS } from '../site/js/store.js';
const skip = !CHROME && 'no Chrome';
const site = new URL('../site/', import.meta.url).pathname;
const json = p => JSON.parse(fs.readFileSync(site + 'data/' + p, 'utf8'));

// Chabad.org "Daily Mitzvah - Sefer Hamitzvot" lesson text -> the same item list as calendar.mitzvot()
function chabadItems(s) {
  const out = [];
  if (/Introduction/.test(s)) return [{ k: 'intro' }];
  if (/^Principle /.test(s)) { const n = s.replace('Principle ', '').split(/,\s*/).map(Number); return [{ k: 'S', from: n[0], to: n.at(-1) }]; }
  for (const part of s.replace(/; and /g, ' and ').split(/;\s*/)) {
    const m = part.match(/^(Positive|Negative) Commandment (.*)$/);
    if (m) for (const n of m[2].split(/,\s*/)) out.push({ k: m[1][0] === 'P' ? 'P' : 'N', n: +n });
    else if (part === 'Conclusion') out.push({ k: 'conclusion' });
    else out.push({ k: 'ref' });
  }
  return out;
}

test('Sefer HaMitzvot schedule = Chabad.org on every verified date (>= 20)', () => {
  const v = JSON.parse(fs.readFileSync(new URL('../verification/sefer-hamitzvot-chabad.json', import.meta.url), 'utf8'));
  const dates = Object.entries(v.dates); assert.ok(dates.length >= 20);
  for (const [iso, s] of dates) {
    const mine = dayPlan(iso).mitzvot.items.map(({ k, n, from, to }) => k === 'ref' ? { k } : k === 'S' ? { k, from, to } : n ? { k, n } : { k });
    // Chabad.org lists Nusach HaTefila and Order of Prayer as two items; Hebcal too
    assert.deepEqual(mine, chabadItems(s), iso);
  }
});

test('every Sefer HaMitzvot item in a full cycle has its text file (or is an honest reference)', () => {
  const idx = json('mitzvot/index.json');
  assert.deepEqual(idx, { P: 248, N: 365, S: 14 });
  const seen = { P: new Set(), N: new Set() };
  for (let t = Date.parse('2026-02-03'); t < Date.parse('2027-01-24'); t += 864e5) {
    for (const it of dayPlan(new Date(t).toISOString().slice(0, 10)).mitzvot.items) {
      if (it.k === 'P' || it.k === 'N') { seen[it.k].add(it.n); assert.ok(json(`mitzvot/${it.k}/${it.n}.json`).s.length); }
      if (it.k === 'S') for (let n = it.from; n <= it.to; n++) assert.ok(json(`mitzvot/S/${n}.json`).s.length);
    }
  }
  assert.equal(seen.P.size, 248); assert.equal(seen.N.size, 365);
});

test('lessons are opt-in; reader: Hebrew labels, honest notes, credits, axe in 4 themes, 320px, same-origin', { skip }, async () => {
  assert.equal(DEFAULT_PREFS.lessonMitzvot, false); assert.equal(DEFAULT_PREFS.lessonTolt, false); assert.ok(!('lessonChassidus' in DEFAULT_PREFS));
  const srv = await serve(), b = await launch();
  try {
    const p0 = await pageWith(b, srv.url);
    await p0.goto(srv.url + '#/settings'); await p0.waitForSelector('[name="lessonMitzvot"]');
    await p0.check('[name="lessonMitzvot"]');
    await p0.goto(srv.url + '#/d/2026-11-02'); await p0.waitForSelector('.card');
    assert.equal(await p0.$$eval('.card', x => x.length), 7);
    await p0.waitForFunction(() => /מצות עשה רמה/.test(document.body.textContent));
    assert.deepEqual(p0.errors, []);
    for (const theme of ['paper', 'sepia', 'dark', 'night']) for (const [unit, iso, re] of [
      ['mitzvot', '2026-02-02', /מצות עשה קצא.*סיום ספר המצוות.*אין לסיום קטע נפרד/s], ['mitzvot', '2026-03-09', /נוסח התפילה.*ההפניה בלבד/s],
      ['mitzvot', '2026-02-04', /שורשים א–ג.*השורש הראשון.*השורש השלישי/s],
      ['tolt', '2027-07-25', /הפרשיות מחוברות.*לקוטי תורה, מטות פא\/א · ד״ה וידבר משה.*לקוטי תורה, מטות פב\/א · אות ה, ד״ה לאמר זה הדבר.*חלוקת השיעורים: לוח המורה שיעור – כינוס השלוחים העולמי; torahor\.app – התאחדות החסידים/s]]) {
      const p = await pageWith(b, srv.url, { prefs: { theme, lessonMitzvot: true, lessonTolt: true }, viewport: { width: 320, height: 700 } });
      const foreign = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await p.goto(srv.url + `#/r/${unit}/${iso}`); await p.waitForSelector('#rc .doc-credit');
      assert.match(await p.textContent('#rc'), re, `${unit} ${iso}`);
      assert.match(await p.textContent('#rc .doc-credit'), unit === 'mitzvot' ? /ספר המצוות, ורשה.*Public Domain|נחלת הכלל/s : /תורה אור \/ לקוטי תורה: הוצאת קה״ת.*BY-NC/s);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow at 320');
      const axe = await new AxeBuilder({ page: p }).analyze();
      assert.deepEqual(axe.violations.map(v => v.id), [], `${theme} ${unit} ${iso}`);
      assert.deepEqual(foreign, []); assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});

// The luach (tools/data/tolt-luach.json, parsed from the printed "מורה שיעור" 5785) by parasha week: Sunday = day 1.
// Expected values are the printed luach, re-read by hand from the PDF for these weeks (not from our parser).
test('Torah Or / Likkutei Torah: date -> luach day (both calendars, joined weeks, chagim)', () => {
  const S = json('tolt/schedule.json');
  const at = (iso, il = true) => dayPlan(iso, { il }).tolt.parts.map(([s, d]) => toltLabel(S.weeks[s].days[d - 1])).join(' + ');
  const want = {
    '2026-10-04': 'תורה אור, בראשית א/א · ד״ה השמים כסאי',
    '2026-11-02': 'לקוטי תורה, שיר השירים טו/ב · ד״ה מדלג על ההרים',
    '2026-12-06': 'תורה אור, מקץ ל/ג · ד״ה ויהי מקץ',
    '2027-02-28': 'תורה אור, ויקהל פו/ג · ד״ה ויקהל משה',
    '2027-03-23': 'לקוטי תורה, צו י/א · ד״ה ענין שבעת ימי',
    '2027-06-11': 'לקוטי תורה, נשא כז/א · ד״ה ביאור ע"פ כה תברכו',
    '2027-07-25': 'לקוטי תורה, מטות פא/א · ד״ה וידבר משה + לקוטי תורה, מטות פב/א · אות ה, ד״ה לאמר זה הדבר',
    '2027-09-20': 'לקוטי תורה, נצבים מו/א · ד״ה כי קרוב + לקוטי תורה, נצבים מז/א · ד״ה שוש אשיש',
    '2027-09-12': 'לקוטי תורה, ראש השנה ס/ד · ד״ה להבין ענין',
  };
  for (const [iso, w] of Object.entries(want)) assert.equal(at(iso), w, iso);
  // the diaspora reads Nasso a week later in 5787: different luach weeks
  assert.match(at('2027-06-14', true), /בהעלותך ל\/ב · אות ד, ד״ה ובזה יובן/); assert.match(at('2027-06-14', false), /נשא כ\/א · ד״ה נשא את ראש/);
  // Tishrei: the week ending on Shabbat Bereshit is Bereshit from Sunday (5786: Simchat Torah mid-week, no Bereshit day skipped);
  // in 5787 there are two chag-Shabbat weeks: the first repeats Vezot (marked), the second is the Vezot week
  for (const il of [true, false]) {
    assert.deepEqual(dayPlan('2025-10-12', { il }).tolt.parts, [['bereshit', 1]]);
    assert.deepEqual(dayPlan('2025-10-05', { il }).tolt.parts, [['vezot-haberacha', 1]]);
    assert.equal(dayPlan('2026-09-20', { il }).tolt.repeat, true); assert.equal(dayPlan('2026-09-27', { il }).tolt.repeat, undefined);
    assert.deepEqual(dayPlan('2026-10-04', { il }).tolt.parts, [['bereshit', 1]]);
  }
  // every day of a full year has 1 or 2 lessons, each with a located text; the 378 luach days are all reached
  const seen = new Set();
  for (let t = Date.parse('2026-09-13'); t < Date.parse('2027-10-02'); t += 864e5) for (const il of [true, false]) {
    const tl = dayPlan(new Date(t).toISOString().slice(0, 10), { il }).tolt;
    assert.ok(tl.parts.length === 1 || tl.parts.length === 2);
    for (const [s, d] of tl.parts) { seen.add(`${s}:${d}`); assert.ok(S.weeks[s].days[d - 1].ref, `${s} ${d}`); }
  }
  assert.ok(seen.size >= 370, seen.size); // Vezot's 7 days and joined-week pairs are reached in other years
  assert.equal(S.stats.lessons, 378); assert.equal(S.stats.unmatched, 0);
  for (const f of fs.readdirSync(site + 'data/tolt/w')) for (const day of json('tolt/w/' + f).days) for (const p of day) assert.doesNotMatch(p.t, /<(?!\/?b>|span class="daf" aria-hidden="true">|\/span>)/, f);
});

test('Torah Or / Likkutei Torah: opt-in, honest About, no bundled luach or other sites\' texts', { skip }, async () => {
  assert.ok(!fs.existsSync(site + 'data/chassidus'));
  const src = json('sources.json').tolt; assert.equal(src.license, 'CC-BY-NC'); assert.equal(src.versionTitle, 'Kehot Publication Society');
  for (const f of fs.readdirSync(site, { recursive: true })) if (String(f) !== 'fonts/SBL_Font_End_User_License_Agreement.pdf') assert.doesNotMatch(String(f), /\.pdf$|morah|torahor/i);
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { lessonChassidus: true } }); // an old stored pref is ignored
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.card');
    assert.equal(await p.$$eval('.card', x => x.length), 6);
    assert.doesNotMatch(await p.textContent('main'), /תורה אור/);
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('[name="lessonTolt"]');
    await p.check('[name="lessonTolt"]');
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.card');
    assert.equal(await p.$$eval('.card', x => x.length), 7);
    await p.waitForFunction(() => /מדלג על ההרים/.test(document.body.textContent));
    await p.goto(srv.url + '#/about'); await p.waitForSelector('#tolt-about');
    assert.match(await p.textContent('#tolt-about'), /המורה שיעור.*לפי שבוע הפרשה.*מחוברות.*בלי ניקוד.*עבר לתוכנית שנתית מחושבת/s);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
