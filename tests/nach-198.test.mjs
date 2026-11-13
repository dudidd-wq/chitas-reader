// 1.0.98: Nach Yomi (Metzudat David / Rashi), Sefer HaMitzvot niqqud, Shnayim Mikra ve-Echad Targum. Read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dayPlan } from '../site/js/calendar.js';
import { nachYomi, nachChapters } from '../site/js/gemara-cycles.js';

const root = new URL('../site/', import.meta.url);
globalThis.fetch = async p => { const f = new URL(p, root); const ok = fs.existsSync(f); return { ok, json: async () => JSON.parse(fs.readFileSync(f)) }; };
const { buildDoc, describe, filesFor, setTextOptions, shnayimParts } = await import('../site/js/texts.js');
const { libNode, libDoc } = await import('../site/js/library.js');
const strip = s => s.replace(/[\u0591-\u05C7]/g, '');

test('Nach Yomi: one chapter a day, 742 chapters (hebcal cycle from 1.11.2007)', async () => {
  assert.equal(nachChapters().length, 742);
  assert.deepEqual(nachYomi('2026-11-13'), { book: 'Ezekiel', c: 10 });
  assert.deepEqual(nachYomi('2026-11-14'), { book: 'Ezekiel', c: 11 });
  const plan = dayPlan(new Date('2026-11-13T12:00:00'));
  assert.equal(await describe(plan, 'nachyomi'), 'יחזקאל פרק י');
  for (const f of await filesFor(plan, 'nachyomi')) assert.ok(fs.existsSync(new URL('data/' + f, root)), f);
  const doc = await buildDoc(plan, 'nachyomi'), vs = doc.blocks.filter(b => b.type === 'v');
  assert.ok(vs.length > 15 && vs.every(b => /[\u0591-\u05AF]/.test(b.text)), 'the verses with taamim');
  assert.ok(vs.filter(b => b.biur?.length).length > 0.8 * vs.length, 'Metzudat David under the verses');
  assert.ok(vs.every(b => !b.biur || b.biurLabel === 'מצודת דוד'));
  assert.ok(doc.credits.some(c => c.label === 'מצודת דוד' && c.license === 'Public Domain'));
});

test('every Nach chapter exists; Ruth, Lamentations and Esther have Rashi (Metsudah, CC BY)', async () => {
  for (const { book, c } of nachChapters()) assert.ok(fs.existsSync(new URL(`data/nach/${book.replace(/ /g, '_')}/${c}.json`, root)), `${book} ${c}`);
  const { doc } = await libDoc('nach/Ruth/1');
  const withR = doc.blocks.filter(b => b.type === 'v' && b.biur?.length); assert.ok(withR.length > 10 && withR.every(b => b.biurLabel === 'רש״י' && /[\u05B0-\u05BC]/.test(b.biur[0])));
  const r = await libNode('nach/Joshua/24'); assert.equal(r.next.id, 'nach/Judges/1');
});

test('displayed niqqud of Metzudat David only adds vowels; its speech text is read after the verse', async () => {
  const doc = await buildDoc(dayPlan(new Date('2026-11-13T12:00:00')), 'nachyomi');
  let n = 0;
  for (const b of doc.blocks.filter(b => b.biurV)) b.biur.forEach((h, i) => { if (b.biurV[i]) { n++; assert.equal(strip(b.biurV[i]).replace(/&quot;/g, '"'), strip(h).replace(/&quot;/g, '"')); } });
  assert.ok(n > 10, `vocalized comments: ${n}`);
  assert.ok(doc.blocks.some(b => b.biurSay?.some(x => /[\u05B0-\u05BC]/.test(x))));
});

test('Sefer HaMitzvot: niqqud for display and read-aloud (letters unchanged)', async () => {
  const plan = dayPlan(new Date('2026-11-13T12:00:00'));
  const doc = await buildDoc(plan, 'mitzvot'), ps = doc.blocks.filter(b => b.type === 'p');
  assert.ok(ps.length && ps.every(b => b.say && b.textV), 'every segment has speech and display niqqud');
  for (const b of ps) assert.equal(strip(b.textV).replace(/&quot;/g, '"'), strip(b.text).replace(/&quot;/g, '"'));
  assert.ok((await filesFor(plan, 'mitzvot')).some(f => f.startsWith('mitzvot-voc/')));
});

test('Shnayim Mikra: each verse twice then Onkelos (no Rashi); by day (aliyah) or the whole parsha', async () => {
  const plan = dayPlan(new Date('2026-11-13T12:00:00'));   // Friday: the sixth aliyah
  setTextOptions({ shnayimSplit: 'day' });
  const day = await buildDoc(plan, 'shnayim'), dv = day.blocks.filter(b => b.type === 'v');
  assert.deepEqual(shnayimParts(plan), plan.chumash.parts);
  assert.ok(dv.length > 3 && dv.every(b => b.repeat === 2 && b.biurLabel === 'תרגום' && b.biurSay?.[0] && !b.sub?.length));
  assert.ok(dv.every(b => /[\u05B0-\u05BC]/.test(b.biur[0])), 'Onkelos vocalized');
  setTextOptions({ shnayimSplit: 'week' });
  const wk = await buildDoc(plan, 'shnayim'), wv = wk.blocks.filter(b => b.type === 'v');
  const P = shnayimParts(plan);
  assert.equal(P.length, 1);
  const sun = dayPlan(new Date('2026-11-08T12:00:00')).chumash, sat = dayPlan(new Date('2026-11-14T12:00:00')).chumash;
  assert.deepEqual([P[0].from, P[0].to], [sun.from, sat.to]);
  assert.ok(wv.length > dv.length * 4);
  assert.match(await describe(plan, 'shnayim'), /כל הפרשה/);
  setTextOptions({});
});

// ---------------- browser ----------------
const { serve, launch, pageWith, CHROME } = await import('./helpers.mjs');
const fakeSynth = () => {
  window.__spoken = []; window.__ttsMinMsPerChar = 0;
  const v = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => v, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 2); }, 2); } } });
};
test('reader: Shnayim Mikra reads the verse twice, then Onkelos; Nach Yomi and Sefer HaMitzvot with niqqud; 320 px', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const prefs = { lessonNach: true, lessonShnayim: true, lessonMitzvot: true, ttsEngine: 'web', ttsContinuous: false };
    const p = await pageWith(b, srv.url, { prefs, init: fakeSynth, viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + '#/d/2026-11-13');
    await p.waitForFunction(() => /יחזקאל פרק י/.test(document.querySelector('[data-what="nachyomi"]')?.textContent || ''));
    await p.goto(srv.url + '#/r/shnayim/2026-11-13'); await p.waitForSelector('#rc .seg .biur');
    assert.ok(!(await p.$('#rc .rashi')), 'no Rashi in Shnayim Mikra');
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__spoken.length >= 3);
    const sp = (await p.evaluate(() => window.__spoken.slice(0, 3))).map(x => x.replace(/[\u0591-\u05C7]/g, ''));
    assert.equal(sp[0], sp[1], 'the verse twice');
    const targ = (await p.$eval('#rc .seg .biur', el => el.textContent)).replace(/[\u0591-\u05C7]/g, '').replace(/^\s*תרגום\s*/, '').split(/\s+/)[0];
    assert.ok(sp[2] !== sp[0] && sp[2].startsWith(targ), `then the Targum: ${sp.join(' | ')}`);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow at 320 px');
    await p.goto(srv.url + '#/r/mitzvot/2026-11-13'); await p.waitForSelector('#rc .seg .t');
    assert.match(await p.$eval('#rc .seg .t', el => el.textContent), /[\u05B0-\u05BC]/, 'Sefer HaMitzvot shown with niqqud');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  } finally { await b.close(); srv.close(); }
});
