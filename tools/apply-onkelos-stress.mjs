#!/usr/bin/env node
// Apply Torah-verse-aligned conservative milel ole to Onkelos speech (`say` only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lettersOnly, stripOle, isLav } from './lib-mishna-stress.mjs';
import { applyAlignedOle, writeOnkelosSay } from './lib-onkelos-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
};
const lexPath = arg('--lexicon', path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'));
const blockedPath = arg('--blocked', path.join(ROOT, 'tools/data/mishna-stress-blocked.json'));
const reportPath = arg('--report', path.join(ROOT, 'tools/data/onkelos-stress-apply-report.json'));
const dry = process.argv.includes('--dry');
const lex = JSON.parse(fs.readFileSync(lexPath, 'utf8'));
const lexicon = lex.forms;
const blocked = new Set();
if (fs.existsSync(blockedPath)) {
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

const occurrences = [];
const rejectedOcc = [];
const formCount = new Map();
let pagesWritten = 0, pagesUnchanged = 0, alreadyOle = 0, tOle = 0, files = 0, verses = 0;

for (const f of walk(path.join(ROOT, 'site/data/onkelos')).sort()) {
  const rel = path.relative(ROOT, f).replaceAll('\\', '/');
  files++;
  const raw = fs.readFileSync(f, 'utf8');
  const obj = JSON.parse(raw);
  if (!Object.prototype.hasOwnProperty.call(obj, 'say') || !Object.prototype.hasOwnProperty.call(obj, 't')) {
    throw new Error('missing t/say ' + rel);
  }
  const extra = Object.keys(obj).filter(k => k !== 't' && k !== 'say');
  if (extra.length) throw new Error('unexpected keys ' + rel + ' ' + extra);
  if (!Array.isArray(obj.say) || obj.say.length !== obj.t.length) throw new Error('t/say length ' + rel);
  const bookChap = rel.replace(/^site\/data\/onkelos\//, '');
  const torah = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/torah', bookChap), 'utf8'));
  if (torah.v.length !== obj.say.length) throw new Error('verse count mismatch ' + rel);
  const nextSay = obj.say.slice();
  let pageChanged = 0;
  for (let i = 0; i < obj.say.length; i++) {
    verses++;
    alreadyOle += (obj.say[i].match(/\u05AB/g) || []).length;
    tOle += (obj.t[i].match(/\u05AB/g) || []).length;
    const { text, aligned, rejected } = applyAlignedOle(obj.say[i], torah.v[i], lexicon, blocked);
    for (const ch of rejected) {
      rejectedOcc.push({
        page: rel.replace(/^site\/data\//, '').replace(/\.json$/, ''),
        verse: i, start: ch.start, src: ch.src, key: ch.key, k: ch.k, bare: ch.bare, reason: 'not-in-parallel-torah-verse',
      });
    }
    if (!aligned.length) continue;
    if (stripOle(text) !== stripOle(obj.say[i])) throw new Error('non-ole change ' + rel + '#' + i);
    if (lettersOnly(text) !== lettersOnly(obj.say[i])) throw new Error('letters changed ' + rel + '#' + i);
    nextSay[i] = text;
    for (const ch of aligned) {
      if (isLav(ch.bare)) throw new Error('לאו stamped ' + rel);
      const occ = {
        page: rel.replace(/^site\/data\//, '').replace(/\.json$/, ''),
        verse: i,
        start: ch.start,
        src: ch.src,
        dest: ch.dest,
        key: ch.key,
        k: ch.k,
        bare: ch.bare,
        contextBefore: obj.say[i].slice(Math.max(0, ch.start - 40), ch.start),
        contextAfter: obj.say[i].slice(ch.start + ch.src.length, ch.start + ch.src.length + 40),
      };
      occurrences.push(occ);
      formCount.set(ch.key, (formCount.get(ch.key) || 0) + 1);
      pageChanged++;
    }
  }
  if (pageChanged) {
    const out = writeOnkelosSay(raw, nextSay);
    const again = JSON.parse(out);
    if (JSON.stringify(again.t) !== JSON.stringify(obj.t)) throw new Error('t changed ' + rel);
    // prefix bytes of t must be identical
    const tEndMarker = ',"say":';
    const at = raw.indexOf(tEndMarker);
    if (out.slice(0, at) !== raw.slice(0, at)) throw new Error('t prefix bytes changed ' + rel);
    if (!dry) fs.writeFileSync(f, out);
    pagesWritten++;
  } else {
    pagesUnchanged++;
  }
}

const forms = [...formCount.entries()].map(([key, occ]) => {
  const sample = occurrences.find(o => o.key === key);
  return { key, occ, k: sample?.k, sample: sample?.src, dest: sample?.dest, page: sample?.page };
}).sort((a, b) => b.occ - a.occ || a.key.localeCompare(b.key, 'he'));

const report = {
  lexicon: path.relative(ROOT, lexPath).replaceAll('\\', '/'),
  minCount: lex.minCount,
  alignment: 'torah-verse-stressKey',
  blocked: [...blocked],
  files,
  verses,
  alreadyOle,
  tOle,
  pagesWritten,
  pagesUnchanged,
  changedTokens: occurrences.length,
  uniqueForms: forms.length,
  rejectedTokens: rejectedOcc.length,
  forms,
  occurrences,
  rejected: rejectedOcc,
};
if (!dry) fs.writeFileSync(reportPath, JSON.stringify(report));
console.log(JSON.stringify({
  ok: true,
  dry,
  changedTokens: report.changedTokens,
  uniqueForms: report.uniqueForms,
  pagesWritten,
  pagesUnchanged,
  alreadyOle,
  tOle,
  rejectedTokens: rejectedOcc.length,
  report: dry ? null : reportPath,
}, null, 2));
