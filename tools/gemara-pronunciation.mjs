// 1.0.96: speech-only text preparation for the Gemara cycles (port of the text-prep parts of the Aramaic prototype,
// /workspace/aramaic-eval/multi/pipeline: prep.py + israeli.py + corrections.json). The display text is never changed.
// Steinsaltz (Bavli): bold words are the Gemara's own words – vocalized from the William Davidson vocalized Gemara of
// the same segment (consonant match), else Dicta "rabbinic"; all other words Dicta "modern". Stress: curated list,
// stress-he exceptions, Dicta's stress (Acc0/Acc1), then the lexicon. Verse references "(איוב ה, ט)" and source tags
// are not read; ר׳ is read רבי; the Gemara quote in <big> (מתני׳ / גמ׳ headings) is not read.
// Israeli shva (israeli.py rule 1b, with its safe_drop guards): a word-initial shva under a root letter (not ב כ ל מ ו ד)
// is read silent – the speech text simply omits that shva sign (g2p.js reads a word-initial shva as vocal).
// Word-initial ב/כ/פ are read as stops (israeli.py rule 2): a missing dagesh is added in the speech text.
import fs from 'node:fs';
import { letters, nuclei, stressKey, predictStress, textToIPA, HATAMA, SHVA, DAGESH } from '../site/js/g2p.js';
import { curatedProseStress, proseSource } from './prose-context.mjs';
import { stampStress } from './siddur-pronunciation.mjs';

export const VERSIONS = { gem: 'hebrew|William Davidson Edition - Vocalized Aramaic', ste: 'hebrew|William Davidson Edition - Hebrew',
  yer: 'hebrew|The Jerusalem Talmud, edition by Heinrich W. Guggenheimer. Berlin, De Gruyter, 1999-2015', mis: 'hebrew|Torat Emet 357', bar: 'hebrew|On Your Way' };
const ROOT = new URL('../', import.meta.url).pathname;
export const STRESS = JSON.parse(fs.readFileSync(ROOT + 'site/voice/stress-he.json'));
export const CORRECTIONS = JSON.parse(fs.readFileSync(ROOT + 'tools/data/gemara-corrections.json'));

const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const sk = w => w.replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]);
const unescape = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// verse references "(איוב ה, ט)" / source tags "(תוהרא"ש)" – prep.py REFP
const BOOKS = 'בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל [אב]|שמואל|מלכים [אב]|מלכים|ישעיהו?|ירמיהו?|יחזקאל|הושע|יואל|עמוס|עובדיה|יונה|מיכה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|תהלים|תהילים|משלי|איוב|שיר השירים|רות|איכה|קהלת|אסתר|דניאל|עזרא|נחמיה|דברי הימים [אב]|דברי הימים|שם';
const NUM = '[\u05D0-\u05EA]{1,3}[׳\'"״]?[\u05D0-\u05EA]?';
export const REFP = new RegExp(`\\s*\\((?:[\\u05D0-\\u05EA]+\\s)+[\\u05D0-\\u05EA]{1,3},\\s?[\\u05D0-\\u05EA]{1,3}\\)|\\s*\\([\\u05D0-\\u05EA]+"[\\u05D0-\\u05EA]\\)|\\s*\\((?:${BOOKS})(?:\\s+(?:פרק|פסוק))?\\s+${NUM}(?:,?\\s*(?:פסוק\\s+)?${NUM})?\\)`, 'g');
const RABBI = /(?<![\u05D0-\u05EA])ר['׳](?=\s|<|$)/g;
export const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״]*/g;

/** Steinsaltz segment HTML → [{t, b}] runs (b: inside <b>/<strong>), for speech. */
export function speechRuns(html) {
  let h = unescape(html.replace(/<big>[\s\S]*?<\/big>/g, ' ').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<i [^>]*data-commentator[^>]*>[\s\S]*?<\/i>/g, ''));
  h = h.replace(REFP, '').replace(RABBI, 'רבי');
  const runs = []; let b = false;
  for (const tok of h.split(/(<[^>]+>)/)) {
    if (tok.startsWith('<')) { const t = tok.toLowerCase(); if (/^<(b|strong)\b/.test(t)) b = true; else if (/^<\/(b|strong)>/.test(t)) b = false; continue; }
    if (tok) runs.push({ t: proseSource(tok), b });
  }
  return runs;
}
/** Plain text sent to Dicta (the same words, in order). */
export const plainOf = runs => runs.map(r => r.t).join('').replace(/[\u0591-\u05C7]/g, '').replace(/—/g, '–').replace(/\s+/g, ' ').trim();
/** Batches of segment texts (one per line), ≤ 2500 characters. */
export function batchTexts(texts, max = 2500) {
  const out = []; let cur = [];
  const flush = () => { if (cur.length) { const text = cur.join('\n'); out.push({ hash: crypto.createHash('sha256').update(text).digest('hex').slice(0, 24), text }); cur = []; } };
  for (const t of texts) { if (cur.join('\n').length + t.length > max) flush(); cur.push(t); }
  flush();
  return out;
}
import crypto from 'node:crypto';
/** Dicta tokens of a batch → word tokens (no separators), for sequential matching. */
export const dictaWords = tokens => tokens.filter(t => !t.sep && /[\u05D0-\u05EA]/.test(t.word));
const clean = w => w.replace(/\|/g, '').replace(/\u05BD/g, '');
/** a cursor over a batch's Dicta words: next(word) → the token whose consonants match (window of 5, as prep.py) */
export function cursor(words) {
  let i = 0;
  return w => { const s = sk(w); for (let j = i; j < Math.min(words.length, i + 5); j++) if (sk(words[j].word) === s) { i = j + 1; return words[j]; } return null; };
}
const chosen = t => t && (t.options.find(o => o.level === 1) || t.options[0]);
const accK = o => /^Acc[01]$/.test(o?.acc || '') ? +o.acc.slice(-1) : null;
const keyNoDagesh = w => stressKey(w).replace(/\u05BC/g, '');

// ---------------- Israeli shva (israeli.py safe_drop, on the app's own IPA) ----------------
const V = 'aeiou';
const ipaToks = a => a.match(/ts|tʃ|dʒ|./g) || [];
export function safeDropInitial(ipa) {
  const o = ipa.replace(/ʰ/g, ''), a = o.replace(/ˈ/g, '');
  const toks = ipaToks(a), vi = toks.map((t, k) => V.includes(t) ? k : -1).filter(k => k >= 0);
  if (vi.length < 2) return false;
  const k = vi[0];                                    // the first vowel = the vocal shva's e
  if (toks[k] !== 'e' || k !== 1) return false;
  const st = o.includes('ˈ') ? (o.slice(0, o.indexOf('ˈ')).replace(/ˈ/g, '').match(/[aeiou]/g) || []).length : vi.length - 1;
  if (st === 0) return false;                         // never the stressed vowel
  if (k + 2 >= toks.length) return false;
  const c1 = toks[k - 1], c2 = toks[k + 1], after = toks[k + 2];
  if (V.includes(c1) || V.includes(c2) || !V.includes(after)) return false;   // no 3-consonant cluster
  if (['l', 'm', 'j', 'ʁ'].includes(c1) || ['ʔ', 'h', 'j'].includes(c2)) return false;
  if ([['d', 't', 'ts'], ['b', 'p', 'v', 'f'], ['k', 'ɡ', 'χ'], ['s', 'z', 'ʃ', 'ts']].some(g => g.includes(c1) && g.includes(c2))) return false;
  return true;
}
const NO_DROP = new Set(CORRECTIONS.keepShva.map(w => keyNoDagesh(w)));
/** word (vocalized, no stress mark) → the same word with a silent initial shva (speech only), or unchanged */
export function israeliShva(w) {
  const L = letters(w); if (L.length < 3) return w;
  const first = L[0];
  if ('בכלמודאהעחיר'.includes(first.ch) || !first.all.includes(SHVA) || NO_DROP.has(keyNoDagesh(w))) return w;
  if (/[\u05B1-\u05BB\u05C7]/.test(first.all)) return w;
  const ipa = textToIPA(w, { data: STRESS });
  if (/\s/.test(ipa) || !safeDropInitial(ipa)) return w;
  const cand = first.ch + first.all.replace(SHVA, '') + L.slice(1).map(l => l.ch + l.all).join('');
  const want = ipa.replace(/^(ts|tʃ|dʒ|[^aeiouˈ])e/, '$1');
  return textToIPA(cand, { data: STRESS }) === want ? cand : w;
}
/** israeli.py rule 2: a word-initial ב/כ/פ is a stop in Israeli reading – add the dagesh the Gemara's context dropped */
export function initialStop(w) {
  const L = letters(w);
  if (!L.length || !'בכפ'.includes(L[0].ch) || L[0].all.includes(DAGESH) || !/[\u05B0-\u05BB\u05C7]/.test(L[0].all)) return w;
  return (L[0].ch + L[0].all + DAGESH).normalize('NFC') + L.slice(1).map(l => l.ch + l.all).join('');
}
const CORR = new Map(Object.entries(CORRECTIONS.words).map(([k, v]) => [stressKey(k), v.map(([w, n]) => nuclei(letters(w)).length > 1 ? stampStress(w, n) : w).join(' ')]));

/** stress index (from the end) for a speech word: curated, exceptions, Dicta, lexicon; null = let g2p predict */
export function stressFor(w, opts) {
  let k = curatedProseStress(w);
  if (k === null && STRESS.exc[stressKey(w)] !== undefined) k = STRESS.exc[stressKey(w)];
  if (k === null) for (const o of opts) if (o && accK(o) !== null && keyNoDagesh(clean(o.w)) === keyNoDagesh(w) && nuclei(letters(clean(o.w))).length === nuclei(letters(w)).length) { k = accK(o); break; }
  if (k === null) { const [g, src] = predictStress(w, STRESS); if (src === 'lex') k = g; }
  return k;
}
/** One speech word. src: the displayed word; b: bold (Gemara); gem: Davidson vocalized word or null;
 *  rab / mod: Dicta tokens (rabbinic / modern). stats: counters. */
export function sayWord(src, { b, gem, rab, mod }, stats = {}) {
  const inc = k => { stats[k] = (stats[k] || 0) + 1; };
  if (/['"׳״]/.test(src)) { inc('abbr'); return src; }   // abbreviations / numerals: tts-prep expands them
  const s = sk(src), hit = t => { const o = chosen(t); return o && sk(clean(o.w)) === s ? clean(o.w) : null; };
  let w = null;
  if (b && gem && sk(gem) === s) { w = gem.replace(/[\u0591-\u05AF\u05BD]/g, ''); inc('gemara'); }
  if (!w) { const order = b ? [[rab, 'dictaRabbinic'], [mod, 'dictaModern']] : [[mod, 'dictaModern'], [rab, 'dictaRabbinic']]; for (const [t, n] of order) { w = hit(t); if (w) { inc(n); break; } } }
  if (!w) { inc('unvocalized'); return src; }
  const corr = CORR.get(stressKey(w));
  if (corr) { inc('correction'); return corr; }
  let k = stressFor(w, b ? [chosen(rab), chosen(mod)] : [chosen(mod), chosen(rab)]);
  const dropped = israeliShva(w); if (dropped !== w) inc('shva');
  const stop = initialStop(dropped); if (stop !== dropped) inc('initialStop');
  w = stop.replace(/\u05D9\u05B0\u05D9(?=[\u05D0-\u05EA])/g, '\u05D9\u05B0');   // Dicta's ktiv male יְי (בָּרַיְיתָא, הַיְינוּ): one y
  if (k !== null && nuclei(letters(w)).length > 1) { const m = stampStress(w, k); if (m.includes(HATAMA)) inc('stress'); return m; }
  return w;
}
/** Steinsaltz segment → speech text. gemWords: Davidson vocalized words of the same segment; next(): Dicta cursors. */
export function composeSay(runs, gemWords, nextRab, nextMod, stats = {}) {
  const gsk = gemWords.map(sk); let gp = 0;
  const findGem = w => { const s = sk(w); for (const j of [...Array.from({ length: Math.max(0, Math.min(gsk.length, gp + 12) - gp) }, (_, i) => gp + i), ...gsk.keys()]) if (gsk[j] === s) { gp = j + 1; return gemWords[j]; } return null; };
  // one text with a bold flag per character: a word is bold when its first letter is (prep.py) – Steinsaltz often bolds
  // only part of a word (ה<b>גשר</b>), and the word must stay whole for Dicta's alignment
  const text = runs.map(r => r.t).join(''), bold = runs.flatMap(r => [...r.t].map(() => r.b));
  const out = text.replace(WORD, (whole, at) => {
    // a closing quotation mark is not part of the word (an internal ״ / a final ׳ is an abbreviation – kept)
    const trail = /^[^"״]+["״]+$/.test(whole) ? whole.match(/["״]+$/)[0] : '', src = whole.slice(0, whole.length - trail.length);
    const b = bold[[...text.slice(0, at)].length];
    stats.words = (stats.words || 0) + 1;
    const rab = nextRab(src), mod = nextMod ? nextMod(src) : null;
    const gem = b ? findGem(src) : null;
    if (b) { stats.bold = (stats.bold || 0) + 1; if (gem) stats.boldMatched = (stats.boldMatched || 0) + 1; }
    return sayWord(src, { b, gem, rab, mod }, stats) + trail;
  });
  return out.replace(/\s+/g, ' ').replace(/\s+([.,:;?!])/g, '$1').trim();
}
/** Davidson vocalized Gemara segment → its words (for the bold match) */
export const gemaraWords = html => unescape(html.replace(/<[^>]+>/g, ' ')).replace(/[״"]/g, ' ').split(/[\s\u05BE]+/).map(w => w.replace(/[^\u05D0-\u05EA\u0591-\u05C7]/g, '')).filter(w => /[\u05D0-\u05EA]/.test(w));
// ---------------- 1.0.97: displayed niqqud for the explanations (Steinsaltz, Bartenura, Penei Moshe) ----------------
// The display HTML keeps every letter, tag and mark of the edition; each word only gains the niqqud the speech layer
// chose (bold = Gemara/Yerushalmi words: the vocalized edition's word, else Dicta). No speech marks (stress, dropped
// shva, added dagesh) – only the plain vocalization. A word without a confident consonant match stays as it is.
import { formatWord } from '../site/js/hayomyom-display.js';
const chosenW = t => { const o = t && (t.options.find(x => x.level === 1) || t.options[0]); return o ? clean(o.w) : null; };
const DISP_STRIP = /[\u0591-\u05AF\u05BD\u05C4\u05C5|]/g;
export function vocalizeHtml(html, gemWords, nextRab, nextMod) {
  if (!html) return html;
  const gsk = gemWords.map(sk); let gp = 0, bold = false, n = 0, hit = 0, inRef = false;
  html = html.replace(REFP, m => '\u0001' + m + '\u0002');   // verse references are not in the Dicta text: not vocalized
  const findGem = w => { const s = sk(w); for (let j = gp; j < Math.min(gsk.length, gp + 12); j++) if (gsk[j] === s) { gp = j + 1; return gemWords[j]; } for (let j = 0; j < gsk.length; j++) if (gsk[j] === s) { gp = j + 1; return gemWords[j]; } return null; };
  const ent = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const out = html.replace(/(?:<[^>]*>|[^\s<>])+/g, tok => {
    const pieces = tok.split(/(<[^>]*>)/g); let vis = '', firstBold = null;
    for (const p of pieces) { if (p.startsWith('<')) { if (/^<b\b/i.test(p)) bold = true; else if (/^<\/b>/i.test(p)) bold = false; continue; } if (p && firstBold === null && /[\u05D0-\u05EA]/.test(p)) firstBold = bold; vis += p; }
    const refAt = []; { let r = inRef; for (const ch of ent(vis)) { if (ch === '\u0001') r = true; else if (ch === '\u0002') r = false; refAt.push(r); } }
    const startRef = inRef; inRef = refAt.length ? refAt.at(-1) : inRef;
    tok = tok.replace(/[\u0001\u0002]/g, ''); 
    if (!/[\u05D0-\u05EA]/.test(vis) || /&(?!quot;|#39;|amp;)/.test(vis)) return tok;
    const evis = ent(vis), idxMap = []; [...evis].forEach((ch, i) => { if (ch !== '\u0001' && ch !== '\u0002') idxMap.push(i); });
    const plainVis = evis.replace(/[\u0001\u0002]/g, '');
    const v = plainVis.replace(WORD, (whole, at) => {
      if (refAt[idxMap[[...plainVis.slice(0, at)].length]] ?? startRef) return whole;
      const trail = /^[^"״]+["״]+$/.test(whole) ? whole.match(/["״]+$/)[0] : '', src = whole.slice(0, whole.length - trail.length);
      const rab = nextRab(src), mod = nextMod ? nextMod(src) : null; n++;
      if (/['"׳״]/.test(src) || /[\u05B0-\u05C7]/.test(src)) return whole;
      const s = sk(src), b = firstBold;
      let w = null;
      if (b) { const g = findGem(src); if (g && sk(g) === s) w = g.replace(DISP_STRIP, ''); }
      for (const t of b ? [rab, mod] : [mod, rab]) { if (w) break; const c = chosenW(t); if (c && sk(c) === s) w = c.replace(DISP_STRIP, ''); }
      if (!w) return whole;
      hit++; w = w.replace(/\u05D9\u05B0\u05D9(?=[\u05D0-\u05EA])/g, '\u05D9\u05B0');
      if ([...w.replace(/[\u0591-\u05C7]/g, '')].join('') !== src.replace(/[\u0591-\u05C7]/g, '')) return whole;   // never change a letter
      return w + trail;
    });
    if (v === plainVis) return tok;
    return formatWord(tok.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'), v).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  });
  vocalizeHtml.last = { n, hit };
  return out;
}
/** 1.0.98: speech text of an already vocalized text (Targum Onkelos, Rashi of the Metsudah Megillot): every word keeps
 *  its own niqqud and gets the same corrections, stress, Israeli shva and initial stops as the Gemara words. */
export function sayVocalized(html, stats = {}) {
  const text = speechRuns(html).map(r => r.t).join('');
  return text.replace(WORD, whole => {
    const trail = /^[^"״]+["״]+$/.test(whole) ? whole.match(/["״]+$/)[0] : '', src = whole.slice(0, whole.length - trail.length);
    if (!/[\u05B0-\u05BB\u05C7]/.test(src)) return whole;
    return sayWord(src, { b: true, gem: src }, stats) + trail;
  }).replace(/\s+/g, ' ').trim();
}
