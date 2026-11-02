// Curated allow-list for the glossary (tools/gloss-review.json) — the manual step of the two-check rule (verification/GLOSSARY-VERIFICATION.md).
// Every automatically extracted Wiktionary entry was reviewed by hand against its verse; only entries marked
// "keep" (verbatim) or "adapt" (a softened wording, flagged as such in the UI) are published. Anything the builder
// produces that is not in the review file — or whose definition text changed since review — is NOT published
// until it is reviewed.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
export const REVIEW = JSON.parse(fs.readFileSync(new URL('tools/gloss-review.json', root)));
export function applyReview(raw, review = REVIEW) {
  const idx = new Map(review.entries.map(e => [`${e.ref}|${e.form}`, e]));
  const out = {}; let unreviewed = 0;
  for (const [ref, ws] of Object.entries(raw)) for (const [form, e] of Object.entries(ws)) {
    // "form#k" = the k-th occurrence of a form repeated in the verse; an older review of "form" with the same
    // definition carries over (it was reviewed for that sense), a new sense for another occurrence needs its own review.
    const r = idx.get(`${ref}|${form}`) || (form.includes('#') ? idx.get(`${ref}|${form.split('#')[0]}`) : null);
    if (!r || r.g !== e.g) { unreviewed++; continue; }
    if (r.decision === 'keep') (out[ref] ??= {})[form] = { g: e.g, l: r.l, src: e.src };
    else if (r.decision === 'adapt') (out[ref] ??= {})[form] = { g: r.g2, l: r.l, src: e.src, adapted: 1 };
  }
  return { verses: out, unreviewed };
}
const XF = new URL('tools/gloss-xcheck.json', root);
// Two-check rule (round 3): only entries that passed the automated cross-check (same definition text) AND the manual review are published.
export function onlyCrossChecked(raw, xc = fs.existsSync(XF) ? JSON.parse(fs.readFileSync(XF)).entries : {}) {
  const out = {};
  for (const [ref, ws] of Object.entries(raw)) for (const [k, e] of Object.entries(ws)) { const x = xc[`${ref}|${k}`]; if (x && x.pass && x.g === e.g) (out[ref] ??= {})[k] = e; }
  return out;
}
export function buildGlossary(raw0, meta) {
  const raw = onlyCrossChecked(raw0);
  const survivors = Object.values(raw).reduce((a, w) => a + Object.keys(w).length, 0);
  const { verses, unreviewed } = applyReview(raw);
  const n = Object.values(verses).reduce((a, w) => a + Object.keys(w).length, 0);
  const c = d => REVIEW.entries.filter(e => e.decision === d).length;
  return { meta: { ...meta, curated: { reviewed: REVIEW.meta.reviewed, candidates: REVIEW.entries.length, kept: c('keep'), adapted: c('adapt'), rejected: c('reject'), unreviewedSkipped: unreviewed, published: n },
    manualReview: { survivorsOfBothChecks: survivors, rejectedByHand: survivors - n - unreviewed, notReviewedSoNotPublished: unreviewed, published: n } }, verses };
}
// The glossary is built only by tools/build-glossary.mjs (check a → gloss-xcheck.py check b → this manual review).
