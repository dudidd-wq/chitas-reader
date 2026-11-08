// 1.0.78: build speech-only Rashi (rs, parallel to r) without editing any displayed v/r text.
// node tools/build-rashi-pronunciation.mjs --prepare; python3 tools/fetch-rashi-rich.py;
// node tools/build-rashi-pronunciation.mjs. Public Nakdan is build-time only, no key/runtime request.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { expandRashiContext, alignRashiTokens } from './rashi-context.mjs';
import { vowelHeadword } from '../site/js/tts-prep.js';
import { fixNiqqud } from '../site/js/niqqud.js';
import { letters, nuclei, stressKey, predictStress, accentStressMap, HATAMA } from '../site/js/g2p.js';
const ROOT = new URL('../', import.meta.url).pathname;
const CACHE = process.env.RASHI_RICH_CACHE || '/workspace/rashi-pronunciation/rich-cache';
const O = JSON.parse(fs.readFileSync(ROOT + 'tools/data/rashi-pronunciation.json'));
const CUR = Object.fromEntries(Object.entries(O.words).map(([w, k]) => [stressKey(w), k]));
const D = JSON.parse(fs.readFileSync(ROOT + 'site/voice/stress-he.json'));
const files = fs.readdirSync(ROOT + 'site/data/torah', { withFileTypes: true }).filter(e => e.isDirectory())
  .flatMap(e => fs.readdirSync(ROOT + 'site/data/torah/' + e.name).filter(f => /^\d+\.json$/.test(f)).map(f => `site/data/torah/${e.name}/${f}`)).sort();
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const bare = s => s.replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '');
const sk = s => s.replace(/[^א-ת]/g, '');
const plain = s => s.replace(/<[^>]+>/g, '');
const clean = s => s.replace(/[|\u05BD]/g, '');
const wordRE = /[א-ת][א-ת\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7"'״׳]*/g;
export function markStress(w, k) {
  const L = letters(w), n = nuclei(L);
  if (n.length < 2 || !Number.isInteger(k) || k < 0 || k >= n.length) return w;
  L[n[n.length - 1 - k].own].all += HATAMA;
  return L.map(l => l.ch + l.all).join('');
}
// Ignore optional dagesh differences only for matching stress; source consonants/vowels are NEVER overwritten.
const signature = w => stressKey(clean(w)).replace(/\u05BC/g, '');
const chunks = [], chapters = new Map();
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(ROOT + f)); chapters.set(f, d);
  let batch = [], size = 0;
  const flush = () => { if (!batch.length) return; const text = batch.map(p => bare(p.base)).join('\n'); chunks.push({ hash: hash(text), text, paragraphs: batch }); batch = []; size = 0; };
  (d.r || []).forEach((ps, vi) => ps.forEach((p, pi) => {
    const pointed = vowelHeadword(fixNiqqud(p.normalize('NFD')), d.v[vi]), base = plain(pointed);
    const hw = pointed.match(/^\s*<b>([^<]+)<\/b>/)?.[1] || '';
    const map = accentStressMap(d.v[vi]), headStress = [...hw.matchAll(wordRE)].map(m => map.get(stressKey(m[0])) ?? null);
    if (size + bare(base).length > 2500) flush();
    batch.push({ file: f, vi, pi, base, headStress }); size += bare(base).length + 1;
  })); flush();
}
fs.mkdirSync(CACHE, { recursive: true });
if (process.argv.includes('--prepare')) {
  fs.writeFileSync(path.join(CACHE, 'input-list.json'), JSON.stringify(chunks.map(({ hash, text }) => ({ hash, text }))));
  console.log(`${chunks.length} batches, ${chunks.reduce((n, c) => n + c.paragraphs.length, 0)} paragraphs; ${CACHE}/input-list.json`);
} else {
  const stats = { batches: chunks.length, paragraphs: 0, words: 0, dicta: 0, curated: 0, exceptions: 0, lexicon: 0, fallback: 0, context: 0, filled: 0, headwords: 0, explicit: 0, polysyllables: 0, splitWords: 0, mismatchedBatches: 0 };
  for (const [f, d] of chapters) d.rs = (d.r || []).map(ps => ps.map(() => ''));
  for (const c of chunks) {
    const cached = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(CACHE, c.hash + '.json.gz'))));
    if (cached.text !== c.text) throw Error('Rashi rich cache mismatch: ' + c.hash);
    const tokens = cached.tokens.filter(n => /[א-ת]/.test(n.word));
    const expected = c.paragraphs.flatMap(p => [...p.base.matchAll(wordRE)].map(m => sk(m[0])));
    const alignment = alignRashiTokens(expected, tokens);
    const aligned = alignment !== null;
    if (!aligned) stats.mismatchedBatches++;
    else stats.splitWords += alignment.splits;
    let wi = 0;
    for (const p of c.paragraphs) {
      // Foreign glosses are not automatically filled with guessed Hebrew vowels.
      const foreign = /לע[״"]ז|לועז/.test(bare(p.base));
      let localWord = 0;
      let say = p.base.replace(wordRE, source => {
        const n = aligned ? alignment.tokens[wi++] : null, hi = localWord++; let w = source; stats.words++;
        const trail = /["״]$/.test(w) ? w.slice(-1) : '';
        if (trail) w = w.slice(0, -1);
        if (/["'״׳]/.test(w)) return source; // contextual abbreviations remain in the shared preparer; never guess a gloss
        const opts = n?.options || [];
        let k = p.headStress[hi];
        if (k !== undefined && k !== null) stats.headwords++;
        else if (CUR[stressKey(w)] !== undefined) { k = CUR[stressKey(w)]; stats.curated++; }
        else if (D.exc[stressKey(w)] !== undefined) { k = D.exc[stressKey(w)]; stats.exceptions++; }
        else {
          if (!/[\u05B1-\u05BB\u05C7]/.test(w) && sk(w).length > 1 && !foreign && n?.confident) {
            const preferred = opts.find(o => o.level === 1 && sk(o.w) === sk(w));
            if (preferred && /[\u05B1-\u05BB\u05C7]/.test(preferred.w)) { w = clean(preferred.w); stats.filled++; }
          }
          const matches = opts.filter(o => /^Acc[01]$/.test(o.acc || '') && signature(o.w) === signature(w) && nuclei(clean(o.w)).length === nuclei(w).length);
          const chosen = matches.find(o => o.level === 1);
          const ks = new Set(matches.map(o => +o.acc.slice(-1)));
          if (CUR[stressKey(w)] !== undefined) { k = CUR[stressKey(w)]; stats.curated++; }
          else if (D.exc[stressKey(w)] !== undefined) { k = D.exc[stressKey(w)]; stats.exceptions++; }
          else if (chosen || ks.size === 1) { k = chosen ? +chosen.acc.slice(-1) : [...ks][0]; stats.dicta++; }
          else { const [guess, src] = predictStress(w, D); if (src === 'exc' || src === 'lex') { k = guess; stats.lexicon++; } else stats.fallback++; }
        }
        if (nuclei(w).length > 1) stats.polysyllables++;
        const marked = markStress(w, k); if (marked.includes(HATAMA)) stats.explicit++;
        return marked + trail;
      });
      // Only exact pointed phrase keys, not a skeleton-wide reinterpretation of ambiguous words.
      for (const o of O.phrases) say = say.replaceAll(o.from, o.to);
      say = expandRashiContext(say, () => stats.context++);
      chapters.get(p.file).rs[p.vi][p.pi] = say; stats.paragraphs++;
    }
  }
  // Fail closed if service tokenization drifted substantially; do not quietly publish unaligned stress.
  if (stats.mismatchedBatches > chunks.length * 0.02) throw Error('Too many unaligned Dicta batches: ' + JSON.stringify(stats));
  for (const [f, d] of chapters) fs.writeFileSync(ROOT + f, JSON.stringify(d));
  fs.writeFileSync(ROOT + 'verification/RASHI-178-metrics.json', JSON.stringify(stats, null, 2) + '\n');
  console.log(JSON.stringify(stats, null, 2));
}
