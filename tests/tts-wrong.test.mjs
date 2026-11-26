import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WRONG_KEY, WRONG_CAP,
  cleanWrongEntry, loadWrongReports, saveWrongReports,
  addWrongReport, removeWrongReport, clearWrongReports,
  exportWrongJson, importWrongJson, renderWrongHtml,
} from '../site/js/tts-wrong.js';

const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};

function reset() { for (const k of Object.keys(mem)) delete mem[k]; }

test('cleanWrongEntry drops empty, huge, and unsane fields', () => {
  assert.equal(cleanWrongEntry(null), null);
  assert.equal(cleanWrongEntry({ t: 0, speech: 'א' }), null);
  assert.equal(cleanWrongEntry({ t: Date.now() }), null);
  const ok = cleanWrongEntry({ t: 1700000000000, speech: 'שלום'.repeat(2000), word: '<x>', unit: 'chumash', id: 3 });
  assert.equal(ok.speech.length, 2000);
  assert.equal(ok.word, '<x>');
  assert.equal(ok.unit, 'chumash');
  assert.equal(ok.id, 3);
});

test('add, load, remove and cap', () => {
  reset();
  const a = addWrongReport({ speech: 'זאת אומרת', unit: 'tanya', pos: 't1' });
  assert.ok(a.added.id >= 1);
  assert.equal(loadWrongReports().length, 1);
  const b = addWrongReport({ speech: 'תלמוד תורה', word: 'ת"ת', unit: 'tanya' });
  assert.equal(loadWrongReports().length, 2);
  removeWrongReport(a.added.id);
  assert.equal(loadWrongReports().length, 1);
  assert.equal(loadWrongReports()[0].speech, 'תלמוד תורה');
  const many = [];
  for (let i = 0; i < WRONG_CAP + 5; i++) many.push({ id: i + 1, t: 1700000000000 + i, speech: 'x' + i });
  const saved = saveWrongReports(many);
  assert.equal(saved.length, WRONG_CAP);
  assert.equal(saved[0].speech, 'x5');
  assert.equal(saved.at(-1).speech, 'x' + (WRONG_CAP + 4));
});

test('export is local JSON and import restores after clear', () => {
  reset();
  addWrongReport({ t: 1700000001000, speech: 'אדני', unit: 'chumash', pos: 'gn-1-1', title: 'בראשית' });
  const json = exportWrongJson();
  const d = JSON.parse(json);
  assert.equal(d.app, 'chitas-reader');
  assert.equal(d.kind, 'wrong-word');
  assert.equal(d.format, 1);
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].speech, 'אדני');
  assert.ok(d.exportedAt);
  clearWrongReports();
  assert.equal(loadWrongReports().length, 0);
  const restored = importWrongJson(json);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].speech, 'אדני');
  assert.equal(restored[0].unit, 'chumash');
  // merge does not duplicate the same t+speech+pos
  const again = importWrongJson(json);
  assert.equal(again.length, 1);
  // a different entry is appended
  const other = { app: 'chitas-reader', kind: 'wrong-word', format: 1, items: [{ t: 1700000002000, speech: 'אלוקים', unit: 'tanya' }] };
  const merged = importWrongJson(JSON.stringify(other));
  assert.equal(merged.length, 2);
});

test('import rejects a foreign file; replace overwrites', () => {
  reset();
  addWrongReport({ speech: 'keep-me' });
  assert.throws(() => importWrongJson('{"app":"other","kind":"wrong-word","items":[]}'));
  assert.throws(() => importWrongJson('{"app":"chitas-reader","kind":"backup","items":[]}'));
  assert.throws(() => importWrongJson('not-json'));
  const incoming = { app: 'chitas-reader', kind: 'wrong-word', format: 1, items: [{ t: 1700000003000, speech: 'new-only' }] };
  const replaced = importWrongJson(JSON.stringify(incoming), { replace: true });
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].speech, 'new-only');
});

test('renderWrongHtml escapes markup and describes local-only storage', () => {
  const empty = renderWrongHtml([]);
  assert.match(empty, /אין דיווחים/);
  assert.match(empty, /בלי לשלוח לשרת|במכשיר בלבד/);
  assert.match(empty, /sh-wrong-import/);
  const html = renderWrongHtml([{ id: 4, t: 1700000000000, title: 'x <y>', speech: 'a <b> & "c"', unit: 'chumash' }]);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /a &lt;b&gt; &amp; &quot;c&quot;/);
  assert.match(html, /x &lt;y&gt;/);
  assert.match(html, /data-id="4"/);
  assert.match(html, /ייצוא לקובץ/);
  assert.match(html, /שחזור מקובץ/);
  assert.match(html, /דבר אינו נשלח לשרת/);
  assert.match(html, /דיווח אחד שמור במכשיר בלבד/);
  assert.doesNotMatch(html, /github|fetch\(|xmlhttprequest/i);
});

test('storage key is separate from the main backup', () => {
  reset();
  addWrongReport({ speech: 'רק כאן' });
  assert.ok(mem[WRONG_KEY]);
  assert.equal(mem['chitas-reader.v1'], undefined);
  const d = JSON.parse(mem[WRONG_KEY]);
  assert.equal(d.kind, 'wrong-word');
  assert.equal(d.items[0].speech, 'רק כאן');
});
