// Browser speech (Web Speech API) reader with per-segment highlighting, Media Session and
// optional silent-audio keep-alive for lock-screen controls. The app itself sends nothing; note that some browser
// voices are network voices (localService === false) whose engine sends the text to the browser vendor – those are
// labelled in the UI and never chosen by default when a local Hebrew voice exists.
import { prepareForTTS, pauseChunks } from './tts-prep.js';
import { webPitch, clampPitch } from './voice-pitch.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const ttsSupported = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

export function hebrewVoices() {
  if (!ttsSupported()) return [];
  // local (on-device) voices first, so the default voice never sends text to a vendor if a local one exists
  return synth.getVoices().filter(v => /^(he|iw)([-_]|$)/i.test(v.lang))
    .map((v, i) => [v, i]).sort((a, b) => isNetworkVoice(a[0]) - isNetworkVoice(b[0]) || a[1] - b[1]).map(([v]) => v);
}
/** A voice whose speech is synthesised by the vendor's server (the text is sent there). */
export const isNetworkVoice = v => v?.localService === false;
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

// A chunk that "ends" faster than any human-audible voice could say it (or never fired onstart) is treated as a
// failed / silent engine – e.g. no Hebrew voice installed. Normal speech is ≥ ~45 ms per character even at ×1.6.
export const MIN_MS_PER_CHAR = 8;

/** Wait (max `ms`) for the browser to publish its voice list – Chrome fills it asynchronously. */
export function waitForVoices(ms = 1500) {
  if (!ttsSupported()) return Promise.resolve([]);
  if (hebrewVoices().length) return Promise.resolve(hebrewVoices());
  return new Promise(res => {
    const done = () => { clearTimeout(t); synth.removeEventListener?.('voiceschanged', on); res(hebrewVoices()); };
    const on = () => { if (hebrewVoices().length) done(); };
    const t = setTimeout(done, ms);
    synth.addEventListener?.('voiceschanged', on);
  });
}

export class Speaker {
  /** onEnd({complete}) is called only when the queue ran to its end; complete=true only if every chunk was really spoken.
   *  onError(code) is called when speech fails – playback stops, nothing is marked as read. */
  constructor({ onSegment, onState, onEnd, onError }) {
    this.onSegment = onSegment; this.onState = onState; this.onEnd = onEnd; this.onError = onError;
    this.queue = []; this.i = 0; this.state = 'stopped'; this.opts = {};
    this.keepAlive = null; this.failed = 0;
  }
  /** segments: [{el, parts:[html…]}] */
  load(segments, opts, meta) {
    this.stop(true);
    this.opts = opts; this.meta = meta;
    this.queue = [];
    segments.forEach((s, si) => {
      const chunks = [];
      s.parts.forEach((html, pi) => {
        const prepared = prepareForTTS(html, { stress: opts.stress, divineName: opts.divineName, chol: pi === 0 ? s.chol : undefined, cites: opts.skipCites !== false && !!s.cites?.[pi] });
        // 1.0.101: same comma/period pauses as the local voice; the gap is a delay after the utterance (tests may set __ttsPauseScale = 0)
        for (const x of pauseChunks(prepared)) chunks.push(x);
      });
      // frac: share of the segment already spoken when this chunk starts (lets the view follow long segments)
      const total = chunks.reduce((a, x) => a + x.c.length, 0) || 1; let done = 0;
      for (const { c, gap } of chunks) { this.queue.push({ si, text: c, gap, frac: done / total }); done += c.length; }
    });
    this.segCount = segments.length; this.bad = 0;
  }
  startAt(segIndex = 0) { const k = this.queue.findIndex(q => q.si >= segIndex); this.i = k < 0 ? 0 : k; this.play(); }
  play() {
    if (!ttsSupported() || !this.queue.length) return false;
    if (!hebrewVoices().length) { this.fail('no-voice'); return false; }
    this.state = 'playing'; this.onState?.('playing'); this.failed = 0;
    this.mediaSession(true);
    synth.cancel();
    this.speakCurrent();
    return true;
  }
  clearGap() { if (this.gapTimer) { clearTimeout(this.gapTimer); this.gapTimer = null; } }
  fail(code) {
    this.clearGap(); this.stop(true); this.onState?.('stopped'); this.onError?.(code);
  }
  speakCurrent() {
    if (this.state !== 'playing') return;
    if (this.i >= this.queue.length) { this.finish(); return; }
    const q = this.queue[this.i];
    const u = new SpeechSynthesisUtterance(q.text);
    u.lang = 'he-IL';
    const v = hebrewVoices().find(v => v.name === this.opts.voice) || hebrewVoices()[0];
    try { if (v) u.voice = v; } catch { /* non-native voice object */ }
    u.rate = this.opts.rate || 1;
    if (clampPitch(this.opts.pitch)) u.pitch = webPitch(this.opts.pitch);   // 1.0.92: only when the reader moved the slider
    const token = this.token = Symbol();
    let started = 0;
    u.onstart = () => { if (this.token !== token) return; started = performance.now(); this.onSegment?.(q.si, q.frac); };
    u.onend = () => {
      if (this.token !== token || this.state !== 'playing') return;
      const min = q.text.length * (globalThis.__ttsMinMsPerChar ?? MIN_MS_PER_CHAR) / (u.rate || 1);
      if (!started || performance.now() - started < min) { this.bad++; if (++this.failed >= 2) return this.fail('silent'); }
      else this.failed = 0;
      this.i++;
      const gap = (q.gap || 0) * (globalThis.__ttsPauseScale ?? 1) / (u.rate || 1);
      if (gap > 0) this.gapTimer = setTimeout(() => this.speakCurrent(), gap * 1000);
      else this.speakCurrent();
    };
    u.onerror = e => {
      if (this.token !== token) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return; // our own cancel() (pause/skip/rate)
      this.fail(e.error || 'error');                                      // real failure: stop, never advance
    };
    this.onSegment?.(q.si, q.frac);
    try { synth.speak(u); } catch (e) { this.fail('error'); }
  }
  pause() {
    // cancel + resume-from-chunk is more reliable across browsers than synth.pause()
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.token = null; this.clearGap(); synth.cancel(); this.onState?.('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    this.keepAlive?.pause();
  }
  toggle() { return this.state === 'playing' ? (this.pause(), true) : this.play(); }
  stop(silent) {
    this.token = null; this.state = 'stopped'; this.clearGap();
    if (ttsSupported()) synth.cancel();
    this.mediaSession(false);
    if (!silent) this.onState?.('stopped');
  }
  skip(delta) {
    const cur = this.queue[this.i]?.si ?? 0;
    const target = Math.max(0, Math.min(this.segCount - 1, cur + delta));
    const k = this.queueIndexFor(target, delta);
    if (k >= 0) { this.i = k; if (this.state === 'playing') { this.token = null; this.clearGap(); synth.cancel(); this.speakCurrent(); } else this.onSegment?.(this.queue[k].si); }
  }
  /** First chunk of segment `target`; a segment with nothing to say (e.g. a skipped Kaddish, 1.0.90) gives the nearest
   *  spoken one in the direction of the skip. -1 if there is none. */
  queueIndexFor(target, dir = 1) {
    let k = this.queue.findIndex(q => q.si === target);
    if (k >= 0) return k;
    if (dir >= 0) return this.queue.findIndex(q => q.si > target);
    for (let j = this.queue.length - 1; j >= 0; j--) if (this.queue[j].si < target) { const si = this.queue[j].si; return this.queue.findIndex(q => q.si === si); }
    return -1;
  }
  setRate(r) { this.opts.rate = r; if (this.state === 'playing') { this.token = null; this.clearGap(); synth.cancel(); this.speakCurrent(); } }
  /** 1.0.92: manual pitch offset (semitones); the current chunk is said again */
  setPitch(p) { this.opts.pitch = p; if (this.state === 'playing') { this.token = null; this.clearGap(); synth.cancel(); this.speakCurrent(); } }
  finish() { this.state = 'stopped'; this.onState?.('stopped'); this.mediaSession(false); this.onEnd?.({ complete: this.bad === 0 }); }
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
