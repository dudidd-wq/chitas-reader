// Builds the local search index: site/data/search/shards.json + one shard per book (site/data/search/<id>.json).
// Every library chapter is built with the reader's own builders (site/js/library.js → texts.js), so the segment ids
// in the index are exactly the reader's (deep links #/lib/<path>?s=<id>). Run after any change to the text data,
// then `npm run data-version`.   Usage: node tools/build-search.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
const SITE = new URL('../site/', import.meta.url).pathname, OUT = SITE + 'data/search/';
globalThis.fetch = async p => { try { const t = fs.readFileSync(SITE + p, 'utf8'); return { ok: true, json: async () => JSON.parse(t) }; } catch { return { ok: false }; } };
const { family, libDoc, RAMBAM_SEFER, FAMILIES } = await import(SITE + 'js/library.js');
const { indexText } = await import(SITE + 'js/search.js');
const { siddurOrder, buildSiddurDoc } = await import(SITE + 'js/texts.js');
const { BOOK_HE } = await import(SITE + 'js/calendar.js');

export const INPUT_DIRS = ['torah', 'tehillim', 'tanya', 'rambam', 'mitzvot', 'tolt', 'ravyomi', 'hayomyom', 'siddur'];
/** hash of the text data the index is built from (tests/search.test.mjs checks the index is not stale) */
export function sourceHash() {
  const h = crypto.createHash('sha256');
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = d + '/' + f.name; if (f.isDirectory()) walk(p); else if (f.name.endsWith('.json')) { h.update(p.slice(SITE.length)); h.update(fs.readFileSync(p)); } } };
  for (const d of INPUT_DIRS) walk(SITE + 'data/' + d);
  for (const f of ['rambam-errata.json']) h.update(fs.readFileSync(SITE + 'data/' + f));
  for (const f of ['library.js', 'search.js', 'texts.js', 'divine.js']) h.update(fs.readFileSync(SITE + 'js/' + f));
  return h.digest('hex').slice(0, 16);
}

async function main() {
  const shards = [];
  const add = async (id, fam, he, leaves) => {
    const ch = [], ids = [], lines = [];
    for (const l of leaves) {
      let n = 0;
      const push = (sid, html) => { const t = indexText(html); if (t.replace(/[^`a-z]/g, '').length < 2) return; ids.push(sid); lines.push(t); n++; };
      if (l.siddur) { const d = await buildSiddurDoc(l.book, l.n); for (const b of d.blocks) if (b.type === 'p') push(b.id, b.text); }
      else {
        const { doc } = await libDoc(l.id);
        for (const b of doc.blocks) {
          if ((b.type === 'v' || b.type === 'p') && b.id) { push(b.id, b.text); (b.sub || []).forEach(r => push('r' + b.id, r)); }
        }
      }
      if (n) ch.push([l.siddur ? `s/${l.book}/${l.n}` : l.id, l.label, n]);
    }
    const json = { id, fam, he, ch, ids, t: lines.join('\n') };
    const s = JSON.stringify(json);
    fs.writeFileSync(OUT + id + '.json', s);
    shards.push({ id, fam, he, bytes: Buffer.byteLength(s), segs: ids.length });
    console.log(id.padEnd(22), String(ids.length).padStart(6), 'segs', (Buffer.byteLength(s) / 1024).toFixed(0).padStart(6), 'KB');
  };
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const T = {}; for (const f of FAMILIES.filter(f => !f.href)) T[f.id] = await family(f.id);
  for (const b of Object.keys(BOOK_HE)) await add(`torah-${b}`, 'torah', `חומש ${BOOK_HE[b]} ורש״י`, T.torah.leaves.filter(l => l.id.startsWith(`torah/${b}/`)));
  await add('tehillim', 'tehillim', 'תהילים', T.tehillim.leaves.filter(l => l.seq === 'tehillim/c'));
  await add('tanya', 'tanya', 'תניא', T.tanya.leaves);
  const rIdx = JSON.parse(fs.readFileSync(SITE + 'data/rambam/index.json', 'utf8')), slugs = Object.values(rIdx).map(m => m.slug);
  for (const [i, s] of RAMBAM_SEFER.entries()) { const mine = new Set(slugs.slice(s.a, s.b + 1)); await add(`rambam-${i}`, 'rambam', `רמב״ם – ${s.he}`, T.rambam.leaves.filter(l => mine.has(l.id.split('/')[1]))); }
  await add('mitzvot', 'mitzvot', 'ספר המצוות', T.mitzvot.leaves);
  const toltBooks = T.tolt.root.kids;
  for (const [i, g] of toltBooks.entries()) await add(`tolt-${i + 1}`, 'tolt', `תורה אור ולקוטי תורה – ${g.he}`, g.kids.flatMap(w => w.kids));
  await add('hayomyom', 'hayomyom', 'היום יום', T.hayomyom.leaves);
  await add('rav', 'rav', 'שולחן ערוך אדמו״ר הזקן', T.rav.leaves);
  await add('siddur', 'siddur', 'סידור', (await siddurOrder()).map(s => ({ siddur: true, book: s.book, n: s.n, label: `${s.bookHe} – ${s.he}` })));
  const meta = { v: 1, source: sourceHash(), bytes: shards.reduce((a, s) => a + s.bytes, 0), segs: shards.reduce((a, s) => a + s.segs, 0), shards };
  fs.writeFileSync(OUT + 'shards.json', JSON.stringify(meta, null, 1) + '\n');
  console.log('total', meta.segs, 'segments,', (meta.bytes / 1048576).toFixed(2), 'MB in', shards.length, 'shards');
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
