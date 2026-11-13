// Letters + niqqud of punctuated Torah Or / Likkutei Torah paragraphs must match the
// pre-punctuation snapshot (clause punctuation ,.;:?! is ignored).
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url).pathname;
const snapPath = new URL('../verification/punct-identity-105.json', import.meta.url).pathname;

function stripP(s) {
  return String(s || '').replace(/[.,;:?!]+/g, '');
}
function sha(s) {
  return createHash('sha256').update(stripP(s)).digest('hex');
}

test('punct-identity-105: letters+niqqud unchanged after adding punctuation', () => {
  assert.equal(existsSync(snapPath), true, 'missing verification/punct-identity-105.json');
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  let n = 0;
  for (const row of snap.rows) {
    if (!row.changed) continue;
    const f = ROOT + 'site/data/' + row.file;
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const para = data.days[row.day][row.idx];
    assert.ok(para && typeof para.t === 'string', row.file + ' day ' + row.day + '[' + row.idx + ']');
    assert.equal(sha(para.t), row.hash, `${row.file} days[${row.day}][${row.idx}] letters/niqqud changed`);
    n++;
  }
  assert.ok(n >= 100, 'snapshot unexpectedly small: ' + n);
  assert.equal(snap.n_tolt, 187);
  assert.equal(n, snap.n_tolt);
});
