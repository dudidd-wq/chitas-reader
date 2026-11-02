// Review 3 SHOULD 4/5: "save for 30 days" asks for persistent storage and reports the browser's real answer;
// a status message does not survive navigation (it contradicted the offline error page).
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, CHROME, pageWith } from './helpers.mjs';

const D = '2026-11-02';
const skip = !CHROME && 'no Chrome/Chromium installed';
let srv, browser;
test.before(async () => { if (skip) return; srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

const stub = answer => [a => {
  window.__persistCalls = 0;
  const s = navigator.storage || {};
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { ...s, estimate: s.estimate?.bind(s), persisted: async () => false, persist: async () => { window.__persistCalls++; return a; } } });
}, answer];

for (const [answer, re] of [[true, /אישר אחסון קבוע/], [false, /לא אישר אחסון קבוע/]]) {
  test(`save for offline requests persistent storage and shows the answer (${answer})`, { skip }, async () => {
    const p = await pageWith(browser, srv.url, { init: stub(answer) });
    await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#dl30');
    await p.click('#dl30');
    await p.waitForFunction(() => document.querySelector('#dl-st').textContent.length > 0, null, { timeout: 60000 });
    const st = await p.textContent('#dl-st');
    assert.match(st, /נשמרו במכשיר/); assert.match(st, re);
    assert.equal(await p.evaluate(() => window.__persistCalls), 1);
    assert.equal(await p.getAttribute('#dl-st', 'role'), 'status');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('a status toast is cleared when navigating', { skip }, async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + `#/d/${D}`); await p.waitForSelector('#loc');
  await p.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'הטקסטים ל-30 הימים הקרובים נשמרו במכשיר'; t.classList.add('show'); });
  await p.goto(srv.url + '#/r/chumash/2027-03-01'); await p.waitForSelector('#rc');
  const t = await p.evaluate(() => { const t = document.querySelector('#toast'); return { show: t.classList.contains('show'), text: t.textContent }; });
  assert.equal(t.show, false); assert.equal(t.text, '');
  await p.context().close();
});
