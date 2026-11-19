// Pure helper for primary block speech routing (opt-in vocalized Gemara vs default biur).
export const VOCALIZED_GEMARA_BIUR_LABELS = ['ביאור', 'פני משה'];

export function isVocalizedGemaraBlock(block) {
  return Boolean(block && block.src === 'gemara' && VOCALIZED_GEMARA_BIUR_LABELS.includes(block.biurLabel));
}

export function speechTextForBlock(block, prefs = {}, opts = {}) {
  if (!block) return '';
  if (prefs?.ttsVocalizedGemara === true && isVocalizedGemaraBlock(block)) {
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
  return block.text || '';
}
