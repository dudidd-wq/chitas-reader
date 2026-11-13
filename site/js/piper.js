// Local "quality voice" (Piper he_IL-noa-medium, CC BY 4.0) – install on request, then speak with it.
// Nothing is downloaded until the user presses the "קול איכותי" button (installVoice). Files are kept in Cache Storage
// ('voice-v1'), outside the service worker's precache, and the synthesis runs on the device in a Web Worker.
// PiperSpeaker has the interface of tts.js's Speaker (load/startAt/play/pause/toggle/stop/skip/setRate, same callbacks).
import { Speaker } from './tts.js';
import { prepareForTTS, pauseChunks } from './tts-prep.js';
import { VOICE_FILES } from './voice-files.js';
import { timbreFor, f0Stats } from './voice-pitch.js';

export const VOICE_CACHE = 'voice-v1';
const COMMON = ['ort', 'wasm', 'stress'];
// 1.0.88: 'natural' = the real male voice (its own model and config, ~63 MB); 'full' / 'int8' = noa
export const voiceKeys = variant => [...COMMON, ...(variant === 'natural' ? ['naturalConfig', 'natural'] : ['config', variant === 'int8' ? 'int8' : 'full'])];
/** Which installed model a voice choice reads with: the natural male voice has its own model, the others use noa. */
export const modelFor = (gender, variant) => gender === 'natural' ? 'natural' : variant === 'int8' ? 'int8' : 'full';
export const voiceBytes = variant => voiceKeys(variant).reduce((a, k) => a + VOICE_FILES[k].size, 0);
export const mb = n => Math.round(n / 1e6);
const abs = u => new URL(u, document.baseURI).href;

/** Can this browser run the local voice? (WebAssembly, module workers, Web Audio, Cache Storage) */
export function piperSupported() {
  if (globalThis.__piperUnsupported) return false;
  return typeof WebAssembly === 'object' && typeof Worker === 'function' && typeof caches === 'object' && !!(globalThis.AudioContext || globalThis.webkitAudioContext) && typeof BigInt64Array === 'function';
}
/** Which variants are fully installed: {full:bool, int8:bool}. Reads the cache only – never downloads. */
export async function voiceStatus() {
  const st = { full: false, int8: false, natural: false };
  if (typeof caches !== 'object') return st;
  try {
    const c = await caches.open(VOICE_CACHE);
    const ok = async k => !!(await c.match(abs(VOICE_FILES[k].url)));
    const all = async keys => (await Promise.all(keys.map(ok))).every(Boolean);
    for (const v of ['full', 'int8', 'natural']) st[v] = await all(voiceKeys(v));
  } catch { /* storage blocked */ }
  return st;
}
/** Bytes still to download for a model (files already in the cache are not fetched again). */
export async function voiceMissingBytes(variant) {
  let n = 0;
  try { const c = await caches.open(VOICE_CACHE); for (const k of voiceKeys(variant)) if (!(await c.match(abs(VOICE_FILES[k].url)))) n += VOICE_FILES[k].size; }
  catch { n = voiceBytes(variant); }
  return n;
}
/** Download (once) and store the voice. onProgress(doneBytes, totalBytes). Only call from a user's click. */
export async function installVoice(variant, onProgress = () => {}, signal) {
  const c = await caches.open(VOICE_CACHE), keys = voiceKeys(variant), total = voiceBytes(variant);
  let done = 0;
  for (const k of keys) {
    const url = abs(VOICE_FILES[k].url);
    if (await c.match(url)) { done += VOICE_FILES[k].size; onProgress(done, total); continue; }
    const r = await fetch(url, { cache: 'no-store', signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} – ${VOICE_FILES[k].url}`);
    const parts = [], rd = r.body?.getReader();
    if (rd) for (;;) { const { done: end, value } = await rd.read(); if (end) break; parts.push(value); done += value.length; onProgress(Math.min(done, total), total); }
    else { const b = new Uint8Array(await r.arrayBuffer()); parts.push(b); done += b.length; onProgress(done, total); }
    const blob = new Blob(parts);
    if (blob.size !== VOICE_FILES[k].size) throw new Error(`size mismatch ${VOICE_FILES[k].url}: ${blob.size}`);
    await c.put(url, new Response(blob, { headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream' } }));
  }
  // remove entries of older file versions (a changed file has a new ?v= hash)
  const want = new Set(Object.values(VOICE_FILES).map(f => abs(f.url)));
  for (const req of await c.keys()) if (!want.has(req.url)) await c.delete(req);
  try { await navigator.storage?.persist?.(); } catch { /* optional */ }
}
export async function removeVoice() { worker?.terminate(); worker = null; workerVariant = null; await caches.delete(VOICE_CACHE); }

// ---------------- worker (one per page, kept between lessons: loading the model takes a few seconds) ----------------
let worker = null, workerVariant = null, ready = null, seq = 0;
const pending = new Map();
function getWorker(variant) {
  if (worker && workerVariant === variant) return ready;
  worker?.terminate();
  workerVariant = variant;
  worker = new Worker(new URL('./piper-worker.js', import.meta.url), { type: 'module' });
  ready = new Promise((res, rej) => {
    worker.onmessage = ({ data: m }) => {
      if (m.type === 'ready') res(m.ms);
      else if (m.type === 'error' && m.id == null) { rej(Object.assign(new Error(m.message), { code: m.code })); worker?.terminate(); worker = null; }
      else { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.type === 'audio' ? p.res(m) : p.rej(Object.assign(new Error(m.message), { code: m.code })); }
    };
    worker.onerror = e => { rej(Object.assign(new Error(e.message || 'worker error'), { code: 'worker' })); worker = null; };
  });
  worker.postMessage({ type: 'init', variant });
  return ready;
}
function synth(text, accents, rate, timbre, havara) {
  const id = ++seq;
  return new Promise((res, rej) => { pending.set(id, { res, rej }); worker.postMessage({ type: 'synth', id, text, accents, rate, timbre, havara }); });
}

export { timbreFor };

export class PiperSpeaker extends Speaker {
  /** opts.variant: 'full' | 'int8'; opts.voiceGender: 'male' (default – the noa model with the male timbre of
   *  voice-pitch.js, no extra download) | 'female' (the model's own voice) */
  load(segments, opts, meta) {
    this.stop(true);
    this.opts = opts; this.meta = meta; this.queue = [];
    segments.forEach((s, si) => {
      const chunks = [];
      // the voice needs the vowels: niqqud is always kept for it (the "stress" setting concerns the browser's engine)
      s.parts.forEach((html, pi) => {
        const primary = !!s.primaryParts?.[pi];
        const prepared = prepareForTTS(html, { stress: true, divineName: opts.divineName, chol: pi === 0 ? s.chol : undefined, cites: opts.skipCites !== false && !!s.cites?.[pi], primaryStress: primary });
        // 1.0.101: pauseChunks for every source (comma 0.18 s, sentence 0.38 s). Gemara already used this.
        for (const { c, gap } of pauseChunks(prepared)) chunks.push(primary
          ? { c: c.replace(/\u05AB/g, ''), acc: { primary: c }, gap }
          : { c, acc: s.accParts?.[pi] ?? (pi === 0 ? s.acc : null), gap });
      });
      const total = chunks.reduce((a, x) => a + x.c.length, 0) || 1; let done = 0;
      for (const { c, acc, gap } of chunks) { this.queue.push({ si, text: c, acc, gap, frac: done / total }); done += c.length; }
    });
    this.segCount = segments.length; this.bad = 0; this.audio = new Map();
  }
  ctx() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!PiperSpeaker.ac) PiperSpeaker.ac = new AC();
    if (PiperSpeaker.ac.state === 'suspended') PiperSpeaker.ac.resume().catch(() => {});
    return PiperSpeaker.ac;
  }
  play() {
    if (!this.queue.length) return false;
    this.ctx();                                 // created/resumed inside the user's click
    this.state = 'playing'; this.onState?.('playing');
    this.mediaSession(true);
    getWorker(modelFor(this.opts.voiceGender, this.opts.variant)).then(() => this.speakCurrent(), e => this.fail('piper-' + (e.code || 'load-failed')));
    return true;
  }
  fetchChunk(i) {
    const q = this.queue[i]; if (!q) return null;
    const g = timbreFor(this.opts.voiceGender, this.opts.pitch), key = i + '@' + (this.opts.rate || 1) + '@' + (this.opts.voiceGender || 'male') + '@' + (this.opts.havara || 'israeli') + '@' + (this.opts.pitch || 0);
    if (!this.audio.has(key)) { const p = synth(q.text, q.acc, this.opts.rate || 1, g, this.opts.havara || 'israeli'); p.catch(() => {}); this.audio.set(key, p); }
    return this.audio.get(key);
  }
  async speakCurrent() {
    if (this.state !== 'playing' || !worker) return;
    if (this.i >= this.queue.length) { this.finish(); return; }
    const i = this.i, q = this.queue[i], token = this.token = Symbol();
    this.onSegment?.(q.si, q.frac);
    let m;
    try { m = await this.fetchChunk(i); } catch (e) { if (this.token === token) this.fail('piper-' + (e.code || 'synth-failed')); return; }
    for (const k of [1, 2]) this.fetchChunk(i + k);   // synthesise ahead while this chunk plays
    for (const k of this.audio.keys()) if (parseInt(k) < i - 1) this.audio.delete(k);
    if (this.token !== token || this.state !== 'playing') return;
    if (!m.audio.length) { this.i++; this.speakCurrent(); return; }   // nothing to say (e.g. punctuation only)
    // 1.0.96: q.gap – seconds of silence after the chunk (the Gemara's pause at a comma / period), appended to the buffer
    const pad = Math.round((q.gap || 0) * m.sampleRate / (this.opts.rate || 1));
    const ac = this.ctx(), buf = ac.createBuffer(1, m.audio.length + pad, m.sampleRate);
    buf.copyToChannel ? buf.copyToChannel(m.audio, 0) : buf.getChannelData(0).set(m.audio);
    const src = this.src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
    src.onended = () => { if (this.token !== token || this.state !== 'playing') return; this.i++; this.speakCurrent(); };
    src.start();
    // test hook only (the tests define __piperLog): what was played, incl. the timbre and its measured mean F0
    if (globalThis.__piperLog) globalThis.__piperLog.push({ text: q.text, ipa: m.ipa, ms: m.ms, sec: m.audio.length / m.sampleRate, gender: ['female', 'deep', 'natural'].includes(this.opts.voiceGender) ? this.opts.voiceGender : 'male', havara: this.opts.havara || 'israeli', pitch: this.opts.pitch || 0, f0: f0Stats(m.audio, m.sampleRate).mean });
  }
  cut() { this.token = null; try { this.src?.stop(); } catch { /* not started */ } this.src = null; }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.cut(); this.onState?.('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    this.keepAlive?.pause();
  }
  stop(silent) { this.cut(); this.state = 'stopped'; this.mediaSession(false); if (!silent) this.onState?.('stopped'); }
  skip(delta) {
    const cur = this.queue[this.i]?.si ?? 0, target = Math.max(0, Math.min(this.segCount - 1, cur + delta));
    const k = this.queueIndexFor(target, delta);
    if (k >= 0) { this.i = k; if (this.state === 'playing') { this.cut(); this.speakCurrent(); } else this.onSegment?.(this.queue[k].si); }
  }
  setRate(r) { this.opts.rate = r; if (this.state === 'playing') { this.cut(); this.speakCurrent(); } }
  /** 1.0.91: pronunciation tradition ('israeli' | 'chabad'); the current chunk is said again in the new one */
  /** 1.0.92: manual pitch offset in semitones (voice-pitch.js clampPitch); the current chunk is said again */
  setPitch(p) { this.opts.pitch = p; if (this.state === 'playing') { this.cut(); this.speakCurrent(); } }
  setHavara(h) { this.opts.havara = h; if (this.state === 'playing') { this.cut(); this.speakCurrent(); } }
  setGender(g) {
    const m0 = modelFor(this.opts.voiceGender, this.opts.variant); this.opts.voiceGender = g;
    const m1 = modelFor(g, this.opts.variant);
    if (this.state !== 'playing') return;
    this.cut();
    if (m1 === m0) { this.speakCurrent(); return; }
    // another model (natural ↔ noa): load it in the worker first; the caller checked that it is installed
    getWorker(m1).then(() => this.speakCurrent(), e => this.fail('piper-' + (e.code || 'load-failed')));
  }
}
