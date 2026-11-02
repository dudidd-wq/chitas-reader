// Round-2 findings SHOULD 5 + 6: touch targets ≥44×44 px and a usable 568×320 landscape reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const scan = p => p.evaluate(() => [...document.querySelectorAll('a, button, select, input, label, [role=button], [tabindex]')].filter(e => {
  if (e.closest('[hidden], [inert]') || e.closest('.r-content') || e.matches('.sr, .skip')) return false;
  const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
  if (e.tagName === 'INPUT' && /radio|checkbox/.test(e.type) && (e.closest('label') || document.querySelector(`label[for="${e.id}"]`))) return false;
  // WCAG 2.5.8 inline exception: a link inside a sentence of running text
  if (e.tagName === 'A' && e.parentElement.matches('p, li') && e.parentElement.textContent.trim().length > e.textContent.trim().length + 10) return false;
  return r.width < 44 || r.height < 43.5;
}).map(e => `${e.tagName} ${e.id || e.className} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));

test('every control is at least 44×44 (toolbar in short landscape, Sources links, sheets)', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    for (const [w, h] of [[390, 844], [568, 320], [844, 390], [1280, 800]]) {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: h } });
      for (const r of ['#/d/' + D, '#/settings', '#/sources', '#/about', '#/r/chumash/' + D]) {
        await p.goto(srv.url + r); await p.waitForTimeout(r.startsWith('#/r/') ? 900 : 400);
        assert.deepEqual(await scan(p), [], `${w}x${h} ${r}`);
      }
      await p.click('#b-aa'); await p.waitForTimeout(300);
      assert.deepEqual(await scan(p), [], `${w}x${h} display sheet`);
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});

test('glossed words have a ≥44 px tall hit area without changing the text layout', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const g = [...document.querySelectorAll('.r-content .gl')].find(e => { const b = e.getBoundingClientRect(); return b.width && b.top > 100 && b.bottom < innerHeight - 100 && b.left > 30 && b.right < innerWidth - 30; });
      if (!g) return null;
      const b = g.getBoundingClientRect(), hit = getComputedStyle(g, '::before');
      const x = b.left + b.width / 2;
      return { h: b.height, extra: parseFloat(hit.top), above: document.elementFromPoint(x, b.top - 7) === g, below: document.elementFromPoint(x, b.bottom + 7) === g };
    });
    assert.ok(r, 'a visible glossed word');
    assert.ok(r.h + 2 * -r.extra >= 44, `hit area ${r.h} + ${-2 * r.extra}`);
    assert.ok(r.above && r.below, 'a tap just above/below the word still opens its gloss');
  } finally { await b.close(); srv.close(); }
});

test('568×320 landscape: bars auto-hide after idle, tap brings them back, more text per page', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 568, height: 320 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(400);
    const imm = () => p.evaluate(() => document.querySelector('#reader').classList.contains('immersive'));
    const pages = () => p.evaluate(() => +document.querySelector('#pinfo2').textContent.match(/מתוך (\d+)/)[1]);
    assert.equal(await imm(), false, 'bars visible at first');
    const before = await pages();
    assert.ok(before < 13, `fewer pages than the 13 measured in round 2 (got ${before})`);
    await p.waitForFunction(() => document.querySelector('#reader').classList.contains('immersive'), null, { timeout: 4000 });
    assert.ok(await pages() <= before, 'hidden bars give at least as much room');
    const vp = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.mouse.click(vp[0], vp[1]); await p.waitForTimeout(300);
    assert.equal(await imm(), false, 'tap in the middle shows the bars');
    // an open sheet keeps the bars
    await p.click('#b-aa'); await p.waitForTimeout(3000);
    assert.equal(await imm(), false, 'no auto-hide while a sheet is open');
    assert.deepEqual(p.errors, []);
    // taller screens never auto-hide
    const q = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await q.goto(srv.url + `#/r/chumash/${D}`); await q.waitForSelector('.seg'); await q.waitForTimeout(3200);
    assert.equal(await q.evaluate(() => document.querySelector('#reader').classList.contains('immersive')), false);
  } finally { await b.close(); srv.close(); }
});
