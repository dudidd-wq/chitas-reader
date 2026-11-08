// 1.0.76: Hayom Yom read-aloud text is vocalized (display stays as in the book)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../tools/build-search.mjs';
import { buildDoc } from '../site/js/texts.js';
import { ABBREVIATIONS } from '../site/js/tts-prep.js';
const D = JSON.parse(fs.readFileSync(new URL('../site/data/hayomyom/days.json', import.meta.url)));
const ratio = t => (t.match(/[\u05B0-\u05BC\u05C7]/g) || []).length / Math.max(1, (t.match(/[\u05D0-\u05EA]/g) || []).length);
test('every paragraph has a vocalized reading text with the same letters (abbreviations kept)', () => {
  let low = 0, n = 0;
  for (const [k, e] of Object.entries(D)) for (const [t, , v] of e.p) {
    n++; assert.ok(v, k);
    const sk = s => s.replace(/<[^>]+>/g, '').replace(/[\u0591-\u05C7|]/g, '');
    assert.equal(sk(v), sk(t), k);
    if (ratio(v) < 0.3) low++;
  }
  assert.ok(low / n < 0.01, `low-niqqud paragraphs ${low}/${n}`);
});
test('daily doc: display unvocalized, say vocalized', async () => {
  const d = await buildDoc({ iso: '2026-11-08' }, 'hayomyom'), p = d.blocks.find(b => b.type === 'p');
  assert.ok(ratio(p.text) < 0.05 && ratio(p.say) > 0.4);
});
test('Hayom Yom abbreviations in the speech table', () => { for (const k of ['אנ"ש', 'בעש"ט', 'שליט"א', 'צ"צ', 'אדמו"ר', 'כ"ק', 'הקב"ה', 'רז"ל']) assert.ok(ABBREVIATIONS[k], k); });
