// Opt-in ttsGemaraBiurOnly: "בגמרא: להקריא רק את הביאור (בלי הגמרא הארמית)".
// Default off = current behaviour unchanged. When on, Bavli/Yerushalmi read only the
// Steinsaltz / Pnei Moshe say text and skip segments with no explanation (no Aramaic fallback).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speechTextForBlock, primaryPartForSegment, isVocalizedGemaraBlock } from '../site/js/gemara-speech.js';
import { Speaker } from '../site/js/tts.js';

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

const bavli = {
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
const yer = {
  type: 'p',
  id: 'y1.1',
  src: 'gemara',
  biurLabel: 'פני משה',
  text: 'מֵאֵימָתַי קוֹרִין אֶת שְׁמַע בְּעַרְבִין מִשָּׁעָה',
  say: 'פירוש פני משה מנוקד',
};
const noSay = { type: 'p', id: '108a.2', src: 'gemara', biurLabel: 'ביאור', text: 'הֲדַרַן עֲלָךְ בֵּית כּוֹר', biur: [] };
const noSayYer = { type: 'p', id: 'y2.1', src: 'gemara', biurLabel: 'פני משה', text: 'גּוּפָא אָמַר רַב' };
const mishna = {
  type: 'p',
  id: '1.1',
  src: 'gemara',
  biurLabel: 'ברטנורא',
  text: 'מֵאֵימָתַי קוֹרִין',
  say: 'מֵאֵימָתַי קוֹרִין. פירוש ברטנורא',
};
const tanya = { type: 'p', id: 'LA.1.1', src: 'tanya', text: 'תניא כתיב', say: 'תניא קרי מנוקד' };
const nach = { type: 'v', id: '1:1', src: 'tanakh', text: 'בְּרֵאשִׁית', say: 'קריאת נ״ך' };

test('ttsGemaraBiurOnly: Bavli and Yerushalmi return the explanation, never the Aramaic, and override ttsVocalizedGemara', () => {
  const nps1 = (say, _n, meta) => `${say} [nps1:${meta.havara}]`;
  assert.equal(isVocalizedGemaraBlock(bavli), true);
  assert.equal(isVocalizedGemaraBlock(yer), true);

  assert.equal(
    speechTextForBlock(bavli, { ttsGemaraBiurOnly: true, ttsHavara: 'israeli' }, { nps1Speech: nps1 }),
    'מֵאֵימָתַי קוֹרְאִים אֶת קְרִיאַת שְׁמַע שֶׁל עַרְבִית [nps1:israeli]'
  );
  assert.equal(speechTextForBlock(yer, { ttsGemaraBiurOnly: true }), yer.say);

  // even when the vocalized-Gemara option is also on
  assert.equal(
    speechTextForBlock(bavli, { ttsGemaraBiurOnly: true, ttsVocalizedGemara: true }),
    bavli.say
  );
  assert.notEqual(
    speechTextForBlock(bavli, { ttsGemaraBiurOnly: true, ttsVocalizedGemara: true }),
    bavli.text
  );
  assert.equal(
    speechTextForBlock(yer, { ttsGemaraBiurOnly: true, ttsVocalizedGemara: true }),
    yer.say
  );
});

test('ttsGemaraBiurOnly: a Gemara segment with no explanation is skipped; default still falls back to the displayed text', () => {
  const displayed = 'הֲדַרַן עֲלָךְ בֵּית כּוֹר';
  assert.deepEqual(
    primaryPartForSegment(noSay, { ttsGemaraBiurOnly: true }, { displayedFallback: displayed }),
    { text: '', skip: true }
  );
  assert.deepEqual(
    primaryPartForSegment(noSayYer, { ttsGemaraBiurOnly: true }, { displayedFallback: noSayYer.text }),
    { text: '', skip: true }
  );
  assert.equal(speechTextForBlock(noSay, { ttsGemaraBiurOnly: true }), '');
  assert.equal(speechTextForBlock(noSay, { ttsGemaraBiurOnly: true }, { fallback: '' }), '');
  assert.equal(speechTextForBlock(noSay, { ttsGemaraBiurOnly: true, ttsVocalizedGemara: true }), '');

  // default / missing pref: current behaviour – fall back to the displayed Gemara
  assert.deepEqual(
    primaryPartForSegment(noSay, { ttsGemaraBiurOnly: false }, { displayedFallback: displayed }),
    { text: displayed, skip: false }
  );
  assert.deepEqual(
    primaryPartForSegment(noSay, {}, { displayedFallback: displayed }),
    { text: displayed, skip: false }
  );
  assert.equal(speechTextForBlock(noSay, { ttsGemaraBiurOnly: false }), noSay.text);
});

test('ttsGemaraBiurOnly off: existing default still prefers the biur say over the Gemara text', () => {
  assert.equal(speechTextForBlock(bavli, { ttsGemaraBiurOnly: false }), bavli.say);
  assert.equal(speechTextForBlock(bavli, {}), bavli.say);
  assert.deepEqual(
    primaryPartForSegment(bavli, { ttsGemaraBiurOnly: false }, { displayedFallback: bavli.text }),
    { text: bavli.say, skip: false }
  );
  assert.deepEqual(
    primaryPartForSegment(bavli, { ttsGemaraBiurOnly: true }, { displayedFallback: bavli.text }),
    { text: bavli.say, skip: false }
  );
});

test('Mishnah, Tanya and Nach are unchanged by ttsGemaraBiurOnly', () => {
  for (const pref of [false, true]) {
    const p = { ttsGemaraBiurOnly: pref };
    assert.equal(isVocalizedGemaraBlock(mishna), false);
    assert.equal(speechTextForBlock(mishna, p), mishna.say);
    assert.equal(speechTextForBlock(tanya, p), tanya.say);
    assert.equal(speechTextForBlock(nach, p), nach.say);
    assert.deepEqual(primaryPartForSegment(mishna, p, { displayedFallback: 'X' }), { text: mishna.say, skip: false });
    assert.deepEqual(primaryPartForSegment(tanya, p, { displayedFallback: 'X' }), { text: tanya.say, skip: false });
  }
});

test('store.js: DEFAULT_PREFS.ttsGemaraBiurOnly === false and load() sanitizes non-booleans to false', async () => {
  const fresh = await loadStoreWithStorage();
  assert.equal(fresh.DEFAULT_PREFS.ttsGemaraBiurOnly, false);
  assert.equal(fresh.prefs.ttsGemaraBiurOnly, false);

  for (const bad of ['true', 'yes', 1, 0, null, {}, []]) {
    const mod = await loadStoreWithStorage({ prefs: { ttsGemaraBiurOnly: bad } });
    assert.equal(mod.prefs.ttsGemaraBiurOnly, false, `expected non-boolean ${JSON.stringify(bad)} to sanitize to false`);
  }

  const enabled = await loadStoreWithStorage({ prefs: { ttsGemaraBiurOnly: true } });
  assert.equal(enabled.prefs.ttsGemaraBiurOnly, true);
  // other prefs are not clobbered
  assert.equal(enabled.prefs.ttsVocalizedGemara, false);
});

test('app.js: ttsForm has the Hebrew checkbox, ttsSegments skips empty biur, empty queue is handled', () => {
  const appSrc = readFileSync(resolve(jsDir, 'app.js'), 'utf8');

  const ttsFormMatch = appSrc.match(/function ttsForm\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ttsFormMatch, 'ttsForm() found');
  const ttsFormBody = ttsFormMatch[0];
  assert.ok(
    ttsFormBody.includes("${check('ttsGemaraBiurOnly', prefs.ttsGemaraBiurOnly, 'בגמרא: להקריא רק את הביאור (בלי הגמרא הארמית)')}"),
    'ttsForm contains ttsGemaraBiurOnly checkbox with the required Hebrew label'
  );
  assert.ok(ttsFormBody.includes('קטע בלי ביאור מדולג בלי הפסקה'), 'helper mentions a graceful skip');
  assert.ok(ttsFormBody.includes('שטיינזלץ או פני משה'), 'helper names Bavli and Yerushalmi commentaries');

  const ttsSegsMatch = appSrc.match(/function ttsSegments\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(ttsSegsMatch, 'ttsSegments() found');
  assert.ok(ttsSegsMatch[0].includes('primaryPartForSegment('), 'ttsSegments() uses primaryPartForSegment');
  assert.ok(ttsSegsMatch[0].includes('gemaraSkip: true'), 'skipped Gemara segments get empty parts');
  assert.ok(ttsSegsMatch[0].includes('parts: []'), 'empty parts, no silent placeholder');

  assert.match(appSrc, /if \(!R\.speaker\.queue\.length\)/);
  assert.match(appSrc, /אין ביאור להקראה בשיעור הזה/);
  assert.match(appSrc, /ttsGemaraBiurOnly/);
  assert.match(appSrc, /ttsVocalizedGemara', false/);
});

test('Speaker.load skips empty parts with no queue gap; skip() jumps to the next spoken segment', () => {
  const sp = new Speaker({});
  sp.load([
    { el: {}, parts: ['שלום'], cites: [] },
    { el: {}, parts: [], cites: [] },
    { el: {}, parts: ['עולם'], cites: [] },
  ], { stress: false, divineName: 'hashem', skipCites: false });
  const sis = [...new Set(sp.queue.map(q => q.si))];
  assert.deepEqual(sis, [0, 2], 'segment 1 (empty parts) is not queued');
  assert.equal(sp.queue.every(q => q.text && q.text.trim()), true, 'no empty/silent chunks');
  const k = sp.queueIndexFor(1, 1);
  assert.ok(k >= 0);
  assert.equal(sp.queue[k].si, 2);
  const back = sp.queueIndexFor(1, -1);
  assert.ok(back >= 0);
  assert.equal(sp.queue[back].si, 0);

  const empty = new Speaker({});
  empty.load([
    { el: {}, parts: [], cites: [] },
    { el: {}, parts: [], cites: [] },
  ], { stress: false, divineName: 'hashem', skipCites: false });
  assert.equal(empty.queue.length, 0);
});

const { serve, launch, pageWith, CHROME } = await import('./helpers.mjs');
const skip = !CHROME && 'no Chrome';
const fakeSynth = () => {
  window.__spoken = []; window.__ttsMinMsPerChar = 0; window.__ttsPauseScale = 0;
  const v = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => v, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
    speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 2); }, 2); } } });
};

test('browser: setting default is off, persists when enabled, and sits with the other read-aloud options', { skip, timeout: 120000 }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/settings');
    await p.waitForSelector('input[name=ttsGemaraBiurOnly]');
    const inTts = await p.evaluate(() => {
      const el = document.querySelector('input[name=ttsGemaraBiurOnly]');
      return !!(el && el.closest('#set-tts'));
    });
    assert.equal(inTts, true, 'checkbox is in the read-aloud settings card');
    assert.equal(await p.isChecked('input[name=ttsGemaraBiurOnly]'), false);
    const label = await p.evaluate(() => document.querySelector('input[name=ttsGemaraBiurOnly]').closest('label')?.textContent || '');
    assert.match(label, /בגמרא: להקריא רק את הביאור \(בלי הגמרא הארמית\)/);
    await p.locator('input[name=ttsGemaraBiurOnly]').check({ force: true });
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsGemaraBiurOnly), true);
    // enabling biur-only clears the vocalized-Gemara option
    const p2 = await pageWith(b, srv.url, { prefs: { ttsVocalizedGemara: true, ttsGemaraBiurOnly: false } });
    await p2.goto(srv.url + '#/settings');
    await p2.waitForSelector('input[name=ttsGemaraBiurOnly]');
    assert.equal(await p2.isChecked('input[name=ttsVocalizedGemara]'), true);
    await p2.locator('input[name=ttsGemaraBiurOnly]').check({ force: true });
    assert.equal(await p2.isChecked('input[name=ttsVocalizedGemara]'), false);
    assert.equal(await p2.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs;
      return d.ttsGemaraBiurOnly === true && d.ttsVocalizedGemara === false;
    }), true);
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p2.errors, []);
    await p.context().close();
    await p2.context().close();
  } finally { await b.close(); srv.close(); }
});

test('browser: with the setting on, a mid-amud hadran without biur is skipped; with it off it is still read', { skip, timeout: 180000 }, async () => {
  const srv = await serve(), b = await launch();
  const run = async (biurOnly) => {
    const p = await pageWith(b, srv.url, { prefs: { ttsGemaraBiurOnly: biurOnly, ttsEngine: 'web', ttsContinuous: false }, init: fakeSynth });
    await p.goto(srv.url + '#/lib/bavli/Bava%20Batra/108a');
    await p.waitForSelector('#rc .seg.gm');
    const shown = await p.$$eval('#rc .seg.gm .t', els => els.map(e => e.textContent.replace(/[\u0591-\u05C7]/g, '')));
    assert.ok(shown.some(t => /הדרן עלך בית כור/.test(t.replace(/[\u05f3\u05f4']/g, '').replace(/\s+/g, ' '))), 'hadran is on screen: ' + shown.join(' | '));
    await p.keyboard.press('p');
    await p.waitForFunction(() => document.querySelector('#rb')?.classList.contains('speaking'));
    await p.waitForFunction(() => !document.querySelector('#rb').classList.contains('speaking'), null, { timeout: 120000 });
    const said = (await p.evaluate(() => window.__spoken.join(' \n '))).replace(/[\u0591-\u05C7]/g, '');
    await p.context().close();
    return said;
  };
  try {
    const on = await run(true);
    assert.match(on, /ירושת|נוחלין|כדי שלא תהא חיה/, 'the explanation around the hadran is read');
    assert.doesNotMatch(on, /הדרן עלך בית כור|הדרן עליך בית כור/, 'the Aramaic hadran without biur is skipped');
    const off = await run(false);
    assert.match(off, /הדרן עלך בית כור|הדרן עליך בית כור/, 'default still reads the displayed hadran');
  } finally { await b.close(); srv.close(); }
});
