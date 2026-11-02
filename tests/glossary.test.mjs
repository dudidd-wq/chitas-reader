import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { norm } from '../site/js/hnorm.js';
const G = JSON.parse(fs.readFileSync(new URL('../site/data/glossary.json', import.meta.url)));
const torah = b => new URL(`../site/data/${b === 'Psalms' ? 'tehillim' : 'torah/' + b}/`, import.meta.url);

test('glossary: licence + every entry sourced, ≤ 4 words, anchored to a real word of that verse', () => {
  assert.equal(G.meta.license, 'CC BY-SA 4.0');
  let n = 0;
  for (const [ref, words] of Object.entries(G.verses)) {
    const [, book, c, v] = ref.match(/^(\w+) (\d+):(\d+)$/);
    const text = JSON.parse(fs.readFileSync(new URL(`${c}.json`, torah(book)))).v[v - 1];
    // same token split as the reader's DOM walk (an element such as <big> splits a word into separate text nodes)
    const toks = text.replace(/<i class="fn">[^<]*<\/i>/g, '').replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ').split(/[\s\u05BE]+/).map(norm);
    for (const [key, e] of Object.entries(words)) {
      n++;
      const [form, k] = key.split('#'), count = toks.filter(t => t === form).length;
      if (k) assert.ok(count > 1 && +k >= 1 && +k <= count, `${ref}: ${key} – occurrence key on a form that occurs ${count}×`);
      else assert.equal(count, 1, `${ref}: ${form} occurs ${count}× in the verse but is not occurrence-specific`);
      assert.match(e.src, /^https:\/\/he\.wiktionary\.org\/wiki\//);
      assert.ok(e.g && e.g.split(' ').length <= 4, `${ref} ${form}: ${e.g}`);
      assert.ok(e.l);
    }
  }
  assert.ok(n > 400, 'coverage collapsed: ' + n);
  console.log('glossed verse-words:', n, 'verses:', Object.keys(G.verses).length);
});

test('glossary: curated allow-list — every published entry was reviewed by hand; known-bad entries removed', async () => {
  const R = JSON.parse(fs.readFileSync(new URL('../tools/gloss-review.json', import.meta.url)));
  const idx = new Map(R.entries.map(e => [`${e.ref}|${e.form}`, e]));
  assert.ok(R.entries.length >= 1046);
  for (const e of R.entries) assert.ok(['keep', 'reject', 'adapt'].includes(e.decision) && (e.decision !== 'reject' || R.meta.codes[e.why]), JSON.stringify(e));
  let n = 0;
  for (const [ref, ws] of Object.entries(G.verses)) for (const [form, e] of Object.entries(ws)) {
    n++; const r = idx.get(`${ref}|${form}`) || idx.get(`${ref}|${form.split('#')[0]}`);
    assert.ok(r && r.decision !== 'reject', `${ref} ${form} published but not approved`);
    assert.equal(e.g, r.decision === 'adapt' ? r.g2 : r.g);
    assert.equal(!!e.adapted, r.decision === 'adapt');
  }
  assert.equal(n, G.meta.curated.published);
  const has = (ref, w) => Object.keys(G.verses[ref] || {}).some(f => f.split('#')[0] === norm(w));
  for (const [ref, w] of [['Genesis 18:7', 'רַךְ'], ['Genesis 27:41', 'הַבְּרָכָה'], ['Genesis 31:27', 'וַתִּגְנֹב'], ['Genesis 42:7', 'וַיִּתְנַכֵּר'],
    ['Psalms 11:2', 'כּוֹנְנוּ'], ['Leviticus 11:18', 'הָרָחָם'], ['Exodus 30:25', 'רֹקַח'], ['Psalms 19:5', 'קַוָּם'], ['Genesis 37:3', 'יוֹסֵף'], ['Psalms 78:67', 'יוֹסֵף'], ['Genesis 1:6', 'בֵּין'], ['Psalms 37:17', 'וְסוֹמֵךְ']])
    assert.ok(!has(ref, w), `${ref} ${w} should be removed`);
  for (const ws of Object.values(G.verses)) for (const e of Object.values(ws)) {
    assert.ok(!/יחסי.?מין|איבר מין|דמות מקראית|ביאה|פליטת זרע/.test(e.g), e.g);
    assert.ok(!/[<>(]$|\(\d\)|^בנסמך$|^בפרט$/.test(e.g), 'garbled: ' + e.g);
  }
  // round 3: the hand-softened (adapted) wordings did not pass the two-check rule and are no longer published
  assert.ok(!G.verses['Genesis 4:1']?.[norm('יָדַע')]);
});
