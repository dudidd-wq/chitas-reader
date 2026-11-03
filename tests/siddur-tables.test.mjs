// 1.0.61: the siddur's tables. They used to be flattened into "cell · cell" prayer lines (Ana Bekoach with the
// Names glued to each line, read aloud by the speech; Azamer / Asader out of order). Now a table block
// ['t', rows, cls] shown as a real grid: the prayer on the right, the Names – looked at, never said – on the left.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
import { prepareForTTS } from '../site/js/tts-prep.js';

const D = new URL('../site/data/siddur/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('index.json', D)));
const sections = idx.books.flatMap(b => b.secs.map((_, i) => ({ id: `${b.id}/${i + 1}`, ...JSON.parse(fs.readFileSync(new URL(`${b.id}/${i + 1}.json`, D))) })));
const plain = h => h.replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '').trim();
const tables = sections.flatMap(s => s.b.map((b, i) => ({ s: s.id, i, b })).filter(x => x.b[0] === 't'));
const ACRO = /^[א-ת]{2}"[א-ת] [א-ת]{2}"[א-ת]$/;
const NAMES = ['אב"ג ית"ץ', 'קר"ע שט"ן', 'נג"ד יכ"ש', 'בט"ר צת"ג', 'חק"ב טנ"ע', 'יג"ל פז"ק', 'שק"ו צי"ת'];
const skip = !CHROME && 'no Chrome';

test('no prayer line glues table cells with " · "', () => {
  const bad = sections.flatMap(s => s.b.filter(b => b[0] === 'p' && b[1].includes(' · ')).map(b => `${s.id}: ${plain(b[1]).slice(0, 60)}`));
  assert.deepEqual(bad, []);
});

test('no Name (acronym) of Ana Bekoach is left as a spoken line or a spoken cell', () => {
  const bad = [];
  for (const s of sections) for (const b of s.b) {
    const spoken = b[0] === 'p' ? [b[1]] : b[0] === 't' ? b[1].flat().filter(c => c[0] === 'p').map(c => c[1]) : [];
    for (const h of spoken) if (NAMES.some(n => plain(h).includes(n))) bad.push(`${s.id}: ${plain(h).slice(0, 60)}`);
  }
  assert.deepEqual(bad, []);
});

test('Ana Bekoach: a 7×2 table – the prayer line (spoken) and its Name (shown only), in every section that has it', () => {
  const ana = tables.filter(t => t.b[2] === 'names');
  assert.deepEqual(ana.map(t => t.s).sort(), ['boker/5', 'kabbalat/2', 'mincha/1', 'minchashabbat/1', 'omer/1', 'shema/1']);
  for (const { s, b: [, rows] } of ana) {
    assert.equal(rows.length, 7, s);
    for (const r of rows) assert.deepEqual(r.map(c => c[0]), ['p', 'x'], s);
    assert.match(plain(rows[0][0][1]), /^אנא בכח/, s);
    assert.match(plain(rows[6][0][1]), /^שועתנו/, s);
    assert.deepEqual(rows.map(r => plain(r[1][1])), NAMES, s);
    rows.forEach(r => assert.match(plain(r[1][1]), ACRO, s));
  }
});

test('the Omer chart: 49 days × day | count (spoken) | sefirah, Ana word, psalm word, letter (shown only)', () => {
  const [om] = tables.filter(t => t.b[2] === 'omer');
  assert.equal(om.s, 'omer/1');
  const [head, ...days] = om.b[1];
  assert.deepEqual(head.map(c => c[0]), ['n', 'n', 'n']);
  assert.equal(days.length, 49);
  days.forEach((r, d) => {
    assert.deepEqual(r.map(c => c[0]), ['x', 'p', 'x', 'x', 'x', 'x']);
    assert.equal(plain(r[0][1]), String(d + 1));
    assert.match(plain(r[1][1]), /^היום/);
  });
});

test('Hallel (Rosh Chodesh): the responsive verses are a 3-column table – who says it, the verse, the response', () => {
  const [h] = tables.filter(t => t.b[2] === 'resp');
  assert.equal(h.s, 'rc/1');
  for (const r of h.b[1]) { assert.equal(r.length, 3); assert.ok(['n', ''].includes(r[0][0])); assert.equal(r[1][0], 'p'); assert.equal(r[2][0], 'p'); assert.match(plain(r[2][1]), /^כי לעולם חסדו/); }
});

test('Asader / Azamer (Shabbat book): the two-column source is read stanza by stanza, the acrostic in order', () => {
  const first = sec => sections.find(s => s.id === sec).b.filter(b => b[0] === 'p').map(b => plain(b[1]).split(/\s+/)[0]);
  const as = first('shabbatbook/4'), i = as.indexOf('אסדר');
  assert.equal(as.slice(i, i + 10).join(' '), 'אסדר נהורה ישדר יגלה צרורא חדו קדם לעטר ואלין רבו'); // אני יצחק לור…
  const az = first('shabbatbook/3'), j = az.indexOf('אזמר');
  assert.equal(az.slice(j, j + 20).join(' '), 'אזמר נזמין ימינא יחבק צוחין חדו קריבו למעבד ועטורין רשימין יהא אסדר בחמרא נעביד שכינתא שביתין למבצע משח הלא אתעטרא');
});

test('the speech skips the cells marked data-nr (the Names) and pauses between cells', () => {
  const html = '<table><tr><td>אָנָּא בְּכֹחַ</td><td data-nr="1">אב"ג ית"ץ</td></tr><tr><th data-nr="1" lang="en">Day</th><td>הַיּוֹם</td></tr></table>';
  const t = prepareForTTS(html, {});
  assert.doesNotMatch(t, /אב"ג|ית"ץ|Day/);
  assert.match(t, /אָנָּא בְּכֹחַ,/);
  assert.match(t, /הַיּוֹם/);
});

const synth = () => {
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 1); }, 1); },
  } });
};

let srv, browser;
test.before(async () => { if (!skip) { srv = await serve(); browser = await launch(); } });
test.after(async () => { await browser?.close(); srv?.close(); });

test('reader: Ana Bekoach is a 7×2 grid, no middle dot, every cell isolated, the Names not in the speech', { skip }, async () => {
  for (const sec of ['boker/5', 'mincha/1']) {
    const p = await pageWith(browser, srv.url, { init: synth, prefs: { ttsContinuous: false, layout: 'scroll' } });
    await p.goto(srv.url + '#/s/' + sec);
    await p.waitForSelector('#rc table.sd-t-names');
    const t = await p.$eval('#rc table.sd-t-names', el => ({
      rows: [...el.rows].map(r => [...r.cells].map(c => [c.className, c.getAttribute('dir'), getComputedStyle(c).unicodeBidi, c.hasAttribute('data-nr'), c.textContent.trim()])),
      dir: getComputedStyle(el).direction, right: [...el.rows[0].cells].map(c => Math.round(c.getBoundingClientRect().right)),
    }));
    assert.equal(t.dir, 'rtl');
    assert.equal(t.rows.length, 7, sec);
    for (const r of t.rows) {
      assert.equal(r.length, 2);
      assert.equal(r[0][3], false); assert.equal(r[1][3], true, 'the Name is marked not-read');
      r.forEach(c => { assert.equal(c[1], 'rtl'); assert.equal(c[2], 'isolate'); assert.doesNotMatch(c[4], /·/); });
    }
    assert.ok(t.right[0] > t.right[1], 'the prayer is on the right, the Name on the left');
    await p.click('#b-tts');
    await p.waitForSelector('#ttsctl:not([hidden])');
    await p.waitForFunction(() => window.__spoken.join(' ').replace(/[\u0591-\u05C7]/g, '').includes('שועתנו') || document.querySelector('#rb:not(.speaking)'), null, { timeout: 30000 }).catch(() => {});
    const all = (await p.evaluate(() => window.__spoken.join(' '))).replace(/[\u0591-\u05C7]/g, '');
    assert.match(all, /אנא בכח/);
    assert.match(all, /שועתנו/);
    for (const n of NAMES) assert.ok(!all.includes(n) && !all.includes(n.replace(/"/g, '')), `${sec}: "${n}" was spoken`);
    assert.deepEqual(p.errors, []);
    await p.close();
  }
});

test('reader at 320px: no table is wider than its column, the page does not scroll sideways (scroll and pages)', { skip }, async () => {
  const secs = [...new Set(tables.map(t => t.s))];
  for (const layout of ['scroll', 'pages']) for (const sec of secs) {
    const p = await pageWith(browser, srv.url, { viewport: { width: 320, height: 640 }, prefs: { layout } });
    await p.goto(srv.url + '#/s/' + sec);
    await p.waitForSelector('#rc table.sd-tab');
    const r = await p.evaluate(() => ({
      tabs: [...document.querySelectorAll('#rc table.sd-tab')].map(t => { const c = t.closest('.seg'); return [Math.ceil(t.getBoundingClientRect().width), Math.ceil(c.getBoundingClientRect().width), t.scrollWidth, t.clientWidth]; }),
      doc: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    }));
    for (const [tw, cw, sw, clw] of r.tabs) { assert.ok(tw <= cw + 1, `${layout} ${sec}: table ${tw} > column ${cw}`); assert.ok(sw <= clw + 1, `${layout} ${sec}: table content ${sw} > ${clw}`); }
    if (layout === 'scroll') assert.ok(r.doc[0] <= r.doc[1] + 1, `${sec}: page ${r.doc[0]} > ${r.doc[1]}`);
    assert.deepEqual(p.errors, []);
    await p.close();
  }
});

test('reader: instructions in both languages – the Omer chart header is in Hebrew and English, not read; 49 days', { skip }, async () => {
  const p = await pageWith(browser, srv.url, { prefs: { siddurLang: 'both', layout: 'scroll' } });
  await p.goto(srv.url + '#/s/omer/1');
  await p.waitForSelector('#rc table.sd-t-omer');
  const th = await p.$$eval('#rc table.sd-t-omer thead th', a => a.map(e => [e.querySelector('[lang=en]')?.textContent || '', e.getAttribute('data-nr')]));
  assert.equal(th.length, 3);
  assert.ok(th.every(([en, nr]) => en && nr !== null));
  assert.equal(await p.$$eval('#rc table.sd-t-omer tbody tr', a => a.length), 49);
  assert.deepEqual(p.errors, []);
  await p.close();
});
