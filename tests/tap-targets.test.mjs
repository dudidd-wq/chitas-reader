// Round-2 findings SHOULD 5 + 6: touch targets ≥44×44 px and a usable 568×320 landscape reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME, openChrome } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const DG = '2026-12-06'; // Gen 41:1–14: a cross-checked gloss (41:2 בְּרִיאֹת) on the first page
const scan = p => p.evaluate(() => [...document.querySelectorAll('a, button, select, input, label, [role=button], [tabindex]')].filter(e => {
  if (e.closest('[hidden], [inert]') || e.closest('.r-content') || e.matches('.sr, .skip')) return false;
  const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
  // not a target at all: hidden from AT, out of the tab order and not clickable (the native picker behind the calendar button)
  if (e.getAttribute('aria-hidden') === 'true' && e.tabIndex < 0 && getComputedStyle(e).pointerEvents === 'none') return false;
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
      await openChrome(p);
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
    await p.goto(srv.url + `#/r/chumash/${DG}`); await p.waitForSelector('.seg'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const vp = document.getElementById('vp');
      const g = document.querySelector('.r-content .gl');
      if (!g) return null;
      g.scrollIntoView({ block: 'center', inline: 'center' });
      const b = g.getBoundingClientRect(), hit = getComputedStyle(g, '::before');
      const x = b.left + b.width / 2;
      return { h: b.height, extra: parseFloat(hit.top), above: document.elementFromPoint(x, b.top - 7) === g, below: document.elementFromPoint(x, b.bottom + 7) === g, on: b.top > 0 && b.bottom < innerHeight };
    });
    assert.ok(r, 'a visible glossed word');
    assert.ok(r.h + 2 * -r.extra >= 44, `hit area ${r.h} + ${-2 * r.extra}`);
    assert.ok(r.above && r.below, 'a tap just above/below the word still opens its gloss');
  } finally { await b.close(); srv.close(); }
});

test('568×320 landscape: full-screen text, FAB opens the nav, idle or a text tap closes it', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 568, height: 320 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(400);
    const on = () => p.evaluate(() => document.getElementById('reader').classList.contains('chrome-on'));
    const pages = () => p.evaluate(() => { const t = document.querySelector('#pinfo, #pinfo2')?.textContent || ''; const m = t.match(/מתוך (\d+)/); return m ? +m[1] : (window.R?.pages || 0); });
    assert.equal(await on(), false, 'overlay should start closed');
    assert.ok(await p.evaluate(() => { const f = document.getElementById('b-fab'); return f && getComputedStyle(f).opacity !== '0'; }), 'FAB missing');
    await p.addStyleTag({ content: '#doc-gloss{display:none}' }); await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(600);
    const before = await pages();
    assert.ok(before <= 13, `page count in short landscape (got ${before})`);
    await openChrome(p);
    assert.equal(await on(), true);
    const afterOpen = await pages();
    assert.equal(afterOpen, before, 'opening the overlay must not re-paginate');
    const vp = await p.evaluate(() => { const r = document.querySelector('#vp').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 24]; });
    await p.mouse.click(vp[0], vp[1]); await p.waitForTimeout(300);
    assert.equal(await on(), false, 'tap on the text closes the overlay');
    await openChrome(p);
    await p.click('#b-aa'); await p.waitForTimeout(5500);
    assert.equal(await on(), true, 'no auto-hide while a sheet is open');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    assert.deepEqual(p.errors, []);
    const l = await pageWith(b, srv.url, { viewport: { width: 844, height: 390 } });
    await l.goto(srv.url + `#/r/chumash/${D}`); await l.waitForSelector('.seg');
    assert.equal(await l.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')), false);
    const q = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await q.goto(srv.url + `#/r/chumash/${D}`); await q.waitForSelector('.seg');
    assert.equal(await q.evaluate(() => document.getElementById('reader').classList.contains('chrome-on')), false);
    assert.ok(await q.evaluate(() => { const f = document.getElementById('b-fab'); return f && getComputedStyle(f).opacity !== '0'; }));
  } finally { await b.close(); srv.close(); }
});
