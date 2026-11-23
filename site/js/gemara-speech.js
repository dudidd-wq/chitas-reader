// Pure helper for primary block speech routing (opt-in vocalized Gemara vs default biur,
// and the opt-in "biur only" setting that never falls back to the Aramaic Gemara).
export const VOCALIZED_GEMARA_BIUR_LABELS = ['ביאור', 'פני משה'];

export function isVocalizedGemaraBlock(block) {
  return Boolean(block && block.src === 'gemara' && VOCALIZED_GEMARA_BIUR_LABELS.includes(block.biurLabel));
}

export function speechTextForBlock(block, prefs = {}, opts = {}) {
  if (!block) return '';
  const biurOnly = prefs?.ttsGemaraBiurOnly === true && isVocalizedGemaraBlock(block);
  // "Biur only" wins over "vocalized Gemara": never return the Aramaic Gemara text.
  if (!biurOnly && prefs?.ttsVocalizedGemara === true && isVocalizedGemaraBlock(block)) {
    return block.text || block.say || '';
  }
  const nps1Fn = typeof opts === 'function' ? opts : opts?.nps1Speech;
  if (block.say) {
    return typeof nps1Fn === 'function'
      ? nps1Fn(block.say, block.nps1, { havara: prefs?.ttsHavara, corpus: block.nps1Corpus })
      : block.say;
  }
  if (opts && typeof opts === 'object' && 'fallback' in opts) {
    return typeof opts.fallback === 'function' ? opts.fallback() : (opts.fallback ?? '');
  }
  return biurOnly ? '' : (block.text || '');
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
