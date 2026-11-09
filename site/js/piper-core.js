// Local Piper voice core (no DOM): text → IPA (g2p.js) → phoneme ids → ONNX Runtime Web (MIT) → Float32 PCM at the
// model's sample rate. Runs in the voice worker (piper-worker.js) and in Node for tests. Inference code is our own; no
// code from Piper (GPL) is used – only the model file and its published config (phoneme id map, scales).
import { textToIPA, ipaToIds, accentStressMap } from './g2p.js';
import { maleTimbre } from './voice-pitch.js';

/** ort: the onnxruntime-web module; wasm: ArrayBuffer of ort-wasm-simd-threaded.wasm; model: Uint8Array of the .onnx;
 *  config: the model's .onnx.json; stress: stress-he.json. */
export async function createVoice(ort, { wasm, model, config, stress }) {
  ort.env.wasm.numThreads = 1;          // GitHub Pages cannot send COOP/COEP headers → no shared memory / threads
  ort.env.wasm.proxy = false;
  if (wasm) ort.env.wasm.wasmBinary = wasm;
  const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  const inf = config.inference || {}, idMap = config.phoneme_id_map, pad = config.chitas_pad !== false, sampleRate = config.audio?.sample_rate || 22050;
  return {
    sampleRate,
    /** text: one prepared chunk (tts-prep output); opt.accents: the raw accented verse (or a Map from accentStressMap), or {primary: markedPreparedChunk};
     *  opt.rate: speed (1 = normal); opt.timbre: null (the model's own female voice) or {semitones, formant} for the
     *  male timbre (voice-pitch.js). With formant < 1 the model speaks 1/formant faster, so the tempo stays the same.
     *  Returns {audio: Float32Array, ipa, ids}. */
    async synth(text, opt = {}) {
      const accents = opt.accents instanceof Map || opt.accents?.primary ? opt.accents : opt.accents ? accentStressMap(opt.accents) : null;
      const ipa = opt.ipa || textToIPA(text, { data: stress, accents, noShvaNa: opt.noShvaNa });
      const ids = ipaToIds(ipa, idMap, pad);
      if (ids.length <= 3) return { audio: new Float32Array(0), ipa, ids };
      const tim = opt.timbre && (opt.timbre.semitones || (opt.timbre.formant && opt.timbre.formant !== 1)) ? opt.timbre : null;
      const rate = (opt.rate || 1) / (tim?.formant > 0 && tim.formant < 1 ? tim.formant : 1);
      const feeds = {
        input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / rate, inf.noise_w ?? 0.8]), [3]),
      };
      if (session.inputNames.includes('sid')) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
      const out = await session.run(feeds);
      const audio = out[session.outputNames[0]].data;
      const pcm = trim(audio);
      return { audio: tim ? maleTimbre(pcm, sampleRate, tim) : pcm, ipa, ids };
    },
    release: () => session.release?.(),
  };
}
// drop near-silent edges so the chunks follow each other without long gaps
function trim(a) {
  let s = 0, e = a.length; const th = 0.004;
  while (s < e && Math.abs(a[s]) < th) s++;
  while (e > s && Math.abs(a[e - 1]) < th) e--;
  return a.slice(Math.max(0, s - 220), Math.min(a.length, e + 1100));
}
