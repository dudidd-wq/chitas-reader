// What-was-said report: heard vs skipped vs learned. Speech text only; display is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSaidReport, saidToTsv, renderSaidHtml, speechForSegment, SAID_STATUS } from '../site/js/tts-said.js';

const hashemSeg = (html, extra = {}) => ({ parts: [html], cites: [false], ...extra });

test('A5b: speech expands the Name and matches what the voice would say (prepareForTTS only)', () => {
  const { text } = speechForSegment(hashemSeg('בָּרוּךְ <b>ה׳</b>'), { divineName: 'hashem', engine: 'web', stress: true });
  assert.match(text, /הַשֵּׁם/);
  assert.doesNotMatch(text, /<b>/);
});

test('A5b: kaddish and gemara-skip are skipped even if they have HTML', () => {
  const r = buildSaidReport({
    segments: [
      { ...hashemSeg('יִתְגַּדַּל'), kaddish: true },
      { ...hashemSeg('אָמַר רַב'), gemaraSkip: true },
      hashemSeg('שָׁלוֹם'),
    ],
    opts: { divineName: 'hashem', engine: 'web' },
  });
  assert.equal(r.items[0].status, 'skipped');
  assert.equal(r.items[0].reason, 'kaddish');
  assert.equal(r.items[0].speech, '');
  assert.equal(r.items[1].status, 'skipped');
  assert.equal(r.items[1].reason, 'gemara');
  assert.equal(r.items[2].status, 'pending');
  assert.match(r.items[2].speech, /שָׁלוֹם/);
  assert.equal(r.counts.skipped, 2);
  assert.equal(r.counts.pending, 1);
  assert.equal(r.learned, false);
});

test('A5b: empty parts are skipped; learned is independent of what was heard', () => {
  const r = buildSaidReport({
    segments: [hashemSeg('שָׁלוֹם'), { parts: [] }],
    opts: { engine: 'web' },
    playback: { started: true, complete: true, heardSi: [0] },
    learned: true,
  });
  assert.equal(r.items[0].status, 'heard');
  assert.equal(r.items[1].status, 'skipped');
  assert.equal(r.items[1].reason, 'empty');
  assert.equal(r.learned, true);
  assert.equal(r.counts.heard, 1);
});

test('A5b: starting mid-lesson marks earlier queued segments unheard, not heard or learned', () => {
  const r = buildSaidReport({
    segments: [hashemSeg('א'), hashemSeg('ב'), hashemSeg('ג')],
    opts: { engine: 'web' },
    playback: { started: true, playing: true, currentSi: 2, heardSi: [2] },
    learned: false,
  });
  assert.equal(r.items[0].status, 'unheard');
  assert.equal(r.items[0].reason, 'midstart');
  assert.equal(r.items[1].status, 'unheard');
  assert.equal(r.items[2].status, 'playing');
  assert.equal(r.learned, false);
});

test('A5b: TSV is local text; statuses are Hebrew in a column; no raw HTML', () => {
  const r = buildSaidReport({
    segments: [{ ...hashemSeg('יִתְגַּדַּל'), kaddish: true }, hashemSeg('שָׁלוֹם')],
    opts: { engine: 'web' },
  });
  const tsv = saidToTsv(r);
  assert.match(tsv, /^si\tid\tstatus\tstatus_he\treason\treason_he\tspeech\n/);
  assert.match(tsv, /\tskipped\tדולג\tkaddish\t/);
  assert.match(tsv, /\tpending\tיוקרא\t/);
  assert.doesNotMatch(tsv, /<b>/);
  assert.equal(SAID_STATUS.heard, 'הושמע');
});

test('A5b: HTML tags in source are stripped like the voice; the renderer still escapes leftover <', () => {
  const r = buildSaidReport({
    segments: [hashemSeg('שָׁלוֹם <img onerror="x">')],
    opts: { engine: 'web' },
    learned: true,
  });
  assert.equal(r.items[0].speech, 'שָׁלוֹם');
  const html = renderSaidHtml(r);
  assert.match(html, /id="said-report"/);
  assert.match(html, /id="sh-said-export"/);
  assert.match(html, /השיעור מסומן כנלמד/);
  assert.doesNotMatch(html, /<img/);
  const sneaky = renderSaidHtml({ ...r, items: [{ ...r.items[0], speech: 'שָׁלוֹם <img onerror="x">' }] });
  assert.match(sneaky, /&lt;img/);
  assert.doesNotMatch(sneaky, /<img onerror/);
});

test('A5b: finishing after a mid-lesson start leaves earlier segments unheard, not heard', () => {
  const r = buildSaidReport({
    segments: [hashemSeg('א'), hashemSeg('ב'), hashemSeg('ג')],
    opts: { engine: 'web' },
    playback: { started: true, complete: true, currentSi: 2, heardSi: [1, 2] },
    learned: true,
  });
  assert.equal(r.items[0].status, 'unheard');
  assert.equal(r.items[0].reason, 'midstart');
  assert.equal(r.items[1].status, 'heard');
  assert.equal(r.items[2].status, 'heard');
  assert.equal(r.learned, true);
  assert.equal(r.counts.unheard, 1);
  assert.equal(r.counts.heard, 2);
});

test('A5b: resolveSaidEngine follows the live speaker, not a Piper preference, on Web Speech fallback', async () => {
  const { resolveSaidEngine } = await import('../site/js/tts-said.js');
  assert.equal(resolveSaidEngine({ hasSpeaker: true, speakerIsPiper: false, preferPiper: true }), 'web');
  assert.equal(resolveSaidEngine({ hasSpeaker: true, speakerIsPiper: true, preferPiper: false }), 'piper');
  assert.equal(resolveSaidEngine({ hasSpeaker: false, speakerIsPiper: false, preferPiper: true }), 'piper');
  assert.equal(resolveSaidEngine({ hasSpeaker: false, preferPiper: false }), 'web');
});
