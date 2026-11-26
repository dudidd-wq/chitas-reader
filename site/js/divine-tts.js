// Routing of the two TTS settings for the divine name, plus letter-stand-ins (ידוד, יקוק).
// Display is never changed here. The Tetragrammaton / יי / ה׳ rules stay in tts-prep.js (frozen by ENGINE-COV-1B).
import { skeleton, prepareForTTS } from './tts-prep.js';

export const DIVINE_NAME_MODES = ['hashem', 'adonai'];
/** Daily/library units whose main text is scripture or prayer (verses, Tehillim, siddur, Shnayim Mikra). */
export const SCRIPTURE_UNITS = new Set(['chumash', 'tehillim', 'siddur', 'shnayim', 'nachyomi']);
const isDivineMode = v => v === 'hashem' || v === 'adonai';
const PREFIXES = ['', 'ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'וב', 'ול', 'ומ', 'וכ', 'וש', 'וה', 'שב', 'של', 'שה', 'מה', 'כש', 'לה', 'בה', 'וכש', 'ושב', 'ומה'];
const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7'׳״"]*/g;

/** Resolve the pronunciation mode for one speech-part kind from the two settings (with legacy ttsDivine fallback). */
export function resolveDivineName(prefs, kind) {
  const v = kind === 'scripture' ? prefs?.ttsDivineScripture : prefs?.ttsDivineOral;
  if (isDivineMode(v)) return v;
  return isDivineMode(prefs?.ttsDivine) ? prefs.ttsDivine : 'hashem';
}

/**
 * Tag each speech part as 'scripture' or 'oral', in the same order ttsSegments builds `parts`:
 * the main/verse text (`repeat` times), then biurSay (Targum is scripture; other commentaries are oral),
 * then Rashi paragraphs, then the short biur.
 */
export function divinePartKinds(unit, { repeat = 1, biurSay = [], biurLabel = '', rashiCount = 0, shortBiur = false } = {}) {
  const kinds = [];
  const main = SCRIPTURE_UNITS.has(unit) ? 'scripture' : 'oral';
  for (let i = 0; i < Math.max(1, repeat || 1); i++) kinds.push(main);
  for (const x of biurSay || []) if (x) kinds.push((unit === 'shnayim' || biurLabel === 'תרגום') ? 'scripture' : 'oral');
  for (let i = 0; i < (rashiCount || 0); i++) kinds.push('oral');
  if (shortBiur) kinds.push('oral');
  return kinds;
}

export function divineNamesForParts(unit, partOpts, prefs) {
  return divinePartKinds(unit, partOpts).map(k => resolveDivineName(prefs, k));
}

function prefixWithMarks(word, n) {
  let i = 0, seen = 0;
  for (; i < word.length; i++) {
    if (/[\u05D0-\u05EA]/.test(word[i])) { if (seen === n) break; seen++; }
  }
  return word.slice(0, i);
}

/** Rewrite ידוד / יקוק (with prefixes) as יהוה so prepareForTTS applies the existing Name rule. */
export function applyDivineStandins(html) {
  const onText = (s, f) => String(s).split(/(<[^>]*>)/).map((p, i) => (i % 2 ? p : p.replace(WORD, f))).join('');
  return onText(html, w => {
    const sk = skeleton(w).replace(/״/g, '"').replace(/׳/g, "'");
    const letters = sk.replace(/["']/g, '');
    for (const stem of ['ידוד', 'יקוק']) {
      for (const p of PREFIXES) {
        if (letters === p + stem && !/["']/.test(sk)) return prefixWithMarks(w, p.length) + 'יהוה';
      }
    }
    return w;
  });
}

/** Speech preparation that also normalises ידוד / יקוק. Display must not use this. */
export function prepareSpeechForTTS(html, opt) {
  return prepareForTTS(applyDivineStandins(html), opt);
}
