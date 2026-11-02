// Round-2 finding SHOULD 9: on days when Israel and the Diaspora read different Chumash portions the reading position
// is stored per location, so switching location never resumes in the middle of the other text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { progressKey, isDivergent } from '../site/js/store.js';
import { serve, launch, pageWith, progressOf, CHROME } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const DIV = '2026-05-24'; // Israel: Beha'alotcha, Diaspora: Nasso

test('progress key carries the location only where the texts differ', () => {
  assert.equal(isDivergent(DIV, 'chumash'), true);
  assert.equal(progressKey(DIV, 'chumash', true), `${DIV}|chumash|il`);
  assert.equal(progressKey(DIV, 'chumash', false), `${DIV}|chumash|dl`);
  assert.equal(progressKey(DIV, 'tehillim', false), `${DIV}|tehillim`);
  assert.equal(progressKey('2026-11-02', 'chumash', false), '2026-11-02|chumash');
  assert.equal(progressKey('2026-11-02', 'chumash', true), '2026-11-02|chumash');
});

test('switching location on a divergent day starts the other text from the top and keeps each position', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { il: true }, viewport: { width: 390, height: 844 } });
    const open = async () => { await p.goto(srv.url + `#/r/chumash/${DIV}`); await p.waitForSelector('#rc .seg'); await p.waitForTimeout(500); return p.textContent('#pinfo'); };
    const setIl = async v => { await p.goto(srv.url + '#/settings'); await p.locator(`label:has(input[name="il"][value="${v}"])`).click(); await p.waitForTimeout(200); };
    assert.match(await open(), /^עמוד 1 /);
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(600);
    assert.match(await p.textContent('#pinfo'), /^עמוד 3 /);
    await p.goto(srv.url + '#/'); await p.waitForTimeout(300);
    await setIl('false');
    assert.match(await open(), /^עמוד 1 /, 'Diaspora (Nasso) starts at the top');
    assert.match(await p.textContent('#r-t'), /נשא/);
    await p.goto(srv.url + '#/'); await p.waitForTimeout(300);
    await setIl('true');
    assert.match(await open(), /^עמוד 3 /, 'Israel resumes where it was');
    const keys = Object.keys(await progressOf(p));
    assert.ok(keys.includes(`${DIV}|chumash|il`), keys.join());
    assert.ok(!keys.includes(`${DIV}|chumash`), 'no location-less key on a divergent day');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
