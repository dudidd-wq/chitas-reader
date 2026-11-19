// Stage 6 unit tests: opt-in ttsVocalizedGemara ("הקרא את הגמרא המנוקדת במקום הביאור").
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speechTextForBlock, isVocalizedGemaraBlock } from '../site/js/gemara-speech.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = existsSync(resolve(__dirname, '../site/js/store.js'))
  ? resolve(__dirname, '../site/js')
  : resolve(__dirname, '../work');

async function loadStoreWithStorage(initialObj) {
  const raw = readFileSync(resolve(jsDir, 'store.js'), 'utf8');
  const stubbed = raw
    .replace(/import\s+\{\s*dayPlan\s*\}\s+from\s+['"]\.\/calendar\.js['"];?/, 'const dayPlan = () => ({});')
    .replace(/import\s+\{\s*cleanProfile\s*\}\s+from\s+['"]\.\/personal\.js['"];?/, 'const cleanProfile = x => x;')
    .replace(/import\s+\{\s*clampPitch\s*\}\s+from\s+['"]\.\/voice-pitch\.js['"];?/, 'const clampPitch = x => Number(x) || 0;');
  const map = new Map();
  if (initialObj !== undefined) {
    map.set('chitas-reader.v1', typeof initialObj === 'string' ? initialObj : JSON.stringify(initialObj));
  }
  globalThis.localStorage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
  globalThis.document = { dispatchEvent: () => {} };
  const b64 = Buffer.from(`${stubbed}\n// cache-bust-${Math.random()}`).toString('base64');
  return import(`data:text/javascript;base64,${b64}`);
}

test('default / missing pref: Bavli block with say and nps1 returns biur say path and calls nps1 when provided', () => {
  const bavliBlock = {
    type: 'p',
    id: '2a.1',
    src: 'gemara',
    biurLabel: 'ביאור',
    text: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין',
    biur: ['מאימתי קוראים את קריאת שמע של ערבית?'],
    say: 'מֵאֵימָתַי קוֹרְאִים אֶת קְרִיאַת שְׁמַע שֶׁל עַרְבִית',
    nps1: { source: 'מֵאֵימָתַי', commentary: 'מאימתי', pauses: [2] },
    nps1Corpus: 'bavli',
  };

  let calls = [];
  const mockNps1 = (say, nps1, meta) => {
    calls.push({ say, nps1, meta });
    return `${say} [nps1:${meta.havara}:${meta.corpus}]`;
  };

  // Default (false)
  assert.equal(
    speechTextForBlock(bavliBlock, { ttsVocalizedGemara: false, ttsHavara: 'chabad' }, { nps1Speech: mockNps1 }),
    'מֵאֵימָתַי קוֹרְאִים אֶת קְרִיאַת שְׁמַע שֶׁל עַרְבִית [nps1:chabad:bavli]'
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nps1, bavliBlock.nps1);
  assert.deepEqual(calls[0].meta, { havara: 'chabad', corpus: 'bavli' });

  // Missing pref / undefined prefs
  calls = [];
  assert.equal(
    speechTextForBlock(bavliBlock, {}, { nps1Speech: mockNps1 }),
    'מֵאֵימָתַי קוֹרְאִים אֶת קְרִיאַת שְׁמַע שֶׁל עַרְבִית [nps1:undefined:bavli]'
  );
  assert.equal(calls.length, 1);

  // Without nps1Speech option passed, returns block.say directly
  assert.equal(
    speechTextForBlock(bavliBlock, { ttsVocalizedGemara: false }),
    bavliBlock.say
  );
  assert.equal(speechTextForBlock(bavliBlock), bavliBlock.say);
});

test('pref true: Bavli (ביאור) and Yerushalmi (פני משה) return vocalized Gemara text and skip nps1', () => {
  const bavliBlock = {
    type: 'p',
    id: '2a.1',
    src: 'gemara',
    biurLabel: 'ביאור',
    text: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין',
    say: 'מֵאֵימָתַי קוֹרְאִים אֶת קְרִיאַת שְׁמַע שֶׁל עַרְבִית',
    nps1: { pauses: [1] },
    nps1Corpus: 'bavli',
  };
  const yerBlock = {
    type: 'p',
    id: 'y1.1',
    src: 'gemara',
    biurLabel: 'פני משה',
    text: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין מִשָּׁעָה שֶׁהַכֹּהֲנִים נִכְנָסִין',
    say: 'פירוש פני משה מנוקד',
  };

  let nps1Called = false;
  const mockNps1 = () => {
    nps1Called = true;
    return 'SHOULD_NOT_BE_USED';
  };

  assert.equal(isVocalizedGemaraBlock(bavliBlock), true);
  assert.equal(isVocalizedGemaraBlock(yerBlock), true);

  assert.equal(
    speechTextForBlock(bavliBlock, { ttsVocalizedGemara: true }, { nps1Speech: mockNps1 }),
    bavliBlock.text
  );
  assert.equal(
    speechTextForBlock(yerBlock, { ttsVocalizedGemara: true }, { nps1Speech: mockNps1 }),
    yerBlock.text
  );
  assert.equal(nps1Called, false);

  // Fallback if text is empty: fall back to say, then empty string
  const emptyTextWithSay = { src: 'gemara', biurLabel: 'ביאור', text: '', say: 'גיבוי ביאור' };
  const emptyTextAndSay = { src: 'gemara', biurLabel: 'פני משה', text: '' };
  assert.equal(speechTextForBlock(emptyTextWithSay, { ttsVocalizedGemara: true }, { nps1Speech: mockNps1 }), 'גיבוי ביאור');
  assert.equal(speechTextForBlock(emptyTextAndSay, { ttsVocalizedGemara: true }, { nps1Speech: mockNps1 }), '');
  assert.equal(nps1Called, false);
});

test('Mishnah (biurLabel: ברטנורא) is unchanged even when ttsVocalizedGemara is true', () => {
  const mishnaBlock = {
    type: 'p',
    id: '1.1',
    src: 'gemara',
    biurLabel: 'ברטנורא',
    text: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין',
    say: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין. פירוש ברטנורא',
  };

  assert.equal(isVocalizedGemaraBlock(mishnaBlock), false);
  assert.equal(
    speechTextForBlock(mishnaBlock, { ttsVocalizedGemara: false }),
    mishnaBlock.say
  );
  assert.equal(
    speechTextForBlock(mishnaBlock, { ttsVocalizedGemara: true }),
    mishnaBlock.say
  );
});

test('Tanya, Chumash, Nach, and blocks without src gemara are unchanged', () => {
  const tanyaBlock = {
    type: 'p',
    id: 'LA.1.1',
    src: 'tanya',
    text: 'תניא כתיב',
    say: 'תניא קרי מנוקד',
  };
  const chumashBlock = {
    type: 'v',
    id: '1:1',
    src: 'tanakh',
    text: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים',
  };
  const nachBlockWithBiurLabel = {
    type: 'v',
    id: '1:1',
    src: 'tanakh',
    biurLabel: 'ביאור',
    text: 'פסוק בנ״ך',
    say: 'קריאת נ״ך',
  };

  for (const pref of [false, true]) {
    assert.equal(speechTextForBlock(tanyaBlock, { ttsVocalizedGemara: pref }), 'תניא קרי מנוקד');
    assert.equal(speechTextForBlock(chumashBlock, { ttsVocalizedGemara: pref }), 'בְּרֵאשִׁית בָּרָא אֱלֹהִים');
    assert.equal(speechTextForBlock(chumashBlock, { ttsVocalizedGemara: pref }, { fallback: '' }), '');
    assert.equal(speechTextForBlock(nachBlockWithBiurLabel, { ttsVocalizedGemara: pref }), 'קריאת נ״ך');
  }
});

test('store.js: DEFAULT_PREFS.ttsVocalizedGemara === false and load() sanitizes non-booleans to false', async () => {
  const fresh = await loadStoreWithStorage();
  assert.equal(fresh.DEFAULT_PREFS.ttsVocalizedGemara, false);
  assert.equal(fresh.prefs.ttsVocalizedGemara, false);

  for (const bad of ['true', 'yes', 1, 0, null, {}, []]) {
    const mod = await loadStoreWithStorage({ prefs: { ttsVocalizedGemara: bad } });
    assert.equal(mod.prefs.ttsVocalizedGemara, false, `expected non-boolean ${JSON.stringify(bad)} to sanitize to false`);
  }

  const enabled = await loadStoreWithStorage({ prefs: { ttsVocalizedGemara: true } });
  assert.equal(enabled.prefs.ttsVocalizedGemara, true);
});

test('app.js string-level checks: ttsForm has the Hebrew checkbox + explanation and ttsSegments uses speechTextForBlock', () => {
  const appSrc = readFileSync(resolve(jsDir, 'app.js'), 'utf8');

  assert.match(appSrc, /import\s+\{\s*speechTextForBlock\s*\}\s+from\s+['"]\.\/gemara-speech\.js['"]/);

  const ttsFormMatch = appSrc.match(/function ttsForm\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ttsFormMatch, 'ttsForm() found in app.js');
  const ttsFormBody = ttsFormMatch[0];
  assert.ok(
    ttsFormBody.includes("${check('ttsVocalizedGemara', prefs.ttsVocalizedGemara, 'הקרא את הגמרא המנוקדת במקום הביאור')}"),
    'ttsForm contains ttsVocalizedGemara checkbox with required Hebrew label'
  );
  assert.ok(
    ttsFormBody.includes('בדף היומי ובעמוד היומי, ובירושלמי במקום ״פני משה״. ברירת המחדל נשארת הקראת הביאור.'),
    'ttsForm contains required helper note'
  );

  const ttsSegsMatch = appSrc.match(/function ttsSegments\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ttsSegsMatch, 'ttsSegments() found in app.js');
  assert.ok(
    ttsSegsMatch[0].includes('speechTextForBlock('),
    'ttsSegments() delegates primary speech text selection to speechTextForBlock'
  );
});

test('sw.js ASSETS precache includes js/gemara-speech.js and every local ./x module imported by app.js', () => {
  const swPath = existsSync(resolve(jsDir, 'sw.js'))
    ? resolve(jsDir, 'sw.js')
    : resolve(jsDir, '../sw.js');
  const swSrc = readFileSync(swPath, 'utf8');
  const appSrc = readFileSync(resolve(jsDir, 'app.js'), 'utf8');

  assert.ok(swSrc.includes("'js/gemara-speech.js'"), 'sw.js ASSETS contains js/gemara-speech.js');

  const assetsMatch = swSrc.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(assetsMatch, 'ASSETS array found in sw.js');
  const assets = new Set([...assetsMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
  assert.ok(assets.has('js/gemara-speech.js'), 'ASSETS Set includes js/gemara-speech.js');

  for (const m of appSrc.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) {
    const mod = `js/${m[1]}`;
    assert.ok(assets.has(mod), `expected ${mod} (imported by app.js) to be in sw.js ASSETS`);
  }
});
