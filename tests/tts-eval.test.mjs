// A1 (engine 1): TTS evaluation pack. Offline and deterministic (no browser, no audio, no network).
// A change in tts-prep / g2p that moves the output of the fixed sample fails here with a classified report;
// accept it on purpose with:  node tools/tts-eval.mjs --update-golden   (see verification/TTS-EVAL.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { snapshot, diffSnapshots, formatDiff, findOmissions, classifyIpa, audioMetrics, voiceInstalled, synthMetrics,
  FIXTURE, GOLDEN, TRADITIONS } from '../tools/tts-eval.mjs';

const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));

test('fixture: stratified, practical for CI (hundreds of words), covers every required kind', () => {
  const cats = new Set(fixture.items.map(i => i.cat));
  for (const c of ['mikra', 'rashi', 'mishna', 'halacha', 'chassidus', 'aramaic', 'siddur']) assert.ok(cats.has(c), 'category ' + c);
  const words = fixture.items.reduce((a, x) => a + x.html.split(/\s+/).length, 0);
  assert.ok(words >= 300 && words <= 3000, `${words} words`);
  assert.equal(new Set(fixture.items.map(i => i.id)).size, fixture.items.length, 'unique ids');
});

test('snapshot is deterministic and matches the golden (unintended g2p / tts-prep changes fail here)', () => {
  const a = snapshot(fixture), b = snapshot(fixture);
  assert.deepEqual(a, b, 'two runs differ');
  const d = diffSnapshots(golden, a);
  assert.equal(d.length, 0, '\n' + formatDiff(d));
});

test('golden holds both traditions with a decision trace for every item', () => {
  for (const it of fixture.items) {
    const g = golden.items[it.id]; assert.ok(g, it.id);
    for (const t of TRADITIONS) {
      assert.ok(g.ipa[t].length > 0, `${it.id} ${t}`);
      assert.ok(g.trace[t].length > 0 && g.trace[t].every(l => l.split('|').length === 4), `${it.id} ${t} trace`);
    }
  }
  // the two traditions really differ somewhere (otherwise the second column proves nothing)
  assert.ok(fixture.items.some(i => golden.items[i.id].ipa.israeli !== golden.items[i.id].ipa.chabad));
});

test('diff report classifies prep / stress / phoneme / trace / item changes', () => {
  const id = fixture.items[0].id, cur = clone(golden);
  assert.deepEqual(diffSnapshots(golden, cur), []);
  cur.items[id].prep += ' x';
  cur.items[id].ipa.israeli = cur.items[id].ipa.israeli.replace('ˈ', '');
  cur.items[id].ipa.chabad = cur.items[id].ipa.chabad.replace(/a/, 'o');
  const other = fixture.items[1].id; cur.items[other].trace.israeli[0] += 'Z';
  delete cur.items[fixture.items[2].id]; cur.items.newone = cur.items[id];
  const by = Object.fromEntries(diffSnapshots(golden, cur).map(x => [x.cls + ':' + x.id + ':' + x.field, 1]));
  assert.ok(by[`prep:${id}:prep`] && by[`ipa-stress:${id}:ipa.israeli`] && by[`ipa-phoneme:${id}:ipa.chabad`]);
  assert.ok(by[`trace-only:${other}:trace.israeli#0`]);
  assert.ok(by[`item-removed:${fixture.items[2].id}:`] && by['item-added:newone:']);
  assert.equal(classifyIpa('abˈa', 'ˈaba'), 'ipa-stress'); assert.equal(classifyIpa('aba', 'abe'), 'ipa-phoneme');
  assert.match(formatDiff(diffSnapshots(golden, cur)), /--update-golden/);
});

test('silent omission: every phoneme of the sample is kept by the final filter and mapped by both voice models', () => {
  const om = findOmissions(snapshot(fixture));
  assert.deepEqual(om, [], om.slice(0, 10).map(o => `${o.id} ${o.kind} ${o.detail}`).join('\n'));
});

test('silent omission check really detects drops (unmapped phoneme, filtered char, empty word, missing word)', () => {
  const s = clone(golden), id = fixture.items[0].id;
  s.items[id].trace.israeli.push('חחח|ɲ|0|x', 'ננן||0|x');
  const kinds = findOmissions(s, { fake: { a: [1] } }).filter(o => o.id === id && o.tradition === 'israeli').map(o => o.kind);
  for (const k of ['filtered-char', 'unmapped:fake', 'empty-ipa', 'word-count']) assert.ok(kinds.includes(k), k + ' in ' + kinds);
});

test('audio metrics (pure): duration, level, silence gaps, edge cut', () => {
  const rate = 22050, n = rate, pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = Math.sin(i / 20) * 0.5;
  for (let i = Math.round(n * 0.4); i < Math.round(n * 0.6); i++) pcm[i] = 0;          // 200 ms gap
  const m = audioMetrics(pcm, rate);
  assert.ok(Math.abs(m.seconds - 1) < 1e-6 && m.maxSilenceMs >= 190 && m.maxSilenceMs <= 210, JSON.stringify(m));
  assert.ok(m.rmsDb < 0 && m.rmsDb > -20 && m.peak <= 0.5 + 1e-6);
  assert.ok(m.headPeak > 0.1 || m.tailPeak > 0.1, 'abrupt start/end is visible as an edge peak');
});

// Optional: synthesis with the installed local voice. Heavy (loads a 20+ MB model), so opt-in: TTS_EVAL_AUDIO=1.
const skipAudio = process.env.TTS_EVAL_AUDIO !== '1' ? 'set TTS_EVAL_AUDIO=1 to run' : !voiceInstalled() ? 'local voice not installed' : false;
test('audio metrics with the local voice (sanity bounds, not golden – synthesis is stochastic)', { skip: skipAudio, timeout: 300000 }, async () => {
  const res = await synthMetrics(fixture.items, { limit: 4 });
  for (const [id, m] of Object.entries(res)) {
    assert.ok(m.seconds > 0.5 && m.seconds / m.chars < 0.6, `${id} duration ${m.seconds}`);
    assert.ok(m.rmsDb > -45 && m.peak <= 1, `${id} level ${m.rmsDb} peak ${m.peak}`);
    assert.ok(m.maxSilenceMs < 1500, `${id} silence ${m.maxSilenceMs}`);
    assert.ok(m.headPeak < 0.2 && m.tailPeak < 0.2, `${id} cut edges ${m.headPeak}/${m.tailPeak}`);
  }
});
