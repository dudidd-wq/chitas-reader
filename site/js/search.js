// Global search (#/search): a local index built at build time (tools/build-search.mjs → site/data/search/), one
// shard per book, fetched only when searched and cached by the service worker per DATA_VERSION. Nothing is sent
// anywhere – the query never leaves the device. Pure module (no DOM), shared by the build tool, the app and tests.
//
// Index text: for every segment (verse / Rashi comment / halacha / paragraph) the letters only – niqqud, taamim and
// markup removed, maqaf → space, geresh/gershayim → ' and " – encoded one byte per letter (א..ת → "`", a..z) so a
// shard is half the size on the wire and a quarter in memory (V8 one-byte strings). One line per segment.
import { fullName } from './divine.js';

const A = 0x05D0, Z = 0x05EA, E0 = 0x60; // ` a b … z  (27 code points: א..ת incl. the final forms)
export const encLetter = c => String.fromCharCode(E0 + c.charCodeAt(0) - A);
export const decode = s => s.replace(/[`a-z]/g, c => String.fromCharCode(A + c.charCodeAt(0) - E0)).replace(/'/g, '׳').replace(/"/g, '״');
const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }, TOFIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
export const foldFinal = s => s.replace(/[ךםןףץ]/g, c => FIN[c]);

/** HTML of one segment → index line (letters, ' " and light punctuation; nothing else). */
export function indexText(html) {
  return fullName(String(html))                                     // "יי" / "יְיָ" → the full name, as displayed
    .replace(/<span class="daf"[^>]*>[^<]*<\/span>/g, ' ')            // Torah Or page markers
    .replace(/<\/?(?:b|i|u|big|small|em|strong)\b[^>]*>/g, '')         // inline formatting: <big>ע</big> in שְׁמַע stays one word
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[פס]\}/g, ' ')
    .replace(/\(([א-י]|י[א-ד])\)(?=\s*[\u05D0-\u05EA])/g, ' ')     // 1.0.66: (א)(ב) section labels
    .replace(/[\u05BE]/g, ' ')                                       // maqaf
    .replace(/[\u0591-\u05C7]/g, '')                                 // taamim, niqqud, paseq, sof pasuq (→ removed)
    .replace(/[׳`']/g, "'").replace(/[״”“"]/g, '"')
    .replace(/[\u05D0-\u05EA]/g, encLetter)
    .replace(/[^`a-z'",.:;?!()\- ]/g, ' ')
    .replace(/(?<=ided)'/g, '')                                      // "יְיָ׳" in a few Rambam halachot: the name is shown in full
    .replace(/ {2,}/g, ' ').trim();
}

const PFX = '[ובכלמשד]{0,3}';
/** Query → { re (global RegExp over the encoded index), letters (typed letters, finals folded), words } or null. */
export function compileQuery(q) {
  q = String(q || '').normalize('NFC').replace(/[\u0591-\u05C7]/g, m => (m === '\u05BE' ? ' ' : ''));
  const words = q.split(/[\s,.:;?!()\-]+/).filter(Boolean);
  const parts = [], typed = [];
  for (let w of words) {
    w = w.replace(/[״”“"]/g, '"').replace(/[׳`’']/g, "'");
    const dn = w.match(/^([ובכלמשד]{0,3})ה'$/);                     // ה׳ typed = the divine name (written in full in the index)
    if (dn) { parts.push(`${[...dn[1]].map(encLetter).join('')}(?:${[...'יהוה'].map(encLetter).join('')}|${encLetter('ה')}')`); typed.push(dn[1] + 'יהוה'); continue; }
    const L = [...w.replace(/['"]/g, '')].filter(c => c >= 'א' && c <= 'ת');
    if (!L.length) continue;
    typed.push(foldFinal(L.join('')));
    // ktiv male / chaser: a ו or י inside the word is optional, and one may be added between any two letters
    const core = L.filter((c, i) => i === 0 || i === L.length - 1 || (c !== 'ו' && c !== 'י'));
    const cls = c => { const b = FIN[c] || c, f = TOFIN[b]; return f ? `[${encLetter(b)}${encLetter(f)}]` : encLetter(b); };
    const VY = `[${encLetter('ו')}${encLetter('י')}'"]{0,3}`;
    parts.push(core.map(cls).join(VY));
  }
  const letters = typed.join('');
  if (letters.length < 2) return null;
  return { re: new RegExp(parts.join(`[^\`a-z\\n]+`), 'g'), letters, words: typed };
}

/** Prepared shard: { …json, starts:Int32Array (line offsets), chapterOf:Int32Array (line → chapter index) } */
export function prepShard(json) {
  const t = json.t, n = json.ids.length, starts = new Int32Array(n), chapterOf = new Int32Array(n);
  let line = 0; starts[0] = 0;
  for (let i = t.indexOf('\n'); i >= 0 && line + 1 < n; i = t.indexOf('\n', i + 1)) starts[++line] = i + 1;
  let ci = 0, left = json.ch[0]?.[2] ?? 0;
  for (let i = 0; i < n; i++) { while (left === 0 && ci + 1 < json.ch.length) left = json.ch[++ci][2]; chapterOf[i] = ci; left--; }
  return { ...json, starts, chapterOf };
}
const lineAt = (starts, pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };

/** All hits in one prepared shard (at most cap). Hit: { line, chapter:[path,label], id, exact, snip:[before, match, after] } */
export function searchShard(S, Q, cap = 300) {
  const out = [], t = S.t, re = new RegExp(Q.re.source, 'g');
  let m, lastLine = -1;
  while ((m = re.exec(t)) && out.length < cap) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    const line = lineAt(S.starts, m.index);
    if (line === lastLine) continue;                                  // one hit per segment
    lastLine = line;
    const a = S.starts[line], b = line + 1 < S.starts.length ? S.starts[line + 1] - 1 : t.length;
    const got = foldFinal(decode(m[0]).replace(/[^א-ת]/g, ''));
    const exact = got === Q.letters, start = m.index === a || !/[`a-z]/.test(t[m.index - 1]);
    const pre = t.slice(Math.max(a, m.index - 70), m.index), post = t.slice(m.index + m[0].length, Math.min(b, m.index + m[0].length + 90));
    out.push({ line, chapter: S.ch[S.chapterOf[line]], id: S.ids[line], exact, score: (exact ? 2 : 0) + (start ? 1 : 0),
      snip: [(m.index - 70 > a ? '…' : '') + decode(pre.replace(/^\S*\s/, m.index - 70 > a ? '' : '$&')), decode(m[0]), decode(post.replace(/\s\S*$/, m.index + m[0].length + 90 < b ? '' : '$&')) + (m.index + m[0].length + 90 < b ? '…' : '')] });
  }
  // the spelling as typed and at a word start first, then the ktiv male/chaser and mid-word variants – each in reading order
  return { hits: out.map((h, i) => [h, i]).sort((x, y) => y[0].score - x[0].score || x[1] - y[1]).map(x => x[0]), more: !!m };
}
/** Link of a hit: a library chapter (#/lib/…?s=segment) or a siddur section (#/s/…). */
export function hitHref(h) {
  const [path] = h.chapter, seg = h.id.replace(/^r/, '');
  return path.startsWith('s/') ? `#/${path}?s=${encodeURIComponent(seg)}` : `#/lib/${path}?s=${encodeURIComponent(seg)}`;
}
