// Round 5: a few verified glosses for the Rambam, under the same two-check rule as the Torah/Tehillim glossary
// (verification/GLOSSARY-VERIFICATION.md, "Rambam (round 5)"). Step (a), mechanical, here:
//  a Hebrew-Wiktionary sense (no defect/quality template on the sense or the entry, short definition ≤ 4 words)
//  QUOTES A RAMBAM PASSAGE with the word in bold, and that quotation is found in OUR text: a run of at least 5
//  consecutive words around the bold word matches exactly one halacha in all of Mishneh Torah, and the source line of
//  the quotation names the same hilchot. The occurrence is pinned by the same neighbour rule as for verses.
// Step (b) is tools/gloss-rambam-xcheck.py (English Wiktionary lemma + an English translation of that halacha),
// then a manual review (tools/gloss-rambam-review.json). Output: /tmp/gr/cands.json
// Usage: node tools/gloss-rambam.mjs   (needs /tmp/wikt-cache.json from tools/build-glossary.mjs)
import fs from 'node:fs';
import { norm, cons } from '../site/js/hnorm.js';
import { qTokens } from './gloss-occ.mjs';
import { SENSE_FLAGS, ENTRY_FLAGS } from './gloss-flags.mjs';
import { cleanLemma } from './gloss-lemma.mjs';
const root = new URL('../site/data/', import.meta.url);
const rd = p => JSON.parse(fs.readFileSync(new URL(p, root)));
function clean(s) {
  let x = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '');
  for (let k = 0; k < 4; k++) x = x.replace(/\{\{[^{}]*\}\}/g, '');
  return x.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,3}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
function shortGloss(def) { // identical to tools/build-glossary.mjs
  const parts = def.split(/[.;:]\s*/).map(s => s.trim().replace(/^[,\s]+|[,\s]+$/g, '')).filter(Boolean);
  const p = parts[0];
  if (!p || p.split(' ').length > 4 || cons(p).length < 2 || /^(ראו|ראה|עיינו|כמו|הטיה|צורת|רק ב|שם פרטי|משמש|מילת|נדיר|ו)/.test(p) || /[{}[\]|=]/.test(p)) return null;
  return p;
}
const strip = t => t.replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ');
// 1. our Rambam text: halacha id → consonant tokens (same split as the reader)
const idx = rd('rambam/index.json');
const H = new Map(), bySlug = {};
for (const [name, m] of Object.entries(idx)) {
  bySlug[m.slug] = m;
  for (let c = 1; fs.existsSync(new URL(`rambam/${m.slug}/${c}.json`, root)); c++)
    rd(`rambam/${m.slug}/${c}.json`).s.forEach((t, i) => { if (t) H.set(`${m.slug}.${c}.${i + 1}`, { toks: strip(t).split(/[\s\u05BE]+/).map(norm).filter(n => cons(n).length > 1) }); });
}
for (const h of H.values()) h.cons = h.toks.map(t => cons(t).replace(/[ךםןףץ]$/, x => 'כמנפצ'['ךםןףץ'.indexOf(x)]));
const fold = c => c.replace(/[ךםןףץ]$/, x => 'כמנפצ'['ךםןףץ'.indexOf(x)]).replace(/[וי]/g, ''); // plene/defective spelling differs between editions
// index: folded token → halachot
const inv = new Map();
for (const [id, h] of H) { h.fold = h.cons.map(fold); for (const f of new Set(h.fold)) { if (!inv.has(f)) inv.set(f, []); inv.get(f).push(id); } }
// 2. Wiktionary senses quoting the Rambam
const cache = JSON.parse(fs.readFileSync('/tmp/wikt-cache.json'));
const QUOTE = /(?:\{\{(?:צט|הדגשה|ציטוט)\|([^{}]*?)\|([^{}|]*(?:רמב"ם|משנה תורה)[^{}]*)\}\})|(?:"([^"]+)"\s*\(([^)]*(?:רמב"ם|משנה תורה)[^)]*)\))|(?:^#:\*\s*([^{"]+'''[^{]*?)\s*\|?\s*\(?(רמב"ם[^)]*)\)?\s*$)/m;
const out = [], why = {};
const bump = k => { why[k] = (why[k] || 0) + 1; };
for (const page of Object.values(cache)) {
  if (!page) continue;
  const secs = page.c.split(/^==\s*([^=].*?)\s*==\s*$/m);
  const pageFlag = ENTRY_FLAGS.exec(secs[0])?.[1];
  for (let i = 1; i < secs.length; i += 2) {
    const head = secs[i].replace(/\{\{[^}]*\}\}/g, '').trim(), body = secs[i + 1];
    if (!/[\u05B0-\u05BB]/.test(head)) continue;
    const senses = body.split(/\n(?=#(?![:*#]))/).filter(x => /^#(?![:*#])/.test(x)).map(x => x.split(/\n(?=[^#])/)[0]);
    let outside = body; for (const x of senses) outside = outside.replace(x, '');
    const entryFlag = pageFlag || ENTRY_FLAGS.exec(outside)?.[1];
    for (const sense of senses) {
      for (const line of sense.split('\n').slice(1)) {
        if (!/רמב"ם|משנה תורה/.test(line) || !line.includes("'''")) continue;
        bump('quotes');
        const m = QUOTE.exec(line); if (!m) { bump('unparsed'); continue; }
        const q = m[1] || m[3] || m[5], srcTxt = m[2] || m[4] || m[6];
        if (/מורה נבוכים|פירוש המשנה|קבר/.test(srcTxt)) { bump('notMT'); continue; }
        const g = shortGloss(clean(sense.split('\n')[0].slice(1)));
        if (!g) { bump('noShortGloss'); continue; }
        const sf = SENSE_FLAGS.exec(sense), flag = sf ? 'sense: ' + sf[1] : entryFlag ? 'entry: ' + entryFlag : null;
        if (flag) { bump('flagged'); continue; }
        // locate: every bold token with ≥5-token exact run (folded consonants), unique halacha
        const qt = qTokens(q).map(t => ({ ...t, f: fold(t.c) }));
        for (let j = 0; j < qt.length; j++) {
          if (!qt[j].bold) continue;
          let a = j; while (a > 0 && !qt[a].gapBefore) a--;
          let b = j; while (b + 1 < qt.length && !qt[b + 1].gapBefore) b++;
          const run = qt.slice(a, b + 1), jj = j - a;
          const hits = [];
          for (const id of inv.get(run[jj].f) || []) {
            const hf = H.get(id).fold;
            for (let p = 0; p < hf.length; p++) {
              if (hf[p] !== run[jj].f) continue;
              // longest exact window containing the bold token
              let l = 0; while (jj - l - 1 >= 0 && hf[p - l - 1] === run[jj - l - 1].f) l++;
              let r = 0; while (jj + r + 1 < run.length && hf[p + r + 1] === run[jj + r + 1].f) r++;
              if (l + r + 1 >= Math.min(5, run.length) && run.length >= 5) hits.push({ id, p, n: l + r + 1 });
            }
          }
          if (!hits.length) { bump('notFound'); continue; }
          const best = Math.max(...hits.map(h => h.n)), top = hits.filter(h => h.n === best);
          if (top.length !== 1) { bump('notUnique'); continue; }
          const { id, p } = top[0], [slug, c] = id.split('.');
          const he = bySlug[slug].he.replace(/^הלכות /, '');
          if (!srcTxt.replace(/״/g, '"').includes(he.split(' ')[0])) { bump('hilchotMismatch'); continue; }
          const toks = H.get(id).toks, form = toks[p], k = toks.slice(0, p).filter(t => t === form).length + 1;
          const key = toks.filter(t => t === form).length > 1 ? `${form}#${k}` : form;
          bump('ok');
          out.push({ ref: `Rambam ${id}`, key, g, l: cleanLemma(head), page: page.title, src: `https://he.wiktionary.org/wiki/${encodeURIComponent(page.title)}#${encodeURIComponent(head.replace(/ /g, '_'))}`, q: q.slice(0, 300), source: srcTxt.trim(), run: best });
        }
      }
    }
  }
}
// one gloss per (ref, key): conflicting senses → dropped
const by = {}; for (const o of out) (by[`${o.ref}|${o.key}`] ??= []).push(o);
const cands = Object.values(by).filter(v => new Set(v.map(o => o.g)).size === 1).map(v => v[0]);
console.log(why, 'candidates', cands.length, 'conflicts dropped', Object.keys(by).length - cands.length);
fs.mkdirSync('/tmp/gr', { recursive: true });
fs.writeFileSync('/tmp/gr/cands.json', JSON.stringify({ stats: { ...why, conflicts: Object.keys(by).length - cands.length, candidates: cands.length }, cands }, null, 1));
