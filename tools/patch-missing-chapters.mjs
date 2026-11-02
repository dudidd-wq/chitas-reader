// Some chapters are absent from the primary Rambam edition on Sefaria (e.g. Chametz uMatzah ch. 9 – the Haggadah text).
// This compares every book's chapter count with Sefaria's index and fills missing chapters from an allowed open version,
// recording each filled chapter in data/sources.json (rambamChapterOverrides). Never edits text.
import fs from 'node:fs';
const D = new URL('../site/data/', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('rambam/index.json', D)));
const sources = JSON.parse(fs.readFileSync(new URL('sources.json', D)));
const ALLOWED = ['Public Domain', 'CC0', 'CC-BY', 'CC-BY-SA'];
// Mechon Mamre versions are excluded: its site forbids reuse on other websites (https://mechon-mamre.org/copy.htm).
const PREF = ['Torat Emet 363', 'Torat Emet 370', 'Wikisource Mishneh Torah'];
const j = async u => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u); if (r.ok) return r.json(); } catch {} await new Promise(r => setTimeout(r, 1500)); } throw new Error(u); };
sources.rambamChapterOverrides ||= {};
for (const [name, meta] of Object.entries(idx)) {
  if (meta.depth !== 2) continue;
  const ix = await j(`https://www.sefaria.org/api/v2/index/${encodeURIComponent('Mishneh Torah, ' + name)}`);
  const n = ix.schema?.lengths?.[0];
  if (!n || n <= meta.chapters.length) continue;
  for (let c = meta.chapters.length + 1; c <= n; c++) {
    const t = await j(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(`Mishneh Torah, ${name}.${c}`)}?version=hebrew%7Call`);
    const v = PREF.map(p => t.versions.find(x => x.versionTitle === p)).find(x => x && ALLOWED.includes(x.license) && !/mechon-mamre/i.test(x.versionSource || '') && x.text?.length);
    if (!v) { console.log('NO allowed version for', name, c); continue; }
    fs.writeFileSync(new URL(`rambam/${meta.slug}/${c}.json`, D), JSON.stringify({ s: v.text }));
    meta.chapters[c - 1] = v.text.length;
    sources.rambamChapterOverrides[`${name} ${c}`] = { versionTitle: v.versionTitle, license: v.license, versionSource: v.versionSource };
    console.log('filled', name, c, v.versionTitle, v.license, v.text.length);
  }
}
fs.writeFileSync(new URL('rambam/index.json', D), JSON.stringify(idx));
fs.writeFileSync(new URL('sources.json', D), JSON.stringify(sources, null, 1));
