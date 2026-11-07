// 1.0.60 male timbre (site/js/voice-pitch.js): F0 measurement, TD-PSOLA pitch shift, formant shift, and its use by the
// local voice. Measures numbers (F0, length, spectral peaks) – not how it sounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateF0, f0Stats, psola, resample, maleTimbre, TIMBRES } from '../site/js/voice-pitch.js';
import { timbreFor } from '../site/js/piper.js';

const SR = 22050;
// harmonic "vowel": F0 glide f0a→f0b, harmonics weighted by formant resonances (Hz)
function vowel(f0a, f0b, sec = 1, formants = [[700, 90], [1200, 110], [2600, 160]]) {
  const N = Math.round(SR * sec), x = new Float32Array(N); let ph = 0;
  for (let i = 0; i < N; i++) {
    const f = f0a + (f0b - f0a) * i / N; ph += f / SR; let s = 0;
    for (let h = 1; h * f < 8000; h++) { let g = 0; for (const [F, B] of formants) g += 1 / (1 + ((h * f - F) / B) ** 2); s += g / h * Math.sin(2 * Math.PI * h * ph); }
    x[i] = 0.05 * s;
  }
  return x;
}
// spectral envelope peak between lo and hi Hz: strongest harmonic-smoothed DFT bin
function peakHz(x, lo, hi) {
  const n = 4096, o = Math.floor((x.length - n) / 2); let best = 0, bf = 0;
  for (let f = lo; f <= hi; f += 10) {
    let re = 0, im = 0; for (let i = 0; i < n; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n), a = 2 * Math.PI * f * i / SR; re += w * x[o + i] * Math.cos(a); im += w * x[o + i] * Math.sin(a); }
    const m = re * re + im * im; if (m > best) { best = m; bf = f; }
  }
  return bf;
}
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

test('F0 estimator: pure tones and harmonic vowels within 2%, silence unvoiced', () => {
  for (const f of [90, 120, 180, 250, 380]) {
    const x = new Float32Array(SR).map((_, i) => 0.3 * Math.sin(2 * Math.PI * f * i / SR));
    const s = f0Stats(x, SR); assert.ok(Math.abs(s.mean - f) / f < 0.02, `${f} → ${s.mean}`); assert.ok(s.voiced > 0.9);
  }
  const v = f0Stats(vowel(200, 200), SR); assert.ok(Math.abs(v.mean - 200) < 4, String(v.mean));
  assert.equal(f0Stats(new Float32Array(SR), SR).voiced, 0);
  const t = estimateF0(vowel(150, 250), SR);       // a glide is tracked frame by frame
  const vs = [...t.f0].filter(Boolean); assert.ok(vs[2] < 170 && vs[vs.length - 3] > 230, `${vs[2]} … ${vs[vs.length - 3]}`);
});

test('PSOLA: −6 semitones lowers F0 by 2^(−1/2), keeps the length, the formants and the level', () => {
  const x = vowel(190, 210), r = 2 ** (-6 / 12), y = psola(x, SR, r);
  assert.equal(y.length, x.length);
  const a = f0Stats(x, SR).mean, b = f0Stats(y, SR).mean;
  assert.ok(Math.abs(b / a - r) < 0.02, `${a} → ${b} (ratio ${b / a})`);
  // first formant region (resonance at 700 Hz) stays where it was – unlike plain resampling, which moves it to ~495 Hz
  assert.ok(Math.abs(peakHz(y, 450, 1000) - 700) <= 80, 'F1 kept: ' + peakHz(y, 450, 1000));
  const pr = peakHz(resample(x, r), 350, 650); assert.ok(Math.abs(pr - 700 * r) <= 90, 'resampling moves F1: ' + pr);
  const m = maleTimbre(x, SR, { semitones: -6 }); assert.ok(Math.abs(rms(m) / rms(x) - 1) < 0.02, 'RMS level kept');
  // time stretch option: 1.5× longer, same pitch
  const z = psola(x, SR, 1, { time: 1.5 }); assert.equal(z.length, Math.round(x.length * 1.5)); assert.ok(Math.abs(f0Stats(z, SR).mean - a) < 4);
});

test('formant shift: maleTimbre with formant 0.94 lowers F1 ~6%, total pitch still −6 semitones; length ÷ 0.94', () => {
  const x = vowel(195, 205, 1, [[800, 100], [1300, 120], [2700, 160]]), y = maleTimbre(x, SR, { semitones: -6, formant: 0.94 });
  assert.ok(Math.abs(y.length - x.length / 0.94) < 3, `${y.length}`);
  const b = f0Stats(y, SR).mean; assert.ok(Math.abs(b - 200 * 2 ** -0.5) < 4, String(b));
  const p = peakHz(y, 550, 1050); assert.ok(p < 800 && p >= 700, 'F1 ' + p);
});

test('resample: windowed sinc keeps a tone and its level', () => {
  const x = new Float32Array(SR).map((_, i) => 0.5 * Math.sin(2 * Math.PI * 300 * i / SR)), y = resample(x, 0.9);
  assert.equal(y.length, Math.floor((x.length - 1) / 0.9) + 1);
  assert.ok(Math.abs(f0Stats(y, SR).mean - 270) < 4); assert.ok(Math.abs(rms(y.subarray(100, -100)) / rms(x) - 1) < 0.01);
  assert.equal(maleTimbre(new Float32Array(0), SR).length, 0);
});

test('voice choice: male timbre is the default, female = the model as is', () => {
  assert.deepEqual(timbreFor(undefined), TIMBRES.male); assert.deepEqual(timbreFor('male'), TIMBRES.male);
  assert.equal(timbreFor('female'), null);
  assert.ok(TIMBRES.male.semitones <= -4 && TIMBRES.male.semitones >= -7);
});

test('real model (noa, Node): male timbre puts mean F0 in 85–155 Hz, female stays above 160 Hz; tempo kept', { timeout: 120000 }, async () => {
  const { nodeVoice } = await import('../tools/voice-synth.mjs');
  const v = await nodeVoice({ int8: true });
  const txt = 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ.';
  const f = await v.synth(txt, {}), m = await v.synth(txt, { timbre: TIMBRES.male });
  const ff = f0Stats(f.audio, 22050).mean, fm = f0Stats(m.audio, 22050).mean;
  assert.ok(ff > 160, 'female ' + ff); assert.ok(fm >= 85 && fm <= 155, 'male ' + fm);
  // the model's durations are stochastic (noise_w): a single sentence varies ±25%; over the 20-item set the male timbre was +2%
  assert.ok(Math.abs(m.audio.length / f.audio.length - 1) < 0.35, `length ${f.audio.length} → ${m.audio.length}`);
  assert.deepEqual(m.ipa, f.ipa);
});

// 1.0.69: unvoiced speech must not be granulated.
test('PSOLA preserves unvoiced consonant/noise samples exactly at unchanged tempo', () => {
  let seed = 17;
  const x = Float32Array.from({ length: SR }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - 0.5) * 0.2; });
  const track = { f0: new Float32Array(100), hop: 220, offset: 300 };
  assert.deepEqual(psola(x, SR, 0.7, { track }), x);
});
test('male register deepens formants without lowering pitch further', () => {
  assert.equal(TIMBRES.male.semitones, -6);
  assert.equal(TIMBRES.male.formant, 0.88);
});
