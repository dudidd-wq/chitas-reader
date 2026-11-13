// 1.0.100: "ביאור קצר" – a short, labelled Hebrew explanation under each paragraph (site/data/sbiur, verification/SHORT-BIUR.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dayPlan } from '../site/js/calendar.js';

const root = new URL('../site/', import.meta.url);
const fetched = [];
globalThis.fetch = async p => { fetched.push(String(p)); const f = new URL(p, root); const ok = fs.existsSync(f); return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(fs.readFileSync(f)) }; };
const { buildDoc, filesFor } = await import('../site/js/texts.js');
const DAYS = ['2026-11-15', '2026-11-16', '2026-11-17']; // 1.0.103: batch 2 adds 18.11–1.12; 1.0.104: batch 3 adds 2–15.12
for (let d = new Date('2026-11-18T12:00:00'); d <= new Date('2026-12-29T12:00:00'); d.setDate(d.getDate() + 1)) DAYS.push(d.toISOString().slice(0, 10));
const UNITS = ['tanya', 'rambam3', 'rambam1', 'mitzvot', 'tolt'];
const plan = iso => dayPlan(new Date(`${iso}T12:00:00`));
const strip = s => s.replace(/[\u0591-\u05C7]/g, '');

test('batch 1 (15–17.11.2026): every paragraph of Tanya, Rambam, Sefer HaMitzvot and Torah Or / Likkutei Torah has a short explanation', async () => {
  for (const iso of DAYS) for (const u of UNITS) {
    const ps = (await buildDoc(plan(iso), u)).blocks.filter(b => b.type === 'p');
    assert.ok(ps.length, `${iso} ${u}`);
    for (const b of ps) {
      assert.ok(b.sb, `${iso} ${u} ${b.id}: no short explanation`);
      assert.ok(/[\u05B0-\u05BC]/.test(b.sb.v) && !/[\u05B0-\u05BC]/.test(b.sb.p), `${b.id}: v vocalized, p plain`);
      assert.ok(b.sb.p.length > 20 && b.sb.p.length < 1600, `${b.id}: length ${b.sb.p.length}`);
      assert.equal(strip(b.sb.v).split(/\s+/).length, b.sb.p.split(/\s+/).length, `${b.id}: the vocalized text has the plain text's words`);
      // 1.0.103: a Torah Or / Likkutei Torah paragraph with no matching LikuteiTorah.com explanation is written from the maamar and carries the computer-written label
      if (u === 'tolt' && b.sb.link) assert.ok(b.sb.src === 'lt' && /^https:\/\/www\.likuteitorah\.com\/(likkutei-torah|torah-ohr)\/[\w-]+\/\d+\/$/.test(b.sb.link), b.id);
      else assert.equal(b.sb.src, 'ai');
    }
  }
});

test('no doubled vav/yod (ktiv male) or unvocalized word is left in the vocalized explanations', () => {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  const dir = new URL('data/sbiur', root).pathname;
  for (const f of walk(dir).filter(f => !f.endsWith('index.json'))) {
    const j = JSON.parse(fs.readFileSync(f)), es = j.s ? Object.values(j.s) : Object.values(j.days).flatMap(Object.values);
    for (const e of es) {
      const v = e.v.normalize('NFC');
      assert.ok(!/[\u05B0-\u05BC]\u05D9\u05D9[\u05B0-\u05BC]?(?![\u05B0-\u05C7])/.test(v.replace(/\u05B4\u05D9\u05D9/g, '')), `${f}: ${v.match(/\S*\u05D9\u05D9\S*/)?.[0]}`);
      assert.ok(!/\u05D5\u05D5(?![\u05B9\u05BC\u05F4])/.test(v), `${f}: ${v.match(/\S*\u05D5\u05D5(?![\u05B9\u05BC\u05F4])\S*/)?.[0]}`);
      const bare = v.match(/(?<![\u05D0-\u05EA\u05B0-\u05C7״׳])[\u05D0-\u05EA]{3,}(?![\u05B0-\u05C7\u05D0-\u05EA״׳])/);
      assert.ok(!bare, `${f}: unvocalized ${bare?.[0]}`);
    }
  }
});

test('lazy: only listed files are fetched; filesFor saves them for offline use', async () => {
  fetched.length = 0;
  await buildDoc(plan('2026-11-20'), 'tanya');   // a day without a short explanation yet – nothing beyond the index is requested
  assert.ok(!fetched.some(p => /sbiur\/(?!index)/.test(p)), fetched.join(' '));
  const files = await filesFor(plan('2026-11-15'), 'rambam3');
  assert.ok(files.includes('sbiur/index.json') && files.some(f => f.startsWith('sbiur/rambam/')), files.join(' '));
  for (const f of files) assert.ok(fs.existsSync(new URL('data/' + f, root)), f);
  for (const u of UNITS) for (const f of await filesFor(plan('2026-11-16'), u)) assert.ok(fs.existsSync(new URL('data/' + f, root)), f);
});

test('reader: folded, labelled, respects the settings; read aloud only with ttsBiur', () => {
  const app = fs.readFileSync(new URL('js/app.js', root), 'utf8'), store = fs.readFileSync(new URL('js/store.js', root), 'utf8');
  assert.match(app, /<details class="sbiur" data-nr><summary>ביאור קצר<\/summary>/);
  assert.match(app, /ביאור קצר ממוחשב – אינו פירוש רבני/);
  assert.match(app, /LikuteiTorah\.com<\/a> \(CC BY-NC\)/);
  assert.match(app, /prefs\.biurNiqqud \? b\.sb\.v : b\.sb\.p/);
  assert.match(app, /prefs\.ttsBiur && prefs\.shortBiur !== false/);
  assert.match(store, /ttsBiur: false/); assert.match(store, /shortBiur: true/);
  const lic = fs.readFileSync(new URL('data/LICENSE-DATA.md', root), 'utf8');
  assert.match(lic, /LikuteiTorah\.com/); assert.match(lic, /sbiur/);
});
