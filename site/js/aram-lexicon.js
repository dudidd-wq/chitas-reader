// ARAM-4: conservative general Aramaic stress lexicon for the compiled Bavli speech (speech layer only).
// One job: ADD a single U+05AB (ole, the speech-only stress tag) to an UNSTRESSED token whose exact pointed form
// (letters + niqqud) is one of the reviewed entries below. It never moves or removes an existing stress tag, never edits a
// letter, vowel, dagesh or punctuation, and never touches a token that already carries any accent, meteg or shva control.
// Fail closed: a string with HTML, an entity, an unpaired / malformed quotation or bracket, or any single quotation mark
// whose role cannot be told from an apostrophe / geresh is returned byte for byte. Words inside double or single quotations
// (verses, Mishnah, baraita wording) and inside ( ) / [ ] (Steinsaltz's Hebrew explanations) are never edited.
// Scope by source: LEX_CONFIG.sources switches it per source (same as tools/data/aram-lexicon.json); only Bavli Gemara (outside the Mishnah) is on.
// Every entry is absent from the app's Hebrew corpora (see tests/engine-aram4.test.mjs and engine-aram-4/ for the audit).
import { letters, nuclei, normalize, stressFromAccents, HATAMA } from './g2p.js';

export const LEX_CONFIG = {
  "_doc": "ARAM-4 conservative Aramaic stress lexicon (tools/aram-lexicon.mjs). Adds a U+05AB stress tag to an unstressed exact form only; never moves an existing tag. On only for the Bavli Gemara outside the Mishnah; every other source stays off.",
  "sources": {
    "bavli": true,
    "yerushalmi": false,
    "onkelos": false,
    "tanya": false,
    "tolt": false
  },
  "entries": [
    [
      "וְהָתַנְיָא",
      1
    ],
    [
      "מִדְּתַנְיָא",
      1
    ],
    [
      "וְכִדְתַנְיָא",
      1
    ],
    [
      "וְהָדְתַנְיָא",
      1
    ],
    [
      "וְדִלְמָא",
      1
    ],
    [
      "קָיְמָא",
      1
    ],
    [
      "וְקָיְמָא",
      1
    ],
    [
      "דְּקָיְמָא",
      1
    ],
    [
      "כִּדְקָיְמָא",
      1
    ],
    [
      "קַיְמָא",
      1
    ],
    [
      "דְּקַיְמָא",
      1
    ],
    [
      "קַמַּיְתָא",
      1
    ],
    [
      "בְּקַמַּיְתָא",
      1
    ],
    [
      "אַקַּמַּיְתָא",
      1
    ],
    [
      "מִקַּמָּיְתָא",
      1
    ],
    [
      "בָּתְרָיְתָא",
      1
    ],
    [
      "לְבָתְרָיְתָא",
      1
    ],
    [
      "מִדְּאוֹרָיְתָא",
      1
    ],
    [
      "דְּמִדְּאוֹרָיְתָא",
      1
    ],
    [
      "בִּדְאוֹרָיְתָא",
      1
    ],
    [
      "אַדְּאוֹרָיְתָא",
      1
    ],
    [
      "וּדְאוֹרָיְתָא",
      1
    ],
    [
      "כְּבָרַיְתָא",
      1
    ],
    [
      "אַבָּרַיְתָא",
      1
    ],
    [
      "וּבָרַיְתָא",
      1
    ],
    [
      "דְּבָרַיְתָא",
      1
    ],
    [
      "לְבָרַיְתָא",
      1
    ],
    [
      "חָיְלָא",
      1
    ],
    [
      "דְּחָיְלָא",
      1
    ],
    [
      "דְּתָנָא",
      1
    ],
    [
      "כִּדְתָנָא",
      1
    ],
    [
      "לְכִדְתָנָא",
      1
    ],
    [
      "מִדְּסֵיפָא",
      1
    ],
    [
      "וּמִדְּסֵיפָא",
      1
    ],
    [
      "לְסֵיפָא",
      1
    ],
    [
      "וְהָאִיכָּא",
      1
    ],
    [
      "הָאִיכָּא",
      1
    ],
    [
      "וְקַשְׁיָא",
      1
    ],
    [
      "דָּיְקָא",
      1
    ],
    [
      "פַּיְסָא",
      1
    ],
    [
      "שָׁיְכָא",
      1
    ],
    [
      "דְּשָׁיְכָא",
      1
    ],
    [
      "חָיְצָא",
      1
    ],
    [
      "מַיְתֵי",
      1
    ],
    [
      "דְּמַיְתֵי",
      1
    ],
    [
      "וּמַיְתֵי",
      1
    ],
    [
      "מַיְרֵי",
      1
    ],
    [
      "קָמַיְרֵי",
      1
    ],
    [
      "וְשָׁאנֵי",
      1
    ],
    [
      "וְהָקָתָנֵי",
      1
    ],
    [
      "בִּדְדָמֵי",
      1
    ],
    [
      "הֲוֵינַן",
      1
    ],
    [
      "וְהָוֵינַן",
      1
    ],
    [
      "מַתְנֵינַן",
      1
    ],
    [
      "שָׁיְמִינַן",
      1
    ],
    [
      "מַיְתִינַן",
      1
    ],
    [
      "דָּיְנִינַן",
      1
    ],
    [
      "חֲזֵינַן",
      1
    ],
    [
      "וַחֲזֵינַן",
      1
    ],
    [
      "קָחָזֵינַן",
      1
    ],
    [
      "מְשַׁהֵינַן",
      1
    ],
    [
      "קָיְמִי",
      1
    ],
    [
      "דְּקָיְמִי",
      1
    ],
    [
      "וְקָיְמִי",
      1
    ],
    [
      "כִּדְקָיְמִי",
      1
    ],
    [
      "עָיְלִי",
      1
    ],
    [
      "וְעָיְלִי",
      1
    ],
    [
      "דְּעָיְלִי",
      1
    ],
    [
      "דְּיָתְבִי",
      1
    ],
    [
      "וְיָתְבִי",
      1
    ],
    [
      "דְּיָדְעִי",
      1
    ],
    [
      "וְקָאָמְרִי",
      1
    ],
    [
      "הָאָמְרִי",
      1
    ],
    [
      "וְהָאָמְרִי",
      1
    ],
    [
      "דָּיְקִי",
      1
    ],
    [
      "דְּשָׁקְלִי",
      1
    ],
    [
      "דְּהָדְרִי",
      1
    ],
    [
      "וְהָדְרִי",
      1
    ],
    [
      "דְּגָמְרִי",
      1
    ],
    [
      "וְגָמְרִי",
      1
    ],
    [
      "דָּיְרִי",
      1
    ],
    [
      "דְּדָיְרִי",
      1
    ],
    [
      "יָרְתִי",
      1
    ],
    [
      "דְּפָלְגִי",
      1
    ],
    [
      "נָיְדִי",
      1
    ],
    [
      "דְּנָיְדִי",
      1
    ],
    [
      "דְּקָטְרִי",
      1
    ],
    [
      "דְּסָלְקִי",
      1
    ],
    [
      "מָיְתִי",
      1
    ],
    [
      "קָדְמִי",
      1
    ],
    [
      "קָטְלִי",
      1
    ],
    [
      "חָלְפִי",
      1
    ],
    [
      "דָרְסִי",
      1
    ],
    [
      "וְקָמִיפַּלְגִי",
      1
    ],
    [
      "דְּקָמִיפַּלְגִי",
      1
    ],
    [
      "אַדְּמִיפַּלְגִי",
      1
    ],
    [
      "מִיפַּטְרִי",
      1
    ],
    [
      "מִפַּטְרִי",
      1
    ],
    [
      "מִיפַּרְקִי",
      1
    ],
    [
      "מִימַּנְעִי",
      1
    ],
    [
      "מִשְׁתַּכְחִי",
      1
    ],
    [
      "מַתְקֵיף",
      0
    ],
    [
      "מֵתִיב",
      0
    ],
    [
      "אִיבָּעֵית",
      0
    ],
    [
      "וְאִיבָּעֵית",
      0
    ],
    [
      "לְמִיפְרַךְ",
      0
    ],
    [
      "מוֹתֵיב",
      0
    ],
    [
      "מַפֵּיק",
      0
    ],
    [
      "אִישְׁתִּיק",
      0
    ],
    [
      "וְאָכֵיל",
      0
    ],
    [
      "לְמִיעְבַּד",
      0
    ],
    [
      "וְלֵיחוּשׁ",
      0
    ],
    [
      "נָחֵית",
      0
    ],
    [
      "לֵיחוּשׁ",
      0
    ],
    [
      "וְנֵילַף",
      0
    ],
    [
      "וְהָאָמַר",
      0
    ],
    [
      "הָאָמַר",
      0
    ],
    [
      "וְהָתְנַן",
      0
    ],
    [
      "וְיָתֵיב",
      0
    ],
    [
      "וּמְנָלַן",
      0
    ],
    [
      "דְּאִיתְּמַר",
      0
    ],
    [
      "מֵרַבָּנַן",
      0
    ],
    [
      "וּלְרַבָּנַן",
      0
    ],
    [
      "אַדְּרַבָּנַן",
      0
    ],
    [
      "בִּדְרַבָּנַן",
      0
    ]
  ]
};

// stress index from the end: 0 = milra (final), 1 = milel (penultimate). Exact compiled spellings (the compiled speech
// writes some forms without the initial shva or dagesh; each spelling is its own entry and passed the same Hebrew test).
export const ARAM_LEX_ENTRIES = Object.freeze(LEX_CONFIG.entries.map(([form, k]) => Object.freeze({ form, k })));
/** exact lookup key: NFD letters + sorted niqqud (no accents, stress tags, meteg or shva controls) */
export const lexKey = w => normalize(String(w)).replace(/[^א-תְ-ׇּׁׂ]/g, '');
export const ARAM_LEX = new Map(ARAM_LEX_ENTRIES.map(e => [lexKey(e.form), e.k]));

const LETTER = /[א-ת]/;
const MARK = /[֑-ׇ]/;
const WORDCH = /[א-ת֑-ׇ|]/;
const PLAIN = /^[א-תְ-ׇּׁׂ]+$/;   // letters + niqqud only: no accent, ole, meteg, | or rafe

/** Scan a speech string. Returns null (fail closed) when its quotation / bracket structure is not certain, else the
 *  list of Hebrew word tokens [{start, end, text, free}] – free: outside every quotation and bracket. */
export function scanSpeech(s) {
  if (typeof s !== 'string') return null;
  if (/[<>&{}«»„‚‹›“”‘’`´]/.test(s)) return null;              // HTML / entities / any typographic quote: not certain
  const tokens = [];
  let dq = false;          // inside "…" or ״…״
  const br = [];           // open ( / [
  const isL = i => i >= 0 && i < s.length && WORDCH.test(s[i]);
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (LETTER.test(c)) {
      let j = i;
      // a word: letters, marks, and an internal gershayim / geresh before the LAST letter (ר"ל, א״ר, חז"ל, הקב"ה) stay
      // inside it. A mark between letters with more than one letter after it (מַיְתֵי"קָיְמָא) may be a quotation mark
      // glued to a word: ambiguous, the whole string fails closed.
      for (;;) {
        while (j < s.length && WORDCH.test(s[j])) j++;
        if (j < s.length && /["״'׳]/.test(s[j]) && isL(j + 1) && LETTER.test(s[j + 1])) {
          let e = j + 2; while (e < s.length && MARK.test(s[e])) e++;
          if (e < s.length && (LETTER.test(s[e]) || s[e] === '|')) return null;
          j++; continue;
        }
        break;
      }
      // a trailing geresh after a word (ר', מתני', גמ׳) is an abbreviation mark, part of the word. It cannot be a closing
      // single quotation mark: any opening single quotation mark makes the whole string fail closed (below)
      if (j < s.length && (s[j] === "'" || s[j] === '׳')) {
        j++;
        if (j < s.length && /['׳"״]/.test(s[j])) return null;
      }
      tokens.push({ start: i, end: j, text: s.slice(i, j), free: !dq && !br.length });
      i = j; continue;
    }
    if (MARK.test(c)) return null;                                    // a mark without its letter
    if (c === '"' || c === '״') {
      // here the mark is not between letters (that would be a gershayim, consumed above): a quotation boundary
      // an opener must not stick to a preceding word, a closer must not stick to a following word; else ambiguous
      if (!dq) { if (isL(i - 1)) return null; dq = true; }
      else { if (isL(i + 1)) return null; dq = false; }
      i++; continue;
    }
    if (c === "'" || c === '׳') {
      // a geresh not attached to a word end: an opening single quotation mark or a stray mark – its partner cannot be told
      // from an abbreviation geresh, so the string fails closed
      return null;
    }
    if (c === '(' || c === '[') { br.push(c); i++; continue; }
    if (c === ')' || c === ']') { const o = br.pop(); if (o !== (c === ')' ? '(' : '[')) return null; i++; continue; }
    i++;
  }
  if (dq || br.length) return null;                                   // an unclosed quotation / bracket
  return tokens;
}

/** add U+05AB on nucleus k (from the end) of a plain token; null if the result does not read back as exactly k */
export function addStress(tok, k) {
  const cl = [...tok.matchAll(/[א-ת][^א-ת]*/g)];
  const L = letters(tok);
  if (cl.length !== L.length || cl.map(m => m[0]).join('') !== tok) return null;
  const nu = nuclei(L);
  if (nu.length < 2 || k >= nu.length) return null;
  const at = nu[nu.length - 1 - k].own, m = cl[at];
  const pos = m.index + m[0].length;
  const out = tok.slice(0, pos) + HATAMA + tok.slice(pos);
  if (out.replace(/֫/g, '') !== tok || stressFromAccents(out) !== k) return null;
  return out;
}

/** the lexicon on one compiled speech string. opt.source: the text's source; opt.mishnah: the segment is Mishnah.
 *  Returns the input unchanged unless the source is enabled and the whole string scans cleanly. */
export function aramLexText(say, { source = null, mishnah = false, enabled = !!(source && LEX_CONFIG.sources?.[source]), stats = null } = {}) {
  if (!enabled || mishnah || typeof say !== 'string' || !say) return say;
  const toks = scanSpeech(say);
  if (!toks) { if (stats) stats.failClosed = (stats.failClosed || 0) + 1; return say; }
  let out = '', last = 0;
  for (const t of toks) {
    if (!t.free || !PLAIN.test(t.text)) continue;
    const k = ARAM_LEX.get(lexKey(t.text));
    if (k === undefined || t.text.includes(HATAMA)) continue;
    const w = addStress(t.text, k);
    if (!w) continue;
    out += say.slice(last, t.start) + w; last = t.end;
    if (stats) stats.added = (stats.added || 0) + 1;
  }
  return last ? out + say.slice(last) : say;
}
