// File / PDF input for the personal-Tehillim ID appendix: camera stays on one input,
// a second input accepts an existing image or PDF, processed on-device with no upload.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const PDF = fs.readFileSync(new URL('./fixtures/sapach-synthetic.pdf', import.meta.url));

test('camera and file inputs both exist; the file input has no capture and accepts a PDF', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + '#/tehillim');
    await p.waitForSelector('#pt-sapach-btn');
    await p.waitForSelector('#pt-sapach-upload-btn');
    assert.equal(await p.locator('#pt-sapach-file').count(), 1);
    assert.equal(await p.locator('#pt-sapach-upload').count(), 1);
    assert.equal(await p.getAttribute('#pt-sapach-file', 'capture'), 'environment');
    assert.equal(await p.getAttribute('#pt-sapach-upload', 'capture'), null);
    const accept = await p.getAttribute('#pt-sapach-upload', 'accept');
    assert.match(accept, /image\/\*/);
    assert.match(accept, /application\/pdf|\.pdf/);
    assert.match(await p.textContent('#pt-sapach-upload-btn'), /טעינת קובץ \(תמונה או PDF\)/);
    assert.match(await p.textContent('.pt-sapach'), /במכשיר הזה בלבד.*אינם נשלחים ואינם נשמרים/s);
    assert.match(await p.textContent('.pt-privacy'), /PDF/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('a synthetic sapach PDF reaches the review list on-device, with no external requests', { skip, timeout: 60000 }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    const foreign = [];
    p.on('request', r => {
      const u = r.url();
      if (!u.startsWith(srv.url) && !u.startsWith('blob:') && !u.startsWith('data:')) foreign.push(u);
    });
    await p.goto(srv.url + '#/tehillim');
    await p.waitForSelector('#pt-sapach-upload-btn');
    await p.setInputFiles('#pt-sapach-upload', { name: 'sapach.pdf', mimeType: 'application/pdf', buffer: PDF });
    await p.waitForFunction(() => document.querySelectorAll('.pt-rev-item').length > 0 || /נכשלה|לא זוהו/.test(document.querySelector('#pt-sapach-st')?.textContent || ''), { timeout: 45000 });
    const status = await p.textContent('#pt-sapach-st');
    const n = await p.locator('.pt-rev-item').count();
    const names = n ? await p.locator('.pt-rev-name').evaluateAll(els => els.map(e => e.value).join(' | ')) : '';
    const dates = n ? await p.locator('.pt-rev-greg').evaluateAll(els => els.map(e => e.value).join(' | ')) : '';
    const dump = names + ' ' + dates + ' ' + status;
    assert.doesNotMatch(dump, /012345678/);
    assert.deepEqual(foreign, [], 'PDF reading must not call any external host: ' + foreign.join(', '));
    assert.ok(n >= 3, `expected three people from the PDF text layer, got ${n} (${status}) names=${names} dates=${dates}`);
    assert.match(names, /כהן/);
    assert.match(names, /יוסי/);
    assert.match(names, /שרה/);
    assert.match(names, /דני/);
    assert.match(dates, /1980/);
    assert.match(dates, /1982/);
    assert.match(dates, /2010/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('SW does not precache PDF.js; it is kept in a separate optional cache, with a license file', () => {
  const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  const assets = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf("self.addEventListener('install'"));
  assert.doesNotMatch(assets, /vendor\/pdfjs|pdf\.min\.mjs|pdf\.worker/);
  assert.match(assets, /js\/sapach-pdf\.js/);
  assert.match(sw, /optional-pdfjs-v1/);
  assert.match(sw, /vendor\\\/pdfjs/);
  const notice = fs.readFileSync(new URL('../site/vendor/pdfjs/NOTICE.txt', import.meta.url), 'utf8');
  const license = fs.readFileSync(new URL('../site/vendor/pdfjs/LICENSE', import.meta.url), 'utf8');
  const about = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  const notices = fs.readFileSync(new URL('../site/THIRD-PARTY-NOTICES.txt', import.meta.url), 'utf8');
  assert.match(notice, /Apache-2\.0/);
  assert.match(notice, /6\.5\.438/);
  assert.match(license, /Apache License/);
  assert.ok(fs.existsSync(new URL('../site/vendor/pdfjs/pdf.min.mjs', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../site/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url)));
  assert.match(about, /id="sapach-src"/);
  assert.match(about, /PDF\.js/);
  assert.match(about, /vendor\/pdfjs\/LICENSE/);
  assert.match(notices, /PDF\.js 6\.5\.438/);
});
