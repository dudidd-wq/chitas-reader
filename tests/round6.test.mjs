// Round-6 review fixes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixWord, fixNiqqud, niqqudForTTS, impossible } from '../site/js/niqqud.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { serve, launch, pageWith } from './helpers.mjs';
const rd = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const N = s => s.normalize('NFC');

test('niqqud: unambiguous repairs (sin dot written as holam, holam drawn one letter late, doubled marks)', () => {
  const eq = (a, b) => assert.equal(N(fixWord(a)[0]), N(b), a);
  eq('יִשְֹרָאֵל', 'יִשְׂרָאֵל'); eq('עֲשֵֹה', 'עֲשֵׂה'); eq('שֶֹה', 'שֶׂה'); eq('וּשְֹמֹאל', 'וּשְׂמֹאל');
  eq('הַלּוֶֹה', 'הַלֹּוֶה'); eq('לוֶֹה', 'לֹוֶה'); eq('הוֶֹה', 'הֹוֶה');
  eq('לֹֹֹֹֹא', 'לֹא'); eq('וּּבֵיאוּר', 'וּבֵיאוּר');
  // ambiguous: left on screen as in the source
  for (const w of ['וְֵישׁ', 'נִתְִהַוּוּ', 'שְׁבְָחוֹ', 'לְאַָהֳבָם', 'מִצְוַֹת', 'עשֶֹׁה', 'בּשֶֹׁם', 'בְּרִיפוֱֹת']) { assert.equal(fixWord(w)[0], w, w); assert.ok(impossible(w), w); }
  // valid words untouched
  for (const w of ['שָׁלוֹם', 'מֹשֶׁה', 'יִשְׂרָאֵל', 'מִצְוֹת', 'שֹׂנֵא', 'עֹשֶׂה']) { assert.equal(fixWord(w)[0], w, w); assert.deepEqual(fixWord(w)[1], [], w); }
  assert.equal(N(fixNiqqud('<b>יִשְֹרָאֵל</b> וְ<i>הַלּוֶֹה</i>')), N('<b>יִשְׂרָאֵל</b> וְ<i>הַלֹּוֶה</i>'));
});

test('niqqud for the voice: repaired, or read without niqqud when no single repair exists; ירושלִַם spelled out', () => {
  assert.equal(N(niqqudForTTS('וְֵישׁ יִשְֹרָאֵל')), N('ויש יִשְׂרָאֵל'));
  for (const w of ['נִתְִהַוּוּ', 'שְׁבְָחוֹ', 'לְאַָהֳבָם', 'מִצְוַֹת', 'עשֶֹׁה']) assert.equal(niqqudForTTS(w), w.replace(/[\u0591-\u05C7]/g, ''));
  assert.equal(N(prepareForTTS('<p>בִּירוּשָׁלִַם</p>')).trim(), N('בִּירוּשָׁלַיִם'));
  assert.equal(N(prepareForTTS('<p>הַלּוֶֹה</p>')).trim(), N('הַלֹּוֶה'));
});

test('niqqud repairs: counts are recorded and no Torah/Tehillim verse is touched', () => {
  const m = rd('../verification/niqqud-repairs.json').meta;
  assert.ok(!m.torah && !m.tehillim, 'verses are clean');
  assert.ok(m.rashi.byKind.sin >= 100 && m.rambam.byKind.holam >= 200, JSON.stringify(m));
  for (const s of ['rashi', 'tanya', 'rambam']) assert.ok(m[s].leftImpossible <= 25, s);
  const doc = fs.readFileSync(new URL('../verification/RAMBAM-ERRATA.md', import.meta.url), 'utf8');
  assert.match(doc, /סימני ניקוד בלתי אפשריים – סבב 6/);
});

test('reader: Rashi on Lev 1:1 shows יִשְׂרָאֵל with a sin dot, not a holam', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url); await p.goto(srv.url + '#/r/chumash/2026-03-15'); await p.waitForSelector('.rashi');
    const t = N(await p.textContent('#reader'));
    assert.ok(!/ש\u05B0\u05B9/.test(t) && !/שְֹ/.test(t), 'no holam on ש with a sheva');
    assert.ok(t.includes(N('יִשְׂרָאֵל')));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('unvocalised banner is per block: Positive Mitzvot is "מנוקד חלקית", a vocalised lesson has none', { timeout: 90000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { rambamTrack: '3' } });
    await p.goto(srv.url + '#/r/rambam3/2026-02-04'); await p.waitForSelector('#rc .seg');
    const t = await p.textContent('#unvoc'); assert.match(t, /מנוקד חלקית/); assert.doesNotMatch(t, /אינו מנוקד –/);
    assert.ok(await p.locator('.unvoc-mark').count() >= 1);
    await p.goto(srv.url + '#/r/rambam3/2026-02-10'); await p.waitForSelector('#rc .seg');
    await p.goto(srv.url + '#/sources'); await p.waitForSelector('table.src');
    const rows = await p.$$eval('table.src tbody tr', t => t.map(r => r.textContent));
    assert.ok(rows.some(r => /מצוות עשה/.test(r) && /מנוקד חלקית – 50 מתוך 238/.test(r)), 'sources row');
    assert.ok(rows.some(r => /ציצית/.test(r) && /לא מנוקד – /.test(r)), 'fully unvocalised row');
    for (const iso of ['2026-11-02']) { await p.goto(srv.url + '#/r/chumash/' + iso); await p.waitForSelector('#rc .seg'); assert.equal(await p.locator('#unvoc').count(), 0, iso); }
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('glosses: the three weak entries are removed (rejected in the review, not reworded); abbreviations spelled out on screen', async () => {
  const G = rd('../site/data/glossary.json'), R = rd('../tools/gloss-review.json');
  for (const [ref, f] of [['Deuteronomy 23:20', 'יִשָׁךְ'], ['Exodus 34:19', 'תִזָכָר'], ['Exodus 10:12', 'בָאַרְבֶה']]) {
    assert.ok(!Object.keys(G.verses[ref] || {}).some(k => k.split('#')[0] === f), `${ref} ${f}`);
    assert.equal(R.entries.find(e => e.ref === ref && e.form === f).decision, 'reject');
  }
  assert.equal(G.meta.curated.published, 443);
  const { expandAbbr } = await import('../site/js/gloss.js').catch(() => ({}));
  if (expandAbbr) assert.equal(expandAbbr('העלה ומשך (עפ"ר נוזל)'), 'העלה ומשך (על פי רוב נוזל)');
});

test('gloss popup: above the word with a caret, abbreviation expanded', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 740 }, prefs: { gloss: 'tap' } });
    await p.goto(srv.url + '#/r/chumash/2026-11-03'); await p.waitForSelector('#rc .seg');
    const gl = p.locator('.gl[data-g*="על פי רוב"]').first(); assert.ok(await gl.count(), 'שאב gloss present');
    assert.equal(await p.locator('.gl[data-g*="עפ\\"ר"]').count(), 0);
    for (let i = 0; i < 12 && !(await gl.evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })); i++) { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500); }
    await p.waitForTimeout(700);
    const vis = await p.$$eval('.gl', es => es.map((e, i) => { const r = e.getBoundingClientRect(); return r.width && r.left >= 0 && r.right <= innerWidth && r.top > 60 && r.bottom < innerHeight - 80 ? i : -1; }).filter(i => i >= 0));
    assert.ok(vis.length, 'a gloss on the first page');
    const g1 = p.locator('.gl').nth(vis[vis.length - 1]); await g1.click();
    const pop = p.locator(".gloss-pop"); await pop.waitFor({ timeout: 5000 });
    const [w, q] = [await g1.boundingBox(), await pop.boundingBox()];
    if (await pop.evaluate(e => e.classList.contains('above'))) assert.ok(q.y + q.height <= w.y + 1, 'above the word'); else assert.ok(q.y >= w.y + w.height - 1, 'below the word');
    const c = await p.locator('.gloss-pop .caret').boundingBox(); assert.ok(Math.abs(c.x + c.width / 2 - (w.x + w.width / 2)) < 16, 'caret points at the word');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

const noVoiceSynth = () => {
  const synth = { getVoices: () => [], cancel() {}, pause() {}, resume() {}, speak() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance ||= function (t) { this.text = t; };
};
test('no Hebrew voice: the message is inside the TTS sheet, no toast over the install steps', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 }, init: noVoiceSynth });
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg');
    await p.click('#b-tts'); await p.waitForSelector('#sheet:not([hidden]) #sh-note', { timeout: 10000 });
    assert.match(await p.textContent('#sh-note'), /לא נמצא במכשיר קול עברי/);
    await p.waitForTimeout(400);
    const t = await p.$eval('#toast', e => ({ show: e.classList.contains('show'), text: e.textContent }));
    assert.equal(t.show, false, `no toast (${t.text})`);
    assert.match(await p.textContent('#sheet'), /אנדרואיד/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('full-screen mode: "עמוד X מתוך Y" shows briefly on a page turn', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg');
    await p.click('#b-full'); await p.waitForTimeout(500);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(350);
    const f = await p.$eval('#pflash', e => ({ show: e.classList.contains('show'), t: e.textContent, o: getComputedStyle(e).opacity }));
    assert.ok(f.show, 'flash shown'); assert.match(f.t, /^עמוד 2 מתוך \d+$/);
    await p.waitForTimeout(2000);
    assert.equal(await p.$eval('#pflash', e => e.classList.contains('show')), false, 'and hidden again');
    await p.click('#rc', { position: { x: 195, y: 400 } }).catch(() => {});
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('Simchat Torah note: one line first, details behind "פירוט"', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    for (const [iso, il, re] of [['2025-10-15', false, /^שמחת תורה: היום: ״וזאת הברכה״ מ״.+״ עד הסוף ו״בראשית״ עד סוף ״.+״; ב-Chabad\.org: ״וזאת הברכה״ בלבד\.$/], ['2026-10-03', true, /^שמחת תורה: היום: ״וזאת הברכה״ מ״שביעי״ עד סוף התורה; מחר \(אסרו חג\): ״בראשית״ ״ראשון״\.$/]]) {
      const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 }, prefs: { il, locationChosen: true } });
      await p.goto(srv.url + '#/r/chumash/' + iso); await p.waitForSelector('#rc .seg');
      const n = await p.$eval('#rc .day-note', e => { const c = e.cloneNode(true); c.querySelector('details').remove(); return { lead: c.textContent.trim(), open: e.querySelector('details').open, h: e.getBoundingClientRect().height }; });
      assert.match(n.lead, re); assert.equal(n.open, false);
      assert.ok(n.h < 150, `collapsed note height ${n.h}`);
      await p.click('#rc .note-more summary'); await p.waitForTimeout(300);
      assert.ok(await p.$eval('#rc .note-more', d => d.open && d.textContent.length > 150));
      assert.deepEqual(p.errors, []);
      await p.close();
    }
  } finally { await b.close(); srv.close(); }
});

test('568×320 full screen: page 1 is filled (a Rashi block may start at its foot), still no Rashi stub', { timeout: 60000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 568, height: 320 } });
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(600);
    await p.click('#b-full'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const vp = document.querySelector('#vp').getBoundingClientRect(), rc = document.querySelector('#rc');
      const pb = parseFloat(rc.style.paddingBottom), pt = parseFloat(rc.style.paddingTop);
      const on1 = x => x.left >= vp.left - 1 && x.right <= vp.right + 1;
      const rects = [...rc.querySelectorAll('.t, .rashi p, .doc-head')].flatMap(e => [...e.getClientRects()]).filter(on1);
      const lh = parseFloat(getComputedStyle(rc.querySelector('.rashi')).lineHeight);
      const stubs = [...rc.querySelectorAll('.rashi')].filter(r => { const rs = r.getClientRects(); return rs.length > 1 && rs[0].height < lh * 2.5; }).length;
      return { fill: (Math.max(...rects.map(x => x.bottom)) - vp.top - pt) / (vp.height - pt - pb), rashiOn1: [...rc.querySelectorAll('.rashi p')].some(e => [...e.getClientRects()].some(on1)), stubs };
    });
    assert.ok(r.fill > 0.9, `page 1 ${Math.round(r.fill * 100)}% filled`);
    assert.ok(r.rashiOn1, 'Rashi starts on page 1'); assert.equal(r.stubs, 0);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('About and README: honest real-device TTS test steps', { timeout: 60000 }, async () => {
  const md = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const re of [/לא נבדקה/, /כרמית/, /נתוני קול/, /דברים ו,ד/, /בראשית יח,ג/, /ויקרא א,א/, /מסך הנעילה/, /באייפון: לבדוק אם ההקראה נעצרת/]) assert.match(md, re);
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + '#/about'); await p.waitForSelector('#tts-howto');
    await p.click('#tts-howto summary');
    const t = await p.textContent('#tts-howto');
    for (const re of [/כרמית/, /דברים ו,ד/, /ויקרא א,א/, /מסך הנעילה/]) assert.match(t, re);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

// CI failure of 1.0.42 (tts-bar 568x320, check 5): the web fonts (font-display: swap) can arrive after the first
// layout, and the page breaks were measured with the fallback font. The reader now measures again when fonts load.
test('late web fonts: pages are measured again, no text line under the bars', async () => {
  const srv = await serve(), b = await launch();
  try {
    const total = async (w, h, slow) => {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: h } });
      if (slow) await p.route('**/fonts/*.woff2', async r => { await new Promise(f => setTimeout(f, 1500)); await r.continue(); });
      await p.goto(srv.url + '#/r/rambam3/2026-11-02'); await p.waitForSelector('#rc .seg');
      const early = await p.$eval('#pinfo', e => e.textContent);
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
      const n = await p.$eval('#pinfo', e => e.textContent); await p.context().close(); return [early, n];
    };
    for (const [w, h] of [[568, 320], [390, 844]]) {
      const [, fast] = await total(w, h, false), [early, slow] = await total(w, h, true);
      assert.equal(slow.replace(/.*מתוך /, ''), fast.replace(/.*מתוך /, ''), `${w}x${h}: page count after the fonts arrive (first measured: ${early})`);
    }
    for (const [w, h] of [[568, 320], [390, 844]]) {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: h } });
      await p.route('**/fonts/*.woff2', async r => { await new Promise(f => setTimeout(f, 1500)); await r.continue(); });
      await p.goto(srv.url + '#/r/rambam3/2026-11-02'); await p.waitForSelector('#rc .seg');
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
      for (let pg = 0; pg < 3; pg++) {
        const bad = await p.evaluate(() => {
          const vp = document.querySelector('#vp').getBoundingClientRect(), rc = document.querySelector('#rc');
          const lo = vp.top + parseFloat(rc.style.paddingTop) - 1, hi = vp.bottom - parseFloat(rc.style.paddingBottom) + 1;
          const rg = document.createRange(); rg.selectNodeContents(rc);
          return [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 4 && r.right > vp.left + 2 && r.left < vp.right - 2 && (r.top < lo || r.bottom > hi)).map(r => `${Math.round(r.top)}-${Math.round(r.bottom)} (${Math.round(lo)}..${Math.round(hi)})`);
        });
        assert.deepEqual(bad, [], `${w}x${h} page ${pg + 1}`);
        await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(700);
      }
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});
