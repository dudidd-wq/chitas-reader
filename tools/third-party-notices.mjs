// Writes site/THIRD-PARTY-NOTICES.txt: licence and copyright notices for everything bundled into site/js/vendor/hebcal.js
// (run by `npm run vendor`; the BSD-2 clause 2 and the (L)GPL require these notices to travel with the binary/minified form).
import fs from 'node:fs';
const P = ['core', 'hdate', 'learning', 'leyning', 'noaa'];
const NM = new URL('../node_modules/@hebcal/', import.meta.url);
let out = `THIRD-PARTY NOTICES – chitas-reader
====================================

site/js/vendor/hebcal.js is a minified esbuild bundle of the following npm packages (unmodified).
Their source code is available at https://github.com/hebcal and on https://www.npmjs.com/.
The site's own code is GPL-2.0-or-later (see LICENSE in the repository). Fonts: SIL OFL 1.1, see fonts/licenses/.

`;
const sum = P.map(p => { const j = JSON.parse(fs.readFileSync(new URL(`${p}/package.json`, NM))); return { p, j }; });
for (const { p, j } of sum) {
  const by = [j.author?.name || j.author, ...(j.contributors || []).map(c => c.name || c)].filter(Boolean).map(s => String(s).replace(/\s*\(.*\)$/, '')).join(', ');
  out += `- @hebcal/${p} ${j.version} – ${j.license} – ${j.repository?.url || j.homepage || ''}\n  Authors: ${by}\n`;
}
for (const { p, j } of sum) out += `\n\n======== @hebcal/${p} ${j.version} (${j.license}) ========\n\n` + fs.readFileSync(new URL(`${p}/LICENSE`, NM), 'utf8');
// bundled dependency of @hebcal/noaa (used for the zmanim; a ponyfill – it does not touch globalThis.Temporal)
var TP = JSON.parse(fs.readFileSync(new URL('../node_modules/temporal-polyfill/package.json', import.meta.url)));
for (const n of ['temporal-polyfill', 'temporal-utils']) {   // temporal-spec (Apache-2.0) is TypeScript types only: nothing of it is in the bundle
  const j = JSON.parse(fs.readFileSync(new URL(`../node_modules/${n}/package.json`, import.meta.url)));
  out += `\n\n======== ${n} ${j.version} (${j.license}) – ${j.author?.name || ''} – https://github.com/fullcalendar/temporal-polyfill ========\n\n` + fs.readFileSync(new URL(`../node_modules/${n}/LICENSE`, import.meta.url), 'utf8');
}
fs.writeFileSync(new URL('../site/THIRD-PARTY-NOTICES.txt', import.meta.url), out);
console.log('wrote THIRD-PARTY-NOTICES.txt', out.length);
// licence header at the top of the bundle (idempotent)
const B = new URL('../site/js/vendor/hebcal.js', import.meta.url);
const banner = `/*! Bundle of ${sum.map(({ p, j }) => `@hebcal/${p} ${j.version} (${j.license})`).join(', ')}, temporal-polyfill ${TP.version} (MIT, Adam Shaw).\n *  Copyright (c) Michael J. Radwin, Danny Sadinoff and the Hebcal contributors. BSD-2-Clause packages: Copyright (c) 2020-2026, hebcal. All rights reserved.\n *  Full licence texts and notices: ../../THIRD-PARTY-NOTICES.txt – source: https://github.com/hebcal */\n`;
const js = fs.readFileSync(B, 'utf8').replace(/^\/\*! Bundle of @hebcal[\s\S]*?\*\/\n/, '');
fs.writeFileSync(B, banner + js);
