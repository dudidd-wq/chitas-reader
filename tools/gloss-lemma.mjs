// Round 5: a few Wiktionary headwords carry broken marks (the reviewer saw "מַעֲשֶֹה" and "רׂאִי"):
//  - an old encoding that writes the sin dot as a HOLAM on ש next to another vowel (שֶֹ, שָֹ, שִֹּ) → the real sin dot;
//  - a shin/sin dot on a letter that is not ש (רׂאִי) → that one headword is given in the form of its verse (רֳאִי,
//    Genesis 16:13); any other such dot is dropped.
// Only the displayed lemma changes; the source link keeps the page's own anchor.
const FIX = { 'רׂאִי': 'רֳאִי' };
export function cleanLemma(l) {
  if (FIX[l]) return FIX[l];
  return l.replace(/([\u05D0-\u05EA])([\u0591-\u05C7]*)/g, (all, L, mk) => {
    if (L === 'ש' && mk.includes('\u05B9') && /[\u05B0-\u05B8\u05BB]/.test(mk) && !/[\u05C1\u05C2]/.test(mk)) mk = mk.replace('\u05B9', '\u05C2');
    if (L !== 'ש') mk = mk.replace(/[\u05C1\u05C2]/g, '');
    return L + mk;
  });
}
/** true when a lemma still has a mark that cannot be right (used by the tests). */
export function badLemma(l) {
  return [...l.matchAll(/([\u05D0-\u05EA])([\u0591-\u05C7]*)/g)].some(([, L, mk]) =>
    (L !== 'ש' && /[\u05C1\u05C2]/.test(mk)) || (mk.includes('\u05B9') && /[\u05B0-\u05B8\u05BB]/.test(mk) && !(L === 'ו')));
}
