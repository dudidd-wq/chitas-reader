// "כיוון התפילה" page: reachable from the siddur, the prayer card, zmanim and the footer; the live compass with mocked
// sensors (Android deviceorientationabsolute, iOS webkitCompassHeading + permission prompt), the calibration/instability
// warnings, the no-sensor fallback, typed coordinates, geolocation only on tap, axe in 4 themes, 320px, same-origin only.
import test from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { kivunFor } from '../site/js/kivun.js';
import { cityById } from '../site/js/zmanim.js';
const skip = !CHROME && 'no Chrome';

const android = (p, magHeadings, beta = 2) => p.evaluate(([hs, beta]) => {
  for (const h of hs) window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: (360 - h) % 360, beta, gamma: 0, absolute: true }));
}, [magHeadings, beta]);
const ios = (p, magHeadings, accuracy) => p.evaluate(([hs, acc]) => {
  for (const h of hs) {
    const e = new DeviceOrientationEvent('deviceorientation', { alpha: 123, beta: 3, gamma: 0, absolute: false });
    Object.defineProperty(e, 'webkitCompassHeading', { value: h }); Object.defineProperty(e, 'webkitCompassAccuracy', { value: acc });
    window.dispatchEvent(e);
  }
}, [magHeadings, accuracy]);
const txt = (p, sel) => p.$eval(sel, e => e.textContent.replace(/[\u2066-\u2069]/g, ''));
const arrowAngle = p => p.$eval('#kv-arrow', g => Number(/rotate\((-?[\d.]+)/.exec(g.getAttribute('transform'))[1]));

test('kivun: links, Tel Aviv result, axe in 4 themes, 320px, same-origin only', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const ta = kivunFor(cityById('telaviv'));
    for (const theme of ['paper', 'sepia', 'dark', 'night']) for (const width of [320, 390]) {
      const p = await pageWith(b, srv.url, { prefs: { theme, kivunPlace: 'telaviv' }, viewport: { width, height: 760 } });
      const foreign = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await p.goto(srv.url + '#/kivun'); await p.waitForSelector('#kv-deg');
      assert.equal(await txt(p, '#kv-deg'), `${Math.round(ta.bearing)}°`);
      assert.equal(await p.textContent('#kv-name'), 'דרום-מזרח');
      assert.match(await p.textContent('.kv-level'), /בארץ ישראל: מכוונים כנגד ירושלים/);
      assert.match(await p.textContent('.kv-disc'), /המצפן מדויק עד כדי חיישן המכשיר; יש להרחיק ממתכות ומגנטים; במקרה ספק יש להתאים לפי הוראת רב/);
      assert.match(await txt(p, '#kv-hint'), /כיוון: 128° דרום-מזרח, ללא חיישן/);
      const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(ov <= 0, `${theme} ${width}: no horizontal overflow (${ov})`);
      if (width === 390) assert.deepEqual((await new AxeBuilder({ page: p }).analyze()).violations.map(v => v.id + ':' + v.nodes[0]?.target), [], `${theme}: axe`);
      assert.deepEqual(foreign, [], 'no external requests'); assert.deepEqual(p.errors, []);
      await p.context().close();
    }
    const p = await pageWith(b, srv.url, {});
    await p.goto(srv.url + '#/siddur'); await p.waitForSelector('.sd-kivun a[href="#/kivun"]');
    await p.goto(srv.url + '#/zmanim'); await p.waitForSelector('.zm-kivun a[href="#/kivun"]');
    await p.goto(srv.url + '#/'); await p.waitForSelector('.home-foot a[href="#/kivun"]');
    await p.waitForSelector('.tf-more a[href="#/kivun"]');
    await p.click('.home-foot a[href="#/kivun"]'); await p.waitForSelector('#kv-start');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('kivun: Android absolute sensor turns the dial; on-target, turn hints, instability, tilt', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const k = kivunFor(cityById('telaviv'));
    const p = await pageWith(b, srv.url, { prefs: { kivunPlace: 'telaviv' } });
    await p.goto(srv.url + '#/kivun'); await p.waitForSelector('#kv-start');
    await p.click('#kv-start'); await p.waitForSelector('#kv-start[aria-pressed="true"]');
    const mag = k.bearing - k.declination;                         // magnetic heading that faces the target
    await android(p, [mag, mag, mag, mag, mag]);
    assert.match(await txt(p, '#kv-hint'), /אתם מכוונים לכיוון התפילה/);
    assert.ok(await p.$eval('#kv-dial', d => d.classList.contains('kv-on')));
    assert.ok(Math.abs(await arrowAngle(p)) < 0.5, 'arrow straight up');
    assert.match(await txt(p, '#kv-live'), /אתם מכוונים/);
    assert.ok(await p.$eval('#kv-warn', w => w.hidden));
    // facing 90° to the left of the target (well past the smoothing): turn right 90°
    await android(p, Array(40).fill(mag - 90));
    assert.match(await txt(p, '#kv-hint'), /פנו ימינה 90°/);
    assert.ok(Math.abs(await arrowAngle(p) - 90) < 1, 'arrow points right');
    assert.ok(!(await p.$eval('#kv-dial', d => d.classList.contains('kv-on'))));
    // jumping readings → instability warning
    await android(p, [0, 120, 240, 60, 300, 180]);
    assert.match(await p.textContent('#kv-warn'), /אינה יציבה.*מתכות.*מגנטים/);
    // stable again, but held upright → tilt warning
    await android(p, Array(30).fill(mag), 85);
    assert.match(await p.textContent('#kv-warn'), /שטוח/);
    await p.waitForTimeout(1300);                                    // the jumpy samples leave the 1.2 s window
    await android(p, Array(30).fill(mag), 1);
    assert.ok(await p.$eval('#kv-warn', w => w.hidden));
    // stop → static; leaving the page detaches the listeners (events after that are harmless)
    await p.click('#kv-start'); await p.waitForSelector('#kv-start[aria-pressed="false"]');
    await p.goto(srv.url + '#/siddur'); await android(p, [10]);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('kivun: iOS – permission asked on tap only, webkitCompassHeading, uncalibrated warning', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const k = kivunFor(cityById('newyork'));
    const p = await pageWith(b, srv.url, { prefs: { kivunPlace: 'newyork' }, init: () => { window.__perm = 0; DeviceOrientationEvent.requestPermission = async () => { window.__perm++; return 'granted'; }; } });
    await p.goto(srv.url + '#/kivun'); await p.waitForSelector('#kv-start');
    assert.equal(await p.textContent('#kv-name'), 'צפון-מזרח');
    assert.match(await p.textContent('.kv-level'), /בחוץ לארץ: מכוונים כנגד ארץ ישראל/);
    assert.equal(await p.evaluate(() => window.__perm), 0, 'no prompt before the tap');
    await p.click('#kv-start');
    assert.equal(await p.evaluate(() => window.__perm), 1);
    const mag = k.bearing - k.declination;                          // NY: declination ≈ −12.5° (west)
    await ios(p, [mag, mag, mag, mag], -1);
    assert.match(await p.textContent('#kv-warn'), /אינו מכויל/);
    assert.match(await txt(p, '#kv-live'), /אינו מכויל/);
    await ios(p, Array(6).fill(mag), 10);
    assert.ok(await p.$eval('#kv-warn', w => w.hidden));
    assert.match(await txt(p, '#kv-hint'), /אתם מכוונים/);
    assert.ok(Math.abs(await arrowAngle(p)) < 0.5);
    assert.deepEqual(p.errors, []);
    // permission refused → fallback
    const q = await pageWith(b, srv.url, { prefs: { kivunPlace: 'newyork' }, init: () => { DeviceOrientationEvent.requestPermission = async () => 'denied'; } });
    await q.goto(srv.url + '#/kivun'); await q.click('#kv-start');
    await q.waitForFunction(() => /לא ניתנה הרשאה/.test(document.querySelector('#kv-warn').textContent));
    assert.match(await txt(q, '#kv-hint'), /כיוון: 54° צפון-מזרח, ללא חיישן/);
  } finally { await b.close(); srv.close(); }
});

test('kivun: no sensor → degrees fallback; typed coordinates; geolocation only on tap', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { kivunPlace: 'london' }, init: () => { const g = navigator.geolocation; const o = g.getCurrentPosition.bind(g); window.__geoCalls = 0; g.getCurrentPosition = (...a) => { window.__geoCalls++; return o(...a); }; } });
    await p.context().grantPermissions(['geolocation', 'accelerometer', 'gyroscope', 'magnetometer']); await p.context().setGeolocation({ latitude: 40.7128, longitude: -74.006 });
    await p.goto(srv.url + '#/kivun'); await p.waitForSelector('#kv-start');
    assert.equal(await p.textContent('#kv-name'), 'מזרח-דרום-מזרח');
    await p.click('#kv-start');                                        // headless Chrome: events without a heading
    await p.waitForFunction(() => /לא התקבלו נתוני מצפן/.test(document.querySelector('#kv-warn').textContent), null, { timeout: 5000 });
    assert.match(await txt(p, '#kv-hint'), /כיוון: 114° מזרח-דרום-מזרח, ללא חיישן/);
    assert.equal(await p.getAttribute('#kv-start', 'aria-pressed'), 'false');
    // typed coordinates (Sydney)
    await p.selectOption('#kv-place', 'manual'); await p.waitForSelector('#kv-man:not([hidden])');
    await p.fill('#kv-lat', '95'); await p.fill('#kv-lon', '151.2'); await p.click('#kv-man button');
    assert.match(await p.textContent('#kv-man-err'), /קו רוחב/); assert.equal(await p.getAttribute('#kv-lat', 'aria-invalid'), 'true');
    await p.fill('#kv-lat', '-33.86785'); await p.fill('#kv-lon', '151.20732'); await p.click('#kv-man button');
    await p.waitForFunction(() => document.querySelector('#kv-deg').textContent.includes('287°'));
    assert.equal(await p.textContent('#kv-name'), 'מערב-צפון-מערב');
    // geolocation: not read until the tap; then New York
    assert.equal(await p.evaluate(() => window.__geoCalls), 0, 'not read before the tap');
    await p.click('#kv-geo'); await p.waitForFunction(() => document.querySelector('#kv-deg')?.textContent.includes('54°'));
    assert.equal(await p.evaluate(() => window.__geoCalls), 1);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
    assert.equal(st.kivunPlace, 'geo'); assert.equal(st.kivunGeo.lat, 40.7128); assert.deepEqual(st.kivunManual, { lat: -33.86785, lon: 151.20732 });
    await p.reload(); await p.waitForSelector('#kv-deg');
    assert.equal(await txt(p, '#kv-deg'), '54°');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
