// Hebrew niqqud → IPA for the local Piper voice (he_IL-noa-medium), with a stress mark ˈ.
//
// The letter-to-phoneme rules (nikud haser, em/yud kriah, shin/sin, patah gnuva, geresh, dagesh, vav, kamatz before
// hataf-kamatz, the phoneme inventory and the "modern" χ/ʁ/ɡ schema) are a JavaScript port of the rule-based part of
// Phonikud G2P by thewh1teagle (https://github.com/thewh1teagle/phonikud, phonikud/hebrew.py + utils.py, v0.4.1),
// licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes from the original: ported to JS; stress is
// placed by the cantillation accents, an exception list and a suffix model learnt from the Torah and Tehillim instead
// of a fixed milra; grammatical rules for vocal shva (word start, second of two, identical letters, dagesh forte) and
// for qamatz katan (verified word list) were added. This file as a whole is distributed under GPL-2.0-or-later together
// with the CC BY 4.0 attribution above (see THIRD-PARTY-NOTICES.txt).
//
// Pure functions, no DOM: used in the voice worker and in Node tests (tests/g2p.test.mjs).

export const SHVA = '\u05B0', DAGESH = '\u05BC', HOLAM = '\u05B9', HIRIQ = '\u05B4', QAMATZ = '\u05B8', PATAH = '\u05B7';
export const TSERE = '\u05B5', SEGOL = '\u05B6', QUBUTS = '\u05BB', SIN = '\u05C2', HATAF_QAMATZ = '\u05B3', QAMATZ_KATAN = '\u05C7';
export const HATAMA = '\u05AB';   // Phonikud's stress diacritic (ole)
export const VSHVA = '\u05BD';    // Phonikud's vocal-shva diacritic (meteg)
const HASER = '\u05AF';           // Phonikud's nikud-haser mark (letter not read)
export const FULLV = new Set([...'\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05C7']);
export const ACCENTS = /[\u0591-\u05AF]/;
// accents that stand before/after the word, not on its stressed syllable (prepositive / postpositive)
export const NONSTRESS = new Set([...'\u05A0\u059A\u05AD\u0599\u05A9\u05AE\u0592\u0598\u059D']);
const RE_ACC_METEG = /[\u0591-\u05AF\u05BD]/g;

const STRESS = 'ˈ';
const VOWELS = 'aeiou';
const NIKUD_PHONEMES = {
  '\u05B4': 'i', '\u05B1': 'e', '\u05B5': 'e', '\u05B6': 'e', '\u05B2': 'a', '\u05B7': 'a', '\u05C7': 'o', '\u05B9': 'o',
  '\u05BA': 'o', '\u05BB': 'u', '\u05B3': 'o', '\u05B8': 'a', [HATAMA]: STRESS, [VSHVA]: 'e',
};
const LETTERS = {
  'א': 'ʔ', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'x', 'ט': 't', 'י': 'j', 'ך': 'x', 'כ': 'x',
  'ל': 'l', 'ם': 'm', 'מ': 'm', 'ן': 'n', 'נ': 'n', 'ס': 's', 'ע': 'ʔ', 'פ': 'f', 'ף': 'f', 'ץ': 'ts', 'צ': 'ts', 'ק': 'k',
  'ר': 'r', 'ש': 'ʃ', 'ת': 't', 'בּ': 'b', 'כּ': 'k', 'פּ': 'p', "'": '',
};
const GERESH = { 'ג': 'dʒ', 'ז': 'ʒ', 'ת': 'ta', 'צ': 'tʃ', 'ץ': 'tʃ' };
const GNUVA = { 'ח': 'ax', 'ה': 'ah', 'ע': 'a' };
const MODERN = [[/x/g, 'χ'], [/r/g, 'ʁ'], [/g/g, 'ɡ']];
const PHONEME_CHARS = new Set([...'ieaouʔvgdhzxtjklmnsfrʃbpˈʒʁχɡwc', ...'dʒtʃ']);
const SORT = s => [...s].sort().join('');

/** NFD + marks of each letter sorted by code point (as Phonikud's normalize). */
export function normalize(t) {
  return String(t).normalize('NFD').replace(/([\u05D0-\u05EA])([\u0591-\u05C7'|]+)/g, (m, l, d) => l + SORT(d))
    .replace(/\u05F3/g, "'").replace(/\u05F4/g, '"');
}
/** Letters of a word: [{ch, all, diac}] – `diac` without the stress mark (Phonikud's Letter). */
export function letters(word) {
  return [...normalize(word).matchAll(/([\u05D0-\u05EA])([\u0591-\u05C7'|]*)/g)].map(m => mk(m[1], m[2]));
}
const mk = (ch, all) => ({ ch, all, diac: [...all].filter(c => c !== HATAMA && c !== '|').join('') });
const setAll = (L, all) => { L.all = SORT(all); L.diac = [...L.all].filter(c => c !== HATAMA && c !== '|').join(''); };
const has = (L, c) => !!L && L.diac.includes(c);
const hasFull = L => !!L && [...L.diac].some(c => FULLV.has(c));

// ---------------- vowel nuclei and stress (index from the end, 0 = milra) ----------------
/** Pronounced vowel nuclei of a word: [{at, own}] – `own` is the letter that carries the vowel (a vav for shuruq/holam
 *  male), `at` the letter an accent of that syllable may stand on. Same rules as the research model (eval/heb.py). */
export function nuclei(word) {
  const cs = typeof word === 'string' ? letters(word) : word, out = [];
  cs.forEach((c, i) => {
    const marks = new Set([...c.all]), fv = [...marks].filter(m => FULLV.has(m));
    const prev = cs[i - 1], prevFull = !!prev && [...prev.all].some(m => FULLV.has(m));
    if (c.ch === 'ו' && !fv.some(m => m !== HOLAM) && (marks.has(DAGESH) || marks.has(HOLAM))) {
      if (marks.has(DAGESH) && !fv.length) {
        if (i === 0 || (!prevFull && !prev.all.includes(SHVA))) out.push({ at: i ? i - 1 : i, own: i });
        return;
      }
      if (marks.has(HOLAM) && !prevFull && i > 0) { out.push({ at: i - 1, own: i }); return; }
    }
    if (fv.length) out.push({ at: i, own: i });
  });
  return out;
}
/** Primary stress, not a musical/secondary accent. Dehi, tsinnorit and the geresh of revia-mugrash
 *  do not locate it. Ole is auxiliary when paired with yored (merkha); a lone ole is also our explicit
 *  speech-only stress tag (Hayom Yom/Rashi). Duplicated pashta/telisha locate stress with their non-edge copy.
 *  The final meteg-shaped mark before sof-pasuq is silluq, not an ordinary meteg. */
export function stressFromAccents(word, { allowOle = true } = {}) {
  const cs = letters(word), nu = nuclei(cs);
  if (!nu.length) return null;
  const marks = [];
  cs.forEach((c, i) => { for (const m of c.all) if (ACCENTS.test(m) && m !== HASER) marks.push([i, m]); });
  const toK = i => {
    const j = nu.findIndex(n => n.at === i || n.own === i);
    return j < 0 ? null : nu.length - 1 - j;
  };
  // A pre/postpositive PRIMARY sign makes a coincident munach only auxiliary (e.g. שֶׁ֣֭עֹמְדִים).
  // Do not promote that munach to primary. Revia-mugrash/tsinnorit are different: their positional partner is usable.
  const edgePrimary = marks.some(([, m]) => '\u05AD\u0599\u05A0\u05A9\u05AE\u0592\u059A'.includes(m));
  const primary = marks.filter(([, m]) => !NONSTRESS.has(m) && m !== HATAMA);
  if (primary.length && !edgePrimary) {
    // A disjunctive outranks a preceding conjunctive/secondary musical accent (וְאָ֣הַבְתָּ֔).
    const disj = primary.filter(([, m]) => '\u0591\u0593\u0594\u0595\u0596\u0597\u059B\u059C\u059E\u059F\u05A1\u05A2'.includes(m));
    const ks = new Set((disj.length ? disj : primary).map(([i]) => toK(i)));
    return ks.size === 1 && !ks.has(null) ? [...ks][0] : null;
  }
  // Modern MAM encodes a second, stress-locating copy of these edge-positioned signs.
  for (const [mark, prepositive] of [['\u0599', false], ['\u05A9', false], ['\u05A0', true]]) {
    const pos = [...new Set(marks.filter(([, m]) => m === mark).map(([i]) => i))].sort((a, b) => a - b);
    if (pos.length === 2) return toK(pos[prepositive ? 1 : 0]);
  }
  const ole = marks.filter(([, m]) => m === HATAMA);
  if (allowOle && ole.length === 1 && marks.length === 1) return toK(ole[0][0]);
  if (/\u05C3[^א-ת]*$/.test(word)) {
    const at = cs.map((c, i) => c.all.includes(VSHVA) ? i : -1).filter(i => i >= 0);
    if (at.length) return toK(at.at(-1));
  }
  return null;
}
/** Keep maqaf boundaries until after primary-stress extraction. The first component may carry
 *  a secondary musical mark (הַ֥לְלוּ־יָ֨הּ); it is not that component's lexical stress. */
export function accentWords(text) {
  return String(text).replace(/<i class="fn"[^>]*>[\s\S]*?<\/i>/g, '')
    .replace(/<span class="ketiv"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<\/?(?:big|small)>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '$2').replace(/\u05BE/g, '\u05BE ')
    .replace(/[\u05C0|]/g, ' ').split(/\s+/).map(w => ({
      word: w.replace(/[^\u05D0-\u05EA\u0591-\u05C7]/g, '').replace(/\u05BE/g, ''),
      joined: w.includes('\u05BE'),
    })).filter(x => /[א-ת]/.test(x.word));
}
/** Lookup key of a word: no accents or meteg, marks sorted, qamatz katan as qamatz (as the suffix model's norm). */
export const stressKey = w => normalize(String(w).replace(RE_ACC_METEG, '')).replace(/\u05C7/g, QAMATZ)
  .replace(/[^\u05D0-\u05EA\u05B0-\u05BC\u05BF\u05C1\u05C2\u05C7]/g, '');
/** clusters (letter + marks) of a key */
const clusters = k => k.match(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g) || [];

/** Stress index from the end for a word without usable accents: exception list → Torah/Tehillim lexicon → suffix model.
 *  data = {exc:{key:k}, lex:{key:k}, suf:{suffix:k}, maxn}. Returns [k, source]. */
export function predictStress(word, data = {}) {
  const key = stressKey(word);
  if (data.exc && key in data.exc) return [data.exc[key], 'exc'];
  if (data.lex && key in data.lex) return [data.lex[key], 'lex'];
  if (nuclei(key).length <= 1) return [0, 'mono'];
  const cs = clusters(key), suf = data.suf || {};
  for (let k = Math.min(data.maxn || 6, cs.length); k > 0; k--) {
    const s = cs.slice(-k).join('');
    if (s in suf) return [suf[s], 'suf' + k];
  }
  return [0, 'default'];
}

/** A verse's unambiguous primary stresses. Conflicting occurrences deliberately fall back to the
 *  lexicon instead of forcing the first reading onto every later occurrence. */
export function accentStressMap(text) {
  const map = new Map();
  // Build-time explicit speech tags use only ole. Real Tanakh has other accents: a lone ole there is auxiliary.
  const allowOle = !/[\u0591-\u05AA\u05AC-\u05AE]/.test(text);
  for (const { word, joined } of accentWords(text)) {
    if (joined) continue;
    const k = stressFromAccents(word, { allowOle }), key = stressKey(word);
    if (k === null) continue;
    if (!map.has(key)) map.set(key, k);
    else if (map.get(key) !== k) map.set(key, null);
  }
  return map;
}

// ---------------- vocal shva and qamatz katan (marks added before the letter rules) ----------------
const NO_SHVA_NA = new Set(['שתים', 'שתי', 'שתיים', 'בשתי', 'ושתי', 'ושתים', 'לשתי', 'משתי']);  // shtayim: the shva is quiescent by tradition
const skel = L => L.map(l => l.ch).join('');
const BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Mark vocal shva (meteg, as Phonikud) by grammar rules that need no guessing:
 *  1. on the first letter of the word; 2. the second of two shvas in a row (not at the word's end);
 *  3. under the first of two identical letters (הַלְלוּ, הִנְנִי); 4. under a letter with dagesh forte (dagesh after a vowel).
 *  The rule of a shva after a long vowel (Tiberian, needs the meteg of the edition) is not applied. */
export function markShvaNa(L) {
  const n = L.length;
  if (NO_SHVA_NA.has(skel(L))) return L;
  const isShva = i => !!L[i] && L[i].diac.includes(SHVA) && !L[i].diac.includes(VSHVA);
  for (let i = 0; i < n; i++) {
    if (!isShva(i) || L[i].ch === 'ו') continue;            // vav + shva is read "ve" by the vav rules
    const last = i === n - 1 || (i === n - 2 && isShva(n - 1));
    if (last) continue;                                       // final ךְ / תְּ / -שְׁתְּ: quiescent
    let na = false;
    if (i === 0) na = true;
    else if (isShva(i - 1) && !(i - 1 === 0)) na = true;      // second of two (the first one is not the word's first letter)
    else if (i - 1 === 0 && isShva(0)) na = false;            // שְׁמְ… cannot start a word; leave as written
    if (!na && L[i + 1] && (BASE[L[i].ch] || L[i].ch) === (BASE[L[i + 1].ch] || L[i + 1].ch)) na = true;
    if (!na && i > 0 && L[i].diac.includes(DAGESH) && (hasFull(L[i - 1]) || (L[i - 1].ch === 'ו' && has(L[i - 1], DAGESH)) || (/[יו]/.test(L[i - 1].ch) && !L[i - 1].diac && hasFull(L[i - 2])))) na = true;
    if (na) setAll(L[i], L[i].all + VSHVA);
  }
  return L;
}
/** Qamatz katan where it is not marked: kol (כָּל and its prefixed forms), and words of a list verified against the
 *  Torah/Tehillim edition, which marks qamatz katan (data.qk: key → index of the letter). Nothing else is guessed. */
export function markQamatzKatan(L, data = {}) {
  const sk = skel(L);
  // kol: optional prefixes, then כ with qamatz and a final ל without a vowel
  if (/^(ו|ש|ה|וש)?(ב|ל|מ|כ)?כל$/.test(sk) && sk.length <= 4) {
    const k = L[n2(L) - 2], l = L[n2(L) - 1];
    if (k.diac.includes(QAMATZ) && !hasFull(l)) { setAll(k, k.all.replace(QAMATZ, QAMATZ_KATAN)); return L; }
  }
  if (data.qk) {
    const key = L.map(l => l.ch + l.diac.replace(VSHVA, '')).join('').replace(/[^\u05D0-\u05EA\u05B0-\u05C7]/g, '');
    let hit = data.qk[key], off = 0;
    if (hit === undefined) {   // a prefix letter (ו ב ל כ ה מ ש with its vowel) before a verified form
      const m = /^[ובלכהמש][\u05B0-\u05BC\u05C1\u05C2]*/.exec(key);
      if (m) {   // the stem's first letter may gain or lose a dagesh after the prefix
        const st = key.slice(m[0].length), l = st[0], rest = st.slice(1);
        for (const v of [st, l + rest.replace(/^([\u05B0-\u05C7]*?)\u05BC/, '$1'), l + SORT(DAGESH + (rest.match(/^[\u05B0-\u05C7]*/)[0])) + rest.replace(/^[\u05B0-\u05C7]*/, '')])
          if (data.qk[v] !== undefined) { hit = data.qk[v]; off = 1; break; }
      }
    }
    if (hit !== undefined) for (const i of [].concat(hit)) { const x = L[i + off]; if (x?.diac.includes(QAMATZ)) setAll(x, x.all.replace(QAMATZ, QAMATZ_KATAN)); }
  }
  return L;
}
const n2 = L => L.length;

// ---------------- Phonikud letter rules (port) ----------------
const clean = out => out.filter(p => p && [...p].every(c => PHONEME_CHARS.has(c)));
const vowelsOf = cur => [...cur.all].map(n => NIKUD_PHONEMES[n] || '');
const stressOf = cur => (cur.all.includes(HATAMA) ? [STRESS] : []);
function sortStress(syl) {
  const text = syl.join('');
  if (!text.includes(STRESS) || !/[aeiou]/.test(text)) return syl;
  const s = syl.map(p => p.replaceAll(STRESS, ''));
  for (let i = 0; i < s.length; i++) { const r = s[i].replace(/([aeiou])/, STRESS + '$1'); if (r !== s[i]) { s[i] = r; break; } }
  return s;
}
const out = (cur, con, vow = null, skip = 0) => [clean(sortStress([...(con ? [con] : []), ...(vow ?? vowelsOf(cur))])), skip];
function vavVowel(d) {
  if (/[\u05B7\u05B8]/.test(d)) return 'va';
  if (d.includes(TSERE) || d.includes(SEGOL) || d.includes(VSHVA)) return 've';
  if (d.includes(HOLAM)) return 'o';
  if (d.includes(QUBUTS) || d.includes(DAGESH)) return 'u';
  if (d.includes(HIRIQ)) return 'vi';
  return null;
}
function vav(cur, prev, nxt) {
  const d = cur.diac, s = stressOf(cur);
  if (prev && prev.diac.includes(SHVA) && d.includes(HOLAM)) return out(cur, 'vo', s);
  if (nxt && nxt.ch === 'ו') {
    const dd = d + nxt.diac;
    if (dd.includes(HOLAM)) return out(cur, 'vo', s, 1);
    if (d === nxt.diac) return out(cur, 'vu', s, 1);
    const v = vavVowel(d); if (v) return out(cur, v, s);
    if (d.includes(SHVA) && !nxt.diac) return out(cur, 'v', s);
    return out(cur, '', s);
  }
  const v = vavVowel(d); if (v) return out(cur, v, s);
  if (d.includes(SHVA) && !prev) return out(cur, 've', s);
  if (nxt && !d) return out(cur, '', s);
  return out(cur, 'v', s);
}
function shin(cur, prev, nxt) {
  if (cur.diac.includes(SIN)) {
    if (nxt && nxt.ch === 'ש' && !nxt.diac && /[\u05B7\u05B8]/.test(cur.diac)) return out(cur, 'sa', stressOf(cur), 1);
    return out(cur, 's');
  }
  if (!cur.diac && prev && prev.diac.includes(SIN)) return out(cur, 's');
  return out(cur, LETTERS['ש']);
}
function letter(cur, prev, nxt) {
  const d = cur.diac, ch = cur.ch, s = stressOf(cur);
  if (cur.all.includes(HASER)) return [[], 0];
  if (d.includes("'") && GERESH[ch]) return out(cur, GERESH[ch], ch === 'ת' ? [] : null);
  if (d.includes(DAGESH) && LETTERS[ch + DAGESH]) return out(cur, LETTERS[ch + DAGESH]);
  if (ch === 'ו') return vav(cur, prev, nxt);
  if (ch === 'ש') return shin(cur, prev, nxt);
  if (!nxt && d.includes(PATAH) && GNUVA[ch]) return out(cur, GNUVA[ch], s);
  if (d.includes(QAMATZ) && nxt && nxt.diac.includes(HATAF_QAMATZ)) return out(cur, LETTERS[ch] || '', ['o', ...s]);
  if (ch === 'א' && !d && prev && nxt && nxt.ch !== 'ו') return out(cur, '');
  if (ch === 'י' && !d && prev && nxt && prev.ch + prev.diac !== 'א\u05B5' && !(nxt.ch === 'ו' && nxt.diac && !nxt.diac.includes(SHVA))) return out(cur, '');
  return out(cur, LETTERS[ch] || '');
}
export function phonemizeLetters(L) {
  const ph = [];
  for (let i = 0; i < L.length;) {
    const [p, skip] = letter(L[i], L[i - 1] || null, L[i + 1] || null);
    ph.push(...p); i += skip + 1;
  }
  return ph.join('');
}
function postNormalize(w) {
  return w.replace(/ʔ$/, '').replace(/ˈh$/, '').replace(/h$/, '').replace(/ij$/, 'i');
}
const modern = p => MODERN.reduce((s, [a, b]) => s.replace(a, b), p);

/** One Hebrew word (letters + niqqud, no accents) → IPA. k = stressed nucleus from the end (null: milra). */
export function wordToIPA(word, k = null, data = {}, opt = {}) {
  let L = letters(opt.raw ? word : String(word).replace(RE_ACC_METEG, ''));
  if (!L.length) return '';
  if (opt.raw) return modern(postNormalize(phonemizeLetters(L)));   // word already carries its marks (tests)
  if (!opt.noShvaNa) markShvaNa(L);
  markQamatzKatan(L, data);
  const nu = nuclei(L);
  if (nu.length) {
    const j = Math.max(0, nu.length - 1 - Math.min(k ?? 0, nu.length - 1));
    const t = L[nu[j].own]; setAll(t, t.all + HATAMA);
  } else if (L.length) setAll(L[0], L[0].all + HATAMA);   // e.g. an unvocalised word: stress on its first letter
  // Phonikud's sort_hatama: stress on a letter that is not read moves to the next letter
  for (let i = 0; i < L.length - 1; i++) if (L[i].all.includes(HATAMA) && L[i].all.includes(HASER)) { setAll(L[i], L[i].all.replace(HATAMA, '')); setAll(L[i + 1], L[i + 1].all + HATAMA); }
  return modern(postNormalize(phonemizeLetters(L)));
}

/** Names of the letters (the same table as tts-prep.js – a test keeps them equal), for spelling an unexpanded token. */
export const LETTER_NAME = { א: 'אָלֶף', ב: 'בֵּית', ג: 'גִּימֶל', ד: 'דָּלֶת', ה: 'הֵא', ו: 'וָו', ז: 'זַיִן', ח: 'חֵית', ט: 'טֵית', י: 'יוּד', כ: 'כָּף', ך: 'כָּף', ל: 'לָמֶד', מ: 'מֵם', ם: 'מֵם', נ: 'נוּן', ן: 'נוּן', ס: 'סָמֶךְ', ע: 'עַיִן', פ: 'פֵּא', ף: 'פֵּא', צ: 'צָדִי', ץ: 'צָדִי', ק: 'קוּף', ר: 'רֵישׁ', ש: 'שִׁין', ת: 'תָּו' };

/** Prepared TTS text (vocalised Hebrew, accents removed, divine names and numbers already expanded by tts-prep) → IPA.
 *  opt.accents: raw Tanakh string / Map, or {primary: preparedChunkWithOleTags} for compiled speech;
 *  opt.data: stress data (exc, lex, suf, qk). Compiled tags are occurrence-specific, not a distinct-word lookup.
 *  opt.trace: array that receives {word, ipa, k, src} per word (for tests). */
export function textToIPA(text, opt = {}) {
  const data = opt.data || {}, acc = typeof opt.accents === 'string' ? accentStressMap(opt.accents) : opt.accents instanceof Map ? opt.accents : null;
  // Compiled speech has per-occurrence tags. Chunk them with the text, not a paragraph-wide word map:
  // the same pointed spelling can occur twice with different stress. Reject any text/metadata mismatch.
  const marked = opt.accents?.primary;
  const inline = typeof marked === 'string' && normalize(marked.replace(/\u05AB/g, '')) === normalize(String(text));
  const input = inline ? marked : String(text);
  const t = normalize(input.replace(inline ? /[\u0591-\u05AA\u05AC-\u05AF\u05BD]/g : /[\u0591-\u05AF\u05BD]/g, '').replace(/\u05C3/g, '.')).replace(/[\u05BE]/g, ' ').replace(/[–—]/g, ',').replace(/;/g, ',').replace(/:/g, '.');
  return t.replace(/[\u05D0-\u05EA\u05AB\u05B0-\u05C7'"|]+/g, w => {
    const tagged = w.replace(/^['"]+|['"]+$/g, ''), core = tagged.replace(/\u05AB/g, '');
    if (!/[\u05D0-\u05EA]/.test(core)) return ' ';
    const key = stressKey(core);
    let k = inline ? stressFromAccents(tagged) : null, src = k === null ? 'acc' : 'primary';
    if (k === null && acc && acc.has(key)) k = acc.get(key);
    if (k === null) [k, src] = predictStress(core, data);
    let ipa = wordToIPA(core.replace(/"/g, ''), k, data, opt);
    // 1.0.64 safety net: an abbreviation / numeral that reached here unexpanded (ד׳, י״ב) has no vowel and was not heard –
    // spell it with the names of its letters instead (tts-prep normally does this already; verification/VOICE-NUMERALS.md)
    // (an internal ״ or a trailing ׳ after ≤ 4 letters; a closing quotation mark after a plain word is not an abbreviation)
    if (!/[aeiou]/.test(ipa) && (/['"]/.test(core) || /^[\u05D0-\u05EA][\u05B0-\u05C7]*$/.test(core) || /^(?:[\u05D0-\u05EA][\u05B0-\u05C7]*){1,4}'$/.test(w.replace(/^['"]+/, '')))) {
      ipa = [...core.replace(/[^\u05D0-\u05EA]/g, '')].map(l => { const n = LETTER_NAME[l]; return wordToIPA(n, predictStress(n, data)[0], data, opt); }).join(' ');
      src = 'spell';
    }
    opt.trace?.push({ word: core, ipa, k, src });
    return ipa;
  }).replace(/[^ .,!?aeiouʔvɡdhzχtjklmnsfʁʃbpˈʒw]/g, ' ').replace(/\s+([.,!?])/g, '$1').replace(/\s+/g, ' ').trim();
}

/** IPA → Piper phoneme ids (BOS, pad after each phoneme, EOS), as piper's phonemes_to_ids. Unknown characters are dropped. */
export function ipaToIds(ipa, idMap) {
  const ids = [...idMap['^'], ...idMap['_']];
  for (const ch of ipa) { const v = idMap[ch]; if (!v) continue; ids.push(...v, ...idMap['_']); }
  ids.push(...idMap['$']);
  return ids;
}
