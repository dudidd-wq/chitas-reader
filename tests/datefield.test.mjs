// Round-2 finding SHOULD 10: the date field showed the browser-locale order (mm/dd/yyyy on an English system) in an
// all-Hebrew UI. It now shows and accepts dd/mm/yyyy regardless of locale, with the native calendar behind a button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtDmy, parseDmy } from '../site/js/calendar.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';

test('dd/mm/yyyy formatting and parsing', () => {
  assert.equal(fmtDmy('2026-05-24'), '24/05/2026');
  assert.equal(parseDmy('24/05/2026'), '2026-05-24');
  assert.equal(parseDmy(' 3.6.2026 '), '2026-06-03');
  assert.equal(parseDmy('3-6-2026'), '2026-06-03');
  assert.equal(parseDmy('31/02/2026'), null);
  assert.equal(parseDmy('05/24/2026'), null, 'US order is rejected, not silently swapped');
  assert.equal(parseDmy('24/05/26'), null);
  assert.equal(parseDmy(''), null);
});

for (const locale of ['en-US', 'he-IL']) {
  test(`date field shows dd/mm/yyyy and navigates (${locale} browser)`, { skip }, async () => {
    const srv = await serve(), b = await launch();
    try {
      const ctx = await b.newContext({ locale, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: { il: false, locationChosen: true }, progress: {} })));
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(String(e)));
      await p.goto(srv.url + '#/d/2026-05-24'); await p.waitForSelector('#datepick');
      assert.equal(await p.inputValue('#datepick'), '24/05/2026');
      assert.equal(await p.getAttribute('#datepick', 'type'), 'text');
      await p.fill('#datepick', '03/06/2026'); await p.press('#datepick', 'Enter');
      await p.waitForFunction(() => location.hash === '#/d/2026-06-03');
      await p.waitForFunction(() => document.querySelector('#datepick')?.value === '03/06/2026');
      await p.fill('#datepick', '06/31/2026'); await p.press('#datepick', 'Enter');
      assert.equal(await p.getAttribute('#datepick', 'aria-invalid'), 'true');
      assert.match(await p.textContent('#dateerr'), /יום\/חודש\/שנה/);
      assert.equal(await p.evaluate(() => location.hash), '#/d/2026-06-03');
      // the native picker path: a value chosen there is shown back as dd/mm/yyyy
      await p.evaluate(() => { const n = document.querySelector('#datenative'); n.value = '2026-07-15'; n.dispatchEvent(new Event('change', { bubbles: true })); });
      await p.waitForFunction(() => location.hash === '#/d/2026-07-15');
      const box = await p.locator('#calbtn').boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, 'calendar button is a 44px target');
      assert.deepEqual(errors, []);
    } finally { await b.close(); srv.close(); }
  });
}
