// Builds site/voice/stress-he.json – the stress data of the local voice (loaded only after the user installs it):
//   exc: hand-checked exceptions (tools/data/stress-exceptions.tsv), lex: words whose stress the suffix model gets
//   wrong, suf: word endings → stressed nucleus from the end, qk: words with a qamatz katan verified in the edition.
// Learnt from the cantillation accents of the Torah and Tehillim in site/data (CC BY / public domain texts).
// Usage: node tools/build-voice-stress.mjs [--eval]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { stressFromAccents, stressKey, nuclei, normalize, QAMATZ, QAMATZ_KATAN, predictStress } from '../site/js/g2p.js';

const ROOT = new URL('..', import.meta.url).pathname, MAXN = 6, MINC = 2;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
function cleanVerse(v) {
  v = v.replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').replace(/\u034F/g, '').replace(/[\u05BE\u05C0|]/g, ' ').replace(/\u05C3/g, '.');
  return v.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}
export function corpus(books = ['torah', 'tehillim']) {
  const rows = [];
  for (const book of books) for (const f of walk(path.join(ROOT, 'site/data', book)).filter(f => f.endsWith('.json') && !f.endsWith('index.json')).sort()) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const v of d.v || []) if (typeof v === 'string') rows.push({ book, words: cleanVerse(v).split(' ').map(t => t.replace(/[^\u05D0-\u05EA\u0591-\u05C7]/g, '')).filter(w => /[\u05D0-\u05EA]/.test(w)) });
  }
  return rows;
}
const clusters = k => k.match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g) || [];
const maj = c => { let b = null, n = -1; for (const [k, v] of c) if (v > n) { b = k; n = v; } return b; };   // ties: first seen
const inc = (m, k, g) => { let c = m.get(k); if (!c) m.set(k, c = new Map()); c.set(g, (c.get(g) || 0) + 1); };

export function fit(pairs) {
  const lex = new Map(), suf = new Map();
  for (const [w, g] of pairs) {
    const n = stressKey(w); inc(lex, n, g);
    const cs = clusters(n); for (let k = 1; k <= Math.min(MAXN, cs.length); k++) inc(suf, cs.slice(-k).join(''), g);
  }
  // suffixes: keep one only if its majority differs from what the walk would give without it (lossless)
  const keys = [...suf.keys()].filter(s => [...suf.get(s).values()].reduce((a, b) => a + b, 0) >= MINC).sort((a, b) => clusters(a).length - clusters(b).length);
  const kept = {};
  for (const s of keys) {
    const cs = clusters(s); let fb = 0;
    for (let k = cs.length - 1; k > 0; k--) { const t = cs.slice(-k).join(''); if (t in kept) { fb = kept[t]; break; } }
    const m = maj(suf.get(s)); if (m !== fb) kept[s] = m;
  }
  const model = { suf: kept, maxn: MAXN };
  const lexOut = {};
  for (const [n, c] of lex) { const m = maj(c); if (predictStress(n, model)[0] !== m) lexOut[n] = m; }
  return { lex: lexOut, suf: kept, maxn: MAXN };
}
function exceptions() {
  const f = path.join(ROOT, 'tools/data/stress-exceptions.tsv'), out = {};
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const [w, k] = line.split('#')[0].trim().split(/\s+/); if (w && k !== undefined) out[stressKey(w)] = +k;
  }
  return out;
}
function qamatzKatan(rows) {
  const qk = new Map(), plain = new Set();
  for (const r of rows) for (const w0 of r.words) {
    const w = normalize(w0.replace(/[\u0591-\u05AF\u05BD]/g, ''));
    const key = stressKey(w);
    const L = w.match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g) || [];
    const idx = L.map((c, i) => c.includes(QAMATZ_KATAN) ? i : -1).filter(i => i >= 0);
    if (idx.length) { const prev = qk.get(key); qk.set(key, prev && prev.join() !== idx.join() ? null : idx); }
    else if (L.some(c => c.includes(QAMATZ))) plain.add(key);
  }
  const out = {}, isKol = k => /^(ו|ש|ה|וש)?(ב|ל|מ|כ)?כל$/.test(k.replace(/[^\u05D0-\u05EA]/g, ''));
  for (const [k, v] of qk) if (v && !plain.has(k) && !isKol(k)) out[k] = v;
  // the same form without a one-letter prefix (ו ב ל כ with shva, ה with patah): the prefix does not change the stem's vowels
  for (const [k, v] of Object.entries(out)) {
    const m = /^([בכ]\u05B0\u05BC|[ובלכ]\u05B0|ה\u05B7)/.exec(k);
    if (!m || v.some(i => i < 1)) continue;
    const stem = k.slice(m[0].length);
    if (!(stem in out) && !plain.has(stem) && !qk.has(stem) && !isKol(stem)) out[stem] = v.map(i => i - 1);
  }
  // hand-checked additions (tools/data/qamatz-katan-extra.tsv): the qamatz before the first shva
  for (const line of fs.readFileSync(path.join(ROOT, 'tools/data/qamatz-katan-extra.tsv'), 'utf8').split('\n')) {
    const w = line.split('#')[0].trim(); if (!w) continue;
    const L = normalize(w).match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g);
    const i = L.findIndex((c, j) => c.includes(QAMATZ) && L[j + 1]?.includes('\u05B0'));
    if (i < 0) throw new Error('qamatz-katan-extra: no qamatz before a shva in ' + w);
    out[stressKey(w)] = [i];
  }
  return out;
}

/** site/js/voice-files.js: the voice's files, their sizes and a content hash (the cache key of the stress data). */
export function writeVoiceFiles() {
  const V = path.join(ROOT, 'site/voice'), size = f => fs.statSync(path.join(V, f)).size;
  const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(V, f))).digest('hex').slice(0, 12);
  const files = { ort: 'ort/ort.wasm.bundle.min.mjs', wasm: 'ort/ort-wasm-simd-threaded.wasm', config: 'he_IL-noa-medium.onnx.json', stress: 'stress-he.json', full: 'he_IL-noa-medium.onnx', int8: 'he_IL-noa-medium-int8.onnx' };
  const out = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { url: `voice/${f}?v=${hash(f)}`, size: size(f) }]));
  fs.writeFileSync(path.join(ROOT, 'site/js/voice-files.js'), `// Generated by tools/build-voice-stress.mjs – the local voice's files (downloaded only after the user asks for them).\n` +
    `// ?v= is a content hash: a changed file gets a new cache entry, unchanged files stay installed.\nexport const VOICE_FILES = ${JSON.stringify(out, null, 2)};\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = corpus();
  const pairs = rows.flatMap(r => r.words.map(w => [w, stressFromAccents(w)]).filter(p => p[1] !== null));
  if (process.argv.includes('--eval')) {   // held-out check: learn from one book, test on the other
    for (const [tr, te] of [['torah', 'tehillim'], ['tehillim', 'torah']]) {
      const P = b => rows.filter(r => r.book === b).flatMap(r => r.words.map(w => [w, stressFromAccents(w)]).filter(p => p[1] !== null));
      const m = fit(P(tr)), test = P(te);
      const ok = test.filter(([w, g]) => predictStress(w, m)[0] === g).length, okNoLex = test.filter(([w, g]) => predictStress(w, { suf: m.suf, maxn: m.maxn })[0] === g).length;
      console.log(`learn ${tr} → test ${te}: ${(ok / test.length * 100).toFixed(1)}% (suffixes only ${(okNoLex / test.length * 100).toFixed(1)}%), milra baseline ${(test.filter(p => p[1] === 0).length / test.length * 100).toFixed(1)}%, n=${test.length}`);
    }
  }
  const m = fit(pairs);
  const data = { v: 1, source: 'Torah + Tehillim cantillation (site/data), tools/build-voice-stress.mjs', exc: exceptions(), ...m, qk: qamatzKatan(rows) };
  const s = JSON.stringify(data);
  fs.writeFileSync(path.join(ROOT, 'site/voice/stress-he.json'), s);
  writeVoiceFiles();
  console.log(`pairs ${pairs.length}; exc ${Object.keys(data.exc).length}, lex ${Object.keys(m.lex).length}, suf ${Object.keys(m.suf).length}, qk ${Object.keys(data.qk).length}; ${(s.length / 1024).toFixed(0)} KB`);
}
