// 1.0.73: three-way tachanun setting; old boolean true migrates to 'date'
import test from 'node:test';
import assert from 'node:assert/strict';
const mem = { 'chitas-reader.v1': JSON.stringify({ prefs: { hideNoTachanun: true }, progress: {} }) };
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
test('migration true → date, default off', async () => {
  const S = await import('../site/js/store.js?m=' + Date.now());
  assert.equal(S.prefs.tachanunMode, 'date');
  assert.equal('hideNoTachanun' in S.prefs, false);
  assert.equal(S.DEFAULT_PREFS.tachanunMode, 'off');
});
