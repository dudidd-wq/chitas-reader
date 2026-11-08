import { CHOL } from './chol.js';
import { dayPlan, isoDate, toHDate, HDate, Locale, gem, fmtDmy, parseDmy, gregLongHe, hashPinsDate } from './calendar.js';
import { buildDoc, describe, filesFor, UNITS, data, LICENSE_URL, WIKISOURCE_DEED, WS_TANYA, licenseLabel, siddurIndex, siddurOrder, siddurFiles, buildSiddurBookDoc, markSectionLabels } from './texts.js';
import { divineName, unAbbr } from './divine.js';
import { suggest, insertionLines, noTachanunAt, siddurDay, shabbatOrYomTov } from './tefila.js';
import { prefs, setPref, TTS_RATES, snapRate, getProgress, setProgress, clearProgress, exportBackup, importBackup, resetAll, DEFAULT_PREFS, isDivergent } from './store.js';
import { Speaker, ttsSupported, hebrewVoices, onVoices, waitForVoices, isNetworkVoice } from './tts.js';
import { RE_TAAMIM, vowelHeadword } from './tts-prep.js';
import { PiperSpeaker, piperSupported, voiceStatus, installVoice, removeVoice, voiceBytes, mb } from './piper.js';
import { applyGlosses, loadGlossary } from './gloss.js';
import { pageGeometry } from './layout.js';
import { fixNiqqud } from './niqqud.js';
import { CITIES, cityById, computeZmanim, fmtTime } from './zmanim.js';
import { hebDateHe } from './calendar.js';
import { renderKivun, stopKivun, COMPASS } from './kivun-ui.js';
import { personalChapter, rebbeChapter, cleanProfile, MAX_CHAPTER, REBBE_BIRTH } from './personal.js';
import { libNode, libDoc, FAMILIES } from './library.js';
import { renderLibrary, renderSearch, SEARCH_ICON, LIB_ICON } from './library-ui.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  aa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 19l5-14 5 14M5 14h6M15 19l3.5-9 3.5 9M16 16h5"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
  rew: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function applyPrefs() {
  const r = document.documentElement;
  r.dataset.theme = prefs.theme; r.dataset.font = prefs.font; r.dataset.readingBold = String(prefs.readingBold);
  r.style.setProperty('--reading-weight', prefs.readingBold ? '700' : '400');
  r.style.setProperty('--size', prefs.size + 'px'); r.style.setProperty('--lh', prefs.lineHeight);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(r).getPropertyValue('--paper').trim() || '#f6f1e3';
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
let toastAfterNav = ''; // a message meant for the screen being navigated to
/** a status message belongs to the screen it was shown on: drop it when the user navigates (review 3) */
function clearToast() { const t = $('#toast'); if (!t) return; clearTimeout(toast.t); t.classList.remove('show'); t.textContent = ''; }
const todayIso = () => isoDate(new HDate(new Date()));
const unitsFor = () => ['chumash', 'tehillim', 'tanya', 'hayomyom', ...(prefs.rambamTrack === '1' ? ['rambam1'] : prefs.rambamTrack === '3' ? ['rambam3'] : ['rambam3', 'rambam1']), ...(prefs.lessonMitzvot ? ['mitzvot'] : []), ...(prefs.lessonTolt ? ['tolt'] : []), ...(prefs.lessonRavYomi ? ['ravyomi'] : [])];
// Dates shown to the reader: Israeli order only (2 בנובמבר 2026 / 02/11/2026); ISO stays in URLs and storage keys.
const gregHe = iso => gregLongHe(iso);
const dayDates = (plan, iso) => `${plan.hebDate} · ${fmtDmy(iso)}`;
const dayDatesHtml = (plan, iso) => `<bdi>${esc(plan.hebDate)}</bdi><i aria-hidden="true"> · </i><bdi dir="ltr">${esc(fmtDmy(iso))}</bdi>`;
const shiftIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDate(new HDate(new Date(y, m - 1, d + n))); };

// ---------------- Zmanim ----------------
// The place for "זמני היום": a built-in city, or the device position (only when the user taps "המיקום שלי"; kept in
// localStorage, never sent anywhere). Before a choice: a city in the device's time zone, else Jerusalem.
const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'; } catch { return 'Asia/Jerusalem'; } };
// 1.0.72/1.0.74: which day-dependent siddur spans to hide (settings tachanunMode / shabbatMode: off | date | always)
function sidTimes() {
  try {
    const z = computeZmanim(todayIso(), zmanPlace(), { candleMins: prefs.candleMins });
    const ch = z.rows.find(r => r.key === 'chatzot')?.opts?.[0]?.t;
    return { sunset: z.sunset instanceof Date ? z.sunset : null, chatzot: ch instanceof Date ? ch : null };
  } catch { return { sunset: null, chatzot: null }; }
}
function sidHideTach() {
  if (prefs.tachanunMode === 'always') return true;
  if (prefs.tachanunMode !== 'date') return false;
  return noTachanunAt(new Date(), { ...sidTimes(), il: prefs.il });
}
function sidHideShabbat() {
  if (prefs.shabbatMode === 'always') return true;
  if (prefs.shabbatMode !== 'date') return false;
  return shabbatOrYomTov(siddurDay(new Date(), sidTimes().sunset), prefs.il);
}
const sidOpts = () => ({ lang: prefs.siddurLang, hideNoTachanun: sidHideTach(), hideShabbat: sidHideShabbat(), hideInstructions: prefs.hideSiddurInstructions });
function zmanPlace() {
  if (prefs.zmanPlace === 'geo' && prefs.zmanGeo) return { id: 'geo', he: 'המיקום שלי', ...prefs.zmanGeo, il: guessIsrael(), candles: 18 };
  return cityById(prefs.zmanPlace) || (guessIsrael() ? cityById('jerusalem') : CITIES.find(c => c.tz === deviceTz()) || cityById('jerusalem'));
}
const ZMAN_TEASER = ['alot', 'misheyakir', 'netz', 'shma', 'tefila', 'chatzot', 'minchaGedola', 'plag', 'shkia', 'tzeit'];
function zmanTeaser() {
  let line = '';
  try {
    const pl = zmanPlace(), z = computeZmanim(currentDate, pl, { candleMins: prefs.candleMins });
    const now = Date.now(), isToday = currentDate === todayIso();
    const items = [...z.special.filter(x => x.r).map(x => ({ he: x.he, r: x.r })), ...z.rows.filter(r => ZMAN_TEASER.includes(r.key)).map(r => ({ he: r.he, r: r.opts[0].r }))].filter(x => x.r).sort((a, b) => a.r - b.r);
    const nxt = isToday ? items.find(x => x.r > now) : z.special[0] || items.find(x => /^סוף זמן קריאת/.test(x.he));
    line = nxt ? `${isToday ? 'הבא: ' : ''}${esc(nxt.he)} <time dir="ltr">${fmtTime(nxt.r, pl.tz)}</time>` : '';
    line = `<span class="zt-place">${esc(pl.he)}</span>${line ? `<span class="zt-next">${line}</span>` : ''}`;
  } catch { /* computed on the device; nothing to show */ }
  return `<a class="zm-teaser" id="zm-teaser" href="#/zmanim/${currentDate}"><span class="zt-h">זמני היום</span>${line}<span class="go">פתח</span></a>`;
}
function renderZmanim() {
  const iso = currentDate, plan = dayPlan(iso, { il: prefs.il }), pl = zmanPlace();
  const z = computeZmanim(iso, pl, { candleMins: prefs.candleMins });
  const tm = d => `<time dir="ltr">${fmtTime(d, pl.tz)}</time>`;
  document.title = `זמני היום – ${pl.he} – ${plan.hebDate} (${fmtDmy(iso)})`;
  const opt = c => `<option value="${c.id}" ${c.id === pl.id ? 'selected' : ''}>${esc(c.he)}</option>`;
  const nearPole = z.rows.some(r => r.opts.some(o => !o.r));
  shell('זמני היום', `
  <p class="zm-date"><b>${esc(plan.hebDate)}</b> · ${esc(gregLongHe(iso, { weekday: true }))}</p>
  <nav class="datebar zm-nav" aria-label="בחירת יום">
    <a class="btn" href="#/zmanim/${shiftIso(iso, -1)}" aria-label="היום הקודם, ${fmtDmy(shiftIso(iso, -1))}">${ICON.prev}<span>הקודם</span></a>
    ${iso === todayIso() ? '' : `<a class="btn today" href="#/zmanim/${todayIso()}">היום</a>`}
    <a class="btn" href="#/zmanim/${shiftIso(iso, 1)}" aria-label="היום הבא, ${fmtDmy(shiftIso(iso, 1))}"><span>הבא</span>${ICON.next}</a>
  </nav>
  <div class="zm-place">
    <label for="zm-city">מקום</label>
    <select id="zm-city">
      ${prefs.zmanGeo ? `<option value="geo" ${pl.id === 'geo' ? 'selected' : ''}>המיקום שלי (${prefs.zmanGeo.lat.toFixed(2)}, ${prefs.zmanGeo.lon.toFixed(2)})</option>` : ''}
      <optgroup label="ארץ ישראל">${CITIES.filter(c => c.il).map(opt).join('')}</optgroup>
      <optgroup label="חוץ לארץ">${CITIES.filter(c => !c.il).map(opt).join('')}</optgroup>
    </select>
    <button class="btn" type="button" id="zm-geo">${PIN}<span>המיקום שלי</span></button>
  </div>
  <p class="note" id="zm-geo-st" role="status" aria-live="polite">${pl.id === 'geo' ? `לפי המיקום שנשמר במכשיר; שעון: <bdi dir="ltr">${esc(pl.tz)}</bdi>` : prefs.zmanPlace ? '' : 'לא נבחר מקום – מוצג ' + esc(pl.he) + ' כברירת מחדל.'}</p>
  <p class="zm-kivun"><a href="#/kivun">${COMPASS}<span>כיוון התפילה (מצפן)</span></a></p>
  ${z.special.length ? `<ul class="zm-special">${z.special.map(x => `<li><span><b>${esc(x.he)}</b><small>${esc(x.op)}</small></span>${tm(x.r)}</li>`).join('')}</ul>` : ''}
  <ul class="zm-list">${z.rows.map(r => `
    <li class="zm-row" data-z="${r.key}">
      <div class="zm-main"><span><b>${esc(r.he)}</b><small>${esc(r.opts[0].op)}</small></span>${tm(r.opts[0].r)}</div>
      ${r.opts.length > 1 ? `<ul class="zm-alt">${r.opts.slice(1).map(o => `<li><span>${esc(o.op)}</span>${tm(o.r)}</li>`).join('')}</ul>` : ''}
    </li>`).join('')}
  </ul>
  ${z.sunset ? `<p class="note zm-heb">התאריך העברי מתחלף בשקיעה: מהשקיעה (${tm(z.sunset)}) מתחיל ${esc(hebDateHe(z.nextHeb))}.</p>` : ''}
  <h2>הדלקת נרות</h2>
  <div class="zm-place"><label for="zm-cand">דקות לפני השקיעה</label>
    <select id="zm-cand"><option value="0" ${!prefs.candleMins ? 'selected' : ''}>לפי העיר (${pl.candles || 18})</option>${[18, 20, 22, 30, 40].map(m => `<option value="${m}" ${prefs.candleMins === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
  <h2>על החישוב</h2>
  <ul class="zm-notes">
    <li><b>הזמנים מחושבים ואינם תחליף ללוח מקומי:</b> יש לבדוק מול לוח הזמנים של הקהילה או הרב המקומי, ובזמנים צמודים – להחמיר.</li>
    <li>החישוב נעשה במכשיר, גם בלי רשת, בספריית Hebcal (אלגוריתם NOAA), בגובה פני הים (כמו Hebcal ו-Chabad.org), לפי קואורדינטות מרכז העיר. בשורה הראשונה – שיטת אדמו״ר הזקן כפי שמפרסם Chabad.org; מתחת – שיטות נוספות.</li>
    <li>עיגול לחומרה: זמן אחרון (סוף זמן ק״ש ותפילה, שקיעה, הדלקת נרות, חצות) מעוגל כלפי מטה; זמן מוקדם ביותר (עלות השחר, משיכיר, הנץ, מנחה, פלג, צאת הכוכבים) – כלפי מעלה.</li>
    <li>נבדק מול Hebcal ומול Chabad.org: 8 ערים × 7 תאריכים (ועוד 6 ערים בתאריך אחד), כולל ערב שבת, מוצאי שבת, ערב פסח, מעבר לשעון קיץ וקיץ בלונדון ובמוסקבה – הפרש של עד דקה.</li>
    <li>הדלקת נרות: 18 דקות לפני השקיעה, בירושלים 40 ובחיפה 30 (כך ב-Hebcal וב-Chabad.org). מנהגים מקומיים שונים: Hebcal משתמש ב-20 דקות בשאר הערים בארץ, ו-Chabad.org ב-22 בתל אביב וב-30 באילת – אפשר לבחור למעלה. צאת השבת והחג: 8.5°.</li>
    ${nearPole ? '<li>״—״: בעונה זו השמש אינה יורדת עד הזווית הזו במקום הזה, ולכן אין זמן לפי שיטה זו (Chabad.org מציג אז את חצות הלילה כעלות השחר).</li>' : ''}
    <li>״המיקום שלי״: המיקום נקרא רק כשלוחצים על הכפתור, נשמר במכשיר בלבד ואינו נשלח לשום מקום; השעות מוצגות לפי אזור הזמן של המכשיר.</li>
  </ul>`);
  $('#zm-city').onchange = e => { setPref('zmanPlace', e.target.value); renderZmanim(); $('#zm-city').focus(); };
  $('#zm-cand').onchange = e => { setPref('candleMins', Number(e.target.value) || 0); renderZmanim(); $('#zm-cand').focus(); };
  $('#zm-geo').onclick = () => {
    const st = $('#zm-geo-st');
    if (!navigator.geolocation) { st.textContent = 'הדפדפן אינו תומך באיתור מיקום.'; return; }
    st.textContent = 'מאתר מיקום…';
    navigator.geolocation.getCurrentPosition(p => {
      const r3 = x => Math.round(x * 1000) / 1000;
      setPref('zmanGeo', { lat: r3(p.coords.latitude), lon: r3(p.coords.longitude), tz: deviceTz() }); setPref('zmanPlace', 'geo');
      renderZmanim(); $('#zm-geo')?.focus();
    }, () => { st.textContent = 'לא התקבל מיקום (ההרשאה נדחתה או שאינו זמין). אפשר לבחור עיר מהרשימה.'; }, { timeout: 15000, maximumAge: 600000 });
  };
}

// ---------------- Router ----------------
let currentDate = todayIso();
/** Overnight / soft resume: if the civil day moved on and the URL does not pin a date, snap and re-render. */
function snapDateOnResume() {
  const today = todayIso();
  if (hashPinsDate(location.hash) || currentDate === today) return false;
  currentDate = today;
  return true;
}
function route() {
  const [h, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [view, a, b] = h.split('/'), params = new URLSearchParams(qs);
  // Unpinned views always use today's civil date (refresh / soft nav must not keep yesterday).
  if (!hashPinsDate(location.hash)) currentDate = todayIso();
  libSeq++; // a pending library lookup is stale once the address changes
  clearToast();
  if (toastAfterNav) { toast(toastAfterNav); toastAfterNav = ''; }
  if (view !== 'r' && view !== 's' && view !== 'lib') closeReader();
  stopKivun();
  autoPrefetch();
  if (view === 'r' && UNITS[a] && a !== 'siddur') { openReader(a, /^\d{4}-\d\d-\d\d$/.test(b) ? b : currentDate); return; }
  if (view === 's' && /^[a-z]+$/.test(a) && /^\d+$/.test(b)) { openReader('siddur', currentDate, `${a}/${+b}`, params.get('s') ? { seek: params.get('s') } : null); return; }
  if (view === 'lib') return libRoute(h.slice(4), params.get('s'));
  if (view === 'search') { closeReader(); return renderSearch(params.get('q') || '', params.get('in') || '', { shell, $, prefs }); }
  if (view === 'siddur') return renderSiddur();
  if (view === 'kivun') return renderKivun({ prefs, setPref, esc, $, shell, PIN, zmanPlace });
  if (view === 'settings') return renderSettings();
  if (view === 'sources') return renderSources();
  if (view === 'about') return renderAbout();
  if (view === 'tehillim') return renderPersonal(/^\d{1,3}$/.test(a || '') ? +a : 0);
  if (view === 'zmanim') { if (/^\d{4}-\d\d-\d\d$/.test(a)) currentDate = a; return renderZmanim(); }
  if (view === 'd' && /^\d{4}-\d\d-\d\d$/.test(a)) currentDate = a;
  renderHome();
}
window.addEventListener('hashchange', route);
window.addEventListener('pageshow', e => { if (e.persisted && snapDateOnResume()) route(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && snapDateOnResume()) route(); });
// #/lib → the list of books; #/lib/<node> → its list; #/lib/<chapter>[?s=<segment>] → the reader (same as the lessons)
let libSeq = 0;
async function libRoute(path, seek) {
  path = decodeURIComponent(path || '').replace(/\/+$/, '');
  const my = ++libSeq;
  if (!path) { closeReader(); return renderLibrary('', libCtx()); }
  let r = null; try { r = await libNode(path); } catch { /* the book's index is not cached and we are offline */ }
  if (my !== libSeq) return;
  if (r?.node.leaf) return openReader(r.node.unit, currentDate, null, { path, seek, info: r });
  closeReader(); renderLibrary(path, libCtx());
}
const libCtx = () => ({ shell, $, getProgress, toast, prefs });

// ---------------- Home ----------------
const UNIT_MARK = { chumash: 'ח', tehillim: 'ת', tanya: 'ת', rambam3: 'ר', rambam1: 'ר', mitzvot: 'מ', tolt: 'ל', ravyomi: 'ש', hayomyom: 'ה' };
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const guessIsrael = () => { try { return /^Asia\/(Jerusalem|Tel_Aviv)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return true; } };
const locLabel = il => il ? 'ארץ ישראל' : 'חוץ לארץ';
// First visit (round 4): the two choices are equal – nothing is pre-selected and no lessons are listed until one is
// chosen. A reader opened by a direct link before that uses the device time-zone guess and says so (readerLocNote).
function locationPanel(first) {
  const cur = prefs.il;
  return `<section class="locq" id="locq" aria-labelledby="locq-h">
    <h2 id="locq-h">${first ? 'ברוכים הבאים! היכן אתם לומדים?' : 'בחירת לוח'}</h2>
    <p>פרשת השבוע – ולכן שיעור החומש – שונה לעיתים בין ארץ ישראל לחוץ לארץ (כשיום טוב שני של גלויות חל בשבת). ${first ? 'בחרו לוח כדי לראות את שיעורי היום; אפשר לשנות זאת בכל עת בהגדרות.' : ''}</p>
    <div class="locq-btns">
      <button class="btn ${!first && cur ? 'primary' : ''}" data-il="true"${first ? '' : ` aria-pressed="${cur}"`}>${PIN}ארץ ישראל</button>
      <button class="btn ${!first && !cur ? 'primary' : ''}" data-il="false"${first ? '' : ` aria-pressed="${!cur}"`}>${PIN}חוץ לארץ</button>
    </div></section>`;
}
// Date field: typed as dd/mm/yyyy whatever the browser locale; the calendar button opens the native picker
// (hidden input) and its choice is shown back in dd/mm/yyyy.
function bindDateField() {
  const t = $('#datepick'), n = $('#datenative'), err = $('#dateerr');
  const go = () => {
    const iso = parseDmy(t.value);
    if (!iso) { t.setAttribute('aria-invalid', 'true'); err.innerHTML = 'תאריך בתבנית יום/חודש/שנה, למשל <bdi dir="ltr">24/05/2026</bdi>'; return; }
    t.removeAttribute('aria-invalid'); err.textContent = '';
    if (iso !== currentDate) location.hash = '#/d/' + iso; else t.value = fmtDmy(iso);
  };
  t.addEventListener('change', go);
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  $('#calbtn').addEventListener('click', () => { try { n.showPicker(); } catch { t.focus(); t.select(); } });
  n.addEventListener('change', () => { if (n.value) { t.value = fmtDmy(n.value); go(); } });
}
async function renderHome(showLoc = false) {
  const plan = dayPlan(currentDate, { il: prefs.il });
  const isToday = currentDate === todayIso();
  const first = !prefs.locationChosen;
  const units = unitsFor();
  const v = $('#view');
  document.title = `חת״ת ורמב״ם – ${plan.hebDate} (${fmtDmy(currentDate)})`;
  v.innerHTML = `<div class="wrap home">
    <header class="hero">
      <nav class="hero-tools" aria-label="ספרייה וחיפוש"><a class="btn ghost" href="#/lib" aria-label="ספרייה – כל הספרים">${LIB_ICON}</a><a class="btn ghost" href="#/search" aria-label="חיפוש בכל הספרים">${SEARCH_ICON}</a></nav>
      <p class="kicker">${esc(plan.dayHe)}${isToday ? ' · <b>היום</b>' : ''}</p>
      <h1 class="hd">${esc(plan.hebDate)}</h1>
      <p class="sub">${esc(gregHe(currentDate))} · פרשת ${esc(plan.weekParsha)}</p>
      ${first ? '' : `<button class="chip" id="loc" aria-expanded="${showLoc}" aria-controls="locq">${PIN}<span>לוח ${locLabel(prefs.il)}</span><span class="sr"> – שינוי</span></button>`}
    </header>
    ${first || showLoc ? locationPanel(first) : ''}
    ${first ? '' : `    <nav class="datebar" aria-label="בחירת תאריך">
      <a class="btn" href="#/d/${shiftIso(currentDate, -1)}" aria-label="היום הקודם, ${fmtDmy(shiftIso(currentDate, -1))}">${ICON.prev}<span>הקודם</span></a>
      <span class="datefield">
        <label class="sr" for="datepick">תאריך (יום/חודש/שנה)</label>
        <input type="text" id="datepick" dir="ltr" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="10" placeholder="יי/חח/שששש" value="${fmtDmy(currentDate)}" aria-describedby="dateerr">
        <button type="button" class="btn icon" id="calbtn" aria-label="פתיחת לוח שנה">${ICON.cal}</button>
        <input type="date" id="datenative" value="${currentDate}" tabindex="-1" aria-hidden="true">
      </span>
      <a class="btn" href="#/d/${shiftIso(currentDate, 1)}" aria-label="היום הבא, ${fmtDmy(shiftIso(currentDate, 1))}"><span>הבא</span>${ICON.next}</a>
      ${isToday ? '' : `<a class="btn today" href="#/d/${todayIso()}">חזרה להיום</a>`}
      <p id="dateerr" class="dateerr" role="alert"></p>
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
    ${zmanTeaser()}
    ${personalTeaser()}
    ${tefilaCard()}
`}
    <footer class="home-foot">
      <button class="btn" id="dl30">שמירה לשימוש ללא רשת (30 יום)</button>
      <p class="note" id="dl-st" role="status" aria-live="polite"></p>
      <nav class="links" aria-label="קישורים">
        <a href="#/lib">ספרייה</a><a href="#/search">חיפוש בספרים</a><a href="#/zmanim/${currentDate}">זמני היום</a><a href="#/siddur">סידור</a><a href="#/kivun">כיוון התפילה</a><a href="#/tehillim">תהילים אישי</a><a href="#/settings">הגדרות</a><a href="#/sources">מקורות ורישיונות</a><a href="#/about">אודות ומגבלות</a>
      </nav>
      <p class="note">הנתונים נשמרים במכשיר בלבד · ללא מעקב</p>
    </footer>
  </div>`;
  $('#dl30').addEventListener('click', downloadAhead);
  v.querySelectorAll('#locq [data-il]').forEach(b => b.addEventListener('click', () => {
    setPref('il', b.dataset.il === 'true'); setPref('locationChosen', true);
    renderHome(); toast(`הלוח מוצג לפי ${locLabel(prefs.il)}`); $('#loc')?.focus();
  }));
  if (first) return;
  bindDateField();
  $('#loc').addEventListener('click', () => { renderHome(!showLoc); if (!showLoc) $('#locq [data-il]')?.focus(); });
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
// Round 5: it starts as soon as the worker controls the page (on a first visit: the moment it activates and claims it),
// not after a fixed delay – fetches made before that are not seen by the worker and would not be saved.
function swControlled(ms = 15000) {
  const sw = navigator.serviceWorker;
  if (sw.controller) return Promise.resolve(true);
  return new Promise(res => {
    const t = setTimeout(() => res(!!sw.controller), ms);
    sw.addEventListener('controllerchange', () => { clearTimeout(t); res(true); }, { once: true });
    sw.ready.then(() => { if (sw.controller) { clearTimeout(t); res(true); } }).catch(() => {});
  });
}
function autoPrefetch() {
  if (prefetched === currentDate || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const day = prefetched = currentDate;
  swControlled().then(async ok => {
    if (!ok) { if (prefetched === day) prefetched = ''; return; }   // try again on the next navigation
    for (let i = 0; i < 3; i++) { const plan = dayPlan(shiftIso(day, i), { il: prefs.il }); for (const u of unitsFor()) await Promise.all((await filesFor(plan, u).catch(() => [])).map(f => fetch('data/' + f).catch(() => {}))); }
    document.documentElement.dataset.prefetched = day;   // for tests
  });
}
async function downloadAhead() {
  const btn = $('#dl30'), st = $('#dl-st'); btn.disabled = true;
  try {
    const files = new Set(['tanya/index.json', 'rambam/index.json', 'glossary.json', 'sources.json']);
    for (let i = 0; i < 30; i++) {
      const plan = dayPlan(shiftIso(currentDate, i), { il: prefs.il });
      for (const u of unitsFor()) (await filesFor(plan, u)).forEach(f => files.add(f));
    }
    let n = 0, ok = 0;
    for (const f of files) { if (await fetch('data/' + f).then(r => r.ok).catch(() => false)) ok++; n++; if (n % 10 === 0) btn.textContent = `מוריד… ${Math.round(100 * n / files.size)}%`; }
    // ask the browser not to evict the saved texts (review 3); report the real answer, not a hope
    const persist = await persistStorage();
    const pmsg = persist === true ? 'הדפדפן אישר אחסון קבוע.'
      : persist === false ? 'הדפדפן לא אישר אחסון קבוע, ולכן ייתכן שימחק את השמירה אם יחסר מקום או לאחר זמן רב ללא שימוש (בעיקר ב-iPhone).'
      : 'הדפדפן אינו תומך בבקשת אחסון קבוע; ייתכן שימחק את השמירה אם יחסר מקום.';
    if (ok === files.size) { btn.textContent = '✓ נשמר ל-30 יום'; st.textContent = `הטקסטים ל-30 הימים הקרובים נשמרו במכשיר, והשמירה נשארת גם אחרי עדכוני האתר (מורדים מחדש רק קבצים שהשתנו). ${pmsg}`; }
    else { btn.textContent = 'שמירה חלקית – נסו שוב'; btn.disabled = false; st.textContent = `נשמרו ${ok} מתוך ${files.size} קבצים; חלק לא הורדו (בדקו חיבור). ${pmsg}`; }
    st.dataset.persisted = String(persist);
  } catch { btn.textContent = 'שגיאה בהורדה'; btn.disabled = false; st.textContent = 'ההורדה נכשלה – בדקו חיבור ונסו שוב.'; }
}
/** navigator.storage.persist(): true/false = the browser's answer, null = not supported */
async function persistStorage() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

// ---------------- Siddur: what to pray now (home) and the full table of contents ----------------
// Suggested by the day's zmanim at the chosen place; insertions are shown only where a calendar rule decides them.
function tefilaCard() {
  try {
    const pl = zmanPlace(), z = computeZmanim(currentDate, pl, { candleMins: prefs.candleMins });
    const isToday = currentDate === todayIso();
    const s = suggest(currentDate, z, isToday ? Date.now() : null, { il: prefs.il, jerusalem: pl.id === 'jerusalem' });
    const seen = new Set(), items = s.items.filter(i => { const k = `${i.book}/${i.n}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const lines = insertionLines(s.ins, prefs.il);
    return `<section class="tefila" aria-labelledby="tf-h">
      <div class="dayhead"><h2 id="tf-h">${isToday ? 'תפילה עכשיו' : 'תפילות היום'}</h2><span class="daysum">${esc(isToday ? s.he : 'נוסח חב״ד')}</span></div>
      <ul class="tf-list">${items.map(i => `<li><a href="#/s/${i.book}/${i.n}">${esc(i.he)}</a></li>`).join('')}</ul>
      <p class="tf-always"><span class="tf-always-lab">זמין תמיד</span> <a href="#/s/brachot/4">ברכת המזון</a></p>
      ${lines.length ? `<p class="tf-ins"><b>${s.period === 'night' ? 'בתפילת הערב' : 'היום'} אומרים:</b> ${lines.map(esc).join(' · ')}</p>` : ''}
      ${s.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
      <p class="tf-more"><a class="btn" href="#/siddur">הסידור המלא – תוכן וחיפוש</a> <a class="btn" href="#/kivun">${COMPASS}<span>כיוון התפילה</span></a></p>
    </section>`;
  } catch { return `<p class="tf-more"><a class="btn" href="#/siddur">סידור – נוסח חב״ד</a></p>`; }
}
// consonant skeleton: letters only, final forms folded – a search matches whatever the vowels, accents and mark order
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const skel = t => String(t).replace(/<[^>]*>/g, ' ').replace(/[^\u05D0-\u05EA]/g, '').replace(/[ךםןףץ]/g, c => FINAL[c]);
async function renderSiddur() {
  shell('סידור – נוסח חב״ד', '<p>טוען…</p>');
  document.title = 'סידור – נוסח חב״ד';
  let idx, srcs = {};
  try { idx = await siddurIndex(); } catch { $('.page').innerHTML = '<h1>סידור – נוסח חב״ד</h1><p role="alert">לא ניתן לטעון את תוכן הסידור – בדקו חיבור ונסו שוב.</p>'; return; }
  try { srcs = await data('sources.json'); } catch { /* offline */ }
  const m = srcs.siddur;
  const mark = (b, n) => { const p = getProgress('siddur', `${b}/${n}`); return p?.done ? '<span class="sd-done" aria-label="נקרא">✓</span>' : ''; };
  const groups = Object.entries(idx.groups).map(([g, gh]) => `<section class="sd-group" aria-labelledby="sg-${g}"><h2 id="sg-${g}">${esc(gh)}</h2>
    ${idx.books.filter(b => b.group === g).map(b => b.secs.length === 1
      ? `<h3 class="sd-book"><a href="#/s/${b.id}/1">${esc(b.he)}</a>${mark(b.id, 1)}</h3>`
      : `<h3 class="sd-book">${esc(b.he)}</h3><ol class="sd-secs">${b.secs.map((x, i) => `<li><a href="#/s/${b.id}/${i + 1}">${esc(x.he)}</a>${mark(b.id, i + 1)}</li>`).join('')}</ol>`).join('')}
  </section>`).join('');
  $('.page').innerHTML = `<h1>סידור – נוסח חב״ד</h1>
  <p>נוסח האריז״ל כמנהג חב״ד, מתוך התעתיק של שמואל גונזלס ב-<a href="https://opensiddur.org" target="_blank" rel="noopener" dir="ltr">Open Siddur Project</a> (ברישיון ${m ? licenseLink(m.license, m) : 'CC0'}; ההוראות באנגלית ב-${m ? licenseLink(m.instructionsLicense) : 'CC BY'}; ההנחיות מוצגות כברירת מחדל בתרגום לעברית שנעשה לאתר זה – אפשר לבחור בתצוגה ״אנגלית״ או ״שתיהן״). התעתיק נערך ״בהתאם לתהלת ה׳״, אך <b>אינו</b> סידור תהלת ה׳ עצמו; אפשר שיש בו הבדלים קטנים מהסידור המודפס. <a href="#/about">פרטים</a></p>
  <form class="sd-search" role="search" onsubmit="return false"><label for="sd-q">חיפוש בסידור</label>
    <input type="search" id="sd-q" placeholder="למשל: ובא לציון" autocomplete="off" aria-describedby="sd-st"><p class="note" id="sd-st" role="status" aria-live="polite"></p></form>
  <div id="sd-res"></div>
  <p class="sd-kivun"><a class="btn" href="#/kivun">${COMPASS}<span>כיוון התפילה – מצפן</span></a></p>
  <nav aria-label="תוכן הסידור" class="sd-toc">${groups}</nav>
  <section aria-labelledby="sd-miss-h"><h2 id="sd-miss-h">מה אין בסידור זה, ומדוע</h2><ul class="sd-miss">${idx.missing.map(x => `<li><b>${esc(x.he)}</b> – ${esc(x.why)}</li>`).join('')}</ul></section>
  <p><button class="btn" id="sd-dl">שמירת הסידור לשימוש ללא רשת</button></p><p class="note" id="sd-dl-st" role="status" aria-live="polite"></p>`;
  const q = $('#sd-q'), st = $('#sd-st'), res = $('#sd-res');
  let all = null, timer = 0, seq = 0;
  const load = async () => all ||= Promise.all((await siddurOrder()).map(async s => ({ ...s, doc: await data(`siddur/${s.book}/${s.n}.json`) })));
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(async () => {
    const my = ++seq, k = skel(q.value.replace(/(^|\s)([ובכלמשד]{0,2})ה['׳]/g, '$1$2יהוה')); // ה׳ typed = the name in the text
    if (k.length < 2) { res.innerHTML = ''; st.textContent = ''; return; }
    st.textContent = 'מחפש…';
    let secs; try { secs = await load(); } catch { all = null; st.textContent = 'החיפוש דורש את כל קבצי הסידור – בדקו חיבור, או שמרו את הסידור לשימוש ללא רשת.'; return; }
    if (my !== seq) return;
    const hits = [];
    for (const s of secs) {
      if (skel(s.he).includes(k)) { hits.push({ s, snip: '' }); continue; }
      for (const [t, h] of s.doc.b) {
        if (t === 'n') continue;
        // 1.0.61: a table block – its prayer cells and the Names / chart cells (not its instructions)
        const plain = (t === 't' ? h.flatMap(r => r.filter(c => c[0] === 'p' || c[0] === 'x').map(c => c[1])).join(' ') : h).replace(/<[^>]*>/g, ''), pos = []; let sk = '';
        for (let i = 0; i < plain.length; i++) { const c = plain[i]; if (c >= '\u05D0' && c <= '\u05EA') { sk += FINAL[c] || c; pos.push(i); } }
        const at = sk.indexOf(k);
        if (at >= 0) { const a = pos[at], b = pos[at + k.length - 1] + 1; hits.push({ s, snip: [plain.slice(Math.max(0, a - 50), a), plain.slice(a, b), plain.slice(b, b + 60)] }); break; }
      }
      if (hits.length >= 40) break;
    }
    const dn = x => divineName(esc(x), prefs.divine);
    res.innerHTML = hits.length ? `<ol class="sd-hits">${hits.map(({ s, snip }) => `<li><a href="#/s/${s.book}/${s.n}">${esc(s.bookHe)} – ${esc(s.he)}</a>${snip ? `<p>…${dn(snip[0])}<mark>${dn(snip[1])}</mark>${dn(snip[2])}…</p>` : ''}</li>`).join('')}</ol>` : '';
    st.textContent = hits.length ? `נמצאו ${hits.length >= 40 ? 'יותר מ־40' : hits.length} קטעים` : 'לא נמצא';
  }, 250); });
  $('#sd-dl').addEventListener('click', async () => {
    const b = $('#sd-dl'), s2 = $('#sd-dl-st'); b.disabled = true;
    try {
      const files = [...await siddurFiles(), 'sources.json']; let ok = 0;
      for (const [i, f] of files.entries()) { if (await fetch('data/' + f).then(r => r.ok).catch(() => false)) ok++; if (i % 10 === 0) b.textContent = `מוריד… ${Math.round(100 * i / files.length)}%`; }
      const persist = await persistStorage();
      b.textContent = ok === files.length ? '✓ הסידור נשמר' : 'שמירה חלקית – נסו שוב'; b.disabled = ok === files.length;
      s2.textContent = ok === files.length ? `כל ${files.length} קבצי הסידור נשמרו במכשיר.${persist === false ? ' הדפדפן לא אישר אחסון קבוע, ולכן ייתכן שימחק את השמירה אם יחסר מקום.' : ''}` : `נשמרו ${ok} מתוך ${files.length} קבצים (בדקו חיבור).`;
    } catch { b.textContent = 'שגיאה בהורדה'; b.disabled = false; }
  });
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
  <fieldset><legend>גופן</legend><div class="seg-ctl font-options" role="radiogroup" aria-label="גופן">${[['noto', 'נוטו סריף'], ['ezra', 'עזרא'], ['frank', 'פרנק־רוהל'], ['ashkenaz', 'טעמי אשכנז']].map(([v,l]) => `<label data-font="${v}"><span><input type="radio" name="font" value="${v}" ${prefs.font === v ? 'checked' : ''}>${l}</span><span class="font-sample" aria-hidden="true">תּוֹרָה אוֹר וְשִׂמְחַת לֵב</span></label>`).join('')}</div>
    ${check('readingBold', prefs.readingBold, 'הדגשת גופן הקריאה')}
    <small>בפרנק־רוהל ובעזרא הטעמים מוסתרים. נוטו וטעמי אשכנז כוללים ניקוד וטעמי מקרא.</small></fieldset>
  <label class="field"><span>גודל אות: <output id="o-size">${prefs.size}</output></span><input type="range" name="size" min="16" max="44" step="1" value="${prefs.size}"></label>
  <label class="field"><span>ריווח שורות: <output id="o-lh">${prefs.lineHeight}</output></span><input type="range" name="lineHeight" min="1.4" max="2.6" step="0.1" value="${prefs.lineHeight}"></label>
  <fieldset><legend>אופן קריאה</legend>${radio('layout', prefs.layout, [['pages', 'עמודים (דפדוף)'], ['scroll', 'גלילה רציפה']])}
    ${check('spread', prefs.spread, 'שני עמודים זה לצד זה במסך רחב')}</fieldset>
  ${check('taamim', prefs.taamim, 'הצג טעמי המקרא (בחומש ובתהילים)')}
  ${check('rashi', prefs.rashi, 'הצג פירוש רש״י בחומש')}
  <fieldset><legend>תצוגת שם ה׳</legend>${radio('divine', prefs.divine, [['full', 'מלא (יְהֹוָה)'], ['abbr', 'ה׳']])}
    <small>בכל הטקסטים. ההקראה אינה מושפעת – היא נשלטת בהגדרת ״הקראת שם ה׳״.</small></fieldset>
  <fieldset><legend>הנחיות בסידור</legend>${check('hideSiddurInstructions', prefs.hideSiddurInstructions, 'הסתר הנחיות בסידור')}<small>הסרת הוראות התפילה מהתצוגה ומההקראה בלבד. נוסח התפילה, כותרות הניווט וסימוני הדילוג נשמרים.</small></fieldset>
  <fieldset><legend>שפת ההנחיות בסידור</legend>${radio('siddurLang', prefs.siddurLang, [['he', 'עברית'], ['en', 'אנגלית'], ['both', 'שתיהן']])}
    </fieldset><fieldset><legend>קטעים שלא אומרים ביום שאין תחנון</legend>${radio('tachanunMode', prefs.tachanunMode, [['off', 'כבוי'], ['date', 'לפי התאריך'], ['always', 'תמיד']])}
    <small>״כבוי״ – הכול מוצג. ״לפי התאריך״ – ביום שאין אומרים בו תחנון (שבת, יו״ט, ראש חודש, ניסן וכו׳ לפי מנהג חב״ד; אחרי השקיעה – לפי היום הבא, ואחרי חצות היום גם לפני יום כזה, כמו שאין אומרים תחנון במנחה שלפניו) הקטעים המסומנים ״בימים שאין אומרים תחנון״ מוסתרים ואינם מוקראים; בשאר הימים מוצגים כרגיל. ״תמיד״ – מוסתרים בכל יום.</small></fieldset>
  <fieldset><legend>קטעים שלא אומרים בשבת ויום טוב</legend>${radio('shabbatMode', prefs.shabbatMode, [['off', 'כבוי'], ['date', 'לפי התאריך'], ['always', 'תמיד']])}
    <small>״לפי התאריך״ – בשבת וביום טוב (אחרי השקיעה – לפי היום הבא; ארץ ישראל/חו״ל לפי הלוח שנבחר) הקטעים המסומנים ״בשבת ויו״ט אין אומרים״ מוסתרים ואינם מוקראים. ״תמיד״ – מוסתרים בכל יום.</small></fieldset><fieldset><legend>הנחיות</legend>
    <small>ההנחיות שבתעתיק (מתי לעמוד, מה מוסיפים ביום טוב וכו׳) כתובות במקור באנגלית. העברית היא תרגום שנעשה לאתר זה; נוסח התפילה עצמו אינו משתנה.</small></fieldset>
  <fieldset><legend>ביאור מילים</legend>${radio('gloss', prefs.gloss, [['tap', 'בלחיצה על מילה'], ['inline', 'מעל המילה'], ['off', 'כבוי']])}</fieldset>
  ${check('studyNotes', prefs.studyNotes, 'הצג מראי מקומות (תניא, תורה אור ולקוטי תורה) וקישור לביאור קצר (רמב״ם) בסוף כל קטע')}
  ${check('wakeLock', prefs.wakeLock, 'השאר את המסך דולק בזמן קריאה')}
  ${R.doc && !$('#reader').hidden ? `<p class="note" id="sh-report-p"><a id="sh-report" href="${esc(reportUrl())}" target="_blank" rel="noopener">מצאת טעות? דיווח על טעות בעמוד זה</a> – נפתח טופס ב-GitHub עם פרטי המקום; דבר אינו נשלח עד שתאשר שם.</p>` : ''}`;
}
// 1.0.59: the local "quality voice". Nothing is downloaded until the reader presses #qv-dl.
function qvForm() {
  if (!piperSupported()) return `<fieldset id="qv"><legend>קול איכותי</legend><small>הדפדפן הזה אינו תומך בקול המקומי (WebAssembly / Web Audio); ההקראה משתמשת בקול הדפדפן.</small></fieldset>`;
  return `<fieldset id="qv"><legend>קול איכותי (פועל במכשיר, ניסיוני)</legend>
    ${radio('ttsEngine', prefs.ttsEngine, [['web', 'קול הדפדפן / המכשיר'], ['piper', 'קול איכותי (מקומי)']])}
    ${radio('ttsGender', prefs.ttsGender, [['male', 'קול גברי (ברירת מחדל)'], ['female', 'קול נשי']])}
    <small id="qv-gender-note">הקול הגברי הוא אותו קול (noa) בעיבוד אות במכשיר: הורדת גובה הצליל בכ־6 חצאי טון והורדת הפורמנטים בכ־12%, תוך שמירת העיצורים הלא־קוליים. אין הורדה נוספת. זהו גוון מלאכותי ולא קול של דובר אמיתי.</small>
    ${radio('ttsModel', prefs.ttsModel, [['full', `רגיל (${mb(voiceBytes('full'))} MB)`], ['int8', `קל, למכשירים חלשים (${mb(voiceBytes('int8'))} MB, איכות מעט נמוכה)`]])}
    <p id="qv-st" role="status" aria-live="polite">בודק…</p>
    <progress id="qv-prog" max="1" value="0" hidden></progress>
    <p class="row"><button type="button" class="btn" id="qv-dl" hidden>קול איכותי – הורדה</button> <button type="button" class="btn ghost" id="qv-del" hidden>מחיקת הקול מהמכשיר</button></p>
    <small>הקול מורד פעם אחת מאתר זה בלבד, נשמר במכשיר ופועל בלי רשת; הטקסט אינו נשלח לשום מקום. ההטעמה נקבעת לפי הדקדוק והטעמים (בתורה ובתהילים) ולפי מודל שנלמד מהם, ועלולות להיות שגיאות. קול: noa של Piper (CC BY 4.0); הגוון הגברי – עיבוד אות שלנו. פרטים בעמוד המקורות.</small>
  </fieldset>`;
}
async function bindQv(root) {
  const st = root.querySelector('#qv-st'); if (!st) return;
  const dl = root.querySelector('#qv-dl'), del = root.querySelector('#qv-del'), prog = root.querySelector('#qv-prog');
  const refresh = async () => {
    const s = await voiceStatus(), v = prefs.ttsModel, have = s[v];
    if (!st.isConnected) return;
    dl.hidden = have; del.hidden = !(s.full || s.int8);
    dl.textContent = `קול איכותי – הורדה חד-פעמית (${mb(voiceBytes(v))} MB)`;
    st.textContent = have ? `הקול ${v === 'int8' ? 'הקל' : 'הרגיל'} מותקן במכשיר.${prefs.ttsEngine === 'piper' ? ' ההקראה משתמשת בו.' : ' לבחירה: ״קול איכותי״ למעלה.'}`
      : `הקול ${v === 'int8' ? 'הקל' : 'הרגיל'} אינו מותקן. ההורדה מתבצעת רק בלחיצה על הכפתור.`;
  };
  root.addEventListener('input', e => {
    if (e.target.name === 'ttsModel' || e.target.name === 'ttsEngine') refresh();
    if (e.target.name === 'ttsGender' && R.speaker instanceof PiperSpeaker) R.speaker.setGender(e.target.value);
  });
  dl.onclick = async () => {
    const v = prefs.ttsModel; dl.disabled = true; prog.hidden = false; prog.value = 0;
    try {
      await installVoice(v, (d, t) => { prog.value = d / t; st.textContent = `מוריד… ${mb(d)} מתוך ${mb(t)} MB`; });
      setPref('ttsEngine', 'piper'); root.querySelectorAll('input[name=ttsEngine]').forEach(r => { r.checked = r.value === 'piper'; });
      R.piperBroken = false;
      if (R.speaker) { const was = R.speaker.state; R.speaker.stop(true); R.speaker = null; if (was === 'playing') ttsToggle(); }
      await refresh(); toast('הקול האיכותי הותקן');
    } catch (e) { st.textContent = `ההורדה נכשלה (${e.message}). ההקראה תמשיך בקול הדפדפן; אפשר לנסות שוב.`; }
    finally { dl.disabled = false; prog.hidden = true; }
  };
  del.onclick = async () => {
    if (R.speaker instanceof PiperSpeaker) { R.speaker.stop(); R.speaker = null; }
    await removeVoice(); setPref('ttsEngine', 'web'); root.querySelectorAll('input[name=ttsEngine]').forEach(r => { r.checked = r.value === 'web'; });
    await refresh(); toast('הקול האיכותי נמחק מהמכשיר');
  };
  refresh();
}
function ttsForm() {
  return `
  ${qvForm()}
  <div id="voice-warn"></div>
  <label class="field"><span>קול</span><select name="ttsVoice" id="voice-sel"><option value="">ברירת מחדל (עברית)</option></select></label>
  <small id="voice-net" hidden>קול המסומן ״מקוון״ אינו פועל במכשיר: הדפדפן שולח את הטקסט המוקרא לשרת של ספק הקול (למשל Google, Microsoft או Apple). ברירת המחדל היא תמיד קול מקומי, כשיש כזה.</small>
  <label class="field"><span>מהירות: <output id="o-rate">${prefs.ttsRate}</output></span><input type="range" name="ttsRate" min="${TTS_RATES[0]}" max="${TTS_RATES.at(-1)}" step="0.1" value="${prefs.ttsRate}"></label>
  ${check('ttsStress', prefs.ttsStress, 'הקראה בהטעמה – שליחת הטקסט המנוקד למנוע הדיבור (מומלץ)')}
  <fieldset><legend>הקראת שם ה׳</legend>${radio('ttsDivine', prefs.ttsDivine, [['hashem', '״השם״ / ״אלוקים״'], ['adonai', 'כבתפילה (אדנות)']])}</fieldset>
  ${check('ttsRashi', prefs.ttsRashi, 'הקרא גם את פירוש רש״י')}
  ${check('ttsSkipCites', prefs.ttsSkipCites, 'דלג על מראי מקום בסוגריים ברש״י וברמב״ם, כגון ״(שמות כ׳)״')}
  ${check('ttsContinuous', prefs.ttsContinuous, 'המשך אוטומטי לשיעור הבא')}
  ${check('ttsLockscreen', prefs.ttsLockscreen, 'פקדים במסך הנעילה (ניסיוני)')}`;
}
function bindForm(root, onChange) {
  root.addEventListener('input', e => {
    const el = e.target; if (!el.name || !(el.name in DEFAULT_PREFS)) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (typeof DEFAULT_PREFS[el.name] === 'number') v = Number(v);
    if (el.name === 'il') { v = v === 'true' || v === true; setPref('locationChosen', true); }
    setPref(el.name, v);
    if (el.name === 'font' && (v === 'frank' || v === 'ezra')) setPref('taamim', false);
    const o = root.querySelector('#o-' + ({ size: 'size', lineHeight: 'lh', ttsRate: 'rate' })[el.name]); if (o) o.textContent = v;
    applyPrefs(); onChange?.(el.name);
  });
  const sel = root.querySelector('#voice-sel'), warn = root.querySelector('#voice-warn');
  if (sel) onVoices(vs => {
    sel.innerHTML = '<option value="">ברירת מחדל (עברית)</option>' + vs.map(v => `<option value="${esc(v.name)}" ${v.name === prefs.ttsVoice ? 'selected' : ''}>${esc(v.name)}${isNetworkVoice(v) ? ' – מקוון (הטקסט נשלח לספק)' : ''}</option>`).join('');
    warn.innerHTML = vs.length ? '' : voiceHelp();
    const net = root.querySelector('#voice-net'); if (net) net.hidden = !vs.some(isNetworkVoice);
  });
  bindQv(root);
}
function voiceHelp() {
  if (!ttsSupported()) return '<p class="warn">הדפדפן הזה אינו תומך בהקראה (Web Speech API). נסו Chrome, Edge או Safari עדכניים.</p>';
  return `<div class="warn"><b>לא נמצא במכשיר קול עברי.</b> ההקראה עלולה להישמע לא נכון או לא לפעול. להתקנה:
  <ul><li><b>אנדרואיד:</b> הגדרות ← מערכת ← שפות וקלט ← פלט טקסט לדיבור ← מנוע Google ← התקנת נתוני קול ← עברית.</li>
  <li><b>אייפון/אייפד:</b> הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית (כרמית).</li>
  <li><b>Windows:</b> הגדרות ← זמן ושפה ← דיבור ← הוספת קולות ← עברית. (Edge מציע גם קולות ״טבעיים״ מקוונים; קולות כאלה שולחים את הטקסט ל-Microsoft, ולכן עדיף קול מותקן.)</li>
  <li><b>macOS:</b> הגדרות מערכת ← נגישות ← תוכן מוקרא ← קול מערכת ← ניהול קולות ← עברית.</li></ul>
  לאחר ההתקנה יש לרענן את הדף.</div>`;
}
function renderSettings() {
  shell('הגדרות', `<form class="form" id="sf" onsubmit="return false">
    <fieldset><legend>מיקום (לחישוב פרשת השבוע)</legend>${radio('il', prefs.il, [['true', 'ארץ ישראל'], ['false', 'חוץ לארץ']])}</fieldset>
    <fieldset><legend>רמב״ם</legend>${radio('rambamTrack', prefs.rambamTrack, [['3', 'ג׳ פרקים'], ['1', 'פרק אחד'], ['both', 'שניהם']])}</fieldset>
    <fieldset><legend>שיעורים נוספים</legend>${check('lessonMitzvot', prefs.lessonMitzvot, 'ספר המצוות היומי (לרמב״ם, לפי לוח הרבי)')}${check('lessonTolt', prefs.lessonTolt, 'תורה אור ולקוטי תורה – שיעור יומי לפי לוח ״המורה שיעור״ (כינוס השלוחים)')}${check('lessonRavYomi', prefs.lessonRavYomi, 'שולחן ערוך אדמו״ר הזקן – לפי לוח ״רב יומי״')}
    <p class="hint">שיעורים אלה נוספים לרשימת היום רק אם סימנת אותם. <a href="#/about">פרטים</a></p></fieldset>
    <h2 id="pt-settings">תהילים אישי</h2>
    <p>הפרק בתהילים לפי הגיל (מנהג חב״ד) – לך ולבני המשפחה. השמות ותאריכי הלידה נשמרים במכשיר הזה בלבד ואינם נשלחים. <a class="btn" href="#/tehillim">תהילים אישי – פרופילים ופרקים</a></p>
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
// the label is exactly what the source states (no invented version); a Wikisource original also cites Wikisource's stated version
const licenseLink = (l, m = {}) => (LICENSE_URL[l] ? `<a href="${LICENSE_URL[l]}" target="_blank" rel="noopener" dir="ltr">${esc(licenseLabel(l))}</a>` : esc(licenseLabel(l)))
  + (l === 'CC-BY-SA' && /wikisource\.org/.test(m.versionSource || '') ? ` <small>(במקור, ויקיטקסט: <a href="${WIKISOURCE_DEED}" target="_blank" rel="noopener" dir="ltr">CC BY-SA 4.0</a>)</small>` : '');
async function renderSources() {
  shell('מקורות ורישיונות', '<p>טוען…</p>');
  let s = {}; try { s = await data('sources.json'); } catch { /* offline */ }
  const row = (what, m, note = '') => m ? `<tr><td data-h="חלק">${what}</td><td data-h="גרסה">${esc(m.versionTitleInHebrew || m.versionTitle)}</td><td data-h="רישיון">${licenseLink(m.license, m)}</td><td data-h="קישור"><a href="${esc(m.versionSource)}" rel="noopener" target="_blank">מקור</a> · <a href="${esc(m.sefariaUrl || 'https://www.sefaria.org')}" rel="noopener" target="_blank">ספריא</a></td><td data-h="הערות">${note}</td></tr>` : '';
  const ov = Object.entries(s.rambamOverrides || {});
  $('.page').innerHTML = `<h1>מקורות ורישיונות</h1>
  <p>כל הטקסטים נלקחו דרך ה-API של <a href="https://www.sefaria.org" rel="noopener" target="_blank">ספריא</a> מגרסאות שהרישיון שלהן מתיר הצגה באתר חינמי זה: נחלת הכלל, CC BY-SA, ובתניא – <b>CC BY-NC (שימוש לא מסחרי בלבד</b>; זה אינו רישיון ״פתוח״ במובן המקובל, ולכן גם מי שמעתיק את האתר או את המאגר כפוף להגבלה זו לגבי התניא). הטקסטים נשמרו מראש כקבצים סטטיים ומוגשים מהאתר עצמו. לא נוסף ניקוד ידני ולא שונה נוסח.</p>
  <p>ה<a href="#/lib">ספרייה</a> ו<a href="#/search">החיפוש</a> מציגים את אותם טקסטים בדיוק; אינדקס החיפוש (קבצי <bdi dir="ltr">data/search</bdi>) נבנה מהם מראש, נשמר באתר ובמכשיר בלבד, וכפוף לרישיון של כל ספר – כולל ״לשימוש לא מסחרי בלבד״ בתניא, בתורה אור ולקוטי תורה (וניקוד ״חסידות בהירה״) ובשולחן ערוך אדמו״ר הזקן.</p>
  <p>מעמד ״נחלת הכלל״ של גרסאות תורת אמת ורוזנבאום–זילברמן מבוסס על הסימון בספריא; לא בדקנו אותו באופן עצמאי.</p>
  <p>מסמכי הבדיקה (במאגר הקוד): <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">VERIFICATION.md</a> (לוח השיעורים), <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/GLOSSARY-VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">GLOSSARY-VERIFICATION.md</a> (ביאור מילים), <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/RAMBAM-ERRATA.md" target="_blank" rel="noopener" dir="ltr">RAMBAM-ERRATA.md</a> (נוסח הרמב״ם), <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/SIDDUR-VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">SIDDUR-VERIFICATION.md</a> (הסידור), ו<a href="https://github.com/dudidd-wq/chitas-reader/blob/main/README.md#data-licence" target="_blank" rel="noopener">הערת רישיון הנתונים</a>.</p>
  <p>גרסאות שמקורן באתר <a href="https://mechon-mamre.org/copy.htm" rel="noopener" target="_blank">מכון ממרא</a> אינן בשימוש: אף שבספריא הן מסומנות ״נחלת הכלל״, האתר עצמו מתיר שימוש פרטי לשם לימוד והוראה בלבד ואוסר להעתיק את החומר לאתר אחר. לכן ההקדמה למשנה תורה ומניין המצוות נלקחו מוויקיטקסט (CC BY-SA).</p>
  <table class="src"><thead><tr><th>חלק</th><th>גרסה</th><th>רישיון</th><th>קישור</th><th>הערות</th></tr></thead><tbody>
  ${row('חומש ותהילים', s.tanakh, 'מנוקד ומוטעם')}
  ${row('פירוש רש״י', s.rashi, 'מנוקד; דיבורי המתחיל אינם מנוקדים (בהקראה הם נקראים בניקוד הפסוק כשהם מילות הפסוק)')}
  ${row('תניא', s.tanya, 'מנוקד. רישיון לשימוש לא מסחרי בלבד (NC)')}
  ${row('משנה תורה לרמב״ם', s.rambam, 'מנוקד')}
  ${row('ספר המצוות לרמב״ם', s.mitzvot, 'אינו מנוקד. סריקת המהדורה בספרייה הלאומית')}
  ${row('תורה אור ולקוטי תורה', s.tolt, '<b>נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד</b> (<a href="https://chassidutbehirah.com/" rel="noopener" target="_blank">חסידות בהירה</a>; לפי דיווח בעל האתר, אושר ע״י חסידות בהירה וקה״ת, לשימוש לא מסחרי בלבד). הניקוד נקלט רק במילים שאותיותיהן זהות לנוסח קה״ת שבספריא; פסקה שלא אומתה מוצגת בלי ניקוד. נוסח קה״ת: רישיון לשימוש לא מסחרי בלבד (NC). חלוקת השיעורים: <a href="https://hisachdus.co.il/" rel="noopener" target="_blank">לוח המורה שיעור – כינוס השלוחים העולמי</a>; <a href="https://www.torahor.app/he" rel="noopener" target="_blank">torahor.app – התאחדות החסידים</a> (הלוח עצמו אינו מוגש באתר).')}
  ${row('שולחן ערוך אדמו״ר הזקן (רב יומי)', s.ravyomi, 'מנוקד. רישיון לשימוש לא מסחרי בלבד (NC). חלוקת השיעורים: <a href="https://chabad.info/service/1287411/" rel="noopener" target="_blank">לוח ״רב יומי״ (chabad.info)</a>. הלוח עצמו אינו מוגש באתר')}
  ${s.siddur ? `<tr><td data-h="חלק">סידור (נוסח חב״ד)</td><td data-h="גרסה">${esc(s.siddur.versionTitleInHebrew)}</td><td data-h="רישיון">${licenseLink(s.siddur.license, s.siddur)}; ההוראות באנגלית: ${licenseLink(s.siddur.instructionsLicense)}, והתרגום שלהן לעברית (נעשה לאתר זה) כפוף לאותו רישיון</td><td data-h="קישור"><a href="${esc(s.siddur.versionSource)}" rel="noopener" target="_blank">מקור</a></td><td data-h="הערות">מנוקד. אינו סידור תהלת ה׳ עצמו. אומת מול סידור מצודה נוסח ספרד (ספריא, CC BY), שאינו מוגש באתר</td></tr>` : ''}
  ${ov.map(([n, m]) => row('רמב״ם – ' + Locale.gettext(n, 'he-x-NoNikud'), { ...m, sefariaUrl: 'https://www.sefaria.org/' + encodeURIComponent('Mishneh Torah, ' + n) }, (m.vocalized ?? /Torat Emet/.test(m.versionTitle)) ? 'מנוקד' : m.partial ? `<b>מנוקד חלקית</b> – ${m.partial[0]} מתוך ${m.partial[1]} קטעים מנוקדים; לשאר אין גרסה מנוקדת ברישיון המתיר שימוש כאן` : '<b>לא מנוקד</b> – אין גרסה מנוקדת ברישיון המתיר שימוש כאן')).join('')}
  ${Object.entries(s.rambamChapterOverrides || {}).map(([k, m]) => { const [, n, c] = k.match(/^(.*) (\d+)$/); return row(`רמב״ם – ${Locale.gettext(n, 'he-x-NoNikud')}, פרק ${gem(+c)}`, { ...m, sefariaUrl: 'https://www.sefaria.org/' + encodeURIComponent(`Mishneh Torah, ${n}.${c}`) + '?vhe=' + encodeURIComponent(m.versionTitle) }, 'פרק זה חסר בגרסה הראשית והושלם מגרסה זו' + (m.vocalized ? '' : '; <b>לא מנוקד</b>')); }).join('')}
  </tbody></table>
  <h2 id="study-notes-src">מראי מקומות וביאור קצר</h2><p>מוצגים אחרי הטקסט, בחלק נפרד ומקופל. הם אינם מוקראים, ואפשר לכבות אותם בהגדרות. שום דבר בהם לא נכתב באתר זה.</p>
  <ul><li><b>תורה אור ולקוטי תורה:</b> ״מראי מקומות הערות וציונים״ של מהדורת קה״ת, דרך <a href="https://www.sefaria.org/texts/Chasidut" target="_blank" rel="noopener">ספריא</a> (${licenseLink('CC-BY-NC')}). הערה מוצגת רק אם מילות הכותרת שלה נמצאות בפסקה שספריא מקשרת אליה.</li>
  <li><b>תניא:</b> ״מראי מקומות״ של <a href="${WS_TANYA}" target="_blank" rel="noopener">״תניא מנוקד״ בוויקיטקסט</a> (<a href="${WIKISOURCE_DEED}" target="_blank" rel="noopener" dir="ltr">CC BY-SA 4.0</a>), מעוגנים לנוסח קה״ת לפי השוואת המילים שלפני הסימן ואחריו. יש כאלה רק בליקוטי אמרים (כולל ההקדמה) ובשער היחוד והאמונה.</li>
  <li><b>רמב״ם:</b> קישור בלבד לביאור הרב שטיינזלץ בספריא, כי הוא מוגן בזכויות יוצרים.</li></ul>
  <h2>ביאור מילים</h2><p>הביאורים הקצרים לקוחים מ<a href="https://he.wiktionary.org" target="_blank" rel="noopener">ויקימילון</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.he" target="_blank" rel="noopener" dir="ltr">CC BY-SA 4.0</a>), ולכל ביאור מצורף קישור לערך המקור. ביאור מתפרסם רק אם עבר <b>שתי בדיקות בלתי תלויות</b>, ואחריהן בדיקה ידנית:</p>
  <ol><li><b>ויקימילון:</b> ההגדרה מצטטת את <b>אותו פסוק</b>, ואין עליה (או על הערך) תבנית אזהרה כמו ״פירוש לקוי״, ״משוערת״, ״הבהרה״, ״דרוש מקור״ או ״לשכתוב״.</li>
  <li><b>הצלבה אוטומטית עם שני מקורות אחרים:</b> המשמעות צריכה להתאים גם לתרגום המילה בהקשרה ב-<a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noopener" dir="ltr">STEPBible TAHOT</a> (Tyndale House, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" dir="ltr">CC BY 4.0</a>) וגם לתרגום הפסוק ב-JPS 1917 (נחלת הכלל, דרך ספריא). הגישור בין עברית לאנגלית נעשה בעזרת ערכי ויקימילון האנגלי (<a href="https://kaikki.org" target="_blank" rel="noopener">kaikki.org</a>, CC BY-SA) ו-Princeton WordNet. מקורות העזר משמשים לבדיקה בלבד ואינם מוצגים באתר.</li>
  <li><b>בדיקה ידנית</b> של כל ביאור שעבר את שתי הבדיקות, מול הפסוק ומול שני המקורות. ספק – נדחה.</li></ol>
  <p id="gloss-counts"></p>
  <p>תיאור השיטה המלא, הפקודות והמספרים: <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/GLOSSARY-VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">verification/GLOSSARY-VERIFICATION.md</a>. לכל מילה אחרת, בכל השיעורים (גם רש״י, תניא ורמב״ם), אפשר לסמן את המילה (לחיצה ארוכה או לחיצה כפולה) ולבחור ״חיפוש בוויקימילון״ – קישור חיצוני שנפתח בלשונית חדשה; האפליקציה עצמה אינה שולחת דבר.</p>
  <h2>תיקוני נוסח וניקוד ברמב״ם</h2><p id="rambam-errata">מהדורת תורת אמת של משנה תורה היא המהדורה המנוקדת החופשית היחידה שמצאנו, ויש בה מעט טעויות ניקוד. תיקנו רק טעויות שנבדקו ידנית: העיצורים זהים בנוסח השני שבספריא (ויקיטקסט), והניקוד המתוקן הוא הניקוד שהמהדורה עצמה נותנת לאותה מילה במקומות אחרים. התיקון מוצג בשיעור עצמו (״תוקנו כאן…״), וקובצי המקור אינם משתנים.</p>
  <p id="rambam-text-fixes">תיקון נוסח: בהלכות מלכים יא, ד הופיע במהדורה המשפט מהדפוס המצונזר בסוגריים, בלי המילים ״וניצח כל האומות שסביביו״. הוא הוחלף בנוסח השלם, שבו מסכימים שני מקורות: ויקיטקסט (נוסח מוגה לפי כתבי יד) והנוסח השני שבספריא. ניקוד המילים שנוספו לקוח ממקומות אחרים במהדורה עצמה.</p>
  <p id="rambam-errata-counts"></p>
  <p>השיטה, הסריקות והרשימות המלאות: <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/RAMBAM-ERRATA.md" target="_blank" rel="noopener" dir="ltr">verification/RAMBAM-ERRATA.md</a>.</p>
  <h2>לוח השיעורים</h2><p>חישוב התאריך העברי, פרשת השבוע, חלוקת התהילים, תניא יומי ורמב״ם יומי: ספריות <a href="https://github.com/hebcal" target="_blank" rel="noopener">Hebcal</a> מאת Michael J. Radwin, Danny Sadinoff ושותפים, ארוזות ללא שינוי בקובץ js/vendor/hebcal.js: ‎@hebcal/core ו-‎@hebcal/hdate (GPL-2.0-or-later), ‎@hebcal/learning ו-‎@hebcal/leyning (BSD-2-Clause, ‏Copyright (c) 2020–2026 hebcal), ‎@hebcal/noaa (LGPL-2.1). נוסח הרישיונות המלא והודעות זכויות היוצרים: <a href="THIRD-PARTY-NOTICES.txt">THIRD-PARTY-NOTICES.txt</a>. החישוב נעשה במכשיר, ללא רשת.</p>
  <h2 id="voice-src">קול איכותי (הקראה מקומית)</h2><p>נטען רק כשבוחרים ״קול איכותי״ בהגדרות ההקראה.</p><ul>
    <li>קול: <a href="https://huggingface.co/thewh1teagle/piper-he-noa" target="_blank" rel="noopener">Piper Hebrew – noa (medium)</a> מאת thewh1teagle, רישיון <a href="https://creativecommons.org/licenses/by/4.0/deed.he" target="_blank" rel="noopener">CC BY 4.0</a>. הגרסה הקלה (int8) היא שינוי שלנו: כימות המשקולות ל־int8.</li>
    <li>הקול הגברי (ברירת המחדל מגרסה 1.0.60) הוא שינוי שלנו של הקול noa, בעיבוד אות במכשיר (קוד שלנו, בלי ספרייה חיצונית): זיהוי גובה הצליל בשיטת YIN, הורדתו בכ־6 חצאי טון בשיטת TD-PSOLA (שומרת על הפורמנטים) והורדת הפורמנטים בכ־12% (מגרסה 1.0.69, במקום 6%). עיצורים לא־קוליים נשמרים ללא פירוק לגרגרי צליל, עם מעבר הדרגתי בגבולות הקטעים הקוליים. אין זה קול של דובר גבר ואין הורדה נוספת. לא מצאנו קול עברי גברי שרישיון המשקולות <i>וגם</i> רישיון ההקלטות שעליהן אומן מתירים שימוש חופשי; הפירוט ב־<a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/VOICE.md#male" target="_blank" rel="noopener" dir="ltr">verification/VOICE.md</a>.</li>
    <li>כללי המרת הניקוד להגייה: עיבוד ל־JavaScript של <a href="https://github.com/thewh1teagle/phonikud" target="_blank" rel="noopener">Phonikud</a> (thewh1teagle, רישיון <a href="https://creativecommons.org/licenses/by/4.0/deed.he" target="_blank" rel="noopener">CC BY 4.0</a>), בשינויים: הטעמה לפי טעמי המקרא ומודל סיומות, שווא נע וקמץ קטן. מוסכמת הפונמות לפי <a href="https://renikud.github.io" target="_blank" rel="noopener">renikud</a>.</li>
    <li>מנוע ההרצה: <a href="https://github.com/microsoft/onnxruntime" target="_blank" rel="noopener">ONNX Runtime Web</a> 1.31.1 (Microsoft, רישיון MIT). לא נעשה שימוש בקוד Piper (GPL).</li>
    <li>נוסח הרישיונות וההודעות: <a href="voice/NOTICE.txt">voice/NOTICE.txt</a>, <a href="voice/ort/LICENSE">voice/ort/LICENSE</a>, <a href="THIRD-PARTY-NOTICES.txt">THIRD-PARTY-NOTICES.txt</a>.</li></ul>
  <h2>גופנים</h2><p>Noto Serif Hebrew (ברירת מחדל; כולל טעמי מקרא), Frank Ruhl Libre, Ezra SIL – כולם ברישיון SIL Open Font License 1.1 (<a href="fonts/licenses/NotoSerifHebrew-OFL.txt">נוטו</a>, <a href="fonts/licenses/FrankRuhlLibre-OFL.txt">פרנק־רוהל</a>, <a href="fonts/licenses/EzraSIL-OFL.txt">עזרא</a>). בגופני פרנק ועזרא טעמי המקרא מוסתרים, כי בגופנים האלה אין גליפים לטעמים.</p>
  <p>טעמי אשכנז (Taamey Ashkenaz) מאת Yoram Gnat, ‏© 2012–2014, מ<a href="https://culmus.sourceforge.net/" target="_blank" rel="noopener">פרויקט Culmus</a>: הגופן המקורי ללא שינוי בצורות האותיות, במשקלים Medium ו־Bold, כולל ניקוד וטעמי מקרא. אריזה ל־WOFF2 בלבד. רישיון <a href="fonts/GPL-2.0.txt" dir="ltr">GPLv2</a> עם <a href="fonts/TaameyAshkenaz-LICENSE.txt">חריגת הטמעת גופן</a>. <a href="https://culmus.sourceforge.net/taamim/index.html" target="_blank" rel="noopener">המקור וקובצי הגופן</a>. סימני §, ¯, – , — ו־… מוצגים בנוטו כגופן גיבוי; האותיות, הניקוד והטעמים בטעמי אשכנז.</p>
  <h2>קוד</h2><p>קוד האתר פתוח ברישיון GPL-2.0-or-later: <a href="https://github.com/dudidd-wq/chitas-reader" target="_blank" rel="noopener">github.com/dudidd-wq/chitas-reader</a>.</p>`;
  glossCounts().then(t => { const el = $('#gloss-counts'); if (el && t) el.textContent = t; });
  errataCounts().then(t => { const el = $('#rambam-errata-counts'); if (el && t) el.textContent = t; });
}
/** Rambam errata and scan counts, read from rambam-errata.json (written by tools/rambam-errata-src.py). */
async function errataCounts() {
  try {
    const m = (await data('rambam-errata.json')).meta, n = x => x.toLocaleString('he-IL'), q = m.scans?.niqqud, w = m.scans?.wikisource;
    let t = `תוקנו ${n(m.fixes)} טעויות ניקוד ב־${n(m.halachot)} הלכות${m.textFixes ? (m.textFixes === 1 ? ', ותיקון נוסח אחד (מלכים יא, ד)' : `, ו־${n(m.textFixes)} תיקוני נוסח`) : ''}.`;
    const g = m.scans?.gaps;
    if (g) t += ` סריקת השמטות (השוואה לנוסח ויקיטקסט, פרק מול פרק): ${n(g.missing)} מקומות שבהם בוויקיטקסט יש 3 מילים או יותר שאין אצלנו, ו־${n(g.paren)} קטעים בסוגריים שאינם מראי מקום; כולם נבדקו ידנית – פירוט בקובץ השיטה.`;
    const iv = m.scans?.invariants?.meta || m.scans?.invariants; if (iv) t += ` סריקת ניקוד בלתי אפשרי (למשל שווא לפני חטף, ״בְּאֳ…״): ${n(iv.words)} מילים; ${n(m.invariantsFixed)} מהן תוקנו${iv.words > m.invariantsFixed ? `, ו־${n(iv.words - m.invariantsFixed)} נשארו (קטע משוחזר בסוגריים בדפוס, או שאין לו מקור שני – פירוט בקובץ השיטה)` : ''}.`;
    if (q) t += ` סריקה אוטומטית סימנה עוד ${n(q.wordsFlagged)} מילים בעלות ניקוד חריג ב־${n(q.halachotFlagged)} הלכות; רובן צורות תקינות (למשל בניין או זמן אחר), ולכן לא שונו – הן ברשימה לבדיקה ידנית.`;
    if (w) t += ` השוואת עיצורים מול נוסח ויקיטקסט: ${n(w.identical)} מתוך ${n(w.halachot)} הלכות זהות; בשאר יש הבדלי נוסח בין המהדורות (מתוכם ${n(w.nearIdenticalSubstitutions)} החלפות של מילה בודדת במילה כמעט זהה), שגם הם רק מסומנים ולא שונו.`;
    return t;
  } catch { return ''; }
}
/** One honest sentence with the glossary pipeline counts, read from glossary.json (so the page cannot drift from the data). */
async function glossCounts() {
  try {
    const g = await data('glossary.json'), m = g.meta, t = m.stats.tanakh, h = m.manualReview, n = x => x.toLocaleString('he-IL'), r = g.rambam?.meta;
    const rb = r ? ` ברמב״ם (ניסיון זהיר, סבב 5): ${n(r.wiktionaryRambamQuotes)} הגדרות בוויקימילון מצטטות את משנה תורה; ${n(r.checkA)} אותרו בוודאות בהלכה שלנו (בדיקה א); ${n(r.checkB)} עברו הצלבה עם ערך ויקימילון האנגלי ועם התרגום האנגלי של ההלכה (בדיקה ב, Touger, שימש לבדיקה בלבד ואינו מוצג); בבדיקה הידנית נדחו ${n(r.rejectedByHand)} – רובן מילים פשוטות כמו ״אם״ ו״הרג״ שביאורן מיותר. פורסמו ${n(r.published)} ביאורים.` : '';
    return `במספרים (תורה ותהילים, ${n(t.verseWordForms)} מילים): ${n(t.wiktionaryVerseCited)} הגדרות בוויקימילון מצטטות את הפסוק; ${n(t.droppedFlagged)} מהן נפסלו בגלל תבנית אזהרה; מתוך ${n(t.checkA)} הנותרות ${n(t.checkB)} עברו את ההצלבה עם TAHOT ו-JPS; בבדיקה הידנית נדחו עוד ${n(h.rejectedByHand)}${h.notReviewedSoNotPublished ? ` (ו-${n(h.notReviewedSoNotPublished)} שטרם נבדקו לא פורסמו)` : ''}. פורסמו ${n(h.published)} ביאורים.${rb}`;
  } catch { return ''; }
}

function renderAbout() {
  shell('אודות ומגבלות', `
  <p>אתר לקריאת שיעורי חת״ת (חומש עם רש״י, תהילים, תניא) ורמב״ם יומי, בטקסט מנוקד ובתצוגה דמוית נייר, עם אפשרות שהדפדפן יקריא את הטקסט. עובד גם ללא רשת לאחר טעינה, ואינו אוסף מידע: אין חשבון, אין מעקב, והאתר עצמו אינו שולח נתונים (לחריג היחיד – קולות הקראה מקוונים – ראו ״הקראה״ להלן).</p>
  <h2>לוח השיעורים</h2><ul>
  <li>החומש לפי המנהג: בכל יום עולה אחת מפרשת השבוע (ראשון – ראשון … שבת – שביעי). בשבוע שבו השבת היא יום טוב – לומדים את הפרשה של השבת הבאה. מאחרי השבת האחרונה של השנה ועד שמחת תורה – ״וזאת הברכה״. בשמחת תורה עצמה מסיימים את ״וזאת הברכה״ מעליית היום ועד סוף התורה, ומתחילים ״בראשית״ עד סוף עליית היום (ע״פ שיחת הרבי, תורת מנחם תשל״ב ח״א עמ׳ 129, ו״מנהגי חב״ד לשמחת תורה״ באתר chabad.org.il, ע״פ שערי הלכה ומנהג ח״ה סי׳ פח). בספר המנהגים ובלוח Chabad.org מופיעה בשמחת תורה ״וזאת הברכה״ בלבד – שתי השיטות מובאות בספרי המנהג. כששמחת תורה חלה בשבת (בארץ ישראל בלבד) לומדים ״וזאת הברכה״ משביעי עד הסוף בלבד, ולמחרת (אסרו חג) ״בראשית״ ״ראשון״ – לפי הכלל הכתוב בספר המנהגים (שיעורי חת״ת), המשותף לשתי השיטות. הוראה מפורשת למקרה זה (שבת בארץ ישראל) לא מצאנו; התוספת של ״בראשית״ עד עליית היום, שאנו נוהגים בה ביום חול, הייתה נותנת בשבת את כל פרשת בראשית, ולכן אינה מוצגת. ביום זה מוצגת הערה בקורא.</li>
  <li>תהילים לפי ימי החודש; בחודש חסר לומדים ביום כ״ט גם את של יום ל׳.</li>
  <li>תניא יומי לפי הלוח המקובל (מחזור שנתי החל מי״ט כסלו).</li>
  <li>הלוח נבדק אוטומטית מול לוח השיעורים של Chabad.org (חוץ לארץ) לכל יום בטווח של יותר משנתיים – ראו <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">verification/VERIFICATION.md</a>.</li>
  <li>היום מתחלף בחצות לפי שעון המכשיר (ולא בשקיעה).</li>
  <li><b>התאריך העברי מוצג לפי היום האזרחי:</b> לכל תאריך לועזי מוצג התאריך העברי של שעות היום שלו (חישוב של ספריית Hebcal). לפי ההלכה התאריך העברי מתחלף כבר בשקיעה, כך שבערב, אחרי השקיעה, כבר מתחיל התאריך העברי הבא – האתר אינו מחליף אותו בשקיעה.</li>
  <li>תאריכים לועזיים מוצגים בסדר הישראלי: יום/חודש/שנה (למשל <bdi dir="ltr">02/11/2026</bdi>) או ״2 בנובמבר 2026״.</li></ul>
  <h2 id="about-lib">ספרייה וחיפוש</h2><ul>
    <li>ב<a href="#/lib">ספרייה</a> אפשר לעיין בכל פרק של כל הספרים שבאתר – חומש עם רש״י, תהילים (150 הפרקים, וגם לפי ימי החודש והשבוע), תניא, רמב״ם, ספר המצוות, תורה אור ולקוטי תורה, שולחן ערוך אדמו״ר הזקן והסידור – בלי קשר ללוח: ספר ← חלק ← פרק, עם ״הקודם/הבא״ לפי סדר הספר (גם מספר לספר, למשל מסוף בראשית לתחילת שמות). הפרק נפתח באותו קורא, עם אותן הגדרות.</li>
    <li>לכל פרק קישור קבוע (למשל <bdi dir="ltr">#/lib/torah/Genesis/1</bdi>, ולפסוק או להלכה – <bdi dir="ltr">?s=1:1</bdi>); פרק שנפתח פעם אחת – או ספר שנשמר בכפתור ״שמירה לשימוש ללא רשת״ בדף שלו – זמין גם בלי רשת.</li>
    <li><b>עיון בספרייה אינו מסמן את שיעורי היום כנלמדו.</b> המקום והסימון ✓ של הספרייה נשמרים בנפרד, ברשימות הספרייה בלבד.</li>
    <li><a href="#/search">חיפוש בכל הספרים</a>: עם ניקוד וטעמים או בלעדיהם, בלי תלות בגרש ובגרשיים, ובכתיב מלא או חסר (ו׳ ו־י׳ באמצע מילה); ״ה׳״ בחיפוש מוצא גם את השם המלא. התוצאות מקובצות לפי ספר, עם קטע מודגש וקישור לפסוק או להלכה. אפשר לצמצם לספר אחד.</li>
    <li>החיפוש נעשה כולו במכשיר: האינדקס נבנה מראש מהטקסטים שבאתר, מחולק לפי ספר (כ־12 מגה־בייט בסך הכול, כ־4.3 מגה־בייט בהעברה דחוסה) ונטען רק כשמחפשים; אחרי חיפוש ראשון הוא נשמר במכשיר ועובד גם בלי רשת. <b>מה שמחפשים לא נשלח לשום מקום.</b></li></ul>
  <h2>תהילים אישי</h2><ul>
    <li>מנהג חב״ד לומר בכל יום את פרק התהילים של שנות החיים – מספר השנים שמלאו ועוד אחת – ולהתחיל פרק חדש ביום ההולדת העברי. הורים אומרים גם את פרקי ילדיהם.</li>
    <li>בעמוד <a href="#/tehillim">תהילים אישי</a> אפשר להוסיף את עצמכם ואת בני המשפחה (תאריך לידה או גיל), לראות את הפרק של היום המוצג ולקרוא אותו מנוקד; שם המקור והמגבלות (למשל: מגיל 150 לא נמצא מקור).</li>
    <li>השמות ותאריכי הלידה נשמרים במכשיר בלבד ולא נשלחים לשום מקום.</li></ul>
  <h2>זמני היום</h2><ul>
  <li>בעמוד <a href="#/zmanim/${currentDate}">זמני היום</a>: עלות השחר, משיכיר, הנץ, סוף זמן ק״ש ותפילה, חצות, מנחה גדולה וקטנה, פלג, שקיעה, צאת הכוכבים וחצות הלילה, ובערב שבת ויום טוב – הדלקת נרות וצאת השבת/החג. לכל זמן מצוינת השיטה; השורה הראשונה היא שיטת אדמו״ר הזקן כפי שמפרסם Chabad.org.</li>
  <li>החישוב נעשה במכשיר (ספריית Hebcal, אלגוריתם NOAA), בלי רשת, בגובה פני הים, ונבדק מול Hebcal ומול Chabad.org עד דקה. <b>זהו חישוב – יש לבדוק מול לוח מקומי.</b></li>
  <li>הדלקת נרות: 18 דקות לפני השקיעה, בירושלים 40 ובחיפה 30; יש מנהגים מקומיים אחרים (Chabad.org: תל אביב 22, אילת 30; Hebcal: 20 בשאר הארץ) – אפשר לבחור בעמוד.</li>
  <li>״המיקום שלי״ נקרא רק בלחיצה, נשמר במכשיר בלבד ואינו נשלח.</li></ul>
  <h2>כיוון התפילה</h2><ul>
  <li>בעמוד <a href="#/kivun">כיוון התפילה</a>: הכיוון (במעלות מצפון אמיתי ובשם הרוח) והמרחק אל אבן השתייה בהר הבית, לפי ״קשת גדולה״, מעיר מהרשימה, מהמיקום (בלחיצה בלבד) או מקואורדינטות שמקלידים. נקודת היעד: <bdi dir="ltr">31.7780, 35.2354</bdi> (ויקיפדיה ״אבן השתייה״/״כיפת הסלע״ ו-OpenStreetMap; מקומו המדויק של קודש הקודשים שנוי במחלוקת, וזה משנה רק סמוך להר).</li>
  <li>מצפן חי: במכשיר עם חיישן כיוון (באייפון – אחרי אישור). החיישן מודד צפון מגנטי, והאתר מתקן לצפון אמיתי לפי המודל המגנטי העולמי WMM2025 (NOAA ו-BGS, נחלת הכלל), תקף עד 2030. בלי חיישן מוצג הכיוון במעלות.</li>
  <li>החישוב נבדק אוטומטית מול geographiclib (אליפסואיד WGS-84; הפרש עד 0.2°) ומול ערכי הבדיקה הרשמיים של WMM2025. <b>המצפן מדויק עד כדי חיישן המכשיר; יש להרחיק ממתכות ומגנטים; במקרה ספק – לפי הוראת רב.</b></li></ul>
  <h2 id="more-lessons">שיעורים נוספים (לבחירה בהגדרות)</h2><ul>
  <li><b>ספר המצוות היומי:</b> לוח הרבי לספר המצוות של הרמב״ם, שנלמד במקביל לשיעור הרמב״ם (ספריית Hebcal). הלוח נבדק מול לוח השיעורים של Chabad.org ב־23 תאריכים בשנים 2026–2027, ונמצאה התאמה בכולם. הטקסט: ספר המצוות, ורשה תרמ״ג (נחלת הכלל, דרך ספריא), <b>בלי ניקוד</b>.</li>
  <li>בימים שבהם השיעור הוא טקסט מתוך משנה תורה (נוסח התפילה, נוסח ההגדה, הלכות מגילה וחנוכה), מוצגת הפניה בלבד. ביום סיום המחזור Chabad.org מציין גם ״סיום״; במהדורה הפתוחה אין לו קטע נפרד, ולכן גם הוא מוצג כהפניה.</li>
  <li id="tolt-about"><b>תורה אור ולקוטי תורה – שיעור יומי:</b> לפי <a href="https://hisachdus.co.il/" rel="noopener" target="_blank">לוח ״המורה שיעור״ – כינוס השלוחים העולמי</a> (תשפ״ה), שהוא גם הלוח הקבוע באתר <a href="https://www.torahor.app/he" rel="noopener" target="_blank">torahor.app – התאחדות החסידים</a>. הלוח מחולק <b>לפי שבוע הפרשה</b>: לכל יום (ראשון עד שבת) מצוינים ספר, דף ועמוד ודיבור המתחיל, וכל שיעור נמשך עד תחילת השיעור הבא (אלא אם הלוח מציין אחרת). בשבועות שבהם הפרשיות מחוברות, הלוח קובע לימוד כפול, ולכן מוצגים שני שיעורים ביום. השבוע נקבע לפי פרשת השבת הקרובה (לוח ארץ ישראל או חוץ לארץ, לפי ההגדרה). שבוע בלוח הוא מיום ראשון עד שבת, וקרוי על שם הפרשה של השבת שבסופו. לכן בתשרי, השבוע שמסתיים בשבת בראשית הוא שבוע בראשית כבר מיום ראשון, גם כששמחת תורה חלה באמצע השבוע. שבוע שמסתיים בשבת של סוכות או של שמיני עצרת הוא שבוע וזאת הברכה. בשנה שיש בה שני שבועות כאלה (כמו תשפ״ז), הלוח אינו קובע שבוע נוסף, ולכן השבוע הראשון חוזר על שיעורי וזאת הברכה, ויש על כך הערה. בתורה אור ובלקוטי תורה יש גם מאמרים לחגים, לחנוכה, לפורים ולשבתות המיוחדות. כולם משובצים בלוח בשבוע שבו הם נלמדים, וכך הם מוצגים כאן.
  <br><b>הטקסט:</b> הוצאת קה״ת דרך ספריא (CC BY-NC, כמו התניא). <b>נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד</b> (<a href="https://chassidutbehirah.com/" rel="noopener" target="_blank">חסידות בהירה</a>). לפי דיווח בעל האתר, אושר ע״י חסידות בהירה וקה״ת, לשימוש לא מסחרי בלבד. הניקוד הועתק מקובצי ה־PDF של חסידות בהירה, ונקלט רק במילים שאחרי הסרת הניקוד אותיותיהן זהות בדיוק לנוסח קה״ת שבספריא; ראשי תיבות נשארים כבנוסח קה״ת, ופסקה שבה פחות מ־85% מהמילים אומתו מוצגת בלי ניקוד. כ־98% מהפסקאות מנוקדות. הלוח עצמו אינו מוגש באתר. פרטים: verification/CHASSIDUT-BEHIRAH.md. נקודת ההתחלה של כל שיעור נמצאה באופן אוטומטי לפי הדיבור המתחיל, בעמוד שהלוח מציין. סימוני הדפים של המהדורה מוצגים בסוגריים מרובעים. במקום אחד שבו הדיבור המתחיל בלוח שונה מהכותרת שבמהדורה, השיעור מסומן ״מיקום משוער״. ״הוספות״ שהלוח מוסיף ליום מסוים מוצגות כהערה עם קישור בלבד. <b>הבדלים ידועים:</b> נבדקו 27 תאריכים מול torahor.app, ונמצאה התאמה ב־22 מהם. כל 20 התאריכים שמחוץ לתשרי תאמו (תשפ״ו). בתשרי האתר torahor.app משבץ את דרושי החגים לפי תאריך, ובחלוקה שאינה מופיעה בלוח המודפס. בנוסף, מתשרי תשפ״ז (מל׳ תשרי) הוא עבר לתוכנית שנתית מחושבת, ששונה מהלוח המודפס. האתר כאן ממשיך לפי הלוח המודפס. הלוח והאתר הם של אותו מוציא לאור, ולכן הבדיקה מולו אינה אימות בלתי תלוי. פרטים ב־NOTES וב־verification/TORAH-OR-LIKKUTEI-TORAH.md.</li>
  <li id="hayomyom-about"><b>היום יום:</b> היום יום — © קה״ת, בהיתר הכללי של קה״ת לאתרים ואפליקציות ללימוד ללא תשלום; הקלדה: <a href="https://text.chabadpedia.com/index.php/%D7%94%D7%99%D7%95%D7%9D_%D7%99%D7%95%D7%9D" rel="noopener" target="_blank">חב״דפדיה-טקסט</a>, ברישיון <a href="https://www.gnu.org/licenses/fdl-1.3.html" rel="noopener" target="_blank">GNU Free Documentation License 1.3</a> (GFDL), ללא שינוי בנוסח (הוסרו רק קישורים פנימיים). הלוח נערך לשנת תש״ג (שנה מעוברת): בשנה פשוטה מוצגות בחודש אדר הרשומות של אדר ב׳; בל׳ חשוון ובל׳ כסלו (שאינם בלוח) מוצגת הרשומה של כ״ט. הטקסט שמור באתר ואינו נטען מהרשת. <b>הקראה:</b> הטקסט מוצג כמו בספר, בלי ניקוד; להקראה בלבד נוסף ניקוד אוטומטי, שנעשה פעם אחת בבניית האתר ב<a href="https://nakdan.dicta.org.il/" rel="noopener" target="_blank">נקדן של דיקטה</a> (דיקטה – המרכז הישראלי לניתוח טקסטים, סוגה רבנית). ניקוד אוטומטי עלול לטעות, בייחוד בקטעים ביידיש ובארמית; ראשי תיבות נקראים לפי טבלת הקיצורים של האתר. נוספו תיקוני הגייה נקודתיים וסימוני הטעמה למנוע המקומי; ציטוטים מזוהים במדויק מן התורה והתהילים מקבלים את ניקוד המקור. סימוני ההטעמה אינם פקודה לקולות המכשיר (Web Speech).</li>
  <li id="ravyomi-about"><b>שולחן ערוך אדמו״ר הזקן – רב יומי:</b> החלוקה היא לפי <a href="https://chabad.info/service/1287411/" rel="noopener" target="_blank">לוח ״רב יומי״</a> (מחזור שלישי, שנה שנייה: כ״ד טבת תשפ״ו – כ״ג טבת תשפ״ז). לכל יום מוצגים הסימן והסעיפים. כשהלוח מתחיל או מסיים באמצע סעיף, הסעיף מוצג במלואו, ויש הערה עם המילים שבלוח. הטקסט הוא <b>המהדורה המנוקדת</b> של קה״ת בספריא, ברישיון CC BY-NC (שימוש לא מסחרי). הערות השוליים וקונטרס אחרון אינם מוצגים. נבדק שכל 355 ימי הלוח רצופים: כל שיעור מתחיל במקום שבו הסתיים השיעור הקודם. נמצאו שלושה חריגים, והם מוצגים בהערה: (1) בי״ב–י״ג תמוז סעיפים ח–י בסימן רד אינם מופיעים בלוח. זו כנראה השמטה בדפוס, ולא השלמנו אותה. (2) בה׳ כסלו נדפס בלוח ״סימן ו״ במקום ״סימן רסו״, ותיקנו זאת. (3) בז׳ חשוון השיעור הוא ״הלכות שהיה והטמנה בקצרה״, שאינן בספריא, ולכן מוצגת ההפניה בלבד. <b>אימות:</b> 14 התאריכים של פרשיות וירא וחיי שרה תשפ״ז (25.10–7.11.2026) תואמים לשיעורים שנדפסו בחוברת ״דבר מלכות״. לפי החוברת, היא נוהגת ״לפי לוח רב יומי״, ולכן זו בדיקה של הנוסח שנדפס ולא של מקור עצמאי. מחוץ לתאריכים האלה לא נמצא מקור שני לבדיקה. מחוץ לשנת הלוח אין שיעור, ומוצגת הערה.</li>
  </ul>
  <h2 id="siddur-about">סידור</h2><ul>
  <li><b>נוסח:</b> נוסח האריז״ל כמנהג חב״ד, מתעתיק Open Siddur (שמואל גונזלס, CC0; ההוראות באנגלית – CC BY). התעתיק נערך ״בהתאם לתהלת ה׳״ אך <b>אינו</b> סידור תהלת ה׳ עצמו (שמוגן בזכויות יוצרים, וכך גם הנוסח של Chabad.org – ולכן לא נלקח משם דבר). ייתכנו הבדלים קטנים מהסידור המודפס.</li>
  <li id="siddur-he-about"><b>ההנחיות בעברית:</b> ההוראות שבתעתיק (מתי עומדים, מה מוסיפים בשבת וביום טוב, מה עונה הקהל וכו׳) כתובות במקור באנגלית. לאתר זה תורגמו כולן לעברית (922 הנחיות ו־77 צירופים קצרים בתוך שורות התפילה), בנאמנות למקור ובלי להוסיף הלכה. הפניות למקורות הומרו לצורה העברית (״תהלים כג״). במקומות שבהם האנגלית שגויה בעליל (למשל ימין ושמאל שהתחלפו), התרגום נאמן למקור ומסומן ״(כך בתעתיק)״. התרגום הוא יצירה נגזרת מהוראות Open Siddur (CC BY; ״Contributors to the Open Siddur Project״, שמואל גונזלס), שתורגמו ושונו. אפשר לבחור בהגדרות התצוגה ״שפת ההנחיות בסידור״: עברית (ברירת מחדל), אנגלית או שתיהן. פירוט – <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/SIDDUR-HEBREW-INSTRUCTIONS.md" target="_blank" rel="noopener" dir="ltr">SIDDUR-HEBREW-INSTRUCTIONS.md</a>.</li>
  <li><b>שם ה׳</b> מוצג במלואו כבמקור. בהגדרות אפשר לבחור להציג ״ה׳״ במקומו (בתצוגה בלבד).</li>
  <li><b>התפילה עכשיו:</b> ההצעה בבית נקבעת לפי זמני היום של העיר שנבחרה (שחרית עד חצות, מנחה עד השקיעה, אחר כך מעריב), עם תזכורת להוספות: יעלה ויבוא, על הניסים, משיב הרוח/מוריד הטל, ותן טל ומטר (ארץ ישראל – מז׳ במרחשוון; חו״ל – מ־4 או 5 בדצמבר). אחרי השקיעה ההוספות הן של התאריך העברי הבא. <b>ברכת המזון</b> מופיעה תמיד בשורה ״זמין תמיד״ (לא לפי שעה). זו תזכורת, לא פסק הלכה.</li>
  <li><b>תאריך היום:</b> ברענון או בחזרה לאפליקציה, אם הכתובת אינה נוקבת תאריך מפורש (<bdi dir="ltr">#/d/…</bdi>, <bdi dir="ltr">#/zmanim/…</bdi>, <bdi dir="ltr">#/r/…/…</bdi>), התאריך חוזר להיום האזרחי – לסידור, ל״תפילה עכשיו״, לזמנים ולתהילים אישי. קישור ששומר יום מסוים נשאר עליו.</li>
  <li><b>הוספות מיוחדות בסידור:</b> פסקאות כמו יעלה ויבוא, על הניסים, עננו וכדומה מוצגות בגופן מעט שונה (ועם סימון עדין) כדי להבדיל בינן לבין סדר התפילה הרגיל. בקטע הוספה שאורכו יותר מפסקה אחת מופיע בסוף הסימון ״עד כאן״ (לא מוקרא). ההוראות עצמן (״מוסיפים״ וכו׳) נשארות בסגנון הרגיל שלהן.</li>
  <li><b>קטעים שאין אומרים (שבת/יו״ט/בלי תחנון וכו׳):</b> מוצגים בשיפוע קל ובקו צד עדין – לא בהדגשה של הוספה – עם סימון קצר בתחילה (למשל ״בשבת ויו״ט אין אומרים״) ו־״עד כאן״ בסוף הגבול המדויק. הסימונים אינם מוקראים.</li>
  <li id="hagahot-about"><b>הגהות מילים (קה״ת תשס״ז):</b> תיקוני כתיב/ניקוד נקודתיים בנוסח התפילה הוחלו לפי <i>הגהות לסדור רבנו הזקן</i> (מערכת ״אוצר החסידים״ / קה״ת, ברוקלין תשס״ז) – מקור להשוואה בלבד, בלי העתקת גוף הטקסט. ההקראה והחיפוש משתמשים בנוסח המתוקן.</li>
  <li><b>נבדק:</b> 19 קטעים (בהם ברוך שאמר, אשרי, ישתבח, שמונה עשרה, והוא רחום, ובא לציון, ויהי נועם) הושוו מילה במילה לסידור מצודה נוסח ספרד (ספריא, CC BY). לא נמצא קטע שאינו בנוסח חב״ד; תוקנו 5 שגיאות הקלדה ברורות ו־2 שגיאות המרה, ונקודות שאינן ודאיות סומנו ״לבדיקה״ ולא שונו – <a href="https://github.com/dudidd-wq/chitas-reader/blob/main/verification/SIDDUR-VERIFICATION.md" target="_blank" rel="noopener" dir="ltr">SIDDUR-VERIFICATION.md</a>.</li>
  <li><b>חסר:</b> תפילות הימים הנוראים, סליחות, פרקי אבות, קינות, וטקסט המגילה – לא נמצא להם נוסח חב״ד ברישיון חופשי. הרשימה המלאה בעמוד <a href="#/siddur">הסידור</a>.</li></ul>
  <h2>ניקוד</h2><ul><li>כל טקסטי חת״ת והרמב״ם מנוקדים (ספר המצוות שבשיעורים הנוספים אינו מנוקד; תורה אור ולקוטי תורה מנוקדים ברובם, בנוסח חסידות בהירה, ופסקה שלא אומתה מוצגת בלי ניקוד), חוץ מחלקים ברמב״ם שלא נמצאה להם גרסה מנוקדת ברישיון המתיר שימוש כאן<span id="unvoc-list"></span>. בטקסטים אלה מוצגת הודעה. הפירוט המלא בעמוד ״מקורות ורישיונות״.</li></ul>
  <h2>מראי מקומות וביאור קצר</h2><ul><li>בסוף הקטעים של תורה אור ולקוטי תורה ושל התניא יש חלק מקופל, ״מראי מקומות״: מקורות הפסוקים והמאמרים, ממהדורת קה״ת (דרך ספריא) ומוויקיטקסט. <b>אלה אינם ביאור</b>. בתניא הם קיימים רק בליקוטי אמרים ובשער היחוד והאמונה.</li>
  <li>ברמב״ם יש בסוף כל פרק קישור לביאור הקצר של הרב שטיינזלץ בספריא. הביאור עצמו מוגן בזכויות יוצרים ולכן אינו מוצג כאן.</li>
  <li>ביאור קצר לתניא ולתורה אור/לקוטי תורה (כמו ״שיעורים בספר התניא״) לא נמצא ברישיון פתוח, ולכן אינו מוצג. האתר אינו כותב ביאורים בעצמו. אפשר לכבות את החלק הזה בהגדרות. <a href="#/sources">פירוט במקורות</a></li></ul>
  <h2>ביאור מילים</h2><ul><li><b>הכיסוי קטן, בכוונה:</b> <span id="gloss-n">כ־450</span> ביאורים בכל התורה ותהילים יחד (מתוך יותר מ־90 אלף מילים), ועוד <span id="gloss-rb">9</span> ביאורים בכל הרמב״ם – כלומר ברוב השיעורים יופיעו מעט ביאורים, ובחלקם אף לא אחד. בתניא וברש״י אין ביאורים כלל: בוויקימילון אין ציטוטים מהתניא שאפשר לעגן אליהם ביאור.</li>
  <li>הסיבה: מעדיפים דיוק על פני כמות. ביאור מתפרסם רק אם הגדרת ויקימילון מצטטת את אותו פסוק ואינה מסומנת שם כלקויה, <b>וגם</b> המשמעות מתאימה לשני מקורות בלתי תלויים (STEPBible TAHOT ותרגום JPS 1917), <b>וגם</b> עברה בדיקה ידנית. לרש״י, תניא ורמב״ם אין מקור שני חופשי ברמת המילה, ולכן לא ניתן לעמוד שם בכלל הזה. הפירוט בעמוד ״מקורות ורישיונות״.</li>
  <li>הביאורים קצרים (עד 4 מילים) ומועתקים מוויקימילון כלשונם. גם כך ייתכנו טעויות – לכל ביאור יש קישור לערך המקור.</li>
  <li>בכל מקום אפשר לסמן מילה ולפתוח את ערכה בוויקימילון (קישור חיצוני).</li></ul>
  <h2>הקראה</h2><ul>
  <li><b>פרטיות:</b> בקול מקומי ההקראה נעשית כולה במכשיר. יש דפדפנים שמציעים גם קולות <b>מקוונים</b> (מסומנים ״מקוון״ ברשימת הקולות): בהם הדפדפן שולח את הטקסט המוקרא לשרת של ספק הקול. האתר אינו בוחר קול מקוון כברירת מחדל כשיש קול מקומי, ואינו ממליץ עליהם.</li>
  <li>ההקראה משתמשת בקול המותקן במכשיר (Web Speech API). איכות ההגייה תלויה בקול: גם עם ניקוד, מנועי הדיבור אינם מקפידים על מלעיל/מלרע, שווא נע ודגש, וקריאת ארמית ולשון חכמים חלקית.</li>
  <li id="qv-about"><b>קול איכותי (מקומי, ניסיוני, מגרסה 1.0.59):</b> במקום קול הדפדפן אפשר להוריד – רק בלחיצה על ״קול איכותי״ בהגדרות ההקראה – את הקול <a href="https://huggingface.co/thewh1teagle/piper-he-noa" target="_blank" rel="noopener">noa</a> (Piper, של thewh1teagle, רישיון <a href="https://creativecommons.org/licenses/by/4.0/deed.he" target="_blank" rel="noopener">CC BY 4.0</a>). ההורדה חד־פעמית (כ־92 MB, או כ־38 MB בגרסה הקלה), מאתר זה בלבד; הקול נשמר במכשיר וההקראה נעשית בו, בלי רשת ובלי לשלוח טקסט. ההגייה נבנית מהניקוד: ההטעמה (מלעיל/מלרע) לפי טעמי המקרא בתורה ובתהילים; בשאר הטקסטים – לפי רשימת חריגים ומודל סיומות שנלמד מהטעמים (כ־93% נכון כשנבדק על ספר מקרא שלא נלמד – תורה מול תהילים; בלשון חכמים ובתניא הדיוק לא נמדד), שווא נע לפי כללי הדקדוק, וקמץ קטן רק במילים שאומתו (כל, חכמה, קרבן ועוד). <b>הקול לא נבדק בהאזנה אנושית</b> – רק במדידות אוטומטיות (תמלול חוזר); יש שגיאות הגייה, ובטקסט שאינו מנוקד ההגייה גרועה. אם הקול אינו נתמך או לא נטען – ההקראה חוזרת לקול הדפדפן. <b>מגרסה 1.0.60 ברירת המחדל היא קול גברי</b>: אותו קול noa בעיבוד אות במכשיר (גובה צליל נמוך בכ־6 חצאי טון, פורמנטים נמוכים בכ־6%), בלי הורדה נוספת; הקול הנשי המקורי זמין בהגדרות. זהו גוון מלאכותי, שגם הוא לא נבדק בהאזנה אנושית; במדידה האוטומטית הבהירות (תמלול חוזר) כמעט לא השתנתה – הפירוט בקובץ האימות.</li>
  <li>״הקראה בהטעמה״ שולחת את הטקסט המנוקד (ללא טעמי המקרא), מרחיבה ראשי תיבות נפוצים וקוראת את שם ה׳ ״השם״ (או כבתפילה, לפי בחירה).</li>
  <li>לחיצה אחת על כפתור ההקראה מתחילה לקרוא מיד; ההגדרות (קול, מהירות, שם ה׳) – בלחיצה ארוכה על הכפתור או בכפתור ההגדרות שבסרגל ההקראה.</li>
  <li>מה לא מוקרא: סימני פרשה פתוחה/סתומה (פ/ס), והפניות למקורות בסוגריים, כמו ״(שמות כ׳)״ או ״(מכילתא)״ – הן נשארות על המסך. ראשי תיבות מורחבים רק כשהם חד־משמעיים (למשל ת״ל – תַּלְמוּד לוֹמַר); אחרת נקראים ככתבם.</li>
  <li>שם ה׳ במצב ״השם״: שם הוי׳ה, ה׳, יי ו״ה׳״ עם מקף או אות שימוש (לַה׳ – לַהַשֵּׁם) נקראים ״הַשֵּׁם״; אֲדֹנָי כשם קודש נקרא ״אֲדוֹשֵׁם״; אלוקים, קָהּ וקֵל בק׳. במקום שהמילה אינה שם קודש (למשל ״אלהים אחרים״) – אין החלפה. זו רשימה שלנו, לא פסק הלכה.</li>
  <li id="tts-untested"><b>מה נבדק ומה לא:</b> ההכנה לדיבור (ניקוד, מספרים, ראשי תיבות, שם ה׳) נבדקת בבדיקות אוטומטיות, והנגן נבדק בדפדפן עם קול מדומה. <b>ההקראה בפועל עם קולות עבריים אמיתיים, באייפון ובאנדרואיד, לא נבדקה</b> – לא היה בידינו מכשיר כזה לבדיקה, ולכן גם המשפט הבא מבוסס על התיעוד של הדפדפנים ולא על ניסוי.
    <details id="tts-howto"><summary>איך לבדוק במכשיר שלכם</summary><ol>
    <li>מתקינים קול עברי (אנדרואיד: מנוע Google ← התקנת נתוני קול ← עברית; אייפון: נגישות ← תוכן מוקרא ← קולות ← עברית ← כרמית).</li>
    <li>פותחים את החומש של היום ולוחצים 🔊.</li>
    <li>מאזינים לעלייה שלמה: רש״י, שמות קודש (דברים ו,ד; בראשית יח,ג), ראשי תיבות, ו״יִשְׂרָאֵל״ ברש״י ויקרא א,א (צריך להישמע ״יִסְרָאֵל״).</li>
    <li>נועלים את המסך ובודקים את כפתורי הבא/הקודם במסך הנעילה.</li>
    <li>באייפון: בודקים אם ההקראה נעצרת בנעילה.</li></ol>
    מה שמצאתם – בקישור ״מצאת טעות?״ שבחלון התצוגה (Aא) בקורא. פירוט מלא ב-README שבמאגר הקוד.</details></li>
  <li>כשהמסך כבוי: במחשב ההקראה ממשיכה; באנדרואיד היא לרוב ממשיכה כשהדף פתוח; באייפון היא נעצרת בדרך כלל בנעילת המסך – מומלץ להשאיר את המסך דולק (יש אפשרות כזו בהגדרות).</li></ul>
  <h2>שימוש לא מסחרי</h2><p id="noncommercial">האתר כולו, כפי שהוא מוגש כאן, הוא <b>לשימוש לא מסחרי בלבד</b>: טקסט התניא שבו ניתן ברישיון CC BY-NC (Kehot Publication Society), ולכן אין באתר פרסומות, תשלום או מנוי, ואין להעתיק אותו לשימוש מסחרי עם התניא הזה. קוד האתר עצמו (GPL) והטקסטים האחרים כפופים לרישיונות שלהם – ראו <a href="#/sources">מקורות ורישיונות</a>.</p>
  <p>האתר בהשראת <a href="https://dvarmalchus.co.il" target="_blank" rel="noopener">דבר מלכות</a>. זהו מיזם עצמאי ואינו קשור אליו.</p>`);
  // the list is generated from sources.json, so About can never disagree with the data
  data('glossary.json').then(g => { const el = $('#gloss-n'); if (el) el.textContent = g.meta.manualReview.published.toLocaleString('he-IL'); const r = $('#gloss-rb'); if (r && g.rambam) r.textContent = g.rambam.meta.published.toLocaleString('he-IL'); }).catch(() => {});
  data('sources.json').then(s => { const el = $('#unvoc-list'); if (el) el.textContent = ': ' + unvocalizedList(s).join(', '); }).catch(() => {});
}
// ---------------- Personal Tehillim (תהילים אישי) ----------------
// The chapter by age, for the user and for family profiles. Profiles are kept in prefs (localStorage) only.
const ptProfiles = () => (Array.isArray(prefs.tehillimProfiles) ? prefs.tehillimProfiles : []).map(cleanProfile).filter(Boolean);
const hDateOf = hd => esc(hebDateHe(hd));
const ptLine = (p, iso) => {
  const r = personalChapter(p, iso);
  if (r.error === 'future') return { r, html: 'תאריך הלידה אחרי התאריך המוצג' };
  if (r.error) return { r, html: 'חסר תאריך לידה או גיל' };
  if (r.over150) return { r, html: `גיל ${r.years}: אין פרק – בתהילים ${MAX_CHAPTER} פרקים, ולא מצאנו מקור מוסמך מה אומרים אחרי גיל ${MAX_CHAPTER - 1}` };
  return { r, html: `<a href="#/tehillim/${r.chapter}">פרק ${gem(r.chapter)}</a>` };
};
function personalTeaser() {
  const ps = ptProfiles(), rebbe = prefs.tehillimRebbe;
  if (!ps.length && !rebbe) return '';
  const items = [...(rebbe ? [['פרק הרבי', REBBE_BIRTH]] : []), ...ps.map(p => [p.name, p])].map(([n, p]) => {
    const { r } = ptLine(p, currentDate);
    return `<span class="pt-chip"><b>${esc(n)}</b> ${r.chapter ? `פרק ${gem(r.chapter)}` : '—'}${r.isBirthday ? ' <span class="pt-bd">(יום הולדת – פרק חדש)</span>' : ''}</span>`;
  }).join('');
  return `<a class="zm-teaser pt-teaser" id="pt-teaser" href="#/tehillim"><span class="zt-h">תהילים אישי</span><span class="zt-next">${items}</span><span class="go">פתח</span></a>`;
}
let ptKind = 'date';
async function renderPersonal(ch = 0) {
  const iso = currentDate, plan = dayPlan(iso, { il: prefs.il }), ps = ptProfiles();
  document.title = `תהילים אישי – ${plan.hebDate} (${fmtDmy(iso)})`;
  const rb = rebbeChapter(iso);
  const row = p => {
    const { r, html } = ptLine(p, iso);
    const facts = r.source === 'date' ? [`יום הולדת עברי: ${hDateOf(r.birth)}`, `${r.years} שנים מלאות`, r.chapter && r.next && r.chapter < MAX_CHAPTER ? `פרק ${gem(r.chapter + 1)} מתחיל ב־${hDateOf(r.next)} (<bdi dir="ltr">${fmtDmy(isoDate(r.next))}</bdi>)` : '']
      : r.source === 'age' ? [`לפי גיל ${r.years} שהוזן – אינו מתעדכן לבד; כדאי להזין תאריך לידה`] : [];
    return `<li class="pt-item" data-id="${esc(p.id)}"><div class="pt-main"><b>${esc(p.name)}</b>: ${html}${r.isBirthday ? ' <span class="pt-bd">– היום יום ההולדת: אומרים רק את הפרק החדש</span>' : ''}</div>
      ${facts.filter(Boolean).length ? `<small>${facts.filter(Boolean).join(' · ')}</small>` : ''}
      <button type="button" class="btn pt-del" data-del="${esc(p.id)}" aria-label="מחיקה – ${esc(p.name)}">מחיקה</button></li>`;
  };
  let text = '';
  if (ch >= 1 && ch <= MAX_CHAPTER) {
    try {
      const d = await data(`tehillim/${ch}.json`);
      text = `<section class="pt-text" id="pt-text" aria-labelledby="pt-text-h"><h2 id="pt-text-h">תהילים פרק ${gem(ch)}</h2>
        <div class="pt-verses" lang="he">${d.v.map((v, i) => `<p class="pt-v"><span class="pt-n" aria-hidden="true">${gem(i + 1)}</span> ${fmt(v, true)}</p>`).join('')}</div>
        <p class="note">נוסח: <span id="pt-ver">כמו בתהילים היומי</span> – אותו נוסח של התהילים היומי באתר (<a href="#/sources">מקורות ורישיונות</a>). <a href="https://www.sefaria.org/Psalms.${ch}?lang=he" target="_blank" rel="noopener">הפרק בספריא</a></p></section>`;
    } catch { text = '<p class="warn" role="alert">לא ניתן לטעון את הפרק (אין חיבור?). </p>'; }
  }
  shell('תהילים אישי', `
  <p>מנהג חב״ד: בכל יום אומרים, נוסף על התהילים היומי, את הפרק המתאים לשנות החיים – <b>מספר השנים שמלאו ועוד אחת</b> (בן 13 אומר פרק יד; בשנה הראשונה – פרק א). הפרק החדש מתחיל ביום ההולדת העברי. הורים נוהגים לומר גם את הפרקים של ילדיהם. <a href="#/tehillim" id="pt-src-link">מקורות ומה לא אומת</a></p>
  <p class="pt-day">ליום: <b>${esc(plan.hebDate)}</b> · <bdi dir="ltr">${fmtDmy(iso)}</bdi>${iso === todayIso() ? '' : ` · <a href="#/d/${todayIso()}">חזרה להיום</a>`}</p>
  <p class="note pt-privacy">השמות ותאריכי הלידה נשמרים במכשיר הזה בלבד (וגם בקובץ גיבוי, אם תייצאו אחד). דבר אינו נשלח.</p>
  <h2>הפרקים שלי</h2>
  ${ps.length ? `<ul class="pt-list">${ps.map(row).join('')}</ul>` : '<p id="pt-empty">עדיין לא נוספו אנשים. הוסיפו את עצמכם ואת בני המשפחה בטופס שלמטה.</p>'}
  <label class="check"><input type="checkbox" id="pt-rebbe" ${prefs.tehillimRebbe ? 'checked' : ''}>הצג גם את פרק הרבי (נולד י״א בניסן תרס״ב) – כיום <a href="#/tehillim/${rb.chapter}">פרק ${gem(rb.chapter)}</a></label>
  <form class="form pt-form" id="pt-form" novalidate onsubmit="return false" aria-labelledby="pt-add-h">
    <h2 id="pt-add-h">הוספת אדם</h2>
    <label class="field"><span>שם</span><input type="text" id="pt-name" maxlength="40" autocomplete="off" aria-required="true"></label>
    <fieldset><legend>לפי</legend><div class="seg-ctl" role="radiogroup">
      <label><input type="radio" name="pt-kind" value="date" ${ptKind === 'date' ? 'checked' : ''}>תאריך לידה</label><label><input type="radio" name="pt-kind" value="age" ${ptKind === 'age' ? 'checked' : ''}>גיל</label></div></fieldset>
    <div id="pt-date-f" ${ptKind === 'date' ? '' : 'hidden'}><label class="field"><span>תאריך לידה לועזי (יום/חודש/שנה)</span><input type="text" id="pt-greg" dir="ltr" inputmode="numeric" maxlength="10" placeholder="יי/חח/שששש" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="pt-sunset">נולד/ה אחרי השקיעה (התאריך העברי כבר התחלף)</label></div>
    <div id="pt-age-f" ${ptKind === 'age' ? '' : 'hidden'}><label class="field"><span>גיל (שנים מלאות)</span><input type="number" id="pt-age" min="0" max="199" inputmode="numeric"></label>
      <small>בלי תאריך לידה הפרק אינו מתחלף לבד ביום ההולדת.</small></div>
    <p class="dateerr" id="pt-err" role="alert"></p>
    <button class="btn" type="submit" id="pt-add">הוספה</button>
  </form>
  <h2>פתיחת פרק</h2>
  <div class="zm-place"><label for="pt-go-n">פרק (1–150)</label><input type="number" id="pt-go-n" min="1" max="150" inputmode="numeric" value="${ch || ''}"><button class="btn" type="button" id="pt-go">פתיחה</button></div>
  ${text}
  <h2 id="pt-sources" tabindex="-1">מקורות ומה לא אומת</h2><ul class="pt-src">
  <li><b>אומת בשני מקורות לפחות:</b> אומרים את הפרק של השנה הנוכחית – מספר השנים שמלאו ועוד אחת (אגרות קודש אדמו״ר הריי״צ ח״י עמ׳ נג; ספר המנהגים עמ׳ 17 – כפי שהובאו ב<a href="https://www.chabad.org/library/article_cdo/aid/4779124/jewish/Saying-Psalms-According-to-Your-Loved-Ones-Age.htm" target="_blank" rel="noopener">Chabad.org</a> וב<a href="https://chabadpedia.co.il/index.php/%D7%AA%D7%94%D7%99%D7%9C%D7%99%D7%9D_%D7%94%D7%9E%D7%AA%D7%90%D7%99%D7%9D_%D7%9C%D7%A9%D7%A0%D7%95%D7%AA%D7%99%D7%95" target="_blank" rel="noopener">חב״דפדיה</a>).</li>
  <li><b>אומת:</b> הפרק החדש מתחיל ביום ההולדת, וביום ההולדת עצמו אומרים רק את החדש (חב״דפדיה; <a href="https://www.chabad.org/therebbe/article_cdo/aid/2539406/jewish/" target="_blank" rel="noopener">שיחת כ׳ מרחשוון תשמ״ב</a>). יום ההולדת הוא התאריך העברי.</li>
  <li><b>אומת:</b> הורים אומרים את פרקי ילדיהם; חסידים אומרים גם את פרק הרבי, ונוהגים בכך גם היום (Chabad.org וחב״דפדיה).</li>
  <li><b>חישוב:</b> התאריך העברי ויום ההולדת מחושבים במכשיר בספריית Hebcal. מי שנולד אחרי השקיעה – יש לסמן זאת. מקרי קצה שבהם מוטב לשאול רב: נולד/ה באדר בשנה מעוברת או בל׳ חשוון/כסלו (Hebcal קובע את יום ההולדת בשנים אחרות לפי כלל קבוע).</li>
  <li><b>לא נמצא מקור – ולכן אינו מחושב:</b> מה אומרים מגיל 150 ואילך. לא מוצג פרק.</li>
  <li><b>לא מנהג גיל:</b> אמירת פסוקי פרק קיט לפי אותיות השם היא מנהג כללי (מובא בספרי תהילים בשם החיד״א) ואינה קשורה לגיל; לא מצאנו שהיא חלק ממנהג זה, ולכן היא אינה מוצגת כאן.</li>
  <li>זהו כלי עזר ואינו פסק הלכה.</li></ul>`);
  const f = $('#pt-form'), kind = () => f.querySelector('[name="pt-kind"]:checked').value;
  f.addEventListener('change', e => { if (e.target.name === 'pt-kind') { ptKind = kind(); $('#pt-date-f').hidden = kind() !== 'date'; $('#pt-age-f').hidden = kind() !== 'age'; } });
  f.addEventListener('submit', () => {
    const err = $('#pt-err'), name = $('#pt-name').value.trim();
    if (!name) { err.textContent = 'יש לכתוב שם.'; $('#pt-name').focus(); return; }
    let p = { name };
    if (kind() === 'date') { const g = parseDmy($('#pt-greg').value); if (!g) { err.textContent = 'תאריך לא תקין – יש לכתוב יום/חודש/שנה, למשל 21/05/2015.'; $('#pt-greg').focus(); return; } if (g > todayIso()) { err.textContent = 'תאריך הלידה בעתיד.'; return; } p = { name, greg: g, afterSunset: $('#pt-sunset').checked }; }
    else p = { name, age: $('#pt-age').value };
    const c = cleanProfile(p);
    if (!c) { err.textContent = 'יש להזין גיל (0–199).'; $('#pt-age').focus(); return; }
    setPref('tehillimProfiles', [...ps, c]); renderPersonal(ch); toast(`נוסף: ${c.name}`);
    $(`.pt-item[data-id="${CSS.escape(c.id)}"] a`)?.focus();
  });
  $('#view').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const p = ps.find(x => x.id === b.dataset.del);
    if (p && confirm(`למחוק את ${p.name}?`)) { setPref('tehillimProfiles', ps.filter(x => x.id !== p.id)); renderPersonal(ch); toast('נמחק'); $('#pt-name')?.focus(); }
  }));
  $('#pt-rebbe').onchange = e => setPref('tehillimRebbe', e.target.checked);
  const go = () => { const n = Math.floor(Number($('#pt-go-n').value)); if (n >= 1 && n <= MAX_CHAPTER) location.hash = `#/tehillim/${n}`; else toast('מספר פרק בין 1 ל־150'); };
  $('#pt-go').onclick = go; $('#pt-go-n').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#pt-src-link').onclick = e => { e.preventDefault(); const h = $('#pt-sources'); h.scrollIntoView({ block: 'start' }); h.focus(); };
  data('sources.json').then(s => { const el = $('#pt-ver'); if (el && s.tanakh) el.textContent = s.tanakh.versionTitleInHebrew || s.tanakh.versionTitle; }).catch(() => {});
  if (ch) $('#pt-text-h')?.scrollIntoView({ block: 'start' });
}
/** Names (Hebrew) of the Rambam texts that are shown without niqqud, from sources.json. */
function unvocalizedList(s) {
  const n = k => Locale.gettext(k, 'he-x-NoNikud');
  return [...Object.entries(s.rambamOverrides || {}).filter(([, m]) => m.vocalized === false).map(([k, m]) => n(k) + (m.partial ? ' (מנוקד חלקית)' : '')),
    ...Object.entries(s.rambamChapterOverrides || {}).filter(([, m]) => m.vocalized === false).map(([k]) => { const [, b, c] = k.match(/^(.*) (\d+)$/); return `${n(b)} פרק ${gem(+c)}`; })];
}

// ---------------- Reader ----------------
const R = { unit: null, iso: null, sid: null, lib: null, libInfo: null, doc: null, page: 0, pages: 1, segs: [], speaker: null, wake: null, saveT: null };
function stripTaamim(s) { return s.replace(RE_TAAMIM, ''); }
// progress key: a lesson is kept per day; a siddur section once (it is not a daily lesson)
// a library chapter (#/lib/…) once, under its own key – free browsing never marks a daily lesson as done
const pk = () => (R.lib ? ['lib', R.lib] : R.sid ? ['siddur', R.sid] : [R.iso, R.unit]);
function fmt(html, isTanakh, siddur = false) {
  if (siddur) return divineName(markSectionLabels(html), prefs.divine); // siddur markup kept; (א)(ב) markers muted+data-nr
  let s = html.replace(/\(([^()]*)\)\s*\[([^\]]*)\]/g, '<span class="ketiv" title="כתיב">($1)</span> <span title="קרי">$2</span>')
    .replace(/\{([פס])\}/g, (m, k) => `<span class="pe pe-${k === 'פ' ? 'p' : 's'}" aria-hidden="true" title="${k === 'פ' ? 'פרשה פתוחה' : 'פרשה סתומה'}"></span>`) // a gap, as in a Torah scroll (round 5: a bare ס puzzled readers)
    .replace(/<i class="fn">/g, '<i class="fn" role="note" title="הערת המהדורה">')
    .replace(/([\u0591-\u05C7])\1+/g, '$1');  // inherited source defect: the same mark repeated (e.g. Rashi Gen 1:1 "לֹֹֹֹֹא")
  s = markSectionLabels(s); // 1.0.66: (א)(ב) section labels – muted, not spoken (siddur/rambam/…)
  if (!isTanakh && !siddur) s = fixNiqqud(s); // round 6: unambiguous repairs of impossible vowel marks (Rashi, Tanya, Rambam)
  // Frank/Ezra subsets lack taamim glyphs – strip so a word never mixes fonts mid-glyph
  if (isTanakh && (!prefs.taamim || prefs.font === 'frank' || prefs.font === 'ezra')) s = stripTaamim(s);
  return divineName(s, prefs.divine); // the divine name: in full (default) or ה׳ – one setting for every text
}
// 1.0.61: a siddur table (texts.js siddurTable) – one segment; each cell isolated in its own direction. Cells that are
// not said (the Divine Names, the Omer chart's Sefirah/words/letter, the instructions) carry data-nr: the reader's TTS
// drops them (ttsHtml) and tts-prep drops them again.
function siddurTableHtml(b) {
  const td = (c, j, head) => {
    const tag = head ? 'th' : 'td', cls = `sd-${c.k || 'e'} c${j}`, nr = c.k === 'p' ? '' : ' data-nr';
    if (c.k === 'n') return c.lang === 'he' ? `<${tag} class="${cls}"${nr} dir="rtl" lang="he"${head ? ' scope="col"' : ''}>${divineName(c.html, prefs.divine)}</${tag}>` : `<${tag} class="${cls} sd-en"${nr} dir="ltr" lang="en"${head ? ' scope="col"' : ''}>${divineName(c.html, prefs.divine)}</${tag}>`;
    if (c.k === 'x') return `<td class="${cls}"${nr} dir="rtl">${c.html}</td>`;
    return `<td class="${cls}"${nr} dir="rtl">${c.k ? fmt(c.html, false, true) : ''}</td>`;
  };
  const head = b.cls === 'omer' && b.rows[0].every(c => c.k === 'n');
  const rows = b.rows.map((r, i) => `<tr>${r.map((c, j) => td(c, j, head && i === 0)).join('')}</tr>`);
  const body = head ? `<thead>${rows[0]}</thead><tbody>${rows.slice(1).join('')}</tbody>` : `<tbody>${rows.join('')}</tbody>`;
  return `<div class="seg sd-tab-seg" data-id="${b.id}"><div class="t"><table class="sd-tab sd-t-${b.cls}" dir="rtl">${body}</table></div></div>`;
}
/** the html of a segment that TTS reads: without the cells/parts marked data-nr (shown, not said) */
function ttsHtml(el) {
  if (!el.querySelector('[data-nr]')) return el.innerHTML;
  const c = el.cloneNode(true); c.querySelectorAll('[data-nr]').forEach(x => x.remove());
  return c.innerHTML;
}
// per block: true = vocalised, false = not, null = too short to tell (inherits the previous block's state)
function vocState(blocks) {
  let last = null;
  const raw = blocks.map(b => { const t = b.type === 'h' || b.type === 'note' ? '' : (b.text || '') + ' ' + (b.sub || []).join(' '); const L = (t.match(/[\u05D0-\u05EA]/g) || []).length; return L < 20 ? null : niqqudRatio(t) >= 0.3; });
  const first = raw.find(v => v !== null) ?? null;
  return raw.map(v => (v === null ? (last ?? first) : (last = v)));
}
function niqqudRatio(text) { const L = (text.match(/[\u05D0-\u05EA]/g) || []).length; const N = (text.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || []).length; return N / Math.max(L, 1); }

async function openReader(unit, iso, sid = null, lib = null) {
  currentDate = iso;
  const lpath = lib?.path || null, seek = lib?.seek || null;
  const auto = R.autoplay; R.autoplay = false;
  if (R.speaker) { R.speaker.stop(true); R.speaker = null; }
  if (R.doc && R.unit) { const a = anchor(); if (a) setProgress(...pk(), { sec: null, ...a }); }
  R.doc = null; R.segs = []; R.ttsShown = false;
  const plan = dayPlan(iso, { il: prefs.il });
  const el = $('#reader');
  el.hidden = false; document.body.style.overflow = 'hidden';
  $('#app').hidden = true; // the home page is never visible or reachable behind the reader
  R.unit = unit; R.iso = iso; R.sid = sid; R.lib = lpath; R.libInfo = lib?.info || null; R.page = 0; R.sidReady = false;
  const lparent = R.libInfo?.crumbs.at(-1);
  const dayFocus = R.dayFocus; R.dayFocus = null;
  el.innerHTML = `
  <header class="r-top" id="rt">
    <a class="btn ghost" href="${lpath ? '#/lib/' + (lparent?.id || '') : sid ? '#/siddur' : '#/d/' + iso}" aria-label="${lpath ? `חזרה ל${esc(lparent?.he || 'ספרייה')}` : sid ? 'חזרה לתוכן הסידור' : 'חזרה לדף הבית'}">${ICON.back}</a>
    <div class="r-title"><b id="r-t">${esc(lpath ? 'ספרייה' : UNITS[unit].full)}</b><small id="r-s">${lpath ? esc(R.libInfo?.node.label || '') : sid ? '' : esc(dayDates(plan, iso))}</small></div>
    <span class="lsc pageinfo" id="pinfo2" aria-hidden="true"></span>
    <button class="btn ghost lsc" id="b-prev2" aria-label="עמוד קודם">${ICON.prev}</button>
    <button class="btn ghost lsc" id="b-next2" aria-label="עמוד הבא">${ICON.next}</button>
    <button class="btn ghost" id="b-tts" aria-label="הקראה – התחלה או השהיה (לחיצה ארוכה: הגדרות הקראה)" title="הקראה (לחיצה ארוכה: הגדרות)">${ICON.speak}</button>
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
      <button class="btn ghost" id="t-set" aria-label="הגדרות הקראה" aria-haspopup="dialog">${ICON.gear}</button>
      <label class="sr" for="t-rate">מהירות</label>
      <select id="t-rate" title="מהירות ההקראה">${TTS_RATES.map(r => `<option value="${r}" ${Math.abs(r - prefs.ttsRate) < 0.01 ? 'selected' : ''}>×${r}</option>`).join('')}</select>
    </div>
    <span style="flex:1" id="spacer"></span>
    <button class="btn ghost" id="b-next" aria-label="עמוד הבא">${ICON.next}</button>
  </footer>
  <div class="thin-progress" aria-hidden="true"><i id="tbar"></i></div>
  <div class="pflash" id="pflash" aria-hidden="true"></div>
  <div class="sheet" id="sheet" hidden role="dialog" aria-modal="true" aria-labelledby="sh-title"></div>`;
  bindReaderUi();
  try {
    if (sid) {
      const [bk, n] = sid.split('/'); R.sorder = await siddurOrder(); R.doc = await buildSiddurBookDoc(bk, sidOpts());
      if (!R.doc.siddur.secs[n - 1]) throw new Error('siddur section not found');
    }
    else if (lpath) R.doc = (await libDoc(lpath)).doc;
    else R.doc = await buildDoc(plan, unit);
  } catch (e) {
    // round 5: outside the page columns (they are only sized once a text is laid out), so it reflows at any width; with a retry
    const rc = $('#rc'); rc.classList.add('r-error'); rc.style.cssText = '';
    rc.innerHTML = `<p role="alert">לא ניתן לטעון את הטקסט. ${navigator.onLine === false ? 'אין חיבור לרשת, והטקסט של יום זה לא נשמר מראש במכשיר.' : 'ייתכן שהחיבור לרשת נכשל, או שהטקסט של יום זה לא נשמר מראש במכשיר.'}</p>
      <p><button class="btn primary" id="r-retry">נסה שוב</button></p><p class="r-error-hint">כדי לקרוא בלי רשת: בדף הבית – ״שמירה לשימוש ללא רשת (30 יום)״ בזמן שיש חיבור.</p>`;
    if (lpath) $('.r-error-hint', rc).textContent = 'כדי לקרוא בלי רשת: בספרייה – ״שמירה לשימוש ללא רשת״ בדף הספר, בזמן שיש חיבור.';
    $('#r-retry').addEventListener('click', () => { if (R.unit === unit && R.iso === iso && R.sid === sid && R.lib === lpath) openReader(unit, iso, sid, lib); });
    $('#r-retry').focus(); return;
  }
  if (R.unit !== unit || R.iso !== iso || R.sid !== sid || R.lib !== lpath) return;
  if (lpath) {
    $('#r-t').textContent = R.doc.title; $('#r-s').textContent = R.doc.subtitle;
    document.title = `${R.doc.subtitle} – ספרייה`;
    await renderDoc();
    const p = getProgress('lib', lpath);
    if (seek && seekSeg(seek)) { /* a search result or a shared link to a verse */ }
    else if (p?.pos && !p.done) restore(p);
    requestWake();
    if (dayFocus) { toast(R.libInfo.node.label); const b = $(`.daynav-top [data-day="${dayFocus}"]`); if (b && (R.page === 0 || prefs.layout !== 'pages') && b.getClientRects().length) b.focus({ preventScroll: true }); }
    if (auto) ttsToggle();
    return;
  }
  if (sid) {
    $('#r-t').textContent = R.doc.title;
    await renderDoc();
    // the whole seder is one document: open at the saved place in this section, or at the section's start
    const sp = getProgress('siddur', sid);
    if (lib?.seek && seekSeg(lib.seek)) { /* a search result */ }
    else if (sp?.pos && !sp.done && sp.pos.startsWith(sid.split('/')[0] + '-')) restore(sp); else goToSec(+sid.split('/')[1]);
    R.sidReady = true; siddurTrack();
    requestWake(); if (auto) ttsToggle();
    return;
  }
  $('#r-t').textContent = R.doc.title; $('#r-s').innerHTML = `<span class="r-dt">${dayDatesHtml(plan, iso)}</span><span class="r-rng"><i aria-hidden="true"> · </i>${esc(R.doc.subtitle)}</span>`;
  document.title = `${R.doc.title} – ${plan.hebDate} (${fmtDmy(iso)})`;
  await renderDoc();
  const p = getProgress(iso, unit);
  if (p?.pos && !p.done) restore(p);
  requestWake();
  if (dayFocus) dayMoved(dayFocus, plan, iso);
  if (auto) ttsToggle();
}
// Day navigation inside a lesson (יום קודם / היום / יום הבא): plain links to the same lesson on another date, so the
// router reopens the reader (TTS stops, progress is kept per day) and the address keeps the date across a refresh.
// Not offered as a swipe: a horizontal swipe already turns the page.
function dayNavHtml(pos) {
  const iso = R.iso, t = todayIso(), il = prefs.il, u = R.unit;
  const when = d => `${fmtDmy(d)}, ${dayPlan(d, { il }).hebDate}`;
  const prev = shiftIso(iso, -1), next = shiftIso(iso, 1);
  return `<nav class="daynav daynav-${pos}" aria-label="${pos === 'top' ? 'מעבר בין ימים' : 'מעבר בין ימים – סוף השיעור'}">
    <a class="btn" data-day="prev" href="#/r/${u}/${prev}" aria-label="יום קודם – ${esc(UNITS[u].he)} של ${esc(when(prev))}" aria-keyshortcuts="Shift+ArrowRight">${ICON.prev}<span>יום קודם</span></a>
    ${iso === t ? '' : `<a class="btn today" data-day="today" href="#/r/${u}/${t}" aria-label="היום – ${esc(when(t))}">היום</a>`}
    <a class="btn" data-day="next" href="#/r/${u}/${next}" aria-label="יום הבא – ${esc(UNITS[u].he)} של ${esc(when(next))}" aria-keyshortcuts="Shift+ArrowLeft"><span>יום הבא</span>${ICON.next}</a>
  </nav>`;
}
// Library: the previous / next chapter of the same book (across parts and books: Genesis 50 → Exodus 1)
function libNavHtml(pos) {
  const { prev, next } = R.libInfo || {};
  return `<nav class="daynav libnav daynav-${pos}" aria-label="${pos === 'top' ? 'מעבר בין פרקים' : 'מעבר בין פרקים – סוף הפרק'}">
    ${prev ? `<a class="btn" data-day="prev" href="#/lib/${prev.id}" aria-label="הקודם – ${esc(prev.label)}" aria-keyshortcuts="Shift+ArrowRight">${ICON.prev}<span>הקודם</span></a>` : ''}
    ${next ? `<a class="btn" data-day="next" href="#/lib/${next.id}" aria-label="הבא – ${esc(next.label)}" aria-keyshortcuts="Shift+ArrowLeft"><span>הבא</span>${ICON.next}</a>` : ''}
  </nav>`;
}
function libCrumbsHtml() {
  const c = R.libInfo?.crumbs || [];
  return `<nav class="doc-kicker lib-crumbs" aria-label="מיקום בספרייה"><a href="#/lib">ספרייה</a>${c.map(x => ` <i aria-hidden="true">›</i> <a href="#/lib/${x.id}">${esc(x.he)}</a>`).join('')}</nav>`;
}
// open at one segment (?s= in a library or siddur link) and mark it until the next tap
function seekSeg(id) {
  const el = R.segs.find(s => s.dataset.id === id) || R.segs.find(s => s.dataset.id === id.replace(/^r/, ''));
  if (!el) return false;
  goToSeg(el.dataset.id, false);
  el.classList.add('seek-hit'); setTimeout(() => document.addEventListener('pointerdown', () => el.classList.remove('seek-hit'), { once: true }), 0);
  return true;
}
function goDay(which) {
  if (R.lib) { const t = which === 'prev' ? R.libInfo?.prev : which === 'next' ? R.libInfo?.next : null; if (t) { R.dayFocus = which; location.hash = `#/lib/${t.id}`; } return; }
  if (!R.unit || R.sid || !R.iso) return;
  R.dayFocus = which;
  location.hash = `#/r/${R.unit}/${which === 'today' ? todayIso() : shiftIso(R.iso, which === 'prev' ? -1 : 1)}`;
}
// after a day change: say which day is shown, and keep the keyboard on the same control when it is on screen
function dayMoved(which, plan, iso) {
  toast(`${UNITS[R.unit].he} – ${dayDates(plan, iso)}`);
  const b = $(`.daynav-top [data-day="${which}"]`) || $(`.daynav-top [data-day="${which === 'today' ? 'next' : which}"]`);
  if (b && (R.page === 0 || prefs.layout !== 'pages') && b.getClientRects().length) b.focus({ preventScroll: true });
}
// Siddur: the page shows the whole seder; the address, the subtitle and the per-section progress follow the section
// being read (history.replaceState: no new history entry and no reload).
function sectionOf(seg) { const m = seg?.dataset.id.match(/^([a-z]+)-(\d+)-/); return m ? +m[2] : 0; }
function goToSec(n) {
  const h = $(`#sec-${n}`);
  if (!h || n <= 1) { if (prefs.layout === 'pages') setPage(0); else $('#vp').scrollTop = 0; return; }
  if (prefs.layout === 'pages') setPage(pageOf(h));
  else { const vp = $('#vp'); vp.scrollTop += h.getBoundingClientRect().top - vp.getBoundingClientRect().top - chromePad().top; }
}
// The section being read: a section whose name is on screen wins (the one already current if it is there, else the
// last one shown – the page then ends in it); otherwise the section of the first paragraph on screen.
// Pages mode compares page numbers, not screen boxes, so a page turn still sliding in does not matter.
function markerShown(h) {
  if (prefs.layout === 'pages') return pageOf(h) === R.page;
  const v = $('#vp').getBoundingClientRect(), r = h.getBoundingClientRect();
  return r.bottom > v.top + chromePad().top - 4 && r.top < v.bottom - chromePad().bottom;
}
function sectionOnScreen() {
  const cur = +R.sid.split('/')[1];
  const shown = [...document.querySelectorAll('#rc h2.sd-sec')].filter(markerShown).map(h => +h.dataset.sec);
  if (shown.includes(cur)) return cur;
  return shown.length ? shown.at(-1) : sectionOf(currentSeg());
}
function siddurTrack() {
  if (!R.sid || !R.sidReady || !R.doc?.siddur) return;
  const [bk, old] = R.sid.split('/'), n = sectionOnScreen();
  if (n && n !== +old) {
    if (n > +old) setProgress('siddur', R.sid, { done: true, frac: 1 }); // read past it
    R.sid = `${bk}/${n}`;
    if (location.hash.startsWith(`#/s/${bk}/`)) history.replaceState(history.state, '', `#/s/${bk}/${n}`);
  }
  const sec = R.doc.siddur.secs[(n || +old) - 1];
  const sub = R.doc.siddur.secs.length > 1 && sec ? sec.he : R.doc.subtitle;
  if ($('#r-s') && $('#r-s').textContent !== sub) $('#r-s').textContent = sub;
  document.title = `${R.doc.title}${R.doc.siddur.secs.length > 1 && sec ? ' – ' + sec.he : ''} – סידור`;
}
// Simchat Torah: the Chumash shiur differs between calendars – say what we do and why, so the reader is not
// surprised when another calendar (e.g. Chabad.org) shows something else.
function simchatTorahNote() {
  if (R.unit !== 'chumash' || R.lib) return '';
  const c = dayPlan(R.iso, { il: prefs.il }).chumash;
  if (!c?.simchatTorah) return '';
  const t = c.shabbat
    ? 'שמחת תורה שחל בשבת (בארץ ישראל): לומדים את ״וזאת הברכה״ מ״שביעי״ עד סוף התורה בלבד, ולמחר (אסרו חג, יום ראשון) – ״בראשית״ ״ראשון״. זה הכלל הכתוב בספר המנהגים (שיעורי חת״ת): בשמחת תורה – ״וזאת הברכה״ מעליית היום עד הסוף, ובאסרו חג – ״בראשית״ מתחילתה עד עליית היום. יש הנוהגים להוסיף בשמחת תורה גם ״בראשית״ עד עליית היום (כך אנו נוהגים כשהחג חל ביום חול); בשבת פירוש הדבר כל פרשת בראשית, ולא מצאנו מקור שמורה כך במפורש.'
    : `בשמחת תורה מסיימים את ״וזאת הברכה״ מעליית היום (${c.aliyahHe}) עד סוף התורה, ומתחילים ״בראשית״ עד סוף עליית היום – ע״פ שיחת הרבי (תורת מנחם תשל״ב ח״א עמ׳ 129) ו״מנהגי חב״ד לשמחת תורה״ (chabad.org.il). בלוחות אחרים, כמו Chabad.org, מופיעה היום רק ״וזאת הברכה״.`;
  // round 6: one line first, the reasoning and sources behind "פירוט"
  const lead = c.shabbat
    ? 'היום: ״וזאת הברכה״ מ״שביעי״ עד סוף התורה; מחר (אסרו חג): ״בראשית״ ״ראשון״.'
    : `היום: ״וזאת הברכה״ מ״${c.aliyahHe}״ עד הסוף ו״בראשית״ עד סוף ״${c.aliyahHe}״; ב-Chabad.org: ״וזאת הברכה״ בלבד.`;
  return `<aside class="day-note" role="note"><b>שמחת תורה:</b> ${esc(lead)}<details class="note-more"><summary>פירוט</summary>${esc(t)}</details></aside>`;
}
// A reader opened before the location was chosen (e.g. from a shared link): state which calendar is shown and why.
function readerLocNote() {
  if (prefs.locationChosen || R.unit !== 'chumash' || R.lib) return '';
  return `<aside class="day-note" role="note"><b>לוח:</b> מוצג לפי לוח ${locLabel(prefs.il)} – ברירת מחדל לפי אזור הזמן של המכשיר, כי עדיין לא נבחר לוח. ${isDivergent(R.iso, 'chumash') ? 'השבוע הפרשה שונה בין ארץ ישראל לחוץ לארץ. ' : ''}אפשר לבחור בעמוד הבית או בהגדרות.</aside>`;
}
async function renderDoc() {
  const d = R.doc, rc = $('#rc');
  const showRashi = prefs.rashi && R.unit === 'chumash';
  const inline = d.tanakh && !showRashi;
  const sidd = !!d.siddur;
  const lib = !!R.lib;
  let html = `<header class="doc-head">${lib ? libCrumbsHtml() : `<p class="doc-kicker">${sidd ? 'סידור · נוסח האריז״ל – חב״ד' : `${esc(UNITS[R.unit].he)} · ${esc(dayPlan(R.iso, { il: prefs.il }).hebDate)} · ${esc(gregHe(R.iso))}`}</p>`}<h1>${esc(d.title)}</h1><p class="doc-sub">${esc(d.subtitle)}</p>${sidd ? '<div class="orn" aria-hidden="true"><i></i><b></b><i></i></div>' : lib ? libNavHtml('top') : dayNavHtml('top')}</header>`;
  html += simchatTorahNote() + readerLocNote();
  // one-line source + licence credit for every lesson (round 3): the main edition, then any Rambam chapter from another one
  let srcs = {}; try { srcs = await data('sources.json'); } catch { /* offline and not cached */ }
  const main = { chumash: [['חומש', srcs.tanakh], showRashi && ['רש״י', srcs.rashi && { ...srcs.rashi, versionTitleInHebrew: 'מהדורת רוזנבאום–זילברמן (1929–1934)' }]], tehillim: [['תהילים', srcs.tanakh]],
    tanya: [['תניא', srcs.tanya && { ...srcs.tanya, versionTitleInHebrew: 'הוצאת קה״ת (Kehot)' }]],
    mitzvot: [['ספר המצוות', srcs.mitzvot && { ...srcs.mitzvot, versionTitleInHebrew: 'ספר המצוות, ורשה תרמ״ג' }]],
    tolt: [['תורה אור / לקוטי תורה', srcs.tolt && { ...srcs.tolt, versionTitleInHebrew: 'הוצאת קה״ת (Kehot)' }], d.blocks.some(b => b.voc === 'cb') && srcs.tolt?.niqqud && ['ניקוד', srcs.tolt.niqqud]],
    ravyomi: [['שולחן ערוך הרב', srcs.ravyomi && { ...srcs.ravyomi, versionTitleInHebrew: 'הוצאת קה״ת, מהדורה מנוקדת' }]],
    siddur: [['סידור', srcs.siddur], [prefs.siddurLang === 'en' ? 'הוראות באנגלית' : 'הנחיות (תרגום לעברית של ההוראות באנגלית)', srcs.siddur && { ...srcs.siddur, license: srcs.siddur.instructionsLicense }]] }[R.unit] || [['רמב״ם', srcs.rambam]];
  const credits = [...main.filter(x => x && x[1]).map(([label, m]) => ({ label, ...m })), ...(d.credits || [])];
  const credit = credits.map(c => `${esc(c.label)}: <a href="${esc(c.versionSource)}" target="_blank" rel="noopener">${c.versionTitle === 'Wikisource Mishneh Torah' ? 'ויקיטקסט' : esc(c.versionTitleInHebrew || c.versionTitle)}</a> (${licenseLink(c.license, c)})`).join(' · ');
  // round 6: vocalisation is judged per block, not for the whole lesson (Positive Mitzvot: the first ~47 mitzvot are
  // vocalised, the rest not). A short block (< 20 letters) inherits its neighbour's state, so a title never flips it.
  const voc = vocState(d.blocks), nV = voc.filter(v => v === true).length, nU = voc.filter(v => v === false).length;
  const mixed = nV > 0 && nU > 0;
  if (nU && !nV) html += `<p class="unvoc" id="unvoc">טקסט זה אינו מנוקד – לא נמצאה לו גרסה מנוקדת ברישיון המתיר שימוש כאן.</p>`;
  else if (mixed) html += `<p class="unvoc" id="unvoc">טקסט זה מנוקד חלקית: ${nV} מתוך ${nV + nU} קטעים מנוקדים. ${R.unit === 'tolt' ? 'בשאר לא אומתה התאמה מלאה בין הנוסח המנוקד לאותיות נוסח קה״ת, ולכן הם מוצגים בלי ניקוד' : 'לשאר לא נמצאה גרסה מנוקדת ברישיון המתיר שימוש כאן'}; תחילת כל קטע לא מנוקד מסומנת.</p>`;
  let open = false, prevVoc = true;
  for (const [bi, b] of d.blocks.entries()) {
    if (mixed && voc[bi] === false && prevVoc) html += `<p class="unvoc-mark">מכאן הטקסט אינו מנוקד</p>`;
    if (mixed && voc[bi] === true && !prevVoc) html += `<p class="unvoc-mark">מכאן הטקסט מנוקד</p>`;
    if (voc[bi] !== null) prevVoc = voc[bi];
    if (b.type === 'h') { if (open) { html += '</p>'; open = false; } html += b.sec ? `<h2 class="sd-sec" id="sec-${b.sec}" data-sec="${b.sec}">${esc(b.text)}</h2>` : `<h2>${esc(b.text)}</h2>`; continue; }
    if (b.type === 'notes') { if (open) { html += '</p>'; open = false; } if (prefs.studyNotes !== false) html += notesHtml(b); continue; }
    if (b.type === 'note') { if (open) { html += '</p>'; open = false; } html += b.html != null ? (b.lang === 'he' ? `<aside class="sid-note sid-he" lang="he" dir="rtl">${divineName(b.html, prefs.divine)}</aside>` : `<aside class="sid-note" lang="en" dir="ltr">${divineName(b.html.replace(/[\u0590-\u05FF][\u0590-\u05FF\s"'״׳־,]*[\u0590-\u05FF]|[\u0590-\u05FF]/g, m => `<bdi lang="he">${m}</bdi>`), prefs.divine)}</aside>`) : `<aside class="day-note" role="note">${esc(b.text)}${(b.links || []).map(([t, u], i) => `${i ? '; ' : ''}<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}${esc(b.tail || '')}${b.href ? ` <a href="${esc(b.href)}" target="_blank" rel="noopener">${esc(b.hrefText || 'קישור')}</a>` : ''}</aside>`; continue; }
    if (b.type === 'table') { if (open) { html += '</p>'; open = false; } html += siddurTableHtml(b); continue; }
    // the visible number is decorative; screen readers get "פסוק יז" / "הלכה ג" (round 4)
    const num = b.num ? `<span class="sr">${b.type === 'v' ? 'פסוק' : R.unit.startsWith('rambam') ? 'הלכה' : 'סעיף'} ${b.num} </span><span class="${b.type === 'v' ? 'vn' : 'hn'}" aria-hidden="true">${b.num}</span>` : '';
    if (inline) {
      if (!open) { html += '<p>'; open = true; }
      html += `<span class="seg inline" data-id="${b.id}"${b.ref ? ` data-ref="${b.ref}"` : ''}>${num}<span class="t">${fmt(b.text, true)}</span></span> `;
    } else {
      const rashi = showRashi && b.sub?.length ? `<div class="rashi">${b.sub.map((r, i) => `<p>${i ? '' : '<span class="lbl">רש״י </span>'}${fmt(r, false)}</p>`).join('')}</div>` : '';
      const cls = `seg${b.special ? ' sid-special' : ''}${b.omit ? ' sid-omit' : ''}`;
      const startM = b.omitStart ? `<div class="sid-bound sid-omit-start" data-nr aria-hidden="true">${esc(b.omitLabel || 'אין אומרים')}</div>` : '';
      const endM = (b.omitEnd || b.specialEnd) ? `<div class="sid-bound sid-end" data-nr aria-hidden="true">עד כאן</div>` : '';
      html += `<div class="${cls}" data-id="${b.id}"${b.ref ? ` data-ref="${b.ref}"` : ''}>${startM}<div class="t">${num}${b.repOf ? `<span class="sid-rep" data-nr aria-hidden="true">${b.rep}/${b.repOf}</span>` : ''}${fmt(b.text, !!d.tanakh, sidd || !!d.raw)}</div>${endM}${rashi}</div>`;
    }
  }
  if (open) html += '</p>';
  R.credit = credit;
  if (credit) html += `<p class="doc-credit">מקור הנוסח – ${credit}</p>`;
  if (d.fixes?.length) {
    const nq = d.fixes.filter(f => f.kind !== 'text'), tx = d.fixes.filter(f => f.kind === 'text');
    const parts = [];
    if (tx.length) parts.push(`תיקון נוסח: ${tx.map(f => `ב${esc(f.label)} הוחלף משפט מהדפוס המצונזר (שהופיע בסוגריים) בנוסח השלם, על פי ויקיטקסט (נוסח מוגה לפי כתבי יד) והנוסח השני שבספריא`).join('; ')}`);
    if (nq.length) parts.push(`${nq.length === 1 ? 'תוקנה טעות ניקוד אחת' : `תוקנו ${nq.length} טעויות ניקוד`} של המהדורה (העיצורים זהים לנוסח ויקיטקסט): ${nq.map(f => `<span title="${esc(f.label)}">${esc(f.from)} ← ${esc(f.to)}</span>`).join(' · ')}`);
    html += `<p class="doc-credit" id="doc-fixes">${parts.join('. ')}. <a href="#/sources">פירוט בדף המקורות</a></p>`;
  }
  html += `<p class="doc-credit" id="doc-report">מצאת טעות בנוסח, בניקוד, בהקראה או בביאור? <a id="b-report" href="${ISSUES}" target="_blank" rel="noopener">דיווח ב-GitHub</a> (נפתח טופס עם פרטי המקום; דבר אינו נשלח עד שתאשר שם)</p>`;
  if (sidd) { const nx = nextSid(); html += `<div class="endmark" id="endmark"><p>— סוף ״${esc(d.title)}״ —</p><button class="btn" id="b-nextunit">${nx ? `לחלק הבא: ${esc(nx.bookHe)} – ${esc(nx.he)}` : 'חזרה לתוכן הסידור'}</button></div>`; }
  else if (lib) { const nx = R.libInfo?.next; html += `<div class="endmark" id="endmark"><p>— סוף ${esc(R.libInfo?.node.label || 'הפרק')} —</p><button class="btn" id="b-nextunit">${nx ? `להמשך: ${esc(nx.label)}` : `חזרה ל${esc(R.libInfo?.crumbs.at(-1)?.he || 'ספרייה')}`}</button>${libNavHtml('end')}</div>`; }
  else html += `<div class="endmark" id="endmark"><p>— סוף השיעור —</p><button class="btn" id="b-nextunit">לשיעור הבא</button>${dayNavHtml('end')}</div>`;
  rc.innerHTML = html;
  // an opened/closed notes section changes the page count in the paged layout
  rc.querySelectorAll('details.study-notes').forEach(el => el.addEventListener('toggle', () => { const a = anchor(); layout(); restore(a); }));
  rc.className = 'r-content gloss-' + prefs.gloss;
  if (prefs.gloss !== 'off' && !sidd) { const G = await loadGlossary(); if (!rc.isConnected) return; /* the reader was closed or replaced meanwhile */ applyGlosses(rc, d.book); glossNote(rc, G, d.tanakh ? 'tanakh' : d.book === 'Rambam' ? 'rambam' : ''); }
  R.segs = [...rc.querySelectorAll('.seg')];
  const rep = $('#b-report'); if (rep) { const upd = () => { rep.href = reportUrl(); }; rep.addEventListener('pointerdown', upd); rep.addEventListener('focus', upd); rep.addEventListener('click', upd); }
  $('#b-nextunit').onclick = () => nextUnit(false);
  rc.querySelectorAll('.daynav a').forEach(a => a.addEventListener('click', () => { R.dayFocus = a.dataset.day; }));
  layout();
}
/** Round 8: "מראי מקומות" / short-explanation link – a separate, attributed section after the text (texts.js 'notes'
 *  blocks). Collapsed by default; not part of the lesson's segments, so read-aloud, bookmarks and progress skip it.
 *  Kehot's notes carry only <b>/<br> (sanitised at build time and again here). */
const safeNote = h => esc(String(h).replace(/<br\s*\/?>/gi, '\n')).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/\n/g, '<br>');
function notesHtml(b) {
  const attr = `<p class="sn-attr">${esc(b.attr.text)}${(b.attr.links || []).map(([t, u], i) => `${i ? '; ' : ''}<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}${esc(b.attr.tail || '')}</p>`;
  if (b.link) return `<aside class="study-notes sn-link" data-kind="${esc(b.kind)}" aria-label="${esc(b.title)}"><p><a href="${esc(b.link[1])}" target="_blank" rel="noopener">${esc(b.link[0])}</a></p>${attr}</aside>`;
  const n = b.groups.reduce((a, g) => a + g.items.length, 0);
  return `<details class="study-notes" data-kind="${esc(b.kind)}"><summary>${esc(b.title)} <span class="sn-n">(${n})</span></summary>${attr}${b.groups.map(g => `<section class="sn-g" data-target="${esc(g.target)}"><h3 class="sn-h">בקטע ״${esc(g.label)}…״</h3><ul>${g.items.map(i => `<li>${i.html != null ? safeNote(i.html) : `${i.w ? `<span class="sn-w">${divineName(esc(i.w), prefs.divine)}</span> – ` : ''}${esc(i.t)}`}</li>`).join('')}</ul></section>`).join('')}</details>`;
}
/** Round 5: the reader states the gloss coverage too (same number as the About page: glossary meta, published). */
function glossNote(rc, G, kind) {
  const total = G?.meta?.manualReview?.published, rb = G?.rambam?.meta?.published || 0, here = rc.querySelectorAll('.gl').length, end = $('#doc-report', rc);
  if (!total || !end) return;
  const n = x => x.toLocaleString('he-IL');
  const p = document.createElement('span'); p.id = 'doc-gloss'; // inside the report line: one paragraph, so it doesn't add a page
  p.innerHTML = `ביאורי מילים בשיעור זה: ${here ? n(here) : 'אין'}. בסך הכול ${n(total)} בתורה ובתהילים ו־${n(rb)} ברמב״ם – מעט בכוונה: כל ביאור עבר שתי בדיקות ובדיקה ידנית${kind === 'tanakh' ? '; ברש״י אין' : kind ? '' : '; בתניא אין'} (<a href="#/about">פירוט</a>). `;
  end.prepend(p);
}
// the siddur reader shows a whole book (seder); "next" is the first section of the next book
function nextSid() { if (!R.sid || !R.sorder) return null; const bk = R.sid.split('/')[0], i = R.sorder.findLastIndex(x => x.book === bk); return i >= 0 ? R.sorder[i + 1] || null : null; }
function nextUnitId() { if (R.lib) return R.libInfo?.next ? 'lib' : null; if (R.sid) return nextSid() ? 'siddur' : null; const us = unitsFor(); const i = us.indexOf(R.unit); return i >= 0 && i < us.length - 1 ? us[i + 1] : null; }
function nextUnit(autoplay) {
  setProgress(...pk(), { done: true, frac: 1 });
  // the end of a seder is the end of its last section
  if (R.sid && R.doc?.siddur) setProgress('siddur', `${R.sid.split('/')[0]}/${R.doc.siddur.secs.length}`, { done: true, frac: 1 });
  if (R.sid) { const nx = nextSid(); R.autoplay = !!nx && autoplay; location.hash = nx ? `#/s/${nx.book}/${nx.n}` : '#/siddur'; return; }
  if (R.lib) { const nx = R.libInfo?.next; R.autoplay = !!nx && autoplay; location.hash = nx ? `#/lib/${nx.id}` : `#/lib/${R.libInfo?.crumbs.at(-1)?.id || ''}`; return; }
  const n = nextUnitId();
  if (!n) { toastAfterNav = 'סיימת את כל שיעורי היום. יישר כח!'; location.hash = '#/d/' + R.iso; return; }
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
// round 4: no Rashi stub at a page edge. A Rashi block that the column flow split is moved whole to the next page
// when it is short (≤45% of a page) and moving it leaves at most a tenth of the page empty (round 5: was a quarter,
// which left most of page 1 blank at 320×568); a longer one that would start with fewer than 2.5 lines (round 5: the
// limit is now exactly the 2.5 lines the tests require, was 2.6, so a block that fits 2.5+ lines at the foot splits)
// starts on the next page instead. Inside a long block, a
// comment split into a lone line before or after the break is kept whole. A few passes, since each move shifts
// what follows.
function keepRashi(rc, colH) {
  const blocks = [...rc.querySelectorAll('.rashi')];
  for (const r of blocks) { r.classList.remove('keep', 'brk'); for (const q of r.children) q.classList.remove('pk'); }
  for (let pass = 0; pass < 4; pass++) {
    let moved = 0;
    for (const r of blocks) {
      if (r.classList.contains('keep') || r.classList.contains('brk')) continue;
      const rs = [...r.getClientRects()];
      if (rs.length < 2) continue;
      const lh = parseFloat(getComputedStyle(r).lineHeight) || 24;
      if (rs.reduce((a, x) => a + x.height, 0) <= colH * 0.45 && rs[0].height <= colH * 0.1) { r.classList.add('keep'); moved++; continue; }
      if (rs[0].height < lh * 2.5) { r.classList.add('brk'); moved++; continue; }
      for (const q of r.children) {
        const qs = [...q.getClientRects()];
        if (qs.length > 1 && !q.classList.contains('pk') && (qs[0].height < lh * 1.6 || qs.at(-1).height < lh * 1.6)
          && qs.reduce((a, x) => a + x.height, 0) <= colH * 0.5) { q.classList.add('pk'); moved++; }
      }
    }
    if (!moved) break;
  }
}
function layout() {
  const vp = $('#vp'), rc = $('#rc'), pad = chromePad();
  vp.className = 'r-viewport ' + prefs.layout;
  if (rc?.classList.contains('r-error')) { rc.style.cssText = ''; return; }
  if (prefs.layout === 'pages') {
    const W = vp.clientWidth, g = pageGeometry({ W, H: vp.clientHeight, size: prefs.size, spreadPref: prefs.spread });
    rc.style.width = g.P + 'px'; rc.style.columnWidth = g.P + 'px'; rc.style.columnGap = g.gap + 'px';
    rc.style.right = g.gap / 2 + 'px'; rc.style.left = 'auto';
    rc.style.paddingTop = pad.top + 'px'; rc.style.paddingBottom = pad.bottom + 'px';
    rc.classList.toggle('ragged', g.ragged); vp.classList.toggle('spread', g.spread);
    vp.style.setProperty('--pad-top', pad.top + 'px'); vp.style.setProperty('--pad-bottom', pad.bottom + 'px');
    keepRashi(rc, vp.clientHeight - pad.top - pad.bottom);
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
    const [p0, p1] = segSpan(el);
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
  if (prefs.layout === 'pages') {
    // the first segment that starts on this page; if the whole page is the middle of one long segment, that segment
    const i = R.segs.findIndex(s => pageOf(s) >= R.page); if (i < 0) return R.segs[R.segs.length - 1];
    return pageOf(R.segs[i]) > R.page && i > 0 && segSpan(R.segs[i - 1])[1] >= R.page ? R.segs[i - 1] : R.segs[i];
  }
  const top = $('#vp').getBoundingClientRect().top + 60;
  return R.segs.find(s => s.getBoundingClientRect().bottom > top) || R.segs[R.segs.length - 1];
}
// Pages a segment occupies: a long verse can run over several pages, so a position is "segment + page within it".
function segSpan(el) {
  const rc = $('#rc').getBoundingClientRect(), e = el.getBoundingClientRect(), p0 = pageOf(el);
  return [p0, Math.max(p0, Math.floor((rc.right - e.left - 2) / R.W))];
}
function anchor() {
  const s = currentSeg(); if (!s) return null;
  // siddur: the page starts with the end of the previous section but the current one begins on it – keep the
  // place by the new section's first paragraph (its name sits right above it), not by the previous section's tail
  if (R.sid && R.sidReady) {
    const n = +R.sid.split('/')[1], h = $(`#sec-${n}`);
    if (h && markerShown(h)) { const f = sectionOf(s) === n ? s : R.segs.find(x => sectionOf(x) === n) || s; return { pos: f.dataset.id, sub: 0, sec: n }; }
  }
  return { pos: s.dataset.id, sub: prefs.layout === 'pages' ? Math.max(0, R.page - segSpan(s)[0]) : 0 };
}
function restore(a) { if (a?.sec && R.sid && $(`#sec-${a.sec}`)) goToSec(a.sec); else if (a?.pos) goToSeg(a.pos, false, a.sub || 0); }
// Round 5: a visible "report an error" path. It only builds a link to a new GitHub issue with the context filled in;
// nothing is sent – the reader sees the form on GitHub and decides whether to submit it.
const ISSUES = 'https://github.com/dudidd-wq/chitas-reader/issues/new';
function reportUrl(seg = currentSeg()) {
  const sel = String(getSelection?.() || '').trim().slice(0, 120);
  const t = seg ? (seg.querySelector('.t')?.textContent || seg.textContent).replace(/\s+/g, ' ').trim() : '';
  const where = [R.doc?.title, R.doc?.subtitle].filter(Boolean).join(' – ');
  const title = `טעות בטקסט: ${where}${seg ? ` (${seg.dataset.ref || seg.dataset.id})` : ''}`.slice(0, 150);
  const body = [`**שיעור:** ${where}`, `**תאריך:** ${R.lib ? 'ספרייה (עיון חופשי)' : R.sid ? 'סידור' : R.iso ? `${fmtDmy(R.iso)} (${dayPlan(R.iso, { il: prefs.il }).hebDate})` : ''}`, `**קישור:** ${location.href}`, seg ? `**מקום:** ${seg.dataset.ref || seg.dataset.id}` : '',
    sel ? `**המילים שסומנו:** ${sel}` : '', seg ? `**הנוסח המוצג:**\n> ${t.slice(0, 600)}${t.length > 600 ? '…' : ''}` : '',
    '', '**מה הטעות?** (ניקוד / מילה חסרה או מיותרת / הקראה / ביאור)', '', '**מה הנוסח הנכון, ולפי איזה מקור?**', ''].filter(x => x !== false).join('\n');
  return `${ISSUES}?title=${encodeURIComponent(title)}&labels=${encodeURIComponent('text-error')}&body=${encodeURIComponent(body)}`;
}
function goToSeg(id, smooth = true, sub = 0) {
  const el = R.segs.find(s => s.dataset.id === id); if (!el) return;
  if (prefs.layout === 'pages') { const [p0, p1] = segSpan(el), p = Math.min(p1, p0 + sub); if (p !== R.page) setPage(p); }
  else el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
}
function updateProgress(save = true) {
  let frac;
  if (prefs.layout === 'pages') {
    frac = R.pages <= 1 ? 1 : R.page / (R.pages - 1);
    const a = R.spread ? 2 * R.page + 1 : R.page + 1, b = R.spread ? Math.min(2 * R.page + 2, R.cols) : a;
    $('#pinfo').textContent = $('#pinfo2').textContent = a === b ? `עמוד ${a} מתוך ${R.cols}` : `עמודים ${a}–${b} מתוך ${R.cols}`;
    // round 6: in full-screen mode the bars are hidden, so the page number shows briefly on each page turn
    if (R.flashed !== R.page && $('#reader').classList.contains('immersive')) {
      const f = $('#pflash'); f.textContent = $('#pinfo').textContent; f.classList.add('show');
      clearTimeout(R.flashT); R.flashT = setTimeout(() => f.classList.remove('show'), 1400);
    }
    R.flashed = R.page;
  } else {
    const vp = $('#vp'); const max = vp.scrollHeight - vp.clientHeight;
    frac = max <= 0 ? 1 : vp.scrollTop / max;
    $('#pinfo').textContent = $('#pinfo2').textContent = `${Math.round(frac * 100)}%`;
  }
  $('#pbar').style.width = $('#tbar').style.width = (frac * 100).toFixed(1) + '%';
  if (!save || !R.doc) return;
  // 1.0.57: a page turn is a discrete step – the siddur's address, subtitle and section follow it at once (they used
  // to lag 400 ms behind, so a quick second turn or a refresh right after a turn acted on the previous section)
  if (prefs.layout === 'pages') siddurTrack();
  clearTimeout(R.saveT);
  R.saveFn = () => {
    R.saveT = null; R.saveFn = null;
    if (!R.doc || $('#reader').hidden) return;
    siddurTrack();
    setProgress(...pk(), { sec: null, ...anchor(), frac, done: frac >= 0.995 });
  };
  R.saveT = setTimeout(R.saveFn, 400);
}
// 1.0.57: a refresh, closing the app or switching away inside the 400 ms save delay still keeps the place just reached
function flushProgress() { if (R.saveFn) { clearTimeout(R.saveT); R.saveFn(); } }
window.addEventListener('pagehide', flushProgress);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushProgress(); });
// round 4: up to 440 px tall, so large phones on their side (390–430 px tall) also get the whole height
const SHORT_LANDSCAPE = matchMedia('(orientation: landscape) and (max-height: 440px)');
const AUTO_HIDE_MS = 2500;
function bindReaderUi() {
  const el = $('#reader'), vp = $('#vp');
  // a note's "פירוט" changes its height – re-paginate and stay on it
  $('#rc').addEventListener('toggle', e => { if (e.target.matches?.('.note-more') && prefs.layout === 'pages') { const a = anchor(); layout(); restore(a); } }, true);
  const toggleChrome = force => {
    const before = el.classList.contains('immersive'), after = el.classList.toggle('immersive', force);
    if (!after) armAutoHide();
    if (before === after || !R.doc) return;
    const a = anchor(); layout(); restore(a);
  };
  R.toggleChrome = toggleChrome;
  // Short landscape screens (phone on its side, ≤440 px tall): the bars hide themselves after a few seconds
  // without interaction so the text gets the whole height; a tap in the middle (or Esc) brings them back.
  const armAutoHide = () => {
    clearTimeout(R.hideT);
    if (!SHORT_LANDSCAPE.matches) return;
    R.hideT = setTimeout(() => {
      if (el.hidden || !el.isConnected || !$('#sheet') || !$('#sheet').hidden) return;
      if (el.querySelector('.r-top, .r-bottom')?.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return; // keyboard user in the bar
      toggleChrome(true);
    }, AUTO_HIDE_MS);
  };
  R.armAutoHide = armAutoHide;
  $('#rt').addEventListener('pointerdown', armAutoHide); $('#rb').addEventListener('pointerdown', armAutoHide);
  $('#rt').addEventListener('focusout', armAutoHide);
  armAutoHide();
  // Re-paginate whenever a bar changes height (player bar shown/hidden, wrapping, rotation) and keep the position.
  let lastH = '';
  R.ro?.disconnect();
  R.ro = new ResizeObserver(() => {
    if (!$('#rt') || !$('#rb') || !$('#rc')) { R.ro?.disconnect(); return; } // reader was left
    const h = $('#rt').offsetHeight + ':' + $('#rb').offsetHeight;
    if (h === lastH) return; const first = !lastH; lastH = h;
    if (first || !R.doc) return;
    cancelAnimationFrame(R.roF);
    R.roF = requestAnimationFrame(() => { if (!$('#rc')) return; const sp = R.segs.find(x => x.classList.contains('speaking')); if (!sp) { relayoutKeep(); return; } layout(); goToSeg(sp.dataset.id, false); });
  });
  R.ro.observe($('#rt')); R.ro.observe($('#rb'));
  $('#b-prev').onclick = $('#b-prev2').onclick = () => turn(-1);
  $('#b-next').onclick = $('#b-next2').onclick = () => turn(1);
  $('#b-full').onclick = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
    toggleChrome(true);
  };
  syncFullBtn();
  $('#b-aa').onclick = () => openSheet('display');
  // round 4: one tap starts (or pauses) the reading; a long press – or the ⚙ in the player – opens the settings
  { const bt = $('#b-tts'); let timer = 0, long = false;
    bt.addEventListener('pointerdown', () => { long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; openSheet('tts'); }, 550); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bt.addEventListener(ev, () => clearTimeout(timer));
    bt.addEventListener('contextmenu', e => { e.preventDefault(); if (!long) { clearTimeout(timer); long = true; openSheet('tts'); } });
    bt.onclick = () => { if (long) { long = false; return; } ttsToggle(); }; }
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
  $('#t-set').onclick = () => openSheet('tts');
  $('#t-back').onclick = () => R.speaker?.skip(-1);
  $('#t-fwd').onclick = () => R.speaker?.skip(1);
  $('#t-rate').onchange = e => { setPref('ttsRate', snapRate(Number(e.target.value))); R.speaker?.setRate(prefs.ttsRate); };
}
function turn(d) {
  R.armAutoHide?.();
  if (prefs.layout === 'pages') {
    if (d > 0 && R.page >= R.pages - 1) { setProgress(...pk(), { done: true, frac: 1 }); toast(R.lib ? 'סוף הפרק' : 'סוף השיעור'); return; }
    setPage(R.page + d);
  } else { const vp = $('#vp'); vp.scrollBy({ top: d * (vp.clientHeight - 80), behavior: 'smooth' }); }
}
// The ⤢ button reflects the real full-screen state (also when the browser leaves full screen by itself, e.g. Esc).
function syncFullBtn() { const b = $('#b-full'); if (b) b.setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false'); }
let fsExitT = 0;
document.addEventListener('fullscreenchange', () => {
  syncFullBtn();
  if (!document.fullscreenElement) { fsExitT = Date.now(); if (!$('#reader').hidden) R.toggleChrome?.(false); }
});
// Escape never leaves the text: it closes the innermost layer only (word pop-up → sheet → full screen / hidden bars).
// Going back to the day is the explicit ‹ button (or the browser's Back).
function readerEscape() {
  if (document.querySelector('.gloss-pop')) return 'popup';          // gloss.js closes it
  if (!$('#sheet').hidden) { closeSheet(); return 'sheet'; }
  if (Date.now() - fsExitT < 400) return 'fullscreen';                // this Esc already left full screen
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return 'fullscreen'; }
  if ($('#reader').classList.contains('immersive')) { R.toggleChrome?.(false); return 'chrome'; }
  return 'none';
}
document.addEventListener('keydown', e => {
  if ($('#reader').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (k !== 'Escape' && e.target.closest('input, select, textarea')) return;
  if (k === 'Escape') { R.lastEsc = readerEscape(); return; }
  if (!$('#sheet').hidden) return;
  // Shift+←/→: the same lesson on the next / previous day (RTL: left is forward, as for the pages)
  if (e.shiftKey && (k === 'ArrowLeft' || k === 'ArrowRight') && !R.sid && R.unit) { e.preventDefault(); goDay(k === 'ArrowLeft' ? 'next' : 'prev'); }
  else if (k === 'ArrowLeft' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); turn(1); }
  else if (k === 'ArrowRight' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); turn(-1); }
  else if (k === 'Home') { e.preventDefault(); prefs.layout === 'pages' ? setPage(0) : $('#vp').scrollTo({ top: 0 }); }
  else if (k === 'End') { e.preventDefault(); prefs.layout === 'pages' ? setPage(R.pages - 1) : $('#vp').scrollTo({ top: 1e9 }); }
  else if (k === 'p' || k === 'P' || k === 'פ') ttsToggle();
  else if (k === 'f' || k === 'F' || k === 'כ') $('#b-full').click();
}, true); // capture: runs before gloss.js closes its pop-up, so one Esc closes one layer
// web fonts use font-display: swap – if one arrives after the first layout, page breaks were measured with the
// fallback font, so measure again (keeping the reading position).
// 1.0.55: in scroll mode a re-layout keeps the paragraph at the top of the screen where it was (it used to be centred,
// which moved the text the reader – or a section deep link – had just placed)
function relayoutKeep() {
  if (prefs.layout === 'pages') { const a = anchor(); layout(); restore(a); return; }
  const s = currentSeg(), y = s?.getBoundingClientRect().top; layout();
  if (s && s.isConnected) $('#vp').scrollTop += s.getBoundingClientRect().top - y;
}
document.fonts?.addEventListener?.('loadingdone', () => { if (!$('#reader').hidden && R.doc) relayoutKeep(); });
let resizeT; window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!$('#reader').hidden && R.doc) { const a = anchor(); layout(); restore(a); } }, 150); });

function openSheet(kind, note = '') {
  const sh = $('#sheet'); clearToast();
  if (sh.hidden) R.sheetOpener = document.activeElement;
  sh.innerHTML = `<h2><span id="sh-title">${kind === 'tts' ? 'הקראה' : 'תצוגה'}</span><button class="btn ghost" id="sh-x" aria-label="סגירה">${ICON.close}</button></h2>
    ${note ? `<p class="sheet-note" id="sh-note" role="alert">${esc(note)}</p>` : ''}<form class="form" onsubmit="return false">${kind === 'tts' ? `<button class="btn primary" id="sh-play" type="button">${R.speaker?.state === 'playing' ? 'השהה הקראה' : 'התחל הקראה מהעמוד הנוכחי'}</button>` + ttsForm() + (R.credit ? `<p class="note" id="sh-credit">הטקסט המוקרא – ${R.credit}</p>` : '') : displayForm()}</form>`;
  sh.hidden = false;
  for (const id of ['#rt', '#vp', '#rb']) $(id).inert = true;
  $('#sh-x').onclick = closeSheet;
  $('#sh-x').focus();
  const sp = $('#sh-play'); if (sp) sp.onclick = () => { closeSheet(); ttsToggle(); };
  bindForm(sh.querySelector('form'), async name => {
    if ((name === 'hideSiddurInstructions' || name === 'siddurLang' || name === 'tachanunMode' || name === 'shabbatMode') && R.sid) { R.speaker?.stop(true); R.speaker = null; const a = anchor(), [bk] = R.sid.split('/'); try { R.doc = await buildSiddurBookDoc(bk, sidOpts()); } catch { /* offline: keep the text shown */ } await renderDoc(); restore(a); siddurTrack(); }
    else if (['taamim', 'rashi', 'gloss', 'font', 'divine', 'studyNotes'].includes(name)) { const a = anchor(); await renderDoc(); restore(a); }
    else if (['size', 'lineHeight', 'layout', 'spread', 'readingBold'].includes(name)) { const a = anchor(); layout(); restore(a); }
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
  const byId = R.doc.tanakh ? new Map(R.doc.blocks.map(b => [String(b.id), b])) : null;
  const say = new Map(R.doc.blocks.filter(b => b.say).map(b => [String(b.id), b.say])); // 1.0.76: vocalized reading text (Hayom Yom)
  return R.segs.map(s => {
    const parts = [say.has(s.dataset.id) ? say.get(s.dataset.id) : unAbbr(ttsHtml(s.querySelector('.t'))).replace(/<span class="(vn|hn|ketiv|sr)[^>]*>.*?<\/span>/g, '')];
    // Speech-only Rashi keeps the display edition intact and supplies its own primary-stress metadata.
    const block = byId?.get(s.dataset.id), accParts = [block?.text || say.get(s.dataset.id) || null], primaryParts = [say.has(s.dataset.id)];
    if (prefs.ttsRashi) s.querySelectorAll('.rashi p').forEach((p, i) => {
      const raw = block?.subSay?.[i];
      parts.push(raw || vowelHeadword(p.innerHTML, parts[0]));
      accParts.push(raw || null); primaryParts.push(!!raw);
    });
    // source citations in parentheses are skipped in Rashi and the Rambam (setting) – not in the verse, Tehillim or Tanya
    const cites = parts.map((_, i) => i > 0 || R.unit.startsWith('rambam'));
    // Raw stress metadata: Tanakh accents or Hayom Yom Dicta/curated primary-stress marks.
    // prepareForTTS strips these before Web Speech; Piper must receive the original in parallel.
    const acc = byId?.get(s.dataset.id)?.text || say.get(s.dataset.id) || null;
    return { el: s, parts, chol: CHOL[s.dataset.ref], cites, acc, accParts, primaryParts };
  });
}
const TTS_ERR = {
  'no-voice': 'ההקראה לא הופעלה: לא נמצא במכשיר קול עברי. הוראות ההתקנה – כאן למטה.',
  silent: 'מנוע הדיבור לא השמיע את הטקסט (ייתכן שאין קול עברי). ההקראה נעצרה, והשיעור לא סומן כנלמד.',
};
// The player is one compact row that replaces the pager (the pager buttons give way on narrow screens; the read-aloud
// follows the pages by itself). The text area is re-laid out for the bar's real height (ResizeObserver in bindReaderUi).
function showTtsBar(on) { $('#ttsctl').hidden = !on; $('#rb').classList.toggle('tts-on', on); }
// Which engine reads: the local voice when chosen, supported and installed – otherwise Web Speech (fallback).
async function ttsEngine() {
  if (prefs.ttsEngine !== 'piper' || R.piperBroken || !piperSupported()) return 'web';
  if ((await voiceStatus())[prefs.ttsModel]) return 'piper';
  toast('הקול האיכותי אינו מותקן במכשיר – ההקראה בקול הדפדפן. להורדה: הגדרות הקראה ← קול איכותי.');
  return 'web';
}
async function ttsToggle() {
  if (R.speaker) { R.speaker.toggle(); return; }
  const unit = R.unit, iso = R.iso, doc = R.doc;
  if (!doc) return; // still loading (e.g. right after a day change): nothing to read yet
  const engine = prefs.ttsEngine === 'piper' && !R.piperBroken && piperSupported() ? 'piper?' : 'web';
  if (engine === 'web' && !ttsSupported()) { toast('הדפדפן אינו תומך בהקראה'); return; }
  // the AudioContext must start inside the click: make it now, before anything is awaited
  if (engine === 'piper?') try { PiperSpeaker.prototype.ctx.call({}); } catch { /* checked again on play */ }
  const eng = engine === 'web' ? 'web' : await ttsEngine();
  if (eng === 'web' && !ttsSupported()) { toast('הדפדפן אינו תומך בהקראה'); return; }
  if (eng === 'web') await waitForVoices();
  if (R.unit !== unit || R.iso !== iso || R.doc !== doc || R.speaker) return;
  R.speaker = new (eng === 'piper' ? PiperSpeaker : Speaker)({
    onSegment: (i, frac = 0) => {
      const el = R.segs[i]; if (!el) return;
      if (!el.classList.contains('speaking')) { R.segs.forEach(s => s.classList.remove('speaking')); el.classList.add('speaking'); }
      followSpeech(el, frac);
    },
    onState: st => {
      showTtsBar(st !== 'stopped' || R.ttsShown);
      const was = $('#rb').classList.contains('speaking');
      $('#rb').classList.toggle('speaking', st !== 'stopped');
      if (was !== (st !== 'stopped') && $('#reader').classList.contains('immersive')) { const a = anchor(); layout(); restore(a); }
      $('#t-play').innerHTML = st === 'playing' ? ICON.pause : ICON.play;
      $('#t-play').setAttribute('aria-label', st === 'playing' ? 'השהה' : 'הפעל');
      if (st === 'stopped') R.segs.forEach(s => s.classList.remove('speaking'));
    },
    // Only a run that really reached the end with every chunk spoken marks the lesson as read / moves on.
    onEnd: ({ complete }) => {
      if (!complete) { toast(TTS_ERR.silent); return; }
      if (prefs.ttsContinuous && nextUnitId()) nextUnit(true); else setProgress(...pk(), { done: true, frac: 1 });
    },
    onError: code => {
      R.speaker = null; R.ttsShown = false; showTtsBar(false);
      // the local voice failed (not installed, out of memory, unsupported WASM…): fall back to the browser's voice
      if (String(code).startsWith('piper')) {
        R.piperBroken = true;
        toast(`הקול האיכותי לא נטען (${code.slice(6)}) – ממשיכים בקול הדפדפן.`);
        if (ttsSupported()) ttsToggle();
        return;
      }
      // round 6: the no-voice message is written inside the sheet, above the install steps – a toast covered them
      if (code === 'no-voice') { openSheet('tts', TTS_ERR[code]); return; }
      toast(TTS_ERR[code] || `ההקראה נעצרה בגלל שגיאה במנוע הדיבור (${code}). השיעור לא סומן כנלמד.`);
    },
  });
  R.speaker.load(ttsSegments(), { rate: prefs.ttsRate, voice: prefs.ttsVoice, stress: prefs.ttsStress, divineName: prefs.ttsDivine, skipCites: prefs.ttsSkipCites, lockscreen: prefs.ttsLockscreen, variant: prefs.ttsModel, voiceGender: prefs.ttsGender },
    { title: R.doc.title + ' – ' + R.doc.subtitle, album: R.lib ? 'ספרייה' : dayPlan(R.iso, { il: prefs.il }).hebDate });
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
  R.ttsShown = false; clearTimeout(R.hideT);
  if (R.doc && R.unit) { const a = anchor(); if (a) setProgress(...pk(), { sec: null, ...a }); }
  el.hidden = true; el.innerHTML = ''; document.body.style.overflow = '';
  $('#app').hidden = false;
  R.unit = null; R.sid = null; R.lib = null; R.libInfo = null; R.doc = null; document.title = 'חת״ת ורמב״ם – קריאה יומית';
  if (R.wake) { R.wake.release().catch(() => {}); R.wake = null; }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

if (!prefs.locationChosen) prefs.il = guessIsrael();  // stated default until the reader chooses (not saved as a choice)
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
