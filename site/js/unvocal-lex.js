// Speech-only vocalisation for a closed list of fully unvocalised book, tractate and
// well-known personal names. Display text is never rewritten. Used by g2p.wordToIPA.
// 1.0.124.

export const UNVOCAL_LEX = {
  'רות': 'רוּת',
  'יהושע': 'יְהוֹשֻׁעַ',
  'ירמיהו': 'יִרְמְיָהוּ',
  'ישעיהו': 'יְשַׁעְיָהוּ',
  'חולין': 'חוּלִּין',
  'ברכות': 'בְּרָכוֹת',
  'איוב': 'אִיּוֹב',
  'שמואל': 'שְׁמוּאֵל',
  'יואל': 'יוֹאֵל',
  'עובדיה': 'עוֹבַדְיָה',
  'שופטים': 'שׁוֹפְטִים',
  'הושע': 'הוֹשֵׁעַ',
  'יבמות': 'יְבָמוֹת',
  'יומא': 'יוֹמָא',
  'תנחומא': 'תַּנְחוּמָא',
  'ראובן': 'רְאוּבֵן',
  'דניאל': 'דָּנִיֵּאל',
};

const PRE = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש'];
const SHVA = '\u05B0', SHURUK = '\u05BC', PATAH = '\u05B7', HIRIQ = '\u05B4';
const VAV = 'ו', HE = 'ה', MEM = 'מ';

function prefixNiqqud(p, vocal) {
  const firstHasShva = vocal.length >= 2 && vocal[1] === SHVA;
  if (p === VAV) {
    // וּ before a labial (בומפ) or before a shva; otherwise וְ
    if ('בומפ'.includes(vocal[0]) || firstHasShva) return 'וּ' + vocal;
    return 'וְ' + vocal;
  }
  if (p === HE) return 'הַ' + vocal;
  if (p === MEM) return 'מִ' + vocal;
  return p + SHVA + vocal;
}

/** If `word` is fully unvocalised and (with a single letter prefix) in UNVOCAL_LEX, return the vocalised form. */
export function applyUnvocalLex(word) {
  if (/[\u05B0-\u05BC\u05C7]/.test(word)) return word;
  const lead = (word.match(/^[^\u05D0-\u05EA]*/) || [''])[0];
  const trail = (word.match(/[^\u05D0-\u05EA]*$/) || [''])[0];
  const sk = word.replace(/[^\u05D0-\u05EA]/g, '');
  if (!sk) return word;
  if (UNVOCAL_LEX[sk]) return lead + UNVOCAL_LEX[sk] + trail;
  for (const p of PRE) {
    if (sk.startsWith(p) && sk.length > p.length && UNVOCAL_LEX[sk.slice(p.length)]) {
      return lead + prefixNiqqud(p, UNVOCAL_LEX[sk.slice(p.length)]) + trail;
    }
  }
  return word;
}
