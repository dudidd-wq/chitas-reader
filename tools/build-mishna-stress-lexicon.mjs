// Build tools/data/mishna-stress-lexicon.json from Torah+Tehillim cantillation.
// Usage: node tools/build-mishna-stress-lexicon.mjs [--min-count 5] [--out path]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accentWords, stressFromAccents, stressKey, lettersOnly, isLav, MIN_COUNT_DEFAULT, cleanVerse } from './lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const minCount = (() => {
  const i = process.argv.indexOf('--min-count');
  return i >= 0 ? Number(process.argv[i + 1]) : MIN_COUNT_DEFAULT;
})();
const outArg = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1] : path.join(ROOT, 'tools/data/mishna-stress-lexicon.json');
})();

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
  }
  return acc;
}

const bib = new Map();
let bibWords = 0, bibLocated = 0;
for (const book of ['torah', 'tehillim']) {
  for (const f of walk(path.join(ROOT, 'site/data', book))) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const v of d.v || []) {
      if (typeof v !== 'string') continue;
      for (const t of accentWords(cleanVerse(v))) {
        if (t.joined) continue;
        bibWords++;
        const k = stressFromAccents(t.word, { allowOle: false });
        if (k === null) continue;
        bibLocated++;
        const key = stressKey(t.word);
        if (!key || isLav(lettersOnly(t.word))) continue;
        let m = bib.get(key);
        if (!m) bib.set(key, m = new Map());
        m.set(k, (m.get(k) || 0) + 1);
      }
    }
  }
}

const forms = {};
for (const [key, m] of bib) {
  if (m.size !== 1) continue;
  const [k, n] = [...m][0];
  if (k < 1 || n < minCount) continue;
  forms[key] = { k, bibN: n };
}

const payload = {
  v: 1,
  rule: 'unique Torah+Tehillim cantillation stress, k>=1 (not default milra), minCount, never לאו',
  minCount,
  source: 'site/data/torah + site/data/tehillim',
  bibWords,
  bibLocated,
  bibKeys: bib.size,
  formCount: Object.keys(forms).length,
  forms,
};
fs.mkdirSync(path.dirname(outArg), { recursive: true });
fs.writeFileSync(outArg, JSON.stringify(payload) + '\n');
console.log(JSON.stringify({ ok: true, out: outArg, minCount, formCount: payload.formCount, bibWords, bibLocated }, null, 2));
