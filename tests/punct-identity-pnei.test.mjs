// Letters + niqqud of punctuated Pnei Moshe comments must match the
// pre-punctuation snapshot (clause punctuation ,.;:?! is ignored).
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url).pathname;
const snapPath = new URL('../verification/punct-identity-pnei.json', import.meta.url).pathname;

function stripP(s) {
  return String(s || '').replace(/[.,;:?!]+/g, '');
}
function sha(s) {
  return createHash('sha256').update(stripP(s)).digest('hex');
}

test('punct-identity-pnei: letters+niqqud unchanged after adding punctuation', () => {
  assert.equal(existsSync(snapPath), true, 'missing verification/punct-identity-pnei.json');
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  let n = 0;
  for (const row of snap.rows) {
    if (!row.changed) continue;
    const data = JSON.parse(readFileSync(ROOT + 'site/data/' + row.file, 'utf8'));
    const comment = data.segs[row.seg][1][row.idx];
    assert.equal(typeof comment, 'string', `${row.file} segs[${row.seg}][1][${row.idx}]`);
    assert.equal(sha(comment), row.hash, `${row.file} segs[${row.seg}][1][${row.idx}] letters/niqqud changed`);
    n++;
  }
  assert.ok(n >= 50, 'snapshot unexpectedly small: ' + n);
  assert.equal(snap.n_pnei, 90);
  assert.equal(n, snap.n_pnei);
});
