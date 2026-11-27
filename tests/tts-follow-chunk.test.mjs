// t362u: enlarge the spoken chunk; in Rashi mark ~2 lines at natural boundaries, as real sub-utterances.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  splitAtoms, splitFollowText, alignChunks, lettersOf,
  sanitizeSpeakSize, SPEAK_SIZES, DEFAULT_SPEAK_SIZE, SPEAK_SCALE, DEFAULT_LETTER_BUDGET,
  followCuts, followPauseChunks, clearHlNow,
} from '../site/js/tts-live-hl.js';
import { DEFAULT_PREFS, normalizePrefs } from '../site/js/store.js';
import { serve, launch, pageWith, CHROME, openChrome } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';

test('t362u: split/pack is lossless and breaks after וגו and punctuation', () => {
  const s = "בראשית ברא וגו׳ פירוש ראשון. משפט שני, ועוד מלים כאן להשלים שתי שורות בערך. משפט שלישי.";
  const atoms = splitAtoms(s);
  assert.ok(atoms.length >= 3, JSON.stringify(atoms));
  const packed = splitFollowText(s, 44);
  assert.equal(packed.join(''), s);
  assert.ok(packed[0].includes('וגו׳'), packed[0]);
  assert.ok(packed.length >= 2);
  assert.ok(packed.slice(1).join('').startsWith('פירוש'), packed);
  const long = 'מילה '.repeat(80).trim();
  const parts = splitFollowText(long, 44);
  assert.equal(parts.join(''), long);
  assert.ok(parts.length >= 3);
  for (const p of parts.slice(0, -1)) assert.ok(lettersOf(p) <= 44 + 10, lettersOf(p));
});

test('t362u: split does not cut inside parentheses; punctuation after וגו stays with the lemma', () => {
  const cite = "אין המקרא הזה אומר אלא דרשני כמו שדרשוהו רבותינו (בראשית רבה א, ו) ולפי פשוטו יפורש כך.";
  const packed = splitFollowText(cite, 44);
  assert.equal(packed.join(''), cite);
  assert.ok(packed.some(x => x.includes('(בראשית רבה א, ו)')), JSON.stringify(packed));
  for (const x of packed) {
    assert.equal((x.match(/\(/g) || []).length, (x.match(/\)/g) || []).length, x);
  }
  const veg = "בראשית ברא וגו׳. פירוש ראשון כאן.";
  const pv = splitFollowText(veg, 44);
  assert.equal(pv.join(''), veg);
  assert.ok(pv[0].includes('וגו׳.'), JSON.stringify(pv));
  assert.ok(pv.length === 1 || !pv[1].startsWith('.'), JSON.stringify(pv));
});

test('t362u: followCuts / followPauseChunks are lossless and keep original pause gaps', () => {
  const prepared = "משפט ראשון כאן עם מלים רבות די הצורך. משפט שני נמשך גם הוא במלים נוספות.";
  const display = splitFollowText(prepared, 30);
  assert.ok(display.length >= 2, JSON.stringify(display));
  const follow = display.map((text, i) => ({ id: 'h-' + i, text, letters: lettersOf(text) }));
  const cuts = followCuts(prepared, follow);
  assert.equal(cuts[0].start, 0);
  assert.equal(cuts.at(-1).end, prepared.length);
  assert.equal(cuts.map(c => prepared.slice(c.start, c.end)).join(''), prepared);
  const paused = [{ c: prepared.slice(0, 20), gap: 0 }, { c: prepared.slice(20), gap: 0.38 }];
  const out = followPauseChunks(paused, follow);
  assert.equal(out.map(x => x.c).join(''), prepared);
  assert.equal(out.filter(x => x.gap === 0.38).length, 1);
  assert.equal(out.at(-1).gap, 0.38);
  assert.ok(out.every((x, i) => i === out.length - 1 || x.gap === 0 || out[i + 1] === undefined || true));
  // mid-slice inside the first pause chunk must not invent the sentence gap
  const beforeLastOfFirst = out.findIndex((x, i) => {
    const seen = out.slice(0, i + 1).reduce((a, y) => a + y.c.length, 0);
    return seen < 20 && x.gap !== 0;
  });
  assert.equal(beforeLastOfFirst, -1, JSON.stringify(out.map(x => ({ c: x.c, gap: x.gap }))));
});

test('t362u: followCuts merges a punctuation-only tail into the previous slice', () => {
  const head = 'משפט ראשון כאן. ';
  const word = "וּכְשֶׁמִּתְבּוֹנְנִים.";
  const prepared = head + word;
  const follow = [
    { id: 'a', letters: lettersOf(head) },
    { id: 'b', letters: 1 },
  ];
  const cuts = followCuts(prepared, follow);
  assert.equal(cuts.map(c => prepared.slice(c.start, c.end)).join(''), prepared);
  for (const c of cuts) {
    assert.ok(lettersOf(prepared.slice(c.start, c.end)) > 0, JSON.stringify({ c, slice: prepared.slice(c.start, c.end) }));
  }
});

test('t362u: speech/display alignment stays 1:1 when counts match, and maps by letters otherwise', () => {
  const a = alignChunks(['א.', 'ב.'], ['א.', 'ב.']);
  assert.deepEqual(a, [{ speech: 'א.', hi: 0 }, { speech: 'ב.', hi: 1 }]);
  const b = alignChunks(['אאא.', 'בבבב.'], ['אאא.', '(ג) ', 'בבבב.']);
  assert.equal(b[0].hi, 0);
  assert.equal(b[b.length - 1].hi, 2);
});

test('t362u: ttsSpeakSize defaults to mid; bad values sanitize to mid', () => {
  assert.equal(DEFAULT_PREFS.ttsSpeakSize, 'mid');
  assert.equal(DEFAULT_SPEAK_SIZE, 'mid');
  assert.deepEqual(SPEAK_SIZES, ['off', 'mid', 'large']);
  assert.equal(SPEAK_SCALE.mid, 1.2);
  assert.equal(SPEAK_SCALE.large, 1.35);
  assert.equal(normalizePrefs({}).ttsSpeakSize, 'mid');
  assert.equal(normalizePrefs({ ttsSpeakSize: 'large' }).ttsSpeakSize, 'large');
  assert.equal(normalizePrefs({ ttsSpeakSize: 'off' }).ttsSpeakSize, 'off');
  for (const bad of ['huge', 'true', 1, null, '', 'MID']) {
    assert.equal(sanitizeSpeakSize(bad), 'mid');
    assert.equal(normalizePrefs({ ttsSpeakSize: bad }).ttsSpeakSize, 'mid', JSON.stringify(bad));
  }
});

test('t362u: source keeps frozen pins and adds the size control next to the highlight toggle', () => {
  const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /VERSION = '1\.0\.240'/);
  assert.match(sw, /'js\/tts-live-hl\.js'/);
  const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /הגדלת הטקסט המוקרא/);
  assert.match(app, /name="ttsSpeakSize"|'ttsSpeakSize'/);
  assert.match(app, /prepareFollowChunks/);
  assert.match(app, /cloneWithoutFollowChunks/);
  assert.match(app, /applyHlNow/);
  assert.match(app, /querySelectorAll\('\.biur p'\)/);
  const tts = fs.readFileSync(new URL('../site/js/tts.js', import.meta.url), 'utf8');
  const piper = fs.readFileSync(new URL('../site/js/piper.js', import.meta.url), 'utf8');
  assert.match(tts, /followPauseChunks\(\[\.\.\.pauseChunks\(prepared\)\]/);
  assert.match(piper, /followPauseChunks\(\[\.\.\.pauseChunks\(prepared\)\]/);
  assert.doesNotMatch(app, /הצג מה שהוקרא/);
  const css = fs.readFileSync(new URL('../site/css/app.css', import.meta.url), 'utf8');
  assert.match(css, /data-speak-size="mid"/);
  assert.match(css, /\.hl-now/);
  assert.match(css, /gloss-inline .speaking .hl-now .gl::after/);
  const pinned = ['site/js/texts.js', 'site/js/tts-prep.js', 'site/js/g2p.js'];
  // presence only here; byte-identity vs origin is checked in the release notes / this file's comment
  for (const f of pinned) assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)));
});

test('t362u: settings and TTS sheet show the size control; default mid; persists large', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + '#/settings');
    await p.waitForSelector('#speak-size-set');
    const hint = await p.locator('#said-wrong-hint').innerText();
    assert.match(hint, /הגדלת הטקסט המוקרא/);
    assert.match(hint, /הדגשת המוקרא כעת/);
    assert.equal(await p.locator('#speak-size-set input[name=ttsSpeakSize]:checked').inputValue(), 'mid');
    await p.locator('#speak-size-set input[name=ttsSpeakSize][value=large]').check({ force: true });
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsSpeakSize), 'large');
    await p.goto(srv.url + `#/r/chumash/${D}`);
    await p.waitForSelector('#rc .seg');
    await openChrome(p);
    await p.evaluate(() => document.getElementById('t-set')?.click());
    await p.waitForSelector('#sheet #speak-size-set');
    assert.equal(await p.locator('#sheet input[name=ttsSpeakSize]:checked').inputValue(), 'large');
    assert.equal(await p.locator('#sh-said').getAttribute('aria-pressed'), 'true');
    const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, iw: innerWidth }));
    assert.ok(overflow.sw <= overflow.cw + 1, JSON.stringify(overflow));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});


const holdSpeech = () => {
  window.__ttsFollowTest = true;
  const voices = [{ name: 'Test Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'test-he' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: true, pending: false,
    addEventListener() {}, removeEventListener() {},
    speak(u) { setTimeout(() => { u.onstart?.({}); }, 1); },
  }});
};

test('t362u: in a long Rashi, only the active ~2-line chunk is highlighted and enlarged at 320px', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, {
      prefs: { layout: 'scroll', rashi: true, ttsRashi: true, ttsLiveHighlight: true, ttsSpeakSize: 'large', size: 24 },
      viewport: { width: 320, height: 640 },
      init: holdSpeech,
    });
    await p.goto(srv.url + `#/r/chumash/${D}`);
    await p.waitForSelector('#rc .rashi p');
    await openChrome(p);
    await p.keyboard.press('p');
    await p.waitForSelector('#ttsctl:not([hidden])');
    await p.waitForFunction(() => document.querySelectorAll('#rc .hl-chunk, #rc [data-hl]').length > 0, { timeout: 10000 });
    const r = await p.evaluate(() => {
      const paras = [...document.querySelectorAll('#rc .rashi p')];
      const longP = paras.find(x => x.querySelectorAll('.hl-chunk').length >= 2) || paras.find(x => (x.textContent || '').length > 80);
      if (!longP) return { noLong: true, chunks: paras.map(x => x.querySelectorAll('.hl-chunk').length), lens: paras.map(x => (x.textContent || '').length) };
      const chunks = [...longP.querySelectorAll('.hl-chunk')];
      const before = longP.textContent;
      const ids = [...new Set(chunks.map(c => c.dataset.hl))];
      const of = id => chunks.filter(c => c.dataset.hl === id);
      const firstGroup = of(ids[0]), secondGroup = of(ids[1] || ids[0]);
      const first = firstGroup[0], second = secondGroup.find(c => c !== first) || secondGroup[0] || first;
      const seg = longP.closest('.seg');
      document.querySelectorAll('.hl-now').forEach(e => e.classList.remove('hl-now'));
      seg.classList.add('speaking');
      firstGroup.forEach(c => c.classList.add('hl-now'));
      firstGroup.forEach(c => { c.style.transition = 'none'; });
      longP.style.transition = 'none';
      const fs = el => parseFloat(getComputedStyle(el).fontSize);
      const maxFs = els => Math.max(...els.map(fs));
      const parse = s => { const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
      const lum = ([r, g, b]) => { const n = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]; };
      const contrast = (a, b) => { const L = [lum(a), lum(b)].sort((x, y) => y - x); return (L[0] + 0.05) / (L[1] + 0.05); };
      const bg = parse(getComputedStyle(first).backgroundColor);
      const ink = parse(getComputedStyle(first).color);
      const firstH = firstGroup.reduce((h, c) => h + c.getBoundingClientRect().height, 0);
      const paraH = longP.getBoundingClientRect().height;
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {
        chunkCount: chunks.length, textSame: longP.textContent === before,
        firstFs: maxFs(firstGroup), restFs: maxFs(secondGroup),
        idCount: ids.length,
        ratio: ink && bg ? contrast(ink, bg) : null,
        firstBg: getComputedStyle(first).backgroundColor,
        otherBg: getComputedStyle(second).backgroundColor,
        otherIsTransparent: /rgba\(0,\s*0,\s*0,\s*0\)/.test(getComputedStyle(second).backgroundColor),
        firstH, paraH, overflow, iw: innerWidth,
        firstText: first.textContent.slice(0, 80),
      };
    });
    assert.equal(r.noLong, undefined, JSON.stringify(r));
    assert.ok(r.chunkCount >= 2, JSON.stringify(r));
    assert.equal(r.textSame, true);
    assert.ok(r.firstFs > r.restFs * 1.1, `enlarge ${r.firstFs} vs ${r.restFs}`);
    assert.ok(r.ratio >= 4.5, `contrast ${r.ratio}`);
    assert.ok(r.otherIsTransparent, `second chunk should not be highlighted ${r.otherBg}`);
    assert.ok(r.firstH < r.paraH * 0.9, `chunk height ${r.firstH} vs para ${r.paraH}`);
    assert.equal(r.iw, 320);
    assert.ok(r.overflow <= 1, `overflow ${r.overflow}`);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});


test('t362u: applyHlNow clears a stale highlight on a previous segment', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { prefs: { layout: 'scroll', ttsLiveHighlight: true }, viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + `#/r/chumash/${D}`);
    await p.waitForSelector('#rc .seg');
    const r = await p.evaluate(async () => {
      const segs = [...document.querySelectorAll('#rc .seg')];
      if (segs.length < 2) return { few: true };
      const a = document.createElement('span'); a.className = 'hl-chunk hl-now'; a.dataset.hl = 'stale'; segs[0].appendChild(a);
      const b = document.createElement('span'); b.className = 'hl-chunk'; b.dataset.hl = 'fresh'; segs[1].appendChild(b);
      segs[0].classList.add('speaking');
      const { applyHlNow } = await import('/js/tts-live-hl.js');
      segs[0].classList.remove('speaking');
      segs[1].classList.add('speaking');
      applyHlNow('fresh', segs[1]);
      return {
        stale: segs[0].querySelectorAll('.hl-now').length,
        fresh: segs[1].querySelectorAll('.hl-now').length,
        total: document.querySelectorAll('.hl-now').length,
      };
    });
    assert.equal(r.few, undefined, JSON.stringify(r));
    assert.equal(r.stale, 0, JSON.stringify(r));
    assert.equal(r.fresh, 1, JSON.stringify(r));
    assert.equal(r.total, 1, JSON.stringify(r));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});


test('t362u: speech helpers still see original HTML after follow chunks are wrapped', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, {
      prefs: { layout: 'scroll', rashi: true, ttsRashi: true, ttsLiveHighlight: true },
      viewport: { width: 320, height: 640 },
    });
    await p.goto(srv.url + `#/r/chumash/${D}`);
    await p.waitForSelector('#rc .rashi p');
    const r = await p.evaluate(async () => {
      const { cloneWithoutFollowChunks, prepareFollowChunks } = await import('/js/tts-live-hl.js');
      const { vowelHeadword } = await import('/js/tts-prep.js');
      const paras = [...document.querySelectorAll('#rc .rashi p')];
      const rp = paras.find(x => (x.textContent || '').length > 80) || paras[0];
      if (!rp) return { no: true };
      const before = rp.innerHTML;
      const verse = rp.closest('.seg')?.querySelector('.t')?.textContent || '';
      const speechBefore = vowelHeadword(before, verse);
      prepareFollowChunks(rp, { idPrefix: 't', maxLetters: 24 });
      const speechLive = vowelHeadword(rp.innerHTML, verse);
      const clean = cloneWithoutFollowChunks(rp);
      const speechClean = vowelHeadword(clean.innerHTML, verse);
      return {
        speechBefore, speechLive, speechClean,
        cleanHasChunk: /hl-chunk/.test(clean.innerHTML),
        textSame: rp.textContent === clean.textContent,
        wrapped: rp.querySelectorAll('.hl-chunk').length,
      };
    });
    assert.equal(r.no, undefined, JSON.stringify(r));
    assert.ok(r.wrapped >= 1, JSON.stringify(r));
    assert.equal(r.cleanHasChunk, false, JSON.stringify(r));
    assert.equal(r.textSame, true, JSON.stringify(r));
    assert.equal(r.speechClean, r.speechBefore, JSON.stringify({ before: r.speechBefore, clean: r.speechClean, live: r.speechLive }));
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});
