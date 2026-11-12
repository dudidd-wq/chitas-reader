// 1.0.94: the siddur proofreading list (tools/data/siddur-proofread-194.json) is applied, and the glitch patterns it
// removed do not come back. Read-only: works on in-memory copies of site/data/siddur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIST, loadFiles, pending, applyFixes } from '../tools/siddur-proofread.mjs';

const files = loadFiles();
const strings = () => Object.entries(files).flatMap(([k, d]) => d.b.flatMap((b, i) =>
  b[0] === 'p' ? [[`${k}/${i}`, b[1]]] : b[0] === 't' ? b[1].flatMap((r, ri) => r.filter(c => Array.isArray(c) && /^[px]$/.test(c[0])).map(c => [`${k}/${i}/${ri}`, c[1]])) : []));

test('every proofreading fix is in the data', () => {
  assert.ok(LIST.fixes.length > 1500);
  const p = pending(files);
  assert.equal(p.length, 0, p.slice(0, 5).map(f => `${f.loc} ${f.old}`).join(', '));
});

test('the list is exact: applying it to the shipped data finds nothing left to change', () => {
  const copy = structuredClone(files), errs = applyFixes(copy, LIST.fixes.filter(f => f.old !== ':'));
  // every old form is gone, so each fix now reports 0 occurrences instead of its n (or n×new when old ⊂ new)
  assert.ok(errs.length > 0 && errs.every(e => /found \d+×/.test(e)));
});

test('no sin written as holam, no known broken words left', () => {
  const sinHolam = /ש(?![\u05C1\u05C2])[\u05B0-\u05BC]*\u05B9(?![\u05B0-\u05BC]*[\u05C1\u05C2])/u;
  const bad = ['וְטוֹ בְּעֵינֶיךָ', 'וּמִשְׁפָּטף', 'וְהִשְׁתַּחֲוִי תֶם', 'שְׁלָמָה רבָּא', 'אַתָּח', 'הֲכָמִים', 'וּבִתפִילָּה', 'יְשׁוָּעה', 'וְהוֹשִׁיֵענוּ', 'אֱלֵֹינוּ', 'יַקְטִירֶנָּה:וּבְ'];
  for (const [loc, s] of strings()) {
    const t = s.replace(/<[^>]+>/g, '');
    for (const w of t.match(/[\u05D0-\u05EA\u0591-\u05C7]+/g) || [])
      if (/[\u05B0-\u05BB]/.test(w) && sinHolam.test(w.replace(/ש[\u0591-\u05C7]*[\u05C1\u05C2][\u0591-\u05C7]*/g, ''))) assert.fail(`${loc}: ${w}`);
    for (const b of bad) assert.ok(!t.includes(b), `${loc}: ${b}`);
  }
});

test('Mincha matches Tehillat Hashem in the passages checked against the Kehot scan', () => {
  const t = d => d.b.map(b => (b[0] === 'p' ? b[1] : '')).join(' ').replace(/<[^>]+>/g, '');
  const m2 = t(files['mincha/2']), m3 = t(files['mincha/3']);
  for (const s of ['וְתִשְׁכּוֹן בְּתוֹכָהּ כַּאֲשֶׁר דִּבַּרְתָּ', 'כִּי בְאוֹר פָּנֶיךָ נָתַתָּ לָּנוּ', 'וְטוֹב בְּעֵינֶיךָ לְבָרֵךְ אֶת עַמְּךָ', 'וּלְחַיִּים טוֹבִים', 'הַטּוֹב, כִּי לֹא כָלוּ רַחֲמֶיךָ, הַמְרַחֵם', 'מְחַיֵּה מֵתִים'])
    assert.ok(m2.includes(s), s);
  for (const s of ['וּבִתְפִלָּה פָּנֶיךָ נְקַדֵּם, כְּהוֹדַעְתָּ לֶעָנָיו', 'חָטָאנוּ לְפָנֶיךָ רַחֵם עָלֵינוּ וְהוֹשִׁיעֵנוּ', 'יְהֵא שְׁלָמָא רַבָּא', 'וְיִתְרוֹמָם'])
    assert.ok(m3.includes(s), s);
});

test('Divine Name untouched', () => {
  for (const f of LIST.fixes) {
    const n = s => (s.match(/יְהֹוָה|יֱהֹוִה|יְיָ|ה׳/g) || []).length;   // אֲדֹנָי may gain a missing holam
    assert.equal(n(f.old), n(f.new), `${f.loc}: ${f.old}`);
  }
});

test('1.0.95: doubts settled against the Tehillat Hashem scan', () => {
  const t = (k, i) => files[k].b[i][1].replace(/<[^>]+>/g, '');
  assert.match(t('shacharit/4', 38), /הַמְשַׁלְּשִׁים בְּשָׁלשׁ קְדֻשּׁוֹת לְקָדוֹשׁ/);
  assert.match(t('shacharit/4', 39), /מִתְרַצֶּה בְּרַחֲמִים.*הִתְרַצֶּה וְהִתְפַּיֵּס לְדוֹר עָנִי/);
  const p = t('boker/5', 16);
  for (const s of ['קוֹדֶם לְהַטָּבַת חָמֵשׁ נֵרוֹת, וַהֲטָבַת חָמֵשׁ נֵרוֹת קוֹדֶמֶת לְדַם הַתָּמִיד', 'לְהַטָּבַת שְׁתֵּי נֵרוֹת, וְהַטָּבַת שְׁתֵּי נֵרוֹת קוֹדֶמֶת לִקְטֹרֶת']) assert.ok(p.includes(s), s);
});
