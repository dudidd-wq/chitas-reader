// Shared helpers for browser (Playwright) regression tests: a tiny static server for site/ and a Chrome launcher.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = new URL('../site/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
export function serve(root = ROOT, log = null) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      log?.push(p);
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}
export const CHROME = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
export const launch = () => chromium.launch({ executablePath: CHROME });
/** Default test prefs: location already chosen (skips the first-run question). */
export const PREFS = { il: true, locationChosen: true };
export async function pageWith(browser, base, { prefs = {}, progress = {}, viewport = { width: 390, height: 800 }, init } = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'he-IL', serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__ttsPauseScale = 0; }); // 1.0.101: do not wait out comma/period gaps in tests
  await p.addInitScript(([pr, pg]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: pg })); sessionStorage.setItem('seeded', '1'); } }, [{ ...PREFS, ...prefs }, progress]);
  if (init) await p.addInitScript(...(Array.isArray(init) ? init : [init]));
  p.errors = errors;
  return p;
}
export const progressOf = p => p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1') || '{}').progress || {});
