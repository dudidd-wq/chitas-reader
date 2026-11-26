// 1.0.229: exact TTS resume (progress.say) and sleep-timer preference.
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
};

const {
  normalizePrefs, DEFAULT_PREFS, TTS_SLEEP, snapSleep,
  setProgress, getProgress, importBackup, exportBackup,
} = await import('../site/js/store.js');

test('A5: ttsSleep snaps to 0/15/30/45/60 and is a stored preference', () => {
  assert.deepEqual(TTS_SLEEP, [0, 15, 30, 45, 60]);
  assert.equal(DEFAULT_PREFS.ttsSleep, 0);
  assert.equal(snapSleep(30), 30);
  assert.equal(snapSleep(12), 0);
  assert.equal(normalizePrefs({ ttsSleep: 45 }).ttsSleep, 45);
  assert.equal(normalizePrefs({ ttsSleep: 99 }).ttsSleep, 0);
  assert.equal(normalizePrefs({ ttsSleep: '15' }).ttsSleep, 0);
});

test('A5: progress.say (queue index) is kept on save/export; junk is dropped', async () => {
  const iso = '2026-11-26', unit = 'tanya';
  setProgress(iso, unit, { pos: 't1', sub: 0, frac: 0.4, say: 7, done: false });
  const got = getProgress(iso, unit);
  assert.equal(got.say, 7);
  assert.equal(got.pos, 't1');
  const blob = exportBackup();
  const text = await blob.text();
  const data = JSON.parse(text);
  const key = Object.keys(data.progress).find(k => k.startsWith(iso + '|' + unit));
  assert.equal(data.progress[key].say, 7);
  data.progress[key].say = -3;
  importBackup(JSON.stringify(data), { mode: 'replace' });
  assert.equal(getProgress(iso, unit)?.say, undefined);
  data.progress[key].say = 4;
  importBackup(JSON.stringify(data), { mode: 'replace' });
  assert.equal(getProgress(iso, unit).say, 4);
});

test('A5: openReader keeps the sleep deadline across ttsContinuous auto-advance; turning the timer off cancels a pending stop', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(src, /const holdSleep = auto \? \(R\.pendingSleepUntil \|\| R\.sleepUntil\) : null;/);
  assert.match(src, /if \(autoplay && R\.sleepUntil\) R\.pendingSleepUntil = R\.sleepUntil;/);
  assert.match(src, /if \(holdSleep\) \{ clearSleepTimer\(false\); R\.sleepUntil = holdSleep; \}/);
  assert.match(src, /if \(!v && R\.speaker\) R\.speaker\.stopAfterCurrent = false;/);
  // finish() emits stopped before onEnd; onState must not wipe the deadline
  assert.match(src, /else if \(st === 'stopped'\)[\s\S]*?clearSleepTimer\(false\);/);
  assert.match(src, /if \(!complete\) \{ clearSleepTimer\(true\);/);
});
