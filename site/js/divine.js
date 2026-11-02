// Display of the divine name (works in the browser and in Node).
//  * fullName: the abbreviation "יְיָ" / "יי" (with its one-letter prefixes) is written out as the Tetragrammaton
//    יְהֹוָה, the way it is printed in Chabad siddurim (after a prefix vocalised with patach/qamats – לַיהֹוָה, וַיהֹוָה –
//    the yod has no sheva). Applied to every text by default.
//  * abbrName (setting "ה׳"): every Tetragrammaton word (any vocalisation, with prefixes) is shown as prefix + ה׳.
//    The original word is kept in data-r so that the read-aloud reads it exactly as before (השם / אדנות setting).
// Other names (אֲדֹנָי, אֱלֹהִים …) are always shown as written in the source edition.
// letters and their marks – not maqaf, paseq, sof pasuq or nun hafukha, which end a word
const WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]*/g;
const letters = w => { const out = []; for (const ch of w) { if (/[\u05D0-\u05EA]/.test(ch)) out.push({ ch, m: '' }); else if (out.length) out[out.length - 1].m += ch; } return out; };
const PFX = '(?:ו|ב|כ|ל|מ|ש|ד|וב|וכ|ול|ומ|וש|שב|של|שמ|דב|מב)?';
const RE_YY = new RegExp(`^${PFX}יי$`), RE_YHWH = new RegExp(`^${PFX}יהוה$`);
// text outside HTML tags only
const onText = (html, f) => String(html).split(/(<[^>]*>)/).map((p, i) => (i % 2 ? p : p.replace(WORD, f))).join('');

export function fullName(html) {
  return onText(html.replace(/\u05F2/g, 'יי'), w => {
    const L = letters(w), sk = L.map(l => l.ch).join('');
    if (!RE_YY.test(sk)) return w;
    const y1 = L[L.length - 2].m, y2 = L[L.length - 1].m, bare = L.every(l => !l.m);
    // the abbreviation is vocalised sheva + qamats (or not at all); anything else is another word
    if (!bare && !(/\u05B8/.test(y2) && !/[^\u05B0\u05B8\u0591-\u05AF\u05BD]/.test(y1 + y2))) return w;
    const pre = L.slice(0, -2).map(l => l.ch + l.m).join('');
    if (bare) return pre + 'יהוה';
    const lastM = L.length > 2 ? L[L.length - 3].m : '';
    const accents = (y1 + y2).replace(/[\u05B0\u05B8]/g, '');
    return pre + (/[\u05B7\u05B8]/.test(lastM) ? 'י' : 'יְ') + 'הֹוָ' + accents + 'ה';
  });
}
const escAttr = s => s.replace(/"/g, '&quot;');
export function abbrName(html) {
  return onText(fullName(html), w => {
    const L = letters(w), sk = L.map(l => l.ch).join('');
    if (!RE_YHWH.test(sk)) return w;
    return `<span class="dn" data-r="${escAttr(w)}">${L.slice(0, -4).map(l => l.ch + l.m).join('')}ה׳</span>`;
  });
}
export const divineName = (html, mode) => (mode === 'abbr' ? abbrName(html) : fullName(html));
// for the read-aloud: the abbreviated display back to the word as written
export const unAbbr = html => String(html).replace(/<span class="dn" data-r="([^"]*)">[^<]*<\/span>/g, '$1');
