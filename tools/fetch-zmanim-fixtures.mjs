// Dev-time only: fetches reference zmanim from Hebcal (JSON API) and Chabad.org (zmanim web service) for the
// built-in cities, so tests/zmanim.test.mjs can compare the app's offline calculation against two independent
// published sources. The app itself never calls these services.
import { writeFileSync } from 'node:fs';
import { CITIES } from '../site/js/zmanim.js';

const DATES = ['2026-11-06', '2026-11-07', '2027-01-15', '2027-03-26', '2027-04-21', '2027-06-21', '2027-06-25'];
const MAIN = ['jerusalem', 'telaviv', 'haifa', 'eilat', 'crownheights', 'london', 'moscow', 'melbourne'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hebcal = {}, chabad = {};
const get = async (url, headers = {}) => { for (let i = 0; i < 4; i++) { const r = await fetch(url, { headers }); if (r.ok) return r.json(); await sleep(1500 * (i + 1)); } throw new Error('fetch failed ' + url); };
for (const c of CITIES) {
  const dates = MAIN.includes(c.id) ? DATES : DATES.slice(0, 1);
  for (const iso of dates) {
    const h = await get(`https://www.hebcal.com/zmanim?cfg=json&sec=1&latitude=${c.lat}&longitude=${c.lon}&tzid=${c.tz}&date=${iso}`);
    (hebcal[c.id] ||= {})[iso] = h.times; await sleep(300);
    if (!MAIN.includes(c.id)) continue;
    const [y, m, d] = iso.split('-');
    const j = await get(`https://www.chabad.org/webservices/zmanim/zmanim/Get_Zmanim?locationtype=3&coords=${c.lat},${c.lon}&n=X&tzname=${c.tz}&tdate=${m}/${d}/${y}`, { Accept: 'application/json' });
    const day = j.Days.find(x => x.DisplayDate === `${+m}/${+d}/${y}`) || j.Days[0];
    const out = {}; for (const g of day.TimeGroups) out[g.ZmanType] = g.Items.map(i => i.Zman);
    (chabad[c.id] ||= {})[iso] = out; await sleep(300);
    console.log(c.id, iso);
  }
}
const meta = { fetched: new Date().toISOString().slice(0, 10), note: 'reference data for tests only' };
writeFileSync('verification/zmanim-hebcal.json', JSON.stringify({ meta: { ...meta, source: 'https://www.hebcal.com/zmanim?cfg=json&sec=1' }, data: hebcal }, null, 1));
writeFileSync('verification/zmanim-chabad.json', JSON.stringify({ meta: { ...meta, source: 'https://www.chabad.org/webservices/zmanim/zmanim/Get_Zmanim (locationtype=3, coords)' }, data: chabad }, null, 1));
