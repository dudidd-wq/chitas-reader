// Builds site/voice/stress-he.json – the stress data of the local voice (loaded only after the user installs it):
//   exc: hand-checked exceptions (tools/data/stress-exceptions.tsv), lex: words whose stress the suffix model gets
//   wrong, suf: word endings → stressed nucleus from the end, qk: words with a qamatz katan verified in the edition.
// Learnt from the cantillation accents of the Torah, Tehillim, and Nach (including Biblical Aramaic in
// Daniel and Ezra) in site/data (CC BY / public domain texts). Suffixes stay on Torah + Tehillim so common
// rabbinic words (אלא, אפילו, …) are not flipped by Nach-only endings. The lexicon and the qamatz-katan
// list also take consistent Nach (and Biblical Aramaic) forms. Torah/Tehillim counts win on a shared key.
// Nach-only CāCaC (qamatz+patah) milel is omitted: that pattern is the Hebrew 3ms Qal verb (milra), and a Nach noun, name or pausal would flip unaccented טָעַם / גָּעַשׁ / רָחַם.
// Nach-only CaCaC (patah+patah) milra is omitted: that pattern is the Hebrew segolate noun (milel), and a Nach construct such as פַּחַת "governor of" would flip unaccented פַּחַת "pit / depreciation".
// nach/Psalms is skipped when Tehillim is already in the corpus, so the two editions are not mixed.
// Usage: node tools/build-voice-stress.mjs [--eval] [--eval-only]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { stressFromAccents, stressKey, nuclei, normalize, QAMATZ, QAMATZ_KATAN, PATAH, predictStress, accentWords } from '../site/js/g2p.js';

const ROOT = new URL('..', import.meta.url).pathname, MAXN = 6, MINC = 2;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
function cleanVerse(v) {
  v = v.replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').replace(/\u034F/g, '').replace(/[\u05C0|]/g, ' ');
  return v.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}
export function corpus(books = ['torah', 'tehillim', 'nach'], { skipNachPsalms = true } = {}) {
  const rows = [];
  const dataRoot = path.join(ROOT, 'site/data');
  for (const book of books) {
    const root = path.join(dataRoot, book);
    if (!fs.existsSync(root)) continue;
    for (const f of walk(root).filter(f => f.endsWith('.json') && !f.endsWith('index.json')).sort()) {
      const parts = path.relative(dataRoot, f).split(path.sep);
      const work = parts[0] === 'nach' ? 'nach/' + parts[1] : parts[0];
      if (skipNachPsalms && work === 'nach/Psalms') continue;
      const d = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const v of d.v || []) if (typeof v === 'string') {
        const tokens = accentWords(cleanVerse(v));
        rows.push({ book: work, words: tokens.map(t => t.word), stresses: tokens.map(t => t.joined ? null : stressFromAccents(t.word, { allowOle: false })), joined: tokens.map(t => !!t.joined) });
      }
    }
  }
  return rows;
}

export const isNach = b => String(b).startsWith('nach/');
export const isAramaicBook = b => b === 'nach/Daniel' || b === 'nach/Ezra';

/** Held-out accuracy and decision-source counts. pairs are [word, goldK]. */
export function scorePairs(pairs, model) {
  let ok = 0, n = 0;
  const src = {}, srcOk = {};
  for (const [w, g] of pairs) {
    if (g === null || g === undefined) continue;
    const [pred, s] = predictStress(w, model);
    n++;
    src[s] = (src[s] || 0) + 1;
    if (pred === g) { ok++; srcOk[s] = (srcOk[s] || 0) + 1; }
  }
  return { n, ok, pct: n ? ok / n * 100 : 0, src, srcOk };
}

/** Retracted accent (nesiga): a non-milra gold immediately before a word stressed on its first syllable. */
export function isNesigaAt(r, i) {
  const g = r.stresses[i];
  if (g === null || g === undefined || g === 0) return false;
  if (i + 1 >= r.words.length) return false;
  const next = r.words[i + 1];
  const nNu = nuclei(stressKey(next)).length;
  // A following monosyllable (עֹשֵׁק דָּל, לְהִנָּתֵן דָּת) is the classic nesiga environment,
  // even when stressFromAccents returns null because of a prepositive accent.
  if (nNu <= 1) return true;
  const ng = r.stresses[i + 1];
  if (ng === null || ng === undefined) return false;
  return ng === nNu - 1;
}

export function pairsOf(rows, pred = () => true, { skipNesiga = false } = {}) {
  return rows.filter(r => pred(r.book)).flatMap(r => r.words.map((w, i) => {
    if (r.stresses[i] === null) return null;
    if (skipNesiga && isNesigaAt(r, i)) return null;
    return [w, r.stresses[i]];
  }).filter(Boolean));
}

function fmtScore(label, s) {
  const src = Object.keys(s.src).sort().map(k => {
    const n = s.src[k], ok = s.srcOk[k] || 0;
    return `${k} ${ok}/${n}`;
  }).join(', ');
  return `${label}: ${s.pct.toFixed(1)}% (n=${s.n}${src ? '; ' + src : ''})`;
}
const clusters = k => k.match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g) || [];
/** Bare 3ms Qal shape CāCaC (qamatz + patah). Nach-only milel on this pattern is a noun, name, or pausal, and would flip the common unaccented Hebrew verb. */
export function isCacaC(n) {
  const cs = clusters(n);
  if (cs.length !== 3) return false;
  const vow = c => c.slice(1).replace(/[\u05BC\u05C1\u05C2\u05BF\u05BD]/g, '');
  return vow(cs[0]) === QAMATZ && vow(cs[1]) === PATAH && vow(cs[2]) === '';
}
/** Bare segolate shape CaCaC (patah + patah). Nach-only milra on this pattern is a construct or loan (פַּחַת "governor of"), and would flip the common unaccented Hebrew noun ("pit / depreciation", milel). */
export function isCacaCPatah(n) {
  const cs = clusters(n);
  if (cs.length !== 3) return false;
  const vow = c => c.slice(1).replace(/[\u05BC\u05C1\u05C2\u05BF\u05BD]/g, '');
  return vow(cs[0]) === PATAH && vow(cs[1]) === PATAH && vow(cs[2]) === '';
}
const maj = c => { let b = null, n = -1; for (const [k, v] of c) if (v > n) { b = k; n = v; } return b; };   // ties: first seen
const majStrict = c => { const vals = [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]); if (!vals.length) return null; if (vals.length > 1 && vals[0][1] === vals[1][1]) return null; return vals[0][0]; };
const inc = (m, k, g) => { let c = m.get(k); if (!c) m.set(k, c = new Map()); c.set(g, (c.get(g) || 0) + 1); };

export function fit(pairs, { sufPairs, lexPriorityPairs } = {}) {
  const lex = new Map(), suf = new Map();
  for (const [w, g] of (sufPairs || pairs)) {
    const n = stressKey(w);
    const cs = clusters(n); for (let k = 1; k <= Math.min(MAXN, cs.length); k++) inc(suf, cs.slice(-k).join(''), g);
  }
  for (const [w, g] of pairs) inc(lex, stressKey(w), g);
  if (lexPriorityPairs) {
    const pri = new Map();
    for (const [w, g] of lexPriorityPairs) inc(pri, stressKey(w), g);
    for (const [n, c] of pri) lex.set(n, c);
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
  const priKeys = lexPriorityPairs ? new Set([...lexPriorityPairs].map(([w]) => stressKey(w))) : null;
  const lexOut = {};
  for (const [n, c] of lex) {
    // Nach-only keys: skip ties (e.g. מְבָרֵךְ Isaiah vs Proverbs) and hapaxes. A single Daniel form
    // of מַנִּי would otherwise force Gemara "who?" from milel to milra. Torah/Tehillim keys keep
    // the historical first-seen majority so the existing lex set does not shift.
    const total = [...c.values()].reduce((a, b) => a + b, 0);
    const fromPri = !priKeys || priKeys.has(n);
    const m = fromPri ? maj(c) : majStrict(c);
    if (m === null || m === undefined) continue;
    if (!fromPri && total < 2) continue;
    // טָעַם (Proverbs noun "sense" vs Samuel verb "he tasted"), גָּעַשׁ (place-name "Gaash"), רָחַם ("womb"):
    // a Nach-only milel CāCaC would force the everyday 3ms Qal from milra to milel. Te'amim already
    // cover those Biblical verses. Milra CāCaC such as כָּתַב is still added (it corrects a suffix miss).
    if (!fromPri && m === 1 && isCacaC(n)) continue;
    // פַּחַת / פַחַת: Nach construct "governor of" (Haggai, Ezra) is milra; the everyday
    // Hebrew segolate noun "pit / depreciation" is milel (suf2). Te'amim already cover
    // those Biblical verses. Milel CaCaC such as זַעַם / רַעַשׁ is still added.
    if (!fromPri && m === 0 && isCacaCPatah(n)) continue;
    if (predictStress(n, model)[0] !== m) lexOut[n] = m;
  }
  return { lex: lexOut, suf: kept, maxn: MAXN };
}
function exceptions() {
  const f = path.join(ROOT, 'tools/data/stress-exceptions.tsv'), out = {}, force = {};
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const parts = line.split('#')[0].trim().split(/\s+/); const [w, k, flag] = parts;
    if (w && k !== undefined) {
      const key = stressKey(w); out[key] = +k;
      if (flag === 'force') force[key] = +k;
    }
  }
  return { exc: out, excForce: force };
}
function collectQamatz(rows, { skipJoined = false } = {}) {
  const qk = new Map(), plain = new Set(), qkCount = new Map();
  for (const r of rows) r.words.forEach((w0, i) => {
    if (skipJoined && r.joined && r.joined[i]) return;
    const w = normalize(w0.replace(/[\u0591-\u05AF\u05BD]/g, ''));
    const key = stressKey(w);
    const L = w.match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g) || [];
    const idx = L.map((c, j) => c.includes(QAMATZ_KATAN) ? j : -1).filter(j => j >= 0);
    if (idx.length) { const prev = qk.get(key); qk.set(key, prev && prev.join() !== idx.join() ? null : idx); qkCount.set(key, (qkCount.get(key) || 0) + 1); }
    else if (L.some(c => c.includes(QAMATZ))) plain.add(key);
  });
  return { qk, plain, qkCount };
}

/** Stems of a prefixed form, matching markQamatzKatan's one-letter prefix strip in g2p.js. */
function stemsOf(key) {
  const m = /^[ובלכהמש][\u05B0-\u05BC\u05C1\u05C2]*/.exec(key);
  if (!m) return [];
  const st = key.slice(m[0].length);
  if (!st) return [];
  const l = st[0], rest = st.slice(1), DAGESH = '\u05BC', SORT = s => [...s].sort().join('');
  return [st, l + rest.replace(/^([\u05B0-\u05C7]*?)\u05BC/, '$1'), l + SORT(DAGESH + (rest.match(/^[\u05B0-\u05C7]*/)[0] || '')) + rest.replace(/^[\u05B0-\u05C7]*/, '')];
}

function prefixPlainBlocks(k, plain) {
  if (plain.has(k)) return true;
  for (const p of plain) if (stemsOf(p).includes(k)) return true;
  return false;
}

function qamatzKatan(rows, { skipJoined = false } = {}) {
  const { qk, plain } = collectQamatz(rows, { skipJoined });
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
  const files = { ort: 'ort/ort.wasm.bundle.min.mjs', wasm: 'ort/ort-wasm-simd-threaded.wasm', config: 'he_IL-noa-medium.onnx.json', stress: 'stress-he.json', full: 'he_IL-noa-medium.onnx', int8: 'he_IL-noa-medium-int8.onnx',
    // 1.0.88: optional real male voice (notmax123/piper-medium-heb, CC BY-NC 4.0), downloaded only when chosen
    naturalConfig: 'he_IL-ilspeech-male-medium.onnx.json', natural: 'he_IL-ilspeech-male-medium.onnx' };
  const out = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { url: `voice/${f}?v=${hash(f)}`, size: size(f) }]));
  fs.writeFileSync(path.join(ROOT, 'site/js/voice-files.js'), `// Generated by tools/build-voice-stress.mjs – the local voice's files (downloaded only after the user asks for them).\n` +
    `// ?v= is a content hash: a changed file gets a new cache entry, unchanged files stay installed.\nexport const VOICE_FILES = ${JSON.stringify(out, null, 2)};\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rowsTt = corpus(['torah', 'tehillim']);
  const rowsAll = corpus(); // torah + tehillim + nach, skip Psalms
  const evalOnly = process.argv.includes('--eval-only') || process.argv.includes('--eval');
  if (evalOnly) {
    const Ptt = b => pairsOf(rowsTt, x => x === b);
    for (const [tr, te] of [['torah', 'tehillim'], ['tehillim', 'torah']]) {
      const m = fit(Ptt(tr)), test = Ptt(te);
      const s = scorePairs(test, m), sufOnly = scorePairs(test, { suf: m.suf, maxn: m.maxn });
      const milra = test.filter(p => p[1] === 0).length / test.length * 100;
      console.log(`learn ${tr} → test ${te}: ${s.pct.toFixed(1)}% (suffixes only ${sufOnly.pct.toFixed(1)}%), milra baseline ${milra.toFixed(1)}%, n=${s.n}`);
    }
    const nachPairs = pairsOf(rowsAll, isNach);
    const aramPairs = pairsOf(rowsAll, isAramaicBook);
    const ttPairs = pairsOf(rowsTt);
    const base = fit(ttPairs);
    const conservative = (pairs) => fit(pairs, { sufPairs: ttPairs, lexPriorityPairs: ttPairs });
    const nachPairsLex = pairsOf(rowsAll, isNach, { skipNesiga: true });
    console.log(fmtScore('baseline (torah+tehillim) → nach', scorePairs(nachPairs, base)));
    console.log(fmtScore('baseline (torah+tehillim) → Daniel+Ezra', scorePairs(aramPairs, base)));
    console.log(fmtScore('conservative in-sample → nach', scorePairs(nachPairs, conservative(pairsOf(rowsAll)))));
    console.log(fmtScore('conservative in-sample → Daniel+Ezra', scorePairs(aramPairs, conservative(pairsOf(rowsAll)))));
    const hold = new Set(['nach/Daniel', 'nach/Ezra', 'nach/Isaiah', 'nach/Jeremiah']);
    const consHold = conservative(pairsOf(rowsAll, b => !hold.has(b)));
    console.log(fmtScore('conservative held-out → Daniel+Ezra+Isaiah+Jeremiah', scorePairs(pairsOf(rowsAll, b => hold.has(b)), consHold)));
    console.log(fmtScore('conservative held-out → Daniel+Ezra', scorePairs(aramPairs, consHold)));
    for (const book of ['nach/Daniel', 'nach/Ezra']) {
      console.log(fmtScore(`conservative LOO → ${book}`, scorePairs(pairsOf(rowsAll, b => b === book), conservative(pairsOf(rowsAll, b => b !== book)))));
    }
    console.log(fmtScore('conservative in-sample torah+tehillim (sanity)', scorePairs(ttPairs, conservative(pairsOf(rowsAll)))));
    console.log(fmtScore('baseline in-sample torah+tehillim (sanity)', scorePairs(ttPairs, base)));
    if (process.argv.includes('--eval-only')) process.exit(0);
  }
  const pairs = pairsOf(rowsAll, () => true, { skipNesiga: true });
  const m = fit(pairs, { sufPairs: pairsOf(rowsTt), lexPriorityPairs: pairsOf(rowsTt) });
  const { exc, excForce } = exceptions();
  // Qamatz katan: keep every Torah/Tehillim entry even if a Nach verse writes the same key with a
  // regular qamatz (that used to drop חָכְמָה). Add Nach-only keys that the same "never plain" rule
  // accepts, but skip maqaf-joined tokens and keys whose prefixed forms appear with a regular qamatz
  // (חָרָבָה would otherwise turn Torah בֶּחָרָבָה / לֶחָרָבָה into choravah).
  const qkTt = qamatzKatan(rowsTt);
  const qk = { ...qkTt };
  const lettersOf = k => [...k].filter(c => c >= 'א' && c <= 'ת').length;
  const { plain: plainAll, qkCount } = collectQamatz(rowsAll, { skipJoined: true });
  for (const [k, v] of Object.entries(qamatzKatan(rowsAll, { skipJoined: true }))) {
    if (k in qk) continue;
    if (lettersOf(k) < 4) continue;
    if ((qkCount.get(k) || 0) < 2) continue;
    if (prefixPlainBlocks(k, plainAll)) continue;
    qk[k] = v;
  }
  const data = { v: 1, source: 'Torah + Tehillim suffixes; Torah + Tehillim + Nach lexicon and qamatz katan (site/data; nach/Psalms skipped; TT qamatz-katan kept), tools/build-voice-stress.mjs', exc, excForce, ...m, qk };
  const s = JSON.stringify(data);
  fs.writeFileSync(path.join(ROOT, 'site/voice/stress-he.json'), s);
  writeVoiceFiles();
  console.log(`pairs ${pairs.length}; exc ${Object.keys(data.exc).length}, lex ${Object.keys(m.lex).length}, suf ${Object.keys(m.suf).length}, qk ${Object.keys(data.qk).length}; ${(s.length / 1024).toFixed(0)} KB`);
}
