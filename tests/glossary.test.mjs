import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { norm } from '../site/js/hnorm.js';
const G = JSON.parse(fs.readFileSync(new URL('../site/data/glossary.json', import.meta.url)));
const torah = b => new URL(`../site/data/${b === 'Psalms' ? 'tehillim' : 'torah/' + b}/`, import.meta.url);

test('glossary: licence + every entry sourced, ≤ 4 words, anchored to a real word of that verse', () => {
  assert.equal(G.meta.license, 'CC BY-SA 4.0');
  let n = 0;
  for (const [ref, words] of Object.entries(G.verses)) {
    const [, book, c, v] = ref.match(/^(\w+) (\d+):(\d+)$/);
    const text = JSON.parse(fs.readFileSync(new URL(`${c}.json`, torah(book)))).v[v - 1];
    const forms = new Set(text.replace(/<[^>]+>/g, ' ').split(/[\s\u05BE]+/).map(norm));
    for (const [form, e] of Object.entries(words)) {
      n++;
      assert.ok(forms.has(form), `${ref}: ${form} not in verse`);
      assert.match(e.src, /^https:\/\/he\.wiktionary\.org\/wiki\//);
      assert.ok(e.g && e.g.split(' ').length <= 4, `${ref} ${form}: ${e.g}`);
      assert.ok(e.l);
    }
  }
  assert.ok(n > 500, 'coverage collapsed: ' + n);
  console.log('glossed verse-words:', n, 'verses:', Object.keys(G.verses).length);
});
