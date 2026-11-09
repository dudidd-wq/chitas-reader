// 1.0.88: four voice choices for the local voice – default male timbre (unchanged), deep male timbre (no download),
// natural male voice (a separate CC BY-NC 4.0 model, downloaded only when chosen) and female.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ipaToIds } from '../site/js/g2p.js';
import { TIMBRES, timbreFor, f0Stats } from '../site/js/voice-pitch.js';
import { VOICE_FILES } from '../site/js/voice-files.js';
import { nodeVoice } from '../tools/voice-synth.mjs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const root = new URL('../', import.meta.url).pathname, read = f => fs.readFileSync(root + f, 'utf8');
const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const fakeSynth = () => {
  window.__spoken = []; window.__ttsMinMsPerChar = 0; window.__piperLog = [];
  const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  let cur = null;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() { clearTimeout(cur); }, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); cur = setTimeout(() => { u.onstart?.({}); cur = setTimeout(() => u.onend?.({}), 200); }, 2); } } });
};

test('1.0.88: timbres – default unchanged, deep lower, natural and female unprocessed', () => {
  assert.deepEqual(TIMBRES.male, { semitones: -6, formant: 0.88 });
  assert.deepEqual(TIMBRES.deep, { semitones: -8, formant: 0.82 });
  assert.equal(timbreFor('male'), TIMBRES.male); assert.equal(timbreFor(undefined), TIMBRES.male);
  assert.equal(timbreFor('deep'), TIMBRES.deep);
  assert.equal(timbreFor('natural'), null); assert.equal(timbreFor('female'), null);
});
test('1.0.88: the natural model takes ids without pads; noa keeps them', () => {
  const m = { '^': [1], '_': [0], '$': [2], a: [5], b: [6] };
  assert.deepEqual(ipaToIds('ab', m), [1, 0, 5, 0, 6, 0, 2]);
  assert.deepEqual(ipaToIds('ab', m, false), [1, 5, 6, 2]);
  const nat = JSON.parse(read('site/voice/he_IL-ilspeech-male-medium.onnx.json')), noa = JSON.parse(read('site/voice/he_IL-noa-medium.onnx.json'));
  assert.equal(nat.chitas_pad, false); assert.equal(noa.chitas_pad, undefined);
});
test('1.0.88: natural model files listed with real sizes, never precached, version bumped', () => {
  for (const k of ['natural', 'naturalConfig']) {
    const f = VOICE_FILES[k]; assert.ok(f, k);
    assert.equal(fs.statSync(root + 'site/' + f.url.split('?')[0]).size, f.size, k);
  }
  assert.ok(VOICE_FILES.natural.size > 60e6 && VOICE_FILES.natural.size < 70e6);
  const sw = read('site/sw.js');
  assert.match(sw, /VERSION = '1\.0\.88'/);
  assert.doesNotMatch(sw.match(/const ASSETS = \[[\s\S]*?\];/)[0], /voice\/|\.onnx|voice-samples/);
});
test('1.0.88: the natural male voice synthesises in Node with the fixed niqqud/shin-sin/vav G2P, in the male range', { timeout: 120000 }, async () => {
  const v = await nodeVoice({ natural: true });
  const r = await v.synth('וְשָׂרָה עָשְׂתָה שָׁלוֹם בְּיִשְׂרָאֵל, הוּא צִוָּה עַל הַמִּצְוָה, וְעָוֹן לֹא הָיָה.');
  for (const p of ['vesaʁˈa', 'ʃalˈom', 'bejisʁaʔˈel', 'tsivˈa', 'veʔavˈon']) assert.ok(r.ipa.includes(p), p);
  assert.equal(r.ids.filter(x => x === 0).length, 0, 'no pad ids');
  const sec = r.audio.length / v.sampleRate, f0 = f0Stats(r.audio, v.sampleRate).mean;
  assert.ok(sec > 3 && sec < 9, 'duration ' + sec);   // garbled (padded) input came out ~2× longer
  assert.ok(f0 > 75 && f0 < 150, 'F0 ' + f0);
  const noa = await nodeVoice(), t = 'הוּא צִוָּה עַל הַמִּצְוָה וְעָשׂוּ כֵן';
  const fm = f0Stats((await noa.synth(t, { timbre: timbreFor('male') })).audio, 22050).mean;
  const fd = f0Stats((await noa.synth(t, { timbre: timbreFor('deep') })).audio, 22050).mean;
  assert.ok(fd < fm - 8, `deep ${fd} < male ${fm}`);
});
test('1.0.88: previews exist and are small; credits name the natural voice, its author, link and CC BY-NC 4.0', () => {
  for (const g of ['male', 'deep', 'natural', 'female']) { const n = fs.statSync(root + `site/voice-samples/${g}.mp3`).size; assert.ok(n > 10000 && n < 80000, g + ' ' + n); }
  const app = read('site/js/app.js'), notice = read('site/voice/NOTICE.txt'), readme = read('README.md');
  for (const s of [app, notice, readme]) { assert.match(s, /notmax123\/piper-medium-heb/); assert.match(s, /CC BY-NC 4\.0/); }
  assert.match(app, /https:\/\/huggingface\.co\/notmax123\/piper-medium-heb/);
  assert.match(app, /creativecommons\.org\/licenses\/by-nc\/4\.0/);
  assert.match(read('verification/VOICE.md'), /he_IL-saspeech \| \*\*כן\*\*/);
});

test('1.0.88 browser: four choices, default unchanged; natural downloads only on click with size + progress, then reads with it', { skip, timeout: 240000 }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  const voiceReqs = () => log.filter(p => p.includes('/voice/'));
  try {
    const p = await pageWith(b, srv.url, { init: fakeSynth });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st');
    assert.deepEqual(await p.$$eval('input[name=ttsGender]', a => a.map(x => x.value)), ['male', 'deep', 'natural', 'female']);
    assert.equal(await p.isChecked('input[name=ttsGender][value=male]'), true, 'default stays the male timbre');
    // preview: a small file outside /voice/, fetched only on click
    await p.click('.qv-prev[data-v=deep]'); await p.waitForTimeout(400);
    assert.ok(log.some(x => x.includes('/voice-samples/deep.mp3')), 'preview fetched');
    // deep: no download needed beyond noa; natural: separate download with its size
    await p.click('label:has(input[name=ttsGender][value=deep])');
    assert.match(await p.textContent('#qv-gender-note'), /8 חצאי טון/);
    await p.click('label:has(input[name=ttsGender][value=natural])');
    assert.match(await p.textContent('#qv-gender-note'), /CC BY-NC 4\.0/);
    assert.equal(await p.isHidden('#qv-model'), true);
    await p.waitForFunction(() => /קול גברי טבעי – הורדה חד-פעמית \(\d+ MB\)/.test(document.querySelector('#qv-dl').textContent) && !document.querySelector('#qv-dl').hidden);
    assert.match(await p.textContent('#qv-st'), /הקול הגברי הטבעי אינו מותקן/);
    assert.deepEqual(voiceReqs(), [], 'nothing under /voice/ before the click');
    await p.click('#qv-dl');
    await p.waitForFunction(() => /מוריד/.test(document.querySelector('#qv-st').textContent));
    await p.waitForFunction(() => /הקול הגברי הטבעי מותקן במכשיר/.test(document.querySelector('#qv-st').textContent), null, { timeout: 150000 });
    assert.ok(voiceReqs().some(x => x.includes('he_IL-ilspeech-male-medium.onnx')));
    assert.ok(!voiceReqs().some(x => /he_IL-noa-medium(-int8)?\.onnx\b/.test(x) && !x.includes('.json')), 'noa model not downloaded for the natural voice');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
    assert.equal(st.ttsGender, 'natural'); assert.equal(st.ttsEngine, 'piper');
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__piperLog.length >= 1, null, { timeout: 90000 });
    const x = await p.evaluate(() => window.__piperLog[0]);
    assert.equal(x.gender, 'natural'); assert.ok(x.sec > 0.3); assert.ok(x.f0 >= 70 && x.f0 <= 155, 'natural F0 ' + x.f0);
    assert.equal(await p.evaluate(() => window.__spoken.length), 0, 'Web Speech not used');
    await p.click('#t-stop');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
