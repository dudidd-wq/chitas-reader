import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floatToWavBlob, isLikelyIOS, shouldUseAudioElement, PiperSpeaker } from '../site/js/piper.js';

test('floatToWavBlob writes a valid 16-bit mono WAV header and PCM size', async () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
  const blob = floatToWavBlob(samples, 16000);
  assert.equal(blob.type, 'audio/wav');
  const buf = new Uint8Array(await blob.arrayBuffer());
  assert.equal(buf.length, 44 + samples.length * 2);
  assert.equal(String.fromCharCode(...buf.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...buf.slice(8, 12)), 'WAVE');
  assert.equal(String.fromCharCode(...buf.slice(12, 16)), 'fmt ');
  const view = new DataView(buf.buffer);
  assert.equal(view.getUint32(4, true), 36 + samples.length * 2);
  assert.equal(view.getUint16(20, true), 1);   // PCM
  assert.equal(view.getUint16(22, true), 1);   // mono
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(32, true), 2);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), samples.length * 2);
  // clipped peaks: 1 → 0x7fff, -1 and below → 0x8000
  assert.equal(view.getInt16(44 + 3 * 2, true), 0x7fff);
  assert.equal(view.getInt16(44 + 4 * 2, true), -0x8000);
  assert.equal(view.getInt16(44 + 5 * 2, true), 0x7fff);
  assert.equal(view.getInt16(44 + 6 * 2, true), -0x8000);
});

test('isLikelyIOS detects iPhone, iPad, and iPadOS desktop UA', () => {
  assert.equal(isLikelyIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5), true);
  assert.equal(isLikelyIOS('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'iPad', 5), true);
  assert.equal(isLikelyIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5), true);
  assert.equal(isLikelyIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0), false);
  assert.equal(isLikelyIOS('Mozilla/5.0 (Linux; Android 14)', 'Linux aarch64', 5), false);
  assert.equal(isLikelyIOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0), false);
});

test('shouldUseAudioElement: hook wins; otherwise lockscreen plus iOS only', () => {
  assert.equal(shouldUseAudioElement({ lockscreen: true }, true, false), true);
  assert.equal(shouldUseAudioElement({ lockscreen: true }, false, true), false);
  assert.equal(shouldUseAudioElement({ lockscreen: true }, undefined, true), true);
  assert.equal(shouldUseAudioElement({ lockscreen: false }, undefined, true), false);
  assert.equal(shouldUseAudioElement({ lockscreen: true }, undefined, false), false);
  assert.equal(shouldUseAudioElement({}, undefined, true), false);
});

test('playPcm on the <audio> path starts, advances on ended, and cut() revokes the blob', async () => {
  const created = [];
  const revoked = [];
  globalThis.URL = {
    createObjectURL(b) { const u = 'blob:test-' + created.length; created.push({ u, size: b.size, type: b.type }); return u; },
    revokeObjectURL(u) { revoked.push(u); },
  };
  class FakeAudio {
    constructor() { this.src = ''; this.paused = true; this._onended = null; this.playsInline = false; }
    set onended(fn) { this._onended = fn; }
    get onended() { return this._onended; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    setAttribute() {}
  }
  globalThis.Audio = FakeAudio;
  globalThis.__piperUseAudioEl = true;

  const s = new PiperSpeaker({});
  s.opts = { lockscreen: true, rate: 1 };
  s.state = 'playing';
  s.queue = [{ si: 0, text: 'א', gap: 0, frac: 0 }, { si: 1, text: 'ב', gap: 0, frac: 0 }];
  s.i = 0;
  s.segCount = 2;
  const token = s.token = Symbol();
  const pcm = new Float32Array(16).fill(0.2);
  s.playPcm({ audio: pcm, sampleRate: 22050 }, 4, token);
  assert.equal(created.length, 1);
  assert.equal(created[0].type, 'audio/wav');
  assert.equal(created[0].size, 44 + (16 + 4) * 2);
  assert.equal(s.el.src, 'blob:test-0');
  assert.equal(s.el.paused, false);
  assert.equal(typeof s.el.onended, 'function');

  // ended while still playing advances to the next chunk; speakCurrent needs a worker, so stub it
  let advanced = 0;
  s.speakCurrent = () => { advanced++; };
  s.el.onended();
  assert.equal(s.i, 1);
  assert.equal(advanced, 1);

  s.cut();
  assert.equal(revoked.includes('blob:test-0'), true);
  assert.equal(s.el.src, '');
  assert.equal(s.el.onended, null);
  assert.equal(s.audioUrl, null);

  delete globalThis.__piperUseAudioEl;
});

test('WebAudio path is used when the hook is false, even with lockscreen', () => {
  globalThis.__piperUseAudioEl = false;
  const started = [];
  const ac = {
    state: 'running',
    resume: async () => {},
    createBuffer(ch, len, rate) { return { length: len, sampleRate: rate, copyToChannel(src) { this._src = src; } }; },
    createBufferSource() {
      return { buffer: null, connect() {}, start() { started.push('webaudio'); }, stop() {}, onended: null };
    },
    destination: {},
  };
  globalThis.AudioContext = function () { return ac; };
  const s = new PiperSpeaker({});
  s.opts = { lockscreen: true, rate: 1 };
  s.state = 'playing';
  const token = s.token = Symbol();
  PiperSpeaker.ac = ac;
  s.playPcm({ audio: new Float32Array(8).fill(0.1), sampleRate: 16000 }, 0, token);
  assert.equal(started[0], 'webaudio');
  assert.equal(s.el, undefined);
  delete globalThis.__piperUseAudioEl;
  delete globalThis.AudioContext;
  PiperSpeaker.ac = null;
});
