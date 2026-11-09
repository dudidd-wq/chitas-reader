// 1.0.88: the short "שמע דוגמה" previews of the four voice choices (site/voice-samples/<choice>.mp3), synthesised with
// the same code path as the app (piper-core.js, g2p.js, voice-pitch.js). Needs ffmpeg. Usage: node tools/build-voice-samples.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { prepareForTTS, chunkText } from '../site/js/tts-prep.js';
import { timbreFor } from '../site/js/voice-pitch.js';
import { nodeVoice, wav } from './voice-synth.mjs';

export const SAMPLE_TEXT = 'שָׁלוֹם, זֶה הַקּוֹל שֶׁיַּקְרִיא אֶת הַשִּׁעוּר: וְשָׂרָה עָשְׂתָה מִצְוָה, וְהוּא צִוָּה עַל יִשְׂרָאֵל.';
const OUT = new URL('../site/voice-samples/', import.meta.url).pathname;
if (import.meta.url === `file://${process.argv[1]}`) {
  const noa = await nodeVoice(), nat = await nodeVoice({ natural: true });
  for (const g of ['male', 'deep', 'natural', 'female']) {
    const v = g === 'natural' ? nat : noa, parts = [];
    for (const c of chunkText(prepareForTTS(SAMPLE_TEXT, { stress: true, divineName: 'hashem' }))) {
      const r = await v.synth(c, { timbre: timbreFor(g), accents: SAMPLE_TEXT });
      parts.push(r.audio, new Float32Array(Math.round(v.sampleRate * 0.2)));
    }
    const all = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    const tmp = `/tmp/voice-sample-${g}.wav`; fs.writeFileSync(tmp, wav(all, v.sampleRate));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', OUT + g + '.mp3']);
    fs.unlinkSync(tmp);
    console.log(g, fs.statSync(OUT + g + '.mp3').size);
  }
}
