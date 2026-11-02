// Round 6: repair vowel marks that the source editions encode in ways no Hebrew word can have. Pure functions, used
// by the reader (fixNiqqud) and by the read-aloud preparation (niqqudForTTS). Only corrections with a single possible
// reading are made on screen:
//   dup   – the same mark twice on one letter (לֹֹא, וּּבֵיאוּ) → once
//   sin   – ש with a vowel and a holam but no shin/sin dot (יִשְֹרָאֵל, עֲשֵֹה): the "holam" is a misplaced sin dot.
//           Only when the holam cannot belong to the letter before (that letter has its own vowel, or ש starts the word).
//   holam – a letter (not ש) with a holam *and* another vowel, whose previous letter has no vowel (הַלּוֶֹה = ha-lo-veh,
//           הוֶֹה = ho-veh): the holam is the previous letter's, drawn one letter late. It is moved there; same reading.
// Anything else with two vowels on one letter (נִתְִהַוּוּ, שְׁבְָחוֹ) has more than one possible repair, so the screen
// keeps the source as it is and the read-aloud drops that one word's niqqud (the voice reads it unvocalised, as it reads
// most Hebrew) rather than guess.
const VOW = '\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05C7';
const HOLAM = '\u05B9', SIN = '\u05C2', SHIN = '\u05C1';
const isVow = c => VOW.includes(c);
const RE_WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7]*/g;
const clusters = w => w.match(/[\u05D0-\u05EA][\u0591-\u05C7]*/g) || [];
const vowels = c => [...c.slice(1)].filter(isVow);
// a letter that is already pronounced with a vowel: its own vowel mark, or a shuruq (וּ with no other vowel)
const voiced = c => vowels(c).length > 0 || (c[0] === 'ו' && c.includes('\u05BC'));

/** Repairs one word; returns [word, kinds[]] (kinds: 'dup', 'sin', 'holam'). */
export function fixWord(w) {
  const kinds = [];
  let cs = clusters(w).map(c => {
    const seen = new Set(); let out = c[0];
    for (const m of c.slice(1)) { if (seen.has(m)) { kinds.push('dup'); continue; } seen.add(m); out += m; }
    return out;
  });
  cs = cs.map((c, i) => {
    if (c[0] !== 'ש' || !c.includes(HOLAM) || c.includes(SHIN) || c.includes(SIN)) return c;
    if (!vowels(c).some(v => v !== HOLAM)) return c;
    if (i > 0 && !voiced(cs[i - 1])) return c;
    kinds.push('sin'); return c.replace(HOLAM, SIN);
  });
  for (let i = 1; i < cs.length; i++) {
    const v = vowels(cs[i]);
    // not on ש (משֶֹׁה could be מֹשֶׁה, but the Rambam's עשֶֹׁה / בּשֶֹׁם are עֹשֶׂה / בֹּשֶׂם – shin or sin is not decidable),
    // and not with a hataf (בְּרִיפוֱֹת: the hataf is the error, not the holam's place)
    if (cs[i][0] !== 'ש' && v.includes(HOLAM) && v.length === 2 && !v.some(x => '\u05B1\u05B2\u05B3'.includes(x)) && !voiced(cs[i - 1])) {
      cs[i] = cs[i].replace(HOLAM, ''); cs[i - 1] += HOLAM; kinds.push('holam');
    }
  }
  return [cs.join(''), kinds];
}
/** True if some letter of the word still carries two vowels (other than the allowed cases above). */
export function impossible(w) { return clusters(w).some(c => vowels(c).length > 1); }

/** Display: fix the unambiguous cases in text (HTML tags are left alone; each text run is handled on its own). */
export function fixNiqqud(html) {
  return String(html).replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(RE_WORD, w => fixWord(w)[0]));
}
/** Read-aloud: as fixNiqqud, then a word that is still impossible is passed on without its niqqud. */
export function niqqudForTTS(text) {
  return String(text).replace(RE_WORD, w => { const f = fixWord(w)[0]; return impossible(f) ? f.replace(/[\u0591-\u05C7]/g, '') : f; });
}
