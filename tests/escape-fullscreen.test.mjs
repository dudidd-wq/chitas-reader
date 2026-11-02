// Review 2 SHOULD 3/4: ⤢ reflects the real full-screen state; Esc closes one layer and never leaves the text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, CHROME, pageWith } from './helpers.mjs';

const D = '2026-11-02';
const skip = !CHROME && 'no Chrome/Chromium installed';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });
const inReader = p => p.evaluate(() => location.hash.startsWith('#/r/') && !document.querySelector('#reader').hidden);

test('#b-full aria-pressed follows fullscreenchange (incl. leaving full screen by the browser)', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg');
  assert.equal(await p.getAttribute('#b-full', 'aria-pressed'), 'false');
  await p.click('#b-full');
  await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
  await p.waitForTimeout(100);
  assert.equal(await p.getAttribute('#b-full', 'aria-pressed'), 'true');
  await p.evaluate(() => document.exitFullscreen());           // as if the browser left full screen (Esc / gesture)
  await p.waitForFunction(() => !document.fullscreenElement); await p.waitForTimeout(100);
  assert.equal(await p.getAttribute('#b-full', 'aria-pressed'), 'false');
  assert.equal(await p.evaluate(() => document.querySelector('#reader').classList.contains('immersive')), false, 'bars come back when full screen ends');
  assert.ok(await inReader(p));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('Escape: closes pop-up, then sheet, then shows the bars – and never navigates home', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + `#/r/chumash/${D}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(300);
  // gloss pop-up open + bars hidden: first Esc only closes the pop-up
  await p.evaluate(() => document.querySelector('#reader').classList.add('immersive'));
  const gl = await p.$('.gl');
  assert.ok(gl, 'reading has a gloss'); {
    await p.evaluate(() => { const g = document.querySelector('.gl'); g.scrollIntoView(); g.click(); });
    await p.waitForSelector('.gloss-pop');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    assert.equal(await p.$('.gloss-pop'), null, 'pop-up closed');
    assert.equal(await p.evaluate(() => document.querySelector('#reader').classList.contains('immersive')), true, 'same Esc did not also show the bars');
  }
  // bars hidden → Esc shows them
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  assert.equal(await p.evaluate(() => document.querySelector('#reader').classList.contains('immersive')), false);
  // sheet open → Esc closes only the sheet (also with focus on a control inside it)
  await p.click('#b-aa'); await p.waitForSelector('#sheet:not([hidden])');
  await p.focus('#sheet select, #sheet input');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  assert.equal(await p.evaluate(() => document.querySelector('#sheet').hidden), true);
  // nothing left to close → Esc (even repeated) stays in the text
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(60); }
  assert.ok(await inReader(p), 'still in the reader');
  // full screen: Esc does not leave the text either
  await p.click('#b-full'); await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  assert.ok(await inReader(p), 'still in the reader after Esc in full screen');
  assert.equal(await p.evaluate(() => !!document.fullscreenElement), false, 'full screen left');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
