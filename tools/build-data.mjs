// Build-time data fetcher: downloads open-licence Hebrew texts from the Sefaria API
// and writes static JSON under site/data/. Never runs in the browser.
// Usage: node tools/build-data.mjs [torah|tehillim|rambam|tanya|all]
import fs from 'node:fs';
import path from 'node:path';
import mt from '../node_modules/@hebcal/learning/dist/esm/mishnehTorah.json.js';

const OUT = 'site/data';
const API = 'https://www.sefaria.org/api/v3/texts/';
export const VERSIONS = {
  tanakh: 'Miqra according to the Masorah',
  rashi: "Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann, 1929-1934",
  rambam: 'Torat Emet 363',
  tanya: 'Kehot Publication Society',
};
export const RAMBAM_FALLBACK = ['Torat Emet 370', 'Mechon Mamre Mishneh Torah', 'Mechon-mamre Mishneh Torah', 'Mishneh Torah', 'Wikisource Mishneh Torah'];
// Only clearly open licences are accepted (CC-BY-NC only for the Tanya, flagged in the docs).
export const ALLOWED_LICENSES = ['Public Domain', 'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC'];
const sources = fs.existsSync(`${OUT}/sources.json`) ? JSON.parse(fs.readFileSync(`${OUT}/sources.json`, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchText(ref, version) {
  const url = API + encodeURIComponent(ref) + '?version=' + encodeURIComponent('hebrew|' + version);
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'chitas-reader-build/1.0 (static open-source study app)' } });
      if (r.ok) {
        const d = await r.json();
        const v = d.versions?.[0];
        if (!v || v.versionTitle !== version) { const e = new Error('version missing for ' + ref); e.fatal = true; throw e; }
        await sleep(250);
        if (!ALLOWED_LICENSES.includes(v.license)) { const e = new Error('licence not allowed: ' + v.license); e.fatal = true; throw e; }
        return { text: v.text, heRef: d.heRef, ref: d.ref, meta: { versionTitle: v.versionTitle, license: v.license, versionSource: v.versionSource, versionTitleInHebrew: v.versionTitleInHebrew || null } };
      }
      console.warn('HTTP', r.status, ref);
    } catch (e) { if (e.fatal) throw e; console.warn('retry', ref, e.message); }
    await sleep(1500 * (i + 1));
  }
  throw new Error('failed ' + ref);
}

// Keep only <b> (dibur hamatchil); drop footnotes, overlays, other tags; normalise spaces.
export function clean(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<sup class="footnote-marker">[\s\S]*?<\/sup>/g, '')
    .replace(/<i class="footnote">[\s\S]*?<\/i>/g, '')
    .replace(/<i [^>]*data-overlay[^>]*>\s*<\/i>/g, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<(?!\/?b>)[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&thinsp;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .trim();
}
const write = (p, obj) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj)); };
const record = (key, meta, extra = {}) => { sources[key] = { ...(sources[key] || {}), ...meta, ...extra, fetchedAt: new Date().toISOString().slice(0, 10) }; };

export const TORAH = [
  ['Genesis', 'בראשית'], ['Exodus', 'שמות'], ['Leviticus', 'ויקרא'], ['Numbers', 'במדבר'], ['Deuteronomy', 'דברים'],
];

async function torah() {
  const counts = {};
  for (const [book] of TORAH) {
    const t = await fetchText(book, VERSIONS.tanakh);
    let r;
    for (const ver of [VERSIONS.rashi, VERSIONS.rashi.replace(', 1929-1934', ' -- corrected vocalization')]) {
      try { r = await fetchText('Rashi on ' + book, ver); break; } catch (e) { console.warn('rashi fallback', book); }
    }
    record('tanakh', t.meta, { sefariaUrl: 'https://www.sefaria.org/Genesis?vhe=' + encodeURIComponent(VERSIONS.tanakh) });
    sources.rashiByBook = { ...(sources.rashiByBook || {}), [book]: r.meta.versionTitle };
    record('rashi', r.meta, { sefariaUrl: 'https://www.sefaria.org/Rashi_on_Genesis?vhe=' + encodeURIComponent(VERSIONS.rashi) });
    counts[book] = t.text.map(c => c.length);
    t.text.forEach((verses, ci) => {
      const rc = r.text[ci] || [];
      write(`${OUT}/torah/${book}/${ci + 1}.json`, {
        v: verses.map(clean),
        r: verses.map((_, vi) => (rc[vi] || []).map(clean).filter(Boolean)),
      });
    });
    console.log('torah', book, t.text.length);
  }
  write(`${OUT}/torah/index.json`, counts);
}

async function tehillim() {
  const t = await fetchText('Psalms', VERSIONS.tanakh);
  record('tanakh', t.meta);
  t.text.forEach((verses, ci) => write(`${OUT}/tehillim/${ci + 1}.json`, { v: verses.map(clean) }));
  write(`${OUT}/tehillim/index.json`, t.text.map(c => c.length));
  console.log('tehillim', t.text.length);
}

export const slug = name => name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
async function rambam() {
  const index = {};
  for (const name of Object.keys(mt)) {
    const ref = 'Mishneh Torah, ' + name;
    let t = null;
    for (const ver of [VERSIONS.rambam, ...RAMBAM_FALLBACK]) {
      try { t = await fetchText(ref, ver); break; } catch (e) { console.warn('fallback', name, ver); }
    }
    if (!t) throw new Error('no version for ' + name);
    record('rambam', t.meta, { sefariaUrl: 'https://www.sefaria.org/Mishneh_Torah,_Foundations_of_the_Torah?vhe=' + encodeURIComponent(VERSIONS.rambam) });
    sources.rambamOverrides ||= {};
    if (t.meta.versionTitle !== VERSIONS.rambam) sources.rambamOverrides[name] = t.meta; else delete sources.rambamOverrides[name];
    const he = (t.heRef || '').replace(/^משנה תורה,\s*/, '');
    const depth2 = Array.isArray(t.text[0]);
    const chapters = depth2 ? t.text : [t.text];
    chapters.forEach((segs, ci) => write(`${OUT}/rambam/${slug(name)}/${ci + 1}.json`, { s: segs.map(clean) }));
    index[name] = { slug: slug(name), he, depth: depth2 ? 2 : 1, chapters: chapters.map(c => c.length) };
    console.log('rambam', name, he, chapters.length);
  }
  write(`${OUT}/rambam/index.json`, index);
}

export const TANYA_SECTIONS = [
  ['LA-title', 'Tanya, Part I; Likkutei Amarim, Title Page', 'ליקוטי אמרים, שער'],
  ['LA-approbation', 'Tanya, Part I; Likkutei Amarim, Approbation', 'ליקוטי אמרים, הסכמות'],
  ['LA-foreword', "Tanya, Part I; Likkutei Amarim, Compiler's Foreword", 'ליקוטי אמרים, הקדמת המלקט'],
  ['LA', 'Tanya, Part I; Likkutei Amarim', 'ליקוטי אמרים'],
  ['SY-chinukh', 'Tanya, Part II; Shaar HaYichud VehaEmunah, Chinukh Katan', 'שער היחוד והאמונה, חינוך קטן'],
  ['SY', 'Tanya, Part II; Shaar HaYichud VehaEmunah', 'שער היחוד והאמונה'],
  ['IT', 'Tanya, Part III; Iggeret HaTeshuvah', 'אגרת התשובה'],
  ['IK', 'Tanya, Part IV; Iggeret HaKodesh', 'אגרת הקודש'],
  ['KA', 'Tanya, Part V; Kuntres Acharon', 'קונטרס אחרון'],
];
async function tanya() {
  const index = {};
  for (const [key, ref, he] of TANYA_SECTIONS) {
    const t = await fetchText(ref, VERSIONS.tanya);
    record('tanya', t.meta, { sefariaUrl: 'https://www.sefaria.org/Tanya%2C_Part_I%3B_Likkutei_Amarim?vhe=' + encodeURIComponent(VERSIONS.tanya) });
    const depth2 = Array.isArray(t.text[0]);
    const chapters = depth2 ? t.text : [t.text];
    chapters.forEach((segs, ci) => write(`${OUT}/tanya/${key}/${ci + 1}.json`, { s: segs.map(clean) }));
    index[key] = { ref, he, depth: depth2 ? 2 : 1, chapters: chapters.map(c => c.length) };
    console.log('tanya', key, chapters.length);
  }
  write(`${OUT}/tanya/index.json`, index);
}

const what = process.argv[2] || 'all';
const saveSources = () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/sources.json`, JSON.stringify(sources, null, 1)); };
if (what === 'torah' || what === 'all') { await torah(); saveSources(); }
if (what === 'tehillim' || what === 'all') { await tehillim(); saveSources(); }
if (what === 'tanya' || what === 'all') { await tanya(); saveSources(); }
if (what === 'rambam' || what === 'all') { await rambam(); saveSources(); }
console.log('ok');
