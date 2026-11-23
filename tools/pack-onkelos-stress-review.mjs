#!/usr/bin/env node
// Pack a FULL review of every Onkelos speech-stress change (all 196 tokens) plus controls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isLav, RE_WORD, stressKey, lettersOnly, stripOle } from './lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || '/tmp/onkelos-stress-packet/batch-onk';
const CONTROL_N = 200;
const SEED = 0x4f6e6b31; // 'Onk1'

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
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/onkelos-stress-apply-report.json'), 'utf8'));
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'), 'utf8'));
const blocked = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-blocked.json'), 'utf8'));
const sw = fs.readFileSync(path.join(ROOT, 'site/sw.js'), 'utf8');
const version = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
const dataVersion = (sw.match(/const DATA_VERSION = '([^']+)'/) || [])[1];
const head = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

const samples = report.occurrences.map((o, i) => ({
  n: i + 1,
  page: o.page,
  verse: o.verse,
  start: o.start,
  src: o.src,
  dest: o.dest,
  key: o.key,
  k: o.k,
  bare: o.bare,
  contextBefore: o.contextBefore,
  contextAfter: o.contextAfter,
})).sort((a, b) => a.page.localeCompare(b.page) || a.verse - b.verse || a.start - b.start);
samples.forEach((s, i) => { s.n = i + 1; });
if (samples.length !== 196) throw new Error('expected 196 samples, got ' + samples.length);

// Controls: rejected unaligned hits, existing ole, לאו, blocked זָרַע, pointed non-hits
const stamped = new Set(report.occurrences.map(o => `${o.page}#${o.verse}#${o.start}`));
const pools = { unaligned: [], existingOle: [], lav: [], blockedZar: [], otherPointed: [] };
for (const f of walk(path.join(ROOT, 'site/data/onkelos'))) {
  const rel = path.relative(path.join(ROOT, 'site/data'), f).replaceAll('\\', '/').replace(/\.json$/, '');
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  const headRaw = execFileSync('git', ['show', `HEAD:site/data/${rel}.json`], { cwd: ROOT, encoding: 'utf8' });
  const headObj = JSON.parse(headRaw);
  for (let i = 0; i < obj.say.length; i++) {
    const now = obj.say[i], was = headObj.say[i];
    for (const m of was.matchAll(RE_WORD)) {
      const w = m[0], start = m.index;
      const id = `${rel}#${i}#${start}`;
      if (stamped.has(id)) continue;
      const rec = {
        page: rel, verse: i, start, src: w, dest: w,
        key: stressKey(w), bare: lettersOnly(w),
        kind: 'other',
        contextBefore: was.slice(Math.max(0, start - 40), start),
        contextAfter: was.slice(start + w.length, start + w.length + 40),
      };
      if (isLav(rec.bare)) { rec.kind = 'lav'; pools.lav.push(rec); continue; }
      if (rec.key === 'זָרַע' || rec.bare === 'זרע') { rec.kind = 'blocked-zarah'; pools.blockedZar.push(rec); continue; }
      if (/\u05AB/.test(w)) { rec.kind = 'existing-ole'; pools.existingOle.push(rec); continue; }
      // skip unpointed
      if (!/[\u05B0-\u05BB\u05C7]/.test(w)) continue;
      rec.kind = 'pointed-unstamped';
      pools.otherPointed.push(rec);
    }
  }
}
for (const r of report.rejected) {
  pools.unaligned.push({
    page: r.page, verse: r.verse, start: r.start, src: r.src, dest: r.src,
    key: r.key, bare: r.bare, kind: 'unaligned-lexicon-hit',
    reason: r.reason,
  });
}

const rng = mulberry32(SEED);
const controls = [];
const take = (arr, n, kind) => {
  const sh = shuffle(arr, rng);
  for (const x of sh.slice(0, n)) controls.push({ ...x, kind: x.kind || kind });
};
// Prefer all 74 unaligned + some lav/zarah/existing ole + fill with pointed
take(pools.unaligned, pools.unaligned.length, 'unaligned-lexicon-hit');
take(pools.lav, Math.min(20, pools.lav.length), 'lav');
take(pools.blockedZar, Math.min(10, pools.blockedZar.length), 'blocked-zarah');
take(pools.existingOle, 50, 'existing-ole');
const remain = CONTROL_N - controls.length;
take(pools.otherPointed, Math.max(0, remain), 'pointed-unstamped');
controls.sort((a, b) => a.page.localeCompare(b.page) || a.verse - b.verse || a.start - b.start);
controls.forEach((c, i) => { c.n = i + 1; });

const liveFiles = walk(path.join(ROOT, 'site/data/onkelos')).map(f => path.relative(ROOT, f).replaceAll('\\', '/')).sort();
const liveHashes = {};
for (const rel of liveFiles) liveHashes[rel] = sha256File(path.join(ROOT, rel));

const handoff = {
  packet: 'onkelos-stress-b1',
  corpus: 'onkelos-speech-say',
  fixRound: 0,
  alignment: 'torah-verse-stressKey',
  live: version,
  commit: head,
  dataVersion,
  displayChanged: 0,
  changedTokens: report.changedTokens,
  uniqueForms: report.uniqueForms,
  pagesWritten: report.pagesWritten,
  alreadyOle: report.alreadyOle,
  tOle: report.tOle,
  rejectedTokens: report.rejectedTokens,
  sample: samples.length,
  controls: controls.length,
  fullReview: true,
  noUnitSplit: true,
  blocked: report.blocked,
  neverAlignedForms: ['עֵשֶׂב', 'יֶתֶר', 'עֵבֶר', 'צֶדֶק', 'כְּנַעַן', 'חֵלֶק'],
  dudiApprovedFullReview: true,
};

fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};
write('handoff.json', handoff);
write('sample-tokens.json', { n: samples.length, fullReview: true, items: samples });
write('controls.json', { n: controls.length, items: controls });
write('forms.json', report.forms);
write('lexicon.json', { minCount: lex.minCount, forms: Object.fromEntries(report.forms.map(f => [f.key, lex.forms[f.key]])) });
write('blocked.json', blocked);
write('apply-report-summary.json', {
  alignment: report.alignment,
  files: report.files,
  verses: report.verses,
  changedTokens: report.changedTokens,
  uniqueForms: report.uniqueForms,
  pagesWritten: report.pagesWritten,
  pagesUnchanged: report.pagesUnchanged,
  alreadyOle: report.alreadyOle,
  tOle: report.tOle,
  rejectedTokens: report.rejectedTokens,
  forms: report.forms,
});
write('live-hashes.json', { n: Object.keys(liveHashes).length, files: liveHashes });
write('control-pools.json', Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.length])));

const mdEscape = s => String(s || '').replace(/\|/g, '\\|');
let sampleMd = `# Onkelos speech stress — all ${samples.length} changed tokens\n\n`;
sampleMd += `Full review (Dudi, 24/11/2026). Alignment: stressKey also in the parallel Torah verse.\n\n`;
for (const s of samples) {
  sampleMd += `## ${s.n}. ${s.page}:${s.verse + 1}  \`${s.key}\` (k=${s.k})\n\n`;
  sampleMd += `- before: ${s.src}\n- after: ${s.dest}\n- context: …${mdEscape(s.contextBefore)}${s.src}${mdEscape(s.contextAfter)}…\n\n`;
}
write('SAMPLE.md', sampleMd);
let ctrlMd = `# Onkelos speech stress — ${controls.length} unchanged controls\n\n`;
for (const c of controls) {
  ctrlMd += `## ${c.n}. ${c.page}:${c.verse + 1} \`${c.key}\` (${c.kind})\n\n- text: ${c.src}\n\n`;
}
write('CONTROLS.md', ctrlMd);

console.log(JSON.stringify({
  out: OUT,
  samples: samples.length,
  forms: report.forms.length,
  controls: controls.length,
  pools: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.length])),
}, null, 2));
