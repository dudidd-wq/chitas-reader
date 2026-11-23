#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isLav, stressKey, lettersOnly, HATAMA, stripOle, plainMishna } from './lib-mishna-stress.mjs';
import { NON_IDENTITY_PINS } from './lib-comment-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || path.join(ROOT, '../comment-stress-b2-packet');
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
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function idOf(o) { return `${o.corpus}:${o.page}#${(o.path||[]).join('.') }#${o.start}`; }
function walk(d, acc=[]) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/comment-stress-apply-report.json'), 'utf8'));
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
  const list = byForm.get(key).slice().sort((a,b) => a.page.localeCompare(b.page) || a.start - b.start);
  const c = list[0];
  picked.push(c); used.add(idOf(c));
}
const rng = mulberry32(SEED);
const remainByForm = new Map();
for (const o of occs) {
  if (used.has(idOf(o))) continue;
  if (!remainByForm.has(o.key)) remainByForm.set(o.key, []);
  remainByForm.get(o.key).push(o);
}
const keys = [...remainByForm.keys()].sort();
const weights = keys.map(k => remainByForm.get(k).length);
function drawWeighted() {
  const sum = weights.reduce((a,b)=>a+b,0);
  if (sum<=0) return null;
  let x = rng()*sum;
  for (let i=0;i<keys.length;i++) {
    x -= weights[i];
    if (x<=0) {
      const list = remainByForm.get(keys[i]);
      const idx = Math.floor(rng()*list.length);
      const [c] = list.splice(idx,1);
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
  picked.push(c); used.add(idOf(c));
}
if (picked.length !== SAMPLE_N) throw new Error('could not fill 650: '+picked.length);
picked.sort((a,b)=> (a.corpus+a.page).localeCompare(b.corpus+b.page) || a.start-b.start);

// controls: unstamped pointed tokens from a spread of files
const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g;
const controlsPool = { lav: [], blocked: [], other: [] };
const dirs = [
  path.join(ROOT,'site/data/gemara/bsay'),
  path.join(ROOT,'site/data/gemara/ysay'),
  path.join(ROOT,'site/data/nachv'),
];
function walkStrings(node, fn, pathArr=[]) {
  if (typeof node==='string') fn(node, pathArr);
  else if (Array.isArray(node)) node.forEach((x,i)=>walkStrings(x,fn,pathArr.concat(i)));
}
let scanned=0;
for (const dir of dirs) {
  for (const f of walk(dir)) {
    const rel = path.relative(ROOT,f).replaceAll('\\','/');
    if (NON_IDENTITY_PINS.includes(rel)) continue;
    const d = JSON.parse(fs.readFileSync(f,'utf8'));
    walkStrings(d.say, (s, idx) => {
      let m;
      const re = new RegExp(WORD);
      while ((m = re.exec(s))) {
        const src=m[0];
        if (src.includes(HATAMA)) continue;
        if (!/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(src)) continue;
        const item={
          corpus: rel.includes('/bsay/')?'bsay':rel.includes('/ysay/')?'ysay':'nachv',
          page: rel.replace(/^site\/data\//,'').replace(/\.json$/,''),
          path: idx, start: m.index, src, dest: src, key: stressKey(src),
          k: null, bare: lettersOnly(src),
          contextBefore: s.slice(Math.max(0,m.index-40), m.index),
          contextAfter: s.slice(m.index+src.length, m.index+src.length+40),
          reason: isLav(lettersOnly(src)) ? 'lav' : (stressKey(src)==='זָרַע' ? 'blocked' : 'unstamped'),
        };
        if (item.reason==='lav') controlsPool.lav.push(item);
        else if (item.reason==='blocked') controlsPool.blocked.push(item);
        else controlsPool.other.push(item);
        scanned++;
      }
    });
  }
}
function pickN(arr,n,rng){
  const copy=arr.slice();
  for(let i=copy.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
  return copy.slice(0,n);
}
const rng2=mulberry32(SEED+7);
const lavN=Math.min(20, controlsPool.lav.length);
const blkN=Math.min(10, controlsPool.blocked.length);
const controls=[
  ...pickN(controlsPool.lav, lavN, rng2),
  ...pickN(controlsPool.blocked, blkN, rng2),
  ...pickN(controlsPool.other, CONTROL_N-lavN-blkN, rng2),
];
if (controls.length<CONTROL_N) throw new Error('not enough controls '+controls.length+' scanned '+scanned);
controls.sort((a,b)=>(a.corpus+a.page).localeCompare(b.corpus+b.page)||a.start-b.start);

fs.mkdirSync(OUT,{recursive:true});
const sample={ v:1, packet:'comment-stress-b2', seed:SEED, changed:picked, controls,
  counts:{ changed:picked.length, uniqueFormsInSample:new Set(picked.map(o=>o.key)).size, controls:controls.length,
    lavControls:controls.filter(c=>c.reason==='lav').length, blockedControls:controls.filter(c=>c.reason==='blocked').length } };
fs.writeFileSync(path.join(OUT,'sample-tokens.json'), JSON.stringify(sample));
fs.writeFileSync(path.join(OUT,'lexicon.json'), JSON.stringify(lex));
fs.writeFileSync(path.join(OUT,'blocked.json'), fs.readFileSync(path.join(ROOT,'tools/data/mishna-stress-blocked.json')));
fs.writeFileSync(path.join(OUT,'forms.json'), JSON.stringify({ formCount: report.forms.length, forms: report.forms }));
const reportLite={...report, occurrences:undefined};
fs.writeFileSync(path.join(OUT,'apply-report-summary.json'), JSON.stringify(reportLite,null,2));
const hashes={
  liveVersion:'1.0.216', dataVersion:'83112fa103f5',
  commit: execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT}).toString().trim(),
  lexicon: sha256File(path.join(ROOT,'tools/data/mishna-stress-lexicon.json')),
  blocked: sha256File(path.join(ROOT,'tools/data/mishna-stress-blocked.json')),
  applyReport: sha256File(path.join(ROOT,'tools/data/comment-stress-apply-report.json')),
  nonIdentityPinsUntouched: NON_IDENTITY_PINS,
};
fs.writeFileSync(path.join(OUT,'live-hashes.json'), JSON.stringify(hashes,null,2));
const handoff={
  packet:'comment-stress-b2', corpus:'bsay+ysay+nachv-speech-say', fixRound:0,
  liveVersion:'1.0.216', dataVersion:'83112fa103f5', commit:hashes.commit,
  minCount:5, lexiconForms:Object.keys(lex.forms).length,
  changedTokens:report.changedTokens, uniqueForms:report.uniqueForms,
  pagesWritten:report.pagesWritten, pagesUnchanged:report.pagesUnchanged,
  skippedPins:12, perCorpus:report.perCorpus, sampleCounts:sample.counts,
  gates:{ minChangedSamples:650, score:'>9.5', harmful:'explicit 0', maxExactOnlyRounds:2 },
  displayUnchanged:['v','vd','partial','nps1'], speechField:'say',
  neverStamp:['לאו','prefixed לאו','זָרַע'],
  skippedNonIdentityPins:NON_IDENTITY_PINS,
};
fs.writeFileSync(path.join(OUT,'handoff.json'), JSON.stringify(handoff,null,2));
console.log(JSON.stringify({ ok:true, out:OUT, ...sample.counts, changedTokens:report.changedTokens, uniqueForms:report.uniqueForms }, null, 2));
