// Daily Chitas + Rambam schedule, computed fully offline.
// Works in the browser and in Node (tests) – depends only on the bundled hebcal libraries.
import { HDate, Sedra, Locale, months, dailyRambam1, dailyRambam3, tanyaYomi, dailyPsalms, getLeyningForParsha } from './vendor/hebcal.js';

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
export function isoDate(hd) {
  const g = hd.greg();
  return `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}`;
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
    // Israel only (22 Tishrei can fall on Shabbat; 23 Tishrei never does): on Shabbat the rule "up to the day's
    // aliyah" would mean all of Bereshit, although the Bereshit week starts anew the next day. We learn Bereshit
    // 'ראשון' only (1:1–2:3, the חתן בראשית reading), as chabad.org.il words it for a Simchat Torah on a Sunday:
    // "כל פרשת ברכה וראשון דפרשת בראשית" (Daily/Item.asp?ArticleID=701). No source we found states the Israeli
    // Shabbat case explicitly – see NOTES.md / About.
    const onShabbat = n === 7;
    const b = getLeyningForParsha(['Bereshit']).fullkriyah[onShabbat ? 1 : n];
    res.parts = [
      { book: 'Deuteronomy', bookHe: BOOK_HE.Deuteronomy, from: res.from, to: { c: 34, v: 12 } },
      { book: 'Genesis', bookHe: BOOK_HE.Genesis, from: { c: 1, v: 1 }, to: parseRef(b.e) },
    ];
    res.simchatTorah = true;
    res.shabbat = onShabbat;
    res.title = `שמחת תורה – וזאת הברכה מ${ALIYAH_HE[n - 1]} עד סוף התורה, ובראשית ${onShabbat ? 'ראשון (א,א–ב,ג)' : 'עד סוף ' + ALIYAH_HE[n - 1]}`;
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
export function hebDateHe(hd) { return hd.renderGematriya(true); }

export function dayPlan(date, { il = true } = {}) {
  const hd = toHDate(date);
  return {
    iso: isoDate(hd), hd, dayHe: DAY_HE[hd.getDay()], hebDate: hebDateHe(hd),
    weekParsha: parshaHe(chumashParsha(hd, il)),
    chumash: chumash(hd, il), tehillim: tehillim(hd), tanyaStart: tanyaStart(hd),
    rambam1: rambam1(hd), rambam3: rambam3(hd),
  };
}
export { HDate, Locale };
