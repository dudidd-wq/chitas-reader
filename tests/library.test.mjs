// 1.0.63: the library (#/lib…) and the global search (#/search?q=…) in the browser: navigation book → part → chapter
// with breadcrumbs, prev/next across books (buttons and Shift+arrows), stable deep links (?s=<segment>), free reading
// never marks the daily lessons, search with/without niqqud, offline through the service worker, axe at 320/390/1024.
import test from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, progressOf, PREFS, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const reader = async (p, title) => p.waitForFunction(t => document.title.startsWith(t) && !!document.querySelector('#rc .seg'), title);
const searchDone = p => p.waitForFunction(() => document.body.dataset.searchDone && !document.querySelector('#gs-st').textContent.includes('…'), null, { timeout: 20000 });
const axe = async (p, sel) => (await new AxeBuilder({ page: p }).include(sel).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

test('library: menu → book → part → chapter, breadcrumbs, prev/next across books, keyboard, no daily marks', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/'); await p.waitForSelector('.hero-tools');
  assert.equal(await p.getAttribute('html', 'dir'), 'rtl');
  await p.click('.hero-tools a[href="#/lib"]'); await p.waitForSelector('.lib-fams');
  const fams = await p.$$eval('.lib-card b', a => a.map(x => x.textContent));
  for (const w of ['חומש', 'תהילים', 'תניא', 'רמב', 'ספר המצוות', 'תורה אור', 'שולחן ערוך', 'סידור']) assert.ok(fams.some(f => f.includes(w)), w + ' in ' + fams);
  await p.click('.lib-card[href="#/lib/torah"]'); await p.waitForSelector('h1 >> text=חומש');
  await p.click('a[href="#/lib/torah/Genesis"]'); await p.waitForSelector('.lib-grid');
  assert.equal(await p.$$eval('.lib-grid a', a => a.length), 50);
  assert.deepEqual(await p.$$eval('.lib-crumbs a', a => a.map(x => x.textContent)), ['ספרייה', 'חומש']);
  await p.click('a[href="#/lib/torah/Genesis/50"]'); await reader(p, 'בראשית פרק נ');
  assert.deepEqual(await p.$$eval('#rc .lib-crumbs a', a => a.map(x => x.getAttribute('href'))), ['#/lib', '#/lib/torah', '#/lib/torah/Genesis']);
  assert.equal(await p.getAttribute('#rt > a.btn', 'href'), '#/lib/torah/Genesis');
  // next crosses into the next book; Shift+→ (previous in RTL) comes back
  await p.click('.daynav-top [data-day="next"]'); await reader(p, 'שמות פרק א');
  assert.equal(await p.evaluate(() => location.hash), '#/lib/torah/Exodus/1');
  await p.keyboard.press('Shift+ArrowRight'); await reader(p, 'בראשית פרק נ');
  // the end of the chapter offers the next one
  assert.match(await p.textContent('#rc'), /סוף בראשית פרק נ[\s\S]*להמשך: שמות פרק א/);
  // free reading keeps its own place and never touches the daily lessons
  await p.evaluate(() => [...document.querySelectorAll('#rc .seg')].at(-1).scrollIntoView());
  await p.waitForTimeout(800);
  await p.goto(srv.url + '#/'); await p.waitForSelector('.hero-tools');
  const keys = Object.keys(await progressOf(p));
  assert.ok(keys.length && keys.every(k => k.startsWith('lib|')), 'progress keys: ' + keys);
  assert.match(await p.textContent('body'), /0 מתוך \d+ נלמדו/);
  // keyboard: Tab reaches the library from the home page and Enter opens it
  await p.goto(srv.url + '#/lib'); await p.waitForSelector('.lib-fams');
  await p.focus('.lib-card[href="#/lib/tanya"]'); await p.keyboard.press('Enter'); await p.waitForSelector('h1 >> text=תניא');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('library: stable deep links to a chapter and a verse/halacha, also after a reload; unknown paths say so', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/lib/torah/Deuteronomy/6?s=6%3A4'); await reader(p, 'דברים פרק ו');
  await p.waitForSelector('.seg.seek-hit');
  assert.match(await p.$eval('.seg.seek-hit', e => e.textContent.replace(/[\u0591-\u05C7]/g, '')), /שמע ישראל/);
  await p.reload(); await reader(p, 'דברים פרק ו'); await p.waitForSelector('.seg.seek-hit');
  await p.goto(srv.url + '#/lib/rambam/Foundations_of_the_Torah/1?s=Foundations_of_the_Torah.1.1'); await reader(p, 'הלכות יסודי התורה פרק א');
  for (const [h, t] of [['#/lib/tehillim/23', 'תהילים כג'], ['#/lib/tanya/LA/1', 'ליקוטי אמרים'], ['#/lib/mitzvot/P/1', 'מצות עשה א'], ['#/lib/rav/158', ''], ['#/lib/tolt/bereshit/1', ''], ['#/lib/tehillim/m/1', '']]) {
    await p.goto(srv.url + h);
    // wait for THIS doc (the previous leaf's segments are still on screen until the new one renders)
    const ok = await p.waitForFunction(([h, t]) => location.hash === h && document.querySelector('#rc .seg') && (!t || document.title.includes(t) || document.querySelector('#rc').textContent.includes(t)), [h, t], { timeout: 15000 }).then(() => true, () => false);
    assert.ok(ok, h);
  }
  await p.goto(srv.url + '#/lib/torah/Genesis/77'); await p.waitForSelector('[role="alert"], #r-retry');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('search: with or without niqqud, grouped by book, link opens the verse', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/lib'); await p.fill('.lib-search input', 'שמע ישראל'); await p.press('.lib-search input', 'Enter');
  await searchDone(p);
  assert.match(await p.evaluate(() => location.hash), /^#\/search\?q=/);
  const plain = await p.$$eval('.gs-book h2', a => a.map(x => x.textContent));
  await p.fill('#gs-q', 'שְׁמַע יִשְׂרָאֵל'); await p.evaluate(() => delete document.body.dataset.searchDone); await p.press('#gs-q', 'Enter'); await searchDone(p);
  assert.deepEqual(await p.$$eval('.gs-book h2', a => a.map(x => x.textContent)), plain);
  assert.ok(plain.some(h => h.includes('דברים')));
  const deut = p.locator('section[aria-labelledby="gs-h-torah-Deuteronomy"]');
  if (await deut.locator('.gs-more').count()) await deut.locator('.gs-more').click();
  const link = deut.locator('a[href="#/lib/torah/Deuteronomy/6?s=6%3A4"]');
  assert.equal(await link.count(), 1);
  assert.match(await link.locator('xpath=..').textContent(), /שמע ישראל יהוה אלהינו יהוה אחד/);
  await link.click(); await reader(p, 'דברים פרק ו'); await p.waitForSelector('.seg.seek-hit');
  // scope + ktiv + gershayim
  await p.goto(srv.url + '#/search?q=' + encodeURIComponent('רמב"ם') + '&in=tanya'); await searchDone(p);
  assert.equal(await p.$eval('#gs-scope', s => s.value), 'tanya');
  assert.deepEqual(await p.$$eval('.gs-book h2', a => a.map(x => x.textContent.split(' (')[0])), ['תניא']);
  await p.goto(srv.url + '#/search?q=' + encodeURIComponent('א')); await p.waitForFunction(() => /שתי אותיות/.test(document.querySelector('#gs-st').textContent));
  const stats = await p.evaluate(() => import('./js/library-ui.js').then(m => m.searchStats.last));
  assert.ok(stats.firstMs < 3000 && stats.totalMs < 10000, JSON.stringify(stats));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('search and library are local: no request leaves the site', { skip }, async () => {
  const p = await pageWith(browser, srv.url); const out = [];
  p.on('request', r => { if (!r.url().startsWith(srv.url) && !r.url().startsWith('data:')) out.push(r.url()); });
  await p.goto(srv.url + '#/search?q=' + encodeURIComponent('יסוד היסודות')); await searchDone(p);
  await p.goto(srv.url + '#/lib/torah/Genesis/1'); await reader(p, 'בראשית פרק א');
  assert.deepEqual(out, []);
  await p.context().close();
});

test('offline: a chapter, a list and a search that were opened once work without the network', { skip }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });   // service worker allowed
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message + ' @ ' + p.url() + ' ' + e.stack?.split('\n')[1]));
  await p.addInitScript(pr => { if (!localStorage.getItem('chitas-reader.v1')) localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: {} })); }, PREFS);
  await p.goto(srv.url + '#/'); await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
  await p.goto(srv.url + '#/lib/torah/Genesis'); await p.waitForSelector('.lib-grid');
  await p.goto(srv.url + '#/lib/torah/Genesis/1'); await reader(p, 'בראשית פרק א');
  await p.goto(srv.url + '#/search?q=' + encodeURIComponent('בראשית ברא')); await searchDone(p);
  await p.waitForTimeout(500);
  await ctx.setOffline(true);
  await p.goto(srv.url + '#/lib/torah/Genesis/1?s=1%3A2'); await p.reload(); await reader(p, 'בראשית פרק א'); await p.waitForSelector('.seg.seek-hit');
  await p.goto(srv.url + '#/lib/torah/Genesis'); await p.waitForSelector('.lib-grid');
  await p.evaluate(() => delete document.body.dataset.searchDone);
  await p.goto(srv.url + '#/search?q=' + encodeURIComponent('בְּרֵאשִׁית בָּרָא')); await searchDone(p);
  assert.match(await p.textContent('#gs-st'), /נמצאו/);
  assert.ok(await p.$('a[href="#/lib/torah/Genesis/1?s=1%3A1"]'));
  assert.doesNotMatch(await p.textContent('#gs-st'), /לא נבדקו/);
  assert.deepEqual(p.errors, []);
  await ctx.close();
});

for (const width of [320, 390, 1024]) test(`accessibility and layout at ${width}px: library, a list, a chapter, search`, { skip }, async () => {
  const p = await pageWith(browser, srv.url, { viewport: { width, height: 800 } });
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  for (const [h, ready, sel] of [['#/lib', '.lib-fams', '#view'], ['#/lib/rambam', '.lib-list', '#view'], ['#/lib/torah/Genesis', '.lib-grid', '#view'],
    ['#/search?q=' + encodeURIComponent('נטילת ידים'), '.gs-book', '#view'], ['#/lib/tehillim/23?s=23%3A1', '#rc .seg', '#reader']]) {
    await p.goto(srv.url + h); await p.waitForSelector(ready); if (h.startsWith('#/search')) await searchDone(p); await p.waitForTimeout(200);
    assert.deepEqual(await axe(p, sel), [], `${h} at ${width}`);
    assert.ok(await wide() <= 1, `${h} scrolls sideways at ${width}`);
  }
  await p.goto(srv.url + '#/'); await p.waitForSelector('.hero-tools');
  assert.deepEqual(await axe(p, '.hero'), []);
  // the hero buttons do not overlap the date text
  const ov = await p.evaluate(() => { const a = document.querySelector('.hero-tools').getBoundingClientRect(); return [...document.querySelectorAll('.hero > :not(.hero-tools)')].some(e => { const b = e.getBoundingClientRect(); return b.width && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom); }); });
  assert.equal(ov, false);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
