// Write speech-only ms[] beside existing bs/v in gemara/msay.
// Display gemara/mishna m/b is never written. Usage:
//   node tools/apply-mishna-stress.mjs [--lexicon path] [--blocked path] [--report path]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOleToText, plainMishna, stressKey, lettersOnly } from './lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const lexPath = arg('--lexicon', path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'));
const blockedPath = arg('--blocked', '');
const reportPath = arg('--report', path.join(ROOT, 'tools/data/mishna-stress-apply-report.json'));

const lexFile = JSON.parse(fs.readFileSync(lexPath, 'utf8'));
const lexicon = lexFile.forms || lexFile;
const blocked = new Set();
if (blockedPath && fs.existsSync(blockedPath)) {
  const raw = JSON.parse(fs.readFileSync(blockedPath, 'utf8'));
  for (const x of raw.forms || raw || []) blocked.add(typeof x === 'string' ? x : (x.key || x.bare));
}

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}

const mishnaRoot = path.join(ROOT, 'site/data/gemara/mishna');
const msayRoot = path.join(ROOT, 'site/data/gemara/msay');
const perTract = {};
const allChanged = [];
let pagesWritten = 0, pagesUnchanged = 0, tokensChanged = 0;

for (const mf of walk(mishnaRoot).sort()) {
  const rel = path.relative(mishnaRoot, mf);
  const sf = path.join(msayRoot, rel);
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const s = JSON.parse(fs.readFileSync(sf, 'utf8'));
  if (!Array.isArray(m.m) || !Array.isArray(s.bs) || !Array.isArray(s.v)) {
    throw new Error('unexpected shape ' + rel);
  }
  if (m.m.length !== s.bs.length || m.m.length !== s.v.length) {
    throw new Error('length mismatch ' + rel);
  }
  const tract = rel.split(path.sep)[0];
  const chap = rel.split(path.sep)[1].replace(/\.json$/, '');
  const ms = [];
  let pageChanged = 0;
  for (let i = 0; i < m.m.length; i++) {
    const plain = plainMishna(m.m[i] ?? '');
    const { text, changed } = applyOleToText(plain, lexicon, blocked);
    ms.push(text);
    for (const c of changed) {
      pageChanged++;
      allChanged.push({
        page: `${tract}/${chap}`,
        mishna: i + 1,
        ...c,
        contextBefore: plain.slice(Math.max(0, c.start - 40), c.start),
        contextAfter: plain.slice(c.start + c.src.length, c.start + c.src.length + 40),
      });
    }
  }
  // Inject ,"ms":... before the final } so existing bs/v bytes stay identical.
  const raw = fs.readFileSync(sf, 'utf8');
  if (Object.keys(s).some(k => k !== 'bs' && k !== 'v' && k !== 'ms')) {
    throw new Error('unexpected msay keys ' + rel + ' ' + Object.keys(s));
  }
  const trimmed = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
  if (!trimmed.startsWith('{"bs":') || !trimmed.includes(',"v":') || !trimmed.endsWith('}')) {
    throw new Error('unexpected msay encoding ' + rel);
  }
  // Re-apply: drop a previous trailing ,"ms":...
  let base = trimmed;
  if (Object.prototype.hasOwnProperty.call(s, 'ms')) {
    const needle = ',"ms":' + JSON.stringify(s.ms) + '}';
    if (!base.endsWith(needle)) {
      throw new Error('cannot peel existing ms ' + rel);
    }
    base = base.slice(0, base.length - needle.length) + '}';
  }
  const injected = base.slice(0, -1) + ',"ms":' + JSON.stringify(ms) + '}';
  fs.writeFileSync(sf, injected);
  pagesWritten++;
  if (pageChanged) {
    tokensChanged += pageChanged;
    perTract[tract] = perTract[tract] || { pages: 0, changedPages: 0, tokens: 0 };
    perTract[tract].pages++;
    perTract[tract].changedPages++;
    perTract[tract].tokens += pageChanged;
  } else {
    pagesUnchanged++;
    perTract[tract] = perTract[tract] || { pages: 0, changedPages: 0, tokens: 0 };
    perTract[tract].pages++;
  }
}

const formCounts = new Map();
for (const c of allChanged) {
  formCounts.set(c.key, (formCounts.get(c.key) || 0) + 1);
}

const report = {
  lexicon: path.relative(ROOT, lexPath),
  minCount: lexFile.minCount,
  lexiconForms: Object.keys(lexicon).length,
  blocked: [...blocked],
  pagesWritten,
  pagesUnchanged,
  changedTokens: tokensChanged,
  uniqueForms: formCounts.size,
  perTract,
  // light sample of each form
  forms: [...formCounts.entries()].sort((a, b) => b[1] - a[1]).map(([key, occ]) => {
    const hit = allChanged.find(c => c.key === key);
    return { key, occ, k: hit?.k, sample: hit?.src, dest: hit?.dest, page: hit?.page };
  }),
};
fs.writeFileSync(reportPath, JSON.stringify({ ...report, occurrences: allChanged }, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  changedTokens: tokensChanged,
  uniqueForms: formCounts.size,
  pagesWritten,
  pagesWithChanges: pagesWritten - pagesUnchanged,
  report: reportPath,
}, null, 2));
