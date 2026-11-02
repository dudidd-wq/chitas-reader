// Round-1 findings: landscape layout, immersive re-pagination, narrow-screen justification, first-run location,
// modal sheets (aria-modal + focus trap) and landmarks.
import test from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { pageGeometry } from '../site/js/layout.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

test('page geometry: ragged text on narrow phones, justified from ~390px, two-page spread only on wide landscape', () => {
  assert.equal(pageGeometry({ W: 320, H: 568, size: 24 }).ragged, true);
  assert.equal(pageGeometry({ W: 360, H: 740, size: 24 }).ragged, true);
  assert.equal(pageGeometry({ W: 390, H: 844, size: 24 }).ragged, false);
  assert.equal(pageGeometry({ W: 1366, H: 800, size: 24 }).spread, true);
  assert.equal(pageGeometry({ W: 1366, H: 800, size: 24, spreadPref: false }).spread, false);
  assert.equal(pageGeometry({ W: 844, H: 390, size: 24 }).spread, false);
  assert.equal(pageGeometry({ W: 1024, H: 1366, size: 24 }).spread, false);
  const g = pageGeometry({ W: 1366, H: 800, size: 24 }); assert.equal(g.P + g.gap, 683);
});

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';
const pageState = p => p.evaluate(() => {
  const rc = document.querySelector('#rc'), vp = document.querySelector('#vp');
  const segs = [...rc.querySelectorAll('.seg')], W = vp.clientWidth, vr = vp.getBoundingClientRect();
  const visible = segs.filter(s => { const r = s.getBoundingClientRect(); return r.right > vr.left + 2 && r.left < vr.right - 2 && r.bottom < innerHeight + 2; }).length;
  const top = document.querySelector('#rt'), bot = document.querySelector('#rb');
  return { info: document.querySelector('#pinfo').textContent, visible, padTop: parseFloat(rc.style.paddingTop), topH: top.offsetHeight, botShown: !!bot.offsetHeight, H: innerHeight, W,
    align: getComputedStyle(rc).textAlign };
});

test('small landscape (568x320): text starts on page 1, a single compact bar, page controls in it', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 568, height: 320 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg');
    await p.waitForTimeout(300);
    const s = await pageState(p);
    assert.ok(s.visible >= 1, 'page 1 must contain text, not only the title');
    assert.equal(s.botShown, false, 'bottom bar hidden in short landscape');
    assert.ok(s.topH / s.H <= 0.16, `top bar ${s.topH}px of ${s.H}`);
    assert.ok(await p.isVisible('#b-next2'));
    await p.click('#b-next2'); await p.waitForTimeout(400);
    assert.match(await p.textContent('#pinfo2'), /^עמוד 2 מתוך/);
    for (const [w, h] of [[844, 390], [740, 360]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
      const t = await pageState(p); assert.ok(t.topH / t.H <= 0.15, `${w}x${h}: chrome ${t.topH}/${t.H}`);
    }
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('immersive mode re-paginates into the freed space and keeps the reading position', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 390, height: 844 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(300);
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500);
    const before = await pageState(p);
    // the segment the page starts with (its beginning – right edge in RTL – is on this page)
    const segBefore = await p.evaluate(() => { const vr = document.querySelector('#vp').getBoundingClientRect(); return [...document.querySelectorAll('.seg')].find(s => { const r = s.getBoundingClientRect(); return r.right > vr.left + 2 && r.right <= vr.right + 2; })?.dataset.id; });
    await p.mouse.click(195, 420); await p.waitForTimeout(500);
    assert.ok(await p.evaluate(() => document.querySelector('#reader').classList.contains('immersive')));
    const after = await pageState(p);
    assert.ok(after.padTop < before.padTop - 30, `padding shrinks: ${before.padTop} → ${after.padTop}`);
    const n = s => Number(s.info.match(/מתוך (\d+)/)[1]);
    assert.ok(n(after) <= n(before), `page count ${n(before)} → ${n(after)}`);
    const visIds = await p.evaluate(() => { const vr = document.querySelector('#vp').getBoundingClientRect(); return [...document.querySelectorAll('.seg')].filter(s => { const r = s.getBoundingClientRect(); return r.right > vr.left && r.left < vr.right; }).map(s => s.dataset.id); });
    assert.ok(visIds.includes(segBefore), 'the segment that was being read is still on screen');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('320px: text is start-aligned (no wide justification gaps); 390px stays justified; 1366x800 shows a two-page spread', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(300);
    assert.equal((await pageState(p)).align, 'start');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
    assert.equal((await pageState(p)).align, 'justify');
    await p.setViewportSize({ width: 1366, height: 800 }); await p.waitForTimeout(500);
    assert.match((await pageState(p)).info, /^עמודים 1–2 מתוך \d+$/);
    assert.ok(await p.isVisible('.spine'));
  } finally { await b.close(); srv.close(); }
});

test('first run asks Israel / Diaspora once; the choice is shown in a prominent chip', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { locationChosen: false } });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#locq');
    await p.click('#locq [data-il="false"]'); await p.waitForTimeout(200);
    assert.equal(await p.isVisible('#locq'), false);
    assert.match(await p.textContent('#loc'), /חוץ לארץ/);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs);
    assert.equal(st.il, false); assert.equal(st.locationChosen, true);
    await p.reload(); await p.waitForSelector('#loc');
    assert.equal(await p.isVisible('#locq'), false, 'asked only once');
    await p.click('#loc'); await p.waitForSelector('#locq');
    await p.click('#locq [data-il="true"]'); await p.waitForTimeout(200);
    assert.match(await p.textContent('#loc'), /ארץ ישראל/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('sheets are modal dialogs: aria-modal, focus trapped, background inert, focus returns to the opener; reader has landmarks (axe region)', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(300);
    const axe = async () => (await new AxeBuilder({ page: p }).analyze()).violations.map(v => v.id);
    assert.deepEqual(await axe(), [], 'reader: no axe violations (all rules incl. best practices)');
    await p.focus('#b-aa'); await p.keyboard.press('Enter'); await p.waitForSelector('#sheet:not([hidden])');
    assert.equal(await p.getAttribute('#sheet', 'aria-modal'), 'true');
    assert.equal(await p.evaluate(() => document.querySelector('#vp').inert && document.querySelector('#rt').inert), true);
    for (let i = 0; i < 60; i++) { await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('#sheet').contains(document.activeElement)), 'focus left the sheet at Tab #' + i); }
    for (let i = 0; i < 5; i++) { await p.keyboard.press('Shift+Tab'); assert.ok(await p.evaluate(() => document.querySelector('#sheet').contains(document.activeElement))); }
    assert.deepEqual(await axe(), [], 'open sheet: no axe violations');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'b-aa');
    assert.equal(await p.evaluate(() => document.querySelector('#vp').inert), false);
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('.card');
    assert.deepEqual(await axe(), [], 'home: no axe violations');
  } finally { await b.close(); srv.close(); }
});

test('any word (here in Tanya, which has no glossary) can be selected and looked up in Wiktionary; niqqud stripped', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + `#/r/tanya/${D}`); await p.waitForSelector('.seg'); await p.waitForTimeout(300);
    await p.evaluate(() => {
      const t = [...document.querySelectorAll('.seg .t, .seg')].map(e => e.firstChild).find(n => n?.nodeType === 3 && /\S{3,}/.test(n.nodeValue));
      const m = t.nodeValue.match(/[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7]{2,}/);
      const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
      getSelection().removeAllRanges(); getSelection().addRange(r);
    });
    await p.waitForSelector('.lookup-pop a');
    const href = await p.getAttribute('.lookup-pop a', 'href');
    assert.match(href, /^https:\/\/he\.wiktionary\.org\/w\/index\.php\?search=/);
    assert.doesNotMatch(decodeURIComponent(href), /[\u0591-\u05C7]/, 'no niqqud in the query');
    await p.evaluate(() => getSelection().removeAllRanges()); await p.waitForTimeout(500);
    assert.equal(await p.$('.lookup-pop'), null);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('round 3+4: at 320×568 portrait page 1 is well filled (compact title) and no Rashi block leaves a stub at a page edge', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('.seg'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const vp = document.querySelector('#vp').getBoundingClientRect(), rc = document.querySelector('#rc');
      const padB = parseFloat(getComputedStyle(rc).paddingBottom), bottom = vp.bottom - padB;
      const onPage1 = [...rc.querySelectorAll('.t, .rashi p')].flatMap(e => [...e.getClientRects()]).filter(x => x.left >= vp.left - 1 && x.right <= vp.right + 1);
      const rashi = document.querySelector('.seg .rashi p');
      const lh = parseFloat(getComputedStyle(rashi).lineHeight);
      // round 4: a short Rashi block is moved whole rather than split (it may leave up to a quarter of the page);
      // any block that is split starts with at least 2.5 lines
      const stubs = [...rc.querySelectorAll('.rashi')].filter(r => { const rs = r.getClientRects(); return rs.length > 1 && rs[0].height < lh * 2.5; }).length;
      return { fill: (Math.max(...onPage1.map(x => x.bottom)) - vp.top) / (bottom - vp.top), stubs, kicker: getComputedStyle(document.querySelector('.doc-kicker') || document.body).display };
    });
    assert.ok(r.fill > 0.75, `page 1 only ${Math.round(r.fill * 100)}% filled`);
    assert.equal(r.stubs, 0, 'no Rashi stub at the foot of a page');
    assert.equal(r.kicker, 'none');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('round 4: no lone Rashi lines at a page edge (568×320 after the bars hide, 390×740, 320×568)', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    for (const [w, h, iso] of [[568, 320, '2026-11-02'], [568, 320, '2026-02-06'], [390, 740, '2026-02-06'], [320, 568, '2026-11-03']]) {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: h } });
      await p.goto(srv.url + `#/r/chumash/${iso}`); await p.waitForSelector('.seg'); await p.waitForTimeout(w === 568 ? 3500 : 500);
      // a split block starts with ≥2.5 lines; no comment is split leaving a single line on either side
      const bad = await p.evaluate(() => [...document.querySelectorAll('.rashi')].flatMap(r => {
        const rs = [...r.getClientRects()], lh = parseFloat(getComputedStyle(r).lineHeight);
        const out = rs.length > 1 && rs[0].height < lh * 2.5 ? ['block starts with ' + Math.round(rs[0].height)] : [];
        for (const q of r.children) { const qs = [...q.getClientRects()]; if (qs.length > 1 && (qs[0].height < lh * 1.5 || qs.at(-1).height < lh * 1.5)) out.push('comment ' + qs.map(x => Math.round(x.height)).join('/')); }
        return out;
      }));
      assert.deepEqual(bad, [], `${w}×${h} ${iso}`);
      await p.close();
    }
  } finally { await b.close(); srv.close(); }
});

test('round 4: the reader top-bar subtitle (date + range) is not cut with an ellipsis at 390 wide', { skip: !CHROME && 'no Chrome' }, async () => {
  const srv = await serve(); const b = await launch();
  try {
    for (const w of [390, 320]) for (const iso of ['2026-11-03', '2026-02-06']) {
      const p = await pageWith(b, srv.url, { viewport: { width: w, height: 844 } });
      await p.goto(srv.url + `#/r/chumash/${iso}`); await p.waitForSelector('.seg'); await p.waitForTimeout(300);
      const r = await p.$$eval('#r-s span', ss => ss.map(s => ({ t: s.textContent, cut: s.scrollWidth > s.clientWidth + 1 })));
      assert.equal(r.length, 2, iso); assert.deepEqual(r.filter(x => x.cut), [], `${w} ${iso}`);
      assert.match(r[0].t, /ב(מרחשוון|שבט) תשפ״[זו]/); assert.match(r[0].t, /\d\d\/\d\d\/\d{4}/);
      assert.match(r[1].t, /\S/);
      await p.close();
    }
  } finally { await b.close(); srv.close(); }
});
