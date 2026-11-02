// Which occurrence(s) of a word form repeated in a verse does a Wiktionary verse citation refer to? The citation quotes
// the verse (often with "..." gaps, ASCII hyphens for maqaf, a different ketiv/qere order) and puts the cited word in
// bold — once, or on every copy it means. Each bold copy is aligned with the verse by its neighbouring words.
// Returns the sorted 0-based occurrence indexes among the verse tokens equal to `form`, or null when undecidable.
import { norm, cons } from '../site/js/hnorm.js';

export function qTokens(q) { // [{c: consonants, bold, gapBefore}]
  const out = []; let bold = false, cur = '', curBold = false, gap = false;
  const push = () => {
    const c = cons(norm(cur));
    if (c.length > 1) { out.push({ c, bold: curBold, gapBefore: gap }); gap = false; }
    if (/(\.\.\.|…)\s*$/.test(cur)) gap = true;
    cur = ''; curBold = false;
  };
  for (let i = 0; i < q.length; i++) {
    if (q.startsWith("'''", i)) { bold = !bold; i += 2; continue; }
    const ch = q[i];
    if (/[\s\u05BE\-]/.test(ch)) { push(); continue; }
    if (/^(\.\.\.|…)/.test(q.slice(i)) && !cons(norm(cur))) gap = true;
    cur += ch; if (bold && /[\u05D0-\u05EA]/.test(ch)) curBold = true;
  }
  push(); return out;
}
export function occurrencesOf(verseToks, form, q) {
  const P = verseToks.map((t, i) => t === form ? i : -1).filter(i => i >= 0);
  if (P.length === 0) return null;
  if (P.length === 1) return [0];
  const qt = qTokens(q), vc = verseToks.map(cons), fc = cons(form), res = new Set();
  const bolds = qt.map((t, i) => i).filter(i => qt[i].bold && (qt[i].c === fc || fc.endsWith(qt[i].c)));
  if (!bolds.length) return null;
  for (const j of bolds) {
    let a = j; while (a > 0 && !qt[a].gapBefore) a--;
    let b = j; while (b + 1 < qt.length && !qt[b + 1].gapBefore) b++;
    const scores = P.map(p => { let s = 0; for (let k = -4; k <= 4; k++) if (k && j + k >= a && j + k <= b && qt[j + k].c === vc[p + k]) s++; return s; });
    const best = Math.max(...scores);
    if (best < 1 || scores.filter(s => s === best).length !== 1) return null;
    res.add(scores.indexOf(best));
  }
  return [...res].sort((x, y) => x - y);
}
