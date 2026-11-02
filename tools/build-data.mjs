// Build-time data fetcher: downloads open-licence Hebrew texts from the Sefaria API
// and writes static JSON under site/data/. Never runs in the browser.
// Usage: node tools/build-data.mjs [torah|tehillim|rambam|tanya|all]
import fs from 'node:fs';
import { fixWikisource } from './wikisource-pages.mjs';
import path from 'node:path';
import mt from '../node_modules/@hebcal/learning/dist/esm/mishnehTorah.json.js';

const OUT = 'site/data';
const API = 'https://www.sefaria.org/api/v3/texts/';
export const VERSIONS = {
  tanakh: 'Miqra according to the Masorah',
  rashi: "Pentateuch with Rashi's commentary by M. Rosenbaum and A.M. Silbermann, 1929-1934",
  rambam: 'Torat Emet 363',
  tanya: 'Kehot Publication Society',
  mitzvot: 'Sefer HaMitzvot, Warsaw 1883',
  chassidus: 'Kehot Publication Society',
};
export const RAMBAM_FALLBACK = ['Torat Emet 370', 'Wikisource Mishneh Torah'];
// Sefaria labels some versions "Public Domain", but their origin site forbids reuse on other websites
// (Mechon Mamre, https://mechon-mamre.org/copy.htm: "חל איסור מוחלט להעתיק ולהשתמש בחומר שבאתר שלנו באתר אחר").
// Such versions are never used, whatever their Sefaria licence field says.
export const EXCLUDED_SOURCES = [/mechon-mamre\.org/i];
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
        if (EXCLUDED_SOURCES.some(re => re.test(v.versionSource || ''))) { const e = new Error('source excluded: ' + v.versionSource); e.fatal = true; throw e; }
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
/**
 * Clean a Miqra (Tanakh) verse: like clean(), but keeps the Masoretic large/small letters (<big>/<small>)
 * and turns the edition's footnotes (e.g. Num 25:12 "וי״ו קטיעא") into <i class="fn">…</i>.
 * A <small> around a paseq (׀) or other non-letters is unwrapped.
 */
export function cleanMiqra(s) {
  if (typeof s !== 'string') return '';
  const keep = [];
  const stash = h => { keep.push(h); return `\u0001${keep.length - 1}\u0002`; };
  let t = s
    .replace(/<sup class="footnote-marker">[\s\S]*?<\/sup>\s*<i class="footnote">\s*\(?([\s\S]*?)\)?\s*<\/i>/g, (_, n) => stash(`<i class="fn">${n.replace(/<[^>]+>/g, '').trim()}</i>`))
    .replace(/<(big|small)>([\s\S]*?)<\/\1>/g, (m, tag, inner) => /[\u05D0-\u05EA]/.test(inner) ? stash(`<${tag}>${inner.replace(/<[^>]+>/g, '')}</${tag}>`) : inner);
  t = clean(t);
  return t.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[+i]);
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
        v: verses.map(cleanMiqra),
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
  t.text.forEach((verses, ci) => write(`${OUT}/tehillim/${ci + 1}.json`, { v: verses.map(cleanMiqra) }));
  write(`${OUT}/tehillim/index.json`, t.text.map(c => c.length));
  console.log('tehillim', t.text.length);
}

export const slug = name => name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
async function rambam(only) {
  const index = only ? JSON.parse(fs.readFileSync(`${OUT}/rambam/index.json`, 'utf8')) : {};
  for (const name of Object.keys(mt)) {
    if (only && !only.includes(name)) continue;
    const ref = 'Mishneh Torah, ' + name;
    let t = null;
    for (const ver of [VERSIONS.rambam, ...RAMBAM_FALLBACK]) {
      try { t = await fetchText(ref, ver); break; } catch (e) { console.warn('fallback', name, ver); }
    }
    if (!t) throw new Error('no version for ' + name);
    if (t.meta.versionTitle === VERSIONS.rambam) record('rambam', t.meta, { sefariaUrl: 'https://www.sefaria.org/Mishneh_Torah,_Foundations_of_the_Torah?vhe=' + encodeURIComponent(VERSIONS.rambam) });
    sources.rambamOverrides ||= {};
    const all = JSON.stringify(t.text), L = (all.match(/[\u05D0-\u05EA]/g) || []).length, N = (all.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || []).length;
    // round 6: also count vocalised segments, so a partly vocalised book (Positive Mitzvot) is labelled "מנוקד חלקית"
    const segs = JSON.stringify(t.text.flat ? t.text.flat(2) : t.text).split('","').map(x => { const l = (x.match(/[\u05D0-\u05EA]/g) || []).length; return l < 20 ? null : (x.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || []).length / l >= 0.3; }).filter(v => v !== null);
    const vSegs = [segs.filter(Boolean).length, segs.length];
    if (t.meta.versionTitle !== VERSIONS.rambam) sources.rambamOverrides[name] = { ...fixWikisource(name, t.meta), vocalized: N / Math.max(L, 1) >= 0.3, ...(vSegs[0] && vSegs[0] < vSegs[1] && N / Math.max(L, 1) < 0.3 ? { partial: vSegs } : {}) }; else delete sources.rambamOverrides[name];
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

// Sefer HaMitzvot (the Rebbe's daily "Sefer HaMitzvot" track), Hebrew translation as printed in Warsaw 1883 (Public Domain).
// One file per mitzvah / principle, like the Rambam chapters, so the offline pre-download takes only the day's items.
async function mitzvot() {
  const index = {};
  for (const [key, ref] of [['P', 'Sefer HaMitzvot, Mitzvot Ase'], ['N', 'Sefer HaMitzvot, Mitzvot Lo Taase'], ['S', 'Sefer HaMitzvot, Shorashim']]) {
    const t = await fetchText(ref, VERSIONS.mitzvot);
    record('mitzvot', t.meta, { sefariaUrl: 'https://www.sefaria.org/Sefer_HaMitzvot?vhe=' + encodeURIComponent(VERSIONS.mitzvot) });
    t.text.forEach((segs, i) => write(`${OUT}/mitzvot/${key}/${i + 1}.json`, { s: segs.map(clean).filter(Boolean) }));
    index[key] = t.text.length;
    console.log('mitzvot', key, t.text.length);
  }
  const intro = await fetchText("Sefer HaMitzvot, Introductions, The Rambam's Introduction", VERSIONS.mitzvot);
  write(`${OUT}/mitzvot/intro.json`, { s: intro.text.map(clean).filter(Boolean) });
  write(`${OUT}/mitzvot/index.json`, index);
}

// Torah Or / Likkutei Torah (the Alter Rebbe's maamarim on the weekly parsha), Kehot edition (CC-BY-NC, like the Tanya).
// Only the parsha sections; the festival sections, Megillat Esther, Shir HaShirim and the supplements are not used
// (they belong to no weekly parsha). Parsha names are mapped to Hebcal's spelling.
const CH_NAME = { 'Lech Lecha': 'Lech-Lecha', "Ha'Azinu": "Ha'azinu", "V'Zot HaBerachah": 'Vezot Haberakhah' };
async function chassidus() {
  const { parshiot } = await import('@hebcal/core');
  const index = {};
  for (const [book, title, he] of [['TO', 'Torah_Ohr', 'תורה אור'], ['LT', 'Likkutei_Torah', 'לקוטי תורה']]) {
    const raw = await (await fetch('https://www.sefaria.org/api/v2/raw/index/' + title, { headers: { 'User-Agent': 'chitas-reader-build/1.0 (static open-source study app)' } })).json();
    for (const n of raw.schema.nodes) {
      const name = n.sharedTitle || n.titles?.find(t => t.lang === 'en' && t.primary)?.text;
      const parsha = CH_NAME[name] || name;
      if (!parshiot.includes(parsha)) { console.log('skip', book, name); continue; }
      const t = await fetchText(title.replace(/_/g, ' ') + ', ' + name, VERSIONS.chassidus);
      record('chassidus', t.meta, { sefariaUrl: 'https://www.sefaria.org/Torah_Ohr?vhe=' + encodeURIComponent(VERSIONS.chassidus) });
      const slug = parsha.replace(/[^A-Za-z]/g, '');
      const maamarim = (Array.isArray(t.text[0]) ? t.text : [t.text]).map(m => m.map(clean).filter(Boolean)).filter(m => m.length);
      write(`${OUT}/chassidus/${book}/${slug}.json`, { m: maamarim });
      (index[parsha] ||= []).push({ book, he, file: `${book}/${slug}`, maamarim: maamarim.length });
      console.log('chassidus', book, parsha, maamarim.length);
    }
  }
  write(`${OUT}/chassidus/index.json`, index);
}

import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const what = isMain ? (process.argv[2] || 'all') : 'none';
const saveSources = () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/sources.json`, JSON.stringify(sources, null, 1)); };
if (what === 'torah' || what === 'all') { await torah(); saveSources(); }
if (what === 'tehillim' || what === 'all') { await tehillim(); saveSources(); }
if (what === 'tanya' || what === 'all') { await tanya(); saveSources(); }
if (what === 'mitzvot' || what === 'all') { await mitzvot(); saveSources(); }
if (what === 'chassidus' || what === 'all') { await chassidus(); saveSources(); }
if (what === 'rambam' || what === 'all') { await rambam(process.argv[3] ? process.argv[3].split(',') : null); saveSources(); }
console.log('ok');
