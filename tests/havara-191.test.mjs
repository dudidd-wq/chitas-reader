// 1.0.91: pronunciation setting "הגייה" for the local voice – ישראלית (default, unchanged) / אשכנזית־חב״דית.
// Rules and sources: verification/HAVARA-CHABAD-191.md. Display text never changes; only the IPA of the speech layer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA, wordToIPA, milelStress, HAVAROT, accentStressMap } from '../site/js/g2p.js';
import { prepareForTTS, chunkText } from '../site/js/tts-prep.js';
import { nodeVoice } from '../tools/voice-synth.mjs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const root = new URL('../', import.meta.url).pathname, read = f => fs.readFileSync(root + f, 'utf8');
const data = JSON.parse(read('site/voice/stress-he.json'));
const skip = !CHROME && 'no Chrome';
const C = { havara: 'chabad' };
const ch = (w, k = null) => wordToIPA(w, k, data, C);

test('1.0.91: Israeli stays the default and byte-identical (explicit or omitted)', () => {
  assert.equal(HAVAROT.israeli.qamatz, 'a'); assert.equal(HAVAROT.israeli.holam, 'o');
  const hy = JSON.parse(read('site/data/hayomyom/days.json'));
  let n = 0;
  for (const d of Object.values(hy).slice(0, 40)) for (const p of d.p) for (const c of chunkText(prepareForTTS(p[2], { stress: true, primaryStress: true }))) {
    const t = c.replace(/\u05AB/g, ''), acc = { primary: c };
    assert.equal(textToIPA(t, { data, accents: acc, havara: 'israeli' }), textToIPA(t, { data, accents: acc })); n++;
  }
  assert.ok(n > 100);
  // pinned Israeli outputs from before 1.0.91
  assert.equal(textToIPA('בָּרוּךְ אַתָּה הַשֵּׁם', { data }), 'baʁˈuχ ʔatˈa haʃˈem');
  assert.equal(wordToIPA('תּוֹרָה', null, data), 'toʁˈa');
});
test('1.0.91 Chabad vowels: qamatz (gadol and katan) o, hataf-qamatz o, holam ey, tsere ey, segol e, shuruq/qubuts u', () => {
  assert.match(ch('דָּוִד'), /^dov/);                       // qamatz gadol
  assert.equal(ch('כָּל'), 'kˈol');                           // qamatz katan (kol)
  assert.match(ch('חָכְמָה'), /^χoχm/);                     // qamatz katan before shva
  assert.match(ch('צָהֳרַיִם'), /^tsohoʁ/);                 // hataf-qamatz
  assert.equal(ch('תּוֹרָה'), 'tejʁˈo');                      // holam male, tav with dagesh = t
  assert.match(ch('מֹשֶׁה'), /^mˈ?ejʃˈ?e$/);                   // holam haser
  assert.match(ch('מִצְוֺת'), /vˈ?ejs$/);                   // MAM וֺ + tav rafe
  assert.equal(ch('בֵּית'), 'bˈejs');                          // tsere (yud not doubled) + tav rafe
  assert.match(ch('אֱלֹקֵינוּ'), /^elejkejnˈ?u$/);           // hataf segol e, holam ey, tsere ey, shuruq u
  assert.match(ch('קֻבֻּץ'), /u.*u/);
  assert.match(ch('שֶׁמֶשׁ'), /^ʃˈ?emˈ?eʃ$/);                   // segol e
  assert.equal(ch('גּוֹי'), 'ɡˈej');                           // diphthong + yud: one j
});
test('1.0.91 Chabad consonants: tav rafe s (vocalised words only), silent alef/ayin, sin s, no other change', () => {
  assert.match(ch('שַׁבָּת'), /^ʃabˈ?os$/);
  assert.match(ch('אַתָּה'), /^ˈ?atˈ?o$/);                  // dagesh forte: t
  assert.match(wordToIPA('שבת', null, data, C), /t/);        // unvocalised: cannot tell ת from תּ – kept t
  assert.doesNotMatch(ch('עוֹלָם') + ch('יִשְׂרָאֵל') + ch('אֵין'), /ʔ/);
  assert.match(ch('יִשְׂרָאֵל'), /^jisʁo/);
  assert.match(ch('שָׂרָה'), /^so/);
});
test('1.0.91 Chabad stress: milel for final stress; monosyllables, hataf penult, article prefix kept; cantillation keeps the accents', () => {
  const t = 'בָּרוּךְ אַתָּה הַשֵּׁם אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם, שַׁבָּת שָׁלוֹם, אֲנִי בַּיּוֹם וּמָה עַל';
  const tr = []; const ipa = textToIPA(t, { data, havara: 'chabad', trace: tr });
  assert.equal(ipa, 'bˈoʁuχ ˈato haʃˈejm elejkˈejnu mˈeleχ hoˈejlom, ʃˈabos ʃˈolejm, anˈi bajˈejm umˈo ˈal');
  assert.equal(milelStress('בָּרוּךְ', 0), 1); assert.equal(milelStress('מֶלֶךְ', 1), 1); assert.equal(milelStress('עַל', 0), 0);
  assert.equal(milelStress('אֲנִי', 0), 0); assert.equal(milelStress('הַשֵּׁם', 0), 0); assert.equal(milelStress('בַּיּוֹם', 0), 0);
  // opt.milel=false: Chabad vowels with the original (grammatical) stress
  assert.equal(textToIPA('בָּרוּךְ אַתָּה', { data, havara: 'chabad', milel: false }), 'boʁˈuχ atˈo');
  // Torah with cantillation: Ashkenazi Torah reading follows the accents (also for the divine name the accents cannot locate)
  const v = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';
  const c = chunkText(prepareForTTS(v, { stress: true, divineName: 'hashem' }))[0];
  assert.equal(textToIPA(c, { data, accents: accentStressMap(v), havara: 'chabad' }), 'beʁejʃˈis boʁˈo elejkˈim ˈejs haʃomˈajim veˈejs hoˈoʁets.');
});
test('1.0.91: Chabad output uses only phonemes every voice model knows (noa, natural) across Hayom Yom, Siddur and Torah', () => {
  const maps = ['he_IL-noa-medium', 'he_IL-ilspeech-male-medium'].map(n => new Set(Object.keys(JSON.parse(read(`site/voice/${n}.onnx.json`)).phoneme_id_map)));
  const seen = new Set(); let n = 0;
  const add = s => { for (const x of s) seen.add(x); n++; };
  const hy = JSON.parse(read('site/data/hayomyom/days.json'));
  for (const d of Object.values(hy).slice(0, 60)) for (const p of d.p) for (const c of chunkText(prepareForTTS(p[2], { stress: true, primaryStress: true }))) add(textToIPA(c.replace(/\u05AB/g, ''), { data, accents: { primary: c }, havara: 'chabad' }));
  const sid = JSON.parse(read('site/data/siddur/boker/1.json'));
  for (const s of Object.values(sid.say)) for (const c of chunkText(prepareForTTS(s, { stress: true, primaryStress: true, divineName: 'adonai' }))) add(textToIPA(c.replace(/\u05AB/g, ''), { data, accents: { primary: c }, havara: 'chabad' }));
  for (const v of JSON.parse(read('site/data/torah/Genesis/1.json')).v) { const raw = v.replace(/<[^>]+>/g, ''); for (const c of chunkText(prepareForTTS(raw, { stress: true }))) add(textToIPA(c, { data, accents: accentStressMap(raw), havara: 'chabad' })); }
  assert.ok(n > 300);
  assert.ok(!seen.has('ʔ'), 'no glottal stop');
  for (const m of maps) for (const x of seen) if (x !== ' ') assert.ok(m.has(x), 'phoneme ' + x);
});
test('1.0.91: the voices synthesise Chabad pronunciation in Node (default noa + natural)', { timeout: 120000 }, async () => {
  for (const nat of [false, true]) {
    const v = await nodeVoice({ natural: nat });
    const a = await v.synth('בָּרוּךְ אַתָּה הַשֵּׁם, שַׁבָּת שָׁלוֹם וְתוֹרָה', { havara: 'chabad' }), b = await v.synth('בָּרוּךְ אַתָּה הַשֵּׁם, שַׁבָּת שָׁלוֹם וְתוֹרָה');
    assert.match(a.ipa, /ʃˈabos/); assert.match(a.ipa, /vesejʁo|vesˈejʁo|vesejʁˈo/); assert.match(b.ipa, /ʃabˈat/);
    assert.ok(a.audio.length > v.sampleRate * 1.2, 'audio');
  }
});
test('1.0.91: previews exist and are small; setting stored and validated; version bumped; display code untouched by havara', () => {
  for (const h of ['israeli', 'chabad']) { const n = fs.statSync(root + `site/voice-samples/havara-${h}.mp3`).size; assert.ok(n > 10000 && n < 80000, h + ' ' + n); }
  const store = read('site/js/store.js'); assert.match(store, /ttsHavara: 'israeli'/); assert.match(store, /\['israeli', 'chabad'\]\.includes\(prefs\.ttsHavara\)/);
  assert.match(read('site/sw.js'), /VERSION = '1\.0\.(9[1-9]|1\d\d)'/);
  assert.doesNotMatch(read('site/js/texts.js') + read('site/js/layout.js'), /havara/i);
  const md = read('verification/HAVARA-CHABAD-191.md');
  for (const s of ['linguistics.stackexchange.com', 'torahmusings.com', 'jewishvirtuallibrary.org', 'Ashkenazi_Hebrew']) assert.ok(md.includes(s), s);
});

test('1.0.91 browser: "הגייה" next to the voice choice (settings + read-aloud sheet), previews, and the voice reads Chabad', { skip, timeout: 240000 }, async () => {
  const log = [], srv = await serve(undefined, log), b = await launch();
  const init = () => {
    window.__spoken = []; window.__ttsMinMsPerChar = 0; window.__piperLog = [];
    const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false,
      addEventListener() {}, removeEventListener() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 200); }, 2); } } });
  };
  try {
    const p = await pageWith(b, srv.url, { init });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('#qv-st');
    assert.deepEqual(await p.$$eval('#qv input[name=ttsHavara]', a => a.map(x => x.value)), ['israeli', 'chabad']);
    assert.equal(await p.isChecked('#qv input[name=ttsHavara][value=israeli]'), true, 'default Israeli');
    // placed right after the voice choice
    assert.ok(await p.evaluate(() => { const a = document.querySelector('#qv-prev-row'), h = document.querySelector('#qv-havara-label'); return !!(a.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }));
    await p.click('.qv-prev[data-v=havara-chabad]'); await p.waitForTimeout(400);
    assert.ok(log.some(x => x.includes('/voice-samples/havara-chabad.mp3')), 'preview fetched');
    await p.locator('#qv input[name=ttsHavara][value=chabad]').check({ force: true });
    assert.match(await p.textContent('#qv-havara-note'), /ת׳ רפויה – ס/);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsHavara), 'chabad');
    await p.click('#qv-dl');
    await p.waitForFunction(() => /מותקן במכשיר/.test(document.querySelector('#qv-st').textContent), null, { timeout: 150000 });
    await p.goto(srv.url + '#/r/hayomyom/2026-11-09'); await p.waitForSelector('#rc .seg');
    await p.keyboard.press('p');
    await p.waitForFunction(() => window.__piperLog.length >= 1, null, { timeout: 90000 });
    const x = await p.evaluate(() => window.__piperLog[0]);
    assert.equal(x.havara, 'chabad'); assert.doesNotMatch(x.ipa, /ʔ/); assert.match(x.ipa, /ej/);
    await p.click('#t-set'); await p.waitForSelector('#sheet input[name=ttsHavara]');
    assert.equal(await p.isChecked('#sheet input[name=ttsHavara][value=chabad]'), true);
    await p.locator('#sheet input[name=ttsHavara][value=israeli]').check({ force: true });
    await p.waitForFunction(() => window.__piperLog.some(e => e.havara === 'israeli'), null, { timeout: 60000 });
    assert.equal(await p.evaluate(() => window.__spoken.length), 0, 'Web Speech not used');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
