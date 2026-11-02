// Fetches Sefaria's weekly parasha (Israel and Diaspora) for every Shabbat in a range,
// as an independent check of the Israel-mode Chumash schedule.
// Usage: node tools/fetch-sefaria-parasha.mjs 2025-09-06 2027-10-30
import fs from 'node:fs';
const [from, to] = process.argv.slice(2);
const out = 'verification/sefaria-parasha-snapshot.json';
const db = { source: 'https://www.sefaria.org/api/calendars?diaspora={0|1}&year=Y&month=M&day=D', fetchedAt: new Date().toISOString(), shabbatot: {} };
for (let d = new Date(from + 'T12:00:00Z'); d <= new Date(to + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 7)) {
  const iso = d.toISOString().slice(0, 10); const [y, m, dd] = iso.split('-').map(Number);
  const row = {};
  for (const [k, dia] of [['il', 0], ['diaspora', 1]]) {
    const r = await fetch(`https://www.sefaria.org/api/calendars?diaspora=${dia}&year=${y}&month=${m}&day=${dd}`);
    const j = await r.json(); const it = j.calendar_items.find(i => i.title.en === 'Parashat Hashavua');
    row[k] = it ? { name: it.displayValue.en, ref: it.ref } : null;
    await new Promise(r => setTimeout(r, 250));
  }
  db.shabbatot[iso] = row;
}
fs.writeFileSync(out, JSON.stringify(db, null, 1));
console.log('done', Object.keys(db.shabbatot).length);
