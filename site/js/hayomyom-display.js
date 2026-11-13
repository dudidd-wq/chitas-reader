// Display only: retain the source HTML/line structure, never expose speech-control marks.
const CONTROL = /[\u0591-\u05AF\u05BD\u05C4\u05C5|\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const clusters = s => s.match(/[^\p{M}]\p{M}*/gu) || [];
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Map an inline formatting boundary through minor speech-layer spelling changes
// (e.g. כונת -> כוונת). Combining marks always stay with their own letter.
function boundaries(a, b) {
  const n = a.length, m = b.length, d = Array.from({length:n+1}, () => Array(m+1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1][0] !== b[j-1][0]));
  let i = n, j = m; const map = Array(n+1); map[n] = m;
  while (i || j) {
    if (i && j && d[i][j] === d[i-1][j-1]+(a[i-1][0] !== b[j-1][0])) { i--; j--; map[i] = j; }
    else if (i && d[i][j] === d[i-1][j]+1) { i--; map[i] = j; }
    else j--;
  }
  map[0] = 0; map[n] = m; return map;
}
export function formatWord(html, vocalized) {
  const pieces = html.split(/(<[^>]*>)/g), source = clusters(pieces.filter(p => !p.startsWith('<')).join(''));
  const target = clusters(vocalized), map = boundaries(source, target), tags = new Map(); let at = 0;
  for (const p of pieces) {
    if (p.startsWith('<')) { const pos = map[at]; tags.set(pos, (tags.get(pos) || '') + p); }
    else at += clusters(p).length;
  }
  let out = '';
  for (let j = 0; j <= target.length; j++) out += (tags.get(j) || '') + (j < target.length ? escape(target[j]) : '');
  return out;
}
export function hayomVocalizedHtml(html, speech) {
  if (!speech) return html;
  const words = speech.replace(CONTROL, '').trim().split(/\s+/), parts = html.match(/(?:<[^>]*>|[^\s<>])+/g) || [];
  const visible = p => p.replace(/<[^>]*>/g, '');
  // Safe fallback if future data loses paragraph/token alignment; never scramble the edition.
  if (parts.filter(p => visible(p)).length !== words.length) return html;
  let i = 0;
  return html.replace(/(?:<[^>]*>|[^\s<>])+/g, p => visible(p) ? formatWord(p, words[i++]) : p);
}
