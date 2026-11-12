// 1.0.68: על נהרות בבל not omit-styled (alternative pair, inside Birkat haMazon); repeated verses printed N times
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { omitPrayerFlags, repeatCounts, SIDDUR_REPEATS } from '../site/js/texts.js';
import { serve, launch, pageWith } from './helpers.mjs';

const sk = h => String(h || '').replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');
const load = rel => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url)));
const TIMES_RE = /ג[״"]פ|ב[״"]פ|ז[״"]פ|שלוש פעמים|שלש פעמים|פעמיים|three times|twice/;

test('omit rule: alternatives, Birkat haMazon, shaded verse and Shabbat-RC substitution are not omit-styled', () => {
  const all = { brachot: 4, shabbat: 6, shacharit: 5 };
  const bh = omitPrayerFlags(load('site/data/siddur/brachot/4.json').b, { book: 'brachot', n: 4 });
  assert.equal(bh.omit.some(Boolean), false);
  const rc = load('site/data/siddur/shabbat/6.json').b, orc = omitPrayerFlags(rc, { book: 'shabbat', n: 6 });
  assert.equal(orc.omit[rc.findIndex(([t, h]) => t === 'p' && /^תכנת שבת/.test(sk(h)))], false);
  const s5 = load('site/data/siddur/shacharit/5.json').b, o5 = omitPrayerFlags(s5, { book: 'shacharit', n: 5 });
  assert.equal(o5.omit[s5.findIndex(([t, h]) => t === 'p' && /^ובא לציון/.test(sk(h)))], false);
  assert.equal(o5.omit[s5.findIndex(([t, h]) => t === 'p' && /^למנצח מזמור לדוד יענך/.test(sk(h).replace(/[:,]/g, '')))], true);
  const s1 = load('site/data/siddur/shacharit/1.json').b, o1 = omitPrayerFlags(s1, { book: 'shacharit', n: 1 });
  assert.equal(o1.omit[s1.findIndex(([t, h]) => t === 'p' && /^מזמור לתודה/.test(sk(h)))], true);
  const ch = load('site/data/siddur/chatzot/1.json').b, oc = omitPrayerFlags(ch, { book: 'chatzot', n: 1 });
  assert.equal(oc.omit[ch.findIndex(([t, h]) => t === 'p' && /^עד אנה בכיה/.test(sk(h)))], false);
  void all;
});

test('repeat table points at instruction notes and paragraphs', () => {
  let n = 0;
  for (const [k, v] of Object.entries(SIDDUR_REPEATS)) {
    const rows = load(`site/data/siddur/${k}.json`).b;
    for (const [ni, [cnt, ps]] of Object.entries(v)) {
      assert.equal(rows[ni][0], 'n', k + '#' + ni);
      assert.match(rows[ni][1] + ' ' + (rows[ni][2] || ''), TIMES_RE, k + '#' + ni);
      assert.ok(cnt === 2 || cnt === 3);
      for (const p of ps) { assert.equal(rows[p][0], 'p', k + '#' + p); n++; }
    }
  }
  assert.equal(repeatCounts('boker', 5).get(9), 3);
  assert.ok(n >= 40);
});

let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

const segs = async (p, hash) => {
  await p.goto(srv.url + hash);
  await p.waitForSelector('#rc .seg');
  return p.$$eval('#rc .seg', els => els.map(el => {
    const c = el.cloneNode(true); c.querySelectorAll('[data-nr]').forEach(x => x.remove());
    return { omit: el.classList.contains('sid-omit'), spoken: (c.querySelector('.t')?.textContent || '').replace(/[\u0591-\u05C7]/g, '') };
  }));
};

test('reader: על נהרות בבל in regular font', async () => {
  const p = await pageWith(browser, srv.url);
  const s = await segs(p, '#/s/brachot/4');
  const a = s.find(x => /על נהרות בבל/.test(x.spoken));
  assert.ok(a); assert.equal(a.omit, false);
  assert.equal(await p.$$eval('#rc .sid-omit', e => e.length), 0);
});

test('reader: ה׳ צבאות ×3 in Ketoret, הודו ×2 in Hallel, no "N times" in spoken text', async () => {
  const p = await pageWith(browser, srv.url);
  const k = await segs(p, '#/s/boker/5');
  assert.equal(k.filter(x => /^יהוה צבאות עמנו/.test(x.spoken.trim())).length, 3);
  assert.equal(k.filter(x => /^יהוה הושיעה/.test(x.spoken.trim())).length, 3);
  for (const x of k) assert.doesNotMatch(x.spoken, TIMES_RE);
  const h = await segs(p, '#/s/rc/1');
  assert.equal(h.filter(x => /^אודך כי עניתני/.test(x.spoken.trim())).length, 2);
  for (const x of h) assert.doesNotMatch(x.spoken, TIMES_RE);
  const l = await segs(p, '#/s/levana/1');
  assert.equal(l.filter(x => /^דוד מלך ישראל חי וקים/.test(x.spoken.trim().replace(/ֹ|ׂ/g, ''))).length, 3);
});
