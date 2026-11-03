// Text integrity: every portion from 2025-09-01 to 2027-10-31 (both locations) resolves to existing, non-empty text.
// Also reports which portions are not vocalized (niqqud ratio) — see NOTES.md / sources page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dayPlan, TANYA_ORDER } from '../site/js/calendar.js';

const root = new URL('../site/', import.meta.url);
globalThis.fetch = async p => { const f = new URL(p, root); const ok = fs.existsSync(f); return { ok, json: async () => JSON.parse(fs.readFileSync(f)) }; };
const { buildDoc, UNITS } = await import('../site/js/texts.js');
const niq = t => { const s = t.replace(/<[^>]+>/g, ''); const l = (s.match(/[\u05D0-\u05EA]/g) || []).length; return l ? (s.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || []).length / l : 1; };

test('tanya index order matches the reading order', () => {
  const idx = JSON.parse(fs.readFileSync(new URL('data/tanya/index.json', root)));
  assert.deepEqual(Object.keys(idx), TANYA_ORDER);
});

test('no blank segments in the data except the known numbering gap (Talmud Torah 7:8, absent in the common printed edition)', () => {
  const blanks = [];
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = dir + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'search') walk(p); /* the search index is derived and tested in search.test.mjs */ } else if (e.name.endsWith('.json') && !/index|sources|glossary/.test(e.name)) { const j = JSON.parse(fs.readFileSync(p)); (j.s || j.v || []).forEach((x, i) => { if (Array.isArray(x) ? !x.length || x.some(y => typeof y !== 'string' || !y.trim()) : typeof x !== 'string' || !x.trim()) blanks.push(p.split('/data/')[1] + '#' + (i + 1)); }); } } };
  walk(new URL('data', root).pathname);
  assert.deepEqual(blanks, ['rambam/Torah_Study/7.json#8']);
});

test('every portion resolves to non-empty text (both Israel and diaspora)', async () => {
  const unvoc = {}; let n = 0;
  for (let d = new Date('2025-09-01T12:00:00'); d <= new Date('2027-10-31T12:00:00'); d.setDate(d.getDate() + 1)) {
    for (const il of [false, true]) {
      const plan = dayPlan(new Date(d), { il });
      for (const unit of Object.keys(UNITS)) {
        if (unit === 'siddur') continue; // not a daily portion (tests/siddur.test.mjs)
        if (il && unit !== 'chumash') continue; // only Chumash depends on location
        const doc = await buildDoc(plan, unit);
        const segs = doc.blocks.filter(b => b.type !== 'h' && b.type !== 'notes'); // notes: separate study-notes section (tests/study-notes.test.mjs)
        assert.ok(segs.length > 0, `${plan.iso} ${unit} empty`);
        for (const b of segs) {
          assert.equal(typeof b.text, 'string', `${plan.iso} ${unit} ${b.id} missing`);
          assert.ok(b.text.trim().length > 0, `${plan.iso} ${unit} ${b.id} blank`);
        }
        const r = segs.reduce((a, b) => a + niq(b.text), 0) / segs.length;
        if (r < 0.3) (unvoc[unit + ': ' + doc.subtitle] ??= []).push(plan.iso);
        n++;
      }
    }
  }
  console.log(`  ${n} portions checked`);
  console.log('  unvocalized portions:', JSON.stringify(Object.fromEntries(Object.entries(unvoc).map(([k, v]) => [k, v.length + ' days, e.g. ' + v[0]])), null, 1));
});

test('no text is taken from Mechon Mamre (its site forbids reuse on other websites)', () => {
  const src = JSON.parse(fs.readFileSync(new URL('../site/data/sources.json', import.meta.url), 'utf8'));
  const all = JSON.stringify(src);
  assert.ok(!/mechon-mamre/i.test(all), 'sources.json must not reference mechon-mamre');
  assert.equal(src.rambam.versionTitle, 'Torat Emet 363');
  for (const n of ['Transmission of the Oral Law', 'Positive Mitzvot']) assert.equal(src.rambamOverrides[n].versionTitle, 'Wikisource Mishneh Torah', n);
  const t = JSON.parse(fs.readFileSync(new URL('../site/data/rambam/Transmission_of_the_Oral_Law/1.json', import.meta.url), 'utf8')).s;
  const bare = t[0].replace(/[\u0591-\u05C7\u200D]/g, '');
  assert.match(bare, /^<b>אז לא אבוש.*כל המצוות שניתנו|כל המצוות שנתנו/);
  assert.ok(/[\u05B0-\u05BC]/.test(t[0]), 'introduction is vocalised');
});
