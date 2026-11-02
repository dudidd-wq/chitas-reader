// Round-2 finding SHOULD 7: attribution for every bundled text and library, linked CC deeds, consistent niqqud claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const R = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const src = JSON.parse(R('site/data/sources.json'));
const skip = !CHROME && 'no Chrome';

test('Wikisource attributions point at the exact page (Chametz uMatzah ch. 9, Sefer Ahava)', () => {
  const ch9 = src.rambamChapterOverrides['Leavened and Unleavened Bread 9'];
  assert.match(decodeURIComponent(ch9.versionSource), /חמץ_ומצה,_נוסח_ההגדה$/);
  assert.equal(ch9.vocalized, false);
  for (const [k, m] of Object.entries({ ...src.rambamOverrides, ...src.rambamChapterOverrides }))
    if (/Wikisource/.test(m.versionTitle)) assert.doesNotMatch(decodeURIComponent(m.versionSource), /\/משנה_תורה_לרמב"ם$/, `${k} links the generic index page`);
});

test('bundled Hebcal: notices file names all five packages with their licences; the bundle carries a header', () => {
  const n = R('site/THIRD-PARTY-NOTICES.txt');
  for (const re of [/@hebcal\/core .* GPL-2\.0-or-later/, /@hebcal\/hdate .* GPL-2\.0-or-later/, /@hebcal\/learning .* BSD-2-Clause/, /@hebcal\/leyning .* BSD-2-Clause/, /@hebcal\/noaa .* LGPL-2\.1/,
    /Copyright \(c\) 2026, hebcal/, /Copyright \(c\) 2020, hebcal/, /GNU LESSER GENERAL PUBLIC LICENSE/]) assert.match(n, re);
  const head = R('site/js/vendor/hebcal.js').slice(0, 600);
  assert.match(head, /^\/\*! Bundle of @hebcal\/core.*@hebcal\/hdate.*@hebcal\/noaa/s);
  assert.match(head, /THIRD-PARTY-NOTICES\.txt/);
});

test('README niqqud statement matches sources.json', () => {
  const md = R('README.md');
  assert.doesNotMatch(md, /מלבד ההקדמות וספר אהבה/);
  assert.equal(src.rambamOverrides['Transmission of the Oral Law'].vocalized, true);
  assert.equal(src.rambamOverrides['Reading the Shema'].vocalized, true);
  assert.match(md, /מסירת תורה שבעל פה, קריאת שמע ותפילה – מנוקדים/);
});

test('Sources page: chapter override row, CC deed links, all Hebcal packages; About lists exactly the unvocalized parts', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/sources'); await p.waitForSelector('table.src');
    const rows = await p.$$eval('table.src tbody tr', t => t.map(r => r.textContent));
    assert.ok(rows.some(r => /חמץ ומצה, פרק ט/.test(r) && /CC BY-SA 4\.0/.test(r) && /לא מנוקד/.test(r)), 'ch. 9 row');
    const deeds = await p.$$eval('table.src a[href*="creativecommons.org/licenses/"]', a => a.length);
    assert.ok(deeds >= 10, `CC deed links: ${deeds}`);
    const txt = await p.textContent('.page');
    for (const w of ['@hebcal/hdate', '@hebcal/noaa', 'LGPL-2.1', 'Copyright (c) 2020–2026 hebcal']) assert.ok(txt.includes(w), w);
    assert.equal(await p.getAttribute('a[href="THIRD-PARTY-NOTICES.txt"]', 'href'), 'THIRD-PARTY-NOTICES.txt');
    const r = await p.request.get(srv.url + 'THIRD-PARTY-NOTICES.txt'); assert.equal(r.status(), 200);
    await p.goto(srv.url + '#/about'); await p.waitForFunction(() => document.querySelector('#unvoc-list')?.textContent);
    const list = await p.textContent('#unvoc-list');
    for (const w of ['ציצית', 'ברכות', 'מילה', 'סדר התפילה', 'מצוות עשה', 'מצוות לא תעשה', 'תוכן החיבור', 'חמץ ומצה פרק ט']) assert.ok(list.includes(w), `${w} in ${list}`);
    for (const w of ['קריאת שמע', 'תפילה ונשיאת', 'מסירת']) assert.ok(!list.includes(w), `${w} is vocalized`);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('reader credits the Wikisource chapter (Chametz uMatzah ch. 9) with a link and the CC deed', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/r/rambam3/2027-03-04'); await p.waitForSelector('.seg');
    const c = await p.$eval('.doc-credit', e => ({ t: e.textContent, links: [...e.querySelectorAll('a')].map(a => a.href) }));
    assert.match(c.t, /חמץ ומצה – פרק ט: ויקיטקסט/);
    assert.ok(c.links.some(h => decodeURIComponent(h).includes('נוסח_ההגדה')));
    assert.ok(c.links.some(h => h.includes('creativecommons.org/licenses/by-sa/4.0')));
    assert.doesNotMatch(c.t, /פרק ח/, 'ch. 8 is from the main edition');
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('.seg');
    assert.equal(await p.$('.doc-credit'), null);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
