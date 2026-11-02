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
function odtText(buf) {
  const tmp = fs.mkdtempSync('/tmp/odt-'); const f = path.join(tmp, 'x.odt'); fs.writeFileSync(f, buf);
  let x = execFileSync('unzip', ['-p', f, 'content.xml']).toString('utf8');
  fs.rmSync(tmp, { recursive: true });
  x = x.replace(/<text:tab\/>/g, '\t').replace(/<text:s[^>]*\/>/g, ' ').replace(/<text:line-break\/>/g, '\n').replace(/<\/text:(p|h)>/g, '\n').replace(/<[^>]+>/g, '');
  return x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
/** Unicode clean-up: presentation forms (שׁ U+FB2A …) and the ligature ײ to plain letters; invisible marks removed. */
export const cleanUnicode = s => s.replace(/[\uFB1D-\uFB4F]/g, c => c.normalize('NFKD')).replace(/\u05F2/g, 'יי').replace(/\u05F0/g, 'וו').replace(/\u05F1/g, 'וי')
  .replace(/[\uFEFF\u200B-\u200F\u202A-\u202E\u00AD]/g, '').normalize('NFC');
const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEB = /[\u05D0-\u05EA]/g, LAT = /[A-Za-z]/g;
const cnt = (s, re) => (s.match(re) || []).length;

// MediaWiki tables ({| … |-  … |}) hold responsive readings laid out in columns from left to right: each row becomes
// one line in reading order (the Hebrew cells right-to-left), followed by its English instruction cells.
// Wiki tables → plain lines in reading order. A cell starts at a "|" line and runs until the next one; an RTL table's first
// cell is the right-most, i.e. the first to read, so cells keep their source order and each line of a cell stays a line.
// Two Hebrew cells with the same number of lines (Ana Bekoach and its acronyms) are paired line by line.
function tables(lines) {
  const out = []; let inT = false, row = [], cell = null;
  const endCell = () => { if (cell) { const c = cell.filter(x => x.trim()); if (c.length) row.push(c); } cell = null; };
  const flush = () => {
    endCell();
    const heb = c => c.every(x => cnt(x, HEB) >= cnt(x, LAT));
    if (row.length === 2 && row.every(heb) && row[0].length > 1 && row[0].length === row[1].length) out.push(...row[0].map((x, i) => `${x.trim()} · ${row[1][i].trim()}`));
    else for (const c of row) out.push(...c.map(x => x.trim()));
    row = [];
  };
  for (const l of lines) {
    if (/^\s*\{\|/.test(l)) { inT = true; continue; }
    if (!inT) { out.push(l); continue; }
    if (/^\s*\|\}/.test(l)) { flush(); inT = false; continue; }
    if (/^\s*\|-/.test(l)) { flush(); continue; }
    if (/^\s*\|/.test(l)) { endCell(); cell = [l.replace(/^\s*\|\|?\s*(style="[^"]*"\s*\|)?\s*/, '')]; continue; }
    (cell ||= []).push(l);
  }
  if (row.length || cell) flush();
  return out;
}
/** One source file → sections [{he, en, b:[[type, html]]}] */
export function parse(raw) {
  let t = cleanUnicode(raw).replace(/\r/g, '');
  t = t.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<references\s*\/>/g, '').replace(/\[\[Image:[^\]]*\]\]/g, '')
    .replace(/<\/?(nowiki|center|u)>/g, '').replace(/<div[^>]*>|<\/div>/g, '').replace(/<sup>[\s\S]*?<\/sup>/g, '');
  const lines = tables(t.split('\n'));
  let start = lines.findIndex(l => /^\s*Version\s+\d/.test(l.replace(/'/g, '')));
  start = start >= 0 ? start + 1 : lines.findIndex(l => /✶/.test(l));
  const secs = [];
  let cur = null;
  const push = (type, html) => { if (!cur) { cur = { he: '', en: '', b: [] }; secs.push(cur); } cur.b.push([type, html]); };
  for (let l of lines.slice(start)) {
    if (/^\s*'*I am the original transcriber/.test(l)) break;
    l = l.replace(/([ךםןףץ][\u0591-\u05C7]*)(יְיָ)/g, '$1 $2').replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
    // footnote numbers glued to the Hebrew text (":1") – the references themselves are dropped
    l = l.replace(/([\u05D0-\u05EA\u0591-\u05C7][:׃.,;!?"”)]*)\d+/g, '$1');
    if (!l || /^'*$/.test(l) || l === 'בס"ד') continue;
    let html = escH(l).replace(/'''(.*?)'''/g, '<b>$1</b>').replace(/''(.*?)''/g, '<i>$1</i>').replace(/'{2,}/g, '').replace(/<b>\s*<\/b>|<i>\s*<\/i>/g, ' ').replace(/\s+/g, ' ').trim();
    html = fullName(html).replace(/ \| /g, ' ׀ ');
    if (/✶/.test(l)) { cur = { he: fixTitle(l.replace(/[✶'*]/g, '').replace(/\s+/g, ' ').trim()), en: '', b: [] }; secs.push(cur); continue; }
    if (/★/.test(l)) { push('h', fixTitle(html.replace(/★/g, '').replace(/<\/?[bi]>/g, '').trim())); continue; }
    const H = cnt(l, HEB), L = cnt(l, LAT);
    if (L > H) {
      // the English line right under a section title is its subtitle
      if (cur && !cur.en && !cur.b.length && l.length < 90) { cur.en = l.replace(/'/g, '').trim(); continue; }
      push('n', html); continue;
    }
    push('p', html);
  }
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
    const secs = parse(fmt === 'odt' ? odtText(buf) : buf.toString('utf8'));
    if (!secs.length) throw new Error('no sections: ' + name);
    fs.mkdirSync(`${OUT}/${id}`, { recursive: true });
    secs.forEach((s, n) => fs.writeFileSync(`${OUT}/${id}/${n + 1}.json`, JSON.stringify({ he: s.he || he, en: s.en, b: s.b })));
    index.books.push({ id, he, group, secs: secs.map(s => ({ he: s.he || he, en: s.en, h: s.b.filter(b => b[0] === 'h').map(b => b[1]), n: s.b.length })) });
    console.log(id, secs.length, secs.map(s => s.he).join(' | '));
  }
  fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index));
  const sp = 'site/data/sources.json', sources = JSON.parse(fs.readFileSync(sp, 'utf8'));
  sources.siddur = {
    versionTitle: 'Siddur Nusach Ha-Ari (Chabad), transcribed by Shmuel Gonzales – Open Siddur Project',
    versionTitleInHebrew: 'סידור נוסח האר״י (חב״ד), תעתיק שמואל גונזלס – Open Siddur Project',
    versionSource: POST, license: 'CC0', instructionsLicense: 'CC-BY',
    attribution: 'Contributors to the Open Siddur Project, including Shmueli Gonzales',
    retrieved: 'Internet Archive copy (web.archive.org) of the files at ' + BASE, files,
  };
  fs.writeFileSync(sp, JSON.stringify(sources, null, 1));
}
