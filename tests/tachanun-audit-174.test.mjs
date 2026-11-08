// 1.0.74: Tachanun audit (Chabad list, Minchah-before rule, Tachanun/Tikkun Rachel spans) + Shabbat/YT hide option
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../tools/build-search.mjs';
import { HDate, months } from '../site/js/vendor/hebcal.js';
import { noTachanun, noTachanunAt, shabbatOrYomTov } from '../site/js/tefila.js';
import { omitPrayerFlags, buildSiddurDoc } from '../site/js/texts.js';
const D = (d, m, y = 5787) => new HDate(d, m, y);
const wk = h => { while (h.getDay() === 6) h = h.next(); return h; };
test('20 Kislev is a Chabad no-Tachanun day; 18 Elul, 5 Tevet, 3 Tammuz, 10 Shevat are not', () => {
  assert.equal(noTachanun(D(20, months.KISLEV)), true);
  for (const h of [D(18, months.ELUL, 5786), D(5, months.TEVET), D(3, months.TAMUZ), D(10, months.SHVAT), D(24, months.TEVET)]) if (h.getDay() !== 6) assert.equal(noTachanun(h), false, h.toString());
});
test('Minchah before: erev 10 Kislev afternoon yes, erev Pesach Sheni / 8 Tishrei / 28 Elul afternoon no', () => {
  const at = (hd, hour) => { const g = hd.greg(); return new Date(g.getFullYear(), g.getMonth(), g.getDate(), hour); };
  const opt = hd => { const g = hd.greg(); return { chatzot: new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12), sunset: new Date(g.getFullYear(), g.getMonth(), g.getDate(), 18) }; };
  const e = D(9, months.KISLEV);
  if (!noTachanun(e)) { assert.equal(noTachanunAt(at(e, 9), opt(e)), false); assert.equal(noTachanunAt(at(e, 14), opt(e)), true); }
  for (const h of [D(13, months.IYYAR), D(8, months.TISHREI), D(28, months.ELUL, 5786)]) if (!noTachanun(h)) assert.equal(noTachanunAt(at(h, 14), opt(h)), false, h.toString());
  assert.equal(noTachanunAt(at(e, 20), opt(e)), true); // after sunset → 10 Kislev
});
test('Shabbat / Yom Tov detection', () => {
  assert.equal(shabbatOrYomTov(D(15, months.NISAN)), true);
  assert.equal(shabbatOrYomTov(D(10, months.TISHREI)), true);
  assert.equal(shabbatOrYomTov(wk(D(17, months.NISAN))), false); // Chol haMoed
});
const flags = s => { const [b, n] = s.split('/'); return [JSON.parse(fs.readFileSync(new URL(`../site/data/siddur/${s}.json`, import.meta.url))).b, omitPrayerFlags(JSON.parse(fs.readFileSync(new URL(`../site/data/siddur/${s}.json`, import.meta.url))).b, { book: b, n: +n })]; };
test('Tachanun itself (Shacharit, Minchah) and Tikkun Rachel are no-Tachanun spans', () => {
  for (const [s, a, z] of [['shacharit/4', 2, 45], ['mincha/3', 2, 18], ['chatzot/1', 15, 31]]) {
    const [, o] = flags(s);
    assert.equal(o.label[a], 'בימים שאין אומרים תחנון', s); assert.ok(o.isStart[a] && o.isEnd[z], s);
  }
  const [r, o] = flags('mincha/3'); assert.equal(o.omit[22], false); void r; // Kaddish after Tachanun is said
});
test('Shabbat/YT hide removes only Shabbat-labelled blocks', async () => {
  const on = await buildSiddurDoc('shema', 1, { hideShabbat: true });
  const has = re => on.blocks.some(b => re.test((b.text || b.html || '').replace(/[\u0591-\u05C7]/g, '')));
  assert.ok(!has(/^רבונו של עולם הריני מוחל/) && !has(/^והגן בעדנו/) && has(/^השכיבנו/) && has(/^אשמנו/));
});
