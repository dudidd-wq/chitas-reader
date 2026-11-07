import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith } from './helpers.mjs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('Taamey Ashkenaz is an additional, licensed, precached option, never the default', () => {
  const app = read('site/js/app.js'), css = read('site/css/app.css'), sw = read('site/sw.js');
  assert.match(app, /\['ashkenaz', 'טעמי אשכנז'\]/);
  assert.match(read('site/js/store.js'), /font: 'noto'/);
  assert.match(css, /--text-font: 'Noto Serif Hebrew', 'Ezra SIL', serif/);
  assert.match(css, /\[data-font="ashkenaz"\].*'Taamey Ashkenaz', 'Noto Serif Hebrew'/);
  for (const weight of ['medium', 'bold']) {
    const name = `taamey-ashkenaz-${weight}.woff2`;
    assert.ok(fs.statSync(new URL('../site/fonts/' + name, import.meta.url)).size > 20000);
    assert.ok(css.includes(name)); assert.ok(sw.includes('fonts/' + name));
  }
  for (const name of ['TaameyAshkenaz-LICENSE.txt', 'GPL-2.0.txt']) {
    assert.ok(read('site/fonts/' + name).length > 500);
    assert.ok(app.includes('fonts/' + name)); assert.ok(sw.includes('fonts/' + name));
  }
  assert.match(app, /Yoram Gnat/); assert.match(app, /culmus.sourceforge.net/);
  assert.match(read('site/fonts/TaameyAshkenaz-LICENSE.txt'), /special exception/);
  const coverage = JSON.parse(read('verification/TAAMEY-ASHKENAZ-COVERAGE.json'));
  assert.deepEqual(coverage.unexpected_missing, []);
  assert.equal(coverage.all_niqqud_and_taamim, true);
});
test('font picker persists Ashkenaz; mobile and desktop render niqqud and taamim in the webfont', async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const width of [390, 1280]) {
      const p = await pageWith(browser, srv.url, { viewport: { width, height: 844 }, prefs: { rashi: false, layout: 'scroll' } });
      await p.goto(srv.url + '#/settings');
      assert.equal(await p.locator('input[name="font"][value="noto"]').isChecked(), true);
      await p.locator('label').filter({ has: p.locator('input[name="font"][value="ashkenaz"]') }).click();
      await p.goto(srv.url + '#/r/chumash/2026-11-02');
      await p.waitForSelector('#rc .seg');
      await p.evaluate(() => document.fonts.ready);
      const state = await p.evaluate(() => ({ font: document.documentElement.dataset.font, family: getComputedStyle(document.querySelector('#rc')).fontFamily, text: document.querySelector('#rc').textContent, pref: JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.font }));
      assert.equal(state.font, 'ashkenaz'); assert.equal(state.pref, 'ashkenaz');
      assert.match(state.family, /Taamey Ashkenaz/); assert.match(state.text, /[\u0591-\u05AF]/); assert.match(state.text, /[\u05B0-\u05C7]/);
      const cdp = await p.context().newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#rc .seg .t' });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      assert.ok(fonts.some(f => f.isCustomFont && /Ashkenaz/.test(f.familyName)), JSON.stringify(fonts));
      assert.ok(fonts.every(f => /Ashkenaz/.test(f.familyName)), JSON.stringify(fonts));
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await browser.close(); srv.close(); }
});
