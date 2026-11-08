// Actual daily AND library reader -> local queue -> IPA, without installing a voice or making any remote request.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const fake = () => {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [{ name: 'Test Hebrew', lang: 'he-IL', default: true, localService: true }],
    cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}, speak() {},
  } });
};
test('1.0.78: Rashi primary stress reaches each local part in daily lessons and the library', { skip: !CHROME }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: fake, prefs: { ttsEngine: 'web', ttsRashi: true, rashi: true, layout: 'scroll', ttsContinuous: false } });
    for (const route of ['#/r/chumash/2026-11-08', '#/lib/torah/Genesis/25']) {
      await p.goto(srv.url + route); await p.waitForSelector('#rc .rashi p');
      await p.evaluate(async () => {
        const { Speaker } = await import('/js/tts.js');
        window.__cap = null;
        Speaker.prototype.load = function(segs, opts) { window.__cap = { segs: segs.map(({ el, ...s }) => s), opts }; };
        Speaker.prototype.startAt = function() {};
      });
      await p.click('#b-tts'); await p.waitForFunction(() => window.__cap !== null);
      const result = await p.evaluate(async () => {
        const { PiperSpeaker } = await import('/js/piper.js'), { textToIPA } = await import('/js/g2p.js');
        const data = await (await fetch('/voice/stress-he.json')).json();
        const speaker = new PiperSpeaker({}); speaker.load(__cap.segs, __cap.opts);
        const q = speaker.queue.filter(x => /כַּמָּה|שֶׁכָּתַב/.test(x.text)), trace = [];
        for (const x of q) textToIPA(x.text, { data, accents: x.acc, trace });
        return { q, trace, c: __cap.segs.filter(s => s.accParts?.slice(1).some(Boolean)).length };
      });
      assert.ok(result.c > 0, route);
      assert.ok(result.q.some(q => q.acc.primary?.includes('\u05AB')), route);
      assert.ok(result.q.every(q => !q.text.includes('\u05AB')), 'internal tags never spoken');
      for (const [word, ipa] of [['כַּמָּה', 'kˈama'], ['שֶׁכָּתַב', 'ʃekatˈav']]) {
        const hits = result.trace.filter(t => t.word === word);
        assert.ok(hits.length, word + route);
        assert.ok(hits.every(t => t.ipa === ipa && t.src === 'primary'), JSON.stringify(hits));
      }
    }
  } finally { await b.close(); srv.close(); }
});
