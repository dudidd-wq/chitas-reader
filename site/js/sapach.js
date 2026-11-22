// Parse the text of an Israeli ID appendix (ספח תעודת זהות) into people (name + birth date).
// Pure logic – no I/O. ID numbers are stripped and never returned. Birth dates only; issue/expiry/aliyah/death dates are dropped.
//
// 1.0.187 (Dudi: "לא מבין נכון את הספח") – rewritten line by line. The real appendix (and the gov.il PDF) is a table:
// one row per child – ID | first name | birth date | sex – and a spouse line "בן/בת זוג: <name> … תאריך לידה: <date>".
// The old parser took the name from the text *before* each date, so in a table every child got the previous row's name,
// twins (same date) were merged into one, the issue date became a person and the holder got the spouse's role.
// Now: a name on the same line as the date wins; otherwise the labelled "שם פרטי / שם משפחה" lines just before it;
// otherwise the one name-only line before it. Hebrew dates printed next to the civil date are ignored in names, and a
// Hebrew-only birth date is converted. Rows without a birth date (e.g. the holder, whose date is on the card) are
// returned with noDate so the reader can type the date or skip them.
import { parseDmy, fmtDmy } from './calendar.js';
import { HDate } from './vendor/hebcal.js';

const HEB = '\u05D0-\u05EA';
const STOP = new Set([
  'משרד', 'הפנים', 'פנים', 'מדינת', 'רשות', 'האוכלוסין', 'אוכלוסין', 'וההגירה', 'הגירה', 'תעודת', 'לתעודת', 'תעודה', 'התעודה', 'זהות',
  'הזהות', 'ספח', 'ספחים', 'מספר', 'מס', 'תאריך', 'לידה', 'הלידה', 'שם', 'משפחה', 'המשפחה', 'פרטי', 'הפרטי', 'האב', 'האם', 'הסב', 'מין',
  'זכר', 'נקבה', 'קרבה', 'סטטוס', 'הנפקה', 'הוצאה', 'תוקף', 'עמוד', 'רחוב', 'ישוב', 'יישוב', 'עיר', 'טלפון', 'אזרחות', 'ארץ', 'קוד', 'כתובת', 'מען', 'דירה', 'בית', 'כניסה', 'מיקוד', 'דואר', 'נולד', 'נולדה', 'נולדו', 'עד', 'כולל',
  'בני', 'משפחתי', 'פרטים', 'פרטי', 'שורה', 'טור', 'עמודה', 'רשימת', 'אשה', 'אישה', 'בעל', 'בעלת', 'ילד', 'ילדה', 'ילדים', 'הילדים',
  'נשואה', 'נשוי', 'נשוי/אה', 'רווק', 'רווקה', 'גרוש', 'גרושה', 'אלמן', 'אלמנה', 'פרוד', 'פרודה', 'מצב', 'אישי', 'זוג', 'הזוג', 'דת',
  'יהודי', 'יהודיה', 'לאום', 'מקום', 'קודם', 'נעורים', 'עליה', 'עלייה', 'כניסה', 'פטירה', 'נפטר', 'נפטרה', 'הערות', 'חתימה', 'הונפק', 'הונפקה', 'בתוקף', 'תפוגה', 'פקיעה', 'הדפסה', 'הופק', 'הופקה', 'שינוי', 'עדכון', 'נישואין', 'נישואים',
  'and', 'the', 'of', 'id', 'date', 'birth', 'name', 'family', 'first', 'sex', 'male', 'female', 'spouse', 'child', 'son', 'daughter',
  'wife', 'husband', 'issued', 'expiry', 'valid', 'ministry', 'interior', 'appendix', 'identity', 'card', 'page',
]);
const HMONTHS = [
  [/^(?:מר)?חשו?ון$/, 8], [/^ניסן$/, 1], [/^אייר$/, 2], [/^סיו?ון$/, 3], [/^תמוז$/, 4], [/^(?:מנחם\s*)?אב$/, 5], [/^אלול$/, 6],
  [/^תשרי$/, 7], [/^כסלו?י?ו$|^כסלו$/, 9], [/^טבת$/, 10], [/^שבט$/, 11], [/^אדר$/, 0],
];
const MONTH_WORD = new RegExp(`^ב?(?:${['מרחשוון', 'מרחשון', 'חשוון', 'חשון', 'ניסן', 'אייר', 'סיוון', 'סיון', 'תמוז', 'אב', 'אלול', 'תשרי', 'כסלו', 'כסליו', 'טבת', 'שבט', 'אדר'].join('|')})$`);

/** Remove 9-digit identity numbers and "מספר זהות …" groups. Never treat those digits as a date. */
export function stripIdNumbers(s) {
  return String(s || '')
    .replace(/(מספר\s*(?:זהות)?|מס['׳]?\s*(?:זהות)?|ת\.?\s*["״]?\s*ז\.?|\bI\.?D\.?)\s*[:.\-]?\s*(?:\d{8,9}|\d{3}[\s-]\d{3}[\s-]\d{3}|\d{7,8}-\d)(?![\d./-])/gi, m => m.replace(/\d/g, ' '))
    .replace(/(?<!\d)\d{8,9}(?!\d)/g, ' ')
    .replace(/(?<!\d)\d{3}[\s-]\d{3}[\s-]\d{3}(?!\d)/g, ' ')
    .replace(/(?<![\d./-])\d{7,8}-\d(?![\d./-])/g, ' ');
}

// ---- dates ----
const thisYear = () => new Date().getFullYear();
const GREG_RE = /(?<![\d.\/-])(?:(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4}|\d{2})|(\d{4})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2}))(?![\d])/g;
function gregOf(m) {
  let d, mo, y;
  if (m[4]) { y = +m[4]; mo = +m[5]; d = +m[6]; }
  else { d = +m[1]; mo = +m[2]; y = +m[3]; if (m[3].length === 2) y += y <= thisYear() % 100 ? 2000 : 1900; }
  if (y < 1880 || y > thisYear()) return null;
  return parseDmy(`${d}/${mo}/${y}`);
}
const GEM = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
const gemVal = s => [...String(s).replace(/['"׳״]/g, '')].reduce((a, c) => a + (GEM[c] || 0), 0);
// e.g. כ"ג בניסן התשע"ה / ט״ו שבט תשמ״ה / א' באדר ב' ה'תשנ"ה
const HEB_DATE_RE = new RegExp(`(?<![${HEB}])([${HEB}]{1,2}['"׳״]?[${HEB}]?)\\s+(ב?(?:מר)?חשו?ון|ב?ניסן|ב?אייר|ב?סיו?ון|ב?תמוז|ב?(?:מנחם\\s*)?אב|ב?אלול|ב?תשרי|ב?כסלי?ו|ב?טבת|ב?שבט|ב?אדר(?:\\s*[אב]['׳]?)?)\\s*,?\\s+(ה?['׳]?\\s*[${HEB}]{1,3}['"׳״][${HEB}])(?![${HEB}])`, 'g');
function hebDateOf(m) {
  const day = gemVal(m[1]);
  const mon = m[2].replace(/\s+/g, ' ').trim();
  const second = /\s[ב]['׳]?$|ב['׳]$/.test(mon) && /^ב?אדר/.test(mon);
  let base = mon.replace(/\s+[אב]['׳]?$|(?<=אדר)\s*[אב]['׳]$/, '');
  const find = b => (HMONTHS.find(([re]) => re.test(b)) || [])[1];
  let hm = find(base);
  if (hm === undefined && base.startsWith('ב')) hm = find(base.slice(1));
  if (hm === undefined) return null;
  const y = gemVal(m[3].replace(/^ה['׳]?\s*/, '')) + 5000;
  if (hm === 0) hm = second && HDate.isLeapYear(y) ? 13 : 12;
  if (!(day >= 1 && day <= 30) || y < 5600 || y > 5900) return null;
  try {
    const g = new HDate(day, hm, y).greg();
    return parseDmy(`${g.getDate()}/${g.getMonth() + 1}/${g.getFullYear()}`);
  } catch { return null; }
}

// labels before a date that make it something other than a birth date
const NOT_BIRTH = /הנפקה|הונפק|תוקף|בתוקף|הוצאה|תפוגה|פקיעה|עלי[יה]+|כניסה|נישואי?ן|גירושי?ן|שינוי|עדכון|הדפסה|הופק|issued|expir|valid|print/i;
const DEATH = /פטירה|נפטר|נפטרה|ז["״]ל|(?<![\u05D0-\u05EA])ז\s*ל(?![\u05D0-\u05EA])/;
/** Is this civil date an issue/expiry/aliyah/… date? The label is just before it, or – when the date is the last one on a
 * visually reversed line ("01/01/2020 תאריך הנפקה:") – just after it. */
function datesIn(text) {
  const out = [];
  for (const m of text.matchAll(new RegExp(GREG_RE.source, 'g'))) out.push([m.index, m.index + m[0].length]);
  for (const m of text.matchAll(new RegExp(HEB_DATE_RE.source, 'g'))) out.push([m.index, m.index + m[0].length]);
  return out;
}
function notBirth(line, d) {
  // the label before belongs to this date only back to the end of the previous date on the line
  const prev = datesIn(line.slice(0, d.i)).sort((x, y) => x[1] - y[1]).pop();
  // "01/01/2020 (ו' בטבת התש"ף)" – the same date written twice: judge both by the label before the first
  if (prev && /^[\s,()\-–ו]*$/.test(line.slice(prev[1], d.i))) return notBirth(line, { i: prev[0], end: d.end });
  const prevEnd = prev ? prev[1] : 0;
  const before = line.slice(Math.max(prevEnd, d.i - 28), d.i);
  if (NOT_BIRTH.test(before) && !/לידה|נולד/.test(before.slice(-14))) return true;
  // "01/01/2020 ו' בטבת התש"ף תאריך הנפקה:" – skip the same date written again right after this one
  let end = d.end;
  for (const [a, b] of datesIn(line.slice(end))) { if (!/^[\s,()\-–ו]*$/.test(line.slice(end, end + a))) break; end += b; }
  const rest = line.slice(end);
  if (datesIn(rest).length) return false; // a later date owns the label after this one
  const after = rest.slice(0, 24);
  return !/לידה|נולד/.test(line.slice(0, d.i)) && NOT_BIRTH.test(after) && !/לידה|נולד/.test(after);
}

// ---- names ----
// a value word of a labelled field: never another field's label, never itself a label ("…:"), never digits
const FIELD_LABEL = '(?:שם|תאריך|מספר|מס|מין|קרבה|קירבה|מען|כתובת|מצב|דת|לאום|אזרחות|מקום|ארץ|ישוב|יישוב|עיר|הנפקה|תוקף|ת\\.?\\s*ז|בן|בת|ילדים|ילד)(?![\u05D0-\u05EA])';
const TOK = `(?!${FIELD_LABEL})(?![^\\s:\\d]*:)[^\\s:\\d]+`;
const VAL = `[ \\t]*[:.\\-]?(?:[ \\t]*${TOK}(?:[ \\t]+${TOK})?)?`; // a blank value matches nothing
// "שם משפחה קודם: …", "שם פרטי קודם", "שם נעורים" – an earlier name, never the person's current name
const PREV_NAME = new RegExp(`שם[ \\t]*(?:(?:ה)?משפחה|(?:ה)?פרטי)?[ \\t]*(?:קודם|קודמים|הקודם|לפני[ \\t]*הנישואי?ן|נעורים|הנעורים)(?![\u05D0-\u05EA])${VAL}`, 'g');
const FIELD_DROP = [
  /מדינת\s+ישראל/g,
  new RegExp(`שם[ \\t]*(?:האב|האם|הסב|קודם|נעורים|הנעורים|לועזי|באנגלית)(?![\u05D0-\u05EA])${VAL}`, 'g'),
  new RegExp(`(?:מקום|ארץ|ישוב)[ \\t]*(?:ה)?לידה${VAL}`, 'g'),
  new RegExp(`(?:מצב[ \\t]*אישי|דת|לאום|אזרחות|מין)(?![\u05D0-\u05EA])[ \\t]*[:.\\-]?(?:[ \\t]*${TOK})?`, 'g'),
  /(?:מען|כתובת|רחוב|ישוב|יישוב|עיר|מיקוד)\s*[:.\-].*$/gm,
];
function nameTokens(frag) {
  let s = ' ' + frag + ' ';
  for (const re of FIELD_DROP) s = s.replace(re, ' ');
  s = s.replace(HEB_DATE_RE, ' ').replace(GREG_RE, ' ').replace(/\d+/g, ' ');
  s = s.replace(/בן\s*\/\s*בת|בת\s*\/\s*בן|נשוי\s*\/\s*אה|\/\s*ה\b/g, ' ');
  const raw = s.split(/[^\u05D0-\u05EA'"׳״\-]+/).map(w => w.replace(/^[-'"׳״]+|[-"״]+$/g, '').replace(/^(.{2,}?)['׳]$/, (m, a) => (/[גזצ]$/.test(a) ? m : a))).filter(Boolean);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if ((w === 'בן' || w === 'בת') && raw[i + 1] && !STOP.has(raw[i + 1]) && raw[i + 1].length >= 2 && !MONTH_WORD.test(raw[i + 1])) { out.push(w + ' ' + raw[++i]); continue; } // בן ציון, בת שבע
    // a month word is part of a (broken) Hebrew date – unless it is a first name (סיון, ניסן) with no date digits beside it
    const gemNear = [raw[i - 1], raw[i + 1]].some(x => x && /^[\u05D0-\u05EA]{1,4}["״'׳][\u05D0-\u05EA]?$/.test(x));
    if (w.length < 2 || STOP.has(w) || w === 'בן' || w === 'בת' || (MONTH_WORD.test(w) && (gemNear || !NAME_MONTHS.has(w)))) continue;
    if (/^[\u05D0-\u05EA]{1,4}["״][\u05D0-\u05EA]$/.test(w) || /^[\u05D0-\u05EA]['׳]$/.test(w)) continue; // gematria / abbreviations: תשמ"ה, ז"ל, ת"ז
    if (!out.includes(w)) out.push(w);
  }
  return out;
}
const NAME_MONTHS = new Set(['סיון', 'סיוון', 'ניסן']);
const joinName = ws => ws.slice(0, 3).join(' ').trim().slice(0, 40);
function labelled(frag) {
  const val = re => {
    const m = frag.match(re); if (!m) return '';
    const ws = nameTokens(m[1]);
    return joinName(ws.slice(0, 2));
  };
  // the value ends at the next field: a known label, or any "word:" label (מצב אישי:, לאום:, ארץ לידה: …)
  const stopLook = `(?=\\s*(?:(?:שם|תאריך|מספר|מין|קרבה|מען|מצב|דת|לאום|אזרחות|ארץ|מקום|ישוב|יישוב|עיר|כתובת)(?![${HEB}])|[${HEB}]+\\s*:|$))`;
  return {
    family: val(new RegExp(`שם\\s*(?:ה)?משפחה\\s*[:.\\-]?[ \\t]*([${HEB}'"׳״\\- \\t]+?)${stopLook}`)),
    given: val(new RegExp(`שם\\s*(?:ה)?פרטי\\s*[:.\\-]?[ \\t]*([${HEB}'"׳״\\- \\t]+?)${stopLook}`)),
  };
}

// ---- roles ----
function roleCue(s) {
  if (/בעל(?:ת)?\s*(?:ה)?תעודה|נושא(?:ת)?\s*(?:ה)?תעודה|מחזיק(?:ת)?\s*(?:ה)?תעודה/.test(s)) return 'holder';
  if (/בן\s*\/\s*בת\s*(?:ה)?זוג|בת\s*\/\s*בן\s*(?:ה)?זוג|בת\s*(?:ה)?זוג|בן\s*(?:ה)?זוג|\bspouse\b|\bwife\b|\bhusband\b/.test(s)) return 'spouse';
  if (/קרבה\s*[:.\-]?\s*(?:אשה|אישה|בעל)(?![\u05D0-\u05EA])|(?:^|[^\u05D0-\u05EA])(?:אשה|אישה)(?![\u05D0-\u05EA])/.test(s)) return 'spouse';
  if (/קרבה\s*[:.\-]?\s*(?:בן|בת|ילד|ילדה)(?![\u05D0-\u05EA])|(?:^|[^\u05D0-\u05EA])(?:ילדים|ילד|ילדה|הילדים)(?![\u05D0-\u05EA])|\b(?:son|daughter|child)\b/.test(s)) return 'child';
  return '';
}
export const ROLE_HE = { holder: 'בעל/ת התעודה', spouse: 'בן/בת זוג', child: 'ילד/ה' };

/**
 * @param {string} text OCR or typed appendix text
 * @returns {{ people: {name: string, greg: string, role: string, roleHe: string, dateRaw: string, deceased?: boolean, noDate?: boolean, fromHebrew?: string}[], raw: string }}
 */
export function parseSapachText(text) {
  const raw = String(text || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
  const lines = stripIdNumbers(raw.replace(/[|¦]/g, ' ').replace(/\u05F4/g, '"').replace(/\u05F3/g, "'")).split(/\r?\n/)
    .map(l => l.replace(PREV_NAME, ' ').replace(/[ \t]+/g, ' ').trim());
  const people = [];
  let section = '', pend = { family: '', given: '', loose: [], nLoose: 0, cue: '', lines: 0 }, last = null, sawTableHead = false;
  const orphanNames = [];
  const reset = () => { pend = { family: '', given: '', loose: [], nLoose: 0, cue: '', lines: 0 }; };
  const push = p => {
    p.name = (p.name || '').slice(0, 40);
    if (p.greg && p.name && people.some(x => x.greg === p.greg && x.name === p.name)) return null;
    if (!p.greg && people.some(x => x.name === p.name)) return null;
    p.roleHe = ROLE_HE[p.role] || '';
    people.push(p); return p;
  };
  const flushNoDate = () => {
    if (!pend.given) return;
    push({ name: joinName([pend.given, pend.family].filter(Boolean)), greg: '', role: pend.cue || (people.length ? '' : 'holder'), dateRaw: '', noDate: true });
  };
  for (const line of lines) {
    if (!line) { continue; }
    const dates = [];
    GREG_RE.lastIndex = 0; let m;
    while ((m = GREG_RE.exec(line))) dates.push({ i: m.index, end: m.index + m[0].length, raw: m[0], greg: gregOf(m) });
    const valid = dates.filter(d => d.greg && !notBirth(line, d));
    let hebs = [];
    if (!valid.length) { HEB_DATE_RE.lastIndex = 0; while ((m = HEB_DATE_RE.exec(line))) { const g = hebDateOf(m); const h = { i: m.index, end: m.index + m[0].length }; if (g && !notBirth(line, h)) hebs.push({ i: m.index, end: m.index + m[0].length, raw: m[0], greg: g, heb: true }); } }
    const all = valid.length ? valid : hebs;
    const cue = roleCue(line);
    const lab = labelled(line);
    if (!all.length) {
      // a heading, a label line, a name-only line, or "קרבה …" after a block
      if (/^\s*קרבה/.test(line) && last && pend.lines <= 2 && !pend.given) { if (cue) { last.role = cue; last.roleHe = ROLE_HE[cue]; } continue; }
      if (lab.given || lab.family) { if (lab.given && pend.given) { flushNoDate(); reset(); } if (lab.family) pend.family = lab.family; if (lab.given) pend.given = lab.given; if (cue) pend.cue = cue; pend.lines++; continue; }
      if (/שם\s*פרטי|תאריך\s*לידה/.test(line)) { sawTableHead = true; if (cue) section = cue; continue; }
      const ws = nameTokens(line);
      if (cue && !ws.length) { section = cue; continue; }
      if (ws.length && !/[:]/.test(line) && ws.length <= 3) { pend.loose = ws; pend.nLoose++; if (cue) pend.cue = cue; if (sawTableHead || section === 'child') orphanNames.push(ws); }
      else if (cue) section = cue;
      pend.lines++;
      continue;
    }
    const deceased = DEATH.test(line);
    let used = 0;
    for (let k = 0; k < all.length; k++) {
      const d = all[k];
      const before = line.slice(k ? all[k - 1].end : 0, d.i);
      if (notBirth(line, d)) continue;
      if (DEATH.test(before.slice(-14)) || (deceased && used)) continue; // a death date, never a birth date
      const frag = all.length === 1 ? line : before + ' ' + (nameTokens(before).length ? '' : line.slice(d.end, all[k + 1]?.i ?? line.length));
      const fl = labelled(frag);
      let name = '';
      const inl = nameTokens(frag);
      if (fl.given) { if (pend.given && pend.given !== fl.given) { flushNoDate(); pend.family = fl.family ? pend.family : ''; } name = joinName([fl.given, fl.family || pend.family].filter(Boolean)); }
      else if (inl.length) { name = joinName(inl); if (pend.given) flushNoDate(); }
      else if (pend.given) name = joinName([pend.given, pend.family].filter(Boolean));
      else if (pend.loose.length && pend.nLoose === 1) { name = joinName(pend.loose); const oi = orphanNames.indexOf(pend.loose); if (oi >= 0) orphanNames.splice(oi, 1); }
      const role = roleCue(frag) || pend.cue || section || (sawTableHead && people.length ? 'child' : '') || (people.length ? '' : (fl.given || pend.given ? 'holder' : ''));
      const p = push({ name, greg: d.greg, role, dateRaw: fmtDmy(d.greg), ...(deceased ? { deceased: true } : {}), ...(d.heb ? { fromHebrew: d.raw } : {}) });
      if (p) last = p;
      used++;
      reset();
    }
    if (!used && (lab.given || lab.family)) { if (lab.family) pend.family = lab.family; if (lab.given) pend.given = lab.given; }
    if (used) pend.lines = 0;
  }
  flushNoDate();
  // OCR sometimes reads a table column by column: the dates come with no names and the names sit on their own lines.
  const unnamed = people.filter(p => !p.name && p.greg);
  if (unnamed.length && orphanNames.length === unnamed.length) unnamed.forEach((p, i) => { p.name = joinName(orphanNames[i]); });
  return { people, raw: stripIdNumbers(raw) };
}

/** Several OCR readings of one picture (row-wise, automatic layout): keep the one that yields the most complete people. */
export function pickReading(readings) {
  let best = '', bestScore = -1;
  for (const t of readings || []) {
    const ps = parseSapachText(t).people;
    const sc = ps.reduce((n, p) => n + (p.greg && p.name ? 3 : p.greg ? 1 : p.name ? 1 : 0), 0);
    if (sc > bestScore) { bestScore = sc; best = t; }
  }
  return best;
}
