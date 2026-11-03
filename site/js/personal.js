// "תהילים אישי" – the personal Tehillim chapter by age (Chabad custom). Pure logic, works in the browser and in Node.
// Everything is computed on the device; the profiles live in localStorage (prefs.tehillimProfiles) and are never sent.
//
// The custom (verified in two or more independent sources – see verification/PERSONAL-TEHILLIM.md):
//  * each day one says the chapter that matches the year one is now in: completed years + 1
//    (a boy of 13 says chapter 14; in the first year of life – chapter 1);
//  * the new chapter starts on the (Hebrew) birthday; on the birthday itself only the new chapter is said;
//  * parents say their children's chapters; Chassidim also say the Rebbe's chapter (born 11 Nissan 5662).
// Not verified (stated on the page, not presented as halacha): what to say after 150 – no chapter is computed.
import { HDate, HebrewCalendar } from './vendor/hebcal.js';

export const MAX_CHAPTER = 150;
export const REBBE_BIRTH = { hy: 5662, hm: 1, hd: 11 }; // 11 Nissan 5662

const toH = d => (d instanceof HDate ? d : typeof d === 'string' ? (([y, m, dd]) => new HDate(new Date(y, m - 1, dd)))(d.split('-').map(Number)) : new HDate(d));

/** Hebrew birth date of a profile: {greg:'YYYY-MM-DD', afterSunset} or {hy,hm,hd}. Null when there is none. */
export function hebrewBirth(p) {
  if (!p) return null;
  if (p.hy && p.hm && p.hd) return new HDate(p.hd, p.hm, p.hy);
  if (p.greg && /^\d{4}-\d\d-\d\d$/.test(p.greg)) { const h = toH(p.greg); return p.afterSunset ? h.next() : h; }
  return null;
}

/** The birthday in Hebrew year y (Hebcal: Adar in a leap year, 30 Cheshvan/Kislev, 30 Adar I). */
const birthdayIn = (y, b) => HebrewCalendar.getBirthdayOrAnniversary(y, b);

/** Completed Hebrew years on a given day (the birthday itself counts as completed). Null before birth. */
export function completedYears(birth, on) {
  const b = birth instanceof HDate ? birth : hebrewBirth(birth), d = toH(on);
  if (!b || d.abs() < b.abs()) return null;
  let years = d.getFullYear() - b.getFullYear();
  const bd = years > 0 ? birthdayIn(d.getFullYear(), b) : null;
  if (years > 0 && (!bd || d.abs() < bd.abs())) years--;
  return years;
}

/** The personal chapter for a profile on a day.
 *  {chapter, years, birth, birthday (this Hebrew year's birthday HDate or null), isBirthday, next (HDate of the next change), source:'date'|'age', over150} */
export function personalChapter(p, on) {
  const d = toH(on);
  if (p && p.age != null && p.age !== '' && !hebrewBirth(p)) {
    const age = Math.floor(Number(p.age));
    if (!Number.isFinite(age) || age < 0) return { error: 'age' };
    const chapter = age + 1;
    return { source: 'age', years: age, chapter: chapter > MAX_CHAPTER ? null : chapter, over150: chapter > MAX_CHAPTER };
  }
  const b = hebrewBirth(p);
  if (!b) return { error: 'nodate' };
  const years = completedYears(b, d);
  if (years == null) return { error: 'future', birth: b };
  const chapter = years + 1;
  const thisYear = years > 0 || d.getFullYear() > b.getFullYear() ? birthdayIn(d.getFullYear(), b) : null;
  const isBirthday = !!thisYear && thisYear.abs() === d.abs() && years > 0;
  let next = birthdayIn(d.getFullYear(), b);
  if (!next || next.abs() <= d.abs()) next = birthdayIn(d.getFullYear() + 1, b);
  return { source: 'date', birth: b, years, chapter: chapter > MAX_CHAPTER ? null : chapter, over150: chapter > MAX_CHAPTER, isBirthday, next };
}

/** The Rebbe's chapter on a day (the count continues: from 11 Nissan 5786 – chapter 125). */
export const rebbeChapter = on => personalChapter(REBBE_BIRTH, on);

/** Validate/normalise a profile coming from the form or from a backup file. */
export function cleanProfile(p) {
  if (!p || typeof p !== 'object') return null;
  const name = String(p.name || '').trim().slice(0, 40);
  if (!name) return null;
  const out = { id: String(p.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 20), name };
  if (typeof p.greg === 'string' && /^\d{4}-\d\d-\d\d$/.test(p.greg)) { out.greg = p.greg; out.afterSunset = !!p.afterSunset; }
  else if ([p.hy, p.hm, p.hd].every(Number.isInteger) && p.hy > 3000 && p.hy < 7000 && p.hm >= 1 && p.hm <= 13 && p.hd >= 1 && p.hd <= 30) { out.hy = +p.hy; out.hm = +p.hm; out.hd = +p.hd; }
  else if (p.age !== undefined && p.age !== '' && Number.isFinite(Number(p.age)) && Number(p.age) >= 0 && Number(p.age) < 200) out.age = Math.floor(Number(p.age));
  else return null;
  return out;
}
