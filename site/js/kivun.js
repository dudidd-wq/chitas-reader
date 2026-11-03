// "כיוון התפילה" – pure functions (no DOM): the great-circle direction from a place to the Temple Mount, its Hebrew name,
// the distance, and the compass maths (true heading from the sensor, smoothing, stability). Everything runs on the device.
import { declination, decimalYear } from './wmm.js';

// The target: the Foundation Stone (אבן השתייה) under the Dome of the Rock – the usual identification of the place of the
// Holy of Holies (קודש הקודשים). Coordinates: English Wikipedia "Foundation Stone"/"Dome of the Rock" 31.7780, 35.2354;
// OpenStreetMap (way 4709536, Dome of the Rock) 31.77802, 35.23530 – the two agree to about 10 m. Its exact position on
// the Mount is debated; this matters only within a few hundred metres of the Mount (see NEAR_MOUNT_KM).
export const TARGET = { lat: 31.7780, lon: 35.2354, he: 'הר הבית – מקום המקדש' };
export const NEAR_MOUNT_KM = 1;      // closer than this the direction depends on the exact spot – we say so
export const JERUSALEM_KM = 8;       // rough radius of Jerusalem around the Mount (label only)
const R_EARTH = 6371.0088;           // mean Earth radius (km), IUGG
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
export const norm360 = x => ((x % 360) + 360) % 360;
/** signed smallest difference b − a in (−180, 180] */
export const angDiff = (a, b) => { const d = norm360(b - a); return d > 180 ? d - 360 : d; };

/** initial great-circle bearing (forward azimuth) from (lat1, lon1) to (lat2, lon2), degrees clockwise from true north */
export function bearing(lat1, lon1, lat2 = TARGET.lat, lon2 = TARGET.lon) {
  const φ1 = rad(lat1), φ2 = rad(lat2), Δλ = rad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2), x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return norm360(deg(Math.atan2(y, x)));
}
/** great-circle distance (km), haversine */
export function distanceKm(lat1, lon1, lat2 = TARGET.lat, lon2 = TARGET.lon) {
  const φ1 = rad(lat1), φ2 = rad(lat2), dφ = φ2 - φ1, dλ = rad(lon2 - lon1);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}
// 16 compass points, clockwise from north
const POINTS = ['צפון', 'צפון-צפון-מזרח', 'צפון-מזרח', 'מזרח-צפון-מזרח', 'מזרח', 'מזרח-דרום-מזרח', 'דרום-מזרח', 'דרום-דרום-מזרח',
  'דרום', 'דרום-דרום-מערב', 'דרום-מערב', 'מערב-דרום-מערב', 'מערב', 'מערב-צפון-מערב', 'צפון-מערב', 'צפון-צפון-מערב'];
export const dirName = b => POINTS[Math.round(norm360(b) / 22.5) % 16];
// wrapped in a left-to-right isolate (LRI…PDI) so that "128°" is not shown as "°128" inside Hebrew text
const ltr = t => `\u2066${t}\u2069`;
export const fmtDeg = b => ltr(`${Math.round(norm360(b)) % 360}°`);
export function fmtKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`;
  return `${new Intl.NumberFormat('he-IL', { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} ק״מ`;
}

/** validates a typed coordinate pair; returns {lat, lon} or null */
export function parseLatLon(latS, lonS) {
  const n = s => { const t = String(s ?? '').trim().replace(',', '.'); return /^[-+]?\d{1,3}(\.\d+)?$/.test(t) ? Number(t) : NaN; };
  const lat = n(latS), lon = n(lonS);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return null;
  return { lat, lon };
}

/**
 * Everything the screen shows for a place: true bearing, distance, name, the level (for the label) and the
 * magnetic declination there (for the sensor; WMM2025).
 * il: true/false when known (a city from the list), undefined for a typed/GPS place.
 */
export function kivunFor(place, when = new Date()) {
  const b = bearing(place.lat, place.lon), km = distanceKm(place.lat, place.lon);
  const year = decimalYear(when);
  let dec = null;
  try { dec = declination(place.lat, place.lon, year); if (!isFinite(dec)) dec = null; } catch { dec = null; }
  const level = km < NEAR_MOUNT_KM ? 'mount' : km < JERUSALEM_KM ? 'jerusalem' : place.il === true ? 'il' : place.il === false ? 'chul' : 'far';
  return { bearing: b, km, name: dirName(b), level, declination: dec, wmmOutdated: year >= 2030 };
}

/**
 * Heading of the top of the screen, degrees from TRUE north, from a deviceorientation(absolute) event.
 * iOS: webkitCompassHeading (magnetic, clockwise) with webkitCompassAccuracy (negative = not calibrated).
 * Android/Chrome: deviceorientationabsolute alpha (magnetic, counter-clockwise) → 360 − alpha.
 * screenAngle: screen.orientation.angle (landscape), dec: declination (east +).
 * Returns null when the event carries no absolute heading.
 */
export function headingFromEvent(e, { screenAngle = 0, dec = 0 } = {}) {
  let mag = null, accuracy = null, source = null;
  if (typeof e.webkitCompassHeading === 'number' && isFinite(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) {
    mag = e.webkitCompassHeading; source = 'ios';
    accuracy = typeof e.webkitCompassAccuracy === 'number' ? e.webkitCompassAccuracy : null;
  } else if (e.absolute === true && typeof e.alpha === 'number' && isFinite(e.alpha)) {
    mag = 360 - e.alpha; source = 'absolute';
  } else return null;
  return { heading: norm360(mag + screenAngle + (dec || 0)), magnetic: norm360(mag + screenAngle), accuracy, source, beta: typeof e.beta === 'number' ? e.beta : null };
}

/** circular smoothing + stability: keeps the last samples (≤ windowMs) as unit vectors */
export function makeSmoother({ windowMs = 1200, alpha = 0.25 } = {}) {
  let sx = null, sy = null; const buf = [];
  return {
    push(h, t) {
      const x = Math.cos(rad(h)), y = Math.sin(rad(h));
      if (sx === null) { sx = x; sy = y; } else { sx += alpha * (x - sx); sy += alpha * (y - sy); }
      buf.push({ x, y, t }); while (buf.length && t - buf[0].t > windowMs) buf.shift();
      return this.value();
    },
    value() { return sx === null ? null : norm360(deg(Math.atan2(sy, sx))); },
    /** circular standard deviation of the recent raw samples (degrees); null with fewer than 4 samples */
    spread() {
      if (buf.length < 4) return null;
      const mx = buf.reduce((a, s) => a + s.x, 0) / buf.length, my = buf.reduce((a, s) => a + s.y, 0) / buf.length;
      const Rm = Math.min(1, Math.hypot(mx, my));
      return Rm <= 0 ? 180 : deg(Math.sqrt(-2 * Math.log(Rm)));
    },
    reset() { sx = sy = null; buf.length = 0; },
  };
}
/** the sensor state shown to the user */
export function sensorQuality({ accuracy, spread, beta }) {
  if (accuracy !== null && accuracy !== undefined && accuracy < 0) return 'uncal';
  if (beta !== null && beta !== undefined && Math.abs(beta) > 65) return 'tilt';
  if ((accuracy !== null && accuracy !== undefined && accuracy > 25) || (spread !== null && spread !== undefined && spread > 12)) return 'unstable';
  return 'ok';
}
/** a short spoken/visible instruction: which way to turn */
export function turnHint(delta) {
  const a = Math.abs(Math.round(delta));
  if (a <= 5) return 'אתם מכוונים לכיוון התפילה';
  return delta > 0 ? `פנו ימינה ${ltr(a + '°')}` : `פנו שמאלה ${ltr(a + '°')}`;
}
