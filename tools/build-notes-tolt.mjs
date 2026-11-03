// Build "מראי מקומות הערות וציונים" for the daily Torah Or / Likkutei Torah lesson: the Kehot edition's own
// source notes ("Sources and References on Torah Ohr / Likkutei Torah", Kehot Publication Society, CC BY-NC –
// the same publisher and licence as the text) from Sefaria, attached to the lesson's paragraphs through
// Sefaria's links (note → paragraph). A note is kept only when its heading words (the bold ד"ה) are found in the
// lesson's text of that paragraph (two checks: Sefaria's link + the words), so notes of a cut paragraph aren't shown.
// Writes site/data/notes/tolt/<parsha>.json = { "<day>": { "<para#>": ["html", …] } } and prints coverage.
// Usage: node tools/build-notes-tolt.mjs     (cache: /tmp/notes-cache)
import fs from 'node:fs';
import path from 'node:path';
import { node, norm } from './build-tolt.mjs';

const CACHE = '/tmp/notes-cache', OUT = 'site/data/notes/tolt', V = 'Kehot Publication Society';
const S = JSON.parse(fs.readFileSync('site/data/tolt/schedule.json', 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, url.replace(/[^A-Za-z0-9]+/g, '_').slice(-180) + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'chitas-reader-build/1.0' } });
    if (r.ok) { const j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); await sleep(150); return j; }
    if (i > 3) throw new Error(r.status + ' ' + url); await sleep(1500 * (i + 1));
  }
}
const u = ref => encodeURIComponent(ref.replace(/ /g, '_')).replace(/%2C/g, ',');
/** notes of one node: Map "m:p" (1-based, as in Sefaria anchors) → [html] */
const nodeNotes = new Map();
async function notesFor(ref) {
  if (nodeNotes.has(ref)) return nodeNotes.get(ref);
  const links = (await get(`https://www.sefaria.org/api/links/${u(ref)}?with_text=0`)).filter(l => l.index_title?.startsWith('Sources and References on'));
  const base = r => r.replace(/ \d+:\d+(-\d+)?$/, ''), texts = {};
  for (const src of new Set(links.map(l => base(l.sourceRef)))) {
    const t = await get(`https://www.sefaria.org/api/v3/texts/${u(src)}?version=hebrew|${encodeURIComponent(V)}`);
    const v = t.versions?.[0];
    if (!v || v.license !== 'CC-BY-NC' || v.versionTitle !== V) throw new Error('unexpected licence/version ' + src);
    texts[src] = v.text;
  }
  const map = new Map();
  for (const l of links) {
    const a = l.anchorRef.match(/ (\d+):(\d+)$/), s = l.sourceRef.match(/ (\d+):(\d+)$/);
    if (!a || !s) continue;
    const h = texts[base(l.sourceRef)]?.[+s[1] - 1]?.[+s[2] - 1];
    if (!h) continue;
    const k = `${a[1]}:${a[2]}`; if (!map.has(k)) map.set(k, []);
    map.get(k).push({ o: +s[1] * 1e4 + +s[2], h });
  }
  for (const v of map.values()) v.sort((x, y) => x.o - y.o);
  nodeNotes.set(ref, map); return map;
}
// sanitize: only <b>, <br>, plain text
const safe = h => String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<(\/?)b>/gi, '\u0001$1b\u0002').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  .replace(/[<>]/g, '').replace(/\u0001(\/?)b\u0002/g, '<$1b>').replace(/\n+/g, '<br>').replace(/[ \t]+/g, ' ').trim();
const cons = s => norm(s).replace(/\s+/g, '');
/** heading words of a note: the bold text before ':' (". ." = skipped words) → consonant chunks that must all occur */
const heads = h => { const m = String(h).match(/<b>([^<]*)<\/b>/); return m ? m[1].replace(/:\s*$/, '').split(/\.\s*\.|…/).map(cons).filter(x => x.length >= 2) : null; };

const report = { lessons: 0, withNotes: 0, notes: 0, droppedNoHead: 0, droppedNotInText: 0, unmatchedParas: 0, paras: 0, perWork: { to: { lessons: 0, withNotes: 0, notes: 0 }, lt: { lessons: 0, withNotes: 0, notes: 0 } } };
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync('site/data/tolt/w').sort()) {
  const slug = f.replace('.json', ''), W = JSON.parse(fs.readFileSync(`site/data/tolt/w/${f}`, 'utf8')), meta = S.weeks[slug];
  const out = {};
  for (let di = 0; di < W.days.length; di++) {
    const paras = W.days[di], e = meta.days[di];
    if (!paras || !e?.ref) continue;
    const N = await node(e.ref), notes = await notesFor(e.ref), work = e.w === 'to' ? 'to' : 'lt';
    report.lessons++; report.perWork[work].lessons++;
    let k = 0, day = {}, n = 0;
    paras.forEach((p, i) => {
      report.paras++;
      const c = cons(p.t.replace(/<span class="daf"[^>]*>[^<]*<\/span>/g, '')), probe = c.slice(0, 50);
      let hit = -1;
      for (let j = k; j < N.paras.length; j++) if (N.paras[j].m + 1 === p.m && cons(N.paras[j].t.replace(/⟦[^⟧]*⟧/g, '')).includes(probe)) { hit = j; break; }
      if (hit < 0) { report.unmatchedParas++; return; }
      k = hit;
      const list = notes.get(`${N.paras[hit].m + 1}:${N.paras[hit].p + 1}`) || [];
      const keep = [];
      for (const { h } of list) {
        const hd = heads(h);
        if (!hd || !hd.length) { report.droppedNoHead++; continue; }
        if (!hd.every(x => c.includes(x))) { report.droppedNotInText++; continue; }
        keep.push(safe(h));
      }
      if (keep.length) { day[i + 1] = keep; n += keep.length; }
    });
    if (n) { out[di + 1] = day; report.withNotes++; report.notes += n; report.perWork[work].withNotes++; report.perWork[work].notes += n; }
  }
  fs.writeFileSync(`${OUT}/${slug}.json`, JSON.stringify(out));
}
fs.writeFileSync('verification/notes-tolt-stats.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report, null, 1));
