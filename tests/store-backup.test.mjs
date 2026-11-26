// Unit tests for store.js: library keys with spaces/%20, atomic import validation, done-entry protection, and storage error reporting.
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
let failWrite = false;
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    if (failWrite) throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
    mem.set(k, String(v));
  },
  removeItem: k => mem.delete(k),
};

const store = await import('../site/js/store.js');
const {
  prefs, setPref, getProgress, setProgress, exportBackup, importBackup,
  getStorageStatus, isValidProgressKey, PROGRESS_CAP, PROGRESS_WARN,
} = store;

test('isValidProgressKey accepts library keys with spaces and %20 while rejecting traversal/arbitrary keys', () => {
  for (const k of [
    'lib|nach/I Samuel/1',
    'lib|nach/Song of Songs/3',
    'lib|nach/Song%20of%20Songs/3',
    'lib|bavli/Bava Kamma/2a',
    'lib|yerushalmi/Rosh Hashanah/1',
    'lib|mishnah/Maaser Sheni/1',
    'siddur|shacharit/3',
    '2026-11-02|chumash|il',
  ]) assert.equal(isValidProgressKey(k), true, k);

  for (const k of [
    'lib|../etc/passwd',
    'lib|nach//1',
    'lib|nach/ /1',
    'lib|nach/I Samuel/1/extra/deep',
    'arbitrary|key',
    '__proto__',
  ]) assert.equal(isValidProgressKey(k), false, k);
});

test('importBackup preserves library keys with spaces, normalizes %20 and prefs, and is atomic on bad input', () => {
  setPref('design', 'modern');
  setProgress('2026-11-02', 'tanya', { done: true, frac: 1 });

  // Malformed backups must throw without mutating existing prefs or progress
  for (const bad of [
    'not json',
    JSON.stringify({ app: 'other', progress: {} }),
    JSON.stringify({ app: 'chitas-reader', format: 99, progress: {} }),
    JSON.stringify({ app: 'chitas-reader', prefs: { design: 'sefer' }, progress: null }),
    JSON.stringify({ app: 'chitas-reader', prefs: [], progress: {} }),
  ]) {
    assert.throws(() => importBackup(bad));
    assert.equal(prefs.design, 'modern');
    assert.equal(getProgress('2026-11-02', 'tanya')?.done, true);
  }

  const backup = JSON.stringify({
    app: 'chitas-reader',
    format: 1,
    prefs: { design: 'invalid-theme', size: 999, ttsPitch: 50, il: false },
    progress: {
      'lib|nach/I Samuel/1': { pos: '1:5', done: true, t: 100 },
      'lib|nach/Song%20of%20Songs/3': { pos: '3:2', done: true, t: 200 },
      'lib|bavli/Bava Kamma/2a': { pos: '2a.1', done: false, frac: 0.5, t: 300 },
      'bad|key': { done: true, t: 400 },
    },
  });
  const res = importBackup(backup);
  assert.equal(res.ok, true);
  assert.equal(prefs.design, 'classic'); // normalized fallback
  assert.equal(prefs.size, 48); // clamped
  assert.equal(prefs.ttsPitch, 6); // clamped
  assert.equal(prefs.il, false);

  const exported = JSON.parse(mem.get('chitas-reader.v1'));
  assert.equal(exported.progress['lib|nach/I Samuel/1']?.done, true);
  assert.equal(exported.progress['lib|nach/Song of Songs/3']?.done, true);
  assert.equal(exported.progress['lib|bavli/Bava Kamma/2a']?.frac, 0.5);
  assert.equal(exported.progress['bad|key'], undefined);
  assert.ok(exportBackup().size > 0);
});

test('save() raises cap, evicts incomplete entries before done entries, and exposes storage errors atomically', () => {
  // Seed PROGRESS_CAP - 5 done entries + 20 incomplete entries via importBackup replace
  const bulk = {};
  for (let i = 0; i < PROGRESS_WARN + 10; i++) {
    bulk[`lib|tehillim/${i}`] = { done: i < PROGRESS_WARN, frac: i < PROGRESS_WARN ? 1 : 0.2, t: i + 1 };
  }
  const replaceRes = importBackup(JSON.stringify({ app: 'chitas-reader', format: 1, prefs: {}, progress: bulk }), { mode: 'replace' });
  assert.equal(replaceRes.ok, true);
  assert.equal(replaceRes.nearLimit, true);
  assert.equal(getStorageStatus().nearLimit, true);

  // Add enough incomplete entries to exceed PROGRESS_CAP
  const extra = {};
  for (let i = 0; i < PROGRESS_CAP - PROGRESS_WARN + 50; i++) {
    extra[`siddur|shacharit/${i + 1}`] = { done: false, frac: 0.1, t: 10000 + i };
  }
  importBackup(JSON.stringify({ app: 'chitas-reader', format: 1, prefs: {}, progress: extra }), { mode: 'merge' });
  const saved = JSON.parse(mem.get('chitas-reader.v1'));
  const keys = Object.keys(saved.progress);
  assert.ok(keys.length <= PROGRESS_CAP, `expected <= ${PROGRESS_CAP}, got ${keys.length}`);
  // Every done entry survived eviction
  for (let i = 0; i < PROGRESS_WARN; i++) assert.equal(saved.progress[`lib|tehillim/${i}`]?.done, true);

  // Storage failure must be exposed and importBackup must roll back atomically
  failWrite = true;
  const r1 = setPref('size', 30);
  assert.equal(r1.ok, false);
  assert.equal(getStorageStatus().ok, false);
  assert.throws(() => importBackup(JSON.stringify({ app: 'chitas-reader', format: 1, prefs: { design: 'sefer' }, progress: {} }), { mode: 'replace' }));
  // Rollback preserved previous prefs and progress
  assert.notEqual(prefs.design, 'sefer');
  assert.ok(getProgress('2026-11-02', 'tanya') !== undefined);
  failWrite = false;
  setPref('size', 24);
  assert.equal(getStorageStatus().ok, true);
});
