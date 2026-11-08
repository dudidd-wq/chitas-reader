// 1.0.77: offline read-aloud build. Display/source paragraphs never change.
// Run fetch-hayomyom-rich.py first (public Nakdan, no key), then this script.
// Dicta's Acc0/Acc1 are primary stress, NOT the meteg on an artificial mater.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { nuclei, letters, HATAMA, stressFromAccents, stressKey } from '../site/js/g2p.js';
const root = new URL('../', import.meta.url).pathname;
const cache = process.env.HAYOM_RICH_CACHE || '/workspace/hayomyom/rich-cache';
const file = process.env.HAYOM_FILE || root + 'site/data/hayomyom/days.json';
const D = JSON.parse(fs.readFileSync(file));
const O = JSON.parse(fs.readFileSync(root + 'tools/data/hayomyom-pronunciation.json'));
const EXC = JSON.parse(fs.readFileSync(root + 'site/voice/stress-he.json')).exc;
const plain = s => s.replace(/<[^>]+>/g, '');
const sk = s => s.replace(/[^א-ת]/g, '');
export function cleanDicta(w) {
  // Meteg here is Dicta's silent-mater metadata, NOT primary stress. Piper
  // already skips these unpointed matres. An IPA A/B found deleting the mater
  // itself adds no benefit, so preserve source spelling and strip tags only.
  return w.replace(/[|\u05BD]/g, '');
}
export function markStress(w, k) {
  const L = letters(w), nu = nuclei(L);
  if (nu.length < 2 || k >= nu.length) return w;
  L[nu[nu.length - 1 - k].own].all += HATAMA;
  return L.map(l => l.ch + l.all).join('');
}
const stats = { paragraphs: 0, words: 0, stress: 0, dictaTags: 0, overrides: 0, quotes: 0 };
for (const e of Object.values(D)) for (const p of e.p) {
  const t = plain(p[0]);
  const hash = crypto.createHash('sha256').update(t).digest('hex');
  const r = JSON.parse(fs.readFileSync(path.join(cache, hash + '.json')));
  if (r.text !== t) throw Error('cache mismatch');
  let v = r.tokens.map(n => {
    if (n.sep || !/[א-ת]/.test(n.word) || /["'״׳]/.test(n.word)) return n.word;
    let w = cleanDicta(n.w); stats.words++;
    if (w !== n.w.replace(/\|/g, '')) stats.dictaTags++;
    const ov = O.words[w.normalize('NFC')];
    if (ov) { w = ov.text; stats.overrides++; }
    // Preserve already hand-verified exceptions instead of letting Dicta regress them.
    const k = ov?.stress ?? EXC[stressKey(w)] ?? (/^Acc[01]$/.test(n.acc) ? +n.acc.slice(-1) : null);
    if (k !== null) { w = markStress(w, k); if (w.includes(HATAMA)) stats.stress++; }
    return w;
  }).join('');
  // Explicitly contextual corrections, not skeleton-wide guesses about ambiguous words.
  for (const o of O.phrases) {
    const re = new RegExp(o.from.split(' ').map(w => [...w].map(c => c + '[\\u0591-\\u05C7]*').join('')).join('\\s+'), 'g');
    v = v.replace(re, m => { stats.overrides++; return (o.keepWords ? m.split(/\s+/).slice(0, o.keepWords).join(' ') + ' ' : '') + o.to; });
  }
  p[2] = v; stats.paragraphs++;
}
// Only exact, quoted 3+ word matches to a single Torah/Psalm verse. No paraphrases,
// no importing entire verses, no vocalizing unrelated prose from an ambiguous word lexicon.
const wanted = new Map();
for (const e of Object.values(D)) for (const p of e.p) for (const m of p[2].matchAll(/(?<![\u0591-\u05C7א-ת])"([^"\n]+)"/g)) {
  const ws = m[1].split(/\s+/); if (ws.length < 3 || ws.length > 20) continue;
  const key = ws.map(sk).join(' '); if (!wanted.has(key)) wanted.set(key, new Map());
}
function verses(x) {
  if (!x || typeof x !== 'object') return [];
  if (Array.isArray(x.v) && x.v.every(y => typeof y === 'string')) return x.v;
  return Object.values(x).flatMap(y => typeof y === 'object' ? verses(y) : []);
}
function scan(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, ent.name); if (ent.isDirectory()) { scan(f); continue; }
    if (!f.endsWith('.json')) continue;
    for (const v of verses(JSON.parse(fs.readFileSync(f)))) {
      const ws = plain(v).replace(/[\u05BE\u05C0\u05C3]/g, ' ').trim().split(/\s+/);
      for (const [key, choices] of wanted) {
        const ks = key.split(' ');
        for (let i = 0; i + ks.length <= ws.length; i++) if (ks.every((k, j) => sk(ws[i + j]) === k)) {
          const q = ws.slice(i, i + ks.length).map(w => {
            const k = stressFromAccents(w);
            const c = w.replace(/[\u0591-\u05AF\u05BD\u05C4\u05C5]/g, '');
            return k === null ? c : markStress(c, k);
          }).join(' ');
          choices.set(q.normalize('NFC'), q);
        }
      }
    }
  }
}
scan(root + 'site/data/torah'); scan(root + 'site/data/tehillim');
for (const e of Object.values(D)) for (const p of e.p) p[2] = p[2].replace(/(?<![\u0591-\u05C7א-ת])"([^"\n]+)"/g, (m, q) => {
  const choices = wanted.get(q.split(/\s+/).map(sk).join(' '));
  if (choices?.size !== 1) return m;
  stats.quotes++; return '"' + [...choices.values()][0] + '"';
});
fs.writeFileSync(file, JSON.stringify(D));
console.log(JSON.stringify(stats, null, 2));
