// Zmanim computed on the device vs. two published sources (fetched at dev time by tools/fetch-zmanim-fixtures.mjs):
// Hebcal (to the second) and Chabad.org (to the minute) – 8 cities × 7 dates, plus all 14 cities on one date.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITIES, cityById, computeZmanim, fmtTime } from '../site/js/zmanim.js';

const H = JSON.parse(readFileSync(new URL('../verification/zmanim-hebcal.json', import.meta.url))).data;
const C = JSON.parse(readFileSync(new URL('../verification/zmanim-chabad.json', import.meta.url))).data;
const nextIso = iso => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + 1)); return x.toISOString().slice(0, 10); };
const opt = (z, key, i = 0) => z.rows.find(r => r.key === key).opts[i];
const HEBCAL = [['alosBaalHatanya', 'alot', 0], ['alotHaShachar', 'alot', 1], ['misheyakirMachmir', 'misheyakir', 0], ['misheyakir', 'misheyakir', 1],
  ['sunrise', 'netz', 0], ['sofZmanShmaBaalHatanya', 'shma', 0], ['sofZmanShma', 'shma', 1], ['sofZmanShmaMGA', 'shma', 2], ['sofZmanShmaMGA16Point1', 'shma', 3],
  ['sofZmanTfilaBaalHatanya', 'tefila', 0], ['sofZmanTfilla', 'tefila', 1], ['sofZmanTfillaMGA', 'tefila', 2], ['sofZmanTfillaMGA16Point1', 'tefila', 3],
  ['chatzot', 'chatzot', 0], ['minchaGedolaBaalHatanya', 'minchaGedola', 0], ['minchaGedola', 'minchaGedola', 1], ['minchaKetanaBaalHatanya', 'minchaKetana', 0],
  ['minchaKetana', 'minchaKetana', 1], ['plagHaminchaBaalHatanya', 'plag', 0], ['plagHaMincha', 'plag', 1], ['sunset', 'shkia', 0], ['tzaisBaalHatanya', 'tzeit', 0], ['tzeit85deg', 'tzeit', 1]];
const CHABAD = [['AlosHashachar', 'alot'], ['EarliestTefillin', 'misheyakir'], ['NetzHachamah', 'netz'], ['LatestShema', 'shma'], ['LatestTefillah', 'tefila'],
  ['Chatzos', 'chatzot'], ['MinchahGedolah', 'minchaGedola'], ['MinchahKetanah', 'minchaKetana'], ['PlagHaminchah', 'plag'], ['Shkiah', 'shkia'], ['Tzeis', 'tzeit'], ['ChatzosNight', 'chatzotNight']];
const toMin = s => { const m = /^(\d+):(\d\d) (AM|PM)$/.exec(s); return ((+m[1] % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + +m[2]; };
const hm = (d, tz) => { const [h, m] = fmtTime(d, tz).split(':').map(Number); return h * 60 + m; };
const diff = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };

test('zmanim: every opinion matches Hebcal within 1 minute (8 cities × 7 dates + 6 more cities)', () => {
  let n = 0;
  for (const [id, days] of Object.entries(H)) for (const [iso, t] of Object.entries(days)) {
    const z = computeZmanim(iso, cityById(id));
    for (const [hk, key, i] of HEBCAL) {
      const o = opt(z, key, i);
      if (!t[hk]) { assert.equal(o.t, null, `${id} ${iso} ${hk}: Hebcal has none, we show —`); continue; }
      assert.ok(o.t, `${id} ${iso} ${hk}: missing`);
      assert.ok(Math.abs(o.t - new Date(t[hk])) <= 60000, `${id} ${iso} ${hk}: ${o.t.toISOString()} vs ${t[hk]}`);
      assert.ok(Math.abs(o.r - new Date(t[hk])) <= 65000, `${id} ${iso} ${hk} (rounded to the cautious side)`); n++;
    }
    const nx = H[id][nextIso(iso)];
    if (nx?.chatzotNight) { assert.ok(Math.abs(opt(z, 'chatzotNight').t - new Date(nx.chatzotNight)) <= 60000, `${id} ${iso} chatzot night`); n++; }
  }
  assert.ok(n >= 1200, `compared ${n}`);
});

test('zmanim: the Chabad (Alter Rebbe) column matches Chabad.org within 1 minute; Shabbat end and candle lighting too', () => {
  let n = 0;
  for (const [id, days] of Object.entries(C)) {
    const city = cityById(id);
    for (const [iso, t] of Object.entries(days)) {
      const z = computeZmanim(iso, city);
      for (const [ck, key] of CHABAD) {
        const o = opt(z, key);
        if (key === 'alot' && !o.r) { assert.equal(t[ck][0], t.ChatzosNight[0], `${id} ${iso}: no 16.9° dawn – Chabad.org prints midnight`); continue; }
        if (!t[ck]) continue;
        assert.ok(diff(hm(o.r, city.tz), toMin(t[ck][0])) <= 1, `${id} ${iso} ${ck}: ${fmtTime(o.r, city.tz)} vs ${t[ck][0]}`); n++;
      }
      const cand = z.special.find(s => s.key === 'candles'), hav = z.special.find(s => s.key === 'havdalah');
      if (t.CandleLighting) {
        assert.ok(cand, `${id} ${iso}: candle lighting expected`);
        // Chabad.org follows other local customs in Tel Aviv (22 min) and Eilat (30 min); our default there is 18 – the user can pick the minutes
        const c2 = { telaviv: 22, eilat: 30 }[id] ? computeZmanim(iso, city, { candleMins: { telaviv: 22, eilat: 30 }[id] }).special[0] : cand;
        assert.ok(diff(hm(c2.r, city.tz), toMin(t.CandleLighting[0])) <= 1, `${id} ${iso} candles: ${fmtTime(c2.r, city.tz)} vs ${t.CandleLighting[0]}`); n++;
      } else assert.equal(cand, undefined, `${id} ${iso}: no candle lighting`);
      if (t.ShabbatEndTime) { assert.ok(hav && diff(hm(hav.r, city.tz), toMin(t.ShabbatEndTime[0])) <= 1, `${id} ${iso} Shabbat ends`); n++; }
    }
  }
  assert.ok(n >= 600, `compared ${n}`);
});

test('zmanim: 14 cities, high-latitude summer has no 16.9°/16.1° dawn (shown as —), Jerusalem 40 / Haifa 30 min candles, Yom Tov labels', () => {
  assert.equal(CITIES.length, 14);
  const z = computeZmanim('2027-06-21', cityById('london'));
  assert.equal(opt(z, 'alot', 0).r, null); assert.equal(opt(z, 'alot', 1).r, null); assert.ok(opt(z, 'alot', 2).r);
  assert.equal(fmtTime(null, 'Europe/London'), '—');
  const jf = computeZmanim('2026-11-06', cityById('jerusalem'));
  assert.equal(fmtTime(jf.special[0].r, 'Asia/Jerusalem'), '16:05'); assert.equal(jf.special[0].he, 'הדלקת נרות שבת');
  assert.equal(fmtTime(computeZmanim('2026-11-06', cityById('haifa')).special[0].r, 'Asia/Jerusalem'), '16:14');
  assert.equal(computeZmanim('2026-09-11', cityById('crownheights')).special[0].he, 'הדלקת נרות שבת ויום טוב');   // Erev Rosh Hashana on Friday
  const yt2 = computeZmanim('2027-04-22', cityById('crownheights')).special[0];   // second night of Pesach in the Diaspora
  assert.equal(yt2.he, 'הדלקת נרות יום טוב'); assert.match(yt2.op, /מאש קיימת/);
  assert.deepEqual(computeZmanim('2027-04-22', cityById('jerusalem')).special.map(s => s.he), ['צאת החג']);
  assert.deepEqual(computeZmanim('2026-11-04', cityById('jerusalem')).special, []);
  assert.equal(fmtTime(computeZmanim('2026-11-06', cityById('telaviv')).special[0].r, 'Asia/Jerusalem'), '16:28');   // 16:46:55 − 18
  assert.equal(fmtTime(computeZmanim('2026-11-06', cityById('telaviv'), { candleMins: 20 }).special[0].r, 'Asia/Jerusalem'), '16:26');   // = Hebcal (20 in Israel)
  // rounding: deadlines down, earliest times up
  const t = opt(jf, 'shma'); assert.ok(t.r <= t.t && t.t - t.r < 60000);
  const a = opt(jf, 'tzeit'); assert.ok(a.r >= a.t && a.r - a.t < 60000);
});
