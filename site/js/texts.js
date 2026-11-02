// Loads prebuilt static JSON (site/data) and assembles a day's portion into a document of blocks.
import { gem, tanya as tanyaRange, mitzvotLabel, parshaHe } from './calendar.js';

const cache = new Map();
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
  siddur: { he: 'סידור', full: 'סידור – נוסח חב״ד' }, // not a daily lesson: opened from #/siddur, never listed in the day's cards
};
const shmFile = it => it.k === 'P' || it.k === 'N' ? [`mitzvot/${it.k}/${it.n}.json`] : it.k === 'S' ? Array.from({ length: it.to - it.from + 1 }, (_, i) => `mitzvot/S/${it.from + i}.json`) : it.k === 'intro' ? ['mitzvot/intro.json'] : [];

/** Files a unit needs (used for offline pre-download). */
export async function filesFor(plan, unit) {
  const f = [];
  if (unit === 'chumash') for (const c of plan.chumash.parts) for (let i = c.from.c; i <= c.to.c; i++) f.push(`torah/${c.book}/${i}.json`);
  if (unit === 'tehillim') plan.tehillim.parts.forEach(p => f.push(`tehillim/${p.c}.json`));
  if (unit === 'tanya') { const doc = await tanyaPositions(plan); doc.forEach(([k, c]) => f.push(`tanya/${k}/${c}.json`)); }
  if (unit === 'rambam1' || unit === 'rambam3') {
    const idx = await data('rambam/index.json');
    for (const it of plan[unit]) for (const [c] of rambamChaptersFull(it, idx[it.name])) f.push(`rambam/${idx[it.name].slug}/${c}.json`);
  }
  if (unit === 'mitzvot') plan.mitzvot.items.forEach(it => f.push(...shmFile(it)));
  if (unit === 'tolt') { f.push('tolt/schedule.json'); plan.tolt.parts.forEach(([slug]) => f.push(`tolt/w/${slug}.json`)); }
  if (unit === 'ravyomi') { f.push('ravyomi/schedule.json'); (await ravLesson(plan)).simanim.forEach(n => f.push(`ravyomi/s/${n}.json`)); }
  return [...new Set(f)];
}
async function mitzvotDoc(plan) {
  const blocks = [];
  for (const it of plan.mitzvot.items) {
    blocks.push({ type: 'h', text: mitzvotLabel(it) });
    if (it.k === 'P' || it.k === 'N' || it.k === 'intro') {
      const d = await data(shmFile(it)[0]);
      d.s.forEach((t, i) => blocks.push({ type: 'p', id: `${it.k}${it.n || ''}.${i + 1}`, text: t, src: 'mitzvot' }));
    } else if (it.k === 'S') {
      for (let n = it.from; n <= it.to; n++) {
        const d = await data(`mitzvot/S/${n}.json`);
        if (it.to > it.from) blocks.push({ type: 'h', text: `השורש ה${['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני', 'תשיעי', 'עשירי', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר'][n]}` });
        d.s.forEach((t, i) => blocks.push({ type: 'p', id: `S${n}.${i + 1}`, text: t, src: 'mitzvot' }));
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
      for (let v = a; v <= b; v++) blocks.push({ type: 'v', id: `${ch}:${v}`, ref: `${c.book} ${ch}:${v}`, num: gem(v), text: d.v[v - 1], sub: (d.r && d.r[v - 1]) || [], src: 'tanakh' });
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
async function tanyaDoc(plan) {
  const index = await data('tanya/index.json');
  const blocks = [];
  for (const [k, c, a, b] of await tanyaPositions(plan)) {
    const d = await data(`tanya/${k}/${c}.json`);
    const multi = index[k].depth === 2 && index[k].chapters.length > 1;
    blocks.push({ type: 'h', text: index[k].he + (multi ? ` – ${k === 'IK' ? 'אגרת' : 'פרק'} ${gem(c)}` : '') + (a > 1 ? ' (המשך)' : '') });
    for (let s = a; s <= Math.min(b, d.s.length); s++) blocks.push({ type: 'p', id: `${k}.${c}.${s}`, text: d.s[s - 1], src: 'tanya' });
  }
  const first = blocks.find(b => b.type === 'h');
  return { title: 'תניא יומי', subtitle: first ? first.text.replace(' (המשך)', '') : '', blocks };
}
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
      const d = await data(`rambam/${meta.slug}/${c}.json`);
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
        blocks.push({ type: 'p', id, num: gem(s), text, src: 'rambam', srcName: it.name, ...(applied.length ? { fixed: applied.length } : {}) });
      }
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
    paras.forEach((p, i) => blocks.push({ type: 'p', id: `${slug}.${day}.${i + 1}`, text: p.t, src: 'tolt' }));
    if (e.until) blocks.push({ type: 'note', text: `לפי הלוח השיעור מסתיים ${e.until.daf === 'תום' || e.until === 'תום' ? 'בסוף הדרוש' : e.until === 'סוף הפרשה' ? 'בסוף הפרשה' : `בדף ${gem(e.until.daf)}/${e.until.amud}`}.` });
  }
  blocks.push({ type: 'note', text: 'חלוקת השיעורים: ', links: LUACH_LINKS, tail: '. הטקסט: הוצאת קה״ת דרך ספריא (CC BY-NC), בלי ניקוד. בסוגריים המרובעים – מספרי הדפים והעמודים במהדורה (א–ד).' });
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
    for (let se = a; se <= b; se++) sm.s[se - 1].forEach((t, k) => blocks.push({ type: 'p', id: `${n}.${se}.${k + 1}`, text: k ? t : `<b>${gem(se)}</b> ${t}`, src: 'ravyomi' }));
  }
  if (word(d.t) && d.t[3] !== 1) blocks.push({ type: 'note', text: `לפי הלוח, השיעור מסתיים באמצע סעיף ${gem(d.t[1])}, במילים ״${d.t[2]}״. ההמשך נלמד מחר.` });
  blocks.push(credit);
  return { title: UNITS.ravyomi.full, subtitle: ravLabel(d), blocks, raw: true };
}
export function buildDoc(plan, unit) {
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
  if (unit === 'tehillim') return plan.tehillim.title;
  if (unit === 'tanya') { const d = await tanyaDoc(plan); return d.blocks.find(b => b.type === 'h')?.text || d.subtitle; }  // with "(המשך)" like the reader (round 4)
  if (unit === 'mitzvot') return plan.mitzvot.items.map(mitzvotLabel).join(' · ');
  if (unit === 'tolt') return (await toltLessons(plan)).map(({ e }) => toltLabel(e)).join(' · ');
  if (unit === 'ravyomi') { const { d } = await ravLesson(plan); return d ? ravLabel(d) : 'אין שיעור בלוח לתאריך זה'; }
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
export async function buildSiddurDoc(book, n, { english = true } = {}) {
  const idx = await siddurIndex(), b = idx.books.find(x => x.id === book);
  if (!b || !b.secs[n - 1]) throw new Error('siddur section not found');
  const sec = await data(`siddur/${book}/${n}.json`);
  const blocks = [];
  sec.b.forEach(([t, h], i) => {
    if (t === 'h') blocks.push({ type: 'h', id: `${book}-${n}-${i}`, text: inlineOnly(h).replace(/<[^>]*>/g, '') });
    else if (t === 'n') { if (english) blocks.push({ type: 'note', id: `${book}-${n}-${i}`, html: inlineOnly(h), lang: 'en' }); }
    else blocks.push({ type: 'p', id: `${book}-${n}-${i}`, text: inlineOnly(h) });
  });
  return { title: sec.he, subtitle: b.he + (sec.en ? ` · ${sec.en}` : ''), blocks, book: 'Siddur', siddur: { book, n } };
}
