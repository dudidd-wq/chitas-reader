// Loads prebuilt static JSON (site/data) and assembles a day's portion into a document of blocks.
import { gem, tanya as tanyaRange } from './calendar.js';

const cache = new Map();
/** Licence labels exactly as the source (Sefaria version record) states them — no version is added (round-3 review).
 *  Sefaria records "CC-BY-SA"/"CC-BY-NC" without a version, so the link goes to the licence family page; texts whose
 *  original publisher is Wikisource additionally cite the version stated there (CC BY-SA 4.0, page footer). */
export const LICENSE_URL = { 'CC-BY-SA': 'https://creativecommons.org/licenses/?lang=he#by-sa', 'CC-BY-NC': 'https://creativecommons.org/licenses/?lang=he#by-nc', 'CC-BY': 'https://creativecommons.org/licenses/?lang=he#by', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/deed.he' };
export const WIKISOURCE_DEED = 'https://creativecommons.org/licenses/by-sa/4.0/deed.he';
export const licenseLabel = l => l === 'CC0' ? 'CC0 1.0' : l === 'Public Domain' ? 'נחלת הכלל (Public Domain)' : l.replace(/^CC-/, 'CC ');
export function data(path) {
  if (!cache.has(path)) cache.set(path, fetch('data/' + path).then(r => { if (!r.ok) throw new Error(path); return r.json(); }));
  return cache.get(path);
}

export const UNITS = {
  chumash: { he: 'חומש', full: 'חומש עם פירוש רש״י' },
  tehillim: { he: 'תהילים', full: 'תהילים' },
  tanya: { he: 'תניא', full: 'תניא יומי' },
  rambam3: { he: 'רמב״ם – ג׳ פרקים', full: 'רמב״ם – שלושה פרקים ליום' },
  rambam1: { he: 'רמב״ם – פרק אחד', full: 'רמב״ם – פרק אחד ליום' },
};

/** Files a unit needs (used for offline pre-download). */
export async function filesFor(plan, unit) {
  const f = [];
  if (unit === 'chumash') for (const c of plan.chumash.parts) for (let i = c.from.c; i <= c.to.c; i++) f.push(`torah/${c.book}/${i}.json`);
  if (unit === 'tehillim') plan.tehillim.parts.forEach(p => f.push(`tehillim/${p.c}.json`));
  if (unit === 'tanya') { const doc = await tanyaPositions(plan); doc.forEach(([k, c]) => f.push(`tanya/${k}/${c}.json`)); }
  if (unit === 'rambam1' || unit === 'rambam3') {
    const idx = await data('rambam/index.json');
    for (const it of plan[unit]) for (const [c] of rambamChaptersFull(it, idx[it.name])) f.push(`rambam/${idx[it.name].slug}/${c}.json`);
  }
  return [...new Set(f)];
}

async function chumashDoc(plan) {
  const blocks = [], multi = plan.chumash.parts.length > 1;
  for (const c of plan.chumash.parts) {
    if (multi) blocks.push({ type: 'h', text: c.book === 'Genesis' ? 'פרשת בראשית' : 'פרשת וזאת הברכה' });
    for (let ch = c.from.c; ch <= c.to.c; ch++) {
      const d = await data(`torah/${c.book}/${ch}.json`);
      const a = ch === c.from.c ? c.from.v : 1, b = ch === c.to.c ? c.to.v : d.v.length;
      blocks.push({ type: 'h', text: `${c.bookHe} פרק ${gem(ch)}` });
      for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${ch}:${v}`, ref: `${c.book} ${ch}:${v}`, num: gem(v), text: d.v[v - 1], sub: (d.r && d.r[v - 1]) || [], src: 'tanakh' });
    }
  }
  const sub = c => `${c.bookHe} ${gem(c.from.c)}, ${gem(c.from.v)} – ${gem(c.to.c)}, ${gem(c.to.v)}`;
  const c0 = plan.chumash;
  return { book: c0.book, title: c0.title, subtitle: c0.parts.map(sub).join(' · '), blocks, tanakh: true };
}
async function tehillimDoc(plan) {
  const blocks = [];
  for (const p of plan.tehillim.parts) {
    const d = await data(`tehillim/${p.c}.json`);
    blocks.push({ type: 'h', text: `מזמור ${gem(p.c)}` });
    const a = p.from || 1, b = p.to || d.v.length;
    for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${p.c}:${v}`, ref: `Psalms ${p.c}:${v}`, num: gem(v), text: d.v[v - 1], src: 'tanakh' });
  }
  return { book: 'Psalms', title: plan.tehillim.title, subtitle: 'לפי חלוקת החודש', blocks, tanakh: true };
}
async function tanyaPositions(plan) {
  const index = await data('tanya/index.json');
  const order = Object.keys(index);
  const { from, to } = tanyaRange(plan.hd, index);
  const out = [];
  let k = from.key, c = from.c, s = from.s;
  for (let guard = 0; guard < 400; guard++) {
    const len = index[k].chapters[c - 1];
    const end = (k === to.key && c === to.c) ? to.s : len;
    out.push([k, c, s, end]);
    if (k === to.key && c === to.c) break;
    if (c < index[k].chapters.length) { c++; s = 1; } else { k = order[(order.indexOf(k) + 1) % order.length]; c = 1; s = 1; }
  }
  return out;
}
async function tanyaDoc(plan) {
  const index = await data('tanya/index.json');
  const blocks = [];
  for (const [k, c, a, b] of await tanyaPositions(plan)) {
    const d = await data(`tanya/${k}/${c}.json`);
    const multi = index[k].depth === 2 && index[k].chapters.length > 1;
    blocks.push({ type: 'h', text: index[k].he + (multi ? ` – ${k === 'IK' ? 'אגרת' : 'פרק'} ${gem(c)}` : '') + (a > 1 ? ' (המשך)' : '') });
    for (let s = a; s <= Math.min(b, d.s.length); s++) blocks.push({ type: 'p', id: `${k}.${c}.${s}`, text: d.s[s - 1], src: 'tanya' });
  }
  const first = blocks.find(b => b.type === 'h');
  return { title: 'תניא יומי', subtitle: first ? first.text.replace(' (המשך)', '') : '', blocks };
}
function rambamChaptersFull(it, meta) {
  if (it.c) return [[it.c, 1, Infinity]];
  if (it.range) {
    if (meta.depth === 1) return [[1, it.range[0], it.range[1]]];
    const r = []; for (let c = it.range[0]; c <= it.range[1]; c++) r.push([c, 1, Infinity]); return r;
  }
  const r = [];
  for (let c = it.from.c; c <= it.to.c; c++) r.push([c, c === it.from.c ? it.from.s : 1, c === it.to.c ? it.to.s : Infinity]);
  return r;
}
function chapList(chs) {
  const u = [...new Set(chs)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < u.length;) { let j = i; while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++; out.push(j - i >= 3 ? `${gem(u[i])}–${gem(u[j])}` : u.slice(i, j + 1).map(gem).join(', ')); i = j + 1; }
  return out.join(', ');
}
export async function rambamTitle(items) {
  const idx = await data('rambam/index.json');
  const books = new Map();
  for (const it of items) { const m = idx[it.name]; if (!books.has(m.he)) books.set(m.he, { m, chs: [] }); if (m.depth === 2) books.get(m.he).chs.push(...rambamChaptersFull(it, m).map(x => x[0])); }
  return [...books.entries()].map(([he, { chs }]) => chs.length ? `${he} ${chs.length > 1 ? 'פרקים' : 'פרק'} ${chapList(chs)}` : he).join(' · ');
}
/** Apply niqqud-only corrections [{from,to}] to one halacha. Matching is done on NFC (the data mixes mark orders). */
export function applyErrata(text, list) {
  if (!list?.length) return { text, applied: [] };
  let t = text.normalize('NFC');
  const applied = [];
  for (const f of list) {
    // whole words only (a Hebrew letter or mark on either side means a different word); every occurrence
    const re = new RegExp(`(?<![\u05D0-\u05EA\u0591-\u05C7])${f.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\u05D0-\u05EA\u0591-\u05C7])`, 'g');
    if (re.test(t)) { t = t.replace(re, f.to); applied.push({ from: f.from, to: f.to }); }
  }
  return applied.length ? { text: t, applied } : { text, applied };
}
async function rambamDoc(plan, unit) {
  const idx = await data('rambam/index.json');
  let src = {}; try { src = await data('sources.json'); } catch { /* offline and not cached: no credit line */ }
  // source-checked niqqud corrections (verification/RAMBAM-ERRATA.md), applied as an overlay so the source data stays untouched
  let errata = {}; try { errata = (await data('rambam-errata.json')).fixes || {}; } catch { /* not cached offline: show the edition as is */ }
  const blocks = [], credits = [], fixes = [];
  for (const it of plan[unit]) {
    const meta = idx[it.name];
    for (const [c, a, b] of rambamChaptersFull(it, meta)) {
      const d = await data(`rambam/${meta.slug}/${c}.json`);
      const label = meta.he + (meta.depth === 2 ? ` – פרק ${gem(c)}` : '');
      // texts that do not come from the main edition (Torat Emet) are credited in the reader, chapter by chapter
      const ov = src.rambamChapterOverrides?.[`${it.name} ${c}`] || src.rambamOverrides?.[it.name];
      if (ov && !/Torat Emet/.test(ov.versionTitle) && !credits.some(x => x.label === label)) credits.push({ label, ...ov });
      blocks.push({ type: 'h', text: label });
      for (let s = a; s <= Math.min(b, d.s.length); s++) {
        if (!d.s[s - 1]?.trim()) continue;
        const id = `${meta.slug}.${c}.${s}`;
        const { text, applied } = applyErrata(d.s[s - 1], errata[id]);
        for (const f of applied) fixes.push({ id, label: `${label}, הלכה ${gem(s)}`, ...f });
        blocks.push({ type: 'p', id, num: gem(s), text, src: 'rambam', srcName: it.name, ...(applied.length ? { fixed: applied.length } : {}) });
      }
    }
  }
  return { title: UNITS[unit].full, subtitle: await rambamTitle(plan[unit]), blocks, credits, fixes };
}
export function buildDoc(plan, unit) {
  if (unit === 'chumash') return chumashDoc(plan);
  if (unit === 'tehillim') return tehillimDoc(plan);
  if (unit === 'tanya') return tanyaDoc(plan);
  return rambamDoc(plan, unit);
}
/** Short description of a unit's portion for the home cards. */
export async function describe(plan, unit) {
  if (unit === 'chumash') return plan.chumash.title;
  if (unit === 'tehillim') return plan.tehillim.title;
  if (unit === 'tanya') { const d = await tanyaDoc(plan); return d.blocks.find(b => b.type === 'h')?.text || d.subtitle; }  // with "(המשך)" like the reader (round 4)
  return rambamTitle(plan[unit]);
}
