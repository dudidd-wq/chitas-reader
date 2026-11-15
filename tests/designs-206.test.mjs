// 1.0.118: Dudi – "הפונטים של ההנחיות גדולים מידי / ולאחר בחירת עיצוב שינוי הפונטים לא עובד".
// Siddur instructions are smaller than the prayer text in every design (still readable); under a design the user's font
// choice ("הגופן שלי") also reaches the home screen, the size slider works in both reading-font modes; the SW checks for
// an update when the app comes back to the foreground.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith } from './helpers.mjs';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const fs_ = (p, sel) => p.locator(sel).first().evaluate(e => [parseFloat(getComputedStyle(e).fontSize), getComputedStyle(e).fontFamily]);

for (const d of ['classic', 'sefer', 'modern', 'nocturne']) test(`1.0.118: "${d}" – instructions are clearly smaller than the prayer, never below 13px`, async () => {
  for (const size of [24, 40]) {
    const p = await pageWith(browser, srv.url, { prefs: { design: d, size, layout: 'scroll' }, viewport: { width: 412, height: 915 } });
    await p.goto(srv.url + '#/s/shacharit/3'); await p.waitForSelector('#rc .sid-note');
    const [t] = await fs_(p, '#rc .seg:not(.sid-special):not(.sid-omit) .t'), [n] = await fs_(p, '#rc .sid-note');
    assert.ok(n <= t * 0.68, `${size}: note ${n} vs text ${t}`); assert.ok(n >= 13, `${size}: note too small ${n}`); assert.ok(n <= 20, `${size}: note ${n}`);
    if (await p.locator('#rc .sid-in').count()) { const [i] = await fs_(p, '#rc .sid-in'); assert.ok(i <= t * 0.65 && i >= 13, `sid-in ${i}`); }
    assert.deepEqual(p.errors, []); await p.context().close();
  }
});

for (const d of ['sefer', 'modern', 'nocturne']) test(`1.0.118: "${d}" – changing the font in settings changes the reading AND the home screen; size works in both modes`, async () => {
  const p = await pageWith(browser, srv.url, { prefs: { design: d }, viewport: { width: 412, height: 915 } });
  await p.goto(srv.url + '#/settings'); await p.waitForSelector('#set-display input[name=font]');
  await p.locator('#set-display label[data-font=david]').click();
  assert.equal(await p.locator('html').getAttribute('data-design-font'), 'mine', 'picking a font switches to "my font"');
  assert.equal(await p.locator('#set-display input[name=designFont][value=mine]').isChecked(), true);
  await p.goto(srv.url + '#/d/' + D); await p.waitForSelector('.card .what:not(:empty)');
  for (const s of ['.card .what', '.hero .hd']) assert.match((await fs_(p, s))[1], /^"?David Libre/, s);
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg');
  assert.match((await fs_(p, '#rc .seg .t'))[1], /^"?David Libre/);
  // size slider (reader sheet), in "my font" and back in "the design's font"
  for (const mode of ['mine', 'design']) {
    await p.click('#b-aa'); await p.locator(`#sheet input[name=designFont][value=${mode}]`).check({ force: true });
    const before = (await fs_(p, '#rc .seg .t'))[0];
    await p.locator('#sheet input[name=size]').fill('36'); await p.waitForTimeout(200);
    const after = (await fs_(p, '#rc .seg .t'))[0];
    assert.ok(after > before + 4, `${mode}: size ${before} → ${after}`);
    if (mode === 'design') assert.doesNotMatch((await fs_(p, '#rc .seg .t'))[1], /^"?David/, 'design font back');
    await p.locator('#sheet input[name=size]').fill('24'); await p.click('#sh-x');
  }
  assert.deepEqual(p.errors, []);
});

test('1.0.118: the service worker is asked for an update when the app returns to the foreground', () => {
  const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /visibilitychange[^\n]*visible[^\n]*r\.update/);
  assert.match(fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8'), /skipWaiting/);
});
