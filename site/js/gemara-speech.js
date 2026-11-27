// Pure helper for primary block speech routing (opt-in vocalized Gemara vs default biur,
// and the opt-in "biur only" setting that never falls back to the Aramaic Gemara).
import { aramSayText, ensureAramForms, plainSpeechText, segMishnah } from './aram-speech.js';
export { ensureAramForms };
/** Speech-only metadata on a built document. Display text is not changed.
 *  Mishnah state is carried across Bavli amudim in the same block list (Daf Yomi a → b).
 *  Called from app.js after the doc is built, so site/js/texts.js stays pin-identical. */
export function tagGemaraBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  let mi = false;
  for (const b of blocks) {
    if (!b || b.src !== 'gemara') continue;
    if (b.biurLabel === 'ברטנורא') continue;
    if (b.biurLabel === 'ביאור') {
      mi = segMishnah(b.text || '', mi);
      b.aramSource = 'bavli';
      b.mishnah = mi;
      continue;
    }
    if (b.biurLabel === 'פני משה' || (!b.biurLabel && b.text)) b.aramSource = 'yerushalmi';
  }
  return blocks;
}

export const VOCALIZED_GEMARA_BIUR_LABELS = ['ביאור', 'פני משה'];

/** Speech string for the vocalized-Gemara path: approved source groups only; display text is not modified. */
export function vocalizedGemaraSpeech(block) {
  if (!block?.text) return block?.say || '';
  const source = block.aramSource
    || (block.biurLabel === 'פני משה' ? 'yerushalmi'
      : block.biurLabel === 'ביאור' ? 'bavli'
      : 'yerushalmi');
  const plain = plainSpeechText(block.text);
  return aramSayText(plain, 'gemara', { source, mishnah: block.mishnah === true });
}

export function isVocalizedGemaraBlock(block) {
  if (!block || block.src !== 'gemara') return false;
  if (block.biurLabel === 'ברטנורא') return false;
  if (VOCALIZED_GEMARA_BIUR_LABELS.includes(block.biurLabel)) return true;
  // Yerushalmi / Shekalim / Bavli body with no commentary still has a vocalized Gemara text to read.
  if (block.aramSource === 'yerushalmi' || block.aramSource === 'bavli') return true;
  return !block.biurLabel && !!block.text;
}

export function speechTextForBlock(block, prefs = {}, opts = {}) {
  if (!block) return '';
  const biurOnly = prefs?.ttsGemaraBiurOnly === true && isVocalizedGemaraBlock(block);
  // "Biur only" wins over "vocalized Gemara": never return the Aramaic Gemara text.
  if (!biurOnly && prefs?.ttsVocalizedGemara === true && isVocalizedGemaraBlock(block)) {
    return vocalizedGemaraSpeech(block);
  }
  const nps1Fn = typeof opts === 'function' ? opts : opts?.nps1Speech;
  if (block.say) {
    return typeof nps1Fn === 'function'
      ? nps1Fn(block.say, block.nps1, { havara: prefs?.ttsHavara, corpus: block.nps1Corpus })
      : block.say;
  }
  if (biurOnly) return '';
  // No baked say: the spoken string is the Gemara body (Yerushalmi / Shekalim without commentary).
  // Must run before opts.fallback: app.js ttsSegments passes fallback: ''.
  if (block.text && (block.aramSource === 'yerushalmi' || block.aramSource === 'bavli' || isVocalizedGemaraBlock(block))) {
    return vocalizedGemaraSpeech(block);
  }
  if (opts && typeof opts === 'object' && 'fallback' in opts) {
    return typeof opts.fallback === 'function' ? opts.fallback() : (opts.fallback ?? '');
  }
  return block.text || '';
}

/** Primary spoken text for one reader segment.
 *  When ttsGemaraBiurOnly is on, Bavli/Yerushalmi segments with no explanation are skipped
 *  (empty parts, no fallback to the displayed Aramaic Gemara). Other books are unchanged. */
export function primaryPartForSegment(block, prefs = {}, opts = {}) {
  const displayedFallback = opts.displayedFallback ?? '';
  if (prefs?.ttsGemaraBiurOnly === true && isVocalizedGemaraBlock(block)) {
    const text = speechTextForBlock(block, { ...prefs, ttsVocalizedGemara: false }, { ...opts, fallback: '' });
    if (!String(text || '').trim()) return { text: '', skip: true };
    return { text, skip: false };
  }
  const text = speechTextForBlock(block, prefs, opts);
  if (text) return { text, skip: false };
  return { text: displayedFallback, skip: false };
}
