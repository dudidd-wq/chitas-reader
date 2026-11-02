// Parses the printable "Rav Yomi" luach (Shulchan Aruch HaRav daily lesson, third cycle, second year,
// 24 Tevet 5786 – 23 Tevet 5787; published by chabad.info / איגוד הצאצאים) into site/data/ravyomi/schedule.json.
// Input: the output of `pdftotext -bbox <luach.pdf> out.html` (the PDF itself is not stored in the repo).
// Usage: node tools/parse-rav-yomi.mjs /tmp/ry/bbox.html   -> tools/data/rav-yomi-luach.json (references only)
// Every row's weekday is checked against the Hebrew calendar; any failure aborts.
import fs from 'node:fs';
import { HDate } from '../site/js/vendor/hebcal.js';

const GEM = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
export const gemVal = s => [...s.replace(/["'״׳]/g, '')].reduce((a, c) => { if (!(c in GEM)) throw new Error('not a numeral: ' + s); return a + GEM[c]; }, 0);
const isNum = s => /^[א-ת"'״׳]{1,4}$/.test(s) && s !== 'סוף' && [...s.replace(/["'״׳]/g, '')].every(c => c in GEM);
// Print errors in the luach, corrected only where the neighbouring days and the siman itself leave no doubt.
const FIX = { '2026-11-15': { toSi: 266, why: 'בלוח נדפס ״עד סימן ו סעיף כא״. תוקן ל״סימן רסו סעיף כא״: השיעור מתחיל ברסו יח, ולמחרת מתחיל ברסו כב.' } };
const WD = { ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6 };
const MONTH = { טבת: 10, שבט: 11, אדר: 12, ניסן: 1, אייר: 2, סיון: 3, תמוז: 4, אב: 5, אלול: 6, תשרי: 7, חשון: 8, כסלו: 9 };

const src = fs.readFileSync(process.argv[2], 'utf8');
const pages = src.split('<page ').slice(1);
const out = [];
for (const p of pages) {
  const words = [...p.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)<\/word>/g)]
    .map(m => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: [...m[5].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'")].reverse().join('') }))
    .map(w => ({ ...w, cx: (w.x0 + w.x1) / 2, cy: (w.y0 + w.y1) / 2 }));
  const hdr = words.filter(w => w.cy < 80 && w.cy > 65);
  const blocks = hdr.filter(w => w.t === 'מסימן').map(ms => {
    const cols = hdr.filter(w => w.x1 <= ms.x1 && w.x0 > ms.x0 - 100).sort((a, b) => b.x0 - a.x0).slice(0, 5);
    if (cols.map(c => c.t).join(',') !== 'מסימן,סעיף,עד,סימן,סעיף') throw new Error('bad header near x=' + ms.x0);
    const centers = [cols[0].cx, cols[1].cx, cols[3].cx, cols[4].cx]; // fromSiman, fromSeif, toSiman, toSeif
    const left = cols[4].x0 - 10, wdL = ms.x1 + 2, wdR = ms.x1 + 32;
    const mon = words.find(w => w.cy < 66 && w.cy > 45 && MONTH[w.t] && w.cx > left && w.cx < wdR);
    const yr = words.find(w => w.cy < 66 && w.cy > 45 && /^תשפ"[וז]$/.test(w.t) && w.cx > left && w.cx < wdR);
    if (!mon || !yr) throw new Error("no month header for block at x=" + ms.x0 + " " + JSON.stringify(hdr.length));
    return { centers, left, wdL, wdR, month: MONTH[mon.t], year: yr.t === 'תשפ"ו' ? 5786 : 5787 };
  });
  const inBlock = w => blocks.some(b => w.cx > b.left && w.cx < b.wdR);
  const dayWords = words.filter(w => w.cy > 80 && !inBlock(w) && isNum(w.t) && gemVal(w.t) <= 30);
  for (const b of blocks) {
    const rows = words.filter(w => w.cy > 80 && w.cx > b.wdL && w.cx < b.wdR && w.t in WD).sort((a, c) => a.cy - c.cy);
    const cells = words.filter(w => w.cy > 80 && w.cx > b.left && w.cx < b.wdL);
    const rowCells = rows.map(() => [[], [], [], []]);
    for (const w of cells) {
      let ri = -1, bd = 9;
      rows.forEach((r, i) => { const d = Math.abs(r.cy - w.cy); if (d < bd) { bd = d; ri = i; } });
      if (ri < 0) { if (rows.length && w.cy > rows.at(-1).cy) continue; throw new Error(`orphan word "${w.t}" at ${w.x0},${w.y0}`); }
      let ci = 0, cd = 1e9;
      b.centers.forEach((c, i) => { const d = Math.abs(c - w.cx); if (d < cd) { cd = d; ci = i; } });
      rowCells[ri][ci].push(w);
    }
    rows.forEach((r, i) => {
      const dw = dayWords.filter(w => Math.abs(w.cy - r.cy) < 6 && w.cx > r.cx).sort((a, c) => a.cx - c.cx)[0];
      if (!dw) throw new Error('no day number for row at y=' + r.cy);
      const day = gemVal(dw.t);
      const hd = new HDate(day, b.month, b.month >= 7 && b.month <= 9 ? b.year : b.year);
      if (hd.getDay() !== WD[r.t]) throw new Error(`weekday mismatch ${day}/${b.month}/${b.year}: ${r.t}`);
      const txt = ws => ws.sort((a, c) => (Math.abs(a.cy - c.cy) > 3 ? a.cy - c.cy : c.cx - a.cx)).map(w => w.t).join(' ');
      const [fs_, ff, ts, tf] = rowCells[i].map(txt);
      if (!fs_ && !ff && !ts && !tf) return; // no lesson in this cell (outside the luach year)
      const sim = s => (s && isNum(s) ? gemVal(s) : (s || null));
      const seif = s => { if (!s) return { s: null, note: '' }; const m = s.match(/^(\S+)(?:\s+(.*))?$/); return isNum(m[1]) ? { s: gemVal(m[1]), note: m[2] || '' } : { s: null, note: s }; };
      const f = seif(ff), t = tf ? seif(tf) : null;
      const g = hd.greg();
      const iso = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}`;
      const fix = FIX[iso];
      const e = { date: iso, hd: [day, b.month, b.year], raw: [fs_, ff, ts, tf] };
      if (!isNum(fs_)) e.ref = fs_; // a lesson outside the simanim (e.g. "הלכות שהיה והטמנה בקצרה")
      else {
        const f = seif(ff);
        e.from = { si: gemVal(fs_), se: f.s, ...(f.note ? { w: f.note } : {}) };
        if (!ts && !tf) e.to = { si: e.from.si, se: e.from.se };
        else if (tf === 'סוף הסעיף') e.to = { si: ts ? gemVal(ts) : e.from.si, se: e.from.se, end: true };
        else { const t = seif(tf); e.to = { si: fix?.toSi ?? (ts ? gemVal(ts) : e.from.si), se: t.s, ...(t.note ? { w: t.note } : {}) }; }
        if (e.from.se == null || e.to.se == null) throw new Error('unparsed seif ' + iso + ' ' + e.raw);
      }
      if (fix) e.fix = fix.why;
      out.push(e);
    });
  }
}
out.sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync('tools/data/rav-yomi-luach.json', JSON.stringify({
  about: 'לוח ״רב יומי״ – שולחן ערוך אדמו״ר הזקן, מחזור שלישי, שנה שנייה (כ״ד טבת תשפ״ו – כ״ג טבת תשפ״ז), כפי שפורסם ב-chabad.info (שירות 1287411). הפניות בלבד; קובץ ה-PDF אינו נשמר כאן.',
  days: out }, null, 0).replace(/\},\{"date"/g, '},\n{"date"'));
console.log(out.length, out[0].date, out.at(-1).date);
