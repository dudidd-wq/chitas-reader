// 1.0.59: real synthesis with the shipped voice files in Node (same code as the browser worker). Checks that audio comes
// out, its length is plausible and the rate setting works – not how it sounds (that needs a human listener).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { nodeVoice } from '../tools/voice-synth.mjs';
import { VOICE_FILES } from '../site/js/voice-files.js';

const SITE = new URL('../site/', import.meta.url).pathname;

test('voice files: sizes and hashes match voice-files.js, each under GitHub Pages\' 100 MB file limit', () => {
  for (const [k, f] of Object.entries(VOICE_FILES)) {
    const [p, v] = f.url.split('?v='), buf = fs.readFileSync(SITE + p);
    assert.equal(buf.length, f.size, k);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12), v, k + ' hash (run tools/build-voice-stress.mjs)');
    assert.ok(buf.length < 100e6, k);
  }
  for (const n of ['NOTICE.txt', 'ort/LICENSE', 'ort/ThirdPartyNotices.txt']) assert.ok(fs.existsSync(SITE + 'voice/' + n), n);
});

for (const int8 of [false, true]) test(`${int8 ? 'int8' : 'full'} model: a verse gives non-silent audio of plausible length; rate shortens it`, { timeout: 60000 }, async () => {
  const v = await nodeVoice({ int8 });
  const text = 'שָׁלוֹם, מֹשֶׁה אָמַר לִבְנֵי יִשְׂרָאֵל.';
  const a = await v.synth(text), sec = a.audio.length / v.sampleRate;
  assert.equal(v.sampleRate, 22050);
  assert.ok(sec > 1 && sec < 6, `${sec}s`);
  const rms = Math.sqrt(a.audio.reduce((s, x) => s + x * x, 0) / a.audio.length);
  assert.ok(rms > 0.01, `rms ${rms}`);
  assert.ok(a.audio.every(Number.isFinite));
  // durations are stochastic (noise_w): compare the mean of 3 runs at each speed
  const len = async rate => { let n = 0; for (let i = 0; i < 3; i++) n += (await v.synth(text, { rate })).audio.length; return n / 3; };
  const n1 = await len(1), n15 = await len(1.5);
  assert.ok(n15 < n1 * 0.85, `rate 1.5 is shorter: ${n15} vs ${n1}`);
  await v.release?.();
});
