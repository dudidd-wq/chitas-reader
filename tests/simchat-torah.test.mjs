// Simchat Torah Chumash shiur: Vezot from the day's aliyah to the end + Bereshit up to the end of the day's aliyah
// (Torat Menachem 5732 vol.1 p.129; chabad.org.il "מנהגי חב״ד לשמחת תורה").
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayPlan } from '../site/js/calendar.js';
import { filesFor } from '../site/js/texts.js';

const R = p => p.map(x => [x.book, `${x.from.c}:${x.from.v}`, `${x.to.c}:${x.to.v}`]);
test('Simchat Torah: two-part Chumash shiur', () => {
  // Diaspora, Sunday 23 Tishrei 5787: all of Vezot + Bereshit Rishon
  assert.deepEqual(R(dayPlan('2026-10-04', { il: false }).chumash.parts), [['Deuteronomy', '33:1', '34:12'], ['Genesis', '1:1', '2:3']]);
  // Diaspora, Wednesday 23 Tishrei 5786: Vezot from Revi'i + Bereshit to end of Revi'i
  assert.deepEqual(R(dayPlan('2025-10-15', { il: false }).chumash.parts), [['Deuteronomy', '33:18', '34:12'], ['Genesis', '1:1', '4:18']]);
  // Israel, Tuesday 22 Tishrei 5786: from Shlishi (the example in the Rebbe's sicha)
  assert.deepEqual(R(dayPlan('2025-10-14', { il: true }).chumash.parts), [['Deuteronomy', '33:13', '34:12'], ['Genesis', '1:1', '3:21']]);
  // Israel 2025-10-14 is not Simchat Torah in the Diaspora (Shemini Atzeret): single Vezot aliyah only
  assert.equal(dayPlan('2025-10-14', { il: false }).chumash.parts.length, 1);
  // The day after continues Bereshit with its own aliyah
  assert.deepEqual(R(dayPlan('2025-10-16', { il: false }).chumash.parts), [['Genesis', '4:19', '4:22']]);
  assert.deepEqual(R(dayPlan('2025-10-15', { il: true }).chumash.parts), [['Genesis', '3:22', '4:18']]);
  assert.match(dayPlan('2025-10-15', { il: false }).chumash.title, /שמחת תורה/);
});
test('Israel, Simchat Torah on Shabbat (22 Tishrei 5787 = 2026-10-03): Vezot Shevi\'i + Bereshit Rishon only (round-2 MUST-FIX)', () => {
  const c = dayPlan('2026-10-03', { il: true }).chumash;
  assert.equal(c.simchatTorah, true); assert.equal(c.shabbat, true);
  assert.deepEqual(R(c.parts), [['Deuteronomy', '34:1', '34:12'], ['Genesis', '1:1', '2:3']]);
  assert.match(c.title, /ובראשית ראשון/); assert.doesNotMatch(c.title, /עד סוף שביעי/);
  // the Bereshit week begins the next day with Rishon as usual (Shabbat Bereshit is 2026-10-10 in Israel)
  assert.deepEqual(R(dayPlan('2026-10-04', { il: true }).chumash.parts), [['Genesis', '1:1', '2:3']]);
  // the Diaspora on that Shabbat is Shemini Atzeret: one Vezot aliyah
  assert.equal(dayPlan('2026-10-03', { il: false }).chumash.parts.length, 1);
  // every other Israeli Simchat Torah on Shabbat in 5780–5800 follows the same rule
  for (const iso of ['2020-10-10', '2023-10-07']) {
    const x = dayPlan(iso, { il: true }).chumash;
    assert.deepEqual(R(x.parts).at(-1), ['Genesis', '1:1', '2:3'], iso);
  }
});
test('Simchat Torah: offline files include both books', async () => {
  const f = await filesFor(dayPlan('2026-10-04', { il: false }), 'chumash');
  assert.deepEqual(f, ['torah/Deuteronomy/33.json', 'torah/Deuteronomy/34.json', 'torah/Genesis/1.json', 'torah/Genesis/2.json']);
});
