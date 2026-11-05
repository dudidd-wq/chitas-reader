// 1.0.65: refresh / soft nav without a pinned date uses today's civil date; pinned #/d|/zmanim|/r keep their day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPinsDate, resolveViewDate } from '../site/js/calendar.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

test('hashPinsDate recognises explicit day routes only', () => {
  assert.equal(hashPinsDate('#/d/2026-11-03'), '2026-11-03');
  assert.equal(hashPinsDate('#/zmanim/2026-11-03'), '2026-11-03');
  assert.equal(hashPinsDate('#/r/chumash/2026-11-03'), '2026-11-03');
  assert.equal(hashPinsDate('#/r/tanya/2026-11-03?x=1'), '2026-11-03');
  assert.equal(hashPinsDate('#/siddur'), null);
  assert.equal(hashPinsDate('#/s/brachot/4'), null);
  assert.equal(hashPinsDate('#/settings'), null);
  assert.equal(hashPinsDate(''), null);
  assert.equal(hashPinsDate('#/r/chumash'), null);
  assert.equal(hashPinsDate('#/lib/torah/Genesis/1'), null);
});

test('resolveViewDate snaps to today unless the hash pins a day', () => {
  assert.equal(resolveViewDate('#/siddur', '2026-11-05', '2026-11-03'), '2026-11-05');
  assert.equal(resolveViewDate('#/d/2026-11-03', '2026-11-05', '2026-11-03'), '2026-11-03');
  assert.equal(resolveViewDate('#/zmanim/2026-11-01', '2026-11-05', '2026-11-04'), '2026-11-01');
  assert.equal(resolveViewDate('#/r/tehillim/2026-11-02', '2026-11-05', '2026-11-04'), '2026-11-02');
});

const skip = !CHROME && 'no Chrome';
test('browser: leaving a pinned day for an unpinned view snaps home to today', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/d/2026-11-03');
    await p.waitForSelector('#datepick');
    assert.match(await p.inputValue('#datepick'), /03\/11\/2026/);
    await p.goto(srv.url + '#/siddur');
    await p.waitForSelector('.sd-toc');
    await p.goto(srv.url + '#/');
    await p.waitForSelector('#datepick');
    const today = await p.evaluate(() => {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    });
    assert.equal(await p.inputValue('#datepick'), today);
    assert.match(await p.locator('.tf-always a').getAttribute('href'), /#\/s\/brachot\/4/);
    // a pinned day survives reload
    await p.goto(srv.url + '#/d/2026-11-03');
    await p.waitForSelector('#datepick');
    await p.reload();
    await p.waitForSelector('#datepick');
    assert.match(await p.inputValue('#datepick'), /03\/11\/2026/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
