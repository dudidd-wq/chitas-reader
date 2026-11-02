// Round-3 finding (SHOULD): source-edition niqqud typos in the Rambam (לִהִתְגַּיֵּר, שִׁאוֹסֵר …) are corrected from a
// source-checked list, applied as an overlay; the rest of the scan is published as flags only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyErrata } from '../site/js/texts.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const R = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const E = JSON.parse(R('site/data/rambam-errata.json'));
const N = s => s.normalize('NFC');
const cons = s => s.replace(/[\u0591-\u05C7]/g, '');
const halacha = ref => { const [, slug, c, s] = ref.match(/^(.+)\.(\d+)\.(\d+)$/); return JSON.parse(R(`site/data/rambam/${slug}/${c}.json`)).s[s - 1]; };
const skip = !CHROME && 'no Chrome';
const DATE_11_4 = '2027-01-07'; // Rambam 3 chapters: Kings 10–12

test('every erratum changes niqqud only, applies to its halacha, and leaves no source form behind', () => {
  let n = 0;
  for (const [ref, list] of Object.entries(E.fixes)) {
    const src = halacha(ref);
    const { text, applied } = applyErrata(src, list);
    assert.equal(applied.length, list.length, `${ref}: not every fix applied`);
    for (const f of list) {
      if (f.kind === 'text') { assert.ok(f.sources.length >= 2, `${ref}: a text fix needs two sources`); assert.ok(N(text).includes(f.to)); continue; }
      assert.equal(cons(f.from), cons(f.to), `${ref}: consonants changed`);
      assert.notEqual(f.from, f.to);
      assert.ok(!N(text).includes(f.from) || f.to.includes(f.from), `${ref}: ${f.from} still present`);
      assert.ok(N(text).includes(f.to));
      if (!ref.startsWith('Transmission_of_the_Oral_Law')) assert.equal(f.wikisourceConsonants, true, `${ref}: not checked against Wikisource`);
      n++;
    }
    if (!list.some(f => f.kind === 'text')) assert.equal(cons(N(text)), cons(N(src)), `${ref}: consonantal text changed`);
  }
  assert.equal(n, E.meta.fixes);
});

test('the reviewer\'s two examples are in the list; known-good forms are not', () => {
  const all = Object.values(E.fixes).flat();
  assert.ok(E.fixes['Forbidden_Intercourse.14.1'].some(f => f.from === N('לִהִתְגַּיֵּר') && f.to === N('לְהִתְגַּיֵּר')));
  assert.ok(E.fixes['Forbidden_Foods.12.1'].some(f => f.from === N('שִׁאוֹסֵר') && f.to === N('שֶׁאוֹסֵר')));
  for (const ok of ['וְשֶׁמִּן', 'לְהִתְפַּלַּל']) assert.ok(!all.some(f => f.from.includes(N(ok))), ok);
});

test('applyErrata leaves text untouched when there is nothing to fix', () => {
  assert.deepEqual(applyErrata('אֶלָּא', undefined), { text: 'אֶלָּא', applied: [] });
  assert.deepEqual(applyErrata('אֶלָּא', [{ from: 'xyz', to: 'abc' }]), { text: 'אֶלָּא', applied: [] });
});

test('scan outputs are committed with their counts, and the SW precaches the errata', () => {
  const q = JSON.parse(R('verification/rambam-niqqud-flags.json')).meta, w = JSON.parse(R('verification/rambam-ws-mismatches.json')).meta;
  assert.ok(q.wordsFlagged > 0 && w.halachot > 10000);
  assert.deepEqual(E.meta.scans.niqqud, q);
  const sw = R('site/sw.js');
  assert.match(sw, /'data\/rambam-errata\.json'/);
  assert.match(sw, /rambam-errata\\\.json\$/);
  assert.match(R('verification/RAMBAM-ERRATA.md'), /31 fixes in 24 halachot/);
  const g = JSON.parse(R('verification/rambam-gap-scan.json')).meta;
  assert.deepEqual(E.meta.scans.gaps, g);
  assert.equal(g.unreviewed, 0); assert.equal(g.confirmedGapsOpen, 0);
});

test('reader shows the corrected words and a correction line; Sources page shows the counts', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/r/rambam3/2027-04-08'); await p.waitForSelector('.seg');
    const body = N(await p.evaluate(() => document.querySelector('#doc, main, body').textContent));
    assert.ok(body.includes(N('לְהִתְגַּיֵּר')));
    const fx = N(await p.textContent('#doc-fixes'));
    assert.ok(!body.replace(fx, '').includes(N('לִהִתְגַּיֵּר')), 'typo still shown in the text');
    assert.match(N(await p.textContent('#doc-fixes')), new RegExp(N('לִהִתְגַּיֵּר ← לְהִתְגַּיֵּר')));
    await p.goto(srv.url + '#/sources'); await p.waitForFunction(() => document.querySelector('#rambam-errata-counts')?.textContent);
    assert.match(await p.textContent('#rambam-errata-counts'), /תוקנו 31 טעויות ניקוד ב־24 הלכות, ותיקון נוסח אחד \(מלכים יא, ד\)/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

// Round-5 finding (MUST): Kings 11:4 lacked "וניצח כל האומות שסביביו" and showed the censored print in parentheses.
test('Kings 11:4 shows the full text (two sources), without the censored parenthesis', () => {
  const src = halacha('Kings_and_Wars.11.4');
  const { text, applied } = applyErrata(src, E.fixes['Kings_and_Wars.11.4']);
  assert.equal(applied.length, 1);
  assert.ok(N(text).includes(N('אִם עָשָׂה וְהִצְלִיחַ וְנִצֵּחַ כָּל הָאֻמּוֹת שֶׁסְּבִיבָיו וּבָנָה מִקְדָּשׁ בִּמְקוֹמוֹ')));
  assert.ok(!text.includes('('), 'a parenthesis is left');
  assert.ok(!N(text).includes(N('וִיתַקֵּן')), 'the censored-print sentence is still there');
  assert.ok(N(text).endsWith(N('מָשִׁיחַ בְּוַדַּאי:')));
});

test('reader: Kings 11:4 (Rambam 3, 2027-01-07) shows the text fix line', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/r/rambam3/' + DATE_11_4); await p.waitForSelector('.seg');
    const body = N(await p.evaluate(() => document.querySelector('#doc, main, body').textContent));
    assert.ok(body.includes(N('וְנִצֵּחַ כָּל הָאֻמּוֹת שֶׁסְּבִיבָיו')));
    assert.match(await p.textContent('#doc-fixes'), /תיקון נוסח/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
