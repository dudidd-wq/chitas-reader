// 1.0.72: bedtime Shema — "אנא בכח" title shown once, as a heading (not read aloud); the smaller note removed
import test from 'node:test';
import assert from 'node:assert/strict';
import '../tools/build-search.mjs';
import { buildSiddurDoc } from '../site/js/texts.js';
test('אנא בכח appears once, as a heading', async () => {
  const d = await buildSiddurDoc('shema', 1);
  const hits = d.blocks.filter(b => (b.text || b.html || '').replace(/<[^>]*>/g, '').trim() === 'אנא בכח');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].type, 'h');
  assert.equal(d.blocks.some(b => b.id === 'shema-1-39'), false);
});
import { dupTitleDrops } from '../site/js/texts.js';
import fs from 'node:fs';
test('heading-echo notes dropped site-wide (47), real repeats untouched', () => {
  const d = new URL('../site/data/siddur/', import.meta.url).pathname; let c = 0;
  for (const b of fs.readdirSync(d)) { if (!fs.statSync(d + b).isDirectory()) continue;
    for (const f of fs.readdirSync(d + b)) { const r = JSON.parse(fs.readFileSync(d + b + '/' + f)).b;
      for (const i of dupTitleDrops(r, b, +f.split('.')[0])) { c++; assert.equal(r[i][0], 'n'); } } }
  assert.equal(c, 47);
});
test('ברכת הגומל title once, as heading', async () => {
  for (const [b, n] of [['shacharit', 5], ['shabbat', 5]]) {
    const d = await buildSiddurDoc(b, n);
    const h = d.blocks.filter(x => (x.text || x.html || '').replace(/<[^>]*>/g, '').trim() === 'ברכת הגומל');
    assert.equal(h.length, 1); assert.equal(h[0].type, 'h');
  }
});
