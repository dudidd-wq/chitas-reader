// Build the daily Torah Or / Likkutei Torah lesson (by the week's parsha) from:
//  - tools/data/tolt-luach.json: the weekly-daily division of "לוח המורה שיעור" (כינוס השלוחים העולמי, תשפ"ה),
//    as structured by torahor.app (התאחדות החסידים) and checked row by row against the luach (378/378) –
//    references only (sefer, daf/amud, opening words); no text of either source is bundled.
//  - the Hebrew text of Torah Or / Likkutei Torah from Sefaria, Kehot Publication Society version (CC BY-NC),
//    located by the Vilna page markers of that edition plus the lesson's opening words (ד"ה).
// Writes site/data/tolt/schedule.json and site/data/tolt/w/<parsha>.json (7 days of paragraphs).
// Usage: node tools/build-tolt.mjs        (texts are cached in /tmp/tolt-cache)
import fs from 'node:fs';
import path from 'node:path';
import { fetchText, clean } from './build-data.mjs';

const OUT = 'site/data/tolt', CACHE = '/tmp/tolt-cache', VERSION = 'Kehot Publication Society';
const L = JSON.parse(fs.readFileSync('tools/data/tolt-luach.json', 'utf8'));
const cap = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const TO_NAMES = { vayetze: 'Vayetzei', 'lech-lecha': 'Lech Lecha', 'chayei-sara': 'Chayei Sara', 'ki-tisa': 'Ki Tisa', 'megillat-esther': 'Megillat Esther' };
const LT_NAMES = { shemini: 'Shmini', acharei: 'Achrei Mot', naso: 'Nasso', behaalotcha: "Beha'alotcha", shelach: "Sh'lach", reeh: "Re'eh",
  'ki-teitzei': 'Ki Teitzei', 'ki-tavo': 'Ki Tavo', haazinu: "Ha'Azinu", 'vezot-haberacha': "V'Zot HaBerachah", 'shir-hashirim': 'Shir HaShirim',
  'drushim-rosh-hashana': 'Rosh Hashanah', 'drushim-shabbat-shuva': 'Shabbat Shuvah', 'drushim-yom-kippur': 'Yom Kippur', 'drushim-sukkot': 'Sukkot', 'drushim-shemini-atzeret': 'Shemini Atzeret' };
/** luach section → Sefaria nodes to search (in order) */
export function nodesFor(work, s) {
  const book = work === 'to' ? 'Torah Ohr' : 'Likkutei Torah', names = work === 'to' ? TO_NAMES : LT_NAMES;
  const sup = s.match(/^hosafos-(.*)$/);
  if (sup) return [`${book}, Supplements, ${names[sup[1]] || cap(sup[1])}`];
  const n = [`${book}, ${names[s] || cap(s)}`];
  if (work === 'to' && s === 'tetzaveh') n.push('Torah Ohr, Parashat Zakhor');
  return n;
}
const HEB = 'אבגדהוזחטיכלמנסעפצקרשת';
const gemVal = s => [...s].reduce((a, c) => a + ({ א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 }[c] || 0), 0);
const AMUD = { א: 0, ב: 1, ג: 2, ד: 3 };
const col = (daf, amud) => daf * 4 + AMUD[amud];
export const norm = s => s.replace(/<[^>]+>/g, '').replace(/[\u0591-\u05C7]/g, '').replace(/[״”“"׳’'`]/g, '').replace(/[^\u05D0-\u05EA\s]/g, ' ').replace(/\s+/g, ' ').trim();
const MARK = /⟦([^⟧]*)⟧/g;
// spelling-insensitive key: ו/י inside a word are dropped (מצוות/מצות, ועניין/וענין, בחודש/בחדש)
const key = w => w[0] + w.slice(1).replace(/[וי]/g, '');
/** The luach's opening words without its notes: "(שו"ה: X)" = the line where the lesson starts after the word X; "[פרשת זכור]" a heading. */
export const dhText = dh => dh.replace(/\(שו"ה:[^)]*\)/g, '').replace(/^שו"ה:\s*/, '').replace(/\[[^\]]*\]/g, '').trim();
const keyWords = dh => norm(dhText(dh)).split(' ').map(key);

export async function node(ref) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, ref.replace(/[^A-Za-z]+/g, '_') + '.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(await fetchText(ref, VERSION)));
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (d.meta.license !== 'CC-BY-NC' || d.meta.versionTitle !== VERSION) throw new Error('unexpected version/licence ' + ref);
  const mm = Array.isArray(d.text[0]) ? d.text : [d.text];
  // paragraphs with the edition's Vilna page markers kept as ⟦daf,amud⟧
  const paras = [];
  mm.forEach((m, mi) => m.forEach((h, pi) => {
    const t = clean(String(h).replace(/<i data-overlay="Vilna Pages" data-value="([^"]+)">\s*<\/i>/g, ' ⟦$1⟧ ')).replace(/\s+/g, ' ').trim();
    if (t) paras.push({ m: mi, p: pi, t });
  }));
  // words with their page column
  const words = []; let cur = null, first = null;
  paras.forEach((pp, k) => {
    const re = /\S+/g; let x;
    while ((x = re.exec(pp.t))) {
      const mk = x[0].match(/^⟦([^,]+),([^⟧]+)⟧$/);
      if (mk) { cur = col(gemVal(mk[1]), mk[2]); if (first == null) first = cur; continue; }
      // Hebrew word runs inside the token ("כו':)(ג." → כו, ג), each with its own offset so a lesson can start at "ג."
      const sub = /[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7״׳"'”“’`]*/g; let y;
      while ((y = sub.exec(x[0]))) { const n = norm(y[0]); if (n) words.push({ k, at: x.index + y.index, w: key(n), col: cur }); }
    }
  });
  for (const w of words) if (w.col == null) w.col = first == null ? null : first - 1; // before the first marker: the previous column
  return { ref, he: d.heRef, paras, words };
}

function locate(N, e, after = -1) {
  const target = col(e.daf, e.amud);
  let dh = keyWords(e.dh);
  const variants = [dh];
  if (dh.length > 1 && dh[0].length === 1) variants.push(dh.slice(1)); // a section letter (ב, ג …) before the opening words
  let best = null;
  for (const v of variants) {
    const n = Math.min(v.length, 4);
    for (let i = after + 1; i + n <= N.words.length; i++) {
      let ok = true;
      for (let j = 0; j < n; j++) if (N.words[i + j].w !== v[j]) { ok = false; break; }
      if (!ok) continue;
      const w = N.words[i];
      let dist = w.col == null ? 6 : Math.abs(w.col - target);
      if (dist > 40) dist = 6; // inside a supplement the edition inlined from a far page: the page is unknown here
      if (dist > 8) continue; // the edition's page markers are sometimes a few columns off
      const paraStart = i === 0 || N.words[i - 1].k !== w.k || (i >= 1 && N.words[i - 1].w.length === 1 && (i < 2 || N.words[i - 2].k !== w.k));
      const head = paraStart && N.paras[w.k].p === 0 && (i === 0 || N.words[i - 1].k !== w.k);
      const score = dist * 10 + (paraStart ? 0 : 12) - (head ? 6 : 0) + (v === dh ? 0 : 1);
      if (!best || score < best.score) best = { i, score, dist, paraStart };
    }
  }
  // (an exact match far from the page loses to it)
  // fallback: a maamar's heading on (or next to) the page whose first word is the luach's first word
  // (e.g. luach "ביאור הדברים", edition heading "ביאור ע"פ יונתי בחגוי") – marked approximate
  const v0 = variants[variants.length - 1][0];
  for (let i = after + 1; i < N.words.length; i++) {
    const w = N.words[i]; if (w.w !== v0 || (i > 0 && N.words[i - 1].k === w.k) || N.paras[w.k].p !== 0) continue;
    const dist = w.col == null ? 9 : Math.abs(w.col - target); if (dist > 3) continue;
    const score = 35 + dist * 10;
    if (!best || score < best.score) best = { i, score, dist, paraStart: true, approx: true };
  }
  return best;
}

const pos = (N, i) => {
  const w = N.words[i], t = N.paras[w.k].t;
  let at = w.at; const m = t.slice(0, at).match(/(?:⟦[^⟧]*⟧|<b>|\s)+$/); // a page marker or an opening <b> right before the cut goes with the new lesson
  if (m) at -= m[0].length;
  return { k: w.k, at: Math.max(0, at) };
};
function slice(N, from, to) { // from/to: {k, at}; to exclusive, null = end of node
  const out = [];
  const endK = to ? to.k : N.paras.length - 1;
  for (let k = from.k; k <= endK; k++) {
    let t = N.paras[k].t;
    const a = k === from.k ? from.at : 0, b = to && k === to.k ? to.at : t.length;
    if (to && k === to.k && b === 0) break;
    t = t.slice(a, b).trim();
    // keep <b> balanced across a cut
    const open = (t.match(/<b>/g) || []).length - (t.match(/<\/b>/g) || []).length;
    if (open > 0) t += '</b>'; if (open < 0) t = '<b>' + t;
    if (a > 0 && /^[^<]*<\/b>/.test(t)) t = '<b>' + t;
    t = t.replace(/<b>\s*<\/b>/g, '').replace(/[(\[]\s*$/, '').trim();
    t = t.replace(MARK, (_, v) => `<span class="daf" aria-hidden="true">[${v.replace(',', ' ')}]</span>`).replace(/\s+/g, ' ').trim();
    if (norm(t)) out.push({ t, m: N.paras[k].m + 1 });
  }
  return out;
}

export async function build() {
  const nodes = new Map();
  const get = async r => { if (!nodes.has(r)) nodes.set(r, await node(r)); return nodes.get(r); };
  const all = []; // every lesson with its location; within a node the luach only moves forward
  const last = new Map();
  for (const w of L.weeks) for (const [di, e] of w.days.entries()) {
    let hit = null;
    for (const r of nodesFor(e.w, e.s)) { const N = await get(r); const b = locate(N, e, last.get(r) ?? -1); if (b && (!hit || b.score < hit.b.score)) hit = { r, b }; }
    if (hit) last.set(hit.r, hit.b.i);
    all.push({ w, di, e, hit });
  }
  // a lesson runs to the next lesson start in the same node, or to the end of the node
  const byNode = new Map();
  for (const x of all) if (x.hit) { if (!byNode.has(x.hit.r)) byNode.set(x.hit.r, []); byNode.get(x.hit.r).push(x); }
  for (const list of byNode.values()) {
    list.sort((a, b) => a.hit.b.i - b.hit.b.i);
    list.forEach((x, j) => { x.next = list[j + 1] && list[j + 1].hit.b.i > x.hit.b.i ? list[j + 1].hit.b.i : null; });
  }
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT + '/w', { recursive: true });
  const report = { matched: 0, unmatched: [], offPage: [] };
  const sched = { about: L.about, joined: L.joined, weeks: {} };
  for (const w of L.weeks) {
    const days = [], texts = [];
    for (const [di, e] of w.days.entries()) {
      const x = all.find(y => y.w === w && y.di === di);
      const d = { w: e.w, s: e.s, daf: e.daf, amud: e.amud, dh: e.dh };
      for (const k of ['until', 'add', 'chag', 'special']) if (e[k]) d[k] = e[k];
      if (x.hit) {
        const N = nodes.get(x.hit.r);
        const paras = slice(N, pos(N, x.hit.b.i), x.next != null ? pos(N, x.next) : null);
        d.ref = x.hit.r; d.he = N.he; d.sefaria = 'https://www.sefaria.org/' + encodeURIComponent(x.hit.r.replace(/ /g, '_')).replace(/%2C/g, ',') + '?vhe=Kehot_Publication_Society&lang=he';
        d.n = paras.length; texts.push(paras); report.matched++;
        if (x.hit.b.approx) { d.approx = true; report.offPage.push(`${w.p} ${di + 1} ${e.dh} APPROX → ${norm(paras[0].t).slice(0, 40)}`); }
        const nw = paras.reduce((a, p) => a + norm(p.t).split(' ').length, 0); d.words = nw;
        if (nw < 250 || nw > 6000) report.offPage.push(`${w.p} ${di + 1} ${e.dh} LENGTH ${nw}`);
        if (x.hit.b.dist) report.offPage.push(`${w.p} ${di + 1} ${e.dh} (${e.daf}/${e.amud}) dist ${x.hit.b.dist}`);
      } else { texts.push(null); report.unmatched.push(`${w.p} ${di + 1} ${e.w}:${e.s} ${e.daf}/${e.amud} ${e.dh}`); }
      days.push(d);
    }
    sched.weeks[w.p] = { title: w.title, days };
    fs.writeFileSync(`${OUT}/w/${w.p}.json`, JSON.stringify({ days: texts }));
  }
  sched.stats = { lessons: report.matched + report.unmatched.length, matched: report.matched, unmatched: report.unmatched.length };
  fs.writeFileSync(`${OUT}/schedule.json`, JSON.stringify(sched));
  // the version record of every node used was checked in node() (Kehot, CC-BY-NC); record it for the Sources page
  const sp = 'site/data/sources.json', sources = JSON.parse(fs.readFileSync(sp, 'utf8'));
  const meta = JSON.parse(fs.readFileSync(path.join(CACHE, 'Torah_Ohr_Bereshit.json'), 'utf8')).meta;
  sources.tolt = { ...meta, sefariaUrl: 'https://www.sefaria.org/Torah_Ohr?vhe=Kehot_Publication_Society&lang=he', sefariaUrl2: 'https://www.sefaria.org/Likkutei_Torah?vhe=Kehot_Publication_Society&lang=he',
    luach: 'לוח המורה שיעור – כינוס השלוחים העולמי (תשפ״ה)', luachUrl: 'https://www.torahor.app/he', fetchedAt: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(sp, JSON.stringify(sources, null, 1));
  return report;
}
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await build();
  console.log('matched', r.matched, 'unmatched', r.unmatched.length); r.unmatched.forEach(u => console.log('  ✖', u)); r.offPage.forEach(u => console.log('  ~', u));
}
