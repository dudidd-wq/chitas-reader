// 1.0.75: Hayom Yom — every Hebrew date maps to an entry; leap-year Adar; 30 Cheshvan/Kislev; library + daily doc
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../tools/build-search.mjs';
import { HDate, months } from '../site/js/vendor/hebcal.js';
import { hayomKey, buildDoc, describe } from '../site/js/texts.js';
import { libDoc } from '../site/js/library.js';
const D = JSON.parse(fs.readFileSync(new URL('../site/data/hayomyom/days.json', import.meta.url)));
test('383 entries, none empty', () => {
  assert.equal(Object.keys(D).length, 383);
  for (const [k, e] of Object.entries(D)) assert.ok(e.p.length && e.p.every(([t]) => t.length > 5), k);
});
test('every day of a leap and an ordinary year has an entry', () => {
  for (const y of [5786, 5787]) {
    let hd = new HDate(1, months.TISHREI, y); const end = new HDate(1, months.TISHREI, y + 1);
    while (hd.abs() < end.abs()) { assert.ok(D[hayomKey(hd).key], hd.toString()); hd = hd.next(); }
  }
});
test('mapping: 19 Kislev, RC, leap and ordinary Adar, 30th days', () => {
  assert.equal(D[hayomKey(new HDate(19, months.KISLEV, 5787)).key].ref, 'י"ט כסלו');
  assert.equal(hayomKey(new HDate(1, months.NISAN, 5787)).key, 'nisan-1');
  assert.equal(hayomKey(new HDate(14, months.ADAR_I, 5786)).key, 'adar2-14'); // 5786 is ordinary → Adar = Adar II entries
  assert.equal(hayomKey(new HDate(14, months.ADAR_I, 5784)).key, 'adar1-14'); // 5784 leap
  assert.equal(hayomKey(new HDate(14, months.ADAR_II, 5784)).key, 'adar2-14');
  assert.equal(hayomKey(new HDate(30, months.ADAR_I, 5784)).key, 'adar1-30');
  assert.deepEqual(hayomKey(new HDate(30, months.CHESHVAN, 5787)), { key: 'cheshvan-29', repeat: true });
});
test('daily doc (today) and library leaf', async () => {
  const iso = '2026-11-08';
  const d = await buildDoc({ iso }, 'hayomyom');
  assert.equal(d.subtitle, 'כ"ח חשון'); assert.ok(d.blocks.filter(b => b.type === 'p').length >= 1);
  assert.equal(await describe({ iso }, 'hayomyom'), 'כ"ח חשון');
  const l = await libDoc('hayomyom/kislev-19'); assert.ok(l.doc.blocks.some(b => b.type === 'p' && /פדה בשלום נפשי/.test(b.text)));
});
