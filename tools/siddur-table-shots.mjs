// Screenshots of the siddur's tables (Ana Bekoach, Hallel, Kedusha, the Omer chart, the zemirot…) on a phone and a
// desktop. Run: node tools/siddur-table-shots.mjs [baseUrl] [outDir] [prefix]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:8765/';
const out = process.argv[3] || 'screenshots';
const pre = process.argv[4] || '';
const CASES = [
  ['ana-boker', 'boker/5', 'אָנָּא בְּכֹחַ'],
  ['ana-kabbalat', 'kabbalat/2', 'אָנָּא בְּכֹחַ'],
  ['ana-mincha', 'mincha/1', 'אָנָּא בְּכֹחַ'],
  ['omer-chart', 'omer/1', 'הַיּוֹם יוֹם אֶחָד'],
  ['hallel-hodu', 'rc/1', 'יֹאמַר נָא'],
  ['kedusha-shacharit', 'shacharit/3', 'נַקְדִּישָׁךְ'],
  ['azamer', 'shabbatbook/3', 'אֲזַמֵּר בִּשְׁבָחִין'],
  ['asader', 'shabbatbook/4', 'אֲסַדֵּר לִסְעוּדָתָא'],
  ['shema-hine', 'shema/1', 'הִנֵּה מִטָּתוֹ'],
  ['boker-maavir', 'boker/1', 'הַמַּעֲבִיר שֵׁנָה'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const errors = [];
for (const [name, hash, find] of CASES) {
  if (only && !only.includes(name)) continue;
  for (const [dev, w, h] of [['390', 390, 844], ['desktop', 1280, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'he-IL', serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ': ' + e.message));
    await p.addInitScript(() => localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: { layout: 'scroll' }, progress: {} })));
    await p.goto(base + '#/s/' + hash); await p.waitForTimeout(1500);
    const ok = await p.evaluate(f => {
      const strip = s => s.replace(/[\u0591-\u05C7]/g, '');
      const el = [...document.querySelectorAll('.r-content .seg, .r-content tr')].find(e => strip(e.textContent).includes(strip(f)));
      if (!el) return false;
      el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); return true;
    }, find);
    if (!ok) errors.push(`${name}: "${find}" not found`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${pre}${name}-${dev}.png` });
    await ctx.close();
  }
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
