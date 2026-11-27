// t361u: live highlight of the current spoken segment — not a past/future list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shouldFollow, nextPauseUntil, FOLLOW_PAUSE_MS } from '../site/js/tts-live-hl.js';
import { DEFAULT_PREFS, normalizePrefs } from '../site/js/store.js';
import { serve, launch, pageWith, CHROME, openChrome } from './helpers.mjs';

const skip = !CHROME && 'no Chrome';
const D = '2026-11-02';

test('t361u: follow only when the toggle is on and the pause window has ended', () => {
  const now = 1_000_000;
  assert.equal(shouldFollow({ enabled: true, now, pausedUntil: 0 }), true);
  assert.equal(shouldFollow({ enabled: false, now, pausedUntil: 0 }), false);
  assert.equal(shouldFollow({ enabled: true, now, pausedUntil: now + 1000 }), false);
  assert.equal(shouldFollow({ enabled: true, now, pausedUntil: now }), true);
  assert.equal(shouldFollow({ enabled: true, now, pausedUntil: now - 1 }), true);
  assert.equal(nextPauseUntil(now) - now, FOLLOW_PAUSE_MS);
  assert.equal(FOLLOW_PAUSE_MS >= 3000 && FOLLOW_PAUSE_MS <= 8000, true);
});

test('t361u: ttsLiveHighlight defaults to on; non-booleans sanitize to true', () => {
  assert.equal(DEFAULT_PREFS.ttsLiveHighlight, true);
  assert.equal(normalizePrefs({}).ttsLiveHighlight, true);
  assert.equal(normalizePrefs({ ttsLiveHighlight: false }).ttsLiveHighlight, false);
  assert.equal(normalizePrefs({ ttsLiveHighlight: true }).ttsLiveHighlight, true);
  for (const bad of ['true', 'yes', 1, 0, null, {}, []]) {
    assert.equal(normalizePrefs({ ttsLiveHighlight: bad }).ttsLiveHighlight, true, JSON.stringify(bad));
  }
});

test('t361u: SW precaches tts-live-hl.js; g2p/texts/tts-prep pins are not in this change', () => {
  const sw = fs.readFileSync(new URL('../site/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'js\/tts-live-hl\.js'/);
  const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /הדגשת המוקרא כעת/);
  assert.doesNotMatch(app, /הצג מה שהוקרא/);
  assert.doesNotMatch(app, /function showSaidView/);
  assert.doesNotMatch(app, /id="said-view"/);
  assert.match(app, /id="sh-wrong"/);
  const css = fs.readFileSync(new URL('../site/css/app.css', import.meta.url), 'utf8');
  assert.match(css, /#reader\.live-hl \.r-content \.speaking/);
  assert.match(css, /--speak-bg:/);
  assert.match(css, /--speak-ring:/);
  assert.match(css, /#reader\.live-hl[\s\S]*\.sid-in[\s\S]*\.sid-mark/);
});

test('t361u: Settings hint names the new toggle, not the old list', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + '#/settings');
    await p.waitForSelector('#set-tts');
    const hint = await p.locator('#said-wrong-hint').innerText();
    assert.match(hint, /הדגשת המוקרא כעת/);
    assert.doesNotMatch(hint, /הצג מה שהוקרא/);
    assert.match(hint, /לא נשמע נכון/);
    assert.equal(await p.locator('#sh-said, #sh-wrong, #sh-wrong-list').count(), 0);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('t361u: toggle at the top of the TTS sheet, default on, no said list, persists off', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, { viewport: { width: 320, height: 568 } });
    await p.goto(srv.url + `#/r/rambam3/${D}`);
    await p.waitForSelector('#rc .seg');
    await openChrome(p);
    const live = await p.evaluate(() => document.getElementById('reader')?.classList.contains('live-hl'));
    assert.equal(live, true);
    await p.evaluate(() => document.getElementById('t-set')?.click());
    await p.waitForSelector('#sheet #sh-said');
    const m = await p.evaluate(() => {
      const said = document.querySelector('#sh-said');
      const wrong = document.querySelector('#sh-wrong');
      const list = document.querySelector('#sh-wrong-list');
      const voice = document.querySelector('#tts-voice-h');
      const play = document.querySelector('#sh-play');
      const sr = said.getBoundingClientRect();
      return {
        labels: [said.textContent, wrong.textContent, list.textContent],
        pressed: said.getAttribute('aria-pressed'),
        saidView: !!document.querySelector('#said-view'),
        aboveVoice: sr.bottom <= voice.getBoundingClientRect().top + 1,
        belowPlay: sr.top >= play.getBoundingClientRect().bottom - 1,
      };
    });
    assert.deepEqual(m.labels, ['הדגשת המוקרא כעת', 'לא נשמע נכון', 'דיווחים שמורים']);
    assert.equal(m.pressed, 'true');
    assert.equal(m.saidView, false);
    assert.equal(m.aboveVoice, true);
    assert.equal(m.belowPlay, true);
    await p.click('#sh-said');
    assert.equal(await p.locator('#sh-said').getAttribute('aria-pressed'), 'false');
    assert.equal(await p.evaluate(() => document.getElementById('reader')?.classList.contains('live-hl')), false);
    await p.click('#sh-x');
    await p.evaluate(() => document.getElementById('t-set')?.click());
    await p.waitForSelector('#sheet #sh-said');
    assert.equal(await p.locator('#sh-said').getAttribute('aria-pressed'), 'false');
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('chitas-reader.v1')).prefs.ttsLiveHighlight);
    assert.equal(stored, false);
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('t361u: live highlight is a high-contrast background plus outline in light and dark themes', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url);
    await p.goto(srv.url + `#/r/rambam3/${D}`);
    await p.waitForSelector('#rc .seg');
    const measure = async theme => p.evaluate(th => {
      document.documentElement.dataset.theme = th;
      const seg = document.querySelector('#rc .seg');
      // .seg transitions background in 0.2s; disable so the used colour is readable immediately
      seg.style.transition = 'none';
      document.getElementById('reader').classList.add('live-hl');
      seg.classList.add('speaking');
      const cs = getComputedStyle(seg);
      const bg = cs.backgroundColor, ol = cs.outlineColor, olw = cs.outlineWidth;
      const off = { live: { bg, ol, olw, color: cs.color } };
      document.getElementById('reader').classList.remove('live-hl');
      const cs2 = getComputedStyle(seg);
      off.plain = { bg: cs2.backgroundColor, ol: cs2.outlineColor };
      seg.classList.remove('speaking');
      seg.style.transition = '';
      return off;
    }, theme);
    const paper = await measure('paper');
    const dark = await measure('dark');
    assert.notEqual(paper.live.bg, paper.plain.bg, 'paper live bg must differ from the faint default');
    assert.notEqual(dark.live.bg, dark.plain.bg, 'dark live bg must differ from the faint default');
    assert.notEqual(paper.live.bg, 'rgba(0, 0, 0, 0)');
    assert.notEqual(dark.live.bg, 'rgba(0, 0, 0, 0)');
    assert.ok(parseFloat(paper.live.olw) >= 2, 'paper outline width');
    assert.notEqual(paper.live.bg, dark.live.bg, 'light and dark use different highlight colours');
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('t361u r2: source pauses follow on pointercancel, ArrowUp/Down, and openReader reset', () => {
  const app = fs.readFileSync(new URL('../site/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /pointercancel.*clearUserPtr|addEventListener\('pointercancel', clearUserPtr/);
  assert.match(app, /ArrowUp.*ArrowDown.*scroll|ArrowDown'\) && prefs\.layout === 'scroll'/);
  assert.match(app, /R\.followPausedUntil = 0; R\.userPtr = false; R\.progScroll = 0;/);
  assert.match(app, /clearTimeout\(userPtrT\)/);

  const css = fs.readFileSync(new URL('../site/css/app.css', import.meta.url), 'utf8');
  assert.match(css, /:root\[data-design="nocturne"\][\s\S]{0,400}--speak-bg:/);
  assert.match(css, /#reader\.live-hl[\s\S]*\.speaking[\s\S]*:is\(/);
});


const contrastOf = () => {
  const parse = s => { const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
  const lum = ([r, g, b]) => {
    const n = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  };
  const contrast = (a, b) => { const L = [lum(a), lum(b)].sort((x, y) => y - x); return (L[0] + 0.05) / (L[1] + 0.05); };
  return { parse, contrast };
};


test('t361u r3: chumash child text stays readable on the highlight (nocturne, modern paper, sefer dark)', { skip }, async () => {
  const srv = await serve(), b = await launch();
  const cases = [
    { prefs: { design: 'nocturne' }, design: 'nocturne', theme: '', need: ['.t', '.vn', '.rashi', '.rashi .lbl'] },
    { prefs: { design: 'modern', theme: 'paper' }, design: 'modern', theme: 'paper', need: ['.t', '.vn', '.rashi', '.rashi .lbl'] },
    { prefs: { design: 'sefer', theme: 'dark' }, design: 'sefer', theme: 'dark', need: ['.t', '.vn', '.rashi', '.rashi .lbl'] },
  ];
  try {
    for (const c of cases) {
      const p = await pageWith(b, srv.url, { prefs: c.prefs });
      await p.goto(srv.url + `#/r/chumash/${D}`);
      await p.waitForSelector('#rc .seg');
      const m = await p.evaluate(({ design, theme, need }) => {
        if (design) document.documentElement.dataset.design = design;
        if (theme) document.documentElement.dataset.theme = theme;
        const reader = document.getElementById('reader');
        const segs = [...document.querySelectorAll('#rc .seg')];
        const seg = segs.find(s => need.every(sel => s.querySelector(sel))) || segs[0];
        seg.style.transition = 'none';
        reader.classList.add('live-hl');
        seg.classList.add('speaking');
        const parse = s => { const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
        const lum = ([r, g, b]) => {
          const n = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
        };
        const contrast = (a, b) => { const L = [lum(a), lum(b)].sort((x, y) => y - x); return (L[0] + 0.05) / (L[1] + 0.05); };
        const kids = {};
        const missing = [];
        for (const sel of need) {
          const el = seg.querySelector(sel);
          if (!el) { missing.push(sel); continue; }
          const cs = getComputedStyle(el);
          const c = parse(cs.color);
          // contrast against the element's own background if opaque, else the speaking segment
          const own = parse(cs.backgroundColor);
          const bgEl = (own && !(own[0] === 0 && own[1] === 0 && own[2] === 0 && /rgba\(0,\s*0,\s*0,\s*0\)/.test(cs.backgroundColor))) ? own : parse(getComputedStyle(seg).backgroundColor);
          kids[sel] = { color: cs.color, bg: cs.backgroundColor, ratio: c && bgEl ? contrast(c, bgEl) : null };
        }
        return { missing, kids, speakBg: getComputedStyle(document.documentElement).getPropertyValue('--speak-bg').trim(), segBg: getComputedStyle(seg).backgroundColor, design: document.documentElement.dataset.design, theme: document.documentElement.dataset.theme || '' };
      }, { design: c.design, theme: c.theme, need: c.need });
      assert.equal(m.missing.length, 0, `${c.design}: missing ${m.missing.join(', ')}`);
      for (const [sel, info] of Object.entries(m.kids)) {
        assert.ok(info.ratio && info.ratio >= 4.5, `${c.design} ${sel} contrast ${info.ratio} color=${info.color} bg=${info.bg} (seg ${m.segBg})`);
      }
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});


const holdSpeech = () => {
  window.__ttsFollowTest = true;
  const voices = [{ name: 'Test Hebrew', lang: 'he-IL', default: true, localService: true, voiceURI: 'test-he' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel() {}, pause() {}, resume() {}, speaking: true, pending: false,
    addEventListener() {}, removeEventListener() {},
    // stay in the current segment so follow pause can be observed
    speak(u) { setTimeout(() => { u.onstart?.({}); }, 1); },
  }});
};

test('t361u r2: wheel and Home pause auto-follow while speech is running', { skip }, async () => {
  const srv = await serve(), b = await launch();
  try {
    const p = await pageWith(b, srv.url, {
      prefs: { layout: 'scroll', ttsContinuous: false },
      viewport: { width: 390, height: 700 },
      init: holdSpeech,
    });
    await p.goto(srv.url + `#/r/rambam3/${D}`);
    await p.waitForSelector('#rc .seg');
    await openChrome(p);
    await p.keyboard.press('p');
    await p.waitForSelector('#ttsctl:not([hidden])');
    await p.waitForFunction(() => document.querySelector('#rc .seg.speaking'));
    await p.evaluate(() => { window.__ttsFollowTest = true; window.__followPausedUntil = 0; });
    await p.evaluate(() => {
      document.getElementById('vp').dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 }));
    });
    const afterWheel = await p.evaluate(() => window.__followPausedUntil || 0);
    assert.ok(afterWheel > Date.now() - 500, `wheel should pause follow, got ${afterWheel}`);
    await p.evaluate(() => { window.__followPausedUntil = 0; });
    await p.keyboard.press('Home');
    const afterHome = await p.evaluate(() => window.__followPausedUntil || 0);
    assert.ok(afterHome > Date.now() - 500, `Home should pause follow, got ${afterHome}`);
    const during = await p.evaluate(() => window.__shouldFollowNow ? window.__shouldFollowNow() : null);
    assert.equal(during, false, 'follow must be paused immediately after Home');
    await p.waitForFunction(() => window.__shouldFollowNow && window.__shouldFollowNow() === true, { timeout: 6000 });
    assert.deepEqual(p.errors, []);
  } finally { await b.close(); srv.close(); }
});

test('t361u r4: siddur .sid-in and .sid-mark stay readable on the highlight', { skip }, async () => {
  const srv = await serve(), b = await launch();
  const cases = [
    { prefs: { theme: 'dark', design: 'classic' }, design: 'classic', theme: 'dark', route: '#/s/shacharit/3', need: ['.sid-in'] },
    { prefs: { theme: 'night', design: 'classic' }, design: 'classic', theme: 'night', route: '#/s/boker/5', need: ['.sid-mark'] },
    { prefs: { theme: 'dark', design: 'sefer' }, design: 'sefer', theme: 'dark', route: '#/s/shacharit/3', need: ['.sid-in'] },
    { prefs: { design: 'nocturne' }, design: 'nocturne', theme: '', route: '#/s/boker/5', need: ['.sid-mark'] },
  ];
  try {
    for (const c of cases) {
      const p = await pageWith(b, srv.url, { prefs: { layout: 'scroll', siddurLang: 'both', ...c.prefs } });
      await p.goto(srv.url + c.route);
      await p.waitForSelector('#rc .seg');
      const m = await p.evaluate(({ design, theme, need }) => {
        if (design) document.documentElement.dataset.design = design;
        if (theme) document.documentElement.dataset.theme = theme;
        const reader = document.getElementById('reader');
        const segs = [...document.querySelectorAll('#rc .seg')];
        const seg = segs.find(s => need.every(sel => s.querySelector(sel)));
        if (!seg) return { missing: need, kids: {}, found: false };
        seg.style.transition = 'none';
        reader.classList.add('live-hl');
        seg.classList.add('speaking');
        const parse = s => { const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
        const lum = ([r, g, b]) => {
          const n = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
        };
        const contrast = (a, b) => { const L = [lum(a), lum(b)].sort((x, y) => y - x); return (L[0] + 0.05) / (L[1] + 0.05); };
        const kids = {};
        const missing = [];
        for (const sel of need) {
          const el = seg.querySelector(sel);
          if (!el) { missing.push(sel); continue; }
          const cs = getComputedStyle(el);
          const c = parse(cs.color);
          const own = parse(cs.backgroundColor);
          const bgEl = (own && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(cs.backgroundColor)) ? own : parse(getComputedStyle(seg).backgroundColor);
          kids[sel] = { color: cs.color, bg: getComputedStyle(seg).backgroundColor, ratio: c && bgEl ? contrast(c, bgEl) : null };
        }
        return { missing, kids, found: true, design: document.documentElement.dataset.design, theme: document.documentElement.dataset.theme || '' };
      }, { design: c.design, theme: c.theme, need: c.need });
      assert.equal(m.found, true, `${c.design}/${c.theme} ${c.route}: no segment with ${c.need.join(',')}`);
      assert.equal(m.missing.length, 0, `${c.design}: missing ${m.missing.join(', ')}`);
      for (const [sel, info] of Object.entries(m.kids)) {
        assert.ok(info.ratio && info.ratio >= 4.5, `${c.design} ${c.theme} ${sel} contrast ${info.ratio} color=${info.color} bg=${info.bg}`);
      }
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  } finally { await b.close(); srv.close(); }
});

