// Round 7: the siddur's instructions in Hebrew. Every English instruction of the transcription has a Hebrew
// translation in the data; every English phrase inside a prayer line has a Hebrew replacement; the setting
// "שפת ההנחיות בסידור" (עברית – default / אנגלית / שתיהן) changes what the reader shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith } from './helpers.mjs';
import { localizeRuns, englishRuns } from '../site/js/siddur-lang.js';
import { DEFAULT_PREFS } from '../site/js/store.js';

const D = new URL('../site/data/siddur/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const table = JSON.parse(fs.readFileSync(new URL('../tools/data/siddur-he.json', import.meta.url)));
const sections = idx.books.flatMap(b => b.secs.map((_, i) => ({ id: `${b.id}/${i + 1}`, ...JSON.parse(fs.readFileSync(new URL(`${b.id}/${i + 1}.json`, D))) })));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ');
// web addresses quoted by an instruction (opensiddur.org …) are the only Latin allowed in the Hebrew
const latinLeft = h => text(h).replace(/\b[\w-]+(\.[\w-]+)*\.(org|com|net|il)\b[\w/.\-]*/g, '').match(/[A-Za-z]+/g);
const hebWords = h => (text(h).match(/[\u05D0-\u05EA][\u0591-\u05BD\u05BF-\u05C7\u05D0-\u05EA]*/g) || []).filter(w => /[\u05B0-\u05BC]/.test(w)).map(w => w.replace(/[\u0591-\u05AF\u05BD\u05C0]/g, ''));

// 1.0.61: a table block ['t', rows, cls] – its cells are blocks of their own (empty cells skipped)
const blocks = s => s.b.flatMap(b => b[0] === 't' ? b[1].flat().filter(c => c[0]) : [b]);

test('default: instructions in Hebrew', () => assert.equal(DEFAULT_PREFS.siddurLang, 'he'));

test('every English instruction has a Hebrew translation, with no English left in it', () => {
  let n = 0; const used = new Set();
  for (const s of sections) blocks(s).forEach(([t, en, he], i) => {
    if (t !== 'n') return;
    n++; used.add(en);
    const where = `${s.id} #${i}: ${text(en).slice(0, 60)}`;
    assert.ok(typeof he === 'string' && /[\u05D0-\u05EA]/.test(he), `no Hebrew for ${where}`);
    assert.equal(latinLeft(he), null, `English left in the Hebrew of ${where}`);
    assert.equal(table.notes[en], he, `the data and tools/data/siddur-he.json differ at ${where}`);
  });
  assert.equal(used.size, Object.keys(table.notes).length, 'every translation in the table is used');
  assert.ok(used.size > 900 && n >= used.size);
});

test('Hebrew quoted (vocalized) in an English instruction is kept in the translation', () => {
  const miss = [];
  for (const s of sections) blocks(s).forEach(([t, en, he]) => {
    if (t !== 'n') return;
    const h = new Set(hebWords(he));
    for (const w of hebWords(en)) if (!h.has(w)) miss.push(`${s.id}: ${w}`);
  });
  assert.deepEqual(miss, []);
});

test('every English phrase inside a prayer line or heading has a Hebrew replacement', () => {
  const left = [];
  for (const s of sections) blocks(s).forEach(([t, h]) => {
    if (t === 'n') return;
    for (const r of englishRuns(h)) if (!Object.hasOwn(idx.heRuns, r)) left.push(`${s.id}: ${r}`);
    for (const mode of ['he', 'both']) {
      const out = localizeRuns(t === 'h' ? text(h) : h, idx.heRuns, mode, { heading: t === 'h' });
      assert.equal(latinLeft(out), null, `${s.id}: ${out.slice(0, 80)}`);
    }
    assert.equal(localizeRuns(h, idx.heRuns, 'en'), h);
  });
  assert.deepEqual(left, []);
  assert.deepEqual(Object.keys(idx.heRuns).sort(), Object.keys(table.runs).filter(k => Object.hasOwn(idx.heRuns, k)).sort());
});

test('localizeRuns: inline instruction marked, headings plain, dropped duplicates leave no empty brackets', () => {
  const runs = { Cong: 'הקהל', Av: '' };
  assert.equal(localizeRuns('(Cong: אָמֵן)', runs, 'he'), '(<span class="sid-in">הקהל</span>: אָמֵן)');
  assert.equal(localizeRuns('Av אָב', runs, 'he', { heading: true }), 'אָב');
  assert.equal(localizeRuns('אָב (Av)', runs, 'both'), 'אָב');
  assert.equal(localizeRuns('<b class="x">Cong</b>', runs, 'he'), '<b class="x"><span class="sid-in">הקהל</span></b>'); // attributes untouched
});

let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
// a section with many instructions
const sec = sections.map(s => ({ id: s.id, n: blocks(s).filter(b => b[0] === 'n').length })).sort((a, b) => b.n - a.n)[0].id;

test('reader: Hebrew by default, English or both by the setting, divine name follows its setting', async () => {
  const p = await pageWith(browser, srv.url, { prefs: { divine: 'abbr' } });
  await p.goto(srv.url + '#/s/' + sec);
  await p.waitForSelector('#rc .seg');
  const notes = () => p.$$eval('#rc .sid-note', a => a.map(e => [e.lang, e.dir, e.textContent]));
  let ns = await notes();
  assert.ok(ns.length > 3);
  assert.ok(ns.every(([l, d]) => l === 'he' && d === 'rtl'));
  assert.equal(latinLeft((await p.$$eval('#rc .seg, #rc .sid-note, #rc h2, #rc h3', a => a.map(e => e.textContent).join(' ')))), null);
  assert.doesNotMatch(ns.map(x => x[2]).join(' '), /יְהֹוָה|יהוה/);
  // switch in the display sheet
  await p.click('#b-aa');
  await p.click('label:has(input[name="siddurLang"][value="both"])');
  await p.waitForFunction(() => document.querySelector('#rc .sid-note[lang="en"]'));
  ns = await notes();
  assert.equal(ns.filter(x => x[0] === 'he').length, ns.filter(x => x[0] === 'en').length);
  await p.click('label:has(input[name="siddurLang"][value="en"])');
  await p.waitForFunction(() => !document.querySelector('#rc .sid-note[lang="he"]'));
  ns = await notes();
  assert.ok(ns.length > 3 && ns.every(([l, d]) => l === 'en' && d === 'ltr'));
  assert.equal(JSON.parse(await p.evaluate(() => localStorage.getItem('chitas-reader.v1'))).prefs.siddurLang, 'en');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('old setting (English hidden) moves to Hebrew instructions', async () => {
  const p = await pageWith(browser, srv.url, { prefs: { siddurEn: false } });
  await p.goto(srv.url + '#/s/' + sec);
  await p.waitForSelector('#rc .sid-note');
  assert.ok(await p.$$eval('#rc .sid-note', a => a.every(e => e.lang === 'he')));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
