// Browser speech (Web Speech API) reader with per-segment highlighting, Media Session and
// optional silent-audio keep-alive for lock-screen controls. No audio files, no network.
import { prepareForTTS, chunkText } from './tts-prep.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const ttsSupported = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

export function hebrewVoices() {
  if (!ttsSupported()) return [];
  return synth.getVoices().filter(v => /^(he|iw)([-_]|$)/i.test(v.lang));
}
export function onVoices(cb) {
  if (!ttsSupported()) return cb([]);
  cb(hebrewVoices());
  synth.addEventListener?.('voiceschanged', () => cb(hebrewVoices()));
}

// 1 s of 8 kHz 8-bit silence, generated at runtime (keeps a media session alive on some platforms).
function silentWavUrl() {
  const n = 8000, buf = new ArrayBuffer(44 + n), d = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true);
  d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 8000, true);
  d.setUint16(32, 1, true); d.setUint16(34, 8, true); w(36, 'data'); d.setUint32(40, n, true);
  for (let i = 0; i < n; i++) d.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class Speaker {
  constructor({ onSegment, onState, onEnd }) {
    this.onSegment = onSegment; this.onState = onState; this.onEnd = onEnd;
    this.queue = []; this.i = 0; this.state = 'stopped'; this.opts = {};
    this.keepAlive = null;
  }
  /** segments: [{el, parts:[html…]}] */
  load(segments, opts, meta) {
    this.stop(true);
    this.opts = opts; this.meta = meta;
    this.queue = [];
    segments.forEach((s, si) => s.parts.forEach(html => {
      for (const c of chunkText(prepareForTTS(html, { stress: opts.stress, divineName: opts.divineName }))) this.queue.push({ si, text: c });
    }));
    this.segCount = segments.length;
  }
  startAt(segIndex = 0) { const k = this.queue.findIndex(q => q.si >= segIndex); this.i = k < 0 ? 0 : k; this.play(); }
  play() {
    if (!ttsSupported() || !this.queue.length) return;
    this.state = 'playing'; this.onState?.('playing');
    this.mediaSession(true);
    synth.cancel();
    this.speakCurrent();
  }
  speakCurrent() {
    if (this.state !== 'playing') return;
    if (this.i >= this.queue.length) { this.finish(); return; }
    const q = this.queue[this.i];
    const u = new SpeechSynthesisUtterance(q.text);
    u.lang = 'he-IL';
    const v = hebrewVoices().find(v => v.name === this.opts.voice) || hebrewVoices()[0];
    if (v) u.voice = v;
    u.rate = this.opts.rate || 1;
    const token = this.token = Symbol();
    u.onstart = () => this.onSegment?.(q.si);
    u.onend = () => { if (this.token !== token || this.state !== 'playing') return; this.i++; this.speakCurrent(); };
    u.onerror = e => { if (this.token !== token) return; if (e.error === 'interrupted' || e.error === 'canceled') return; this.i++; this.speakCurrent(); };
    this.onSegment?.(q.si);
    synth.speak(u);
  }
  pause() {
    // cancel + resume-from-chunk is more reliable across browsers than synth.pause()
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.token = null; synth.cancel(); this.onState?.('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    this.keepAlive?.pause();
  }
  toggle() { this.state === 'playing' ? this.pause() : this.play(); }
  stop(silent) {
    this.token = null; this.state = 'stopped';
    if (ttsSupported()) synth.cancel();
    this.mediaSession(false);
    if (!silent) this.onState?.('stopped');
  }
  skip(delta) {
    const cur = this.queue[this.i]?.si ?? 0;
    const target = Math.max(0, Math.min(this.segCount - 1, cur + delta));
    const k = this.queue.findIndex(q => q.si === target);
    if (k >= 0) { this.i = k; if (this.state === 'playing') { this.token = null; synth.cancel(); this.speakCurrent(); } else this.onSegment?.(target); }
  }
  setRate(r) { this.opts.rate = r; if (this.state === 'playing') { this.token = null; synth.cancel(); this.speakCurrent(); } }
  finish() { this.state = 'stopped'; this.onState?.('stopped'); this.mediaSession(false); this.onEnd?.(); }
  mediaSession(on) {
    if (!on) { this.keepAlive?.pause(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'; return; }
    if (this.opts.lockscreen) {
      if (!this.keepAlive) { this.keepAlive = new Audio(silentWavUrl()); this.keepAlive.loop = true; this.keepAlive.volume = 0.01; }
      this.keepAlive.play().catch(() => {});
    }
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = new MediaMetadata({ title: this.meta?.title || '', artist: this.meta?.artist || 'חת״ת ורמב״ם', album: this.meta?.album || '', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      ms.playbackState = 'playing';
      ms.setActionHandler('play', () => this.play());
      ms.setActionHandler('pause', () => this.pause());
      ms.setActionHandler('stop', () => this.stop());
      ms.setActionHandler('previoustrack', () => this.skip(-1));
      ms.setActionHandler('nexttrack', () => this.skip(1));
    } catch { /* some actions unsupported */ }
  }
}
