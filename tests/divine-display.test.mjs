// Display of the divine name (site/js/divine.js): in full by default, or ה׳ as a setting; TTS reads the original word.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fullName, abbrName, divineName, unAbbr } from '../site/js/divine.js';

test('the siddur short form יְיָ / ײ is shown as the full name, prefixes kept', () => {
  assert.equal(fullName('בָּרוּךְ אַתָּה יְיָ'), 'בָּרוּךְ אַתָּה יְהֹוָה');
  assert.equal(fullName('הוֹדוּ לַײָ'), 'הוֹדוּ לַיהֹוָה');
  assert.equal(fullName('בַּײָ'), 'בַּיהֹוָה');
  assert.equal(fullName('וַיְיָ'), 'וַיהֹוָה');
  assert.equal(fullName('אָמַר יי'), 'אָמַר יהוה');
  assert.equal(fullName('לְחַיֵּי עוֹלָם'), 'לְחַיֵּי עוֹלָם');      // not the name
  assert.equal(fullName('יַיִן'), 'יַיִן');
  assert.equal(fullName('<b>יְיָ</b>'), '<b>יְהֹוָה</b>');          // inside markup
  assert.equal(fullName('יְיָ׃'), 'יְהֹוָה׃');                       // before sof pasuq
});
test('ה׳ setting replaces every form of the name, and TTS gets the original back', () => {
  for (const w of ['יְהֹוָה', 'יְהוָ֣ה', 'לַיהֹוָה', 'וַֽיהוָ֗ה', 'יהוה', 'בַּיהוָה']) {
    const a = divineName(`אָמַר ${w} אֵלַי`, 'abbr');
    assert.match(a, /<span class="dn" data-r="[^"]+">(?:[ובכלמשד][\u0591-\u05C7]*){0,2}ה׳<\/span>/, w);
    assert.doesNotMatch(a.replace(/data-r="[^"]*"/g, ''), /יהו|יְהֹ/, w);
    assert.equal(unAbbr(a), `אָמַר ${w} אֵלַי`, w);
  }
  assert.equal(divineName('לַיהֹוָה', 'abbr').replace(/<[^>]*>/g, ''), 'לַה׳');
  assert.equal(divineName('בָּרוּךְ אַתָּה יְיָ', 'full'), 'בָּרוּךְ אַתָּה יְהֹוָה');
  assert.equal(divineName('בָּרוּךְ אַתָּה יְיָ', 'abbr').replace(/<[^>]*>/g, ''), 'בָּרוּךְ אַתָּה ה׳');
  assert.equal(divineName('אֱלֹהִים אֲדֹנָי', 'abbr'), 'אֱלֹהִים אֲדֹנָי');   // other names are left as printed
});
