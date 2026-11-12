// 1.0.94: applies the siddur proofreading list (tools/data/siddur-proofread-194.json) to site/data/siddur – a post-build
// patch on the built JSON (the Open Siddur rebuild is not reproducible byte-for-byte, so the fixes are not in build-siddur).
// Every fix replaces a whole Hebrew token/phrase (no letter or niqqud mark next to it) in one paragraph or table cell and
// must find exactly `n` occurrences; any mismatch aborts before anything is written.
// Usage: node tools/siddur-proofread.mjs [--check|--pending]   (--check: only verify the list is applied;
// --pending: apply only the entries not yet in the data – for fixes appended to the list after it was first applied)
import fs from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
export const LIST = JSON.parse(fs.readFileSync(root + 'tools/data/siddur-proofread-194.json', 'utf8'));
const H = '\u0591-\u05C7\u05D0-\u05EA';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const tokenRe = old => old === ':' ? /:(?=[א-ת])/g : new RegExp(`(?<![${H}])${esc(old)}(?![${H}])`, 'gu');

/** [holder, index] of the string a loc points at: book/n/block or book/n/block/row/col (table cell). */
export function target(files, loc) {
  const [book, n, bi, ri, ci] = loc.split('/'), d = files[`${book}/${n}`], b = d?.b?.[+bi];
  if (!b) throw new Error(`${loc}: no such block`);
  if (ri === undefined) { if (b[0] !== 'p') throw new Error(`${loc}: not a paragraph`); return [b, 1]; }
  const cell = b[1]?.[+ri]?.[+ci];
  if (!Array.isArray(cell)) throw new Error(`${loc}: no such cell`);
  return [cell, 1];
}

export function applyFixes(files, fixes = LIST.fixes) {
  const errors = [];
  for (const f of fixes) {
    const [h, i] = target(files, f.loc), re = tokenRe(f.old), n = (h[i].match(re) || []).length;
    if (n !== f.n) { errors.push(`${f.loc}: "${f.old}" found ${n}×, expected ${f.n}`); continue; }
    h[i] = h[i].replace(re, () => f.new);
  }
  return errors;
}

/** A fix is in place when its old form is gone from its string (or survives only inside the new form). */
export function pending(files, fixes = LIST.fixes) {
  const out = [];
  for (const f of fixes) {
    const [h, i] = target(files, f.loc), re = tokenRe(f.old);
    const left = (h[i].match(re) || []).length - (f.old === ':' ? 0 : (f.new.match(tokenRe(f.old)) || []).length * f.n);
    if (left > 0) out.push(f);
  }
  return out;
}

export function loadFiles() {
  const D = root + 'site/data/siddur/', files = {};
  for (const book of fs.readdirSync(D)) {
    if (!fs.statSync(D + book).isDirectory()) continue;
    for (const f of fs.readdirSync(D + book)) if (/^\d+\.json$/.test(f)) files[`${book}/${f.slice(0, -5)}`] = JSON.parse(fs.readFileSync(D + book + '/' + f, 'utf8'));
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = loadFiles();
  if (process.argv.includes('--check')) {
    const p = pending(files);
    console.log(p.length ? `${p.length} fixes not applied, e.g. ${p[0].loc} ${p[0].old}` : `all ${LIST.fixes.length} fixes applied`);
    process.exit(p.length ? 1 : 0);
  }
  const todo = process.argv.includes('--pending') ? pending(files) : LIST.fixes;
  const before = JSON.stringify(files), errors = applyFixes(files, todo);
  if (errors.length) { console.error(errors.slice(0, 30).join('\n') + `\n${errors.length} mismatches – nothing written`); process.exit(1); }
  const orig = JSON.parse(before); let changed = 0;
  for (const [k, d] of Object.entries(files)) {
    if (JSON.stringify(d) === JSON.stringify(orig[k])) continue;
    const p = `${root}site/data/siddur/${k}.json`, raw = fs.readFileSync(p, 'utf8');
    // keep the file's own formatting (indentation) so the diff is only the text
    const ind = /^\{\n( +)/.exec(raw)?.[1].length ?? 0;
    fs.writeFileSync(p, JSON.stringify(d, null, ind || undefined) + (raw.endsWith('\n') ? '\n' : ''));
    changed++;
  }
  console.log(`applied ${todo.length} fixes (${todo.reduce((s, f) => s + f.n, 0)} occurrences) in ${changed} files`);
}
