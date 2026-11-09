// Audit of the speech layer for shin/sin and vav ambiguity (1.0.87). Walks every string the local voice reads:
// Chumash/Tehillim verses (v), Rashi speech (rs), Hayom Yom speech (p[i][2]) and every compiled `say` field.
// Usage: node tools/shin-vav-audit.mjs [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import { letters, FULLV, DAGESH, HOLAM, SHVA } from '../site/js/g2p.js';

const DATA = new URL('../site/data/', import.meta.url).pathname;
const SECTION = { torah: 'chumash+rashi', tehillim: 'tehillim', hayomyom: 'hayomyom', tanya: 'tanya', ravyomi: 'halacha', siddur: 'siddur', tolt: 'torah-or', rambam: 'rambam' };
export function* speechStrings() {
  for (const sec of Object.keys(SECTION)) {
    for (const f of fs.readdirSync(DATA + sec, { recursive: true }).filter(p => p.endsWith('.json') && !p.endsWith('index.json')).sort()) {
      const d = JSON.parse(fs.readFileSync(path.join(DATA, sec, f)));
      const out = [];
      const walk = (o, key) => {
        if (typeof o === 'string') { if (key) out.push([key, o]); return; }
        if (Array.isArray(o)) { if (sec === 'hayomyom' && key === 'p') { for (const p of o) if (typeof p?.[2] === 'string') out.push(['p', p[2]]); return; } o.forEach(x => walk(x, key)); return; }
        if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, (k === 'say' || ((sec === 'torah' || sec === 'tehillim') && (k === 'v' || k === 'rs'))) ? k : (sec === 'hayomyom' && k === 'p') ? 'p' : key);
      };
      walk(d, null);
      for (const [k, s] of out) yield { section: sec === 'torah' && k === 'rs' ? 'rashi' : SECTION[sec], file: sec + '/' + f, text: s };
    }
  }
}
const full = L => !!L && [...L.diac].some(c => FULLV.has(c));
const vocalized = L => L.some(l => /[\u05B0-\u05BB\u05C7]/.test(l.diac));
/** Categories of one word. */
export function wordIssues(w) {
  const L = letters(w.replace(/[\u0591-\u05AF\u05BD]/g, '')), r = [];
  if (!L.length) return r;
  const voc = vocalized(L);
  L.forEach((l, i) => {
    const prev = L[i - 1], d = l.diac;
    if (l.ch === 'ש' && !/[\u05C1\u05C2]/.test(d) && !(prev?.ch === 'ש' && /\u05C2/.test(prev.diac))) r.push(voc ? 'shin-undotted' : 'shin-undotted-unvocalized-word');
    if (l.ch !== 'ו' || !voc) return;
    if (d.includes('\u05BA')) r.push('vav-holam-haser');
    else if (d.includes(HOLAM) && !d.includes(DAGESH) && full(prev) && !prev.diac.includes(HOLAM)) r.push('vav-consonant-holam');
    if (d.includes(DAGESH) && /[\u05B4\u05BB]/.test(d)) r.push('vav-dagesh-hiriq-qubuts');
    if (d.includes(DAGESH) && d.includes(SHVA)) r.push('vav-dagesh-shva');
    if (!d && i > 0 && i < L.length - 1 && !full(prev) && !prev.diac.includes(SHVA) && /[\u05B0-\u05BB]/.test(L[i + 1].diac)) r.push('vav-bare-after-vowelless');
  });
  return r;
}
export function audit(transform = s => s) {
  const tot = {}, bySec = {}, ex = {};
  for (const { section, text } of speechStrings()) {
    const t = transform(text);
    for (const tok of t.replace(/<[^>]+>/g, ' ').split(/[\s\u05BE]+/)) {
      // abbreviations (׳ ״ ' ") are expanded by tts-prep before the voice; they are not raw voice words
      if (/[\u05F3\u05F4'"]/.test(tok)) continue;
      const w = tok.replace(/[^\u05D0-\u05EA\u0591-\u05C7]/g, ''); if (!w) continue;
      for (const k of wordIssues(w)) {
      tot[k] = (tot[k] || 0) + 1; (bySec[section] ||= {})[k] = (bySec[section][k] || 0) + 1;
      const e = (ex[k] ||= new Map()); e.set(w, (e.get(w) || 0) + 1);
    }}
  }
  const examples = Object.fromEntries(Object.entries(ex).map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1]).slice(0, 25)]));
  const distinct = Object.fromEntries(Object.entries(ex).map(([k, m]) => [k, m.size]));
  return { total: tot, distinct, bySection: bySec, examples };
}
// "after": what the voice actually receives (fixShinVav per word, exactly as textToIPA does)
export async function auditAfter() {
  const { fixShinVav } = await import('../site/js/g2p.js');
  return audit(t => t.replace(/[\u05D0-\u05EA\u0591-\u05C7]+/g, w => fixShinVav(w)));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = process.argv.includes('--after') ? await auditAfter() : audit();
  const i = process.argv.indexOf('--json'); if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ total: r.total, distinct: r.distinct }, null, 1));
  for (const [k, v] of Object.entries(r.examples)) console.log(k, v.slice(0, 15).map(([w, n]) => w + '×' + n).join(' '));
}
