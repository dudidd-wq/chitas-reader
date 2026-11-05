// Daily Chitas + Rambam schedule, computed fully offline.
// Works in the browser and in Node (tests) – depends only on the bundled hebcal libraries.
import { HDate, Sedra, Locale, months, dailyRambam1, dailyRambam3, tanyaYomi, dailyPsalms, seferHaMitzvot, getLeyningForParsha } from './vendor/hebcal.js';

export const ALIYAH_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי'];
export const DAY_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];
export const BOOK_HE = { Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים' };

const sedraCache = new Map();
function sedra(year, il) {
  const k = year + (il ? 'i' : 'd');
  if (!sedraCache.has(k)) sedraCache.set(k, new Sedra(year, il));
  return sedraCache.get(k);
}

export function toHDate(date) {
  if (date instanceof HDate) return date;
  if (typeof date === 'string') { const [y, m, d] = date.split('-').map(Number); return new HDate(new Date(y, m - 1, d)); }
  return new HDate(date);
}
// Day/month/year as used in Israel, independent of the browser locale (the native date field follows the OS locale,
// e.g. mm/dd/yyyy on an English system).
export function fmtDmy(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
// Accepts d/m/yyyy with '/', '.' or '-' separators; returns an ISO date or null for an impossible date.
export function parseDmy(str) {
  const m = String(str).trim().match(/^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})$/); if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]], g = new Date(Date.UTC(y, mo - 1, d));
  if (g.getUTCFullYear() !== y || g.getUTCMonth() !== mo - 1 || g.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export function isoDate(hd) {
  const g = hd.greg();
  return `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}`;
}

/** Does the location hash explicitly pin a civil date (#/d/…, #/zmanim/…, #/r/<unit>/…)? */
export function hashPinsDate(hash) {
  const h = String(hash || '').replace(/^#\/?/, '').split('?')[0];
  const m = h.match(/^(?:d|zmanim)\/(\d{4}-\d\d-\d\d)(?:\/|$)/) || h.match(/^r\/[^/]+\/(\d{4}-\d\d-\d\d)(?:\/|$)/);
  return m ? m[1] : null;
}
/** Date for day-dependent views: keep a pinned URL day; otherwise use today (refresh / soft nav snap). */
export function resolveViewDate(hash, today, current) {
  const pin = hashPinsDate(hash);
  if (pin) return pin;
  return today || current;
}

export const parshaHe = names => names.map(n => Locale.gettext(n, 'he-x-NoNikud')).join('-');

/** The parsha whose aliyah is learnt on this day (Chabad Chumash-with-Rashi custom). */
export function chumashParsha(hd, il) {
  let sh = hd.onOrAfter(6);
  let res;
  for (let i = 0; i < 6; i++) {
    res = sedra(sh.getFullYear(), il).lookup(sh);
    if (!res.chag) break;
    sh = sh.add(7, 'd');
  }
  let parsha = res.parsha;
  // From after the last Shabbat of the year until Simchat Torah, Vezot Haberakhah is learnt
  // (once in the week before / of Sukkot, and again until Simchat Torah).
  const simchatTorah = il ? 22 : 23;
  if (parsha[0] === 'Bereshit' && hd.getMonth() === months.TISHREI && hd.getDate() <= simchatTorah) parsha = ['Vezot Haberakhah'];
  return parsha;
}

function parseRef(s) { const [c, v] = s.split(':').map(Number); return { c, v }; }

/** Chabad's daily-Chumash divisions differ from the common aliyah divisions in a few parshiyot
 *  (verified against Chabad.org's daily study for 5786–5787; see verification/VERIFICATION.md). */
export const CHABAD_ALIYOT = {
  Vayigash: { 3: ['45:8', '45:27'], 4: ['45:28', '46:7'], 5: ['46:8', '46:27'] },
  Terumah: { 2: ['25:17', '25:30'], 3: ['25:31', '26:14'] },
  Nasso: { 1: ['4:21', '4:28'], 2: ['4:29', '4:49'], 6: ['7:42', '7:83'], 7: ['7:84', '7:89'] },
  Devarim: { 1: ['1:1', '1:11'], 2: ['1:12', '1:21'] },
};
export function chumash(hd, il) {
  const parsha = chumashParsha(hd, il);
  const n = hd.getDay() + 1;
  const ley = getLeyningForParsha(parsha);
  const a = ley.fullkriyah[n];
  const ov = CHABAD_ALIYOT[String(parsha)]?.[n];
  const range = ov ? { b: ov[0], e: ov[1] } : a;
  const res = {
    parsha, parshaHe: parshaHe(parsha), aliyah: n, aliyahHe: ALIYAH_HE[n - 1],
    book: a.k, bookHe: BOOK_HE[a.k], from: parseRef(range.b), to: parseRef(range.e),
    title: `פרשת ${parshaHe(parsha)} – ${ALIYAH_HE[n - 1]}`,
  };
  res.parts = [{ book: res.book, bookHe: res.bookHe, from: res.from, to: res.to }];
  if (isSimchatTorah(hd, il)) {
    // Simchat Torah: finish Vezot Haberakhah from the day's aliyah to the end of the Torah, and begin Bereshit from
    // its start up to and including the day's aliyah (the Rebbe, Torat Menachem 5732 vol. 1 p. 129, Sichat Yom
    // Simchat Torah; Chabad.org.il "מנהגי חב״ד לשמחת תורה", e.g. Monday: ברכה מ'שני' עד הסוף ובראשית עד 'שני').
    // The next day continues Bereshit with its own aliyah as usual.
    // Israel only (22 Tishrei can fall on Shabbat; 23 Tishrei never does): there is no explicit instruction for
    // the Israeli Shabbat case, and "Bereshit up to the day's aliyah" would mean all of Bereshit although its week
    // begins the next day. So on Shabbat we follow the basic written rule that both opinions share – Sefer HaMinhagim
    // (Chabad), Chitas: "on Simchat Torah one studies Vezot from the passage of that weekday to the end; on Isru Chag,
    // Bereshit from its start up to the passage of that weekday" (= HaYom Yom 5703; also 'Otzar Minhagei Chabad'
    // p. 392 as quoted in Hitkashrut 1368: "כל פרשת ברכה (בלבד – זו כנראה ההוראה הקבועה)"). I.e. Shabbat: Vezot
    // Shevi'i only; Sunday (Isru Chag): Bereshit Rishon, as on every Sunday – no repetition.
    const onShabbat = n === 7;
    res.parts = [{ book: 'Deuteronomy', bookHe: BOOK_HE.Deuteronomy, from: res.from, to: { c: 34, v: 12 } }];
    if (!onShabbat) {
      const b = getLeyningForParsha(['Bereshit']).fullkriyah[n];
      res.parts.push({ book: 'Genesis', bookHe: BOOK_HE.Genesis, from: { c: 1, v: 1 }, to: parseRef(b.e) });
    }
    res.simchatTorah = true;
    res.shabbat = onShabbat;
    res.title = `שמחת תורה – וזאת הברכה מ${ALIYAH_HE[n - 1]} עד סוף התורה${onShabbat ? '' : ', ובראשית עד סוף ' + ALIYAH_HE[n - 1]}`;
  }
  return res;
}
export function isSimchatTorah(hd, il) { return hd.getMonth() === months.TISHREI && hd.getDate() === (il ? 22 : 23); }

export function tehillim(hd) {
  const [a, b] = dailyPsalms(hd);
  if (typeof a === 'string') { // Psalm 119 split over two days
    const f = parseRef(a), t = parseRef(b);
    return { parts: [{ c: f.c, from: f.v, to: t.v }], title: `תהילים קיט (${f.v === 1 ? 'א–צו' : 'צז–קעו'})` };
  }
  const parts = [];
  for (let c = a; c <= b; c++) parts.push({ c });
  return { parts, title: `תהילים ${gem(a)}–${gem(b)}` };
}

// ---- Tanya ----
const TANYA_BOOK = { 'Likkutei Amarim': 'LA', 'Shaar HaYichud VehaEmunah': 'SY', 'Iggeret HaTeshuvah': 'IT', 'Iggeret HaKodesh': 'IK', 'Kuntres Acharon': 'KA' };
const TANYA_SECTION = { 'Title Page': 'LA-title', 'Approbation': 'LA-approbation', "Compiler's Foreword": 'LA-foreword', 'Chinukh Katan': 'SY-chinukh' };
export const TANYA_ORDER = ['LA-title', 'LA-approbation', 'LA-foreword', 'LA', 'SY-chinukh', 'SY', 'IT', 'IK', 'KA'];
function rawTanyaStart(hd) {
  const t = tanyaYomi(hd);
  const key = t.section ? TANYA_SECTION[t.section] : TANYA_BOOK[t.book];
  if (!key) throw new Error('unknown tanya ' + JSON.stringify(t));
  return { key, c: t.chap || 1, s: t.verse };
}
/** Start of the day's Tanya lesson. When the schedule starts a new chapter/epistle at segment 2, segment 1 is its
 *  heading in the digital edition; Chabad's printed lesson begins with the heading, so we start at segment 1. */
export function tanyaStart(hd) {
  const st = rawTanyaStart(hd);
  if (st.s === 2) {
    const pv = rawTanyaStart(hd.prev());
    if (!(pv.key === st.key && pv.c === st.c)) st.s = 1;
  }
  return st;
}
/** Previous segment position, given the tanya index {key:{chapters:[len…]}}. */
export function tanyaPrev(pos, index) {
  if (pos.s > 1) return { key: pos.key, c: pos.c, s: pos.s - 1 };
  if (pos.c > 1) return { key: pos.key, c: pos.c - 1, s: index[pos.key].chapters[pos.c - 2] };
  let ki = TANYA_ORDER.indexOf(pos.key) - 1;
  if (ki < 0) ki = TANYA_ORDER.length - 1; // wraps to end of Kuntres Acharon
  const k = TANYA_ORDER[ki], ch = index[k].chapters;
  return { key: k, c: ch.length, s: ch[ch.length - 1] };
}
export function tanya(hd, index) {
  const from = tanyaStart(hd);
  const to = index ? tanyaPrev(tanyaStart(hd.next()), index) : null;
  return { from, to };
}

// ---- Rambam ----
function rambamItems(list) {
  const out = [];
  for (const { name, perek } of list) {
    const p = String(perek);
    let m;
    if ((m = p.match(/^(\d+):(\d+)-(\d+):(\d+)$/))) out.push({ name, from: { c: +m[1], s: +m[2] }, to: { c: +m[3], s: +m[4] } });
    else if ((m = p.match(/^(\d+)-(\d+)$/))) out.push({ name, range: [+m[1], +m[2]] });
    else out.push({ name, c: +p });
  }
  return out;
}
export const rambam1 = hd => rambamItems([dailyRambam1(hd)]);
export const rambam3 = hd => rambamItems(dailyRambam3(hd));

// ---- Sefer HaMitzvot (the Rebbe's daily track, instituted 5744) ----
// Hebcal's schedule (@hebcal/learning) checked against Chabad.org's Daily Study (verification/VERIFICATION.md).
// Items: {k:'P'|'N', n} mitzvah; {k:'S', from, to} principles (shorashim); {k:'intro'}; {k:'conclusion'} (Chabad.org
// lists a "Conclusion" on the last day of the cycle, Hebcal omits it); {k:'ref', he} a day whose lesson is a
// Mishneh Torah text (Order of Prayer, the Haggadah, Megillah and Chanukah) – shown as a reference.
const SHM_REF = { 'Nusach HaTefila': 'נוסח התפילה (משנה תורה, סוף ספר אהבה)', 'Order of Prayer': 'סדר התפילה (משנה תורה, סוף ספר אהבה)', 'Text of the Haggadah': 'נוסח ההגדה (משנה תורה, סוף הלכות חמץ ומצה)' };
export function mitzvot(hd) {
  const r = seferHaMitzvot(hd); if (!r) return { items: [] };
  const items = [];
  let m;
  if (/Introduction/.test(r.reading)) items.push({ k: 'intro' });
  else if ((m = r.reading.match(/^Principle (\d+)(?:-(\d+))?$/))) items.push({ k: 'S', from: +m[1], to: +(m[2] || m[1]) });
  else for (const part of r.reading.split(/,\s*(?![^()]*\))/)) {
    const p = part.trim();
    if ((m = p.match(/^([PN])(\d+)$/))) items.push({ k: m[1], n: +m[2] });
    else if ((m = p.match(/^Laws of Megillah and Chanukah Chapters (\d+)-(\d+)$/))) items.push({ k: 'ref', he: `הלכות מגילה וחנוכה פרקים ${gem(+m[1])}–${gem(+m[2])} (משנה תורה)` });
    else items.push({ k: 'ref', he: SHM_REF[p] || p });
  }
  const nx = seferHaMitzvot(hd.next());
  if (nx && /Introduction/.test(nx.reading) && !/Introduction/.test(r.reading)) items.push({ k: 'conclusion' });
  return { items, day: r.day };
}
export function mitzvotLabel(it) {
  if (it.k === 'P') return `מצות עשה ${gem(it.n)}`;
  if (it.k === 'N') return `מצות לא תעשה ${gem(it.n)}`;
  if (it.k === 'S') return it.from === it.to ? `שורש ${gem(it.from)}` : `שורשים ${gem(it.from)}–${gem(it.to)}`;
  if (it.k === 'intro') return 'הקדמת הרמב״ם לספר המצוות';
  if (it.k === 'conclusion') return 'סיום ספר המצוות';
  return it.he;
}

// ---- Hebrew numerals / dates ----
export function gem(n) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hund = ['', 'ק', 'ר', 'ש', 'ת'];
  let s = '';
  if (n >= 100) { s += hund[Math.floor(n / 100)]; n %= 100; }
  if (n === 15) return s + 'טו';
  if (n === 16) return s + 'טז';
  s += tens[Math.floor(n / 10)] + ones[n % 10];
  return s;
}
// Hebrew date as written in Israel: "כ״ב במרחשוון תשפ״ז" (day and year in gematria from Hebcal, month names in the
// common Israeli full spelling with the ב prefix).
const HE_MONTH = { 1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי', 8: 'מרחשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳' };
export function hebMonthHe(hd) { const m = hd.getMonth(); return m === 12 && HDate.isLeapYear(hd.getFullYear()) ? 'אדר א׳' : HE_MONTH[m]; }
export function hebDateHe(hd) {
  const parts = hd.renderGematriya(true).split(' ');
  return `${parts[0]} ב${hebMonthHe(hd)} ${parts[parts.length - 1]}`;
}
// Gregorian date in Hebrew, Israeli order: "2 בנובמבר 2026" / "יום שני, 2 בנובמבר 2026" – not left to the browser
// locale, so it reads the same on every device.
const GREG_MONTH = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export function gregLongHe(iso, { weekday = false } = {}) {
  const [y, m, d] = iso.split('-').map(Number), wd = new Date(y, m - 1, d).getDay();
  return `${weekday ? (wd === 6 ? 'שבת' : DAY_HE[wd]) + ', ' : ''}${d} ב${GREG_MONTH[m - 1]} ${y}`;
}

/** Daily Torah Or / Likkutei Torah ("מורה שיעור" luach of Kinus HaShluchim 5785, by parasha week; data/tolt).
 *  Day 1 = Sunday … 7 = Shabbat of the week whose parsha is learnt in Chumash. A joined week takes two luach days a day
 *  (the luach's own rule): Sun = 1+2 of the first, Mon = 3+4, Tue = 5+6, Wed = 7 + 1 of the second, Thu = 2+3, Fri = 4+5, Shabbat = 6+7. */
export const TOLT_SLUGS = ['bereshit', 'noach', 'lech-lecha', 'vayera', 'chayei-sara', 'toldot', 'vayetze', 'vayishlach', 'vayeshev', 'miketz', 'vayigash', 'vayechi', 'shemot', 'vaera', 'bo', 'beshalach', 'yitro', 'mishpatim', 'terumah', 'tetzaveh', 'ki-tisa', 'vayakhel', 'pekudei', 'vayikra', 'tzav', 'shemini', 'tazria', 'metzora', 'acharei', 'kedoshim', 'emor', 'behar', 'bechukotai', 'bamidbar', 'naso', 'behaalotcha', 'shelach', 'korach', 'chukat', 'balak', 'pinchas', 'matot', 'masei', 'devarim', 'vaetchanan', 'eikev', 'reeh', 'shoftim', 'ki-teitzei', 'ki-tavo', 'nitzavim', 'vayelech', 'haazinu', 'vezot-haberacha'];
export const TOLT_JOINED = [[[0, 1], [0, 2]], [[0, 3], [0, 4]], [[0, 5], [0, 6]], [[0, 7], [1, 1]], [[1, 2], [1, 3]], [[1, 4], [1, 5]], [[1, 6], [1, 7]]];
const PARSHIOT = ['Bereshit', 'Noach', 'Lech-Lecha', 'Vayera', 'Chayei Sara', 'Toldot', 'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi', 'Shemot', 'Vaera', 'Bo', 'Beshalach', 'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shmini', 'Tazria', 'Metzora', 'Achrei Mot', 'Kedoshim', 'Emor', 'Behar', 'Bechukotai', 'Bamidbar', 'Nasso', "Beha'alotcha", "Sh'lach", 'Korach', 'Chukat', 'Balak', 'Pinchas', 'Matot', 'Masei', 'Devarim', 'Vaetchanan', 'Eikev', "Re'eh", 'Shoftim', 'Ki Teitzei', 'Ki Tavo', 'Nitzavim', 'Vayeilech', "Ha'azinu", 'Vezot Haberakhah']; // hebcal's names
const SLUG_OF = Object.fromEntries(PARSHIOT.map((n, i) => [n, TOLT_SLUGS[i]]));
// A luach week runs Sunday–Shabbat and is named for the parsha of the Shabbat that ends it (day 7 = Shabbat). This differs
// from chumashParsha only in Tishrei: the week that ends on Shabbat Bereshit is the Bereshit week from its Sunday, even when
// Simchat Torah falls mid-week (so no Bereshit day is skipped); a week ending on a Shabbat of Sukkot / Shemini Atzeret
// is the Vezot Haberakhah week (drushim for Shemini Atzeret + Vezot). When there are two such weeks (e.g. 5787), the luach
// gives nothing more, so the first of them repeats the Vezot week and is marked `repeat`.
export function tolt(hd, il) {
  const sh = hd.onOrAfter(6), parsha = chumashParsha(sh, il), slugs = parsha.map(n => SLUG_OF[n]);
  const dow = hd.getDay() + 1;
  const parts = slugs.length === 2 ? TOLT_JOINED[dow - 1].map(([i, d]) => [slugs[i], d]) : [[slugs[0], dow]];
  const repeat = slugs[0] === 'vezot-haberacha' && chumashParsha(sh.add(7, 'd'), il)[0] === 'Vezot Haberakhah';
  return { parsha, slugs, dow, parts, ...(repeat ? { repeat } : {}) };
}

export function dayPlan(date, { il = true } = {}) {
  const hd = toHDate(date);
  return {
    iso: isoDate(hd), hd, dayHe: DAY_HE[hd.getDay()], hebDate: hebDateHe(hd),
    weekParsha: parshaHe(chumashParsha(hd, il)),
    chumash: chumash(hd, il), tehillim: tehillim(hd), tanyaStart: tanyaStart(hd),
    rambam1: rambam1(hd), rambam3: rambam3(hd), mitzvot: mitzvot(hd), tolt: tolt(hd, il),
  };
}
export { HDate, Locale };
