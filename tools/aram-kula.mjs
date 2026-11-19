// Stage 8: speech-only, addition-only kula/millei context rules. No relocations or vowel inference.
// Only K1 is enabled (exact לְכוּלֵּיהּ, final stress). All millei rules and all other kula forms remain OFF.
import { scanSpeech, lexKey, addStress } from './aram-lexicon.mjs';

// Exact form + corpus evidence: 20/20 final, Hebrew-loose=0, plain-Hebrew=0.
// No automatic prefix stripping; no fallback; no millei default.
export const RULES = Object.freeze([
  Object.freeze({ id: 'K1', form: 'לְכוּלֵּיהּ', k: 0 }),
]);
const PLAIN = /^[א-תְ-ׇּׁׂ]+$/;
export function aramKulaText(say, { source = null, mishnah = false, stats = null } = {}) {
  if (source !== 'bavli' || mishnah || typeof say !== 'string' || !say) return say;
  const tokens = scanSpeech(say);
  if (!tokens) { if (stats) stats.failClosed = (stats.failClosed || 0) + 1; return say; }
  let out = '', last = 0;
  for (const t of tokens) {
    if (!t.free || !PLAIN.test(t.text)) continue;
    const rule = RULES.find(r => lexKey(t.text) === lexKey(r.form));
    if (!rule) continue;
    const after = addStress(t.text, rule.k);
    if (!after) continue;
    out += say.slice(last, t.start) + after;
    last = t.end;
    if (stats) { stats.added = (stats.added || 0) + 1; stats.byRule ||= {}; stats.byRule[rule.id] = (stats.byRule[rule.id] || 0) + 1; }
  }
  return last ? out + say.slice(last) : say;
}
