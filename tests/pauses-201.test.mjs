// 1.0.101: punctuation pauses for every source; disjunctive taamim become read-aloud pauses (display unchanged).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareForTTS as P, insertTaamPauses, pauseChunks, chunkText } from '../site/js/tts-prep.js';

const H = { stress: true, divineName: 'hashem' };
const letters = s => String(s).replace(/[^\u05D0-\u05EA]/g, '');

test('1.0.101: atnach in a short verse becomes a major pause; tipcha does not (no over-pausing)', () => {
  const gen = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';
  const out = P(gen, H);
  assert.equal(out, 'בְּרֵאשִׁית בָּרָא אֱלֹקִים; אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ.');
  const c = pauseChunks(out);
  assert.equal(c.length, 2);
  assert.equal(c[0].gap, 0.38);
  assert.equal(c[1].gap, 0.38);
  // tipcha-only short verse (וידבר … לאמר): still only the sof-pasuq period
  assert.equal(P('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר׃', H), 'וַיְדַבֵּר הַשֵּׁם אֶל מֹשֶׁה לֵּאמֹר.');
});

test('1.0.101: zaqef in a longer verse becomes a short pause; one-word pieces stay glued', () => {
  // Genesis 1:2: revia, zaqef, atnach, zaqef – a 14-word verse
  const v = JSON.parse(fs.readFileSync(new URL('../site/data/torah/Genesis/1.json', import.meta.url))).v[1].replace(/<[^>]+>/g, '');
  const out = insertTaamPauses(v);
  assert.match(out, /,/);          // zaqef on המים
  assert.match(out, /;/);          // atnach on למים
  assert.ok(!/,{2}|;{2}/.test(out));
  const spoken = P(v, H);
  const ch = pauseChunks(spoken);
  assert.ok(ch.length >= 2);
  assert.ok(ch.every(x => x.gap === 0.18 || x.gap === 0.38));
  // Gemara contract unchanged
  const g = pauseChunks('אמר רבי יוחנן, שמע מינה כך וכך, כן. ועוד דבר אחר.');
  assert.deepEqual(g.map(x => x.c), ['אמר רבי יוחנן,', 'שמע מינה כך וכך, כן.', 'ועוד דבר אחר.']);
  assert.deepEqual(g.map(x => x.gap), [0.18, 0.38, 0.38]);
});

test('1.0.101: ole stress tags in prose are not treated as cantillation; a lone atnach word gets no trailing mark', () => {
  assert.equal(insertTaamPauses('בָּר֫וּךְ אַתָּ֫ה'), 'בָּר֫וּךְ אַתָּ֫ה');
  assert.equal(P('אֱלֹהִ֑ים', H), 'אֱלֹקִים');
  assert.equal(insertTaamPauses('שלום עליכם.'), 'שלום עליכם.');
});

test('1.0.101: prepareForTTS does not change letters, only adds pause punctuation to cantillated text', () => {
  const gen = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';
  const out = P(gen, H);
  assert.equal(letters(out).replace('אלהים', 'אלקים'), letters(P('בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ.', H)));
  // display data is untouched (no commas written into the verse files)
  const ch = JSON.parse(fs.readFileSync(new URL('../site/data/torah/Genesis/1.json', import.meta.url)));
  assert.equal((ch.v[0].match(/,/g) || []).length, 0);
  assert.match(ch.v[0], /\u05C3/); // sof pasuq stays in the displayed verse
});

test('1.0.101: a Tehillim verse with ole ve-yored gets a major mid-verse pause', () => {
  // Ps 1:1 has revia, ole, atnach, etc.
  const ps = JSON.parse(fs.readFileSync(new URL('../site/data/tehillim/1.json', import.meta.url))).v[0];
  const out = P(ps, H);
  assert.ok(/[;,]/.test(out), out);
  assert.equal(letters(out), letters(P(ps.replace(/[\u0591-\u05AF\u05BD]/g, ''), H)));
});
