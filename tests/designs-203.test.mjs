// 1.0.113: designs (prefs.design) – "ספר קודש", "מודרני וצבעוני", "לילי" beside the original look, which stays the
// default and renders exactly as before; the choice persists; each design applies on every screen; text is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const CSS = fs.readFileSync(new URL('../site/css/app.css', import.meta.url), 'utf8');
const CUT = CSS.indexOf('\n/* ====', CSS.indexOf('1.0.113: designs') - 400);
const STRIPPED = CSS.slice(0, CUT);
const css = (p, sel, prop) => p.locator(sel).first().evaluate((e, pr) => getComputedStyle(e).getPropertyValue(pr).trim(), prop);
const rootVar = (p, v) => p.evaluate(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), v);
// every element's computed style in the home screen / reader (pseudo-elements included)
const snapshot = p => p.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('#toast')) continue;
    for (const pse of [null, '::before', '::after']) {
      const s = getComputedStyle(e, pse); let line = (e.id || e.className?.baseVal || e.className || e.tagName) + (pse || '') + ':';
      for (const k of [...s].sort()) { if (k.startsWith('transition') || k === 'will-change') continue; line += k + '=' + s.getPropertyValue(k) + ';'; }
      out.push(line);
    }
  }
  return out;
});

test('1.0.113: the default design is the original look – no attribute, every computed style as without the design CSS', async () => {
  assert.equal(DEFAULT_PREFS.design, 'classic');
  assert.ok(CUT > 0 && CUT < CSS.length - 5000 && !STRIPPED.includes('data-design'), 'design rules are one section at the end');
  for (const route of [`#/d/${D}`, `#/r/chumash/${D}`, '#/lib', '#/s/boker/1']) {
    const snaps = [];
    for (const strip of [false, true]) {
      const p = await pageWith(browser, srv.url, { viewport: { width: 412, height: 915 } });
      if (strip) await p.route('**/css/app.css', r => r.fulfill({ status: 200, contentType: 'text/css', body: STRIPPED }));
      await p.goto(srv.url + route); await p.waitForSelector(route.startsWith('#/d') ? '.card .what:not(:empty)' : route === '#/lib' ? '.lib-card' : '#rc .seg');
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
      assert.equal(await p.locator('html').getAttribute('data-design'), null);
      snaps.push(await snapshot(p)); assert.deepEqual(p.errors, []); await p.context().close();
    }
    assert.equal(snaps[0].length, snaps[1].length, route);
    const diff = snaps[0].findIndex((l, i) => l !== snaps[1][i]);
    const what = diff < 0 ? '' : (() => { const a = snaps[0][diff].split(';'), b = snaps[1][diff].split(';'); const k = a.findIndex((x, i) => x !== b[i]); return a[0].split(':')[0] + ' ' + a[k] + ' ≠ ' + b[k]; })();
    assert.equal(diff, -1, `${route}: first difference ${what}`);
  }
});

test('1.0.113: the design setting – four previewed options (no Chabad), stored under "design", kept after reload, bad values fall back', async () => {
  const p = await pageWith(browser, srv.url, { viewport: { width: 412, height: 915 } });
  await p.goto(srv.url + '#/settings'); await p.waitForSelector('#set-display input[name=design]');
  assert.deepEqual(await p.locator('#set-display input[name=design]').evaluateAll(a => a.map(e => e.value)), ['classic', 'sefer', 'modern', 'nocturne']);
  assert.equal(await p.locator('#set-display input[name=design]:checked').inputValue(), 'classic');
  assert.equal(await p.locator('#set-display .design-options .dz').count(), 4, 'each option shows its miniature');
  assert.doesNotMatch(await p.locator('.design-set').textContent(), /חב״ד|חבד/);
  for (const v of ['sefer', 'modern', 'nocturne']) assert.notEqual(await css(p, `[data-design-prev=${v}] .dz`, 'background-image') + await css(p, `[data-design-prev=${v}] .dz`, 'background-color'), await css(p, '[data-design-prev=classic] .dz', 'background-image') + await css(p, '[data-design-prev=classic] .dz', 'background-color'), v);
  await p.locator('label[data-design-prev=modern]').click();
  assert.equal(await p.locator('html').getAttribute('data-design'), 'modern');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.design), 'modern');
  await p.reload(); await p.waitForSelector('#set-display input[name=design]');
  assert.equal(await p.locator('html').getAttribute('data-design'), 'modern');
  assert.equal(await p.locator('#set-display input[name=design]:checked').inputValue(), 'modern');
  // back to the original look: the attribute goes away
  await p.locator('label[data-design-prev=classic]').click();
  assert.equal(await p.locator('html').getAttribute('data-design'), null);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.design), 'classic');
  // the reader's Aא sheet offers the same choice and applies it at once
  await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.click('#b-aa');
  await p.locator('#sheet label[data-design-prev=nocturne]').click();
  assert.equal(await p.locator('html').getAttribute('data-design'), 'nocturne');
  assert.deepEqual(p.errors, []); await p.context().close();
  const q = await pageWith(browser, srv.url, { prefs: { design: 'chabad' } }); await q.goto(srv.url + `#/d/${D}`); await q.waitForSelector('.card');
  assert.equal(await q.locator('html').getAttribute('data-design'), null, 'unknown design → the original');
  await q.context().close();
});

const EXPECT = {
  sefer: { paper: '#efe2c2', card: 'rgba(0, 0, 0, 0)', top: /gradient/, hd: /Keter YG/, rashi: /Noto Rashi Hebrew/, hl: 'rgba(227, 194, 122, .55)' },
  modern: { paper: '#f4efe6', card: 'rgb(226, 85, 45)', top: 'rgb(226, 85, 45)', hd: /Frank Ruhl Libre/, rashi: /Noto Rashi Hebrew/, hl: '#ffe7dc' },
  nocturne: { paper: '#0d0c0a', card: 'rgba(0, 0, 0, 0)', top: /color\(srgb|rgba?\(/, hd: /Frank Ruhl Libre/, rashi: /Noto Rashi Hebrew/, hl: 'rgba(241, 215, 154, .1)' },
};
for (const [d, e] of Object.entries(EXPECT)) test(`1.0.113: design "${d}" applies on home, reader, library, settings and siddur – text, font choice and layout intact`, async () => {
  const p = await pageWith(browser, srv.url, { prefs: { design: d, designFont: 'mine', font: 'frank' }, viewport: { width: 360, height: 760 } });
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.card .what:not(:empty)');
  assert.equal(await p.locator('html').getAttribute('data-design'), d);
  assert.equal(await rootVar(p, '--paper'), e.paper);
  assert.equal(await css(p, '.card', 'background-color'), e.card);
  assert.match(await css(p, '.hero .hd', 'font-family'), /^"?Frank Ruhl Libre/, '1.0.118: with "my font" the title follows the user\'s font');
  if (d === 'modern') { assert.equal(await css(p, '.card:nth-child(2)', 'background-color'), 'rgb(31, 138, 122)'); assert.equal(await css(p, '.cards', 'grid-template-columns').then(v => v.split(' ').length), 2); }
  if (d === 'sefer') assert.match(await css(p, '.hero', 'background-image'), /svg/);
  if (d === 'nocturne') assert.equal(await css(p, '.hero .hd', 'color'), 'rgba(0, 0, 0, 0)'); // gold gradient text
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(sw <= 0, `home overflows by ${sw}`);
  // reader: bars, highlight, Rashi; the reading font is still the user's; the text is the same as in the original look
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .rashi');
  const top = await css(p, '#rt', d === 'sefer' ? 'background-image' : 'background-color');
  if (e.top instanceof RegExp) assert.match(top, e.top); else assert.equal(top, e.top);
  assert.match(await css(p, '#rc .seg .t', 'font-family'), /Frank Ruhl Libre/, 'with "הגופן שלי" (1.0.114) the font setting wins for the text');
  assert.match(await css(p, '#rc .rashi', 'font-family'), e.rashi);
  assert.equal(await rootVar(p, '--hl'), e.hl);
  const txt = await p.locator('#rc').evaluate(r => [...r.querySelectorAll('.seg .t')].map(t => t.textContent).join('|'));
  const m = await p.evaluate(() => {
    const rb = document.getElementById('rb').getBoundingClientRect(), rc = document.getElementById('rc');
    return { bottom: rb.bottom, bnav: !!document.getElementById('bnav'), ih: innerHeight, pad: parseFloat(getComputedStyle(rc).paddingBottom), h: rb.height };
  });
  // 1.0.120: one slim bar at the bottom of the reader; the app nav is not in the reader
  assert.ok(m.pad >= m.h - 1, JSON.stringify(m));
  assert.equal(m.bnav, false, JSON.stringify(m));
  assert.ok(Math.abs(m.bottom - m.ih) <= 2, JSON.stringify(m));
  await p.evaluate(() => { document.querySelector('#rc .seg').classList.add('speaking'); document.getElementById('rb').classList.add('speaking'); });
  if (d === 'nocturne') { await p.waitForTimeout(500); assert.equal(await css(p, '#rc .seg:not(.speaking)', 'opacity'), '0.55', 'the rest of the page dims while reading aloud'); }
  const q = await pageWith(browser, srv.url, { prefs: { font: 'frank' }, viewport: { width: 360, height: 760 } });
  await q.goto(srv.url + `#/r/chumash/${D}`); await q.waitForSelector('#rc .rashi');
  assert.equal(await q.locator('#rc').evaluate(r => [...r.querySelectorAll('.seg .t')].map(t => t.textContent).join('|')), txt, 'same text in every design');
  await q.context().close();
  // library, settings, siddur
  for (const [route, sel] of [['#/lib', '.lib-card'], ['#/settings', '.set-card'], ['#/siddur', '.page'], ['#/s/boker/1', '#rc .seg']]) {
    await p.goto(srv.url + route); await p.waitForSelector(sel);
    assert.equal(await p.locator('html').getAttribute('data-design'), d, route);
    const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(o <= 0, `${route} overflows by ${o}`);
    assert.equal(await css(p, 'body', 'direction'), 'rtl');
  }
  assert.equal(await css(p, '#rt', 'border-bottom-color') !== '', true);
  assert.deepEqual(p.errors, []); await p.context().close();
});

test('1.0.113: designs keep the colour schemes – sefer/modern turn dark under "כהה"/"לילה", nocturne is black under "לילה"', async () => {
  for (const [design, theme, paper] of [['sefer', 'dark', '#1c140c'], ['sefer', 'night', '#000'], ['modern', 'dark', '#17130f'], ['modern', 'night', '#000'], ['nocturne', 'paper', '#0d0c0a'], ['nocturne', 'night', '#000']]) {
    const p = await pageWith(browser, srv.url, { prefs: { design, theme } });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.card');
    assert.equal(await rootVar(p, '--paper'), paper, design + '/' + theme);
    assert.equal(await p.locator('meta[name=theme-color]').getAttribute('content'), paper);
    await p.context().close();
  }
});

test('1.0.113: no optional font is requested in the original design; a design caches its own fonts', async () => {
  const p = await pageWith(browser, srv.url), req = []; p.on('request', r => { if (/\/fonts\/(noto-rashi|keter-yg|david-libre|assistant)\//.test(r.url())) req.push(r.url()); });
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.card .what:not(:empty)'); await p.waitForTimeout(500);
  // 1.0.119: Noto Rashi is fetched in the original design too (Rashi-script setting, default on); the design-only families are not
  assert.ok(req.every(u => /\/fonts\/noto-rashi\//.test(u)), req.join('\n')); await p.context().close();
  const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'css\/app\.css'/, 'the design CSS ships inside the precached stylesheet');
});
