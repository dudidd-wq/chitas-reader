// "זמני היום": reachable from home and the footer, computed on the device with no network, accessible in all four
// themes, no overflow at 320px; the device position is read only when "המיקום שלי" is tapped and stays local.
import test from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';

test('zmanim page: home + footer links, Jerusalem Friday times, axe in 4 themes, 320px, same-origin only', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    for (const theme of ['paper', 'sepia', 'dark', 'night']) for (const width of [320, 390]) {
      const p = await pageWith(b, srv.url, { prefs: { theme }, viewport: { width, height: 760 } });
      const foreign = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) foreign.push(r.url()); });
      await p.goto(srv.url + '#/d/2026-11-06'); await p.waitForSelector('#zm-teaser');
      assert.match(await p.textContent('#zm-teaser'), /זמני היום.*ירושלים.*הדלקת נרות שבת.*16:05/s);
      assert.equal(await p.locator('.home-foot a[href="#/zmanim/2026-11-06"]').count(), 1, 'footer link');
      await p.click('#zm-teaser'); await p.waitForSelector('.zm-list');
      assert.equal(await p.locator('.zm-row').count(), 12);
      const t = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.zm-row')].map(r => [r.dataset.z, r.querySelector('.zm-main time').textContent])));
      // Chabad.org: 8:39, 4:46, 5:12 (rounded to nearest; ours rounds a latest time down, an earliest time up)
      assert.deepEqual([t.shma, t.shkia, t.tzeit], ['08:39', '16:45', '17:12'], 'Jerusalem 6/11/2026');
      assert.match(await p.textContent('.zm-special'), /הדלקת נרות שבת.*40 דקות.*16:05/s);
      assert.match(await p.textContent('.page'), /הזמנים מחושבים ואינם תחליף ללוח מקומי/);
      assert.match(await p.textContent('.zm-date'), /כ״ו במרחשוון תשפ״ז.*6 בנובמבר 2026/s);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(ov <= 0, `${theme} ${width}: no horizontal overflow (${ov})`);
      if (width === 390) assert.deepEqual((await new AxeBuilder({ page: p }).analyze()).violations.map(v => v.id + ':' + v.nodes[0]?.target), [], `${theme}: axe`);
      assert.deepEqual(foreign, [], 'no external requests'); assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});

test('zmanim page: city choice and candle minutes persist; geolocation only on tap, stored locally', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: () => { const g = navigator.geolocation; const o = g.getCurrentPosition.bind(g); window.__geoCalls = 0; g.getCurrentPosition = (...a) => { window.__geoCalls++; return o(...a); }; } });
    await p.context().grantPermissions(['geolocation']); await p.context().setGeolocation({ latitude: 31.2518, longitude: 34.7913 });
    await p.goto(srv.url + '#/zmanim/2026-11-06'); await p.waitForSelector('.zm-list');
    assert.equal(await p.evaluate(() => window.__geoCalls), 0, 'not read before the tap');
    await p.selectOption('#zm-city', 'telaviv'); await p.waitForFunction(() => document.title.includes('תל אביב'));
    assert.match(await p.textContent('.zm-special'), /18 דקות.*16:28/s);
    await p.selectOption('#zm-cand', '22'); await p.waitForFunction(() => /22 דקות/.test(document.querySelector('.zm-special').textContent));
    assert.match(await p.textContent('.zm-special'), /16:24/);
    await p.reload(); await p.waitForSelector('.zm-list');
    assert.match(await p.title(), /תל אביב/); assert.equal(await p.inputValue('#zm-cand'), '22');
    await p.selectOption('#zm-cand', '0');
    await p.click('#zm-geo'); await p.waitForFunction(() => document.title.includes('המיקום שלי'));
    assert.equal(await p.evaluate(() => window.__geoCalls), 1);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
    assert.equal(st.zmanPlace, 'geo'); assert.deepEqual([st.zmanGeo.lat, st.zmanGeo.lon], [31.252, 34.791]);
    assert.match(await p.textContent('#zm-city'), /המיקום שלי \(31\.25, 34\.79\)/);
    // the next day moves the date, keeps the place
    await p.click('.zm-nav a[href="#/zmanim/2026-11-07"]'); await p.waitForFunction(() => /7\/11\/2026|\(07\/11\/2026\)/.test(document.title));
    assert.match(await p.textContent('.zm-special'), /צאת השבת/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
