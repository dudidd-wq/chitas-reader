// 1.0.97: the whole Shas – plan of every text to fetch (Bavli amudim, Yerushalmi Vilna dafim, Mishnah chapters).
// Tractate lengths: Sefaria /api/shape (cached by fetch-gemara.py shapes); Vilna daf → Sefaria ref: @hebcal/learning
// yerushalmiVilnaMap (BSD-2); Bavli "Shekalim" (Daf Yomi) → Jerusalem Talmud Shekalim: hebcal shekalimDafYomiMap.
import fs from 'node:fs';
import VILNA from '../node_modules/@hebcal/learning/dist/esm/yerushalmiVilnaMap.json.js';
import SHEKALIM from '../node_modules/@hebcal/learning/dist/esm/shekalimDafYomiMap.json.js';
import { VERSIONS } from './gemara-pronunciation.mjs';
import { yerushalmi as yerOf } from '../site/js/gemara-cycles.js';
import zlib from 'node:zlib';
export const CACHE = process.env.GEMARA_CACHE || '/workspace/gemara-build/cache';
const shape = c => JSON.parse(fs.readFileSync(`${CACHE}/shapes/shape-${c}.json`));
export const SEDER = { 'Seder Zeraim': 'זרעים', 'Seder Moed': 'מועד', 'Seder Nashim': 'נשים', 'Seder Nezikin': 'נזיקין', 'Seder Kodashim': 'קדשים', 'Seder Tahorot': 'טהרות' };
// Mishnah: app key (hebcal / file path) ← Sefaria title
const MKEY = { "Mishnah Ta'anit": 'Taanit', 'Pirkei Avot': 'Avot' };
// hebcal's map gives where each Vilna daf STARTS (its end points are partial); a daf runs from its start to the next
// daf's start, inclusive – exactly Sefaria's Yerushalmi Yomi refs (e.g. Avodah Zarah 1:1:1-8, 1:1:8-2:3, …)
// …but hebcal's map has slips (Peah 10, Niddah 13, …): Sefaria's own calendar ref for the date of each daf in one full
// cycle wins (cached by fetch-gemara.py yercal; dates in yercal-dates.json)
const CAL = new Map();
{ const dates = []; for (let k = 0; k < 1600; k++) { const d = new Date(Date.UTC(2026, 10, 13, 12)); d.setUTCDate(d.getUTCDate() + k); dates.push(d.toISOString().slice(0, 10)); }
  fs.writeFileSync(`${CACHE}/yercal-dates.json`, JSON.stringify(dates));
  for (const iso of dates) { const y = yerOf(iso); if (!y) continue; let c; try { c = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${CACHE}/cal/${iso}.json.gz`))); } catch { continue; }
    const it = c.calendar_items?.find(x => x.title.en === 'Yerushalmi Yomi'); if (it?.ref?.startsWith(`Jerusalem Talmud ${y.t} `)) CAL.set(`${y.t} ${y.daf}`, it.ref.slice(`Jerusalem Talmud ${y.t} `.length)); } }
export const calStats = () => CAL.size;
function vilnaRefs(t, L) {
  const st = VILNA[t].map(r => r && r.split('-')[0]), out = [];
  const last = `${L.length}:${L.at(-1).length}:${L.at(-1).at(-1)}`;
  const short = (a, b) => { const A = a.split(':'), B = b.split(':'); return A[0] !== B[0] ? b : A[1] !== B[1] ? B.slice(1).join(':') : B[2]; };
  st.forEach((a, i) => { if (!a) return out.push(null); const nx = st.slice(i + 1).find(Boolean) || last; out.push(a === nx ? a : `${a}-${short(a, nx)}`); });
  for (let d = 1; d <= Math.max(out.length, 200); d++) if (CAL.has(`${t} ${d}`)) out[d - 1] = CAL.get(`${t} ${d}`);
  return Array.from(out, x => x ?? null);
}
export const amudOf = i => `${Math.floor(i / 2) + 1}${i % 2 ? 'b' : 'a'}`;
export function shasPlan() {
  const bavli = shape('Bavli').map(t => ({ t: t.title, he: t.heTitle, seder: t.section, amudim: t.chapters.map((n, i) => n ? amudOf(i) : null).filter(Boolean) }));
  const yshape = new Map(shape('Yerushalmi').map(t => [t.title.replace('Jerusalem Talmud ', ''), t]));
  const yer = [...yshape.keys()].filter(t => VILNA[t]).map(t => ({ t, he: yshape.get(t).heTitle.replace('תלמוד ירושלמי ', ''), seder: yshape.get(t).section,
    dafim: vilnaRefs(t, yshape.get(t).chapters).map((r, i) => ({ daf: i + 1, ref: r && `Jerusalem Talmud ${t} ${r}` })) }));
  const mishna = shape('Mishnah').map(t => ({ t: MKEY[t.title] || t.title.replace('Mishnah ', ''), sef: t.title === "Mishnah Ta'anit" ? 'Mishnah Taanit' : t.title,
    he: t.heTitle.replace('משנה ', ''), seder: t.section, chapters: t.chapters }));
  // 1.0.97: every Yerushalmi daf → its segments [chapter, halakha, segment] (for Penei Moshe, keyed per segment)
  const expand = (t, r) => { const L = yshape.get(t).chapters, [a, b = a] = r.split('-'), A = a.split(':').map(Number), B0 = b.split(':').map(Number);
    const B = B0.length === 3 ? B0 : B0.length === 2 ? [A[0], ...B0] : [A[0], A[1], B0[0]], out = [];
    for (let c = A[0], h = A[1], g = A[2]; ;) { out.push([c, h, g]); if (out.length > 500) throw Error('range ' + t + ' ' + r); if (c === B[0] && h === B[1] && g === B[2]) break; g++;
      if (g > L[c - 1][h - 1]) { g = 1; h++; if (h > L[c - 1].length) { h = 1; c++; if (c > L.length) break; } } }
    return out; };
  for (const y of yer) y.dafim.forEach(d => { d.segs = d.ref && expand(y.t, d.ref.slice(`Jerusalem Talmud ${y.t} `.length)); });
  const shekalim = Object.entries(SHEKALIM).map(([a, r]) => ({ amud: a, ref: `Jerusalem Talmud Shekalim ${r}`, segs: expand('Shekalim', r) }));
  const texts = [], add = (tag, ref) => texts.push({ tag, ref, version: tag === 'pm' ? 'hebrew' : VERSIONS[tag === 'misc' ? 'mis' : tag === 'barc' ? 'bar' : tag] });
  for (const m of mishna) m.chapters.forEach((_, c) => { add('misc', `${m.sef} ${c + 1}`); add('barc', `Bartenura on ${m.sef} ${c + 1}`); });
  for (const y of yer) y.dafim.forEach(d => d.ref && add('yer', d.ref));
  for (const s of shekalim) add('yer', s.ref);
  for (const y of yer) yshape.get(y.t).chapters.forEach((hs, c) => hs.forEach((_, h) => add('pm', `Penei Moshe on Jerusalem Talmud ${y.t} ${c + 1}:${h + 1}`)));
  for (const b of bavli) b.amudim.forEach(a => { add('gem', `${b.t} ${a}`); add('ste', `Steinsaltz on ${b.t} ${a}`); });
  return { bavli, yer, mishna, shekalim, texts };
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const p = shasPlan(); fs.writeFileSync(CACHE + '/shas-plan.json', JSON.stringify(p));
  console.log('sefaria calendar refs', calStats(), '| bavli', p.bavli.reduce((n, b) => n + b.amudim.length, 0), 'amudim | yer', p.yer.reduce((n, y) => n + y.dafim.length, 0), 'dafim | mishna', p.mishna.reduce((n, m) => n + m.chapters.reduce((a, b) => a + b, 0), 0), '| texts', p.texts.length);
}
