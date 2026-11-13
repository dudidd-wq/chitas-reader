// 1.0.97: the whole Shas in the library – Bavli (Steinsaltz), Yerushalmi (Penei Moshe), Mishnah (Bartenura);
// explanations shown with niqqud; not in the search index; not precached. Read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { vocalizeHtml, cursor } from '../tools/gemara-pronunciation.mjs';

const root = new URL('../site/', import.meta.url);
globalThis.fetch = async p => { const f = new URL(p, root); const ok = fs.existsSync(f); return { ok, json: async () => JSON.parse(fs.readFileSync(f)) }; };
const { libNode, libDoc, libFiles, FAMILIES } = await import('../site/js/library.js');
const idx = JSON.parse(fs.readFileSync(new URL('data/gemara/index.json', root)));
const strip = s => s.replace(/[\u0591-\u05C7]/g, '');

test('the index covers all of Shas: 37 Bavli tractates + Shekalim, 39 Yerushalmi, 63 Mishnah tractates in six orders', () => {
  assert.equal(idx.bavli.length, 38); assert.equal(idx.yer.length, 39); assert.equal(idx.mishna.length, 63);
  assert.deepEqual(Object.values(idx.seder), ['זרעים', 'מועד', 'נשים', 'נזיקין', 'קדשים', 'טהרות']);
  assert.equal(idx.mishna.reduce((n, m) => n + m.ch.length, 0), 525);
  assert.ok(idx.yer.reduce((n, y) => n + y.n, 0) >= 1550);
});

test('library: seder → tractate → amud, with prev / next across amudim', async () => {
  const r = await libNode('bavli/Berakhot/2b');
  assert.equal(r.prev.id, 'bavli/Berakhot/2a'); assert.equal(r.next.id, 'bavli/Berakhot/3a');
  assert.deepEqual(r.crumbs.map(c => c.he), ['תלמוד בבלי', 'ברכות']);
  const root = await libNode('bavli');
  assert.deepEqual(root.node.kids.map(k => k.he), ['סדר זרעים', 'סדר מועד', 'סדר נשים', 'סדר נזיקין', 'סדר קדשים', 'סדר טהרות']);
  const last = await libNode('bavli/Berakhot/64a'); assert.equal(last.next.id, 'bavli/Shabbat/2a');   // runs on into the next tractate
  const { doc } = await libDoc('bavli/Berakhot/2a');
  const ps = doc.blocks.filter(b => b.type === 'p');
  assert.ok(ps.length > 5 && ps.every(b => b.biur && b.say !== undefined));
  assert.equal(doc.subtitle, 'ברכות ב א');
  assert.deepEqual((await libFiles('bavli/Berakhot/2a')).sort(), ['gemara/bavli/Berakhot/2a.json', 'gemara/bsay/Berakhot/2a.json', 'gemara/index.json']);
});

test('Yerushalmi: each segment with the Penei Moshe beneath it; the explanation is read', async () => {
  const r = await libNode('yerushalmi/Berakhot/2');
  assert.equal(r.prev.id, 'yerushalmi/Berakhot/1');
  const { doc } = await libDoc('yerushalmi/Berakhot/2'), ps = doc.blocks.filter(b => b.type === 'p');
  assert.ok(ps.length > 2);
  const withPm = ps.filter(b => b.biur?.length);
  assert.ok(withPm.length >= ps.length / 2, `${withPm.length}/${ps.length}`);
  assert.ok(withPm.every(b => b.biurLabel === 'פני משה' && b.say));
  assert.ok(doc.credits.some(c => c.label === 'פני משה' && c.license === 'Public Domain'));
});

test('Mishnah: a whole chapter with Bartenura; the mishnah then Bartenura is read', async () => {
  const r = await libNode('mishnah/Berakhot/1'); assert.equal(r.next.id, 'mishnah/Berakhot/2');
  const { doc } = await libDoc('mishnah/Berakhot/1'), ps = doc.blocks.filter(b => b.type === 'p');
  assert.equal(ps.length, 5);
  assert.ok(ps.every(b => b.biur.length && b.say.startsWith(strip(b.text.replace(/<[^>]+>/g, '')).slice(0, 8)) || b.say.startsWith(b.text.replace(/<[^>]+>/g, '').slice(0, 8))));
});

test('Shekalim of the Daf Yomi is the Jerusalem Talmud (Vilna Bavli pages)', async () => {
  const { doc } = await libDoc('bavli/Shekalim/2a');
  assert.ok(doc.blocks.filter(b => b.type === 'p').length > 0);
});

test('the Shas is not in the search index and not precached', () => {
  assert.ok(FAMILIES.filter(f => f.noSearch).map(f => f.id).join() === 'nach,bavli,yerushalmi,mishnah');
  const shards = JSON.parse(fs.readFileSync(new URL('data/search/shards.json', root)));
  assert.ok(!shards.shards.some(s => /bavli|yerushalmi|mishnah/.test(s.fam)));
  const sw = fs.readFileSync(new URL('sw.js', root), 'utf8');
  assert.ok(!/data\/gemara\/(bavli|yer|mishna|bsay|ysay|msay)/.test(sw));
});

test('displayed niqqud: vowels are added, never a letter, a tag or a verse reference changed', () => {
  const tok = (word, w) => ({ word, options: [{ w, level: 1 }] });
  const cur = cursor([tok('אמר', 'אָמַר'), tok('רבי', 'רַבִּי'), tok('יוחנן', 'יוֹחָנָן'), tok('שנאמר', 'שֶׁנֶּאֱמַר')]);
  const html = '<b>אמר</b> ר\' (בראשית א, ג) רבי יוח<b>נן</b> שנאמר';
  const v = vocalizeHtml(html, [], cur, null);
  assert.equal(v, '<b>אָמַר</b> ר\' (בראשית א, ג) רַבִּי יוֹחָ<b>נָן</b> שֶׁנֶּאֱמַר');
  assert.equal(strip(v), html);
});

test('the built explanations carry display niqqud where Dicta has reached (letters identical to the edition)', () => {
  let checked = 0;
  for (const [disp, say] of [['bavli/Bekhorot/56a.json', 'bsay/Bekhorot/56a.json']]) {
    const d = JSON.parse(fs.readFileSync(new URL('data/gemara/' + disp, root))), s = JSON.parse(fs.readFileSync(new URL('data/gemara/' + say, root)));
    d.segs.forEach(([, st], i) => { if (s.v[i]) { checked++; assert.equal(strip(s.v[i]).replace(/&quot;/g, '"'), strip(st).replace(/&quot;/g, '"')); assert.match(s.v[i], /[\u05B0-\u05BC]/); } });
  }
  assert.ok(checked > 5);
});

// ---------------- browser ----------------
const { serve, launch, pageWith, CHROME } = await import('./helpers.mjs');
test('reader: the library Bavli page with vocalized Steinsaltz; the niqqud setting turns it off; prev / next', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + '#/lib/bavli'); await p.waitForFunction(() => /סדר זרעים/.test(document.body.textContent) && /ברכות/.test(document.body.textContent));
    await p.goto(srv.url + '#/lib/bavli/Bekhorot/56a'); await p.waitForSelector('#rc .seg.gm .biur');
    const s = await p.$eval('#rc .seg.gm .biur', el => el.textContent);
    assert.match(s, /[\u05B0-\u05BC]/, 'vocalized explanation');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow at 320 px');
    assert.deepEqual(p.errors, []);
    await p.context().close();
    const q = await pageWith(b, srv.url, { prefs: { biurNiqqud: false } });
    await q.goto(srv.url + '#/lib/bavli/Bekhorot/56a'); await q.waitForSelector('#rc .seg.gm .biur');
    const plain = await q.$eval('#rc .seg.gm .biur', el => el.textContent.replace(/^ביאור\s*/, ''));
    assert.ok((plain.match(/[\u05B0-\u05BC]/g) || []).length < (s.match(/[\u05B0-\u05BC]/g) || []).length, 'fewer vowels with the setting off');
    await q.goto(srv.url + '#/lib/yerushalmi/Sanhedrin/24'); await q.waitForSelector('#rc .seg.gm .biur');
    assert.match(await q.$eval('#rc .seg.gm .biur', el => el.textContent), /פני משה/);
    assert.deepEqual(q.errors, []);
    await q.context().close();
  } finally { await b.close(); srv.close(); }
});
