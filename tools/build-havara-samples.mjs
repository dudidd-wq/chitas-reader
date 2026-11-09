// 1.0.91: "שמע דוגמה" previews of the two pronunciation traditions (site/voice-samples/havara-<id>.mp3, default male voice),
// synthesised with the app's own code path (tts-prep → g2p.js textToIPA({havara}) → piper-core.js → voice-pitch.js). Needs ffmpeg.
// Usage: node tools/build-havara-samples.mjs                → the two previews
//        node tools/build-havara-samples.mjs --compare DIR  → comparison passages (Hayom Yom, Birchot HaShachar, Bereishit 1:1-3)
//                                                             in both traditions, default male + natural male voice, with IPA
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { prepareForTTS, chunkText } from '../site/js/tts-prep.js';
import { timbreFor } from '../site/js/voice-pitch.js';
import { nodeVoice, wav } from './voice-synth.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;
export const HAVARA_SAMPLE_TEXT = 'בָּרוּ֫ךְ אַתָּ֫ה הַשֵּׁם אֱלֹקֵ֫ינוּ מֶ֫לֶךְ הָעוֹלָ֫ם, שֶׁנָּתַ֫ן לָ֫נוּ אֶת הַתּוֹרָ֫ה וְאֶת הַשַּׁבָּ֫ת.';
/** chunks of one passage as the app's PiperSpeaker builds them: compiled speech (ole tags) or cantillated text */
export function chunksOf(text, { cantillated = false } = {}) {
  const prepared = prepareForTTS(text, { stress: true, divineName: 'hashem', primaryStress: !cantillated });
  return chunkText(prepared).map(c => cantillated ? { c, acc: text } : { c: c.replace(/\u05AB/g, ''), acc: { primary: c } });
}
export async function render(voice, chunks, { havara, timbre }) {
  const parts = [], ipa = [];
  for (const { c, acc } of chunks) {
    const r = await voice.synth(c, { timbre, accents: acc, havara });
    parts.push(r.audio, new Float32Array(Math.round(voice.sampleRate * 0.2))); ipa.push(r.ipa);
  }
  const all = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  return { all, ipa };
}
const mp3 = (all, rate, out, kbps = '48k') => {
  const tmp = `/tmp/havara-${process.pid}.wav`; fs.writeFileSync(tmp, wav(all, rate));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', kbps, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', out]);
  fs.unlinkSync(tmp);
};
export function comparePassages() {
  const hy = JSON.parse(fs.readFileSync(SITE + 'data/hayomyom/days.json', 'utf8'))['cheshvan-29'];
  const sid = JSON.parse(fs.readFileSync(SITE + 'data/siddur/boker/1.json', 'utf8'));
  const gen = JSON.parse(fs.readFileSync(SITE + 'data/torah/Genesis/1.json', 'utf8'));
  return [
    { id: 'hayomyom-29-cheshvan', title: 'היום יום, כ״ט חשון (פסקה ראשונה)', chunks: chunksOf(hy.p.find(p => !p[1])[2]) },
    { id: 'siddur-birchot-hashachar', title: 'סידור – ברכות השחר (הנותן לשכוי ושלוש הברכות שאחריה)', chunks: [13, 14, 15, 16].flatMap(i => chunksOf(sid.say[String(i)] || sid.b[i][1])) },
    { id: 'chumash-bereishit-1-1-3', title: 'חומש – בראשית א, א–ג (בטעמים)', chunks: gen.v.slice(0, 3).flatMap(v => chunksOf(v.replace(/<[^>]+>/g, ''), { cantillated: true })) },
  ];
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const noa = await nodeVoice(), at = process.argv.indexOf('--compare');
  if (at < 0) {
    for (const h of ['israeli', 'chabad']) {
      const { all } = await render(noa, chunksOf(HAVARA_SAMPLE_TEXT), { havara: h, timbre: timbreFor('male') });
      const out = SITE + `voice-samples/havara-${h}.mp3`; mp3(all, noa.sampleRate, out); console.log(out, fs.statSync(out).size);
    }
  } else {
    const dir = process.argv[at + 1]; fs.mkdirSync(dir, { recursive: true });
    const nat = await nodeVoice({ natural: true }), log = [];
    for (const p of comparePassages()) for (const [vn, v] of [['male', noa], ['natural', nat]]) for (const h of ['israeli', 'chabad']) {
      const { all, ipa } = await render(v, p.chunks, { havara: h, timbre: timbreFor(vn) });
      const out = `${dir}/${p.id}__${h}__${vn}.mp3`; mp3(all, v.sampleRate, out, '64k');
      log.push(`## ${p.title} – ${h === 'chabad' ? 'אשכנזית־חב״דית' : 'ישראלית'} – ${vn === 'natural' ? 'קול גברי טבעי' : 'קול גברי (ברירת מחדל)'}\n${out}\n${ipa.join('\n')}\n`);
      console.log(out, (all.length / v.sampleRate).toFixed(1) + 's');
    }
    fs.writeFileSync(`${dir}/ipa-comparison.md`, log.join('\n'));
  }
}
