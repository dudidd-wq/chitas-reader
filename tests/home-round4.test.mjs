// Round 4: neutral first visit, "(המשך)" on the home Tanya card, screen-reader verse numbers, repeated marks collapsed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';

test('first visit: equal choices, no lessons until one is chosen', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { locationChosen: false } });
    await p.goto(srv.url + '#/d/2026-11-02'); await p.waitForSelector('#locq');
    assert.equal(await p.$$eval('#locq .btn.primary', x => x.length), 0, 'nothing pre-selected');
    assert.equal(await p.$$eval('.card', x => x.length), 0, 'no lessons listed before choosing');
    await p.click('#locq [data-il="false"]'); await p.waitForSelector('.card');
    assert.equal(await p.$$eval('.card', x => x.length), 5);
    assert.match(await p.textContent('#loc'), /חוץ לארץ/);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('reader opened before choosing states the default calendar', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { locationChosen: false } });
    await p.goto(srv.url + '#/r/chumash/2026-11-02'); await p.waitForSelector('#rc .seg');
    assert.match(await p.textContent('#rc'), /ברירת מחדל לפי אזור הזמן/);
  } finally { await b.close(); srv.close(); }
});

test('home Tanya card shows "(המשך)" as the reader does (2026-11-02)', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/d/2026-11-02');
    await p.waitForFunction(() => !/…/.test(document.querySelector('[data-what="tanya"]')?.textContent || '…'));
    const home = await p.textContent('[data-what="tanya"]');
    await p.goto(srv.url + '#/r/tanya/2026-11-02'); await p.waitForSelector('#rc h2');
    const h2 = await p.textContent('#rc h2');
    assert.equal(home, h2);
    assert.match(home, /\(המשך\)/);
  } finally { await b.close(); srv.close(); }
});

test('verse numbers are announced, not just shown; repeated marks are collapsed', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { rashi: true } });
    await p.goto(srv.url + '#/r/chumash/2026-02-06'); await p.waitForSelector('#rc .seg');
    const sr = await p.$$eval('#rc .seg .sr', x => x.map(e => e.textContent.trim()));
    assert.ok(sr.length > 10 && sr.every(t => /^פסוק [א-ת״׳"']+$/.test(t)), sr.slice(0, 3).join('|'));
    await p.goto(srv.url + '#/r/rambam3/2026-11-02'); await p.waitForSelector('#rc .seg');
    assert.match(await p.$eval('#rc .seg .sr', e => e.textContent), /^הלכה /);
    assert.equal(await p.evaluate(() => /([\u0591-\u05C7])\1/.test(document.querySelector('#rc').textContent)), false);
  } finally { await b.close(); srv.close(); }
});
