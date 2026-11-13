// 1.0.98: Sefaria texts for Nach Yomi (Miqra according to the Masorah + Metzudat David; Rashi (Metsudah) where Metzudat
// David is missing: Ruth, Lamentations, Esther) and for Shnayim Mikra (Targum Onkelos, Yemenite Taj vocalization).
import fs from 'node:fs';
import { nachChapters } from '../site/js/gemara-cycles.js';
export const CACHE = process.env.GEMARA_CACHE || '/workspace/gemara-build/cache';
export const NACH_RASHI = ['Ruth', 'Lamentations', 'Esther'];
export const V = { mam: 'hebrew|Miqra according to the Masorah', md: 'hebrew', rashi: 'hebrew|The Metsudah Five Megillot, Lakewood, N.J., 2001',
  onk: 'hebrew|Targum Onkelos, vocalized according to the Yemenite Taj' };   // Genesis: the title ends with a space on Sefaria
export const TORAH = { Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34 };
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const texts = [];
  for (const { book, c } of nachChapters()) {
    texts.push({ tag: 'mam', ref: `${book} ${c}`, version: V.mam });
    texts.push(NACH_RASHI.includes(book) ? { tag: 'nrashi', ref: `Rashi on ${book} ${c}`, version: V.rashi } : { tag: 'md', ref: `Metzudat David on ${book} ${c}`, version: V.md });
  }
  for (const [b, n] of Object.entries(TORAH)) for (let c = 1; c <= n; c++) texts.push({ tag: 'onk', ref: `Onkelos ${b} ${c}`, version: b === 'Genesis' ? V.onk + ' ' : V.onk });
  fs.writeFileSync(CACHE + '/nach-plan.json', JSON.stringify({ texts }));
  console.log('texts', texts.length);
}
