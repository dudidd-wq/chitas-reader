// Text preprocessing for browser speech synthesis (Web Speech API, he-IL).
// Pure functions – unit-tested in tests/tts-prep.test.mjs. Rules are documented in NOTES.md.

export const RE_TAAMIM = /[\u0591-\u05AF\u05BD\u05C4\u05C5]/g; // cantillation, meteg, upper/lower dots
export const RE_NIQQUD = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g;
const RE_MARKS = /[\u0591-\u05C7]/g;
export const skeleton = w => w.replace(RE_MARKS, '').replace(/[^\u05D0-\u05EA"'״׳]/g, '');

// Common abbreviations in Rashi / Tanya / Rambam (consonantal form, quotes normalised to ").
// Only unambiguous ones are expanded; ambiguous ones (e.g. ע"ה, ע"ז, כ"א) are left as is.
export const ABBREVIATIONS = {
  'הקב"ה': 'הַקָּדוֹשׁ בָּרוּךְ הוּא', 'ב"ה': 'בָּרוּךְ הוּא', 'ית\'': 'יִתְבָּרֵךְ', 'יתב\'': 'יִתְבָּרֵךְ',
  'ז"ל': 'זִכְרוֹנוֹ לִבְרָכָה', 'רז"ל': 'רַבּוֹתֵינוּ זִכְרוֹנָם לִבְרָכָה', 'חז"ל': 'חֲכָמֵינוּ זִכְרוֹנָם לִבְרָכָה',
  'וכו\'': 'וְכוּלֵּי', 'כו\'': 'כּוּלֵּי', 'וגו\'': 'וְגוֹמֵר', 'א"כ': 'אִם כֵּן', 'וא"כ': 'וְאִם כֵּן', 'א"א': 'אִי אֶפְשָׁר',
  'כ"ש': 'כָּל שֶׁכֵּן', 'וכ"ש': 'וְכָל שֶׁכֵּן', 'ר"ל': 'רוֹצֶה לוֹמַר', 'ע"י': 'עַל יְדֵי', 'ע"פ': 'עַל פִּי', 'ע"ד': 'עַל דֶּרֶךְ',
  'ז"א': 'זֹאת אוֹמֶרֶת', 'ח"ו': 'חַס וְשָׁלוֹם', 'ד"ה': 'דִּבּוּר הַמַּתְחִיל', 'וכיו"ב': 'וְכַיּוֹצֵא בָּזֶה',
  'שנא\'': 'שֶׁנֶּאֱמַר', 'ונא\'': 'וְנֶאֱמַר', 'הנ"ל': 'הַנִּזְכָּר לְעֵיל', 'כנ"ל': 'כַּנִּזְכָּר לְעֵיל', 'עכ"ל': 'עַד כָּאן לְשׁוֹנוֹ',
  'א"י': 'אֶרֶץ יִשְׂרָאֵל', 'בהמ"ק': 'בֵּית הַמִּקְדָּשׁ', 'ב"ד': 'בֵּית דִּין', 'בי"ד': 'בֵּית דִּין', 'ס"ת': 'סֵפֶר תּוֹרָה',
  'ש"ץ': 'שְׁלִיחַ צִבּוּר', 'ע"ש': 'עַיֵּין שָׁם', 'כמ"ש': 'כְּמוֹ שֶׁכָּתוּב', 'וכמ"ש': 'וּכְמוֹ שֶׁכָּתוּב', 'מ"מ': 'מִכָּל מָקוֹם',
  'אעפ"כ': 'אַף עַל פִּי כֵן', 'אע"פ': 'אַף עַל פִּי', 'אא"כ': 'אֶלָּא אִם כֵּן', 'ג"כ': 'גַּם כֵּן', 'אח"כ': 'אַחַר כָּךְ',
  'א"ס': 'אֵין סוֹף', 'אוא"ס': 'אוֹר אֵין סוֹף', 'ס"א': 'סִטְרָא אָחֳרָא', 'סט"א': 'סִטְרָא אָחֳרָא', 'נה"ב': 'נֶפֶשׁ הַבַּהֲמִית',
  'נה"א': 'נֶפֶשׁ הָאֱלֹקִית', 'מ"ע': 'מִצְוַת עֲשֵׂה', 'מצ"ע': 'מִצְוַת עֲשֵׂה', 'ל"ת': 'לֹא תַעֲשֶׂה', 'מל"ת': 'מִצְוַת לֹא תַעֲשֶׂה',
  'יו"ט': 'יוֹם טוֹב', 'יוה"כ': 'יוֹם הַכִּפּוּרִים', 'ר"ה': 'רֹאשׁ הַשָּׁנָה', 'ר"ח': 'רֹאשׁ חֹדֶשׁ', 'ת"ח': 'תַּלְמִיד חָכָם',
  'ת"ת': 'תַּלְמוּד תּוֹרָה', 'עוה"ז': 'עוֹלָם הַזֶּה', 'עוה"ב': 'עוֹלָם הַבָּא', 'ק"ש': 'קְרִיאַת שְׁמַע', 'בעה"ז': 'בָּעוֹלָם הַזֶּה',
  'וק"ל': 'וְקַל לְהָבִין', 'כנודע': 'כַּנּוֹדָע', 'אדה"ר': 'אָדָם הָרִאשׁוֹן', 'ב"ה': 'בָּרוּךְ הוּא', 'ע"כ': 'עַל כֵּן',
  'פי\'': 'פֵּירוּשׁ', 'פירש"י': 'פֵּירֵשׁ רַשִׁ"י', 'רש"י': 'רַשִׁ"י', 'ר\'': 'רַבִּי', 'ת"ר': 'תָּנוּ רַבָּנָן', 'א"ר': 'אָמַר רַבִּי',
  'ה\'': 'הַשֵּׁם', 'הוי\'': 'הֲוָיָ"ה', 'הוי"ה': 'הֲוָיָ"ה', 'אד\'': 'אדנות', 'הש"י': 'הַשֵּׁם יִתְבָּרֵךְ', 'השי"ת': 'הַשֵּׁם יִתְבָּרֵךְ',
  // round 4: common in Rashi / Rambam, one reading only
  'ת"ל': 'תַּלְמוּד לוֹמַר', 'ד"א': 'דָּבָר אַחֵר', 'ק"ו': 'קַל וָחוֹמֶר', 'מק"ו': 'מִקַּל וָחוֹמֶר', 'י"ל': 'יֵשׁ לוֹמַר', 'וי"ל': 'וְיֵשׁ לוֹמַר', 'ז"ש': 'זֶהוּ שֶׁכָּתוּב',
  'מנ"ל': 'מְנָא לַן', 'אא"א': 'אִי אֶפְשָׁר', 'וגומר': 'וְגוֹמֵר', 'גו\'': 'גוֹמֵר','כמש"נ': 'כְּמוֹ שֶׁנֶּאֱמַר', 'ת"ש': 'תָּא שְׁמַע', 'דא"א': 'דְּאִי אֶפְשָׁר', 'א"נ': 'אִי נַמִּי', 'בע"כ': 'בְּעַל כָּרְחוֹ', 'עכ"פ': 'עַל כָּל פָּנִים', 'אפ"ה': 'אַפִּילּוּ הָכִי', 'ממ"נ': 'מִמָּה נַפְשָׁךְ', 'וכה"ג': 'וְכַהַאי גַּוְונָא', 'כה"ג': 'כַּהַאי גַּוְונָא',
};
const ABBR = new Map(Object.entries(ABBREVIATIONS).map(([k, v]) => [k.replace(/[״]/g, '"').replace(/[׳]/g, "'"), v]));
const PREFIXES = ['', 'ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'וב', 'ול', 'ומ', 'וכ', 'וש', 'וה', 'שב', 'של', 'שה', 'מה', 'כש', 'לה', 'בה', 'וכש', 'ושב', 'ומה'];

// Divine names. Rules (documented in NOTES.md):
//  * the Tetragrammaton is read "השם" (default) or "אֲדֹנָי" (setting);
//  * in "השם" mode the other holy names are read in the customary substituted form, keeping all vowels:
//    אלהים-forms and אֱלוֹהַּ: ה→ק (אֱלֹקִים, אֱלוֹקַּ); יָהּ → קָהּ; the noun אֵל (vocalised with tsere) → קֵל.
//    In "אֲדֹנָי" mode they are read as written.
//  * no substitution where the word does not refer to God: before אחרים/אחר/נכר/מסכה/כסף/זהב/העמים/הגוים/מצרים…
//    (CHOL_NEXT), and in the verse-specific list of chol.js (idols, judges – per Soferim 4, Rambam Yesodei HaTorah 6:9).
const RE_ELOKIM = /^(ו|ה|ב|ל|מ|כ|ש|וב|ול|ומ|וכ|וש|וה|לא|כא|בא|מא|וא)?(אלהים|אלהי|אלהיך|אלהינו|אלהיכם|אלהיהם|אלהיו|אלהיה|אלהיהן|אלהיכן|אלהיהו|אלוה|אלוהים|אלוהי)$/;
export const CHOL_NEXT = new Set(['אחרים', 'אחר', 'נכר', 'הנכר', 'מסכה', 'כסף', 'זהב', 'העמים', 'הגוים', 'הגויים', 'מצרים', 'זר', 'עמים', 'האמרי']);
const RE_EL = /^(ו|ה|ב|ל|כ|מ|וה|וב|ול|כה|לה|בה)?אל$/;
const RE_YAH = /^(ו|ב|כ|ל|וב)?יה$/;
const isElokimWord = w => { const sk = skeleton(w); return !/["']/.test(sk) && RE_ELOKIM.test(sk.replace(/["']/g, '')); };
const nextLetters = w => skeleton(w || '').replace(/["']/g, '').replace(/^ו/, '');

function swapLetter(word, n, from, to) {
  let seen = 0, out = '';
  for (const ch of word) {
    if (/[\u05D0-\u05EA]/.test(ch)) { out += (seen === n && ch === from) ? to : ch; seen++; } else out += ch;
  }
  return out;
}

function prefixWithMarks(word, n) {
  // return the first n letters of `word` with their marks
  let i = 0, seen = 0;
  for (; i < word.length; i++) {
    if (/[\u05D0-\u05EA]/.test(word[i])) { if (seen === n) break; seen++; }
  }
  return word.slice(0, i);
}

// round 4: the substitute is vocalised, so a prefix reads naturally (לַה' → לַהַשֵּׁם, not "לַהשם")
export const HASHEM = 'הַשֵּׁם';
// אֲדֹנָי as a holy name (qamats under the nun; אֲדֹנַי "my lords" has patah) is read אֲדוֹשֵׁם in "השם" mode
export const ADOSHEM = 'אֲדוֹשֵׁם';
const RE_ADONAI = /^(ו|ב|ל|מ|כ|וב|ול|ומ|וכ)?אדני$/;
const RE_YY = /^(ו|ב|ל|מ|כ|ש|וב|ול|ומ|וכ|וש|לפני|ולפני)?יי$/;
export function replaceWord(w, opt) {
  // a closing quotation mark (״ / ") after a whole word is punctuation, not gershayim; a geresh (ה׳, ר׳) is kept
  const core = w.replace(/^[^\u05D0-\u05EA]+|[^\u05D0-\u05EA\u0591-\u05C7'׳]+$/g, '');
  if (!core) return w;
  const lead = w.slice(0, w.indexOf(core)), trail = w.slice(w.indexOf(core) + core.length);
  const sk = skeleton(core).replace(/״/g, '"').replace(/׳/g, "'");
  const letters = sk.replace(/["']/g, '');
  // Tetragrammaton (with prefixes, incl. יְהוִה)
  for (const p of PREFIXES) {
    if (letters === p + 'יהוה' && !/["']/.test(sk)) {
      // vocalized with hiriq (יֱהֹוִה, after אֲדֹנָי) it is read as Elohim
      const elohim = /\u05B4/.test(core.slice(core.lastIndexOf('ו')));
      const name = elohim ? (opt.divineName === 'adonai' ? 'אֱלֹהִים' : 'אֱלֹקִים') : (opt.divineName === 'adonai' ? 'אֲדֹנָי' : HASHEM);
      return lead + prefixWithMarks(core, p.length) + name + trail;
    }
  }
  if (ABBR.has(sk)) {
    let v = ABBR.get(sk);
    if (v === HASHEM && opt.divineName === 'adonai') v = 'אֲדֹנָי';
    return lead + v + trail;
  }
  // prefixed ה' (e.g. וַה', לַה')
  if (/^[ובלמכש]{1,2}ה'$/.test(sk)) {
    const p = sk.length - 2;
    return lead + prefixWithMarks(core, p) + (opt.divineName === 'adonai' ? 'אֲדֹנָי' : HASHEM) + trail;
  }
  // יי / יְיָ (how many editions print the Name, e.g. the Rambam), with or without a geresh
  if (RE_YY.test(letters) && /^[\u05D0-\u05EA]+'?$/.test(sk)) {
    const p = letters.length - 2;
    return lead + prefixWithMarks(core, p) + (opt.divineName === 'adonai' ? 'אֲדֹנָי' : HASHEM) + trail;
  }
  if (opt.divineName !== 'adonai' && RE_ADONAI.test(letters) && !/["']/.test(sk) && !opt.chol) {
    const n = core.lastIndexOf('נ');
    if (/\u05B8/.test(core.slice(n))) return lead + prefixWithMarks(core, letters.length - 4) + ADOSHEM + trail;
  }
  if (opt.divineName !== 'adonai' && !opt.chol) {
    if (RE_ELOKIM.test(letters) && !/["']/.test(sk)) {
      // replace the ה of אלה / אלוה with ק, keeping all vowels
      const idx = letters.search(/אלו?ה/);
      const hpos = idx + (letters[idx + 2] === 'ו' ? 3 : 2);
      return lead + swapLetter(core, hpos, 'ה', 'ק') + trail;
    }
    // יָהּ (with mappiq) → קָהּ
    if (RE_YAH.test(letters) && /\u05BC/.test(core.slice(-3)) && !/["']/.test(sk)) return lead + swapLetter(core, letters.length - 2, 'י', 'ק') + trail;
    // the noun אֵל: vocalised, tsere under the א (the preposition אֶל has segol)
    if (RE_EL.test(letters) && !/["']/.test(sk)) {
      const a = core.lastIndexOf('א');
      if (/^[\u0591-\u05AF]*\u05B5/.test(core.slice(a + 1)) && !/\u05B4|\u05B8/.test(core.slice(core.lastIndexOf('ל')))) return lead + swapLetter(core, letters.length - 2, 'א', 'ק') + trail;
    }
  }
  return w;
}

/**
 * Prepare one text unit for speech.
 * @param {string} html  source text (may contain <b>…</b>)
 * @param {{stress?:boolean, divineName?:'hashem'|'adonai', chol?:number[]}} opt  chol: indices of אלהים-form words that are not holy (chol.js)
 *   stress=true  ("הקראה בהטעמה"): keep niqqud, remove cantillation only.
 *   stress=false: remove niqqud too (plain spelling; engine guesses vowels).
 */

// ---- Hebrew numerals in context (ה׳ / ר׳ / ס״א are also abbreviations: השם / רבי / סטרא אחרא) ----
const GEM = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
const LETTER_NAME = { א: 'אָלֶף', ב: 'בֵּית', ג: 'גִּימֶל', ד: 'דָּלֶת', ה: 'הֵא', ו: 'וָו', ז: 'זַיִן', ח: 'חֵית', ט: 'טֵית', י: 'יוּד', כ: 'כָּף', ך: 'כָּף', ל: 'לָמֶד', מ: 'מֵם', ם: 'מֵם', נ: 'נוּן', ן: 'נוּן', ס: 'סָמֶךְ', ע: 'עַיִן', פ: 'פֵּא', ף: 'פֵּא', צ: 'צָדִי', ץ: 'צָדִי', ק: 'קוּף', ר: 'רֵישׁ', ש: 'שִׁין', ת: 'תָּו' };
/** gematria value of a numeral token like ה' / ס"א / קס"ה (letters in non-increasing order), else 0 */
export function gematria(sk) {
  const m = /^([\u05D0-\u05EA]+)"([\u05D0-\u05EA])$|^([\u05D0-\u05EA])'$/.exec(sk);
  if (!m) return 0;
  const ls = [...(m[3] || m[1] + m[2])];
  if (ls.length > 4 || ls.some(l => !GEM[l])) return 0;
  for (let i = 1; i < ls.length; i++) if (GEM[ls[i]] > GEM[ls[i - 1]] && !(ls[i - 1] === 'ט' && /[וז]/.test(ls[i]))) return 0;
  return ls.reduce((a, l) => a + GEM[l], 0);
}
const ONES_F = ['', 'אַחַת', 'שְׁתַּיִם', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ', 'שֵׁשׁ', 'שֶׁבַע', 'שְׁמוֹנֶה', 'תֵּשַׁע'];
const TEENS_F = ['עֶשֶׂר', 'אַחַת עֶשְׂרֵה', 'שְׁתֵּים עֶשְׂרֵה', 'שְׁלוֹשׁ עֶשְׂרֵה', 'אַרְבַּע עֶשְׂרֵה', 'חֲמֵשׁ עֶשְׂרֵה', 'שֵׁשׁ עֶשְׂרֵה', 'שְׁבַע עֶשְׂרֵה', 'שְׁמוֹנֶה עֶשְׂרֵה', 'תְּשַׁע עֶשְׂרֵה'];
const TENS = ['', '', 'עֶשְׂרִים', 'שְׁלוֹשִׁים', 'אַרְבָּעִים', 'חֲמִשִּׁים', 'שִׁשִּׁים', 'שִׁבְעִים', 'שְׁמוֹנִים', 'תִּשְׁעִים'];
const HUNDREDS = ['', 'מֵאָה', 'מָאתַיִם', 'שְׁלוֹשׁ מֵאוֹת', 'אַרְבַּע מֵאוֹת', 'חֲמֵשׁ מֵאוֹת', 'שֵׁשׁ מֵאוֹת', 'שְׁבַע מֵאוֹת', 'שְׁמוֹנֶה מֵאוֹת', 'תְּשַׁע מֵאוֹת'];
/** cardinal number in words (feminine counting forms, as used with מעלות / תעניות / מנה), 1–999 */
export function numberWords(n) {
  const parts = [];
  const h = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), u = r % 10;
  if (h) parts.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(TEENS_F[u]);
  else { if (t) parts.push(TENS[t]); if (u) parts.push(ONES_F[u]); }
  return parts.map((p, i) => (i && i === parts.length - 1 ? 'וְ' + p : p)).join(' ');
}
const CITE_UNIT = /^(ו|ב|וב|ל|מ)?(פרק|פ'|סימן|סי'|דף|עמוד|אות|מאמר|משנה|הלכה|פסוק|סעיף|פרשה)$/;
const COUNT_PREV = /^(מנת|המסלול|מסלול)$/;
const COUNT_NEXT = /^(מעלות|מעלה|חלקים|תעניות|ימים|שנים|פעמים|אמות|מלקות)$/;
/** Reading of a numeral token in context, or null when it is not (clearly) a number. */
export function numeralReading(words, i) {
  const w = words[i];
  const m = /^([^\u05D0-\u05EA]*)([\u05D0-\u05EA\u0591-\u05C7]+["'][\u05D0-\u05EA\u0591-\u05C7]?)(.*)$/s.exec(w);
  if (!m) return null;
  const sk = skeleton(m[2]).replace(/״/g, '"').replace(/׳/g, "'");
  const n = gematria(sk);
  if (!n) return null;
  const near = dir => { for (let j = i + dir; j >= 0 && j < words.length; j += dir) if (words[j] && !/^\s+$/.test(words[j])) return words[j]; return ''; };
  const pv = near(-1), nx = near(1);
  const pvs = skeleton(pv).replace(/״/g, '"').replace(/׳/g, "'").replace(/^[([]+/, ''), nxs = skeleton(nx).replace(/["']/g, '');
  const names = () => [...sk.replace(/["']/g, '')].map(l => LETTER_NAME[l]).join(' ');
  // round 3: ANY numeral right after a unit word is a citation – "דף רכ״ט" → "דף מאתיים עשרים ותשע", "עמוד ב׳" → "עמוד בית"
  // (one letter: its name; several letters: the number, so the engine does not read "רכט" as a word)
  if (CITE_UNIT.test(pvs) && !/[.,;:)]$/.test(pv)) return m[1] + (sk.replace(/["']/g, '').length === 1 ? names() : numberWords(n)) + m[3];
  // otherwise only tokens that would be expanded as a word (ה׳ → השם, ר׳ → רבי, ס״א → סטרא אחרא …) are handled here;
  // other numerals are left to the speech engine as before
  if (!ABBR.has(sk)) return null;
  // a count: "ס״א תעניות", "ר׳ מעלות", "מנת ר׳", "המסלול ר׳"
  if (COUNT_NEXT.test(nxs) || (COUNT_PREV.test(pvs) && !/[.,;:]$/.test(pv))) return m[1] + numberWords(n) + m[3];
  // a short parenthesised reference ending in the numeral: "(דברים ה׳)", "(מכות ה׳):", "(שמואל ב ה׳:כ״ד)"
  if (/^\)|^:[\u05D0-\u05EA]/.test(m[3]) || (m[3] === '' && /^\)/.test(nx))) {
    let j = i - 1, cnt = 0, open = false;
    for (; j >= 0 && cnt < 5; j--) {
      const x = words[j];
      if (!x || /^\s+$/.test(x)) continue;
      if (/\)/.test(x) || /^["״]|[^\u05D0-\u05EA]["״]$|^[\u05D0-\u05EA\u0591-\u05C7]+["״][.,;:]?$/.test(x) && !/[\u05D0-\u05EA]["״][\u05D0-\u05EA]/.test(x)) break;
      cnt++;
      if (/^\(/.test(x) || /;/.test(x) && /^\(/.test(x)) { open = true; break; }
    }
    if (open || (/^\(/.test(m[1]))) return m[1] + names() + m[3];
  }
  return null;
}

// ---- round 4: source citations in parentheses – "(שמות כ׳)", "(מכילתא)", "(דברים ו ה)", "(זבחים קט״ו)" – are not read
// aloud in Rashi and Rambam (setting, on by default). A parenthesis counts as a citation only when its first word
// (after an optional עי׳ / ראה) is a book of Tanakh, a tractate, a midrash or a reference word, and it is short.
const BOOKS = 'בראשית שמות ויקרא במדבר דברים יהושע שופטים שמואל מלכים ישעיה ישעיהו ירמיה ירמיהו יחזקאל הושע יואל עמוס עובדיה יונה מיכה נחום חבקוק צפניה חגי זכריה מלאכי תהילים תהלים משלי איוב שיר רות איכה קהלת אסתר דניאל עזרא נחמיה דברי דהי"א דהי"ב דה"א דה"ב דבהי"א שה"ש '
  + 'ברכות פאה דמאי כלאים שביעית תרומות מעשרות חלה ערלה בכורים שבת עירובין פסחים שקלים יומא סוכה סכה ביצה ראש תענית מגילה מועד חגיגה יבמות כתובות נדרים נזיר סוטה גיטין קידושין בבא ב"ק ב"מ ב"ב סנהדרין מכות שבועות עדיות עבודה אבות הוריות זבחים מנחות חולין בכורות ערכין תמורה כריתות מעילה תמיד מדות קנים כלים אהלות נגעים פרה טהרות מקואות נדה מכשירין זבים טבול ידים עוקצין '
  + 'ספרי ספרא מכילתא תנחומא ב"ר ויק"ר שמו"ר במ"ר דב"ר רבה ילקוט פסיקתא פסיק\' פרקי ברייתא תוספתא תלמוד ירושלמי בבלי משנה גמרא תו"כ ת"כ סדר שם לעיל לקמן דף פסוק בר\' ברא\' תה\' תהל\' סנה\' פסח\' גיט\' זבח\' יחז\' קה\' בכ\' בכו\' מ"א מ"ב ר"ה';
const CITE_FIRST = new Set(BOOKS.split(/\s+/).filter(Boolean));
const CITE_INTRO = /^(ו?עי['׳]?|ע['׳]|ראה|וראה|ועיין|עיין)$/;
export function isCitation(inner) {
  const ws = inner.replace(/[\u0591-\u05C7]/g, '').replace(/[״]/g, '"').replace(/[׳]/g, "'").replace(/<[^>]+>/g, ' ').trim().split(/\s+/).map(w => w.replace(/[,;:.]+$/, ''));
  if (!ws[0] || inner.length > 90 || ws.length > 12) return false;
  const first = CITE_INTRO.test(ws[0]) ? ws[1] : ws[0];
  if (!first || !CITE_FIRST.has(first)) return false;
  // "(שם)" / "(שם י״ג)" is a reference; "(שם הוא …)" would be prose
  const after = ws[ws.indexOf(first) + 1];
  return first !== 'שם' || CITE_FIRST.has(after) || ws.slice(ws.indexOf(first) + 1).every(w => /["']/.test(w) || w.length <= 2);
}
export function stripCitations(t) {
  return t.replace(/\s*\(([^()]{1,90})\)/g, (m, inner) => (isCitation(inner) ? ' ' : m));
}

export function prepareForTTS(html, opt = {}) {
  const o = { stress: true, divineName: 'hashem', ...opt };
  let t = String(html)
    .replace(/<i class="fn"[^>]*>[\s\S]*?<\/i>/g, '') // edition footnotes (e.g. וי"ו קטיעא) are not read
    // round 4: anything hidden from screen readers is not spoken either – the petucha/setuma markers פ / ס in particular
    .replace(/<(span|i|b)\b[^>]*aria-hidden="true"[^>]*>[^<]*<\/\1>/g, ' ')
    .replace(/<\/?(big|small)>/g, '')               // large/small letters: same word
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ')
    .replace(/\{[פס]\}/g, ' ')
    .replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '$2') // ketiv (…) followed by qere […]: read the qere
    .replace(/[^]*/, x => (o.cites ? stripCitations(x) : x))
    .replace(/\u05C6/g, ' ')            // inverted nun (Ps 107, Num 10) – a scribal mark, not read
    .replace(/\u05C0/g, ' ')            // paseq
    .replace(/\u05C3/g, '.')            // sof pasuq
    .replace(/\u05BE/g, ' ')            // maqaf -> word break
    .replace(/([\u05D0-\u05EA\u0591-\u05C7'"׳״])-(?=[\u05D0-\u05EA])/g, '$1 ') // a hyphen used as maqaf (אֶת-ה׳)
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')  // direction marks (e.g. after יְיָ׳ in the Rambam)
    .replace(/[\u05F3]/g, "'").replace(/[\u05F4]/g, '"')
    .replace(/([\u0591-\u05C7])\1+/g, '$1'); // duplicated marks in source
  t = t.replace(RE_TAAMIM, '');
  const words = t.split(/(\s+)/);
  let k = 0; // index among אלהים-form words (for the chol.js list)
  t = words.map((w, i) => {
    if (/\s/.test(w) || !w) return w;
    let chol = false;
    if (isElokimWord(w) || RE_EL.test(skeleton(w).replace(/["']/g, ''))) {
      const nx = words.slice(i + 1).find(x => x && !/^\s+$/.test(x));
      if (CHOL_NEXT.has(nextLetters(nx))) chol = true;
      if (!isElokimWord(w)) {
        // יֵשׁ לְאֵל יָדִי / אֵין לְאֵל יָדְךָ = "power"; הָאֵל after a definite plural noun = archaic "these" (הָאֲנָשִׁים הָאֵל)
        if (/^(ידי|ידך|ידם|ידכם)$/.test(nextLetters(nx))) chol = true;
        const pv = words.slice(0, i).reverse().find(x => x && !/^\s+$/.test(x));
        const pl = skeleton(pv || '').replace(/["']/g, '');
        if (/^ה/.test(skeleton(w)) && /(ים|ות|ת)$/.test(pl) && !isElokimWord(pv) && pl !== 'האדנים') chol = true;
        // בֵּית־אֵל is a place name
        if (/^(ו|ב|ל|מ|וב|ומ)?בית$/.test(pl)) chol = true;
      }
      if (isElokimWord(w)) { if (o.chol && o.chol.includes(k)) chol = true; k++; }
    }
    // ע"ה after a name/title = עָלָיו הַשָּׁלוֹם (elsewhere ע"ה is usually the number 75 or a folio, left as is)
    if (/^ע["״]ה[.,:;]?$/.test(skeleton(w) + (w.match(/[.,:;]$/)?.[0] || ''))) {
      const pv = words.slice(0, i).reverse().find(x => x && !/^\s+$/.test(x));
      if (/^(רבינו|רבנו|המלך|אבינו|הכהן|הנביא|אמנו)$/.test(skeleton(pv || ''))) return 'עָלָיו הַשָּׁלוֹם' + (w.match(/[.,:;]$/)?.[0] || '');
    }
    const num = numeralReading(words, i);
    if (num !== null) return num;
    return replaceWord(w, chol ? { ...o, chol: true } : { ...o, chol: undefined });
  }).join('');
  if (!o.stress) t = t.replace(RE_NIQQUD, '');
  t = t.replace(/[[\]{}]/g, '').replace(/[–—]/g, ', ').replace(/\s+([.,:;?!])/g, '$1').replace(/\s+/g, ' ').trim();
  return t;
}

/** Split text into chunks short enough for reliable speechSynthesis (Chrome cuts long utterances). */
export function chunkText(t, max = 180) {
  const out = [];
  const parts = t.split(/(?<=[.:;?!])\s+/);
  for (let p of parts) {
    while (p.length > max) {
      let cut = p.lastIndexOf(', ', max);
      if (cut < max / 3) cut = p.lastIndexOf(' ', max);
      if (cut < 1) cut = max;
      out.push(p.slice(0, cut + 1).trim());
      p = p.slice(cut + 1);
    }
    if (p.trim()) out.push(p.trim());
  }
  return out;
}

/** Round 3: Rashi's headwords (דיבור המתחיל) are printed without vowels, so a voice guesses their reading. When the
 *  headword's words are the verse's own words (same consonants, in order), read them with the verse's vowels
 *  (cantillation removed). Matching is word by word from the start of the headword; unmatched words stay as printed. */
const ETC = /^(וגו['׳]?|וגומר|וכו['׳]?)$/;
const NAME = /^[ובלמכש]{0,2}ה['׳]$/;
// same consonants; plene/defective spelling (ו/י) may differ for words of 3+ letters (Rashi often writes מלא)
const noMatres = x => x.length >= 3 ? x[0] + x.slice(1).replace(/[וי]/g, '') : x;
const eq = (w, h, v) => v === h || (NAME.test(w) && v === h.slice(0, -1) + 'יהוה') || (h.length >= 3 && noMatres(v) === noMatres(h));
export function vowelHeadword(rashiHtml, verseHtml) {
  const m = rashiHtml.match(/^(\s*(?:<span[^>]*>[^<]*<\/span>)?\s*<b>)([^<]+)(<\/b>)/);
  if (!m) return rashiHtml;
  const key = w => w.replace(/[^\u05D0-\u05EA]/g, '');
  const verse = verseHtml.replace(/<[^>]+>/g, '').replace(RE_TAAMIM, '').replace(/[\u05C0\u05C3|]/g, ' ').split(/[\s\u05BE]+/).filter(w => key(w));
  const vk = verse.map(key);
  const hw = m[2].trim().replace(/[.:]$/, '').split(/\s+/);
  const hk = hw.map(key);
  // prefer a full match anywhere in the verse; else the longest matching start (at least two words)
  let best = null;
  for (let i = 0; i < vk.length; i++) {
    let n = 0; while (n < hk.length && i + n < vk.length && hk[n] && eq(hw[n], hk[n], vk[i + n])) n++;
    const etc = hw.slice(n).every(w => ETC.test(w));
    if (n && (n === hk.length || n >= 2 || etc) && (!best || n > best.n)) best = { i, n };
    if (best?.n === hk.length) break;
  }
  if (!best) return rashiHtml;
  // the Name stays as the headword writes it (ה'), so the usual reading rules apply
  const words = verse.slice(best.i, best.i + best.n).map((w, k) => NAME.test(hw[k]) ? hw[k] : w.replace(/[^\u05D0-\u05EA\u05B0-\u05BC\u05C1\u05C2\u05C7]/g, ''));
  const rest = hw.slice(best.n);
  return m[1] + [...words, ...rest].join(' ') + (/[.:]\s*$/.test(m[2]) ? '.' : '') + m[3] + rashiHtml.slice(m[0].length);
}
