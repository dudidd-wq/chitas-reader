import { CHOL } from './chol.js';
import { dayPlan, isoDate, toHDate, HDate, Locale } from './calendar.js';
import { buildDoc, describe, filesFor, UNITS, data } from './texts.js';
import { prefs, setPref, TTS_RATES, snapRate, getProgress, setProgress, clearProgress, exportBackup, importBackup, resetAll, DEFAULT_PREFS } from './store.js';
import { Speaker, ttsSupported, hebrewVoices, onVoices, waitForVoices } from './tts.js';
import { RE_TAAMIM } from './tts-prep.js';
import { applyGlosses, loadGlossary } from './gloss.js';
import { pageGeometry } from './layout.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  aa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 19l5-14 5 14M5 14h6M15 19l3.5-9 3.5 9M16 16h5"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
  rew: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function applyPrefs() {
  const r = document.documentElement;
  r.dataset.theme = prefs.theme; r.dataset.font = prefs.font;
  r.style.setProperty('--size', prefs.size + 'px'); r.style.setProperty('--lh', prefs.lineHeight);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(r).getPropertyValue('--paper').trim() || '#f6f1e3';
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
const todayIso = () => isoDate(new HDate(new Date()));
const unitsFor = () => ['chumash', 'tehillim', 'tanya', ...(prefs.rambamTrack === '1' ? ['rambam1'] : prefs.rambamTrack === '3' ? ['rambam3'] : ['rambam3', 'rambam1'])];
const gregHe = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }); };
const shiftIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDate(new HDate(new Date(y, m - 1, d + n))); };

// ---------------- Router ----------------
let currentDate = todayIso();
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, a, b] = h.split('/');
  if (view !== 'r') closeReader();
  autoPrefetch();
  if (view === 'r' && UNITS[a]) { openReader(a, /^\d{4}-\d\d-\d\d$/.test(b) ? b : currentDate); return; }
  if (view === 'settings') return renderSettings();
  if (view === 'sources') return renderSources();
  if (view === 'about') return renderAbout();
  if (view === 'd' && /^\d{4}-\d\d-\d\d$/.test(a)) currentDate = a;
  renderHome();
}
window.addEventListener('hashchange', route);

// ---------------- Home ----------------
const UNIT_MARK = { chumash: 'ח', tehillim: 'ת', tanya: 'ת', rambam3: 'ר', rambam1: 'ר' };
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const guessIsrael = () => { try { return /^Asia\/(Jerusalem|Tel_Aviv)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return true; } };
const locLabel = il => il ? 'ארץ ישראל' : 'חוץ לארץ';
function locationPanel(first) {
  const guess = first ? guessIsrael() : prefs.il;
  return `<section class="locq" id="locq" aria-labelledby="locq-h">
    <h2 id="locq-h">${first ? 'ברוכים הבאים! היכן אתם לומדים?' : 'בחירת לוח'}</h2>
    <p>פרשת השבוע – ולכן שיעור החומש – שונה לעיתים בין ארץ ישראל לחוץ לארץ (כשיום טוב שני של גלויות חל בשבת). ${first ? 'אפשר לשנות זאת בכל עת בהגדרות.' : ''}</p>
    <div class="locq-btns">
      <button class="btn ${guess ? 'primary' : ''}" data-il="true">${PIN}ארץ ישראל</button>
      <button class="btn ${guess ? '' : 'primary'}" data-il="false">${PIN}חוץ לארץ</button>
    </div></section>`;
}
async function renderHome(showLoc = false) {
  const plan = dayPlan(currentDate, { il: prefs.il });
  const isToday = currentDate === todayIso();
  const first = !prefs.locationChosen;
  const units = unitsFor();
  const v = $('#view');
  v.innerHTML = `<div class="wrap home">
    <header class="hero">
      <p class="kicker">${esc(plan.dayHe)}${isToday ? ' · <b>היום</b>' : ''}</p>
      <h1 class="hd">${esc(plan.hebDate)}</h1>
      <p class="sub">${esc(gregHe(currentDate))} · פרשת ${esc(plan.weekParsha)}</p>
      <button class="chip" id="loc" aria-expanded="${first || showLoc}" aria-controls="locq">${PIN}<span>לוח ${locLabel(prefs.il)}</span><span class="sr"> – שינוי</span></button>
    </header>
    ${first || showLoc ? locationPanel(first) : ''}
    <nav class="datebar" aria-label="בחירת תאריך">
      <a class="btn" href="#/d/${shiftIso(currentDate, -1)}" aria-label="היום הקודם">${ICON.prev}<span>הקודם</span></a>
      <label class="sr" for="datepick">תאריך</label>
      <input type="date" id="datepick" value="${currentDate}">
      <a class="btn" href="#/d/${shiftIso(currentDate, 1)}" aria-label="היום הבא"><span>הבא</span>${ICON.next}</a>
      ${isToday ? '' : `<a class="btn today" href="#/d/${todayIso()}">חזרה להיום</a>`}
    </nav>
    <section aria-labelledby="day-h">
      <div class="dayhead"><h2 id="day-h">שיעורי היום</h2><span id="daysum" class="daysum"></span></div>
      <ol class="cards">${units.map(u => `
      <li class="card" id="card-${u}" data-unit="${u}">
        <a class="card-link" href="#/r/${u}/${currentDate}" data-go="${u}">
          <span class="mark" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="16"/><circle class="ring" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="0 100"/></svg><span class="glyph">${UNIT_MARK[u]}</span><span class="tick">${CHECK}</span></span>
          <span class="body"><span class="ttl">${esc(UNITS[u].he)}</span><span class="what" data-what="${u}">…</span><span class="meta" data-meta="${u}"></span></span>
          <span class="go" data-btn>פתח</span>
        </a>
      </li>`).join('')}
      </ol>
    </section>
    <footer class="home-foot">
      <button class="btn" id="dl30">שמירה לשימוש ללא רשת (30 יום)</button>
      <nav class="links" aria-label="קישורים">
        <a href="#/settings">הגדרות</a><a href="#/sources">מקורות ורישיונות</a><a href="#/about">אודות ומגבלות</a>
      </nav>
      <p class="note">הנתונים נשמרים במכשיר בלבד · ללא מעקב</p>
    </footer>
  </div>`;
  $('#datepick').addEventListener('change', e => { if (e.target.value) location.hash = '#/d/' + e.target.value; });
  $('#dl30').addEventListener('click', downloadAhead);
  $('#loc').addEventListener('click', () => { renderHome(!showLoc && !first); if (!showLoc && !first) $('#locq [data-il]')?.focus(); });
  v.querySelectorAll('#locq [data-il]').forEach(b => b.addEventListener('click', () => {
    setPref('il', b.dataset.il === 'true'); setPref('locationChosen', true);
    renderHome(); toast(`הלוח מוצג לפי ${locLabel(prefs.il)}`); $('#loc')?.focus();
  }));
  let done = 0;
  for (const u of units) {
    const p = getProgress(currentDate, u);
    const card = $('#card-' + u), btn = card.querySelector('[data-btn]'), meta = card.querySelector('[data-meta]');
    const frac = p ? (p.done ? 1 : p.frac || 0) : 0;
    card.querySelector('.ring').setAttribute('stroke-dasharray', `${Math.round(frac * 100)} 100`);
    if (p?.done) { done++; card.classList.add('done'); meta.textContent = 'נלמד'; btn.textContent = 'קרא שוב'; }
    else if (p && p.frac > 0.01) { card.classList.add('started'); meta.textContent = `נקרא ${Math.round(p.frac * 100)}%`; btn.textContent = 'המשך'; }
    describe(plan, u).then(t => { card.querySelector('[data-what]').textContent = t; })
      .catch(() => { card.querySelector('[data-what]').textContent = 'שגיאה בטעינה – בדקו חיבור'; });
  }
  $('#daysum').textContent = done === units.length ? 'כל השיעורים נלמדו · יישר כח!' : `${done} מתוך ${units.length} נלמדו`;
}

// Quietly keep today + the next two days available offline (the service worker caches every data file fetched).
let prefetched = '';
function autoPrefetch() {
  if (prefetched === currentDate || !('serviceWorker' in navigator)) return; prefetched = currentDate;
  setTimeout(async () => {
    for (let i = 0; i < 3; i++) { const plan = dayPlan(shiftIso(currentDate, i), { il: prefs.il }); for (const u of unitsFor()) for (const f of await filesFor(plan, u).catch(() => [])) await fetch('data/' + f).catch(() => {}); }
  }, 2500);
}
async function downloadAhead() {
  const btn = $('#dl30'); btn.disabled = true;
  try {
    const files = new Set(['tanya/index.json', 'rambam/index.json', 'glossary.json', 'sources.json']);
    for (let i = 0; i < 30; i++) {
      const plan = dayPlan(shiftIso(currentDate, i), { il: prefs.il });
      for (const u of unitsFor()) (await filesFor(plan, u)).forEach(f => files.add(f));
    }
    let n = 0;
    for (const f of files) { await fetch('data/' + f).catch(() => {}); n++; if (n % 10 === 0) btn.textContent = `מוריד… ${Math.round(100 * n / files.size)}%`; }
    btn.textContent = '✓ נשמר ל-30 יום'; toast('הטקסטים ל-30 הימים הקרובים נשמרו במכשיר');
  } catch { btn.textContent = 'שגיאה בהורדה'; btn.disabled = false; }
}

// ---------------- Generic pages ----------------
function shell(title, body) {
  $('#view').innerHTML = `<div class="wrap"><nav class="topnav"><a class="btn" href="#/d/${currentDate}" aria-label="ראשי – חזרה לדף הבית">${ICON.back}<span>ראשי</span></a></nav>
    <section class="page"><h1>${title}</h1>${body}</section></div>`;
  $('#view').focus();
}
const radio = (name, value, opts) => `<div class="seg-ctl" role="radiogroup">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${String(value) === String(v) ? 'checked' : ''}>${l}</label>`).join('')}</div>`;
const check = (name, value, label) => `<label class="check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${label}</label>`;

function displayForm() {
  return `
  <fieldset><legend>ערכת צבע</legend>${radio('theme', prefs.theme, [['paper', 'נייר'], ['sepia', 'ספיה'], ['dark', 'כהה'], ['night', 'לילה']])}</fieldset>
  <fieldset><legend>גופן</legend>${radio('font', prefs.font, [['noto', 'נוטו סריף'], ['ezra', 'עזרא'], ['frank', 'פרנק־רוהל']])}
    <small>פרנק־רוהל אינו כולל טעמי מקרא; בבחירתו הטעמים מוסתרים.</small></fieldset>
  <label class="field"><span>גודל אות: <output id="o-size">${prefs.size}</output></span><input type="range" name="size" min="16" max="44" step="1" value="${prefs.size}"></label>
  <label class="field"><span>ריווח שורות: <output id="o-lh">${prefs.lineHeight}</output></span><input type="range" name="lineHeight" min="1.4" max="2.6" step="0.1" value="${prefs.lineHeight}"></label>
  <fieldset><legend>אופן קריאה</legend>${radio('layout', prefs.layout, [['pages', 'עמודים (דפדוף)'], ['scroll', 'גלילה רציפה']])}
    ${check('spread', prefs.spread, 'שני עמודים זה לצד זה במסך רחב')}</fieldset>
  ${check('taamim', prefs.taamim, 'הצג טעמי המקרא (בחומש ובתהילים)')}
  ${check('rashi', prefs.rashi, 'הצג פירוש רש״י בחומש')}
  <fieldset><legend>ביאור מילים</legend>${radio('gloss', prefs.gloss, [['tap', 'בלחיצה על מילה'], ['inline', 'מעל המילה'], ['off', 'כבוי']])}</fieldset>
  ${check('wakeLock', prefs.wakeLock, 'השאר את המסך דולק בזמן קריאה')}`;
}
function ttsForm() {
  return `
  <div id="voice-warn"></div>
  <label class="field"><span>קול</span><select name="ttsVoice" id="voice-sel"><option value="">ברירת מחדל (עברית)</option></select></label>
  <label class="field"><span>מהירות: <output id="o-rate">${prefs.ttsRate}</output></span><input type="range" name="ttsRate" min="${TTS_RATES[0]}" max="${TTS_RATES.at(-1)}" step="0.1" value="${prefs.ttsRate}"></label>
  ${check('ttsStress', prefs.ttsStress, 'הקראה בהטעמה – שליחת הטקסט המנוקד למנוע הדיבור (מומלץ)')}
  <fieldset><legend>הקראת שם ה׳</legend>${radio('ttsDivine', prefs.ttsDivine, [['hashem', '״השם״ / ״אלוקים״'], ['adonai', 'כבתפילה (אדנות)']])}</fieldset>
  ${check('ttsRashi', prefs.ttsRashi, 'הקרא גם את פירוש רש״י')}
  ${check('ttsContinuous', prefs.ttsContinuous, 'המשך אוטומטי לשיעור הבא')}
  ${check('ttsLockscreen', prefs.ttsLockscreen, 'פקדים במסך הנעילה (ניסיוני)')}`;
}
function bindForm(root, onChange) {
  root.addEventListener('input', e => {
    const el = e.target; if (!el.name || !(el.name in DEFAULT_PREFS)) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (typeof DEFAULT_PREFS[el.name] === 'number') v = Number(v);
    if (el.name === 'il') v = v === 'true' || v === true;
    setPref(el.name, v);
    if (el.name === 'font' && v === 'frank') setPref('taamim', false);
    const o = root.querySelector('#o-' + ({ size: 'size', lineHeight: 'lh', ttsRate: 'rate' })[el.name]); if (o) o.textContent = v;
    applyPrefs(); onChange?.(el.name);
  });
  const sel = root.querySelector('#voice-sel'), warn = root.querySelector('#voice-warn');
  if (sel) onVoices(vs => {
    sel.innerHTML = '<option value="">ברירת מחדל (עברית)</option>' + vs.map(v => `<option ${v.name === prefs.ttsVoice ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
    warn.innerHTML = vs.length ? '' : voiceHelp();
  });
}
function voiceHelp() {
  if (!ttsSupported()) return '<p class="warn">הדפדפן הזה אינו תומך בהקראה (Web Speech API). נסו Chrome, Edge או Safari עדכניים.</p>';
  return `<div class="warn"><b>לא נמצא במכשיר קול עברי.</b> ההקראה עלולה להישמע לא נכון או לא לפעול. להתקנה:
  <ul><li><b>אנדרואיד:</b> הגדרות ← מערכת ← שפות וקלט ← פלט טקסט לדיבור ← מנוע Google ← התקנת נתוני קול ← עברית.</li>
  <li><b>אייפון/אייפד:</b> הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית (כרמית).</li>
  <li><b>Windows:</b> הגדרות ← זמן ושפה ← דיבור ← הוספת קולות ← עברית. בדפדפן Edge זמינים גם קולות עבריים ״טבעיים״ (אבי/הילה) מהרשת.</li>
  <li><b>macOS:</b> הגדרות מערכת ← נגישות ← תוכן מוקרא ← קול מערכת ← ניהול קולות ← עברית.</li></ul>
  לאחר ההתקנה יש לרענן את הדף.</div>`;
}
function renderSettings() {
  shell('הגדרות', `<form class="form" id="sf" onsubmit="return false">
    <fieldset><legend>מיקום (לחישוב פרשת השבוע)</legend>${radio('il', prefs.il, [['true', 'ארץ ישראל'], ['false', 'חוץ לארץ']])}</fieldset>
    <fieldset><legend>רמב״ם</legend>${radio('rambamTrack', prefs.rambamTrack, [['3', 'ג׳ פרקים'], ['1', 'פרק אחד'], ['both', 'שניהם']])}</fieldset>
    <h2>תצוגה</h2>${displayForm()}
    <h2>הקראה</h2>${ttsForm()}
    <h2>גיבוי ושחזור</h2>
    <p>ההתקדמות וההעדפות נשמרות רק במכשיר הזה. אפשר לייצא קובץ גיבוי ולייבא אותו במכשיר אחר.</p>
    <div class="seg-ctl"><button class="btn" type="button" id="exp">ייצוא קובץ גיבוי</button>
    <label class="btn" for="imp">ייבוא קובץ גיבוי</label><input type="file" id="imp" accept="application/json,.json" class="sr">
    <button class="btn" type="button" id="rst">מחיקת כל הנתונים מהמכשיר</button></div>
  </form>`);
  const f = $('#sf'); bindForm(f);
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(exportBackup()); a.download = `chitas-backup-${todayIso()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $('#imp').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { importBackup(await file.text()); applyPrefs(); toast('הגיבוי שוחזר'); renderSettings(); } catch { toast('קובץ לא תקין'); } };
  $('#rst').onclick = () => { if (confirm('למחוק את כל ההתקדמות וההעדפות מהמכשיר?')) resetAll(); };
}
async function renderSources() {
  shell('מקורות ורישיונות', '<p>טוען…</p>');
  let s = {}; try { s = await data('sources.json'); } catch { /* offline */ }
  const row = (what, m, note = '') => m ? `<tr><td data-h="חלק">${what}</td><td data-h="גרסה">${esc(m.versionTitleInHebrew || m.versionTitle)}</td><td data-h="רישיון">${esc(m.license)}</td><td data-h="קישור"><a href="${esc(m.versionSource)}" rel="noopener" target="_blank">מקור</a> · <a href="${esc(m.sefariaUrl || 'https://www.sefaria.org')}" rel="noopener" target="_blank">ספריא</a></td><td data-h="הערות">${note}</td></tr>` : '';
  const ov = Object.entries(s.rambamOverrides || {});
  $('.page').innerHTML = `<h1>מקורות ורישיונות</h1>
  <p>כל הטקסטים נלקחו מגרסאות ברישיון פתוח דרך ה-API של <a href="https://www.sefaria.org" rel="noopener" target="_blank">ספריא</a>, נשמרו מראש כקבצים סטטיים ומוגשים מהאתר עצמו. לא נוסף ניקוד ידני ולא שונה נוסח.</p>
  <p>גרסאות שמקורן באתר <a href="https://mechon-mamre.org/copy.htm" rel="noopener" target="_blank">מכון ממרא</a> אינן בשימוש: אף שבספריא הן מסומנות ״נחלת הכלל״, האתר עצמו מתיר שימוש פרטי לשם לימוד והוראה בלבד ואוסר להעתיק את החומר לאתר אחר. לכן ההקדמה למשנה תורה ומניין המצוות נלקחו מוויקיטקסט (CC BY-SA).</p>
  <table class="src"><thead><tr><th>חלק</th><th>גרסה</th><th>רישיון</th><th>קישור</th><th>הערות</th></tr></thead><tbody>
  ${row('חומש ותהילים', s.tanakh, 'מנוקד ומוטעם')}
  ${row('פירוש רש״י', s.rashi, 'מנוקד; דיבורי המתחיל אינם מנוקדים')}
  ${row('תניא', s.tanya, 'מנוקד. רישיון לשימוש לא מסחרי בלבד (NC)')}
  ${row('משנה תורה לרמב״ם', s.rambam, 'מנוקד')}
  ${ov.map(([n, m]) => row('רמב״ם – ' + Locale.gettext(n, 'he-x-NoNikud'), { ...m, sefariaUrl: 'https://www.sefaria.org/' + encodeURIComponent('Mishneh Torah, ' + n) }, (m.vocalized ?? /Torat Emet/.test(m.versionTitle)) ? 'מנוקד' : '<b>לא מנוקד</b> (או מנוקד חלקית) – אין גרסה מנוקדת ברישיון פתוח')).join('')}
  </tbody></table>
  <h2>ביאור מילים</h2><p>הביאורים הקצרים לקוחים מ<a href="https://he.wiktionary.org" target="_blank" rel="noopener">ויקימילון</a> (CC BY-SA 4.0). לכל ביאור מצורף קישור לערך המקור. רשימת הביאורים חלקית – ראו ״אודות ומגבלות״. לכל מילה אחרת, בכל השיעורים (גם רש״י, תניא ורמב״ם), אפשר לסמן את המילה (לחיצה ארוכה או לחיצה כפולה) ולבחור ״חיפוש בוויקימילון״ – קישור חיצוני שנפתח בלשונית חדשה; האפליקציה עצמה אינה שולחת דבר.</p>
  <h2>לוח השיעורים</h2><p>חישוב התאריך העברי, פרשת השבוע, חלוקת התהילים, תניא יומי ורמב״ם יומי: ספריות <a href="https://github.com/hebcal" target="_blank" rel="noopener">Hebcal</a> (‎@hebcal/core – GPL-2.0, ‎@hebcal/learning ו-‎@hebcal/leyning – BSD-2). החישוב נעשה במכשיר, ללא רשת.</p>
  <h2>גופנים</h2><p>Noto Serif Hebrew, Frank Ruhl Libre, Ezra SIL – כולם ברישיון SIL Open Font License 1.1 (<a href="fonts/licenses/NotoSerifHebrew-OFL.txt">נוטו</a>, <a href="fonts/licenses/FrankRuhlLibre-OFL.txt">פרנק־רוהל</a>, <a href="fonts/licenses/EzraSIL-OFL.txt">עזרא</a>).</p>
  <h2>קוד</h2><p>קוד האתר פתוח ברישיון GPL-2.0-or-later: <a href="https://github.com/dudidd-wq/chitas-reader" target="_blank" rel="noopener">github.com/dudidd-wq/chitas-reader</a>.</p>`;
}
function renderAbout() {
  shell('אודות ומגבלות', `
  <p>אתר לקריאת שיעורי חת״ת (חומש עם רש״י, תהילים, תניא) ורמב״ם יומי, בטקסט מנוקד ובתצוגה דמוית נייר, עם אפשרות שהדפדפן יקריא את הטקסט. עובד גם ללא רשת לאחר טעינה, ואינו אוסף מידע: אין חשבון, אין מעקב ואין שליחת נתונים.</p>
  <h2>לוח השיעורים</h2><ul>
  <li>החומש לפי המנהג: בכל יום עולה אחת מפרשת השבוע (ראשון – ראשון … שבת – שביעי). בשבוע שבו השבת היא יום טוב – לומדים את הפרשה של השבת הבאה. מאחרי השבת האחרונה של השנה ועד שמחת תורה – ״וזאת הברכה״. בשמחת תורה עצמה מסיימים את ״וזאת הברכה״ מעליית היום ועד סוף התורה, ומתחילים ״בראשית״ עד סוף עליית היום (ע״פ שיחת הרבי, תורת מנחם תשל״ב ח״א עמ׳ 129, ו״מנהגי חב״ד לשמחת תורה״ באתר chabad.org.il). כששמחת תורה חלה בשבת (בארץ ישראל בלבד) לומדים מ״בראשית״ רק ״ראשון״ (א,א–ב,ג), כי שבוע פרשת בראשית מתחיל למחרת; לכך לא מצאנו מקור מפורש, ויש לוחות שבהם לומדים בשמחת תורה רק ״וזאת הברכה״. ביום זה מוצגת הערה בקורא.</li>
  <li>תהילים לפי ימי החודש; בחודש חסר לומדים ביום כ״ט גם את של יום ל׳.</li>
  <li>תניא יומי לפי הלוח המקובל (מחזור שנתי החל מי״ט כסלו).</li>
  <li>הלוח נבדק אוטומטית מול לוח השיעורים של Chabad.org (חוץ לארץ) לכל יום בטווח של יותר משנתיים – ראו קובץ verification במאגר.</li>
  <li>היום מתחלף בחצות לפי שעון המכשיר (ולא בשקיעה).</li></ul>
  <h2>ניקוד</h2><ul><li>כל הטקסטים מנוקדים, חוץ מכמה ספרים ברמב״ם (ספר אהבה, מניין המצוות ותוכן החיבור) שלא נמצאה להם גרסה מנוקדת ברישיון פתוח. בטקסטים אלה מוצגת הודעה.</li></ul>
  <h2>ביאור מילים</h2><ul><li>הביאורים קצרים (עד 4 מילים) ומועתקים מוויקימילון בלבד; לא נוספו ביאורים ״מהראש״ ולא נוצרו אוטומטית.</li><li>כדי למנוע ביאור שגוי, מילה מבוארת רק כשערך ויקימילון עצמו מצטט את <b>אותו פסוק</b> כדוגמה לאותה משמעות. לכן יש ביאורים רק בחומש ובתהילים (כ־800 מילים בכל התורה ותהילים, כולן נבדקו ידנית), ולא ברש״י, בתניא וברמב״ם. בכל מקום אפשר לסמן מילה ולפתוח את ערכה בוויקימילון (קישור חיצוני).</li></ul>
  <h2>הקראה</h2><ul>
  <li>ההקראה משתמשת בקול המותקן במכשיר (Web Speech API). איכות ההגייה תלויה בקול: גם עם ניקוד, מנועי הדיבור אינם מקפידים על מלעיל/מלרע, שווא נע ודגש, וקריאת ארמית ולשון חכמים חלקית.</li>
  <li>״הקראה בהטעמה״ שולחת את הטקסט המנוקד (ללא טעמי המקרא), מרחיבה ראשי תיבות נפוצים וקוראת את שם ה׳ ״השם״ (או כבתפילה, לפי בחירה).</li>
  <li>כשהמסך כבוי: במחשב ההקראה ממשיכה; באנדרואיד היא לרוב ממשיכה כשהדף פתוח; באייפון היא נעצרת בדרך כלל בנעילת המסך – מומלץ להשאיר את המסך דולק (יש אפשרות כזו בהגדרות).</li></ul>
  <p>האתר בהשראת <a href="https://dvarmalchus.co.il" target="_blank" rel="noopener">דבר מלכות</a>. זהו מיזם עצמאי ואינו קשור אליו.</p>`);
}

// ---------------- Reader ----------------
const R = { unit: null, iso: null, doc: null, page: 0, pages: 1, segs: [], speaker: null, wake: null, saveT: null };
function stripTaamim(s) { return s.replace(RE_TAAMIM, ''); }
function fmt(html, isTanakh) {
  let s = html.replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '<span class="ketiv" title="כתיב">($1)</span> <span title="קרי">$2</span>')
    .replace(/\{([פס])\}/g, '<span class="pe" aria-hidden="true">$1</span>')
    .replace(/<i class="fn">/g, '<i class="fn" role="note" title="הערת המהדורה">');
  if (isTanakh && (!prefs.taamim || prefs.font === 'frank')) s = stripTaamim(s);
  return s;
}
function niqqudRatio(text) { const L = (text.match(/[\u05D0-\u05EA]/g) || []).length; const N = (text.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || []).length; return N / Math.max(L, 1); }

async function openReader(unit, iso) {
  currentDate = iso;
  const auto = R.autoplay; R.autoplay = false;
  if (R.speaker) { R.speaker.stop(true); R.speaker = null; }
  if (R.doc && R.unit) { const s = currentSeg(); if (s) setProgress(R.iso, R.unit, { pos: s.dataset.id }); }
  R.doc = null; R.segs = []; R.ttsShown = false;
  const plan = dayPlan(iso, { il: prefs.il });
  const el = $('#reader');
  el.hidden = false; document.body.style.overflow = 'hidden';
  $('#app').hidden = true; // the home page is never visible or reachable behind the reader
  R.unit = unit; R.iso = iso; R.page = 0;
  el.innerHTML = `
  <header class="r-top" id="rt">
    <a class="btn ghost" href="#/d/${iso}" aria-label="חזרה לדף הבית">${ICON.back}</a>
    <div class="r-title"><b id="r-t">${esc(UNITS[unit].full)}</b><small id="r-s">${esc(plan.hebDate)}</small></div>
    <span class="lsc pageinfo" id="pinfo2" aria-hidden="true"></span>
    <button class="btn ghost lsc" id="b-prev2" aria-label="עמוד קודם">${ICON.prev}</button>
    <button class="btn ghost lsc" id="b-next2" aria-label="עמוד הבא">${ICON.next}</button>
    <button class="btn ghost" id="b-tts" aria-label="הקראה" aria-haspopup="dialog">${ICON.speak}</button>
    <button class="btn ghost" id="b-aa" aria-label="הגדרות תצוגה" aria-haspopup="dialog">${ICON.aa}</button>
    <button class="btn ghost" id="b-full" aria-label="מסך מלא – הסתרת הסרגלים">${ICON.full}</button>
  </header>
  <main class="r-viewport ${prefs.layout}" id="vp" aria-label="טקסט השיעור"><article class="r-content" id="rc" lang="he" aria-live="off"><p>טוען…</p></article><div class="spine" aria-hidden="true"></div></main>
  <footer class="r-bottom" id="rb" aria-label="דפדוף והקראה">
    <div class="progress" aria-hidden="true"><i id="pbar"></i></div>
    <button class="btn ghost" id="b-prev" aria-label="עמוד קודם">${ICON.prev}</button>
    <span class="pageinfo" id="pinfo" aria-live="polite"></span>
    <div class="tts-ctl" id="ttsctl" hidden>
      <button class="btn ghost" id="t-back" aria-label="קטע קודם">${ICON.fwd}</button>
      <button class="btn" id="t-play" aria-label="הפעל">${ICON.play}</button>
      <button class="btn ghost" id="t-fwd" aria-label="קטע הבא">${ICON.rew}</button>
      <button class="btn ghost" id="t-stop" aria-label="עצור">${ICON.stop}</button>
      <label class="sr" for="t-rate">מהירות</label>
      <select id="t-rate">${TTS_RATES.map(r => `<option value="${r}" ${Math.abs(r - prefs.ttsRate) < 0.01 ? 'selected' : ''}>×${r}</option>`).join('')}</select>
    </div>
    <span style="flex:1" id="spacer"></span>
    <button class="btn ghost" id="b-next" aria-label="עמוד הבא">${ICON.next}</button>
  </footer>
  <div class="thin-progress" aria-hidden="true"><i id="tbar"></i></div>
  <div class="sheet" id="sheet" hidden role="dialog" aria-modal="true" aria-labelledby="sh-title"></div>`;
  bindReaderUi();
  try {
    R.doc = await buildDoc(plan, unit);
  } catch (e) {
    $('#rc').innerHTML = '<p>לא ניתן לטעון את הטקסט. ייתכן שאין חיבור לרשת והטקסט לא נשמר מראש.</p>'; return;
  }
  if (R.unit !== unit || R.iso !== iso) return;
  $('#r-t').textContent = R.doc.title; $('#r-s').textContent = `${plan.hebDate} · ${R.doc.subtitle}`;
  document.title = `${R.doc.title} – ${plan.hebDate}`;
  await renderDoc();
  const p = getProgress(iso, unit);
  if (p?.pos && !p.done) goToSeg(p.pos, false);
  requestWake();
  if (auto) ttsToggle();
}
// Simchat Torah: the Chumash shiur differs between calendars – say what we do and why, so the reader is not
// surprised when another calendar (e.g. Chabad.org) shows something else.
function simchatTorahNote() {
  if (R.unit !== 'chumash') return '';
  const c = dayPlan(R.iso, { il: prefs.il }).chumash;
  if (!c?.simchatTorah) return '';
  const t = c.shabbat
    ? 'שמחת תורה שחל בשבת (בארץ ישראל): לומדים את ״וזאת הברכה״ מ״שביעי״ עד סוף התורה, ומ״בראשית״ רק את ״ראשון״ (א,א–ב,ג – קריאת חתן בראשית), כי שבוע פרשת בראשית מתחיל למחרת ביום ראשון. לא מצאנו מקור מפורש למקרה זה; יש לוחות שבהם לומדים היום את ״וזאת הברכה״ בלבד.'
    : `בשמחת תורה מסיימים את ״וזאת הברכה״ מעליית היום (${c.aliyahHe}) עד סוף התורה, ומתחילים ״בראשית״ עד סוף עליית היום – ע״פ שיחת הרבי (תורת מנחם תשל״ב ח״א עמ׳ 129) ו״מנהגי חב״ד לשמחת תורה״ (chabad.org.il). בלוחות אחרים, כמו Chabad.org, מופיעה היום רק ״וזאת הברכה״.`;
  return `<aside class="day-note" role="note"><b>לתשומת לב:</b> ${esc(t)}</aside>`;
}
async function renderDoc() {
  const d = R.doc, rc = $('#rc');
  const showRashi = prefs.rashi && R.unit === 'chumash';
  const inline = d.tanakh && !showRashi;
  let html = `<header class="doc-head"><p class="doc-kicker">${esc(UNITS[R.unit].he)} · ${esc(dayPlan(R.iso, { il: prefs.il }).hebDate)}</p><h1>${esc(d.title)}</h1><p class="doc-sub">${esc(d.subtitle)}</p><div class="orn" aria-hidden="true"><i></i><b></b><i></i></div></header>`;
  const allText = d.blocks.filter(b => b.text).map(b => b.text).join(' ');
  html += simchatTorahNote();
  if (niqqudRatio(allText) < 0.3) html += `<p class="unvoc">טקסט זה אינו מנוקד – לא נמצאה לו גרסה מנוקדת ברישיון פתוח.</p>`;
  let open = false;
  for (const b of d.blocks) {
    if (b.type === 'h') { if (open) { html += '</p>'; open = false; } html += `<h2>${esc(b.text)}</h2>`; continue; }
    const num = b.num ? `<span class="${b.type === 'v' ? 'vn' : 'hn'}" aria-hidden="true">${b.num}</span>` : '';
    if (inline) {
      if (!open) { html += '<p>'; open = true; }
      html += `<span class="seg inline" data-id="${b.id}"${b.ref ? ` data-ref="${b.ref}"` : ''}>${num}<span class="t">${fmt(b.text, true)}</span></span> `;
    } else {
      const rashi = showRashi && b.sub?.length ? `<div class="rashi">${b.sub.map((r, i) => `<p>${i ? '' : '<span class="lbl">רש״י </span>'}${fmt(r, false)}</p>`).join('')}</div>` : '';
      html += `<div class="seg" data-id="${b.id}"${b.ref ? ` data-ref="${b.ref}"` : ''}><div class="t">${num}${fmt(b.text, !!d.tanakh)}</div>${rashi}</div>`;
    }
  }
  if (open) html += '</p>';
  html += `<p class="endmark" id="endmark">— סוף השיעור —<br><button class="btn" id="b-nextunit">לשיעור הבא</button></p>`;
  rc.innerHTML = html;
  rc.className = 'r-content gloss-' + prefs.gloss;
  if (prefs.gloss !== 'off') { await loadGlossary(); applyGlosses(rc, d.book); }
  R.segs = [...rc.querySelectorAll('.seg')];
  $('#b-nextunit').onclick = () => nextUnit(false);
  layout();
}
function nextUnitId() { const us = unitsFor(); const i = us.indexOf(R.unit); return i >= 0 && i < us.length - 1 ? us[i + 1] : null; }
function nextUnit(autoplay) {
  setProgress(R.iso, R.unit, { done: true, frac: 1 });
  const n = nextUnitId();
  if (!n) { toast('סיימת את כל שיעורי היום. יישר כח!'); location.hash = '#/d/' + R.iso; return; }
  R.autoplay = autoplay;
  location.hash = `#/r/${n}/${R.iso}`;
}

// layout: page geometry
// The text area is padded by the chrome that is actually visible (none in immersive mode), so hiding the bars
// re-paginates into the freed space. Wide landscape screens get a two-page spread; narrow measures are set
// ragged (start-aligned) because justifying ~4 words per line leaves wide gaps.
function chromePad() {
  const el = $('#reader'), imm = el.classList.contains('immersive');
  const top = imm ? 0 : $('#rt').offsetHeight, bot = imm ? ($('#rb').classList.contains('speaking') ? $('#rb').offsetHeight : 0) : $('#rb').offsetHeight;
  return { top: Math.max(top, 8) + 14, bottom: Math.max(bot, 8) + 14 };
}
function layout() {
  const vp = $('#vp'), rc = $('#rc'), pad = chromePad();
  vp.className = 'r-viewport ' + prefs.layout;
  if (prefs.layout === 'pages') {
    const W = vp.clientWidth, g = pageGeometry({ W, H: vp.clientHeight, size: prefs.size, spreadPref: prefs.spread });
    rc.style.width = g.P + 'px'; rc.style.columnWidth = g.P + 'px'; rc.style.columnGap = g.gap + 'px';
    rc.style.right = g.gap / 2 + 'px'; rc.style.left = 'auto';
    rc.style.paddingTop = pad.top + 'px'; rc.style.paddingBottom = pad.bottom + 'px';
    rc.classList.toggle('ragged', g.ragged); vp.classList.toggle('spread', g.spread);
    vp.style.setProperty('--pad-top', pad.top + 'px'); vp.style.setProperty('--pad-bottom', pad.bottom + 'px');
    const end = $('#endmark');
    const prevT = rc.style.transform; rc.style.transition = 'none'; rc.style.transform = 'none';
    const rcR = rc.getBoundingClientRect().right, endL = end ? end.getBoundingClientRect().left : rcR - g.P;
    rc.style.transform = prevT; void rc.offsetWidth; rc.style.transition = '';
    const step = g.spread ? W / 2 : W;
    R.W = W; R.spread = g.spread;
    R.cols = Math.max(1, Math.floor((rcR - endL - g.P) / step + 0.02) + 1);
    R.pages = g.spread ? Math.ceil(R.cols / 2) : R.cols;
    R.page = Math.min(R.page, R.pages - 1);
    setPage(R.page, false);
  } else {
    rc.style.cssText = ''; rc.classList.toggle('ragged', pageGeometry({ W: Math.min(vp.clientWidth, prefs.size * 34), H: 1, size: prefs.size, spreadPref: false }).ragged);
    rc.style.paddingTop = pad.top + 'px'; rc.style.paddingBottom = (pad.bottom + 40) + 'px';
    updateProgress();
  }
}
function setPage(n, save = true) {
  R.page = Math.max(0, Math.min(R.pages - 1, n));
  $('#rc').style.transform = `translateX(${R.page * R.W}px)`;
  updateProgress(save);
}
// Keep the part of the segment being spoken (frac = share of the segment already read) inside the visible text area,
// i.e. between the top bar and the player bar – also for long segments that run over several pages.
function followSpeech(el, frac) {
  if (prefs.layout === 'pages') {
    const rc = $('#rc').getBoundingClientRect(), e = el.getBoundingClientRect();
    const p0 = pageOf(el), p1 = Math.max(p0, Math.floor((rc.right - e.left - 2) / R.W));
    const p = Math.min(p1, p0 + Math.floor(frac * (p1 - p0 + 1)));
    if (p !== R.page) setPage(p);
  } else {
    const vp = $('#vp'), pad = chromePad(), e = el.getBoundingClientRect(), v = vp.getBoundingClientRect();
    const y = e.top + frac * e.height, lo = v.top + pad.top, hi = v.bottom - pad.bottom - 40;
    if (y < lo || y > hi) vp.scrollBy({ top: y - lo - 20, behavior: 'smooth' });
  }
}
function pageOf(el) {
  const rc = $('#rc'), r = rc.getBoundingClientRect(), e = el.getBoundingClientRect();
  return Math.max(0, Math.floor((r.right - e.right + 2) / R.W));
}
function currentSeg() {
  if (!R.segs.length) return null;
  if (prefs.layout === 'pages') return R.segs.find(s => pageOf(s) >= R.page) || R.segs[R.segs.length - 1];
  const top = $('#vp').getBoundingClientRect().top + 60;
  return R.segs.find(s => s.getBoundingClientRect().bottom > top) || R.segs[R.segs.length - 1];
}
function goToSeg(id, smooth = true) {
  const el = R.segs.find(s => s.dataset.id === id); if (!el) return;
  if (prefs.layout === 'pages') { const p = pageOf(el); if (p !== R.page) setPage(p); }
  else el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
}
function updateProgress(save = true) {
  let frac;
  if (prefs.layout === 'pages') {
    frac = R.pages <= 1 ? 1 : R.page / (R.pages - 1);
    const a = R.spread ? 2 * R.page + 1 : R.page + 1, b = R.spread ? Math.min(2 * R.page + 2, R.cols) : a;
    $('#pinfo').textContent = $('#pinfo2').textContent = a === b ? `עמוד ${a} מתוך ${R.cols}` : `עמודים ${a}–${b} מתוך ${R.cols}`;
  } else {
    const vp = $('#vp'); const max = vp.scrollHeight - vp.clientHeight;
    frac = max <= 0 ? 1 : vp.scrollTop / max;
    $('#pinfo').textContent = $('#pinfo2').textContent = `${Math.round(frac * 100)}%`;
  }
  $('#pbar').style.width = $('#tbar').style.width = (frac * 100).toFixed(1) + '%';
  if (!save || !R.doc) return;
  clearTimeout(R.saveT);
  R.saveT = setTimeout(() => {
    const s = currentSeg();
    setProgress(R.iso, R.unit, { pos: s?.dataset.id, frac, done: frac >= 0.995 });
  }, 400);
}
function bindReaderUi() {
  const el = $('#reader'), vp = $('#vp');
  const toggleChrome = force => {
    const before = el.classList.contains('immersive'), after = el.classList.toggle('immersive', force);
    if (before === after || !R.doc) return;
    const s = currentSeg()?.dataset.id; layout(); if (s) goToSeg(s, false);
  };
  R.toggleChrome = toggleChrome;
  // Re-paginate whenever a bar changes height (player bar shown/hidden, wrapping, rotation) and keep the position.
  let lastH = '';
  R.ro?.disconnect();
  R.ro = new ResizeObserver(() => {
    if (!$('#rt') || !$('#rb') || !$('#rc')) { R.ro?.disconnect(); return; } // reader was left
    const h = $('#rt').offsetHeight + ':' + $('#rb').offsetHeight;
    if (h === lastH) return; const first = !lastH; lastH = h;
    if (first || !R.doc) return;
    cancelAnimationFrame(R.roF);
    R.roF = requestAnimationFrame(() => { if (!$('#rc')) return; const s = (R.segs.find(x => x.classList.contains('speaking')) || currentSeg())?.dataset.id; layout(); if (s) goToSeg(s, false); });
  });
  R.ro.observe($('#rt')); R.ro.observe($('#rb'));
  $('#b-prev').onclick = $('#b-prev2').onclick = () => turn(-1);
  $('#b-next').onclick = $('#b-next2').onclick = () => turn(1);
  $('#b-full').onclick = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
    toggleChrome(true);
  };
  $('#b-full').setAttribute('aria-pressed', 'false');
  $('#b-aa').onclick = () => openSheet('display');
  $('#b-tts').onclick = () => openSheet('tts');
  vp.addEventListener('scroll', () => { if (prefs.layout === 'scroll') updateProgress(); }, { passive: true });
  // tap zones & swipe (page mode); tap center toggles chrome
  let sx = 0, sy = 0, st = 0;
  vp.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; st = Date.now(); });
  vp.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (e.target.closest('.gl, button, a')) return;
    if (prefs.layout === 'pages' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { turn(dx > 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - st < 500) {
      if (window.getSelection()?.toString()) return;
      const x = e.clientX / vp.clientWidth;
      if (prefs.layout === 'pages' && x < 0.28) turn(1);
      else if (prefs.layout === 'pages' && x > 0.72) turn(-1);
      else toggleChrome();
    }
  });
  $('#t-play').onclick = () => ttsToggle();
  $('#t-stop').onclick = () => { R.speaker?.stop(); };
  $('#t-back').onclick = () => R.speaker?.skip(-1);
  $('#t-fwd').onclick = () => R.speaker?.skip(1);
  $('#t-rate').onchange = e => { setPref('ttsRate', snapRate(Number(e.target.value))); R.speaker?.setRate(prefs.ttsRate); };
}
function turn(d) {
  if (prefs.layout === 'pages') {
    if (d > 0 && R.page >= R.pages - 1) { setProgress(R.iso, R.unit, { done: true, frac: 1 }); toast('סוף השיעור'); return; }
    setPage(R.page + d);
  } else { const vp = $('#vp'); vp.scrollBy({ top: d * (vp.clientHeight - 80), behavior: 'smooth' }); }
}
document.addEventListener('keydown', e => {
  if ($('#reader').hidden || e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (k === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else location.hash = '#/d/' + R.iso; return; }
  if (!$('#sheet').hidden) return;
  if (k === 'ArrowLeft' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); turn(1); }
  else if (k === 'ArrowRight' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); turn(-1); }
  else if (k === 'Home') { e.preventDefault(); prefs.layout === 'pages' ? setPage(0) : $('#vp').scrollTo({ top: 0 }); }
  else if (k === 'End') { e.preventDefault(); prefs.layout === 'pages' ? setPage(R.pages - 1) : $('#vp').scrollTo({ top: 1e9 }); }
  else if (k === 'p' || k === 'P' || k === 'פ') ttsToggle();
  else if (k === 'f' || k === 'F' || k === 'כ') $('#b-full').click();
});
let resizeT; window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!$('#reader').hidden && R.doc) { const s = currentSeg()?.dataset.id; layout(); if (s) goToSeg(s, false); } }, 150); });

function openSheet(kind) {
  const sh = $('#sheet');
  if (sh.hidden) R.sheetOpener = document.activeElement;
  sh.innerHTML = `<h2><span id="sh-title">${kind === 'tts' ? 'הקראה' : 'תצוגה'}</span><button class="btn ghost" id="sh-x" aria-label="סגירה">${ICON.close}</button></h2>
    <form class="form" onsubmit="return false">${kind === 'tts' ? `<button class="btn primary" id="sh-play" type="button">${R.speaker?.state === 'playing' ? 'השהה הקראה' : 'התחל הקראה מהעמוד הנוכחי'}</button>` + ttsForm() : displayForm()}</form>`;
  sh.hidden = false;
  for (const id of ['#rt', '#vp', '#rb']) $(id).inert = true;
  $('#sh-x').onclick = closeSheet;
  $('#sh-x').focus();
  const sp = $('#sh-play'); if (sp) sp.onclick = () => { closeSheet(); ttsToggle(); };
  bindForm(sh.querySelector('form'), async name => {
    if (['taamim', 'rashi', 'gloss', 'font'].includes(name)) { const s = currentSeg()?.dataset.id; await renderDoc(); if (s) goToSeg(s, false); }
    else if (['size', 'lineHeight', 'layout', 'spread'].includes(name)) { const s = currentSeg()?.dataset.id; layout(); if (s) goToSeg(s, false); }
    else if (name === 'wakeLock') requestWake();
    else if (name.startsWith('tts') && R.speaker && name !== 'ttsRate') { const st = R.speaker.state; R.speaker.stop(true); R.speaker = null; if (st === 'playing') ttsToggle(); }
    else if (name === 'ttsRate') { R.speaker?.setRate(prefs.ttsRate); const t = $('#t-rate'); if (t) t.value = String(prefs.ttsRate); }
  });
}
function closeSheet() {
  const sh = $('#sheet'); if (sh.hidden) return;
  sh.hidden = true;
  for (const id of ['#rt', '#vp', '#rb']) if ($(id)) $(id).inert = false;
  const o = R.sheetOpener; R.sheetOpener = null;
  if (o?.isConnected && !o.closest('[hidden]')) o.focus(); else $('#b-aa')?.focus();
}
// Focus trap for the modal sheet (Tab / Shift+Tab cycle inside it).
document.addEventListener('keydown', e => {
  const sh = $('#sheet'); if (e.key !== 'Tab' || !sh || sh.hidden) return;
  const f = [...sh.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.getClientRects().length);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!sh.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// ---------------- TTS in reader ----------------
function ttsSegments() {
  return R.segs.map(s => {
    const parts = [s.querySelector('.t').innerHTML.replace(/<span class="(vn|hn|ketiv)[^>]*>.*?<\/span>/g, '')];
    if (prefs.ttsRashi) s.querySelectorAll('.rashi p').forEach(p => parts.push(p.innerHTML));
    return { el: s, parts, chol: CHOL[s.dataset.ref] };
  });
}
const TTS_ERR = {
  'no-voice': 'לא נמצא במכשיר קול עברי, ולכן ההקראה לא הופעלה. הוראות התקנה – בחלון ההקראה.',
  silent: 'מנוע הדיבור לא השמיע את הטקסט (ייתכן שאין קול עברי). ההקראה נעצרה, והשיעור לא סומן כנלמד.',
};
// The player is one compact row that replaces the pager (the pager buttons give way on narrow screens; the read-aloud
// follows the pages by itself). The text area is re-laid out for the bar's real height (ResizeObserver in bindReaderUi).
function showTtsBar(on) { $('#ttsctl').hidden = !on; $('#rb').classList.toggle('tts-on', on); }
async function ttsToggle() {
  if (!ttsSupported()) { toast('הדפדפן אינו תומך בהקראה'); return; }
  if (R.speaker) { R.speaker.toggle(); return; }
  const unit = R.unit, iso = R.iso;
  await waitForVoices();
  if (R.unit !== unit || R.iso !== iso || R.speaker) return;
  R.speaker = new Speaker({
    onSegment: (i, frac = 0) => {
      const el = R.segs[i]; if (!el) return;
      if (!el.classList.contains('speaking')) { R.segs.forEach(s => s.classList.remove('speaking')); el.classList.add('speaking'); }
      followSpeech(el, frac);
    },
    onState: st => {
      showTtsBar(st !== 'stopped' || R.ttsShown);
      const was = $('#rb').classList.contains('speaking');
      $('#rb').classList.toggle('speaking', st !== 'stopped');
      if (was !== (st !== 'stopped') && $('#reader').classList.contains('immersive')) { const s = currentSeg()?.dataset.id; layout(); if (s) goToSeg(s, false); }
      $('#t-play').innerHTML = st === 'playing' ? ICON.pause : ICON.play;
      $('#t-play').setAttribute('aria-label', st === 'playing' ? 'השהה' : 'הפעל');
      if (st === 'stopped') R.segs.forEach(s => s.classList.remove('speaking'));
    },
    // Only a run that really reached the end with every chunk spoken marks the lesson as read / moves on.
    onEnd: ({ complete }) => {
      if (!complete) { toast(TTS_ERR.silent); return; }
      if (prefs.ttsContinuous && nextUnitId()) nextUnit(true); else setProgress(R.iso, R.unit, { done: true, frac: 1 });
    },
    onError: code => {
      R.speaker = null; R.ttsShown = false; showTtsBar(false);
      toast(TTS_ERR[code] || `ההקראה נעצרה בגלל שגיאה במנוע הדיבור (${code}). השיעור לא סומן כנלמד.`);
      if (code === 'no-voice') openSheet('tts');
    },
  });
  R.speaker.load(ttsSegments(), { rate: prefs.ttsRate, voice: prefs.ttsVoice, stress: prefs.ttsStress, divineName: prefs.ttsDivine, lockscreen: prefs.ttsLockscreen },
    { title: R.doc.title + ' – ' + R.doc.subtitle, album: dayPlan(R.iso, { il: prefs.il }).hebDate });
  const cur = currentSeg();
  R.ttsShown = true; showTtsBar(true);
  R.speaker.startAt(Math.max(0, R.segs.indexOf(cur)));
}

// ---------------- Wake lock ----------------
async function requestWake() {
  try {
    if (prefs.wakeLock && 'wakeLock' in navigator && !$('#reader').hidden) { if (!R.wake) { R.wake = await navigator.wakeLock.request('screen'); R.wake.addEventListener('release', () => { R.wake = null; }); } }
    else if (R.wake) { await R.wake.release(); R.wake = null; }
  } catch { R.wake = null; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });

function closeReader() {
  const el = $('#reader'); if (el.hidden) return;
  if (R.speaker) { R.speaker.stop(true); R.speaker = null; }
  R.ttsShown = false;
  if (R.doc && R.unit) { const s = currentSeg(); if (s) setProgress(R.iso, R.unit, { pos: s.dataset.id }); }
  el.hidden = true; el.innerHTML = ''; document.body.style.overflow = '';
  $('#app').hidden = false;
  R.unit = null; R.doc = null; document.title = 'חת״ת ורמב״ם – קריאה יומית';
  if (R.wake) { R.wake.release().catch(() => {}); R.wake = null; }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

applyPrefs();
route();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Update flow: the new worker activates immediately (skipWaiting); the running page still has the old code,
  // so reload at once on the home page, or offer a reload in the reader (never interrupt reading/TTS).
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install, nothing to refresh
    if ($('#reader').hidden) { location.reload(); return; }
    const t = $('#toast'); clearTimeout(toast.t);
    t.innerHTML = 'גרסה חדשה של היישומון מוכנה. <button type="button" class="btn small" id="swReload">רענון</button>';
    t.classList.add('show');
    $('#swReload').onclick = () => location.reload();
  });
  navigator.serviceWorker.register('sw.js').then(r => { r.update?.().catch(() => {}); }).catch(() => {});
}
