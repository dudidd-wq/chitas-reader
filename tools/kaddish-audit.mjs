// 1.0.90: where the siddur's Kaddish blocks are (texts.js kaddishFlags), per prayer, with checks for false positives.
// Usage: node tools/kaddish-audit.mjs [--json out.json]
import fs from 'node:fs';
import { kaddishFlags } from '../site/js/texts.js';
const D = new URL('../site/data/siddur/', import.meta.url).pathname;
const plain = s => String(typeof s === 'string' ? s : JSON.stringify(s ?? '')).replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
export function kaddishAudit() {
  const idx = JSON.parse(fs.readFileSync(D + 'index.json', 'utf8')), out = { books: {}, total: 0, rows: 0, blocks: [], outside: [] };
  for (const b of idx.books) b.secs.forEach((sec, si) => {
    const rows = JSON.parse(fs.readFileSync(`${D}${b.id}/${si + 1}.json`, 'utf8')).b, { flags, starts } = kaddishFlags(rows);
    const key = `${b.id}/${si + 1}`;
    if (starts.length) out.books[key] = { prayer: `${b.he} – ${sec.he}`, blocks: starts.length };
    out.total += starts.length; out.rows += flags.filter(Boolean).length;
    for (const s of starts) {
      let e = s; for (let k = s + 1; k < rows.length; k++) { if (flags[k]) e = k; else if (rows[k][0] !== 'n') break; }
      let a = s; while (a > 0 && flags[a - 1]) a--;
      out.blocks.push({ key, from: a, start: s, to: e, rows: rows.slice(a, e + 1).map((r, k) => (flags[a + k] ? '' : '[read] ') + r[0] + ' ' + plain(r[0] === 'n' ? r[2] || r[1] : r[1]).slice(0, 50)), next: rows[e + 1] ? rows[e + 1][0] + ' ' + plain(rows[e + 1][0] === 'n' ? rows[e + 1][2] || rows[e + 1][1] : rows[e + 1][1]).slice(0, 60) : null });
    }
    // anything Kaddish-like that is NOT in a block (missed Kaddish), and words that must never be inside one
    rows.forEach((r, i) => {
      const t = plain(r[1]);
      if (!flags[i] && r[0] !== 'n' && /^(יתגדל ויתקדש שמה|\(Cong: אמן\. יהא שמה רבא|יהא שמה רבא|תתקבל צלותהון|יהא שלמה רבא)/.test(t)) out.outside.push({ key, i, type: r[0], text: t.slice(0, 80) });
      if (flags[i] && r[0] === 'p' && /קדוש קדוש קדוש|ברכו את|נקדש את שמך/.test(t)) out.outside.push({ key, i, falsePositive: true, text: t.slice(0, 80) });
    });
  });
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = kaddishAudit(), i = process.argv.indexOf('--json');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ total: r.total, rows: r.rows, prayers: Object.keys(r.books).length, outside: r.outside.length }));
  for (const [k, v] of Object.entries(r.books)) console.log(k, v.blocks, v.prayer);
  console.log('outside/false-positive:', JSON.stringify(r.outside, null, 0));
}
