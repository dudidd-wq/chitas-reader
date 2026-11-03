import { niqqudForTTS } from './niqqud.js';
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
  // 1.0.64: the most frequent abbreviations of Torah Or / Likkutei Torah and the Tanya (verification/VOICE-NUMERALS.md),
  // one reading only in these texts; with a one-letter prefix they are read by the prefix rule (בבחי׳ → בִּבְחִינַת)
  'בחי\'': 'בְּחִינַת', 'נק\'': 'נִקְרָא', 'עמ"ש': 'עַיֵּין מַה שֶּׁכָּתוּב', 'עמש"ל': 'עַיֵּין מַה שֶּׁכָּתוּב לְעֵיל', 'מ"ש': 'מַה שֶּׁכָּתוּב',
  'משא"כ': 'מַה שֶּׁאֵין כֵּן', 'במ"א': 'בְּמָקוֹם אַחֵר', 'וע\'': 'וְעַיֵּין', 'עד"מ': 'עַל דֶּרֶךְ מָשָׁל', 'עי"ז': 'עַל יְדֵי זֶה', 'עד"ז': 'עַל דֶּרֶךְ זֶה',
  'סד"ה': 'סוֹף דִּבּוּר הַמַּתְחִיל', 'סוכ"ע': 'סוֹבֵב כָּל עָלְמִין', 'ממכ"ע': 'מְמַלֵּא כָּל עָלְמִין', 'מל\'': 'מַלְכוּת', 'אצי\'': 'אֲצִילוּת',
  'ארז"ל': 'אָמְרוּ רַבּוֹתֵינוּ זִכְרוֹנָם לִבְרָכָה', 'מארז"ל': 'מַאֲמַר רַבּוֹתֵינוּ זִכְרוֹנָם לִבְרָכָה', 'כמארז"ל': 'כְּמַאֲמַר רַבּוֹתֵינוּ זִכְרוֹנָם לִבְרָכָה',
  'אתעדל"ת': 'אִתְעָרוּתָא דִּלְתַתָּא', 'אתעדל"ע': 'אִתְעָרוּתָא דִּלְעֵילָּא', 'סי\'': 'סִימָן', 'סע"ב': 'סוֹף עַמּוּד בֵּית', 'סע"א': 'סוֹף עַמּוּד אָלֶף',
  'בפ"ע': 'בִּפְנֵי עַצְמוֹ', 'לע"ל': 'לֶעָתִיד לָבוֹא', 'אפי\'': 'אֲפִילּוּ', 'ח"ע': 'חָכְמָה עִילָּאָה', 'ג"ע': 'גַּן עֵדֶן', 'ד"ל': 'דַּי לַמֵּבִין',
  'בנ"י': 'בְּנֵי יִשְׂרָאֵל', 'א"ע': 'אֶת עַצְמוֹ', 'או"א': 'אַבָּא וְאִמָּא', 'כמ"כ': 'כְּמוֹ כֵן', 'נש"י': 'נִשְׁמוֹת יִשְׂרָאֵל', 'כנס"י': 'כְּנֶסֶת יִשְׂרָאֵל',
  'צ"ל': 'צָרִיךְ לוֹמַר', 'מס"נ': 'מְסִירוּת נֶפֶשׁ', 'חב"ד': 'חַבַּ"ד', 'חג"ת': 'חַגַ"ת', 'נה"י': 'נֶהִ"י', 'תשב"כ': 'תּוֹרָה שֶׁבִּכְתָב',
  'תשבע"פ': 'תּוֹרָה שֶׁבְּעַל פֶּה', 'קוב"ה': 'קוּדְשָׁא בְּרִיךְ הוּא', 'אא"ס': 'אוֹר אֵין סוֹף', 'פנימי\'': 'פְּנִימִיּוּת', 'טו"ר': 'טוֹב וָרָע',
  'מ"ת': 'מַתַּן תּוֹרָה', 'נת\'': 'נִתְבָּאֵר', 'עפמ"ש': 'עַל פִּי מַה שֶּׁכָּתוּב', 'אהוי"ר': 'אַהֲבָה וְיִרְאָה', 'רצה"ע': 'רְצוֹן הָעֶלְיוֹן',
  'א"ק': 'אָדָם קַדְמוֹן', 'מ"ן': 'מַיִין נוּקְבִין', 'הש"ץ': 'שְׁלִיחַ הַצִּבּוּר', 'וכ"ז': 'וְכָל זֶה', 'הי\'': 'הָיָה', 'יהי\'': 'יִהְיֶה',
  'בי"ע': 'בְּרִיאָה יְצִירָה עֲשִׂיָּה', 'אבי"ע': 'אֲצִילוּת בְּרִיאָה יְצִירָה עֲשִׂיָּה', 'זו"נ': 'זְעֵיר אַנְפִּין וְנוּקְבָא', 'סש"ב': 'סֵפֶר שֶׁל בֵּינוֹנִים',
  'אגה"ק': 'אִגֶּרֶת הַקֹּדֶשׁ', 'לק"ת': 'לִקּוּטֵי תּוֹרָה', 'זח"א': 'זֹהַר חֵלֶק אָלֶף', 'זח"ב': 'זֹהַר חֵלֶק בֵּית', 'זח"ג': 'זֹהַר חֵלֶק גִּימֶל',
  'מק"מ': 'מִקְדַּשׁ מֶלֶךְ', 'אריז"ל': 'אֲרִיזַ"ל', 'האריז"ל': 'הָאֲרִיזַ"ל', 'שה"ש': 'שִׁיר הַשִּׁירִים', 'יחו"ע': 'יִחוּדָא עִילָּאָה', 'יחו"ת': 'יִחוּדָא תַּתָּאָה',
  'גמ\'': 'גְּמָרָא', 'נוק\'': 'נוּקְבָא', 'יוהכ"פ': 'יוֹם הַכִּפּוּרִים', 'יצה"ר': 'יֵצֶר הָרָע', 'יצה"ט': 'יֵצֶר הַטּוֹב', 'ה"ז': 'הֲרֵי זֶה',
  'תומ"צ': 'תּוֹרָה וּמִצְוֹת', 'כמו"כ': 'כְּמוֹ כֵן', 'כמש"ל': 'כְּמוֹ שֶׁכָּתוּב לְעֵיל', 'עוי"ל': 'עוֹד יֵשׁ לוֹמַר', 'בשכמל"ו': 'בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד',
  'סכ"ע': 'סוֹבֵב כָּל עָלְמִין', 'גמ"ח': 'גְּמִילוּת חֲסָדִים', 'יעו"ש': 'יְעוּיַּן שָׁם', 'עומ"ש': 'עַיֵּין עוֹד מַה שֶּׁכָּתוּב', 'תושב"כ': 'תּוֹרָה שֶׁבִּכְתָב',
  'תושבע"פ': 'תּוֹרָה שֶׁבְּעַל פֶּה', 'נז\'': 'נִזְכָּר', 'עכו"ם': 'עוֹבְדֵי כּוֹכָבִים וּמַזָּלוֹת',
  // with the article (a prefix ה is not vocalised by rule: in a construct pair it goes on the second word)
  'העוה"ב': 'הָעוֹלָם הַבָּא', 'העוה"ז': 'הָעוֹלָם הַזֶּה', 'הכה"ג': 'הַכֹּהֵן הַגָּדוֹל', 'הנה"ב': 'הַנֶּפֶשׁ הַבַּהֲמִית', 'הנה"א': 'הַנֶּפֶשׁ הָאֱלֹקִית',
  'הסט"א': 'הַסִּטְרָא אָחֳרָא', 'הס"א': 'הַסִּטְרָא אָחֳרָא', 'היצה"ר': 'הַיֵּצֶר הָרָע', 'הבחי\'': 'הַבְּחִינָה', 'הפי\'': 'הַפֵּירוּשׁ', 'הנז\'': 'הַנִּזְכָּר',
  'הנוק\'': 'הַנּוּקְבָא', 'התומ"צ': 'הַתּוֹרָה וְהַמִּצְוֹת', 'הגמ\'': 'הַגְּמָרָא',
  'הנק\'': 'הַנִּקְרָא', 'המל\'': 'הַמַּלְכוּת', 'האצי\'': 'הָאֲצִילוּת', 'הסוכ"ע': 'הַסּוֹבֵב כָּל עָלְמִין',
  // 1.0.64: books and words cut with a geresh in the notes and source references (ישעי׳ מ, יז; עי׳ ספרי)
  'ישעי\'': 'יְשַׁעְיָה', 'ירמי\'': 'יִרְמְיָה', 'זכרי\'': 'זְכַרְיָה', 'נחמי\'': 'נְחֶמְיָה', 'עי\'': 'עַיֵּן', 'סעי\'': 'סְעִיף',
  'תוס\'': 'תּוֹסָפוֹת', 'גימט\'': 'גִּימַטְרִיָּא', 'בגימט\'': 'בְּגִימַטְרִיָּא', 'גימ\'': 'גִּימַטְרִיָּא', 'בגימ\'': 'בְּגִימַטְרִיָּא',
  'ירוש\'': 'יְרוּשַׁלְמִי', 'חכ\'': 'חָכְמָה', 'החכ\'': 'הַחָכְמָה',
  // 1.0.64: the most frequent source names in the notes (prefixed forms: the general prefix rule in replaceWord)
  'אוה"ת': 'אוֹר הַתּוֹרָה', 'לקו"ת': 'לִקּוּטֵי תּוֹרָה', 'לקו"ש': 'לִקּוּטֵי שִׂיחוֹת', 'סה"מ': 'סֵפֶר הַמַּאֲמָרִים',
  'אדמו"ר': 'אַדְמוֹ"ר', 'מאדמו"ר': 'מֵאַדְמוֹ"ר', 'אדה"ז': 'אַדְמוֹ"ר הַזָּקֵן', 'אדה"א': 'אַדְמוֹ"ר הָאֶמְצָעִי', 'כ"ק': 'כְּבוֹד קְדֻשַּׁת',
  'ביאוה"ז': 'בֵּיאוּרֵי הַזֹּהַר', 'ביאה"ז': 'בֵּיאוּרֵי הַזֹּהַר', 'זי"ע': 'זְכוּתוֹ יָגֵן עָלֵינוּ', 'נ"ע': 'נִשְׁמָתוֹ עֵדֶן',
  'כ"מ': 'כַּמָּה מְקוֹמוֹת', 'או"ח': 'אֹרַח חַיִּים', 'שו"ע': 'שֻׁלְחָן עָרוּךְ', 'שמע"צ': 'שְׁמִינִי עֲצֶרֶת', 'השמע"צ': 'שְׁמִינִי עֲצֶרֶת',
  'הג"ה': 'הַגָּהָה', 'דא"ח': 'דִּבְרֵי אֱלֹקִים חַיִּים', 'מד"ר': 'מִדְרָשׁ רַבָּה', 'ויק"ר': 'וַיִּקְרָא רַבָּה', 'עה"פ': 'עַל הַפָּסוּק',
  'רמב"ם': 'רַמְבַּ"ם', 'הרמב"ם': 'הָרַמְבַּ"ם', 'בהרמב"ם': 'בָּרַמְבַּ"ם', 'להרמב"ם': 'לָרַמְבַּ"ם', 'כהרמב"ם': 'כָּרַמְבַּ"ם', 'רמב"ן': 'רַמְבַּ"ן', 'הרמב"ן': 'הָרַמְבַּ"ן', 'בהרמב"ן': 'בָּרַמְבַּ"ן', 'תער"ב': 'תַּעְרַ"ב', 'זצ"ל': 'זֵכֶר צַדִּיק לִבְרָכָה',
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
  // 1.0.64: an abbreviation after a prefix of one or two letters (ואח״כ, בד״ה, וע״י, ממ״ש): an unvocalised prefix is
  // vocalised by rule (withPrefix); not ה (הש״ץ = שְׁלִיחַ הַצִּבּוּר – the article goes inside, listed above); a one-letter
  // abbreviation only after ו (ור׳ = וְרַבִּי), and ר׳ after any prefix (דר׳ = דְּרַבִּי, בר׳ = בְּרַבִּי – in this corpus בר׳ is never בראשית); ה׳ by the rule below
  const pm = [1, 2].map(p => [sk, sk.slice(0, p), sk.slice(p)]).find(([, a, b]) => /^[ובלמכשד]+$/.test(a) && ABBR.has(b));
  if (pm && ABBR.get(pm[2]) !== HASHEM && (pm[2].replace(/["']/g, '').length >= 2 || pm[1] === 'ו' || pm[2] === "ר'")) {
    const pre = prefixWithMarks(core, pm[1].length);
    return lead + (/[\u05B0-\u05BC]/.test(pre) ? pre + ABBR.get(pm[2]) : withPrefix(pm[1], ABBR.get(pm[2]))) + trail;
  }
  // prefixed ה' (e.g. וַה', לַה')
  if (/^[ובלמכש]{1,2}ה'$/.test(sk)) {
    const p = sk.length - 2, pre = prefixWithMarks(core, p), name = opt.divineName === 'adonai' ? 'אֲדֹנָי' : HASHEM;
    // 1.0.64: an unvocalised prefix is vocalised by rule (וה׳ → וְהַשֵּׁם, לה׳ → לַאֲדֹנָי)
    return lead + (/[\u05B0-\u05BC]/.test(pre) ? pre + name : withPrefix(sk.slice(0, p), name)) + trail;
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
  // 1.0.64: any other word cut with a geresh (תהי׳, הפנימי׳, וכדפי׳, בי׳): the completion is a guess (תהיה? פנימית?),
  // so the geresh is dropped and the letters are read as written – never silent, never spelled out letter by letter
  if (/^[\u05D0-\u05EA]{2,}'$/.test(sk) && !/[\u05B0-\u05BC]/.test(core)) return lead + core.replace(/['׳]$/, '') + trail;
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
// 1.0.64: no numeral token (letters + geresh / gershayim, with or without a prefix ו ב ל מ כ ש ה ד) is left to the
// engine any more – before an engine an unvocalised "ד׳" is a bare consonant and was not heard. Rules (verification/
// VOICE-NUMERALS.md): after a unit word (פרק, סימן, דף …) as before; before a counted noun of known gender (COUNTED) the
// cardinal that agrees with it (ד׳ מדרגות → אַרְבַּע, ד׳ עולמות → אַרְבָּעָה); otherwise the names of the letters ("א׳"
// at the start of a list → אָלֶף, "ע״ב" → עַיִן בֵּית) – never a guessed gender.
const GEM = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
export const LETTER_NAME = { א: 'אָלֶף', ב: 'בֵּית', ג: 'גִּימֶל', ד: 'דָּלֶת', ה: 'הֵא', ו: 'וָו', ז: 'זַיִן', ח: 'חֵית', ט: 'טֵית', י: 'יוּד', כ: 'כָּף', ך: 'כָּף', ל: 'לָמֶד', מ: 'מֵם', ם: 'מֵם', נ: 'נוּן', ן: 'נוּן', ס: 'סָמֶךְ', ע: 'עַיִן', פ: 'פֵּא', ף: 'פֵּא', צ: 'צָדִי', ץ: 'צָדִי', ק: 'קוּף', ר: 'רֵישׁ', ש: 'שִׁין', ת: 'תָּו' };
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
const ONES_M = ['', 'אֶחָד', 'שְׁנַיִם', 'שְׁלוֹשָׁה', 'אַרְבָּעָה', 'חֲמִשָּׁה', 'שִׁשָּׁה', 'שִׁבְעָה', 'שְׁמוֹנָה', 'תִּשְׁעָה'];
const TEENS_M = ['עֲשָׂרָה', 'אַחַד עָשָׂר', 'שְׁנֵים עָשָׂר', 'שְׁלוֹשָׁה עָשָׂר', 'אַרְבָּעָה עָשָׂר', 'חֲמִשָּׁה עָשָׂר', 'שִׁשָּׁה עָשָׂר', 'שִׁבְעָה עָשָׂר', 'שְׁמוֹנָה עָשָׂר', 'תִּשְׁעָה עָשָׂר'];
// construct state of 2–10, before a definite noun (שְׁלוֹשֶׁת הָעוֹלָמוֹת, שְׁתֵּי הַבְּחִינוֹת); 2 also before any noun (שְׁנֵי יָמִים)
const CONSTR_F = ['', '', 'שְׁתֵּי', 'שְׁלוֹשׁ', 'אַרְבַּע', 'חֲמֵשׁ', 'שֵׁשׁ', 'שְׁבַע', 'שְׁמוֹנֶה', 'תְּשַׁע', 'עֶשֶׂר'];
const CONSTR_M = ['', '', 'שְׁנֵי', 'שְׁלוֹשֶׁת', 'אַרְבַּעַת', 'חֲמֵשֶׁת', 'שֵׁשֶׁת', 'שִׁבְעַת', 'שְׁמוֹנַת', 'תִּשְׁעַת', 'עֲשֶׂרֶת'];
const TENS = ['', '', 'עֶשְׂרִים', 'שְׁלוֹשִׁים', 'אַרְבָּעִים', 'חֲמִשִּׁים', 'שִׁשִּׁים', 'שִׁבְעִים', 'שְׁמוֹנִים', 'תִּשְׁעִים'];
const HUNDREDS = ['', 'מֵאָה', 'מָאתַיִם', 'שְׁלוֹשׁ מֵאוֹת', 'אַרְבַּע מֵאוֹת', 'חֲמֵשׁ מֵאוֹת', 'שֵׁשׁ מֵאוֹת', 'שְׁבַע מֵאוֹת', 'שְׁמוֹנֶה מֵאוֹת', 'תְּשַׁע מֵאוֹת'];
/** Cardinal number in words, 1–999. g: 'f' (default – also the form of a number used as a name: פרק, סימן, דף) or
 *  'm'; form: 'abs' (absolute), 'count' (before a noun: 2 → שְׁתֵּי / שְׁנֵי), 'def' (before a definite noun: 2–10 in
 *  the construct state). Hundreds are feminine (מֵאָה) in both genders. */
export function numberWords(n, g = 'f', form = 'abs') {
  if (form !== 'abs' && n >= 2 && n <= 10 && (form === 'def' || n === 2)) return (g === 'm' ? CONSTR_M : CONSTR_F)[n];
  const ones = g === 'm' ? ONES_M : ONES_F, teens = g === 'm' ? TEENS_M : TEENS_F;
  const parts = [];
  const h = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), u = r % 10;
  if (h) parts.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(teens[u]);
  else { if (t) parts.push(TENS[t]); if (u) parts.push(ones[u]); }
  return parts.map((p, i) => (i && i === parts.length - 1 ? vav(p) : p)).join(' ');
}
/** The conjunction ו before a number word, by the grammar rule (round 5): וּ before a shva or before ב/מ/פ
 *  (וּשְׁתַּיִם, וּשְׁמוֹנֶה, וּמֵאָה), וַ / וֶ / וָ before a hataf (וַחֲמִשִּׁים), otherwise וְ (וְאַחַת, וְשָׁלוֹשׁ, וְתֵשַׁע). */
export function vav(word) {
  word = word.replace(/^([בגדכפת][\u05B0-\u05BB\u05C1\u05C2\u05C7]*)\u05BC/, '$1'); // after ו a בגדכפ״ת letter loses its dagesh (וְתֵשַׁע)
  const first = word.match(/^[\u05D0-\u05EA][\u05B0-\u05BC\u05C1\u05C2\u05C7]*/)?.[0] || '';
  if (/^[במפ]/.test(first) || /\u05B0/.test(first)) return 'וּ' + word;
  if (/\u05B2/.test(first)) return 'וַ' + word;
  if (/\u05B1/.test(first)) return 'וֶ' + word;
  if (/\u05B3/.test(first)) return 'וָ' + word;
  return 'וְ' + word;
}
/** A one-letter prefix (ו ב כ ל ד מ ש ה), vocalised by the grammar rules, before a vocalised word: בְּ / בִּ before a
 *  shva / בַּ before a hataf patah; מִ (מֵ before a guttural); שֶׁ; הַ (הָ before א ע ר); ו as vav(). keepDagesh: a
 *  letter name keeps its dagesh after ו (וּבֵית is the word "and a house", the letter is וּבֵּית). Several letters
 *  (וּבְ, שֶׁבְּ) are applied from the inside out. */
export function withPrefix(pre, word, keepDagesh = false) {
  const forte = w => (/^[אהחער]/.test(w) || /^.[\u05B0-\u05C7]*\u05BC/.test(w) ? w : w[0] + '\u05BC' + w.slice(1));   // הַשְּׁלוֹשָׁה, מִכָּל
  let art = null;   // the vowel of an article just added (בה → בַּ: the ה is elided)
  for (const ch of [...pre].reverse()) {
    const first = word.match(/^[\u05D0-\u05EA][\u05B0-\u05BC\u05C1\u05C2\u05C7]*/)?.[0] || '';
    if (ch === 'ו') word = keepDagesh ? ((/^[במפ]/.test(first) || /\u05B0/.test(first) ? 'וּ' : 'וְ') + word) : vav(word);
    else if ('בכל'.includes(ch) && art) word = ch + (ch === 'ל' ? '' : '\u05BC') + art + word.slice(2);
    else if ('בכלד'.includes(ch)) {
      const d = ch === 'ל' ? '' : '\u05BC';
      const v = /\u05B0/.test(first) ? '\u05B4' : /\u05B2/.test(first) ? '\u05B7' : /\u05B1/.test(first) ? '\u05B6' : /\u05B3/.test(first) ? '\u05B8' : '\u05B0';
      if (!keepDagesh) word = word.replace(/^([בגדכפת][\u05B0-\u05BB\u05C1\u05C2\u05C7]*)\u05BC/, '$1');   // בִּבְחִינַת
      word = ch + d + v + word;
    } else if (ch === 'מ') word = /^[אהחער]/.test(first) ? 'מֵ' + word : 'מִ' + forte(word);
    else if (ch === 'ש') word = 'שֶׁ' + forte(word);
    else if (ch === 'ה') { const v = /^[אער]/.test(first) ? '\u05B8' : '\u05B7'; word = 'ה' + v + forte(word); art = v; continue; }
    art = null;
  }
  return word;
}
const CITE_STRICT = /^(ו|ב|וב|ל|מ)?(פרק|פ'|סימן|סי'|דף|עמוד|אות|מאמר|משנה|הלכה|פסוק|סעיף|פרשה)$/;
const CITE_UNIT = /^(ו|ב|וב|ל|מ|ה|וה|ש|כ)?(פרק|פ'|סימן|סי'|סמן|דף|עמוד|עמ'|אות|מאמר|משנה|הלכה|פסוק|סעיף|סע'|פרשה|שער|חלק|כלל|דרוש|מדור|אופן|שאלה|תשובה|קטע|מזמור|ספר)$/;
const COUNT_PREV = /^(מנת|המסלול|מסלול)$/;
const AGE_PREV = /^(ו|כ|וכ|ש|ה)?(בן|בת)$/;
// Counted nouns and their gender (f / m), checked by hand; the plural, a few singulars used after numbers above ten
// (י״ב שנה, ל׳ יום) and construct plurals (ד׳ מיני). Not here: words that are also names of parashot / books /
// tractates when the numeral is פ׳ (פ׳ משפטים = פרשת משפטים, see below), and צבאות (ה׳ צבאות is the Name).
const COUNTED_F = 'מצות מצוות מדות מידות מעלות מעלה אותיות בחינות בחינה בחי מדרגות מדריגות נתיבות ברכות ידות שעות המשכות ספירות דעות תשובות תיבות תבות עליות נקודות קליפות אהבות רוחות תפלות תפילות שערות מסכתות שניות מלכיות מלאכות הויות חלות תורות תעניות מיתות פרשיות אומות סעודות סעדות כתות השגחות פעמים פעם שנים שנה אמות אמה מלקות מאות אצבעות תקופות דלתות גבורות ספירות נשמות שבתות מנות מנה סאה סאין ידים רגלים אבנים עבירות כוונות כונות מחשבות התבוננות הלכות מילין תיבין צורות דרגות מחיצות פרסאות ערים נשים בנות'.split(' ');
const COUNTED_M = 'אברים איברים אברין איברין אברי איברי חלקים ימים יום יומין עולמות עלמין שמות פירושים הפכים הפכיים סעיפים טפחים טפח דברים קוין קווין נהורין מוחין שבטים יסודות מקיפים ענינים ניצוצין ניצוצים נצוצין נצוצים ניצוצות גידים כלים חדשים חדש חודש ספרים ספרין פסוקים צמצומים לבושים שערים כתרים כתרין מינים מיני פרקים פרקין אופנים גוונים גוונין כוכבים רקיעים אלפים אלף אלפין מאמרות מלכים פרים צדיקים כבשים מזלות היכלות לבבות נרות קולות אורות מחנות מטות קצוות צומות שבועות חוטין נימין קוצין שבילין תחומין דורות דור כחות כוחות קרבנות כרובים מלאכים עדים כהנים לוים זוזים זוז דינרים דינר אנשים איש נביאים ראשים גבולים פרצופים תיקונים תקונים תיקוני תקוני זיווגים זווגים חסדים דינים צירופים יחודים מקומות שקלים שקל עמודים עמודי סדרים'.split(' ');
export const COUNTED = new Map([...COUNTED_F.map(w => [w, 'f']), ...COUNTED_M.map(w => [w, 'm'])]);
const SINGULAR_COUNTED = new Set(['שנה', 'יום', 'פעם', 'אמה', 'סאה', 'מנה', 'טפח', 'אלף', 'חדש', 'חודש', 'איש', 'זוז', 'דינר', 'שקל', 'דור', 'מעלה', 'בחינה']);
const PARASHA_NAMES = new Set(['שמות', 'דברים', 'משפטים', 'שופטים', 'קדושים', 'תולדות', 'מסעות', 'שבועות', 'ברכות', 'מנחות']);
// numerals that are read as a word when they do not count anything (תרי״ג מצוות is a count: 613)
const NUMERAL_WORDS = { 'תרי"ג': 'תַּרְיַ"ג', 'רמ"ח': 'רַמַ"ח', 'שס"ה': 'שַׁסָ"ה' };
/** The counted noun after a numeral: {g, def} or null. "בחי׳" counts as בחינות. */
function countedNoun(nx, n) {
  const sk = skeleton(nx).replace(/^[([]+/, '').replace(/["'״׳]/g, '');
  for (const [w, def] of [[sk, false], [sk.replace(/^ה/, ''), true]]) {
    if (def && !/^ה/.test(sk)) continue;
    const g = COUNTED.get(w);
    if (!g) continue;
    if (SINGULAR_COUNTED.has(w) && n < 11) continue;   // ב׳ שנה is not a count; י״ב שנה is
    if (/['׳]/.test(skeleton(nx)) && w !== 'בחי') continue;   // an abbreviation as the next word – only בחי׳
    return { g, def, w };
  }
  return null;
}
/** Split a numeral token into a prefix and the numeral: "וד'" → {pre:'ו', num:"ד'", n:4}; null if it is none. */
export function splitNumeral(sk) {
  let n = gematria(sk);
  if (n) return { pre: '', num: sk, n };
  for (let p = 1; p <= 2; p++) {
    if (!/^[ובלמכשהד]+$/.test(sk.slice(0, p))) break;
    const rest = sk.slice(p);
    if (rest === "י'") break;   // בי׳ / לי׳ / די׳ are truncated words (בֵּיהּ, לֵיהּ), not "in 10"
    if ((n = gematria(rest))) return { pre: sk.slice(0, p), num: rest, n };
  }
  return null;
}
const LETTER_ONLY = /^[\u05D0-\u05EA"']+$/;
/** Reading of a numeral token in context, or null when it is not (clearly) a number. */
export function numeralReading(words, i) {
  const w = words[i];
  const m = /^([^\u05D0-\u05EA]*)([\u05D0-\u05EA\u0591-\u05C7]+["'][\u05D0-\u05EA\u0591-\u05C7]?)(.*)$/s.exec(w);
  if (!m) return plainNumeral(words, i);
  const sk = skeleton(m[2]).replace(/״/g, '"').replace(/׳/g, "'");
  const sp = splitNumeral(sk);
  if (!sp) return null;
  // a vocalised prefix (וְד׳) keeps its own vowel; an unvocalised one is vocalised by rule
  const vocalPre = sp.pre && /[\u05B0-\u05BC]/.test(prefixWithMarks(m[2], sp.pre.length)) ? prefixWithMarks(m[2], sp.pre.length) : null;
  const pref = (word, keep) => (!sp.pre ? word : vocalPre ? vocalPre + word : withPrefix(sp.pre, word, keep));
  const { n, num } = sp, ls = num.replace(/["']/g, '');
  const near = dir => { for (let j = i + dir; j >= 0 && j < words.length; j += dir) if (words[j] && !/^\s+$/.test(words[j])) return words[j]; return ''; };
  const pv = near(-1), nx = near(1);
  const pvs = skeleton(pv).replace(/״/g, '"').replace(/׳/g, "'").replace(/^[([]+/, ''), nxs = skeleton(nx).replace(/["']/g, '');
  const names = () => pref([...ls].map(l => LETTER_NAME[l]).join(' '), true);
  const out = s => m[1] + s + m[3];
  // the whole token, or the token without its prefix, is an abbreviation (ה׳, ר׳, ס״א, ע״י, ד״ה …)
  const abbr = ABBR.has(sk) ? sk : ABBR.has(num) ? num : null;
  // round 3: ANY numeral right after a unit word is a citation – "דף רכ״ט" → "דף מאתיים עשרים ותשע", "עמוד ב׳" → "עמוד בית"
  // (one letter: its name; several letters: the number – feminine, the form of a number used as a name)
  // ה׳ after the newer unit words (חלק, שער, ספר …) is the Name (כִּי חֵלֶק ה׳ עַמּוֹ, שַׁעַר ה׳); only the original list cites it
  if (!sp.pre && CITE_UNIT.test(pvs) && !/[.,;:)]$/.test(pv) && (ls !== 'ה' || CITE_STRICT.test(pvs))) return out(ls.length === 1 ? names() : numberWords(n));
  const noun = /[.,;:)]$/.test(w) ? null : countedNoun(nx, n);
  const count = () => out(pref(numberWords(n, noun.g, noun.def ? 'def' : 'count')));
  if (abbr) {
    if (ABBR.has(sk) && sp.pre) return null;   // e.g. וכ״ז = וְכָל זֶה
    // the letter with the article – "צורת הה׳", "והה׳" – is the letter, not the Name
    if (/ה$/.test(sp.pre) && ls.length === 1 && !vocalPre) return out(names());
    // a count: "ס״א תעניות", "ר׳ מעלות", "ה׳ חסדים", "מנת ר׳", "המסלול ר׳"; a one-letter abbreviation (ה׳ ר׳) before any
    // counted plural, a longer one (ע״י, ר״ל …) only before the nouns of the old list
    if (noun && n > 1 && (ls.length === 1 || /^(מעלות|מעלה|חלקים|תעניות|ימים|שנים|פעמים|אמות|מלקות)$/.test(noun.w))) return count();
    if (!sp.pre && COUNT_PREV.test(pvs) && !/[.,;:]$/.test(pv)) return out(numberWords(n));
    // a short parenthesised reference ending in the numeral: "(דברים ה׳)", "(מכות ה׳):", "(שמואל ב ה׳:כ״ד)"
    if (!sp.pre && (/^\)|^:[\u05D0-\u05EA]/.test(m[3]) || (m[3] === '' && /^\)/.test(nx)))) {
      let j = i - 1, cnt = 0, open = false;
      for (; j >= 0 && cnt < 5; j--) {
        const x = words[j];
        if (!x || /^\s+$/.test(x)) continue;
        if (/\)/.test(x) || /^["״]|[^\u05D0-\u05EA]["״]$|^[\u05D0-\u05EA\u0591-\u05C7]+["״][.,;:]?$/.test(x) && !/[\u05D0-\u05EA]["״][\u05D0-\u05EA]/.test(x)) break;
        cnt++;
        if (/^\(/.test(x) || /;/.test(x) && /^\(/.test(x)) { open = true; break; }
      }
      if (open || (/^\(/.test(m[1]))) return out(names());
    }
    return null;   // read as the abbreviation (השם, רבי …) by replaceWord
  }
  // a vocalised word with a geresh (גֵ׳ירָה) is not a numeral
  if (!LETTER_ONLY.test(m[2].replace(/[\u0591-\u05C7]/g, '')) || /[\u05B0-\u05BB\u05C7]/.test(m[2].slice(sp.pre.length ? prefixWithMarks(m[2], sp.pre.length).length : 0))) return null;
  // a count before a noun of known gender; not פ׳ / ר״פ before a name of a parasha / tractate (פ׳ משפטים = פרשת משפטים),
  // and not "א׳" (one of …)
  if (noun && n > 1 && !(PARASHA_NAMES.has(noun.w) && /[פף]/.test(ls))) return count();
  // an age without the noun: "בן י״ג" → בֶּן שְׁלוֹשׁ עֶשְׂרֵה (שנה is feminine)
  if (!sp.pre && AGE_PREV.test(pvs) && n > 1 && !/[.,;:]$/.test(pv)) return out(numberWords(n));
  if (!sp.pre && NUMERAL_WORDS[num]) return out(NUMERAL_WORDS[num]);
  // anything else – a list letter (א׳ … ב׳ …), a folio side (ע״ב), a part (ח״ב), a citation – the names of the letters
  return out(names());
}

// Round 5: a numeral written WITHOUT geresh/gershayim ("אגרת כט") is read as a number only after "אגרת" (the Tanya's
// letters are numbered this way). Not after פרק / סימן / דף / הלכה: in the texts here every such case is a word
// ("פרק זה", "הלכה לה", "סימן יש", "פרק קמא" = the first chapter), so converting there would do harm.
function plainNumeral(words, i) {
  const m = /^([^\u05D0-\u05EA]*)([\u05D0-\u05EA]{1,3})([.,:;)]*)$/.exec(words[i] || '');
  if (!m) return null;
  let j = i - 1; while (j >= 0 && /^\s*$/.test(words[j])) j--;
  if (j < 0 || !/^(ו|ב|וב|ל|מ)?(אגרת|אגרות)$/.test(skeleton(words[j]).replace(/^[([]+/, ''))) return null;
  const ls = m[2], n = gematria(ls.length === 1 ? ls + "'" : ls.slice(0, -1) + '"' + ls.slice(-1));
  return n ? m[1] + numberWords(n) + m[3] : null;
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
    .replace(/<span class="daf"[^>]*>[^<]*<\/span>/g, ' ') // Torah Or / Likkutei Torah page markers are not read
    // 1.0.61: what is shown but not said – the Divine Names next to Ana Bekoach, the Omer chart's Sefirah, an instruction cell
    .replace(/<(td|th|span|div)\b[^>]*\bdata-nr\b[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<\/(td|th)>/g, ', ')
    .replace(/<span class="sid-in">[^<]*<\/span>/g, ' ') // round 7: an instruction inside a prayer line ("הקהל:") is not prayer text
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
  // round 6: the Masoretic ירושלִַם (patah + hiriq, the yod unwritten) is spelled out for the voice; then the impossible
  // vowel marks of the editions are repaired or, where no single repair exists, that word is read without niqqud
  t = t.replace(/([\u05D0-\u05EA][\u05BC]?)(?:\u05B7\u05B4|\u05B4\u05B7)ם/g, '$1\u05B7\u05D9\u05B4ם');
  t = niqqudForTTS(t);
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
    // 1.0.64: בחי׳ is בְּחִינַת before its noun, בְּחִינוֹת after a number (ב׳ בחי׳), בְּחִינָה at the end of a phrase or
    // before זו / ב׳ (בחי׳ זו, בחי׳ ב׳)
    const bsk = skeleton(w).replace(/״/g, '"').replace(/׳/g, "'"), bm = /^([ובלמכשד]{0,2})בחי'$/.exec(bsk);
    if (bm && !/[\u05B0-\u05BB]/.test(w)) {
      const near = dir => { for (let j = i + dir; j >= 0 && j < words.length; j += dir) if (words[j] && !/^\s+$/.test(words[j])) return words[j]; return ''; };
      const pv = near(-1), nx = skeleton(near(1)).replace(/״/g, '"').replace(/׳/g, "'");
      const pn = splitNumeral(skeleton(pv).replace(/״/g, '"').replace(/׳/g, "'"))?.n || 0;
      let form = 'בְּחִינַת';
      if (!bm[1] && pn > 1 && !/[.,;:]$/.test(pv)) form = 'בְּחִינוֹת';
      else if (/[.,;:)]$/.test(w) || !nx || /^(זו|זאת|זה|הזאת|הזו|הזה|אחת|אחרת|השנית|הראשונה|השלישית|הרביעית|העליונה|התחתונה|[\u05D0-\u05EA]{1,2}')$/.test(nx)) form = 'בְּחִינָה';
      const at = w.search(/[\u05D0-\u05EA]/), end = w.lastIndexOf("'") >= 0 ? w.lastIndexOf("'") + 1 : w.length;
      return w.slice(0, at) + (bm[1] ? withPrefix(bm[1], form) : form) + w.slice(end);
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
