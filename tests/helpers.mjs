// Shared helpers for browser (Playwright) regression tests: a tiny static server for site/ and a Chrome launcher.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../site/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.md': 'text/plain', '.wasm': 'application/wasm', '.traineddata': 'application/octet-stream', '.pdf': 'application/pdf' };
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
export function findChrome() {
  const env = [process.env.CHROME_PATH, process.env.EDGE_PATH, process.env.CHROME_BIN, process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH].filter(Boolean);
  const candidates = [
    ...env,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ...(process.env.LOCALAPPDATA ? [`${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`] : []),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (found) return found;
  try { const pw = chromium.executablePath(); if (pw && fs.existsSync(pw)) return pw; } catch { /* not installed */ }
  return undefined;
}
export const CHROME = findChrome();
export const launch = () => chromium.launch({ executablePath: CHROME });
/** Default test prefs: location already chosen (skips the first-run question). */
export const PREFS = { il: true, locationChosen: true };
export async function pageWith(browser, base, { prefs = {}, progress = {}, viewport = { width: 390, height: 800 }, init } = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'he-IL', serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    window.__ttsPauseScale = 0; window.__chromeIdleMs = 120000;
    // 1.0.224: reading uses on-device Hebrew voices only. Headless Chrome often has none, so ttsToggle would
    // return before Speaker.load and tests that capture the queue would hang. Tests that need another voice
    // list replace speechSynthesis themselves after this.
    const voices = [{ name: 'Test Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'test-he' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false,
      addEventListener() {}, removeEventListener() {},
      speak(u) { setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 3); }, 1); },
    }});
  }); // 1.0.101/121: no comma gaps; keep the nav overlay open while a test clicks it
  await p.addInitScript(([pr, pg]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: pg })); sessionStorage.setItem('seeded', '1'); } }, [{ ...PREFS, ...prefs }, progress]);
  if (init) await p.addInitScript(...(Array.isArray(init) ? init : [init]));
  p.errors = errors;
  return p;
}
export const progressOf = p => p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1') || '{}').progress || {});

/** 1.0.121: open the floating reader nav overlay so bar controls can be used. */
export async function openChrome(p) {
  const fab = p.locator('#b-fab');
  if (!(await fab.count()) || !(await fab.isVisible())) return;
  if (await p.evaluate(() => document.getElementById('reader')?.classList.contains('chrome-on'))) return;
  await fab.click();
  await p.waitForFunction(() => document.getElementById('reader')?.classList.contains('chrome-on'));
  await p.waitForTimeout(350);
}
