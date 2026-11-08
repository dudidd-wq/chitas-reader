// Shulchan Aruch HaRav – "Rav Yomi" luach (third cycle, second year: 24 Tevet 5786 – 23 Tevet 5787), data/ravyomi.
// The luach is fixed per civil day; the text is the vocalized Kehot edition on Sefaria (CC BY-NC).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
import { HDate } from '../site/js/vendor/hebcal.js';

const skip = !CHROME && 'no Chrome';
const site = new URL('../site/', import.meta.url).pathname;
const json = p => JSON.parse(fs.readFileSync(site + 'data/' + p, 'utf8'));
const S = json('ravyomi/schedule.json');
const sim = n => json(`ravyomi/s/${n}.json`);

test('Rav Yomi: every day of the luach year once, contiguous, every seif exists (3 documented exceptions)', () => {
  assert.equal(S.first, '2026-01-13'); assert.equal(S.last, '2027-01-02');
  assert.equal(new HDate(new Date(S.first + 'T12:00')).toString(), '24 Tevet 5786');
  assert.equal(new HDate(new Date(S.last + 'T12:00')).toString(), '23 Tevet 5787');
  const iso = Object.keys(S.days).sort(); assert.equal(iso.length, 355);
  for (let i = 1; i < iso.length; i++) assert.equal(Date.parse(iso[i]) - Date.parse(iso[i - 1]), 864e5, iso[i]);
  const n = s => sim(s).s.length, next = s => S.simanim[S.simanim.indexOf(s) + 1];
  let prev = null; const exceptions = [];
  for (const k of iso) {
    const d = S.days[k];
    if (d.ref) { exceptions.push(k + ' ref'); continue; }
    for (const [si, se] of [d.f, d.t]) assert.ok(se >= 1 && se <= n(si), `${k} ${si}:${se}`);
    if (prev) {
      const w = x => typeof x[2] === 'string' ? x[2] : '', mid = w(prev) && prev[3] !== 1;
      const exp = mid ? [prev[0], prev[1]] : prev[1] < n(prev[0]) ? [prev[0], prev[1] + 1] : [next(prev[0]), 1];
      if (d.f[0] !== exp[0] || d.f[1] !== exp[1] || !!w(d.f) !== !!mid) exceptions.push(k + ' gap');
    }
    prev = d.t;
  }
  assert.deepEqual(exceptions, ['2026-06-28 gap', '2026-10-18 ref']);
  assert.match(S.days['2026-06-28'].gap, /סעיפים ח–י/);
  assert.match(S.days['2026-11-15'].fix, /רסו/); assert.deepEqual(S.days['2026-11-15'].t, [266, 21]);
  assert.equal(Object.values(S.days).filter(d => d.fix).length, 1);
});

test('Rav Yomi: luach = the lessons printed in "Dvar Malchus" (Vayera + Chayei Sarah 5787, 14 days)', () => {
  const dm = { // first and last seif of each day's lesson as printed in Dvar Malchus
    '2026-10-25': [[262, 4], [263, 1]], '2026-10-26': [[263, 2], [263, 6]], '2026-10-27': [[263, 7], [263, 8]], '2026-10-28': [[263, 9], [263, 10]],
    '2026-10-29': [[263, 11], [263, 11]], '2026-10-30': [[263, 12], [263, 14]], '2026-10-31': [[263, 15], [263, 20]],
    '2026-11-01': [[263, 21], [263, 24]], '2026-11-02': [[263, 25], [264, 2]], '2026-11-03': [[264, 3], [264, 7]], '2026-11-04': [[264, 8], [264, 14]],
    '2026-11-05': [[264, 15], [265, 1]], '2026-11-06': [[265, 2], [265, 5]], '2026-11-07': [[265, 6], [265, 7]],
  };
  for (const [k, [f, t]] of Object.entries(dm)) { assert.deepEqual(S.days[k].f.slice(0, 2), f, k); assert.deepEqual(S.days[k].t.slice(0, 2), t, k); }
});

test('Rav Yomi: vocalized Kehot text, licence, only allowed markup, nothing else bundled', () => {
  const src = json('sources.json').ravyomi;
  assert.equal(src.license, 'CC-BY-NC'); assert.equal(src.versionTitle, 'Vocalized Edition - Kehot Publication Society');
  assert.deepEqual(S.simanim.filter(n => !fs.existsSync(site + `data/ravyomi/s/${n}.json`)), []);
  let all = 0, voc = 0;
  for (const n of S.simanim) for (const se of sim(n).s) for (const p of se) {
    assert.doesNotMatch(p, /<(?!\/?b>)/, String(n));
    all++; if (/[\u05B0-\u05BC]/.test(p)) voc++;
  }
  assert.ok(voc / all > 0.99, `${voc}/${all} vocalized`); // the rest are short printer's remarks in brackets
  for (const f of fs.readdirSync(site, { recursive: true })) if (String(f) !== 'fonts/SBL_Font_End_User_License_Agreement.pdf') assert.doesNotMatch(String(f), /\.pdf$|rav-?yomi-luach/i);
});

test('Rav Yomi: opt-in, reader, honest notes, outside the luach year, About', { skip }, async () => {
  assert.equal(DEFAULT_PREFS.lessonRavYomi, false);
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.card');
    assert.equal(await p.$$eval('.card', x => x.length), 6);
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('[name="lessonRavYomi"]'); await p.check('[name="lessonRavYomi"]');
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.card');
    assert.equal(await p.$$eval('.card', x => x.length), 7);
    await p.waitForFunction(() => /סימן רסג סעיף כה – סימן רסד סעיף ב/.test(document.body.textContent));
    for (const theme of ['paper', 'night']) for (const [iso, re] of [
      ['2026-11-02', /סימן רסג.*כה.*סימן רסד.*חלוקת השיעורים: לוח ״רב יומי״/s],
      ['2026-01-14', /סימן קנח.*מסתיים באמצע סעיף ג, במילים ״ביד״/s],
      ['2026-06-28', /סעיפים ח–י אינם מופיעים בלוח/], ['2026-11-15', /תיקון בלוח.*רסו/s],
      ['2026-10-18', /הלכות שהיה והטמנה בקצרה.*ההפניה בלבד/s], ['2027-03-01', /רק לשנה שמ־כ״ד טבת תשפ״ו/],
    ]) {
      const q = await pageWith(b, srv.url, { prefs: { theme, lessonRavYomi: true }, viewport: { width: 320, height: 700 } });
      const foreign = []; q.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await q.goto(srv.url + `#/r/ravyomi/${iso}`); await q.waitForSelector('#rc .doc-credit');
      assert.match(await q.textContent('#rc'), re, iso);
      assert.match(await q.textContent('#rc .doc-credit'), /שולחן ערוך הרב: הוצאת קה״ת, מהדורה מנוקדת.*BY-NC/s, iso);
      assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), iso + ' 320px');
      const ax = await new AxeBuilder({ page: q }).include('#rc').analyze(); assert.deepEqual(ax.violations.map(v => v.id), [], `${theme} ${iso}`);
      assert.deepEqual(foreign, []); assert.deepEqual(q.errors, []); await q.close();
    }
    await p.goto(srv.url + '#/about'); await p.waitForSelector('#ravyomi-about');
    assert.match(await p.textContent('#ravyomi-about'), /רב יומי.*מנוקדת.*BY-NC.*355.*ח–י.*רסו.*שהיה והטמנה.*דבר מלכות/s);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
