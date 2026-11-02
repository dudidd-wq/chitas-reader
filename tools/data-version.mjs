// Compute a content hash of the lazily-cached text data and write it into site/sw.js (DATA_VERSION), plus a per-file
// manifest (site/data/manifest.json) so that after a rebuild the service worker keeps the user's saved texts and
// re-fetches only the files that changed (round 4). Run after every data rebuild (`npm run data-version`);
// tests/sw-data.test.mjs fails if either is stale, so changed texts can never be served from an old cache.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = new URL('../site/', import.meta.url).pathname;
export function dataHash() {
  const h = crypto.createHash('sha256');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) { h.update(path.relative(root, p)); h.update(fs.readFileSync(p)); }
  });
  for (const d of ['torah', 'tehillim', 'tanya', 'rambam', 'mitzvot', 'siddur']) walk(path.join(root, 'data', d));
  return h.digest('hex').slice(0, 12);
}
/** { version, files: { "torah/Genesis/1.json": "<sha256, 16 hex>" } } – the hash the SW checks a re-fetched file against */
export function dataManifest() {
  const files = {};
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.json')) files[path.relative(path.join(root, 'data'), p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
  });
  for (const d of ['torah', 'tehillim', 'tanya', 'rambam', 'mitzvot', 'siddur']) walk(path.join(root, 'data', d));
  return { version: dataHash(), files };
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const f = path.join(root, 'sw.js'), v = dataHash();
  fs.writeFileSync(path.join(root, 'data', 'manifest.json'), JSON.stringify(dataManifest()));
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/const DATA_VERSION = '[^']*';/, `const DATA_VERSION = '${v}';`));
  console.log('DATA_VERSION', v);
}
