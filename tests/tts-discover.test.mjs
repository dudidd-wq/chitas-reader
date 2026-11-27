// t360u/t361u: said/wrong controls must be findable — hint in Settings, controls at the top of the TTS sheet.
// t361u: #sh-said is the live-highlight toggle «הדגשת המוקרא כעת», not a past-speech list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME, openChrome } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';

test('Settings shows a hint and does not show the said/wrong buttons', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/settings');
    await p.waitForSelector('#set-tts');
    assert.equal(await p.locator('#said-wrong-hint').count(), 1);
    assert.match(await p.locator('#said-wrong-hint').innerText(), /הדגשת המוקרא כעת/);
    assert.match(await p.locator('#said-wrong-hint').innerText(), /לא נשמע נכון/);
    assert.equal(await p.locator('#sh-said, #sh-wrong, #sh-wrong-list').count(), 0);
    assert.equal(await p.locator('#set-ver-hint').count(), 1);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('During a lesson the buttons sit at the top of the TTS sheet, above the voice options', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + `#/r/rambam3/${D}`);
    await p.waitForSelector('#rc .seg');
    await openChrome(p);
    await p.keyboard.press('p');
    await p.waitForSelector('#ttsctl:not([hidden])');
    // at 320px the gear may be clipped; opening the sheet does not depend on its click-box
    await p.evaluate(() => document.getElementById('t-set')?.click());
    await p.waitForSelector('#sheet #sh-said');
    const m = await p.evaluate(() => {
      const said = document.querySelector('#sh-said');
      const wrong = document.querySelector('#sh-wrong');
      const list = document.querySelector('#sh-wrong-list');
      const voice = document.querySelector('#tts-voice-h');
      const play = document.querySelector('#sh-play');
      const sheet = document.querySelector('#sheet');
      const sr = said.getBoundingClientRect();
      return {
        hasAll: !!(said && wrong && list),
        labels: [said.textContent, wrong.textContent, list.textContent],
        aboveVoice: sr.bottom <= voice.getBoundingClientRect().top + 1,
        belowPlay: sr.top >= play.getBoundingClientRect().bottom - 1,
        inView: sr.top >= sheet.getBoundingClientRect().top - 1 && sr.bottom <= Math.min(innerHeight, sheet.getBoundingClientRect().bottom) + 1,
        hintInSheet: !!document.querySelector('#sheet #said-wrong-hint'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(m.hasAll, true);
    assert.deepEqual(m.labels, ['הדגשת המוקרא כעת', 'לא נשמע נכון', 'דיווחים שמורים']);
    assert.equal(m.aboveVoice, true, 'buttons must sit above the long voice form');
    assert.equal(m.belowPlay, true);
    assert.equal(m.inView, true, 'buttons must be visible at the top of the sheet at 320px');
    assert.equal(m.hintInSheet, false, 'the settings hint is not a substitute for the buttons during a lesson');
    assert.equal(m.overflow, false);
    assert.equal(await p.locator('#sh-said').getAttribute('aria-pressed'), 'true');
    assert.equal(await p.locator('#said-view').count(), 0);
    await p.click('#sh-said');
    assert.equal(await p.locator('#sh-said').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
