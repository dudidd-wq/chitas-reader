// A6: Nach (and Biblical Aramaic) lexicon / qamatz-katan expansion; suffixes stay Torah + Tehillim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { predictStress } from '../site/js/g2p.js';
import { corpus, isNach, isAramaicBook } from '../tools/build-voice-stress.mjs';
import { VOICE_FILES } from '../site/js/voice-files.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));

test('stress-he.json records the conservative Nach source and keeps suffix-model size', () => {
  assert.match(data.source, /Nach/);
  assert.match(data.source, /suffixes/);
  assert.match(data.source, /nach\/Psalms skipped/);
  assert.equal(Object.keys(data.suf).length, 812);
  assert.ok(Object.keys(data.lex).length >= 1200 && Object.keys(data.lex).length < 1600, 'lex ' + Object.keys(data.lex).length);
  assert.ok(Object.keys(data.qk).length >= 600 && Object.keys(data.qk).length < 900, 'qk ' + Object.keys(data.qk).length);
  assert.deepEqual(data.qk['חָכְמָה'], [0], 'Torah qamatz katan must not be dropped if a Nach verse writes a regular qamatz');
});

test('corpus includes Nach and Biblical Aramaic, and skips nach/Psalms beside Tehillim', () => {
  const rows = corpus();
  const books = new Set(rows.map(r => r.book));
  assert.ok(books.has('torah') && books.has('tehillim'));
  assert.ok(books.has('nach/Isaiah') && books.has('nach/Daniel') && books.has('nach/Ezra'));
  assert.ok(!books.has('nach/Psalms'), 'Psalms must come only from site/data/tehillim');
  assert.ok(rows.some(r => isNach(r.book) && r.stresses.some(s => s !== null)));
  assert.ok(rows.some(r => isAramaicBook(r.book)));
});

test('common rabbinic words keep their previous stress; tied Nach forms are not forced into the lex', () => {
  assert.equal(predictStress('אֶלָּא', data)[0], 0);
  assert.equal(predictStress('אֲפִלּוּ', data)[0], 0);
  assert.equal(predictStress('אֲפִילּוּ', data)[0], 0);
  assert.equal(predictStress('אֵלּוּ', data)[0], 0);
  assert.equal(predictStress('לְפִיכָךְ', data)[0], 0);
  assert.ok(!('מְבָרֵךְ' in data.lex), 'tied Isaiah/Proverbs form must not enter the lex');
  assert.ok(!('מַנִּי' in data.lex), 'Daniel hapax must not override Gemara מַנִּי');
  assert.ok(!('מוֹצָאֵי' in data.lex), 'Ezekiel hapax stays on the suffix model');
  // R1 harmful findings: these must not enter Nach-only lex/qk
  for (const k of ['חָרָבָה','בִּקְרָב','עָזְבָה','לְהִנָּתֵן','וְיִנָּתֵן','עֹשֵׁק','בָּגְדוּ','כְּלִילַת']) {
    assert.ok(!(k in data.lex) && !(k in (data.qk||{})), k + ' must not be a Nach-only lex/qk entry');
  }
  // R2 harmful finding + same CāCaC-milel class: noun/name/pausal must not flip the 3ms Qal verb
  for (const k of ['טָעַם','גָּעַשׁ','רָחַם','קָמַח','תָמַח']) {
    assert.ok(!(k in data.lex), k + ' Nach-only CāCaC milel must not enter the lex');
    assert.equal(predictStress(k, data)[0], 0, k + ' stays default milra');
  }
  // R3 harmful finding + same CaCaC-patah milra class: construct "governor of" must not flip the segolate noun
  for (const k of ['פַּחַת','פַחַת']) {
    assert.ok(!(k in data.lex), k + ' Nach-only CaCaC milra must not enter the lex');
    assert.equal(predictStress(k, data)[0], 1, k + ' stays suffix milel');
  }
  assert.equal(data.lex['זַעַם'], 1, 'milel CaCaC (patah) is still added');
  assert.equal(data.lex['רַעַשׁ'], 1);
});

test('consistent Nach (and Aramaic) forms that the suffix model missed are in the lex', () => {
  assert.equal(data.lex['כָּתַב'], 0);     // milra CāCaC is still added (corrects a suffix miss)
  assert.equal(data.lex['מַחֲשָׁבָה'], 0); // milra, Jeremiah
  assert.equal(data.lex['צֶמַח'], 1);      // milel, Isaiah/Jeremiah/Zechariah
  assert.equal(data.lex['עֹנֶג'], 1);
  assert.equal(data.lex['עֲלוֹהִי'], 1);    // Biblical Aramaic, Daniel+Ezra, n=12
  assert.equal(data.lex['אָסְפַּרְנָא'], 1);
  const [k, src] = predictStress('מַחֲשָׁבָה', data);
  assert.equal(k, 0);
  assert.equal(src, 'lex');
});

test('voice-files.js cache hash matches the built stress-he.json', () => {
  assert.match(VOICE_FILES.stress.url, /c0aaec0a3b1d/);
});
