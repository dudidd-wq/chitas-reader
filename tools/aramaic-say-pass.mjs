// 1.0.112: applies the Aramaic speech rules (tools/aramaic-speech.mjs) to the compiled speech text of the Gemara
// (gemara/bsay: Steinsaltz with the Gemara's words; gemara/ysay: Penei Moshe with the Yerushalmi's words), Targum Onkelos
// (onkelos/*: say) and the Tanya / Torah Or / Likkutei Torah (tanya/*, tolt/w/*). Display fields are never read or written.
// Idempotent: running it again changes nothing (a test checks this), so it is re-run after any rebuild of those files.
//   node tools/aramaic-say-pass.mjs [--dry] [--report out.tsv]
import fs from 'node:fs';
import { aramSayText, segMishnah, amudOrder } from './aramaic-speech.mjs';
const D = new URL('../site/data/', import.meta.url).pathname;
const dry = process.argv.includes('--dry'), rep = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null;
const stats = {}, changes = new Map();
const read = f => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const save = (f, j, orig) => { const s = JSON.stringify(j); if (s !== orig && !dry) fs.writeFileSync(D + f, s); return s !== orig; };
function tally(kind, a, b) {
  if (a === b) return;
  const A = a.split(' '), B = b.split(' ');
  if (A.length !== B.length) return;
  A.forEach((w, i) => { if (w !== B[i]) { const k = kind + '\t' + w.replace(/[.,:;?!]+$/, '') + '\t' + B[i].replace(/[.,:;?!]+$/, ''); changes.set(k, (changes.get(k) || 0) + 1); } });
}
const fix = (kind, say, mode, opt = {}) => { if (typeof say !== 'string' || !say) return say; const st = {}; const r = aramSayText(say, mode, { source: kind, ...opt, stats: st }); stats[kind] = (stats[kind] || 0) + (st.changed || 0); if (rep) tally(kind, say, r); return r; };
let files = 0;
// Bavli: the Mishnah state runs through the tractate in amud order
for (const tr of fs.readdirSync(D + 'gemara/bavli')) {
  let mi = false;
  for (const a of amudOrder(fs.readdirSync(D + 'gemara/bavli/' + tr))) {
    const d = read(`gemara/bavli/${tr}/${a}`), f = `gemara/bsay/${tr}/${a}`;
    if (d.yer || !fs.existsSync(D + f)) { continue; }
    const orig = fs.readFileSync(D + f, 'utf8'), j = JSON.parse(orig);
    j.say = j.say.map((s, i) => { mi = segMishnah(d.segs[i]?.[0] || '', mi); return fix('bavli', s, 'gemara', { mishnah: mi }); });
    files += save(f, j, orig);
  }
}
const walkFiles = d => fs.existsSync(D + d) ? fs.readdirSync(D + d, { recursive: true }).filter(f => f.endsWith('.json')).map(f => d + '/' + f) : [];
for (const f of walkFiles('gemara/ysay')) { const orig = fs.readFileSync(D + f, 'utf8'), j = JSON.parse(orig); j.say = j.say.map(x => Array.isArray(x) ? x.map(s => fix('yerushalmi', s, 'gemara')) : fix('yerushalmi', x, 'gemara')); files += save(f, j, orig); }
for (const f of walkFiles('onkelos')) { const orig = fs.readFileSync(D + f, 'utf8'), j = JSON.parse(orig); if (!j.say) continue; j.say = j.say.map(s => fix('onkelos', s, 'onkelos')); files += save(f, j, orig); }
for (const f of walkFiles('tanya')) { if (f.endsWith('index.json')) continue; const orig = fs.readFileSync(D + f, 'utf8'), j = JSON.parse(orig); if (!j.say) continue; j.say = j.say.map(x => Array.isArray(x) ? x.map(s => fix('tanya', s, 'prose')) : fix('tanya', x, 'prose')); files += save(f, j, orig); }
for (const f of walkFiles('tolt/w')) { const orig = fs.readFileSync(D + f, 'utf8'), j = JSON.parse(orig); (j.days || []).forEach(d => (d || []).forEach(p => { if (p?.say) p.say = fix('tolt', p.say, 'prose'); })); files += save(f, j, orig); }
console.log(JSON.stringify({ dry, filesChanged: files, wordsChanged: stats }));
if (rep) fs.writeFileSync(rep, [...changes].sort((a, b) => b[1] - a[1]).map(([k, n]) => n + '\t' + k).join('\n') + '\n');
