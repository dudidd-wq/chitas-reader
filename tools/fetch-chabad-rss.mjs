// Fetches Chabad.org public Daily Study RSS for a range of dates and stores
// only the short factual descriptions (portion names), for verification.
// Usage: node tools/fetch-chabad-rss.mjs 2025-09-20 2027-10-31
import fs from 'node:fs';
const [from, to] = process.argv.slice(2);
const out = 'verification/chabad-rss-snapshot.json';
const db = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { source: 'https://www.chabad.org/tools/rss/dailystudy_rss.xml?tdate=M/D/YYYY', fetched: {}, days: {} };
const dec = s => s.replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
for (let d = new Date(from + 'T12:00:00Z'); d <= new Date(to + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
  const iso = d.toISOString().slice(0, 10);
  if (db.days[iso]) continue;
  const [y, m, dd] = iso.split('-').map(Number);
  const url = `https://www.chabad.org/tools/rss/dailystudy_rss.xml?tdate=${m}/${dd}/${y}`;
  let xml;
  for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { headers: { 'User-Agent': 'chitas-reader-verification/1.0' } }); xml = await r.text(); if (r.ok) break; } catch (e) { } await new Promise(r => setTimeout(r, 2000)); }
  const items = {};
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const t = /<title>([\s\S]*?)<\/title>/.exec(m[1])?.[1]; const ds = /<description>([\s\S]*?)<\/description>/.exec(m[1])?.[1];
    if (t && ds && !/Hayom Yom/.test(t)) items[dec(t)] = dec(ds);
  }
  const head = /<title>Chabad\.org Daily Study - ([^<]*)<\/title>/.exec(xml)?.[1];
  db.days[iso] = { head: head && dec(head), chumash: items['Daily Chumash with Rashi'], tehillim: items['Daily Tehilim - Psalms'], tanya: items['Daily Tanya'], rambam1: items['Daily Rambam - 1 Chapter Per Day (Hebrew)'], rambam3: items['Daily Rambam - 3 Chapter Per Day (Hebrew)'] };
  db.fetched[iso] = new Date().toISOString();
  if (Object.keys(db.days).length % 20 === 0) fs.writeFileSync(out, JSON.stringify(db, null, 0));
  await new Promise(r => setTimeout(r, 350));
}
const sorted = Object.fromEntries(Object.entries(db.days).sort());
db.days = sorted;
fs.writeFileSync(out, JSON.stringify(db, null, 1));
console.log('done', Object.keys(db.days).length);
