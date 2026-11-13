// 1.0.96: Gemara with the Steinsaltz explanation, Yerushalmi Yomi and Mishna Yomit – build (see tools/fetch-gemara.py
// for the stage order). Speech-only `say` layer for the Steinsaltz (Bavli) and Bartenura (Mishnah) text:
// tools/gemara-pronunciation.mjs. Nothing here touches the network; the cache is outside the repository.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { dafYomi, amudYomi, yerushalmi, mishnaYomit } from '../site/js/gemara-cycles.js';
import { VERSIONS, speechRuns, plainOf, batchTexts, dictaWords, cursor, composeSay, gemaraWords, sk } from './gemara-pronunciation.mjs';
const ROOT = new URL('../', import.meta.url).pathname, CACHE = process.env.GEMARA_CACHE || '/workspace/gemara-build/cache', OUT = ROOT + 'site/data/gemara';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const safe = ref => ref.replace(/[^A-Za-z0-9.:-]/g, '_').replace(/:/g, '-');
const readGz = f => { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); } catch { return null; } };
const sef = (tag, ref) => readGz(`${CACHE}/sefaria/${tag}/${safe(ref)}.json.gz`);
const iso = d => d.toISOString().slice(0, 10);
function days(from, to) { const out = []; for (let d = new Date(from + 'T12:00:00Z'); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(iso(d)); return out; }

if (process.argv.includes('--plan')) {
  const from = arg('--from'), to = arg('--to'); if (!from || !to) throw Error('--from/--to');
  const dates = days(from, to), texts = [], add = (tag, ref) => texts.push({ tag, ref, version: VERSIONS[tag] });
  const amudim = new Set(), mishnayot = new Set();
  for (const d of dates) {
    const dy = dafYomi(d), ay = amudYomi(d);
    dy.amudim.forEach(a => amudim.add(`${dy.t} ${a}`)); ay.amudim.forEach(a => amudim.add(`${ay.t} ${a}`));
    mishnaYomit(d).forEach(m => mishnayot.add(`${m.t} ${m.c}:${m.m}`));
  }
  for (const a of amudim) { add('gem', a); add('ste', `Steinsaltz on ${a}`); }
  for (const m of mishnayot) { add('mis', `Mishnah ${m}`); add('bar', `Bartenura on Mishnah ${m}`); }
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(CACHE + '/plan.json', JSON.stringify({ from, to, dates, texts, versions: VERSIONS }, null, 1));
  console.log('plan', dates.length, 'days', amudim.size, 'amudim', mishnayot.size, 'mishnayot');
  process.exit(0);
}

const plan = JSON.parse(fs.readFileSync(CACHE + '/plan.json'));
const segsOf = d => { const t = d?.versions?.[0]?.text; const flat = x => Array.isArray(x) ? x.flatMap(flat) : [x]; return t == null ? [] : flat(t).map(x => x || ''); };
const bavli = [...new Set(plan.texts.filter(t => t.tag === 'gem').map(t => t.ref))];
const mishnayot = [...new Set(plan.texts.filter(t => t.tag === 'mis').map(t => t.ref.replace(/^Mishnah /, '')))];
// the speech source of every Steinsaltz / Bartenura segment, in a fixed order (prepare and build batch identically)
function sources() {
  const ste = [], bar = [];
  for (const a of bavli) segsOf(sef('ste', `Steinsaltz on ${a}`)).forEach((h, i) => { const runs = speechRuns(h); ste.push({ a, i, runs, plain: plainOf(runs) }); });
  for (const m of mishnayot) segsOf(sef('bar', `Bartenura on Mishnah ${m}`)).forEach((h, i) => { const runs = speechRuns(h); bar.push({ m, i, runs, plain: plainOf(runs) }); });
  return { ste, bar };
}
const batches = list => batchTexts(list.filter(x => x.plain).map(x => x.plain));
if (process.argv.includes('--prepare')) {
  const { ste, bar } = sources(), bs = batches(ste), bb = batches(bar);
  const jobs = [...bs.flatMap(b => ['rabbinic', 'modern'].map(genre => ({ genre, ...b }))), ...bb.map(b => ({ genre: 'rabbinic', ...b }))];
  fs.writeFileSync(CACHE + '/dicta-input.json', JSON.stringify(jobs));
  console.log('steinsaltz segments', ste.length, 'batches', bs.length, '| bartenura segments', bar.length, 'batches', bb.length, '| jobs', jobs.length, 'chars', jobs.reduce((n, j) => n + j.text.length, 0));
  process.exit(0);
}
// ---------------- build ----------------
const { ste, bar } = sources(), stats = { bavli: {}, bartenura: {} }, missing = [];
function attach(list, genres, st) {
  // each segment gets per-genre cursors over its batch's Dicta words (cursors are shared by the segments of a batch)
  const withText = list.filter(x => x.plain), bs = batches(list);
  let k = 0;
  for (const b of bs) {
    const lines = b.text.split('\n'), cur = {};
    for (const g of genres) { const c = readGz(`${CACHE}/dicta/${g}-${b.hash}.json.gz`); if (!c) missing.push(g + '-' + b.hash); cur[g] = cursor(c ? dictaWords(c.tokens) : []); }
    for (const line of lines) { const x = withText[k++]; if (x.plain !== line) throw Error('batch order'); x.cur = cur; }
  }
  for (const x of list) x.say = x.plain ? composeSay(x.runs, x.gem || [], x.cur.rabbinic, x.cur.modern || null, st) : '';
}
const gemSegs = new Map(bavli.map(a => [a, segsOf(sef('gem', a))]));
for (const x of ste) x.gem = gemaraWords(gemSegs.get(x.a)[x.i] || '');
attach(ste, ['rabbinic', 'modern'], stats.bavli);
attach(bar, ['rabbinic'], stats.bartenura);
// display HTML: only <b> and <small> survive (the Gemara's <strong>/<big> headings become <b>); never anything else
const display = h => (h || '').replace(/<i [^>]*data-overlay[^>]*>[\s\S]*?<\/i>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i [^>]*data-commentator[^>]*>[\s\S]*?<\/i>/g, '')
  .replace(/<(\/?)(strong|big|b)(\s[^>]*)?>/gi, '<$1b>').replace(/<(\/?)small(\s[^>]*)?>/gi, '<$1small>').replace(/<(?!\/?(b|small)>)[^>]*>/g, '')
  .replace(/<b>\s*<b>/g, '<b>').replace(/<\/b>\s*<\/b>/g, '</b>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, obj) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); return fs.statSync(f).size; };
const noAmud = [], he = {}, src = {}, sizes = { bavli: 0, yer: 0, mishna: 0 }, counts = { bavli: 0, yer: 0, mishna: 0 }, warn = [];
const HE_TITLE = { steinsaltz: 'ביאור הרב עדין שטיינזלץ, מהדורת קורן – ויליאם דייוידסון (עברית)' };
const meta = (key, d) => { const v = d?.versions?.[0]; if (v && !src[key]) src[key] = { versionTitle: v.versionTitle, versionTitleInHebrew: v.versionTitleInHebrew || HE_TITLE[key] || '', versionSource: v.versionSource, license: v.license }; };
const pathT = t => t.replace(/ /g, '_');
for (const a of bavli) {
  const g = sef('gem', a), s = sef('ste', `Steinsaltz on ${a}`), G = gemSegs.get(a), S = segsOf(s);
  if (!G.length) { warn.push('no text: ' + a); noAmud.push(`gemara/bavli/${pathT(a.slice(0, a.lastIndexOf(' ')))}/${a.slice(a.lastIndexOf(' ') + 1)}.json`); continue; }
  meta('gemara', g); meta('steinsaltz', s); he[g.indexTitle] = g.heIndexTitle;
  if (G.length !== S.length) warn.push(`${a}: ${G.length} Gemara / ${S.length} Steinsaltz segments`);
  const X = ste.filter(x => x.a === a);
  const segs = G.map((h, i) => [display(h), display(S[i] || ''), X[i]?.say || '']);
  const [t, am] = [a.slice(0, a.lastIndexOf(' ')), a.slice(a.lastIndexOf(' ') + 1)];
  sizes.bavli += write(`bavli/${pathT(t)}/${am}.json`, { ref: a, he: g.heRef, segs }); counts.bavli++;
}
// Yerushalmi: the Vilna daf of each date (hebcal) ↔ Sefaria's calendar ref (Guggenheimer segments), checked against each other
const gem = s => { const v = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100 }; return [...s].reduce((n, c) => n + (v[c] || 0), 0); };
const yerDone = new Set();
for (const d of plan.dates) {
  const y = yerushalmi(d); const cal = readGz(`${CACHE}/cal/${d}.json.gz`);
  const it = cal?.calendar_items?.find(x => x.title.en === 'Yerushalmi Yomi');
  if (!y) { if (it) warn.push(`${d}: Sefaria has Yerushalmi ${it.ref}, hebcal none`); continue; }
  if (!it) { warn.push(`${d}: no Sefaria Yerushalmi ref`); continue; }
  const m = /([\u05D0-\u05EA]+)$/.exec(it.displayValue.he.replace(/["׳״']/g, ''));
  if (!m || gem(m[1]) !== y.daf || !it.ref.includes(y.t)) { warn.push(`${d}: hebcal ${y.t} ${y.daf} ≠ Sefaria ${it.displayValue.he}`); continue; }
  const key = `yer/${pathT(y.t)}/${y.daf}.json`; if (yerDone.has(key)) continue; yerDone.add(key);
  const t = sef('yer', it.ref); meta('yerushalmi', t); he['Jerusalem Talmud ' + y.t] = t.heIndexTitle;
  const segs = segsOf(t).map(display).filter(x => /[\u05D0-\u05EA]/.test(x));
  sizes.yer += write(key, { ref: it.ref, he: it.displayValue.he, segs }); counts.yer++;
}
for (const m of mishnayot) {
  const t = sef('mis', `Mishnah ${m}`), b = sef('bar', `Bartenura on Mishnah ${m}`), text = segsOf(t)[0];
  if (!text) { warn.push('no mishnah ' + m); continue; }
  meta('mishnah', t); meta('bartenura', b); he['Mishnah ' + m.slice(0, m.lastIndexOf(' '))] = t.heIndexTitle;
  const X = bar.filter(x => x.m === m), B = segsOf(b);
  const [tt, cm] = [m.slice(0, m.lastIndexOf(' ')), m.slice(m.lastIndexOf(' ') + 1)];
  sizes.mishna += write(`mishna/${pathT(tt)}/${cm.replace(':', '.')}.json`, { ref: 'Mishnah ' + m, he: t.heRef, m: display(text), b: B.map(display), bs: X.map(x => x.say) }); counts.mishna++;
}
write('index.json', { from: plan.from, to: plan.to, noAmud, he, sources: src });
// the sources page (#/sources) reads site/data/sources.json
const SJ = ROOT + 'site/data/sources.json', sj = JSON.parse(fs.readFileSync(SJ));
const sefTitle = { gemara: ['Bekhorot', 'gem'], steinsaltz: ['Steinsaltz on Bekhorot', 'ste'], yerushalmi: ['Jerusalem Talmud Sanhedrin', 'yer'], mishnah: ['Mishnah Oholot', 'mis'], bartenura: ['Bartenura on Mishnah Oholot', 'bar'] };
for (const [k, m] of Object.entries(src)) sj[k] = { ...m, sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(sefTitle[k][0].replace(/ /g, '_'))}?vhe=${encodeURIComponent(m.versionTitle.replace(/ /g, '_'))}&lang=he`, fetchedAt: plan.fetchedAt || '2026-11-13' };
fs.writeFileSync(SJ, JSON.stringify(sj, null, 2) + '\n');
const report = { window: [plan.from, plan.to], counts, sizes, stats, missingDicta: missing.length, warnings: warn };
fs.writeFileSync(ROOT + 'verification/GEMARA-196-metrics.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 1));
