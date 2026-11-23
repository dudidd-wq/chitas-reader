import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  isLav, stampOle, applyOleToText, plainMishna, stripOle, stressKey, stressFromAccents, lettersOnly, HATAMA,
} from '../tools/lib-mishna-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('isLav covers לאו and common prefixes, not lookalikes', () => {
  assert.equal(isLav('לאו'), true);
  assert.equal(isLav('ולאו'), true);
  assert.equal(isLav('בלאו'), true);
  assert.equal(isLav('שלאו'), true);
  assert.equal(isLav('לאום'), false);
  assert.equal(isLav('לאות'), false);
  assert.equal(isLav('בית'), false);
});

test('stampOle places a lone ole that locates the requested nucleus and keeps letters/vowels', () => {
  const w = 'הַבַּיִת';
  const out = stampOle(w, 1);
  assert.ok(out && out.includes(HATAMA));
  assert.equal(stressFromAccents(out, { allowOle: true }), 1);
  assert.equal(stressKey(out), stressKey(w));
  assert.equal(lettersOnly(out), lettersOnly(w));
  assert.equal(stampOle('כֵּן', 1), null); // monosyllable
  assert.equal(stampOle(w, 5), null);
});

test('applyOleToText never stamps לאו and only lexicon milel keys', () => {
  const lex = { [stressKey('הַבַּיִת')]: { k: 1, bibN: 26 } };
  const { text, changed } = applyOleToText('הַבַּיִת וְלָאו בַּיִת', lex);
  assert.equal(changed.length, 1);
  assert.equal(changed[0].src, 'הַבַּיִת');
  assert.ok(text.includes(HATAMA));
  assert.ok(text.includes('וְלָאו'));
  assert.ok(!text.split(/\s+/).find(w => lettersOnly(w) === 'ולאו' && w.includes(HATAMA)));
});

test('lexicon and apply report exist; gates hold; display and companion bytes preserved', () => {
  const lexPath = path.join(ROOT, 'tools/data/mishna-stress-lexicon.json');
  const reportPath = path.join(ROOT, 'tools/data/mishna-stress-apply-report.json');
  assert.ok(fs.existsSync(lexPath), 'lexicon built');
  assert.ok(fs.existsSync(reportPath), 'apply report');
  const lex = JSON.parse(fs.readFileSync(lexPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(lex.minCount, 5);
  assert.ok(lex.formCount >= 1 && lex.formCount === Object.keys(lex.forms).length);
  for (const [key, ent] of Object.entries(lex.forms)) {
    assert.ok(ent.k >= 1, key);
    assert.ok(ent.bibN >= 5, key);
    assert.equal(isLav(lettersOnly(key)), false, key);
  }
  assert.ok(report.changedTokens >= 650, 'changed ' + report.changedTokens);
  assert.equal(report.uniqueForms, report.forms.length);
  assert.ok(report.uniqueForms >= 1);

  const mishnaRoot = path.join(ROOT, 'site/data/gemara/mishna');
  const msayRoot = path.join(ROOT, 'site/data/gemara/msay');
  let files = 0, lavHits = 0, tokenCheck = 0;
  const walk = (d, acc = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (e.name.endsWith('.json') && e.name !== 'index.json') acc.push(p);
    }
    return acc;
  };
  for (const sf of walk(msayRoot)) {
    const rel = path.relative(msayRoot, sf);
    const raw = fs.readFileSync(sf);
    const liveRaw = execFileSync('git', ['show', `HEAD:site/data/gemara/msay/${rel.replaceAll('\\', '/')}`], { cwd: ROOT });
    const s = JSON.parse(raw);
    const live = JSON.parse(liveRaw);
    assert.deepEqual(s.bs, live.bs, 'bs ' + rel);
    assert.deepEqual(s.v, live.v, 'v ' + rel);
    // raw bs/v prefix identity: file starts as live and only gains ,"ms":
    const liveText = liveRaw.toString('utf8');
    const nowText = raw.toString('utf8');
    assert.ok(nowText.startsWith(liveText.endsWith('}') ? liveText.slice(0, -1) : liveText.replace(/\n$/, '').slice(0, -1)), 'prefix ' + rel);
    const mf = path.join(mishnaRoot, rel);
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    assert.equal(s.ms.length, m.m.length, rel);
    files++;
    for (let i = 0; i < m.m.length; i++) {
      const plain = plainMishna(m.m[i] ?? '');
      assert.equal(lettersOnly(s.ms[i]), lettersOnly(plain), rel + ' ' + (i + 1));
      assert.equal(stripOle(s.ms[i]).replace(/\s+/g, ' '), stripOle(plain).replace(/\s+/g, ' '));
      // no ole on לאו
      const re = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g;
      for (const tok of s.ms[i].match(re) || []) {
        if (isLav(lettersOnly(tok)) && tok.includes(HATAMA)) lavHits++;
        if (tok.includes(HATAMA)) {
          tokenCheck++;
          const k = stressFromAccents(tok, { allowOle: true });
          const ent = lex.forms[stressKey(tok)];
          assert.ok(ent, 'ole not in lexicon ' + tok);
          assert.equal(k, ent.k);
        }
      }
    }
  }
  assert.equal(lavHits, 0);
  assert.equal(tokenCheck, report.changedTokens);
  assert.equal(files, 525);
});

test('texts.js uses speech-only ms with fallback to the display mishnah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'site/js/texts.js'), 'utf8');
  assert.match(src, /const mishnaSay = s\?\.ms\?\.\[i\] \|\| plain;/);
  assert.match(src, /say: \[mishnaSay, \.\.\.\(s\?\.bs\?\.\[i\] \|\| \[\]\)\.filter\(Boolean\)\]\.join\(' '\)/);
  assert.equal((src.match(/const mishnaSay/g) || []).length, 1);
});

test('exact-only blocked form זָרַע is never stamped', () => {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/mishna-stress-apply-report.json'), 'utf8'));
  assert.ok((report.blocked || []).includes('זָרַע'));
  assert.equal((report.occurrences || []).filter(o => o.key === 'זָרַע' || o.src === 'זָרַע').length, 0);
  const ter = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/gemara/msay/Terumot/7.json'), 'utf8'));
  const yev = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/gemara/msay/Yevamot/7.json'), 'utf8'));
  for (const tok of [...(ter.ms[6].match(/[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g) || []), ...(yev.ms[4].match(/[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g) || [])]) {
    if (lettersOnly(tok) === 'זרע' && tok.includes(HATAMA) && stressKey(tok) === 'זָרַע') {
      assert.fail('stamped blocked form ' + tok);
    }
  }
});
