// Phase 2 lessons (opt-in): the Rebbe's daily Sefer HaMitzvot (schedule checked against Chabad.org) and the week's
// Torah Or / Likkutei Torah maamarim. Off by default, so the chitas + Rambam home stays as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { dayPlan } from '../site/js/calendar.js';
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

test('chassidus of the week: parsha -> Torah Or / Likkutei Torah (14 dates, both calendars)', () => {
  const idx = json('chassidus/index.json');
  const books = (iso, il = true) => dayPlan(iso, { il }).chassidus.parsha.map(p => `${p}:${(idx[p] || []).map(e => e.book).join('+') || '-'}`).join(' ');
  const want = {
    '2026-10-04': 'Bereshit:TO', '2026-10-18': 'Lech-Lecha:TO', '2026-11-02': 'Chayei Sara:TO', '2027-01-17': 'Beshalach:TO+LT', '2027-01-25': 'Yitro:TO',
    '2027-02-28': 'Vayakhel:TO', '2027-03-08': 'Pekudei:LT', '2027-03-15': 'Vayikra:LT', '2027-04-04': 'Tazria:LT', '2027-07-25': 'Matot:LT Masei:LT',
    '2027-08-29': 'Shoftim:-', '2027-09-20': 'Nitzavim:LT Vayeilech:-', '2027-09-27': "Ha'azinu:LT", '2026-10-01': 'Vezot Haberakhah:LT',
  };
  for (const [iso, w] of Object.entries(want)) assert.equal(books(iso), w, iso);
  assert.equal(books('2027-06-14', false), 'Nasso:LT'); assert.equal(books('2027-06-14', true), "Beha'alotcha:LT");
  assert.equal(books('2026-03-09'), 'Vayakhel:TO Pekudei:LT');
  // all 54 parshiot are covered except Shoftim and Vayeilech, which have no section in either book
  for (let t = Date.parse('2026-10-04'); t < Date.parse('2027-10-01'); t += 7 * 864e5)
    for (const p of dayPlan(new Date(t).toISOString().slice(0, 10)).chassidus.parsha) assert.ok(idx[p] || ['Shoftim', 'Vayeilech'].includes(p), p);
});

test('lessons are opt-in; reader: Hebrew labels, honest notes, credits, axe in 4 themes, 320px, same-origin', { skip }, async () => {
  assert.equal(DEFAULT_PREFS.lessonMitzvot, false); assert.equal(DEFAULT_PREFS.lessonChassidus, false);
  const srv = await serve(), b = await launch();
  try {
    const p0 = await pageWith(b, srv.url);
    await p0.goto(srv.url + '#/settings'); await p0.waitForSelector('[name="lessonMitzvot"]');
    await p0.check('[name="lessonMitzvot"]'); await p0.check('[name="lessonChassidus"]');
    await p0.goto(srv.url + '#/d/2026-11-02'); await p0.waitForSelector('.card');
    assert.equal(await p0.$$eval('.card', x => x.length), 7);
    await p0.waitForFunction(() => /מצות עשה רמה/.test(document.body.textContent) && /תורה אור – פרשת חיי שרה/.test(document.body.textContent));
    assert.deepEqual(p0.errors, []);
    for (const theme of ['paper', 'sepia', 'dark', 'night']) for (const [unit, iso, re] of [
      ['mitzvot', '2026-02-02', /מצות עשה קצא.*סיום ספר המצוות.*אין לסיום קטע נפרד/s], ['mitzvot', '2026-03-09', /נוסח התפילה.*ההפניה בלבד/s],
      ['mitzvot', '2026-02-04', /שורשים א–ג.*השורש הראשון.*השורש השלישי/s], ['chassidus', '2027-09-20', /לקוטי תורה – נצבים – מאמר א.*אין בספרי תורה אור ולקוטי תורה מאמרים לפרשת וילך/s]]) {
      const p = await pageWith(b, srv.url, { prefs: { theme, lessonMitzvot: true, lessonChassidus: true }, viewport: { width: 320, height: 700 } });
      const foreign = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await p.goto(srv.url + `#/r/${unit}/${iso}`); await p.waitForSelector('#rc .doc-credit');
      assert.match(await p.textContent('#rc'), re, `${unit} ${iso}`);
      assert.match(await p.textContent('#rc .doc-credit'), unit === 'mitzvot' ? /ספר המצוות, ורשה.*Public Domain|נחלת הכלל/s : /קה״ת.*BY-NC/s);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow at 320');
      const axe = await new AxeBuilder({ page: p }).analyze();
      assert.deepEqual(axe.violations.map(v => v.id), [], `${theme} ${unit} ${iso}`);
      assert.deepEqual(foreign, []); assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});
