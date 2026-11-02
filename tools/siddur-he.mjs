// Adds the Hebrew translation of the siddur's English instructions to the built siddur data (round 7).
// Source of the translation: tools/data/siddur-he.json (made for this project; see
// verification/SIDDUR-HEBREW-INSTRUCTIONS.md). The English is the Open Siddur Project's (CC BY 4.0), so the
// Hebrew is a translation of a CC BY work and is credited as such in the app.
// Usage: node tools/siddur-he.mjs   (run by tools/build-siddur.mjs as well; idempotent; fails on a missing translation)
import fs from 'node:fs';
import path from 'node:path';
import { englishRuns } from '../site/js/siddur-lang.js';
const root = new URL('../', import.meta.url).pathname, OUT = path.join(root, 'site/data/siddur');
export function applySiddurHebrew() {
  const T = JSON.parse(fs.readFileSync(path.join(root, 'tools/data/siddur-he.json'), 'utf8'));
  const idxP = path.join(OUT, 'index.json'), idx = JSON.parse(fs.readFileSync(idxP, 'utf8'));
  const missing = [], usedRuns = new Set();
  for (const b of idx.books) b.secs.forEach((s, i) => {
    const p = path.join(OUT, b.id, `${i + 1}.json`), d = JSON.parse(fs.readFileSync(p, 'utf8'));
    d.b = d.b.map(([t, h]) => {
      if (t === 'n') { const he = T.notes[h]; if (!he) missing.push(`note ${b.id}/${i + 1}: ${h.slice(0, 60)}`); return he ? [t, h, he] : [t, h]; }
      for (const r of englishRuns(h)) { if (!Object.hasOwn(T.runs, r)) missing.push(`run ${b.id}/${i + 1}: ${r}`); else usedRuns.add(r); }
      return [t, h];
    });
    fs.writeFileSync(p, JSON.stringify(d));
  });
  idx.heRuns = Object.fromEntries(Object.entries(T.runs).filter(([k]) => usedRuns.has(k)));
  fs.writeFileSync(idxP, JSON.stringify(idx));
  if (missing.length) throw new Error('missing Hebrew translation:\n' + missing.join('\n'));
  return { notes: Object.keys(T.notes).length, runs: usedRuns.size };
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) console.log(applySiddurHebrew());
