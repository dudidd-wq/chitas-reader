// Stage 8: context-based kula/millei stress (tools/aram-kula.mjs) — K1 only, addition only, Bavli Gemara only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aramKulaText, RULES } from '../tools/aram-kula.mjs';
import { aramLexText, addStress, lexKey, ARAM_LEX_ENTRIES } from '../tools/aram-lexicon.mjs';
import { aramSayText, segMishnah, amudOrder } from '../tools/aramaic-speech.mjs';

const D = new URL('../site/data/', import.meta.url);
const json = f => JSON.parse(fs.readFileSync(new URL(f, D), 'utf8'));
const O = '֫';
const K1 = 'לְכוּלֵּיהּ';
const K1s = addStress(K1, 0);
const K = (s, opt = {}) => aramKulaText(s, { source: 'bavli', ...opt });

test('KULA: only K1 is enabled; exact unstressed לְכוּלֵּיהּ gains final ole; already tagged and near-misses stay', () => {
  assert.equal(RULES.length, 1);
  assert.equal(RULES[0].id, 'K1');
  assert.equal(RULES[0].form, K1);
  assert.equal(RULES[0].k, 0);
  assert.ok(K1s && K1s.includes(O) && K1s.replace(/֫/g, '') === K1);
  assert.equal(K(K1), K1s);
  assert.equal(K('אָמַר ' + K1 + ' חַמְרָא.'), 'אָמַר ' + K1s + ' חַמְרָא.');
  assert.equal(K(K1s), K1s); // no relocate / no double
  assert.equal(K('לְכ֫וּלֵּיהּ'), 'לְכ֫וּלֵּיהּ');
  for (const t of ['לְכוֹלֵּיהּ', 'לְכוּלֵּהּ', 'כּוּלֵּיהּ', 'בְּכוּלֵּיהּ', 'דְּכוּלֵּיהּ', 'לְכוּלֵּי', 'לְכוּלְּהוּ'])
    assert.equal(K(t), t, t);
  assert.equal(K(K1 + ' ' + K1s + ' כּוּלֵּיהּ'), K1s + ' ' + K1s + ' כּוּלֵּיהּ');
  assert.equal(K(K1s), K(K(K1))); // fixed point
});

test('KULA: non-Bavli, Mishnah, and fail-closed structure are byte-identical', () => {
  const s = K1 + ' ' + 'הָנֵי מִילֵּי';
  for (const source of ['yerushalmi', 'onkelos', 'tanya', 'tolt', null, undefined, 'unknown'])
    assert.equal(aramKulaText(s, { source }), s, String(source));
  assert.equal(K(s, { mishnah: true }), s);
  assert.equal(aramSayText(s, 'gemara', { source: 'bavli', mishnah: true }), s);
  assert.equal(aramSayText(K1, 'gemara', { source: 'bavli', mishnah: true }), K1);
  // Other aramSayText sources may already apply earlier (non-K1) rules; K1 itself must not run there.
  const tanya = aramSayText(K1, 'prose', { source: 'tanya' });
  const yer = aramSayText(K1, 'gemara', { source: 'yerushalmi' });
  assert.equal(aramKulaText(tanya, { source: 'tanya' }), tanya);
  assert.equal(aramKulaText(yer, { source: 'yerushalmi' }), yer);
  // malformed quotes/brackets fail closed (ARAM-4 scanner)
  for (const bad of [K1 + ' "מִילֵּי', K1 + ' [מִילֵּי', "'" + K1 + "'"])
    assert.equal(K(bad), bad, bad);
  // quoted / bracket interiors never receive K1
  assert.equal(K('אָמַר "' + K1 + '" סוֹף'), 'אָמַר "' + K1 + '" סוֹף');
  assert.equal(K('אָמַר [' + K1 + '] סוֹף'), 'אָמַר [' + K1 + '] סוֹף');
});

test('KULA: millei and other kula forms stay OFF, including mixed phrase contexts', () => {
  const samples = [
    'הָנֵי מִילֵּי', 'הָנֵי מִ֫ילֵּי', 'הָנֵי מִילֵּ֫י',
    'וְהָנֵי מִילֵּי', 'מְנָהָנֵי מִילֵּי', 'מִילֵּי הֵיכָא',
    'הָנֵי מִלֵּי הֵיכָא', 'בְּמִילֵּי', 'מִילֵּי', 'מִלֵּי',
    'כּוּלָּן', 'כּוּלּוֹ', 'כּוּלָּהּ', 'כּוּלְּהוּ', 'כּוּלָּם',
    'כַּלָּה', 'כלה', 'מְלֵי', 'וּמַלִּי', 'מילים',
    'כּוּלָּא', 'כּוֹלָּא', 'כולם',
  ];
  for (const t of samples) assert.equal(K(t), t, t);
  const mixed = 'הָנֵי מִ֫ילֵּי הָנֵי מִילֵּ֫י מִילֵּי הֵיכָא';
  assert.equal(K(mixed), mixed);
});

test('KULA: composes with ARAM-4 add-only; does not move an existing tag', () => {
  for (const e of ARAM_LEX_ENTRIES) {
    const w = addStress(e.form, e.k);
    assert.ok(w);
    assert.equal(aramKulaText(w, { source: 'bavli' }), w);
    const both = w + ' ' + K1;
    const out = aramKulaText(aramLexText(both, { source: 'bavli' }), { source: 'bavli' });
    assert.equal(out.replace(/֫/g, ''), (w + ' ' + K1).replace(/֫/g, ''));
    assert.ok(out.includes(w));
    assert.ok(out.endsWith(K1s) || out.includes(K1s));
  }
  // hook path: unstressed K1 is tagged after ARAM-4
  const hooked = aramSayText(K1, 'gemara', { source: 'bavli' });
  assert.equal(hooked, K1s);
  assert.equal(aramSayText(K1s, 'gemara', { source: 'bavli' }), K1s);
});

test('KULA: live Bavli speech is a fixed point (zero unstressed K1; no hidden yield)', () => {
  const open = [];
  let pages = 0, segs = 0, k1 = 0;
  for (const tr of fs.readdirSync(new URL('gemara/bavli/', D))) {
    let mi = false;
    const tdir = new URL(`gemara/bavli/${tr}/`, D);
    for (const a of amudOrder(fs.readdirSync(tdir))) {
      const d = json(`gemara/bavli/${tr}/${a}`), f = `gemara/bsay/${tr}/${a}`;
      if (d.yer || !fs.existsSync(new URL(f, D))) continue;
      pages++;
      json(f).say.forEach((s, i) => {
        mi = segMishnah(d.segs[i]?.[0] || '', mi);
        segs++;
        if (typeof s === 'string' && lexKey(s).includes(lexKey(K1).slice(0, 4))) {
          // count exact K1 tokens via a cheap inclusion first
        }
        const r = aramKulaText(s, { source: 'bavli', mishnah: mi });
        if (r !== s) open.push(f + '#' + i);
        if (typeof s === 'string') {
          for (const m of s.matchAll(/[א-ת][א-ת֑-ׇ|֫]*/g)) {
            if (lexKey(m[0].replace(/֫/g, '')) === lexKey(K1)) k1++;
          }
        }
      });
    }
  }
  assert.ok(pages > 5000, 'pages ' + pages);
  assert.ok(segs > 10000, 'segs ' + segs);
  assert.ok(k1 >= 20, 'observed K1 tokens ' + k1);
  assert.deepEqual(open, []);
});
