// Visual screenshots of key screens (run: node tools/shots.mjs [baseUrl] [outDir])
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:8765/';
const out = process.argv[3] || 'screenshots';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const errors = [];
async function shot(name, { w = 390, h = 844, hash = '', prefs = null, wait = 1200, action = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'he-IL', serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  if (prefs) await p.addInitScript(pr => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: {} })), prefs);
  await p.goto(base + '#/' + hash); await p.waitForTimeout(wait);
  if (action) await action(p);
  await p.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}
const D = '2026-11-02';
await shot('home-mobile', { hash: 'd/' + D });
await shot('home-desktop', { w: 1280, h: 800, hash: 'd/' + D });
await shot('chumash-paper', { hash: `r/chumash/${D}` });
await shot('chumash-sepia-noRashi', { hash: `r/chumash/${D}`, prefs: { theme: 'sepia', rashi: false } });
await shot('tehillim-night', { hash: `r/tehillim/${D}`, prefs: { theme: 'night' } });
await shot('tanya-dark', { hash: `r/tanya/${D}`, prefs: { theme: 'dark' } });
await shot('rambam3-paper-desktop', { w: 1280, h: 800, hash: `r/rambam3/${D}` });
await shot('rambam1-scroll', { hash: `r/rambam1/${D}`, prefs: { layout: 'scroll', size: 22 } });
await shot('chumash-immersive-landscape', { w: 844, h: 390, hash: `r/chumash/${D}`, action: async p => { await p.mouse.click(422, 200); await p.waitForTimeout(400); } });
await shot('reader-display-sheet', { hash: `r/tanya/${D}`, action: async p => { await p.click('#b-aa'); await p.waitForTimeout(300); } });
await shot('reader-tts-sheet', { hash: `r/tanya/${D}`, action: async p => { await p.click('#b-tts'); await p.waitForTimeout(300); } });
await shot('tehillim-gloss-inline', { hash: `r/tehillim/${D}`, prefs: { gloss: 'inline', layout: 'scroll' }, action: async p => { await p.evaluate(() => document.querySelector('.gl')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); } });
await shot('chumash-gloss-popover', { hash: `r/chumash/${D}`, prefs: { layout: 'scroll' }, action: async p => { const g = p.locator('.gl').first(); if (await g.count()) { await g.scrollIntoViewIfNeeded(); await g.click(); await p.waitForTimeout(300); } else errors.push('no gloss in chumash'); } });
await shot('settings', { hash: 'settings', h: 1600 });
await shot('sources', { hash: 'sources', h: 1400 });
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
