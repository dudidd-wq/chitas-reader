// Verifies computed daily portions (diaspora mode) against a snapshot of Chabad.org's public daily-study RSS
// (verification/chabad-rss-snapshot.json, fetched by tools/fetch-chabad-rss.mjs). Range: 2025-09-01 .. 2027-10-31
// = all of 5786 (regular year) and 5787 (leap year, Adar I/II) plus margins.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dayPlan, tanya } from '../site/js/calendar.js';

const snap = JSON.parse(fs.readFileSync(new URL('../verification/chabad-rss-snapshot.json', import.meta.url))).days;
const rambamIdx = JSON.parse(fs.readFileSync(new URL('../site/data/rambam/index.json', import.meta.url)));
const tanyaIdx = JSON.parse(fs.readFileSync(new URL('../site/data/tanya/index.json', import.meta.url)));
const days = Object.keys(snap).sort();
const plans = Object.fromEntries(days.map(iso => [iso, dayPlan(new Date(iso + 'T12:00:00'), { il: false })]));
const ALIYAH = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7 };

test('snapshot covers a full regular and a full leap year', () => {
  assert.ok(days.length >= 780, `only ${days.length} days`);
  assert.ok(days.some(d => /Adar II/.test(snap[d].head)), 'leap year Adar II present');
});

test('Hebrew date matches', () => {
  const M = { Tishrei: 7, Cheshvan: 8, Kislev: 9, Tevet: 10, Shevat: 11, Adar: 12, 'Adar I': 12, 'Adar II': 13, Nissan: 1, Iyar: 2, Sivan: 3, Tammuz: 4, Av: 5, Elul: 6 };
  for (const iso of days) {
    const m = snap[iso].head.match(/ - ([A-Za-z ]+?) (\d+), (\d+)$/);
    const hd = plans[iso].hd;
    assert.equal(hd.getDate(), +m[2], iso); assert.equal(hd.getFullYear(), +m[3], iso);
    assert.equal(hd.getMonth(), M[m[1]] === 12 && hd.isLeapYear() && m[1] === 'Adar' ? 12 : M[m[1]], iso + ' ' + m[1]);
  }
});

test('Chumash: parsha (consistent name mapping), aliyah and exact verse range for every day', () => {
  const map = new Map(); let n = 0;
  for (const iso of days) {
    const m = snap[iso].chumash.match(/^Parshat (.+), (\w+) Portion \(.+ (\d+):(\d+)-(\d+):(\d+)\)/);
    assert.ok(m, iso + ' unparsed: ' + snap[iso].chumash);
    const c = plans[iso].chumash;
    const prev = map.get(m[1]); if (prev) assert.equal(String(c.parsha), prev, `${iso}: ${m[1]}`); else map.set(m[1], String(c.parsha));
    assert.equal(c.aliyah, ALIYAH[m[2]], iso + ' aliyah');
    assert.deepEqual([c.from.c, c.from.v, c.to.c, c.to.v], [+m[3], +m[4], +m[5], +m[6]], iso + ' verses');
    n++;
  }
  assert.equal(new Set(map.values()).size, map.size, 'parsha mapping must be one-to-one');
  console.log(`  chumash: ${n} days, ${map.size} parshiyot matched`);
});

test('Tehillim: chapters / verse range for every day', () => {
  for (const iso of days) {
    const t = snap[iso].tehillim, parts = plans[iso].tehillim.parts;
    let m;
    if ((m = t.match(/Chapters (\d+)-(\d+)/))) {
      assert.deepEqual(parts.map(p => p.c), Array.from({ length: m[2] - m[1] + 1 }, (_, i) => +m[1] + i), iso);
      assert.ok(parts.every(p => !p.from), iso);
    } else {
      m = t.match(/Chapter (\d+), Verses (\d+)-(\d+)/); assert.ok(m, iso + ' ' + t);
      assert.deepEqual(parts, [{ c: +m[1], from: +m[2], to: +m[3] }], iso);
    }
  }
});

test('Tanya: section, chapter and beginning/middle/end/whole for every day', () => {
  const SEC = { 'Likutei Amarim': 'LA', 'Iggeret HaKodesh': 'IK', 'Kuntres Acharon': 'KA', 'Shaar Hayichud Vehaemunah': 'SY', 'Igeret HaTeshuva': 'IT' };
  const len = (k, c) => tanyaIdx[k].chapters[c - 1] ?? tanyaIdx[k].chapters[0];
  for (const iso of days) {
    const s = snap[iso].tanya.replace("Today's Lessons: ", '');
    const { from, to } = tanya(plans[iso].hd, tanyaIdx);
    const [secName, rest] = s.split(/, (.*)/s);
    if (/Title Page|Approbations/.test(rest)) { assert.match(from.key, /^LA-(title|approbation)$/, iso); continue; }
    if (/Foreword/.test(rest)) { assert.equal(from.key, 'LA-foreword', iso); continue; }
    if (/Introduction/.test(rest)) { assert.equal(from.key, 'SY-chinukh', iso); continue; }
    assert.equal(from.key, SEC[secName], iso + ' section ' + s);
    const m = rest.match(/(?:(beginning|middle|end) of )?(?:Chapter|Epistle|Essay) (\d+)/); assert.ok(m, iso + ' ' + s);
    assert.equal(from.c, +m[2], iso + ' chapter ' + s);
    const starts = from.s === 1, ends = to.c > from.c || to.key !== from.key || to.s >= len(to.key, to.c);
    const kind = m[1] || 'whole';
    if (kind === 'beginning') assert.ok(starts, iso + ' should start chapter');
    if (kind === 'end') assert.ok(ends, iso + ' should end chapter');
    if (kind === 'whole') assert.ok(starts && ends, iso + ' whole chapter');
  }
});

function rambamCheck(field, key) {
  const map = new Map(), chMap = new Map(); let n = 0;
  for (const iso of days) {
    const pieces = snap[iso][field].replace("Today's Lesson: ", '').split(', '), theirs = [];
    for (let i = 0; i < pieces.length; i++) {
      let x = pieces[i];
      while (!/( - Chapter \d+|: Part \d+| - The .+| - Text of .+)$/.test(x) && i + 1 < pieces.length) x += ', ' + pieces[++i];
      const m = x.match(/^(.+?)(?: - Chapter|: Part) (\d+)$/);
      theirs.push(m ? { name: m[1], n: +m[2], part: x.includes(': Part') } : { name: x, n: 0, part: true });
    }
    const ours = plans[iso][key].flatMap(o => {
      const meta = rambamIdx[o.name];
      if (o.range && meta && meta.depth !== 1) return Array.from({ length: o.range[1] - o.range[0] + 1 }, (_, i) => ({ name: o.name, c: o.range[0] + i }));
      return [o];
    });
    assert.equal(ours.length, theirs.length, iso + ' count');
    ours.forEach((o, i) => {
      const t = theirs[i];
      const prev = map.get(t.name); if (prev) assert.equal(o.name, prev, `${iso}: ${t.name}`); else map.set(t.name, o.name);
      if (t.part) { const k = t.name + '#' + t.n, v = JSON.stringify(o.range || [o.from, o.to]); const p = chMap.get(k); if (p) assert.equal(v, p, iso); else chMap.set(k, v); }
      else assert.equal(o.c, t.n, `${iso}: ${t.name} chapter`);
      n++;
    });
  }
  // Chabad's RSS spells some books in more than one way (e.g. "Hilchot X" / "X"); list any many-to-one groups.
  const inv = {}; for (const [t, o] of map) (inv[o] ??= []).push(t);
  const multi = Object.entries(inv).filter(([, v]) => v.length > 1);
  if (multi.length) console.log('  spelling variants:', JSON.stringify(Object.fromEntries(multi)));
  console.log(`  ${field}: ${n} chapters checked, ${map.size} books matched`);
}
test('Rambam 3 chapters: book + chapter for every day', () => rambamCheck('rambam3', 'rambam3'));
test('Rambam 1 chapter: book + chapter for every day', () => rambamCheck('rambam1', 'rambam1'));
