// Voice worker: loads the installed local voice from Cache Storage (never from the network) and synthesises chunks.
// Messages in: {type:'init', variant:'full'|'int8'|'natural'} · {type:'synth', id, text, accents, rate, timbre}
// Messages out: {type:'ready', ms} · {type:'audio', id, audio, sampleRate, ipa, ms} · {type:'error', id?, code, message}
import { VOICE_FILES } from './voice-files.js';
import { createVoice } from './piper-core.js';

const CACHE = 'voice-v1';
let voice = null, loading = null;
const base = new URL('../', self.location.href);
async function cached(key) {
  const r = await (await caches.open(CACHE)).match(new URL(VOICE_FILES[key].url, base).href);
  if (!r) throw Object.assign(new Error('voice file missing: ' + key), { code: 'not-installed' });
  return r;
}
async function init(variant) {
  const t = performance.now();
  const ortSrc = await (await cached('ort')).text();
  const url = URL.createObjectURL(new Blob([ortSrc], { type: 'text/javascript' }));
  const ort = await import(url);
  const [wasm, model, config, stress] = await Promise.all([
    cached('wasm').then(r => r.arrayBuffer()), cached(variant === 'natural' ? 'natural' : variant === 'int8' ? 'int8' : 'full').then(r => r.arrayBuffer()),
    cached(variant === 'natural' ? 'naturalConfig' : 'config').then(r => r.json()), cached('stress').then(r => r.json())]);
  voice = await createVoice(ort, { wasm, model: new Uint8Array(model), config, stress });
  return Math.round(performance.now() - t);
}
self.onmessage = async ({ data: m }) => {
  if (m.type === 'init') {
    try { loading ??= init(m.variant); self.postMessage({ type: 'ready', ms: await loading }); }
    catch (e) { loading = null; self.postMessage({ type: 'error', code: e.code || 'load-failed', message: String(e?.message || e) }); }
    return;
  }
  if (m.type === 'synth') {
    try {
      if (!voice) await loading;
      const t = performance.now(), r = await voice.synth(m.text, { accents: m.accents, rate: m.rate, timbre: m.timbre || null });
      self.postMessage({ type: 'audio', id: m.id, audio: r.audio, sampleRate: voice.sampleRate, ipa: r.ipa, ms: Math.round(performance.now() - t) }, [r.audio.buffer]);
    } catch (e) { self.postMessage({ type: 'error', id: m.id, code: 'synth-failed', message: String(e?.message || e) }); }
  }
};
