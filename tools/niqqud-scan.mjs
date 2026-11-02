// Round 6: count the vowel-mark repairs of site/js/niqqud.js over all shipped text (writes verification/niqqud-repairs.json).
import fs from 'node:fs'; import path from 'node:path';
import { fixWord, impossible } from '../site/js/niqqud.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), D = ROOT + '/site/data';
const res = {}, add = (src, ref, w, f, k) => { const r = res[src] ??= { words: 0, byKind: {}, leftImpossible: 0, examples: [], left: [] };
  if (k.length) { r.words++; for (const x of new Set(k)) r.byKind[x] = (r.byKind[x] || 0) + 1; r.examples.push({ ref, from: w, to: f, kinds: [...new Set(k)] }); }
  if (impossible(f)) { r.leftImpossible++; r.left.push({ ref, word: f }); } };
const words = s => s.replace(/<[^>]*>/g, ' ').normalize('NFC').match(/[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7]*/g) || [];
const scan = (src, ref, s) => { for (const w of words(s)) { const [f, k] = fixWord(w); if (k.length || impossible(f)) add(src, ref, w, f, k); } };
const ls = d => fs.readdirSync(d).filter(x => !x.endsWith('.json') || fs.statSync(d + '/' + x).isFile() && !/index|meta/.test(x));
const dirs = d => fs.readdirSync(d).filter(x => fs.statSync(d + '/' + x).isDirectory());
for (const b of dirs(D + '/torah')) for (const f of ls(`${D}/torah/${b}`)) { const j = JSON.parse(fs.readFileSync(`${D}/torah/${b}/${f}`)); const c = f.slice(0, -5);
  j.v.forEach((v, i) => scan('torah', `${b} ${c}:${i + 1}`, v)); (j.r || []).forEach((rs, i) => (rs || []).forEach(r => scan('rashi', `${b} ${c}:${i + 1}`, r))); }
for (const f of ls(D + '/tehillim')) { const j = JSON.parse(fs.readFileSync(`${D}/tehillim/${f}`)); (j.v || j).forEach?.((v, i) => typeof v === 'string' && scan('tehillim', `Psalms ${f.slice(0, -5)}:${i + 1}`, v)); }
for (const b of dirs(D + '/tanya')) for (const f of ls(`${D}/tanya/${b}`)) { const j = JSON.parse(fs.readFileSync(`${D}/tanya/${b}/${f}`)); (j.s || j.v || []).forEach((v, i) => scan('tanya', `${b} ${f.slice(0, -5)}:${i + 1}`, v)); }
for (const b of ls(D + '/rambam')) { if (!fs.statSync(`${D}/rambam/${b}`).isDirectory()) continue; for (const f of ls(`${D}/rambam/${b}`)) { const j = JSON.parse(fs.readFileSync(`${D}/rambam/${b}/${f}`)); (j.s || []).forEach((v, i) => scan('rambam', `${b}.${f.slice(0, -5)}.${i + 1}`, v)); } }
const meta = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { words: v.words, byKind: v.byKind, leftImpossible: v.leftImpossible }]));
fs.writeFileSync(ROOT + '/verification/niqqud-repairs.json', JSON.stringify({ meta, detail: res }, null, 1));
console.log(JSON.stringify(meta));
