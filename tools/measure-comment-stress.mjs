import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOleToText, isLav, lettersOnly, stressKey, HATAMA } from './lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'), 'utf8'));
const blockedRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-blocked.json'), 'utf8'));
const blocked = new Set(blockedRaw.forms || []);
const lexicon = lex.forms;
const SKIP = new Set([
  'site/data/nachv/I_Samuel/15.json','site/data/nachv/I_Samuel/20.json','site/data/nachv/I_Samuel/6.json',
  'site/data/nachv/Isaiah/22.json','site/data/nachv/Isaiah/27.json','site/data/nachv/Isaiah/61.json',
  'site/data/nachv/Joshua/15.json','site/data/nachv/Joshua/16.json','site/data/nachv/Joshua/17.json',
  'site/data/nachv/Judges/14.json','site/data/nachv/Judges/20.json','site/data/nachv/Judges/8.json',
]);

function walk(d, acc=[]) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}
function walkStrings(node, fn, pathArr=[]) {
  if (typeof node === 'string') fn(node, pathArr);
  else if (Array.isArray(node)) node.forEach((x,i)=>walkStrings(x, fn, pathArr.concat(i)));
}

const corpora = [
  { name: 'bsay', dir: path.join(ROOT, 'site/data/gemara/bsay') },
  { name: 'ysay', dir: path.join(ROOT, 'site/data/gemara/ysay') },
  { name: 'nachv', dir: path.join(ROOT, 'site/data/nachv') },
];
const out = {};
let totalChanged=0, totalForms=new Set();
for (const c of corpora) {
  const rec = { files:0, skippedPins:0, alreadyOle:0, changed:0, forms:new Set(), pagesWithChanges:0, lavSkipped:0 };
  for (const f of walk(c.dir)) {
    const rel = path.relative(ROOT, f).replaceAll('\\','/');
    rec.files++;
    if (SKIP.has(rel)) { rec.skippedPins++; continue; }
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    let pageChanged=0;
    walkStrings(d.say, (s) => {
      const already = (s.match(/\u05AB/g)||[]).length;
      rec.alreadyOle += already;
      const { changed } = applyOleToText(s, lexicon, blocked);
      rec.changed += changed.length;
      pageChanged += changed.length;
      for (const ch of changed) rec.forms.add(ch.key);
    });
    if (pageChanged) rec.pagesWithChanges++;
  }
  out[c.name] = { ...rec, forms: rec.forms.size, formList: undefined };
  totalChanged += rec.changed;
  rec.forms.forEach(k => totalForms.add(k));
  console.log(c.name, { files: rec.files, skippedPins: rec.skippedPins, alreadyOle: rec.alreadyOle, changed: rec.changed, uniqueForms: rec.forms.size, pagesWithChanges: rec.pagesWithChanges });
}
console.log(JSON.stringify({ totalChanged, uniqueForms: totalForms.size, corpora: Object.fromEntries(Object.entries(out).map(([k,v])=>[k, { ...v, forms: v.forms }])) }, null, 2));
fs.writeFileSync('/tmp/comment-stress-yield.json', JSON.stringify({ totalChanged, uniqueForms: totalForms.size, out: Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{...v, forms:v.forms}])) }, null, 2));
