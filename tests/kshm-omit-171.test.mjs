// 1.0.71: bedtime Shema — Shabbat/YT omissions vs. the no-Tachanun confession span (through to אנא בכח)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { omitPrayerFlags } from '../site/js/texts.js';
const sk = h => String(h || '').replace(/<[^>]*>/g, '').replace(/[\u0591-\u05C7]/g, '');
const rows = JSON.parse(fs.readFileSync(new URL('../site/data/siddur/shema/1.json', import.meta.url))).b;
const o = omitPrayerFlags(rows, { book: 'shema', n: 1 });
const at = re => rows.findIndex(([t, h]) => t === 'p' && typeof h === 'string' && re.test(sk(h)));

test('Shabbat/YT omissions: הריני מוחל, והגן בעדנו, Psalm 51 — single blocks with Shabbat label', () => {
  for (const re of [/^רבונו של עולם הריני מוחל/, /^והגן בעדנו/, /^למנצח, מזמור לדוד: בבוא/]) {
    const i = at(re);
    assert.ok(i >= 0 && o.omit[i] && o.isStart[i] && o.isEnd[i], String(re));
    assert.equal(o.label[i], 'בשבת ויו״ט אין אומרים');
  }
  assert.equal(o.omit[at(/^השכיבנו/)], false);
});

test('no-Tachanun: the whole confession (אלהינו … יהי רצון … כבוד שמך) up to אנא בכח', () => {
  const s = at(/^אלהינו ואלהי אבותינו, תבא/), e = at(/^ואם חטאתי עויתי פשעתי לפניך ופגמתי באות \(ה\) אחרונה/);
  assert.ok(s > 0 && e > s);
  assert.equal(o.label[s], 'בימים שאין אומרים תחנון');
  assert.ok(o.isStart[s] && o.isEnd[e]);
  for (let i = s; i <= e; i++) if (rows[i][0] === 'p') assert.ok(o.omit[i], 'row ' + i);
  for (let i = s; i < e; i++) assert.equal(o.isEnd[i], false);
  for (const re of [/^אשמנו/, /^מה נאמר/, /^ובכן יהי רצון/]) assert.ok(o.omit[at(re)]);
  assert.equal(o.omit[at(/^אנא בכח$/)], false);
  assert.equal(o.omit[at(/^שיר למעלות|^שיר לַמעלות|^שיר למעלות, אשא/)] ?? false, false);
});
