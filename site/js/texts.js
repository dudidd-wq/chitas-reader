// Loads prebuilt static JSON (site/data) and assembles a day's portion into a document of blocks.
import { gem, tanya as tanyaRange, mitzvotLabel, parshaHe, toHDate, HDate, chumash as chumashOf, BOOK_HE } from './calendar.js';
import { localizeRuns } from './siddur-lang.js';
import { dafYomi, amudYomi, yerushalmi, mishnaYomit, TRACTATE_HE, nachYomi, NACH_HE } from './gemara-cycles.js';

const cache = new Map();
const NOTE_KEYS = ['LA-foreword', 'LA', 'SY-chinukh', 'SY']; // Tanya parts with Wikisource notes (site/data/notes/tanya)
/** Licence labels exactly as the source (Sefaria version record) states them — no version is added (round-3 review).
 *  Sefaria records "CC-BY-SA"/"CC-BY-NC" without a version, so the link goes to the licence family page; texts whose
 *  original publisher is Wikisource additionally cite the version stated there (CC BY-SA 4.0, page footer). */
export const LICENSE_URL = { 'CC-BY-SA': 'https://creativecommons.org/licenses/?lang=he#by-sa', 'CC-BY-NC': 'https://creativecommons.org/licenses/?lang=he#by-nc', 'CC-BY': 'https://creativecommons.org/licenses/?lang=he#by', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/deed.he' };
export const WIKISOURCE_DEED = 'https://creativecommons.org/licenses/by-sa/4.0/deed.he';
export const licenseLabel = l => l === 'CC0' ? 'CC0 1.0' : l === 'Public Domain' ? 'נחלת הכלל (Public Domain)' : l.replace(/^CC-/, 'CC ');
export function data(path) {
  // a failure is not remembered (round 5): otherwise a text that failed offline could never load again without a reload
  if (!cache.has(path)) cache.set(path, fetch('data/' + path).then(r => { if (!r.ok) throw new Error(path); return r.json(); }).catch(e => { cache.delete(path); throw e; }));
  return cache.get(path);
}

export const UNITS = {
  chumash: { he: 'חומש', full: 'חומש עם פירוש רש״י' },
  tehillim: { he: 'תהילים', full: 'תהילים' },
  tanya: { he: 'תניא', full: 'תניא יומי' },
  rambam3: { he: 'רמב״ם – ג׳ פרקים', full: 'רמב״ם – שלושה פרקים ליום' },
  rambam1: { he: 'רמב״ם – פרק אחד', full: 'רמב״ם – פרק אחד ליום' },
  mitzvot: { he: 'ספר המצוות', full: 'ספר המצוות היומי' },
  tolt: { he: 'תורה אור ולקוטי תורה', full: 'תורה אור ולקוטי תורה – שיעור יומי' },
  ravyomi: { he: 'שולחן ערוך אדמו״ר הזקן', full: 'שולחן ערוך אדמו״ר הזקן – רב יומי' },
  hayomyom: { he: 'היום יום', full: 'היום יום – לוח הרבי' },
  dafyomi: { he: 'דף היומי', full: 'דף היומי – גמרא עם ביאור שטיינזלץ' },
  amudyomi: { he: 'עמוד היומי', full: 'עמוד היומי (דרשו) – גמרא עם ביאור שטיינזלץ' },
  yerushalmi: { he: 'ירושלמי יומי', full: 'תלמוד ירושלמי – דף היומי (מהדורת וילנא)' },
  mishnayomit: { he: 'משניות יומי', full: 'משנה יומית – שתי משניות ליום, עם ברטנורא' },
  nachyomi: { he: 'נ״ך יומי', full: 'נ״ך יומי – פרק ליום, עם מצודת דוד' },   // 1.0.98
  shnayim: { he: 'שניים מקרא', full: 'שניים מקרא ואחד תרגום' },
  shasBavli: { he: 'תלמוד בבלי', full: 'תלמוד בבלי – גמרא עם ביאור שטיינזלץ' },   // 1.0.97: library only (#/lib/bavli)
  shasYer: { he: 'תלמוד ירושלמי', full: 'תלמוד ירושלמי (מהדורת וילנא) עם פני משה' },
  shasMishna: { he: 'משנה', full: 'משנה עם פירוש ברטנורא' },
  siddur: { he: 'סידור', full: 'סידור – נוסח חב״ד' }, // not a daily lesson: opened from #/siddur, never listed in the day's cards
};
const shmFile = it => it.k === 'P' || it.k === 'N' ? [`mitzvot/${it.k}/${it.n}.json`] : it.k === 'S' ? Array.from({ length: it.to - it.from + 1 }, (_, i) => `mitzvot/S/${it.from + i}.json`) : it.k === 'intro' ? ['mitzvot/intro.json'] : [];

/** Files a unit needs (used for offline pre-download). */
export async function filesFor(plan, unit) {
  const f = [];
  if (unit === 'chumash') for (const c of plan.chumash.parts) for (let i = c.from.c; i <= c.to.c; i++) f.push(`torah/${c.book}/${i}.json`);
  if (unit === 'tehillim') plan.tehillim.parts.forEach(p => f.push(`tehillim/${p.c}.json`));
  if (unit === 'tanya') { const doc = await tanyaPositions(plan); doc.forEach(([k, c]) => f.push(`tanya/${k}/${c}.json`, ...(NOTE_KEYS.includes(k) ? [`notes/tanya/${k}.json`] : []))); }
  if (unit === 'rambam1' || unit === 'rambam3') {
    const idx = await data('rambam/index.json');
    for (const it of plan[unit]) for (const [c] of rambamChaptersFull(it, idx[it.name])) f.push(`rambam/${idx[it.name].slug}/${c}.json`);
  }
  if (unit === 'mitzvot') plan.mitzvot.items.forEach(it => f.push(...shmFile(it)));
  if (unit === 'tolt') { f.push('tolt/schedule.json'); plan.tolt.parts.forEach(([slug]) => f.push(`tolt/w/${slug}.json`, `notes/tolt/${slug}.json`)); }
  if (unit === 'hayomyom') f.push('hayomyom/days.json');
  if (unit === 'mitzvot') plan.mitzvot.items.forEach(it => shmFile(it).forEach(x => f.push(x.replace(/^mitzvot\//, 'mitzvot-voc/'))));
  if (unit === 'nachyomi') { const n = plan.nach || nachYomi(plan.iso); f.push('nach/index.json', `nach/${pathB(n.book)}/${n.c}.json`, `nachv/${pathB(n.book)}/${n.c}.json`); }
  if (unit === 'shnayim') for (const c of shnayimParts(plan)) for (let i = c.from.c; i <= c.to.c; i++) f.push(`torah/${c.book}/${i}.json`, `onkelos/${c.book}/${i}.json`);
  if (GEMARA_UNITS.includes(unit)) {   // only what exists in the build (no amud b after a tractate that ends on amud a)
    const idx = await optional('gemara/index.json');
    f.push('gemara/index.json');
    if (idx) f.push(...gemaraFiles(gemaraSpec(plan, unit), idx));
  }
  if (unit === 'ravyomi') { f.push('ravyomi/schedule.json'); (await ravLesson(plan)).simanim.forEach(n => f.push(`ravyomi/s/${n}.json`)); }
  // 1.0.100: the short explanation of the same source files, where one exists
  const sb = f.map(x => x.match(/^(tanya\/[^/]+\/\d+|rambam\/[^/]+\/\d+|mitzvot\/[PN]\/\d+)\.json$/)?.[1] || x.match(/^tolt\/w\/([^/]+)\.json$/)?.[1]?.replace(/^/, 'tolt/')).filter(Boolean);
  if (sb.length) f.push('sbiur/index.json', ...await sbiurFiles(sb));
  return [...new Set(f)];
}
// 1.0.98: Sefer HaMitzvot niqqud (Dicta, tools/build-nach.mjs): `say` for the read-aloud, `textV` for the display
const voc = (z, i) => ({ ...(z?.say?.[i] ? { say: z.say[i] } : {}), ...(z?.vd?.[i] ? { textV: z.vd[i] } : {}) });
async function mitzvotDoc(plan) {
  const blocks = [];
  for (const it of plan.mitzvot.items) {
    blocks.push({ type: 'h', text: mitzvotLabel(it) });
    if (it.k === 'P' || it.k === 'N' || it.k === 'intro') {
      const d = await data(shmFile(it)[0]), z = await optional(shmFile(it)[0].replace(/^mitzvot\//, 'mitzvot-voc/'));
      const SB = it.n ? await sbiur(`mitzvot/${it.k}/${it.n}`) : null;
      d.s.forEach((t, i) => blocks.push({ type: 'p', id: `${it.k}${it.n || ''}.${i + 1}`, text: t, src: 'mitzvot', ...voc(z, i), ...sbAi(SB?.s?.[i + 1]) }));
    } else if (it.k === 'S') {
      for (let n = it.from; n <= it.to; n++) {
        const d = await data(`mitzvot/S/${n}.json`), z = await optional(`mitzvot-voc/S/${n}.json`);
        if (it.to > it.from) blocks.push({ type: 'h', text: `השורש ה${['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני', 'תשיעי', 'עשירי', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר'][n]}` });
        d.s.forEach((t, i) => blocks.push({ type: 'p', id: `S${n}.${i + 1}`, text: t, src: 'mitzvot', ...voc(z, i) }));
      }
    } else if (it.k === 'conclusion') {
      blocks.push({ type: 'note', text: 'לפי לוח Chabad.org נלמד היום גם סיום ספר המצוות. במהדורה הפתוחה שבאתר (ורשה תרמ״ג, נחלת הכלל) אין לסיום קטע נפרד, ולכן הוא אינו מוצג כאן.' });
    } else {
      blocks.push({ type: 'note', text: `שיעור היום בספר המצוות הוא ${it.he}. הטקסט הזה אינו חלק מספר המצוות, ולכן מוצגת כאן ההפניה בלבד. הוא נמצא בספר משנה תורה, וכלול בדרך כלל גם בשיעור הרמב״ם של אותם ימים.` });
    }
  }
  return { title: UNITS.mitzvot.full, subtitle: plan.mitzvot.items.map(mitzvotLabel).join(' · '), blocks };
}

async function chumashDoc(plan) {
  const blocks = [], multi = plan.chumash.parts.length > 1;
  for (const c of plan.chumash.parts) {
    if (multi) blocks.push({ type: 'h', text: c.book === 'Genesis' ? 'פרשת בראשית' : 'פרשת וזאת הברכה' });
    for (let ch = c.from.c; ch <= c.to.c; ch++) {
      const d = await data(`torah/${c.book}/${ch}.json`);
      const a = ch === c.from.c ? c.from.v : 1, b = ch === c.to.c ? c.to.v : d.v.length;
      blocks.push({ type: 'h', text: `${c.bookHe} פרק ${gem(ch)}` });
      for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${ch}:${v}`, ref: `${c.book} ${ch}:${v}`, num: gem(v), text: d.v[v - 1], sub: (d.r && d.r[v - 1]) || [], subSay: d.rs?.[v - 1] || [], src: 'tanakh' });
    }
  }
  const sub = c => `${c.bookHe} ${gem(c.from.c)}, ${gem(c.from.v)} – ${gem(c.to.c)}, ${gem(c.to.v)}`;
  const c0 = plan.chumash;
  return { book: c0.book, title: c0.title, subtitle: c0.parts.map(sub).join(' · '), blocks, tanakh: true };
}
async function tehillimDoc(plan) {
  const blocks = [];
  for (const p of plan.tehillim.parts) {
    const d = await data(`tehillim/${p.c}.json`);
    blocks.push({ type: 'h', text: `מזמור ${gem(p.c)}` });
    const a = p.from || 1, b = p.to || d.v.length;
    for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${p.c}:${v}`, ref: `Psalms ${p.c}:${v}`, num: gem(v), text: d.v[v - 1], src: 'tanakh' });
  }
  return { book: 'Psalms', title: plan.tehillim.title, subtitle: 'לפי חלוקת החודש', blocks, tanakh: true };
}
async function tanyaPositions(plan) {
  const index = await data('tanya/index.json');
  const order = Object.keys(index);
  const { from, to } = tanyaRange(plan.hd, index);
  const out = [];
  let k = from.key, c = from.c, s = from.s;
  for (let guard = 0; guard < 400; guard++) {
    const len = index[k].chapters[c - 1];
    const end = (k === to.key && c === to.c) ? to.s : len;
    out.push([k, c, s, end]);
    if (k === to.key && c === to.c) break;
    if (c < index[k].chapters.length) { c++; s = 1; } else { k = order[(order.indexOf(k) + 1) % order.length]; c = 1; s = 1; }
  }
  return out;
}
// ---------------- "מראי מקומות" / short-explanation links (round 8) ----------------
// Shown as a separate, collapsed, attributed section after the text ('notes' blocks; never read aloud). Nothing in
// them is written by this site: Tanya – Hebrew Wikisource's "מראי מקומות" (CC BY-SA 4.0); Torah Or / Likkutei Torah –
// Kehot's "מראי מקומות הערות וציונים" (via Sefaria, CC BY-NC); Rambam – a link to the Steinsaltz commentary on
// Sefaria (copyright – link only, nothing copied). tools/build-notes-*.mjs, verification/STUDY-NOTES.md.
export const WS_TANYA = 'https://he.wikisource.org/wiki/%D7%AA%D7%A0%D7%99%D7%90_%D7%9E%D7%A0%D7%95%D7%A7%D7%93';
const firstWords = (html, n = 4) => html.replace(/<span class="daf"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/[()[\]]/g, '').trim().split(/\s+/).slice(0, n).join(' ');
async function optional(path) { try { return await data(path); } catch { return null; } }
// ---------------- "ביאור קצר" – a short Hebrew explanation under each paragraph (1.0.100) ----------------
// Tanya / Rambam / Sefer HaMitzvot: written by the computer (labelled so, never presented as a rabbinic commentary);
// Torah Or / Likkutei Torah: a Hebrew condensation of LikuteiTorah.com's English explanation (CC BY-NC, linked per
// paragraph). Lazy: one small file per source file, fetched only when that lesson opens, and only if the index lists it.
// Data: site/data/sbiur (verification/SHORT-BIUR.md). Shown folded (app.js); read aloud only with the ttsBiur setting.
let SB_IDX = null;
async function sbiurIndex() { if (!SB_IDX) { const x = await optional('sbiur/index.json'); if (x) SB_IDX = new Set(x.files); } return SB_IDX || new Set(); }
export async function sbiurFiles(paths) { const I = await sbiurIndex(); return paths.filter(p => I.has(p)).map(p => `sbiur/${p}.json`); }
async function sbiur(path) { return (await sbiurIndex()).has(path) ? optional(`sbiur/${path}.json`) : null; }
const sbAi = e => (e ? { sb: { p: e.p, v: e.v, src: 'ai' } } : {});
const sbLt = e => (e ? { sb: { p: e.p, v: e.v, src: e.lt ? 'lt' : 'ai', link: e.lt } } : {});
async function tanyaDoc(plan) {
  const index = await data('tanya/index.json');
  const blocks = [];
  for (const [k, c, a, b] of plan.positions || await tanyaPositions(plan)) {  // plan.positions: the library (a whole chapter)
    const d = await data(`tanya/${k}/${c}.json`);
    const multi = index[k].depth === 2 && index[k].chapters.length > 1;
    blocks.push({ type: 'h', text: index[k].he + (multi ? ` – ${k === 'IK' ? 'אגרת' : 'פרק'} ${gem(c)}` : '') + (a > 1 ? ' (המשך)' : '') });
    const SB = await sbiur(`tanya/${k}/${c}`);
    for (let s = a; s <= Math.min(b, d.s.length); s++) blocks.push({ type: 'p', id: `${k}.${c}.${s}`, text: d.s[s - 1], say: d.say?.[s - 1], src: 'tanya', ...sbAi(SB?.s?.[s]) });
    const N = NOTE_KEYS.includes(k) ? (await optional(`notes/tanya/${k}.json`))?.[c] : null;
    const groups = N ? Object.keys(N).map(Number).filter(s => s >= a && s <= Math.min(b, d.s.length)).sort((x, y) => x - y)
      .map(s => ({ target: `${k}.${c}.${s}`, label: firstWords(d.s[s - 1]), items: N[s].map(x => ({ w: x.w, t: x.t })) })) : [];
    if (groups.length) blocks.push({ type: 'notes', kind: 'tanya', title: 'מראי מקומות', groups,
      attr: { text: 'מראי המקומות (מקורות הפסוקים והמאמרים) לקוחים מ״תניא מנוקד״ ב', links: [['ויקיטקסט', WS_TANYA]], tail: ' (CC BY-SA 4.0). הם מוצגים ליד הקטע בנוסח קה״ת שבו נמצא סימן ההערה, לפי השוואת המילים שלפני הסימן ואחריו. אינם ביאור, ולא נכתבו באתר זה.' } });
  }
  const first = blocks.find(b => b.type === 'h');
  return { title: 'תניא יומי', subtitle: first ? first.text.replace(' (המשך)', '') : '', blocks };
}
export const steinsaltzUrl = (name, c) => `https://www.sefaria.org/${encodeURIComponent(`Steinsaltz on Mishneh Torah, ${name}`.replace(/ /g, '_')).replace(/%2C/g, ',')}${c ? '.' + c : ''}?lang=he`;
function rambamChaptersFull(it, meta) {
  if (it.c) return [[it.c, 1, Infinity]];
  if (it.range) {
    if (meta.depth === 1) return [[1, it.range[0], it.range[1]]];
    const r = []; for (let c = it.range[0]; c <= it.range[1]; c++) r.push([c, 1, Infinity]); return r;
  }
  const r = [];
  for (let c = it.from.c; c <= it.to.c; c++) r.push([c, c === it.from.c ? it.from.s : 1, c === it.to.c ? it.to.s : Infinity]);
  return r;
}
function chapList(chs) {
  const u = [...new Set(chs)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < u.length;) { let j = i; while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++; out.push(j - i >= 3 ? `${gem(u[i])}–${gem(u[j])}` : u.slice(i, j + 1).map(gem).join(', ')); i = j + 1; }
  return out.join(', ');
}
export async function rambamTitle(items) {
  const idx = await data('rambam/index.json');
  const books = new Map();
  for (const it of items) {
    const m = idx[it.name]; if (!books.has(m.he)) books.set(m.he, { m, chs: [], rng: [] });
    if (m.depth === 2) books.get(m.he).chs.push(...rambamChaptersFull(it, m).map(x => x[0]));
    else if (it.range) books.get(m.he).rng.push(it.range);   // round 5: the Introduction / Sefer HaMitzvot days differ by their range
  }
  const rngs = rs => { const u = rs.slice().sort((a, b) => a[0] - b[0]), out = []; for (const r of u) { const l = out.at(-1); if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else out.push([...r]); } return out.map(([a, b]) => a === b ? gem(a) : `${gem(a)}–${gem(b)}`).join(', '); };
  return [...books.entries()].map(([he, { chs, rng }]) => chs.length ? `${he} ${chs.length > 1 ? 'פרקים' : 'פרק'} ${chapList(chs)}` : rng.length ? `${he} ${rngs(rng)}` : he).join(' · ');
}
/** Apply source-checked corrections [{from,to,kind?}] to one halacha (niqqud fixes, and kind:'text' wording fixes backed by two sources). Matching is done on NFC (the data mixes mark orders). */
export function applyErrata(text, list) {
  if (!list?.length) return { text, applied: [] };
  let t = text.normalize('NFC');
  const applied = [];
  for (const f of list) {
    // whole words only (a Hebrew letter or mark on either side means a different word); every occurrence
    const re = new RegExp(`(?<![\u05D0-\u05EA\u0591-\u05C7])${f.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\u05D0-\u05EA\u0591-\u05C7])`, 'g');
    if (re.test(t)) { t = t.replace(re, f.to); applied.push({ from: f.from, to: f.to, ...(f.kind === 'text' ? { kind: 'text' } : {}) }); }
  }
  return applied.length ? { text: t, applied } : { text, applied };
}
async function rambamDoc(plan, unit) {
  const idx = await data('rambam/index.json');
  let src = {}; try { src = await data('sources.json'); } catch { /* offline and not cached: no credit line */ }
  // source-checked niqqud corrections (verification/RAMBAM-ERRATA.md), applied as an overlay so the source data stays untouched
  let errata = {}; try { errata = (await data('rambam-errata.json')).fixes || {}; } catch { /* not cached offline: show the edition as is */ }
  const blocks = [], credits = [], fixes = [];
  for (const it of plan[unit]) {
    const meta = idx[it.name];
    for (const [c, a, b] of rambamChaptersFull(it, meta)) {
      const d = await data(`rambam/${meta.slug}/${c}.json`), SB = await sbiur(`rambam/${meta.slug}/${c}`);
      const label = meta.he + (meta.depth === 2 ? ` – פרק ${gem(c)}` : '');
      // texts that do not come from the main edition (Torat Emet) are credited in the reader, chapter by chapter
      const ov = src.rambamChapterOverrides?.[`${it.name} ${c}`] || src.rambamOverrides?.[it.name];
      if (ov && !/Torat Emet/.test(ov.versionTitle) && !credits.some(x => x.label === label)) credits.push({ label, ...ov });
      blocks.push({ type: 'h', text: label });
      for (let s = a; s <= Math.min(b, d.s.length); s++) {
        if (!d.s[s - 1]?.trim()) continue;
        const id = `${meta.slug}.${c}.${s}`;
        const { text, applied } = applyErrata(d.s[s - 1], errata[id]);
        for (const f of applied) fixes.push({ id, label: `${label}, הלכה ${gem(s)}`, ...f });
        blocks.push({ type: 'p', id, num: gem(s), text, say: d.say?.[s - 1], src: 'rambam', srcName: it.name, ...(applied.length ? { fixed: applied.length } : {}), ...sbAi(SB?.s?.[s]) });
      }
      blocks.push({ type: 'notes', kind: 'rambam', title: 'ביאור קצר (קישור)', link: [`ביאור הרב שטיינזלץ ל${label} – בספריא`, steinsaltzUrl(it.name, meta.depth === 2 ? c : 0)],
        attr: { text: 'הביאור של הרב עדין אבן־ישראל שטיינזלץ (הוצאת קורן) מוגן בזכויות יוצרים (״Copyright: Steinsaltz Center״ בספריא), ולכן אינו מוצג כאן – רק קישור אליו. הקישור נפתח באתר ספריא.' } });
    }
  }
  return { book: 'Rambam', title: UNITS[unit].full, subtitle: await rambamTitle(plan[unit]), blocks, credits, fixes }; // book: the gloss key prefix ('Rambam <slug>.<c>.<s>')
}
// ---------------- Torah Or / Likkutei Torah (daily luach "מורה שיעור", by parasha week; tools/build-tolt.mjs) ----------------
/** "דף טו עמוד ב" in the edition's 4-column Vilna numbering (א–ד), as the luach writes "טו/ב" */
export const toltPlace = e => typeof e.daf === 'number' ? `${gem(e.daf)}/${e.amud}` : '';
export const toltWork = e => e.w === 'to' ? 'תורה אור' : 'לקוטי תורה';
/** the luach's section heading, e.g. "לקוטי תורה, מצורע" (Sefaria's Hebrew node title) */
/** the luach's ד״ה; a leading single letter is the edition's section number in the maamar ("ד ובזה יובן" = section ד) */
export const toltDh = e => { const m = e.dh.match(/^([\u05D0-\u05EA]) (.+)$/); return m ? `אות ${m[1]}, ד״ה ${m[2]}` : `ד״ה ${e.dh}`; };
export function toltLabel(e) { return `${e.he || toltWork(e)} ${toltPlace(e)} · ${toltDh(e)}`; }
async function toltLessons(plan) {
  const S = await data('tolt/schedule.json');
  return plan.tolt.parts.map(([slug, day]) => ({ slug, day, e: S.weeks[slug].days[day - 1], week: S.weeks[slug] }));
}
export const CB_ATTR = 'נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד', CB_URL = 'https://chassidutbehirah.com/';
const LUACH_LINKS = [['לוח המורה שיעור – כינוס השלוחים העולמי', 'https://hisachdus.co.il/'], ['torahor.app – התאחדות החסידים', 'https://www.torahor.app/he']];
async function toltDoc(plan) {
  const blocks = [];
  const L = await toltLessons(plan);
  if (plan.tolt.repeat) blocks.push({ type: 'note', text: 'השנה יש לפני שמחת תורה שני שבועות שהשבת שלהם היא שבת של חג (סוכות ושמיני עצרת), והלוח קובע רק שבוע אחד (וזאת הברכה ודרושים לשמיני עצרת). לכן מוצג השבוע שיעור היום מאותו שבוע, והוא חוזר בשבוע הבא.' });
  if (L.length === 2) blocks.push({ type: 'note', text: `השבוע הפרשיות מחוברות (${parshaHe(plan.tolt.parsha)}), ולכן לפי הלוח לומדים היום שני שיעורים.` });
  for (const { slug, day, e } of L) {
    blocks.push({ type: 'h', text: toltLabel(e) });
    const w = await data(`tolt/w/${slug}.json`), paras = w.days[day - 1];
    if (e.approx) blocks.push({ type: 'note', text: 'מיקום משוער: הד״ה בלוח שונה מעט מהכותרת שבמהדורה, ולכן תחילת השיעור נקבעה לפי הכותרת הקרובה בעמוד שבלוח. כדאי לוודא בספר.' });
    if (e.add) blocks.push({ type: 'note', text: `בלוח מצוין גם: ${e.add.replace(/^\+\s*/, '')}. ${/שנדפסה|השמטה/.test(e.add) ? 'קטע זה אינו מוצג כאן.' : 'ההוספות אינן מוצגות כאן; אפשר לפתוח את הספר בספריא.'}`, href: e.sefaria, hrefText: 'פתיחה בספריא' });
    if (!paras) { blocks.push({ type: 'note', text: `לא נמצא במהדורה שבאתר המקום המדויק של שיעור זה (${toltWork(e)}, ${toltPlace(e)}, ${toltDh(e)}). מוצגת ההפניה בלבד.`, href: e.sefaria, hrefText: 'פתיחה בספריא' }); continue; }
    // vocalised paragraphs (nq) come from Chassidut Behirah, written only on words whose letters equal this Kehot text
    // (tools/cb-niqqud, verification/CHASSIDUT-BEHIRAH.md); the rest stay the unvocalised Kehot/Sefaria text
    const nq = paras.filter(p => p.nq).length;
    if (nq) blocks.push({ type: 'note', text: `${CB_ATTR}. `, links: [['חסידות בהירה – chassidutbehirah.com', CB_URL]], tail: nq < paras.length ? `. ${paras.length - nq} מתוך ${paras.length} הפסקאות מוצגות בלי ניקוד, כי לא אומתה בהן התאמה מלאה לאותיות נוסח קה״ת.` : '.' });
    const SB = (await sbiur(`tolt/${slug}`))?.days?.[day];
    paras.forEach((p, i) => blocks.push({ type: 'p', id: `${slug}.${day}.${i + 1}`, text: p.t, say: p.say, src: 'tolt', ...(p.nq ? { voc: 'cb' } : {}), ...sbLt(SB?.[i + 1]) }));
    const N = (await optional(`notes/tolt/${slug}.json`))?.[day];
    if (N) blocks.push({ type: 'notes', kind: 'tolt', title: 'מראי מקומות הערות וציונים', attr: { text: '״מראי מקומות הערות וציונים״ של מהדורת קה״ת, דרך ', links: [['ספריא', e.sefaria]], tail: ' (CC BY-NC). כל הערה מוצגת רק אם מילות הכותרת שלה נמצאות בפסקה שאליה ספריא מקשרת אותה. אינם ביאור, ולא נכתבו באתר זה.' },
      groups: Object.keys(N).map(Number).sort((x, y) => x - y).map(i => ({ target: `${slug}.${day}.${i}`, label: firstWords(paras[i - 1].t), items: N[i].map(h => ({ html: h })) })) });
    if (e.until) blocks.push({ type: 'note', text: `לפי הלוח השיעור מסתיים ${e.until.daf === 'תום' || e.until === 'תום' ? 'בסוף הדרוש' : e.until === 'סוף הפרשה' ? 'בסוף הפרשה' : `בדף ${gem(e.until.daf)}/${e.until.amud}`}.` });
  }
  blocks.push({ type: 'note', text: 'חלוקת השיעורים: ', links: LUACH_LINKS, tail: `. הטקסט: הוצאת קה״ת דרך ספריא (CC BY-NC). ${CB_ATTR} (chassidutbehirah.com); הניקוד נקלט רק במילים שאותיותיהן זהות לנוסח קה״ת, ופסקה שלא אומתה מוצגת בלי ניקוד. בסוגריים המרובעים – מספרי הדפים והעמודים במהדורה (א–ד).` });
  return { title: UNITS.tolt.full, subtitle: L.map(({ e }) => `${toltWork(e)} ${toltPlace(e)}`).join(' · '), blocks, raw: true };
}
// ---------------- Shulchan Aruch HaRav – "Rav Yomi" luach (tools/build-rav-yomi.mjs) ----------------
const RAV_LUACH = ['לוח ״רב יומי״ – שולחן ערוך אדמו״ר הזקן', 'https://chabad.info/service/1287411/'];
const pos = ([si, se]) => `סימן ${gem(si)} סעיף ${gem(se)}`;
export function ravLabel(d) {
  if (!d) return '';
  if (d.ref) return d.ref;
  const [a, b] = [d.f, d.t];
  if (a[0] === b[0] && a[1] === b[1]) return pos(a);
  return a[0] === b[0] ? `סימן ${gem(a[0])} סעיפים ${gem(a[1])}–${gem(b[1])}` : `${pos(a)} – ${pos(b)}`;
}
async function ravLesson(plan) {
  const S = await data('ravyomi/schedule.json'), d = S.days[plan.iso];
  return { S, d, simanim: d && d.f ? S.simanim.filter(n => n >= d.f[0] && n <= d.t[0]) : [] };
}
async function ravDoc(plan) {
  const { S, d, simanim } = await ravLesson(plan), blocks = [];
  const credit = { type: 'note', text: 'חלוקת השיעורים: ', links: [RAV_LUACH], tail: '. הטקסט: שולחן ערוך הרב, אורח חיים, המהדורה המנוקדת של הוצאת קה״ת, דרך ספריא (CC BY-NC). הערות השוליים וקונטרס אחרון אינם מוצגים.' };
  if (!d) {
    blocks.push({ type: 'note', text: `באתר יש את לוח ״רב יומי״ רק לשנה שמ־כ״ד טבת תשפ״ו עד כ״ג טבת תשפ״ז (${S.first} – ${S.last}). לתאריך זה אין כאן שיעור.`, href: RAV_LUACH[1], hrefText: 'הלוח המלא' });
    return { title: UNITS.ravyomi.full, subtitle: '', blocks: [...blocks, credit], raw: true };
  }
  if (d.ref) {
    blocks.push({ type: 'h', text: d.ref });
    blocks.push({ type: 'note', text: `השיעור של היום לפי הלוח הוא ״${d.ref}״, ש״שולחן ערוך הרב״ שבספריא אינו כולל, ולכן מוצגת ההפניה בלבד.`, href: RAV_LUACH[1], hrefText: 'הלוח' });
    return { title: UNITS.ravyomi.full, subtitle: d.ref, blocks: [...blocks, credit], raw: true };
  }
  if (d.gap) blocks.push({ type: 'note', text: d.gap });
  if (d.fix) blocks.push({ type: 'note', text: 'תיקון בלוח: ' + d.fix });
  const word = x => typeof x[2] === 'string' && x[2];
  if (word(d.f)) blocks.push({ type: 'note', text: `לפי הלוח, השיעור מתחיל באמצע סעיף ${gem(d.f[1])}, במילים ״${d.f[2]}״. הסעיף מוצג כאן במלואו.` });
  for (const n of simanim) {
    const sm = await data(`ravyomi/s/${n}.json`);
    const a = n === d.f[0] ? d.f[1] : 1, b = n === d.t[0] ? d.t[1] : sm.s.length;
    blocks.push({ type: 'h', text: `סימן ${gem(n)}${sm.title ? ' – ' + sm.title.replace(/[,:]?\s*וּ?בוֹ\s.*$/, '') : ''}` });
    for (let se = a; se <= b; se++) sm.s[se - 1].forEach((t, k) => blocks.push({ type: 'p', id: `${n}.${se}.${k + 1}`, text: k ? t : `<b>${gem(se)}</b> ${t}`, say: sm.say?.[se - 1]?.[k], src: 'ravyomi' }));
  }
  if (word(d.t) && d.t[3] !== 1) blocks.push({ type: 'note', text: `לפי הלוח, השיעור מסתיים באמצע סעיף ${gem(d.t[1])}, במילים ״${d.t[2]}״. ההמשך נלמד מחר.` });
  blocks.push(credit);
  return { title: UNITS.ravyomi.full, subtitle: ravLabel(d), blocks, raw: true };
}
/** The library (js/library.js): one whole siman, with the same blocks (ids n.se.k) as the daily lesson. */
export async function ravSimanDoc(n) {
  const sm = await data(`ravyomi/s/${n}.json`), blocks = [];
  blocks.push({ type: 'h', text: `סימן ${gem(n)}${sm.title ? ' – ' + sm.title.replace(/[,:]?\s*וּ?בוֹ\s.*$/, '') : ''}` });
  sm.s.forEach((parts, i) => parts.forEach((t, k) => blocks.push({ type: 'p', id: `${n}.${i + 1}.${k + 1}`, text: k ? t : `<b>${gem(i + 1)}</b> ${t}`, say: sm.say?.[i]?.[k], src: 'ravyomi' })));
  blocks.push({ type: 'note', text: 'הטקסט: שולחן ערוך הרב, אורח חיים, המהדורה המנוקדת של הוצאת קה״ת, דרך ספריא (CC BY-NC). הערות השוליים וקונטרס אחרון אינם מוצגים.' });
  return { title: UNITS.ravyomi.he, subtitle: `סימן ${gem(n)}`, blocks, raw: true };
}
// ---------------- Hayom Yom (1.0.75; ChabadText typed text, © Kehot – see tools/build-hayomyom.py) ----------------
// The 5703 luach is a leap year: Adar I / Adar II have their own entries. In an ordinary year Adar reads the Adar II
// entries (chabad.org / luach.day practice). 5703 had 29-day Cheshvan and Kislev: on 30 Cheshvan / 30 Kislev the
// entry of the 29th is shown again, with a note.
export const HAYOM_MONTHS = [['tishrei', 'תשרי', 30], ['cheshvan', 'חשון', 29], ['kislev', 'כסלו', 29], ['tevet', 'טבת', 29], ['shvat', 'שבט', 30],
  ['adar1', 'אדר א׳', 30], ['adar2', 'אדר ב׳', 29], ['nisan', 'ניסן', 30], ['iyyar', 'אייר', 29], ['sivan', 'סיון', 30], ['tamuz', 'תמוז', 29], ['av', 'מנחם אב', 30], ['elul', 'אלול', 29]];
const HM = { 7: 'tishrei', 8: 'cheshvan', 9: 'kislev', 10: 'tevet', 11: 'shvat', 1: 'nisan', 2: 'iyyar', 3: 'sivan', 4: 'tamuz', 5: 'av', 6: 'elul' };
/** Hebrew date (iso or HDate) → { key, repeat } in days.json */
export function hayomKey(date) {
  const hd = toHDate(date), m = hd.getMonth(), d = hd.getDate(), leap = HDate.isLeapYear(hd.getFullYear());
  const mk = m === 12 ? (leap ? 'adar1' : 'adar2') : m === 13 ? 'adar2' : HM[m];
  const max = HAYOM_MONTHS.find(x => x[0] === mk)[2];
  return { key: `${mk}-${Math.min(d, max)}`, repeat: d > max };
}
const HAYOM_CREDIT = 'היום יום — © קה״ת, בהיתר הכללי של קה״ת לאתרים ואפליקציות ללימוד ללא תשלום; הקלדה: חב״דפדיה-טקסט (GFDL 1.3).';
async function hayomDoc(plan) {
  const D = await data('hayomyom/days.json');
  const { key, repeat } = plan.hayom ? { key: plan.hayom, repeat: false } : hayomKey(plan.iso);
  const e = D[key], blocks = [];
  if (repeat) blocks.push({ type: 'note', text: 'בשנת תש״ג, שלפיה נערך הלוח, היה בחודש זה 29 יום, ולכן אין בלוח רשומה ליום ל׳. מוצגת הרשומה של כ״ט.' });
  blocks.push({ type: 'h', text: e.ref });
  // 1.0.76: `say` – Dicta-vocalized reading text for read-aloud; the display keeps the book's unvocalized text
  e.p.forEach(([t, it, v], i) => blocks.push({ type: 'p', id: `${key}.${i + 1}`, text: it ? `<i>${t}</i>` : t, src: 'hayomyom', ...(v ? { say: v } : {}) }));
  blocks.push({ type: 'note', text: HAYOM_CREDIT + ' ', href: 'https://text.chabadpedia.com/index.php/' + encodeURIComponent('היום יום ' + e.ref), hrefText: 'המקור' });
  return { title: UNITS.hayomyom.full, subtitle: e.ref, blocks, raw: true };
}
// ---------------- 1.0.96 / 1.0.97: Gemara / Mishnah – the four cycles and the whole Shas (tools/build-shas.mjs) ----------------
// Bavli: every segment shows the vocalized Gemara (William Davidson) and, beneath it, the Steinsaltz explanation; the
// read-aloud reads only the explanation. Yerushalmi: the vocalized text with the Penei Moshe beneath it (read aloud).
// Mishnah: the mishnah with Bartenura beneath. The speech text (`say`) and the explanations' displayed niqqud (`v`)
// are in separate files (gemara/bsay, ysay, msay), built from Dicta as far as the build has reached ("partial").
// A portion ("spec"): { kind: 'bavli', t, amudim } | { kind: 'yer', t, daf } | { kind: 'mishna', items: [{ t, c, m }] }.
export const GEMARA_UNITS = ['dafyomi', 'amudyomi', 'yerushalmi', 'mishnayomit', 'shasBavli', 'shasYer', 'shasMishna'];
const pathT = t => t.replace(/ /g, '_');
export function gemaraSpec(plan, unit) {
  if (plan?.gem) return plan.gem;
  const iso = plan.iso;
  if (unit === 'dafyomi' || unit === 'amudyomi') { const d = unit === 'dafyomi' ? dafYomi(iso) : amudYomi(iso); return { kind: 'bavli', t: d.t, amudim: d.amudim }; }
  if (unit === 'yerushalmi') { const y = yerushalmi(iso); return y ? { kind: 'yer', t: y.t, daf: y.daf } : { kind: 'yer', none: true }; }
  return { kind: 'mishna', items: mishnaYomit(iso) };
}
const bavliT = (idx, t) => idx?.bavli?.find(x => x.t === t);
const has = {
  bavli: (idx, t, a) => !!bavliT(idx, t)?.a.includes(a),
  yer: (idx, t, d) => { const y = idx?.yer?.find(x => x.t === t); return !!y && d >= 1 && d <= y.n && !y.missing.includes(d); },
  mishna: (idx, t, c) => !!idx?.mishna?.find(x => x.t === t)?.ch[c - 1],
};
/** the files of a portion that exist in the build ([display, speech] per piece) */
export function gemaraFiles(spec, idx) {
  if (spec.kind === 'bavli') return spec.amudim.filter(a => has.bavli(idx, spec.t, a)).flatMap(a => bavliT(idx, spec.t).yer
    ? [`gemara/bavli/Shekalim/${a}.json`, `gemara/ysay/Shekalim_Bavli/${a}.json`] : [`gemara/bavli/${pathT(spec.t)}/${a}.json`, `gemara/bsay/${pathT(spec.t)}/${a}.json`]);
  if (spec.kind === 'yer') return spec.none || !has.yer(idx, spec.t, spec.daf) ? [] : [`gemara/yer/${pathT(spec.t)}/${spec.daf}.json`, `gemara/ysay/${pathT(spec.t)}/${spec.daf}.json`];
  return [...new Set(spec.items.filter(m => has.mishna(idx, m.t, m.c)).flatMap(m => [`gemara/mishna/${pathT(m.t)}/${m.c}.json`, `gemara/msay/${pathT(m.t)}/${m.c}.json`]))];
}
const amudHe = a => `${gem(parseInt(a))} ${a.endsWith('a') ? 'א' : 'ב'}`, sefUrl = r => `https://www.sefaria.org/${encodeURIComponent(r.replace(/ /g, '_')).replace(/%3A/g, ':')}?lang=he`;
export const tractateHe = t => TRACTATE_HE[t] || t;
export function specLabel(spec) {
  if (spec.kind === 'bavli') return spec.amudim.length === 2 && parseInt(spec.amudim[0]) === parseInt(spec.amudim[1]) ? `${tractateHe(spec.t)} דף ${gem(parseInt(spec.amudim[0]))}` : `${tractateHe(spec.t)} ${spec.amudim.map(amudHe).join(' – ')}`;
  if (spec.kind === 'yer') return spec.none ? 'אין שיעור היום (יום כיפור / תשעה באב)' : `ירושלמי ${tractateHe(spec.t)} דף ${gem(spec.daf)}`;
  const ms = spec.items, a = ms[0], b = ms.at(-1);
  if (spec.chapter) return `${tractateHe(a.t)} פרק ${gem(a.c)}`;
  return `${tractateHe(a.t)} ${gem(a.c)}, ${gem(a.m)}` + (b === a ? '' : b.t === a.t ? (b.c === a.c ? ` – ${gem(b.m)}` : ` – ${gem(b.c)}, ${gem(b.m)}`) : ` – ${tractateHe(b.t)} ${gem(b.c)}, ${gem(b.m)}`);
}
export function gemaraLabel(iso, unit) {
  if (unit === 'amudyomi') { const d = amudYomi(iso); return `${tractateHe(d.t)} ${amudHe(d.amudim[0])}`; }
  return specLabel(gemaraSpec({ iso }, unit));
}
const gemaraCredits = (idx, keys) => keys.map(([label, k]) => idx.sources?.[k] && { label, ...idx.sources[k] }).filter(Boolean);
const missingNote = ref => ({ type: 'note', text: 'הקטע הזה אינו כלול באתר (אין לו טקסט במהדורות שבאתר). אפשר ללמוד אותו בספריא: ', href: sefUrl(ref), hrefText: ref });
const partialNote = n => ({ type: 'note', cls: 'gm-partial', text: `ניקוד הביאור וההקראה בעמוד הזה עדיין בבנייה (${n} קטעים נותרו): ${n === 1 ? 'קטע אחד מוצג' : 'חלק מהקטעים מוצגים'} בלי ניקוד, וההקראה שלהם עלולה לשבש מילים. הם יתעדכנו בגרסה הבאה.` });
const pmNote = { type: 'note', text: 'לכל קטע ירושלמי מוצג מתחתיו פירוש ״פני משה״ (ר׳ משה מרגליות). ההקראה קוראת את הפירוש; קטע שאין עליו פירוש – ההקראה קוראת את הטקסט עצמו.' };
function yerBlocks(f, s, idp, blocks) {
  f.segs.forEach((row, i) => {
    const [t, pm] = Array.isArray(row) ? row : [row, []], say = (s?.say?.[i] || []).filter(Boolean).join(' ');
    blocks.push({ type: 'p', id: `${idp}.${i + 1}`, text: t, ...(pm.length ? { biur: pm, biurV: s?.v?.[i], biurLabel: 'פני משה', say: say || undefined } : {}), src: 'gemara', pause: true });
  });
}
async function gemaraDoc(plan, unit) {
  const idx = await data('gemara/index.json'), blocks = [], spec = gemaraSpec(plan, unit), title = UNITS[unit].full, subtitle = plan.gem ? specLabel(spec) : gemaraLabel(plan.iso, unit);
  let partial = 0;
  if (spec.kind === 'bavli') {
    const T = bavliT(idx, spec.t);
    for (const a of spec.amudim) {
      if (!has.bavli(idx, spec.t, a)) {   // a tractate that ends on amud a; Kinnim / Middot (no Bavli Gemara)
        if (!(spec.amudim.length > 1 && a.endsWith('b') && has.bavli(idx, spec.t, a.replace('b', 'a')))) { blocks.push({ type: 'h', text: `${tractateHe(spec.t)} ${amudHe(a)}` }, missingNote(`${spec.t} ${a}`)); }
        continue;
      }
      blocks.push({ type: 'h', text: `${tractateHe(spec.t)} ${amudHe(a)}` });
      const [fp, sp] = gemaraFiles({ ...spec, amudim: [a] }, idx), f = await data(fp), s = await optional(sp);
      if (T.yer) { if (!blocks.includes(pmNote)) blocks.push({ type: 'note', text: 'במחזור הדף היומי, מסכת שקלים נלמדת מן התלמוד הירושלמי (בעמודי הש״ס של וילנא).' }, pmNote); yerBlocks(f, s, a, blocks); partial += s?.partial || 0; continue; }
      partial += s ? s.partial || 0 : f.segs.length;
      f.segs.forEach(([g, st], i) => blocks.push({ type: 'p', id: `${a}.${i + 1}`, ref: `${spec.t} ${a}:${i + 1}`, text: g, biur: st ? [st] : [], biurV: s?.v?.[i] ? [s.v[i]] : undefined, biurLabel: 'ביאור', say: s?.say?.[i] || undefined, src: 'gemara', pause: true }));
    }
    if (partial) blocks.unshift(partialNote(partial));
    return { title, subtitle, blocks, raw: true, gemara: 'bavli', credits: gemaraCredits(idx, T?.yer ? [['תלמוד ירושלמי', 'yerushalmi'], ['פני משה', 'peneimoshe']] : [['גמרא (מנוקדת)', 'gemara'], ['ביאור שטיינזלץ', 'steinsaltz']]) };
  }
  if (spec.kind === 'yer') {
    if (spec.none) blocks.push({ type: 'note', text: 'במחזור הירושלמי היומי (מהדורת וילנא) אין שיעור ביום הכיפורים ובתשעה באב.' });
    else if (!has.yer(idx, spec.t, spec.daf)) blocks.push(missingNote(`Jerusalem Talmud ${spec.t}`));
    else {
      const [fp, sp] = gemaraFiles(spec, idx), f = await data(fp), s = await optional(sp);
      blocks.push(pmNote); yerBlocks(f, s, `y${spec.daf}`, blocks);
      if (s?.partial) blocks.unshift(partialNote(s.partial));
    }
    return { title, subtitle, blocks, raw: true, gemara: 'yer', credits: gemaraCredits(idx, [['תלמוד ירושלמי', 'yerushalmi'], ['פני משה', 'peneimoshe']]) };
  }
  let lastCh = null;
  for (const m of spec.items) {
    if (!spec.chapter) blocks.push({ type: 'h', text: `${tractateHe(m.t)} פרק ${gem(m.c)} משנה ${gem(m.m)}` });
    else if (lastCh !== m.c) { lastCh = m.c; }
    if (!has.mishna(idx, m.t, m.c)) { blocks.push(missingNote(`Mishnah ${m.t} ${m.c}:${m.m}`)); continue; }
    const f = await data(`gemara/mishna/${pathT(m.t)}/${m.c}.json`), s = await optional(`gemara/msay/${pathT(m.t)}/${m.c}.json`), i = m.m - 1;
    if (f.m[i] == null) { blocks.push(missingNote(`Mishnah ${m.t} ${m.c}:${m.m}`)); continue; }
    if (spec.chapter) blocks.push({ type: 'h', text: `משנה ${gem(m.m)}` });
    if (s?.partial && !partial) partial = s.partial;
    const plain = f.m[i].replace(/<[^>]+>/g, '');
    blocks.push({ type: 'p', id: `${m.c}.${m.m}`, ref: `Mishnah ${m.t} ${m.c}:${m.m}`, text: f.m[i], biur: f.b[i] || [], biurV: s?.v?.[i], biurLabel: 'ברטנורא', say: [plain, ...(s?.bs?.[i] || []).filter(Boolean)].join(' '), src: 'gemara', pause: true });
  }
  if (partial) blocks.unshift(partialNote(partial));
  return { title, subtitle, blocks, raw: true, gemara: 'mishna', credits: gemaraCredits(idx, [['משנה', 'mishnah'], ['ברטנורא', 'bartenura']]) };
}
// ---------------- 1.0.98: Nach Yomi and Shnayim Mikra ----------------
const pathB = b => b.replace(/ /g, '_');
// the app passes its (live) prefs object; Node / tests may pass { shnayimSplit }
let OPTS = {};
export function setTextOptions(o) { OPTS = o || {}; }
const shnayimWeek = () => OPTS.shnayimSplit === 'week';
export const nachLabel = n => `${NACH_HE[n.book] || n.book} פרק ${gem(n.c)}`;
async function nachDoc(plan) {
  const n = plan.nach || nachYomi(plan.iso), idx = await data('nach/index.json');
  const d = await data(`nach/${pathB(n.book)}/${n.c}.json`), z = await optional(`nachv/${pathB(n.book)}/${n.c}.json`), lbl = d.el === 'rashi' ? 'רש״י' : 'מצודת דוד';
  const blocks = [{ type: 'h', text: nachLabel(n) }];
  if (z?.partial || !z) blocks.unshift({ type: 'note', text: `ניקוד הפירוש בפרק הזה עדיין בבנייה (${z?.partial ?? 'כל'} קטעים): הם מוצגים בלי ניקוד, וההקראה שלהם עלולה לשבש מילים. הם יתעדכנו בגרסה הבאה.` });
  d.v.forEach((t, i) => blocks.push({ type: 'v', id: `${n.c}:${i + 1}`, ref: `${n.book} ${n.c}:${i + 1}`, num: gem(i + 1), text: t, src: 'tanakh',
    ...(d.e[i]?.length ? { biur: d.e[i], biurV: z?.vd?.[i], biurLabel: lbl, biurSay: z?.say?.[i] } : {}) }));
  const credits = [['נ״ך (מקרא על פי המסורה)', idx.sources?.nach], [lbl, idx.sources?.[d.el === 'rashi' ? 'nachRashi' : 'metzudat']]].filter(([, m]) => m).map(([label, m]) => ({ label, ...m }));
  return { book: n.book, title: UNITS.nachyomi.full, subtitle: nachLabel(n), blocks, tanakh: true, noInline: true, credits };
}
/** the verses of Shnayim Mikra: today's aliyah (as the daily Chumash) or the whole week's parsha (Sunday–Shabbat) */
export function shnayimParts(plan) {
  if (!shnayimWeek() || !plan.hd) return plan.chumash.parts;
  const out = [];
  for (let k = 0; k < 7; k++) for (const p of chumashOf(plan.hd.add(k - plan.hd.getDay(), 'd'), plan.il ?? true).parts) {
    const last = out.at(-1);
    if (last && last.book === p.book && (p.from.c < last.to.c || p.from.c === last.to.c && p.from.v <= last.to.v + 1)) { if (p.to.c > last.to.c || p.to.c === last.to.c && p.to.v > last.to.v) last.to = p.to; }
    else out.push({ ...p });
  }
  return out;
}
async function shnayimDoc(plan) {
  const blocks = [], parts = shnayimParts(plan), week = shnayimWeek() && !!plan.hd;
  blocks.push({ type: 'note', text: 'כל פסוק נקרא פעמיים, ואחריו תרגום אונקלוס.' });
  for (const c of parts) for (let ch = c.from.c; ch <= c.to.c; ch++) {
    const d = await data(`torah/${c.book}/${ch}.json`), o = await optional(`onkelos/${c.book}/${ch}.json`);
    const a = ch === c.from.c ? c.from.v : 1, b = ch === c.to.c ? c.to.v : d.v.length;
    blocks.push({ type: 'h', text: `${c.bookHe || BOOK_HE[c.book]} פרק ${gem(ch)}` });
    for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${ch}:${v}`, ref: `${c.book} ${ch}:${v}`, num: gem(v), text: d.v[v - 1], src: 'tanakh', repeat: 2,
      ...(o?.t?.[v - 1] ? { biur: [o.t[v - 1]], biurLabel: 'תרגום', biurSay: [o.say[v - 1]] } : {}) });
  }
  const sub = c => `${c.bookHe || BOOK_HE[c.book]} ${gem(c.from.c)}, ${gem(c.from.v)} – ${gem(c.to.c)}, ${gem(c.to.v)}`;
  const idx = await optional('nach/index.json'), on = idx?.sources?.onkelos;
  return { book: parts[0].book, title: UNITS.shnayim.full, subtitle: (week ? `פרשת ${plan.chumash.parshaHe} – כל הפרשה` : plan.chumash.title) + ' · ' + parts.map(sub).join(' · '), blocks, tanakh: true, noInline: true,
    credits: on ? [{ label: 'תרגום אונקלוס (ניקוד תימני – תאג׳)', ...on }] : [] };
}
export function buildDoc(plan, unit) {
  if (unit === 'nachyomi') return nachDoc(plan);
  if (unit === 'shnayim') return shnayimDoc(plan);
  if (GEMARA_UNITS.includes(unit)) return gemaraDoc(plan, unit);
  if (unit === 'hayomyom') return hayomDoc(plan);
  if (unit === 'chumash') return chumashDoc(plan);
  if (unit === 'tehillim') return tehillimDoc(plan);
  if (unit === 'tanya') return tanyaDoc(plan);
  if (unit === 'mitzvot') return mitzvotDoc(plan);
  if (unit === 'tolt') return toltDoc(plan);
  if (unit === 'ravyomi') return ravDoc(plan);
  return rambamDoc(plan, unit);
}
/** Short description of a unit's portion for the home cards. */
export async function describe(plan, unit) {
  if (unit === 'chumash') return plan.chumash.title;
  if (unit === 'nachyomi') return nachLabel(plan.nach || nachYomi(plan.iso));
  if (unit === 'shnayim') return shnayimWeek() ? `פרשת ${plan.chumash.parshaHe} – כל הפרשה` : plan.chumash.title;
  if (GEMARA_UNITS.includes(unit)) return plan.gem ? specLabel(plan.gem) : gemaraLabel(plan.iso, unit);
  if (unit === 'tehillim') return plan.tehillim.title;
  if (unit === 'tanya') { const d = await tanyaDoc(plan); return d.blocks.find(b => b.type === 'h')?.text || d.subtitle; }  // with "(המשך)" like the reader (round 4)
  if (unit === 'mitzvot') return plan.mitzvot.items.map(mitzvotLabel).join(' · ');
  if (unit === 'tolt') return (await toltLessons(plan)).map(({ e }) => toltLabel(e)).join(' · ');
  if (unit === 'ravyomi') { const { d } = await ravLesson(plan); return d ? ravLabel(d) : 'אין שיעור בלוח לתאריך זה'; }
  if (unit === 'hayomyom') { const D = await data('hayomyom/days.json'); return D[hayomKey(plan.iso).key].ref; }
  return rambamTitle(plan[unit]);
}

// ---------------- Siddur (Open Siddur Project, Nusach Ha-Ari / Chabad – see tools/build-siddur.mjs) ----------------
export const siddurIndex = () => data('siddur/index.json');
/** every siddur section in table-of-contents order: [{book, n, he, bookHe}] */
export async function siddurOrder() {
  const idx = await siddurIndex();
  return idx.books.flatMap(b => b.secs.map((s, i) => ({ book: b.id, n: i + 1, he: s.he, bookHe: b.he, group: b.group })));
}
export async function siddurFiles() {
  return ['siddur/index.json', ...(await siddurOrder()).map(s => `siddur/${s.book}/${s.n}.json`)];
}
// the built files contain only text with <b>/<i>; anything else is dropped here as well (defence in depth)
const inlineOnly = h => String(h).replace(/<(?!\/?(?:b|i)>)[^>]*>/g, '');
/** 1.0.61: a siddur table ['t', rows, cls] (Ana Bekoach with the Divine Names, the Hallel responses, the Omer chart) →
 *  {type:'table', cls, rows:[[{k, html, lang}]]}. k: 'p' prayer text (spoken), 'x' shown only (the Names, the chart's
 *  Sefirah / words / letter – never read aloud), 'n' an instruction (translated like a note), '' an empty cell.
 *  text = the spoken cells, for the vocalisation check and search. */
function siddurTable(id, rows, cls, runs, lang, hideInstructions = false) {
  const cell = ([k, h, he]) => {
    if (!k) return { k: '', html: '' };
    if (k === 'n') {
      if (hideInstructions) return { k: '', html: '' };
      if (lang === 'en' || !he) return { k, html: inlineOnly(h), lang: 'en' };
      return { k, html: inlineOnly(he).replace(/<\/?i>/g, '') + (lang === 'both' ? ` <span lang="en" dir="ltr">${inlineOnly(h)}</span>` : ''), lang: 'he' };
    }
    return { k, html: localizeRuns(inlineOnly(h), runs, lang, { hideInstructions }) };
  };
  const R = rows.map(r => r.map(cell)).filter(r => !hideInstructions || r.some(c => c.html));
  return { type: 'table', id, cls: /^[a-z]+$/.test(cls) ? cls : 'plain', rows: R, text: R.flat().filter(c => c.k === 'p').map(c => c.html).join(' ') };
}
/** Occasional/seasonal prayer insertions (יעלה ויבוא, על הניסים, עננו, משיב הרוח, …) – spoken paragraphs, not the
 *  instruction notes. Flags are computed from the raw siddur rows so the reader can style them distinctly.
 *  1.0.66: only true conditional insertions. Daily passages that are sometimes *omitted* (פרשת העקדה etc.)
 *  must not be flagged; biblical citations like בראשית must not match בראש חודש. */
const stripTags = s => String(s || '').replace(/<[^>]*>/g, '');
const skelHe = s => stripTags(s).replace(/[\u0591-\u05C7]/g, '').replace(/^\s+/, '');
const ADD_EN_RE = /adds? the following|one adds\b|(?:^|[.\s>])add:|substitutes? the following|continue with:/i;
const OMIT_RE = /omit(?:s|ted|ting)?(?: the following)?|is omitted|are omitted|אין אומרים|משמיטים|לא אומרים/i;
// Day/season labels for true insertions. Not bare "On " (that caught omit-notes) and not בראש alone (that caught בראשית).
const SIT_LABEL_RE = /^(Summer|Winter|From Rosh HaShanah to Yom Kippur, during the Ten Days of Penitence, (?:add|one substitutes)|During |On (?:Chanukah|Purim|Rosh|Pesach|Sukkot|Shavuot|Shabbat|weekdays|Festivals|Yom Kippur|Shemini|Chol|a Public|wine|the First|the Second|the Third|the Fourth|the Fifth|the Sixth|Hosha)|בקיץ|בחורף|בראש חודש|בפסח|בסוכות|בשבועות|בפורים|בחנוכה|בשבת|ביום טוב|בחול המועד|מראש השנה)/i;
const OPEN_RE = /^(ו?על הנסים|יעלה ויבא|עננו|זכרנו לחיים|וכתוב לחיים|וכתוב|מי כמוך|משיב הרוח|מוריד הטל|ותן טל|ותן ברכה|רצה והחליצנו|נחם)/; // הרחמן: only via situational labels (On Shabbat / RC / …), not every daily line
const CONT_RE = /^(בימי |הזה[.׃]?)/;
const RESUME_RE = /^(ועל כל[םו]|ותחזינה|יהיו לרצון|מודים|מלך,? עוזר|מכלכל חיים|על פני האדמה|ברך עלינו|אתה קדוש|אלהינו ואלהי אבותינו, ברכנו)/;
const CITE_RE = /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Samuel|Kings|Isaiah|Jeremiah|Ezekiel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Psalms?|Proverbs|Job|Song|Ruth|Lamentations|Ecclesiastes|Esther|Daniel|Ezra|Nehemiah|Chronicles|\d\s*(Chronicles|Samuel|Kings)|בראשית|שמות|ויקרא|במדבר|דברים|תהל[יי]ם|תהלים|משלי|איוב)/i;
function isOmitNote(en, he) {
  const e = stripTags(en).trim(), h = stripTags(he).trim();
  return OMIT_RE.test(e) || OMIT_RE.test(h);
}
function isAddNote(en, he) {
  const e = stripTags(en).trim(), h = stripTags(he).trim();
  // Inline word-swap notes ("substitute X with Y") are not a following prayer block.
  if (/substitut\w* the words|אומרים במקום המילים/i.test(e + ' ' + h) && !/the following/i.test(e)) return false;
  if (isOmitNote(en, he)) return false;
  if (ADD_EN_RE.test(e)) return true;
  // Hebrew: a short cue that ends with מוסיפים / מוסיפים: (the next paragraph is the addition).
  if (h.length <= 120 && /מוסיפים:?\s*$/.test(h)) return true;
  if (/אומרים במקום/.test(h) && /the following/i.test(e)) return true;
  return false;
}
function isSituationalLabel(en, he) {
  const e = stripTags(en).trim(), h = stripTags(he).trim();
  if (Math.max(e.length, h.length) > 110) return false;
  if (isOmitNote(en, he)) return false;
  // "continue below" / ordinary flow / "blessings end here" are not insertions.
  if (/continue below|ordinary|end here|blessings end|רגילה|ממשיכים|מסתיימות/i.test(e + ' ' + h)) return false;
  return SIT_LABEL_RE.test(e) || SIT_LABEL_RE.test(h);
}
function isSectionTitle(en, he) {
  const e = stripTags(en).trim(), h = stripTags(he).trim();
  return (e.length < 70 && /[–—-]/.test(e) && /[\u05D0-\u05EA]/.test(e))
    || (h.length < 40 && /[–—-]/.test(h));
}
function isCitationNote(en, he) {
  const e = stripTags(en).trim(), h = stripTags(he).trim();
  return CITE_RE.test(e) || CITE_RE.test(h);
}
/** @param {Array} rows raw siddur section.b rows [type, en/html, he?]
 *  @returns {boolean[]} parallel flags: true = spoken insertion paragraph */
export function specialPrayerFlags(rows) {
  const flags = Array(rows.length).fill(false);
  let expect = false, inRun = false;
  for (let i = 0; i < rows.length; i++) {
    const [t, h, he] = rows[i];
    if (t === 'h') { expect = false; inRun = false; continue; }
    if (t === 'n') {
      if (isOmitNote(h, he)) { expect = false; inRun = false; }
      else if (isAddNote(h, he)) { expect = true; inRun = true; }
      else if (isSituationalLabel(h, he)) { expect = true; }
      else if (isSectionTitle(h, he) || isCitationNote(h, he)) { expect = false; inRun = false; }
      else expect = false;
      continue;
    }
    if (t !== 'p') { expect = false; continue; }
    const sk = skelHe(h);
    let special = expect || OPEN_RE.test(sk) || (inRun && CONT_RE.test(sk));
    if (RESUME_RE.test(sk)) special = false;
    flags[i] = special;
    expect = false;
    inRun = special ? true : false;
  }
  return flags;
}
/** Wrap (א)(ב)…(יד) list/section markers so they render muted and are dropped from TTS (data-nr). */
export function markSectionLabels(html) {
  return String(html || '').replace(/\(([א-י]|י[א-ד])\)(?=\s*[\u05D0-\u05EA])/g,
    '<span class="sid-mark" data-nr aria-hidden="true">($1)</span>');
}

/** Notes that mention omit/אין אומרים but do not mark a following spoken block (procedure, word-level, navigation). */
function isOmitBlockNote(en, he) {
  if (!isOmitNote(en, he)) return false;
  const e = stripTags(en).trim(), h = stripTags(he).trim(), t = e + ' ' + h;
  if (/omit the word|משמיטים את המילה|המילים ״/i.test(t)) return false;
  if (/mistakenly omitted|שכח לאומרו|אם נזכר/i.test(t)) return false;
  // 1.0.68 rule: omit-style only a block that is simply dropped with nothing in its place.
  // Alternatives ("say X instead", "במקומם") are a choice, not an omission (e.g. על נהרות בבל / שיר המעלות).
  if (/substitute|instead|in (?:its|their) place|במקומ[םןה]|במקומו|אומרים במקום/i.test(t)) return false;
  // Verse/word-level omissions inside a paragraph (shaded verse) must not style the whole paragraph.
  if (/shaded verse|הפסוק המוצלל|the following line|השורה הבאה/i.test(t)) return false;
  if (/only once each day|רק פעם אחת|while on the ground|בישיבה על הארץ|Kaddish is not said after|אחרי סיום קריאת התורה אין אומרים קדיש/i.test(t)) return false;
  if (/It is appropriate to recite ones daily Tehillim|ראוי לומר בשלב זה את השיעור היומי/i.test(t)) return false;
  if (/Upon completion of the Amidah one is to say Tachanun|בסיום תפילת העמידה אומרים/i.test(t) && /on days that Ta/i.test(t)) return false;
  // Pure navigation ("continue on at X") without "omit the following …"
  if (/continue on at|ממשיכים ב/i.test(t) && !/omit the following|משמיטים את|אין אומרים את/i.test(t)) return false;
  return /the following|את הפסק|את המזמור|את הברכ|את השור|את הפסוק|ברכה זו|omit this blessing|From the second night|שתי הפסק|הפסקאות הבאות|המזמור הבא|אמרים בימי שני|except when Techanun|חוץ מימים שאין|On weekdays the following two Psalms/i.test(t)
    || (/Psalm|מזמור|תהל/i.test(t) && /omit|אין אומרים|משמיט/i.test(t));
}

/** How many spoken paragraphs the omit instruction covers. */
function omitSpan(en, he) {
  const t = stripTags(en).trim() + ' ' + stripTags(he).trim();
  const mTwo = t.match(/following two paragraphs|שתי הפסקאות/i);
  if (mTwo) return { mode: 'count', n: 2 };
  if (/following two Psalms|שני המזמורים/i.test(t)) return { mode: 'psalms', n: 2 };
  // plural: paragraphs OR Psalms until the next instructional note
  if (/following paragraphs|הפסקאות הבאות|following Psalms|omit the following Psalms|את המזמורים|המזמורים הבאים/i.test(t)) return { mode: 'until-note', n: null };
  if (/Psalm|המזמור הבא|מזמור הבא|את המזמור|את תהלים/i.test(t)) return { mode: 'psalm', n: null };
  // singular paragraph / blessing / line / verse / "this blessing"
  return { mode: 'count', n: 1 };
}

/** Resume point of a multi-paragraph omit note ("continue on at X" / וממשיכים ב״X״), as a letter skeleton. */
function resumeAt(en, he) {
  const m = stripTags(he || '').match(/וממשיכים ב[״"]([^״"]+)[״"]/);
  if (!m || !/הפסקאות הבאות|following paragraphs/i.test(stripTags(en) + ' ' + stripTags(he))) return null;
  return skelHe(m[1]);
}

const CITE_NOTE_RE = /^(Psalm|Psalms|תהל)/i;
/** Short Hebrew cue for the omit-start marker (shown, not spoken). */
function omitStartLabel(en, he) {
  const h = stripTags(he).trim(), e = stripTags(en).trim();
  if (/בשבת.*יום טוב|ביום טוב.*שבת|On Shabbat and Festivals/i.test(h + ' ' + e)) return 'בשבת ויו״ט אין אומרים';
  if (/שני וחמישי|Mondays and Thursdays/i.test(h + ' ' + e)) return 'רק בימי שני וחמישי (כשיש תחנון)';
  if (/תחנון|Tachanun|Techanun/i.test(h + ' ' + e)) return 'בימים שאין אומרים תחנון';
  if (/תשעה באב|Tisha/i.test(h + ' ' + e) && /כיפור|Kippur/i.test(h + ' ' + e)) return 'בתשעה באב וביום הכיפורים אין אומרים';
  if (/חנוכה|Chanukah/i.test(h + ' ' + e)) return 'מהלילה השני אין אומרים';
  if (/יחיד|alone|ביחידות/i.test(h + ' ' + e)) return 'ביחידות אין אומרים';
  if (/Hallel|הלל|Psalms? 1[15]/i.test(h + ' ' + e)) return 'בחצי הלל אין אומרים';
  if (/שבת ראש חודש|Shabbat Rosh Chodesh/i.test(h + ' ' + e)) return 'בשבת ראש חודש משמיטים';
  if (/Festival or Chol haMoed|יום טוב או חול המועד/i.test(h + ' ' + e)) return 'ביו״ט/חוה״מ שחל בשבת משמיטים';
  if (/weekdays.*Psalms|בימות החול אומרים את שני המזמורים/i.test(h + ' ' + e)) return 'בשבת ויו״ט אין אומרים';
  if (h.length && h.length <= 48) return h.replace(/:$/, '');
  return 'אין אומרים';
}

/**
 * 1.0.67: paragraphs omitted on Shabbat/Yom Tov / no-Tachanun / etc.
 * @returns {{ omit: boolean[], isStart: boolean[], isEnd: boolean[], label: (string|null)[] }}
 */
export function omitPrayerFlags(rows, { book, n: secN } = {}) {
  const n = rows.length;
  // Birkat haMazon is an always-available prayer: its variants are never omit-styled.
  if (book === 'brachot' && secN === 4) return { omit: Array(n).fill(false), isStart: Array(n).fill(false), isEnd: Array(n).fill(false), label: Array(n).fill(null) };
  const omit = Array(n).fill(false), isStart = Array(n).fill(false), isEnd = Array(n).fill(false), label = Array(n).fill(null);
  const isCite = (t, h) => t === 'n' && CITE_NOTE_RE.test(stripTags(h).trim());
  for (let i = 0; i < n; i++) {
    const [t, h, he] = rows[i];
    if (t !== 'n' || !isOmitBlockNote(h, he)) continue;
    const span = omitSpan(h, he);
    const lab = omitStartLabel(h, he);
    const idxs = [];
    let j = i + 1;
    while (j < n && isCite(rows[j][0], rows[j][1])) j++;
    if (span.mode === 'count') {
      let left = span.n;
      while (j < n && left > 0) {
        if (rows[j][0] === 'p') { idxs.push(j); left--; j++; }
        else if (isCite(rows[j][0], rows[j][1])) j++;
        else break;
      }
    } else if (span.mode === 'psalms') {
      // N distinct psalms (cite + body), e.g. Birkat haMazon weekday pair
      let left = span.n;
      while (j < n && left > 0) {
        while (j < n && isCite(rows[j][0], rows[j][1])) j++;
        if (j >= n || rows[j][0] !== 'p') break;
        while (j < n && rows[j][0] === 'p') { idxs.push(j); j++; }
        left--;
      }
    } else if (span.mode === 'psalm') {
      // one psalm: take p-rows until the next non-cite note/heading (or a new Psalm cite after ≥1 p)
      let got = 0;
      while (j < n) {
        const [tj, hj] = rows[j];
        if (tj === 'h') break;
        if (tj === 'n') {
          if (isCite(tj, hj)) {
            if (got > 0) break; // next psalm citation ends this omit
            j++; continue;
          }
          break;
        }
        if (tj === 'p') {
          // stop before a known resume opener once we already have a psalm paragraph
          const sk = skelHe(hj);
          if (got > 0 && /^(יהי כבוד|אשרי יושבי|בית יעקב|השכיבנו אבינו|לעולם יהא אדם|רבון כל העולמים|עד אנה בכיה)/.test(sk)) break;
          idxs.push(j); got++; j++;
          continue;
        }
        break;
      }
    } else if (resumeAt(h, he)) {
      // 1.0.71: "omit the following paragraphs, continue on at X" — the span runs through inner
      // procedural notes (strike the chest, may sit) up to the resume point X, not the first note.
      const key = resumeAt(h, he);
      while (j < n) {
        const [tj, hj, hej] = rows[j];
        if (tj === 'h') break;
        const sk = skelHe(stripTags(tj === 'n' ? (hej || '') : (typeof hj === 'string' ? hj : '')));
        if (sk.startsWith(key)) break;
        if (tj === 'p') idxs.push(j);
        j++;
      }
      if (j >= n) idxs.length = 0; // resume point not found: don't guess
    } else { // until-note: consecutive p (and inner cites) until a non-cite note/heading
      while (j < n) {
        const [tj, hj] = rows[j];
        if (tj === 'h') break;
        if (tj === 'n') {
          if (isCite(tj, hj)) { j++; continue; }
          break;
        }
        if (tj === 'p') { idxs.push(j); j++; continue; }
        break;
      }
    }
    if (!idxs.length) continue;
    for (const k of idxs) omit[k] = true;
    isStart[idxs[0]] = true;
    label[idxs[0]] = lab;
    isEnd[idxs[idxs.length - 1]] = true;
  }
  // 1.0.74: whole passages whose instruction is a section heading, not an "omit the following" note
  for (const [a, z, lab] of SIDDUR_EXTRA_OMIT[`${book}/${secN}`] || []) {
    if (z >= n) continue;
    for (let k = a; k <= z; k++) { isStart[k] = false; isEnd[k] = false; label[k] = null; if (rows[k][0] === 'p') omit[k] = true; }
    isStart[a] = true; label[a] = lab; isEnd[z] = true;
  }
  return { omit, isStart, isEnd, label };
}
/** 1.0.74 audit: [first, last, label] row spans. Tachanun itself (Vidui → ואנחנו לא נדע) at Shacharit and Mincha,
 *  and Tikkun Rachel ("only said on days in which Tachanun is said", chatzot/1#10). */
export const SIDDUR_EXTRA_OMIT = {
  'shacharit/4': [[2, 45, 'בימים שאין אומרים תחנון']],
  'mincha/3': [[2, 18, 'בימים שאין אומרים תחנון']],
  'chatzot/1': [[15, 31, 'בימים שאין אומרים תחנון']],
};

/** 1.0.90: Kaddish blocks (חצי קדיש, קדיש שלם/תתקבל, קדיש יתום, קדיש דרבנן, אחר הקבורה) – rows to skip in the read-aloud
 *  when the reader chooses so (prefs.siddurKaddish = 'skip'); the text stays on screen. A block starts at a paragraph
 *  that opens with "יתגדל ויתקדש שמה רבא" and continues over the Kaddish's own paragraphs (the congregation's
 *  response, יהא שמה רבא, על ישראל, תתקבל, יהא שלמא, עושה שלום) and the steps-back instruction between them.
 *  Its title and the "in the presence of a minyan … recites Kaddish" note just before it belong to it too. Audit: verification/SIDDUR-KADDISH-190.md (tools/kaddish-audit.mjs). */
const kdPlain = s => stripTags(typeof s === 'string' ? s : JSON.stringify(s ?? '')).replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
export const KADDISH_START = /^יתגדל ויתקדש שמה רבא/;
export const KADDISH_CONT = /^(\(Cong: אמן\. יהא שמה רבא|יהא שמה רבא מברך|על ישראל ועל רבנן|תתקבל צלותהון|יהא שלמה רבא|יהא שלמא רבא|עשה שלום( \([^)]*\))? במרומיו|עושה שלום( \([^)]*\))? במרומיו)/;
// instructions that belong to the Kaddish itself: its title, "in the presence of a minyan … recites Kaddish", the steps
// back. Other instructions inside or before a Kaddish (where to continue on Chanukah, "the chazzan says a psalm, then…")
// are kept in the read-aloud.
const kdHe = row => kdPlain(row[2] || row[1]);
const kdNoteBefore = row => { const t = kdHe(row); return /קדיש/.test(t) && (t.length <= 20 || /^בנוכחות מניין/.test(t)); };
const kdNoteInside = row => /^פוסעים שלוש פסיעות|^Take three steps/.test(kdHe(row));
export function kaddishFlags(rows) {
  const f = Array(rows.length).fill(false), starts = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] !== 'p' || !KADDISH_START.test(kdPlain(rows[i][1]))) continue;
    starts.push(i); f[i] = true;
    // announcing instructions / the Kaddish's title right before it (notes only, up to 3, each mentioning Kaddish)
    for (let k = i - 1; k >= 0 && k >= i - 3 && rows[k][0] === 'n' && kdNoteBefore(rows[k]); k--) f[k] = true;
    // continuation: Kaddish paragraphs, and notes only when another Kaddish paragraph follows them
    let j = i + 1;
    for (;;) {
      let k = j; while (k < rows.length && rows[k][0] === 'n') k++;
      if (k < rows.length && rows[k][0] === 'p' && KADDISH_CONT.test(kdPlain(rows[k][1]))) { for (let m = j; m <= k; m++) f[m] = rows[m][0] === 'p' || kdNoteInside(rows[m]); j = k + 1; }
      else break;
    }
    i = j - 1;
  }
  return { flags: f, starts };
}

/** Mark the last paragraph of each contiguous special run longer than one paragraph. */
export function specialBlockEnds(specialFlags) {
  const ends = Array(specialFlags.length).fill(false);
  let run = 0, start = -1;
  const close = (i) => { if (run > 1) ends[i - 1] = true; run = 0; start = -1; };
  for (let i = 0; i <= specialFlags.length; i++) {
    if (i < specialFlags.length && specialFlags[i]) {
      if (run === 0) start = i;
      run++;
    } else if (run) close(i);
  }
  return ends;
}


/** 1.0.68: lines the siddur says to repeat N times are printed N times, so reader and read-aloud say them N times.
 *  key `${book}/${section}` → { noteRow: [count, [paragraph rows…]] }. Audited list: verification/SIDDUR-REPEATS-168.md */
export const SIDDUR_REPEATS = {
  'boker/5': { 8: [3, [9]], 10: [3, [11]], 12: [3, [13]] },
  'mincha/1': { 13: [3, [14]], 15: [3, [16]], 17: [3, [18]] },
  'maariv/1': { 3: [3, [4]], 5: [3, [6]], 7: [3, [8]] },
  'kabbalat/3': { 1: [3, [2]], 3: [3, [4]], 5: [3, [6]] },
  'minchashabbat/1': { 13: [3, [14]], 15: [3, [16]], 17: [3, [18]] },
  'shema/1': { 20: [3, [21]], 22: [3, [23]], 48: [3, [49]], 50: [3, [51]], 52: [3, [53]], 54: [3, [55]], 56: [3, [57]], 58: [3, [59]] },
  'derech/1': { 6: [3, [7]], 8: [3, [9]], 10: [3, [11]], 12: [3, [13]] },
  'shabbatbook/2': { 0: [3, [1, 2, 3, 4]] },
  'rc/1': { 27: [2, [28]], 29: [2, [30]], 31: [2, [32]], 33: [2, [34]], 41: [2, [42]], 43: [2, [44]], 45: [2, [46]], 47: [2, [48]], 54: [3, [55]] },
  'sukkot/2': { 64: [3, [65]] },
  'levana/1': { 6: [3, [7]], 8: [3, [9]], 14: [3, [15]] },
};
/** 1.0.72: a title stored twice (as a spoken paragraph + a smaller note): the paragraph becomes a heading (not read
 *  aloud), the smaller duplicate note is removed. Row indexes are kept so progress/ids don't shift. */
export const SIDDUR_DUP_TITLES = { 'shema/1': { 38: 'h' }, 'shacharit/5': { 28: 'h' }, 'shabbat/5': { 55: 'h' } };
const titleKey = s => stripTags(String(s || '')).replace(/[\u0591-\u05C7]/g, '').replace(/[:.,–\-()]/g, '').replace(/\s+/g, ' ').trim();
/** Rows to drop: a note right after a heading that only repeats that heading (Hebrew translation of the title). */
export function dupTitleDrops(rows, book, n) {
  const asH = SIDDUR_DUP_TITLES[`${book}/${n}`] || {}, out = new Set();
  for (let i = 1; i < rows.length; i++) {
    const [pt, ph] = rows[i - 1], [t, , he] = rows[i];
    if (t !== 'n' || !(pt === 'h' || asH[i - 1] === 'h')) continue;
    const k = titleKey(ph);
    if (k && titleKey(he) === k) out.add(i);
  }
  return out;
}
export const SHABBAT_LABELS = ['בשבת ויו״ט אין אומרים'];
export const TACHANUN_LABELS = ['בימים שאין אומרים תחנון', 'רק בימי שני וחמישי (כשיש תחנון)'];
const TIMES_HE = { 2: 'פעמיים', 3: 'שלוש פעמים' };
/** row index → repeat count for one section (paragraph rows only). */
export function repeatCounts(book, n) {
  const m = SIDDUR_REPEATS[`${book}/${n}`] || {}, out = new Map();
  for (const [cnt, rows] of Object.values(m)) for (const r of rows) out.set(r, cnt);
  return out;
}

/** lang: language of the instructions – 'he' (default; the translation in the data), 'en' (the transcription's own
 *  English) or 'both' (Hebrew, then the English). A block without a translation falls back to the English. */
export async function buildSiddurDoc(book, n, { lang = 'he', hideNoTachanun = false, hideShabbat = false, hideInstructions = false } = {}) {
  const idx = await siddurIndex(), b = idx.books.find(x => x.id === book);
  if (!b || !b.secs[n - 1]) throw new Error('siddur section not found');
  const sec = await data(`siddur/${book}/${n}.json`);
  const runs = idx.heRuns, blocks = [], special = specialPrayerFlags(sec.b);
  const specialEnd = specialBlockEnds(special), om = omitPrayerFlags(sec.b, { book, n });
  const reps = repeatCounts(book, n), repNotes = SIDDUR_REPEATS[`${book}/${n}`] || {};
  const dupT = SIDDUR_DUP_TITLES[`${book}/${n}`] || {}, drops = dupTitleDrops(sec.b, book, n);
  const kd = kaddishFlags(sec.b).flags;   // 1.0.90: Kaddish paragraphs (read aloud or skipped – prefs.siddurKaddish)
  // 1.0.72: hide no-Tachanun spans (incl. notes inside them) when today is a no-Tachanun day and the setting is on
  const hid = new Set();
  if (hideNoTachanun || hideShabbat) {
    let open = false, lab = null;
    sec.b.forEach((_, i) => {
      if (om.isStart[i]) { lab = om.label[i]; open = (hideNoTachanun && TACHANUN_LABELS.includes(lab)) || (hideShabbat && SHABBAT_LABELS.includes(lab)); }
      if (open && (om.omit[i] || sec.b[i][0] === 'n')) hid.add(i);
      if (om.isEnd[i]) open = false;
    });
  }
  sec.b.forEach(([t0, h, he], i) => {
    if (hid.has(i)) {
      return;
    }
    let t = t0;
    const id = `${book}-${n}-${i}`;
    if (drops.has(i)) return;
    if (dupT[i] === 'h') t = 'h';
    if (t === 'h') { const x = localizeRuns(inlineOnly(h).replace(/<[^>]*>/g, ''), runs, lang, { heading: true }); if (x) blocks.push({ type: 'h', id, text: x }); }
    else if (t === 'n') {
      if (hideInstructions) return;
      const rn = repNotes[i] ? ` (כתוב כאן ${TIMES_HE[repNotes[i][0]] || repNotes[i][0] + ' פעמים'})` : '';
      if (lang !== 'en' && he) blocks.push({ type: 'note', id, html: inlineOnly(he).replace(/<\/?i>/g, '') + rn, lang: 'he' });
      if (lang !== 'he' || !he) blocks.push({ type: 'note', id: lang === 'both' && he ? id + 'e' : id, html: inlineOnly(h), lang: 'en' });
    }
    else if (t === 't') blocks.push({ ...siddurTable(id, h, he, runs, lang, hideInstructions), say: sec.say?.[i] });
    else {
      const extra = {};
      if (special[i]) { extra.special = true; if (specialEnd[i]) extra.specialEnd = true; }
      if (kd[i]) extra.kaddish = true;
      if (om.omit[i]) {
        extra.omit = true;
        if (om.isStart[i]) { extra.omitStart = true; extra.omitLabel = om.label[i]; }
        if (om.isEnd[i]) extra.omitEnd = true;
      }
      const text = localizeRuns(inlineOnly(h), runs, lang, { hideInstructions }), cnt = reps.get(i) || 1;
      blocks.push({ type: 'p', id, text, say: sec.say?.[i], ...extra, ...(cnt > 1 ? { rep: 1, repOf: cnt } : {}) });
      for (let k = 2; k <= cnt; k++) blocks.push({ type: 'p', id: `${id}x${k}`, text, say: sec.say?.[i], rep: k, repOf: cnt, ...(kd[i] ? { kaddish: true } : {}) });
    }
  });
  return { title: sec.he, subtitle: b.he + (sec.en && lang !== 'he' ? ` · ${sec.en}` : ''), blocks, book: 'Siddur', siddur: { book, n } };
}
/** The whole prayer sequence of one book (e.g. Shacharit) as one continuous document: the sections follow one another
 *  with a light marker (type 'h', `sec`) instead of a break, so paging flows from one section into the next. */
export async function buildSiddurBookDoc(book, { lang = 'he', hideNoTachanun = false, hideShabbat = false, hideInstructions = false } = {}) {
  const idx = await siddurIndex(), b = idx.books.find(x => x.id === book);
  if (!b) throw new Error('siddur book not found');
  const parts = await Promise.all(b.secs.map((_, i) => buildSiddurDoc(book, i + 1, { lang, hideNoTachanun, hideShabbat, hideInstructions })));
  const blocks = [], secs = [];
  parts.forEach((d, i) => {
    secs.push({ n: i + 1, he: d.title });
    if (parts.length > 1) blocks.push({ type: 'h', id: `${book}-${i + 1}-h`, text: d.title, sec: i + 1 });
    blocks.push(...d.blocks);
  });
  const names = secs.map(s => s.he);
  return { title: b.he, subtitle: names.length === 1 ? '' : names.length <= 4 ? names.join(' · ') : `${names.length} חלקים ברצף אחד`, blocks, book: 'Siddur', siddur: { book, secs } };
}
