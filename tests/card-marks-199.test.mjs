// 1.0.99: every lesson card on the home screen shows a defined letter in its progress ring (Nach Yomi / Shnayim Mikra showed "undefined")
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

test('home cards: every progress-ring glyph is one Hebrew letter; Nach Yomi נ, Shnayim Mikra ק', { skip: !CHROME && 'no Chrome' }, async () => {
  const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const unitMark = u => UNIT_MARK\[u\] \|\|/, 'fallback for units without a letter');
  const srv = await serve(), b = await launch();
  try {
    const prefs = { rambamTrack: 'both', lessonMitzvot: true, lessonTolt: true, lessonRavYomi: true, lessonDaf: true, lessonAmud: true, lessonYer: true, lessonMishna: true, lessonNach: true, lessonShnayim: true };
    const p = await pageWith(b, srv.url, { prefs, viewport: { width: 360, height: 740 } });
    await p.goto(srv.url + '#/d/2026-11-13');
    await p.waitForSelector('#card-shnayim .glyph');
    const marks = await p.$$eval('li.card .glyph', a => a.map(e => [e.closest('li.card').dataset.unit, e.textContent]));
    assert.ok(marks.length >= 15, `all cards: ${marks.length}`);
    for (const [u, g] of marks) assert.match(g, /^[\u05D0-\u05EA]$/, `${u}: "${g}"`);
    const m = Object.fromEntries(marks);
    assert.equal(m.nachyomi, 'נ'); assert.equal(m.shnayim, 'ק');
    for (const u of ['dafyomi', 'amudyomi', 'yerushalmi', 'mishnayomit']) assert.ok(m[u], u);
    assert.deepEqual(p.errors, []);
    await p.context().close();
  } finally { await b.close(); srv.close(); }
});
