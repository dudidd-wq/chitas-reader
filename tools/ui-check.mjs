// UI checks in headless Chrome: axe-core (WCAG 2.x A/AA) on every screen + no horizontal overflow at 320/360/390 px,
// plus an offline check of the service worker. Run: node tools/ui-check.mjs [baseUrl]  (exit code 1 on failure)
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
const base = process.argv[2] || 'http://localhost:8765/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const D = new Date().toLocaleDateString('sv'), fails = [], log = [];
const screens = [
  ['home', `d/${D}`], ['settings', 'settings'], ['sources', 'sources'], ['about', 'about'],
  ['chumash', `r/chumash/${D}`], ['chumash-scroll-inline-gloss', `r/chumash/${D}`, { layout: 'scroll', gloss: 'inline', rashi: false }],
  ['tehillim', `r/tehillim/${D}`, { gloss: 'inline' }], ['tanya-dark', `r/tanya/${D}`, { theme: 'dark' }],
  ['rambam3-night', `r/rambam3/${D}`, { theme: 'night' }], ['rambam1-sepia-scroll', `r/rambam1/${D}`, { theme: 'sepia', layout: 'scroll', size: 30 }],
  ['siddur-toc', 'siddur'], ['siddur-amida-dark', 's/shacharit/3', { theme: 'dark' }],
  ['siddur-kabbalat-night-abbr', 's/kabbalat/2', { theme: 'night', divine: 'abbr' }],
  ['siddur-hallel-sepia-scroll', 's/rc/1', { theme: 'sepia', layout: 'scroll', size: 30 }],
];
for (const w of [320, 360, 390]) for (const [name, hash, prefs] of screens) {
  const ctx = await b.newContext({ viewport: { width: w, height: 740 }, locale: 'he-IL', serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => fails.push(`${w} ${name}: pageerror ${e.message}`));
  if (prefs) await p.addInitScript(pr => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: {} })), prefs);
  await p.goto(base + '#/' + hash); await p.waitForTimeout(900);
  const ov = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth, bad = [];
    if (document.scrollingElement.scrollWidth > vw + 1) bad.push('document scrollWidth ' + document.scrollingElement.scrollWidth);
    const scrollMode = !document.querySelector('.r-content') || getComputedStyle(document.querySelector('.r-content')).columnWidth === 'auto';
    if (scrollMode) for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[hidden], .sheet:not(.open)') || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > vw + 1) && getComputedStyle(el).position !== 'fixed') { bad.push(`${el.tagName}.${el.className} ${Math.round(r.left)}..${Math.round(r.right)}`); if (bad.length > 4) break; }
    }
    return bad;
  });
  if (ov.length) fails.push(`${w} ${name}: overflow ${ov.join('; ')}`);
  if (w === 390 || w === 320) {
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of r.violations) fails.push(`${w} ${name}: axe ${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes[0].target} ${v.nodes[0].failureSummary?.split('\n')[1] || ''}`);
    log.push(`${w} ${name}: axe ${r.violations.length} violations, ${r.passes.length} rules passed`);
  }
  // sheets
  if (name === 'chumash' && w === 390) for (const id of ['#b-aa', '#b-tts']) {
    await p.click(id, id === '#b-tts' ? { button: 'right' } : {}); await p.waitForTimeout(300);
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
    for (const v of r.violations) fails.push(`${w} ${name}${id}: axe ${v.id} ×${v.nodes.length}: ${v.nodes[0].target}`);
    log.push(`${w} ${name} sheet ${id}: axe ${r.violations.length} violations`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }
  await ctx.close();
}
// offline: install SW, go offline, reload the reader
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 740 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto(base + `#/r/chumash/${D}`); await p.waitForTimeout(1500);
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(6000); // auto-prefetch of today's texts
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(1500);
  const ok = await p.evaluate(() => document.querySelectorAll('.seg').length);
  await p.goto(base + `#/r/tanya/${D}`); await p.waitForTimeout(1200);
  const ok2 = await p.evaluate(() => document.querySelectorAll('.seg').length);
  (ok > 0 && ok2 > 0 ? log : fails).push(`offline reload: chumash segs ${ok}, tanya segs ${ok2}`);
  await ctx.close();
}
await b.close();
console.log(log.join('\n'));
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'ALL UI CHECKS PASS');
process.exit(fails.length ? 1 : 0);
