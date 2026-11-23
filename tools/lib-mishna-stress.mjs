// Conservative Mishnah speech-only ole (U+05AB). Display text is never written.
// A form is eligible only when Torah+Tehillim cantillation locates a unique
// non-milra stress with attestation >= minCount. Never touch לאו / prefixed לאו.
import {
  stressFromAccents, stressKey, nuclei, letters, accentWords, HATAMA, normalize,
} from '../site/js/g2p.js';

export { stressFromAccents, stressKey, nuclei, letters, accentWords, HATAMA, normalize };

export const RE_WORD = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7'׳"״|]*/g;
export const MIN_COUNT_DEFAULT = 5;

export const lettersOnly = s => String(s).replace(/[^\u05D0-\u05EA]/g, '');

export function isLav(bare) {
  return /^(?:[ובכלמשה]{0,3})לאו$/.test(bare);
}

export function stripOle(s) {
  return String(s).replace(/\u05AB/g, '');
}

export function stampOle(word, k) {
  const core = String(word).replace(/\u05AB/g, '');
  const L = letters(core);
  const n = nuclei(L);
  if (n.length < 2) return null;
  if (!Number.isInteger(k) || k < 0 || k >= n.length) return null;
  const idx = n[n.length - 1 - k].own;
  // Insert ole into the original cluster so other marks stay byte-identical.
  let seen = 0;
  const out = core.replace(/[\u05D0-\u05EA][^\u05D0-\u05EA]*/g, cluster => {
    const keep = seen === idx ? cluster.replace(/\u05AB/g, '') + HATAMA : cluster;
    seen++;
    return keep;
  });
  if (seen !== L.length) return null;
  if (stressFromAccents(out, { allowOle: true }) !== k) return null;
  if (stressKey(out) !== stressKey(core)) return null;
  if (lettersOnly(out) !== lettersOnly(core)) return null;
  if (stripOle(out) !== core) return null;
  return out;
}

export function applyOleToText(text, lexicon, blocked = new Set()) {
  const changed = [];
  const out = String(text).replace(RE_WORD, (w, offset) => {
    if (/\u05AB/.test(w) || /[\u0591-\u05AA\u05AC-\u05AF]/.test(w)) return w;
    if (!/[\u05B0-\u05BB\u05C7]/.test(w)) return w;
    const bare = lettersOnly(w);
    if (isLav(bare)) return w;
    const key = stressKey(w);
    if (blocked.has(key) || blocked.has(bare)) return w;
    const ent = lexicon[key];
    if (!ent || !(ent.k >= 1)) return w;
    const stamped = stampOle(w, ent.k);
    if (!stamped || stamped === w) return w;
    changed.push({ start: offset, src: w, dest: stamped, key, k: ent.k, bare });
    return stamped;
  });
  return { text: out, changed };
}

export function plainMishna(s) {
  return String(s).replace(/<[^>]+>/g, '');
}

export function cleanVerse(v) {
  return String(v).replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').replace(/\u034F/g, '')
    .replace(/[\u05C0|]/g, ' ').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}
