// 1.0.96: Gemara with the Steinsaltz explanation (Daf Yomi, Amud Yomi), Yerushalmi Yomi and Mishna Yomit.
// Read-only: checks the cycles, the speech-only text preparation and the built window in site/data/gemara.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dafYomi, amudYomi, yerushalmi, mishnaYomit } from '../site/js/gemara-cycles.js';
import { pauseChunks } from '../site/js/tts-prep.js';
import { israeliShva, initialStop, speechRuns, sayWord, REFP } from '../tools/gemara-pronunciation.mjs';

const root = new URL('../site/', import.meta.url);
globalThis.fetch = async p => { const f = new URL(p, root); const ok = fs.existsSync(f); return { ok, json: async () => JSON.parse(fs.readFileSync(f)) }; };
const { buildDoc, gemaraFiles, GEMARA_UNITS, describe } = await import('../site/js/texts.js');
const idx = JSON.parse(fs.readFileSync(new URL('data/gemara/index.json', root)));
const days = (a, b) => { const out = []; for (let d = new Date(a + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= b; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };

test('the four cycles by date (as the Sefaria calendar and hebcal of 12.11.2026)', () => {
  assert.deepEqual(dafYomi('2026-11-12'), { t: 'Bekhorot', daf: 55, amudim: ['55a', '55b'] });
  assert.deepEqual(dafYomi('2026-11-13').amudim, ['56a', '56b']);
  assert.deepEqual(amudYomi('2023-10-16'), { t: 'Berakhot', daf: 2, side: 'a', amudim: ['2a'] });   // Dirshu Amud HaYomi start
  assert.deepEqual(amudYomi('2026-11-13'), { t: 'Sukkah', daf: 14, side: 'b', amudim: ['14b'] });
  assert.deepEqual(yerushalmi('2026-11-12'), { t: 'Sanhedrin', daf: 24 });
  assert.equal(yerushalmi('2026-09-21'), null);   // Yom Kippur 5787: no Yerushalmi lesson
  assert.deepEqual(mishnaYomit('2026-11-12'), [{ t: 'Oholot', c: 17, m: 5 }, { t: 'Oholot', c: 18, m: 1 }]);
});

test('Israeli shva and initial stops (speech only)', () => {
  assert.equal(israeliShva('זְמַן'), 'זמַן');
  assert.equal(israeliShva('שְׁלוֹם'), 'שׁלוֹם');
  for (const w of ['תְּחִילָּה', 'שְׂכַרְכֶם', 'לְקַבֵּל', 'בְּסִיּוּם', 'דְּלָא', 'מְשַׁלֵּם', 'רְאוּיָה', 'שְׁאֵלָה', 'תְּדִירָא']) assert.equal(israeliShva(w), w, w);
  assert.equal(initialStop('בְלָקוּחַ'), 'בְּלָקוּחַ');
  assert.equal(initialStop('וְכֵן'), 'וְכֵן');
  assert.equal(sayWord('ר"ש', {}), 'ר"ש');   // abbreviations are left to tts-prep
});

test('Steinsaltz speech source: no <big> quote, no verse references, ר׳ is רבי', () => {
  const runs = speechRuns('<big><b>גמ׳</b></big> <b>אמר ר\' יוחנן</b> שנאמר "ויאמר" (בראשית א, ג) <small>[אמר]</small>');
  const t = runs.map(r => r.t).join('');
  assert.ok(!/גמ׳/.test(t) && !/בראשית/.test(t), t);
  assert.ok(/רבי יוחנן/.test(t), t);
  assert.ok(runs.some(r => r.b && /יוחנן/.test(r.t)));
});

test('a short pause at every comma and period; a one-word piece is glued to its neighbour', () => {
  const c = pauseChunks('אמר רבי יוחנן, שמע מינה כך וכך, כן. ועוד דבר אחר.');
  assert.deepEqual(c.map(x => x.c), ['אמר רבי יוחנן,', 'שמע מינה כך וכך, כן.', 'ועוד דבר אחר.']);
  assert.deepEqual(c.map(x => x.gap), [0.18, 0.38, 0.38]);
});

test('1.0.97: every date has its lesson files (sampled over a full Daf Yomi cycle); the read-aloud text is the explanation only', async () => {
  const { gemaraSpec } = await import('../site/js/texts.js');
  const gaps = new Set();
  for (const iso of days('2026-11-08', '2034-06-30').filter((_, i) => i % 3 === 0)) for (const unit of ['dafyomi', 'amudyomi', 'yerushalmi', 'mishnayomit']) {
    const spec = gemaraSpec({ iso }, unit); if (spec.none) continue;
    const files = gemaraFiles(spec, idx);
    if (!files.length) { gaps.add(`${unit} ${spec.t || spec.items?.[0]?.t}`); continue; }
    for (const f of files.filter(f => !/say\//.test(f))) assert.ok(fs.existsSync(new URL('data/' + f, root)), `${iso} ${unit} ${f}`);
  }
  // only the Daf Yomi days of Kinnim / Middot (no Bavli Gemara) and two Vilna dafim without text in Sefaria's
  // Yerushalmi (Peah 19, Niddah 13) have no text
  assert.ok([...gaps].every(g => /dafyomi (Kinnim|Middot)|yerushalmi (Peah|Niddah)/.test(g)), [...gaps].join(', '));
  let segs = 0, said = 0, stressed = 0;
  for (const iso of ['2026-11-13', '2026-11-08', '2027-02-06']) {
    const doc = await buildDoc({ iso }, 'dafyomi');
    const ps = doc.blocks.filter(b => b.type === 'p');
    assert.ok(ps.length > 10, iso);
    for (const b of ps) {
      segs++;
      if (!b.biur.length) continue;
      said++;
      assert.ok(b.say, `${iso} ${b.id} has no speech text`);
      assert.ok(!/(?<![\u05D0-\u05EA])ר['׳](?=\s)/.test(b.say), b.say);
      assert.ok(!new RegExp(REFP.source).test(b.say), `${b.id}: a verse reference is read`);
      if (/\u05AB/.test(b.say)) stressed++;
      // the edition's Steinsaltz is kept (b.biur); the displayed niqqud (b.biurV) only adds vowels – never a letter
      assert.ok(!/[\u05B0-\u05BC]/.test(b.biur[0].replace(/<b>.*?<\/b>/g, '')), b.id);
      if (b.biurV?.[0]) assert.equal(b.biurV[0].replace(/[\u0591-\u05C7]/g, '').replace(/&quot;/g, '"'), b.biur[0].replace(/[\u0591-\u05C7]/g, '').replace(/&quot;/g, '"'), b.id);
    }
  }
  assert.ok(said > 0.9 * segs && stressed > 0.9 * said, `${said}/${segs}, stressed ${stressed}`);
});

test('today\'s (13.11.2026) four lessons', async () => {
  const plan = { iso: '2026-11-13' };
  assert.equal(await describe(plan, 'dafyomi'), 'בכורות דף נו');
  assert.equal(await describe(plan, 'amudyomi'), 'סוכה יד ב');
  assert.equal(await describe(plan, 'yerushalmi'), 'ירושלמי סנהדרין דף כה');
  assert.equal(await describe(plan, 'mishnayomit'), 'אהלות יח, ב – ג');
  const y = await buildDoc(plan, 'yerushalmi'), m = await buildDoc(plan, 'mishnayomit');
  assert.ok(y.blocks.filter(b => b.type === 'p').length > 3);
  const mp = m.blocks.filter(b => b.type === 'p');
  assert.equal(mp.length, 2);
  assert.ok(mp.every(b => b.biur.length && b.say.startsWith(b.text.replace(/<[^>]+>/g, '').slice(0, 10))));
});

test('1.0.97: any date has its lesson (no window): 1.1.2030', async () => {
  const doc = await buildDoc({ iso: '2030-01-01' }, 'dafyomi');
  assert.ok(doc.blocks.filter(b => b.type === 'p').length > 5);
  assert.ok(!doc.blocks.some(b => b.type === 'note' && /sefaria\.org/.test(b.href || '')));
});

// ---------------- browser ----------------
const { serve, launch, pageWith, CHROME } = await import('./helpers.mjs');
const skip = !CHROME && 'no Chrome';
const fakeSynth = () => {
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  const v = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => v, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 2); }, 2); } } });
};
test('reader: opt-in cards, the Gemara with the Steinsaltz beneath, only the explanation is read, 320 px', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p0 = await pageWith(b, srv.url);
    await p0.goto(srv.url + '#/d/2026-11-13'); await p0.waitForSelector('.card');
    assert.equal(await p0.$$eval('[data-what="dafyomi"]', x => x.length), 0, 'opt-in: not listed by default');
    await p0.context().close();
    const prefs = { lessonDaf: true, lessonAmud: true, lessonYer: true, lessonMishna: true, ttsEngine: 'web', ttsContinuous: false };
    const p = await pageWith(b, srv.url, { prefs, init: fakeSynth, viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + '#/d/2026-11-13');
    await p.waitForFunction(() => /בכורות דף נו/.test(document.querySelector('[data-what="dafyomi"]')?.textContent || ''));
    for (const [u, re] of [['amudyomi', /סוכה יד ב/], ['yerushalmi', /סנהדרין דף כה/], ['mishnayomit', /אהלות יח, ב – ג/]])
      assert.match(await p.textContent(`[data-what="${u}"]`), re);
    await p.goto(srv.url + '#/r/dafyomi/2026-11-13'); await p.waitForSelector('#rc .seg.gm .biur');
    const first = await p.$eval('#rc .seg.gm', el => ({ g: el.querySelector('.t').textContent, s: el.querySelector('.biur').textContent }));
    assert.match(first.g, /בָּנֶיךָ/); assert.match(first.s.replace(/[\u0591-\u05C7]/g, ''), /פדיית בכור/); assert.match(first.s, /[\u05B0-\u05BC]/, 'the explanation is shown with niqqud');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow at 320 px');
    assert.match(await p.$$eval('#rc .doc-credit', x => x.map(e => e.textContent).join(' ')), /מקור הנוסח.*ביאור שטיינזלץ.*CC BY-NC/);
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__spoken.length > 0);
    const said = (await p.evaluate(() => window.__spoken.join(' '))).replace(/[\u0591-\u05C7]/g, '');
    assert.match(said, /פדיית בכור/, 'the explanation is read');
    assert.ok(!/בלקוח ובמתנה, אף צאנך ובקרך — אינו/.test(said.split('פדיית')[0]), 'the Aramaic is not read first');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  } finally { await b.close(); srv.close(); }
});
