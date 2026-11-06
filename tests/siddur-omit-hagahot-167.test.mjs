// 1.0.67: .sid-omit markers + 17 Kehot תשס״ז hagahot word fixes
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { omitPrayerFlags, specialPrayerFlags, specialBlockEnds } from '../site/js/texts.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { serve, launch, pageWith } from './helpers.mjs';

const sk = h => String(h || '').replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');
const load = rel => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url)));

test('omitPrayerFlags: מזמור לתודה single para; יהי כבוד not omitted', () => {
  const rows = load('site/data/siddur/shacharit/1.json').b;
  const om = omitPrayerFlags(rows);
  const i = rows.findIndex(([t, h]) => t === 'p' && /מזמור לתודה/.test(sk(h)));
  assert.ok(i >= 0);
  assert.equal(om.omit[i], true);
  assert.equal(om.isStart[i], true);
  assert.equal(om.isEnd[i], true);
  assert.match(om.label[i], /שבת|יו״ט/);
  const yehi = rows.findIndex(([t, h]) => t === 'p' && /^יהי כבוד/.test(sk(h)));
  assert.ok(yehi > i);
  assert.equal(om.omit[yehi], false);
});

test('omitPrayerFlags: Birkat haMazon weekday two Psalms both marked; end on second', () => {
  const rows = load('site/data/siddur/brachot/4.json').b;
  const om = omitPrayerFlags(rows);
  const a = rows.findIndex(([t, h]) => t === 'p' && /על נהרות בבל/.test(sk(h)));
  const b = rows.findIndex(([t, h]) => t === 'p' && /למנצח בנגינת/.test(sk(h)));
  assert.ok(a >= 0 && b > a);
  assert.equal(om.omit[a], true);
  assert.equal(om.omit[b], true);
  assert.equal(om.isStart[a], true);
  assert.equal(om.isEnd[b], true);
});

test('omitPrayerFlags: Kabbalat Shabbat Festival omits Psalms 95–99', () => {
  const rows = load('site/data/siddur/kabbalat/2.json').b;
  const om = omitPrayerFlags(rows);
  const idxs = om.omit.map((x, i) => x ? i : null).filter(x => x != null);
  assert.deepEqual(idxs, [2, 4, 6, 8, 10]);
  assert.equal(om.isStart[2], true);
  assert.equal(om.isEnd[10], true);
});

test('omitPrayerFlags: למנצח יענך / אל ארך אפים / תפלה לדוד', () => {
  const sh4 = load('site/data/siddur/shacharit/4.json').b;
  const sh5 = load('site/data/siddur/shacharit/5.json').b;
  const o4 = omitPrayerFlags(sh4), o5 = omitPrayerFlags(sh5);
  const el = sh4.findIndex(([t, h]) => t === 'p' && /אל ארך אפים ורב חסד ואמת, אל באפך/.test(sk(h)));
  const ya = sh5.findIndex(([t, h]) => t === 'p' && /יענך יהוה ביום צרה/.test(sk(h)));
  const td = sh5.findIndex(([t, h]) => t === 'p' && /תפלה לדוד: הטה/.test(sk(h)));
  assert.ok(el >= 0 && ya >= 0 && td >= 0);
  assert.equal(o4.omit[el], true);
  assert.equal(o5.omit[ya], true);
  assert.equal(o5.omit[td], true);
  const bayit = sh5.findIndex(([t, h]) => t === 'p' && /^בית יעקב/.test(sk(h)));
  assert.ok(bayit > td);
  assert.equal(o5.omit[bayit], false);
});

test('specialBlockEnds: multi-paragraph special gets end flag; singles do not', () => {
  const rows = load('site/data/siddur/shacharit/3.json').b;
  const sp = specialPrayerFlags(rows);
  const ends = specialBlockEnds(sp);
  const al = rows.findIndex(([t, h]) => t === 'p' && /על הנסים/.test(sk(h)));
  assert.ok(al >= 0 && sp[al]);
  // Al Hanisim often continues with בימי – if contiguous len>1, last has end
  let run = 0;
  for (let i = al; i < rows.length && sp[i]; i++) run++;
  if (run > 1) assert.equal(ends[al + run - 1], true);
  else assert.equal(ends[al], false);
});


// ---- 17 hagahot ----
const hagahot = [
  ['H001', 'site/data/siddur/boker/5.json', /סַמְּמָנִין/, /סַמְּמָנִים/],
  ['H002', 'site/data/siddur/shabbat/1.json', /מִבֵּית עֲבָדִים פְּדִיתָנוּ/, /וּמִבֵּית עֲבָדִים פְּדִיתָנוּ/],
  ['H003', 'site/data/siddur/brachot/4.json', /הֵיטִיב לָנוּ/, /הֵטִיב לָנוּ/],
  ['H004', 'site/data/siddur/shacharit/6.json', /אֲדוֹנֵנוּ/, /אֲדוֹנֵינוּ/],
  ['H014', 'site/data/siddur/boker/1.json', /תוֹרָתְךָ לִשְׁמָהּ/, null],
  ['H026', 'site/data/siddur/shacharit/1.json', /נָאֲוָה/, /נָאוָה/],
  ['H063', 'site/data/siddur/shabbat/6.json', /יִשְׂמְחוּ בְמַלְכוּתְךָ/, /יִשמְחוּ בְמַלְכוּתְךָ/],
  ['H068', 'site/data/siddur/shabbat/1.json', /הַגָּבֶר/, /הַגֶּבֶר/],
  ['H088', 'site/data/siddur/mincha/1.json', /זֶכֶר רַב/, /זֵכֶר רַב/],
  ['H089', 'site/data/siddur/shacharit/1.json', /חִיִּיתָנִי/, /חִיִּיתַנִי/],
  ['H091', 'site/data/siddur/shacharit/5.json', /וּנְטַלְתַּנִי/, /וּנְטָלַתְנִי/],
  ['H095', 'site/data/siddur/shacharit/4.json', /מַאֲמָר/, /מַאֲמַר/],
  ['H097', 'site/data/siddur/brachot/4.json', /כֹּל מַעְיָנַי/, /כָּל מַעְיָנַי/],
  ['M016', 'site/data/siddur/rc/1.json', /יְהַלְלוּךָ יְהֹוָה אֱלֹהֵינוּ כָּל מַעֲש/, /\(עַל\)/],
  ['M018', 'site/data/siddur/shabbat/5.json', /תּוֹשִׁיעַ וְתַשְׂמִחַ/, /תּושִׁיעַ(?! וְתַשְׂמִחַ)/],
  ['M028', 'site/data/siddur/shacharit/5.json', /מִשְׂגָּב לָנוּ/, /מִשְׂגַּב לָנוּ/],
];

for (const [id, file, good, bad] of hagahot) {
  test(`hagahot ${id}: corrected text present, old form gone (in target file)`, () => {
    const raw = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(raw, good, `${id} expected corrected form`);
    if (id === 'H004') {
      // אחד אלהינו section should use אדוננו; Tanakh verses may still have אדונינו elsewhere in other files
      assert.match(raw, /אֲדוֹנֵנוּ/);
      // the target cell for אין כאלהינו should not keep the yod form for אדוננו
      const sec = JSON.parse(raw);
      const cell = sec.b[35][1];
      assert.match(cell, /אֲדוֹנֵנוּ/);
      assert.doesNotMatch(cell, /אֲדוֹנֵינוּ|כַּאדוֹנֵינוּ|לַאדוֹנֵינוּ/);
    } else if (id === 'M016') {
      assert.doesNotMatch(raw, bad);
    } else if (id === 'M018') {
      assert.match(raw, good);
      assert.doesNotMatch(raw, /תּושִׁיעַ(?! וְתַשְׂמִחַ)/);
    } else if (bad) {
      assert.doesNotMatch(raw, bad, `${id} old form should be gone`);
    }
  });
}

test('hagahot M001: Braita deRabbi Yishmael has no [א]…[יג] markers', () => {
  const rows = load('site/data/siddur/boker/6.json').b;
  const p = rows.find(([t, h]) => t === 'p' && /רבי ישמעאל אומר/.test(sk(h)));
  assert.ok(p);
  assert.doesNotMatch(p[1], /\[[א-י]|י[א-ג]\]/);
  assert.match(sk(p[1]), /מקל וחמר/);
});

test('hagahot H002: עזרת אבותינו still has ומבית; Nishmat does not', () => {
  const nish = load('site/data/siddur/shabbat/1.json').b[156][1];
  const ezrat = load('site/data/siddur/shacharit/2.json').b.find(([t, h]) => t === 'p' && /עזרת אבותינו|ממצרים גאלתנו/.test(sk(h)) || (t === 'p' && /פדיתנו/.test(sk(h)) && /עבדים/.test(sk(h))));
  assert.match(nish, /מִבֵּית עֲבָדִים/);
  assert.doesNotMatch(nish, /וּמִבֵּית עֲבָדִים/);
  assert.ok(ezrat);
  assert.match(ezrat[1], /וּמִבֵּית עֲבָדִים/);
});

test('hagahot: TTS sees corrected סממנין and ותשמח', () => {
  const pitum = load('site/data/siddur/boker/5.json').b[4][1];
  const haft = load('site/data/siddur/shabbat/5.json').b[101][1];
  const spokenP = prepareForTTS(pitum, { stress: false }).replace(/[\u0591-\u05C7]/g, '');
  const spokenH = prepareForTTS(haft, { stress: false }).replace(/[\u0591-\u05C7]/g, '');
  assert.match(spokenP, /סממנין/);
  assert.match(spokenH, /תושיע ותשמח/);
  assert.match(haft, /תּוֹשִׁיעַ וְתַשְׂמִחַ/);
  assert.match(pitum, /סַמְּמָנִין/);
  assert.doesNotMatch(pitum, /סַמְּמָנִים/);
});

let srv, browser;
test.before(async () => { srv = await serve(); browser = await launch(); });
test.after(async () => { await browser?.close(); srv?.close(); });

test('reader: omit block shows start cue + עד כאן; not sid-special', async () => {
  const p = await pageWith(browser, srv.url);
  await p.goto(srv.url + '#/s/shacharit/1');
  await p.waitForSelector('#rc .seg');
  const info = await p.$$eval('#rc .seg', els => els.map(el => ({
    omit: el.classList.contains('sid-omit'),
    special: el.classList.contains('sid-special'),
    start: el.querySelector('.sid-omit-start')?.textContent || '',
    end: el.querySelector('.sid-end')?.textContent || '',
    text: (el.querySelector('.t')?.textContent || '').slice(0, 40),
  })));
  const block = info.find(x => x.omit && /מזמור לתודה/.test(x.text.replace(/[\u0591-\u05C7]/g, '')));
  assert.ok(block, 'מזמור לתודה should be sid-omit');
  assert.equal(block.special, false);
  assert.match(block.start, /אין אומרים|שבת/);
  assert.equal(block.end, 'עד כאן');
  // markers are data-nr
  const nr = await p.$$eval('#rc .sid-bound[data-nr]', els => els.length);
  assert.ok(nr >= 2);
});
