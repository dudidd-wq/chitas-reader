// Builds site/data/glossary.json: light glosses (a few words) for words of Chumash and Tehillim,
// taken ONLY from Hebrew Wiktionary (CC BY-SA 4.0). Nothing is written by hand or generated.
// Precision first — a wrong gloss is worse than none. Two strictly mechanical rules (see NOTES.md):
//  A. Tanakh (Chumash, Tehillim): a word gets a gloss only when a Wiktionary sense explicitly quotes THIS verse
//     (template {{צט/תנ"ך|…|book|chapter|verse}}) with this very word in bold. The gloss is that sense's definition.
//  (A context-free rule for Rashi/Tanya/Rambam was tried — unique archaic headword with a single sense — and REJECTED
//   after manual review: homographs like קליפה/חשש/גבה got the wrong sense. Those texts therefore have no glosses.)
//  The gloss is a short clause (≤ 4 words) copied verbatim from the definition; longer ones are skipped.
// Usage: node tools/build-glossary.mjs   (Wiktionary pages cached in /tmp/wikt-cache.json)
import fs from 'node:fs';
const root = new URL('../site/', import.meta.url);
const realFetch = globalThis.fetch;
globalThis.fetch = async p => { if (/^https?:/.test(p)) return realFetch(p, { headers: { 'User-Agent': 'chitas-reader-build/1.0 (https://github.com/dudidd-wq/chitas-reader)' } }); const f = new URL(p, root); return { ok: fs.existsSync(f), json: async () => JSON.parse(fs.readFileSync(f)) }; };

import { norm, cons } from '../site/js/hnorm.js';
const PREF = 'והבלמכש';
function variants(n) {
  const out = [n]; let w = n;
  for (let i = 0; i < 2; i++) {
    if (!PREF.includes(w[0])) break;
    w = w.replace(/^[\u05D0-\u05EA][\u05B0-\u05C2]*/, '');
    if (cons(w).length < 2) break; out.push(w);
  }
  return out;
}
const strip = t => t.replace(/<[^>]+>/g, ' ').replace(/\{[פס]\}/g, ' ').replace(/\([^)]*\)/g, ' ');
const fin = t => t.replace(/כ$/, 'ך').replace(/מ$/, 'ם').replace(/נ$/, 'ן').replace(/פ$/, 'ף').replace(/צ$/, 'ץ');

// 1. collect the words of every verse of the Torah and Tehillim (glosses are verse-anchored, so no date window is needed)
const verses = new Map(); // 'Book c:v' → Set(norm)
const add = (book, c, v, t) => { for (const w of strip(t).split(/[\s\u05BE]+/)) { const n = norm(w); if (cons(n).length < 2 || !/[\u05B0-\u05BB]/.test(n)) continue; const k = `${book} ${c}:${v}`; if (!verses.has(k)) verses.set(k, new Set()); verses.get(k).add(n); } };
for (const book of ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'])
  for (let c = 1; fs.existsSync(new URL(`data/torah/${book}/${c}.json`, root)); c++) JSON.parse(fs.readFileSync(new URL(`data/torah/${book}/${c}.json`, root))).v.forEach((t, i) => add(book, c, i + 1, t));
for (let c = 1; c <= 150; c++) JSON.parse(fs.readFileSync(new URL(`data/tehillim/${c}.json`, root))).v.forEach((t, i) => add('Psalms', c, i + 1, t));
console.log('verses', verses.size);

// 2. fetch Wiktionary pages (cached in /tmp)
const T = new Set();
for (const n of [...verses.values()].flatMap(x => [...x])) for (const v of variants(n)) T.add(fin(cons(v)));
const cacheF = '/tmp/wikt-cache.json';
const cache = fs.existsSync(cacheF) ? JSON.parse(fs.readFileSync(cacheF)) : {};
const todo = [...T].filter(t => !(t in cache));
console.log('titles', T.size, 'to fetch', todo.length);
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const u = 'https://he.wiktionary.org/w/api.php?action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=' + encodeURIComponent(batch.join('|'));
  let j; for (let k = 0; k < 4; k++) { try { const r = await fetch(u); if (r.ok) { j = await r.json(); break; } } catch {} await new Promise(r => setTimeout(r, 3000)); }
  if (!j) { console.log('failed batch', i); continue; }
  const redir = Object.fromEntries((j.query.redirects || []).map(r => [r.to, r.from]));
  for (const t of batch) cache[t] = null;
  for (const p of j.query.pages) { const c = p.revisions?.[0]?.slots?.main?.content || null; cache[redir[p.title] || p.title] = c ? { title: p.title, c } : null; }
  if (i % 1000 === 0) fs.writeFileSync(cacheF, JSON.stringify(cache));
  await new Promise(r => setTimeout(r, 400));
}
fs.writeFileSync(cacheF, JSON.stringify(cache));

// 3. parse entries
const REG = /\{\{(רובד\|[^}]*(מקרא|חז"ל|חז״ל|ארמית|ספרותי|ארכאי|גבוה|ימי הביניים)[^}]*|מקרא|ארמית|לשון חז"ל|חז"ל|ספרותי|ארכאי|גבוה|תלמוד|משנה)\}\}/;
function clean(s) {
  let x = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '');
  for (let k = 0; k < 4; k++) x = x.replace(/\{\{[^{}]*\}\}/g, '');
  return x.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,3}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
function shortGloss(def) {
  const parts = def.split(/[.;:]\s*/).map(s => s.trim().replace(/^[,\s]+|[,\s]+$/g, '')).filter(Boolean);
  const p = parts[0]; // first clause only — never a fragment from mid-definition
  if (!p || p.split(' ').length > 4 || cons(p).length < 2 || /^(ראו|ראה|עיינו|כמו|הטיה|צורת|רק ב|שם פרטי|משמש|מילת|נדיר|ו)/.test(p) || /[{}[\]|=]/.test(p)) return null;
  return p;
}
const BOOKS = { 'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'תהלים': 'Psalms', 'תהילים': 'Psalms' };
const GV = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
const gnum = s => /^\s*\d+\s*$/.test(s) ? +s : [...s.replace(/[^א-ת]/g, '')].reduce((a, c) => a + (GV[c] || 0), 0);
const byVerse = {};        // ref → {form: rec}
for (const page of Object.values(cache)) {
  if (!page) continue;
  const secs = page.c.split(/^==\s*([^=].*?)\s*==\s*$/m);
  const heads = [];
  for (let i = 1; i < secs.length; i += 2) {
    const head = secs[i].replace(/\{\{[^}]*\}\}/g, '').trim(), body = secs[i + 1];
    if (!/[\u05B0-\u05BB]/.test(head)) continue;
    heads.push(norm(head));
    const senses = body.split(/\n(?=#(?![:*#]))/).filter(x => /^#(?![:*#])/.test(x)).map(x => x.split(/\n(?=[^#])/)[0]);
    senses.forEach((sense, si) => {
      const def = sense.split('\n')[0];
      const g = shortGloss(clean(def.slice(1)));
      if (!g) return;
      const rec = { g, l: head, src: `https://he.wiktionary.org/wiki/${encodeURIComponent(page.title)}#${encodeURIComponent(head.replace(/ /g, '_'))}` };
      if (REG.test(def) || si > 0) for (const m of sense.matchAll(/\{\{צט\/תנ"ך\|([^{}]*)\}\}/g)) {
        const f = m[1].split('|'); if (f.length < 4) continue;
        const book = BOOKS[f[1].trim()]; if (!book) continue;
        const ref = `${book} ${gnum(f[2])}:${gnum(f[3])}`;
        for (const b of f[0].matchAll(/'''([^']+)'''/g)) { const nf = norm(b[1]); if (cons(nf).length >= 2) (byVerse[ref] ??= {})[nf] = rec; }
      }
    });
  }
}
// 4. match
const outV = {}; let matchedV = 0, tokV = 0;
for (const [ref, set] of verses) {
  tokV += set.size;
  const cand = byVerse[ref]; if (!cand) continue;
  for (const n of set) {
    const hit = cand[n] || variants(n).slice(1).filter(v => cons(v).length >= 3).map(v => cand[v]).find(Boolean);
    if (hit) { (outV[ref] ??= {})[n] = hit; matchedV++; }
  }
}
const res = {
  meta: { source: 'ויקימילון העברי (he.wiktionary.org)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', built: new Date().toISOString().slice(0, 10), scope: 'Torah + Tehillim (all verses)',
    stats: { tanakh: { verses: verses.size, verseWordForms: tokV, glossed: matchedV, versesWithGloss: Object.keys(outV).length } } },
  verses: outV,
};
fs.writeFileSync(new URL('data/glossary.json', root), JSON.stringify(res));
console.log(JSON.stringify(res.meta.stats));
