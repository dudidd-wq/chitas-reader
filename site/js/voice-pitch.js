// Male timbre for the local voice: pitch (and optionally formant) shift of the synthesised PCM, done on the device.
// Own implementation (part of the site's code, GPL-2.0-or-later) – no third-party DSP library:
//   1. estimateF0  – YIN (de Cheveigné & Kawahara 2002) on a 2× decimated copy, 10 ms hop, median-smoothed.
//   2. pitchMarks  – one mark per glottal period in voiced frames (peak picking at the local period), 10 ms marks elsewhere.
//   3. psola       – TD-PSOLA: two-period Hann grains re-spaced at period/ratio. The grains keep the spectral envelope,
//                    so the pitch drops while the formants stay (no "chipmunk/monster" effect of plain resampling).
//   4. resample    – windowed-sinc interpolation; used (optionally) to lower the formants a little before PSOLA.
// maleTimbre() combines them. Pure functions on Float32Array; runs in the voice worker and in Node (tests/measurements).

const TAU = Math.PI * 2;

/** YIN F0 track. Returns {f0: Float32Array (Hz, 0 = unvoiced), hop (samples at sr)}. */
export function estimateF0(x, sr, { fmin = 70, fmax = 420, hopMs = 10, threshold = 0.2 } = {}) {
  // 2× decimation (half-band 7-tap FIR) – F0 needs no more than ~5 kHz of bandwidth
  const d = new Float32Array(x.length >> 1), h = [-0.0328, 0, 0.2828, 0.5, 0.2828, 0, -0.0328];
  for (let i = 0; i < d.length; i++) { let s = 0; for (let k = 0; k < 7; k++) { const j = 2 * i + k - 3; if (j >= 0 && j < x.length) s += h[k] * x[j]; } d[i] = s; }
  const r = sr / 2, tMin = Math.floor(r / fmax), tMax = Math.ceil(r / fmin), W = tMax + 2, hop = Math.round(r * hopMs / 1000);
  const n = Math.max(0, Math.floor((d.length - W - tMax) / hop) + 1), f0 = new Float32Array(n), diff = new Float32Array(tMax + 1);
  let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const silence = (0.03 * peak) ** 2;
  for (let fr = 0; fr < n; fr++) {
    const o = fr * hop;
    let e = 0; for (let i = 0; i < W; i++) e += d[o + i] * d[o + i];
    if (e / W < silence) continue;
    for (let t = 1; t <= tMax; t++) { let s = 0; for (let i = 0; i < W; i++) { const v = d[o + i] - d[o + i + t]; s += v * v; } diff[t] = s; }
    let run = 0, best = -1;
    for (let t = 1; t <= tMax; t++) { run += diff[t]; diff[t] = run ? diff[t] * t / run : 1; }
    for (let t = tMin; t <= tMax; t++) if (diff[t] < threshold) { while (t + 1 <= tMax && diff[t + 1] < diff[t]) t++; best = t; break; }
    if (best < 0) continue;
    const a = diff[best - 1] ?? diff[best], b = diff[best], c = diff[best + 1] ?? diff[best], den = a - 2 * b + c;
    const tt = best + (den ? 0.5 * (a - c) / den : 0);
    f0[fr] = r / tt;
  }
  // median of 5 – removes isolated octave errors and one-frame voicing blips
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = []; for (let k = -2; k <= 2; k++) w.push(f0[Math.min(n - 1, Math.max(0, i + k))]);
    const voiced = w.filter(v => v > 0).sort((p, q) => p - q);
    out[i] = f0[i] > 0 || voiced.length >= 4 ? (voiced.length >= 3 ? voiced[voiced.length >> 1] : 0) : 0;
  }
  return { f0: out, hop: hop * 2, offset: W + tMax };  // frame i spans [i·hop, i·hop + 2(W+tMax)) at sr; centre = i·hop + W + tMax
}

/** Mean F0 (Hz) of the voiced frames, and the voiced fraction. */
export function f0Stats(x, sr, opt) {
  const { f0 } = estimateF0(x, sr, opt); let s = 0, k = 0;
  for (const v of f0) if (v > 0) { s += v; k++; }
  return { mean: k ? s / k : 0, voiced: f0.length ? k / f0.length : 0, frames: f0.length };
}

/** Analysis marks: [{t (sample), p (period in samples), v (voiced)}]. */
export function pitchMarks(x, sr, track = estimateF0(x, sr)) {
  const { f0, hop, offset } = track, unv = Math.round(sr / 100), marks = [];
  // marks are picked on a low-passed copy (2× one-pole, zero-phase, ~500 Hz): one clear peak per period, less jitter
  const lp = new Float32Array(x.length), c = Math.exp(-TAU * 500 / sr);
  for (let pass = 0; pass < 2; pass++) {
    let z = 0; for (let i = 0; i < x.length; i++) { z = (1 - c) * (pass ? lp[i] : x[i]) + c * z; lp[i] = z; }
    z = 0; for (let i = x.length - 1; i >= 0; i--) { z = (1 - c) * lp[i] + c * z; lp[i] = z; }
  }
  x = lp;
  const periodAt = t => { const i = Math.round((t - offset) / hop); const v = f0[Math.min(f0.length - 1, Math.max(0, i))] || 0; return v > 0 ? sr / v : 0; };
  let t = 0;
  while (t < x.length) {
    const P = periodAt(t);
    if (!P) { marks.push({ t, p: unv, v: false }); t += unv; continue; }
    // voiced run: find its polarity once, then one mark per period at the local peak
    let end = t; while (end < x.length && periodAt(end) > 0) end += hop;
    let mx = 0, mn = 0; for (let i = t; i < Math.min(end, x.length); i++) { if (x[i] > mx) mx = x[i]; if (x[i] < mn) mn = x[i]; }
    const sg = mx >= -mn ? 1 : -1;
    let m = t, bv = -Infinity; for (let i = t; i < Math.min(x.length, t + P); i++) if (sg * x[i] > bv) { bv = sg * x[i]; m = Math.floor(i); }
    while (m < Math.min(end, x.length)) {
      const p = periodAt(m) || P;
      marks.push({ t: m, p, v: true });
      const lo = Math.floor(m + 0.85 * p), hi = Math.min(x.length - 1, Math.ceil(m + 1.15 * p));
      let nm = Math.round(m + p), b2 = -Infinity; for (let i = lo; i <= hi; i++) if (sg * x[i] > b2) { b2 = sg * x[i]; nm = i; }
      if (nm <= m) nm = Math.round(m + p);
      m = nm;
    }
    t = m;
  }
  return marks;
}

/** TD-PSOLA. ratio < 1 lowers the pitch; time > 1 lengthens. Unvoiced parts are only re-timed. */
export function psola(x, sr, ratio, { time = 1, track } = {}) {
  track ||= estimateF0(x, sr);
  const marks = pitchMarks(x, sr, track);
  const outLen = Math.round(x.length * time), y = new Float32Array(outLen), wsum = new Float32Array(outLen);
  if (!marks.length) return y;
  let to = marks[0].t * time, j = 0;
  while (to < outLen) {
    const ta = to / time;
    while (j + 1 < marks.length && Math.abs(marks[j + 1].t - ta) <= Math.abs(marks[j].t - ta)) j++;
    const mk = marks[j], P = Math.max(8, Math.round(mk.p)), half = P;
    for (let k = -half; k <= half; k++) {
      const si = mk.t + k, oi = Math.round(to) + k;
      if (si < 0 || si >= x.length || oi < 0 || oi >= outLen) continue;
      const w = 0.5 + 0.5 * Math.cos(Math.PI * k / (half + 1));
      y[oi] += w * x[si]; wsum[oi] += w;
    }
    to += mk.v ? mk.p / ratio : mk.p;
  }
  // Keep unvoiced consonants/noise on the original time axis; PSOLA's nearest-grain selection otherwise
  // repeats/skips their waveform even though their pitch must not change. Interpolated voicing gives
  // a 10 ms crossfade at voiced boundaries, with an original-signal fallback at uncovered edges.
  const { f0, hop, offset } = track;
  for (let i = 0; i < outLen; i++) {
    const t = Math.min(x.length - 1, i / time), j = Math.floor(t), frac = t - j;
    const original = x[j] * (1 - frac) + x[Math.min(x.length - 1, j + 1)] * frac;
    const f = Math.max(0, Math.min(f0.length - 1, (t - offset) / hop));
    const k = Math.floor(f), u = f - k;
    const voiced = (f0[k] > 0 ? 1 - u : 0) + (f0[Math.min(f0.length - 1, k + 1)] > 0 ? u : 0);
    const mix = voiced * Math.min(1, wsum[i] / 0.1);
    y[i] = mix * (wsum[i] > 1 ? y[i] / wsum[i] : y[i]) + (1 - mix) * original;
  }
  return y;
}

/** Windowed-sinc resampling to a lower/higher sample count: y[n] = x(n·step). step < 1 stretches (and lowers frequencies). */
export function resample(x, step, taps = 8) {
  const n = Math.floor((x.length - 1) / step) + 1, y = new Float32Array(n), cut = Math.min(1, 1 / step) * 0.97;
  for (let i = 0; i < n; i++) {
    const p = i * step, c = Math.floor(p); let s = 0, ws = 0;
    for (let k = c - taps + 1; k <= c + taps; k++) {
      if (k < 0 || k >= x.length) continue;
      const u = p - k, a = u * cut, sinc = a === 0 ? 1 : Math.sin(Math.PI * a) / (Math.PI * a);
      const w = 0.5 + 0.5 * Math.cos(Math.PI * u / taps), g = sinc * w;
      s += g * x[k]; ws += g;
    }
    y[i] = ws ? s / ws : 0;
  }
  return y;
}

const rms = a => { let s = 0; for (const v of a) s += v * v; return Math.sqrt(s / (a.length || 1)); };

/** Shift a female voice towards a male register. semitones < 0 lowers the pitch (PSOLA, formants kept);
 *  formant < 1 additionally lowers the formants by that factor (resampling + PSOLA back to the same length, so the
 *  caller gets audio of length ≈ x.length / formant: synthesise `formant` times faster to keep the tempo).
 *  The result has the RMS level of the input. */
export function maleTimbre(x, sr, { semitones = -6, formant = 1 } = {}) {
  if (!x.length) return x;
  const total = 2 ** (semitones / 12);
  let a = formant < 1 ? resample(x, formant) : x;           // pitch and formants × formant, duration ÷ formant
  const r = total / (formant < 1 ? formant : 1);             // remaining pitch change, done with formant-preserving PSOLA
  a = Math.abs(r - 1) > 1e-3 ? psola(a, sr, r) : a;
  const g0 = rms(x), g1 = rms(a);
  if (g1 > 0) { const g = g0 / g1; let pk = 0; for (const v of a) pk = Math.max(pk, Math.abs(v)); const gg = Math.min(g, 0.97 / (pk || 1)); for (let i = 0; i < a.length; i++) a[i] *= gg; }
  return a;
}

/** The two voices offered in the settings. 'male' = the noa model shifted down (no extra download). */
export const TIMBRES = {
  male: { semitones: -6, formant: 0.88 },   // fuller vocal tract, same F0/intonation – verification/VOICE-169.md
  deep: { semitones: -8, formant: 0.82 },   // 1.0.88 "קול גברי עמוק": lower still – verification/VOICE-188.md
  female: null,
};

/** Timbre parameters for a voice choice (1.0.88; 1.0.92: + the manual pitch offset in semitones): 'female' and 'natural' (a real male model) are not processed, 'deep'
 *  is the lower noa timbre, anything else the default male timbre. */
export const timbreFor = (gender, pitch = 0) => {
  const base = gender === 'female' || gender === 'natural' ? null : gender === 'deep' ? TIMBRES.deep : TIMBRES.male;
  const p = clampPitch(pitch);
  if (!p) return base;                                   // 0 = exactly the voice's own timbre (the objects above)
  return base ? { ...base, semitones: base.semitones + p } : { semitones: p, formant: 1 };
};
/** 1.0.92: the reader's manual pitch offset (semitones, relative to the chosen voice): −6…+6 in steps of 0.5.
 *  Applied with the same formant-preserving PSOLA as the male timbre, so speed and duration stay the same. */
export const PITCH_MIN = -6, PITCH_MAX = 6, PITCH_STEP = 0.5;
export const clampPitch = v => { const n = Number(v); return Number.isFinite(n) ? Math.max(PITCH_MIN, Math.min(PITCH_MAX, Math.round(n / PITCH_STEP) * PITCH_STEP)) || 0 : 0; };
/** Web Speech (device voice): utterance.pitch is 0…2 with 1 = the voice's own; one semitone ≈ ×2^(1/12) as a rough mapping. */
export const webPitch = v => Math.max(0.5, Math.min(2, 2 ** (clampPitch(v) / 12)));
