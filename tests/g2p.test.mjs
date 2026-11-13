// 1.0.59 local voice: Hebrew G2P (niqqud → stressed IPA). Stress priority: cantillation accent → exception list →
// suffix model learned from the Torah and Tehillim (site/voice/stress-he.json). Checks the transcription, not the sound.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { wordToIPA, textToIPA, predictStress, stressFromAccents, accentStressMap, ipaToIds } from '../site/js/g2p.js';

const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const cfg = JSON.parse(fs.readFileSync(new URL('../site/voice/he_IL-noa-medium.onnx.json', import.meta.url)));
const ipa = w => textToIPA(w, { data });

test('required words (stress mark ˈ before the stressed vowel)', () => {
  for (const [w, want] of [
    ['שָׁלוֹם', 'ʃalˈom'], ['שַׁבָּת', 'ʃabˈat'], ['מֹשֶׁה', 'moʃˈe'],            // משה – milra
    ['דֶּלֶת', 'dˈelet'],                                                       // segolate – milel
    ['חָכְמָה', 'χoχmˈa'],                                                      // qamatz katan
    ['הַבַּיִת', 'habˈajit'], ['מִצְוָה', 'mitsvˈa'],
    ['כָּל', 'kˈol'], ['וּבְכָל', 'uvχˈol'], ['הַקָּרְבָּן', 'hakoʁbˈan'],
  ]) assert.equal(ipa(w), want, w);
});

test('accents decide the stress in verses (Torah, Tehillim)', () => {
  const gen = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃';
  assert.equal(textToIPA(prepareForTTS(gen, { stress: true, divineName: 'hashem' }), { data, accents: gen }), 'beʁeʃˈit baʁˈa ʔelokˈim, ʔˈet haʃamˈajim veʔˈet haʔˈaʁets.');
  // accents left in the text are ignored by the transcription (the stress comes from the map)
  assert.equal(textToIPA(gen, { data, accents: gen }), 'beʁeʃˈit baʁˈa ʔelohˈim ʔˈet haʃamˈajim veʔˈet haʔˈaʁets.');
  // the same word, milel or milra by its accent: קָ֫מָה (she arose, milel) vs. קָמָ֫ה (risen, milra)
  // (index of the stressed syllable from the end: 0 = milra, 1 = milel)
  assert.equal(stressFromAccents('קָ֣מָה'), 1);
  assert.equal(stressFromAccents('קָמָ֣ה'), 0);
  // וְאָהַבְתָּ֔ – vav-consecutive perfect, milra, from the accent (the suffix model alone would say milel)
  const v = 'וְאָ֣הַבְתָּ֔ אֵ֖ת יְהֹוָ֣ה אֱלֹהֶ֑יךָ';
  assert.match(textToIPA('וְאָהַבְתָּ', { data, accents: v }), /tˈa$/);
  const m = accentStressMap('לֵ֣ךְ לְךָ֛ מֵאַרְצְךָ֥');
  assert.ok(m.size >= 2);
});

test('suffix model: stress of words outside the Tanakh', () => {
  assert.equal(predictStress('דֶּלֶת', data)[0], 1);
  for (const [w, re] of [['תּוֹרָה', /toʁˈa/], ['הָעוֹלָם', /haʔolˈam/], ['יִשְׂרָאֵל', /jisʁaʔˈel/], ['בְּרָכָה', /bʁaχˈa|beʁaχˈa/]]) assert.match(ipa(w), re, w);
});

test('IPA → model ids: every symbol is in the voice\'s phoneme map', () => {
  const ids = ipaToIds(ipa('בְּרֵאשִׁית בָּרָא אֱלֹהִים, וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ.'), cfg.phoneme_id_map);
  assert.ok(ids.length > 40); assert.ok(ids.every(Number.isInteger));
});
