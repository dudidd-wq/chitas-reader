// ARAM-4: conservative exact-form Aramaic stress lexicon (tools/aram-lexicon.mjs) – addition only, Bavli Gemara only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { aramLexText, scanSpeech, addStress, lexKey, ARAM_LEX, ARAM_LEX_ENTRIES, LEX_CONFIG } from '../tools/aram-lexicon.mjs';
import { aramSayText, segMishnah, amudOrder } from '../tools/aramaic-speech.mjs';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { textToIPA } from '../site/js/g2p.js';

const D = new URL('../site/data/', import.meta.url);
const json = f => JSON.parse(fs.readFileSync(new URL(f, D), 'utf8'));
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const stress = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const ipa = (s, havara) => { const p = prepareForTTS(s, { stress: true, primaryStress: true, divineName: 'hashem' }); return textToIPA(p.replace(/֫/g, ''), { data: stress, havara, accents: { primary: p } }); };
const L = s => aramLexText(s, { source: 'bavli' });
const O = '֫';

test('ARAM4: exact before → after, addition only', () => {
  const cases = [
    ['וְהָתַנְיָא', 'וְהָתַ' + O + 'נְיָא'], ['קָיְמָא', 'קָ' + O + 'יְמָא'], ['מַיְתֵי', 'מַ' + O + 'יְתֵי'],
    ['הֲוֵינַן', 'הֲוֵ' + O + 'ינַן'], ['קָיְמִי', 'קָ' + O + 'יְמִי'], ['מִדְּאוֹרָיְתָא', 'מִדְּאוֹרָ' + O + 'יְתָא'],
    ['וְקָמִיפַּלְגִי', 'וְקָמִיפַּ' + O + 'לְגִי'], ['מַתְקֵיף', 'מַתְקֵ' + O + 'יף'], ['וְהָאָמַר', 'וְהָאָמַ' + O + 'ר'],
  ];
  for (const [a, b] of cases) { assert.equal(L(a), b); assert.equal(L(a + ', ' + a + '.'), b + ', ' + b + '.'); }
  // a whole sentence: only the lexicon forms gain one mark; everything else is byte-identical
  const s = 'אָמַר רָבָא: קָיְמָא לַן דְּהָכִי, וְהָתַנְיָא [וַהֲרֵי שָׁנִינוּ] מַיְתֵי.';
  const r = L(s);
  assert.equal(r, 'אָמַר רָבָא: קָ' + O + 'יְמָא לַן דְּהָכִי, וְהָתַ' + O + 'נְיָא [וַהֲרֵי שָׁנִינוּ] מַ' + O + 'יְתֵי.');
  assert.equal(r.replace(/֫/g, ''), s);
  // idempotent
  assert.equal(L(r), r);
  for (const e of ARAM_LEX_ENTRIES) { const w = addStress(e.form, e.k); assert.ok(w, e.form); assert.equal(w.replace(/֫/g, ''), e.form); assert.equal(L(w), w); }
});

test('ARAM4: an existing stress mark is never moved, removed or doubled; marked tokens are left alone', () => {
  for (const t of ['קָ' + O + 'יְמָא', 'קָיְמָ' + O + 'א', 'מַיְתֵ' + O + 'י', 'וְהָתַנְיָ' + O + 'א', 'קָ֥יְמָא', 'קָֽיְמָא', 'קָיְמָא|', 'קָי|ְמָא'])
    assert.equal(L(t), t, t);
  // the form test ignores existing marks only for recognition: a token with any mark is never edited
  assert.equal(L('קָיְמָ' + O + 'א קָיְמָא'), 'קָיְמָ' + O + 'א קָ' + O + 'יְמָא');
  // other pointings / prefixes are not inferred
  for (const t of ['קיימא', 'קַיְּמָא', 'דִּקְיְמָא', 'שֶׁקָּיְמָא', 'מַיְתֵה', 'מְייתי']) assert.equal(L(t), t, t);
});

test('ARAM4: double and single quotation interiors, abbreviation gershayim and geresh', () => {
  // double quotes: the interior is never edited; outside still is
  assert.equal(L('קָיְמָא "מַיְתֵי קָיְמָא" מַיְתֵי'), 'קָ' + O + 'יְמָא "מַיְתֵי קָיְמָא" מַ' + O + 'יְתֵי');
  assert.equal(L('קָיְמָא ״מַיְתֵי קָיְמָא״ מַיְתֵי'), 'קָ' + O + 'יְמָא ״מַיְתֵי קָיְמָא״ מַ' + O + 'יְתֵי');
  assert.equal(L('אָמַר ״אָמַר דִילְמָא קָיְמִי הוּא״'), 'אָמַר ״אָמַר דִילְמָא קָיְמִי הוּא״');
  // gershayim / geresh abbreviations are words, not quotation marks, inside and outside quotations
  assert.equal(L('ר"ל קָיְמָא א״ר מַיְתֵי ר״ל'), 'ר"ל קָ' + O + 'יְמָא א״ר מַ' + O + 'יְתֵי ר״ל');
  assert.equal(L('ר\' קָיְמָא מתני\' מַיְתֵי גמ׳ קָיְמִי'), 'ר\' קָ' + O + 'יְמָא מתני\' מַ' + O + 'יְתֵי גמ׳ קָ' + O + 'יְמִי');
  assert.equal(L('"א"ר קָיְמָא" מַיְתֵי'), '"א"ר קָיְמָא" מַ' + O + 'יְתֵי');
  // paired single quotation marks (straight or typographic) cannot be told from a geresh: the whole string fails closed
  for (const s of ["'אָמַר קָיְמָא הוּא'", 'מַיְתֵי \'אָמַר קָיְמָא הוּא\' מַיְתֵי', '‘אָמַר קָיְמָא הוּא’', 'מַיְתֵי ‘קָיְמָא’ מַיְתֵי', 'מַיְתֵי ’ קָיְמָא'])
    assert.equal(L(s), s, s);
});

test('ARAM4: malformed or unknown structure fails closed for the whole input', () => {
  const bad = [
    'קָיְמָא "מַיְתֵי',            // unmatched opening quote: nothing before it changes either
    'קָיְמָא מַיְתֵי"',            // a closing mark with no opener
    'קָיְמָא ” מַיְתֵי',           // a stray typographic closer
    'קָיְמָא “מַיְתֵי”',           // typographic double quotes are not recognized: closed
    'קָיְמָא «מַיְתֵי»',
    'קָיְמָא [מַיְתֵי',            // unbalanced bracket
    'קָיְמָא (מַיְתֵי]',           // crossed brackets
    'קָיְמָא מַיְתֵי)',
    'קָיְמָא <b>מַיְתֵי</b>',      // HTML
    'קָיְמָא &amp; מַיְתֵי',
    'קָיְמָא "מַיְתֵי"קָיְמָא "',   // a closer glued to a following word
    'קָיְמָא ִ מַיְתֵי',      // a mark without its letter
  ];
  for (const s of bad) { assert.equal(scanSpeech(s), null, s); assert.equal(L(s), s, s); assert.equal(aramSayText(s, 'gemara', { source: 'bavli' }).includes(O), aramSayText(s, 'gemara', { source: 'onkelos' }).includes(O), s); }
  // brackets / parentheses hold Steinsaltz's Hebrew: their interior is never edited
  assert.equal(L('קָיְמָא [מַיְתֵי] (קָיְמָא)'), 'קָ' + O + 'יְמָא [מַיְתֵי] (קָיְמָא)');
});

test('ARAM4: scope by source – Bavli Gemara only; Mishnah, Yerushalmi and every other text off', () => {
  assert.deepEqual(Object.entries(LEX_CONFIG.sources).filter(([, v]) => v).map(([k]) => k), ['bavli']);
  const s = 'קָיְמָא מַיְתֵי וְהָתַנְיָא';
  for (const source of ['yerushalmi', 'onkelos', 'tanya', 'tolt', 'siddur', 'rambam', 'torah', 'mishnah', null, undefined, 'unknown'])
    assert.equal(aramLexText(s, { source }), s, String(source));
  assert.equal(aramLexText(s, { source: 'bavli', mishnah: true }), s);
  assert.equal(aramSayText(s, 'gemara', { source: 'bavli', mishnah: true }), s);
  assert.equal(aramSayText(s, 'gemara', { source: 'bavli' }).replace(/֫/g, ''), s);
  assert.equal(aramSayText(s, 'gemara', { source: 'bavli' }), L(aramSayText(s, 'gemara', { source: 'bavli' })));
  assert.ok(aramSayText(s, 'gemara', { source: 'bavli' }).includes('קָ' + O + 'יְמָא'));
  for (const [mode, source] of [['prose', 'tanya'], ['prose', 'tolt'], ['onkelos', 'onkelos']]) assert.ok(!aramSayText(s, mode, { source }).includes('קָ' + O + 'יְמָא'), source);
});

test('ARAM4: no entry occurs in the Hebrew corpora (exact or dagesh/shva-insensitive)', () => {
  const loose = w => lexKey(w).replace(/[ּׁׂ]/g, '').replace(/ׇ/g, 'ָ').replace(/^([א-ת])ְ/, '$1');
  const want = new Set(ARAM_LEX_ENTRIES.map(e => loose(e.form)));
  assert.equal(ARAM_LEX.size, ARAM_LEX_ENTRIES.length);
  const hits = [];
  const scan = (s, where) => { for (const m of String(s).replace(/<[^>]+>/g, ' ').matchAll(/[א-ת][א-ת֑-ׇ|]*/g)) if (want.has(loose(m[0]))) hits.push(where + ': ' + m[0]); };
  const walk = (x, f) => { if (typeof x === 'string') f(x); else if (Array.isArray(x)) x.forEach(y => walk(y, f)); else if (x && typeof x === 'object') Object.values(x).forEach(y => walk(y, f)); };
  const list = d => fs.existsSync(new URL(d, D)) ? fs.readdirSync(new URL(d, D), { recursive: true }).filter(f => f.endsWith('.json')).map(f => d + f.split(String.fromCharCode(92)).join('/')) : [];
  const corpora = [['torah/', 'v'], ['tehillim/', 'v'], ['nach/', 'v'], ['nachv/'], ['gemara/mishna/', 'm'], ['gemara/msay/', 'v'], ['siddur/'], ['rambam/'], ['mitzvot/'], ['mitzvot-voc/'], ['tanya/'], ['tolt/'], ['hayomyom/'], ['ravyomi/'], ['sbiur/']];
  let n = 0;
  for (const [d, k] of corpora) for (const f of list(d)) { const j = json(f); walk(k ? j[k] : j, s => scan(s, f)); n++; }
  assert.ok(n > 3000, 'corpora present: ' + n);
  // the Bavli's own Mishnah segments (raw text and speech)
  for (const tr of fs.readdirSync(new URL('gemara/bavli/', D))) { let mi = false;
    for (const a of amudOrder(fs.readdirSync(new URL(`gemara/bavli/${tr}/`, D)))) { const d = json(`gemara/bavli/${tr}/${a}`), f = `gemara/bsay/${tr}/${a}`; if (d.yer || !fs.existsSync(new URL(f, D))) continue;
      json(f).say.forEach((s, i) => { mi = segMishnah(d.segs[i]?.[0] || '', mi); if (mi) { scan(s, f); scan(d.segs[i]?.[0] || '', f); } }); } }
  assert.deepEqual(hits, []);
});

test('ARAM4: compiled Bavli speech – every recorded addition is one U+05AB on an unstressed entry token, nothing else changed', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/aram4-additions.json', import.meta.url), 'utf8'));
  assert.ok(fx.strings.length > 1000);
  let tokens = 0;
  for (const [file, i, baseSha, idx] of fx.strings) {
    const s = json(file).say[i]; const parts = s.split(/(\s+)/);
    for (const t of idx) {
      const w = parts[t]; assert.equal((w.match(/֫/g) || []).length, 1, file + i + w);
      const core = w.replace(/^[^א-ת]+|[^א-ת֑-ׇ|]+$/g, '');
      assert.ok(ARAM_LEX.has(lexKey(core)), w); parts[t] = w.replace(O, ''); tokens++;
    }
    assert.equal(sha(parts.join('')), baseSha, `${file} say[${i}]`);
  }
  assert.equal(tokens, fx.tokens);
});

test('ARAM4: compiled Bavli speech is a fixed point of the lexicon (Mishnah state carried across amudim)', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/aram4-additions.json', import.meta.url), 'utf8'));
  const allowed = new Set(fx.keptAtBase.map(([f, i]) => f + '#' + i));
  const open = [];
  for (const tr of fs.readdirSync(new URL('gemara/bavli/', D))) { let mi = false;
    for (const a of amudOrder(fs.readdirSync(new URL(`gemara/bavli/${tr}/`, D)))) { const d = json(`gemara/bavli/${tr}/${a}`), f = `gemara/bsay/${tr}/${a}`; if (d.yer || !fs.existsSync(new URL(f, D))) continue;
      json(f).say.forEach((s, i) => { mi = segMishnah(d.segs[i]?.[0] || '', mi); if (aramLexText(s, { source: 'bavli', mishnah: mi }) !== s && !allowed.has(f + '#' + i)) open.push(f + '#' + i); }); } }
  assert.deepEqual(open, []);
});

test('ARAM4: frozen identity – non-target speech and its Israeli / Chabad IPA are byte-identical to base 2ec6d09a', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/aram4-identity.json', import.meta.url), 'utf8'));
  assert.ok(fx.rows.length > 300);
  const pick = (j, p) => p.replace(/\]/g, '').split(/[.[]/).filter(Boolean).reduce((o, k) => o?.[/^\d+$/.test(k) ? +k : k], j);
  const mode = { yerushalmi: 'gemara', 'bavli-mishnah': 'gemara', onkelos: 'onkelos', tanya: 'prose', tolt: 'prose', rambam: 'prose' };
  for (const r of fx.rows) {
    const s = pick(json(r.file), r.path); assert.equal(typeof s, 'string', r.file + r.path);
    assert.equal(sha(s), r.say, r.file + r.path);
    const opt = r.source === 'bavli-mishnah' ? { source: 'bavli', mishnah: true } : r.source === 'onkelos' ? {} : { source: r.source };
    assert.equal(sha(aramSayText(s, mode[r.source], opt)), r.pass, 'pass ' + r.file + r.path);
    assert.equal(ipa(s, 'israeli'), r.israeli, 'israeli ' + r.file + r.path);
    assert.equal(ipa(s, 'chabad'), r.chabad, 'chabad ' + r.file + r.path);
  }
});

test('ARAM4: production builder and TTS path on real compiled strings (frozen speech and IPA)', async () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/aram4-builder.json', import.meta.url), 'utf8'));
  globalThis.fetch = async p => { try { return { ok: true, json: async () => json(String(p).replace(/^.*?data\//, '').replace(/\?.*$/, '')) }; } catch { return { ok: false }; } };
  const { libDoc } = await import('../site/js/library.js');
  assert.ok(fx.length >= 4);
  for (const r of fx) {
    const { doc } = await libDoc(r.id); const block = doc.blocks.find(b => b.say && b.say.includes(r.excerpt));
    assert.ok(block, r.id + ' ' + r.excerpt);
    assert.equal(sha(block.say), r.sayHash, r.id);
    assert.equal(block.say.replace(/֫/g, '').length, r.plainLength, r.id);
    assert.equal(ipa(block.say, 'israeli'), r.israeli, r.id);
    assert.equal(ipa(block.say, 'chabad'), r.chabad, r.id);
    assert.equal(r.israeli === r.israeliBase, false, 'Israeli IPA changed by the lexicon ' + r.id);
    assert.equal(r.chabad, r.chabadBase, 'Chabad IPA unchanged ' + r.id);
  }
});
