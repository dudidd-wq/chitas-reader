// Round-1 review: data versioning + SW update flow; Masoretic large/small letters and edition notes kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dataHash } from '../tools/data-version.mjs';
import { cleanMiqra } from '../tools/build-data.mjs';
import { prepareForTTS } from '../site/js/tts-prep.js';
const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
const J = p => JSON.parse(fs.readFileSync(new URL('../site/data/' + p, import.meta.url)));

test('SW DATA_VERSION matches the current text data (run `npm run data-version` after rebuilding)', () => {
  assert.equal(sw.match(/const DATA_VERSION = '([^']*)'/)[1], dataHash());
  assert.match(sw, /const DATA = `data-\$\{DATA_VERSION\}`/);
  assert.match(sw, /k\.startsWith\('data-'\) && k !== DATA/, 'old data caches are deleted on activate');
});
test('every JS module the app imports is precached by the SW', () => {
  const mods = new Set();
  for (const f of fs.readdirSync(new URL('../site/js/', import.meta.url))) if (f.endsWith('.js')) {
    const src = fs.readFileSync(new URL('../site/js/' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/from '\.\/([^']+)'/g)) mods.add('js/' + m[1]);
  }
  for (const m of mods) assert.ok(sw.includes(`'${m}'`), m + ' missing from SW ASSETS');
});
test('update flow: controllerchange reloads on home, offers a reload button in the reader', () => {
  assert.match(app, /controllerchange/);
  assert.match(app, /id="swReload"/);
});
test('cleanMiqra keeps <big>/<small> letters, unwraps small paseq, keeps edition notes', () => {
  assert.equal(cleanMiqra('<big>בְּ</big>רֵאשִׁ֖ית'), '<big>בְּ</big>רֵאשִׁ֖ית');
  assert.equal(cleanMiqra('אֵ֣ל <small>׀</small> ק'), 'אֵ֣ל ׀ ק');
  assert.equal(cleanMiqra('שָׁל֑וֹם<sup class="footnote-marker">*</sup><i class="footnote">(בספרי ספרד ואשכנז וי״ו קטיעא)</i>׃'), 'שָׁל֑וֹם<i class="fn">בספרי ספרד ואשכנז וי״ו קטיעא</i>׃');
  assert.equal(cleanMiqra('<span class="mam-spi-pe">{פ}</span>'), '{פ}');
});
test('data: Gen 1:1 large ב, Num 25:12 וי״ו קטיעא note, Gen 2:4 small ה', () => {
  assert.match(J('torah/Genesis/1.json').v[0], /^<big>ב/);
  assert.match(J('torah/Numbers/25.json').v[11], /<i class="fn">[^<]*וי״ו קטיעא<\/i>/);
  assert.match(J('torah/Genesis/2.json').v[3], /<small>ה/);
});
test('TTS: notes are not read; large/small letters do not split words', () => {
  assert.equal(prepareForTTS('שָׁלוֹם<i class="fn" role="note" title="x">בספרי ספרד וי״ו קטיעא</i>׃', { divineName: 'hashem' }), 'שָׁלוֹם.');
  assert.equal(prepareForTTS('<big>בְּ</big>רֵאשִׁית', { divineName: 'hashem' }), 'בְּרֵאשִׁית');
});
