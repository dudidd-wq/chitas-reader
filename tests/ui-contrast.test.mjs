// Browser accessibility & contrast tests for modern and nocturne designs, plus honest search UI labels and forced-colors CSS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

for (const [design, theme] of [['modern', 'paper'], ['modern', 'dark'], ['modern', 'night'], ['nocturne', 'paper'], ['nocturne', 'night']]) {
  test(`WCAG AA axe-core passes on ${design}/${theme} (home, settings, reader, lib, search)`, { skip }, async () => {
    const p = await pageWith(browser, srv.url, { prefs: { design, theme } });
    for (const [name, hash, ready] of [
      ['home', '#/d/2026-11-02', '.card .what:not(:empty)'],
      ['settings', '#/settings', '#set-backup'],
      ['reader', '#/r/chumash/2026-11-02', '#rc .seg'],
      ['lib', '#/lib', '.lib-fams'],
      ['search', '#/search', '#gs-cov'],
    ]) {
      await p.goto(srv.url + hash);
      await p.waitForSelector(ready);
      await p.waitForTimeout(200);
      const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      assert.deepEqual(r.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`), [], `${design}/${theme} ${name}`);
    }
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('search UI honestly lists included and excluded corpora and forced-colors media query is present', { skip }, async () => {
  const css = fs.readFileSync(new URL('../site/css/app.css', import.meta.url), 'utf8');
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/d/2026-11-02');
  await p.waitForSelector('.hero-tools');
  assert.equal(await p.getAttribute('.hero-tools a[href="#/search"]', 'aria-label'), 'חיפוש בספרים');
  await p.goto(srv.url + '#/search');
  await p.waitForSelector('#gs-cov');
  const cov = await p.textContent('#gs-cov');
  assert.match(cov, /נ״ך/);
  assert.match(cov, /משנה/);
  assert.match(cov, /תלמוד בבלי/);
  assert.match(cov, /תלמוד ירושלמי/);
  assert.equal(await p.textContent('#gs-scope option[value=""]'), 'כל הספרים שבאינדקס');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
