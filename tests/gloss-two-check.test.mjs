// Round-3 review MUST-FIX: "accuracy first". Every published gloss must pass TWO independent checks:
//  (a) a Hebrew-Wiktionary sense that quotes this exact verse and carries no defect/quality template;
//  (b) automated agreement with STEPBible TAHOT (word in context) AND JPS 1917 (verse translation) — tools/gloss-xcheck.py —
//  followed by a manual review. Anything failing either is dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { norm } from '../site/js/hnorm.js';
import { SENSE_FLAGS, ENTRY_FLAGS } from '../tools/gloss-flags.mjs';
const rd = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const G = rd('../site/data/glossary.json'), X = rd('../tools/gloss-xcheck.json'), F = rd('../tools/gloss-flagged.json');
const has = (ref, w) => Object.keys(G.verses[ref] || {}).some(f => f.split('#')[0] === norm(w));

test('defect flags: sense/entry templates recognised (incl. parameters), ordinary templates not', () => {
  for (const t of ['{{פירוש לקוי}}', '{{משוערת}}', '{{הבהרה|מה?}}', '{{דרוש מקור}}', '{{הגדרה לקויה}}', '{{לשכתוב|סיבה=x}}', '{{קצרמר/גזרון}}'])
    assert.ok(SENSE_FLAGS.test('# הגדרה ' + t), t);
  for (const t of ['{{רובד|מקרא}}', '{{צט/תנ"ך|...|בראשית|א|א}}', '{{ניקוד חסר}}', '{{חסר|מֻקְנֶה}}']) assert.ok(!SENSE_FLAGS.test(t) && !ENTRY_FLAGS.test(t), t);
  assert.ok(!ENTRY_FLAGS.test('{{משוערת}}'), 'a conjectural flag on ANOTHER sense must not drop this one');
});

test('MUST 1: no published gloss comes from a flagged definition; Gen 23:18 לְמִקְנָה and the other flagged ones are gone', () => {
  assert.ok(F.length >= 80);
  for (const f of F) assert.ok(!(G.verses[f.ref] || {})[f.form] || G.verses[f.ref][f.form].g !== f.g, `flagged entry published: ${f.ref} ${f.form}`);
  for (const [ref, w] of [['Genesis 23:18', 'לְמִקְנָה'], ['Leviticus 25:51', 'מִקְנָתוֹ'], ['Psalms 3:3', 'סֶלָה'], ['Exodus 12:9', 'מְבֻשָּׁל'], ['Psalms 47:8', 'מַשְׂכִּיל']])
    assert.ok(!has(ref, w), `${ref} ${w}`);
  assert.ok(F.some(f => f.ref === 'Genesis 23:18' && /פירוש לקוי/.test(f.flag)));
  assert.equal(G.meta.stats.tanakh.droppedFlagged, F.length);
});

test('MUST 2 + two-check rule: every published gloss passed TAHOT + JPS cross-check with recorded evidence', () => {
  let n = 0;
  for (const [ref, ws] of Object.entries(G.verses)) for (const [key, e] of Object.entries(ws)) {
    n++;
    const x = X.entries[`${ref}|${key}`];
    assert.ok(x && x.pass && x.lemmaOk, `${ref} ${key}: no passing cross-check`);
    assert.equal(x.g, e.g);
    assert.ok(x.tahot.en && x.jps.length > 10, `${ref} ${key}: evidence missing`);
    assert.ok(x.ev.every(v => v.tahotAgree.length && v.jpsAgree.length));
  }
  assert.equal(n, G.meta.curated.published);
  assert.ok(!has('Psalms 9:13', 'דֹרֵשׁ'), 'Ps 9:13 דֹּרֵשׁ = avenges (JPS) — "שאל, חקר" is wrong in context');
  assert.equal(X.entries['Psalms 9:13|' + norm('דֹרֵשׁ')].pass, false);
  for (const [ref, w] of [['Psalms 119:147', 'בַנֶּשֶׁף'], ['Numbers 11:31', 'וַיָּגָז'], ['Psalms 119:100', 'אֶתְבּוֹנָן'], ['Psalms 127:5', 'יְדַבְּרוּ']]) assert.ok(!has(ref, w), `${ref} ${w}`);
  assert.ok(!Object.keys(G.verses['Genesis 15:16'] || {}).includes(norm('הֵנָה') + '#2'), 'Gen 15:16 second הנה = "until now"');
  const m = G.meta.stats.tanakh;
  assert.equal(m.checkB, Object.values(X.entries).filter(x => x.pass).length);
  assert.ok(G.meta.verification?.sources?.tahot && G.meta.verification.sources.jps1917);
});

import { serve, launch, pageWith, CHROME } from './helpers.mjs';
test('Sources page states the two-check method with the real counts; About is honest about the small coverage', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/sources'); await p.waitForFunction(() => document.querySelector('#gloss-counts')?.textContent);
    const t = await p.textContent('#gloss-counts'), page = await p.textContent('.page');
    const m = G.meta, f = x => x.toLocaleString('he-IL');
    for (const x of [m.stats.tanakh.wiktionaryVerseCited, m.stats.tanakh.droppedFlagged, m.stats.tanakh.checkB, m.manualReview.rejectedByHand, m.manualReview.published]) assert.ok(t.includes(f(x)), `${x} in: ${t}`);
    for (const w of ['STEPBible TAHOT', 'JPS 1917', 'פירוש לקוי', 'VERIFICATION.md', 'CC BY 4.0']) assert.ok(page.includes(w), w);
    await p.goto(srv.url + '#/about'); await p.waitForFunction(n => document.querySelector('#gloss-n')?.textContent === n, f(m.manualReview.published));
    const a = await p.textContent('.page');
    assert.match(a, /הכיסוי קטן, בכוונה/); assert.match(a, /בתניא וברש״י אין ביאורים כלל/); assert.ok(a.includes(`ועוד ${f(G.rambam.meta.published)} ביאורים בכל הרמב״ם`));
    assert.doesNotMatch(a, /כ־800/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('verification/GLOSSARY-VERIFICATION.md records the method and the current counts', () => {
  const md = fs.readFileSync(new URL('../verification/GLOSSARY-VERIFICATION.md', import.meta.url), 'utf8');
  const m = G.meta;
  assert.ok(md.includes(`**${m.manualReview.published}**`) && md.includes(`| ${m.stats.tanakh.checkB} |`) && md.includes(`| ${m.stats.tanakh.droppedFlagged} |`));
  for (const w of ['STEPBible', 'CC BY 4.0', 'JPS 1917', 'נחלת הכלל', 'kaikki', 'WordNet', 'tools/fetch-xcheck-data.sh']) assert.ok(md.includes(w), w);
});
