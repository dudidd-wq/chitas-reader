// Speaker startAt(queueIndex), replay, stopAfterCurrent – run in a fake browser env.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import fs from 'node:fs';

function installFakeSpeech(g) {
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  g.__spoken = [];
  let cur = null;
  const synth = {
    getVoices: () => voices, cancel() { if (cur) { clearTimeout(cur.t); cur = null; } }, pause() {}, resume() {}, speaking: false, pending: false,
    addEventListener() {}, removeEventListener() {},
    speak(u) {
      g.__spoken.push(u.text);
      const t = setTimeout(() => {
        u.onstart?.({});
        cur = { t: setTimeout(() => { cur = null; u.onend?.({}); }, g.__chunkMs ?? 20) };
      }, 2);
      cur = { t };
    },
  };
  g.window = g;
  g.speechSynthesis = synth;
  g.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; this.rate = 1; this.voice = null; };
}

async function loadSpeaker() {
  const g = { console, setTimeout, clearTimeout, performance: { now: () => Date.now() }, URL, Blob };
  // structuredClone etc.
  Object.assign(g, globalThis);
  installFakeSpeech(g);
  g.__ttsMinMsPerChar = 0;
  g.__ttsPauseScale = 0;
  // Dynamic import of tts.js would use this process's missing window. Instead evaluate in a context
  // is heavy because of ESM deps. Use Playwright-free approach: import in this process after
  // defining global window BEFORE the first import of tts.js. This file is the first importer.
  if (typeof globalThis.window === 'undefined') {
    installFakeSpeech(globalThis);
    globalThis.__ttsMinMsPerChar = 0;
    globalThis.__ttsPauseScale = 0;
  }
  const { Speaker } = await import('../site/js/tts.js');
  return Speaker;
}

let Speaker;
test('A5 setup', async () => { Speaker = await loadSpeaker(); });

test('A5: startAt(seg, queueIndex) starts at that queue item', async () => {
  const events = [];
  const sp = new Speaker({ onSegment: (si, frac) => events.push(['seg', si, frac]), onState: s => events.push(['st', s]), onEnd: e => events.push(['end', e]), onError: e => events.push(['err', e]) });
  globalThis.__chunkMs = 15;
  sp.load([
    { parts: ['שלום עליכם חברים יקרים מאוד'] },
    { parts: ['עוד משפט ארוך להפרדה לקטעים'] },
  ], { rate: 1, stress: false, divineName: 'hashem' });
  assert.ok(sp.queue.length >= 2, 'expected more than one chunk, got ' + sp.queue.length);
  const qi = Math.min(1, sp.queue.length - 1);
  sp.startAt(0, qi);
  assert.equal(sp.i, qi);
  await new Promise(r => setTimeout(r, 40));
  sp.stop();
});

test('A5: replay() returns to the first chunk of the current segment', () => {
  const sp = new Speaker({ onSegment() {}, onState() {}, onEnd() {}, onError() {} });
  sp.queue = [{ si: 0, text: 'a', gap: 0 }, { si: 0, text: 'b', gap: 0 }, { si: 1, text: 'c', gap: 0 }];
  sp.segCount = 2;
  sp.i = 1;
  sp.state = 'paused';
  sp.replay();
  assert.equal(sp.i, 0);
});

test('A5: stopAfterCurrent stops after the playing chunk and does not finish complete', async () => {
  const events = [];
  const sp = new Speaker({
    onSegment() {},
    onState: s => events.push(s),
    onEnd: e => events.push(e),
    onSleepStop: () => events.push('sleep'),
    onError: e => events.push('err:' + e),
  });
  globalThis.__chunkMs = 20;
  sp.load([{ parts: ['שלום'] }, { parts: ['עליכם'] }], { rate: 1, stress: false, divineName: 'hashem' });
  assert.ok(sp.queue.length >= 2, 'queue ' + sp.queue.length);
  sp.startAt(0, 0);
  sp.stopAfterCurrent = true;
  await new Promise(r => setTimeout(r, 80));
  assert.ok(events.includes('sleep'), 'events ' + JSON.stringify(events));
  assert.equal(sp.state, 'stopped');
  assert.ok(!events.some(e => e && e.complete === true), 'must not mark complete: ' + JSON.stringify(events));
});

test('A5: skip(-1) after 2s in a chunk is replay, not the previous segment', () => {
  const sp = new Speaker({ onSegment() {}, onState() {}, onEnd() {}, onError() {} });
  sp.queue = [{ si: 0, text: 'a', gap: 0 }, { si: 1, text: 'b', gap: 0 }];
  sp.segCount = 2;
  sp.i = 1;
  sp.state = 'playing';
  sp.chunkStarted = performance.now() - 2500;
  let replayed = false;
  sp.replay = () => { replayed = true; };
  sp.skip(-1);
  assert.equal(replayed, true);
  assert.equal(sp.i, 1); // skip did not walk back a segment
});

test('A5: stop() clears stopAfterCurrent so the next play is not cut short', async () => {
  const events = [];
  const sp = new Speaker({
    onSegment() {}, onState: s => events.push(s),
    onEnd: e => events.push(e),
    onSleepStop: () => events.push('sleep'),
    onError: e => events.push('err:' + e),
  });
  globalThis.__chunkMs = 15;
  sp.load([{ parts: ['שלום'] }, { parts: ['עליכם חברים'] }], { rate: 1, stress: false, divineName: 'hashem' });
  sp.startAt(0, 0);
  sp.stopAfterCurrent = true;
  sp.stop();
  assert.equal(sp.stopAfterCurrent, false);
  assert.equal(sp.chunkStarted, 0);
  events.length = 0;
  sp.startAt(0, 0);
  await new Promise(r => setTimeout(r, 80));
  assert.ok(!events.includes('sleep'), 'events ' + JSON.stringify(events));
  sp.stop();
});

test('A5: shouldRestartCurrent is false until the new chunk has actually started', () => {
  const sp = new Speaker({ onSegment() {}, onState() {}, onEnd() {}, onError() {} });
  sp.queue = [{ si: 0, text: 'a', gap: 0 }, { si: 1, text: 'b', gap: 0 }];
  sp.segCount = 2;
  sp.i = 1;
  sp.state = 'playing';
  sp.chunkStarted = performance.now() - 5000;
  sp.speakCurrent(); // zeros chunkStarted at the start of the new chunk
  assert.equal(sp.shouldRestartCurrent(-1), false);
  let wentPrev = false, replayed = false;
  const orig = sp.replay.bind(sp);
  sp.replay = () => { replayed = true; };
  // without a fresh chunkStarted, skip(-1) must walk back a segment
  const iBefore = sp.i;
  sp.skip(-1);
  assert.equal(replayed, false);
  assert.equal(sp.i, 0);
});

test('A5: finish() → onState(stopped) → onEnd keeps the sleep deadline when auto-advancing', async () => {
  const R = { sleepUntil: Date.now() + 30 * 60000, sleepT: null, pendingSleepUntil: null };
  const deadline = R.sleepUntil;
  function clearSleepTimer(resetDeadline = true) {
    clearTimeout(R.sleepT); R.sleepT = null;
    if (resetDeadline) R.sleepUntil = null;
  }
  const prefs = { ttsContinuous: true };
  const nextUnitId = () => 'tehillim';
  let openedAuto = false;
  const sp = new Speaker({
    onSegment() {},
    onState(st) {
      if (st === 'stopped') clearSleepTimer(false);
    },
    onEnd({ complete }) {
      if (!complete) { clearSleepTimer(true); return; }
      if (prefs.ttsContinuous && nextUnitId()) {
        if (R.sleepUntil) R.pendingSleepUntil = R.sleepUntil;
        const auto = true;
        const holdSleep = auto ? (R.pendingSleepUntil || R.sleepUntil) : null;
        R.pendingSleepUntil = null;
        if (holdSleep) { clearSleepTimer(false); R.sleepUntil = holdSleep; }
        else clearSleepTimer(true);
        openedAuto = true;
      } else clearSleepTimer(true);
    },
    onError() {},
  });
  globalThis.__chunkMs = 15;
  sp.load([{ parts: ['שלום'] }], { rate: 1, stress: false, divineName: 'hashem' });
  sp.startAt(0, 0);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(openedAuto, true);
  assert.equal(R.sleepUntil, deadline);
});

test('A5: finish() without a next lesson, or a hard stop, clears the sleep deadline', async () => {
  const R = { sleepUntil: Date.now() + 30 * 60000, sleepT: null };
  function clearSleepTimer(resetDeadline = true) {
    clearTimeout(R.sleepT); R.sleepT = null;
    if (resetDeadline) R.sleepUntil = null;
  }
  const sp = new Speaker({
    onSegment() {},
    onState(st) { if (st === 'stopped') clearSleepTimer(false); },
    onEnd({ complete }) {
      if (!complete) { clearSleepTimer(true); return; }
      clearSleepTimer(true);
    },
    onError() {},
  });
  globalThis.__chunkMs = 15;
  sp.load([{ parts: ['שלום'] }], { rate: 1, stress: false, divineName: 'hashem' });
  sp.startAt(0, 0);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(R.sleepUntil, null);

  const sp2 = new Speaker({
    onSegment() {},
    onState(st) { if (st === 'stopped') clearSleepTimer(false); },
    onEnd() {},
    onError() {},
  });
  R.sleepUntil = Date.now() + 30 * 60000;
  sp2.load([{ parts: ['שלום'] }, { parts: ['עליכם'] }], { rate: 1, stress: false, divineName: 'hashem' });
  sp2.startAt(0, 0);
  sp2.stop();
  clearSleepTimer(true); // closeReader / user leaving
  assert.equal(R.sleepUntil, null);
});
