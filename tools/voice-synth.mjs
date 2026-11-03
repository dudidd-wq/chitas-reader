// Synthesise Hebrew text with the local voice in Node (same files and code path as the browser worker: site/voice/ort,
// site/voice/*.onnx, site/js/g2p.js, site/js/piper-core.js). Used by tests and for measurements.
// Usage: node tools/voice-synth.mjs "<vocalised text>" out.wav [--int8] [--rate 1]
import fs from 'node:fs';
import { prepareForTTS, chunkText } from '../site/js/tts-prep.js';
import { createVoice } from '../site/js/piper-core.js';

const SITE = new URL('../site/', import.meta.url).pathname;
export async function nodeVoice({ int8 = false } = {}) {
  const ort = await import(SITE + 'voice/ort/ort.wasm.bundle.min.mjs');
  const file = n => new Uint8Array(fs.readFileSync(SITE + 'voice/' + n));
  return createVoice(ort, {
    wasm: file('ort/ort-wasm-simd-threaded.wasm').buffer,
    model: file(int8 ? 'he_IL-noa-medium-int8.onnx' : 'he_IL-noa-medium.onnx'),
    config: JSON.parse(fs.readFileSync(SITE + 'voice/he_IL-noa-medium.onnx.json', 'utf8')),
    stress: JSON.parse(fs.readFileSync(SITE + 'voice/stress-he.json', 'utf8')),
  });
}
export function wav(samples, rate = 22050) {
  const n = samples.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return b;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [text, out = 'out.wav'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const rate = +(process.argv[process.argv.indexOf('--rate') + 1] || 1) || 1;
  let t = performance.now();
  const v = await nodeVoice({ int8: process.argv.includes('--int8') });
  console.error('load ms', Math.round(performance.now() - t));
  const parts = [];
  for (const c of chunkText(prepareForTTS(text, { stress: true, divineName: 'hashem' }))) {
    t = performance.now(); const r = await v.synth(c, { rate, accents: text });
    console.error(`${Math.round(performance.now() - t)} ms → ${(r.audio.length / 22050).toFixed(2)} s | ${r.ipa}`);
    parts.push(r.audio, new Float32Array(Math.round(22050 * 0.25)));
  }
  const all = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  fs.writeFileSync(out, wav(all));
}
