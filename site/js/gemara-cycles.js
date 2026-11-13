// 1.0.96: the four Gemara / Mishnah daily cycles, computed offline from the date with the bundled @hebcal/learning
// (BSD-2-Clause). Names are Sefaria's English titles (file paths) – hebcal spells some Bavli tractates differently.
//   Daf Yomi (Bavli): standard cycle (14th cycle began 5.1.2020).
//   Amud Yomi: Dirshu "Amud HaYomi", one amud a day from Berakhot 2a on 1 Cheshvan 5784 = 16.10.2023, no skip days.
//   Yerushalmi Yomi: one Vilna-edition daf a day (cycle anchor 2.2.1980; no lesson on Yom Kippur and Tisha B'Av).
//   Mishna Yomit: two mishnayot a day (anchor 20.5.1947).
import { HDate, DafYomi, MishnaYomiIndex, yerushalmiYomi, vilna, calculateDirshuAmud } from './vendor/hebcal.js';

const BAVLI_NAME = { Berachot: 'Berakhot', 'Rosh Hashana': 'Rosh Hashanah', Gitin: 'Gittin', 'Baba Kamma': 'Bava Kamma', 'Baba Metzia': 'Bava Metzia',
  'Baba Batra': 'Bava Batra', Bechorot: 'Bekhorot', Arachin: 'Arakhin', Midot: 'Middot' };
export const bavliName = n => BAVLI_NAME[n] || n;
const noon = d => { const x = typeof d === 'string' ? new Date(d + 'T12:00:00') : new Date(d); x.setHours(12, 0, 0, 0); return x; };
/** amud key "56a" */
export const amudKey = (daf, side) => `${daf}${side}`;
export function dafYomi(date) {
  const d = new DafYomi(noon(date));
  return { t: bavliName(d.getName()), daf: d.getBlatt(), amudim: [amudKey(d.getBlatt(), 'a'), amudKey(d.getBlatt(), 'b')] };
}
export function amudYomi(date) {
  const a = calculateDirshuAmud(noon(date));
  return { t: bavliName(a.name), daf: a.amud, side: a.side, amudim: [amudKey(a.amud, a.side)] };
}
/** null on Yom Kippur / Tisha B'Av (no lesson in the Vilna cycle) */
export function yerushalmi(date) {
  const y = yerushalmiYomi(new HDate(noon(date)), vilna);
  return y ? { t: y.name, daf: y.blatt } : null;
}
let MI = null;
export function mishnaYomit(date) {
  MI ||= new MishnaYomiIndex();
  return MI.lookup(noon(date)).map(({ k, v }) => { const [c, m] = v.split(':').map(Number); return { t: k, c, m }; });
}
/** Hebrew tractate names (Sefaria English titles → Hebrew) */
export const TRACTATE_HE = {
  Berakhot: 'ברכות', Peah: 'פאה', Demai: 'דמאי', Kilayim: 'כלאיים', Sheviit: 'שביעית', Terumot: 'תרומות', Maasrot: 'מעשרות', 'Maaser Sheni': 'מעשר שני',
  Challah: 'חלה', Orlah: 'ערלה', Bikkurim: 'ביכורים', Shabbat: 'שבת', Eruvin: 'עירובין', Pesachim: 'פסחים', Shekalim: 'שקלים', Yoma: 'יומא', Sukkah: 'סוכה',
  Beitzah: 'ביצה', 'Rosh Hashanah': 'ראש השנה', Taanit: 'תענית', Megillah: 'מגילה', 'Moed Katan': 'מועד קטן', Chagigah: 'חגיגה', Yevamot: 'יבמות',
  Ketubot: 'כתובות', Nedarim: 'נדרים', Nazir: 'נזיר', Sotah: 'סוטה', Gittin: 'גיטין', Kiddushin: 'קידושין', 'Bava Kamma': 'בבא קמא', 'Bava Metzia': 'בבא מציעא',
  'Bava Batra': 'בבא בתרא', Sanhedrin: 'סנהדרין', Makkot: 'מכות', Shevuot: 'שבועות', Eduyot: 'עדויות', 'Avodah Zarah': 'עבודה זרה', Avot: 'אבות', Horayot: 'הוריות',
  Zevachim: 'זבחים', Menachot: 'מנחות', Chullin: 'חולין', Bekhorot: 'בכורות', Arakhin: 'ערכין', Temurah: 'תמורה', Keritot: 'כריתות', Meilah: 'מעילה',
  Tamid: 'תמיד', Middot: 'מידות', Kinnim: 'קינים', Kelim: 'כלים', Oholot: 'אהלות', Negaim: 'נגעים', Parah: 'פרה', Tahorot: 'טהרות', Mikvaot: 'מקוואות',
  Niddah: 'נדה', Makhshirin: 'מכשירין', Zavim: 'זבים', 'Tevul Yom': 'טבול יום', Yadayim: 'ידיים', Oktzin: 'עוקצין',
};
// 1.0.98: Nach Yomi – one chapter a day of Nevi'im and Ketuvim (cycle from 1.11.2007, 742 days, hebcal NachYomiIndex)
import { NachYomiIndex } from './vendor/hebcal.js';
const NACH_NAME = { Nachum: 'Nahum' };
export const NACH_HE = { Joshua: 'יהושע', Judges: 'שופטים', 'I Samuel': 'שמואל א', 'II Samuel': 'שמואל ב', 'I Kings': 'מלכים א', 'II Kings': 'מלכים ב',
  Isaiah: 'ישעיהו', Jeremiah: 'ירמיהו', Ezekiel: 'יחזקאל', Hosea: 'הושע', Joel: 'יואל', Amos: 'עמוס', Obadiah: 'עובדיה', Jonah: 'יונה', Micah: 'מיכה',
  Nahum: 'נחום', Habakkuk: 'חבקוק', Zephaniah: 'צפניה', Haggai: 'חגי', Zechariah: 'זכריה', Malachi: 'מלאכי', Psalms: 'תהילים', Proverbs: 'משלי',
  Job: 'איוב', 'Song of Songs': 'שיר השירים', Ruth: 'רות', Lamentations: 'איכה', Ecclesiastes: 'קהלת', Esther: 'אסתר', Daniel: 'דניאל', Ezra: 'עזרא',
  Nehemiah: 'נחמיה', 'I Chronicles': 'דברי הימים א', 'II Chronicles': 'דברי הימים ב' };
let NY = null;
export function nachYomi(date) { NY ||= new NachYomiIndex(); const { k, v } = NY.lookup(noon(date)); return { book: NACH_NAME[k] || k, c: v }; }
/** all 742 chapters in cycle order */
export function nachChapters() { NY ||= new NachYomiIndex(); return NY.days.map(({ k, v }) => ({ book: NACH_NAME[k] || k, c: v })); }
