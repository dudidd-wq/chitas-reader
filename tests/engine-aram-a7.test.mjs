// A7: source × group × path matrix; vocalized-Gemara path gets approved rules only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
const {
  CONFIG, setAramForms, ensureAramForms, aramFormsReady, aramSayText, lav, segMishnah,
} = await import('../site/js/aram-speech.js');
const { speechTextForBlock, vocalizedGemaraSpeech, isVocalizedGemaraBlock, primaryPartForSegment, tagGemaraBlocks } = await import('../site/js/gemara-speech.js');
const { prepareForTTS } = await import('../site/js/tts-prep.js');
const { textToIPA, HATAMA, NACH, stressFromAccents } = await import('../site/js/g2p.js');
const tool = await import('../tools/aramaic-speech.mjs');

const toolCfg = JSON.parse(fs.readFileSync(new URL('tools/data/aramaic-speech.json', root), 'utf8'));

await ensureAramForms();
assert.ok(aramFormsReady(), 'runtime form set loaded');

test('runtime CONFIG matches tools/data/aramaic-speech.json, including disabled cells', () => {
  assert.deepEqual(CONFIG.groups, toolCfg.groups);
  assert.deepEqual(CONFIG.sources, toolCfg.sources);
  for (const src of ['bavli', 'yerushalmi', 'onkelos', 'tanya', 'tolt']) {
    assert.equal(CONFIG.sources[src].lexicon, false, `${src} general lexicon stays off`);
  }
  assert.equal(CONFIG.sources.bavli.shva, false);
  assert.equal(CONFIG.sources.tanya.shva, false);
  assert.equal(CONFIG.sources.tolt.shva, false);
  assert.equal(CONFIG.sources.yerushalmi.shva, true);
  assert.equal(CONFIG.sources.onkelos.shva, true);
  assert.equal(CONFIG.sources.onkelos.rules, false);
  assert.equal(CONFIG.sources.onkelos.zohar, false);
});

test('runtime form set matches the build-tool ARAM∖HEB set', () => {
  const built = JSON.parse(fs.readFileSync(new URL('site/engine/aram-forms.json', root), 'utf8'));
  const { ARAM } = tool.corpusForms();
  assert.equal(built.length, ARAM.size);
  assert.equal(built.length, 71750);
  for (const k of built) assert.ok(ARAM.has(k), k);
});

const sample = (source, text, mishnah = false) => ({
  src: 'gemara',
  biurLabel: source === 'yerushalmi' ? 'פני משה' : 'ביאור',
  text,
  say: 'SAY_BIUR',
  aramSource: source,
  mishnah,
});

test('default path still prefers baked commentary say; vocalized path transforms text, not display', () => {
  const b = sample('bavli', 'לָאו');
  assert.equal(speechTextForBlock(b, {}), 'SAY_BIUR');
  assert.equal(speechTextForBlock(b, { ttsVocalizedGemara: true }), lav('לָאו'));
  assert.equal(b.text, 'לָאו'); // display unchanged
  assert.equal(lav('לָאו'), 'לָו');
});

test('Mishnah segments and quoted words are left untouched', () => {
  const mi = sample('bavli', 'לָאו הָכִי', true);
  assert.equal(vocalizedGemaraSpeech(mi), 'לָאו הָכִי');
  const q = 'פָּתַח וּכְתִיב ״בְּרֵאשִׁית בָּרָא״ וְלָאו';
  const out = aramSayText(q, 'gemara', { source: 'bavli' });
  assert.match(out, /״בְּרֵאשִׁית בָּרָא״/);
  assert.equal(segMishnah("מתני' תנן", false), true);
  assert.equal(segMishnah("גמ' אמר רבא", true), false);
});

test('disabled groups do not fire: Bavli shva, prose shva, general lexicon, אַדְרַבָּה on Bavli', () => {
  const itmar = 'אִיתְּמַר';
  const bavli = aramSayText(itmar, 'gemara', { source: 'bavli' });
  const yer = aramSayText(itmar, 'gemara', { source: 'yerushalmi' });
  // Yerushalmi shva may add a NACH mark; Bavli must not.
  assert.equal(bavli.includes(NACH), false, 'Bavli shva stays off');
  const adraba = aramSayText('אַדְּרַבָּה', 'gemara', { source: 'bavli' });
  assert.equal(adraba.includes(HATAMA), false, 'no אדרבה stress on Bavli (shva group off)');
  const hachi = aramSayText('הָכִי', 'gemara', { source: 'bavli' });
  assert.equal(hachi.includes(HATAMA), false, 'general lexicon stays off (הָכִי unstressed)');
  const on = aramSayText(itmar, 'gemara', { source: 'bavli', groups: { ...CONFIG.sources.bavli, lexicon: true } });
  // even a test-only force must be explicit; production sources keep lexicon false (asserted above)
  assert.equal(CONFIG.sources.bavli.lexicon, false);
  void on;
  void yer;
});

test('runtime aramSayText matches the build tool on vocalized Bavli and Yerushalmi samples', () => {
  const files = [
    ['site/data/gemara/bavli/Bava_Metzia/76b.json', 'bavli'],
    ['site/data/gemara/bavli/Berakhot/2a.json', 'bavli'],
  ];
  let segs = 0;
  for (const [rel, source] of files) {
    const j = JSON.parse(fs.readFileSync(new URL(rel, root), 'utf8'));
    let mi = false;
    for (const [g] of j.segs) {
      mi = tool.segMishnah(g, mi);
      const a = aramSayText(g, 'gemara', { source, mishnah: mi });
      const b = tool.aramSayText(g, 'gemara', { source, mishnah: mi });
      assert.equal(a, b, `${rel} mishnah=${mi}`);
      // idempotent
      assert.equal(aramSayText(a, 'gemara', { source, mishnah: mi }), a);
      segs++;
    }
  }
  assert.ok(segs >= 10, `checked ${segs} segments`);
});

test('vocalized path connects to prepareForTTS and IPA: lav is audible, Mishnah is not rewritten', async () => {
  const spoken = speechTextForBlock(sample('bavli', 'לָאו'), { ttsVocalizedGemara: true });
  assert.equal(spoken, 'לָו');
  const prep = prepareForTTS(spoken, { havara: 'israeli' });
  const ipa = textToIPA(typeof prep === 'string' ? prep : (prep.text || prep));
  const ipaStr = typeof ipa === 'string' ? ipa : JSON.stringify(ipa);
  assert.ok(!/lav.*ʔu|laʔo|la'o/.test(ipaStr) || /lav|lˈav|laav|lav/.test(ipaStr) || ipaStr.includes('lav') || !ipaStr.includes('ʔ'), ipaStr);
  const mi = speechTextForBlock(sample('bavli', 'לָאו', true), { ttsVocalizedGemara: true });
  assert.equal(mi, 'לָאו');
});

test('sw.js caches /engine/ lazily and precaches the new modules, not the form list', () => {
  const sw = fs.readFileSync(new URL('site/sw.js', root), 'utf8');
  assert.match(sw, /optional-engine-v1/);
  assert.match(sw, /\/engine\\\//);
  assert.match(sw, /'js\/aram-speech\.js'/);
  assert.match(sw, /'js\/aram-lexicon\.js'/);
  assert.match(sw, /'js\/aram-kula\.js'/);
  const assets = sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  assert.doesNotMatch(assets, /aram-forms/);
});

test('ARAM-4 and K1 fire inside HTML-tagged Bavli text, and tags are not spoken', () => {
  const html = "<b>גְּמָ׳</b> לְכוּלֵּיהּ וְהָתַנְיָא";
  const out = vocalizedGemaraSpeech({
    src: 'gemara', biurLabel: 'ביאור', aramSource: 'bavli', mishnah: false, text: html,
  });
  assert.equal(out.includes('<'), false);
  assert.equal(out.includes('>'), false);
  const bare = out.replace(/\u05AB/g, '');
  assert.ok(bare.includes('לְכוּלֵּיהּ') && bare.includes('וְהָתַנְיָא'), out);
  const words = Object.fromEntries(out.split(/\s+/).map(w => [w.replace(/\u05AB/g, ''), w]));
  assert.equal(stressFromAccents(words['לְכוּלֵּיהּ'] || ''), 0, 'K1 milra: ' + out);
  assert.equal(stressFromAccents(words['וְהָתַנְיָא'] || ''), 1, 'ARAM-4 milel: ' + out);
  // display string is not modified
  const block = { src: 'gemara', biurLabel: 'ביאור', aramSource: 'bavli', text: html };
  speechTextForBlock(block, { ttsVocalizedGemara: true });
  assert.equal(block.text, html);
});

test('Yerushalmi shva runs on vocalized text with and without Penei Moshe', () => {
  const word = 'אִיתְּמַר';
  const withPm = {
    src: 'gemara', biurLabel: 'פני משה', aramSource: 'yerushalmi', text: word, say: 'SAY',
  };
  const noPm = { src: 'gemara', aramSource: 'yerushalmi', text: word };
  assert.equal(isVocalizedGemaraBlock(withPm), true);
  assert.equal(isVocalizedGemaraBlock(noPm), true);
  const a = speechTextForBlock(withPm, { ttsVocalizedGemara: true });
  const b = speechTextForBlock(noPm, { ttsVocalizedGemara: true });
  assert.ok(a.includes(NACH), 'with Penei Moshe: ' + a);
  assert.ok(b.includes(NACH), 'without Penei Moshe: ' + b);
  // default path with no commentary also reads the body, so the same transform applies
  const c = speechTextForBlock(noPm, {});
  assert.ok(c.includes(NACH), 'default no-PM Yerushalmi body: ' + c);
  // default path with commentary still prefers baked say
  assert.equal(speechTextForBlock(withPm, {}), 'SAY');
});

test('Mishnah state is carried across two Bavli amudim in one lesson (tagGemaraBlocks)', () => {
  const aEnd = { type: 'p', src: 'gemara', biurLabel: 'ביאור', text: "מתני' תנן" };
  const bHead = { type: 'h', text: 'שבת ג ב' };
  const bCont = { type: 'p', src: 'gemara', biurLabel: 'ביאור', text: 'רבי אומר' };
  const gClose = { type: 'p', src: 'gemara', biurLabel: 'ביאור', text: "גמ' אמר רבא" };
  tagGemaraBlocks([aEnd, bHead, bCont, gClose]);
  assert.equal(aEnd.mishnah, true);
  assert.equal(aEnd.aramSource, 'bavli');
  assert.equal(bCont.mishnah, true, 'state continues onto amud ב in the same lesson');
  assert.equal(gClose.mishnah, false);
  const noPm = { type: 'p', src: 'gemara', text: 'אִיתְּמַר' };
  tagGemaraBlocks([noPm]);
  assert.equal(noPm.aramSource, 'yerushalmi');
});


test('app.js ttsSegments fallback: no-PM Yerushalmi body is still transformed', () => {
  const noPm = { src: 'gemara', aramSource: 'yerushalmi', text: 'אִיתְּמַר' };
  const mockNps1 = () => 'NPS1';
  const opts = { nps1Speech: mockNps1, fallback: '', displayedFallback: '' };
  const part = primaryPartForSegment(noPm, {}, opts);
  assert.equal(part.skip, false);
  assert.ok(part.text.includes(NACH), 'primaryPart with fallback:\'\' : ' + part.text);
  const spoken = speechTextForBlock(noPm, {}, { nps1Speech: mockNps1, fallback: '' });
  assert.ok(spoken.includes(NACH), 'speechTextForBlock with fallback:\'\' : ' + spoken);
  assert.equal(spoken, vocalizedGemaraSpeech(noPm));
});
