// Build the Tanya "מראי מקומות" (source references: verses, Talmud, Zohar…) of Hebrew Wikisource's
// "תניא מנוקד" (CC BY-SA 4.0, https://he.wikisource.org/wiki/תניא_מנוקד) and attach each note to the segment of
// our Kehot text (Sefaria) where its footnote mark stands. The two texts are aligned word by word (LCS on letters,
// ו/י and niqqud ignored; Wikisource spells out abbreviations, so only equal words pair up). A note is placed only
// when (1) the word before its mark and the word before that are both aligned, and (2) a word right after the mark
// is aligned close by in our text; otherwise it is dropped (counted). Only the note text is taken – nothing is written by us.
// Writes site/data/notes/tanya/<key>.json = { "<chapter>": { "<segment>": [{ w: "the 3 words before the mark (Wikisource)", t: "note" }, …] } } and prints coverage.
// Usage: node tools/build-notes-tanya.mjs   (cache: /tmp/notes-cache/ws)
import fs from 'node:fs';
import path from 'node:path';
import { gem } from '../site/js/calendar.js';

const CACHE = '/tmp/notes-cache/ws', OUT = 'site/data/notes/tanya', BASE = 'תניא מנוקד';
const index = JSON.parse(fs.readFileSync('site/data/tanya/index.json', 'utf8'));
const g = n => gem(n).replace(/[׳״'"]/g, '');
const PAGES = { 'LA-foreword': () => 'חלק א/הקדמה', LA: c => `חלק א/פרק ${g(c)}`, 'SY-chinukh': () => 'חלק ב/חנוך לנער', SY: c => `חלק ב/פרק ${g(c)}`, IT: c => `חלק ג/${g(c)}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function raw(title) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, encodeURIComponent(title).replace(/%/g, '') + '.txt');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  const url = `https://he.wikisource.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw`;
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'chitas-reader-build/1.0 (non-commercial; github.com/dudidd-wq/chitas-reader)' } });
    if (r.ok) { const t = await r.text(); fs.writeFileSync(f, t); await sleep(400); return t; }
    if (r.status === 404) return null;
    if (i > 4) throw new Error(r.status + ' ' + title); await sleep(2000 * (i + 1));
  }
}
// letters only, final forms folded, ו/י dropped (spelling-insensitive: מלא/חסר)
const FIN = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const letters = s => s.replace(/[\u0591-\u05C7]/g, '').replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]).replace(/[וי]/g, '');
/** wikitext → plain text (links → their label, templates dropped) */
const plain = w => w.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\/\/\S+ ([^\]]*)\]/g, '$1').replace(/'{2,}/g, '')
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
function dropTemplates(s) { let p; do { p = s; s = s.replace(/\{\{[^{}]*\}\}/g, ''); } while (s !== p); return s; }
function parse(w) {
  const i = w.indexOf('==מראי מקומות==');
  if (i < 0) return null;
  let body = w.slice(0, i), foot = w.slice(i);
  body = body.replace(/\{\{שוליים\|(\d+)\}\}/g, '\u0001$1\u0002');
  body = dropTemplates(plain(body)).replace(/^==.*==$/gm, '');
  const notes = {};
  for (const m of foot.matchAll(/\{\{הע3\|(\d+)\}\}([\s\S]*?)(?=\{\{הע3\||\|ריווח=|\}\}\s*$)/g)) {
    const t = dropTemplates(plain(m[2])).replace(/\s+/g, ' ').trim();
    if (t) notes[m[1]] = t;
  }
  // words (normalised letters) with the marks' positions (= number of words before the mark)
  const words = [], raw = [], marks = [];
  for (const part of body.split(/(\u0001\d+\u0002)/)) {
    const mm = part.match(/^\u0001(\d+)\u0002$/);
    if (mm) marks.push({ n: mm[1], at: words.length }); else for (const w of part.split(/[\s\u05BE־]+/)) { const l = letters(w); if (l) { words.push(l); raw.push(w.replace(/[^\u05D0-\u05EA\u0591-\u05C7"'״׳]/g, '')); } }
  }
  return { words, raw, marks, notes };
}
const report = { perKey: {}, notes: 0, placed: 0, droppedPlace: 0, droppedEmpty: 0 };
fs.mkdirSync(OUT, { recursive: true });
for (const k of Object.keys(index)) {
  const P = PAGES[k], R = report.perKey[k] = { chapters: index[k].chapters.length, withNotes: 0, notes: 0, placed: 0, source: P ? 'ויקיטקסט' : 'none' };
  if (!P) continue;
  const out = {};
  for (let c = 1; c <= index[k].chapters.length; c++) {
    const w = await raw(`${BASE}/${P(c)}`); const p = w && parse(w);
    if (!p) continue;
    const segs = JSON.parse(fs.readFileSync(`site/data/tanya/${k}/${c}.json`, 'utf8')).s;
    const ours = [], seg = [];
    segs.forEach((x, i) => { for (const w of x.replace(/<[^>]+>/g, ' ').split(/[\s\u05BE־]+/)) { const l = letters(w); if (l) { ours.push(l); seg.push(i); } } });
    // word-level LCS alignment Wikisource ↔ Kehot (Wikisource spells out abbreviations, so only equal words pair up)
    const A = p.words, B = ours, n = A.length, m = B.length, T = new Uint16Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i * (m + 1) + j] = A[i] === B[j] ? T[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(T[(i + 1) * (m + 1) + j], T[i * (m + 1) + j + 1]);
    const map = new Int32Array(n).fill(-1);
    for (let i = 0, j = 0; i < n && j < m;) { if (A[i] === B[j] && A[i].length > 1) { map[i] = j; i++; j++; } else if (T[(i + 1) * (m + 1) + j] >= T[i * (m + 1) + j + 1]) i++; else j++; }
    const ch = {};
    for (const { n: num, at } of p.marks) {
      const t = p.notes[num]; R.notes++; report.notes++;
      if (!t) { report.droppedEmpty++; continue; }
      // two checks: the word right before the mark and a word right after it (within 3) must both be aligned, adjacent in our text
      let bi = -1; for (let i = at - 1; i >= Math.max(0, at - 2); i--) if (map[i] >= 0) { bi = i; break; }
      let ai = -1; for (let i = at; i < Math.min(n, at + 3); i++) if (map[i] >= 0) { ai = i; break; }
      const okB = bi >= 0 && bi >= 1 && map[bi - 1] >= 0 || bi >= 0 && bi === 0;
      const atEnd = at >= n - 1;
      if (bi < 0 || !okB || (ai < 0 && !atEnd) || (ai >= 0 && map[ai] - map[bi] > (ai - bi) + 3)) { report.droppedPlace++; if (process.env.DBG) console.error(k, c, num, A.slice(Math.max(0, at - 5), at).join(' '), '|', A.slice(at, at + 3).join(' ')); continue; }
      const si = seg[map[bi]];
      (ch[si + 1] ||= []).push({ w: p.raw.slice(Math.max(0, at - 3), at).join(' '), t }); R.placed++; report.placed++;
    }
    if (Object.keys(ch).length) { out[c] = ch; R.withNotes++; }
  }
  if (Object.keys(out).length) fs.writeFileSync(`${OUT}/${k}.json`, JSON.stringify(out)); // keys listed in texts.js NOTE_KEYS
}
fs.writeFileSync('verification/notes-tanya-stats.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report, null, 1));
