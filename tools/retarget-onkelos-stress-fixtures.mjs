// Mechanically retarget ARAM-4 identity rows after Onkelos speech ole.
// Does not touch 1B pins (none on onkelos) or non-onkelos identity rows.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { aramSayText } from './aramaic-speech.mjs';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { textToIPA } from '../site/js/g2p.js';

const ROOT = new URL('../', import.meta.url).pathname;
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const stress = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const ipa = (s, havara) => {
  const p = prepareForTTS(s, { stress: true, primaryStress: true, divineName: 'hashem' });
  return textToIPA(p.replace(/֫/g, ''), { data: stress, havara, accents: { primary: p } });
};
const json = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data', f), 'utf8'));
const pick = (j, p) => p.replace(/\]/g, '').split(/[.[]/).filter(Boolean).reduce((o, k) => o?.[/^\d+$/.test(k) ? +k : k], j);

const identPath = path.join(ROOT, 'tests/fixtures/aram4-identity.json');
const ident = JSON.parse(fs.readFileSync(identPath, 'utf8'));
let identUpdated = 0, identSeen = 0;
for (const r of ident.rows) {
  if (r.source !== 'onkelos' && !String(r.file || '').includes('onkelos/')) continue;
  identSeen++;
  const s = pick(json(r.file), r.path);
  if (typeof s !== 'string') throw new Error('missing ' + r.file + ' ' + r.path);
  const next = {
    say: sha(s),
    pass: sha(aramSayText(s, 'onkelos', { source: r.source })),
    israeli: ipa(s, 'israeli'),
    chabad: ipa(s, 'chabad'),
  };
  if (next.say === r.say && next.pass === r.pass && next.israeli === r.israeli && next.chabad === r.chabad) continue;
  Object.assign(r, next);
  identUpdated++;
}
const identRaw = fs.readFileSync(identPath);
fs.writeFileSync(identPath, JSON.stringify(ident, null, 2) + (identRaw.toString().endsWith('\n') ? '\n' : ''));
console.log(JSON.stringify({ identSeen, identUpdated }, null, 2));
