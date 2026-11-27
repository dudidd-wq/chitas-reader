// Live highlight of the text currently being spoken in the reader (t361u / t362u).
// Word-level tracking is not used: Web Speech onboundary is uneven for Hebrew,
// Piper has no word timestamps, and the speech string (prepareForTTS) is not the displayed HTML.
// t362u: enlarge the active chunk, and in long commentary (Rashi and similar) mark
// about two visual lines at a time, split at the lemma and punctuation.
// Sub-utterances are slices of already-prepared speech (after prepareSpeechForTTS and
// pauseChunks). Concatenation equals the prepared text; spoken phonemes are not rewritten.

export const FOLLOW_PAUSE_MS = 4000;
export const SPEAK_SIZES = ['off', 'mid', 'large'];
export const DEFAULT_SPEAK_SIZE = 'mid';
export const SPEAK_SCALE = { off: 1, mid: 1.2, large: 1.35 };
/** ~2 lines of Rashi at 320px with the default reading size. */
export const DEFAULT_LETTER_BUDGET = 44;

export function shouldFollow({ enabled, now = Date.now(), pausedUntil = 0 } = {}) {
  return !!enabled && !(Number.isFinite(pausedUntil) && now < pausedUntil);
}

export function nextPauseUntil(now = Date.now(), ms = FOLLOW_PAUSE_MS) {
  return now + ms;
}

export function sanitizeSpeakSize(v) {
  return SPEAK_SIZES.includes(v) ? v : DEFAULT_SPEAK_SIZE;
}

export const lettersOf = s => (String(s).match(/[א-ת]/g) || []).length;

export function letterBudget(el, lines = 2) {
  if (!el || typeof getComputedStyle !== 'function' || !el.clientWidth) return DEFAULT_LETTER_BUDGET;
  const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  const ch = Math.max(8, fs * 0.55);
  return Math.max(24, Math.min(80, Math.round((el.clientWidth / ch) * lines)));
}

const ETC = "וגו['׳]?|וגומר|וכו['׳]?";
const DELIM = new RegExp(`(?:${ETC})[.,;:'׳]*\\s*|[.:;?!]\\s*|,\\s*`, 'g');
const ENDS_ETC = /(?:וגו['׳]?|וגומר|וכו['׳]?)[.,;:'׳]*\s*$/;

/** Split plain text at the lemma/punctuation boundaries, keeping each delimiter with the text before it.
 *  Does not split inside parentheses, so a citation such as (בראשית רבה א, ו) stays in one atom. */
export function splitAtoms(text) {
  const t = String(text ?? '');
  if (!t) return [];
  const atoms = [];
  let last = 0, depth = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth) continue;
    DELIM.lastIndex = i;
    const m = DELIM.exec(t);
    if (!m || m.index !== i) continue;
    const end = m.index + m[0].length;
    const piece = t.slice(last, end);
    if (piece) atoms.push(piece);
    last = end;
    i = end - 1;
  }
  if (last < t.length) atoms.push(t.slice(last));
  return atoms;
}

function depthOf(s) {
  let d = 0;
  for (const ch of s) {
    if (ch === '(') d++;
    else if (ch === ')') d = Math.max(0, d - 1);
  }
  return d;
}

function splitLongAtom(p, maxLetters) {
  const n = lettersOf(p);
  if (n <= Math.ceil(maxLetters * 1.25)) return [p];
  const out = [];
  let buf = '', count = 0;
  for (const w of p.split(/(?<=\s+)/)) {
    const k = lettersOf(w);
    // Do not start a new piece in the middle of parentheses (citations stay whole).
    if (buf && count + k > maxLetters && depthOf(buf) === 0) { out.push(buf); buf = w; count = k; }
    else { buf += w; count += k; }
  }
  if (buf) out.push(buf);
  return out.length ? out : [p];
}

/** Pack atoms into groups of about two lines (letter budget). Never drops or adds characters. */
export function packAtoms(atoms, maxLetters = DEFAULT_LETTER_BUDGET) {
  const packed = [];
  let buf = '';
  for (const a of atoms) {
    if (!buf) { buf = a; continue; }
    // After "וגו" start a new chunk (the lemma stays with its "וגו", the gloss follows).
    if (ENDS_ETC.test(buf) && lettersOf(buf) >= 6) { packed.push(buf); buf = a; continue; }
    if (lettersOf(buf) + lettersOf(a) <= maxLetters) buf += a;
    else { packed.push(buf); buf = a; }
  }
  if (buf) packed.push(buf);
  return packed.flatMap(p => splitLongAtom(p, maxLetters));
}

/** Split display text into packed chunks. `packAtoms(splitAtoms(s)).join('') === s`. */
export function splitFollowText(text, maxLetters = DEFAULT_LETTER_BUDGET) {
  return packAtoms(splitAtoms(text), maxLetters);
}

function cumulativeLetters(arr) {
  const ends = [];
  let n = 0;
  for (const x of arr) { n += lettersOf(x); ends.push(n); }
  return ends;
}

/** Map speech chunks onto display chunks when cites or vocalisation make the counts differ. */
export function alignChunks(speechChunks, displayChunks) {
  if (!speechChunks.length) return [];
  if (speechChunks.length === displayChunks.length) {
    return speechChunks.map((speech, hi) => ({ speech, hi }));
  }
  const dispEnds = cumulativeLetters(displayChunks);
  const last = Math.max(0, displayChunks.length - 1);
  const out = [];
  let sLet = 0, di = 0;
  for (const speech of speechChunks) {
    sLet += lettersOf(speech);
    while (di < last && dispEnds[di] < sLet) di++;
    out.push({ speech, hi: di });
  }
  return out;
}

export function unwrapHlChunks(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('span.hl-chunk').forEach(sp => {
    const p = sp.parentNode;
    if (!p) return;
    while (sp.firstChild) p.insertBefore(sp.firstChild, sp);
    p.removeChild(sp);
    p.normalize();
  });
  if (root.dataset) delete root.dataset.hl;
  root.querySelectorAll?.('[data-hl]')?.forEach(n => { if (n !== root) delete n.dataset.hl; });
}

/** Clone an element and unwrap `.hl-chunk` wrappers so speech helpers can read the original HTML. */
export function cloneWithoutFollowChunks(el) {
  if (!el?.cloneNode) return null;
  const c = el.cloneNode(true);
  c.querySelectorAll('span.hl-chunk').forEach(sp => {
    const p = sp.parentNode;
    if (!p) return;
    while (sp.firstChild) p.insertBefore(sp.firstChild, sp);
    p.removeChild(sp);
  });
  c.normalize();
  return c;
}

function wrapTextNodes(root, start, end, id) {
  if (end <= start || !root?.ownerDocument) return;
  const doc = root.ownerDocument;
  const pieces = [];
  const tw = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let i = 0;
  while (tw.nextNode()) {
    const n = tw.currentNode, len = n.data.length;
    const a = Math.max(0, start - i);
    const b = Math.min(len, end - i);
    if (b > a) pieces.push({ n, a, b });
    i += len;
    if (i >= end) break;
  }
  for (const { n, a, b } of pieces) {
    let node = n;
    if (b < node.data.length) node.splitText(b);
    if (a > 0) node = node.splitText(a);
    if (node.parentNode?.classList?.contains('hl-chunk') && node.parentNode.dataset.hl === id) continue;
    const span = doc.createElement('span');
    span.className = 'hl-chunk';
    span.dataset.hl = id;
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
  }
}

/** Existing follow metadata already on a host (so a later ttsSegments does not unwrap a live highlight). */
export function existingFollow(el) {
  if (!el) return [];
  const ids = [];
  if (el.dataset?.hl) ids.push(el.dataset.hl);
  el.querySelectorAll?.('span.hl-chunk[data-hl]')?.forEach(n => {
    if (n.dataset.hl && !ids.includes(n.dataset.hl)) ids.push(n.dataset.hl);
  });
  return ids.map(id => {
    const nodes = el.dataset?.hl === id ? [el] : [...(el.querySelectorAll?.(`[data-hl="${CSS.escape(id)}"]`) || [])];
    const text = nodes.map(n => n.textContent || '').join('') || (ids.length === 1 ? (el.textContent || '') : '');
    return { id, letters: lettersOf(text) };
  });
}

/** Wrap an element's display text into `.hl-chunk` spans. Idempotent. Does not rewrite speech. */
export function prepareFollowChunks(el, { idPrefix, maxLetters } = {}) {
  if (!el) return [];
  const already = existingFollow(el);
  if (already.length) return already;
  const display = el.textContent || '';
  const budget = maxLetters || letterBudget(el);
  const dispChunks = splitFollowText(display, budget);
  const prefix = idPrefix || 'hl';
  if (dispChunks.length <= 1) {
    const id = `${prefix}-0`;
    el.dataset.hl = id;
    return [{ id, letters: lettersOf(display) }];
  }
  let off = 0;
  const out = [];
  for (let i = 0; i < dispChunks.length; i++) {
    const chunk = dispChunks[i];
    const id = `${prefix}-${i}`;
    wrapTextNodes(el, off, off + chunk.length, id);
    off += chunk.length;
    out.push({ id, letters: lettersOf(chunk) });
  }
  return out;
}

/** Letter-aligned cuts of already-prepared speech that map onto display follow chunks.
 *  The cuts cover [0, prepared.length) without gaps or overlaps. */
export function followCuts(prepared, follow) {
  const text = String(prepared ?? '');
  const items = Array.isArray(follow) ? follow.filter(x => x && x.id) : [];
  if (!text) return [];
  if (!items.length) return [{ start: 0, end: text.length, id: null }];
  if (items.length === 1) return [{ start: 0, end: text.length, id: items[0].id }];

  const dispLetters = items.map(it => Number(it.letters) || lettersOf(it.text || ''));
  const dispTotal = dispLetters.reduce((a, b) => a + b, 0);
  const speechTotal = lettersOf(text);
  if (!dispTotal || !speechTotal) return [{ start: 0, end: text.length, id: items[0].id }];

  const afterLetter = new Array(speechTotal + 1);
  afterLetter[0] = 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[א-ת]/.test(text[i])) { n++; afterLetter[n] = i + 1; }
  }
  if (afterLetter[speechTotal] == null) afterLetter[speechTotal] = text.length;

  function snap(off, lo, hi) {
    if (off <= lo || off >= hi) return off;
    for (let d = 0; d <= 16; d++) {
      for (const j of [off, off - d, off + d]) {
        if (j > lo && j < hi && /[\s.,;:?!]/.test(text[j - 1])) return j;
      }
    }
    return off;
  }

  const cuts = [];
  let start = 0, accDisp = 0;
  for (let i = 0; i < items.length; i++) {
    accDisp += dispLetters[i];
    let letterTarget = i === items.length - 1 ? speechTotal : Math.round(accDisp * speechTotal / dispTotal);
    letterTarget = Math.max(0, Math.min(speechTotal, letterTarget));
    let end = letterTarget === 0 ? start : (afterLetter[letterTarget] ?? text.length);
    if (i < items.length - 1) end = snap(end, start + 1, text.length);
    if (end < start) end = start;
    if (i === items.length - 1) end = text.length;
    if (end > start) cuts.push({ start, end, id: items[i].id });
    start = Math.max(start, end);
  }
  if (start < text.length) {
    if (cuts.length) cuts[cuts.length - 1].end = text.length;
    else cuts.push({ start, end: text.length, id: items.at(-1).id });
  }
  // Do not emit a letters-free slice (e.g. a leftover '.') — it can be a too-short Web Speech utterance.
  const merged = [];
  for (const cut of cuts) {
    const piece = text.slice(cut.start, cut.end);
    if (!lettersOf(piece) && merged.length) merged[merged.length - 1].end = cut.end;
    else merged.push({ ...cut });
  }
  if (merged.length >= 2 && !lettersOf(text.slice(merged[0].start, merged[0].end))) {
    merged[1].start = merged[0].start;
    merged.shift();
  }
  return merged;
}

/** Split already-prepared pauseChunks at followCuts. Concatenation and original gaps (at pause
 *  boundaries) are preserved; new mid-chunk slices get gap 0. */
export function applyFollowCuts(pauseList, cuts) {
  const list = Array.isArray(pauseList) ? pauseList : [];
  const prepared = list.map(x => x.c).join('');
  const segs = (Array.isArray(cuts) && cuts.length) ? cuts : [{ start: 0, end: prepared.length, id: null }];
  const out = [];
  let base = 0;
  for (const item of list) {
    const c = item.c, end = base + c.length;
    const here = segs.filter(k => k.end > base && k.start < end);
    if (!here.length) {
      out.push({ ...item, c, hl: item.hl ?? null });
      base = end;
      continue;
    }
    for (let i = 0; i < here.length; i++) {
      const a = Math.max(0, here[i].start - base);
      const b = Math.min(c.length, here[i].end - base);
      if (b <= a) continue;
      const lastOfPause = here[i].end >= end;
      out.push({
        ...item,
        c: c.slice(a, b),
        gap: lastOfPause ? item.gap : 0,
        hl: here[i].id ? { id: here[i].id } : (item.hl ?? null),
      });
    }
    base = end;
  }
  return out;
}

/** Map pauseChunks of one already-prepared part onto display follow chunks. */
export function followPauseChunks(pauseList, follow) {
  const list = Array.isArray(pauseList) ? pauseList : [];
  const prepared = list.map(x => x.c).join('');
  return applyFollowCuts(list, followCuts(prepared, follow));
}

export function clearHlNow(root = (typeof document !== 'undefined' ? document : null)) {
  root?.querySelectorAll?.('.hl-now').forEach(e => e.classList.remove('hl-now'));
  if (root?.classList?.contains('hl-now')) root.classList.remove('hl-now');
}

/** Clear every live highlight in the document, then mark this id.
 *  A scoped `root` still clears the rest of the document so a previous segment cannot stay highlighted. */
export function applyHlNow(id, root = (typeof document !== 'undefined' ? document : null)) {
  const doc = root?.ownerDocument || (root?.querySelectorAll && !root.ownerDocument ? root : null) || (typeof document !== 'undefined' ? document : null);
  clearHlNow(doc);
  if (!id || !root?.querySelectorAll) return null;
  const nodes = [...root.querySelectorAll(`[data-hl="${CSS.escape(id)}"]`)];
  if (root.dataset?.hl === id && !nodes.includes(root)) nodes.unshift(root);
  nodes.forEach(n => n.classList.add('hl-now'));
  const visible = nodes.find(n => !n.classList?.contains('sr') && !n.closest?.('.sr'));
  return visible || nodes[0] || null;
}
