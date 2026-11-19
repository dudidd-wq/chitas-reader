// Parse the text of an Israeli ID appendix (ספח תעודת זהות) into people (name + birth date).
// Pure logic – no I/O. ID numbers are stripped and never returned. Birth dates only; issue/expiry dates are dropped.
import { parseDmy, fmtDmy } from './calendar.js';

const DATE_RE = /(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{4})/g;
const ROLE_PATTERNS = [
  { re: /בעלת\s*התעודה|בעל\s*התעודה|נושאת\s*התעודה|נושא\s*התעודה|מחזיקת\s*התעודה|מחזיק\s*התעודה/, role: 'holder', he: 'בעל/ת התעודה' },
  { re: /בת\s*זוג|אישה|אשה|נשואה|\bwife\b|\bspouse\b/, role: 'spouse', he: 'בן/בת זוג' },
  { re: /בן\s*זוג|בעל(?!\s*התעודה)|\bhusband\b/, role: 'spouse', he: 'בן/בת זוג' },
  { re: /ילדה|(?:^|[^\u05D0-\u05EA])בת(?:[^\u05D0-\u05EA]|$)|\bdaughter\b/, role: 'child', he: 'ילד/ה' },
  { re: /ילד|(?:^|[^\u05D0-\u05EA])בן(?:[^\u05D0-\u05EA]|$)|\bson\b|\bchild\b/, role: 'child', he: 'ילד/ה' },
];
const STOP = new Set([
  'משרד', 'הפנים', 'פנים', 'תעודת', 'תעודה', 'זהות', 'ספח', 'ספחים', 'מספר', 'תאריך', 'לידה',
  'שם', 'משפחה', 'פרטי', 'האב', 'האם', 'מין', 'זכר', 'נקבה', 'קרבה', 'סטטוס', 'הנפקה', 'הוצאה',
  'תוקף', 'עמוד', 'רחוב', 'ישוב', 'יישוב', 'עיר', 'טלפון', 'אזרחות', 'ישראלית', 'ישראלי', 'ישראל',
  'ארץ', 'קוד', 'כתובת', 'דירה', 'בית', 'כניסה', 'מיקוד', 'דואר', 'נולד', 'נולדה', 'נולדו', 'עד',
  'כולל', 'בני', 'משפחתי', 'פרטים', 'שורה', 'טור', 'עמודה', 'רשימת', 'אשה', 'אישה', 'בעל', 'ילד',
  'ילדה', 'נשואה', 'נשוי', 'and', 'the', 'of', 'id', 'date', 'birth', 'name', 'family', 'first',
  'sex', 'male', 'female', 'spouse', 'child', 'son', 'daughter', 'wife', 'husband', 'issued',
  'expiry', 'valid', 'ministry', 'interior', 'appendix', 'identity', 'card', 'page',
]);

/** Remove 9-digit identity numbers and "מספר זהות …" groups. Never treat those digits as a date. */
export function stripIdNumbers(s) {
  return String(s || '')
    .replace(/(מספר\s*(?:זהות)?|ת\.?\s*ז\.?|\bI\.?D\.?)\s*[:.\-]?\s*\d{8,9}/gi, ' ')
    .replace(/(?<!\d)\d{9}(?!\d)/g, ' ');
}

function roleOf(text) {
  const s = String(text || '');
  for (const r of ROLE_PATTERNS) if (r.re.test(s)) return { role: r.role, roleHe: r.he };
  return { role: '', roleHe: '' };
}

function isIssueOrExpiry(text) {
  return /הנפקה|תוקף|הוצאה|issued|expir|valid\s*until/i.test(text) && !/לידה|נולד|birth/i.test(text);
}

function firstDate(str) {
  const m = String(str || '').match(/(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{4})/);
  return m ? parseDmy(`${m[1]}/${m[2]}/${m[3]}`) : null;
}

function cleanName(text) {
  let s = stripIdNumbers(text);
  s = s.replace(/שם\s*האב\s*[:.\-]?\s*[\u05D0-\u05EA'"׳״]+/g, ' ');
  s = s.replace(DATE_RE, ' ');
  s = s.replace(/קרבה\s*[:.\-]?\s*(?:בת\s*זוג|בן\s*זוג|אשה|אישה|בעל|בת|בן|ילדה|ילד)?/g, ' ');
  const words = s.split(/[^\u05D0-\u05EA'"׳״]+/)
    .map(w => w.replace(/^['"׳״]+|['"׳״]+$/g, ''))
    .filter(w => w.length >= 2 && !STOP.has(w) && w !== 'בן' && w !== 'בת');
  const out = [];
  for (const w of words) if (!out.includes(w)) out.push(w);
  return out.slice(0, 3).join(' ').trim();
}

function blocksOf(text) {
  const paras = String(text).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (paras.length >= 2) return paras;
  return String(text).split(/(?=שם\s*משפחה)|(?=תאריך\s*הנפקה)|(?=תוקף\b)/).map(s => s.trim()).filter(Boolean);
}

function personFromBlock(block) {
  if (isIssueOrExpiry(block)) return null;
  const family = (block.match(/שם\s*משפחה\s*[:.\-]?[ \t]*([\u05D0-\u05EA'"׳״]+(?:[ \t]+[\u05D0-\u05EA'"׳״]+)?)/) || [])[1];
  const given = (block.match(/שם\s*פרטי\s*[:.\-]?[ \t]*([\u05D0-\u05EA'"׳״]+(?:[ \t]+[\u05D0-\u05EA'"׳״]+)?)/) || [])[1];
  const birthLine = (block.match(/תאריך\s*לידה\s*[:.\-]?\s*([^\n]+)/) || [])[1] || '';
  const greg = firstDate(birthLine) || (/לידה|נולד|birth/i.test(block) ? firstDate(block) : null);
  const name = [family, given].filter(Boolean).join(' ').trim() || cleanName(block);
  if (!name || !greg) return null;
  const { role, roleHe } = roleOf(block);
  const raw = (birthLine.match(/(\d{1,2}\s*[./\-]\s*\d{1,2}\s*[./\-]\s*\d{4})/) || [])[1] || fmtDmy(greg);
  return { name: name.slice(0, 40), greg, role, roleHe, dateRaw: raw };
}

/**
 * @param {string} text OCR or typed appendix text
 * @returns {{ people: {name: string, greg: string, role: string, roleHe: string, dateRaw: string}[], raw: string }}
 */
export function parseSapachText(text) {
  const raw = String(text || '').replace(/[\u200e\u200f\ufeff]/g, '');
  const people = [];
  const seen = new Set();
  const add = p => {
    if (!p?.name || !p.greg) return;
    const i = people.findIndex(x => x.greg === p.greg);
    if (i >= 0) {
      if (p.name.length > people[i].name.length) people[i].name = p.name;
      if (p.role && !people[i].role) { people[i].role = p.role; people[i].roleHe = p.roleHe; }
      return;
    }
    const k = p.name + '|' + p.greg;
    if (seen.has(k)) return;
    seen.add(k);
    people.push(p);
  };

  for (const b of blocksOf(stripIdNumbers(raw))) add(personFromBlock(b));

  // Also split on dates: OCR often drops blank lines, so a whole page becomes one block with only the first person.
  const s = stripIdNumbers(raw);
  const re = new RegExp(DATE_RE.source, 'g');
  const hits = [];
  let m;
  while ((m = re.exec(s))) {
    const greg = parseDmy(`${m[1]}/${m[2]}/${m[3]}`);
    if (greg) hits.push({ greg, raw: m[0], index: m.index, end: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const after = s.slice(h.end, hits[i + 1]?.index ?? Math.min(s.length, h.end + 50));
    const before = s.slice(i ? hits[i - 1].end : 0, h.index);
    if (isIssueOrExpiry(before + after + s.slice(Math.max(0, h.index - 20), h.end + 20))) continue;
    const name = cleanName(before) || cleanName(before.slice(-80));
    const { role, roleHe } = roleOf(after + before);
    add({ name, greg: h.greg, role, roleHe, dateRaw: h.raw });
  }
  return { people, raw };
}

export const ROLE_HE = { holder: 'בעל/ת התעודה', spouse: 'בן/בת זוג', child: 'ילד/ה' };
