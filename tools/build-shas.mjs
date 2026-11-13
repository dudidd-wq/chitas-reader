// 1.0.97: the whole Shas – Bavli (Davidson vocalized Gemara + Steinsaltz), Yerushalmi (Vilna dafim) and Mishnah with
// Bartenura, written once as display files; the speech layer (Steinsaltz / Bartenura `say`) goes to separate files
// (gemara/bsay, gemara/msay) so later Dicta progress only adds/replaces those. Network: tools/fetch-gemara.py.
//   node tools/build-shas.mjs --prepare [--max N]   # Dicta jobs for the segments still missing, in priority order
//   node tools/build-shas.mjs                       # writes site/data/gemara + verification/SHAS-197-metrics.json
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { dafYomi, amudYomi } from '../site/js/gemara-cycles.js';
import { speechRuns, plainOf, batchTexts, dictaWords, cursor, composeSay, gemaraWords, vocalizeHtml } from './gemara-pronunciation.mjs';
import { CACHE, SEDER } from './shas-plan.mjs';
const ROOT = new URL('../', import.meta.url).pathname, OUT = ROOT + 'site/data/gemara';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const safe = ref => ref.replace(/[^A-Za-z0-9.:-]/g, '_').replace(/:/g, '-');
const readGz = f => { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); } catch { return null; } };
const sef = (tag, ref) => { const d = readGz(`${CACHE}/sefaria/${tag}/${safe(ref)}.json.gz`); return d?.versions?.length ? d : null; };
const flat = x => Array.isArray(x) ? x.flatMap(flat) : [x];
const segsOf = d => { const t = d?.versions?.[0]?.text; return t == null ? [] : flat(t).map(x => x || ''); };
const P = JSON.parse(fs.readFileSync(CACHE + '/shas-plan.json'));
const pathT = t => t.replace(/ /g, '_');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
function dseg(genre, plain) {
  const h = sha(plain);
  try { const d = JSON.parse(fs.readFileSync(`${CACHE}/dseg/${genre}/${h.slice(0, 2)}/${h}.json`)); return d.t === plain ? d.w.map(([word, w, acc]) => ({ word, sep: false, options: w ? [{ w, acc, level: 1 }] : [] })) : null; } catch { return null; }
}
const steOf = (t, a) => segsOf(sef('ste', `Steinsaltz on ${t} ${a}`));
const barOf = m => { const t = sef('barc', `Bartenura on ${m.sef} ${m.c}`)?.versions?.[0]?.text; return Array.isArray(t) ? t.map(x => flat(x || []).map(y => y || '')) : []; };
const pmCache = new Map();
const pmHalakha = (t, c, h) => { const k = `${t} ${c}:${h}`; if (!pmCache.has(k)) { if (pmCache.size > 50) pmCache.clear(); const d = sef('pm', `Penei Moshe on Jerusalem Talmud ${k}`); pmCache.set(k, d); } return pmCache.get(k); };
/** Penei Moshe comments of one Yerushalmi segment [c, h, g] */
const pmOf = (t, [c, h, g]) => { const d = pmHalakha(t, c, h), x = d?.versions?.[0]?.text?.[g - 1]; return Array.isArray(x) ? flat(x).map(y => y || '') : x ? [x] : []; };
const yerDafs = () => [...P.yer.flatMap(y => y.dafim.filter(d => d.ref).map(d => ({ t: y.t, ...d }))), ...P.shekalim.map(s => ({ t: 'Shekalim', ...s }))];

if (process.argv.includes('--prepare')) {
  // priority: all Bartenura, then Bavli amudim by the first date they come up in Daf Yomi / Amud Yomi from today
  const order = new Map(), start = new Date((arg('--from') || new Date().toISOString().slice(0, 10)) + 'T12:00:00Z');
  for (let k = 0; k < 2800; k++) { const d = new Date(start); d.setUTCDate(d.getUTCDate() + k); const iso = d.toISOString().slice(0, 10);
    for (const c of [dafYomi(iso), amudYomi(iso)]) for (const a of c.amudim) { const key = `${c.t} ${a}`; if (!order.has(key)) order.set(key, k); } }
  const need = { rabbinic: [], modern: [] }, seen = new Set();
  const want = (genre, plain) => { if (!plain || seen.has(genre + plain)) return; seen.add(genre + plain); if (!dseg(genre, plain)) need[genre].push(plain); };
  for (const m of P.mishna) m.chapters.forEach((_, c) => barOf({ ...m, c: c + 1 }).flat().forEach(h => want('rabbinic', plainOf(speechRuns(h)))));
  const amudim = P.bavli.flatMap(b => b.amudim.map(a => [b.t, a])).sort((x, y) => (order.get(x.join(' ')) ?? 1e9) - (order.get(y.join(' ')) ?? 1e9));
  const soon = amudim.filter(([t, a]) => (order.get(`${t} ${a}`) ?? 1e9) < 120);
  for (const [t, a] of soon) steOf(t, a).forEach(h => want('modern', plainOf(speechRuns(h))));
  const early = need.modern.length; need.pm = [];
  const r0 = need.rabbinic.length;
  for (const d of yerDafs()) for (const sg of d.segs || []) pmOf(d.t, sg).forEach(h => want('rabbinic', plainOf(speechRuns(h))));
  need.pm = need.rabbinic.splice(r0);
  for (const [t, a] of amudim) steOf(t, a).forEach(h => want('modern', plainOf(speechRuns(h))));
  console.log('penei moshe segments', need.pm.length, '| steinsaltz in the next 120 days', early);
  let jobs = [...batchTexts(need.rabbinic).map(b => ({ genre: 'rabbinic', ...b })), ...batchTexts(need.modern.slice(0, early)).map(b => ({ genre: 'modern', ...b })),
    ...batchTexts(need.pm).map(b => ({ genre: 'rabbinic', ...b })), ...batchTexts(need.modern.slice(early)).map(b => ({ genre: 'modern', ...b }))];
  if (arg('--max')) jobs = jobs.slice(0, +arg('--max'));
  fs.writeFileSync(CACHE + '/dicta-input.json', JSON.stringify(jobs));
  console.log('missing segments: bartenura', need.rabbinic.length, 'steinsaltz', need.modern.length, '| jobs', jobs.length, 'chars', jobs.reduce((n, j) => n + j.text.length, 0));
  process.exit(0);
}
// ---------------- build ----------------
const display = h => (h || '').replace(/<i [^>]*data-overlay[^>]*>[\s\S]*?<\/i>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i [^>]*data-commentator[^>]*>[\s\S]*?<\/i>/g, '')
  .replace(/<(\/?)(strong|big|b)(\s[^>]*)?>/gi, '<$1b>').replace(/<(\/?)small(\s[^>]*)?>/gi, '<$1small>').replace(/<(?!\/?(b|small)>)[^>]*>/g, '')
  .replace(/<b>\s*<b>/g, '<b>').replace(/<\/b>\s*<\/b>/g, '</b>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
fs.rmSync(OUT, { recursive: true, force: true });
const sizes = {}, write = (rel, obj) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); const k = rel.split('/')[0]; sizes[k] = (sizes[k] || 0) + fs.statSync(f).size; };
const src = {}, warn = [], stats = { bavli: {}, bartenura: {}, peneiMoshe: {} };
const cov = { bavli: { amudim: 0, text: 0, speechFull: 0, speechPartial: 0, speechNone: 0, segs: 0, segsDicta: 0 }, yer: { dafim: 0, text: 0 }, shekalim: { amudim: 0, text: 0 },
  mishna: { chapters: 0, mishnayot: 0, text: 0, speechFull: 0, speechPartial: 0, speechNone: 0 } };
const HE_TITLE = { peneimoshe: 'פני משה, פיוטרקוב תרנ״ח–ת״ס', steinsaltz: 'ביאור הרב עדין שטיינזלץ, מהדורת קורן – ויליאם דייוידסון (עברית)' };
const meta = (key, d) => { const v = d?.versions?.[0]; if (v && !src[key]) src[key] = { versionTitle: v.versionTitle, versionTitleInHebrew: v.versionTitleInHebrew || HE_TITLE[key] || '', versionSource: v.versionSource, license: v.license }; };
const idx = { v: 2, bavli: [], yer: [], mishna: [], seder: SEDER, sources: src };
const noCur = () => null;
for (const b of P.bavli) {
  const have = [];
  for (const a of b.amudim) {
    cov.bavli.amudim++;
    const g = sef('gem', `${b.t} ${a}`), s = sef('ste', `Steinsaltz on ${b.t} ${a}`), G = segsOf(g), S = segsOf(s);
    if (!G.length) { warn.push(`no text: ${b.t} ${a}`); continue; }
    meta('gemara', g); meta('steinsaltz', s);
    if (G.length !== S.length) warn.push(`${b.t} ${a}: ${G.length} Gemara / ${S.length} Steinsaltz segments`);
    write(`bavli/${pathT(b.t)}/${a}.json`, { ref: `${b.t} ${a}`, he: g.heRef, segs: G.map((h, i) => [display(h), display(S[i] || '')]) });
    cov.bavli.text++; have.push(a);
    let withD = 0, n = 0; const v = [];
    const say = G.map((h, i) => {
      const runs = speechRuns(S[i] || ''), plain = plainOf(runs); if (!plain) { v.push(''); return ''; }
      n++; const rab = dseg('rabbinic', plain), mod = dseg('modern', plain); if (mod) withD++;
      const C = () => [rab ? cursor(dictaWords(rab)) : noCur, mod ? cursor(dictaWords(mod)) : noCur];
      v.push(mod || rab ? vocalizeHtml(display(S[i]), gemaraWords(h), ...C()) : '');
      return composeSay(runs, gemaraWords(h), ...C(), stats.bavli);
    });
    cov.bavli.segs += n; cov.bavli.segsDicta += withD;
    const full = withD === n; cov.bavli[full ? 'speechFull' : withD ? 'speechPartial' : 'speechNone']++;
    write(`bsay/${pathT(b.t)}/${a}.json`, full ? { say, v } : { say, v, partial: n - withD });
  }
  idx.bavli.push({ t: b.t, he: b.he, seder: b.seder, a: have });
}
// Yerushalmi (and the Daf Yomi's "Shekalim" = Jerusalem Talmud Shekalim on the Vilna Bavli pages): every segment with
// the Penei Moshe beneath it (Sefaria: Piotrków 1898–1900, public domain); the read-aloud reads the Penei Moshe.
function refsOf(text, [c, h, g]) {
  const out = [], depth = x => Array.isArray(x) ? 1 + depth(x[0] ?? '') : 0, D = depth(text);
  if (!c || !h || !g) return out;
  if (D <= 1) (Array.isArray(text) ? text : [text]).forEach((_, i) => out.push([c, h, g + i]));
  else if (D === 2) text.forEach((hl, hi) => (hl || []).forEach((_, gi) => out.push([c, h + hi, hi ? gi + 1 : g + gi])));
  else text.forEach((ch, ci) => (ch || []).forEach((hl, hi) => (hl || []).forEach((_, gi) => out.push([c + ci, ci ? hi + 1 : h + hi, ci || hi ? gi + 1 : g + gi]))));
  return out;
}
function yerFile(d, rel, sayRel, extra = {}) {
  const t = sef('yer', d.ref), raw = segsOf(t);
  if (!raw.some(x => /[\u05D0-\u05EA]/.test(display(x)))) return null;
  meta('yerushalmi', t);
  // each segment's own ref [chapter, halakha, segment], from the nesting of Sefaria's answer (shape lengths can differ)
  const refs = refsOf(t.versions[0].text, (t.sections || []).map(Number));
  const aligned = refs.length === raw.length; if (!aligned) warn.push(`${d.ref}: ${raw.length} segments ≠ ${refs.length} refs (no Penei Moshe)`);
  d = { ...d, segs: refs };
  const rows = [], say = [], v = []; let n = 0, withD = 0;
  raw.forEach((x, i) => {
    const text = display(x); if (!/[\u05D0-\u05EA]/.test(text)) return;
    const pm = aligned ? pmOf(d.t, d.segs[i]).filter(h => display(h)) : [];
    if (pm.length) meta('peneimoshe', pmHalakha(d.t, d.segs[i][0], d.segs[i][1]));
    rows.push([text, pm.map(display)]);
    const gw = gemaraWords(x);
    say.push(pm.map(h => { const runs = speechRuns(h), plain = plainOf(runs); if (!plain) return ''; n++; const rab = dseg('rabbinic', plain); if (rab) withD++; return composeSay(runs, gw, rab ? cursor(dictaWords(rab)) : noCur, null, stats.peneiMoshe); }));
    v.push(pm.map(h => { const plain = plainOf(speechRuns(h)), rab = plain && dseg('rabbinic', plain); return rab ? vocalizeHtml(display(h), gw, cursor(dictaWords(rab)), null) : ''; }));
  });
  write(rel, { ref: d.ref, he: t.heRef, ...extra, segs: rows });
  write(sayRel, withD === n ? { say, v } : { say, v, partial: n - withD });
  return { n, withD, pm: rows.filter(r => r[1].length).length, rows: rows.length };
}
const pmCov = { segs: 0, withPeneiMoshe: 0, comments: 0, commentsDicta: 0 };
const yc = r => { pmCov.segs += r.rows; pmCov.withPeneiMoshe += r.pm; pmCov.comments += r.n; pmCov.commentsDicta += r.withD; };
const shek = [];
for (const s of P.shekalim) {
  cov.shekalim.amudim++;
  const r = yerFile({ t: 'Shekalim', ...s }, `bavli/Shekalim/${s.amud}.json`, `ysay/Shekalim_Bavli/${s.amud}.json`, { yer: 1 });
  if (!r) { warn.push('no text: Shekalim ' + s.amud); continue; }
  shek.push(s.amud); cov.shekalim.text++;
}
idx.bavli.splice(idx.bavli.findIndex(b => b.t === 'Chagigah') + 1, 0, { t: 'Shekalim', he: 'שקלים', seder: 'Seder Moed', a: shek, yer: 1 });
for (const y of P.yer) {
  const have = [];
  for (const d of y.dafim) {
    cov.yer.dafim++;
    const r = d.ref && yerFile({ t: y.t, ...d }, `yer/${pathT(y.t)}/${d.daf}.json`, `ysay/${pathT(y.t)}/${d.daf}.json`);
    if (!r) { warn.push(`no text: Yerushalmi ${y.t} ${d.daf}`); continue; }
    yc(r); have.push(d.daf); cov.yer.text++;
  }
  idx.yer.push({ t: y.t, he: y.he, seder: y.seder, n: y.dafim.length, missing: y.dafim.map(d => d.daf).filter(d => !have.includes(d)) });
}
cov.peneiMoshe = pmCov;
for (const m of P.mishna) {
  const ch = [];
  m.chapters.forEach((count, c0) => {
    const c = c0 + 1; cov.mishna.chapters++; cov.mishna.mishnayot += count;
    const t = sef('misc', `${m.sef} ${c}`), M = (t?.versions?.[0]?.text || []).map(x => display(flat(x || []).join(' ')));
    if (!M.some(Boolean)) { warn.push(`no text: ${m.sef} ${c}`); ch.push(0); return; }
    meta('mishnah', t); const braw = barOf({ ...m, c }); if (braw.length) meta('bartenura', sef('barc', `Bartenura on ${m.sef} ${c}`));
    if (!braw.length) warn.push(`no Bartenura: ${m.sef} ${c}`);
    write(`mishna/${pathT(m.t)}/${c}.json`, { ref: `${m.sef} ${c}`, he: t.heRef, m: M, b: M.map((_, i) => (braw[i] || []).map(display).filter(Boolean)) });
    let n = 0, withD = 0;
    const bs = M.map((_, i) => (braw[i] || []).filter(h => display(h)).map(h => { const runs = speechRuns(h), plain = plainOf(runs); if (!plain) return ''; n++; const rab = dseg('rabbinic', plain); if (rab) withD++;
      return composeSay(runs, gemaraWords(M[i]), rab ? cursor(dictaWords(rab)) : noCur, null, stats.bartenura); }));
    const v = M.map((_, i) => (braw[i] || []).filter(h => display(h)).map(h => { const plain = plainOf(speechRuns(h)), rab = plain && dseg('rabbinic', plain); return rab ? vocalizeHtml(display(h), gemaraWords(M[i]), cursor(dictaWords(rab)), null) : ''; }));
    const full = withD === n; cov.mishna.text += M.filter(Boolean).length; cov.mishna[full ? 'speechFull' : withD ? 'speechPartial' : 'speechNone'] += M.length;
    write(`msay/${pathT(m.t)}/${c}.json`, full ? { bs, v } : { bs, v, partial: n - withD });
    ch.push(M.length);
  });
  idx.mishna.push({ t: m.t, he: m.he, seder: m.seder, ch });
}
write('index.json', idx);
const SJ = ROOT + 'site/data/sources.json', sj = JSON.parse(fs.readFileSync(SJ));
const sefTitle = { peneimoshe: 'Penei Moshe on Jerusalem Talmud Berakhot', gemara: 'Bekhorot', steinsaltz: 'Steinsaltz on Bekhorot', yerushalmi: 'Jerusalem Talmud Sanhedrin', mishnah: 'Mishnah Oholot', bartenura: 'Bartenura on Mishnah Oholot' };
for (const [k, m] of Object.entries(src)) sj[k] = { ...m, sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(sefTitle[k].replace(/ /g, '_'))}?vhe=${encodeURIComponent(m.versionTitle.replace(/ /g, '_'))}&lang=he`, fetchedAt: sj[k]?.fetchedAt || '2026-11-13' };
fs.writeFileSync(SJ, JSON.stringify(sj, null, 2) + '\n');
const report = { coverage: cov, sizesMB: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, +(v / 1e6).toFixed(1)])), stats, warnings: warn };
fs.writeFileSync(ROOT + 'verification/SHAS-197-metrics.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, warnings: warn.length + ' (first: ' + warn.slice(0, 12).join(' | ') + ')' }, null, 1));
