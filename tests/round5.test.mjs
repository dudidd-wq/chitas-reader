// Round-5 review fixes: TTS number grammar, אגרת without geresh, glossary headwords, ס/פ gaps, report link, Rambam glosses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { numberWords, vav, prepareForTTS } from '../site/js/tts-prep.js';
import { badLemma } from '../tools/gloss-lemma.mjs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const rd = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const G = rd('../site/data/glossary.json'), RX = rd('../tools/gloss-rambam-xcheck.json'), RR = rd('../tools/gloss-rambam-review.json');
const strip = s => s.normalize('NFC');

test('TTS: the conjunction ו takes the right vowel (42 → וּשְׁתַּיִם, 29 → וְתֵשַׁע, 150 → וַחֲמִשִּׁים)', () => {
  assert.equal(vav('שְׁתַּיִם'), 'וּשְׁתַּיִם'); assert.equal(vav('בֵּית'), 'וּבֵית'); assert.equal(vav('חֲמִשִּׁים'), 'וַחֲמִשִּׁים'); assert.equal(vav('תֵּשַׁע'), 'וְתֵשַׁע');
  assert.ok(strip(numberWords(42)).endsWith(strip('וּשְׁתַּיִם')), numberWords(42));
  assert.ok(strip(numberWords(29)).endsWith(strip('וְתֵשַׁע')), numberWords(29));
  assert.ok(strip(numberWords(150)).endsWith(strip('וַחֲמִשִּׁים')), numberWords(150));
});

test('TTS: "אגרת כט" (no geresh) is read as a number; "פרק זה" and other words are left alone', () => {
  const r = prepareForTTS('<p>אגרת כט</p>'); assert.match(r, /עֶשְׂרִים/, r); assert.doesNotMatch(r, /כט/);
  for (const t of ['פרק זה', 'סימן לב', 'ובאגרת זו', 'אגרת הקדש']) { const o = prepareForTTS(`<p>${t}</p>`); assert.doesNotMatch(o, /עֶשְׂרִים|שְׁלֹשִׁים/, t); }
});

test('glossary headwords are well formed (no shin/sin dot on another letter, no holam-dot artefact)', () => {
  const all = [...Object.values(G.verses), ...Object.values(G.rambam.verses)].flatMap(v => Object.values(v));
  for (const e of all) assert.ok(!badLemma(e.l), e.l);
  const ls = new Set(all.map(e => e.l.normalize('NFC')));
  assert.ok(!ls.has('רׂאִי'.normalize('NFC')) && !ls.has('מַעֲשֶֹה'.normalize('NFC')));
});

test('Rambam glosses: every published one has check (a) location, check (b) evidence and a manual "keep"', () => {
  const m = G.rambam.meta; let n = 0;
  for (const [ref, ws] of Object.entries(G.rambam.verses)) for (const [k, e] of Object.entries(ws)) {
    n++; assert.match(ref, /^Rambam [A-Za-z_]+\.\d+\.\d+$/);
    const x = RX.entries[`${ref}|${k}`]; assert.ok(x?.pass, `xcheck ${ref} ${k}`); assert.ok(x.lemmaAgree?.length && x.translationAgree?.length, 'evidence');
    const r = RR.entries.find(r => r.ref === ref && r.key === k); assert.equal(r?.decision, 'keep', `${ref} ${k}`); assert.equal(r.g, e.g);
    assert.match(e.src, /^https:\/\/he\.wiktionary\.org\/wiki\//);
  }
  assert.equal(n, m.published); assert.ok(n >= 5 && n <= 30);
  for (const r of RR.entries.filter(r => r.decision === 'reject')) assert.ok(!G.rambam.verses[r.ref]?.[r.key], `rejected but published: ${r.key}`);
});

test('reader: a Rambam day shows its gloss; note and About state the same counts; ס/פ gaps are empty; report links carry the ref', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url), f = x => x.toLocaleString('he-IL');
    await p.goto(srv.url + '#/r/rambam3/2027-01-05'); await p.waitForSelector('#doc-gloss');
    assert.ok(await p.$$eval('.gl', els => els.some(e => /ילדים קטנים/.test(e.dataset.g || e.title || e.getAttribute('aria-label') || '') || e.textContent.includes('טפם') || e.textContent.includes('טַפָּם') || e.textContent.includes('טַפָם'))), 'וטפם glossed');
    const note = await p.textContent('#doc-gloss');
    assert.ok(note.includes(f(G.meta.manualReview.published)) && note.includes(f(G.rambam.meta.published)), note);
    await p.focus('#b-report'); const href = await p.getAttribute('#b-report', 'href');
    assert.match(href, /github\.com\/dudidd-wq\/chitas-reader\/issues\/new/);
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('.seg');
    assert.ok(await p.$$eval('.pe', els => els.length > 0 && els.every(e => e.textContent === '' && e.getAttribute('aria-hidden') === 'true')));
    const note2 = await p.textContent('#doc-gloss'); assert.ok(note2.includes(f(G.meta.manualReview.published)));
    await p.goto(srv.url + '#/about'); await p.waitForFunction(n => document.querySelector('#gloss-rb')?.textContent === n, f(G.rambam.meta.published));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
