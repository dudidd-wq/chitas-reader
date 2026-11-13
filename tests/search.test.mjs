// 1.0.63: the library tree (book → part → chapter, reading order across books) and the local full-text search index
// (built by tools/build-search.mjs): niqqud/taamim, geresh/gershayim and simple ktiv male/chaser do not matter,
// known passages are found, the divine name is indexed in full and the index is not stale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceHash } from '../tools/build-search.mjs';   // (also installs a file-system fetch for the site's modules)
import * as S from '../site/js/search.js';
import { libNode, libDoc, libFiles, family, FAMILIES } from '../site/js/library.js';

const DIR = new URL('../site/data/search/', import.meta.url).pathname;
const meta = JSON.parse(fs.readFileSync(DIR + 'shards.json', 'utf8'));
const shards = meta.shards.map(s => ({ ...s, S: S.prepShard(JSON.parse(fs.readFileSync(DIR + s.id + '.json', 'utf8'))) }));
const search = q => { const Q = S.compileQuery(q); return shards.flatMap(s => S.searchShard(s.S, Q, 1e6).hits.map(h => ({ ...h, shard: s.id, href: S.hitHref(h) }))); };
const hrefs = q => search(q).map(h => h.href);

test('the index is up to date with the text data (run `npm run search` after changing data)', () => {
  assert.equal(meta.source, sourceHash());
  for (const s of meta.shards) assert.equal(fs.statSync(DIR + s.id + '.json').size, s.bytes, s.id);
  assert.ok(meta.segs > 40000, 'segments ' + meta.segs);
  assert.ok(meta.shards.every(s => s.bytes < 1.5 * 1048576), 'every shard is small enough to load on demand');
});

test('library tree: every book, reading order within and across books, breadcrumbs', async () => {
  assert.deepEqual(FAMILIES.map(f => f.id), ['torah', 'tehillim', 'tanya', 'rambam', 'mitzvot', 'tolt', 'hayomyom', 'rav', 'bavli', 'yerushalmi', 'mishnah', 'siddur']);
  const count = {}; for (const f of FAMILIES) if (!f.href) count[f.id] = (await family(f.id)).leaves.length;
  assert.equal(count.torah, 187); assert.equal(count.tehillim, 150 + 30 + 7); assert.equal(count.mitzvot, 1 + 248 + 365 + 14);
  assert.ok(count.rambam > 1000 && count.tanya > 120 && count.tolt > 300 && count.rav > 50, JSON.stringify(count));
  const nav = async p => { const r = await libNode(p); return [r.prev?.id ?? null, r.next?.id ?? null]; };
  assert.deepEqual(await nav('torah/Genesis/50'), ['torah/Genesis/49', 'torah/Exodus/1']);
  assert.deepEqual(await nav('torah/Exodus/1'), ['torah/Genesis/50', 'torah/Exodus/2']);
  assert.deepEqual(await nav('torah/Genesis/1'), [null, 'torah/Genesis/2']);
  assert.deepEqual(await nav('torah/Deuteronomy/34'), ['torah/Deuteronomy/33', null]);
  assert.deepEqual(await nav('tanya/LA/53'), ['tanya/LA/52', 'tanya/SY-chinukh/1']);
  assert.deepEqual(await nav('tanya/IK/32'), ['tanya/IK/31', 'tanya/KA/1']);
  assert.deepEqual(await nav('mitzvot/S/14'), ['mitzvot/S/13', 'mitzvot/P/1']);
  assert.deepEqual(await nav('tehillim/150'), ['tehillim/149', null]);                 // the 150 chapters, the month and the week are separate runs
  assert.deepEqual(await nav('tehillim/m/1'), [null, 'tehillim/m/2']);
  assert.deepEqual(await nav('mitzvot/P/248'), ['mitzvot/P/247', 'mitzvot/N/1']);
  assert.deepEqual(await nav('rambam/Foundations_of_the_Torah/10'), ['rambam/Foundations_of_the_Torah/9', 'rambam/Human_Dispositions/1']);
  const r = await libNode('rambam/Foundations_of_the_Torah/1');
  assert.equal(r.node.label, 'הלכות יסודי התורה פרק א');
  assert.equal(r.crumbs.at(-1).id, 'rambam/Foundations_of_the_Torah');
  assert.equal(await libNode('torah/Genesis/51'), null);
  assert.equal(await libNode('nothing/1'), null);
});

test('a library chapter is built by the same builders as the daily lessons', async () => {
  const { doc } = await libDoc('torah/Genesis/1');
  const vs = doc.blocks.filter(b => b.type === 'v');
  assert.equal(vs.length, 31); assert.equal(vs[0].id, '1:1');
  const t = await libDoc('tehillim/23'); assert.equal(t.doc.blocks.find(b => b.type === 'v').id, '23:1');
  assert.ok((await libDoc('rav/158')).doc.blocks.length > 3);
  assert.deepEqual(await libFiles('torah/Genesis/1'), ['torah/Genesis/1.json']);
  assert.equal((await libFiles('torah/Genesis')).length, 50);
});

test('search: with or without niqqud and taamim, the same results', () => {
  const a = hrefs('בראשית ברא'), b = hrefs('בְּרֵאשִׁ֖ית בָּרָ֣א');
  assert.deepEqual(a, b);
  assert.equal(a[0], '#/lib/torah/Genesis/1?s=1%3A1');
  assert.deepEqual(hrefs('שמע ישראל'), hrefs('שְׁמַע יִשְׂרָאֵל'));
});

test('search: known passages', () => {
  assert.ok(hrefs('שמע ישראל').includes('#/lib/torah/Deuteronomy/6?s=6%3A4'));
  assert.equal(hrefs('יסוד היסודות')[0], '#/lib/rambam/Foundations_of_the_Torah/1?s=Foundations_of_the_Torah.1.1');
  assert.ok(search('אתערותא דלתתא').some(h => h.shard === 'tanya'));
  assert.ok(hrefs('מזמור לדוד יהוה רעי').includes('#/lib/tehillim/23?s=23%3A1'));
  assert.ok(search('נטילת ידים').some(h => h.shard === 'siddur' || h.shard.startsWith('rambam')));
  assert.equal(S.compileQuery('modeh'), null); assert.equal(S.compileQuery('א'), null);   // nothing to search for
});

test('search: geresh/gershayim and simple ktiv male/chaser do not matter', () => {
  const n = q => search(q).length;
  assert.equal(n('רמב"ם'), n('רמב״ם')); assert.equal(n('רמב"ם'), n('רמבם'));
  const male = new Set(hrefs('מצוות')), chaser = new Set(hrefs('מצות'));
  assert.ok(male.size > 100); assert.deepEqual([...male].sort(), [...chaser].sort());
  assert.deepEqual(hrefs('שולחן ערוך').sort(), hrefs('שלחן ערוך').sort());
  // final letters: a word typed with a regular letter at the end (as on some keyboards) still matches
  assert.equal(n('שלום'), n('שלומ'));
});

test('the divine name: written in full in the index; ה׳ in a query also finds it', () => {
  for (const s of meta.shards) {
    const t = JSON.parse(fs.readFileSync(DIR + s.id + '.json', 'utf8')).t;
    const abbr = t.match(/(^|[^`a-z])(?:[aeklny]|e[akln])?ii(?=[^`a-z]|$)/gm)?.map(S.decode) || [];
    assert.deepEqual(abbr, [], s.id + ': "יי" left in the index');
  }
  const h = search('יהוה אחד');
  assert.ok(h.some(x => x.href === '#/lib/torah/Deuteronomy/6?s=6%3A4'));
  assert.ok(search("ה' אחד").some(x => x.href === '#/lib/torah/Deuteronomy/6?s=6%3A4'));
  assert.ok(!h.some(x => x.snip.join('').includes('יי ')));
});

test('results: one per passage, best first, snippet with the match marked', () => {
  const h = search('בראשית ברא');
  assert.equal(new Set(h.map(x => x.shard + x.id)).size, h.length);
  const top = h[0]; assert.equal(top.snip.length, 3); assert.match(S.decode ? top.snip[1] : '', /בראשית ברא/);
});
