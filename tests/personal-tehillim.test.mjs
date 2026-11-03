// "תהילים אישי" (round 8): the Chabad custom of saying the chapter of one's years (completed years + 1), from the
// Hebrew birthday; family profiles kept on the device only; the vocalised chapter text; edge cases (over 150, age-only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { HDate } from '../site/js/vendor/hebcal.js';
import { personalChapter, rebbeChapter, completedYears, hebrewBirth, cleanProfile, MAX_CHAPTER } from '../site/js/personal.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';

test('chapter = completed years + 1; changes on the Hebrew birthday (not the Gregorian one)', () => {
  const p = { greg: '2013-05-01' }; // 21 Iyar 5773
  assert.equal(hebrewBirth(p).toString(), new HDate(new Date(2013, 4, 1)).toString());
  assert.equal(personalChapter(p, '2013-05-01').chapter, 1, 'day of birth: first year → chapter 1');
  assert.equal(personalChapter(p, '2014-05-01').chapter, 1, 'the Gregorian birthday does not change the chapter');
  assert.equal(personalChapter(p, '2014-05-20').chapter, 1, 'day before the 1st Hebrew birthday');
  assert.equal(personalChapter(p, '2014-05-21').chapter, 2, '21 Iyar 5774 = 1st birthday');
  assert.equal(personalChapter(p, '2014-05-21').isBirthday, true);
  const r = personalChapter(p, '2026-11-03');
  assert.equal(r.years, 13); assert.equal(r.chapter, 14, 'bar-mitzva age 13 → chapter 14');
  assert.equal(r.next.getDate(), 21); assert.equal(r.next.getFullYear(), 5787);
  assert.equal(personalChapter(p, '2012-01-01').error, 'future');
});
test('born after sunset → the next Hebrew day', () => {
  const a = hebrewBirth({ greg: '2015-05-20' }), b = hebrewBirth({ greg: '2015-05-20', afterSunset: true });
  assert.equal(b.abs() - a.abs(), 1);
});
test("the Rebbe's chapter: 11 Nisan 5662 → chapter 125 from 11 Nisan 5786", () => {
  assert.equal(rebbeChapter('2026-03-28').chapter, 124);
  assert.equal(rebbeChapter('2026-03-29').chapter, 125);
  assert.equal(rebbeChapter('2026-11-03').chapter, 125);
});
test('Adar of a leap year and 30 Cheshvan: a birthday exists every year (Hebcal rule, flagged as unverified)', () => {
  const adar1 = { hy: 5763, hm: 12, hd: 15 }; // 15 Adar I 5763 (leap) – in a common year → 15 Adar
  const r = personalChapter(adar1, '2026-11-03');
  assert.ok(r.chapter >= 23 && r.chapter <= 25, String(r.chapter));
  const ch30 = { hy: 5770, hm: 8, hd: 30 };
  for (let y = 2020; y < 2040; y++) assert.ok(personalChapter(ch30, `${y}-12-31`).chapter > 0);
  assert.equal(completedYears(new HDate(1, 1, 5780), new HDate(29, 12, 5780)), null, 'before birth');
  assert.equal(completedYears(new HDate(1, 1, 5780), new HDate(1, 1, 5781)), 1);
});
test('over 150 has no chapter (no source found); age-only profiles', () => {
  assert.equal(personalChapter({ age: 13 }, '2026-11-03').chapter, 14);
  assert.equal(personalChapter({ age: 149 }, '2026-11-03').chapter, 150);
  const o = personalChapter({ age: 150 }, '2026-11-03'); assert.equal(o.chapter, null); assert.equal(o.over150, true);
  assert.equal(MAX_CHAPTER, 150);
});
test('cleanProfile keeps only safe fields', () => {
  assert.equal(cleanProfile({ name: '' , age: 3 }), null);
  assert.equal(cleanProfile({ name: 'a', age: -1 }), null);
  assert.equal(cleanProfile({ name: 'a', age: 300 }), null);
  assert.equal(cleanProfile({ name: 'a', greg: '1/1/2010' }), null);
  assert.equal(cleanProfile({ name: 'a', hy: 5770, hm: 14, hd: 1 }), null);
  const c = cleanProfile({ name: '<b>x</b>'.repeat(10), greg: '2010-01-01', afterSunset: 1, evil: 'x', id: 'abc' });
  assert.deepEqual(Object.keys(c).sort(), ['afterSunset', 'greg', 'id', 'name']);
  assert.equal(c.name.length, 40); assert.equal(c.afterSunset, true);
});
test('docs: the verification note lists sources and what is unverified', () => {
  const md = fs.readFileSync(new URL('../verification/PERSONAL-TEHILLIM.md', import.meta.url), 'utf8');
  for (const s of ['4779124', 'חב״דפדיה', 'לא נמצא מקור', 'קיט', 'אדר']) assert.ok(md.includes(s), s);
});

const D = '2026-11-03';
test('UI: add family profiles (date + age), chapter text, Rebbe option, delete, persistence, axe, 320px, no network', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    for (const [theme, width] of [['paper', 320], ['dark', 390], ['night', 360], ['sepia', 390]]) {
      const p = await pageWith(b, srv.url, { prefs: { theme }, viewport: { width, height: 760 } });
      const foreign = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.home-foot');
      assert.equal(await p.locator('#pt-teaser').count(), 0, 'no teaser before any profile');
      await p.click('.home-foot a[href="#/tehillim"]'); await p.waitForSelector('#pt-form');
      assert.match(await p.textContent('.pt-privacy'), /במכשיר הזה בלבד.*אינו נשלח/s);
      assert.match(await p.textContent('.pt-day'), /כ״ג במרחשוון תשפ״ז.*03\/11\/2026/s);
      await p.click('#pt-add'); assert.match(await p.textContent('#pt-err'), /שם/);
      await p.fill('#pt-name', 'יוסי'); await p.fill('#pt-greg', '2013-05-01'); await p.click('#pt-add');
      assert.match(await p.textContent('#pt-err'), /תאריך לא תקין/);
      await p.fill('#pt-greg', '01/05/2013'); await p.click('#pt-add'); await p.waitForSelector('.pt-item');
      assert.match(await p.textContent('.pt-item'), /יוסי.*פרק יד.*כ״א באייר.*13 שנים מלאות.*פרק טו מתחיל/s);
      await p.fill('#pt-name', 'שרה'); await p.click('label:has(input[name=pt-kind][value=age])'); await p.fill('#pt-age', '9'); await p.click('#pt-add');
      await p.waitForFunction(() => document.querySelectorAll('.pt-item').length === 2);
      assert.match(await p.locator('.pt-item').nth(1).textContent(), /שרה.*פרק י.*אינו מתעדכן לבד/s);
      await p.fill('#pt-name', 'סבא'); await p.fill('#pt-age', '150'); await p.click('#pt-add');
      await p.waitForFunction(() => document.querySelectorAll('.pt-item').length === 3);
      assert.match(await p.locator('.pt-item').nth(2).textContent(), /אין פרק.*לא מצאנו מקור/s);
      await p.check('#pt-rebbe');
      const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
      assert.equal(st.tehillimProfiles.length, 3); assert.equal(st.tehillimRebbe, true);
      assert.equal(st.tehillimProfiles[0].greg, '2013-05-01');
      // the chapter text, vocalised, with the divine-name setting applied
      await p.click('.pt-item a[href="#/tehillim/14"]'); await p.waitForSelector('#pt-text .pt-v');
      assert.match(await p.textContent('#pt-text-h'), /פרק יד/);
      assert.equal(await p.locator('.pt-v').count(), 7);
      assert.match(await p.textContent('.pt-verses'), /[\u05B0-\u05BC]/, 'vocalised');
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(ov <= 0, `${theme} ${width}: overflow ${ov}`);
      assert.deepEqual((await new AxeBuilder({ page: p }).analyze()).violations.map(v => v.id + ':' + v.nodes[0]?.target), [], `${theme}: axe`);
      // find any chapter
      await p.fill('#pt-go-n', '121'); await p.click('#pt-go'); await p.waitForFunction(() => /פרק קכא/.test(document.querySelector('#pt-text-h')?.textContent || ''));
      // home teaser
      await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#pt-teaser');
      assert.match(await p.textContent('#pt-teaser'), /פרק הרבי.*פרק קכה.*יוסי.*פרק יד.*שרה.*פרק י/s);
      // delete
      await p.click('#pt-teaser'); await p.waitForSelector('.pt-item');
      p.once('dialog', d => d.accept()); await p.click('.pt-del >> nth=1');
      await p.waitForFunction(() => document.querySelectorAll('.pt-item').length === 2);
      assert.doesNotMatch(await p.textContent('.pt-list'), /שרה/);
      assert.deepEqual(foreign, [], 'no external requests'); assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});
test('UI: divine-name setting applies to the chapter text; settings + about link to the page', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { divine: 'abbr' } });
    await p.goto(srv.url + '#/tehillim/14'); await p.waitForSelector('#pt-text .pt-v');
    const t = await p.textContent('.pt-verses');
    assert.ok(!/יְהוָ[֣֔]?ה/.test(t.replace(/[\u0591-\u05AF]/g, '')), 'no full Tetragrammaton in abbr mode');
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#pt-settings');
    assert.equal(await p.locator('a[href="#/tehillim"]').count() >= 1, true);
    await p.goto(srv.url + '#/about'); await p.waitForSelector('.page');
    assert.match(await p.textContent('.page'), /תהילים אישי.*נשמרים במכשיר בלבד/s);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
