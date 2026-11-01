import { chromium } from 'playwright-core';
import fs from 'node:fs';
const svg = fs.readFileSync('site/icons/icon.svg','utf8');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage();
for (const [n, s, pad] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-512-maskable', 512, 60]]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<body style="margin:0;background:#f6f1e3"><div style="padding:${pad}px">${svg.replace('<svg ', `<svg width="${s-2*pad}" height="${s-2*pad}" `)}</div></body>`);
  await p.screenshot({ path: `site/icons/${n}.png` });
}
await b.close();
