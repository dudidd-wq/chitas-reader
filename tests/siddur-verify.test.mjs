// Re-runs the siddur cross-check (tools/verify-siddur.mjs) offline against the stored
// reference skeletons (Metsudah Siddur Sefard, Sefaria, CC BY 4.0).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compare, PASSAGES } from '../tools/verify-siddur.mjs';

const root = new URL('..', import.meta.url).pathname;
const ref = JSON.parse(fs.readFileSync(root + 'verification/siddur-ref.json'));

test('at least 15 passages, each found in both texts', () => {
  assert.ok(PASSAGES.length >= 15);
  const res = compare(ref);
  for (const r of res) assert.ok(!r.missing, `${r.name}: missing in ${r.missing}`);
  for (const need of ['ובא לציון', 'והוא רחום', 'אשרי', 'ברוך שאמר', 'ישתבח', 'שמונה עשרה', 'ויהי נועם'])
    assert.ok(res.some(r => r.name.startsWith(need)), need);
});

test('similarity thresholds', () => {
  for (const r of compare(ref)) {
    const min = r.name === 'השכיבנו' ? 0.7 : 0.85;
    assert.ok(r.sim >= min, `${r.name} ${(r.sim * 100).toFixed(1)}% < ${min * 100}%`);
  }
});

test('Ashrei is complete (every alphabet verse present)', () => {
  for (const r of compare(ref).filter(r => r.name.startsWith('אשרי')))
    assert.equal(r.groups.filter(g => g[2] === 'נוסח').length, 0, r.name);
});

test('transcription fixes are reflected in the data', () => {
  const all = fs.readdirSync(root + 'site/data/siddur', { recursive: true }).filter(f => /\/\d+\.json$/.test(f))
    .map(f => fs.readFileSync(root + 'site/data/siddur/' + f, 'utf8')).join('\n');
  for (const bad of ['יָהִד', 'וּמֵאַהֲרֵינוּ', 'וְנִפְלָוֹת']) assert.ok(!all.includes(bad), bad);
  const idx = JSON.parse(fs.readFileSync(root + 'site/data/siddur/index.json'));
  assert.ok(idx.fixes.length >= 4);
});

test('no Hebrew prayer line hidden as an English note', () => {
  for (const f of fs.readdirSync(root + 'site/data/siddur', { recursive: true }).filter(f => /\/\d+\.json$/.test(f))) {
    for (const [t, h] of JSON.parse(fs.readFileSync(root + 'site/data/siddur/' + f)).b) if (t === 'n') {
      const out = h.replace(/<[^>]*>/g, '').replace(/\([^)]*\)|“[^”]*”|"[^"]*"/g, '');
      const H = (out.match(/[\u05D0-\u05EA]/g) || []).length, L = (out.match(/[A-Za-z]/g) || []).length;
      assert.ok(!(H >= 12 && H > 3 * L), `${f}: ${out.slice(0, 80)}`);
    }
  }
});
