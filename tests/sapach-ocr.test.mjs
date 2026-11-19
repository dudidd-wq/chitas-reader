// On-device OCR of a synthetic Israeli ID appendix: no upload, review, then only names + birth dates are stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';
const SHOTS = '/workspace/tehillim-shots';

async function syntheticSapachPng(page) {
  return Buffer.from(await page.evaluate(async () => {
    const face = new FontFace('NotoSerifHeb', 'url(fonts/NotoSerifHebrew.woff2)');
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1400; canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1400, 2000);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.font = '48px NotoSerifHeb, serif';
    const lines = [
      'משרד הפנים',
      'ספח תעודת זהות',
      'מספר זהות 012345678',
      'שם משפחה כהן',
      'שם פרטי יוסי',
      'תאריך לידה 01.05.1980',
      '',
      'שם משפחה כהן',
      'שם פרטי שרה',
      'תאריך לידה 15.03.1982',
      'קרבה אשה',
      '',
      'שם משפחה כהן',
      'שם פרטי דני',
      'תאריך לידה 20.07.2010',
      'קרבה בן',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 1320, 90 + i * 80));
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }));
}

test('OCR of a synthetic appendix stays on-device and fills a review list', { skip, timeout: 180000 }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    const foreign = []; p.on('request', r => { const u = r.url(); if (!u.startsWith(srv.url) && !u.startsWith('blob:')) foreign.push(u); });
    await p.goto(srv.url + '#/tehillim'); await p.waitForSelector('#pt-sapach-btn');
    const png = await syntheticSapachPng(p);
    fs.mkdirSync(SHOTS, { recursive: true });
    fs.writeFileSync(SHOTS + '/synthetic-sapach.png', png);
    await p.setInputFiles('#pt-sapach-file', { name: 'sapach.png', mimeType: 'image/png', buffer: png });
    await p.waitForFunction(() => document.querySelectorAll('.pt-rev-item').length > 0 || /נכשלה|לא זוהו/.test(document.querySelector('#pt-sapach-st')?.textContent || ''), { timeout: 150000 });
    const status = await p.textContent('#pt-sapach-st');
    const n = await p.locator('.pt-rev-item').count();
    const names = n ? await p.locator('.pt-rev-name').evaluateAll(els => els.map(e => e.value).join(' | ')) : '';
    const dates = n ? await p.locator('.pt-rev-greg').evaluateAll(els => els.map(e => e.value).join(' | ')) : '';
    const dump = names + ' ' + dates + ' ' + status;
    assert.doesNotMatch(dump, /012345678/);
    assert.deepEqual(foreign, [], 'OCR must not call any external host: ' + foreign.join(', '));
    assert.ok(n >= 2, `expected at least two people from OCR, got ${n} (${status}) names=${names} dates=${dates}`);
    assert.match(names, /כהן|יוסי|שרה|דני/);
    assert.match(dates, /1980|1982|2010|01\/05|15\/03|20\/07/);
    // uncheck one, add the rest, and ensure nothing but name+date is stored
    if (n >= 2) await p.locator('.pt-rev-on').nth(n - 1).uncheck();
    await p.click('#pt-review-add');
    await p.waitForFunction(() => document.querySelectorAll('.pt-item').length >= 1, { timeout: 10000 });
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')));
    const raw = JSON.stringify(st);
    assert.doesNotMatch(raw, /012345678/);
    assert.ok(!raw.includes('data:image') && !raw.includes('image/png'));
    assert.ok(st.prefs.tehillimProfiles.every(x => x.name && x.greg));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('SW does not precache the OCR engine; it is kept in a separate optional cache', () => {
  const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  const assets = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf("self.addEventListener('install'"));
  assert.doesNotMatch(assets, /ocr\/|heb\.traineddata|tesseract-core/);
  assert.match(sw, /optional-ocr-v1/);
  assert.match(sw, /js\/sapach\.js/);
  assert.match(sw, /js\/sapach-ocr\.js/);
  assert.ok(fs.existsSync(new URL('../site/ocr/heb.traineddata', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../site/ocr/tesseract.esm.min.js', import.meta.url)));
  assert.match(fs.readFileSync(new URL('../site/ocr/NOTICE.txt', import.meta.url), 'utf8'), /Apache-2\.0/);
});
