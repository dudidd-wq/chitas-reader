// Builds site/data/ravyomi/ – the daily Shulchan Aruch HaRav lesson by the "Rav Yomi" luach.
//  - tools/data/rav-yomi-luach.json: the luach (references only; made by tools/parse-rav-yomi.mjs from the printed PDF).
//  - text: Shulchan Arukh HaRav, Orach Chayim, "Vocalized Edition - Kehot Publication Society" on Sefaria (CC BY-NC).
// Checks (any failure aborts): every civil day of the luach year is present exactly once; every lesson starts where the
// previous one ended (next seif, next existing siman, or the same seif after a mid-seif cut); every seif exists; every
// mid-seif cut word is found in its seif. Known gaps in the printed luach are listed in KNOWN and shown to the reader.
// Usage: node tools/build-rav-yomi.mjs [cacheDir=/tmp/ry/sahr2]
import fs from 'node:fs';
const cache = process.argv[2] || '/tmp/ry/sahr2';
const L = JSON.parse(fs.readFileSync('tools/data/rav-yomi-luach.json', 'utf8'));
const KNOWN = {
  '2026-06-28': 'בלוח המודפס השיעור של י״ב תמוז הוא סימן רד סעיף ז בלבד, והשיעור של י״ג תמוז מתחיל בסעיף יא. סעיפים ח–י אינם מופיעים בלוח, אולי בגלל השמטה בדפוס. הדבר לא אומת מול מקור שני, ולכן הם אינם מוצגים.',
  '2026-10-18': 'ref', // "הלכות שהיה והטמנה בקצרה" – not a siman; reference only
  '2026-10-19': 'after-ref',
};
fs.mkdirSync(cache, { recursive: true });
async function siman(n) {
  const f = `${cache}/${n}.json`;
  if (!fs.existsSync(f) || !fs.statSync(f).size) {
    const r = await fetch(`https://www.sefaria.org/api/v3/texts/Shulchan_Arukh_HaRav,_Orach_Chayim_${n}`);
    fs.writeFileSync(f, await r.text());
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), v = j.versions[0];
  if (!v || v.versionTitle !== 'Vocalized Edition - Kehot Publication Society' || v.license !== 'CC-BY-NC') throw new Error('unexpected version for ' + n);
  return { v, text: v.text, heRef: j.heRef };
}
const NIQ = /[\u0591-\u05C7]/g;
const plain = s => s.replace(/<[^>]*>/g, '').replace(NIQ, '').replace(/[^\u05D0-\u05EA ]/g, ' ').replace(/\s+/g, ' ');
const clean = s => s.replace(/<i [^>]*><\/i>/g, '').replace(/<\/?small>/g, '').replace(/<(?!\/?b>|br>)[^>]*>/g, '').replace(/[ \t]+/g, ' ').trim();
// a seif -> paragraphs; the first seif of a siman opens with "<b>title</b><br>"
function seifParas(raw, first) {
  let s = clean(raw), title = null;
  if (first) { const m = s.match(/^<b>([^<]*)<\/b>\s*<br>\s*/); if (m) { title = m[1].trim(); s = s.slice(m[0].length); } }
  return { title, paras: s.split(/\s*<br>\s*/).map(p => p.trim()).filter(Boolean) };
}

const days = L.days, out = {}, used = new Set(), cnt = {};
for (const e of days) if (e.from) for (let n = e.from.si; n <= e.to.si; n++) used.add(n);
for (const n of [...used].sort((a, b) => a - b)) cnt[n] = (await siman(n)).text.length;
const nextSiman = n => { for (let k = n + 1; k < n + 60; k++) if (cnt[k] || used.has(k)) return k; throw new Error('no siman after ' + n); };
const errs = [];
let prev = null;
for (let i = 0; i < days.length; i++) {
  const e = days[i];
  if (i && Date.parse(e.date) - Date.parse(days[i - 1].date) !== 864e5) errs.push('date gap/dup before ' + e.date);
  const k = KNOWN[e.date];
  if (e.ref) { if (k !== 'ref') errs.push('unexpected reference-only day ' + e.date); out[e.date] = { ref: e.ref }; continue; }
  for (const p of [e.from, e.to]) if (!(p.se >= 1 && p.se <= cnt[p.si])) errs.push(`${e.date}: ${p.si}:${p.se} out of range (${cnt[p.si]})`);
  if (prev && !k) {
    const exp = prev.w && !prev.end ? [prev.si, prev.se] : prev.se < cnt[prev.si] ? [prev.si, prev.se + 1] : [nextSiman(prev.si), 1];
    const midOk = prev.w && !prev.end ? !!e.from.w : !e.from.w;
    if (e.from.si !== exp[0] || e.from.se !== exp[1] || !midOk) errs.push(`${e.date}: starts ${e.raw} but previous ended ${JSON.stringify(prev)}`);
  }
  for (const p of [e.from, e.to]) if (p.w) {
    // compare consonants only, ignoring spaces, quotes and the matres ו/י (the vocalized edition writes כֻּלָּהּ for כולה,
    // and spells out abbreviations: ואע"פ = וְאַף עַל פִּי)
    const sk = x => plain(x).replace(/[ וי]/g, '');
    const t = sk((await siman(p.si)).text[p.se - 1]), w = sk(p.w.replace(/אע"פ/g, 'אף על פי').replace(/מ"מ/g, 'מכל מקום').replace(/בסי'/g, 'בסימן'));
    if (!t.includes(w)) errs.push(`${e.date}: cut word "${p.w}" not found in ${p.si}:${p.se}`);
  }
  out[e.date] = { f: [e.from.si, e.from.se, ...(e.from.w ? [e.from.w] : [])], t: [e.to.si, e.to.se, ...(e.to.w ? [e.to.w] : []), ...(e.to.end ? [1] : [])],
    ...(e.fix ? { fix: e.fix } : {}), ...(k && k !== 'after-ref' ? { gap: k } : {}) };
  prev = e.to;
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
fs.rmSync('site/data/ravyomi', { recursive: true, force: true });
fs.mkdirSync('site/data/ravyomi/s', { recursive: true });
let meta;
for (const n of used) {
  const { v, text, heRef } = await siman(n); meta ||= v;
  const seifim = text.map((raw, i) => seifParas(raw, i === 0));
  fs.writeFileSync(`site/data/ravyomi/s/${n}.json`, JSON.stringify({ n, heRef, title: seifim[0].title, s: seifim.map(x => x.paras) }));
}
fs.writeFileSync('site/data/ravyomi/schedule.json', JSON.stringify({
  about: L.about, first: days[0].date, last: days.at(-1).date, days: out,
  simanim: [...used].sort((a, b) => a - b), stats: { days: days.length, simanim: used.size },
}));
const S = JSON.parse(fs.readFileSync('site/data/sources.json', 'utf8'));
S.ravyomi = { title: 'Shulchan Arukh HaRav, Orach Chayim', versionTitle: meta.versionTitle, license: meta.license, versionSource: meta.versionSource,
  sefariaUrl: 'https://www.sefaria.org/Shulchan_Arukh_HaRav%2C_Orach_Chayim?vhe=Vocalized_Edition_-_Kehot_Publication_Society&lang=he',
  luach: 'לוח ״רב יומי״ – שולחן ערוך אדמו״ר הזקן (מחזור שלישי, שנה שנייה)', luachUrl: 'https://chabad.info/service/1287411/', fetchedAt: new Date().toISOString().slice(0, 10) };
fs.writeFileSync('site/data/sources.json', JSON.stringify(S, null, 2) + '\n');
console.log(`ok: ${days.length} days, ${used.size} simanim, ${Object.values(out).filter(x => x.gap).length} known gap(s), ${Object.values(out).filter(x => x.fix).length} fix(es)`);
