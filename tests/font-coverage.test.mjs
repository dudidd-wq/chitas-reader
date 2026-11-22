// Full official Ezra SIL 2.51 (taamim + GPOS) and a settings table whose facts
// are computed from the shipped font files, not guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { serve, launch, pageWith, openChrome } from './helpers.mjs';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(new URL(p, root))).digest('hex');

function coverage() {
  const out = execFileSync('python3', [new URL('tools/font-coverage.py', root).pathname], { encoding: 'utf8' });
  return JSON.parse(out);
}

const EXPECTED_ROWS = {
  noto:        { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'מלאכותית (רגיל בלבד)', license: 'OFL 1.1' },
  ezra:        { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'מלאכותית (רגיל בלבד)', license: 'OFL 1.1' },
  frank:       { niqqud: 'חלקי: חסרות נקודה עליונה ותחתונה', taamim: 'אין', rashi: 'לא', bold: 'אמיתית (משתנה 300–900)', license: 'OFL 1.1' },
  ashkenaz:    { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'אמיתית (רגיל ומודגש)', license: 'GPLv2 + חריגת הטמעה' },
  sbl:         { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'מלאכותית (רגיל בלבד)', license: 'SBL, לא מסחרי' },
  'noto-rashi':{ niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'כן', bold: 'אמיתית (משתנה 100–900)', license: 'OFL 1.1' },
  'taamey-d':  { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'מלאכותית (Medium בלבד)', license: 'GPLv2 + חריגת הטמעה' },
  'keter-yg':  { niqqud: 'מלא', taamim: 'מלאים (31)', rashi: 'לא', bold: 'מלאכותית (Medium בלבד)', license: 'GPLv2 + חריגת הטמעה' },
  david:       { niqqud: 'חלקי: חסר מתג', taamim: 'אין', rashi: 'לא', bold: 'אמיתית (רגיל ומודגש)', license: 'OFL 1.1' },
  assistant:   { niqqud: 'חלקי: חסרים מתג ונקודות עליונה/תחתונה', taamim: 'אין', rashi: 'לא', bold: 'אמיתית (משתנה 200–800)', license: 'OFL 1.1' },
};

test('font-coverage.py reports Ezra SIL 2.51 full marks and matches the settings table', () => {
  const cov = coverage();
  assert.equal(cov.ezra.taamim, 31);
  assert.equal(cov.ezra.niqqud_present, 20);
  assert.deepEqual(cov.ezra.niqqud_missing, []);
  assert.equal(cov.ezra.gpos_mark_to_base, true);
  assert.equal(cov.ezra.gpos_mark_to_mark, true);
  assert.equal(cov.ezra.faces[0].family, 'Ezra SIL');
  assert.match(cov.ezra.faces[0].version, /2\.51/);
  assert.equal(cov.ezra.punct.maqaf, true);
  assert.equal(cov.ezra.punct.paseq, true);
  assert.equal(cov.ezra.punct['sof pasuq'], true);
  assert.equal(cov.ezra.punct['nun hafukha'], true);
  assert.equal(cov.ezra.punct.geresh, true);
  assert.equal(cov.ezra.punct.gershayim, true);
  assert.equal(cov.ezra.marks_05B0_05C7, 24);
  assert.equal(sha('site/fonts/EzraSIL.woff2'), '57c96c7dc045def72e0447ec7e9b64614f9dd93aeab482fffc4e242b265194f3');
  assert.match(read('site/fonts/licenses/EzraSIL-OFL.txt'), /SIL Open Font License, Version 1\.1/);
  assert.match(read('site/fonts/licenses/EzraSIL-OFL.txt'), /Reserved Font Names "SIL" and "Ezra"/);

  // Facts in the table must follow the files, not a guessed list.
  const rowOf = id => {
    const wantTaam = cov[id].taamim === 31 ? 'מלאים (31)' : cov[id].taamim === 0 ? 'אין' : `חלקי (${cov[id].taamim}/31)`;
    let wantNiq = 'מלא';
    if (cov[id].niqqud_missing.length) {
      const miss = cov[id].niqqud_missing;
      if (miss.length === 1 && miss[0].includes('meteg')) wantNiq = 'חלקי: חסר מתג';
      else if (miss.length === 2 && miss.some(s => s.includes('upper')) && miss.some(s => s.includes('lower'))) wantNiq = 'חלקי: חסרות נקודה עליונה ותחתונה';
      else if (miss.some(s => s.includes('meteg')) && miss.some(s => s.includes('upper'))) wantNiq = 'חלקי: חסרים מתג ונקודות עליונה/תחתונה';
      else wantNiq = 'חלקי';
    }
    return { taamim: wantTaam, niqqud: wantNiq, rashi: id === 'noto-rashi' ? 'כן' : 'לא', realBold: cov[id].real_bold };
  };
  for (const id of Object.keys(EXPECTED_ROWS)) {
    const computed = rowOf(id);
    assert.equal(EXPECTED_ROWS[id].taamim, computed.taamim, id + ' taamim');
    assert.equal(EXPECTED_ROWS[id].niqqud, computed.niqqud, id + ' niqqud');
    assert.equal(EXPECTED_ROWS[id].rashi, computed.rashi, id + ' rashi');
    assert.equal(EXPECTED_ROWS[id].bold.startsWith('אמיתית'), computed.realBold, id + ' bold');
    assert.equal(EXPECTED_ROWS[id].bold.startsWith('מלאכותית'), !computed.realBold, id + ' synthetic');
  }

  const app = read('site/js/app.js');
  assert.doesNotMatch(app, /v === 'frank' \|\| v === 'ezra'/);
  assert.match(app, /el\.name === 'font' && v === 'frank'/);
  assert.doesNotMatch(app, /\['frank', 'ezra', 'david', 'assistant'\]/);
  assert.match(app, /\['frank', 'david', 'assistant'\]/);
  assert.doesNotMatch(app, /בפרנק־רוהל ובעזרא הטעמים מוסתרים/);
  assert.doesNotMatch(app, /בגופני פרנק ועזרא טעמי המקרא מוסתרים/);
  assert.match(app, /Ezra SIL 2\.51/);
  assert.match(app, /software\.sil\.org\/ezra/);
  assert.match(app, /class="font-cov-table"/);
  for (const [id, row] of Object.entries(EXPECTED_ROWS)) {
    const m = app.match(new RegExp(`<tr data-font="${id}">([\\s\\S]*?)</tr>`));
    assert.ok(m, 'row ' + id);
    const text = m[1].replace(/<[^>]+>/g, '');
    for (const v of Object.values(row)) assert.ok(text.includes(v), `${id} missing ${v}`);
  }
  assert.match(read('site/sw.js'), /fonts\/EzraSIL\.woff2/);
});

test('Chumash in Ezra keeps taamim; selecting Ezra does not clear the preference; Frank/David/Assistant still hide', async () => {
  const srv = await serve(), browser = await launch();
  try {
    const p = await pageWith(browser, srv.url, { prefs: { font: 'ezra', layout: 'scroll', taamim: true, rashi: false }, viewport: { width: 390, height: 900 } });
    await p.goto(srv.url + '#/lib/torah/Genesis/1');
    await p.waitForSelector('#rc .seg .t');
    await p.evaluate(() => document.fonts.load('24px "Ezra SIL"'));
    const first = p.locator('#rc .seg .t').first();
    const text = await first.textContent();
    assert.match(text, /[\u0591-\u05AF]/, 'Ezra must keep cantillation in the Chumash text');
    const family = await first.evaluate(e => getComputedStyle(e).fontFamily);
    assert.match(family, /Ezra SIL/);
    assert.ok(await p.evaluate(() => document.fonts.check('24px "Ezra SIL"')));

    await openChrome(p);
    await p.click('#b-aa', { force: true });
    await p.waitForSelector('#sheet:not([hidden])');
    assert.equal(await p.locator('input[name=taamim]').isChecked(), true);
    // Re-selecting Ezra must not turn the global preference off.
    await p.locator('label:has(input[name=font][value="ezra"])').click();
    assert.equal(await p.locator('input[name=taamim]').isChecked(), true);
    await p.locator('summary:has-text("פרטים על הגופנים")').click();
    const table = p.locator('.font-cov-table');
    await table.waitFor();
    assert.equal(await table.locator('tbody tr').count(), 10);
    // Mobile stacked layout: each fact cell exposes its label, no horizontal overflow of the sheet.
    const layout = await p.evaluate(() => {
      const sheet = document.querySelector('#sheet .form') || document.querySelector('#sheet');
      const table = document.querySelector('.font-cov-table');
      const cs = getComputedStyle(table.querySelector('td'));
      return {
        sheetOverflow: sheet.scrollWidth - sheet.clientWidth,
        tdDisplay: cs.display,
        hasBefore: getComputedStyle(table.querySelector('td'), '::before').content,
        dir: getComputedStyle(table.closest('.font-cov')).direction,
      };
    });
    assert.equal(layout.dir, 'rtl');
    assert.ok(layout.sheetOverflow <= 8, 'table must not widen the settings sheet on a phone: ' + layout.sheetOverflow);
    assert.match(layout.hasBefore, /ניקוד|טעמים|הדגשה|רישיון|רש/);
    const frankBold = await p.locator('tr[data-font="frank"] td[data-label="הדגשה"]').innerText();
    assert.match(frankBold, /300–900/);
    assert.doesNotMatch(frankBold, /900–300/);
    if (process.env.CHITAS_FONT_SHOTS) {
      await p.screenshot({ path: process.env.CHITAS_FONT_SHOTS + '/ezra-settings-table-390.png', fullPage: true });
    }
    await p.click('#sh-x');

    // Hide-list families still strip taamim without requiring a page reload of the preference for david/assistant.
    for (const id of ['frank', 'david', 'assistant']) {
      const q = await pageWith(browser, srv.url, { prefs: { font: id, layout: 'scroll', taamim: true, rashi: false }, viewport: { width: 390, height: 800 } });
      await q.goto(srv.url + '#/lib/torah/Genesis/1');
      await q.waitForSelector('#rc .seg .t');
      const t = await q.locator('#rc .seg .t').first().textContent();
      assert.equal(/[\u0591-\u05AF]/.test(t), false, id + ' must still hide taamim');
      await q.context().close();
    }
    if (process.env.CHITAS_FONT_SHOTS) {
      await p.screenshot({ path: process.env.CHITAS_FONT_SHOTS + '/ezra-genesis-taamim-390.png', fullPage: true });
    }
    assert.deepEqual(p.errors, []);
    await p.context().close();

    const wide = await pageWith(browser, srv.url, { prefs: { font: 'ezra', layout: 'scroll', taamim: true, rashi: false }, viewport: { width: 1100, height: 900 } });
    await wide.goto(srv.url + '#/lib/torah/Genesis/1');
    await wide.waitForSelector('#rc .seg .t');
    await wide.evaluate(() => document.fonts.ready);
    assert.match(await wide.locator('#rc .seg .t').first().textContent(), /[\u0591-\u05AF]/);
    if (process.env.CHITAS_FONT_SHOTS) {
      await wide.screenshot({ path: process.env.CHITAS_FONT_SHOTS + '/ezra-genesis-taamim-1100.png', fullPage: false });
      await openChrome(wide);
      await wide.click('#b-aa', { force: true });
      await wide.waitForSelector('#sheet:not([hidden])');
      await wide.locator('summary:has-text("פרטים על הגופנים")').click();
      await wide.locator('.font-cov-table').waitFor();
      await wide.screenshot({ path: process.env.CHITAS_FONT_SHOTS + '/ezra-settings-table-1100.png', fullPage: true });
    }
    assert.deepEqual(wide.errors, []);
    await wide.context().close();
  } finally {
    await browser?.close();
    srv?.close();
  }
});
