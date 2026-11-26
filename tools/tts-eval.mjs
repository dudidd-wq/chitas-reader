// TTS evaluation pack (A1, engine 1): a fixed, stratified sample → prepareForTTS + IPA (+ decision trace) → snapshot,
// classified diff against the golden snapshot, "silent omission" check against the voice models' phoneme maps, and
// optional audio metrics when the local voice is installed. Deterministic, offline, no listening, no Whisper.
//   node tools/tts-eval.mjs                  run: print the diff against the golden (exit 1 on any difference / omission)
//   node tools/tts-eval.mjs --update-golden  deliberately accept the current output as the new golden
//   node tools/tts-eval.mjs --build-fixtures regenerate tests/fixtures/tts-eval/sample.json from site/data (rarely needed)
//   node tools/tts-eval.mjs --audio          also synthesise part of the sample with the local voice and print audio metrics
// See verification/TTS-EVAL.md.
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareForTTS, pauseChunks } from '../site/js/tts-prep.js';
import { textToIPA } from '../site/js/g2p.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const FIXTURE = ROOT + 'tests/fixtures/tts-eval/sample.json';
export const GOLDEN = ROOT + 'tests/fixtures/tts-eval/golden.json';
export const TRADITIONS = ['israeli', 'chabad'];
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const stressData = () => readJson(ROOT + 'site/voice/stress-he.json');

// ---------------------------------------------------------------- run
/** One item → { prep, ipa:{tradition}, trace:{tradition:["word|ipa|k|src"]} } (what the app's Piper path computes per chunk). */
export function evalItem(item, data = stressData()) {
  const prep = prepareForTTS(item.html, { stress: true, divineName: 'hashem' });
  const out = { prep, ipa: {}, trace: {} };
  for (const havara of TRADITIONS) {
    const trace = [];
    out.ipa[havara] = textToIPA(prep, { data, accents: item.accents ? item.html : undefined, havara, trace });
    out.trace[havara] = trace.map(t => `${t.word}|${t.ipa}|${t.k}|${t.src}`);
  }
  return out;
}
export function snapshot(fixture = readJson(FIXTURE)) {
  const data = stressData(), items = {};
  for (const it of fixture.items) items[it.id] = evalItem(it, data);
  return { schema: 1, items };
}

// ---------------------------------------------------------------- classified diff
const stripStress = s => s.replace(/ˈ/g, '');
/** Classify one IPA change: stress-only (ˈ moved) vs phoneme change. */
export function classifyIpa(a, b) { return stripStress(a) === stripStress(b) ? 'ipa-stress' : 'ipa-phoneme'; }
/** Differences golden → current, each {cls, id, field, before, after}. Empty array = identical.
 *  Classes: prep, ipa-stress, ipa-phoneme, trace-only (same IPA, different decision/source), item-added, item-removed. */
export function diffSnapshots(golden, cur) {
  const d = [];
  const ids = new Set([...Object.keys(golden.items), ...Object.keys(cur.items)]);
  for (const id of ids) {
    const g = golden.items[id], c = cur.items[id];
    if (!g) { d.push({ cls: 'item-added', id, field: '', before: '', after: '' }); continue; }
    if (!c) { d.push({ cls: 'item-removed', id, field: '', before: '', after: '' }); continue; }
    if (g.prep !== c.prep) d.push({ cls: 'prep', id, field: 'prep', before: g.prep, after: c.prep });
    for (const t of TRADITIONS) {
      if (g.ipa[t] !== c.ipa[t]) d.push({ cls: classifyIpa(g.ipa[t], c.ipa[t]), id, field: 'ipa.' + t, before: g.ipa[t], after: c.ipa[t] });
      else if (JSON.stringify(g.trace[t]) !== JSON.stringify(c.trace[t])) {
        const n = Math.max(g.trace[t].length, c.trace[t].length);
        for (let i = 0; i < n; i++) if (g.trace[t][i] !== c.trace[t][i]) { d.push({ cls: 'trace-only', id, field: `trace.${t}#${i}`, before: g.trace[t][i] || '', after: c.trace[t][i] || '' }); break; }
      }
    }
  }
  return d;
}
export function formatDiff(d, limitPerClass = 8) {
  if (!d.length) return 'tts-eval: no differences from the golden snapshot.';
  const by = {}; for (const x of d) (by[x.cls] ||= []).push(x);
  const lines = [`tts-eval: ${d.length} difference(s) from the golden snapshot`];
  for (const [cls, xs] of Object.entries(by)) {
    lines.push(`\n[${cls}] ${xs.length}`);
    for (const x of xs.slice(0, limitPerClass)) lines.push(`  ${x.id} ${x.field}\n    - ${x.before}\n    + ${x.after}`);
    if (xs.length > limitPerClass) lines.push(`  … ${xs.length - limitPerClass} more`);
  }
  lines.push('\nIf the change is intended: node tools/tts-eval.mjs --update-golden (and review the golden diff in git).');
  return lines.join('\n');
}

// ---------------------------------------------------------------- prosody report (A2, deterministic, no audio)
/** Per item: the chunks pauseChunks gives the synthesizer, their gaps, and whether the commas stayed inside the chunks.
 *  commasKept = every comma of the prepared text is in some chunk (never dropped); commaCuts = chunks that end at a comma
 *  (only a forced length cut may do that); sentenceGapsOk = every chunk ending in [.:;?!] has gap 0.38. */
export function prosodyItem(item) {
  const prep = prepareForTTS(item.html, { stress: true, divineName: 'hashem' }), ch = pauseChunks(prep);
  const commas = (prep.match(/,/g) || []).length;
  return { id: item.id, chunks: ch.length, gaps: ch.map(x => x.gap), commas,
    commasKept: ch.reduce((a, x) => a + (x.c.match(/,/g) || []).length, 0) === commas,
    commaCuts: ch.filter(x => /,$/.test(x.c)).length,
    sentenceGapsOk: ch.every(x => !/[.:;?!]$/.test(x.c) || x.gap === 0.38) };
}
export const prosodyReport = (fixture = readJson(FIXTURE)) => fixture.items.map(prosodyItem);

// ---------------------------------------------------------------- silent omission
/** Characters the final IPA filter of textToIPA keeps (anything else is dropped silently). */
export const IPA_KEPT = new Set([...' .,!?aeiouʔvɡdhzχtjklmnsfʁʃbpˈʒw']);
export const VOICE_CONFIGS = { noa: 'site/voice/he_IL-noa-medium.onnx.json', 'ilspeech-male': 'site/voice/he_IL-ilspeech-male-medium.onnx.json' };
const voiceMaps = () => Object.fromEntries(Object.entries(VOICE_CONFIGS).map(([k, f]) => [k, readJson(ROOT + f).phoneme_id_map]));
const TOKEN = /[א-תְ֫-ׇ'"|]+/g;   // the word tokenizer of textToIPA
/** Silent drops, found from the data alone (no synthesis):
 *  - 'word-count': a Hebrew word of the prepared text with no transcription at all,
 *  - 'empty-ipa': a word transcribed to nothing,
 *  - 'filtered-char': a phoneme the final filter of textToIPA would delete,
 *  - 'unmapped:<voice>': a phoneme with no id in that voice's phoneme_id_map (ipaToIds skips it silently). */
export function findOmissions(snap = snapshot(), maps = voiceMaps()) {
  const res = [];
  for (const [id, it] of Object.entries(snap.items)) {
    const tokens = (it.prep.normalize('NFC').match(TOKEN) || []).filter(w => /[א-ת]/.test(w.replace(/֫/g, '')));
    for (const t of TRADITIONS) {
      const tr = it.trace[t];
      if (tr.length !== tokens.length) res.push({ id, tradition: t, kind: 'word-count', detail: `${tokens.length} Hebrew words in the prepared text, ${tr.length} transcribed` });
      for (const line of tr) {
        const [word, ipa] = line.split('|');
        if (!ipa) res.push({ id, tradition: t, kind: 'empty-ipa', detail: word });
        for (const ch of ipa || '') {
          if (!IPA_KEPT.has(ch)) res.push({ id, tradition: t, kind: 'filtered-char', detail: `${word} → U+${ch.codePointAt(0).toString(16).toUpperCase()} (${ch})` });
          for (const [v, map] of Object.entries(maps)) if (ch !== ' ' && !map[ch]) res.push({ id, tradition: t, kind: 'unmapped:' + v, detail: `${word} → ${ch}` });
        }
      }
    }
  }
  return res;
}

// ---------------------------------------------------------------- optional audio metrics (local voice only)
export const voiceInstalled = () => ['site/voice/he_IL-noa-medium-int8.onnx', 'site/voice/he_IL-noa-medium.onnx.json', 'site/voice/stress-he.json',
  'site/voice/ort/ort-wasm-simd-threaded.wasm', 'site/voice/ort/ort.wasm.bundle.min.mjs'].every(f => fs.existsSync(ROOT + f) && fs.statSync(ROOT + f).size > 1000);
/** Duration, RMS (dBFS), longest silence (10 ms windows under 0.01), and edge peaks (a high peak in the first/last 5 ms = a hard cut). */
export function audioMetrics(pcm, rate = 22050) {
  const n = pcm.length; let sum = 0, peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(pcm[i]); sum += pcm[i] * pcm[i]; if (a > peak) peak = a; }
  const win = Math.round(rate * 0.01); let run = 0, maxRun = 0;
  for (let i = 0; i + win <= n; i += win) {
    let m = 0; for (let j = i; j < i + win; j++) m = Math.max(m, Math.abs(pcm[j]));
    if (m < 0.01) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
  }
  const e = Math.round(rate * 0.005), edge = (s, t) => { let m = 0; for (let i = s; i < t; i++) m = Math.max(m, Math.abs(pcm[i])); return m; };
  return { seconds: n / rate, rmsDb: n ? 20 * Math.log10(Math.sqrt(sum / n) || 1e-9) : -Infinity, peak,
    maxSilenceMs: maxRun * 10, headPeak: n ? edge(0, Math.min(e, n)) : 0, tailPeak: n ? edge(Math.max(0, n - e), n) : 0 };
}
export async function synthMetrics(items, { limit = 6 } = {}) {
  const { nodeVoice } = await import('./voice-synth.mjs');
  const v = await nodeVoice({ int8: true }), out = {};
  for (const it of items.slice(0, limit)) {
    const r = await v.synth(prepareForTTS(it.html, { stress: true, divineName: 'hashem' }).slice(0, 180), { accents: it.accents ? it.html : undefined });
    out[it.id] = { chars: it.html.length, ...audioMetrics(r.audio, v.sampleRate) };
  }
  v.release?.();
  return out;
}

// ---------------------------------------------------------------- fixture builder (from site/data; run rarely)
const DATA = ROOT + 'site/data/';
const J = f => readJson(DATA + f);
// first `words` words, never leaving a half-open tag
const clip = (s, words = 22) => {
  const w = s.split(/\s+/); let t = w.length > words ? w.slice(0, words).join(' ') : s;
  t = t.replace(/<[^>]*$/, '');
  for (const tag of ['b', 'i', 'big', 'small']) if ((t.match(new RegExp(`<${tag}>`, 'g')) || []).length > (t.match(new RegExp(`</${tag}>`, 'g')) || []).length) t = t.replace(new RegExp(`<${tag}>`, 'g'), '');
  return t.trim();
};
export function buildFixtureItems() {
  const items = [], add = (cat, id, html, accents = false) => items.push({ id, cat, html: clip(html), ...(accents ? { accents: true } : {}) });
  const gen = J('torah/Genesis/1.json'); [0, 1, 2, 4].forEach(i => add('mikra', `mikra-gen1-${i + 1}`, gen.v[i], true));
  const ex = J('torah/Exodus/20.json'); [1, 2].forEach(i => add('mikra', `mikra-ex20-${i + 1}`, ex.v[i], true));
  const ps = J('tehillim/23.json'); [0, 1].forEach(i => add('mikra', `mikra-ps23-${i + 1}`, ps.v[i], true));
  [0, 1, 3].forEach(i => add('rashi', `rashi-gen1-${i + 1}`, gen.rs[i][0]));
  const av = J('gemara/mishna/Avot/1.json'); [0, 1].forEach(i => add('mishna', `mishna-avot1-${i + 1}`, av.m[i]));
  const rm = J('rambam/Blessings/1.json'); [0, 1, 2].forEach(i => add('halacha', `rambam-brachot1-${i + 1}`, rm.say[i]));
  const ta = J('tanya/LA/1.json'); [0, 1, 2, 3].forEach(i => add('chassidus', `tanya-la1-${i + 1}`, ta.say[i]));
  const hy = J('hayomyom/days.json')['tishrei-3']; [0, 2].forEach(i => add('chassidus', `hayomyom-tishrei3-${i + 1}`, hy.p[i][2]));
  const on = J('onkelos/Genesis/1.json'); [0, 1, 2].forEach(i => add('aramaic', `onkelos-gen1-${i + 1}`, on.say[i]));
  const bb = J('gemara/bavli/Bava_Batra/100a.json'); [0, 1].forEach(i => add('aramaic', `bavli-bb100a-${i + 1}`, bb.segs[i][0]));
  const sd = J('siddur/shacharit/1.json'); sd.b.filter(x => x[0] === 'p').slice(0, 3).forEach((x, i) => add('siddur', `siddur-shacharit1-${i + 1}`, x[1]));
  add('numbers-abbr', 'synthetic-abbr', 'וְהַקָּדוֹשׁ בָּרוּךְ הוּא אָמַר לְמשֶׁה רַבֵּנוּ עָלָיו הַשָּׁלוֹם: ״וְכוּ׳״ (שְׁמוֹת י״ב, ג׳).');
  return items;
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = new Set(process.argv.slice(2));
  if (arg.has('--build-fixtures')) {
    const items = buildFixtureItems();
    fs.writeFileSync(FIXTURE, JSON.stringify({ schema: 1, note: "Extracted from site/data (the app's own texts). Regenerate with tools/tts-eval.mjs --build-fixtures.", items }, null, 1) + '\n');
    console.log(`wrote ${items.length} items, ${items.reduce((a, x) => a + x.html.split(/\s+/).length, 0)} words`);
  } else if (arg.has('--update-golden')) {
    fs.writeFileSync(GOLDEN, JSON.stringify(snapshot(), null, 1) + '\n');
    console.log('golden updated: ' + GOLDEN);
  } else {
    const cur = snapshot(), gold = readJson(GOLDEN);
    const d = diffSnapshots(gold, cur), om = findOmissions(cur);
    console.log(formatDiff(d));
    if (om.length) { console.log(`\nsilent omissions: ${om.length}`); for (const o of om.slice(0, 20)) console.log(`  ${o.id} [${o.tradition}] ${o.kind}: ${o.detail}`); }
    const pr = prosodyReport();
    console.log(`
prosody (pauseChunks): ${pr.length} items, ${pr.reduce((a, x) => a + x.chunks, 0)} chunks, ${pr.reduce((a, x) => a + x.commas, 0)} commas, comma-ended chunks ${pr.reduce((a, x) => a + x.commaCuts, 0)}; all commas kept: ${pr.every(x => x.commasKept)}; sentence gaps 0.38: ${pr.every(x => x.sentenceGapsOk)}`);
    if (arg.has('--prosody')) for (const x of pr) console.log(`  ${x.id}: ${x.chunks} chunk(s) gaps=[${x.gaps}] commas=${x.commas}`);
    if (process.env.TTS_EVAL_AUDIO === '1' || arg.has('--audio')) {
      if (!voiceInstalled()) console.log('\naudio: local voice not installed – skipped');
      else console.log('\naudio metrics:', JSON.stringify(await synthMetrics(readJson(FIXTURE).items), null, 1));
    }
    process.exitCode = d.length || om.length ? 1 : 0;
  }
}
