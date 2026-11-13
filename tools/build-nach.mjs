// 1.0.98: Nach Yomi (text + Metzudat David / Rashi), Sefer HaMitzvot niqqud, Targum Onkelos for Shnayim Mikra.
//   node tools/nach-plan.mjs; python3 tools/fetch-gemara.py texts $CACHE/nach-plan.json
//   node tools/build-nach.mjs --prepare     # Dicta jobs (dicta-input-2.json): Sefer HaMitzvot, then Metzudat David in Nach Yomi order
//   GEMARA_DICTA_INPUT=$CACHE/dicta-input-2.json python3 tools/fetch-gemara.py dicta
//   node tools/build-nach.mjs               # site/data/nach, nachv, onkelos, mitzvot-voc + verification/NACH-198-metrics.json
// Speech and displayed niqqud: the same pipeline as the Gemara explanations (tools/gemara-pronunciation.mjs); Dicta
// "rabbinic" genre; the dibbur hamatchil (bold) takes the verse's own niqqud.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { nachChapters, nachYomi } from '../site/js/gemara-cycles.js';
import { speechRuns, plainOf, batchTexts, dictaWords, cursor, composeSay, gemaraWords, vocalizeHtml, sayVocalized } from './gemara-pronunciation.mjs';
import { CACHE, NACH_RASHI, TORAH } from './nach-plan.mjs';
const ROOT = new URL('../', import.meta.url).pathname, DATA = ROOT + 'site/data/';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const safe = ref => ref.replace(/[^A-Za-z0-9.:-]/g, '_').replace(/:/g, '-');
const readGz = f => { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); } catch { return null; } };
const sef = (tag, ref) => { const d = readGz(`${CACHE}/sefaria/${tag}/${safe(ref)}.json.gz`); return d?.versions?.length ? d : null; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
function dseg(genre, plain) {
  const h = sha(plain);
  try { const d = JSON.parse(fs.readFileSync(`${CACHE}/dseg/${genre}/${h.slice(0, 2)}/${h}.json`)); return d.t === plain ? d.w.map(([word, w, acc]) => ({ word, sep: false, options: w ? [{ w, acc, level: 1 }] : [] })) : null; } catch { return null; }
}
const pathB = b => b.replace(/ /g, '_');
const display = h => (h || '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i [^>]*data-commentator[^>]*>[\s\S]*?<\/i>/g, '')
  .replace(/<(\/?)(strong|b)(\s[^>]*)?>/gi, '<$1b>').replace(/<(\/?)(big|small)(\s[^>]*)?>/gi, '<$1$2>').replace(/<(?!\/?(b|small|big)>)[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const comments = d => { const t = d?.versions?.[0]?.text; return Array.isArray(t) ? t.map(x => (Array.isArray(x) ? x : x ? [x] : []).map(y => y || '').filter(Boolean)) : []; };
const mitzvotFiles = () => { const out = []; const walk = d => { for (const e of fs.readdirSync(DATA + d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json') && e.name !== 'index.json') out.push(p); } }; walk('mitzvot'); return out.sort(); };
// Nach Yomi order from the given day
const order = from => { const all = nachChapters(), k0 = all.findIndex(x => { const t = nachYomi(from); return x.book === t.book && x.c === t.c; }); return [...all.slice(k0), ...all.slice(0, k0)]; };

if (process.argv.includes('--prepare')) {
  const need = [], seen = new Set(), want = p => { if (p && !seen.has(p)) { seen.add(p); if (!dseg('rabbinic', p)) need.push(p); } };
  for (const f of mitzvotFiles()) JSON.parse(fs.readFileSync(DATA + f)).s.forEach(h => want(plainOf(speechRuns(h))));
  const nm = need.length;
  if (!process.argv.includes('--mitzvot-only')) for (const { book, c } of order(arg('--from') || new Date().toISOString().slice(0, 10))) if (!NACH_RASHI.includes(book)) comments(sef('md', `Metzudat David on ${book} ${c}`)).flat().forEach(h => want(plainOf(speechRuns(h))));
  const jobs = batchTexts(need).map(b => ({ genre: 'rabbinic', ...b }));
  fs.writeFileSync(CACHE + '/' + (arg('--out') || 'dicta-input-2.json'), JSON.stringify(jobs));   // --mitzvot-only --out f: retry list for failed batches
  console.log('missing: sefer hamitzvot', nm, 'metzudat david', need.length - nm, '| jobs', jobs.length, 'chars', jobs.reduce((n, j) => n + j.text.length, 0));
  process.exit(0);
}
const sizes = {}, write = (rel, obj) => { const f = DATA + rel; fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); const k = rel.split('/')[0]; sizes[k] = (sizes[k] || 0) + fs.statSync(f).size; };
for (const d of ['nach', 'nachv', 'onkelos', 'mitzvot-voc']) fs.rmSync(DATA + d, { recursive: true, force: true });
const src = {}, warn = [], stats = { md: {}, rashi: {}, mitzvot: {}, onkelos: {} };
const meta = (k, d) => { const v = d?.versions?.[0]; if (v && !src[k]) src[k] = { versionTitle: v.versionTitle, versionTitleInHebrew: v.versionTitleInHebrew || '', versionSource: v.versionSource, license: v.license }; };
const cov = { nach: { chapters: 0, verses: 0, comments: 0, commentsDicta: 0, chaptersFull: 0 }, mitzvot: { segs: 0, dicta: 0 }, onkelos: { chapters: 0, verses: 0 } };
// one explanation comment → [speech, display niqqud or '']
function explain(h, verse, genreless) {
  if (genreless) return [sayVocalized(h, stats.rashi), ''];   // Rashi (Metsudah) is vocalized already
  const runs = speechRuns(h), plain = plainOf(runs); if (!plain) return ['', ''];
  const rab = dseg('rabbinic', plain), gw = gemaraWords(verse || '');
  return [composeSay(runs, gw, rab ? cursor(dictaWords(rab)) : () => null, null, stats.md), rab ? vocalizeHtml(display(h), gw, cursor(dictaWords(rab)), null) : null];
}
const books = {};
for (const { book, c } of nachChapters()) {
  cov.nach.chapters++;
  const t = sef('mam', `${book} ${c}`), rashi = NACH_RASHI.includes(book), e = sef(rashi ? 'nrashi' : 'md', `${rashi ? 'Rashi' : 'Metzudat David'} on ${book} ${c}`);
  const V = t?.versions?.[0]?.text; if (!Array.isArray(V)) { warn.push(`no text: ${book} ${c}`); continue; }
  meta('nach', t); meta(rashi ? 'nachRashi' : 'metzudat', e);
  const C = comments(e); if (!C.length) warn.push(`no explanation: ${book} ${c}`);
  books[book] = Math.max(books[book] || 0, c);
  write(`nach/${pathB(book)}/${c}.json`, { v: V, e: V.map((_, i) => (C[i] || []).map(display)), el: rashi ? 'rashi' : 'md' });
  let n = 0, d = 0;
  const say = [], vd = [];
  V.forEach((verse, i) => { const S = [], D = []; for (const h of C[i] || []) { const [s, v] = explain(h, verse, rashi); if (!rashi) { n++; if (v) d++; } S.push(s); D.push(v || ''); } say.push(S); vd.push(D); });
  cov.nach.verses += V.length; cov.nach.comments += n; cov.nach.commentsDicta += d; if (d === n) cov.nach.chaptersFull++;
  write(`nachv/${pathB(book)}/${c}.json`, d === n ? { say, vd } : { say, vd, partial: n - d });
}
for (const [b, n] of Object.entries(TORAH)) for (let c = 1; c <= n; c++) {
  const t = sef('onk', `Onkelos ${b} ${c}`), V = t?.versions?.[0]?.text;
  if (!Array.isArray(V)) { warn.push(`no Onkelos: ${b} ${c}`); continue; }
  meta('onkelos', t); cov.onkelos.chapters++; cov.onkelos.verses += V.length;
  write(`onkelos/${b}/${c}.json`, { t: V.map(display), say: V.map(x => sayVocalized(display(x), stats.onkelos)) });
}
const doubt = [];
for (const f of mitzvotFiles()) {
  const S = JSON.parse(fs.readFileSync(DATA + f)).s, say = [], vd = [];
  for (const h of S) {
    const runs = speechRuns(h), plain = plainOf(runs), rab = plain && dseg('rabbinic', plain);
    cov.mitzvot.segs++; if (rab) cov.mitzvot.dicta++;
    say.push(plain ? composeSay(runs, [], rab ? cursor(dictaWords(rab)) : () => null, null, stats.mitzvot) : '');
    const v = rab ? vocalizeHtml(h, [], cursor(dictaWords(rab)), null) : '';
    vd.push(v);
    if (rab) { const { n, hit } = vocalizeHtml.last; if (n && hit / n < 0.85) doubt.push(`${f.replace(/^mitzvot\//, '')} #${say.length}: ${hit}/${n} words vocalized`); }
  }
  write(f.replace(/^mitzvot\//, 'mitzvot-voc/'), { say, vd });
}
write('nach/index.json', { books, sources: src });
const SJ = DATA + 'sources.json', sj = JSON.parse(fs.readFileSync(SJ));
const sefT = { nach: 'Joshua', metzudat: 'Metzudat David on Joshua', nachRashi: 'Rashi on Ruth', onkelos: 'Onkelos Genesis' };
for (const [k, m] of Object.entries(src)) sj[k] = { ...m, sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(sefT[k].replace(/ /g, '_'))}?vhe=${encodeURIComponent(m.versionTitle.trim().replace(/ /g, '_'))}&lang=he`, fetchedAt: sj[k]?.fetchedAt || '2026-11-13' };
fs.writeFileSync(SJ, JSON.stringify(sj, null, 2) + '\n');
const report = { coverage: cov, sizesMB: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, +(v / 1e6).toFixed(1)])), stats, mitzvotDoubtful: doubt, warnings: warn };
fs.writeFileSync(ROOT + 'verification/NACH-198-metrics.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, stats: undefined, mitzvotDoubtful: doubt.length, warnings: warn.slice(0, 20) }, null, 1));
