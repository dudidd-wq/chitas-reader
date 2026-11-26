import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_INSTALLED_KEY,
  loadVoiceInstallRecord, saveVoiceInstallRecord,
  markVoiceInstalled, markVoiceRemovedByUser,
  voiceEvicted, spaceWarning, spaceWarningText,
  persistStatusText, EVICTED_TEXT, DELETE_CONFIRM,
} from '../site/js/voice-ux.js';

const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};
function reset() { for (const k of Object.keys(mem)) delete mem[k]; }

test('spaceWarning is silent when there is room or no estimate, and never blocks by itself', () => {
  assert.equal(spaceWarning({ need: 92e6 }), null);
  assert.equal(spaceWarning({ need: 92e6, estimate: { quota: 200e6, usage: 10e6 } }), null);
  assert.equal(spaceWarning({ need: 0, estimate: { quota: 1, usage: 0 } }), null);
  const tight = spaceWarning({ need: 92e6, estimate: { quota: 80e6, usage: 10e6 }, int8Need: 38e6 });
  assert.ok(tight);
  assert.equal(tight.needMb, 92);
  assert.equal(tight.freeMb, 70);
  assert.equal(tight.suggestInt8, true);
  const noInt8 = spaceWarning({ need: 92e6, estimate: { quota: 30e6, usage: 10e6 }, int8Need: 38e6 });
  assert.equal(noInt8.suggestInt8, false);
  assert.equal(spaceWarning({ need: 92e6, estimate: { quota: 80e6, usage: 10e6 }, int8Need: 38e6, alreadyInt8: true }).suggestInt8, false);
});

test('spaceWarningText mentions int8 only when suggested, and stays a question not a block', () => {
  const w = spaceWarning({ need: 92e6, estimate: { quota: 80e6, usage: 10e6 }, int8Need: 38e6 });
  const t = spaceWarningText(w, { int8Mb: 38 });
  assert.match(t, /70 MB פנויים/);
  assert.match(t, /92 MB/);
  assert.match(t, /גרסה הקלה \(כ־38 MB\)/);
  assert.match(t, /להמשיך בכל זאת/);
  assert.match(t, /אינה מדויקת בכל דפדפן/);
  const tight = spaceWarningText(spaceWarning({ need: 92e6, estimate: { quota: 20e6, usage: 0 } }));
  assert.match(tight, /להמשיך בכל זאת\?/);
  assert.doesNotMatch(tight, /גרסה הקלה/);
  assert.equal(spaceWarningText(null), '');
});

test('install record sanitizes, marks install, and distinguishes eviction from user delete', () => {
  reset();
  assert.equal(loadVoiceInstallRecord(), null);
  assert.equal(voiceEvicted({}), false);
  saveVoiceInstallRecord({ variants: ['full', 'nope', 'full'], userRemoved: 'yes', t: -1 });
  const cleaned = loadVoiceInstallRecord();
  assert.deepEqual(cleaned.variants, ['full']);
  assert.equal(cleaned.userRemoved, false);

  reset();
  markVoiceInstalled('full');
  markVoiceInstalled('int8');
  const rec = loadVoiceInstallRecord();
  assert.deepEqual(rec.variants, ['full', 'int8']);
  assert.equal(rec.userRemoved, false);
  assert.equal(voiceEvicted({ full: true, int8: false }, rec), false);
  assert.equal(voiceEvicted({ full: false, int8: false, natural: false }, rec), true);
  assert.equal(mem['chitas-reader.v1'], undefined);
  assert.ok(mem[VOICE_INSTALLED_KEY]);

  markVoiceRemovedByUser();
  const gone = loadVoiceInstallRecord();
  assert.equal(gone.userRemoved, true);
  assert.deepEqual(gone.variants, []);
  assert.equal(voiceEvicted({ full: false }, gone), false);
});

test('persist and evicted copy is honest and local-only', () => {
  assert.equal(persistStatusText(true), 'הדפדפן אישר לא למחוק את הקול.');
  assert.match(persistStatusText(false), /לא הבטיח/);
  assert.match(persistStatusText(false), /אייפון/);
  assert.equal(persistStatusText(null), '');
  assert.match(EVICTED_TEXT, /הוסר מהמכשיר/);
  assert.match(EVICTED_TEXT, /להוריד שוב/);
  assert.match(DELETE_CONFIRM, /למחוק את הקול האיכותי/);
  assert.doesNotMatch(EVICTED_TEXT, /fetch\(|github/i);
});
