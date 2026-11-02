// Independent check of the Chumash schedule in BOTH modes (Israel and Diaspora) against a snapshot of
// Sefaria's weekly-parasha calendar (verification/sefaria-parasha-snapshot.json, tools/fetch-sefaria-parasha.mjs).
// Rule checked for every day: the day's aliyah belongs to the parasha read on the coming Shabbat that is not a
// festival (Chabad custom); Tishrei days up to Simchat Torah learn Vezot Haberakhah.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dayPlan, HDate } from '../site/js/calendar.js';
import { getLeyningForParsha } from '../site/js/vendor/hebcal.js';
const snap = JSON.parse(fs.readFileSync(new URL('../verification/sefaria-parasha-snapshot.json', import.meta.url))).shabbatot;
const CHAG = /Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Shmini Atzeret|Simchat|Chol ha/i;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const endOf = ref => { const [a, b] = ref.replace(/^.* /, '').split('-'); return b.includes(':') ? b : `${a.split(':')[0]}:${b}`; };
for (const [mode, il] of [['il', true], ['diaspora', false]]) {
  test(`Chumash parasha for every day matches Sefaria (${mode})`, () => {
    const keys = Object.keys(snap).sort(); let checked = 0, vezot = 0;
    const first = new Date(keys[0] + 'T12:00:00'); first.setDate(first.getDate() - 6);
    for (let d = first; iso(d) <= keys.at(-1); d.setDate(d.getDate() + 1)) {
      const p = dayPlan(new Date(d), { il }).chumash;
      const hd = new HDate(new Date(d));
      let s = new Date(d); s.setDate(s.getDate() + ((6 - s.getDay()) % 7));
      while (snap[iso(s)] && CHAG.test(snap[iso(s)][mode].name)) s.setDate(s.getDate() + 7);
      const e = snap[iso(s)]?.[mode]; if (!e) continue;
      const ley = getLeyningForParsha(p.parsha);
      if (String(p.parsha) === 'Vezot Haberakhah') {
        assert.equal(hd.getMonth(), 7, iso(d)); assert.ok(hd.getDate() <= (il ? 22 : 23), iso(d));
        assert.match(e.name, /Bereshit|Bereishit/, iso(d)); vezot++; continue;
      }
      const ourEnd = `${ley.fullkriyah[7].e}`; const theirEnd = endOf(e.ref);
      assert.equal(ourEnd, theirEnd, `${mode} ${iso(d)}: ours ${p.parsha} (${ourEnd}) vs Sefaria ${e.name} (${e.ref})`);
      assert.equal(p.aliyah, d.getDay() + 1);
      checked++;
    }
    assert.ok(checked > 700, `checked ${checked}`); assert.ok(vezot > 5);
  });
}
