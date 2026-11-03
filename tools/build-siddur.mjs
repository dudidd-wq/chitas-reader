// Build-time siddur builder: the Open Siddur Project transcription of the weekday, Shabbat and festival prayers in
// Nusach Ha-Ari / Chabad by Shmuel Gonzales (transcriptions CC0 1.0, instructions CC BY 4.0 – stated in every file).
// Source files: https://opensiddur.org/?p=1260 (the site blocks scripted downloads, so they are read from the
// Internet Archive copy of the same URLs; the sha256 of every file is recorded in sources.json).
// Usage: node tools/build-siddur.mjs [--src <dir with the downloaded .txt/.odt>]
// Writes site/data/siddur/index.json and site/data/siddur/<book>/<n>.json. Never runs in the browser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fullName } from '../site/js/divine.js';
import { applySiddurHebrew } from './siddur-he.mjs';

const OUT = 'site/data/siddur';
const BASE = 'https://opensiddur.org/wp-content/uploads/2010/08/';
const ARCHIVE = 'https://web.archive.org/web/2025id_/';
const POST = 'https://opensiddur.org/compilations/liturgical/siddurim/kol-bo/siddur-torah-or-nusah-haari-zl/';
const N = s => `${s}-Nusaḥ-Ha-Ari-ḤaBaD`;
// [id, file stem, Hebrew title, group, format] – the order of the table of contents
export const BOOKS = [
  ['boker', N('The-Morning-Blessings'), 'השכמת הבוקר, ברכות השחר וקרבנות', 'weekday'],
  ['shacharit', N('Shaḥarit-Morning'), 'שחרית לחול', 'weekday'],
  ['mincha', N('Minḥah-Afternoon'), 'מנחה לחול', 'weekday'],
  ['maariv', N('Maariv-Evening'), 'מעריב לחול ולמוצאי שבת', 'weekday'],
  ['shema', N('The-Bedtime-Shema'), 'קריאת שמע שעל המיטה', 'weekday'],
  ['chatzot', N('Tikkun-Ḥatzot'), 'תיקון חצות', 'weekday'],
  ['brachot', N('The-Blessing-Book'), 'ברכות הנהנין, ברכת המזון ושבע ברכות', 'brachot'],
  ['derech', N('Prayer-for-Travelers'), 'תפילת הדרך', 'brachot'],
  ['kabbalat', N('Kabbalat-Shabbat'), 'מנחה לערב שבת, קבלת שבת ומעריב לשבת', 'shabbat'],
  ['shabbatbook', N('The-Shabbat-Book'), 'הדלקת נרות, קידוש, סעודות שבת והבדלה', 'shabbat', 'odt'],
  ['shabbat', N('Shaḥarit-Musaf-Shabbat'), 'שחרית ומוסף לשבת', 'shabbat'],
  ['minchashabbat', N('Minḥah-Shabbat-Afternoon'), 'מנחה לשבת', 'shabbat'],
  ['rc', N('Hallel-Musaf-Rosh-Ḥodesh'), 'הלל ומוסף לראש חודש', 'moadim'],
  ['regalim', N('Shelosh-Regalim'), 'שלוש רגלים – קידוש, עמידה, יזכור ומוסף', 'moadim'],
  ['sukkot', N('Ḥag-Sukkot'), 'סוכות – הושענות והקפות', 'moadim'],
  ['chanukah', N('Ḥanukkah-Blessings'), 'חנוכה – הדלקת הנרות', 'moadim', 'odt'],
  ['purim', N('Megillat-Esther-Blessings'), 'פורים – ברכות קריאת המגילה', 'moadim'],
  ['omer', N('Sefirat-HaOmer'), 'ספירת העומר', 'moadim'],
  ['levana', N('Kiddush-Levana'), 'קידוש לבנה', 'moadim'],
];
export const GROUPS = { weekday: 'תפילות היום', brachot: 'ברכות', shabbat: 'שבת', moadim: 'ראש חודש, מועדים וזמנים' };
// Parts of a complete Chabad siddur for which no free-licence Chabad-nusach text was found (shown in the TOC as missing)
export const MISSING = [
  ['ראש השנה ויום כיפור (תפילות הימים הנוראים, מוסף, נעילה, כל נדרי)', 'לא נמצא נוסח חב״ד חופשי: מחזורי חב״ד המודפסים מוגנים בזכויות יוצרים, וב-Open Siddur ובוויקיטקסט אין להם תעתיק בנוסח זה.'],
  ['סליחות, כפרות, תשליך והתרת נדרים', 'לא נמצא נוסח חב״ד ברישיון חופשי.'],
  ['פרקי אבות', 'אינו כלול בתעתיק של Open Siddur (טקסט המשנה עצמו זמין במקורות אחרים, אך לא שולב כאן).'],
  ['תשעה באב (קינות) ותעניות (עננו, סליחות)', 'לא נמצא נוסח חב״ד ברישיון חופשי; ״עננו״ מופיע בתוך שמונה עשרה לפי התעתיק.'],
  ['טקסט מגילת אסתר עצמו', 'התעתיק כולל רק את הברכות שלפני הקריאה ואחריה.'],
];

// spelling slips in some section titles of the transcription (titles only; the prayer text is never changed)
const TITLE_FIX = [[/אמידה/g, 'עמידה'], [/התור$/g, 'התורה'], [/התור /g, 'התורה '], [/סעורת/g, 'סעודת'], [/בירכת/g, 'ברכת'], [/קרבנ /g, 'קרבן '], [/מיל$/g, 'מילה'], [/ברכת אחרונות/g, 'ברכות אחרונות']];
// Transcription slips in the source text, found by the cross-check in tools/verify-siddur.mjs (second source: Siddur
// Sefard / Metsudah) and confirmed by the same transcriber's own text elsewhere. [wrong, right, times expected, why]
export const USED = new Map();
export const TEXT_FIX = [
  ['וּמֵאַהֲרֵינוּ', 'וּמֵאַחֲרֵינוּ', 1, 'השכיבנו במעריב: ה׳ במקום ח׳ (כך בקריאת שמע שעל המיטה של אותו מתעתיק)'],
  ['אוֹיֵב דֶּבֶר, וְרָעָב', 'אוֹיֵב דֶּבֶר, וְחֶרֶב, וְרָעָב', 1, 'השכיבנו במעריב: חסרה המילה „וחרב” (קיימת בקריאת שמע שעל המיטה ובמקור השני)'],
  ['עֲקֵדַת יָהִד', 'עֲקֵדַת יָחִיד', 1, 'והוא רחום של שני וחמישי: ה׳ במקום ח׳'],
  ['וְנִפְלָוֹת עַד אֵין מִסְפָר', 'וְנִפְלָאוֹת עַד אֵין מִסְפָּר', 2, 'אמת ואמונה (חול ושבת): חסרה א׳'],
];
const fixText = (t, file, used) => TEXT_FIX.reduce((a, f) => { const n = a.split(f[0]).length - 1; if (n) used.set(f, (used.get(f) || 0) + n); return a.split(f[0]).join(f[1]); }, t);
const fixTitle = s => TITLE_FIX.reduce((a, [re, to]) => a.replace(re, to), s);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
async function getFile(src, name) {
  const local = src && path.join(src, name);
  if (local && fs.existsSync(local)) return fs.readFileSync(local);
  const url = ARCHIVE + BASE + encodeURI(name);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'chitas-reader-build/1.0 (static open-source study app)' } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    await new Promise(res => setTimeout(res, 5000 * (i + 1)));
  }
  throw new Error('download failed: ' + name);
}
// The Shabbat Book's zemirot are printed in two columns (ODT tables). Stripping the tags read them cell after cell,
// i.e. the left column first in the left-to-right tables ("lr-tb") – "אסדר לסעודתא" began with its 6th stanza.
// Each table is listed here with its reading order (paragraph lists [cell, paragraph]); a new or changed table fails
// the build instead of being guessed. The order follows the acrostic (אני יצחק לוריא בן שלמה; אני יצחק לוריא) and
// he.wikisource "אזמר בשבחין" / "אסדר לסעודתא" – see verification/SIDDUR-TABLES.md.
const range = (c, a, b) => Array.from({ length: b - a + 1 }, (_, i) => [c, a + i]);
export const ODT_TABLES = {
  'The-Shabbat-Book': {
    Table1: { order: 'cells' }, // Kiddush alternatives (bread / wine) – right-to-left table, cell 1 is the right one
    Table2: { order: 'cells' }, // the same, for the day Kiddush
    // Azamer Bishvachin: 20 stanzas, 10 per column; neither column order gives the acrostic, the stanza list does
    Table3: { order: [...range(2, 0, 3), ...range(1, 0, 3), [2, 8], [2, 9], ...range(2, 4, 7), ...range(1, 4, 9)],
      first: 'אזמר נזמין ימינא יחבק צוחין חדו קריבו למעבד ועטורין רשימין יהא אסדר בחמרא נעביד שכינתא שביתין למבצע משח הלא אתעטרא' },
    Table4: { order: [...range(2, 0, 4), ...range(1, 0, 4)], first: 'אסדר נהורה ישדר יגלה צרורא חדו קדם לעטר ואלין רבו' }, // lr-tb: the right cell first
    Table5: { order: 'cells', first: 'בני יהון צבו חדו קריבו לבר והא רעו ישוי ארי' }, // rl-tb: already in reading order
  },
};
function odtTables(x, stem) {
  const conf = ODT_TABLES[stem] || {}, seen = [];
  x = x.replace(/<table:table [^>]*table:name="([^"]+)"[^>]*>[\s\S]*?<\/table:table>/g, (t, name) => {
    const c = conf[name]; if (!c) throw new Error(`${stem}: ODT table ${name} has no reading order in ODT_TABLES`);
    seen.push(name);
    const cells = [...t.matchAll(/<table:table-cell\b[\s\S]*?<\/table:table-cell>/g)].map(m => [...m[0].matchAll(/<text:(p|h)\b[^>]*?(?:\/>|>[\s\S]*?<\/text:\1>)/g)].map(p => p[0]));
    const paras = c.order === 'cells' ? cells.flat() : c.order.map(([ci, pi]) => { const p = cells[ci - 1]?.[pi]; if (p == null) throw new Error(`${stem} ${name}: no paragraph ${ci}/${pi}`); return p; });
    if (c.order !== 'cells' && paras.length !== cells.flat().filter(p => p.replace(/<[^>]+>/g, '').trim()).length) throw new Error(`${stem} ${name}: the reading order does not cover every paragraph`);
    if (c.first) {
      const got = paras.map(p => p.replace(/<[^>]+>/g, '').replace(/[\u0591-\u05C7]/g, '').trim()).filter(Boolean).map(p => p.split(/[\s,]/)[0]).join(' ');
      if (got !== c.first) throw new Error(`${stem} ${name}: stanzas changed: ${got}`);
    }
    return paras.join('');
  });
  for (const n of Object.keys(conf)) if (!seen.includes(n)) throw new Error(`${stem}: ODT table ${n} not found`);
  return x;
}
function odtText(buf, stem) {
  const tmp = fs.mkdtempSync('/tmp/odt-'); const f = path.join(tmp, 'x.odt'); fs.writeFileSync(f, buf);
  let x = execFileSync('unzip', ['-p', f, 'content.xml']).toString('utf8');
  fs.rmSync(tmp, { recursive: true });
  x = odtTables(x, stem);
  x = x.replace(/<text:tab\/>/g, '\t').replace(/<text:s[^>]*\/>/g, ' ').replace(/<text:line-break\/>/g, '\n').replace(/<\/text:(p|h)>/g, '\n').replace(/<[^>]+>/g, '');
  return x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
/** Unicode clean-up: presentation forms (שׁ U+FB2A …) and the ligature ײ to plain letters; invisible marks removed. */
export const cleanUnicode = s => s.replace(/[\uFB1D-\uFB4F]/g, c => c.normalize('NFKD')).replace(/\u05F2/g, 'יי').replace(/\u05F0/g, 'וו').replace(/\u05F1/g, 'וי')
  .replace(/[\uFEFF\u200B-\u200F\u202A-\u202E\u00AD]/g, '').normalize('NFC');
const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEB = /[\u05D0-\u05EA]/g, LAT = /[A-Za-z]/g;
const cnt = (s, re) => (s.match(re) || []).length;

// MediaWiki tables ({| … |}). The transcription lays out responsive readings, the Divine Names next to Ana Bekoach and
// alternatives in columns, and the direction of the columns is not consistent from table to table (some cells list the
// response before the verse, the label after the text). Up to 1.0.60 every row was flattened in source order and two
// Hebrew cells with the same number of lines were glued with " · " – Ana Bekoach came out as "prayer · Names" in one
// spoken line. Now every table has an explicit reading decision (WIKI_TABLES, keyed by book, n = 1-based order in the
// file); a table that is not listed fails the build, so a changed source is looked at instead of guessed.
//   flat  – rows in order, each row's cells in source order (already the reading order)
//   rev   – each row's cells in reverse order (the label/instruction first, then the text)
//   names – a real table: the prayer (spoken) | the Divine Names formed by its acronyms (shown, never read aloud)
//   resp  – a real table of responsive verses: label | verse | response, each row reversed from the source
//   amen  – the "Do not respond / אָמֵן" cell becomes one instruction (the אָמֵן is not a line of prayer to be said)
export const WIKI_TABLES = {
  rc: ['flat', 'resp', 'flat', 'flat', 'flat', 'flat', 'flat', 'flat', 'flat', 'flat', 'rev', 'flat', 'rev', 'flat'],
  kabbalat: ['names', 'flat', 'flat', 'flat', 'flat'],
  levana: ['flat', 'flat', 'flat'],
  shacharit: ['flat', 'rev', 'flat', 'flat', 'flat'],
  shema: ['rev', 'names', 'flat', 'flat', 'flat', 'flat', 'flat', 'flat'],
  boker: ['amen', 'flat', 'names'],
};
const TABLE = '\u0000T';
function tables(lines, book) {
  const out = []; let inT = false, row = [], rows = [], cell = null, n = 0;
  const endCell = () => { if (cell) row.push(cell.map(x => x.trim()).filter(Boolean)); cell = null; };
  const endRow = () => { endCell(); if (row.some(c => c.length)) rows.push(row); row = []; };
  const endTable = () => {
    endRow(); n++;
    const how = WIKI_TABLES[book]?.[n - 1];
    if (!how) throw new Error(`${book}: wiki table #${n} has no reading decision in WIKI_TABLES`);
    if (how === 'flat') for (const r of rows) for (const c of r) out.push(...c);
    else if (how === 'rev') for (const r of rows) for (const c of [...r].reverse()) out.push(...c);
    else if (how === 'amen') {
      const [text, empty, amen] = rows.length === 1 && rows[0].length === 3 ? rows[0] : [];
      if (!text || empty.length || amen.join(' ') !== "''Do not respond'' אָמֵן") throw new Error(`${book}#${n}: amen table changed: ${JSON.stringify(rows)}`);
      out.push(...text, "''Do not respond'' אָמֵן");
    } else if (how === 'names') {
      const [pr, nm] = rows.length === 1 && rows[0].length === 2 ? rows[0] : [];
      if (!pr || pr.length !== 7 || nm.length !== 7) throw new Error(`${book}#${n}: Ana Bekoach table changed`);
      out.push(TABLE + JSON.stringify({ cls: 'names', rows: pr.map((x, i) => [['p', x], ['x', nm[i]]]) }));
    } else if (how === 'resp') {
      if (!rows.every(r => r.length === 3 && r[0].length === 1 && r[1].length === 1)) throw new Error(`${book}#${n}: responsive table changed`);
      out.push(TABLE + JSON.stringify({ cls: 'resp', rows: rows.map(([resp, verse, label]) => [label.length ? ['n', label.join(' ')] : ['', ''], ['p', verse[0]], ['p', resp[0]]]) }));
    } else throw new Error('unknown table decision ' + how);
    rows = [];
  };
  for (const l of lines) {
    if (/^\s*\{\|/.test(l)) { inT = true; continue; }
    if (!inT) { out.push(l); continue; }
    if (/^\s*\|\}/.test(l)) { endTable(); inT = false; continue; }
    if (/^\s*\|-/.test(l)) { endRow(); continue; }
    if (/^\s*\|/.test(l)) { endCell(); cell = [l.replace(/^\s*\|\|?\s*(style="[^"]*"\s*\|)?\s*/, '')]; continue; }
    (cell ||= []).push(l);
  }
  if (inT) endTable();
  if ((WIKI_TABLES[book]?.length || 0) !== n) throw new Error(`${book}: ${n} wiki tables, WIKI_TABLES lists ${WIKI_TABLES[book]?.length || 0}`);
  return out;
}
const strip = h => String(h).replace(/<[^>]+>/g, '').replace(/[\u0591-\u05C7]/g, '').trim();
const ACRO = /^[א-ת]{2}"[א-ת] [א-ת]{2}"[א-ת]$/;
// Ana Bekoach outside a wiki table (Minchah, Shabbat Minchah, after the Omer): its seven lines, then the seven Names, as
// fourteen lines of "prayer" – the Names were read aloud. Seven prayer lines followed by seven acronym lines → a table.
export function anaBekoach(b) {
  let n = 0;
  for (let i = 0; i + 14 <= b.length; i++) {
    const s = b.slice(i, i + 14);
    if (!strip(s[0][1]).startsWith('אנא בכח') || !s.every(x => x[0] === 'p') || !s.slice(7).every(x => ACRO.test(strip(x[1]))) || s.slice(0, 7).some(x => ACRO.test(strip(x[1])))) continue;
    b.splice(i, 14, ['t', s.slice(0, 7).map((x, j) => [['p', x[1]], ['x', s[7 + j][1]]]), 'names']); n++;
  }
  return n;
}
// The Omer chart (Sefirat HaOmer): a header row (Day / Count / Sefirah) and 49 rows of six lines – the day, the count
// (the one thing said), its Sefirah, the word of Ana Bekoach, the word of Psalm 67 and its letter (to be mindful of,
// not said). The transcription has them as 297 separate lines; they become one table, only the count is spoken.
export function omerChart(b) {
  const i = b.findIndex((x, j) => x[0] === 'n' && x[1] === 'Day' && b[j + 1]?.[1] === 'Count' && b[j + 2]?.[1] === 'Sefirah');
  if (i < 0) return 0;
  const rows = [[['n', 'Day'], ['n', 'Count'], ['n', 'Sefirah']]];
  for (let d = 1; d <= 49; d++) {
    const r = b.slice(i + 3 + (d - 1) * 6, i + 3 + d * 6);
    if (r.length !== 6 || !r.every(x => x[0] === 'p') || r[0][1] !== String(d) || !strip(r[1][1]).startsWith('היום')) throw new Error(`Omer chart: day ${d} does not have the expected six lines`);
    rows.push([['x', r[0][1]], ['p', r[1][1]], ['x', r[2][1]], ['x', r[3][1]], ['x', r[4][1]], ['x', r[5][1]]]);
  }
  b.splice(i, 3 + 49 * 6, ['t', rows, 'omer']);
  return 1;
}
/** One source file → sections [{he, en, b:[[type, html]]}] */
export function parse(raw, book = '') {
  let t = fixText(cleanUnicode(raw).replace(/\r/g, ''), null, USED);
  // an English instruction run straight into the next Hebrew verse ("…when saying the second'''''עֵ'''ינֵי כֹל") – split them
  t = t.replace(/([a-z])'''''(?=[\u05D0-\u05EA][\u0591-\u05C7]*''')/g, "$1.''\n'''");
  t = t.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<references\s*\/>/g, '').replace(/\[\[Image:[^\]]*\]\]/g, '')
    .replace(/<\/?(nowiki|center|u)>/g, '').replace(/<div[^>]*>|<\/div>/g, '').replace(/<sup>[\s\S]*?<\/sup>/g, '');
  const lines = tables(t.split('\n'), book);
  let start = lines.findIndex(l => /^\s*Version\s+\d/.test(l.replace(/'/g, '')));
  start = start >= 0 ? start + 1 : lines.findIndex(l => /✶/.test(l));
  const secs = [];
  let cur = null;
  const push = (type, html, cls) => { if (!cur) { cur = { he: '', en: '', b: [] }; secs.push(cur); } cur.b.push(cls ? [type, html, cls] : [type, html]); };
  // one source line → [type, html, line] (null to skip it; '✶' a section title, 'h' a heading)
  const conv = l => {
    l = l.replace(/([ךםןףץ][\u0591-\u05C7]*)(יְיָ)/g, '$1 $2').replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
    // footnote numbers glued to the Hebrew text (":1") – the references themselves are dropped
    l = l.replace(/([\u05D0-\u05EA\u0591-\u05C7][:׃.,;!?"”)]*)\d+/g, '$1');
    if (!l || /^'*$/.test(l) || l === 'בס"ד') return null;
    let html = escH(l).replace(/'''(.*?)'''/g, '<b>$1</b>').replace(/''(.*?)''/g, '<i>$1</i>').replace(/'{2,}/g, '').replace(/<b>\s*<\/b>|<i>\s*<\/i>/g, ' ').replace(/\s+/g, ' ').trim();
    html = fullName(html).replace(/ \| /g, ' ׀ ');
    if (/✶/.test(l)) return ['✶', fixTitle(l.replace(/[✶'*]/g, '').replace(/\s+/g, ' ').trim()), l];
    if (/★/.test(l)) return ['h', fixTitle(html.replace(/★/g, '').replace(/<\/?[bi]>/g, '').trim()), l];
    const H = cnt(l, HEB), L = cnt(l, LAT), out = l.replace(/\([^)]*\)/g, '');
    // prayer text with an English aside in brackets ("עֹשֶׂה שָׁלוֹם (During the Ten Days … הַשָּׁלוֹם) בִּמְרוֹמָיו …") is text
    const textWithAside = cnt(out, HEB) > 3 * cnt(out, LAT) && cnt(out, HEB) >= 12;
    return [L > H && !textWithAside ? 'n' : 'p', html, l];
  };
  for (const line of lines.slice(start)) {
    if (/^\s*'*I am the original transcriber/.test(line)) break;
    if (line.startsWith(TABLE)) {
      // every cell keeps the kind its table decision gave it (p spoken, x shown only, n instruction, '' empty); the html
      // is the same conversion as for a line
      const T = JSON.parse(line.slice(TABLE.length));
      push('t', T.rows.map(r => r.map(([k, x]) => { if (!k) return ['', '']; const c = conv(x); if (!c) throw new Error('empty table cell: ' + x); return [k, c[1]]; })), T.cls);
      continue;
    }
    const c = conv(line); if (!c) continue;
    const [type, html, l] = c;
    if (type === '✶') { cur = { he: html, en: '', b: [] }; secs.push(cur); continue; }
    // the English line right under a section title is its subtitle
    if (type === 'n' && cur && !cur.en && !cur.b.length && l.length < 90) { cur.en = l.replace(/'/g, '').trim(); continue; }
    push(type, html);
  }
  for (const s of secs) { anaBekoach(s.b); omerChart(s.b); }
  return secs.filter(s => s.b.length);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const i = process.argv.indexOf('--src'), src = i > 0 ? process.argv[i + 1] : null;
  fs.rmSync(OUT, { recursive: true, force: true });
  const index = { books: [], groups: GROUPS, missing: MISSING.map(([he, why]) => ({ he, why })) };
  const files = {};
  for (const [id, stem, he, group, fmt = 'txt'] of BOOKS) {
    const name = `${stem}.${fmt}`, buf = await getFile(src, name);
    files[name] = { url: BASE + name, sha256: sha(buf) };
    const secs = parse(fmt === 'odt' ? odtText(buf, stem.replace(/-Nusa.*$/, '')) : buf.toString('utf8'), id);
    if (!secs.length) throw new Error('no sections: ' + name);
    fs.mkdirSync(`${OUT}/${id}`, { recursive: true });
    secs.forEach((s, n) => fs.writeFileSync(`${OUT}/${id}/${n + 1}.json`, JSON.stringify({ he: s.he || he, en: s.en, b: s.b })));
    index.books.push({ id, he, group, secs: secs.map(s => ({ he: s.he || he, en: s.en, h: s.b.filter(b => b[0] === 'h').map(b => b[1]), n: s.b.length })) });
    console.log(id, secs.length, secs.map(s => s.he).join(' | '));
  }
  for (const f of TEXT_FIX) if (USED.get(f) !== f[2]) throw new Error(`TEXT_FIX ${f[0]}: applied ${USED.get(f) || 0}×, expected ${f[2]}×`);
  index.fixes = TEXT_FIX.map(([from, to, , why]) => ({ from, to, why }));
  fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index));
  console.log('Hebrew instructions', applySiddurHebrew()); // round 7: tools/data/siddur-he.json
  const sp = 'site/data/sources.json', sources = JSON.parse(fs.readFileSync(sp, 'utf8'));
  sources.siddur = {
    versionTitle: 'Siddur Nusach Ha-Ari (Chabad), transcribed by Shmuel Gonzales – Open Siddur Project',
    versionTitleInHebrew: 'סידור נוסח האר״י (חב״ד), תעתיק שמואל גונזלס – Open Siddur Project',
    versionSource: POST, license: 'CC0', instructionsLicense: 'CC-BY',
    attribution: 'Contributors to the Open Siddur Project, including Shmueli Gonzales',
    retrieved: 'Internet Archive copy (web.archive.org) of the files at ' + BASE, files,
  };
  fs.writeFileSync(sp, JSON.stringify(sources, null, 2) + '\n');
}
