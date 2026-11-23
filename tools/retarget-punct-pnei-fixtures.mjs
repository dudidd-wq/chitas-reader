// Mechanically retarget ARAM-4 identity rows and 1B identity pins after
// ysay punctuation transfer. Never touches non-identity nachv pins.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { aramSayText } from './aramaic-speech.mjs';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { textToIPA } from '../site/js/g2p.js';

const ROOT = new URL('../', import.meta.url).pathname;
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const stress = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const ipa = (s, havara) => {
  const p = prepareForTTS(s, { stress: true, primaryStress: true, divineName: 'hashem' });
  return textToIPA(p.replace(/֫/g, ''), { data: stress, havara, accents: { primary: p } });
};
const json = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data', f), 'utf8'));
const pick = (j, p) => p.replace(/\]/g, '').split(/[.[]/).filter(Boolean).reduce((o, k) => o?.[/^\d+$/.test(k) ? +k : k], j);

const identPath = path.join(ROOT, 'tests/fixtures/aram4-identity.json');
const ident = JSON.parse(fs.readFileSync(identPath, 'utf8'));
let identUpdated = 0;
for (const r of ident.rows) {
  if (!String(r.file || '').includes('ysay/')) continue;
  const s = pick(json(r.file), r.path);
  if (typeof s !== 'string') continue;
  const next = {
    say: sha(s),
    pass: sha(aramSayText(s, 'gemara', { source: r.source })),
    israeli: ipa(s, 'israeli'),
    chabad: ipa(s, 'chabad'),
  };
  if (next.say === r.say && next.pass === r.pass && next.israeli === r.israeli && next.chabad === r.chabad) continue;
  Object.assign(r, next);
  identUpdated++;
}
fs.writeFileSync(identPath, JSON.stringify(ident, null, 2) + '\n');

// builder rows that point at yerushalmi speech
const builderPath = path.join(ROOT, 'tests/fixtures/aram4-builder.json');
const builder = JSON.parse(fs.readFileSync(builderPath, 'utf8'));
// builder is retargeted later only if tests fail; leave unless an id is clearly ysay.
// (comment-stress only patched a Bavli Eruvin sayHash.)

// 1B identity pins on ysay: retarget both shas to the new bytes when the file changed.
const manPath = path.join(ROOT, 'tools/engine-cov-1b-manifest.json');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
let pinsUpdated = 0;
const pinFiles = [];
for (const p of man.pins) {
  if (!String(p.path || '').includes('gemara/ysay/')) continue;
  const full = path.join(ROOT, p.path);
  const digest = sha256(fs.readFileSync(full));
  if (digest === p.after_sha256 && digest === p.before_sha256) continue;
  // identity pin: keep before==after, freeze the new bytes
  if (p.before_sha256 !== p.after_sha256) {
    throw new Error('refusing to retarget a non-identity pin: ' + p.path);
  }
  p.before_sha256 = digest;
  p.after_sha256 = digest;
  pinsUpdated++;
  pinFiles.push(p.path);
}
const manBytes = Buffer.from(JSON.stringify(man, null, 2) + '\n');
// The live file may already be pretty-printed with trailing newline — write consistently
const manRaw = fs.readFileSync(manPath);
// Preserve original formatting: parse+stringify must match if we only change hex strings
// of the same length (64). JSON key order and spacing should stay if we used the same dump.
// Check current file format:
fs.writeFileSync(manPath, manRaw.includes('\n  ') ? JSON.stringify(man, null, 2) + (manRaw.toString().endsWith('\n') ? '\n' : '') : JSON.stringify(man));

const jsPath = path.join(ROOT, 'tools/engine-cov-1b.mjs');
let js = fs.readFileSync(jsPath, 'utf8');
const frozen = sha256(fs.readFileSync(manPath));
const nextJs = js.replace(/demand\(sha\(bytes\)==='[a-f0-9]{64}'/, `demand(sha(bytes)==='${frozen}'`);
if (nextJs === js && pinsUpdated) {
  throw new Error('could not update frozen manifest sha in engine-cov-1b.mjs');
}
if (nextJs !== js) fs.writeFileSync(jsPath, nextJs);

console.log(JSON.stringify({ identUpdated, pinsUpdated, pinFiles, frozen: pinsUpdated ? frozen : 'unchanged' }, null, 2));
