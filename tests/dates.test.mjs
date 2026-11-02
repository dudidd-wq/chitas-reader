// Dates as in Israel (request from 2026-11-02): Hebrew date "כ״ב במרחשוון תשפ״ז" next to the Gregorian date in Israeli
// order (2 בנובמבר 2026 / 02/11/2026). ISO (yyyy-mm-dd) only in URLs and storage – never in visible text or labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hebDateHe, gregLongHe, fmtDmy, toHDate, HDate } from '../site/js/calendar.js';
import { serve, launch, pageWith } from './helpers.mjs';

const HEB = JSON.parse(fs.readFileSync(new URL('../verification/hebdate-hebcal.json', import.meta.url)));
const strip = s => s.replace(/[\u0591-\u05C7]/g, '');
const MONTH_EN = { Nisan: 1, Iyyar: 2, Sivan: 3, Tamuz: 4, Av: 5, Elul: 6, Tishrei: 7, Cheshvan: 8, Kislev: 9, Tevet: 10, "Sh'vat": 11, Adar: 12, 'Adar I': 12, 'Adar II': 13 };

test('Hebrew date matches the Hebcal converter for 15 dates (Rosh Hashana, leap Adar I/II, Pesach, year change)', () => {
  assert.ok(HEB.dates.length >= 10);
  for (const d of HEB.dates) {
    const hd = toHDate(d.iso), s = hebDateHe(hd);
    assert.equal(hd.getDate(), d.hd, d.iso); assert.equal(hd.getFullYear(), d.hy, d.iso); assert.equal(hd.getMonth(), MONTH_EN[d.hm], d.iso);
    assert.ok(s.startsWith(d.parts.d + ' ב'), `${d.iso}: ${s} vs ${d.hebrew}`);
    assert.ok(s.endsWith(' ' + d.parts.y), `${d.iso}: ${s}`);
    // same month as Hebcal's Hebrew text (Israeli spelling: מרחשוון for חשון, double vav in סיוון)
    const hm = strip(d.hebrew).split(' ').slice(1, -1).join(' ').replace(/^ב/, '').replace('חשון', 'מרחשוון').replace('סיון', 'סיוון');
    assert.ok(s.includes('ב' + hm), `${d.iso}: ${s} / ${hm}`);
  }
  assert.equal(hebDateHe(toHDate('2026-11-02')), 'כ״ב במרחשוון תשפ״ז');
  assert.equal(hebDateHe(toHDate('2027-03-23')), 'י״ד באדר ב׳ תשפ״ז');
  assert.equal(hebDateHe(toHDate('2028-02-29')), 'ב׳ באדר תשפ״ח');
});

test('Gregorian date in Israeli order, independent of the browser locale', () => {
  assert.equal(gregLongHe('2026-11-02'), '2 בנובמבר 2026');
  assert.equal(gregLongHe('2026-11-02', { weekday: true }), 'יום שני, 2 בנובמבר 2026');
  assert.equal(gregLongHe('2026-11-07', { weekday: true }), 'שבת, 7 בנובמבר 2026');
  assert.equal(fmtDmy('2026-03-05'), '05/03/2026');
});

const skip = !(await import('./helpers.mjs')).CHROME && 'no Chrome';
test('no ISO or US-order date in any visible text, title or label; Hebrew + Gregorian date in home and reader headers', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    for (const h of ['#/d/2026-11-02', '#/r/chumash/2026-11-02', '#/r/rambam3/2027-03-23', '#/r/tanya/2026-11-02', '#/settings', '#/about', '#/sources', '#/zmanim/2026-11-06']) {
      await p.goto(srv.url + h); await p.waitForTimeout(900);
      const bad = await p.evaluate(() => {
        const out = [], iso = /\b\d{4}-\d{2}-\d{2}\b/, us = /\b(1[0-2]|0?[1-9])\/(3[01]|[12]\d|0?[1-9])\/\d{4}\b/;
        const seen = t => iso.test(t) || (us.test(t) && !/\b(3[01]|[12]\d|0?[1-9])\/(1[0-2]|0?[1-9])\/\d{4}\b/.test(t));
        if (seen(document.title)) out.push('title: ' + document.title);
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const el = n.parentElement; if (el.closest('[hidden],script,style') || !el.getClientRects().length) continue; if (iso.test(n.textContent)) out.push('text: ' + n.textContent.trim().slice(0, 80)); }
        for (const e of document.querySelectorAll('[aria-label],[title],[placeholder],input[type=text]')) for (const a of ['aria-label', 'title', 'placeholder', 'value']) { const v = a === 'value' ? e.value : e.getAttribute(a); if (v && iso.test(v)) out.push(`${a}: ${v}`); }
        return out;
      });
      assert.deepEqual(bad, [], h);
    }
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('.hero .hd');
    assert.equal(await p.$eval('.hero .hd', e => e.textContent), 'כ״ב במרחשוון תשפ״ז');
    assert.match(await p.$eval('.hero .sub', e => e.textContent), /^2 בנובמבר 2026 · /);
    assert.equal(await p.$eval('#datepick', e => e.value), '02/11/2026');
    assert.match(await p.title(), /כ״ב במרחשוון תשפ״ז \(02\/11\/2026\)/);
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg');
    assert.match(await p.$eval('#r-s', e => e.textContent), /^כ״ב במרחשוון תשפ״ז · 02\/11\/2026/);
    assert.match(await p.$eval('.doc-kicker', e => e.textContent), /כ״ב במרחשוון תשפ״ז · 2 בנובמבר 2026/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
