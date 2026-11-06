// 1.0.66: specialPrayerFlags only marks true conditional insertions; section markers (א)(ב) are not spoken.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { specialPrayerFlags, markSectionLabels } from '../site/js/texts.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { indexText } from '../site/js/search.js';
import { serve, launch, pageWith } from './helpers.mjs';

const sk = h => String(h).replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');

test('specialPrayerFlags: Akeda and weekday omit-notes are not special', () => {
  const rows = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/boker/3.json', import.meta.url))).b;
  const flags = specialPrayerFlags(rows);
  const akeda = rows.findIndex(([t, h]) => t === 'p' && /ויהי אחר הדברים האלה/.test(sk(h)));
  assert.ok(akeda >= 0);
  assert.equal(flags[akeda], false, 'פרשת העקדה is said every weekday – not sid-special');
  const zochrenu = rows.findIndex(([t, h]) => t === 'p' && /זכרנו בזכרון טוב/.test(sk(h)));
  assert.ok(zochrenu >= 0);
  assert.equal(flags[zochrenu], false, 'omit-on-Shabbat weekday paragraph is not a special insertion');
  const ribono = rows.findIndex(([t, h]) => t === 'p' && /רבונו של עולם, כמו שכבש/.test(sk(h)));
  assert.ok(ribono >= 0);
  assert.equal(flags[ribono], false);
});

test('specialPrayerFlags: Yaaleh / Al Hanisim / Mashiv / Ten Days still special', () => {
  const amidah = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/shacharit/3.json', import.meta.url))).b;
  const flags = specialPrayerFlags(amidah);
  const hit = (...res) => {
    const i = amidah.findIndex(([t, h]) => t === 'p' && res.every(r => r.test(sk(h))));
    assert.ok(i >= 0, String(res));
    assert.equal(flags[i], true, sk(amidah[i][1]).slice(0, 40));
    return i;
  };
  hit(/יעלה ויבא/);
  const al = hit(/על הנסים/);
  const resume = amidah.findIndex(([t, h], j) => j > al && t === 'p' && /^ועל כל/.test(sk(h)));
  assert.ok(resume > al);
  assert.equal(flags[resume], false);
  hit(/זכרנו לחיים/);
  hit(/משיב הרוח|מוריד הטל/);
});

test('specialPrayerFlags: Genesis citation must not flag the next verse (בראשית ≠ בראש חודש)', () => {
  const rows = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/boker/3.json', import.meta.url))).b;
  const cite = rows.findIndex(([t, h, he]) => t === 'n' && /Genesis|בראשית/.test(String(h) + String(he || '')));
  assert.ok(cite >= 0);
  const flags = specialPrayerFlags(rows);
  assert.equal(flags[cite + 1], false);
});

test('markSectionLabels wraps (א)(ב)… and leaves real words', () => {
  const html = '(א) הַצֳּרִי (ב) וְהַצִּפֹּרֶן (יא) וְקִנָּמוֹן (אמן) בָּרוּךְ';
  const out = markSectionLabels(html);
  assert.match(out, /sid-mark[^>]*>\(א\)<\/span>/);
  assert.match(out, /sid-mark[^>]*>\(ב\)<\/span>/);
  assert.match(out, /sid-mark[^>]*>\(יא\)<\/span>/);
  assert.match(out, /\(אמן\)/);
  assert.doesNotMatch(out, /sid-mark[^>]*>\(אמן\)/);
});

test('TTS and search drop section markers', () => {
  const raw = '(א) הַצֳּרִי (ב) וְהַצִּפֹּרֶן';
  const marked = markSectionLabels(raw);
  assert.match(marked, /data-nr/);
  const spoken = prepareForTTS(marked, { stress: false }).replace(/[\u0591-\u05C7]/g, '');
  assert.doesNotMatch(spoken, /\(א\)/);
  assert.match(spoken, /הצרי/);
  // search index drops the markers even from raw HTML/text
  const idx = indexText(raw);
  assert.doesNotMatch(idx, /\(`/); // no '(' + encoded alef
});

let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

test('reader: Akeda has no sid-special; Pitum markers are muted and data-nr', async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/s/boker/3');
  await p.waitForSelector('#rc .seg');
  const akedaSpecial = await p.$$eval('#rc .seg.sid-special .t', els =>
    els.some(e => /ויהי אחר הדברים האלה/.test(e.textContent.replace(/[\u0591-\u05C7]/g, ''))));
  assert.equal(akedaSpecial, false);
  await p.goto(srv.url + '#/s/boker/5');
  await p.waitForSelector('#rc .sid-mark');
  const marks = await p.$$eval('#rc .sid-mark', els => els.map(e => ({
    t: e.textContent, nr: e.hasAttribute('data-nr'), hidden: e.getAttribute('aria-hidden'),
  })));
  assert.ok(marks.length >= 10, `expected many incense markers, got ${marks.length}`);
  assert.ok(marks.every(m => m.nr && m.hidden === 'true' && /^\([א-י]+\)$/.test(m.t)));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
