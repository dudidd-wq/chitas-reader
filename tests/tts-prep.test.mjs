import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareForTTS as P, chunkText } from '../site/js/tts-prep.js';
const H = { stress: true, divineName: 'hashem' }, A = { stress: true, divineName: 'adonai' };

test('cantillation removed, niqqud kept, sof pasuq → period, maqaf → space', () => {
  assert.equal(P('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר׃', H), 'וַיְדַבֵּר השם אֶל מֹשֶׁה לֵּאמֹר.');
  assert.doesNotMatch(P('בְּרֵאשִׁ֖ית בָּרָ֣א', H), /[\u0591-\u05AF]/);
});
test('plain mode strips niqqud as well', () => {
  assert.equal(P('בְּרֵאשִׁ֖ית בָּרָ֣א', { stress: false }), 'בראשית ברא');
});
test('Tetragrammaton per chosen rule, with prefixes', () => {
  assert.equal(P('יְהוָה', A), 'אֲדֹנָי');
  assert.equal(P('לַיהוָה', A), 'לַאֲדֹנָי');
  assert.equal(P('לַיהוָה', H), 'לַהשם');
  assert.equal(P('אֲדֹנָ֥י יֱהֹוִ֖ה', A), 'אֲדֹנָי אֱלֹהִים');
  assert.equal(P('אֲדֹנָ֥י יֱהֹוִ֖ה', H), 'אֲדֹנָי אֱלֹקִים');
  assert.equal(P("ה' אֱלֹקֵינוּ", H), 'השם אֱלֹקֵינוּ');
});
test('Elohim → Elokim only in "השם" mode', () => {
  assert.equal(P('אֱלֹהִ֑ים', H), 'אֱלֹקִים');
  assert.equal(P('אֱלֹהִ֑ים', A), 'אֱלֹהִים');
});
test('ketiv/qere: only the qere is read; section markers dropped', () => {
  assert.equal(P('וַיֹּ֣אמֶר (ויאמר) [וַיֹּאמְר֥וּ] {פ}', H), 'וַיֹּאמֶר וַיֹּאמְרוּ');
});
test('common abbreviations expanded', () => {
  assert.equal(P('הקב"ה אמר ז"ל וכו\'', H), 'הַקָּדוֹשׁ בָּרוּךְ הוּא אמר זִכְרוֹנוֹ לִבְרָכָה וְכוּלֵּי');
});
test('HTML tags and duplicated marks cleaned', () => {
  assert.equal(P('<b>מַה</b> שֶּׁכָּתַב', H), 'מַה שֶּׁכָּתַב');
  assert.equal(P('לֹֹֹֹֹא', H), 'לֹא');
});
test('chunks are ≤180 chars and keep all words', () => {
  const t = 'א'.repeat(50) + ' ' + 'ב'.repeat(50) + '. ' + 'ג '.repeat(150);
  const ch = chunkText(t, 180);
  assert.ok(ch.every(c => c.length <= 180));
  assert.equal(ch.join(' ').split(/\s+/).filter(Boolean).length, t.split(/\s+/).filter(Boolean).length);
});
