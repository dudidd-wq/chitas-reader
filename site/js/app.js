import { CHOL } from './chol.js';
import { dayPlan, isoDate, toHDate, HDate, Locale } from './calendar.js';
import { buildDoc, describe, filesFor, UNITS, data } from './texts.js';
import { prefs, setPref, getProgress, setProgress, clearProgress, exportBackup, importBackup, resetAll, DEFAULT_PREFS } from './store.js';
import { Speaker, ttsSupported, hebrewVoices, onVoices, waitForVoices } from './tts.js';
import { RE_TAAMIM } from './tts-prep.js';
import { applyGlosses, loadGlossary } from './gloss.js';

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
async function renderHome() {
  const plan = dayPlan(currentDate, { il: prefs.il });
  const isToday = currentDate === todayIso();
  const v = $('#view');
  v.innerHTML = `<div class="wrap">
    <header class="hero">
      <p class="sub">${esc(plan.dayHe)}${isToday ? ' · היום' : ''}</p>
      <h1 class="hd">${esc(plan.hebDate)}</h1>
      <p class="sub">${esc(gregHe(currentDate))} · פרשת ${esc(plan.weekParsha)}</p>
    </header>
    <nav class="datebar" aria-label="בחירת תאריך">
      <a class="btn" href="#/d/${shiftIso(currentDate, -1)}" aria-label="היום הקודם">${ICON.prev}<span>הקודם</span></a>
      <label class="sr" for="datepick">תאריך</label>
      <input type="date" id="datepick" value="${currentDate}">
      <a class="btn" href="#/d/${shiftIso(currentDate, 1)}" aria-label="היום הבא"><span>הבא</span>${ICON.next}</a>
      ${isToday ? '' : `<a class="btn today" href="#/d/${todayIso()}">חזרה להיום</a>`}
    </nav>
    <section class="cards" aria-label="שיעורי היום">${unitsFor().map(u => `
      <article class="card" id="card-${u}">
        <h2>${esc(UNITS[u].he)}</h2>
        <p class="what" data-what="${u}">…</p>
        <p class="meta" data-meta="${u}"></p>
        <a class="btn primary go" href="#/r/${u}/${currentDate}" data-go="${u}">פתח</a>
        <div class="bar" aria-hidden="true"><i style="width:0"></i></div>
      </article>`).join('')}
    </section>
    <div class="links">
      <button class="btn" id="dl30">שמירה לשימוש ללא רשת (30 יום)</button>
      <a class="btn" href="#/settings">הגדרות</a>
      <a class="btn" href="#/sources">מקורות ורישיונות</a>
      <a class="btn" href="#/about">אודות ומגבלות</a>
    </div>
    <p class="note">${prefs.il ? 'לוח לפי מנהג ארץ ישראל' : 'לוח לפי חוץ לארץ'} · הנתונים נשמרים במכשיר בלבד · ללא מעקב</p>
  </div>`;
  $('#datepick').addEventListener('change', e => { if (e.target.value) location.hash = '#/d/' + e.target.value; });
  $('#dl30').addEventListener('click', downloadAhead);
  for (const u of unitsFor()) {
    const p = getProgress(currentDate, u);
    const card = $('#card-' + u), btn = card.querySelector('[data-go]'), meta = card.querySelector('[data-meta]');
    const frac = p ? (p.done ? 1 : p.frac || 0) : 0;
    card.querySelector('.bar i').style.width = Math.round(frac * 100) + '%';
    if (p?.done) { card.classList.add('done'); meta.textContent = '✓ נלמד'; btn.textContent = 'קרא שוב'; }
    else if (p && p.frac > 0.01) { meta.textContent = `נקרא ${Math.round(p.frac * 100)}%`; btn.textContent = 'המשך'; }
    btn.setAttribute('aria-label', `${btn.textContent} – ${UNITS[u].he}`);
    describe(plan, u).then(t => { card.querySelector('[data-what]').textContent = t; }).catch(() => { card.querySelector('[data-what]').textContent = 'שגיאה בטעינה – בדקו חיבור'; });
  }
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
  <fieldset><legend>אופן קריאה</legend>${radio('layout', prefs.layout, [['pages', 'עמודים (דפדוף)'], ['scroll', 'גלילה רציפה']])}</fieldset>
  ${check('taamim', prefs.taamim, 'הצג טעמי המקרא (בחומש ובתהילים)')}
  ${check('rashi', prefs.rashi, 'הצג פירוש רש״י בחומש')}
  <fieldset><legend>ביאור מילים</legend>${radio('gloss', prefs.gloss, [['tap', 'בלחיצה על מילה'], ['inline', 'מעל המילה'], ['off', 'כבוי']])}</fieldset>
  ${check('wakeLock', prefs.wakeLock, 'השאר את המסך דולק בזמן קריאה')}`;
}
function ttsForm() {
  return `
  <div id="voice-warn"></div>
  <label class="field"><span>קול</span><select name="ttsVoice" id="voice-sel"><option value="">ברירת מחדל (עברית)</option></select></label>
  <label class="field"><span>מהירות: <output id="o-rate">${prefs.ttsRate}</output></span><input type="range" name="ttsRate" min="0.6" max="1.6" step="0.05" value="${prefs.ttsRate}"></label>
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
  <table class="src"><thead><tr><th>חלק</th><th>גרסה</th><th>רישיון</th><th>קישור</th><th>הערות</th></tr></thead><tbody>
  ${row('חומש ותהילים', s.tanakh, 'מנוקד ומוטעם')}
  ${row('פירוש רש״י', s.rashi, 'מנוקד; דיבורי המתחיל אינם מנוקדים')}
  ${row('תניא', s.tanya, 'מנוקד. רישיון לשימוש לא מסחרי בלבד (NC)')}
  ${row('משנה תורה לרמב״ם', s.rambam, 'מנוקד')}
  ${ov.map(([n, m]) => row('רמב״ם – ' + Locale.gettext(n, 'he-x-NoNikud'), { ...m, sefariaUrl: 'https://www.sefaria.org/' + encodeURIComponent('Mishneh Torah, ' + n) }, /Torat Emet/.test(m.versionTitle) ? 'מנוקד' : '<b>לא מנוקד</b> – אין גרסה מנוקדת ברישיון פתוח')).join('')}
  </tbody></table>
  <h2>ביאור מילים</h2><p>הביאורים הקצרים לקוחים מ<a href="https://he.wiktionary.org" target="_blank" rel="noopener">ויקימילון</a> (CC BY-SA 4.0). לכל ביאור מצורף קישור לערך המקור. רשימת הביאורים חלקית – ראו ״אודות ומגבלות״.</p>
  <h2>לוח השיעורים</h2><p>חישוב התאריך העברי, פרשת השבוע, חלוקת התהילים, תניא יומי ורמב״ם יומי: ספריות <a href="https://github.com/hebcal" target="_blank" rel="noopener">Hebcal</a> (‎@hebcal/core – GPL-2.0, ‎@hebcal/learning ו-‎@hebcal/leyning – BSD-2). החישוב נעשה במכשיר, ללא רשת.</p>
  <h2>גופנים</h2><p>Noto Serif Hebrew, Frank Ruhl Libre, Ezra SIL – כולם ברישיון SIL Open Font License 1.1 (<a href="fonts/licenses/NotoSerifHebrew-OFL.txt">נוטו</a>, <a href="fonts/licenses/FrankRuhlLibre-OFL.txt">פרנק־רוהל</a>, <a href="fonts/licenses/EzraSIL-OFL.txt">עזרא</a>).</p>
  <h2>קוד</h2><p>קוד האתר פתוח ברישיון GPL-2.0-or-later: <a href="https://github.com/dudidd-wq/chitas-reader" target="_blank" rel="noopener">github.com/dudidd-wq/chitas-reader</a>.</p>`;
}
function renderAbout() {
  shell('אודות ומגבלות', `
  <p>אתר לקריאת שיעורי חת״ת (חומש עם רש״י, תהילים, תניא) ורמב״ם יומי, בטקסט מנוקד ובתצוגה דמוית נייר, עם אפשרות שהדפדפן יקריא את הטקסט. עובד גם ללא רשת לאחר טעינה, ואינו אוסף מידע: אין חשבון, אין מעקב ואין שליחת נתונים.</p>
  <h2>לוח השיעורים</h2><ul>
  <li>החומש לפי המנהג: בכל יום עולה אחת מפרשת השבוע (ראשון – ראשון … שבת – שביעי). בשבוע שבו השבת היא יום טוב – לומדים את הפרשה של השבת הבאה. מאחרי השבת האחרונה של השנה ועד שמחת תורה – ״וזאת הברכה״.</li>
  <li>תהילים לפי ימי החודש; בחודש חסר לומדים ביום כ״ט גם את של יום ל׳.</li>
  <li>תניא יומי לפי הלוח המקובל (מחזור שנתי החל מי״ט כסלו).</li>
  <li>הלוח נבדק אוטומטית מול לוח השיעורים של Chabad.org (חוץ לארץ) לכל יום בטווח של יותר משנתיים – ראו קובץ verification במאגר.</li>
  <li>היום מתחלף בחצות לפי שעון המכשיר (ולא בשקיעה).</li></ul>
  <h2>ניקוד</h2><ul><li>כל הטקסטים מנוקדים, חוץ מכמה ספרים ברמב״ם (ספר אהבה ופרקי ההקדמה) שלא נמצאה להם גרסה מנוקדת ברישיון פתוח. בטקסטים אלה מוצגת הודעה.</li></ul>
  <h2>ביאור מילים</h2><ul><li>הביאורים קצרים (עד 4 מילים) ומועתקים מוויקימילון בלבד; לא נוספו ביאורים ״מהראש״ ולא נוצרו אוטומטית.</li><li>כדי למנוע ביאור שגוי, מילה מבוארת רק כשערך ויקימילון עצמו מצטט את <b>אותו פסוק</b> כדוגמה לאותה משמעות. לכן יש ביאורים רק בחומש ובתהילים (כ־1,000 מילים בכל התורה ותהילים), ולא ברש״י, בתניא וברמב״ם.</li></ul>
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
    .replace(/\{([פס])\}/g, '<span class="pe" aria-hidden="true">$1</span>');
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
  <div class="r-top">
    <a class="btn ghost" href="#/d/${iso}" aria-label="חזרה לדף הבית">${ICON.back}</a>
    <div class="r-title"><b id="r-t">${esc(UNITS[unit].full)}</b><small id="r-s">${esc(plan.hebDate)}</small></div>
    <button class="btn ghost" id="b-tts" aria-label="הקראה">${ICON.speak}</button>
    <button class="btn ghost" id="b-aa" aria-label="הגדרות תצוגה">${ICON.aa}</button>
    <button class="btn ghost" id="b-full" aria-label="מסך מלא">${ICON.full}</button>
  </div>
  <div class="r-viewport ${prefs.layout}" id="vp"><article class="r-content" id="rc" lang="he" aria-live="off"><p>טוען…</p></article></div>
  <div class="r-bottom" id="rb">
    <div class="progress" aria-hidden="true"><i id="pbar"></i></div>
    <button class="btn ghost" id="b-prev" aria-label="עמוד קודם">${ICON.prev}</button>
    <span class="pageinfo" id="pinfo" aria-live="polite"></span>
    <div class="tts-ctl" id="ttsctl" hidden>
      <button class="btn ghost" id="t-back" aria-label="קטע קודם">${ICON.fwd}</button>
      <button class="btn" id="t-play" aria-label="הפעל">${ICON.play}</button>
      <button class="btn ghost" id="t-fwd" aria-label="קטע הבא">${ICON.rew}</button>
      <button class="btn ghost" id="t-stop" aria-label="עצור">${ICON.stop}</button>
      <label class="sr" for="t-rate">מהירות</label>
      <select id="t-rate">${[0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5].map(r => `<option value="${r}" ${Math.abs(r - prefs.ttsRate) < 0.01 ? 'selected' : ''}>×${r}</option>`).join('')}</select>
    </div>
    <span style="flex:1" id="spacer"></span>
    <button class="btn ghost" id="b-next" aria-label="עמוד הבא">${ICON.next}</button>
  </div>
  <div class="thin-progress" aria-hidden="true"><i id="tbar"></i></div>
  <div class="sheet" id="sheet" hidden role="dialog" aria-label="הגדרות"></div>`;
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
async function renderDoc() {
  const d = R.doc, rc = $('#rc');
  const showRashi = prefs.rashi && R.unit === 'chumash';
  const inline = d.tanakh && !showRashi;
  let html = `<h1>${esc(d.title)}</h1><p class="doc-sub">${esc(d.subtitle)}</p>`;
  const allText = d.blocks.filter(b => b.text).map(b => b.text).join(' ');
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
function layout() {
  const vp = $('#vp'), rc = $('#rc');
  vp.className = 'r-viewport ' + prefs.layout;
  if (prefs.layout === 'pages') {
    const W = vp.clientWidth;
    const fs = prefs.size;
    const P = Math.min(W - 40, Math.round(fs * 30));
    const gap = W - P;
    rc.style.width = P + 'px'; rc.style.columnWidth = P + 'px'; rc.style.columnGap = gap + 'px';
    rc.style.right = gap / 2 + 'px'; rc.style.left = 'auto';
    const end = $('#endmark');
    const rcR = rc.getBoundingClientRect().right + R.page * W; // undo transform
    const endL = end ? end.getBoundingClientRect().left + R.page * W : 0;
    R.W = W;
    R.pages = Math.max(1, Math.round((rcR - endL - P) / W) + 1);
    if (R.pages < 1 || !isFinite(R.pages)) R.pages = 1;
    R.page = Math.min(R.page, R.pages - 1);
    setPage(R.page, false);
  } else {
    rc.style.cssText = '';
    updateProgress();
  }
}
function setPage(n, save = true) {
  R.page = Math.max(0, Math.min(R.pages - 1, n));
  $('#rc').style.transform = `translateX(${R.page * R.W}px)`;
  updateProgress(save);
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
    $('#pinfo').textContent = `עמוד ${R.page + 1} מתוך ${R.pages}`;
  } else {
    const vp = $('#vp'); const max = vp.scrollHeight - vp.clientHeight;
    frac = max <= 0 ? 1 : vp.scrollTop / max;
    $('#pinfo').textContent = `${Math.round(frac * 100)}%`;
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
  const toggleChrome = force => el.classList.toggle('immersive', force);
  $('#b-prev').onclick = () => turn(-1);
  $('#b-next').onclick = () => turn(1);
  $('#b-full').onclick = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
    toggleChrome(true);
  };
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
  $('#t-rate').onchange = e => { setPref('ttsRate', Number(e.target.value)); R.speaker?.setRate(prefs.ttsRate); };
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
  sh.innerHTML = `<h2>${kind === 'tts' ? 'הקראה' : 'תצוגה'}<button class="btn ghost" id="sh-x" aria-label="סגירה">${ICON.close}</button></h2>
    <form class="form" onsubmit="return false">${kind === 'tts' ? `<button class="btn primary" id="sh-play" type="button">${R.speaker?.state === 'playing' ? 'השהה הקראה' : 'התחל הקראה מהעמוד הנוכחי'}</button>` + ttsForm() : displayForm()}</form>`;
  sh.hidden = false;
  $('#sh-x').onclick = closeSheet;
  $('#sh-x').focus();
  const sp = $('#sh-play'); if (sp) sp.onclick = () => { closeSheet(); ttsToggle(); };
  bindForm(sh.querySelector('form'), async name => {
    if (['taamim', 'rashi', 'gloss', 'font'].includes(name)) { const s = currentSeg()?.dataset.id; await renderDoc(); if (s) goToSeg(s, false); }
    else if (['size', 'lineHeight', 'layout'].includes(name)) { const s = currentSeg()?.dataset.id; layout(); if (s) goToSeg(s, false); }
    else if (name === 'wakeLock') requestWake();
    else if (name.startsWith('tts') && R.speaker && name !== 'ttsRate') { const st = R.speaker.state; R.speaker.stop(true); R.speaker = null; if (st === 'playing') ttsToggle(); }
    else if (name === 'ttsRate') R.speaker?.setRate(prefs.ttsRate);
  });
}
function closeSheet() { $('#sheet').hidden = true; }

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
async function ttsToggle() {
  if (!ttsSupported()) { toast('הדפדפן אינו תומך בהקראה'); return; }
  if (R.speaker) { R.speaker.toggle(); return; }
  const unit = R.unit, iso = R.iso;
  await waitForVoices();
  if (R.unit !== unit || R.iso !== iso || R.speaker) return;
  R.speaker = new Speaker({
    onSegment: i => {
      R.segs.forEach(s => s.classList.remove('speaking'));
      const el = R.segs[i]; if (!el) return;
      el.classList.add('speaking');
      if (prefs.layout === 'pages') { const p = pageOf(el); if (p !== R.page) setPage(p); }
      else { const r = el.getBoundingClientRect(), vh = $('#vp').clientHeight; if (r.top < 60 || r.top > vh * 0.7) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    },
    onState: st => {
      $('#ttsctl').hidden = st === 'stopped' && !R.ttsShown;
      $('#rb').classList.toggle('speaking', st !== 'stopped');
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
      R.speaker = null; R.ttsShown = false; $('#ttsctl').hidden = true;
      toast(TTS_ERR[code] || `ההקראה נעצרה בגלל שגיאה במנוע הדיבור (${code}). השיעור לא סומן כנלמד.`);
      if (code === 'no-voice') openSheet('tts');
    },
  });
  R.speaker.load(ttsSegments(), { rate: prefs.ttsRate, voice: prefs.ttsVoice, stress: prefs.ttsStress, divineName: prefs.ttsDivine, lockscreen: prefs.ttsLockscreen },
    { title: R.doc.title + ' – ' + R.doc.subtitle, album: dayPlan(R.iso, { il: prefs.il }).hebDate });
  const cur = currentSeg();
  R.ttsShown = true; $('#ttsctl').hidden = false;
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
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
