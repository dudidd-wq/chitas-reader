// The siddur: table of contents, search, the reader, the divine-name setting, the home "תפילה עכשיו" card, insertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, progressOf } from './helpers.mjs';
import { insertions, insertionLines, suggest, chanukahDay, omerDay } from '../site/js/tefila.js';
import { computeZmanim, cityById } from '../site/js/zmanim.js';

const idx = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/index.json', import.meta.url)));

test('insertions follow the calendar (Israel and the Diaspora)', () => {
  const L = (iso, o) => insertionLines(insertions(iso, o), o.il).join(' | ');
  assert.match(L('2026-11-02', { il: true }), /משיב הרוח.*ותן טל ומטר/);          // 22 Cheshvan, Israel
  assert.match(L('2026-11-02', { il: false }), /ותן ברכה \(חוץ/);                // Diaspora: not yet
  assert.match(L('2027-12-05', { il: false, evening: true }), /ותן טל ומטר/);      // Diaspora: from the evening of 5 Dec before 2028 (leap)
  assert.match(L('2027-12-04', { il: false, evening: true }), /ותן ברכה/);
  assert.match(L('2026-10-25', { il: true, evening: true }), /טל ומטר/);          // Israel: from Maariv of 7 Cheshvan (evening of 6 Cheshvan)
  assert.match(L('2027-04-21', { il: true }), /טל ומטר/);                          // 14 Nisan: still
  assert.doesNotMatch(L('2027-04-21', { il: true }), /עננו/);                      // the fast of the firstborn has no Anenu
  assert.match(L('2027-04-22', { il: true }), /יעלה ויבוא.*משיב הרוח עד מוסף/);   // 15 Nisan
  assert.match(L('2027-04-24', { il: true }), /^יעלה ויבוא \(חול המועד\) \| מוריד הטל/);
  assert.match(L('2026-10-03', { il: true }), /ממוסף – משיב הרוח/);                // Shemini Atzeret
  assert.match(L('2026-12-11', { il: true }), /יעלה ויבוא \(ראש חודש\).*על הניסים \(חנוכה, יום 7\)/);
  assert.match(L('2027-03-23', { il: true }), /על הניסים \(פורים\)/);
  assert.match(L('2027-08-12', { il: true }), /עננו/);                             // Tisha B'Av
  assert.equal(chanukahDay(insertions('2026-12-05').hd), 1);
  assert.equal(omerDay(insertions('2027-04-23', { evening: true }).hd), 2);
});
test('7 Cheshvan in Israel – exact boundary', () => {
  // 7 Cheshvan 5787 = Sat 17 Oct 2026, so its Maariv is on Friday evening (Shabbat: no ותן line at all) – use 5788
  const before = insertions('2027-11-06', { il: true }), at = insertions('2027-11-06', { il: true, evening: true });
  assert.equal(before.hd.getDate() + ' ' + before.tal, '6 false');
  assert.equal(at.hd.getDate() + ' ' + at.tal, '7 true');
});
test('the suggestion follows the time of day and the kind of day', () => {
  const pl = cityById('jerusalem'), at = (iso, h) => suggest(iso, computeZmanim(iso, pl, {}), new Date(`${iso}T${h}:00+02:00`).getTime(), { il: true });
  assert.deepEqual(at('2026-11-02', '08').items.map(i => i.book), ['boker', 'shacharit']);
  assert.equal(at('2026-11-02', '13').items[0].book, 'mincha');
  assert.deepEqual(at('2026-11-02', '19').items.map(i => i.book), ['maariv', 'shema']);
  assert.ok(at('2026-11-06', '18').items.some(i => i.book === 'kabbalat' && i.n === 2));          // Friday night
  assert.ok(at('2026-11-07', '19').items.some(i => i.book === 'shabbatbook' && i.n === 6));        // Motzei Shabbat: havdalah
  assert.ok(at('2026-12-11', '08').items.some(i => i.book === 'rc' && i.n === 1));                 // Rosh Chodesh + Chanukah: Hallel
  assert.ok(at('2026-12-04', '18').items.some(i => i.book === 'chanukah'));
  assert.ok(at('2026-09-12', '08').notes.some(n => /ראש השנה/.test(n)));
  for (const s of [at('2026-11-02', '08'), at('2026-11-06', '18'), at('2026-12-11', '08')]) for (const i of s.items) assert.ok(idx.books.find(b => b.id === i.book)?.secs[i.n - 1], `${i.book}/${i.n}`);
});

let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

test('table of contents, search and reader', async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/siddur');
  await p.waitForSelector('.sd-toc a');
  const n = await p.locator('.sd-toc a').count();
  assert.equal(n, idx.books.reduce((a, b) => a + b.secs.length, 0));
  await p.fill('#sd-q', 'ובא לציון');
  await p.waitForFunction(() => /נמצאו/.test(document.querySelector('#sd-st').textContent), null, { timeout: 30000 });
  assert.ok(await p.locator('.sd-hits a').count() >= 1);
  await p.fill('#sd-q', 'ברוך אתה ה׳ מגן אברהם');
  await p.waitForFunction(() => /נמצאו/.test(document.querySelector('#sd-st').textContent), null, { timeout: 30000 });
  await p.goto(srv.url + '#/s/shacharit/1');
  await p.waitForSelector('#rc .seg');
  const t = await p.locator('#rc').innerText();
  assert.match(t, /יְהֹוָה/);
  assert.doesNotMatch(t.replace(/חַיֵּי|יַיִן/g, ''), /(^|[\s־])[ובכלמשד]?[\u05B0-\u05BC]*יְ?יָ?(?=[\s׃,.:;]|$)/m);
  assert.match(await p.locator('#b-nextunit').innerText(), /לחלק הבא/);
  assert.equal(await p.locator('.r-top a.btn').getAttribute('href'), '#/siddur');
  await p.click('#b-nextunit');
  // 1.0.55: the reader holds the whole seder, so "next" leads to the next seder (מנחה), and the last section is done
  await p.waitForFunction(() => location.hash === '#/s/mincha/1');
  const prog = await progressOf(p);
  assert.ok(prog['siddur|shacharit/7']?.done);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
test('divine name: ה׳ setting app-wide, TTS unaffected', async () => {
  const p = await pageWith(browser, srv.url, { prefs: { divine: 'abbr' } });
  await p.goto(srv.url + '#/s/shacharit/3');
  await p.waitForSelector('#rc .seg');
  const t = await p.locator('#rc').innerText();
  assert.doesNotMatch(t, /יְהֹוָה|יהוה/);
  assert.match(t, /ה׳/);
  const html = await p.locator('#rc .seg .t').first().innerHTML();
  assert.ok(/class="dn"/.test(await p.locator('#rc').innerHTML()));
  assert.ok(html.length > 0);
  await p.goto(srv.url + '#/r/tehillim/2026-11-02');
  await p.waitForSelector('#rc .seg');
  assert.doesNotMatch(await p.locator('#rc').innerText(), /יְהֹוָה|יְהוָה/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
test('home: the prayer card links into the siddur', async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url);
  await p.waitForSelector('.tefila .tf-list a');
  const href = await p.locator('.tefila .tf-list a').first().getAttribute('href');
  assert.match(href, /^#\/s\/[a-z]+\/\d+$/);
  assert.ok(await p.locator('.home-foot a[href="#/siddur"]').count());
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
