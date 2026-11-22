// 1.0.187 (Dudi): (1) the personal-Tehillim button opens the chapters one after another, not the profiles page;
// (2) an option to say chapter 20, the personal chapters and the Rebbe's chapter before the daily Tehillim, in one flow.
// (3) a real (logical-order) appendix PDF and a tilted table photo are read correctly. All data is synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { itemsToText } from '../site/js/sapach-pdf.js';
const skip = !CHROME && 'no Chrome';
const D = '2026-11-12'; // 2 Kislev 5787 – daily Tehillim 10–17; the Rebbe's chapter 125
const PROFILES = [{ id: 'a1', name: 'יוסי', greg: '2013-05-01' }, { id: 'a2', name: 'רות', greg: '2017-01-10' }, { id: 'a3', name: 'דוד', greg: '2013-06-02' }];
const heads = p => p.locator('#rc h2').allTextContents();

test('home teaser and menu open the continuous personal sequence; it reads like the regular Tehillim', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { tehillimProfiles: PROFILES, tehillimRebbe: true }, viewport: { width: 360, height: 780 } });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#pt-teaser');
    assert.equal(await p.getAttribute('#pt-teaser', 'href'), '#/tehillim/seq');
    assert.equal(await p.locator('.home-foot a[href="#/tehillim/seq"], nav a[href="#/tehillim/seq"], a[href="#/tehillim/seq"]').count() >= 1, true);
    await p.click('#pt-teaser');
    await p.waitForSelector('#reader:not([hidden]) #rc .seg');
    // יוסי and דוד (born a month apart, both 13) share chapter 14 – said once
    assert.deepEqual(await heads(p), ['מזמור יד – יוסי, דוד', 'מזמור י – רות', 'מזמור קכה – פרק הרבי']);
    assert.match(await p.textContent('#rc'), /[\u05B0-\u05BC]/, 'vocalised');
    const ids = await p.locator('#rc .seg').evaluateAll(els => els.map(e => e.dataset.id));
    assert.equal(new Set(ids).size, ids.length, 'unique segment ids');
    assert.ok(ids[0].startsWith('p0_14:'));
    assert.ok(await p.locator('#b-tts').count(), 'read-aloud');
    assert.equal(await p.getAttribute('#b-home', 'href'), '#/');
    assert.ok(await p.locator('#rc a[href="#/tehillim"]').count(), 'a way to the profiles page');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(ov <= 0, `overflow ${ov}`);
    assert.deepEqual((await new AxeBuilder({ page: p }).analyze()).violations.map(v => v.id), []);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('with nobody configured the button opens the profiles page', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, {});
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#app');
    assert.equal(await p.locator('#pt-teaser').count(), 0);
    assert.ok(await p.locator('a[href="#/tehillim"]').count() >= 1);
    await p.goto(srv.url + '#/tehillim/seq'); await p.waitForSelector('#pt-form');
    assert.equal(await p.evaluate(() => location.hash), '#/tehillim');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('before the daily Tehillim: chapter 20, the personal chapters, the Rebbe – then the day, one document', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { tehillimProfiles: PROFILES, tehillimPre20: true, tehillimPrePersonal: true, tehillimPreRebbe: true } });
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#reader:not([hidden]) #rc .seg');
    const h = await heads(p);
    assert.deepEqual(h.slice(0, 5), ['מזמור כ', 'מזמור יד – יוסי, דוד', 'מזמור י – רות', 'מזמור קכה – פרק הרבי', 'תהילים י–יז – תהילים היומי']);
    assert.equal(h[5], 'מזמור י');
    const ids = await p.locator('#rc .seg').evaluateAll(els => els.map(e => e.dataset.id));
    assert.equal(new Set(ids).size, ids.length, 'chapter 10 (personal and daily) is two separate copies');
    assert.ok(ids.includes('p2_10:1') && ids.includes('10:1'));
    assert.match(await p.textContent('#r-s'), /לפני השיעור: כ, יד, י, קכה/);
    assert.deepEqual(p.errors, []);
    // home card says so
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#app [data-what]');
    await p.waitForFunction(() => /לפני: כ, יד, י, קכה/.test(document.querySelector('#app').textContent));
  } finally { await b.close(); srv.close(); }
});

test('the option is off by default; settings and the profiles page both switch it', { skip }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { tehillimProfiles: PROFILES } });
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#reader:not([hidden]) #rc .seg');
    assert.equal((await heads(p))[0], 'מזמור י');
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('input[name=tehillimPre20]');
    for (const n of ['tehillimPre20', 'tehillimPrePersonal', 'tehillimPreRebbe']) assert.equal(await p.isChecked(`input[name=${n}]`), false);
    await p.check('input[name=tehillimPre20]');
    await p.goto(srv.url + '#/tehillim'); await p.waitForSelector('#pt-pre20');
    assert.equal(await p.isChecked('#pt-pre20'), true);
    await p.check('#pt-preR');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
    assert.equal(st.tehillimPre20, true); assert.equal(st.tehillimPreRebbe, true); assert.equal(st.tehillimPrePersonal, false);
    await p.goto(srv.url + `#/r/tehillim/${D}`); await p.waitForSelector('#reader:not([hidden]) #rc .seg');
    assert.deepEqual((await heads(p)).slice(0, 3), ['מזמור כ', 'מזמור קכה – פרק הרבי', 'תהילים י–יז – תהילים היומי']);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('PDF text in logical order (gov.il / Word / Chrome) is not reversed; reversed-glyph PDFs still flip', () => {
  const it = (str, x, y) => ({ str, dir: /[\u05D0-\u05EA]/.test(str) ? 'rtl' : 'ltr', transform: [1, 0, 0, 1, x, y] });
  const logical = [it('מספר זהות:', 529, 759), it('000000018', 456, 759), it('שם פרטי: אברהם', 240, 759), it('דוד', 491, 625), it('20/07/2010', 380, 625), it('000000034', 516, 625)];
  assert.equal(itemsToText(logical), 'מספר זהות: 000000018 שם פרטי: אברהם\n000000034 דוד 20/07/2010');
  const flip = s => [...s].reverse().join('');
  const reversed = [it(flip('שם פרטי') + ' ' + flip('דני'), 300, 700), it(flip('תאריך לידה') + ' 20.07.2010', 300, 680)];
  assert.match(itemsToText(reversed), /שם פרטי|דני/);
});

test('a logical-order appendix PDF reaches the review list with every child on its own row', { skip, timeout: 60000 }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + '#/tehillim'); await p.waitForSelector('#pt-sapach-upload-btn');
    await p.setInputFiles('#pt-sapach-upload', { name: 'sapach.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(new URL('./fixtures/sapach-table-logical.pdf', import.meta.url)) });
    await p.waitForFunction(() => document.querySelectorAll('.pt-rev-item').length > 0, { timeout: 45000 });
    const names = await p.locator('.pt-rev-name').evaluateAll(els => els.map(e => e.value));
    const dates = await p.locator('.pt-rev-greg').evaluateAll(els => els.map(e => e.value));
    const on = await p.locator('.pt-rev-on').evaluateAll(els => els.map(e => e.checked));
    assert.deepEqual(names, ['אברהם ישראלי', 'שרה', 'דוד', 'רבקה', 'יעקב']);
    assert.deepEqual(dates, ['', '15/03/1982', '20/07/2010', '03/11/2013', '03/11/2013']);
    assert.deepEqual(on, [false, true, true, true, true], 'the holder (no date on the appendix) starts unchecked');
    assert.match(await p.textContent('.pt-rev-item >> nth=0'), /לא מופיע בספח/);
    await p.click('#pt-review-add');
    await p.waitForFunction(() => document.querySelectorAll('.pt-item').length === 4);
    const raw = await p.evaluate(() => localStorage.getItem('chitas-reader.v1'));
    assert.ok(!/0000000\d\d/.test(raw));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('a tilted, unevenly lit photo of a ruled table: every child row is read (on-device OCR)', { skip, timeout: 180000 }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, {});
    await p.goto(srv.url + '#/tehillim'); await p.waitForSelector('#pt-sapach-btn');
    const people = await p.evaluate(async () => {
      const face = new FontFace('H', 'url(fonts/NotoSerifHebrew.woff2)'); await face.load(); document.fonts.add(face);
      const c = document.createElement('canvas'); c.width = 1400; c.height = 1300; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 1400, 1300); x.fillStyle = '#000'; x.direction = 'rtl'; x.textAlign = 'right'; x.font = '40px H';
      ['מדינת ישראל - משרד הפנים', 'ספח לתעודת זהות', 'מספר זהות: 000000018   שם משפחה: ישראלי   שם פרטי: אברהם', 'מען: רחוב הרצל 12 תל אביב', 'מצב אישי: נשוי',
        'בן/בת זוג: שרה   מספר זהות: 000000026   תאריך לידה: 15/03/1982', 'ילדים'].forEach((l, i) => x.fillText(l, 1350, 70 + i * 70));
      const cols = [1350, 1050, 800, 450];
      [['מספר זהות', 'שם פרטי', 'תאריך לידה', 'מין'], ['000000034', 'דוד', '20/07/2010', 'ז'], ['000000042', 'רבקה', '03/11/2013', 'נ'], ['000000059', 'יעקב', '03/11/2013', 'ז'], ['000000067', 'בת שבע', '05/06/2016', 'נ']]
        .forEach((r, i) => { const y = 600 + i * 80; r.forEach((t, j) => x.fillText(t, cols[j] - 20, y)); x.beginPath(); x.moveTo(50, y + 25); x.lineTo(1360, y + 25); x.stroke(); });
      cols.forEach(cx => { x.beginPath(); x.moveTo(cx, 545); x.lineTo(cx, 1000); x.stroke(); });
      x.fillText('תאריך הנפקה: 01/01/2020', 1350, 1100);
      const c2 = document.createElement('canvas'); c2.width = 1500; c2.height = 1400; const y2 = c2.getContext('2d');
      const gr = y2.createLinearGradient(0, 0, 1500, 1400); gr.addColorStop(0, '#d8d2c4'); gr.addColorStop(1, '#a9a49a'); y2.fillStyle = gr; y2.fillRect(0, 0, 1500, 1400);
      y2.translate(750, 700); y2.rotate(1.2 * Math.PI / 180); y2.filter = 'blur(0.8px)'; y2.globalCompositeOperation = 'multiply'; y2.drawImage(c, -700, -650);
      const url = c2.toDataURL('image/jpeg', 0.7);
      const { recognizeSapachReadings } = await import('./js/sapach-ocr.js');
      const { parseSapachText, pickReading } = await import('./js/sapach.js');
      return parseSapachText(pickReading(await recognizeSapachReadings(url))).people.map(q => `${q.name.replace(/\s+/g, '')}|${q.greg}`);
    });
    for (const want of ['שרה|1982-03-15', 'דוד|2010-07-20', 'רבקה|2013-11-03', 'יעקב|2013-11-03', 'בתשבע|2016-06-05']) assert.ok(people.includes(want), `${want} in ${people.join(', ')}`);
    assert.ok(!people.some(q => q.endsWith('2020-01-01')));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
