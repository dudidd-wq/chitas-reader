// "מראי מקומות" / short-explanation link (round 8): a separate, attributed, collapsed section after the text –
// Kehot's source notes for Torah Or / Likkutei Torah (Sefaria, CC BY-NC), Wikisource's source notes for Tanya
// (CC BY-SA 4.0), and only a link to the Steinsaltz commentary for the Rambam (copyright). Nothing written by the site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { steinsaltzUrl } from '../site/js/texts.js';
import { serve, launch, pageWith, CHROME } from './helpers.mjs';
const skip = !CHROME && 'no Chrome';
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const cons = s => s.replace(/<[^>]+>/g, '').replace(/[\u0591-\u05C7]/g, '').replace(/[^\u05D0-\u05EA]/g, '');

test('Torah Or / Likkutei Torah notes: every week, only <b>/<br>, each heading found in its paragraph, counts as reported', () => {
  const S = J('verification/notes-tolt-stats.json'), weeks = fs.readdirSync('site/data/tolt/w');
  let notes = 0, lessons = 0;
  for (const f of weeks) {
    const W = J(`site/data/tolt/w/${f}`), N = J(`site/data/notes/tolt/${f}`);
    for (const [day, paras] of Object.entries(N)) {
      lessons++;
      for (const [i, list] of Object.entries(paras)) {
        const p = W.days[day - 1][i - 1]; assert.ok(p, `${f} ${day}.${i}`);
        for (const h of list) {
          notes++;
          assert.doesNotMatch(h.replace(/<\/?b>|<br>/g, ''), /[<>]/, 'only <b>/<br>');
          const head = h.match(/<b>([^<]*)<\/b>/)[1].replace(/:\s*$/, '');
          for (const chunk of head.split(/\.\s*\.|…/).map(cons).filter(x => x.length >= 2)) assert.ok(cons(p.t.replace(/<span class="daf"[^>]*>[^<]*<\/span>/g, '')).includes(chunk), `${f} ${day}.${i}: ${head}`);
        }
      }
    }
  }
  assert.equal(notes, S.notes); assert.equal(lessons, S.withNotes);
  assert.ok(S.withNotes / S.lessons > 0.9, 'coverage');
});
test('Tanya notes: only the parts that have them, segments exist, plain text without wiki markup', () => {
  const S = J('verification/notes-tanya-stats.json'), src = fs.readFileSync('site/js/texts.js', 'utf8');
  const keys = JSON.parse(src.match(/const NOTE_KEYS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(fs.readdirSync('site/data/notes/tanya').map(f => f.replace('.json', '')).sort(), [...keys].sort());
  let n = 0;
  for (const k of keys) for (const [c, segs] of Object.entries(J(`site/data/notes/tanya/${k}.json`))) {
    const len = J(`site/data/tanya/${k}/${c}.json`).s.length;
    for (const [s, list] of Object.entries(segs)) {
      assert.ok(+s >= 1 && +s <= len, `${k} ${c}.${s}`);
      for (const x of list) { n++; assert.ok(x.t && x.w); assert.doesNotMatch(x.t + x.w, /\[\[|\]\]|\{\{|\}\}|<|>/); }
    }
  }
  assert.equal(n, S.placed);
});
test('Rambam: Steinsaltz link only (no text copied)', () => {
  assert.equal(steinsaltzUrl('Human Dispositions', 2), 'https://www.sefaria.org/Steinsaltz_on_Mishneh_Torah,_Human_Dispositions.2?lang=he');
  assert.ok(!fs.existsSync('site/data/notes/rambam'));
});
test('reader: notes are a separate collapsed, attributed section; axe; nothing external; can be turned off', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    for (const [u, pr, kind, href] of [['tolt/2026-11-02', { lessonTolt: true }, 'tolt', /sefaria\.org/], ['tanya/2027-02-20', {}, 'tanya', /wikisource\.org/], ['rambam1/2026-11-03', {}, 'rambam', /Steinsaltz_on_Mishneh_Torah/]]) {
      for (const theme of ['paper', 'dark']) {
        const p = await pageWith(b, srv.url, { prefs: { ...pr, theme }, viewport: { width: 360, height: 740 } });
        const ext = []; p.on('request', r => { if (!r.url().startsWith(srv.url)) ext.push(r.url()); });
        await p.goto(srv.url + '#/r/' + u); await p.waitForSelector(`.study-notes[data-kind="${kind}"]`);
        const el = p.locator(`.study-notes[data-kind="${kind}"]`).first();
        const links = await el.locator('a').evaluateAll(a => a.map(x => x.href));
        assert.ok(links.some(h => href.test(h)), `${u} attribution link`);
        if (kind !== 'rambam') {
          assert.equal(await el.evaluate(d => d.tagName + d.open), 'DETAILSfalse', 'collapsed');
          await el.locator('summary').click(); assert.equal(await el.evaluate(d => d.open), true);
          assert.ok((await el.locator('li').count()) > 0);
        }
        assert.equal(await p.locator('.seg .study-notes').count(), 0, 'not inside a text segment (not read aloud)');
        const ax = await new AxeBuilder({ page: p }).include('#reader').analyze();
        assert.deepEqual(ax.violations.map(v => v.id), [], `${u} ${theme}`);
        assert.deepEqual(ext, []); assert.deepEqual(p.errors, []);
        await p.close();
      }
    }
    const p = await pageWith(b, srv.url, { prefs: { lessonTolt: true, studyNotes: false } });
    await p.goto(srv.url + '#/r/tolt/2026-11-02'); await p.waitForSelector('.seg');
    assert.equal(await p.locator('.study-notes').count(), 0, 'turned off in settings');
    await p.close();
  } finally { await b.close(); srv.close(); }
});
