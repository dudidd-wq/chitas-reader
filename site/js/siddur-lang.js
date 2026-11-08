// Language of the siddur's instructions (round 7): the Open Siddur transcription has its instructions in English
// (CC BY). tools/siddur-he.mjs adds a Hebrew translation to the data at build time:
//   - an instruction block ['n', englishHtml] becomes ['n', englishHtml, hebrewHtml]
//   - an English phrase inside a prayer line or heading ("(Cong: אָמֵן)", "Psalm 91:11") is looked up in
//     index.json → heRuns and replaced at display time by this module.
// No translation is made in the browser; a phrase missing from the table is left as it is.

/** an English run inside a Hebrew line: optional "1 " (1 Samuel), then Latin letters, digits, spaces and
 *  punctuation, ending in a letter or digit (so the surrounding "(", ":" and quote marks stay where they are) */
export const RUN = /(?:[0-9] )?[A-Za-z][A-Za-z0-9'’ ,:;.\-–]*[A-Za-z0-9]|[A-Za-z]/g;
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** replace the English runs of a prayer line / heading (text outside tags only). mode 'en' leaves the line as it is. */
export function localizeRuns(html, runs, mode, { heading = false, hideInstructions = false } = {}) {
  if (hideInstructions && !heading) return String(html).replace(/(^|>)([^<]*)/g, (m, gt, txt) => gt + txt.replace(RUN, '')).replace(/\(\s*:\s*/g, '(').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  if (mode === 'en' || !runs) return html;
  let out = String(html).replace(/(^|>)([^<]*)/g, (m, gt, txt) => gt + txt.replace(RUN, r => {
    if (!Object.hasOwn(runs, r)) return r;
    const he = runs[r];
    return he === '' ? '' : heading ? escH(he) : `<span class="sid-in">${escH(he)}</span>`;
  }));
  if (heading) out = out.replace(/\s*[–-]\s*$/, '').replace(/^\s*[–-]\s*/, '');
  // a dropped run ("Av אָב") leaves a stray space; parentheses emptied by a dropped run are removed
  return out.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
}
/** every English run of a line (for the tests and the build tool) */
export const englishRuns = html => String(html).replace(/<[^>]*>/g, '\u0001').match(RUN) || [];
