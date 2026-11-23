// Fail-closed written punctuation rules for Pnei Moshe display comments.
// Letters and niqqud are never changed. See /workspace/plans/chitas-punct/RULES.md
// (copied into verification/PUNCT-PNEI-S6.md on apply).

export const RULES_REV = 'pnei-punct-s6-r1f3';
export const PUNCT_RE = /[.,;:?!]/;
export const PUNCT_CHARS = '.,;:?!';
export const HEB_RE = /[\u05D0-\u05EA]/;
export const NIQ_RE = /[\u0591-\u05C7]/;
export const GERESH_RE = /['\u05F3"\u05F4\u201C\u201D\u2018\u2019״׳]/;

const GLOSS = ['וכלומר', 'כלומר']; // longer first
const RHET = ['בתמיה'];

export function stripPunct(s) {
  return String(s || '').replace(/[.,;:?!]+/g, '');
}

export function hebrewLetters(s) {
  return [...String(s || '')].filter(ch => HEB_RE.test(ch)).join('');
}

export function lettersFromDisplay(s) {
  return hebrewLetters(String(s || '').replace(/<[^>]+>/g, ''));
}

export function tagCharMask(s) {
  const mask = new Uint8Array(s.length);
  for (let i = 0; i < s.length; ) {
    if (s[i] === '<') {
      const j = s.indexOf('>', i);
      const end = j < 0 ? s.length : j + 1;
      mask.fill(1, i, end);
      i = end;
    } else i++;
  }
  return mask;
}

/** Tag characters plus text inside HTML elements (lemmas in <b>…</b>). */
export function elementMask(s) {
  const mask = tagCharMask(s);
  let depth = 0;
  for (let i = 0; i < s.length; ) {
    if (s[i] === '<') {
      const j = s.indexOf('>', i);
      const end = j < 0 ? s.length : j + 1;
      const body = s.slice(i + 1, end - (j < 0 ? 0 : 1)).trim();
      if (body.startsWith('/')) depth = Math.max(0, depth - 1);
      else if (body && !body.endsWith('/') && !body.startsWith('!')) depth++;
      i = end;
      continue;
    }
    if (depth > 0) mask[i] = 1;
    i++;
  }
  return mask;
}

export function tagMask(s) { return elementMask(s); }

function wordBoundaryBefore(s, i, mask) {
  if (i <= 0) return true;
  let k = i - 1;
  while (k >= 0 && mask[k]) k--;
  if (k < 0) return true;
  return !HEB_RE.test(s[k]);
}

function wordBoundaryAfter(s, end, mask) {
  if (end >= s.length) return true;
  let k = end;
  while (k < s.length && mask[k]) k++;
  if (k >= s.length) return true;
  return !HEB_RE.test(s[k]);
}

function skipTagsSpaces(s, i, dir, mask) {
  const n = s.length;
  let k = i;
  while (k >= 0 && k < n) {
    if (mask[k] || s[k] === ' ' || s[k] === '\t' || s[k] === '\n' || s[k] === '\r') {
      k += dir;
      continue;
    }
    return k;
  }
  return dir < 0 ? -1 : n;
}

function alreadyPunctAfter(s, end, mask) {
  const k = skipTagsSpaces(s, end, 1, mask);
  return k < s.length && PUNCT_CHARS.includes(s[k]);
}

function lastVisible(s, i, mask) {
  return skipTagsSpaces(s, i - 1, -1, mask);
}

export function findMarkers(s, markers) {
  const mask = tagMask(s);
  const out = [];
  for (const marker of markers) {
    let start = 0;
    while (start < s.length) {
      const i = s.indexOf(marker, start);
      if (i < 0) break;
      start = i + 1;
      let inside = false;
      for (let k = i; k < i + marker.length; k++) if (mask[k]) { inside = true; break; }
      if (inside) continue;
      if (!wordBoundaryBefore(s, i, mask) || !wordBoundaryAfter(s, i + marker.length, mask)) continue;
      out.push({ marker, start: i, end: i + marker.length });
    }
  }
  out.sort((a, b) => a.start - b.start || b.marker.length - a.marker.length);
  // drop shorter overlaps
  const kept = [];
  for (const m of out) {
    if (kept.some(x => !(m.end <= x.start || m.start >= x.end))) continue;
    kept.push(m);
  }
  return { mask, hits: kept };
}

function canPeriodBefore(s, start, mask) {
  const k = lastVisible(s, start, mask);
  if (k < 0) return null;
  if (PUNCT_CHARS.includes(s[k])) return null;
  if (HEB_RE.test(s[k]) || GERESH_RE.test(s[k])) return k + 1;
  return null;
}

function visibleWordBefore(s, start, mask) {
  const k = lastVisible(s, start, mask);
  if (k < 0) return '';
  let j = k;
  while (j >= 0) {
    if (mask[j]) { j--; continue; }
    if (HEB_RE.test(s[j]) || GERESH_RE.test(s[j])) { j--; continue; }
    break;
  }
  let word = '';
  for (let i = j + 1; i <= k; i++) {
    if (mask[i]) continue;
    word += s[i];
  }
  return word;
}

function visibleWordAfter(s, end, mask) {
  const k = skipTagsSpaces(s, end, 1, mask);
  if (k >= s.length || PUNCT_CHARS.includes(s[k])) return '';
  let word = '';
  for (let i = k; i < s.length; i++) {
    if (mask[i]) continue;
    if (HEB_RE.test(s[i]) || GERESH_RE.test(s[i])) word += s[i];
    else break;
  }
  return word;
}

// Fail-closed guards from review fixRound 0 (exact-only, corpus-wide).
const BLOCK_BEFORE_GLOSS = new Set(['אלא']);
const BLOCK_BEFORE_RHET = new Set(['לשון', 'בלשון', 'כלשון', 'ללשון']);
// Abbreviations of כלומר ending in geresh (וכלו', כלו', וכלומ', …).
// R1 must not insert a period after these before בתמיה (fixRound 3).
function isKlomarAbbrev(word) {
  return /^(?:[ובכלמשה]{0,3})כלומ?['׳]$/.test(String(word || ''));
}
const BLOCK_AFTER_RHET = new Set(['הוא', 'היא', 'הם', 'הן', 'הוי', 'קאמר', 'מיתפרשא']);

/**
 * Apply R1–R4 to one display comment. Returns {text, insertions}.
 */
export function punctuateComment(text, { alreadyShipped = false } = {}) {
  if (alreadyShipped || typeof text !== 'string' || !text) {
    return { text, insertions: [] };
  }
  const insertions = [];
  const { hits } = findMarkers(text, [...RHET, ...GLOSS]);
  // Marker matching uses elementMask (no inserts inside <b>). Boundary
  // punctuation must use tag-character mask only, so a period already
  // inside <b>lemma.</b> is visible and blocks R1/R3 (fixRound 0).
  const charMask = tagCharMask(text);
  for (const h of hits) {
    const isRhet = RHET.includes(h.marker);
    const isGloss = GLOSS.includes(h.marker);
    if (isRhet || isGloss) {
      const prev = visibleWordBefore(text, h.start, charMask);
      const blocked = (isRhet && (BLOCK_BEFORE_RHET.has(prev) || isKlomarAbbrev(prev)))
        || (isGloss && BLOCK_BEFORE_GLOSS.has(prev));
      const at = blocked ? null : canPeriodBefore(text, h.start, charMask);
      if (at != null) {
        insertions.push({
          at,
          mark: '.',
          rule: isRhet ? 'R1' : 'R3',
          marker: h.marker,
        });
      }
    }
    if ((isRhet || isGloss) && !alreadyPunctAfter(text, h.end, charMask)) {
      const nxt = visibleWordAfter(text, h.end, charMask);
      const prev = visibleWordBefore(text, h.start, charMask);
      // If בתמיה is part of לשון בתמיה / בלשון בתמיה, skip R2 as well (fixRound 2).
      if (isRhet && (BLOCK_AFTER_RHET.has(nxt) || BLOCK_BEFORE_RHET.has(prev) || nxt === 'כפולה')) continue;
      const k = skipTagsSpaces(text, h.end, 1, charMask);
      if (k < text.length) {
        insertions.push({
          at: h.end,
          mark: isRhet ? '.' : ',',
          rule: isRhet ? 'R2' : 'R4',
          marker: h.marker,
        });
      }
    }
  }
  if (!insertions.length) return { text, insertions: [] };
  // One mark per index (R2 after בתמיה and R3 before כלומר often share a point).
  const byAt = new Map();
  for (const ins of insertions) {
    const prev = byAt.get(ins.at);
    if (!prev) byAt.set(ins.at, ins);
    else if (prev.mark === ins.mark) continue;
    else if (ins.mark === '.' && prev.mark === ',') byAt.set(ins.at, ins); // prefer period
  }
  const unique = [...byAt.values()].sort((a, b) => b.at - a.at || a.rule.localeCompare(b.rule));
  let out = text;
  const applied = [];
  for (const ins of unique) {
    out = out.slice(0, ins.at) + ins.mark + out.slice(ins.at);
    applied.push(ins);
  }
  applied.reverse();
  return { text: out, insertions: applied };
}

export function identityHash(s, sha256) {
  return sha256(stripPunct(s));
}

/**
 * Copy newly added clause punctuation from display onto a letter-aligned say string.
 * Inserts marks after the letter's niqqud/ole cluster. Never deletes say marks.
 */
export function transferPunct(display, say) {
  if (typeof display !== 'string' || typeof say !== 'string') {
    return { ok: false, reason: 'type', say, transferred: 0 };
  }
  const dLetters = collectLetters(display, true);
  const sLetters = collectLetters(say, false);
  if (dLetters.map(x => x.ch).join('') !== sLetters.map(x => x.ch).join('')) {
    return { ok: false, reason: 'letters-differ', say, transferred: 0 };
  }
  const jobs = [];
  for (let k = 0; k < dLetters.length; k++) {
    const desired = punctAfter(display, dLetters[k].i, true);
    if (!desired.length) continue;
    const existing = punctAfter(say, sLetters[k].i, false);
    const missing = [...desired].filter(m => !existing.includes(m));
    if (!missing.length) continue;
    // If say already has a different clause mark at this letter, do not add more.
    if (existing.length && missing.length) continue;
    const insertAt = endOfCluster(say, sLetters[k].i);
    jobs.push({ at: insertAt, marks: missing.join('') });
  }
  // leading punct before first letter (rare)
  const leadD = punctAfterLead(display, dLetters[0]?.i ?? display.length, true);
  const leadS = punctAfterLead(say, sLetters[0]?.i ?? say.length, false);
  if (leadD && !leadS && !punctBeforeFirstHasMark(say, sLetters[0]?.i ?? 0)) {
    jobs.push({ at: 0, marks: leadD });
  }
  if (!jobs.length) return { ok: true, reason: 'already', say, transferred: 0 };
  jobs.sort((a, b) => b.at - a.at);
  let out = say;
  let transferred = 0;
  for (const j of jobs) {
    out = out.slice(0, j.at) + j.marks + out.slice(j.at);
    transferred += j.marks.length;
  }
  if (hebrewLetters(out) !== hebrewLetters(say)) {
    return { ok: false, reason: 'transfer-changed-letters', say, transferred: 0 };
  }
  return { ok: true, reason: 'transferred', say: out, transferred };
}

function collectLetters(s, skipTags) {
  const mask = skipTags ? tagCharMask(s) : new Uint8Array(s.length);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (mask[i]) continue;
    if (HEB_RE.test(s[i])) out.push({ i, ch: s[i] });
  }
  return out;
}

function nextLetterIndex(s, from, skipTags) {
  const mask = skipTags ? tagCharMask(s) : new Uint8Array(s.length);
  for (let i = from + 1; i < s.length; i++) {
    if (mask[i]) continue;
    if (HEB_RE.test(s[i])) return i;
  }
  return s.length;
}

function punctAfter(s, letterIndex, skipTags) {
  const until = nextLetterIndex(s, letterIndex, skipTags);
  const mask = skipTags ? tagCharMask(s) : new Uint8Array(s.length);
  const marks = [];
  for (let i = letterIndex + 1; i < until; i++) {
    if (mask[i] || NIQ_RE.test(s[i]) || /\s/.test(s[i])) continue;
    if (PUNCT_CHARS.includes(s[i])) marks.push(s[i]);
    // stop at other visible non-punct (quotes, etc.) so we don't cross a word
    else if (!GERESH_RE.test(s[i])) break;
  }
  return marks;
}

function punctAfterLead(s, firstLetter, skipTags) {
  const mask = skipTags ? tagCharMask(s) : new Uint8Array(s.length);
  const marks = [];
  for (let i = 0; i < firstLetter; i++) {
    if (mask[i] || NIQ_RE.test(s[i]) || /\s/.test(s[i])) continue;
    if (PUNCT_CHARS.includes(s[i])) marks.push(s[i]);
  }
  return marks.join('');
}

function punctBeforeFirstHasMark(s, firstLetter) {
  return [...s.slice(0, firstLetter)].some(ch => PUNCT_CHARS.includes(ch));
}

function endOfCluster(s, letterIndex) {
  let i = letterIndex + 1;
  while (i < s.length && NIQ_RE.test(s[i])) i++;
  while (i < s.length && GERESH_RE.test(s[i])) i++;
  while (i < s.length && PUNCT_CHARS.includes(s[i])) i++;
  return i;
}

export function loadShipped107(snapPath, fs) {
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const set = new Set();
  for (const r of snap.rows || []) set.add(`${r.file}#${r.seg}#${r.idx}`);
  return { snap, set };
}

export function commentKey(file, seg, idx) {
  return `${file}#${seg}#${idx}`;
}
