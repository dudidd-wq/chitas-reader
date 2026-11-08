// Which prayers fit now, and which insertions are said today – computed on the device (works in Node for tests).
// Only rules that can be checked against the calendar are shown; everything here is documented in NOTES.md.
import { HDate, HebrewCalendar, flags, months } from './vendor/hebcal.js';

const H = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new HDate(new Date(y, m - 1, d)); };
const hol = (hd, il) => HebrewCalendar.getHolidaysOnDate(hd, il) || [];
const has = (hd, il, f) => hol(hd, il).some(e => e.getFlags() & f);
const abs = hd => hd.abs();
/** day of Chanukah (1–8) of a Hebrew date, or 0 */
export function chanukahDay(hd) {
  const d = abs(hd) - abs(new HDate(25, months.KISLEV, hd.getFullYear())) + 1; // Kislev and Tevet share a Hebrew year
  return d >= 1 && d <= 8 ? d : 0;
}
/** day of the Omer (1–49) counted on the evening that begins Hebrew date hd, or 0 */
export function omerDay(hd) {
  const d = abs(hd) - abs(new HDate(16, months.NISAN, hd.getFullYear())) + 1;
  return d >= 1 && d <= 49 ? d : 0;
}
const isPurim = (hd, jerusalem) => {
  const adar = HDate.isLeapYear(hd.getFullYear()) ? months.ADAR_II : months.ADAR_I;
  return hd.getMonth() === adar && (hd.getDate() === 14 || (jerusalem && hd.getDate() === 15));
};
/**
 * Insertions in the Amidah / Birkat Hamazon for the prayer said at that moment.
 * `evening`: after sunset – the prayer (Maariv) already belongs to the next Hebrew date.
 * `il`: Land of Israel (tal umatar from 7 Cheshvan) or the Diaspora (from the evening of 4 Dec – 5 Dec before a
 * civil leap year – per Shulchan Aruch HaRav 117 and the common calendars).
 */
export function insertions(iso, { evening = false, il = true, jerusalem = false } = {}) {
  const civil = H(iso), hd = evening ? civil.next() : civil, y = hd.getFullYear(), m = hd.getMonth(), d = hd.getDate();
  const rc = has(hd, il, flags.ROSH_CHODESH), cholHamoed = has(hd, il, flags.CHOL_HAMOED), yomTov = has(hd, il, flags.CHAG);
  const chanukah = chanukahDay(hd), purim = isPurim(hd, jerusalem);
  // the season of rain: Musaf of Shemini Atzeret (22 Tishrei) until Musaf of the first day of Pesach (15 Nisan)
  const nisan15 = abs(new HDate(15, months.NISAN, y)), shmini = abs(new HDate(22, months.TISHREI, y)), a = abs(hd);
  const mashiv = a > shmini && a < nisan15 ? 'yes' : a === shmini ? 'fromMusaf' : a === nisan15 ? 'untilMusaf' : 'no';
  // tal umatar: until (and including) Mincha of 14 Nisan
  let tal = false;
  if (a < nisan15) {
    if (il) tal = a >= abs(new HDate(7, months.CHESHVAN, y));
    else {
      const gy = new HDate(1, months.TISHREI, y).greg().getFullYear(), leap = (gy + 1) % 4 === 0 && ((gy + 1) % 100 !== 0 || (gy + 1) % 400 === 0);
      const start = new Date(gy, 11, leap ? 5 : 4), c = civil.greg();
      tal = c > start || (+c === +start && evening);
    }
  }
  return {
    hd, rc, cholHamoed, yomTov, chanukah, purim, shabbat: (evening ? civil.next() : civil).getDay() === 6,
    yaalehVeyavo: rc || cholHamoed || yomTov,
    alHanisim: !!chanukah || purim,
    mashiv, tal,
    // Anenu: public fasts only (not the fast of the firstborn; Yom Kippur has its own liturgy)
    fast: hol(hd, il).some(e => (e.getFlags() & (flags.MINOR_FAST | flags.MAJOR_FAST)) && !/Bechorot|Yom Kippur/.test(e.getDesc())),
    yamimNoraim: m === months.TISHREI && d <= 10,
    omer: evening ? omerDay(hd) : 0,
  };
}
const S = (book, n, he) => ({ book, n, he });
/**
 * Suggested prayers for a moment, given the day's zmanim (computeZmanim rows) – or the whole day when `now` is null.
 * Returns { period, he, items:[{book,n,he}], notes:[…] }.
 */
export function suggest(iso, z, now, { il = true, jerusalem = false } = {}) {
  const zt = k => z.rows.find(r => r.key === k)?.opts[0]?.r || null;
  const alot = zt('alot'), chatzot = zt('chatzot'), mg = zt('minchaGedola'), shkia = zt('shkia'), tefila = zt('tefila');
  const dow = H(iso).getDay();
  let period = 'day';
  if (now && alot && chatzot && shkia) period = now < alot ? 'lateNight' : now < chatzot ? 'morning' : now < shkia ? 'afternoon' : 'night';
  const eve = period === 'night';
  const ins = insertions(iso, { evening: eve, il, jerusalem });
  const today = insertions(iso, { evening: false, il, jerusalem });
  const items = [], notes = [];
  const yt = today.yomTov && !today.yamimNoraim, ytEve = ins.yomTov && !ins.yamimNoraim;
  const morning = () => {
    items.push(S('boker', 1, 'ברכות השחר'));
    if (dow === 6 || yt) items.push(S('shabbat', 1, yt && dow !== 6 ? 'שחרית (פסוקי דזמרה – כבשבת)' : 'שחרית לשבת'));
    else items.push(S('shacharit', 1, 'שחרית'));
    if (yt) items.push(S('regalim', 5, 'עמידה לשלוש רגלים'));
    if (yt || today.cholHamoed || today.rc || today.chanukah) items.push(S('rc', 1, today.rc && !today.chanukah && !yt && !today.cholHamoed ? 'הלל (חצי הלל)' : 'הלל'));
    if (yt || today.cholHamoed) items.push(S('regalim', 7, 'מוסף לשלוש רגלים'));
    else if (today.rc) items.push(S(dow === 6 ? 'shabbat' : 'rc', dow === 6 ? 6 : 2, dow === 6 ? 'מוסף לשבת ראש חודש' : 'מוסף לראש חודש'));
    else if (dow === 6) items.push(S('shabbat', 6, 'מוסף לשבת'));
    if (now && tefila && now > tefila) notes.push('עבר סוף זמן תפילה לפי אדמו״ר הזקן.');
  };
  const afternoon = () => {
    if (dow === 6) items.push(S('minchashabbat', 1, 'מנחה לשבת'));
    else if (dow === 5) items.push(S('kabbalat', 1, 'מנחה לערב שבת'));
    else items.push(S('mincha', 1, 'מנחה'));
    if (now && mg && now < mg) notes.push('זמן מנחה מתחיל במנחה גדולה.');
    if (dow === 5) items.push(S('shabbatbook', 1, 'הדלקת נרות שבת'));
  };
  const night = () => {
    if (dow === 5) { items.push(S('kabbalat', 2, 'קבלת שבת'), S('kabbalat', 3, 'מעריב לשבת'), S('shabbatbook', 3, 'קידוש לליל שבת')); }
    else if (ytEve) items.push(S('kabbalat', 3, 'מעריב ליום טוב'), S('regalim', 5, 'עמידה לשלוש רגלים'), S('regalim', 4, 'קידוש ליום טוב'));
    else { items.push(S('maariv', 1, dow === 6 ? 'מעריב למוצאי שבת' : 'מעריב')); if (dow === 6) items.push(S('shabbatbook', 6, 'הבדלה')); }
    if (ins.chanukah) items.push(S('chanukah', 1, 'הדלקת נרות חנוכה'));
    if (ins.omer) items.push(S('omer', 1, `ספירת העומר – הלילה ${ins.omer} לעומר`));
    if (ins.purim) items.push(S('purim', 1, 'ברכות קריאת המגילה'));
    items.push(S('shema', 1, 'קריאת שמע שעל המיטה'));
    if (now && shkia && now < (zt('tzeit') || shkia)) notes.push('מעריב – מצאת הכוכבים.');
  };
  if (period === 'morning') morning();
  else if (period === 'afternoon') afternoon();
  else if (period === 'night') night();
  else if (period === 'lateNight') { items.push(S('maariv', 1, 'מעריב (למי שלא התפלל)'), S('shema', 1, 'קריאת שמע שעל המיטה'), S('chatzot', 1, 'תיקון חצות')); }
  else { morning(); afternoon(); night(); }
  if (today.purim && period !== 'night') items.push(S('purim', 1, 'ברכות קריאת המגילה'));
  if (ins.yamimNoraim || today.yamimNoraim) notes.push('תפילות ראש השנה ויום הכיפורים אינן בסידור זה (לא נמצא להן נוסח חב״ד ברישיון חופשי).');
  const he = { morning: 'בוקר – שחרית', afternoon: 'אחר הצהריים – מנחה', night: 'ערב – מעריב', lateNight: 'לילה', day: 'תפילות היום' }[period];
  return { period, he, items, notes, ins };
}
/** The insertions as short Hebrew lines (only verifiable calendar rules). */
export function insertionLines(ins, il) {
  const L = [];
  if (ins.yaalehVeyavo) L.push('יעלה ויבוא' + (ins.rc ? ' (ראש חודש)' : ins.cholHamoed ? ' (חול המועד)' : ' (יום טוב)'));
  if (ins.alHanisim) L.push('על הניסים' + (ins.chanukah ? ` (חנוכה, יום ${ins.chanukah})` : ' (פורים)'));
  L.push(ins.mashiv === 'yes' ? 'משיב הרוח ומוריד הגשם' : ins.mashiv === 'no' ? 'מוריד הטל' : ins.mashiv === 'fromMusaf' ? 'מוריד הטל; ממוסף – משיב הרוח ומוריד הגשם' : 'משיב הרוח עד מוסף; ממוסף – מוריד הטל');
  if (!ins.shabbat && !ins.yomTov) L.push((ins.tal ? 'ותן טל ומטר לברכה' : 'ותן ברכה') + ` (${il ? 'ארץ ישראל' : 'חוץ לארץ'})`);
  if (ins.fast) L.push('תענית – עננו');
  return L;
}

/**
 * 1.0.72: is Tachanun omitted on Hebrew date hd (Chabad custom, Siddur Tehillat Hashem / Sefer HaMinhagim)?
 * Shabbat, Yom Tov, Chol haMoed, Rosh Chodesh, all of Nisan, Pesach Sheni (14 Iyar), Lag baOmer (18 Iyar),
 * 1–12 Sivan, Tisha b'Av, 15 Av, Erev Rosh haShanah, 9 Tishrei – end of Tishrei, 10, 19 and 20 Kislev, Chanukah,
 * 15 Shevat, 14–15 Adar I (Purim Katan) and 14–15 Adar (Purim, Shushan Purim), 12–13 Tammuz.
 */
export function noTachanun(hd, il = true) {
  const m = hd.getMonth(), d = hd.getDate(), leap = HDate.isLeapYear(hd.getFullYear());
  if (hd.getDay() === 6) return true;
  if (has(hd, il, flags.CHAG) || has(hd, il, flags.CHOL_HAMOED) || has(hd, il, flags.ROSH_CHODESH)) return true;
  if (chanukahDay(hd)) return true;
  const adar = leap ? months.ADAR_II : months.ADAR_I;
  const L = {
    [months.NISAN]: () => true,
    [months.IYYAR]: () => d === 14 || d === 18,
    [months.SIVAN]: () => d <= 12,
    [months.TAMUZ]: () => d === 12 || d === 13,
    [months.AV]: () => d === 9 || d === 15 || (d === 10 && hd.getDay() === 0), // 10 Av: deferred fast
    [months.ELUL]: () => d === 29,
    [months.TISHREI]: () => d >= 9,
    [months.KISLEV]: () => d === 10 || d === 19 || d === 20,
    [months.SHVAT]: () => d === 15,
  };
  if (L[m] && L[m]()) return true;
  if ((m === adar || (leap && m === months.ADAR_I)) && (d === 14 || d === 15)) return true;
  return false;
}
/** The siddur's "today": the Hebrew date of `now`, moving to the next date after sunset (Maariv/bedtime Shema). */
export function siddurDay(now, sunset) {
  const hd = new HDate(now);
  return sunset && now >= sunset ? hd.next() : hd;
}

/** 1.0.74: Shabbat or Yom Tov (incl. Rosh haShanah and Yom Kippur; not Chol haMoed). */
export function shabbatOrYomTov(hd, il = true) {
  return hd.getDay() === 6 || has(hd, il, flags.CHAG) || hol(hd, il).some(e => /Yom Kippur$/.test(e.getDesc()));
}
/** Days whose no-Tachanun does NOT reach back to the preceding Minchah (chabad.org aid 4153543): Erev RH (29 Elul),
 *  Erev YK (9 Tishrei), Pesach Sheni (14 Iyar). */
const noMinchaBefore = hd => { const m = hd.getMonth(), d = hd.getDate(); return (m === months.ELUL && d === 29) || (m === months.TISHREI && d === 9) || (m === months.IYYAR && d === 14); };
/**
 * 1.0.74: is Tachanun omitted at the moment `now`? After sunset → the next Hebrew date; after midday (Minchah time)
 * → also when the next date is a no-Tachanun day whose omission starts with the preceding Minchah.
 */
export function noTachanunAt(now, { sunset = null, chatzot = null, il = true } = {}) {
  const day = siddurDay(now, sunset);
  if (noTachanun(day, il)) return true;
  if (chatzot && now >= chatzot && !(sunset && now >= sunset)) { const nx = day.next(); return noTachanun(nx, il) && !noMinchaBefore(nx); }
  return false;
}
