// JPS 1917 (public domain) for Torah + Psalms from the Sefaria API v3 → /tmp/xchk/jps.json (Hebrew verse numbering).
import fs from 'node:fs';
process.chdir('/tmp/xchk');
const CH = { Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Psalms: 150 };
const out = fs.existsSync('jps.json') ? JSON.parse(fs.readFileSync('jps.json')) : {};
const V = encodeURIComponent('english|The Holy Scriptures: A New Translation (JPS 1917)');
for (const [b, n] of Object.entries(CH)) for (let c = 1; c <= n; c++) {
  if (out[`${b} ${c}`]) continue;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(`https://www.sefaria.org/api/v3/texts/${b}.${c}?version=${V}`); if (r.ok) { const j = await r.json(); out[`${b} ${c}`] = j.versions[0].text; break; } } catch {} await new Promise(r => setTimeout(r, 2000)); }
}
fs.writeFileSync('jps.json', JSON.stringify(out)); console.log(Object.keys(out).length);
