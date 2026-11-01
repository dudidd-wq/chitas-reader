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
  'ה\'': 'השם', 'הוי\'': 'הֲוָיָ"ה', 'הוי"ה': 'הֲוָיָ"ה', 'אד\'': 'אדנות', 'הש"י': 'השם יִתְבָּרֵךְ', 'השי"ת': 'השם יִתְבָּרֵךְ',
};
const ABBR = new Map(Object.entries(ABBREVIATIONS).map(([k, v]) => [k.replace(/[״]/g, '"').replace(/[׳]/g, "'"), v]));
const PREFIXES = ['', 'ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'וב', 'ול', 'ומ', 'וכ', 'וש', 'וה', 'שב', 'של', 'שה', 'מה', 'כש', 'לה', 'בה', 'וכש', 'ושב', 'ומה'];

// Divine names. Rule (documented): the Tetragrammaton is read "השם" (default) or "אֲדֹנָי" (setting);
// forms of אלהים are read with ק ("אלוקים") in "השם" mode, unchanged in "אֲדֹנָי" mode.
const RE_ELOKIM = /^(ו|ה|ב|ל|מ|כ|ש|וב|ול|ומ|וכ|וש|וה|לא|כא|בא|מא|וא)?(אלהים|אלהי|אלהיך|אלהינו|אלהיכם|אלהיהם|אלהיו|אלהיה|אלהיהן|אלהיכן|אלהיהו|אלוה|אלוהים|אלוהי)$/;

function prefixWithMarks(word, n) {
  // return the first n letters of `word` with their marks
  let i = 0, seen = 0;
  for (; i < word.length; i++) {
    if (/[\u05D0-\u05EA]/.test(word[i])) { if (seen === n) break; seen++; }
  }
  return word.slice(0, i);
}

export function replaceWord(w, opt) {
  const core = w.replace(/^[^\u05D0-\u05EA]+|[^\u05D0-\u05EA\u0591-\u05C7"'״׳]+$/g, '');
  if (!core) return w;
  const lead = w.slice(0, w.indexOf(core)), trail = w.slice(w.indexOf(core) + core.length);
  const sk = skeleton(core).replace(/״/g, '"').replace(/׳/g, "'");
  const letters = sk.replace(/["']/g, '');
  // Tetragrammaton (with prefixes, incl. יְהוִה)
  for (const p of PREFIXES) {
    if (letters === p + 'יהוה' && !/["']/.test(sk)) {
      // vocalized with hiriq (יֱהֹוִה, after אֲדֹנָי) it is read as Elohim
      const elohim = /\u05B4/.test(core.slice(core.lastIndexOf('ו')));
      const name = elohim ? (opt.divineName === 'adonai' ? 'אֱלֹהִים' : 'אֱלֹקִים') : (opt.divineName === 'adonai' ? 'אֲדֹנָי' : 'השם');
      return lead + prefixWithMarks(core, p.length) + name + trail;
    }
  }
  if (ABBR.has(sk)) {
    let v = ABBR.get(sk);
    if (v === 'השם' && opt.divineName === 'adonai') v = 'אֲדֹנָי';
    return lead + v + trail;
  }
  // prefixed ה' (e.g. וַה', לַה')
  if (/^[ובלמכש]{1,2}ה'$/.test(sk)) {
    const p = sk.length - 2;
    return lead + prefixWithMarks(core, p) + (opt.divineName === 'adonai' ? 'אֲדֹנָי' : 'השם') + trail;
  }
  if (opt.divineName !== 'adonai' && RE_ELOKIM.test(letters) && !/["']/.test(sk)) {
    // replace the ה of אלה with ק, keeping all vowels
    const idx = letters.indexOf('אלה');
    if (idx >= 0) {
      let seen = 0, out = '';
      for (const ch of core) {
        if (/[\u05D0-\u05EA]/.test(ch)) { out += (seen === idx + 2 && ch === 'ה') ? 'ק' : ch; seen++; } else out += ch;
      }
      return lead + out + trail;
    }
  }
  return w;
}

/**
 * Prepare one text unit for speech.
 * @param {string} html  source text (may contain <b>…</b>)
 * @param {{stress?:boolean, divineName?:'hashem'|'adonai'}} opt
 *   stress=true  ("הקראה בהטעמה"): keep niqqud, remove cantillation only.
 *   stress=false: remove niqqud too (plain spelling; engine guesses vowels).
 */
export function prepareForTTS(html, opt = {}) {
  const o = { stress: true, divineName: 'hashem', ...opt };
  let t = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ')
    .replace(/\{[פס]\}/g, ' ')
    .replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '$2') // ketiv (…) followed by qere […]: read the qere
    .replace(/\u05C0/g, ' ')            // paseq
    .replace(/\u05C3/g, '.')            // sof pasuq
    .replace(/\u05BE/g, ' ')            // maqaf -> word break
    .replace(/[\u05F3]/g, "'").replace(/[\u05F4]/g, '"')
    .replace(/([\u0591-\u05C7])\1+/g, '$1'); // duplicated marks in source
  t = t.replace(RE_TAAMIM, '');
  t = t.split(/(\s+)/).map(w => (/\s/.test(w) ? w : replaceWord(w, o))).join('');
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
