// Round-2 review MUST-FIX: a gloss is anchored to a verse, and a form repeated in the verse must be glossed only on the
// occurrence the Wiktionary citation points at (Deut 20:1 / 8:3 "כי" had the wrong sense on the other copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { norm } from '../site/js/hnorm.js';
import { occurrencesOf } from '../tools/gloss-occ.mjs';
import { serve, launch, CHROME } from './helpers.mjs';
const G = JSON.parse(fs.readFileSync(new URL('../site/data/glossary.json', import.meta.url)));
const toks = s => s.split(/[\s\u05BE]+/).map(norm).filter(Boolean);

test('occurrencesOf: picks the bold copy by its neighbours, handles "..." gaps, ASCII hyphens, several bold copies', () => {
  const v = toks('כִּי־תֵצֵא לַמִּלְחָמָה עַל־אֹיְבֶךָ וְרָאִיתָ סוּס וָרֶכֶב עַם רַב מִמְּךָ לֹא תִירָא מֵהֶם כִּי־יְהֹוָה אֱלֹהֶיךָ עִמָּךְ');
  const ki = norm('כִּי');
  assert.deepEqual(occurrencesOf(v, ki, "'''כִּי'''-תֵצֵא לַמִּלְחָמָה..."), [0]);
  assert.deepEqual(occurrencesOf(v, ki, "...לֹא תִירָא מֵהֶם, '''כִּי'''־יהוה אֱלֹהֶיךָ עִמָּךְ..."), [1]);
  assert.deepEqual(occurrencesOf(v, ki, "'''כִּי'''-תֵצֵא... '''כִּי'''-יהוה"), [0, 1]);
  assert.equal(occurrencesOf(v, ki, "'''כִּי'''"), null); // no context → undecidable → dropped
  assert.deepEqual(occurrencesOf(v, norm('תֵצֵא'), "כִּי '''תֵצֵא'''"), [0]); // unique form
});

test('glossary: Deut 20:1 / 8:3 "כי" never glossed on the uncited copy (round 3: the כי entry is now dropped entirely — Wiktionary flags it {{לשכתוב}})', () => {
  const ki = norm('כִּי');
  for (const ref of ['Deuteronomy 20:1', 'Deuteronomy 8:3']) assert.ok(!(G.verses[ref] || {})[ki], ref);
  assert.ok(!Object.keys(G.verses['Deuteronomy 8:3'] || {}).includes(`${ki}#1`));
  // generic: every occurrence key in the glossary is checked against the verse by glossary.test.mjs
  const occ = Object.values(G.verses).flatMap(ws => Object.keys(ws)).filter(k => k.includes('#'));
  assert.ok(occ.length >= 1);
});

const skip = !CHROME && 'no Chrome';
test('reader DOM: every glossary key marks exactly one word, and the right copy (all verses)', { skip }, async () => {
  const srv = await serve(), browser = await launch();
  const p = await browser.newPage(); await p.goto(srv.url + 'index.html#/about');
  const verses = {};
  for (const ref of Object.keys(G.verses)) {
    const [, book, c, v] = ref.match(/^(\w+) (\d+):(\d+)$/);
    const f = new URL(`../site/data/${book === 'Psalms' ? 'tehillim' : 'torah/' + book}/${c}.json`, import.meta.url);
    verses[ref] = JSON.parse(fs.readFileSync(f)).v[v - 1];
  }
  const bad = await p.evaluate(async verses => {
    const { applyGlosses, loadGlossary } = await import('/js/gloss.js');
    const { norm } = await import('/js/hnorm.js');
    const G = await loadGlossary(); const bad = [];
    const root = document.createElement('div'); document.body.appendChild(root);
    root.innerHTML = Object.entries(verses).map(([ref, t]) => `<span class="seg" data-id="x" data-ref="${ref}"><span class="t">${t
      .replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '<span class="ketiv">($1)</span> <span>$2</span>').replace(/\{([פס])\}/g, '<span class="pe">$1</span>')}</span></span>`).join(' ');
    applyGlosses(root, 'x');
    for (const seg of root.querySelectorAll('.seg')) {
      const keys = Object.keys(G.verses[seg.dataset.ref]), gl = [...seg.querySelectorAll('.gl')];
      if (gl.length !== keys.length) bad.push(`${seg.dataset.ref}: ${gl.length} marked, ${keys.length} keys`);
      // the k-th copy carries the "form#k" gloss
      const words = []; const w = document.createTreeWalker(seg, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.ketiv, .pe') ? 2 : 1 });
      while (w.nextNode()) for (const t of w.currentNode.nodeValue.split(/[\s\u05BE]+/)) if (t) words.push({ t: norm(t), el: w.currentNode.parentElement.closest('.gl') });
      const seen = {};
      for (const x of words) { if (!x.t) continue; seen[x.t] = (seen[x.t] || 0) + 1; const want = G.verses[seg.dataset.ref][x.t] || G.verses[seg.dataset.ref][`${x.t}#${seen[x.t]}`];
        if (!!want !== !!x.el || (want && x.el.dataset.g !== want.g)) bad.push(`${seg.dataset.ref}: ${x.t} #${seen[x.t]}`); }
    }
    return bad;
  }, verses);
  assert.deepEqual(bad, []);
  await browser.close(); srv.close();
});
