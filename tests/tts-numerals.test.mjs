// 1.0.64 voice: letter+geresh numerals and abbreviations must never vanish from speech (ד' was silent before).
// Rules and statistics: verification/VOICE-NUMERALS.md. Checks prepared text and the G2P transcription, not the sound.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prepareForTTS as P, numberWords, withPrefix, splitNumeral, gematria, LETTER_NAME as LN_PREP } from '../site/js/tts-prep.js';
import { textToIPA, LETTER_NAME as LN_G2P } from '../site/js/g2p.js';
import { stressReport } from '../tools/numeral-stress.mjs';

const H = { stress: true, divineName: 'hashem' };
const data = JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json', import.meta.url)));
const VOWEL = /[aeiou]/;

test('the brief examples', () => {
  assert.equal(P('ד׳ מדריגות', H), 'אַרְבַּע מדריגות');
  assert.equal(P('פרק ד׳', H), 'פרק דָּלֶת');
  assert.equal(P('ה׳ אחד', H), 'הַשֵּׁם אחד');
  assert.equal(P('ר׳ יוסי', H), 'רַבִּי יוסי');
  assert.equal(P('ג׳ פעמים', H), 'שָׁלוֹשׁ פעמים');
});
test('number gender follows the counted noun; construct before a definite noun', () => {
  assert.match(P('ד׳ עולמות', H), /^אַרְבָּעָה /);
  assert.match(P('ב׳ ימים', H), /^שְׁנֵי /);
  assert.match(P('ב׳ בחי׳', H), /^שְׁתֵּי בְּחִינוֹת/);
  assert.match(P('וה׳ חסדים', H), /^וַחֲמִשָּׁה /);
  assert.match(P('ג׳ העולמות', H), /^שְׁלוֹשֶׁת /);
  assert.match(P('י״ג מדות', H), /^שְׁלוֹשׁ עֶשְׂרֵה /);
  assert.match(P('בן י״ג', H), /שְׁלוֹשׁ עֶשְׂרֵה$/);          // age: feminine (the safe default)
});
test('unknown noun → letter names (no guessing); citations → letter names', () => {
  assert.equal(P('שם פ״ג', H), 'שם פֵּא גִּימֶל');
  assert.equal(P('בזהר פ׳ משפטים', H), 'בזהר פֵּא משפטים');
  assert.equal(P('וְצוּרַת הה׳', H), 'וְצוּרַת הַהֵא');
  assert.equal(P('ע״ב', H), 'עַיִן בֵּית');
});
test('special numerals and prefixed abbreviations', () => {
  assert.equal(P('תרי״ג', H), 'תַּרְיַ"ג');                  // read as the word "taryag"
  assert.match(textToIPA(P('תרי״ג', H), { data }), /taʁjˈaɡ|taʁjaɡ/);
  assert.equal(P('דר׳ יוסי', H).normalize('NFC'), 'דְּרַבִּי יוסי'.normalize('NFC'));
  assert.equal(P('וה׳', H), 'וְהַשֵּׁם');
  assert.equal(P('והעוה״ב', H), 'וְהָעוֹלָם הַבָּא');
  assert.equal(P('בחי׳ החכמה', H), 'בְּחִינַת החכמה');
  assert.equal(P('בבחי׳ זו', H).normalize('NFC'), 'בִּבְחִינָה זו'.normalize('NFC'));
});
test('number words and prefixes', () => {
  assert.equal(numberWords(4, 'f'), 'אַרְבַּע');
  assert.equal(numberWords(4, 'm'), 'אַרְבָּעָה');
  assert.equal(numberWords(2, 'f', 'count'), 'שְׁתֵּי');
  assert.equal(numberWords(3, 'm', 'def'), 'שְׁלוֹשֶׁת');
  assert.equal(gematria('תרי"ג'), 613);
  const N = x => x.normalize('NFC');
  assert.equal(N(withPrefix('ב', 'בְּחִינַת')), N('בִּבְחִינַת'));
  assert.equal(N(withPrefix('בה', 'אָלֶף')), N('בָּאָלֶף'));
  assert.deepEqual(splitNumeral("בי'"), null);
});
test('letter-name tables agree between tts-prep and g2p', () => assert.deepEqual(LN_G2P, LN_PREP));
test('g2p guard spells a leftover letter+geresh token instead of dropping it', () => {
  assert.match(textToIPA("ד'", { data }), /dˈalet/);
  assert.match(textToIPA('ס"פ', { data }), /sˈameχ pˈe/);
});
test('number words and letter names carry their dictionary stress', () => assert.deepEqual(stressReport(data).filter(x => x.want !== x.got).map(x => x.w), []));

// Corpus: every output word of every text containing a geresh/gershayim gets a vowel in its transcription.
const ROOT = new URL('../site/data/', import.meta.url).pathname;
function* strings(x) { if (typeof x === 'string') { if (/[\u05D0-\u05EA]['"׳״]/.test(x)) yield x; } else if (Array.isArray(x)) for (const y of x) yield* strings(y); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (k !== 'en' && k !== 'ref' && k !== 'h') yield* strings(v); }
function* files(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) yield* files(p); else if (f.endsWith('.json')) yield p; } }
test('corpus: no letter+geresh token is silent', () => {
  const bad = new Map(); let n = 0;
  // 1.0.96: the Bavli Gemara and Steinsaltz (and the Bartenura) are displayed only – the read-aloud reads their `say` text
  // 1.0.97: the speech layer is in gemara/bsay, ysay, msay (`say` / `bs`; `v` is display niqqud); the whole Shas is
  // sampled (every 7th file) to keep the suite fast
  const said = (f, d) => /gemara[\\/]bavli[\\/]/.test(f) ? (d.yer ? d.segs.map(x => x[0]) : []) : /gemara[\\/](bsay|ysay)[\\/]/.test(f) ? d.say : /gemara[\\/]msay[\\/]/.test(f) ? d.bs
    : /gemara[\\/]mishna[\\/]/.test(f) ? d.m : /gemara[\\/]yer[\\/]/.test(f) ? d.segs.map(x => Array.isArray(x) ? x[0] : x) : d;
  let k = 0;
  for (const f of files(ROOT)) { if (/gemara[\\/]/.test(f) && !/index\.json$/.test(f) && k++ % 7) continue; for (const s of strings(said(f, JSON.parse(fs.readFileSync(f, 'utf8'))))) {
    for (const w0 of P(s, H).split(/\s+/)) {
      // the token itself: edge punctuation off, a geresh right after the letters kept (ד׳. → ד׳; בלבד...״ → בלבד)
      const w = (w0.match(/^[^\u05D0-\u05EA]*(.*?[\u05D0-\u05EA][\u05B0-\u05C7]*['"]?)[^\u05D0-\u05EA\u05B0-\u05C7]*$/) || [])[1];
      if (!w || !/['"]/.test(w) || /"$/.test(w) || /'$/.test(w) && w.replace(/[^\u05D0-\u05EA]/g, '').length > 4) continue; // closing quotes
      n++;
      if (!VOWEL.test(textToIPA(w, { data }))) bad.set(w, path.relative(ROOT, f));
    }
  } }
  assert.ok(n > 1000, `scanned ${n}`);
  assert.deepEqual([...bad].slice(0, 20), []);
});
