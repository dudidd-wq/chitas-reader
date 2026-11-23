#!/usr/bin/env node
// Apply conservative milel ole to commentary speech (bsay/ysay/nachv say only).
// Usage: node tools/apply-comment-stress.mjs [--lexicon path] [--blocked path] [--report path]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOleToText, lettersOnly, HATAMA } from './lib-mishna-stress.mjs';
import { writeSayFile, mapSay, NON_IDENTITY_PINS } from './lib-comment-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
};
const lexPath = arg('--lexicon', path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'));
const blockedPath = arg('--blocked', path.join(ROOT, 'tools/data/mishna-stress-blocked.json'));
const reportPath = arg('--report', path.join(ROOT, 'tools/data/comment-stress-apply-report.json'));
const lex = JSON.parse(fs.readFileSync(lexPath, 'utf8'));
const lexicon = lex.forms;
const blocked = new Set();
if (blockedPath && fs.existsSync(blockedPath)) {
  const raw = JSON.parse(fs.readFileSync(blockedPath, 'utf8'));
  for (const x of raw.forms || raw || []) blocked.add(typeof x === 'string' ? x : (x.key || x.bare));
}
const skip = new Set(NON_IDENTITY_PINS);

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}

const corpora = [
  { name: 'bsay', dir: path.join(ROOT, 'site/data/gemara/bsay') },
  { name: 'ysay', dir: path.join(ROOT, 'site/data/gemara/ysay') },
  { name: 'nachv', dir: path.join(ROOT, 'site/data/nachv') },
];

const occurrences = [];
const formCount = new Map();
const perCorpus = {};
let pagesWritten = 0, pagesUnchanged = 0, skippedPins = 0;

for (const c of corpora) {
  const rec = { files: 0, skippedPins: 0, changedTokens: 0, pagesWithChanges: 0, pagesUnchanged: 0 };
  for (const f of walk(c.dir).sort()) {
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');
    rec.files++;
    if (skip.has(rel)) { rec.skippedPins++; skippedPins++; continue; }
    const raw = fs.readFileSync(f, 'utf8');
    const obj = JSON.parse(raw);
    if (!Object.prototype.hasOwnProperty.call(obj, 'say')) throw new Error('no say ' + rel);
    const extra = Object.keys(obj).filter(k => k !== 'say' && k !== 'v' && k !== 'vd' && k !== 'partial' && k !== 'nps1');
    if (extra.length) throw new Error('unexpected keys ' + rel + ' ' + extra);
    let pageChanged = 0;
    const next = mapSay(obj.say, (s, idx) => {
      const { text, changed } = applyOleToText(s, lexicon, blocked);
      for (const ch of changed) {
        const occ = {
          corpus: c.name,
          page: rel.replace(/^site\/data\//, '').replace(/\.json$/, ''),
          path: idx,
          start: ch.start,
          src: ch.src,
          dest: ch.dest,
          key: ch.key,
          k: ch.k,
          bare: ch.bare,
          contextBefore: s.slice(Math.max(0, ch.start - 40), ch.start),
          contextAfter: s.slice(ch.start + ch.src.length, ch.start + ch.src.length + 40),
        };
        occurrences.push(occ);
        formCount.set(ch.key, (formCount.get(ch.key) || 0) + 1);
        pageChanged++;
      }
      return text;
    });
    if (pageChanged) {
      const out = writeSayFile(raw, next);
      const again = JSON.parse(out);
      for (const k of ['v', 'vd', 'partial', 'nps1']) {
        if (JSON.stringify(again[k]) !== JSON.stringify(obj[k])) throw new Error('display/sidecar changed ' + rel + ' ' + k);
      }
      fs.writeFileSync(f, out);
      rec.changedTokens += pageChanged;
      rec.pagesWithChanges++;
      pagesWritten++;
    } else {
      rec.pagesUnchanged++;
      pagesUnchanged++;
    }
  }
  perCorpus[c.name] = rec;
}

const forms = [...formCount.entries()].map(([key, occ]) => {
  const sample = occurrences.find(o => o.key === key);
  return { key, occ, k: sample?.k, sample: sample?.src, dest: sample?.dest, page: sample?.page };
}).sort((a, b) => b.occ - a.occ || a.key.localeCompare(b.key));

const report = {
  lexicon: path.relative(ROOT, lexPath).replaceAll('\\', '/'),
  minCount: lex.minCount,
  lexiconForms: Object.keys(lexicon).length,
  blocked: [...blocked],
  skippedPins: NON_IDENTITY_PINS,
  pagesWritten,
  pagesUnchanged,
  skippedPinCount: skippedPins,
  changedTokens: occurrences.length,
  uniqueForms: forms.length,
  perCorpus,
  forms,
  occurrences,
};
fs.writeFileSync(reportPath, JSON.stringify(report));
console.log(JSON.stringify({
  ok: true,
  changedTokens: report.changedTokens,
  uniqueForms: report.uniqueForms,
  pagesWritten,
  pagesUnchanged,
  skippedPins,
  perCorpus,
  report: reportPath,
}, null, 2));
