// "זמני היום" – halachic times computed on the device (no network) with @hebcal/core's Zmanim (NOAA solar
// algorithm, bundled in vendor/hebcal.js). Sea-level sunrise/sunset (as Hebcal and Chabad.org publish them).
// Rounding to the cautious side: deadlines are rounded down to the minute, earliest-times up.
import { Zmanim, GeoLocation, HebrewCalendar, Location, HDate, flags } from './vendor/hebcal.js';

// Coordinates as used by Hebcal/GeoNames (city centres). candles: minutes before sunset – 18, Jerusalem 40 and Haifa 30
// (both Hebcal and Chabad.org use 40/30 there; Chabad.org uses other local customs in a few cities – see About).
export const CITIES = [
  { id: 'jerusalem', he: 'ירושלים', lat: 31.76904, lon: 35.21633, tz: 'Asia/Jerusalem', il: true, candles: 40 },
  { id: 'telaviv', he: 'תל אביב', lat: 32.08088, lon: 34.78057, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'haifa', he: 'חיפה', lat: 32.81841, lon: 34.9885, tz: 'Asia/Jerusalem', il: true, candles: 30 },
  { id: 'beersheva', he: 'באר שבע', lat: 31.25181, lon: 34.7913, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'bneibrak', he: 'בני ברק', lat: 32.08074, lon: 34.8338, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'safed', he: 'צפת', lat: 32.96465, lon: 35.496, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'eilat', he: 'אילת', lat: 29.55805, lon: 34.94821, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'kfarchabad', he: 'כפר חב״ד', lat: 31.98886, lon: 34.85169, tz: 'Asia/Jerusalem', il: true, candles: 18 },
  { id: 'newyork', he: 'ניו יורק', lat: 40.71427, lon: -74.00597, tz: 'America/New_York', il: false, candles: 18 },
  { id: 'crownheights', he: 'קראון הייטס', lat: 40.6694, lon: -73.9422, tz: 'America/New_York', il: false, candles: 18 },
  { id: 'london', he: 'לונדון', lat: 51.50853, lon: -0.12574, tz: 'Europe/London', il: false, candles: 18 },
  { id: 'paris', he: 'פריז', lat: 48.85341, lon: 2.3488, tz: 'Europe/Paris', il: false, candles: 18 },
  { id: 'moscow', he: 'מוסקבה', lat: 55.75222, lon: 37.61556, tz: 'Europe/Moscow', il: false, candles: 18 },
  { id: 'melbourne', he: 'מלבורן', lat: -37.814, lon: 144.96332, tz: 'Australia/Melbourne', il: false, candles: 18 },
];
export const cityById = id => CITIES.find(c => c.id === id);
const ok = d => (d instanceof Date && !isNaN(d) ? d : null);
const MIN = 60000;
export const roundZ = (d, dir) => (d ? new Date((dir === 'down' ? Math.floor : Math.ceil)(d.getTime() / MIN) * MIN) : null);
export function fmtTime(d, tz) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('he-IL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}
const dayOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };

// Each row: the Chabad/Alter Rebbe opinion first (as on Chabad.org), then the other common opinions.
// dir: 'down' for a deadline (latest time), 'up' for an earliest time.
export function computeZmanim(iso, place, { candleMins } = {}) {
  const mins = candleMins || place.candles || 18;
  const date = dayOf(iso), next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const gl = new GeoLocation(place.he || 'loc', place.lat, place.lon, 0, place.tz);
  const z = new Zmanim(gl, date, false), zn = new Zmanim(gl, next, false);
  const T = f => { try { return ok(f()); } catch { return null; } };
  const sunset = T(() => z.sunset()), sunriseNext = T(() => zn.sunrise());
  const r = (key, he, dir, opts, note = '') => ({ key, he, dir, note, opts: opts.map(([op, f]) => ({ op, t: T(f) })) });
  const rows = [
    r('alot', 'עלות השחר', 'up', [['16.9° – אדמו״ר הזקן (כמו Chabad.org)', () => z.alosBaalHatanya()], ['16.1°', () => z.alotHaShachar()], ['72 דקות לפני הנץ', () => z.alotHaShachar72()]]),
    r('misheyakir', 'משיכיר (זמן ציצית ותפילין)', 'up', [['10.2° (כמו Chabad.org)', () => z.timeAtAngle(10.2, true)], ['11.5°', () => z.misheyakir()]]),
    r('netz', 'הנץ החמה', 'up', [['בגובה פני הים', () => z.sunrise()]]),
    r('shma', 'סוף זמן קריאת שמע', 'down', [['אדמו״ר הזקן (שו״ע הרב)', () => z.sofZmanShmaBaalHatanya()], ['הגר״א', () => z.sofZmanShma()], ['מג״א – 72 דקות', () => z.sofZmanShmaMGA()], ['מג״א – 16.1°', () => z.sofZmanShmaMGA16Point1()]]),
    r('tefila', 'סוף זמן תפילה', 'down', [['אדמו״ר הזקן (שו״ע הרב)', () => z.sofZmanTfilaBaalHatanya()], ['הגר״א', () => z.sofZmanTfilla()], ['מג״א – 72 דקות', () => z.sofZmanTfillaMGA()], ['מג״א – 16.1°', () => z.sofZmanTfillaMGA16Point1()]]),
    r('chatzot', 'חצות היום', 'down', [['אמצע היום (הנץ–שקיעה)', () => z.chatzot()]]),
    r('minchaGedola', 'מנחה גדולה', 'up', [['אדמו״ר הזקן', () => z.minchaGedolaBaalHatanya()], ['הגר״א', () => z.minchaGedola()]]),
    r('minchaKetana', 'מנחה קטנה', 'up', [['אדמו״ר הזקן', () => z.minchaKetanaBaalHatanya()], ['הגר״א', () => z.minchaKetana()]]),
    r('plag', 'פלג המנחה', 'up', [['אדמו״ר הזקן', () => z.plagHaminchaBaalHatanya()], ['הגר״א', () => z.plagHaMincha()]]),
    r('shkia', 'שקיעת החמה', 'down', [['בגובה פני הים', () => sunset]]),
    r('tzeit', 'צאת הכוכבים', 'up', [['6° – אדמו״ר הזקן (כמו Chabad.org)', () => z.tzaisBaalHatanya()], ['8.5°', () => z.tzeit(8.5)]]),
    r('chatzotNight', 'חצות הלילה', 'down', [['אמצע הלילה שאחרי היום (שקיעה–הנץ)', () => (sunset && sunriseNext ? new Date((sunset.getTime() + sunriseNext.getTime()) / 2) : null)]]),
  ];
  for (const row of rows) for (const o of row.opts) o.r = roundZ(o.t, row.dir);
  // Shabbat / Yom Tov: candle lighting and havdalah from Hebcal's calendar for this place
  const loc = new Location(place.lat, place.lon, !!place.il, place.tz, place.he || 'loc', place.il ? 'IL' : '', undefined, 0);
  const hd = new HDate(date);
  const special = [];
  try {
    const evs = HebrewCalendar.calendar({ start: hd, end: hd, location: loc, il: !!place.il, candlelighting: true, candleLightingMins: mins, havdalahDeg: 8.5 });
    const shabbatTomorrow = next.getDay() === 6;
    const ytTomorrow = (HebrewCalendar.getHolidaysOnDate(new HDate(next), !!place.il) || []).some(h => h.getFlags() & flags.CHAG);
    for (const e of evs) {
      const t = ok(e.eventTime); if (!t) continue;
      const desc = e.getDesc();
      if (desc === 'Havdalah') {
        special.push({ key: 'havdalah', he: date.getDay() === 6 ? 'צאת השבת' : 'צאת החג', t, r: t, op: '8.5° (כמו Hebcal ו-Chabad.org)' });
      } else if (desc === 'Candle lighting') {
        // after nightfall (Shabbat → Yom Tov, or the second night of a Diaspora Yom Tov): from an existing flame
        const tzeis = !!(e.getFlags() & flags.LIGHT_CANDLES_TZEIS) || (sunset && t > sunset);
        // before sunset we compute it ourselves (sunset − minutes, rounded down): the library forces at least 20 in Israel
        const ct = tzeis ? t : sunset && new Date(sunset.getTime() - mins * MIN);
        special.push({ key: 'candles', he: shabbatTomorrow && ytTomorrow ? 'הדלקת נרות שבת ויום טוב' : shabbatTomorrow ? 'הדלקת נרות שבת' : 'הדלקת נרות יום טוב', t: ct, r: tzeis ? ct : roundZ(ct, 'down'),
          op: tzeis ? 'אחרי צאת הכוכבים, מאש קיימת' : `${mins} דקות לפני השקיעה` });
      }
    }
  } catch { /* no events */ }
  return { rows, special, sunset, nextHeb: hd.next() };
}
