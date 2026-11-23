#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isLav, plainMishna, stressKey, lettersOnly, HATAMA, stripOle } from './lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || path.join(ROOT, '../mishna-stress-b1-packet');
const SEED = 20261123;
const SAMPLE_N = 650;
const CONTROL_N = 200;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}
function idOf(o) { return `${o.page}#${o.mishna}#${o.start}`; }

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-apply-report.json'), 'utf8'));
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'), 'utf8'));
const occs = report.occurrences;
const byForm = new Map();
for (const o of occs) {
  if (!byForm.has(o.key)) byForm.set(o.key, []);
  byForm.get(o.key).push(o);
}
const picked = [];
const used = new Set();
for (const key of [...byForm.keys()].sort()) {
  const list = byForm.get(key).slice().sort((a, b) =>
    a.page.localeCompare(b.page) || a.mishna - b.mishna || a.start - b.start);
  const c = list[0];
  picked.push(c);
  used.add(idOf(c));
}
if (picked.length > SAMPLE_N) throw new Error('more unique forms than sample budget');
const remainSlots = SAMPLE_N - picked.length;
const rng = mulberry32(SEED);
const pool = occs.filter(o => !used.has(idOf(o)));
// Weighted by remaining form frequency, then shuffle-like weighted draw without replacement
const remainByForm = new Map();
for (const o of pool) {
  if (!remainByForm.has(o.key)) remainByForm.set(o.key, []);
  remainByForm.get(o.key).push(o);
}
const keys = [...remainByForm.keys()].sort();
const weights = keys.map(k => remainByForm.get(k).length);
function drawWeighted() {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  let x = rng() * sum;
  for (let i = 0; i < keys.length; i++) {
    x -= weights[i];
    if (x <= 0) {
      const list = remainByForm.get(keys[i]);
      const idx = Math.floor(rng() * list.length);
      const [c] = list.splice(idx, 1);
      weights[i]--;
      return c;
    }
  }
  return null;
}
while (picked.length < SAMPLE_N) {
  const c = drawWeighted();
  if (!c) break;
  if (used.has(idOf(c))) continue;
  picked.push(c);
  used.add(idOf(c));
}
if (picked.length !== SAMPLE_N) throw new Error('could not fill 650 samples: ' + picked.length);
picked.sort((a, b) => a.page.localeCompare(b.page) || a.mishna - b.mishna || a.start - b.start);

// Unchanged controls: pointed tokens in display mishnah that were not stamped
const mishnaRoot = path.join(ROOT, 'site/data/gemara/mishna');
const msayRoot = path.join(ROOT, 'site/data/gemara/msay');
const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g;
const controlsPool = { lav: [], mono: [], other: [] };
for (const mf of walk(mishnaRoot)) {
  const rel = path.relative(mishnaRoot, mf).replaceAll('\\', '/');
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const s = JSON.parse(fs.readFileSync(path.join(msayRoot, rel), 'utf8'));
  for (let i = 0; i < m.m.length; i++) {
    const plain = plainMishna(m.m[i] ?? '');
    const speech = s.ms[i];
    let match;
    const re = new RegExp(WORD);
    while ((match = re.exec(plain))) {
      const src = match[0];
      const start = match.index;
      const dest = speech.slice(start, start + src.length + 4).includes(HATAMA)
        ? null : src; // dest computed below more carefully
      const destTok = (() => {
        const re2 = new RegExp(WORD);
        re2.lastIndex = 0;
        // find token in speech at same letter position by walking
        return null;
      })();
    }
    // Walk tokens in parallel after stripOle on speech should equal plain
    const pToks = [...plain.matchAll(WORD)];
    const sToks = [...speech.matchAll(WORD)];
    if (pToks.length !== sToks.length) continue;
    for (let t = 0; t < pToks.length; t++) {
      const src = pToks[t][0];
      const dest = sToks[t][0];
      if (dest.includes(HATAMA)) continue;
      if (src !== dest) continue;
      if (!/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(src)) continue; // unpointed
      const item = {
        page: rel.replace(/\.json$/, ''),
        mishna: i + 1,
        start: pToks[t].index,
        src,
        dest,
        key: stressKey(src),
        k: null,
        bare: lettersOnly(src),
        contextBefore: plain.slice(Math.max(0, pToks[t].index - 40), pToks[t].index),
        contextAfter: plain.slice(pToks[t].index + src.length, pToks[t].index + src.length + 40),
        reason: isLav(lettersOnly(src)) ? 'lav' : (dest === src ? 'unstamped' : 'other'),
      };
      if (item.reason === 'lav') controlsPool.lav.push(item);
      else controlsPool.other.push(item);
    }
  }
}

function pickN(arr, n, rng) {
  const copy = arr.slice().sort((a, b) => a.page.localeCompare(b.page) || a.mishna - b.mishna || a.start - b.start);
  // deterministic shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
const rng2 = mulberry32(SEED + 1);
const lavN = Math.min(20, controlsPool.lav.length);
const controls = [
  ...pickN(controlsPool.lav, lavN, rng2),
  ...pickN(controlsPool.other, CONTROL_N - lavN, rng2),
];
controls.sort((a, b) => a.page.localeCompare(b.page) || a.mishna - b.mishna || a.start - b.start);
if (controls.length < CONTROL_N) throw new Error('not enough controls ' + controls.length);

// Hashes
const mishnaFiles = walk(mishnaRoot).sort();
const msayFiles = walk(msayRoot).sort();
const mishnaHashes = {};
const msayHashes = {};
const liveMishnaHashes = {};
const liveMsayHashes = {};
for (const f of mishnaFiles) {
  const rel = path.relative(mishnaRoot, f).replaceAll('\\', '/');
  mishnaHashes[rel] = sha256File(f);
  const live = execFileSync('git', ['show', `HEAD:site/data/gemara/mishna/${rel}`], { cwd: ROOT });
  liveMishnaHashes[rel] = crypto.createHash('sha256').update(live).digest('hex');
  if (mishnaHashes[rel] !== liveMishnaHashes[rel]) throw new Error('display mishna changed ' + rel);
}
for (const f of msayFiles) {
  const rel = path.relative(msayRoot, f).replaceAll('\\', '/');
  msayHashes[rel] = sha256File(f);
  const live = execFileSync('git', ['show', `HEAD:site/data/gemara/msay/${rel}`], { cwd: ROOT });
  liveMsayHashes[rel] = crypto.createHash('sha256').update(live).digest('hex');
}

fs.mkdirSync(OUT, { recursive: true });
const sample = {
  v: 1,
  packet: 'mishna-stress-b1',
  seed: SEED,
  changed: picked,
  controls,
  counts: { changed: picked.length, uniqueFormsInSample: new Set(picked.map(o => o.key)).size, controls: controls.length, lavControls: controls.filter(c => c.reason === 'lav').length },
};
fs.writeFileSync(path.join(OUT, 'sample-tokens.json'), JSON.stringify(sample, null, 2));
fs.writeFileSync(path.join(OUT, 'lexicon.json'), JSON.stringify(lex));
const forms = report.forms;
fs.writeFileSync(path.join(OUT, 'forms.json'), JSON.stringify({ formCount: forms.length, forms }, null, 2));
const reportLite = { ...report, occurrences: undefined };
fs.writeFileSync(path.join(OUT, 'apply-report-summary.json'), JSON.stringify(reportLite, null, 2));
const hashes = {
  liveVersion: '1.0.214',
  dataVersion: '5edacaeb230f',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(),
  lexicon: sha256File(path.join(ROOT, 'tools/data/mishna-stress-lexicon.json')),
  applyReport: sha256File(path.join(ROOT, 'tools/data/mishna-stress-apply-report.json')),
  textsJsHook: crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'site/js/texts.js'))).digest('hex'),
  mishnaDisplayIdenticalToHead: Object.values(mishnaHashes).every((h, i) => h === Object.values(liveMishnaHashes)[i]),
  mishnaCount: mishnaFiles.length,
  msayCount: msayFiles.length,
  mishna: mishnaHashes,
  liveMishna: liveMishnaHashes,
  msayAfter: msayHashes,
  liveMsay: liveMsayHashes,
};
fs.writeFileSync(path.join(OUT, 'live-hashes.json'), JSON.stringify(hashes, null, 2));
const handoff = {
  packet: 'mishna-stress-b1',
  corpus: 'mishnah-speech-ms',
  fixRound: 0,
  liveVersion: '1.0.214',
  dataVersion: '5edacaeb230f',
  commit: hashes.commit,
  minCount: 5,
  lexiconForms: Object.keys(lex.forms).length,
  changedTokens: report.changedTokens,
  uniqueForms: report.uniqueForms,
  pagesWritten: report.pagesWritten,
  pagesUnchanged: report.pagesUnchanged,
  sampleCounts: sample.counts,
  gates: { minChangedSamples: 650, score: '>9.5', harmful: 'explicit 0', maxExactOnlyRounds: 2 },
  displayUnchanged: ['mishna.m', 'mishna.b', 'msay.v', 'msay.bs'],
  speechField: 'msay.ms',
  neverStamp: 'לאו and prefixed לאו',
};
fs.writeFileSync(path.join(OUT, 'handoff.json'), JSON.stringify(handoff, null, 2));
console.log(JSON.stringify({ ok: true, out: OUT, ...sample.counts, changedTokens: report.changedTokens, uniqueForms: report.uniqueForms }, null, 2));
