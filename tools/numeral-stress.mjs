// Number words and letter names that tts-prep produces (with every prefix it can add) and their expected stress
// (0 = milra, 1 = milel; verification/VOICE-NUMERALS.md). `node tools/numeral-stress.mjs` lists the forms the voice's
// stress model gets wrong; `--tsv` prints them as lines for tools/data/stress-exceptions.tsv. Used by tests/tts-numerals.
import fs from 'node:fs';
import { numberWords, withPrefix, LETTER_NAME } from '../site/js/tts-prep.js';
import { predictStress, stressKey, nuclei } from '../site/js/g2p.js';
const strip = w => w.replace(/[\u0591-\u05C7]/g, '');
// base forms: expected k
export const BASE_STRESS = {
  'אַחַת': 0, 'שְׁתַּיִם': 1, 'שָׁלוֹשׁ': 0, 'אַרְבַּע': 0, 'חָמֵשׁ': 0, 'שֶׁבַע': 1, 'שְׁמוֹנֶה': 0, 'תֵּשַׁע': 1,
  'עֶשֶׂר': 1, 'עֶשְׂרֵה': 0, 'אֶחָד': 0, 'אַחַד': 0, 'שְׁנַיִם': 1, 'שְׁלוֹשָׁה': 0, 'אַרְבָּעָה': 0, 'חֲמִשָּׁה': 0, 'שִׁשָּׁה': 0,
  'שִׁבְעָה': 0, 'שְׁמוֹנָה': 0, 'תִּשְׁעָה': 0, 'עֲשָׂרָה': 0, 'עָשָׂר': 0, 'שְׁלוֹשֶׁת': 1, 'אַרְבַּעַת': 1, 'חֲמֵשֶׁת': 1,
  'שֵׁשֶׁת': 1, 'שִׁבְעַת': 0, 'שְׁמוֹנַת': 0, 'תִּשְׁעַת': 0, 'עֲשֶׂרֶת': 1, 'עֶשְׂרִים': 0, 'שְׁלוֹשִׁים': 0, 'אַרְבָּעִים': 0,
  'חֲמִשִּׁים': 0, 'שִׁשִּׁים': 0, 'שִׁבְעִים': 0, 'שְׁמוֹנִים': 0, 'תִּשְׁעִים': 0, 'מֵאָה': 0, 'מָאתַיִם': 1, 'מֵאוֹת': 0,
  'אָלֶף': 1, 'גִּימֶל': 1, 'דָּלֶת': 1, 'זַיִן': 1, 'לָמֶד': 1, 'סָמֶךְ': 1, 'עַיִן': 1, 'צָדִי': 1,
};
const PREFIXES = ['', 'ו', 'ב', 'ל', 'כ', 'ד', 'מ', 'ש', 'ה', 'וב', 'ול', 'ומ', 'וה', 'וכ', 'וש', 'שב', 'של', 'שה', 'מה', 'בה', 'לה'];
export function numeralForms() {
  const words = new Map();   // word → base
  const add = (text, keep) => { for (const p of PREFIXES) { const t = p ? withPrefix(p, text, keep) : text; t.split(' ').forEach((w, i) => { const base = text.split(' ')[i]; words.set(w, base); }); } };
  for (let n = 1; n < 1000; n++) for (const g of ['f', 'm']) for (const f of ['abs', 'count', 'def']) {
    const t = numberWords(n, g, f); add(t, false);
    t.split(' ').forEach((w, i) => { if (i) words.set(w, t.split(' ')[i].replace(/^ו[\u05B0-\u05BC]*/, '')); });
  }
  for (const l of Object.values(LETTER_NAME)) add(l, true);
  return words;
}
export function stressReport(data) {
  const out = [];
  for (const [w, base0] of numeralForms()) {
    const base = BASE_STRESS[base0] !== undefined ? base0 : Object.keys(BASE_STRESS).find(b => strip(b) === strip(base0) && b.replace(/\u05BC/g, '') === base0.replace(/\u05BC/g, ''));
    if (base === undefined || nuclei(stressKey(w)).length <= 1) continue;
    const want = BASE_STRESS[base], [got, src] = predictStress(w, data);
    out.push({ w, base, want, got, src });
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
  const r = stressReport(data), bad = r.filter(x => x.want !== x.got);
  if (process.argv.includes('--tsv')) for (const x of bad) console.log(`${x.w}\t${x.want}`);
  else { console.log(`${r.length} forms checked, ${bad.length} wrong`); for (const x of bad) console.log(x.w, 'want', x.want, 'got', x.got, x.src); }
}
