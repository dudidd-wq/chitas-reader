import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSiddurDoc, omitPrayerFlags, hiddenSiddurRows } from '../site/js/texts.js';
import { HDate, months } from '../site/js/vendor/hebcal.js';
import { noTachanun, shabbatOrYomTov } from '../site/js/tefila.js';

// Local JSON only: no search rebuild, browser, or network needed.
const root = new URL('../site/', import.meta.url);
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(new URL(path, root))) });
const rows = key => JSON.parse(fs.readFileSync(new URL(`data/siddur/${key}.json`, root))).b;
const flags = key => { const [book, n] = key.split('/'); return omitPrayerFlags(rows(key), { book, n: +n }); };
const has = (doc, id) => doc.blocks.some(b => b.id === id || b.id === id + 'e');
const options = hd => ({ hideNoTachanun: noTachanun(hd), hideShabbat: shabbatOrYomTov(hd) });

for (const [name, hd, tach, shabbat] of [
  ['weekday with Tachanun', new HDate(8, months.KISLEV, 5787), false, false],
  ['Rosh Chodesh without Tachanun', new HDate(1, months.KISLEV, 5787), true, false],
  ['Shabbat', new HDate(new Date(2026, 10, 14)), true, true],
]) {
  test(`${name}: prayer and instructions share visibility in every language`, async () => {
    const opts = options(hd);
    assert.deepEqual(opts, { hideNoTachanun: tach, hideShabbat: shabbat });
    for (const lang of ['he', 'en', 'both']) {
      for (const book of ['shacharit', 'mincha']) {
        const n = book === 'shacharit' ? 4 : 3;
        const doc = await buildSiddurDoc(book, n, { ...opts, lang });
        for (const i of [1, 2, 3]) assert.equal(has(doc, `${book}-${n}-${i}`), !tach);
      }
      const psalms = await buildSiddurDoc('shacharit', 5, { ...opts, lang });
      for (const i of [84, 85, 103, 104, 105]) assert.equal(has(psalms, `shacharit-5-${i}`), !tach);
      assert.ok(has(psalms, 'shacharit-5-83'), 'independent Purim/fast-day navigation survives');
      const thanksgiving = await buildSiddurDoc('shacharit', 1, { ...opts, lang });
      for (const i of [12, 13, 14]) assert.equal(has(thanksgiving, `shacharit-1-${i}`), !shabbat);
      assert.ok(has(thanksgiving, 'shacharit-1-15'), 'next daily prayer survives');
      // Removed doc blocks cannot enter either the display or its read-aloud queue.
      const korbanot = await buildSiddurDoc('boker', 5, { ...opts, lang });
      assert.equal(has(korbanot, 'boker-5-21'), !shabbat);
      for (const i of [0, 16, 17, 18, 19, 20, 22, 23, 30]) assert.ok(has(korbanot, `boker-5-${i}`));
    }
  });
}

test('always/off settings cover the korbanot supplications without hiding neighbouring readings', async () => {
  for (const [n, omitted, kept] of [[3, [0, 1, 4, 5], [2, 3, 6]], [4, [6, 7], [4, 8, 9, 10]], [5, [21], [20, 22, 23]]]) {
    const off = await buildSiddurDoc('boker', n);
    const on = await buildSiddurDoc('boker', n, { hideShabbat: true });
    for (const i of omitted) { assert.ok(has(off, `boker-${n}-${i}`)); assert.ok(!has(on, `boker-${n}-${i}`)); }
    for (const i of kept) assert.ok(has(on, `boker-${n}-${i}`));
  }
});

test('audited instruction ownership includes split labels, citations, procedural notes and all omission categories', () => {
  const audit = {
    'boker/1': { 22: [21] }, 'boker/3': { 1: [0], 5: [4] }, 'boker/4': { 7: [6] },
    'boker/5': { 21: [] }, 'chanukah/1': { 8: [7] },
    'chatzot/1': { 15: [13, 14, 16, 18, 23, 25, 27, 30], 42: [41], 51: [50] },
    'kabbalat/1': { 2: [0, 1] }, 'kabbalat/2': { 2: [0, 1, 3, 5, 7, 9] },
    'mincha/3': { 2: [1, 3] }, 'minchashabbat/3': { 78: [77] },
    'rc/1': { 13: [11, 12], 18: [16, 17] },
    'shabbat/5': { 123: [122], 168: [167] },
    'shacharit/1': { 14: [12, 13] }, 'shacharit/4': { 2: [1, 3], 52: [51] },
    'shacharit/5': { 85: [84], 105: [103, 104] },
    'shema/1': { 1: [0], 4: [3], 26: [25, 27], 45: [44] },
  };
  const index = JSON.parse(fs.readFileSync(new URL('data/siddur/index.json', root)));
  for (const book of index.books) for (let n = 1; n <= book.secs.length; n++) {
    const key = `${book.id}/${n}`, r = rows(key), om = flags(key);
    const starts = om.isStart.flatMap((x, i) => x ? [i] : []);
    assert.deepEqual(starts, Object.keys(audit[key] || {}).map(Number), `${key}: every conditional block is audited`);
    for (const start of starts) for (const note of audit[key][start]) {
      assert.ok(om.instructions[start].includes(note), `${key}: note ${note} belongs to ${start}`);
      assert.ok(hiddenSiddurRows(r, om, label => label === om.label[start]).has(note));
    }
    assert.equal(hiddenSiddurRows(r, om, () => false).size, 0);
  }
  for (const [key, note] of [['boker/4', 5], ['chanukah/1', 6], ['minchashabbat/3', 76], ['shacharit/4', 50], ['shacharit/5', 83]]) {
    assert.ok(!hiddenSiddurRows(rows(key), flags(key), () => true).has(note), `${key}: unrelated note ${note} survives`);
  }
});
