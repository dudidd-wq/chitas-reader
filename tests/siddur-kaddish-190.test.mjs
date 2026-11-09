// 1.0.90: setting "הקראת קדישים" (להקריא / לדלג). Skip = the siddur read-aloud passes over every Kaddish; the text stays
// on screen; Barchu, Kedusha and everything else are still read. Audit: verification/SIDDUR-KADDISH-190.md
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kaddishFlags } from '../site/js/texts.js';
import { kaddishAudit } from '../tools/kaddish-audit.mjs';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';

const root = new URL('../', import.meta.url).pathname;
const rows = key => JSON.parse(fs.readFileSync(`${root}site/data/siddur/${key}.json`, 'utf8')).b;
const plain = s => String(typeof s === 'string' ? s : JSON.stringify(s)).replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');
const skip = !CHROME && 'no Chrome';

test('1.0.90: every Kaddish in the siddur is found – 37 blocks in 26 prayers, none outside, no false positives', () => {
  const r = kaddishAudit();
  assert.equal(r.total, 37); assert.equal(Object.keys(r.books).length, 26);
  assert.deepEqual(r.outside, []);
  const per = Object.fromEntries(Object.entries(r.books).map(([k, v]) => [k, v.blocks]));
  assert.equal(per['shacharit/6'], 3); assert.equal(per['shacharit/5'], 2); assert.equal(per['maariv/3'], 3); assert.equal(per['shabbat/6'], 3);
  assert.equal(per['boker/6'], 1);   // קדיש דרבנן after the Baraita
  const md = fs.readFileSync(root + 'verification/SIDDUR-KADDISH-190.md', 'utf8');
  for (const [k, n] of Object.entries(per)) assert.match(md, new RegExp(`\\| ${k.replace('/', '\\/')} \\| ${n} \\|`), k);
});
test('1.0.90: block boundaries – Kaddish parts in, Barchu / Kedusha / על הכל / other instructions out', () => {
  // Shacharit: Hatzi-Kaddish followed directly by ברכו – ברכו is not part of it
  const s1 = rows('shacharit/1'), f1 = kaddishFlags(s1).flags;
  const bar = s1.findIndex(r => r[0] === 'p' && /^ברכו את/.test(plain(r[1])));
  assert.ok(bar > 0 && f1[bar - 3] && !f1[bar], 'Barchu after the Kaddish is read');
  // Full Kaddish: תתקבל, יהא שלמא, the steps-back note and עושה שלום are in; the next paragraph is not
  const s5 = rows('shacharit/5'), f5 = kaddishFlags(s5).flags;
  for (const re of [/^תתקבל צלותהון/, /^יהא שלמה רבא/, /^עשה שלום/]) assert.ok(s5.some((r, i) => f5[i] && re.test(plain(r[1]))), String(re));
  assert.ok(s5.some((r, i) => f5[i] && r[0] === 'n' && /^פוסעים/.test(r[2])), 'steps-back note');
  // על הכל יתגדל (Torah service) and every Kedusha / Barchu paragraph are never flagged
  for (const b of JSON.parse(fs.readFileSync(root + 'site/data/siddur/index.json', 'utf8')).books) b.secs.forEach((_, i) => {
    const r = rows(`${b.id}/${i + 1}`), f = kaddishFlags(r).flags;
    r.forEach((x, j) => { if (f[j] && x[0] === 'p') assert.doesNotMatch(plain(x[1]), /קדוש קדוש קדוש|^ברכו את|נקדש את שמך|^על הכל יתגדל|ברוך יהוה המבורך/, `${b.id}/${i + 1}:${j}`); });
  });
  // an instruction inside a Kaddish that tells where to continue (Rosh Chodesh, Chanukah) is still read
  const rc = rows('rc/1'), fr = kaddishFlags(rc).flags, ch = rc.findIndex(r => r[0] === 'n' && /^בחנוכה, חוץ משבת/.test(r[2] || ''));
  assert.ok(ch > 0 && !fr[ch]);
});

test('1.0.90 browser: skip = no Kaddish spoken (text still shown), Ein Keloheinu / Aleinu spoken; read = Kaddish spoken', { skip, timeout: 180000 }, async () => {
  const srv = await serve(), b = await launch();
  const fast = () => {
    window.__spoken = []; window.__ttsMinMsPerChar = 0;
    const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: false, pending: false, addEventListener() {}, removeEventListener() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 1); }, 1); } } });
  };
  const run = async (kaddish) => {
    const p = await pageWith(b, srv.url, { prefs: { siddurKaddish: kaddish, ttsContinuous: false }, init: fast });
    await p.goto(srv.url + '#/s/shacharit/6'); await p.waitForSelector('#rc .seg');
    const shown = await p.$$eval('#rc .seg .t', els => els.some(e => /יתגדל ויתקדש שמה/.test(e.textContent.replace(/[\u0591-\u05C7]/g, ''))));
    await p.keyboard.press('p');
    await p.waitForFunction(() => document.querySelector('#rb')?.classList.contains('speaking'));
    await p.waitForFunction(() => !document.querySelector('#rb').classList.contains('speaking'), null, { timeout: 150000 });
    const said = await p.evaluate(() => window.__spoken.map(t => t.replace(/[\u0591-\u05C7]/g, '')));
    await p.close();
    return { shown, said: said.join(' \n ') };
  };
  try {
    const sk = await run('skip');
    assert.ok(sk.shown, 'Kaddish still displayed');
    assert.doesNotMatch(sk.said, /יתגדל ויתקדש שמה|יהא שמה רבא מברך|תתקבל צלותהון|יהא שלמה רבא|על ישראל ועל רבנן/);
    assert.match(sk.said, /אין כאלקינו/); assert.match(sk.said, /עלינו לשבח/);
    const rd = await run('read');
    assert.match(rd.said, /יתגדל ויתקדש שמה/); assert.match(rd.said, /יהא שמה רבא מברך/);
    assert.ok(rd.said.length > sk.said.length);
  } finally { await b.close(); srv.close(); }
});

test('1.0.90 browser: the setting sits with the siddur settings (Aא sheet) and in the read-aloud sheet while in the siddur; default = read', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { init: () => {
      const voices = [{ name: 'Fake Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'fake' }];
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, cancel() {}, pause() {}, resume() {},
        speaking: false, pending: false, addEventListener() {}, removeEventListener() {}, speak(u) { setTimeout(() => u.onstart?.({}), 1); } } });
    } });
    await p.goto(srv.url + '#/settings'); await p.waitForSelector('.kaddish-set');
    assert.equal(await p.isChecked('.kaddish-set input[value=read]'), true);
    await p.locator('.kaddish-set input[value=skip]').check({ force: true });
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.siddurKaddish), 'skip');
    await p.goto(srv.url + '#/s/mincha/1'); await p.waitForSelector('#rc .seg');
    await p.click('#b-tts'); await p.waitForSelector('#ttsctl:not([hidden])');
    await p.click('#t-set'); await p.waitForSelector('#sheet .kaddish-set');
    assert.equal(await p.isChecked('#sheet .kaddish-set input[value=skip]'), true);
    await p.keyboard.press('Escape'); await p.waitForSelector('#sheet .kaddish-set', { state: 'hidden' });
    await p.click('#b-aa'); await p.waitForSelector('#sheet .kaddish-set');
    assert.ok(await p.$('#sheet input[name=hideSiddurInstructions]'), 'next to the other siddur settings');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
