// Prayer-direction compass – maths checked against independent references:
//  * geographiclib (Karney, WGS-84 ellipsoid) azimuths/distances and pygeomag declinations (verification/kivun-fixtures.json,
//    produced by tools/kivun-fixtures.py – not by this code);
//  * NOAA's official WMM2025 test values;
//  * an in-test vector (ECEF) computation of the great-circle bearing, written independently of site/js/kivun.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearing, distanceKm, dirName, kivunFor, headingFromEvent, makeSmoother, sensorQuality, parseLatLon, angDiff, TARGET, turnHint } from '../site/js/kivun.js';
import { declination } from '../site/js/wmm.js';
import { CITIES } from '../site/js/zmanim.js';

const fx = JSON.parse(readFileSync(new URL('../verification/kivun-fixtures.json', import.meta.url)));
const need = ['telaviv', 'jerusalem', 'newyork', 'london', 'moscow', 'sydney', 'melbourne'];

test('fixtures cover the required places and use the same target', () => {
  for (const id of need) assert.ok(fx.places.find(p => p.id === id), id);
  assert.deepEqual(fx.target, [TARGET.lat, TARGET.lon]);
});

test('bearing and distance agree with the WGS-84 geodesic (geographiclib) – ≤0.3°, ≤0.5%', () => {
  for (const p of fx.places) {
    const d = Math.abs(angDiff(p.azimuth, bearing(p.lat, p.lon)));
    assert.ok(d <= 0.3, `${p.id}: ${bearing(p.lat, p.lon)} vs ${p.azimuth}`);
    assert.ok(Math.abs(distanceKm(p.lat, p.lon) / p.km - 1) < 0.005, `${p.id} km`);
  }
});

// independent: bearing = angle of the great-circle tangent in the local north/east frame
function vecBearing(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, v = (la, lo) => [Math.cos(la * r) * Math.cos(lo * r), Math.cos(la * r) * Math.sin(lo * r), Math.sin(la * r)];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const A = v(lat1, lon1), B = v(lat2, lon2), n = cross(A, B), t = cross(n, A); // tangent towards B
  const east = [-Math.sin(lon1 * r), Math.cos(lon1 * r), 0], north = cross(A, east);
  return ((Math.atan2(dot(t, east), dot(t, north)) / r) + 360) % 360;
}
test('bearing equals an independent vector computation (sphere) – ≤0.01°', () => {
  const pts = [...fx.places, ...CITIES, { lat: -54.8, lon: -68.3 }, { lat: 64.1, lon: -21.9 }, { lat: 1.29, lon: 103.85 }, { lat: 31.9, lon: 35.2 }];
  for (const p of pts) assert.ok(Math.abs(angDiff(vecBearing(p.lat, p.lon, TARGET.lat, TARGET.lon), bearing(p.lat, p.lon))) < 0.01, `${p.lat},${p.lon}`);
});

test('sanity: expected rough directions', () => {
  const b = id => bearing(...(p => [p.lat, p.lon])(fx.places.find(x => x.id === id)));
  assert.equal(dirName(b('telaviv')), 'דרום-מזרח');
  assert.equal(dirName(b('newyork')), 'צפון-מזרח');     // great circle from NY goes north-east, not due east
  assert.equal(dirName(b('london')), 'מזרח-דרום-מזרח');
  assert.equal(dirName(b('moscow')), 'דרום');
  assert.equal(dirName(b('melbourne')), 'מערב-צפון-מערב');
  assert.equal(dirName(b('sydney')), 'מערב-צפון-מערב');
});

test('Hebrew 16-point names', () => {
  assert.equal(dirName(0), 'צפון'); assert.equal(dirName(359), 'צפון'); assert.equal(dirName(90), 'מזרח');
  assert.equal(dirName(112.5), 'מזרח-דרום-מזרח'); assert.equal(dirName(97), 'מזרח'); assert.equal(dirName(180), 'דרום');
  assert.equal(dirName(270), 'מערב'); assert.equal(dirName(315), 'צפון-מערב'); assert.equal(dirName(-90), 'מערב');
});

test('WMM2025 declination: NOAA official test values (all 100) within 0.01°', () => {
  assert.equal(fx.wmmTestValues.length, 100);
  for (const [y, alt, lat, lon, d] of fx.wmmTestValues) assert.ok(Math.abs(declination(lat, lon, y, alt) - d) <= 0.01, `${lat},${lon},${y}: ${declination(lat, lon, y, alt)} vs ${d}`);
});
test('WMM2025 declination matches pygeomag at the cities – ≤0.02°', () => {
  for (const p of fx.places) assert.ok(Math.abs(declination(p.lat, p.lon, 2026.5) - p.dec2026_5) <= 0.02, p.id);
});

test('levels and labels', () => {
  assert.equal(kivunFor({ lat: TARGET.lat + 0.001, lon: TARGET.lon }).level, 'mount');
  assert.equal(kivunFor({ lat: 31.79, lon: 35.2, il: true }).level, 'jerusalem');
  assert.equal(kivunFor({ lat: 32.08, lon: 34.78, il: true }).level, 'il');
  assert.equal(kivunFor({ lat: 40.7, lon: -74, il: false }).level, 'chul');
  assert.equal(kivunFor({ lat: 40.7, lon: -74 }).level, 'far');
});

test('sensor → true heading (iOS, Android absolute, landscape, declination)', () => {
  assert.equal(headingFromEvent({ webkitCompassHeading: 100, webkitCompassAccuracy: 10, alpha: 5 }, { dec: 5 }).heading, 105);
  assert.equal(headingFromEvent({ absolute: true, alpha: 90, beta: 0 }, { dec: 0 }).heading, 270);   // alpha counter-clockwise
  assert.equal(headingFromEvent({ absolute: true, alpha: 0 }, { screenAngle: 90 }).heading, 90);
  assert.equal(headingFromEvent({ absolute: false, alpha: 30 }), null);                               // relative – unusable
  assert.equal(headingFromEvent({ webkitCompassHeading: -1, absolute: false, alpha: 1 }), null);
  assert.equal(headingFromEvent({ webkitCompassHeading: 350, webkitCompassAccuracy: -1 }, { dec: 20 }).heading, 10);
});

test('smoothing across north and stability', () => {
  const s = makeSmoother({ alpha: 1 });
  [358, 2, 359, 1, 0].forEach((h, i) => s.push(h, i * 50));
  assert.ok(Math.abs(angDiff(0, s.value())) < 1); assert.ok(s.spread() < 3);
  const u = makeSmoother(); [0, 90, 180, 270, 45].forEach((h, i) => u.push(h, i * 50));
  assert.ok(u.spread() > 12);
  assert.equal(sensorQuality({ accuracy: -1, spread: 1, beta: 0 }), 'uncal');
  assert.equal(sensorQuality({ accuracy: 40, spread: 1, beta: 0 }), 'unstable');
  assert.equal(sensorQuality({ accuracy: null, spread: 30, beta: 0 }), 'unstable');
  assert.equal(sensorQuality({ accuracy: null, spread: 2, beta: 80 }), 'tilt');
  assert.equal(sensorQuality({ accuracy: 10, spread: 2, beta: 5 }), 'ok');
  assert.equal(turnHint(3), 'אתם מכוונים לכיוון התפילה'); assert.equal(turnHint(-40), 'פנו שמאלה \u206640°\u2069'); assert.equal(turnHint(12.4), 'פנו ימינה \u206612°\u2069');
});

test('manual coordinates validation', () => {
  assert.deepEqual(parseLatLon('32.08', '34,78'), { lat: 32.08, lon: 34.78 });
  assert.deepEqual(parseLatLon(' -33.9 ', '151.2'), { lat: -33.9, lon: 151.2 });
  assert.equal(parseLatLon('91', '0'), null); assert.equal(parseLatLon('', '1'), null); assert.equal(parseLatLon('abc', '1'), null);
  assert.equal(parseLatLon('10', '181'), null);
});
