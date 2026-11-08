// 1.0.72: optional hiding of no-Tachanun spans on no-Tachanun days (Chabad list)
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/build-search.mjs';
import { HDate, months } from '../site/js/vendor/hebcal.js';
import { noTachanun, siddurDay } from '../site/js/tefila.js';
import { buildSiddurDoc } from '../site/js/texts.js';
const D = (d, m, y = 5787) => new HDate(d, m, y);
test('Chabad no-Tachanun days', () => {
  const yes = [D(1, months.KISLEV), D(30, months.CHESHVAN), D(5, months.NISAN), D(14, months.IYYAR), D(18, months.IYYAR), D(10, months.SIVAN),
    D(12, months.TAMUZ), D(9, months.AV), D(15, months.AV), D(29, months.ELUL, 5786), D(20, months.TISHREI), D(19, months.KISLEV), D(10, months.KISLEV),
    D(27, months.KISLEV), D(15, months.SHVAT), D(14, months.ADAR_I), D(15, months.ADAR_I)];
  for (const h of yes) assert.equal(noTachanun(h), true, h.toString());
  // ordinary weekdays (not Shabbat)
  for (const h of [D(6, months.CHESHVAN), D(8, months.KISLEV), D(20, months.SHVAT), D(20, months.SIVAN)].filter(h => h.getDay() !== 6)) assert.equal(noTachanun(h), false, h.toString());
  const sh = [...Array(7)].map((_, i) => D(10 + i, months.CHESHVAN)).find(h => h.getDay() === 6); assert.equal(noTachanun(sh), true);
});
test('after sunset the siddur day is the next Hebrew date', () => {
  const now = new Date(2026, 10, 8, 21), ss = new Date(2026, 10, 8, 16, 50);
  assert.equal(siddurDay(now, ss).deltaDays(new HDate(new Date(2026, 10, 8))), 1);
  assert.equal(siddurDay(new Date(2026, 10, 8, 12), ss).deltaDays(new HDate(new Date(2026, 10, 8))), 0);
});
test('KSHM: confession hidden, Shabbat-only blocks kept, a placeholder note shown', async () => {
  const on = await buildSiddurDoc('shema', 1, { hideNoTachanun: true }), off = await buildSiddurDoc('shema', 1);
  const has = (d, re) => d.blocks.some(b => re.test((b.text || b.html || '').replace(/[\u0591-\u05C7]/g, '')));
  assert.ok(has(off, /^אשמנו/) && !has(on, /^אשמנו/) && !has(on, /ואם חטאתי עויתי/));
  assert.ok(!has(on, /מכים קלות באגרוף/));
  assert.ok(has(on, /^רבונו של עולם הריני מוחל/) && has(on, /^אנא בכח/));
  assert.ok(!has(on, /הושמטו/)); // 1.0.73: no placeholder note
});
