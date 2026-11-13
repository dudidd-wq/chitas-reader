// The library (#/lib/…): every text in site/data as a browsable tree – book → (part) → chapter – opened in the
// SAME reader as the daily lessons (app.js openReader with R.lib). Each chapter is built by the daily-lesson builders
// of texts.js with a synthetic one-chapter "plan", so its blocks, ids, credits, notes and glossary are identical to
// the daily reader (and to the search index, tools/build-search.mjs, which uses this module too).
// Pure module (no DOM): also imported by Node (tools/build-search.mjs, tests).
import { gem, BOOK_HE, TANYA_ORDER, TOLT_SLUGS, mitzvotLabel, tehillim as tehillimOfDay, HDate } from './calendar.js';
import { data, buildDoc, ravSimanDoc, toltLabel, UNITS, HAYOM_MONTHS, gemaraFiles } from './texts.js';

export const FAMILIES = [
  { id: 'torah', he: 'חומש', desc: 'חמשת חומשי תורה עם פירוש רש״י, לפי פרקים', unit: 'chumash' },
  { id: 'tehillim', he: 'תהילים', desc: '150 המזמורים, וגם החלוקה לימי החודש ולימי השבוע', unit: 'tehillim' },
  { id: 'tanya', he: 'תניא', desc: 'ליקוטי אמרים, שער היחוד והאמונה, אגרת התשובה, אגרת הקודש וקונטרס אחרון', unit: 'tanya' },
  { id: 'rambam', he: 'רמב״ם – משנה תורה', desc: 'ארבעה עשר הספרים, לפי הלכות ופרקים', unit: 'rambam3' },
  { id: 'mitzvot', he: 'ספר המצוות', desc: 'הקדמה, שורשים, מצוות עשה ולא תעשה', unit: 'mitzvot' },
  { id: 'tolt', he: 'תורה אור ולקוטי תורה', desc: 'לפי פרשות השבוע ושיעורי היום של לוח ״מורה שיעור״', unit: 'tolt' },
  { id: 'hayomyom', he: 'היום יום', desc: 'לוח הרבי – רשומה לכל יום בשנה (לפי לוח תש״ג)', unit: 'hayomyom' },
  { id: 'rav', he: 'שולחן ערוך אדמו״ר הזקן', desc: 'אורח חיים – הסימנים שבלוח ״רב יומי״', unit: 'ravyomi' },
  // 1.0.97: the whole Shas – not in the search index (tools/build-search.mjs skips noSearch), loaded per amud / daf / chapter
  { id: 'bavli', he: 'תלמוד בבלי', desc: 'כל הש״ס – גמרא מנוקדת עם ביאור שטיינזלץ, לפי סדרים, מסכתות ועמודים', unit: 'shasBavli', noSearch: true },
  { id: 'yerushalmi', he: 'תלמוד ירושלמי', desc: 'מהדורת וילנא, מנוקד, עם פירוש פני משה – לפי סדרים, מסכתות ודפים', unit: 'shasYer', noSearch: true },
  { id: 'mishnah', he: 'משנה', desc: 'ששה סדרי משנה עם פירוש ברטנורא – לפי סדרים, מסכתות ופרקים', unit: 'shasMishna', noSearch: true },
  { id: 'siddur', he: 'סידור', desc: 'נוסח האריז״ל כמנהג חב״ד – תוכן הסידור והחיפוש בו', href: '#/siddur' },
];
// Mishneh Torah: the 14 books (by position in rambam/index.json, which is in canonical order)
const RAMBAM_BOOKS = [['הקדמה ומניין המצוות', 0, 3], ['ספר המדע', 4, 8], ['ספר אהבה', 9, 15], ['ספר זמנים', 16, 25], ['ספר נשים', 26, 30],
  ['ספר קדושה', 31, 33], ['ספר הפלאה', 34, 37], ['ספר זרעים', 38, 44], ['ספר עבודה', 45, 53], ['ספר קרבנות', 54, 59], ['ספר טהרה', 60, 67],
  ['ספר נזיקין', 68, 72], ['ספר קנין', 73, 77], ['ספר משפטים', 78, 82], ['ספר שופטים', 83, 87]];
export const RAMBAM_SEFER = RAMBAM_BOOKS.map(([he, a, b]) => ({ he, a, b }));
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const TEH_WEEK = [[1, 29], [30, 50], [51, 72], [73, 89], [90, 106], [107, 119], [120, 150]]; // the weekly division (as printed in Tehillim Ohel Yosef Yitzchak)
const TOLT_BOOKS = [['בראשית', 0, 11], ['שמות', 12, 22], ['ויקרא', 23, 32], ['במדבר', 33, 42], ['דברים', 43, 53]];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ---- tree ----
// node: { id, he, kids?, group?, leaf?, href? } – a leaf carries what is needed to build its document:
// { unit, plan | make(), label (full name), seq (prev/next run) }. Groups are inline headings (no page of their own).
const trees = new Map();
async function build(fam) {
  const leaf = (id, he, label, unit, plan, seq = fam, extra = {}) => ({ id, he, label, leaf: true, unit, plan, seq, ...extra });
  if (fam === 'torah') {
    const idx = await data('torah/index.json');
    return { kids: Object.keys(idx).map(b => ({ id: `torah/${b}`, he: BOOK_HE[b] || b, kids: idx[b].map((nv, i) => leaf(`torah/${b}/${i + 1}`, `פרק ${gem(i + 1)}`, `${BOOK_HE[b]} פרק ${gem(i + 1)}`, 'chumash',
      { chumash: { parts: [{ book: b, bookHe: BOOK_HE[b], from: { c: i + 1, v: 1 }, to: { c: i + 1, v: nv } }], book: b, title: '' } })) })) };
  }
  if (fam === 'tehillim') {
    const month = range(1, 30).map(d => { const t = tehillimOfDay(new HDate(d, 7, 5787)); return leaf(`tehillim/m/${d}`, `יום ${gem(d)}`, `תהילים ליום ${gem(d)} בחודש (${t.title.replace(/^תהילים /, '')})`, 'tehillim', { tehillim: t }, 'tehillim/m'); });
    const week = TEH_WEEK.map(([a, b], i) => leaf(`tehillim/w/${i + 1}`, `יום ${DAYS[i]}`, `תהילים ליום ${DAYS[i]} (${gem(a)}–${gem(b)})`, 'tehillim', { tehillim: { parts: range(a, b).map(c => ({ c })) } }, 'tehillim/w'));
    return { kids: [
      { group: true, he: 'המזמורים', kids: range(1, 150).map(c => leaf(`tehillim/${c}`, gem(c), `תהילים ${gem(c)}`, 'tehillim', { tehillim: { parts: [{ c }] } }, 'tehillim/c')) },
      { group: true, he: 'חלוקה לימי החודש', kids: month },
      { group: true, he: 'חלוקה לימי השבוע', kids: week }] };
  }
  if (fam === 'tanya') {
    const idx = await data('tanya/index.json');
    return { kids: TANYA_ORDER.filter(k => idx[k]).map(k => {
      const m = idx[k], n = m.chapters.length, word = k === 'IK' ? 'אגרת' : k === 'LA-approbation' ? 'הסכמה' : 'פרק';
      const mk = c => ({ positions: [[k, c, 1, m.chapters[c - 1]]] });
      if (n === 1 && m.depth === 1) return leaf(`tanya/${k}/1`, m.he, m.he, 'tanya', mk(1));
      return { id: `tanya/${k}`, he: m.he, kids: range(1, n).map(c => leaf(`tanya/${k}/${c}`, `${n > 1 ? word : 'חלק'} ${gem(c)}`, n > 1 ? `${m.he} – ${word} ${gem(c)}` : `${m.he} ${gem(c)}`, 'tanya', mk(c))) };
    }) };
  }
  if (fam === 'rambam') {
    const idx = await data('rambam/index.json'), names = Object.keys(idx);
    const hil = name => { const m = idx[name];
      if (m.depth === 1) return leaf(`rambam/${m.slug}/1`, m.he, m.he, 'rambam3', { rambam3: [{ name, c: 1 }] });
      return { id: `rambam/${m.slug}`, he: m.he, kids: m.chapters.map((_, i) => leaf(`rambam/${m.slug}/${i + 1}`, `פרק ${gem(i + 1)}`, `${m.he} פרק ${gem(i + 1)}`, 'rambam3', { rambam3: [{ name, c: i + 1 }] })) }; };
    return { kids: RAMBAM_BOOKS.map(([he, a, b]) => ({ group: true, he, kids: names.slice(a, b + 1).map(hil) })) };
  }
  if (fam === 'mitzvot') {
    const idx = await data('mitzvot/index.json');
    const it = (k, n) => k === 'S' ? { k, from: n, to: n } : { k, n };
    const part = (k, he, word) => ({ id: `mitzvot/${k}`, he, kids: range(1, idx[k]).map(n => leaf(`mitzvot/${k}/${n}`, `${word} ${gem(n)}`, mitzvotLabel(it(k, n)), 'mitzvot', { mitzvot: { items: [it(k, n)] } })) });
    return { kids: [leaf('mitzvot/intro', 'הקדמת הרמב״ם', mitzvotLabel({ k: 'intro' }), 'mitzvot', { mitzvot: { items: [{ k: 'intro' }] } }),
      part('S', 'השורשים', 'שורש'), part('P', 'מצוות עשה', 'עשה'), part('N', 'מצוות לא תעשה', 'לא תעשה')] };
  }
  if (fam === 'tolt') {
    const S = await data('tolt/schedule.json');
    const week = slug => { const w = S.weeks[slug], he = w.title.split(' · ').slice(0, 2).join(' · ');
      return { id: `tolt/${slug}`, he, kids: w.days.map((e, i) => leaf(`tolt/${slug}/${i + 1}`, `יום ${DAYS[i]} – ${toltLabel(e)}`, `${he}, יום ${DAYS[i]}`, 'tolt', { tolt: { parts: [[slug, i + 1]] } })) }; };
    return { kids: TOLT_BOOKS.map(([he, a, b]) => ({ group: true, he: `חומש ${he}`, kids: TOLT_SLUGS.slice(a, b + 1).filter(s => S.weeks[s]).map(week) })) };
  }
  if (fam === 'hayomyom') {
    const D = await data('hayomyom/days.json');
    return { kids: HAYOM_MONTHS.map(([mk, he, n]) => ({ id: `hayomyom/${mk}`, he, kids: Array.from({ length: n }, (_, i) => `${mk}-${i + 1}`).filter(k => D[k]).map(k => leaf(`hayomyom/${k}`, D[k].ref, `היום יום ${D[k].ref}`, 'hayomyom', { hayom: k })) })) };
  }
  if (fam === 'rav') {
    const S = await data('ravyomi/schedule.json');
    return { kids: S.simanim.map(n => leaf(`rav/${n}`, `סימן ${gem(n)}`, `שולחן ערוך הרב, אורח חיים סימן ${gem(n)}`, 'ravyomi', null, 'rav', { siman: n })) };
  }
  if (fam === 'bavli' || fam === 'yerushalmi' || fam === 'mishnah') {
    const idx = await data('gemara/index.json'), SED = Object.keys(idx.seder);
    const bySeder = (list, mk) => SED.map(sd => ({ group: true, he: `סדר ${idx.seder[sd]}`, kids: list.filter(x => x.seder === sd).map(mk) })).filter(g => g.kids.length);
    const amudHe = a => `${gem(parseInt(a))} ${a.endsWith('a') ? 'א' : 'ב'}`;
    if (fam === 'bavli') return { kids: bySeder(idx.bavli, b => ({ id: `bavli/${b.t}`, he: b.he, kids: b.a.map(a => leaf(`bavli/${b.t}/${a}`, amudHe(a), `${b.he} ${amudHe(a)}`, 'shasBavli', { gem: { kind: 'bavli', t: b.t, amudim: [a] } })) })) };
    if (fam === 'yerushalmi') return { kids: bySeder(idx.yer, y => ({ id: `yerushalmi/${y.t}`, he: y.he, kids: range(1, y.n).filter(d => !y.missing.includes(d)).map(d => leaf(`yerushalmi/${y.t}/${d}`, `דף ${gem(d)}`, `ירושלמי ${y.he} דף ${gem(d)}`, 'shasYer', { gem: { kind: 'yer', t: y.t, daf: d } })) })) };
    return { kids: bySeder(idx.mishna, m => ({ id: `mishnah/${m.t}`, he: m.he, kids: m.ch.map((n, i) => n && leaf(`mishnah/${m.t}/${i + 1}`, `פרק ${gem(i + 1)}`, `משנה ${m.he} פרק ${gem(i + 1)}`, 'shasMishna',
      { gem: { kind: 'mishna', chapter: true, items: range(1, n).map(k => ({ t: m.t, c: i + 1, m: k })) } })).filter(Boolean) })) };
  }
  throw new Error('unknown family ' + fam);
}
/** The tree of one family, with every node indexed by id and the leaves in reading order. */
export async function family(fam) {
  if (!trees.has(fam)) trees.set(fam, (async () => {
    const F = FAMILIES.find(f => f.id === fam); if (!F || F.href) throw new Error('unknown family ' + fam);
    const root = { id: fam, he: F.he, ...(await build(fam)) }, byId = new Map(), leaves = [];
    const walk = (n, parent) => {
      if (n.id) { n.parent = parent; byId.set(n.id, n); }
      if (n.leaf) leaves.push(n);
      for (const k of n.kids || []) walk(k, n.id ? n : parent);
    };
    walk(root, null);
    return { root, byId, leaves };
  })().catch(e => { trees.delete(fam); throw e; }));
  return trees.get(fam);
}
/** Look up a library path ("torah/Genesis/1"). → { node, fam, crumbs:[{he, id}], prev, next } or null */
export async function libNode(path) {
  const fam = String(path).split('/')[0];
  if (!FAMILIES.some(f => f.id === fam && !f.href)) return null;
  const T = await family(fam), node = T.byId.get(path);
  if (!node) return null;
  const crumbs = []; for (let n = node.parent; n; n = n.parent) crumbs.unshift({ he: n.he, id: n.id });
  let prev = null, next = null;
  if (node.leaf) { const run = T.leaves.filter(l => l.seq === node.seq), i = run.indexOf(node); prev = run[i - 1] || null; next = run[i + 1] || null; }
  return { node, fam, crumbs, prev, next };
}
/** The reader document of one library chapter (same builders as the daily lessons). */
export async function libDoc(path) {
  const r = await libNode(path);
  if (!r?.node.leaf) throw new Error('not a library chapter: ' + path);
  const n = r.node, F = FAMILIES.find(f => f.id === r.fam);
  const doc = n.siman ? await ravSimanDoc(n.siman) : await buildDoc(n.plan, n.unit);
  doc.title = F.he; doc.subtitle = n.label;
  return { doc, unit: n.unit, ...r };
}
/** Files a chapter needs (offline "save this book"). */
export async function libFiles(path) {
  const r = await libNode(path); if (!r) return [];
  const leaves = r.node.leaf ? [r.node] : (await family(r.fam)).leaves.filter(l => isUnder(l, r.node));
  const f = new Set();
  for (const l of leaves) {
    const p = l.plan;
    if (l.unit === 'chumash') f.add(`torah/${p.chumash.book}/${p.chumash.parts[0].from.c}.json`);
    if (l.unit === 'tehillim') p.tehillim.parts.forEach(x => f.add(`tehillim/${x.c}.json`));
    if (l.unit === 'tanya') { const [k, c] = p.positions[0]; f.add(`tanya/${k}/${c}.json`); if (['LA-foreword', 'LA', 'SY-chinukh', 'SY'].includes(k)) f.add(`notes/tanya/${k}.json`); }
    if (l.unit === 'rambam3') { const idx = await data('rambam/index.json'), it = p.rambam3[0]; f.add(`rambam/${idx[it.name].slug}/${it.c}.json`); }
    if (l.unit === 'mitzvot') { const it = p.mitzvot.items[0]; f.add(it.k === 'intro' ? 'mitzvot/intro.json' : `mitzvot/${it.k}/${it.n || it.from}.json`); }
    if (l.unit === 'tolt') { const [s] = p.tolt.parts[0]; f.add('tolt/schedule.json'); f.add(`tolt/w/${s}.json`); f.add(`notes/tolt/${s}.json`); }
    if (l.siman) f.add(`ravyomi/s/${l.siman}.json`);
    if (l.unit === 'hayomyom') f.add('hayomyom/days.json');
    if (p?.gem) { const idx = await data('gemara/index.json'); f.add('gemara/index.json'); gemaraFiles(p.gem, idx).forEach(x => f.add(x)); }
  }
  return [...f];
}
const isUnder = (n, anc) => { for (let x = n; x; x = x.parent) if (x === anc) return true; return false; };
export const libUnitHe = u => UNITS[u]?.he || '';
