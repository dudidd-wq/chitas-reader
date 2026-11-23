// Pack a stratified 650-comment review sample for stage-6 Pnei Moshe punctuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = new URL('../', import.meta.url).pathname;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function tractateOf(file) {
  // gemara/yer/Berakhot/2.json
  return file.split('/')[2] || 'unknown';
}

function lengthBucket(text) {
  const n = (text.match(/[\u05D0-\u05EA]+/g) || []).length;
  if (n < 20) return 'short';
  if (n < 60) return 'mid';
  return 'long';
}

const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/punct-pnei-s6-report.json'), 'utf8'));
const changed = report.rows.filter(r => r.nIns > 0);
if (changed.length < 650) {
  console.error('HOLD-small: only', changed.length, 'changed comments (need 650)');
  process.exit(2);
}

// strata: tractate x length x primary rule
const groups = new Map();
for (const r of changed) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data', r.file), 'utf8'));
  const after = data.segs[r.seg][1][r.idx];
  const key = [tractateOf(r.file), lengthBucket(after), (r.rules[0] || 'R')].join('|');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ r, after });
}

const rng = mulberry32(0x506e6936); // 'Pnei'
const target = 650;
const sample = [];
const keys = [...groups.keys()].sort();
// at least one from each non-empty stratum, then fill proportionally
for (const k of keys) {
  const arr = groups.get(k);
  const i = Math.floor(rng() * arr.length);
  sample.push(arr.splice(i, 1)[0]);
}
while (sample.length < target) {
  const nonempty = keys.filter(k => groups.get(k).length);
  if (!nonempty.length) break;
  // pick a group weighted by remaining size
  const total = nonempty.reduce((s, k) => s + groups.get(k).length, 0);
  let pick = rng() * total;
  let chosen = nonempty[0];
  for (const k of nonempty) {
    pick -= groups.get(k).length;
    if (pick <= 0) { chosen = k; break; }
  }
  const arr = groups.get(chosen);
  const i = Math.floor(rng() * arr.length);
  sample.push(arr.splice(i, 1)[0]);
}

// attach before text by stripping the marks we added? Better: reconstruct from
// after by removing only the inserted marks is hard. Store before in the report.
// The apply report does not include before/after text (size). Re-derive before
// by running the inverse: stripPunct is not enough to restore. We need the
// original from git or to store it.
//
// Inverse is not safe. Read from origin by expecting the user to pass --before-root
// or to have applied on a dirty tree and recover via git show HEAD:path.
// Here we recover before from git HEAD (pre-apply commit) when possible.

import { execSync } from 'node:child_process';
function beforeFromGit(file, seg, idx) {
  const raw = execSync(`git show HEAD:site/data/${file}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20e6 });
  const data = JSON.parse(raw);
  return data.segs[seg][1][idx];
}

const items = sample.slice(0, target).map((s, i) => {
  const before = beforeFromGit(s.r.file, s.r.seg, s.r.idx);
  return {
    n: i + 1,
    file: s.r.file,
    seg: s.r.seg,
    idx: s.r.idx,
    tractate: tractateOf(s.r.file),
    rules: s.r.rules,
    marks: s.r.marks,
    nIns: s.r.nIns,
    say: s.r.say,
    before,
    after: s.after,
  };
});

const outDir = path.join(ROOT, 'verification/punct-pnei-s6-review');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'sample.json'), JSON.stringify({ n: items.length, rulesRev: report.rulesRev, items }, null, 2));

const md = [];
md.push('# Stage 6 Pnei Moshe punctuation — review sample');
md.push('');
md.push(`Rules revision: \`${report.rulesRev}\`. Sample size: ${items.length} of ${changed.length} changed comments.`);
md.push('Letters and niqqud must stay identical. Only added `.,;:?!` are in scope.');
md.push('Score strictly above 9.5, with an explicit `harmful_error_count = 0`.');
md.push('Do not propose letter/niqqud changes. Exact-only fixes name the comment and the mark to revert or adjust.');
md.push('');
for (const it of items) {
  md.push(`## ${it.n}. ${it.file} seg ${it.seg} idx ${it.idx} (${it.tractate})`);
  md.push(`Rules: ${it.rules.join(', ')} · say: ${it.say}`);
  md.push('');
  md.push('**Before**');
  md.push('');
  md.push('```');
  md.push(it.before);
  md.push('```');
  md.push('');
  md.push('**After**');
  md.push('');
  md.push('```');
  md.push(it.after);
  md.push('```');
  md.push('');
}
fs.writeFileSync(path.join(outDir, 'SAMPLE.md'), md.join('\n'));
console.log(JSON.stringify({ packed: items.length, changed: changed.length, strata: keys.length, outDir }, null, 2));
