import { chromium } from 'playwright-core';
const base = process.argv[2] || 'https://dudidd-wq.github.io/chitas-reader/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const out = [];
for (const [w, h] of [[390, 844], [568, 320], [1366, 800]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#/d/2026-11-02'); await p.waitForSelector('#locq, .card');
  if (await p.isVisible('#locq')) await p.click('#locq [data-il="true"]');
  await p.click('.card [data-go="chumash"]'); await p.waitForSelector('.seg'); await p.waitForTimeout(900);
  const s = await p.evaluate(() => ({ home: getComputedStyle(document.querySelector('#app')).display, info: document.querySelector('#pinfo').textContent, ver: null }));
  const v = await p.evaluate(async () => (await (await fetch('sw.js', { cache: 'no-store' })).text()).match(/VERSION = '([\d.]+)'/)[1]);
  out.push(`${w}x${h}: home display=${s.home}, ${s.info}, sw ${v}, errors ${errs.length}`);
}
await b.close(); console.log(out.join('\n'));
