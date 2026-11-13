// Letters + niqqud of punctuated Rambam / Sefer HaMitzvot paragraphs must match the
// pre-punctuation snapshot (clause punctuation ,.;:?! is ignored).
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url).pathname;
const snapPath = new URL('../verification/punct-identity-202.json', import.meta.url).pathname;

function stripP(s) {
  return String(s || '').replace(/[.,;:?!]+/g, '');
}
function sha(s) {
  return createHash('sha256').update(stripP(s)).digest('hex');
}

test('punct-identity-202: letters+niqqud unchanged after adding punctuation', () => {
  assert.equal(existsSync(snapPath), true, 'missing verification/punct-identity-202.json');
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  let n = 0;
  for (const row of snap.rows) {
    const f = ROOT + 'site/data/' + row.file;
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const arr = data[row.key];
    assert.ok(Array.isArray(arr), row.file + ' ' + row.key);
    assert.equal(sha(arr[row.idx]), row.hash, `${row.file}[${row.key}][${row.idx}] letters/niqqud changed`);
    n++;
  }
  assert.ok(n >= 100, 'snapshot unexpectedly small: ' + n);
  assert.equal(snap.n_rambam, 334);
  assert.equal(snap.n_mitzvot, 6);
});
