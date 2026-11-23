import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isLav, stripOle, lettersOnly, stressKey, stressFromAccents, HATAMA } from '../tools/lib-mishna-stress.mjs';
import { NON_IDENTITY_PINS, splitSayFile, mapOleOffset } from '../tools/lib-comment-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('non-identity 1B nachv pins are byte-identical to HEAD', () => {
  for (const rel of NON_IDENTITY_PINS) {
    const live = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT });
    const now = fs.readFileSync(path.join(ROOT, rel));
    assert.equal(Buffer.compare(live, now), 0, rel);
  }
});

test('lexicon apply report, gates, display/sidecar bytes, and ole invariants hold', () => {
  const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-lexicon.json'), 'utf8'));
  const blocked = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-blocked.json'), 'utf8'));
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/comment-stress-apply-report.json'), 'utf8'));
  assert.ok(report.changedTokens >= 650, 'changed ' + report.changedTokens);
  assert.equal(report.uniqueForms, report.forms.length);
  assert.equal(report.skippedPinCount, 12);
  assert.ok((blocked.forms || []).includes('זָרַע'));
  assert.equal((report.occurrences || []).filter(o => o.key === 'זָרַע').length, 0);

  const changedSet = new Set(execFileSync('git', ['diff', '--name-only', 'HEAD', '--',
    'site/data/gemara/bsay', 'site/data/gemara/ysay', 'site/data/nachv'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean));
  assert.equal(changedSet.size, report.pagesWritten);

  let oleAdded = 0, lavHits = 0, blockedHits = 0;
  for (const rel of changedSet) {
    const liveRaw = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT });
    const nowRaw = fs.readFileSync(path.join(ROOT, rel));
    const live = JSON.parse(liveRaw);
    const now = JSON.parse(nowRaw);
    assert.deepEqual(now.v, live.v, 'v ' + rel);
    assert.deepEqual(now.vd, live.vd, 'vd ' + rel);
    assert.deepEqual(now.partial, live.partial, 'partial ' + rel);
    assert.deepEqual(Object.keys(now).sort(), Object.keys(live).sort(), 'keys ' + rel);
    const liveN = live.nps1 || [];
    const nowN = now.nps1 || [];
    assert.equal(nowN.length, liveN.length, 'nps1 len ' + rel);
    let nps1Retargeted = false;
    for (let i = 0; i < nowN.length; i++) {
      const a = liveN[i], b = nowN[i];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      assert.ok(a && b && a.schema === 1 && b.schema === 1, 'nps1 slot ' + rel + '#' + i);
      assert.equal(a.base, live.say[i], 'old nps1 base ' + rel + '#' + i);
      assert.equal(b.base, now.say[i], 'new nps1 base ' + rel + '#' + i);
      assert.equal(stripOle(now.say[i]), stripOle(live.say[i]), 'nps1 say ole-only ' + rel + '#' + i);
      const { base: _ab, edits: ae, ...arest } = a;
      const { base: _bb, edits: be, ...brest } = b;
      assert.deepEqual(brest, arest, 'nps1 rest ' + rel + '#' + i);
      assert.equal((be || []).length, (ae || []).length, 'nps1 edits len ' + rel + '#' + i);
      for (let j = 0; j < (ae || []).length; j++) {
        const e = ae[j], f = be[j];
        assert.equal(f.start, mapOleOffset(live.say[i], now.say[i], e.start), 'nps1 start ' + rel + '#' + i);
        assert.equal(f.end, mapOleOffset(live.say[i], now.say[i], e.end), 'nps1 end ' + rel + '#' + i);
        const { start: _s1, end: _e1, ...erest } = e;
        const { start: _s2, end: _e2, ...frest } = f;
        assert.deepEqual(frest, erest, 'nps1 edit rest ' + rel + '#' + i);
      }
      nps1Retargeted = true;
    }
    const liveS = splitSayFile(liveRaw.toString('utf8')).suffix;
    const nowS = splitSayFile(nowRaw.toString('utf8')).suffix;
    if (!nps1Retargeted) {
      assert.deepEqual(now.nps1, live.nps1, 'nps1 ' + rel);
      assert.equal(nowS, liveS, 'suffix ' + rel);
    } else {
      const beforeNps1 = s => {
        const k = '"nps1":';
        const at = s.indexOf(k);
        return at < 0 ? s : s.slice(0, at);
      };
      assert.equal(beforeNps1(nowS), beforeNps1(liveS), 'suffix-before-nps1 ' + rel);
    }
    assert.equal(lettersOnly(JSON.stringify(now.say)), lettersOnly(JSON.stringify(live.say)), 'letters ' + rel);
    assert.equal(stripOle(JSON.stringify(now.say)), stripOle(JSON.stringify(live.say)), 'vowels-minus-ole ' + rel);
  }
  const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g;
  for (const o of report.occurrences) {
    assert.ok(lex.forms[o.key], o.key);
    assert.equal(o.k, lex.forms[o.key].k);
    assert.ok(o.k >= 1);
    assert.ok(o.dest.includes(HATAMA));
    assert.equal(stripOle(o.dest), o.src);
    assert.equal(isLav(o.bare), false);
    if (o.key === 'זָרַע') blockedHits++;
    oleAdded++;
  }
  assert.equal(oleAdded, report.changedTokens);
  assert.equal(blockedHits, 0);
  assert.equal(lavHits, 0);
});
