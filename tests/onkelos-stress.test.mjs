import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isLav, lettersOnly, stripOle, HATAMA } from '../tools/lib-mishna-stress.mjs';
import { applyAlignedOle, writeOnkelosSay, torahVerseKeys } from '../tools/lib-onkelos-stress.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const sha = s => createHash('sha256').update(s).digest('hex');

test('onkelos-stress yield, gates, and Torah-verse alignment', () => {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/onkelos-stress-apply-report.json'), 'utf8'));
  assert.equal(report.alignment, 'torah-verse-stressKey');
  assert.equal(report.changedTokens, 196);
  assert.equal(report.uniqueForms, 29);
  assert.equal(report.pagesWritten, 75);
  assert.equal(report.alreadyOle, 1310);
  assert.equal(report.tOle, 0);
  assert.equal(report.occurrences.length, 196);
  assert.equal(report.forms.length, 29);
  assert.ok((report.blocked || []).includes('זָרַע'));
  assert.equal(report.occurrences.filter(o => o.key === 'זָרַע').length, 0);
  assert.equal(report.occurrences.filter(o => isLav(o.bare)).length, 0);
  const never = new Set(['עֵשֶׂב', 'יֶתֶר', 'עֵבֶר', 'צֶדֶק', 'כְּנַעַן', 'חֵלֶק']);
  assert.equal(report.occurrences.filter(o => never.has(o.key)).length, 0);
});

test('onkelos-stress identity: t untouched, only ole added to say, dest present', () => {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/onkelos-stress-apply-report.json'), 'utf8'));
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification/onkelos-stress-identity.json'), 'utf8'));
  assert.equal(snap.n_pages, 75);
  assert.equal(snap.n_tokens, 196);
  assert.equal(snap.rows.length, 75);
  const cache = new Map();
  const load = rel => {
    if (!cache.has(rel)) cache.set(rel, JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
    return cache.get(rel);
  };
  for (const row of snap.rows) {
    const obj = load(row.file);
    assert.equal(sha(JSON.stringify(obj.t)), row.t_sha256, 't changed ' + row.file);
    assert.equal(sha(JSON.stringify(obj.say).replace(/\u05AB/g, '')), row.say_strip_ole_sha256, 'non-ole say change ' + row.file);
    assert.equal((JSON.stringify(obj.t).match(/\u05AB/g) || []).length, 0, 'ole in t ' + row.file);
  }
  for (const o of report.occurrences) {
    const rel = 'site/data/' + o.page + '.json';
    const obj = load(rel);
    const s = obj.say[o.verse];
    assert.equal(typeof s, 'string');
    assert.ok(s.includes(o.dest), 'dest missing ' + rel + '#' + o.verse);
    assert.equal(stripOle(o.dest), o.src);
    assert.ok(o.dest.includes(HATAMA));
    assert.equal(lettersOnly(o.dest), lettersOnly(o.src));
    assert.equal(isLav(o.bare), false);
  }
});

test('onkelos-stress alignment helper keeps unaligned lexicon hits unstamped', () => {
  const lexicon = { 'עֵבֶר': { k: 1 }, 'נֹחַ': { k: 1 } };
  // Real Genesis 10:21: עֵבֶר is bound by maqaf in בְּנֵי־עֵבֶר, so the verse key is not עֵבֶר.
  const everSay = 'וּלְשֵׁם אִתְיְלִיד אַף הוּא אֲבוּהוֹן דְּכָל בְּנֵי עֵבֶר';
  const everVerse = 'וּלְשֵׁ֥ם יֻלַּ֖ד גַּם־ה֑וּא אֲבִי֙ כׇּל־בְּנֵי־עֵ֔בֶר אֲחִ֖י יֶ֥פֶת הַגָּדֽוֹל׃';
  const skipped = applyAlignedOle(everSay, everVerse, lexicon, new Set());
  assert.equal(skipped.aligned.length, 0);
  assert.ok(skipped.rejected.some(ch => ch.key === 'עֵבֶר'));
  assert.equal(skipped.text, everSay);
  assert.equal(torahVerseKeys(everVerse).has('עֵבֶר'), false);
  // Real Genesis 5:29: נֹחַ is a free word in the Torah verse, so it is stamped.
  const noahSay = 'וּקְרָא יָת שְׁמֵיהּ נֹחַ';
  const noahVerse = 'וַיִּקְרָ֧א אֶת־שְׁמ֛וֹ נֹ֖חַ לֵאמֹ֑ר זֶ֞֠ה יְנַחֲמֵ֤נוּ';
  assert.equal(torahVerseKeys(noahVerse).has('נֹחַ'), true);
  const ok = applyAlignedOle(noahSay, noahVerse, lexicon, new Set());
  assert.ok(ok.aligned.some(ch => ch.key === 'נֹחַ'));
  assert.ok(ok.text.includes(HATAMA));
});

test('writeOnkelosSay leaves t prefix bytes identical', () => {
  const raw = '{"t":["א","ב"],"say":["א","ב"]}';
  const out = writeOnkelosSay(raw, ['א\u05AB', 'ב']);
  assert.equal(out.startsWith('{"t":["א","ב"],"say":'), true);
  assert.equal(JSON.parse(out).t[0], 'א');
  assert.equal(JSON.parse(out).say[0].includes('\u05AB'), true);
});
