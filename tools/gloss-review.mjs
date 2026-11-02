// Curated allow-list for the glossary (tools/gloss-review.json).
// Every automatically extracted Wiktionary entry was reviewed by hand against its verse; only entries marked
// "keep" (verbatim) or "adapt" (a softened wording, flagged as such in the UI) are published. Anything the builder
// produces that is not in the review file — or whose definition text changed since review — is NOT published
// until it is reviewed. Usage: node tools/gloss-review.mjs   (rewrites site/data/glossary.json from the review)
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
export function rawFromReview(review = REVIEW) {
  const raw = {};
  for (const e of review.entries) (raw[e.ref] ??= {})[e.form] = { g: e.g, l: e.l, src: e.src };
  return raw;
}
export function buildGlossary(raw, meta) {
  const { verses, unreviewed } = applyReview(raw);
  const n = Object.values(verses).reduce((a, w) => a + Object.keys(w).length, 0);
  const c = d => REVIEW.entries.filter(e => e.decision === d).length;
  return { meta: { ...meta, curated: { reviewed: REVIEW.meta.reviewed, candidates: REVIEW.entries.length, kept: c('keep'), adapted: c('adapt'), rejected: c('reject'), unreviewedSkipped: unreviewed, published: n } }, verses };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const f = new URL('site/data/glossary.json', root);
  const old = JSON.parse(fs.readFileSync(f));
  const res = buildGlossary(rawFromReview(), { ...old.meta, curated: undefined });
  fs.writeFileSync(f, JSON.stringify(res));
  console.log(JSON.stringify(res.meta.curated));
}
