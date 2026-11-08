// Speech build only. Corpus-reviewed Rashi usage, not a global rule for ambiguous ע"ז.
// Outside source citations it means avodah zarah, not the numeral 77; בלע"ז is a different word.
const forms = {
  '': 'עֲבוֹדָ֫ה זָרָ֫ה', ו: 'וַעֲבוֹדָ֫ה זָרָ֫ה', ב: 'בַּעֲבוֹדָ֫ה זָרָ֫ה',
  ל: 'לַעֲבוֹדָ֫ה זָרָ֫ה', מ: 'מֵעֲבוֹדָ֫ה זָרָ֫ה',
};
export function expandRashiContext(text, onExpansion = () => {}) {
  let depth = 0;
  return text.split(/([()])/).map(part => {
    if (part === '(') { depth++; return part; }
    if (part === ')') { depth = Math.max(0, depth - 1); return part; }
    if (depth) return part;
    return part.replace(/[א-ת][א-ת\u0591-\u05C7"'״׳]*/g, w => {
      const bare = w.replace(/[\u0591-\u05C7]/g, ''), m = /^([ובלמ]?)ע["״]ז$/.exec(bare);
      if (!m) return w;
      onExpansion(); return forms[m[1]];
    });
  }).join('');
}

/** Exact consonant alignment, allowing Nakdan to split a prefixed word (ו + דרך).
 *  Such a word gets NO fabricated morphology: only the later, unchanged words retain their options.
 *  Any other drift fails the whole batch closed. */
export function alignRashiTokens(expected, tokens) {
  let at = 0, splits = 0; const aligned = [];
  const sk = s => s.replace(/[^א-ת]/g, '');
  for (const word of expected) {
    const first = at; let joined = '';
    while (at < tokens.length && joined.length < word.length) {
      joined += sk(tokens[at++].word);
      if (!word.startsWith(joined)) return null;
    }
    if (joined !== word) return null;
    if (at === first + 1) aligned.push(tokens[first]);
    else { aligned.push({ word, confident: false, options: [] }); splits++; }
  }
  return at === tokens.length ? { tokens: aligned, splits } : null;
}
