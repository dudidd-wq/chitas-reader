// 1.0.112: Aramaic speech rules (build tools only; the display text is never changed). Port of the reviewed prototype
// /workspace/aramaic-eval (round 2, round 3 variant B, multi/fixed3): Gemara (Steinsaltz bold words), Yerushalmi words in the
// Penei Moshe, Targum Onkelos, and Aramaic words inside the Tanya / Torah Or / Likkutei Torah (Zohar quotes and the like).
// Rule groups (tools/data/aramaic-speech.json switches each one; only groups that passed the 9.5 review are on):
//   shva    – dagesh kal: a dagesh in בגדכפת after a vowel does not make the shva under it vocal (אִיתְּמַר itmar,
//             דְּמִתְּגַר demitgar), and no vocal shva after a mater yod/vav (מִילְּתָא milta). Written as g2p NACH marks.
//   lexicon – the prototype's hand stress lexicon (~95 forms, yeshiva-Israeli reading; Ashkenazi havara still moves milra to milel).
//   rules   – stress by suffix when nothing better is known: ־א / ־ֵי / ־ִינַן / ־ְהוּ milel (variant B), ־ֵיהּ milra.
//   lav     – לָאו is read lav (the alef is silent).
// The suffix ־ֵיהּ (-ej) and the end of the false divine-name match on לֵיהּ / בֵּיהּ are runtime rules (g2p.js, tts-prep.js).
// A word is treated as Aramaic only when its form occurs in the Aramaic corpus of the app (Davidson Gemara outside the
// Mishnah and quotations, Onkelos) and never in its Hebrew corpus (Torah, Tehillim, Nach, Mishnah, Rambam, Sefer HaMitzvot),
// and is not inside a quotation (״…״) or a Mishnah segment. Onkelos words are Aramaic by definition.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { letters, nuclei, stressKey, stressFromAccents, markShvaNa, HATAMA, VSHVA, NACH } from '../site/js/g2p.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const CONFIG = JSON.parse(fs.readFileSync(ROOT + 'tools/data/aramaic-speech.json', 'utf8'));
const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const sk = w => w.replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]);

// ---------------- stress lexicon (round 3, variant B) ----------------
const L_MILEL = 'הָכִי הֵיכִי הָכָא הֵיכָא אֶלָּא נָמֵי הֲוָה הָוֵי אַבָּיֵי מַהוּ מַשְׁמַע הָנֵי דָּמֵי גַּבֵּי בָּעֵי קָתָנֵי אָמְרִי מִנֵּהּ מִנַּהּ מִינַּהּ אָמְרַתְּ הַיְנוּ הַיְינוּ מִלֵּי פְּלִיגִי הָהוּא שָׁאנֵי עָסְקִינַן לְמֵימַר אִיהוּ אִינְהוּ לְהוּ אַהֲדָדֵי תָּנוּ אִינִישׁ אַטְעִינְהוּ גְּמָרָא'
  + ' אִכָּא אִיכָּא לֵיכָּא אִיתָא תָּנָא תַּנָּא תַּנְיָא טַעְמָא אֵימָא תֵּימָא לֵימָא רָבָא רַבָּה הוּנָא קַשְׁיָא עֲקִיבָא פָּפָּא רַחֲמָנָא חִסְדָּא חִיָּא חֲנִינָא בִּשְׁלָמָא סָלְקָא הַשְׁתָּא חֲדָא סֵיפָא רֵישָׁא פְּשִׁיטָא דִּלְמָא עָלְמָא מִלְּתָא מִילְּתָא אַחָא צְרִיכָא זִילָא';
const L_MILRA = 'אָמַר אֲמַר סָבַר רַבָּנַן הָתָם נַחְמָן קָאָמַר קְרָא אֲתָא תְּנַן אִתְּמַר אִיתְּמַר אַמַּאי עֲלֵיהּ עֲבִידְתֵּיהּ מִשּׁוּם רַבִּי יוֹחָנָן פּוֹעֲלִים מִדִּידֵיהּ תְּרֵי לָא';
// 1.0.112: Zohar / Chassidus Aramaic (Tanya, Torah Or) – penultimate stress as read in the yeshiva / Chabad (not in the
// Bavli / Onkelos corpus, so the prose pass reaches them through this list only; no rules, no shva change for them)
// round 2 (Codex review 1.0.112): learning-room penultimate forms the Dicta stamps had final
const L_MILEL2 = 'מִסְתַּבְּרָא אִיפְּכָא מֵיתִיבִי תְּיוּבְתָּא כַּלְבָּא אַדְּהָכִי מִכְּדִי אַדְּרַבָּה כּוּלָּא כֻּלָּא רַבְּתָא';
// round 3: antepenultimate (gi-MAT-ri-ya)
const L_ANTE = 'גִּימַטְרִיָּא גִימַטְרִיָּא';
const L_ZOHAR = 'מַלְכָּא אוֹרַיְיתָא לְעֵילָּא תַתָּא לִיבָּא לִבָּא אִתְעֲרוּתָא אִתְעָרוּתָא אִתְכַּפְיָא אִתְהַפְּכָא אִתְכַּסְיָא אִתְגַּלְיָא'
  + ' סִטְרָא יְמִינָא דְּרוֹעָא יִחוּדָא עוּמְקָא גֻּלְגַּלְתָּא גֻּלְגָּלְתָּא פַּרְסָא רָזָא נוּקְבָא אַסְפַּקְלַרְיָא'
  + ' חֲשׁוֹכָא שְׁלֵימוּתָא חוּשְׁבָּנָא מַטְרוֹנִיתָא מִצְחָא סַבָּא עָלְמָא אִיגְּרָא שְׁכִינְתָּא קוּדְשָׁא יְקָרָא מְהֵימְנָא רְעוּתָא';
export const ZOHAR_KEYS = new Set(L_ZOHAR.split(' ').map(w => stressKey(w).replace(/^([\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2]*)\u05BC/, '$1')));
const noDag = key => key.replace(/^([\u05D0-\u05EA][\u05B0-\u05BB\u05C1\u05C2]*)\u05BC/, '$1');
export const LEX = new Map();
for (const [ws, k] of [[L_MILEL, 1], [L_MILRA, 0], [L_ZOHAR, 1], [L_MILEL2, 1], [L_ANTE, 2]]) for (const w of ws.split(' ')) { const key = stressKey(w); LEX.set(key, k); if (!LEX.has(noDag(key))) LEX.set(noDag(key), k); }
const PFX = /^[ודהלבמכש][\u05B0-\u05BC\u05C1\u05C2]*/;
/** lexicon stress of a word, also after up to three one-letter prefixes (דְּ, וְ, וּדְ …) */
export function lexK(core) {
  let w = stressKey(core);
  for (let i = 0; i < 4; i++) {
    if (LEX.has(w)) return LEX.get(w);
    if (LEX.has(noDag(w))) return LEX.get(noDag(w));
    const m = PFX.exec(w); if (!m || nuclei(w.slice(m[0].length)).length < 1 || sk(w).length - 1 < 2) break;
    w = w.slice(m[0].length);
  }
  return null;
}
/** 1.0.112 gate: the lexicon entry of a word if its group is on – the Zohar list (group zohar) and the rest (group lexicon)
 *  were reviewed separately. blocked: a lexicon word whose group is off – the suffix rules never guess its stress instead. */
export function lexGate(core, G) {
  const k = lexK(core);
  if (k === null) return { k: null, blocked: false };
  let w = stressKey(core), z = false;
  for (let i = 0; i < 4; i++) { if (ZOHAR_KEYS.has(noDag(w))) { z = true; break; } const m = PFX.exec(w); if (!m) break; w = w.slice(m[0].length); }
  return (z ? G.zohar : G.lexicon) ? { k, blocked: false } : { k: null, blocked: true };
}
/** suffix rules (variant B); alef: apply the ־א rule */
export function ruleK(core, { alef = true } = {}) {
  const key = stressKey(core), n = nuclei(letters(key)).length;
  if (n < 2) return null;
  const L = letters(key), nu = nuclei(L), pen = L[nu[nu.length - 2].own];
  if (/[\u05B1-\u05B3]/.test(pen.diac) && !/\u05B5\u05BC?\u05D9?\u05D4\u05BC$/.test(key)) return null;   // never stress a hataf (רַעֲוָא)
  if (alef && /[\u05B8\u05B5]\u05BC?\u05D0$/.test(key)) return 1;      // ־ָא / ־ֵא: emphatic state, milel (yeshiva)
  if (/\u05B5\u05BC?\u05D9$/.test(key)) return 1;                       // ־ֵי
  if (/\u05B4\u05D9\u05E0\u05B7\u05DF$/.test(key.replace(/\u05BC/g, ''))) return 1;   // ־ִינַן
  if (/\u05B5\u05BC?\u05D9?\u05D4\u05BC$/.test(key)) return 0;          // ־ֵיהּ milra
  if (/[^\u05D4]\u05B0\u05D4\u05D5\u05BC$/.test(key)) return 1;          // ־ְהוּ (אִינְהוּ, לְהוּ)
  return null;
}
/** the word with NACH after every letter whose shva the general rule reads vocal but the Aramaic rule does not */
export function withNach(word) {
  const base = word.replace(new RegExp('\\' + NACH, 'g'), '');
  const A = markShvaNa(letters(base)), B = markShvaNa(letters(base), { aram: true });
  // not after the prefix שֶׁ or the article (שֶׁבְּשַׁבָּת, הַבְּ…, בַּכְּ…: the prefix's dagesh forte – Hebrew), the conservative side
  const prefixForte = i => i > 0 && A.slice(0, i - 1).every(x => /[ושהמכלבד]/.test(x.ch)) && (A[i - 1].ch === 'ש' && A[i - 1].diac.includes('\u05B6') || /[הבכל]/.test(A[i - 1].ch) && /[\u05B7\u05B8]/.test(A[i - 1].diac));
  // a Hebrew verb in ־וּ (הִילְּכוּ, Yerushalmi): keeps its vocal shva
  if (/[^\u05D4]\u05D5\u05BC$/.test(stressKey(base))) return word;
  const need = A.map((l, i) => l.all.includes(VSHVA) && !B[i].all.includes(VSHVA) && !prefixForte(i));
  if (!need.some(Boolean) || need.every((x, i) => !x || letters(word)[i].all.includes(NACH))) return word;
  return letters(word).map((l, i) => l.ch + l.all + (need[i] && !l.all.includes(NACH) ? NACH : '')).join('');
}
const stamp = (w, k) => { const L = letters(w.replace(/\u05AB/g, '')), n = nuclei(L); if (n.length < 2) return w; L[n[n.length - 1 - k].own].all += HATAMA; return L.map(l => l.ch + l.all).join(''); };
/** round 2: a penultimate-stressed word – the shva closing the stressed syllable is quiescent (מִ֫לְּ|תָא, אוֹרַ֫יְ|יתָא,
 *  אִתְהַ֫פְּ|כָא). null when another vocal shva would still stand between the stress and the last vowel (הִלְכְתָא):
 *  the stamp would not match the syllables the voice says. */
export function codaFix(w) {
  if (!w.includes(HATAMA)) return w;
  const L = letters(w), nu = nuclei(L); if (nu.length < 2 || stressFromAccents(w) !== 1) return w;
  const s = nu[nu.length - 2].own, f = nu[nu.length - 1].own;
  const M = markShvaNa(letters(w));
  let c = s + 1; while (c < f && !/[\u05B0-\u05BB\u05C7]/.test(L[c].all) && /[יואה]/.test(L[c].ch)) c++;   // past a vowel letter
  const add = c < f && M[c].all.includes(VSHVA) && !L[c].all.includes(NACH);
  for (let i = s + 1; i < f; i++) if (i !== c && M[i].all.includes(VSHVA)) return null;
  return add ? L.map((l, i) => l.ch + l.all + (i === c ? NACH : '')).join('') : w;
}
const ARAM_END = /[\u05B8\u05B5]\u05BC?\u05D0$|\u05B5\u05BC?\u05D9$|\u05B5\u05BC?\u05D9?\u05D4\u05BC$|\u05D9\u05E0\u05B7\u05DF$|\u05B0\u05D4\u05D5\u05BC$/;
// Audit B: repairs coupled to the experimental shva group, not the general
// lexicon. Suppressing a vowel must not retain the audit's wrong stress tag.
const SHVA_STRESS = new Map([
  ['אִיקְּלַע', 0], ['וְאִיקְּלַע', 0], ['אַדְּרַבָּה', 1], ['וְאַדְּרַבָּה', 1],
].map(([w, k]) => [stressKey(w), k]));
/** לָאו (also Mishnaic Hebrew: אִם לָאו) → לָו, read lav */
export const lav = w => /^(?:[ודבש][\u05B0-\u05BC\u05C1]*)?ל\u05B8או$/.test(stressKey(w)) ? w.replace(/א(?=[\u0591-\u05C7|]*ו[\u0591-\u05C7|]*$)/, '') : w;
/** one vocalized speech word (may carry an ole stress tag) → the Aramaic speech word. mode: gemara | prose | onkelos */
export function aramWord(word, mode = 'gemara', G = CONFIG.groups) {
  if (!/[\u05B0-\u05BB\u05C7]/.test(word) || /['"׳״]/.test(word)) return word;
  let w = word;
  if (G.lav) w = lav(w);
  if (G.shva && mode !== 'onkelos' && SHVA_STRESS.has(stressKey(w))) {
    const k = SHVA_STRESS.get(stressKey(w));
    if (stressFromAccents(w) !== k) w = stamp(w, k);
  }
  if (mode !== 'onkelos' && (G.lexicon || G.zohar || G.rules)) {
    const core = w.replace(/\u05AB/g, ''), n = nuclei(letters(core)).length, has = w.includes(HATAMA), lx = lexGate(core, G);
    let k = lx.k;
    if (k === null && !has && G.rules && !lx.blocked) k = ruleK(core);
    const fromLex = lx.k !== null;
    if (k !== null && n > 1) { const cur = has ? stressFromAccents(w) : null; if (cur !== k) w = stamp(w, k); }
    if (w.includes(HATAMA)) { const c = codaFix(w); if (c !== null) w = c; else if (!fromLex && !has) w = w.replace(/\u05AB/g, ''); }
  }
  // prose (Tanya, Torah Or): the shva rule only on words with an Aramaic ending or in the lexicon – Hebrew piel forms such as
  // מְקַבְּלִים keep their vocal shva there
  const shvaCandidate = mode !== 'prose' || SHVA_STRESS.has(stressKey(w)) || ARAM_END.test(stressKey(w)) || lexK(w.replace(/\u05AB/g, '')) !== null;
  if (G.shva && shvaCandidate) w = withNach(w);
  // round 3: מִן assimilated before a non-בגדכפת letter (מִשְּׁמֵיהּ mish-MEIH): the doubled letter's shva is quiescent in Aramaic
  if (G.shva && shvaCandidate && mode !== 'onkelos') { const L = letters(w), i = L.findIndex(l => !/^[וד]$/.test(l.ch) || !/^[\u05B0\u05BC\u05B4]*$/.test(l.diac.replace(/\u05BC/g, '')));
    if (i >= 0 && L[i].ch === 'מ' && /\u05B4/.test(L[i].diac) && L[i + 1] && /\u05BC/.test(L[i + 1].diac) && /\u05B0/.test(L[i + 1].diac) && !/[בגדכפת]/.test(L[i + 1].ch) && L[i + 2] && !L[i + 1].all.includes(NACH))
      w = L.map((l, j) => l.ch + l.all + (j === i + 1 ? NACH : '')).join(''); }
  return w;
}

// ---------------- the corpus forms (Hebrew / Aramaic) ----------------
// 1.0.112: the compiled speech drops an initial shva (צְרִיכָא → צרִיכָא, israeliShva) – the key ignores it
const formKey = w => noDag(stressKey(w.replace(/[\u0591-\u05AF|]/g, ''))).replace(/^([\u05D0-\u05EA][\u05BC\u05C1\u05C2]*)\u05B0/, '$1');
let FORMS = null;
const walk = (x, f) => { if (typeof x === 'string') f(x); else if (Array.isArray(x)) x.forEach(y => walk(y, f)); else if (x && typeof x === 'object') Object.values(x).forEach(y => walk(y, f)); };
const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF-\u05C7|]*/g;   // round 3: maqaf splits words
const filesOf = d => fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).filter(f => f.endsWith('.json')).map(f => d + '/' + f) : [];
export function corpusForms() {
  if (FORMS) return FORMS;
  const D = ROOT + 'site/data/', HEB = new Set(), ARAM = new Set();
  const addAll = (set, s) => { for (const m of s.replace(/<[^>]+>/g, ' ').matchAll(WORD)) if (/[\u05B0-\u05BB\u05C7]/.test(m[0])) set.add(formKey(m[0])); };
  // Hebrew: the verses of Torah, Tehillim and Nach (not Daniel / Ezra, which have Aramaic chapters), the Mishnah, the
  // Rambam's text – never a commentary (Rashi, Metsudot, Bartenura and Sefer HaMitzvot quote Aramaic)
  for (const [d, k] of [['torah', 'v'], ['tehillim', 'v'], ['nach', 'v'], ['gemara/mishna', 'm'], ['rambam', 's']])
    for (const f of filesOf(D + d)) if (!/\/(Daniel|Ezra)\//.test(f)) walk(JSON.parse(fs.readFileSync(f))[k], s => addAll(HEB, s));
  for (const f of filesOf(D + 'onkelos')) walk(JSON.parse(fs.readFileSync(f)).t, s => addAll(ARAM, s));
  for (const tr of fs.readdirSync(D + 'gemara/bavli')) {
    let mishnah = false;
    for (const a of amudOrder(fs.readdirSync(D + 'gemara/bavli/' + tr))) {
      const j = JSON.parse(fs.readFileSync(`${D}gemara/bavli/${tr}/${a}`));
      if (j.yer) continue;
      for (const [g] of j.segs) { mishnah = segMishnah(g, mishnah); if (!mishnah) for (const t of aramWords(g, false)) ARAM.add(formKey(t)); }
    }
  }
  for (const k of HEB) ARAM.delete(k);
  return (FORMS = { HEB, ARAM });
}
export const amudOrder = fs_ => fs_.filter(f => /^\d+[ab]\.json$/.test(f)).sort((x, y) => parseInt(x) - parseInt(y) || x.localeCompare(y));
/** Davidson segment: does the Mishnah run through it? (מַתְנִי׳ opens, גְּמָ׳ closes; state carried from the previous segment) */
export function segMishnah(html, prev) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/[\u0591-\u05C7]/g, '').replace(/״/g, '"').replace(/׳/g, "'");
  const mi = t.search(/(^|\s)מתני'/), gi = t.search(/(^|\s)גמ'/);
  if (mi >= 0 && (gi < 0 || mi > gi)) return true;
  if (gi >= 0) return false;
  return prev;
}
/** the words of a text outside quotations (״…״ / "…"); with all=true every word with its quote flag */
export function aramWords(text, all) {
  const out = []; let q = false;
  const t = text.replace(/<[^>]+>/g, ' ');
  const re = /["״“”]|[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF-\u05C7|'׳]*(?:["״][\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF-\u05C7|]*)?/g;
  for (const m of t.matchAll(re)) { if (/^["״“”]$/.test(m[0])) { q = !q; continue; } if (all) out.push([m[0], q]); else if (!q) out.push(m[0]); }
  return out;
}
// round 2: Hebrew in Chassidus prose that the Aramaic corpus also has (אַהֲבָה רַבָּה, לְגַבֵּי, דּוּגְמָא …) – never changed there
const PROSE_SKIP = /^(?:[ובדהלמש]{0,3})(?:רבה|גבי|חשיבי|תקרי|דוגמא|דוגמת|גמרי)$/;
const proseSkip = w => PROSE_SKIP.test(sk(w));
// a word whose result is only a canonical re-ordering of its marks (vowel before dagesh) is kept byte for byte
const same = (w, tok) => w.normalize('NFD') === tok.normalize('NFD') ? tok : w;
/** speech text → the same text with the Aramaic rules on its Aramaic words. opt.mishnah: the whole segment is Hebrew. */
export function aramSayText(say, mode = 'gemara', { mishnah = false, source = mode === 'onkelos' ? 'onkelos' : null, groups = (source && CONFIG.sources?.[source]) || CONFIG.groups, stats = null } = {}) {
  if (!say || mishnah) return say;
  const { ARAM } = corpusForms();
  let q = false;
  return say.replace(/["״“”]|[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF-\u05C7|'׳]*(?:["״][\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF-\u05C7|]*)?/g, tok => {
    if (/^["״“”]$/.test(tok)) { q = !q; return tok; }
    if (q && mode === 'gemara') return tok;   // Gemara: a quotation is a verse / Mishnah. Prose: also Zohar quotations (ARAM ∖ HEB still decides)
    if (mode !== 'onkelos' && !ARAM.has(formKey(tok))) {
      if (groups.shva && SHVA_STRESS.has(stressKey(tok))) {
        const w = same(aramWord(tok, mode, { shva: true }), tok);
        if (w !== tok && stats) stats.changed = (stats.changed || 0) + 1;
        return w;
      }
      let w = groups.lav && !/['"׳״]/.test(tok) ? lav(tok) : tok;
      if (!/['"׳״]/.test(w) && lexGate(w.replace(/\u05AB/g, ''), groups).k !== null && !(mode === 'prose' && proseSkip(w))) w = same(aramWord(w, mode, { lexicon: groups.lexicon, zohar: groups.zohar }), w); if (w !== tok && stats) stats.changed = (stats.changed || 0) + 1; return w; }
    const w = mode === 'prose' && proseSkip(tok) ? tok : same(aramWord(tok, mode, groups), tok);
    if (w !== tok && stats) stats.changed = (stats.changed || 0) + 1;
    return w;
  });
}
