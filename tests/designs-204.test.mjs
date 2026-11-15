// 1.0.114: in every design the reader's bottom bar is a solid bar on screen (phone viewport with safe-area insets, pages and
// scroll, also after switching the design in the Aא sheet) with its own play button; the designs' type is real and strong –
// each design's reading font is actually rendered (and cached for offline use), and the user's font, bold and size apply.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, PREFS } from './helpers.mjs';
import { DEFAULT_PREFS } from '../site/js/store.js';
let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const D = '2026-11-14';
const FONT = { sefer: ['Keter YG', 'keter-yg/KeterYG-Medium.ttf'], modern: ['SBL Hebrew', 'SBL_Hbrw.ttf'], nocturne: ['Taamey Ashkenaz', null] };
async function phone(prefs, insets = { top: 32, bottom: 40, left: 0, right: 0 }) {
  const ctx = await browser.newContext({ viewport: { width: 384, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL', serviceWorkers: 'block' });
  await ctx.addInitScript(p => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: p })), { ...PREFS, ...prefs });
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e)));
  const s = await ctx.newCDPSession(p); await s.send('Emulation.setSafeAreaInsetsOverride', { insets });
  return p;
}
const bar = p => p.evaluate(() => {
  const rb = document.getElementById('rb'), r = rb.getBoundingClientRect(), cs = getComputedStyle(rb), pl = document.getElementById('b-play2'), q = pl.getBoundingClientRect();
  const hit = document.elementFromPoint(innerWidth / 2, r.top + 8);
  return { top: r.top, bottom: r.bottom, h: r.height, ih: innerHeight, disp: cs.display, vis: cs.visibility, op: cs.opacity, pb: cs.paddingBottom, bg: cs.backgroundColor, bgi: cs.backgroundImage,
    onTop: rb.contains(hit), play: pl.hidden ? null : [q.width, q.height, q.top >= r.top && q.bottom <= r.bottom],
    labels: [...rb.querySelectorAll('.pg-lbl')].map(e => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0) };
});
const solid = m => m.bgi !== 'none' || !/rgba\(.*, 0(\.\d+)?\)$|\/ 0(\.\d+)?\)$/.test(m.bg);

for (const d of ['sefer', 'modern', 'nocturne']) test(`1.0.114: "${d}" – the bottom bar is on screen, solid, above the text, with a play button (phone, safe-area insets)`, async () => {
  for (const layout of ['pages', 'scroll']) {
    const p = await phone({ design: d, layout });
    await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(400);
    const m = await bar(p);
    assert.equal(m.disp, 'grid', layout); assert.equal(m.vis, 'visible'); assert.equal(m.op, '1');
    const stack = await p.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      const rb = r('rb'), ln = r('lnav'), bn = r('bnav');
      return { rbBot: rb.bottom, lnTop: ln.top, lnH: ln.height, bnTop: bn.top, bnBot: bn.bottom, ih: innerHeight, bnPb: getComputedStyle(document.getElementById('bnav')).paddingBottom };
    });
    assert.ok(m.top < m.ih - 60, `${layout}: bar ${JSON.stringify(m)}`);
    assert.ok(Math.abs(stack.rbBot - stack.lnTop) < 2, `${layout}: pager not above lesson nav ${JSON.stringify(stack)}`);
    assert.ok(stack.lnTop <= stack.bnTop + 1 && Math.abs(stack.bnBot - stack.ih) < 1, `${layout}: ${JSON.stringify(stack)}`);
    assert.equal(stack.bnPb, '40px', 'the app nav clears the gesture area');
    assert.ok(solid(m), `${layout}: see-through bar ${m.bg}`);
    assert.ok(m.onTop, `${layout}: something covers the bar`); assert.deepEqual(m.labels, [true, true]);
    assert.ok(m.play && m.play[0] >= 44 && m.play[1] >= 44 && m.play[2], `${layout}: play ${JSON.stringify(m.play)}`);
    const pad = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('rc')).paddingBottom));
    if (layout === 'pages') assert.ok(pad >= m.h + stack.lnH - 1, `text runs under the bars (${pad} < ${m.h}+${stack.lnH})`);
    assert.deepEqual(p.errors, []); await p.context().close();
  }
  // chosen in the reader's Aא sheet: the bar is still there after the sheet closes
  const p = await phone({});
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg');
  assert.equal(await p.locator('#b-play2').isHidden(), true, 'the original look has no extra button');
  await p.tap('#b-aa'); await p.locator(`#sheet label[data-design-prev=${d}]`).tap(); await p.tap('#sh-x'); await p.waitForTimeout(400);
  const m = await bar(p); const stack = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { rb: r('rb').bottom, ln: r('lnav').top, bn: r('bnav').top, ih: innerHeight }; }); assert.ok(m.onTop && m.play && Math.abs(stack.rb - stack.ln) < 2 && stack.ln <= stack.bn + 1, JSON.stringify({ m, stack }));
  await p.context().close();
});

for (const [d, [family]] of Object.entries(FONT)) test(`1.0.114: "${d}" – its reading font and strong UI type really render; "הגופן שלי", bold and size apply`, async () => {
  const p = await pageWith(browser, srv.url, { prefs: { design: d, layout: 'scroll' }, viewport: { width: 412, height: 915 } });
  const fontsOf = async sel => { const s = await p.context().newCDPSession(p); try { await s.send('DOM.enable'); await s.send('CSS.enable'); const doc = await s.send('DOM.getDocument'), n = await s.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel }); return (await s.send('CSS.getPlatformFontsForNode', { nodeId: n.nodeId })).fonts.filter(f => f.isCustomFont && f.glyphCount > 5).map(f => f.familyName); } finally { await s.detach(); } };
  const ready = async () => { await p.waitForSelector('#rc .seg .t'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); };
  await p.goto(srv.url + `#/r/chumash/${D}`); await ready();
  assert.deepEqual(await fontsOf('#rc .seg .t'), [family], 'the design font is the one drawn (no fallback)');
  const t = await p.locator('#rc .seg .t').first().textContent(); assert.match(t, /[\u0591-\u05af]/, 'cantillation kept with the design font');
  assert.ok((await fontsOf('#rc .rashi p')).includes('Noto Rashi Hebrew'));
  const w = await p.locator('.r-title b').evaluate(e => Number(getComputedStyle(e).fontWeight)); assert.ok(w >= 700, `title weight ${w}`);
  const size0 = await p.locator('#rc .seg .t').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(size0 >= DEFAULT_PREFS.size, `reading size ${size0}`);
  // bold and size from the Aא sheet are visible in the design font
  await p.click('#b-aa'); await p.locator('#sheet input[name=readingBold]').check();
  assert.equal(await p.locator('#rc .seg .t').first().evaluate(e => getComputedStyle(e).fontWeight), '700');
  await p.locator('#sheet input[name=size]').fill('32'); await p.locator('#sheet input[name=size]').dispatchEvent('input');
  assert.ok(await p.locator('#rc .seg .t').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize)) > size0 + 6);
  // picking a font in the list = "my font": stored and drawn
  await p.locator('#sheet label:has(input[name=font][value="frank"])').click();
  assert.equal(await p.locator('#sheet input[name=designFont]:checked').inputValue(), 'mine');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.designFont), 'mine');
  await p.click('#sh-x'); await ready();
  assert.deepEqual(await fontsOf('#rc .seg .t'), ['Frank Ruhl Libre']);
  // and back to the design's font
  await p.click('#b-aa'); await p.locator('#sheet input[name=designFont][value=design]').check({ force: true }); await p.click('#sh-x'); await ready();
  assert.deepEqual(await fontsOf('#rc .seg .t'), [family]);
  // home: headings in the design's faces, heavy
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.card .what:not(:empty)'); await p.evaluate(() => document.fonts.ready);
  assert.ok(Number(await p.locator('.card .ttl').first().evaluate(e => getComputedStyle(e).fontWeight)) >= 700);
  assert.ok((await fontsOf('.hero .hd')).length === 1, 'the date title is drawn in a web font');
  assert.deepEqual(p.errors, []); await p.context().close();
});

test('1.0.114: the designs\' fonts are cached by the service worker and render offline', async () => {
  const ctx = await browser.newContext({ serviceWorkers: 'allow', locale: 'he-IL', viewport: { width: 412, height: 915 } }), p = await ctx.newPage();
  await p.addInitScript(() => { if (!localStorage.getItem('chitas-reader.v1')) localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: { locationChosen: true, layout: 'scroll' } })); });
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg .t'); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForFunction(() => navigator.serviceWorker.controller !== null); await p.reload(); await p.waitForSelector('#rc .seg .t');
  const files = ['keter-yg/KeterYG-Medium.ttf', 'noto-rashi/NotoRashiHebrew.woff2', 'SBL_Hbrw.ttf', 'assistant/Assistant.woff2'];
  for (const d of ['sefer', 'modern', 'nocturne']) { await p.click('#b-aa'); await p.locator(`#sheet label[data-design-prev=${d}]`).click(); await p.click('#sh-x'); }
  await p.waitForFunction(async fs => { const c = await caches.open('optional-fonts-v1'); return (await Promise.all(fs.map(f => c.match(new URL('fonts/' + f, document.baseURI).href)))).every(Boolean); }, files);
  await ctx.setOffline(true);
  for (const [d, [family]] of Object.entries(FONT)) {
    await p.click('#b-aa'); await p.locator(`#sheet label[data-design-prev=${d}]`).click(); await p.click('#sh-x');
    await p.reload(); await p.waitForSelector('#rc .seg .t');
    await p.evaluate(f => document.fonts.load(`400 24px "${f}"`), family);
    assert.ok(await p.evaluate(f => document.fonts.check(`400 24px "${f}"`), family), d + ' offline');
    assert.equal(await p.locator('html').getAttribute('data-design'), d);
  }
  await ctx.close();
});

test('1.0.115: the whole date shows in the date field in every design (320 and 412 px)', async () => {
  for (const d of ['sefer', 'modern', 'nocturne']) for (const width of [320, 412]) {
    const p = await pageWith(browser, srv.url, { prefs: { design: d }, viewport: { width, height: 800 } });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#datepick'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    const [sw, cw] = await p.locator('#datepick').evaluate(e => [e.scrollWidth, e.clientWidth]);
    assert.ok(sw <= cw, `${d} ${width}: date cut (${sw} > ${cw})`);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${d} ${width}: page overflows`);
    await p.context().close();
  }
});
